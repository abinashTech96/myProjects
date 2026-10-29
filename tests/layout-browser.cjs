module.exports = async ({ page, assert }) => {
  const original = await page.evaluate(() => ({
      project: ProjectState.capture(),
      appearance: structuredClone(WorkspaceLayout.appearancePrefs),
      layout: structuredClone(WorkspaceLayout.layout),
      theme: document.body.dataset.uiTheme,
      density: document.body.dataset.uiDensity,
      sunStudy: StudioEnhancements.sunStudy,
      sunKey: StudioEnhancements.sunKey,
      sunPosition: StudioEnhancements.sunPosition,
    })),
    viewport = page.viewportSize();
  await page.evaluate(() => {
    StudioEnhancements.sunStudy = false;
    StudioEnhancements.sunKey = null;
    const p = ProjectState.capture();
    ProjectState.apply(
      {
        ...p,
        elements: [
          {
            id: "layout-room",
            type: "bedroom",
            x: 20,
            y: 20,
            w: 180,
            h: 180,
            floor: 0,
          },
        ],
        fixtures: [],
        floorCount: 1,
        currentFloor: 0,
        unit: "in",
        plot: { ...p.plot, inW: "420", inH: "320" },
        planning: PlanningModel.defaults(),
        design: DesignModel.defaults(),
        workbench: WorkbenchModel.defaults(),
      },
      { rebase: true },
    );
    setWorkspaceLayout("2d");
    StudioUI.select(0);
  });
  const geometry = await page.evaluate(() => JSON.stringify(elements));
  assert.equal(
    await page
      .locator(".studio-view-modes")
      .evaluate((n) => getComputedStyle(n).backgroundColor),
    "rgba(0, 0, 0, 0)",
  );
  assert.equal(
    await page
      .locator(".studio-view-modes")
      .evaluate((n) => getComputedStyle(n).boxShadow),
    "none",
  );
  assert.equal(
    await page.locator("#workspace-rail .planning-entry button").count(),
    6,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Manage floors", exact: true })
      .textContent(),
    "Ground ▾",
  );
  const up = await page
      .getByRole("button", { name: "Pan up", exact: true })
      .boundingBox(),
    left = await page
      .getByRole("button", { name: "Pan left", exact: true })
      .boundingBox(),
    fit = await page
      .getByRole("button", { name: "Fit plot", exact: true })
      .boundingBox();
  assert.ok(up.y < fit.y && left.x < fit.x);
  const beforePan = await page.evaluate(() => CanvasState.panX);
  await page.getByRole("button", { name: "Pan right", exact: true }).click();
  assert.notEqual(await page.evaluate(() => CanvasState.panX), beforePan);
  const right = await page
    .getByRole("button", { name: "Pan right", exact: true })
    .boundingBox();
  await page.mouse.move(right.x + right.width / 2, right.y + right.height / 2);
  await page.mouse.down();
  try {
    await page.waitForFunction(
      (start) => Math.abs(CanvasState.panX - start) > 48,
      beforePan,
      { timeout: 5000 },
    );
  } finally {
    await page.mouse.up();
  }
  assert.ok(
    Math.abs((await page.evaluate(() => CanvasState.panX)) - beforePan) > 48,
    "Holding pan continues smoothly",
  );
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.waitForFunction(() =>
    document.getElementById("workspace-appearance").matches(":popover-open"),
  );
  const appearance = page.locator("#workspace-appearance"),
    footer = await page.locator(".studio-status").boundingBox(),
    box = await appearance.boundingBox();
  assert.ok(
    Math.abs(box.y + box.height - footer.y) <= 2,
    "Appearance attaches to footer",
  );
  assert.equal(await page.locator("[data-theme-choice]").count(), 6);
  for (const theme of ["pearl", "ocean", "sand", "graphite"]) {
    await page.locator(`[data-theme-choice="${theme}"]`).click();
    assert.equal(
      await page
        .locator(`[data-theme-choice="${theme}"]`)
        .getAttribute("aria-pressed"),
      "true",
    );
  }
  await page.getByLabel("2D grid", { exact: true }).uncheck();
  assert.equal(
    await page
      .locator('#viewport > rect[fill="url(#grid)"]')
      .evaluate((n) => getComputedStyle(n).display),
    "none",
  );
  await page.getByLabel("Drawing labels", { exact: true }).uncheck();
  assert.equal(
    await page.evaluate(() => CanvasControlsEngine.showLabels()),
    false,
  );
  await page.getByLabel("Drawing labels", { exact: true }).check();
  await page.getByLabel("Room label size", { exact: true }).fill("150");
  assert.equal(
    await page.locator("#txt-title-0").getAttribute("font-size"),
    "18",
  );
  await page.getByLabel("2D background", { exact: true }).fill("#243142");
  assert.equal(
    await page
      .locator("#blueprint")
      .evaluate((n) => getComputedStyle(n).backgroundColor),
    "rgb(36, 49, 66)",
  );
  await page
    .getByRole("button", { name: "Reset theme backgrounds", exact: true })
    .click();
  assert.notEqual(
    await page
      .locator("#blueprint")
      .evaluate((n) => getComputedStyle(n).backgroundColor),
    "rgb(36, 49, 66)",
  );
  const selected = await page.evaluate(() => elements[selectedElIndex]?.id);
  await page.keyboard.press("Escape");
  assert.equal(
    await page.evaluate(() => elements[selectedElIndex]?.id),
    selected,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Appearance", exact: true })
      .getAttribute("aria-expanded"),
    "false",
  );
  await page.getByRole("button", { name: "Sunlight", exact: true }).click();
  assert.equal(
    await appearance.evaluate((n) => n.matches(":popover-open")),
    false,
  );
  await page.getByRole("button", { name: "25%", exact: true }).click();
  assert.equal(
    await page.evaluate(() => ProjectState.meta.design.presentation.sunlight),
    25,
  );
  await page
    .getByRole("spinbutton", { name: "Sunlight percentage", exact: true })
    .fill("41");
  await page
    .getByRole("spinbutton", { name: "Sunlight percentage", exact: true })
    .press("ArrowDown");
  await page
    .getByRole("spinbutton", { name: "Sunlight percentage", exact: true })
    .blur();
  assert.equal(
    await page.evaluate(() => ProjectState.meta.design.presentation.sunlight),
    40,
  );
  await page.getByLabel("Sunlight strength", { exact: true }).focus();
  await page
    .getByLabel("Sunlight strength", { exact: true })
    .dispatchEvent("wheel", { deltaY: -100, shiftKey: true });
  assert.equal(
    await page.getByLabel("Sunlight strength", { exact: true }).inputValue(),
    "45",
    "Focused sunlight slider follows wheel adjustments",
  );
  await page.waitForFunction(
    () => ProjectState.meta.design.presentation.sunlight === 45,
  );
  await page.evaluate(() => ProjectState.undo());
  assert.equal(
    await page.evaluate(() => ProjectState.meta.design.presentation.sunlight),
    40,
  );
  await page.evaluate(() => ProjectState.redo());
  assert.equal(
    await page.evaluate(() => ProjectState.meta.design.presentation.sunlight),
    45,
  );
  await page
    .getByRole("button", { name: "Close sunlight", exact: true })
    .click();
  await page.locator('[data-mode="3d"]').click();
  await page.waitForFunction(
    () => Engine3D.buildingGroup && Engine3D.renderFrames > 0,
  );
  await page.waitForFunction(() => !Engine3D.modelDirty);
  await page.evaluate(() => (window.layoutSunGroup = Engine3D.buildingGroup));
  await page.getByRole("button", { name: "Sunlight", exact: true }).click();
  await page.getByRole("button", { name: "0%", exact: true }).click();
  await page.waitForFunction(() => !Engine3D.modelDirty);
  assert.equal(
    await page.evaluate(() => window.layoutSunGroup === Engine3D.buildingGroup),
    true,
    "Brightness changes retain existing model meshes",
  );
  await page.waitForFunction(() => Engine3D.sunLight.intensity === 0);
  await page.getByRole("button", { name: "100%", exact: true }).click();
  await page.waitForFunction(() => Engine3D.sunLight.intensity > 0);
  await page.getByRole("button", { name: "50%", exact: true }).click();
  const lightCycle = await page.evaluate(() => {
    const light = Engine3D.sunLight;
    Workbench3D.lighting(false);
    const day = light.intensity;
    for (let i = 0; i < 3; i++) {
      Workbench3D.lighting(true);
      Workbench3D.lighting(false);
    }
    return { day, actual: light.intensity, base: light.userData.wbIntensity };
  });
  assert.ok(
    Math.abs(lightCycle.actual - lightCycle.day) < 1e-8 &&
      Math.abs(lightCycle.actual - lightCycle.base * 0.5) < 1e-8,
    "Day/night cycles preserve brightness without compounding",
  );
  const legacyCycle = await page.evaluate(() => {
    const day = ARCH_CONFIG.REFINEMENTS.DAY_MODE_SUN_INTENSITY;
    const night = ARCH_CONFIG.REFINEMENTS.NIGHT_MODE_SUN_INTENSITY;
    const strength = night / day;
    WorkspaceLayout.setSun(strength * 100);
    Widget3DEngine.isNightMode = true;
    Widget3DEngine.toggleNightMode();
    Widget3DEngine.toggleNightMode();
    const actual = Engine3D.sunLight.intensity;
    Widget3DEngine.toggleNightMode();
    WorkspaceLayout.setSun(100);
    return { actual, expected: night * strength };
  });
  assert.ok(
    Math.abs(legacyCycle.actual - legacyCycle.expected) < 1e-8,
    "Night/day control respects custom brightness when raw light values coincide",
  );
  await page
    .getByRole("button", { name: "Close sunlight", exact: true })
    .click();
  await page.locator('[data-mode="4d"]').click();
  await page.locator("#fourd-start").click();
  await page.waitForFunction(() => Engine4D.ready && !FourDWorkspace.starting && Engine4D.frames > 0);
  assert.equal(await page.locator('#fourd-toolbar').isVisible(),true);
  assert.equal(await page.locator('#advanced-view-panel').isVisible(),false);
  await page.evaluate(()=>{ViewportUI.fit(false,false);WorkspaceLayout.setSun(50);});
  await page.waitForFunction(()=>Math.abs(Engine4D.key.intensity-Engine4D.baseSunIntensity*.5)<1e-6);
  const study = await page.evaluate(() => {
    StudioEnhancements.sunStudy = true;
    StudioEnhancements.sunKey = null;
    StudioEnhancements.applyPresentation();
    const expected =
      3.2 *
      Math.max(
        0,
        Math.sin((StudioEnhancements.sunPosition.altitude * Math.PI) / 180),
      ) *
      0.5;
    const actual = Engine4D.key.intensity;
    StudioEnhancements.sunStudy = false;
    Engine4D.setPreset(Engine4D.preset);
    StudioEnhancements.applyPresentation();
    return { expected, actual };
  });
  assert.ok(
    Math.abs(study.actual - study.expected) < 1e-8,
    "Sun study direction/daylight and custom strength compose correctly",
  );
  await page.evaluate(()=>WorkspaceLayout.setSun(0));
  await page.waitForFunction(()=>Engine4D.key.intensity===0);
  await page.evaluate(() => {
    setWorkspaceLayout("2d");
    WorkspaceLayout.layout.pins.catalog = true;
    WorkspaceLayout.pinState();
    if (!WorkspaceLayout.catalogOpen()) PlanningUI.collapse("catalog");
  });
  await page.locator('[data-mode="3d"]').click();
  assert.equal(await page.locator(".studio-catalog").isVisible(), false);
  await page.locator('[data-mode="2d"]').click();
  assert.equal(await page.locator(".studio-catalog").isVisible(), true);
  await page
    .getByRole("button", { name: "Pin Build panel", exact: true })
    .click();
  await page.locator("#blueprint").dispatchEvent("pointerdown", {
    clientX: 500,
    clientY: 500,
    button: 0,
    pointerId: 2,
  });
  assert.equal(await page.locator(".studio-catalog").isVisible(), false);
  await page.evaluate(() => WorkspaceLayout.restoreLayout());
  assert.equal(
    await page.evaluate(() => JSON.stringify(elements)),
    geometry,
    "UI and sunlight preserve geometry",
  );
  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 740 },
    { width: 320, height: 740 },
    { width: 600, height: 360 },
  ]) {
    await page.setViewportSize(size);
    await page.evaluate(() => setWorkspaceLayout("3d"));
    await page.getByRole("button", { name: "Appearance", exact: true }).click();
    const r = await appearance.boundingBox(),
      f = await page.locator(".studio-status").boundingBox();
    assert.ok(
      r.x >= 0 &&
        r.y >= 0 &&
        r.x + r.width <= size.width + 1 &&
        Math.abs(r.y + r.height - f.y) <= 2,
    );
    await page.screenshot({
      path: `/tmp/archcad-layout-appearance-${size.width}.png`,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Sunlight", exact: true }).click();
    assert.equal(
      await appearance.evaluate((n) => n.matches(":popover-open")),
      false,
    );
    const rail = page.locator("#workspace-rail");
    await page
      .getByRole("button", { name: "Studio upgrades", exact: true })
      .scrollIntoViewIfNeeded();
    const railBounds = await rail.boundingBox();
    const studioBounds = await page
      .getByRole("button", { name: "Studio upgrades", exact: true })
      .boundingBox();
    assert.ok(
      studioBounds.y >= railBounds.y &&
        studioBounds.y + studioBounds.height <=
          railBounds.y + railBounds.height + 1,
      "Rail tools remain reachable in short viewports",
    );
    await page.screenshot({
      path: `/tmp/archcad-layout-sun-${size.width}.png`,
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  await page.setViewportSize(viewport);
  await page.evaluate((o) => {
    WorkspaceLayout.closeFooter(false);
    WorkspaceLayout.sunPreview = null;
    StudioEnhancements.clearRuntime();
    StudioEnhancements.sunStudy = o.sunStudy;
    StudioEnhancements.sunKey = o.sunKey;
    StudioEnhancements.sunPosition = o.sunPosition;
    ProjectState.apply(o.project, { rebase: true });
    WorkspaceLayout.appearancePrefs = o.appearance;
    WorkspaceLayout.layout = o.layout;
    StudioEnhancements.theme(o.theme || "graphite");
    WorkspacePolish.density(o.density || "compact");
    setWorkspaceLayout("2d");
    WorkspaceLayout.applyAppearance();
  }, original);
  console.log(
    "Layout release: transparent modes, cross controls, rail, attached Appearance/Sunlight, presets/custom wheel/history, real 3D/4D intensity, compact 4D, visible framing, pinning/per-mode layouts and responsive footer panels passed",
  );
};
