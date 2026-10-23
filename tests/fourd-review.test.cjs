const test=require('node:test'),assert=require('node:assert/strict');
global.THREE=require('three');const T=global.THREE,P=require('../js/project-model.js');require('../js/planning-model.js');require('../js/design-model.js');require('../js/workbench-model.js');
const R=require('../js/fourd-review-model.js'),G=require('../js/fourd-geometry.js');
const project=()=>P.normalize({elements:[{id:'room',type:'bedroom',x:10,y:10,w:180,h:160,floor:0}],plot:{inW:'600',inH:'480'}});
function unpack(d){const g=new T.BufferGeometry();for(const[k,a]of Object.entries(d.attributes))g.setAttribute(k,new T.BufferAttribute(a.array,a.itemSize));if(d.index)g.setIndex(new T.BufferAttribute(d.index,1));return g;}
function area(g){const a=g.attributes.position;let sum=0;for(let i=0;i<a.count;i+=3){const x=new T.Vector3().fromBufferAttribute(a,i),y=new T.Vector3().fromBufferAttribute(a,i+1),z=new T.Vector3().fromBufferAttribute(a,i+2);sum+=y.sub(x).cross(z.sub(x)).length()/2;}return sum;}
test('worker cap triangulation preserves an interior hole and exact section area',()=>{
 const shape=new T.Shape([new T.Vector2(0,0),new T.Vector2(20,0),new T.Vector2(20,20),new T.Vector2(0,20)]);shape.holes=[new T.Path([new T.Vector2(5,5),new T.Vector2(5,15),new T.Vector2(15,15),new T.Vector2(15,5)])];
 const g=new T.ExtrudeGeometry(shape,{depth:10,bevelEnabled:false}),cut=G.run({kind:'caps',positions:g.attributes.position.array,index:g.index?.array,plane:[0,0,1,-5]}),cap=unpack(cut.geometry);
 assert.equal(cut.open,0);assert.ok(Math.abs(area(cap)-300)<.001);assert.ok(cap.attributes.position.array.every(Number.isFinite));
});
test('open non-manifold sections are reported rather than sealed',()=>{const cut=G.run({kind:'caps',positions:new Float32Array([0,0,-1,10,0,1,0,10,1]),plane:[0,0,1,0]});assert.ok(cut.open>0);assert.equal(cut.geometry.attributes.position.array.length,0);});
test('rounded furniture retains exact authored extents',()=>{const [result]=G.run({kind:'rounded',boxes:[{w:60,h:12,d:80,r:1}]});const g=unpack(result);g.computeBoundingBox();const v=g.boundingBox.getSize(new T.Vector3());assert.ok(Math.abs(v.x-60)<.001);assert.ok(Math.abs(v.y-12)<.001);assert.ok(Math.abs(v.z-80)<.001);});
test('roof shell includes boundary edges and a separate bottom surface',()=>{const g=new T.PlaneGeometry(20,20);g.rotateX(-Math.PI/2);const result=unpack(G.run({kind:'shell',geometry:G.pack(g),depth:2}));result.computeBoundingBox();assert.ok(Math.abs(result.boundingBox.max.y-result.boundingBox.min.y-2)<1e-6);assert.equal(result.attributes.position.count/3,12);});
test('revision diff covers addition, deletion, movement, resizing, openings and finishes without mutation',()=>{
 const a=project(),b=structuredClone(a);b.elements[0].w=192;b.elements.push({...b.elements[0],id:'new'});b.fixtures.push({id:'door',roomId:0,offset:20,size:30});b.design.presentation.surfaces.room={floor:{color:'#112233'}};
 const copy=JSON.stringify(a),rows=R.diff(a,b);assert.ok(rows.some(r=>r.status==='resized'));assert.equal(rows.filter(r=>r.status==='added').length,2);assert.ok(rows.some(r=>r.kind==='finish'));assert.equal(JSON.stringify(a),copy);assert.equal(R.diff(b,a).filter(r=>r.status==='removed').length,2);
});
test('fixtures and section bookmarks round-trip with validation and unknown-room cleanup',()=>{
 const p=project(),s=p.design.presentation.studio;s.fixtures=[{id:'light',type:'spot',room:'room',x:.5,y:.25,height:100,intensity:1,temperature:3500,spread:60,yaw:90,enabled:true}];s.bookmarks=[{name:'Cut',note:'Review this wall',pose:{position:[1,2,3],target:[0,0,0],kind:'floor',floor:0,projection:'perspective',zoom:1,explosion:0,planes:[[0,1,0,0]]},section:{xmin:0,xmax:100,ymin:0,ymax:100,zmin:0,zmax:100}}];
 const restored=P.normalize(JSON.parse(JSON.stringify(p)));assert.deepEqual(restored.design.presentation.studio,s);
 for(const [key,value]of [['temperature',100],['intensity',Infinity],['type','laser'],['x',2]]){const bad=structuredClone(p);bad.design.presentation.studio.fixtures[0][key]=value;assert.throws(()=>P.normalize(bad));}
 const bad=structuredClone(p);bad.design.presentation.studio.bookmarks[0].pose.planes=[[0,0,0,0]];assert.throws(()=>P.normalize(bad));
});
test('physical texture origin persists and rejects malformed data',()=>{const p=project();p.design.presentation.surfaces.room={floor:{type:'timber',color:'#112233',roughness:.6,scale:1,rotation:90,origin:[24,-12]}};assert.deepEqual(P.normalize(p).design.presentation.surfaces.room.floor.origin,[24,-12]);p.design.presentation.surfaces.room.floor.origin=[Infinity,0];assert.throws(()=>P.normalize(p));});
