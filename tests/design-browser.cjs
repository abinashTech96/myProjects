module.exports = async ({ page, context, assert }) => {
  const close = () =>
    page.evaluate(() => document.getElementById("studio-dialog")?.close());
  const room = (id, x = 20, y = 20, w = 144, h = 144) => ({
    id,
    type: "bedroom",
    x,
    y,
    w,
    h,
    floor: 0,
  });
  const reset = (props) =>
    page.evaluate((props) => {
      document.getElementById("studio-dialog")?.close();
      if (typeof isSectionMode !== "undefined" && isSectionMode)
        toggleSectionCut();
      PlanningUI.setTool("select");
      DesignUI.overlay = [];
      DesignUI.tilePreview = null;
      ProjectState.apply(
        {
          name: "Design regression",
          elements: [],
          fixtures: [],
          floorCount: 2,
          plot: { inW: "600", inH: "600" },
          ...props,
        },
        { rebase: true },
      );
      AppEvents.triggerStateChange();
      setWorkspaceLayout("2d");
      StudioUI.fitPlan();
    }, props || {});
  await page.setViewportSize({ width: 1440, height: 1000 });
  await reset({ elements: [room("a"), room("b", 164)] });
  await page.evaluate(() => {
    StudioUI.select(0);
    DesignUI.wallDialog();
  });
  const shared = await page.evaluate(
    () => ProjectModel.walls(ProjectState.capture()).find((w) => w.shared).id,
  );
  await page.locator("#design-wall").selectOption(shared);
  await page.locator("#wall-distance").fill("12");
  await page
    .getByRole("button", { name: "Move shared boundary", exact: true })
    .click();
  assert.ok(await page.evaluate(() => elements.every((e) => e.points)));
  await close();
  await page.evaluate(() => {
    ProjectState.undo();
    DesignUI.topologyDialog();
  });
  assert.ok(await page.locator("dialog svg").count());
  await close();
  await page.evaluate(() => {
    StudioUI.select(0);
    DesignUI.transformDialog();
  });
  await page.locator("#transform-mode").selectOption("move");
  await page.locator("#transform-x").fill("6");
  await page.locator("#transform-y").fill("0");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page
    .getByRole("button", { name: "Apply transformation", exact: true })
    .click();
  assert.equal(await page.evaluate(() => elements[0].x), 26);
  await page.evaluate(() => ProjectState.undo());
  await page.evaluate(() => DesignUI.requirementsDialog());
  await page.locator("#req-room").selectOption("a");
  await page.locator("#req-label").fill("Bedroom target");
  await page
    .getByRole("button", { name: "Add requirement", exact: true })
    .click();
  assert.equal(await page.evaluate(() => DesignUI.data.requirements.length), 1);
  await close();
  await page.evaluate(() => {
    StudioUI.select(0);
    DesignUI.tileDialog();
  });
  await page
    .getByRole("button", { name: "Preview tile cuts", exact: true })
    .click();
  assert.ok(
    (await page.locator("#tile-results").innerText()).includes("tile blanks"),
  );
  assert.ok(await page.evaluate(() => DesignUI.tilePreview.total > 0));
  await close();
  await page.evaluate(() => {
    DesignUI.finishDialog();
    document.getElementById("finish-room").value = "a";
    document.getElementById("finish-floor").value = "Porcelain";
  });
  await page
    .getByRole("button", { name: "Assign finishes", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => DesignUI.data.finishes.a.floor),
    "Porcelain",
  );
  await close();
  await page.evaluate(() => DesignUI.roofDialog());
  await page.locator("#roof-type").selectOption("gable");
  await page.getByRole("button", { name: "Apply roof", exact: true }).click();
  await close();
  await page.evaluate(() => {
    setWorkspaceLayout("3d");
    generate3DModel();
  });
  assert.ok(
    await page.evaluate(() =>
      Engine3D.buildingGroup.children.some((o) => o.userData.designObject),
    ),
  );
  await page.evaluate(() => setWorkspaceLayout("2d"));
  await page.evaluate(() => {
    DesignUI.ceilingDialog();
    document.getElementById("ceiling-height").value = "90";
  });
  await page
    .getByRole("button", { name: "Add ceiling zone", exact: true })
    .click();
  assert.equal(await page.evaluate(() => DesignUI.data.ceilings[0].height), 90);
  await close();
  await page.evaluate(() => {
    DesignUI.sunDialog();
    document.getElementById("sun-lat").value = "20.3";
    DesignUI.sunApply();
  });
  assert.ok(
    (await page.locator("#sun-results").innerText()).includes("Altitude"),
  );
  await close();
  await page.evaluate(() => {
    StudioUI.select(0);
    Selection.ids = new Set(["a"]);
    Selection.action("Delete selection");
  });
  assert.ok(await page.evaluate(() => DesignUI.data.trash.length));
  await page.evaluate(() => {
    DesignUI.trashDialog();
    DesignUI.restoreTrash(0);
  });
  assert.ok(await page.evaluate(() => elements.some((e) => e.id === "a")));
  await close();
  await page.evaluate(() => {
    window.designDownloads = [];
    window.designOriginalDownload = NavActionEngine.downloadBlob;
    NavActionEngine.downloadBlob = (data, name, type) =>
      designDownloads.push({ data, name, type });
    DesignIO.package();
    DesignIO.svg();
    DesignIO.ifc();
  });
  assert.ok(
    await page.evaluate(() =>
      designDownloads.some((d) => d.name.endsWith(".zip")),
    ),
  );
  assert.ok(
    await page.evaluate(() => {
      const zip = designDownloads.find((d) => d.name.endsWith(".zip")),
        files = fflate.unzipSync(zip.data);
      return !!files["project.json"] && !!files["coordination.ifc"];
    }),
  );
  assert.ok(
    await page.evaluate(() =>
      designDownloads
        .find((d) => d.name.endsWith(".ifc"))
        .data.includes("IFCWALL"),
    ),
  );
  await page.evaluate(
    () => (NavActionEngine.downloadBlob = designOriginalDownload),
  );
  await page.evaluate(() => DesignUI.dxfDialog());
  await page.locator('#studio-dialog input[type="file"]').setInputFiles({
    name: "test.dxf",
    mimeType: "application/dxf",
    buffer: Buffer.from(
      "0\nSECTION\n2\nENTITIES\n0\nLINE\n8\nTest\n10\n0\n20\n0\n11\n120\n21\n0\n0\nENDSEC\n0\nEOF\n",
    ),
  });
  await page.waitForSelector(".dxf-map");
  await page
    .getByRole("button", { name: "Apply selected layers", exact: true })
    .click();
  assert.ok(await page.evaluate(() => PlanningUI.data.walls.length));
  await page.evaluate(() => DesignUI.explorerDialog());
  await page.locator("#object-search").fill("bedroom");
  assert.ok(await page.locator("#object-rows table").count());
  await close();

  // Package import is a true round trip and must preserve openings/design metadata.
  await page.evaluate(async () => {
    const zip = designDownloads.find((d) => d.name.endsWith(".zip"));
    const expected = ProjectModel.normalize(
      JSON.parse(fflate.strFromU8(fflate.unzipSync(zip.data)["project.json"])),
    );
    await DesignIO.importPackage(new File([zip.data], "roundtrip.zip"));
    window.designRoundTrip =
      JSON.stringify(ProjectState.capture().design) ===
        JSON.stringify(expected.design) &&
      elements.length === expected.elements.length;
  });
  assert.ok(await page.evaluate(() => designRoundTrip));
  await close();
  // All object changes in a bulk operation must roll back together when one record is locked.
  await page.evaluate(() => {
    DesignUI.explorerDialog();
    DesignUI.recordProperty(elements[0].id, "locked", true);
    document.querySelector(".explorer-check").checked = true;
    DesignUI.bulkEdit();
  });
  assert.ok(await page.evaluate(() => elements[0].customName !== "Room 1"));
  await page.evaluate(() =>
    DesignUI.recordProperty(elements[0].id, "locked", false),
  );
  await close();
  // Every new advertised workflow must open without uncaught errors.
  const count = await page.evaluate(() => DesignUI.tools().length);
  for (let i = 0; i < count; i++) {
    await close();
    await page.evaluate(async (i) => {
      StudioUI.select(elements.findIndex((e) => !e.isFurniture));
      await DesignUI.tools()[i][2]();
    }, i);
  }
  await close();
  await page.evaluate(() => {
    DesignUI.sheetDialog();
    DesignUI.saveSheet();
  });
  const popupPromise = context.waitForEvent("page");
  await page
    .getByRole("button", { name: "Preview composed sheets", exact: true })
    .click();
  const popup = await popupPromise;
  await popup.waitForLoadState();
  assert.ok(await popup.locator("svg").count());
  await popup.close();
  await close();

  await page.evaluate(() => {
    DesignUI.tilePreview = null;
    setWorkspaceLayout("3d");
    generate3DModel();
  });
  const memory = await page.evaluate(async () => {
    const tick = () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const sample = () => ({ ...Engine3D.renderer.info.memory });
    for (let i = 0; i < 4; i++) {
      ProjectState.meta.design.roof.rise = 30 + i;
      generate3DModel();
      await tick();
    }
    const before = sample();
    for (let i = 0; i < 24; i++) {
      ProjectState.meta.design.roof.rise = 36 + i;
      generate3DModel();
      await tick();
    }
    return { before, after: sample() };
  });
  assert.ok(
    memory.after.geometries <= memory.before.geometries + 8,
    JSON.stringify(memory),
  );
  assert.ok(
    memory.after.textures <= memory.before.textures + 3,
    JSON.stringify(memory),
  );
  console.log("Repeated 3D rebuild resource check:", memory);
  await page.evaluate(() => setWorkspaceLayout("2d"));
  await require("./sync-browser.cjs")({ page, context, assert });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  for (const label of ["2D", "Split", "3D"]) {
    const box = await page
      .getByRole("button", { name: label, exact: true })
      .first()
      .boundingBox();
    assert.ok(
      box && box.x >= 0 && box.x + box.width <= 390,
      `${label} must be reachable on mobile`,
    );
  }
  await page.screenshot({ path: "/tmp/archcad-design-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "/tmp/archcad-design-desktop.png" });
  console.log(
    "Design workflows: connected editing, transforms, requirements, tiles, finishes, roofs, ceilings, sun, trash, ZIP/SVG/IFC, DXF, all workflow entry points and mobile passed",
  );
};
