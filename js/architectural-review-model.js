/* Geometric junction review. Reads the portable model and never repairs geometry
 * silently. Findings are locatable design observations, not engineering rules. */
(function(root){
  'use strict';
  function closeups(p) {
    const P=root.ProjectModel,W=root.WorkbenchModel,M=root.PlanningModel,walls=P.walls(p),rows=[],ends=new Map(),host=new Map(walls.flatMap(w=>w.openings.map(o=>[o.id,w])));
    const add=(code,id,reason,point,floor,elevation,extra={})=>{if(rows.length<150)rows.push({code,id,reason,point,floor,elevation,...extra});};
    for(const f of p.fixtures){
      const room=p.elements[f.roomId],line=M.openingSegment(p,f);if(!room||!line)continue;
      const point={x:(line.a.x+line.b.x)/2,y:(line.a.y+line.b.y)/2},base=W.roomBase(p,room),head=(f.sill||0)+f.height;
      if(head>W.floorHeight(p,room.floor)+.1)add('opening-head',room.id,'Opening head rises above the room wall height; review the lintel and reveal.',point,room.floor,base+head,{opening:f.id,category:'openings'});
      const wall=host.get(f.id);
      if(wall){const opening=wall.openings.find(o=>o.id===f.id),length=wall.length??wall.end-wall.start;
        if(Math.min(opening.start,length-opening.end)<wall.thickness/2+.7)add('opening-jamb',room.id,'Opening is close to a wall end; inspect the jamb, reveal and adjoining corner.',point,room.floor,base+head/2,{opening:f.id,category:'openings'});
      }
    }
    for(const wall of walls){
      const a=wall.a||{x:wall.horizontal?wall.start:wall.fixed,y:wall.horizontal?wall.fixed:wall.start},b=wall.b||{x:wall.horizontal?wall.end:wall.fixed,y:wall.horizontal?wall.fixed:wall.end},room=p.elements[wall.owners.find(o=>o.index!=null)?.index],base=wall.base??W.floorBase(p,wall.floor),top=base+(wall.height??W.floorHeight(p,wall.floor));
      for(const point of [a,b]){const key=[wall.floor,point.x.toFixed(2),point.y.toFixed(2)].join(':'),previous=ends.get(key)||[];
        for(const other of previous)if(Math.abs(other.base-base)>.25||Math.abs(other.top-top)>.25)add('wall-junction',room?.id,'Connected walls have different base or top elevations; inspect the corner joint.',point,wall.floor,Math.min(top,other.top),{category:'walls'});
        previous.push({base,top});ends.set(key,previous);
      }
    }
    const work=W.data(p);
    for(const stair of p.elements.filter(e=>e.type==='staircase'&&work.stairs[e.id])){
      const spec=work.stairs[stair.id],geometry=W.orientedStairs(p,stair),base=W.roomBase(p,stair),point={x:stair.x+stair.w/2,y:stair.y+stair.h/2};
      if(geometry.width>stair.w+.1||geometry.depth>stair.h+.1)add('stair-footprint',stair.id,'Parametric stair treads extend beyond the saved stair footprint; review dimensions and clearance.',point,stair.floor,base+spec.rise/2,{category:'stairs'});
      if(stair.floor+1<p.floorCount&&Math.abs(base+spec.rise-W.floorBase(p,stair.floor+1))>.25)add('stair-level',stair.id,'Stair arrival differs from the next floor datum; inspect the upper landing connection.',point,stair.floor,base+spec.rise,{category:'stairs'});
      for(const landing of geometry.treads.filter(t=>t.landing)){
        const xs=landing.points.map(q=>q.x),ys=landing.points.map(q=>q.y),width=Math.max(...xs)-Math.min(...xs),depth=Math.max(...ys)-Math.min(...ys),q={x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2};
        if(Math.min(width,depth)<spec.width-.1)add('stair-landing',stair.id,'Landing depth is smaller than the configured stair width; review the turning space.',q,stair.floor,base+landing.top,{category:'stairs'});
      }
    }
    return rows;
  }
  function inspect(p) {
    const Roof=root.RoofModel || (typeof require==='function'?require('./roof-model.js'):null),
      P=root.ProjectModel,W=root.WorkbenchModel,M=root.PlanningModel,
      parapets=root.ParapetModel || (typeof require==='function'?require('./parapet-model.js'):null),
      surface=Roof.describe(p),findings=closeups(p);
    if(!surface)return findings;
    const add=(code,id,reason,point,action='roof')=>findings.push({code,id,reason,point,floor:surface.floor,action,category:'roof',elevation:surface.base+surface.riseAt(point.x,point.y)});
    const inside=(q,polygons)=>polygons.some(poly=>M.inside(q,poly[0].map(([x,y])=>({x,y})))&&!poly.slice(1).some(h=>M.inside(q,h.map(([x,y])=>({x,y})))));
    const height=q=>surface.base+surface.riseAt(q.x,q.y),bottom=q=>height(q)-surface.thickness;
    if(p.design.roof.type!=='flat'){
      const config=parapets.config(p.view.parapetConfig,p.view.parapet);
      for(const edge of parapets.edges(p)){
        const o=parapets.resolve(config,edge);if(o.style==='none')continue;
        const q={x:(edge.a.x+edge.b.x)/2,y:(edge.a.y+edge.b.y)/2},lo=edge.base+o.elevation,hi=lo+o.height;
        if(inside(q,surface.polygons)&&height(q)>lo+.1&&bottom(q)<hi-.1)
          add('roof-parapet',edge.key,'Parapet crosses the pitched roof; review the junction and flashing.',q,'parapet');
      }
    }
    const w=W.data(p);
    for(const item of [...w.shafts,...w.voids]){
      const active=item.from!==undefined?surface.floor>=item.from&&surface.floor<item.to:surface.floor===item.floor;
      if(!active)continue;
      const points=item.points || M.points(item),q={x:points.reduce((s,v)=>s+v.x,0)/points.length,y:points.reduce((s,v)=>s+v.y,0)/points.length};
      if(inside(q,surface.polygons))add('roof-penetration',item.id,'Roof covers this shaft or vertical void; review a roof opening.',q);
    }
    for(const ceiling of p.design.ceilings.filter(c=>c.floor===surface.floor)){
      const q={x:ceiling.x+ceiling.w/2,y:ceiling.y+ceiling.h/2},z=W.floorBase(p,ceiling.floor)+ceiling.height+1;
      const samples=[q,{x:ceiling.x,y:ceiling.y},{x:ceiling.x+ceiling.w,y:ceiling.y},{x:ceiling.x+ceiling.w,y:ceiling.y+ceiling.h},{x:ceiling.x,y:ceiling.y+ceiling.h}];
      if(samples.some(point=>inside(point,surface.polygons)&&z>bottom(point)+.1))add('roof-ceiling',ceiling.id,'Ceiling zone intersects or rises above the roof underside.',q,'ceiling');
    }
    for(const f of p.fixtures){
      const room=p.elements[f.roomId];if(room?.floor!==surface.floor)continue;
      const segment=M.openingSegment(p,f),q={x:(segment.a.x+segment.b.x)/2,y:(segment.a.y+segment.b.y)/2};
      if(inside(q,surface.polygons)&&W.roomBase(p,room)+f.sill+f.height>bottom(q)+.1)
        add('roof-opening',f.id,'Opening head intersects the roof underside.',q,'opening');
    }
    const width=P.inches(p.plot.inW,p.unit),depth=P.inches(p.plot.inH,p.unit),b=surface.bounds;
    if(b.minX<-.01||b.minY<-.01||b.maxX>width+.01||b.maxY>depth+.01)
      add('roof-plot','roof','Roof overhang extends outside the plot.',{x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2});
    return findings.slice(0,200);
  }
  root.ArchitecturalReviewModel={inspect,closeups};
  if(typeof module==='object')module.exports=root.ArchitecturalReviewModel;
})(globalThis);
