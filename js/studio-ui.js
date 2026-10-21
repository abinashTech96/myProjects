/* Workspace shell, contextual editing, accessible dialogs and atomic editing tools. */
const Selection = {
  ids: new Set(),
  dragStart: new Map(),
  bounds(el) {
    const turned = el.isFurniture && Math.abs(el.rot % 180) === 90;
    return {
      x: el.x,
      y: el.y,
      w: turned ? el.h : el.w,
      h: turned ? el.w : el.h,
    };
  },
  indices() {
    return elements
      .map((e, i) => (this.ids.has(e.id) ? i : -1))
      .filter((i) => i >= 0);
  },
  pick(index) {
    const el = elements[index];
    if (!el) return;
    if (!this.ids.has(el.id)) {
      this.ids.clear();
      elements
        .filter(
          (e) => e.id === el.id || (el.groupId && e.groupId === el.groupId),
        )
        .forEach((e) => this.ids.add(e.id));
    }
    selectedElIndex = index;
  },
  toggle(index) {
    const el = elements[index];
    if (!el) return;
    this.ids.has(el.id) ? this.ids.delete(el.id) : this.ids.add(el.id);
    selectedElIndex = index;
    AppEvents.triggerStateChange();
  },
  beginDrag() {
    this.dragStart = new Map(
      this.indices().map((i) => [
        elements[i].id,
        { x: elements[i].x, y: elements[i].y },
      ]),
    );
  },
  dragTo(index, x, y) {
    const start = this.dragStart.get(elements[index].id);
    if (!start) return;
    let dx = x - start.x,
      dy = y - start.y;
    const { inW, inH, SCALE } = Utils.getMetrics();
    for (const i of this.indices()) {
      const el = elements[i],
        s = this.dragStart.get(el.id),
        b = this.bounds(el);
      if (el.locked) {
        dx = 0;
        dy = 0;
        break;
      }
      dx = Math.max(dx, -s.x);
      dx = Math.min(dx, inW / SCALE - s.x - b.w);
      dy = Math.max(dy, -s.y);
      dy = Math.min(dy, inH / SCALE - s.y - b.h);
    }
    this.indices().forEach((i) => {
      const e = elements[i],
        s = this.dragStart.get(e.id);
      e.x = s.x + dx;
      e.y = s.y + dy;
    });
  },
  action(kind) {
    const indices = this.indices();
    if (!indices.length) return;
    ProjectState.commit(kind, () => {
      const list = indices.map((i) => elements[i]);
      if (list.some((e) => e.locked))
        throw new Error("Unlock all selected elements first.");
      if (kind === "Delete selection") {
        ProjectState.removeIndices(indices);
        this.ids.clear();
        return;
      }
      if (kind === "Group") {
        const id = ProjectModel.uid();
        list.forEach((e) => (e.groupId = id));
        return;
      }
      if (kind === "Ungroup") {
        list.forEach((e) => delete e.groupId);
        return;
      }
      if (kind === "Duplicate") {
        const clones = list.map((e) => ({
          ...structuredClone(e),
          id: ProjectModel.uid(),
          x: e.x + 12,
          y: e.y + 12,
          groupId: undefined,
        }));
        list.forEach((el, n) =>
          fixtures
            .filter((f) => f.roomId === elements.indexOf(el))
            .forEach((f) =>
              fixtures.push({
                ...f,
                id: ProjectModel.uid(),
                roomUid: clones[n].id,
                roomId: elements.length + n,
              }),
            ),
        );
        elements.push(...clones);
        this.ids = new Set(clones.map((e) => e.id));
        return;
      }
      const left = Math.min(...list.map((e) => e.x)),
        top = Math.min(...list.map((e) => e.y)),
        right = Math.max(...list.map((e) => e.x + this.bounds(e).w)),
        bottom = Math.max(...list.map((e) => e.y + this.bounds(e).h));
      if (kind.startsWith("Distribute")) {
        if (list.length < 3) throw new Error("Select at least three elements.");
        const axis = kind.endsWith("X") ? "x" : "y",
          size = axis === "x" ? "w" : "h",
          sorted = [...list].sort((a, b) => a[axis] - b[axis]),
          space =
            (axis === "x" ? right - left : bottom - top) -
            list.reduce((sum, e) => sum + this.bounds(e)[size], 0),
          gap = space / (list.length - 1);
        let position = sorted[0][axis];
        sorted.forEach((e) => {
          e[axis] = position;
          position += this.bounds(e)[size] + gap;
        });
      } else
        list.forEach((e) => {
          if (kind === "Align left") e.x = left;
          if (kind === "Align right") e.x = right - this.bounds(e).w;
          if (kind === "Align top") e.y = top;
          if (kind === "Align bottom") e.y = bottom - this.bounds(e).h;
          if (kind === "Align center X")
            e.x = (left + right - this.bounds(e).w) / 2;
          if (kind === "Align center Y")
            e.y = (top + bottom - this.bounds(e).h) / 2;
        });
      StudioUI.assertBounds(list);
    });
  },
};
const StudioUI = {
  mode: "2d",
  warnings: [],
  lastPlot: null,
  resize: null,
  unit: "in",
  filter: "",
  assetKind: "rooms",
  ready: false,
  checking: false,
  escape: ProjectModel.escapeHTML,
  button(text, action, cls = "") {
    return `<button type="button" class="studio-button ${cls}" onclick="${action}">${text}</button>`;
  },
  init() {
    document.body.classList.add("studio-shell");
    const shell = document.createElement("div");
    shell.id = "studio-shell";
    shell.innerHTML = `
            <header class="studio-header"><div class="studio-brand">ArchCAD <span>PRO</span></div>
            <div class="studio-file-actions">${this.button("Project", "StudioUI.projectMenu()")}${this.button("Save", "exportJSON()", "primary")}<div class="studio-history">${this.button("Undo", "undoAction()")}${this.button("Redo", "redoAction()")}</div></div>
            <div class="studio-view-modes" role="group" aria-label="Workspace view">${["2d", "split", "3d", "4d"].map((v) => `<button class="studio-button" data-mode="${v}" onclick="setWorkspaceLayout('${v}')">${v === "split" ? "Split" : v.toUpperCase()}</button>`).join("")}</div>
            <div class="studio-floor-controls"><div id="studio-floor-tabs"></div><button class="studio-button" onclick="StudioUI.floorMenu()" title="Manage floors" aria-label="Manage floors">Floors ▾</button></div></header>
            <aside class="studio-catalog" aria-label="Asset catalog"><div class="studio-panel-heading"><strong>Build</strong><button class="studio-button" onclick="PlanningUI.collapse('catalog')" aria-label="Close Build panel">✕</button></div><input id="studio-search" aria-label="Search assets" placeholder="Search rooms or furniture" oninput="StudioUI.filter=this.value;StudioUI.renderCatalog()"><select id="studio-asset-kind" aria-label="Asset category" onchange="StudioUI.assetKind=this.value;StudioUI.renderCatalog()"><option value="rooms">Rooms</option><option value="furniture">Furniture</option><option value="openings">Doors & windows</option></select><div id="studio-assets"></div><p class="studio-hint">Drag onto the plan or click to place.<br>Ctrl / ⌘ + click to select several items.</p><div class="studio-tools">${this.button("Auto-builder", "toggleAutoBuilder()")}${this.button("AI assistant", "StudioUI.aiDialog()")}${this.button("Plot & units", "StudioUI.projectDialog()")}${this.button("Measure", "toggleMeasureMode()")}${this.button("Section cut", "toggleSectionCut()")}${this.button("3D tools", "StudioUI.viewToolsDialog()")}${this.button("Layout checks", "StudioUI.checksDialog()")}${this.button("Shortcuts", "StudioUI.shortcuts()")}</div></aside>
            <aside id="studio-inspector" class="studio-inspector" aria-label="Properties"><div class="studio-panel-heading"><strong>Properties</strong><button class="studio-button" onclick="StudioUI.closeProperties()" aria-label="Close properties">✕</button></div><div id="studio-selection-actions"></div><div id="studio-properties"></div></aside>
            <footer class="studio-status"><span id="studio-project-name"></span><span id="studio-save-status" role="status" aria-live="polite">Starting…</span><button class="studio-link" onclick="StudioUI.checksDialog()" id="studio-warning-count">Layout checks</button><span id="studio-coordinates">Inches</span><span id="studio-zoom">100%</span><button class="studio-button" id="studio-undo" onclick="undoAction()" title="Undo (Ctrl/⌘ Z)">Undo</button><button class="studio-button" id="studio-redo" onclick="redoAction()" title="Redo (Ctrl/⌘ Shift Z)">Redo</button></footer><div id="studio-toast" role="status" aria-live="polite"></div>`;
    document.body.appendChild(shell);
    const tabs = document.getElementById("top-floor-tabs");
    if (tabs) document.getElementById("studio-floor-tabs").appendChild(tabs);
    this.unit = document.getElementById("unitSelect").value;
    this.lastPlot = ProjectState.capture();
    document.getElementById("unitSelect").onchange = () => this.changeUnit();
    document
      .querySelectorAll("#inW,#inH,#aL,#aU,#bR,#bU,#cR,#cD,#dL,#dD")
      .forEach((input) => {
        input.type = "text";
        input.inputMode = "decimal";
        input.addEventListener("change", () => this.plotChanged());
      });
    document
      .getElementById("scaleInput")
      .addEventListener("change", () => this.plotChanged());
    document.getElementById("roadSide").onchange = () => this.plotChanged();
    document.getElementById("compassDir").onchange = () => {
      globalCompassDir = document.getElementById("compassDir").value;
      this.plotChanged();
    };
    document
      .getElementById("blueprint")
      .addEventListener("pointermove", (e) => {
        const p = getMousePos(e),
          { SCALE, I } = Utils.getMetrics();
        document.getElementById("studio-coordinates").textContent =
          `X ${((p.x - I.x) / SCALE).toFixed(1)} · Y ${((p.y - I.y) / SCALE).toFixed(1)} in`;
      });
    document
      .getElementById("blueprint")
      .addEventListener("pointerdown", (e) => this.boxSelect(e), true);
    AppEvents.onStateChange(() => {
      this.lastPlot = ProjectState.capture();
      this.updateStatus();
    });
    this.ready = true;
    const oldViewport = window.updateViewport;
    window.updateViewport = function () {
      oldViewport();
      StudioUI.updateStatus();
      if (!ProjectState.applying) StorageEngine.markDirty();
    };
    this.renderCatalog();
    this.renderInspector();
    setWorkspaceLayout(ProjectState.meta.view.mode || "2d");
    if (!ProjectState.meta.view.camera) this.fitPlan();
    this.updateStatus();
  },
  projectMenu() {
    this.dialog("Project", `<div class="studio-action-grid">${this.button("Plot & units", "StudioUI.projectDialog()")}${this.button("Open project", "StudioUI.openFile()")}${this.button("Save JSON", "exportJSON()")}${this.button("Export drawings / model", "StudioUI.exportDialog()")}${this.button("Versions & recovery", "StudioUI.versionsDialog()")}${this.button("Project library", "PlanningUI.libraryDialog()")}</div>`);
  },
  floorMenu() {
    this.dialog("Floors", `<p>Current floor: ${currentFloor === 0 ? "Ground" : currentFloor}</p><div class="studio-action-grid">${this.button("Add floor", "addManualFloor();StudioUI.floorMenu()")}${this.button("Clone current floor", "cloneEntireFloor();StudioUI.floorMenu()")}${this.button("Delete current floor", "deleteCurrentFloor();StudioUI.floorMenu()", "danger")}${this.button("Rooms & objects", "StudioUI.objectsDialog()")}</div>`);
  },
  closeProperties() {
    selectedElIndex = -1;
    Selection.ids.clear();
    document.body.classList.remove("inspector-open");
    AppEvents.triggerSelectionChange();
    updateCanvas(false);
    this.renderInspector();
  },
  message(text, kind = "info") {
    const node = document.getElementById("studio-toast");
    if (!node) {
      console.warn(text);
      return;
    }
    node.textContent = text;
    node.dataset.kind = kind;
    node.setAttribute("role", kind === "error" ? "alert" : "status");
    node.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");
    node.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => node.classList.remove("show"), 4500);
  },
  fitPlan() {
    const { SCALE } = Utils.getMetrics(),
      g = calculateGeometry(SCALE, document.getElementById("unitSelect").value),
      points = [g.A, g.B, g.C, g.D],
      minX = Math.min(...points.map((p) => p.x)),
      maxX = Math.max(...points.map((p) => p.x)),
      minY = Math.min(...points.map((p) => p.y)),
      maxY = Math.max(...points.map((p) => p.y));
    CanvasState.zoomLvl = Math.max(
      0.2,
      Math.min(5, 780 / (maxX - minX + 100), 780 / (maxY - minY + 100)),
    );
    CanvasState.panX = 500 - ((minX + maxX) / 2) * CanvasState.zoomLvl;
    CanvasState.panY = 470 - ((minY + maxY) / 2) * CanvasState.zoomLvl;
    updateViewport();
  },
  syncProject() {
    this.unit = document.getElementById("unitSelect")?.value || "in";
    if (!this.ready) return;
    this.lastPlot = ProjectState.capture();
    if (!ProjectState.meta.view.camera) this.fitPlan();
    this.updateStatus();
    this.renderInspector();
  },
  updateStatus() {
    if (!this.ready) return;
    const save = document.getElementById("studio-save-status");
    save.textContent = StorageEngine.error
      ? `Save failed: ${StorageEngine.error}`
      : StorageEngine.loading
        ? "Checking recovery…"
        : StorageEngine.saving
          ? "Saving…"
          : StorageEngine.dbNeedsSave
            ? "Unsaved changes"
            : StorageEngine.lastSaved
              ? `Saved ${StorageEngine.lastSaved}`
              : "Ready";
    save.dataset.error = !!StorageEngine.error;
    document.getElementById("studio-project-name").textContent =
      ProjectState.meta.name;
    document.getElementById("studio-undo").disabled =
      !ProjectState.history.stack.length;
    document.getElementById("studio-redo").disabled =
      !ProjectState.history.redoStack.length;
    const historyButtons = document.querySelectorAll(".studio-history button");
    if (historyButtons.length) {
      historyButtons[0].disabled = !ProjectState.history.stack.length;
      historyButtons[1].disabled = !ProjectState.history.redoStack.length;
    }
    document.getElementById("studio-zoom").textContent =
      `${Math.round((CanvasState.zoomLvl || 1) * 100)}%`;
  },
  renderCatalog() {
    const box = document.getElementById("studio-assets");
    if (!box) return;
    box.innerHTML = "";
    if (this.assetKind === "openings") {
      box.innerHTML = `<p class="studio-hint">Select a room, then add an opening.</p>${this.button("Add door", "addFixture('door')")}${this.button("Add window", "addFixture('window')")}${this.button("Edit openings", "PlanningUI.openingsDialog()")}`;
      return;
    }
    const matches = ASSET_CATALOGS[this.assetKind].items.filter(i => i.label.toLowerCase().includes(this.filter.trim().toLowerCase()));
    if (!matches.length) {
      box.innerHTML = `<div class="catalog-empty">No matching assets. Try another name.<br><button class="studio-button" onclick="StudioUI.filter='';document.getElementById('studio-search').value='';StudioUI.renderCatalog()">Clear search</button></div>`;
      return;
    }
    for (const item of matches) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "studio-asset";
      button.draggable = true;
      button.innerHTML = `<span>${this.escape(item.label)}</span><small>${ProjectModel.display(item.w, this.unit)} × ${ProjectModel.display(item.h, this.unit)} ${this.unit === "ftin" ? "" : this.unit}</small>`;
      button.title = `${item.label} · ${ProjectModel.display(item.w, this.unit)} × ${ProjectModel.display(item.h, this.unit)} ${this.unit === "ftin" ? "" : this.unit}`;
      button.onclick = () => this.place(item, this.assetKind);
      button.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData(
          "application/json",
          JSON.stringify({ ...item, category: this.assetKind }),
        );
        e.dataTransfer.effectAllowed = "copy";
      });
      box.appendChild(button);
    }
  },
  place(item, kind) {
    const { inW, inH, SCALE } = Utils.getMetrics();
    if (item.w > inW / SCALE || item.h > inH / SCALE)
      return this.message("This asset is larger than the plot.", "error");
    ProjectState.commit("Added " + item.label, () => {
      elements.push({
        id: ProjectModel.uid(),
        type: item.type,
        w: item.w,
        h: item.h,
        x: Math.max(0, (inW / SCALE - item.w) / 2),
        y: Math.max(0, (inH / SCALE - item.h) / 2),
        floor: currentFloor,
        isFurniture: kind === "furniture",
        locked: false,
        rot: 0,
      });
      selectedElIndex = elements.length - 1;
      Selection.ids = new Set([elements[selectedElIndex].id]);
    });
  },
  assertBounds(list) {
    const { inW, inH, SCALE } = Utils.getMetrics();
    for (const el of list) {
      const b = Selection.bounds(el);
      if (
        el.x < 0 ||
        el.y < 0 ||
        el.x + b.w > inW / SCALE + 0.001 ||
        el.y + b.h > inH / SCALE + 0.001
      )
        throw new Error("The selection must fit inside the plot.");
    }
  },
  edit(index, key, value) {
    const el = elements[index];
    if (!el) return;
    if (el.locked && key !== "locked")
      return this.message("Unlock this element first.", "error");
    let patch = value;
    if (["x", "y", "w", "h"].includes(key)) {
      patch = Number(value);
      if (
        !String(value).trim() ||
        !Number.isFinite(patch) ||
        (["w", "h"].includes(key) && patch < 1)
      )
        return this.message("Enter a valid positive dimension.", "error");
    }
    const geometryChanged = ["x", "y", "w", "h", "rot"].includes(key) && patch !== el[key];
    return ProjectState.commit("Changed " + key, () => {
      el[key] = patch;
      if (geometryChanged) this.assertBounds([el]);
      for (const f of fixtures.filter((f) => f.roomId === index && geometryChanged && ["w", "h"].includes(key))) {
        const max = ["top", "bottom"].includes(f.edge) ? el.w : el.h;
        f.size = Math.min(f.size, max);
        f.offset = Math.max(0, Math.min(f.offset, max - f.size));
      }
    });
  },
  renderInspector() {
    const panel = document.getElementById("studio-properties");
    if (!panel) return;
    Selection.ids = new Set(
      [...Selection.ids].filter((id) => elements.some((e) => e.id === id)),
    );
    const el = elements[selectedElIndex];
    document.body.classList.toggle("has-selection", !!el);
    if (el && this.inspectedId !== el.id && matchMedia("(max-width:850px)").matches) {
      document.body.classList.remove("catalog-open");
      document.body.classList.add("inspector-open");
    }
    if (!el) document.body.classList.remove("inspector-open");
    this.inspectedId = el?.id;
    if (!el) {
      Selection.ids.clear();
      panel.innerHTML = `<p class="studio-hint">Select a room or furniture item on the plan.</p><strong>Floor ${currentFloor === 0 ? "G" : currentFloor}</strong><div class="studio-room-list">${elements.map((e, i) => (e.floor === currentFloor ? `<button class="studio-list-item" onclick="StudioUI.select(${i})">${this.escape(e.customName || e.type)}${e.locked ? " · Locked" : ""}</button>` : "")).join("")}</div>${this.button("Clone floor", "cloneEntireFloor()")}${this.button("Delete floor", "deleteCurrentFloor()", "danger")}`;
      return;
    }
    if (!Selection.ids.has(el.id)) Selection.ids = new Set([el.id]);
    const count = Selection.ids.size,
      disabled = el.locked ? "disabled" : "",
      clear = !el.isFurniture ? WallEngine.clearDimensions(el) : null;
    panel.innerHTML = `<div class="studio-selection-title">${count > 1 ? `${count} selected` : this.escape(el.customName || el.type)}</div><div class="studio-action-row">${this.button(el.locked ? "Unlock" : "Lock", `StudioUI.edit(${selectedElIndex},'locked',${!el.locked})`)}${this.button("Duplicate", "Selection.action('Duplicate')")}${this.button("Delete", "Selection.action('Delete selection')", "danger")}</div>
        ${count > 1 ? `<details open><summary>Arrange selection</summary><div class="studio-action-grid">${["Align left", "Align right", "Align top", "Align bottom", "Align center X", "Align center Y", "Distribute X", "Distribute Y", "Group", "Ungroup"].map((k) => this.button(k, `Selection.action('${k}')`)).join("")}</div></details>` : ""}
        <details open><summary>Geometry · inches</summary><div class="studio-field-grid">${[
          ["x", "X"],
          ["y", "Y"],
          ["w", "Width"],
          ["h", "Depth"],
        ]
          .map(
            ([key, label]) =>
              `<label>${label}<input aria-label="${label}" type="number" step="0.25" ${disabled} ${key === "w" || key === "h" ? 'min="1"' : 'min="0"'} value="${el[key]}" onchange="StudioUI.edit(${selectedElIndex},'${key}',this.value)"></label>`,
          )
          .join(
            "",
          )}</div>${clear ? `<p class="studio-hint" data-clear-interior>Clear interior: ${ProjectModel.display(clear.w, "ftin")} × ${ProjectModel.display(clear.h, "ftin")}<br>Bounds follow wall centerlines.</p>` : ""}<div class="studio-action-row">${this.button("Rotate 90°", `StudioUI.rotate(${selectedElIndex})`)}${this.button("Frame", "centerOnSelection()")}</div></details>
        <details><summary>Appearance</summary><label>Name<input value="${this.escape(el.customName)}" ${disabled} onchange="StudioUI.edit(${selectedElIndex},'customName',this.value)"></label><label>Color<input type="color" value="${el.customColor || "#94a3b8"}" ${disabled} onchange="StudioUI.edit(${selectedElIndex},'customColor',this.value)"></label><label>Material<select ${disabled} onchange="StudioUI.edit(${selectedElIndex},'material',this.value)">${["auto", "wood", "kitchen-tile", "bathroom-tile", "grass", "concrete", "shingle"].map((v) => `<option ${el.material === v ? "selected" : ""}>${v}</option>`).join("")}</select></label></details>
        ${!el.isFurniture ? `<details open><summary>Openings & interiors</summary><div class="studio-action-row">${this.button("+ Door", "addFixture('door')")}${this.button("+ Window", "addFixture('window')")}${this.button("Room Studio", "RoomStudio.open()")}</div>${fixtures.map((f, i) => (f.roomId === selectedElIndex ? `<div class="studio-opening"><strong>${f.type}</strong><label>Wall<select ${disabled} onchange="StudioUI.editOpening(${i},'edge',this.value)">${["top", "bottom", "left", "right"].map((edge) => `<option ${f.edge === edge ? "selected" : ""}>${edge}</option>`).join("")}</select></label><div class="studio-field-grid">${["size", "offset", "height", "sill"].map((k) => `<label>${k}<input type="number" min="${k === "offset" || k === "sill" ? 0 : 1}" step="0.25" value="${f[k] ?? (k === "height" ? (f.type === "door" ? 80 : 40) : k === "sill" ? (f.type === "door" ? 0 : 40) : 0)}" ${disabled} onchange="StudioUI.editOpening(${i},'${k}',this.value)"></label>`).join("")}</div>${this.button("Remove", `deleteFixture(${i})`, "danger")}</div>` : "")).join("")}</details>` : ""}
        ${el.type === "staircase" ? `<details open><summary>Staircase</summary><label>Style<select onchange="StudioUI.edit(${selectedElIndex},'stairStyle',this.value)">${["straight", "l-shape", "u-shape"].map((v) => `<option ${el.stairStyle === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>Direction<select onchange="StudioUI.edit(${selectedElIndex},'dir',this.value)">${["up", "right", "down", "left"].map((v) => `<option ${el.dir === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label><input type="checkbox" ${el.cutAllFloors ? "checked" : ""} onchange="StudioUI.edit(${selectedElIndex},'cutAllFloors',this.checked)"> Open upper slabs</label></details>` : ""}
        <details><summary>Distance constraints</summary><p class="studio-hint">Offsets are measured between the top-left bounds, in inches.</p>${ProjectState.meta.constraints
          .filter((r) => r.target === el.id)
          .map(
            (r) =>
              `<p>${this.escape(r.kind)}: ${r.distance} ${this.button("Remove", `StudioUI.removeConstraint('${r.id}')`)}</p>`,
          )
          .join("")}<label>Reference<select id="constraint-source">${elements
          .filter((e) => e.id !== el.id && e.floor === el.floor)
          .map(
            (e) =>
              `<option value="${this.escape(e.id)}">${this.escape(e.customName || e.type)}</option>`,
          )
          .join(
            "",
          )}</select></label><label>Axis<select id="constraint-axis"><option value="x">X</option><option value="y">Y</option></select></label><label>Offset (in)<input id="constraint-distance" type="number" value="0" step="0.25"></label>${this.button("Add constraint", "StudioUI.addConstraint()")}</details>
        ${
          !el.isFurniture
            ? `<details><summary>Wall thickness</summary><p class="studio-hint">One shared wall is created where room edges coincide.</p>${WallEngine.getWalls()
                .filter((w) =>
                  w.owners.some((o) => o.index === selectedElIndex),
                )
                .map(
                  (w) =>
                    `<label>${w.shared ? "Shared" : "External"} ${w.owners.find((o) => o.index === selectedElIndex).edge}<input type="number" min="1" max="36" step="0.25" value="${w.thickness}" onchange="StudioUI.wallThickness('${w.id}',this.value)"></label>`,
                )
                .join("")}</details>`
            : ""
        }`;
  },
  select(i) {
    Selection.ids.clear();
    Selection.pick(i);
    document.body.classList.remove("catalog-open");
    document.body.classList.add("inspector-open");
    renderSidebar();
    AppEvents.triggerSelectionChange();
    updateCanvas(false);
  },
  rotate(i) {
    ProjectState.commit("Rotated element", () => {
      const el = elements[i];
      if (el.locked) throw new Error("Unlock first.");
      if (el.isFurniture) el.rot = ((el.rot || 0) + 90) % 360;
      else {
        const width = el.w;
        el.w = el.h;
        el.h = width;
        fixtures
          .filter((f) => f.roomId === i)
          .forEach((f) => {
            const limit = ["top", "bottom"].includes(f.edge) ? el.w : el.h;
            f.size = Math.min(f.size, limit);
            f.offset = Math.min(f.offset, limit - f.size);
          });
      }
      this.assertBounds([el]);
    });
  },
  editOpening(i, key, value) {
    if (elements[fixtures[i].roomId].locked)
      return this.message("Unlock the room first.", "error");
    return ProjectState.updateFixture(i, {
      [key]: key === "edge" ? value : Number(value),
    });
  },
  wallThickness(id, value) {
    ProjectState.commit("Changed wall thickness", () => {
      ProjectState.meta.wallOverrides[id] = Number(value);
    });
  },
  addConstraint() {
    const target = elements[selectedElIndex];
    const source = document.getElementById("constraint-source").value,
      axis = document.getElementById("constraint-axis").value,
      distance = Number(document.getElementById("constraint-distance").value);
    ProjectState.commit("Added distance constraint", () => {
      ProjectState.meta.constraints.push({
        id: ProjectModel.uid(),
        source,
        target: target.id,
        kind: "offset-" + axis,
        distance,
      });
      // commit() solves constraints and validates only the geometry they change.
    });
  },
  removeConstraint(id) {
    ProjectState.commit("Removed constraint", () => {
      ProjectState.meta.constraints = ProjectState.meta.constraints.filter(
        (r) => r.id !== id,
      );
    });
  },
  finishDrag() {
    try {
      const candidate = ProjectModel.solveConstraints(
        ProjectModel.normalize(ProjectState.capture()),
      );
      const previous = ProjectState.history.stack.at(-1)?.after || ProjectState.history.baseState;
      const previousById = new Map((previous?.elements || []).map(el => [el.id, el]));
      this.assertBounds(candidate.elements.filter(el => {
        const old = previousById.get(el.id);
        return !old || ["x", "y", "w", "h", "rot", "floor"].some(key => el[key] !== old[key]) || JSON.stringify(el.points) !== JSON.stringify(old.points);
      }));
      elements = candidate.elements;
      ProjectState.saveState("Moved elements");
    } catch (error) {
      ProjectState.apply(
        ProjectState.history.stack.at(-1)?.after ||
          ProjectState.history.baseState,
      );
      this.message(error.message, "error");
    }
  },
  startResize(event, corner) {
    event.preventDefault();
    event.stopPropagation();
    if (!elements[selectedElIndex] || elements[selectedElIndex].locked) return;
    const original = structuredClone(elements[selectedElIndex]),
      index = selectedElIndex;
    ProjectState.baseline();
    const move = (e) => {
      const p = getMousePos(e),
        { I, SCALE } = Utils.getMetrics(),
        x = (p.x - I.x) / SCALE,
        y = (p.y - I.y) / SCALE;
      const footprint = Selection.bounds(original),
        next = { ...original, w: footprint.w, h: footprint.h };
      if (corner.includes("e")) next.w = x - original.x;
      else {
        next.x = x;
        next.w = original.x + footprint.w - x;
      }
      if (corner.includes("s")) next.h = y - original.y;
      else {
        next.y = y;
        next.h = original.y + footprint.h - y;
      }
      if (original.isFurniture && original.rot % 180 === 90) {
        const w = next.w;
        next.w = next.h;
        next.h = w;
      }
      if (next.w >= 1 && next.h >= 1) {
        try {
          this.assertBounds([next]);
          elements[index] = next;
          updateCanvas(false);
        } catch {}
      }
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      const next = elements[index];
      elements[index] = original;
      ProjectState.commit("Resized element", () => {
        elements[index] = next;
        for (const f of fixtures.filter((f) => f.roomId === index)) {
          const limit = ["top", "bottom"].includes(f.edge) ? next.w : next.h;
          f.size = Math.min(f.size, limit);
          f.offset = Math.min(f.offset, limit - f.size);
        }
      });
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up, { once: true });
  },
  boxSelect(event) {
    if (event.button !== 0 || !event.shiftKey || RoomStudio.activeRoom) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const start = getMousePos(event),
      svg = document.getElementById("viewport"),
      rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("fill", "rgba(56,189,248,.12)");
    rect.setAttribute("stroke", "#38bdf8");
    svg.appendChild(rect);
    let end = start;
    const move = (e) => {
      end = getMousePos(e);
      rect.setAttribute("x", Math.min(start.x, end.x));
      rect.setAttribute("y", Math.min(start.y, end.y));
      rect.setAttribute("width", Math.abs(end.x - start.x));
      rect.setAttribute("height", Math.abs(end.y - start.y));
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      rect.remove();
      const { I, SCALE } = Utils.getMetrics(),
        x = (Math.min(start.x, end.x) - I.x) / SCALE,
        y = (Math.min(start.y, end.y) - I.y) / SCALE,
        w = Math.abs(end.x - start.x) / SCALE,
        h = Math.abs(end.y - start.y) / SCALE;
      Selection.ids = new Set(
        elements
          .filter((e) => {
            const b = Selection.bounds(e);
            return (
              e.floor === currentFloor &&
              e.x >= x &&
              e.y >= y &&
              e.x + b.w <= x + w &&
              e.y + b.h <= y + h
            );
          })
          .map((e) => e.id),
      );
      selectedElIndex = elements.findIndex((e) => Selection.ids.has(e.id));
      renderSidebar();
      updateCanvas(false);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up, { once: true });
  },
  dialog(title, html) {
    document.querySelector("#studio-dialog")?.close();
    document.querySelector("#studio-dialog")?.remove();
    const dialog = document.createElement("dialog");
    dialog.id = "studio-dialog";
    dialog.className = "studio-dialog";
    dialog.innerHTML = `<form method="dialog" class="studio-dialog-header"><strong>${this.escape(title)}</strong><button aria-label="Close dialog" class="studio-button">✕</button></form><div class="studio-dialog-body">${html}</div>`;
    document.body.appendChild(dialog);
    dialog.addEventListener(
      "close",
      () => {
        if (this.returnNode) {
          document
            .getElementById("drawer-tab-plot")
            .appendChild(this.returnNode);
          this.returnNode = null;
        }
        this.lastFocus?.focus();
      },
      { once: true },
    );
    this.lastFocus = document.activeElement;
    dialog.showModal();
    return dialog;
  },
  rename(value) {
    ProjectState.commit(
      "Renamed project",
      () => (ProjectState.meta.name = value),
    );
  },
  author(value) {
    ProjectState.commit(
      "Changed author",
      () => (ProjectState.meta.author = value),
    );
  },
  projectDialog() {
    const html = `<label>Project name<input id="project-name" value="${this.escape(ProjectState.meta.name)}" onchange="StudioUI.rename(this.value)"></label><label>Drawn by<input value="${this.escape(ProjectState.meta.author)}" onchange="StudioUI.author(this.value)"></label><div id="studio-plot-fields"></div><div class="studio-field-grid"><label>Units<select onchange="StudioUI.changeUnit(this.value)">${["in", "cm", "ftin"].map((v) => `<option value="${v}" ${this.unit === v ? "selected" : ""}>${v === "ftin" ? "Feet & inches" : v === "cm" ? "Centimeters" : "Inches"}</option>`).join("")}</select></label><label>Top direction<select onchange="document.getElementById('compassDir').value=this.value;globalCompassDir=this.value;StudioUI.plotChanged()">${["North", "East", "South", "West"].map((v) => `<option ${globalCompassDir === v ? "selected" : ""}>${v}</option>`).join("")}</select></label></div><details><summary>Wall defaults · inches</summary>${["external", "internal", "height"].map((k) => `<label>${k}<input type="number" step="0.25" value="${ProjectState.meta.wallSettings[k]}" onchange="ProjectState.commit('Changed wall settings',()=>ProjectState.meta.wallSettings.${k}=Number(this.value))"></label>`).join("")}</details><div class="studio-action-row">${this.button("Duplicate project", "StudioUI.duplicateProject()")}${this.button("New project", "StudioUI.reset()", "danger")}</div>`;
    this.dialog("Project & plot", html);
    const fields = document.querySelector("#drawer-tab-plot .input-grid");
    if (fields) {
      this.returnNode = fields;
      document.getElementById("studio-plot-fields").appendChild(fields);
    }
  },
  plotChanged() {
    try {
      ProjectModel.normalize(ProjectState.capture());
      ProjectState.saveState("Changed plot");
      this.lastPlot = ProjectState.capture();
      updateCanvas();
      this.updateStatus();
    } catch (error) {
      const previous =
        ProjectState.history.stack.at(-1)?.after ||
        ProjectState.history.baseState;
      if (previous) ProjectState.apply(previous);
      this.message(error.message, "error");
      updateCanvas();
    }
  },
  changeUnit(unit) {
    const old = this.unit,
      next = unit || document.getElementById("unitSelect").value;
    document.getElementById("unitSelect").value = old;
    ProjectState.commit("Changed display units", () => {
      for (const id of Object.keys(ProjectModel.PLOT_DEFAULTS).filter(
        (k) => k !== "roadSide",
      )) {
        const input = document.getElementById(id);
        input.value = ProjectModel.display(
          ProjectModel.inches(input.value, old),
          next,
        );
      }
      document.getElementById("unitSelect").value = next;
      this.unit = next;
    });
  },
  openFile() {
    document.getElementById(NAV_ACTION_CONFIG.fileInputId).click();
  },
  async reset() {
    if (
      !confirm(
        "Start a new project? Save a snapshot of the current design first.",
      )
    )
      return;
    await StorageEngine.snapshot("Before new project");
    ProjectState.commit("New project", () =>
      ProjectState.apply({
        elements: [],
        fixtures: [],
        floorCount: 1,
        plot: ProjectModel.PLOT_DEFAULTS,
      }),
    );
    document.querySelector("#studio-dialog")?.close();
  },
  duplicateProject() {
    StorageEngine.snapshot("Before project duplicate")
      .then(() =>
        ProjectState.commit("Duplicated project", () => {
          ProjectState.meta.name += " (copy)";
        }),
      )
      .catch((e) => this.message(e.message, "error"));
  },
  async versionsDialog() {
    const versions = await StorageEngine.versions();
    this.dialog(
      "Project versions",
      `<div class="studio-action-row"><input id="version-label" aria-label="Snapshot name" placeholder="Version name">${this.button("Save snapshot", "StudioUI.saveVersion()", "primary")}</div><p class="studio-hint">The latest 15 snapshots are kept on this device.</p><div class="studio-version-list">${versions.map((v) => `<div><strong>${this.escape(v.label)}</strong><small>${new Date(v.time).toLocaleString()}</small>${this.button("Restore", `StudioUI.restoreVersion('${v.id}')`)}${this.button("Compare", `StudioUI.compareVersion('${v.id}')`)}</div>`).join("") || "<p>No snapshots yet.</p>"}</div>`,
    );
  },
  async saveVersion() {
    try {
      await StorageEngine.snapshot(
        document.getElementById("version-label").value || "Manual snapshot",
      );
      this.versionsDialog();
    } catch (e) {
      this.message("Snapshot failed: " + e.message, "error");
    }
  },
  async restoreVersion(id) {
    const version = (await StorageEngine.versions()).find((v) => v.id === id);
    if (
      !version ||
      !confirm(
        "Restore this version? Your current design will be saved as a recovery snapshot.",
      )
    )
      return;
    await StorageEngine.snapshot("Before version restore");
    ProjectState.commit("Restored version", () =>
      ProjectState.apply(version.project),
    );
    document.querySelector("#studio-dialog")?.close();
  },
  async compareVersion(id) {
    const version = (await StorageEngine.versions()).find((v) => v.id === id);
    if (!version) return;
    const current = ProjectState.capture(),
      old = version.project;
    const byId = new Map(old.elements.map((e) => [e.id, e])),
      added = current.elements.filter((e) => !byId.has(e.id)),
      removed = old.elements.filter(
        (e) => !current.elements.some((n) => n.id === e.id),
      ),
      changed = current.elements.filter(
        (e) =>
          byId.has(e.id) &&
          JSON.stringify(e) !== JSON.stringify(byId.get(e.id)),
      );
    this.dialog(
      "Compare with " + version.label,
      `<p>${added.length} added · ${removed.length} removed · ${changed.length} changed</p><p>Plot/settings changed: ${JSON.stringify({ ...current, elements: [], fixtures: [] }) !== JSON.stringify({ ...old, elements: [], fixtures: [] }) ? "Yes" : "No"}</p>${[
        ["Added", added],
        ["Removed", removed],
        ["Changed", changed],
      ]
        .map(
          ([name, list]) =>
            `<strong>${name}</strong><ul>${list.map((e) => `<li>${this.escape(e.customName || e.type)}</li>`).join("") || "<li>None</li>"}</ul>`,
        )
        .join("")}`,
    );
  },
  refreshChecks() {
    if (!this.ready || this.checking) return;
    this.checking = true;
    try {
      const items = [],
        { inW, inH, SCALE } = Utils.getMetrics();
      elements.forEach((el, i) => {
        const b = Selection.bounds(el);
        if (
          el.x < 0 ||
          el.y < 0 ||
          el.x + b.w > inW / SCALE + 0.001 ||
          el.y + b.h > inH / SCALE + 0.001
        )
          items.push({ index: i, text: "Outside plot boundary" });
        if (!el.isFurniture)
          elements.forEach((other, j) => {
            if (
              j > i &&
              !other.isFurniture &&
              el.floor === other.floor &&
              el.x < other.x + other.w &&
              el.x + el.w > other.x &&
              el.y < other.y + other.h &&
              el.y + el.h > other.y
            )
              items.push({
                index: i,
                text: `Overlaps ${other.customName || other.type}`,
              });
          });
      });
      const check = WidgetEngine._calculateCompliance(elements, fixtures);
      check.warnings.forEach((text) => items.push({ index: -1, text }));
      this.warnings = items;
      document.getElementById("studio-warning-count").textContent = items.length
        ? `${items.length} layout warnings`
        : check.totalChecks
          ? "Layout checks passed"
          : "No applicable checks";
      this.updateStatus();
    } finally {
      this.checking = false;
    }
  },
  checksDialog() {
    this.refreshChecks();
    const data = WidgetEngine._calculateVastu(elements);
    this.dialog(
      "Layout checks",
      `<p class="studio-hint">Geometry checks cover the whole project. Vastu guidance below covers the active floor. Configured room-size and opening rules are editable design checks.</p><div class="studio-warning-list">${this.warnings.map((w, i) => `<button class="studio-list-item" onclick="StudioUI.focusWarning(${i})">${this.escape(w.text)}</button>`).join("") || "<p>No layout warnings.</p>"}</div><details><summary>Room rules</summary><pre>${this.escape(JSON.stringify(WIDGET_CONFIG.COMPLIANCE.rules, null, 2))}</pre></details><details><summary>Vastu · floor ${currentFloor === 0 ? "G" : currentFloor} · ${data.score}%</summary>${data.warnings.map((w) => `<p>${this.escape(w)}</p>`).join("") || "<p>Add supported room types to evaluate.</p>"}</details>`,
    );
  },
  focusWarning(i) {
    const w = this.warnings[i];
    if (!w) return;
    document.querySelector("#studio-dialog")?.close();
    if (w.index >= 0) {
      setFloor(elements[w.index].floor);
      this.select(w.index);
      centerOnSelection();
      document.body.classList.add("inspector-open");
    }
  },
  shortcuts() {
    this.dialog(
      "Keyboard & touch",
      `<dl><dt>Ctrl / ⌘ Z</dt><dd>Undo; add Shift to redo</dd><dt>Ctrl / ⌘ click</dt><dd>Toggle selection</dd><dt>Shift + drag empty space</dt><dd>Box selection</dd><dt>Arrow keys</dt><dd>Move selected items 1 inch; Shift = 12 inches</dd><dt>Ctrl / ⌘ D</dt><dd>Duplicate selection</dd><dt>Delete / Backspace</dt><dd>Delete selection in the active editor</dd><dt>Space + drag</dt><dd>Pan plan</dd><dt>R</dt><dd>Rotate selection</dd><dt>Escape</dt><dd>Close active dialog or clear selection</dd></dl><p>On touch screens, tap catalog assets to place them and use the property fields or resize handles.</p>`,
    );
  },
  objectsDialog() {
    const rooms = elements.map((el, index) => ({ el, index })).filter(({ el }) => el.floor === currentFloor);
    this.dialog("Rooms & objects", `<p>Floor ${currentFloor === 0 ? "Ground" : currentFloor} · ${rooms.length} objects</p><div class="workspace-object-list">${rooms.map(({ el, index }) => `<button type="button" class="studio-list-item" onclick="StudioUI.focusObject(${index})"><strong>${this.escape(el.customName || el.type)}</strong><small>${ProjectModel.display(el.w, this.unit)} × ${ProjectModel.display(el.h, this.unit)} · ${el.locked ? "Locked" : "Editable"}</small></button>`).join("") || '<p class="studio-hint">No objects on this floor. Open Build to add a room.</p>'}</div>${this.button("All floors & editable schedule", "DesignUI.explorerDialog()")}${this.button("Manage floors", "StudioUI.floorMenu()")}`);
  },
  focusObject(index) {
    document.getElementById("studio-dialog")?.close();
    this.select(index);
    centerOnSelection();
  },
  panDialog() {
    this.dialog("Pan drawing", `<p>Use these controls, or hold Space and drag the drawing.</p><div class="workspace-pan-pad">${this.button("↑ Up", "panCamera(0,50)")}${this.button("← Left", "panCamera(50,0)")}${this.button("Fit plot", "StudioUI.fitPlan()")}${this.button("Right →", "panCamera(-50,0)")}${this.button("Down ↓", "panCamera(0,-50)")}</div>`);
  },
  canvasSettingsDialog() {
    const labels = { showDims: "Dimensions", showOffsetsToggle: "Site offsets", showLabelsToggle: "Plot labels", showColsToggle: "Column markers", smartMergeToggle: "Smart-Merge", gridSnapToggle: "Grid snap" };
    this.dialog("Canvas settings", `<p>Drawing controls for the current workspace.</p>${Object.entries(labels).map(([id, label]) => `<label><input type="checkbox" ${CanvasControlsEngine.state[id] ? "checked" : ""} onchange="StudioUI.toggleView('${id}',this.checked)">${label}</label>`).join("")}<label>Drawing scale<input id="workspace-drawing-scale" type="number" min="0.1" max="10" step="0.1" value="${Number(document.getElementById('scaleInput').value)}" onchange="StudioUI.setDrawingScale(this.value)"></label><p class="studio-hint">Drawing scale controls model-to-canvas scaling. Use the zoom controls to magnify the view.</p><div class="studio-action-grid">${this.button("Grid & snapping", "PlanningUI.snapDialog()")}${this.button("Plot & units", "StudioUI.projectDialog()")}${this.button("3D tools", "StudioUI.viewToolsDialog()")}${this.button("Performance", "PlanningUI.performanceDialog()")}</div>`);
  },
  setDrawingScale(value) {
    const scale = Number(value);
    if (!String(value).trim() || !Number.isFinite(scale) || scale < 0.1 || scale > 10) {
      this.message("Enter a drawing scale from 0.1 to 10.", "error");
      document.getElementById("workspace-drawing-scale").value = document.getElementById("scaleInput").value;
      return;
    }
    ProjectState.commit("Changed drawing scale", () => { document.getElementById("scaleInput").value = scale; });
  },
  viewToolsDialog() {
    // These controls operate on a live scene, including night mode and camera tours.
    setWorkspaceLayout(StudioUI.mode === "4d" ? "4d" : "3d");
    this.dialog(
      "View tools",
      `<div class="studio-action-grid">${this.button("Section & inspect", "WorkbenchUI.viewDialog()")}${this.button("Advanced 3D", "document.getElementById('studio-dialog').close();setWorkspaceLayout('3d');Adv3D.toggleWorkspaceMode(true)")}${this.button("Walkthrough", "document.getElementById('studio-dialog').close();setWorkspaceLayout('3d');Widget3DEngine.startWalkthrough()")}${this.button("3D selection", "Widget3DEngine.toggleRaycaster()")}${this.button("Presentation mode", "document.getElementById('studio-dialog').close();Widget3DEngine.toggleShowcaseMode()")}${this.button("Capture camera", "captureWaypoint()")}${this.button("Play camera tour", "playCinematicTour()")}${this.button("Clear tour", "clearTour()")}${this.button("Night / day", "toggleNightMode();Engine3D.needsRender=true")}${this.button("Exploded view", "toggleExplodeView()")}${this.button("Performance mode", "Widget3DEngine.togglePerformanceMode()")}${this.button("Theme", "toggleTheme()")}${this.button("Frame plan", "resetCamera()")}${this.button("Canvas settings", "StudioUI.canvasSettingsDialog()")}</div><label>Sun position<input type="range" min="6" max="18" value="12" step="0.25" oninput="updateSunlight(Number(this.value));Engine3D.needsRender=true"></label><label>Roof / parapet<select onchange="StudioUI.parapetStyle(this.value)">${Array.from(
        document.getElementById("parapetStyleSelect").options,
      )
        .map(
          (o) =>
            `<option value="${o.value}" ${document.getElementById("parapetStyleSelect").value === o.value ? "selected" : ""}>${o.text}</option>`,
        )
        .join(
          "",
        )}</select></label>${["showDims", "showOffsetsToggle", "showLabelsToggle", "showColsToggle", "gridSnapToggle", "real3DToggle"].map((k) => `<label><input type="checkbox" ${CanvasControlsEngine.state[k] ? "checked" : ""} onchange="StudioUI.toggleView('${k}',this.checked)"> ${{ showDims: "Dimensions", showOffsetsToggle: "Site offsets", showLabelsToggle: "Labels", showColsToggle: "Column markers", gridSnapToggle: "Grid snap", real3DToggle: "Textured 3D" }[k]}</label>`).join("")}`,
    );
  },
  parapetStyle(value) {
    ProjectState.commit(
      "Changed facade style",
      () => (document.getElementById("parapetStyleSelect").value = value),
    );
  },
  toggleView(id, checked) {
    const input = document.getElementById(id);
    if (input) input.checked = checked;
    CanvasControlsEngine.toggle(id, checked);
    ProjectState.meta.view.toggles = { ...CanvasControlsEngine.state };
    ProjectState.saveState("Changed view settings");
    StorageEngine.markDirty();
  },
  aiDialog() {
    const endpoint = sessionStorage.getItem("ArchCAD_AI_Endpoint") || "",
      provider = sessionStorage.getItem("ArchCAD_AI_Provider") || "openai";
    this.dialog(
      "AI assistant",
      `<p class="studio-hint">Connect a protected AI service. GitHub Pages hosts the editor; the server route must run on a serverless host. Connection credentials stay in this tab and are excluded from project files.</p><label>Service URL<input id="ai-service-url" type="url" placeholder="https://your-service.example/api/ai-router" value="${this.escape(endpoint)}"></label><label>Service access token<input id="ai-service-token" type="password" autocomplete="off" value="${this.escape(sessionStorage.getItem("ArchCAD_AI_Token") || "")}"></label><label>Provider<select id="ai-service-provider"><option ${provider === "openai" ? "selected" : ""}>openai</option><option ${provider === "gemini" ? "selected" : ""}>gemini</option></select></label><label>Requested changes<textarea id="studio-ai-prompt" placeholder="Add a 10ft × 12ft bedroom in the north-east."></textarea></label>${this.button("Generate preview", "StudioUI.requestAI()", "primary")}<p>Or review a plan from your own AI tool:</p><label>Action JSON<textarea id="studio-ai-json" placeholder='{"actions":[{"action":"addRoom","params":{"x":20,"y":20,"w":120,"h":120,"type":"bedroom"}}]}'></textarea></label>${this.button("Preview JSON", "StudioUI.previewJSON()")}<div id="ai-plan-preview"></div>`,
    );
  },
  async requestAI() {
    const url = document.getElementById("ai-service-url").value.trim(),
      token = document.getElementById("ai-service-token").value,
      provider = document.getElementById("ai-service-provider").value;
    try {
      const parsed = new URL(url, location.href);
      if (parsed.protocol !== "https:" && parsed.hostname !== "localhost")
        throw new Error("Use an HTTPS service URL.");
      if (!token) throw new Error("Enter your service access token.");
      const prompt = document.getElementById("studio-ai-prompt").value.trim();
      if (!prompt) throw new Error("Enter the requested changes.");
      sessionStorage.setItem("ArchCAD_AI_Endpoint", url);
      sessionStorage.setItem("ArchCAD_AI_Token", token);
      sessionStorage.setItem("ArchCAD_AI_Provider", provider);
      this.message("Generating AI preview…");
      const response = await fetch(parsed.href, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider,
          promptBody: { prompt, project: ProjectState.capture() },
        }),
        signal: AbortSignal.timeout(35000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error?.message || "AI request failed.");
      const text =
        data.choices?.[0]?.message?.content ||
        data.candidates?.[0]?.content?.parts?.[0]?.text;
      this.previewPlan(
        typeof text === "string"
          ? JSON.parse(text.replace(/```(?:json)?/g, ""))
          : data,
      );
    } catch (e) {
      this.message(e.message, "error");
    }
  },
  previewJSON() {
    try {
      this.previewPlan(
        JSON.parse(document.getElementById("studio-ai-json").value),
      );
    } catch (e) {
      this.message(e.message, "error");
    }
  },
  makePlan(raw) {
    const actions = Array.isArray(raw)
      ? raw
      : raw.actions || raw.modifications || (raw.action ? [raw] : null);
    if (!Array.isArray(actions) || !actions.length || actions.length > 100)
      throw new Error("Provide between 1 and 100 actions.");
    const project = ProjectState.capture(),
      originalIds = project.elements.map((e) => e.id),
      plotW = toInches(project.plot.inW, project.unit),
      plotH = toInches(project.plot.inH, project.unit);
    for (const item of actions) {
      const p = item.params || {};
      let index =
        typeof p.id === "number"
          ? project.elements.findIndex((e) => e.id === originalIds[p.id])
          : project.elements.findIndex((e) => e.id === p.id);
      if (item.action === "addRoom") {
        if (!ASSET_CATALOGS.rooms.items.some((e) => e.type === p.type))
          throw new Error("Unsupported room type.");
        let w = Number(p.w ?? 120),
          h = Number(p.h ?? 120),
          pos = p.zone
            ? ProjectModel.zonePosition(
                p.zone,
                w,
                h,
                plotW,
                plotH,
                project.compass,
                20,
              )
            : { x: p.x, y: p.y };
        project.elements.push({
          id: ProjectModel.uid(),
          type: p.type,
          w,
          h,
          x: pos.x,
          y: pos.y,
          floor: project.currentFloor,
          locked: false,
        });
      } else {
        if (index < 0)
          throw new Error("An action refers to a missing element.");
        if (project.elements[index].locked)
          throw new Error("An action refers to a locked element.");
        if (item.action === "moveElement") {
          const el = project.elements[index],
            pos = p.zone
              ? ProjectModel.zonePosition(
                  p.zone,
                  el.w,
                  el.h,
                  plotW,
                  plotH,
                  project.compass,
                  20,
                )
              : { x: p.newX, y: p.newY };
          Object.assign(el, pos);
        } else if (item.action === "deleteElementAI") {
          const removed = project.elements[index].id;
          project.elements.splice(index, 1);
          project.fixtures = project.fixtures
            .filter((f) => f.roomId !== index)
            .map((f) => ({
              ...f,
              roomId: f.roomId > index ? f.roomId - 1 : f.roomId,
            }));
          project.constraints = project.constraints.filter(
            (r) => r.source !== removed && r.target !== removed,
          );
        } else throw new Error("Unsupported action.");
      }
    }
    const next = ProjectModel.solveConstraints(ProjectModel.normalize(project));
    for (const el of next.elements) {
      const b = Selection.bounds(el);
      if (el.x < 0 || el.y < 0 || el.x + b.w > plotW || el.y + b.h > plotH)
        throw new Error("Plan places an element outside the plot.");
    }
    for (let i = 0; i < next.elements.length; i++)
      for (let j = i + 1; j < next.elements.length; j++) {
        const a = next.elements[i],
          b = next.elements[j];
        if (
          !a.isFurniture &&
          !b.isFurniture &&
          a.floor === b.floor &&
          a.x < b.x + b.w &&
          a.x + a.w > b.x &&
          a.y < b.y + b.h &&
          a.y + a.h > b.y
        ) {
          const oldA = elements.find((e) => e.id === a.id),
            oldB = elements.find((e) => e.id === b.id);
          if (
            !oldA ||
            !oldB ||
            JSON.stringify(a) !== JSON.stringify(oldA) ||
            JSON.stringify(b) !== JSON.stringify(oldB)
          )
            throw new Error("Plan introduces overlapping rooms.");
        }
      }
    return { project: next, actions };
  },
  previewPlan(raw) {
    try {
      this.pendingAI = this.makePlan(raw);
      this.aiBase = JSON.stringify(ProjectState.capture());
      const target = document.getElementById("ai-plan-preview");
      const next = this.pendingAI.project,
        pw = toInches(next.plot.inW, next.unit),
        ph = toInches(next.plot.inH, next.unit);
      target.innerHTML = `<h3>Review ${this.pendingAI.actions.length} changes</h3><svg class="studio-ai-preview" viewBox="0 0 ${pw} ${ph}">${next.elements
        .filter((e) => e.floor === currentFloor)
        .map(
          (e) =>
            `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="rgba(56,189,248,.2)" stroke="#38bdf8" stroke-width="2"/>`,
        )
        .join(
          "",
        )}</svg><pre>${this.escape(JSON.stringify(this.pendingAI.actions, null, 2))}</pre>${this.button("Apply as one change", "StudioUI.applyAI()", "primary")}`;
    } catch (e) {
      this.pendingAI = null;
      this.message("Plan rejected: " + e.message, "error");
    }
  },
  applyAI() {
    if (!this.pendingAI) return;
    if (JSON.stringify(ProjectState.capture()) !== this.aiBase)
      return this.message(
        "The project changed. Generate a fresh preview.",
        "error",
      );
    if (
      ProjectState.commit("Applied AI plan", () =>
        ProjectState.apply(this.pendingAI.project),
      )
    ) {
      this.pendingAI = null;
      document.querySelector("#studio-dialog")?.close();
      this.message("AI changes applied. Undo restores the previous design.");
    }
  },
  keyboard(event) {
    const input = event.target?.closest?.(
        'input,textarea,select,[contenteditable="true"]',
      ),
      dialog = document.querySelector("dialog[open]");
    if (window.WorkspacePolish && !dialog && !input &&
        event.target?.closest?.('.studio-view-modes,#viewport-toolbar,#planning-navigation,.viewport-orientation,#split-resizer') &&
        ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    if (typeof StudioEnhancements !== "undefined" && !dialog && !input) {
      if (event.key === "Escape" &&
          (StudioEnhancements.walking || document.body.classList.contains("presentation-focus"))) {
        StudioEnhancements.stopWalk();
        StudioEnhancements.setFocus(false);
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (StudioEnhancements.pickMode && event.key === "Escape") {
        StudioEnhancements.pickMode = null;
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (StudioEnhancements.walking &&
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Delete", "Backspace", "r", "R"].includes(event.key))
        return;
    }
    if (RoomStudio.activeRoom) {
      if (input) return;
      event.stopImmediatePropagation();
      if (event.key === "Escape") {
        RoomStudio.close();
        event.preventDefault();
      } else if (["Delete", "Backspace", "r", "R"].includes(event.key)) {
        event.preventDefault();
        RoomStudio.handleKeydown(event);
      }
      return;
    }
    if (dialog) {
      event.stopImmediatePropagation();
      return;
    }
    if (input) return;
    if (event.target?.closest?.("#planning-dock") && ["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const modifier = event.ctrlKey || event.metaKey,
      key = event.key.toLowerCase();
    if (modifier && ["z", "y", "d", "l", "s"].includes(key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (key === "z") event.shiftKey ? redoAction() : undoAction();
      if (key === "y") redoAction();
      if (key === "d") Selection.action("Duplicate");
      if (key === "l" && selectedElIndex >= 0)
        this.edit(selectedElIndex, "locked", !elements[selectedElIndex].locked);
      if (key === "s") exportJSON();
      return;
    }
    if (event.key === "Escape") {
      event.stopImmediatePropagation();
      Selection.ids.clear();
      selectedElIndex = -1;
      renderSidebar();
      updateCanvas(false);
      return;
    }
    if (
      [
        "Delete",
        "Backspace",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "r",
        "R",
      ].includes(event.key)
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!Selection.ids.size && elements[selectedElIndex])
        Selection.pick(selectedElIndex);
      if (["Delete", "Backspace"].includes(event.key)) {
        Selection.action("Delete selection");
        return;
      }
      if (key === "r") {
        if (selectedElIndex >= 0) this.rotate(selectedElIndex);
        return;
      }
      const step = event.shiftKey ? 12 : 1;
      ProjectState.commit("Nudged selection", () => {
        const list = Selection.indices().map((i) => elements[i]);
        if (list.some((e) => e.locked)) throw new Error("Unlock first.");
        list.forEach((e) => {
          if (event.key === "ArrowUp") e.y -= step;
          if (event.key === "ArrowDown") e.y += step;
          if (event.key === "ArrowLeft") e.x -= step;
          if (event.key === "ArrowRight") e.x += step;
        });
        this.assertBounds(list);
      });
    }
  },
};
// Capture prevents background editors from receiving modal shortcuts.
document.addEventListener("keydown", (event) => StudioUI.keyboard(event), true);
const legacyUpdateCanvas = updateCanvas;
updateCanvas = function (force3D = true) {
  const unit = document.getElementById("unitSelect")?.value || "in";
  for (const id of Object.keys(ProjectModel.PLOT_DEFAULTS).filter(
    (k) => k !== "roadSide",
  )) {
    const n = ProjectModel.inches(
      document.getElementById(id)?.value ?? ProjectModel.PLOT_DEFAULTS[id],
      unit,
    );
    if (!Number.isFinite(n) || n < (["inW", "inH"].includes(id) ? 1 : 0))
      return;
  }
  legacyUpdateCanvas(force3D);
};
renderSidebar = () => StudioUI.renderInspector();
const originalSetFloor = setFloor;
window.setFloor = function (f) {
  Selection.ids.clear();
  originalSetFloor(
    Math.max(
      0,
      Math.min(Number(document.getElementById("b-floors")?.value || 1) - 1, f),
    ),
  );
};
window.setWorkspaceLayout = function (mode) {
  if (!["2d", "split", "3d", "4d"].includes(mode)) mode = "split";
  StudioUI.mode = mode;
  ProjectState.meta.view.mode = mode;
  window.is3DMode = mode !== "2d";
  document.body.dataset.workspace = mode;
  document.querySelectorAll("[data-mode]").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === mode);
    b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
  });
  if (StudioUI.ready && !ProjectState.applying) StorageEngine.markDirty();
  const pad = document.getElementById("nav-pad");
  if (pad) pad.style.display = mode === "2d" ? "none" : "flex";
  if (mode !== "2d" && !Engine3D.scene) Engine3D.init();
  Engine3D.syncVisibility?.();
  if (Engine3D.scene && mode !== "2d") {
    Engine3D.needsRender = true;
    request3DUpdate();
    const box = document.getElementById("three-container");
    if (box?.clientWidth && box?.clientHeight) {
      Engine3D.resize(box.clientWidth, box.clientHeight);
    }
  }
};
window.toggle3D = (mode) =>
  setWorkspaceLayout(mode || (StudioUI.mode === "2d" ? "3d" : "2d"));
document.addEventListener("DOMContentLoaded", () => StudioUI.init());
window.toggleAIAgent = () => StudioUI.aiDialog();
window.handleAICommand = () => StudioUI.aiDialog();

// All public placement actions use the same catalog and validation as the shell.
window.addElement = function (type) {
  const name = type || document.getElementById("elem-type").value;
  if (["door", "window"].includes(name)) return addFixture(name);
  const category = ASSET_CATALOGS.furniture.items.some((i) => i.type === name)
      ? "furniture"
      : "rooms",
    item = ASSET_CATALOGS[category].items.find((i) => i.type === name);
  if (item) StudioUI.place(item, category);
};
window.rotateElement = (i) => StudioUI.rotate(i);
window.cloneElement = (i) => {
  Selection.ids = new Set([elements[i].id]);
  Selection.action("Duplicate");
};
window.deleteFixture = (i) => {
  if (fixtures[i] && !elements[fixtures[i].roomId]?.locked)
    ProjectState.commit("Removed opening", () => fixtures.splice(i, 1));
};

const originalToggleTheme = toggleTheme;
window.toggleTheme = function () {
  originalToggleTheme();
  StorageEngine.markDirty();
  Engine3D.needsRender = true;
};

window.resetCamera = () => StudioUI.fitPlan();
