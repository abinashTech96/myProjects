/* Bounded presentation texture residency. Editor originals retain their own ownership. */
window.FourDAssets={
 pending:new Map(),bytes:0,entries:new Map(),listened:new WeakSet(),resized:new WeakMap(),profiles:{eco:{size:512,bytes:32*1048576},balanced:{size:1024,bytes:64*1048576},high:{size:2048,bytes:128*1048576}},
 get profile(){return this.profiles[FourDWorkspace.quality]||this.profiles.balanced;},
 image(image,max){const w=image?.width,h=image?.height;if(!w||!h||!image||ArrayBuffer.isView(image.data))return image;const ratio=Math.min(1,max/Math.max(w,h));if(ratio===1)return image;let cached=this.resized.get(image);if(!cached){cached=new Map();this.resized.set(image,cached);}const key=Math.floor(max);if(cached.has(key))return cached.get(key);const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*ratio));c.height=Math.max(1,Math.round(h*ratio));c.getContext('2d').drawImage(image,0,0,c.width,c.height);cached.set(key,c);if(cached.size>4)cached.delete(cached.keys().next().value);return c;},
 estimate(image){return Math.ceil((image?.width||1)*(image?.height||1)*4*4/3);},
 prepareTexture(copy,source){
  const image=source.image;if(!image?.width||copy.isDataTexture||copy.isCubeTexture)return;
  this.bytes-=this.entries.get(copy)||0;this.entries.delete(copy);this.pending.delete(copy);
  let size=Math.min(this.profile.size,256),small=this.image(image,size);
  while(this.bytes+this.estimate(small)>this.profile.bytes&&size>16){size=Math.floor(size/2);small=this.image(image,size);}
  copy.image=small;this.entries.set(copy,this.estimate(small));this.bytes+=this.estimate(small);
  if(!this.listened.has(copy)){this.listened.add(copy);copy.addEventListener('dispose',()=>{this.bytes-=this.entries.get(copy)||0;this.entries.delete(copy);this.pending.delete(copy);});}
  if(Math.max(image.width,image.height)>size&&this.pending.size<512)this.pending.set(copy,{image,size});
 },
 refine(){
  this.timer=null;
  if(StudioEnhancements.navigating||!FourDWorkspace.running||FourDWorkspace.paused||document.hidden)return;
  let work=0;
  for(const [t,job]of this.pending){if(work++>=2)break;
   const max=Math.min(this.profile.size,Math.max(job.image.width,job.image.height)),size=Math.min(max,job.size*2),image=this.image(job.image,size),cost=this.estimate(image),old=this.entries.get(t)||0;
   if(this.bytes-old+cost<=this.profile.bytes){t.image=image;t.needsUpdate=true;this.bytes+=cost-old;this.entries.set(t,cost);job.size=size;}
   else {this.pending.delete(t);continue;}
   if(size>=max)this.pending.delete(t);
  }
  if(this.pending.size) {clearTimeout(this.timer);this.timer=setTimeout(()=>{this.refine();Engine3D.needsRender=true;},80);}
 },
 enforce(){for(const [t,cost]of this.entries){const image=this.image(t.image,this.profile.size),next=this.estimate(image);if(next<cost){t.image=image;t.needsUpdate=true;this.entries.set(t,next);this.bytes+=next-cost;}}
  for(let pass=0;pass<3&&this.bytes>this.profile.bytes;pass++){const ratio=.9*Math.sqrt(this.profile.bytes/this.bytes);for(const [t,cost]of this.entries){const max=Math.max(t.image?.width||0,t.image?.height||0);if(max<=16)continue;const image=this.image(t.image,Math.max(16,Math.floor(max*ratio))),next=this.estimate(image);t.image=image;t.needsUpdate=true;this.entries.set(t,next);this.bytes+=next-cost;}}

 },
 stop(){clearTimeout(this.timer);this.timer=null;this.pending.clear();this.entries.clear();this.resized=new WeakMap();this.bytes=0;},
};
