/* Validated professional-workbench data and geometry. Internal lengths are inches. */
(function (root) {
  "use strict";
  const P = root.ProjectModel,
    M = root.PlanningModel,
    D = root.DesignModel,
    PC =
      root.polygonClipping ||
      (typeof require === "function"
        ? require("../vendor/geometry/polygon-clipping.js")
        : null);
  const clone = (v) => structuredClone(v),
    uid = () => P.uid(),
    finite = (v, label, min = -100000, max = 100000) =>
      P.finite(v, label, min, max),
    text = (v, n = 160) => String(v ?? "").slice(0, n),
    pt = (x, y) => ({ x, y }),
    box = (e) => D.polygon(M.points(e));
  const defaults = () => ({
    version: 1,
    site: { boundary: [], setback: 0, enforce: true },
    levels: [],
    assemblies: [],
    wallTypes: {},
    openingTypes: [],
    openingLinks: {},
    stairs: {},
    ramps: [],
    shafts: [],
    voids: [],
    structure: [],
    interiors: [],
    assets: [],
    components: [],
    instances: [],
    options: [],
    services3d: [],
    outdoors: [],
    terrain: { points: [], designLevel: 0, resolution: 20 },
    rain: {
      annualMm: 1200,
      eventMm: 50,
      efficiency: 0.8,
      tankLitres: 5000,
      dailyLitres: 500,
      intensityMmHour: 50,
      pipeCapacityLps: 3,
    },
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
      obstacles: [],
    },
    facade: { railHeight: 36 },
    fields: [],
    values: {},
    issues: [],
    markups: [],
    macros: [],
    measurements: [],
    procurement: [],
  });
  const baseDefaults = D.defaults;
  D.defaults = () => ({ ...baseDefaults(), workbench: defaults() });
  function validate(raw, p) {
    const w = { ...defaults(), ...clone(raw || {}) };
    if (w.version !== 1) throw Error("Unsupported workbench data version");
    for (const k of [
      "levels",
      "assemblies",
      "openingTypes",
      "ramps",
      "shafts",
      "voids",
      "structure",
      "interiors",
      "assets",
      "components",
      "instances",
      "options",
      "services3d",
      "outdoors",
      "fields",
      "issues",
      "markups",
      "macros",
      "measurements",
      "procurement",
    ]) {
      if (!Array.isArray(w[k]) || w[k].length > 2000)
        throw Error("Invalid workbench " + k);
      const seen = new Set();
      for (const r of w[k]) {
        if (!r || typeof r !== "object")
          throw Error("Invalid " + k + " record");
        r.id = r.id || uid();
        if (!/^[\w:-]{1,100}$/.test(r.id) || seen.has(r.id))
          throw Error("Invalid or duplicate " + k + " identity");
        seen.add(r.id);
        if (r.name !== undefined) r.name = text(r.name);
      }
    }
    for (const k of ["wallTypes", "openingLinks", "stairs", "values"])
      if (!w[k] || typeof w[k] !== "object" || Array.isArray(w[k]))
        throw Error("Invalid workbench " + k);
    const xy = (q) => {
      finite(q?.x, "X");
      finite(q?.y, "Y");
    };
    const polygon = (ps) => {
      if (
        !Array.isArray(ps) ||
        ps.length < 3 ||
        ps.length > 2000 ||
        !M.simple(ps)
      )
        throw Error("Use a simple polygon with at least three points");
      ps.forEach(xy);
    };
    const floor = (f) => {
      finite(f, "Floor", 0, p.floorCount - 1);
      if (!Number.isInteger(f)) throw Error("Floor must be an integer");
    };
    w.site = { ...defaults().site, ...w.site };
    finite(w.site.setback, "Setback", 0, 10000);
    w.site.enforce = !!w.site.enforce;
    if (w.site.boundary.length) polygon(w.site.boundary);
    for (const l of w.levels) {
      floor(l.floor);
      finite(l.base, "Floor elevation", -10000, 100000);
      finite(l.height, "Floor height", 24, 1200);
    }
    if (new Set(w.levels.map((l) => l.floor)).size !== w.levels.length)
      throw Error("Duplicate floor datum");
    for (const a of w.assemblies) {
      if (!Array.isArray(a.layers) || !a.layers.length || a.layers.length > 20)
        throw Error("An assembly needs 1–20 material layers");
      for (const l of a.layers) {
        l.material = text(l.material);
        finite(l.thickness, "Layer thickness", 0.01, 120);
        finite(l.rate ?? 0, "Material rate", 0, 1e8);
        finite(l.waste ?? 0, "Material waste", 0, 100);
      }
      if (a.layers.reduce((s, l) => s + l.thickness, 0) > 120)
        throw Error("Wall assembly is too thick");
    }
    for (const t of w.openingTypes) {
      if (!["door", "window"].includes(t.kind))
        throw Error("Invalid opening type");
      finite(t.width, "Opening type width", 1, 1000);
      finite(t.height, "Opening type height", 1, 1200);
      finite(t.sill ?? 0, "Opening type sill", 0, 1200);
    }
    for (const l of Object.values(w.openingLinks)) {
      if (
        !l ||
        typeof l.type !== "string" ||
        !Array.isArray(l.overrides) ||
        l.overrides.some(
          (k) =>
            !["size", "height", "sill", "style", "handing", "swing"].includes(
              k,
            ),
        )
      )
        throw Error("Invalid opening-type link");
    }
    for (const s of Object.values(w.stairs)) {
      if (!["straight", "l-shape", "u-shape", "winder"].includes(s.style))
        throw Error("Invalid stair style");
      for (const k of ["width", "rise", "riser", "tread", "landing"])
        finite(s[k], "Stair " + k, 1, 2000);
      finite(s.turnSteps ?? 3, "Winder steps", 3, 12);
    }
    for (const r of w.ramps) {
      floor(r.floor);
      xy(r);
      for (const k of ["width", "rise", "ratio", "maxRun", "landing"])
        finite(r[k], "Ramp " + k, 1, 10000);
    }
    for (const r of [...w.shafts, ...w.voids]) {
      floor(r.from);
      finite(r.to, "Upper floor", r.from + 1, p.floorCount);
      if (!Number.isInteger(r.to))
        throw Error("Upper floor must be an integer");
      if (r.kind && !["lift", "service"].includes(r.kind))
        throw Error("Invalid shaft kind");
      if (r.kind === "lift")
        finite(r.doorWidth ?? 36, "Lift door width", 1, r.w);
      if (r.points) polygon(r.points);
      else {
        xy(r);
        finite(r.w, "Shaft width", 1, 10000);
        finite(r.h, "Shaft depth", 1, 10000);
      }
    }
    for (const r of w.structure) {
      floor(r.floor);
      if (!["column", "beam", "slab"].includes(r.kind))
        throw Error("Invalid structural member");
      if (r.points) polygon(r.points);
      else {
        xy(r);
        finite(r.w, "Member width", 1, 10000);
        finite(r.h, "Member depth", 1, 10000);
      }
      finite(r.height, "Member height", 0.1, 10000);
      finite(r.base ?? 0, "Member base", -10000, 100000);
    }
    for (const room of w.interiors) {
      if (!p.elements.some((e) => e.id === room.room && !e.isFurniture))
        throw Error("Interior layout refers to a missing room");
      if (!Array.isArray(room.items) || room.items.length > 1000)
        throw Error("Too many interior items");
      for (const i of room.items) {
        i.id = i.id || uid();
        i.type = text(i.type, 50);
        xy(i);
        for (const k of ["w", "h", "height"])
          finite(i[k], "Interior " + k, 1, 10000);
        finite(i.base ?? 0, "Interior base", 0, 1200);
        finite(i.clearance ?? 0, "Interior clearance", 0, 120);
      }
    }
    let assetBytes = 0;
    for (const a of w.assets) {
      if (
        typeof a.data !== "string" ||
        !/^data:model\/gltf-binary;base64,[A-Za-z0-9+/=]+$/.test(a.data) ||
        a.data.length > 4.2e6
      )
        throw Error("Assets must be embedded GLB files below 3 MB");
      assetBytes += a.data.length;
      for (const k of ["w", "h", "depth"])
        finite(a[k], "Asset " + k, 0.01, 100000);
    }
    if (assetBytes > 8.4e6)
      throw Error("Embedded assets exceed the project budget");
    for (const c of w.components) {
      if (
        !Array.isArray(c.elements) ||
        !Array.isArray(c.fixtures) ||
        c.elements.length > 100
      )
        throw Error("Invalid component definition");
    }
    for (const i of w.instances) {
      if (
        !Array.isArray(i.members) ||
        i.members.length > 100 ||
        !w.components.some((c) => c.id === i.component)
      )
        throw Error("Invalid linked assembly");
    }
    if (w.options.length > 12) throw Error("Keep at most 12 design options");
    for (const o of w.options) {
      if (
        !o.project ||
        !Array.isArray(o.project.elements) ||
        !Array.isArray(o.project.fixtures)
      )
        throw Error("Invalid design option");
      if (o.project.design?.workbench?.options?.length)
        throw Error("Nested design options are not supported");
    }
    for (const s of w.services3d) {
      floor(s.floor);
      if (
        !["electrical", "plumbing", "ventilation"].includes(s.kind) ||
        !Array.isArray(s.points) ||
        s.points.length < 2 ||
        s.points.length > 1000
      )
        throw Error("Invalid 3D service route");
      for (const q of s.points) {
        xy(q);
        finite(q.z, "Service elevation", -10000, 100000);
      }
      finite(s.diameter, "Service diameter", 0.1, 120);
    }
    for (const o of w.outdoors) {
      if (
        ![
          "wall",
          "gate",
          "path",
          "garden",
          "tank",
          "sunshade",
          "rail",
        ].includes(o.kind)
      )
        throw Error("Invalid site object");
      polygon(o.points);
      finite(o.height, "Site object height", 0.1, 1200);
      finite(o.base ?? 0, "Site object base", -10000, 100000);
    }
    w.terrain = { ...defaults().terrain, ...w.terrain };
    if (!Array.isArray(w.terrain.points) || w.terrain.points.length > 10000)
      throw Error("Invalid survey points");
    for (const q of w.terrain.points) {
      xy(q);
      finite(q.z, "Survey height", -10000, 100000);
    }
    finite(w.terrain.designLevel, "Design ground level", -10000, 100000);
    finite(w.terrain.resolution, "Terrain sampling", 4, 80);
    w.rain = { ...defaults().rain, ...w.rain };
    for (const k of [
      "annualMm",
      "eventMm",
      "tankLitres",
      "dailyLitres",
      "intensityMmHour",
      "pipeCapacityLps",
    ])
      finite(w.rain[k], k, 0.001, 1e8);
    finite(w.rain.efficiency, "Collection efficiency", 0, 1);
    w.solar = { ...defaults().solar, ...w.solar };
    for (const k of ["width", "depth", "watts", "gap", "walkway"])
      finite(
        w.solar[k],
        "Solar " + k,
        k === "gap" || k === "walkway" ? 0 : 1,
        10000,
      );
    finite(w.solar.angle, "Panel angle", -360, 360);
    finite(w.solar.tilt, "Panel tilt", 0, 85);
    finite(w.solar.peakSunHours, "Entered sun hours", 0, 24);
    finite(w.solar.derate, "Solar derate", 0, 1);
    if (!Array.isArray(w.solar.obstacles) || w.solar.obstacles.length > 1000)
      throw Error("Invalid roof obstacles");
    w.solar.obstacles.forEach(polygon);
    w.facade = { ...defaults().facade, ...w.facade };
    finite(w.facade.railHeight, "Rail height", 1, 120);
    if (new Set(w.fields.map((f) => f.key)).size !== w.fields.length)
      throw Error("Duplicate custom field keys");
    for (const f of w.fields) {
      if (
        !/^[a-zA-Z][\w-]{0,60}$/.test(f.key) ||
        ["__proto__", "constructor", "prototype"].includes(f.key) ||
        !["text", "number", "date", "select"].includes(f.type)
      )
        throw Error("Invalid custom property");
      f.label = text(f.label);
      if (
        f.type === "select" &&
        (!Array.isArray(f.options) || f.options.length > 100)
      )
        throw Error("Invalid property choices");
    }
    for (const values of Object.values(w.values)) {
      if (!values || typeof values !== "object" || Array.isArray(values))
        throw Error("Invalid object properties");
      for (const [key, value] of Object.entries(values)) {
        const field = w.fields.find((f) => f.key === key);
        if (!field) throw Error("Unknown custom field " + key);
        if (field.type === "number") finite(value, field.label, -1e12, 1e12);
        else {
          if (typeof value !== "string" || value.length > 2000)
            throw Error("Invalid custom field value");
          if (
            field.type === "date" &&
            value &&
            !/^\d{4}-\d{2}-\d{2}$/.test(value)
          )
            throw Error("Invalid property date");
          if (field.type === "select" && !field.options.includes(value))
            throw Error("Invalid property choice");
        }
      }
    }
    for (const i of w.issues) validateIssue(i, p);
    for (const m of w.markups) validateMarkup(m, p);
    for (const macro of w.macros) {
      if (!Array.isArray(macro.actions) || macro.actions.length > 100)
        throw Error("Macros support 1–100 actions");
      for (const a of macro.actions) {
        if (
          !["move", "resize", "rotate", "property", "duplicate"].includes(
            a.op,
          ) ||
          !Array.isArray(a.ids) ||
          a.ids.length > 1000
        )
          throw Error("Invalid macro action");
        if (
          a.op === "property" &&
          !["customName", "material", "customColor"].includes(a.key)
        )
          throw Error("Unsupported macro property");
      }
    }
    for (const e of p.elements)
      if (e.assetId) {
        if (!w.assets.some((a) => a.id === e.assetId))
          throw Error("Furniture refers to a missing embedded model");
        finite(e.customHeight, "Furniture height", 1, 10000);
      }
    for (const m of w.measurements) {
      for (const q of [m.a, m.b]) {
        xy(q);
        finite(q.z, "Measurement level", -10000, 100000);
      }
    }
    for (const r of w.procurement) {
      r.material = text(r.material);
      for (const k of ["quantity", "rate", "waste"]) finite(r[k], k, 0, 1e12);
      finite(r.pack, "Purchase pack", 0.001, 1e8);
      r.supplier = text(r.supplier);
    }
    return w;
  }
  function validateIssue(i, p) {
    i.title = text(i.title, 300);
    i.description = text(i.description, 4000);
    i.assignee = text(i.assignee, 100);
    if (
      !i.title ||
      !["open", "in-progress", "resolved", "closed"].includes(i.status) ||
      !["low", "normal", "high", "urgent"].includes(i.priority)
    )
      throw Error("Invalid review issue");
    const a = i.anchor;
    if (
      !a ||
      !Number.isInteger(a.floor) ||
      a.floor < 0 ||
      a.floor >= p.floorCount
    )
      throw Error("Issue requires a valid floor");
    finite(a.x, "Issue X");
    finite(a.y, "Issue Y");
    if (i.due && !/^\d{4}-\d{2}-\d{2}$/.test(i.due))
      throw Error("Invalid issue due date");
    if (
      i.screenshot &&
      (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
        i.screenshot,
      ) ||
        i.screenshot.length > 2e6)
    )
      throw Error("Invalid issue screenshot");
    return i;
  }
  function validateMarkup(m, p) {
    if (
      !["pen", "arrow", "measure"].includes(m.kind) ||
      !Array.isArray(m.points) ||
      m.points.length < 2 ||
      m.points.length > 2000 ||
      !/^#[0-9a-f]{6}$/i.test(m.color)
    )
      throw Error("Invalid drawing markup");
    if (!Number.isInteger(m.floor) || m.floor < 0 || m.floor >= p.floorCount)
      throw Error("Invalid markup floor");
    m.points.forEach((q) => {
      finite(q.x, "Markup X");
      finite(q.y, "Markup Y");
    });
    m.label = text(m.label, 300);
    return m;
  }
  const baseNormalize = P.normalize;
  P.normalize = function (raw) {
    const levels = raw?.design?.workbench?.levels || [],
      defaultHeight = raw?.wallSettings?.height ?? 120,
      maxHeight = Math.max(
        defaultHeight,
        ...levels.map((l) => Number(l.height) || defaultHeight),
      );
    const p = baseNormalize(
      maxHeight > defaultHeight
        ? { ...raw, wallSettings: { ...raw.wallSettings, height: maxHeight } }
        : raw,
    );
    p.wallSettings.height = defaultHeight;
    p.design.workbench = validate(p.design.workbench, p);
    if(p.view.parapetConfig?.version===2 && root.ParapetModel)
      for(const edge of root.ParapetModel.edges(p)) root.ParapetModel.resolve(p.view.parapetConfig,edge);
    for (const f of p.fixtures) {
      if (f.sill + f.height > floorHeight(p, p.elements[f.roomId].floor))
        throw Error("Opening exceeds its floor height");
    }
    return p;
  };
  const data = (p) => p.design.workbench || defaults(),
    floorBase = (p, f) =>
      data(p).levels.find((l) => l.floor === f)?.base ??
      f * p.wallSettings.height,
    floorHeight = (p, f) =>
      data(p).levels.find((l) => l.floor === f)?.height ??
      p.wallSettings.height,
    roomBase = (p, e) =>
      floorBase(p, e.floor) + (p.design.roomProperties[e.id]?.level || 0);
  function boundary(p) {
    const w = data(p);
    if (w.site.boundary.length) return clone(w.site.boundary);
    const n = (k) => P.inches(p.plot[k], p.unit),
      a = n("inW"),
      b = n("inH");
    return [
      pt(-n("aL"), -n("aU")),
      pt(a + n("bR"), -n("bU")),
      pt(a + n("cR"), b + n("cD")),
      pt(-n("dL"), b + n("dD")),
    ];
  }
  function buildable(p) {
    const s = data(p).site,
      ps = boundary(p);
    return s.setback
      ? D.offsetPath(ps, -s.setback).map(D.polygon)
      : [D.polygon(ps)];
  }
  function insideSite(p, e) {
    return D.geomArea(PC.difference(box(e), buildable(p))) < 0.01;
  }
  function siteFindings(p) {
    return p.elements
      .filter((e) => !insideSite(p, e))
      .map((e) => ({
        id: e.id,
        floor: e.floor,
        code: "site-boundary",
        text: (e.customName || e.type) + " crosses the buildable site boundary",
        severity: "error",
        measured: "Outside setback polygon",
        target: "Inside buildable polygon",
      }));
  }
  const baseSolve = P.solveConstraints;
  P.solveConstraints = function (p) {
    const next = baseSolve(p);
    return next;
  };
  function diagnostics(p) {
    const rows = [],
      rules = p.design.constraints,
      visit = new Set(),
      done = new Set();
    const wallIds = new Set(p.planning.walls.map((w) => w.id)),
      ids = new Set([...wallIds, ...p.elements.map((e) => e.id)]),
      slots = new Map();
    for (const c of rules) {
      const related = [c.source, c.target];
      if (
        !ids.has(c.target) ||
        (c.kind !== "fixed-angle" && !ids.has(c.source))
      )
        rows.push({
          id: c.id,
          related,
          reason: "Missing reference or target",
          fix: "Remove this constraint or choose an existing object",
        });
      if (
        p.elements.find((e) => e.id === c.target)?.locked ||
        p.design.objectProperties[c.target]?.locked
      )
        rows.push({
          id: c.id,
          related,
          reason: "Target is locked",
          fix: "Unlock the target or remove this constraint",
        });
      const slot =
        c.target +
        ":" +
        (["parallel", "perpendicular", "fixed-angle"].includes(c.kind)
          ? "angle"
          : c.kind + ":" + (c.axis || "w"));
      if (slots.has(slot))
        rows.push({
          id: c.id,
          related,
          reason: "Multiple rules control the same target property",
          fix: "Keep one controlling rule",
        });
      slots.set(slot, c);
    }
    const walk = (id) => {
      if (visit.has(id)) {
        rows.push({
          related: [...visit, id],
          reason: "Constraint dependency cycle",
          fix: "Remove one rule in the highlighted chain",
        });
        return;
      }
      if (done.has(id)) return;
      visit.add(id);
      for (const c of rules.filter(
        (c) => c.target === id && c.kind !== "fixed-angle",
      ))
        walk(c.source);
      visit.delete(id);
      done.add(id);
    };
    rules.forEach((c) => walk(c.target));
    return rows;
  }
  function faceEdit(p, wallId, distance, mode = "centre", side = "left") {
    finite(distance, "Face movement", -120, 120);
    const w = P.walls(p).find((w) => w.id === wallId);
    if (!w) throw Error("Select an existing wall");
    if (
      w.owners.some(
        (o) => o.wallId && p.design.objectProperties[o.wallId]?.locked,
      )
    )
      throw Error("Unlock the wall");
    let next,
      thickness = w.thickness;
    if (mode === "centre") return D.moveWall(p, wallId, distance);
    const sign = side === "left" ? 1 : -1;
    if (mode === "face") {
      thickness += sign * distance;
      if (thickness < 0.5 || thickness > 120)
        throw Error("Resulting wall thickness must be 0.5–120 inches");
      next = D.moveWall(p, wallId, distance / 2);
    } else if (mode === "thickness") {
      thickness = distance;
      if (thickness < 0.5 || thickness > 120)
        throw Error("Enter a thickness of 0.5–120 inches");
      next = clone(p);
    } else throw Error("Unknown face operation");
    const moved = P.walls(next).filter(
      (n) =>
        n.floor === w.floor &&
        n.owners.some((o) =>
          w.owners.some((v) =>
            v.index !== undefined ? v.index === o.index : v.wallId === o.wallId,
          ),
        ),
    );
    const target =
      moved.find(
        (n) =>
          Math.abs(n.length - w.length) < 0.1 &&
          Math.abs(
            (n.b.x - n.a.x) * (w.b.y - w.a.y) -
              (n.b.y - n.a.y) * (w.b.x - w.a.x),
          ) < 0.1,
      ) || moved[0];
    if (!target) throw Error("Wall topology changed; review the move");
    next.wallOverrides[target.id] = thickness;
    for (const o of target.owners) {
      const raw = next.planning.walls.find((v) => v.id === o.wallId);
      if (raw) raw.thickness = thickness;
    }
    return P.normalize(next);
  }
  function assignAssembly(p, wallIds, typeId) {
    const next = clone(p),
      type = data(next).assemblies.find((a) => a.id === typeId);
    if (!type) throw Error("Choose an assembly");
    const t = type.layers.reduce((s, l) => s + l.thickness, 0);
    for (const id of wallIds) {
      const w = P.walls(next).find((w) => w.id === id);
      if (!w) throw Error("Wall not found");
      if (
        w.owners.some(
          (o) =>
            next.elements[o.index]?.locked ||
            next.design.objectProperties[o.wallId]?.locked,
        )
      )
        throw Error("Unlock affected walls/rooms");
      next.wallOverrides[id] = t;
      data(next).wallTypes[id] = typeId;
    }
    return P.normalize(next);
  }
  function materialTakeoff(p) {
    const rows = [],
      w = data(p);
    for (const wall of P.walls(p)) {
      const assembly = w.assemblies.find((a) => a.id === w.wallTypes[wall.id]);
      if (!assembly) continue;
      const cuts = [
        ...new Set([
          0,
          wall.length,
          ...wall.openings.flatMap((o) => [o.start, o.end]),
        ]),
      ].sort((a, b) => a - b);
      let net = wall.length * (wall.height || floorHeight(p, wall.floor));
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i],
          b = cuts[i + 1],
          ranges = wall.openings
            .filter((o) => o.start < (a + b) / 2 && o.end > (a + b) / 2)
            .map((o) => [o.sill, o.sill + o.height])
            .sort((a, b) => a[0] - b[0]);
        let high = 0,
          opening = 0;
        for (const [lo, hi] of ranges) {
          opening += Math.max(0, hi - Math.max(lo, high));
          high = Math.max(high, hi);
        }
        net -= (b - a) * opening;
      }
      for (const layer of assembly.layers) {
        const volume = (Math.max(0, net) * layer.thickness) / 1728;
        rows.push({
          wall: wall.id,
          floor: wall.floor,
          assembly: assembly.name,
          material: layer.material,
          area: Math.max(0, net) / 144,
          volume,
          waste: layer.waste || 0,
          orderVolume: volume * (1 + (layer.waste || 0) / 100),
          cost: volume * (1 + (layer.waste || 0) / 100) * (layer.rate || 0),
        });
      }
    }
    return rows;
  }
  function applyOpeningType(p, typeId, ids, overrides = []) {
    const next = clone(p),
      type = data(next).openingTypes.find((t) => t.id === typeId);
    if (!type) throw Error("Opening type not found");
    for (const id of ids) {
      const f = next.fixtures.find((f) => f.id === id);
      if (!f) throw Error("Opening not found");
      if (
        next.elements[f.roomId].locked ||
        next.design.objectProperties[id]?.locked
      )
        throw Error("Unlock the opening and room");
      if (f.type !== type.kind) throw Error("Type does not match this opening");
      for (const [key, value] of Object.entries({
        size: type.width,
        height: type.height,
        sill: type.sill || 0,
        ...(type.style ? { style: type.style } : {}),
      }))
        if (!overrides.includes(key)) f[key] = value;
      data(next).openingLinks[id] = { type: typeId, overrides: [...overrides] };
    }
    return P.normalize(next);
  }
  function updateOpeningType(p, type) {
    let next = clone(p);
    const index = data(next).openingTypes.findIndex((t) => t.id === type.id);
    if (index < 0) throw Error("Opening type not found");
    data(next).openingTypes[index] = clone(type);
    for (const [id, link] of Object.entries(data(next).openingLinks))
      if (link.type === type.id && next.fixtures.some((f) => f.id === id))
        next = applyOpeningType(next, type.id, [id], link.overrides);
    return P.normalize(next);
  }
  function alignOpenings(p, ids, mode) {
    const next = clone(p),
      fs = ids.map((id) => next.fixtures.find((f) => f.id === id));
    if (fs.length < 2 || fs.some((f) => !f))
      throw Error("Choose at least two openings");
    const first = fs[0],
      s = M.openingSegment(next, first),
      mid = pt((s.a.x + s.b.x) / 2, (s.a.y + s.b.y) / 2);
    for (const f of fs.slice(1)) {
      if (
        next.elements[f.roomId].locked ||
        next.design.objectProperties[f.id]?.locked
      )
        throw Error("Unlock affected openings");
      if (mode === "sill") f.sill = first.sill;
      else if (mode === "head") f.sill = first.sill + first.height - f.height;
      else if (mode === "width") f.size = first.size;
      else {
        const segment = M.openingSegment(next, f),
          u = pt(segment.b.x - segment.a.x, segment.b.y - segment.a.y),
          len = Math.hypot(u.x, u.y),
          a = pt(
            (segment.a.x + segment.b.x) / 2,
            (segment.a.y + segment.b.y) / 2,
          );
        if (Math.abs(u.x * (s.b.y - s.a.y) - u.y * (s.b.x - s.a.x)) > 0.1)
          throw Error("Centre alignment needs parallel opening edges");
        f.offset += ((mid.x - a.x) * u.x + (mid.y - a.y) * u.y) / len;
      }
    }
    return P.normalize(next);
  }
  function slabGeometry(p, f) {
    let g = D.floorUnion(p, f);
    if (!g.length) g = [D.polygon(boundary(p))];
    const holes = [...data(p).voids, ...data(p).shafts]
      .filter((o) => o.from <= f && o.to > f)
      .map((o) => (o.points ? D.polygon(o.points) : box(o)));
    for (const e of p.elements.filter(
      (e) =>
        e.type === "staircase" &&
        (e.floor === f || (e.cutAllFloors && e.floor <= f)),
    ))
      holes.push(box(e));
    return holes.length ? PC.difference(g, ...holes) : g;
  }
  function measure(a, b) {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      dz = b.z - a.z;
    return {
      length: Math.hypot(dx, dy, dz),
      horizontal: Math.hypot(dx, dy),
      vertical: Math.abs(dz),
      slope: Math.hypot(dx, dy) ? dz / Math.hypot(dx, dy) : null,
    };
  }
  function serviceClashes(p) {
    const out = [],
      routes = data(p).services3d,
      segs = routes.flatMap((s) =>
        s.points.slice(1).map((b, i) => ({ s, a: s.points[i], b })),
      );
    function closest(a, b, c, d) {
      const u = [b.x - a.x, b.y - a.y, b.z - a.z],
        v = [d.x - c.x, d.y - c.y, d.z - c.z],
        w = [a.x - c.x, a.y - c.y, a.z - c.z],
        dot = (x, y) => x.reduce((s, n, i) => s + n * y[i], 0),
        A = dot(u, u),
        B = dot(u, v),
        C = dot(v, v),
        E = dot(u, w),
        F = dot(v, w),
        den = A * C - B * B;
      let t = den ? Math.max(0, Math.min(1, (B * F - C * E) / den)) : 0,
        s = C ? Math.max(0, Math.min(1, (B * t + F) / C)) : 0;
      t = A ? Math.max(0, Math.min(1, (B * s - E) / A)) : 0;
      return {
        distance: Math.hypot(...w.map((n, i) => n + t * u[i] - s * v[i])),
        point: { x: a.x + t * u[0], y: a.y + t * u[1], z: a.z + t * u[2] },
      };
    }
    for (let i = 0; i < segs.length; i++)
      for (let j = i + 1; j < segs.length; j++) {
        const a = segs[i],
          b = segs[j];
        if (a.s.id === b.s.id) continue;
        const c = closest(a.a, a.b, b.a, b.b);
        if (c.distance < (a.s.diameter + b.s.diameter) / 2)
          out.push({ a: a.s.id, b: b.s.id, ...c, kind: "service" });
      }
    for (const s of segs)
      for (const wall of P.walls(p)) {
        const q = D.intersection(s.a, s.b, wall.a, wall.b);
        if (!q) continue;
        const z = s.a.z + (s.b.z - s.a.z) * q.t,
          base = floorBase(p, wall.floor),
          along = M.distance(wall.a, q);
        if (
          z >= base - s.s.diameter / 2 &&
          z <= base + floorHeight(p, wall.floor) + s.s.diameter / 2 &&
          !wall.openings.some(
            (o) =>
              along >= o.start &&
              along <= o.end &&
              z >= base + o.sill &&
              z <= base + o.sill + o.height,
          )
        )
          out.push({
            a: s.s.id,
            b: wall.id,
            point: { x: q.x, y: q.y, z },
            kind: "wall",
          });
      }
    return out;
  }
  function terrainHeight(p, q) {
    const ps = data(p).terrain.points;
    if (!ps.length) return 0;
    let sum = 0,
      weight = 0;
    for (const a of ps) {
      const d = Math.hypot(q.x - a.x, q.y - a.y);
      if (d < 0.0001) return a.z;
      const w = 1 / (d * d);
      sum += a.z * w;
      weight += w;
    }
    return sum / weight;
  }
  function earthwork(p) {
    const w = data(p),
      ps = boundary(p),
      minX = Math.min(...ps.map((q) => q.x)),
      maxX = Math.max(...ps.map((q) => q.x)),
      minY = Math.min(...ps.map((q) => q.y)),
      maxY = Math.max(...ps.map((q) => q.y)),
      n = Math.floor(w.terrain.resolution),
      dx = (maxX - minX) / n,
      dy = (maxY - minY) / n;
    let cut = 0,
      fill = 0;
    for (let x = 0; x < n; x++)
      for (let y = 0; y < n; y++) {
        const e = { x: minX + x * dx, y: minY + y * dy, w: dx, h: dy },
          area = D.geomArea(PC.intersection(box(e), D.polygon(ps))),
          z =
            terrainHeight(p, pt(e.x + dx / 2, e.y + dy / 2)) -
            w.terrain.designLevel;
        if (z > 0) cut += area * z;
        else fill -= area * z;
      }
    return {
      cut: cut / 1728,
      fill: fill / 1728,
      net: (cut - fill) / 1728,
      resolution: { x: dx, y: dy },
      samples: n * n,
    };
  }
  function rainwater(p) {
    const r = data(p).rain,
      area = p.elements.length
        ? D.geomArea(
            D.floorUnion(
              p,
              Math.max(
                ...p.elements.filter((e) => !e.isFurniture).map((e) => e.floor),
                0,
              ),
            ),
          ) / 144
        : D.geomArea([D.polygon(boundary(p))]) / 144,
      m2 = area * 0.09290304,
      annual = m2 * r.annualMm * r.efficiency,
      event = m2 * r.eventMm * r.efficiency,
      peakLps = (m2 * r.intensityMmHour * r.efficiency) / 3600;
    return {
      area,
      annualLitres: annual,
      eventLitres: event,
      storedEvent: Math.min(event, r.tankLitres),
      overflow: Math.max(0, event - r.tankLitres),
      days: r.tankLitres / r.dailyLitres,
      peakLps,
      downpipes: Math.max(1, Math.ceil(peakLps / r.pipeCapacityLps)),
    };
  }
  function solarLayout(p) {
    const s = data(p).solar,
      floor = Math.max(
        ...p.elements.filter((e) => !e.isFurniture).map((e) => e.floor),
        0,
      ),
      roof = p.elements.length
        ? D.floorUnion(p, floor)
        : [D.polygon(boundary(p))],
      rings = D.paths(roof),
      points = rings.flat();
    if (!points.length) return { panels: [], kw: 0 };
    const xmin = Math.min(...points.map((q) => q.x)) + s.walkway,
      xmax = Math.max(...points.map((q) => q.x)) - s.walkway,
      ymin = Math.min(...points.map((q) => q.y)) + s.walkway,
      ymax = Math.max(...points.map((q) => q.y)) - s.walkway,
      cx = (xmin + xmax) / 2,
      cy = (ymin + ymax) / 2,
      c = Math.cos((s.angle * Math.PI) / 180),
      sin = Math.sin((s.angle * Math.PI) / 180),
      rotate = (q) =>
        pt(
          cx + (q.x - cx) * c - (q.y - cy) * sin,
          cy + (q.x - cx) * sin + (q.y - cy) * c,
        ),
      panels = [],
      shadows = D.shadows(p).map((s) => s.polygon);
    let attempts = 0;
    for (let y = ymin; y + s.depth <= ymax; y += s.depth + s.gap)
      for (let x = xmin; x + s.width <= xmax; x += s.width + s.gap) {
        if (++attempts > 20000) throw Error("Panel grid is too dense");
        const ps = [
            pt(x, y),
            pt(x + s.width, y),
            pt(x + s.width, y + s.depth),
            pt(x, y + s.depth),
          ].map(rotate),
          g = D.polygon(ps);
        if (
          D.geomArea(PC.difference(g, roof)) > 0.01 ||
          s.obstacles.some(
            (o) => D.geomArea(PC.intersection(g, D.polygon(o))) > 0.01,
          )
        )
          continue;
        const shaded = shadows.some(
          (shadow) => D.geomArea(PC.intersection(g, shadow)) > 0.01,
        );
        panels.push({ id: "panel-" + panels.length, points: ps, shaded });
      }
    const kw = (panels.length * s.watts) / 1000;
    return {
      panels,
      kw,
      shaded: panels.filter((p) => p.shaded).length,
      enteredYieldKwh: kw * s.peakSunHours * s.derate,
    };
  }
  function procurement(p) {
    return data(p).procurement.map((r) => {
      const required = r.quantity * (1 + r.waste / 100),
        packs = Math.ceil(required / r.pack),
        ordered = packs * r.pack;
      return {
        ...r,
        required,
        packs,
        ordered,
        surplus: ordered - required,
        cost: ordered * r.rate,
      };
    });
  }
  function cuts(requests, stock = { w: 24, h: 24, kerf: 0.125 }) {
    finite(stock.w, "Stock width", 1, 10000);
    finite(stock.h, "Stock height", 1, 10000);
    finite(stock.kerf, "Cut kerf", 0, 10);
    const tasks = requests
      .flatMap((r, i) => {
        finite(r.w, "Cut width", 0.1, 10000);
        finite(r.h, "Cut height", 0.1, 10000);
        finite(r.qty ?? 1, "Cut quantity", 1, 1000);
        return Array.from({ length: Math.floor(r.qty || 1) }, () => ({
          ...r,
          id: r.id || "cut-" + i,
        }));
      })
      .sort((a, b) => b.w * b.h - a.w * a.h);
    if (tasks.length > 5000)
      throw Error("Cut plan supports at most 5000 pieces");
    const sheets = [];
    for (const task of tasks) {
      let best;
      for (const sheet of sheets)
        for (let i = 0; i < sheet.free.length; i++)
          for (const turn of [false, true]) {
            const w = turn ? task.h : task.w,
              h = turn ? task.w : task.h,
              rect = sheet.free[i];
            if (w <= rect.w + 0.001 && h <= rect.h + 0.001) {
              const waste = rect.w * rect.h - w * h;
              if (!best || waste < best.waste)
                best = { sheet, index: i, w, h, turn, waste };
            }
          }
      if (!best) {
        if (
          !(
            (task.w <= stock.w && task.h <= stock.h) ||
            (task.h <= stock.w && task.w <= stock.h)
          )
        )
          throw Error("A requested cut exceeds the stock size");
        const sheet = {
          id: sheets.length + 1,
          free: [{ x: 0, y: 0, w: stock.w, h: stock.h }],
          pieces: [],
        };
        sheets.push(sheet);
        const turn = task.w > stock.w || task.h > stock.h;
        best = {
          sheet,
          index: 0,
          w: turn ? task.h : task.w,
          h: turn ? task.w : task.h,
          turn,
        };
      }
      const r = best.sheet.free.splice(best.index, 1)[0],
        dw = r.w - best.w - stock.kerf,
        dh = r.h - best.h - stock.kerf;
      best.sheet.pieces.push({
        id: task.id,
        x: r.x,
        y: r.y,
        w: best.w,
        h: best.h,
        turned: best.turn,
      });
      if (dw > 0.01)
        best.sheet.free.push({
          x: r.x + best.w + stock.kerf,
          y: r.y,
          w: dw,
          h: best.h,
        });
      if (dh > 0.01)
        best.sheet.free.push({
          x: r.x,
          y: r.y + best.h + stock.kerf,
          w: r.w,
          h: dh,
        });
    }
    const used = tasks.reduce((s, t) => s + t.w * t.h, 0);
    return {
      sheets,
      stock,
      used,
      wastePercent: sheets.length
        ? 100 * (1 - used / (sheets.length * stock.w * stock.h))
        : 0,
    };
  }
  function tileCutPlan(p, roomIds, kerf = 0.125) {
    const requests = [];
    let count = 0;
    const stock = data(p).tileStock || { w: 24, h: 24 };
    for (const id of roomIds) {
      const tiles = D.tiles(p, id);
      count += tiles.total;
      for (const tile of tiles.tiles) {
        const points = D.paths(tile.geometry).flat(),
          xs = points.map((q) => q.x),
          ys = points.map((q) => q.y),
          angle = (-(p.design.tiles[id]?.angle || 0) * Math.PI) / 180,
          rot = points.map((q) =>
            pt(
              q.x * Math.cos(angle) - q.y * Math.sin(angle),
              q.x * Math.sin(angle) + q.y * Math.cos(angle),
            ),
          );
        requests.push({
          id: id + "-" + requests.length,
          w:
            Math.max(...rot.map((q) => q.x)) - Math.min(...rot.map((q) => q.x)),
          h:
            Math.max(...rot.map((q) => q.y)) - Math.min(...rot.map((q) => q.y)),
          qty: 1,
        });
      }
      const tile = p.design.tiles[id] || { w: 24, h: 24 };
      stock.w = Math.max(stock.w, tile.w);
      stock.h = Math.max(stock.h, tile.h);
    }
    return { ...cuts(requests, { ...stock, kerf }), unoptimized: count };
  }
  function optionSnapshot(p) {
    const next = clone(p);
    data(next).options = [];
    return next;
  }
  function compare(a, b) {
    const map = (p) =>
        new Map(
          [
            ...p.elements,
            ...p.fixtures,
            ...p.planning.walls,
            ...p.planning.services,
          ].map((e) => [e.id, e]),
        ),
      x = map(a),
      y = map(b),
      added = [...y.keys()].filter((id) => !x.has(id)),
      removed = [...x.keys()].filter((id) => !y.has(id)),
      changed = [...x.keys()].filter(
        (id) =>
          y.has(id) && JSON.stringify(x.get(id)) !== JSON.stringify(y.get(id)),
      ),
      qa = M.quantities(a),
      qb = M.quantities(b);
    return {
      added,
      removed,
      changed,
      areaDelta:
        qb.floors.reduce((s, f) => s + f.floorArea, 0) -
        qa.floors.reduce((s, f) => s + f.floorArea, 0),
      costDelta: qb.total - qa.total,
      requirements: D.requirementReport(b),
    };
  }
  function macroApply(p, macro, params = {}, selected = []) {
    let next = clone(p);
    const number = (v) => {
      const n =
        typeof v === "string" && v.startsWith("$")
          ? Number(params[v.slice(1)])
          : Number(v);
      return finite(n, "Macro parameter");
    };
    for (const a of macro.actions) {
      const ids = a.selection ? selected : a.ids;
      if (!ids.length) throw Error("Select macro targets");
      if (a.op === "move")
        next = D.transformSelection(next, ids, (q) =>
          pt(q.x + number(a.dx), q.y + number(a.dy)),
        );
      else if (a.op === "duplicate") {
        const selectedEls = next.elements.filter((e) => ids.includes(e.id));
        const copyIds = new Map();
        for (const e of selectedEls) {
          if (e.locked) throw Error("Unlock macro targets");
          const id = uid();
          copyIds.set(e.id, id);
          next.elements.push({
            ...clone(e),
            id,
            x: e.x + number(a.dx || 0),
            y: e.y + number(a.dy || 0),
          });
        }
        for (const f of next.fixtures.slice())
          if (copyIds.has(f.roomUid)) {
            const roomUid = copyIds.get(f.roomUid);
            next.fixtures.push({
              ...clone(f),
              id: uid(),
              roomUid,
              roomId: next.elements.findIndex((e) => e.id === roomUid),
            });
          }
      } else
        for (const id of ids) {
          const e = next.elements.find((e) => e.id === id);
          if (!e) throw Error("Macro target no longer exists");
          if (e.locked || next.design.objectProperties[id]?.locked)
            throw Error("Unlock macro targets");
          if (a.op === "resize") {
            e.w = number(a.w);
            e.h = number(a.h);
            if (e.points)
              throw Error("Use polygon editing for polygon dimensions");
          }
          if (a.op === "rotate") e.rot = (e.rot + number(a.angle) + 360) % 360;
          if (a.op === "property") e[a.key] = text(a.value);
        }
      next = P.normalize(next);
    }
    next = P.solveConstraints(next);
    for (const e of next.elements) {
      if (
        e.x < 0 ||
        e.y < 0 ||
        e.x + (e.isFurniture && e.rot % 180 === 90 ? e.h : e.w) >
          P.inches(next.plot.inW, next.unit) ||
        e.y + (e.isFurniture && e.rot % 180 === 90 ? e.w : e.h) >
          P.inches(next.plot.inH, next.unit) ||
        (data(next).site.boundary.length && !insideSite(next, e))
      )
        throw Error("Macro would move geometry outside the plot");
    }
    const rooms = next.elements.filter((e) => !e.isFurniture);
    for (let i = 0; i < rooms.length; i++)
      for (const b of rooms.slice(i + 1)) {
        const a = rooms[i];
        if (a.floor !== b.floor || !M.overlap(a, b)) continue;
        const oldA = p.elements.find((e) => e.id === a.id),
          oldB = p.elements.find((e) => e.id === b.id);
        if (!oldA || !oldB || !M.overlap(oldA, oldB))
          throw Error("Macro would create overlapping rooms");
      }
    return next;
  }
  function recordActions(before, after) {
    const actions = [],
      unsupported = [];
    for (const e of before.elements) {
      const n = after.elements.find((n) => n.id === e.id);
      if (!n) {
        unsupported.push("deletion");
        continue;
      }
      if (e.x !== n.x || e.y !== n.y)
        actions.push({ op: "move", ids: [e.id], dx: n.x - e.x, dy: n.y - e.y });
      if (e.w !== n.w || e.h !== n.h)
        actions.push({ op: "resize", ids: [e.id], w: n.w, h: n.h });
      if (e.rot !== n.rot)
        actions.push({ op: "rotate", ids: [e.id], angle: n.rot - e.rot });
      for (const k of ["customName", "customColor", "material"])
        if (e[k] !== n[k])
          actions.push({ op: "property", ids: [e.id], key: k, value: n[k] });
    }
    if (after.elements.some((e) => !before.elements.some((n) => n.id === e.id)))
      unsupported.push("object creation");
    if (JSON.stringify(before.fixtures) !== JSON.stringify(after.fixtures))
      unsupported.push("opening edit");
    if (JSON.stringify(before.planning) !== JSON.stringify(after.planning))
      unsupported.push("planning edit");
    return { actions, unsupported: [...new Set(unsupported)] };
  }
  function componentFrom(p, ids, name) {
    const selected = p.elements.filter((e) => ids.includes(e.id));
    if (!selected.length) throw Error("Select component objects");
    const x = Math.min(...selected.map((e) => e.x)),
      y = Math.min(...selected.map((e) => e.y)),
      floor = Math.min(...selected.map((e) => e.floor)),
      elements = selected.map((e) => ({
        ...clone(e),
        x: e.x - x,
        y: e.y - y,
        floor: e.floor - floor,
        locked: false,
      })),
      fixtures = p.fixtures
        .filter((f) => selected.some((e) => e.id === f.roomUid))
        .map((f) => ({
          ...clone(f),
          roomId: elements.findIndex((e) => e.id === f.roomUid),
        }));
    return { id: uid(), name: text(name), elements, fixtures };
  }
  function placeComponent(p, id, x, y, floor) {
    const next = clone(p),
      c = data(next).components.find((c) => c.id === id);
    if (!c) throw Error("Assembly not found");
    const members = [],
      fixtureMembers = [],
      mapping = new Map();
    for (const e of c.elements) {
      const element = {
        ...clone(e),
        id: uid(),
        x: e.x + x,
        y: e.y + y,
        floor: e.floor + floor,
      };
      mapping.set(e.id, element.id);
      next.elements.push(element);
      members.push({ source: e.id, id: element.id });
    }
    for (const f of c.fixtures) {
      const roomUid = mapping.get(f.roomUid),
        fixtureId = uid();
      fixtureMembers.push({ source: f.id, id: fixtureId });
      next.fixtures.push({
        ...clone(f),
        id: fixtureId,
        roomUid,
        roomId: next.elements.findIndex((e) => e.id === roomUid),
      });
    }
    data(next).instances.push({
      id: uid(),
      component: id,
      x,
      y,
      floor,
      members,
      fixtureMembers,
    });
    return P.normalize(next);
  }
  function updateComponent(p, component) {
    const next = clone(p),
      w = data(next),
      old = w.components.find((c) => c.id === component.id);
    if (!old) throw Error("Assembly not found");
    const instances = w.instances.filter((i) => i.component === component.id);
    for (const instance of instances) {
      if (
        instance.members.some(
          (m) => next.elements.find((e) => e.id === m.id)?.locked,
        )
      )
        throw Error("Unlock all linked assembly members");
      const map = new Map(instance.members.map((m) => [m.source, m.id])),
        nextMembers = [];
      for (const source of component.elements) {
        const id = map.get(source.id) || uid(),
          record = {
            ...clone(source),
            id,
            x: source.x + instance.x,
            y: source.y + instance.y,
            floor: source.floor + instance.floor,
          },
          index = next.elements.findIndex((e) => e.id === id);
        if (index >= 0) next.elements[index] = record;
        else next.elements.push(record);
        nextMembers.push({ source: source.id, id });
      }
      const removed = new Set(
        instance.members
          .filter((m) => !nextMembers.some((n) => n.id === m.id))
          .map((m) => m.id),
      );
      next.elements = next.elements.filter((e) => !removed.has(e.id));
      const memberIds = new Set([
        ...instance.members.map((m) => m.id),
        ...nextMembers.map((m) => m.id),
      ]);
      const previousFixtures = instance.fixtureMembers || [];
      next.fixtures = next.fixtures.filter((f) => !memberIds.has(f.roomUid));
      instance.fixtureMembers = [];
      for (const source of component.fixtures) {
        const roomUid = nextMembers.find(
          (m) => m.source === source.roomUid,
        )?.id;
        if (!roomUid) throw Error("Component opening lost its room");
        const id =
          previousFixtures.find((m) => m.source === source.id)?.id || uid();
        next.fixtures.push({
          ...clone(source),
          id,
          roomUid,
          roomId: next.elements.findIndex((e) => e.id === roomUid),
        });
        instance.fixtureMembers.push({ source: source.id, id });
      }
      instance.members = nextMembers;
    }
    next.fixtures = next.fixtures.map((f) => ({
      ...f,
      roomId: next.elements.findIndex((e) => e.id === f.roomUid),
    }));
    w.components[w.components.indexOf(old)] = clone(component);
    return P.normalize(next);
  }
  function propertySearch(p, query) {
    const q = query.toLowerCase();
    return [
      ...p.elements,
      ...p.fixtures,
      ...p.planning.walls,
      ...p.planning.services,
    ]
      .filter((e) =>
        JSON.stringify([
          e.customName,
          e.tag,
          e.label,
          e.type,
          data(p).values[e.id] || {},
        ])
          .toLowerCase()
          .includes(q),
      )
      .map((e) => e.id);
  }
  const baseWalls = P.walls;
  P.walls = function (p) {
    const w = data(p),
      legacy = baseWalls(p);
    for (const wall of legacy)
      for (const opening of wall.openings)
        if (!opening.id) {
          const fixture = p.fixtures.find((f) => {
            if (
              f.type !== opening.type ||
              p.elements[f.roomId].floor !== wall.floor
            )
              return false;
            const seg = M.openingSegment(p, f),
              mid = pt((seg.a.x + seg.b.x) / 2, (seg.a.y + seg.b.y) / 2),
              along = M.distance(wall.a, mid);
            return (
              D.onSegment(mid, wall.a, wall.b, 0.05) &&
              along >= opening.start - 0.05 &&
              along <= opening.end + 0.05
            );
          });
          if (fixture) opening.id = fixture.id;
        }
    if (
      !w.levels.length &&
      !Object.values(p.design.roomProperties || {}).some((r) => r.level)
    )
      return legacy;
    return legacy.map((wall) => {
      const levels = wall.owners
          .filter((o) => o.index !== undefined)
          .map((o) => roomBase(p, p.elements[o.index])),
        base = levels.length ? Math.min(...levels) : floorBase(p, wall.floor),
        top =
          (levels.length ? Math.max(...levels) : base) +
          floorHeight(p, wall.floor),
        height = top - base;
      return {
        ...wall,
        base,
        height,
        openings: wall.openings.map((o) => {
          const f = p.fixtures.find((f) => f.id === o.id);
          return {
            ...o,
            sill: o.sill + (f ? roomBase(p, p.elements[f.roomId]) - base : 0),
          };
        }),
      };
    });
  };
  root.WorkbenchModel = {
    defaults,
    validate,
    validateIssue,
    validateMarkup,
    data,
    clone,
    pt,
    box,
    boundary,
    buildable,
    insideSite,
    siteFindings,
    floorBase,
    floorHeight,
    roomBase,
    diagnostics,
    faceEdit,
    assignAssembly,
    materialTakeoff,
    applyOpeningType,
    updateOpeningType,
    alignOpenings,
    slabGeometry,
    measure,
    serviceClashes,
    terrainHeight,
    earthwork,
    rainwater,
    solarLayout,
    procurement,
    cuts,
    tileCutPlan,
    optionSnapshot,
    compare,
    macroApply,
    recordActions,
    componentFrom,
    placeComponent,
    updateComponent,
    propertySearch,
  };
  if (typeof module !== "undefined") module.exports = root.WorkbenchModel;
})(typeof window !== "undefined" ? window : globalThis);
(function (root) {
  const W = root.WorkbenchModel;
  W.objects = function (p) {
    const w = W.data(p),
      rows = [];
    for (const key of [
      "ramps",
      "shafts",
      "structure",
      "outdoors",
      "services3d",
    ])
      for (const record of w[key])
        rows.push({
          record,
          kind: key,
          floor: record.floor ?? record.from ?? 0,
        });
    for (const layout of w.interiors) {
      const room = p.elements.find((e) => e.id === layout.room);
      for (const record of layout.items)
        rows.push({
          record,
          kind: "interior",
          floor: room?.floor || 0,
          room: layout.room,
        });
    }
    return rows;
  };
  W.findObject = (p, id) => W.objects(p).find((o) => o.record.id === id);
  const search = W.propertySearch;
  W.propertySearch = function (p, query) {
    const q = query.toLowerCase();
    return [
      ...new Set([
        ...search(p, query),
        ...W.objects(p)
          .filter((o) =>
            JSON.stringify([
              o.record.name,
              o.record.type,
              o.kind,
              W.data(p).values[o.record.id],
            ])
              .toLowerCase()
              .includes(q),
          )
          .map((o) => o.record.id),
      ]),
    ];
  };
})(typeof window !== "undefined" ? window : globalThis);
