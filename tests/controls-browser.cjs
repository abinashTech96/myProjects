module.exports = async ({ page, assert }) => {
  const original = await page.evaluate(() => ({
    project: ProjectState.capture(),
    theme: document.body.dataset.uiTheme,
  }));
  await page.evaluate(() => {
    const p = ProjectState.capture();
    ProjectState.apply(
      {
        ...p,
        unit: "in",
        floorCount: 1,
        currentFloor: 0,
        plot: { ...p.plot, inW: "600", inH: "500" },
        elements: [
          {
            id: "ctx-bedroom",
            type: "bedroom",
            x: 40,
            y: 40,
            w: 160,
            h: 160,
            floor: 0,
          },
          {
            id: "ctx-living",
            type: "living",
            x: 260,
            y: 40,
            w: 160,
            h: 160,
            floor: 0,
          },
          {
            id: "ctx-bed",
            type: "bed",
            isFurniture: true,
            x: 65,
            y: 65,
            w: 60,
            h: 80,
            rot: 90,
            floor: 0,
          },
          {
            id: "ctx-polygon",
            type: "bedroom",
            x: 40,
            y: 260,
            w: 160,
            h: 160,
            floor: 0,
            points: [
              { x: 0, y: 0 },
              { x: 160, y: 0 },
              { x: 160, y: 70 },
              { x: 70, y: 70 },
              { x: 70, y: 160 },
              { x: 0, y: 160 },
            ],
          },
        ],
        fixtures: [
          {
            id: "ctx-door",
            type: "door",
            roomId: 0,
            edge: "top",
            offset: 30,
            size: 36,
          },
          {
            id: "ctx-window",
            type: "window",
            roomId: 1,
            edge: "right",
            offset: 60,
            size: 40,
          },
        ],
        planning: PlanningModel.defaults(),
        design: DesignModel.defaults(),
      },
      { rebase: true },
    );
    setWorkspaceLayout("2d");
    WorkspacePanels.close();
    StudioUI.fitPlan();
  });
  const at = async (x, y) =>
    page.evaluate(
      ({ x, y }) => {
        const { I, SCALE } = Utils.getMetrics(),
          pt = document.getElementById("blueprint").createSVGPoint();
        pt.x = I.x + x * SCALE;
        pt.y = I.y + y * SCALE;
        const q = pt.matrixTransform(
          document.getElementById("element-container").getScreenCTM(),
        );
        return { x: q.x, y: q.y };
      },
      { x, y },
    );
  const open = async (x, y) => {
    await page.evaluate(() => PlanContextMenu.close(false));
    const p = await at(x, y);
    await page.mouse.click(p.x, p.y, { button: "right" });
    await page.waitForFunction(
      () => document.getElementById("context-menu").style.display === "block",
    );
  };
  const menu = page.locator("#context-menu");
  await page.evaluate(() => StudioUI.select(1));
  await open(175, 170);
  assert.equal(await menu.getAttribute("data-context"), "room");
  assert.equal(
    await page.evaluate(() => selectedElIndex),
    0,
    "The clicked room replaces the previous target",
  );
  assert.equal(
    await page.evaluate(() => isDragging),
    false,
    "Right-click never starts an element drag",
  );
  await menu.getByRole("menuitem", { name: "Duplicate", exact: false }).click();
  assert.equal(await page.evaluate(() => elements.length), 5);
  await page.evaluate(() => ProjectState.undo());
  await open(85, 85);
  assert.equal(await menu.getAttribute("data-context"), "furniture");
  assert.equal(await page.evaluate(() => selectedElIndex), 2);
  await page.keyboard.press("ArrowDown");
  assert.equal(await menu.locator(":focus").getAttribute("role"), "menuitem");
  const before = await page.evaluate(() => JSON.stringify(elements));
  await page.keyboard.press("ArrowDown");
  assert.equal(
    await page.evaluate(() => JSON.stringify(elements)),
    before,
    "Menu arrow keys cannot move objects",
  );
  await page.keyboard.press("Escape");
  assert.equal(await menu.isVisible(), false);
  await page.evaluate(() => StudioUI.select(0));
  const corner = await at(40, 40);
  const dimensions = await page.evaluate(() => JSON.stringify(elements));
  await page.mouse.move(corner.x, corner.y);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(corner.x + 20, corner.y + 20);
  await page.mouse.up({ button: "right" });
  assert.equal(
    await page.evaluate(() => JSON.stringify(elements)),
    dimensions,
    "Right-clicking a resize handle cannot resize the plan",
  );
  await page.keyboard.press("Escape");
  await open(420, 120);
  assert.equal(await menu.getAttribute("data-context"), "opening");
  assert.equal(
    await page.evaluate(() => isDraggingFixture),
    false,
    "Right-click never starts an opening drag",
  );
  await menu
    .getByRole("menuitem", { name: "Edit window", exact: true })
    .click();
  assert.equal(
    await page.locator("#studio-dialog").getAttribute("data-docked"),
    "true",
  );
  assert.ok((await page.locator("#studio-dialog input").count()) > 0);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.evaluate(() => {
    ProjectState.commit("Lock room", () => (elements[1].locked = true));
  });
  await open(420, 120);
  assert.equal(
    await menu
      .getByRole("menuitem", { name: "Remove opening", exact: true })
      .isDisabled(),
    true,
  );
  await page.keyboard.press("Escape");
  await open(480, 250);
  assert.equal(
    await menu.getAttribute("data-context"),
    "plot",
    "Empty plot ignores a previously selected room",
  );
  assert.equal(
    await menu
      .getByRole("menuitem", { name: "Delete selection", exact: false })
      .count(),
    0,
  );
  await menu.getByRole("menuitem", { name: "Undo", exact: false }).click();
  assert.equal(await page.evaluate(() => elements[1].locked), false);
  await open(80, 300);
  assert.equal(
    await menu.getAttribute("data-context"),
    "room",
    "Polygon interiors can be picked",
  );
  await open(170, 390);
  assert.equal(
    await menu.getAttribute("data-context"),
    "plot",
    "Polygon cutouts are empty space " +
      JSON.stringify(
        await page.evaluate(() => ({
          context: PlanContextMenu.context,
          polygon: elements[3],
          inside: PlanningModel.inside(
            { x: 170, y: 390 },
            PlanningModel.points(elements[3]),
          ),
        })),
      ),
  );
  await page.keyboard.press("Escape");
  await page.evaluate(() => WorkspacePanels.close());
  const planBox = await page.locator("#blueprint").boundingBox();
  await page.mouse.click(planBox.x + 12, planBox.y + 12, { button: "right" });
  assert.equal(await menu.getAttribute("data-context"), "outside");
  assert.equal(
    await menu
      .getByRole("menuitem", { name: "Delete selection", exact: false })
      .count(),
    0,
  );
  await page.keyboard.press("Escape");
  await page.locator("#blueprint").focus();
  await page.keyboard.press("Shift+F10");
  assert.equal(await menu.isVisible(), true);
  assert.equal(await menu.locator(":focus").getAttribute("role"), "menuitem");
  await page.keyboard.press("Escape");
  const widths = [];
  for (const mode of ["2d", "split", "3d", "4d", "2d"]) {
    await page.locator('.studio-view-modes [data-mode="' + mode + '"]').click();
    widths.push((await page.locator(".studio-view-modes").boundingBox()).width);
    await page.waitForFunction(() =>
      WorkspaceMotion.animations.every((a) => a.playState !== "running"),
    );
    assert.equal(
      await page.evaluate(() =>
        WorkspaceMotion.animations.every((a) => a.playState !== "running"),
      ),
      true,
    );
  }
  assert.ok(
    widths.every((w) => Math.abs(w - 156) < 1),
    "All modes retain one compact, stable button container",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('.studio-view-modes [data-mode="split"]').click();
  assert.equal(await page.evaluate(() => WorkspaceMotion.animations.length), 0);
  await page.locator('.studio-view-modes [data-mode="2d"]').click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const theme of ["graphite", "pearl", "ocean", "sand"]) {
    await page.evaluate((theme) => {
      StudioEnhancements.theme(theme);
      WorkspaceRefinement.pinned = true;
      WorkspaceRefinement.expand(true);
    }, theme);
    await page.waitForTimeout(300);
    assert.equal(
      (await page.locator("#workspace-rail").boundingBox()).width,
      130,
    );
    assert.ok(
      await page
        .locator("#workspace-primary-tools button>span")
        .evaluateAll((nodes) =>
          nodes
            .filter((n) => n.parentElement.getClientRects().length)
            .every((n) => {
              const r = n.getBoundingClientRect(),
                p = n.parentElement.getBoundingClientRect();
              return (
                getComputedStyle(n).opacity === "1" && r.right <= p.right + 1
              );
            }),
        ),
    );
  }
  await page.screenshot({ path: "/tmp/archcad-compact-dock.png" });
  await page.evaluate(() => {
    WorkspaceRefinement.pinned = false;
    WorkspaceRefinement.expand(false);
    WorkspacePanels.close();
  });
  await open(175, 170);
  await page.screenshot({ path: "/tmp/archcad-context-menu.png" });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(100);
    await page.evaluate(() =>
      PlanContextMenu.open({
        clientX: innerWidth - 2,
        clientY: innerHeight - 2,
        target: document.getElementById("blueprint"),
      }),
    );
    const r = await menu.boundingBox();
    assert.ok(
      r.x >= 0 && r.y >= 0 && r.x + r.width <= width && r.y + r.height <= 844,
      "Context menu remains within viewport edges",
    );
    await page.keyboard.press("Escape");
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate((original) => {
    PlanContextMenu.close();
    ProjectState.apply(original.project, { rebase: true });
    StudioEnhancements.theme(original.theme);
    WorkspacePanels.close();
  }, original);
  console.log(
    "Controls: 130px themed dock, stable mode widths, cancellable/reduced motion, pointer-targeted room/furniture/opening/polygon/plot actions, safe right-click, undo, keyboard and viewport bounds passed",
  );
};
