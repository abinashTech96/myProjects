const test = require("node:test"),
  assert = require("node:assert/strict");
const P = require("../js/project-model.js");
require("../js/planning-model.js");
require("../js/design-model.js");
require("../js/workbench-model.js");
require("../js/workbench-building.js");
const M = require("../js/presentation-model.js");
const room = {
    id: "room",
    type: "bedroom",
    x: 0,
    y: 0,
    w: 240,
    h: 240,
    floor: 0,
  },
  bed = {
    id: "bed",
    type: "bed",
    isFurniture: true,
    x: 20,
    y: 20,
    w: 60,
    h: 80,
    floor: 0,
  };
const project = () =>
  P.normalize({
    elements: [room, bed],
    fixtures: [
      {
        id: "door",
        type: "door",
        roomId: 0,
        edge: "top",
        offset: 20,
        size: 36,
      },
    ],
  });
test("surface channels, opening state and lighting survive a portable file", () => {
  const p = project();
  p.design.presentation.surfaces.room = {
    floor: {
      type: "wood",
      color: "#ad8765",
      scale: 2,
      rotation: 90,
      roughness: 0.4,
    },
    wall: {
      type: "paint",
      color: "#ddeeff",
      scale: 1,
      rotation: 0,
      roughness: 0.9,
    },
  };
  p.design.presentation.openings.door = 0.7;
  const restored = P.normalize(JSON.parse(JSON.stringify(p)));
  assert.equal(restored.design.presentation.surfaces.room.floor.rotation, 90);
  assert.equal(restored.design.presentation.openings.door, 0.7);
  p.design.presentation.surfaces.room.floor.roughness = -1;
  assert.throws(() => P.normalize(p), /roughness/);
});
test("exact furniture placement respects rotation, floor and wall inset", () => {
  const p = project(),
    v = M.place(p, "bed", "room", "right", 12, "end");
  assert.equal(v.x, 240 - 4.5 - 12 - 60);
  assert.equal(v.y, 240 - 4.5 - 12 - 80);
  p.elements[1].rot = 90;
  assert.equal(M.place(p, "bed", "room", "left", 0).x, 4.5);
  p.elements[1].locked = true;
  assert.throws(() => M.place(p, "bed", "room", "left", 0), /Unlock/);
});
test("clearance checks find collisions, narrow gaps and blocked door envelopes", () => {
  const p = project();
  p.elements.push({ ...bed, id: "chair", x: 90, w: 30 });
  const rows = M.checks(p, 36);
  assert.ok(rows.some((r) => r.text.includes("narrow passage")));
  assert.ok(rows.some((r) => r.text.includes("door swing")));
  p.elements[2].x = 40;
  assert.ok(M.checks(p).some((r) => r.text === "Furniture collision"));
});
test("stale room and opening presentation settings are pruned on deletion", () => {
  const p = project();
  p.design.presentation.openings.missing = 0.5;
  p.design.presentation.surfaces.missing = { floor: {} };
  const next = P.normalize(p);
  assert.deepEqual(next.design.presentation.surfaces, {});
  assert.deepEqual(next.design.presentation.openings, {});
  p.design.presentation.walkSpeed = 10;
  assert.throws(() => P.normalize(p), /speed/);
});
test("wall snapping is bounded, optional and ignores locked furniture", () => {
  const p = project(),
    e = { ...p.elements[1], x: 6, y: 30 };
  assert.equal(M.snap(p, e).x, 4.5);
  p.design.presentation.wallSnap = false;
  assert.deepEqual(M.snap(p, e), {});
  p.design.presentation.wallSnap = true;
  e.locked = true;
  assert.deepEqual(M.snap(p, e), {});
});
test("sliding and open doors do not generate hinged swing warnings", () => {
  const p = project();
  p.fixtures[0].style = "sliding";
  assert.equal(
    M.checks(p).some((r) => r.text.includes("swing")),
    false,
  );
  p.fixtures[0].style = "open";
  assert.equal(
    M.checks(p).some((r) => r.text.includes("swing")),
    false,
  );
});

test("sunlight strength persists, defaults for older projects, and rejects invalid percentages", () => {
  const p=project(); assert.equal(p.design.presentation.sunlight,100);
  p.design.presentation.sunlight=37;
  assert.equal(P.normalize(JSON.parse(JSON.stringify(p))).design.presentation.sunlight,37);
  for(const invalid of [-1,101,NaN,"50"]) assert.throws(()=>M.validate({...M.defaults(),sunlight:invalid},p),/Sunlight/);
});
