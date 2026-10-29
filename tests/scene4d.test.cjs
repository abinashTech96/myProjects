const test = require("node:test"),
  assert = require("node:assert/strict");
global.THREE = require("three");
const P = require("../js/project-model.js");
require("../js/planning-model.js");
require("../js/design-model.js");
require("../js/workbench-model.js");
global.polygonClipping = require("../vendor/geometry/polygon-clipping.js");
global.get3DEnvironmentParams = () => ({ SCALE: 1, I: { x: 0, z: 0 } });
const S = require("../js/scene4d.js"),
  T = global.THREE;
const room = {
  id: "room",
  type: "bedroom",
  x: 20,
  y: 30,
  w: 120,
  h: 180,
  floor: 0,
};
const project = (props) =>
  P.normalize({ elements: [room], plot: { inW: "600", inH: "600" }, ...props });
const engine = () => ({
  materials: new Set(),
  material(original) {
    const m = original.clone();
    this.materials.add(m);
    return m;
  },
});
test("4D scene owns geometry, materials and texture snapshots independently of the editor", () => {
  const source = new T.Group(),
    g = new T.BoxGeometry(10, 10, 10),
    m = new T.MeshStandardMaterial({
      map: new T.Texture({ width: 1, height: 1 }),
    }),
    mesh = new T.Mesh(g, m);
  source.add(mesh);
  const before = g.attributes.position.array.slice(),
    e = engine(),
    stage = S.stage(e, source, project());
  const copy = stage.pairs.find(([s]) => s === mesh)[1];
  assert.notEqual(copy.geometry, g);
  assert.notEqual(copy.material, m);
  assert.notEqual(copy.material.map, m.map);
  g.dispose();
  assert.deepEqual(copy.geometry.attributes.position.array, before);
  let sourceDisposed = 0;
  g.addEventListener("dispose", () => sourceDisposed++);
  m.addEventListener("dispose", () => sourceDisposed++);
  m.map.addEventListener("dispose", () => sourceDisposed++);
  S.dispose({
    model: stage.model,
    materials: stage.materials,
    sceneResources: stage.resources,
  });
  assert.equal(sourceDisposed, 0);
});
test('progressive appends retain texture update links and own both resource batches',()=>{
 const e=engine(),p=project(),sources=[new T.Group(),new T.Group()],textures=[new T.Texture(),new T.Texture()];
 sources.forEach((source,i)=>source.add(new T.Mesh(new T.BoxGeometry(2,2,2),new T.MeshStandardMaterial({map:textures[i]}))));
 const first=S.stage(e,sources[0],p,{floors:new Set(),roof:false}),second=S.stage(e,sources[1],p,{floors:new Set(),roof:false});e.model=first.model;e.materials=first.materials;e.sceneResources=first.resources;
 for(const child of [...second.model.children])e.model.add(child);for(const material of second.materials)e.materials.add(material);S.reconcile(e,second.resources);assert.equal(e.sceneResources.textureLinks.size,2);
 let disposed=0;for(const t of e.sceneResources.textures)t.addEventListener('dispose',()=>disposed++);textures[1].image={width:2,height:3};textures[1].needsUpdate=true;S.updateTextures(e);assert.equal(e.sceneResources.textureLinks.get(textures[1]).image.height,3);S.dispose(e);assert.equal(disposed,2);
});
test("slabs follow occupied footprints, omit empty storeys and avoid duplicated legacy roofs", () => {
  const source = new T.Group(),
    legacy = new T.Mesh(
      new T.BoxGeometry(600, 8, 600),
      new T.MeshStandardMaterial(),
    );
  legacy.userData = { isRoof: true };
  source.add(legacy);
  const e = engine(),
    stage = S.stage(e, source, project({ floorCount: 3 }));
  assert.equal(
    stage.pairs.some(([s]) => s === legacy),
    false,
  );
  const slabs = stage.model.children.filter((n) => n.userData.isSlab);
  assert.equal(slabs.length, 1);
  const box = new T.Box3().setFromObject(slabs[0]);
  assert.equal(box.min.x, 20);
  assert.equal(box.max.x, 140);
  assert.equal(box.max.z, 210);
  assert.equal(box.max.y, 120);
});
test("asynchronous scene preparation yields and cancellation disposes only staged resources", async () => {
  const source=new T.Group(), original=new T.BoxGeometry(10,10,10), material=new T.MeshStandardMaterial();
  for(let i=0;i<80;i++) source.add(new T.Mesh(original,material));
  const e=engine(), before=e.materials;
  let disposed=0, checkpoints=0;
  const decorate=e.material;
  e.material=function(m,n) {
    const copy=decorate.call(this,m,n);
    copy.addEventListener("dispose",()=>disposed++);
    const started=performance.now();
    while(performance.now()-started<.3) {} // A deterministic workload forces a yield.
    return copy;
  };
  await assert.rejects(S.stageAsync(e,source,project(),async()=>{
    checkpoints++;
    assert.equal(e.materials,before);
    throw new Error("cancelled");
  }),/cancelled/);
  assert.ok(checkpoints>0 && disposed>0);
  assert.equal(e.materials,before);
  assert.equal(source.children.length,80);
  const stage=await S.stageAsync(e,source,project(),async()=>checkpoints++);
  assert.equal(stage.pairs.filter(([s])=>s.geometry===original).length,80);
  S.dispose({model:stage.model,materials:stage.materials,sceneResources:stage.resources});
  original.dispose();material.dispose();
});
test("all pitched roof profiles use the building footprint and include their ridge height", () => {
  for (const type of ["gable", "hip", "shed"]) {
    const e = engine(),
      p = project({ design: { roof: { type, rise: 36, overhang: 12 } } }),
      stage = S.stage(e, new T.Group(), p),
      roof = stage.model.children.find((n) => n.userData.isRoof),
      box = new T.Box3().setFromObject(roof);
    assert.ok(box.max.x < 200);
    assert.ok(box.min.x >= 7.9);
    assert.equal(Math.round(box.max.y), 156);
    assert.ok(
      box.getSize(new T.Vector3()).y >= 35.9,
      type + " has a real pitched surface",
    );
  }
});
test("malformed objects are isolated without dropping valid furniture and instances", () => {
  const source = new T.Group(),
    bad = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial());
  bad.geometry.attributes.position.array[0] = NaN;
  bad.userData.elementId = "broken";
  source.add(bad);
  const instance = new T.InstancedMesh(
    new T.BoxGeometry(2, 2, 2),
    new T.MeshStandardMaterial(),
    2,
  );
  source.add(instance);
  const stage = S.stage(engine(), source, project());
  assert.equal(stage.issues.length, 1);
  assert.equal(stage.issues[0].element, "broken");
  assert.ok(stage.pairs.find(([s]) => s === instance)[1].isInstancedMesh);
});

