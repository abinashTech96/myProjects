module.exports=async({page,assert})=>{
 const original=await page.evaluate(()=>ProjectState.capture());
 const originalQuality=await page.evaluate(()=>FourDWorkspace.quality);
 await page.evaluate(()=>{
  const p=ProjectState.capture();ProjectState.apply({...p,plot:{...p.plot,inW:'600',inH:'480'},floorCount:2,currentFloor:0,
   elements:[{id:'new-a',type:'bedroom',x:20,y:20,w:180,h:180,floor:0},{id:'new-b',type:'bedroom',x:200,y:20,w:180,h:180,floor:0},{id:'new-upper',type:'bedroom',x:20,y:20,w:180,h:180,floor:1}],
   fixtures:[{id:'new-door',type:'door',roomId:0,edge:'right',offset:48,size:36,height:80,sill:0}],
   design:{...p.design,presentation:PresentationModel.defaults(),workbench:WorkbenchModel.defaults()}},{rebase:true});
  setWorkspaceLayout('4d');FourDWorkspace.setQuality('eco');
 });
 console.log('Presentation: gate');
 await page.locator('#fourd-start').click();
 await page.waitForFunction(()=>(FourDWorkspace.running&&!FourDWorkspace.starting)||document.body.dataset.fourdState==='error');
 assert.equal(await page.evaluate(()=>FourDWorkspace.running),true,await page.locator('#fourd-start-message').textContent());
 console.log('Presentation: renderer started');
 await page.evaluate(()=>{
  window.presentationKeep=Engine4D.pairs.find(([s])=>s.userData.elementId==='new-upper'&&s.parent===Engine3D.buildingGroup)[1];
  window.presentationBuilds=FourDWorkspace.metrics.builds;
  ProjectState.commit('Door offset',()=>{fixtures[0].offset=60;});
 });
 await page.waitForFunction(()=>FourDWorkspace.metrics.incremental>=1);
 assert.equal(await page.evaluate(()=>Engine4D.pairs.some(([,c])=>c===presentationKeep)),true);
 assert.equal(await page.evaluate(()=>FourDWorkspace.metrics.builds),1);
 console.log('Presentation: incremental door');
 await page.evaluate(()=>ProjectState.commit('Resize room',()=>{elements[1].w=192;}));
 await page.waitForFunction(()=>FourDWorkspace.metrics.incremental>=2);
 assert.equal(await page.evaluate(()=>Engine4D.pairs.some(([,c])=>c===presentationKeep)),true);
 const consistent=await page.evaluate(()=>{
  const rebuilt=Scene4D.stage(Engine4D,Engine3D.buildingGroup,ProjectState.capture());
  const actual=Engine4D.model.children.filter(n=>n.userData.isSlab).map(n=>new THREE.Box3().setFromObject(n).getSize(new THREE.Vector3()).toArray());
  const expected=rebuilt.model.children.filter(n=>n.userData.isSlab).map(n=>new THREE.Box3().setFromObject(n).getSize(new THREE.Vector3()).toArray());
  Scene4D.dispose({model:rebuilt.model,materials:rebuilt.materials,sceneResources:rebuilt.resources});return {actual:actual.sort(),expected:expected.sort()};
 });assert.deepEqual(consistent.actual,consistent.expected);
 await page.evaluate(()=>{StudioUI.select(0);FourDViews.focus();});
 await page.waitForFunction(()=>!Engine3D.cameraTween);
 assert.equal(await page.evaluate(()=>FourDViews.kind),'element');
 await page.evaluate(()=>FourDViews.floor(1));
 await page.waitForFunction(()=>!Engine3D.cameraTween);
 assert.equal(await page.evaluate(()=>ViewportUI.advancedFloor),1);
 await page.evaluate(()=>FourDViews.plot());
 await page.waitForFunction(()=>!Engine3D.cameraTween);
 assert.equal(await page.evaluate(()=>FourDViews.kind),'plot');
 await page.evaluate(()=>FourDViews.back());
 await page.waitForFunction(()=>!Engine3D.cameraTween);
 assert.equal(await page.evaluate(()=>FourDViews.kind),'floor');
 assert.equal(await page.evaluate(()=>FourDWorkspace.metrics.builds),1);
 console.log('Presentation: transitions and Back');
 // Rapid input is coalesced; undo/redo and deletion preserve coherent ownership.
 await page.evaluate(()=>{for(let n=0;n<12;n++)ProjectState.commit('Rapid door edit',()=>{fixtures[0].offset=60+n;});});
 await page.waitForFunction(()=>FourDIncremental.snapshot.project.fixtures[0].offset===71);
 const rapid=await page.evaluate(()=>({n:FourDWorkspace.metrics.incremental,keep:Engine4D.pairs.some(([,c])=>c===presentationKeep)}));
 assert.equal(rapid.keep,true);assert.ok(rapid.n<8,'Rapid input should be coalesced');
 await page.evaluate(()=>ProjectState.undo());await page.waitForFunction(()=>FourDIncremental.snapshot.project.fixtures[0].offset===70);
 await page.evaluate(()=>ProjectState.redo());await page.waitForFunction(()=>FourDIncremental.snapshot.project.fixtures[0].offset===71);
 await page.evaluate(()=>ProjectState.commit('Add structural member',()=>ProjectState.meta.design.workbench.structure.push({id:'new-column',kind:'column',floor:0,x:400,y:260,w:12,h:12,height:120})));
 await page.waitForFunction(()=>Engine4D.pairs.some(([s])=>s.userData.objectId==='new-column'));
 await page.evaluate(()=>ProjectState.commit('Add floor void',()=>ProjectState.meta.design.workbench.voids.push({id:'new-void',from:0,to:1,points:[{x:60,y:60},{x:90,y:60},{x:90,y:90},{x:60,y:90}]})));
 await page.waitForFunction(()=>Engine4D.pairs.some(([s])=>s.userData.fourdReplacement));
 assert.equal(await page.evaluate(()=>FourDWorkspace.metrics.builds),1,'Professional edits remain incremental');
 await page.evaluate(()=>ProjectState.commit('Remove floor void',()=>ProjectState.meta.design.workbench.voids=[]));
 await page.waitForFunction(()=>!Engine4D.pairs.some(([s])=>s.userData.fourdReplacement));
 await page.evaluate(()=>{window.presentationKeep=Engine4D.pairs.find(([s])=>s.userData.elementId==='new-upper'&&s.parent===Engine3D.buildingGroup)[1];});
 await page.evaluate(()=>ProjectState.commit('Remove room',()=>{elements.splice(1,1);}));
 await page.waitForFunction(()=>FourDIncremental.snapshot.project.elements.length===2);
 assert.equal(await page.evaluate(()=>FourDWorkspace.running),true,'Deletion cannot fail the renderer');
 assert.equal(await page.evaluate(()=>Engine4D.pairs.some(([s])=>s.userData.elementId==='new-b')),false);
 assert.equal(await page.evaluate(()=>Engine4D.pairs.some(([,c])=>c===presentationKeep)),true);
 // Keep source mesh-index metadata and generated ceilings aligned after deletion.
 assert.equal(await page.evaluate(()=>StudioEnhancements.ceilings.find(c=>c.userData.elementId==='new-upper').userData.roomIndex),1);
 assert.equal(await page.evaluate(()=>FourDWorkspace.materialKeys.has('new-b')),false,'Deleted owners leave the finish cache');
 // Repeated replacement must settle at a stable owned-buffer count.
 const beforeResources=await page.evaluate(()=>Engine4D.sceneResources.geometries.size);
 for(let i=0;i<6;i++) {
   await page.evaluate(n=>ProjectState.commit('Repeat opening edit',()=>fixtures[0].offset=50+n),i);
   await page.waitForFunction(n=>FourDIncremental.snapshot.project.fixtures[0].offset===50+n,i);
 }
 const afterResources=await page.evaluate(()=>Engine4D.sceneResources.geometries.size);
 assert.equal(afterResources,beforeResources,'Repeated opening edits cannot accumulate geometry');
 console.log('Presentation: coalescing, history, professional objects, voids, deletion and stable resources');
 await page.evaluate(()=>{FourDViews.floor(0);FourDViews.plot();FourDViews.focus();FourDViews.cancel('input');});
 assert.equal(await page.evaluate(()=>!!Engine3D.cameraTween||!!FourDViews.transition),false);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>FourDViews.floor(0));
 assert.equal(await page.evaluate(()=>!!Engine3D.cameraTween),false);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{FourDViews.tourPanel();document.getElementById('fourd-stop-name').value='Ground tour';FourDViews.saveStop();});
 assert.equal(await page.evaluate(()=>FourDStudio.settings.guidedStops.length),1);
 await page.evaluate(()=>{FourDViews.plot();});await page.waitForFunction(()=>!Engine3D.cameraTween);
 await page.evaluate(()=>{FourDViews.tourPanel();FourDViews.saveStop();FourDViews.playTour();});
 await page.waitForTimeout(150);await page.evaluate(()=>FourDViews.pauseTour());
 assert.equal(await page.evaluate(()=>FourDViews.tourPlaying||!!Engine3D.cameraTween||!!FourDViews.tourTimer),false);
 const saved=await page.evaluate(()=>ProjectModel.normalize(ProjectState.capture()).design.presentation.studio.guidedStops.length);assert.equal(saved,2);
 await page.evaluate(()=>{FourDViews.previewDay(8);Engine4D.render();});
 const morning=await page.evaluate(()=>Engine4D.key.position.toArray());
 await page.evaluate(()=>{FourDViews.previewDay(17);Engine4D.render();});
 assert.notDeepEqual(await page.evaluate(()=>Engine4D.key.position.toArray()),morning);
 await page.evaluate(()=>FourDViews.resetDaylight());
 await page.evaluate(()=>{StudioUI.select(0);FourDViews.materialCloseup('wall');});
 await page.waitForFunction(()=>!Engine3D.cameraTween);
 assert.equal(await page.evaluate(()=>FourDViews.materialMode),'wall');
 await page.evaluate(()=>FourDViews.back());await page.waitForFunction(()=>!Engine3D.cameraTween);
 assert.equal(await page.evaluate(()=>FourDViews.materialMode),false);
 console.log('Presentation: tour, daylight, close-up');
 // Obsolete staging results cannot overwrite newer edits.
 await page.evaluate(()=>{
   const stage=Scene4D.stageAsync;let once=true;
   Scene4D.stageAsync=async function(...args){if(once){once=false;await new Promise(r=>setTimeout(r,150));}return stage.apply(this,args);};
   window.presentationStage=stage;
   ProjectState.commit('Slow opening update',()=>fixtures[0].offset=80);
 });
 await page.waitForTimeout(85);
 await page.evaluate(()=>ProjectState.commit('Latest opening update',()=>fixtures[0].offset=90));
 await page.waitForFunction(()=>FourDIncremental.snapshot.project.fixtures[0].offset===90);
 await page.waitForTimeout(200);
 assert.equal(await page.evaluate(()=>FourDIncremental.snapshot.project.fixtures[0].offset),90);
 await page.evaluate(()=>{Scene4D.stageAsync=presentationStage;ProjectState.commit('Pitched roof',()=>{ProjectState.meta.design.roof.type='hip';});});
 await page.waitForFunction(()=>Engine4D.model.children.some(n=>n.userData.isRoof&&n.userData.presentationGenerated));
 assert.equal(await page.evaluate(()=>FourDWorkspace.metrics.builds),1,'Roof edits are incremental');
 await page.evaluate(()=>ProjectState.commit('Add floor',()=>{document.getElementById('b-floors').value='3';}));
 await page.waitForFunction(()=>FourDIncremental.snapshot?.project.floorCount===3&&!FourDWorkspace.structuralPending);
 assert.equal(await page.evaluate(()=>FourDWorkspace.metrics.fallbacks||0),0,'Empty floor addition uses dependency updates');
 assert.equal(await page.evaluate(()=>FourDWorkspace.running),true);
 console.log('Presentation: stale work cancelled; roof update and incremental floor-count update passed');
 await page.evaluate(()=>{
   const template=new THREE.Group();template.add(new THREE.Mesh(new THREE.BoxGeometry(10,10,10),new THREE.MeshStandardMaterial()));
   Workbench3D.templates.set('test-cached-asset',template);
   ProjectState.commit('Add cached imported furniture',()=>{
     ProjectState.meta.design.workbench.assets.push({id:'test-cached-asset',name:'Cached mesh',data:'data:model/gltf-binary;base64,AAAA',w:10,h:10,depth:10});
     elements.push({id:'test-cached-object',type:'bed',isFurniture:true,assetId:'test-cached-asset',x:50,y:50,w:30,h:30,customHeight:24,floor:0});
   });
 });
 await page.waitForFunction(()=>!FourDWorkspace.structuralPending&&Engine4D.pairs.some(([s])=>s.userData.elementId==='test-cached-object'&&s.userData.isFurniture));
 const assetBuilds=await page.evaluate(()=>FourDWorkspace.metrics.builds);
 await page.evaluate(()=>ProjectState.commit('Move cached imported furniture',()=>{elements.find(e=>e.id==='test-cached-object').x=85;}));
 await page.waitForFunction(()=>FourDIncremental.snapshot.project.elements.find(e=>e.id==='test-cached-object')?.x===85);
 const assetPosition=await page.evaluate(()=>{
   const s=Engine4D.pairs.find(([s])=>s.userData.elementId==='test-cached-object'&&s.userData.isFurniture)[0],{I,SCALE}=get3DEnvironmentParams();return {x:s.position.x,expected:I.x+100*SCALE};
 });
 assert.ok(Math.abs(assetPosition.x-assetPosition.expected)<.01);
 assert.equal(await page.evaluate(()=>FourDWorkspace.metrics.builds),assetBuilds,'Cached imported models move incrementally');
 console.log('Presentation: cached imported furniture retains its real mesh through local edits');
 await page.evaluate(()=>{FourDViews.playDaylight();FourDViews.playTour();FourDWorkspace.pause(true);});
 assert.equal(await page.evaluate(()=>!!FourDViews.transition||!!FourDViews.dayTimer||FourDViews.dayPlaying||FourDViews.tourPlaying),false);
 await page.evaluate(()=>FourDWorkspace.pause(false));
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('#fourd-breadcrumbs').isVisible(),true);
 const bounds=await page.locator('#fourd-breadcrumbs').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
 await page.evaluate(()=>setWorkspaceLayout('2d'));
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(p=>ProjectState.apply(p,{rebase:true}),original);
 await page.evaluate(value=>FourDWorkspace.setQuality(value),originalQuality);
 await page.evaluate(async()=>{StorageEngine.markDirty();await StorageEngine.saveToMemory();});
 console.log('4D local updates, transitions, breadcrumbs, daylight, tours and close-ups passed.');
};
