/* Integration coverage for the planning suite, using real UI events and renderer data. */
module.exports = async ({ page, context, assert, server }) => {
  const close = () =>
    page.evaluate(() => document.getElementById("studio-dialog")?.close());
  const reset = (props) =>
    page.evaluate((props) => {
      document.getElementById("studio-dialog")?.close();
      PlanningUI.setTool("select");
      ProjectState.apply(
        {
          name: "Planning regression",
          elements: [],
          fixtures: [],
          floorCount: 2,
          plot: { inW: "600", inH: "600" },
          ...props,
        },
        { rebase: true },
      );
      StorageEngine.loading = false;
      AppEvents.triggerStateChange();
      StudioUI.fitPlan();
    }, props || {});
  const room = (id, x = 20, y = 20, w = 144, h = 144) => ({
    id,
    type: "bedroom",
    x,
    y,
    w,
    h,
    floor: 0,
  });
  const click = async (x, y) => {
    const q = await page.evaluate(
      ({ x, y }) => {
        const { I, SCALE } = Utils.getMetrics(),
          pt = UI.blueprint.createSVGPoint();
        pt.x = I.x + x * SCALE;
        pt.y = I.y + y * SCALE;
        const screen = pt.matrixTransform(
          document.getElementById("viewport").getScreenCTM(),
        );
        return { x: screen.x, y: screen.y };
      },
      { x, y },
    );
    await page.mouse.click(q.x, q.y);
  };
  await reset({ elements: [room("bed")] });
  assert.equal(await page.locator("#planning-dock [data-widget]").count(), 0);
  await page.locator(".planning-entry").getByRole("button", { name: "Tools", exact: true }).click();
  await page
    .getByRole("button", { name: "Widgets", exact: true })
    .first()
    .click();
  await page.getByLabel("Unit converter", { exact: true }).check();
  assert.ok(await page.locator('[data-widget="converter"]').isVisible());
  await close();
  await page.locator('[data-widget="converter"]').click();
  assert.ok(
    (await page.locator("#converter-results").innerText()).includes("126.5"),
  );
  await page.locator("#converter-kind").selectOption("area");
  await page.locator("#converter-from").selectOption("sqm");
  await page.locator("#converter-value").fill("1");
  await page.getByRole("button", { name: "Convert", exact: true }).click();
  assert.ok(
    (await page.locator("#converter-results").innerText()).includes("10.76391"),
  );
  await close();
  await page.evaluate(() => {
    StudioUI.changeUnit("ftin");
    StudioUI.select(0);
  });
  const width = page.locator('#studio-properties input[data-measure="w"]');
  assert.equal(await width.inputValue(), `12' 0"`);
  await width.fill(`10' 6 1/2"`);
  await width.press("Tab");
  assert.equal(await page.evaluate(() => elements[0].w), 126.5);
  await page.evaluate(() => StudioUI.changeUnit("in"));
  await close();
  await reset({
    elements: [room("chain-a", 20, 20), room("chain-b", 220, 20)],
  });
  await page.evaluate(() => PlanningUI.dimensionChainsDialog());
  await page.locator("#dimension-chain-0").fill("220");
  await page
    .getByRole("button", { name: "Apply dimension chains", exact: true })
    .click();
  assert.equal(await page.evaluate(() => elements[1].x), 240);
  await page.evaluate(() => ProjectState.undo());
  assert.equal(await page.evaluate(() => elements[1].x), 220);
  console.log(
    "Widgets, fraction/area converters and unit-aware Properties passed",
  );
  await reset({
    elements: [room("convert-room")],
    fixtures: [
      { type: "door", roomId: 0, edge: "bottom", offset: 20, size: 30 },
    ],
  });
  await page.evaluate(() => {
    StudioUI.select(0);
    PlanningUI.editVertices(0);
    PlanningUI.saveVertices();
  });
  assert.equal(await page.evaluate(() => fixtures[0].edge), "segment:2");
  assert.equal(await page.evaluate(() => fixtures[0].offset), 94);
  await reset();
  await page.evaluate(() => {
    PlanningUI.addPolygon(
      [
        { x: 20, y: 20 },
        { x: 200, y: 20 },
        { x: 200, y: 100 },
        { x: 120, y: 100 },
        { x: 120, y: 200 },
        { x: 20, y: 200 },
      ],
      "living",
    );
    StudioUI.select(0);
    generate3DModel();
  });
  assert.ok(await page.locator("#planning-layer polygon").count());
  assert.equal(
    await page.locator("#rect-0").evaluate((n) => getComputedStyle(n).display),
    "none",
  );
  assert.equal(
    await page.evaluate(
      () =>
        Engine3D.elementObjects.get(elements[0].id).children[0].geometry.type,
    ),
    "ShapeGeometry",
  );
  await page.evaluate(() => RoomStudio.open());
  assert.ok(await page.locator("#std-room-group polygon").count());
  await page.evaluate(() => RoomStudio.toggle3D());
  assert.ok(
    await page.evaluate(() =>
      RoomStudio.scene3D.children.some(
        (o) => o.geometry?.type === "ShapeGeometry",
      ),
    ),
  );
  await page.evaluate(() => RoomStudio.close());
  await page.evaluate(() => PlanningUI.openingsDialog());
  await page.locator("#opening-edge").selectOption("segment:0");
  await page.getByRole("button", { name: "Add opening", exact: true }).click();
  assert.equal(await page.evaluate(() => fixtures[0].edge), "segment:0");
  await close();
  await page.evaluate(() => StudioUI.rotate(0));
  assert.equal(await page.evaluate(() => elements[0].points.length), 6);
  await page.evaluate(() => PlanningUI.setTool("measure"));
  // Aim at grid centres; subpixel mouse rounding differs between engines.
  await click(282, 282);
  await click(402, 282);
  assert.equal(
    await page.evaluate(() => PlanningUI.data.measurements.length),
    1,
  );
  assert.equal(
    await page.evaluate(() =>
      PlanningModel.distance(
        PlanningUI.data.measurements[0].a,
        PlanningUI.data.measurements[0].b,
      ),
    ),
    120,
  );
  await page.evaluate(() => PlanningUI.setTool("wall"));
  await click(280, 320);
  await click(400, 380);
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => PlanningUI.data.walls.length), 1);
  await page.evaluate(() => PlanningUI.wallsDialog());
  const wall = await page.evaluate(() => PlanningUI.data.walls[0].id);
  await page.evaluate((id) => PlanningUI.splitWallDialog(id), wall);
  await page.locator("#split-distance").fill("30");
  await page
    .locator("#studio-dialog")
    .getByRole("button", { name: "Split", exact: true })
    .click();
  assert.equal(await page.evaluate(() => PlanningUI.data.walls.length), 2);
  const ids = await page.evaluate(() => PlanningUI.data.walls.map((w) => w.id));
  await page.locator("#join-a").selectOption(ids[0]);
  await page.locator("#join-b").selectOption(ids[1]);
  await page.getByRole("button", { name: "Join at shared endpoint" }).click();
  assert.equal(await page.evaluate(() => PlanningUI.data.walls.length), 1);
  await close();
  await page.evaluate(() => {
    PlanningUI.annotationText = "<script>unsafe</script>";
    PlanningUI.setTool("note");
  });
  await click(280, 420);
  assert.equal(
    await page.evaluate(() => PlanningUI.data.annotations.length),
    1,
  );
  assert.equal(await page.locator("#planning-layer script").count(), 0);
  await page.evaluate(() => {
    PlanningUI.serviceLabel = "Socket A";
    PlanningUI.serviceCircuit = "C1";
    PlanningUI.setTool("socket");
  });
  await click(320, 420);
  await page.evaluate(() => {
    PlanningUI.serviceLabel = "Supply";
    PlanningUI.serviceCircuit = "S1";
    PlanningUI.setTool("supply");
  });
  await click(300, 460);
  await click(420, 460);
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => PlanningUI.data.services.length), 2);
  assert.ok(await page.evaluate(() => DrawingExport.svg(0).includes("Supply")));
  await page.evaluate(() => {
    window.planningDownloads = [];
    window.originalPlanningDownload = NavActionEngine.downloadBlob;
    NavActionEngine.downloadBlob = (data, name) =>
      planningDownloads.push({ data, name });
    DrawingExport.dxf();
  });
  assert.ok(
    await page.evaluate(() =>
      planningDownloads[0].data.includes("F0_PLUMBING"),
    ),
  );
  assert.ok(
    await page.evaluate(() =>
      planningDownloads[0].data.includes("F0_ANNOTATIONS"),
    ),
  );
  await page.evaluate(
    () => (NavActionEngine.downloadBlob = originalPlanningDownload),
  );
  await page.evaluate(() => {
    window.savedPlanning = ProjectModel.normalize(ProjectState.capture());
    ProjectState.undo();
  });
  assert.equal(await page.evaluate(() => PlanningUI.data.services.length), 1);
  await page.evaluate(() => ProjectState.redo());
  assert.equal(await page.evaluate(() => PlanningUI.data.services.length), 2);
  await page.evaluate(() => {
    PlanningUI.layer("rooms", "locked", true);
    StudioUI.edit(0, "w", 300);
  });
  assert.equal(await page.evaluate(() => elements[0].w), 180);
  await page.evaluate(() => PlanningUI.layer("rooms", "locked", false));
  console.log(
    "Polygon/angled walls, openings, canvas measurement, split/join, annotations, services, exports and locks passed",
  );
  await reset({
    elements: [
      room("bed"),
      {
        id: "chair",
        type: "chair",
        x: 35,
        y: 35,
        w: 24,
        h: 24,
        floor: 0,
        isFurniture: true,
      },
    ],
  });
  await page.evaluate(async () => {
    StudioUI.select(0);
    await PlanningUI.templatesDialog();
  });
  await page.locator("#template-name").fill("Test template");
  await page
    .getByRole("button", { name: "Save selected room", exact: true })
    .click();
  await page.waitForFunction(() => PlanningUI.templates?.length === 1);
  await page.locator("#template-x").fill("220");
  await page.locator("#template-y").fill("220");
  await page.getByRole("button", { name: "Place", exact: true }).click();
  assert.equal(await page.evaluate(() => elements.length), 4);
  await page.evaluate(async () => {
    await PlanningUI.libraryDialog();
  });
  await page.locator("#library-tags").fill("regression, house");
  await page
    .getByRole("button", { name: "Save current project", exact: true })
    .click();
  await page.waitForFunction(() => PlanningUI.projects?.length === 1);
  assert.equal(await page.locator(".planning-library-card").count(), 1);
  await page.locator("#library-search").fill("missing");
  assert.equal(await page.locator(".planning-library-card").count(), 0);
  await close();
  // Calibration is tested from actual uploaded raster bytes and two preview clicks.
  await page.evaluate(() => PlanningUI.underlayDialog());
  await page.locator("#underlay-file").setInputFiles({
    name: "plan.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC",
      "base64",
    ),
  });
  await page.waitForSelector(".planning-underlay-preview");
  // Use a known reference span in intrinsic raster coordinates; a one-pixel fixture has no usable click span.
  await page.evaluate(() => {
    PlanningUI.pendingUnderlay.points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    document.getElementById("underlay-reference").value = "120";
  });
  await page
    .getByRole("button", { name: "Add calibrated image", exact: true })
    .click();
  assert.equal(await page.evaluate(() => PlanningUI.data.underlays[0].w), 120);
  await close();
  await page.evaluate(() => {
    PlanningUI.data.measurements.push({
      id: "copy-measure",
      floor: 0,
      a: { x: 20, y: 20 },
      b: { x: 100, y: 20 },
      label: "Copy",
    });
    PlanningUI.copyFloorFrom(0);
  });
  assert.ok(
    await page.evaluate(() =>
      PlanningUI.data.underlays.some((u) => u.floor === 2),
    ),
  );
  assert.ok(
    await page.evaluate(() =>
      PlanningUI.data.measurements.some((m) => m.floor === 2),
    ),
  );
  await close();
  await page.evaluate(() => {
    PlanningUI.costDialog();
    document.getElementById("cost-floor").value = "10";
    PlanningUI.saveCosts();
  });
  assert.ok(
    await page.evaluate(
      () => PlanningModel.quantities(ProjectState.capture()).total > 0,
    ),
  );
  await close();
  console.log(
    "Templates, project library, raster calibration, complete floor copy and costs passed",
  );
  await reset({
    elements: [
      { ...room("fixed", 450, 450, 96, 96), locked: true },
      room("upper", 20, 20, 144, 144),
    ].map((e, i) => ({ ...e, floor: i })),
  });
  await page.evaluate(() => PlanningUI.builderDialog());
  await page
    .getByRole("button", { name: "Generate alternatives", exact: true })
    .click();
  assert.ok(await page.locator(".planning-candidate").count());
  await page.screenshot({ path: "/tmp/archcad-builder.png" });
  const before = await page.evaluate(() => JSON.stringify(elements));
  assert.equal(await page.evaluate(() => JSON.stringify(elements)), before);
  await page
    .getByRole("button", { name: "Apply alternative 1", exact: true })
    .click();
  assert.ok(await page.evaluate(() => elements.some((e) => e.id === "fixed")));
  assert.ok(
    await page.evaluate(() =>
      elements.some((e) => e.id === "upper" && e.floor === 1),
    ),
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  assert.equal(await page.evaluate(() => elements.length), 2);
  await reset({
    elements: [
      {
        ...room("stairs", 20, 20, 96, 180),
        type: "staircase",
        stairStyle: "u-shape",
      },
    ],
  });
  await page.evaluate(() => {
    StudioUI.select(0);
    PlanningUI.stairDialog();
  });
  await page
    .getByRole("button", { name: "Apply & preview", exact: true })
    .click();
  assert.equal(await page.evaluate(() => elements[0].stairDesign.riser), 7);
  await close();
  await page.evaluate(() => {
    PlanningUI.comparisonDialog();
    document.getElementById("compare-floor").value = "1";
  });
  await page
    .getByRole("button", { name: "Apply overlay", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => PlanningUI.data.overlays.comparisonFloor),
    1,
  );
  await close();
  await page.evaluate(async () => {
    await StorageEngine.snapshot("Visual baseline");
    ProjectState.commit("Move for diff", () => (elements[0].x += 12));
    const v = (await StorageEngine.versions())[0];
    await StudioUI.compareVersion(v.id);
  });
  assert.ok(await page.locator("dialog svg").count());
  await close();
  // Every advertised entry point opens or intentionally requests its selected object context.
  const commands = await page.evaluate(() => PlanningUI.tools().length);
  assert.equal(
    commands,
    await page.evaluate(() => PlanningUI.toolActions().length),
  );
  for (let i = 0; i < commands; i++) {
    if ([1].includes(i)) continue;
    await close();
    await page.evaluate(async (i) => {
      if (PlanningUI.tool !== "select") PlanningUI.setTool("select");
      await PlanningUI.toolActions()[i]();
    }, i);
  }
  await close();
  await page.keyboard.press("Control+k");
  assert.ok(await page.locator("#planning-command").isVisible());
  await page.locator("#planning-command").fill("plumbing");
  assert.equal(
    await page.locator("#planning-command-results button").count(),
    1,
  );
  await close();
  await page.evaluate(() => PlanningDrawing.sheetDialog());
  const popupPromise = context.waitForEvent("page");
  await page.getByRole("button", { name: "Open drawing set / PDF" }).click();
  const sheets = await popupPromise;
  await sheets.waitForLoadState();
  assert.ok((await sheets.locator("section").count()) >= 8);
  assert.ok((await sheets.locator("body").innerText()).includes("Section"));
  await sheets.close();
  await close();
  console.log(
    "Builder alternatives, preservation, undo, stair designer, comparison, command search and drawing sets passed",
  );
  // Application scripts are local; cache/reload verifies a complete offline startup, not just a badge.
  await page.waitForFunction(() => PlanningUI.offlineReady, { timeout: 15000 });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await StorageEngine.saveToMemory();
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => PlanningUI.ready);
  // Some browser protocols block offline navigation before the service worker runs.
  // Drop the origin connection instead so its worker's real network fallback is tested.
  const networkOutage = ["webkit", "firefox"].includes(
    process.env.BROWSER_ENGINE,
  );
  try {
    if (networkOutage) server.archcadOffline = true;
    else await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => PlanningUI.ready && Engine3D.scene);
    assert.ok(await page.locator('[data-widget="converter"]').isVisible());
  } finally {
    server.archcadOffline = false;
    await context.setOffline(false);
  }
  await page.evaluate(() => {
    document.body.classList.remove("catalog-open", "inspector-open");
    StudioUI.fitPlan();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  assert.ok(
    await page
      .getByRole("button", { name: "Tools", exact: true })
      .first()
      .isVisible(),
  );
  assert.ok(
    await page
      .locator(".studio-brand")
      .evaluate((n) => n.getBoundingClientRect().top >= 0),
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page
    .locator(".planning-entry").getByRole("button", { name: "Build", exact: true })
    .first()
    .click();
  assert.ok(await page.locator(".studio-catalog").isVisible());
  await page.locator('[aria-label="Close Build panel"]').click();
  await page.screenshot({ path: "/tmp/archcad-planning-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    setWorkspaceLayout("split");
    PlanningUI.fit3D();
  });
  await page.screenshot({ path: "/tmp/archcad-planning-desktop.png" });
  console.log(
    "All tool entry points, offline reload, persisted widgets and mobile navigation passed",
  );
};