test("live source texture updates reach the owned presentation snapshot", () => {
  const source = new T.Group(),
    texture = new T.Texture({ width: 1, height: 1 }),
    mesh = new T.Mesh(
      new T.BoxGeometry(1, 1, 1),
      new T.MeshBasicMaterial({ map: texture }),
    );
  source.add(mesh);
  const stage = S.stage(engine(), source, project()),
    copy = stage.pairs.find(([s]) => s === mesh)[1].material.map,
    version = copy.version;
  texture.image = { width: 2, height: 2 };
  texture.needsUpdate = true;
  S.updateTextures({ sceneResources: stage.resources });
  assert.ok(copy.version > version);
  assert.equal(copy.image.width, 2);
});

test("rendered slabs preserve shaft openings and entered floor elevations", () => {
  const p = project({
      design: {
        workbench: {
          levels: [{ id: "basement", floor: 0, base: -120, height: 120 }],
          voids: [
            {
              id: "shaft",
              from: 0,
              to: 1,
              points: [
                { x: 50, y: 60 },
                { x: 80, y: 60 },
                { x: 80, y: 90 },
                { x: 50, y: 90 },
              ],
            },
          ],
        },
      },
    }),
    stage = S.stage(engine(), new T.Group(), p);
  stage.model.updateMatrixWorld(true);
  const ray = (x, z) =>
    new T.Raycaster(
      new T.Vector3(x, 300, z),
      new T.Vector3(0, -1, 0),
    ).intersectObject(stage.model, true);
  assert.equal(ray(65, 75).length, 0, "Shaft remains open through the cap");
  assert.ok(ray(30, 40).length > 0, "Solid floor remains around the shaft");
  const cap=stage.model.children.find(n=>n.userData.isSlab), roof=stage.model.children.find(n=>n.userData.isRoof);
  assert.equal(new T.Box3().setFromObject(cap).max.y, 0);
  assert.equal(new T.Box3().setFromObject(roof).max.y, 4, "Flat roof thickness sits above the structural cap");
});

test('partial staging generates requested floor caps and skips unrelated roofs',()=>{
 const p=project({floorCount:2,elements:[room,{...room,id:'upper',floor:1}],design:{roof:{type:'gable',rise:36,overhang:12}}});
 const staged=S.stage(engine(),new T.Group(),p,{floors:new Set([1]),roof:false});
 assert.deepEqual(staged.model.children.filter(n=>n.userData.isSlab).map(n=>n.userData.floor),[1]);
 assert.equal(staged.model.children.some(n=>n.userData.isRoof),false);
 S.dispose({model:staged.model,materials:staged.materials,sceneResources:staged.resources});
});
test('resource reconciliation retains live resources and disposes replaced buffers',()=>{
 const model=new T.Group(),keep=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial()),removed=new T.Mesh(new T.BoxGeometry(2,2,2),new T.MeshStandardMaterial());
 model.add(keep);let disposed=0,kept=0;
 removed.geometry.addEventListener('dispose',()=>disposed++);keep.geometry.addEventListener('dispose',()=>kept++);
 const e={model,materials:new Set([keep.material,removed.material]),sceneResources:{geometries:new Set([keep.geometry,removed.geometry]),textures:new Set()}};
 S.reconcile(e);
 assert.equal(disposed,1);assert.equal(kept,0);assert.equal(e.sceneResources.geometries.size,1);
 S.dispose(e);
 assert.equal(kept,1);
});

