/* The 4D shell owns lifecycle and view state. Merely opening it never starts GPU work. */
window.FourDWorkspace = {
  running: false,
  paused: false,
  starting: false,
  token: 0,
  quality: "balanced",
  annotations: "off",
  annotationPreference: "off",
  dimensions: false,
  resolutionScale: 1,
  navigationDetail: true,
  updateRevision: 0,
  metrics: { samples: [], longTasks: 0, builds: 0 },
  profiles: {
    eco: { pixels: 650000, ratio: 1, shadow: 512, ao: false },
    balanced: { pixels: 1100000, ratio: 1.25, shadow: 1024, ao: true },
    high: { pixels: 1800000, ratio: 1.5, shadow: 2048, ao: true },
  },
  mount() {
    if (document.getElementById("fourd-workspace")) return;
    const root = document.createElement("div");
    root.id = "fourd-workspace";
    root.innerHTML = `<div id="fourd-start-card"><span class="fourd-eyebrow">ARCHITECTURAL PRESENTATION</span><h2>4D workspace</h2><p id="fourd-start-message" role="status" aria-live="polite">Your model is ready to prepare. Start rendering when you need it.</p><label>Device quality<select aria-label="4D quality" data-quality><option value="eco">Eco · lowest device load</option><option value="balanced" selected>Balanced · everyday viewing</option><option value="high">High · more GPU and memory</option></select></label><button id="fourd-start" class="studio-button" onclick="FourDWorkspace.start()">Render 4D</button><button id="fourd-cancel" class="studio-button" onclick="FourDWorkspace.stop()" hidden>Cancel preparation</button><small>Rendering stays off until you start. Your plan dimensions remain unchanged.</small></div>
      <div id="fourd-toolbar" role="toolbar" aria-label="4D workspace controls">
        <button class="studio-button" onclick="StudioEnhancements.fullView()">Full view</button>
        <button class="studio-button" onclick="FourDWorkspace.viewPanel()">Views</button>
        <button class="studio-button" onclick="FourDViews.panel()">Present</button>
        <button class="studio-button" onclick="FourDReview.panel()">Review</button>
        <button class="studio-button" onclick="FourDWorkspace.inspect(true)">Inspect</button>
        <button class="studio-button" onclick="FourDWorkspace.studio()">4D Studio</button>
        <select aria-label="4D annotations" onchange="FourDWorkspace.setAnnotations(this.value)"><option value="off">Labels off</option><option value="selected">Selected label</option><option value="all">All visible labels</option></select>
        <select aria-label="Live 4D quality" data-quality><option value="eco">Eco</option><option value="balanced" selected>Balanced</option><option value="high">High</option></select>
        <button id="fourd-pause" class="studio-button" onclick="FourDWorkspace.pause()">Pause</button>
        <button class="studio-button" onclick="FourDWorkspace.stop()">Stop</button>
      </div><div id="fourd-inspection" hidden></div><div id="fourd-session-status" role="status"></div>`;
    document.getElementById("right-canvas-wrapper").append(root);
    const preparation=document.createElement('div');preparation.id='fourd-preparation-status';preparation.className='fourd-profile-status';preparation.hidden=true;preparation.setAttribute('role','status');
    const text=document.createElement('span'),cancel=document.createElement('button');text.dataset.preparationMessage='';cancel.className='studio-button';cancel.textContent='Cancel loading';cancel.onclick=()=>this.stop();preparation.append(text,cancel);root.append(preparation);
    root.querySelectorAll("[data-quality]").forEach(select => select.addEventListener("change", () => this.setQuality(select.value)));
    try { this.quality = localStorage.getItem("ArchCAD_4D_Quality") || "balanced"; } catch {}
    try { this.navigationDetail=localStorage.getItem('ArchCAD_4D_Navigation_Detail')!=='false'; } catch {}
    this.setQuality(this.quality);
    this.state("waiting");
  },
  state(value, message) {
    document.body.dataset.fourdState = value;
    const label = document.getElementById("fourd-start-message");
    if (label && message) label.textContent = message;
    const starting = value === "loading";
    const start = document.getElementById("fourd-start");
    if (start) { start.hidden = starting; start.textContent = value === "error" ? "Retry Render 4D" : "Render 4D"; }
    const cancel = document.getElementById("fourd-cancel");
    if (cancel) cancel.hidden = !starting;
  },
  async checkpoint(message, token) {
    if(message){if(this.corePresented)this.preparation(message);else this.state('loading',message);}
    await new Promise(resolve => setTimeout(resolve, 20));
    if (token !== this.token || StudioUI.mode !== "4d" || document.hidden)
      throw new DOMException("4D preparation cancelled", "AbortError");
  },
  preparation(message='') {
    const node=document.getElementById('fourd-preparation-status');if(!node)return;
    node.hidden=!message;node.querySelector('[data-preparation-message]').textContent=message;
  },
  setNavigationDetail(value) {
    this.navigationDetail=!!value;try{localStorage.setItem('ArchCAD_4D_Navigation_Detail',String(this.navigationDetail));}catch{}
    Engine3D.needsRender=true;
  },
  start() {
    if (StudioUI.mode !== "4d" || document.hidden) return;
    if (this.starting) return this.startPromise;
    if (this.running) return this.paused ? this.pause(false) : undefined;
    const token = ++this.token;
    this.starting = true;
    this.corePresented=false;this.progressivePending=true;
    this.metrics = { started: performance.now(), samples: [], longTasks: 0, builds: 0 };
    this.startPromise = (async () => {
      try {
        await this.checkpoint("Loading rendering libraries…", token);
        if (Engine4D.renderer && !Engine4D.ready) Engine4D.releaseRenderer();
        await Engine4D.dependencies();
        await this.checkpoint("Preparing the architectural model…", token);
        if (!Engine3D.scene) Engine3D.init();
        // Keep both render loops asleep until there is a complete 4D scene.
        window.is3DMode = false;
        Engine3D.syncVisibility();
        if(this.sourceInvalid)Engine3D.modelSignature=null;
        await FourDSource.build(this.renderProject(),()=>this.checkpoint(null,token),()=>token===this.token&&StudioUI.mode==='4d'&&!document.hidden,{deferFurniture:true});
        this.sourceInvalid=false;
        await this.checkpoint("Preparing physical materials and geometry…", token);
        await Engine4D.enable(token);
        if (token !== this.token || StudioUI.mode !== "4d") throw new DOMException("Cancelled", "AbortError");
        this.state("loading", "Preparing the first view…");
        if (!Engine4D.ready) throw Error(Engine4D.lastError || "Graphics initialization failed");
        this.running = true;
        this.paused = false;
        StudioEnhancements.labels = "none";
        StudioEnhancements.focusRoom = null;
        this.annotations = "off";
        this.dimensions = false;
        document.body.dataset.fourdDimensions = "false";
        this.clearSelection();
        Workbench3D.clearIsolation();
        StudioEnhancements.clearSection();
        ViewportUI.inspectFloor("all");
        this.setQuality(this.quality);
        FourDViews.reset();
        this.materialKeys = new Map();
        this.updateMaterials();
        Scene4D.reconcile(Engine4D);
        window.is3DMode = true;
        StudioEnhancements.bindCanvas();
        ViewportUI.orient("iso", false);
        if(this.recovery)FourDSession.restore(this.recovery);
        Engine4D.render();
        if (!Engine4D.ready) throw Error(Engine4D.lastError || "The first frame failed");
        this.state("ready");
        this.corePresented=true;document.getElementById('fourd-pause').disabled=true;
        this.metrics.firstFrameMs = performance.now() - this.metrics.started;
        Engine3D.needsRender = true;
        Engine3D.syncVisibility();
        this.status();
        await this.checkpoint('Adding furniture…',token);
        const valid=()=>token===this.token&&StudioUI.mode==='4d'&&!document.hidden;
        await FourDSource.furniture(this.renderProject(),()=>this.checkpoint(null,token),valid);Engine4D.render();
        await this.checkpoint('Preparing the garden…',token);let began=performance.now();
        await Landscape4D.buildAsync(Engine4D,()=>this.checkpoint(null,token),valid);this.metrics.gardenMs=performance.now()-began;
        await this.checkpoint('Adding architectural detail…',token);began=performance.now();
        await FourDDetails.buildAsync(()=>this.checkpoint(null,token),valid);this.metrics.detailMs=performance.now()-began;
        await Engine4D.warmPrograms(()=>this.checkpoint('Preparing finishing shaders…',token),{traverse:visit=>{Engine4D.landscape?.traverse(visit);FourDDetails.details?.traverse(visit);}});
        this.progressivePending=false;this.modelKey=this.geometryKey(this.renderProject());await FourDIncremental.remember(this.renderProject(),valid);
        this.metrics.fullReadyMs=performance.now()-this.metrics.started;this.recovery=null;this.preparation();
        this.starting=false;document.getElementById('fourd-pause').disabled=false;
        if(!Engine4D.render())throw Error(Engine4D.lastError||'The completed view failed');Engine3D.needsRender=true;this.status();
      } catch (error) {
        if (token !== this.token) return;
        this.stop(false);
        if (error.name !== "AbortError") {
          this.state("error", "Could not prepare 4D: " + error.message + ". Retry or choose Eco quality.");
          console.warn("4D preparation", error);
        } else this.state("waiting", "Preparation cancelled. Click Render 4D when you are ready.");
      } finally {
        if(token===this.token){this.starting=false;document.getElementById('fourd-pause').disabled=false;}
      }
    })();
    return this.startPromise;
  },
  pause(value = !this.paused) {
    if (!this.running) return;
    this.paused = value;
    if(value)window.FourDPerformance?.cancel();
    if (value) {FourDViews.suspend();FourDReview.cancelQueue();FourDJobs.stop();clearTimeout(FourDAssets.timer);FourDDetails.capRevision++;clearTimeout(FourDDetails.capTimer);this.pendingUpdate=true;}
    if (value) {
      FourDStudio.playing = false;
      cancelAnimationFrame(FourDStudio.stageRAF);
      window.FourDRender?.cancelPhoto();
      StudioEnhancements.stopWalk();
      clearTimeout(StudioEnhancements.navigationTimer);
      clearTimeout(FourDStudio.probeTimer);
      clearTimeout(this.adaptTimer);
      this.adaptTimer=null;
      StudioEnhancements.navigating=false;
    }
    window.is3DMode = !value;
    Engine3D.controls.enabled = !value;
    Engine3D.syncVisibility();
    document.getElementById("fourd-pause").textContent = value ? "Resume" : "Pause";
    this.state(value ? "paused" : "ready");
    if (!value) Engine3D.needsRender = true;
    if (!value) StudioEnhancements.resizeQuality();
    if (!value && this.pendingUpdate) { this.pendingUpdate=false; this.scheduleUpdate(); }
    this.status();
  },
  stop(update = true) {
    ++this.token;
    window.FourDSource?.cancel();
    window.FourDPerformance?.cancel();
    window.FourDReview?.stop();
    window.FourDDetails?.stop();
    FourDJobs.stop();
    FourDAssets.stop();
    FourDIncremental.reset();
    FourDViews.stop();
    this.starting = this.running = this.paused = false;
    this.progressivePending=false;this.corePresented=false;this.preparation();if(update)this.recovery=null;
    if(window.FourDSource&&!FourDSource.complete)this.sourceInvalid=true;
    const pause=document.getElementById('fourd-pause');if(pause)pause.disabled=false;
    this.structuralPending=false;
    this.startPromise = null;
    clearTimeout(this.adaptTimer);
    clearTimeout(this.updateTimer);
    clearTimeout(StudioEnhancements.navigationTimer);
    StudioEnhancements.navigating = false;
    StudioEnhancements.stopWalk();
    StudioEnhancements.clearRuntime();
    if (Engine3D.cameraTween) Engine3D.cameraTween = null;
    Engine4D.disable();
    Engine4D.releaseRenderer();
    Engine3D.renderer?.setSize(1,1,false);
    if (Engine3D.sunLight?.shadow.map) { Engine3D.sunLight.shadow.map.dispose(); Engine3D.sunLight.shadow.map=null; }
    if (StudioUI.mode === "4d") {
      window.is3DMode = false;
      Engine3D.syncVisibility();
    }
    document.getElementById("fourd-inspection")?.setAttribute("hidden", "");
    document.getElementById("fourd-pause")?.replaceChildren(document.createTextNode("Pause"));
    if (update) this.state("waiting", "Rendering is stopped. Start again when you need it.");
    this.status();
  },
  enter() {
    this.mount();
    this.running = this.paused = false;
    this.previousIsolation = Workbench3D.isolation ? structuredClone(Workbench3D.isolation) : null;
    this.state("waiting", "Your model is ready to prepare. Start rendering when you need it.");
    document.getElementById("studio-dialog")?.close();
    WorkspacePanels.close();
    StudioEnhancements.linked = false;
    document.body.dataset.linked4d = "false";
    if (window.isPlayingTour) Widget3DEngine.stopTour?.();
    window.isPlayingTour = false;
    cancelAnimationFrame(window.tourAnimationId);
    cancelAnimationFrame(Widget3DEngine._explodeAnimation);
    Workbench3D.disableEdit?.();
    Engine3D.isWalkthrough=false;
    Engine3D.fpsControls?.unlock();
    if(Engine3D.controls) {Engine3D.controls.autoRotate=false;Engine3D.controls.enabled=true;}
    Workbench3D.measurePoints = null;
    StudioEnhancements.labels = "none";
    Engine3D.syncVisibility();
  },
  leave() {
    this.stop();
    Engine3D.modelSignature=null;
    if (this.previousIsolation) {Workbench3D.isolation=this.previousIsolation;Workbench3D.applyIsolation();}
    document.getElementById("studio-dialog")?.close();
    requestAnimationFrame(() => {
      if (StudioUI.mode === "4d") return;
      PlanningUI.refresh();
      DesignUI.refresh();
      StudioUI.renderInspector();
      updateCanvas();
    });
  },
  failed(reason) {
    FourDViews.suspend();
    FourDJobs.stop();window.FourDSource?.cancel();FourDIncremental.revision++;this.updateRevision++;
    window.FourDDetails?.stop();clearTimeout(this.updateTimer);clearTimeout(this.adaptTimer);
    this.running = false;
    window.is3DMode = false;
    Engine3D.syncVisibility();
    this.state("error", "Rendering paused: " + reason + ". Retry Render 4D or select Eco quality.");
    queueMicrotask(()=>{
      if (!this.running && !this.starting && Engine4D.state !== "context-lost") Engine4D.releaseRenderer();
    });
  },
  setQuality(value) {
    this.quality = this.profiles[value] ? value : "balanced";
    window.FourDAssets?.enforce();
    if(Engine4D.ready)Landscape4D.quality(Engine4D);
    this.resolutionScale = 1;
    this.metrics.samples = [];
    try { localStorage.setItem("ArchCAD_4D_Quality", this.quality); } catch {}
    document.querySelectorAll("#fourd-workspace [data-quality]").forEach(s => s.value = this.quality);
    const e = Engine4D, p = this.profiles[this.quality];
    e.pixelBudget = p.pixels;
    e.maxPixelRatio = p.ratio;
    if (!e.ready) return;
    e.key.shadow.map?.dispose();
    e.key.shadow.map = null;
    e.key.shadow.mapSize.set(p.shadow, p.shadow);
    e.renderer.shadowMap.enabled = this.quality !== "eco";
    e.renderer.shadowMap.needsUpdate = true;
    StudioEnhancements.resizeQuality();
    Engine3D.needsRender = true;
    this.status();
  },
  renderProject() {
    const p=ProjectState.capture();
    if(window.ParapetStudio?.previewConfig){p.view.parapetConfig=structuredClone(ParapetStudio.previewConfig);p.view.parapet=p.view.parapetConfig.defaults.style;}
    return p;
  },
  geometryKey(p) {
    const {presentation, ...design} = p.design;
    return JSON.stringify({elements:p.elements.map(({material,customColor,...e})=>e),fixtures:p.fixtures,
      plot:p.plot,unit:p.unit,scale:p.scale,floors:p.floorCount,walls:p.wallSettings,overrides:p.wallOverrides,
      planning:p.planning,design,parapet:[p.view.parapet,p.view.parapetConfig],
      assets:[...Workbench3D.templates].map(([id,template])=>[id,template.uuid])});
  },
  scheduleUpdate() {
    if (!this.running || this.starting) return;
    const revision=++this.updateRevision;
    FourDIncremental.revision++;
    if (this.paused || document.hidden) {this.pendingUpdate=true;return;}
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(async () => {
      if (!this.running || StudioUI.mode !== "4d") return;
      if (this.paused || document.hidden) {this.pendingUpdate=true;return;}
      const p=this.renderProject(), key=this.geometryKey(p), token=this.token;
      const valid=()=>this.running&&!this.paused&&!document.hidden&&token===this.token&&revision===this.updateRevision;
      try {
        if(key!==this.modelKey || this.sourceInvalid) {
          this.structuralPending=true;
          const result=await FourDIncremental.update(p,valid);
          if(!valid()) return;
          if(result.fallback) {
            // Global dependencies retain the proven full builder.
            this.sourceInvalid=true;
            await FourDSource.build(p,async()=>{await new Promise(r=>setTimeout(r,0));if(!valid())throw new DOMException('Superseded source','AbortError');},valid);
            const stage=await Scene4D.stageAsync(Engine4D,Engine3D.buildingGroup,p,async()=>{
              await new Promise(r=>setTimeout(r,0));if(!valid())throw new DOMException('Superseded rebuild','AbortError');
            });
            if(!valid()) {Scene4D.dispose({model:stage.model,materials:stage.materials,sceneResources:stage.resources});return;}
            Engine4D.syncModel(true,stage);
            this.sourceInvalid=false;
            Scene4D.reconcile(Engine4D);
            await FourDIncremental.remember(p,valid);
            this.metrics.fallbacks=(this.metrics.fallbacks||0)+1;
          }
          this.modelKey=key;
          this.structuralPending=false;
        }
        this.structuralPending=false;
        this.updateMaterials();
        Engine3D.needsRender=true;
      } catch(error) {
        if(error.name==='AbortError')return;
        console.warn('4D incremental preparation',error);
        if(valid()) StudioUI.message('The model update could not be prepared. Previous view retained; stop and render again to retry.','error');
      }
    }, 65);
  },
  updateMaterials() {
    if (!Engine4D.ready) return;
    const p = ProjectState.capture(), changed = new Set(), e = Engine4D;
    const liveIds=new Set(p.elements.map(element=>element.id));
    for(const id of this.materialKeys.keys())if(!liveIds.has(id))this.materialKeys.delete(id);
    for (const element of p.elements) {
      const preview = StudioEnhancements.preview?.id === element.id ? StudioEnhancements.preview : null,
        key=JSON.stringify([element.material,element.customColor,p.design.presentation.surfaces[element.id],preview]);
      if (this.materialKeys.get(element.id) !== key) {
        if (this.materialKeys.has(element.id)) changed.add(element.id);
        this.materialKeys.set(element.id,key);
      }
    }
    if(changed.size)FourDViews.restoreReveal();
    StudioEnhancements.modelProject = p;
    const replace = (node,make) => {
      const old=[].concat(node.material || []);
      node.material = Array.isArray(node.material) ? node.material.map((m,i)=>make(i)) : make(0);
      for (const material of old) {
        e.materials.delete(material);
        for (const slot of Scene4D.textureSlots) {
          const texture=material[slot];
          if (texture && !e.sceneResources?.textures.has(texture)) texture.dispose();
        }
        material.dispose();
      }
    };
    for (const [source,copy] of e.pairs) {
      const owner=source.userData.elementId || elements[source.userData.roomIndex]?.id;
      if (!copy.material || !changed.has(owner)) continue;
      replace(copy,i => {
        const originals=[].concat(source.material), material=e.material(originals[i],source);
        for (const slot of Scene4D.textureSlots)
          if (material[slot] && material[slot]===originals[i][slot]) material[slot]=material[slot].clone();
        return material;
      });
    }
    for (const mesh of StudioEnhancements.ceilings || []) {
      if (!changed.has(mesh.userData.elementId)) continue;
      replace(mesh,() => {
        const material=new THREE.MeshPhysicalMaterial({color:0xe5e5df,roughness:.9,side:THREE.DoubleSide});
        e.materials.add(material);
        StudioEnhancements.decorate(material,mesh);
        FourDStudio.materialDecorate(material,mesh);
        return material;
      });
    }
    for (const leaf of StudioEnhancements.leaves || [])
      if (leaf.fixed) leaf.fixed.material=leaf.copy.material;
    if (changed.size) {
      Scene4D.reconcile(e);
      e.renderer.shadowMap.needsUpdate=true;
      if(window.FourDRender)FourDRender.probeDirty=true;
      FourDStudio.outlineKey=null;
      window.FourDRender?.cancelPhoto();
    }
  },
  sample(ms) {
    if (!this.running || document.hidden || this.paused) return;
    const samples = this.metrics.samples;
    window.FourDPerformance?.frame(ms);
    samples.push(ms);
    if (samples.length > 60) samples.shift();
    if (samples.length >= 20 && StudioEnhancements.navigating && !this.adaptTimer) {
      const average = samples.reduce((a,b) => a+b,0) / samples.length;
      if (average > 30) this.resolutionScale = Math.max(0.55, this.resolutionScale - 0.1);
      else if (average < 16) this.resolutionScale = Math.min(1, this.resolutionScale + 0.05);
      this.adaptTimer = setTimeout(() => { this.adaptTimer = null; StudioEnhancements.resizeQuality(); }, 500);
    }
    this.status();
  },
  status() {
    const label = document.getElementById("fourd-session-status");
    if (!label) return;
    const m = this.metrics, samples = m.samples;
    const average = samples.length ? samples.reduce((a,b)=>a+b,0)/samples.length : 0;
    const text = !this.running ? "Renderer off · device resources released" : `${this.paused ? "Paused" : this.quality} · ${Math.round(average)} ms/render · ${(Engine4D.modelTriangles || 0).toLocaleString()} triangles`;
    if (label.textContent !== text) label.textContent = text;
  },
  clearSelection() {
    Selection.ids.clear();
    selectedElIndex = -1;
    FourDStudio.outlineKey = null;
    if (FourDStudio.outlines) FourDStudio.outlines.visible = false;
    document.getElementById("fourd-inspection")?.setAttribute("hidden", "");
    this.setAnnotations("off", false);
    this.dimensions = false;
    document.body.dataset.fourdDimensions = "false";
  },
  setAnnotations(value, remember = true) {
    this.annotations = ["off", "selected", "all"].includes(value) ? value : "off";
    if (remember) this.annotationPreference = this.annotations;
    StudioEnhancements.labels = this.annotations === "off" ? "none" : "rooms";
    const select = document.querySelector('[aria-label="4D annotations"]');
    if (select) select.value = this.annotations;
    StudioEnhancements.lastLabels = 0;
    Engine3D.needsRender = true;
  },
  inspect(open = false) {
    const e = elements[selectedElIndex], panel = document.getElementById("fourd-inspection");
    if (!panel || !this.running || (!e && !open)) return;
    panel.hidden = false;
    const esc = ProjectModel.escapeHTML;
    panel.innerHTML = `<div class="fourd-inspect-heading"><strong>${esc(e?.customName || e?.type || "Inspect model")}</strong><button class="studio-button" aria-label="Close 4D inspector" onclick="this.closest('#fourd-inspection').hidden=true">×</button></div>` + (e ? `<p>Floor ${e.floor} · ${esc(ProjectModel.display(e.w, StudioUI.unit))} × ${esc(ProjectModel.display(e.h, StudioUI.unit))}</p><p>${e.locked ? "Locked element" : "Select a surface to review its finishes."}</p><div class="studio-action-grid"><button class="studio-button" onclick="StudioEnhancements.run(()=>StudioEnhancements.focusSelection())">Focus element</button><button class="studio-button" onclick="StudioEnhancements.fullView()">Full building</button><button class="studio-button" onclick="StudioEnhancements.run(()=>StudioEnhancements.materials())">Finishes</button></div>` : `<p>Click an element to inspect it. Double-click or use Focus element to enter a closer view.</p>`);
  },
  studio() {
    if (!this.running || this.paused) return;
    WorkspacePanels.intent = "4D";
    FourDStudio.open();
  },
  viewPanel() {
    if (!this.running || this.paused) return;
    WorkspacePanels.intent = "4D";
    const b = (label, action) => StudioUI.button(label, action);
    StudioUI.dialog("4D views", `<div class="studio-action-grid">${b("Parapet studio", "ParapetStudio.open()")}${b("Exterior", "StudioEnhancements.fullView()")}${b("Plot", "FourDViews.plot()")}${b("Presentation", "FourDViews.panel()")}${b("Daylight preview", "FourDViews.daylightPanel()")}${b("Finish close-up", "FourDViews.materialPanel()")}${b("Guided tour", "FourDViews.tourPanel()")}${b("Interior", "StudioEnhancements.run(()=>StudioEnhancements.walkDialog())")}${b("Floor plan", "ViewportUI.orient('top')")}${b("Section", "StudioEnhancements.run(()=>StudioEnhancements.sectionDialog())")}${b("Photo", "FourDStudio.open('camera')")}${b("Lighting", "Engine4D.lightingDialog()")}${b("Room lights", "StudioEnhancements.run(()=>StudioEnhancements.interiorDialog())")}${b("Sun & location", "DesignUI.sunDialog()")}${b("Camera views", "ViewportUI.viewsDialog()")}${b("Clean view", "StudioEnhancements.setFocus(true)")}${b("Appearance", "FourDWorkspace.appearance()")}${b("Openings", "StudioEnhancements.run(()=>StudioEnhancements.openingsDialog())")}${b("Exploded floors", "StudioEnhancements.run(()=>StudioEnhancements.explodeDialog())")}${b("Measure", "FourDWorkspace.showDimensions(true);StudioEnhancements.measureDialog()")}${b("Rendering diagnostics", "FourDWorkspace.diagnostics()")}</div><label>Inspect floor<select aria-label="4D floor" onchange="FourDViews.floor(this.value)"><option value="all">Whole building</option>${Array.from({length:ProjectState.capture().floorCount},(_,i)=>`<option value="${i}">${i===0?"Ground":"Floor "+i}</option>`).join("")}</select></label><label>Cutaway height<input aria-label="4D cutaway" type="range" min="5" max="100" value="${ViewportUI.cutPercent || 100}" oninput="ViewportUI.cutaway(this.value)"></label><label><input type="checkbox" ${this.dimensions ? "checked" : ""} onchange="FourDWorkspace.showDimensions(this.checked)">Show saved dimensions</label><label>Sunlight strength<select aria-label="4D sunlight" onchange="WorkspaceLayout.setSun(Number(this.value))">${[0,25,50,75,100].map(n=>`<option value="${n}" ${WorkspaceLayout.sunValue()===n ? "selected" : ""}>${n}%</option>`).join("")}</select></label><p>Single click selects. Focus element moves closer. Full view clears temporary inspection overlays.</p>`);
  },
  showDimensions(value) {
    this.dimensions = !!value;
    document.body.dataset.fourdDimensions = String(this.dimensions);
    Engine3D.needsRender = true;
  },
  appearance() {
    WorkspacePanels.intent="4D";
    StudioUI.dialog("4D appearance", WorkspacePolish.themePicker()+WorkspacePolish.densityControls()+
      `<label>4D canvas background<input aria-label="4D canvas background" type="color" value="${StudioEnhancements.viewportBackground("4d")}" oninput="WorkspaceLayout.background('4d',this.value)"></label><p>The workspace theme and canvas use the same saved appearance preferences as the editor.</p>`);
  },
  diagnostics() {
    const m = this.metrics, e = Engine4D, esc = ProjectModel.escapeHTML;
    const issues = e.geometryIssues || [];
    StudioUI.dialog("4D rendering diagnostics", `<p>First usable view: ${Math.round(m.firstFrameMs || 0)} ms · full scene builds: ${m.builds} · incremental updates: ${m.incremental||0} · fallbacks: ${m.fallbacks||0} · last local update: ${Math.round(m.lastUpdate?.ms||0)} ms · long tasks observed: ${m.longTasks}</p><p>Draw calls: ${e.renderer?.info.render.calls || 0} · owned geometries: ${e.sceneResources?.geometries.size || 0} · renderer textures: ${e.renderer?.info.memory.textures || 0}</p><p>${issues.length ? issues.map(i=>esc(i.element+": "+i.reason)).join("<br>") : "No invalid geometry detected."}</p><p>Timings depend on model complexity, graphics drivers and quality. A render duration is not a screen FPS measurement.</p>`);
  },
  init() {
    this.mount();
    StudioUI.dialogHooks.set("4d-inspection", { before() {
      if (StudioUI.mode === "4d") document.getElementById("fourd-inspection").hidden=true;
    } });
    const request = window.request3DUpdate;
    window.request3DUpdate = () => {
      if (StudioUI.mode === "4d") return this.scheduleUpdate();
      return request();
    };
    AppEvents.onStateChange(() => {
      if (StudioUI.mode !== "4d") return;
      if (this.starting) {
        this.stop();
        this.state("waiting", "The project changed during preparation. Click Render 4D to prepare the updated model.");
      } else this.scheduleUpdate();
    });
    const layout = window.setWorkspaceLayout;
    window.setWorkspaceLayout = mode => {
      const previous = StudioUI.mode;
      if (previous === "4d" && mode !== "4d") this.leave();
      const result = layout(mode);
      if (mode === "4d" && previous !== "4d") this.enter();
      return result;
    };
    AppEvents.onSelectionChange(() => { if (StudioUI.mode === "4d") {this.inspect();FourDViews.breadcrumbs();} });
    document.addEventListener('keydown',event=>{
      if(StudioUI.mode==='4d' && event.key==='Escape' && (FourDViews.transition||FourDViews.tourPlaying)) {
        FourDViews.cancel('input');event.preventDefault();event.stopImmediatePropagation();
      }
    },true);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && StudioUI.mode === "4d") {
        FourDViews.suspend();
        FourDIncremental.revision++;
        this.pendingUpdate=true;
        window.FourDRender?.cancelPhoto();
        FourDStudio.playing = false;
        cancelAnimationFrame(FourDStudio.stageRAF);
        clearTimeout(FourDStudio.probeTimer);
        StudioEnhancements.stopWalk();
        clearTimeout(StudioEnhancements.navigationTimer);
        clearTimeout(this.adaptTimer);
        this.adaptTimer=null;
        StudioEnhancements.navigating=false;
        if (this.starting) this.stop();
      }
      if (!document.hidden && this.running && this.pendingUpdate) {this.pendingUpdate=false;this.scheduleUpdate();}
    });
    try {
      this.observer = new PerformanceObserver(list => {
        if (StudioUI.mode === "4d" && (this.starting || this.running)) this.metrics.longTasks += list.getEntries().length;
      });
      this.observer.observe({type:"longtask",buffered:false});
    } catch {}
    if (StudioUI.mode === "4d") this.enter();
  },
};
document.addEventListener("DOMContentLoaded", () => FourDWorkspace.init());
