/* Versioned local structural updates. Staging never replaces the live editor
 * group across an await. The visible scene changes only at a checked commit. */
window.FourDIncremental = {
  revision: 0,
  reset() { this.revision++; this.snapshot = null; },
  describe(p) {
    const { presentation, roof, roomProperties, workbench, site, ...design } = p.design;
    const w=WorkbenchModel.data(p);
    const { walls, ...planning } = p.planning;
    const global = JSON.stringify({plot:p.plot,unit:p.unit,scale:p.scale,floors:p.floorCount,
      wallSettings:p.wallSettings,planning,design,levels:w.levels,facade:w.facade,site:w.site,parapet:p.view.parapetConfig,
      assets:[...Workbench3D.templates].map(([id,t])=>[id,t.uuid])});
    const rows = ProjectModel.walls(p), records = new Map();
    for (const e of p.elements) {
      const {material,customColor,...geometry}=e;
      records.set('room:'+e.id,JSON.stringify([geometry,roomProperties?.[e.id],WorkbenchModel.roomBase(p,e),
        w.stairs[e.id],w.voids.filter(v=>e.floor>v.from&&e.floor<=v.to),w.shafts.filter(v=>e.floor>=v.from&&e.floor<=v.to)]));
    }
    for (const w of rows) records.set('wall:'+w.id,JSON.stringify(w));
    for (const f of p.fixtures) {
      const owner=p.elements[f.roomId];
      records.set('opening:'+f.id,JSON.stringify([f,owner,WorkbenchModel.roomBase(p,owner)]));
    }
    for(const kind of ['structure','ramps','shafts','outdoors','services3d']) for(const object of w[kind])
      records.set('professional:'+object.id,JSON.stringify([kind,object]));
    for(const layout of w.interiors) for(const item of layout.items) {
      const owner=p.elements.find(e=>e.id===layout.room);
      records.set('professional:'+item.id,JSON.stringify([item,owner?.floor,owner&&WorkbenchModel.roomBase(p,owner)]));
    }
    records.set('professional:terrain',JSON.stringify(w.terrain));
    records.set('professional:solar',JSON.stringify([w.solar,w.solar.enabled?[roof,p.elements.filter(e=>!e.isFurniture)]:null]));
    records.set('professional:rain',JSON.stringify([w.rain,roof]));
    const floors=new Map();
    for(let f=0;f<p.floorCount;f++) floors.set(f,JSON.stringify([
      p.elements.filter(e=>e.floor===f&&!e.isFurniture).map(({material,customColor,...e})=>e),
      WorkbenchModel.slabGeometry(p,f),WorkbenchModel.floorBase(p,f),WorkbenchModel.floorHeight(p,f)]));
    const top=Math.max(-1,...p.elements.filter(e=>!e.isFurniture&&e.type!=='staircase').map(e=>e.floor));
    return {project:p,global,records,rows,floors,roof:JSON.stringify([roof,top,floors.get(top)])};
  },
  remember(p) { this.snapshot=this.describe(p); },
  sourceKey(node) {
    const d=node.userData;
    return d.fourdReplacement ? 'replacement:'+d.elementId : d.objectId ? 'professional:'+d.objectId : d.isTerrain ? 'professional:terrain' :
      d.isSlab ? 'slab:'+d.floor : d.isSolar ? 'professional:solar' : d.isGutter||d.isDownpipe ? 'professional:rain' :
      d.isWall ? 'wall:'+d.wallId : d.openingId ? 'opening:'+d.openingId :
      d.elementId&&!d.workbench ? 'room:'+d.elementId : null;
  },
  collect(build) {
    const live=Engine3D.buildingGroup, map=Engine3D.elementObjects;
    const staging=new THREE.Group();
    Engine3D.buildingGroup=staging; Engine3D.elementObjects=new Map();
    try { build(); }
    catch(error) {Workbench3D.disposeObject(staging);throw error;}
    finally {Engine3D.buildingGroup=live;Engine3D.elementObjects=map;}
    return staging;
  },
  async update(p, valid) {
    const began=performance.now(), revision=++this.revision, next=this.describe(p), before=this.snapshot;
    const check=async()=>{await new Promise(r=>setTimeout(r,0));if(revision!==this.revision||!valid())throw new DOMException('Superseded update','AbortError');};
    await check();
    // These changes alter shared coordinates or advanced builder dependencies.
    // Preserve the established full builders rather than display stale geometry.
    const w=WorkbenchModel.data(p);
    if(!before||FourDWorkspace.sourceInvalid||before.global!==next.global) return {fallback:true,next};
    const changed=new Set([...before.records.keys(),...next.records.keys()].filter(k=>before.records.get(k)!==next.records.get(k)));
    const floors=new Set([...next.floors.keys()].filter(f=>before.floors.get(f)!==next.floors.get(f))), roof=before.roof!==next.roof;
    if(!changed.size&&!floors.size&&!roof) {this.snapshot=next;return {changed:0};}
    const source=new THREE.Group(), {SCALE,I,WALL_HEIGHT}=get3DEnvironmentParams(), real=CanvasControlsEngine.isReal3D();
    let stage,committed=false;
    const roomIds=new Set([...changed].filter(k=>k.startsWith('room:')).map(k=>k.slice(5)));
    try {
      for(const key of changed) {
        if(!next.records.has(key)) continue;
        const id=key.slice(key.indexOf(':')+1), kind=key.split(':')[0];
        const part=this.collect(()=>{
          if(kind==='room') {
            build3DRooms(SCALE,I,WALL_HEIGHT,real,{ids:new Set([id]),partial:true,noWalls:true});
            const element=p.elements.find(e=>e.id===id),asset=w.assets.find(a=>a.id===element?.assetId);
            if(asset&&Workbench3D.templates.has(asset.id)) Workbench3D.placeAsset(asset,element,Workbench3D.generation,Engine3D.buildingGroup,Engine3D.elementObjects,false);
          }
          if(kind==='wall') PlanningDrawing.wall3D(SCALE,I,WALL_HEIGHT,next.rows.filter(w=>w.id===id));
          if(kind==='opening') build3DFixtures(SCALE,I,WALL_HEIGHT,real,{ids:new Set([id])});
          if(kind==='professional') Workbench3D.rebuild({partial:true,ids:new Set([id]),rooms:new Set()});
        });
        for(const wrapper of [...part.children]) if(wrapper.userData.workbench) {
          for(const child of [...wrapper.children]) part.add(child);part.remove(wrapper);
        }
        for(const child of [...part.children]) {
          const d=child.userData, e=p.elements[d.roomIndex];
          if(e&&!d.isWall&&!d.objectId&&!d.isFurniture) child.position.y+=(WorkbenchModel.roomBase(p,e)-e.floor*p.wallSettings.height)*SCALE;
          source.add(child);
        }
        await check();
      }
      for(const id of roomIds) {
        changed.add('replacement:'+id);
        const room=p.elements.find(e=>e.id===id);
        if(!room)continue;
        const part=this.collect(()=>Workbench3D.rebuild({partial:true,ids:new Set(),rooms:new Set([id])}));
        for(const wrapper of [...part.children]) for(const child of [...wrapper.children])source.add(child);
        const replacement=source.children.find(n=>n.userData.fourdReplacement&&n.userData.elementId===id), native=source.children.find(n=>n.userData.elementId===id&&!n.userData.fourdReplacement);
        if(replacement&&native?.children[0])native.children[0].visible=false;
        await check();
      }
      if(floors.size) {
        for(const f of floors)changed.add('slab:'+f);
        const part=this.collect(()=>build3DSlabs(SCALE,I,WALL_HEIGHT,real,{floors}));
        for(const child of [...part.children])source.add(child);
        await check();
      }
      stage=await Scene4D.stageAsync(Engine4D,source,p,check,{floors,roof});
      await check();
      Workbench3D.generation++;
      FourDViews.restoreReveal();
      FourDViews?.cancel('model-update');
      FourDStudio.restoreFilters();
      const removed=new Set();
      const candidates=[...Engine3D.buildingGroup.children];
      for(const group of candidates.filter(n=>n.userData.workbench))candidates.push(...group.children);
      for(const child of candidates) if(changed.has(this.sourceKey(child))) {
        child.traverse(n=>removed.add(n)); child.parent.remove(child);
      }
      const copies=new Set(Engine4D.pairs.filter(([s])=>removed.has(s)).map(([,c])=>c));
      for(const child of Engine4D.model.children) if(child.userData.presentationGenerated&&
        ((child.userData.isSlab&&floors.has(child.userData.floor))||(child.userData.isRoof&&roof))) child.traverse(n=>copies.add(n));
      StudioEnhancements.patchOwned(removed,roomIds);
      for(const copy of copies) copy.parent?.remove(copy);
      Engine4D.pairs=Engine4D.pairs.filter(([s,c])=>!removed.has(s)&&!copies.has(c));
      for(const child of [...source.children]) Engine3D.buildingGroup.add(child);
      for(const child of [...stage.model.children]) Engine4D.model.add(child);
      Engine4D.pairs.push(...stage.pairs.filter(([s])=>s!==source));
      for(const m of stage.materials) Engine4D.materials.add(m);
      const oldResources=Engine4D.sceneResources;
      const links=new Map([...(oldResources.textureLinks||[]),...stage.resources.textureLinks]);
      Engine4D.sceneResources={...oldResources,textureLinks:links,textureVersions:new Map([...(oldResources.textureVersions||[]),...stage.resources.textureVersions])};
      Engine3D.elementObjects=new Map(Engine3D.buildingGroup.children.filter(n=>n.userData.elementId&&!n.userData.isWall&&!n.userData.fourdReplacement).map(n=>[n.userData.elementId,n]));
      // Index changes are metadata updates, not geometry invalidations.
      const index=new Map(p.elements.map((e,i)=>[e.id,i]));
      Engine4D.model.traverse(n=>{if(n.userData.elementId&&index.has(n.userData.elementId))n.userData.roomIndex=index.get(n.userData.elementId);});
      for(const [s,c] of Engine4D.pairs) for(const n of [s,c]) if(n.userData.elementId&&index.has(n.userData.elementId)) n.userData.roomIndex=index.get(n.userData.elementId);
      StudioEnhancements.prepareModel({partial:true,pairs:stage.pairs,roomIds});
      Scene4D.reconcile(Engine4D,stage.resources);
      for(const n of removed) if(!n.parent||!removed.has(n.parent)) Workbench3D.disposeObject(n);
      Engine3D.modelSignature='4d-incremental:'+revision;
      Engine4D.modelVersion=Engine3D.modelSignature+'|'+Workbench3D.generation;
      Engine4D.modelBounds=new THREE.Box3().setFromObject(Engine4D.model);
      Engine4D.modelTriangles=Scene4D.triangles(Engine4D.model);
      FourDStudio.lodVersion=null;FourDStudio.outlineKey=null;FourDRender.probeDirty=true;
      FourDRender.cancelPhoto();
      // Ancillary garden failures must not discard a valid committed building.
      if(floors.size||[...changed].some(k=>k.startsWith("opening:")||k.startsWith("professional:"))) {
        try {Landscape4D.build(Engine4D);} catch(error) {Landscape4D.dispose(Engine4D);Engine4D.geometryIssues.push({element:'Garden',reason:error.message});}
      }
      Engine4D.frameLighting();
      Engine4D.renderer.shadowMap.needsUpdate=true;
      this.snapshot=next;committed=true;
      const result={changed:changed.size,floors:floors.size,roof,ms:performance.now()-began};
      FourDWorkspace.metrics.incremental=(FourDWorkspace.metrics.incremental||0)+1;
      FourDWorkspace.metrics.lastUpdate=result;
      return result;
    } finally {
      if(!committed) {
        if(stage) Scene4D.dispose({model:stage.model,materials:stage.materials,sceneResources:stage.resources});
        Workbench3D.disposeObject(source);
      }
    }
  },
};
