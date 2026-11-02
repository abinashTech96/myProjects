/* User-visible realism, geometry preservation and the separately gated still job. */
const fs=require('node:fs');
module.exports=async({page,assert})=>{
 const original=await page.evaluate(()=>({project:ProjectState.capture(),quality:FourDWorkspace.quality,glass:Engine4D.physicalGlass}));
 try{
  await page.evaluate(()=>{
   setWorkspaceLayout('2d');const p=ProjectModel.normalize({unit:'in',scale:1.2,plot:{inW:'720',inH:'600'},floorCount:2,wallSettings:{height:120,external:9,internal:4.5},elements:[
    {id:'real-living',type:'living',x:90,y:90,w:240,h:240,floor:0},
    {id:'real-bed',type:'bedroom',x:330,y:90,w:180,h:240,floor:0},
    {id:'real-stair',type:'staircase',x:100,y:360,w:36,h:196,dir:'up',floor:0},
    {id:'real-upper',type:'bedroom',x:90,y:90,w:240,h:240,floor:1},
    {id:'real-bath',type:'toilet',x:330,y:330,w:180,h:180,floor:0},
   ],fixtures:[{id:'real-window',roomId:0,type:'window',edge:'top',offset:60,size:60,sill:36,height:48},{id:'real-door',roomId:0,type:'door',edge:'bottom',offset:90,size:36,sill:0,height:84}],view:{parapet:'none'},design:{roof:{type:'flat'}}});
   p.design.workbench.stairs['real-stair']={style:'straight',width:36,rise:120,riser:7.5,tread:10,landing:36};
   p.design.presentation.surfaces['real-living']={floor:{type:'kitchen-tile',color:'#ddd8cc',roughness:.32,scale:1,rotation:0}};
   p.design.presentation.surfaces['real-bath']={floor:{type:'bathroom-tile',color:'#bed6dd',roughness:.28,scale:1,rotation:0}};
   p.design.presentation.studio.fixtures=[{id:'real-light',room:'real-living',type:'ceiling',x:.5,y:.5,height:110,intensity:.8,temperature:2700,spread:60,yaw:0,enabled:true}];
   p.design.presentation.lights.enabled=true;ProjectState.apply(p,{rebase:true});setWorkspaceLayout('4d');FourDWorkspace.setQuality('eco');FourDViews.motion='off';
  });
  assert.equal(await page.evaluate(()=>!!window.FourDStill||!!window.FourDRealism||!!Engine4D.renderer),false,'All realism implementation remains gated behind Render 4D');
  await page.evaluate(()=>FourDWorkspace.start());assert.equal(await page.evaluate(()=>FourDWorkspace.running),true,await page.locator('#fourd-start-message').textContent());
  await page.evaluate(()=>{FourDViews.motion='off';FourDViews.floor(0);StudioUI.select(0);});
  const geometry=await page.evaluate(()=>JSON.stringify({plot:ProjectState.capture().plot,elements,fixtures,levels:WorkbenchModel.data(ProjectState.capture()).levels}));
  const sourceUV=await page.evaluate(()=>{const n=Engine4D.pairs.find(([source,copy])=>copy.material?.userData.presentationSurface==='floor'&&copy.userData.elementId==='real-living');window.realFloorPair=n;return Array.from(n[0].geometry.attributes.uv.array);});
  await page.evaluate(()=>{FourDRealism.preset();Engine4D.render();FourDRealism.change('enabled',false);Engine4D.render();});
  await page.waitForFunction(()=>{Engine4D.render();return !FourDRealism.queue?.length;});
  assert.equal(await page.evaluate(()=>{let active=0;Engine4D.model.traverse(n=>{if(FourDRealism.meshState.has(n))active++;});return active;}),0,'Rapid off restores even a partially mapped scene');
  await page.evaluate(()=>FourDStudio.open('realism'));await page.getByRole('button',{name:'Apply balanced realism',exact:true}).click();
  await page.waitForFunction(()=>{Engine4D.render();return FourDRealism.settings.enabled&&!FourDRealism.queue?.length&&FourDRealism.stairGroups?.length===1&&FourDDetails.detailKey===FourDDetails.key()&&Engine4D.landscape?.getObjectByProperty('isInstancedMesh',true);});
  assert.equal(await page.getByRole('checkbox',{name:'Enable realistic presentation',exact:true}).isChecked(),true);
  const mapped=await page.evaluate(()=>({repeat:realFloorPair[1].material.map.repeat.toArray(),clone:realFloorPair[0].geometry!==realFloorPair[1].geometry,source:Array.from(realFloorPair[0].geometry.attributes.uv.array),details:FourDDetails.details.children.map(n=>n.userData),border:Engine4D.landscape.children.some(n=>n.userData.lawnBorder),trees:Engine4D.landscapePlan.plants.filter(p=>p.kind==='tree').map(p=>p.height)}));
  assert.deepEqual(mapped.source,sourceUV);assert.equal(mapped.clone,true);assert.ok(Math.abs(mapped.repeat[0]-1/48)<1e-8);assert.ok(mapped.details.some(d=>d.threshold));assert.ok(mapped.details.some(d=>d.glazingSeal));assert.ok(mapped.details.some(d=>d.roofCoping));assert.equal(mapped.border,true);assert.ok(mapped.trees.every(h=>h>=150));
  assert.equal(await page.evaluate(()=>FourDRealism.stairGroups[0].originals.every(n=>!n.visible)),true,'Presentation stair solid hides coincident internal tread faces');
  console.log('Realism: physical mapping, source UV ownership, threshold/frame/coping detail and planted borders passed');
  await page.evaluate(()=>{FourDRealism.change('tileSize',30);Engine4D.render();});await page.waitForFunction(()=>!FourDRealism.queue?.length&&Math.abs(realFloorPair[1].material.map.repeat.x-1/60)<1e-8);
  assert.equal(await page.evaluate(()=>FourDRender.probes.size),0,'Eco avoids local reflection captures');
  const lighting=await page.evaluate(()=>{FourDWorkspace.setQuality('balanced');StudioEnhancements.navigating=false;WorkspacePanels.close();const {SCALE:S,I}=get3DEnvironmentParams();Engine3D.camera.position.set(I.x+200*S,64*S,I.z+200*S);Engine3D.camera.lookAt(I.x+200*S,64*S,I.z+90*S);FourDRender.cameraChangedAt=0;FourDRender.probeDirty=true;Engine4D.render();const first={fill:Engine4D.fill.intensity,rim:Engine4D.rim.intensity,exposure:Engine4D.renderer.toneMappingExposure,builds:FourDRender.probeStats.builds};FourDRender.probeDirty=true;Engine4D.render();const reused=FourDRender.probeStats.hits;
   Engine3D.camera.position.set(I.x+420*S,64*S,I.z+200*S);Engine3D.camera.lookAt(I.x+420*S,64*S,I.z+90*S);FourDRender.cameraChangedAt=0;FourDRender.probeDirty=true;Engine4D.render();const dark={fill:Engine4D.fill.intensity,rim:Engine4D.rim.intensity,room:FourDRealism.room?.id};return{first,dark,reused,caches:FourDRender.probes.size};});
  assert.equal(lighting.dark.room,'real-bed');assert.ok(lighting.dark.fill<lighting.first.fill);assert.ok(lighting.dark.rim<lighting.first.rim);assert.ok(lighting.reused>0);assert.ok(lighting.caches<=2);
  const exposureStart=await page.evaluate(()=>Engine4D.renderer.toneMappingExposure);await page.waitForFunction(start=>{Engine4D.render();return Engine4D.renderer.toneMappingExposure>start+.02;},exposureStart);
  await page.evaluate(()=>{Engine4D.setGlass(true);FourDRealism.change('glazing','frosted');Engine4D.render();});
  const glass=await page.evaluate(()=>{const m=[...Engine4D.materials].find(m=>m.userData.glazing);const settled={rough:m.roughness,transmission:m.transmission};StudioEnhancements.navigating=true;Engine4D.render();const moving=m.transmission;StudioEnhancements.navigating=false;Engine4D.render();return{settled,moving,restored:m.transmission};});
  assert.ok(glass.settled.rough>.4);assert.ok(glass.settled.transmission>0);assert.equal(glass.moving,0);assert.equal(glass.restored,glass.settled.transmission);
  await page.evaluate(()=>{StudioUI.select(0);FourDRealism.roomTemperature(4000);FourDRealism.toggleRoomLights();});assert.equal(await page.evaluate(()=>FourDStudio.settings.fixtures[0].enabled),false);assert.equal(await page.evaluate(()=>{Engine4D.render();return FourDDetails.fixtureBodies.children.some(n=>n.visible&&n.material.emissiveIntensity===0);}),true,'Switching a light off retains its fixture body');await page.evaluate(()=>FourDRealism.toggleRoomLights());assert.equal(await page.evaluate(()=>FourDStudio.settings.fixtures[0].temperature),4000);
  await page.evaluate(()=>{FourDWorkspace.setQuality('balanced');StudioEnhancements.navigating=false;Engine4D.render();});assert.equal(await page.evaluate(()=>FourDDetails.fixtureGroup.children.filter(n=>n.isLight&&n.castShadow).length),1);
  await page.evaluate(()=>{StudioEnhancements.navigating=true;Engine4D.render();});assert.equal(await page.evaluate(()=>FourDDetails.fixtureGroup.children.filter(n=>n.isLight&&n.castShadow).length),0);await page.evaluate(()=>{StudioEnhancements.navigating=false;FourDWorkspace.setQuality('eco');});
  const steps=await page.evaluate(()=>{const {SCALE:S,I}=get3DEnvironmentParams();Engine3D.camera.position.set(I.x+118*S,64*S,I.z+362*S);const point=Engine3D.camera.position.clone();point.z=I.z+365*S;const surface=FourDRealism.walkSurface(point),moved=FourDRealism.walk(point,.04),outside=FourDRealism.walkSurface(new THREE.Vector3(I.x+700*S,64*S,I.z+550*S));return {surface,y:moved.y/S,outside};});assert.equal(steps.surface.height,7.5);assert.ok(steps.y>64&&steps.y<71.5);assert.equal(steps.outside,null);
  assert.equal(await page.evaluate(()=>JSON.stringify({plot:ProjectState.capture().plot,elements,fixtures,levels:WorkbenchModel.data(ProjectState.capture()).levels})),geometry,'All realism/view controls preserve architectural geometry');
  for(const view of ['exterior','bedroom','bathroom','stairs']){
   await page.evaluate(view=>{WorkspacePanels.close();FourDViews.motion='off';if(view==='exterior')FourDViews.building(false);else{StudioUI.select(elements.findIndex(e=>e.id===({'bedroom':'real-bed','bathroom':'real-bath','stairs':'real-stair'})[view]));FourDViews.focus();}StudioEnhancements.labels='none';Engine4D.render();},view);
   await page.waitForFunction(()=>!FourDViews.transition&&!FourDRealism.queue?.length);
   if(view==='stairs')assert.equal(await page.evaluate(()=>Engine3D.camera.position.z<Engine3D.controls.target.z),true,'Stair view faces the first flight');
   await page.locator('#four-d-canvas').screenshot({path:'/tmp/archcad-realism-'+view+'.png'}).catch(()=>page.screenshot({path:'/tmp/archcad-realism-'+view+'.png'}));
  }
  await page.evaluate(()=>{FourDViews.floor(0);FourDStill.open();Object.assign(FourDStudio.settings.realism,{stillWidth:160,stillSeconds:3,stillSamples:1,stillBounces:2});});
  await page.waitForFunction(()=>!FourDViews.transition&&performance.now()-(FourDRender.cameraChangedAt||0)>500);
  const still=await page.evaluate(()=>FourDStill.start());assert.ok(still?.pixels?.length>0,JSON.stringify(still));assert.ok(still.triangles>0);assert.ok(still.covered>0);assert.equal(await page.evaluate(()=>FourDStill.active||!!FourDStill.worker),false);
  const png=await page.evaluate(()=>document.getElementById('fourd-still-preview').toDataURL());fs.writeFileSync('/tmp/archcad-realism-still.png',Buffer.from(png.split(',')[1],'base64'));
  await page.evaluate(()=>{Object.assign(FourDStudio.settings.realism,{stillSamples:128,stillSeconds:60});window.realStillPromise=FourDStill.start();});await page.waitForFunction(()=>FourDStill.active);await page.getByRole('button',{name:'Cancel still render',exact:true}).click();await page.evaluate(()=>realStillPromise);assert.equal(await page.evaluate(()=>FourDStill.active||!!FourDStill.worker),false);
  await page.evaluate(()=>{window.realStillPromise=FourDStill.start();});await page.waitForFunction(()=>FourDStill.active);await page.evaluate(()=>ProjectState.commit('Cancel a stale still',()=>elements[0].customName='Edited during still'));await page.evaluate(()=>realStillPromise);assert.equal(await page.evaluate(()=>FourDStill.active||!!FourDStill.worker),false);
  await page.evaluate(()=>{window.realStillPromise=FourDStill.start();});await page.waitForFunction(()=>FourDStill.active);await page.evaluate(()=>WorkspacePanels.close());await page.evaluate(()=>realStillPromise);assert.equal(await page.evaluate(()=>FourDStill.active||!!FourDStill.worker),false);
  console.log('Realism: interior exposure, cached reflections, glass motion preview, light presets/shadow budget, stairs and cancellable bounced-light still passed');
  await page.waitForFunction(()=>!FourDWorkspace.structuralPending&&FourDIncremental.snapshot?.project.elements[0].customName==='Edited during still');
  await page.evaluate(()=>{window.currentRealFloorPair=Engine4D.pairs.find(([s,c])=>c.material?.userData.presentationSurface==='floor'&&c.userData.elementId==='real-living');FourDRealism.change('enabled',false);Engine4D.render();});await page.waitForFunction(()=>!FourDRealism.queue?.length);
  assert.equal(await page.evaluate(()=>FourDRealism.meshState.has(currentRealFloorPair[1])),false,'Disabling real-size mapping restores owned geometry');
  assert.ok(await page.evaluate(()=>[...Engine4D.materials].filter(m=>m.userData.glazing).every(m=>m.transmission>0)),'Disabling realism retains the device physical-glass preference');
  const raster=await page.evaluate(async()=>{const b=await Engine4D.capture({download:false});return b?.size;});assert.ok(raster>100);
  await page.screenshot({path:'/tmp/archcad-realism-controls.png'});
  await page.evaluate(()=>FourDWorkspace.stop());assert.equal(await page.evaluate(()=>!!FourDStill.worker||FourDRealism.queue?.length||Engine4D.renderer!=null),false);
 }finally{await page.evaluate(original=>{FourDWorkspace.stop();setWorkspaceLayout('2d');ProjectState.apply(original.project,{rebase:true});FourDWorkspace.setQuality(original.quality);Engine4D.setGlass(original.glass);},original);}
};
