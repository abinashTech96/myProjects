/* Cancellable editor-source preparation. Existing builders run in bounded steps
 * against a private group; live globals are swapped only during synchronous calls. */
window.FourDSource = {
  serial: 0,
  async build(p, checkpoint, valid=()=>true) {
    const serial=++this.serial,key=FourDWorkspace.geometryKey(p);
    if(!FourDWorkspace.sourceInvalid&&this.key===key&&Engine3D.buildingGroup)return;
    const source=new THREE.Group(),map=new Map(),oldGroup=Workbench3D.group,oldSignature=Workbench3D.signature,
      {SCALE:S,I,WALL_HEIGHT:H,unit,inW,inH}=get3DEnvironmentParams(),real=CanvasControlsEngine.isReal3D(),
      metrics={chunks:0,maxChunkMs:0,totalMs:0},began=performance.now();
    let committed=false;
    let yieldedAt=performance.now();
    const check=async()=>{if(performance.now()-yieldedAt>=8){await checkpoint();yieldedAt=performance.now();}if(serial!==this.serial||!valid())throw new DOMException('Cancelled source preparation','AbortError');};
    const step=fn=>{
      if(serial!==this.serial||!valid())throw new DOMException('Cancelled source preparation','AbortError');
      const live=Engine3D.buildingGroup,liveMap=Engine3D.elementObjects,start=performance.now();
      Engine3D.buildingGroup=source;Engine3D.elementObjects=map;
      try{return fn();}finally{Engine3D.buildingGroup=live;Engine3D.elementObjects=liveMap;metrics.chunks++;metrics.maxChunkMs=Math.max(metrics.maxChunkMs,performance.now()-start);}
    };
    try {
      const dependencies=await FourDJobs.run({kind:'describe',project:p},()=>serial===this.serial&&valid());await checkpoint();await check();
      for(const e of p.elements){step(()=>build3DRooms(S,I,H,real,{partial:true,ids:new Set([e.id]),noWalls:true}));await check();}
      for(const row of dependencies.rows){step(()=>PlanningDrawing.wall3D(S,I,H,[row]));await check();}
      for(const f of p.fixtures){step(()=>build3DFixtures(S,I,H,real,{ids:new Set([f.id])}));await check();}
      for(let floor=0;floor<p.floorCount;floor++){step(()=>build3DSlabs(S,I,H,real,{floors:new Set([floor])}));await check();}
      step(()=>DesignIO.add3D({roof:false}));await check();
      step(()=>build3DParapet(real));await check();
      step(()=>build3DBoundaries(S,unit,I,inW,inH));await check();
      const builder=Workbench3D.buildSteps({deferAssets:true});
      try {while(!step(()=>builder.next()).done)await check();}finally{builder.return();}
      await check();
      const generation=Workbench3D.generation,parent=source.children.find(n=>n.userData.workbench);
      for(const e of p.elements.filter(e=>e.assetId)){
        const asset=WorkbenchModel.data(p).assets.find(a=>a.id===e.assetId);
        if(asset)await Workbench3D.placeAsset(asset,e,generation,parent,map,false);
        await check();
      }
      const previous=Engine3D.buildingGroup;
      Engine3D.buildingGroup=source;Engine3D.elementObjects=map;source.name='Architectural source';
      Engine3D.scene.add(source);previous?.parent?.remove(previous);if(previous)Workbench3D.disposeObject(previous);
      Engine3D.modelSignature='4d-source:'+serial;Engine3D.designSignature=null;
      Workbench3D.signature=null;this.key=key;FourDWorkspace.sourceInvalid=false;committed=true;
      metrics.totalMs=performance.now()-began;FourDWorkspace.metrics.source=metrics;
    }finally{if(!committed){Workbench3D.disposeObject(source);Workbench3D.group=oldGroup;Workbench3D.signature=oldSignature;}}
  },
  cancel(){this.serial++;},
};
