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
  assert.equal(new T.Box3().setFromObject(stage.model).max.y, 0);
});
