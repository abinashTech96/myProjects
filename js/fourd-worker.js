/* Lazy worker: serializable snapshots/buffers only. Renderer remains on main thread. */
importScripts('../vendor/three/three.min.js','../vendor/geometry/polygon-clipping.js','../vendor/geometry/clipper.js','parapet-model.js','project-model.js','planning-model.js','fourd-review-model.js','fourd-model.js','presentation-model.js','design-model.js','workbench-model.js','workbench-building.js','roof-model.js','glb-model.js','fourd-geometry.js');
let queue=[],scheduled=false;
onmessage=({data})=>{if(data.task.kind==='describe')queue=queue.filter(job=>job.task.kind!=='describe');queue.push(data);if(!scheduled){scheduled=true;setTimeout(drain,0);}};
function drain(){
 const job=queue.shift();if(!job){scheduled=false;return;}const {id,task}=job;
  try{
    const result=FourDGeometry.run(task),buffers=new Set();
    const visit=o=>{if(ArrayBuffer.isView(o))buffers.add(o.buffer);else if(o&&typeof o==='object')Object.values(o).forEach(visit);};visit(result);
    postMessage({id,result},[...buffers]);
  }catch(error){postMessage({id,error:error.message});}

  setTimeout(drain,0);
}
