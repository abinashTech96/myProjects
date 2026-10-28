const fs = require("node:fs"),
  path = require("node:path");
require("../js/project-model.js");
require("../js/planning-model.js");
require("../js/design-model.js");
require("../js/workbench-model.js");
require("../js/workbench-building.js");
require("../js/workbench-ifc.js");
const W = WorkbenchModel,
  P = ProjectModel,
  out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
for (const roof of ["flat", "gable", "hip", "shed"]) {
  let p = P.normalize({
    floorCount: 2,
    plot: { inW: "600", inH: "600" },
    elements: [
      { id: "a", type: "bedroom", x: 20, y: 20, w: 200, h: 200, floor: 0 },
      { id: "b", type: "bedroom", x: 20, y: 20, w: 200, h: 200, floor: 1 },
    ],
    fixtures: [
      { id: "d", type: "door", roomId: 0, edge: "top", offset: 30, size: 36 },
      {
        id: "w",
        type: "window",
        roomId: 1,
        edge: "left",
        offset: 30,
        size: 48,
      },
    ],
    design: {
      roof: { type: roof, rise: 36, overhang: 12 },
      workbench: {
        levels: [
          { id: "l0", floor: 0, base: -24, height: 144 },
          { id: "l1", floor: 1, base: 120, height: 132 },
        ],
        voids: [
          {
            id: "v",
            from: 0,
            to: 1,
            points: [
              { x: 100, y: 100 },
              { x: 140, y: 100 },
              { x: 140, y: 140 },
              { x: 100, y: 140 },
            ],
          },
        ],
        assemblies: [
          {
            id: "brick",
            name: "Plastered masonry",
            layers: [
              { material: "Brick", thickness: 8, rate: 0, waste: 0 },
              { material: "Plaster", thickness: 1, rate: 0, waste: 0 },
            ],
          },
        ],
        structure: [
          {
            id: "c",
            kind: "column",
            floor: 0,
            x: 20,
            y: 20,
            w: 12,
            h: 12,
            height: 144,
          },
          {
            id: "beam",
            kind: "beam",
            floor: 0,
            x: 20,
            y: 20,
            w: 200,
            h: 12,
            height: 18,
            base: 126,
          },
        ],
        interiors: [
          {
            id: "bath",
            room: "a",
            kind: "bathroom",
            items: [
              {
                id: "wc",
                type: "toilet",
                x: 40,
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
  });
  p = W.assignAssembly(p, [P.walls(p)[0].id], "brick");
  fs.writeFileSync(path.join(out, roof + ".ifc"), W.ifc(p));
  // An L-shaped occupied storey plus a disconnected island and empty upper
  // floor catches plot-sized roofs and incorrect top-floor containment.
  p.floorCount=3;
  p.design.roof.thickness=roof==='flat'?8:6;
  p.elements.push(
    {id:"wing",type:"bedroom",x:220,y:20,w:100,h:80,floor:1},
    {id:"island",type:"bedroom",x:400,y:20,w:80,h:80,floor:1},
  );
  p=P.normalize(p);
  fs.writeFileSync(path.join(out, "irregular-" + roof + ".ifc"), W.ifc(p));
}
