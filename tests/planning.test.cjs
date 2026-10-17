const test = require("node:test"),
  assert = require("node:assert/strict");
const P = require("../js/project-model.js"),
  M = require("../js/planning-model.js");
require("../js/design-model.js");
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
const project = (props) =>
  P.normalize({ elements: [], fixtures: [], ...props });
test("planning data, polygons and opening styles survive portable round trip", () => {
  const p = project({
    floorCount: 2,
    elements: [
      {
        ...room("p", 10, 10, 160, 160),
        points: [
          { x: 0, y: 0 },
          { x: 160, y: 0 },
          { x: 160, y: 80 },
          { x: 80, y: 80 },
          { x: 80, y: 160 },
          { x: 0, y: 160 },
        ],
      },
    ],
    fixtures: [
      {
        type: "door",
        roomId: 0,
        edge: "segment:0",
        offset: 10,
        size: 30,
        style: "sliding",
        handing: "right",
        swing: "out",
      },
    ],
    planning: {
      walls: [
        {
          id: "w",
          floor: 1,
          a: { x: 20, y: 20 },
          b: { x: 80, y: 90 },
          thickness: 6,
        },
      ],
      measurements: [
        {
          id: "m",
          floor: 0,
          a: { x: 10, y: 10 },
          b: { x: 30, y: 60 },
          label: "A",
        },
      ],
      annotations: [
        { id: "a", floor: 0, x: 30, y: 30, kind: "note", text: "Hello" },
      ],
      services: [
        {
          id: "s",
          floor: 0,
          kind: "supply",
          layer: "plumbing",
          points: [
            { x: 10, y: 10 },
            { x: 80, y: 80 },
          ],
        },
      ],
    },
  });
  assert.deepEqual(P.normalize(JSON.parse(JSON.stringify(p))), p);
  assert.equal(p.fixtures[0].edge, "segment:0");
  assert.equal(M.area(M.points(p.elements[0])), 19200);
  assert.ok(
    P.walls(p).some(
      (w) => w.floor === 1 && Math.abs(w.length - Math.hypot(60, 70)) < 0.001,
    ),
  );
});
test("invalid polygons, unsafe underlays and out-of-plot planning geometry reject atomically", () => {
  assert.throws(
    () =>
      project({
        elements: [
          {
            ...room("a"),
            points: [
              { x: 0, y: 0 },
              { x: 120, y: 120 },
              { x: 120, y: 0 },
              { x: 0, y: 120 },
            ],
          },
        ],
      }),
    /polygon/,
  );
  assert.throws(
    () =>
      project({
        planning: {
          underlays: [
            {
              id: "u",
              floor: 0,
              x: 0,
              y: 0,
              w: 100,
              h: 100,
              opacity: 0.3,
              data: "data:image/svg+xml;base64,abc",
            },
          ],
        },
      }),
    /PNG/,
  );
  assert.throws(
    () =>
      project({
        planning: {
          walls: [
            {
              id: "w",
              floor: 0,
              a: { x: 20, y: 20 },
              b: { x: 3000, y: 20 },
              thickness: 6,
            },
          ],
        },
      }),
    /boundary/,
  );
  assert.throws(
    () =>
      project({
        elements: [
          {
            ...room("a"),
            points: [
              { x: 0, y: 0 },
              { x: 120, y: 0 },
              { x: 120, y: 120 },
              { x: 0, y: 120 },
            ],
          },
        ],
        fixtures: [
          { type: "door", roomId: 0, edge: "top", offset: 0, size: 30 },
        ],
      }),
    /segment/,
  );
});
test("shared angled walls split once and retain opening cuts", () => {
  const p = project({
    elements: [
      {
        ...room("a", 0, 0, 100, 100),
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 },
        ],
      },
      {
        ...room("b", 0, 0, 100, 100),
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
        ],
      },
    ],
    fixtures: [
      { type: "door", roomId: 0, edge: "segment:0", offset: 20, size: 30 },
    ],
  });
  const w = P.walls(p).find((w) => w.shared);
  assert.ok(w);
  assert.ok(Math.abs(w.length - Math.SQRT2 * 100) < 0.01);
  assert.equal(w.openings[0].end - w.openings[0].start, 30);
  assert.equal(w.thickness, 4.5);
});
test("rectangular override IDs remain stable after adding a polygon", () => {
  const p = project({ elements: [room("a")] }),
    id = P.walls(p)[0].id;
  p.wallOverrides[id] = 12;
  p.elements.push({
    ...room("b", 150, 150, 100, 100),
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ],
  });
  assert.equal(P.walls(p).find((w) => w.id === id).thickness, 12);
});
test("clear dimensions deduct walls even when caller holds a cloned room", () => {
  const p = project({ elements: [room("a")] });
  const clear = M.clear(p, structuredClone(p.elements[0]));
  assert.equal(clear.w, 111);
  assert.equal(clear.h, 111);
  assert.equal(clear.area, 111 * 111);
});
test("Vastu scores only applicable rooms on the selected floor and does not compound bonuses", () => {
  const p = project({
    floorCount: 2,
    compass: "North",
    plot: { inW: "600", inH: "600" },
    elements: [
      { ...room("k", 400, 400, 100, 100), type: "kitchen" },
      { ...room("b", 0, 0), role: "bedroom" },
    ],
  });
  assert.equal(M.vastu(p, 1).score, null);
  assert.equal(M.vastu(p, 0).count, 1);
  assert.equal(M.vastu(p, 0).score, 100);
  p.elements.push({ ...p.elements[0], id: "k2" });
  assert.equal(M.vastu(p, 0).score, 100);
  p.elements[1].role = "master";
  assert.equal(M.vastu(p, 0).count, 3);
});
test("room access, exterior window area and connected entrance routes are distinct checks", () => {
  const p = project({
    elements: [room("a"), room("b", 120)],
    fixtures: [
      { type: "door", roomId: 0, edge: "left", offset: 20, size: 36 },
      { type: "door", roomId: 0, edge: "right", offset: 20, size: 36 },
      { type: "window", roomId: 1, edge: "left", offset: 60, size: 30 },
    ],
  });
  const c = M.connectivity(p, 0);
  assert.ok(c.rooms.every((r) => r.reachable));
  const a = M.analyze(p);
  assert.ok(a.results.some((r) => r.code === "ventilation" && r.index === 1));
  assert.ok(
    a.checks.some((r) => r.code === "access" && r.index === 1 && r.pass),
  );
  assert.ok(a.checks.every((r) => r.id && r.index >= 0));
});
test("quantities deduct the union of overlapping openings once", () => {
  const p = project({
    elements: [room("a")],
    fixtures: [
      { type: "door", roomId: 0, edge: "top", offset: 10, size: 40 },
      { type: "door", roomId: 0, edge: "top", offset: 20, size: 40 },
    ],
  });
  const q = M.quantities(p).floors[0];
  assert.ok(Math.abs(q.wall - (480 * 120 - 50 * 80) / 144) < 0.0001);
  assert.equal(q.paint, q.wall * 2);
  p.planning.cost = {
    wall: 2,
    paint: 1,
    floor: 3,
    wastage: 10,
    currency: "INR",
  };
  assert.ok(M.quantities(p).total > 0);
});
test("Auto-builder preserves fixed objects, untouched floors and creates attached bathroom access", () => {
  const p = project({
    floorCount: 2,
    plot: { inW: "600", inH: "600" },
    elements: [
      { ...room("fixed", 400, 400, 100, 100), locked: true },
      room("up", 0, 0, 120, 120, 1),
    ],
  });
  const next = M.generate(
    p,
    {
      floors: [0],
      bedrooms: 2,
      baths: 1,
      attached: 1,
      bedW: 120,
      bedH: 132,
      setback: 10,
    },
    0,
  );
  assert.deepEqual(
    next.elements.find((e) => e.id === "fixed"),
    p.elements[0],
  );
  assert.deepEqual(
    next.elements.find((e) => e.id === "up"),
    p.elements[1],
  );
  const bath = next.elements.find((e) => e.attachedTo);
  assert.ok(bath);
  const i = next.elements.indexOf(bath),
    door = next.fixtures.find((f) => f.roomId === i && f.type === "door");
  assert.ok(door);
  const c = M.connectivity(next, 0);
  assert.ok(
    c.links.some(
      (l) =>
        [l.a, l.b].includes(i) &&
        [l.a, l.b].includes(
          next.elements.findIndex((e) => e.id === bath.attachedTo),
        ),
    ),
  );
  assert.equal(p.elements.length, 2);
  assert.throws(
    () =>
      M.generate(project(), {
        floors: [0],
        bedrooms: 10,
        baths: 10,
        bedW: 200,
        bedH: 200,
      }),
    /cannot fit/,
  );
});
test("snapping honors geometry and configured grid, and stair fit uses shape and direction", () => {
  const p = project({ elements: [room("a", 20, 20)] });
  assert.equal(M.snap(p, { x: 22, y: 19 }, 0).x, 20);
  p.planning.snap.endpoints = false;
  p.planning.snap.midpoints = false;
  p.planning.snap.faces = false;
  p.planning.snap.spacing = 12;
  assert.equal(M.snap(p, { x: 33, y: 33 }, 0).x, 36);
  const e = {
    ...room("stairs", 0, 0, 96, 180),
    type: "staircase",
    stairStyle: "u-shape",
    stairDesign: { rise: 120, riser: 7, tread: 10, landing: 36, headroom: 80 },
  };
  const d = M.stairs(e);
  assert.equal(d.count, 18);
  assert.ok(d.fits);
  assert.ok(!M.stairs({ ...e, w: 60 }).fits);
});
test("fraction parsing and formatting preserve signs and all converter units", () => {
  assert.equal(P.inches(`10' 6 1/2"`, "ftin"), 126.5);
  assert.equal(P.inches("1/2", "in"), 0.5);
  assert.equal(P.inches(P.display(-12.25, "ftin"), "ftin"), -12.25);
  for (const unit of ["in", "ft", "cm", "mm", "m", "ftin"])
    assert.ok(
      Math.abs(M.units.parse(M.units.format(126.5, unit), unit) - 126.5) <
        0.001,
    );
  assert.ok(Number.isNaN(M.units.parse("1/0", "in")));
  assert.ok(Number.isNaN(M.units.parse("1;alert(1)", "ftin")));
});
test("per-floor BHK and empty layouts retain protected objects and other floor requirements", () => {
  const p = project({
    floorCount: 3,
    plot: { inW: "700", inH: "700" },
    elements: [
      { ...room("fixed", 500, 500, 100, 100), locked: true },
      room("old", 0, 0, 100, 100, 1),
      room("upper", 0, 0, 100, 100, 2),
    ],
  });
  const next = M.generate(
    p,
    {
      floors: [0, 1],
      perFloor: { 0: "1bhk", 1: "none" },
      bedrooms: 3,
      baths: 1,
      attached: 0,
      bedW: 120,
      bedH: 132,
    },
    0,
  );
  assert.ok(next.elements.some((e) => e.id === "fixed"));
  assert.ok(next.elements.some((e) => e.id === "upper"));
  assert.ok(!next.elements.some((e) => e.floor === 1));
  assert.equal(
    next.elements.filter(
      (e) => e.floor === 0 && e.type === "bedroom" && e.id !== "fixed",
    ).length,
    1,
  );
  assert.equal(next.layouts["layout-f1"], "none");
});
