const test = require("node:test"),
  assert = require("node:assert/strict");
require("../js/project-model.js");
require("../js/planning-model.js");
require("../js/design-model.js");
const W = require("../js/workbench-model.js");
require("../js/workbench-building.js");
require("../js/workbench-ifc.js");
const P = global.ProjectModel,
  M = global.PlanningModel,
  D = global.DesignModel;
const room = (id, x = 20, y = 20, w = 144, h = 144, floor = 0) => ({
    id,
    type: "bedroom",
    x,
    y,
    w,
    h,
    floor,
  }),
  project = (raw) =>
    P.normalize({
      elements: [],
      fixtures: [],
      plot: { inW: "600", inH: "600" },
      ...raw,
    });
test("workbench files round trip and reject malformed geometry, references and embedded resources", () => {
  const p = project({ elements: [room("a")] });
  assert.deepEqual(P.normalize(JSON.parse(JSON.stringify(p))), p);
  assert.throws(() =>
    project({
      design: {
        workbench: {
          site: {
            boundary: [
              { x: 0, y: 0 },
              { x: 100, y: 100 },
              { x: 0, y: 100 },
              { x: 100, y: 0 },
            ],
            setback: 0,
          },
        },
      },
    }),
  );
  assert.throws(() =>
    project({
      design: {
        workbench: {
          assets: [{ id: "a", data: "https://example.com/model.glb" }],
        },
      },
    }),
  );
});
test("moving one wall face preserves the opposite face and updates thickness atomically", () => {
  const p = project({ elements: [room("a")] }),
    wall = P.walls(p).find((w) => w.horizontal && w.a.y === 20),
    oldFixed = wall.a.y - wall.thickness / 2,
    n = W.faceEdit(p, wall.id, 2, "face", "left"),
    moved = P.walls(n).find(
      (w) =>
        w.horizontal && Math.abs(w.length - wall.length) < 0.01 && w.a.y < 30,
    );
  assert.ok(Math.abs(moved.a.y - moved.thickness / 2 - oldFixed) < 0.001);
  assert.equal(moved.thickness, 11);
  assert.equal(p.elements[0].y, 20);
  assert.throws(() => W.faceEdit(p, wall.id, -20, "face", "left"));
});
test("wall assembly quantities deduct openings and preserve material layers", () => {
  let p = project({
    elements: [room("a")],
    fixtures: [
      { id: "d", type: "door", roomId: 0, edge: "top", offset: 30, size: 36 },
    ],
    design: {
      workbench: {
        assemblies: [
          {
            id: "brick",
            name: "Brick",
            layers: [
              { material: "Brick", thickness: 8, rate: 10, waste: 5 },
              { material: "Plaster", thickness: 1, rate: 20, waste: 10 },
            ],
          },
        ],
      },
    },
  });
  const wall = P.walls(p).find((w) => w.openings.length);
  p = W.assignAssembly(p, [wall.id], "brick");
  const rows = W.materialTakeoff(p);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].area, (144 * 120 - 36 * 80) / 144);
  assert.ok(rows[0].orderVolume > rows[0].volume && rows[0].cost > 0);
});
test("linked opening types propagate dimensions while keeping individual overrides and rejecting invalid fits", () => {
  let p = project({
    elements: [room("a")],
    fixtures: [
      { id: "d", type: "door", roomId: 0, edge: "top", offset: 30, size: 36 },
    ],
    design: {
      workbench: {
        openingTypes: [
          {
            id: "type",
            name: "D",
            kind: "door",
            width: 40,
            height: 84,
            sill: 0,
          },
        ],
      },
    },
  });
  p = W.applyOpeningType(p, "type", ["d"], ["size"]);
  assert.equal(p.fixtures[0].size, 36);
  assert.equal(p.fixtures[0].height, 84);
  p = W.updateOpeningType(p, {
    ...p.design.workbench.openingTypes[0],
    height: 90,
  });
  assert.equal(p.fixtures[0].height, 90);
  const overridden = W.updateOpeningType(p, {
    ...p.design.workbench.openingTypes[0],
    width: 200,
    height: 90,
  });
  assert.equal(overridden.fixtures[0].size, 36);
  assert.throws(() =>
    W.updateOpeningType(p, {
      ...p.design.workbench.openingTypes[0],
      height: 200,
    }),
  );
});
test("irregular buildable polygons and setbacks use geometry rather than bounding rectangles", () => {
  const p = project({
    elements: [
      room("inside", 20, 20, 40, 40),
      room("outside", 200, 200, 40, 40),
    ],
    design: {
      workbench: {
        site: {
          boundary: [
            { x: 0, y: 0 },
            { x: 300, y: 0 },
            { x: 0, y: 300 },
          ],
          setback: 10,
          enforce: true,
        },
      },
    },
  });
  assert.equal(W.insideSite(p, p.elements[0]), true);
  assert.equal(W.insideSite(p, p.elements[1]), false);
  assert.equal(W.siteFindings(p).length, 1);
  assert.ok(D.geomArea(W.buildable(p)) < 45000);
});
test("floor datums, split levels and double-height openings affect area and height", () => {
  const p = project({
    floorCount: 2,
    elements: [room("ground"), room("upper", 20, 20, 144, 144, 1)],
    fixtures: [
      {
        id: "tall",
        type: "door",
        roomId: 1,
        edge: "top",
        offset: 20,
        size: 36,
        height: 130,
      },
    ],
    design: {
      workbench: {
        levels: [
          { id: "l0", floor: 0, base: -120, height: 120 },
          { id: "l1", floor: 1, base: 0, height: 150 },
        ],
        voids: [{ id: "void", from: 0, to: 1, points: W.rect(50, 50, 30, 30) }],
      },
    },
  });
  assert.equal(W.floorBase(p, 0), -120);
  assert.equal(W.floorHeight(p, 1), 150);
  assert.equal(p.fixtures[0].height, 130);
  assert.ok(D.clear(p, p.elements[1]).area < D.clear(p, p.elements[0]).area);
  assert.ok(M.quantities(p).total >= 0);
  assert.ok(W.slabGeometry(p, 0)[0].length > 1);
});
test("straight, L, U and winder stairs have the entered rise and explicit tread geometry", () => {
  for (const style of ["straight", "l-shape", "u-shape", "winder"]) {
    const g = W.stairs({
      style,
      width: 36,
      rise: 120,
      riser: 7.5,
      tread: 10,
      landing: 36,
      turnSteps: 3,
    });
    assert.equal(g.count, 16);
    assert.equal(g.treads.at(-1).top, 120);
    assert.ok(g.width > 0 && g.depth > 0 && g.walklineTread > 0);
    assert.ok(g.treads.every((t) => M.simple(t.points)));
  }
});
test("ramp run, alternating flights and landings preserve total rise", () => {
  const g = W.ramp({
    x: 20,
    y: 20,
    width: 36,
    rise: 24,
    ratio: 12,
    maxRun: 120,
    landing: 60,
  });
  assert.equal(g.run, 288);
  assert.equal(g.count, 3);
  assert.equal(g.flights.at(-1).z1, 24);
  assert.ok(g.landings.length >= 3);
});
test("structural grids generate aligned multi-floor columns and beams", () => {
  const p = W.structureGrid(project({ floorCount: 2 }), {
    xs: [20, 140],
    ys: [20, 140],
    floors: [0, 1],
    width: 12,
    depth: 12,
    beamDepth: 18,
  });
  assert.equal(
    p.design.workbench.structure.filter((s) => s.kind === "column").length,
    8,
  );
  assert.equal(W.structureChecks(p).length, 0);
});
test("bathroom and kitchen tools generate editable dimensioned items and detect fit failures", () => {
  const p = project({
      elements: [
        room("bath", 20, 20, 120, 144),
        room("kitchen", 180, 20, 240, 180),
      ],
    }),
    bath = W.bathroom(p, "bath"),
    kitchen = W.kitchen(p, "kitchen", { modules: 5, moduleWidth: 24 });
  assert.equal(bath.layout.items.length, 3);
  assert.ok(kitchen.cabinetCount > 0 && kitchen.counterArea > 0);
  bath.layout.items[0].x = -100;
  assert.ok(
    W.interiorChecks(p, bath.layout).some((f) => f.text.includes("boundary")),
  );
});
test("3D service clashes use elevation and detect wall crossings", () => {
  const p = project({
    elements: [room("a")],
    design: {
      workbench: {
        services3d: [
          {
            id: "a",
            name: "A",
            kind: "plumbing",
            floor: 0,
            diameter: 2,
            points: [
              { x: 30, y: 50, z: 30 },
              { x: 150, y: 50, z: 30 },
            ],
          },
          {
            id: "b",
            name: "B",
            kind: "electrical",
            floor: 0,
            diameter: 2,
            points: [
              { x: 80, y: 30, z: 30 },
              { x: 80, y: 150, z: 30 },
            ],
          },
          {
            id: "c",
            name: "C",
            kind: "electrical",
            floor: 0,
            diameter: 2,
            points: [
              { x: 80, y: 30, z: 80 },
              { x: 80, y: 150, z: 80 },
            ],
          },
        ],
      },
    },
  });
  const rows = W.serviceClashes(p);
  assert.ok(
    rows.some((r) => r.kind === "service" && r.a === "a" && r.b === "b"),
  );
  assert.ok(
    !rows.some((r) => r.kind === "service" && [r.a, r.b].includes("c")),
  );
});
test("terrain volume conserves flat-site cut and rainwater uses entered units", () => {
  const p = project({
    plot: { inW: "120", inH: "120" },
    design: {
      workbench: {
        site: { boundary: W.rect(0, 0, 120, 120), setback: 0, enforce: true },
        terrain: {
          points: [
            { x: 0, y: 0, z: 12 },
            { x: 120, y: 120, z: 12 },
          ],
          designLevel: 0,
          resolution: 10,
        },
        rain: {
          annualMm: 1000,
          eventMm: 100,
          efficiency: 0.8,
          tankLitres: 500,
          dailyLitres: 100,
          intensityMmHour: 50,
          pipeCapacityLps: 3,
        },
      },
    },
  });
  assert.ok(Math.abs(W.earthwork(p).cut - 100) < 0.001);
  const r = W.rainwater(p);
  assert.ok(Math.abs(r.annualLitres - 7432.2432) < 0.01);
  assert.equal(r.days, 5);
});
test("solar layout respects roof obstacles and reports installed capacity separately from entered yield", () => {
  const p = project({
      elements: [room("a", 20, 20, 400, 400)],
      design: {
        workbench: {
          solar: {
            width: 40,
            depth: 68,
            watts: 400,
            gap: 2,
            walkway: 24,
            angle: 0,
            tilt: 15,
            peakSunHours: 4,
            derate: 0.8,
            obstacles: [W.rect(80, 80, 100, 100)],
          },
        },
      },
    }),
    r = W.solarLayout(p);
  assert.ok(r.panels.length > 0);
  assert.equal(r.kw, r.panels.length * 0.4);
  assert.ok(
    r.panels.every(
      (panel) =>
        D.geomArea(
          require("../vendor/geometry/polygon-clipping.js").intersection(
            D.polygon(panel.points),
            D.polygon(W.rect(80, 80, 100, 100)),
          ),
        ) < 0.1,
    ),
  );
});
test("guillotine cutting reuses free rectangles without overlap and purchases round up to packs", () => {
  const r = W.cuts([{ w: 10, h: 10, qty: 4 }], { w: 24, h: 24, kerf: 0.125 });
  assert.equal(r.sheets.length, 1);
  assert.equal(r.sheets[0].pieces.length, 4);
  const p = project({
    design: {
      workbench: {
        procurement: [
          {
            id: "tile",
            material: "Tile",
            quantity: 100,
            pack: 16,
            rate: 50,
            waste: 10,
            supplier: "Quote A",
          },
        ],
      },
    },
  });
  const order = W.procurement(p)[0];
  assert.equal(order.packs, 7);
  assert.equal(order.ordered, 112);
  assert.equal(order.cost, 5600);
});
test("parameterized macros preview and reject locked targets or new overlaps", () => {
  const p = project({
      elements: [room("a", 20, 20, 60, 60), room("b", 120, 20, 60, 60)],
    }),
    macro = {
      actions: [{ op: "move", ids: [], selection: true, dx: "$dx", dy: "$dy" }],
    },
    next = W.macroApply(p, macro, { dx: 6, dy: 0 }, ["a"]);
  assert.equal(next.elements[0].x, 26);
  assert.equal(p.elements[0].x, 20);
  assert.throws(() => W.macroApply(p, macro, { dx: 100, dy: 0 }, ["a"]));
  p.elements[0].locked = true;
  assert.throws(() => W.macroApply(p, macro, { dx: 6, dy: 0 }, ["a"]));
});
test("linked assemblies update member geometry without changing existing member identities", () => {
  let p = project({
    elements: [room("source", 20, 20, 60, 60)],
    fixtures: [
      {
        id: "source-door",
        type: "door",
        roomId: 0,
        edge: "top",
        offset: 10,
        size: 36,
      },
    ],
  });
  const component = W.componentFrom(p, ["source"], "Module");
  p.design.workbench.components.push(component);
  p = W.placeComponent(p, component.id, 200, 20, 0);
  const instance = p.design.workbench.instances[0],
    id = instance.members[0].id,
    openingId = instance.fixtureMembers[0].id;
  component.elements[0].w = 72;
  p = W.updateComponent(p, component);
  assert.equal(p.design.workbench.instances[0].members[0].id, id);
  assert.equal(p.elements.find((e) => e.id === id).w, 72);
  assert.equal(p.design.workbench.instances[0].fixtureMembers[0].id, openingId);
});
test("IFC contains stable product GUIDs, actual void relationships, doors, slabs and materials", () => {
  const p = project({
      elements: [room("a")],
      fixtures: [
        { id: "d", type: "door", roomId: 0, edge: "top", offset: 20, size: 36 },
      ],
    }),
    a = W.ifc(p),
    b = W.ifc(p);
  assert.ok(
    a.includes("IFCRELVOIDSELEMENT") &&
      a.includes("IFCDOOR") &&
      a.includes("IFCSLAB") &&
      a.includes("IFCMATERIAL"),
  );
  const ids = (text) =>
    [...text.matchAll(/IFC(?:WALL|DOOR|SPACE)\('([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(ids(a), ids(b));
});

test("native room moves preserve owned fitouts and opening edits gain individual overrides", () => {
  const p = project({
      elements: [room("a")],
      fixtures: [
        { id: "d", type: "door", roomId: 0, edge: "top", offset: 30, size: 36 },
      ],
      design: {
        workbench: {
          openingTypes: [
            { id: "dt", kind: "door", width: 36, height: 80, sill: 0 },
          ],
          openingLinks: { d: { type: "dt", overrides: [] } },
          interiors: [
            {
              id: "bath",
              room: "a",
              kind: "bathroom",
              items: [
                {
                  id: "wc",
                  type: "toilet",
                  x: 30,
                  y: 40,
                  w: 24,
                  h: 28,
                  height: 30,
                },
              ],
            },
          ],
        },
      },
    }),
    n = W.clone(p);
  n.elements[0].x += 6;
  n.fixtures[0].size = 40;
  W.followNativeChanges(p, n);
  assert.equal(n.design.workbench.interiors[0].items[0].x, 36);
  assert.deepEqual(n.design.workbench.openingLinks.d.overrides, ["size"]);
  const moved = D.transformSelection(p, ["a"], (q) => ({
    x: q.x + 12,
    y: q.y + 6,
  }));
  assert.equal(moved.design.workbench.interiors[0].items[0].x, 42);
  assert.equal(moved.design.workbench.interiors[0].items[0].y, 46);
});
