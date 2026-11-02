/* On-demand still rendering. One worker, bounded scene/resolution/time and explicit
 * cancellation. The interactive raster engine remains the immediate fallback. */
window.FourDStill={
 token:0,active:false,
 open(){
  if(!FourDWorkspace.running||FourDWorkspace.paused)return StudioUI.message('Start Render 4D first.');
  const s=FourDStudio.settings.realism,b=(l,a)=>StudioUI.button(l,'FourDStudio.run(()=>'+a+')');
  StudioUI.dialog('Photoreal Still',`<p>Experimental CPU path tracing · diffuse bounced light, sun shadows, approximate rough reflections and thin glass. Runs separately from interactive rendering.</p><div class="studio-field-grid"><label>Image width<select aria-label="Still image width" onchange="FourDRealism.change('stillWidth',Number(this.value))">${[160,320,480,640,960].map(n=>`<option ${s.stillWidth===n?'selected':''}>${n}</option>`).join('')}</select></label><label>Time limit (seconds)<input aria-label="Still time limit" type="number" min="2" max="60" value="${s.stillSeconds}" onchange="FourDRealism.change('stillSeconds',Number(this.value))"></label><label>Samples<input aria-label="Still samples" type="number" min="1" max="128" value="${s.stillSamples}" onchange="FourDRealism.change('stillSamples',Number(this.value))"></label><label>Light bounces<input aria-label="Still light bounces" type="number" min="1" max="6" value="${s.stillBounces}" onchange="FourDRealism.change('stillBounces',Number(this.value))"></label></div><div class="studio-action-grid">${b('Render photoreal still','FourDStill.start()')}${b('Cancel still render','FourDStill.cancel()')}${b('Use raster PNG','Engine4D.capture()')}${b('Download still PNG','FourDStill.download()')}</div><output id="fourd-still-status" role="status" aria-live="polite">${ProjectModel.escapeHTML(this.status||'Ready · no still worker is running')}</output><canvas id="fourd-still-preview" aria-label="Photoreal still preview" hidden></canvas><p class="studio-hint">Up to 200,000 visible triangles and one CPU worker. Large scenes fall back to raster PNG. Texture color and cutout alpha are sampled; normal maps, volumetrics and photographic depth of field use the raster renderer. Low sample counts can be noisy. Time limits may leave a partial preview. Moving, editing, closing this panel, hiding the tab or stopping 4D cancels the task.</p>`);
  if(this.result)this.paint(this.result.pixels,this.result.width,this.result.height);
 },
 message(text){this.status=text;const out=document.getElementById('fourd-still-status');if(out)out.textContent=text;},
 paint(pixels,width,height){const canvas=document.getElementById('fourd-still-preview');if(!canvas)return;canvas.hidden=false;canvas.width=width;canvas.height=height;canvas.getContext('2d').putImageData(new ImageData(pixels,width,height),0,0);},
 cancel(reason='Still cancelled · interactive view is ready'){
  ++this.token;this.worker?.terminate();this.worker=null;clearTimeout(this.watchdog);this.observer?.disconnect();this.events?.abort();this.resolve?.({cancelled:true});this.resolve=null;
  const wasActive=this.active;this.active=false;if(wasActive)this.message(reason);
 },
 async start(){
  this.cancel();this.result=null;
  if(!FourDWorkspace.running||FourDWorkspace.paused||FourDWorkspace.starting||FourDWorkspace.structuralPending)return this.message('Wait for scene preparation to finish, then render the still.');
  if(StudioEnhancements.walking||FourDViews.transition||FourDStudio.playing||FourDStudio.comparison)return this.message('Settle the camera and stop the tour or comparison first.');
  const token=++this.token,session=FourDWorkspace.token,valid=()=>token===this.token&&session===FourDWorkspace.token&&FourDWorkspace.running&&!FourDWorkspace.paused&&!document.hidden;
  this.active=true;this.message('Preparing visible geometry…');
  this.events=new AbortController();const signal=this.events.signal;
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.cancel();},{signal});
  Engine3D.renderer.domElement.addEventListener('pointerdown',()=>this.cancel('View input cancelled the still'),{signal});
  Engine3D.renderer.domElement.addEventListener('wheel',()=>this.cancel('View input cancelled the still'),{signal,passive:true});
  const panel=document.getElementById('fourd-still-preview')?.closest('#studio-dialog');
  if(!panel){this.cancel();return this.message('Open Photo → Photoreal Still before rendering.');}
  this.observer=new MutationObserver(()=>{if(!document.getElementById('fourd-still-preview')||!panel.open)this.cancel();});this.observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  this.promise=(async()=>{
   try{
    const data=await this.snapshot(valid);if(!valid())return;const triangleCount=data.materialIds.length;
    this.worker=new Worker('js/fourd-still-worker.js');this.message('Tracing bounced light…');
    this.watchdog=setTimeout(()=>this.cancel('Still time limit reached · use raster PNG or a smaller image'),(data.seconds+8)*1000);
    return await new Promise((resolve,reject)=>{
     this.resolve=resolve;
     this.worker.onerror=event=>{event.preventDefault();reject(Error('Still worker unavailable. Use raster PNG.'));};
     this.worker.onmessage=({data:message})=>{
      if(!valid())return;
      if(message.kind==='error')return reject(Error(message.message));
      if(message.pixels)this.paint(message.pixels,data.width,data.height);
      if(message.kind==='complete'){
       this.result={...message,width:data.width,height:data.height,triangles:triangleCount};
       this.message(`${message.limited?'Time limit reached':'Finished'} · ${message.samples} full samples · ${Math.round(message.milliseconds/1000)} s · ${Math.round(message.covered/(data.width*data.height)*100)}% coverage${data.textureFallbacks?' · '+data.textureFallbacks+' textures use base color':''}`);resolve(this.result);
      }else this.message(`Tracing · ${message.samples} full samples · ${message.rows}/${data.height} rows`);
     };
     const transfers=[data.positions.buffer,data.normals.buffer,data.uvs.buffer,data.materialIds.buffer,...data.textures.map(t=>t.pixels.buffer)];if(data.environment)transfers.push(data.environment.pixels.buffer);
     this.worker.postMessage(data,transfers);
    });
   }catch(error){if(valid())this.message(error.message+' Interactive view remains available; use raster PNG.');return {error:error.message};}
   finally{if(token===this.token){this.worker?.terminate();this.worker=null;clearTimeout(this.watchdog);this.observer?.disconnect();this.events?.abort();this.resolve=null;this.active=false;}}
  })();return this.promise;
 },
 async snapshot(valid){
  const e=Engine4D,s=FourDStudio.settings.realism,previous=FourDWorkspace.exporting;
  FourDRender.cancelPhoto();FourDWorkspace.exporting=true;
  try{if(!e.render())throw Error('Recover the renderer before exporting.');while(FourDRealism.queue?.length){if(!valid())throw Error('Still cancelled');e.render();await new Promise(r=>setTimeout(r,0));}}
  finally{FourDWorkspace.exporting=previous;Engine3D.needsRender=true;}
  const positions=[],normals=[],uvs=[],materialIds=[],materials=[],textures=[],textureMap=new Map(),materialMap=new Map(),nodes=[];let textureFallbacks=0;
  e.scene.updateMatrixWorld(true);e.scene.traverseVisible(n=>{if(n.isMesh&&!n.userData.fourDAuxiliary&&!n.userData.isLODProxy)nodes.push(n);});
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const context=canvas.getContext('2d',{willReadFrequently:true});
  const textureIndex=map=>{if(!map?.image)return -1;if(textureMap.has(map.uuid))return textureMap.get(map.uuid);if(textures.length>=64){textureFallbacks++;return -1;}
   try{context.clearRect(0,0,64,64);context.drawImage(map.image,0,0,64,64);const index=textures.length;textures.push({width:64,height:64,srgb:map.encoding===THREE.sRGBEncoding,pixels:context.getImageData(0,0,64,64).data});textureMap.set(map.uuid,index);return index;}catch{textureFallbacks++;textureMap.set(map.uuid,-1);return -1;}
  };
  const materialIndex=(m,instanceColor,mirror=false)=>{const key=m.uuid+mirror+(instanceColor?instanceColor.toArray().map(x=>Math.round(x*10)).join(','):'');if(materialMap.has(key))return materialMap.get(key);if(materials.length>=512)throw Error('Too many material variants for the bounded still renderer');
   const color=(m.color||new THREE.Color(0xffffff)).clone();if(instanceColor)color.multiply(instanceColor);
   const i=materials.length;materials.push({color:color.toArray(),roughness:mirror?0:m.roughness??.8,metalness:mirror?1:m.metalness||0,opacity:m.userData.glazing?1:m.opacity??1,glass:!!(m.userData.glazing||m.transmission>.1),emissive:(m.emissive||new THREE.Color(0)).clone().multiplyScalar(m.emissiveIntensity??1).toArray(),texture:textureIndex(m.map),flipY:m.map?.flipY!==false,alphaTest:m.alphaTest||0});materialMap.set(key,i);return i;
  };
  const clipping=e.renderer.clippingPlanes;
  const lerpVertex=(a,b,t)=>({p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t),uv:a.uv.clone().lerp(b.uv,t)});
  const clip=vertices=>{for(const plane of clipping){const next=[];for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],da=plane.distanceToPoint(a.p),db=plane.distanceToPoint(b.p);if(da>=0)next.push(a);if((da>=0)!==(db>=0))next.push(lerpVertex(a,b,da/(da-db)));}vertices=next;if(!vertices.length)break;}return vertices;};
  let at=performance.now();
  for(const node of nodes){
   if(!valid())throw Error('Still cancelled');if(node.isSkinnedMesh||node.morphTargetInfluences?.some(v=>v))throw Error('Animated meshes require raster PNG');
   const geometry=node.geometry,pos=geometry?.attributes.position;if(!pos)continue;const norm=geometry.attributes.normal,uv=geometry.attributes.uv,index=geometry.index,groups=geometry.groups,
     count=index?.count||pos.count,start=geometry.drawRange.start||0,end=Math.min(count,start+(geometry.drawRange.count||count)),instances=node.isInstancedMesh?node.count:1;
   for(let instance=0;instance<instances;instance++){
    const matrix=node.matrixWorld.clone(),instanceColor=node.instanceColor?new THREE.Color():null;
    if(node.isInstancedMesh){const local=new THREE.Matrix4();node.getMatrixAt(instance,local);matrix.multiply(local);if(instanceColor)node.getColorAt(instance,instanceColor);}
    const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix);
    for(let offset=start;offset+2<end;offset+=3){
     const slot=groups.find(g=>offset>=g.start&&offset<g.start+g.count)?.materialIndex||0,m=Array.isArray(node.material)?node.material[slot]:node.material;if(!m?.visible||m.opacity===0)continue;
     if(materialIds.length>=200000)throw Error('Visible scene exceeds 200,000 triangles');const mat=materialIndex(m,instanceColor,!!node.userData.mirror),vertices=[];m.map?.updateMatrix();
     for(let j=0;j<3;j++){const k=index?index.getX(offset+j):offset+j,point=new THREE.Vector3().fromBufferAttribute(pos,k).applyMatrix4(matrix),normal=norm?new THREE.Vector3().fromBufferAttribute(norm,k).applyMatrix3(normalMatrix).normalize():new THREE.Vector3(0,1,0),tex=uv?new THREE.Vector2().fromBufferAttribute(uv,k):new THREE.Vector2();if(m.map)tex.applyMatrix3(m.map.matrix);vertices.push({p:point,n:normal,uv:tex});}
     const polygon=clipping.length?clip(vertices):vertices;
     for(let j=1;j+1<polygon.length;j++){for(const v of [polygon[0],polygon[j],polygon[j+1]]){positions.push(...v.p.toArray());normals.push(...v.n.toArray());uvs.push(...v.uv.toArray());}materialIds.push(mat);if(materialIds.length>200000)throw Error('Clipped scene exceeds triangle budget');}
     if(performance.now()-at>7){this.message('Preparing '+materialIds.length.toLocaleString()+' visible triangles…');await new Promise(r=>setTimeout(r,0));at=performance.now();if(!valid())throw Error('Still cancelled');}
    }
   }
  }
  if(!materialIds.length)throw Error('No visible geometry in this view');
  const camera=e.camera,forward=new THREE.Vector3(),right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);camera.getWorldDirection(forward);
  const width=s.stillWidth,height=Math.max(1,Math.min(960,Math.round(width/camera.aspect))),proj=camera.projectionMatrix.elements,
   lights=[];e.scene.traverseVisible(n=>{if(n.isSpotLight&&n.intensity>0&&lights.length<8){const position=n.getWorldPosition(new THREE.Vector3()),target=n.target.getWorldPosition(new THREE.Vector3());lights.push({position:position.toArray(),direction:target.sub(position).normalize().toArray(),color:n.color.toArray(),intensity:n.intensity,angle:n.angle});}});
  let environment=null;const sky=FourDRender.sky?.image;
  if(sky?.data){const w=128,h=64,pixels=new Float32Array(w*h*3),stride=sky.data.length/(sky.width*sky.height),half=sky.data instanceof Uint16Array;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const source=(Math.floor(y/h*sky.height)*sky.width+Math.floor(x/w*sky.width))*stride;for(let k=0;k<3;k++){const v=sky.data[source+k];pixels[(y*w+x)*3+k]=half?FourDRealismModel.halfToFloat(v):v;}}environment={width:w,height:h,pixels};
  }
  return {width,height,seconds:s.stillSeconds,samples:s.stillSamples,bounces:s.stillBounces,positions:new Float32Array(positions),normals:new Float32Array(normals),uvs:new Float32Array(uvs),materialIds:new Uint32Array(materialIds),materials,textures,textureFallbacks,environment,environmentIntensity:FourDStudio.settings.environmentIntensity,showSky:FourDStudio.settings.showSky,background:e.scene.background?.isColor?e.scene.background.toArray():[.2,.25,.3],exposure:e.renderer.toneMappingExposure,
   camera:{position:camera.position.toArray(),forward:forward.toArray(),right:right.toArray(),up:up.toArray(),orthographic:camera.isOrthographicCamera,halfWidth:1/proj[0],halfHeight:1/proj[5],shiftX:proj[8],shiftY:proj[9]},
   sun:{direction:e.key.position.clone().sub(e.key.target.position).normalize().toArray(),color:e.key.color.toArray(),intensity:e.key.intensity},lights};
 },
 download(){
  if(!this.result)return StudioUI.message('Complete a still render first.');const canvas=document.createElement('canvas');canvas.width=this.result.width;canvas.height=this.result.height;canvas.getContext('2d').putImageData(new ImageData(this.result.pixels,this.result.width,this.result.height),0,0);canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='ArchCAD_Photoreal_Still.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 },
};
