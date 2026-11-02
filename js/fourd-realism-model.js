/* Presentation-only controls and deterministic physical mapping, in inches. */
(function(root){
  const defaults=()=>({enabled:false,materialScale:true,textureDetail:true,roomLighting:true,
    autoExposure:true,edgeDetail:true,contactShadows:true,roomReflections:true,naturalGarden:true,
    walkAssist:true,fixtureShadows:true,glazing:'clear',tileSize:24,plankWidth:6,plankLength:48,
    brickWidth:9,brickHeight:3,textureStrength:1,exposureSpeed:1,stillSeconds:15,stillWidth:480,
    stillSamples:16,stillBounces:4});
  function validate(raw){
    if(raw!=null&&(typeof raw!=='object'||Array.isArray(raw)))throw Error('Invalid realism settings');
    const d={...defaults(),...raw};
    for(const [key,value]of Object.entries(defaults()))if(typeof value==='boolean'){
      if(typeof d[key]!=='boolean')throw Error('Invalid realism '+key);
    }
    for(const [key,min,max]of [['tileSize',2,96],['plankWidth',2,24],['plankLength',12,120],
      ['brickWidth',4,18],['brickHeight',1,8],['textureStrength',0,2],['exposureSpeed',.25,3],
      ['stillSeconds',2,60],['stillWidth',160,960],['stillSamples',1,128],['stillBounces',1,6]]){
      if(typeof d[key]!=='number'||!Number.isFinite(d[key])||d[key]<min||d[key]>max)throw Error('Invalid realism '+key);
    }
    for(const k of ['stillWidth','stillSamples','stillBounces'])if(!Number.isInteger(d[k]))throw Error('Invalid realism '+k);
    if(!['clear','frosted','tinted'].includes(d.glazing))throw Error('Invalid realism glazing');
    return d;
  }
  // The procedural image contains 2 ceramic tiles, 4 planks or 4×8 bricks.
  function period(type,s=defaults()){
    if(['bathroom-tile','kitchen-tile'].includes(type))return [s.tileSize*2,s.tileSize*2];
    if(['wood','timber'].includes(type))return [s.plankWidth*4,s.plankLength];
    if(['brick','shingle'].includes(type))return [s.brickWidth*4,s.brickHeight*8];
    return [type==='fabric'?12:48,type==='fabric'?12:48];
  }
  function roomAt(p,point){
    const M=root.PlanningModel||(typeof require==='function'?require('./planning-model.js'):null),
      W=root.WorkbenchModel||(typeof require==='function'?require('./workbench-model.js'):null);
    return p.elements.filter(e=>!e.isFurniture&&e.type!=='staircase'&&M.inside({x:point.x,y:point.z},M.points(e))&&
      point.y>=W.roomBase(p,e)-2&&point.y<W.roomBase(p,e)+W.floorHeight(p,e.floor)+2)
      .sort((a,b)=>W.roomBase(p,b)-W.roomBase(p,a))[0]||null;
  }
  function daylight(p,room){
    const M=root.PlanningModel||(typeof require==='function'?require('./planning-model.js'):null);
    let area=0;
    for(const f of p.fixtures){
      if(f.type!=='window'||p.elements[f.roomId]?.id!==room.id)continue;
      const line=M.openingSegment(p,f);if(!line)continue;
      const dx=line.b.x-line.a.x,dy=line.b.y-line.a.y,len=Math.hypot(dx,dy);if(!len)continue;
      const mid={x:(line.a.x+line.b.x)/2,y:(line.a.y+line.b.y)/2},c={x:room.x+room.w/2,y:room.y+room.h/2};
      let nx=-dy/len,ny=dx/len;if(nx*(mid.x-c.x)+ny*(mid.y-c.y)<0){nx=-nx;ny=-ny;}
      const q={x:mid.x+nx*12,y:mid.y+ny*12};
      if(!p.elements.some(e=>e.id!==room.id&&!e.isFurniture&&e.floor===room.floor&&M.inside(q,M.points(e))))area+=f.size*(f.height||40);
    }
    return Math.min(1,area/Math.max(1,room.w*room.h)*5);
  }
  function halfToFloat(value){const sign=value&32768?-1:1,exp=(value>>10)&31,m=value&1023;return exp===0?sign*m*2**-24:exp===31?(m?NaN:sign*Infinity):sign*(1+m/1024)*2**(exp-15);}
  const api={defaults,validate,period,roomAt,daylight,halfToFloat};root.FourDRealismModel=api;
  if(typeof module==='object')module.exports=api;
})(globalThis);
