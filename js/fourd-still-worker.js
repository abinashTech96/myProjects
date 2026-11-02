/* Small, bounded CPU path tracer. Runs only in its dedicated, cancellable worker.
 * Diffuse multi-bounce transport, approximate rough reflection and thin glazing.
 * No DOM, network, project mutation, or editor renderer dependencies. */
(function(root){
 'use strict';
 const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/Math.max(1e-20,Math.hypot(...a))),mix=(a,b,t)=>add(mul(a,1-t),mul(b,t));
 const rng=seed=>()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
 function hemisphere(n,random){const r=Math.sqrt(random()),a=random()*Math.PI*2,t=unit(cross(n,Math.abs(n[1])<.9?[0,1,0]:[1,0,0])),b=cross(n,t);return unit(add(add(mul(t,r*Math.cos(a)),mul(b,r*Math.sin(a))),mul(n,Math.sqrt(1-r*r))));}
 function triangle(data,i){return [Array.from(data.positions.subarray(i*9,i*9+3)),Array.from(data.positions.subarray(i*9+3,i*9+6)),Array.from(data.positions.subarray(i*9+6,i*9+9))];}
 function build(data){
  const count=data.materialIds.length,boxes=new Array(count),centres=new Array(count);
  for(let i=0;i<count;i++){const vs=triangle(data,i),lo=[0,1,2].map(k=>Math.min(...vs.map(v=>v[k]))),hi=[0,1,2].map(k=>Math.max(...vs.map(v=>v[k])));boxes[i]=[lo,hi];centres[i]=mix(lo,hi,.5);}
  const node=ids=>{const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];for(const i of ids)for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],boxes[i][0][k]);hi[k]=Math.max(hi[k],boxes[i][1][k]);}
   if(ids.length<=8)return {lo,hi,ids};const size=sub(hi,lo),axis=size.indexOf(Math.max(...size));ids.sort((a,b)=>centres[a][axis]-centres[b][axis]);const mid=ids.length>>1;return {lo,hi,left:node(ids.slice(0,mid)),right:node(ids.slice(mid))};};
  return node(Array.from({length:count},(_,i)=>i));
 }
 function boxHit(n,o,d,max){let near=0,far=max;for(let k=0;k<3;k++){if(Math.abs(d[k])<1e-12){if(o[k]<n.lo[k]||o[k]>n.hi[k])return false;continue;}let a=(n.lo[k]-o[k])/d[k],b=(n.hi[k]-o[k])/d[k];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return false;}return true;}
 function surface(data,i,u,v){const m=data.materials[data.materialIds[i]],c=m.color.slice(),uv=data.uvs,offset=i*6,w=1-u-v,
   tx=uv[offset]*w+uv[offset+2]*u+uv[offset+4]*v,ty=uv[offset+1]*w+uv[offset+3]*u+uv[offset+5]*v;
  let alpha=m.opacity;
  if(m.texture>=0){const texture=data.textures[m.texture],x=Math.floor(((tx%1)+1)%1*texture.width),y=Math.floor((((m.flipY?1-ty:ty)%1)+1)%1*texture.height),p=(Math.min(texture.height-1,y)*texture.width+Math.min(texture.width-1,x))*4;
   for(let k=0;k<3;k++){const t=texture.pixels[p+k]/255;c[k]*=texture.srgb?(t<=.04045?t/12.92:((t+.055)/1.055)**2.4):t;}alpha*=texture.pixels[p+3]/255;
  }return {material:m,color:c,alpha};
 }
 function intersect(data,bvh,o,d,max=Infinity){let closest=max,result=null;const stack=[bvh];while(stack.length){const n=stack.pop();if(!boxHit(n,o,d,closest))continue;if(!n.ids){stack.push(n.left,n.right);continue;}for(const i of n.ids){const [a,b,c]=triangle(data,i),e1=sub(b,a),e2=sub(c,a),h=cross(d,e2),det=dot(e1,h);if(Math.abs(det)<1e-10)continue;const f=1/det,s=sub(o,a),u=f*dot(s,h);if(u<0||u>1)continue;const q=cross(s,e1),v=f*dot(d,q);if(v<0||u+v>1)continue;const t=f*dot(e2,q);if(t<.0001||t>=closest)continue;const sampled=surface(data,i,u,v);if(sampled.alpha<sampled.material.alphaTest)continue;const offset=i*9,w=1-u-v,norm=[0,1,2].map(k=>data.normals[offset+k]*w+data.normals[offset+3+k]*u+data.normals[offset+6+k]*v);let normal=unit(norm);if(dot(normal,normal)<.5)normal=unit(cross(e1,e2));if(dot(normal,d)>0)normal=mul(normal,-1);closest=t;result={i,t,point:add(o,mul(d,t)),normal,...sampled};}}
  return result;
 }
 function environment(data,d){const e=data.environment;if(!e)return [.22,.28,.38];const u=((Math.atan2(d[2],d[0])/(2*Math.PI)+.5)%1+1)%1,v=Math.acos(Math.max(-1,Math.min(1,d[1])))/Math.PI,x=Math.min(e.width-1,Math.floor(u*e.width)),y=Math.min(e.height-1,Math.floor(v*e.height)),i=(y*e.width+x)*3;return [e.pixels[i],e.pixels[i+1],e.pixels[i+2]].map(n=>Math.max(0,n)*data.environmentIntensity);}
 function visibility(data,bvh,o,d,distance){let transmission=1;for(let i=0;i<8;i++){const hit=intersect(data,bvh,o,d,distance);if(!hit)return transmission;if(!hit.material.glass)return 0;transmission*=.78;distance-=hit.t+.001;o=add(hit.point,mul(d,.001));if(distance<=0)return transmission;}return 0;}
 function trace(data,bvh,origin,direction,random){let o=origin,d=direction,weight=[1,1,1],radiance=[0,0,0];for(let bounce=0;bounce<data.bounces;bounce++){
   const hit=intersect(data,bvh,o,d);if(!hit){const sky=bounce===0&&!data.showSky?data.background:environment(data,d);for(let k=0;k<3;k++)radiance[k]+=weight[k]*sky[k];break;}
   const n=hit.normal,m=hit.material,p=add(hit.point,mul(n,.001));for(let k=0;k<3;k++)radiance[k]+=weight[k]*m.emissive[k];
   if(m.glass){const f=.04+.96*(1-Math.max(0,-dot(n,d)))**5;if(random()<f)d=unit(sub(d,mul(n,2*dot(d,n))));else{for(let k=0;k<3;k++)weight[k]*=.8+.2*hit.color[k];d=unit(mix(d,hemisphere(mul(n,-1),random),Math.min(.65,m.roughness**2)));}o=add(hit.point,mul(d,.002));continue;}
   const sun=unit(add(data.sun.direction,mul(hemisphere(data.sun.direction,random),.0046))),cos=Math.max(0,dot(n,sun));
   if(cos>0){const visible=visibility(data,bvh,p,sun,1e8);for(let k=0;k<3;k++)radiance[k]+=weight[k]*hit.color[k]*data.sun.color[k]*data.sun.intensity*cos*visible/Math.PI;}
   for(const light of data.lights){const delta=sub(light.position,hit.point),distance=Math.hypot(...delta),ld=unit(delta),angle=dot(mul(ld,-1),light.direction),edge=Math.cos(light.angle),cone=Math.max(0,Math.min(1,(angle-edge)/Math.max(.001,(1-edge)*.4))),nl=Math.max(0,dot(n,ld));if(!cone||!nl)continue;const visible=visibility(data,bvh,p,ld,distance-.002),energy=light.intensity/Math.max(1,distance*distance)*cone*nl*visible/Math.PI;for(let k=0;k<3;k++)radiance[k]+=weight[k]*hit.color[k]*light.color[k]*energy;}
   if(random()<m.metalness){const reflection=sub(d,mul(n,2*dot(d,n)));d=unit(mix(reflection,hemisphere(n,random),m.roughness*m.roughness));if(dot(d,n)<=0)d=hemisphere(n,random);}else d=hemisphere(n,random);
   for(let k=0;k<3;k++)weight[k]*=Math.min(.98,hit.color[k]);o=p;
   if(bounce>1){const survive=Math.min(.95,Math.max(...weight));if(random()>survive)break;weight=mul(weight,1/Math.max(.01,survive));}
  }return radiance;
 }
 function cameraRay(data,x,y,random){const c=data.camera,nx=(x+random())/data.width*2-1,ny=1-(y+random())/data.height*2;
  if(c.orthographic)return {origin:add(add(c.position,mul(c.right,nx*c.halfWidth)),mul(c.up,ny*c.halfHeight)),direction:c.forward};
  return {origin:c.position,direction:unit(add(add(c.forward,mul(c.right,(nx+c.shiftX)*c.halfWidth)),mul(c.up,(ny+c.shiftY)*c.halfHeight)))};
 }
 function pixels(acc,counts,exposure){const out=new Uint8ClampedArray(counts.length*4);for(let i=0;i<counts.length;i++){for(let k=0;k<3;k++){const c=acc[i*3+k]/Math.max(1,counts[i])*exposure,t=Math.max(0,Math.min(1,(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14)));out[i*4+k]=255*(t<=.0031308?t*12.92:1.055*t**(1/2.4)-.055);}out[i*4+3]=255;}return out;}
 async function render(data,emit){
  if(!Number.isInteger(data.width)||!Number.isInteger(data.height)||data.width<1||data.width>960||data.height<1||data.height>960||data.materialIds.length>200000||data.samples<1||data.samples>128||data.bounces<1||data.bounces>6||data.seconds<.01||data.seconds>60)throw Error('Still render exceeds its budget');
  const started=performance.now(),deadline=started+data.seconds*1000,bvh=build(data),acc=new Float32Array(data.width*data.height*3),counts=new Uint16Array(data.width*data.height);let completed=0,last=0,limited=false;
  for(let sample=0;sample<data.samples;sample++){
   for(let y=0;y<data.height;y++){
    for(let x=0;x<data.width;x++){const i=y*data.width+x,random=rng(((i+1)*9781+(sample+1)*6271)|0),ray=cameraRay(data,x,y,random),color=trace(data,bvh,ray.origin,ray.direction,random);for(let k=0;k<3;k++)acc[i*3+k]+=Math.min(40,color[k]);counts[i]++;}
    const now=performance.now();if(now>deadline){limited=true;break;}if(now-last>400){last=now;emit({kind:'progress',samples:sample,rows:y+1,pixels:pixels(acc,counts,data.exposure)});await new Promise(r=>setTimeout(r,0));}
   }
   if(limited)break;completed=sample+1;
  }
  const output={kind:'complete',samples:completed,limited,milliseconds:performance.now()-started,pixels:pixels(acc,counts,data.exposure),covered:counts.reduce((sum,n)=>sum+(n>0),0)};emit(output);return output;
 }
 const api={build,intersect,trace,cameraRay,pixels,render};if(typeof module==='object')module.exports=api;
 else root.onmessage=async({data})=>{try{await render(data,message=>root.postMessage(message,[message.pixels.buffer]));}catch(error){root.postMessage({kind:'error',message:error.message});}};
})(globalThis);
