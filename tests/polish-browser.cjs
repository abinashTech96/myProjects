module.exports = async ({ page, assert }) => {
  const original = await page.evaluate(() => ({
      project: ProjectState.capture(),
      theme: document.body.dataset.uiTheme,
      density: document.body.dataset.uiDensity,
    })),
    viewport = page.viewportSize();
  const contrast = (a, b) => {
    const luminance = (rgb) =>
      rgb
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const backgrounds = new Set();
  await page.evaluate(() => StudioEnhancements.themeDialog());
  assert.equal(await page.locator("[data-theme-choice]").count(), 4);
  for (const theme of ["graphite", "pearl", "ocean", "sand"]) {
    await page.locator(`[data-theme-choice="${theme}"]`).click();
    await page.waitForTimeout(150);
    assert.equal(
      await page
        .locator(`[data-theme-choice="${theme}"]`)
        .getAttribute("aria-pressed"),
      "true",
    );
    const colors = await page.evaluate(() => {
      const style = getComputedStyle(document.body),
        rgb = (value) =>
          value
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number),
        header = getComputedStyle(document.querySelector(".studio-header"));
      return {
        text: rgb(header.color),
        background: rgb(header.backgroundColor),
        canvases: ["2d", "3d", "4d"].map((m) =>
          style.getPropertyValue("--canvas-" + m).trim(),
        ),
      };
    });
    assert.ok(
      contrast(colors.text, colors.background) >= 4.5,
      theme + " header text must be readable",
    );
    const selected = await page.locator(`[data-theme-choice="${theme}"]`).evaluate(n => {
      const rgb = value => value.match(/[\d.]+/g).slice(0,3).map(Number);
      return {text: rgb(getComputedStyle(n.querySelector('strong')).color), note: rgb(getComputedStyle(n.querySelector('small')).color), background: rgb(getComputedStyle(n).backgroundColor)};
    });
    assert.ok(contrast(selected.text,selected.background) >= 4.5,theme+' selected card title '+JSON.stringify(selected));
    assert.ok(contrast(selected.note,selected.background) >= 4.5,theme+' selected card note '+JSON.stringify(selected));
    colors.canvases.forEach((c) => backgrounds.add(c));
  }
  assert.equal(
    backgrounds.size,
    12,
    "Each theme and each drawing/rendering mode has a distinct canvas",
  );
  await page.getByRole("button", { name: "Comfortable", exact: true }).click();
  const comfortable = await page
    .locator('[data-mode="2d"]')
    .evaluate((n) => n.getBoundingClientRect().height);
  await page.getByRole("button", { name: "Compact", exact: true }).click();
  assert.ok(
    comfortable >
      (await page
        .locator('[data-mode="2d"]')
        .evaluate((n) => n.getBoundingClientRect().height)),
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("ArchCAD_Control_Density")),
    "compact",
  );
  await page.evaluate(() => StudioEnhancements.close());
  await page.evaluate(() => {
    const p = ProjectState.capture();
    ProjectState.apply(
      {
        ...p,
        elements: [],
        fixtures: [],
        floorCount: 1,
        currentFloor: 0,
        planning: PlanningModel.defaults(),
        design: DesignModel.defaults(),
        workbench: WorkbenchModel.defaults(),
      },
      { rebase: true },
    );
  });
  await page.locator('[data-mode="2d"]').focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => StudioUI.mode === "split" && Engine3D.scene);
  assert.equal(await page.locator("#viewport-empty-state").isVisible(), true);
  const separator = page.getByRole("separator", {
    name: "Resize plan and model panes",
    exact: true,
  });
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await separator.getAttribute("aria-valuenow"), "55");
  const ratio = await page.evaluate(
    () =>
      document.getElementById("canvas-wrapper").getBoundingClientRect().width /
      document.getElementById("main-workspace").getBoundingClientRect().width,
  );
  assert.ok(Math.abs(ratio - 0.55) < 0.02);
  await separator.dblclick();
  assert.equal(await separator.getAttribute("aria-valuenow"), "50");
  const rect = await separator.boundingBox(),
    workspace = await page.locator("#main-workspace").boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    workspace.x + workspace.width * 0.62,
    rect.y + rect.height / 2,
    { steps: 4 },
  );
  await page.mouse.up();
  assert.ok(
    Math.abs(Number(await separator.getAttribute("aria-valuenow")) - 62) <= 1,
  );
  await page.evaluate(() => setWorkspaceLayout("2d"));
  const fullRatio = await page.evaluate(
    () =>
      document.getElementById("canvas-wrapper").getBoundingClientRect().width /
      document.getElementById("main-workspace").getBoundingClientRect().width,
  );
  assert.ok(fullRatio > 0.98, "Leaving Split restores the full plan width");
  await page.evaluate(() => {
    CanvasState.zoomLvl = 1;
    updateViewport();
  });
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  assert.equal(await page.locator("#nav-zoom-value").textContent(), "125%");
  await page
    .getByRole("button", { name: "Reset plan zoom to 100%", exact: true })
    .click();
  assert.equal(await page.locator("#nav-zoom-value").textContent(), "100%");
  await page.evaluate(() => {
    PlanningUI.zoom(0.01);
  });
  assert.equal(
    await page
      .getByRole("button", { name: "Zoom out", exact: true })
      .isDisabled(),
    true,
  );
  await page.evaluate(() => PlanningUI.zoom(100));
  assert.equal(
    await page
      .getByRole("button", { name: "Zoom in", exact: true })
      .isDisabled(),
    true,
  );
  await page.evaluate(() => {
    PlanningUI.zoom(1 / CanvasState.zoomLvl);
    WorkspacePolish.openBuild();
  });
  await page
    .getByRole("textbox", { name: "Search assets", exact: true })
    .fill("no-such-room-987654");
  assert.equal(await page.locator(".catalog-empty").isVisible(), true);
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  assert.ok((await page.locator(".studio-asset").count()) > 0);
  await page.evaluate(() => {
    StudioUI.changeUnit("cm");
    StudioUI.renderCatalog();
  });
  assert.match(
    await page.locator(".studio-asset small").first().textContent(),
    /cm/,
  );
  await page.evaluate(() => {
    const p = ProjectState.capture();
    ProjectState.apply(
      {
        ...p,
        unit: "in",
        plot: { ...p.plot, inW: "420", inH: "320" },
        elements: [
          {
            id: "polish-bedroom",
            type: "bedroom",
            customName: "Bedroom",
            x: 20,
            y: 20,
            w: 180,
            h: 180,
            floor: 0,
          },
          {
            id: "polish-lounge",
            type: "living",
            customName: "Lounge",
            x: 220,
            y: 20,
            w: 160,
            h: 180,
            floor: 0,
          },
        ],
        fixtures: [],
      },
      { rebase: true },
    );
    if (!document.body.classList.contains("catalog-collapsed"))
      PlanningUI.collapse("catalog");
    StudioUI.select(-1);
    StudioUI.fitPlan();
  });
  const geometry = await page.evaluate(() =>
    JSON.stringify(ProjectState.capture().elements),
  );
  for (const theme of ["graphite", "pearl", "ocean", "sand"]) {
    await page.evaluate((t) => {
      StudioEnhancements.theme(t);
      setWorkspaceLayout("2d");
    }, theme);
    await page.screenshot({ animations: "disabled", path: `/tmp/archcad-polish-${theme}-2d.png` });
    assert.equal(
      await page
        .locator("#road-text")
        .evaluate((n) => getComputedStyle(n).fill),
      "rgb(255, 255, 255)",
    );
    for (const mode of ["3d", "4d"]) {
      await page.evaluate((m) => setWorkspaceLayout(m), mode);
      await page.waitForFunction(
        (mode) =>
          mode === "3d"
            ? Engine3D.buildingGroup
            : Engine4D.ready && Engine4D.model,
        mode,
      );
      await page.evaluate(() => {
        StudioEnhancements.clearRoom();
        ViewportUI.orient("iso", false);
      });
      const pixel = await page.evaluate((mode) => {
        const engine = mode === "4d" ? Engine4D : Engine3D;
        mode === "4d"
          ? engine.render(Engine3D.camera)
          : engine.renderer.render(engine.scene, Engine3D.camera);
        const gl = engine.renderer.getContext(),
          pixels = new Uint8Array(4);
        gl.readPixels(
          4,
          gl.drawingBufferHeight - 4,
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixels,
        );
        return {
          actual: [...pixels],
          expected: new THREE.Color(StudioEnhancements.viewportBackground(mode))
            .toArray()
            .map((v) => Math.round(v * 255)),
        };
      }, mode);
      assert.ok(
        pixel.expected.every((v, i) => Math.abs(v - pixel.actual[i]) <= 8),
        theme + " " + mode + " actual backdrop " + JSON.stringify(pixel),
      );
      await page.screenshot({
        path: `/tmp/archcad-polish-${theme}-${mode}.png`,
      });
    }
  }
  assert.equal(
    await page.evaluate(() => JSON.stringify(ProjectState.capture().elements)),
    geometry,
    "Theme and view refinements preserve geometry",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator('[data-mode="2d"]')
      .evaluate((n) => getComputedStyle(n).transitionDuration),
    "0s",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({width:390,height:740});
  await page.evaluate(() => { if (!StudioEnhancements.linked) StudioEnhancements.toggleLinked(); });
  await separator.focus(); await page.keyboard.press('ArrowDown');
  const verticalRatio = await page.evaluate(() => document.getElementById('canvas-wrapper').getBoundingClientRect().height / document.getElementById('main-workspace').getBoundingClientRect().height);
  assert.ok(Math.abs(verticalRatio - Number(await separator.getAttribute('aria-valuenow')) / 100) < .03,'Linked mobile panes must respect the resized vertical split');
  assert.equal(await separator.getAttribute('aria-orientation'),'horizontal');
  await page.evaluate(() => StudioEnhancements.toggleLinked());
  for (const size of [
    { width: 390, height: 740 },
    { width: 320, height: 740 },
    { width: 600, height: 360 },
    { width: 900, height: 700 },
  ]) {
    await page.setViewportSize(size);
    await page.evaluate(() => StudioEnhancements.themeDialog());
    const box = await page.locator("#studio-dialog").boundingBox();
    assert.ok(
      box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= size.width + 1 &&
        box.y + box.height <= size.height + 1,
    );
    assert.equal(
      await page.locator("#studio-dialog").getAttribute("aria-labelledby"),
      "workspace-dialog-title",
    );
    await page.screenshot({
      animations: "disabled",
      path: `/tmp/archcad-polish-dialog-${size.width}.png`,
    });
    await page.evaluate(() => StudioEnhancements.close());
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Workspace must not overflow horizontally",
    );
  }
  await page.setViewportSize(viewport);
  await page.evaluate(({ project, theme, density }) => {
    StudioEnhancements.clearRuntime();
    ProjectState.apply(project, { rebase: true });
    StudioEnhancements.theme(theme || "graphite");
    WorkspacePolish.density(density || "compact");
    setWorkspaceLayout("2d");
  }, original);
  console.log(
    "Workspace polish: twelve canvas palettes and actual render pixels, contrast, theme previews, density, keyboard modes, pointer/keyboard splitter, zoom controls, catalog recovery/units, reduced motion and responsive dialogs passed",
  );
};
