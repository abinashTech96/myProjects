const test = require("node:test"),
  assert = require("node:assert/strict");
require("../js/project-model.js");
const M = require("../js/planning-model.js"),
  D = require("../js/design-model.js"),
  P = global.ProjectModel;
require("../js/workbench-model.js");
require("../js/workbench-building.js");
require("../js/workbench-ifc.js");
const room = (id, x = 0, y = 0, w = 120, h = 120) => ({
    id,
    type: "bedroom",
    x,
    y,
    w,
    h,
    floor: 0,
  }),
  p = (x) => P.normalize({ elements: [], fixtures: [], ...x });
test("mixed wall polygon clear area and overlapping floor unions are geometric", () => {
  const project = p({
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
      room("b", 120),
    ],
  });
  const a = D.clear(project, project.elements[0]);
  assert.equal(a.w, 113.25);
  assert.equal(a.h, 111);
  assert.equal(a.area, 113.25 * 111);
  const overlap = p({ elements: [room("a"), room("b", 60)] });
  assert.equal(D.geomArea(D.floorUnion(overlap, 0)) / 144, 150);
  assert.ok(
    M.quantities(overlap).floors[0].floorArea <
      M.quantities(overlap).floors[0].sumFloorArea,
  );
});
test("face recognition splits partitions and retains opening geometry", () => {
  let project = p({
    elements: [room("a", 20, 20, 240, 120)],
    fixtures: [{ type: "door", roomId: 0, edge: "top", offset: 20, size: 30 }],
    planning: {
      walls: [
        {
          id: "partition",
          floor: 0,
          a: { x: 140, y: 20 },
          b: { x: 140, y: 140 },
          thickness: 4.5,
        },
      ],
    },
  });
  const next = D.recognize(project, 0);
  assert.equal(next.elements.length, 2);
  assert.equal(next.fixtures.length, 1);
  assert.equal(
    next.elements.reduce((s, e) => s + M.area(M.points(e)), 0),
    240 * 120,
  );
  assert.ok(next.elements.some((e) => e.id === "a"));
});
test("connected wall movement preserves a common boundary and mirrored openings", () => {
  const project = p({ elements: [room("a"), room("b", 120)] });
  const wall = P.walls(project).find((w) => w.shared),
    next = D.moveWall(project, wall.id, 12);
  assert.ok(
    P.walls(next).some((w) => w.shared && Math.abs(w.a.x - 108) < 0.01),
  );
  const withDoor = p({
    elements: [room("a", 20, 20)],
    fixtures: [{ type: "door", roomId: 0, edge: "top", offset: 10, size: 30 }],
  });
  const mirrored = D.transformSelection(withDoor, ["a"], (q) => ({
    x: 200 - q.x,
    y: q.y,
  }));
  assert.ok(mirrored.elements[0].points);
  assert.equal(mirrored.fixtures[0].size, 30);
});
test("sun, offsets, curved walls, narrow passages and clash checks return geometry", () => {
  const project = p({
    elements: [
      {
        ...room("a", 20, 20, 200, 200),
        points: [
          { x: 0, y: 0 },
          { x: 200, y: 0 },
          { x: 200, y: 40 },
          { x: 40, y: 40 },
          { x: 40, y: 200 },
          { x: 0, y: 200 },
        ],
      },
    ],
    planning: {
      walls: [
        {
          id: "curve",
          floor: 0,
          a: { x: 230, y: 20 },
          b: { x: 230, y: 200 },
          curve: { control: { x: 270, y: 100 }, steps: 16 },
          thickness: 4.5,
        },
      ],
      services: [
        {
          id: "s1",
          floor: 0,
          layer: "electrical",
          kind: "socket",
          points: [
            { x: 20, y: 20 },
            { x: 100, y: 100 },
          ],
        },
        {
          id: "s2",
          floor: 0,
          layer: "plumbing",
          kind: "supply",
          points: [
            { x: 20, y: 100 },
            { x: 100, y: 20 },
          ],
        },
      ],
    },
  });
  assert.ok(
    P.walls(project).some((w) =>
      w.owners.some((o) => o.wallId?.startsWith("curve:")),
    ),
  );
  assert.ok(D.narrow(project, project.elements[0]).width < 40);
  const sun = D.sun(project.design.site);
  assert.ok(Number.isFinite(sun.altitude) && sun.azimuth >= 0);
  assert.ok(D.offsetPath(M.points(project.elements[0]), 6).length);
  assert.ok(D.clashes(project).length);
});
test("design metadata, roof, finishes, tiles and constraints survive files", () => {
  const project = p({
    elements: [room("a", 20, 20)],
    design: {
      roof: { type: "gable", rise: 36, overhang: 12, drain: "east" },
      finishes: { a: { floor: "Tile", wall: "Paint" } },
      tiles: { a: { w: 24, h: 24, joint: 0.125, angle: 0 } },
    },
  });
  assert.deepEqual(P.normalize(JSON.parse(JSON.stringify(project))), project);
  const tile = D.tiles(project, "a");
  assert.ok(tile.total > 0 && tile.cuts > 0);
  assert.ok(D.ifc(project).includes("FILE_SCHEMA(('IFC2X3'))"));
  assert.ok(D.finishes(project)[0].area > 0);
  assert.throws(() => p({ design: { roof: { type: "invalid" } } }));
});
test("DXF parsing preserves units, layers, lines and polylines", () => {
  const text =
    "0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nLINE\n8\nWALLS\n10\n0\n20\n0\n11\n254\n21\n0\n0\nENDSEC\n0\nEOF\n";
  const d = D.dxfParse(text);
  assert.equal(d.entities[0].b.x, 10);
  assert.deepEqual(d.layers, ["WALLS"]);
  assert.throws(() => D.dxfParse("abc\n0\n"));
});

