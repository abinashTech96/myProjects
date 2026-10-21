/* Discoverable planning tools, restored widgets and project workflows. */
const PlanningUI = {
  ready: false,
  tool: "select",
  clicks: [],
  preferences: {},
  cache: null,
  selectedField: null,
  esc: ProjectModel.escapeHTML,
  p() {
    return ProjectState.capture();
  },
  get data() {
    return ProjectState.meta.planning;
  },
  button(label, action, cls = "") {
    return StudioUI.button(label, action, cls);
  },
  field(id, label, value = "", type = "text", extra = "") {
    return `<label>${this.esc(label)}<input id="${id}" type="${type}" value="${this.esc(value)}" ${extra}></label>`;
  },
  select(id, label, items, value) {
    return `<label>${this.esc(label)}<select id="${id}">${items
      .map((x) => {
        const [v, l] = Array.isArray(x) ? x : [x, x];
        return `<option value="${this.esc(v)}" ${v === value ? "selected" : ""}>${this.esc(l)}</option>`;
      })
      .join("")}</select></label>`;
  },
  val(id) {
    return document.getElementById(id)?.value || "";
  },
  num(id) {
    const v = Number(this.val(id));
    if (!this.val(id).trim() || !Number.isFinite(v))
      throw Error("Enter a valid value for " + id);
    return v;
  },
  run(fn) {
    try {
      return fn();
    } catch (e) {
      StudioUI.message(e.message, "error");
      return false;
    }
  },
  change(label, fn) {
    return this.run(() => ProjectState.commit(label, fn));
  },
  dialog(title, body) {
    return StudioUI.dialog(title, body);
  },
  init() {
    this.preferences = this.readPrefs();
    if (!Array.isArray(this.preferences.favourites))
      this.preferences.favourites = [];
    if (
      !this.preferences.widgets ||
      typeof this.preferences.widgets !== "object"
    )
      this.preferences.widgets = {
        checks: false,
        vastu: false,
        area: false,
        converter: false,
      };
    const header = document.querySelector(".studio-header"),
      entry = document.createElement("div");
    entry.className = "planning-entry";
    entry.innerHTML =
      this.button("Build", "PlanningUI.collapse('catalog')") +
      this.button("Tools", "PlanningUI.toolsDialog()") +
      '<button type="button" class="studio-button" aria-label="Workspace widgets" onclick="PlanningUI.widgetsDialog()">Widgets</button>' +
      '<button type="button" class="studio-button" aria-label="Canvas settings" onclick="StudioUI.canvasSettingsDialog()">Settings</button>' +
      this.button("Search", "PlanningUI.commandDialog()");
    entry.lastElementChild.setAttribute("aria-label", "Search tools");
    entry.lastElementChild.title = "Search tools (Ctrl/⌘ K)";
    header.querySelector(".studio-brand").after(entry);
    const catalog = document.querySelector(".studio-catalog"),
      tools = catalog.querySelector(".studio-tools");
    tools.innerHTML =
      this.button("Draw walls", "PlanningUI.setTool('wall')") +
      this.button("Auto-builder", "PlanningUI.builderDialog()") +
      this.button("Plot & units", "StudioUI.projectDialog()") +
      this.button("Rooms & objects", "StudioUI.objectsDialog()");
    tools.insertAdjacentHTML(
      "afterbegin",
      '<div id="planning-favourites"></div>',
    );
    catalog.insertAdjacentHTML(
      "beforeend",
      '<div class="planning-resizer" data-side="catalog" role="separator" tabindex="0" aria-label="Resize asset catalog"></div>',
    );
    document
      .querySelector(".studio-inspector")
      .insertAdjacentHTML(
        "beforeend",
        '<div class="planning-resizer" data-side="inspector" role="separator" tabindex="0" aria-label="Resize properties"></div>',
      );
    const dock = document.createElement("div");
    dock.id = "planning-dock";
    dock.setAttribute("aria-label", "Pinned widgets");
    document.body.appendChild(dock);
    const mode = document.createElement("div");
    mode.id = "planning-mode";
    mode.innerHTML =
      '<span id="planning-mode-label">Select</span>' +
      this.button("Finish", "PlanningUI.finishTool()") +
      this.button("Cancel / Esc", 'PlanningUI.setTool("select")');
    document.body.appendChild(mode);
    const nav = document.createElement("div");
    nav.id = "planning-navigation";
    nav.innerHTML =
      this.button("Objects", "StudioUI.objectsDialog()") +
      this.button("Pan", "StudioUI.panDialog()") +
      this.button("−", "PlanningUI.zoom(0.8)") +
      this.button("Fit plot", "StudioUI.fitPlan()") +
      this.button("Fit selection", "centerOnSelection()") +
      this.button("+", "PlanningUI.zoom(1.25)");
    document.body.appendChild(nav);
    this.ready = true;
    this.applyPrefs();
    this.refresh();
    document.addEventListener("focusin", (e) => {
      if (e.target.matches("#studio-properties input[data-measure]"))
        this.selectedField = {
          id: elements[selectedElIndex]?.id,
          key: e.target.dataset.measure,
        };
    });
    document.addEventListener(
      "keydown",
      (e) => {
        if (
          (e.ctrlKey || e.metaKey) &&
          e.key.toLowerCase() === "k" &&
          !RoomStudio.activeRoom
        ) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.commandDialog();
          return;
        }
        if (
          this.tool !== "select" &&
          !e.target.closest("input,textarea,select")
        ) {
          if (e.key === "Escape" || e.key === "Enter") {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.key === "Enter" ? this.finishTool() : this.setTool("select");
          }
        }
      },
      true,
    );
    document
      .getElementById("blueprint")
      .addEventListener("pointerdown", (e) => this.canvasClick(e), true);
    document
      .getElementById("blueprint")
      .addEventListener("pointermove", (e) => {
        const g = this.modelPoint(e);
        document.getElementById("studio-coordinates").textContent =
          `X ${this.length(g.x)} · Y ${this.length(g.y)}`;
        if (this.tool !== "select" && this.clicks.length) {
          this.cursor = this.snap(g);
          PlanningDrawing.render();
        }
      });
    document.addEventListener("pointerdown", (e) => this.resizePanel(e));
    document.querySelectorAll(".planning-resizer").forEach((el) =>
      el.addEventListener("keydown", (e) => {
        if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
          e.preventDefault();
          const side = el.dataset.side,
            key = side === "catalog" ? "catalogWidth" : "inspectorWidth";
          this.preferences[key] = Math.max(
            180,
            Math.min(
              480,
              (this.preferences[key] || (side === "catalog" ? 230 : 300)) +
                (e.key === "ArrowRight" ? 10 : -10),
            ),
          );
          this.applyPrefs();
          this.savePrefs();
        }
      }),
    );
    AppEvents.onStateChange(() => this.refresh());
    AppEvents.onSelectionChange(() => {
      if (this.ready && this.cache) this.renderWidgets();
    });
    window.addEventListener("online", () => this.refresh());
    window.addEventListener("offline", () => this.refresh());
    if ("serviceWorker" in navigator && location.protocol !== "file:")
      navigator.serviceWorker
        .register("./sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          this.offlineReady = true;
          this.refresh();
        })
        .catch((e) => {
          this.offlineError = e.message;
        });
  },
  readPrefs() {
    try {
      return {
        widgets: {
          checks: false,
          vastu: false,
          area: false,
          converter: false,
          measurements: false,
          selection: false,
          navigation: false,
          shortcuts: false,
        },
        favourites: [],
        catalogCollapsed: true,
        ...JSON.parse(localStorage.getItem("ArchCAD_Workspace") || "{}"),
      };
    } catch {
      return {
        widgets: { checks: false, vastu: false, area: false, converter: false },
        favourites: [],
        catalogCollapsed: true,
      };
    }
  },
  savePrefs() {
    try {
      localStorage.setItem(
        "ArchCAD_Workspace",
        JSON.stringify(this.preferences),
      );
    } catch (error) {
      StudioUI.message(
        "Workspace preferences could not be saved: " + error.message,
        "error",
      );
    }
  },
  applyPrefs() {
    document.documentElement.style.setProperty(
      "--catalog-width",
      (this.preferences.catalogWidth || 230) + "px",
    );
    document.documentElement.style.setProperty(
      "--inspector-width",
      (this.preferences.inspectorWidth || 300) + "px",
    );
    for (const side of ["catalog", "inspector"])
      document.body.classList.toggle(
        side + "-collapsed",
        !!this.preferences[side + "Collapsed"],
      );
    this.renderFavourites();
  },
  collapse(side) {
    if (matchMedia("(max-width:850px)").matches) {
      if (side === "catalog") {
        const opening = !document.body.classList.contains("catalog-open");
        document.body.classList.toggle("catalog-open", opening);
        document.body.classList.toggle("inspector-open", !opening && !!elements[selectedElIndex]);
      } else {
        document.body.classList.remove("catalog-open");
        document.body.classList.toggle("inspector-open");
      }
      return;
    }
    this.preferences[side + "Collapsed"] =
      !this.preferences[side + "Collapsed"];
    this.applyPrefs();
    this.savePrefs();
    window.dispatchEvent(new Event("resize"));
  },
  resizePanel(e) {
    const el = e.target.closest(".planning-resizer");
    if (!el) return;
    e.preventDefault();
    const side = el.dataset.side,
      key = side === "catalog" ? "catalogWidth" : "inspectorWidth";
    const move = (ev) => {
      this.preferences[key] = Math.max(
        180,
        Math.min(
          480,
          side === "catalog" ? ev.clientX : innerWidth - ev.clientX,
        ),
      );
      this.applyPrefs();
    };
    const stop = () => {
      document.removeEventListener("pointermove", move);
      this.savePrefs();
      window.dispatchEvent(new Event("resize"));
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop, { once: true });
  },
  length(n) {
    const unit = document.getElementById("unitSelect").value;
    return ProjectModel.display(n, unit) + (unit === "ftin" ? "" : ` ${unit}`);
  },
  parse(text, unit = document.getElementById("unitSelect").value) {
    const v = PlanningUnits.parse(text, unit);
    if (!Number.isFinite(v))
      throw Error("Enter a measurement such as 10' 6 1/2\"");
    return v;
  },
  zoom(factor) {
    CanvasState.zoomLvl = Math.max(
      0.2,
      Math.min(5, CanvasState.zoomLvl * factor),
    );
    updateViewport();
    StorageEngine.markDirty();
  },
  refresh() {
    if (!this.ready) return;
    const p = this.p(),
      fingerprint = JSON.stringify({
        elements: p.elements,
        fixtures: p.fixtures,
        planning: p.planning,
        walls: p.wallSettings,
        overrides: p.wallOverrides,
        plot: p.plot,
        unit: p.unit,
        compass: p.compass,
        floor: p.currentFloor,
      });
    if (this.cache?.fingerprint !== fingerprint)
      this.cache = {
        fingerprint,
        p,
        analysis: PlanningModel.analyze(p),
        vastu: PlanningModel.vastu(p, currentFloor),
        quantities: PlanningModel.quantities(p),
      };
    this.renderWidgets();
    this.renderFavourites();
    const active = [
      isMeasuringMode ? "Measure" : null,
      typeof isSectionMode !== "undefined" && isSectionMode
        ? "Section cut"
        : null,
      CanvasControlsEngine.isGridSnap()
        ? "Snap " + this.length(this.data.snap.spacing)
        : null,
    ].filter(Boolean);
    document.getElementById("planning-mode-label").textContent =
      (this.tool === "select"
        ? "Select"
        : this.tool + " · " + this.clicks.length + " points") +
      (active.length ? " · " + active.join(" · ") : "");
    document
      .getElementById("planning-mode")
      .classList.toggle("drawing-active", this.tool !== "select");
    document
      .querySelectorAll("#planning-mode button")
      .forEach((b) => (b.hidden = this.tool === "select"));
    const f = document.getElementById("planning-offline-status");
    if (f)
      f.textContent = navigator.onLine
        ? this.offlineReady
          ? "Offline cache installed"
          : "Online"
        : "Offline";
  },
  renderWidgets() {
    const dock = document.getElementById("planning-dock");
    if (!dock) return;
    const { p, analysis, vastu, quantities } = this.cache,
      rows = quantities.floors.find((f) => f.floor === currentFloor),
      selection = Selection.indices().map((i) => elements[i]),
      widgets = {
        checks: {
          title: "Layout checks",
          text: `${analysis.results.length} warnings · ${analysis.passed}/${analysis.total} checks`,
          action: "StudioUI.checksDialog()",
        },
        vastu: {
          title: "Vastu",
          text:
            vastu.score === null
              ? "Not evaluated"
              : `${vastu.score}% · ${vastu.count} rooms`,
          action: "PlanningUI.vastuDialog()",
        },
        area: {
          title: "Floor area",
          text: `${(rows?.floorArea || 0).toFixed(1)} sq ft clear`,
          action: "PlanningUI.areaDialog()",
        },
        converter: {
          title: "Unit converter",
          text: "Length · area · fractions",
          action: "PlanningUI.converterDialog()",
        },
        measurements: {
          title: "Measurements",
          text: `${p.planning.measurements.length} saved`,
          action: "PlanningUI.measurementsDialog()",
        },
        selection: {
          title: "Selection",
          text: `${selection.length} items · ${(selection.reduce((s, e) => s + PlanningModel.area(PlanningModel.points(e)), 0) / 144).toFixed(1)} sq ft bounds`,
          action: "PlanningUI.selectionDialog()",
        },
        navigation: {
          title: "Navigation",
          text: `${globalCompassDir} ↑ · ${Math.round(CanvasState.zoomLvl * 100)}%`,
          action: "PlanningUI.savedViewsDialog()",
        },
        shortcuts: {
          title: "Shortcuts",
          text: "Keyboard & touch guide",
          action: "StudioUI.shortcuts()",
        },
      };
    const html = Object.entries(widgets)
      .filter(([k]) => this.preferences.widgets?.[k])
      .map(
        ([k, w]) =>
          `<button class="planning-widget" data-widget="${k}" onclick="${w.action}"><strong>${w.title}</strong><span>${this.esc(w.text)}</span></button>`,
      )
      .join("");
    if (dock.innerHTML !== html) dock.innerHTML = html;
  },
  widgetsDialog() {
    this.dialog(
      "Workspace widgets",
      `<p>Pin the cards you use. Your choices are saved on this device.</p><div class="studio-action-row">${this.button("Show core widgets", "PlanningUI.widgetPreset(true)")}${this.button("Hide all widgets", "PlanningUI.widgetPreset(false)")}</div>${["checks", "vastu", "area", "converter", "measurements", "selection", "navigation", "shortcuts"].map((k) => `<label><input type="checkbox" ${this.preferences.widgets?.[k] ? "checked" : ""} onchange="PlanningUI.toggleWidget('${k}',this.checked)">${this.esc({ checks: "Compliance / layout checks", vastu: "Vastu score", area: "Live floor area", converter: "Unit converter", measurements: "Measurements", selection: "Selection summary", navigation: "Navigation & saved views", shortcuts: "Shortcuts" }[k])}</label>`).join("")}${this.button("Reset workspace", "PlanningUI.resetWorkspace()")}`,
    );
  },
  widgetPreset(core) {
    const keys = ["checks", "vastu", "area", "converter", "measurements", "selection", "navigation", "shortcuts"];
    this.preferences.widgets = Object.fromEntries(keys.map((key, i) => [key, core && i < 4]));
    this.savePrefs();
    this.refresh();
    this.widgetsDialog();
  },
  toggleWidget(k, value) {
    this.preferences.widgets ||= {};
    this.preferences.widgets[k] = value;
    this.savePrefs();
    this.refresh();
  },
  resetWorkspace() {
    localStorage.removeItem("ArchCAD_Workspace");
    this.preferences = this.readPrefs();
    this.applyPrefs();
    this.refresh();
    this.widgetsDialog();
  },
  tools() {
    return [
      ["Build", "Polygon room", "PlanningUI.polygonDialog()"],
      ["Build", "Draw walls", 'PlanningUI.setTool("wall")'],
      ["Build", "Wall editor", "PlanningUI.wallsDialog()"],
      ["Build", "Auto-builder", "PlanningUI.builderDialog()"],
      ["Build", "Stair designer", "PlanningUI.stairDialog()"],
      ["Build", "Room templates", "PlanningUI.templatesDialog()"],
      ["Build", "Openings", "PlanningUI.openingsDialog()"],
      ["Build", "Trace background plan", "PlanningUI.underlayDialog()"],
      ["Inspect", "Layout checks", "StudioUI.checksDialog()"],
      ["Inspect", "Vastu score", "PlanningUI.vastuDialog()"],
      ["Inspect", "Room connectivity", "PlanningUI.connectivityDialog()"],
      ["Inspect", "Floor comparison", "PlanningUI.comparisonDialog()"],
      ["Inspect", "Clearance overlays", "PlanningUI.clearanceDialog()"],
      ["Inspect", "Live area", "PlanningUI.areaDialog()"],
      ["Utilities", "Unit converter", "PlanningUI.converterDialog()"],
      ["Utilities", "Measurements", "PlanningUI.measurementsDialog()"],
      ["Utilities", "Annotations", "PlanningUI.annotationsDialog()"],
      [
        "Utilities",
        "Electrical layout",
        'PlanningUI.servicesDialog("electrical")',
      ],
      ["Utilities", "Plumbing layout", 'PlanningUI.servicesDialog("plumbing")'],
      ["Utilities", "Materials & costs", "PlanningUI.costDialog()"],
      ["Utilities", "Project library", "PlanningUI.libraryDialog()"],
      ["Utilities", "Drawing set", "PlanningDrawing.sheetDialog()"],
      ["View", "Layers", "PlanningUI.layersDialog()"],
      ["View", "Snapping", "PlanningUI.snapDialog()"],
      ["View", "Navigation & saved views", "PlanningUI.savedViewsDialog()"],
      ["View", "Performance", "PlanningUI.performanceDialog()"],
      ["View", "3D tools", "StudioUI.viewToolsDialog()"],
      ["View", "Widgets", "PlanningUI.widgetsDialog()"],
      ["View", "Shortcuts", "StudioUI.shortcuts()"],
      ["View", "Project & units", "StudioUI.projectDialog()"],
      ["View", "Versions", "StudioUI.versionsDialog()"],
      ["View", "AI assistant", "StudioUI.aiDialog()"],
      ["Inspect", "Section cut", "toggleSectionCut()"],
      ["View", "Canvas settings", "StudioUI.canvasSettingsDialog()"],
      ["View", "Rooms & objects", "StudioUI.objectsDialog()"],
    ];
  },
  toolsDialog(category = "Build") {
    this.dialog(
      "Tools",
      `<div class="workspace-tool-sections" aria-label="Tool collections">${this.button("Design", "DesignUI.menu()")}${this.button("Pro", "WorkbenchUI.menu()")}${this.button("3D tools", "StudioUI.viewToolsDialog()")}${this.button("Search all tools", "PlanningUI.commandDialog()")}</div><div class="planning-tabs">${["Build", "Inspect", "Utilities", "View"].map((c) => this.button(c, `PlanningUI.toolsDialog('${c}')`, c === category ? "active" : "")).join("")}</div><div class="planning-tool-list">${this.tools()
        .map((t, i) =>
          t[0] === category
            ? `<div>${this.button(t[1], `PlanningUI.launch(${i})`)}<button class="studio-button" aria-label="Favourite ${this.esc(t[1])}" onclick="PlanningUI.favourite(${i});PlanningUI.toolsDialog('${category}')">${this.preferences.favourites?.includes(t[1]) ? "★" : "☆"}</button></div>`
            : "",
        )
        .join("")}</div>`,
    );
  },
  toolActions() {
    return [
      () => this.polygonDialog(),
      () => this.setTool("wall"),
      () => this.wallsDialog(),
      () => this.builderDialog(),
      () => this.stairDialog(),
      () => this.templatesDialog(),
      () => this.openingsDialog(),
      () => this.underlayDialog(),
      () => this.checksDialog(),
      () => this.vastuDialog(),
      () => this.connectivityDialog(),
      () => this.comparisonDialog(),
      () => this.clearanceDialog(),
      () => this.areaDialog(),
      () => this.converterDialog(),
      () => this.measurementsDialog(),
      () => this.annotationsDialog(),
      () => this.servicesDialog("electrical"),
      () => this.servicesDialog("plumbing"),
      () => this.costDialog(),
      () => this.libraryDialog(),
      () => PlanningDrawing.sheetDialog(),
      () => this.layersDialog(),
      () => this.snapDialog(),
      () => this.savedViewsDialog(),
      () => this.performanceDialog(),
      () => StudioUI.viewToolsDialog(),
      () => this.widgetsDialog(),
      () => StudioUI.shortcuts(),
      () => StudioUI.projectDialog(),
      () => StudioUI.versionsDialog(),
      () => StudioUI.aiDialog(),
      () => toggleSectionCut(),
      () => StudioUI.canvasSettingsDialog(),
      () => StudioUI.objectsDialog(),
    ];
  },
  launch(i) {
    document.getElementById("studio-dialog")?.close();
    const action = this.tools()[i]?.[2];
    if (action) this.toolActions()[i]();
  },
  favourite(i) {
    const name = this.tools()[i][1];
    this.preferences.favourites ||= [];
    this.preferences.favourites = this.preferences.favourites.includes(name)
      ? this.preferences.favourites.filter((n) => n !== name)
      : [...this.preferences.favourites, name];
    this.savePrefs();
    this.renderFavourites();
  },
  renderFavourites() {
    const el = document.getElementById("planning-favourites");
    if (el) {
      const html = this.tools()
        .map((t, i) =>
          this.preferences.favourites?.includes(t[1])
            ? this.button("★ " + t[1], `PlanningUI.launch(${i})`)
            : "",
        )
        .join("");
      if (el.innerHTML !== html) el.innerHTML = html;
    }
  },
  commandDialog() {
    this.dialog(
      "Find a tool or room",
      `<input id="planning-command" aria-label="Search commands" placeholder="Search tools, rooms, settings…" oninput="PlanningUI.commandResults(this.value)"><div id="planning-command-results"></div>`,
    );
    this.commandResults("");
    document.getElementById("planning-command").focus();
  },
  commandResults(query) {
    const q = query.toLowerCase();
    document.getElementById("planning-command-results").innerHTML =
      this.tools()
        .map((t, i) =>
          t[1].toLowerCase().includes(q)
            ? this.button(t[1] + " · " + t[0], `PlanningUI.launch(${i})`)
            : "",
        )
        .join("") +
      elements
        .map((e, i) =>
          (e.customName || e.type).toLowerCase().includes(q)
            ? this.button(
                this.esc(e.customName || e.type) + ` · Floor ${e.floor}`,
                `PlanningUI.focusRoom(${i})`,
              )
            : "",
        )
        .join("");
  },
  focusRoom(i) {
    document.getElementById("studio-dialog")?.close();
    setFloor(elements[i].floor);
    StudioUI.select(i);
    centerOnSelection();
  },
  areaDialog() {
    const q = PlanningModel.quantities(this.p());
    this.dialog(
      "Live areas",
      `<p>Clear area deducts walls. Bounds follow wall centerlines. Overlapping spaces are counted individually.</p><table><thead><tr><th>Floor</th><th>Bounds sq ft</th><th>Clear sq ft</th></tr></thead><tbody>${q.floors.map((f) => `<tr><td>${f.floor}</td><td>${f.boundArea.toFixed(2)}</td><td>${f.floorArea.toFixed(2)}</td></tr>`).join("")}<tr><th>Building</th><td>${q.floors.reduce((s, f) => s + f.boundArea, 0).toFixed(2)}</td><td>${q.floors.reduce((s, f) => s + f.floorArea, 0).toFixed(2)}</td></tr></tbody></table><ul>${elements
        .filter((e) => e.floor === currentFloor && !e.isFurniture)
        .map(
          (e) =>
            `<li>${this.esc(e.customName || e.type)}: ${((PlanningModel.clear(this.p(), e).area || 0) / 144).toFixed(2)} sq ft clear</li>`,
        )
        .join("")}</ul>`,
    );
  },
  vastuDialog() {
    const d = PlanningModel.vastu(this.p(), currentFloor);
    this.dialog(
      "Vastu preferences",
      `<p class="planning-score">${d.score === null ? "Not evaluated" : d.score + "%"} <small>Floor ${currentFloor} · ${d.count} applicable rooms</small></p><p>This built-in directional preference set is design guidance. Score is the average of applicable room ratings. Ordinary bedrooms are excluded; mark a master bedroom in Properties.</p>${d.rooms.map((r) => `<button class="studio-list-item" onclick="PlanningUI.focusRoom(${r.index})">${this.esc(r.name)} · ${r.zone} · ${Math.round(r.rating * 100)}%<small>${this.esc(r.target)}</small></button>`).join("") || "<p>Add a kitchen, puja, toilet or master bedroom to evaluate.</p>"}`,
    );
  },
  checksDialog(scope = "all") {
    const p = this.p(),
      d = PlanningModel.analyze(p, scope);
    this.lastChecks = d.results;
    this.dialog(
      "Compliance / layout checks",
      `${this.select("check-scope", "Scope", [["all", "Whole project"], ...Array.from({ length: p.floorCount }, (_, i) => [String(i), "Floor " + i])], String(scope))}<button class="studio-button" onclick="PlanningUI.checksDialog(PlanningUI.val('check-scope'))">Refresh scope</button><p>${d.total ? `${d.passed}/${d.total} checks passed` : "Not evaluated"} · ${d.results.length} results</p><p class="studio-hint">User-configured design rules. No local regulation preset is supplied.</p>${d.results.map((r, i) => `<button class="studio-list-item" onclick="PlanningUI.focusRoom(${r.index})">Floor ${r.floor} · ${this.esc(p.elements[r.index]?.customName || p.elements[r.index]?.type)} · ${r.severity}<small>${this.esc(r.text)}</small></button>`).join("") || "<p>No layout warnings.</p>"}<details><summary>Checks passed</summary>${d.checks
        .filter((r) => r.pass)
        .map(
          (r) =>
            `<p>Floor ${r.floor} · ${this.esc(r.code)} · ${this.esc(p.elements[r.index]?.customName || p.elements[r.index]?.type)}</p>`,
        )
        .join(
          "",
        )}</details><details><summary>Unsupported / manual checks</summary>${d.unsupported.map((t) => `<p>${this.esc(t)}</p>`).join("")}<p>Polygon clear area uses a uniform external-wall inset. Mixed wall thickness offsets need manual review.</p></details><details><summary>Edit room rules</summary><p>Clear dimensions are inches; areas are sq ft; ventilation is a decimal ratio.</p><textarea id="planning-rules">${this.esc(JSON.stringify(this.data.rules, null, 2))}</textarea>${this.button("Apply rules", "PlanningUI.applyRules()")}</details>`,
    );
  },
  applyRules() {
    this.run(() => {
      const rules = JSON.parse(this.val("planning-rules"));
      if (this.change("Changed design rules", () => (this.data.rules = rules)))
        this.checksDialog();
    });
  },
  converterDialog() {
    this.dialog(
      "Unit converter",
      `<div class="planning-tabs">${this.select(
        "converter-kind",
        "Type",
        [
          ["length", "Length"],
          ["area", "Area"],
        ],
        "length",
      )}</div>${this.field("converter-value", "Value", "10' 6 1/2\"")}${this.select(
        "converter-from",
        "Input unit",
        [
          ["ftin", "Feet & inches"],
          ["ft", "Decimal feet"],
          ["in", "Inches"],
          ["mm", "Millimetres"],
          ["cm", "Centimetres"],
          ["m", "Metres"],
          ["sqft", "Square feet"],
          ["sqm", "Square metres"],
          ["sqyd", "Square yards"],
          ["regional", this.data.regional.label],
        ],
        "ftin",
      )}${this.button("Convert", "PlanningUI.convert()", "primary")}<div id="converter-results" aria-live="polite"></div>${this.field("regional-label", "Regional area name", this.data.regional.label)}${this.field("regional-factor", "Square feet per regional unit", this.data.regional.sqft, "number")}${this.button("Save regional definition", "PlanningUI.saveRegional()")}<p>Apply uses the last selected geometry field. The result is independent of the current display unit.</p>${this.button("Apply to selected field", "PlanningUI.applyConversion()")}`,
    );
    this.convert();
  },
  convert() {
    this.run(() => {
      const kind = this.val("converter-kind"),
        from = this.val("converter-from"),
        text = this.val("converter-value");
      const lengthUnits = ["ftin", "ft", "in", "mm", "cm", "m"],
        areaUnits = ["sqft", "sqm", "sqyd", "regional"];
      if (!(kind === "length" ? lengthUnits : areaUnits).includes(from))
        throw Error("Choose a unit matching the conversion type");
      const factors = {
        sqft: 1,
        sqm: 10.7639104167,
        sqyd: 9,
        regional: this.data.regional.sqft,
      };
      const base =
        kind === "length"
          ? PlanningUnits.parse(text, from)
          : Number(text) * factors[from];
      if (!Number.isFinite(base) || !text.trim())
        throw Error("Enter a valid number");
      this.conversion = { kind, base };
      document.getElementById("converter-results").innerHTML =
        (kind === "length"
          ? lengthUnits.map(
              (u) =>
                `<p><strong>${u}</strong>: ${this.esc(PlanningUnits.format(base, u))}</p>`,
            )
          : areaUnits.map(
              (u) =>
                `<p><strong>${this.esc(u === "regional" ? this.data.regional.label : u)}</strong>: ${Number((base / factors[u]).toFixed(6))}</p>`,
            )
        ).join("") + this.button("Copy results", "PlanningUI.copyConversion()");
    });
  },
  copyConversion() {
    const text = document.getElementById("converter-results").innerText;
    this.copy(text);
  },
  copy(text) {
    if (navigator.clipboard?.writeText)
      navigator.clipboard
        .writeText(text)
        .then(() => StudioUI.message("Copied."))
        .catch(() => this.copyFallback(text));
    else this.copyFallback(text);
  },
  copyFallback(text) {
    this.dialog(
      "Copy result",
      `<textarea readonly id="copy-result">${this.esc(text)}</textarea>`,
    );
    document.getElementById("copy-result").select();
  },
  applyConversion() {
    if (this.conversion?.kind !== "length" || !this.selectedField)
      return StudioUI.message(
        "Select a geometry field first and convert a length.",
        "error",
      );
    const { id, key } = this.selectedField,
      index = elements.findIndex((e) => e.id === id);
    if (index < 0)
      return StudioUI.message(
        "Select an existing geometry field first.",
        "error",
      );
    const result = StudioUI.edit(index, key, this.conversion.base);
    document.getElementById("studio-dialog")?.close();
    return result;
  },
  saveRegional() {
    this.run(() =>
      this.change(
        "Changed regional area definition",
        () =>
          (this.data.regional = {
            label: this.val("regional-label"),
            sqft: this.num("regional-factor"),
          }),
      ),
    );
  },
  selectionDialog() {
    const list = Selection.indices().map((i) => elements[i]);
    this.dialog(
      "Selection summary",
      `<p>${list.length} selected · ${(list.reduce((s, e) => s + PlanningModel.area(PlanningModel.points(e)), 0) / 144).toFixed(2)} sq ft bounds</p>${list.map((e) => `<p>${this.esc(e.customName || e.type)} · ${this.length(e.w)} × ${this.length(e.h)}</p>`).join("")}<div class="studio-action-grid">${["Align left", "Align right", "Align top", "Align bottom", "Distribute X", "Distribute Y", "Group", "Ungroup"].map((a) => this.button(a, `Selection.action('${a}')`)).join("")}</div>`,
    );
  },
  modelPoint(e) {
    const q = getMousePos(e),
      { I, SCALE } = Utils.getMetrics();
    return { x: (q.x - I.x) / SCALE, y: (q.y - I.y) / SCALE };
  },
  snap(pt) {
    return PlanningModel.snap(this.p(), pt, currentFloor, this.clicks.at(-1));
  },
  setTool(tool) {
    if (
      tool !== "select" &&
      typeof isSectionMode !== "undefined" &&
      isSectionMode
    )
      toggleSectionCut();
    this.tool = tool;
    this.clicks = [];
    this.cursor = null;
    isMeasuringMode = false;
    document.getElementById("studio-dialog")?.close();
    document.getElementById("blueprint").style.cursor =
      tool === "select" ? "" : "crosshair";
    setWorkspaceLayout("2d");
    this.refresh();
    PlanningDrawing.render();
    if (tool !== "select")
      StudioUI.message(
        "Click points on the plan. Enter finishes; Escape cancels.",
      );
  },
  canvasClick(e) {
    if (this.tool === "select" || e.button !== 0) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    let p = this.snap(this.modelPoint(e));
    const project = this.p(),
      w = ProjectModel.inches(project.plot.inW, project.unit),
      h = ProjectModel.inches(project.plot.inH, project.unit);
    if (p.x < 0 || p.y < 0 || p.x > w || p.y > h)
      return StudioUI.message(
        "Choose points inside the buildable boundary.",
        "error",
      );
    p = { x: p.x, y: p.y };
    this.clicks.push(p);
    if (this.tool === "measure" && this.clicks.length === 2) this.finishTool();
    else if (
      [
        "note",
        "callout",
        "cloud",
        "light",
        "switch",
        "socket",
        "panel",
        "shaft",
      ].includes(this.tool) &&
      this.clicks.length >= (["callout", "cloud"].includes(this.tool) ? 2 : 1)
    )
      this.finishTool();
    else if (this.tool === "wall" && this.clicks.length >= 2) {
      const [a, b] = this.clicks.slice(-2);
      if (this.addWall(a, b)) this.clicks = [b];
    }
    this.refresh();
    PlanningDrawing.render();
  },
  finishTool() {
    return this.run(() => {
      const pts = this.clicks.map((p) => ({ x: p.x, y: p.y })),
        tool = this.tool;
      if (tool === "polygon") {
        if (pts.length < 3) throw Error("Choose at least three vertices");
        this.addPolygon(pts, this.polygonType || "living");
      } else if (tool === "measure") {
        if (pts.length !== 2) throw Error("Choose two measurement points");
        this.change("Added measurement", () =>
          this.data.measurements.push({
            id: ProjectModel.uid(),
            floor: currentFloor,
            a: pts[0],
            b: pts[1],
            label: "Measurement " + (this.data.measurements.length + 1),
          }),
        );
      } else if (["note", "callout", "cloud"].includes(tool)) {
        const text = this.annotationText || "Note";
        if (!pts.length) throw Error("Choose a location");
        const a = pts[0],
          b = pts[1];
        if (tool === "cloud" && !b) throw Error("Choose two corners");
        this.change("Added annotation", () =>
          this.data.annotations.push({
            id: ProjectModel.uid(),
            floor: currentFloor,
            kind: tool,
            text,
            x: tool === "cloud" ? Math.min(a.x, b.x) : a.x,
            y: tool === "cloud" ? Math.min(a.y, b.y) : a.y,
            ...(tool === "callout" ? { target: b } : {}),
            ...(tool === "cloud"
              ? { w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }
              : {}),
          }),
        );
      } else if (
        [
          "light",
          "switch",
          "socket",
          "panel",
          "shaft",
          "supply",
          "drain",
        ].includes(tool)
      ) {
        if (
          !pts.length ||
          (["supply", "drain"].includes(tool) && pts.length < 2)
        )
          throw Error("Choose the service points");
        this.change("Added service", () =>
          this.data.services.push({
            id: ProjectModel.uid(),
            floor: currentFloor,
            layer: ["supply", "drain", "shaft"].includes(tool)
              ? "plumbing"
              : "electrical",
            kind: tool,
            points: pts,
            label: this.serviceLabel || tool,
            circuit: this.serviceCircuit || "",
          }),
        );
      }
      this.setTool("select");
      return true;
    });
  },
  addPolygon(pts, type) {
    const minX = Math.min(...pts.map((p) => p.x)),
      minY = Math.min(...pts.map((p) => p.y)),
      maxX = Math.max(...pts.map((p) => p.x)),
      maxY = Math.max(...pts.map((p) => p.y));
    if (!PlanningModel.simple(pts)) throw Error("Polygon edges must not cross");
    return this.change("Added polygon room", () =>
      elements.push({
        id: ProjectModel.uid(),
        type,
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
        points: pts.map((p) => ({ x: p.x - minX, y: p.y - minY })),
        floor: currentFloor,
        locked: false,
        rot: 0,
      }),
    );
  },
  polygonDialog() {
    this.dialog(
      "Polygon room",
      `${this.select("polygon-type", "Room type", ["living", "bedroom", "kitchen", "toilet", "puja"], "living")}<p>Click vertices to trace an angled or L-shaped room, then press Enter. Or enter absolute plot coordinates in inches:</p><textarea id="polygon-points">20,20\n200,20\n200,100\n120,100\n120,200\n20,200</textarea>${this.button("Draw on plan", "PlanningUI.polygonType=PlanningUI.val('polygon-type');PlanningUI.setTool('polygon')")}${this.button("Create from coordinates", "PlanningUI.polygonFromText()", "primary")}`,
    );
  },
  polygonFromText() {
    this.run(() => {
      const pts = this.val("polygon-points")
        .trim()
        .split(/\n+/)
        .map((row) => {
          const [x, y] = row.split(",").map(Number);
          if (!Number.isFinite(x) || !Number.isFinite(y))
            throw Error("Use X,Y on each line");
          return { x, y };
        });
      if (this.addPolygon(pts, this.val("polygon-type")))
        document.getElementById("studio-dialog").close();
    });
  },
  editVertices(index) {
    const e = elements[index];
    this.vertexIndex = index;
    this.dialog(
      "Edit room vertices",
      `<p>Local coordinates in inches. Bounds update from the vertices; existing openings must still fit.</p><textarea id="vertex-points">${(e.points || PlanningModel.points({ ...e, x: 0, y: 0 })).map((p) => `${p.x},${p.y}`).join("\n")}</textarea>${this.button("Apply vertices", "PlanningUI.saveVertices()", "primary")}`,
    );
  },
  saveVertices() {
    this.run(() => {
      const pts = this.val("vertex-points")
          .trim()
          .split(/\n+/)
          .map((r) => {
            const [x, y] = r.split(",").map(Number);
            return { x, y };
          }),
        i = this.vertexIndex,
        e = elements[i];
      if (!e || e.locked) throw Error("Unlock the room first");
      if (!PlanningModel.simple(pts)) throw Error("Invalid polygon");
      const x = Math.min(...pts.map((p) => p.x)),
        y = Math.min(...pts.map((p) => p.y));
      if (
        this.change("Changed polygon vertices", () => {
          if (!e.points) {
            const edges = {
              top: [0, false, e.w],
              right: [1, false, e.h],
              bottom: [2, true, e.w],
              left: [3, true, e.h],
            };
            for (const f of fixtures.filter((f) => f.roomId === i)) {
              const [n, reverse, length] = edges[f.edge];
              if (reverse) f.offset = length - f.offset - f.size;
              f.edge = "segment:" + n;
            }
          }
          e.x += x;
          e.y += y;
          e.w = Math.max(...pts.map((p) => p.x)) - x;
          e.h = Math.max(...pts.map((p) => p.y)) - y;
          e.points = pts.map((p) => ({ x: p.x - x, y: p.y - y }));
        })
      )
        document.getElementById("studio-dialog").close();
    });
  },
  addWall(a, b) {
    if (this.data.layers.walls.locked)
      return StudioUI.message("Unlock the walls layer first.", "error");
    return this.change("Drew wall", () =>
      this.data.walls.push({
        id: ProjectModel.uid(),
        floor: currentFloor,
        a,
        b,
        thickness: ProjectState.meta.wallSettings.internal,
      }),
    );
  },
  wallsDialog() {
    this.dialog(
      "Wall editor",
      `<p>Draw connected wall segments. Split a segment at a measured distance; join segments sharing an endpoint.</p>${this.button("Draw connected walls", "PlanningUI.setTool('wall')")}<div class="studio-field-grid">${this.field("wall-ax", "Start X (in)", 20, "number")}${this.field("wall-ay", "Start Y (in)", 20, "number")}${this.field("wall-bx", "End X (in)", 180, "number")}${this.field("wall-by", "End Y (in)", 20, "number")}</div>${this.button("Add segment", "PlanningUI.wallFromFields()")}<div>${this.data.walls
        .filter((w) => w.floor === currentFloor)
        .map(
          (w) =>
            `<div class="planning-record"><strong>${this.length(PlanningModel.distance(w.a, w.b))}</strong>${this.field("wall-t-" + w.id, "Thickness (in)", w.thickness, "number", `onchange="PlanningUI.change('Changed wall',()=>PlanningUI.data.walls.find(w=>w.id==='${w.id}').thickness=Number(this.value))"`)}${this.button("Split", `PlanningUI.splitWallDialog('${w.id}')`)}${this.button("Remove", `PlanningUI.remove('walls','${w.id}')`, "danger")}</div>`,
        )
        .join("")}</div>${this.select(
        "join-a",
        "First wall",
        this.data.walls
          .filter((w) => w.floor === currentFloor)
          .map((w) => [w.id, w.id.slice(0, 8)]),
        "",
      )}${this.select(
        "join-b",
        "Second wall",
        this.data.walls
          .filter((w) => w.floor === currentFloor)
          .map((w) => [w.id, w.id.slice(0, 8)]),
        "",
      )}${this.button("Join at shared endpoint", "PlanningUI.joinWalls()")}`,
    );
  },
  wallFromFields() {
    this.run(() => {
      if (
        this.addWall(
          { x: this.num("wall-ax"), y: this.num("wall-ay") },
          { x: this.num("wall-bx"), y: this.num("wall-by") },
        )
      )
        this.wallsDialog();
    });
  },
  splitWallDialog(id) {
    const w = this.data.walls.find((w) => w.id === id);
    this.splitId = id;
    this.dialog(
      "Split wall",
      this.field(
        "split-distance",
        "Distance from start (in)",
        PlanningModel.distance(w.a, w.b) / 2,
        "number",
      ) + this.button("Split", "PlanningUI.splitWall()", "primary"),
    );
  },
  splitWall() {
    this.run(() => {
      const w = this.data.walls.find((w) => w.id === this.splitId),
        d = this.num("split-distance"),
        l = PlanningModel.distance(w.a, w.b);
      if (d < 1 || d > l - 1)
        throw Error("Split must leave two segments of at least one inch");
      const mid = {
        x: w.a.x + ((w.b.x - w.a.x) * d) / l,
        y: w.a.y + ((w.b.y - w.a.y) * d) / l,
      };
      if (
        this.change("Split wall", () => {
          this.data.walls.push({ ...w, id: ProjectModel.uid(), a: mid });
          w.b = mid;
        })
      )
        this.wallsDialog();
    });
  },
  joinWalls() {
    this.run(() => {
      const a = this.data.walls.find((w) => w.id === this.val("join-a")),
        b = this.data.walls.find((w) => w.id === this.val("join-b"));
      if (
        !a ||
        !b ||
        a === b ||
        a.floor !== b.floor ||
        a.thickness !== b.thickness
      )
        throw Error("Choose distinct walls with matching floor and thickness");
      let pair;
      for (const x of ["a", "b"])
        for (const y of ["a", "b"])
          if (PlanningModel.distance(a[x], b[y]) < 0.01) pair = [x, y];
      if (!pair) throw Error("Walls must share an endpoint");
      const outA = a[pair[0] === "a" ? "b" : "a"],
        outB = b[pair[1] === "a" ? "b" : "a"];
      const via = a[pair[0]];
      if (
        Math.abs(
          (via.x - outA.x) * (outB.y - outA.y) -
            (via.y - outA.y) * (outB.x - outA.x),
        ) > 0.01
      )
        throw Error("Only collinear walls can become one segment");
      if (
        this.change("Joined walls", () => {
          a.a = outA;
          a.b = outB;
          this.data.walls = this.data.walls.filter((w) => w.id !== b.id);
        })
      )
        this.wallsDialog();
    });
  },
  remove(collection, id) {
    if (
      this.change(
        "Removed " + collection,
        () =>
          (this.data[collection] = this.data[collection].filter(
            (x) => x.id !== id,
          )),
      )
    ) {
      if (collection === "walls") this.wallsDialog();
      if (collection === "measurements") this.measurementsDialog();
      if (collection === "annotations") this.annotationsDialog();
      if (collection === "services")
        this.servicesDialog(this.serviceLayer || "electrical");
      if (collection === "underlays") this.underlayDialog();
    }
  },
  measurementsDialog() {
    this.dialog(
      "Saved measurements",
      this.button("Measure two points", "PlanningUI.setTool('measure')") +
        this.data.measurements
          .map(
            (m) =>
              `<div class="planning-record">${this.field("measurement-" + m.id, "Label", m.label, "text", `onchange="PlanningUI.change('Renamed measurement',()=>PlanningUI.data.measurements.find(m=>m.id==='${m.id}').label=this.value)"`)}<span>Floor ${m.floor} · ${this.length(PlanningModel.distance(m.a, m.b))}</span>${this.button("Copy", `PlanningUI.copy('${this.esc(PlanningModel.distance(m.a, m.b).toFixed(4))} in')`)}${this.button("Delete", `PlanningUI.remove('measurements','${m.id}')`, "danger")}</div>`,
          )
          .join(""),
    );
  },
  annotationsDialog() {
    this.dialog(
      "Annotations",
      `${this.select("annotation-kind", "Annotation", ["note", "callout", "cloud"], "note")}${this.field("annotation-text", "Text", "Revision note")}${this.button("Place on drawing", "PlanningUI.annotationText=PlanningUI.val('annotation-text');PlanningUI.setTool(PlanningUI.val('annotation-kind'))")}${this.data.annotations.map((a) => `<div class="planning-record">Floor ${a.floor} · ${a.kind} · ${this.esc(a.text)}${this.button("Remove", `PlanningUI.remove('annotations','${a.id}')`, "danger")}</div>`).join("")}`,
    );
  },
  servicesDialog(layer = "electrical") {
    this.serviceLayer = layer;
    const kinds =
      layer === "electrical"
        ? ["light", "switch", "socket", "panel"]
        : ["supply", "drain", "shaft"];
    this.dialog(
      layer === "electrical" ? "Electrical layout" : "Plumbing layout",
      `${this.select("service-kind", "Symbol / route", kinds, kinds[0])}${this.field("service-label", "Label", kinds[0])}${this.field("service-circuit", layer === "electrical" ? "Circuit / panel" : "Pipe / shaft reference", "")}${this.button("Place / draw route", "PlanningUI.serviceLabel=PlanningUI.val('service-label');PlanningUI.serviceCircuit=PlanningUI.val('service-circuit');PlanningUI.setTool(PlanningUI.val('service-kind'))")}<p>Symbols and routes are drawing annotations. Use Enter to finish a pipe route.</p>${this.data.services
        .filter((s) => s.layer === layer)
        .map(
          (s) =>
            `<div class="planning-record">Floor ${s.floor} · ${this.esc(s.label)} · ${this.esc(s.circuit)}${this.button("Remove", `PlanningUI.remove('services','${s.id}')`, "danger")}</div>`,
        )
        .join("")}`,
    );
  },
  layersDialog() {
    this.dialog(
      "Layers",
      `<table><thead><tr><th>Layer</th><th>Visible</th><th>Locked</th></tr></thead><tbody>${Object.entries(
        this.data.layers,
      )
        .map(
          ([k, l]) =>
            `<tr><td>${k}</td><td><input aria-label="Show ${k}" type="checkbox" ${l.visible ? "checked" : ""} onchange="PlanningUI.layer('${k}','visible',this.checked)"></td><td><input aria-label="Lock ${k}" type="checkbox" ${l.locked ? "checked" : ""} onchange="PlanningUI.layer('${k}','locked',this.checked)"></td></tr>`,
        )
        .join(
          "",
        )}</tbody></table><p>Layer visibility is respected in drawing exports. Locked objects cannot be edited through drawing tools.</p>`,
    );
  },
  layer(k, field, value) {
    this.change("Changed layer", () => (this.data.layers[k][field] = value));
  },
  snapDialog() {
    this.dialog(
      "Snapping",
      `${this.field("snap-spacing", "Grid spacing (in)", this.data.snap.spacing, "number")}${["endpoints", "midpoints", "faces", "perpendicular"].map((k) => `<label><input type="checkbox" id="snap-${k}" ${this.data.snap[k] ? "checked" : ""}>${k}</label>`).join("")}${this.button("Apply snapping", "PlanningUI.saveSnap()", "primary")}<p>Geometry snaps apply to wall, polygon, measurement and service drawing. Room dragging also uses the selected grid spacing.</p>`,
    );
  },
  saveSnap() {
    this.run(() => {
      if (
        this.change("Changed snapping", () => {
          this.data.snap.spacing = this.num("snap-spacing");
          for (const k of ["endpoints", "midpoints", "faces", "perpendicular"])
            this.data.snap[k] = document.getElementById("snap-" + k).checked;
        })
      )
        document.getElementById("studio-dialog").close();
    });
  },
  clearanceDialog() {
    this.dialog(
      "Furniture and door clearances",
      `<label><input type="checkbox" ${this.data.overlays.clearance ? "checked" : ""} onchange="PlanningUI.change('Changed clearance overlay',()=>PlanningUI.data.overlays.clearance=this.checked)">Show 24-inch furniture access bands and door swings</label><p>Access bands are visual planning guides. Collision results use the drawn swing sector and furniture footprints.</p><div id="clearance-results">${
        PlanningDrawing.clearanceWarnings()
          .map((w) => `<p>${this.esc(w)}</p>`)
          .join("") || "No swing/furniture conflicts found."
      }</div>`,
    );
  },
  connectivityDialog() {
    const c = PlanningModel.connectivity(this.p(), currentFloor);
    this.dialog(
      "Room connectivity",
      `<p>Door connections are derived from shared walls. Entrance means a door on an unshared room boundary.</p>${c.rooms.map((r) => `<button class="studio-list-item" onclick="PlanningUI.focusRoom(${r.index})">${this.esc(r.name)} · ${r.external ? "Exterior door" : r.reachable ? "Connected to entrance" : "No entrance route"}</button>`).join("")}<h3>Connections</h3>${c.links.map((l) => `<p>${this.esc(elements[l.a].customName || elements[l.a].type)} ↔ ${this.esc(elements[l.b].customName || elements[l.b].type)}</p>`).join("")}`,
    );
  },
  comparisonDialog() {
    const p = this.p();
    this.dialog(
      "Floor alignment",
      `${this.select("compare-floor", "Overlay floor", [["", "Off"], ...Array.from({ length: p.floorCount }, (_, i) => [String(i), "Floor " + i])], this.data.overlays.comparisonFloor === null ? "" : String(this.data.overlays.comparisonFloor))}${this.button("Apply overlay", "PlanningUI.change('Changed floor comparison',()=>PlanningUI.data.overlays.comparisonFloor=PlanningUI.val('compare-floor')===''?null:Number(PlanningUI.val('compare-floor')))")}<p>The overlay keeps the original XY coordinates. Check stair stacks, shafts and room walls against the active floor.</p>${this.button("Compare saved version", "StudioUI.versionsDialog()")}`,
    );
  },
  openingsDialog() {
    const e = elements[selectedElIndex];
    if (!e || e.isFurniture)
      return StudioUI.message("Select a room first.", "error");
    const ps = PlanningModel.points(e),
      edges = e.points
        ? ps.map((_, i) => [`segment:${i}`, "Edge " + (i + 1)])
        : ["top", "bottom", "left", "right"];
    this.dialog(
      "Opening editor",
      `${this.select("opening-edge", "Wall edge", edges, edges[0]?.[0] || "top")}${this.select("opening-type", "Opening", ["door", "window"], "door")}${this.select("opening-style", "Door style", ["hinged", "sliding", "open"], "hinged")}${this.select("opening-handing", "Hinge", ["left", "right"], "left")}${this.select("opening-swing", "Swing", ["in", "out"], "in")}<div class="studio-field-grid">${this.field("opening-width", "Width (in)", 36, "number")}${this.field("opening-offset", "Offset from edge start (in)", 0, "number")}${this.field("opening-height", "Height (in)", 80, "number")}${this.field("opening-sill", "Sill (in)", 0, "number")}</div>${this.button("Add opening", "PlanningUI.addOpening()", "primary")}${fixtures.map((f, i) => (f.roomId === selectedElIndex ? `<div class="planning-record">${f.type} · ${this.esc(f.edge)} · ${this.length(f.size)} · ${f.style || "hinged"} / ${f.handing || "left"} / ${f.swing || "in"}${this.button("Edit", `PlanningUI.editOpeningDialog(${i})`)}${this.button("Remove", `deleteFixture(${i});PlanningUI.openingsDialog()`, "danger")}</div>` : "")).join("")}`,
    );
  },
  addOpening() {
    this.run(() => {
      const e = elements[selectedElIndex];
      if (!e || e.locked || this.data.layers.walls.locked)
        throw Error("Unlock the room and walls layer first");
      const f = {
        id: ProjectModel.uid(),
        roomId: selectedElIndex,
        roomUid: e.id,
        type: this.val("opening-type"),
        edge: this.val("opening-edge"),
        style: this.val("opening-style"),
        handing: this.val("opening-handing"),
        swing: this.val("opening-swing"),
        size: this.num("opening-width"),
        offset: this.num("opening-offset"),
        height: this.num("opening-height"),
        sill: this.num("opening-sill"),
      };
      if (this.change("Added opening", () => fixtures.push(f)))
        this.openingsDialog();
    });
  },
  editOpeningDialog(i) {
    const f = fixtures[i];
    this.openingIndex = i;
    this.dialog(
      "Edit opening",
      `${this.select("edit-opening-style", "Style", ["hinged", "sliding", "open"], f.style || "hinged")}${this.select("edit-opening-handing", "Hinge", ["left", "right"], f.handing || "left")}${this.select("edit-opening-swing", "Swing", ["in", "out"], f.swing || "in")}${["size", "offset", "height", "sill"].map((k) => this.field("edit-opening-" + k, k + " (in)", f[k], "number")).join("")}${this.button("Save opening", "PlanningUI.saveOpening()", "primary")}`,
    );
  },
  saveOpening() {
    this.run(() => {
      const f = fixtures[this.openingIndex];
      if (elements[f.roomId]?.locked || this.data.layers.walls.locked)
        throw Error("Unlock first");
      if (
        this.change("Edited opening", () => {
          for (const k of ["size", "offset", "height", "sill"])
            f[k] = this.num("edit-opening-" + k);
          for (const k of ["style", "handing", "swing"])
            f[k] = this.val("edit-opening-" + k);
        })
      )
        this.openingsDialog();
    });
  },
  stairDialog() {
    const e = elements[selectedElIndex];
    if (e?.type !== "staircase")
      return StudioUI.message("Select a staircase first.", "error");
    const d = PlanningModel.stairs(e);
    this.dialog(
      "Stair designer",
      `${["rise", "riser", "tread", "landing", "headroom"].map((k) => this.field("stair-" + k, k + " (in)", d[k], "number")).join("")}${this.select("stair-style", "Shape", ["straight", "l-shape", "u-shape"], e.stairStyle || "straight")}${this.button("Apply & preview", "PlanningUI.saveStair()", "primary")}<p>${d.count} risers × ${d.actual.toFixed(2)} in · run ${this.length(d.run)} · required ${this.length(d.neededW)} × ${this.length(d.neededH)} · ${d.fits ? "Fits selected bounds" : "Does not fit selected bounds"}</p><p>Required headroom: ${this.length(d.headroom)}. ${d.headroomCheck}.</p><svg class="planning-preview" viewBox="0 0 340 150">${Array.from({ length: d.count }, (_, i) => `<path d="M ${10 + (i * 300) / d.count} ${140 - (i * 120) / d.count} h ${300 / d.count} v ${-120 / d.count}" fill="none" stroke="#38bdf8"/>`).join("")}</svg>`,
    );
  },
  saveStair() {
    this.run(() => {
      const e = elements[selectedElIndex];
      if (e.locked) throw Error("Unlock stairs first");
      if (
        this.change("Designed stairs", () => {
          e.stairDesign = Object.fromEntries(
            ["rise", "riser", "tread", "landing", "headroom"].map((k) => [
              k,
              this.num("stair-" + k),
            ]),
          );
          e.stairStyle = this.val("stair-style");
          if (!PlanningModel.stairs(e).fits)
            throw Error(
              "Stair flights and landing do not fit the selected bounds. Increase the footprint or adjust the design.",
            );
        })
      )
        this.stairDialog();
    });
  },
  async templatesDialog() {
    const templates = await this.readCollection("room_templates");
    this.templates = templates;
    this.dialog(
      "Room templates",
      `${this.field("template-name", "Template name", "Furnished room")}${this.button("Save selected room", "PlanningUI.saveTemplate()")}<div class="studio-field-grid">${this.field("template-x", "Place X (in)", 20, "number")}${this.field("template-y", "Place Y (in)", 20, "number")}</div>${templates.map((t, i) => `<div class="planning-record"><strong>${this.esc(t.name)}</strong><span>${t.furniture.length} furniture · ${t.fixtures.length} openings</span>${this.button("Place", `PlanningUI.placeTemplate(${i})`)}${this.button("Remove", `PlanningUI.deleteTemplate(${i})`, "danger")}</div>`).join("") || "<p>No saved room templates.</p>"}`,
    );
  },
  async readCollection(key) {
    try {
      return (await StorageEngine.read(key)) || [];
    } catch {
      return JSON.parse(localStorage.getItem("ArchCAD_" + key) || "[]");
    }
  },
  async writeCollection(key, data) {
    try {
      await StorageEngine.write(key, data);
    } catch {
      localStorage.setItem("ArchCAD_" + key, JSON.stringify(data));
    }
  },
  async saveTemplate() {
    const e = elements[selectedElIndex];
    if (!e || e.isFurniture)
      return StudioUI.message("Select a room first.", "error");
    const room = structuredClone(e),
      furniture = elements
        .filter(
          (x) =>
            x.isFurniture &&
            x.floor === e.floor &&
            PlanningModel.inside(
              { x: x.x + x.w / 2, y: x.y + x.h / 2 },
              PlanningModel.points(e),
            ),
        )
        .map((x) => ({ ...structuredClone(x), x: x.x - e.x, y: x.y - e.y })),
      fs = fixtures
        .filter((f) => f.roomId === selectedElIndex)
        .map((f) => structuredClone(f));
    room.x = 0;
    room.y = 0;
    const name = this.val("template-name");
    try {
      await this.writeCollection(
        "room_templates",
        [
          { id: ProjectModel.uid(), name, room, furniture, fixtures: fs },
          ...(await this.readCollection("room_templates")),
        ].slice(0, 100),
      );
      this.templatesDialog();
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  placeTemplate(i) {
    this.run(() => {
      const t = this.templates[i],
        x = this.num("template-x"),
        y = this.num("template-y");
      if (
        this.change("Placed room template", () => {
          const room = {
              ...structuredClone(t.room),
              id: ProjectModel.uid(),
              floor: currentFloor,
              x,
              y,
              locked: false,
            },
            index = elements.length;
          delete room.groupId;
          elements.push(room);
          t.furniture.forEach((e) =>
            elements.push({
              ...structuredClone(e),
              id: ProjectModel.uid(),
              floor: currentFloor,
              x: x + e.x,
              y: y + e.y,
              locked: false,
              groupId: undefined,
            }),
          );
          t.fixtures.forEach((f) =>
            fixtures.push({
              ...f,
              id: ProjectModel.uid(),
              roomId: index,
              roomUid: room.id,
            }),
          );
        })
      )
        document.getElementById("studio-dialog").close();
    });
  },
  async deleteTemplate(i) {
    try {
      await this.writeCollection(
        "room_templates",
        this.templates.filter((_, n) => n !== i),
      );
      this.templatesDialog();
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  underlayDialog() {
    this.dialog(
      "Trace a background plan",
      `<p>Import a PNG, JPEG or WebP below 3 MB. Select two reference points in the preview, enter their real distance, then add the calibrated image.</p><input type="file" id="underlay-file" accept="image/png,image/jpeg,image/webp" onchange="PlanningUI.loadUnderlay(this.files[0])"><div id="underlay-preview"></div>${this.field("underlay-reference", "Reference length (in)", 120, "number")}${this.field("underlay-x", "Image origin X (in)", 0, "number")}${this.field("underlay-y", "Image origin Y (in)", 0, "number")}${this.button("Add calibrated image", "PlanningUI.addUnderlay()", "primary")}${this.data.underlays.map((u) => `<div class="planning-record">Floor ${u.floor} · ${this.length(u.w)} × ${this.length(u.h)}<label>Opacity<input type="range" min="0.05" max="1" step="0.05" value="${u.opacity}" onchange="PlanningUI.change('Changed underlay opacity',()=>PlanningUI.data.underlays.find(u=>u.id==='${u.id}').opacity=Number(this.value))"></label><label><input type="checkbox" ${u.locked ? "checked" : ""} onchange="PlanningUI.change('Changed underlay lock',()=>PlanningUI.data.underlays.find(u=>u.id==='${u.id}').locked=this.checked)">Locked</label>${this.button("Edit position / size", `PlanningUI.editUnderlay('${u.id}')`)}${this.button("Remove", `PlanningUI.remove('underlays','${u.id}')`, "danger")}</div>`).join("")}`,
    );
  },
  loadUnderlay(file) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 3 * 1024 * 1024
    )
      return StudioUI.message("Use a PNG, JPEG or WebP below 3 MB.", "error");
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        this.pendingUnderlay = {
          data: reader.result,
          width: img.naturalWidth,
          height: img.naturalHeight,
          points: [],
        };
        const box = document.getElementById("underlay-preview");
        box.innerHTML = "";
        img.className = "planning-underlay-preview";
        box.append(img);
        const status = document.createElement("p");
        status.id = "underlay-calibration";
        status.textContent = "Click two known points";
        box.append(status);
        img.onclick = (e) => {
          const b = img.getBoundingClientRect(),
            p = {
              x: ((e.clientX - b.left) * img.naturalWidth) / b.width,
              y: ((e.clientY - b.top) * img.naturalHeight) / b.height,
            };
          if (this.pendingUnderlay.points.length === 2)
            this.pendingUnderlay.points = [];
          this.pendingUnderlay.points.push(p);
          status.textContent =
            this.pendingUnderlay.points.length + " reference points selected";
        };
      };
      img.onerror = () => StudioUI.message("Cannot read image.", "error");
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  },
  addUnderlay() {
    this.run(() => {
      const u = this.pendingUnderlay;
      if (!u || u.points.length !== 2)
        throw Error("Choose two reference points on the image");
      const reference = this.num("underlay-reference"),
        pixels = PlanningModel.distance(...u.points);
      if (reference <= 0 || pixels < 1)
        throw Error("Choose a positive reference length and distinct points");
      const factor = reference / pixels;
      const x = this.num("underlay-x"),
        y = this.num("underlay-y");
      if (
        this.change("Added tracing underlay", () =>
          this.data.underlays.push({
            id: ProjectModel.uid(),
            floor: currentFloor,
            data: u.data,
            w: u.width * factor,
            h: u.height * factor,
            x,
            y,
            opacity: 0.35,
            locked: true,
          }),
        )
      )
        this.underlayDialog();
    });
  },
  editUnderlay(id) {
    const u = this.data.underlays.find((u) => u.id === id);
    if (u.locked || this.data.layers.underlay.locked)
      return StudioUI.message(
        "Unlock the image and underlay layer first.",
        "error",
      );
    this.underlayId = id;
    this.dialog(
      "Underlay placement",
      ["x", "y", "w", "h"]
        .map((k) =>
          this.field("underlay-edit-" + k, k + " (in)", u[k], "number"),
        )
        .join("") +
        this.button("Apply", "PlanningUI.saveUnderlay()", "primary"),
    );
  },
  saveUnderlay() {
    this.run(() => {
      if (
        this.change("Moved tracing underlay", () => {
          const u = this.data.underlays.find((u) => u.id === this.underlayId);
          for (const k of ["x", "y", "w", "h"])
            u[k] = this.num("underlay-edit-" + k);
        })
      )
        this.underlayDialog();
    });
  },
  costDialog() {
    const c = this.data.cost,
      q = PlanningModel.quantities(this.p());
    this.dialog(
      "Materials & cost worksheet",
      `<p>Wall surface deducts opening unions; paint counts both faces. Flooring sums clear room areas. Overlaps are counted individually. Rates are supplied by you.</p><div class="studio-field-grid">${["wall", "paint", "floor"].map((k) => this.field("cost-" + k, k + " rate / sq ft", c[k], "number")).join("")}${this.field("cost-wastage", "Wastage %", c.wastage, "number")}${this.field("cost-currency", "Currency", c.currency)}</div>${this.button("Recalculate", "PlanningUI.saveCosts()", "primary")}<table><thead><tr><th>Floor</th><th>Wall ft</th><th>Wall sq ft</th><th>Paint sq ft</th><th>Flooring sq ft</th><th>Estimate</th></tr></thead><tbody>${q.floors.map((f) => `<tr><td>${f.floor}</td><td>${f.wallLength.toFixed(1)}</td><td>${f.wall.toFixed(1)}</td><td>${f.paint.toFixed(1)}</td><td>${f.floorArea.toFixed(1)}</td><td>${f.estimate.toFixed(2)}</td></tr>`).join("")}</tbody></table><p>Total: ${this.esc(c.currency)} ${q.total.toFixed(2)}</p>${this.button("Download CSV", "PlanningUI.exportCosts()")}`,
    );
  },
  saveCosts() {
    this.run(() => {
      if (
        this.change("Changed estimate rates", () => {
          for (const k of ["wall", "paint", "floor", "wastage"])
            this.data.cost[k] = this.num("cost-" + k);
          this.data.cost.currency = this.val("cost-currency");
        })
      )
        this.costDialog();
    });
  },
  exportCosts() {
    const q = PlanningModel.quantities(this.p());
    const rows = [
      [
        "Floor",
        "Wall length ft",
        "Wall face sqft",
        "Paint sqft",
        "Flooring sqft",
        "Estimate " + this.data.cost.currency,
      ],
      ...q.floors.map((f) => [
        f.floor,
        f.wallLength,
        f.wall,
        f.paint,
        f.floorArea,
        f.estimate,
      ]),
    ];
    NavActionEngine.downloadBlob(
      rows
        .map((r) =>
          r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(","),
        )
        .join("\n"),
      "ArchCAD_Quantities.csv",
      "text/csv",
    );
  },
  async libraryDialog() {
    try {
      this.projects = await this.readCollection("project_library");
      this.dialog(
        "Project library",
        `${this.field("library-tags", "Tags (comma separated)", "")}${this.button("Save current project", "PlanningUI.saveLibraryProject()", "primary")}<input id="library-search" aria-label="Search saved projects" placeholder="Search names and tags" oninput="PlanningUI.renderLibrary(this.value)"><div id="library-projects"></div>`,
      );
      this.renderLibrary("");
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  renderLibrary(q) {
    const query = q.toLowerCase();
    document.getElementById("library-projects").innerHTML =
      this.projects
        .map((p, i) =>
          (p.name + " " + p.tags).toLowerCase().includes(query)
            ? `<div class="planning-library-card">${PlanningDrawing.thumbnail(ProjectModel.normalize(p.project))}<strong>${this.esc(p.name)}</strong><small>${this.esc(p.tags || "")} · ${new Date(p.time).toLocaleString()}</small>${this.button("Open", `PlanningUI.openLibraryProject(${i})`)}${this.button("Remove", `PlanningUI.removeLibraryProject(${i})`, "danger")}</div>`
            : "",
        )
        .join("") || "<p>No matching projects.</p>";
  },
  async saveLibraryProject() {
    try {
      const p = ProjectModel.normalize(this.p());
      const rows = await this.readCollection("project_library");
      rows.unshift({
        id: ProjectModel.uid(),
        name: p.name,
        tags: this.val("library-tags").slice(0, 200),
        time: new Date().toISOString(),
        project: p,
      });
      await this.writeCollection("project_library", rows.slice(0, 50));
      this.libraryDialog();
    } catch (e) {
      StudioUI.message("Project save failed: " + e.message, "error");
    }
  },
  async openLibraryProject(i) {
    try {
      const p = ProjectModel.normalize(this.projects[i].project);
      await StorageEngine.snapshot("Before opening library project");
      ProjectState.apply(p, { rebase: true });
      StorageEngine.markDirty();
      AppEvents.triggerStateChange();
      document.getElementById("studio-dialog").close();
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  async removeLibraryProject(i) {
    try {
      await this.writeCollection(
        "project_library",
        this.projects.filter((_, n) => n !== i),
      );
      this.libraryDialog();
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  savedViewsDialog() {
    const views = this.preferences.views || [];
    this.dialog(
      "Navigation & saved views",
      `${this.button("Fit plot", "StudioUI.fitPlan()")}${this.button("Fit selection", "centerOnSelection()")}${this.field("view-name", "View name", "Saved view")}${this.button("Save current view", "PlanningUI.saveView()")}<p>${globalCompassDir} ↑ · ${Math.round(CanvasState.zoomLvl * 100)}%</p>${views.map((v, i) => `<div>${this.button(this.esc(v.name), `PlanningUI.restoreView(${i})`)}${this.button("Remove", `PlanningUI.removeView(${i})`)}</div>`).join("")}`,
    );
  },
  saveView() {
    this.preferences.views ||= [];
    this.preferences.views.unshift({
      name: this.val("view-name").slice(0, 80),
      floor: currentFloor,
      mode: StudioUI.mode,
      camera: {
        panX: CanvasState.panX,
        panY: CanvasState.panY,
        zoomLvl: CanvasState.zoomLvl,
      },
    });
    this.preferences.views = this.preferences.views.slice(0, 20);
    this.savePrefs();
    this.savedViewsDialog();
  },
  restoreView(i) {
    const v = this.preferences.views[i];
    setFloor(v.floor);
    Object.assign(CanvasState, v.camera);
    setWorkspaceLayout(v.mode);
    updateViewport();
    document.getElementById("studio-dialog").close();
    this.refresh();
  },
  removeView(i) {
    this.preferences.views.splice(i, 1);
    this.savePrefs();
    this.savedViewsDialog();
  },
  performanceDialog() {
    const info = Engine3D.renderer?.info,
      objects = [];
    Engine3D.buildingGroup?.traverse((o) => {
      if (o.isMesh)
        objects.push({
          name:
            elements[o.userData.roomIndex]?.customName ||
            elements[o.userData.roomIndex]?.type ||
            o.userData.wallId ||
            "Building",
          vertices: o.geometry?.attributes.position?.count || 0,
        });
    });
    objects.sort((a, b) => b.vertices - a.vertices);
    this.dialog(
      "Performance & offline status",
      `<p id="planning-offline-status">${navigator.onLine ? "Online" : "Offline"} · ${this.offlineReady ? "Application cache installed" : "Cache pending"}</p><p>${elements.length} elements · ${objects.length} meshes · ${info?.render.triangles || 0} rendered triangles · ${info?.render.calls || 0} draw calls</p>${this.select("performance-quality", "Quality", ["high", "balanced", "low"], this.preferences.quality || "balanced")}${this.button("Apply quality", "PlanningUI.quality()")}<h3>Largest geometry</h3>${objects
        .slice(0, 10)
        .map((o) => `<p>${this.esc(o.name)} · ${o.vertices} vertices</p>`)
        .join(
          "",
        )}<p>Core Three.js scripts are bundled locally. Optional remote textures may be unavailable offline.</p>${this.button("Refresh offline cache", "PlanningUI.refreshCache()")}`,
    );
  },
  quality() {
    this.preferences.quality = this.val("performance-quality");
    this.savePrefs();
    const low = this.preferences.quality === "low";
    window.isPerformanceMode = low;
    if (Engine3D.renderer) {
      Engine3D.renderer.setPixelRatio(
        this.preferences.quality === "high" ? Math.min(devicePixelRatio, 2) : 1,
      );
      Engine3D.renderer.shadowMap.enabled = !low;
    }
    Engine3D.modelSignature = null;
    generate3DModel();
    this.performanceDialog();
  },
  async refreshCache() {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update();
      reg?.active?.postMessage({ type: "CACHE_APP" });
      StudioUI.message("Refreshing the application cache.");
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  builderDialog() {
    this.builderBase = JSON.stringify(this.p());
    this.candidates = [];
    const p = this.p();
    this.dialog(
      "Auto-builder",
      `<p>Generate alternatives for selected floors. Locked rooms are always preserved. Existing rooms are replaced only after Apply.</p><div class="studio-field-grid">${this.field("build-bedrooms", "Bedrooms", 2, "number", 'min="1" max="10"')}${this.field("build-baths", "Common toilets", 1, "number", 'min="0" max="10"')}${this.field("build-attached", "Attached toilets", 0, "number", 'min="0" max="10"')}${this.field("build-bedw", "Bedroom width (in)", 120, "number")}${this.field("build-bedh", "Bedroom depth (in)", 132, "number")}${this.field("build-setback", "Setback (in)", this.data.site.setback, "number")}</div><label><input id="build-puja" type="checkbox">Include puja</label><label><input id="build-vastu" type="checkbox">Prefer Vastu directions</label><p>Floors to generate:</p>${Array.from(
        { length: p.floorCount },
        (_, i) =>
          `<label><input type="checkbox" class="build-floor" value="${i}" ${i === currentFloor ? "checked" : ""}>${this.esc(this.data.floorNames[i] || "Floor " + i)}</label>${this.select(
            "build-layout-f" + i,
            "Layout for floor " + i,
            [
              ["custom", "Use requirements above"],
              ["1bhk", "1 BHK"],
              ["2bhk", "2 BHK"],
              ["3bhk", "3 BHK"],
              ["none", "Empty / open terrace"],
            ],
            ProjectState.meta.layouts["layout-f" + i] || "custom",
          )}`,
      ).join(
        "",
      )}<details><summary>Preserve fixed rooms, entrances and shafts</summary>${p.elements
        .filter((e) => !e.isFurniture)
        .map(
          (e) =>
            `<label><input type="checkbox" class="build-preserve" value="${e.id}" ${e.locked || e.type === "staircase" ? "checked" : ""}>Floor ${e.floor} · ${this.esc(e.customName || e.type)}</label>`,
        )
        .join(
          "",
        )}<p>Drawn walls, underlays, service shafts and annotations are retained.</p></details>${this.button("Generate alternatives", "PlanningUI.generatePreviews()", "primary")}<div id="builder-previews" aria-live="polite"></div>`,
    );
    this.addFloorManager();
  },
  addFloorManager() {
    document
      .querySelector("#studio-dialog .studio-dialog-body")
      .insertAdjacentHTML(
        "beforeend",
        `<details><summary>Manage floors</summary><div id="planning-floor-rows">${Array.from({ length: this.p().floorCount }, (_, i) => `<div class="planning-floor-row">${this.field("floor-name-" + i, "Name", this.data.floorNames[i] || "Floor " + i, "text", `onchange="PlanningUI.change('Renamed floor',()=>PlanningUI.data.floorNames[${i}]=this.value)"`)}${this.button("↑", `PlanningUI.swapFloors(${i},${i - 1})`)}${this.button("↓", `PlanningUI.swapFloors(${i},${i + 1})`)}${this.button("Remove", `PlanningUI.deleteFloor(${i})`, "danger")}</div>`).join("")}</div>${this.button("Add floor", "addManualFloor();PlanningUI.builderDialog()")}${this.select(
          "copy-floor",
          "Copy from floor",
          Array.from({ length: this.p().floorCount }, (_, i) => [
            String(i),
            "Floor " + i,
          ]),
          String(currentFloor),
        )}${this.button("Copy to new floor", "PlanningUI.copyFloor()")}</details>`,
      );
  },
  generatePreviews() {
    this.run(() => {
      const floors = [...document.querySelectorAll(".build-floor:checked")].map(
        (e) => Number(e.value),
      );
      if (!floors.length) throw Error("Select at least one floor");
      const req = {
        floors,
        perFloor: Object.fromEntries(
          floors.map((f) => [f, this.val("build-layout-f" + f) || "custom"]),
        ),
        preserve: [...document.querySelectorAll(".build-preserve:checked")].map(
          (e) => e.value,
        ),
        bedrooms: this.num("build-bedrooms"),
        baths: this.num("build-baths"),
        attached: this.num("build-attached"),
        bedW: this.num("build-bedw"),
        bedH: this.num("build-bedh"),
        setback: this.num("build-setback"),
        puja: document.getElementById("build-puja").checked,
        vastu: document.getElementById("build-vastu").checked,
      };
      const base = this.p();
      this.builderBase = JSON.stringify(base);
      const messages = [];
      this.candidates = [];
      for (let v = 0; v < 3; v++) {
        try {
          const p = PlanningModel.generate(base, req, v),
            checks = PlanningModel.analyze(p),
            q = PlanningModel.quantities(p),
            vastu = PlanningModel.vastu(p, floors[0]);
          this.candidates.push({ p, req, v, checks, q, vastu });
        } catch (e) {
          messages.push("Alternative " + (v + 1) + ": " + e.message);
        }
      }
      document.getElementById("builder-previews").innerHTML =
        this.candidates
          .map(
            (c, i) =>
              `<article class="planning-candidate"><h3>Alternative ${c.v + 1}</h3>${PlanningDrawing.thumbnail({ ...c.p, currentFloor: floors[0] })}<p>${c.checks.results.length} warnings · ${c.q.floors.reduce((s, f) => s + f.floorArea, 0).toFixed(1)} clear sq ft · Vastu ${c.vastu.score === null ? "not evaluated" : c.vastu.score + "%"}</p><details><summary>Review warnings and access</summary>${c.checks.results.map((r) => `<p>Floor ${r.floor}: ${this.esc(r.text)}</p>`).join("") || "<p>No configured warnings.</p>"}<p>Attached toilets share a doorway with their bedroom. Review entrance routes and all reported room checks before applying.</p></details>${this.button("Apply alternative " + (c.v + 1), `PlanningUI.applyCandidate(${i})`, "primary")}</article>`,
          )
          .join("") +
        messages
          .map((m) => `<p class="planning-error">${this.esc(m)}</p>`)
          .join("");
      if (!this.candidates.length)
        StudioUI.message(
          "The requirements do not fit. See the detailed conflicts.",
          "error",
        );
    });
  },
  applyCandidate(i) {
    const c = this.candidates[i];
    if (!c) return;
    if (JSON.stringify(this.p()) !== this.builderBase)
      return StudioUI.message(
        "The project changed. Generate a new preview.",
        "error",
      );
    if (
      this.change("Applied Auto-builder alternative", () =>
        ProjectState.apply(c.p),
      )
    ) {
      document.getElementById("studio-dialog").close();
      StudioUI.message(
        "Alternative applied. Undo restores the previous layout.",
      );
    }
  },
  swapFloors(a, b) {
    const count = this.p().floorCount;
    if (a < 0 || b < 0 || a >= count || b >= count) return;
    this.change("Reordered floors", () => {
      const swap = (f) => (f === a ? b : f === b ? a : f);
      elements.forEach((e) => (e.floor = swap(e.floor)));
      for (const k of [
        "walls",
        "measurements",
        "annotations",
        "services",
        "underlays",
      ])
        this.data[k].forEach((e) => (e.floor = swap(e.floor)));
      [this.data.floorNames[a], this.data.floorNames[b]] = [
        this.data.floorNames[b] || "Floor " + b,
        this.data.floorNames[a] || "Floor " + a,
      ];
      currentFloor = swap(currentFloor);
    });
    this.builderDialog();
  },
  deleteFloor(i) {
    if (this.p().floorCount <= 1)
      return StudioUI.message("Keep at least one floor.", "error");
    if (elements.some((e) => e.floor === i && e.locked))
      return StudioUI.message(
        "Unlock floor objects before removing it.",
        "error",
      );
    if (!confirm("Remove this floor and its contents?")) return;
    this.change("Removed floor", () => {
      ProjectState.removeIndices(
        elements.map((e, n) => (e.floor === i ? n : -1)).filter((n) => n >= 0),
      );
      elements.forEach((e) => {
        if (e.floor > i) e.floor--;
      });
      for (const k of [
        "walls",
        "measurements",
        "annotations",
        "services",
        "underlays",
      ])
        this.data[k] = this.data[k]
          .filter((e) => e.floor !== i)
          .map((e) => ({ ...e, floor: e.floor > i ? e.floor - 1 : e.floor }));
      document.getElementById("b-floors").value =
        Number(document.getElementById("b-floors").value) - 1;
      currentFloor = Math.min(currentFloor, this.p().floorCount - 1);
      this.data.floorNames = Object.fromEntries(
        Object.entries(this.data.floorNames)
          .filter(([f]) => +f !== i)
          .map(([f, n]) => [+f > i ? +f - 1 : +f, n]),
      );
      this.data.overlays.comparisonFloor = null;
      renderFloorSelectors();
    });
    this.builderDialog();
  },
  copyFloor() {
    const source = Number(this.val("copy-floor"));
    this.change("Copied complete floor", () => {
      const floor = this.p().floorCount;
      document.getElementById("b-floors").value = floor + 1;
      const old = elements.slice(),
        map = new Map();
      old
        .filter((e) => e.floor === source)
        .forEach((e) => {
          const n = { ...structuredClone(e), id: ProjectModel.uid(), floor };
          if (n.groupId) n.groupId = "copy-" + n.groupId + "-" + floor;
          map.set(e.id, n);
          elements.push(n);
        });
      ProjectState.meta.constraints
        .filter((c) => map.has(c.source) && map.has(c.target))
        .forEach((c) =>
          ProjectState.meta.constraints.push({
            ...c,
            id: ProjectModel.uid(),
            source: map.get(c.source).id,
            target: map.get(c.target).id,
          }),
        );
      fixtures
        .filter((f) => old[f.roomId]?.floor === source)
        .forEach((f) => {
          const n = map.get(old[f.roomId].id);
          fixtures.push({
            ...f,
            id: ProjectModel.uid(),
            roomId: elements.indexOf(n),
            roomUid: n.id,
          });
        });
      for (const k of [
        "walls",
        "measurements",
        "annotations",
        "services",
        "underlays",
      ])
        this.data[k]
          .filter((e) => e.floor === source)
          .forEach((e) =>
            this.data[k].push({
              ...structuredClone(e),
              id: ProjectModel.uid(),
              floor,
            }),
          );
      currentFloor = floor;
      renderFloorSelectors();
    });
    this.builderDialog();
  },
};
const PlanningUnits = PlanningModel.units;
// Integrate existing public actions rather than leaving parallel hidden controls.
const planningOldInspector = StudioUI.renderInspector;
StudioUI.renderInspector = function () {
  planningOldInspector.call(this);
  if (!PlanningUI.ready) return;
  const el = elements[selectedElIndex],
    panel = document.getElementById("studio-properties");
  if (!el) return;
  panel
    .querySelector("summary")
    ?.setAttribute("data-unit", PlanningUI.length(1));
  const summaries = panel.querySelectorAll("summary");
  summaries.forEach((s) => {
    if (s.textContent === "Geometry · inches")
      s.textContent =
        "Geometry · " +
        document.getElementById("unitSelect").selectedOptions[0].textContent;
  });
  for (const key of ["x", "y", "w", "h"]) {
    const input = panel.querySelector(`input[onchange*="'${key}'"]`);
    if (input) {
      input.type = "text";
      input.removeAttribute("min");
      input.value = ProjectModel.display(
        el[key],
        document.getElementById("unitSelect").value,
      );
      input.dataset.measure = key;
      input.onchange = () =>
        PlanningUI.run(() =>
          StudioUI.edit(selectedElIndex, key, PlanningUI.parse(input.value)),
        );
    }
  }
  if (el.points) {
    for (const select of panel.querySelectorAll(
      'select[onchange^="StudioUI.editOpening"]',
    )) {
      const i = Number(
        select.getAttribute("onchange").match(/editOpening\((\d+)/)?.[1],
      );
      select.innerHTML = el.points
        .map(
          (_, n) =>
            `<option value="segment:${n}" ${fixtures[i]?.edge === "segment:" + n ? "selected" : ""}>Edge ${n + 1}</option>`,
        )
        .join("");
    }
  }
  for (const input of panel.querySelectorAll("input[onchange]")) {
    const action = input.getAttribute("onchange");
    let m;
    if (
      (m = action.match(/^StudioUI\.editOpening\((\d+),'([^']+)'/)) &&
      m[2] !== "edge"
    ) {
      const index = +m[1],
        key = m[2];
      input.type = "text";
      input.value = ProjectModel.display(
        fixtures[index][key] || 0,
        document.getElementById("unitSelect").value,
      );
      input.onchange = () =>
        PlanningUI.run(() =>
          StudioUI.editOpening(index, key, PlanningUI.parse(input.value)),
        );
      input.closest("label").firstChild.textContent =
        key + " (" + document.getElementById("unitSelect").value + ")";
    } else if ((m = action.match(/^StudioUI\.wallThickness\('([^']+)'/))) {
      const id = m[1];
      input.type = "text";
      input.value = ProjectModel.display(
        Number(input.value),
        document.getElementById("unitSelect").value,
      );
      input.onchange = () =>
        PlanningUI.run(() =>
          StudioUI.wallThickness(id, PlanningUI.parse(input.value)),
        );
    }
  }
  panel.insertAdjacentHTML(
    "beforeend",
    `<details open><summary>Planning tools</summary>${el.type === "bedroom" ? `<label>Bedroom role<select onchange="PlanningUI.change('Changed bedroom role',()=>elements[selectedElIndex].role=this.value)"><option value="bedroom" ${el.role !== "master" ? "selected" : ""}>Bedroom</option><option value="master" ${el.role === "master" ? "selected" : ""}>Master bedroom</option></select></label>` : ""}${!el.isFurniture ? PlanningUI.button(el.points ? "Edit vertices" : "Make polygon", `PlanningUI.editVertices(${selectedElIndex})`) + PlanningUI.button("Opening editor", "PlanningUI.openingsDialog()") + PlanningUI.button("Save room template", "PlanningUI.templatesDialog()") : ""}${el.type === "staircase" ? PlanningUI.button("Stair designer", "PlanningUI.stairDialog()") : ""}</details>`,
  );
};
const planningOldEdit = StudioUI.edit;
StudioUI.edit = function (index, key, value) {
  const e = elements[index];
  if (!e) return false;
  const layer = e.isFurniture ? "furniture" : "rooms";
  if (PlanningUI.ready && PlanningUI.data.layers[layer].locked)
    return this.message("Unlock the " + layer + " layer first.", "error");
  if (e.points && ["w", "h"].includes(key)) {
    return ProjectState.commit("Resized polygon", () => {
      const n = Number(value);
      if (e.locked || !Number.isFinite(n) || n < 1)
        throw Error("Unlock and enter a positive dimension");
      const factor = n / e[key];
      e.points.forEach((p) => (p[key === "w" ? "x" : "y"] *= factor));
      e[key] = n;
      this.assertBounds([e]);
    });
  }
  return planningOldEdit.call(this, index, key, value);
};
StudioUI.checksDialog = () => PlanningUI.checksDialog();
const planningOldChecks = StudioUI.refreshChecks;
StudioUI.refreshChecks = function () {
  if (!PlanningUI.ready) return planningOldChecks.call(this);
  PlanningUI.refresh();
  const d = PlanningUI.cache.analysis;
  this.warnings = d.results;
  const label = document.getElementById("studio-warning-count");
  if (label)
    label.textContent = d.total
      ? d.results.length
        ? d.results.length + " layout warnings"
        : "Layout checks passed"
      : "No applicable checks";
};
const oldWidgetCompliance = WidgetEngine._calculateCompliance;
WidgetEngine._calculateCompliance = function (els, fs) {
  if (
    PlanningUI.ready &&
    els === elements &&
    fs === fixtures &&
    PlanningUI.cache
  ) {
    const d = PlanningUI.cache.analysis;
    return {
      score: d.score ?? 0,
      warnings: d.results.map((r) => r.text),
      totalChecks: d.total,
      passed: d.passed,
    };
  }
  if (!PlanningUI.ready) return oldWidgetCompliance.call(this, els, fs);
  const d = PlanningModel.analyze({
    ...ProjectState.capture(),
    elements: els,
    fixtures: fs,
  });
  return {
    score: d.score ?? 0,
    warnings: d.results.map((r) => r.text),
    totalChecks: d.total,
    passed: d.passed,
  };
};
WidgetEngine._calculateVastu = function (els) {
  const d = PlanningModel.vastu(
    { ...ProjectState.capture(), elements: els },
    currentFloor,
  );
  return {
    score: d.score ?? 0,
    totalChecks: d.count,
    warnings: d.rooms.map((r) => `${r.name}: ${r.zone} · ${r.target}`),
    text: d.score === null ? "Not evaluated" : "Directional preferences",
  };
};
const oldGridSnap = CanvasControlsEngine.applyGridSnap;
CanvasControlsEngine.applyGridSnap = function (n, z) {
  return PlanningUI.ready && this.isGridSnap()
    ? Math.round(n / PlanningUI.data.snap.spacing) *
        PlanningUI.data.snap.spacing
    : oldGridSnap.call(this, n, z);
};
window.toggleAutoBuilder = () => PlanningUI.builderDialog();
window.generateBuilding = () => PlanningUI.builderDialog();
window.toggleMeasureMode = () =>
  PlanningUI.setTool(PlanningUI.tool === "measure" ? "select" : "measure");
// Layer locks also guard keyboard, group edits, fixture edits and direct model edits.
const planningCommit = ProjectState.commit;
ProjectState.commit = function (action, mutation) {
  return planningCommit.call(this, action, () => {
    const before = PlanningUI.ready ? ProjectState.capture() : null;
    mutation();
    if (!before || !PlanningUI.ready) return;
    if (
      before.planning.layers.walls.locked &&
      (JSON.stringify(before.wallSettings) !==
        JSON.stringify(ProjectState.meta.wallSettings) ||
        JSON.stringify(before.wallOverrides) !==
          JSON.stringify(ProjectState.meta.wallOverrides))
    )
      throw Error("Unlock the walls layer first");
    for (const key of ["elements", "fixtures"]) {
      const old = before[key];
      for (const e of old) {
        const layer =
          key === "fixtures" ? "walls" : e.isFurniture ? "furniture" : "rooms";
        if (!before.planning.layers[layer]?.locked) continue;
        const current = ProjectState.data[key].find((n) => n.id === e.id);
        if (JSON.stringify(current) !== JSON.stringify(e))
          throw Error("Unlock the " + layer + " layer first");
      }
      const layer = key === "fixtures" ? "walls" : null;
      if (
        layer &&
        before.planning.layers[layer]?.locked &&
        ProjectState.data[key].length !== old.length
      )
        throw Error("Unlock " + layer + " first");
      if (key === "elements")
        for (const e of ProjectState.data.elements.filter(
          (n) => !old.some((o) => o.id === n.id),
        ))
          if (
            before.planning.layers[e.isFurniture ? "furniture" : "rooms"].locked
          )
            throw Error("Unlock the destination layer first");
    }
    for (const k of [
      "walls",
      "measurements",
      "annotations",
      "services",
      "underlays",
    ]) {
      const layer = {
        walls: "walls",
        measurements: "dimensions",
        annotations: "annotations",
        underlays: "underlay",
      }[k];
      if (
        layer &&
        before.planning.layers[layer].locked &&
        JSON.stringify(before.planning[k]) !==
          JSON.stringify(PlanningUI.data[k])
      )
        throw Error("Unlock " + layer + " first");
      if (k === "services")
        for (const l of ["electrical", "plumbing"])
          if (
            before.planning.layers[l].locked &&
            JSON.stringify(
              before.planning.services.filter((s) => s.layer === l),
            ) !==
              JSON.stringify(
                PlanningUI.data.services.filter((s) => s.layer === l),
              )
          )
            throw Error("Unlock " + l + " first");
    }
  });
};
const planningStartDrag = startDrag;
startDrag = function (e, i) {
  const el = elements[i],
    layer = el?.isFurniture ? "furniture" : "rooms";
  if (
    PlanningUI.ready &&
    (PlanningUI.tool !== "select" ||
      !PlanningUI.data.layers[layer].visible ||
      PlanningUI.data.layers[layer].locked)
  )
    return;
  return planningStartDrag(e, i);
};
const planningResize = StudioUI.startResize;
StudioUI.startResize = function (e, corner) {
  const el = elements[selectedElIndex];
  if (el?.points)
    return this.message(
      "Resize polygon dimensions in Properties or edit vertices.",
    );
  if (PlanningUI.data.layers[el?.isFurniture ? "furniture" : "rooms"].locked)
    return;
  return planningResize.call(this, e, corner);
};
document.addEventListener("DOMContentLoaded", () => PlanningUI.init());
// Preserve geometry-aware behavior for polygon transforms and all floor operations.
const planningRotate = StudioUI.rotate;
StudioUI.rotate = function (i) {
  const e = elements[i];
  if (!e?.points) return planningRotate.call(this, i);
  return ProjectState.commit("Rotated polygon", () => {
    if (e.locked) throw Error("Unlock first");
    const oldW = e.w;
    e.points = e.points.map((p) => ({ x: e.h - p.y, y: p.x }));
    e.w = e.h;
    e.h = oldW;
    this.assertBounds([e]);
  });
};
const planningOldFixtureAdd = window.addFixture;
window.addFixture = function (type) {
  if (elements[selectedElIndex]?.points) return PlanningUI.openingsDialog();
  return planningOldFixtureAdd(type);
};
// Capturing a drawing pointer suppresses the legacy mouse/touch placement paths as well.
document.addEventListener(
  "mousedown",
  (e) => {
    if (
      PlanningUI.ready &&
      PlanningUI.tool !== "select" &&
      e.target.closest("#blueprint")
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  true,
);
document.addEventListener(
  "touchstart",
  (e) => {
    if (
      PlanningUI.ready &&
      PlanningUI.tool !== "select" &&
      e.target.closest("#blueprint")
    ) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  { capture: true, passive: false },
);
window.cloneEntireFloor = () => {
  PlanningUI.copySource = currentFloor;
  PlanningUI.copyFloorFrom(currentFloor);
};
window.deleteCurrentFloor = () => PlanningUI.deleteFloor(currentFloor);
PlanningUI.copyFloorFrom = function (f) {
  const input = document.getElementById("copy-floor");
  if (input) {
    input.value = f;
    return this.copyFloor();
  }
  this.builderDialog();
  document.getElementById("copy-floor").value = f;
  return this.copyFloor();
};
const planningConnectivityDialog = PlanningUI.connectivityDialog;
PlanningUI.connectivityDialog = function () {
  planningConnectivityDialog.call(this);
  const data = PlanningModel.connectivity(this.p(), currentFloor),
    n = data.rooms.length;
  if (!n) return;
  const positions = data.rooms.map((r, i) => ({
    x: 150 + 110 * Math.cos((i * 2 * Math.PI) / n),
    y: 120 + 85 * Math.sin((i * 2 * Math.PI) / n),
    r,
  }));
  let graph =
    '<svg class="planning-preview" viewBox="0 0 300 240" role="img" aria-label="Room access graph">';
  for (const l of data.links) {
    const a = positions.find((p) => p.r.index === l.a),
      b = positions.find((p) => p.r.index === l.b);
    if (a && b)
      graph += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#7dd3fc"/>`;
  }
  graph +=
    positions
      .map(
        (p) =>
          `<circle cx="${p.x}" cy="${p.y}" r="15" fill="${p.r.reachable ? "#166534" : "#9f1239"}"/><text x="${p.x}" y="${p.y + 28}" text-anchor="middle" font-size="8" fill="#e2e8f0">${this.esc(p.r.name)}</text>`,
      )
      .join("") + "</svg>";
  document
    .querySelector("#studio-dialog .studio-dialog-body")
    .insertAdjacentHTML("afterbegin", graph);
};
const planningSectionCut = toggleSectionCut;
window.toggleSectionCut = function () {
  planningSectionCut();
  PlanningUI.refresh();
};
// Room Studio uses the actual polygon footprint in its 2D sandbox and validates furniture on save.
const planningStudioRender = RoomStudio.renderCanvas;
if (planningStudioRender)
  RoomStudio.renderCanvas = function (...args) {
    const result = planningStudioRender.apply(this, args);
    if (this.activeRoom?.points) {
      const group = document.getElementById("std-room-group");
      if (group) {
        group.innerHTML = "";
        PlanningDrawing.svgNode(
          "polygon",
          {
            points: this.activeRoom.points
              .map((p) => p.x + "," + p.y)
              .join(" "),
            fill: "#164e6333",
            stroke: "#38bdf8",
            "stroke-width": 2,
          },
          group,
        );
        const p = ProjectModel.normalize({
          elements: [{ ...this.activeRoom, x: 0, y: 0, floor: 0 }],
          fixtures: this.sandboxDoorsWindows.map((f) => ({
            ...f,
            roomId: 0,
            roomUid: this.activeRoom.id,
          })),
          wallSettings: ProjectState.meta.wallSettings,
        });
        for (const w of ProjectModel.walls(p))
          for (const [a, b] of PlanningDrawing.segments(w)) {
            const x = PlanningDrawing.point(w, a),
              y = PlanningDrawing.point(w, b);
            PlanningDrawing.svgNode(
              "line",
              {
                x1: x.x,
                y1: x.y,
                x2: y.x,
                y2: y.y,
                stroke: "#94a3b8",
                "stroke-width": 2,
              },
              group,
            );
          }
        for (const f of p.fixtures) {
          const seg = PlanningModel.openingSegment(p, f);
          PlanningDrawing.svgNode(
            "line",
            {
              x1: seg.a.x,
              y1: seg.a.y,
              x2: seg.b.x,
              y2: seg.b.y,
              stroke: f.type === "window" ? "#38bdf8" : "#fbbf24",
              "stroke-width": 2,
            },
            group,
          );
        }
      }
    }
    return result;
  };
const planningStudioSave = RoomStudio.save;
RoomStudio.save = function () {
  if (this.activeRoom?.points) {
    const poly = this.activeRoom.points;
    for (const fix of this.sandboxFixtures) {
      const b = Selection.bounds(fix),
        ps = PlanningModel.points({ ...fix, w: b.w, h: b.h });
      if (!ps.every((p) => PlanningModel.inside(p, poly)))
        return StudioUI.message(
          "Furniture must fit inside the polygon room.",
          "error",
        );
    }
  }
  return planningStudioSave.call(this);
};
const planningStudioOpen = RoomStudio.open;
RoomStudio.open = function () {
  planningStudioOpen.call(this);
  if (this.activeRoom?.points) {
    const poly = PlanningModel.points(this.activeRoom);
    this.sandboxFixtures = this.sandboxFixtures.filter((f) =>
      PlanningModel.inside(
        {
          x: this.activeRoom.x + f.x + f.w / 2,
          y: this.activeRoom.y + f.y + f.h / 2,
        },
        poly,
      ),
    );
    this.originalFurnitureIds = this.sandboxFixtures.map((f) => f.id);
    this.renderCanvas();
  }
};
PlanningUI.fit3D = function (selectionOnly = false) {
  if (!Engine3D.camera || !Engine3D.buildingGroup) return;
  const box = new THREE.Box3();
  if (selectionOnly && Selection.ids.size) {
    for (const id of Selection.ids) {
      const object = Engine3D.elementObjects.get(id);
      if (object) box.expandByObject(object);
    }
  } else box.setFromObject(Engine3D.buildingGroup);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3()),
    size = box.getSize(new THREE.Vector3()),
    distance =
      (Math.max(size.x, size.y, size.z) /
        Math.tan((Engine3D.camera.fov * Math.PI) / 360)) *
      0.85;
  Engine3D.camera.position
    .copy(center)
    .add(new THREE.Vector3(distance * 0.7, distance * 0.8, distance));
  Engine3D.controls?.target.copy(center);
  Engine3D.controls?.update();
  Engine3D.camera.lookAt(center);
  Engine3D.camera.far = Math.max(10000, distance * 8);
  Engine3D.camera.updateProjectionMatrix();
  Engine3D.needsRender = true;
};
const planningViewDialog = StudioUI.viewToolsDialog;
StudioUI.viewToolsDialog = function () {
  planningViewDialog.call(this);
  document
    .querySelector("#studio-dialog .studio-dialog-body")
    .insertAdjacentHTML(
      "afterbegin",
      PlanningUI.button("Frame 3D building", "PlanningUI.fit3D()") +
        PlanningUI.button("Frame 3D selection", "PlanningUI.fit3D(true)"),
    );
};
PlanningUI.dimensionChainsDialog = function () {
  const rooms = elements
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.floor === currentFloor && !e.isFurniture);
  this.dimensionChains = [];
  const rows = ["x", "y"]
    .map((axis) => {
      const ordered = [...rooms].sort((a, b) => a.e[axis] - b.e[axis]);
      return (
        "<h3>" +
        axis.toUpperCase() +
        " chain</h3>" +
        ordered
          .slice(1)
          .map((target, n) => {
            const source = ordered[n],
              key = this.dimensionChains.length;
            this.dimensionChains.push({
              source: source.e.id,
              target: target.e.id,
              axis,
            });
            return this.field(
              "dimension-chain-" + key,
              (source.e.customName || source.e.type) +
                " → " +
                (target.e.customName || target.e.type),
              ProjectModel.display(
                target.e[axis] - source.e[axis],
                document.getElementById("unitSelect").value,
              ),
            );
          })
          .join("")
      );
    })
    .join("");
  this.dialog(
    "Editable dimension chains",
    "<p>Chains link room top-left positions on each axis. Applying creates distance constraints; room size labels edit width/depth separately. Values use the selected display unit.</p>" +
      rows +
      this.button(
        "Apply dimension chains",
        "PlanningUI.saveDimensionChains()",
        "primary",
      ),
  );
};
PlanningUI.saveDimensionChains = function () {
  this.run(() => {
    const changes = this.dimensionChains.map((r, i) => ({
      ...r,
      distance: this.parse(this.val("dimension-chain-" + i)),
    }));
    if (
      this.change("Changed dimension chains", () => {
        for (const r of changes) {
          const kind = "offset-" + r.axis,
            rule = ProjectState.meta.constraints.find(
              (c) => c.kind === kind && c.target === r.target,
            );
          if (rule) {
            rule.source = r.source;
            rule.distance = r.distance;
          } else
            ProjectState.meta.constraints.push({
              id: ProjectModel.uid(),
              kind,
              source: r.source,
              target: r.target,
              distance: r.distance,
            });
        }
      })
    )
      document.getElementById("studio-dialog").close();
  });
};
const planningToolsWithoutChains = PlanningUI.tools,
  planningActionsWithoutChains = PlanningUI.toolActions;
PlanningUI.tools = function () {
  return [
    ...planningToolsWithoutChains.call(this),
    ["Inspect", "Dimension chains", "PlanningUI.dimensionChainsDialog()"],
  ];
};
PlanningUI.toolActions = function () {
  return [
    ...planningActionsWithoutChains.call(this),
    () => this.dimensionChainsDialog(),
  ];
};
