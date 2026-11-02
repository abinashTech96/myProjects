/* Owned presentation detail, fixture rig and worker-generated section surfaces. */
window.FourDDetails={
 generation:0,capRevision:0,
 disposeGroup(key){const group=this[key];if(!group)return;group.parent?.remove(group);const g=new Set(),m=new Set();if(group.ownedMaterial)m.add(group.ownedMaterial);group.traverse(n=>{if(n.geometry)g.add(n.geometry);if(n.isLight)n.shadow?.map?.dispose();for(const mat of [].concat(n.material||[]))m.add(mat);});g.forEach(x=>x.dispose());m.forEach(x=>x.dispose());this[key]=null;},
 reset(){this.generation++;this.detailKey=null;this.fixtureKey=null;this.capKey=null;this.capRevision++;clearTimeout(this.capTimer);this.disposeGroup('details');this.disposeGroup('capGroup');this.disposeGroup('fixtureGroup');this.disposeGroup('fixtureBodies');},
 *buildSteps(attach=true){
  this.disposeGroup('details');if(!FourDStudio.settings.detailing)return;
  const p=StudioEnhancements.modelProject||ProjectState.capture(),{SCALE:S,I}=get3DEnvironmentParams(),group=new THREE.Group();group.name='Architectural trim';this.details=group;if(attach)Engine4D.scene.add(group);
  this.detailSkipped=0;const budget=FourDWorkspace.quality==='eco'?300:FourDWorkspace.quality==='high'?1600:900;
  const realism=FourDStudio.settings.realism,refined=realism.enabled&&realism.edgeDetail;
  const mat=new THREE.MeshStandardMaterial({color:0xd5d1c5,roughness:.7});
  group.ownedMaterial=mat;
  const walls=ProjectModel.walls(p),thicknessByOpening=new Map(walls.flatMap(w=>w.openings.map(o=>[o.id,w.thickness])));
  const strip=(a,b,base,height,width,data)=>{if(group.children.length>=budget){this.detailSkipped++;return;}const length=Math.hypot(b.x-a.x,b.y-a.y);if(length<.1)return;const mesh=new THREE.Mesh((refined?FourDJobs.unpack(FourDGeometry.run({kind:'rounded',boxes:[{w:length*S,h:height*S,d:width*S,r:Math.min(.08,length/6,height/6,width/6)*S} ]})[0]):new THREE.BoxGeometry(length*S,height*S,width*S)),mat);mesh.position.set(I.x+(a.x+b.x)*S/2,(base+height/2)*S,I.z+(a.y+b.y)*S/2);mesh.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);mesh.userData={...data,detailBase:mesh.position.y};mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);};
  // Offset short strips to the room side. Door spans remain clear down to the floor.
  for(const wall of walls){
   const a=wall.a||{x:wall.horizontal?wall.start:wall.fixed,y:wall.horizontal?wall.fixed:wall.start},b=wall.b||{x:wall.horizontal?wall.end:wall.fixed,y:wall.horizontal?wall.fixed:wall.end},len=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/len,dy=(b.y-a.y)/len;
   if(!len)continue;
   for(const owner of wall.owners.filter(o=>o.index!=null)){
    const room=p.elements[owner.index];if(!room||room.isFurniture)continue;const center={x:room.x+room.w/2,y:room.y+room.h/2},side=Math.sign((-dy)*(center.x-a.x)+dx*(center.y-a.y))||1,inset=(wall.thickness/2+.3)*side;
    const at=t=>({x:a.x+dx*t-dy*inset,y:a.y+dy*t+dx*inset}),cuts=[...new Set([0,len,...wall.openings.filter(o=>o.sill<5).flatMap(o=>[o.start,o.end])])].sort((a,b)=>a-b);
    for(let i=1;i<cuts.length;i++){const lo=cuts[i-1],hi=cuts[i],mid=(lo+hi)/2;if(wall.openings.some(o=>o.sill<5&&mid>o.start&&mid<o.end))continue;strip(at(lo+.05),at(hi-.05),WorkbenchModel.roomBase(p,room)+.2,4,.55,{elementId:room.id,floor:room.floor});}
   }
   if(refined&&wall.owners.length===1)strip(a,b,(wall.base??WorkbenchModel.floorBase(p,wall.floor))+(wall.height??WorkbenchModel.floorHeight(p,wall.floor))+.05,.6,wall.thickness+1.2,{floor:wall.floor,elementId:p.elements[wall.owners[0].index]?.id,roofCoping:true});
   yield;
  }
  // Thin architraves follow the actual opening orientation, width, sill and height.
  for(const opening of p.fixtures){const room=p.elements[opening.roomId],line=PlanningModel.openingSegment(p,opening);if(!room||!line)continue;const a=line.a,b=line.b,len=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/len,dy=(b.y-a.y)/len,thickness=(thicknessByOpening.get(opening.id)||p.wallSettings.external),height=opening.height||(opening.type==='door'?80:40),base=WorkbenchModel.roomBase(p,room)+(opening.sill||0),data={elementId:room.id,floor:room.floor,openingId:opening.id};
   for(const sign of [-1,1]){const at=(t,offset)=>({x:a.x+dx*t-dy*offset,y:a.y+dy*t+dx*offset}),offset=(thickness/2+.35)*sign;
    strip(at(-1,offset),at(len+1,offset),base+height,1.4,.65,data);
    if(opening.type==='window')strip(at(-1,offset),at(len+1,offset),base-.8,.8,1.4,data);
    for(const t of [-.7,len+.7]){strip(at(t-.7,offset),at(t+.7,offset),base,height,.65,data);}
   }
   if(refined){
    if(opening.type==='door')strip(a,b,base+.05,.3,thickness+1,{...data,threshold:true});
    if(opening.type==='window')for(const side of [-1,1]){const offset=side*(thickness/2-.45),at=t=>({x:a.x+dx*t-dy*offset,y:a.y+dy*t+dx*offset});strip(at(0),at(len),base+.5,.25,.3,{...data,glazingSeal:true});strip(at(0),at(len),base+height-.75,.25,.3,{...data,glazingSeal:true});}
   }
   yield;
  }
  if(!group.children.length){mat.dispose();group.ownedMaterial=null;}
 },
 build(){for(const step of this.buildSteps()){};},
 async buildAsync(checkpoint,valid=()=>true){
  const staging=Object.create(this);staging.details=null;const iterator=staging.buildSteps(false);let committed=false;
  try{let began=performance.now();for(;;){if(!valid())throw new DOMException('Detail preparation cancelled','AbortError');const result=iterator.next();if(result.done)break;if(performance.now()-began>=8){await checkpoint();began=performance.now();}}
   await checkpoint();if(!valid())throw new DOMException('Detail preparation cancelled','AbortError');this.disposeGroup('details');this.details=staging.details;this.detailSkipped=staging.detailSkipped;this.detailKey=this.key();if(this.details)Engine4D.scene.add(this.details);committed=true;
  }finally{iterator.return();if(!committed)staging.disposeGroup('details');}
 },
 key(){return Engine4D.modelVersion+'|'+FourDStudio.settings.detailing+'|'+FourDWorkspace.quality+'|'+JSON.stringify([FourDStudio.settings.realism.enabled,FourDStudio.settings.realism.edgeDetail]);},
 lightColor(k){const t=k/100;let r,g,b;if(t<=66){r=255;g=99.4708*Math.log(t)-161.1196;b=t<=19?0:138.5177*Math.log(t-10)-305.0448;}else{r=329.6987*Math.pow(t-60,-.1332);g=288.1222*Math.pow(t-60,-.0755);b=255;}return new THREE.Color().setRGB(...[r,g,b].map(v=>Math.max(0,Math.min(255,v))/255)).convertSRGBToLinear();},
 fixtures(){
  const p=StudioEnhancements.modelProject||ProjectState.capture(),s=FourDStudio.settings,{SCALE:S,I}=get3DEnvironmentParams(),floor=FourDViews.floorIndex??currentFloor,limit=FourDWorkspace.quality==='eco'?1:FourDWorkspace.quality==='high'?8:4;
  if(!this.fixtureGroup){this.fixtureGroup=new THREE.Group();Engine4D.scene.add(this.fixtureGroup);for(let i=0;i<8;i++){const light=new THREE.SpotLight(0xffffff,0,0,Math.PI/4,.55,2);light.castShadow=false;this.fixtureGroup.add(light,light.target);}}
  const fixtures=s.fixtures.filter(f=>p.elements.some(e=>e.id===f.room&&(['element','material'].includes(FourDViews.kind)?e.id===FourDViews.elementId:FourDViews.kind==='floor'?e.floor===floor:true))).map(f=>{
   const room=p.elements.find(e=>e.id===f.room),position=new THREE.Vector3(I.x+(room.x+room.w*f.x)*S,(WorkbenchModel.roomBase(p,room)+f.height+room.floor*StudioEnhancements.explosion)*S,I.z+(room.y+room.h*f.y)*S);return{f,room,position,distance:position.distanceToSquared(Engine3D.camera.position)};
  }).sort((a,b)=>Number(b.f.enabled)-Number(a.f.enabled)||a.distance-b.distance);
  if(fixtures.some(row=>row.f.enabled)&&StudioEnhancements.lightGroup)StudioEnhancements.lightGroup.visible=false;
  const realism=s.realism,refined=realism.enabled;
  if(!this.fixtureBodies){this.fixtureBodies=new THREE.Group();Engine4D.scene.add(this.fixtureBodies);for(let i=0;i<8;i++){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(3*S,3*S,.7*S,12),new THREE.MeshStandardMaterial({color:0xe0d9cd,roughness:.4,emissive:0xffffff,emissiveIntensity:0}));mesh.userData.fourDAuxiliary=true;this.fixtureBodies.add(mesh);}}
  const pool=this.fixtureGroup.children.filter(n=>n.isLight);pool.forEach((light,i)=>{const row=fixtures[i];light.visible=!!(row&&row.f.enabled&&i<limit&&StudioEnhancements.data.lights.enabled);const shadow=!!(refined&&realism.fixtureShadows&&light.visible&&i===0&&FourDWorkspace.quality!=='eco'&&!FourDRealism.moving());if(light.castShadow!==shadow){light.castShadow=shadow;Engine4D.renderer.shadowMap.needsUpdate=true;}if(shadow){light.shadow.mapSize.set(512,512);light.shadow.bias=-.0002;light.shadow.normalBias=.1*S;light.shadow.camera.near=.5*S;}
   const body=this.fixtureBodies.children[i];body.visible=!!(refined&&row&&i<limit);if(!row)return;const {f,room,position}=row;if(light.userData.fixtureId!==f.id){light.userData.fixtureId=f.id;Engine4D.renderer.shadowMap.needsUpdate=true;}body.position.copy(position);body.material.emissive.copy(this.lightColor(f.temperature));body.material.emissiveIntensity=light.visible?Math.min(2,f.intensity):0;light.position.copy(position);light.color.copy(this.lightColor(f.temperature));light.intensity=3000*f.intensity;light.angle=f.spread*Math.PI/360;light.penumbra=.6;light.distance=Math.max(room.w,room.h,f.height)*S*2;const yaw=f.yaw*Math.PI/180,tilt=f.type==='ceiling'?0:f.type==='spot'?.45:1;
   light.target.position.copy(position).add(new THREE.Vector3(Math.sin(yaw)*tilt,-(f.type==='wall'?.3:1),Math.cos(yaw)*tilt).normalize().multiplyScalar(60*S));light.target.updateMatrixWorld();body.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),light.target.position.clone().sub(position).normalize());});
 },
 frame(){
  if(!FourDWorkspace.running||FourDWorkspace.progressivePending)return;const key=this.key();
  if(key!==this.detailKey){
   const refined=FourDStudio.settings.realism.enabled&&FourDStudio.settings.realism.edgeDetail;
   if(refined){if(this.detailJob!==key){this.detailJob=key;const session=FourDWorkspace.token,generation=this.generation,valid=()=>session===FourDWorkspace.token&&generation===this.generation&&FourDWorkspace.running&&this.key()===key;this.buildAsync(()=>new Promise(r=>setTimeout(r,0)),valid).then(()=>{if(valid())Engine3D.needsRender=true;}).catch(error=>{if(error.name!=='AbortError')console.warn('Architectural detail',error);}).finally(()=>{if(this.detailJob===key)this.detailJob=null;});}}
   else{this.detailKey=key;this.build();}
  }
  const kind=FourDViews.kind,focused=StudioEnhancements.focusRoom;
  this.details?.children.forEach(n=>{n.visible=(!focused||n.userData.elementId===focused)&&(FourDViews.floorIndex==null||n.userData.floor===FourDViews.floorIndex);n.position.y=n.userData.detailBase+n.userData.floor*StudioEnhancements.explosion*get3DEnvironmentParams().SCALE;});
  const moving=FourDWorkspace.navigationDetail&&StudioEnhancements.adaptive&&(StudioEnhancements.navigating||!!FourDViews.transition||StudioEnhancements.walking)&&!FourDWorkspace.exporting;
  if(this.details)this.details.visible=!moving;if(this.capGroup)this.capGroup.visible=!moving;
  this.fixtures();this.scheduleCaps();
 },
 scheduleCaps(){
  const key=JSON.stringify([Engine4D.modelVersion,Engine4D.renderer.clippingPlanes.map(p=>[...p.normal.toArray(),p.constant]),StudioEnhancements.explosion,FourDViews.kind,FourDViews.elementId,FourDViews.floorIndex]);
  if(FourDViews.transition){clearTimeout(this.capTimer);this.capKey=null;this.capRevision++;this.disposeGroup('capGroup');return;}
  if(key===this.capKey)return;this.capKey=key;this.capRevision++;clearTimeout(this.capTimer);this.disposeGroup('capGroup');this.capTimer=setTimeout(()=>this.updateCaps().catch(error=>{if(error.name!=='AbortError')console.warn('Section caps',error);}),140);
 },
 async updateCaps(force=false){
  clearTimeout(this.capTimer);if(!FourDWorkspace.running||FourDWorkspace.paused||document.hidden)return;
  const revision=++this.capRevision,session=FourDWorkspace.token,valid=()=>revision===this.capRevision&&session===FourDWorkspace.token&&FourDWorkspace.running&&!FourDWorkspace.paused&&!document.hidden&&!FourDViews.transition;
  const planes=Engine4D.renderer.clippingPlanes.map(p=>p.clone());if(!planes.length){this.disposeGroup('capGroup');return;}
  const group=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0xd9bd91,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});let total=0,open=0,skipped=0;
  const models=[];Engine4D.model.updateMatrixWorld(true);Engine4D.model.traverse(n=>{if(n.isMesh&&(n.userData.isWall||n.userData.isSlab||n.userData.isRoof||n.userData.presentationSurface==='floor')&&!n.userData.isOpening)models.push(n);});
  try{for(const n of models){if(!valid())throw new DOMException('Superseded caps','AbortError');let visible=true;for(let parent=n;parent;parent=parent.parent)if(!parent.visible)visible=false;if(!visible)continue;
    const g=n.geometry,a=g.attributes.position;if(!a)continue;const box=new THREE.Box3().setFromObject(n),intersections=planes.filter(p=>{const center=box.getCenter(new THREE.Vector3()),half=box.getSize(new THREE.Vector3()).multiplyScalar(.5),radius=Math.abs(p.normal.x)*half.x+Math.abs(p.normal.y)*half.y+Math.abs(p.normal.z)*half.z;return Math.abs(p.distanceToPoint(center))<radius-.0001;});if(!intersections.length)continue;
    if(total+a.count*intersections.length>350000){skipped++;continue;}total+=a.count*intersections.length;
    const positions=new Float32Array(a.count*3),point=new THREE.Vector3();for(let i=0;i<a.count;i++){point.fromBufferAttribute(a,i).applyMatrix4(n.matrixWorld);point.toArray(positions,i*3);}
    for(const plane of intersections){const result=await FourDJobs.run({kind:'caps',positions,index:g.index?.array,plane:[...plane.normal.toArray(),plane.constant]},valid);open+=result.open;if(!result.geometry.attributes.position.array.length)continue;
      const mesh=new THREE.Mesh(FourDJobs.unpack(result.geometry),mat);mesh.userData={...n.userData,sectionCap:true};group.add(mesh);
    }
   }
   if(!valid())throw new DOMException('Superseded caps','AbortError');this.disposeGroup('capGroup');this.capGroup=group;Engine4D.scene.add(group);this.capStatus={triangles:total/3,open,skipped,meshes:group.children.length};if(!group.children.length)mat.dispose();Engine3D.needsRender=true;
  }catch(error){group.traverse(n=>n.geometry?.dispose());mat.dispose();if(error.name!=='AbortError')throw error;}
 },
 stop(){this.reset();},
};
