/* Coordinated 3D construction, direct manipulation, clipping, measurements and captures. */
const Workbench3D = {
  target: null,
  enabled: false,
  measurePoints: null,
  labelsEnabled: false,
  templates: new Map(),
  generation: 0,
  proxy: null,
  controls: null,
  section: null,
  isolation: null,
  coordinates(q) {
    const { I, SCALE } = get3DEnvironmentParams();
    return new THREE.Vector3(I.x + q.x * SCALE, q.z * SCALE, I.z + q.y * SCALE);
  },
  modelPoint(v) {
    const { I, SCALE } = get3DEnvironmentParams();
    return { x: (v.x - I.x) / SCALE, y: (v.z - I.z) / SCALE, z: v.y / SCALE };
  },
  extrude(geometry, base, height, color = 0x64748b, data = {}) {
    const { SCALE, I } = get3DEnvironmentParams(),
      group = new THREE.Group();
    for (const poly of geometry) {
      const ring = (ps) =>
          ps.map(
            (q) =>
              new THREE.Vector2(
                (Array.isArray(q) ? q[0] : q.x) * SCALE,
                -(Array.isArray(q) ? q[1] : q.y) * SCALE,
              ),
          ),
        shape = new THREE.Shape(ring(poly[0]));
      for (const hole of poly.slice(1))
        shape.holes.push(new THREE.Path(ring(hole)));
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(0.05, height) * SCALE,
        bevelEnabled: false,
        steps: 1,
      });
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, getCachedSolidMaterial(color, 1));
      mesh.position.set(I.x, base * SCALE, I.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { ...data };
      group.add(mesh);
    }
    group.userData = { ...data };
    return group;
  },
  addMesh(parent, points, base, height, color, data = {}) {
    const geometry = [DesignModel.polygon(points)],
      g = this.extrude(geometry, base, height, color, data);
    parent.add(g);
    return g;
  },
  rebuild(options = {}) {
    for (const step of this.buildSteps(options)) {}
  },
  *buildSteps(options = {}) {
    const building = Engine3D.buildingGroup;
    if (!building) return;
    const p = ProjectState.capture(),
      w = WorkbenchModel.data(p),
      signature = Engine3D.modelSignature + "|" + JSON.stringify(w),
      existing = building.children.find((c) => c.userData.workbench);
    if (!options.partial && existing && this.signature === signature) {
      this.applyIsolation();
      return;
    }
    if (!options.partial) this.signature = signature;
    const generation = options.partial ? this.generation : ++this.generation;
    const wanted = o => !options.partial || options.ids?.has(o.id);
    if (existing && !options.partial) {
      building.remove(existing);
      this.disposeObject(existing);
    }
    const group = new THREE.Group();
    group.name = "Professional building objects";
    group.userData.workbench = true;
    building.add(group);
    if (!options.partial) this.group = group;
    const { SCALE, WALL_HEIGHT } = get3DEnvironmentParams(),
      W = WorkbenchModel;
    for (const child of options.partial ? [] : building.children) {
      const data = child.userData || {},
        e = p.elements.find((e) => e.id === data.elementId),
        f = p.fixtures.find((f) => f.id === data.openingId);
      if (e && !data.isWall && !data.workbench)
        child.position.y +=
          (W.roomBase(p, e) - e.floor * p.wallSettings.height) * SCALE;
      if (data.isRoof && !data.designObject)
        child.position.y +=
          (W.floorBase(p, p.floorCount - 1) +
            W.floorHeight(p, p.floorCount - 1) -
            p.floorCount * p.wallSettings.height) *
          SCALE;
      if (
        !e &&
        !data.designObject &&
        (!data.parapetCollection || data.legacyParapet) &&
        child.children?.some((c) => c.userData.isParapet)
      )
        child.position.y +=
          (W.floorBase(p, p.floorCount - 1) +
            W.floorHeight(p, p.floorCount - 1) -
            p.floorCount * p.wallSettings.height) *
          SCALE;
      if (f)
        child.position.y +=
          (W.roomBase(p, p.elements[f.roomId]) -
            p.elements[f.roomId].floor * p.wallSettings.height) *
          SCALE;
      if (data.designObject)
        for (const mesh of child.children) {
          if (mesh.userData.isRoof && !mesh.userData.datumResolved)
            mesh.position.y +=
              (W.floorBase(p, p.floorCount - 1) +
                W.floorHeight(p, p.floorCount - 1) -
                p.floorCount * p.wallSettings.height) *
              SCALE;
          if (mesh.userData.isCeiling)
            mesh.position.y +=
              (W.floorBase(p, mesh.userData.floor) -
                mesh.userData.floor * p.wallSettings.height) *
              SCALE;
        }
    }
    for (const e of p.elements.filter(
      (e) => !e.isFurniture && !["staircase", "balcony"].includes(e.type) && (!options.partial || options.rooms?.has(e.id)),
    )) {
      const holes = [
        ...w.voids
          .filter((v) => e.floor > v.from && e.floor <= v.to)
          .map((v) => DesignModel.polygon(v.points)),
        ...w.shafts
          .filter((v) => e.floor >= v.from && e.floor <= v.to)
          .map((v) => (v.points ? DesignModel.polygon(v.points) : W.box(v))),
      ];
      if (!holes.length) continue;
      const native = Engine3D.elementObjects.get(e.id);
      if (native?.children[0]) native.children[0].visible = false;
      const geometry = polygonClipping.difference(W.box(e), ...holes);
      const replacement = this.extrude(
        geometry,
        W.roomBase(p, e),
        2,
        0xcbd5e1,
        {
          floor: e.floor,
          elementId: e.id,
          roomIndex: p.elements.indexOf(e),
          isRoom: true,
        },
      );
      if (native?.children[0]?.material)
        for (const mesh of replacement.children) {
          mesh.material = native.children[0].material.clone();
          for (const [key, v] of Object.entries(mesh.material))
            if (v?.isTexture) mesh.material[key] = v.clone();
        }
      replacement.userData.fourdReplacement=true;
      group.add(replacement);
      yield;
    }
    for (const member of w.structure.filter(wanted)) {
      this.addMesh(
        group,
        member.points || PlanningModel.points(member),
        W.floorBase(p, member.floor) + (member.base || 0),
        member.height,
        0x94a3b8,
        { floor: member.floor, objectId: member.id, kind: "structure" },
      );
      yield;
    }
    for (const r of w.ramps.filter(wanted)) {
      const g = W.ramp(r),
        base = W.floorBase(p, r.floor);
      for (const flight of g.flights) {
        const ps = flight.points,
          low = base + flight.z0,
          high = base + flight.z1,
          vertices = ps.map((q, i) => ({
            x: q.x,
            y: q.y,
            z: i < 2 !== flight.reverse ? low : high,
          }));
        const geo = new THREE.BufferGeometry(),
          top = vertices.map((q) => this.coordinates(q)),
          bottom = vertices.map((q) => this.coordinates({ ...q, z: base })),
          pts = [...bottom, ...top],
          faces = [
            [4, 5, 6],
            [4, 6, 7],
            [0, 2, 1],
            [0, 3, 2],
            [0, 1, 5],
            [0, 5, 4],
            [1, 2, 6],
            [1, 6, 5],
            [2, 3, 7],
            [2, 7, 6],
            [3, 0, 4],
            [3, 4, 7],
          ];
        geo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            faces.flatMap((f) => f.flatMap((i) => pts[i].toArray())),
            3,
          ),
        );
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, getCachedSolidMaterial(0x8b5cf6, 1));
        mesh.userData = { floor: r.floor, objectId: r.id };
        group.add(mesh);
      }
      for (const landing of g.landings)
        this.addMesh(
          group,
          landing.points,
          base + Math.max(0, landing.top - 4),
          4,
          0x7c3aed,
          { floor: r.floor, objectId: r.id },
        );
    }
    for (const shaft of w.shafts.filter(wanted)) {
      const ps = shaft.points || PlanningModel.points(shaft),
        bottom = W.floorBase(p, shaft.from),
        upper =
          shaft.to < p.floorCount
            ? W.floorBase(p, shaft.to)
            : W.floorBase(p, p.floorCount - 1) +
              W.floorHeight(p, p.floorCount - 1),
        height = upper - bottom;
      for (let i = 0; i < ps.length; i++) {
        const a = ps[i],
          b = ps[(i + 1) % ps.length];
        if (i === 0 && shaft.kind === "lift") {
          const len = PlanningModel.distance(a, b),
            door = shaft.doorWidth || 36,
            gap = (len - door) / 2,
            at = (t) => ({
              x: a.x + ((b.x - a.x) * t) / len,
              y: a.y + ((b.y - a.y) * t) / len,
            });
          for (const [start, end] of [
            [0, gap],
            [gap + door, len],
          ])
            if (end > start)
              this.addMesh(
                group,
                DesignModel.wallStrip(
                  { a: at(start), b: at(end), thickness: 4.5 },
                  false,
                )[0].map(([x, y]) => ({ x, y })),
                bottom,
                height,
                0xa16207,
                { floor: shaft.from, objectId: shaft.id },
              );
          for (let f = shaft.from; f < Math.min(shaft.to, p.floorCount); f++) {
            const doorHeight = Math.min(80, W.floorHeight(p, f) - 12);
            this.addMesh(
              group,
              DesignModel.wallStrip(
                { a: at(gap), b: at(gap + door), thickness: 4.5 },
                false,
              )[0].map(([x, y]) => ({ x, y })),
              W.floorBase(p, f) + doorHeight,
              W.floorHeight(p, f) - doorHeight,
              0xa16207,
              { floor: f, objectId: shaft.id },
            );
          }
        } else
          this.addMesh(
            group,
            DesignModel.wallStrip({ a, b, thickness: 4.5 }, false)[0].map(
              ([x, y]) => ({ x, y }),
            ),
            bottom,
            height,
            0xa16207,
            { floor: shaft.from, objectId: shaft.id },
          );
      }
    }
    for (const l of w.interiors) {
      const room = p.elements.find((e) => e.id === l.room);
      for (const item of l.items.filter(wanted)) {
        const base = W.roomBase(p, room) + (item.base || 0),
          color =
            {
              toilet: 0xe2e8f0,
              basin: 0xe2e8f0,
              shower: 0x7dd3fc,
              hib: 0x334155,
              sink: 0x94a3b8,
              "wall-cabinet": 0x9a673d,
            }[item.type] || 0xb98a56;
        this.addMesh(
          group,
          PlanningModel.points(item),
          base,
          item.height,
          color,
          {
            floor: room.floor,
            objectId: item.id,
            kind: item.type,
            ownerRoom: room.id,
          },
        );
        if (["sink", "hob", "basin"].includes(item.type)) {
          const inset = Math.min(item.w, item.h) * 0.15;
          this.addMesh(
            group,
            WorkbenchModel.rect(
              item.x + inset,
              item.y + inset,
              item.w - inset * 2,
              item.h - inset * 2,
            ),
            base + item.height,
            0.5,
            item.type === "hob" ? 0x111827 : 0x334155,
            { floor: room.floor, objectId: item.id },
          );
        }
      }
    }
    for (const o of w.outdoors.filter(wanted))
      this.addMesh(
        group,
        o.points,
        o.base || 0,
        o.height,
        {
          garden: 0x4d7c0f,
          path: 0xa8a29e,
          tank: 0x0284c7,
          gate: 0x475569,
          rail: 0x64748b,
        }[o.kind] || 0x9ca3af,
        { floor: 0, objectId: o.id, kind: o.kind },
      );
    for (const route of w.services3d.filter(wanted)) {
      const points = route.points.map((q) => this.coordinates(q));
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i],
          length = a.distanceTo(b);
        if (length < 0.001) continue;
        const geometry = new THREE.CylinderGeometry(
            (route.diameter * SCALE) / 2,
            (route.diameter * SCALE) / 2,
            length,
            10,
          ),
          mesh = new THREE.Mesh(
            geometry,
            getCachedSolidMaterial(
              {
                plumbing: 0x0ea5e9,
                electrical: 0xf59e0b,
                ventilation: 0x94a3b8,
              }[route.kind],
              1,
            ),
          );
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          b.clone().sub(a).normalize(),
        );
        mesh.userData = {
          floor: route.floor,
          objectId: route.id,
          kind: "service3d",
        };
        group.add(mesh);
      }
    }
    if (w.terrain.points.length && (!options.partial || options.ids?.has("terrain"))) {
      const boundary = W.boundary(p),
        xmin = Math.min(...boundary.map((q) => q.x)),
        xmax = Math.max(...boundary.map((q) => q.x)),
        ymin = Math.min(...boundary.map((q) => q.y)),
        ymax = Math.max(...boundary.map((q) => q.y)),
        n = Math.floor(w.terrain.resolution),
        positions = [],
        at = (x, y) => ({
          x: xmin + ((xmax - xmin) * x) / n,
          y: ymin + ((ymax - ymin) * y) / n,
        });
      for (let x = 0; x < n; x++)
        for (let y = 0; y < n; y++) {
          const a = at(x, y),
            b = at(x + 1, y),
            c = at(x + 1, y + 1),
            d = at(x, y + 1),
            center = at(x + 0.5, y + 0.5);
          if (!PlanningModel.inside(center, boundary)) continue;
          for (const q of [a, c, b, a, d, c])
            positions.push(
              ...this.coordinates({
                ...q,
                z: W.terrainHeight(p, q) - 0.5,
              }).toArray(),
            );
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(
        geometry,
        getCachedSolidMaterial(0x4d7c0f, 1),
      );
      mesh.userData = { floor: 0, isTerrain: true };
      group.add(mesh);
    }
    if (w.solar.enabled && (!options.partial || options.ids?.has("solar"))) {
      for (const panel of W.solarLayout(p).panels) {
        const top = W.roofElevation(p, panel.points[0]) + 2,
          m = this.addMesh(
            group,
            panel.points,
            top,
            1.5,
            panel.shaded ? 0x7f1d1d : 0x1e3a8a,
            { floor: p.floorCount - 1, isSolar: true },
          ),
          geometry = m.children[0]?.geometry;
        if (geometry) {
          const attr = geometry.attributes.position,
            origin = panel.points[0],
            v = {
              x: panel.points[3].x - origin.x,
              y: panel.points[3].y - origin.y,
            },
            length = Math.hypot(v.x, v.y) || 1;
          for (let i = 0; i < attr.count; i++) {
            const q = { x: attr.getX(i) / SCALE, y: attr.getZ(i) / SCALE },
              along =
                ((q.x - origin.x) * v.x + (q.y - origin.y) * v.y) / length,
              delta =
                W.roofElevation(p, q) +
                2 -
                top +
                along * Math.tan((w.solar.tilt * Math.PI) / 180);
            attr.setY(i, attr.getY(i) + delta * SCALE);
          }
          attr.needsUpdate = true;
          geometry.computeVertexNormals();
        }
      }
    }
    if (w.rain.enabled && (!options.partial || options.ids?.has("rain"))) {
      const result = W.rainwater(p),
        ps = W.boundary(p),
        top =
          W.floorBase(p, p.floorCount - 1) + W.floorHeight(p, p.floorCount - 1),
        edge = ps.map((a, i) => ({ a, b: ps[(i + 1) % ps.length] }));
      for (const { a, b } of edge) {
        const mesh = this.addMesh(
          group,
          DesignModel.wallStrip({ a, b, thickness: 4 }, false)[0].map(
            ([x, y]) => ({ x, y }),
          ),
          top - 3,
          3,
          0x0284c7,
          { floor: p.floorCount - 1, isGutter: true },
        );
      }
      for (let i = 0; i < result.downpipes; i++) {
        const e = edge[i % edge.length],
          t =
            (Math.floor(i / edge.length) + 1) /
            (Math.ceil(result.downpipes / edge.length) + 1),
          q = {
            x: e.a.x + (e.b.x - e.a.x) * t,
            y: e.a.y + (e.b.y - e.a.y) * t,
          },
          geometry = new THREE.CylinderGeometry(
            2 * SCALE,
            2 * SCALE,
            Math.max(1, top) * SCALE,
            10,
          ),
          mesh = new THREE.Mesh(geometry, getCachedSolidMaterial(0x0284c7, 1));
        mesh.position.copy(this.coordinates({ ...q, z: top / 2 }));
        mesh.userData = { floor: 0, isDownpipe: true };
        group.add(mesh);
      }
    }
    for (const e of p.elements.filter((e) => e.assetId && !options.partial)) {
      const a = w.assets.find((a) => a.id === e.assetId);
      if (a) this.placeAsset(a, e, generation);
    }
    for (const child of group.children) {
      const record = W.findObject(p, child.userData.objectId)?.record;
      if (record?.hidden) child.visible = false;
    }
    if (!options.partial) {this.drawMeasurements();this.applyIsolation();this.applySection();}
    Engine3D.needsRender = true;
  },
  async placeAsset(asset, e, generation, parent = this.group, objectMap = Engine3D.elementObjects, invalidate = true) {
    try {
      let template = this.templates.get(asset.id);
      const wasCached=!!template;
      if (!template) {
        template = await WorkbenchFiles.assetScene(asset);
        this.templates.set(asset.id, template);
        while (this.templates.size > 8) {
          const [key, value] = this.templates.entries().next().value;
          this.templates.delete(key);
          this.disposeObject(value);
        }
      }
      if (generation !== this.generation) {
        if(window.FourDWorkspace?.running)FourDWorkspace.scheduleUpdate();
        else request3DUpdate();
        return;
      }
      const model = template.clone(true);
      model.traverse((c) => {
        if (c.geometry) c.geometry = c.geometry.clone();
        if (c.material)
          c.material = (
            Array.isArray(c.material) ? c.material : [c.material]
          ).map((m) => {
            const material = m.clone();
            for (const [key, v] of Object.entries(material))
              if (v?.isTexture) material[key] = v.clone();
            return material;
          });
        if (Array.isArray(c.material) && c.material.length === 1)
          c.material = c.material[0];
      });
      const box = new THREE.Box3().setFromObject(model),
        size = new THREE.Vector3(),
        center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      model.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
      const holder = new THREE.Group();
      holder.add(model);
      const { SCALE, I } = get3DEnvironmentParams();
      holder.scale.set(
        (e.w * SCALE) / size.x,
        ((e.customHeight || asset.h) * SCALE) / size.y,
        (e.h * SCALE) / size.z,
      );
      const footprint = PresentationModel.bounds(e);
      holder.position.set(
        I.x + (footprint.x + footprint.w / 2) * SCALE,
        WorkbenchModel.roomBase(ProjectState.capture(), e) * SCALE,
        I.z + (footprint.y + footprint.h / 2) * SCALE,
      );
      holder.rotation.y = (-e.rot * Math.PI) / 180;
      holder.userData = {
        floor: e.floor,
        elementId: e.id,
        roomIndex: elements.findIndex((n) => n.id === e.id),
        isFurniture: true,
      };
      holder.traverse((c) => {
        if (c.isMesh) c.userData = { ...holder.userData };
      });
      const old = objectMap.get(e.id);
      if (old) old.visible = false;
      parent.add(holder);
      if(invalidate && typeof Engine4D !== "undefined" && Engine4D.active) {
        Engine4D.modelVersion=null;
        if(window.FourDWorkspace?.running && !wasCached)FourDWorkspace.scheduleUpdate();
      }
      Engine3D.needsRender = true;
    } catch (error) {
      StudioUI.message("Model " + asset.name + ": " + error.message, "error");
    }
  },
  disposeObject(object) {
    const shared = new Set([
        ...Object.values(SOLID_MAT_CACHE), ...Object.values(HD_TEXTURES), ...Object.values(FAST_COLORS),
        ...Object.values(FurnitureFactory.mats),
      ]),
      disposed = new Set();
    object.traverse((c) => {
      if (c.isInstancedMesh) c.dispose();
      if (c.geometry && !disposed.has(c.geometry)) { c.geometry.dispose(); disposed.add(c.geometry); }
      for (const m of c.material
        ? Array.isArray(c.material)
          ? c.material
          : [c.material]
        : []) {
        if (shared.has(m) || disposed.has(m)) continue;
        for (const v of Object.values(m))
          if (
            v?.isTexture &&
            !Object.values(textureCache).includes(v) &&
            !disposed.has(v)
          ) {
            v.dispose();
            disposed.add(v);
          }
        m.dispose();
        disposed.add(m);
      }
    });
  },
  init() {
    if (!Engine3D.renderer || this.controls) return;
    const canvas = Engine3D.renderer.domElement;
    this.controls = new THREE.TransformControls(Engine3D.camera, canvas);
    this.controls.showY = false;
    this.controls.setTranslationSnap(PlanningUI.data.snap.grid || 6);
    this.controls.setRotationSnap(Math.PI / 2);
    Engine3D.scene.add(this.controls);
    this.proxy = new THREE.Object3D();
    this.proxy.visible = false;
    Engine3D.scene.add(this.proxy);
    this.controls.addEventListener("dragging-changed", (e) => {
      Engine3D.controls.enabled = !e.value;
      if (e.value)
        this.dragStart = {
          position: this.proxy.position.clone(),
          scale: this.proxy.scale.clone(),
          target: { ...this.target },
          project: ProjectState.capture(),
        };
      else this.commitDrag();
    });
    this.controls.addEventListener(
      "change",
      () => (Engine3D.needsRender = true),
    );
    canvas.addEventListener(
      "click",
      (event) => {
        if (!this.enabled && !this.measurePoints) return;
        if (this.controls.dragging || this.controls.axis) return;
        const hit = this.hit(event);
        if (!hit) return;
        if (this.measurePoints) {
          const q = this.snapPoint(hit);
          this.measurePoints.push(q);
          if (this.measurePoints.length === 2) {
            const [a, b] = this.measurePoints;
            this.measurePoints = null;
            WorkbenchUI.change("Measured two 3D points", () =>
              WorkbenchUI.data.measurements.push({
                id: ProjectModel.uid(),
                a,
                b,
                name: "3D measurement",
              }),
            );
            const m = WorkbenchModel.measure(a, b);
            StudioUI.message(
              `3D ${PlanningUI.length(m.length)} · horizontal ${PlanningUI.length(m.horizontal)} · vertical ${PlanningUI.length(m.vertical)}`,
            );
          }
          return;
        }
        const d = hit.object.userData;
        this.target = d.openingId
          ? { kind: "opening", id: d.openingId }
          : d.wallId
            ? { kind: "wall", id: d.wallId }
            : d.elementId
              ? { kind: "element", id: d.elementId }
              : d.objectId
                ? { kind: "workbench", id: d.objectId }
                : null;
        if (this.target?.kind === "workbench") {
          WorkbenchUI.extraSelection = new Set([d.objectId]);
          Selection.ids.clear();
          selectedElIndex = -1;
        } else if (d.roomIndex !== undefined) {
          WorkbenchUI.extraSelection.clear();
          StudioUI.select(d.roomIndex);
        }
        this.attach();
        WorkbenchUI.context();
      },
      true,
    );
    this.labels = document.createElement("div");
    this.labels.id = "wb-3d-labels";
    document.getElementById("three-container")?.append(this.labels);
    this.lastLabels = 0;
    Engine3D.afterRender = (now, settled) => {
      if (settled || now - this.lastLabels > 80) {
        this.lastLabels = now;
        this.renderLabels();
      }
    };
  },
  hit(event) {
    const rect = Engine3D.renderer.domElement.getBoundingClientRect(),
      mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, Engine3D.camera);
    return ray.intersectObject(Engine3D.buildingGroup, true).find((h) => {
      if (!h.object.isMesh) return false;
      for (let o = h.object; o; o = o.parent) if (!o.visible) return false;
      return true;
    });
  },
  snapPoint(hit) {
    const point = hit.point.clone(),
      attr = hit.object.geometry?.attributes.position;
    let best = point,
      min = 8 * get3DEnvironmentParams().SCALE;
    if (attr)
      for (let i = 0; i < attr.count; i++) {
        const v = new THREE.Vector3()
            .fromBufferAttribute(attr, i)
            .applyMatrix4(hit.object.matrixWorld),
          d = v.distanceTo(point);
        if (d < min) {
          min = d;
          best = v;
        }
      }
    return this.modelPoint(best);
  },
  enableEdit(mode = "translate") {
    document.getElementById("studio-dialog")?.close();
    setWorkspaceLayout(StudioUI.mode === "4d" ? "4d" : "3d");
    this.enabled = true;
    if (!this.target && elements[selectedElIndex])
      this.target = { kind: "element", id: elements[selectedElIndex].id };
    this.mode = mode;
    this.controls.setMode(mode);
    this.controls.showY = mode === "scale" && this.target?.kind === "opening";
    this.controls.showZ = !(
      mode === "scale" && this.target?.kind === "opening"
    );
    this.attach();
    StudioUI.message(
      "Click an object, then drag the gizmo. Edits commit when you release.",
    );
  },
  disableEdit() {
    this.enabled = false;
    this.controls?.detach();
    if (this.proxy) this.proxy.visible = false;
    this.target = null;
    if (Engine3D.controls) Engine3D.controls.enabled = true;
    WorkbenchUI.context();
  },
  attach() {
    if (!this.enabled || !this.target) return;
    const p = ProjectState.capture(),
      target = this.target,
      { SCALE, I } = get3DEnvironmentParams();
    let center, size;
    if (target.kind === "wall") {
      const w = ProjectModel.walls(p).find((w) => w.id === target.id);
      if (!w) return;
      size = [
        w.length * SCALE,
        (w.height ?? WorkbenchModel.floorHeight(p, w.floor)) * SCALE,
        w.thickness * SCALE,
      ];
      this.proxy.rotation.y = -Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x);
      center = this.coordinates({
        x: (w.a.x + w.b.x) / 2,
        y: (w.a.y + w.b.y) / 2,
        z:
          (w.base ?? WorkbenchModel.floorBase(p, w.floor)) +
          (w.height ?? WorkbenchModel.floorHeight(p, w.floor)) / 2,
      });
    } else if (target.kind === "opening") {
      const f = p.fixtures.find((f) => f.id === target.id);
      if (!f) return;
      const s = PlanningModel.openingSegment(p, f);
      size = [f.size * SCALE, f.height * SCALE, 3 * SCALE];
      center = this.coordinates({
        x: (s.a.x + s.b.x) / 2,
        y: (s.a.y + s.b.y) / 2,
        z:
          WorkbenchModel.roomBase(p, p.elements[f.roomId]) +
          f.sill +
          f.height / 2,
      });
      this.proxy.rotation.y = -Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x);
    } else if (target.kind === "workbench") {
      const found = WorkbenchModel.findObject(p, target.id);
      if (!found) return;
      const r = found.record,
        ps = r.points || PlanningModel.points(r),
        xs = ps.map((q) => q.x),
        ys = ps.map((q) => q.y),
        width = Math.max(...xs) - Math.min(...xs),
        depth = Math.max(...ys) - Math.min(...ys),
        height = r.height || 36;
      size = [
        Math.max(1, width) * SCALE,
        height * SCALE,
        Math.max(1, depth) * SCALE,
      ];
      center = this.coordinates({
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: (Math.min(...ys) + Math.max(...ys)) / 2,
        z:
          WorkbenchModel.floorBase(p, found.floor) + (r.base || 0) + height / 2,
      });
      this.proxy.rotation.y = 0;
    } else {
      const e = p.elements.find((e) => e.id === target.id);
      if (!e) return;
      const turned = e.isFurniture && e.rot % 180 === 90,
        width = turned ? e.h : e.w,
        depth = turned ? e.w : e.h,
        height = e.isFurniture
          ? e.customHeight || 36
          : WorkbenchModel.floorHeight(p, e.floor);
      size = [width * SCALE, height * SCALE, depth * SCALE];
      this.proxy.rotation.y = 0;
      center = this.coordinates({
        x: e.x + width / 2,
        y: e.y + depth / 2,
        z: WorkbenchModel.roomBase(p, e) + height / 2,
      });
    }
    for (const child of this.proxy.children.slice()) {
      this.proxy.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
    if (size)
      this.proxy.add(
        new THREE.Mesh(
          new THREE.BoxGeometry(...size),
          new THREE.MeshBasicMaterial({
            color: 0xf59e0b,
            wireframe: true,
            transparent: true,
            opacity: 0.65,
            depthTest: false,
          }),
        ),
      );
    this.proxy.visible = true;
    this.proxy.position.copy(center);
    this.proxy.scale.set(1, 1, 1);
    this.controls.attach(this.proxy);
    Engine3D.needsRender = true;
  },
  commitDrag() {
    if (!this.dragStart) return;
    const d = this.dragStart;
    this.dragStart = null;
    const { SCALE } = get3DEnvironmentParams(),
      dx =
        Math.round(((this.proxy.position.x - d.position.x) / SCALE) * 1e6) /
        1e6,
      dy =
        Math.round(((this.proxy.position.z - d.position.z) / SCALE) * 1e6) /
        1e6,
      target = d.target;
    WorkbenchUI.run(() => {
      let next = d.project;
      if (JSON.stringify(ProjectState.capture()) !== JSON.stringify(d.project))
        throw Error("Project changed during manipulation; try again");
      if (target.kind === "wall") {
        const w = ProjectModel.walls(next).find((w) => w.id === target.id);
        if (this.mode === "scale")
          throw Error("Use wall face editing to resize wall thickness");
        const delta =
          (dx * -(w.b.y - w.a.y)) / w.length +
          (dy * (w.b.x - w.a.x)) / w.length;
        next = WorkbenchModel.faceEdit(next, w.id, delta, "centre");
        this.movedWall = {
          owners: w.owners,
          a: {
            x: w.a.x - (delta * (w.b.y - w.a.y)) / w.length,
            y: w.a.y + (delta * (w.b.x - w.a.x)) / w.length,
          },
        };
      } else if (target.kind === "opening") {
        const f = next.fixtures.find((f) => f.id === target.id),
          s = PlanningModel.openingSegment(next, f);
        if (
          next.elements[f.roomId].locked ||
          next.design.objectProperties[f.id]?.locked
        )
          throw Error("Unlock the opening and room");
        if (this.mode === "scale") {
          f.size *= Math.abs(this.proxy.scale.x);
          f.height *= Math.abs(this.proxy.scale.y);
        } else {
          const len = PlanningModel.distance(s.a, s.b);
          f.offset +=
            (dx * (s.b.x - s.a.x)) / len + (dy * (s.b.y - s.a.y)) / len;
        }
      } else if (target.kind === "workbench") {
        const r = WorkbenchModel.findObject(next, target.id)?.record;
        if (!r) throw Error("Object no longer exists");
        if (r.locked) throw Error("Unlock the selected object");
        if (this.mode === "scale")
          throw Error("Edit this object’s dimensions in its planner");
        if (r.points)
          r.points = r.points.map((q) => ({ ...q, x: q.x + dx, y: q.y + dy }));
        else {
          r.x += dx;
          r.y += dy;
        }
      } else {
        const e = next.elements.find((e) => e.id === target.id);
        if (e.locked || next.design.objectProperties[e.id]?.locked)
          throw Error("Unlock the selected object");
        if (this.mode === "scale") {
          if (e.points)
            throw Error("Use polygon vertex editing to change this room shape");
          e.w *= Math.abs(this.proxy.scale.x);
          e.h *= Math.abs(this.proxy.scale.z);
        } else
          next = DesignModel.transformSelection(next, [e.id], (q) => ({
            x: q.x + dx,
            y: q.y + dy,
          }));
      }
      WorkbenchUI.apply(
        ProjectModel.normalize(next),
        "Edited geometry with 3D gizmo",
      );
    });
    if (this.movedWall) {
      const m = this.movedWall,
        w = ProjectModel.walls(ProjectState.capture()).find(
          (w) =>
            w.owners.some((o) =>
              m.owners.some(
                (v) =>
                  (v.index !== undefined &&
                    v.index === o.index &&
                    v.edge === o.edge) ||
                  (v.wallId && v.wallId === o.wallId),
              ),
            ) && PlanningModel.distance(w.a, m.a) < 1,
        );
      if (w) this.target = { kind: "wall", id: w.id };
      else this.disableEdit();
      this.movedWall = null;
    }
    this.attach();
  },
  startMeasure() {
    document.getElementById("studio-dialog")?.close();
    setWorkspaceLayout(StudioUI.mode === "4d" ? "4d" : "3d");
    this.measurePoints = [];
    this.enabled = false;
    this.controls.detach();
    this.proxy.visible = false;
    StudioUI.message(
      "Click two visible surfaces or nearby vertices to measure.",
    );
  },
  drawMeasurements() {
    if (!this.group) return;
    for (const m of WorkbenchUI.data.measurements) {
      const points = [this.coordinates(m.a), this.coordinates(m.b)],
        g = new THREE.BufferGeometry().setFromPoints(points),
        line = new THREE.Line(
          g,
          new THREE.LineBasicMaterial({ color: 0xf59e0b, depthTest: false }),
        );
      line.userData = { workbenchMeasure: true };
      this.group.add(line);
    }
  },
  renderLabels() {
    if (!this.labels) return;
    this.labels.replaceChildren();
    if (StudioUI.mode === "4d" && !window.FourDWorkspace?.dimensions) return;
    if (!window.is3DMode && !this.labelsEnabled) return;
    const canvas = Engine3D.renderer.domElement,
      rect = canvas.getBoundingClientRect(),
      items = WorkbenchUI.data.measurements.map((m) => ({
        point: {
          x: (m.a.x + m.b.x) / 2,
          y: (m.a.y + m.b.y) / 2,
          z: (m.a.z + m.b.z) / 2,
        },
        label: PlanningUI.length(WorkbenchModel.measure(m.a, m.b).length),
      }));
    if (this.labelsEnabled) {
      const p = ProjectState.capture();
      for (const e of p.elements.filter((e) => !e.isFurniture))
        items.push({
          point: {
            x: e.x + e.w / 2,
            y: e.y + e.h / 2,
            z: WorkbenchModel.roomBase(p, e) + 30,
          },
          label: e.customName || e.type,
        });
    }
    for (const item of items) {
      const q = this.coordinates(item.point).project(Engine3D.camera);
      if (q.z > 1 || Math.abs(q.x) > 1 || Math.abs(q.y) > 1) continue;
      const node = document.createElement("span");
      node.textContent = item.label;
      node.style.left = ((q.x + 1) * rect.width) / 2 + "px";
      node.style.top = ((1 - q.y) * rect.height) / 2 + "px";
      this.labels.append(node);
    }
  },
  sectionFromForm() {
    WorkbenchUI.run(() => {
      this.section = Object.fromEntries(
        ["xmin", "xmax", "ymin", "ymax", "zmin", "zmax"].map((k) => [
          k,
          WorkbenchUI.length("wb-section-" + k),
        ]),
      );
      for (const axis of ["x", "y", "z"])
        if (this.section[axis + "min"] >= this.section[axis + "max"])
          throw Error("Section minima must be less than maxima");
      document.getElementById("studio-dialog").close();
      setWorkspaceLayout(StudioUI.mode === "4d" ? "4d" : "3d");
      this.applySection();
    });
  },
  applySection() {
    if (!this.section || !Engine3D.renderer) return;
    const s = this.section,
      min = this.coordinates({ x: s.xmin, y: s.ymin, z: s.zmin }),
      max = this.coordinates({ x: s.xmax, y: s.ymax, z: s.zmax });
    Engine3D.renderer.clippingPlanes = [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), -min.x),
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), max.x),
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -min.y),
      new THREE.Plane(new THREE.Vector3(0, -1, 0), max.y),
      new THREE.Plane(new THREE.Vector3(0, 0, 1), -min.z),
      new THREE.Plane(new THREE.Vector3(0, 0, -1), max.z),
    ];
    Engine3D.needsRender = true;
  },
  clearSection() {
    this.section = null;
    if (Engine3D.renderer) Engine3D.renderer.clippingPlanes = [];
    Engine3D.needsRender = true;
  },
  isolateSelection() {
    const ids = WorkbenchUI.selected();
    if (!ids.length && this.target?.kind === "element")
      ids.push(this.target.id);
    if (!ids.length)
      return StudioUI.message("Select one or more room/furniture objects.");
    document.getElementById("studio-dialog")?.close();
    this.isolation = new Set(ids);
    this.applyIsolation();
  },
  applyIsolation() {
    if (!this.isolation || !Engine3D.buildingGroup) return;
    const ids = this.isolation;
    for (const child of Engine3D.buildingGroup.children) {
      const data = child.userData || {};
      if (data.workbench) {
        for (const c of child.children) {
          if (c.userData.wbPreviousVisible === undefined)
            c.userData.wbPreviousVisible = c.visible;
          c.visible = !!(
            ids.has(c.userData.elementId) ||
            ids.has(c.userData.ownerRoom) ||
            ids.has(c.userData.objectId)
          );
        }
        continue;
      }
      if (data.wbPreviousVisible === undefined)
        data.wbPreviousVisible = child.visible;
      const associated =
        (data.elementId && ids.has(data.elementId)) ||
        (data.openingId &&
          ids.has(
            elements[fixtures.find((f) => f.id === data.openingId)?.roomId]?.id,
          )) ||
        data.roomIndices?.some((i) => ids.has(elements[i]?.id));
      child.visible = !!associated;
    }
    Engine3D.needsRender = true;
  },
  clearIsolation() {
    this.isolation = null;
    Engine3D.buildingGroup?.traverse((c) => {
      if (c.userData.wbPreviousVisible !== undefined) {
        c.visible = c.userData.wbPreviousVisible;
        delete c.userData.wbPreviousVisible;
      }
    });
    Engine3D.needsRender = true;
  },
  lighting(night) {
    if (!Engine3D.scene) setWorkspaceLayout(StudioUI.mode === "4d" ? "4d" : "3d");
    const scene = Engine3D.scene;
    scene.traverse((o) => {
      if (o.isLight) {
        o.userData.wbIntensity ??= o.intensity;
        o.intensity = night
          ? o.isAmbientLight
            ? 0.18
            : o.userData.wbIntensity * 0.12
          : o.userData.wbIntensity;
      }
    });
    scene.background = new THREE.Color(typeof StudioEnhancements !== "undefined" ? StudioEnhancements.viewportBackground("3d") : (night ? 0x07101f : 0xe2e8f0));
    Engine3D.needsRender = true;
  },
  async panorama() {
    await WorkbenchUI.asyncRun(async () => {
      document.getElementById("studio-dialog")?.close();
      setWorkspaceLayout(StudioUI.mode === "4d" ? "4d" : "3d");
      const renderer = Engine3D.renderer,
        scene = Engine3D.scene,
        target = new THREE.WebGLCubeRenderTarget(512, {
          format: THREE.RGBAFormat,
        }),
        camera = new THREE.CubeCamera(0.1, 10000, target),
        gizmo = this.controls.visible,
        proxyVisible = this.proxy.visible;
      camera.position.copy(Engine3D.camera.position);
      this.controls.visible = false;
      this.proxy.visible = false;
      const output = new THREE.WebGLRenderTarget(2048, 1024),
        material = new THREE.ShaderMaterial({
          uniforms: { map: { value: target.texture } },
          vertexShader:
            "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
          fragmentShader:
            "uniform samplerCube map;varying vec2 vUv;void main(){float a=(vUv.x-.5)*6.28318530718;float b=(vUv.y-.5)*3.14159265359;vec3 d=vec3(cos(b)*sin(a),sin(b),cos(b)*cos(a));gl_FragColor=textureCube(map,d);}",
        }),
        quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material),
        stage = new THREE.Scene(),
        ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
        previous = renderer.getRenderTarget();
      try {
        camera.update(renderer, scene);
        stage.add(quad);
        renderer.setRenderTarget(output);
        renderer.render(stage, ortho);
        const pixels = new Uint8Array(2048 * 1024 * 4);
        renderer.readRenderTargetPixels(output, 0, 0, 2048, 1024, pixels);
        const canvas = document.createElement("canvas");
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext("2d"),
          image = ctx.createImageData(2048, 1024);
        for (let y = 0; y < 1024; y++)
          image.data.set(
            pixels.subarray(y * 2048 * 4, (y + 1) * 2048 * 4),
            (1023 - y) * 2048 * 4,
          );
        ctx.putImageData(image, 0, 0);
        const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
        NavActionEngine.downloadBlob(blob, "ArchCAD_Panorama.png", "image/png");
      } finally {
        renderer.setRenderTarget(previous);
        this.controls.visible = gizmo;
        this.proxy.visible = proxyVisible;
        target.dispose();
        output.dispose();
        quad.geometry.dispose();
        material.dispose();
        Engine3D.needsRender = true;
      }
    });
  },
  async recordWalkthrough() {
    await WorkbenchUI.asyncRun(async () => {
      if (this.recorder?.state === "recording")
        throw Error("A recording is already running");
      const views = ProjectState.meta.design.views;
      if (views.length < 2)
        throw Error("Capture at least two named viewpoints");
      const seconds = WorkbenchUI.num("wb-video-duration");
      ProjectModel.finite(seconds, "View duration", 0.5, 30);
      setWorkspaceLayout(StudioUI.mode === "4d" ? "4d" : "3d");
      const presentation = typeof Engine4D !== 'undefined' && Engine4D.active && Engine4D.ready;
      const source = (presentation ? Engine4D.renderer : Engine3D.renderer).domElement;
      if (!window.MediaRecorder || !source.captureStream)
        throw Error("Video recording is unavailable in this browser");
      const type = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      if (!type) throw Error("No compatible video encoder found");
      document.getElementById("studio-dialog").close();
      setWorkspaceLayout(StudioUI.mode === "4d" ? "4d" : "3d");
      const canvas = document.createElement("canvas");
      canvas.width = source.width;
      canvas.height = source.height;
      const context = canvas.getContext("2d");
      const draw = (view) => {
        if(presentation) Engine4D.render(); else Engine3D.renderer.render(Engine3D.scene, Engine3D.camera);
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const scale = canvas.width / 1440;
        context.font = Math.max(16, 20 * scale) + "px system-ui";
        context.fillStyle = "#0f172add";
        context.fillRect(
          0,
          canvas.height - 70 * scale,
          canvas.width,
          70 * scale,
        );
        context.fillStyle = "#fff";
        context.fillText(
          view.name || "",
          20 * scale,
          canvas.height - 42 * scale,
        );
        context.font = Math.max(12, 15 * scale) + "px system-ui";
        context.fillText(
          String(view.note || "").slice(0, 160),
          20 * scale,
          canvas.height - 17 * scale,
        );
        if (this.labelsEnabled) {
          const p = ProjectState.capture();
          context.font = Math.max(12, 15 * scale) + "px system-ui";
          for (const e of p.elements.filter((e) => !e.isFurniture)) {
            const q = this.coordinates({
              x: e.x + e.w / 2,
              y: e.y + e.h / 2,
              z: WorkbenchModel.roomBase(p, e) + 30,
            }).project(Engine3D.camera);
            if (q.z > 1 || Math.abs(q.x) > 1 || Math.abs(q.y) > 1) continue;
            const x = ((q.x + 1) * canvas.width) / 2,
              y = ((1 - q.y) * canvas.height) / 2,
              label = e.customName || e.type,
              width = context.measureText(label).width;
            context.fillStyle = "#0f172acc";
            context.fillRect(x - width / 2 - 5, y - 18, width + 10, 24);
            context.fillStyle = "#fbbf24";
            context.fillText(label, x - width / 2, y);
          }
        }
      };
      const stream = canvas.captureStream(30),
        track = stream.getVideoTracks()[0],
        recorder = new MediaRecorder(stream, { mimeType: type }),
        chunks = [],
        saved = {
          position: Engine3D.camera.position.clone(),
          target: Engine3D.controls.target.clone(),
          controls: this.controls.visible,
          proxy: this.proxy.visible,
        };
      this.recorder = recorder;
      this.recordingCancelled = false;
      this.controls.visible = false;
      this.proxy.visible = false;
      const bar = document.createElement("div");
      bar.id = "wb-recording";
      bar.innerHTML = WorkbenchUI.b(
        "Cancel recording",
        "Workbench3D.stopRecording()",
      );
      document.body.append(bar);
      const started = new Promise(resolve => { recorder.onstart = resolve; });
      const stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = (e) =>
          reject(e.error || Error("Video encoder failed"));
      });
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      try {
        draw(views[0]);
        recorder.start(100);
        draw(views[0]);
        track.requestFrame?.();
        // Count the requested duration after the asynchronous encoder starts.
        await Promise.race([
          started,
          stopped.then(() => { if (!this.recordingCancelled) throw Error("Recording stopped before the encoder started"); }),
          new Promise((_, reject) => setTimeout(() => reject(Error("Video encoder did not start")), 10000)),
        ]);
        draw(views[0]);
        track.requestFrame?.();
        const start = performance.now(),
          total = (views.length - 1) * seconds * 1000;
        await new Promise((resolve) => {
          const tick = (now) => {
            if (recorder.state !== "recording") {
              resolve();
              return;
            }
            const position = Math.min(
                (now - start) / (seconds * 1000),
                views.length - 1,
              ),
              i = Math.min(views.length - 2, Math.floor(position)),
              t = Math.min(1, position - i),
              a = views[i],
              b = views[i + 1];
            Engine3D.camera.position.lerpVectors(
              new THREE.Vector3().fromArray(a.position),
              new THREE.Vector3().fromArray(b.position),
              t,
            );
            Engine3D.controls.target.lerpVectors(
              new THREE.Vector3().fromArray(a.target),
              new THREE.Vector3().fromArray(b.target),
              t,
            );
            Engine3D.controls.update();
            draw(a);
            track.requestFrame?.();
            if (now - start >= total) {
              setTimeout(() => {
                if (recorder.state === "recording") recorder.stop();
                resolve();
              }, 150);
            } else setTimeout(() => tick(performance.now()), 33);
          };
          setTimeout(() => tick(performance.now()), 33);
        });
        await Promise.race([
          stopped,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(Error("Video encoder did not finish")),
              10000,
            ),
          ),
        ]);
        if (!chunks.length && !this.recordingCancelled)
          throw Error("The browser produced no usable video frames");
        if (chunks.length && !this.recordingCancelled) {
          const blob = new Blob(chunks, { type });
          if (blob.size < 500)
            throw Error("The browser produced no usable video frames");
          NavActionEngine.downloadBlob(
            blob,
            "ArchCAD_Walkthrough." + (type.includes("mp4") ? "mp4" : "webm"),
            type,
          );
        }
      } finally {
        if (recorder.state === "recording") recorder.stop();
        stream.getTracks().forEach((t) => t.stop());
        Engine3D.camera.position.copy(saved.position);
        Engine3D.controls.target.copy(saved.target);
        this.controls.visible = saved.controls;
        this.proxy.visible = saved.proxy;
        bar.remove();
        this.recorder = null;
        this.recordingCancelled = false;
        Engine3D.needsRender = true;
      }
    });
  },
  stopRecording() {
    this.recordingCancelled = true;
    if (this.recorder?.state === "recording") this.recorder.stop();
  },
};
const wbGenerate = generate3DModel;
generate3DModel = function () {
  wbGenerate();
  Workbench3D.rebuild();
  if (typeof ViewportUI !== "undefined") ViewportUI.modelUpdated();
};
const wbRooms = build3DRooms;
build3DRooms = function (...args) {
  wbRooms(...args);
};
const wbWall3D = PlanningDrawing.wall3D;
PlanningDrawing.wall3D = function (SCALE, I, WALL_HEIGHT, rows = ProjectModel.walls(ProjectState.capture())) {
  const p = ProjectState.capture();
  if (
    !WorkbenchUI.data.levels.length &&
    !Object.values(p.design.roomProperties).some((r) => r.level)
  )
    return wbWall3D.call(this, SCALE, I, WALL_HEIGHT, rows);
  for (const w of rows) {
    const group = new THREE.Group();
    group.userData = {
      isWall: true,
      wallId: w.id,
      floor: w.floor,
      roomIndices: w.owners.map((o) => o.index).filter((i) => i !== undefined),
      roomIndex: w.owners.find((o) => o.index !== undefined)?.index,
    };
    const splits = [
        ...new Set([
          0,
          w.length,
          ...w.openings.flatMap((o) => [o.start, o.end]),
        ]),
      ].sort((a, b) => a - b),
      at = (t) => ({
        x: w.a.x + ((w.b.x - w.a.x) * t) / w.length,
        y: w.a.y + ((w.b.y - w.a.y) * t) / w.length,
      }),
      add = (a, b, lo, hi) => {
        if (hi <= lo || b <= a) return;
        const poly = DesignModel.wallStrip(
          { a: at(a), b: at(b), thickness: w.thickness },
          false,
        )[0].map(([x, y]) => ({ x, y }));
        group.add(
          Workbench3D.extrude(
            [DesignModel.polygon(poly)],
            w.base + lo,
            hi - lo,
            0xb8c4d4,
            group.userData,
          ),
        );
      };
    for (let i = 1; i < splits.length; i++) {
      const a = splits[i - 1],
        b = splits[i],
        open = w.openings
          .filter((o) => (a + b) / 2 > o.start && (a + b) / 2 < o.end)
          .sort((a, b) => a.sill - b.sill);
      let low = 0;
      for (const o of open) {
        add(a, b, low, o.sill);
        low = Math.max(low, o.sill + o.height);
      }
      add(a, b, low, w.height);
    }
    Engine3D.buildingGroup.add(group);
  }
};
const wbSlabs = build3DSlabs;
build3DSlabs = function (...args) {
  const p = ProjectState.capture(),
    w = WorkbenchModel.data(p);
  if (!w.levels.length && !w.voids.length && !w.shafts.length)
    return wbSlabs(...args);
  for (let f = 0; f < p.floorCount; f++) {
    if(args[4]?.floors && !args[4].floors.has(f))continue;
    const g = Workbench3D.extrude(
      WorkbenchModel.slabGeometry(p, f),
      WorkbenchModel.floorBase(p, f) + WorkbenchModel.floorHeight(p, f) - 6,
      6,
      0x9ca3af,
      { floor: f, isSlab: true },
    );
    Engine3D.buildingGroup.add(g);
  }
};
const wbStairs = buildStaircase;
buildStaircase = function (e, ...args) {
  const p = ProjectState.capture(),
    designed = WorkbenchModel.orientedStairs(p, e);
  if (!designed) return wbStairs(e, ...args);
  const group = new THREE.Group();
  group.position.y = e.floor * get3DEnvironmentParams().WALL_HEIGHT;
  for (const t of designed.treads)
    group.add(
      Workbench3D.extrude([DesignModel.polygon(t.points)], 0, t.top, 0x94a3b8),
    );
  return group;
};
document.addEventListener("DOMContentLoaded", () => Workbench3D.init());

Object.defineProperty(Workbench3D, "labelsEnabled", {
  get() { return !!this._labelsEnabled; },
  set(value) { this._labelsEnabled = !!value; Engine3D.needsRender = true; }
});
