module.exports = async ({ page, assert }) => {
  const original = await page.evaluate(() => ProjectState.capture());
  await page.evaluate(() => {
    const p = ProjectState.capture();
    ProjectState.apply(
      {
        ...p,
        unit: "in",
        plot: { ...p.plot, inW: "480", inH: "360" },
        floorCount: 1,
        currentFloor: 0,
        elements: [
          {
            id: "four-room",
            type: "bedroom",
            x: 12,
            y: 12,
            w: 240,
            h: 240,
            floor: 0,
          },
          {
            id: "four-bed",
            type: "bed",
            isFurniture: true,
            x: 40,
            y: 45,
            w: 60,
            h: 80,
            floor: 0,
          },
          {
            id: "four-chair",
            type: "chair",
            isFurniture: true,
            x: 65,
            y: 60,
            w: 24,
            h: 24,
            floor: 0,
          },
        ],
        fixtures: [
          {
            id: "four-door",
            roomId: 0,
            type: "door",
            edge: "top",
            offset: 40,
            size: 36,
          },
        ],
        design: {
          ...p.design,
          presentation: PresentationModel.defaults(),
          workbench: WorkbenchModel.defaults(),
        },
      },
      { rebase: true },
    );
    StudioUI.select(0);
    setWorkspaceLayout("4d");
  });
  await page.waitForFunction(() => Engine4D.ready && Engine4D.frames > 0);
  await page.evaluate(() => FourDStudio.open());
  assert.equal(await page.locator(".fourd-tabs button").count(), 6);
  assert.equal(
    await page.locator(".workspace-docked-dialog .fourd-form").isVisible(),
    true,
  );
  // Environment changes are independent of the editor's model/resources.
  const env = await page.evaluate(() => {
    const source = Engine3D.buildingGroup,
      model = Engine4D.model,
      colors = [];
    for (const name of ["studio", "overcast", "sunset", "night"]) {
      FourDStudio.change("environment", name);
      Engine4D.render();
      const data = FourDRender.sky.image.data;
      colors.push(data[0] + "," + data[1] + "," + data[2]);
    }
    return {
      source: source === Engine3D.buildingGroup,
      model: model === Engine4D.model,
      colors,
      linear: FourDRender.sky.encoding === THREE.LinearEncoding,
      ready: Engine4D.ready,
      error: Engine4D.lastError,
    };
  });
  assert.ok(env.source && env.model, JSON.stringify(env));
  assert.equal(new Set(env.colors).size, 4);
  assert.ok(env.linear && env.ready, JSON.stringify(env));
  await page
    .getByRole("combobox", { name: "4D environment", exact: true })
    .selectOption("studio");
  // Import a genuine (small flat RGBE) Radiance image through the file field.
  const hdr = Buffer.concat([
    Buffer.from("#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 2 +X 2\n"),
    Buffer.from(Array(4).fill([180, 160, 140, 129]).flat()),
  ]);
  await page.getByLabel("HDR environment file", { exact: true }).setInputFiles({
    name: "studio.hdr",
    mimeType: "application/octet-stream",
    buffer: hdr,
  });
  await page.waitForFunction(
    () =>
      FourDStudio.settings.environment === "custom" &&
      FourDRender.sky.image.width === 2,
  );
  assert.equal(
    await page.evaluate(() =>
      ProjectState.capture().design.presentation.studio.hdr.startsWith("data:"),
    ),
    true,
  );
  await page.evaluate(() => FourDStudio.change("environment", "studio"));
  console.log("4D HDR lighting/import and model isolation passed");
  // Real PBR assignments, history and material ownership.
  await page.evaluate(() => FourDStudio.open("materials"));
  for (const type of [
    "brick",
    "stone",
    "concrete",
    "timber",
    "fabric",
    "glass",
    "metal",
    "mirror",
  ]) {
    await page.locator('[data-material="' + type + '"]').click();
    await page.waitForFunction((t) => {
      Engine4D.render();
      return [...Engine4D.materials].some(
        (m) => m.userData.fourDMaterial === t,
      );
    }, type);
    const pbr = await page.evaluate((t) => {
      const material = [...Engine4D.materials].find(
          (m) => m.userData.fourDMaterial === t,
        ),
        mapped = !["glass", "metal", "mirror"].includes(t);
      let sourceUntouched = true;
      Engine3D.buildingGroup.traverse((n) => {
        if (n.material?.userData.fourDMaterial) sourceUntouched = false;
      });
      return {
        mapped:
          !!material.map && !!material.normalMap && !!material.roughnessMap,
        colorSRGB: !mapped || material.map.encoding === THREE.sRGBEncoding,
        normalLinear:
          !mapped || material.normalMap.encoding === THREE.LinearEncoding,
        sourceUntouched,
        glass: t !== "glass" || (material.transparent && material.opacity < 1),
      };
    }, type);
    assert.equal(pbr.mapped, !["glass", "metal", "mirror"].includes(type));
    assert.ok(
      pbr.colorSRGB && pbr.normalLinear && pbr.sourceUntouched && pbr.glass,
      JSON.stringify(pbr),
    );
  }
  await page.locator('[data-material="timber"]').click();
  await page.evaluate(() => FourDStudio.open("render"));
  await page
    .getByRole("button", { name: "Add wall mirror", exact: true })
    .click();
  await page.waitForFunction(() => {
    Engine4D.render();
    return FourDRender.mirrors.length === 1;
  });
  assert.equal(
    await page.evaluate(() => FourDRender.mirrors[0].getRenderTarget().width),
    512,
  );
  await page
    .getByRole("combobox", { name: "4D reflections", exact: true })
    .selectOption("local");
  await page.waitForFunction(() => {
    Engine4D.render();
    return (
      FourDRender.probe &&
      Engine4D.scene.environment === FourDRender.probeEnvironment?.texture
    );
  });
  assert.equal(await page.evaluate(() => Engine4D.ready), true);
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.waitForFunction(() => {
    Engine4D.render();
    return FourDRender.mirrors.length === 0;
  });
  await page
    .getByRole("combobox", { name: "4D reflections", exact: true })
    .selectOption("environment");
  console.log("4D PBR surfaces, mirrors and local reflection probes passed");
  // Clean outlines preserve emissive surface properties.
  const outline = await page.evaluate(() => {
    FourDStudio.change("cleanSelection", true);
    Engine4D.render();
    return {
      count: FourDStudio.outlines.children.length,
      untinted: [...Engine4D.materials].every(
        (m) =>
          !m.emissive ||
          m.emissive.getHex() === m.userData.originalEmissive ||
          m.userData.originalEmissive === undefined,
      ),
    };
  });
  assert.ok(outline.count > 0 && outline.untinted, JSON.stringify(outline));
  await page.evaluate(() => FourDStudio.open("checks"));
  assert.ok((await page.locator(".fourd-findings button").count()) > 0);
  await page.getByText("Show clearance overlays", { exact: true }).click();
  await page.waitForFunction(
    () => FourDStudio.clearanceGroup?.children.length > 0,
  );
  // Stage visibility can be assigned and is temporary; playback stops on mode exit.
  await page.evaluate(() => {
    FourDStudio.clearances = false;
    FourDStudio.open("stages");
  });
  await page
    .getByRole("combobox", { name: "Assign construction stage", exact: true })
    .selectOption("2");
  await page
    .getByRole("button", { name: "Assign selection", exact: true })
    .click();
  const phases = await page.evaluate(() => {
    FourDStudio.setPhase(0);
    Engine4D.render();
    const pair = Engine4D.pairs.find(
        ([s]) =>
          s.userData.elementId === "four-room" &&
          s.parent === Engine3D.buildingGroup,
      ),
      hidden = pair && !pair[1].visible;
    FourDStudio.finishStages();
    Engine4D.render();
    return {
      hidden,
      restored: pair && pair[1].visible,
      assigned: FourDStudio.settings.assignments["four-room"],
    };
  });
  assert.ok(phases.hidden && phases.restored, JSON.stringify(phases));
  assert.equal(phases.assigned, 2);
  // A controlled dense furniture mesh exercises distant/near LOD and source preservation.
  const lod = await page.evaluate(() => {
    const pair = Engine4D.pairs.find(
        ([s]) =>
          s.userData.elementId === "four-bed" &&
          s.parent === Engine3D.buildingGroup,
      ),
      root = pair[1],
      child = new THREE.Mesh(
        new THREE.SphereGeometry(10, 32, 16),
        new THREE.MeshStandardMaterial(),
      );
    root.add(child);
    FourDStudio.lodVersion = null;
    FourDStudio.setupLOD();
    const item = FourDStudio.lods.find((l) => l.copy === root);
    if (!item) return { error: "no LOD candidate" };
    const camera = Engine4D.camera.clone();
    camera.position.copy(item.center).add(new THREE.Vector3(0, 0, 50000));
    FourDStudio.restoreFilters();
    FourDStudio.applyLOD(camera);
    const far = item.proxy.visible && !root.visible;
    camera.position.copy(item.center).add(new THREE.Vector3(0, 0, 100));
    FourDStudio.restoreFilters();
    FourDStudio.applyLOD(camera);
    const near = !item.proxy.visible && root.visible;
    root.remove(child);
    child.geometry.dispose();
    child.material.dispose();
    FourDStudio.lodVersion = null;
    return { far, near, source: pair[0].children.indexOf(child) === -1 };
  });
  assert.ok(lod.far && lod.near && lod.source, JSON.stringify(lod));
  console.log(
    "4D selection, clearance checks, construction stages and distance LOD passed",
  );
  await page.evaluate(() => FourDStudio.open("camera"));
  await page
    .getByRole("combobox", { name: "4D camera lens", exact: true })
    .selectOption("50");
  await page.getByText("Keep vertical lines straight", { exact: true }).click();
  const camera = await page.evaluate(() => {
    const editor = Engine3D.camera.fov;
    Engine4D.render();
    const forward = new THREE.Vector3();
    Engine4D.camera.getWorldDirection(forward);
    return {
      focal: Engine4D.camera.getFocalLength(),
      editorSame: editor === Engine3D.camera.fov,
      level: Math.abs(forward.y) < 0.0001,
    };
  });
  assert.ok(
    Math.abs(camera.focal - 50) < 0.01 && camera.editorSame && camera.level,
    JSON.stringify(camera),
  );
  await page
    .getByRole("combobox", { name: "4D refinement samples", exact: true })
    .selectOption("4");
  await page
    .getByText("Depth of field in refined photos", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Refine current view", exact: true })
    .click();
  await page.waitForFunction(
    () => FourDRender.sample === 4 && !FourDRender.active,
    {},
    { timeout: 90000 },
  );
  const photo = await page.evaluate(() => ({
    valid: FourDRender.presentPhoto(),
    targets: FourDRender.targets.length,
    depth: FourDRender.bokeh.renderTargetDepth.width,
    ready: Engine4D.ready,
    error: Engine4D.lastError,
  }));
  assert.ok(
    photo.valid && photo.targets === 2 && photo.depth > 1 && photo.ready,
    JSON.stringify(photo),
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Capture PNG", exact: true }).click();
  assert.match((await download).suggestedFilename(), /4D_Render\.png/);
  await page.evaluate(() => {
    Engine3D.controls.target.x += 2;
    Engine3D.controls.update();
  });
  assert.equal(await page.evaluate(() => FourDRender.sample), 0);
  await page.screenshot({ path: "/tmp/archcad-4d-studio-desktop.png" });
  console.log(
    "4D camera correction, depth of field, raster refinement, PNG capture and cancellation passed",
  );
  // Saved alternatives compile directly without applying/swapping the editable project.
  await page.evaluate(() => {
    const snapshot = WorkbenchModel.optionSnapshot(ProjectState.capture());
    snapshot.elements[0].w = 300;
    ProjectState.commit("Test saved alternative", () =>
      WorkbenchModel.data(ProjectState.capture()),
    );
    ProjectState.meta.design.workbench.options = [
      { id: "four-option", name: "Wider bedroom", project: snapshot },
    ];
    FourDStudio.open("compare");
  });
  const before = await page.evaluate(() =>
    JSON.stringify(ProjectState.capture()),
  );
  await page
    .getByRole("button", { name: "Start comparison", exact: true })
    .click();
  await page.waitForFunction(() => !!FourDStudio.comparison);
  const compare = await page.evaluate(() => {
    const p = ProjectState.capture();
    Engine4D.render();
    return {
      width: FourDStudio.comparison.project.elements[0].w,
      current: p.elements[0].w,
      issues: FourDStudio.comparison.issues.length,
      children: FourDStudio.comparison.model.children.length,
      scissor: Engine4D.renderer.getScissorTest(),
      ready: Engine4D.ready,
      error: Engine4D.lastError,
      project: JSON.stringify(p),
    };
  });
  assert.equal(compare.width, 300);
  assert.equal(compare.current, 240);
  assert.equal(compare.project, before);
  assert.equal(compare.issues, 0);
  assert.ok(
    compare.children > 0 && compare.ready && !compare.scissor,
    JSON.stringify(compare),
  );
  assert.equal(await page.locator("#fourd-comparison-labels span").count(), 2);
  assert.equal(
    await page.evaluate(() => {
      const camera = FourDStudio.comparisonCamera,
        box = Engine4D.renderer.domElement.getBoundingClientRect();
      const center = Engine4D.modelBounds
        .getCenter(new THREE.Vector3())
        .project(camera);
      const event = {
        clientX: box.left + ((center.x + 1) * box.width) / 4,
        clientY: box.top + ((1 - center.y) * box.height) / 2,
      };
      return (
        !!StudioEnhancements.hit(event) &&
        StudioEnhancements.hit({
          clientX: box.right - 5,
          clientY: event.clientY,
        }) === null
      );
    }),
    true,
    "Comparison picking must use the half-view camera; right side stays read-only",
  );
  await page
    .getByRole("button", { name: "Close comparison", exact: true })
    .click();
  assert.equal(await page.evaluate(() => FourDStudio.comparison), null);
  console.log(
    "4D synchronized alternative rendering and project isolation passed",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => FourDStudio.open("render"));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page
    .locator(".workspace-docked-dialog")
    .evaluate((n) =>
      Promise.all(
        n
          .getAnimations({ subtree: true })
          .map((a) => a.finished.catch(() => {})),
      ),
    );
  await page.screenshot({ path: "/tmp/archcad-4d-studio-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => {
    FourDStudio.open("stages");
    FourDStudio.playStages();
    setWorkspaceLayout("3d");
  });
  assert.equal(
    await page.evaluate(() => FourDStudio.playing || FourDRender.active),
    false,
  );
  await page.evaluate((p) => {
    WorkspacePanels.close();
    FourDStudio.leave();
    setWorkspaceLayout("2d");
    ProjectState.apply(p, { rebase: true });
    Engine4D.releaseRenderer();
  }, original);
};
