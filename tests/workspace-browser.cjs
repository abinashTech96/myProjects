/* Homepage navigation and renderer lifecycle regression checks. */
module.exports = async ({ page, assert }) => {
  assert.equal(await page.evaluate(() => StudioUI.mode), "2d");
  assert.equal(await page.evaluate(() => !!Engine3D.scene), false);
  await page.evaluate(() => {
    Workbench3D.disableEdit();
    Workbench3D.clearSection();
    Workbench3D.clearIsolation();
  });
  assert.equal(await page.evaluate(() => !!Engine3D.scene), false);
  assert.equal(await page.locator("#planning-dock .planning-widget").count(), 0);
  assert.equal(await page.locator(".studio-catalog").isVisible(), false);
  assert.equal(await page.locator(".studio-inspector").isVisible(), false);
  assert.deepEqual(await page.locator(".planning-entry button").allTextContents(), ["Build", "Tools", "Search"]);
  await page.screenshot({ path: "/tmp/archcad-simple-desktop.png" });
  await page.locator('.studio-file-actions').getByRole('button', { name: 'Project', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Open project', exact: true }).isVisible(), true);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: 'Manage floors', exact: true }).click();
  await page.getByRole('button', { name: 'Add floor', exact: true }).click();
  assert.equal(await page.evaluate(() => Number(document.getElementById('b-floors').value)), 2);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.evaluate(() => undoAction());
  await page.locator(".planning-entry button").getByText("Build", { exact: true }).click();
  assert.equal(await page.locator(".studio-catalog").isVisible(), true);
  await page.locator("#studio-assets .studio-asset").first().click();
  assert.equal(await page.locator(".studio-inspector").isVisible(), true);
  await page.locator('#studio-asset-kind').selectOption('openings');
  await page.getByRole('button', { name: 'Add door', exact: true }).click();
  assert.equal(await page.evaluate(() => fixtures.length), 1);
  await page.evaluate(() => { undoAction(); StudioUI.select(0); });
  await page.locator('#studio-asset-kind').selectOption('rooms');
  await page.getByRole("button", { name: "Close properties", exact: true }).click();
  assert.equal(await page.locator(".studio-inspector").isVisible(), false);
  await page.evaluate(() => { undoAction(); PlanningUI.collapse('catalog'); });
  await page.locator(".planning-entry button").getByText("Tools", { exact: true }).click();
  assert.ok(await page.locator(".planning-tool-list button").count() > 10);
  await page.getByRole("button", { name: "Widgets", exact: true }).click();
  await page.locator('#studio-dialog input[type="checkbox"]').first().check();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  assert.equal(await page.locator("#planning-dock .planning-widget").count(), 1);
  await page.evaluate(() => PlanningUI.toggleWidget('checks', false));
  await page.locator('[data-mode="3d"]').click();
  await page.waitForFunction(() => Engine3D.buildingGroup && Workbench3D.controls);
  assert.equal(await page.evaluate(() => Engine3D.loopRunning), true);
  await page.locator('[data-mode="2d"]').click();
  assert.equal(await page.evaluate(() => Engine3D.loopRunning), false);
  await page.locator('[data-mode="3d"]').click();
  assert.equal(await page.evaluate(() => Engine3D.loopRunning), true);
  assert.equal(await page.locator('#three-container canvas').count(), 1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await page.evaluate(() => Engine3D.loopRunning), false);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await page.evaluate(() => Engine3D.loopRunning), true);
  await page.locator('[data-mode="2d"]').click();
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const sections = await page.locator('.studio-header > *:visible').all();
    const rects = await Promise.all(sections.map(section => section.boundingBox()));
    for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) {
      const x = rects[a], y = rects[b];
      assert.ok(x.x + x.width <= y.x + 1 || y.x + y.width <= x.x + 1 || x.y + x.height <= y.y + 1 || y.y + y.height <= x.y + 1, 'Header sections do not overlap');
    }
    assert.equal(await page.locator('.studio-file-actions > button').getByText('Save', { exact: true }).isVisible(), true);
    const header = await page.locator('.studio-header').boundingBox();
    for (const button of await page.locator('.studio-header button:visible').all()) {
      const box = await button.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1, 'Header button fits viewport');
      assert.ok(box.y + box.height <= header.y + header.height + 1, 'Header button fits header');
    }
    await page.locator('.planning-entry button').getByText('Build', { exact: true }).click();
    assert.equal(await page.locator('.studio-catalog').isVisible(), true);
    await page.locator('#studio-assets .studio-asset').first().click();
    assert.equal(await page.locator('.studio-catalog').isVisible(), false);
    assert.equal(await page.locator('.studio-inspector').isVisible(), true);
    await page.getByRole('button', { name: 'Close properties', exact: true }).click();
    await page.evaluate(() => undoAction());
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/archcad-simple-mobile.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  console.log('Simple workspace: navigation, contextual panels, widgets, 3D suspend/resume and responsive header passed');
};
