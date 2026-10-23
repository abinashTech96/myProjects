/* Shared wall geometry and one model-to-SVG/3D coordinate convention. */
const WallEngine = {
  getWalls() {
    return ProjectModel.walls(ProjectState.capture());
  },
  clearDimensions(el) {
    const index = elements.indexOf(el),
      walls = this.getWalls().filter((w) =>
        w.owners.some((o) => o.index === index),
      );
    const thickness = (edge) =>
      Math.max(
        0,
        ...walls
          .filter((w) =>
            w.owners.some((o) => o.index === index && o.edge === edge),
          )
          .map((w) => w.thickness / 2),
      );
    return {
      w: Math.max(0, el.w - thickness("left") - thickness("right")),
      h: Math.max(0, el.h - thickness("top") - thickness("bottom")),
    };
  },
  render2D() {
    const { I, SCALE } = Utils.getMetrics(),
      floor = currentFloor;
    let layer = document.getElementById("shared-wall-layer");
    if (!layer) {
      layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
      layer.id = "shared-wall-layer";
      UI.elementContainer.appendChild(layer);
    }
    layer.innerHTML = "";
    this.getWalls()
      .filter((w) => w.floor === floor)
      .forEach((w) => {
        const boundaries = [
          0,
          w.end - w.start,
          ...w.openings.flatMap((o) => [o.start, o.end]),
        ].sort((a, b) => a - b);
        for (let i = 0; i < boundaries.length - 1; i++) {
          const a = boundaries[i],
            b = boundaries[i + 1];
          if (
            b - a < 0.001 ||
            w.openings.some((o) => (a + b) / 2 > o.start && (a + b) / 2 < o.end)
          )
            continue;
          const line = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line",
          );
          line.setAttribute(
            "x1",
            I.x + (w.horizontal ? w.start + a : w.fixed) * SCALE,
          );
          line.setAttribute(
            "y1",
            I.y + (w.horizontal ? w.fixed : w.start + a) * SCALE,
          );
          line.setAttribute(
            "x2",
            I.x + (w.horizontal ? w.start + b : w.fixed) * SCALE,
          );
          line.setAttribute(
            "y2",
            I.y + (w.horizontal ? w.fixed : w.start + b) * SCALE,
          );
          line.setAttribute("stroke", w.shared ? "#94a3b8" : "#cbd5e1");
          line.setAttribute("stroke-width", w.thickness * SCALE);
          line.style.pointerEvents = "none";
          layer.appendChild(line);
        }
      });
    // Render resize handles only for the active, unlocked element.
    const el = elements[selectedElIndex];
    if (!el || el.locked) return;
    for (const corner of ["nw", "ne", "se", "sw"]) {
      const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect",
        ),
        x = el.x + (corner.includes("e") ? el.w : 0),
        y = el.y + (corner.includes("s") ? el.h : 0),
        size = 9 / (window.CanvasState?.zoomLvl || 1);
      rect.setAttribute("x", I.x + x * SCALE - size / 2);
      rect.setAttribute("y", I.y + y * SCALE - size / 2);
      rect.setAttribute("width", size);
      rect.setAttribute("height", size);
      rect.setAttribute("fill", "#38bdf8");
      rect.setAttribute("stroke", "#0f172a");
      rect.style.cursor = `${corner}-resize`;
      rect.addEventListener("pointerdown", (e) =>
        StudioUI.startResize(e, corner),
      );
      layer.appendChild(rect);
    }
  },
  build3D(SCALE, I, WALL_HEIGHT) {
    const height = ProjectState.meta.wallSettings.height;
    this.getWalls().forEach((w) => {
      const group = new THREE.Group(),
        primary = w.owners[0].index,
        el = elements[primary];
      group.userData = {
        isWall: true,
        roomIndex: primary,
        roomIndices: w.owners.map((o) => o.index),
        wallId: w.id,
        floor: w.floor,
      };
      const color = el.customColor
        ? parseInt(el.customColor.slice(1), 16)
        : 0xb8c4d4;
      const material = getCachedSolidMaterial(color, 1),
        length = w.end - w.start;
      const splits = [
        ...new Set([0, length, ...w.openings.flatMap((o) => [o.start, o.end])]),
      ].sort((a, b) => a - b);
      const add = (a, b, bottom, top) => {
        if (b - a < 0.001 || top - bottom < 0.001) return;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            (w.horizontal ? b - a : w.thickness) * SCALE,
            (top - bottom) * SCALE,
            (w.horizontal ? w.thickness : b - a) * SCALE,
          ),
          material,
        );
        mesh.position.set(
          I.x + (w.horizontal ? w.start + (a + b) / 2 : w.fixed) * SCALE,
          w.floor * WALL_HEIGHT + ((bottom + top) / 2) * SCALE,
          I.z + (w.horizontal ? w.fixed : w.start + (a + b) / 2) * SCALE,
        );
        mesh.castShadow = !window.isPerformanceMode;
        mesh.receiveShadow = !window.isPerformanceMode;
        mesh.userData = { ...group.userData, isRoom: true };
        group.add(mesh);
      };
      for (let i = 0; i < splits.length - 1; i++) {
        const a = splits[i],
          b = splits[i + 1],
          open = w.openings
            .filter((o) => (a + b) / 2 > o.start && (a + b) / 2 < o.end)
            .map((o) => [o.sill, Math.min(height, o.sill + o.height)])
            .sort((x, y) => x[0] - y[0]);
        let bottom = 0;
        for (const [low, high] of open) {
          add(a, b, bottom, low);
          bottom = Math.max(bottom, high);
        }
        add(a, b, bottom, height);
      }
      Engine3D.buildingGroup.add(group);
    });
  },
};
// Keep room objects separate so selection, materials, and drag updates retain identity.
build3DRooms = function (SCALE, I, WALL_HEIGHT, useReal3D) {
  Engine3D.elementObjects = new Map();
  elements.forEach((el, index) => {
    const center = getRoomCenter(el, SCALE, I);
    let group;
    if (el.isFurniture) {
      group = createFurniture3D(
        el.type,
        center.width,
        center.depth,
        el.customColor ? parseInt(el.customColor.slice(1), 16) : null,
      );
      const turned = el.rot % 180 === 90;
      group.position.set(
        center.x + (turned ? ((el.h - el.w) * SCALE) / 2 : 0),
        el.floor * WALL_HEIGHT,
        center.z + (turned ? ((el.w - el.h) * SCALE) / 2 : 0),
      );
      group.scale.y = SCALE;
      group.rotation.y = (-(el.rot || 0) * Math.PI) / 180;
    } else if (el.type === "staircase")
      group = buildStaircase(el, center, WALL_HEIGHT, false);
    else if (el.type === "balcony")
      group = buildBalcony(el, center, WALL_HEIGHT, useReal3D, false, SCALE);
    else {
      group = new THREE.Group();
      let texture;
      const textured = StudioUI.mode === "4d" || useReal3D || (el.material && el.material !== "auto");
      if (textured) {
        texture = getProceduralTexture(getTextureForRoom(el)).clone();
        texture.repeat.set(center.width / 60, center.depth / 60);
        texture.needsUpdate = true;
      }
      const material = textured
        ? new THREE.MeshStandardMaterial({
            map: texture,
            color: el.customColor || "#f1f5f9",
            roughness: ({wood:0.55,"kitchen-tile":0.25,"bathroom-tile":0.3,grass:1,concrete:0.95,shingle:0.9})[getTextureForRoom(el)] || 0.8,
          })
        : getCachedSolidMaterial(
            el.customColor
              ? parseInt(el.customColor.slice(1), 16)
              : ARCH_CONFIG.COLORS[el.type]?.hex || 0x64748b,
            0.7,
          );
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(center.width, 2 * SCALE, center.depth),
        material,
      );
      floor.position.y = 1 * SCALE;
      floor.receiveShadow = true;
      group.add(floor);
      const turned = el.rot % 180 === 90;
      group.position.set(
        center.x + (turned ? ((el.h - el.w) * SCALE) / 2 : 0),
        el.floor * WALL_HEIGHT,
        center.z + (turned ? ((el.w - el.h) * SCALE) / 2 : 0),
      );
      group.scale.y = SCALE;
    }
    group.userData = {
      roomIndex: index,
      isRoom: true,
      elementId: el.id,
      floor: el.floor,
    };
    group.traverse((child) => {
      if (child.isMesh) child.userData = { ...group.userData };
      if (child.isMesh) {
        child.castShadow = !window.isPerformanceMode;
        child.receiveShadow = !window.isPerformanceMode;
      }
    });
    Engine3D.elementObjects.set(el.id, group);
    Engine3D.buildingGroup.add(group);
  });
  WallEngine.build3D(SCALE, I, WALL_HEIGHT);
};
const originalFurniture3D = createFurniture3D;
createFurniture3D = function (type, w, d, color = null) {
  if (!["washing_machine", "gym_bike"].includes(type))
    return originalFurniture3D(type, w, d, color);
  const group = new THREE.Group(),
    mat = getCachedSolidMaterial(color ?? 0xcbd5e1, 1);
  if (type === "washing_machine") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 36, d), mat);
    body.position.y = 18;
    group.add(body);
    const door = new THREE.Mesh(
      new THREE.CylinderGeometry(w * 0.32, w * 0.32, 2, 20),
      getCachedSolidMaterial(0x334155, 1),
    );
    door.rotation.x = Math.PI / 2;
    door.position.set(0, 19, d / 2);
    group.add(door);
  } else {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.75, 4, d * 0.35),
      mat,
    );
    body.position.y = 8;
    group.add(body);
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 12, 4, 20),
      mat,
    );
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(-w * 0.25, 16, 0);
    group.add(wheel);
    const post = new THREE.Mesh(new THREE.BoxGeometry(3, 30, 3), mat);
    post.position.set(w * 0.2, 20, 0);
    group.add(post);
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(12, 3, 10),
      getCachedSolidMaterial(0x334155, 1),
    );
    seat.position.set(w * 0.2, 36, 0);
    group.add(seat);
  }
  return group;
};
update3DTransforms = function () {
  if (typeof request3DUpdate === "function") request3DUpdate();
};
window.updateRoomMaterial3D = () => request3DUpdate();
// Adopt the same asset dimensions for every placement path.
const stairAsset = ASSET_CATALOGS.rooms.items.find(
  (item) => item.type === "staircase",
);
if (stairAsset)
  Object.assign(stairAsset, {
    w: ARCH_CONFIG.DEFAULTS.STAIRCASE.w,
    h: ARCH_CONFIG.DEFAULTS.STAIRCASE.h,
  });
