/* Portable low-resolution image comparisons tolerate edge antialiasing while
 * guarding object coverage, framing and lighting against reviewed references. */
exports.signature=(rgba,width,height)=>{
 const cells=[],columns=16,rows=12,bg=rgba.slice(0,3);
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  let area=0,covered=0,luma=0;
  for(let y=Math.floor(row*height/rows);y<Math.floor((row+1)*height/rows);y++)for(let x=Math.floor(col*width/columns);x<Math.floor((col+1)*width/columns);x++){
   const i=(y*width+x)*4,r=rgba[i],g=rgba[i+1],b=rgba[i+2];area++;luma+=(r+g+b)/765;if(Math.abs(r-bg[0])+Math.abs(g-bg[1])+Math.abs(b-bg[2])>25)covered++;
  }
  cells.push([+(covered/area).toFixed(3),+(luma/area).toFixed(3)]);
 }
 return cells;
};
exports.difference=(a,b)=>{let coverage=0,luma=0,maxCoverage=0;for(let i=0;i<a.length;i++){const delta=Math.abs(a[i][0]-b[i][0]);coverage+=delta;luma+=Math.abs(a[i][1]-b[i][1]);maxCoverage=Math.max(maxCoverage,delta);}return {coverage:coverage/a.length,luma:luma/a.length,maxCoverage};};
