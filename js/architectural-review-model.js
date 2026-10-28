/* Geometric junction review. Reads the portable model and never repairs geometry
 * silently. Findings are locatable design observations, not engineering rules. */
(function(root){
  'use strict';
  function inspect(p) {
    const Roof=root.RoofModel || (typeof require==='function'?require('./roof-model.js'):null),
      P=root.ProjectModel,W=root.WorkbenchModel,M=root.PlanningModel,
      parapets=root.ParapetModel || (typeof require==='function'?require('./parapet-model.js'):null),
      surface=Roof.describe(p),findings=[];
    if(!surface)return findings;
    const add=(code,id,reason,point,action='roof')=>findings.push({code,id,reason,point,floor:surface.floor,action});
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
  root.ArchitecturalReviewModel={inspect};
  if(typeof module==='object')module.exports=root.ArchitecturalReviewModel;
})(globalThis);