ASSET_CATALOGS.furniture.items.forEach((item) => {
  const dimensions = ARCH_CONFIG.DEFAULTS.FURNITURE[item.type];
  if (dimensions) {
    item.w = dimensions.w;
    item.h = dimensions.h;
  } else {
    ARCH_CONFIG.DEFAULTS.FURNITURE[item.type] = { w: item.w, h: item.h };
  }
});
for (const item of ASSET_CATALOGS.furniture.items)
  if (!FURNITURE_CATALOG.some((f) => f.id === item.type))
    FURNITURE_CATALOG.push({
      id: item.type,
      label: item.label,
      icon: item.icon,
    });
WidgetEngine._getVastuDynamicZone = ProjectModel.zone;
AIAgent.calculateZoneCoordinates = function (zone, w, h) {
  const unit = document.getElementById("unitSelect").value;
  return ProjectModel.zonePosition(
    zone,
    w,
    h,
    toInches(document.getElementById("inW").value, unit),
    toInches(document.getElementById("inH").value, unit),
    globalCompassDir,
    AI_CONFIG.VASTU_PADDING_INCHES,
  );
};
// Opening meshes remain separate and carry their owning floor for selection/export.
build3DFixtures = function (SCALE, I, WALL_HEIGHT, useReal3D) {
  for (const fix of fixtures) {
    const el = elements[fix.roomId];
    if (!el) continue;
    const width = fix.size * SCALE,
      height = (fix.height ?? (fix.type === "door" ? 80 : 40)) * SCALE,
      sill = (fix.sill ?? (fix.type === "door" ? 0 : 40)) * SCALE,
      frame = 2 * SCALE,
      depth = ProjectState.meta.wallSettings.internal * SCALE;
    const group = new THREE.Group(),
      frameMat = getCachedSolidMaterial(0x334155, 1),
      panelMat =
        fix.type === "door"
          ? getCachedSolidMaterial(0x8b4513, 1)
          : getCachedSolidMaterial(0x98d8c8, 0.3);
    const add = (w, h, d, x, y, z, mat) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = !window.isPerformanceMode;
      mesh.receiveShadow = !window.isPerformanceMode;
      group.add(mesh);
    };
    add(frame, height, depth, -width / 2 + frame / 2, height / 2, 0, frameMat);
    add(frame, height, depth, width / 2 - frame / 2, height / 2, 0, frameMat);
    add(width, frame, depth, 0, height - frame / 2, 0, frameMat);
    if (fix.type === "window")
      add(width, frame, depth, 0, frame / 2, 0, frameMat);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.max(frame, width - frame * 2),
        height - frame * (fix.type === "door" ? 1 : 2),
        SCALE,
      ),
      panelMat,
    );
    panel.position.set(
      0,
      height / 2 - (fix.type === "door" ? frame / 2 : 0),
      0,
    );
    if (fix.type === "door" && useReal3D) {
      panel.position.x = -width / 2 + frame;
      panel.rotation.y = Math.PI / 3;
    }
    group.add(panel);
    const horizontal = ["top", "bottom"].includes(fix.edge);
    group.position.set(
      I.x +
        (el.x +
          (horizontal
            ? fix.offset + fix.size / 2
            : fix.edge === "right"
              ? el.w
              : 0)) *
          SCALE,
      el.floor * WALL_HEIGHT + sill,
      I.z +
        (el.y +
          (horizontal
            ? fix.edge === "bottom"
              ? el.h
              : 0
            : fix.offset + fix.size / 2)) *
          SCALE,
    );
    if (!horizontal) group.rotation.y = Math.PI / 2;
    group.userData = {
      floor: el.floor,
      roomIndex: fix.roomId,
      isOpening: true,
      openingId: fix.id,
    };
    group.traverse((child) => {
      if (child.isMesh) child.userData = { ...group.userData, isRoom: true };
    });
    Engine3D.buildingGroup.add(group);
  }
};

