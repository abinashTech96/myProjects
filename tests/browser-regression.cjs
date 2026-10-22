const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const engines = require("playwright");
const browserEngine = process.env.BROWSER_ENGINE || "chromium";
const driver = engines[browserEngine];
if (!["chromium", "firefox", "webkit"].includes(browserEngine))
  throw Error("Unsupported browser engine");
(async () => {
  const root = path.resolve(__dirname, ".."),
    threeRoot =
      process.env.THREE_TEST_ROOT ||
      path.dirname(require.resolve("three/package.json"));
  const server = http.createServer((req, res) => {
    if (server.archcadOffline) {
      req.socket.destroy();
      return;
    }
    const file = path.join(
      root,
      decodeURIComponent(req.url.split("?")[0]) === "/"
        ? "index.html"
        : decodeURIComponent(req.url.split("?")[0]),
    );
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) return res.writeHead(404).end();
      res.setHeader(
        "Content-Type",
        /\.m?js$/.test(file)
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".html")
              ? "text/html"
              : "application/octet-stream",
      );
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let browser;
  try {
    browser = await driver.launch({
      executablePath: process.env.BROWSER_EXECUTABLE || undefined,
      headless: process.env.BROWSER_HEADFUL !== "1",
      ...(browserEngine === "firefox"
        ? {
            env: {
              ...process.env,
              MOZ_DISABLE_CONTENT_SANDBOX: "1",
              LIBGL_ALWAYS_SOFTWARE: "1",
            },
            firefoxUserPrefs: {
              "webgl.force-enabled": true,
              "webgl.allow-software-renderer": true,
              "gfx.webrender.software": true,
              "webgl.out-of-process": false,
            },
          }
        : {}),
      args:
        browserEngine === "chromium"
          ? [
              "--no-sandbox",
              "--disable-dev-shm-usage",
              "--enable-unsafe-swiftshader",
              "--use-gl=angle",
              "--use-angle=swiftshader",
            ]
          : [],
    });
  } catch (error) {
    await new Promise((r) => server.close(r));
    throw error;
  }
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  page.setDefaultTimeout(Number(process.env.BROWSER_TIMEOUT_MS) || 30000);
  const assets = {
    "three.min.js": "build/three.min.js",
    "OrbitControls.js": "examples/js/controls/OrbitControls.js",
    "PointerLockControls.js": "examples/js/controls/PointerLockControls.js",
    "BufferGeometryUtils.js": "examples/js/utils/BufferGeometryUtils.js",
    "GLTFExporter.js": "examples/js/exporters/GLTFExporter.js",
  };
  await context.route(
    /https:\/\/(cdnjs.cloudflare.com|cdn.jsdelivr.net)\//,
    (route) => {
      const name = route.request().url().split("/").pop();
      const file = assets[name];
      return file
        ? route.fulfill({
            contentType: "text/javascript",
            body: fs.readFileSync(path.join(threeRoot, file)),
          })
        : route.abort();
    },
  );
  await context.route("https://raw.githubusercontent.com/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC",
        "base64",
      ),
    }),
  );
  page.on("pageerror", (e) => errors.push(e.stack));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource"))
      console.log("BROWSER:", m.text());
  });
  page.on("dialog", (d) => d.accept());
  await page.addInitScript(() =>
    localStorage.setItem("ArchCAD_TourDone", "true"),
  );
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(700);
    console.log(
      "Startup:",
      await page.evaluate(() => ({
        ready: StudioUI.ready,
        engine: !!Engine3D.scene,
        shell: !!document.querySelector(".studio-header"),
        errors: StorageEngine.error,
      })),
      errors,
    );
    assert.equal(errors.length, 0, "Startup must have no uncaught errors");
    if (process.env.REFINEMENT_ONLY) {
      await require('./refinement-browser.cjs')({page,context,assert});
      assert.equal(errors.length,0,errors.join('\n'));
      return;
    }
    if (process.env.LAYOUT_ONLY) {
      await require('./layout-browser.cjs')({page,context,assert});
      assert.equal(errors.length,0,errors.join('\n'));
      return;
    }
    if (process.env.POLISH_ONLY) {
      await require('./polish-browser.cjs')({page,context,assert});
      assert.equal(errors.length,0,errors.join('\n'));
      return;
    }
    if (process.env.ENHANCEMENTS_ONLY) {
      await require('./enhancements-browser.cjs')({page,context,assert});
      assert.equal(errors.length,0,errors.join('\n'));
      return;
    }
    if (process.env.PROPERTIES_ONLY) {
      await require("./property-widgets-browser.cjs")({page,assert});
      assert.equal(errors.length,0,errors.join("\n"));
      return;
    }
    if (process.env.INSPECTOR_ONLY) {
      await require("./inspector-browser.cjs")({page,assert});
      assert.equal(errors.length,0,errors.join("\n"));
      return;
    }
    if (process.env.WORKSPACE_ONLY || process.argv.includes("--workspace")) {
      await require("./workspace-browser.cjs")({ page, context, assert });
      assert.equal(errors.length, 0, errors.join("\n"));
      return;
    }
    if (process.env.INTEGRATION_ONLY) {
      await require("./workbench-integration.cjs")({ page, context, assert });
      assert.equal(errors.length, 0, errors.join("\n"));
      return;
    }

    if (process.env.WORKBENCH_ONLY) {
      await require("./workbench-browser.cjs")({
        page,
        context,
        assert,
        server,
      });
      assert.equal(errors.length, 0, errors.join("\n"));
      return;
    }
    if (process.env.DESIGN_ONLY) {
      await require("./design-browser.cjs")({ page, context, assert, server });
      assert.equal(errors.length, 0, errors.join("\n"));
      return;
    }
    if (process.env.PLANNING_ONLY) {
      await require("./planning-browser.cjs")({
        page,
        context,
        assert,
        server,
      });
      assert.equal(errors.length, 0, errors.join("\n"));
      return;
    }
    // Each module owns its fixture; release its WebGL contexts before the next.
    if (!process.env.CORE_ONLY) for (const suite of ["workspace", "inspector", "property-widgets", "enhancements", "polish", "layout", "refinement"]) {
      await require(`./${suite}-browser.cjs`)({page,context,assert});
      assert.equal(errors.length,0,errors.join("\n"));
      await page.reload({waitUntil:"networkidle"});
      await page.waitForFunction(() => window.WorkspaceLayout?.ready && StudioUI.ready && !StorageEngine.loading);
    }
    await page.evaluate(() => {
      ProjectState.apply(
        { elements: [], fixtures: [], floorCount: 1 },
        { rebase: true },
      );
      StorageEngine.loading = false;
      StudioUI.place(
        ASSET_CATALOGS.rooms.items.find((x) => x.type === "bedroom"),
        "rooms",
      );
    });
    assert.equal(await page.evaluate(() => elements.length), 1);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.equal(await page.evaluate(() => elements.length), 0);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    assert.equal(await page.evaluate(() => elements.length), 1);
    console.log("Add/undo/redo passed");
    await page.evaluate(() =>
      StudioUI.edit(0, "customName", '<img src=x onerror="window.injected=1">'),
    );
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.equal(await page.locator("#studio-properties img").count(), 0);
    await page.evaluate(() => {
      StudioUI.edit(0, "customName", "Bedroom");
      StudioUI.select(0);
      addFixture("door");
    });
    assert.equal(await page.evaluate(() => fixtures.length), 1);
    await page.evaluate(() => {
      StudioUI.edit(0, "w", -10);
    });
    assert.ok(await page.evaluate(() => elements[0].w > 0));
    await page.evaluate(() => {
      ProjectState.commit("Room studio setup", () => {
        elements.push({
          id: ProjectModel.uid(),
          type: "bed",
          x: elements[0].x + 10,
          y: elements[0].y + 10,
          w: 72,
          h: 84,
          floor: 0,
          isFurniture: true,
          rot: 0,
        });
      });
      StudioUI.select(0);
      RoomStudio.open();
      RoomStudio.selectedFixtureIndex = 0;
    });
    await page.evaluate(() => {
      RoomStudio.modifyFixture("w", 72.5);
      RoomStudio.rotateSelected();
      RoomStudio.toggle3D();
    });
    assert.equal(
      await page.evaluate(() => RoomStudio.sandboxFixtures[0].w),
      72.5,
    );
    await page.keyboard.press("Delete");
    assert.equal(
      await page.evaluate(() => elements.filter((e) => !e.isFurniture).length),
      1,
      "Delete in studio must not remove background room",
    );
    await page.evaluate(() => RoomStudio.save());
    assert.equal(
      await page.evaluate(() => elements.filter((e) => e.isFurniture).length),
      0,
      "Studio furniture deletion must persist",
    );
    console.log("Modal isolation and studio save passed");
    await page.evaluate(() => {
      const before = toInches(
        document.getElementById("inW").value,
        StudioUI.unit,
      );
      StudioUI.changeUnit("cm");
      window.unitTest = {
        before,
        after: toInches(document.getElementById("inW").value, "cm"),
      };
    });
    const unit = await page.evaluate(() => window.unitTest);
    assert.ok(Math.abs(unit.before - unit.after) < 0.001);
    await page.evaluate(() => {
      addManualFloor();
    });
    assert.equal(
      await page.evaluate(() =>
        Number(document.getElementById("b-floors").value),
      ),
      2,
    );
    await page.evaluate(() => undoAction());
    assert.equal(
      await page.evaluate(() =>
        Number(document.getElementById("b-floors").value),
      ),
      1,
    );
    await page.evaluate(() => redoAction());
    assert.equal(await page.evaluate(() => currentFloor), 1);
    console.log("Units and floor history passed");
    await page.evaluate(() => {
      StudioUI.changeUnit("in");
      ProjectState.apply(
        {
          name: "Geometry test",
          floorCount: 2,
          plot: {
            inW: "300",
            inH: "300",
            aL: "0",
            aU: "0",
            bR: "0",
            bU: "0",
            cR: "0",
            cD: "0",
            dL: "0",
            dD: "0",
            roadSide: "east",
          },
          elements: [
            {
              id: "room-a",
              type: "bedroom",
              x: 20,
              y: 20,
              w: 120,
              h: 120,
              floor: 0,
            },
            {
              id: "room-b",
              type: "kitchen",
              x: 140,
              y: 20,
              w: 120,
              h: 120,
              floor: 0,
            },
            {
              id: "stairs",
              type: "staircase",
              x: 20,
              y: 160,
              w: 84,
              h: 120,
              floor: 0,
            },
            {
              id: "upper",
              type: "bedroom",
              x: 20,
              y: 20,
              w: 120,
              h: 120,
              floor: 1,
            },
            {
              id: "washer",
              type: "washing_machine",
              x: 30,
              y: 30,
              w: 30,
              h: 30,
              floor: 1,
              isFurniture: true,
              customColor: "#ff0000",
            },
          ],
          fixtures: [
            { type: "door", roomId: 0, edge: "right", size: 30, offset: 40 },
            { type: "window", roomId: 3, edge: "top", size: 36, offset: 40 },
          ],
        },
        { rebase: true },
      );
      setWorkspaceLayout("3d");
      generate3DModel();
    });
    assert.equal(
      await page.evaluate(
        () => WallEngine.getWalls().filter((w) => w.shared).length,
      ),
      1,
    );
    assert.ok(
      await page.evaluate(
        () => Engine3D.elementObjects.get("washer").children.length > 0,
      ),
    );
    await page.evaluate(() => {
      StudioUI.select(0);
      StudioUI.edit(0, "customColor", "#ff0000");
    });
    await page.waitForFunction(() => Engine3D.elementObjects
      .get("room-a")?.children[0]?.material.color.getHexString() === "ff0000");
    console.log("Shared walls and actual Three.js rendering passed");
    await page.evaluate(() => {
      setWorkspaceLayout("2d");
      Selection.ids = new Set(["room-a", "room-b"]);
      selectedElIndex = 0;
      Selection.action("Align top");
      ProjectState.commit(
        "Constraint",
        () =>
          (ProjectState.meta.constraints = [
            {
              id: "rule",
              kind: "offset-x",
              source: "room-a",
              target: "room-b",
              distance: 120,
            },
          ]),
      );
      StudioUI.edit(0, "x", 30);
    });
    assert.equal(
      await page.evaluate(() => elements.find((e) => e.id === "room-b").x),
      150,
    );
    await page.evaluate(async () => {
      await StorageEngine.saveToMemory();
      await StorageEngine.snapshot("Browser tested");
    });
    assert.ok(
      await page.evaluate(async () =>
        (await StorageEngine.versions()).some(
          (v) => v.label === "Browser tested",
        ),
      ),
    );
    await page.evaluate(() => StudioUI.aiDialog());
    await page.locator("#studio-ai-json").fill(
      JSON.stringify({
        actions: [
          {
            action: "moveElement",
            params: { id: "room-a", newX: 35, newY: 20 },
          },
        ],
      }),
    );
    await page
      .getByRole("button", { name: "Preview JSON", exact: true })
      .click();
    assert.equal(await page.locator(".studio-ai-preview").count(), 1);
    await page.getByRole("button", { name: "Apply as one change" }).click();
    assert.equal(await page.evaluate(() => elements[0].x), 35);
    console.log("Constraints, versions and AI review passed");
    await page.evaluate(() => {
      window.exported = [];
      NavActionEngine.downloadBlob = (data, name) =>
        window.exported.push({
          data: typeof data === "string" ? data : null,
          name,
        });
      DrawingExport.options.scope = "all";
      exportJSON();
      exportDXF();
    });
    const files = await page.evaluate(() => window.exported);
    assert.equal(files.length, 2);
    assert.equal(JSON.parse(files[0].data).version, "2.0");
    assert.ok(files[1].data.includes("$INSUNITS"));
    assert.ok(files[1].data.includes("F1_WINDOWS"));
    const standalone = await page.evaluate(() => DrawingExport.svg(0));
    assert.ok(standalone.includes("xmlns="));
    assert.ok(!standalone.includes("matrix("));
    await page.evaluate(() => {
      window.exported = [];
    });
    await page.evaluate(() => DrawingExport.glb());
    assert.equal(
      await page.evaluate(() => window.exported[0]?.name),
      "ArchCAD_Model.glb",
    );
    // Additional interaction and persistence coverage on the actual DOM.
    await page.evaluate(() => {
      ProjectState.apply(
        {
          name: "Interaction test",
          plot: { inW: "300", inH: "300" },
          elements: [
            {
              id: "a",
              type: "bedroom",
              x: 20,
              y: 20,
              w: 100,
              h: 100,
              floor: 0,
            },
            {
              id: "b",
              type: "kitchen",
              x: 150,
              y: 20,
              w: 100,
              h: 100,
              floor: 0,
            },
          ],
          fixtures: [],
        },
        { rebase: true },
      );
      setWorkspaceLayout("2d");
      StudioUI.fitPlan();
    });
    const drop = await page.evaluate(() => {
      const { I, SCALE } = Utils.getMetrics(),
        pt = document.getElementById("blueprint").createSVGPoint();
      pt.x = I.x + 150 * SCALE;
      pt.y = I.y + 210 * SCALE;
      const screen = pt.matrixTransform(
        document.getElementById("element-container").getScreenCTM(),
      );
      return { x: screen.x, y: screen.y };
    });
    await page.evaluate(
      ({ x, y }) =>
        DragDropEngine.handleDrop(
          { category: "furniture", type: "chair" },
          x,
          y,
        ),
      drop,
    );
    assert.ok(
      Math.abs((await page.evaluate(() => elements.at(-1).x)) - 138) < 0.001,
      "Drop coordinates must account for zoom and drawing scale",
    );
    await page.evaluate(() => {
      StudioUI.select(0);
      window.testCuts = null;
      window.originalElevationModal = renderElevationModal;
      renderElevationModal = (cuts) => {
        window.testCuts = cuts;
      };
      const { I, SCALE } = Utils.getMetrics(),
        svg = document.getElementById("blueprint");
      const points = [
        [0, 70],
        [130, 70],
      ].map(([x, y]) => {
        const p = svg.createSVGPoint();
        p.x = I.x + x * SCALE;
        p.y = I.y + y * SCALE;
        return p.matrixTransform(
          document.getElementById("element-container").getScreenCTM(),
        );
      });
      isSectionMode = true;
      onSectionDown({ clientX: points[0].x, clientY: points[0].y });
      onSectionMove({
        clientX: points[1].x,
        clientY: points[1].y,
        shiftKey: false,
      });
      onSectionUp({ clientX: points[1].x, clientY: points[1].y });
      renderElevationModal = window.originalElevationModal;
    });
    assert.equal(
      await page.evaluate(() => window.testCuts.length),
      2,
      "Section must intersect both walls at non-default camera/scale",
    );
    await page.evaluate(() => {
      Selection.ids = new Set(["a", "b"]);
      selectedElIndex = 0;
      Selection.action("Group");
    });
    assert.ok(
      await page.evaluate(() => elements[0].groupId === elements[1].groupId),
    );
    await page.evaluate(() => {
      Selection.action("Ungroup");
      Selection.action("Align top");
      StudioUI.select(0);
    });
    const resize = await page.evaluate(() => {
      const el = elements[0],
        { I, SCALE } = Utils.getMetrics(),
        p = document.getElementById("blueprint").createSVGPoint();
      p.x = I.x + (el.x + el.w) * SCALE;
      p.y = I.y + (el.y + el.h) * SCALE;
      const q = p.matrixTransform(
        document.getElementById("element-container").getScreenCTM(),
      );
      return { x: q.x, y: q.y };
    });
    await page.mouse.move(resize.x, resize.y);
    await page.mouse.down();
    await page.mouse.move(resize.x + 15, resize.y + 15, { steps: 3 });
    await page.mouse.up();
    assert.ok(
      await page.evaluate(() => elements[0].w > 100),
      "Corner handle must resize room",
    );
    await page.evaluate(async () => {
      document.getElementById("aL").value = "11.25";
      document.getElementById("roadSide").value = "north";
      document.getElementById("compassDir").value = "North";
      globalCompassDir = "North";
      StudioUI.plotChanged();
      await StorageEngine.saveToMemory();
      window.saved = await StorageEngine.read("latest_session");
    });
    assert.equal(await page.evaluate(() => window.saved.plot.aL), "11.25");
    assert.equal(await page.evaluate(() => window.saved.compass), "North");
    await page.evaluate(() => {
      ProjectState.apply(
        {
          elements: [],
          fixtures: [],
          floorCount: 4,
          unit: "cm",
          compass: "South",
          plot: { inW: "762", inH: "762" },
          layouts: { "layout-f0": "3bhk", "layout-f2": "1bhk" },
        },
        { rebase: true },
      );
      renderFloorSelectors();
    });
    assert.equal(
      await page.evaluate(() => document.getElementById("layout-f0").value),
      "3bhk",
    );
    assert.equal(
      await page.evaluate(() => document.getElementById("layout-f2").value),
      "1bhk",
    );
    assert.equal(
      await page.evaluate(() =>
        Number(document.getElementById("b-floors").value),
      ),
      4,
    );
    await page.evaluate(() => {
      StudioUI.projectDialog();
    });
    assert.ok(await page.locator("#studio-plot-fields #inW").isVisible());
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await page.evaluate(() => {
      ProjectState.apply(
        {
          name: "Preview",
          elements: [
            {
              id: "room",
              type: "bedroom",
              x: 20,
              y: 20,
              w: 120,
              h: 120,
              floor: 0,
            },
          ],
          fixtures: [],
        },
        { rebase: true },
      );
      setWorkspaceLayout("3d");
      generate3DModel();
      Adv3D.toggleWorkspaceMode(true);
      selectAdvFloor(0);
      selectAdvElement(0);
      executeIsolation();
    });
    await page.waitForTimeout(1400);
    await page.evaluate(() => {
      Adv3D.setRenderMode("wireframe");
      Adv3D.updateClippingPlane(150);
      Adv3D.resetIsolation();
    });
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      Adv3D.closePanel();
      setWorkspaceLayout("2d");
      StudioUI.select(0);
      StudioUI.fitPlan();
    });
    const countBeforeImport = await page.evaluate(() => elements.length);
    await page.locator("#nav-import-file").setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          elements: [
            {
              id: "bad",
              type: "bedroom",
              x: 0,
              y: 0,
              w: -1,
              h: 100,
              floor: 0,
            },
          ],
        }),
      ),
    });
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(() => elements.length),
      countBeforeImport,
      "Invalid import preserves current project",
    );
    await page.evaluate(() => {
      window.makePlanRejected = false;
      try {
        StudioUI.makePlan({
          actions: [
            {
              action: "addRoom",
              params: { x: 20, y: 20, w: -1, h: 100, type: "bedroom" },
            },
          ],
        });
      } catch {
        window.makePlanRejected = true;
      }
    });
    assert.equal(await page.evaluate(() => window.makePlanRejected), true);
    const popupPromise = context.waitForEvent("page");
    await page.evaluate(() => DrawingExport.print());
    const printPage = await popupPromise;
    await printPage.waitForLoadState();
    assert.ok((await printPage.locator("table").count()) > 0);
    await printPage.close();
    console.log(
      "Drop/resize/selection, section coordinates, full saves, empty floors, layout choices, dialogs and advanced 3D passed",
    );
    await require("./planning-browser.cjs")({ page, context, assert, server });
    await require("./design-browser.cjs")({ page, context, assert, server });
    await require("./workbench-browser.cjs")({ page, context, assert, server });
    await require("./workbench-integration.cjs")({ page, context, assert });
    await page.screenshot({
      path: process.env.SCREENSHOT_PATH || "/tmp/archcad-desktop.png",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => setWorkspaceLayout("2d"));
    await page.waitForTimeout(150);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    await page.screenshot({ path: "/tmp/archcad-mobile.png" });
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log("Exports, mobile layout and all browser assertions passed");
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
