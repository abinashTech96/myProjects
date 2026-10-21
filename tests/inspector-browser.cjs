/* Exercise actual focused controls, not only their underlying mutation APIs. */
module.exports = async ({page,assert}) => {
  const original = await page.evaluate(() => ProjectState.capture());
  await page.evaluate(() => {
    ProjectState.apply({elements:[{id:'input-bedroom',type:'bedroom',customName:'Bedroom 1',x:30,y:30,w:150,h:180,floor:0}],fixtures:[
      {id:'input-door',type:'door',roomId:0,edge:'left',size:30,offset:36,height:80,sill:0},
      {id:'input-window',type:'window',roomId:0,edge:'top',size:30,offset:12,height:40,sill:40}
    ],floorCount:1,unit:'in'}, {rebase:true});
    setWorkspaceLayout('2d');StudioUI.select(0);updateCanvas();
  });
  const door=page.locator('.studio-opening').nth(0),win=page.locator('.studio-opening').nth(1);
  const size=door.locator('input').nth(0),offset=door.locator('input').nth(1);
  await size.focus();await size.press('ArrowDown');await size.press('ArrowDown');
  assert.equal(await page.evaluate(()=>fixtures[0].size),29.5,'Repeated arrows must change the opening measurement');
  assert.equal(await size.evaluate(input=>document.activeElement===input),true,'Stepping keeps focus');
  assert.deepEqual(await page.evaluate(()=>[elements[0].x,elements[0].y]),[30,30],'Arrow keys in a field must not move the room');
  await door.locator('input').nth(2).focus();await door.locator('input').nth(2).press('ArrowDown');
  assert.equal(await page.evaluate(()=>fixtures[0].height),79.75);
  await win.locator('input').nth(3).focus();await win.locator('input').nth(3).press('ArrowDown');
  assert.equal(await page.evaluate(()=>fixtures[1].sill),39.75);
  await size.fill('29 1/2');await size.press('Enter');
  assert.equal(await page.evaluate(()=>fixtures[0].size),29.5,'Fractional inches remain editable');
  await offset.fill('48');await door.locator('select').click();
  assert.equal(await page.evaluate(()=>fixtures[0].offset),48,'Typing commits on leaving the field');
  assert.equal(await page.evaluate(()=>selectedElIndex),0,'Editing preserves the selected room');
  await door.locator('select').selectOption('right');
  assert.equal(await page.evaluate(()=>fixtures[0].edge),'right');
  assert.equal(await page.locator('.studio-inspector').isVisible(),true);
  const windowLine=page.locator('#fixture-container line[stroke="#38bdf8"]').first();
  const xBefore=await windowLine.getAttribute('x1');
  await win.locator('input').nth(1).fill('44');await win.locator('select').click();
  assert.equal(await page.evaluate(()=>fixtures[1].offset),44);
  assert.notEqual(await windowLine.getAttribute('x1'),xBefore,'Window position must update in the drawing');
  const yBefore=await windowLine.getAttribute('y1');
  await win.locator('select').selectOption('bottom');
  assert.notEqual(await windowLine.getAttribute('y1'),yBefore,'Changing walls moves the drawn window');
  assert.equal(await page.evaluate(()=>fixtures[1].edge),'bottom');
  // An invalid fit rolls back without dismissing the inspector or consuming undo.
  const history=await page.evaluate(()=>ProjectState.history.stack.length);
  await win.locator('input').nth(1).fill('9999');await win.locator('select').click();
  assert.equal(await page.evaluate(()=>fixtures[1].offset),44);
  assert.equal(await page.evaluate(()=>ProjectState.history.stack.length),history);
  assert.equal(await page.evaluate(()=>selectedElIndex),0);
  assert.equal(await page.locator('.studio-inspector').isVisible(),true);
  await page.evaluate(()=>{document.activeElement.blur();StudioUI.changeUnit('cm');StudioUI.select(0);});
  const width=page.locator('input[data-measure="w"]');
  const before=await page.evaluate(()=>elements[0].w);
  await width.focus();await width.press('ArrowDown');
  assert.ok(Math.abs(await page.evaluate(()=>elements[0].w)-(before-0.25/2.54))<0.0001,'Centimeter stepping respects units');
  await page.evaluate(()=>{document.activeElement.blur();StudioUI.changeUnit('ftin');StudioUI.select(0);});
  await door.locator('input').nth(1).fill(`3' 6 1/2"`);await door.locator('input').nth(1).press('Enter');
  assert.equal(await page.evaluate(()=>fixtures[0].offset),42.5,'Fractional feet/inches remain supported');
  await door.locator('input').nth(1).focus();await door.locator('input').nth(1).press('ArrowDown');
  assert.equal(await page.evaluate(()=>fixtures[0].offset),42.25);
  // The same interaction must keep the smaller-screen Properties drawer open.
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{document.activeElement.blur();StudioUI.changeUnit('in');StudioUI.select(0);});
  await door.locator('input').nth(1).fill('50');
  await door.locator('select').click();
  await door.locator('select').selectOption('left');
  assert.equal(await page.evaluate(()=>fixtures[0].offset),50);
  assert.equal(await page.locator('.studio-inspector').isVisible(),true);
  await page.evaluate(()=>{document.activeElement.blur();StudioUI.closeProperties();});
  assert.equal(await page.locator('.studio-inspector').isVisible(),false,'Explicit close still works');
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(project=>{ProjectState.apply(project,{rebase:true});setWorkspaceLayout('2d');updateCanvas();},original);
  console.log('Inspector: opening arrows, typed placement, wall changes, rollback selection, centimeters and feet/inches passed');
};
