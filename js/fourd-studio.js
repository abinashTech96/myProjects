/* One compact 4D workspace. Viewing filters never enter architectural geometry. */
window.FourDStudio = {
  tab: "render",
  revision: 0,
  visibility: new Map(),
  phaseValue: null,
  playing: false,
  comparison: null,
  get settings() {
    return ProjectState.meta.design.presentation.studio;
  },
  run(fn) {
    try {
      return Promise.resolve(fn()).catch((e) =>
        StudioUI.message(e.message, "error"),
      );
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  invalidate() {
    this.revision++;
    FourDRender.cancelPhoto();
    FourDRender.probeDirty = true;
    if (Engine4D.renderer) Engine4D.renderer.shadowMap.needsUpdate = true;
    if (Engine3D.scene) Engine3D.needsRender = true;
  },
  change(key, value) {
    return ProjectState.commit("4D " + key, () => {
      this.settings[key] = value;
    });
  },
  async open(tab = this.tab) {
    await StudioEnhancements.enter();
    if (!Engine4D.ready) return;
    this.tab = tab;
    const advanced = document.getElementById("advanced-view-panel");
    if (advanced) advanced.open = false;
    const s = this.settings,
      e = ProjectModel.escapeHTML,
      button = (label, action) =>
        StudioUI.button(label, "FourDStudio.run(()=>{" + action + "})");
    const field = (label, key, min, max, step = 1) =>
      `<label>${label}<input aria-label="${label}" type="number" min="${min}" max="${max}" step="${step}" value="${s[key]}" onchange="FourDStudio.change('${key}',Number(this.value))"></label>`;
    const check = (label, key) =>
      `<label class="fourd-check"><input type="checkbox" ${s[key] ? "checked" : ""} onchange="FourDStudio.change('${key}',this.checked)">${label}</label>`;
    const rooms = elements.filter((el) => !el.isFurniture),
      selected = elements[selectedElIndex] || rooms[0] || elements[0];
    const tabs = [
      ["render", "Environment"],
      ["materials", "Materials"],
      ["camera", "Photo"],
      ["compare", "Compare"],
      ["checks", "Clearances"],
      ["stages", "Stages"],
    ];
    let html = "";
    if (tab === "render")
      html = `<label>Lighting environment<select aria-label="4D environment" onchange="FourDStudio.change('environment',this.value)">${[
        ["studio", "HDR studio"],
        ["overcast", "Overcast sky"],
        ["sunset", "Sunset"],
        ["night", "Night"],
        ["golden-hour", "Golden hour · warm realism"],
        ["courtyard", "Courtyard · soft daylight"],
        ["custom", "Imported HDR"],
      ]
        .map(
          ([v, n]) =>
            `<option value="${v}" ${s.environment === v ? "selected" : ""}>${n}</option>`,
        )
        .join(
          "",
        )}</select></label><div class="studio-field-grid">${field("Environment intensity", "environmentIntensity", 0, 3, 0.1)}${field("Environment rotation", "environmentRotation", 0, 360, 5)}</div>${check("Show environment sky", "showSky")}<label>Import Radiance HDR<input aria-label="HDR environment file" type="file" accept=".hdr" onchange="FourDStudio.run(()=>FourDStudio.importHDR(this.files[0]))"></label><p class="studio-hint">Embedded HDR: max 4 MB, 2048 × 1024. Built-in environments use linear high-dynamic-range lighting.</p><hr><label>Surface reflections<select aria-label="4D reflections" onchange="FourDStudio.change('reflections',this.value)"><option value="environment" ${s.reflections === "environment" ? "selected" : ""}>Environment · efficient</option><option value="local" ${s.reflections === "local" ? "selected" : ""}>Local room probe · 128px</option></select></label>${button("Refresh local reflections", "FourDRender.probeDirty=true;FourDStudio.invalidate()")}<h4>Wall mirrors</h4>${this.roomSelect("mirror-room", rooms, selected?.id)}<label>Wall<select id="mirror-edge" aria-label="Mirror wall"><option>top</option><option>bottom</option><option>left</option><option>right</option></select></label><div class="studio-field-grid"><label>Width (in)<input id="mirror-width" aria-label="Mirror width" type="number" min="6" max="240" value="36"></label><label>Height (in)<input id="mirror-height" aria-label="Mirror height" type="number" min="6" max="120" value="60"></label></div>${button("Add wall mirror", "FourDStudio.addMirror()")}${s.mirrors.map((m, i) => `<div class="fourd-row"><span>${e(elements.find((el) => el.id === m.room)?.customName || elements.find((el) => el.id === m.room)?.type || "Room")} · ${e(m.edge)}</span>${button("Remove", `FourDStudio.removeMirror(${i})`)}</div>`).join("")}<p class="studio-hint">Up to four planar mirrors. Local probes refresh after navigation; they approximate surrounding reflections for glazing and metals.</p><hr><label>Scene detail<select aria-label="4D detail level" onchange="FourDStudio.change('lod',this.value)">${[
        ["full", "Full detail"],
        ["auto", "Automatic distance detail"],
        ["economy", "Economy distance detail"],
      ]
        .map(
          ([v, n]) =>
            `<option value="${v}" ${s.lod === v ? "selected" : ""}>${n}</option>`,
        )
        .join(
          "",
        )}</select></label>${check("Clean selection outlines", "cleanSelection")}<p id="fourd-lod-status" role="status"></p>`;
    if (tab === "materials")
      html = `${this.roomSelect("fourd-material-object", elements, selected?.id)}<label>Apply to<select id="fourd-material-channel" aria-label="4D material surface"><option value="floor">Floor / furniture</option><option value="wall">Walls</option><option value="ceiling">Ceiling</option></select></label><div class="fourd-material-grid">${Object.entries(
        FourDModel.materials,
      )
        .map(
          ([id, m]) =>
            `<button class="studio-button fourd-material" data-material="${id}" onclick="FourDStudio.run(()=>FourDStudio.assignMaterial('${id}'))"><span style="background:${m.color}" aria-hidden="true"></span>${e(m.label)}</button>`,
        )
        .join(
          "",
        )}</div><p class="studio-hint">Materials include color, roughness and normal detail where applicable. Assignments are saved with the project and undoable. Use Finishes for tint, texture scale and rotation.</p>${button("Detailed finishes", "StudioEnhancements.materials()")}<hr><p class="studio-hint">A mirror material provides an environment reflection. Add a wall mirror under Environment for a true planar reflection.</p>`;
    if (tab === "camera")
      html = `<label>Camera lens<select aria-label="4D camera lens" onchange="FourDStudio.change('lens',Number(this.value))">${[
        [0, "Match current view"],
        [24, "24 mm · wide"],
        [35, "35 mm · architectural"],
        [50, "50 mm · standard"],
        [85, "85 mm · detail"],
      ]
        .map(
          ([v, n]) =>
            `<option value="${v}" ${s.lens === v ? "selected" : ""}>${n}</option>`,
        )
        .join(
          "",
        )}</select></label>${check("Keep vertical lines straight", "verticals")}<label>Camera height above floor (in)<input aria-label="4D camera height" id="fourd-camera-height" type="number" min="12" max="300" value="64"></label>${button("Set camera height", "FourDStudio.cameraHeight()")}<hr>${check("Refine stills after navigation", "progressive")}<label>Refinement samples<select aria-label="4D refinement samples" onchange="FourDStudio.change('samples',Number(this.value))">${[4, 8, 16, 32, 64].map((n) => `<option ${s.samples === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>${check("Depth of field in refined photos", "dof")}<div class="studio-field-grid">${field("Focus distance (in)", "focusDistance", 1, 100000, 1)}${field("Aperture f-number", "fstop", 1, 22, 0.5)}</div><div class="studio-action-grid">${button("Refine current view", "FourDRender.requestPhoto()")}${button("Capture PNG", "Engine4D.capture()")}</div><label class="fourd-check"><input type="checkbox" ${FourDWorkspace.includeAnnotations ? "checked" : ""} onchange="FourDWorkspace.includeAnnotations=this.checked">Include inspection overlays in PNG</label><p id="fourd-photo-status" role="status">Interactive view · raster rendering</p><p class="studio-hint">Still refinement averages jittered raster samples. It improves antialiasing and supports photographic depth of field; it is not path tracing. Navigation cancels refinement immediately.</p>`;
    if (tab === "compare") {
      const options = WorkbenchModel.data(ProjectState.capture()).options;
      html = `<p>Compare the current building with a saved alternative. Both views share the camera, environment and lens. The right preview is read-only.</p><label>Saved alternative<select id="fourd-compare-option" aria-label="4D comparison alternative">${options.map((o) => `<option value="${e(o.id)}">${e(o.name)}</option>`).join("")}</select></label><div class="studio-action-grid">${button("Start comparison", "FourDStudio.startComparison()")}${button("Close comparison", "FourDStudio.stopComparison()")}</div>${button("Save current alternative", "WorkbenchUI.optionDialog()")}<p id="fourd-compare-status" role="status">${this.comparison ? "Comparing · " + e(this.comparison.name) : "Choose an alternative, then start comparison."}</p><p class="studio-hint">Rooms, openings, furniture, levels, slabs, roofs, structural members, fitouts and service routes are rebuilt from the saved snapshot. Uncached imported models, ramps and shafts use dimensioned proxies reported below.</p>`;
    }
    if (tab === "checks") {
      this.findings = PresentationModel.checks(ProjectState.capture());
      html = `<label class="fourd-check"><input aria-label="Show 4D clearances" type="checkbox" ${this.clearances ? "checked" : ""} onchange="FourDStudio.clearances=this.checked;FourDStudio.rebuildClearances();FourDStudio.invalidate()">Show clearance overlays</label><p>${this.findings.length} findings · ${ProjectState.meta.design.presentation.clearance} in requested clearance</p><div class="fourd-findings">${
        this.findings
          .slice(0, 200)
          .map((r, i) =>
            button(
              `Floor ${r.floor} · ${e(r.text)}`,
              `FourDStudio.focusFinding(${i})`,
            ),
          )
          .join("") || "<p>No conflicts detected by the geometric checks.</p>"
      }</div><p class="studio-hint">Amber indicates a potential narrow passage; red indicates a collision or door-swing conflict. These are review aids, not building-code certification.</p>`;
    }
    if (tab === "stages")
      html = `<p>Assign selected rooms or furniture to construction stages, then play their reveal sequence. Geometry and saved element visibility remain unchanged.</p><label>Stage names (one per line)<textarea id="fourd-stage-names" aria-label="Construction stage names">${s.phases.map(e).join("\n")}</textarea></label>${button("Save stage names", "FourDStudio.stageNames()")}<label>Assign selected elements<select id="fourd-stage-select" aria-label="Assign construction stage">${s.phases.map((n, i) => `<option value="${i}">${i + 1} · ${e(n)}</option>`).join("")}</select></label><div class="studio-action-grid">${button("Assign selection", "FourDStudio.assignStage()")}${button("Use automatic stages", "FourDStudio.resetStages()")}</div><label>Construction progress<input aria-label="4D construction progress" type="range" min="0" max="${s.phases.length - 1}" step=".01" value="${this.phaseValue ?? s.phases.length - 1}" oninput="FourDStudio.setPhase(Number(this.value))"></label><p id="fourd-stage-status" role="status">${this.phaseLabel()}</p>${field("Seconds per stage", "phaseSeconds", 0.25, 10, 0.25)}<div class="studio-action-grid">${button(this.playing ? "Pause" : "Play", "FourDStudio.playStages()")}${button("Show completed building", "FourDStudio.finishStages()")}</div>`;
    WorkspacePanels.external = false;
    WorkspacePanels.intent = "4D Studio";
    try {
      StudioUI.dialog(
        "4D Studio",
        `<nav class="fourd-tabs" aria-label="4D Studio sections">${tabs.map(([id, label]) => `<button class="studio-button ${tab === id ? "active" : ""}" aria-pressed="${tab === id}" onclick="FourDStudio.run(()=>FourDStudio.open('${id}'))">${label}</button>`).join("")}</nav><div class="fourd-form">${html}</div>`,
      );
    } finally {
      WorkspacePanels.intent = null;
    }
  },
  roomSelect(id, list, selected) {
    return `<label>${id === "fourd-material-object" ? "Object" : "Room"}<select id="${id}" aria-label="${id === "fourd-material-object" ? "4D material object" : "Mirror room"}">${list.map((el) => `<option value="${ProjectModel.escapeHTML(el.id)}" ${el.id === selected ? "selected" : ""}>${ProjectModel.escapeHTML(el.customName || el.type)} · Floor ${el.floor}</option>`).join("")}</select></label>`;
  },
  async importHDR(file) {
    if (!file) return;
    if (!/\.hdr$/i.test(file.name) || file.size > 4 * 1024 * 1024)
      throw Error("Choose a Radiance .hdr file under 4 MB");
    const bytes = new Uint8Array(await file.arrayBuffer()),
      header = new TextDecoder().decode(
        bytes.subarray(0, Math.min(2048, bytes.length)),
      );
    FourDModel.hdrSize(header);
    new THREE.RGBELoader().setDataType(THREE.HalfFloatType).parse(bytes.buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 16384)
      binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
    const data = "data:application/octet-stream;base64," + btoa(binary);
    ProjectState.commit("Imported 4D HDR", () => {
      this.settings.hdr = data;
      this.settings.environment = "custom";
    });
    this.open("render");
  },
  addMirror() {
    const room = document.getElementById("mirror-room").value;
    if (!room) throw Error("Add a rectangular room first");
    const config = {
      room,
      edge: document.getElementById("mirror-edge").value,
      width: Number(document.getElementById("mirror-width").value),
      height: Number(document.getElementById("mirror-height").value),
      sill: 30,
      offset: 0.5,
    };
    if (
      ProjectState.commit("Added presentation mirror", () =>
        this.settings.mirrors.push(config),
      )
    )
      this.open("render");
  },
  removeMirror(index) {
    ProjectState.commit("Removed presentation mirror", () =>
      this.settings.mirrors.splice(index, 1),
    );
    this.open("render");
  },
  assignMaterial(type) {
    const id = document.getElementById("fourd-material-object").value,
      channel = document.getElementById("fourd-material-channel").value,
      room = elements.find((e) => e.id === id),
      spec = FourDModel.materials[type];
    if (!room) throw Error("Choose an object");
    if (room.locked) throw Error("Unlock the object first");
    if (room.isFurniture && channel !== "floor")
      throw Error("Choose Floor / furniture for furniture");
    ProjectState.commit("Assigned 4D " + spec.label, () => {
      const surfaces = ProjectState.meta.design.presentation.surfaces;
      surfaces[id] = surfaces[id] || {};
      surfaces[id][channel] = {
        type,
        color: spec.color,
        roughness: spec.roughness,
        scale: 1,
        rotation: 0,
      };
    });
    StudioUI.message(
      spec.label + " applied to " + (room.customName || room.type),
    );
  },
  cameraHeight() {
    const height = Number(document.getElementById("fourd-camera-height").value);
    ProjectModel.finite(height, "Camera height", 12, 300);
    Engine3D.camera.position.y =
      (WorkbenchModel.floorBase(ProjectState.capture(), currentFloor) +
        height) *
      get3DEnvironmentParams().SCALE;
    Engine3D.camera.lookAt(Engine3D.controls.target);
    Engine3D.controls.update();
    this.invalidate();
  },
  phaseLabel() {
    return this.phaseValue === null
      ? "Completed building"
      : this.settings.phases[
          Math.min(this.settings.phases.length - 1, Math.floor(this.phaseValue))
        ];
  },
  setPhase(value) {
    this.playing = false;
    cancelAnimationFrame(this.stageRAF);
    this.phaseValue = value;
    this.invalidate();
    this.phaseStatus();
  },
  phaseStatus() {
    const node = document.getElementById("fourd-stage-status");
    if (node) node.textContent = this.phaseLabel();
  },
  stageNames() {
    const phases = document
      .getElementById("fourd-stage-names")
      .value.split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (
      ProjectState.commit("Renamed construction stages", () => {
        this.settings.phases = phases;
        for (const id of Object.keys(this.settings.assignments))
          this.settings.assignments[id] = Math.min(
            phases.length - 1,
            this.settings.assignments[id],
          );
      })
    ) {
      this.phaseValue = null;
      this.open("stages");
    }
  },
  assignStage() {
    const ids = [...Selection.ids];
    if (!ids.length) throw Error("Select rooms or furniture first");
    const phase = Number(document.getElementById("fourd-stage-select").value);
    ProjectState.commit("Assigned construction stage", () =>
      ids.forEach((id) => (this.settings.assignments[id] = phase)),
    );
    this.phaseStatus();
  },
  resetStages() {
    ProjectState.commit(
      "Reset construction assignments",
      () => (this.settings.assignments = {}),
    );
  },
  playStages() {
    if (this.playing) {
      this.playing = false;
      cancelAnimationFrame(this.stageRAF);
      return this.open("stages");
    }
    this.stopComparison();
    FourDRender.cancelPhoto();
    this.playing = true;
    const start = performance.now(),
      initial =
        this.phaseValue === null ||
        this.phaseValue >= this.settings.phases.length - 1
          ? 0
          : this.phaseValue;
    this.phaseValue = initial;
    const tick = (now) => {
      if (!this.playing || !Engine4D.ready) return;
      this.phaseValue = Math.min(
        this.settings.phases.length - 1,
        initial + (now - start) / (this.settings.phaseSeconds * 1000),
      );
      if (this.phaseValue >= this.settings.phases.length - 1)
        this.playing = false;
      Engine4D.renderer.shadowMap.needsUpdate = true;
      Engine3D.needsRender = true;
      this.phaseStatus();
      if (this.playing) this.stageRAF = requestAnimationFrame(tick);
    };
    this.stageRAF = requestAnimationFrame(tick);
    this.open("stages");
  },
  finishStages() {
    this.playing = false;
    cancelAnimationFrame(this.stageRAF);
    this.phaseValue = null;
    this.invalidate();
    this.phaseStatus();
  },
  restoreFilters() {
    for (const [node, visible] of this.visibility) node.visible = visible;
    this.visibility.clear();
  },
  hide(node) {
    if (!this.visibility.has(node)) this.visibility.set(node, node.visible);
    node.visible = false;
  },
  disposeGroup(group) {
    if (!group) return;
    group.parent?.remove(group);
    const g = new Set(),
      m = new Set();
    group.traverse((n) => {
      if (n.geometry) g.add(n.geometry);
      for (const material of n.material
        ? Array.isArray(n.material)
          ? n.material
          : [n.material]
        : [])
        m.add(material);
    });
    g.forEach((v) => v.dispose());
    m.forEach((v) => v.dispose());
  },
  clearScene() {
    this.restoreFilters();
    this.disposeGroup(this.outlines);
    this.outlines = null;
    this.outlineKey = null;
    this.disposeGroup(this.clearanceGroup);
    this.clearanceGroup = null;
    for (const entry of this.lods || []) this.disposeGroup(entry.proxy);
    this.lods = [];
    this.lodVersion = null;
    FourDRender.cancelPhoto();
    FourDRender.clearMirrors();
    FourDRender.probeDirty = true;
  },
  materialDecorate(material, object) {
    const data = object.userData || {},
      room =
        elements[data.roomIndex] ||
        elements.find((e) => e.id === data.elementId),
      channel = material.userData.presentationSurface;
    const preview = StudioEnhancements.preview;
    const saved =
      room && channel
        ? preview?.id === room.id && preview.channel === channel
          ? preview.value
          : StudioEnhancements.data.surfaces[room.id]?.[channel]
        : null;
    if (!saved || !FourDModel.materials[saved.type]) return;
    // Stage compilation has not cloned borrowed editor textures yet.
    const originals = new Set(
      (object.material
        ? Array.isArray(object.material)
          ? object.material
          : [object.material]
        : []
      )
        .flatMap((m) => Scene4D.textureSlots.map((key) => m[key]))
        .filter(Boolean),
    );
    for (const key of Scene4D.textureSlots)
      if (originals.has(material[key])) material[key] = material[key].clone();
    if (object.geometry && !object.geometry.boundingBox)
      object.geometry.computeBoundingBox();
    const box = object.geometry?.boundingBox;
    const { SCALE: S } = get3DEnvironmentParams();
    const w = box
        ? (channel === "wall" ? Math.hypot(box.max.x-box.min.x,box.max.z-box.min.z) : Math.max(box.max.x-box.min.x,box.max.z-box.min.z)) / S
        : room.w,
      h =
        channel === "wall"
          ? (box
              ? box.max.y - box.min.y
              : ProjectState.meta.wallSettings.height * S) / S
          : room.h;
    FourDTextures.apply(
      material,
      saved.type,
      { w, h },
      saved.scale,
      saved.rotation,
      saved.color,
    );
    material.roughness = saved.roughness;
  },
  applyPhase() {
    if (this.phaseValue === null) return;
    const project = StudioEnhancements.modelProject || ProjectState.capture(),
      settings = this.settings;
    const visit = (node, inherited = {}) => {
      const data = { ...inherited, ...node.userData };
      if (
        (node.isMesh || data.elementId || data.isSlab || data.isRoof) &&
        FourDModel.stageFor(data, project, settings) > this.phaseValue
      )
        this.hide(node);
      for (const child of node.children) visit(child, data);
    };
    visit(Engine4D.model);
    for (const mirror of FourDRender.mirrors || [])
      if (this.phaseValue < Math.min(3, settings.phases.length - 1))
        this.hide(mirror);
  },
  setupLOD() {
    if (this.lodVersion === Engine4D.modelVersion) return;
    for (const item of this.lods || []) this.disposeGroup(item.proxy);
    this.lods = [];
    this.lodVersion = Engine4D.modelVersion;
    this.parapetDetails = Engine4D.pairs.filter(([,copy])=>copy.isMesh&&copy.userData.parapetDetail&&!copy.isInstancedMesh).map(([,copy])=>copy);
    for (const [source, copy] of Engine4D.pairs) {
      const room =
        elements[source.userData.roomIndex] ||
        elements.find((e) => e.id === source.userData.elementId);
      if (!room?.isFurniture || source.parent !== Engine3D.buildingGroup)
        continue;
      let triangles = 0;
      copy.traverse((n) => {
        if (n.isMesh)
          triangles +=
            (n.geometry.index?.count ||
              n.geometry.attributes.position?.count ||
              0) / 3;
      });
      if (triangles < 250) continue;
      const box = new THREE.Box3().setFromObject(copy);
      if (box.isEmpty()) continue;
      const center = box.getCenter(new THREE.Vector3()),
        size = box.getSize(new THREE.Vector3()),
        color =
          copy.getObjectByProperty("isMesh", true)?.material?.color ||
          new THREE.Color(0xa7afb2);
      const proxy = new THREE.Mesh(
        new THREE.BoxGeometry(size.x, size.y, size.z),
        new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
      );
      proxy.position.copy(center);
      proxy.userData = { fourDAuxiliary: true };
      proxy.visible = false;
      Engine4D.scene.add(proxy);
      this.lods.push({
        copy,
        proxy,
        box,
        center,
        radius: size.length() / 2,
        initialSize: size.clone(),
        low: false,
      });
    }
  },
  applyLOD(camera) {
    this.setupLOD();
    let simplified = 0;
    const h = Engine4D.renderer.domElement.clientHeight || 600;
    for (const item of this.lods) {
      item.copy.updateMatrixWorld(true);
      item.box.setFromObject(item.copy);
      item.box.getCenter(item.center);
      const size = item.box.getSize(new THREE.Vector3());
      item.radius = size.length() / 2;
      item.proxy.scale
        .copy(size)
        .divide(
          item.proxy.geometry.boundingBox?.getSize(new THREE.Vector3()) ||
            item.initialSize,
        );
      const pixels = camera.isPerspectiveCamera
          ? FourDModel.projectedPixels(
              item.radius,
              camera.position.distanceTo(item.center),
              h,
              camera.fov,
            )
          : Infinity,
        threshold = this.settings.lod === "economy" ? 36 : 18;
      item.low =
        this.settings.lod !== "full" &&
        pixels < (item.low ? threshold * 1.25 : threshold);
      const visible =
        item.copy.visible &&
        (() => {
          let n = item.copy.parent;
          while (n && n !== Engine4D.scene) {
            if (!n.visible) return false;
            n = n.parent;
          }
          return true;
        })();
      item.proxy.visible = !!(item.low && visible);
      if (item.low && visible) {
        item.proxy.position.copy(item.center);
        this.hide(item.copy);
        simplified++;
      }
    }
    if(this.settings.lod!=="full")for(const detail of this.parapetDetails||[]) {
      if(!detail.geometry.boundingSphere)detail.geometry.computeBoundingSphere();
      const center=detail.getWorldPosition(new THREE.Vector3()),size=detail.getWorldScale(new THREE.Vector3());
      const pixels=camera.isPerspectiveCamera?FourDModel.projectedPixels(detail.geometry.boundingSphere.radius*Math.max(size.x,size.y,size.z),camera.position.distanceTo(center),h,camera.fov):Infinity;
      if(pixels<(this.settings.lod==="economy"?12:6)){this.hide(detail);simplified++;}
    }
    this.lodCount = simplified;
    const status = document.getElementById("fourd-lod-status");
    if (status)
      status.textContent =
        simplified +
        " distant objects simplified · originals retained for close views";
  },
  updateOutlines() {
    const ids = [...Selection.ids],
      key = Engine4D.modelVersion + "|" + ids.join("|");
    if (key !== this.outlineKey) {
      this.disposeGroup(this.outlines);
      this.outlineKey = key;
      this.outlines = new THREE.Group();
      this.outlinePairs = [];
      this.outlines.userData.fourDAuxiliary = true;
      let vertices = 0;
      const material = new THREE.LineBasicMaterial({
        color: 0x62d8f5,
        transparent: true,
        opacity: 0.9,
        depthTest: true,
      });
      for (const [source, copy] of Engine4D.pairs) {
        const data = source.userData,
          room = elements[data.roomIndex];
        if (
          !copy.isMesh ||
          !ids.some((id) => id === data.elementId || id === room?.id)
        )
          continue;
        const count = copy.geometry.attributes.position?.count || 0;
        if (count + vertices > 100000) continue;
        vertices += count;
        const line = new THREE.LineSegments(
          new THREE.EdgesGeometry(copy.geometry, 30),
          material,
        );
        line.matrixAutoUpdate = false;
        this.outlines.add(line);
        this.outlinePairs.push([copy, line]);
      }
      if (!this.outlines.children.length) material.dispose();
      Engine4D.scene.add(this.outlines);
    }
    Engine4D.model.updateMatrixWorld(true);
    this.outlines.visible = this.settings.cleanSelection && !FourDRender.active && !window.FourDWorkspace?.exporting;
    for (const [mesh, line] of this.outlinePairs) {
      line.matrix.copy(mesh.matrixWorld);
      let n = mesh,
        visible = true;
      while (n && n !== Engine4D.scene) {
        visible = visible && n.visible;
        n = n.parent;
      }
      line.visible = visible;
    }
  },
  rebuildClearances() {
    this.disposeGroup(this.clearanceGroup);
    this.clearanceGroup = null;
    if (!this.clearances || !Engine4D.ready) return;
    this.findings = PresentationModel.checks(ProjectState.capture());
    this.clearanceGroup = new THREE.Group();
    this.clearanceGroup.userData.fourDAuxiliary = true;
    const { SCALE: S, I } = get3DEnvironmentParams(),
      p = ProjectState.capture();
    for (const finding of this.findings.slice(0, 200))
      for (const id of finding.ids) {
        const item = elements.find((e) => e.id === id);
        if (!item) continue;
        const b = PresentationModel.bounds(item),
          base = WorkbenchModel.roomBase(p, item),
          height = item.isFurniture ? item.customHeight || 36 : 2;
        const box = new THREE.Box3(
          new THREE.Vector3(I.x + b.x * S, (base + 0.5) * S, I.z + b.y * S),
          new THREE.Vector3(
            I.x + (b.x + b.w) * S,
            (base + height) * S,
            I.z + (b.y + b.h) * S,
          ),
        );
        const helper = new THREE.Box3Helper(
          box,
          finding.text.toLowerCase().includes("narrow") ? 0xf4b942 : 0xff596c,
        );
        helper.userData = { fourDAuxiliary: true, finding };
        this.clearanceGroup.add(helper);
      }
    Engine4D.scene.add(this.clearanceGroup);
  },
  focusFinding(index) {
    const finding = this.findings[index];
    if (!finding) return;
    Selection.ids = new Set(finding.ids);
    selectedElIndex = elements.findIndex((el) => el.id === finding.ids[0]);
    renderSidebar();
    ViewportUI.fit(true, false);
    this.invalidate();
  },
  async startComparison() {
    const id = document.getElementById("fourd-compare-option")?.value,
      option = WorkbenchModel.data(ProjectState.capture()).options.find(
        (o) => o.id === id,
      );
    if (!option) throw Error("Save a named alternative first");
    this.stopComparison();
    this.finishStages();
    FourDRender.cancelPhoto();
    const stage = FourDScene.build(option.project),
      scene = new THREE.Scene();
    scene.add(stage.model);
    const key = Engine4D.key.clone(),
      target = Engine4D.key.target.clone();
    key.target = target;
    const fill = Engine4D.fill.clone(),
      rim = Engine4D.rim.clone();
    scene.add(key, target, fill, rim);
    scene.userData.lights = { key, fill, rim };
    key.castShadow = false;
    this.comparison = { ...stage, scene, name: option.name };
    this.comparisonOrbitDistance=Math.max(1,Engine3D.camera.position.distanceTo(Engine3D.controls.target));
    this.invalidate();
    this.compareLabels();
    const status = document.getElementById("fourd-compare-status");
    if (status)
      status.textContent =
        "Comparing " +
        option.name +
        (stage.proxies
          ? " · " + stage.proxies + " dimensioned proxies"
          : " · full architectural geometry");
  },
  stopComparison() {
    if (this.comparison)
      Scene4D.dispose({
        model: this.comparison.model,
        materials: this.comparison.materials,
        sceneResources: this.comparison.resources,
      });
    this.comparison = null;
    this.comparisonCamera = null;
    this.compareLabels();
    if (Engine3D.scene) Engine3D.needsRender = true;
  },
  compareLabels() {
    let node = document.getElementById("fourd-comparison-labels");
    if (!node) {
      node = document.createElement("div");
      node.id = "fourd-comparison-labels";
      document.getElementById("three-container").append(node);
    }
    node.replaceChildren();
    node.hidden = !this.comparison;
    if (this.comparison) {
      for (const label of ["Current design", this.comparison.name]) {
        const span = document.createElement("span");
        span.textContent = label;
        node.append(span);
      }
    }
  },
  renderComparison(camera) {
    if (!this.comparison) return false;
    const e = Engine4D,
      r = e.renderer,
      w = r.domElement.clientWidth,
      h = r.domElement.clientHeight,
      oldEncoding = r.outputEncoding,
      oldScissor = r.getScissorTest(),
      viewport = r.getViewport(new THREE.Vector4()),
      scissor = r.getScissor(new THREE.Vector4());
    const right = this.comparison.scene;
    right.environment = e.scene.environment;
    right.background = e.scene.background;
    for (const role of ["key", "fill", "rim"]) {
      const light = right.userData.lights[role],
        source = e[role];
      light.position.copy(source.position);
      light.color.copy(source.color);
      light.intensity = source.intensity;
      if (light.groundColor) light.groundColor.copy(source.groundColor);
      if (light.target) light.target.position.copy(source.target.position);
    }
    for (const m of this.comparison.materials) {
      m.userData.environmentBase ??= m.envMapIntensity;
      m.envMapIntensity =
        m.userData.environmentBase * this.settings.environmentIntensity;
    }
    const renderCamera = camera.clone();
    if (renderCamera.isPerspectiveCamera) renderCamera.aspect = w / 2 / h;
    else {
      renderCamera.left *= 0.5;
      renderCamera.right *= 0.5;
    }
    this.comparisonCamera = renderCamera;
    renderCamera.updateProjectionMatrix();
    // Fit both designs to a half-width viewport. Reusing the full-width pose can
    // put the current model beyond the read-only boundary when a long lens is set.
    const bounds=e.modelBounds.clone().union(new THREE.Box3().setFromObject(this.comparison.model)),center=bounds.getCenter(new THREE.Vector3()),radius=Math.max(10,bounds.getSize(new THREE.Vector3()).length()/2),direction=camera.position.clone().sub(Engine3D.controls.target).normalize();
    if(renderCamera.isPerspectiveCamera&&this.settings.lens)renderCamera.setFocalLength(this.settings.lens);
    const canvas=r.domElement.getBoundingClientRect(),panel=document.querySelector('#studio-dialog[open].workspace-docked-dialog'),halfWidth=w/2;
    let left=panel?Math.max(12,panel.getBoundingClientRect().right-canvas.left+12):12;if(left>halfWidth*.6)left=12;
    const fraction=Math.max(.35,(halfWidth-left-12)/halfWidth),tan=Math.tan((renderCamera.fov||60)*Math.PI/360),base=radius/Math.sin(Math.min(Math.atan(tan*.9),Math.atan(tan*(halfWidth/h)*fraction)))*1.14;
    const zoom=Math.max(.15,camera.position.distanceTo(Engine3D.controls.target)/(this.comparisonOrbitDistance||1)),distance=base*zoom,screenHalf=distance*tan;
    const rightAxis=new THREE.Vector3().crossVectors(renderCamera.up,direction).normalize(),target=center.clone().addScaledVector(rightAxis,-(left-12)/halfWidth*screenHalf*(halfWidth/h));
    renderCamera.position.copy(target).addScaledVector(direction,distance);renderCamera.lookAt(target);
    if(renderCamera.isOrthographicCamera){const half=radius*1.14/fraction;renderCamera.left=-half*(halfWidth/h);renderCamera.right=half*(halfWidth/h);renderCamera.top=half;renderCamera.bottom=-half;}
    renderCamera.near=Math.max(.2,distance-radius*1.5);renderCamera.far=Math.max(renderCamera.near+100,distance+radius*3);renderCamera.updateProjectionMatrix();
    FourDRender.camera(renderCamera, this.settings,target);
    try {
      r.outputEncoding = THREE.sRGBEncoding;
      r.setRenderTarget(null);
      r.setScissorTest(true);
      r.setViewport(0, 0, Math.floor(w / 2), h);
      r.setScissor(0, 0, Math.floor(w / 2), h);
      r.clear();
      r.render(e.scene, renderCamera);
      r.setViewport(Math.floor(w / 2), 0, w - Math.floor(w / 2), h);
      r.setScissor(Math.floor(w / 2), 0, w - Math.floor(w / 2), h);
      r.clear();
      r.render(right, renderCamera);
    } finally {
      r.outputEncoding = oldEncoding;
      r.setScissorTest(oldScissor);
      r.setViewport(viewport);
      r.setScissor(scissor);
    }
    return true;
  },
  visualStamp() {
    const camera = Engine3D.camera;
    camera?.updateMatrixWorld(true);
    return [
      this.revision,
      Engine4D.modelVersion,
      camera?.matrixWorld.elements.join(","),
      camera?.projectionMatrix.elements.join(","),
      this.phaseValue,
      Engine4D.preset,
      Engine4D.exposure,
      Engine4D.landscapeEnabled,
      Engine4D.physicalGlass,
      StudioEnhancements.focusRoom,
      StudioEnhancements.explosion,
      JSON.stringify(StudioEnhancements.section),
      JSON.stringify(StudioEnhancements.openingPreview),
      StudioEnhancements.sunStudy,
      StudioEnhancements.sunKey,
      window.FourDViews?.dayHour,
      window.FourDViews?.reveal,
      window.FourDViews?.materialMode,
      window.FourDViews?.kind,
      JSON.stringify(
        Engine3D.renderer?.clippingPlanes.map((p) => [
          ...p.normal.toArray(),
          p.constant,
        ]),
      ),
    ].join("|");
  },
  photoStatus(text) {
    const node = document.getElementById("fourd-photo-status");
    if (node) node.textContent = text;
  },
  frame(camera) {
    FourDRender.environment(this.settings);
    FourDRender.mirrorsFor(
      StudioEnhancements.modelProject || ProjectState.capture(),
      this.settings,
    );
    for (const material of Engine4D.materials) {
      if (material.envMapIntensity !== undefined) {
        material.userData.environmentBase ??= material.envMapIntensity;
        material.envMapIntensity =
          material.userData.environmentBase *
          this.settings.environmentIntensity;
      }
    }
    this.applyPhase();
    this.applyLOD(camera);
    this.updateOutlines();
    if (this.clearances && !this.clearanceGroup) this.rebuildClearances();
    if (this.clearanceGroup) this.clearanceGroup.visible = !FourDRender.active && !window.FourDWorkspace?.exporting;
    FourDRender.updateProbe(window.FourDWorkspace?.quality === "eco" ? {...this.settings,reflections:"environment"} : this.settings);
    FourDRender.before(camera, this.settings);
  },
  listenCamera() {
    const controls = Engine3D.controls;
    if (!controls || this.controls === controls) return;
    this.controls = controls;
    controls.addEventListener("change", () => {
      FourDRender.cancelPhoto();
      FourDRender.probeDirty = true;
      FourDRender.cameraChangedAt = performance.now();
      clearTimeout(this.probeTimer);
      this.probeTimer = setTimeout(() => {
        if (Engine4D.ready) Engine3D.needsRender = true;
      }, 320);
    });
  },
  leave() {
    this.playing = false;
    cancelAnimationFrame(this.stageRAF);
    clearTimeout(this.probeTimer);
    this.phaseValue = null;
    this.stopComparison();
    this.restoreFilters();
  },
  init() {
    const decorate = Engine4D.material;
    Engine4D.material = function (original, object) {
      const material = decorate.call(this, original, object);
      FourDStudio.materialDecorate(material, object);
      return material;
    };
    const hit = StudioEnhancements.hit;
    StudioEnhancements.hit = function (event) {
      if (FourDStudio.comparison) {
        const box = Engine4D.renderer.domElement.getBoundingClientRect();
        if (event.clientX > box.left + box.width / 2) return null;
        return hit.call(
          this,
          {
            clientX: box.left + 2 * (event.clientX - box.left),
            clientY: event.clientY,
          },
          FourDStudio.comparisonCamera,
        );
      }
      return hit.call(this, event);
    };
    AppEvents.onStateChange(() => {
      this.invalidate();
      if (this.clearances) this.rebuildClearances();
    });
    AppEvents.onSelectionChange(() => {
      this.outlineKey = null;
      FourDRender.probeDirty = true;
      FourDRender.cancelPhoto();
    });
    const advanced = WorkspaceLayout.advanced;
    WorkspaceLayout.advanced = function () {
      advanced.call(this);
      const panel = document.getElementById("advanced-view-panel");
      if (panel && !panel.querySelector("[data-fourd-studio]")) {
        const button = WorkspaceLayout.makeButton("4D Studio", "studio", () =>
          FourDStudio.open(),
        );
        button.dataset.fourdStudio = "true";
        panel.append(button);
      }
    };
    WorkspaceLayout.advanced();
    const init = Engine3D.init;
    Engine3D.init = function (...args) {
      const result = init.apply(this, args);
      FourDStudio.listenCamera();
      return result;
    };
    this.listenCamera();
  },
};
document.addEventListener("DOMContentLoaded", () => FourDStudio.init());
