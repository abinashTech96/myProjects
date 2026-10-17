/* Shared standalone and editor drawings for professional building objects. */
const WorkbenchDrawing = {
  e: ProjectModel.escapeHTML,
  clashes: [],
  markup: null,
  polygonsSVG(records) {
    const points = records.flatMap((r) => r.points || []);
    if (!points.length) return "<p>No geometry to preview.</p>";
    const x = Math.min(...points.map((q) => q.x)),
      y = Math.min(...points.map((q) => q.y)),
      w = Math.max(...points.map((q) => q.x)) - x,
      h = Math.max(...points.map((q) => q.y)) - y,
      pad = Math.max(10, Math.max(w, h) / 20);
    return `<svg class="wb-preview" xmlns="http://www.w3.org/2000/svg" viewBox="${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}"><rect x="${x - pad}" y="${y - pad}" width="${w + pad * 2}" height="${h + pad * 2}" fill="#0f1c2e"/>${records.map((r, i) => `<polygon points="${r.points.map((q) => q.x + "," + q.y).join(" ")}" fill="${r.color || "#155e75"}" fill-opacity=".45" stroke="#67e8f9" stroke-width="1" vector-effect="non-scaling-stroke"/>${r.label ? `<text x="${r.points.reduce((s, q) => s + q.x, 0) / r.points.length}" y="${r.points.reduce((s, q) => s + q.y, 0) / r.points.length}" font-size="${Math.max(w, h) / 45}" text-anchor="middle" fill="#fff">${this.e(r.label)}</text>` : ""}`).join("")}</svg>`;
  },
  siteSVG(p) {
    const records = [
      { points: WorkbenchModel.boundary(p), color: "#334155" },
      ...DesignModel.paths(WorkbenchModel.buildable(p)).map((points) => ({
        points,
        color: "#166534",
      })),
      ...p.elements
        .filter((e) => !e.isFurniture)
        .map((e) => ({
          points: PlanningModel.points(e),
          label: e.customName || e.type,
          color: WorkbenchModel.insideSite(p, e) ? "#0e7490" : "#be123c",
        })),
    ];
    return this.polygonsSVG(records);
  },
  cutSVG(result) {
    const { stock, sheets } = result,
      gap = stock.w * 0.15,
      pad = stock.w * 0.1;
    return `<svg class="wb-preview" xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad * 2} ${(stock.w + gap) * Math.max(1, sheets.length)} ${stock.h + pad * 3}"><rect x="${-pad}" y="${-pad * 2}" width="${(stock.w + gap) * Math.max(1, sheets.length)}" height="${stock.h + pad * 3}" fill="white"/>${sheets.map((s, i) => `<g transform="translate(${i * (stock.w + gap)},0)"><text y="${-pad / 2}" font-size="${stock.w / 14}" fill="#172033">Blank ${s.id}</text><rect width="${stock.w}" height="${stock.h}" fill="#f1f5f9" stroke="#334155" stroke-width=".1"/>${s.pieces.map((p, n) => `<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${["#bae6fd", "#bbf7d0", "#fed7aa"][n % 3]}" stroke="#334155" stroke-width=".1"/><text x="${p.x + p.w / 2}" y="${p.y + p.h / 2}" font-size="${stock.w / 22}" text-anchor="middle" fill="#172033">${p.w.toFixed(2)}×${p.h.toFixed(2)}</text>`).join("")}</g>`).join("")}</svg>`;
  },
  parts(p, floor) {
    const W = WorkbenchModel,
      w = W.data(p),
      e = this.e;
    let s = "";
    const polygon = (ps, color = "#0e7490", label = "") =>
      `<polygon points="${ps.map((q) => q.x + "," + q.y).join(" ")}" fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width=".8"/>${label ? `<text x="${ps[0].x + 3}" y="${ps[0].y + 8}" font-size="6" fill="${color}">${e(label)}</text>` : ""}`;
    if (w.site.boundary.length) {
      s += `<polygon points="${w.site.boundary.map((q) => q.x + "," + q.y).join(" ")}" fill="none" stroke="#0ea5e9" stroke-dasharray="6 3"/>`;
      for (const ps of DesignModel.paths(W.buildable(p)))
        s += `<polygon points="${ps.map((q) => q.x + "," + q.y).join(" ")}" fill="none" stroke="#16a34a" stroke-dasharray="3 3"/>`;
    }
    for (const member of w.structure.filter(
      (r) => r.floor === floor && !r.hidden,
    ))
      s += polygon(
        member.points || PlanningModel.points(member),
        "#475569",
        member.kind,
      );
    for (const r of w.ramps.filter((r) => r.floor === floor && !r.hidden)) {
      const g = W.ramp(r);
      for (const part of [...g.flights, ...g.landings])
        s += polygon(
          part.points,
          "#7c3aed",
          part.index !== undefined ? "Ramp " + (part.index + 1) : "Landing",
        );
    }
    for (const shaft of w.shafts.filter(
      (s) => floor >= s.from && floor <= s.to && !s.hidden,
    ))
      s += polygon(
        shaft.points || PlanningModel.points(shaft),
        "#b45309",
        shaft.kind + " shaft",
      );
    for (const v of w.voids.filter((v) => floor > v.from && floor <= v.to))
      s += polygon(v.points, "#dc2626", v.name);
    for (const l of w.interiors.filter(
      (l) => p.elements.find((e) => e.id === l.room)?.floor === floor,
    ))
      for (const i of l.items.filter((i) => !i.hidden))
        s += polygon(
          PlanningModel.points(i),
          (i.base || 0) > 36 ? "#7c3aed" : "#0369a1",
          i.type,
        );
    for (const o of w.outdoors.filter((o) => !o.hidden))
      s += polygon(
        o.points,
        { garden: "#16a34a", path: "#a16207", tank: "#0284c7" }[o.kind] ||
          "#475569",
        o.name,
      );
    for (const service of w.services3d.filter(
      (s) => s.floor === floor && !s.hidden,
    )) {
      s += `<polyline points="${service.points.map((q) => q.x + "," + q.y).join(" ")}" fill="none" stroke="${service.kind === "plumbing" ? "#0284c7" : "#d97706"}" stroke-width="${Math.max(1, service.diameter)}"/>`;
      for (const q of service.points)
        s += `<text x="${q.x + 3}" y="${q.y - 3}" font-size="6" fill="#475569">z ${q.z.toFixed(1)}</text>`;
    }
    for (const m of w.markups.filter((m) => m.floor === floor)) {
      s += `<polyline points="${m.points.map((q) => q.x + "," + q.y).join(" ")}" fill="none" stroke="${m.color}" stroke-width="2"/>`;
      const end = m.points.at(-1),
        start = m.points.at(-2);
      if (m.kind === "arrow") {
        const a = Math.atan2(end.y - start.y, end.x - start.x),
          tip = [
            end,
            {
              x: end.x - 10 * Math.cos(a - 0.4),
              y: end.y - 10 * Math.sin(a - 0.4),
            },
            {
              x: end.x - 10 * Math.cos(a + 0.4),
              y: end.y - 10 * Math.sin(a + 0.4),
            },
          ];
        s += polygon(tip, m.color);
      }
      const label =
        m.kind === "measure"
          ? PlanningUI.length(PlanningModel.distance(m.points[0], end))
          : m.label;
      if (label)
        s += `<text x="${end.x + 4}" y="${end.y - 4}" font-size="8" fill="${m.color}">${e(label)}</text>`;
    }
    for (const issue of w.issues.filter(
      (i) => i.anchor.floor === floor && i.status !== "closed",
    ))
      s += `<circle cx="${issue.anchor.x}" cy="${issue.anchor.y}" r="5" fill="${issue.priority === "urgent" ? "#dc2626" : "#d97706"}"/><text x="${issue.anchor.x + 7}" y="${issue.anchor.y}" font-size="7" fill="#b45309">${e(issue.title)}</text>`;
    if (w.solar.enabled && floor === p.floorCount - 1)
      for (const panel of W.solarLayout(p).panels)
        s += polygon(panel.points, panel.shaded ? "#be123c" : "#2563eb");
    for (const row of this.clashes || [])
      s += `<circle cx="${row.point.x}" cy="${row.point.y}" r="8" fill="none" stroke="#e11d48" stroke-width="2"/>`;
    return s;
  },
  render() {
    if (!UI.elementContainer || !WorkbenchUI.data) return;
    let layer = document.getElementById("wb-drawing-layer");
    if (!layer)
      layer = PlanningDrawing.svgNode(
        "g",
        { id: "wb-drawing-layer" },
        UI.elementContainer,
      );
    const { I, SCALE } = Utils.getMetrics();
    layer.setAttribute("transform", `translate(${I.x} ${I.y}) scale(${SCALE})`);
    layer.style.pointerEvents = "none";
    layer.innerHTML = this.parts(ProjectState.capture(), currentFloor);
    if (this.markup?.points.length > 1)
      layer.innerHTML += `<polyline points="${this.markup.points.map((q) => q.x + "," + q.y).join(" ")}" fill="none" stroke="${this.markup.color}" stroke-width="2"/>`;
  },
  point(event) {
    const svg = UI.blueprint,
      q = svg.createSVGPoint();
    q.x = event.clientX;
    q.y = event.clientY;
    const p = q.matrixTransform(
        document.getElementById("viewport").getScreenCTM().inverse(),
      ),
      { I, SCALE } = Utils.getMetrics();
    return { x: (p.x - I.x) / SCALE, y: (p.y - I.y) / SCALE };
  },
  startMarkup() {
    this.markup = {
      id: ProjectModel.uid(),
      kind: WorkbenchUI.val("wb-markup-kind"),
      color: WorkbenchUI.val("wb-markup-color"),
      label: WorkbenchUI.val("wb-markup-label"),
      floor: currentFloor,
      points: [],
    };
    document.getElementById("studio-dialog").close();
    PlanningUI.setTool("select");
    StudioUI.message(
      this.markup.kind === "pen"
        ? "Drag to draw; release to save."
        : "Click two points on the plan.",
    );
  },
  finishMarkup() {
    if (!this.markup) return;
    const mark = this.markup;
    this.markup = null;
    if (mark.points.length >= 2)
      WorkbenchUI.change("Added review drawing markup", () =>
        WorkbenchUI.data.markups.push(mark),
      );
    this.render();
  },
  locate(anchor) {
    currentFloor = anchor.floor;
    const i = elements.findIndex((e) => e.id === anchor.objectId);
    if (i >= 0) PlanningUI.focusRoom(i);
    else {
      DesignUI.overlay = [
        {
          a: anchor,
          b: { x: anchor.x + 12, y: anchor.y + 12 },
          color: "#f59e0b",
        },
      ];
      document.getElementById("studio-dialog")?.close();
      AppEvents.triggerStateChange();
    }
  },
  detail(p, kind, id) {
    const W = WorkbenchModel,
      e = this.e,
      fmt = (n) => ProjectModel.display(n, StudioUI.unit),
      dim = (x1, y1, x2, y2, label) =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0369a1" stroke-width=".6"/><circle cx="${x1}" cy="${y1}" r="1" fill="#0369a1"/><circle cx="${x2}" cy="${y2}" r="1" fill="#0369a1"/><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 3}" text-anchor="middle" font-size="6" fill="#0369a1">${e(label)}</text>`;
    let body = "",
      width = 240,
      height = 180,
      note = "Coordination detail from project dimensions.";
    if (kind === "wall-assembly") {
      const a = W.data(p).assemblies[0];
      if (!a) throw Error("Create a wall assembly first");
      let x = 20;
      for (const l of a.layers) {
        const w = l.thickness * 8;
        body += `<rect x="${x}" y="30" width="${w}" height="100" fill="#cbd5e1" stroke="#334155" stroke-width=".5"/><text x="${x + w / 2}" y="${145 + (x % 3) * 8}" text-anchor="middle" font-size="5">${e(l.material)} ${e(fmt(l.thickness))}</text>`;
        x += w;
      }
      width = Math.max(width, x + 30);
      body += dim(
        20,
        20,
        x,
        20,
        fmt(a.layers.reduce((s, l) => s + l.thickness, 0)),
      );
      note = a.name;
    } else if (kind === "stair") {
      const element =
        p.elements.find((v) => v.id === id && v.type === "staircase") ||
        p.elements.find(
          (v) => v.type === "staircase" && W.data(p).stairs[v.id],
        );
      if (!element || !W.data(p).stairs[element.id])
        throw Error("Design/select a parametric staircase first");
      const g = W.stairs(W.data(p).stairs[element.id]);
      width = Math.max(240, g.count * 12 + 40);
      for (let i = 0; i < g.count; i++)
        body += `<rect x="${20 + i * 12}" y="${140 - (i + 1) * g.riser * 0.7}" width="12" height="${(i + 1) * g.riser * 0.7}" fill="#cbd5e1" stroke="#334155" stroke-width=".5"/>`;
      body += dim(
        10,
        140,
        10,
        140 - W.data(p).stairs[element.id].rise * 0.7,
        fmt(W.data(p).stairs[element.id].rise),
      );
      note = `${g.count} risers, ${fmt(g.riser)} actual rise; plan footprint ${fmt(g.width)} × ${fmt(g.depth)}. Section shows the unfolded sequence.`;
    } else if (kind === "opening") {
      const f =
        p.fixtures.find((f) => f.id === Workbench3D?.target?.id) ||
        p.fixtures[0];
      if (!f) throw Error("Add an opening first");
      const scale = Math.min(1.5, 140 / f.height),
        w = f.size * scale,
        h = f.height * scale,
        x = 50,
        y = 150 - h;
      width = Math.max(220, w + 100);
      body +=
        `<rect x="${x - 8}" y="${y - 8}" width="${w + 16}" height="${h + 16}" fill="#cbd5e1" stroke="#334155"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#0369a1"/>` +
        dim(x, 165, x + w, 165, fmt(f.size)) +
        dim(x + w + 20, 150, x + w + 20, y, fmt(f.height));
      note = `${f.tag || f.type}: sill ${fmt(f.sill)}, style ${f.style}, arch rise ${fmt(f.arch || 0)}.`;
    } else if (kind === "wetroom") {
      const l =
        W.data(p).interiors.find((l) => l.room === id) ||
        W.data(p).interiors.find((l) => l.kind === "bathroom");
      if (!l) throw Error("Create a bathroom layout first");
      const points = l.items.flatMap((i) => PlanningModel.points(i)),
        xmin = Math.min(...points.map((q) => q.x)),
        ymin = Math.min(...points.map((q) => q.y));
      for (const i of l.items) {
        const x = 20 + (i.x - xmin) * 0.7,
          y = 20 + (i.y - ymin) * 0.7;
        body += `<rect x="${x}" y="${y}" width="${i.w * 0.7}" height="${i.h * 0.7}" fill="#bae6fd" stroke="#0369a1"/><text x="${x + 2}" y="${y + 8}" font-size="5">${e(i.type)}</text>`;
        if (i.clearance)
          body += `<rect x="${x}" y="${y + i.h * 0.7}" width="${i.w * 0.7}" height="${i.clearance * 0.7}" fill="none" stroke="#16a34a" stroke-dasharray="3 2"/>`;
      }
      note =
        "Dashed bands are entered front clearances. Coordinate waste/supply routes in service views.";
    } else {
      const rail = W.data(p).facade.railHeight,
        thickness = 6,
        h = rail * 2;
      body =
        `<rect x="30" y="140" width="160" height="${thickness}" fill="#94a3b8" stroke="#334155"/><rect x="170" y="${140 - h}" width="6" height="${h}" fill="#475569"/><rect x="30" y="${140 - h}" width="6" height="${h}" fill="#475569"/><line x1="30" y1="${140 - h}" x2="176" y2="${140 - h}" stroke="#334155" stroke-width="3"/>` +
        dim(205, 140, 205, 140 - h, fmt(rail)) +
        dim(30, 155, 190, 155, "Slab edge");
      note =
        kind === "balcony"
          ? "Balcony rail and slab-edge coordination. Fixings require project-specific detailing."
          : "Parapet/edge-height coordination. Decorative facade geometry is shown in elevation views.";
    }
    return `<svg class="wb-preview" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height + 35}"><rect width="${width}" height="${height + 35}" fill="white"/><text x="10" y="12" font-size="9" fill="#172033">${e(kind)} · ${e(p.name)}</text>${body}<text x="10" y="${height + 12}" font-size="5" fill="#475569">${e(note)}</text></svg>`;
  },
};
const wbSVG = DrawingExport.svg;
DrawingExport.svg = function (floor, options = this.options) {
  return wbSVG
    .call(this, floor, options)
    .replace(
      "</svg>",
      WorkbenchDrawing.parts(ProjectState.capture(), floor) + "</svg>",
    );
};
const wbDraw = PlanningDrawing.render;
PlanningDrawing.render = function () {
  wbDraw.call(this);
  WorkbenchDrawing.render();
};
document.addEventListener("DOMContentLoaded", () => {
  const node = document.getElementById("blueprint");
  let dragging = false;
  node.addEventListener(
    "pointerdown",
    (e) => {
      const m = WorkbenchDrawing.markup;
      if (!m) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const q = WorkbenchDrawing.point(e);
      if (q.x < 0 || q.y < 0) return;
      m.points.push(q);
      dragging = m.kind === "pen";
      WorkbenchDrawing.render();
      if (m.kind !== "pen" && m.points.length === 2)
        WorkbenchDrawing.finishMarkup();
    },
    true,
  );
  node.addEventListener(
    "pointermove",
    (e) => {
      if (!dragging || !WorkbenchDrawing.markup) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const q = WorkbenchDrawing.point(e),
        ps = WorkbenchDrawing.markup.points;
      if (
        q.x >= 0 &&
        q.y >= 0 &&
        PlanningModel.distance(q, ps.at(-1)) > 2 &&
        ps.length < 2000
      ) {
        ps.push(q);
        WorkbenchDrawing.render();
      }
    },
    true,
  );
  document.addEventListener("pointerup", () => {
    if (dragging) {
      dragging = false;
      WorkbenchDrawing.finishMarkup();
    }
  });
  document.addEventListener("pointercancel", () => {
    dragging = false;
    WorkbenchDrawing.markup = null;
    WorkbenchDrawing.render();
  });
});
