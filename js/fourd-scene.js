/* Build an alternative directly from its project snapshot. The editor/history
 * are never swapped during comparison. Imported models reuse cached templates. */
window.FourDScene = {
  build(raw) {
    const p = ProjectModel.normalize(raw),
      source = new THREE.Group(),
      { SCALE: S, I } = get3DEnvironmentParams();
    const material = (e, channel, color) => {
      const saved = p.design.presentation.surfaces[e?.id]?.[channel],
        type = saved?.type || e?.material;
      const m = new THREE.MeshPhysicalMaterial({
        color: saved?.color || e?.customColor || color || "#b9c2c8",
        roughness: saved?.roughness ?? 0.8,
      });
      if (FourDModel.materials[type])
        FourDTextures.apply(
          m,
          type,
          { w: e.w, h: channel === "wall" ? p.wallSettings.height : e.h },
          saved?.scale || 1,
          saved?.rotation || 0,
          saved?.color,
        );
      return m;
    };
    const extrude = (polygons, base, height, mat, data = {}) => {
      const group = new THREE.Group();
      group.userData = data;
      group.position.set(I.x, base * S, I.z);
      for (const polygon of polygons) {
        const ring = (points) =>
          points.map((q) => new THREE.Vector2(q[0] * S, -q[1] * S));
        const shape = new THREE.Shape(ring(polygon[0]));
        shape.holes = polygon.slice(1).map((h) => new THREE.Path(ring(h)));
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: Math.max(0.1, height) * S,
          bevelEnabled: false,
          steps: 1,
        });
        geometry.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.userData = { ...data };
        group.add(mesh);
      }
      source.add(group);
      return group;
    };
    const polygon = (points) => [DesignModel.polygon(points)];
    let proxies = 0;
    for (const [eIndex, e] of p.elements.entries()) {
      const data = { elementId: e.id, roomIndex: eIndex, floor: e.floor },
        base = WorkbenchModel.roomBase(p, e);
      if (e.isFurniture) {
        let group;
        if (e.assetId && Workbench3D.templates.get(e.assetId)) {
          group = Workbench3D.templates.get(e.assetId).clone(true);
          const box = new THREE.Box3().setFromObject(group),
            size = box.getSize(new THREE.Vector3()),
            center = box.getCenter(new THREE.Vector3());
          const inner = new THREE.Group();
          group.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
          inner.add(group);
          inner.scale.set(
            (e.w * S) / Math.max(0.1, size.x),
            ((e.customHeight || 36) * S) / Math.max(0.1, size.y),
            (e.h * S) / Math.max(0.1, size.z),
          );
          group = inner;
          // Clone source template resources before the staging compiler owns them.
          group.traverse((n) => {
            if (n.geometry) n.geometry = n.geometry.clone();
            if (n.material)
              n.material = Array.isArray(n.material)
                ? n.material.map((m) => m.clone())
                : n.material.clone();
            for (const m of n.material
              ? Array.isArray(n.material)
                ? n.material
                : [n.material]
              : [])
              for (const key of [
                "map",
                "normalMap",
                "roughnessMap",
                "metalnessMap",
                "bumpMap",
                "emissiveMap",
                "alphaMap",
                "aoMap",
              ])
                if (m[key]) m[key] = m[key].clone();
          });
        } else if (e.assetId) {
          group = new THREE.Group();
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(e.w * S, (e.customHeight || 36) * S, e.h * S),
            material(e, "floor"),
          );
          mesh.position.y = ((e.customHeight || 36) * S) / 2;
          group.add(mesh);
          proxies++;
        } else {
          group = createFurniture3D(e.type, e.w * S, e.h * S);
          group.scale.y = S;
          group.traverse((n) => {
            if (n.geometry) n.geometry = n.geometry.clone();
            if (n.material)
              n.material = material(e, "floor", n.material.color?.getStyle());
          });
        }
        const b = PresentationModel.bounds(e);
        group.position.set(
          I.x + (e.x + b.w / 2) * S,
          base * S,
          I.z + (e.y + b.h / 2) * S,
        );
        group.rotation.y = (-(e.rot || 0) * Math.PI) / 180;
        group.userData = data;
        group.traverse((n) => {
          n.userData = { ...n.userData, ...data };
        });
        source.add(group);
      } else if (e.type === "staircase") {
        const stair = WorkbenchModel.orientedStairs(p, e);
        if (stair)
          for (const t of stair.treads)
            extrude(
              polygon(t.points),
              base,
              t.top,
              material(e, "floor", "#9aa8af"),
              data,
            );
        else {
          extrude(
            polygon(PlanningModel.points(e)),
            base,
            6,
            material(e, "floor"),
            data,
          );
          proxies++;
        }
      } else {
        const holes = [
          ...WorkbenchModel.data(p).voids,
          ...WorkbenchModel.data(p).shafts,
        ]
          .filter((v) => e.floor >= v.from && e.floor <= v.to)
          .map((v) => DesignModel.polygon(v.points || PlanningModel.points(v)));
        const geometry = holes.length
          ? polygonClipping.difference(
              DesignModel.polygon(PlanningModel.points(e)),
              ...holes,
            )
          : polygon(PlanningModel.points(e));
        extrude(geometry, base, 2, material(e, "floor", "#c9c7bd"), data);
      }
    }
    for (const w of ProjectModel.walls(p)) {
      const owner = w.owners.find((o) => o.index !== undefined),
        e = p.elements[owner?.index],
        base = w.base ?? WorkbenchModel.floorBase(p, w.floor),
        height = w.height ?? WorkbenchModel.floorHeight(p, w.floor);
      const length = w.length || w.end - w.start,
        a = w.a || {
          x: w.horizontal ? w.start : w.fixed,
          y: w.horizontal ? w.fixed : w.start,
        },
        b = w.b || {
          x: w.horizontal ? w.end : w.fixed,
          y: w.horizontal ? w.fixed : w.end,
        };
      const at = (t) => ({
        x: a.x + ((b.x - a.x) * t) / length,
        y: a.y + ((b.y - a.y) * t) / length,
      });
      const splits = [
        ...new Set([0, length, ...w.openings.flatMap((o) => [o.start, o.end])]),
      ].sort((a, b) => a - b);
      const mat = material(e, "wall", "#c4c6c5"),
        data = {
          isWall: true,
          roomIndex: owner?.index,
          elementId: e?.id,
          floor: w.floor,
        };
      for (let i = 1; i < splits.length; i++) {
        const lo = splits[i - 1],
          hi = splits[i],
          open = w.openings
            .filter((o) => (lo + hi) / 2 > o.start && (lo + hi) / 2 < o.end)
            .sort((a, b) => a.sill - b.sill);
        let bottom = 0;
        const add = (low, top) => {
          if (top > low)
            extrude(
              [
                DesignModel.wallStrip(
                  { a: at(lo), b: at(hi), thickness: w.thickness },
                  false,
                ),
              ],
              base + low,
              top - low,
              mat,
              data,
            );
        };
        for (const o of open) {
          add(bottom, o.sill);
          bottom = Math.max(bottom, o.sill + o.height);
        }
        add(bottom, height);
      }
    }
    for (const f of p.fixtures) {
      const e = p.elements[f.roomId],
        segment = PlanningModel.openingSegment(p, f),
        mid = {
          x: (segment.a.x + segment.b.x) / 2,
          y: (segment.a.y + segment.b.y) / 2,
        };
      const mat = new THREE.MeshPhysicalMaterial({
        color: f.type === "window" ? 0xdbecef : 0x8b6747,
        roughness: f.type === "window" ? 0.08 : 0.65,
        transparent: f.type === "window",
        opacity: f.type === "window" ? 0.3 : 1,
        depthWrite: f.type !== "window",
      });
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(f.size * S, (f.height || 80) * S, 2 * S),
        mat,
      );
      mesh.position.set(
        I.x + mid.x * S,
        (WorkbenchModel.roomBase(p, e) + (f.sill || 0) + (f.height || 80) / 2) *
          S,
        I.z + mid.y * S,
      );
      mesh.rotation.y = -Math.atan2(
        segment.b.y - segment.a.y,
        segment.b.x - segment.a.x,
      );
      mesh.userData = {
        isOpening: true,
        openingId: f.id,
        roomIndex: f.roomId,
        elementId: e.id,
        floor: e.floor,
      };
      source.add(mesh);
    }
    const w = WorkbenchModel.data(p);
    for (const member of w.structure)
      extrude(
        polygon(member.points || PlanningModel.points(member)),
        WorkbenchModel.floorBase(p, member.floor) + (member.base || 0),
        member.height,
        new THREE.MeshStandardMaterial({ color: 0x98a4af }),
        { floor: member.floor, objectId: member.id },
      );
    for (const item of w.outdoors)
      extrude(
        polygon(item.points),
        item.base || 0,
        item.height,
        new THREE.MeshStandardMaterial({
          color: item.kind === "garden" ? 0x617a4a : 0x99958d,
        }),
        { floor: 0, objectId: item.id },
      );
    for (const layout of w.interiors) {
      const room = p.elements.find((e) => e.id === layout.room);
      for (const item of layout.items)
        extrude(
          polygon(PlanningModel.points(item)),
          WorkbenchModel.roomBase(p, room) + (item.base || 0),
          item.height || 32,
          new THREE.MeshStandardMaterial({ color: 0xa7aca9 }),
          { floor: room.floor, objectId: item.id },
        );
    }
    for (const route of w.services3d)
      for (let i = 1; i < route.points.length; i++) {
        const to = (q) =>
            new THREE.Vector3(I.x + q.x * S, q.z * S, I.z + q.y * S),
          a = to(route.points[i - 1]),
          b = to(route.points[i]),
          direction = b.clone().sub(a);
        if (direction.length() < 0.001) continue;
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(
            (route.diameter * S) / 2,
            (route.diameter * S) / 2,
            direction.length(),
            8,
          ),
          new THREE.MeshStandardMaterial({ color: 0x68a6c2 }),
        );
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.normalize(),
        );
        mesh.userData = { floor: route.floor, objectId: route.id };
        source.add(mesh);
      }
    // Ramps/shafts retain their real footprint/elevation as labeled proxies.
    for (const row of WorkbenchModel.objects(p).filter((o) =>
      ["ramps", "shafts"].includes(o.kind),
    )) {
      const r = row.record;
      extrude(
        polygon(
          r.points ||
            PlanningModel.points({
              x: r.x,
              y: r.y,
              w: r.w || r.width || 36,
              h: r.h || r.length || 36,
            }),
        ),
        WorkbenchModel.floorBase(p, row.floor),
        r.height || r.rise || WorkbenchModel.floorHeight(p, row.floor),
        new THREE.MeshStandardMaterial({ color: 0x9ea6ab }),
        { floor: row.floor, objectId: r.id },
      );
      proxies++;
    }
    if (p.view.parapetConfig?.version === 2 || ParapetModel.designs.some(s => s.id === p.view.parapet))
      source.add(ParapetRenderer.build(p, p.view.parapetConfig || {}, {scale:S,origin:I,quality:FourDWorkspace.quality}));
    const compiler = {
      materials: new Set(),
      material(m) {
        const copy = m.clone();
        this.materials.add(copy);
        return copy;
      },
    };
    let stage;
    try {
      stage = Scene4D.stage(compiler, source, p);
    } finally {
      const geometries = new Set(),
        materials = new Set();
      source.traverse((n) => {
        if (n.geometry) geometries.add(n.geometry);
        for (const m of n.material
          ? Array.isArray(n.material)
            ? n.material
            : [n.material]
          : [])
          materials.add(m);
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => {
        for (const key of [
          "map",
          "normalMap",
          "roughnessMap",
          "metalnessMap",
          "bumpMap",
          "emissiveMap",
          "alphaMap",
          "aoMap",
        ])
          m[key]?.dispose();
        m.dispose();
      });
    }
    stage.project = p;
    stage.proxies = proxies;
    return stage;
  },
};
