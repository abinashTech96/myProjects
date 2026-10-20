/* Professional tools use the same transactional history as the original editor. */
const WorkbenchUI = {
  get data() {
    return ProjectState.meta.design.workbench;
  },
  p() {
    return ProjectState.capture();
  },
  e: ProjectModel.escapeHTML,
  b(label, action, cls = "") {
    const e = ProjectModel.escapeHTML;
    return `<button type="button" class="studio-button ${e(cls)}" onclick="${e(action)}">${e(label)}</button>`;
  },
  field: PlanningUI.field.bind(PlanningUI),
  select: PlanningUI.select.bind(PlanningUI),
  val: PlanningUI.val.bind(PlanningUI),
  num: PlanningUI.num.bind(PlanningUI),
  run: PlanningUI.run.bind(PlanningUI),
  length(id) {
    return PlanningUI.parse(this.val(id));
  },
  display(n) {
    return ProjectModel.display(n, StudioUI.unit);
  },
  id() {
    return ProjectModel.uid();
  },
  change(label, fn) {
    return PlanningUI.change(label, fn);
  },
  apply(p, label) {
    return this.change(label, () => ProjectState.apply(p));
  },
  async asyncRun(fn) {
    try {
      return await fn();
    } catch (e) {
      StudioUI.message(e.message, "error");
      return false;
    }
  },
  dialog(title, body) {
    StudioUI.dialog(title, `<div class="wb-content">${body}</div>`);
  },
  result(html) {
    const target = document.getElementById("wb-result");
    if (target) target.innerHTML = html;
  },
  room() {
    const e = elements[selectedElIndex];
    if (!e || e.isFurniture) throw Error("Select a room first");
    return e;
  },
  selected() {
    return DesignUI.selected().map((i) => elements[i].id);
  },
  rooms() {
    return elements
      .filter((e) => !e.isFurniture)
      .map((e) => [e.id, (e.customName || e.type) + " · F" + e.floor]);
  },
  wallOptions() {
    return DesignUI.wallOptions();
  },
  tools() {
    return [
      ["Build", "Wall faces & assemblies", () => this.wallDialog()],
      ["Inspect", "Constraint diagnostics", () => this.constraintDialog()],
      ["Build", "Site boundary & setbacks", () => this.siteDialog()],
      ["Build", "Building levels & voids", () => this.levelDialog()],
      ["Build", "Linked door/window types", () => this.openingDialog()],
      ["Build", "Advanced stairs & ramps", () => this.stairDialog()],
      ["Build", "Lifts & service shafts", () => this.shaftDialog()],
      ["Build", "Structural grid", () => this.structureDialog()],
      ["Build", "Bathroom & kitchen planner", () => this.interiorDialog()],
      ["Build", "Furniture optimization", () => this.furnitureDialog()],
      ["Build", "Custom furniture catalog", () => this.assetDialog()],
      ["Build", "Linked assemblies", () => this.componentDialog()],
      ["Build", "Facade alignment", () => this.facadeDialog()],
      ["Build", "Outdoor & boundary design", () => this.outdoorDialog()],
      ["Inspect", "Terrain & earthwork", () => this.terrainDialog()],
      ["Inspect", "Roof water collection", () => this.rainDialog()],
      ["Inspect", "Solar panel layout", () => this.solarDialog()],
      ["Inspect", "3D service coordination", () => this.serviceDialog()],
      ["View", "Design options", () => this.optionDialog()],
      ["View", "3D editing & inspection", () => this.viewDialog()],
      ["Utilities", "PDF & scanned plan import", () => this.importDialog()],
      [
        "Utilities",
        "Material & procurement planning",
        () => this.procurementDialog(),
      ],
      ["Utilities", "Cutting optimization", () => this.cuttingDialog()],
      ["Utilities", "Construction details", () => this.detailDialog()],
      ["View", "Review issues & markup", () => this.issueDialog()],
      ["View", "Custom object properties", () => this.propertyDialog()],
      ["Utilities", "Action macros", () => this.macroDialog()],
      ["View", "Language & accessibility", () => this.preferenceDialog()],
      [
        "Utilities",
        "Cloud connection & offline queue",
        () => WorkbenchSync.dialog(),
      ],
      ["View", "Client presentation export", () => this.presentationDialog()],
    ];
  },
  init() {
    const oldTools = PlanningUI.tools,
      oldActions = PlanningUI.toolActions;
    PlanningUI.tools = () => [
      ...oldTools.call(PlanningUI),
      ...this.tools().map((t) => [t[0], t[1], "WorkbenchUI"]),
    ];
    PlanningUI.toolActions = () => [
      ...oldActions.call(PlanningUI),
      ...this.tools().map((t) => t[2]),
    ];
    document
      .querySelector(".planning-entry")
      .insertAdjacentHTML("beforeend", this.b("Pro", "WorkbenchUI.menu()"));
    const toolbar = document.createElement("div");
    toolbar.id = "wb-context-toolbar";
    toolbar.setAttribute("aria-label", "Selection actions");
    document.body.append(toolbar);
    AppEvents.onSelectionChange(() => this.context());
    AppEvents.onStateChange(() => {
      this.context();
      WorkbenchDrawing?.render();
    });
    this.context();
    this.loadPreferences();
  },
  menu() {
    this.dialog(
      "Professional workbench",
      `<p>Select an object for direct actions, or choose a workflow.</p><div class="wb-tool-grid">${this.tools()
        .map((t, i) => this.b(t[1], `WorkbenchUI.launch(${i})`))
        .join("")}</div>`,
    );
  },
  launch(i) {
    document.getElementById("studio-dialog")?.close();
    return this.tools()[i][2]();
  },
  context() {
    const bar = document.getElementById("wb-context-toolbar");
    if (!bar) return;
    const e = elements[selectedElIndex],
      target = typeof Workbench3D !== "undefined" ? Workbench3D.target : null;
    if (!e && !target) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    let buttons;
    if (target?.kind === "wall")
      buttons =
        this.b("Face / thickness", "WorkbenchUI.wallDialog()") +
        this.b("3D move", 'Workbench3D.enableEdit("translate")');
    else if (target?.kind === "opening")
      buttons =
        this.b("Opening type", "WorkbenchUI.openingDialog()") +
        this.b("Resize in 3D", 'Workbench3D.enableEdit("scale")');
    else
      buttons =
        this.b("Move", "DesignUI.transformDialog()") +
        this.b("3D edit", 'Workbench3D.enableEdit("translate")') +
        (e?.isFurniture
          ? this.b("Furniture fit", "WorkbenchUI.furnitureDialog()")
          : this.b("Interiors", "WorkbenchUI.interiorDialog()")) +
        this.b("Duplicate", 'Selection.action("Duplicate")');
    bar.innerHTML = `<strong>${this.e(e?.customName || e?.type || target?.kind || "Selection")}</strong>${buttons}${this.b("Isolate", "Workbench3D.isolateSelection()")}${this.b("More", "DesignUI.contextDialog()")}`;
  },
  wallDialog() {
    const p = this.p(),
      types = this.data.assemblies.map((a) => [a.id, a.name]);
    this.dialog(
      "Wall faces and material assemblies",
      `${this.select("wb-wall", "Wall", this.wallOptions(), Workbench3D?.target?.kind === "wall" ? Workbench3D.target.id : "")}${this.select(
        "wb-wall-mode",
        "Operation",
        [
          ["centre", "Move centreline"],
          ["face", "Move one face; preserve opposite face"],
          ["thickness", "Set thickness; preserve centreline"],
        ],
        "face",
      )}${this.select(
        "wb-wall-side",
        "Moving face",
        [
          ["left", "Left of wall direction"],
          ["right", "Right of wall direction"],
        ],
        "left",
      )}${this.field("wb-wall-distance", "Distance / thickness (" + StudioUI.unit + ")", this.display(1))}${this.b("Preview wall edit", "WorkbenchUI.previewFace()", "primary")}<div id="wb-result"></div><hr><p>Assembly layers: material, thickness in ${StudioUI.unit}, rate per cubic foot, waste %.</p>${this.field("wb-assembly-name", "Assembly name", "Brick with plaster")}<textarea id="wb-assembly-layers">Plaster,${this.display(0.5)},0,5\nBrick,${this.display(8)},0,5\nPlaster,${this.display(0.5)},0,5</textarea>${this.b("Save assembly", "WorkbenchUI.saveAssembly()")}${this.select("wb-assembly-type", "Saved assembly", types, types[0]?.[0] || "")}${this.b("Assign assembly to wall", "WorkbenchUI.assignAssembly()")}${this.b("Material takeoff", "WorkbenchUI.materialDialog()")}`,
    );
  },
  previewFace() {
    this.run(() => {
      this.pending = WorkbenchModel.faceEdit(
        this.p(),
        this.val("wb-wall"),
        this.length("wb-wall-distance"),
        this.val("wb-wall-mode"),
        this.val("wb-wall-side"),
      );
      this.pendingBase = JSON.stringify(this.p());
      this.result(
        PlanningDrawing.thumbnail(this.pending) +
          this.b(
            "Apply wall edit",
            'WorkbenchUI.applyPending("Edited wall face")',
            "primary",
          ),
      );
    });
  },
  applyPending(label) {
    this.run(() => {
      if (!this.pending || JSON.stringify(this.p()) !== this.pendingBase)
        throw Error("Project changed; regenerate the preview");
      if (this.apply(this.pending, label)) {
        this.pending = null;
        document.getElementById("studio-dialog")?.close();
      }
    });
  },
  saveAssembly() {
    this.run(() => {
      const layers = this.val("wb-assembly-layers")
        .trim()
        .split("\n")
        .map((line) => {
          const [material, t, rate = "0", waste = "0"] = line.split(",");
          return {
            material: material.trim(),
            thickness: PlanningUI.parse(t.trim()),
            rate: Number(rate),
            waste: Number(waste),
          };
        });
      if (
        this.change("Saved wall assembly", () =>
          this.data.assemblies.push({
            id: this.id(),
            name: this.val("wb-assembly-name"),
            layers,
          }),
        )
      )
        this.wallDialog();
    });
  },
  assignAssembly() {
    this.run(() => {
      if (
        this.apply(
          WorkbenchModel.assignAssembly(
            this.p(),
            [this.val("wb-wall")],
            this.val("wb-assembly-type"),
          ),
          "Assigned wall assembly",
        )
      )
        this.wallDialog();
    });
  },
  materialDialog() {
    const rows = WorkbenchModel.materialTakeoff(this.p());
    this.dialog(
      "Material quantities by wall layer",
      this.table(
        [
          "Material",
          "Floor",
          "Net sq ft",
          "Cubic ft",
          "Order cubic ft",
          "Cost",
        ],
        rows.map((r) => [
          r.material,
          r.floor,
          r.area.toFixed(2),
          r.volume.toFixed(2),
          r.orderVolume.toFixed(2),
          r.cost.toFixed(2),
        ]),
      ) + this.b("Export material CSV", "WorkbenchUI.materialCSV()"),
    );
  },
  materialCSV() {
    DesignIO.csv(
      [
        [
          "Material",
          "Floor",
          "Wall",
          "Area sqft",
          "Volume ft3",
          "Order ft3",
          "Cost",
        ],
        ...WorkbenchModel.materialTakeoff(this.p()).map((r) => [
          r.material,
          r.floor,
          r.wall,
          r.area,
          r.volume,
          r.orderVolume,
          r.cost,
        ]),
      ],
      "ArchCAD_Materials.csv",
    );
  },
  table(headers, rows) {
    return `<div class="wb-table-scroll"><table><thead><tr>${headers.map((h) => `<th>${this.e(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${this.e(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  },
  constraintDialog() {
    const findings = WorkbenchModel.diagnostics(this.p());
    this.dialog(
      "Constraint diagnostics",
      findings.length
        ? findings
            .map(
              (r, i) =>
                `<article><strong>${this.e(r.reason)}</strong><p>${this.e(r.fix)}</p>${this.b("Highlight affected objects", `WorkbenchUI.focusConstraint(${i})`)}${r.id ? this.b("Remove controlling rule", `WorkbenchUI.removeConstraint('${r.id}')`) : ""}</article>`,
            )
            .join("")
        : "<p>No missing references, duplicate target controls or dependency cycles found.</p>",
    );
  },
  focusConstraint(i) {
    const row = WorkbenchModel.diagnostics(this.p())[i];
    DesignUI.overlay = ProjectModel.walls(this.p())
      .filter((w) =>
        w.owners.some(
          (o) =>
            row.related.includes(o.wallId) ||
            row.related.includes(elements[o.index]?.id),
        ),
      )
      .map((w) => ({ a: w.a, b: w.b, color: "#fb7185" }));
    Selection.ids = new Set(
      row.related.filter((id) => elements.some((e) => e.id === id)),
    );
    AppEvents.triggerSelectionChange();
    DesignUI.render();
  },
  removeConstraint(id) {
    if (
      this.change(
        "Removed geometric constraint",
        () =>
          (ProjectState.meta.design.constraints =
            ProjectState.meta.design.constraints.filter((c) => c.id !== id)),
      )
    )
      this.constraintDialog();
  },
  siteDialog() {
    const s = this.data.site,
      ps = WorkbenchModel.boundary(this.p());
    this.dialog(
      "Site polygon and buildable envelope",
      `<p>Boundary points in ${StudioUI.unit}; one X,Y pair per line. Geometry remains in the existing plot coordinate system.</p><textarea id="wb-site-points">${ps.map((q) => this.display(q.x) + "," + this.display(q.y)).join("\n")}</textarea>${this.field("wb-site-setback", "Uniform setback (" + StudioUI.unit + ")", this.display(s.setback))}<label><input id="wb-site-enforce" type="checkbox" ${s.enforce ? "checked" : ""}>Reject changed objects outside the buildable polygon</label>${this.b("Preview site", "WorkbenchUI.previewSite()", "primary")}<div id="wb-result"></div>`,
    );
  },
  points(value) {
    return value
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [x, y, z] = line.split(",");
        return {
          x: PlanningUI.parse(x.trim()),
          y: PlanningUI.parse(y.trim()),
          ...(z === undefined ? {} : { z: PlanningUI.parse(z.trim()) }),
        };
      });
  },
  previewSite() {
    this.run(() => {
      const p = this.p();
      p.design.workbench.site = {
        boundary: this.points(this.val("wb-site-points")),
        setback: this.length("wb-site-setback"),
        enforce: document.getElementById("wb-site-enforce").checked,
      };
      this.pending = ProjectModel.normalize(p);
      this.pendingBase = JSON.stringify(this.p());
      const area =
          DesignModel.geomArea(WorkbenchModel.buildable(this.pending)) / 144,
        issues = WorkbenchModel.siteFindings(this.pending);
      this.result(
        `<p>Site ${PlanningModel.area(WorkbenchModel.boundary(this.pending)) / 144} sq ft · Buildable ${area.toFixed(2)} sq ft · ${issues.length} existing objects outside.</p>${WorkbenchDrawing.siteSVG(this.pending)}${this.b("Apply site boundary", 'WorkbenchUI.applyPending("Changed site boundary")', "primary")}`,
      );
    });
  },
  levelDialog() {
    const p = this.p();
    this.dialog(
      "Floor elevations, split levels and slab openings",
      `<p>Use negative elevations for basements. Room level offsets remain editable in the object schedule.</p><div class="wb-levels">${Array.from({ length: p.floorCount }, (_, f) => `<fieldset data-level="${f}"><legend>Floor ${f}</legend>${this.field("wb-level-base-" + f, "Base elevation (" + StudioUI.unit + ")", this.display(WorkbenchModel.floorBase(p, f)))}${this.field("wb-level-height-" + f, "Floor height (" + StudioUI.unit + ")", this.display(WorkbenchModel.floorHeight(p, f)))}</fieldset>`).join("")}</div>${this.b("Apply floor levels", "WorkbenchUI.saveLevels()", "primary")}<hr>${this.field("wb-void-name", "Opening / double-height label", "Double-height void")}${this.field("wb-void-from", "Lower floor", 0, "number")}${this.field("wb-void-to", "Upper floor", Math.min(1, p.floorCount), "number")}<textarea id="wb-void-points">${this.display(30)},${this.display(30)}\n${this.display(90)},${this.display(30)}\n${this.display(90)},${this.display(90)}\n${this.display(30)},${this.display(90)}</textarea>${this.b("Add slab opening", "WorkbenchUI.addVoid()")}${this.records("voids")}`,
    );
  },
  saveLevels() {
    this.run(() =>
      this.change(
        "Changed building floor datums",
        () =>
          (this.data.levels = Array.from(
            { length: this.p().floorCount },
            (_, floor) => ({
              id: this.id(),
              floor,
              base: this.length("wb-level-base-" + floor),
              height: this.length("wb-level-height-" + floor),
            }),
          )),
      ),
    );
  },
  addVoid() {
    this.run(() => {
      if (
        this.change("Added vertical slab opening", () =>
          this.data.voids.push({
            id: this.id(),
            name: this.val("wb-void-name"),
            from: this.num("wb-void-from"),
            to: this.num("wb-void-to"),
            points: this.points(this.val("wb-void-points")),
          }),
        )
      )
        this.levelDialog();
    });
  },
  records(key) {
    return this.data[key]
      .map(
        (r) =>
          `<div class="planning-record"><span>${this.e(r.name || r.kind || r.id)}</span>${this.b("Remove", `WorkbenchUI.removeRecord('${key}','${r.id}')`)}</div>`,
      )
      .join("");
  },
  removeRecord(key, id) {
    const allowed = [
      "voids",
      "ramps",
      "shafts",
      "structure",
      "interiors",
      "outdoors",
      "services3d",
      "issues",
      "markups",
      "measurements",
      "procurement",
      "macros",
      "options",
    ];
    if (!allowed.includes(key)) return;
    this.change(
      "Removed " + key + " record",
      () => (this.data[key] = this.data[key].filter((r) => r.id !== id)),
    );
    this.menu();
  },
  openingDialog() {
    const fs = fixtures.map((f) => [
      f.id,
      (f.tag || f.type) +
        " · " +
        (elements[f.roomId].customName || elements[f.roomId].type),
    ]);
    this.dialog(
      "Reusable opening types and overrides",
      `${this.field("wb-type-name", "Type name", "D-900")}${this.select("wb-type-kind", "Opening kind", ["door", "window"], "door")}${this.field("wb-type-width", "Width (" + StudioUI.unit + ")", this.display(36))}${this.field("wb-type-height", "Height (" + StudioUI.unit + ")", this.display(80))}${this.field("wb-type-sill", "Sill (" + StudioUI.unit + ")", this.display(0))}${this.b("Create opening type", "WorkbenchUI.saveOpeningType()")}<hr>${this.select(
        "wb-opening-type",
        "Saved type",
        this.data.openingTypes.map((t) => [t.id, t.name]),
        this.data.openingTypes[0]?.id || "",
      )}${this.select("wb-opening", "Opening", fs, Workbench3D?.target?.kind === "opening" ? Workbench3D.target.id : fs[0]?.[0] || "")}<label><input id="wb-override-size" type="checkbox">Keep individual width override</label>${this.b("Link opening to type", "WorkbenchUI.linkOpening()")}${this.b("Update type from form & linked instances", "WorkbenchUI.updateOpening()")}<div id="wb-result"></div>${this.table(
        ["Type", "Kind", "Width", "Height", "Linked"],
        this.data.openingTypes.map((t) => [
          t.name,
          t.kind,
          this.display(t.width),
          this.display(t.height),
          Object.values(this.data.openingLinks).filter((l) => l.type === t.id)
            .length,
        ]),
      )}`,
    );
  },
  openingForm() {
    return {
      name: this.val("wb-type-name"),
      kind: this.val("wb-type-kind"),
      width: this.length("wb-type-width"),
      height: this.length("wb-type-height"),
      sill: this.length("wb-type-sill"),
    };
  },
  saveOpeningType() {
    this.run(() => {
      if (
        this.change("Created reusable opening type", () =>
          this.data.openingTypes.push({ id: this.id(), ...this.openingForm() }),
        )
      )
        this.openingDialog();
    });
  },
  linkOpening() {
    this.run(() =>
      this.apply(
        WorkbenchModel.applyOpeningType(
          this.p(),
          this.val("wb-opening-type"),
          [this.val("wb-opening")],
          document.getElementById("wb-override-size").checked ? ["size"] : [],
        ),
        "Linked opening type",
      ),
    );
  },
  updateOpening() {
    this.run(() =>
      this.apply(
        WorkbenchModel.updateOpeningType(this.p(), {
          id: this.val("wb-opening-type"),
          ...this.openingForm(),
        }),
        "Updated linked opening instances",
      ),
    );
  },
  stairDialog() {
    const room = elements[selectedElIndex],
      s = this.data.stairs[room?.id] || {
        style: "u-shape",
        width: 36,
        rise: WorkbenchModel.floorHeight(this.p(), currentFloor),
        riser: 7.5,
        tread: 10,
        landing: 36,
        turnSteps: 3,
      };
    this.dialog(
      "Parametric stairs and accessible ramp planning",
      `${this.select(
        "wb-stair-room",
        "Stair element",
        elements
          .filter((e) => e.type === "staircase")
          .map((e) => [e.id, e.customName || e.id]),
        room?.type === "staircase" ? room.id : "",
      )}${this.select("wb-stair-style", "Shape", ["straight", "l-shape", "u-shape", "winder"], s.style)}<div class="studio-field-grid">${["width", "rise", "riser", "tread", "landing"].map((k) => this.field("wb-stair-" + k, k + " (" + StudioUI.unit + ")", this.display(s[k]))).join("")}${this.field("wb-stair-turn", "Winder step count", s.turnSteps, "number")}</div>${this.b("Preview staircase", "WorkbenchUI.previewStair()", "primary")}<div id="wb-result"></div><hr><h3>Ramp</h3>${["x", "y", "width", "rise", "maxRun", "landing"].map((k) => this.field("wb-ramp-" + k, k + " (" + StudioUI.unit + ")", this.display({ x: 20, y: 20, width: 36, rise: 12, maxRun: 240, landing: 60 }[k]))).join("")}${this.field("wb-ramp-ratio", "Slope denominator (1:N)", 12, "number")}${this.b("Preview ramp", "WorkbenchUI.previewRamp()")}${this.records("ramps")}`,
    );
  },
  stairForm() {
    return {
      style: this.val("wb-stair-style"),
      ...Object.fromEntries(
        ["width", "rise", "riser", "tread", "landing"].map((k) => [
          k,
          this.length("wb-stair-" + k),
        ]),
      ),
      turnSteps: this.num("wb-stair-turn"),
    };
  },
  previewStair() {
    this.run(() => {
      const s = this.stairForm(),
        g = WorkbenchModel.stairs(s),
        p = this.p(),
        e = p.elements.find((e) => e.id === this.val("wb-stair-room"));
      if (!e) throw Error("Add/select a staircase element first");
      if (e.locked) throw Error("Unlock the staircase");
      p.design.workbench.stairs[e.id] = s;
      e.stairDesign = {
        rise: s.rise,
        riser: s.riser,
        tread: s.tread,
        landing: s.landing,
        headroom: e.stairDesign?.headroom || 80,
      };
      e.stairStyle = s.style;
      const sideways = ["left", "right"].includes(e.dir);
      e.w = sideways ? g.depth : g.width;
      e.h = sideways ? g.width : g.depth;
      this.pending = ProjectModel.normalize(p);
      this.pendingBase = JSON.stringify(this.p());
      this.result(
        `<p>${g.count} risers · actual ${this.display(g.riser)} · footprint ${this.display(g.width)} × ${this.display(g.depth)} · walkline tread ${this.display(g.walklineTread)}</p>${WorkbenchDrawing.polygonsSVG(g.treads.map((t) => ({ points: t.points, label: t.step })))}${this.b("Apply stair and footprint", 'WorkbenchUI.applyPending("Designed parametric stair")', "primary")}`,
      );
    });
  },
  rampForm() {
    return {
      id: this.id(),
      name: "Ramp",
      floor: currentFloor,
      ...Object.fromEntries(
        ["x", "y", "width", "rise", "maxRun", "landing"].map((k) => [
          k,
          this.length("wb-ramp-" + k),
        ]),
      ),
      ratio: this.num("wb-ramp-ratio"),
    };
  },
  previewRamp() {
    this.run(() => {
      const r = this.rampForm(),
        g = WorkbenchModel.ramp(r),
        p = this.p();
      p.design.workbench.ramps.push(r);
      this.pending = ProjectModel.normalize(p);
      this.pendingBase = JSON.stringify(this.p());
      this.result(
        `<p>${g.count} flights · total run ${this.display(g.run)} · footprint ${this.display(g.width)} × ${this.display(g.depth)} · slope 1:${r.ratio}</p>${WorkbenchDrawing.polygonsSVG([...g.flights, ...g.landings])}${this.b("Apply ramp", 'WorkbenchUI.applyPending("Added ramp")')}`,
      );
    });
  },
  shaftDialog() {
    this.dialog(
      "Lifts and vertical service shafts",
      `${this.select("wb-shaft-kind", "Shaft", ["lift", "service"], "lift")}${["x", "y", "w", "h"].map((k) => this.field("wb-shaft-" + k, k + " (" + StudioUI.unit + ")", this.display(["w", "h"].includes(k) ? 72 : 20))).join("")}${this.field("wb-shaft-from", "Start floor", 0, "number")}${this.field("wb-shaft-to", "Upper level", this.p().floorCount, "number")}${this.field("wb-shaft-door", "Door clear width (" + StudioUI.unit + ")", this.display(36))}${this.b("Add shaft and slab openings", "WorkbenchUI.addShaft()", "primary")}${this.records("shafts")}`,
    );
  },
  addShaft() {
    this.run(() => {
      if (
        this.change("Added coordinated shaft", () =>
          this.data.shafts.push({
            id: this.id(),
            name: this.val("wb-shaft-kind") + " shaft",
            kind: this.val("wb-shaft-kind"),
            ...Object.fromEntries(
              ["x", "y", "w", "h"].map((k) => [
                k,
                this.length("wb-shaft-" + k),
              ]),
            ),
            from: this.num("wb-shaft-from"),
            to: this.num("wb-shaft-to"),
            doorWidth: this.length("wb-shaft-door"),
          }),
        )
      )
        this.shaftDialog();
    });
  },
  structureDialog() {
    this.dialog(
      "Structural grids and floor coordination",
      `<p>Enter grid coordinates in ${StudioUI.unit}, separated by commas.</p>${this.field("wb-grid-x", "X grids", "20,140,260")}${this.field("wb-grid-y", "Y grids", "20,140,260")}${this.field("wb-grid-floors", "Floors", "0")}${this.field("wb-column-width", "Column width (" + StudioUI.unit + ")", this.display(12))}${this.field("wb-column-depth", "Column depth (" + StudioUI.unit + ")", this.display(12))}${this.field("wb-beam-depth", "Beam depth (" + StudioUI.unit + ")", this.display(18))}${this.b("Preview grid members", "WorkbenchUI.previewStructure()", "primary")}<div id="wb-result"></div><hr><h3>Individual structural member</h3>${this.select("wb-member-kind", "Member", ["column", "beam", "slab"], "slab")}${["x", "y", "w", "h", "base", "height"].map((k) => this.field("wb-member-" + k, k + " (" + StudioUI.unit + ")", this.display({ x: 20, y: 20, w: 144, h: 144, base: 0, height: 6 }[k]))).join("")}${this.b("Add structural member", "WorkbenchUI.addMember()")}${this.records("structure")}`,
    );
  },
  addMember() {
    this.run(() => {
      if (
        this.change("Added structural member", () =>
          this.data.structure.push({
            id: this.id(),
            name: this.val("wb-member-kind"),
            kind: this.val("wb-member-kind"),
            floor: currentFloor,
            ...Object.fromEntries(
              ["x", "y", "w", "h", "base", "height"].map((k) => [
                k,
                this.length("wb-member-" + k),
              ]),
            ),
          }),
        )
      )
        this.structureDialog();
    });
  },
  previewStructure() {
    this.run(() => {
      this.pending = WorkbenchModel.structureGrid(this.p(), {
        xs: this.val("wb-grid-x")
          .split(",")
          .map((v) => PlanningUI.parse(v)),
        ys: this.val("wb-grid-y")
          .split(",")
          .map((v) => PlanningUI.parse(v)),
        floors: this.val("wb-grid-floors").split(",").map(Number),
        width: this.length("wb-column-width"),
        depth: this.length("wb-column-depth"),
        beamDepth: this.length("wb-beam-depth"),
      });
      this.pendingBase = JSON.stringify(this.p());
      this.result(
        `<p>${this.pending.design.workbench.structure.length} members · ${WorkbenchModel.structureChecks(this.pending).length} alignment findings. This is a coordination model.</p>${WorkbenchDrawing.polygonsSVG(this.pending.design.workbench.structure.map((s) => ({ points: PlanningModel.points(s), label: s.kind })))}${this.b("Apply structural members", 'WorkbenchUI.applyPending("Added structural grid")')}`,
      );
    });
  },
  interiorDialog() {
    const first = elements[selectedElIndex]?.id || this.rooms()[0]?.[0] || "";
    this.dialog(
      "Bathroom and kitchen layout planner",
      `${this.select("wb-interior-room", "Room", this.rooms(), first)}${this.select("wb-interior-kind", "Layout", ["bathroom", "kitchen"], "bathroom")}${this.select("wb-kitchen-shape", "Kitchen shape", ["straight", "l-shape"], "straight")}${this.field("wb-kitchen-modules", "Kitchen modules", 5, "number")}${this.field("wb-kitchen-width", "Module width (" + StudioUI.unit + ")", this.display(24))}${this.field("wb-interior-clearance", "Front clearance (" + StudioUI.unit + ")", this.display(24))}${this.b("Generate layout preview", "WorkbenchUI.previewInterior()", "primary")}<div id="wb-result"></div>${this.data.interiors.map((l, i) => `<p>${this.e(l.name)} ${this.b("Edit items", `WorkbenchUI.editInterior(${i})`)}</p>`).join("")}`,
    );
  },
  previewInterior() {
    this.run(() => {
      const result =
        this.val("wb-interior-kind") === "bathroom"
          ? WorkbenchModel.bathroom(this.p(), this.val("wb-interior-room"), {
              clearance: this.length("wb-interior-clearance"),
            })
          : WorkbenchModel.kitchen(this.p(), this.val("wb-interior-room"), {
              modules: this.num("wb-kitchen-modules"),
              moduleWidth: this.length("wb-kitchen-width"),
              shape: this.val("wb-kitchen-shape"),
            });
      this.pendingInterior = result.layout;
      this.pendingInteriorBase = JSON.stringify(this.p());
      this.result(
        WorkbenchDrawing.polygonsSVG(
          result.layout.items.map((i) => ({
            points: PlanningModel.points(i),
            label: i.type,
          })),
        ) +
          `<p>${result.findings.length} fit/clearance findings.</p>${result.findings.map((f) => `<p>${this.e(f.text)}</p>`).join("")}${this.b("Save reviewed layout", "WorkbenchUI.saveInterior()")}`,
      );
    });
  },
  saveInterior() {
    this.run(() => {
      if (this.pendingInteriorBase !== JSON.stringify(this.p()))
        throw Error("Project changed; regenerate the layout");
      if (
        this.change("Saved interior layout", () =>
          this.data.interiors.push(this.pendingInterior),
        )
      )
        this.editInterior(this.data.interiors.length - 1);
    });
  },
  editInterior(index) {
    const l = this.data.interiors[index];
    this.interiorIndex = index;
    this.dialog(
      "Edit interior dimensions",
      `<p>${this.e(l.name)}. Coordinates use ${StudioUI.unit}.</p><div class="wb-table-scroll"><table><tr><th>Item</th>${["x", "y", "w", "h", "height", "base", "clearance"].map((k) => `<th>${k}</th>`).join("")}</tr>${l.items.map((item, i) => `<tr><td>${this.e(item.type)}</td>${["x", "y", "w", "h", "height", "base", "clearance"].map((k) => `<td><input aria-label="${item.type} ${k}" value="${this.e(this.display(item[k] || 0))}" onchange="WorkbenchUI.editInteriorItem(${index},${i},'${k}',this.value)"></td>`).join("")}</tr>`).join("")}</table></div>${this.b("Check clearances", "WorkbenchUI.checkInterior()")}<div id="wb-result"></div>`,
    );
  },
  editInteriorItem(l, i, k, value) {
    this.run(() =>
      this.change(
        "Edited interior item",
        () => (this.data.interiors[l].items[i][k] = PlanningUI.parse(value)),
      ),
    );
  },
  checkInterior() {
    this.result(
      WorkbenchModel.interiorChecks(
        this.p(),
        this.data.interiors[this.interiorIndex],
      )
        .map((f) => `<p>${this.e(f.text)}</p>`)
        .join("") ||
        "<p>Boundary, overlap, door-swing and front-clearance checks passed.</p>",
    );
  },
  furnitureDialog() {
    this.dialog(
      "Generate furniture arrangements",
      `${this.select("wb-furniture-room", "Room", this.rooms(), elements[selectedElIndex]?.id || this.rooms()[0]?.[0] || "")}${this.field("wb-furniture-gap", "Spacing between furniture (" + StudioUI.unit + ")", this.display(12))}${this.b("Generate arrangements", "WorkbenchUI.optimizeFurniture()", "primary")}<div id="wb-result"></div>`,
    );
  },
  optimizeFurniture() {
    this.run(() => {
      this.furnitureCandidates = WorkbenchModel.furnitureAlternatives(
        this.p(),
        this.val("wb-furniture-room"),
        { clearance: this.length("wb-furniture-gap") },
      );
      this.furnitureBase = JSON.stringify(this.p());
      this.result(
        this.furnitureCandidates
          .map((c, i) =>
            c.error
              ? `<p>${this.e(c.error)}</p>`
              : `<article>${PlanningDrawing.thumbnail(c.project)}<p>Access route ${c.circulation ? "found" : "not found"} · ${this.e(c.warning || "")}</p>${this.b("Apply arrangement", `WorkbenchUI.applyFurniture(${i})`)}</article>`,
          )
          .join(""),
      );
    });
  },
  applyFurniture(i) {
    this.pending = this.furnitureCandidates[i].project;
    this.pendingBase = this.furnitureBase;
    this.applyPending("Optimized furniture arrangement");
  },
  assetDialog() {
    this.dialog(
      "Personal furniture model catalog",
      `<p>Import an embedded GLB below 3 MB. Set real dimensions before placing.</p><input id="wb-asset-file" type="file" accept=".glb" onchange="WorkbenchFiles.importAsset(this.files[0])">${this.select(
        "wb-asset",
        "Model",
        this.data.assets.map((a) => [a.id, a.name]),
        this.data.assets[0]?.id || "",
      )}${["w", "h", "depth"].map((k) => this.field("wb-asset-" + k, k + " (" + StudioUI.unit + ")", this.display(k === "h" ? 36 : 48))).join("")}${this.field("wb-asset-x", "X (" + StudioUI.unit + ")", this.display(30))}${this.field("wb-asset-y", "Y (" + StudioUI.unit + ")", this.display(30))}${this.b("Place selected model", "WorkbenchUI.placeAsset()", "primary")}`,
    );
  },
  placeAsset() {
    this.run(() => {
      const asset = this.data.assets.find((a) => a.id === this.val("wb-asset"));
      if (!asset) throw Error("Import a GLB first");
      this.change("Placed imported furniture", () =>
        elements.push({
          id: this.id(),
          type: "custom-model",
          customName: asset.name,
          isFurniture: true,
          assetId: asset.id,
          floor: currentFloor,
          x: this.length("wb-asset-x"),
          y: this.length("wb-asset-y"),
          w: this.length("wb-asset-w"),
          h: this.length("wb-asset-depth"),
          customHeight: this.length("wb-asset-h"),
          rot: 0,
        }),
      );
    });
  },
  componentDialog() {
    this.dialog(
      "Linked component assemblies",
      `${this.field("wb-component-name", "Assembly name", "Kitchen module")}${this.b("Create from selected objects", "WorkbenchUI.saveComponent()")}${this.select(
        "wb-component",
        "Saved assembly",
        this.data.components.map((c) => [c.id, c.name]),
        this.data.components[0]?.id || "",
      )}${this.field("wb-component-x", "Placement X (" + StudioUI.unit + ")", this.display(180))}${this.field("wb-component-y", "Placement Y (" + StudioUI.unit + ")", this.display(20))}${this.b("Place linked instance", "WorkbenchUI.placeComponent()", "primary")}${this.b("Update definition from selection", "WorkbenchUI.updateComponent()")}<p>Updating the definition updates linked placements atomically. Locked members prevent the update.</p>`,
    );
  },
  saveComponent() {
    this.run(() => {
      const c = WorkbenchModel.componentFrom(
        this.p(),
        this.selected(),
        this.val("wb-component-name"),
      );
      if (
        this.change("Created linked component", () =>
          this.data.components.push(c),
        )
      )
        this.componentDialog();
    });
  },
  placeComponent() {
    this.run(() =>
      this.apply(
        WorkbenchModel.placeComponent(
          this.p(),
          this.val("wb-component"),
          this.length("wb-component-x"),
          this.length("wb-component-y"),
          currentFloor,
        ),
        "Placed linked component",
      ),
    );
  },
  updateComponent() {
    this.run(() => {
      const id = this.val("wb-component"),
        c = WorkbenchModel.componentFrom(
          this.p(),
          this.selected(),
          this.val("wb-component-name"),
        );
      const instance = this.data.instances.find(
        (i) =>
          i.component === id &&
          i.members.every((m) => this.selected().includes(m.id)),
      );
      if (instance) {
        const ids = new Map(instance.members.map((m) => [m.id, m.source])),
          fixtures = new Map(
            (instance.fixtureMembers || []).map((m) => [m.id, m.source]),
          );
        c.elements.forEach((e) => {
          e.id = ids.get(e.id) || e.id;
        });
        c.fixtures.forEach((f) => {
          f.id = fixtures.get(f.id) || f.id;
          f.roomUid = ids.get(f.roomUid) || f.roomUid;
        });
      }
      c.id = id;
      this.apply(
        WorkbenchModel.updateComponent(this.p(), c),
        "Updated all linked components",
      );
    });
  },
  facadeDialog() {
    this.dialog(
      "Facade opening alignment and rails",
      `<p>Select two or more openings. The first checked opening supplies the reference.</p>${fixtures.map((f) => `<label><input class="wb-facade-opening" type="checkbox" value="${f.id}">${this.e(f.tag || f.type)} · F${elements[f.roomId].floor}</label>`).join("")}${this.select("wb-facade-mode", "Align", ["sill", "head", "width", "centre"], "head")}${this.b("Preview alignment", "WorkbenchUI.previewFacade()", "primary")}${this.field("wb-rail-height", "Balcony rail height (" + StudioUI.unit + ")", this.display(this.data.facade.railHeight))}${this.b("Apply balcony rail height", "WorkbenchUI.saveRails()")}<div id="wb-result"></div>`,
    );
  },
  previewFacade() {
    this.run(() => {
      this.pending = WorkbenchModel.alignOpenings(
        this.p(),
        [...document.querySelectorAll(".wb-facade-opening:checked")].map(
          (n) => n.value,
        ),
        this.val("wb-facade-mode"),
      );
      this.pendingBase = JSON.stringify(this.p());
      this.result(
        DesignIO.projectedElevation(this.pending, "front") +
          this.b(
            "Apply facade alignment",
            'WorkbenchUI.applyPending("Aligned facade openings")',
          ),
      );
    });
  },
  saveRails() {
    this.run(() =>
      this.change(
        "Changed balcony rail height",
        () => (this.data.facade.railHeight = this.length("wb-rail-height")),
      ),
    );
  },
  outdoorDialog() {
    this.dialog(
      "Compound walls and outdoor areas",
      `${this.field("wb-compound-height", "Wall height (" + StudioUI.unit + ")", this.display(72))}${this.field("wb-compound-thickness", "Wall thickness (" + StudioUI.unit + ")", this.display(9))}${this.field("wb-gate-edge", "Gate boundary edge (starts at 0)", 0, "number")}${this.field("wb-gate-offset", "Gate offset (" + StudioUI.unit + ")", this.display(30))}${this.field("wb-gate-width", "Gate width (" + StudioUI.unit + ")", this.display(120))}${this.b("Preview enclosure", "WorkbenchUI.previewPerimeter()", "primary")}<hr>${this.select("wb-outdoor-kind", "Area type", ["path", "garden", "tank", "sunshade", "rail"], "garden")}${this.field("wb-outdoor-height", "Height / depth (" + StudioUI.unit + ")", this.display(6))}<textarea id="wb-outdoor-points">20,20\n80,20\n80,80\n20,80</textarea>${this.b("Add outdoor polygon", "WorkbenchUI.addOutdoor()")}<div id="wb-result"></div>${this.records("outdoors")}`,
    );
  },
  previewPerimeter() {
    this.run(() => {
      this.pending = WorkbenchModel.perimeterObjects(this.p(), {
        height: this.length("wb-compound-height"),
        thickness: this.length("wb-compound-thickness"),
        gateEdge: this.num("wb-gate-edge"),
        gateOffset: this.length("wb-gate-offset"),
        gateWidth: this.length("wb-gate-width"),
      });
      this.pendingBase = JSON.stringify(this.p());
      this.result(
        WorkbenchDrawing.polygonsSVG(this.pending.design.workbench.outdoors) +
          this.b(
            "Apply site enclosure",
            'WorkbenchUI.applyPending("Added site enclosure")',
          ),
      );
    });
  },
  addOutdoor() {
    this.run(() =>
      this.change("Added outdoor area", () =>
        this.data.outdoors.push({
          id: this.id(),
          name: this.val("wb-outdoor-kind"),
          kind: this.val("wb-outdoor-kind"),
          points: this.points(this.val("wb-outdoor-points")),
          height: this.length("wb-outdoor-height"),
          base: 0,
        }),
      ),
    );
  },
  terrainDialog() {
    this.dialog(
      "Survey levels and approximate earthwork",
      `<p>Survey X,Y,Z in ${StudioUI.unit}, one point per line. Heights use inverse-distance interpolation.</p><textarea id="wb-terrain-points">${this.data.terrain.points.length ? this.data.terrain.points.map((q) => [q.x, q.y, q.z].map((n) => this.display(n)).join(",")).join("\n") : "0,0,0\n300,0,12\n300,300,18\n0,300,6"}</textarea>${this.field("wb-terrain-level", "Design ground elevation (" + StudioUI.unit + ")", this.display(this.data.terrain.designLevel))}${this.field("wb-terrain-resolution", "Grid cells per axis", this.data.terrain.resolution, "number")}${this.b("Calculate and preview", "WorkbenchUI.previewTerrain()", "primary")}<div id="wb-result"></div>`,
    );
  },
  previewTerrain() {
    this.run(() => {
      const p = this.p();
      p.design.workbench.terrain = {
        points: this.points(this.val("wb-terrain-points")),
        designLevel: this.length("wb-terrain-level"),
        resolution: this.num("wb-terrain-resolution"),
      };
      this.pending = ProjectModel.normalize(p);
      this.pendingBase = JSON.stringify(this.p());
      const r = WorkbenchModel.earthwork(this.pending);
      this.result(
        `<p>Cut ${r.cut.toFixed(2)} ft³ · Fill ${r.fill.toFixed(2)} ft³ · Net ${r.net.toFixed(2)} ft³ · ${r.samples} cells.</p>${this.b("Apply terrain", 'WorkbenchUI.applyPending("Added site terrain")')}`,
      );
    });
  },
  rainDialog() {
    const r = this.data.rain;
    this.dialog(
      "Rainwater collection and drainage layout",
      `${[
        ["annualMm", "Annual rainfall (mm)"],
        ["eventMm", "Design event rainfall (mm)"],
        ["efficiency", "Collection efficiency (0–1)"],
        ["tankLitres", "Tank capacity (litres)"],
        ["dailyLitres", "Daily demand (litres)"],
        ["intensityMmHour", "Entered rainfall intensity (mm/hour)"],
        ["pipeCapacityLps", "Entered capacity per downpipe (litres/sec)"],
      ]
        .map(([k, l]) => this.field("wb-rain-" + k, l, r[k], "number"))
        .join(
          "",
        )}${this.b("Calculate collection", "WorkbenchUI.calculateRain()", "primary")}<div id="wb-result"></div>`,
    );
  },
  calculateRain() {
    this.run(() => {
      const p = this.p();
      for (const k of Object.keys(this.data.rain).filter(
        (k) => k !== "enabled",
      ))
        p.design.workbench.rain[k] = this.num("wb-rain-" + k);
      p.design.workbench.rain.enabled = true;
      this.pending = ProjectModel.normalize(p);
      this.pendingBase = JSON.stringify(this.p());
      const r = WorkbenchModel.rainwater(this.pending);
      this.result(
        this.table(
          [
            "Roof sq ft",
            "Annual litres",
            "Event litres",
            "Overflow litres",
            "Storage days",
            "Peak L/s",
            "Downpipes",
          ],
          [
            [
              r.area.toFixed(2),
              r.annualLitres.toFixed(0),
              r.eventLitres.toFixed(0),
              r.overflow.toFixed(0),
              r.days.toFixed(1),
              r.peakLps.toFixed(2),
              r.downpipes,
            ],
          ],
        ) +
          this.b(
            "Save and draw drainage",
            'WorkbenchUI.applyPending("Planned roof water collection")',
          ),
      );
    });
  },
  solarDialog() {
    const s = this.data.solar;
    this.dialog(
      "Roof panel layout and shadow review",
      `${["width", "depth", "gap", "walkway"].map((k) => this.field("wb-solar-" + k, k + " (" + StudioUI.unit + ")", this.display(s[k]))).join("")}${["watts", "angle", "tilt", "peakSunHours", "derate"].map((k) => this.field("wb-solar-" + k, k, s[k], "number")).join("")}<p>Optional roof obstacle polygons: one X,Y pair per line, blank line between polygons.</p><textarea id="wb-solar-obstacles">${s.obstacles.map((ps) => ps.map((q) => this.display(q.x) + "," + this.display(q.y)).join("\n")).join("\n\n")}</textarea>${this.b("Generate panel layout", "WorkbenchUI.previewSolar()", "primary")}<div id="wb-result"></div>`,
    );
  },
  previewSolar() {
    this.run(() => {
      const p = this.p();
      for (const k of ["width", "depth", "gap", "walkway"])
        p.design.workbench.solar[k] = this.length("wb-solar-" + k);
      for (const k of ["watts", "angle", "tilt", "peakSunHours", "derate"])
        p.design.workbench.solar[k] = this.num("wb-solar-" + k);
      p.design.workbench.solar.enabled = true;
      p.design.workbench.solar.obstacles = this.val("wb-solar-obstacles").trim()
        ? this.val("wb-solar-obstacles")
            .trim()
            .split(/\n\s*\n/)
            .map((v) => this.points(v))
        : [];
      this.pending = ProjectModel.normalize(p);
      this.pendingBase = JSON.stringify(this.p());
      const r = WorkbenchModel.solarLayout(this.pending);
      this.result(
        `<p>${r.panels.length} panels · ${r.kw.toFixed(2)} kWp · ${r.shaded} intersect the current neighbour-shadow study · ${r.enteredYieldKwh.toFixed(2)} kWh/day from your entered sun-hours and derate.</p>${WorkbenchDrawing.polygonsSVG(r.panels.map((q) => ({ ...q, color: q.shaded ? "#fb7185" : "#2563eb" })))}${this.b("Save solar layout", 'WorkbenchUI.applyPending("Planned solar panels")')}`,
      );
    });
  },
  serviceDialog() {
    this.dialog(
      "3D services and vertical risers",
      `${this.field("wb-service-name", "Route name", "Supply riser")}${this.select("wb-service-kind", "System", ["plumbing", "electrical", "ventilation"], "plumbing")}${this.field("wb-service-diameter", "Outside diameter (" + StudioUI.unit + ")", this.display(2))}<p>Route points X,Y,elevation in ${StudioUI.unit}; elevation is absolute.</p><textarea id="wb-service-points">20,20,20\n140,20,20\n140,20,140</textarea>${this.b("Add 3D route", "WorkbenchUI.addService()", "primary")}${this.b("Find 3D clashes", "WorkbenchUI.checkServices()")}<div id="wb-result"></div>${this.records("services3d")}`,
    );
  },
  addService() {
    this.run(() => {
      if (
        this.change("Added 3D service route", () =>
          this.data.services3d.push({
            id: this.id(),
            name: this.val("wb-service-name"),
            kind: this.val("wb-service-kind"),
            floor: currentFloor,
            diameter: this.length("wb-service-diameter"),
            points: this.points(this.val("wb-service-points")),
          }),
        )
      )
        this.serviceDialog();
    });
  },
  checkServices() {
    const rows = WorkbenchModel.serviceClashes(this.p());
    this.result(
      this.table(
        ["Route", "Other object", "Kind", "X", "Y", "Elevation"],
        rows.map((r) => [
          r.a,
          r.b,
          r.kind,
          this.display(r.point.x),
          this.display(r.point.y),
          this.display(r.point.z),
        ]),
      ),
    );
    WorkbenchDrawing.clashes = rows;
    WorkbenchDrawing.render();
  },
  optionDialog() {
    this.dialog(
      "Named design alternatives",
      `${this.field("wb-option-name", "Option name", "Option " + (this.data.options.length + 1))}${this.b("Save current as an option", "WorkbenchUI.saveOption()", "primary")}${this.select(
        "wb-option",
        "Compare / open",
        this.data.options.map((o) => [o.id, o.name]),
        this.data.options[0]?.id || "",
      )}${this.b("Compare with current", "WorkbenchUI.compareOption()")}${this.b("Snapshot current and open option", "WorkbenchUI.openOption()")}<div id="wb-result"></div>${this.records("options")}`,
    );
  },
  saveOption() {
    this.run(() => {
      const project = WorkbenchModel.optionSnapshot(this.p());
      if (
        this.change("Saved design option", () =>
          this.data.options.push({
            id: this.id(),
            name: this.val("wb-option-name"),
            project,
          }),
        )
      )
        this.optionDialog();
    });
  },
  compareOption() {
    this.run(() => {
      const o = this.data.options.find((o) => o.id === this.val("wb-option"));
      if (!o) throw Error("Save an option first");
      const r = WorkbenchModel.compare(o.project, this.p());
      this.result(
        `<p>Current versus ${this.e(o.name)}: ${r.added.length} added · ${r.removed.length} removed · ${r.changed.length} changed · area Δ ${r.areaDelta.toFixed(2)} sq ft · cost Δ ${r.costDelta.toFixed(2)}</p><div class="design-diff">${PlanningDrawing.thumbnail(o.project)}${PlanningDrawing.thumbnail(this.p())}</div>${r.requirements.map((q) => `<p>${this.e(q.label)}: ${q.pass ? "satisfied" : "unmet"}</p>`).join("")}`,
      );
    });
  },
  async openOption() {
    await this.asyncRun(async () => {
      const option = this.data.options.find(
        (o) => o.id === this.val("wb-option"),
      );
      if (!option) throw Error("Choose a saved option");
      const next = structuredClone(option.project);
      next.design.workbench.options = structuredClone(this.data.options);
      await StorageEngine.snapshot("Before opening design option");
      this.apply(next, "Opened named design option");
    });
  },
  viewDialog() {
    this.dialog(
      "Direct 3D editing and inspection",
      `${this.b("Enable move gizmo", 'Workbench3D.enableEdit("translate")', "primary")}${this.b("Enable resize gizmo", 'Workbench3D.enableEdit("scale")')}${this.b("Finish direct editing", "Workbench3D.disableEdit()")}${this.b("Measure two points in 3D", "Workbench3D.startMeasure()")}${this.b("Isolate selection", "Workbench3D.isolateSelection()")}${this.b("Show all objects", "Workbench3D.clearIsolation()")}<hr><p>Section box coordinates in ${StudioUI.unit}.</p>${["xmin", "xmax", "ymin", "ymax", "zmin", "zmax"].map((k) => this.field("wb-section-" + k, k, this.display(k.endsWith("min") ? 0 : k[0] === "z" ? this.p().floorCount * this.p().wallSettings.height : ProjectModel.inches(this.p().plot[k[0] === "x" ? "inW" : "inH"], this.p().unit)))).join("")}${this.b("Apply section box", "Workbench3D.sectionFromForm()")}${this.b("Clear section box", "Workbench3D.clearSection()")}${this.records("measurements")}`,
    );
  },
  importDialog() {
    this.dialog(
      "PDF and scanned drawing import",
      `<input id="wb-pdf-file" type="file" accept="application/pdf,.pdf" onchange="WorkbenchFiles.openPDF(this.files[0])">${this.field("wb-pdf-page", "PDF page", 1, "number")}${this.b("Render selected page", "WorkbenchFiles.renderPDF()")}<input id="wb-raster-file" type="file" accept="image/png,image/jpeg,image/webp" onchange="WorkbenchFiles.openRaster(this.files[0])"><div class="studio-field-grid">${this.field("wb-trace-threshold", "Dark-pixel threshold", 100, "number")}${this.field("wb-trace-min", "Minimum line length (pixels)", 40, "number")}</div>${this.b("Detect horizontal/vertical raster lines", "WorkbenchFiles.detectRaster()")}${this.b("Recognize text and dimensions", "WorkbenchFiles.ocr()")}<p id="wb-import-status">Load a PDF page or scanned plan. Detected geometry and OCR text require review.</p><div id="wb-trace-preview"></div>${this.field("wb-known-length", "Known reference length (" + StudioUI.unit + ")", this.display(120))}${this.b("Calibrate selected points", "WorkbenchFiles.calibrate()")}${this.field("wb-import-scale", "Inches per source unit / pixel", 1, "number")}${this.field("wb-import-x", "Placement X (" + StudioUI.unit + ")", this.display(20))}${this.field("wb-import-y", "Placement Y (" + StudioUI.unit + ")", this.display(20))}${this.field("wb-import-thickness", "Wall thickness (" + StudioUI.unit + ")", this.display(4.5))}<label><input id="wb-trace-guides" type="checkbox">Import as construction guides</label><label><input id="wb-trace-rooms" type="checkbox">Recognize/split rooms on this floor and bind reviewed openings</label><label><input id="wb-trace-underlay" type="checkbox" checked>Keep source image as locked underlay</label>${this.b("Apply reviewed geometry", "WorkbenchFiles.applyTrace()", "primary")}`,
    );
    if (WorkbenchFiles.trace) WorkbenchFiles.previewTrace();
  },
  procurementDialog() {
    this.dialog(
      "Purchase quantities and supplier quotations",
      `${this.b("Inspect material takeoff", "WorkbenchUI.materialDialog()")}${this.field("wb-buy-material", "Material / item", "Floor tiles")}${this.field("wb-buy-quantity", "Required quantity", 100, "number")}${this.field("wb-buy-unit", "Unit", "sq ft")}${this.field("wb-buy-pack", "Quantity per pack", 16, "number")}${this.field("wb-buy-waste", "Waste %", 10, "number")}${this.field("wb-buy-rate", "Rate per unit", 50, "number")}${this.field("wb-buy-supplier", "Supplier / quote reference", "")}${this.b("Add purchase line", "WorkbenchUI.addPurchase()", "primary")}${this.b("Export purchase CSV", "WorkbenchUI.procurementCSV()")}${this.table(
        [
          "Material",
          "Supplier",
          "Required",
          "Packs",
          "Ordered",
          "Surplus",
          "Cost",
        ],
        WorkbenchModel.procurement(this.p()).map((r) => [
          r.material,
          r.supplier,
          r.required,
          r.packs,
          r.ordered,
          r.surplus.toFixed(2),
          r.cost.toFixed(2),
        ]),
      )}${this.records("procurement")}`,
    );
  },
  addPurchase() {
    this.run(() => {
      if (
        this.change("Added procurement line", () =>
          this.data.procurement.push({
            id: this.id(),
            material: this.val("wb-buy-material"),
            quantity: this.num("wb-buy-quantity"),
            unit: this.val("wb-buy-unit"),
            pack: this.num("wb-buy-pack"),
            waste: this.num("wb-buy-waste"),
            rate: this.num("wb-buy-rate"),
            supplier: this.val("wb-buy-supplier"),
          }),
        )
      )
        this.procurementDialog();
    });
  },
  procurementCSV() {
    DesignIO.csv(
      [
        [
          "Material",
          "Supplier",
          "Unit",
          "Required",
          "Packs",
          "Ordered",
          "Surplus",
          "Cost",
        ],
        ...WorkbenchModel.procurement(this.p()).map((r) => [
          r.material,
          r.supplier,
          r.unit,
          r.required,
          r.packs,
          r.ordered,
          r.surplus,
          r.cost,
        ]),
      ],
      "ArchCAD_Purchase_List.csv",
    );
  },
  cuttingDialog() {
    this.dialog(
      "Stock and tile offcut optimization",
      `${this.field("wb-stock-w", "Stock width (" + StudioUI.unit + ")", this.display(24))}${this.field("wb-stock-h", "Stock depth (" + StudioUI.unit + ")", this.display(24))}${this.field("wb-cut-kerf", "Saw kerf (" + StudioUI.unit + ")", this.display(0.125))}<p>Requested width,depth,quantity — one piece group per line.</p><textarea id="wb-cut-list">12,12,4\n8,8,3</textarea>${this.b("Optimize stock cuts", "WorkbenchUI.optimizeCuts()", "primary")}${this.b("Optimize selected rooms tile cuts", "WorkbenchUI.optimizeTiles()")}<div id="wb-result"></div>`,
    );
  },
  optimizeCuts() {
    this.run(() => {
      const requests = this.val("wb-cut-list")
        .trim()
        .split("\n")
        .map((line) => {
          const [w, h, qty] = line.split(",");
          return {
            w: PlanningUI.parse(w),
            h: PlanningUI.parse(h),
            qty: Number(qty || 1),
          };
        });
      this.cutResult = WorkbenchModel.cuts(requests, {
        w: this.length("wb-stock-w"),
        h: this.length("wb-stock-h"),
        kerf: this.length("wb-cut-kerf"),
      });
      this.showCuts();
    });
  },
  optimizeTiles() {
    this.run(() => {
      const ids = this.selected().filter((id) =>
        elements.find((e) => e.id === id && !e.isFurniture),
      );
      if (!ids.length) throw Error("Select one or more tiled rooms");
      this.cutResult = WorkbenchModel.tileCutPlan(
        this.p(),
        ids,
        this.length("wb-cut-kerf"),
      );
      this.showCuts();
    });
  },
  showCuts() {
    this.result(
      `<p>${this.cutResult.sheets.length} stock blanks · ${this.cutResult.wastePercent.toFixed(2)}% unused bounding-rectangle area. Rotations are allowed; polygon edges still need finishing cuts.</p>${WorkbenchDrawing.cutSVG(this.cutResult)}${this.b("Export cutting SVG", "WorkbenchUI.exportCuts()")}`,
    );
  },
  exportCuts() {
    if (this.cutResult)
      NavActionEngine.downloadBlob(
        WorkbenchDrawing.cutSVG(this.cutResult),
        "ArchCAD_Cutting_Plan.svg",
        "image/svg+xml",
      );
  },
  detailDialog() {
    this.dialog(
      "Dimensioned construction coordination details",
      `${this.select("wb-detail-kind", "Detail", ["wall-assembly", "stair", "opening", "balcony", "parapet", "wetroom"], "wall-assembly")}${this.b("Generate detail", "WorkbenchUI.previewDetail()", "primary")}<div id="wb-result"></div>`,
    );
  },
  previewDetail() {
    this.run(() => {
      this.detailSVG = WorkbenchDrawing.detail(
        this.p(),
        this.val("wb-detail-kind"),
        elements[selectedElIndex]?.id,
      );
      this.result(
        this.detailSVG +
          this.b("Export detail SVG", "WorkbenchUI.exportDetail()") +
          this.b("Print detail / PDF", "WorkbenchUI.printDetail()"),
      );
    });
  },
  exportDetail() {
    if (this.detailSVG)
      NavActionEngine.downloadBlob(
        this.detailSVG,
        "ArchCAD_Construction_Detail.svg",
        "image/svg+xml",
      );
  },
  printDetail() {
    if (this.detailSVG)
      PlanningDrawing.openSheets(this.p(), [
        {
          title: "Construction coordination detail",
          paper: "A4",
          html: this.detailSVG,
        },
      ]);
  },
  issueDialog() {
    this.dialog(
      "Review issues and drawing markup",
      `${this.field("wb-issue-title", "Issue title", "Review required")}${this.field("wb-issue-description", "Description", "")}${this.field("wb-issue-assignee", "Assignee", "")}${this.select("wb-issue-priority", "Priority", ["low", "normal", "high", "urgent"], "normal")}${this.field("wb-issue-due", "Due date", "", "date")}<label><input id="wb-issue-shot" type="checkbox">Attach current plan screenshot</label>${this.b("Create issue at selection", "WorkbenchUI.addIssue()", "primary")}<hr>${this.select("wb-markup-kind", "Markup", ["pen", "arrow", "measure"], "arrow")}${this.field("wb-markup-color", "Colour", "#f59e0b", "color")}${this.field("wb-markup-label", "Markup note", "")}${this.b("Draw markup on plan", "WorkbenchDrawing.startMarkup()")}${this.b("Finish markup", "WorkbenchDrawing.finishMarkup()")}<div id="wb-result"></div>${this.data.issues.map((i) => `<article><strong>${this.e(i.title)}</strong><p>${this.e(i.assignee)} · ${i.priority} · ${this.e(i.due || "")}</p><select aria-label="Issue status" onchange="WorkbenchUI.issueStatus('${i.id}',this.value)">${["open", "in-progress", "resolved", "closed"].map((s) => `<option ${i.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>${this.b("Locate", `WorkbenchUI.locateIssue('${i.id}')`)}</article>`).join("")}${this.b("Load shared review issues", "WorkbenchSync.loadIssues()")}`,
    );
  },
  async addIssue() {
    await this.asyncRun(async () => {
      const e = elements[selectedElIndex],
        issue = {
          id: this.id(),
          title: this.val("wb-issue-title"),
          description: this.val("wb-issue-description"),
          assignee: this.val("wb-issue-assignee"),
          priority: this.val("wb-issue-priority"),
          status: "open",
          due: this.val("wb-issue-due"),
          revision: DesignSync.revision || 0,
          anchor: {
            floor: currentFloor,
            x: e ? e.x + e.w / 2 : 20,
            y: e ? e.y + e.h / 2 : 20,
            objectId: e?.id || "",
          },
        };
      if (document.getElementById("wb-issue-shot").checked)
        issue.screenshot = (
          await WorkbenchFiles.svgPNG(DrawingExport.svg(currentFloor), 900)
        ).toDataURL("image/jpeg", 0.65);
      if (
        this.change("Created review issue", () => this.data.issues.push(issue))
      )
        this.issueDialog();
    });
  },
  async issueStatus(id, status) {
    await this.asyncRun(async () => {
      const issue = this.data.issues.find((i) => i.id === id);
      if (issue.remote) {
        if (!navigator.onLine || !DesignSync.projectId)
          throw Error("Connect online to update this shared issue");
        await DesignSync.request(
          "projects/" + DesignSync.projectId + "/issues/" + id,
          "PATCH",
          { status },
        );
      }
      this.change(
        "Changed review issue status",
        () => (this.data.issues.find((i) => i.id === id).status = status),
      );
    });
  },
  locateIssue(id) {
    const i = this.data.issues.find((i) => i.id === id);
    if (i) WorkbenchDrawing.locate(i.anchor);
  },
  propertyDialog() {
    this.dialog(
      "Custom object property sets",
      `${this.field("wb-field-key", "Property key", "supplier")}${this.field("wb-field-label", "Display label", "Supplier")}${this.select("wb-field-type", "Value type", ["text", "number", "date", "select"], "text")}${this.field("wb-field-options", "Choices separated by commas", "")}${this.b("Add property definition", "WorkbenchUI.addField()")}<hr>${this.field("wb-property-search", "Find objects by name or property", "")}${this.b("Search", "WorkbenchUI.searchProperties()")}<div id="wb-result"></div>${this.data.fields.map((f) => `${this.field("wb-value-" + f.key, f.label, "", f.type === "number" ? "number" : f.type === "date" ? "date" : "text")}`).join("")}${this.b("Apply values to selected objects", "WorkbenchUI.applyProperties()", "primary")}`,
    );
  },
  addField() {
    this.run(() => {
      if (
        this.change("Defined custom object property", () =>
          this.data.fields.push({
            id: this.id(),
            key: this.val("wb-field-key"),
            label: this.val("wb-field-label"),
            type: this.val("wb-field-type"),
            options: this.val("wb-field-options")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          }),
        )
      )
        this.propertyDialog();
    });
  },
  searchProperties() {
    const ids = WorkbenchModel.propertySearch(
      this.p(),
      this.val("wb-property-search"),
    );
    this.result(
      `<p>${ids.length} matching objects</p>` +
        ids.map((id) => `<p>${this.e(id)}</p>`).join(""),
    );
    Selection.ids = new Set(
      ids.filter((id) => elements.some((e) => e.id === id)),
    );
    AppEvents.triggerSelectionChange();
  },
  applyProperties() {
    this.run(() => {
      const ids = this.selected();
      if (!ids.length) throw Error("Select property targets");
      this.change("Changed custom object properties", () => {
        for (const id of ids) {
          this.data.values[id] ||= {};
          for (const f of this.data.fields) {
            const value = this.val("wb-value-" + f.key);
            if (!value) continue;
            this.data.values[id][f.key] =
              f.type === "number" ? Number(value) : value;
          }
        }
      });
    });
  },
  macroDialog() {
    this.dialog(
      "Record and replay editing macros",
      `${this.field("wb-macro-name", "Macro name", "Move selected objects")}${this.b(this.recording ? "Stop recording" : "Start recording", "WorkbenchUI.toggleRecording()")}${this.select(
        "wb-macro",
        "Saved macro",
        this.data.macros.map((m) => [m.id, m.name]),
        this.data.macros[0]?.id || "",
      )}<p>Parameters in ${StudioUI.unit}. A reusable move macro uses dx/dy.</p>${this.field("wb-macro-dx", "dx", this.display(12))}${this.field("wb-macro-dy", "dy", this.display(0))}${this.b("Create parameterized move macro", "WorkbenchUI.moveMacro()")}${this.b("Preview macro on selection", "WorkbenchUI.previewMacro()", "primary")}<div id="wb-result"></div>${this.records("macros")}`,
    );
  },
  toggleRecording() {
    if (this.recording) {
      const record = this.recording;
      this.recording = null;
      if (!record.actions.length)
        return StudioUI.message("No supported geometry edits were recorded.");
      this.change("Saved recorded macro", () =>
        this.data.macros.push({
          id: this.id(),
          name: record.name,
          actions: record.actions,
        }),
      );
      this.macroDialog();
    } else {
      this.recording = {
        name: this.val("wb-macro-name"),
        actions: [],
        unsupported: [],
      };
      document.getElementById("studio-dialog").close();
      StudioUI.message(
        "Recording move, size, rotation and appearance edits. Open Action macros to stop.",
      );
    }
  },
  moveMacro() {
    if (
      this.change("Saved parameterized move macro", () =>
        this.data.macros.push({
          id: this.id(),
          name: this.val("wb-macro-name"),
          actions: [
            { op: "move", ids: [], selection: true, dx: "$dx", dy: "$dy" },
          ],
        }),
      )
    )
      this.macroDialog();
  },
  previewMacro() {
    this.run(() => {
      const macro = this.data.macros.find((m) => m.id === this.val("wb-macro"));
      if (!macro) throw Error("Create or record a macro first");
      this.pending = WorkbenchModel.macroApply(
        this.p(),
        macro,
        { dx: this.length("wb-macro-dx"), dy: this.length("wb-macro-dy") },
        this.selected(),
      );
      this.pendingBase = JSON.stringify(this.p());
      this.result(
        PlanningDrawing.thumbnail(this.pending) +
          this.b(
            "Apply macro",
            'WorkbenchUI.applyPending("Applied editing macro")',
          ),
      );
    });
  },
  preferenceDialog() {
    const p = this.preferences || {};
    this.dialog(
      "Language, readability and keyboard shortcuts",
      `${this.select(
        "wb-pref-language",
        "Interface language",
        [
          ["en", "English"],
          ["hi", "हिन्दी"],
          ["or", "ଓଡ଼ିଆ"],
        ],
        p.language || "en",
      )}${this.field("wb-pref-scale", "Text scale (1–1.4)", p.scale || 1, "number")}${this.select(
        "wb-pref-colors",
        "Selection palette",
        [
          ["default", "Cyan"],
          ["colorblind", "Blue / orange"],
        ],
        p.colors || "default",
      )}${this.field("wb-key-menu", "Open workbench shortcut", p.keys?.menu || "Alt+P")}${this.field("wb-key-2d", "2D view shortcut", p.keys?.view2d || "Alt+1")}${this.field("wb-key-3d", "3D view shortcut", p.keys?.view3d || "Alt+3")}${this.field("wb-key-measure", "3D measure shortcut", p.keys?.measure || "Alt+M")}${this.b("Save interface preferences", "WorkbenchUI.savePreferences()", "primary")}<p>Tool names and common controls are translated. Technical notes and custom project names retain their original text.</p>`,
    );
  },
  loadPreferences() {
    try {
      this.preferences = JSON.parse(
        localStorage.getItem("ArchCAD_WorkbenchPreferences") || "{}",
      );
    } catch {
      this.preferences = {};
    }
    if (typeof WorkbenchI18n !== "undefined")
      WorkbenchI18n.apply(this.preferences);
  },
  savePreferences() {
    this.run(() => {
      const scale = this.num("wb-pref-scale");
      ProjectModel.finite(scale, "Text scale", 1, 1.4);
      const keys = Object.fromEntries(
        ["menu", "2d", "3d", "measure"].map((k) => [
          k === "2d" ? "view2d" : k === "3d" ? "view3d" : k,
          this.val("wb-key-" + k),
        ]),
      );
      if (new Set(Object.values(keys).map((s) => s.toLowerCase())).size !== 4)
        throw Error("Shortcuts must be different");
      for (const value of Object.values(keys))
        if (
          !/^(Alt|Ctrl|Shift)(\+(Alt|Ctrl|Shift))*\+[A-Za-z0-9]$/.test(value) ||
          /Ctrl\+[WRTNLP]$/i.test(value)
        )
          throw Error("Use a non-reserved shortcut such as Alt+P");
      this.preferences = {
        language: this.val("wb-pref-language"),
        scale,
        colors: this.val("wb-pref-colors"),
        keys,
      };
      localStorage.setItem(
        "ArchCAD_WorkbenchPreferences",
        JSON.stringify(this.preferences),
      );
      WorkbenchI18n.apply(this.preferences);
    });
  },
  presentationDialog() {
    this.dialog(
      "Client walkthrough and panorama export",
      `${this.b("Manage named viewpoints", "DesignUI.presentationDialog()")}${this.b("Export panoramic PNG", "Workbench3D.panorama()", "primary")}${this.field("wb-video-duration", "Seconds per viewpoint", 3, "number")}${this.b("Record viewpoint walkthrough", "Workbench3D.recordWalkthrough()")}${this.b("Cancel recording", "Workbench3D.stopRecording()")}<label><input type="checkbox" onchange="Workbench3D.labelsEnabled=this.checked">Show room labels in editor</label>${this.b("Day lighting", "Workbench3D.lighting(false)")}${this.b("Night lighting", "Workbench3D.lighting(true)")}<p id="wb-presentation-status">Video export uses the recording formats supported by your browser.</p>`,
    );
  },
};
document.addEventListener("DOMContentLoaded", () => WorkbenchUI.init());
// Preserve existing editing protections while enforcing the optional polygon site boundary.
const wbCommit = ProjectState.commit;
ProjectState.commit = function (label, mutation) {
  const before = this.capture(),
    outer = !!WorkbenchModel.transactionBefore;
  WorkbenchModel.transactionBefore ||= before;
  let result;
  try {
    result = wbCommit.call(this, label, () => {
      mutation();
      WorkbenchModel.followNativeChanges(before, {
        elements,
        fixtures,
        design: this.meta.design,
      });
      if (WorkbenchModel.templateOperation)
        WorkbenchModel.placeTemplateMetadata(
          before,
          this,
          WorkbenchModel.templateOperation,
        );
      for (const old of WorkbenchModel.objects(before)) {
        if (!old.record.locked) continue;
        const now = WorkbenchModel.findObject(
            this.capture(),
            old.record.id,
          )?.record,
          clean = (r) => {
            if (!r) return null;
            const { locked, ...rest } = r;
            return rest;
          };
        if (JSON.stringify(clean(now)) !== JSON.stringify(clean(old.record)))
          throw Error("Unlock the professional object before changing it");
      }
      if (WorkbenchModel.floorOperation)
        WorkbenchModel.remapFloors(
          before,
          this.capture(),
          this.meta.design,
          WorkbenchModel.floorOperation,
        );
      const now = this.capture(),
        ids = new Set(now.elements.map((e) => e.id)),
        w = this.meta.design.workbench;
      w.interiors = w.interiors.filter((l) => ids.has(l.room));
      w.instances = w.instances.filter((i) =>
        i.members.every((m) => ids.has(m.id)),
      );
      for (const key of ["stairs"])
        for (const id of Object.keys(w[key]))
          if (!ids.has(id)) delete w[key][id];
    });
    if (result && WorkbenchUI.recording) {
      const recorded = WorkbenchModel.recordActions(before, this.capture());
      WorkbenchUI.recording.actions.push(...recorded.actions);
      WorkbenchUI.recording.unsupported.push(...recorded.unsupported);
      if (recorded.unsupported.length)
        StudioUI.message(
          "Macro recorder omitted: " +
            [...new Set(recorded.unsupported)].join(", "),
        );
    }
    return result;
  } finally {
    if (!outer) WorkbenchModel.transactionBefore = null;
  }
};
const wbSolve = ProjectModel.solveConstraints;
ProjectModel.solveConstraints = function (p) {
  const next = wbSolve(p),
    before = WorkbenchModel.transactionBefore;
  if (
    before &&
    WorkbenchModel.data(next).site.boundary.length &&
    WorkbenchModel.data(next).site.enforce
  )
    for (const e of next.elements) {
      const old = before.elements.find((v) => v.id === e.id),
        changed =
          !old || ["x", "y", "w", "h", "rot"].some((k) => old[k] !== e[k]);
      if (changed && !WorkbenchModel.insideSite(next, e))
        throw Error("Changed geometry must fit inside the setback polygon");
    }
  return next;
};
// Floor operations also move/copy professional and earlier design metadata in the same undo item.
WorkbenchModel.remapFloors = function (before, after, design, op) {
  if (op.applied) return;
  op.applied = true;
  const w = design.workbench,
    keys = ["ramps", "structure", "services3d"],
    clone = structuredClone;
  if (op.kind === "delete") {
    const i = op.index,
      map = (f) => (f > i ? f - 1 : f);
    for (const key of [...keys, "levels"])
      w[key] = w[key]
        .filter((r) => r.floor !== i)
        .map((r) => ({ ...r, floor: map(r.floor) }));
    for (const key of ["shafts", "voids"])
      w[key] = w[key]
        .map((r) => ({ ...r, from: map(r.from), to: map(r.to) }))
        .filter((r) => r.to > r.from && r.from < after.floorCount);
    w.issues = w.issues
      .filter((r) => r.anchor.floor !== i)
      .map((r) => ({
        ...r,
        anchor: { ...r.anchor, floor: map(r.anchor.floor) },
      }));
    w.markups = w.markups
      .filter((r) => r.floor !== i)
      .map((r) => ({ ...r, floor: map(r.floor) }));
    for (const key of ["ceilings", "guides", "views", "sheets"])
      design[key] = design[key]
        .filter((r) => r.floor !== i)
        .map((r) => ({ ...r, floor: map(r.floor) }));
  } else if (op.kind === "swap") {
    const map = (f) => (f === op.a ? op.b : f === op.b ? op.a : f);
    for (const key of [...keys])
      w[key].forEach((r) => (r.floor = map(r.floor)));
    for (const key of ["shafts", "voids"])
      for (const r of w[key]) {
        const floors = Array.from({ length: r.to - r.from }, (_, i) =>
          map(r.from + i),
        ).sort((a, b) => a - b);
        if (floors.some((f, i) => i && f !== floors[i - 1] + 1))
          throw Error(
            "This floor reorder would split a vertical opening; edit its span first",
          );
        r.from = floors[0];
        r.to = floors.at(-1) + 1;
      }
    w.issues.forEach((r) => (r.anchor.floor = map(r.anchor.floor)));
    w.markups.forEach((r) => (r.floor = map(r.floor)));
    for (const key of ["ceilings", "guides", "views", "sheets"])
      design[key].forEach((r) => (r.floor = map(r.floor)));
  } else if (op.kind === "copy") {
    const source = op.source,
      target = before.floorCount,
      old = before.elements.filter((e) => e.floor === source),
      added = after.elements.filter(
        (e) =>
          e.floor === target && !before.elements.some((v) => v.id === e.id),
      ),
      map = new Map(
        old.map((e, i) => [e.id, added[i]?.id]).filter(([, id]) => id),
      ),
      newBase = w.levels.length
        ? Math.max(...w.levels.map((l) => l.base + l.height))
        : WorkbenchModel.floorBase(after, target),
      shift = newBase - WorkbenchModel.floorBase(before, source);
    for (const key of keys)
      for (const record of before.design.workbench[key].filter(
        (r) => r.floor === source,
      )) {
        const item = {
          ...clone(record),
          id: ProjectModel.uid(),
          floor: target,
        };
        if (key === "services3d")
          item.points = item.points.map((q) => ({ ...q, z: q.z + shift }));
        w[key].push(item);
      }
    if (w.levels.length)
      w.levels.push({
        id: ProjectModel.uid(),
        floor: target,
        base: newBase,
        height: WorkbenchModel.floorHeight(before, source),
      });
    for (const l of before.design.workbench.interiors.filter((l) =>
      map.has(l.room),
    ))
      w.interiors.push({
        ...clone(l),
        id: ProjectModel.uid(),
        room: map.get(l.room),
        items: l.items.map((i) => ({ ...clone(i), id: ProjectModel.uid() })),
      });
    for (const [oldId, newId] of map) {
      if (w.stairs[oldId]) w.stairs[newId] = clone(w.stairs[oldId]);
      for (const key of [
        "finishes",
        "tiles",
        "roomProperties",
        "objectProperties",
      ])
        if (design[key][oldId]) design[key][newId] = clone(design[key][oldId]);
      if (w.values[oldId]) w.values[newId] = clone(w.values[oldId]);
    }
    const originalFixtures = before.fixtures.filter((f) => map.has(f.roomUid)),
      newFixtures = after.fixtures.filter(
        (f) => !before.fixtures.some((o) => o.id === f.id),
      ),
      fixtureMap = new Map(
        originalFixtures
          .map((f, i) => [f.id, newFixtures[i]?.id])
          .filter(([, id]) => id),
      );
    for (const [oldId, newId] of fixtureMap) {
      if (w.openingLinks[oldId])
        w.openingLinks[newId] = clone(w.openingLinks[oldId]);
      if (w.values[oldId]) w.values[newId] = clone(w.values[oldId]);
      if (design.objectProperties[oldId])
        design.objectProperties[newId] = clone(design.objectProperties[oldId]);
    }
    for (const instance of before.design.workbench.instances.filter((i) =>
      i.members.every((m) => map.has(m.id)),
    ))
      w.instances.push({
        ...clone(instance),
        id: ProjectModel.uid(),
        floor: target,
        members: instance.members.map((m) => ({ ...m, id: map.get(m.id) })),
        fixtureMembers: (instance.fixtureMembers || [])
          .map((m) => ({ ...m, id: fixtureMap.get(m.id) }))
          .filter((m) => m.id),
      });
    for (const key of ["ceilings", "guides"])
      for (const r of before.design[key].filter((r) => r.floor === source))
        design[key].push({
          ...clone(r),
          id: ProjectModel.uid(),
          floor: target,
        });
  }
};
for (const [method, make] of Object.entries({
  deleteFloor: (args) => ({ kind: "delete", index: args[0] }),
  swapFloors: (args) => ({ kind: "swap", a: args[0], b: args[1] }),
  copyFloor: () => ({
    kind: "copy",
    source: Number(PlanningUI.val("copy-floor")),
  }),
})) {
  const original = PlanningUI[method];
  PlanningUI[method] = function (...args) {
    const previous = WorkbenchModel.floorOperation;
    WorkbenchModel.floorOperation = make(args);
    try {
      return original.apply(this, args);
    } finally {
      WorkbenchModel.floorOperation = previous;
    }
  };
}
WorkbenchUI.extraSelection = new Set();
const wbSelected = WorkbenchUI.selected;
WorkbenchUI.selected = function () {
  return [...new Set([...wbSelected.call(this), ...this.extraSelection])];
};
WorkbenchUI.editRecord = function (id, key, value) {
  if (!["name", "hidden", "locked"].includes(key)) return;
  this.change("Edited professional object property", () => {
    const found = WorkbenchModel.findObject(
      { design: ProjectState.meta.design, elements },
      id,
    );
    if (!found) throw Error("Object no longer exists");
    found.record[key] = value;
  });
};
const wbExplorer = DesignUI.explorerRows;
DesignUI.explorerRows = function (query) {
  wbExplorer.call(this, query);
  const rows = WorkbenchModel.objects(ProjectState.capture()).filter((o) =>
    JSON.stringify([
      o.record.name,
      o.record.type,
      o.kind,
      WorkbenchUI.data.values[o.record.id],
    ])
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  document
    .getElementById("object-rows")
    .insertAdjacentHTML(
      "beforeend",
      "<h3>Professional building objects</h3>" +
        rows
          .map(
            (o) =>
              `<div class="planning-record"><input type="checkbox" aria-label="Select professional object" ${WorkbenchUI.extraSelection.has(o.record.id) ? "checked" : ""} onchange="this.checked?WorkbenchUI.extraSelection.add('${o.record.id}'):WorkbenchUI.extraSelection.delete('${o.record.id}')"><strong>${WorkbenchUI.e(o.kind)}</strong><input aria-label="Professional object name" value="${WorkbenchUI.e(o.record.name || o.record.type || o.record.id)}" onchange="WorkbenchUI.editRecord('${o.record.id}','name',this.value)"><label><input type="checkbox" ${o.record.hidden ? "checked" : ""} onchange="WorkbenchUI.editRecord('${o.record.id}','hidden',this.checked)">Hide</label><label><input type="checkbox" ${o.record.locked ? "checked" : ""} onchange="WorkbenchUI.editRecord('${o.record.id}','locked',this.checked)">Lock</label></div>`,
          )
          .join(""),
    );
};
const wbSaveTemplate = PlanningUI.saveTemplate;
PlanningUI.saveTemplate = async function () {
  WorkbenchModel.savingTemplate = ProjectState.capture();
  try {
    return await wbSaveTemplate.call(this);
  } finally {
    WorkbenchModel.savingTemplate = null;
  }
};
const wbCollectionWrite = PlanningUI.writeCollection;
PlanningUI.writeCollection = async function (key, records) {
  const p = WorkbenchModel.savingTemplate;
  if (key === "room_templates" && p && records[0]) {
    const t = records[0],
      room = p.elements.find((e) => e.id === t.room.id);
    if (room) {
      const w = WorkbenchModel.data(p),
        ids = new Set([room.id, ...t.furniture.map((f) => f.id)]),
        assetIds = new Set(t.furniture.map((f) => f.assetId).filter(Boolean));
      t.workbench = {
        sourceIds: [room.id, ...t.furniture.map((f) => f.id)],
        assets: structuredClone(w.assets.filter((a) => assetIds.has(a.id))),
        interiors: w.interiors
          .filter((l) => l.room === room.id)
          .map((l) => ({
            ...structuredClone(l),
            items: l.items.map((i) => ({
              ...structuredClone(i),
              x: i.x - room.x,
              y: i.y - room.y,
            })),
          })),
        stairs: structuredClone(w.stairs[room.id] || null),
        fields: structuredClone(w.fields),
        values: Object.fromEntries(
          Object.entries(w.values).filter(([id]) => ids.has(id)),
        ),
        finishes: structuredClone(p.design.finishes[room.id] || null),
        tiles: structuredClone(p.design.tiles[room.id] || null),
        roomProperties: structuredClone(
          p.design.roomProperties[room.id] || null,
        ),
      };
    }
  }
  return wbCollectionWrite.call(this, key, records);
};
const wbPlaceTemplate = PlanningUI.placeTemplate;
PlanningUI.placeTemplate = function (i) {
  const previous = WorkbenchModel.templateOperation;
  WorkbenchModel.templateOperation = this.templates[i]?.workbench;
  try {
    return wbPlaceTemplate.call(this, i);
  } finally {
    WorkbenchModel.templateOperation = previous;
  }
};
WorkbenchModel.placeTemplateMetadata = function (before, state, extra) {
  const added = state.data.elements.filter(
      (e) => !before.elements.some((v) => v.id === e.id),
    ),
    room = added.find((e) => !e.isFurniture);
  if (!room) return;
  const w = state.meta.design.workbench,
    assetMap = new Map();
  for (const source of extra.assets || []) {
    const existing = w.assets.find((a) => a.id === source.id);
    let id = source.id;
    if (existing && existing.data !== source.data) id = ProjectModel.uid();
    if (!existing || id !== source.id)
      w.assets.push({ ...structuredClone(source), id });
    assetMap.set(source.id, id);
  }
  for (const e of added)
    if (assetMap.has(e.assetId)) e.assetId = assetMap.get(e.assetId);
  for (const l of extra.interiors || [])
    w.interiors.push({
      ...structuredClone(l),
      id: ProjectModel.uid(),
      room: room.id,
      items: l.items.map((i) => ({
        ...structuredClone(i),
        id: ProjectModel.uid(),
        x: i.x + room.x,
        y: i.y + room.y,
      })),
    });
  if (extra.stairs) w.stairs[room.id] = structuredClone(extra.stairs);
  for (const key of ["finishes", "tiles", "roomProperties"])
    if (extra[key])
      state.meta.design[key][room.id] = structuredClone(extra[key]);
  for (const f of extra.fields || []) {
    const exists = w.fields.find((v) => v.key === f.key);
    if (exists && exists.type !== f.type)
      throw Error("Template custom property type does not match this project");
    if (!exists)
      w.fields.push({ ...structuredClone(f), id: ProjectModel.uid() });
  }
  (extra.sourceIds || []).forEach((source, index) => {
    const target = added[index];
    if (target && extra.values?.[source])
      w.values[target.id] = structuredClone(extra.values[source]);
  });
};
