/* Design workflows, precise editing, requirements and project review. */
const DesignUI = {
  get data() {
    return ProjectState.meta.design;
  },
  p() {
    return ProjectState.capture();
  },
  e: ProjectModel.escapeHTML,
  b: StudioUI.button.bind(StudioUI),
  field: PlanningUI.field.bind(PlanningUI),
  select: PlanningUI.select.bind(PlanningUI),
  val: PlanningUI.val.bind(PlanningUI),
  num: PlanningUI.num.bind(PlanningUI),
  run: PlanningUI.run.bind(PlanningUI),
  dialog: StudioUI.dialog.bind(StudioUI),
  commit(label, fn) {
    return PlanningUI.change(label, fn);
  },
  apply(p, label) {
    return this.commit(label, () => ProjectState.apply(p));
  },
  selected() {
    const list = Selection.indices();
    if (!list.length && elements[selectedElIndex]) return [selectedElIndex];
    return list;
  },
  roomOptions() {
    return elements.map((e) => [
      e.id,
      `${e.customName || e.type} · F${e.floor}`,
    ]);
  },
  wallOptions() {
    return ProjectModel.walls(this.p())
      .filter((w) => w.floor === currentFloor)
      .map((w) => [
        w.id,
        `${w.shared ? "Shared" : "Wall"} ${w.id.slice(-20)} · ${PlanningUI.length(w.length)}`,
      ]);
  },
  tools() {
    return [
      ["Build", "Connected wall editing", () => this.wallDialog()],
      ["Build", "Recognize / split rooms", () => this.topologyDialog()],
      ["Build", "Trim / extend / intersect", () => this.trimDialog()],
      ["Build", "Offset walls / boundaries", () => this.offsetDialog()],
      ["Build", "Mirror / arrays / exact move", () => this.transformDialog()],
      ["Build", "Curved walls / arches", () => this.curveDialog()],
      ["Build", "Geometric constraints", () => this.constraintDialog()],
      ["Build", "Construction guides", () => this.guidesDialog()],
      ["Inspect", "Design analysis", () => this.analysisDialog()],
      ["Inspect", "Furniture fit assistant", () => this.furnitureDialog()],
      ["Inspect", "Requirements & adjacency", () => this.requirementsDialog()],
      ["Inspect", "Accessibility routes", () => this.accessDialog()],
      ["Inspect", "Sun / neighbours / shadows", () => this.sunDialog()],
      ["Inspect", "Ventilation paths", () => this.ventilationDialog()],
      ["Inspect", "Parking manoeuvres", () => this.parkingDialog()],
      ["Inspect", "Project health", () => this.healthDialog()],
      ["Build", "Brief-based alternatives", () => this.builderDialog()],
      ["Build", "Repair / optimize selection", () => this.repairDialog()],
      ["Utilities", "Roof designer", () => this.roofDialog()],
      ["Utilities", "Ceiling plan", () => this.ceilingDialog()],
      ["Utilities", "Finish schedules", () => this.finishDialog()],
      ["Utilities", "Tile layout / cutting", () => this.tileDialog()],
      ["Utilities", "Opening schedules", () => this.openingSchedule()],
      ["Utilities", "Revision quantities", () => this.quantityDiffDialog()],
      ["Inspect", "Service clashes", () => this.clashDialog()],
      ["Utilities", "Sheet composer / sections", () => this.sheetDialog()],
      ["Inspect", "Drawing preflight", () => this.preflightDialog()],
      ["View", "Object explorer / schedules", () => this.explorerDialog()],
      ["View", "Workspace presets", () => this.workspaceDialog()],
      ["Utilities", "Recover deleted objects", () => this.trashDialog()],
      ["Utilities", "Project ZIP / SVG / IFC", () => this.exportDialog()],
      ["Utilities", "Import DXF", () => this.dxfDialog()],
      ["View", "Guided lessons", () => this.lessonDialog()],
      ["View", "Walkthrough presentation", () => this.presentationDialog()],
      ["Inspect", "AI design critique", () => this.critiqueDialog()],
      ["View", "Cloud / review / collaborate", () => DesignSync.dialog()],
    ];
  },
  init() {
    const oldTools = PlanningUI.tools,
      oldActions = PlanningUI.toolActions;
    PlanningUI.tools = () => [
      ...oldTools.call(PlanningUI),
      ...this.tools().map(([c, n]) => [c, n, "DesignUI"]),
    ];
    PlanningUI.toolActions = () => [
      ...oldActions.call(PlanningUI),
      ...this.tools().map((t) => t[2]),
    ];
    const status = document.createElement("button");
    status.id = "design-health";
    status.className = "studio-link";
    status.onclick = () => this.healthDialog();
    status.textContent = "Project health";
    document.querySelector(".studio-status").append(status);
    this.refresh();
    AppEvents.onStateChange(() => this.refresh());
    document
      .getElementById("blueprint")
      .addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "touch") return;
        const x = e.clientX,
          y = e.clientY;
        clearTimeout(this.longPress);
        this.longPress = setTimeout(() => {
          window.endDrag?.();
          PlanContextMenu.open({ clientX: x, clientY: y, target: e.target });
        }, 650);
        const cancel = () => {
          clearTimeout(this.longPress);
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", cancel);
          document.removeEventListener("pointercancel", cancel);
        };
        const move = (ev) => {
          if (Math.hypot(ev.clientX - x, ev.clientY - y) > 12) cancel();
        };
        document.addEventListener("pointerup", cancel);
        document.addEventListener("pointercancel", cancel);
        document.addEventListener("pointermove", move);
      });
    this.unitForms();
  },
  menu() {
    this.dialog(
      "Design workflows",
      `<p>All edits use project history. Inspect previews before applying model changes.</p><div class="design-tool-grid">${this.tools()
        .map((t, i) => this.b(t[1], `DesignUI.launch(${i})`))
        .join("")}</div>`,
    );
  },
  launch(i) {
    document.getElementById("studio-dialog")?.close();
    return this.tools()[i][2]();
  },
  refresh() {
    if (StudioUI.mode === "4d") return;
    if (!PlanningUI.ready) return;
    const p = this.p(),
      key = JSON.stringify({
        elements: p.elements,
        fixtures: p.fixtures,
        planning: p.planning,
        design: p.design,
      });
    if (this.cacheKey !== key) {
      this.cacheKey = key;
      this.analysis = DesignModel.analyze(p);
    }
    const button = document.getElementById("design-health");
    if (button)
      button.textContent = `Health · ${this.analysis.length} findings`;
    this.render();
  },
  render() {
    if (!UI.elementContainer) return;
    let layer = document.getElementById("design-layer");
    if (!layer)
      layer = PlanningDrawing.svgNode(
        "g",
        { id: "design-layer" },
        UI.elementContainer,
      );
    layer.innerHTML = "";
    layer.style.pointerEvents = "none";
    const { I, SCALE } = Utils.getMetrics(),
      to = (q) => ({ x: I.x + q.x * SCALE, y: I.y + q.y * SCALE }),
      line = (a, b, color, dash = "") => {
        a = to(a);
        b = to(b);
        PlanningDrawing.svgNode(
          "line",
          {
            x1: a.x,
            y1: a.y,
            x2: b.x,
            y2: b.y,
            stroke: color,
            "stroke-width": 1.5,
            "stroke-dasharray": dash,
          },
          layer,
        );
      };
    for (const g of this.data.guides.filter((g) => g.floor === currentFloor))
      line(g.a, g.b, "#c084fc", "8 5");
    for (const r of this.overlay || []) {
      if (r.points)
        r.points
          .slice(1)
          .forEach((q, i) => line(r.points[i], q, r.color || "#4ade80"));
      if (r.a && r.b) line(r.a, r.b, r.color || "#fb7185");
    }
    if (this.showShadows)
      for (const s of DesignModel.shadows(this.p()))
        for (const ring of DesignModel.paths(s.polygon)) {
          const ps = ring.map(to);
          PlanningDrawing.svgNode(
            "polygon",
            {
              points: ps.map((q) => q.x + "," + q.y).join(" "),
              fill: "#000",
              "fill-opacity": 0.3,
              stroke: "#64748b",
            },
            layer,
          );
        }
    if (this.tilePreview)
      for (const tile of this.tilePreview.tiles)
        for (const ring of DesignModel.paths(tile.geometry)) {
          const ps = ring.map(to);
          PlanningDrawing.svgNode(
            "polygon",
            {
              points: ps.map((q) => q.x + "," + q.y).join(" "),
              fill: "none",
              stroke: tile.full ? "#38bdf8" : "#fb923c",
              "stroke-width": 0.5,
            },
            layer,
          );
        }
    if (this.ceilingMode)
      for (const c of this.data.ceilings.filter(
        (c) => c.floor === currentFloor,
      )) {
        const q = to(c);
        PlanningDrawing.svgNode(
          "rect",
          {
            x: q.x,
            y: q.y,
            width: c.w * SCALE,
            height: c.h * SCALE,
            fill: "#7dd3fc",
            "fill-opacity": 0.1,
            stroke: "#7dd3fc",
            "stroke-dasharray": "4 3",
          },
          layer,
        );
      }
  },
  wallDialog() {
    this.dialog(
      "Connected wall editing",
      `${this.select("design-wall", "Wall", this.wallOptions(), "")}${this.field("wall-distance", "Move wall normal to its length", ProjectModel.display(6, StudioUI.unit))}${this.b("Move shared boundary", "DesignUI.moveWall()", "primary")}<p>Both adjoining room boundaries move together. Partial edges require vertex editing. Positive distance follows the wall’s left normal.</p>${this.b("Push / pull wall face", "DesignUI.moveWall()")}`,
    );
  },
  moveWall() {
    this.run(() =>
      this.apply(
        DesignModel.moveWall(
          this.p(),
          this.val("design-wall"),
          PlanningUI.parse(this.val("wall-distance")),
        ),
        "Moved connected wall",
      ),
    );
  },
  topologyDialog() {
    const p = this.p();
    let preview, error;
    try {
      preview = DesignModel.recognize(p, currentFloor);
    } catch (e) {
      error = e.message;
    }
    this.pendingTopology = preview;
    this.dialog(
      "Recognize rooms and partitions",
      `<label><input type="checkbox" ${this.data.autoRooms ? "checked" : ""} onchange="DesignUI.commit('Changed automatic room recognition',()=>DesignUI.data.autoRooms=this.checked)">Recognize closed rooms after wall drawing</label><p>Intersecting edges are split into a planar wall graph. Existing room types and openings are mapped to the resulting faces. Locked rooms are protected.</p>${preview ? PlanningDrawing.thumbnail(preview) : `<p>${this.e(error)}</p>`}${preview ? this.b("Apply recognized rooms", "DesignUI.applyTopology()", "primary") : ""}`,
    );
  },
  applyTopology() {
    if (this.pendingTopology)
      this.apply(this.pendingTopology, "Recognized closed rooms");
    document.getElementById("studio-dialog").close();
  },
  trimDialog() {
    const opts = PlanningUI.data.walls
      .filter((w) => w.floor === currentFloor)
      .map((w) => [w.id, w.id.slice(0, 8)]);
    this.dialog(
      "Trim, extend and intersect",
      `${this.select("trim-source", "Editable wall", opts, "")}${this.select("trim-target", "Boundary wall", opts, "")}${this.select("trim-mode", "Operation", ["extend", "trim", "split-intersection"], "extend")}${this.b("Preview intersection", "DesignUI.trimPreview()")}<div id="trim-preview"></div>`,
    );
  },
  trimPreview() {
    this.run(() => {
      const a = PlanningUI.data.walls.find(
          (w) => w.id === this.val("trim-source"),
        ),
        b = PlanningUI.data.walls.find((w) => w.id === this.val("trim-target"));
      if (!a || !b || a === b) throw Error("Choose distinct editable walls");
      const q = DesignModel.intersection(
        a.a,
        a.b,
        b.a,
        b.b,
        this.val("trim-mode") !== "split-intersection",
      );
      if (!q) throw Error("No non-parallel intersection");
      this.pendingTrim = { a: a.id, b: b.id, q, mode: this.val("trim-mode") };
      document.getElementById("trim-preview").innerHTML =
        `<p>X ${PlanningUI.length(q.x)}, Y ${PlanningUI.length(q.y)}</p>` +
        this.b("Apply", "DesignUI.trimApply()", "primary");
    });
  },
  trimApply() {
    const v = this.pendingTrim;
    this.commit("Trimmed / extended wall", () => {
      const w = PlanningUI.data.walls.find((w) => w.id === v.a);
      if (v.mode === "split-intersection") {
        if (v.q.t <= 0 || v.q.t >= 1)
          throw Error("Intersection is outside segment");
        PlanningUI.data.walls.push({
          ...w,
          id: ProjectModel.uid(),
          a: { x: v.q.x, y: v.q.y },
        });
        w.b = { x: v.q.x, y: v.q.y };
      } else {
        w.b = { x: v.q.x, y: v.q.y };
        delete w.curve;
      }
    });
  },
  offsetDialog() {
    this.dialog(
      "Offset geometry",
      `${this.select(
        "offset-wall",
        "Editable wall",
        PlanningUI.data.walls.map((w) => [w.id, w.id.slice(0, 10)]),
        "",
      )}${this.field("offset-distance", "Offset distance", ProjectModel.display(12, StudioUI.unit))}${this.b("Offset selected wall", "DesignUI.offsetWall()")}${this.b("Offset selected room boundary", "DesignUI.offsetRoom()")}<p>Room boundary offsets create construction wall loops. Positive values grow a closed outline.</p>`,
    );
  },
  offsetWall() {
    this.run(() => {
      const w = PlanningUI.data.walls.find(
        (w) => w.id === this.val("offset-wall"),
      );
      if (!w) throw Error("Choose a wall");
      const d = PlanningUI.parse(this.val("offset-distance")),
        l = PlanningModel.distance(w.a, w.b),
        dx = (-(w.b.y - w.a.y) / l) * d,
        dy = ((w.b.x - w.a.x) / l) * d;
      this.commit("Offset wall", () =>
        PlanningUI.data.walls.push({
          ...w,
          id: ProjectModel.uid(),
          a: { x: w.a.x + dx, y: w.a.y + dy },
          b: { x: w.b.x + dx, y: w.b.y + dy },
          curve: undefined,
        }),
      );
    });
  },
  offsetRoom() {
    this.run(() => {
      const e = elements[selectedElIndex];
      if (!e || e.isFurniture) throw Error("Select a room");
      const rings = DesignModel.offsetPath(
        PlanningModel.points(e),
        PlanningUI.parse(this.val("offset-distance")),
      );
      this.commit("Offset room boundary", () =>
        rings.forEach((r) =>
          r.forEach((a, i) =>
            PlanningUI.data.walls.push({
              id: ProjectModel.uid(),
              floor: e.floor,
              a,
              b: r[(i + 1) % r.length],
              thickness: ProjectState.meta.wallSettings.internal,
            }),
          ),
        ),
      );
    });
  },
  transformDialog() {
    this.dialog(
      "Mirror, arrays and exact movement",
      `${this.select("transform-mode", "Operation", ["move", "mirror-x", "mirror-y", "linear-array", "radial-array"], "move")}<div class="studio-field-grid">${this.field("transform-x", "X movement / center", 0)}${this.field("transform-y", "Y movement / center", 0)}${this.field("transform-count", "Total instances", 3, "number")}${this.field("transform-angle", "Total radial angle (degrees)", 180, "number")}</div>${this.b("Preview", "DesignUI.transformPreview()", "primary")}<div id="transform-preview"></div><p>Lengths follow display units. Arrays retain openings and create fresh IDs.</p>`,
    );
  },
  transformPreview() {
    this.run(() => {
      const ids = this.selected().map((i) => elements[i].id);
      if (!ids.length) throw Error("Select objects first");
      const mode = this.val("transform-mode"),
        x = PlanningUI.parse(this.val("transform-x")),
        y = PlanningUI.parse(this.val("transform-y")),
        count = Math.floor(this.num("transform-count")),
        angle = this.num("transform-angle");
      if (count < 2 || count > 50) throw Error("Choose 2–50 instances");
      const base = this.p();
      let next = structuredClone(base);
      if (mode === "move")
        next = DesignModel.transformSelection(base, ids, (q) => ({
          x: q.x + x,
          y: q.y + y,
        }));
      if (mode === "mirror-x")
        next = DesignModel.transformSelection(base, ids, (q) => ({
          x: 2 * x - q.x,
          y: q.y,
        }));
      if (mode === "mirror-y")
        next = DesignModel.transformSelection(base, ids, (q) => ({
          x: q.x,
          y: 2 * y - q.y,
        }));
      if (mode.includes("array"))
        for (let n = 1; n < count; n++) {
          const theta = (((angle * n) / (count - 1)) * Math.PI) / 180,
            transformed = DesignModel.transformSelection(base, ids, (q) =>
              mode === "linear-array"
                ? { x: q.x + x * n, y: q.y + y * n }
                : {
                    x:
                      x +
                      (q.x - x) * Math.cos(theta) -
                      (q.y - y) * Math.sin(theta),
                    y:
                      y +
                      (q.x - x) * Math.sin(theta) +
                      (q.y - y) * Math.cos(theta),
                  },
            ),
            map = new Map();
          for (const e of transformed.elements.filter((e) =>
            ids.includes(e.id),
          )) {
            const id = ProjectModel.uid();
            map.set(e.id, id);
            next.elements.push({ ...e, id, groupId: undefined });
          }
          for (const f of transformed.fixtures.filter((f) =>
            map.has(transformed.elements[f.roomId]?.id),
          )) {
            const id = map.get(transformed.elements[f.roomId].id);
            next.fixtures.push({
              ...f,
              id: ProjectModel.uid(),
              roomId: next.elements.findIndex((e) => e.id === id),
              roomUid: id,
            });
          }
        }
      this.pendingTransform = ProjectModel.normalize(next);
      document.getElementById("transform-preview").innerHTML =
        PlanningDrawing.thumbnail(next) +
        this.b("Apply transformation", "DesignUI.applyTransform()", "primary");
    });
  },
  applyTransform() {
    if (
      this.pendingTransform &&
      this.apply(this.pendingTransform, "Transformed selection")
    )
      document.getElementById("studio-dialog").close();
  },
  curveDialog() {
    this.dialog(
      "Curved walls and arched openings",
      `${this.select(
        "curve-wall",
        "Editable wall",
        PlanningUI.data.walls.map((w) => [w.id, w.id.slice(0, 10)]),
        "",
      )}${this.field("curve-x", "Bezier control X", ProjectModel.display(120, StudioUI.unit))}${this.field("curve-y", "Bezier control Y", ProjectModel.display(120, StudioUI.unit))}${this.b("Curve wall", "DesignUI.curveWall()")}<p>Quadratic curves are tessellated for shared rendering and exports.</p>${this.select(
        "arch-opening",
        "Opening",
        fixtures.map((f) => [f.id, f.tag || f.id.slice(0, 10)]),
        "",
      )}${this.field("arch-rise", "Arch rise", ProjectModel.display(12, StudioUI.unit))}${this.b("Apply arch profile", "DesignUI.archOpening()")}`,
    );
  },
  curveWall() {
    this.run(() =>
      this.commit("Curved wall", () => {
        const w = PlanningUI.data.walls.find(
          (w) => w.id === this.val("curve-wall"),
        );
        if (!w) throw Error("Choose a wall");
        w.curve = {
          control: {
            x: PlanningUI.parse(this.val("curve-x")),
            y: PlanningUI.parse(this.val("curve-y")),
          },
          steps: 24,
        };
      }),
    );
  },
  archOpening() {
    this.run(() =>
      this.commit("Arched opening", () => {
        const f = fixtures.find((f) => f.id === this.val("arch-opening"));
        if (!f) throw Error("Choose an opening");
        const rise = PlanningUI.parse(this.val("arch-rise"));
        if (rise < 0 || rise > f.height / 2)
          throw Error("Arch rise must fit the opening height");
        f.arch = rise;
      }),
    );
  },
  constraintDialog() {
    const all = [
      ...PlanningUI.data.walls.map((w) => [w.id, "Wall " + w.id.slice(0, 8)]),
      ...this.roomOptions(),
    ];
    this.dialog(
      "Geometric constraints",
      `${this.select("geo-kind", "Constraint", ["parallel", "perpendicular", "coincident", "equal-length", "fixed-angle"], "parallel")}${this.select("geo-source", "Reference", all, "")}${this.select("geo-target", "Target", all, "")}${this.field("geo-angle", "Fixed angle (degrees)", 0, "number")}${this.b("Add constraint", "DesignUI.addConstraint()", "primary")}${this.data.constraints.map((c, i) => `<p>${this.e(c.kind)} ${this.b("Remove", `DesignUI.commit('Removed geometric constraint',()=>DesignUI.data.constraints.splice(${i},1));DesignUI.constraintDialog()`)}</p>`).join("")}`,
    );
  },
  addConstraint() {
    this.commit("Added geometric constraint", () =>
      this.data.constraints.push({
        id: ProjectModel.uid(),
        kind: this.val("geo-kind"),
        source: this.val("geo-source"),
        target: this.val("geo-target"),
        angle: this.num("geo-angle"),
      }),
    );
  },
  guidesDialog() {
    this.dialog(
      "Construction guides",
      `${["ax", "ay", "bx", "by"].map((k, i) => this.field("guide-" + k, k, ProjectModel.display(i < 2 ? 20 : 240, StudioUI.unit))).join("")}${this.b("Add guide", "DesignUI.addGuide()")}${this.data.guides.map((g, i) => `<p>Floor ${g.floor} ${this.b("Delete", `DesignUI.commit('Removed guide',()=>DesignUI.data.guides.splice(${i},1));DesignUI.guidesDialog()`)}</p>`).join("")}`,
    );
  },
  addGuide() {
    this.run(() =>
      this.commit("Added construction guide", () =>
        this.data.guides.push({
          id: ProjectModel.uid(),
          floor: currentFloor,
          a: {
            x: PlanningUI.parse(this.val("guide-ax")),
            y: PlanningUI.parse(this.val("guide-ay")),
          },
          b: {
            x: PlanningUI.parse(this.val("guide-bx")),
            y: PlanningUI.parse(this.val("guide-by")),
          },
        }),
      ),
    );
  },
  analysisDialog() {
    this.analysis = DesignModel.analyze(this.p());
    this.dialog(
      "Design analysis",
      `<p>Checks show measured geometry and configured targets. Select a result to locate the affected room.</p>${this.analysis.map((r, i) => `<button class="studio-list-item" onclick="DesignUI.focusFinding(${i})">${this.e(r.code)} · Floor ${r.floor}<strong>${this.e(r.text)}</strong><small>Measured: ${this.e(r.measured)} · Target: ${this.e(r.target)}</small></button>`).join("") || "<p>No design findings.</p>"}`,
    );
  },
  focusFinding(i) {
    const r = this.analysis[i];
    if (r.geometry) this.overlay = [r.geometry];
    const index = elements.findIndex((e) => e.id === r.id);
    if (index >= 0) PlanningUI.focusRoom(index);
    else document.getElementById("studio-dialog").close();
    this.render();
  },
  furnitureDialog() {
    const room = elements[selectedElIndex];
    if (!room || room.isFurniture)
      return StudioUI.message("Select a room first.", "error");
    const furniture = elements.filter(
        (e) =>
          e.isFurniture &&
          e.floor === room.floor &&
          PlanningModel.inside(
            { x: e.x + e.w / 2, y: e.y + e.h / 2 },
            PlanningModel.points(room),
          ),
      ),
      clear = DesignModel.clear(this.p(), room).geometry;
    this.furnitureAlternatives = [];
    for (const mode of [
      "original",
      "mirror horizontally",
      "mirror vertically",
    ]) {
      const ps = furniture.map((e) => {
        const b = Selection.bounds(e);
        return {
          ...e,
          x:
            mode === "mirror horizontally"
              ? room.x + room.w - (e.x - room.x) - b.w
              : e.x,
          y:
            mode === "mirror vertically"
              ? room.y + room.h - (e.y - room.y) - b.h
              : e.y,
        };
      });
      const doorSectors = fixtures
        .filter(
          (f) =>
            f.type === "door" &&
            elements[f.roomId]?.id === room.id &&
            f.style !== "sliding" &&
            f.style !== "open",
        )
        .map((f) => PlanningDrawing.doorSector(this.p(), f).poly);
      const fit =
        ps.every(
          (e) =>
            !doorSectors.some(
              (sector) =>
                DesignModel.geomArea(
                  polygonClipping.intersection(
                    DesignModel.polygon(PlanningModel.points(e)),
                    DesignModel.polygon(sector),
                  ),
                ) > 0.1,
            ),
        ) &&
        ps.every(
          (e) =>
            DesignModel.geomArea(
              polygonClipping.difference(
                DesignModel.polygon(PlanningModel.points(e)),
                clear,
              ),
            ) < 0.1,
        ) &&
        !ps.some((e, i) =>
          ps.some((b, j) => i < j && PlanningModel.overlap(e, b)),
        );
      if (fit) this.furnitureAlternatives.push({ mode, items: ps });
    }
    this.dialog(
      "Furniture fit assistant",
      `<p>${furniture.length} furniture objects. Candidates are checked against actual room clear geometry and each other.</p>${this.furnitureAlternatives.map((a, i) => `<p>${a.mode} ${this.b("Apply", `DesignUI.applyFurniture(${i})`)}</p>`).join("") || "<p>No collision-free candidate found. Adjust room or furniture sizes.</p>"}`,
    );
  },
  applyFurniture(i) {
    const a = this.furnitureAlternatives[i];
    this.commit("Applied furniture arrangement", () =>
      a.items.forEach((e) => {
        const original = elements.find((n) => n.id === e.id);
        if (original.locked) throw Error("Unlock furniture");
        Object.assign(original, e);
      }),
    );
  },
  requirementsDialog() {
    const rows = this.roomOptions();
    this.dialog(
      "Requirements and relationships",
      `${this.select("req-kind", "Requirement", ["room", "adjacent", "private-access", "circulation"], "room")}${this.select("req-room", "Room", rows, "")}${this.select("req-other", "Related room", rows, "")}${this.select("req-priority", "Priority", ["mandatory", "preferred", "optional"], "mandatory")}${this.field("req-label", "Description", "Room target")}<div class="studio-field-grid">${this.field("req-area", "Minimum clear sq ft", 70, "number")}${this.field("req-width", "Preferred width", ProjectModel.display(120, StudioUI.unit))}${this.field("req-depth", "Preferred depth", ProjectModel.display(132, StudioUI.unit))}</div>${this.select("req-zone", "Preferred direction", [["", "Any"], "NE", "NW", "SE", "SW"], "")}${this.b("Add requirement", "DesignUI.addRequirement()", "primary")}<div>${DesignModel.requirementReport(
        this.p(),
      )
        .map(
          (r, i) =>
            `<div class="planning-record">${this.e(r.label)} · ${r.priority} · ${r.pass ? "Satisfied" : "Unmet"}<small>${this.e(r.measured)}</small>${this.b("Remove", `DesignUI.commit('Removed requirement',()=>DesignUI.data.requirements.splice(${i},1));DesignUI.requirementsDialog()`)}</div>`,
        )
        .join("")}</div>`,
    );
  },
  addRequirement() {
    this.run(() => {
      if (
        this.commit("Added requirement", () =>
          this.data.requirements.push({
            id: ProjectModel.uid(),
            kind: this.val("req-kind"),
            room: this.val("req-room"),
            other: this.val("req-other"),
            priority: this.val("req-priority"),
            label: this.val("req-label"),
            minArea: this.num("req-area"),
            width: PlanningUI.parse(this.val("req-width")),
            depth: PlanningUI.parse(this.val("req-depth")),
            zone: this.val("req-zone"),
          }),
        )
      )
        this.requirementsDialog();
    });
  },
  accessDialog() {
    this.dialog(
      "Accessibility and route planning",
      `${this.field("access-width", "Required passage width", ProjectModel.display(this.data.accessibility.width, StudioUI.unit))}${this.field("access-turn", "Turning diameter", ProjectModel.display(this.data.accessibility.turn, StudioUI.unit))}${this.field("access-step", "Maximum level change", ProjectModel.display(this.data.accessibility.maxStep, StudioUI.unit))}${this.select("route-start", "Start room", this.roomOptions(), "")}${this.select("route-end", "Destination room", this.roomOptions(), "")}${this.b("Evaluate route", "DesignUI.accessRoute()", "primary")}<div id="access-results"></div><p>Route sampling is shown with its resolution. These user-entered planning targets do not establish regulatory compliance.</p>`,
    );
  },
  accessRoute() {
    this.run(() => {
      const width = PlanningUI.parse(this.val("access-width")),
        turn = PlanningUI.parse(this.val("access-turn")),
        maxStep = PlanningUI.parse(this.val("access-step"));
      this.commit(
        "Changed access targets",
        () => (this.data.accessibility = { width, turn, maxStep }),
      );
      const a = elements.find((e) => e.id === this.val("route-start")),
        b = elements.find((e) => e.id === this.val("route-end"));
      if (!a || !b || a.floor !== b.floor)
        throw Error("Choose rooms on the same floor");
      const p = this.p();
      p.currentFloor = a.floor;
      const r = DesignModel.route(
        p,
        { x: a.x + a.w / 2, y: a.y + a.h / 2 },
        { x: b.x + b.w / 2, y: b.y + b.h / 2 },
        width,
        { turn, maxStep },
      );
      this.overlay = r.found ? [{ points: r.points }] : [];
      document.getElementById("access-results").textContent = r.found
        ? `Route found at ${r.step.toFixed(1)} in sampling. Turning circles: ${r.turning.filter((t) => !t.pass).length}/${r.turning.length} obstructed at direction changes/endpoints. Level changes above ${maxStep} in: ${r.levels.length}. Levels use the room schedule; unassigned rooms default to zero.`
        : "No route meeting the entered width was found.";
      this.render();
    });
  },
  sunDialog() {
    const s = this.data.site;
    this.dialog(
      "Site sun and shadow study",
      `${this.field("sun-lat", "Latitude", s.latitude, "number")}${this.field("sun-long", "Longitude", s.longitude, "number")}${this.field("sun-date", "Date", s.date, "date")}${this.field("sun-hour", "Local hour", s.hour, "number")}${this.field("sun-offset", "UTC offset", s.utcOffset, "number")}${this.b("Update sun & shadows", "DesignUI.sunApply()", "primary")}<p>Neighbours (${StudioUI.unit}, outside coordinates allowed):</p><div class="studio-field-grid">${["x", "y", "w", "h", "height"].map((k) => this.field("neighbour-" + k, k, ProjectModel.display(k === "height" ? 120 : k === "w" || k === "h" ? 120 : -120, StudioUI.unit))).join("")}</div>${this.b("Add neighbour", "DesignUI.addNeighbour()")}<div id="sun-results"></div>`,
    );
    const r = DesignModel.sun(s);
    document.getElementById("sun-results").textContent =
      `Altitude ${r.altitude.toFixed(1)}° · Azimuth ${r.azimuth.toFixed(1)}°`;
  },
  sunApply() {
    this.run(() => {
      this.commit(
        "Changed sun study",
        () =>
          (this.data.site = {
            latitude: this.num("sun-lat"),
            longitude: this.num("sun-long"),
            date: this.val("sun-date"),
            hour: this.num("sun-hour"),
            utcOffset: this.num("sun-offset"),
          }),
      );
      this.showShadows = true;
      const r = DesignModel.sun(this.data.site);
      if (Engine3D.sunLight) {
        const a = (r.azimuth * Math.PI) / 180,
          h = (r.altitude * Math.PI) / 180;
        Engine3D.sunLight.position.set(
          500 + Math.sin(a) * 1000 * Math.cos(h),
          Math.max(0, Math.sin(h) * 1000),
          500 - Math.cos(a) * 1000 * Math.cos(h),
        );
        Engine3D.needsRender = true;
      }
      this.render();
      this.sunDialog();
    });
  },
  addNeighbour() {
    this.commit("Added neighbour mass", () =>
      this.data.neighbours.push({
        id: ProjectModel.uid(),
        floor: 0,
        ...Object.fromEntries(
          ["x", "y", "w", "h", "height"].map((k) => [
            k,
            PlanningUI.parse(this.val("neighbour-" + k)),
          ]),
        ),
      }),
    );
    this.showShadows = true;
    this.render();
  },
  ventilationDialog() {
    const p = this.p(),
      windows = fixtures.filter(
        (f) =>
          f.type === "window" && elements[f.roomId]?.floor === currentFloor,
      ),
      routes = [];
    for (let i = 0; i < windows.length; i++)
      for (let j = i + 1; j < windows.length; j++) {
        const a = PlanningModel.openingSegment(p, windows[i]),
          b = PlanningModel.openingSegment(p, windows[j]),
          start = { x: (a.a.x + a.b.x) / 2, y: (a.a.y + a.b.y) / 2 },
          end = { x: (b.a.x + b.b.x) / 2, y: (b.a.y + b.b.y) / 2 },
          r = DesignModel.route(p, start, end);
        if (r.found) routes.push({ points: r.points });
      }
    this.overlay = routes;
    this.render();
    this.dialog(
      "Potential ventilation paths",
      `<p>${windows.length} windows · ${routes.length} potential connected paths.</p><p>Paths visualize connectivity between openings. Airflow, pressure, operability and mechanical systems require separate analysis.</p>${this.b("Clear paths", "DesignUI.overlay=[];DesignUI.render()")}`,
    );
  },
  parkingDialog() {
    this.dialog(
      "Parking manoeuvre study",
      `<div class="studio-field-grid">${this.field("car-width", "Vehicle width", ProjectModel.display(70, StudioUI.unit))}${this.field("car-length", "Vehicle length", ProjectModel.display(170, StudioUI.unit))}${this.field("car-radius", "Turning radius", ProjectModel.display(180, StudioUI.unit))}${this.field("car-x", "Turn center X", ProjectModel.display(250, StudioUI.unit))}${this.field("car-y", "Turn center Y", ProjectModel.display(250, StudioUI.unit))}${this.field("car-angle", "Sweep angle", 90, "number")}${this.field("car-gate", "Gate clear width", ProjectModel.display(96, StudioUI.unit))}</div>${this.b("Preview swept path", "DesignUI.parkingPreview()", "primary")}<div id="parking-result"></div>`,
    );
  },
  parkingPreview() {
    this.run(() => {
      const w = PlanningUI.parse(this.val("car-width")),
        l = PlanningUI.parse(this.val("car-length")),
        radius = PlanningUI.parse(this.val("car-radius")),
        x = PlanningUI.parse(this.val("car-x")),
        y = PlanningUI.parse(this.val("car-y")),
        angle = this.num("car-angle");
      if (w < 1 || l < 1 || radius < l / 2 || Math.abs(angle) > 360)
        throw Error(
          "Enter valid vehicle dimensions and a radius of at least half the vehicle length",
        );
      const path = [],
        p = this.p();
      let conflicts = 0;
      for (let i = 0; i <= 36; i++) {
        const a = (((angle * i) / 36) * Math.PI) / 180,
          c = { x: x + radius * Math.cos(a), y: y + radius * Math.sin(a) },
          shape = [
            [-l / 2, -w / 2],
            [l / 2, -w / 2],
            [l / 2, w / 2],
            [-l / 2, w / 2],
          ].map(([u, v]) => ({
            x: c.x - u * Math.sin(a) + v * Math.cos(a),
            y: c.y + u * Math.cos(a) + v * Math.sin(a),
          }));
        path.push(c);
        if (
          p.elements.some(
            (e) =>
              e.type !== "garage" &&
              e.floor === currentFloor &&
              DesignModel.geomArea(
                polygonClipping.intersection(
                  DesignModel.polygon(shape),
                  DesignModel.polygon(PlanningModel.points(e)),
                ),
              ) > 0.1,
          ) ||
          ProjectModel.walls(p).some(
            (wall) =>
              wall.floor === currentFloor &&
              DesignModel.geomArea(
                polygonClipping.intersection(DesignModel.polygon(shape), [
                  DesignModel.wallStrip(wall),
                ]),
              ) > 0.1,
          ) ||
          shape.some(
            (q) =>
              q.x < 0 ||
              q.y < 0 ||
              q.x > ProjectModel.inches(p.plot.inW, p.unit) ||
              q.y > ProjectModel.inches(p.plot.inH, p.unit),
          )
        )
          conflicts++;
      }
      this.overlay = [
        { points: path, color: conflicts ? "#fb7185" : "#4ade80" },
      ];
      this.render();
      document.getElementById("parking-result").textContent =
        `${conflicts}/37 sampled vehicle positions intersect objects or boundaries. Gate clearance: ${PlanningUI.parse(this.val("car-gate")) >= w ? "vehicle width fits" : "too narrow"}.  This previews the entered circular manoeuvre, not an automatic steering solution.`;
    });
  },
  builderDialog() {
    this.dialog(
      "Brief-based alternatives",
      `<p>Existing room requirements are ranked by priority. Mandatory room identities are retained. Circulation and requirement results are reviewed before Apply.</p>${this.field("brief-bedrooms", "Bedrooms", 2, "number")}${this.field("brief-baths", "Common toilets", 1, "number")}<label><input type="checkbox" id="brief-corridor" checked>Reserve a 36-inch circulation strip</label>${this.b("Generate ranked alternatives", "DesignUI.generateBrief()", "primary")}<div id="brief-results"></div>`,
    );
  },
  generateBrief() {
    this.run(() => {
      const base = this.p(),
        reserve = document.getElementById("brief-corridor").checked,
        protectedIds = this.data.requirements
          .filter((r) => r.priority === "mandatory")
          .map((r) => r.room),
        p = structuredClone(base);
      if (reserve) {
        p.elements.push({
          id: "reserved-corridor",
          type: "corridor",
          customName: "Circulation",
          floor: currentFloor,
          x: 0,
          y: 0,
          w: 45,
          h: ProjectModel.inches(p.plot.inH, p.unit),
          locked: true,
          rot: 0,
        });
        p.fixtures.push({
          id: "corridor-entrance",
          roomId: p.elements.length - 1,
          roomUid: "reserved-corridor",
          type: "door",
          edge: "top",
          offset: 4.5,
          size: 36,
          height: 80,
          sill: 0,
        });
      }
      const req = {
        floors: [currentFloor],
        bedrooms: this.num("brief-bedrooms"),
        baths: this.num("brief-baths"),
        attached: 0,
        bedW: 120,
        bedH: 132,
        preserve: [
          ...new Set([
            ...protectedIds,
            ...elements.filter((e) => e.locked).map((e) => e.id),
          ]),
        ],
      };
      this.briefBase = JSON.stringify(base);
      this.briefCandidates = DesignModel.alternatives(p, req)
        .map((c) => {
          if (c.project)
            c.project.planning.walls = c.project.planning.walls.filter(
              (w) => w.id !== "reserved-corridor",
            );
          return c;
        })
        .sort((a, b) => (b.score || -999) - (a.score || -999));
      document.getElementById("brief-results").innerHTML = this.briefCandidates
        .map((c, i) =>
          c.error
            ? `<p>${this.e(c.error)}</p>`
            : `<article class="planning-candidate">${PlanningDrawing.thumbnail(c.project)}<p>Score ${c.score} · Clear ${c.area.toFixed(1)} sq ft · Cost ${c.cost.toFixed(2)}</p>${c.requirements.map((r) => `<p>${this.e(r.label)}: ${r.pass ? "satisfied" : "unmet"} (${r.priority})</p>`).join("")}<p>${c.warnings.length} design findings. Scores: ${Object.entries(
                c.components,
              )
                .map(([key, value]) => `${key} ${value.toFixed(0)}`)
                .join(
                  " · ",
                )}. Trade-offs: requirements 40%, circulation 25%, privacy 15%, exterior-window proxy 10%, relative cost 10%; lower costs depend on your rates. Reserved circulation must still connect through doors.</p>${this.b("Apply candidate", "DesignUI.applyBrief(" + i + ")")}</article>`,
        )
        .join("");
    });
  },
  applyBrief(i) {
    if (JSON.stringify(this.p()) !== this.briefBase)
      return StudioUI.message(
        "Project changed; regenerate alternatives.",
        "error",
      );
    const c = this.briefCandidates[i];
    if (c.requirements.some((r) => r.priority === "mandatory" && !r.pass))
      return StudioUI.message(
        "Mandatory requirements are unmet. Adjust the brief before applying.",
        "error",
      );
    this.apply(c.project, "Applied brief alternative");
  },
  repairDialog() {
    this.dialog(
      "Repair and optimize a selected zone",
      `<p>Select the rooms to repair. Unselected and locked objects remain fixed.</p>${this.b("Preview minimal repairs", "DesignUI.previewRepair()", "primary")}<div id="repair-results"></div>`,
    );
  },
  previewRepair() {
    this.run(() => {
      const next = this.p(),
        selected = new Set(this.selected().map((i) => elements[i].id)),
        w = ProjectModel.inches(next.plot.inW, next.unit),
        h = ProjectModel.inches(next.plot.inH, next.unit),
        changes = [];
      for (const e of next.elements) {
        if (!selected.has(e.id) || e.locked) continue;
        const old = { x: e.x, y: e.y },
          bounds = Selection.bounds(e);
        e.x = Math.max(0, Math.min(w - bounds.w, e.x));
        e.y = Math.max(0, Math.min(h - bounds.h, e.y));
        const blockers = next.elements.filter(
          (b) => !b.isFurniture && b.id !== e.id && b.floor === e.floor,
        );
        if (
          !e.isFurniture &&
          blockers.some((b) => PlanningModel.overlap(e, b))
        ) {
          let fit = false;
          const origin = { x: e.x, y: e.y };
          for (let d = 6; d <= 120 && !fit; d += 6)
            for (const [dx, dy] of [
              [d, 0],
              [-d, 0],
              [0, d],
              [0, -d],
            ]) {
              const candidate = { ...e, x: origin.x + dx, y: origin.y + dy };
              if (
                candidate.x >= 0 &&
                candidate.y >= 0 &&
                candidate.x + candidate.w <= w &&
                candidate.y + candidate.h <= h &&
                !blockers.some((b) => PlanningModel.overlap(candidate, b))
              ) {
                e.x = candidate.x;
                e.y = candidate.y;
                fit = true;
                break;
              }
            }
        }
        if (e.x !== old.x || e.y !== old.y)
          changes.push(
            (e.customName || e.type) +
              ": moved " +
              Math.hypot(e.x - old.x, e.y - old.y).toFixed(1) +
              " in",
          );
      }
      this.pendingRepair = ProjectModel.normalize(next);
      document.getElementById("repair-results").innerHTML =
        PlanningDrawing.thumbnail(next) +
        changes.map((c) => `<p>${this.e(c)}</p>`).join("") +
        this.b(
          "Apply minimal repairs",
          'DesignUI.apply(DesignUI.pendingRepair,"Applied minimal repairs")',
        );
    });
  },
  roofDialog() {
    const r = this.data.roof;
    this.dialog(
      "Roof designer",
      `${this.select("roof-type", "Roof", ["flat", "gable", "shed", "hip"], r.type)}${this.field("roof-rise", "Rise", ProjectModel.display(r.rise, StudioUI.unit))}${this.field("roof-overhang", "Overhang", ProjectModel.display(r.overhang, StudioUI.unit))}${this.field("roof-thickness", "Vertical thickness ("+StudioUI.unit+")", ProjectModel.display(r.thickness ?? 4, StudioUI.unit))}${this.select("roof-drain", "Drainage", ["north", "south", "east", "west"], r.drain)}${this.b("Apply roof", "DesignUI.saveRoof()", "primary")}<p>Roof geometry and drainage direction are included in 3D and drawing views.</p>`,
    );
  },
  saveRoof() {
    this.run(() =>
      this.commit(
        "Changed roof",
        () =>
          (this.data.roof = {
            type: this.val("roof-type"),
            rise: PlanningUI.parse(this.val("roof-rise")),
            overhang: PlanningUI.parse(this.val("roof-overhang")),
            thickness: PlanningUI.parse(this.val("roof-thickness")),
            drain: this.val("roof-drain"),
          }),
      ),
    );
  },
  ceilingDialog() {
    this.dialog(
      "Reflected ceiling plan",
      `${this.field("ceiling-label", "Ceiling label", "Ceiling zone")}${["x", "y", "w", "h", "height"].map((k) => this.field("ceiling-" + k, k, ProjectModel.display(k === "height" ? 108 : k === "w" || k === "h" ? 120 : 20, StudioUI.unit))).join("")}${this.b("Add ceiling zone", "DesignUI.addCeiling()")}<label><input type="checkbox" ${this.ceilingMode ? "checked" : ""} onchange="DesignUI.ceilingMode=this.checked;DesignUI.render()">Show ceiling overlay</label><p>Use electrical lights and room furniture assets for fans/access details.</p>${this.data.ceilings.map((c, i) => `<p>F${c.floor} ${this.e(c.label)} ${this.b("Remove", `DesignUI.commit('Removed ceiling',()=>DesignUI.data.ceilings.splice(${i},1));DesignUI.ceilingDialog()`)}</p>`).join("")}`,
    );
  },
  addCeiling() {
    this.run(() =>
      this.commit("Added ceiling zone", () =>
        this.data.ceilings.push({
          id: ProjectModel.uid(),
          floor: currentFloor,
          label: this.val("ceiling-label"),
          ...Object.fromEntries(
            ["x", "y", "w", "h", "height"].map((k) => [
              k,
              PlanningUI.parse(this.val("ceiling-" + k)),
            ]),
          ),
        }),
      ),
    );
  },
  finishDialog() {
    const id = elements[selectedElIndex]?.id,
      f = this.data.finishes[id] || {};
    this.dialog(
      "Room finish schedule",
      `${this.select("finish-room", "Room", this.roomOptions(), id)}${["floor", "wall", "ceiling", "skirting"].map((k) => this.field("finish-" + k, k, f[k] || "")).join("")}${this.b("Assign finishes", "DesignUI.saveFinish()")}<table><tr><th>Room</th><th>Floor</th><th>Wall</th><th>Ceiling</th><th>Skirting ft</th></tr>${DesignModel.finishes(
        this.p(),
      )
        .map(
          (r) =>
            `<tr><td>${this.e(r.name)}</td><td>${this.e(r.floorFinish || "")}</td><td>${this.e(r.wall || "")}</td><td>${this.e(r.ceiling || "")}</td><td>${r.perimeter.toFixed(1)}</td></tr>`,
        )
        .join(
          "",
        )}</table>${this.b("Download finishes CSV", "DesignIO.finishesCSV()")}`,
    );
  },
  saveFinish() {
    this.commit(
      "Assigned room finishes",
      () =>
        (this.data.finishes[this.val("finish-room")] = Object.fromEntries(
          ["floor", "wall", "ceiling", "skirting"].map((k) => [
            k,
            this.val("finish-" + k),
          ]),
        )),
    );
    this.finishDialog();
  },
  tileDialog() {
    const e = elements[selectedElIndex];
    if (!e || e.isFurniture) return StudioUI.message("Select a room.", "error");
    const t = this.data.tiles[e.id] || { w: 24, h: 24, joint: 0.125, angle: 0 };
    this.tileRoom = e.id;
    this.dialog(
      "Tile layout and cutting plan",
      `${this.field("tile-w", "Tile width", ProjectModel.display(t.w, StudioUI.unit))}${this.field("tile-h", "Tile depth", ProjectModel.display(t.h, StudioUI.unit))}${this.field("tile-joint", "Joint", ProjectModel.display(t.joint, StudioUI.unit))}${this.field("tile-angle", "Rotation degrees", t.angle, "number")}${this.b("Preview tile cuts", "DesignUI.previewTiles()", "primary")}<div id="tile-results"></div>${this.b("Clear overlay", "DesignUI.tilePreview=null;DesignUI.render()")}`,
    );
  },
  previewTiles() {
    this.run(() => {
      this.commit(
        "Changed tile layout",
        () =>
          (this.data.tiles[this.tileRoom] = {
            w: PlanningUI.parse(this.val("tile-w")),
            h: PlanningUI.parse(this.val("tile-h")),
            joint: PlanningUI.parse(this.val("tile-joint")),
            angle: this.num("tile-angle"),
          }),
      );
      this.tilePreview = DesignModel.tiles(this.p(), this.tileRoom);
      const t = this.tilePreview;
      document.getElementById("tile-results").textContent =
        `${t.total} tile blanks · ${t.full} whole · ${t.cuts} cut · ${t.wastage.toFixed(1)}% geometric offcut area (reuse not optimized)`;
      this.render();
    });
  },
  openingSchedule() {
    this.dialog(
      "Detailed opening schedule",
      this.b("Assign missing tags", "DesignUI.tagOpenings()") +
        `<table><tr><th>Tag</th><th>Floor / room</th><th>Type</th><th>W × H</th><th>Sill</th><th>Style</th></tr>${fixtures.map((f) => `<tr><td>${this.e(f.tag || "—")}</td><td>${elements[f.roomId].floor} / ${this.e(elements[f.roomId].customName || elements[f.roomId].type)}</td><td>${f.type}</td><td>${PlanningUI.length(f.size)} × ${PlanningUI.length(f.height)}</td><td>${PlanningUI.length(f.sill)}</td><td>${f.style || "hinged"}</td></tr>`).join("")}</table>` +
        this.b("Download schedule CSV", "DesignIO.openingsCSV()"),
    );
  },
  tagOpenings() {
    this.commit("Tagged openings", () =>
      fixtures.forEach((f, i) => {
        if (!f.tag)
          f.tag =
            (f.type === "door" ? "D" : "W") +
            "-" +
            String(i + 1).padStart(3, "0");
      }),
    );
    this.openingSchedule();
  },
  async quantityDiffDialog() {
    this.versions = await StorageEngine.versions();
    this.dialog(
      "Revision-aware quantities",
      `${this.select(
        "quantity-version",
        "Compare to version",
        this.versions.map((v) => [v.id, v.label]),
        "",
      )}${this.b("Compare quantities", "DesignUI.quantityDiff()")}<div id="quantity-diff"></div>`,
    );
  },
  quantityDiff() {
    this.run(() => {
      const old = ProjectModel.normalize(
          this.versions.find((v) => v.id === this.val("quantity-version"))
            .project,
        ),
        a = PlanningModel.quantities(old),
        b = PlanningModel.quantities(this.p());
      document.getElementById("quantity-diff").innerHTML =
        `<p>Estimate change: ${(b.total - a.total).toFixed(2)} ${this.e(this.p().planning.cost.currency)}</p><table><tr><th>Floor</th><th>Wall sq ft Δ</th><th>Paint sq ft Δ</th><th>Floor sq ft Δ</th></tr>${b.floors
          .map((f) => {
            const prev = a.floors.find((v) => v.floor === f.floor) || {
              wall: 0,
              paint: 0,
              floorArea: 0,
            };
            return `<tr><td>${f.floor}</td><td>${(f.wall - prev.wall).toFixed(2)}</td><td>${(f.paint - prev.paint).toFixed(2)}</td><td>${(f.floorArea - prev.floorArea).toFixed(2)}</td></tr>`;
          })
          .join("")}</table>`;
    });
  },
  clashDialog() {
    this.clashes = DesignModel.clashes(this.p());
    this.dialog(
      "Service coordination",
      this.clashes
        .map(
          (r, i) =>
            `<button class="studio-list-item" onclick="DesignUI.overlay=[{a:DesignUI.clashes[${i}].point,b:{x:DesignUI.clashes[${i}].point.x+12,y:DesignUI.clashes[${i}].point.y+12}}];DesignUI.render();document.getElementById('studio-dialog').close()">Floor ${r.floor} · ${this.e(r.text)}</button>`,
        )
        .join("") ||
        "<p>No route crossings detected. Elevations and structural capacity are not evaluated.</p>",
    );
  },
  sheetDialog() {
    this.dialog(
      "Sheet composer and section cuts",
      `${this.field("sheet-title", "Sheet title", "Floor coordination")}${this.select("sheet-paper", "Paper", ["A3", "A4"], "A3")}${this.field("sheet-scale", "Scale denominator", 50, "number")}<p>Include views:</p>${["plan", "front", "back", "left", "right", "section", "ceiling", "schedule", "legend"].map((k) => `<label><input class="sheet-view" type="checkbox" value="${k}" ${["plan", "schedule", "legend"].includes(k) ? "checked" : ""}>${k}</label>`).join("")}<p>Section polyline in inches (each segment becomes a coordinated section viewport):</p><textarea id="section-points">0,200\n600,200</textarea>${this.b("Save sheet layout", "DesignUI.saveSheet()")}${this.b("Preview composed sheets", "DesignIO.composedSheets()", "primary")}${this.data.sheets.map((s, i) => `<p>${this.e(s.title)} ${this.b("Remove", `DesignUI.commit('Removed sheet',()=>DesignUI.data.sheets.splice(${i},1));DesignUI.sheetDialog()`)}</p>`).join("")}`,
    );
  },
  saveSheet() {
    this.run(() => {
      const ps = this.val("section-points")
        .trim()
        .split("\n")
        .map((r) => {
          const [x, y] = r.split(",").map(Number);
          if (!Number.isFinite(x) || !Number.isFinite(y))
            throw Error("Use X,Y per section point");
          return { x, y };
        });
      this.commit("Saved sheet layout", () =>
        this.data.sheets.push({
          id: ProjectModel.uid(),
          title: this.val("sheet-title"),
          paper: this.val("sheet-paper"),
          scale: this.num("sheet-scale"),
          floor: currentFloor,
          views: [...document.querySelectorAll(".sheet-view:checked")].map(
            (e) => e.value,
          ),
          section: ps,
        }),
      );
      this.sheetDialog();
    });
  },
  preflightDialog() {
    const findings = DesignModel.preflight(this.p());
    this.dialog(
      "Drawing preflight",
      `<p>${findings.length} issues to review before exporting.</p>${findings.map((t) => `<p>${this.e(t)}</p>`).join("") || "<p>Basic drawing checks passed.</p>"}<p>Composed sheets additionally check viewport size against the selected paper and drawing scale.</p>`,
    );
  },
  explorerDialog() {
    this.dialog(
      "Object explorer and editable schedule",
      `<input id="object-search" aria-label="Search objects" placeholder="Search objects" oninput="DesignUI.explorerRows(this.value)">${this.b("Select checked", "DesignUI.selectChecked()")}${this.field("bulk-name", "Name prefix", "Room")}${this.field("bulk-group", "Group name (blank leaves groups)", "")}${this.select("bulk-material", "Material", ["auto", "wood", "kitchen-tile", "bathroom-tile", "concrete"], "auto")}${this.field("bulk-opening-width", "Opening width (blank keeps current)", "")}${this.field("bulk-opening-height", "Opening height (blank keeps current)", "")}${this.b("Apply properties to checked", "DesignUI.bulkEdit()")}<div id="object-rows"></div>`,
    );
    this.explorerRows("");
  },
  explorerRows(query) {
    document.getElementById("object-rows").innerHTML =
      `<table><tr><th>Select</th><th>Name / type</th><th>Floor</th><th>Width</th><th>Depth</th><th>Level</th><th>Locked</th></tr>${elements.map((e, i) => ((e.customName + " " + e.type).toLowerCase().includes(query.toLowerCase()) ? `<tr><td><input class="explorer-check" type="checkbox" value="${e.id}" ${Selection.ids.has(e.id) ? "checked" : ""}></td><td><input aria-label="Object name ${i}" value="${this.e(e.customName || e.type)}" onchange="StudioUI.edit(${i},'customName',this.value)"></td><td>${e.floor}</td><td><input value="${this.e(ProjectModel.display(e.w, StudioUI.unit))}" onchange="PlanningUI.run(()=>StudioUI.edit(${i},'w',PlanningUI.parse(this.value)))"></td><td><input value="${this.e(ProjectModel.display(e.h, StudioUI.unit))}" onchange="PlanningUI.run(()=>StudioUI.edit(${i},'h',PlanningUI.parse(this.value)))"></td><td><input aria-label="Room level ${i}" value="${ProjectModel.display(this.data.roomProperties[e.id]?.level || 0, StudioUI.unit)}" onchange="DesignUI.setRoomLevel('${e.id}',this.value)"></td><td><input type="checkbox" ${e.locked ? "checked" : ""} onchange="StudioUI.edit(${i},'locked',this.checked)"></td></tr>` : "")).join("")}</table><h3>Other objects</h3>${fixtures.map((f) => `<p>${this.e(f.tag || f.type)} · F${elements[f.roomId].floor} ${this.b("Edit", `PlanningUI.editOpeningDialog(${fixtures.indexOf(f)})`)}</p>`).join("")}${PlanningUI.data.walls.map((w) => `<p>Wall ${w.id.slice(0, 8)} · F${w.floor}</p>`).join("")}${PlanningUI.data.services.map((s) => `<p>${this.e(s.label || s.kind)} · ${s.layer} · F${s.floor}</p>`).join("")}`;
  },
  checked() {
    return [...document.querySelectorAll(".explorer-check:checked")].map(
      (e) => e.value,
    );
  },
  selectChecked() {
    Selection.ids = new Set(this.checked());
    selectedElIndex = elements.findIndex((e) => Selection.ids.has(e.id));
    AppEvents.triggerSelectionChange();
    updateCanvas(false);
  },
  bulkEdit() {
    const ids = this.checked(),
      prefix = this.val("bulk-name"),
      material = this.val("bulk-material");
    this.commit("Bulk updated objects", () =>
      elements
        .filter((e) => ids.includes(e.id))
        .forEach((e, i) => {
          if (e.locked) throw Error("Unlock selected objects");
          e.customName = prefix + " " + (i + 1);
          e.material = material;
        }),
    );
    this.explorerRows("");
  },
  workspaceDialog() {
    const names = [
      "planning",
      "interiors",
      "services",
      "review",
      "presentation",
    ];
    this.dialog(
      "Workspace presets",
      names
        .map(
          (n) =>
            `<div class="planning-record"><strong>${n}</strong>${this.b("Save current", `DesignUI.saveWorkspace('${n}')`)}${this.b("Load", `DesignUI.loadWorkspace('${n}')`)}</div>`,
        )
        .join(""),
    );
  },
  saveWorkspace(name) {
    PlanningUI.preferences.presets ||= {};
    PlanningUI.preferences.presets[name] = {
      widgets: structuredClone(PlanningUI.preferences.widgets),
      mode: StudioUI.mode,
      layers: structuredClone(PlanningUI.data.layers),
      catalogWidth: PlanningUI.preferences.catalogWidth,
      inspectorWidth: PlanningUI.preferences.inspectorWidth,
    };
    PlanningUI.savePrefs();
    StudioUI.message("Workspace saved.");
  },
  loadWorkspace(name) {
    const p = PlanningUI.preferences.presets?.[name];
    if (!p) return StudioUI.message("Save this preset first.");
    Object.assign(PlanningUI.preferences, p);
    PlanningUI.applyPrefs();
    PlanningUI.savePrefs();
    this.commit(
      "Loaded workspace",
      () => (PlanningUI.data.layers = structuredClone(p.layers)),
    );
    setWorkspaceLayout(p.mode);
    PlanningUI.refresh();
  },
  contextDialog() {
    const legacy = document.getElementById("context-menu");
    if (legacy) legacy.style.display = "none";
    this.dialog(
      "Selected object actions",
      `${this.b("Exact movement / mirror", "DesignUI.transformDialog()")}${this.b("Properties / object table", "DesignUI.explorerDialog()")}${this.b("Duplicate", "Selection.action('Duplicate')")}${this.b("Delete", "Selection.action('Delete selection')", "danger")}${this.b("Opening editor", "PlanningUI.openingsDialog()")}${this.b("Edit vertices", "PlanningUI.editVertices(selectedElIndex)")}${this.b("Find warnings", "DesignUI.analysisDialog()")}`,
    );
  },
  trashDialog() {
    this.dialog(
      "Recover deleted objects",
      `<p>Up to 30 object or project deletion records are retained in this project. Restore is undoable.</p>${this.data.trash.map((t, i) => `<div class="planning-record"><strong>${this.e(t.label || t.kind)}</strong><small>${new Date(t.time).toLocaleString()}</small>${this.b("Restore", `DesignUI.restoreTrash(${i})`)}${this.b("Permanently remove", `DesignUI.commit('Cleared trash record',()=>DesignUI.data.trash.splice(${i},1));DesignUI.trashDialog()`, "danger")}</div>`).join("") || "<p>Nothing deleted yet.</p>"}`,
    );
  },
  restoreTrash(i) {
    this.commit("Restored deleted objects", () => {
      const t = this.data.trash[i],
        map = new Map();
      for (const e of t.elements || []) {
        const id = elements.some((n) => n.id === e.id)
          ? ProjectModel.uid()
          : e.id;
        map.set(e.id, id);
        elements.push({ ...e, id });
      }
      for (const f of t.fixtures || []) {
        const id = map.get(f.roomUid);
        if (id)
          fixtures.push({
            ...f,
            id: ProjectModel.uid(),
            roomUid: id,
            roomId: elements.findIndex((e) => e.id === id),
          });
      }
      for (const [k, list] of Object.entries(t.planning || {}))
        for (const item of list)
          PlanningUI.data[k].push({ ...item, id: ProjectModel.uid() });
      this.data.trash.splice(i, 1);
    });
    this.trashDialog();
  },
  healthDialog() {
    const p = this.p(),
      base = PlanningModel.analyze(p),
      design = DesignModel.analyze(p),
      requirements = DesignModel.requirementReport(p);
    this.dialog(
      "Project health",
      `<p>${base.results.length} layout warnings · ${design.length} design findings · ${requirements.filter((r) => !r.pass).length} unmet requirements.</p><p>Drawing readiness: ${DesignModel.preflight(p).length} findings.</p><p>Storage: ${this.e(StorageEngine.error || StorageEngine.lastSaved || "Pending first save")} · ${PlanningUI.offlineReady ? "Offline cache installed" : "Offline cache pending"}</p>${this.b("Layout checks", "PlanningUI.checksDialog()")}${this.b("Design findings", "DesignUI.analysisDialog()")}${this.b("Requirements", "DesignUI.requirementsDialog()")}${this.b("Drawing preflight", "DesignUI.preflightDialog()")}${this.b("Export portable backup", "exportJSON()")}`,
    );
  },
  exportDialog() {
    this.dialog(
      "Portable project and interoperability",
      `${this.b("Project ZIP package", "DesignIO.package()", "primary")}${this.b("Editable SVG", "DesignIO.svg()")}${this.b("IFC coordination model", "DesignIO.ifc()")}${this.b("Existing PNG/PDF/DXF/GLB", "StudioUI.exportDialog()")}<input type="file" accept=".zip" onchange="DesignIO.importPackage(this.files[0])"><p>The ZIP contains the project, drawings, schedules, underlays and a manifest. IFC coordination export includes gross wall solids and space identities; detailed opening/finish data remains in the accompanying package.</p>`,
    );
  },
  dxfDialog() {
    this.dialog(
      "Import DXF with preview",
      `<input type="file" accept=".dxf" onchange="DesignIO.readDXF(this.files[0])">${this.field("dxf-scale", "Additional scale factor", 1, "number")}<div id="dxf-layers"></div><div id="dxf-preview"></div>${this.b("Apply selected layers", "DesignIO.applyDXF()", "primary")}<p>Supported: LINE, LWPOLYLINE, TEXT and CIRCLE. Polylines become wall segments; unsupported entities are reported separately. Existing project is retained.</p>`,
    );
  },
  lessonDialog(step = 0) {
    const lessons = [
      [
        "Draw connected walls",
        "Use Build → Draw walls. Click each corner; Enter finishes. Close a loop, then Recognize rooms.",
        'PlanningUI.setTool("wall")',
      ],
      [
        "Add and configure openings",
        "Select a room, open Opening editor, choose an edge and set dimensions.",
        "PlanningUI.openingsDialog()",
      ],
      [
        "Organize layers",
        "Show service layers, lock room geometry and save a services workspace.",
        "PlanningUI.layersDialog()",
      ],
      [
        "Review and export",
        "Run drawing preflight, then compose sheets or export a portable project package.",
        "DesignUI.preflightDialog()",
      ],
    ];
    const l = lessons[step];
    this.dialog(
      "Guided lesson " + (step + 1) + " / " + lessons.length,
      `<h3>${l[0]}</h3><p>${l[1]}</p>${this.b("Try this step", l[2])}${this.b("Next lesson", `DesignUI.lessonDialog(${(step + 1) % lessons.length})`)}`,
    );
  },
  presentationDialog() {
    this.dialog(
      "Interactive walkthrough presentation",
      `${this.field("presentation-name", "Viewpoint name", "Room view")}${this.field("presentation-note", "Information / annotation", "")}${this.b("Capture viewpoint", "DesignUI.capturePresentation()")}${this.data.views.map((v, i) => `<div class="planning-record"><strong>${this.e(v.name)}</strong><small>${this.e(v.note)}</small>${this.b("Visit", `DesignUI.visitPresentation(${i})`)}</div>`).join("")}${this.b("Start presentation", "DesignUI.startPresentation()", "primary")}`,
    );
  },
  capturePresentation() {
    if (!Engine3D.camera) setWorkspaceLayout("3d");
    this.commit("Captured presentation viewpoint", () =>
      this.data.views.push({
        id: ProjectModel.uid(),
        name: this.val("presentation-name"),
        note: this.val("presentation-note"),
        floor: currentFloor,
        position: Engine3D.camera.position.toArray(),
        target: Engine3D.controls.target.toArray(),
        projection: Engine3D.camera.isOrthographicCamera ? "orthographic" : "perspective",
        ...(Engine3D.camera.isOrthographicCamera ? {
          orthoHeight: Engine3D.camera.top - Engine3D.camera.bottom,
          zoom: Engine3D.camera.zoom,
        } : {}),
      }),
    );
    this.presentationDialog();
  },
  visitPresentation(i) {
    const v = this.data.views[i];
    setFloor(v.floor);
    setWorkspaceLayout("3d");
    if (typeof ViewportUI !== "undefined") {
      ViewportUI.projection(v.projection || "perspective");
      Engine3D.cameraTween = null;
      if (Engine3D.camera.isOrthographicCamera && v.orthoHeight) {
        const half = v.orthoHeight / 2, camera = Engine3D.camera;
        camera.top = half; camera.bottom = -half;
        camera.left = -half * camera.aspect; camera.right = half * camera.aspect;
        camera.zoom = v.zoom || 1; camera.updateProjectionMatrix();
      }
    }
    Engine3D.camera.position.fromArray(v.position);
    Engine3D.controls.target.fromArray(v.target);
    Engine3D.controls.update();
    Engine3D.needsRender = true;
    StudioUI.message(v.name + " · " + v.note);
  },
  startPresentation() {
    if (!this.data.views.length)
      return StudioUI.message("Capture a viewpoint first.");
    document.getElementById("studio-dialog").close();
    this.presentationIndex = 0;
    this.visitPresentation(0);
    let bar = document.getElementById("design-presentation");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "design-presentation";
      document.body.append(bar);
    }
    bar.innerHTML =
      this.b(
        "Previous",
        "DesignUI.presentationIndex=(DesignUI.presentationIndex-1+DesignUI.data.views.length)%DesignUI.data.views.length;DesignUI.visitPresentation(DesignUI.presentationIndex)",
      ) +
      this.b(
        "Next",
        "DesignUI.presentationIndex=(DesignUI.presentationIndex+1)%DesignUI.data.views.length;DesignUI.visitPresentation(DesignUI.presentationIndex)",
      ) +
      this.b("Exit", 'document.getElementById("design-presentation").remove()');
  },
  critiqueDialog() {
    const issues = DesignModel.analyze(this.p());
    this.dialog(
      "Design critique and reviewable corrections",
      `<p>Local critique identifies measurable issues. Optional AI assistance uses the existing protected service and action preview.</p>${issues
        .slice(0, 30)
        .map(
          (r) =>
            `<p>${this.e(r.text)} — ${this.e(r.measured)}; target ${this.e(r.target)}</p>`,
        )
        .join(
          "",
        )}${this.b("Preview local corrections", "DesignUI.repairDialog()")}${this.b("Ask configured AI", "StudioUI.aiDialog()")}<p>Changes are previewed before application and remain undoable.</p>`,
    );
  },
  unitForms() {
    document.addEventListener("focusin", (e) => {
      const input = e.target;
      if (!input.matches('#studio-dialog input[type="number"]')) return;
      const label = input.closest("label")?.textContent || "";
      if (!/\(in\)|inches/i.test(label) || input.dataset.designUnit) return;
      const original = input.getAttribute("onchange");
      if (!original) return;
      input.dataset.designUnit = "true";
      const inches = Number(input.value);
      input.type = "text";
      input.value = ProjectModel.display(inches, StudioUI.unit);
      input.closest("label").firstChild.textContent = label.replace(
        /\(in\)|inches/gi,
        "(" + StudioUI.unit + ")",
      );
      input.addEventListener(
        "change",
        () => {
          const value = PlanningUI.parse(input.value);
          input.value = value;
        },
        { capture: true },
      );
    });
  },
};
const designOldPlanningRender = PlanningDrawing.render;
PlanningDrawing.render = function () {
  designOldPlanningRender.call(this);
  if (PlanningUI.ready && typeof DesignUI !== "undefined") DesignUI.render();
};
WallEngine.clearDimensions = (e) =>
  DesignModel.clear(ProjectState.capture(), e);