test('reconciliation releases removed instance buffers exactly once and retains shared geometry',()=>{
  const model=new T.Group(), geometry=new T.BoxGeometry(1,1,1),material=new T.MeshStandardMaterial(),old=new T.InstancedMesh(geometry,material,4),keep=new T.InstancedMesh(geometry,material,2);
  model.add(old,keep);const e={model,materials:new Set([material])};S.reconcile(e);
  let released=0,kept=0,buffers=0;old.addEventListener('dispose',()=>released++);keep.addEventListener('dispose',()=>kept++);geometry.addEventListener('dispose',()=>buffers++);
  model.remove(old);S.reconcile(e);S.reconcile(e);assert.equal(released,1);assert.equal(kept,0);assert.equal(buffers,0);
  S.dispose(e);assert.equal(released,1);assert.equal(kept,1);assert.equal(buffers,1);
});
test('roof surfaces are watertight, follow occupied storeys, preserve islands and courtyard voids',()=>{
  const Roof=require('../js/roof-model.js');
  const p=project({floorCount:3,design:{roof:{type:'gable',rise:24,overhang:0}}});
  const surface=Roof.describe(p);assert.equal(surface.floor,0);assert.equal(surface.base,120);
  const prepared={0:{union:[[[[20,20],[220,20],[220,220],[20,220],[20,20]],[[80,80],[80,160],[160,160],[160,80],[80,80]]],[[[320,20],[380,20],[380,80],[320,80],[320,20]]]]}};
  const s=Roof.describe(p,prepared);let area=0;
  for(const polygon of s.patches){const solid=Roof.solid(s,polygon),edges=new Map();for(const face of solid.faces)for(let i=0;i<3;i++){const a=face[i],b=face[(i+1)%3],key=[a,b].sort((a,b)=>a-b).join(':');edges.set(key,(edges.get(key)||0)+1);}assert.ok([...edges.values()].every(n=>n===2));
    const outer=polygon[0];area+=Math.abs(outer.reduce((sum,q,i)=>{const n=outer[(i+1)%outer.length];return sum+q[0]*n[1]-n[0]*q[1];},0))/2;
    for(const h of polygon.slice(1))area-=Math.abs(h.reduce((sum,q,i)=>{const n=h[(i+1)%h.length];return sum+q[0]*n[1]-n[0]*q[1];},0))/2;
  }
  assert.equal(area,200*200-80*80+60*60);
});

test('renderer roof faces have outward winding after conversion to Y-up',()=>{
  const Roof=require('../js/roof-model.js');
  for(const type of ['flat','gable','hip','shed']){
    const surface=Roof.describe(project({design:{roof:{type,rise:24,overhang:12}}}));
    for(const polygon of surface.patches){const g=Roof.geometry(surface,polygon),a=g.attributes.position;let volume=0;
      for(let i=0;i<a.count;i+=3){const u=new T.Vector3().fromBufferAttribute(a,i),v=new T.Vector3().fromBufferAttribute(a,i+1),w=new T.Vector3().fromBufferAttribute(a,i+2);volume+=u.dot(v.cross(w))/6;}
      assert.ok(volume>0,type+' closed shell has outward faces');g.dispose();
    }
  }
});

test('nested imported hierarchies yield before all meshes are cloned and release partial instances',async()=>{
 const source=new T.Group(),dense=new T.Group(),geometry=new T.BoxGeometry(1,1,1),material=new T.MeshStandardMaterial();source.add(dense);
 for(let i=0;i<80;i++)dense.add(new T.InstancedMesh(geometry,material,2));
 let copies=0,disposed=0,sourceDisposed=0;const oldClone=T.InstancedMesh.prototype.clone;
 T.InstancedMesh.prototype.clone=function(...args){const copy=oldClone.apply(this,args);copy.addEventListener('dispose',()=>disposed++);return copy;};
 source.traverse(n=>{if(n.isInstancedMesh)n.addEventListener('dispose',()=>sourceDisposed++);});
 const e=engine();e.material=m=>{copies++;const start=performance.now();while(performance.now()-start<.5){}return m.clone();};
 try{await assert.rejects(S.stageAsync(e,source,project(),async()=>{throw new DOMException('Cancelled','AbortError');}),/Cancelled/);assert.ok(copies>0&&copies<80);assert.equal(disposed,copies);assert.equal(sourceDisposed,0);}finally{T.InstancedMesh.prototype.clone=oldClone;geometry.dispose();material.dispose();}
});