test("geometric constraints solve dependency chains and reject cycles and conflicting targets", () => {
  const project = p({
    planning: {
      walls: [0, 1, 2].map((i) => ({
        id: "w" + i,
        floor: 0,
        a: { x: 20, y: 20 + i * 30 },
        b: { x: 80 + i * 10, y: 20 + i * 30 },
        thickness: 4.5,
      })),
    },
    design: {
      constraints: [
        { kind: "equal-length", source: "w1", target: "w2" },
        { kind: "equal-length", source: "w0", target: "w1" },
      ],
    },
  });
  const solved = P.solveConstraints(project);
  assert.equal(
    M.distance(solved.planning.walls[2].a, solved.planning.walls[2].b),
    60,
  );
  project.design.constraints.push({
    kind: "equal-length",
    source: "w2",
    target: "w0",
  });
  assert.throws(() => P.solveConstraints(project), /Cyclic/);
  project.design.constraints = [
    { kind: "parallel", source: "w0", target: "w1" },
    { kind: "perpendicular", source: "w0", target: "w1" },
  ];
  assert.throws(() => P.solveConstraints(project), /Conflicting/);
});
test("sampled access routes honor door gaps, turning circles and room level transitions", () => {
  const project = p({
    plot: { inW: "300", inH: "180" },
    elements: [room("a", 20, 20, 120, 120), room("b", 140, 20, 120, 120)],
    fixtures: [
      {
        id: "door",
        type: "door",
        roomId: 0,
        edge: "right",
        offset: 30,
        size: 60,
      },
    ],
    design: { roomProperties: { a: { level: 0 }, b: { level: 2 } } },
  });
  const route = D.route(project, { x: 80, y: 80 }, { x: 200, y: 80 }, 30, {
    turn: 60,
    maxStep: 0.5,
  });
  assert.ok(route.found);
  assert.ok(route.turning.length);
  assert.equal(route.levels.length, 1);
  project.fixtures = [];
  assert.equal(
    D.route(project, { x: 80, y: 80 }, { x: 200, y: 80 }, 30).found,
    false,
  );
});
test("DXF unsupported entities are reported and bulges are never flattened silently", () => {
  const d = D.dxfParse(
    "0\nSECTION\n2\nENTITIES\n0\nARC\n8\nA\n0\nLWPOLYLINE\n10\n0\n20\n0\n42\n1\n10\n20\n20\n0\n0\nENDSEC\n0\nEOF\n",
  );
  assert.equal(d.unsupported.ARC, 1);
  assert.equal(d.unsupported["LWPOLYLINE with arcs"], 1);
  assert.equal(d.entities.length, 0);
});
test("wall cache invalidates in-place geometry changes", () => {
  const project = p({ elements: [room("a")] });
  const before = P.walls(project);
  assert.equal(P.walls(project), before);
  project.elements[0].w = 150;
  assert.notEqual(P.walls(project), before);
});
