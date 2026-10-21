const { pdf, glb } = require("./workbench-fixtures.cjs");
module.exports = async ({ page, context, assert }) => {
  await page.bringToFront();
  const close = () =>
      page.evaluate(() => document.getElementById("studio-dialog")?.close()),
    click = async (name) => {
      try {
        await page
          .getByRole("button", { name, exact: true })
          .click({ timeout: 15000 });
      } catch (e) {
        throw Error(
          name +
            ": " +
            (await page.locator("#studio-toast").innerText()) +
            "; " +
            e.message,
        );
      }
    },
    fill = (id, value) => page.locator("#" + id).fill(String(value));
  const reset = async (extra) => {
    await close();
    await page.evaluate((extra) => {
      Workbench3D.disableEdit();
      Workbench3D.clearSection();
      Workbench3D.clearIsolation();
      Workbench3D.measurePoints = null;
      WorkbenchDrawing.clashes = [];
      DesignUI.overlay = [];
      DesignUI.tilePreview = null;
      PlanningUI.setTool("select");
      WorkbenchI18n.apply({ language: "en" });
      ProjectState.apply(
        {
          name: "Workbench regression",
          plot: {
            inW: "600",
            inH: "600",
            aL: "0",
            aU: "0",
            bR: "0",
            bU: "0",
            cR: "0",
            cD: "0",
            dL: "0",
            dD: "0",
          },
          floorCount: 2,
          elements: [
            {
              id: "a",
              type: "bedroom",
              x: 20,
              y: 20,
              w: 200,
              h: 200,
              floor: 0,
            },
            {
              id: "upper",
              type: "bedroom",
              x: 20,
              y: 20,
              w: 200,
              h: 200,
              floor: 1,
            },
            {
              id: "stairs",
              type: "staircase",
              x: 280,
              y: 20,
              w: 100,
              h: 180,
              floor: 0,
            },
            {
              id: "kitchen",
              type: "kitchen",
              x: 260,
              y: 240,
              w: 250,
              h: 200,
              floor: 0,
            },
          ],
          fixtures: [
            {
              id: "door",
              type: "door",
              roomId: 0,
              edge: "top",
              offset: 80,
              size: 36,
            },
          ],
          ...extra,
        },
        { rebase: true },
      );
      AppEvents.triggerStateChange();
      setWorkspaceLayout("2d");
      StudioUI.select(0);
      StudioUI.fitPlan();
    }, extra || {});
  };
  await page.evaluate(() => setWorkspaceLayout("3d"));
  await page.waitForFunction(() => !!Workbench3D.controls);
  await reset();
  // Every advertised professional workflow must be discoverable and open without a script error.
  const count = await page.evaluate(() => WorkbenchUI.tools().length);
  for (let i = 0; i < count; i++) {
    await close();
    await page.evaluate(async (i) => {
      StudioUI.select(0);
      await WorkbenchUI.tools()[i][2]();
    }, i);
  }
  await close();
  await page.evaluate(() => WorkbenchUI.wallDialog());
  await fill("wb-wall-distance", 2);
  await click("Preview wall edit");
  await click("Apply wall edit");
  assert.ok(
    await page.evaluate(() =>
      Object.values(ProjectState.meta.wallOverrides).includes(11),
    ),
  );
  await page.evaluate(() => ProjectState.undo());
  await page.evaluate(() => WorkbenchUI.siteDialog());
  await fill("wb-site-points", "0,0\n580,0\n580,580\n0,580");
  await fill("wb-site-setback", 6);
  await click("Preview site");
  await click("Apply site boundary");
  assert.equal(await page.evaluate(() => WorkbenchUI.data.site.setback), 6);
  const prior = await page.evaluate(() => elements[0].x);
  await page.evaluate(() => StudioUI.edit(0, "x", 500));
  assert.equal(await page.evaluate(() => elements[0].x), prior);
  await page.evaluate(() => ProjectState.undo());
  await page.evaluate(() => WorkbenchUI.levelDialog());
  await fill("wb-level-base-0", -12);
  await fill("wb-level-height-0", 132);
  await fill("wb-level-base-1", 120);
  await fill("wb-level-height-1", 144);
  await click("Apply floor levels");
  await fill("wb-void-points", "50,50\n80,50\n80,80\n50,80");
  await click("Add slab opening");
  assert.equal(await page.evaluate(() => WorkbenchUI.data.voids.length), 1);
  assert.equal(
    await page.evaluate(() =>
      WorkbenchModel.floorBase(ProjectState.capture(), 0),
    ),
    -12,
  );
  await close();
  await page.evaluate(() => WorkbenchUI.openingDialog());
  await fill("wb-type-width", 40);
  await fill("wb-type-height", 84);
  await click("Create opening type");
  await click("Link opening to type");
  assert.equal(await page.evaluate(() => fixtures[0].size), 40);
  await close();
  await page.evaluate(() => {
    StudioUI.select(elements.findIndex((e) => e.id === "stairs"));
    WorkbenchUI.stairDialog();
  });
  await page.locator("#wb-stair-room").selectOption("stairs");
  await click("Preview staircase");
  await click("Apply stair and footprint");
  assert.ok(await page.evaluate(() => WorkbenchUI.data.stairs.stairs));
  await page.evaluate(() => WorkbenchUI.stairDialog());
  for (const [k, v] of Object.entries({
    x: 20,
    y: 300,
    width: 36,
    rise: 12,
    maxRun: 120,
    landing: 36,
  }))
    await fill("wb-ramp-" + k, v);
  await click("Preview ramp");
  await click("Apply ramp");
  assert.equal(await page.evaluate(() => WorkbenchUI.data.ramps.length), 1);
  await page.evaluate(() => WorkbenchUI.shaftDialog());
  for (const k of ["x", "y"]) await fill("wb-shaft-" + k, 80);
  await click("Add shaft and slab openings");
  assert.equal(await page.evaluate(() => WorkbenchUI.data.shafts.length), 1);
  await close();
  await page.evaluate(() => WorkbenchUI.structureDialog());
  await fill("wb-grid-x", "20,200");
  await fill("wb-grid-y", "20,200");
  await fill("wb-grid-floors", "0,1");
  await click("Preview grid members");
  await click("Apply structural members");
  assert.ok(await page.evaluate(() => WorkbenchUI.data.structure.length >= 8));
  await page.evaluate(() => {
    StudioUI.select(0);
    WorkbenchUI.interiorDialog();
  });
  await click("Generate layout preview");
  await click("Save reviewed layout");
  assert.equal(
    await page.evaluate(() => WorkbenchUI.data.interiors[0].items.length),
    3,
  );
  const width = page.getByLabel("toilet w", { exact: true });
  await width.fill("30");
  await width.press("Tab");
  assert.equal(
    await page.evaluate(() => WorkbenchUI.data.interiors[0].items[0].w),
    30,
  );
  await close();
  await page.evaluate(() => WorkbenchUI.interiorDialog());
  await page.locator("#wb-interior-kind").selectOption("kitchen");
  await page.locator("#wb-interior-room").selectOption("kitchen");
  await click("Generate layout preview");
  await click("Save reviewed layout");
  assert.equal(await page.evaluate(() => WorkbenchUI.data.interiors.length), 2);
  await close();
  await page.evaluate(() => WorkbenchUI.terrainDialog());
  await click("Calculate and preview");
  await click("Apply terrain");
  assert.equal(
    await page.evaluate(() => WorkbenchUI.data.terrain.points.length),
    4,
  );
  await page.evaluate(() => WorkbenchUI.rainDialog());
  await click("Calculate collection");
  await click("Save and draw drainage");
  assert.equal(await page.evaluate(() => WorkbenchUI.data.rain.enabled), true);
  await page.evaluate(() => WorkbenchUI.solarDialog());
  await click("Generate panel layout");
  await click("Save solar layout");
  assert.equal(await page.evaluate(() => WorkbenchUI.data.solar.enabled), true);
  await page.evaluate(() => WorkbenchUI.serviceDialog());
  await click("Add 3D route");
  await click("Find 3D clashes");
  assert.equal(
    await page.evaluate(() => WorkbenchUI.data.services3d.length),
    1,
  );
  await close();
  await page.evaluate(() => {
    setWorkspaceLayout("3d");
    generate3DModel();
  });
  assert.ok(
    await page.evaluate(() =>
      Engine3D.buildingGroup.children.some(
        (c) => c.userData.workbench && c.children.length > 10,
      ),
    ),
  );
  const memory = await page.evaluate(async () => {
    const tick = () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await tick();
    const before = { ...Engine3D.renderer.info.memory };
    for (let i = 0; i < 5; i++) {
      WorkbenchUI.data.rain.eventMm += 1;
      generate3DModel();
      await tick();
    }
    return { before, after: { ...Engine3D.renderer.info.memory } };
  });
  assert.ok(
    memory.after.geometries <= memory.before.geometries + 10,
    JSON.stringify(memory),
  );
  console.log("Professional 3D resource check", memory);
  await reset({
    elements: [
      { id: "a", type: "bedroom", x: 20, y: 20, w: 240, h: 240, floor: 0 },
      {
        id: "bed",
        type: "bed",
        isFurniture: true,
        x: 60,
        y: 80,
        w: 36,
        h: 72,
        floor: 0,
      },
    ],
    fixtures: [
      {
        id: "door",
        type: "door",
        roomId: 0,
        edge: "top",
        offset: 90,
        size: 36,
      },
    ],
  });
  await page.evaluate(() => WorkbenchUI.furnitureDialog());
  await click("Generate arrangements");
  assert.ok(
    await page.evaluate(() =>
      WorkbenchUI.furnitureCandidates.some((c) => c.project),
    ),
  );
  await close();
  await page.evaluate(() => WorkbenchUI.optionDialog());
  await click("Save current as an option");
  await close();
  await page.evaluate(() => {
    StudioUI.edit(0, "x", 26);
    WorkbenchUI.optionDialog();
  });
  await click("Compare with current");
  assert.ok((await page.locator("#wb-result").innerText()).includes("changed"));
  await click("Snapshot current and open option");
  await page.waitForFunction(() => elements[0].x === 20);
  assert.equal(await page.evaluate(() => elements[0].x), 20);
  await close();
  await page.evaluate(() => {
    StudioUI.select(0);
    WorkbenchUI.propertyDialog();
  });
  await click("Add property definition");
  await fill("wb-value-supplier", "Quote A");
  await click("Apply values to selected objects");
  assert.equal(
    await page.evaluate(() => WorkbenchUI.data.values.a.supplier),
    "Quote A",
  );
  await fill("wb-property-search", "Quote A");
  await click("Search");
  assert.ok(
    (await page.locator("#wb-result").innerText()).includes("1 matching"),
  );
  await close();
  await page.evaluate(() => {
    StudioUI.select(0);
    WorkbenchUI.macroDialog();
  });
  await click("Create parameterized move macro");
  await click("Preview macro on selection");
  await click("Apply macro");
  assert.equal(await page.evaluate(() => elements[0].x), 32);
  await page.evaluate(() => ProjectState.undo());
  await page.evaluate(() => {
    StudioUI.select(1);
    WorkbenchUI.componentDialog();
  });
  await click("Create from selected objects");
  await fill("wb-component-x", 350);
  await fill("wb-component-y", 20);
  await click("Place linked instance");
  assert.equal(await page.evaluate(() => WorkbenchUI.data.instances.length), 1);
  await close();
  await page.evaluate(() => WorkbenchUI.cuttingDialog());
  await click("Optimize stock cuts");
  assert.ok(await page.locator("#wb-result svg").count());
  await close();
  await page.evaluate(() => WorkbenchUI.procurementDialog());
  await click("Add purchase line");
  assert.equal(
    await page.evaluate(() => WorkbenchUI.data.procurement.length),
    1,
  );
  await close();
  await page.evaluate(() => {
    StudioUI.select(0);
    WorkbenchUI.issueDialog();
  });
  await fill("wb-issue-title", "Room review");
  await click("Create issue at selection");
  assert.equal(await page.evaluate(() => WorkbenchUI.data.issues.length), 1);
  await close();
  await page.evaluate(() => {
    WorkbenchUI.change("Test markup", () =>
      WorkbenchUI.data.markups.push({
        id: ProjectModel.uid(),
        kind: "arrow",
        color: "#f59e0b",
        floor: 0,
        label: "Check wall",
        points: [
          { x: 30, y: 30 },
          { x: 80, y: 80 },
        ],
      }),
    );
  });
  assert.ok(await page.locator("#wb-drawing-layer polyline").count());
  await page.evaluate(() => WorkbenchUI.preferenceDialog());
  await page.locator("#wb-pref-language").selectOption("or");
  await click("Save interface preferences");
  assert.equal(await page.evaluate(() => document.documentElement.lang), "or");
  await page.evaluate(() => WorkbenchI18n.apply({ language: "en" }));
  await close();
  console.log("Professional: imports start");
  await page.evaluate(() => WorkbenchUI.importDialog());
  await page.locator("#wb-pdf-file").setInputFiles({
    name: "plan.pdf",
    mimeType: "application/pdf",
    buffer: pdf(),
  });
  await page.waitForFunction(
    () => WorkbenchFiles.trace?.source === "PDF page 1",
  );
  assert.ok(
    await page.evaluate(() => WorkbenchFiles.trace.segments.length >= 4),
  );
  assert.ok(
    await page.evaluate(() =>
      WorkbenchFiles.trace.texts.some((t) => t.text.includes("120")),
    ),
  );
  await fill("wb-import-scale", 0.2);
  await click("Apply reviewed geometry");
  assert.ok(await page.evaluate(() => PlanningUI.data.walls.length >= 4));
  await close();
  await page.evaluate(() => WorkbenchUI.importDialog());
  const raster = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 700;
    c.height = 300;
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, 700, 300);
    x.strokeStyle = "#000";
    x.lineWidth = 5;
    x.strokeRect(20, 20, 650, 250);
    x.fillStyle = "#000";
    x.font = "72px Arial";
    x.fillText("120 240", 100, 160);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.locator("#wb-raster-file").setInputFiles({
    name: "scan.png",
    mimeType: "image/png",
    buffer: Buffer.from(raster, "base64"),
  });
  await page.waitForFunction(() => WorkbenchFiles.trace?.source === "scan.png");
  await click("Recognize text and dimensions");
  await page.waitForFunction(
    () => WorkbenchFiles.trace?.texts?.some((t) => /120|240/.test(t.text)),
    null,
    { timeout: 120000 },
  );
  await close();
  console.log("Professional: PDF/OCR passed; GLB start");
  await page.evaluate(() => WorkbenchUI.assetDialog());
  await page.locator("#wb-asset-file").setInputFiles({
    name: "fixture.glb",
    mimeType: "model/gltf-binary",
    buffer: glb(),
  });
  await page.waitForFunction(() => WorkbenchUI.data.assets.length === 1);
  await click("Place selected model");
  assert.ok(await page.evaluate(() => elements.some((e) => e.assetId)));
  await close();
  await page.evaluate(() => {
    setWorkspaceLayout("3d");
    generate3DModel();
  });
  await page.waitForFunction(() =>
    Workbench3D.group?.children.some((c) => c.userData.isFurniture),
  );
  await page.evaluate(() => {
    StudioUI.select(0);
    Workbench3D.target = { kind: "element", id: elements[0].id };
    Workbench3D.enableEdit("translate");
    Workbench3D.controls.dispatchEvent({
      type: "dragging-changed",
      value: true,
    });
    Workbench3D.proxy.position.x += 6 * get3DEnvironmentParams().SCALE;
    Workbench3D.controls.dispatchEvent({
      type: "dragging-changed",
      value: false,
    });
  });
  assert.equal(await page.evaluate(() => elements[0].x), 26);
  await page.evaluate(() => {
    Workbench3D.disableEdit();
    ProjectState.undo();
  });
  await page.evaluate(() => WorkbenchUI.viewDialog());
  await click("Apply section box");
  assert.equal(
    await page.evaluate(() => Engine3D.renderer.clippingPlanes.length),
    6,
  );
  await page.evaluate(() => Workbench3D.clearSection());
  await page.evaluate(() => {
    WorkbenchUI.change("3D measurement fixture", () =>
      WorkbenchUI.data.measurements.push({
        id: ProjectModel.uid(),
        a: { x: 20, y: 20, z: 0 },
        b: { x: 32, y: 20, z: 12 },
      }),
    );
  });
  await page.waitForFunction(() =>
    Workbench3D.group?.children.some((c) => c.userData.workbenchMeasure),
  );
  assert.ok(
    await page.evaluate(() =>
      Workbench3D.group.children.some((c) => c.userData.workbenchMeasure),
    ),
  );
  await page.evaluate(() => {
    window.wbDownloads = [];
    window.wbDownloadOriginal = NavActionEngine.downloadBlob;
    NavActionEngine.downloadBlob = (data, name, type) =>
      wbDownloads.push({ data, name, type });
  });
  console.log("Professional: 3D manipulation passed; panorama start");
  await Promise.race([
    page.evaluate(async () => Workbench3D.panorama()),
    new Promise((_, reject) =>
      setTimeout(() => reject(Error("Panorama timeout")), 30000),
    ),
  ]);
  assert.ok(
    await page.evaluate(() =>
      wbDownloads.some(
        (d) => d.name.endsWith("Panorama.png") && d.data.size > 5000,
      ),
    ),
  );
  await page.evaluate(() => {
    const position = Engine3D.camera.position.toArray(),
      target = Engine3D.controls.target.toArray();
    ProjectState.meta.design.views = [
      { name: "A", floor: 0, position, target, note: "" },
      {
        name: "B",
        floor: 0,
        position: [position[0] + 10, position[1], position[2]],
        target,
        note: "",
      },
    ];
    WorkbenchUI.presentationDialog();
    document.getElementById("wb-video-duration").value = ".5";
  });
  console.log("Professional: panorama passed; video start");
  const videoSupport = await page.evaluate(
    () =>
      !!window.MediaRecorder &&
      !!Engine3D.renderer.domElement.captureStream &&
      ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/mp4"].some(
        (t) => MediaRecorder.isTypeSupported(t),
      ),
  );
  await Promise.race([
    page.evaluate(async () => Workbench3D.recordWalkthrough()),
    new Promise((_, reject) =>
      setTimeout(() => reject(Error("Video timeout")), 30000),
    ),
  ]);
  console.log(
    "Professional video result",
    videoSupport,
    await page.evaluate(() => ({
      files: wbDownloads.map((d) => ({ name: d.name, size: d.data.size })),
      message: document.getElementById("studio-toast").textContent,
    })),
  );
  if (videoSupport) {
    assert.ok(
      await page.evaluate(() =>
        wbDownloads.some(
          (d) => /Walkthrough\.(webm|mp4)$/.test(d.name) && d.data.size > 500,
        ),
      ),
    );
    const dimensions = await page.evaluate(async () => {
      const d = wbDownloads.find((d) =>
          /Walkthrough\.(webm|mp4)$/.test(d.name),
        ),
        url = URL.createObjectURL(d.data),
        v = document.createElement("video");
      try {
        await new Promise((resolve, reject) => {
          v.onloadedmetadata = resolve;
          v.onerror = () => reject(Error("Recorded video is not decodable"));
          v.src = url;
        });
        return [v.videoWidth, v.videoHeight];
      } finally {
        URL.revokeObjectURL(url);
      }
    });
    assert.ok(dimensions.every((n) => n > 0));
  } else
    assert.match(
      await page.locator("#studio-toast").innerText(),
      /unavailable|encoder/i,
    );
  await page.evaluate(() => {
    DesignIO.package();
    DesignIO.ifc();
    NavActionEngine.downloadBlob = wbDownloadOriginal;
  });
  assert.ok(
    await page.evaluate(() => {
      const zip = wbDownloads.find((d) => d.name.endsWith(".zip")),
        file = fflate.unzipSync(zip.data);
      return (
        JSON.parse(fflate.strFromU8(file["project.json"])).design.workbench
          .assets.length === 1 &&
        fflate.strFromU8(file["coordination.ifc"]).includes("IFCDOOR")
      );
    }),
  );
  await reset();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    StudioUI.select(0);
    WorkbenchUI.menu();
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({ path: "/tmp/archcad-workbench-mobile.png" });
  await close();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => WorkbenchUI.menu());
  await page.screenshot({ path: "/tmp/archcad-workbench-desktop.png" });
  await close();
  console.log(
    "Professional workflows: tool discovery, atomic geometry, datums/voids, linked types, stairs/ramps/shafts, structure, interiors, terrain/rain/solar/services, options, properties, macros, assemblies, procurement/cuts, issues, language, PDF/OCR, GLB, 3D edits/clipping, panorama/video, ZIP/IFC and mobile passed",
  );
};
