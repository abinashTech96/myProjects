const test = require("node:test"),
  assert = require("node:assert/strict");
const P = require("../js/project-model.js");
require("../js/planning-model.js");
require("../js/design-model.js");
require("../js/workbench-model.js");
require("../js/workbench-building.js");
require("../js/presentation-model.js");
const M = require("../js/fourd-model.js");
const project = () =>
  P.normalize({
    elements: [
      { id: "room", type: "bedroom", x: 0, y: 0, w: 240, h: 240, floor: 0 },
      {
        id: "bed",
        type: "bed",
        isFurniture: true,
        x: 20,
        y: 20,
        w: 60,
        h: 80,
        floor: 0,
      },
    ],
  });
test("4D settings and PBR finishes survive portable save, with independent defaults", () => {
  const p = project(),
    s = p.design.presentation.studio;
  s.environment = "sunset";
  s.lens = 50;
  s.verticals = true;
  s.progressive = true;
  s.samples = 32;
  s.assignments.bed = 2;
  s.mirrors.push({
    room: "room",
    edge: "top",
    width: 36,
    height: 60,
    sill: 30,
    offset: 0.5,
  });
  for (const [type, spec] of Object.entries(M.materials)) {
    p.design.presentation.surfaces.room = {
      floor: {
        type,
        color: spec.color,
        roughness: spec.roughness,
        scale: 1,
        rotation: 90,
      },
    };
    const restored = P.normalize(JSON.parse(JSON.stringify(p)));
    assert.deepEqual(restored.design.presentation.studio, s);
    assert.equal(restored.design.presentation.surfaces.room.floor.type, type);
  }
  assert.equal(project().design.presentation.studio.mirrors.length, 0);
  assert.equal(project().design.presentation.studio.lens, 0);
});
test("4D schema rejects unsafe sizes, bad stages and unsupported rendering settings", () => {
  for (const [key, value] of [
    ["samples", 128],
    ["lens", 2],
    ["environment", "unknown"],
    ["reflections", "raytracing"],
    ["phaseSeconds", 0],
    ["environmentIntensity", Infinity],
    ["hdr", "https://example.com/env.hdr"],
    ["phases", []],
    ["phases", Array(13).fill("Phase")],
    ["assignments", { room: 50 }],
  ]) {
    const p = project();
    p.design.presentation.studio[key] = value;
    assert.throws(() => P.normalize(p), undefined, key);
  }
  const p = project();
  p.design.presentation.studio.mirrors = Array(5).fill({
    room: "room",
    edge: "top",
    width: 36,
    height: 60,
    sill: 30,
    offset: 0.5,
  });
  assert.throws(() => P.normalize(p), /four/);
});
test("deleting elements prunes their phase and mirror references without changing other assignments", () => {
  const p = project();
  p.design.presentation.studio.assignments = { room: 1, bed: 4, missing: 0 };
  p.design.presentation.studio.mirrors = [
    {
      room: "room",
      edge: "right",
      width: 36,
      height: 60,
      sill: 30,
      offset: 0.5,
    },
  ];
  p.elements = p.elements.filter((e) => e.id !== "room");
  const s = P.normalize(p).design.presentation.studio;
  assert.deepEqual(s.assignments, { bed: 4 });
  assert.equal(s.mirrors.length, 0);
});
test("construction stages honor overrides and distinguish envelope, ceilings and furniture", () => {
  const p = project(),
    s = p.design.presentation.studio;
  assert.equal(M.stageFor({ roomIndex: 1 }, p, s), 4);
  assert.equal(M.stageFor({ isRoof: true }, p, s), 1);
  assert.equal(M.stageFor({ isOpening: true }, p, s), 2);
  assert.equal(M.stageFor({ presentationSurface: "ceiling" }, p, s), 3);
  s.assignments.room = 2;
  assert.equal(M.stageFor({ elementId: "room", isWall: true }, p, s), 2);
});
test("LOD uses projected size and raster samples remain bounded and distinct", () => {
  assert.ok(
    M.projectedPixels(10, 100, 600, 60) > M.projectedPixels(10, 1000, 600, 60),
  );
  assert.ok(
    M.projectedPixels(10, 100, 600, 24) > M.projectedPixels(10, 100, 600, 85),
  );
  const pairs = Array.from({ length: 64 }, (_, i) => [
    M.halton(i + 1, 2),
    M.halton(i + 1, 3),
  ]);
  assert.equal(new Set(pairs.map(String)).size, 64);
  assert.ok(pairs.flat().every((v) => v > 0 && v < 1));
});

test("HDR imports validate resolution before allocating pixel buffers", () => {
  assert.deepEqual(
    M.hdrSize("#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 1024 +X 2048\n"),
    { width: 2048, height: 1024 },
  );
  assert.throws(
    () =>
      M.hdrSize("#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 32768 +X 32768\n"),
    /2048/,
  );
  const p = project();
  p.design.presentation.studio.hdr =
    "data:application/octet-stream;base64," +
    Buffer.from(
      "#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 20000 +X 20000\n",
    ).toString("base64");
  assert.throws(() => P.normalize(p), /HDR/);
});

test('guided camera tours preserve model-space stops and validate portable input',()=>{
 const p=project(),d=M.defaults();
 assert.deepEqual(d.guidedStops,[]);
 d.guidedStops.push({name:'Bedroom',position:{x:120,y:120,z:64},target:{x:100,y:80,z:40},kind:'element',floor:0,element:'room',projection:'perspective'});
 d.tourSpeed=1.5;
 p.design.presentation.studio=d;
 const next=P.normalize(JSON.parse(JSON.stringify(p)));
 assert.deepEqual(next.design.presentation.studio.guidedStops.map(({zoom,materialChannel,...stop})=>stop),d.guidedStops);
 assert.equal(next.design.presentation.studio.tourSpeed,1.5);
 const invalid=structuredClone(d);invalid.guidedStops[0].position.x=Infinity;
 assert.throws(()=>M.validate(invalid,p),/coordinate/);
 const many=structuredClone(d);many.guidedStops=Array(25).fill(d.guidedStops[0]);
 assert.throws(()=>M.validate(many,p),/24/);
 const removed=structuredClone(d);removed.guidedStops[0].element='deleted-room';
 assert.equal(M.validate(removed,p).guidedStops[0].kind,'building');
});
