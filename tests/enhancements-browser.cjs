module.exports = async ({ page, assert }) => {
  const original = await page.evaluate(() => ({
      project: ProjectState.capture(),
      preferences: structuredClone(PlanningUI.preferences),
      theme: document.body.dataset.uiTheme,
    })),
    viewport = page.viewportSize();
  await page
    .getByRole("button", { name: "Studio upgrades", exact: true })
    .click();
  assert.equal(await page.locator(".enhancement-hub button").count(), 18);
  const colors = new Set();
  for (const theme of ["graphite", "pearl", "ocean", "sand"]) {
    await page.evaluate((t) => StudioEnhancements.theme(t), theme);
    colors.add(
      await page
        .locator(".studio-header")
        .evaluate((n) => getComputedStyle(n).backgroundColor),
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem("ArchCAD_UI_Theme")),
      theme,
    );
  }
  assert.equal(colors.size, 4);
  await page.evaluate(() => {
    StudioEnhancements.theme("graphite");
    StudioEnhancements.close();
    const p = ProjectState.capture();
    ProjectState.apply(
      {
        ...p,
        plot: { ...p.plot, inW: "420", inH: "320" },
        unit: "in",
        floorCount: 2,
        currentFloor: 0,
        elements: [
          {
            id: "upgrade-room",
            type: "bedroom",
            customName: "Suite",
            x: 10,
            y: 10,
            w: 180,
            h: 180,
            floor: 0,
          },
          {
            id: "upgrade-kitchen",
            type: "kitchen",
            x: 210,
            y: 10,
            w: 180,
            h: 180,
            floor: 0,
          },
          {
            id: "upper-room",
            type: "bedroom",
            x: 10,
            y: 10,
            w: 180,
            h: 180,
            floor: 1,
          },
          {
            id: "upgrade-bed",
            type: "bed",
            isFurniture: true,
            x: 30,
            y: 30,
            w: 60,
            h: 80,
            floor: 0,
          },
          {
            id: "upgrade-chair",
            type: "chair",
            isFurniture: true,
            x: 105,
            y: 30,
            w: 24,
            h: 24,
            floor: 0,
          },
        ],
        fixtures: [
          {
            id: "upgrade-door",
            roomId: 0,
            type: "door",
            edge: "top",
            offset: 30,
            size: 36,
          },
          {
            id: "upgrade-window",
            roomId: 0,
            type: "window",
            edge: "right",
            offset: 60,
            size: 36,
          },
        ],
        design: { ...p.design, presentation: PresentationModel.defaults() },
      },
      { rebase: true },
    );
    StudioUI.select(0);
    setWorkspaceLayout("4d");
  });
  await page.waitForFunction(() => Engine4D.ready && Engine4D.frames > 0);
  await page.evaluate(() => StudioEnhancements.materials());
  await page.locator("#enh-finish").selectOption("wood");
  await page.locator("#enh-color").fill("#c7a681");
  await page.locator("#enh-roughness").fill(".4");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  assert.equal(await page.evaluate(() => !!StudioEnhancements.preview), true);
  assert.equal(
    await page.evaluate(
      () => !!ProjectState.meta.design.presentation.surfaces["upgrade-room"],
    ),
    false,
  );
  await page.getByRole("button", { name: "Apply finish", exact: true }).click();
  assert.equal(
    await page.evaluate(
      () =>
        ProjectState.meta.design.presentation.surfaces["upgrade-room"].floor
          .color,
    ),
    "#c7a681",
  );
  await page.evaluate(() => {
    ProjectState.undo();
  });
  assert.equal(
    await page.evaluate(
      () => !!ProjectState.meta.design.presentation.surfaces["upgrade-room"],
    ),
    false,
  );
  await page.evaluate(() => ProjectState.redo());
  await page.locator("#enh-surface").selectOption("wall");
  await page.locator("#enh-color").fill("#ddeeff");
  await page.getByRole("button", { name: "Apply finish", exact: true }).click();
  assert.equal(
    await page.evaluate(
      () =>
        ProjectState.meta.design.presentation.surfaces["upgrade-room"].wall
          .color,
    ),
    "#ddeeff",
  );
  await page.locator("#enh-surface").selectOption("ceiling");
  await page.locator("#enh-color").fill("#fff4df");
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await page.waitForFunction(() =>
    StudioEnhancements.ceilings.some((m) => m.visible),
  );
  await page
    .getByRole("button", { name: "Cancel preview", exact: true })
    .click();
  assert.equal(await page.evaluate(() => StudioEnhancements.preview), null);
  await page.evaluate(() => {
    StudioEnhancements.close();
    StudioEnhancements.focusSelection();
  });
  await page.waitForFunction(
    () => StudioEnhancements.focusRoom === "upgrade-room",
  );
  assert.equal(
    await page.evaluate(() => StudioEnhancements.clipping([]).length),
    2,
  );
  await page.evaluate(() => {
    StudioEnhancements.clearRoom();
    StudioEnhancements.toggleLinked();
  });
  await page.waitForFunction(() => document.body.dataset.linked4d === "true");
  assert.equal(await page.locator("#canvas-wrapper").isVisible(), true);
  await page.evaluate(() => StudioEnhancements.toggleLinked());
  await page.evaluate(() => {
    StudioUI.select(3);
    StudioEnhancements.placement();
  });
  await page.locator("#enh-place-edge").selectOption("right");
  await page.locator("#enh-place-gap").fill("12");
  await page
    .getByRole("button", { name: "Place at exact distance", exact: true })
    .click();
  assert.equal(await page.evaluate(() => elements[3].x), 113.5);
  await page.evaluate(() => StudioEnhancements.clearances());
  assert.ok(
    await page
      .getByText("Potential gaps and conservative door-swing envelopes", {
        exact: false,
      })
      .isVisible(),
  );
  await page.evaluate(() => {
    StudioEnhancements.close();
    StudioUI.select(0);
    StudioEnhancements.openingsDialog();
  });
  await page.locator('input[aria-label="Open upgrade-door"]').fill("0.75");
  await page
    .locator('input[aria-label="Open upgrade-door"]')
    .dispatchEvent("change");
  await page.waitForFunction(
    () =>
      ProjectState.meta.design.presentation.openings["upgrade-door"] === 0.75,
  );
  await page.waitForFunction(() =>
    StudioEnhancements.leaves.some(
      (l) => l.f.id === "upgrade-door" && Math.abs(l.copy.rotation.y) > 0.5,
    ),
  );
  await page.evaluate(() => StudioEnhancements.close());
  await page.evaluate(() => {
    StudioEnhancements.navigation(true);
  });
  await page.waitForFunction(() => Engine4D.dynamicScale < 1);
  assert.equal(await page.evaluate(() => Engine4D.ao.enabled), false);
  await page.evaluate(() => StudioEnhancements.navigation(false));
  await page.waitForFunction(() => Engine4D.dynamicScale === 1);
  await page.evaluate(() => StudioEnhancements.interiorDialog());
  await page.locator("#enh-light-intensity").fill("1.2");
  await page
    .getByRole("button", { name: "Apply lighting", exact: true })
    .click();
  assert.equal(
    await page.evaluate(
      () => ProjectState.meta.design.presentation.lights.intensity,
    ),
    1.2,
  );
  await page.evaluate(() => {
    StudioEnhancements.close();
    StudioEnhancements.setExplosion(60);
  });
  await page.waitForTimeout(250);
  const offset = await page.evaluate(() => {
    const pair = Engine4D.pairs.find(
      ([s]) =>
        s.userData.elementId === "upper-room" &&
        s.parent === Engine3D.buildingGroup,
    );
    return pair[1].position.y - pair[0].position.y;
  });
  assert.ok(offset > 60);
  await page.evaluate(() => StudioEnhancements.setExplosion(0));
  await page.waitForTimeout(250);
  await page.evaluate(() => StudioEnhancements.sectionDialog());
  await page.getByRole("button", { name: "Apply box", exact: true }).click();
  assert.equal(
    await page.evaluate(() => Engine3D.renderer.clippingPlanes.length),
    6,
  );
  await page.evaluate(() => StudioEnhancements.close());
  assert.equal(await page.locator("#section-handles button").count(), 6);
  const drag = await page.evaluate(() => {
    const key = "xmax", start = StudioEnhancements.section[key];
    const a = StudioEnhancements.planeScreen(key), b = StudioEnhancements.planeScreen(key, 20);
    return { start, a, b };
  });
  const handle = page.getByRole("button", { name: "Drag section xmax", exact: true });
  const handleBox = await handle.boundingBox();
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + drag.b.x - drag.a.x, handleBox.y + handleBox.height / 2 + drag.b.y - drag.a.y, { steps: 4 });
  await page.mouse.up();
  assert.ok(Math.abs(await page.evaluate(() => StudioEnhancements.section.xmax) - drag.start) > 1);
  await page.evaluate(() => StudioEnhancements.clearSection());
  await page.evaluate(() => {
    StudioEnhancements.setFocus(true);
  });
  assert.equal(await page.locator(".studio-header").isVisible(), false);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".studio-header").isVisible(), true);
  await page.evaluate(() => StudioEnhancements.walkDialog());
  await page
    .getByRole("button", { name: "Start walkthrough", exact: true })
    .click();
  await page.waitForFunction(() => StudioEnhancements.walking);
  const look = await page.evaluate(() => Engine3D.camera.quaternion.toArray());
  await page.waitForTimeout(120);
  const stableLook = await page.evaluate(() => Engine3D.camera.quaternion.toArray());
  assert.ok(stableLook.every((v, i) => Math.abs(v - look[i]) < 0.001));
  const before = await page.evaluate(() => Engine3D.camera.position.toArray());
  await page.keyboard.down("w");
  await page.waitForFunction((before) => Engine3D.camera.position.toArray().some((v, i) => Math.abs(v - before[i]) > 0.01), before);
  await page.keyboard.up("w");
  const after = await page.evaluate(() => Engine3D.camera.position.toArray());
  assert.notDeepEqual(before, after);
  const touch = await page.getByRole("button", { name: "Walk backward", exact: true }).boundingBox();
  await page.mouse.move(touch.x + touch.width / 2, touch.y + touch.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => StudioEnhancements.walkInput.backward === true);
  await page.waitForTimeout(150);
  await page.mouse.up();
  assert.equal(await page.evaluate(() => StudioEnhancements.walkInput.backward), false);
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => StudioEnhancements.walking), false);
  await page.evaluate(() => {
    StudioEnhancements.section = null;
    StudioEnhancements.focusRoom = null;
    StudioEnhancements.labels = "none";
    ViewportUI.inspectFloor("0");
    StudioEnhancements.startEyedropper();
  });
  await page.waitForTimeout(250);
  const pickPixel = async (roomIndex) =>
    page.evaluate((index) => {
      const rect = Engine3D.renderer.domElement.getBoundingClientRect(),
        panel = document
          .getElementById("advanced-view-panel")
          .getBoundingClientRect(),
        candidates = [];
      Engine4D.model.traverse((mesh) => {
        if (
          mesh.isMesh &&
          mesh.userData.roomIndex === index &&
          mesh.userData.presentationSurface &&
          mesh.visible
        ) {
          const point = new THREE.Box3()
            .setFromObject(mesh)
            .getCenter(new THREE.Vector3())
            .project(Engine4D.camera);
          const pixel = {
            clientX: rect.x + ((point.x + 1) * rect.width) / 2,
            clientY: rect.y + ((1 - point.y) * rect.height) / 2,
          };
          const hit = StudioEnhancements.hit(pixel);
          if (
            hit?.object.userData.roomIndex === index &&
            hit.object.userData.presentationSurface &&
            pixel.clientX > panel.right + 8 &&
            pixel.clientX < rect.right - 10 &&
            pixel.clientY > rect.y + 20 &&
            pixel.clientY < rect.bottom - 20
          )
            candidates.push({ x: pixel.clientX, y: pixel.clientY });
        }
      });
      return candidates[0];
    }, roomIndex);
  const samplePoint = await pickPixel(0);
  assert.ok(samplePoint, "A room surface must be available for sampling");
  await page.mouse.click(samplePoint.x, samplePoint.y);
  assert.equal(
    await page.evaluate(() => StudioEnhancements.pickMode),
    "target",
  );
  const targetPoint = await pickPixel(1);
  assert.ok(targetPoint, "A target surface must be available");
  await page.mouse.click(targetPoint.x, targetPoint.y);
  await page.waitForFunction(() => StudioEnhancements.pickMode === null);
  assert.ok(
    await page.evaluate(
      () =>
        Object.keys(
          ProjectState.meta.design.presentation.surfaces["upgrade-kitchen"] ||
            {},
        ).length > 0,
    ),
  );
  await page.evaluate(() => {
    WorkbenchUI.optionDialog();
  });
  await page.locator("#wb-option-name").fill("Finish alternative");
  await page
    .getByRole("button", { name: "Save current as an option", exact: true })
    .click();
  assert.equal(await page.evaluate(() => WorkbenchUI.data.options.length), 1);
  await page
    .getByRole("button", { name: "Compare with current", exact: true })
    .click();
  assert.ok(
    await page
      .getByText("changed surface assignments", { exact: false })
      .isVisible(),
  );
  await page.evaluate(() => {
    StudioEnhancements.close();
    DesignUI.sunDialog();
  });
  await page.locator("#sun-hour").fill("16");
  await page
    .getByRole("button", { name: "Update sun & shadows", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => ProjectState.meta.design.site.hour),
    16,
  );
  assert.equal(await page.evaluate(() => StudioEnhancements.sunStudy), true);
  await page.evaluate(() => StudioEnhancements.close());
  await page.evaluate(() => {
    StudioEnhancements.labels = "rooms";
    ViewportUI.fit(false, false);
    Engine3D.needsRender = true;
  });
  await page.waitForFunction(() =>
    document.querySelector("#enhancement-labels button"),
  );
  await page.screenshot({ path: "/tmp/archcad-studio-plus-desktop.png" });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 740 });
    await page.evaluate(() => StudioEnhancements.hub());
    const box = await page.locator("#studio-dialog").boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
    await page.evaluate(() => StudioEnhancements.close());
  }
  await page.screenshot({ path: "/tmp/archcad-studio-plus-mobile.png" });
  await page.setViewportSize(viewport);
  await page.evaluate(({ project, preferences, theme }) => {
    StudioEnhancements.stopWalk();
    StudioEnhancements.clearRuntime();
    StudioEnhancements.setFocus(false);
    ProjectState.apply(project, { rebase: true });
    PlanningUI.preferences = preferences;
    PlanningUI.applyPrefs();
    PlanningUI.refresh();
    StudioEnhancements.theme(theme || "graphite");
    setWorkspaceLayout("2d");
  }, original);
  console.log(
    "Studio+ enhancements: eighteen tools, finishes/undo, four themes, linked view, placement, openings, adaptive quality, lights, exploded floors, sections, focus, touch/keyboard walking and overlays passed",
  );
};
