/* Regression coverage for the reproduced audit defects and the manual 4D gate. */
module.exports=async({page,assert})=>{
 const original=await page.evaluate(()=>ProjectState.capture()), quality=await page.evaluate(()=>FourDWorkspace.quality);
 const deferred=['landscape4d','fourd-geometry','fourd-source','scene4d','fourd-textures','fourd-scene','fourd-render','fourd-details','fourd-performance','fourd-session'];
 assert.deepEqual(await page.evaluate(names=>names.filter(name=>performance.getEntriesByType('resource').some(e=>e.name.endsWith('/js/'+name+'.js'))),deferred),[],'No heavy 4D source downloads at startup');
 const cached=await page.evaluate(async names=>{
  if(!navigator.serviceWorker)return [];
  await navigator.serviceWorker.ready;
  const urls=(await Promise.all((await caches.keys()).map(async key=>(await (await caches.open(key)).keys()).map(r=>r.url)))).flat();
  return names.filter(name=>urls.some(url=>url.endsWith('/js/'+name+'.js')));
 },deferred);assert.deepEqual(cached,[],'Offline installation does not prefetch the gated runtime');
 await page.evaluate(()=>{const p=ProjectState.capture();p.elements=[{id:'audit-room',type:'bedroom',x:20,y:20,w:240,h:180,floor:0}];p.fixtures=[];p.floorCount=1;p.currentFloor=0;p.plot={...p.plot,inW:'600',inH:'480'};p.design=DesignModel.defaults();p.planning=PlanningModel.defaults();p.view={parapet:'slim-pickets',parapetConfig:ParapetModel.config({},'slim-pickets')};p.design.roof={...p.design.roof,type:'gable',rise:24,overhang:12};ProjectState.apply(p,{rebase:true});setWorkspaceLayout('3d');});
 const roof3d=await page.evaluate(()=>{generate3DModel();const group=new THREE.Group();Engine3D.buildingGroup.traverse(n=>{if(n.userData.isRoof&&n.isMesh){n.updateWorldMatrix(true,false);const copy=n.clone(false);copy.matrix.copy(n.matrixWorld);copy.matrixAutoUpdate=false;group.add(copy);}});const size=new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());return size.x/get3DEnvironmentParams().SCALE;});
 assert.ok(Math.abs(roof3d-264)<.01,'3D roof follows room and overhang, not plot');
 const drawing=await page.evaluate(()=>{const svg=DesignIO.projectedElevation(ProjectState.capture(),'front');const doc=new DOMParser().parseFromString(svg,'image/svg+xml');return [...doc.querySelectorAll('[data-roof]')].flatMap(n=>n.getAttribute('points').split(' ').map(q=>+q.split(',')[0]));});
 assert.equal(Math.max(...drawing)-Math.min(...drawing),264,'Drawing shares the same roof extent');
 await page.evaluate(()=>{setWorkspaceLayout('4d');FourDWorkspace.setQuality('eco');});
 assert.equal(await page.evaluate(()=>!!window.Scene4D||!!FourDJobs.worker||!!Engine4D.renderer),false,'Entering portal leaves implementation, worker and GPU asleep');
 await page.evaluate(()=>{const append=document.head.append;document.head.append=function(...nodes){if(nodes.some(n=>n.src?.endsWith('/js/scene4d.js'))){document.head.append=append;setTimeout(()=>nodes[0].onerror(),0);return;}return append.apply(this,nodes);};});
 await page.evaluate(()=>FourDWorkspace.start());
 assert.equal(await page.evaluate(()=>document.body.dataset.fourdState),'error','A missing runtime module is recoverable');
 await page.evaluate(()=>FourDWorkspace.start());assert.equal(await page.evaluate(()=>FourDWorkspace.running),true,await page.locator('#fourd-start-message').textContent());
 assert.deepEqual(await page.evaluate(()=>[...FourDRuntime.loaded]),deferred,'Retry resumes successful modules without duplicate execution');
 const roof4d=await page.evaluate(()=>new THREE.Box3().setFromObject(Engine4D.model.children.find(n=>n.userData.isRoof)).getSize(new THREE.Vector3()).x/get3DEnvironmentParams().SCALE);
 assert.ok(Math.abs(roof3d-roof4d)<.01,'Editor and presentation roof extents match');
 if(process.env.CAPTURE_RELIABILITY)await page.screenshot({path:'/tmp/archcad-reliability-4d.png'});
 await page.waitForFunction(()=>FourDIncremental.snapshot);
 const dimensionKey=await page.evaluate(()=>JSON.stringify({plot:ProjectState.capture().plot,elements:elements}));
 const instances=await page.evaluate(()=>{window.auditOld=[];window.auditReleased=0;Engine4D.model.traverse(n=>{if(n.isInstancedMesh){auditOld.push(n);n.addEventListener('dispose',()=>auditReleased++);}});return auditOld.length;});assert.ok(instances>0);
 await page.evaluate(()=>ProjectState.commit('Adjust parapet height',()=>ParapetModule.config.defaults.height=37));
 await page.waitForFunction(()=>FourDIncremental.snapshot?.project.view.parapetConfig?.defaults.height===37&&!FourDWorkspace.structuralPending);
 const released=await page.evaluate(()=>{const live=new Set();Engine4D.model.traverse(n=>live.add(n));return {removed:auditOld.filter(n=>!live.has(n)).length,released:auditReleased};});assert.equal(released.released,released.removed);assert.ok(released.removed>0);
 assert.equal(await page.evaluate(()=>JSON.stringify({plot:ProjectState.capture().plot,elements:elements})),dimensionKey,'Rendering and finish edits preserve plot and room geometry');
 await page.evaluate(()=>{FourDWorkspace.stop();setWorkspaceLayout('2d');});
 const finishes=await page.evaluate(()=>['brick','tile','concrete'].map(type=>getProceduralTexture(type).image.toDataURL()));assert.equal(new Set(finishes).size,3,'Masonry, terracotta and concrete have distinct textures');
 await page.evaluate(()=>StudioUI.floorMenu());assert.equal(await page.getByRole('button',{name:'Parapet studio',exact:true}).count(),1);await page.evaluate(()=>WorkspacePanels.close());
 assert.deepEqual(await page.evaluate(()=>{StudioUI.viewToolsDialog();const a=document.getElementById('studio-dialog').dataset.docked;WorkspacePanels.close();WorkspacePanels.intent='Tools';StudioUI.viewToolsDialog();const b=document.getElementById('studio-dialog').dataset.docked;WorkspacePanels.close();StudioUI.dialog('Explicit modal','<p>Review</p>',{presentation:'modal'});const c=document.getElementById('studio-dialog').dataset.docked;document.getElementById('studio-dialog').close();return [a,b,c];}),['true','true','false']);
 const payload=await page.evaluate(()=>{const p=ProjectState.capture();p.design.workbench.assets=[{id:'binary',data:'data:model/gltf-binary;base64,'+'A'.repeat(100000),w:10,h:10,depth:10}];p.planning.underlays=[{data:'data:image/png;base64,AAAA',x:1}];p.design.presentation.studio.hdr='binaryHDR';const out=FourDJobs.geometrySnapshot(p);return {stripped:!out.design.workbench.assets[0].data&&!out.planning.underlays[0].data&&!out.design.presentation.studio.hdr,sourceKept:!!p.design.workbench.assets[0].data};});assert.deepEqual(payload,{stripped:true,sourceKept:true});
 const merged=await page.evaluate(()=>{const base=ProjectState.capture();base.view={parapet:'standard'};const normalized=ProjectModel.normalize(base),local=ProjectModel.clone(normalized),remote=ProjectModel.clone(normalized);local.view.parapet='slim-pickets';local.view.parapetConfig=ParapetModel.config({},'slim-pickets');remote.elements[0].customName='Remote name';ProjectState.apply(local,{rebase:true});DesignSync.localBase=JSON.stringify(normalized);DesignSync.conflict={project:remote,revision:2};StudioUI.dialog('Merge','');DesignSync.mergeConflict();return {style:ProjectState.capture().view.parapetConfig.defaults.style,name:elements[0].customName};});assert.deepEqual(merged,{style:'slim-pickets',name:'Remote name'});
 const conflict=await page.evaluate(()=>{const base=ProjectState.capture(),remote=ProjectModel.clone(base);DesignSync.localBase=JSON.stringify(base);remote.view.parapetConfig.defaults.height=40;ParapetModule.config.defaults.height=45;DesignSync.conflict={project:remote,revision:3};DesignSync.mergeConflict();return {unresolved:!!DesignSync.conflict,height:ParapetModule.config.defaults.height};});assert.deepEqual(conflict,{unresolved:true,height:45});
 await page.evaluate(()=>{DesignSync.conflict=null;DesignSync.localBase=null;});
 for(const rot of [0,90,180,270]){
  const bounds=await page.evaluate(async rot=>{const p=ProjectState.capture(),asset={id:'audit-cube',name:'Cube',data:'data:model/gltf-binary;base64,AAAA',w:60,h:36,depth:80};p.design=DesignModel.defaults();p.design.workbench.assets=[asset];p.elements=[{id:'asset',type:'bed',isFurniture:true,x:100,y:100,w:60,h:80,floor:0,rot,customHeight:36,assetId:asset.id}];p.fixtures=[];p.view={parapet:'none'};ProjectState.apply(p,{rebase:true});const template=new THREE.Group();template.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()));Workbench3D.templates.set(asset.id,template);const parent=new THREE.Group();await Workbench3D.placeAsset(asset,elements[0],Workbench3D.generation,parent,new Map(),false);const b=new THREE.Box3().setFromObject(parent),{SCALE:S,I}=get3DEnvironmentParams(),expected=PresentationModel.bounds(elements[0]);const actual={x:(b.min.x-I.x)/S,y:(b.min.z-I.z)/S,w:(b.max.x-b.min.x)/S,h:(b.max.z-b.min.z)/S};Workbench3D.disposeObject(parent);Workbench3D.disposeObject(template);Workbench3D.templates.delete(asset.id);return {expected,actual};},rot);
  for(const key of ['x','y','w','h'])assert.ok(Math.abs(bounds.expected[key]-bounds.actual[key])<.001,rot+'° imported '+key);
 }
 await page.evaluate(()=>{StudioEnhancements.theme('limestone');return StorageEngine.saveToMemory();});
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>StudioUI.ready&&!StorageEngine.loading);
 assert.deepEqual(await page.evaluate(()=>({theme:document.body.dataset.uiTheme,preset:Engine4D.preset,environment:FourDStudio.settings.environment})),{theme:'limestone',preset:'golden-hour',environment:'golden-hour'});
 await page.evaluate(()=>Engine4D.setPreset('interior'));
 assert.equal(await page.evaluate(()=>ProjectState.capture().design.presentation.studio.preset),'interior');
 await page.evaluate(()=>ProjectState.undo());assert.equal(await page.evaluate(()=>Engine4D.preset),'golden-hour');
 await page.evaluate(()=>ProjectState.redo());assert.equal(await page.evaluate(()=>Engine4D.preset),'interior');
 await page.evaluate(()=>{ProjectState.commit('Saved project environment',()=>FourDStudio.settings.environment='night');return StorageEngine.saveToMemory();});
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>StudioUI.ready&&!StorageEngine.loading);
 assert.deepEqual(await page.evaluate(()=>({theme:document.body.dataset.uiTheme,preset:Engine4D.preset,environment:FourDStudio.settings.environment})),{theme:'limestone',preset:'interior',environment:'night'},'Device UI theme preserves the imported/saved rendering style');
 const recovered=await page.evaluate(async()=>{const p=ProjectState.capture();p.name='Valid independent backup';await StorageEngine.write('latest_session',p);localStorage.setItem('ArchCAD_AutoSave','{broken-json');await StorageEngine.loadFromMemory();localStorage.removeItem('ArchCAD_AutoSave');return {name:ProjectState.meta.name,error:StorageEngine.error};});assert.deepEqual(recovered,{name:'Valid independent backup',error:''});
 await page.evaluate(({original,quality})=>{setWorkspaceLayout('2d');ProjectState.apply(original,{rebase:true});FourDWorkspace.setQuality(quality);StudioEnhancements.theme('graphite');StorageEngine.markDirty();return StorageEngine.saveToMemory();},{original,quality});
 console.log('Reliability: shared roof, recovery, instance disposal, GLB rotation, finishes, presets, panel routing, merge conflicts, lazy retry and worker payloads passed');
};
