/* Pure CPU geometry shared by workers and the verified fallback. No scene/GPU state. */
(function(root){
  const T=root.THREE||(typeof require==='function'?require('three'):null);
  function pack(g){
    const data={attributes:{},index:g.index?g.index.array:null,groups:g.groups};
    for(const [key,a] of Object.entries(g.attributes)) data.attributes[key]={array:a.array,itemSize:a.itemSize};
    g.dispose();return data;
  }
  function extrusion(polygons,depth,scale){
    return polygons.map(poly=>{
      const ring=r=>r.map(([x,y])=>new T.Vector2(x*scale,-y*scale));
      const shape=new T.Shape(ring(poly[0]));shape.holes=poly.slice(1).map(r=>new T.Path(ring(r)));
      const g=new T.ExtrudeGeometry(shape,{depth:depth*scale,bevelEnabled:false,steps:1});g.rotateX(-Math.PI/2);return pack(g);
    });
  }
  function shell(data,depth){
    const a=data.attributes.position.array,idx=data.index||Array.from({length:a.length/3},(_,i)=>i),edges=new Map(),out=[];
    const v=i=>new T.Vector3(a[i*3],a[i*3+1],a[i*3+2]);
    const key=p=>p.toArray().map(x=>Math.round(x*1e5)).join(',');
    const tri=(a,b,c)=>out.push(...a.toArray(),...b.toArray(),...c.toArray());
    for(let i=0;i<idx.length;i+=3){
      const vs=[v(idx[i]),v(idx[i+1]),v(idx[i+2])],low=vs.map(p=>p.clone().add(new T.Vector3(0,-depth,0)));
      tri(...vs);tri(low[2],low[1],low[0]);
      for(let j=0;j<3;j++){const a=vs[j],b=vs[(j+1)%3],k=[key(a),key(b)].sort().join('|');if(edges.has(k))edges.delete(k);else edges.set(k,[a,b]);}
    }
    for(const [a,b]of edges.values()){const c=b.clone().add(new T.Vector3(0,-depth,0)),d=a.clone().add(new T.Vector3(0,-depth,0));tri(a,c,b);tri(a,d,c);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();return pack(g);
  }
  // Intersect individual solid meshes. Closed loops retain nested holes; open/non-manifold loops are reported, never guessed closed.
  function caps({positions,index,plane}){
    const n=new T.Vector3(...plane.slice(0,3)),c=plane[3],u=new T.Vector3(Math.abs(n.y)>.9?1:0,Math.abs(n.y)>.9?0:1,0).cross(n).normalize(),v=n.clone().cross(u),origin=n.clone().multiplyScalar(-c);
    const at=i=>new T.Vector3(positions[i*3],positions[i*3+1],positions[i*3+2]),ix=index||Array.from({length:positions.length/3},(_,i)=>i),edges=new Map(),points=new Map();
    const key=p=>[p.dot(u),p.dot(v)].map(x=>Math.round(x*1e4)).join(',');
    const add=(a,b)=>{const ka=key(a),kb=key(b);if(ka===kb)return;points.set(ka,new T.Vector2(a.dot(u),a.dot(v)));points.set(kb,new T.Vector2(b.dot(u),b.dot(v)));const k=[ka,kb].sort().join('|');edges.set(k,[ka,kb]);};
    for(let i=0;i<ix.length;i+=3){const vs=[at(ix[i]),at(ix[i+1]),at(ix[i+2])],hits=[];
      for(let j=0;j<3;j++){const a=vs[j],b=vs[(j+1)%3],da=n.dot(a)+c,db=n.dot(b)+c;if(Math.abs(da)<1e-6)hits.push(a);if(da*db< -1e-12)hits.push(a.clone().lerp(b,da/(da-db)));}
      const unique=[...new Map(hits.map(p=>[key(p),p])).values()];if(unique.length===2)add(...unique);
    }
    const graph=new Map();for(const [a,b]of edges.values()){if(!graph.has(a))graph.set(a,[]);if(!graph.has(b))graph.set(b,[]);graph.get(a).push(b);graph.get(b).push(a);}
    const used=new Set(),loops=[];let open=0;
    for(const start of graph.keys()){if(used.has(start))continue;const loop=[];let prev=null,cur=start;
      for(let i=0;i<=graph.size;i++){if(used.has(cur))break;used.add(cur);loop.push(points.get(cur));const list=graph.get(cur);if(list.length!==2){open++;break;}const next=list.find(k=>k!==prev);prev=cur;cur=next;if(cur===start){if(loop.length>=3)loops.push(loop);break;}}
    }
    const inside=(p,ring)=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++)if((ring[i].y>p.y)!==(ring[j].y>p.y)&&p.x<(ring[j].x-ring[i].x)*(p.y-ring[i].y)/(ring[j].y-ring[i].y)+ring[i].x)yes=!yes;return yes;};
    const area=r=>Math.abs(T.ShapeUtils.area(r));loops.sort((a,b)=>area(b)-area(a));
    const parent=loops.map((r,i)=>{for(let j=i-1;j>=0;j--)if(inside(r[0],loops[j]))return j;return -1;});
    const depth=i=>parent[i]<0?0:depth(parent[i])+1,out=[];
    for(let i=0;i<loops.length;i++){if(depth(i)%2)continue;const outer=loops[i].slice(),holes=loops.filter((_,j)=>parent[j]===i&&depth(j)%2).map(r=>r.slice());
      if(T.ShapeUtils.isClockWise(outer))outer.reverse();for(const h of holes)if(!T.ShapeUtils.isClockWise(h))h.reverse();
      const flat=[outer,...holes].flat(),faces=T.ShapeUtils.triangulateShape(outer,holes);
      for(const f of faces)for(const k of f){const q=flat[k],p=origin.clone().addScaledVector(u,q.x).addScaledVector(v,q.y).addScaledVector(n,.015);out.push(...p.toArray());}
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();return {geometry:pack(g),open};
  }
  function describe(p,assets=[]){
    const { presentation, roof, roomProperties, workbench, site, ...design } = p.design;
    const w=WorkbenchModel.data(p);
    const { walls, ...planning } = p.planning;
    const {height,external,internal,...otherWallSettings}=p.wallSettings;
    const global = JSON.stringify({plot:p.plot,unit:p.unit,scale:p.scale,
      wallSettings:otherWallSettings,planning,design,facade:w.facade,site:w.site,assets});
    const datums=object=>object.floor!==undefined?[WorkbenchModel.floorBase(p,object.floor),WorkbenchModel.floorHeight(p,object.floor)]
      :[object.from,object.to,Array.from({length:p.floorCount},(_,f)=>[WorkbenchModel.floorBase(p,f),WorkbenchModel.floorHeight(p,f)])];
    const rows = ProjectModel.walls(p), records = new Map();
    records.set('parapet',JSON.stringify([p.view.parapet,p.view.parapetConfig]));
    for (const e of p.elements) {
      const {material,customColor,...geometry}=e;
      records.set('room:'+e.id,JSON.stringify([geometry,roomProperties?.[e.id],WorkbenchModel.roomBase(p,e),WorkbenchModel.floorHeight(p,e.floor),
        w.stairs[e.id],w.voids.filter(v=>e.floor>v.from&&e.floor<=v.to),w.shafts.filter(v=>e.floor>=v.from&&e.floor<=v.to)]));
    }
    for (const w of rows) records.set('wall:'+w.id,JSON.stringify(w));
    for (const f of p.fixtures) {
      const owner=p.elements[f.roomId];
      records.set('opening:'+f.id,JSON.stringify([f,owner,WorkbenchModel.roomBase(p,owner)]));
    }
    for(const kind of ['structure','ramps','shafts','outdoors','services3d']) for(const object of w[kind])
      records.set('professional:'+object.id,JSON.stringify([kind,object,datums(object)]));
    for(const layout of w.interiors) for(const item of layout.items) {
      const owner=p.elements.find(e=>e.id===layout.room);
      records.set('professional:'+item.id,JSON.stringify([item,owner?.floor,owner&&WorkbenchModel.roomBase(p,owner),owner&&WorkbenchModel.floorHeight(p,owner.floor)]));
    }
    records.set('professional:terrain',JSON.stringify(w.terrain));
    records.set('professional:solar',JSON.stringify([w.solar,p.floorCount,w.levels,p.wallSettings.height,w.solar.enabled?[roof,p.elements.filter(e=>!e.isFurniture)]:null]));
    records.set('professional:rain',JSON.stringify([w.rain,roof,p.floorCount,w.levels,p.wallSettings.height]));
    records.set('design:overlays',JSON.stringify([roof,p.design.ceilings,p.design.neighbours,w.levels,p.wallSettings.height]));
    const floors=new Map();
    for(let f=0;f<p.floorCount;f++) floors.set(f,JSON.stringify([
      p.elements.filter(e=>e.floor===f&&!e.isFurniture).map(({material,customColor,...e})=>e),
      WorkbenchModel.slabGeometry(p,f),WorkbenchModel.floorBase(p,f),WorkbenchModel.floorHeight(p,f)]));
    const top=Math.max(-1,...p.elements.filter(e=>!e.isFurniture&&e.type!=='staircase').map(e=>e.floor));
    return {project:p,global,records,rows,floors,roof:JSON.stringify([roof,top,floors.get(top)])};
  }
  function run(task){
    if(task.kind==='glb')return (root.GLBModel || require('./glb-model.js')).decode(task.data);
    if(task.kind==='roof') {
      const R=root.RoofModel || (typeof require==='function'?require('./roof-model.js'):null),surface=R.describe(task.project,task.prepared);
      if(!surface)return null;
      return {floor:surface.floor,base:surface.base,patches:surface.patches.map(poly=>pack(R.geometry(surface,poly,task.scale)))};
    }
    if(task.kind==='describe')return describe(task.project,task.assets);
    if(task.kind==='rounded')return task.boxes.map(({w,h,d,r})=>{
      const shape=new T.Shape(),x=-w/2+r,y=-h/2+r,width=w-2*r,height=h-2*r;
      shape.moveTo(x,y);shape.lineTo(x+width,y);shape.lineTo(x+width,y+height);shape.lineTo(x,y+height);shape.closePath();
      const g=new T.ExtrudeGeometry(shape,{depth:Math.max(.01,d-2*r),steps:1,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,curveSegments:2});g.translate(0,0,-d/2+r);return pack(g);
    });
    if(task.kind==='extrude')return extrusion(task.polygons,task.depth,task.scale);
    if(task.kind==='shell')return shell(task.geometry,task.depth);
    if(task.kind==='caps')return caps(task);
    if(task.kind==='footprints'){
      const p=task.project,floors={};for(let f=0;f<p.floorCount;f++)floors[f]={union:root.DesignModel.floorUnion(p,f),slab:root.WorkbenchModel.slabGeometry(p,f)};
      return floors;
    }
    throw Error('Unknown geometry task');
  }
  root.FourDGeometry={run,pack,describe};if(typeof module==='object')module.exports=root.FourDGeometry;
})(globalThis);
