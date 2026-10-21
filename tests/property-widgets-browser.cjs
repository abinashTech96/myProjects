module.exports = async ({page,assert}) => {
  const viewport=page.viewportSize();
  const original=await page.evaluate(()=>({project:ProjectState.capture(),preferences:structuredClone(PlanningUI.preferences)}));
  await page.evaluate(()=>{
    const p=ProjectState.capture(),width=ProjectModel.inches(p.plot.inW,p.unit);
    ProjectState.apply({...p,elements:[{id:'legacy-bedroom',type:'bedroom',customName:'Bedroom 1',x:width-50,y:0,w:120,h:147,floor:2},{id:'constraint-source-room',type:'bedroom',x:20,y:200,w:60,h:60,floor:2},{id:'constraint-target-room',type:'bedroom',x:100,y:200,w:60,h:60,floor:2}],fixtures:[{id:'legacy-door',type:'door',roomId:0,edge:'left',offset:36,size:30}],floorCount:3,currentFloor:2},{rebase:true});
    setWorkspaceLayout('2d');StudioUI.select(0);updateCanvas();
  });
  await page.getByText('Appearance',{exact:true}).click();
  const panel=page.locator('#studio-properties');
  await panel.locator('input[type="color"]').fill('#d65a72');
  assert.equal(await page.evaluate(()=>elements[0].customColor),'#d65a72','Changing color must not validate pre-existing plot placement');
  await panel.locator('label').filter({hasText:'Name'}).locator('input').fill('Bedroom recolored');
  await panel.locator('label').filter({hasText:'Name'}).locator('input').press('Tab');
  await panel.locator('select[onchange*="material"]').selectOption('wood');
  assert.deepEqual(await page.evaluate(()=>[elements[0].customColor,elements[0].customName,elements[0].material]),['#d65a72','Bedroom recolored','wood'],'Appearance must remain editable on imported rooms beyond the plot');
  await page.evaluate(()=>setWorkspaceLayout('3d'));
  await page.waitForFunction(()=>Engine3D.elementObjects?.has('legacy-bedroom'));
  await panel.locator('input[type="color"]').fill('#5a93d6');
  await page.waitForFunction(()=>Engine3D.elementObjects.get('legacy-bedroom')?.children[0]?.material.color.getHexString()==='5a93d6');
  assert.equal(await page.evaluate(()=>selectedElIndex),0,'3D color edits retain selection');
  await page.evaluate(()=>setWorkspaceLayout('2d'));
  const originalX=await page.evaluate(()=>elements[0].x);
  await page.evaluate(()=>StudioUI.edit(0,'x',elements[0].x+1));
  assert.equal(await page.evaluate(()=>elements[0].x),originalX,'Geometry changes must still reject out-of-plot placement');
  assert.equal(await page.evaluate(()=>selectedElIndex),0);
  assert.equal(await panel.locator('details').filter({has:page.getByText('Appearance',{exact:true})}).getAttribute('open'),'','Rejected geometry preserves expanded Appearance');
  await page.evaluate(()=>{document.activeElement.blur();StudioUI.edit(0,'locked',true);});
  assert.equal(await page.evaluate(()=>elements[0].locked),true,'Locking must not be blocked by unrelated geometry');
  await page.evaluate(()=>{StudioUI.edit(0,'locked',false);StudioUI.select(2);});
  await page.getByText('Distance constraints',{exact:true}).click();
  await page.locator('#constraint-source').selectOption('constraint-source-room');
  await page.locator('#constraint-distance').fill('84');
  await page.getByRole('button',{name:'Add constraint',exact:true}).click();
  assert.equal(await page.evaluate(()=>elements[2].x),104,'An unrelated legacy room must not block a valid Properties constraint');
  await page.evaluate(()=>{elements[1].y+=1;StudioUI.finishDrag();});
  assert.equal(await page.evaluate(()=>elements[1].y),201,'Dragging a valid room ignores untouched legacy plot violations');
  await page.evaluate(()=>{ProjectState.undo();StudioUI.closeProperties();});
  await page.evaluate(()=>{for(const key of ['checks','vastu','area','converter','measurements','selection','navigation','shortcuts'])PlanningUI.toggleWidget(key,true);});
  for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:900});
    await page.waitForTimeout(120);
    const buttons=page.locator('#planning-dock .planning-widget');
    assert.equal(await buttons.count(),8);
    const boxes=await buttons.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,text:n.textContent.trim()}}));
    assert.ok(boxes.every(b=>b.text===''&&b.width<=48&&b.x>=0&&b.x+b.width<=width),'Only compact icons appear in the dock');
    assert.ok(boxes.every((b,i)=>!i||(Math.abs(b.x-boxes[0].x)<1&&b.y>=boxes[i-1].y+boxes[i-1].height)),'Widgets stack vertically on the left');
    if(width===1440){
      await page.evaluate(()=>StudioUI.select(0));
      const originalX=await page.evaluate(()=>elements[0].x);
      await buttons.first().focus();await buttons.first().press('ArrowDown');
      assert.equal(await buttons.nth(1).evaluate(b=>document.activeElement===b),true,'Arrow keys navigate the widget rail');
      assert.equal(await page.evaluate(()=>elements[0].x),originalX);
      await page.evaluate(()=>StudioUI.closeProperties());
      for(const key of ['checks','vastu','area','measurements','selection','navigation','shortcuts']){
        await page.locator(`#planning-dock [data-widget="${key}"]`).click();
        assert.equal(await page.locator('#studio-dialog').getAttribute('data-widget'),key);
        await page.getByRole('button',{name:'Close dialog',exact:true}).click();
      }
    }
    await page.locator('#planning-dock [data-widget="converter"]').click();
    const dialog=page.locator('#studio-dialog');
    await dialog.evaluate(d=>Promise.all(d.getAnimations().map(a=>a.finished)));
    const box=await dialog.boundingBox();
    assert.ok(box.x>=0&&box.x+box.width<=width+1,'Widget detail fits the viewport');
    assert.equal(await dialog.getAttribute('data-widget'),'converter');
    assert.ok(await page.locator('#converter-results').isVisible());
    if(width===1440)await page.screenshot({path:'/tmp/archcad-widget-converter.png'});
    await page.getByRole('button',{name:'Close dialog',exact:true}).click();
    await page.screenshot({path:`/tmp/archcad-widget-rail-${width}.png`});
  }
  await page.setViewportSize({width:320,height:560});
  await page.locator('#planning-dock [data-widget="shortcuts"]').scrollIntoViewIfNeeded();
  const visible=await page.evaluate(()=>{const dock=document.getElementById('planning-dock').getBoundingClientRect(),last=document.querySelector('#planning-dock [data-widget="shortcuts"]').getBoundingClientRect();return last.bottom<=dock.bottom+1;});
  assert.equal(visible,true,'Every enabled widget remains reachable on short screens');
  await page.setViewportSize(viewport);
  await page.evaluate(({project,preferences})=>{ProjectState.apply(project,{rebase:true});PlanningUI.preferences=preferences;PlanningUI.savePrefs();PlanningUI.applyPrefs();PlanningUI.refresh();setWorkspaceLayout('2d');updateCanvas();},original);
  console.log('Properties/widget rail: appearance on legacy geometry, bounds protection, vertical icons and responsive details passed');
};
