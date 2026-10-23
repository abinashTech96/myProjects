/* Canvas-first navigation and footer settings. Appearance is device-local; sunlight belongs to project history. */
window.WorkspaceLayout = {
  ready: false,
  changing: false,
  activeMode: "2d",
  sunRecords: new WeakMap(),
  read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : fallback;
    } catch {
      return fallback;
    }
  },
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  icon(name) {
    const paths = {
      appearance: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>',
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
      cube: '<path d="m12 3 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8"/>',
      build: '<path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/>',
      tools:
        '<path d="m14 6 4-4 4 4-4 4-4-4ZM3 21l11-11M3 3l6 6M3 3v5l4-1M15 15l6 6M18 14l4 4-4 4-4-4"/>',
      widgets:
        '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      settings:
        '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
      search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
      studio: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
      objects:
        '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 3v18M8 9h13M8 15h13"/>',
      pin: '<path d="m9 3 6 0-1 6 4 4H6l4-4zM12 13v9"/>',
      undo: '<path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12"/>',
      redo: '<path d="m15 5 5 5-5 5M20 10H10a6 6 0 0 0 0 12"/>',
      copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
      trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
      rotate: '<path d="M4 9a8 8 0 1 1 0 6M4 3v6h6"/>',
      pan: '<path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4"/>',
      fit: '<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6"/>',
      properties: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/>',
      restore: '<path d="M4 9a8 8 0 1 1 0 6M4 3v6h6"/>',
    };
    return `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[String(name).toLowerCase()] || paths.objects}</svg>`;
  },
  makeButton(label, icon, action) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "studio-button";
    b.setAttribute("aria-label", label);
    b.title = label;
    b.innerHTML =
      this.icon(icon) + `<span>${ProjectModel.escapeHTML(label)}</span>`;
    b.onclick = action;
    return b;
  },
  defaults() {
    return {
      grid2d: true,
      grid3d: true,
      gridIntensity: 16,
      labels: true,
      labelSize: 100,
      contrast: "balanced",
      backgrounds: {},
    };
  },
  mountRail() {
    const rail = document.createElement("aside");
    rail.id = "workspace-rail";
    rail.setAttribute("aria-label", "Workspace tools");
    const main = document.createElement("nav");
    main.id = "workspace-primary-tools";
    main.setAttribute("aria-label", "Main tools");
    const entry = document.querySelector(".planning-entry");
    main.append(entry);
    for (const b of entry.querySelectorAll("button")) {
      if (!b.getAttribute("aria-label"))
        b.setAttribute("aria-label", b.textContent.trim());
      b.title = b.getAttribute("aria-label");
      if (!b.querySelector("svg"))
        b.innerHTML =
          this.icon(
            {
              Build: "build",
              Tools: "tools",
              Widgets: "widgets",
              Settings: "settings",
              Search: "search",
              "✦": "studio",
            }[b.textContent.trim()] || "objects",
          ) + `<span>${ProjectModel.escapeHTML(b.textContent.trim())}</span>`;
    }
    const objects = this.makeButton("Objects", "objects", () =>
      StudioUI.objectsDialog(),
    );
    objects.id = "rail-objects";
    main.append(objects);
    const props = this.makeButton("Properties", "objects", () =>
      this.showProperties(),
    );
    props.id = "rail-properties";
    main.append(props);
    rail.append(main, document.getElementById("planning-dock"));
    document.body.append(rail);
    for (const [side, selector] of [
      ["catalog", ".studio-catalog"],
      ["properties", ".studio-inspector"],
    ]) {
      const heading = document.querySelector(
        selector + " .studio-panel-heading",
      );
      const pin = this.makeButton(
        "Pin " + (side === "catalog" ? "Build" : "Properties") + " panel",
        "pin",
        () => {
          this.layout.pins[side] = !this.layout.pins[side];
          this.pinState();
          this.remember();
        },
      );
      pin.classList.add("panel-pin");
      pin.dataset.panelPin = side;
      pin.innerHTML = this.icon("pin");
      heading.insertBefore(pin, heading.lastElementChild);
    }
    this.pinState();
  },
  mountNavigation() {
    const nav = document.getElementById("planning-navigation"),
      old = [...nav.querySelectorAll("button")];
    const fit = old.find((b) => b.getAttribute("onclick")?.includes("fitPlan")),
      selection = old.find((b) =>
        b.getAttribute("onclick")?.includes("centerOnSelection"),
      );
    fit.textContent = "Fit";
    fit.setAttribute("aria-label", "Fit plot");
    fit.title = "Fit the plot";
    fit.classList.add("pan-fit");
    nav.replaceChildren();
    for (const [dir, text, dx, dy] of [
      ["up", "↑", 0, 1],
      ["left", "←", 1, 0],
      ["right", "→", -1, 0],
      ["down", "↓", 0, -1],
    ]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "studio-button pan-" + dir;
      b.textContent = text;
      b.setAttribute("aria-label", "Pan " + dir);
      b.title = "Pan " + dir + " · hold to continue · Shift for larger steps";
      let held = false,
        timer,
        frame,
        previous;
      const stop = () => {
        held = false;
        clearTimeout(timer);
        cancelAnimationFrame(frame);
      };
      b.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        held = true;
        panCamera(
          dx * 24 * (e.shiftKey ? 3 : 1),
          dy * 24 * (e.shiftKey ? 3 : 1),
        );
        timer = setTimeout(() => {
          previous = performance.now();
          const tick = (now) => {
            if (!held) return;
            const delta =
              Math.min(0.05, (now - previous) / 1000) *
              160 *
              (e.shiftKey ? 3 : 1);
            previous = now;
            panCamera(dx * delta, dy * delta);
            frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
        }, 220);
      });
      ["pointerup", "pointercancel", "lostpointercapture", "blur"].forEach(
        (t) => b.addEventListener(t, stop),
      );
      b.addEventListener("click", (e) => {
        if (e.detail === 0) panCamera(dx * 24, dy * 24);
      });
      nav.append(b);
    }
    nav.append(fit);
    nav.setAttribute("aria-label", "Directional plan pan");
    const footer = document.querySelector(".studio-status"),
      controls = document.createElement("div");
    controls.id = "footer-view-controls";
    const zoom = document.createElement("div");
    zoom.className = "footer-zoom";
    zoom.setAttribute("role", "group");
    zoom.setAttribute("aria-label", "Plan zoom");
    for (const id of ["nav-zoom-out", "nav-zoom-value", "nav-zoom-in"])
      zoom.append(document.getElementById(id) || old.find((b) => b.id === id));
    selection.onclick = () =>
      ["2d", "split"].includes(StudioUI.mode)
        ? centerOnSelection()
        : ViewportUI.fit(true);
    controls.append(selection, zoom);
    footer.append(controls);
    document.getElementById("studio-zoom").hidden = true;
    const app = this.makeButton("Appearance", "appearance", () =>
      this.openFooter("appearance"),
    );
    app.id = "footer-appearance";
    const sun = this.makeButton("Sunlight", "sun", () =>
      this.openFooter("sunlight"),
    );
    sun.id = "footer-sunlight";
    for (const b of [app, sun]) {
      b.setAttribute("aria-expanded", "false");
      b.setAttribute("aria-haspopup", "dialog");
      controls.append(b);
    }
    this.mountFooterPanel("appearance");
    this.mountFooterPanel("sunlight");
  },
  mountFooterPanel(kind) {
    const panel = document.createElement("section");
    panel.id = "workspace-" + kind;
    panel.className = "footer-settings";
    panel.setAttribute("popover", "auto");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "footer-" + kind + "-title");
    panel.innerHTML = `<header><strong id="footer-${kind}-title">${kind === "appearance" ? "Appearance" : "Sunlight"}</strong><button class="studio-button" aria-label="Close ${kind}" onclick="WorkspaceLayout.closeFooter()">×</button></header><div class="footer-settings-body"></div>`;
    panel.addEventListener("beforetoggle", (event) => {
      document
        .getElementById("footer-" + kind)
        .setAttribute("aria-expanded", String(event.newState === "open"));
    });
    panel.addEventListener("toggle", (event) => {
      const open = event.newState === "open";
      if (!open) {
        if (kind === "sunlight") this.flushSun();
        if (panel.contains(document.activeElement))
          document
            .getElementById("footer-" + kind)
            .focus({ preventScroll: true });
      }
    });
    document.body.append(panel);
  },
  openFooter(kind) {
    const panel = document.getElementById("workspace-" + kind);
    if (panel.matches(":popover-open")) {
      panel.hidePopover();
      return panel;
    }
    document.querySelector("#studio-dialog[open]")?.close();
    this.closeAdvanced();
    const body = panel.querySelector(".footer-settings-body");
    body.innerHTML =
      kind === "appearance" ? this.appearanceHTML() : this.sunHTML();
    panel.showPopover();
    this.positionFooter(panel);
    this.appearanceSync();
    this.sunSync();
    body.querySelectorAll("[data-sun-custom]").forEach((input) =>
      input.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          const value = Math.max(
            0,
            Math.min(
              100,
              (this.sunPreview ?? this.sunValue()) +
                (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? 5 : 1),
            ),
          );
          input.value = value;
          this.previewSun(value);
          clearTimeout(this.sunTimer);
          this.sunTimer = setTimeout(() => this.flushSun(), 180);
        },
        { passive: false },
      ),
    );
    panel.querySelector("header button").focus({ preventScroll: true });
    return panel;
  },
  closeFooter(restore = true) {
    for (const panel of document.querySelectorAll(
      ".footer-settings:popover-open",
    )) {
      panel.hidePopover();
      if (restore)
        document
          .getElementById("footer-" + panel.id.replace("workspace-", ""))
          .focus({ preventScroll: true });
    }
  },
  positionFooter(panel) {
    const footer = document
        .querySelector(".studio-status")
        .getBoundingClientRect(),
      v = window.visualViewport;
    const width = Math.min(
        panel.id === "workspace-appearance" ? 390 : 310,
        (v?.width || innerWidth) - 16,
      ),
      available = Math.max(
        100,
        Math.min(footer.top, (v?.height || innerHeight) + (v?.offsetTop || 0)) -
          12,
      );
    Object.assign(panel.style, {
      width: width + "px",
      maxHeight: available + "px",
      left:
        Math.max(
          8,
          Math.min(
            innerWidth - width - 8,
            document
              .getElementById(
                panel.id === "workspace-appearance"
                  ? "footer-appearance"
                  : "footer-sunlight",
              )
              .getBoundingClientRect().right - width,
          ),
        ) + "px",
      top: "auto",
      bottom:
        Math.max(
          0,
          innerHeight -
            Math.min(
              footer.top,
              (v?.height || innerHeight) + (v?.offsetTop || 0),
            ),
        ) + "px",
    });
  },
  appearanceHTML() {
    const p = this.appearancePrefs,
      theme = document.body.dataset.uiTheme;
    return (
      WorkspacePolish.themePicker() +
      WorkspacePolish.densityControls() +
      `<fieldset><legend>Canvas</legend><label>Contrast<select aria-label="Canvas contrast" onchange="WorkspaceLayout.appearanceSet('contrast',this.value)"><option value="balanced" ${p.contrast === "balanced" ? "selected" : ""}>Balanced</option><option value="high" ${p.contrast === "high" ? "selected" : ""}>High contrast</option></select></label><div class="canvas-colors">${["2d", "3d", "4d"].map((mode) => `<label>${mode.toUpperCase()} background<input aria-label="${mode.toUpperCase()} background" type="color" value="${p.backgrounds[theme]?.[mode] || StudioEnhancements.canvasPalette[mode]}" oninput="WorkspaceLayout.background('${mode}',this.value)"></label>`).join("")}</div><button class="studio-button" onclick="WorkspaceLayout.resetBackgrounds()">Reset theme backgrounds</button></fieldset><fieldset><legend>Grid & labels</legend><label class="setting-switch"><span>2D grid</span><input aria-label="2D grid" type="checkbox" ${p.grid2d ? "checked" : ""} onchange="WorkspaceLayout.appearanceSet('grid2d',this.checked)"></label><label class="setting-switch"><span>3D grid</span><input aria-label="3D grid" type="checkbox" ${p.grid3d ? "checked" : ""} onchange="WorkspaceLayout.appearanceSet('grid3d',this.checked)"></label><label>Grid intensity <output id="appearance-grid-value">${p.gridIntensity}%</output><input aria-label="Grid intensity" type="range" min="0" max="50" value="${p.gridIntensity}" oninput="WorkspaceLayout.appearanceSet('gridIntensity',Number(this.value))"></label><label class="setting-switch"><span>Drawing labels</span><input aria-label="Drawing labels" type="checkbox" ${p.labels ? "checked" : ""} onchange="WorkspaceLayout.appearanceSet('labels',this.checked)"></label><label>Room label size <output id="appearance-label-value">${p.labelSize}%</output><input aria-label="Room label size" type="range" min="80" max="150" step="5" value="${p.labelSize}" oninput="WorkspaceLayout.appearanceSet('labelSize',Number(this.value))"></label></fieldset><button class="studio-button" onclick="WorkspaceLayout.restoreLayout()">Restore workspace layout</button><p class="studio-hint">Workspace appearance is saved on this device. Materials belong to the selected element.</p>`
    );
  },
  appearanceSet(key, value) {
    this.appearancePrefs[key] = value;
    this.applyAppearance();
    this.save("ArchCAD_Appearance", this.appearancePrefs);
  },
  background(mode, value) {
    if (!/^#[0-9a-f]{6}$/i.test(value)) return;
    const theme = document.body.dataset.uiTheme;
    this.appearancePrefs.backgrounds[theme] ??= {};
    this.appearancePrefs.backgrounds[theme][mode] = value;
    this.applyAppearance();
    this.save("ArchCAD_Appearance", this.appearancePrefs);
  },
  resetBackgrounds() {
    delete this.appearancePrefs.backgrounds[document.body.dataset.uiTheme];
    this.applyAppearance();
    this.save("ArchCAD_Appearance", this.appearancePrefs);
    this.appearanceSync();
  },
  applyAppearance() {
    if (!this.appearancePrefs) return;
    const p = this.appearancePrefs,
      body = document.body,
      theme = body.dataset.uiTheme;
    for (const mode of ["2d", "3d", "4d"]) {
      body.style.removeProperty("--canvas-" + mode);
      const value = p.backgrounds[theme]?.[mode];
      if (/^#[0-9a-f]{6}$/i.test(value || ""))
        body.style.setProperty("--canvas-" + mode, value);
    }
    const style = getComputedStyle(body);
    StudioEnhancements.canvasPalette = Object.fromEntries(
      ["2d", "3d", "4d"].map((m) => [
        m,
        style.getPropertyValue("--canvas-" + m).trim(),
      ]),
    );
    StudioEnhancements.applyViewportTheme();
    body.dataset.canvasContrast = p.contrast;
    body.dataset.grid2d = String(p.grid2d);
    body.style.setProperty("--plan-grid-opacity", p.gridIntensity / 25);
    document.getElementById("showLabelsToggle").checked = p.labels;
    CanvasControlsEngine.state.showLabelsToggle = p.labels;
    if (Engine3D.gridHelper) {
      Engine3D.gridHelper.visible = p.grid3d;
      for (const mat of [].concat(Engine3D.gridHelper.material))
        mat.opacity = p.gridIntensity / 100;
    }
    this.appearanceSync();
    updateCanvas(false);
  },
  appearanceSync() {
    const p = this.appearancePrefs;
    if (!p) return;
    const theme = document.body.dataset.uiTheme;
    document
      .querySelectorAll('[aria-label$="background"][type="color"]')
      .forEach((el) => {
        if (el !== document.activeElement)
          el.value =
            p.backgrounds[theme]?.[
              el.getAttribute("aria-label").slice(0, 2).toLowerCase()
            ] ||
            StudioEnhancements.canvasPalette[
              el.getAttribute("aria-label").slice(0, 2).toLowerCase()
            ];
      });
    const grid = document.getElementById("appearance-grid-value"),
      label = document.getElementById("appearance-label-value");
    if (grid) grid.textContent = p.gridIntensity + "%";
    if (label) label.textContent = p.labelSize + "%";
  },
  sunValue() {
    return ProjectState.meta.design.presentation.sunlight ?? 100;
  },
  sunHTML() {
    const value = this.sunValue();
    return `<p>Direct sunlight strength <output id="footer-sun-value">${value}%</output></p><div class="sun-presets" role="group" aria-label="Sunlight presets">${[0, 25, 50, 75, 100].map((v) => `<button class="studio-button" data-sun-preset="${v}" aria-pressed="${v === value}" onclick="WorkspaceLayout.setSun(${v})">${v}%</button>`).join("")}</div><details open><summary>Customize</summary><label>Strength<input data-sun-custom aria-label="Sunlight strength" type="range" min="0" max="100" step="1" value="${value}" oninput="WorkspaceLayout.previewSun(Number(this.value))" onchange="WorkspaceLayout.setSun(Number(this.value))"></label><label>Percentage<input data-sun-custom aria-label="Sunlight percentage" type="number" min="0" max="100" step="1" value="${value}" onchange="WorkspaceLayout.setSun(Number(this.value))"></label><small>Scroll for 1% steps; Shift + scroll for 5%. 0% turns off direct sun while ambient lighting remains.</small></details><button class="studio-button" onclick="WorkspaceLayout.closeFooter(false);DesignUI.sunDialog()">Sun position, date & time</button>`;
  },
  previewSun(value) {
    if (!Number.isFinite(value)) return;
    this.sunPreview = Math.max(0, Math.min(100, value));
    this.sunSync();
    this.applySunlight("3d");
    if (Engine3D.scene) Engine3D.needsRender = true;
  },
  setSun(value) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      StudioUI.message("Sunlight must be between 0 and 100%.", "error");
      this.sunPreview = null;
      this.sunSync();
      return;
    }
    clearTimeout(this.sunTimer);
    this.sunPreview = null;
    if (value !== this.sunValue())
      ProjectState.commit("Changed sunlight strength", () => {
        ProjectState.meta.design.presentation.sunlight = value;
      });
    this.applySunlight("3d");
    this.sunSync();
    if (Engine3D.scene) Engine3D.needsRender = true;
  },
  flushSun() {
    clearTimeout(this.sunTimer);
    if (this.sunPreview !== null && this.sunPreview !== undefined)
      this.setSun(this.sunPreview);
  },
  sunSync() {
    const value = this.sunPreview ?? this.sunValue();
    const output = document.getElementById("footer-sun-value");
    if (output) output.textContent = value + "%";
    document
      .querySelectorAll("[data-sun-preset]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(Number(b.dataset.sunPreset) === value),
        ),
      );
    document.querySelectorAll("[data-sun-custom]").forEach((el) => {
      if (el !== document.activeElement) el.value = value;
    });
  },
  applySunlight(mode) {
    const strength = (this.sunPreview ?? this.sunValue()) / 100;
    if (mode === "4d" && Engine4D.key) {
      const base =
        StudioEnhancements.sunStudy && StudioEnhancements.sunPosition
          ? 3.2 *
            Math.max(
              0,
              Math.sin(
                (StudioEnhancements.sunPosition.altitude * Math.PI) / 180,
              ),
            )
          : (Engine4D.baseSunIntensity ?? 3.2);
      if (Engine4D.key.intensity !== base * strength) {
        Engine4D.key.intensity = base * strength;
        Engine4D.renderer.shadowMap.needsUpdate = true;
      }
      return;
    }
    const light = Engine3D.sunLight;
    if (!light) return;
    let record = this.sunRecords.get(light);
    if (!record) {
      record = { base: light.intensity, last: light.intensity };
      this.sunRecords.set(light, record);
    } else if (Math.abs(light.intensity - record.last) > 1e-8)
      record.base = light.intensity;
    const next = record.base * strength;
    if (Math.abs(light.intensity - next) > 1e-8) {
      light.intensity = next;
      Engine3D.renderer.shadowMap.needsUpdate = true;
    }
    record.last = next;
  },
  pinState() {
    document.querySelectorAll("[data-panel-pin]").forEach((b) => {
      b.setAttribute(
        "aria-pressed",
        String(this.layout.pins[b.dataset.panelPin]),
      );
      b.title = this.layout.pins[b.dataset.panelPin]
        ? "Pinned panel"
        : "Temporary panel · closes on canvas click";
    });
  },
  catalogOpen() {
    return innerWidth <= 850
      ? document.body.classList.contains("catalog-open")
      : !document.body.classList.contains("catalog-collapsed");
  },
  showProperties() {
    if (!elements[selectedElIndex]) return;
    document.body.classList.remove("layout-properties-hidden");
    document.body.classList.add("inspector-open");
    this.remember();
    window.dispatchEvent(new Event("resize"));
  },
  hideCatalog() {
    document.body.classList.remove("catalog-open");
    document.body.classList.add("catalog-collapsed");
    PlanningUI.preferences.catalogCollapsed = true;
  },
  remember(mode = this.activeMode) {
    if (this.changing || !this.layout) return;
    this.layout.modes[mode] = {
      catalog: this.catalogOpen(),
      properties: !document.body.classList.contains("layout-properties-hidden"),
      split: WorkspacePolish.splitPercent || 50,
    };
    this.save("ArchCAD_Layout", this.layout);
  },
  restoreMode(mode) {
    this.changing = true;
    const saved = this.layout.modes[mode] || {
      catalog: false,
      properties: true,
      split: 50,
    };
    document.body.classList.toggle("catalog-collapsed", !saved.catalog);
    document.body.classList.toggle(
      "catalog-open",
      saved.catalog && innerWidth <= 850,
    );
    PlanningUI.preferences.catalogCollapsed = !saved.catalog;
    document.body.classList.toggle(
      "layout-properties-hidden",
      !saved.properties,
    );
    if (saved.properties && elements[selectedElIndex])
      document.body.classList.add("inspector-open");
    if (mode === "split" || StudioEnhancements.linked)
      WorkspacePolish.setSplit(saved.split || 50, false);
    this.activeMode = mode;
    this.changing = false;
    this.update();
  },
  restoreLayout() {
    this.changing = true;
    this.layout = { pins: { catalog: true, properties: true }, modes: {} };
    this.hideCatalog();
    document.body.classList.remove("layout-properties-hidden");
    WorkspacePolish.setSplit(50);
    if (StudioUI.mode !== "split" && !StudioEnhancements.linked) {
      for (const id of ["canvas-wrapper", "right-canvas-wrapper"])
        document.getElementById(id).style.removeProperty("flex");
    }
    this.changing = false;
    this.pinState();
    this.remember();
    StudioUI.message("Workspace layout restored.");
    window.dispatchEvent(new Event("resize"));
  },
  closeAdvanced() {
    const p = document.getElementById("advanced-view-panel");
    if (p) p.open = false;
  },
  advanced() {
    const p = document.getElementById("advanced-view-panel");
    if (!p || p.dataset.layoutReady) return;
    p.dataset.layoutReady = "true";
    p.open = false;
    const summary = p.querySelector("summary");
    summary.innerHTML =
      this.icon("cube") +
      '<span>4D</span><span class="advanced-close" aria-hidden="true">×</span>';
    summary.title = "4D advanced view";
    summary.setAttribute("role", "button");
    summary.setAttribute("aria-expanded", String(p.open));
    summary.setAttribute("aria-label", "4D advanced view");
    p.addEventListener("toggle", () => {
      summary.setAttribute("aria-expanded", String(p.open));
      if (p.open) {
        this.closeFooter(false);
        document.querySelector("#studio-dialog[open]")?.close();
      }
    });
  },
  usableArea() {
    const canvas = Engine3D.renderer.domElement.getBoundingClientRect();
    let left = 12,
      right = 12,
      top = 42,
      bottom = 44;
    const p = document.querySelector("#advanced-view-panel[open]");
    if (p && p.getClientRects().length) {
      const r = p.getBoundingClientRect();
      left = Math.max(left, r.right - canvas.left + 16);
    }
    for (const popup of document.querySelectorAll(
      ".footer-settings:popover-open",
    )) {
      const r = popup.getBoundingClientRect();
      if (
        r.top < canvas.bottom &&
        r.left < canvas.right &&
        r.right > canvas.left
      )
        bottom = Math.max(bottom, canvas.bottom - r.top + 12);
    }
    if (canvas.width - left - right < canvas.width * 0.35) left = 12;
    if (canvas.height - top - bottom < canvas.height * 0.35) bottom = 44;
    return {
      left,
      top,
      width: Math.max(1, canvas.width - left - right),
      height: Math.max(1, canvas.height - top - bottom),
      fullWidth: canvas.width,
      fullHeight: canvas.height,
    };
  },
  frame(camera, center, direction, radius) {
    const a = this.usableArea(),
      aspect = Math.max(0.2, camera.aspect || 1),
      fx = a.width / a.fullWidth,
      fy = a.height / a.fullHeight,
      tan = Math.tan(((camera.fov || 60) * Math.PI) / 360);
    const distance =
      (radius /
        Math.sin(Math.min(Math.atan(tan * fy), Math.atan(tan * aspect * fx)))) *
      1.14;
    let half = distance * tan;
    if (camera.isOrthographicCamera) {
      half = (radius * 1.14) / Math.min(fy, aspect * fx);
      camera.left = -half * aspect;
      camera.right = half * aspect;
      camera.top = half;
      camera.bottom = -half;
      camera.zoom = 1;
    }
    const right = new THREE.Vector3()
        .crossVectors(camera.up, direction)
        .normalize(),
      up = new THREE.Vector3().crossVectors(direction, right).normalize();
    const nx = ((a.left + a.width / 2) / a.fullWidth) * 2 - 1,
      ny = 1 - ((a.top + a.height / 2) / a.fullHeight) * 2;
    return {
      distance,
      center: center
        .clone()
        .addScaledVector(right, -nx * half * aspect)
        .addScaledVector(up, -ny * half),
    };
  },
  update() {
    if (!this.ready) return;
    const floor = document.querySelector('[aria-label="Manage floors"]');
    if (floor)
      floor.textContent =
        (PlanningUI.data.floorNames[currentFloor] || (currentFloor === 0 ? "Ground" : "Floor " + currentFloor)) + " ▾";
    const props = document.getElementById("rail-properties");
    if (props) props.hidden = !elements[selectedElIndex];
    if (["3d", "4d"].includes(StudioUI.mode) && WorkspacePolish.fitSelection)
      WorkspacePolish.fitSelection.disabled = !Selection.ids.size;
    this.advanced();
    this.sunSync();
    if (this.changing) return;
    this.remember();
  },
  init() {
    this.layout = this.read("ArchCAD_Layout", {
      pins: { catalog: true, properties: true },
      modes: {},
    });
    this.layout.pins = { catalog: true, properties: true, ...this.layout.pins };
    this.layout.modes ??= {};
    const raw = this.read("ArchCAD_Appearance", {});
    this.appearancePrefs = { ...this.defaults(), ...raw };
    this.appearancePrefs.backgrounds =
      raw.backgrounds && typeof raw.backgrounds === "object"
        ? raw.backgrounds
        : {};
    this.appearancePrefs.gridIntensity = Math.max(
      0,
      Math.min(
        50,
        Number.isFinite(Number(this.appearancePrefs.gridIntensity))
          ? Number(this.appearancePrefs.gridIntensity)
          : 16,
      ),
    );
    this.appearancePrefs.labelSize = Math.max(
      80,
      Math.min(150, Number(this.appearancePrefs.labelSize) || 100),
    );
    this.mountRail();
    this.mountNavigation();
    this.applyAppearance();
    this.activeMode = StudioUI.mode;
    const initial = this.layout.modes[StudioUI.mode];
    this.ready = true;
    if (initial) this.restoreMode(StudioUI.mode);
    else this.update();
    const previous = window.setWorkspaceLayout;
    window.setWorkspaceLayout = (mode) => {
      const switching = mode !== StudioUI.mode;
      if (switching) {
        this.remember();
        this.closeFooter(false);
        this.closeAdvanced();
      }
      const result = previous(mode);
      if (switching) this.restoreMode(StudioUI.mode);
      else this.update();
      return result;
    };
    const dialog = StudioUI.dialog;
    StudioUI.dialog = function (...args) {
      WorkspaceLayout.closeFooter(false);
      WorkspaceLayout.closeAdvanced();
      return dialog.apply(this, args);
    };
    const lighting = Workbench3D.lighting;
    Workbench3D.lighting = function (...args) {
      const record = WorkspaceLayout.sunRecords.get(Engine3D.sunLight);
      if (record) Engine3D.sunLight.intensity = record.base;
      const result = lighting.apply(this, args);
      WorkspaceLayout.sunRecords.delete(Engine3D.sunLight);
      WorkspaceLayout.applySunlight("3d");
      return result;
    };
    const collapse = PlanningUI.collapse;
    PlanningUI.collapse = function (...args) {
      const result = collapse.apply(this, args);
      if (
        args[0] === "catalog" &&
        WorkspaceLayout.catalogOpen() &&
        !WorkspaceLayout.layout.pins.catalog &&
        !WorkspaceLayout.layout.pins.properties
      )
        document.body.classList.add("layout-properties-hidden");
      WorkspaceLayout.remember();
      return result;
    };
    let selected = elements[selectedElIndex]?.id;
    AppEvents.onSelectionChange(() => {
      const id = elements[selectedElIndex]?.id;
      if (id && id !== selected)
        document.body.classList.remove("layout-properties-hidden");
      selected = id;
      this.update();
    });
    AppEvents.onStateChange(() => this.update());
    const observer = new MutationObserver(() => {
      if (this.ready && !this.changing) {
        this.remember();
        this.updateRailState();
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (event.target.closest("#blueprint,#three-container")) {
          if (!this.layout.pins.catalog) this.hideCatalog();
          if (!this.layout.pins.properties)
            document.body.classList.add("layout-properties-hidden");
          this.closeAdvanced();
          window.dispatchEvent(new Event("resize"));
        } else if (
          !event.target.closest("#advanced-view-panel") &&
          !event.target.closest(".footer-settings")
        )
          this.closeAdvanced();
      },
      { capture: true },
    );
    window.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          document.querySelector(".footer-settings:popover-open")
        ) {
          this.closeFooter();
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        if (
          event.key === "Escape" &&
          document.querySelector("#advanced-view-panel[open]") &&
          !document.querySelector("dialog[open]")
        ) {
          this.closeAdvanced();
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
    window.addEventListener("blur", () => this.flushSun());
    window.addEventListener("resize", () => {
      for (const panel of document.querySelectorAll(
        ".footer-settings:popover-open",
      ))
        this.positionFooter(panel);
      this.updateRailState();
    });
    window.visualViewport?.addEventListener("resize", () => {
      for (const p of document.querySelectorAll(
        ".footer-settings:popover-open",
      ))
        this.positionFooter(p);
    });
    this.updateRailState();
  },
  updateRailState() {
    const build = document.querySelector(".planning-entry button");
    if (build) build.setAttribute("aria-expanded", String(this.catalogOpen()));
  },
};
document.addEventListener("DOMContentLoaded", () => WorkspaceLayout.init());
