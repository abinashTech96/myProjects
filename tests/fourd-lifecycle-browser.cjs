module.exports = async ({page,assert}) => {
  const original=await page.evaluate(()=>ProjectState.capture());
  const originalQuality=await page.evaluate(()=>FourDWorkspace.quality);
  await page.evaluate(()=>{
    const p=ProjectState.capture();
    ProjectState.apply({...p,plot:{...p.plot,inW:"480",inH:"360"},floorCount:2,currentFloor:0,elements:[
      {id:"lifecycle-room",type:"bedroom",x:12,y:12,w:180,h:180,floor:0},
      {id:"lifecycle-upper",type:"bedroom",x:12,y:12,w:180,h:180,floor:1},
      {id:"lifecycle-bed",type:"bed",isFurniture:true,x:40,y:40,w:60,h:80,floor:0}],
      fixtures:[{id:"lifecycle-window",roomId:1,type:"window",edge:"right",offset:48,size:36,sill:40,height:40}],
      design:{...p.design,presentation:PresentationModel.defaults(),workbench:WorkbenchModel.defaults()}},{rebase:true});
    setWorkspaceLayout("4d");
  });
  assert.equal(await page.locator("#fourd-start").isVisible(),true);
  assert.deepEqual(await page.evaluate(()=>({editor:!!Engine3D.scene,renderer:!!Engine4D.renderer,active:Engine4D.active,libraries:!!THREE.SSAOPass})),{editor:false,renderer:false,active:false,libraries:false});
  for(const selector of ["#planning-dock","#workspace-rail",".studio-inspector","#advanced-view-panel"])
    assert.equal(await page.locator(selector).isVisible(),false,selector);
  await page.evaluate(()=>{StudioUI.select(0);ViewportUI.fit();window.dispatchEvent(new Event("resize"));});
  assert.equal(await page.evaluate(()=>!!Engine3D.scene),false,"Selection and resize cannot start graphics");
  // Cancel before preparation gets its first CPU batch; rapid mode switches must not start stale work.
  await page.evaluate(()=>{FourDWorkspace.start();FourDWorkspace.stop();});
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(()=>!!Engine4D.renderer),false);
  await page.locator("#fourd-start").click();
  await page.waitForFunction(()=>FourDWorkspace.running&&Engine4D.frames>0);
  await page.waitForFunction(()=>!Engine3D.cameraTween&&!StudioEnhancements.navigating);
  const initial=await page.evaluate(()=>({project:ProjectState.capture(),builds:FourDWorkspace.metrics.builds,first:FourDWorkspace.metrics.firstFrameMs}));
  assert.ok(initial.first>0);
  await page.evaluate(()=>{StudioUI.select(0);});
  assert.equal(await page.evaluate(()=>StudioEnhancements.focusRoom),null,"Single click/selection must not focus");
  await page.locator("#fourd-toolbar").getByRole("button",{name:"Inspect",exact:true}).focus();
  await page.keyboard.press("Delete");
  await page.keyboard.press("Control+d");
  assert.equal(await page.evaluate(()=>elements.length),3,"Hidden editing shortcuts cannot mutate a 4D inspection");
  await page.evaluate(async()=>{await StudioEnhancements.focusSelection();});
  await page.waitForFunction(()=>!Engine3D.cameraTween);
  await page.locator("#fourd-toolbar").getByRole("button",{name:"Full view",exact:true}).click();
  await page.waitForFunction(()=>!Engine3D.cameraTween);
  assert.equal(await page.evaluate(()=>FourDWorkspace.metrics.builds),initial.builds,"Camera focus must reuse geometry");
  assert.equal(await page.locator(".enhancement-dimension:visible").count(),0);
  assert.equal(await page.locator("#wb-3d-labels").isVisible(),false);
  await page.evaluate(()=>{
    StudioUI.select(0);
    StudioEnhancements.assign("lifecycle-room","wall",{type:"brick",color:"#c08070",roughness:.8,scale:1,rotation:0});
  });
  await page.waitForFunction(()=>[...Engine4D.materials].some(m=>m.userData.fourDMaterial==="brick"));
  assert.equal(await page.evaluate(()=>FourDWorkspace.metrics.builds),initial.builds,"Material changes must reuse geometry");
  await page.evaluate(()=>ProjectState.undo());
  assert.equal(await page.evaluate(()=>StudioUI.mode==="4d"&&FourDWorkspace.running),true,"Undo retains the active 4D session");
  await page.waitForFunction(()=>![...Engine4D.materials].some(m=>m.userData.fourDMaterial==="brick"));
  await page.evaluate(()=>ProjectState.redo());
  await page.waitForFunction(()=>[...Engine4D.materials].some(m=>m.userData.fourDMaterial==="brick"));
  assert.equal(await page.evaluate(()=>FourDWorkspace.metrics.builds),initial.builds);
  const opening=await page.evaluate(()=>{
    Engine4D.render();
    const leaf=StudioEnhancements.leaves.find(l=>l.f.id==="lifecycle-window");
    if(!leaf)return null;
    const combined=new THREE.Box3().setFromObject(leaf.copy).union(new THREE.Box3().setFromObject(leaf.fixed));
    const source=new THREE.Box3().setFromObject(leaf.source);
    return {centreError:combined.getCenter(new THREE.Vector3()).distanceTo(source.getCenter(new THREE.Vector3())),sizeError:combined.getSize(new THREE.Vector3()).distanceTo(source.getSize(new THREE.Vector3()))};
  });
  assert.ok(opening&&opening.centreError<.01&&opening.sizeError<.01,JSON.stringify(opening));
  await page.locator("#fourd-pause").click();
  const paused=await page.evaluate(()=>Engine4D.frames);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>Engine4D.frames),paused);
  assert.equal(await page.evaluate(()=>Engine3D.loopRunning),false);
  await page.locator("#fourd-pause").click();
  await page.waitForFunction(n=>Engine4D.frames>n,paused);
  await page.getByRole("combobox",{name:"Live 4D quality",exact:true}).selectOption("eco");
  assert.equal(await page.evaluate(()=>Engine4D.ao.enabled||Engine4D.renderer.shadowMap.enabled),false);
  // A renderer failure reveals an actionable retry surface, not an empty canvas.
  await page.evaluate(()=>{
    Engine4D.composer.render=()=>{throw Error("injected rendering failure")};
    Engine4D.render();
  });
  assert.equal(await page.locator("#fourd-start").isVisible(),true);
  assert.equal(await page.evaluate(()=>FourDWorkspace.running),false);
  await page.locator("#fourd-start").click();
  await page.waitForFunction(()=>FourDWorkspace.running&&Engine4D.ready);
  const loss=await page.evaluate(()=>!!Engine4D.renderer.getContext().getExtension("WEBGL_lose_context"));
  if(loss) {
    await page.evaluate(()=>{window.lifecycleLoss=Engine4D.renderer.getContext().getExtension("WEBGL_lose_context");lifecycleLoss.loseContext();});
    await page.waitForFunction(()=>Engine4D.state==="context-lost");
    assert.equal(await page.locator("#fourd-start").isVisible(),true);
    await page.waitForTimeout(150);
    await page.evaluate(()=>lifecycleLoss.restoreContext());
    await page.waitForFunction(()=>FourDWorkspace.running&&Engine4D.ready);
  }
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.locator("#fourd-toolbar").isVisible(),true);
  await page.evaluate(()=>FourDWorkspace.stop());
  assert.equal(await page.evaluate(()=>!!Engine4D.renderer||Engine3D.loopRunning||!!FourDRender.targets),false);
  assert.equal(await page.locator("#fourd-start").isVisible(),true);
  await page.evaluate(()=>setWorkspaceLayout("2d"));
  await page.evaluate(()=>setWorkspaceLayout("4d"));
  assert.equal(await page.evaluate(()=>Engine4D.active),false,"Reentry stays gated");
  await page.locator("#fourd-start").click();
  await page.waitForFunction(()=>FourDWorkspace.running);
  await page.evaluate(()=>setWorkspaceLayout("3d"));
  assert.equal(await page.evaluate(()=>!!Engine4D.renderer),false);
  const geometry=await page.evaluate(()=>elements.map(({id,x,y,w,h,floor})=>({id,x,y,w,h,floor})));
  assert.deepEqual(geometry,initial.project.elements.map(({id,x,y,w,h,floor})=>({id,x,y,w,h,floor})));
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(p=>{ProjectState.apply(p,{rebase:true});setWorkspaceLayout("2d");},original);
  await page.evaluate(value=>FourDWorkspace.setQuality(value),originalQuality);
  console.log("4D explicit gate, cancellation, geometry reuse, opening placement, pause, Eco, mobile and release passed",{firstFrameMs:Math.round(initial.first),sceneBuilds:initial.builds});
};
