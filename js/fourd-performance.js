/* Opt-in measurements on the user's current design. No architecture edits,
 * remote telemetry, or synthetic FPS claims. */
window.FourDPerformance = {
  revision:0,active:false,
  status(message) {
    let node=document.getElementById('fourd-profile-status');
    if(!node){
      node=document.createElement('div');node.id='fourd-profile-status';node.className='fourd-profile-status';node.setAttribute('role','status');
      const label=document.createElement('span'),button=document.createElement('button');label.dataset.profileMessage='';button.className='studio-button';button.textContent='Cancel profile';button.onclick=()=>this.cancel();
      node.append(label,button);document.getElementById('fourd-workspace').append(node);
    }
    node.hidden=!this.active;node.querySelector('[data-profile-message]').textContent=message;
  },
  cancel(reason='cancel'){this.cancelReason=reason;this.revision++;this.active=false;this.status('Profile cancelled');},
  frame(ms){if(this.active&&this.current){this.current.renderMs.push(ms);if(StudioEnhancements.navigating||FourDViews.transition){this.current.movingMs.push(ms);this.current.movingCalls.push(Engine4D.renderer.info.render.calls);this.current.maxSubstitutions=Math.max(this.current.maxSubstitutions,FourDStudio.navigationCount||0);}}},
  fingerprint() {
    const p=FourDJobs.geometrySnapshot(ProjectState.capture()),s=p.design.presentation.studio;
    const text=JSON.stringify([FourDWorkspace.geometryKey(p),p.design.presentation.surfaces,s.environment,s.environmentIntensity,s.environmentRotation,s.preset,s.fixtures,s.mirrors,s.lod,s.detailing]);let hash=2166136261;
    for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
    return (hash>>>0).toString(16);
  },
  async run() {
    if(this.active||this.profileRunning||!FourDWorkspace.running||FourDWorkspace.paused)return;
    if(FourDWorkspace.starting||FourDWorkspace.structuralPending){StudioUI.message('Wait for the design to finish preparing before profiling.');return;}
    if(FourDViews.tourPlaying||FourDViews.dayPlaying||FourDStudio.playing||FourDReview.queueActive||FourDStudio.comparison){StudioUI.message('Pause the current presentation before profiling.');return;}
    this.profileRunning=true;this.cancelReason=null;
    const scope=this.key(),quality=FourDWorkspace.quality,width=innerWidth,height=innerHeight;
    let previous;try{previous=JSON.parse(localStorage.getItem(scope)||'null');}catch{}
    const token=++this.revision,session=FourDWorkspace.token,version=FourDWorkspace.updateRevision,
      pose=FourDViews.pose(),history=ProjectModel.clone(FourDViews.history),section=ProjectModel.clone(StudioEnhancements.section),
      selected=elements[selectedElIndex]?.id,selection=[...Selection.ids],motion=FourDViews.motion,dayHour=FourDViews.dayHour,
      model=this.fingerprint(),rows=[],longTasks=[];
    let observer;
    const valid=()=>this.active&&token===this.revision&&session===FourDWorkspace.token&&version===FourDWorkspace.updateRevision&&FourDWorkspace.running&&!FourDWorkspace.paused&&!document.hidden&&quality===FourDWorkspace.quality&&width===innerWidth&&height===innerHeight;
    const wait=async ms=>{await new Promise(r=>setTimeout(r,ms));if(!valid())throw new DOMException('Profile cancelled','AbortError');};
    this.active=true;
    try {
      try{if(window.PerformanceObserver?.supportedEntryTypes?.includes('longtask')){observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({type:'longtask'});}}catch{observer=null;}
      const room=elements.find(e=>!e.isFurniture),protocol=[['Plot',()=>FourDViews.plot()],['Building',()=>FourDViews.building()],['Floor',()=>FourDViews.floor(room?.floor??0)]];
      if(room)protocol.push(['Element',()=>{StudioUI.select(elements.findIndex(e=>e.id===room.id));FourDViews.focus();}]);
      protocol.push(['Return to building',()=>FourDViews.building()]);
      for(const [name,action]of protocol){
        this.status('Measuring '+name.toLowerCase()+'…');this.current={name,renderMs:[],movingMs:[],movingCalls:[],maxSubstitutions:0};const started=performance.now();action();
        while(FourDViews.transition){await wait(30);if(performance.now()-started>20000)throw Error('Navigation did not settle; profile stopped');}
        const settledMs=performance.now()-started;await wait(80);
        const renderStarted=performance.now();Engine4D.render();
        const r=Engine4D.renderer.info,samples=this.current.renderMs.slice().sort((a,b)=>a-b);
        const moving=this.current.movingMs.slice().sort((a,b)=>a-b);
        rows.push({name,settledMs:Math.round(settledMs),settledRenderMs:Math.round(performance.now()-renderStarted),p95RenderMs:Math.round(samples[Math.min(samples.length-1,Math.floor(samples.length*.95))]||0),samples:samples.length,drawCalls:r.render.calls,geometries:r.memory.geometries,textures:r.memory.textures,movingSamples:moving.length,movingP95Ms:Math.round(moving[Math.floor(moving.length*.95)]||0),movingDrawCalls:Math.max(0,...this.current.movingCalls),simplifiedFurniture:this.current.maxSubstitutions});
        await wait(0);
      }
      this.last={version:1,scope,time:new Date().toISOString(),projectFingerprint:model,environment:{browser:navigator.userAgent,viewport:[innerWidth,innerHeight],quality:FourDWorkspace.quality,motion:FourDViews.motion,pixelRatio:Engine4D.renderer.getPixelRatio(),renderer:Engine4D.renderer.getContext().getParameter(Engine4D.renderer.getContext().RENDERER)},startup:{firstFrameMs:Math.round(FourDWorkspace.metrics.firstFrameMs||0),source:FourDWorkspace.metrics.source||null,shaders:FourDWorkspace.metrics.shaders||null},longTasksSupported:!!observer,longTasks:{count:longTasks.length,maxMs:Math.round(Math.max(0,...longTasks))},steps:rows};
      this.last.advice=this.advice(this.last);
      const p=ProjectState.capture();this.last.version=2;
      this.last.design={rooms:p.elements.filter(e=>!e.isFurniture).length,furniture:p.elements.filter(e=>e.isFurniture).length,openings:p.fixtures.length,floors:p.floorCount,importedPlacements:p.elements.filter(e=>e.assetId).length,triangles:Engine4D.modelTriangles,fitoutItems:WorkbenchModel.data(p).interiors.reduce((sum,layout)=>sum+layout.items.length,0)};
      this.last.environment.navigationDetail=FourDWorkspace.navigationDetail;this.last.environment.adaptive=StudioEnhancements.adaptive;
      this.last.startup.fullReadyMs=Math.round(FourDWorkspace.metrics.fullReadyMs||0);
      this.last.startup.stages={furnitureMs:Math.round(FourDWorkspace.metrics.furnitureMs||0),gardenMs:Math.round(FourDWorkspace.metrics.gardenMs||0),detailMs:Math.round(FourDWorkspace.metrics.detailMs||0)};
      if(previous?.scope===scope&&previous.steps?.length){const worst=r=>Math.max(0,...r.steps.map(s=>s.settledRenderMs||0));this.last.comparison={previousTime:previous.time,worstSettledRenderDeltaMs:worst(this.last)-worst(previous)};}
      try{localStorage.setItem(this.key(),JSON.stringify(this.last));}catch{}
      this.message='Profile completed on this design.';
    }catch(error){this.message=error.name==='AbortError'?'Profile cancelled; incomplete measurements were discarded.':error.message;}
    finally {
      observer?.disconnect();this.current=null;
      if(token===this.revision)this.active=false;
      this.status('');
      if((token===this.revision||this.cancelReason==='cancel')&&session===FourDWorkspace.token&&version===FourDWorkspace.updateRevision&&FourDWorkspace.running&&!FourDWorkspace.paused&&!document.hidden){
        FourDViews.motion='off';FourDViews.restorePose(pose,{duration:0});FourDViews.motion=motion;FourDViews.history=history;
        if(dayHour!=null)FourDViews.previewDay(dayHour);
        StudioEnhancements.section=section;if(section)StudioEnhancements.applySection();
        Selection.ids=new Set(selection.filter(id=>elements.some(e=>e.id===id)));selectedElIndex=elements.findIndex(e=>e.id===selected);AppEvents.triggerSelectionChange();
        StudioUI.message(this.message+(this.last?' Open Review → Device for the report.':''));
      }
      this.profileRunning=false;
    }
    return this.last;
  },
  advice(report) {
    const notes=[],source=report.startup.source?.maxChunkMs||0,shader=report.startup.shaders?.maxChunkMs||0,
      render=Math.max(0,...report.steps.map(s=>s.p95RenderMs)),draws=Math.max(0,...report.steps.map(s=>s.drawCalls));
    if(source>50)notes.push(`Source preparation included a ${Math.round(source)} ms step. Simplify dense imported or architectural detail and compare the next run.`);
    if(shader>50)notes.push(`Shader preparation included a ${Math.round(shader)} ms driver step. Compare Eco quality with fewer reflection effects.`);
    if(render>50)notes.push('Rendering is costly in this run. Compare Eco quality; reduce mirrors and fine detail before increasing resolution.');
    if(draws>500)notes.push('This design has many draw calls. Compare reduced architectural detail and distant-object substitution.');
    if(!notes.length)notes.push('No large source/shader step or costly sampled frame was detected in this run. Compare the same design, viewport and quality when testing changes.');
    return notes;
  },
  key(){return 'ArchCAD_Device_Profile_'+this.fingerprint()+'_'+FourDWorkspace.quality+'_'+innerWidth+'x'+innerHeight;},
  html() {
    let previous;try{previous=JSON.parse(localStorage.getItem(this.key())||'null');}catch{}
    const report=this.last?.scope===this.key()?this.last:previous,e=ProjectModel.escapeHTML;
    return `<p>${e(this.message||'Measure Plot → Building → Floor → Element → Building on this design. Input, edits, Pause and Stop cancel the run.')}</p><label><input type="checkbox" ${FourDWorkspace.navigationDetail?'checked':''} onchange="FourDWorkspace.setNavigationDetail(this.checked)">Simplify furniture while moving</label><div class="studio-action-grid">${StudioUI.button('Profile this design','FourDPerformance.run()')}${report?StudioUI.button('Export device profile','FourDPerformance.download()'):''}</div>${report?`<p>${report.design?`${report.design.rooms} rooms · ${report.design.furniture} furniture · ${report.design.floors} floors<br>`:''}Building visible: ${report.startup.firstFrameMs} ms · All details ready: ${report.startup.fullReadyMs??'—'} ms</p><table><thead><tr><th>View</th><th>Settle ms</th><th>Render ms</th><th>Draw calls</th></tr></thead><tbody>${report.steps.map(s=>`<tr><td>${e(s.name)}</td><td>${s.settledMs}</td><td>${s.settledRenderMs}</td><td>${s.drawCalls}</td></tr>`).join('')}</tbody></table><p>${report.comparison?`Slowest settled render changed by ${report.comparison.worstSettledRenderDeltaMs>0?'+':''}${report.comparison.worstSettledRenderDeltaMs} ms since the previous matching run.<br>`:''}${report.longTasksSupported?report.longTasks.count+' long tasks · max '+report.longTasks.maxMs+' ms':'Long-task observation unavailable in this browser.'}</p><p>JSON includes motion samples, furniture substitutions and full-frame draw calls. Measurements stay on this device.</p><ul>${(report.advice||[]).map(note=>`<li>${e(note)}</li>`).join('')}</ul>`:''}`;
  },
  download(){let report=this.last?.scope===this.key()?this.last:null;try{report ||=JSON.parse(localStorage.getItem(this.key())||'null');}catch{}if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='ArchCAD_Device_Profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
};
AppEvents.onStateChange(()=>{if(FourDPerformance.active)FourDPerformance.cancel('edit');});
window.addEventListener('pointerdown',e=>{if(FourDPerformance.active&&e.target.closest('canvas,#fourd-breadcrumbs,#fourd-toolbar,.viewport-orientation,#studio-dialog')){FourDPerformance.cancel('input');FourDViews.cancel('input');}},true);
window.addEventListener('wheel',e=>{if(FourDPerformance.active&&e.target.closest('canvas,#fourd-breadcrumbs,#fourd-toolbar,.viewport-orientation,#studio-dialog')){FourDPerformance.cancel('input');FourDViews.cancel('input');}},{capture:true,passive:true});

window.addEventListener('keydown',e=>{if(e.key==='Escape'&&FourDPerformance.active){FourDPerformance.cancel('input');FourDViews.cancel('input');e.preventDefault();}},true);
