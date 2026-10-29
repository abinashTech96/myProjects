const fs=require('node:fs'),path=require('node:path'),visual=require('./visual-metrics.cjs'),fixtures=require('./presentation-fixtures.cjs');
module.exports=async({page,assert})=>{
 const original=await page.evaluate(()=>({project:ProjectState.capture(),quality:FourDWorkspace.quality,landscape:localStorage.getItem('ArchCAD_4D_Landscape'),navigation:FourDWorkspace.navigationDetail,adaptive:StudioEnhancements.adaptive,motion:localStorage.getItem('ArchCAD_4D_Motion')}));
 const load=async kind=>page.evaluate(raw=>{if(StudioUI.mode==='4d')FourDWorkspace.stop();setWorkspaceLayout('2d');const p=ProjectModel.normalize(raw);p.design.presentation.studio.lod='full';ProjectState.apply(p,{rebase:true});StudioEnhancements.theme('graphite',false);StudioEnhancements.adaptive=true;setWorkspaceLayout('4d');FourDWorkspace.sourceInvalid=true;FourDWorkspace.setQuality('eco');FourDWorkspace.setNavigationDetail(true);},fixtures.design(kind));
 try{
  await load('furnished');
  await page.evaluate(()=>{
   const checkpoint=FourDWorkspace.checkpoint;window.progressiveCheckpoint=checkpoint;
   FourDWorkspace.checkpoint=async function(message,token){if(message==='Adding furniture…'){
    window.coreObservation={running:this.running,starting:this.starting,furniture:Engine4D.pairs.filter(([s])=>elements[s.userData.roomIndex]?.isFurniture).length,interiors:Engine4D.pairs.filter(([s])=>s.userData.objectId==='fitout-counter').length,garden:!!Engine4D.landscape,details:!!window.FourDDetails?.details,frames:Engine4D.frames};await new Promise(resolve=>window.releaseFurniture=resolve);
   }return checkpoint.call(this,message,token);};window.progressiveStart=FourDWorkspace.start();
  });
  await page.waitForFunction(()=>window.coreObservation);const core=await page.evaluate(()=>coreObservation);
  assert.equal(core.running,true);assert.equal(core.starting,true);assert.equal(core.furniture,0);assert.equal(core.interiors,0);assert.equal(core.garden,false);assert.equal(core.details,false);assert.ok(core.frames>0);
  assert.equal(await page.locator('#fourd-start-card').isVisible(),false,'The visible core has no blocking loading card');
  await page.getByRole('button',{name:'Full view',exact:true}).click();await page.evaluate(()=>{FourDWorkspace.checkpoint=progressiveCheckpoint;releaseFurniture();});await page.evaluate(()=>progressiveStart);
  assert.equal(await page.evaluate(()=>FourDWorkspace.running&&!FourDWorkspace.starting),true,await page.locator('#fourd-start-message').textContent());
  assert.equal(await page.evaluate(()=>new Set(Engine4D.pairs.filter(([s])=>elements[s.userData.roomIndex]?.isFurniture).map(([s])=>s.userData.elementId)).size),60);
  assert.ok(await page.evaluate(()=>Engine4D.pairs.some(([s])=>s.userData.objectId==='fitout-counter')));
  assert.ok(await page.evaluate(()=>FourDWorkspace.metrics.fullReadyMs>FourDWorkspace.metrics.firstFrameMs));assert.equal(await page.locator('#fourd-preparation-status').isVisible(),false);
  const stable=await page.evaluate(()=>JSON.stringify(ProjectState.capture()));
  const navigation=await page.evaluate(()=>{
   FourDViews.motion='off';FourDViews.floor(0);StudioEnhancements.navigating=false;Engine4D.render();const settled={calls:Engine4D.renderer.info.render.calls,triangles:Engine4D.renderer.info.render.triangles};
   StudioEnhancements.navigating=true;Engine4D.render();const moving={calls:Engine4D.renderer.info.render.calls,triangles:Engine4D.renderer.info.render.triangles,count:FourDStudio.navigationCount};
   const proxy=FourDStudio.lods.find(l=>l.proxy.visible);let picked=false;if(proxy){const center=proxy.proxy.position.clone().project(Engine4D.camera),rect=Engine3D.renderer.domElement.getBoundingClientRect(),hit=StudioEnhancements.hit({clientX:rect.x+(center.x+1)*rect.width/2,clientY:rect.y+(1-center.y)*rect.height/2});picked=!!hit?.object.userData.elementId;}
   StudioEnhancements.navigating=false;Engine4D.render();return {settled,moving,picked,restored:FourDStudio.lods.every(l=>!l.proxy.visible),after:Engine4D.renderer.info.render.calls};
  });
  assert.ok(navigation.moving.count>0);assert.ok(navigation.moving.calls<navigation.settled.calls,'Movement reduces actual draw calls');assert.ok(navigation.moving.triangles<navigation.settled.triangles);assert.equal(navigation.restored,true);assert.equal(navigation.after,navigation.settled.calls);assert.equal(navigation.picked,true,'Proxy remains selectable');assert.equal(await page.evaluate(()=>JSON.stringify(ProjectState.capture())),stable);
  console.log('Progressive: visible core, sixty furnished placements, reduced movement draw calls and restored detail passed');
  await page.evaluate(()=>ProjectState.commit('Unsaved room name',()=>elements[0].customName='Keep my unsaved edit'));
  await page.waitForFunction(()=>!FourDWorkspace.structuralPending&&FourDIncremental.snapshot?.project.elements[0].customName==='Keep my unsaved edit');
  const recovery=await page.evaluate(()=>{
   FourDViews.motion='off';FourDViews.floor(1);StudioUI.select(elements.findIndex(e=>e.id==='storey-1'));FourDViews.focus();FourDWorkspace.setAnnotations('selected');FourDWorkspace.showDimensions(true);Engine4D.render();
   const before={session:FourDSession.capture(),project:JSON.stringify(ProjectState.capture()),history:ProjectState.history.stack.length};Engine4D.renderer.domElement.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));return before;
  });
  assert.equal(await page.evaluate(()=>Engine4D.state),'context-lost');await page.evaluate(()=>Engine4D.renderer.domElement.dispatchEvent(new Event('webglcontextrestored')));await page.evaluate(()=>FourDWorkspace.startPromise);
  assert.equal(await page.evaluate(()=>FourDWorkspace.running),true,await page.locator('#fourd-start-message').textContent());
  const restored=await page.evaluate(()=>({session:FourDSession.capture(),project:JSON.stringify(ProjectState.capture()),history:ProjectState.history.stack.length}));assert.equal(restored.project,recovery.project);assert.equal(restored.history,recovery.history);
  for(const key of ['kind','floor','element','projection','focus','explosion'])assert.deepEqual(restored.session.pose[key],recovery.session.pose[key],key);
  for(const key of ['position','target'])for(let i=0;i<3;i++)assert.ok(Math.abs(restored.session.pose[key][i]-recovery.session.pose[key][i])<1e-6,'Recovery restores '+key);
  for(const key of ['selected','selection','annotations','dimensions','history'])assert.deepEqual(restored.session[key],recovery.session[key],key);
  console.log('Recovery: context loss preserves camera, floor, selection, annotations, unsaved edits and undo history');
  const profile=await page.evaluate(async()=>{FourDViews.motion='off';await FourDPerformance.run();return FourDPerformance.run();});assert.equal(profile.version,2);assert.equal(profile.design.furniture,60);assert.ok(profile.startup.fullReadyMs>=profile.startup.firstFrameMs);assert.ok(profile.comparison);assert.ok(profile.steps.every(s=>s.drawCalls>1&&Number.isFinite(s.movingDrawCalls)));
  await page.evaluate(()=>ProjectState.commit('Review a near-corner door',()=>fixtures.push({id:'reveal-check',roomId:0,type:'door',edge:'top',offset:1,size:36,sill:0,height:84})));
  await page.waitForFunction(()=>!FourDWorkspace.structuralPending&&FourDIncremental.snapshot?.project.fixtures.some(f=>f.id==='reveal-check'));await page.evaluate(()=>{FourDReview.panel('audit');FourDReview.audit();});await page.getByRole('combobox',{name:'Inspection category'}).selectOption('openings');await page.getByRole('button',{name:/Opening is close to a wall end/}).click();
  const closeup=await page.evaluate(()=>{Engine4D.render();const {SCALE:S,I}=get3DEnvironmentParams(),point=new THREE.Vector3(I.x+89*S,42*S,I.z+70*S).project(Engine4D.camera),rect=Engine3D.renderer.domElement.getBoundingClientRect(),area=WorkspaceLayout.usableArea();return {kind:FourDViews.kind,selected:elements[selectedElIndex]?.id,pixel:[(point.x+1)*rect.width/2,(1-point.y)*rect.height/2],center:[area.left+area.width/2,area.top+area.height/2]};});
  assert.equal(closeup.kind,'element');assert.equal(closeup.selected,'storey-0');assert.ok(closeup.pixel.every((v,i)=>Math.abs(v-closeup.center[i])<2),'Actual jamb is framed '+JSON.stringify(closeup));console.log('Device reports and categorized architectural close-up passed');
  await load('furnished');
  await page.evaluate(()=>{window.coreObservation=null;const original=FourDWorkspace.checkpoint;window.progressiveCheckpoint=original;FourDWorkspace.checkpoint=async function(message,token){if(message==='Adding furniture…'){window.coreObservation=true;await new Promise(r=>window.releaseFurniture=r);}return original.call(this,message,token);};window.progressiveStart=FourDWorkspace.start();});
  await page.waitForFunction(()=>window.coreObservation);await page.evaluate(()=>{FourDWorkspace.stop();FourDWorkspace.checkpoint=progressiveCheckpoint;releaseFurniture();});await page.evaluate(()=>progressiveStart);assert.equal(await page.evaluate(()=>!!Engine4D.renderer||FourDWorkspace.running||FourDWorkspace.starting),false);await page.evaluate(()=>FourDWorkspace.start());assert.equal(await page.evaluate(()=>FourDSource.complete&&FourDWorkspace.running),true);console.log('Progressive: cancellation and fresh reentry reject stale enrichment');
  const baselinePath=path.join(__dirname,'baselines','expanded-views.json'),actual={version:1,views:{}};
  for(const kind of ['irregular','courtyard','multistorey','furnished']){
   await load(kind);await page.evaluate(()=>FourDWorkspace.start());assert.equal(await page.evaluate(()=>FourDWorkspace.running),true,kind+': '+await page.locator('#fourd-start-message').textContent());
   const captured=await page.evaluate(kind=>{
    const before=JSON.stringify(ProjectState.capture());FourDViews.motion='off';FourDViews.building(false);Engine4D.toggleLandscape(false);StudioEnhancements.labels='none';if(kind==='furnished')FourDViews.floor(0);Engine4D.setPreset('daylight',false);FourDStudio.settings.environment='studio';StudioEnhancements.navigating=false;Engine4D.render();
    const camera=Engine3D.camera.clone(),box=kind==='furnished'?FourDViews.modelBox(0):Engine4D.modelBounds,center=box.getCenter(new THREE.Vector3()),radius=Math.max(40,box.getSize(new THREE.Vector3()).length()/2),direction=new THREE.Vector3(...(kind==='courtyard'?[.3,1,.5]:kind==='furnished'?[.1,1,.2]:[1,.8,1])).normalize();camera.fov=50;camera.aspect=256/192;camera.zoom=1;camera.near=.1;camera.far=10000;camera.position.copy(center).addScaledVector(direction,radius*2.8);camera.lookAt(center);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
    const r=Engine4D.renderer,previous=r.getRenderTarget(),target=new THREE.WebGLRenderTarget(256,192),rgba=new Uint8Array(256*192*4);try{r.setRenderTarget(target);r.render(Engine4D.scene,camera);r.readRenderTargetPixels(target,0,0,256,192,rgba);}finally{r.setRenderTarget(previous);target.dispose();}
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=192;const ctx=canvas.getContext('2d'),image=ctx.createImageData(256,192);for(let y=0;y<192;y++)image.data.set(rgba.subarray((191-y)*256*4,(192-y)*256*4),y*256*4);ctx.putImageData(image,0,0);return {rgba:Array.from(rgba),png:canvas.toDataURL('image/png'),unchanged:JSON.stringify(ProjectState.capture())===before};
   },kind);assert.equal(captured.unchanged,true);actual.views[kind]=visual.signature(captured.rgba,256,192);fs.writeFileSync('/tmp/archcad-expanded-'+kind+'.png',Buffer.from(captured.png.split(',')[1],'base64'));
  }
  if(process.env.UPDATE_VISUAL_BASELINES==='1'){fs.writeFileSync(baselinePath,JSON.stringify(actual,null,2)+'\n');for(const kind of Object.keys(actual.views))fs.copyFileSync('/tmp/archcad-expanded-'+kind+'.png',path.join(__dirname,'baselines','expanded-'+kind+'.png'));}
  const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));for(const [kind,signature]of Object.entries(actual.views)){const diff=visual.difference(signature,baseline.views[kind]);assert.ok(diff.coverage<.05&&diff.luma<.06&&diff.maxCoverage<.65,kind+' regression '+JSON.stringify(diff));}console.log('Expanded visual references: irregular plot, courtyard, three storeys and sixty furniture placements passed');
 }finally{
  await page.evaluate(original=>{if(window.progressiveCheckpoint)FourDWorkspace.checkpoint=progressiveCheckpoint;FourDWorkspace.stop();setWorkspaceLayout('2d');ProjectState.apply(original.project,{rebase:true});FourDWorkspace.setQuality(original.quality);FourDWorkspace.setNavigationDetail(original.navigation);StudioEnhancements.adaptive=original.adaptive;if(original.landscape===null)localStorage.removeItem('ArchCAD_4D_Landscape');else localStorage.setItem('ArchCAD_4D_Landscape',original.landscape);if(original.motion===null)localStorage.removeItem('ArchCAD_4D_Motion');else localStorage.setItem('ArchCAD_4D_Motion',original.motion);},original);
 }
};
