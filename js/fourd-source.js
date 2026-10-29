/* Cancellable editor-source preparation. Existing builders run in bounded steps
 * against a private group; live globals are swapped only during synchronous calls. */
window.FourDSource = {
  serial: 0,
  async build(p, checkpoint, valid=()=>true, {deferFurniture=false}={}) {
    const serial=++this.serial,key=FourDWorkspace.geometryKey(p);
    if(!FourDWorkspace.sourceInvalid&&this.complete&&this.key===key&&this.group===Engine3D.buildingGroup){this.deferred=[];this.deferredInteriors=[];return;}
    const deferred=deferFurniture?p.elements.filter(e=>e.isFurniture||e.assetId).map(e=>e.id):[];
    const deferredInteriors=deferFurniture?WorkbenchModel.data(p).interiors.flatMap(l=>l.items.map(i=>i.id)):[];
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
      for(const e of p.elements.filter(e=>!deferred.includes(e.id))){step(()=>build3DRooms(S,I,H,real,{partial:true,ids:new Set([e.id]),noWalls:true}));await check();}
      for(const row of dependencies.rows){step(()=>PlanningDrawing.wall3D(S,I,H,[row]));await check();}
      for(const f of p.fixtures){step(()=>build3DFixtures(S,I,H,real,{ids:new Set([f.id])}));await check();}
      for(let floor=0;floor<p.floorCount;floor++){step(()=>build3DSlabs(S,I,H,real,{floors:new Set([floor])}));await check();}
      step(()=>DesignIO.add3D({roof:false}));await check();
      step(()=>build3DParapet(real));await check();
      step(()=>build3DBoundaries(S,unit,I,inW,inH));await check();
      const builder=Workbench3D.buildSteps({deferAssets:true,deferInteriors:deferFurniture});
      try {while(!step(()=>builder.next()).done)await check();}finally{builder.return();}
      await check();
      const generation=Workbench3D.generation,parent=source.children.find(n=>n.userData.workbench);
      for(const e of p.elements.filter(e=>e.assetId&&!deferred.includes(e.id))){
        const asset=WorkbenchModel.data(p).assets.find(a=>a.id===e.assetId);
        if(asset)await Workbench3D.placeAsset(asset,e,generation,parent,map,false);
        await check();
      }
      const previous=Engine3D.buildingGroup;
      Engine3D.buildingGroup=source;Engine3D.elementObjects=map;source.name='Architectural source';
      Engine3D.scene.add(source);previous?.parent?.remove(previous);if(previous)Workbench3D.disposeObject(previous);
      Engine3D.modelSignature='4d-source:'+serial;Engine3D.designSignature=null;
      Workbench3D.signature=null;this.group=source;this.key=key;this.deferred=deferred;this.deferredInteriors=deferredInteriors;this.complete=!deferred.length&&!deferredInteriors.length;FourDWorkspace.sourceInvalid=false;committed=true;
      metrics.totalMs=performance.now()-began;FourDWorkspace.metrics.source=metrics;
    }finally{if(!committed){Workbench3D.disposeObject(source);Workbench3D.group=oldGroup;Workbench3D.signature=oldSignature;}}
  },
  async furniture(p, checkpoint, valid=()=>true) {
    const ids=new Set(this.deferred||[]),interiors=new Set(this.deferredInteriors||[]);if(!ids.size&&!interiors.size)return;
    const source=new THREE.Group(),map=new Map(),{SCALE:S,I,WALL_HEIGHT:H}=get3DEnvironmentParams(),
      real=CanvasControlsEngine.isReal3D(),generation=Workbench3D.generation,started=performance.now();
    let stage,committed=false;
    const check=async()=>{await checkpoint();if(!valid())throw new DOMException('Furniture preparation cancelled','AbortError');};
    try {
      for(const e of p.elements.filter(e=>ids.has(e.id))){
        const live=Engine3D.buildingGroup,liveMap=Engine3D.elementObjects;
        Engine3D.buildingGroup=source;Engine3D.elementObjects=map;
        try{build3DRooms(S,I,H,real,{partial:true,ids:new Set([e.id]),noWalls:true});}
        finally{Engine3D.buildingGroup=live;Engine3D.elementObjects=liveMap;}
        const native=map.get(e.id);
        if(native)native.position.y+=(WorkbenchModel.roomBase(p,e)-e.floor*p.wallSettings.height)*S;
        const asset=WorkbenchModel.data(p).assets.find(a=>a.id===e.assetId);
        if(asset)await Workbench3D.placeAsset(asset,e,generation,source,map,false);
        await check();
      }
      if(interiors.size){
        const live=Engine3D.buildingGroup,liveMap=Engine3D.elementObjects,builder=Workbench3D.buildSteps({partial:true,ids:interiors,rooms:new Set(),deferAssets:true});
        try{for(;;){let result;Engine3D.buildingGroup=source;Engine3D.elementObjects=map;try{result=builder.next();}finally{Engine3D.buildingGroup=live;Engine3D.elementObjects=liveMap;}if(result.done)break;await check();}}finally{builder.return();}
      }
      stage=await Scene4D.stageAsync(Engine4D,source,p,check,{floors:new Set(),roof:false});
      await Engine4D.warmPrograms(check,stage.model);await check();
      for(const child of [...source.children])Engine3D.buildingGroup.add(child);
      for(const child of [...stage.model.children])Engine4D.model.add(child);
      for(const [id,node]of map)Engine3D.elementObjects.set(id,node);
      Engine4D.pairs.push(...stage.pairs.filter(([s])=>s!==source));
      for(const material of stage.materials)Engine4D.materials.add(material);
      StudioEnhancements.prepareModel({partial:true,pairs:stage.pairs,roomIds:ids});
      Scene4D.reconcile(Engine4D,stage.resources);
      Engine4D.geometryIssues.push(...stage.issues);Engine4D.modelTriangles=Scene4D.triangles(Engine4D.model);
      Engine4D.frameLighting();Engine4D.renderer.shadowMap.needsUpdate=true;
      FourDStudio.lodVersion=null;FourDStudio.outlineKey=null;FourDRender.probeDirty=true;
      this.deferred=[];this.deferredInteriors=[];this.complete=true;this.key=FourDWorkspace.geometryKey(p);
      FourDWorkspace.metrics.furnitureMs=performance.now()-started;committed=true;Engine3D.needsRender=true;
    }finally{if(!committed){if(stage)Scene4D.dispose({model:stage.model,materials:stage.materials,sceneResources:stage.resources});Workbench3D.disposeObject(source);}}
  },
  cancel(){this.serial++;},
};