const designOldRemove = ProjectState.removeIndices;
ProjectState.removeIndices = function (indices) {
  const removed = indices.map((i) => elements[i]).filter(Boolean),
    ids = new Set(removed.map((e) => e.id));
  if (removed.length && ProjectState.meta.design) {
    ProjectState.meta.design.trash.unshift({
      kind: "objects",
      label: removed.length + " deleted objects",
      time: new Date().toISOString(),
      elements: structuredClone(removed),
      fixtures: fixtures
        .filter((f) => ids.has(elements[f.roomId]?.id))
        .map((f) => ({ ...f, roomUid: elements[f.roomId].id })),
    });
    ProjectState.meta.design.trash = ProjectState.meta.design.trash.slice(
      0,
      30,
    );
  }
  return designOldRemove.call(this, indices);
};
const designPlanningRemove = PlanningUI.remove;
PlanningUI.remove = function (collection, id) {
  const object = this.data[collection]?.find((v) => v.id === id);
  if (collection === "underlays" && object?.locked)
    return StudioUI.message("Unlock the image before deleting it.", "error");
  if (object)
    DesignUI.commit("Saved deletion recovery", () =>
      DesignUI.data.trash.unshift({
        kind: collection,
        label: collection + " object",
        time: new Date().toISOString(),
        planning: { [collection]: [structuredClone(object)] },
      }),
    );
  return designPlanningRemove.call(this, collection, id);
};
const designDeleteFloor = PlanningUI.deleteFloor;
PlanningUI.deleteFloor = function (i) {
  if (this.data.underlays.some((u) => u.floor === i && u.locked))
    return StudioUI.message(
      "Unlock floor underlays before deleting the floor.",
      "error",
    );
  return designDeleteFloor.call(this, i);
};
const designAddWall = PlanningUI.addWall;
PlanningUI.addWall = function (a, b) {
  const ok = designAddWall.call(this, a, b);
  if (ok && ProjectState.meta.design.autoRooms) {
    try {
      DesignUI.apply(
        DesignModel.recognize(ProjectState.capture(), currentFloor),
        "Recognized rooms after wall draw",
      );
    } catch (e) {
      if (!e.message.includes("No closed")) StudioUI.message(e.message);
    }
  }
  return ok;
};
document.addEventListener("DOMContentLoaded", () => DesignUI.init());
// Display units are applied when a dialog is constructed, including legacy planning forms.
DesignUI.unitForms = function () {};
const designOriginalNum = PlanningUI.num;
PlanningUI.num = function (id) {
  const input = document.getElementById(id);
  return input?.dataset.displayUnit
    ? PlanningUI.parse(input.value, input.dataset.displayUnit)
    : designOriginalNum.call(this, id);
};
DesignUI.num = (id) => PlanningUI.num(id);
StudioUI.dialogHooks.set("units", { after(dialog) {
  for (const input of dialog.querySelectorAll('input[type="number"]')) {
    const label = input.closest("label");
    if (
      !label ||
      !/(\(in\)|inches)/i.test(label.textContent) ||
      /(sq|rate)/i.test(label.textContent)
    )
      continue;
    const original = input.onchange,
      unit = StudioUI.unit;
    input.type = "text";
    input.dataset.displayUnit = unit;
    input.value = ProjectModel.display(Number(input.value), unit);
    if (label.firstChild.nodeType === 3)
      label.firstChild.textContent = label.firstChild.textContent.replace(
        /\(in\)|inches/gi,
        "(" + unit + ")",
      );
    if (original)
      input.onchange = function (event) {
        const text = this.value;
        try {
          this.value = PlanningUI.parse(text, unit);
          original.call(this, event);
          if (this.isConnected)
            this.value = ProjectModel.display(Number(this.value), unit);
        } catch (e) {
          this.value = text;
          StudioUI.message(e.message, "error");
        }
      };
  }
} });
// Consumers bind dialog methods dynamically so the unit adapter remains centralized.
DesignUI.dialog = (...args) => StudioUI.dialog(...args);
const designGuideSnap = PlanningModel.snap;
PlanningModel.snap = function (p, q, floor, origin) {
  let best = designGuideSnap(p, q, floor, origin),
    distance = PlanningModel.distance(q, best);
  for (const g of p.design?.guides || []) {
    if (g.floor !== floor) continue;
    const dx = g.b.x - g.a.x,
      dy = g.b.y - g.a.y,
      len = dx * dx + dy * dy,
      t = ((q.x - g.a.x) * dx + (q.y - g.a.y) * dy) / len,
      projection = { x: g.a.x + t * dx, y: g.a.y + t * dy },
      d = PlanningModel.distance(q, projection);
    if (d < 8 && d < distance) {
      best = { ...projection, kind: "guide" };
      distance = d;
    }
  }
  return best;
};
// Deleting saved projects or templates is recoverable independently from the active plan.
DesignUI.saveLibraryDeletion = async function (kind, record) {
  const list = await PlanningUI.readCollection("deleted_library");
  list.unshift({
    id: ProjectModel.uid(),
    kind,
    record,
    time: new Date().toISOString(),
  });
  await PlanningUI.writeCollection("deleted_library", list.slice(0, 30));
};
const designDeleteTemplate = PlanningUI.deleteTemplate;
PlanningUI.deleteTemplate = async function (i) {
  await DesignUI.saveLibraryDeletion("room_templates", this.templates[i]);
  return designDeleteTemplate.call(this, i);
};
const designDeleteProject = PlanningUI.removeLibraryProject;
PlanningUI.removeLibraryProject = async function (i) {
  await DesignUI.saveLibraryDeletion("project_library", this.projects[i]);
  return designDeleteProject.call(this, i);
};
const designPlanTrashDialog = DesignUI.trashDialog;
DesignUI.trashDialog = async function () {
  designPlanTrashDialog.call(this);
  this.libraryTrash = await PlanningUI.readCollection("deleted_library");
  const body = document.querySelector("#studio-dialog .studio-dialog-body");
  if (!body) return;
  body.insertAdjacentHTML(
    "beforeend",
    "<h3>Deleted saved projects and templates</h3>" +
      this.libraryTrash
        .map(
          (t, i) =>
            `<p>${this.e(t.record?.name || t.kind)} ${this.b("Restore", `DesignUI.restoreLibraryDeletion(${i})`)}</p>`,
        )
        .join(""),
  );
};
DesignUI.restoreLibraryDeletion = async function (i) {
  const entry = this.libraryTrash[i],
    rows = await PlanningUI.readCollection(entry.kind);
  if (!rows.some((r) => r.id === entry.record.id)) rows.unshift(entry.record);
  await PlanningUI.writeCollection(entry.kind, rows);
  await PlanningUI.writeCollection(
    "deleted_library",
    this.libraryTrash.filter((_, n) => n !== i),
  );
  this.trashDialog();
};
const designOriginalCritique = DesignUI.critiqueDialog;
DesignUI.askCritique = function () {
  const issues = DesignModel.analyze(this.p());
  StudioUI.aiDialog();
  document.getElementById("studio-ai-prompt").value =
    "Review the current plan and these measured findings. Propose only minimal supported room moves/additions/deletions to address them. Preserve locked/unrequested objects and explain corrections through the action preview. Findings: " +
    JSON.stringify(issues.slice(0, 20));
};
DesignUI.critiqueDialog = function () {
  designOriginalCritique.call(this);
  const button = [...document.querySelectorAll("#studio-dialog button")].find(
    (b) => b.textContent === "Ask configured AI",
  );
  if (button) button.onclick = () => this.askCritique();
};
const designPreviewAI = StudioUI.previewPlan;
StudioUI.previewPlan = function (raw) {
  designPreviewAI.call(this, raw);
  if (!this.pendingAI) return;
  const target = document.getElementById("ai-plan-preview");
  target.insertAdjacentHTML(
    "afterbegin",
    `<div class="design-diff"><div><strong>Before</strong>${PlanningDrawing.thumbnail(ProjectState.capture())}</div><div><strong>Proposed</strong>${PlanningDrawing.thumbnail(this.pendingAI.project)}</div></div>`,
  );
};
// Object explorer includes editable records for walls, openings and service routes.
const designExplorerRows = DesignUI.explorerRows;
DesignUI.explorerRows = function (query) {
  designExplorerRows.call(this, query);
  const records = [
    ...elements.map((e) => ({
      id: e.id,
      label: e.customName || e.type,
      kind: e.isFurniture ? "furniture" : "room",
    })),
    ...fixtures.map((f) => ({
      id: f.id,
      label: f.tag || f.type,
      kind: "opening",
    })),
    ...PlanningUI.data.walls.map((w) => ({
      id: w.id,
      label: w.label || "Wall",
      kind: "wall",
    })),
    ...PlanningUI.data.services.map((s) => ({
      id: s.id,
      label: s.label || s.kind,
      kind: "service",
    })),
  ].filter((r) =>
    (r.label + " " + r.kind).toLowerCase().includes(query.toLowerCase()),
  );
  document.getElementById("object-rows").insertAdjacentHTML(
    "beforeend",
    "<h3>Opening, wall and service properties</h3>" +
      records
        .map((r) => {
          const props = this.data.objectProperties[r.id] || {};
          return `<div class="planning-record"><input class="explorer-check" type="checkbox" value="${r.id}" aria-label="Select ${this.e(r.kind)}"><strong>${r.kind}</strong><input value="${this.e(props.name || r.label)}" aria-label="Object record name" onchange="DesignUI.recordProperty('${r.id}','name',this.value)"><label><input type="checkbox" ${props.hidden ? "checked" : ""} onchange="DesignUI.recordProperty('${r.id}','hidden',this.checked)">Hide</label><label><input type="checkbox" ${props.locked ? "checked" : ""} onchange="DesignUI.recordProperty('${r.id}','locked',this.checked)">Lock</label></div>`;
        })
        .join(""),
  );
};
DesignUI.recordProperty = function (id, key, value) {
  this.commit("Changed object properties", () => {
    this.data.objectProperties[id] ||= {};
    this.data.objectProperties[id][key] = value;
    const f = fixtures.find((f) => f.id === id),
      w = PlanningUI.data.walls.find((w) => w.id === id),
      s = PlanningUI.data.services.find((s) => s.id === id);
    const element = elements.find((e) => e.id === id);
    if (key === "name") {
      if (element) element.customName = value;
      if (f) f.tag = value;
      if (w) w.label = value;
      if (s) s.label = value;
    }
  });
};
DesignUI.bulkEdit = function () {
  this.run(() => {
    const ids = [...new Set(this.checked())],
      prefix = this.val("bulk-name"),
      material = this.val("bulk-material");
    const width = this.val("bulk-opening-width").trim(),
      height = this.val("bulk-opening-height").trim(),
      group = this.val("bulk-group").trim();
    if (
      this.commit("Bulk updated object properties", () => {
        if (group)
          for (const id of ids) {
            this.data.objectProperties[id] ||= {};
            this.data.objectProperties[id].group = group;
          }
        elements
          .filter((e) => ids.includes(e.id))
          .forEach((e, i) => {
            if (e.locked) throw Error("Unlock selected objects");
            e.customName = prefix + " " + (i + 1);
            e.material = material;
            if (group) e.groupId = group;
          });
        fixtures
          .filter((f) => ids.includes(f.id))
          .forEach((f, i) => {
            f.tag = prefix + " " + (i + 1);
            if (width) f.size = PlanningUI.parse(width);
            if (height) f.height = PlanningUI.parse(height);
          });
        PlanningUI.data.walls
          .filter((w) => ids.includes(w.id))
          .forEach((w, i) => (w.label = prefix + " " + (i + 1)));
        PlanningUI.data.services
          .filter((s) => ids.includes(s.id))
          .forEach((s, i) => (s.label = prefix + " " + (i + 1)));
      })
    )
      this.explorerRows("");
  });
};
const designGuardedCommit = ProjectState.commit;
ProjectState.commit = function (label, mutation) {
  return designGuardedCommit.call(this, label, () => {
    const before = ProjectState.capture();
    mutation();
    for (const [id, props] of Object.entries(
      before.design.objectProperties || {},
    )) {
      if (!props.locked) continue;
      const find = (p) =>
        [
          ...p.elements,
          ...p.fixtures,
          ...p.planning.walls,
          ...p.planning.services,
        ].find((e) => e.id === id);
      if (
        JSON.stringify(find(before)) !==
        JSON.stringify(find(ProjectState.capture()))
      )
        throw Error("Unlock the object record before editing it");
    }
  });
};
const designObjectRender = DesignUI.render;
DesignUI.render = function () {
  designObjectRender.call(this);
  const props = this.data.objectProperties || {};
  for (const e of elements) {
    if (!props[e.id]?.hidden) continue;
    for (const id of [
      "rect-",
      "rect-border-",
      "rect-hollow-",
      "txt-title-",
      "txt-area-",
      "txt-dims-",
    ]) {
      const n = document.getElementById(id + elements.indexOf(e));
      if (n) n.style.display = "none";
    }
  }
  for (const node of document.querySelectorAll("[data-element-id]"))
    if (props[node.dataset.elementId]?.hidden) node.style.display = "none";
  for (const child of Engine3D.buildingGroup?.children || []) {
    if (child.userData.isWall) {
      const wall = ProjectModel.walls(ProjectState.capture()).find(
        (w) => w.id === child.userData.wallId,
      );
      if (wall && pHiddenWall(wall)) child.visible = false;
    }
    const id = child.userData.elementId || child.userData.openingId;
    if (id && props[id]?.hidden) child.visible = false;
  }
};
DesignUI.optimizeZone = function () {
  PlanningUI.run(() => {
    const p = this.p(),
      indices = this.selected(),
      rooms = indices
        .map((i) => p.elements[i])
        .filter((e) => !e.isFurniture && !e.locked);
    if (!rooms.length) throw Error("Select unlocked rooms to optimize");
    const minX = Math.min(...rooms.map((e) => e.x)),
      minY = Math.min(...rooms.map((e) => e.y)),
      maxX = Math.max(...rooms.map((e) => e.x + e.w)),
      maxY = Math.max(...rooms.map((e) => e.y + e.h)),
      others = p.elements.filter(
        (e) => !rooms.some((r) => r.id === e.id) && !e.isFurniture,
      );
    this.zoneCandidates = [];
    for (const order of [
      rooms,
      [...rooms].reverse(),
      [...rooms].sort((a, b) => b.w * b.h - a.w * a.h),
    ]) {
      const next = structuredClone(p),
        placed = [];
      let x = minX,
        y = minY,
        row = 0,
        fit = true;
      for (const source of order) {
        if (x + source.w > maxX + 0.001) {
          x = minX;
          y += row;
          row = 0;
        }
        const target = next.elements.find((e) => e.id === source.id);
        target.x = x;
        target.y = y;
        if (
          target.y + target.h > maxY + 0.001 ||
          others.some(
            (e) => e.floor === target.floor && PlanningModel.overlap(target, e),
          )
        ) {
          fit = false;
          break;
        }
        placed.push(target);
        x += target.w;
        row = Math.max(row, target.h);
      }
      if (fit) this.zoneCandidates.push(next);
    }
    this.dialog(
      "Selected-zone alternatives",
      this.zoneCandidates
        .map(
          (p, i) =>
            `<article class="planning-candidate">${PlanningDrawing.thumbnail(p)}${this.b("Apply selected-zone alternative", `DesignUI.apply(DesignUI.zoneCandidates[${i}],"Optimized selected zone")`)}</article>`,
        )
        .join("") ||
        "<p>No alternative fits within the selected zone without moving protected rooms.</p>",
    );
  });
};
const designRepairDialog = DesignUI.repairDialog;
DesignUI.repairDialog = function () {
  designRepairDialog.call(this);
  document
    .querySelector("#studio-dialog .studio-dialog-body")
    .insertAdjacentHTML(
      "beforeend",
      this.b("Regenerate selected zone only", "DesignUI.optimizeZone()"),
    );
};

DesignUI.setRoomLevel = function (id, value) {
  this.run(() =>
    this.commit("Changed room level", () => {
      this.data.roomProperties[id] ||= {};
      this.data.roomProperties[id].level = PlanningUI.parse(value);
    }),
  );
};
