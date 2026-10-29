/* Coordinated editing and presentation tools. Project edits use normal history;
 * focus, clipping and navigation remain reversible view state. */
window.StudioEnhancements = {
  themes: ["graphite", "pearl", "ocean", "sand", "limestone", "courtyard"],
  focusRoom: null,
  linked: false,
  explosion: 0,
  labels: "none",
  adaptive: true,
  preview: null,
  openingPreview: Object.create(null),
  section: null,
  walkInput: {},
  p() {
    return ProjectState.capture();
  },
  get data() {
    return ProjectState.meta.design.presentation;
  },
  selected() {
    const e = elements[selectedElIndex];
    if (!e) throw Error("Select a room or furniture item first");
    return e;
  },
  e(value) {
    return ProjectModel.escapeHTML(String(value));
  },
  b(label, action) {
    const body = action.includes(";") ? action : "return (" + action + ");";
    return `<button class="studio-button" onclick="${this.e("StudioEnhancements.run(()=>{" + body + "})")}">${this.e(label)}</button>`;
  },
  run(fn) {
    try {
      return Promise.resolve(fn()).catch((error) =>
        StudioUI.message(error.message, "error"),
      );
    } catch (error) {
      StudioUI.message(error.message, "error");
    }
  },
  invalidate() {
    if (StudioUI.mode === "4d" && window.FourDWorkspace?.running) FourDWorkspace.scheduleUpdate();
    else if (typeof Engine4D !== "undefined") Engine4D.modelVersion = null;
    if (Engine3D.scene) Engine3D.needsRender = true;
  },
  commit(label, fn) {
    const result = ProjectState.commit(label, fn);
    this.invalidate();
    return result;
  },
  show(title, html) {
    this.cancelPreview();
    const d = StudioUI.dialog(
      title,
      `<div class="enhancement-form">${html}</div>`,
    );
    d.dataset.enhancements = "true";
    return d;
  },
  field(id, label, value, type = "text", extra = "") {
    return `<label>${this.e(label)}<input id="${id}" type="${type}" value="${this.e(value)}" ${extra}></label>`;
  },
  lengthFields(values) {
    this.lengthValues = { ...values };
    for (const [id, value] of Object.entries(values)) {
      const input = document.getElementById(id);
      if (input)
        PlanningUI.bindMeasurement(
          input,
          () => this.lengthValues[id],
          (v) => {
            this.lengthValues[id] = v;
          },
          0,
        );
    }
  },
  cancelPreview() {
    const changed = !!this.preview;
    this.preview = null;
    if (this.ceilingPreviewPose && Engine3D.camera) {
      const saved = this.ceilingPreviewPose;
      Engine3D.camera.position.copy(saved.position);
      Engine3D.controls.target.copy(saved.target);
      Engine3D.controls.update();
      this.focusRoom = saved.focus;
      this.ceilingPreviewPose = null;
    }
    if (changed) this.invalidate();
  },
  async enter() {
    if (StudioUI.mode !== "4d") setWorkspaceLayout("4d");
    if (!Engine4D.ready) throw Error("Click Render 4D to start the renderer first.");
    if (window.FourDWorkspace?.paused) throw Error("Resume 4D to use this tool.");
    this.bindCanvas();
  },
  init() {
    let theme = "graphite";
    try {
      theme = localStorage.getItem("ArchCAD_UI_Theme") || theme;
      this.adaptive =
        localStorage.getItem("ArchCAD_Adaptive_Render") !== "false";
    } catch {}
    this.theme(theme, false);
    const entry = document.querySelector(".planning-entry");
    if (entry)
      entry.insertAdjacentHTML(
        "beforeend",
        '<button class="studio-button studio-plus-entry" title="Studio+ tools" aria-label="Studio upgrades" onclick="StudioEnhancements.hub()">✦</button>',
      );
    const oldLayout = window.setWorkspaceLayout;
    window.setWorkspaceLayout = function (mode) {
      if (mode !== "4d") {
        StudioEnhancements.stopWalk();
        StudioEnhancements.setFocus(false);
        StudioEnhancements.linked = false;
        document.body.dataset.linked4d = "false";
      }
      oldLayout(mode);
      if (mode === "4d") {
        StudioEnhancements.mount();
        StudioEnhancements.bindCanvas();
      } else StudioEnhancements.clearRuntime();
    };
    const oldInspector = StudioUI.renderInspector;
    StudioUI.renderInspector = function (...args) {
      const result = oldInspector.apply(this, args),
        area = document.getElementById("studio-selection-actions");
      if (
        elements[selectedElIndex] &&
        area &&
        !document.getElementById("enhancement-selection-tools")
      )
        area.insertAdjacentHTML(
          "beforeend",
          '<div id="enhancement-selection-tools" class="enhancement-quick">' +
            StudioEnhancements.b(
              "Focus",
              "StudioEnhancements.focusSelection()",
            ) +
            StudioEnhancements.b("Finishes", "StudioEnhancements.materials()") +
            StudioEnhancements.b(
              "Exact place",
              "StudioEnhancements.placement()",
            ) +
            "</div>",
        );
      return result;
    };
    const oldFinish = StudioUI.finishDrag;
    StudioUI.finishDrag = function (...args) {
      const p = ProjectState.capture();
      for (const i of Selection.indices()) {
        const e = elements[i];
        if (e) Object.assign(e, PresentationModel.snap(p, e));
      }
      return oldFinish.apply(this, args);
    };
    const oldDrag = Workbench3D.commitDrag;
    Workbench3D.commitDrag = function (...args) {
      const e = elements.find((e) => e.id === this.target?.id);
      if (e?.isFurniture && this.controls.getMode() === "translate") {
        const point = this.modelPoint(this.proxy.position),
          bounds = PresentationModel.bounds(e),
          candidate = {
            ...e,
            x: point.x - bounds.w / 2,
            y: point.y - bounds.h / 2,
          },
          patch = PresentationModel.snap(ProjectState.capture(), candidate),
          { SCALE } = get3DEnvironmentParams();
        if (patch.x !== undefined)
          this.proxy.position.x += (patch.x - candidate.x) * SCALE;
        if (patch.y !== undefined)
          this.proxy.position.z += (patch.y - candidate.y) * SCALE;
      }
      return oldDrag.apply(this, args);
    };
    const oldEdit = Workbench3D.enableEdit;
    Workbench3D.enableEdit = function (...args) {
      StudioEnhancements.setExplosion(0);
      return oldEdit.apply(this, args);
    };
    const oldHit = Workbench3D.hit;
    Workbench3D.hit = function (event) {
      if (StudioUI.mode !== "4d" || !Engine4D.ready)
        return oldHit.call(this, event);
      const hit = StudioEnhancements.hit(event);
      if (hit && StudioEnhancements.explosion) {
        const floor = hit.object.userData.floor || 0;
        hit.point.y -=
          floor * StudioEnhancements.explosion * get3DEnvironmentParams().SCALE;
      }
      return hit;
    };
    const oldTick = ViewportUI.tick;
    ViewportUI.tick = function (now) {
      StudioEnhancements.tick(now);
      return oldTick.call(this, now);
    };
    const oldRender = Engine4D.render;
    Engine4D.render = function (...args) {
      if(!this.ready) return false;
      try {
        StudioEnhancements.beforeRender();
        const started=performance.now(),result=oldRender.apply(this,args);
        if(result) {
          const duration = performance.now()-started;
          StudioEnhancements.afterRender(duration);
          window.FourDWorkspace?.sample(duration);
        }
        return result;
      } catch(error) {this.fail(error);return false;}
    };
    const oldMaterial = Engine4D.material;
    Engine4D.material = function (original, object) {
      const material = oldMaterial.call(this, original, object);
      StudioEnhancements.decorate(material, object);
      return material;
    };
    const oldClear = Engine4D.clearModel;
    Engine4D.clearModel = function () {
      StudioEnhancements.clearOwned();
      return oldClear.call(this);
    };
    const oldSync = Engine4D.syncModel;
    Engine4D.syncModel = function (...args) {
      const previousModel = this.model;
      oldSync.apply(this, args);
      if (this.model && previousModel !== this.model) {
        StudioEnhancements.prepareModel();
        StudioEnhancements.applyPresentation();
      }
    };
    const oldSun = DesignUI.sunApply;
    DesignUI.sunApply = function (...args) {
      StudioEnhancements.sunStudy = true;
      const result = oldSun.apply(this, args);
      Engine3D.needsRender = true;
      return result;
    };
    const oldCompare = WorkbenchUI.compareOption;
    WorkbenchUI.compareOption = function (...args) {
      const result = oldCompare.apply(this, args),
        id = document.getElementById("wb-option")?.value,
        option = this.data.options.find((o) => o.id === id),
        target = document.getElementById("wb-result");
      if (option && target) {
        const before = option.project.design?.presentation?.surfaces || {},
          after = ProjectState.meta.design.presentation.surfaces,
          ids = new Set([...Object.keys(before), ...Object.keys(after)]),
          rows = [];
        for (const id of ids)
          for (const channel of ["floor", "wall", "ceiling"])
            if (
              JSON.stringify(before[id]?.[channel]) !==
              JSON.stringify(after[id]?.[channel])
            )
              rows.push(
                `<tr><td>${StudioEnhancements.e(elements.find((e) => e.id === id)?.customName || id)} · ${channel}</td><td>${StudioEnhancements.e(before[id]?.[channel]?.type || "default")}</td><td>${StudioEnhancements.e(after[id]?.[channel]?.type || "default")}</td></tr>`,
              );
        target.insertAdjacentHTML(
          "beforeend",
          `<p>${rows.length} changed surface assignments</p><table><tr><th>Surface</th><th>Saved</th><th>Current</th></tr>${rows.join("")}</table>`,
        );
      }
      return result;
    };
    window.toggleTheme = () => this.themeDialog();
    document.addEventListener(
      "close",
      (event) => {
        if (event.target.id === "studio-dialog") this.cancelPreview();
      },
      true,
    );
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          (document.body.classList.contains("presentation-focus") ||
            this.walking)
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          this.setFocus(false);
          this.stopWalk();
        }
      },
      { capture: true },
    );
    AppEvents.onSelectionChange(() => {
      this.preview = null;
      this.updateFocusReadout();
      if (Engine3D.scene) Engine3D.needsRender = true;
    });
    if (StudioUI.mode === "4d") {
      this.mount();
      this.bindCanvas();
    }
  },
  mount() {
    const panel = document.getElementById("advanced-view-panel");
    if (panel && !document.getElementById("studio-plus-tools"))
      panel.insertAdjacentHTML(
        "beforeend",
        '<div id="studio-plus-tools" class="enhancement-quick">' +
          this.b("Studio+", "StudioEnhancements.hub()") +
          this.b("Focus room", "StudioEnhancements.focusSelection()") +
          this.b("Back to full view", "StudioEnhancements.fullView()") +
          this.b("Finishes", "StudioEnhancements.materials()") +
          this.b("Clean view", "StudioEnhancements.setFocus(true)") +
          "</div>",
      );
    const viewport = document.getElementById("right-canvas-wrapper");
    if (viewport && !document.getElementById("four-d-full-view"))
      viewport.insertAdjacentHTML(
        "beforeend",
        '<button id="four-d-full-view" class="studio-button" onclick="StudioEnhancements.fullView()" title="Show all rooms and floors, clear view filters, and fit the building"><span aria-hidden="true">↶</span> Back to full view</button>',
      );
    const box = document.getElementById("three-container");
    if (box && !document.getElementById("enhancement-labels"))
      box.insertAdjacentHTML(
        "beforeend",
        '<div id="enhancement-labels"></div><div id="enhancement-fps" aria-label="Rendering performance"></div><div id="section-handles"></div>',
      );
    if (!document.getElementById("focus-exit"))
      document.body.insertAdjacentHTML(
        "beforeend",
        '<button id="focus-exit" class="studio-button" onclick="StudioEnhancements.setFocus(false)">Exit focus · Esc</button>',
      );
  },
  hub() {
    const rows = [
      ["1 · Room-focused viewing", "StudioEnhancements.focusSelection()"],
      ["2 · Surface finishes & preview", "StudioEnhancements.materials()"],
      [
        "3 · Adaptive rendering & FPS",
        "StudioEnhancements.performanceDialog()",
      ],
      [
        "4 · Interior lighting & furniture",
        "StudioEnhancements.interiorDialog()",
      ],
      ["5 · Exact furniture placement", "StudioEnhancements.placement()"],
      ["6 · Clearances & collisions", "StudioEnhancements.clearances()"],
      ["7 · Linked 2D / 4D selection", "StudioEnhancements.toggleLinked()"],
      ["8 · Design alternatives", "WorkbenchUI.optionDialog()"],
      ["9 · Door / window properties", "StudioEnhancements.openingsDialog()"],
      ["10 · Edit validation & undo", "StudioEnhancements.reliability()"],
      ["11 · Walkthrough & touch controls", "StudioEnhancements.walkDialog()"],
      ["12 · Open doors & windows", "StudioEnhancements.openingsDialog()"],
      ["13 · Exploded floor view", "StudioEnhancements.explodeDialog()"],
      ["14 · Location / date / sun", "DesignUI.sunDialog()"],
      ["15 · Draggable section box", "StudioEnhancements.sectionDialog()"],
      ["16 · Material eyedropper", "StudioEnhancements.startEyedropper()"],
      ["17 · Unobstructed focus mode", "StudioEnhancements.setFocus(true)"],
      ["18 · Measurement overlays", "StudioEnhancements.measureDialog()"],
    ];
    this.show(
      "Studio+ · Design and presentation",
      `<p>Choose a tool or personalize your workspace.</p><div class="enhancement-hub">${rows.map(([title, action]) => this.b(title, action)).join("")}</div>`,
    );
  },
  theme(value, persist = true) {
    if (!this.themes.includes(value)) value = "graphite";
    document.body.dataset.uiTheme = value;
    this.canvasBackground =
      getComputedStyle(document.body).getPropertyValue("--enh-bg").trim() || "#0f172a";
    const style = getComputedStyle(document.body);
    this.canvasPalette = Object.fromEntries(["2d", "3d", "4d"].map(mode => [mode, style.getPropertyValue("--canvas-" + mode).trim() || this.canvasBackground]));
    if (persist && ["limestone", "courtyard"].includes(value)) {
      const warm = value === "limestone";
      Engine4D.setPreset(warm ? "golden-hour" : "courtyard", false);
      ProjectState.commit("Changed realism lighting theme", () => {
        ProjectState.meta.design.presentation.studio.preset = warm ? "golden-hour" : "courtyard";
        ProjectState.meta.design.presentation.studio.environment = warm ? "golden-hour" : "courtyard";
        ProjectState.meta.design.presentation.studio.environmentIntensity = warm ? .85 : 1.1;
      });
    }
    this.applyViewportTheme();
    if (window.WorkspacePolish) WorkspacePolish.themeChanged();
    if (persist)
      try {
        localStorage.setItem("ArchCAD_UI_Theme", value);
      } catch {}
  },
  viewportBackground(mode = StudioUI.mode) {
    return this.canvasPalette?.[mode === "split" ? "3d" : mode] || this.canvasBackground || "#0f172a";
  },
  applyViewportTheme() {
    for (const engine of [window.Engine3D, window.Engine4D]) {
      if (!engine?.scene) continue;
      const color = new THREE.Color(this.viewportBackground(engine === window.Engine4D ? "4d" : "3d"));
      // The presentation compositor applies gamma to its linear render target.
      if (engine === window.Engine4D) color.convertSRGBToLinear();
      if (engine.scene.background?.isColor) engine.scene.background.copy(color);
      else engine.scene.background = color;
      if (engine.scene.fog) engine.scene.fog.color.copy(color);
    }
    if (window.Engine3D?.scene) Engine3D.needsRender = true;
  },
  themeDialog() {
    if (StudioUI.mode === "4d") return window.FourDWorkspace?.appearance();
    if (window.WorkspaceLayout?.ready) return WorkspaceLayout.openFooter("appearance");
    this.show(
      "Workspace themes",
      `<p>Distinct panels, a readable drafting canvas and contrasting model backdrops. Choose a theme to preview it immediately.</p><div class="enhancement-theme-row">${window.WorkspacePolish ? WorkspacePolish.themePicker() : this.themes.map((t) => this.b(t, `StudioEnhancements.theme('${t}')`)).join("")}</div>${window.WorkspacePolish ? WorkspacePolish.densityControls() : ""}`,
    );
  },
  close() {
    if (window.WorkspaceLayout?.ready) WorkspaceLayout.closeFooter(false);
    document.getElementById("studio-dialog")?.close();
  },
  async focusSelection() {
    await this.enter();
    if (window.FourDViews && FourDWorkspace.running) return FourDViews.focus();
    const e = this.selected();
    this.focusRoom = e.id;
    this.close();
    if (window.FourDWorkspace?.annotationPreference !== "off")
      FourDWorkspace.setAnnotations(FourDWorkspace.annotationPreference, false);
    const p = this.p(),
      { SCALE, I } = get3DEnvironmentParams(),
      base = WorkbenchModel.roomBase(p, e) * SCALE,
      height =
        (e.isFurniture
          ? e.customHeight || 36
          : WorkbenchModel.floorHeight(p, e.floor)) * SCALE,
      b = PresentationModel.bounds(e),
      center = new THREE.Vector3(
        I.x + (b.x + b.w / 2) * SCALE,
        base + height * 0.35,
        I.z + (b.y + b.h / 2) * SCALE,
      ),
      radius = Math.max(b.w, b.h) * SCALE;
    const position=center.clone().add(new THREE.Vector3(radius,radius*.9,radius));
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      Engine3D.cameraTween={start:performance.now(),duration:240,from:Engine3D.camera.position.clone(),to:position,fromTarget:Engine3D.controls.target.clone(),toTarget:center};
    } else {
      Engine3D.cameraTween=null;
      Engine3D.camera.position.copy(position);
      Engine3D.controls.target.copy(center);
      Engine3D.camera.lookAt(center);
      Engine3D.controls.update();
    }
    Engine3D.needsRender = true;
    this.updateFocusReadout();
  },
  clearRoom() {
    this.focusRoom = null;
    if(window.FourDViews && ['element','material'].includes(FourDViews.kind)) {
      FourDViews.kind='building';FourDViews.elementId=null;FourDViews.floorIndex=null;FourDViews.materialMode=false;
      FourDViews.restoreLight();FourDViews.restoreReveal();FourDViews.breadcrumbs();
    }
    Engine3D.needsRender = true;
    this.updateFocusReadout();
  },
  fullView() {
    if (!Engine4D.ready) return;
    if (window.FourDViews && FourDWorkspace.running) return FourDViews.building();
    this.cancelPreview();
    this.stopWalk();
    this.setFocus(false);
    this.clearRoom();
    this.labels = "none";
    window.FourDWorkspace?.clearSelection();
    document.getElementById("enhancement-labels")?.replaceChildren();
    Workbench3D.clearIsolation();
    this.clearSection();
    ViewportUI.inspectFloor("all");
    ViewportUI.orient("iso");
  },
  updateFocusReadout() {
    const button = document.getElementById("four-d-full-view");
    if (button) button.dataset.roomFocused = String(!!this.focusRoom);
  },
  async toggleLinked() {
    await this.enter();
    this.linked = !this.linked;
    document.body.dataset.linked4d = String(this.linked);
    this.close();
    requestAnimationFrame(() => {
      StudioUI.fitPlan();
      ViewportUI.fit(false, false);
      Engine3D.needsRender = true;
    });
  },
  setFocus(enabled) {
    document.body.classList.toggle("presentation-focus", !!enabled);
    if (enabled) {
      this.close();
      this.mount();
    }
    requestAnimationFrame(() => {
      if (Engine3D.scene) {
        const box = document.getElementById("three-container");
        Engine3D.resize(box.clientWidth, box.clientHeight);
        Engine4D.resize();
      }
    });
  },
  surface(id, channel) {
    const e = elements.find((e) => e.id === id),
      saved =
        this.preview?.id === id && this.preview.channel === channel
          ? this.preview.value
          : this.data.surfaces[id]?.[channel];
    return (
      saved || {
        type: channel === "floor" ? e?.material || "auto" : "paint",
        color: channel === "floor" ? "#ffffff" : e?.customColor || "#e5e5df",
        scale: 1,
        rotation: 0,
        roughness: channel === "floor" ? 0.65 : 0.9,
      }
    );
  },
  async materials() {
    await this.enter();
    const e = this.selected();
    this.surfaceId = e.id;
    this.surfaceChannel = this.surfaceChannel || "floor";
    this.surfaceForm();
  },
  surfaceForm() {
    const e = elements.find((e) => e.id === this.surfaceId);
    if (!e) throw Error("The selected object no longer exists");
    const s = this.surface(e.id, this.surfaceChannel);
    this.show(
      "Surface finishes",
      `<p>${this.e(e.customName || e.type)} · preview without changing the saved project</p><label>Surface<select id="enh-surface" onchange="StudioEnhancements.surfaceChannel=this.value;StudioEnhancements.surfaceForm()">${(e.isFurniture ? ["floor"] : ["floor", "wall", "ceiling"]).map((c) => `<option value="${c}" ${c === this.surfaceChannel ? "selected" : ""}>${e.isFurniture ? "Furniture" : c}</option>`).join("")}</select></label><label>Finish<select id="enh-finish" onchange="StudioEnhancements.run(()=>StudioEnhancements.previewSurface())">${PresentationModel.types.map((t) => `<option ${t === s.type ? "selected" : ""}>${t}</option>`).join("")}</select></label>${this.field("enh-color", "Surface color", s.color, "color", 'oninput="StudioEnhancements.run(()=>StudioEnhancements.previewSurface())"')}<div class="studio-field-grid">${this.field("enh-scale", "Texture scale", s.scale, "number", 'min="0.1" max="10" step="0.1" onchange="StudioEnhancements.run(()=>StudioEnhancements.previewSurface())"')}${this.field("enh-rotation", "Texture rotation °", s.rotation, "number", 'min="0" max="360" step="15" onchange="StudioEnhancements.run(()=>StudioEnhancements.previewSurface())"')}${this.field("enh-roughness", "Roughness", s.roughness, "number", 'min="0.02" max="1" step="0.05" onchange="StudioEnhancements.run(()=>StudioEnhancements.previewSurface())"')}</div><div class="enhancement-quick">${this.b("Preview", "StudioEnhancements.previewSurface()")}${this.b("Apply finish", "StudioEnhancements.applySurface()")}${this.b("Cancel preview", "StudioEnhancements.cancelPreview()")}${this.b("Eyedropper", "StudioEnhancements.startEyedropper()")}</div><p>Edits use project undo/redo. Locked objects cannot be changed.</p>`,
    );
  },
  readSurface() {
    const value = {
      type: document.getElementById("enh-finish").value,
      color: document.getElementById("enh-color").value,
      scale: Number(document.getElementById("enh-scale").value),
      rotation: Number(document.getElementById("enh-rotation").value),
      roughness: Number(document.getElementById("enh-roughness").value),
    };
    PresentationModel.validate(
      {
        ...PresentationModel.defaults(),
        surfaces: { [this.surfaceId]: { [this.surfaceChannel]: value } },
      },
      this.p(),
    );
    return value;
  },
  previewSurface() {
    const e = elements.find((e) => e.id === this.surfaceId);
    if (e?.locked) throw Error("Unlock this object first");
    const value = this.readSurface();
    if (this.surfaceChannel === "ceiling" && !this.ceilingPreviewPose) {
      this.ceilingPreviewPose = {
        position: Engine3D.camera.position.clone(),
        target: Engine3D.controls.target.clone(),
        focus: this.focusRoom,
      };
      this.focusRoom = e.id;
      const { I, SCALE } = get3DEnvironmentParams(),
        p = this.p(),
        base = WorkbenchModel.roomBase(p, e),
        height = WorkbenchModel.floorHeight(p, e.floor);
      Engine3D.cameraTween = null;
      Engine3D.camera.position.set(
        I.x + (e.x + e.w * 0.6) * SCALE,
        (base + height * 0.45) * SCALE,
        I.z + (e.y + e.h * 0.6) * SCALE,
      );
      Engine3D.controls.target.set(
        I.x + (e.x + e.w * 0.5) * SCALE,
        (base + height) * SCALE,
        I.z + (e.y + e.h * 0.5) * SCALE,
      );
      Engine3D.controls.update();
    }
    this.preview = { id: this.surfaceId, channel: this.surfaceChannel, value };
    this.invalidate();
  },
  applySurface() {
    const id = this.surfaceId,
      channel = this.surfaceChannel,
      value = this.readSurface();
    this.assign(id, channel, value);
    this.cancelPreview();
  },
  assign(id, channel, value) {
    const e = elements.find((e) => e.id === id);
    if (!e || e.locked) throw Error("Choose an unlocked object");
    return this.commit("Assigned " + channel + " finish", () => {
      if (!Object.hasOwn(this.data.surfaces, id))
        Object.defineProperty(this.data.surfaces, id, {
          value: {},
          enumerable: true,
          writable: true,
          configurable: true,
        });
      this.data.surfaces[id][channel] = structuredClone(value);
      if (channel === "floor" && !e.isFurniture)
        e.material = value.type === "paint" ? "auto" : value.type;
    });
  },
  placement() {
    const e = this.selected();
    if (!e.isFurniture)
      throw Error("Select furniture to place it relative to a room wall");
    const rooms = elements.filter((r) => !r.isFurniture && r.floor === e.floor);
    this.show(
      "Precise furniture placement",
      `<label>Reference room<select id="enh-place-room">${rooms.map((r) => `<option value="${r.id}">${this.e(r.customName || r.type)}</option>`).join("")}</select></label><label>Wall<select id="enh-place-edge">${["left", "right", "top", "bottom"].map((s) => `<option>${s}</option>`).join("")}</select></label><label>Alignment<select id="enh-place-align"><option value="center">Center</option><option value="start">Start</option><option value="end">End</option></select></label>${this.field("enh-place-gap", "Distance from inside wall · " + StudioUI.unit, "0")}${this.b("Place at exact distance", "StudioEnhancements.applyPlacement()")}<p>Uses the external wall half-thickness as an inset. For unusual wall assemblies, verify the result in plan.</p>`,
    );
    this.lengthFields({ "enh-place-gap": 0 });
  },
  applyPlacement() {
    const e = this.selected(),
      patch = PresentationModel.place(
        this.p(),
        e.id,
        document.getElementById("enh-place-room").value,
        document.getElementById("enh-place-edge").value,
        PlanningUI.parse(document.getElementById("enh-place-gap").value),
        document.getElementById("enh-place-align").value,
      );
    this.commit("Placed furniture at wall distance", () => {
      Object.assign(e, patch);
      StudioUI.assertBounds([e]);
    });
  },
  clearances() {
    const rows = PresentationModel.checks(this.p());
    this.clearanceRows = rows;
    this.show(
      "Furniture and walking clearances",
      `${this.field("enh-clear-width", "Minimum clearance · " + StudioUI.unit, ProjectModel.display(this.data.clearance, StudioUI.unit))}${this.b("Recheck", "StudioEnhancements.updateClearances()")}<p>Potential gaps and conservative door-swing envelopes; these are configurable design checks, not a code-compliance certification.</p>${rows.length ? rows.map((r, i) => this.b("Floor " + r.floor + " · " + r.text, `StudioEnhancements.inspectIssue(${i})`)).join("") : "<p>No furniture collisions or configured clearance warnings.</p>"}`,
    );
    this.lengthFields({ "enh-clear-width": this.data.clearance });
  },
  updateClearances() {
    const width = PlanningUI.parse(
      document.getElementById("enh-clear-width").value,
    );
    if (
      this.commit("Changed clearance threshold", () => {
        this.data.clearance = width;
      })
    )
      this.clearances();
  },
  inspectIssue(i) {
    const row = this.clearanceRows[i],
      index = elements.findIndex((e) => e.id === row.ids[0]);
    if (index >= 0) StudioUI.select(index);
    this.close();
    if (StudioUI.mode === "4d") this.focusSelection();
  },
  reliability() {
    this.show(
      "Reliable edits and history",
      `<p>Numeric fields retain focus, support keyboard stepping and unit-aware entry. Invalid values are rejected without changing the saved model.</p><div class="enhancement-quick">${this.b("Undo", "ProjectState.undo()")}${this.b("Redo", "ProjectState.redo()")}${this.b("Validate project", "StudioEnhancements.validateProject()")}</div><p>Saved snapshots and design alternatives remain available through Project and Pro.</p>`,
    );
  },
  validateProject() {
    ProjectModel.normalize(this.p());
    StudioUI.message("Project geometry and presentation settings are valid.");
  },
  performanceDialog() {
    this.show(
      "Rendering performance",
      `<label><input type="checkbox" ${this.adaptive ? "checked" : ""} onchange="StudioEnhancements.adaptive=this.checked;localStorage.setItem('ArchCAD_Adaptive_Render',String(this.checked));StudioEnhancements.navigation(false)">Adaptive quality while moving</label><p>Navigation reduces render resolution and pauses ambient occlusion. Full quality returns when movement stops. The FPS overlay distinguishes motion from demand-rendered idle.</p>${this.b("Open 4D", "StudioEnhancements.enter()")}`,
    );
  },
  interiorDialog() {
    this.show(
      "Interior lighting",
      `<label><input id="enh-lights" type="checkbox" ${this.data.lights.enabled ? "checked" : ""}>Room lights</label>${this.field("enh-light-intensity", "Intensity", this.data.lights.intensity, "number", 'min="0" max="3" step="0.1"')}${this.field("enh-temperature", "Color temperature · K", this.data.lights.temperature, "number", 'min="2000" max="6500" step="100"')}${this.b("Apply lighting", "StudioEnhancements.applyLights()")}${this.b("Selected furniture finish", "StudioEnhancements.materials()")}<p>Room lights are limited to the current/focused floor and the nearest 16 rooms for performance.</p>`,
    );
  },
  async applyLights() {
    const value = {
      enabled: document.getElementById("enh-lights").checked,
      intensity: Number(document.getElementById("enh-light-intensity").value),
      temperature: Number(document.getElementById("enh-temperature").value),
    };
    if (
      this.commit("Changed interior lighting", () => {
        this.data.lights = value;
      })
    )
      await this.enter();
  },
  async openingsDialog() {
    await this.enter();
    this.labels = "openings";
    const selected = elements[selectedElIndex],
      rows = fixtures
        .map((f, i) => ({ f, i }))
        .filter(({ f }) => !selected || f.roomId === selectedElIndex);
    this.show(
      "Doors and windows",
      `${rows.length ? "" : "<p>No openings on this selection. Choose a room with a door or window.</p>"}${rows.map(({ f, i }) => `<article><strong>${this.e(f.tag || f.type)} · ${ProjectModel.display(f.size, StudioUI.unit)} × ${ProjectModel.display(f.height || (f.type === "door" ? 80 : 40), StudioUI.unit)}</strong><label>Open amount<input aria-label="Open ${this.e(f.id)}" type="range" min="0" max="1" step="0.05" value="${this.data.openings[f.id] || 0}" oninput="StudioEnhancements.openingPreview['${f.id}']=Number(this.value);Engine3D.needsRender=true" onchange="StudioEnhancements.setOpening('${f.id}',Number(this.value))"></label>${this.b("Edit size / sill / offset", `PlanningUI.editOpeningDialog(${i})`)}</article>`).join("")}`,
    );
  },
  setOpening(id, value) {
    this.run(() => {
      this.commit("Changed opening position", () => {
        Object.defineProperty(this.data.openings, id, {
          value,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      });
      delete this.openingPreview[id];
    });
  },
  async explodeDialog() {
    await this.enter();
    this.show(
      "Exploded building view",
      `<label>Floor spacing · inches<input id="enh-explode" type="range" min="0" max="240" step="12" value="${this.explosion}" oninput="StudioEnhancements.setExplosion(Number(this.value));document.getElementById('enh-explode-value').textContent=this.value+' in'"></label><output id="enh-explode-value">${this.explosion} in</output>${this.b("Reset spacing", "StudioEnhancements.setExplosion(0)")}<p>Exploded spacing is visual only; measurements retain actual building coordinates. Floor labels appear with the overlay.</p>`,
    );
    this.labels = "rooms";
  },
  setExplosion(value) {
    if (!Number.isFinite(value) || value < 0 || value > 240)
      throw Error("Invalid floor spacing");
    this.explosion = value;
    this.explodedBounds = null;
    if (value > 0) {
      this.focusRoom = null;
      this.section = null;
      if (this.sectionHelper) this.sectionHelper.visible = false;
      document.getElementById("section-handles")?.replaceChildren();
      ViewportUI.advancedFloor = null;
      ViewportUI.cutaway(100);
    }
    if (Engine3D.scene) Engine3D.needsRender = true;
    requestAnimationFrame(() => {
      if (!Engine4D.ready || this.walking || Workbench3D.enabled) return;
      Engine4D.model?.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(Engine4D.model);
      if (box.isEmpty()) return;
      this.explodedBounds = box;
      const center = box.getCenter(new THREE.Vector3()),
        radius = box.getSize(new THREE.Vector3()).length() / 2,
        camera = Engine3D.camera,
        direction = camera.position
          .clone()
          .sub(Engine3D.controls.target)
          .normalize(),
        half = Math.atan(
          Math.tan(((camera.fov || 60) * Math.PI) / 360) *
            Math.min(1, camera.aspect || 1),
        ),
        distance = (radius / Math.sin(half)) * 1.15;
      camera.position.copy(center).addScaledVector(direction, distance);
      Engine3D.controls.target.copy(center);
      Engine3D.controls.update();
      Engine3D.needsRender = true;
    });
  },
  async measureDialog() {
    await this.enter();
    this.show(
      "Measurement overlays",
      `<div class="enhancement-quick">${this.b("Measure two points", "Workbench3D.startMeasure()")}${this.b("Room dimensions", 'FourDWorkspace.showDimensions(true);FourDWorkspace.setAnnotations("all");StudioEnhancements.labels="rooms";StudioEnhancements.close();Engine3D.needsRender=true')}${this.b("Opening dimensions", 'FourDWorkspace.showDimensions(true);FourDWorkspace.setAnnotations("all");StudioEnhancements.labels="openings";StudioEnhancements.close();Engine3D.needsRender=true')}${this.b("Hide overlays", 'FourDWorkspace.showDimensions(false);FourDWorkspace.setAnnotations("off");StudioEnhancements.close();Engine3D.needsRender=true')}</div><p>Room overlays include width, depth and ceiling height. Two-point measurements are saved with the project.</p>`,
    );
  },
  async startEyedropper() {
    await this.enter();
    const floor=ViewportUI.advancedFloor ?? elements[selectedElIndex]?.floor ?? currentFloor;
    if(window.FourDViews) {
      FourDViews.remember();FourDViews.cancel('input');FourDViews.kind='floor';FourDViews.floorIndex=floor;FourDViews.elementId=null;FourDViews.materialMode=false;
      FourDViews.restoreLight();FourDViews.restoreReveal();FourDViews.breadcrumbs();
    }
    this.focusRoom = null;
    ViewportUI.inspectFloor(floor);
    ViewportUI.orient('top', false);
    this.pickMode = "source";
    this.sample = null;
    this.close();
    StudioUI.message(
      "Click a floor, wall, ceiling or furniture finish to sample it.",
    );
  },
  hit(event, camera = Engine4D.camera || Engine3D.camera) {
    if (!Engine4D.ready || !Engine4D.model) return null;
    const box = Engine3D.renderer.domElement.getBoundingClientRect(),
      ray = new THREE.Raycaster();
    ray.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - box.left) / box.width) * 2 - 1,
        (-(event.clientY - box.top) / box.height) * 2 + 1,
      ),
      camera,
    );
    return (
      ray.intersectObjects([Engine4D.model,...(FourDStudio.lods||[]).filter(item=>item.proxy.visible).map(item=>item.proxy)],true).find((hit) => {
        let node = hit.object;
        while (node && node !== Engine4D.scene) {
          if (!node.visible) return false;
          node = node.parent;
        }
        return !Engine4D.renderer.clippingPlanes.some(
          (plane) => plane.distanceToPoint(hit.point) < 0,
        );
      }) || null
    );
  },
  bindCanvas() {
    if (!Engine3D.renderer || this.boundCanvas === Engine3D.renderer.domElement)
      return;
    this.boundCanvas = Engine3D.renderer.domElement;
    const canvas = this.boundCanvas;
    canvas.addEventListener("click", (event) => {
      if (
        StudioUI.mode !== "4d" ||
        this.walking ||
        Workbench3D.enabled ||
        Workbench3D.measurePoints
      )
        return;
      const hit = this.hit(event);
      if (!hit) return;
      const id =
          hit.object.userData.elementId ||
          elements[hit.object.userData.roomIndex]?.id,
        index = elements.findIndex((e) => e.id === id);
      if (index < 0) return;
      if (this.pickMode) {
        if (hit.object.userData.isOpening) {
          StudioUI.message(
            "Choose a floor, wall, ceiling or furniture surface.",
          );
          return;
        }
        this.run(() => {
          const channel = hit.object.userData.presentationSurface || "floor";
          if (this.pickMode === "source") {
            const mat = Array.isArray(hit.object.material)
              ? hit.object.material[0]
              : hit.object.material;
            const saved = this.data.surfaces[id]?.[channel];
            this.sample = {
              channel,
              value: structuredClone(
                saved || {
                  ...this.surface(id, channel),
                  type:
                    channel === "floor"
                      ? getTextureForRoom(elements[index])
                      : "paint",
                  color: "#" + mat.color.getHexString(),
                  roughness: Math.max(0.02, mat.roughness ?? 0.8),
                },
              ),
            };
            this.pickMode = "target";
            StudioUI.message(
              "Finish sampled. Click a target surface to apply it; Esc cancels.",
            );
          } else {
            this.assign(
              id,
              hit.object.userData.presentationSurface || this.sample.channel,
              this.sample.value,
            );
            this.pickMode = null;
            StudioUI.message("Sampled finish applied.");
          }
        });
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        Selection.ids.has(id)
          ? Selection.ids.delete(id)
          : Selection.ids.add(id);
        selectedElIndex = index;
        AppEvents.triggerSelectionChange();
        updateCanvas(false);
      } else StudioUI.select(index);
    });
    canvas.addEventListener("dblclick", (event) => {
      if (StudioUI.mode !== "4d" || this.walking) return;
      const hit = this.hit(event),
        index = hit?.object.userData.roomIndex;
      if (Number.isInteger(index)) {
        StudioUI.select(index);
        this.run(() => this.focusSelection());
      }
    });
    Engine3D.controls.addEventListener("start", () => {
      this.orbitDragging = true;
      this.navigation(true);
    });
    Engine3D.controls.addEventListener("end", () => {
      this.orbitDragging = false;
      this.navigation(false);
    });
    Engine3D.controls.addEventListener("change", () => {
      if (this.orbitDragging || Engine3D.cameraTween) this.navigation(true);
    });
    document.addEventListener("mousemove", () => {
      if (this.walking && Engine3D.fpsControls.isLocked) this.navigation(true);
    });
    Engine3D.fpsControls.addEventListener("unlock", () => {
      if (this.walking) this.stopWalk();
    });
    canvas.addEventListener("pointerdown", (event) => {
      if (!this.walking || Engine3D.fpsControls.isLocked) return;
      this.lookPointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      const old = this.lookPointer;
      if (!this.walking || !old || old.id !== event.pointerId) return;
      const euler = new THREE.Euler().setFromQuaternion(
        Engine3D.camera.quaternion,
        "YXZ",
      );
      euler.y -= (event.clientX - old.x) * 0.004;
      euler.x = Math.max(
        -1.4,
        Math.min(1.4, euler.x - (event.clientY - old.y) * 0.004),
      );
      Engine3D.camera.quaternion.setFromEuler(euler);
      old.x = event.clientX;
      old.y = event.clientY;
      this.navigation(true);
      Engine3D.needsRender = true;
    });
    for (const type of ["pointerup", "pointercancel"])
      canvas.addEventListener(type, () => {
        this.lookPointer = null;
        this.navigation(false);
      });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.pickMode = null;
      if (!this.walking || event.target.closest("input,select,textarea"))
        return;
      const map = {
        KeyW: "forward",
        KeyS: "backward",
        KeyA: "left",
        KeyD: "right",
        ArrowUp: "forward",
        ArrowDown: "backward",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      if (map[event.code]) {
        event.preventDefault();
        this.walkInput[map[event.code]] = true;
      }
    });
    document.addEventListener("keyup", (event) => {
      const map = {
        KeyW: "forward",
        KeyS: "backward",
        KeyA: "left",
        KeyD: "right",
        ArrowUp: "forward",
        ArrowDown: "backward",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      if (map[event.code]) this.walkInput[map[event.code]] = false;
    });
    window.addEventListener("blur", () => {
      this.walkInput = {};
      this.lookPointer = null;
    });
  },
  walkDialog() {
    this.show(
      "Walkthrough navigation",
      `${this.field("enh-eye", "Eye height · " + StudioUI.unit, ProjectModel.display(this.data.eyeHeight, StudioUI.unit))}${this.field("enh-speed", "Speed multiplier", this.data.walkSpeed, "number", 'min="0.25" max="3" step="0.25"')}${this.b("Start walkthrough", "StudioEnhancements.startWalk()")}<p>WASD / arrows or the touch direction pad moves at eye level. Drag the view to look around, or enable mouse look. Walls block movement; door openings permit passage. Esc exits.</p>`,
    );
    this.lengthFields({ "enh-eye": this.data.eyeHeight });
  },
  async startWalk() {
    const eye = PlanningUI.parse(document.getElementById("enh-eye").value),
      speed = Number(document.getElementById("enh-speed").value);
    if (
      !this.commit("Changed walkthrough settings", () => {
        this.data.eyeHeight = eye;
        this.data.walkSpeed = speed;
      })
    )
      return;
    await this.enter();
    this.close();
    ViewportUI.projection("perspective");
    this.setExplosion(0);
    const p = this.p(),
      room =
        elements[selectedElIndex] && !elements[selectedElIndex].isFurniture
          ? elements[selectedElIndex]
          : elements.find((e) => !e.isFurniture && e.floor === currentFloor);
    if (!room) throw Error("Add a room before starting the walkthrough");
    this.walkFloor = room.floor;
    Engine3D.cameraTween = null;
    const { I, SCALE } = get3DEnvironmentParams(),
      base = WorkbenchModel.roomBase(p, room);
    Engine3D.camera.position.set(
      I.x + (room.x + room.w / 2) * SCALE,
      (base + eye) * SCALE,
      I.z + (room.y + room.h / 2) * SCALE,
    );
    Engine3D.camera.lookAt(
      new THREE.Vector3(
        I.x + (room.x + room.w / 2) * SCALE,
        (base + eye) * SCALE,
        I.z + (room.y + room.h) * SCALE,
      ),
    );
    this.walking = true;
    Engine3D.isWalkthrough = true;
    Engine3D.controls.enabled = false;
    this.focusRoom = null;
    this.buildWallBoxes();
    document.getElementById("enh-walk-hud")?.remove();
    const hud = document.createElement("div");
    hud.id = "enh-walk-hud";
    hud.innerHTML =
      "<span>Walk · drag to look</span><div>" +
      ["forward", "left", "backward", "right"]
        .map(
          (dir, i) =>
            `<button class="studio-button" data-walk="${dir}" aria-label="Walk ${dir}">${["↑", "←", "↓", "→"][i]}</button>`,
        )
        .join("") +
      '</div><button class="studio-button" onclick="Engine3D.fpsControls.lock()">Mouse look</button><button class="studio-button" onclick="StudioEnhancements.stopWalk()">Exit · Esc</button>';
    document.getElementById("right-canvas-wrapper").append(hud);
    hud.querySelectorAll("[data-walk]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.walkInput[button.dataset.walk] = true;
      });
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
        button.addEventListener(type, () => {
          this.walkInput[button.dataset.walk] = false;
        });
    });
    Engine3D.needsRender = true;
  },
  stopWalk() {
    if (!this.walking) return;
    this.walking = false;
    this.walkInput = {};
    this.lookPointer = null;
    Engine3D.isWalkthrough = false;
    if (Engine3D.fpsControls?.isLocked) Engine3D.fpsControls.unlock();
    if (Engine3D.controls) {
      Engine3D.controls.enabled = true;
      const direction = new THREE.Vector3();
      Engine3D.camera.getWorldDirection(direction);
      Engine3D.controls.target
        .copy(Engine3D.camera.position)
        .addScaledVector(direction, 100);
      Engine3D.controls.update();
    }
    document.getElementById("enh-walk-hud")?.remove();
    this.navigation(false);
    Engine3D.needsRender = true;
  },
  buildWallBoxes() {
    this.wallBoxes = [];
    Engine3D.buildingGroup?.traverse((object) => {
      if (
        object.isMesh &&
        (object.userData.isWall ||
          elements[object.userData.roomIndex]?.isFurniture)
      ) {
        const box = new THREE.Box3().setFromObject(object);
        if (!object.userData.isWall)
          box.max.y +=
            Math.max(0, this.data.eyeHeight - 24) *
            get3DEnvironmentParams().SCALE;
        box.expandByVector(
          new THREE.Vector3(4, 0, 4).multiplyScalar(
            get3DEnvironmentParams().SCALE,
          ),
        );
        this.wallBoxes.push(box);
      }
    });
  },
  tick(now) {
    const dt = Math.min(0.04, (now - (this.lastTick || now)) / 1000);
    this.lastTick = now;
    if (!this.walking) return;
    const forward =
        (this.walkInput.forward ? 1 : 0) - (this.walkInput.backward ? 1 : 0),
      side = (this.walkInput.right ? 1 : 0) - (this.walkInput.left ? 1 : 0);
    if (!forward && !side) {
      if (this.walkMoving) {
        this.walkMoving = false;
        this.navigation(false);
      }
      return;
    }
    this.walkMoving = true;
    this.navigation(true);
    const direction = new THREE.Vector3();
    Engine3D.camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    const right = new THREE.Vector3().crossVectors(
      direction,
      new THREE.Vector3(0, 1, 0),
    );
    direction
      .multiplyScalar(forward)
      .addScaledVector(right, side)
      .normalize()
      .multiplyScalar(
        dt * 48 * this.data.walkSpeed * get3DEnvironmentParams().SCALE,
      );
    const next = Engine3D.camera.position.clone();
    for (const axis of ["x", "z"]) {
      next[axis] += direction[axis];
      if (this.wallBoxes.some((box) => box.containsPoint(next)))
        next[axis] -= direction[axis];
    }
    Engine3D.camera.position.copy(next);
    Engine3D.needsRender = true;
  },
  navigation(moving) {
    clearTimeout(this.navigationTimer);
    if (moving) {
      if (!this.navigating) {
        this.navigating = true;
        this.resizeQuality();
      }
      this.navigationTimer = setTimeout(() => {
        this.navigating = false;
        this.resizeQuality();
        if (Engine3D.scene) Engine3D.needsRender = true;
      }, 240);
    } else
      this.navigationTimer = setTimeout(() => {
        this.navigating = false;
        this.resizeQuality();
        if (Engine3D.scene) Engine3D.needsRender = true;
      }, 220);
  },
  resizeQuality() {
    if (!Engine4D.ready) return;
    const fast = this.adaptive && this.navigating;
    const scale = window.FourDWorkspace?.resolutionScale || 1;
    Engine4D.dynamicScale = fast ? Math.min(0.7,scale) : scale;
    Engine4D.ao.enabled = Engine4D.supportsAO && !fast && !Engine4D.aoFault && window.FourDWorkspace?.quality !== "eco";
    Engine4D.beautyPass.enabled = !Engine4D.ao.enabled;
    Engine4D.resize();
  },
  async sectionDialog() {
    await this.enter();
    this.focusRoom = null;
    const p = this.p(),
      max = {
        x: ProjectModel.inches(p.plot.inW, p.unit),
        y: ProjectModel.inches(p.plot.inH, p.unit),
        z: Math.max(
          ...Array.from(
            { length: p.floorCount },
            (_, f) =>
              WorkbenchModel.floorBase(p, f) + WorkbenchModel.floorHeight(p, f),
          ),
        ),
      };
    this.section = this.section || {
      xmin: 0,
      xmax: max.x,
      ymin: 0,
      ymax: max.y,
      zmin: 0,
      zmax: max.z,
    };
    this.show(
      "Interactive section box",
      `<p>Drag the six plane handles in the viewport, or enter cutting coordinates (${StudioUI.unit}). Values change the view only.</p><div class="studio-field-grid">${Object.keys(
        this.section,
      )
        .map((key) =>
          this.field(
            "enh-section-" + key,
            key,
            ProjectModel.display(this.section[key], StudioUI.unit),
            "text",
            'onchange="StudioEnhancements.run(()=>StudioEnhancements.sectionFromFields())"',
          ),
        )
        .join(
          "",
        )}</div>${this.b("Apply box", "StudioEnhancements.sectionFromFields()")}${this.b("Clear section box", "StudioEnhancements.clearSection()")}`,
    );
    this.lengthFields(
      Object.fromEntries(
        Object.entries(this.section).map(([k, v]) => ["enh-section-" + k, v]),
      ),
    );
    this.applySection();
  },
  sectionFromFields() {
    const next = Object.fromEntries(
      Object.keys(this.section).map((key) => [
        key,
        PlanningUI.parse(document.getElementById("enh-section-" + key).value),
      ]),
    );
    for (const axis of ["x", "y", "z"]) {
      ProjectModel.finite(next[axis + "min"], "Section minimum", 0, 100000);
      ProjectModel.finite(next[axis + "max"], "Section maximum", 0, 100000);
      if (next[axis + "min"] >= next[axis + "max"])
        throw Error("Section minimum must be less than maximum");
    }
    this.section = next;
    this.applySection();
  },
  applySection() {
    if (!this.section) return;
    Workbench3D.section = { ...this.section };
    Workbench3D.applySection();
    if (!this.sectionHelper) {
      this.sectionHelper = new THREE.Box3Helper(new THREE.Box3(), 0x0ea5e9);
      Engine4D.scene.add(this.sectionHelper);
    }
    const s = this.section;
    this.sectionHelper.box.set(
      Workbench3D.coordinates({ x: s.xmin, y: s.ymin, z: s.zmin }),
      Workbench3D.coordinates({ x: s.xmax, y: s.ymax, z: s.zmax }),
    );
    this.sectionHelper.visible = true;
    this.renderSectionHandles();
    Engine3D.needsRender = true;
  },
  clearSection(close = true) {
    this.section = null;
    this.sectionDragging = false;
    Workbench3D.clearSection();
    if (this.sectionHelper) this.sectionHelper.visible = false;
    document.getElementById("section-handles")?.replaceChildren();
    if(close)this.close();
  },
  renderSectionHandles() {
    const layer = document.getElementById("section-handles");
    if (!layer || !this.section) return;
    const s = this.section;
    layer.innerHTML = Object.keys(s)
      .map(
        (key) =>
          `<button data-plane="${key}" aria-label="Drag section ${key}">${key}</button>`,
      )
      .join("");
    layer.querySelectorAll("button").forEach((button) =>
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.close();
        button.setPointerCapture(event.pointerId);
        this.sectionDragging = true;
        const key = button.dataset.plane,
          axis = key[0],
          start = this.section[key],
          screen = this.planeScreen(key),
          next = this.planeScreen(key, 100),
          vx = next.x - screen.x,
          vy = next.y - screen.y,
          length = Math.hypot(vx, vy),
          x = event.clientX,
          y = event.clientY;
        const move = (pointer) => {
          let delta =
            length > 1
              ? (((pointer.clientX - x) * vx + (pointer.clientY - y) * vy) /
                  (length * length)) *
                100
              : -(pointer.clientY - y) * 0.5;
          const min = key.endsWith("min") ? 0 : this.section[axis + "min"] + 1,
            max = key.endsWith("min") ? this.section[axis + "max"] - 1 : 100000;
          this.section[key] = Math.max(min, Math.min(max, start + delta));
          Workbench3D.section = { ...this.section };
          Workbench3D.applySection();
          const box = this.sectionHelper.box;
          box.set(
            Workbench3D.coordinates({
              x: this.section.xmin,
              y: this.section.ymin,
              z: this.section.zmin,
            }),
            Workbench3D.coordinates({
              x: this.section.xmax,
              y: this.section.ymax,
              z: this.section.zmax,
            }),
          );
          Engine3D.needsRender = true;
        };
        const stop = () => {
          this.sectionDragging = false;
          Engine3D.needsRender = true;
          button.removeEventListener("pointermove", move);
          button.removeEventListener("pointerup", stop);
          button.removeEventListener("pointercancel", stop);
        };
        button.addEventListener("pointermove", move);
        button.addEventListener("pointerup", stop);
        button.addEventListener("pointercancel", stop);
      }),
    );
  },
  planeScreen(key, delta = 0) {
    const s = this.section,
      point = {
        x: (s.xmin + s.xmax) / 2,
        y: (s.ymin + s.ymax) / 2,
        z: (s.zmin + s.zmax) / 2,
      };
    point[key[0]] = s[key] + delta;
    const v = Workbench3D.coordinates(point).project(
        Engine4D.camera || Engine3D.camera,
      ),
      box = Engine3D.renderer.domElement.getBoundingClientRect();
    return { x: ((v.x + 1) * box.width) / 2, y: ((1 - v.y) * box.height) / 2 };
  },
  decorate(material, object) {
    const data = object.userData || {},
      room =
        elements[data.roomIndex] ||
        elements.find((e) => e.id === data.elementId);
    if (!room || data.isOpening) return;
    const channel =
      data.presentationSurface ||
      (data.isWall
        ? "wall"
        : room.isFurniture || material.userData.ownedMaps
          ? "floor"
          : null);
    if (!channel) return;
    material.userData.presentationSurface = channel;
    const saved =
      this.preview?.id === room.id && this.preview.channel === channel
        ? this.preview.value
        : this.data.surfaces[room.id]?.[channel];
    if (!saved || material.transmission > 0) return;
    if (material.userData.ownedMaps) {
      material.map?.dispose();
      material.bumpMap?.dispose();
    }
    material.map = null;
    material.bumpMap = null;
    material.userData.ownedMaps = false;
    if (saved.type !== "paint") {
      const type =
          saved.type === "auto"
            ? channel === "floor"
              ? getTextureForRoom(room)
              : "concrete"
            : saved.type,
        finish = Engine4D.finish(type),
        { SCALE } = get3DEnvironmentParams();
      material.map = finish.map.clone();
      material.bumpMap = finish.bump.clone();
      for (const map of [material.map, material.bumpMap]) {
        map.repeat.set(
          Math.max(0.1, (room.w * SCALE) / 120) * saved.scale,
          Math.max(
            0.1,
            ((channel === "wall"
              ? ProjectState.meta.wallSettings.height
              : room.h) *
              SCALE) /
              120,
          ) * saved.scale,
        );
        map.center.set(0.5, 0.5);
        map.rotation = (saved.rotation * Math.PI) / 180;
        map.needsUpdate = true;
      }
      material.bumpScale = 0.12;
      material.userData.ownedMaps = true;
    }
    material.color.set(saved.color);
    material.roughness = saved.roughness;
    material.opacity = 1;
    material.transparent = false;
    material.needsUpdate = true;
  },
  clearOwned() {
    if (this.lightGroup) Engine4D.scene?.remove(this.lightGroup);
    this.lightGroup = null;
    for (const geometry of this.ownedGeometries || []) geometry.dispose();
    this.ownedGeometries = [];
    this.ceilings = [];
    this.leaves = [];
  },
  patchOwned(removed, roomIds) {
    this.leaves=(this.leaves||[]).filter(l=>{if(!removed.has(l.source))return true;l.fixed?.parent?.remove(l.fixed);return false;});
    this.ceilings=(this.ceilings||[]).filter(c=>{if(!roomIds.has(c.userData.elementId))return true;c.parent?.remove(c);return false;});
    this.ownedGeometries=this.ceilings.map(c=>c.geometry);
  },
  prepareModel(options = {}) {
    this.modelProject = this.p();
    if (!options.partial) {this.ownedGeometries = [];this.ceilings = [];this.leaves = [];}
    for (const [source, copy] of options.pairs || Engine4D.pairs) {
      const mat = Array.isArray(copy.material)
        ? copy.material[0]
        : copy.material;
      if (mat?.userData.presentationSurface)
        copy.userData.presentationSurface = mat.userData.presentationSurface;
      const f = fixtures.find((f) => f.id === source.userData.openingId);
      if (!f || !copy.isMesh) continue;
      const { SCALE } = get3DEnvironmentParams(),
        bounds = source.geometry.boundingBox;
      if (!bounds) source.geometry.computeBoundingBox();
      const box = source.geometry.boundingBox;
      if (
        box.max.x - box.min.x < f.size * SCALE * 0.65 ||
        box.max.y - box.min.y <
          (f.height || (f.type === "door" ? 80 : 40)) * SCALE * 0.6
      )
        continue;
      this.leaves.push({
        source,
        copy,
        f,
        width: box.max.x - box.min.x,
        axis: new THREE.Vector3(1,0,0).applyQuaternion(source.quaternion),
      });
      if (f.type === "window") {
        const fixed = new THREE.Mesh(copy.geometry, copy.material);
        fixed.position.copy(source.position);
        fixed.quaternion.copy(source.quaternion);
        fixed.scale.copy(source.scale);
        fixed.scale.x *= 0.5;
        fixed.position.addScaledVector(new THREE.Vector3(1,0,0).applyQuaternion(source.quaternion), -(box.max.x-box.min.x)*source.scale.x*0.25);
        fixed.userData = { ...copy.userData };
        copy.parent.add(fixed);
        this.leaves[this.leaves.length-1].fixed = fixed;
      }
    }
    const { I, SCALE } = get3DEnvironmentParams(),
      p = this.modelProject;
    for (const room of elements.filter(
      (e) => !e.isFurniture && !["staircase", "balcony"].includes(e.type) && (!options.roomIds || options.roomIds.has(e.id)),
    )) {
      let geometry;
      if (room.points) {
        const shape = new THREE.Shape(
          room.points.map((q) => new THREE.Vector2(q.x * SCALE, -q.y * SCALE)),
        );
        geometry = new THREE.ShapeGeometry(shape);
        geometry.rotateX(-Math.PI / 2);
      } else
        geometry = new THREE.BoxGeometry(
          room.w * SCALE,
          0.5 * SCALE,
          room.h * SCALE,
        );
      this.ownedGeometries.push(geometry);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xe5e5df,
        roughness: 0.9,
        side: THREE.DoubleSide,
      });
      Engine4D.materials.add(material);
      const data = {
        elementId: room.id,
        roomIndex: elements.indexOf(room),
        floor: room.floor,
        presentationSurface: "ceiling",
      };
      this.decorate(material, { userData: data });
      FourDStudio.materialDecorate(material, { userData: data, geometry });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = data;
      mesh.position.set(
        I.x + (room.x + (room.points ? 0 : room.w / 2)) * SCALE,
        (WorkbenchModel.roomBase(p, room) +
          WorkbenchModel.floorHeight(p, room.floor) -
          1) *
          SCALE,
        I.z + (room.y + (room.points ? 0 : room.h / 2)) * SCALE,
      );
      mesh.receiveShadow = true;
      mesh.visible = false;
      Engine4D.model.add(mesh);
      this.ceilings.push(mesh);
    }
    if (!this.lightGroup) {
      this.lightGroup = new THREE.Group();
      for (let i = 0; i < 16; i++) this.lightGroup.add(new THREE.PointLight(0xffdfbd, 2000, 300, 2));
      Engine4D.scene.add(this.lightGroup);
    }
    this.buildWallBoxes();
  },
  clipping(base) {
    const bounds=window.FourDViews?.boundsPlanes()||[];
    if (window.FourDViews?.transitionPlanes) return [...FourDViews.transitionPlanes,...bounds];
    if (window.FourDViews?.materialMode) return bounds;
    if (!this.focusRoom || !this.modelProject) return [...base,...bounds];
    const room = elements.find((e) => e.id === this.focusRoom);
    if (!room || room.isFurniture) return [...base,...bounds];
    const { SCALE } = get3DEnvironmentParams(),
      low = WorkbenchModel.roomBase(this.modelProject, room) * SCALE,
      height =
        WorkbenchModel.floorHeight(this.modelProject, room.floor) * SCALE,
      ceilingPreview = this.preview?.channel === "ceiling";
    return [
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -low + 2 * SCALE),
      ...(ceilingPreview
        ? []
        : [new THREE.Plane(new THREE.Vector3(0, -1, 0), low + height * 0.58)]),
      ...bounds,
    ];
  },
  beforeRender() {
    if (!Engine4D.ready) return;
    this.mount();
  },
  applyPresentation() {
    const p=this.modelProject;
    if(!p)return;
    const sceneElements=p.elements;
    const focused = sceneElements.find((e) => e.id === this.focusRoom),
      selection = Selection.ids.size
        ? Selection.ids
        : new Set(
            elements[selectedElIndex] ? [elements[selectedElIndex].id] : [],
          ),
      { SCALE } = get3DEnvironmentParams();
    for (const [source, copy] of Engine4D.pairs) {
      const data = source.userData || {},
        room =
          sceneElements[data.roomIndex] ||
          sceneElements.find((e) => e.id === data.elementId);
      if (
        Number.isInteger(data.floor) &&
        (source.parent === Engine3D.buildingGroup ||
          source.parent?.userData.workbench || data.presentationGenerated)
      )
        copy.position.y = source.position.y + data.floor * this.explosion * SCALE;
      if (focused) {
        const owners = data.roomIndices || [data.roomIndex],
          belongs =
            room?.id === focused.id ||
            owners.some((i) => sceneElements[i]?.id === focused.id) ||
            (room?.isFurniture &&
              room.floor === focused.floor &&
              PresentationModel.overlap(
                PresentationModel.bounds(room),
                PresentationModel.bounds(focused),
              ));
        if (
          (copy.isMesh || copy.isLine || copy.isPoints) &&
          (data.isSlab ||
            data.isRoof ||
            data.isCeiling ||
            (!belongs && !data.workbench))
        )
          copy.visible = false;
      }
      for (const material of copy.material
        ? Array.isArray(copy.material)
          ? copy.material
          : [copy.material]
        : []) {
        if (material.emissive) {
          const selected =
            selection.has(data.elementId) || selection.has(room?.id);
          material.userData.originalEmissive ??= material.emissive.getHex();
          material.userData.originalEmissiveIntensity ??= material.emissiveIntensity;
          const tint = selected && !this.data.studio.cleanSelection;
          material.emissive.setHex(tint ? 0x07313e : material.userData.originalEmissive);
          material.emissiveIntensity = tint ? 0.35 : material.userData.originalEmissiveIntensity;
        }
      }
    }
    for (const leaf of this.leaves || []) {
      const fraction =
          this.openingPreview[leaf.f.id] ?? this.data.openings[leaf.f.id] ?? 0,
        copy = leaf.copy,
        source = leaf.source;
      if (leaf.f.type === "door") {
        const sign = leaf.f.handing === "right" ? -1 : 1,
          angle =
            (sign * (leaf.f.swing === "out" ? -1 : 1) * fraction * Math.PI) / 2;
        if (leaf.f.style === "sliding") {
          copy.position.copy(source.position).addScaledVector(leaf.axis, sign*fraction*leaf.width*source.scale.x*0.8);
        } else {
          const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),
            offset = new THREE.Vector3(sign*leaf.width*source.scale.x/2,0,0),
            shift = offset.clone().applyQuaternion(rotation).sub(offset).applyQuaternion(source.quaternion);
          copy.quaternion.copy(source.quaternion).multiply(rotation);
          copy.position.copy(source.position).add(shift);
        }
      } else {
        copy.scale.x = source.scale.x * 0.5;
        copy.position.copy(source.position).addScaledVector(leaf.axis,source.scale.x*(leaf.width*0.25-fraction*leaf.width*0.5));
      }
    }
    for (const mesh of this.ceilings || []) {
      const room = sceneElements.find(e=>e.id===mesh.userData.elementId);
      if(!room){mesh.visible=false;continue;}
      mesh.visible = !!(
        this.walking ||
        (this.preview?.channel === "ceiling" && this.preview.id === room.id) ||
        (window.FourDViews?.materialMode === "ceiling" && FourDViews.elementId === room.id)
      );
      mesh.position.y =
        (WorkbenchModel.roomBase(p, room) +
          WorkbenchModel.floorHeight(p, room.floor) -
          1 +
          room.floor * this.explosion) *
        SCALE;
    }
    const active = sceneElements
        .filter(
          (e) => !e.isFurniture && e.floor === (focused?.floor ?? currentFloor),
        )
        .slice(0, 16),
      warm = this.data.lights.temperature,
      color = new THREE.Color().setRGB(
        1,
        Math.min(1, 0.55 + (warm - 2000) / 6000),
        Math.min(1, 0.28 + (warm - 2000) / 5000),
      );
    if (this.lightGroup) this.lightGroup.visible = !!(this.data.lights.enabled && (this.walking || focused || this.preview?.channel === "ceiling"));
    const lightLimit = window.FourDWorkspace?.quality === "eco" ? 1 : window.FourDWorkspace?.quality === "high" ? 8 : 4;
    this.lightGroup?.children.forEach((light, i) => {
      const room = active[i];
      light.visible = !!(room && this.data.lights.enabled && i < lightLimit);
      if (!room) return;
      light.color.copy(color);
      light.intensity = 3000 * this.data.lights.intensity;
      light.distance = Math.max(room.w, room.h) * SCALE * 2;
      light.position.set(
        get3DEnvironmentParams().I.x + (room.x + room.w / 2) * SCALE,
        (WorkbenchModel.roomBase(p, room) +
          WorkbenchModel.floorHeight(p, room.floor) -
          8 +
          room.floor * this.explosion) *
          SCALE,
        get3DEnvironmentParams().I.z + (room.y + room.h / 2) * SCALE,
      );
    });
    if (this.sunStudy) {
      const site = ProjectState.meta.design.site,
        key = JSON.stringify(site);
      if (key !== this.sunKey) {
        this.sunKey = key;
        this.sunPosition = DesignModel.sun(site);
      }
      const factor = Math.max(
        0,
        Math.sin((this.sunPosition.altitude * Math.PI) / 180),
      );
      Engine4D.key.intensity = 3.2 * factor;
      Engine4D.fill.intensity = factor > 0 ? 1.15 : 0.12;
    }
    if (window.WorkspaceLayout?.ready) WorkspaceLayout.applySunlight("4d");
  },
  afterRender(ms) {
    const now = performance.now(),
      delta = now - (this.lastFrame || now);
    this.lastFrame = now;
    if (delta > 0 && delta < 250)
      this.fps = this.fps
        ? this.fps * 0.8 + (1000 / delta) * 0.2
        : 1000 / delta;
    const meter = document.getElementById("enhancement-fps");
    if (meter) {
      meter.textContent = `${this.navigating || this.walking ? Math.round(this.fps || 0) + " FPS" : "Idle"} · ${Math.round(ms)} ms · ${this.adaptive && this.navigating ? "Navigation" : "Detail"}`;
    }
    const labelKey =
      this.labels +
      "|" +
      this.focusRoom +
      "|" +
      currentFloor +
      "|" +
      StudioUI.unit +
      "|" +
      this.explosion +
      "|" +
      selectedElIndex;
    if (
      now - (this.lastLabels || 0) > 90 ||
      labelKey !== this.lastLabelKey ||
      this.lastLabelModel !== Engine4D.modelVersion
    ) {
      this.lastLabels = now;
      this.lastLabelKey = labelKey;
      this.lastLabelModel = Engine4D.modelVersion;
      this.renderLabels();
    }
    if (this.section && window.WorkspacePolish) WorkspacePolish.positionSectionHandles();
    else if (this.section) {
      for (const button of document.querySelectorAll(
        "#section-handles [data-plane]",
      )) {
        const point = this.planeScreen(button.dataset.plane);
        button.style.left = point.x + "px";
        button.style.top = point.y + "px";
      }
    }
  },
  renderLabels() {
    const layer = document.getElementById("enhancement-labels");
    if (!layer || !Engine4D.camera) return;
    const box = Engine3D.renderer.domElement.getBoundingClientRect(),
      p = this.modelProject;
    if (!p) return;
    const items = [];
    if (this.labels === "none" || window.FourDWorkspace?.annotations === "off") {
      layer.replaceChildren();
      return;
    }
    if (this.labels === "rooms")
      for (const [i, e] of elements.entries()) {
        if (
          e.isFurniture ||
          (window.FourDWorkspace?.annotations === "selected" && i !== selectedElIndex) ||
          (ViewportUI.advancedFloor != null && e.floor !== ViewportUI.advancedFloor && !this.explosion) ||
          (this.focusRoom && e.id !== this.focusRoom)
        )
          continue;
        const height = WorkbenchModel.floorHeight(p, e.floor);
        items.push({
          index: i,
          text: `F${e.floor} · ${(e.customName || e.type).slice(0,60)}${window.FourDWorkspace?.dimensions ? " · "+ProjectModel.display(e.w,StudioUI.unit)+" × "+ProjectModel.display(e.h,StudioUI.unit)+" · H "+ProjectModel.display(height,StudioUI.unit) : ""}`,
          point: {
            x: e.x + e.w / 2,
            y: e.y + e.h / 2,
            z: WorkbenchModel.roomBase(p, e) + 20 + e.floor * this.explosion,
          },
        });
      }
    if (this.labels === "openings")
      for (const [i, f] of fixtures.entries()) {
        const e = elements[f.roomId];
        if (
          !e ||
          e.floor !== currentFloor ||
          (this.focusRoom && e.id !== this.focusRoom)
        )
          continue;
        const segment = PlanningModel.openingSegment(p, f);
        items.push({
          opening: i,
          text: `${f.type} · ${ProjectModel.display(f.size, StudioUI.unit)} × ${ProjectModel.display(f.height || (f.type === "door" ? 80 : 40), StudioUI.unit)} · sill ${ProjectModel.display(f.sill || 0, StudioUI.unit)} · offset ${ProjectModel.display(f.offset, StudioUI.unit)}`,
          point: {
            x: (segment.a.x + segment.b.x) / 2,
            y: (segment.a.y + segment.b.y) / 2,
            z:
              WorkbenchModel.roomBase(p, e) +
              (f.sill || 0) +
              30 +
              e.floor * this.explosion,
          },
        });
      }
    const camera = Engine4D.camera, placed = [],
      obstacles = ["#fourd-toolbar", "#fourd-inspection:not([hidden])", ".viewport-orientation", "#studio-dialog[open]"]
        .flatMap(selector => [...document.querySelectorAll(selector)])
        .filter(n => n.getClientRects().length && getComputedStyle(n).display !== "none")
        .map(n => n.getBoundingClientRect()),
      overlaps = (a,b) => a.left < b.right+5 && a.right > b.left-5 && a.top < b.bottom+5 && a.bottom > b.top-5;
    items.sort((a,b) => Number(b.index === selectedElIndex)-Number(a.index === selectedElIndex));
    const ray = new THREE.Raycaster(), meshes = [];
    Engine4D.model?.traverse(n => {
      if (!n.isMesh || n.material?.transparent) return;
      let parent=n;
      while (parent && parent.visible) parent=parent.parent;
      if (!parent) meshes.push(n);
    });
    let grouped = 0;
    layer.innerHTML = items
      .slice(0, 16)
      .map((item) => {
        const world = Workbench3D.coordinates(item.point),
          v = world.clone().project(Engine4D.camera);
        if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95)
          return "";
        ray.setFromCamera(new THREE.Vector2(v.x,v.y),camera);
        const distance = ray.ray.origin.distanceTo(world), hit = ray.intersectObjects(meshes,false)
          .find(h => !Engine4D.renderer.clippingPlanes.some(plane=>plane.distanceToPoint(h.point)<0));
        if (hit && hit.distance < distance-2*get3DEnvironmentParams().SCALE) return "";
        const width = Math.min(window.FourDWorkspace?.dimensions ? 220 : 180, Math.max(70, item.text.length*6+16)), height=Math.max(26,Math.ceil(item.text.length*6/(width-12))*13+10);
        let rect;
        for (const offset of [0,-32,32,-64,64]) {
          const x=Math.max(width/2+8,Math.min(box.width-width/2-8,(v.x+1)*box.width/2)),
            y=Math.max(76,Math.min(box.height-52,(1-v.y)*box.height/2+offset)),
            candidate={left:box.left+x-width/2,right:box.left+x+width/2,top:box.top+y-height/2,bottom:box.top+y+height/2,x,y};
          if (!obstacles.some(b=>overlaps(candidate,b)) && !placed.some(b=>overlaps(candidate,b))) {rect=candidate;break;}
        }
        if (!rect) {grouped++;return "";}
        placed.push(rect);
        const action =
          item.opening !== undefined
            ? `PlanningUI.editOpeningDialog(${item.opening})`
            : `StudioUI.select(${item.index})`;
        return `<button class="enhancement-dimension" data-label-id="${item.index ?? item.opening}" style="left:${rect.x}px;top:${rect.y}px;width:${width}px" onclick="${action}">${this.e(item.text)}</button>`;
      })
      .join("");
    if (grouped) layer.insertAdjacentHTML("beforeend", `<span class="fourd-label-summary">${grouped} crowded labels hidden · inspect an element for details</span>`);
  },
  clearRuntime() {
    this.ceilingPreviewPose = null;
    this.explodedBounds = null;
    this.openingPreview = {};
    this.focusRoom = null;
    this.explosion = 0;
    this.preview = null;
    this.pickMode = null;
    this.section = null;
    if (this.sectionHelper) {
      Engine4D.scene?.remove(this.sectionHelper);
      this.sectionHelper.geometry.dispose();
      this.sectionHelper.material.dispose();
      this.sectionHelper = null;
    }
    document.getElementById("section-handles")?.replaceChildren();
    document.getElementById("enhancement-labels")?.replaceChildren();
    this.navigating = false;
  },
};
document.addEventListener("DOMContentLoaded", () => StudioEnhancements.init());
