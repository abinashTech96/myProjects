/* Shared architectural geometry; each caller owns the returned resources.
 * 4D compiles its own copies and never borrows mutable editor materials. */
(function(root){
 'use strict';
 function build(p,raw,{scale=1,origin={x:0,z:0},quality='balanced'}={}){
  const T=root.THREE,M=root.ParapetModel,c=M.config(raw,p.view?.parapet),group=new T.Group(),edges=M.edges(p);
  group.name='Parapet collection';group.userData={isParapet:true,floor:edges[0]?.floor,parapetCollection:true};
  const geometryCache=new Map(),materialCache=new Map();let parts=0;
  const unitBox=()=>{if(!geometryCache.has('box'))geometryCache.set('box',new T.BoxGeometry(1,1,1));return geometryCache.get('box');};
  function material(o,kind='body',length=48){
   const key=[o.finish,o.color,o.capColor,o.accent,o.glowIntensity,kind,Math.round(length)].join(':');if(materialCache.has(key))return materialCache.get(key);
   const metal=kind==='metal'||o.finish==='metal',glow=kind==='light';
   const m=new T.MeshStandardMaterial({color:kind==='cap'||kind==='metal'?o.capColor:kind==='green'?'#526b3d':kind==='soil'?'#47382c':kind==='clay'?'#ac6041':kind==='stone'?'#8f8b7c':o.color,roughness:metal?.32:.86,metalness:metal?.72:0});
   if(glow){m.color.set('#e6c693');m.emissive.set('#ffd59a');m.emissiveIntensity=o.glowIntensity;}
   // Tiled finishes keep physical scale; each build owns its texture instances.
   if(kind==='body'&&typeof root.getProceduralTexture==='function'){
    const type={concrete:'concrete',stone:'concrete',brick:'brick',timber:'wood',terracotta:'tile'}[o.finish];
    if(type){m.map=root.getProceduralTexture(type).clone();m.map.repeat.set(Math.max(.05,length/48),o.height/48);m.map.needsUpdate=true;}
   }
   materialCache.set(key,m);return m;
  }
  const add=(parent,geometry,mat)=>{const mesh=new T.Mesh(geometry,mat);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);parts++;return mesh;};
  const box=(parent,x,y,z,w,h,d,mat)=>{if(w<=.001||h<=.001||d<=.001)return;const mesh=add(parent,unitBox(),mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);if(w<2||h<1.5)mesh.userData.parapetDetail=true;return mesh;};
  function wall(parent,L,h,t,mat,holes=[],start=0,end=0){
   const s=new T.Shape();s.moveTo(0,0);s.lineTo(L,0);s.lineTo(L,h);s.lineTo(0,h);s.closePath();
   // Openings touching the bottom are formed by independent horizontal bands,
   // avoiding invalid touching-hole triangulation.
   const cuts=[0,h,...holes.flatMap(q=>[Math.max(0,q.sill),Math.min(h,q.sill+q.height)])].filter(v=>v>=0&&v<=h).sort((a,b)=>a-b);
   const ys=[...new Set(cuts)];
   for(let i=1;i<ys.length;i++){
    const lo=ys[i-1],hi=ys[i];if(hi-lo<.001)continue;
    const openings=holes.filter(q=>q.sill<(lo+hi)/2&&q.sill+q.height>(lo+hi)/2).sort((a,b)=>a.offset-b.offset);
    let x=0;
    for(const q of [...openings,{offset:L,width:0}]){
     const right=q.offset;if(right-x>.001){const g=new T.BoxGeometry(right-x,hi-lo,t),pos=g.attributes.position;
      for(let j=0;j<pos.count;j++){let px=pos.getX(j)+(right+x)/2,pz=pos.getZ(j)+t/2;
       if(Math.abs(px)<.0001)px+=start*pz/t;if(Math.abs(px-L)<.0001)px-=end*pz/t;pos.setXYZ(j,px,pos.getY(j)+(hi+lo)/2,pz);}
      g.computeVertexNormals();add(parent,g,mat);
     }x=q.offset+q.width;
    }
   }
  }
  function profile(parent,points,depth,mat,x=0,y=0,z=0,holes=[]){
   const s=new T.Shape(points.map(v=>new T.Vector2(...v)));s.holes=holes.map(r=>new T.Path(r.map(v=>new T.Vector2(...v))));
   const mesh=add(parent,new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:quality==='eco'?4:8}),mat);mesh.position.set(x,y,z);return mesh;
  }
  function tube(parent,x,y,z,r,h,mat){const key=`tube:${quality}`;if(!geometryCache.has(key)){const s=new T.Shape(),hole=new T.Path();s.absarc(0,0,1,0,Math.PI*2,false);hole.absarc(0,0,.65,0,Math.PI*2,true);s.holes=[hole];const g=new T.ExtrudeGeometry(s,{depth:1,bevelEnabled:false,curveSegments:quality==='eco'?4:8});g.rotateX(-Math.PI/2);geometryCache.set(key,g);}const mesh=add(parent,geometryCache.get(key),mat);mesh.position.set(x,y,z);mesh.scale.set(r,h,r);}
  for(const edge of edges){
   const o=M.resolve(c,edge);if(o.style==='none')continue;
   const L=edge.length,h=o.height,t=o.thickness,open=M.validateEdge(o,edge),parent=new T.Group();
   parent.userData={isParapet:true,parapetEdge:edge.key,floor:edge.floor};parent.name=`${edge.direction} parapet ${edge.index+1}`;
   parent.position.set(origin.x+edge.a.x*scale,(edge.base+o.elevation)*scale,origin.z+edge.a.y*scale);parent.rotation.y=-Math.atan2(edge.b.y-edge.a.y,edge.b.x-edge.a.x);parent.scale.setScalar(scale);group.add(parent);
   const body=material(o,'body',L),cap=material(o,'cap'),metal=material(o,'metal'),post=Math.min(6,t),limit=Math.max(1,Math.min(64,Math.floor(4096/Math.max(1,edges.length)/12)));
   const modules=M.fit(Math.max(1,L-2*t),o.spacing,limit);
   const clear=(x,w=0)=>x-w/2>=t&&x+w/2<=L-t&&!open.some(q=>x+w/2>q.offset&&x-w/2<q.offset+q.width);
   const prev=edges.find(e=>e.island===edge.island&&e.hole===edge.hole&&Math.hypot(e.b.x-edge.a.x,e.b.y-edge.a.y)<.001),next=edges.find(e=>e.island===edge.island&&e.hole===edge.hole&&Math.hypot(e.a.x-edge.b.x,e.a.y-edge.b.y)<.001);
   const turn=(a,b)=>Math.atan2((a.b.x-a.a.x)*(b.b.y-b.a.y)-(a.b.y-a.a.y)*(b.b.x-b.a.x),(a.b.x-a.a.x)*(b.b.x-b.a.x)+(a.b.y-a.a.y)*(b.b.y-b.a.y));
   const trim=(n)=>Math.max(-L/3,Math.min(L/3,n));
   const junction=(neighbour,angle)=>{if(Math.abs(Math.sin(angle))<.001)return 0;const nt=M.resolve(c,neighbour).thickness;return trim((nt-t*Math.cos(angle))/Math.sin(angle));};
   const start=prev?junction(prev,turn(prev,edge)):0,end=next?junction(next,turn(edge,next)):0;
   const screened=['geometric-jaali','slim-pickets','terracotta-tubes','ribbon-bands','modern-glass','zen-pergola'].includes(o.style),baseH=screened?h*.25:o.style==='floating-coping'?h-3:h;
   const recessed=['scalloped-arch','traditional-pilasters','classic-curve','fluted-stone'].includes(o.style);
   if(recessed){const backing=new T.Group();backing.position.z=1;parent.add(backing);wall(backing,L,baseH,t-1,body,open,start,end);}else wall(parent,L,baseH,t,body,open,start,end);
   // Coping uses mitred ends, matching neighbouring edge caps. Gates cut through it.
   const capGroup=new T.Group();capGroup.position.set(-1,h,-1);parent.add(capGroup);wall(capGroup,L+2,2,t+2,cap,open.filter(q=>q.kind==='gate').map(q=>({...q,offset:q.offset+1,sill:-h})),start*(t+2)/t,end*(t+2)/t);
   const xs=modules.centers.map(x=>x+t),pitch=modules.pitch;
   if(screened){
    const top=h-1,bottom=baseH;
    box(parent,t/2,(top+bottom)/2,t/2,t,top-bottom,t,cap);
    for(let i=0;i<=modules.count;i++){const x=t+i*pitch;if(clear(x,post))box(parent,x,(top+bottom)/2,t/2,post,top-bottom,t,cap);}
    if(o.style==='slim-pickets'){const f=M.fit(L-2*t,Math.min(6,o.spacing/3),96);for(const x0 of f.centers){const x=x0+t;if(clear(x,1.2))box(parent,x,(h+baseH)/2,t/2,1.2,h-baseH,1.2,metal);}}
    if(o.style==='terracotta-tubes'){const f=M.fit(L-2*t,Math.min(8,o.spacing/2),64);for(const x0 of f.centers){const x=x0+t;if(clear(x,3))tube(parent,x,baseH,t/2,Math.min(1.5,f.pitch*.3),h-baseH,material(o,'clay'));}}
    if(o.style==='modern-glass'||o.style==='zen-pergola'){const glass=new T.MeshPhysicalMaterial({color:'#bfdbdd',transparent:true,opacity:o.glassOpacity,roughness:.12,metalness:.05,depthWrite:false});for(const x of xs)if(clear(x,pitch-post))box(parent,x,(h+baseH)/2,t/2,pitch-post,h-baseH-2,.5,glass);if(!parent.children.some(n=>n.material===glass))glass.dispose();}
    if(o.style==='ribbon-bands')for(let j=0;j<3;j++)for(const x of xs)if(clear(x,pitch-post))box(parent,x,baseH+(h-baseH)*(j+.5)/3,t/2+(j%2)*t*.15,pitch-post,(h-baseH)*.2,t*.6,body);
    if(o.style==='geometric-jaali')for(const x of xs)if(clear(x,pitch-post)){
     const width=pitch-post,height=h-baseH-2,holes=[],count=Math.max(1,Math.min(4,Math.round(width/10))),rows=Math.max(1,Math.min(3,Math.round(height/10)));
     for(let i=0;i<count;i++)for(let j=0;j<rows;j++){const cx=(i+.5)*width/count,cy=(j+.5)*height/rows,rx=width/count*.3,ry=height/rows*.3;
      holes.push(o.pattern==='square'?[[cx-rx,cy-ry],[cx-rx,cy+ry],[cx+rx,cy+ry],[cx+rx,cy-ry]]:Array.from({length:o.pattern==='hexagon'?6:4},(_,k)=>{const a=-k*Math.PI*2/(o.pattern==='hexagon'?6:4);return [cx+Math.cos(a)*rx,cy+Math.sin(a)*ry];}));}
     profile(parent,[[0,0],[width,0],[width,height],[0,height]],Math.max(1,t*.4),body,x-width/2,baseH+1,t*.3,holes);
    }
   }
   if(o.style==='floating-coping'){
    const g=new T.Group();g.position.set(0,h-3,t*.15);parent.add(g);wall(g,L,3,t*.7,metal,open.filter(q=>q.kind==='gate').map(q=>({...q,sill:-h})),start*.7,end*.7);
   }
   if(o.style==='stepped-deco')for(let j=0;j<3;j++)for(const x of xs)if(clear(x,pitch-2))box(parent,x,h*(.3+j*.22),-.4-j*.5,pitch-2,2,1+j,cap);
   if(o.style==='planter-parapet')for(const x of xs)if(clear(x,pitch-4)){
    const w=Math.max(2,pitch-4),depth=Math.max(t,10),y=h*.55;
    box(parent,x,y, t+depth/2,w,2,depth,body);box(parent,x,y+4,t+depth-1,w,8,2,body);
    for(const side of [-1,1])box(parent,x+side*(w/2-1),y+4,t+depth/2,2,8,depth,body);
    box(parent,x,y+2,t+depth/2,w-4,1,depth-3,material(o,'soil'));
    if(o.greenery){const key='leaf';if(!geometryCache.has(key))geometryCache.set(key,new T.IcosahedronGeometry(1,0));for(let i=0;i<(quality==='eco'?2:4);i++){const leaf=add(parent,geometryCache.get(key),material(o,'green'));leaf.userData.parapetDetail=true;leaf.position.set(x+(i-1)*w/6,y+6,t+depth/2);leaf.scale.set(w/5,4,3);}}
   }
   if(o.style==='fluted-stone'||o.style==='neo-brutalist'){const ribs=M.fit(L-2*t,Math.max(3,o.spacing/4),96);for(const x0 of ribs.centers){const x=x0+t;if(clear(x,1.5))box(parent,x,h/2,.5,o.style==='fluted-stone'?Math.max(1,ribs.pitch-.7):1.5,h-4,1,o.style==='fluted-stone'?body:cap);}}
   if(['scalloped-arch','traditional-pilasters','classic-curve'].includes(o.style)) {
    for(const x of xs)if(clear(x,pitch-.01)){
     const width=pitch,aw=width*.68,ph=h*.68,base=4,center=ph*.6;
     const hole=[[-aw/2,base],[-aw/2,base+center],...Array.from({length:13},(_,i)=>{const angle=Math.PI-i*Math.PI/12;return [Math.cos(angle)*aw/2,base+center+Math.sin(angle)*(ph-center)];}),[aw/2,base]];
     profile(parent,[[-width/2,0],[width/2,0],[width/2,h],[-width/2,h]],1,body,x,0,0,[hole]);
     if(o.style==='traditional-pilasters')for(const sign of [-1,1]){const px=x+sign*(width/2-1.5);box(parent,px,h/2,-.6,3,h+1,1.2,body);box(parent,px,h,-.6,5,2,2,cap);}
    }
    for(const x of [t/2,L-t/2])box(parent,x,h/2,.5,t,h,1,body);
   }
   if(o.style==='lotus-crown')for(const x of xs)if(clear(x,pitch-4))for(let j=0;j<3;j++){
    const w=Math.min(10,pitch/4),ph=(j===1?10:7)*o.detail,cx=x+(j-1)*w*.65;
    profile(parent,[[0,0],[w*.18,ph*.5],[w/2,ph],[w*.82,ph*.5],[w,0]],t*.7,body,cx-w/2,h,t*.15);
   }
   if(o.style==='brick-heritage'||o.style==='board-concrete'){
    const rows=Math.min(12,Math.floor(h/(o.style==='brick-heritage'?6:8)));
    for(let j=1;j<=rows;j++)for(const x of xs)if(clear(x,pitch-1))box(parent,x,j*h/(rows+1),-.3,pitch-1,o.style==='brick-heritage'?1.2:.35,.6,cap);
   }
   if(o.style==='folded-metal')for(const x of xs)if(clear(x,pitch-2)){
    const mesh=box(parent,x,h/2,-1,pitch-2,h-4,1.2,metal);mesh.rotation.y=(Math.floor(x/pitch)%2?1:-1)*.18;
   }
   if(o.style==='gabion-accents')for(const x of xs)if(clear(x,pitch-4)){
    const w=Math.max(2,pitch-4);for(const y of [4,h-4])box(parent,x,y,-1,w,.7,1,metal);for(const sign of [-1,1])box(parent,x+sign*w/2,h/2,-1,.7,h-8,1,metal);
    const key='rock';if(!geometryCache.has(key))geometryCache.set(key,new T.IcosahedronGeometry(1,0));
    for(let j=0;j<(quality==='eco'?4:12);j++){const stone=add(parent,geometryCache.get(key),material(o,'stone'));stone.userData.parapetDetail=true;stone.position.set(x+((j%3)-1)*w/3.5,7+Math.floor(j/3)*(h-12)/4,-.6);stone.scale.set(w/7,2,1.2);stone.rotation.z=j*1.37;}
   }
   if(o.style==='standing-seam')for(const x of xs)if(clear(x,.6))box(parent,x,h/2,-.7,.6,h,1.4,metal);
   if(['premium-canopy','modern-brown','geo-interlock','cyber-cantilever'].includes(o.style))for(const x of xs)if(clear(x,pitch*.6))box(parent,x,h*.65,-1,pitch*.6,h*.18,2,cap);
   if(o.accent&&quality!=='eco')for(const x of xs)if(clear(x,pitch-3))box(parent,x,h-2,-.15,pitch-3,.4,.3,material(o,'light'));
   if(o.gate?.enabled){const g=o.gate;box(parent,g.offset+g.width/2,h/2,t/2,g.width-2,h-2,1.2,metal);for(const x of [g.offset,g.offset+g.width])box(parent,x,h/2,t/2,2,h+2,t+1,cap);box(parent,g.offset+g.width-5,h*.55,-1,3,1,2,cap);}
  }
  // Instance repeated closed parts within each edge; edge metadata remains pickable.
  for(const edgeGroup of group.children){
   const batches=new Map();edgeGroup.traverse(n=>{if(n.isMesh){n.userData={...n.userData,...edgeGroup.userData};const key=n.geometry.uuid+':'+n.material.uuid;if(!batches.has(key))batches.set(key,[]);if(n.parent===edgeGroup)batches.get(key).push(n);}});
   for(const nodes of batches.values())if(nodes.length>=3){const first=nodes[0],instances=new T.InstancedMesh(first.geometry,first.material,nodes.length);instances.userData={...first.userData,...edgeGroup.userData};instances.castShadow=instances.receiveShadow=true;nodes.forEach((n,i)=>{n.updateMatrix();instances.setMatrixAt(i,n.matrix);edgeGroup.remove(n);});instances.instanceMatrix.needsUpdate=true;edgeGroup.add(instances);}
  }
  // A cache may contain resources skipped by openings. Dispose them immediately.
  const usedG=new Set(),usedM=new Set();group.traverse(n=>{if(n.geometry)usedG.add(n.geometry);if(n.material)usedM.add(n.material);});
  for(const g of geometryCache.values())if(!usedG.has(g))g.dispose();for(const m of materialCache.values())if(!usedM.has(m)){m.map?.dispose();m.dispose();}
  group.userData.partCount=parts;return group;
 }
 root.ParapetRenderer={build};if(typeof module==='object')module.exports=root.ParapetRenderer;
})(typeof window!=='undefined'?window:globalThis);
