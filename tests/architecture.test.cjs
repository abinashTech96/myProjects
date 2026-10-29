const test=require('node:test'),assert=require('node:assert/strict');
global.THREE=require('three');const T=global.THREE,P=require('../js/project-model.js');require('../js/planning-model.js');require('../js/design-model.js');require('../js/workbench-model.js');require('../js/workbench-building.js');
const Roof=require('../js/roof-model.js'),G=require('../js/fourd-geometry.js'),Review=require('../js/architectural-review-model.js');
const project=()=>P.normalize({plot:{inW:'600',inH:'480'},floorCount:2,elements:[{id:'lower',type:'bedroom',x:20,y:20,w:240,h:180,floor:0},{id:'upper',type:'bedroom',x:20,y:20,w:240,h:180,floor:1}]});
test('roof thickness defaults, validation and worker buffers agree with the shared architectural solid',()=>{
 for(const type of ['flat','gable','hip','shed'])for(const thickness of [1,4,12]){
  const p=project();Object.assign(p.design.roof,{type,thickness});const s=Roof.describe(p),worker=G.run({kind:'roof',project:p,scale:.1});
  assert.equal(s.thickness,thickness);assert.equal(worker.floor,s.floor);
  for(let i=0;i<s.patches.length;i++){const direct=Roof.geometry(s,s.patches[i],.1);assert.deepEqual(worker.patches[i].attributes.position.array,direct.attributes.position.array);direct.dispose();}
 }
 const p=project();delete p.design.roof.thickness;assert.equal(P.normalize(p).design.roof.thickness,4);
 for(const thickness of [-1,0,25,Infinity]){p.design.roof.thickness=thickness;assert.throws(()=>P.normalize(p),/thickness/);}
});
test('level, floor count and wall settings dependencies stay local while coordinates retain a fallback',()=>{
 const p=project(),a=G.describe(p);p.floorCount=3;let b=G.describe(p);assert.equal(a.global,b.global);assert.equal(a.records.get('room:lower'),b.records.get('room:lower'));assert.equal(a.records.get('room:upper'),b.records.get('room:upper'));
 p.design.workbench.levels=[{id:'upper-level',floor:1,base:156,height:132}];b=G.describe(p);assert.equal(a.global,b.global);assert.equal(a.records.get('room:lower'),b.records.get('room:lower'));assert.notEqual(a.records.get('room:upper'),b.records.get('room:upper'));assert.notEqual(a.roof,b.roof);
 p.wallSettings.external=12;b=G.describe(p);assert.equal(a.global,b.global);assert.notDeepEqual(a.rows,b.rows);
 p.plot.inW='720';assert.notEqual(a.global,G.describe(p).global);
});
test('architectural inspection identifies roof crossings and closed penetrations without changing the model',()=>{
 const p=project();p.floorCount=1;p.elements=p.elements.slice(0,1);p.design.roof.type='gable';p.view.parapet='standard';p.design.workbench.voids=[{id:'shaft',from:0,to:1,points:[{x:80,y:80},{x:100,y:80},{x:100,y:100},{x:80,y:100}]}];
 const before=JSON.stringify(p),rows=Review.inspect(p);assert.ok(rows.some(r=>r.code==='roof-parapet'));assert.ok(rows.some(r=>r.code==='roof-penetration'));assert.equal(JSON.stringify(p),before);
 p.design.roof.type='flat';assert.equal(Review.inspect(p).some(r=>r.code==='roof-penetration'),false);
 p.design.ceilings=[{id:'ceiling',floor:0,x:40,y:40,w:100,h:100,height:140,label:'High'}];assert.ok(Review.inspect(p).some(r=>r.code==='roof-ceiling'));
});
test('embedded GLB worker preparation uses the same validation and transfers decoded bytes',()=>{
 const GLB=require('../js/glb-model.js'),json=Buffer.from(JSON.stringify({asset:{version:'2.0'}}).padEnd(32)),b=Buffer.alloc(20+json.length);b.writeUInt32LE(0x46546c67,0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(json.length,12);b.writeUInt32LE(0x4e4f534a,16);json.copy(b,20);
 const data='data:model/gltf-binary;base64,'+b.toString('base64'),decoded=G.run({kind:'glb',data});assert.deepEqual(Buffer.from(decoded),b);assert.equal(GLB.validate(decoded.buffer).asset.version,'2.0');assert.throws(()=>G.run({kind:'glb',data:'data:model/gltf-binary;base64,AAAA'}),/GLB/);
});

test('flat-roof parapets follow the configured finished roof elevation',()=>{
 const p=project(),Parapet=require('../js/parapet-model.js');p.design.roof.thickness=10;
 assert.equal(Parapet.edges(p)[0].base,250);
 const normalized=P.normalize(p);assert.equal(normalized.design.roof.thickness,10);
});
test('close-up review flags jamb, wall datum and stair landing observations without a roof or model edits',()=>{
 const p=project();p.design.roof.type='none';p.fixtures=[{id:'near-corner',roomId:0,type:'door',edge:'top',offset:1,size:36,sill:0,height:84}];
 p.elements.push({id:'steps',type:'staircase',x:300,y:20,w:40,h:80,floor:0,dir:'up'});p.design.workbench.stairs.steps={style:'straight',width:36,rise:100,riser:7,tread:10,landing:24};
 const before=JSON.stringify(p),rows=Review.inspect(p);for(const code of ['opening-jamb','stair-footprint','stair-level','stair-landing'])assert.ok(rows.some(r=>r.code===code),code);
 assert.ok(rows.every(r=>Number.isFinite(r.elevation)&&Number.isFinite(r.point.x)));assert.equal(JSON.stringify(p),before);p.fixtures[0].offset=60;assert.equal(Review.closeups(p).some(r=>r.code==='opening-jamb'),false);
});
test('reviewed fixtures retain courtyard holes, irregular edges, three datums and sixty furniture placements',()=>{
 const fixtures=require('./presentation-fixtures.cjs');for(const kind of ['irregular','courtyard','multistorey','furnished']){const p=P.normalize(fixtures.design(kind)),before=JSON.stringify(p);Review.inspect(p);assert.equal(JSON.stringify(p),before);
  if(kind==='courtyard')assert.ok(global.DesignModel.floorUnion(p,0).some(poly=>poly.length>1));if(kind==='irregular')assert.equal(p.elements[0].points.length,5);if(kind==='multistorey')assert.equal(global.WorkbenchModel.floorBase(p,2),282);if(kind==='furnished')assert.equal(p.elements.filter(e=>e.isFurniture).length,60);
 }
});
