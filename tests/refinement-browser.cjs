module.exports = async ({ page, assert }) => {
  const original = await page.evaluate(() => ({
    project: ProjectState.capture(),
    preferences: structuredClone(PlanningUI.preferences),
  }));
  await page.evaluate(() => {
    const p = ProjectState.capture();
    ProjectState.apply(
      {
        ...p,
        unit: "in",
        floorCount: 1,
        currentFloor: 0,
        elements: [
          {
            id: "garden-room",
            type: "bedroom",
            floor: 0,
            x: 20,
            y: 20,
            w: 180,
            h: 180,
          },
        ],
        fixtures: [],
        planning: PlanningModel.defaults(),
        design: DesignModel.defaults(),
        workbench: WorkbenchModel.defaults(),
      },
      { rebase: true },
    );
    setWorkspaceLayout("2d");
  });
  const brand = page.getByRole("link", { name: "ArchCAD Pro home" });
  assert.ok(await brand.isVisible());
  assert.equal(await brand.getAttribute("href"), "./");
  assert.ok((await brand.textContent()).includes("📐"));
  const toggle = page.locator("#tool-dock-toggle"),
    rail = page.locator("#workspace-rail");
  const collapsed = await rail.boundingBox();
  await rail.hover();
  await page.waitForTimeout(480);
  assert.ok((await rail.boundingBox()).width > collapsed.width + 100);
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  await page.mouse.move(700, 500);
  await page.waitForTimeout(300);
  assert.ok((await rail.boundingBox()).width < 60);
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-pressed"), "true");
  await page.mouse.move(700, 500);
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  assert.ok(
    await page
      .getByRole("button", { name: "Pan right", exact: true })
      .evaluate((button) => {
        const r = button.getBoundingClientRect();
        return (
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) ===
          button
        );
      }),
    "An expanded dock cannot block the pan controls",
  );
  await page.evaluate(() => WorkspacePolish.openBuild());
  await page.waitForTimeout(300);
  assert.ok(
    await page
      .locator("#studio-assets .studio-asset")
      .first()
      .evaluate((button) => {
        const r = button.getBoundingClientRect();
        return (
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) ===
          button
        );
      }),
    "A pinned dock cannot cover Build assets",
  );
  await page.evaluate(() => WorkspaceLayout.hideCatalog());
  await toggle.click();
  const build = page
    .locator(".planning-entry")
    .getByRole("button", { name: "Build", exact: true });
  await build.hover();
  await page.waitForTimeout(480);
  await build.click();
  await page.waitForTimeout(300);
  assert.equal(
    await toggle.getAttribute("aria-expanded"),
    "false",
    "Opening a tool closes the temporary expansion",
  );
  assert.ok(
    await page
      .locator("#studio-assets .studio-asset")
      .first()
      .evaluate((button) => {
        const r = button.getBoundingClientRect();
        return (
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) ===
          button
        );
      }),
    "Build assets remain reachable after opening from the expanded dock",
  );
  await page.evaluate(() => WorkspaceLayout.hideCatalog());
  await page.evaluate(() => PlanningUI.toolsDialog());
  const allTools = await page.evaluate(() => PlanningUI.tools().length);
  await page.getByRole("button", { name: "All", exact: true }).click();
  assert.equal(
    await page.locator(".refine-tool-row:visible").count(),
    allTools,
  );
  await page
    .getByRole("searchbox", { name: "Search all tools", exact: true })
    .fill("sun");
  assert.ok((await page.locator(".refine-tool-row:visible").count()) > 0);
  assert.ok(
    (await page.locator(".refine-tool-row:visible").count()) < allTools,
  );
  await page
    .getByRole("searchbox", { name: "Search all tools", exact: true })
    .fill("no-such-tool");
  assert.ok(await page.locator(".refine-empty").isVisible());
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.evaluate(() => PlanningUI.widgetsDialog());
  assert.equal(await page.getByRole("switch").count(), 8);
  await page.getByRole("searchbox", { name: "Search widgets" }).fill("floor");
  assert.equal(await page.getByRole("switch").count(), 1);
  await page.getByRole("switch").check();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  assert.equal(await page.locator("#main-workspace>#planning-dock").count(), 1);
  assert.equal(await page.locator("#workspace-rail #planning-dock").count(), 0);
  await page.evaluate(() => StudioEnhancements.hub());
  assert.equal(await page.locator(".enhancement-hub button").count(), 18);
  await page
    .getByRole("searchbox", { name: "Search Studio+ tools" })
    .fill("sun");
  assert.equal(
    await page.locator(".enhancement-hub button:visible").count(),
    1,
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("button", { name: "Manage floors", exact: true })
    .click();
  assert.equal(await page.locator(".refine-floor").count(), 1);
  assert.ok(
    await page
      .getByRole("button", { name: "Delete current floor", exact: true })
      .isDisabled(),
  );
  await page.getByRole("button", { name: "Add floor", exact: true }).click();
  assert.equal(await page.locator(".refine-floor").count(), 2);
  await page.locator(".floor-more summary").click();
  await page
    .getByRole("textbox", { name: "Floor name", exact: true })
    .fill("Upper studio");
  await page
    .getByRole("textbox", { name: "Floor name", exact: true })
    .press("Tab");
  assert.ok(
    (
      await page
        .getByRole("button", { name: "Manage floors", exact: true })
        .textContent()
    ).includes("Upper studio"),
  );
  await page.locator('.refine-floor[data-floor="0"]').click();
  assert.equal(await page.evaluate(() => currentFloor), 0);
  const floorBox = await page.locator("#studio-dialog").boundingBox();
  assert.ok(floorBox.width <= 312);
  await page.screenshot({ path: "/tmp/archcad-compact-floors.png" });
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.evaluate(() => {
    const p = ProjectState.capture();
    ProjectState.apply(
      {
        ...p,
        floorCount: 1,
        currentFloor: 0,
        elements: [
          {
            id: "garden-room",
            type: "bedroom",
            floor: 0,
            x: 20,
            y: 20,
            w: 230,
            h: 330,
          },
        ],
        fixtures: [],
        planning: PlanningModel.defaults(),
        design: DesignModel.defaults(),
      },
      { rebase: true },
    );
    StudioEnhancements.setExplosion(0);
  });
  const project = await page.evaluate(() => JSON.stringify(elements));
  await page.evaluate(() => setWorkspaceLayout("4d"));
  await page.waitForFunction(() => Engine4D.ready && Engine4D.landscape);
  assert.ok(
    (await page.locator("#advanced-view-panel").boundingBox()).width <= 60,
    "Collapsed 4D launcher must not keep the panel width",
  );
  assert.equal(
    await page.evaluate(
      () => Engine3D.scene.getObjectByName("4D exterior garden") !== undefined,
    ),
    false,
  );
  assert.equal(await page.evaluate(() => JSON.stringify(elements)), project);
  assert.ok(
    await page.evaluate(() => Engine4D.landscapePlan.plants.length > 0),
  );
  assert.ok(
    await page.evaluate(() => {
      const mesh = Engine4D.landscape.children.find((c) => !c.isInstancedMesh);
      return mesh.geometry.attributes.normal.getY(0) > 0.9;
    }),
  );
  const widgetBox = await page.locator("#planning-dock").boundingBox(),
    advanced = await page.locator("#advanced-view-panel").boundingBox();
  assert.ok(advanced.x >= widgetBox.x + widgetBox.width + 4);
  await page.evaluate(() => {
    WorkspaceLayout.hideCatalog();
    StudioUI.closeProperties();
    ViewportUI.fit(false);
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/archcad-garden-4d.png" });
  await page.evaluate(() => {
    window.gardenDisposed = 0;
    Engine4D.landscape.traverse((o) => {
      if (o.geometry)
        o.geometry.addEventListener("dispose", () => window.gardenDisposed++);
    });
    Engine4D.toggleLandscape(false);
  });
  assert.equal(await page.evaluate(() => Engine4D.landscape), null);
  assert.ok(await page.evaluate(() => gardenDisposed > 0));
  await page.evaluate(() => {
    Engine4D.toggleLandscape(true);
    setWorkspaceLayout("2d");
  });
  assert.equal(await page.evaluate(() => Engine4D.landscape), null);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(300);
    const boxes = await page
      .locator(".studio-header > *")
      .evaluateAll((nodes) =>
        nodes
          .filter((n) => n.getClientRects().length)
          .map((n) => {
            const r = n.getBoundingClientRect();
            return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
          }),
      );
    for (const b of boxes)
      assert.ok(
        b.x >= 0 && b.right <= width + 1,
        `Header fits ${width}: ${JSON.stringify(boxes)}`,
      );
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        assert.ok(
          a.right <= b.x + 1 ||
            b.right <= a.x + 1 ||
            a.bottom <= b.y + 1 ||
            b.bottom <= a.y + 1,
          `Header controls cannot overlap at ${width}`,
        );
      }
    assert.ok(await brand.isVisible());
    if (width === 320)
      await page.screenshot({ path: "/tmp/archcad-dock-mobile.png" });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const id = await page.evaluate(() => elements[0].id);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    brand.click(),
  ]);
  await page.waitForFunction(
    () => typeof StudioUI !== "undefined" && StudioUI.ready,
  );
  assert.equal(
    await page.evaluate(() => elements[0].id),
    id,
    "Home keeps the saved project",
  );
  await page.evaluate((original) => {
    ProjectState.apply(original.project, { rebase: true });
    PlanningUI.preferences = original.preferences;
    PlanningUI.savePrefs();
    PlanningUI.applyPrefs();
    PlanningUI.refresh();
  }, original);
  console.log(
    "Refinement: restored brand/home, expanding dock, searchable categories, workspace widgets, floor management, responsive header and independent disposable 4D landscaping passed",
  );
};
