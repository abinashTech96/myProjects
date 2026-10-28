module.exports=async({page,assert})=>{
 const original=await page.evaluate(()=>ProjectState.capture()),quality=await page.evaluate(()=>FourDWorkspace.quality);
 await page.evaluate(()=>{
  const p=ProjectState.capture();ProjectState.apply({...p,plot:{...p.plot,inW:'600',inH:'480'},floorCount:2,currentFloor:0,
   elements:[{id:'review-a',type:'bedroom',x:20,y:20,w:180,h:180,floor:0},{id:'review-b',type:'bedroom',x:200,y:20,w:180,h:180,floor:0},{id:'review-upper',type:'bedroom',x:20,y:20,w:180,h:180,floor:1},{id:'review-bed',type:'bed',isFurniture:true,x:50,y:60,w:60,h:80,customHeight:40,floor:0}],
   fixtures:[{id:'review-door',type:'door',roomId:0,edge:'right',offset:48,size:36,height:80,sill:0}],design:{...p.design,presentation:PresentationModel.defaults(),workbench:WorkbenchModel.defaults()}},{rebase:true});
  setWorkspaceLayout('4d');FourDWorkspace.setQuality('eco');FourDViews.setMotion('off');
 });
 assert.equal(await page.evaluate(()=>!!FourDJobs.worker),false,'Opening portal does not start CPU worker');
 await page.locator('#fourd-start').click();await page.waitForFunction(()=>FourDWorkspace.running||document.body.dataset.fourdState==='error');
 assert.equal(await page.evaluate(()=>FourDWorkspace.running),true,await page.locator('#fourd-start-message').textContent());
 assert.equal(await page.evaluate(()=>Engine4D.ao.normalRenderTarget.depthTexture.type!==THREE.UnsignedShortType),true,'Architectural AO uses sufficient depth precision');
 await page.waitForFunction(()=>!!FourDIncremental.snapshot);
 assert.ok(await page.evaluate(()=>FourDJobs.stats.completed)>0,'Geometry calculations execute in worker');
 const saved=await page.evaluate(()=>JSON.stringify(ProjectState.capture().elements));
 await page.evaluate(()=>{StudioUI.select(0);FourDViews.focus();FourDReview.panel();});
 assert.ok((await page.locator('[data-review-tab="context"]').textContent()).includes('Room finishes'));
 await page.evaluate(()=>FourDViews.floor(0));assert.ok((await page.locator('[data-review-tab="context"]').textContent()).includes('Floor cutaway'));
 await page.evaluate(()=>FourDViews.plot());assert.ok((await page.locator('[data-review-tab="context"]').textContent()).includes('Garden & sunlight'));
 await page.evaluate(()=>{FourDReview.panel('lights');document.getElementById('review-light-type').value='wall';document.getElementById('review-light-yaw').value='90';FourDReview.addLight();});
 assert.equal(await page.evaluate(()=>FourDStudio.settings.fixtures.length),1);
 await page.evaluate(()=>{FourDReview.editLight(0,'temperature',4500);Engine4D.render();});
 assert.equal(await page.evaluate(()=>FourDStudio.settings.fixtures[0].temperature),4500);
 assert.equal(await page.evaluate(()=>FourDDetails.fixtureGroup.children.filter(n=>n.isLight&&n.visible).length),1);
 await page.evaluate(()=>{StudioUI.select(0);Selection.ids.add('review-b');FourDReview.panel('materials');FourDReview.align();});
 await page.waitForTimeout(200);await page.evaluate(()=>Engine4D.render());
 assert.deepEqual(await page.evaluate(()=>ProjectState.capture().design.presentation.surfaces['review-b'].floor.origin),[0,0]);
 const seam=await page.evaluate(()=>{
  const nodes=[];Engine4D.model.traverse(n=>{if(n.isMesh&&n.userData.presentationSurface==='floor'&&['review-a','review-b'].includes(n.userData.elementId))nodes.push(n);});
  return nodes.map(n=>({id:n.userData.elementId,uv:n.geometry.attributes.uv.array.slice(0,4),repeat:n.material.map?.repeat.toArray()}));
 });assert.ok(seam.length>=2);
 // A real section intersects walls and the generated slab; the caps must have finite buffers.
 await page.evaluate(()=>{
  StudioEnhancements.fullView();StudioEnhancements.section={xmin:0,xmax:300,ymin:0,ymax:300,zmin:0,zmax:60};StudioEnhancements.applySection();Engine4D.render();
 });
 await page.evaluate(()=>FourDDetails.updateCaps(true));
 assert.ok(await page.evaluate(()=>FourDDetails.capGroup.children.length)>0,'Solid sections produce cap meshes');
 assert.equal(await page.evaluate(()=>FourDDetails.capGroup.children.every(n=>n.geometry.attributes.position.array.every(Number.isFinite))),true);
 await page.evaluate(()=>{FourDReview.panel('bookmarks');document.getElementById('review-bookmark-name').value='Ground section';document.getElementById('review-bookmark-note').value='Check wall junction';FourDReview.saveBookmark();});
 await page.evaluate(()=>{FourDViews.plot();FourDReview.panel('bookmarks');document.getElementById('review-bookmark-name').value='Plot overview';FourDReview.saveBookmark();});
 const portable=await page.evaluate(()=>ProjectModel.normalize(JSON.parse(JSON.stringify(ProjectState.capture()))).design.presentation.studio);
 assert.equal(portable.bookmarks.length,2);assert.equal(portable.fixtures[0].temperature,4500);
 await page.evaluate(()=>FourDReview.visitBookmark(0));assert.equal(await page.evaluate(()=>StudioEnhancements.section.zmax),60);
 assert.equal(await page.locator('#review-view-note').textContent(),'Check wall junction');
 const png=await page.evaluate(async()=>{const blob=await Engine4D.capture({download:false});return {type:blob.type,size:blob.size};});assert.equal(png.type,'image/png');assert.ok(png.size>1000);
 const queue=await page.evaluate(()=>FourDReview.renderQueue(false));assert.equal(queue.count,2);assert.ok(queue.bytes>2000);assert.equal(await page.evaluate(()=>FourDReview.queueActive),false);
 console.log('Review: section caps, fixture settings, shared material origin and ZIP queue passed');
 await page.evaluate(()=>{window.reviewPending=FourDReview.renderQueue(false);FourDReview.cancelQueue();});
 await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>FourDReview.queueActive),false);
 // Compare without changing the saved project, then highlight an intentionally duplicated surface.
 await page.evaluate(()=>{
  const current=ProjectState.capture(),before=structuredClone(current);before.elements[0].w=168;before.elements[1].x=202;before.elements.push({...before.elements[1],id:'removed-object',x:400});
  ProjectState.commit('Saved review alternative',()=>WorkbenchModel.data(ProjectState.capture()));
  ProjectState.meta.design.workbench.options.push({id:'review-option',name:'Earlier design',project:before});
  FourDReview.panel('changes');document.getElementById('review-alternative').value='review-option';FourDReview.compare();
 });
 assert.ok(await page.evaluate(()=>FourDReview.changes.some(r=>r.status==='resized')));assert.ok(await page.evaluate(()=>FourDReview.changes.some(r=>r.status==='removed')));
 assert.ok(await page.evaluate(()=>FourDReview.changeGroup.children.length)>0);
 await page.evaluate(()=>{FourDViews.building();window.reviewDuplicated=Engine4D.model.children.find(n=>n.userData.isWall).clone(true);Engine4D.model.add(reviewDuplicated);FourDReview.panel('audit');FourDReview.audit();});
 assert.ok(await page.evaluate(()=>FourDReview.findings.some(f=>f.reason.includes('Coincident'))));
 await page.evaluate(()=>{Engine4D.model.remove(reviewDuplicated);FourDReview.clearAudit();FourDReview.clearChanges();FourDReview.panel('performance');FourDReview.baseline();});
 assert.ok((await page.locator('[data-review-tab="performance"]').textContent()).includes('Worker jobs'));
 assert.equal(await page.evaluate(()=>JSON.stringify(ProjectState.capture().elements)),saved,'Review tools never alter element dimensions or placement');
 // Worker-backed edit latency and resource stability are deployment regression checks.
 await page.evaluate(()=>{document.getElementById('studio-dialog')?.close();FourDViews.building();});
 const resources=await page.evaluate(()=>Engine4D.sceneResources.geometries.size);
 const edits=[];
 for(let i=0;i<5;i++){
  await page.evaluate(n=>ProjectState.commit('Review benchmark opening',()=>fixtures[0].offset=60+n),i);
  await page.waitForFunction(n=>FourDIncremental.snapshot.project.fixtures[0].offset===60+n,i);
  edits.push(await page.evaluate(()=>FourDWorkspace.metrics.lastUpdate.ms));
 }
 assert.equal(await page.evaluate(()=>Engine4D.sceneResources.geometries.size),resources,'Worker-backed edits retain a stable owned buffer count');
 assert.ok(Math.max(...edits)<8000,'Software CI structural edit budget');
 console.log('4D edit timings ms:',JSON.stringify(edits));
 // Imported texture snapshots progress within a profile and release residency on disposal.
 const texture=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=2048;const source=new THREE.CanvasTexture(c),copy=source.clone();FourDAssets.prepareTexture(copy,source);const initial=copy.image.width;FourDAssets.refine();const final=copy.image.width;copy.dispose();source.dispose();return {initial,final,pending:FourDAssets.pending.has(copy),bytes:FourDAssets.bytes};});assert.ok(texture.initial<=256);assert.ok(texture.final<=512);assert.equal(texture.pending,false);assert.ok(texture.bytes>=0);
 const report=await page.evaluate(()=>FourDReview.report());console.log('4D performance report:',JSON.stringify(report));
 assert.ok(report.firstFrameMs<30000,'Software CI startup budget');assert.ok(report.textureMiB<=32,'Eco presentation texture budget');assert.ok(report.p95RenderMs<2500,'Software CI p95 render-cost budget');
 require('node:fs').writeFileSync('/tmp/archcad-performance-'+(process.env.BROWSER_ENGINE||'chromium')+'.json',JSON.stringify({report,edits,environment:'software-capable browser CI',fixture:'review-4-elements-2-floors'},null,2));
 await page.evaluate(()=>FourDReview.split());
 assert.equal(await page.evaluate(()=>StudioUI.mode),'split');assert.equal(await page.locator('#review-linked-tools').isVisible(),true);
 await page.evaluate(()=>{StudioUI.select(1);FourDReview.locateModel();FourDReview.locatePlan();});
 assert.ok((await page.locator('#review-linked-tools').textContent()).includes('bedroom'));
 assert.equal(await page.evaluate(()=>!!FourDJobs.worker),false,'Leaving 4D terminates worker');
 await page.evaluate(()=>FourDReview.closeLinked());
 await page.evaluate(()=>setWorkspaceLayout('4d'));await page.locator('#fourd-start').click();await page.waitForFunction(()=>FourDWorkspace.running);await page.waitForFunction(()=>FourDIncremental.snapshot);
 await page.evaluate(()=>{FourDReview.renderQueue(false);FourDWorkspace.pause(true);});
 assert.equal(await page.evaluate(()=>FourDReview.queueActive||!!FourDJobs.worker),false,'Pause cancels queue and worker');
 await page.evaluate(()=>FourDWorkspace.pause(false));await page.waitForTimeout(180);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>FourDReview.panel('bookmarks'));
 const bounds=await page.locator('#studio-dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390);
 await page.waitForTimeout(700);const area=await page.evaluate(()=>WorkspaceLayout.usableArea());assert.ok(area.height<area.fullHeight*.7,'Mobile bottom sheet reserves visible model space');await page.screenshot({path:'/tmp/archcad-review-mobile.png'});
 await page.evaluate(()=>setWorkspaceLayout('2d'));assert.equal(await page.evaluate(()=>!!FourDJobs.worker||FourDJobs.pending.size||FourDAssets.pending.size||!!FourDDetails.capTimer&&!!FourDDetails.capGroup),false);
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{window.reviewWorkerConstructor=window.Worker;window.Worker=function(){throw new DOMException('Worker disabled by host','SecurityError');};});
 await page.evaluate(()=>{FourDJobs.unavailable=false;setWorkspaceLayout('4d');});await page.locator('#fourd-start').click();await page.waitForFunction(()=>FourDIncremental.snapshot||document.body.dataset.fourdState==='error');
 assert.equal(await page.evaluate(()=>FourDWorkspace.running),true,'Blocked worker uses verified CPU fallback');assert.ok(await page.evaluate(()=>FourDJobs.stats.fallbacks)>0);
 await page.evaluate(()=>{setWorkspaceLayout('2d');FourDJobs.unavailable=false;});await page.evaluate(()=>{window.Worker=reviewWorkerConstructor;});
 await page.evaluate(p=>ProjectState.apply(p,{rebase:true}),original);await page.evaluate(q=>FourDWorkspace.setQuality(q),quality);
 await page.evaluate(async()=>{StorageEngine.markDirty();await StorageEngine.saveToMemory();});console.log('4D review, ownership, worker lifecycle and mobile checks passed');
};
