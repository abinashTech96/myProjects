module.exports = async ({ page, assert }) => {
  const saved = await page.evaluate(() => ({
    project: ProjectState.capture(),
    prefs: structuredClone(PlanningUI.preferences),
    theme: document.body.dataset.uiTheme,
  }));
  await page.evaluate(() => {
    const p = ProjectState.capture();
    ProjectState.apply(
      {
        ...p,
        unit: "in",
        floorCount: 2,
        currentFloor: 0,
        elements: [
          {
            id: "unified-room",
            type: "bedroom",
            floor: 0,
            x: 20,
            y: 20,
            w: 200,
            h: 200,
          },
          {
            id: "unified-upper",
            type: "living",
            floor: 1,
            x: 20,
            y: 20,
            w: 200,
            h: 200,
          },
          {
            id: "unified-bed",
            type: "bed",
            isFurniture: true,
            floor: 0,
            x: 50,
            y: 60,
            w: 60,
            h: 80,
          },
        ],
        fixtures: [
          {
            id: "unified-door",
            roomId: 0,
            type: "door",
            edge: "bottom",
            offset: 25,
            size: 32,
          },
          {
            id: "unified-window",
            roomId: 0,
            type: "window",
            edge: "right",
            offset: 30,
            size: 36,
          },
        ],
        planning: PlanningModel.defaults(),
        design: DesignModel.defaults(),
      },
      { rebase: true },
    );
    setWorkspaceLayout("2d");
    WorkspacePanels.close();
    WorkspaceRefinement.pinned = true;
    WorkspaceRefinement.expand(true);
  });
  await page.waitForTimeout(300);
  for (const theme of ["graphite", "pearl", "ocean", "sand"]) {
    await page.evaluate((theme) => StudioEnhancements.theme(theme), theme);
    // A loaded software renderer can delay the first animation frame. Assert
    // the settled visible state instead of sampling a partly expanded dock.
    await page.waitForFunction(()=>{
      const rail=document.getElementById('workspace-rail').getBoundingClientRect();
      const labels=[...document.querySelectorAll('#workspace-primary-tools button>span')].filter(n=>n.parentElement.getClientRects().length);
      return labels.length>=7&&labels.every(n=>{
        const s=getComputedStyle(n),r=n.getBoundingClientRect();
        return s.opacity==='1'&&s.visibility==='visible'&&s.display!=='none'&&s.clipPath==='none'&&r.width>40&&r.right<=rail.right+1;
      });
    },null,{timeout:10000});
    const labels = await page
      .locator("#workspace-primary-tools button>span")
      .evaluateAll((nodes) =>
        nodes
          .filter((n) => n.parentElement.getClientRects().length)
          .map((n) => {
            const s = getComputedStyle(n),
              r = n.getBoundingClientRect(),
              rail = document
                .getElementById("workspace-rail")
                .getBoundingClientRect();
            return {
              text: n.textContent,
              visible:
                s.opacity === "1" &&
                s.visibility === "visible" &&
                s.display !== "none" &&
                s.clipPath === "none",
              width: r.width,
              right: r.right,
              rail: rail.right,
            };
          }),
      );
    assert.ok(labels.length >= 7);
    assert.ok(
      labels.every((l) => l.visible && l.width > 40 && l.right <= l.rail + 1),
      theme +
        ": expanded dock labels must actually be visible " +
        JSON.stringify(labels),
    );
  }
  await page.screenshot({ path: "/tmp/archcad-dock-labels.png" });
  await page.evaluate(() => {
    WorkspaceRefinement.pinned = false;
    WorkspaceRefinement.expand(false);
  });
  const buttons = [
    ["Tools", "Tools"],
    ["Workspace widgets", "Workspace widgets"],
    ["Canvas settings", "Canvas settings"],
    ["Search tools", "Find a tool or room"],
    ["Studio upgrades", "Studio+"],
    ["Objects", "Rooms & objects"],
  ];
  let reference;
  for (const [label, title] of buttons) {
    await page
      .locator("#workspace-primary-tools")
      .getByRole("button", { name: label, exact: true })
      .click();
    await page.waitForTimeout(300);
    const d = page.locator("#studio-dialog");
    await page.waitForFunction(
      () => document.getElementById("studio-dialog")?.dataset.docked === "true",
    );
    assert.equal(
      await d.evaluate((n) => n.matches(":modal")),
      false,
      label + " uses a docked panel, not a modal",
    );
    const r = await d.boundingBox(),
      rail = await page.locator("#workspace-rail").boundingBox();
    assert.ok(Math.abs(r.x - rail.x - rail.width) < 2);
    reference ??= r;
    assert.ok(Math.abs(r.width - reference.width) < 2);
    assert.ok(Math.abs(r.y - reference.y) < 2);
    assert.ok(
      (await d.locator(".studio-dialog-header strong").textContent()).includes(
        title,
      ),
    );
  }
  await page.screenshot({ path: "/tmp/archcad-unified-tools.png" });
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("#studio-dialog[open]").count(),
    0,
    "Escape closes the nonmodal tool panel",
  );
  await page
    .locator("#workspace-primary-tools")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  assert.ok(await page.locator(".studio-catalog").isVisible());
  await page.evaluate(() => StudioUI.select(0));
  assert.ok(await page.locator(".studio-inspector").isVisible());
  const inspector = await page.locator(".studio-inspector").boundingBox();
  assert.ok(Math.abs(inspector.x - reference.x) < 2);
  assert.ok(Math.abs(inspector.width - reference.width) < 2);
  await page.evaluate(() => {
    StudioUI.closeProperties();
    WorkspacePanels.close();
  });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await page
      .locator("#workspace-primary-tools")
      .getByRole("button", { name: "Tools", exact: true })
      .click();
    const r = await page.locator("#studio-dialog").boundingBox();
    assert.ok(r.x >= 0 && r.x + r.width <= width + 1 && r.y + r.height <= 850);
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log("Unified panels: desktop and responsive panel checks passed");
  await page.evaluate(() => setWorkspaceLayout("4d"));
  await page.locator("#fourd-start").click();
  await page
    .waitForFunction(() => Engine4D.ready && !FourDWorkspace.starting && Engine4D.frames > 0)
    .catch(async (error) => {
      console.log(
        "4D startup diagnostics",
        await page.evaluate(() => ({
          ready: Engine4D.ready,
          state: Engine4D.state,
          error: Engine4D.lastError,
          mode: StudioUI.mode,
          frames: Engine4D.frames,
          active: Engine4D.active,
          loop: Engine3D.loopRunning,
          dirty: Engine3D.needsRender,
          width: document.getElementById("three-container").clientWidth,
          model: !!Engine4D.model,
        })),
      );
      throw error;
    });
  console.log("Unified panels: 4D renderer started");
  assert.ok(
    await page.evaluate(() =>
      Engine4D.pairs
        .filter(
          ([s, c]) =>
            s.isMesh && s.geometry && !s.userData.presentationGenerated,
        )
        .every(([s, c]) => s.geometry !== c.geometry),
    ),
    "4D never borrows editor GPU geometry",
  );
  const audit = await page.evaluate(() => {
    const group = new THREE.Group(),
      p = ProjectState.capture(),
      { SCALE } = get3DEnvironmentParams();
    for (const asset of ASSET_CATALOGS.furniture.items) {
      const node = createFurniture3D(
        asset.type,
        asset.w * SCALE,
        asset.h * SCALE,
      );
      node.userData = { elementId: "catalog-audit-" + asset.type };
      group.add(node);
    }
    const stage = Scene4D.stage(Engine4D, group, p),
      result = { assets: group.children.length, issues: stage.issues };
    Scene4D.dispose({
      model: stage.model,
      materials: stage.materials,
      sceneResources: stage.resources,
    });
    return result;
  });
  assert.ok(audit.assets >= 18);
  assert.deepEqual(
    audit.issues,
    [],
    "Every built-in furniture asset produces finite render geometry",
  );
  console.log("Unified panels: furniture geometry audit passed");
  const before = await page.evaluate(() =>
    JSON.stringify(ProjectState.capture().elements),
  );
  await page.evaluate(() => {
    WorkspacePanels.close();
    StudioUI.closeProperties();
    ViewportUI.orient("iso");
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/tmp/archcad-new-4d-scene.png" });
  const memory = await page.evaluate(() => {
    const r = Engine4D.renderer;
    return {
      width: r.domElement.width,
      height: r.domElement.height,
      geometries: Engine4D.sceneResources.geometries.size,
    };
  });
  assert.ok(memory.width * memory.height <= 1101000);
  assert.ok(memory.geometries > 0);
  await page.evaluate(() => {
    window.unifiedReleased = 0;
    Engine4D.sceneResources.geometries.forEach((g) =>
      g.addEventListener("dispose", () => window.unifiedReleased++),
    );
    const render = Engine4D.composer.render;
    Engine4D.composer.render = () => {
      throw Error("Controlled renderer failure");
    };
    window.unifiedResult = Engine4D.render();
    Engine4D.composer.render = render;
  });
  assert.equal(await page.evaluate(() => window.unifiedResult), false);
  assert.equal(await page.evaluate(() => Engine4D.state), "fallback");
  assert.equal(await page.locator("#four-d-canvas").isVisible(), false);
  assert.equal(await page.locator(".presentation-input-surface").count(), 0);
  await page.evaluate(() => Engine4D.recover());
  await page.waitForFunction(
    () => Engine4D.ready && Engine4D.state === "ready",
  );
  assert.ok(
    await page.evaluate(() => window.unifiedReleased > 0),
    "Recovery releases the previous scene",
  );
  const supportsLoss = await page.evaluate(
    () => !!Engine4D.renderer.getContext().getExtension("WEBGL_lose_context"),
  );
  if (supportsLoss) {
    await page.evaluate(() => {
      window.unifiedLoss = Engine4D.renderer
        .getContext()
        .getExtension("WEBGL_lose_context");
      window.unifiedLoss.loseContext();
    });
    await page.waitForFunction(() => Engine4D.state === "context-lost");
    assert.equal(await page.locator(".presentation-input-surface").count(), 0);
    await page.waitForTimeout(150);
    await page.evaluate(() => window.unifiedLoss.restoreContext());
    await page.waitForFunction(
      () => Engine4D.ready && Engine4D.state === "ready",
    );
  }
  assert.equal(
    await page.evaluate(() => JSON.stringify(ProjectState.capture().elements)),
    before,
    "Recovery preserves all editable elements",
  );
  await page.evaluate(() => setWorkspaceLayout("2d"));
  assert.equal(await page.evaluate(() => Engine4D.sceneResources), null);
  await page.evaluate((saved) => {
    ProjectState.apply(saved.project, { rebase: true });
    PlanningUI.preferences = saved.prefs;
    PlanningUI.savePrefs();
    PlanningUI.applyPrefs();
    StudioEnhancements.theme(saved.theme);
    WorkspacePanels.close();
  }, saved);
  console.log(
    "Unified panels: real visible labels in all themes, shared dock layout, responsive forms, owned 4D geometry, memory budget, failure fallback and real WebGL context restoration passed",
  );
};
