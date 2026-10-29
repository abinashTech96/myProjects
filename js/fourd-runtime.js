/* Runtime implementation downloads only after Render 4D. The shell and validated
 * project settings remain available without a worker, GPU context or scene. */
window.FourDRuntime = {
  loaded: new Set(),
  files: ['landscape4d','fourd-geometry','fourd-source','scene4d','fourd-textures','fourd-scene','fourd-render','fourd-details','fourd-performance','fourd-session'],
  load() {
    if (!this.pending) this.pending=(async()=>{
      for (const name of this.files) {
        if(this.loaded.has(name))continue;
        await new Promise((resolve,reject)=>{
          const script=document.createElement('script');script.src=`js/${name}.js`;
          script.onload=()=>{this.loaded.add(name);resolve();};
          script.onerror=()=>{script.remove();reject(Error(`Cannot load ${name}. Reconnect and retry Render 4D.`));};
          document.head.append(script);
        });
      }
    })().catch(error=>{this.pending=null;throw error;});
    return this.pending;
  },
};
