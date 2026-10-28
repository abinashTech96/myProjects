const fs=require('node:fs'),path=require('node:path'),visual=require('./visual-metrics.cjs');
module.exports=async({page,assert})=>{
 const original=await page.evaluate(()=>ProjectState.capture()),quality=await page.evaluate(()=>FourDWorkspace.quality),landscape=await page.evaluate(()=>localStorage.getItem('ArchCAD_4D_Landscape'));
 await page.evaluate(()=>{const p=ProjectState.capture();p.unit='in';p.scale=1.2;p.wallSettings={external:9,internal:4.5,height:120};p.wallOverrides={};p.constraints=[];p.plot={...ProjectModel.PLOT_DEFAULTS,inW:'600',inH:'480'};p.floorCount=2;p.currentFloor=0;p.elements=[{id:'arch-a',type:'bedroom',x:60,y:60,w:180,h:180,floor:0},{id:'arch-b',type:'living',x:240,y:60,w:180,h:180,floor:0},{id:'arch-upper',type:'bedroom',x:60,y:60,w:180,h:180,floor:1}];p.fixtures=[{id:'arch-door',type:'door',roomId:0,edge:'bottom',offset:60,size:36,height:84,sill:0},{id:'arch-window',type:'window',roomId:2,edge:'bottom',offset:60,size:48,height:48,sill:36}];p.design=DesignModel.defaults();p.design.roof={...p.design.roof,type:'hip',rise:36,thickness:6,overhang:12};p.planning=PlanningModel.defaults();p.view={mode:'2d',parapet:'none',theme:'dark'};ProjectState.apply(p,{rebase:true});StudioEnhancements.theme('graphite',false);setWorkspaceLayout('4d');FourDWorkspace.setQuality('eco');});
 const geometry=await page.evaluate(()=>JSON.stringify({plot:ProjectState.capture().plot,elements}));
 await page.evaluate(()=>FourDWorkspace.start());assert.equal(await page.evaluate(()=>FourDWorkspace.running),true,await page.locator('#fourd-start-message').textContent());
 assert.ok(await page.evaluate(()=>FourDWorkspace.metrics.source.chunks)>10,'Source builder yields between dependency groups');
 assert.ok(await page.evaluate(()=>FourDWorkspace.metrics.shaders.variants)>0,'Shader preparation reports actual variants');
 await page.evaluate(()=>{FourDViews.motion='off';Engine4D.toggleLandscape(false);});
 await page.waitForFunction(()=>FourDIncremental.snapshot);
 await page.evaluate(()=>{window.archLower=Engine4D.pairs.find(([s])=>s.userData.elementId==='arch-a'&&s.userData.isRoom)?.[1];ProjectState.commit('Raise upper storey',()=>{ProjectState.meta.design.workbench.levels=[{id:'upper-datum',floor:1,base:156,height:132}];});});
 await page.waitForFunction(()=>FourDIncremental.snapshot?.project.design.workbench.levels[0]?.base===156&&!FourDWorkspace.structuralPending);
 assert.equal(await page.evaluate(()=>Engine4D.pairs.some(([,copy])=>copy===archLower)),true,'Unchanged ground-floor object retains identity');
 assert.equal(await page.evaluate(()=>FourDWorkspace.metrics.fallbacks||0),0,'Level changes avoid full rebuild');
 const upperBounds=await page.evaluate(()=>{const n=Engine4D.model.children.find(n=>n.userData.elementId==='arch-upper'&&n.userData.isRoom),b=new THREE.Box3().setFromObject(n);return b.min.y/get3DEnvironmentParams().SCALE;});assert.ok(upperBounds>=155.9);
 await page.evaluate(()=>ProjectState.commit('Add empty storey',()=>document.getElementById('b-floors').value='3'));
 await page.waitForFunction(()=>FourDIncremental.snapshot?.project.floorCount===3&&!FourDWorkspace.structuralPending);assert.equal(await page.evaluate(()=>FourDWorkspace.metrics.fallbacks||0),0);
 // Roof controls are portable and geometric review supplies actionable observations.
 await page.evaluate(()=>{DesignUI.roofDialog();document.getElementById('roof-thickness').value='8';DesignUI.saveRoof();});
 await page.waitForFunction(()=>FourDIncremental.snapshot?.project.design.roof.thickness===8&&!FourDWorkspace.structuralPending);
 assert.equal(await page.evaluate(()=>ProjectModel.normalize(ProjectState.capture()).design.roof.thickness),8);
 await page.evaluate(()=>document.getElementById('studio-dialog')?.close());
 const materialAudit=await page.evaluate(()=>{
  const m=new THREE.MeshPhysicalMaterial({clearcoat:1,metalness:1,transmission:.8});FourDTextures.apply(m,'glass');FourDTextures.apply(m,'brick');
  const a={clearcoat:m.clearcoat,metalness:m.metalness,transmission:m.transmission,opacity:m.opacity,normal:m.normalScale.x};const physical=Engine4D.physicalGlass;Engine4D.physicalGlass=true;FourDTextures.apply(m,'glass');if(m.transmission!==.88||m.transparent||m.opacity!==1||!m.userData.glazing)throw Error('Physical glass profile not applied');FourDTextures.apply(m,'stone');if(m.userData.glazing||m.transmission!==0)throw Error('Glass state leaked into stone');Engine4D.physicalGlass=physical;for(const t of ['wood','bathroom-tile','kitchen-tile','grass','shingle','paint']){FourDTextures.apply(m,t,{w:48,h:48});if(!m.map||!m.normalMap||m.map.encoding!==THREE.sRGBEncoding||m.normalMap.encoding!==THREE.LinearEncoding)throw Error('Missing calibrated maps '+t);}for(const key of Scene4D.textureSlots)m[key]?.dispose();m.dispose();return a;
 });assert.deepEqual(materialAudit,{clearcoat:0,metalness:0,transmission:0,opacity:1,normal:.28});
 // The opt-in protocol measures this exact project and restores selection and camera.
 const measured=await page.evaluate(async()=>{const pose=FourDViews.pose(),report=await FourDPerformance.run();return {report,pose,restored:FourDViews.pose()};});
 assert.equal(measured.report.steps.length,5);assert.ok(measured.report.steps.every(s=>s.samples>=1));assert.equal(await page.evaluate(()=>FourDPerformance.active),false);
 for(const key of ['position','target'])for(let i=0;i<3;i++)assert.ok(Math.abs(measured.restored[key][i]-measured.pose[key][i])<1e-6,'Profiler restores '+key);
 await page.evaluate(()=>{window.archCancelled=FourDPerformance.run();});await page.getByRole('button',{name:'Cancel profile',exact:true}).click();await page.evaluate(()=>archCancelled);assert.equal(await page.evaluate(()=>FourDPerformance.profileRunning),false);
 const actual={version:1,views:{}};
 async function capture(kind,preset,omit=false){
  return page.evaluate(({kind,preset,omit})=>{
   FourDViews.motion='off';FourDViews.building(false);Engine4D.toggleLandscape(false);StudioEnhancements.labels='none';
   if(kind==='floor')FourDViews.floor(0);
   if(kind==='element'){StudioUI.select(elements.findIndex(e=>e.id==='arch-upper'));FourDViews.focus();}
   Engine4D.setPreset(preset,false);FourDStudio.settings.environment=preset==='golden-hour'?'golden-hour':'studio';
   Engine4D.render();if(omit)Engine4D.model.visible=false;const r=Engine4D.renderer,previous=r.getRenderTarget(),target=new THREE.WebGLRenderTarget(192,144),camera=Engine3D.camera.clone(),{SCALE:S,I}=get3DEnvironmentParams();
   const center=kind==='element'?{x:150,z:150,y:220}:{x:220,z:160,y:130},distance=kind==='element'?260:600;
   camera.aspect=192/144;camera.zoom=1;camera.position.set(I.x+(center.x+distance*.7)*S,(center.y+distance*.6)*S,I.z+(center.z+distance)*S);camera.lookAt(I.x+center.x*S,center.y*S,I.z+center.z*S);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
   const data=new Uint8Array(192*144*4);try{r.setRenderTarget(target);r.render(Engine4D.scene,camera);r.readRenderTargetPixels(target,0,0,192,144,data);}finally{r.setRenderTarget(previous);target.dispose();if(omit)Engine4D.model.visible=true;}
   const canvas=document.createElement('canvas');canvas.width=192;canvas.height=144;const ctx=canvas.getContext('2d'),image=ctx.createImageData(192,144);
   for(let y=0;y<144;y++)image.data.set(data.slice((143-y)*192*4,(144-y)*192*4),y*192*4);ctx.putImageData(image,0,0);
   return {rgba:Array.from(data),png:canvas.toDataURL('image/png')};
  },{kind,preset,omit});
 }
 const cases=[['exterior','daylight'],['floor','interior'],['element','golden-hour']],incremental={};
 for(const [view,preset]of cases){const c=await capture(view,preset),name=view+'-'+preset;actual.views[name]=visual.signature(c.rgba,192,144);incremental[name]=actual.views[name];fs.writeFileSync('/tmp/archcad-visual-'+name+'.png',Buffer.from(c.png.split(',')[1],'base64'));}
 // Compare incremental geometry with an independently rebuilt scene for every view.
 await page.evaluate(()=>{FourDWorkspace.stop();FourDWorkspace.sourceInvalid=true;});await page.evaluate(()=>FourDWorkspace.start());assert.equal(await page.evaluate(()=>FourDWorkspace.running),true);
 for(const [view,preset]of cases){const c=await capture(view,preset),name=view+'-'+preset,diff=visual.difference(incremental[name],visual.signature(c.rgba,192,144));assert.ok(diff.coverage<.035&&diff.luma<.035,`${name} incremental/full visual disagreement ${JSON.stringify(diff)}`);}
 const folder=path.join(__dirname,'baselines'),file=path.join(folder,'architectural-views.json');
 if(process.env.UPDATE_VISUAL_BASELINES==='1'){fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(file,JSON.stringify(actual,null,2)+'\n');for(const [view,preset]of cases)fs.copyFileSync('/tmp/archcad-visual-'+view+'-'+preset+'.png',path.join(folder,view+'-'+preset+'.png'));}
 const baseline=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const [name,signature]of Object.entries(actual.views)){const diff=visual.difference(signature,baseline.views[name]);assert.ok(diff.coverage<.05&&diff.luma<.06&&diff.maxCoverage<.65,`${name} visual baseline regression ${JSON.stringify(diff)}`);}
 const missing=await capture('exterior','daylight',true);assert.ok(visual.difference(actual.views['exterior-daylight'],visual.signature(missing.rgba,192,144)).maxCoverage>.65,'Visual check detects a missing building');
 assert.equal(await page.evaluate(()=>JSON.stringify({plot:ProjectState.capture().plot,elements})),geometry,'Profiling, roof changes and view checks preserve plot/room geometry');
 await page.evaluate(({original,quality,landscape})=>{FourDWorkspace.stop();if(landscape===null)localStorage.removeItem('ArchCAD_4D_Landscape');else localStorage.setItem('ArchCAD_4D_Landscape',landscape);setWorkspaceLayout('2d');ProjectState.apply(original,{rebase:true});FourDWorkspace.setQuality(quality);},{original,quality,landscape});
 console.log('Architecture/performance: local datum/count changes, staged source and shaders, portable roofs, calibrated finishes, device profile/cancel, reviewed visual baselines and independent full-scene comparison passed');
};
