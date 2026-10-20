/* Reproducible large-plan CPU benchmark, separate from the deterministic unit suite. */
const assert = require("node:assert/strict");
require("../js/project-model.js");
require("../js/planning-model.js");
const D = require("../js/design-model.js");
require("../js/workbench-model.js");
require("../js/workbench-building.js");
const p = ProjectModel.normalize({
  name: "500-room benchmark",
  plot: { inW: "5000", inH: "5000" },
  elements: Array.from({ length: 500 }, (_, i) => ({
    id: "r" + i,
    type: "bedroom",
    floor: 0,
    x: 20 + (i % 25) * 140,
    y: 20 + Math.floor(i / 25) * 140,
    w: 120,
    h: 120,
  })),
  fixtures: [],
});
const start = performance.now(),
  q = PlanningModel.quantities(p),
  middle = performance.now(),
  findings = D.analyze(p),
  end = performance.now();
assert.equal(p.elements.length, 500);
assert.ok(q.floors[0].floorArea > 0);
assert.ok(end - start < 10000, "500-room geometry exceeds 10-second budget");
console.log(
  JSON.stringify({
    rooms: 500,
    quantitiesMs: Math.round(middle - start),
    analysisMs: Math.round(end - middle),
    findings: findings.length,
    wallCount: ProjectModel.walls(p).length,
  }),
);
