const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const M = require("../js/project-model.js");
const Planning = require("../js/planning-model.js");
const Design = require("../js/design-model.js");
require("../js/workbench-model.js");
require("../js/workbench-building.js");
const room = (id, x = 0, y = 0, w = 120, h = 120, floor = 0) => ({
  id,
  type: "bedroom",
  x,
  y,
  w,
  h,
  floor,
});
const project = (props = {}) =>
  M.normalize({ elements: [], fixtures: [], ...props });
test("feet/inches, decimals and invalid input", () => {
  assert.equal(M.inches(`10' 6"`, "ftin"), 126);
  assert.equal(M.inches("2.54", "cm"), 1);
  assert.equal(M.inches("12.25", "in"), 12.25);
  assert.ok(Number.isNaN(M.inches("12oops")));
  for (const u of ["in", "cm", "ftin"])
    assert.ok(Math.abs(M.inches(M.display(126.25, u), u) - 126.25) < 0.001);
});
test("coordinates follow all four compass orientations", () => {
  assert.equal(M.zone(150, 150, 200, 200, "West"), "NE");
  assert.equal(M.zone(190, 100, 200, 200, "North"), "E");
  for (const top of ["North", "East", "South", "West"])
    for (const zone of ["NE", "NW", "SE", "SW"]) {
      const p = M.zonePosition(zone, 20, 20, 200, 200, top, 10);
      assert.equal(M.zone(p.x + 10, p.y + 10, 200, 200, top), zone);
    }
});
test("legacy projects gain stable IDs and preserve empty floors", () => {
  const p = project({
    floorCount: 4,
    elements: [{ ...room(undefined), customName: "A" }],
  });
  assert.equal(p.floorCount, 4);
  assert.ok(p.elements[0].id);
  assert.deepEqual(project(JSON.parse(JSON.stringify(p))), p);
});
test("invalid dimensions, floors, openings and future files fail before apply", () => {
  for (const n of [-1, 0, NaN, Infinity])
    assert.throws(() => project({ elements: [{ ...room("a"), w: n }] }));
  assert.throws(() => project({ elements: [room("a", 0, 0, 120, 120, 1.2)] }));
  assert.throws(() => project({ version: "3.0" }));
  assert.throws(() =>
    project({
      elements: [room("a")],
      fixtures: [
        { type: "door", roomId: 0, edge: "top", offset: 100, size: 40 },
      ],
    }),
  );
  assert.throws(() =>
    project({
      elements: [room("a")],
      fixtures: [
        {
          type: "window",
          roomId: 0,
          edge: "top",
          offset: 0,
          size: 40,
          height: 100,
          sill: 40,
        },
      ],
    }),
  );
});
test("HTML is escaped, IDs cannot inject inline actions", () => {
  assert.equal(M.escapeHTML('<img a="x">'), "&lt;img a=&quot;x&quot;&gt;");
  const p = project({ elements: [room("bad');alert(1);//")] });
  assert.match(p.elements[0].id, /^[\w:-]+$/);
});
test("shared walls are segmented and openings retain dimensions", () => {
  const p = project({
    elements: [room("a"), room("b", 120, 30, 80, 60)],
    fixtures: [
      { type: "door", roomId: 0, edge: "right", offset: 40, size: 30 },
    ],
  });
  const walls = M.walls(p),
    shared = walls.filter((w) => w.shared);
  assert.equal(shared.length, 1);
  assert.equal(shared[0].thickness, 4.5);
  assert.equal(shared[0].end - shared[0].start, 60);
  assert.equal(shared[0].openings[0].end - shared[0].openings[0].start, 30);
  assert.equal(walls.filter((w) => w.fixed === 120 && !w.horizontal).length, 3);
});
test("distance constraints solve chains and reject cycles/duplicates/locked targets", () => {
  const p = project({
    elements: [room("a"), room("b"), room("c")],
    constraints: [
      { kind: "offset-x", source: "a", target: "b", distance: 120 },
      { kind: "offset-x", source: "b", target: "c", distance: 120 },
    ],
  });
  assert.equal(M.solveConstraints(p).elements[2].x, 240);
  p.constraints.push({
    kind: "offset-x",
    source: "c",
    target: "a",
    distance: 20,
  });
  assert.throws(() => M.solveConstraints(p), /cycle/);
  p.constraints.pop();
  p.elements[1].locked = true;
  assert.throws(() => M.solveConstraints(p), /Unlock/);
});
function stateHarness() {
  const nodes = new Map(),
    defaults = {
      inW: "600",
      inH: "600",
      "b-floors": "1",
      unitSelect: "in",
      scaleInput: "1.2",
      compassDir: "West",
      roadSide: "east",
    };
  const document = {
    getElementById(id) {
      if (!nodes.has(id))
        nodes.set(id, { value: defaults[id] ?? "0", checked: false });
      return nodes.get(id);
    },
    addEventListener() {},
    body: { classList: { contains: () => false, toggle() {} } },
  };
  const c = {
    ProjectModel: M,
    PlanningModel: Planning,
    DesignModel: Design,
    document,
    structuredClone,
    console,
    Date,
    setInterval() {},
    addEventListener() {},
    localStorage: { getItem: () => null },
    AppEvents: { triggerStateChange() {} },
    renderFloorSelectors() {},
  };
  c.window = c;
  vm.createContext(c);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../js/state.js"), "utf8"),
    c,
  );
  return { run: (code) => vm.runInContext(code, c), c };
}
test("first action, floor metadata, uncommon fields and redo are complete snapshots", () => {
  const { run } = stateHarness();
  run(
    `ProjectState.baseline();ProjectState.commit('Add',()=>elements.push({id:'a',type:'staircase',x:0,y:0,w:120,h:120,floor:0}));`,
  );
  assert.equal(run("elements.length"), 1);
  run("ProjectState.undo()");
  assert.equal(run("elements.length"), 0);
  run("ProjectState.redo()");
  run(
    `ProjectState.commit('Upper floor',()=>{document.getElementById('b-floors').value='3';currentFloor=2;elements[0].cutAllFloors=true;});ProjectState.undo();`,
  );
  assert.equal(run("document.getElementById('b-floors').value"), 1);
  assert.equal(run("currentFloor"), 0);
  assert.equal(run("!!elements[0].cutAllFloors"), false);
  run("ProjectState.redo()");
  assert.equal(run("currentFloor"), 2);
  assert.equal(run("elements[0].cutAllFloors"), true);
});
test("failed mutations roll back geometry and history", () => {
  const { run } = stateHarness();
  run(
    `ProjectState.baseline();ProjectState.commit('Add',()=>elements.push({id:'a',type:'bedroom',x:0,y:0,w:120,h:120,floor:0}));`,
  );
  run("selectedElIndex=0");
  assert.equal(run(`ProjectState.updateElement(0,{w:-10})`), false);
  assert.equal(run("selectedElIndex"), 0, "Rejected edits preserve the selected room");
  assert.equal(run("elements[0].w"), 120);
  assert.equal(run("ProjectState.history.stack.length"), 1);
});
test("navigation alone does not consume undo", () => {
  const { run } = stateHarness();
  run(
    `ProjectState.baseline();ProjectState.commit('Floors',()=>{document.getElementById('b-floors').value=3});currentFloor=2;ProjectState.undo();`,
  );
  assert.equal(run("document.getElementById('b-floors').value"), 1);
});
test("removing rooms repairs fixture indices and distance constraints", () => {
  const { run } = stateHarness();
  run(
    `ProjectState.apply({elements:[{id:'a',type:'bedroom',x:0,y:0,w:120,h:120,floor:0},{id:'b',type:'bedroom',x:120,y:0,w:120,h:120,floor:0}],fixtures:[{type:'door',roomId:1,edge:'top',offset:10,size:30}],constraints:[{kind:'offset-x',source:'a',target:'b',distance:120}]},{rebase:true});ProjectState.deleteElement(0);`,
  );
  assert.equal(run("fixtures[0].roomId"), 0);
  assert.equal(run("fixtures[0].roomUid"), "b");
  assert.equal(run("ProjectState.meta.constraints.length"), 0);
});
test("storage failure leaves dirty state and reports failure", async () => {
  const { run, c } = stateHarness();
  c.localStorage.setItem = () => {
    throw Error("Quota exceeded");
  };
  run(
    `StorageEngine.loading=false;StorageEngine.dbNeedsSave=true;StorageEngine.initDB=async()=>{throw Error('IndexedDB blocked')}`,
  );
  await run("StorageEngine.saveToMemory()");
  assert.equal(run("StorageEngine.dbNeedsSave"), true);
  assert.match(run("StorageEngine.error"), /Quota/);
});

test("advanced visualization workspace survives project round trip", () => {
  const p = project({view:{mode:"4d"}});
  assert.equal(M.normalize(JSON.parse(JSON.stringify(p))).view.mode,"4d");
  assert.throws(() => project({view:{mode:"unsupported"}}), /workspace mode/);
});
