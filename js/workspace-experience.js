/* Compact utilities and architectural viewport controls. All original workflows remain available. */
const WorkspaceExperience = {
  kinds: {
    'Workspace widgets': 'widgets', 'Canvas settings': 'settings', Project: 'project',
    Floors: 'floors', 'Pan drawing': 'pan', '3D rendering': 'render', 'Camera views': 'camera', 'View tools': 'view-tools',
    Tools: 'tools', 'Rooms & objects': 'objects', 'Find a tool or room': 'search',
  },
  icons: {
    Build: '<path d="M4 20V8l8-5 8 5v12M8 20v-7h8v7M3 20h18"/>',
    Tools: '<path d="m14 5 5 5M4 20l7-7M12 4a6 6 0 0 0-7 7l8 8a4 4 0 0 0 6-6l-8-8"/>',
    Widgets: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    Settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
    Search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
    Save: '<path d="M4 3h13l3 3v15H4zM8 3v6h8V3M8 21v-7h8v7"/>',
  },
  icon(name) {
    return `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${this.icons[name] || ''}</svg>`;
  },
  decorate(dialog, title, widget) {
    const kind = widget ? 'widget-detail' : this.kinds[title] || 'workflow';
    if (widget) dialog.dataset.widget = widget;
    dialog.dataset.kind = kind;
    const compact = ['widgets','settings','project','floors','pan','render','camera','view-tools','widget-detail'].includes(kind);
    dialog.classList.toggle('experience-popover', compact);
    dialog.onpointerdown = event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    };
    if (compact) this.position(dialog, kind);
    dialog.querySelectorAll('button').forEach(button => {
      if (!button.title && button.textContent.trim()) button.title = button.textContent.trim();
    });
  },
  position(dialog, kind) {
    if (kind === 'widget-detail') {
      const anchor = document.querySelector(`#planning-dock [data-widget="${dialog.dataset.widget}"]`);
      const r = anchor?.getBoundingClientRect();
      const header = document.querySelector('.studio-header').getBoundingClientRect().bottom;
      const width = Math.min(380, innerWidth - 24);
      const left = innerWidth <= 600 ? 12 : Math.max(12, Math.min((r?.right || 44) + 10, innerWidth - width - 12));
      const available = innerHeight - header - 24;
      const height = Math.min(540, available);
      const top = Math.max(header + 8, Math.min(r?.top || header + 8, innerHeight - height - 12));
      Object.assign(dialog.style, {width:`${width}px`,left:`${left}px`,top:`${top}px`,margin:'0',maxHeight:`${Math.max(120, Math.min(height, innerHeight-top-12))}px`});
      return;
    }
    const selectors = { widgets: '[aria-label="Workspace widgets"]', settings: '[aria-label="Canvas settings"]',
      project: '.studio-file-actions > button:first-child', floors: '[aria-label="Manage floors"]',
      render: '#viewport-render-button', camera: '#viewport-views-button' };
    const anchor = document.querySelector(selectors[kind] || '#planning-navigation');
    const width = Math.min(kind === 'settings' ? 360 : kind === 'render' ? 350 : 336, innerWidth - 24);
    const r = anchor?.getBoundingClientRect();
    const header = document.querySelector('.studio-header').getBoundingClientRect().bottom;
    const left = Math.max(12, Math.min(r?.left || (innerWidth-width)/2, innerWidth-width-12));
    let top = r && r.top < innerHeight/2 ? r.bottom+9 : header+9;
    top = Math.min(top, Math.max(12, innerHeight-230));
    Object.assign(dialog.style, { width: `${width}px`, left: `${left}px`, top: `${top}px`, margin: '0', maxHeight: `${Math.max(190,innerHeight-top-12)}px` });
  },
  init() {
    document.body.classList.add('experience-shell');
    document.querySelectorAll('.planning-entry button, .studio-file-actions > button').forEach(button => {
      const label = button.textContent.trim();
      if (this.icons[label]) button.innerHTML = this.icon(label) + `<span>${label}</span>`;
    });
    window.addEventListener('resize', () => {
      const dialog = document.querySelector('#studio-dialog[open].experience-popover');
      if (dialog) this.position(dialog, dialog.dataset.kind);
    });
  },
};
const ViewportUI = {
  profile: 'balanced', view: 'iso', projectionMode: 'perspective', exposure: 1.05, environmentTarget: null,
  init() {
    const container = document.getElementById('right-canvas-wrapper');
    const ui = document.createElement('div');
    ui.id = 'viewport-ui';
    ui.innerHTML = `<div class="viewport-topline"><span id="viewport-context">3D workspace</span><span id="viewport-quality">Balanced</span></div>
      <div id="viewport-toolbar" role="toolbar" aria-label="3D viewport controls">
      <button class="viewport-button active" onclick="ViewportUI.orbit()" title="Orbit around the model">Orbit</button>
      <button class="viewport-button" onclick="ViewportUI.walk()" title="Walk through the building with WASD / QE">Walk</button>
      <span class="viewport-divider"></span><button class="viewport-button" onclick="ViewportUI.fit()" title="Fit building in the viewport">Fit</button>
      <button id="viewport-views-button" class="viewport-button" onclick="ViewportUI.viewsDialog()" title="Named views and projection">Views</button>
      <button id="viewport-render-button" class="viewport-button" onclick="ViewportUI.renderDialog()" title="Lighting, shadows and rendering quality">Render</button>
      <button class="viewport-button" onclick="StudioUI.viewToolsDialog()" title="All 3D editing and presentation tools">More</button></div>
      <div class="viewport-orientation" aria-label="Camera orientation"><button onclick="ViewportUI.orient('top')" title="Top view">Top</button><div><button onclick="ViewportUI.orient('left')" title="Left elevation">L</button><button class="viewport-cube" onclick="ViewportUI.orient('iso')" title="Isometric view">ISO</button><button onclick="ViewportUI.orient('right')" title="Right elevation">R</button></div><button onclick="ViewportUI.orient('front')" title="Front elevation">Front</button></div>
      <div class="viewport-bottomline"><span id="viewport-view-label">Perspective · Isometric</span><span id="viewport-model-info">Ready</span></div>`;
    container.append(ui);
    matchMedia('(max-width:600px)').addEventListener('change', event => {
      const panel = document.getElementById('advanced-view-panel');
      if (event.matches && panel) panel.open = false;
    });
    AppEvents.onStateChange(() => this.updateInfo());
    AppEvents.onSelectionChange(() => this.updateInfo());
    const layout = window.setWorkspaceLayout;
    window.setWorkspaceLayout = function(mode) { layout(mode); ViewportUI.advancedMode(mode === '4d'); ViewportUI.updateInfo(); };
    this.updateInfo();
    if (Engine3D.scene) this.engineReady();
    this.advancedMode(StudioUI.mode === '4d');
  },
  advancedMode(enabled) {
    if (enabled === !!this.advancedActive) return;
    this.advancedActive = enabled;
    if (enabled) {
      this.previousProfile = this.profile;
      this.previousSection = Workbench3D.section;
      this.applyProfile('high', false);
      let panel = document.getElementById('advanced-view-panel');
      if (!panel) {
        panel = document.createElement('details');
        panel.id = 'advanced-view-panel'; panel.open = !matchMedia('(max-width:600px)').matches;
        panel.innerHTML = `<summary>4D · Advanced view</summary><p>Studio lighting · textured surfaces · live cutaway</p>
          <label>Inspect floor<select aria-label="Inspect floor" onchange="ViewportUI.inspectFloor(this.value)"></select></label><label>Cutaway height <output id="advanced-cut-label">Full building</output><input aria-label="Cutaway height" type="range" min="5" max="100" value="100" oninput="ViewportUI.cutaway(this.value)"></label>
          <div class="studio-action-grid"><button class="studio-button" onclick="ViewportUI.orient('top')">Floor plan</button><button class="studio-button" onclick="ViewportUI.orient('iso')">Isometric</button><button class="studio-button" onclick="ViewportUI.walk()">Walk inside</button><button class="studio-button" onclick="WorkbenchUI.viewDialog()">Section & measure</button><button class="studio-button" onclick="ViewportUI.renderDialog()">Lighting</button><button class="studio-button" onclick="Workbench3D.isolateSelection()">Isolate selection</button><button class="studio-button" onclick="Workbench3D.clearIsolation();document.querySelector('#advanced-view-panel select').value='all';ViewportUI.inspectFloor('all')">Show building</button><button class="studio-button" onclick="StudioUI.exportDialog()">Capture & export</button></div>`;
        document.getElementById('right-canvas-wrapper').append(panel);
      }
      panel.hidden = false;
      panel.querySelector('select').innerHTML = '<option value="all">Whole building</option>' + Array.from({length:ProjectState.capture().floorCount},(_,floor)=>`<option value="${floor}">${floor===0?'Ground':`Floor ${floor}`}</option>`).join('');
      this.advancedFloor = null;
      this.cutaway(100);
    } else {
      const panel = document.getElementById('advanced-view-panel');
      if (panel) panel.hidden = true;
      Workbench3D.section = this.previousSection || null;
      if (Workbench3D.section) Workbench3D.applySection(); else Workbench3D.clearSection();
      this.applyProfile(this.previousProfile || 'balanced', false);
    }
    request3DUpdate();
  },
  inspectFloor(value) {
    const floor = Number(value);
    this.advancedFloor = value === 'all' || !Number.isInteger(floor) || floor < 0 || floor >= ProjectState.capture().floorCount ? null : floor;
    this.cutaway(this.advancedFloor === null ? 100 : 65);
  },
  cutaway(value) {
    const percent = Math.max(5, Math.min(100, Number(value)));
    if (!Number.isFinite(percent)) return;
    this.cutPercent = percent;
    const box = this.bounds(false);
    if (this.advancedFloor !== null && this.advancedFloor !== undefined) {
      const p = ProjectState.capture(), {SCALE} = get3DEnvironmentParams();
      const base = WorkbenchModel.floorBase(p,this.advancedFloor) * SCALE;
      const height = WorkbenchModel.floorHeight(p,this.advancedFloor) * SCALE;
      Engine3D.renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0,1,0),-base + 2*SCALE),new THREE.Plane(new THREE.Vector3(0,-1,0),base + height*percent/100)];
      Engine3D.needsRender = true;
    } else if (percent === 100 || box.isEmpty()) Workbench3D.clearSection();
    else {
      const top = box.min.y + (box.max.y - box.min.y) * percent / 100;
      Engine3D.renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0,-1,0),top)];
      Engine3D.needsRender = true;
    }
    const label = document.getElementById('advanced-cut-label');
    if (label) label.textContent = percent === 100 ? (this.advancedFloor == null ? 'Full building' : 'Full floor') : `${percent}% height`;
    const slider = document.querySelector('#advanced-view-panel input');
    if (slider) slider.value = percent;
  },
  engineReady() {
    this.profile = PlanningUI.preferences.quality || PlanningUI.readPrefs().quality || 'balanced';
    this.exposure = Number(PlanningUI.preferences.exposure) || 1.05;
    this.applyProfile(this.advancedActive ? 'high' : this.profile, false);
    if (!this.renderHooked) {
      const previous = Engine3D.afterRender;
      Engine3D.afterRender = (now, settled) => { previous?.(now, settled); if (settled || now - (this.lastInfo||0)>150) {this.lastInfo=now;this.updateInfo();} };
      this.renderHooked=true;
    }
    this.updateInfo();
  },
  updateInfo() {
    document.body.dataset.viewportMode = StudioUI.mode;
    const context = document.getElementById('viewport-context');
    if (!context) return;
    const floor = currentFloor === 0 ? 'Ground' : `Floor ${currentFloor}`;
    context.textContent = `${floor} · ${StudioUI.unit === 'ftin' ? 'ft / in' : StudioUI.unit === 'cm' ? 'cm' : 'inches'}`;
    document.getElementById('viewport-quality').textContent = {low:'Draft',balanced:'Balanced',high:'Studio'}[this.profile] || 'Balanced';
    document.getElementById('viewport-view-label').textContent = `${this.projectionMode === 'orthographic' ? 'Orthographic' : 'Perspective'} · ${{iso:'Isometric',top:'Top',front:'Front',right:'Right',left:'Left',back:'Back'}[this.view] || 'Free orbit'}`;
    document.getElementById('viewport-model-info').textContent = `${elements.filter(e=>!e.isFurniture).length} rooms · ${Engine3D.renderer?.info.render.triangles?.toLocaleString() || 0} triangles`;
    document.querySelectorAll('#viewport-toolbar .viewport-button').forEach((button,index) => { if(index<2){ const active=index === (Engine3D.isWalkthrough?1:0); button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active)); } });
    document.querySelectorAll('.viewport-orientation button').forEach(button => button.setAttribute('aria-pressed', String(button.getAttribute('onclick')?.includes(`'${this.view}'`))));
  },
  ensure() { if (!Engine3D.scene || StudioUI.mode === '2d') setWorkspaceLayout('3d'); },
  orbit() {
    this.ensure();
    if (Engine3D.fpsControls.isLocked) Engine3D.fpsControls.unlock();
    Engine3D.isWalkthrough = false; Engine3D.controls.enabled = true; Engine3D.needsRender = true;
  },
  walk() { this.ensure(); this.projection('perspective'); Widget3DEngine.startWalkthrough(); },
  bounds(selectionOnly = false) {
    const box = new THREE.Box3();
    if (selectionOnly && Selection.ids.size && Engine3D.elementObjects) {
      for (const id of Selection.ids) { const object = Engine3D.elementObjects.get(id); if (object) box.expandByObject(object); }
    } else if (Engine3D.buildingGroup) box.setFromObject(Engine3D.buildingGroup);
    return box;
  },
  fit(selectionOnly = false, animated = true) { this.ensure(); this.orient(this.view || 'iso', animated, selectionOnly); },
  orient(view, animated = true, selectionOnly = false) {
    this.ensure();
    const box = this.bounds(selectionOnly);
    if (box.isEmpty()) return;
    this.orbit(); this.view = view;
    const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const directions = {iso:[1,0.85,1],top:[0,1,0.0001],front:[0,0,1],back:[0,0,-1],right:[1,0,0],left:[-1,0,0]};
    const direction = new THREE.Vector3(...(directions[view] || directions.iso)).normalize();
    const camera = Engine3D.camera, aspect = Math.max(0.2,camera.aspect || 1), radius = Math.max(1,size.length()/2);
    // A bounding sphere keeps arbitrary rotated/irregular plans inside either projection.
    const halfFov = Math.atan(Math.tan((camera.fov || 60)*Math.PI/360)*Math.min(1,aspect));
    const distance = radius/Math.sin(halfFov)*1.14;
    if (camera.isOrthographicCamera) {
      const half = radius*1.14/Math.min(1,aspect);
      camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.zoom=1;
    }
    camera.near=Math.max(0.1,radius/10000);camera.far=Math.max(10000,distance*10);camera.updateProjectionMatrix();
    const position=center.clone().addScaledVector(direction,distance);
    if (animated && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Engine3D.cameraTween = { start:performance.now(), duration:280, from:camera.position.clone(), to:position, fromTarget:Engine3D.controls.target.clone(), toTarget:center };
    } else { camera.position.copy(position);Engine3D.controls.target.copy(center);camera.lookAt(center);Engine3D.controls.update(); }
    Engine3D.needsRender=true;this.updateInfo();
  },
  tick(now) {
    const tween=Engine3D.cameraTween;
    if (!tween) return;
    const t=Math.min(1,(now-tween.start)/tween.duration), ease=1-Math.pow(1-t,3);
    Engine3D.camera.position.lerpVectors(tween.from,tween.to,ease);
    Engine3D.controls.target.lerpVectors(tween.fromTarget,tween.toTarget,ease);
    Engine3D.camera.lookAt(Engine3D.controls.target);Engine3D.needsRender=true;
    if (t===1) {Engine3D.cameraTween=null;Engine3D.controls.update();}
  },
  projection(mode) {
    if (!Engine3D.scene) return;
    if (!['perspective','orthographic'].includes(mode) || mode===this.projectionMode) return;
    this.orbit();Engine3D.cameraTween=null;
    const previous=Engine3D.camera;
    if (mode==='orthographic') {
      Engine3D.orthographicCamera ||= new THREE.OrthographicCamera(-500,500,500,-500,0.1,10000);
      Engine3D.orthographicCamera.fov=60;
      Engine3D.camera=Engine3D.orthographicCamera;
    } else Engine3D.camera=Engine3D.perspectiveCamera;
    Engine3D.camera.position.copy(previous.position);Engine3D.camera.quaternion.copy(previous.quaternion);
    Engine3D.camera.aspect=previous.aspect || 1;Engine3D.controls.object=Engine3D.camera;
    if (Workbench3D.controls) Workbench3D.controls.camera=Engine3D.camera;
    this.projectionMode=mode;
    this.orient(this.view,false);this.updateInfo();Engine3D.needsRender=true;
  },
  viewsDialog() {
    this.ensure();
    StudioUI.dialog('Camera views',`<p class="experience-hint">Align the model for plan and elevation review.</p><div class="experience-camera-grid">${[['iso','Isometric'],['top','Top / plan'],['front','Front'],['back','Back'],['left','Left'],['right','Right']].map(([view,label])=>StudioUI.button(label,`ViewportUI.orient('${view}')`)).join('')}</div><label>Projection<select aria-label="Camera projection" onchange="ViewportUI.projection(this.value)"><option value="perspective" ${this.projectionMode==='perspective'?'selected':''}>Perspective</option><option value="orthographic" ${this.projectionMode==='orthographic'?'selected':''}>Orthographic · parallel lines</option></select></label><div class="studio-action-row">${StudioUI.button('Fit selection','ViewportUI.fit(true)')}${StudioUI.button('Named viewpoints','DesignUI.presentationDialog()')}</div><p class="experience-hint">Orthographic removes perspective distortion. Model dimensions remain unchanged.</p>`);
  },
  studioEnvironment() {
    if (this.environmentTarget) return this.environmentTarget.texture;
    const scene=new THREE.Scene();scene.background=new THREE.Color(0x777f8b);
    const geometry=new THREE.PlaneGeometry(6,6), materials=[];
    for (const [position,color,intensity] of [[[4,5,3],0xffffff,3],[[-4,3,1],0xdce8ff,2],[[0,4,-5],0xffedda,2.2]]) {
      const material=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide});material.color.multiplyScalar(intensity);materials.push(material);
      const plane=new THREE.Mesh(geometry,material);plane.position.set(...position);plane.lookAt(0,0,0);scene.add(plane);
    }
    const pmrem=new THREE.PMREMGenerator(Engine3D.renderer);
    try {this.environmentTarget=pmrem.fromScene(scene,0.08,0.1,100);return this.environmentTarget.texture;}
    finally {geometry.dispose();materials.forEach(m=>m.dispose());pmrem.dispose();}
  },
  applyProfile(profile, persist = true) {
    if (!['low','balanced','high'].includes(profile)) return;
    this.profile=profile;
    if (persist) {PlanningUI.preferences.quality=profile;PlanningUI.savePrefs();}
    window.isPerformanceMode=profile==='low';
    if (!Engine3D.renderer) return;
    const renderer=Engine3D.renderer;
    renderer.setPixelRatio(profile==='high'?Math.min(devicePixelRatio,2):1);
    renderer.shadowMap.enabled=profile!=='low';renderer.shadowMap.needsUpdate=true;
    renderer.toneMappingExposure=this.exposure;
    Engine3D.sunLight.shadow.bias=-0.0002;Engine3D.sunLight.shadow.normalBias=0.35;
    const resolution=profile==='high'?2048:1024;
    if (Engine3D.sunLight.shadow.mapSize.x!==resolution) {
      Engine3D.sunLight.shadow.map?.dispose();Engine3D.sunLight.shadow.map=null;
      Engine3D.sunLight.shadow.mapSize.set(resolution,resolution);
    }
    Engine3D.scene.environment=profile==='high'?this.studioEnvironment():null;
    Engine3D.resize(document.getElementById('three-container').clientWidth,document.getElementById('three-container').clientHeight);
    this.modelUpdated(true);this.updateInfo();Engine3D.needsRender=true;
  },
  setExposure(value) {
    const exposure=Number(value);if (!Number.isFinite(exposure)) return;
    this.exposure=Math.max(0.6,Math.min(1.8,exposure));PlanningUI.preferences.exposure=this.exposure;PlanningUI.savePrefs();
    Engine3D.renderer.toneMappingExposure=this.exposure;Engine3D.needsRender=true;
    const label=document.getElementById('viewport-exposure-value');if(label)label.textContent=this.exposure.toFixed(2);
  },
  renderDialog() {
    this.ensure();
    StudioUI.dialog('3D rendering',`<div class="experience-render-profiles" role="group" aria-label="Rendering quality">${[['low','Draft'],['balanced','Balanced'],['high','Studio']].map(([value,label])=>`<button class="studio-button ${this.profile===value?'active':''}" aria-pressed="${this.profile===value}" onclick="ViewportUI.applyProfile('${value}');ViewportUI.renderDialog()">${label}</button>`).join('')}</div><p class="experience-hint">${{low:'Fast navigation · no shadows · native 1× resolution',balanced:'Soft shadows · 1× resolution · efficient editing',high:'Studio reflections · detailed shadows · up to 2× resolution'}[this.profile]}</p><label>Exposure <output id="viewport-exposure-value">${this.exposure.toFixed(2)}</output><input aria-label="Render exposure" type="range" min="0.6" max="1.8" step="0.05" value="${this.exposure}" oninput="ViewportUI.setExposure(this.value)"></label><label>Sun position<input aria-label="Sun position" type="range" min="6" max="18" step="0.25" value="${Widget3DEngine.sunHour || 12}" oninput="updateSunlight(Number(this.value));Engine3D.needsRender=true"></label><div class="experience-render-toggles"><label><input type="checkbox" ${Engine3D.gridHelper.visible?'checked':''} onchange="Engine3D.gridHelper.visible=this.checked;Engine3D.needsRender=true">Ground grid</label><label><input type="checkbox" ${CanvasControlsEngine.isReal3D()?'checked':''} onchange="StudioUI.toggleView('real3DToggle',this.checked)">Textures</label><label><input type="checkbox" ${Workbench3D.labelsEnabled?'checked':''} onchange="Workbench3D.labelsEnabled=this.checked">Room labels</label></div><p class="experience-hint">Lighting is a visual aid, not a daylight or energy compliance calculation.</p>`);
  },
  modelUpdated(force = false) {
    if (!Engine3D.buildingGroup) return;
    const signature=Engine3D.modelSignature;
    if (!force && this.lastModel===signature) return;
    this.lastModel=signature;
    const box=this.bounds();
    if (!box.isEmpty()) {
      const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),extent=Math.max(size.length()*0.6,100);
      const shadow=Engine3D.sunLight.shadow.camera;
      Engine3D.sunLight.target.position.copy(center);
      if (!Engine3D.sunLight.target.parent) Engine3D.scene.add(Engine3D.sunLight.target);
      shadow.left=-extent;shadow.right=extent;shadow.top=extent;shadow.bottom=-extent;shadow.far=Math.max(3000,extent*8);shadow.updateProjectionMatrix();
      Engine3D.renderer.shadowMap.needsUpdate=true;
    }
    if (this.advancedActive && this.cutPercent < 100) this.cutaway(this.cutPercent);
    if (!this.initialFit && !box.isEmpty()) {this.initialFit=true;this.orient('iso',false);}
    this.updateInfo();
  },
};
const experienceDialog = StudioUI.dialog;
StudioUI.dialog = function(title, html) {
  const previous = document.querySelector('#studio-dialog[open]');
  const widget = PlanningUI.openingWidget || (previous?.dataset.widget && previous.querySelector('.studio-dialog-header strong')?.textContent === title ? previous.dataset.widget : null);
  const dialog=experienceDialog.call(this,title,html);
  WorkspaceExperience.decorate(dialog,title,widget);
  return dialog;
};
const experienceQuality = PlanningUI.quality;
PlanningUI.quality = function() { experienceQuality.call(this);ViewportUI.applyProfile(this.preferences.quality,false); };
const experienceFit3D = PlanningUI.fit3D;
PlanningUI.fit3D = function(selectionOnly=false) { if(Engine3D.camera?.isOrthographicCamera) ViewportUI.fit(selectionOnly,false);else experienceFit3D(selectionOnly); };
document.addEventListener('DOMContentLoaded',()=>{WorkspaceExperience.init();ViewportUI.init();});
