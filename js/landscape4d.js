/* Presentation-only garden. Coordinates, clipping and planting clearance are in
 * inches; GPU resources belong exclusively to Engine4D, never the editable scene. */
(function (root) {
  "use strict";
  const rect = (x, y, w, h) => [
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
      [x, y],
    ],
  ];
  const ring = (ps) => [ps.map((p) => [p.x, p.y]).concat([[ps[0].x, ps[0].y]])];
  const random = () => {
    let seed = 4317;
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  };
  function plan(project) {
    const P = root.ProjectModel,
      M = root.PlanningModel,
      D = root.DesignModel,
      clip =
        root.polygonClipping ||
        (typeof require === "function"
          ? require("../vendor/geometry/polygon-clipping.js")
          : null);
    const p = P.normalize(project),
      n = (id) => P.inches(p.plot[id], p.unit),
      w = n("inW"),
      h = n("inH");
    const workbench = root.WorkbenchModel.data(p);
    const boundary = workbench.site.boundary.length
      ? workbench.site.boundary
      : [
          { x: -n("aL"), y: -n("aU") },
          { x: w + n("bR"), y: -n("bU") },
          { x: w + n("cR"), y: h + n("cD") },
          { x: -n("dL"), y: h + n("dD") },
        ];
    const exclusions = [rect(-6, -6, w + 12, h + 12)];
    // Keep the buildable rectangle, actual outlying rooms, drawn walls and site
    // elements clear. The lawn cannot cover a patio, stair or parking object.
    for (const e of p.elements.filter((e) => e.floor === 0)) {
      const ps = M.points(e);
      if (ps.every((q) => q.x >= 8 && q.y >= 8 && q.x <= w - 8 && q.y <= h - 8))
        continue;
      for (const expanded of D.offsetPath(ps, 8, true))
        exclusions.push(ring(expanded));
    }
    for (const wall of p.planning?.walls || [])
      if (wall.floor === 0) {
        for (const expanded of D.offsetPath(
          [wall.a, wall.b],
          (wall.thickness || 9) / 2 + 6,
          false,
        ))
          exclusions.push(ring(expanded));
      }
    for (const object of workbench.outdoors) {
      if (object.kind !== "garden")
        for (const expanded of D.offsetPath(object.points, 6, true))
          exclusions.push(ring(expanded));
    }
    // Reserve a 48-inch approach corridor at the road-facing centre.
    const minX = Math.min(...boundary.map((p) => p.x)),
      maxX = Math.max(...boundary.map((p) => p.x)),
      minY = Math.min(...boundary.map((p) => p.y)),
      maxY = Math.max(...boundary.map((p) => p.y));
    // Match the existing drawing convention: West is AB (top), North BC,
    // East CD and South DA. These values are not screen-axis compass labels.
    const side = { west: "north", north: "east", east: "south", south: "west" }[
      p.plot.roadSide
    ];
    const approach =
      side === "west"
        ? rect(minX - 1, h / 2 - 24, -minX + 2, 48)
        : side === "north"
          ? rect(w / 2 - 24, minY - 1, 48, -minY + 2)
          : side === "south"
            ? rect(w / 2 - 24, h - 1, 48, maxY - h + 2)
            : rect(w - 1, h / 2 - 24, maxX - w + 2, 48);
    if (side) exclusions.push(approach);
    // Door approaches also work for off-centre and polygonal room entrances.
    for (const fixture of p.fixtures.filter(
      (f) => f.type === "door" && p.elements[f.roomId]?.floor === 0,
    )) {
      const opening = M.openingSegment(p, fixture);
      if (!opening) continue;
      const mid = {
        x: (opening.a.x + opening.b.x) / 2,
        y: (opening.a.y + opening.b.y) / 2,
      };
      const room = p.elements[fixture.roomId],
        centre = { x: room.x + room.w / 2, y: room.y + room.h / 2 };
      const dx = opening.b.x - opening.a.x,
        dy = opening.b.y - opening.a.y,
        length = Math.hypot(dx, dy);
      if (!length) continue;
      let normal = { x: -dy / length, y: dx / length };
      if (normal.x * (mid.x - centre.x) + normal.y * (mid.y - centre.y) < 0)
        normal = { x: -normal.x, y: -normal.y };
      const probe = { x: mid.x + normal.x * 12, y: mid.y + normal.y * 12 };
      if (
        p.elements.some(
          (e, i) =>
            i !== fixture.roomId &&
            e.floor === 0 &&
            !e.isFurniture &&
            M.inside(probe, M.points(e)),
        )
      )
        continue;
      const reach = Math.hypot(maxX - minX, maxY - minY);
      for (const expanded of D.offsetPath(
        [mid, { x: mid.x + normal.x * reach, y: mid.y + normal.y * reach }],
        24,
        false,
      ))
        exclusions.push(ring(expanded));
    }
    const lawn = clip.difference(ring(boundary), ...exclusions);
    const pointIn = (point, poly) =>
      M.inside(
        point,
        poly.map(([x, y]) => ({ x, y })),
      );
    const contains = (x, y, radius = 0) => {
      for (let i = 0; i < (radius ? 13 : 1); i++) {
        const angle = ((i - 1) / 12) * Math.PI * 2,
          q = i
            ? {
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius,
              }
            : { x, y };
        if (
          !lawn.some(
            (poly) =>
              pointIn(q, poly[0]) &&
              !poly.slice(1).some((hole) => pointIn(q, hole)),
          )
        )
          return false;
      }
      return true;
    };
    const plants = [],
      rand = random();
    // Bounded sampling and separated crowns keep small residential plots open.
    for (const [kind, radius, limit] of [
      ["tree", 20, 5],
      ["shrub", 7, 16],
    ]) {
      let added = 0;
      for (let i = 0; i < 800 && added < limit; i++) {
        const x = minX + rand() * (maxX - minX),
          y = minY + rand() * (maxY - minY);
        if (
          !contains(x, y, radius + 3) ||
          plants.some(
            (p) => Math.hypot(p.x - x, p.y - y) < p.radius + radius + 12,
          )
        )
          continue;
        plants.push({
          kind,
          x,
          y,
          radius,
          height: kind === "tree" ? 95 + rand() * 25 : 12 + rand() * 8,
        });
        added++;
      }
    }
    return { boundary, lawn, plants, contains, approach };
  }
  function dispose(engine) {
    if (!engine.landscape) return;
    engine.scene.remove(engine.landscape);
    const geometries = new Set(),
      materials = new Set(),
      maps = new Set();
    engine.landscape.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      for (const m of o.material
        ? Array.isArray(o.material)
          ? o.material
          : [o.material]
        : []) {
        materials.add(m);
        for (const name of ["map", "bumpMap"]) if (m[name]) maps.add(m[name]);
      }
      if (o.isInstancedMesh) o.dispose?.();
    });
    for (const resource of [...geometries, ...materials, ...maps])
      resource.dispose();
    engine.landscape = null;
    engine.landscapePlan = null;
  }
  function leafTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d"),
      rand = random();
    for (let i = 0; i < 35; i++) {
      const x = 8 + rand() * 112,
        y = 8 + rand() * 112,
        angle = rand() * Math.PI;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = ["#8c9e68", "#687e4e", "#a0ac79", "#758c55"][i % 4];
      ctx.beginPath();
      ctx.moveTo(-3, -7);
      ctx.quadraticCurveTo(7, -4, 3, 7);
      ctx.quadraticCurveTo(-7, 3, -3, -7);
      ctx.fill();
      ctx.restore();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }
  function build(engine) {
    dispose(engine);
    if (engine.landscapeEnabled === false) return;
    const THREE = root.THREE,
      p = ProjectState.capture(),
      data = plan(p),
      { SCALE, I } = get3DEnvironmentParams();
    const group = new THREE.Group();
    group.name = "4D exterior garden";
    group.userData.presentationLandscape = true;
    engine.landscape = group;
    engine.landscapePlan = data;
    engine.scene.add(group);
    const texture = engine.finish("grass").map.clone();
    texture.repeat.set(1, 1);
    texture.needsUpdate = true;
    const groundMat = new THREE.MeshStandardMaterial({
      map: texture,
      bumpMap: texture,
      bumpScale: 0.3 * SCALE,
      roughness: 1,
      color: 0xa0a78a,
      side: THREE.DoubleSide,
    });
    const height = (x, y) =>
      p.design?.workbench?.terrain?.points?.length
        ? WorkbenchModel.terrainHeight(p, { x, y })
        : 0;
    for (const polygon of data.lawn) {
      const path = (points, hole = false) => {
        const shape = hole ? new THREE.Path() : new THREE.Shape();
        points.forEach(([x, y], i) =>
          i
            ? shape.lineTo(x * SCALE + I.x, y * SCALE + I.z)
            : shape.moveTo(x * SCALE + I.x, y * SCALE + I.z),
        );
        return shape;
      };
      const shape = path(polygon[0]);
      shape.holes = polygon.slice(1).map((p) => path(p, true));
      const geometry = new THREE.ShapeGeometry(shape),
        positions = geometry.attributes.position,
        uv = geometry.attributes.uv;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i),
          z = positions.getY(i);
        positions.setXYZ(
          i,
          x,
          height((x - I.x) / SCALE, (z - I.z) / SCALE) * SCALE + 0.15 * SCALE,
          z,
        );
        uv.setXY(i, x / (48 * SCALE), z / (48 * SCALE));
      }
      const index = geometry.index;
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i);
        index.setX(i, index.getX(i + 2));
        index.setX(i + 2, a);
      }
      geometry.computeVertexNormals();
      const lawn = new THREE.Mesh(geometry, groundMat);
      lawn.receiveShadow = true;
      group.add(lawn);
    }
    if (!data.lawn.length) {
      groundMat.dispose();
      texture.dispose();
      return;
    }
    const rand = random(),
      dummy = new THREE.Object3D(),
      trunks = [],
      leaves = [];
    for (const plant of data.plants) {
      const x = plant.x * SCALE + I.x,
        z = plant.y * SCALE + I.z,
        base = height(plant.x, plant.y) * SCALE,
        r = plant.radius * SCALE,
        h = plant.height * SCALE;
      if (plant.kind === "tree") {
        trunks.push({
          x,
          y: base + h * 0.35,
          z,
          sx: 1.4 * SCALE,
          sy: h * 0.7,
          sz: 1.4 * SCALE,
        });
        for (let i = 0; i < 4; i++)
          trunks.push({
            x: x + Math.cos(i * 1.57) * r * 0.25,
            y: base + h * 0.65,
            z: z + Math.sin(i * 1.57) * r * 0.25,
            sx: 0.65 * SCALE,
            sy: h * 0.27,
            sz: 0.65 * SCALE,
            rx: (rand() - 0.5) * 0.8,
            rz: (rand() - 0.5) * 0.8,
          });
      }
      const count = plant.kind === "tree" ? 220 : 60;
      for (let i = 0; i < count; i++) {
        const angle = rand() * Math.PI * 2,
          rad = Math.sqrt(rand()) * r * 0.65,
          dy = rand() * 2 - 1;
        leaves.push({
          x: x + Math.cos(angle) * rad * Math.sqrt(1 - dy * dy),
          y:
            base +
            (plant.kind === "tree" ? h * 0.76 : h * 0.5) +
            dy * (plant.kind === "tree" ? h * 0.22 : h * 0.32),
          z: z + Math.sin(angle) * rad * Math.sqrt(1 - dy * dy),
          size: r * (0.24 + rand() * 0.12),
          rx: rand() * Math.PI,
          ry: rand() * Math.PI,
          rz: rand() * Math.PI,
        });
      }
    }
    if (trunks.length) {
      const mesh = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.65, 1, 1, 7),
        new THREE.MeshStandardMaterial({ color: 0x6a5944, roughness: 1 }),
        trunks.length,
      );
      trunks.forEach((t, i) => {
        dummy.position.set(t.x, t.y, t.z);
        dummy.rotation.set(t.rx || 0, 0, t.rz || 0);
        dummy.scale.set(t.sx, t.sy, t.sz);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.castShadow = true;
      group.add(mesh);
    }
    if (leaves.length) {
      const mesh = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.MeshStandardMaterial({
          map: leafTexture(THREE),
          roughness: 0.95,
          alphaTest: 0.22,
          side: THREE.DoubleSide,
          color: 0xffffff,
        }),
        leaves.length,
      );
      leaves.forEach((l, i) => {
        dummy.position.set(l.x, l.y, l.z);
        dummy.rotation.set(l.rx, l.ry, l.rz);
        dummy.scale.setScalar(l.size);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(
          i,
          new THREE.Color().setHSL(
            0.21 + rand() * 0.035,
            0.17 + rand() * 0.1,
            0.72 + rand() * 0.12,
          ),
        );
      });
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    }
    group.traverse((o) => {
      if (o.isInstancedMesh) o.frustumCulled = false;
    });
  }
  root.Landscape4D = { plan, build, dispose };
  if (typeof module === "object") module.exports = root.Landscape4D;
})(globalThis);
