/* Portable files, projected drawings, and shared export geometry. */
const DesignIO = {
  csv(rows, name) {
    const data = rows
      .map((r) =>
        r.map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(","),
      )
      .join("\n");
    NavActionEngine.downloadBlob(data, name, "text/csv");
  },
  finishesCSV() {
    this.csv(
      [
        [
          "Room",
          "Floor",
          "Floor finish",
          "Wall finish",
          "Ceiling finish",
          "Skirting finish",
          "Clear sqft",
          "Perimeter ft",
        ],
        ...DesignModel.finishes(ProjectState.capture()).map((r) => [
          r.name,
          r.floor,
          r.floorFinish,
          r.wall,
          r.ceiling,
          r.skirting,
          r.area,
          r.perimeter,
        ]),
      ],
      "ArchCAD_Finishes.csv",
    );
  },
  openingsCSV() {
    this.csv(
      [
        [
          "Tag",
          "Floor",
          "Room",
          "Type",
          "Width in",
          "Height in",
          "Sill in",
          "Style",
          "Hinge",
          "Swing",
          "Arch rise in",
        ],
        ...fixtures.map((f) => [
          f.tag || f.id,
          elements[f.roomId].floor,
          elements[f.roomId].customName || elements[f.roomId].type,
          f.type,
          f.size,
          f.height,
          f.sill,
          f.style,
          f.handing,
          f.swing,
          f.arch || 0,
        ]),
      ],
      "ArchCAD_Openings.csv",
    );
  },
  svg() {
    NavActionEngine.downloadBlob(
      DrawingExport.svg(currentFloor),
      "ArchCAD_Floor_" + currentFloor + ".svg",
      "image/svg+xml",
    );
  },
  ifc() {
    NavActionEngine.downloadBlob(
      DesignModel.ifc(ProjectState.capture()),
      "ArchCAD_Coordination.ifc",
      "application/x-step",
    );
  },
  package() {
    PlanningUI.run(() => {
      const p = ProjectModel.normalize(ProjectState.capture()),
        files = {
          "project.json": fflate.strToU8(JSON.stringify(p, null, 2)),
          "manifest.json": fflate.strToU8(
            JSON.stringify(
              {
                format: "archcad-package",
                version: 1,
                createdAt: new Date().toISOString(),
                name: p.name,
                units: "inches",
                floorCount: p.floorCount,
              },
              null,
              2,
            ),
          ),
          "coordination.ifc": fflate.strToU8(DesignModel.ifc(p)),
        };
      for (let f = 0; f < p.floorCount; f++)
        files[`drawings/floor-${f}.svg`] = fflate.strToU8(DrawingExport.svg(f));
      files["schedules/finishes.json"] = fflate.strToU8(
        JSON.stringify(DesignModel.finishes(p), null, 2),
      );
      files["schedules/openings.json"] = fflate.strToU8(
        JSON.stringify(p.fixtures, null, 2),
      );
      files["schedules/quantities.json"] = fflate.strToU8(
        JSON.stringify(PlanningModel.quantities(p), null, 2),
      );
      for (const u of p.planning.underlays) {
        const mime = u.data.match(/^data:image\/(\w+);base64,/)[1],
          binary = atob(u.data.split(",")[1]);
        files[`underlays/${u.id}.${mime === "jpeg" ? "jpg" : mime}`] =
          Uint8Array.from(binary, (c) => c.charCodeAt(0));
      }
      NavActionEngine.downloadBlob(
        fflate.zipSync(files, { level: 6 }),
        "ArchCAD_Project_Package.zip",
        "application/zip",
      );
    });
  },
  async importPackage(file) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw Error("ZIP must be below 20 MB");
      let total = 0;
      const entries = fflate.unzipSync(
        new Uint8Array(await file.arrayBuffer()),
        {
          filter: (e) => {
            total += e.originalSize;
            if (total > 30 * 1024 * 1024 || e.originalSize > 12 * 1024 * 1024)
              throw Error("Package decompression limit exceeded");
            if (e.name.includes("..") || e.name.startsWith("/"))
              throw Error("Unsafe package path");
            return ["project.json", "manifest.json"].includes(e.name);
          },
        },
      );
      if (!entries["project.json"] || !entries["manifest.json"])
        throw Error("Package requires project and manifest files");
      const m = JSON.parse(fflate.strFromU8(entries["manifest.json"]));
      if (m.format !== "archcad-package" || m.version !== 1)
        throw Error("Unsupported project package");
      const p = ProjectModel.normalize(
        JSON.parse(fflate.strFromU8(entries["project.json"])),
      );
      await StorageEngine.snapshot("Before package import");
      ProjectState.apply(p, { rebase: true });
      StorageEngine.markDirty();
      AppEvents.triggerStateChange();
      StudioUI.message("Project package loaded.");
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  async readDXF(file) {
    if (!file) return;
    this.pendingDXF = null;
    try {
      const parsed = DesignModel.dxfParse(await file.text());
      this.pendingDXF = parsed;
      document.getElementById("dxf-layers").innerHTML = parsed.layers
        .map(
          (l, i) =>
            `<label>${ProjectModel.escapeHTML(l)}<select class="dxf-map" data-index="${i}"><option value="wall">Walls</option><option value="guide">Construction guides</option><option value="annotation">Annotations</option><option value="ignore">Ignore</option></select></label>`,
        )
        .join("");
      if (!parsed.entities.length)
        throw Error(
          "No supported entities found. Unsupported: " +
            Object.keys(parsed.unsupported).join(", "),
        );
      const pts = parsed.entities.flatMap((e) =>
          e.a ? [e.a, e.b] : e.points || [{ x: e.x, y: e.y }],
        ),
        minX = Math.min(...pts.map((p) => p.x)),
        minY = Math.min(...pts.map((p) => p.y)),
        maxX = Math.max(...pts.map((p) => p.x)),
        maxY = Math.max(...pts.map((p) => p.y));
      document.getElementById("dxf-preview").innerHTML =
        `<p>${parsed.entities.length} supported entities · ${parsed.layers.length} layers · ${parsed.units === 0 ? "Unitless: assumes inches" : `INSUNITS ${parsed.units}`}</p><svg class="planning-preview" viewBox="${minX - 10} ${minY - 10} ${Math.max(20, maxX - minX + 20)} ${Math.max(20, maxY - minY + 20)}">${parsed.entities
          .filter((e) => e.a)
          .map(
            (e) =>
              `<line x1="${e.a.x}" y1="${e.a.y}" x2="${e.b.x}" y2="${e.b.y}" stroke="#38bdf8"/>`,
          )
          .join(
            "",
          )}</svg><p>Import moves the minimum drawing coordinate to (20,20) inches. Unsupported entities excluded: ${ProjectModel.escapeHTML(
          Object.entries(parsed.unsupported)
            .map(([type, n]) => `${type} (${n})`)
            .join(", ") || "none",
        )}.</p>`;
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  applyDXF() {
    PlanningUI.run(() => {
      const d = this.pendingDXF;
      if (!d) throw Error("Choose a DXF first");
      const scale = PlanningUI.num("dxf-scale");
      if (scale <= 0 || scale > 10000) throw Error("Invalid scale");
      const maps = Object.fromEntries(
          [...document.querySelectorAll(".dxf-map")].map((e) => [
            d.layers[e.dataset.index],
            e.value,
          ]),
        ),
        pts = d.entities.flatMap((e) =>
          e.a ? [e.a, e.b] : e.points || [{ x: e.x, y: e.y }],
        ),
        minX = Math.min(...pts.map((p) => p.x)),
        minY = Math.min(...pts.map((p) => p.y)),
        map = (p) => ({
          x: (p.x - minX) * scale + 20,
          y: (p.y - minY) * scale + 20,
        });
      DesignUI.commit("Imported DXF layers", () => {
        for (const e of d.entities) {
          const layer = maps[e.layer];
          if (layer === "ignore") continue;
          const id = ProjectModel.uid();
          if (layer === "annotation" || e.type === "TEXT") {
            const q = map(e.a || e.points?.[0] || e);
            PlanningUI.data.annotations.push({
              id,
              floor: currentFloor,
              kind: "note",
              ...q,
              text: e.text || e.layer,
            });
            continue;
          }
          let ps = e.a ? [e.a, e.b] : e.points;
          if (e.type === "CIRCLE") {
            ps = Array.from({ length: 33 }, (_, i) => ({
              x: e.x + Math.cos((i * Math.PI) / 16) * e.r,
              y: e.y + Math.sin((i * Math.PI) / 16) * e.r,
            }));
          }
          if (!ps?.length) continue;
          const segments = ps
            .slice(1)
            .map((b, i) => ({ a: map(ps[i]), b: map(b) }));
          if (e.closed) segments.push({ a: map(ps.at(-1)), b: map(ps[0]) });
          for (const s of segments)
            if (PlanningModel.distance(s.a, s.b) >= 1) {
              if (layer === "guide")
                DesignUI.data.guides.push({
                  id: ProjectModel.uid(),
                  floor: currentFloor,
                  ...s,
                });
              else
                PlanningUI.data.walls.push({
                  id: ProjectModel.uid(),
                  floor: currentFloor,
                  thickness: ProjectState.meta.wallSettings.internal,
                  ...s,
                });
            }
        }
      });
      document.getElementById("studio-dialog").close();
    });
  },
  projectedElevation(p, side) {
    const vertical = ["front", "back"].includes(side),
      axis = vertical ? "x" : "y",
      depth = vertical ? "y" : "x",
      span = ProjectModel.inches(p.plot[vertical ? "inW" : "inH"], p.unit),
      height = p.wallSettings.height,
      top =
        typeof WorkbenchModel !== "undefined"
          ? WorkbenchModel.floorBase(p, p.floorCount - 1) +
            WorkbenchModel.floorHeight(p, p.floorCount - 1)
          : height * p.floorCount,
      low =
        typeof WorkbenchModel !== "undefined"
          ? Math.min(
              0,
              ...Array.from({ length: p.floorCount }, (_, f) =>
                WorkbenchModel.floorBase(p, f),
              ),
            )
          : 0,
      total = top - low,
      roof = p.design.roof,
      reverse = ["back", "right"].includes(side);
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-25 ${-roof.rise - 25} ${span + 50} ${total + roof.rise + 60}"><rect x="-25" y="${-roof.rise - 25}" width="${span + 50}" height="${total + roof.rise + 60}" fill="white"/>`;
    const walls = ProjectModel.walls(p),
      sign = ["front", "left"].includes(side) ? 1 : -1;
    for (let f = 0; f < p.floorCount; f++) {
      const candidates = walls.filter(
          (w) => w.floor === f && Math.abs(w.b[axis] - w.a[axis]) > 0.001,
        ),
        breaks = [
          ...new Set(
            candidates.flatMap((w) => [
              w.a[axis],
              w.b[axis],
              ...w.openings.flatMap((o) => [
                PlanningDrawing.point(w, o.start)[axis],
                PlanningDrawing.point(w, o.end)[axis],
              ]),
            ]),
          ),
        ].sort((a, b) => a - b);
      for (let i = 1; i < breaks.length; i++) {
        const lo = breaks[i - 1],
          hi = breaks[i],
          mid = (lo + hi) / 2,
          visible = candidates
            .filter(
              (w) =>
                mid >= Math.min(w.a[axis], w.b[axis]) &&
                mid <= Math.max(w.a[axis], w.b[axis]),
            )
            .map((w) => ({ w, t: (mid - w.a[axis]) / (w.b[axis] - w.a[axis]) }))
            .sort(
              (a, b) =>
                sign *
                (a.w.a[depth] +
                  (a.w.b[depth] - a.w.a[depth]) * a.t -
                  (b.w.a[depth] + (b.w.b[depth] - b.w.a[depth]) * b.t)),
            )[0];
        if (!visible) continue;
        const w = visible.w,
          x = reverse ? span - hi : lo,
          base = w.base ?? f * height,
          wallHeight = w.height ?? height,
          y = top - base - wallHeight;
        svg += `<rect x="${x}" y="${y}" width="${hi - lo}" height="${wallHeight}" fill="#e2e8f0" stroke="#64748b" stroke-width=".4"/>`;
        const at = visible.t * w.length;
        for (const o of w.openings.filter((o) => at >= o.start && at <= o.end))
          svg += `<rect x="${x}" y="${top - base - o.sill - o.height}" width="${hi - lo}" height="${o.height}" fill="${o.type === "window" ? "#bae6fd" : "#fff"}" stroke="#334155" stroke-width=".5"/>`;
      }
    }
    const y = 0;
    if (roof.type === "gable" || roof.type === "hip")
      svg += `<path d="M ${-roof.overhang} ${y} L ${span / 2} ${-roof.rise} L ${span + roof.overhang} ${y} Z" fill="#94a3b8" stroke="#334155"/>`;
    else if (roof.type === "shed")
      svg += `<path d="M ${-roof.overhang} 0 L ${-roof.overhang} ${-roof.rise} L ${span + roof.overhang} 0 Z" fill="#94a3b8" stroke="#334155"/>`;
    else
      svg += `<rect x="${-roof.overhang}" y="-4" width="${span + 2 * roof.overhang}" height="4" fill="#64748b"/>`;
    return (
      svg +
      `<text x="0" y="${total + 20}" font-size="8">${side} · external wall projection · drainage ${roof.drain}</text></svg>`
    );
  },
  section(p, a, b) {
    const len = PlanningModel.distance(a, b),
      height = p.wallSettings.height,
      top =
        typeof WorkbenchModel !== "undefined"
          ? WorkbenchModel.floorBase(p, p.floorCount - 1) +
            WorkbenchModel.floorHeight(p, p.floorCount - 1)
          : height * p.floorCount,
      low =
        typeof WorkbenchModel !== "undefined"
          ? Math.min(
              0,
              ...Array.from({ length: p.floorCount }, (_, f) =>
                WorkbenchModel.floorBase(p, f),
              ),
            )
          : 0,
      total = top - low,
      at = (q) => ((q.x - a.x) * (b.x - a.x) + (q.y - a.y) * (b.y - a.y)) / len;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -30 ${len + 40} ${total + 60}"><rect x="-20" y="-30" width="${len + 40}" height="${total + 60}" fill="white"/>`;
    for (const w of ProjectModel.walls(p)) {
      const q = DesignModel.intersection(a, b, w.a, w.b);
      if (!q) continue;
      const x = at(q),
        distance = PlanningModel.distance(w.a, q),
        opens = w.openings
          .filter((o) => distance >= o.start && distance <= o.end)
          .sort((a, b) => a.sill - b.sill);
      let bottom = 0;
      const band = (lo, hi) => {
        if (hi > lo)
          svg += `<rect x="${x - w.thickness / 2}" y="${top - (w.base ?? w.floor * height) - hi}" width="${w.thickness}" height="${hi - lo}" fill="#334155"/>`;
      };
      for (const o of opens) {
        band(bottom, o.sill);
        bottom = Math.max(bottom, o.sill + o.height);
      }
      band(bottom, w.height ?? height);
    }
    for (let f = 0; f <= p.floorCount; f++) {
      const datum =
        f === p.floorCount
          ? top
          : typeof WorkbenchModel !== "undefined"
            ? WorkbenchModel.floorBase(p, f)
            : f * height;
      svg += `<line x1="0" y1="${top - datum}" x2="${len}" y2="${top - datum}" stroke="#64748b"/>`;
    }
    for (const c of p.design.ceilings) {
      const ps = PlanningModel.points(c),
        cuts = ps
          .map((q, i) =>
            DesignModel.intersection(a, b, q, ps[(i + 1) % ps.length]),
          )
          .filter(Boolean)
          .map(at)
          .sort((a, b) => a - b);
      if (cuts.length >= 2)
        svg += `<rect x="${cuts[0]}" y="${top - (typeof WorkbenchModel !== "undefined" ? WorkbenchModel.floorBase(p, c.floor) : c.floor * height) - c.height}" width="${cuts.at(-1) - cuts[0]}" height="3" fill="#0284c7"/>`;
    }
    return (
      svg +
      `<text x="0" y="${total + 18}" font-size="8">Section · length ${len.toFixed(1)} in · ceiling zones blue</text></svg>`
    );
  },
  composedSheets() {
    PlanningUI.run(() => {
      const p = ProjectState.capture(),
        sheets = p.design.sheets.length
          ? p.design.sheets
          : [
              {
                title: "Drawing set",
                paper: "A3",
                scale: 50,
                floor: currentFloor,
                views: ["plan", "front", "section", "schedule", "legend"],
                section: [
                  { x: 0, y: 200 },
                  { x: ProjectModel.inches(p.plot.inW, p.unit), y: 200 },
                ],
              },
            ];
      const out = sheets.map((s) => {
        const options = { ...DrawingExport.options, denominator: s.scale },
          views = s.views
            .map((v) => {
              let html = "";
              if (v === "plan" || v === "ceiling") {
                html = DrawingExport.svg(s.floor, options);
                if (v === "ceiling")
                  html = html.replace(
                    "</svg>",
                    p.design.ceilings
                      .filter((c) => c.floor === s.floor)
                      .map(
                        (c) =>
                          `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="#7dd3fc" fill-opacity=".15" stroke="#0284c7" stroke-dasharray="4 3"/><text x="${c.x + 4}" y="${c.y + 10}" font-size="7">${ProjectModel.escapeHTML(c.label)} · ${c.height} in</text>`,
                      )
                      .join("") + "</svg>",
                  );
              } else if (["front", "back", "left", "right"].includes(v))
                html = this.projectedElevation(p, v);
              else if (v === "section") {
                html = s.section
                  .slice(1)
                  .map((b, i) => this.section(p, s.section[i], b))
                  .join("");
              } else if (v === "schedule")
                html = `<table><tr><th>Room</th><th>Clear sq ft</th><th>Finish</th></tr>${DesignModel.finishes(
                  p,
                )
                  .filter((r) => r.floor === s.floor)
                  .map(
                    (r) =>
                      `<tr><td>${ProjectModel.escapeHTML(r.name)}</td><td>${r.area.toFixed(1)}</td><td>${ProjectModel.escapeHTML(r.floorFinish || "")}</td></tr>`,
                  )
                  .join("")}</table>`;
              else
                html =
                  "<p>Walls grey · windows blue · service references and revision annotations follow the plan. Units: inches internally. Print at actual size for scaled plan views.</p>";
              return `<div style="border:1px solid #94a3b8;padding:5mm;break-inside:avoid"><h3>${v}</h3>${html}</div>`;
            })
            .join("");
        const width =
            (ProjectModel.inches(p.plot.inW, p.unit) * 25.4) / s.scale,
          available = ((s.paper === "A4" ? 273 : 396) - 5) / 2 - 10;
        return {
          title: s.title,
          paper: s.paper,
          html: `${width > available ? "<p>Preflight: plan width exceeds its two-column viewport width at this scale.</p>" : ""}<div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm">${views}</div>`,
        };
      });
      PlanningDrawing.openSheets(p, out);
    });
  },
  add3D() {
    if (!Engine3D.buildingGroup) return;
    const p = ProjectState.capture(),
      { SCALE, I, WALL_HEIGHT } = get3DEnvironmentParams(),
      group = new THREE.Group();
    group.name = "Design overlays";
    group.userData = { designObject: true, floor: p.floorCount - 1 };
    const w = ProjectModel.inches(p.plot.inW, p.unit),
      h = ProjectModel.inches(p.plot.inH, p.unit),
      r = p.design.roof,
      o = r.overhang,
      rise = r.rise;
    const vertices =
      r.type === "gable"
        ? [
            [-o, -o, 0],
            [w / 2, -o, rise],
            [w + o, -o, 0],
            [-o, h + o, 0],
            [w / 2, h + o, rise],
            [w + o, h + o, 0],
          ]
        : r.type === "hip"
          ? [
              [-o, -o, 0],
              [w + o, -o, 0],
              [w + o, h + o, 0],
              [-o, h + o, 0],
              [w / 2, h / 2, rise],
            ]
          : [
              [-o, -o, r.type === "shed" ? rise : 0],
              [w + o, -o, 0],
              [w + o, h + o, 0],
              [-o, h + o, r.type === "shed" ? rise : 0],
            ];
    const indices =
        r.type === "gable"
          ? [0, 1, 3, 1, 4, 3, 1, 2, 4, 2, 5, 4]
          : r.type === "hip"
            ? [0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]
            : [0, 1, 2, 0, 2, 3],
      geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        indices.flatMap((i) => {
          const [x, z, y] = vertices[i];
          return [
            I.x + x * SCALE,
            p.floorCount * WALL_HEIGHT + y * SCALE,
            I.z + z * SCALE,
          ];
        }),
        3,
      ),
    );
    geometry.computeVertexNormals();
    const roof = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0x64748b,
        side: THREE.DoubleSide,
      }),
    );
    roof.userData = { isRoof: true, floor: p.floorCount - 1 };
    group.add(roof);
    for (const c of p.design.ceilings) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(c.w * SCALE, 2 * SCALE, c.h * SCALE),
        new THREE.MeshStandardMaterial({
          color: 0x7dd3fc,
          opacity: 0.35,
          transparent: true,
        }),
      );
      mesh.position.set(
        I.x + (c.x + c.w / 2) * SCALE,
        c.floor * WALL_HEIGHT + c.height * SCALE,
        I.z + (c.y + c.h / 2) * SCALE,
      );
      mesh.userData = { floor: c.floor, isCeiling: true };
      group.add(mesh);
    }
    for (const n of p.design.neighbours) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(n.w * SCALE, n.height * SCALE, n.h * SCALE),
        new THREE.MeshStandardMaterial({
          color: 0x475569,
          transparent: true,
          opacity: 0.4,
        }),
      );
      mesh.position.set(
        I.x + (n.x + n.w / 2) * SCALE,
        (n.height / 2) * SCALE,
        I.z + (n.y + n.h / 2) * SCALE,
      );
      mesh.userData = { isNeighbour: true, floor: 0 };
      group.add(mesh);
    }
    Engine3D.buildingGroup.add(group);
    Engine3D.needsRender = true;
  },
};
const designElevation = PlanningDrawing.elevation;
PlanningDrawing.elevation = function (p, side = "front", cut = null) {
  return cut === null
    ? DesignIO.projectedElevation(p, side)
    : DesignIO.section(
        p,
        { x: 0, y: cut },
        { x: ProjectModel.inches(p.plot.inW, p.unit), y: cut },
      );
};
const designOldGenerate = generate3DModel;
generate3DModel = function () {
  const before = Engine3D.modelSignature;
  designOldGenerate();
  if (!Engine3D.buildingGroup) return;
  const signature = JSON.stringify(ProjectState.meta.design);
  if (
    Engine3D.designSignature !== signature ||
    before !== Engine3D.modelSignature
  ) {
    Engine3D.designSignature = signature;
    Engine3D.buildingGroup.children
      .filter((o) => o.userData.designObject)
      .forEach((o) => {
        Engine3D.buildingGroup.remove(o);
        o.traverse((c) => {
          c.geometry?.dispose();
          if (
            c.material &&
            !Object.values(SOLID_MAT_CACHE).includes(c.material)
          )
            c.material.dispose();
        });
      });
    if (elements.length) DesignIO.add3D();
  }
};
// Keep roof selection a single source: the design roof replaces the generic roof only when configured.
const designBuildRoof = build3DRoof;
build3DRoof = function (...args) {
  if (ProjectState.meta.design?.roof?.type !== "flat") return;
  return designBuildRoof(...args);
};
const designExportDialog = StudioUI.exportDialog;
document.addEventListener("DOMContentLoaded", () => {
  const previous = StudioUI.exportDialog;
  StudioUI.exportDialog = function () {
    previous.call(this);
    document
      .querySelector("#studio-dialog .studio-dialog-body")
      .insertAdjacentHTML(
        "beforeend",
        StudioUI.button("Project ZIP / SVG / IFC", "DesignUI.exportDialog()"),
      );
  };
});
const designArchFixtures = build3DFixtures;
build3DFixtures = function (SCALE, I, WALL_HEIGHT, real) {
  designArchFixtures(SCALE, I, WALL_HEIGHT, real);
  for (const f of fixtures.filter((f) => f.arch > 0)) {
    const group = Engine3D.buildingGroup.children.find(
      (g) => g.userData.openingId === f.id,
    );
    if (!group) continue;
    group.children.slice().forEach((c) => {
      group.remove(c);
      c.traverse((o) => o.geometry?.dispose());
    });
    const width = f.size * SCALE,
      height = f.height * SCALE,
      rise = f.arch * SCALE,
      frame = 2 * SCALE,
      mat = getCachedSolidMaterial(0x334155, 1),
      panelmat = getCachedSolidMaterial(
        f.type === "window" ? 0x7dd3fc : 0x94623a,
        f.type === "window" ? 0.4 : 1,
      ),
      top = (x) =>
        height -
        rise +
        rise * Math.sqrt(Math.max(0, 1 - (x / (width / 2)) ** 2)),
      shape = new THREE.Shape();
    shape.moveTo(-width / 2 + frame, 0);
    shape.lineTo(width / 2 - frame, 0);
    for (let i = 0; i <= 24; i++) {
      const x = width / 2 - frame - ((width - 2 * frame) * i) / 24;
      shape.lineTo(x, top(x) - frame);
    }
    shape.closePath();
    if (f.style !== "open") {
      const panel = new THREE.Mesh(new THREE.ShapeGeometry(shape), panelmat);
      panel.material.side = THREE.DoubleSide;
      group.add(panel);
    }
    for (let i = 0; i < 24; i++) {
      const x1 = -width / 2 + (width * i) / 24,
        x2 = -width / 2 + (width * (i + 1)) / 24,
        y1 = top(x1),
        y2 = top(x2),
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(Math.hypot(x2 - x1, y2 - y1), frame, 2 * SCALE),
          mat,
        );
      mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
      mesh.rotation.z = Math.atan2(y2 - y1, x2 - x1);
      group.add(mesh);
    }
    for (const sign of [-1, 1]) {
      const side = new THREE.Mesh(
        new THREE.BoxGeometry(frame, height - rise, 2 * SCALE),
        mat,
      );
      side.position.set(sign * (width / 2 - frame / 2), (height - rise) / 2, 0);
      group.add(side);
    }
    group.traverse((c) => {
      if (c.isMesh) c.userData = { ...group.userData, isRoom: true };
    });
  }
};
