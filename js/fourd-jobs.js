/* One lazy CPU worker with bounded queue and explicit cancellation. */
window.FourDJobs={
  serial:0,pending:new Map(),stats:{completed:0,fallbacks:0},
  start(){
    if(this.worker||this.unavailable)return;
    try{this.worker=new Worker('js/fourd-worker.js');
      this.worker.onmessage=({data})=>{const job=this.pending.get(data.id);if(!job)return;clearTimeout(job.timeout);this.pending.delete(data.id);data.error?job.reject(Error(data.error)):(this.stats.completed++,job.resolve(data.result));};
      this.worker.onerror=(event)=>{event.preventDefault();this.unavailable=true;this.stop();};
    }catch{this.unavailable=true;}
  },
  async run(task,valid=()=>true){
    if(!valid())throw new DOMException('Cancelled geometry','AbortError');
    this.start();let result;
    if(this.worker){
      if(task.kind==='describe')for(const [id,job]of this.pending)if(job.kind==='describe'){clearTimeout(job.timeout);job.reject(new DOMException('Superseded dependency calculation','AbortError'));this.pending.delete(id);}
      if(this.pending.size>=24)throw Error('Geometry queue is full');
      result=await new Promise((resolve,reject)=>{const id=++this.serial,timeout=setTimeout(()=>{this.pending.delete(id);reject(Error('Geometry preparation timed out'));this.stop();},30000);this.pending.set(id,{resolve,reject,timeout,kind:task.kind});this.worker.postMessage({id,task});}).catch(error=>{if(this.unavailable&&valid()){this.stats.fallbacks++;return FourDGeometry.run(task);}throw error;});
    }else{await new Promise(r=>setTimeout(r,0));this.stats.fallbacks++;result=FourDGeometry.run(task);}
    if(!valid())throw new DOMException('Superseded geometry','AbortError');return result;
  },
  unpack(data){const g=new THREE.BufferGeometry();for(const [key,a]of Object.entries(data.attributes))g.setAttribute(key,new THREE.BufferAttribute(a.array,a.itemSize));if(data.index)g.setIndex(new THREE.BufferAttribute(data.index,1));g.groups=data.groups||[];return g;},
  stop(){this.worker?.terminate();this.worker=null;for(const job of this.pending.values()){clearTimeout(job.timeout);job.reject(new DOMException('Geometry preparation cancelled','AbortError'));}this.pending.clear();},
};
