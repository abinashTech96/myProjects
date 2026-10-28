/* Compact architectural review tools. All overlays are disposable and read-only. */
window.FourDReview={
 tab:'context',queueToken:0,findings:[],changes:[],
 alignmentOriginal:new WeakMap(),
 applyAlignment(){
  for(const key of ['changeGroup','auditGroup'])if(this[key])this[key].visible=!FourDWorkspace.exporting;
  const p=StudioEnhancements.modelProject;if(!p)return;
  const key=Engine4D.modelVersion+'|'+JSON.stringify(p.design.presentation.surfaces);if(key===this.alignmentKey)return;this.alignmentKey=key;
  Engine4D.model.updateMatrixWorld(true);const {SCALE:S,I}=get3DEnvironmentParams();
  Engine4D.model.traverse(n=>{if(!n.isMesh||!n.geometry.attributes.uv)return;const channel=n.userData.presentationSurface||[].concat(n.material||[])[0]?.userData.presentationSurface;
   if(!['floor','ceiling'].includes(channel))return;const saved=p.design.presentation.surfaces[n.userData.elementId]?.[channel],geometry=n.geometry;
   if(!saved?.origin){const old=this.alignmentOriginal.get(geometry);if(old){geometry.setAttribute('uv',old);this.alignmentOriginal.delete(geometry);}return;}
   if(!this.alignmentOriginal.has(geometry))this.alignmentOriginal.set(geometry,geometry.attributes.uv.clone());
   const pos=geometry.attributes.position,uv=geometry.attributes.uv,point=new THREE.Vector3();
   for(let i=0;i<pos.count;i++){point.fromBufferAttribute(pos,i).applyMatrix4(n.matrixWorld);uv.setXY(i,(point.x-I.x)/S-saved.origin[0],(point.z-I.z)/S-saved.origin[1]);}uv.needsUpdate=true;
   const tile=FourDModel.materials[saved.type]?.tile||48;
   for(const m of [].concat(n.material||[]))for(const slot of ['map','bumpMap','normalMap','roughnessMap'])if(m[slot]){m[slot].repeat.set(saved.scale/tile,saved.scale/tile);m[slot].center.set(0,0);m[slot].offset.set(0,0);m[slot].rotation=saved.rotation*Math.PI/180;}
  });
 },
 get settings(){return FourDStudio.settings;},
 run(action){return FourDStudio.run(action);},
 panel(tab=this.tab){
  if(!FourDWorkspace.running||FourDWorkspace.paused)return;
  this.tab=tab;const b=(l,a)=>StudioUI.button(l,a),e=ProjectModel.escapeHTML,s=this.settings,selected=elements[selectedElIndex],kind=FourDViews.kind;
  let html='';
  if(tab==='context'){
   const type=kind==='plot'?'Plot':kind==='floor'?'Floor':kind==='element'||kind==='material'?'Element':'Building';
   html=`<p><strong>${type} tools</strong> · ${e(selected?.customName||selected?.type||'Select an element')}</p><div class="studio-action-grid">`;
   if(type==='Element')html+=b('Room finishes','StudioEnhancements.materials()')+b('Light fixtures',"FourDReview.panel('lights')")+b('Openings','StudioEnhancements.openingsDialog()');
   else if(type==='Floor')html+=b('Floor cutaway','FourDWorkspace.viewPanel()')+b('Exploded floors','StudioEnhancements.explodeDialog()')+b('Section box','StudioEnhancements.sectionDialog()');
   else if(type==='Plot')html+=b('Garden & sunlight','Engine4D.lightingDialog()')+b('Site & date','DesignUI.sunDialog()')+b('Daylight preview','FourDViews.daylightPanel()');
   else html+=b('Focus selected','FourDViews.focus()')+b('Section box','StudioEnhancements.sectionDialog()')+b('Guided tour','FourDViews.tourPanel()');
   html+=`</div><hr><div class="studio-action-grid">${b('Linked plan review','FourDReview.split()')}${b('Align materials',"FourDReview.panel('materials')")}${b('Revision review',"FourDReview.panel('changes')")}${b('Visual inspection',"FourDReview.panel('audit')")}</div><label><input type="checkbox" ${s.detailing?'checked':''} onchange="FourDStudio.change('detailing',this.checked)">Architectural trim & reveals</label><p>Detail geometry is presentation-only. Saved room, plot and opening dimensions stay exact.</p>`;
  }else if(tab==='lights'){
   const room=selected&&!selected.isFurniture?selected:elements.find(el=>!el.isFurniture&&el.floor===(FourDViews.floorIndex??currentFloor));
   html=`<label>Room<select id="review-light-room" aria-label="Light fixture room">${elements.filter(el=>!el.isFurniture).map(el=>`<option value="${e(el.id)}" ${el.id===room?.id?'selected':''}>${e(el.customName||el.type)} · ${el.floor}</option>`).join('')}</select></label><label>Fixture type<select id="review-light-type"><option value="ceiling">Ceiling downlight</option><option value="spot">Adjustable spotlight</option><option value="wall">Wall light</option></select></label><div class="studio-field-grid">${this.field('x','Across room · fraction',.5,0,1,.05)}${this.field('y','Along room · fraction',.5,0,1,.05)}${this.field('height','Height · in',room?WorkbenchModel.floorHeight(ProjectState.capture(),room.floor)-8:108,1,1000,1)}${this.field('intensity','Intensity',.7,0,3,.1)}${this.field('temperature','Temperature · K',3000,2000,6500,100)}${this.field('spread','Beam spread · °',60,10,120,5)}${this.field('yaw','Direction · °',0,0,360,15)}</div>${b('Add fixture','FourDReview.addLight()')}<p>Editable fixture settings are saved and undoable. Nearest active fixtures are limited to 1 / 4 / 8 for Eco / Balanced / High. Fixture lights do not cast extra shadow maps.</p>${s.fixtures.map((f,i)=>`<details><summary>${e(f.type)} · ${e(elements.find(el=>el.id===f.room)?.customName||f.room)}</summary><label><input type="checkbox" ${f.enabled?'checked':''} onchange="FourDReview.editLight(${i},'enabled',this.checked)">Enabled</label>${['x','y','height','intensity','temperature','spread','yaw'].map(k=>`<label>${e(k)}<input aria-label="Fixture ${i} ${k}" type="number" step="${['x','y','intensity'].includes(k)?'.05':'1'}" value="${f[k]}" onchange="FourDReview.editLight(${i},'${k}',Number(this.value))"></label>`).join('')}${b('Remove',`FourDReview.removeLight(${i})`)}</details>`).join('')}`;
  }else if(tab==='materials'){
   html=`<p>Use the selected room's finish as the reference. Select target rooms with Ctrl / ⌘ click. A shared plan origin aligns texture joints across adjoining floor or ceiling surfaces.</p><label>Surface<select id="review-align-channel"><option value="floor">Floor</option><option value="ceiling">Ceiling</option></select></label><label>Origin X · in<input id="review-origin-x" type="number" value="0"></label><label>Origin Y · in<input id="review-origin-y" type="number" value="0"></label>${b('Align selected surfaces','FourDReview.align()')}<p>Copies finish, rotation, physical repeat and origin. Locked targets are rejected. Wall unwraps retain their existing orientation.</p>`;
  }else if(tab==='bookmarks'){
   html=`<label>Bookmark name<input id="review-bookmark-name" maxlength="80" value="Section ${s.bookmarks.length+1}"></label><label>Annotation<textarea id="review-bookmark-note" maxlength="500"></textarea></label><div class="studio-action-grid">${b('Save current section / view','FourDReview.saveBookmark()')}${b('Section controls','StudioEnhancements.sectionDialog()')}${b('Render saved views','FourDReview.renderQueue()')}${b('Cancel queue','FourDReview.cancelQueue()')}</div><output id="review-queue-status" aria-live="polite">${e(this.queueStatus||'Queue idle')}</output>${s.bookmarks.map((v,i)=>`<article class="fourd-row"><span>${e(v.name)}<small>${e(v.note)}</small></span>${b('Visit',`FourDReview.visitBookmark(${i})`)}${b('Remove',`FourDReview.removeBookmark(${i})`)}</article>`).join('')}<p>Camera, section box, visible floor, cut planes and annotation are saved with the project. Queue captures each saved view in order into one ZIP, restoring your previous view.</p>`;
  }else if(tab==='changes'){
   const options=WorkbenchModel.data(ProjectState.capture()).options;
   html=`<label>Compare with saved alternative<select id="review-alternative">${options.map(o=>`<option value="${e(o.id)}">${e(o.name)}</option>`).join('')}</select></label><div class="studio-action-grid">${b('Highlight changes','FourDReview.compare()')}${b('Clear highlights','FourDReview.clearChanges()')}${b('Save alternative','WorkbenchUI.optionDialog()')}</div><p>Green: added · blue: moved · amber: resized · red: removed · violet: other changes. Dashed boxes show prior extents. Up to 200 changes are highlighted at once.</p><div id="review-change-list">${this.changeList()}</div>`;
  }else if(tab==='audit'){
   html=`<div class="studio-action-grid">${b('Inspect visible model','FourDReview.audit()')}${b('Clear highlights','FourDReview.clearAudit()')}${b('Roof controls','DesignUI.roofDialog()')}${b('Parapet controls','ParapetStudio.open()')}</div><p>Checks non-finite buffers, absent UVs on textured meshes, coincident surfaces and disconnected wall endpoints. Includes roof/parapet junctions, covered shafts, ceiling intersections and opening heads. Select a finding to locate it.</p><div id="review-audit-list">${this.auditList()}</div>`;
  }else if(tab==='performance'){
   html=FourDPerformance.html()+this.performanceHTML()+`<div class="studio-action-grid">${b('Save device baseline','FourDReview.baseline()')}${b('Refresh',"FourDReview.panel('performance')")}</div><p>Baselines are scoped to device, viewport and quality. Software-rendered CI timings are separate. No constant frame rate is promised.</p>`;
  }
  WorkspacePanels.intent='4D';StudioUI.dialog('4D review',`<nav class="fourd-tabs" aria-label="Review sections">${[['context','Tools'],['lights','Lights'],['materials','Align'],['bookmarks','Views'],['changes','Changes'],['audit','Inspect'],['performance','Device']].map(([id,label])=>`<button class="studio-button" aria-pressed="${tab===id}" onclick="FourDReview.panel('${id}')">${label}</button>`).join('')}</nav><div class="fourd-form" data-review-tab="${tab}">${html}</div>`);document.getElementById('studio-dialog')?.classList.add('fourd-review-panel');this.panelObserver?.disconnect();this.panelObserver=new ResizeObserver(()=>this.scheduleReframe());this.panelObserver.observe(document.getElementById('studio-dialog'));requestAnimationFrame(()=>this.scheduleReframe());
 },
 scheduleReframe(){
  const panel=document.getElementById('studio-dialog'),r=panel?.classList.contains('fourd-review-panel')?panel.getBoundingClientRect():null,key=[innerWidth,innerHeight,r?Math.round(r.width):0,r?Math.round(r.height):0].join(':');
  if(key===this.frameKey)return;this.frameKey=key;clearTimeout(this.frameTimer);this.frameTimer=setTimeout(()=>{if(!FourDViews.transition)FourDViews.reframe();},200);
 },
 field(id,label,value,min,max,step){return `<label>${label}<input id="review-light-${id}" type="number" value="${value}" min="${min}" max="${max}" step="${step}"></label>`;},
 addLight(){this.run(()=>{
  const f={id:ProjectModel.uid(),room:document.getElementById('review-light-room').value,type:document.getElementById('review-light-type').value,enabled:true};
  for(const k of ['x','y','height','intensity','temperature','spread','yaw'])f[k]=Number(document.getElementById('review-light-'+k).value);
  const p=ProjectState.capture();p.design.presentation.studio.fixtures.push(f);FourDReviewModel.validate(p.design.presentation.studio,p);
  ProjectState.commit('Added light fixture',()=>this.settings.fixtures.push(f));this.panel('lights');
 });},
 editLight(i,key,value){const previous=this.settings.fixtures[i]?.[key];return this.run(()=>{try{const p=ProjectState.capture();p.design.presentation.studio.fixtures[i][key]=value;FourDReviewModel.validate(p.design.presentation.studio,p);ProjectState.commit('Edited light fixture',()=>{this.settings.fixtures[i][key]=value;});Engine3D.needsRender=true;}catch(error){const input=document.querySelector(`[aria-label="Fixture ${i} ${key}"]`);if(input){if(key==='enabled')input.checked=previous;else input.value=previous;}throw error;}});},
 removeLight(i){ProjectState.commit('Removed light fixture',()=>this.settings.fixtures.splice(i,1));this.panel('lights');},
 align(){this.run(()=>{
  const reference=elements[selectedElIndex],channel=document.getElementById('review-align-channel').value;
  if(!reference||reference.isFurniture)throw Error('Select a reference room');
  const targets=elements.filter(el=>Selection.ids.has(el.id)&&!el.isFurniture);if(!targets.length)targets.push(reference);
  if(targets.some(el=>el.locked))throw Error('Unlock target rooms first');
  const value=structuredClone(StudioEnhancements.surface(reference.id,channel));value.origin=[Number(document.getElementById('review-origin-x').value),Number(document.getElementById('review-origin-y').value)];
  const p=ProjectState.capture();for(const el of targets){p.design.presentation.surfaces[el.id]||={};p.design.presentation.surfaces[el.id][channel]=value;}PresentationModel.validate(p.design.presentation,p);
  ProjectState.commit('Aligned adjoining surface finishes',()=>{for(const el of targets){StudioEnhancements.data.surfaces[el.id]||={};StudioEnhancements.data.surfaces[el.id][channel]=structuredClone(value);}});
  StudioUI.message(`Aligned ${targets.length} surfaces`);
 });},
 portablePose(){const pose=FourDViews.pose(),{SCALE:S,I}=get3DEnvironmentParams();for(const key of ['position','target'])pose[key]=[(pose[key][0]-I.x)/S,pose[key][1]/S,(pose[key][2]-I.z)/S];pose.planes=pose.planes.map(([x,y,z,c])=>[x,y,z,(c+x*I.x+z*I.z)/S]);return pose;},
 worldPose(pose){pose=structuredClone(pose);const {SCALE:S,I}=get3DEnvironmentParams();for(const key of ['position','target'])pose[key]=[pose[key][0]*S+I.x,pose[key][1]*S,pose[key][2]*S+I.z];pose.planes=pose.planes.map(([x,y,z,c])=>[x,y,z,c*S-x*I.x-z*I.z]);return pose;},
 saveBookmark(){this.run(()=>{const item={name:document.getElementById('review-bookmark-name').value,note:document.getElementById('review-bookmark-note').value,pose:this.portablePose(),section:structuredClone(StudioEnhancements.section)};const p=ProjectState.capture();p.design.presentation.studio.bookmarks.push(item);FourDReviewModel.validate(p.design.presentation.studio,p);ProjectState.commit('Saved section bookmark',()=>this.settings.bookmarks.push(item));this.panel('bookmarks');});},
 visitBookmark(i){const b=this.settings.bookmarks[i];if(!b||!FourDWorkspace.running)return;FourDViews.remember();FourDViews.restorePose(this.worldPose(b.pose));StudioEnhancements.section=structuredClone(b.section);if(b.section)StudioEnhancements.applySection();this.showNote(b.note);},
 removeBookmark(i){ProjectState.commit('Removed section bookmark',()=>this.settings.bookmarks.splice(i,1));this.panel('bookmarks');},
 showNote(note){let el=document.getElementById('review-view-note');if(!el){el=document.createElement('p');el.id='review-view-note';document.getElementById('fourd-workspace').append(el);}el.textContent=note||'';el.hidden=!note;},
 split(){document.getElementById('studio-dialog')?.close();setWorkspaceLayout('split');this.linked=true;document.body.dataset.reviewLinked='true';this.selection();StudioUI.message('Linked review: select in either view. Use Locate in model to frame the selection.');},
 selection(){
  if(this.linked&&StudioUI.mode==='split'){
   const el=elements[selectedElIndex];let box=document.getElementById('review-linked-tools');if(!box){box=document.createElement('div');box.id='review-linked-tools';document.getElementById('right-canvas-wrapper').append(box);}
   box.innerHTML=`<span>${ProjectModel.escapeHTML(el?.customName||el?.type||'Select an element')}</span>${StudioUI.button('Locate in plan','FourDReview.locatePlan()')}${StudioUI.button('Locate in model','FourDReview.locateModel()')}${StudioUI.button('Close','FourDReview.closeLinked()')}`;
   if(el){currentFloor=el.floor;updateCanvas(false);const object=Engine3D.elementObjects.get(el.id);this.disposeGroup('linkedOutline');if(object){this.linkedOutline=new THREE.BoxHelper(object,0x48d8db);this.linkedOutline.material.depthTest=false;this.linkedOutline.renderOrder=20;Engine3D.scene.add(this.linkedOutline);}}Engine3D.needsRender=true;
  }
  if(FourDWorkspace.running&&document.querySelector('[data-review-tab="context"]'))this.panel('context');
 },
 locatePlan(){const el=elements[selectedElIndex];if(!el)return;currentFloor=el.floor;StudioUI.fitPlan();updateCanvas(false);},
 locateModel(){const el=elements[selectedElIndex];if(!el)return;const object=Engine3D.elementObjects.get(el.id);if(!object)return;const box=new THREE.Box3().setFromObject(object),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).length(),direction=Engine3D.camera.position.clone().sub(Engine3D.controls.target).normalize();Engine3D.controls.target.copy(center);Engine3D.camera.position.copy(center).addScaledVector(direction,Math.max(60,size*1.4));Engine3D.controls.update();Engine3D.needsRender=true;},
 closeLinked(){this.linked=false;document.body.dataset.reviewLinked='false';document.getElementById('review-linked-tools')?.remove();this.disposeGroup('linkedOutline');},
 disposeGroup(key){const g=this[key];if(g){g.parent?.remove(g);g.traverse(n=>{n.geometry?.dispose();for(const m of [].concat(n.material||[]))m.dispose();});}this[key]=null;},
 box(group,record,color,old=false,p=ProjectState.capture()){
  if(!record)return;let el=record;if(record.roomId!=null){const room=p.elements[record.roomId];if(!room)return;const line=PlanningModel.openingSegment(p,record);el={x:Math.min(line.a.x,line.b.x),y:Math.min(line.a.y,line.b.y),w:Math.max(2,Math.abs(line.b.x-line.a.x)),h:Math.max(2,Math.abs(line.b.y-line.a.y)),floor:room.floor,customHeight:record.height};}
  if(!Number.isFinite(el.x)||!Number.isFinite(el.w))return;
  const {SCALE:S,I}=get3DEnvironmentParams(),b=PresentationModel.bounds(el),base=WorkbenchModel.roomBase(p,el),height=el.customHeight||WorkbenchModel.floorHeight(p,el.floor),g=new THREE.BoxGeometry(b.w*S,height*S,b.h*S),edges=new THREE.EdgesGeometry(g);g.dispose();
  const material=old?new THREE.LineDashedMaterial({color,dashSize:5*S,gapSize:3*S,depthTest:false}):new THREE.LineBasicMaterial({color,depthTest:false});
  const line=new THREE.LineSegments(edges,material);line.position.set(I.x+(b.x+b.w/2)*S,(base+height/2)*S,I.z+(b.y+b.h/2)*S);if(old)line.computeLineDistances();line.renderOrder=30;group.add(line);
 },
 compare(){this.run(()=>{const option=WorkbenchModel.data(ProjectState.capture()).options.find(o=>o.id===document.getElementById('review-alternative').value);if(!option)throw Error('Save a design alternative first');this.clearChanges();this.changeSource=ProjectModel.normalize(option.project);this.changePage=0;this.changes=FourDReviewModel.diff(this.changeSource,ProjectState.capture());this.drawChanges();document.getElementById('review-change-list').innerHTML=this.changeList();});},
 drawChanges(){this.disposeGroup('changeGroup');this.changeGroup=new THREE.Group();Engine4D.scene.add(this.changeGroup);const colors={added:0x36d384,removed:0xf0747d,moved:0x4ab7ff,resized:0xf4c464,changed:0xc78cff};for(const row of this.changes.slice(0,200)){this.box(this.changeGroup,row.after,colors[row.status]);if(row.before&&row.status!=='added')this.box(this.changeGroup,row.before,colors[row.status],true,this.changeSource);}},
 changeList(){
  const e=ProjectModel.escapeHTML,start=(this.changePage||0)*100,rows=this.changes.slice(start,start+100);if(!rows.length)return '<p>No comparison loaded or no differences.</p>';
  return `<p>${start+1}–${start+rows.length} / ${this.changes.length} changes</p><div class="studio-action-grid">${start?StudioUI.button('Previous',"FourDReview.changesPage(-1)"):''}${start+100<this.changes.length?StudioUI.button('Next',"FourDReview.changesPage(1)"):''}</div>`+rows.map((r,i)=>`<details><summary><button class="studio-button" onclick="FourDReview.jumpChange(${start+i})">${e(r.status)} · ${e(r.after?.customName||r.before?.customName||r.id)}</button></summary>${r.changes.map(c=>`<p>${e(c.field)}: ${e(JSON.stringify(c.before)??'unset')} → ${e(JSON.stringify(c.after)??'unset')}</p>`).join('')}</details>`).join('');
 },
 changesPage(delta){this.changePage=Math.max(0,Math.min(Math.ceil(this.changes.length/100)-1,(this.changePage||0)+delta));const node=document.getElementById('review-change-list');if(node)node.innerHTML=this.changeList();},
 jumpChange(i){const r=this.changes[i];if(!r)return;const index=r.kind==='opening'?fixtures.find(f=>f.id===r.id)?.roomId:elements.findIndex(el=>el.id===r.id);if(index>=0){StudioUI.select(index);FourDViews.focus();}else StudioUI.message('Removed element: red dashed box shows its previous location.');},
 clearChanges(){this.disposeGroup('changeGroup');this.changes=[];this.changeSource=null;Engine3D.needsRender=true;document.getElementById('review-change-list')?.replaceChildren();},
 audit(){
  this.clearAudit();const findings=[],seen=new Map(),{SCALE:S}=get3DEnvironmentParams();Engine4D.model.updateMatrixWorld(true);
  Engine4D.model.traverse(n=>{if(!n.isMesh||!n.geometry)return;const a=n.geometry.attributes.position,id=n.userData.elementId||n.userData.objectId,opening=n.userData.openingId;
   if(!a||!a.array.every(Number.isFinite)){findings.push({id,opening,reason:'Invalid or non-finite positions'});return;}
   if([].concat(n.material||[]).some(m=>m.map&&!m.map.image))findings.push({id,opening,reason:'Texture image unavailable'});
   if([].concat(n.material||[]).some(m=>m.map)&&!n.geometry.attributes.uv)findings.push({id,opening,reason:'Textured surface has no UV coordinates'});
   const box=new THREE.Box3().setFromObject(n),v=[...box.min.toArray(),...box.max.toArray()].map(x=>Math.round(x/S*100)).join(',')+':'+a.count;
   if(seen.has(v)&&(seen.get(v).geometry===n.geometry||(seen.get(v).matrixWorld.equals(n.matrixWorld)&&seen.get(v).geometry.attributes.position.array.every((x,i)=>x===a.array[i]))))findings.push({id,opening,reason:'Coincident duplicate mesh · review overlap'});else seen.set(v,n);
  });
  for(const issue of Engine4D.geometryIssues||[])findings.push({id:issue.element,reason:issue.reason});
  const walls=ProjectModel.walls(ProjectState.capture()),ends=[];
  for(const wall of walls){const a=wall.a||{x:wall.horizontal?wall.start:wall.fixed,y:wall.horizontal?wall.fixed:wall.start},b=wall.b||{x:wall.horizontal?wall.end:wall.fixed,y:wall.horizontal?wall.fixed:wall.end};for(const q of [a,b])ends.push({q,wall});}
  for(let i=0;i<ends.length&&findings.length<200;i++)for(let j=i+1;j<ends.length;j++){const a=ends[i],b=ends[j];if(a.wall.id===b.wall.id||a.wall.floor!==b.wall.floor)continue;const d=Math.hypot(a.q.x-b.q.x,a.q.y-b.q.y);if(d>.1&&d<Math.min(a.wall.thickness||6,b.wall.thickness||6)*.5)findings.push({id:a.wall.owners?.find(o=>o.index!=null)&&elements[a.wall.owners.find(o=>o.index!=null).index]?.id,reason:'Potential wall endpoint gap · '+d.toFixed(2)+' in'});}
  findings.push(...ArchitecturalReviewModel.inspect(ProjectState.capture()));
  this.findings=findings.slice(0,200);this.auditGroup=new THREE.Group();Engine4D.scene.add(this.auditGroup);for(const f of this.findings){const el=elements.find(e=>e.id===f.id);this.box(this.auditGroup,el,0xf4b658);}
  document.getElementById('review-audit-list')?.replaceChildren();const node=document.getElementById('review-audit-list');if(node)node.innerHTML=this.auditList();Engine3D.needsRender=true;return this.findings;
 },
 auditList(){return this.findings.length?this.findings.map((f,i)=>`<button class="studio-button review-finding" onclick="FourDReview.jumpFinding(${i})">${ProjectModel.escapeHTML(f.reason)} · ${ProjectModel.escapeHTML(f.id||'scene')}</button>`).join(''):'<p>No findings loaded. Inspection is a visual aid, not certification.</p>';},
 jumpFinding(i){const f=this.findings[i],index=elements.findIndex(e=>e.id===f.id);if(index>=0){StudioUI.select(index);FourDViews.focus();FourDWorkspace.inspect(true);}else if(f.point&&FourDWorkspace.running){FourDViews.clearFilters();const p=ProjectState.capture(),{SCALE:S,I}=get3DEnvironmentParams(),target=new THREE.Vector3(I.x+f.point.x*S,(WorkbenchModel.floorBase(p,f.floor)+WorkbenchModel.floorHeight(p,f.floor))*S,I.z+f.point.y*S),box=new THREE.Box3(target.clone().addScalar(-48*S),target.clone().addScalar(48*S)),pose=FourDViews.fit(box);FourDViews.kind='building';FourDViews.move(pose.position,pose.target);StudioUI.message(f.reason);}
  else StudioUI.message('Scene-level finding: check rendering diagnostics.');},
 clearAudit(){this.disposeGroup('auditGroup');this.findings=[];Engine3D.needsRender=true;},
 report(){const samples=FourDWorkspace.metrics.samples.slice().sort((a,b)=>a-b),r=Engine4D.renderer?.info;return {quality:FourDWorkspace.quality,width:innerWidth,height:innerHeight,firstFrameMs:Math.round(FourDWorkspace.metrics.firstFrameMs||0),p95RenderMs:Math.round(samples[Math.floor(samples.length*.95)]||0),editMs:Math.round(FourDWorkspace.metrics.lastUpdate?.ms||0),geometries:r?.memory.geometries||0,textures:r?.memory.textures||0,textureMiB:+(FourDAssets.bytes/1048576).toFixed(2),workerJobs:FourDJobs.stats.completed,sourceMaxChunkMs:Math.round(FourDWorkspace.metrics.source?.maxChunkMs||0),shaderMaxChunkMs:Math.round(FourDWorkspace.metrics.shaders?.maxChunkMs||0),detailStripsOmitted:FourDDetails.detailSkipped||0,capMeshes:FourDDetails.capStatus?.meshes||0,openSectionLoops:FourDDetails.capStatus?.open||0,sectionMeshesOverBudget:FourDDetails.capStatus?.skipped||0};},
 baselineKey(){return 'ArchCAD_4D_Baseline_'+FourDPerformance.fingerprint()+'_'+navigator.userAgent+'_'+FourDWorkspace.quality+'_'+innerWidth+'x'+innerHeight;},
 baseline(){try{localStorage.setItem(this.baselineKey(),JSON.stringify(this.report()));this.panel('performance');}catch{StudioUI.message('Device baseline could not be saved');}},
 performanceHTML(){const r=this.report(),labels={quality:'Quality',width:'Viewport width',height:'Viewport height',firstFrameMs:'First view (ms)',p95RenderMs:'95th-percentile render (ms)',editMs:'Last edit (ms)',geometries:'Geometries',textures:'Textures',textureMiB:'Owned textures (MiB)',workerJobs:'Worker jobs',sourceMaxChunkMs:'Longest source step (ms)',shaderMaxChunkMs:'Longest shader step (ms)',detailStripsOmitted:'Omitted trim strips',capMeshes:'Section caps',openSectionLoops:'Open section contours',sectionMeshesOverBudget:'Sections over budget'};let before;try{before=JSON.parse(localStorage.getItem(this.baselineKey())||'null');}catch{}return `<table><thead><tr><th>Metric</th><th>Current</th><th>Baseline</th></tr></thead><tbody>${Object.entries(r).map(([k,v])=>`<tr><td>${labels[k]||k}</td><td>${v}</td><td>${before?.[k]??'—'}</td></tr>`).join('')}</tbody></table>`;},
 cancelQueue(){const active=this.queueActive;++this.queueToken;this.queueActive=false;if(active)FourDViews.cancel('queue-cancel');this.setQueueStatus('Queue cancelled');},
 setQueueStatus(text){this.queueStatus=text;const node=document.getElementById('review-queue-status');if(node)node.textContent=text;},
 async renderQueue(download=true){
  if(this.queueActive)return;const list=structuredClone(this.settings.bookmarks);if(!list.length)return StudioUI.message('Save at least one view first');
  this.queueActive=true;const token=++this.queueToken,session=FourDWorkspace.token,original=this.portablePose(),section=structuredClone(StudioEnhancements.section),revision=FourDWorkspace.updateRevision,files={};let bytes=0;
  const valid=()=>this.queueActive&&token===this.queueToken&&session===FourDWorkspace.token&&revision===FourDWorkspace.updateRevision&&FourDWorkspace.running&&!FourDWorkspace.paused&&!document.hidden;
  const wait=async(ms)=>{await new Promise(r=>setTimeout(r,ms));if(!valid())throw new DOMException('Render queue cancelled','AbortError');};
  try{
   for(let i=0;i<list.length;i++){
    if(!valid())throw new DOMException('Cancelled','AbortError');this.setQueueStatus(`Rendering ${i+1} / ${list.length}: ${list[i].name}`);
    this.queueMoving=true;FourDViews.restorePose(this.worldPose(list[i].pose));StudioEnhancements.section=structuredClone(list[i].section);if(list[i].section)StudioEnhancements.applySection();this.queueMoving=false;
    while(FourDViews.transition)await wait(40);await wait(250);await FourDDetails.updateCaps(true);await wait(20);
    const blob=await Engine4D.capture({download:false});if(!blob)throw Error('Capture failed');await wait(0);bytes+=blob.size;if(bytes>128*1048576)throw Error('Render queue exceeds 128 MiB; capture fewer views');
    files[String(i+1).padStart(2,'0')+'_'+list[i].name.replace(/[^a-z0-9_-]/gi,'_')+'.png']=new Uint8Array(await blob.arrayBuffer());
   }
   if(!valid())throw new DOMException('Cancelled','AbortError');
   files['views.json']=new TextEncoder().encode(JSON.stringify({version:1,views:list},null,2));
   const zip=await new Promise((resolve,reject)=>fflate.zip(files,{level:0},(error,data)=>error?reject(error):resolve(data)));if(!valid())throw new DOMException('Cancelled','AbortError');
   if(download){const url=URL.createObjectURL(new Blob([zip],{type:'application/zip'})),link=document.createElement('a');link.href=url;link.download='ArchCAD_Saved_Views.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
   this.setQueueStatus(`Completed ${list.length} views`);return {count:list.length,bytes:zip.length};
  }catch(error){this.setQueueStatus(error.name==='AbortError'?'Queue cancelled':error.message);if(error.name!=='AbortError')StudioUI.message(error.message,'error');}
  finally{this.queueMoving=false;if(token===this.queueToken){this.queueActive=false;if(FourDWorkspace.running&&!FourDWorkspace.paused&&!document.hidden){FourDViews.restorePose(this.worldPose(original));StudioEnhancements.section=section;if(section)StudioEnhancements.applySection();}}}
 },
 stop(){this.panelObserver?.disconnect();clearTimeout(this.frameTimer);this.frameKey=null;this.cancelQueue();this.clearChanges();this.clearAudit();this.showNote('');},
};
AppEvents.onSelectionChange(()=>FourDReview.selection());
AppEvents.onStateChange(()=>{if(FourDReview.queueActive)FourDReview.cancelQueue();if(FourDReview.changes.length)FourDReview.clearChanges();if(FourDReview.findings.length)FourDReview.clearAudit();});

document.addEventListener('DOMContentLoaded',()=>{
 const layout=window.setWorkspaceLayout;
 window.setWorkspaceLayout=function(mode){if(mode!=='split')FourDReview.closeLinked();return layout(mode);};
 window.addEventListener('resize',()=>{if(FourDWorkspace.running)FourDReview.scheduleReframe();});
 const container=document.getElementById('three-container');
 container.addEventListener('pointerdown',event=>{if(FourDReview.linked)FourDReview.pointer=[event.clientX,event.clientY];},true);
 container.addEventListener('click',event=>{
  if(!FourDReview.linked||StudioUI.mode!=='split'||event.target.tagName!=='CANVAS'||!FourDReview.pointer||Math.hypot(event.clientX-FourDReview.pointer[0],event.clientY-FourDReview.pointer[1])>5)return;
  const hit=Workbench3D.hit(event);if(!hit)return;let index=-1;for(let n=hit.object;n;n=n.parent){index=elements.findIndex(el=>el.id===n.userData.elementId);if(index<0&&Number.isInteger(n.userData.roomIndex))index=n.userData.roomIndex;if(index>=0)break;}
  if(index>=0){event.stopImmediatePropagation();StudioUI.select(index);}
 },true);
});
