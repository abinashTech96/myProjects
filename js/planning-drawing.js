function pHiddenWall(w){const props=typeof ProjectState!=="undefined"?ProjectState.meta.design?.objectProperties||{}:{};return!!props[w.id]?.hidden||w.owners.some(o=>o.wallId&&props[o.wallId]?.hidden)}
/* One geometry path for editable plan overlays, 3D walls and drawing sets. */
const PlanningDrawing = {
  svgNode(tag, attrs = {}, parent) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
    if (parent) parent.appendChild(el);
    return el;
  },
  point(w, d) {
    const t = w.length ? d / w.length : 0;
    return { x: w.a.x + (w.b.x - w.a.x) * t, y: w.a.y + (w.b.y - w.a.y) * t };
  },
  segments(w, open = true) {
    const cuts = [
      ...new Set([
        0,
        w.length,
        ...(open ? w.openings.flatMap((o) => [o.start, o.end]) : []),
      ]),
    ].sort((a, b) => a - b);
    return cuts
      .slice(0, -1)
      .map((a, i) => [a, cuts[i + 1]])
      .filter(
        ([a, b]) =>
          b - a > 0.001 &&
          (!open ||
            !w.openings.some(
              (o) => (a + b) / 2 > o.start && (a + b) / 2 < o.end,
            )),
      );
  },
  render() {
    if (!PlanningUI.ready || !UI.elementContainer) return;
    const p = ProjectState.capture(),
      { I, SCALE } = Utils.getMetrics(),
      to = (q) => ({ x: I.x + q.x * SCALE, y: I.y + q.y * SCALE }),
      layers = p.planning.layers;
    let layer = document.getElementById("planning-layer");
    if (!layer)
      layer = this.svgNode("g", { id: "planning-layer" }, UI.elementContainer);
    layer.innerHTML = "";
    layer.style.pointerEvents = "none";
    let underlay = document.getElementById("planning-underlay");
    if (!underlay) {
      underlay = this.svgNode("g", { id: "planning-underlay" });
      UI.elementContainer.prepend(underlay);
    }
    underlay.innerHTML = "";
    if (layers.underlay.visible)
      p.planning.underlays
        .filter((u) => u.floor === currentFloor)
        .forEach((u) =>
          this.svgNode(
            "image",
            {
              x: I.x + u.x * SCALE,
              y: I.y + u.y * SCALE,
              width: u.w * SCALE,
              height: u.h * SCALE,
              href: u.data,
              opacity: u.opacity,
              preserveAspectRatio: "none",
            },
            underlay,
          ),
        );
    p.elements.forEach((e, i) => {
      const category = e.isFurniture ? "furniture" : "rooms",
        visible = layers[category].visible && e.floor === currentFloor;
      for (const id of [
        `rect-${i}`,
        `rect-border-${i}`,
        `rect-hollow-${i}`,
        `txt-title-${i}`,
        `txt-area-${i}`,
        `txt-dims-${i}`,
      ]) {
        const n = document.getElementById(id);
        if (n && !layers[category].visible) n.style.display = "none";
        if (n && layers[category].locked) n.style.pointerEvents = "none";
        else if (n) n.style.pointerEvents = "";
      }
      if (e.points) {
        for (const id of [
          `rect-${i}`,
          `rect-border-${i}`,
          `rect-hollow-${i}`,
        ]) {
          const n = document.getElementById(id);
          if (n) n.style.display = "none";
        }
        if (!visible) return;
        const poly = this.svgNode(
          "polygon",
          {
            points: PlanningModel.points(e)
              .map((q) => {
                const a = to(q);
                return a.x + "," + a.y;
              })
              .join(" "),
            "data-element-id":e.id,
            fill: e.material && e.material !== "auto" ? `url(#room-finish-${e.material})` : e.customColor || "#38bdf8",
            "fill-opacity": e.material && e.material !== "auto" ? "1" : ".18",
            stroke: Selection.ids.has(e.id) ? "#fff" : "#38bdf8",
            "stroke-width": 2,
          },
          layer,
        );
        poly.style.pointerEvents = layers.rooms.locked ? "none" : "auto";
        poly.addEventListener("mousedown", (ev) => startDrag(ev, i));
      }
      if (
        visible &&
        layers.dimensions.visible &&
        i === selectedElIndex &&
        !e.isFurniture
      ) {
        const a = to({ x: e.x + e.w / 2, y: e.y - 10 });
        const t = this.svgNode(
          "text",
          {
            x: a.x,
            y: a.y,
            fill: "#7dd3fc",
            "font-size": 10,
            "text-anchor": "middle",
          },
          layer,
        );
        t.textContent = PlanningUI.length(e.w) + " · click to edit";
        t.style.pointerEvents = "auto";
        t.style.cursor = "text";
        t.addEventListener("click", () => this.dimensionDialog(i, "w"));
        const b = to({ x: e.x + e.w + 12, y: e.y + e.h / 2 });
        const v = this.svgNode(
          "text",
          { x: b.x, y: b.y, fill: "#7dd3fc", "font-size": 10 },
          layer,
        );
        v.textContent = PlanningUI.length(e.h);
        v.style.pointerEvents = "auto";
        v.style.cursor = "text";
        v.addEventListener("click", () => this.dimensionDialog(i, "h"));
      }
    });
    p.elements.forEach((e, i) => {
      const title = document.getElementById("txt-title-" + i),
        label = document.getElementById("txt-area-" + i);
      if (title && e.type === "bedroom" && !e.customName)
        title.textContent = e.role === "master" ? "MASTER BEDROOM" : "BEDROOM";
      if (label && e.points)
        label.textContent =
          (PlanningModel.area(PlanningModel.points(e)) / 144).toFixed(1) +
          " sq.ft";
    });
    const wallLayer = document.getElementById("shared-wall-layer");
    if (wallLayer) wallLayer.style.display = layers.walls.visible ? "" : "none";
    const fixturesLayer = document.getElementById("fixture-container");
    if (fixturesLayer)
      fixturesLayer.style.display = layers.walls.visible ? "" : "none";
    for (const id of ["group-text"]) {
      const n = document.getElementById(id);
      if (n && !layers.dimensions.visible) n.style.display = "none";
      else if (n) n.style.display = "";
    }
    const comp = p.planning.overlays.comparisonFloor;
    if (comp !== null && comp !== currentFloor)
      p.elements
        .filter((e) => e.floor === comp && !e.isFurniture)
        .forEach((e) =>
          this.svgNode(
            "polygon",
            {
              points: PlanningModel.points(e)
                .map((q) => {
                  const a = to(q);
                  return a.x + "," + a.y;
                })
                .join(" "),
              fill: "none",
              stroke: "#c084fc",
              "stroke-width": 1.5,
              "stroke-dasharray": "8 5",
              opacity: 0.7,
            },
            layer,
          ),
        );
    if (p.planning.overlays.clearance)
      p.elements
        .filter((e) => e.floor === currentFloor && e.isFurniture)
        .forEach((e) => {
          const b = Selection.bounds(e);
          this.svgNode(
            "rect",
            {
              x: I.x + (e.x - 24) * SCALE,
              y: I.y + (e.y - 24) * SCALE,
              width: (b.w + 48) * SCALE,
              height: (b.h + 48) * SCALE,
              fill: "#fbbf24",
              "fill-opacity": ".04",
              stroke: "#fbbf24",
              "stroke-dasharray": "5 5",
            },
            layer,
          );
        });
    if (layers.dimensions.visible)
      p.planning.measurements
        .filter((m) => m.floor === currentFloor)
        .forEach((m) => {
          const a = to(m.a),
            b = to(m.b);
          this.svgNode(
            "line",
            {
              x1: a.x,
              y1: a.y,
              x2: b.x,
              y2: b.y,
              stroke: "#fbbf24",
              "stroke-width": 1.5,
            },
            layer,
          );
          const t = this.svgNode(
            "text",
            {
              x: (a.x + b.x) / 2,
              y: (a.y + b.y) / 2 - 7,
              fill: "#fbbf24",
              "text-anchor": "middle",
              "font-size": 11,
            },
            layer,
          );
          t.textContent =
            (m.label ? m.label + " · " : "") +
            PlanningUI.length(PlanningModel.distance(m.a, m.b));
        });
    if (layers.annotations.visible)
      p.planning.annotations
        .filter((a) => a.floor === currentFloor)
        .forEach((a) => {
          const q = to(a);
          if (a.kind === "cloud")
            this.svgNode(
              "rect",
              {
                x: q.x,
                y: q.y,
                width: a.w * SCALE,
                height: a.h * SCALE,
                rx: 8,
                fill: "none",
                stroke: "#fb7185",
                "stroke-width": 3,
                "stroke-dasharray": "3 3",
              },
              layer,
            );
          if (a.target) {
            const b = to(a.target);
            this.svgNode(
              "line",
              { x1: q.x, y1: q.y, x2: b.x, y2: b.y, stroke: "#fb7185" },
              layer,
            );
            this.svgNode(
              "circle",
              { cx: b.x, cy: b.y, r: 3, fill: "#fb7185" },
              layer,
            );
          }
          const t = this.svgNode(
            "text",
            { x: q.x, y: q.y - 6, fill: "#fb7185", "font-size": 11 },
            layer,
          );
          t.textContent = a.text;
        });
    p.planning.services
      .filter((s) => s.floor === currentFloor && layers[s.layer].visible && !p.design?.objectProperties?.[s.id]?.hidden)
      .forEach((s) => {
        const color =
            s.layer === "electrical"
              ? "#fde047"
              : s.kind === "drain"
                ? "#a78bfa"
                : "#38bdf8",
          ps = s.points.map(to);
        if (ps.length > 1)
          this.svgNode(
            "polyline",
            {
              points: ps.map((q) => q.x + "," + q.y).join(" "),
              fill: "none",
              stroke: color,
              "stroke-width": 2,
              "stroke-dasharray": s.kind === "drain" ? "6 3" : "",
            },
            layer,
          );
        ps.forEach((q) => {
          this.svgNode(
            "circle",
            { cx: q.x, cy: q.y, r: 6, fill: "#101b2c", stroke: color },
            layer,
          );
          const t = this.svgNode(
            "text",
            {
              x: q.x,
              y: q.y + 3,
              "text-anchor": "middle",
              "font-size": 8,
              fill: color,
            },
            layer,
          );
          t.textContent = {
            light: "⊗",
            switch: "S",
            socket: "P",
            panel: "DB",
            shaft: "SH",
            supply: "W",
            drain: "D",
          }[s.kind];
        });
        if (ps[0]) {
          const t = this.svgNode(
            "text",
            { x: ps[0].x + 9, y: ps[0].y - 8, fill: color, "font-size": 10 },
            layer,
          );
          t.textContent = s.label + (s.circuit ? " · " + s.circuit : "");
        }
      });
    if (PlanningUI.tool !== "select" && PlanningUI.clicks.length) {
      const ps = [
        ...PlanningUI.clicks,
        ...(PlanningUI.cursor ? [PlanningUI.cursor] : []),
      ].map(to);
      this.svgNode(
        "polyline",
        {
          points: ps.map((q) => q.x + "," + q.y).join(" "),
          fill: "none",
          stroke: "#4ade80",
          "stroke-dasharray": "5 3",
        },
        layer,
      );
      ps.forEach((q) =>
        this.svgNode(
          "circle",
          { cx: q.x, cy: q.y, r: 4, fill: "#4ade80" },
          layer,
        ),
      );
    }
  },
  dimensionDialog(i, key) {
    this.dimension = { i, key };
    StudioUI.dialog(
      "Edit dimension",
      PlanningUI.field(
        "chain-dimension",
        "New " + (key === "w" ? "width" : "depth"),
        ProjectModel.display(
          elements[i][key],
          document.getElementById("unitSelect").value,
        ),
      ) +
        PlanningUI.button(
          "Apply dimension",
          "PlanningDrawing.saveDimension()",
          "primary",
        ),
    );
  },
  saveDimension() {
    PlanningUI.run(() => {
      const { i, key } = this.dimension,
        n = PlanningUI.parse(PlanningUI.val("chain-dimension"));
      StudioUI.edit(i, key, n);
      document.getElementById("studio-dialog").close();
    });
  },
  wall2D() {
    const { I, SCALE } = Utils.getMetrics();
    let layer = document.getElementById("shared-wall-layer");
    if (!layer)
      layer = this.svgNode(
        "g",
        { id: "shared-wall-layer" },
        UI.elementContainer,
      );
    layer.innerHTML = "";
    WallEngine.getWalls()
      .filter((w) => w.floor === currentFloor && !pHiddenWall(w))
      .forEach((w) =>
        this.segments(w).forEach(([a, b]) => {
          const x = this.point(w, a),
            y = this.point(w, b);
          this.svgNode(
            "line",
            {
              "data-wall-id":w.id,
              x1: I.x + x.x * SCALE,
              y1: I.y + x.y * SCALE,
              x2: I.x + y.x * SCALE,
              y2: I.y + y.y * SCALE,
              stroke: w.shared ? "#94a3b8" : "#cbd5e1",
              "stroke-width": w.thickness * SCALE,
              "pointer-events": "none",
            },
            layer,
          );
        }),
      );
    const e = elements[selectedElIndex];
    if (
      !e ||
      e.locked ||
      e.points ||
      PlanningUI.data.layers[e.isFurniture ? "furniture" : "rooms"].locked
    )
      return;
    for (const corner of ["nw", "ne", "se", "sw"]) {
      const size = 9 / CanvasState.zoomLvl,
        q = this.svgNode(
          "rect",
          {
            x:
              I.x + (e.x + (corner.includes("e") ? e.w : 0)) * SCALE - size / 2,
            y:
              I.y + (e.y + (corner.includes("s") ? e.h : 0)) * SCALE - size / 2,
            width: size,
            height: size,
            fill: "#38bdf8",
            stroke: "#0f172a",
          },
          layer,
        );
      q.style.cursor = corner + "-resize";
      q.addEventListener("pointerdown", (ev) =>
        StudioUI.startResize(ev, corner),
      );
    }
  },
  wall3D(SCALE, I, WALL_HEIGHT, rows = WallEngine.getWalls()) {
    const height = ProjectState.meta.wallSettings.height;
    rows.forEach((w) => {
      const primary = w.owners.find((o) => o.index !== undefined)?.index,
        el = elements[primary];
      const group = new THREE.Group();
      group.userData = {
        isWall: true,
        roomIndex: primary,
        roomIndices: w.owners
          .map((o) => o.index)
          .filter((i) => i !== undefined),
        wallId: w.id,
        floor: w.floor,
      };
      const mat = getCachedSolidMaterial(
          el?.customColor ? parseInt(el.customColor.slice(1), 16) : 0xb8c4d4,
          1,
        ),
        splits = [
          ...new Set([
            0,
            w.length,
            ...w.openings.flatMap((o) => [o.start, o.end]),
          ]),
        ].sort((a, b) => a - b),
        theta = Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x);
      const add = (a, b, low, high) => {
        if (b - a < 0.001 || high - low < 0.001) return;
        const q = this.point(w, (a + b) / 2),
          mesh = new THREE.Mesh(
            new THREE.BoxGeometry(
              (b - a) * SCALE,
              (high - low) * SCALE,
              w.thickness * SCALE,
            ),
            mat,
          );
        mesh.position.set(
          I.x + q.x * SCALE,
          w.floor * WALL_HEIGHT + ((low + high) / 2) * SCALE,
          I.z + q.y * SCALE,
        );
        mesh.rotation.y = -theta;
        mesh.userData = { ...group.userData, isRoom: primary !== undefined };
        mesh.castShadow = !window.isPerformanceMode;
        mesh.receiveShadow = !window.isPerformanceMode;
        group.add(mesh);
      };
      for (let i = 0; i < splits.length - 1; i++) {
        const a = splits[i],
          b = splits[i + 1],
          ranges = w.openings
            .filter((o) => (a + b) / 2 > o.start && (a + b) / 2 < o.end)
            .map((o) => [o.sill, Math.min(height, o.sill + o.height)])
            .sort((a, b) => a[0] - b[0]);
        let bottom = 0;
        for (const [lo, hi] of ranges) {
          add(a, b, bottom, lo);
          bottom = Math.max(bottom, hi);
        }
        add(a, b, bottom, height);
      }
      Engine3D.buildingGroup.add(group);
    });
  },
  opening2D() {
    const { I, SCALE } = Utils.getMetrics(),
      p = ProjectState.capture();
    let g = document.getElementById("fixture-container");
    if (!g)
      g = this.svgNode("g", { id: "fixture-container" }, UI.elementContainer);
    g.innerHTML = "";
    p.fixtures.filter(f=>!p.design?.objectProperties?.[f.id]?.hidden).forEach((f, i) => {
      const s = PlanningModel.openingSegment(p, f);
      if (s.room.floor !== currentFloor) return;
      const a = { x: I.x + s.a.x * SCALE, y: I.y + s.a.y * SCALE },
        b = { x: I.x + s.b.x * SCALE, y: I.y + s.b.y * SCALE };
      const line = this.svgNode(
        "line",
        {
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          stroke: f.type === "window" ? "#38bdf8" : "#fbbf24",
          "stroke-width": f.type === "window" ? 4 : 2,
        },
        g,
      );
      line.style.cursor = "pointer";
      line.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectedElIndex = f.roomId;
        StudioUI.renderInspector();
        PlanningUI.editOpeningDialog(i);
      });
      if (f.type === "door" && f.style !== "open") {
        if (f.style === "sliding") {
          const dx = (b.x - a.x) * 0.5,
            dy = (b.y - a.y) * 0.5;
          this.svgNode(
            "line",
            {
              x1: a.x + dx,
              y1: a.y + dy,
              x2: b.x + dx,
              y2: b.y + dy,
              stroke: "#fbbf24",
              "stroke-dasharray": "3 2",
            },
            g,
          );
        } else {
          const shape = this.doorSector(p, f),
            hinge = shape.hinge,
            tip = shape.tip;
          const h = { x: I.x + hinge.x * SCALE, y: I.y + hinge.y * SCALE },
            t = { x: I.x + tip.x * SCALE, y: I.y + tip.y * SCALE },
            closed = f.handing === "right" ? a : b;
          const path = `M ${h.x} ${h.y} L ${t.x} ${t.y} A ${f.size * SCALE} ${f.size * SCALE} 0 0 ${shape.sweep} ${closed.x} ${closed.y} Z`;
          this.svgNode(
            "path",
            {
              d: path,
              fill: "#fbbf24",
              "fill-opacity": ".07",
              stroke: "#fbbf24",
              "stroke-width": 1.2,
              "pointer-events": "none",
            },
            g,
          );
        }
      }
    });
  },
  doorSector(p, f) {
    const s = PlanningModel.openingSegment(p, f),
      hinge = f.handing === "right" ? s.b : s.a,
      closed = f.handing === "right" ? s.a : s.b,
      u = {
        x: (closed.x - hinge.x) / f.size,
        y: (closed.y - hinge.y) / f.size,
      },
      mid = { x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 };
    let normal = { x: -s.u.y, y: s.u.x };
    if (
      !PlanningModel.inside(
        { x: mid.x + normal.x, y: mid.y + normal.y },
        PlanningModel.points(s.room),
      )
    )
      normal = { x: -normal.x, y: -normal.y };
    if (f.swing === "out") normal = { x: -normal.x, y: -normal.y };
    const tip = {
        x: hinge.x + normal.x * f.size,
        y: hinge.y + normal.y * f.size,
      },
      poly = [hinge];
    const start = Math.atan2(u.y, u.x),
      end = Math.atan2(normal.y, normal.x);
    let delta = ((end - start + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    for (let i = 0; i <= 12; i++)
      poly.push({
        x: hinge.x + Math.cos(start + (delta * i) / 12) * f.size,
        y: hinge.y + Math.sin(start + (delta * i) / 12) * f.size,
      });
    return { hinge, tip, poly, sweep: delta > 0 ? 0 : 1 };
  },
  clearanceWarnings() {
    const p = ProjectState.capture(),
      out = [];
    p.fixtures
      .filter(
        (f) =>
          f.type === "door" &&
          f.style !== "sliding" &&
          f.style !== "open" &&
          p.elements[f.roomId]?.floor === currentFloor,
      )
      .forEach((f) => {
        const poly = this.doorSector(p, f).poly;
        p.elements
          .filter((e) => e.isFurniture && e.floor === currentFloor)
          .forEach((e) => {
            const b = Selection.bounds(e),
              ps = PlanningModel.points({ ...e, w: b.w, h: b.h });
            if (
              ps.some((q) => PlanningModel.inside(q, poly)) ||
              poly.some((q) => PlanningModel.inside(q, ps))
            )
              out.push(
                `${p.elements[f.roomId].customName || p.elements[f.roomId].type} door swing intersects ${e.customName || e.type}`,
              );
          });
      });
    return out;
  },
  thumbnail(p) {
    const w = ProjectModel.inches(p.plot.inW, p.unit),
      h = ProjectModel.inches(p.plot.inH, p.unit);
    return `<svg class="planning-thumbnail" viewBox="-10 -10 ${w + 20} ${h + 20}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" fill="#0b1220" stroke="#64748b"/>${p.elements
      .filter((e) => e.floor === (p.currentFloor || 0))
      .map(
        (e) =>
          `<polygon points="${PlanningModel.points(e)
            .map((p) => p.x + "," + p.y)
            .join(
              " ",
            )}" fill="${e.isFurniture ? "#64748b" : "#164e63"}" stroke="#7dd3fc" stroke-width="2"/>`,
      )
      .join("")}</svg>`;
  },
  overlaySVG(p, floor) {
    const l = p.planning.layers,
      esc = ProjectModel.escapeHTML;
    let out = "";
    if (l.underlay.visible)
      out += p.planning.underlays
        .filter((u) => u.floor === floor)
        .map(
          (u) =>
            `<image x="${u.x}" y="${u.y}" width="${u.w}" height="${u.h}" href="${u.data}" opacity="${u.opacity}" preserveAspectRatio="none"/>`,
        )
        .join("");
    if (l.dimensions.visible)
      out += p.planning.measurements
        .filter((m) => m.floor === floor)
        .map(
          (m) =>
            `<line x1="${m.a.x}" y1="${m.a.y}" x2="${m.b.x}" y2="${m.b.y}" stroke="#a16207"/><text x="${(m.a.x + m.b.x) / 2}" y="${(m.a.y + m.b.y) / 2 - 5}" font-size="7" text-anchor="middle">${esc(m.label)} ${esc(PlanningUI.length(PlanningModel.distance(m.a, m.b)))}</text>`,
        )
        .join("");
    if (l.annotations.visible)
      out += p.planning.annotations
        .filter((a) => a.floor === floor)
        .map(
          (a) =>
            `${a.kind === "cloud" ? `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" rx="6" fill="none" stroke="#be123c" stroke-dasharray="3 3"/>` : ""}${a.target ? `<line x1="${a.x}" y1="${a.y}" x2="${a.target.x}" y2="${a.target.y}" stroke="#be123c"/>` : ""}<text x="${a.x}" y="${a.y - 5}" font-size="7" fill="#be123c">${esc(a.text)}</text>`,
        )
        .join("");
    out += p.planning.services
      .filter((s) => s.floor === floor && l[s.layer].visible)
      .map((s) => {
        const q = s.points[0];
        return `<polyline points="${s.points.map((q) => q.x + "," + q.y).join(" ")}" fill="none" stroke="${s.layer === "electrical" ? "#a16207" : "#0284c7"}" stroke-width="1.5"/>${s.points.map((q) => `<circle cx="${q.x}" cy="${q.y}" r="4" fill="white" stroke="#475569"/>`).join("")}<text x="${q.x + 5}" y="${q.y - 5}" font-size="7">${esc(s.label)} ${esc(s.circuit)}</text>`;
      })
      .join("");
    return out;
  },
  sheetDialog() {
    StudioUI.dialog(
      "Coordinated drawing set",
      `<p>Plans, projected elevations, a horizontal section and schedules use the same project model. Elevations show wall faces and opening positions; section cuts intersect walls at the chosen Y coordinate.</p>${PlanningUI.field("sheet-cut", "Section Y coordinate (in)", ProjectModel.inches(ProjectState.capture().plot.inH, ProjectState.capture().unit) / 2, "number")}${["plans", "elevations", "section", "schedules", "legend"].map((k) => `<label><input type="checkbox" id="sheet-${k}" checked>${k}</label>`).join("")}${PlanningUI.button("Open drawing set / PDF", "PlanningDrawing.printSet()", "primary")}`,
    );
  },
  elevation(p, side = "front", cut = null) {
    const pw = ProjectModel.inches(p.plot.inW, p.unit),
      ph = ProjectModel.inches(p.plot.inH, p.unit),
      height = p.wallSettings.height,
      span = ["front", "back"].includes(side) ? pw : ph,
      total = p.floorCount * height;
    const text = (x, y, s) =>
      `<text x="${x}" y="${y}" font-size="7" fill="#172033">${ProjectModel.escapeHTML(s)}</text>`;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -25 ${span + 40} ${total + 60}" width="100%"><rect x="-20" y="-25" width="${span + 40}" height="${total + 60}" fill="white"/>`;
    const axis = ["front", "back"].includes(side) ? "x" : "y",
      other = axis === "x" ? "y" : "x";
    const ws = ProjectModel.walls(p).filter(
      (w) =>
        cut === null ||
        (Math.min(w.a[other], w.b[other]) <= cut &&
          Math.max(w.a[other], w.b[other]) >= cut),
    );
    for (const w of ws) {
      if (cut !== null) {
        const delta = w.b[other] - w.a[other];
        if (Math.abs(delta) < 1e-6) {
          if (Math.abs(w.a[other] - cut) > 1e-4) continue;
        } else {
          const t = (cut - w.a[other]) / delta,
            q = w.a[axis] + (w.b[axis] - w.a[axis]) * t;
          const along = t * w.length,
            open = w.openings
              .filter((o) => along >= o.start && along <= o.end)
              .sort((a, b) => a.sill - b.sill);
          let y = 0;
          for (const o of open) {
            if (o.sill > y)
              s += `<rect x="${q - w.thickness / 2}" y="${total - w.floor * height - o.sill}" width="${w.thickness}" height="${o.sill - y}" fill="#475569"/>`;
            y = Math.max(y, o.sill + o.height);
          }
          if (y < height)
            s += `<rect x="${q - w.thickness / 2}" y="${total - (w.floor + 1) * height}" width="${w.thickness}" height="${height - y}" fill="#475569"/>`;
          continue;
        }
      }
      const x = Math.min(w.a[axis], w.b[axis]),
        width = Math.abs(w.b[axis] - w.a[axis]);
      if (width < 0.01) continue;
      s += `<rect x="${x}" y="${total - (w.floor + 1) * height}" width="${width}" height="${height}" fill="#e2e8f0" fill-opacity=".15" stroke="#64748b" stroke-width=".6"/>`;
      for (const o of w.openings) {
        const a = this.point(w, o.start),
          b = this.point(w, o.end);
        s += `<rect x="${Math.min(a[axis], b[axis])}" y="${total - w.floor * height - o.sill - o.height}" width="${Math.abs(a[axis] - b[axis])}" height="${o.height}" fill="${o.type === "window" ? "#bae6fd" : "white"}" stroke="#334155" stroke-width=".6"/>`;
      }
    }
    for (let f = 0; f <= p.floorCount; f++)
      s +=
        `<line x1="0" y1="${total - f * height}" x2="${span}" y2="${total - f * height}" stroke="#334155"/>` +
        text(2, total - f * height - 3, "Level " + f);
    return (
      s +
      text(
        0,
        -10,
        cut === null
          ? side + " elevation · projected wall outlines"
          : `Section · ${other.toUpperCase()} = ${cut} in`,
      ) +
      `</svg>`
    );
  },
  printSet() {
    PlanningUI.run(() => {
      const p = ProjectState.capture(),
        cut = PlanningUI.num("sheet-cut"),
        h = ProjectModel.inches(p.plot.inH, p.unit);
      if (cut < 0 || cut > h)
        throw Error("Section must be within the buildable depth");
      const selected = Object.fromEntries(
        ["plans", "elevations", "section", "schedules", "legend"].map((k) => [
          k,
          document.getElementById("sheet-" + k).checked,
        ]),
      );
      const sheets = [];
      if (selected.plans)
        for (let f = 0; f < p.floorCount; f++)
          sheets.push({
            title: "Plan · Floor " + f,
            html: DrawingExport.svg(f),
          });
      if (selected.elevations)
        for (const side of ["front", "back", "left", "right"])
          sheets.push({
            title: side + " elevation",
            html: this.elevation(p, side),
          });
      if (selected.section)
        sheets.push({
          title: "Section A–A",
          html: this.elevation(p, "front", cut),
        });
      if (selected.schedules)
        sheets.push({
          title: "Room & opening schedules",
          html: `<table><tr><th>Floor</th><th>Room</th><th>Clear sq ft</th><th>Openings</th></tr>${p.elements
            .map((e, i) =>
              !e.isFurniture
                ? `<tr><td>${e.floor}</td><td>${ProjectModel.escapeHTML(e.customName || e.type)}</td><td>${((PlanningModel.clear(p, e).area || 0) / 144).toFixed(2)}</td><td>${p.fixtures
                    .filter((f) => f.roomId === i)
                    .map((f) => `${f.type} ${f.size}×${f.height} in`)
                    .join(", ")}</td></tr>`
                : "",
            )
            .join("")}</table>`,
        });
      if (selected.legend)
        sheets.push({
          title: "Legend & revisions",
          html:
            "<p>Solid grey: walls · dashed grey: furniture · blue: windows and water supply · amber: doors/electrical · red: revision annotations.</p><p>Room bounds follow wall centerlines. Elevations project all wall outlines and may include internal walls. Review sections for overhead clearance.</p>" +
            p.planning.annotations
              .map(
                (a) =>
                  `<p>Floor ${a.floor}: ${ProjectModel.escapeHTML(a.text)}</p>`,
              )
              .join(""),
        });
      if (!sheets.length) throw Error("Select at least one sheet");
      this.openSheets(p, sheets);
    });
  },
  openSheets(p, sheets) {
    const popup = window.open("", "_blank");
    if (!popup)
      return StudioUI.message("Allow pop-ups to open drawing sheets.", "error");
    popup.document.write(
      `<!doctype html><html><head><title>${ProjectModel.escapeHTML(p.name)}</title><style>@page{size:A3 landscape;margin:12mm}@page A4{size:A4 landscape;margin:12mm}@page A3{size:A3 landscape;margin:12mm}body{font:12px Arial;color:#172033}section{break-after:page}section:last-child{break-after:auto}svg{max-width:100%;max-height:215mm}table{border-collapse:collapse;width:100%}td,th{border:1px solid #94a3b8;padding:5px}header{border-bottom:1px solid #334155;display:flex;justify-content:space-between}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print / Save PDF</button>${sheets.map((s, i) => `<section style="page:${s.paper === "A4" ? "A4" : "A3"}"><header><h2>${ProjectModel.escapeHTML(p.name)} · ${ProjectModel.escapeHTML(s.title)}</h2><span>${i + 1}/${sheets.length} · ${ProjectModel.escapeHTML(p.author)}</span></header>${s.html}</section>`).join("")}</body></html>`,
    );
    popup.document.close();
  },
};
WallEngine.clearDimensions = function (e) {
  return PlanningModel.clear(ProjectState.capture(), e);
};
WallEngine.render2D = () => PlanningDrawing.wall2D();
WallEngine.build3D = (...args) => PlanningDrawing.wall3D(...args);
const planningRenderFixtures = renderFixtures;
renderFixtures = () => PlanningDrawing.opening2D();
const planningUpdateCanvas = updateCanvas;
updateCanvas = function (force = true) {
  planningUpdateCanvas(force);
  if (PlanningUI.ready) PlanningDrawing.render();
};
// Polygon room floor meshes replace the rectangular floors while retaining object IDs.
const planningBuildRooms = build3DRooms;
build3DRooms = function (SCALE, I, WALL_HEIGHT, real, options = {}) {
  planningBuildRooms(SCALE, I, WALL_HEIGHT, real, options);
  elements
    .filter((e) => e.points && (!options.ids || options.ids.has(e.id)))
    .forEach((e) => {
      const group = Engine3D.elementObjects.get(e.id);
      if (!group) return;
      const floorMaterial = group.children[0]?.material;
      if (floorMaterial) {
        floorMaterial.side = THREE.DoubleSide;
        floorMaterial.needsUpdate = true;
      }
      group.children.slice().forEach((c) => {
        group.remove(c);
        c.geometry?.dispose();
      });
      const shape = new THREE.Shape(
          e.points.map((q) => new THREE.Vector2(q.x * SCALE, -q.y * SCALE)),
        ),
        mesh = new THREE.Mesh(
          new THREE.ShapeGeometry(shape),
          floorMaterial ||
            new THREE.MeshStandardMaterial({
              color: e.customColor || "#cbd5e1",
              side: THREE.DoubleSide,
            }),
        );
      mesh.rotation.x = -Math.PI / 2;
      mesh.userData = { ...group.userData };
      group.position.set(
        I.x + e.x * SCALE,
        e.floor * WALL_HEIGHT + SCALE,
        I.z + e.y * SCALE,
      );
      group.scale.set(1, 1, 1);
      group.add(mesh);
    });
  if (!ProjectState.meta.planning.layers.rooms.visible)
    for (const [eid, g] of Engine3D.elementObjects)
      if (!elements.find((e) => e.id === eid)?.isFurniture) g.visible = false;
  for (const [eid, g] of Engine3D.elementObjects)
    if (elements.find((e) => e.id === eid)?.isFurniture)
      g.visible = ProjectState.meta.planning.layers.furniture.visible;
  Engine3D.buildingGroup.children
    .filter((g) => g.userData.isWall)
    .forEach(
      (g) => (g.visible = ProjectState.meta.planning.layers.walls.visible),
    );
};
// Add isolated drawn walls even to an otherwise empty project.
const planningGenerate3D = generate3DModel;
generate3DModel = function () {
  planningGenerate3D();
  if (!elements.length) Engine3D.elementObjects = new Map();
  if (!Engine3D.buildingGroup) return;
  const sig = JSON.stringify({
    planning: ProjectState.meta.planning,
    walls: ProjectState.meta.wallOverrides,
    elements,
    fixtures,
  });
  if (Engine3D.planningSignature !== sig) {
    Engine3D.planningSignature = sig;
    if (!elements.length && ProjectState.meta.planning.walls.length) {
      const { SCALE, I, WALL_HEIGHT } = get3DEnvironmentParams();
      Engine3D.buildingGroup.children
        .filter((c) => c.userData.isWall)
        .forEach((c) => Engine3D.buildingGroup.remove(c));
      PlanningDrawing.wall3D(SCALE, I, WALL_HEIGHT);
    }
    Engine3D.needsRender = true;
  }
};
// Stable model-based opening meshes work on angled edges, too.
build3DFixtures = function (SCALE, I, WALL_HEIGHT, real, options = {}) {
  const p = ProjectState.capture();
  p.fixtures.filter(f => !options.ids || options.ids.has(f.id)).forEach((f) => {
    const s = PlanningModel.openingSegment(p, f),
      g = new THREE.Group(),
      width = f.size * SCALE,
      height = f.height * SCALE,
      depth = 2 * SCALE,
      frame = 2 * SCALE,
      mat = getCachedSolidMaterial(0x334155, 1),
      panelmat = getCachedSolidMaterial(
        f.type === "window" ? 0x7dd3fc : 0x94623a,
        f.type === "window" ? 0.4 : 1,
      );
    const box = (w, h, d, x, y, z, m) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      g.add(mesh);
      return mesh;
    };
    box(frame, height, depth, -width / 2 + frame / 2, height / 2, 0, mat);
    box(frame, height, depth, width / 2 - frame / 2, height / 2, 0, mat);
    box(width, frame, depth, 0, height - frame / 2, 0, mat);
    if (f.type === "window") box(width, frame, depth, 0, frame / 2, 0, mat);
    if (f.style !== "open") {
      const panel = box(
        Math.max(frame, width - 2 * frame),
        height - frame,
        Math.max(0.5 * SCALE, SCALE),
        0,
        height / 2,
        0,
        panelmat,
      );
      if (f.type === "door" && real && f.style !== "sliding") {
        const sign = f.handing === "right" ? -1 : 1;
        const pivot = new THREE.Group();
        g.remove(panel);
        pivot.position.set((-sign * width) / 2, 0, 0);
        panel.position.x = (sign * (width - 2 * frame)) / 2;
        pivot.rotation.y = (sign * (f.swing === "out" ? -1 : 1) * Math.PI) / 3;
        pivot.add(panel);
        g.add(pivot);
      }
      if (f.style === "sliding") panel.position.x = width / 4;
    }
    g.position.set(
      I.x + ((s.a.x + s.b.x) / 2) * SCALE,
      s.room.floor * WALL_HEIGHT + f.sill * SCALE,
      I.z + ((s.a.y + s.b.y) / 2) * SCALE,
    );
    g.rotation.y = -Math.atan2(s.u.y, s.u.x);
    g.userData = {
      floor: s.room.floor,
      roomIndex: f.roomId,
      isOpening: true,
      openingId: f.id,
    };
    g.traverse((c) => {
      if (c.isMesh) c.userData = { ...g.userData, isRoom: true };
    });
    g.visible = p.planning.layers.walls.visible;
    Engine3D.buildingGroup.add(g);
  });
};
// Model SVG: polygons and arbitrary walls replace the legacy rectangle-only pass.
DrawingExport.svg = function (floor, options = this.options) {
  const p = ProjectState.capture(),
    w = ProjectModel.inches(p.plot.inW, p.unit),
    h = ProjectModel.inches(p.plot.inH, p.unit),
    margin = 80,
    l = p.planning.layers,
    esc = ProjectModel.escapeHTML;
  const off = (k) => ProjectModel.inches(p.plot[k], p.unit),
    outer = [
      [-off("aL"), -off("aU")],
      [w + off("bR"), -off("bU")],
      [w + off("cR"), h + off("cD")],
      [-off("dL"), h + off("dD")],
    ],
    minX = Math.min(...outer.map((q) => q[0])) - margin,
    minY = Math.min(...outer.map((q) => q[1])) - margin,
    maxX = Math.max(...outer.map((q) => q[0])) + margin,
    maxY = Math.max(...outer.map((q) => q[1])) + margin;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" width="${((maxX - minX) * 25.4) / options.denominator}mm" height="${((maxY - minY) * 25.4) / options.denominator}mm"><rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" fill="white"/><polygon points="${outer.map((q) => q.join(",")).join(" ")}" fill="#f8fafc" stroke="#64748b"/><rect width="${w}" height="${h}" fill="none" stroke="#94a3b8"/>`;
  if (l.underlay.visible)
    s += p.planning.underlays
      .filter((u) => u.floor === floor)
      .map(
        (u) =>
          `<image x="${u.x}" y="${u.y}" width="${u.w}" height="${u.h}" href="${u.data}" opacity="${u.opacity}"/>`,
      )
      .join("");
  for (const e of p.elements.filter(
    (e) =>
      e.floor === floor && l[e.isFurniture ? "furniture" : "rooms"].visible,
  )) {
    const b = Selection.bounds(e),
      ps = e.points
        ? PlanningModel.points(e)
        : PlanningModel.points({ ...e, w: b.w, h: b.h });
    s += `<polygon points="${ps.map((q) => q.x + "," + q.y).join(" ")}" fill="${e.isFurniture ? "#e2e8f0" : "#f1f5f9"}" stroke="#94a3b8" ${e.isFurniture ? 'stroke-dasharray="3 2"' : ""}/>`;
    if (options.labels && !e.isFurniture)
      s += `<text x="${e.x + e.w / 2}" y="${e.y + e.h / 2}" text-anchor="middle" font-size="7" font-family="Arial">${esc(e.customName || e.type)}</text>`;
    if (options.dimensions && l.dimensions.visible && !e.isFurniture)
      s += `<text x="${e.x + e.w / 2}" y="${e.y - 8}" text-anchor="middle" font-size="6">${esc(options.units === "cm" ? (e.w * 2.54).toFixed(1) + " cm" : ProjectModel.display(e.w, "ftin"))}</text><text x="${e.x - 12}" y="${e.y + e.h / 2}" font-size="6">${esc(options.units === "cm" ? (e.h * 2.54).toFixed(1) + " cm" : ProjectModel.display(e.h, "ftin"))}</text>`;
    if (options.columns && !e.isFurniture)
      for (const q of ps)
        s += `<rect x="${q.x - 4.5}" y="${q.y - 4.5}" width="9" height="9" fill="#475569"/>`;
  }
  if (l.walls.visible)
    for (const wall of ProjectModel.walls(p).filter((w) => w.floor === floor))
      for (const [a, b] of PlanningDrawing.segments(wall, options.openings)) {
        const x = PlanningDrawing.point(wall, a),
          y = PlanningDrawing.point(wall, b);
        s += `<line x1="${x.x}" y1="${x.y}" x2="${y.x}" y2="${y.y}" stroke="#334155" stroke-width="${wall.thickness}"/>`;
      }
  if (options.openings && l.walls.visible)
    for (const f of p.fixtures.filter(
      (f) => p.elements[f.roomId].floor === floor,
    )) {
      const q = PlanningModel.openingSegment(p, f);
      s += `<line x1="${q.a.x}" y1="${q.a.y}" x2="${q.b.x}" y2="${q.b.y}" stroke="${f.type === "door" ? "#b45309" : "#0284c7"}" stroke-width="1.5"/>`;
      if (f.type === "door" && f.style !== "open" && f.style !== "sliding") {
        const shape = PlanningDrawing.doorSector(p, f);
        s += `<polygon points="${shape.poly.map((q) => q.x + "," + q.y).join(" ")}" fill="none" stroke="#b45309" stroke-width=".5"/>`;
      }
    }
  s += PlanningDrawing.overlaySVG(
    { ...p, planning: { ...p.planning, underlays: [] } },
    floor,
  );
  return (
    s +
    `<text x="${w / 2}" y="${minY + 20}" text-anchor="middle" font-family="Arial" font-size="8">${esc(p.compass)} ↑ · Floor ${floor} · 1:${options.denominator}</text></svg>`
  );
};
DrawingExport.schedule = function (floor) {
  const p = ProjectState.capture();
  return p.elements
    .filter((e) => e.floor === floor && !e.isFurniture)
    .map((e) => ({
      name: e.customName || e.type,
      w: e.w,
      h: e.h,
      area: PlanningModel.area(PlanningModel.points(e)) / 144,
      clearArea: (PlanningModel.clear(p, e).area || 0) / 144,
    }));
};
// Full DXF export uses the same arbitrary wall segments and service layers as SVG.
DrawingExport.dxf = function () {
  const p = ProjectState.capture(),
    factor = this.options.units === "cm" ? 2.54 : 1,
    code = this.options.units === "cm" ? 5 : 1;
  let s = `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n${code}\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
  const line = (a, b, layer) => {
    s += `0\nLINE\n8\n${layer}\n10\n${a.x * factor}\n20\n${-a.y * factor}\n30\n0\n11\n${b.x * factor}\n21\n${-b.y * factor}\n31\n0\n`;
  };
  const text = (q, label, layer) => {
    s += `0\nTEXT\n8\n${layer}\n10\n${q.x * factor}\n20\n${-q.y * factor}\n30\n0\n40\n${6 * factor}\n1\n${String(
      label,
    )
      .replace(/[\r\n]/g, " ")
      .replace(/[^\x20-\x7e]/g, "?")}\n`;
  };
  const l = p.planning.layers;
  for (const f of this.floors()) {
    if (l.walls.visible)
      for (const w of ProjectModel.walls(p).filter((w) => w.floor === f))
        for (const [a, b] of PlanningDrawing.segments(w, this.options.openings))
          line(
            PlanningDrawing.point(w, a),
            PlanningDrawing.point(w, b),
            `F${f}_WALLS`,
          );
    for (const e of p.elements.filter((e) => e.floor === f)) {
      if (!l[e.isFurniture ? "furniture" : "rooms"].visible) continue;
      if (e.isFurniture) {
        const b = Selection.bounds(e),
          ps = PlanningModel.points({ ...e, w: b.w, h: b.h });
        ps.forEach((q, i) =>
          line(q, ps[(i + 1) % ps.length], `F${f}_FURNITURE`),
        );
      }
      if (this.options.labels && !e.isFurniture)
        text(
          { x: e.x + e.w / 2, y: e.y + e.h / 2 },
          e.customName || e.type,
          `F${f}_LABELS`,
        );
      if (this.options.dimensions && l.dimensions.visible && !e.isFurniture)
        text(
          { x: e.x, y: e.y - 8 },
          `${ProjectModel.display(e.w, "ftin")} x ${ProjectModel.display(e.h, "ftin")}`,
          `F${f}_DIMENSIONS`,
        );
    }
    if (this.options.openings && l.walls.visible)
      p.fixtures
        .filter((o) => p.elements[o.roomId].floor === f)
        .forEach((o) => {
          const seg = PlanningModel.openingSegment(p, o);
          line(seg.a, seg.b, `F${f}_${o.type.toUpperCase()}S`);
        });
    if (l.dimensions.visible)
      p.planning.measurements
        .filter((m) => m.floor === f)
        .forEach((m) => {
          line(m.a, m.b, `F${f}_DIMENSIONS`);
          text(
            { x: (m.a.x + m.b.x) / 2, y: (m.a.y + m.b.y) / 2 },
            m.label + " " + PlanningUI.length(PlanningModel.distance(m.a, m.b)),
            `F${f}_DIMENSIONS`,
          );
        });
    if (l.annotations.visible)
      p.planning.annotations
        .filter((a) => a.floor === f)
        .forEach((a) => {
          text(a, a.text, `F${f}_ANNOTATIONS`);
          if (a.target) line(a, a.target, `F${f}_ANNOTATIONS`);
          if (a.kind === "cloud") {
            const pts = PlanningModel.points(a);
            pts.forEach((q, i) =>
              line(q, pts[(i + 1) % pts.length], `F${f}_ANNOTATIONS`),
            );
          }
        });
    p.planning.services
      .filter((x) => x.floor === f && l[x.layer].visible)
      .forEach((x) => {
        x.points
          .slice(1)
          .forEach((q, i) =>
            line(x.points[i], q, `F${f}_${x.layer.toUpperCase()}`),
          );
        text(
          x.points[0],
          x.label + " " + x.circuit,
          `F${f}_${x.layer.toUpperCase()}`,
        );
      });
  }
  const w = ProjectModel.inches(p.plot.inW, p.unit),
    h = ProjectModel.inches(p.plot.inH, p.unit),
    v = (k) => ProjectModel.inches(p.plot[k], p.unit),
    outer = [
      { x: -v("aL"), y: -v("aU") },
      { x: w + v("bR"), y: -v("bU") },
      { x: w + v("cR"), y: h + v("cD") },
      { x: -v("dL"), y: h + v("dD") },
    ];
  outer.forEach((q, i) => line(q, outer[(i + 1) % outer.length], "PLOT"));
  s += "0\nENDSEC\n0\nEOF\n";
  NavActionEngine.downloadBlob(s, "ArchCAD_Drawing.dxf", "application/dxf");
};
StudioUI.compareVersion = async function (id) {
  try {
    const v = (await StorageEngine.versions()).find((v) => v.id === id);
    if (!v) return;
    const current = ProjectState.capture(),
      old = ProjectModel.normalize(v.project),
      ids = new Map(old.elements.map((e) => [e.id, e]));
    const added = current.elements.filter((e) => !ids.has(e.id)),
      removed = old.elements.filter(
        (e) => !current.elements.some((n) => n.id === e.id),
      ),
      changed = current.elements.filter(
        (e) =>
          ids.has(e.id) && JSON.stringify(e) !== JSON.stringify(ids.get(e.id)),
      );
    const w = ProjectModel.inches(current.plot.inW, current.unit),
      h = ProjectModel.inches(current.plot.inH, current.unit);
    const shape = (e, c) =>
      `<polygon points="${PlanningModel.points(e)
        .map((q) => q.x + "," + q.y)
        .join(
          " ",
        )}" fill="${c}" fill-opacity=".15" stroke="${c}" stroke-width="2"/>`;
    this.dialog(
      "Compare with " + v.label,
      `<p>${added.length} added · ${removed.length} removed · ${changed.length} changed</p><p>Green: added · red dashed: previous geometry · amber: changed. Floor ${currentFloor}.</p><svg class="planning-preview" viewBox="-10 -10 ${w + 20} ${h + 20}">${old.elements
        .filter((e) => e.floor === currentFloor)
        .map((e) => shape(e, "#fb7185"))
        .join("")}${current.elements
        .filter((e) => e.floor === currentFloor)
        .map((e) =>
          shape(
            e,
            added.includes(e)
              ? "#4ade80"
              : changed.includes(e)
                ? "#fbbf24"
                : "#94a3b8",
          ),
        )
        .join(
          "",
        )}</svg><p>Openings changed: ${JSON.stringify(old.fixtures) !== JSON.stringify(current.fixtures) ? "Yes" : "No"} · Planning overlays/settings changed: ${JSON.stringify(old.planning) !== JSON.stringify(current.planning) ? "Yes" : "No"}</p>${[
        ["Added", added],
        ["Removed", removed],
        ["Changed", changed],
      ]
        .map(
          ([n, list]) =>
            `<strong>${n}</strong><ul>${list.map((e) => `<li>${ProjectModel.escapeHTML(e.customName || e.type)}</li>`).join("") || "<li>None</li>"}</ul>`,
        )
        .join("")}`,
    );
  } catch (e) {
    StudioUI.message(e.message, "error");
  }
};
document.addEventListener("DOMContentLoaded", () => {
  const old = StudioUI.exportDialog;
  StudioUI.exportDialog = function () {
    old.call(this);
    document
      .querySelector("#studio-dialog .studio-dialog-body")
      .insertAdjacentHTML(
        "beforeend",
        PlanningUI.button(
          "Coordinated drawing set",
          "PlanningDrawing.sheetDialog()",
        ),
      );
  };
});
const planningLegacyStairs = buildStaircase;
buildStaircase = function (e, center, WALL_HEIGHT, colliding) {
  if (!e.stairDesign)
    return planningLegacyStairs(e, center, WALL_HEIGHT, colliding);
  const { SCALE } = get3DEnvironmentParams(),
    d = PlanningModel.stairs(e),
    g = new THREE.Group(),
    local = new THREE.Group(),
    mat = getCachedSolidMaterial(
      e.customColor ? parseInt(e.customColor.slice(1), 16) : 0x94a3b8,
      1,
    ),
    sideways = ["left", "right"].includes(e.dir),
    width = (sideways ? e.h : e.w) * SCALE,
    depth = (sideways ? e.w : e.h) * SCALE,
    riser = d.actual * SCALE,
    tread = d.tread * SCALE,
    landing = d.landing * SCALE,
    style = e.stairStyle || "straight",
    half = Math.ceil(d.count / 2),
    flightWidth =
      style === "u-shape"
        ? (width - 4 * SCALE) / 2
        : Math.min(width, 36 * SCALE);
  const step = (x, z, w, l, height) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, l), mat);
    mesh.position.set(x + w / 2, height / 2, z + l / 2);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    local.add(mesh);
  };
  if (style === "straight") {
    for (let i = 0; i < d.count; i++)
      step(0, i * tread, width, tread, (i + 1) * riser);
  } else if (style === "u-shape") {
    for (let i = 0; i < half; i++)
      step(0, i * tread, flightWidth, tread, (i + 1) * riser);
    step(0, half * tread, width, landing, half * riser);
    for (let i = half; i < d.count; i++)
      step(
        width - flightWidth,
        (d.count - i - 1) * tread,
        flightWidth,
        tread,
        (i + 1) * riser,
      );
  } else {
    for (let i = 0; i < half; i++)
      step(0, i * tread, flightWidth, tread, (i + 1) * riser);
    step(0, half * tread, landing, landing, half * riser);
    for (let i = half; i < d.count; i++)
      step(
        landing + (i - half) * tread,
        half * tread,
        tread,
        flightWidth,
        (i + 1) * riser,
      );
  }
  const origin = {
    x: center.x - center.width / 2,
    z: center.z - center.depth / 2,
  };
  if (e.dir === "right") {
    local.rotation.y = -Math.PI / 2;
    local.position.x = 0;
    local.position.z = center.depth;
  } else if (e.dir === "left") {
    local.rotation.y = Math.PI / 2;
    local.position.x = center.width;
  } else if (e.dir === "down") {
    local.rotation.y = Math.PI;
    local.position.x = center.width;
    local.position.z = center.depth;
  }
  g.add(local);
  g.position.set(origin.x, e.floor * WALL_HEIGHT, origin.z);
  return g;
};
// Editing a fixture on a locked wall must not bypass the shared transaction guard.
const planningFixtureDrag = startDragFixture;
startDragFixture = function (e, i) {
  if (
    PlanningUI.data.layers.walls.locked ||
    elements[fixtures[i]?.roomId]?.locked
  )
    return;
  return planningFixtureDrag(e, i);
};
const planningSandbox3D = RoomStudio.build3DScene;
RoomStudio.build3DScene = function () {
  planningSandbox3D.call(this);
  if (!this.scene3D || !this.activeRoom?.points) return;
  const localRoom = { ...this.activeRoom, x: 0, y: 0, floor: 0 },
    p = ProjectModel.normalize({
      elements: [localRoom],
      fixtures: this.sandboxDoorsWindows.map((f) => ({
        ...f,
        roomId: 0,
        roomUid: localRoom.id,
      })),
      wallSettings: ProjectState.meta.wallSettings,
    });
  for (const obj of this.scene3D.children.slice()) {
    if (obj.isLight || obj.userData?.isFurniture) continue;
    this.scene3D.remove(obj);
    obj.traverse((c) => {
      c.geometry?.dispose();
      if (c.material) {
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach((m) => m.dispose());
      }
    });
  }
  const shape = new THREE.Shape(
      localRoom.points.map((q) => new THREE.Vector2(q.x, -q.y)),
    ),
    floor = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshStandardMaterial({
        color: localRoom.customColor || "#cbd5e1",
        side: THREE.DoubleSide,
      }),
    );
  floor.rotation.x = -Math.PI / 2;
  this.scene3D.add(floor);
  const height = p.wallSettings.height,
    mat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      opacity: 0.35,
      transparent: true,
      side: THREE.DoubleSide,
    });
  for (const w of ProjectModel.walls(p)) {
    const splits = [
      ...new Set([0, w.length, ...w.openings.flatMap((o) => [o.start, o.end])]),
    ].sort((a, b) => a - b);
    const add = (a, b, lo, hi) => {
      if (hi - lo < 0.001 || b - a < 0.001) return;
      const mid = PlanningDrawing.point(w, (a + b) / 2),
        m = new THREE.Mesh(
          new THREE.BoxGeometry(b - a, hi - lo, w.thickness),
          mat,
        );
      m.position.set(mid.x, (lo + hi) / 2, mid.y);
      m.rotation.y = -Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x);
      this.scene3D.add(m);
    };
    for (let i = 0; i < splits.length - 1; i++) {
      const a = splits[i],
        b = splits[i + 1],
        open = w.openings
          .filter((o) => (a + b) / 2 > o.start && (a + b) / 2 < o.end)
          .sort((a, b) => a.sill - b.sill);
      let top = 0;
      for (const o of open) {
        add(a, b, top, o.sill);
        top = Math.max(top, o.sill + o.height);
      }
      add(a, b, top, height);
    }
  }
};
