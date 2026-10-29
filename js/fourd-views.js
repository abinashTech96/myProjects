/* Shared, interruptible presentation navigation and reversible viewing effects.
 * Camera/reveal/daylight previews never alter architectural coordinates. */
window.FourDViews = {
  history: [], kind: 'building', reveal: true, motion: 'normal',
  reset() {
    this.stop();this.history=[];this.kind='building';this.floorIndex=null;this.elementId=null;
    this.restoreReveal();this.mount();this.bind();this.breadcrumbs();
    try {this.motion=localStorage.getItem('ArchCAD_4D_Motion')||'normal';}catch{}
  },
  mount() {
    if(document.getElementById('fourd-breadcrumbs'))return;
    const bar=document.createElement('nav');bar.id='fourd-breadcrumbs';bar.setAttribute('aria-label','4D view navigation');
    document.getElementById('fourd-workspace').append(bar);
  },
  bind() {
    if(this.controls===Engine3D.controls)return;
    this.controls=Engine3D.controls;
    this.controls.addEventListener('start',()=>this.cancel('input'));
    const canvas=Engine3D.renderer.domElement;
    canvas.addEventListener('wheel',()=>this.cancel('input'),{passive:true});
    canvas.addEventListener('pointerdown',()=>this.cancel('input'),{passive:true});
  },
  breadcrumbs() {
    const node=document.getElementById('fourd-breadcrumbs');if(!node)return;
    const selected=elements[selectedElIndex], floor=this.floorIndex??selected?.floor??currentFloor;
    const b=(label,action,active=false,disabled=false)=>`<button class="studio-button" ${active?'aria-current="page"':''} ${disabled?'disabled':''} onclick="${action}">${ProjectModel.escapeHTML(label)}</button>`;
    node.innerHTML=b('← Back','FourDViews.back()',false,!this.history.length)+b('Plot',"FourDViews.plot()",this.kind==='plot')+
      b('Building','StudioEnhancements.fullView()',this.kind==='building')+b(floor===0?'Ground':'Floor '+floor,`FourDViews.floor(${floor})`,this.kind==='floor')+
      (this.kind==='element'||this.kind==='material'?b(elements.find(e=>e.id===this.elementId)?.customName||elements.find(e=>e.id===this.elementId)?.type||'Element','FourDViews.focus()',true):'');
  },
  pose() {
    return {position:Engine3D.camera.position.toArray(),target:Engine3D.controls.target.toArray(),
      kind:this.kind,floor:this.floorIndex,element:this.elementId,focus:StudioEnhancements.focusRoom,
      planes:Engine3D.renderer.clippingPlanes.map(p=>[...p.normal.toArray(),p.constant]),
      projection:ViewportUI.projectionMode,zoom:Engine3D.camera.zoom,explosion:StudioEnhancements.explosion,
      material:!!this.materialMode,inspection:this.inspectionPoint?structuredClone(this.inspectionPoint):null};
  },
  remember() {this.history.push(this.pose());if(this.history.length>24)this.history.shift();},
  cancel(reason='navigation') {
    if(['input','suspend','model-update','pause','stop'].includes(reason)&&window.FourDPerformance?.active)FourDPerformance.cancel(reason);
    if(window.FourDReview?.queueActive&&!FourDReview.queueMoving&&['input','suspend','model-update','navigation','pause','stop'].includes(reason))FourDReview.cancelQueue();
    Engine3D.cameraTween=null;this.transition=null;this.transitionPlanes=null;
    clearTimeout(this.tourTimer);this.tourTimer=null;
    if(reason!=='tour')this.tourPlaying=false;
    if(FourDWorkspace.running) {StudioEnhancements.navigation(false);Engine3D.needsRender=true;}
    this.tourStatus();
  },
  suspend() {this.cancel('suspend');clearTimeout(this.dayTimer);this.dayTimer=null;this.dayPlaying=false;},
  stop() {
    this.suspend();this.restoreReveal();this.resetDaylight();this.materialMode=false;this.restoreLight();
    this.history=[];this.tourIndex=0;this.breadcrumbs();
  },
  fit(box,direction=new THREE.Vector3(1,.85,1)) {
    const camera=Engine3D.camera, center=box.getCenter(new THREE.Vector3()), radius=Math.max(4,box.getSize(new THREE.Vector3()).length()/2);
    direction.normalize();
    const framing=camera.isPerspectiveCamera&&FourDStudio.settings.lens?camera.clone():camera;
    if(framing!==camera)framing.setFocalLength(FourDStudio.settings.lens);
    const frame=WorkspaceLayout.frame(framing,center,direction,radius);
    camera.near=Math.max(.1,radius/10000);camera.far=Math.max(10000,frame.distance*10);camera.updateProjectionMatrix();
    return {position:frame.center.clone().addScaledVector(direction,frame.distance),target:frame.center};
  },
  reframe() {
    if(window.FourDPerformance?.profileRunning)return;
    if(!FourDWorkspace.running||FourDWorkspace.paused||document.hidden||StudioEnhancements.walking||this.materialMode||FourDReview.queueActive)return;
    let box=this.modelBox(this.kind==='floor'?this.floorIndex:null);const p=StudioEnhancements.modelProject||ProjectState.capture(),{SCALE:S,I}=get3DEnvironmentParams();
    if(this.inspectionPoint){const q=this.inspectionPoint,point=new THREE.Vector3(I.x+q.x*S,q.z*S,I.z+q.y*S);box=new THREE.Box3(point.clone().addScalar(-30*S),point.clone().addScalar(30*S));}
    else if(['element','material'].includes(this.kind)) {
      const el=p.elements.find(e=>e.id===this.elementId);if(!el)return;
      const b=PresentationModel.bounds(el),base=WorkbenchModel.roomBase(p,el),h=el.isFurniture?(el.customHeight||36):WorkbenchModel.floorHeight(p,el.floor)*.7;
      box=new THREE.Box3(new THREE.Vector3(I.x+b.x*S,base*S,I.z+b.y*S),new THREE.Vector3(I.x+(b.x+b.w)*S,(base+h)*S,I.z+(b.y+b.h)*S));
    } else if(this.kind==='plot') {for(const q of WorkbenchModel.boundary(p))box.expandByPoint(new THREE.Vector3(I.x+q.x*S,0,I.z+q.y*S));if(Engine4D.landscape)box.expandByObject(Engine4D.landscape);}
    const direction=Engine3D.camera.position.clone().sub(Engine3D.controls.target).normalize(),pose=this.fit(box,direction);
    this.move(pose.position,pose.target,{duration:250,layout:true});
  },
  modelBox(floor) {
    const p=StudioEnhancements.modelProject||ProjectState.capture(),box=new THREE.Box3(),{SCALE:S,I}=get3DEnvironmentParams();
    for(const e of p.elements.filter(e=>!e.isFurniture&&(floor==null||e.floor===floor))) {
      const b=PresentationModel.bounds(e),base=WorkbenchModel.roomBase(p,e),h=WorkbenchModel.floorHeight(p,e.floor);
      box.expandByPoint(new THREE.Vector3(I.x+b.x*S,base*S,I.z+b.y*S));
      box.expandByPoint(new THREE.Vector3(I.x+(b.x+b.w)*S,(base+h)*S,I.z+(b.y+b.h)*S));
    }
    if(box.isEmpty())return Engine4D.modelBounds.clone();
    return box;
  },
  boundsPlanes() {
    if(!['element','material','floor'].includes(this.kind))return [];
    const p=StudioEnhancements.modelProject||ProjectState.capture(), {SCALE:S,I}=get3DEnvironmentParams();
    let box;
    if(this.kind==='floor')box=this.modelBox(this.floorIndex);
    else {
      const e=p.elements.find(e=>e.id===this.elementId);if(!e)return [];
      const b=PresentationModel.bounds(e),base=WorkbenchModel.roomBase(p,e),height=e.isFurniture?(e.customHeight||36):WorkbenchModel.floorHeight(p,e.floor);
      box=new THREE.Box3(new THREE.Vector3(I.x+b.x*S,base*S,I.z+b.y*S),new THREE.Vector3(I.x+(b.x+b.w)*S,(base+height)*S,I.z+(b.y+b.h)*S));
    }
    const margin=p.wallSettings.external*S*.6;
    box=box.clone().expandByScalar(margin);
    return [new THREE.Plane(new THREE.Vector3(1,0,0),-box.min.x),new THREE.Plane(new THREE.Vector3(-1,0,0),box.max.x),
      new THREE.Plane(new THREE.Vector3(0,0,1),-box.min.z),new THREE.Plane(new THREE.Vector3(0,0,-1),box.max.z)];
  },
  clipValues(planes) {
    const b=Engine4D.modelBounds, margin=Math.max(100,b.getSize(new THREE.Vector3()).length());
    const defaultTop=b.max.y+margin,defaultBottom=b.min.y-margin;
    return [planes.find(p=>p.normal.y<-.99)?.constant??defaultTop,
      -(planes.find(p=>p.normal.y>.99)?.constant??-defaultBottom)];
  },
  move(position,target,{fromPlanes,complete,duration,tour=false,layout=false}={}) {
    if(!FourDWorkspace.running||FourDWorkspace.paused)return;
    this.cancel(tour?'tour':'navigation');
    if(!layout&&document.querySelector('[data-review-tab="context"]'))FourDReview.panel('context');
    const camera=Engine3D.camera, controls=Engine3D.controls;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||this.motion==='off';
    const ms=duration??(this.motion==='gentle'?850:520);
    const from=camera.position.clone(), fromTarget=controls.target.clone(),
      startClip=this.clipValues(fromPlanes||Engine4D.renderer.clippingPlanes),
      endClip=this.clipValues(StudioEnhancements.clipping(Engine3D.renderer.clippingPlanes));
    const crosses=(StudioEnhancements.wallBoxes||[]).some(b=>{
      const ray=new THREE.Ray(from,position.clone().sub(from).normalize()),hit=ray.intersectBox(b,new THREE.Vector3());
      return hit&&hit.distanceTo(from)<from.distanceTo(position);
    });
    if(reduced) {
      camera.position.copy(position);controls.target.copy(target);camera.lookAt(target);controls.update();
      this.breadcrumbs();complete?.();Engine3D.needsRender=true;return;
    }
    const roof=Engine4D.modelBounds.max.y+Math.max(30,Engine4D.modelBounds.getSize(new THREE.Vector3()).length()*.08);
    this.transition={start:performance.now(),duration:Math.max(180,Math.min(6000,ms)),from,to:position.clone(),fromTarget,toTarget:target.clone(),startClip,endClip,
      route:crosses&&from.distanceTo(position)>80?Math.max(roof,from.y,position.y):null,complete};
    Engine3D.cameraTween={managed4d:true};
    Engine3D.controls.autoRotate=false;
    StudioEnhancements.navigation(true);window.FourDRender?.cancelPhoto();Engine3D.needsRender=true;this.breadcrumbs();
  },
  tick(now) {
    const t=this.transition;if(!t)return;
    if(!FourDWorkspace.running||FourDWorkspace.paused||document.hidden){this.suspend();return;}
    const raw=Math.min(1,(now-t.start)/t.duration),ease=x=>x*x*x*(x*(x*6-15)+10),v=ease(raw),camera=Engine3D.camera;
    camera.position.lerpVectors(t.from,t.to,v);
    if(t.route!=null) {
      if(raw<.22) {camera.position.copy(t.from);camera.position.y=THREE.MathUtils.lerp(t.from.y,t.route,ease(raw/.22));}
      else if(raw<.78) {camera.position.lerpVectors(t.from,t.to,ease((raw-.22)/.56));camera.position.y=t.route;}
      else {camera.position.copy(t.to);camera.position.y=THREE.MathUtils.lerp(t.route,t.to.y,ease((raw-.78)/.22));}
    }
    Engine3D.controls.target.lerpVectors(t.fromTarget,t.toTarget,v);camera.lookAt(Engine3D.controls.target);
    this.transitionPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),THREE.MathUtils.lerp(t.startClip[0],t.endClip[0],v)),
      new THREE.Plane(new THREE.Vector3(0,1,0),-THREE.MathUtils.lerp(t.startClip[1],t.endClip[1],v))];
    if(raw===1) {
      this.transition=null;this.transitionPlanes=null;Engine3D.cameraTween=null;Engine3D.controls.update();
      StudioEnhancements.navigation(false);t.complete?.();
    }
    Engine3D.needsRender=true;
  },
  clearFilters() {
    this.inspectionPoint=null;
    window.FourDReview?.showNote('');
    StudioEnhancements.cancelPreview();StudioEnhancements.stopWalk();StudioEnhancements.setFocus(false);
    StudioEnhancements.focusRoom=null;StudioEnhancements.explosion=0;StudioEnhancements.explodedBounds=null;Workbench3D.clearIsolation();
    StudioEnhancements.clearSection(false);ViewportUI.inspectFloor('all');
    this.materialMode=false;this.restoreLight();
  },
  building(remember=true) {
    if(!FourDWorkspace.running||FourDWorkspace.paused)return;
    if(remember)this.remember();const from=Engine4D.renderer.clippingPlanes.map(p=>p.clone());
    this.clearFilters();FourDWorkspace.clearSelection();
    this.kind='building';this.floorIndex=null;this.elementId=null;ViewportUI.view='iso';
    const pose=this.fit(this.modelBox());this.move(pose.position,pose.target,{fromPlanes:from});
  },
  plot() {
    if(!FourDWorkspace.running||FourDWorkspace.paused)return;
    this.remember();const from=Engine4D.renderer.clippingPlanes.map(p=>p.clone());this.clearFilters();FourDWorkspace.clearSelection();
    const p=ProjectState.capture(),box=this.modelBox(),{SCALE:S,I}=get3DEnvironmentParams();
    for(const q of WorkbenchModel.boundary(p))box.expandByPoint(new THREE.Vector3(I.x+q.x*S,0,I.z+q.y*S));
    if(Engine4D.landscape)box.expandByObject(Engine4D.landscape);
    this.kind='plot';this.floorIndex=null;this.elementId=null;
    const pose=this.fit(box,new THREE.Vector3(1,1.1,1));this.move(pose.position,pose.target,{fromPlanes:from});
  },
  floor(value) {
    const n=Number(value);if(value==='all')return this.building();
    if(!FourDWorkspace.running||FourDWorkspace.paused||!Number.isInteger(n)||n<0||n>=ProjectState.capture().floorCount)return;
    this.remember();const from=Engine4D.renderer.clippingPlanes.map(p=>p.clone());this.clearFilters();FourDWorkspace.clearSelection();
    ViewportUI.inspectFloor(n);this.kind='floor';this.floorIndex=n;this.elementId=null;
    const box=this.modelBox(n);const pose=this.fit(box,new THREE.Vector3(.45,1,.65));this.move(pose.position,pose.target,{fromPlanes:from});
  },
  focus() {
    if(!FourDWorkspace.running||FourDWorkspace.paused)return;
    const e=elements[selectedElIndex]||elements.find(e=>e.id===this.elementId);if(!e)return;
    this.remember();const from=Engine4D.renderer.clippingPlanes.map(p=>p.clone());this.clearFilters();
    StudioEnhancements.focusRoom=e.id;this.elementId=e.id;this.floorIndex=e.floor;this.kind='element';
    StudioEnhancements.close();
    if(FourDWorkspace.annotationPreference!=='off')FourDWorkspace.setAnnotations(FourDWorkspace.annotationPreference,false);
    const {SCALE:S,I}=get3DEnvironmentParams(),b=PresentationModel.bounds(e),base=WorkbenchModel.roomBase(ProjectState.capture(),e),
      height=e.isFurniture?(e.customHeight||36):WorkbenchModel.floorHeight(ProjectState.capture(),e.floor),box=new THREE.Box3(
        new THREE.Vector3(I.x+b.x*S,base*S,I.z+b.y*S),new THREE.Vector3(I.x+(b.x+b.w)*S,(base+height*.7)*S,I.z+(b.y+b.h)*S));
    const pose=this.fit(box,new THREE.Vector3(.7,1,.9));this.move(pose.position,pose.target,{fromPlanes:from});
    StudioEnhancements.updateFocusReadout();
  },
  back() {
    if(!FourDWorkspace.running||FourDWorkspace.paused)return;
    const pose=this.history.pop();if(!pose)return;
    this.restorePose(pose);this.breadcrumbs();
  },
  projection(mode) {
    const position=Engine3D.camera.position.clone(),target=Engine3D.controls.target.clone();
    ViewportUI.projection(mode);
    Engine3D.camera.position.copy(position);Engine3D.controls.target.copy(target);Engine3D.camera.lookAt(target);Engine3D.controls.update();
  },
  restorePose(pose,options={}) {
    const from=Engine4D.renderer.clippingPlanes.map(p=>p.clone());this.clearFilters();
    if(pose.element&&!elements.some(e=>e.id===pose.element))return this.building(false);
    if(pose.floor!=null&&pose.floor>=ProjectState.capture().floorCount)return this.building(false);
    this.projection(pose.projection||'perspective');
    this.kind=pose.kind;this.floorIndex=pose.floor;this.elementId=pose.element;
    this.inspectionPoint=pose.inspection?structuredClone(pose.inspection):null;
    StudioEnhancements.focusRoom=pose.focus;ViewportUI.advancedFloor=pose.floor;
    Engine3D.renderer.clippingPlanes=pose.planes.map(a=>new THREE.Plane(new THREE.Vector3(...a.slice(0,3)),a[3]));
    StudioEnhancements.explosion=pose.explosion||0;this.materialMode=pose.material?'floor':false;
    Engine3D.camera.zoom=pose.zoom||1;Engine3D.camera.updateProjectionMatrix();
    this.move(new THREE.Vector3(...pose.position),new THREE.Vector3(...pose.target),{...options,fromPlanes:from});
  },
  setMotion(value) {this.motion=['normal','gentle','off'].includes(value)?value:'normal';try{localStorage.setItem('ArchCAD_4D_Motion',this.motion);}catch{}if(this.motion==='off')this.cancel();},
  panel() {
    const b=(l,a)=>StudioUI.button(l,a),s=FourDStudio.settings;
    WorkspacePanels.intent='4D';
    StudioUI.dialog('4D presentation',`<div class="studio-action-grid">${b('Plot view','FourDViews.plot()')}${b('Full building','StudioEnhancements.fullView()')}${b('Focus element','FourDViews.focus()')}${b('Back','FourDViews.back()')}</div><label>Inspect floor<select aria-label="Presentation floor" onchange="FourDViews.floor(this.value)"><option value="all">Whole building</option>${Array.from({length:ProjectState.capture().floorCount},(_,i)=>`<option value="${i}" ${this.floorIndex===i?'selected':''}>${i===0?'Ground':'Floor '+i}</option>`).join('')}</select></label><label>View transition<select aria-label="4D motion" onchange="FourDViews.setMotion(this.value)">${['normal','gentle','off'].map(v=>`<option ${this.motion===v?'selected':''}>${v}</option>`).join('')}</select></label><label><input type="checkbox" ${this.reveal?'checked':''} onchange="FourDViews.reveal=this.checked;Engine3D.needsRender=true">Reveal focused interiors through nearby walls</label><div class="studio-action-grid">${b('Daylight preview','FourDViews.daylightPanel()')}${b('Finish close-up','FourDViews.materialPanel()')}${b('Guided tour','FourDViews.tourPanel()')}${b('Lighting & garden','Engine4D.lightingDialog()')}</div><fieldset><legend>Lighting mood</legend><div class="studio-action-grid">${b('Daylight',"FourDViews.realism('daylight')")}${b('Warm interior',"FourDViews.realism('interior')")}${b('Soft overcast',"FourDViews.realism('studio')")}${b('Golden hour',"FourDViews.realism('golden-hour')")}${b('Courtyard daylight',"FourDViews.realism('courtyard')")}</div></fieldset><label><input type="checkbox" ${s.progressive?'checked':''} onchange="FourDStudio.change('progressive',this.checked)">Refine stills after navigation</label><p>Navigation reduces costly effects. Shadows, reflections and optional still refinement return after settling. Higher quality stills use the existing Photo controls.</p>`);
  },
  realism(value) {
    if(!FourDWorkspace.running||FourDWorkspace.paused||!['daylight','interior','studio','golden-hour','courtyard'].includes(value))return;
    this.resetDaylight();this.materialMode=false;this.restoreLight();
    Engine4D.setPreset(value);
    ProjectState.commit('Changed architectural lighting mood',()=>{
      FourDStudio.settings.environment=value==='golden-hour'||value==='courtyard'?value:value==='studio'?'overcast':value==='interior'?'sunset':'studio';
      ProjectState.meta.design.presentation.lights.enabled=true;
    });
    Engine3D.needsRender=true;
  },
  daylightPanel() {
    WorkspacePanels.intent='4D';const hour=this.dayHour??ProjectState.meta.design.site.hour;
    StudioUI.dialog('Daylight preview',`<label>Local hour<input aria-label="Daylight hour" type="range" min="0" max="24" step="0.1" value="${hour}" oninput="FourDViews.previewDay(Number(this.value))"></label><output id="fourd-day-value">${hour.toFixed(1)} h</output><div class="studio-action-grid">${StudioUI.button('Play / Pause','FourDViews.playDaylight()')}${StudioUI.button('Reset preview','FourDViews.resetDaylight()')}${StudioUI.button('Apply hour','FourDViews.applyDaylight()')}${StudioUI.button('Site & date','DesignUI.sunDialog()')}</div><p>Uses your saved site latitude, longitude, date and UTC offset. This is a visual solar preview. Applying the hour is undoable.</p>`);
  },
  previewDay(hour) {
    if(!FourDWorkspace.running||FourDWorkspace.paused||!Number.isFinite(hour))return;
    this.dayBaseline||={fill:Engine4D.fill.intensity};
    this.dayHour=Math.max(0,Math.min(24,hour));window.FourDRender?.cancelPhoto();
    const label=document.getElementById('fourd-day-value');if(label)label.textContent=this.dayHour.toFixed(1)+' h';
    Engine3D.needsRender=true;
  },
  playDaylight() {
    if(this.dayPlaying){this.dayPlaying=false;clearTimeout(this.dayTimer);return;}
    if(!FourDWorkspace.running||FourDWorkspace.paused||document.hidden)return;
    this.dayPlaying=true;
    const step=()=>{
      if(!this.dayPlaying||!FourDWorkspace.running||FourDWorkspace.paused||document.hidden)return;
      const next=(this.dayHour??6)+.1;this.previewDay(next);
      const input=document.querySelector('[aria-label="Daylight hour"]');if(input)input.value=this.dayHour;
      if(next>=20){this.dayPlaying=false;return;}
      this.dayTimer=setTimeout(step,100);
    };if((this.dayHour??6)>=20)this.dayHour=6;step();
  },
  resetDaylight() {clearTimeout(this.dayTimer);this.dayPlaying=false;this.dayHour=null;if(this.dayBaseline&&Engine4D.fill)Engine4D.fill.intensity=this.dayBaseline.fill;this.dayBaseline=null;Engine3D.needsRender=true;},
  applyDaylight() {
    if(this.dayHour==null)return;
    const hour=this.dayHour;ProjectState.commit('Applied daylight preview',()=>{ProjectState.meta.design.site.hour=hour;});
    StudioEnhancements.sunStudy=true;this.resetDaylight();
  },
  materialPanel() {
    const e=elements[selectedElIndex];if(!e){StudioUI.message('Select an element to inspect its finish.','info');return;}
    WorkspacePanels.intent='4D';const surface=ProjectState.meta.design.presentation.surfaces[e.id]||{};
    StudioUI.dialog('Finish close-up',`<p>${ProjectModel.escapeHTML(e.customName||e.type)} · uses the actual model surface and saved texture scale.</p><div class="studio-action-grid">${['floor',...(!e.isFurniture?['wall','ceiling']:[])].map(c=>StudioUI.button(c,`FourDViews.materialCloseup('${c}')`)).join('')}${StudioUI.button('Edit finish','StudioEnhancements.run(()=>StudioEnhancements.materials())')}${StudioUI.button('Return to previous view','FourDViews.back()')}</div><p>${Object.entries(surface).map(([c,s])=>ProjectModel.escapeHTML(c+': '+s.type+' · scale '+s.scale)).join('<br>')||'Using the element’s default finish.'}</p><p>Close-up uses neutral lighting temporarily. Finishes and dimensions remain unchanged.</p>`);
  },
  materialCloseup(channel) {
    const e=elements[selectedElIndex];if(!e||!FourDWorkspace.running||FourDWorkspace.paused)return;
    this.remember();const from=Engine4D.renderer.clippingPlanes.map(p=>p.clone());this.clearFilters();
    const {SCALE:S,I}=get3DEnvironmentParams(),p=ProjectState.capture(),b=PresentationModel.bounds(e),base=WorkbenchModel.roomBase(p,e),h=e.isFurniture?(e.customHeight||36):WorkbenchModel.floorHeight(p,e.floor),
      target=new THREE.Vector3(I.x+(b.x+b.w/2)*S,(base+1)*S,I.z+(b.y+b.h/2)*S),near=Math.max(18,Math.min(72,b.w*.35,b.h*.35))*S;
    let position=target.clone().add(new THREE.Vector3(near*.35,near,near*.35));
    if(channel==='wall') {target.set(I.x+(b.x+b.w/2)*S,(base+h*.45)*S,I.z+b.y*S);position=target.clone().add(new THREE.Vector3(0,0,near));}
    if(channel==='ceiling') {target.y=(base+h-1)*S;position=target.clone().add(new THREE.Vector3(near*.2,-near,near*.2));}
    StudioEnhancements.focusRoom=e.id;this.kind='material';this.elementId=e.id;this.floorIndex=e.floor;
    // Keep the actual ceiling visible without changing a saved surface assignment.
    this.materialMode=channel;this.move(position,target,{fromPlanes:from});StudioEnhancements.close();
  },
  restoreLight() {
    if(!this.neutralLight||!Engine4D.key)return;
    Engine4D.key.color.copy(this.neutralLight.key);Engine4D.fill.color.copy(this.neutralLight.fill);
    Engine4D.fill.intensity=this.neutralLight.intensity;this.neutralLight=null;
  },
  restoreReveal() {
    for(const [mesh,state] of this.faded||[]) {for(const [m,values] of state.materials){Object.assign(m,values);m.needsUpdate=true;}mesh.castShadow=state.shadow;}
    this.faded=new Map();
  },
  effects(camera) {
    for(const mirror of window.FourDRender?.mirrors||[]) {
      const owner=(StudioEnhancements.modelProject?.elements||elements).find(e=>e.id===mirror.userData.elementId);
      if((['element','material'].includes(this.kind)&&owner?.id!==this.elementId)||(this.kind==='floor'&&owner?.floor!==this.floorIndex))FourDStudio.hide(mirror);
    }
    if(Engine4D.landscape)Engine4D.landscape.visible=["building","plot"].includes(this.kind)&&Engine4D.landscapeEnabled!==false;
    if(this.dayHour!=null||StudioEnhancements.sunStudy) {
      const site={...ProjectState.meta.design.site,hour:this.dayHour??ProjectState.meta.design.site.hour},sun=DesignModel.sun(site),a=sun.azimuth*Math.PI/180,h=sun.altitude*Math.PI/180,
        center=Engine4D.modelBounds.getCenter(new THREE.Vector3()),radius=Math.max(1000,Engine4D.modelBounds.getSize(new THREE.Vector3()).length()*1.5);
      Engine4D.key.position.copy(center).add(new THREE.Vector3(Math.sin(a)*radius*Math.cos(h),Math.sin(h)*radius,-Math.cos(a)*radius*Math.cos(h)));
      Engine4D.key.intensity=3.2*Math.max(0,Math.sin(h))*WorkspaceLayout.sunValue()/100;
      Engine4D.fill.intensity=sun.altitude>0?1.15:.12;
      if(this.lastDay!==JSON.stringify(site)){this.lastDay=JSON.stringify(site);Engine4D.renderer.shadowMap.needsUpdate=true;}
    }
    if(this.materialMode) {
      this.neutralLight||={key:Engine4D.key.color.clone(),fill:Engine4D.fill.color.clone(),intensity:Engine4D.fill.intensity};
      Engine4D.key.color.set(0xffffff);Engine4D.fill.color.set(0xffffff);Engine4D.key.intensity=2.2;Engine4D.fill.intensity=1.4;
    } else this.restoreLight();
    const target=new Set(), e=elements.find(e=>e.id===this.elementId);
    if(this.reveal&&e&&!e.isFurniture&&['element','material'].includes(this.kind)) {
      const {SCALE:S,I}=get3DEnvironmentParams(),b=PresentationModel.bounds(e),point=new THREE.Vector3(I.x+(b.x+b.w/2)*S,(WorkbenchModel.roomBase(ProjectState.capture(),e)+36)*S,I.z+(b.y+b.h/2)*S),
        direction=point.clone().sub(camera.position),ray=new THREE.Raycaster(camera.position,direction.clone().normalize(),0,direction.length()*.98);
      for(const hit of ray.intersectObject(Engine4D.model,true))if(hit.object.userData.isWall&&hit.object.visible)target.add(hit.object);
    }
    this.faded||=new Map();let changing=false;
    const now=performance.now(),alpha=matchMedia("(prefers-reduced-motion: reduce)").matches?1:1-Math.exp(-Math.min(80,now-(this.effectTime||now-16))/70);this.effectTime=now;
    for(const mesh of target) if(!this.faded.has(mesh))this.faded.set(mesh,{shadow:mesh.castShadow,materials:[].concat(mesh.material).map(m=>[m,{opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite}]),amount:1});
    for(const [mesh,state] of this.faded) {
      const desired=target.has(mesh) ? .16 : 1;
      state.amount+= (desired-state.amount)*alpha;
      if(Math.abs(state.amount-desired)>.015)changing=true;else state.amount=desired;
      for(const [m,values] of state.materials){const transparent=state.amount<1||values.transparent;if(m.transparent!==transparent)m.needsUpdate=true;m.opacity=values.opacity*state.amount;m.transparent=transparent;m.depthWrite=state.amount===1&&values.depthWrite;}
      const shadow=state.amount===1&&state.shadow;if(mesh.castShadow!==shadow)Engine4D.renderer.shadowMap.needsUpdate=true;mesh.castShadow=shadow;
      if(state.amount===1){for(const [m,values] of state.materials)Object.assign(m,values);this.faded.delete(mesh);}
    }
    if(changing)Engine3D.needsRender=true;
  },
  tourPanel() {
    WorkspacePanels.intent='4D';const s=FourDStudio.settings;
    StudioUI.dialog('Guided camera tour',`<label>Stop name<input id="fourd-stop-name" maxlength="60" placeholder="Entrance, bedroom, garden…"></label>${StudioUI.button('Save current view','FourDViews.saveStop()')}<label>Tour speed<select aria-label="Tour speed" onchange="FourDViews.tourSpeed(Number(this.value))">${[.5,1,1.5,2,3].map(v=>`<option value="${v}" ${s.tourSpeed===v?'selected':''}>${v}×</option>`).join('')}</select></label><div class="studio-action-grid">${StudioUI.button('Play / Resume','FourDViews.playTour()')}${StudioUI.button('Pause','FourDViews.pauseTour()')}${StudioUI.button('Stop','FourDViews.stopTour()')}</div><p id="fourd-tour-status" role="status"></p>${s.guidedStops.map((v,i)=>`<div class="fourd-row"><span>${i+1}. ${ProjectModel.escapeHTML(v.name)}</span>${StudioUI.button('Go',`FourDViews.goStop(${i})`)}${StudioUI.button('↑',`FourDViews.reorderStop(${i},-1)`)}${StudioUI.button('↓',`FourDViews.reorderStop(${i},1)`)}${StudioUI.button('Remove',`FourDViews.removeStop(${i})`)}</div>`).join('')}<p>Up to 24 stops, saved with project JSON and undo/redo. Camera travel lifts above walls when a direct route crosses them. Manual navigation pauses playback. Reduced motion switches directly between stops.</p>`);this.tourStatus();
  },
  saveStop() {
    if(!FourDWorkspace.running||FourDStudio.settings.guidedStops.length>=24)return;
    const name=document.getElementById('fourd-stop-name')?.value.trim()||'View '+(FourDStudio.settings.guidedStops.length+1),p=this.pose();
    const point=v=>Workbench3D.modelPoint(new THREE.Vector3(...v));
    ProjectState.commit('Saved guided camera stop',()=>FourDStudio.settings.guidedStops.push({name,position:point(p.position),target:point(p.target),kind:p.kind,floor:p.floor,element:p.element,projection:p.projection,zoom:p.zoom,materialChannel:this.materialMode||'floor'}));
    this.tourPanel();
  },
  tourSpeed(value) {if([.5,1,1.5,2,3].includes(value))ProjectState.commit('Changed tour speed',()=>{FourDStudio.settings.tourSpeed=value;});},
  reorderStop(index,delta) {
    const stops=FourDStudio.settings.guidedStops;if(index+delta<0||index+delta>=stops.length)return;
    this.pauseTour();ProjectState.commit('Reordered guided tour',()=>{[stops[index],stops[index+delta]]=[stops[index+delta],stops[index]];});this.tourPanel();
  },
  removeStop(index) {this.pauseTour();ProjectState.commit('Removed guided tour stop',()=>FourDStudio.settings.guidedStops.splice(index,1));this.tourPanel();},
  goStop(index,options={}) {
    const stop=FourDStudio.settings.guidedStops[index];if(!stop||!FourDWorkspace.running||FourDWorkspace.paused)return;
    if(!options.tour)this.remember();
    const from=Engine4D.renderer.clippingPlanes.map(p=>p.clone());this.clearFilters();
    this.kind=stop.kind;this.floorIndex=stop.floor;this.elementId=stop.element;
    if(stop.kind==='floor')ViewportUI.inspectFloor(stop.floor);
    if(['element','material'].includes(stop.kind))StudioEnhancements.focusRoom=stop.element;
    if(stop.kind==='material')this.materialMode=stop.materialChannel||'floor';
    this.projection(stop.projection||'perspective');
    Engine3D.camera.zoom=stop.zoom||1;Engine3D.camera.updateProjectionMatrix();
    this.move(Workbench3D.coordinates(stop.position),Workbench3D.coordinates(stop.target),{...options,fromPlanes:from});
  },
  playTour() {
    if(!FourDWorkspace.running||FourDWorkspace.paused||document.hidden||!FourDStudio.settings.guidedStops.length)return;
    this.tourPlaying=true;
    if(this.tourIndex>=FourDStudio.settings.guidedStops.length)this.tourIndex=0;
    const index=this.tourIndex||0,speed=FourDStudio.settings.tourSpeed;
    this.goStop(index,{tour:true,duration:1800/speed,complete:()=>{
      if(!this.tourPlaying)return;
      this.tourIndex=index+1;this.tourStatus();
      if(this.tourIndex>=FourDStudio.settings.guidedStops.length){this.tourPlaying=false;this.tourStatus();return;}
      this.tourTimer=setTimeout(()=>this.playTour(),1200/speed);
    }});this.tourStatus();
  },
  pauseTour() {this.cancel('pause');},
  stopTour() {this.cancel('stop');this.tourIndex=0;this.tourStatus();},
  tourStatus() {const n=document.getElementById('fourd-tour-status');if(n)n.textContent=`${this.tourPlaying?'Playing':'Paused'} · stop ${Math.min(FourDStudio.settings.guidedStops.length,(this.tourIndex||0)+1)} / ${FourDStudio.settings.guidedStops.length}`;},
};