// Throttle rebuilds while dragging and skip rebuilds for selection-only changes.
const rebuildModel = generate3DModel;
generate3DModel = function () {
  if (!Engine3D.scene) return;
  // Sun strength changes light intensity only, so retain the existing meshes.
  const { sunlight, studio, ...presentationGeometry } = ProjectState.meta.design.presentation;
  const renderDesign = { ...ProjectState.meta.design, presentation: presentationGeometry };
  const signature = JSON.stringify({
    elements,
    fixtures,
    floors: document.getElementById("b-floors")?.value,
    scale: document.getElementById("scaleInput")?.value,
    unit: document.getElementById("unitSelect")?.value,
    plot: Object.keys(ProjectModel.PLOT_DEFAULTS).map(
      (k) => document.getElementById(k)?.value,
    ),
    planning: ProjectState.meta.planning,
    design: renderDesign,
    walls: ProjectState.meta.wallSettings,
    overrides: ProjectState.meta.wallOverrides,
    texture: CanvasControlsEngine.isReal3D() || StudioUI.mode === "4d",
    facade: ParapetModule.config,
    style: document.getElementById("parapetStyleSelect")?.value,
    performance: window.isPerformanceMode,
  });
  Engine3D.needsRender = true;
  if (Engine3D.modelSignature === signature) return;
  Engine3D.modelSignature = signature;
  rebuildModel();
};
let pendingModelUpdate;
window.request3DUpdate = function () {
  if (!Engine3D.scene) return;
  Engine3D.modelDirty = true;
  if (!window.is3DMode || document.hidden) return;
  if (pendingModelUpdate) return;
  pendingModelUpdate = setTimeout(() => {
    pendingModelUpdate = null;
    if (window.is3DMode && !document.hidden) {
      generate3DModel();
      Engine3D.modelDirty = false;
    }
  }, 60);
};
