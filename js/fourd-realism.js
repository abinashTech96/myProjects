/* Optional realism services. Resources and view changes stay inside the 4D session. */
window.FourDRealism={
  materialState:new WeakMap(),meshState:new WeakMap(),
  get settings(){return FourDStudio.settings.realism;},
  change(key,value){return ProjectState.commit('4D realism '+key,()=>{this.settings[key]=value;});},
  preset(){return ProjectState.commit('Enabled balanced realism',()=>{
    Object.assign(this.settings,FourDRealismModel.defaults(),{enabled:true});
    FourDStudio.settings.reflections='local';
  });},
  html(){
    const s=this.settings,b=(l,a)=>StudioUI.button(l,'FourDStudio.run(()=>{'+a+'})'),
      check=(k,l)=>`<label class="fourd-check"><input aria-label="${l}" type="checkbox" ${s[k]?'checked':''} onchange="FourDRealism.change('${k}',this.checked)">${l}</label>`,
      number=(k,l,min,max,step=1)=>`<label>${l}<input aria-label="${l}" type="number" min="${min}" max="${max}" step="${step}" value="${s[k]}" onchange="FourDRealism.change('${k}',Number(this.value))"></label>`;
    return `${b('Apply balanced realism','FourDRealism.preset();FourDStudio.open(\'realism\')')}${check('enabled','Enable realistic presentation')}<p class="studio-hint">Opt in per project. Existing presentations keep their appearance until enabled. Geometry dimensions are preserved.</p>
      <details open><summary>Light & shadows</summary>${check('roomLighting','Room-aware ambient light')}${check('autoExposure','Smooth interior exposure')}${number('exposureSpeed','Exposure adaptation speed',.25,3,.25)}${check('contactShadows','Fine contact shading')}${check('roomReflections','Cache reflections by room')}${b('Environment & reflections',"FourDStudio.open('render')")}<p class="studio-hint">Ambient room balance is an approximation based on exterior windows, not a daylight calculation or real-time global illumination.</p></details>
      <details><summary>Real-size surfaces</summary>${check('materialScale','Use real-world material sizes')}${check('textureDetail','Fine surface texture')}
      <div class="studio-field-grid">${number('tileSize','Tile side (in)',2,96)}${number('plankWidth','Plank width (in)',2,24)}${number('plankLength','Plank length (in)',12,120)}${number('brickWidth','Brick width (in)',4,18)}${number('brickHeight','Brick course height (in)',1,8)}${number('textureStrength','Surface detail strength',0,2,.1)}</div><p class="studio-hint">World-aligned room floors, walls and ceilings; authored furniture and imported UVs are preserved. Saved finish scale, rotation and alignment origin still apply.</p>${b('Choose finishes',"FourDStudio.open('materials')")}</details>
      <details><summary>Building & glass</summary>${check('edgeDetail','Detailed thresholds, frames & coping')}<label>Glazing style<select aria-label="Glazing style" onchange="FourDRealism.change('glazing',this.value)">${['clear','frosted','tinted'].map(k=>`<option ${s.glazing===k?'selected':''}>${k}</option>`).join('')}</select></label><p>Glazing uses the existing Physical glass switch. Navigation uses a lighter preview; settled views restore its setting.</p>${b('Physical glass controls','Engine4D.lightingDialog()')}</details>
      <details><summary>Fixtures, garden & walkthrough</summary>${check('fixtureShadows','Nearest fixture casts a shadow')}${b('Light fixtures',"FourDReview.panel('lights')")}<div class="studio-action-grid">${b('Warm · 2700 K','FourDRealism.roomTemperature(2700)')}${b('Neutral · 4000 K','FourDRealism.roomTemperature(4000)')}${b('Cool · 6000 K','FourDRealism.roomTemperature(6000)')}${b('Toggle selected room lights','FourDRealism.toggleRoomLights()')}</div>${check('naturalGarden','Natural planting & lawn borders')}${check('walkAssist','Smooth steps & prevent floor falls')}${b('Start walkthrough settings','StudioEnhancements.walkDialog()')}</details>
      <div class="studio-action-grid">${b('Photoreal Still','FourDStill.open()')}${b('Profile this design',"FourDReview.panel('performance')")}</div><output id="fourd-realism-status" aria-live="polite">${ProjectModel.escapeHTML(this.status||'Realism ready')}</output>`;
  },
  selectedRoom(){return elements[selectedElIndex]&&!elements[selectedElIndex].isFurniture?elements[selectedElIndex]:null;},
  roomTemperature(k){const room=this.selectedRoom();if(!room)return StudioUI.message('Select a room first.');if(!FourDStudio.settings.fixtures.some(f=>f.room===room.id))return StudioUI.message('Add a fixture to this room under Review → Lights first.');return ProjectState.commit('Room light temperature',()=>FourDStudio.settings.fixtures.filter(f=>f.room===room.id).forEach(f=>f.temperature=k));},
  toggleRoomLights(){const room=this.selectedRoom();if(!room)return StudioUI.message('Select a room first.');const fixtures=FourDStudio.settings.fixtures.filter(f=>f.room===room.id);if(!fixtures.length)return StudioUI.message('Add a fixture to this room under Review → Lights first.');const value=!fixtures.some(f=>f.enabled);return ProjectState.commit('Room lights',()=>fixtures.forEach(f=>f.enabled=value));},
  project(){return StudioEnhancements.modelProject||ProjectState.capture();},
  context(camera=Engine3D.camera){
    const p=this.project(),{SCALE:S,I}=get3DEnvironmentParams(),v=camera.position;
    return FourDRealismModel.roomAt(p,{x:(v.x-I.x)/S,y:v.y/S,z:(v.z-I.z)/S});
  },
  moving(){return !!(StudioEnhancements.navigating||FourDViews.transition||StudioEnhancements.walkMoving);},
  resetMaterials(){this.clearStairs(false);this.materialState=new WeakMap();this.meshState=new WeakMap();this.materialKey=null;this.queue=null;this.contextKey=null;this.projectionVertices=0;},
  materialDefaults(m){
    let state=this.materialState.get(m);if(!state){state={color:m.color?.clone(),roughness:m.roughness,normalScale:m.normalScale?.clone(),transmission:m.transmission,opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,thickness:m.thickness,env:m.envMapIntensity,maps:{},originalMaps:Object.fromEntries(['map','bumpMap','normalMap','roughnessMap'].map(key=>[key,m[key]||null]))};
      for(const k of ['map','bumpMap','normalMap','roughnessMap'])if(m[k])state.maps[k]={texture:m[k],repeat:m[k].repeat.clone(),offset:m[k].offset.clone(),center:m[k].center.clone(),rotation:m[k].rotation};this.materialState.set(m,state);
    }return state;
  },
  restoreMaterial(m,state){
    for(const [key,texture]of Object.entries(state.originalMaps)){m[key]=texture;if(texture)Engine4D.sceneResources.textures.add(texture);}
    if(state.color)m.color.copy(state.color);m.roughness=state.roughness;if(state.normalScale)m.normalScale.copy(state.normalScale);
    for(const k of ['transmission','opacity','transparent','depthWrite','thickness'])if(state[k]!==undefined)m[k]=state[k];
    for(const [key,map]of Object.entries(state.maps))if(m[key]===map.texture){Object.assign(m[key],{rotation:map.rotation});m[key].repeat.copy(map.repeat);m[key].offset.copy(map.offset);m[key].center.copy(map.center);}
  },
  mapMesh(n,p){
    const s=this.settings,room=p.elements.find(e=>e.id===(n.userData.elementId||p.elements[n.userData.roomIndex]?.id)),materials=[].concat(n.material||[]);
    const architectural=room&&!room.isFurniture&&(n.userData.isWall||n.userData.isRoom||n.userData.presentationSurface||materials.some(m=>m.userData.presentationSurface));
    let record=this.meshState.get(n);
    if(record?.geometry!==n.geometry&&record?.original!==n.geometry){record=null;this.meshState.delete(n);}
    const active=s.enabled&&s.materialScale&&architectural&&n.geometry?.attributes.position&&n.geometry.attributes.position.count<60000;
    if(active&&!record&&this.projectionVertices+n.geometry.attributes.position.count<500000){
      const original=n.geometry,geometry=original.clone();record={original,geometry};n.geometry=geometry;this.meshState.set(n,record);Engine4D.sceneResources.geometries.add(geometry);this.projectionVertices+=geometry.attributes.position.count;
    }
    if(!active&&record){n.geometry=record.original;Engine4D.sceneResources.geometries.add(record.original);Engine4D.sceneResources.geometries.delete(record.geometry);record.geometry.dispose();this.meshState.delete(n);record=null;}
    if(active&&record){
      const geometry=n.geometry,pos=geometry.attributes.position,norm=geometry.attributes.normal,uv=new Float32Array(pos.count*2),point=new THREE.Vector3(),normal=new THREE.Vector3(),matrix=new THREE.Matrix3().getNormalMatrix(n.matrixWorld),{SCALE:S,I}=get3DEnvironmentParams();
      for(let i=0;i<pos.count;i++){
        point.fromBufferAttribute(pos,i).applyMatrix4(n.matrixWorld);if(norm)normal.fromBufferAttribute(norm,i).applyMatrix3(matrix).normalize();else normal.set(0,1,0);
        // Opposing faces share a stable plan origin, so adjoining walls keep courses aligned.
        const axis=Math.abs(normal.y)>.7?'y':Math.abs(normal.x)>Math.abs(normal.z)?'x':'z';
        uv[i*2]=(axis==='x'?point.z-I.z:point.x-I.x)/S;uv[i*2+1]=(axis==='y'?point.z-I.z:point.y)/S;
      }geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    }
    for(const m of materials){
      if(!m.color)continue;const state=this.materialDefaults(m);this.restoreMaterial(m,state);
      if(s.enabled){
        const channel=m.userData.presentationSurface||n.userData.presentationSurface||'floor',saved=room&&p.design.presentation.surfaces[room.id]?.[channel];
        let type=m.userData.fourDMaterial||saved?.type;
        const defaultFloor=architectural&&channel==='floor'&&!n.userData.isWall&&!saved&&!m.userData.glazing,
          defaultPaint=architectural&&n.userData.isWall&&!saved&&!state.originalMaps.normalMap;
        if(defaultFloor)type=getTextureForRoom(room);
        if((defaultFloor||defaultPaint)&&s.textureDetail&&FourDModel.materials[type||'paint']){
          const generatedType=defaultPaint?'paint':type;
          if(!state.generatedMaps){state.generatedMaps={};for(const [slot,texture]of Object.entries(FourDTextures.get(generatedType))){if(defaultPaint&&slot==='map')continue;const copy=texture.clone();copy.needsUpdate=true;state.generatedMaps[slot]=copy;Engine4D.sceneResources.textures.add(copy);FourDAssets.prepareTexture(copy,texture);}}
          const repeat=state.maps.map?.repeat||new THREE.Vector2(1,1);
          for(const [slot,texture]of Object.entries(state.generatedMaps)){m[slot]=texture;texture.repeat.copy(repeat);texture.offset.set(0,0);texture.center.set(.5,.5);texture.rotation=0;}
          m.bumpMap=null;m.normalScale?.setScalar(defaultPaint?.1:FourDModel.materials[type].normalStrength);
          if(defaultFloor)m.color.set(room.customColor||FourDModel.materials[type].color).convertSRGBToLinear();
        }
        if(active&&record){const period=FourDRealismModel.period(type,s),scale=saved?.scale||1,origin=saved?.origin||[0,0];
          for(const key of ['map','normalMap','roughnessMap','bumpMap'])if(m[key]){m[key].repeat.set(scale/period[0],scale/period[1]);m[key].offset.set(-origin[0]*scale/period[0],-origin[1]*scale/period[1]);m[key].center.set(0,0);m[key].rotation=(saved?.rotation||0)*Math.PI/180;}
        }
        if(m.normalScale)m.normalScale.multiplyScalar(s.textureDetail?s.textureStrength:0);
        if(m.userData.glazing){
          m.color.set(s.glazing==='tinted'?'#a8c3ba':'#e6f3f5').convertSRGBToLinear();m.roughness=s.glazing==='frosted'?.48:.055;m.thickness=.24*get3DEnvironmentParams().SCALE;
        }
      }
      if(!s.enabled&&m.userData.glazing){const physical=Engine4D.physicalGlass;m.transmission=physical?.88:0;m.opacity=physical?1:.3;m.transparent=!physical;m.depthWrite=physical;}
      m.needsUpdate=true;
    }
  },
  materials(){
    if(this.settings.enabled)this.wasEnabled=true;
    if(!this.settings.enabled&&!this.wasEnabled){this.queue=null;return;}
    const p=this.project(),key=JSON.stringify([Engine4D.modelVersion,this.settings,p.design.presentation.surfaces,Engine4D.physicalGlass]);
    if(key!==this.materialKey){this.materialKey=key;this.queue=[];this.projectionVertices=0;Engine4D.model.updateMatrixWorld(true);Engine4D.model.traverse(n=>{if(n.isMesh&&n.material){this.queue.push(n);if(this.meshState.has(n))this.projectionVertices+=n.geometry.attributes.position.count;}});}
    const began=performance.now();while(this.queue?.length){this.mapMesh(this.queue.shift(),p);if(performance.now()-began>6)break;}
    if(this.queue?.length)Engine3D.needsRender=true;else this.wasEnabled=this.settings.enabled;
  },
  lighting(camera){
    const e=Engine4D,s=this.settings,room=s.enabled?this.context(camera):null,key=[e.preset,e.modelVersion,JSON.stringify(s),room?.id,FourDStudio.revision].join('|');
    if(this.basePreset!==e.preset||!this.baseLight){this.basePreset=e.preset;this.baseLight={fill:e.fill.intensity,rim:e.rim.intensity};}
    if(key!==this.contextKey){this.contextKey=key;this.room=room;this.daylight=room?FourDRealismModel.daylight(this.project(),room):1;}
    const interior=!!(s.enabled&&s.roomLighting&&room),day=this.daylight??1;
    e.fill.intensity=this.baseLight.fill*(interior ? .12+.55*day : 1);e.rim.intensity=this.baseLight.rim*(interior ? .04+.16*day : 1);
    const target=e.exposure*(s.enabled&&s.autoExposure&&room?1.05+.25*(1-day):1),now=performance.now(),dt=Math.min(.1,(now-(this.lightAt||now))/1000);this.lightAt=now;
    const old=e.renderer.toneMappingExposure,value=FourDRender.active?old:old+(target-old)*(1-Math.exp(-dt*3*s.exposureSpeed));e.renderer.toneMappingExposure=Math.abs(value-target)<.001?target:value;
    if(Math.abs(value-target)>.001&&!FourDRender.active)Engine3D.needsRender=true;
    for(const m of e.materials){const base=m.userData.environmentBase??m.envMapIntensity??1;
      m.envMapIntensity=base*FourDStudio.settings.environmentIntensity*(interior ? .18+.52*day : 1);
      if(m.userData.glazing&&(s.enabled||this.wasEnabled)){const physical=e.physicalGlass&&(!s.enabled||!this.moving());const changed=(m.transmission>0)!==physical;m.transmission=physical?(s.glazing==='frosted'?.65:.88):0;m.opacity=physical?1:s.glazing==='frosted'?.65:.3;m.transparent=!physical;m.depthWrite=physical;if(changed)m.needsUpdate=true;}
    }
    const status=room?`Interior · ${room.customName||room.type} · cached room reflections`:'Exterior · settled detail';this.status=status;const out=document.getElementById('fourd-realism-status');if(out&&out.textContent!==status)out.textContent=status;
  },
  stairRevision:0,
  clearStairs(dispose=true){
    this.stairRevision++;for(const row of this.stairGroups||[]){row.mesh.parent?.remove(row.mesh);if(dispose){Engine4D.sceneResources?.geometries.delete(row.mesh.geometry);row.mesh.geometry.dispose();}}
    this.stairGroups=[];this.stairKey=null;
  },
  stairs(){
    const enabled=this.settings.enabled&&this.settings.edgeDetail,p=this.project(),version=Engine4D.modelVersion,key=enabled?JSON.stringify([version,p.elements.filter(e=>e.type==='staircase').map(e=>p.design.presentation.surfaces[e.id]),StudioEnhancements.preview]):null;
    if(!enabled){if(this.stairKey!=null||this.stairGroups?.length)this.clearStairs();return;}
    if(this.stairKey!==key){
      this.stairKey=key;const revision=++this.stairRevision,session=FourDWorkspace.token,
        valid=()=>revision===this.stairRevision&&session===FourDWorkspace.token&&version===Engine4D.modelVersion&&this.stairKey===key&&FourDWorkspace.running&&!FourDWorkspace.paused&&!document.hidden,
        {SCALE:S,I}=get3DEnvironmentParams();
      (async()=>{const prepared=[];
        try{for(const room of p.elements.filter(e=>e.type==='staircase')){
          const stair=WorkbenchModel.orientedStairs(p,room);if(!stair)continue;
          const originals=[];Engine4D.model.traverse(n=>{if(n.isMesh&&!n.userData.realismStair&&p.elements[n.userData.roomIndex]?.id===room.id)originals.push(n);});if(!originals.length)continue;
          const packed=await FourDJobs.run({kind:'stairSolid',treads:stair.treads,scale:S},valid);
          const geometry=FourDJobs.unpack(packed),pos=geometry.attributes.position,uv=[];for(let i=0;i<pos.count;i++)uv.push(pos.getX(i)/S,pos.getZ(i)/S);geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
          const mesh=new THREE.Mesh(geometry,originals[0].material);mesh.position.set(I.x,WorkbenchModel.roomBase(p,room)*S,I.z);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={elementId:room.id,roomIndex:p.elements.indexOf(room),floor:room.floor,isRoom:true,realismStair:true};prepared.push({mesh,originals,base:mesh.position.y,floor:room.floor});
        }
        if(!valid())throw new DOMException('Superseded stairs','AbortError');
        for(const old of this.stairGroups||[]){old.mesh.parent?.remove(old.mesh);Engine4D.sceneResources.geometries.delete(old.mesh.geometry);old.mesh.geometry.dispose();}
        this.stairGroups=prepared;for(const row of prepared){Engine4D.model.add(row.mesh);Engine4D.sceneResources.geometries.add(row.mesh.geometry);}Engine4D.renderer.shadowMap.needsUpdate=true;Engine3D.needsRender=true;
       }catch(error){prepared.forEach(row=>row.mesh.geometry.dispose());if(error.name!=='AbortError')console.warn('Stair surface detail',error);if(revision===this.stairRevision)this.stairKey=null;}
      })();
    }
    for(const row of this.stairGroups||[]){row.mesh.visible=row.originals.some(n=>n.visible);row.mesh.position.y=row.base+row.floor*StudioEnhancements.explosion*get3DEnvironmentParams().SCALE;row.originals.forEach(n=>n.visible=false);}
  },
  garden(){
    if(FourDWorkspace.progressivePending)return;
    const key=JSON.stringify([this.settings.enabled,this.settings.naturalGarden]);
    if(this.gardenKey==null){this.gardenKey=key;return;}if(this.gardenKey===key)return;this.gardenKey=key;
    const revision=++this.gardenRevision,session=FourDWorkspace.token,version=Engine4D.modelVersion,
      valid=()=>revision===this.gardenRevision&&session===FourDWorkspace.token&&version===Engine4D.modelVersion&&FourDWorkspace.running&&!FourDWorkspace.paused&&!document.hidden;
    Landscape4D.buildAsync(Engine4D,()=>new Promise(r=>setTimeout(r,0)),valid).then(()=>{if(valid())Engine3D.needsRender=true;}).catch(error=>{if(error.name!=='AbortError')StudioUI.message('Garden detail: '+error.message,'error');if(revision===this.gardenRevision)this.gardenKey='';});
  },
  gardenRevision:0,
  frame(camera){if(!FourDWorkspace.running)return;this.materials();this.stairs();if(this.settings.enabled&&this.settings.contactShadows)Engine4D.key.shadow.normalBias=.08*get3DEnvironmentParams().SCALE;else Engine4D.key.shadow.normalBias=.25;this.garden();},
  // Query actual tread and landing elevations; accept only a normal walking step.
  walkSurface(point){
    const p=this.project(),M=PlanningModel,W=WorkbenchModel,{SCALE:S,I}=get3DEnvironmentParams(),q={x:(point.x-I.x)/S,y:(point.z-I.z)/S},feet=Engine3D.camera.position.y/S-StudioEnhancements.data.eyeHeight,levels=[];
    for(const e of p.elements){if(e.isFurniture)continue;const base=W.roomBase(p,e);
      if(e.type==='staircase'){const stair=W.orientedStairs(p,e);if(stair)for(const t of stair.treads)if(M.inside(q,t.points))levels.push({height:base+t.top,floor:e.floor});}
      else if(M.inside(q,M.points(e)))levels.push({height:base,floor:e.floor});
    }
    const voids=[...W.data(p).voids,...W.data(p).shafts];
    const candidates=levels.filter(l=>Math.abs(l.height-feet)<=12&&!voids.some(v=>l.floor>=v.from&&l.floor<=v.to&&M.inside(q,v.points||M.points(v))));
    return candidates.sort((a,b)=>Math.abs(a.height-feet)-Math.abs(b.height-feet))[0]||null;
  },
  walk(point,dt){
    if(!this.settings.enabled||!this.settings.walkAssist)return point;
    const surface=this.walkSurface(point);if(!surface)return Engine3D.camera.position.clone();
    const target=(surface.height+StudioEnhancements.data.eyeHeight)*get3DEnvironmentParams().SCALE;
    // Follow treads quickly enough that the next riser remains within the step limit.
    point.y+=(target-point.y)*(1-Math.exp(-dt*24));StudioEnhancements.walkFloor=surface.floor;return point;
  },
  stop(){this.clearStairs();this.gardenRevision++;this.gardenKey=null;this.wasEnabled=false;this.resetMaterials();this.baseLight=null;this.basePreset=null;this.lightAt=null;this.room=null;},
};
