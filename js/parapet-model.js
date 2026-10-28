/* Portable parapet data and architectural schedules. All lengths are inches.
 * No editor, DOM or GPU dependencies: imports and workers use the same validation. */
(function(root){
 'use strict';
 const designs=[
 ['floating-coping','Floating coping','Modern'],['geometric-jaali','Geometric jaali','Indian'],
 ['stepped-deco','Stepped Art Deco','Modern'],['planter-parapet','Planter parapet','Modern'],
 ['fluted-stone','Fluted concrete / stone','Modern'],['slim-pickets','Solid + slim pickets','Modern'],
 ['scalloped-arch','Scalloped arch panels','Indian'],['lotus-crown','Lotus crown','Indian'],
 ['traditional-pilasters','Traditional pilasters','Indian'],['terracotta-tubes','Terracotta tube screen','Indian'],
 ['brick-heritage','Brick heritage','Indian'],['folded-metal','Folded metal panels','Modern'],
 ['board-concrete','Board-formed concrete','Modern'],['gabion-accents','Gabion accents','Modern'],
 ['standing-seam','Standing-seam metal','Modern'],['ribbon-bands','Offset ribbon bands','Modern']
 ].map(([id,name,category])=>({id,name,category}));
 const legacy=[['premium-canopy','Premium facade'],['modern-brown','Modern brown & white'],['geo-interlock','Geometric interlock'],['classic-curve','Classic curves'],['modern-glass','Modern glass'],['neo-brutalist','Neo Brutalist'],['zen-pergola','Zen pergola'],['cyber-cantilever','Cyber cantilever'],['standard','Standard capped wall'],['none','None · flat edge']].map(([id,name])=>({id,name,category:'Original'}));
 const styles=[...designs,...legacy], finishes=['concrete','stone','brick','metal','terracotta','timber'];
 const defaults=()=>({style:'floating-coping',height:36,thickness:6,spacing:24,detail:1,elevation:0,glassOpacity:.4,glowIntensity:1.2,finish:'concrete',color:'#c8c3b9',capColor:'#595e62',accent:false,greenery:true,pattern:'square',drains:[],gate:null});
 const clone=x=>structuredClone(x),num=(x,name,min,max)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw Error(`${name} must be between ${min} and ${max} inches (detail is a ratio).`);return x;};
 function options(raw={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid parapet options');
  const o={...defaults(),...clone(raw)};
  if(!styles.some(s=>s.id===o.style))throw Error('Unknown parapet design');
  if(!finishes.includes(o.finish))throw Error('Unknown parapet finish');
  for(const [k,lo,hi] of [['height',12,72],['thickness',2,18],['spacing',6,96],['detail',.25,2],['elevation',-10,25],['glassOpacity',.1,1],['glowIntensity',0,3]])num(o[k],k,lo,hi);
  for(const k of ['color','capColor'])if(typeof o[k]!=='string'||!/^#[a-f\d]{6}$/i.test(o[k]))throw Error('Invalid parapet color');
  for(const k of ['accent','greenery'])if(typeof o[k]!=='boolean')throw Error(`Invalid ${k}`);
  if(!['square','diamond','hexagon'].includes(o.pattern))throw Error('Invalid jaali pattern');
  if(!Array.isArray(o.drains)||o.drains.length>12)throw Error('Use at most 12 scuppers on an edge');
  o.drains=o.drains.map(d=>({offset:num(d.offset,'Drain offset',0,100000),width:num(d.width,'Drain width',2,24),height:num(d.height,'Drain height',2,12),sill:num(d.sill,'Drain sill',0,24)}));
  if(o.gate!==null){const g=o.gate;if(!g||typeof g!=='object'||(g.enabled!==undefined&&typeof g.enabled!=='boolean'))throw Error('Invalid terrace gate');o.gate={offset:num(g.offset,'Gate offset',0,100000),width:num(g.width,'Gate width',24,72),enabled:g.enabled!==false};}
  return Object.fromEntries(Object.keys(defaults()).map(k=>[k,o[k]]));
 }
 function config(raw={},style){
  const c={...clone(raw)};if(c.version!==undefined&&c.version!==2)throw Error('Unknown parapet configuration version');
  if(c.rates!==undefined){if(!c.rates||typeof c.rates!=='object'||Array.isArray(c.rates))throw Error('Invalid parapet rates');c.rates=Object.fromEntries(['finish','coping','post'].map(k=>[k,num(c.rates[k]??0,'Unit rate',0,1000000)]));}
  c.version=2;c.defaults=options(c.defaults||{style:styles.some(s=>s.id===style)?style:'floating-coping'});
  if(c.edges!==undefined&&(!c.edges||typeof c.edges!=='object'||Array.isArray(c.edges)))throw Error('Invalid parapet edge assignments');
  if(Object.keys(c.edges||{}).length>256)throw Error('Too many parapet edges');
  c.edges=Object.fromEntries(Object.entries(c.edges||{}).map(([k,v])=>{if(!/^edge:[\d.,:-]+$/.test(k)||k.length>180)throw Error('Invalid parapet edge key');return [k,options(v)];}));
  if(c.presets!==undefined&&(!Array.isArray(c.presets)||c.presets.length>24))throw Error('Use at most 24 parapet presets');
  c.presets=(c.presets||[]).map(p=>{if(typeof p.name!=='string'||!p.name.trim()||p.name.length>60)throw Error('Preset needs a name of 1–60 characters');return {name:p.name,options:options(p.options)};});return c;
 }
 const round=n=>Math.round(n*1000)/1000;
 function edges(p){
  const D=root.DesignModel,W=root.WorkbenchModel;
  const top=Math.max(-1,...p.elements.filter(e=>!e.isFurniture&&e.type!=='staircase').map(e=>e.floor));if(top<0)return [];
  const result=[];
  for(const [island,poly]of D.floorUnion(p,top).entries())for(const [ringIndex,ring]of poly.entries()){
   for(let i=1;i<ring.length;i++){
    const a={x:ring[i-1][0],y:ring[i-1][1]},b={x:ring[i][0],y:ring[i][1]},length=Math.hypot(b.x-a.x,b.y-a.y);if(length<.01)continue;
    const endpoints=[`${round(a.x)},${round(a.y)}`,`${round(b.x)},${round(b.y)}`].sort();
    const key=`edge:${top}:${endpoints.join(':')}`,dx=b.x-a.x,dy=b.y-a.y;
    // Cardinal labels describe drawing orientation. Every segment also has an ID/preview.
    const direction=Math.abs(dx)>=Math.abs(dy)?(dx>0?'Rear':'Front'):(dy>0?'Right':'Left');
    result.push({key,a,b,length,floor:top,island,hole:ringIndex>0,direction,base:W.floorBase(p,top)+W.floorHeight(p,top)+(p.design.roof.type==='flat'?(p.design.roof.thickness??4):2),index:result.length});
   }
  }if(result.length>256)throw Error('Parapet outline exceeds 256 segments');return result;
 }
 function fit(length,target=24,max=64){const count=Math.max(1,Math.min(max,Math.round(length/target)));return {count,pitch:length/count,centers:Array.from({length:count},(_,i)=>(i+.5)*length/count)};}
 function resolve(c,edge){const o=options(c.edges[edge.key]||c.defaults);validateEdge(o,edge);return o;}
 function validateEdge(o,edge){
  const openings=[...o.drains.map(d=>({...d,kind:'drain'})),...(o.gate?.enabled?[{...o.gate,sill:0,height:o.height+4,kind:'gate'}]:[])].sort((a,b)=>a.offset-b.offset);
  for(let i=0;i<openings.length;i++){const d=openings[i];if(d.offset+d.width>edge.length-.01||d.offset<.01)throw Error(`${edge.direction} segment ${edge.index+1}: opening must fit within the edge, clear of corners`);if(d.kind==='drain'&&d.sill+d.height>=o.height-2)throw Error('Drain must sit below the coping');if(i&&openings[i-1].offset+openings[i-1].width>=d.offset)throw Error('Drain and gate openings must not overlap');}return openings;
 }
 function schedule(p,c){
  c=config(c,p.view?.parapet);const outline=edges(p),max=Math.max(1,Math.min(64,Math.floor(4096/Math.max(1,outline.length)/12)));return outline.map(edge=>{
   const o=resolve(c,edge),open=validateEdge(o,edge),gate=o.gate?.enabled?o.gate.width:0,L=edge.length-gate,screen=['geometric-jaali','slim-pickets','terracotta-tubes','modern-glass','zen-pergola','ribbon-bands'].includes(o.style),modules=fit(Math.max(1,edge.length-2*o.thickness),o.spacing,max);
   const ratio=o.style==='geometric-jaali'?.38:o.style==='slim-pickets'?.54:o.style==='terracotta-tubes'?.48:o.style==='ribbon-bands'?.28:o.style==='modern-glass'||o.style==='zen-pergola'?.7:0;
   const openingArea=open.reduce((sum,d)=>sum+d.width*Math.min(d.height,o.height),0),area=Math.max(0,edge.length*o.height-openingArea);
   return {...edge,style:o.style,finish:o.finish,height:o.height,thickness:o.thickness,spacing:modules.pitch,panels:o.style==='none'?0:modules.centers.filter(x=>!open.some(q=>x+o.thickness+modules.pitch/2>q.offset&&x+o.thickness-modules.pitch/2<q.offset+q.width)).length,posts:screen?modules.count:0,coping:o.style==='none'?0:L/12,area:o.style==='none'?0:area/144,openPercent:o.style==='none'?100:Math.round(ratio*100),solidVolume:o.style==='none'?0:area*(1-ratio)*o.thickness/1728,options:o};
  });
 }
 function estimate(p,c,rates={}){const rows=schedule(p,c),rate=(key)=>Math.max(0,Number(rates[key])||0);return {rows,length:rows.reduce((s,r)=>s+r.length/12,0),coping:rows.reduce((s,r)=>s+r.coping,0),area:rows.reduce((s,r)=>s+r.area,0),panels:rows.reduce((s,r)=>s+r.panels,0),posts:rows.reduce((s,r)=>s+r.posts,0),cost:rows.reduce((s,r)=>s+r.area*rate('finish')+r.coping*rate('coping')+r.posts*rate('post'),0)};}
 root.ParapetModel={designs,styles,finishes,defaults,options,config,edges,fit,resolve,validateEdge,schedule,estimate};
 if(typeof module==='object')module.exports=root.ParapetModel;
})(typeof window!=='undefined'?window:globalThis);
