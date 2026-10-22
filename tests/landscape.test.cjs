const test = require("node:test"),
  assert = require("node:assert/strict");
const P = require("../js/project-model.js"),
  M = require("../js/planning-model.js");
require("../js/design-model.js");
require("../js/workbench-model.js");
const L = require("../js/landscape4d.js");
const project = (props) => P.normalize({ elements: [], ...props });
test("yard follows the true plot and excludes buildings and every road approach without mutating a project", () => {
  for (const roadSide of ["east", "west", "north", "south"]) {
    const p = project({ plot: { roadSide } }),
      before = JSON.stringify(p),
      plan = L.plan(p),
      w = P.inches(p.plot.inW, p.unit),
      h = P.inches(p.plot.inH, p.unit);
    assert.equal(JSON.stringify(p), before);
    assert.ok(plan.lawn.length);
    assert.equal(plan.contains(20, 20), false);
    assert.equal(plan.contains(-500, 0), false);
    const roadPoint =
      roadSide === "north"
        ? [w + 14, h / 2]
        : roadSide === "south"
          ? [-14, h / 2]
          : roadSide === "west"
            ? [w / 2, -14]
            : [w / 2, h + 14];
    assert.equal(plan.contains(...roadPoint), false);
    for (const plant of plan.plants)
      assert.ok(plan.contains(plant.x, plant.y, plant.radius + 3));
    assert.ok(plan.plants.filter((p) => p.kind === "tree").length <= 5);
    assert.ok(plan.plants.filter((p) => p.kind === "shrub").length <= 16);
    assert.deepEqual(
      plan.plants,
      L.plan(p).plants,
      "Regeneration must be deterministic",
    );
  }
});
test("zero setbacks leave no garden and planting respects a custom boundary", () => {
  const plot = Object.fromEntries(
    ["aL", "aU", "bR", "bU", "cR", "cD", "dL", "dD"].map((k) => [k, "0"]),
  );
  assert.equal(L.plan(project({ plot })).lawn.length, 0);
  const boundary = [
    { x: -100, y: -80 },
    { x: 400, y: -60 },
    { x: 360, y: 500 },
    { x: -70, y: 480 },
  ];
  const p = project({ design: { workbench: { site: { boundary } } } }),
    plan = L.plan(p);
  assert.deepEqual(plan.boundary, boundary);
  for (const plant of plan.plants) assert.ok(M.inside(plant, boundary));
});
test("site paths and off-centre exterior doors retain clear approaches", () => {
  const p = project({
    elements: [
      { id: "room", type: "bedroom", floor: 0, x: 0, y: 0, w: 200, h: 200 },
    ],
    fixtures: [
      {
        id: "entry",
        roomId: 0,
        type: "door",
        edge: "left",
        offset: 20,
        size: 30,
      },
    ],
    design: {
      workbench: {
        outdoors: [
          {
            id: "path",
            kind: "path",
            points: [
              { x: -22, y: 100 },
              { x: 0, y: 100 },
              { x: 0, y: 150 },
              { x: -22, y: 150 },
            ],
            height: 1,
          },
        ],
      },
    },
  });
  const plan = L.plan(p);
  assert.equal(plan.contains(-12, 35), false);
  assert.equal(plan.contains(-12, 125), false);
});

test("a site without a road retains lawn at the default approach", () => {
  const p = project({ plot: { roadSide: "none" } }),
    w = P.inches(p.plot.inW, p.unit),
    h = P.inches(p.plot.inH, p.unit);
  assert.equal(L.plan(p).contains(w / 2, h + 14), true);
});
