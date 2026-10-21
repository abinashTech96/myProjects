/* Geometry, design requirements and analysis shared by browser, server and tests. */
(function (root) {
  "use strict";
  const Presentation = root.PresentationModel || (typeof require === "function" ? require("./presentation-model.js") : null);
  const P = root.ProjectModel,
    M = root.PlanningModel,
    PC =
      root.polygonClipping ||
      (typeof require === "function"
        ? require("../vendor/geometry/polygon-clipping.js")
        : null),
    CL =
      root.ClipperLib ||
      (typeof require === "function"
        ? require("../vendor/geometry/clipper.js")
        : null),
    EPS = 1e-5;
  const clone = (x) => structuredClone(x),
    dist = M.distance,
    cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x),
    point = (x, y) => ({ x, y });
  const polygon = (ps) => [ps.map((p) => [p.x, p.y])],
    paths = (g) =>
      g.flatMap((poly) =>
        poly.map((r) => r.slice(0, -1).map(([x, y]) => ({ x, y }))),
      ),
    geomArea = (g) =>
      g.reduce(
        (s, poly) =>
          s +
          poly.reduce(
            (n, r, i) =>
              n + (i ? -1 : 1) * M.area(r.map(([x, y]) => ({ x, y }))),
            0,
          ),
        0,
      );
  const rect = (x, y, w, h) =>
    polygon([
      point(x, y),
      point(x + w, y),
      point(x + w, y + h),
      point(x, y + h),
    ]);
  function defaults() {
    return {
      version: 1,
      presentation: Presentation.defaults(),
      autoRooms: false,
      guides: [],
      constraints: [],
      requirements: [],
      neighbours: [],
      roof: { type: "flat", rise: 36, overhang: 12, drain: "south" },
      ceilings: [],
      finishes: {},
      tiles: {},
      roomProperties: {},
      views: [],
      sheets: [],
      trash: [],
      accessibility: { width: 36, turn: 60, maxStep: 0.5 },
      site: {
        latitude: 20.2961,
        longitude: 85.8245,
        date: "2026-06-21",
        hour: 12,
        utcOffset: 5.5,
      },
      entrances: [],
      selection: {},
      objectProperties: {},
      reviewNotes: [],
    };
  }
  function validate(raw, p) {
    const d = { ...defaults(), ...clone(raw || {}) };
    for (const k of [
      "guides",
      "constraints",
      "requirements",
      "neighbours",
      "ceilings",
      "views",
      "sheets",
      "trash",
      "entrances",
      "reviewNotes",
    ])
      if (!Array.isArray(d[k]) || d[k].length > 2000)
        throw Error("Invalid design " + k);
    d.presentation = Presentation.validate(d.presentation, p);
    d.autoRooms = !!d.autoRooms;
    const f = (n, label, min = 0, max = 100000) => P.finite(n, label, min, max);
    for (const g of d.guides) {
      f(g.a?.x, "Guide X");
      f(g.a?.y, "Guide Y");
      f(g.b?.x, "Guide X");
      f(g.b?.y, "Guide Y");
      f(g.floor, "Guide floor", 0, p.floorCount - 1);
    }
    for (const w of p.planning.walls)
      if (w.curve) {
        for (const k of ["x", "y"]) f(w.curve.control?.[k], "Curve control");
        f(w.curve.steps || 16, "Curve resolution", 4, 64);
      }
    for (const c of d.constraints) {
      if (
        ![
          "parallel",
          "perpendicular",
          "coincident",
          "equal-length",
          "fixed-angle",
        ].includes(c.kind)
      )
        throw Error("Invalid geometric constraint");
      if (typeof c.source !== "string" || typeof c.target !== "string")
        throw Error("Invalid constraint references");
      if (c.angle !== undefined) f(c.angle, "Angle", -360, 360);
    }
    for (const r of d.requirements) {
      if (
        !["mandatory", "preferred", "optional"].includes(r.priority) ||
        !["room", "adjacent", "private-access", "circulation"].includes(r.kind)
      )
        throw Error("Invalid design requirement");
      if (
        r.zone &&
        !["NE", "NW", "SE", "SW", "N", "S", "E", "W", "CENTER"].includes(r.zone)
      )
        throw Error("Invalid required direction");
      r.id = String(r.id || P.uid())
        .replace(/[^\w:-]/g, "")
        .slice(0, 100);
      r.label = String(r.label || "").slice(0, 150);
      if (r.minArea !== undefined) f(r.minArea, "Minimum area", 0, 1e6);
      if (r.width !== undefined) f(r.width, "Room width", 1, 10000);
      if (r.depth !== undefined) f(r.depth, "Room depth", 1, 10000);
    }
    for (const n of d.neighbours) {
      for (const k of ["x", "y"]) f(n[k], k, -100000);
      for (const k of ["w", "h", "height"]) f(n[k], k, 1);
      f(n.floor ?? 0, "Neighbour floor", 0, 49);
    }
    d.roof = { ...defaults().roof, ...d.roof };
    if (!["flat", "gable", "shed", "hip"].includes(d.roof.type))
      throw Error("Invalid roof");
    f(d.roof.rise, "Roof rise", 0, 240);
    f(d.roof.overhang, "Overhang", 0, 120);
    if (!["north", "south", "east", "west"].includes(d.roof.drain))
      throw Error("Invalid drainage direction");
    d.site = { ...defaults().site, ...d.site };
    f(d.site.latitude, "Latitude", -89.9, 89.9);
    f(d.site.longitude, "Longitude", -180, 180);
    f(d.site.hour, "Hour", 0, 24);
    f(d.site.utcOffset, "UTC offset", -12, 14);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(d.site.date) ||
      !Number.isFinite(Date.parse(d.site.date))
    )
      throw Error("Invalid study date");
    d.accessibility = { ...defaults().accessibility, ...d.accessibility };
    for (const k of ["width", "turn", "maxStep"])
      f(d.accessibility[k], k, 0, 240);
    for (const c of d.ceilings) {
      f(c.floor, "Ceiling floor", 0, p.floorCount - 1);
      for (const k of ["x", "y"]) f(c[k], k);
      for (const k of ["w", "h", "height"]) f(c[k], k, 1);
      c.label = String(c.label || "Ceiling").slice(0, 120);
    }
    for (const obj of Object.values(d.tiles)) {
      for (const k of ["w", "h"]) f(obj[k], "Tile dimension", 1, 240);
      f(obj.joint || 0, "Tile joint", 0, 2);
      f(obj.angle || 0, "Tile rotation", -360, 360);
    }
    for (const v of Object.values(d.finishes)) {
      if (!v || typeof v !== "object") throw Error("Invalid finish");
      for (const k of ["floor", "wall", "ceiling", "skirting"])
        v[k] = String(v[k] || "").slice(0, 120);
    }
    for (const sheet of d.sheets) {
      if (
        !Array.isArray(sheet.views) ||
        sheet.views.length > 12 ||
        sheet.views.some(
          (v) =>
            ![
              "plan",
              "front",
              "back",
              "left",
              "right",
              "section",
              "ceiling",
              "schedule",
              "legend",
            ].includes(v),
        )
      )
        throw Error("Invalid sheet views");
      if (!["A3", "A4"].includes(sheet.paper))
        throw Error("Invalid sheet paper");
      f(sheet.scale, "Sheet scale", 10, 500);
      f(sheet.floor, "Sheet floor", 0, p.floorCount - 1);
      sheet.title = String(sheet.title || "Drawing").slice(0, 120);
      if (!Array.isArray(sheet.section) || sheet.section.length > 100)
        throw Error("Invalid section");
      sheet.section.forEach((q) => {
        f(q.x, "Section X");
        f(q.y, "Section Y");
      });
    }
    for (const view of d.views) {
      if (
        !Array.isArray(view.position) ||
        !Array.isArray(view.target) ||
        view.position.length !== 3 ||
        view.target.length !== 3
      )
        throw Error("Invalid viewpoint");
      [...view.position, ...view.target].forEach((v) =>
        f(v, "Camera coordinate", -1e6, 1e6),
      );
      if (view.projection != null && !["perspective", "orthographic"].includes(view.projection))
        throw Error("Invalid viewpoint projection");
      if (view.orthoHeight != null) f(view.orthoHeight, "View height", 0.001, 1e7);
      if (view.zoom != null) f(view.zoom, "View zoom", 0.001, 1e5);
      view.name = String(view.name || "View").slice(0, 100);
      view.note = String(view.note || "").slice(0, 1000);
      f(view.floor, "View floor", 0, p.floorCount - 1);
    }
    for (const props of Object.values(d.roomProperties)) {
      if (!props || typeof props !== "object")
        throw Error("Invalid room properties");
      if (props.level !== undefined) f(props.level, "Room level", -240, 240);
    }
    for (const props of Object.values(d.objectProperties)) {
      if (!props || typeof props !== "object")
        throw Error("Invalid object properties");
      props.name = String(props.name || "").slice(0, 120);
      props.group = String(props.group || "").slice(0, 100);
      props.hidden = !!props.hidden;
      props.locked = !!props.locked;
    }
    d.trash = d.trash.slice(0, 30);
    return d;
  }
  const oldNormalize = P.normalize;
  P.normalize = function (raw) {
    const p = oldNormalize(raw);
    p.design = validate(raw.design, p);
    for (const f of p.fixtures) {
      if (f.arch !== undefined) P.finite(f.arch, "Arch rise", 0, f.height / 2);
      if (f.tag !== undefined) f.tag = String(f.tag).slice(0, 100);
    }
    return p;
  };
  const oldPoints = M.points;
  M.points = function (e) {
    if (e.isFurniture && e.rot % 180 === 90)
      return oldPoints({ ...e, w: e.h, h: e.w });
    return oldPoints(e);
  };
  function wallStrip(w, extend = true) {
    const l = dist(w.a, w.b),
      ux = (w.b.x - w.a.x) / l,
      uy = (w.b.y - w.a.y) / l,
      t = w.thickness / 2,
      e = extend ? t : 0;
    return polygon([
      point(w.a.x - ux * e - uy * t, w.a.y - uy * e + ux * t),
      point(w.b.x + ux * e - uy * t, w.b.y + uy * e + ux * t),
      point(w.b.x + ux * e + uy * t, w.b.y + uy * e - ux * t),
      point(w.a.x - ux * e + uy * t, w.a.y - uy * e - ux * t),
    ]);
  }
  function clear(p, e, allWalls) {
    if (e.isFurniture || ["staircase", "balcony"].includes(e.type)) {
      const geom = [polygon(M.points(e))];
      return {
        w: e.w,
        h: e.h,
        area: M.area(M.points(e)),
        polygon: M.points(e),
        geometry: geom,
      };
    }
    const walls = (allWalls || P.walls(p)).filter(
      (w) =>
        w.floor === e.floor &&
        Math.max(w.a.x, w.b.x) + w.thickness >= e.x &&
        Math.min(w.a.x, w.b.x) - w.thickness <= e.x + e.w &&
        Math.max(w.a.y, w.b.y) + w.thickness >= e.y &&
        Math.min(w.a.y, w.b.y) - w.thickness <= e.y + e.h,
    );
    let geom = [polygon(M.points(e))];
    if (walls.length)
      geom = PC.difference(geom, ...walls.map((w) => wallStrip(w)));
    const rings = paths(geom),
      pts = rings.flat();
    return {
      w: pts.length
        ? Math.max(...pts.map((q) => q.x)) - Math.min(...pts.map((q) => q.x))
        : 0,
      h: pts.length
        ? Math.max(...pts.map((q) => q.y)) - Math.min(...pts.map((q) => q.y))
        : 0,
      area: geomArea(geom),
      polygon: rings[0] || [],
      geometry: geom,
    };
  }
  M.clear = clear;
  const oldWalls = P.walls;
  P.walls = function (p) {
    const curves = p.planning.walls.some((w) => w.curve);
    if (!curves) return oldWalls(p);
    const copy = {
      ...p,
      planning: {
        ...p.planning,
        walls: p.planning.walls.flatMap((w) => {
          if (!w.curve) return [w];
          const control = w.curve.control,
            steps = Math.floor(w.curve.steps || 16),
            ps = Array.from({ length: steps + 1 }, (_, i) => {
              const t = i / steps;
              return {
                x:
                  (1 - t) ** 2 * w.a.x +
                  2 * (1 - t) * t * control.x +
                  t * t * w.b.x,
                y:
                  (1 - t) ** 2 * w.a.y +
                  2 * (1 - t) * t * control.y +
                  t * t * w.b.y,
              };
            });
          return ps.slice(1).map((b, i) => ({
            ...w,
            id: w.id + ":" + i,
            a: ps[i],
            b,
            curve: undefined,
          }));
        }),
      },
    };
    return oldWalls(copy);
  };
  function floorUnion(p, floor, clearOnly = false) {
    const ws = P.walls(p),
      geoms = p.elements
        .filter((e) => !e.isFurniture && e.floor === floor)
        .map((e) =>
          clearOnly ? clear(p, e, ws).geometry : polygon(M.points(e)),
        );
    return geoms.length ? PC.union(...geoms) : [];
  }
  function exterior(p, f) {
    const e = p.elements[f.roomId],
      seg = M.openingSegment(p, f),
      mid = point((seg.a.x + seg.b.x) / 2, (seg.a.y + seg.b.y) / 2),
      union = floorUnion(p, e.floor),
      rings = union.flatMap((poly) => [poly[0]]);
    return rings.some((r) =>
      r
        .slice(1)
        .some((b, i) => onSegment(mid, point(...r[i]), point(...b), 0.05)),
    );
  }
  function onSegment(q, a, b, tol = 0.01) {
    const l = dist(a, b);
    return (
      l > EPS &&
      Math.abs(cross(a, b, q)) / l <= tol &&
      dist(a, q) + dist(q, b) <= l + tol * 2
    );
  }
  function intersection(a, b, c, d, lines = false) {
    const u = point(b.x - a.x, b.y - a.y),
      v = point(d.x - c.x, d.y - c.y),
      den = u.x * v.y - u.y * v.x;
    if (Math.abs(den) < EPS) return null;
    const t = ((c.x - a.x) * v.y - (c.y - a.y) * v.x) / den,
      s = ((c.x - a.x) * u.y - (c.y - a.y) * u.x) / den;
    if (!lines && (t < -EPS || t > 1 + EPS || s < -EPS || s > 1 + EPS))
      return null;
    return { x: a.x + t * u.x, y: a.y + t * u.y, t, s };
  }
  function offsetPath(ps, amount, closed = true) {
    const co = new CL.ClipperOffset(2, 0.05 * 1000),
      input = ps.map((p) => ({
        X: Math.round(p.x * 1000),
        Y: Math.round(p.y * 1000),
      }));
    if (closed && !CL.Clipper.Orientation(input)) input.reverse();
    co.AddPath(
      input,
      CL.JoinType.jtMiter,
      closed ? CL.EndType.etClosedPolygon : CL.EndType.etOpenSquare,
    );
    const out = new CL.Paths();
    co.Execute(out, amount * 1000);
    return out.map((r) => r.map((q) => ({ x: q.X / 1000, y: q.Y / 1000 })));
  }
  function faces(lines) {
    const cuts = lines.map((w) => [0, 1]);
    for (let i = 0; i < lines.length; i++)
      for (let j = i + 1; j < lines.length; j++) {
        const q = intersection(lines[i].a, lines[i].b, lines[j].a, lines[j].b);
        if (q) {
          cuts[i].push(Math.max(0, Math.min(1, q.t)));
          cuts[j].push(Math.max(0, Math.min(1, q.s)));
        } else {
          for (const q of [lines[j].a, lines[j].b])
            if (onSegment(q, lines[i].a, lines[i].b))
              cuts[i].push(dist(lines[i].a, q) / dist(lines[i].a, lines[i].b));
          for (const q of [lines[i].a, lines[i].b])
            if (onSegment(q, lines[j].a, lines[j].b))
              cuts[j].push(dist(lines[j].a, q) / dist(lines[j].a, lines[j].b));
        }
      }
    const nodes = new Map(),
      edges = new Set(),
      key = (p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`,
      add = (a, b) => {
        const ka = key(a),
          kb = key(b);
        if (ka === kb) return;
        for (const [k, p] of [
          [ka, a],
          [kb, b],
        ])
          if (!nodes.has(k)) nodes.set(k, { p, next: new Set() });
        nodes.get(ka).next.add(kb);
        nodes.get(kb).next.add(ka);
        edges.add(ka + "|" + kb);
        edges.add(kb + "|" + ka);
      };
    lines.forEach((w, i) => {
      const ts = [...new Set(cuts[i].map((t) => +t.toFixed(8)))].sort(
        (a, b) => a - b,
      );
      for (let j = 1; j < ts.length; j++) {
        const at = (t) =>
          point(w.a.x + (w.b.x - w.a.x) * t, w.a.y + (w.b.y - w.a.y) * t);
        add(at(ts[j - 1]), at(ts[j]));
      }
    });
    const order = new Map(
      [...nodes].map(([k, n]) => [
        k,
        [...n.next].sort((a, b) => {
          const p = nodes.get(a).p,
            q = nodes.get(b).p;
          return (
            Math.atan2(p.y - n.p.y, p.x - n.p.x) -
            Math.atan2(q.y - n.p.y, q.x - n.p.x)
          );
        }),
      ]),
    );
    const visited = new Set(),
      out = [];
    for (const edge of edges) {
      if (visited.has(edge)) continue;
      let [a, b] = edge.split("|"),
        start = edge,
        poly = [],
        ok = false;
      for (let limit = 0; limit < edges.size + 1; limit++) {
        const k = a + "|" + b;
        if (visited.has(k)) {
          ok = k === start;
          break;
        }
        visited.add(k);
        poly.push(nodes.get(a).p);
        const around = order.get(b),
          idx = around.indexOf(a),
          next = around[(idx - 1 + around.length) % around.length];
        a = b;
        b = next;
      }
      if (ok && M.signed(poly) > 1 && M.simple(poly)) out.push(poly);
    }
    return out;
  }
  function recognize(p, floor) {
    const next = clone(p),
      walls = P.walls(p).filter((w) => w.floor === floor),
      polys = faces(walls),
      old = p.elements.filter(
        (e) =>
          e.floor === floor &&
          !e.isFurniture &&
          !["staircase", "balcony"].includes(e.type),
      );
    if (!polys.length) throw Error("No closed wall loops found");
    if (old.some((e) => e.locked))
      throw Error("Unlock rooms before replacing their boundaries");
    const oldIds = new Set(old.map((e) => e.id)),
      used = new Set(),
      created = polys.map((ps) => {
        const matches = old
            .map((e) => ({
              e,
              area: geomArea(
                PC.intersection(polygon(ps), polygon(M.points(e))),
              ),
            }))
            .sort((a, b) => b.area - a.area),
          source = matches[0]?.area > 0 ? matches[0].e : null,
          id = source && !used.has(source.id) ? source.id : P.uid();
        used.add(id);
        const x = Math.min(...ps.map((q) => q.x)),
          y = Math.min(...ps.map((q) => q.y));
        return {
          ...(source || { type: "living", floor, locked: false, rot: 0 }),
          id,
          x,
          y,
          w: Math.max(...ps.map((q) => q.x)) - x,
          h: Math.max(...ps.map((q) => q.y)) - y,
          points: ps.map((q) => point(q.x - x, q.y - y)),
        };
      });
    next.elements = p.elements.filter((e) => !oldIds.has(e.id)).concat(created);
    next.fixtures = [];
    for (const f of p.fixtures) {
      const original = p.elements[f.roomId];
      if (!oldIds.has(original.id)) {
        next.fixtures.push({
          ...f,
          roomId: next.elements.findIndex((e) => e.id === original.id),
        });
        continue;
      }
      const seg = M.openingSegment(p, f);
      let found;
      for (const e of created) {
        const ps = M.points(e);
        for (let i = 0; i < ps.length; i++) {
          const a = ps[i],
            b = ps[(i + 1) % ps.length];
          if (onSegment(seg.a, a, b) && onSegment(seg.b, a, b)) {
            found = { e, i, a, b };
            break;
          }
        }
        if (found) break;
      }
      if (found) {
        const offset = Math.min(dist(found.a, seg.a), dist(found.a, seg.b));
        next.fixtures.push({
          ...f,
          roomId: next.elements.indexOf(found.e),
          roomUid: found.e.id,
          edge: "segment:" + found.i,
          offset,
        });
      }
    }
    next.constraints = next.constraints.filter(
      (c) =>
        next.elements.some((e) => e.id === c.source) &&
        next.elements.some((e) => e.id === c.target),
    );
    return P.normalize(next);
  }
  function transformSelection(p, ids, fn) {
    const next = clone(p),
      set = new Set(ids);
    next.elements.forEach((e) => {
      if (!set.has(e.id)) return;
      if (e.locked) throw Error("Unlock selected objects");
      const pts = M.points(e).map(fn),
        x = Math.min(...pts.map((q) => q.x)),
        y = Math.min(...pts.map((q) => q.y));
      if (e.isFurniture) {
        e.x = x;
        e.y = y;
        return;
      }
      const prev = clone(e);
      e.x = x;
      e.y = y;
      e.w = Math.max(...pts.map((q) => q.x)) - x;
      e.h = Math.max(...pts.map((q) => q.y)) - y;
      e.points = pts.map((q) => point(q.x - x, q.y - y));
      next.fixtures
        .filter((f) => f.roomUid === e.id || p.elements[f.roomId]?.id === e.id)
        .forEach((f) => {
          const seg = M.openingSegment(p, f),
            a = fn(seg.a),
            b = fn(seg.b);
          const ps = M.points(e);
          let index = ps.findIndex(
            (q, i) =>
              onSegment(a, q, ps[(i + 1) % ps.length]) &&
              onSegment(b, q, ps[(i + 1) % ps.length]),
          );
          if (index < 0) throw Error("Opening no longer fits transformed wall");
          f.edge = "segment:" + index;
          f.offset = Math.min(dist(ps[index], a), dist(ps[index], b));
          f.size = dist(a, b);
          if (f.handing) f.handing = f.handing === "left" ? "right" : "left";
        });
    });
    return P.normalize(next);
  }
  function moveWall(p, id, delta, pushFace = false) {
    const next = clone(p),
      w = P.walls(p).find((w) => w.id === id);
    if (!w) throw Error("Wall no longer exists");
    const len = w.length,
      n = point(-(w.b.y - w.a.y) / len, (w.b.x - w.a.x) / len),
      shift = delta;
    for (const owner of w.owners) {
      if (owner.wallId) {
        const raw = next.planning.walls.find((v) => v.id === owner.wallId);
        if (raw) {
          raw.a.x += n.x * shift;
          raw.a.y += n.y * shift;
          raw.b.x += n.x * shift;
          raw.b.y += n.y * shift;
        }
        continue;
      }
      const e = next.elements[owner.index];
      if (e.locked) throw Error("Unlock adjoining rooms");
      const ps = M.points(e),
        old = clone(e),
        indices = [];
      for (let i = 0; i < ps.length; i++)
        if (onSegment(ps[i], w.a, w.b, 0.05)) indices.push(i);
      if (indices.length < 2)
        throw Error(
          "This wall is a partial room edge; split/edit its vertices before moving it",
        );
      indices.forEach((i) => {
        ps[i].x += n.x * shift;
        ps[i].y += n.y * shift;
      });
      const x = Math.min(...ps.map((q) => q.x)),
        y = Math.min(...ps.map((q) => q.y));
      e.x = x;
      e.y = y;
      e.w = Math.max(...ps.map((q) => q.x)) - x;
      e.h = Math.max(...ps.map((q) => q.y)) - y;
      e.points = ps.map((q) => point(q.x - x, q.y - y));
      for (const f of next.fixtures.filter((f) => f.roomId === owner.index)) {
        const edges = { top: 0, right: 1, bottom: 2, left: 3 };
        if (!String(f.edge).startsWith("segment:")) {
          if (["bottom", "left"].includes(f.edge))
            f.offset =
              (f.edge === "bottom" ? old.w : old.h) - f.offset - f.size;
          f.edge = "segment:" + edges[f.edge];
        }
      }
    }
    return P.normalize(next);
  }
  function geometricConstraints(p) {
    const next = clone(p),
      walls = new Map(next.planning.walls.map((w) => [w.id, w]));
    const rules = next.design.constraints,
      visiting = new Set(),
      done = new Set(),
      ordered = [],
      targets = new Map();
    for (const c of rules) {
      if (c.axis && !["w", "h"].includes(c.axis))
        throw Error("Invalid equal-dimension axis");
      const slot =
        c.target +
        ":" +
        (["parallel", "perpendicular", "fixed-angle"].includes(c.kind)
          ? "angle"
          : c.kind + ":" + (c.axis || "w"));
      if (targets.has(slot))
        throw Error("Conflicting geometric constraints on the same target");
      targets.set(slot, c);
    }
    const visit = (id) => {
      if (done.has(id)) return;
      if (visiting.has(id)) throw Error("Cyclic geometric constraints");
      visiting.add(id);
      const incoming = rules.filter((c) => c.target === id);
      for (const c of incoming) if (c.kind !== "fixed-angle") visit(c.source);
      ordered.push(
        ...incoming.sort(
          (a, b) =>
            (a.kind === "coincident" ? -1 : 1) -
            (b.kind === "coincident" ? -1 : 1),
        ),
      );
      visiting.delete(id);
      done.add(id);
    };
    rules.forEach((c) => visit(c.target));
    for (const c of ordered) {
      if (next.design.objectProperties[c.target]?.locked)
        throw Error("Unlock the constrained object");
      const a = walls.get(c.source),
        b = walls.get(c.target);
      if (c.kind === "equal-length" && (!a || !b)) {
        const source = next.elements.find((e) => e.id === c.source),
          target = next.elements.find((e) => e.id === c.target);
        if (!source || !target || target.locked || target.points)
          throw Error("Equal room dimensions require unlocked rectangles");
        target[c.axis || "w"] = source[c.axis || "w"];
        continue;
      }
      if (!b || (c.kind !== "fixed-angle" && !a))
        throw Error("Constraint refers to a missing wall");
      if (p.planning.layers.walls.locked)
        throw Error("Unlock walls before solving geometric constraints");
      const len = c.kind === "equal-length" ? dist(a.a, a.b) : dist(b.a, b.b);
      if (c.kind === "coincident") {
        const dx = a.b.x - b.a.x,
          dy = a.b.y - b.a.y;
        b.a = clone(a.b);
        b.b = point(b.b.x + dx, b.b.y + dy);
        continue;
      }
      let angle =
        c.kind === "fixed-angle"
          ? (c.angle * Math.PI) / 180
          : Math.atan2(a.b.y - a.a.y, a.b.x - a.a.x) +
            (c.kind === "perpendicular" ? Math.PI / 2 : 0);
      if (c.kind === "equal-length")
        angle = Math.atan2(b.b.y - b.a.y, b.b.x - b.a.x);
      b.b = point(b.a.x + Math.cos(angle) * len, b.a.y + Math.sin(angle) * len);
    }
    return next;
  }
  const oldSolve = P.solveConstraints;
  P.solveConstraints = (p) => oldSolve(geometricConstraints(p));
  function narrow(p, e) {
    const c = clear(p, e),
      ps = c.polygon;
    if (ps.length < 4) return { width: Math.min(c.w, c.h), a: null, b: null };
    let best = { width: Math.min(c.w, c.h), a: null, b: null };
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 2; j < ps.length; j++) {
        if (i === 0 && j === ps.length - 1) continue;
        const a = ps[i],
          b = ps[(i + 1) % ps.length],
          c = ps[j],
          d = ps[(j + 1) % ps.length],
          u = point(b.x - a.x, b.y - a.y),
          v = point(d.x - c.x, d.y - c.y),
          lu = dist(a, b),
          lv = dist(c, d);
        if (Math.abs(u.x * v.y - u.y * v.x) / (lu * lv) > 0.05) continue;
        const t = ((c.x - a.x) * u.x + (c.y - a.y) * u.y) / (lu * lu),
          t2 = ((d.x - a.x) * u.x + (d.y - a.y) * u.y) / (lu * lu),
          lo = Math.max(0, Math.min(t, t2)),
          hi = Math.min(1, Math.max(t, t2));
        if (hi - lo < 0.05) continue;
        const q = point(
            a.x + (u.x * (lo + hi)) / 2,
            a.y + (u.y * (lo + hi)) / 2,
          ),
          r = point(
            c.x +
              v.x *
                Math.max(
                  0,
                  Math.min(
                    1,
                    ((q.x - c.x) * v.x + (q.y - c.y) * v.y) / (lv * lv),
                  ),
                ),
            c.y +
              v.y *
                Math.max(
                  0,
                  Math.min(
                    1,
                    ((q.x - c.x) * v.x + (q.y - c.y) * v.y) / (lv * lv),
                  ),
                ),
          ),
          width = dist(q, r);
        if (
          width < best.width &&
          M.inside(point((q.x + r.x) / 2, (q.y + r.y) / 2), ps)
        )
          best = { width, a: q, b: r };
      }
    return best;
  }
  const archWalls = P.walls;
  P.walls = function (p) {
    const result = archWalls(p);
    for (const wall of result) {
      const ownerFixtures = p.fixtures.filter(
        (f) =>
          f.arch > 0 &&
          wall.owners.some((o) => o.index === f.roomId && o.edge === f.edge),
      );
      if (!ownerFixtures.length) continue;
      const shapes = wall.openings.map((o) => {
        const f = ownerFixtures.find((f) => f.type === o.type);
        if (!f) return [o];
        const seg = M.openingSegment(p, f),
          mid = point((seg.a.x + seg.b.x) / 2, (seg.a.y + seg.b.y) / 2),
          center = dist(wall.a, mid);
        return Array.from({ length: 16 }, (_, i) => {
          const start = o.start + ((o.end - o.start) * i) / 16,
            end = o.start + ((o.end - o.start) * (i + 1)) / 16,
            u = ((start + end) / 2 - center) / (f.size / 2),
            top =
              f.height - f.arch + f.arch * Math.sqrt(Math.max(0, 1 - u * u));
          return { ...o, start, end, height: Math.max(1, top) };
        });
      });
      wall.openings = shapes.flat();
    }
    return result;
  };
  const oldConnectivity = M.connectivity;
  M.connectivity = function (p, floor, walls) {
    const data = oldConnectivity(p, floor, walls),
      external = new Set();
    p.fixtures
      .filter((f) => f.type === "door" && p.elements[f.roomId]?.floor === floor)
      .forEach((f) => {
        if (exterior(p, f) || p.design?.entrances.includes(f.id))
          external.add(f.roomId);
      });
    const reachable = new Set(external);
    for (let i = 0; i < data.rooms.length; i++)
      data.links.forEach((l) => {
        if (reachable.has(l.a)) reachable.add(l.b);
        if (reachable.has(l.b)) reachable.add(l.a);
      });
    return {
      ...data,
      rooms: data.rooms.map((r) => ({
        ...r,
        external: external.has(r.index),
        reachable: reachable.has(r.index),
      })),
    };
  };
  function requirementReport(p) {
    return p.design.requirements.map((r) => {
      const room = p.elements.find((e) => e.id === r.room),
        other = p.elements.find((e) => e.id === r.other);
      let pass = false,
        measured = "Missing room";
      if (r.kind === "room" && room) {
        const c = clear(p, room);
        pass =
          c.area / 144 >= (r.minArea || 0) &&
          room.w >= (r.width || 0) &&
          room.h >= (r.depth || 0);
        measured = `${(c.area / 144).toFixed(1)} sq ft; ${room.w.toFixed(1)} × ${room.h.toFixed(1)} in`;
        if (r.zone)
          pass =
            pass &&
            P.zone(
              room.x + room.w / 2,
              room.y + room.h / 2,
              P.inches(p.plot.inW, p.unit),
              P.inches(p.plot.inH, p.unit),
              p.compass,
            ) === r.zone;
      }
      if (["adjacent", "private-access"].includes(r.kind) && room && other) {
        const a = p.elements.indexOf(room),
          b = p.elements.indexOf(other),
          links = M.connectivity(p, room.floor).links.filter(
            (l) => l.a === a || l.b === a,
          );
        pass =
          r.kind === "adjacent"
            ? P.walls(p).some(
                (w) =>
                  w.owners.some((o) => o.index === a) &&
                  w.owners.some((o) => o.index === b),
              )
            : links.length === 1 && links.some((l) => l.a === b || l.b === b);
        measured = pass
          ? "Relationship satisfied"
          : "Required connection missing or shared with other rooms";
      }
      if (r.kind === "circulation") {
        const graph = M.connectivity(p, room?.floor ?? p.currentFloor);
        pass = graph.rooms.every((r) => r.reachable);
        measured =
          graph.rooms.filter((r) => r.reachable).length +
          "/" +
          graph.rooms.length +
          " rooms connected";
      }
      return { ...r, pass, measured };
    });
  }
  function analyze(p) {
    const results = [],
      add = (
        code,
        e,
        text,
        measured,
        target,
        severity = "warning",
        geometry = null,
      ) =>
        results.push({
          code,
          id: e?.id,
          floor: e?.floor ?? p.currentFloor,
          text,
          measured,
          target,
          severity,
          geometry,
        });
    for (const e of p.elements) {
      if (e.isFurniture) {
        const w = P.inches(p.plot.inW, p.unit),
          h = P.inches(p.plot.inH, p.unit);
        if (M.points(e).some((q) => q.x < 0 || q.y < 0 || q.x > w || q.y > h))
          add(
            "rotated-boundary",
            e,
            "Furniture crosses the buildable boundary",
            "Rotated footprint",
            "Inside boundary",
            "error",
          );
        continue;
      }
      const n = narrow(p, e);
      if (n.width < p.design.accessibility.width)
        add(
          "passage",
          e,
          "Narrow local passage",
          n.width.toFixed(1) + " in",
          p.design.accessibility.width + " in",
          "warning",
          n,
        );
      if (e.type === "staircase") {
        const d = M.stairs(e),
          ceilings = p.design.ceilings.filter(
            (c) =>
              c.floor === e.floor && M.overlap(e, { ...c, type: "ceiling" }),
          ),
          head = ceilings.length
            ? Math.min(...ceilings.map((c) => c.height)) - d.rise
            : p.wallSettings.height;
        const upper = p.elements.some(
          (s) =>
            s.type === "staircase" &&
            s.floor === e.floor + 1 &&
            s.stackId === e.stackId,
        );
        if (ceilings.length && head < d.headroom)
          add(
            "headroom",
            e,
            "Ceiling intersects required stair headroom",
            head.toFixed(1) + " in",
            d.headroom + " in",
            "error",
          );
        if (e.floor < p.floorCount - 1 && !upper && !e.cutAllFloors)
          add(
            "stair-opening",
            e,
            "Review the upper landing and slab opening",
            "No linked upper stair",
            "Aligned upper landing",
          );
      }
      if (["toilet", "kitchen"].includes(e.type) && e.floor > 0) {
        const below = p.elements.some(
          (b) =>
            ["toilet", "kitchen"].includes(b.type) &&
            b.floor === e.floor - 1 &&
            M.overlap(e, b),
        );
        if (!below)
          add(
            "wet-stack",
            e,
            "Wet area is not stacked over a wet area",
            "No lower overlap",
            "Aligned wet zone or routed shaft",
          );
      }
      if (e.type === "bedroom" || e.type === "toilet") {
        const center = point(e.x + e.w / 2, e.y + e.h / 2);
        p.fixtures
          .filter(
            (f) =>
              f.type === "door" &&
              exterior(p, f) &&
              p.elements[f.roomId].floor === e.floor,
          )
          .forEach((f) => {
            const s = M.openingSegment(p, f),
              a = point((s.a.x + s.b.x) / 2, (s.a.y + s.b.y) / 2);
            const blocked = P.walls(p).some((w) => {
              const q = intersection(a, center, w.a, w.b);
              return (
                q &&
                q.t > 0.02 &&
                q.t < 0.98 &&
                !w.openings.some((o) => {
                  const d = dist(w.a, q);
                  return d >= o.start && d <= o.end;
                })
              );
            });
            if (!blocked)
              add(
                "privacy",
                e,
                "Direct entrance sightline into private space",
                "Visible from entrance",
                "Screen or redirect access",
                "suggestion",
                { a, b: center },
              );
          });
      }
    }
    for (const f of p.fixtures.filter((f) => f.type === "window")) {
      const s = M.openingSegment(p, f),
        mid = point((s.a.x + s.b.x) / 2, (s.a.y + s.b.y) / 2);
      for (const n of p.design.neighbours) {
        const nearest = point(
          Math.max(n.x, Math.min(mid.x, n.x + n.w)),
          Math.max(n.y, Math.min(mid.y, n.y + n.h)),
        );
        if (dist(mid, nearest) < 60)
          add(
            "window-obstruction",
            s.room,
            "Window faces a nearby mass",
            dist(mid, nearest).toFixed(1) + " in",
            "Review daylight and ventilation",
          );
      }
    }
    for (const r of requirementReport(p).filter((r) => !r.pass))
      add(
        "requirement",
        p.elements.find((e) => e.id === r.room),
        r.label || r.kind,
        r.measured,
        r.priority,
        r.priority === "mandatory" ? "error" : "warning",
      );
    return results;
  }
  function sun(site) {
    const date = new Date(site.date + "T12:00:00Z"),
      year = new Date(Date.UTC(date.getUTCFullYear(), 0, 0)),
      day = (date - year) / 86400000,
      decl =
        (23.45 *
          Math.sin((((360 * (284 + day)) / 365) * Math.PI) / 180) *
          Math.PI) /
        180,
      lat = (site.latitude * Math.PI) / 180,
      B = (((360 * (day - 81)) / 364) * Math.PI) / 180,
      eq = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B),
      solar =
        site.hour + (4 * (site.longitude - site.utcOffset * 15) + eq) / 60,
      ha = ((solar - 12) * 15 * Math.PI) / 180,
      alt = Math.asin(
        Math.sin(lat) * Math.sin(decl) +
          Math.cos(lat) * Math.cos(decl) * Math.cos(ha),
      ),
      az =
        Math.atan2(
          Math.sin(ha),
          Math.cos(ha) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat),
        ) + Math.PI;
    return {
      altitude: (alt * 180) / Math.PI,
      azimuth: ((az * 180) / Math.PI + 360) % 360,
    };
  }
  function shadows(p) {
    const s = sun(p.design.site);
    if (s.altitude <= 0) return [];
    const angle = ((s.azimuth + 180) * Math.PI) / 180;
    return p.design.neighbours.map((n) => {
      const length = n.height / Math.tan((s.altitude * Math.PI) / 180),
        dx = Math.sin(angle) * length,
        dy = -Math.cos(angle) * length;
      return {
        ...n,
        dx,
        dy,
        polygon: PC.union(
          rect(n.x, n.y, n.w, n.h),
          polygon([
            point(n.x, n.y),
            point(n.x + n.w, n.y),
            point(n.x + n.w + dx, n.y + dy),
            point(n.x + dx, n.y + dy),
          ]),
          polygon([
            point(n.x + n.w, n.y),
            point(n.x + n.w, n.y + n.h),
            point(n.x + n.w + dx, n.y + n.h + dy),
            point(n.x + n.w + dx, n.y + dy),
          ]),
          rect(n.x + dx, n.y + dy, n.w, n.h),
        ),
      };
    });
  }
  function route(p, start, end, width = 0, access = null) {
    const floor = p.currentFloor,
      w = P.inches(p.plot.inW, p.unit),
      h = P.inches(p.plot.inH, p.unit),
      step = Math.max(6, Math.max(w, h) / 100),
      cols = Math.ceil(w / step),
      rows = Math.ceil(h / step),
      walls = P.walls(p).filter((v) => v.floor === floor),
      obstacles = walls.flatMap((w) => {
        const cuts = [
          ...new Set([
            0,
            w.length,
            ...w.openings.flatMap((o) => [o.start, o.end]),
          ]),
        ].sort((a, b) => a - b);
        return cuts
          .slice(0, -1)
          .filter(
            (a, i) =>
              !w.openings.some(
                (o) =>
                  (a + cuts[i + 1]) / 2 > o.start &&
                  (a + cuts[i + 1]) / 2 < o.end &&
                  o.type === "door",
              ),
          )
          .map((a, i) => {
            const b = cuts[cuts.indexOf(a) + 1],
              at = (t) =>
                point(
                  w.a.x + ((w.b.x - w.a.x) * t) / w.length,
                  w.a.y + ((w.b.y - w.a.y) * t) / w.length,
                );
            return wallStrip(
              { ...w, a: at(a), b: at(b), thickness: w.thickness + width },
              false,
            );
          });
      });
    const blocked = (q) =>
      obstacles.some((g) =>
        M.inside(
          q,
          g[0].map(([x, y]) => point(x, y)),
        ),
      ) ||
      p.elements.some(
        (e) =>
          e.isFurniture &&
          e.floor === floor &&
          M.inside(
            q,
            M.points({
              ...e,
              x: e.x - width / 2,
              y: e.y - width / 2,
              w: e.w + width,
              h: e.h + width,
            }),
          ),
      );
    if (blocked(start) || blocked(end))
      return { found: false, points: [], step };
    const key = (q) =>
        Math.max(0, Math.min(cols - 1, Math.floor(q.x / step))) +
        "," +
        Math.max(0, Math.min(rows - 1, Math.floor(q.y / step))),
      from = key(start),
      to = key(end),
      queue = [from],
      prev = new Map([[from, null]]);
    for (let i = 0; i < queue.length && i < 12000; i++) {
      const k = queue[i];
      if (k === to) break;
      const [x, y] = k.split(",").map(Number);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const a = x + dx,
          b = y + dy,
          n = a + "," + b;
        if (
          a < 0 ||
          b < 0 ||
          a >= cols ||
          b >= rows ||
          prev.has(n) ||
          blocked(point((a + 0.5) * step, (b + 0.5) * step)) ||
          obstacles.some((g) =>
            g[0].some((q, i, ring) =>
              intersection(
                point((x + 0.5) * step, (y + 0.5) * step),
                point((a + 0.5) * step, (b + 0.5) * step),
                point(...q),
                point(...ring[(i + 1) % ring.length]),
              ),
            ),
          )
        )
          continue;
        prev.set(n, k);
        queue.push(n);
      }
    }
    if (!prev.has(to)) return { found: false, points: [], step };
    const ps = [];
    for (let k = to; k; k = prev.get(k)) {
      const [x, y] = k.split(",").map(Number);
      ps.push(point((x + 0.5) * step, (y + 0.5) * step));
    }
    ps.reverse();
    const result = { found: true, points: ps, step };
    if (access) {
      // Turning circles are sampled at endpoints and direction changes against wall and furniture solids.
      const solids = P.walls(p)
        .filter((w) => w.floor === floor)
        .flatMap((w) => {
          const cuts = [
            ...new Set([
              0,
              w.length,
              ...w.openings
                .filter((o) => o.type === "door")
                .flatMap((o) => [o.start, o.end]),
            ]),
          ].sort((a, b) => a - b);
          return cuts
            .slice(0, -1)
            .filter(
              (a, i) =>
                !w.openings.some(
                  (o) =>
                    o.type === "door" &&
                    (a + cuts[i + 1]) / 2 >= o.start &&
                    (a + cuts[i + 1]) / 2 <= o.end,
                ),
            )
            .map((a) => {
              const b = cuts[cuts.indexOf(a) + 1],
                at = (t) =>
                  point(
                    w.a.x + ((w.b.x - w.a.x) * t) / w.length,
                    w.a.y + ((w.b.y - w.a.y) * t) / w.length,
                  );
              return wallStrip({ ...w, a: at(a), b: at(b) }, false);
            });
        })
        .concat(
          p.elements
            .filter((e) => e.isFurniture && e.floor === floor)
            .map((e) => polygon(M.points(e))),
        );
      const turns = ps.filter(
        (q, i) =>
          !i ||
          i === ps.length - 1 ||
          Math.abs(cross(ps[i - 1], q, ps[i + 1])) > EPS,
      );
      result.turning = turns.map((q) => {
        const circle = polygon(
          Array.from({ length: 32 }, (_, i) =>
            point(
              q.x + (access.turn / 2) * Math.cos((i * Math.PI) / 16),
              q.y + (access.turn / 2) * Math.sin((i * Math.PI) / 16),
            ),
          ),
        );
        return {
          point: q,
          pass: !solids.some(
            (g) => geomArea(PC.intersection(circle, g)) > 0.01,
          ),
        };
      });
      result.levels = [];
      let previous;
      for (const q of ps) {
        const room = p.elements.find(
          (e) =>
            !e.isFurniture && e.floor === floor && M.inside(q, M.points(e)),
        );
        if (!room) continue;
        const level = p.design.roomProperties[room.id]?.level || 0;
        if (
          previous &&
          previous.id !== room.id &&
          Math.abs(level - previous.level) > access.maxStep
        )
          result.levels.push({
            from: previous.id,
            to: room.id,
            change: Math.abs(level - previous.level),
          });
        previous = { id: room.id, level };
      }
    }
    return result;
  }
  function clashes(p) {
    const out = [],
      segments = p.planning.services.flatMap((s) =>
        s.points.slice(1).map((b, i) => ({ s, a: s.points[i], b })),
      );
    for (let i = 0; i < segments.length; i++)
      for (let j = i + 1; j < segments.length; j++) {
        const a = segments[i],
          b = segments[j];
        if (a.s.id === b.s.id || a.s.floor !== b.s.floor) continue;
        const q = intersection(a.a, a.b, b.a, b.b);
        if (q)
          out.push({
            a: a.s.id,
            b: b.s.id,
            floor: a.s.floor,
            point: q,
            text: `${a.s.label || a.s.kind} crosses ${b.s.label || b.s.kind}`,
          });
      }
    for (const s of segments)
      for (const w of P.walls(p).filter((w) => w.floor === s.s.floor)) {
        const q = intersection(s.a, s.b, w.a, w.b);
        if (
          q &&
          !w.openings.some(
            (o) => dist(w.a, q) >= o.start && dist(w.a, q) <= o.end,
          )
        )
          out.push({
            a: s.s.id,
            b: w.id,
            floor: s.s.floor,
            point: q,
            text: "Service crosses a solid wall; detail penetration",
          });
      }
    return out;
  }
  function finishes(p) {
    const ws = P.walls(p);
    return p.elements
      .filter((e) => !e.isFurniture)
      .map((e) => {
        const c = clear(p, e, ws),
          ring = c.polygon,
          perimeter = ring.reduce(
            (s, a, i) => s + dist(a, ring[(i + 1) % ring.length]),
            0,
          ),
          f = p.design.finishes[e.id] || {};
        return {
          id: e.id,
          name: e.customName || e.type,
          floor: e.floor,
          area: c.area / 144,
          perimeter: perimeter / 12,
          wallArea: (perimeter * p.wallSettings.height) / 144,
          floorFinish: f.floor || "",
          wall: f.wall || "",
          ceiling: f.ceiling || "",
          skirting: f.skirting || "",
        };
      });
  }
  function tiles(p, id) {
    const e = p.elements.find((e) => e.id === id);
    if (!e) throw Error("Select a room");
    const t = p.design.tiles[id] || { w: 24, h: 24, joint: 0.125, angle: 0 },
      clearGeom = clear(p, e).geometry,
      box = M.points(e),
      cos = Math.cos((t.angle * Math.PI) / 180),
      sin = Math.sin((t.angle * Math.PI) / 180),
      origin = point(e.x + e.w / 2, e.y + e.h / 2),
      rotate = (q) =>
        point(
          origin.x + (q.x - origin.x) * cos - (q.y - origin.y) * sin,
          origin.y + (q.x - origin.x) * sin + (q.y - origin.y) * cos,
        ),
      extent = Math.hypot(e.w, e.h),
      out = [];
    if (extent ** 2 / (t.w * t.h) > 8000)
      throw Error("Tile preview exceeds 8000 cells; use larger tile sizes");
    for (let y = origin.y - extent; y < origin.y + extent; y += t.h + t.joint)
      for (
        let x = origin.x - extent;
        x < origin.x + extent;
        x += t.w + t.joint
      ) {
        const shape = polygon(
            [
              point(x, y),
              point(x + t.w, y),
              point(x + t.w, y + t.h),
              point(x, y + t.h),
            ].map(rotate),
          ),
          cut = PC.intersection(shape, clearGeom),
          area = geomArea(cut);
        if (area > 0.01)
          out.push({
            geometry: cut,
            full: Math.abs(area - t.w * t.h) < 0.1,
            area,
          });
      }
    return {
      tiles: out,
      total: out.length,
      full: out.filter((t) => t.full).length,
      cuts: out.filter((t) => !t.full).length,
      wastage: out.length
        ? (100 *
            (out.length * t.w * t.h - out.reduce((s, t) => s + t.area, 0))) /
          (out.length * t.w * t.h)
        : 0,
    };
  }
  function preflight(p) {
    const out = [];
    if (!p.name.trim()) out.push("Project name missing");
    for (const e of p.elements.filter((e) => !e.isFurniture)) {
      if (!e.customName) out.push(`Floor ${e.floor}: unnamed ${e.type}`);
      if (e.w < 36 || e.h < 36)
        out.push(
          (e.customName || e.type) + ": small space may have unreadable labels",
        );
      if (e.points && e.points.length > 40)
        out.push((e.customName || e.type) + ": complex outline");
    }
    for (const f of p.fixtures)
      if (!f.tag) out.push(`Opening ${f.id.slice(0, 8)} needs a schedule tag`);
    for (const sheet of p.design.sheets) {
      if (!["A3", "A4"].includes(sheet.paper))
        out.push("Unsupported sheet paper");
      if (sheet.scale < 10 || sheet.scale > 500) out.push("Review sheet scale");
    }
    return out;
  }
  const oldQuantities = M.quantities;
  M.quantities = function (p) {
    const q = oldQuantities(p);
    q.floors.forEach((f) => {
      f.sumFloorArea = p.elements
        .filter((e) => !e.isFurniture && e.floor === f.floor)
        .reduce((sum, e) => sum + clear(p, e).area / 144, 0);
      f.sumBoundArea = f.boundArea;
      f.floorArea = geomArea(floorUnion(p, f.floor, true)) / 144;
      f.boundArea = geomArea(floorUnion(p, f.floor)) / 144;
      const c = p.planning.cost;
      f.estimate =
        (f.wall * c.wall + f.paint * c.paint + f.floorArea * c.floor) *
        (1 + c.wastage / 100);
    });
    q.total = q.floors.reduce((s, f) => s + f.estimate, 0);
    return q;
  };
  const originalAnalyze = M.analyze;
  M.analyze = function (p, scope = "all") {
    const copy = {
        ...p,
        elements: p.elements.map((e) =>
          e.isFurniture && e.rot % 180 === 90
            ? { ...e, w: e.h, h: e.w, rot: 0 }
            : e,
        ),
      },
      a = originalAnalyze(copy, scope);
    a.results = a.results.filter(
      (r) => !["route", "area", "width", "clear-area"].includes(r.code),
    );
    for (const e of p.elements.filter(
      (e) => !e.isFurniture && (scope === "all" || e.floor === +scope),
    )) {
      const rule = p.planning.rules[e.type];
      if (!rule) continue;
      const c = clear(p, e);
      for (const [code, value, target, label] of [
        ["area", c.area / 144, rule.minAreaSqft, "Clear area (sq ft)"],
        [
          "width",
          narrow(p, e).width,
          rule.minDimInches,
          "Local clear width (in)",
        ],
      ]) {
        const check = {
          id: e.id,
          index: p.elements.indexOf(e),
          floor: e.floor,
          code,
          pass: value >= target,
          text: `${label}: ${value.toFixed(1)}; target ${target}`,
          severity: "warning",
        };
        a.checks = a.checks.filter((r) => !(r.id === e.id && r.code === code));
        a.checks.push(check);
        if (!check.pass) a.results.push(check);
      }
    }
    a.passed = a.checks.filter((r) => r.pass).length;
    a.total = a.checks.length;
    a.score = a.total ? Math.round((a.passed / a.total) * 100) : null;
    const floors =
      scope === "all"
        ? Array.from({ length: p.floorCount }, (_, i) => i)
        : [+scope];
    for (const floor of floors)
      for (const r of M.connectivity(p, floor).rooms.filter(
        (r) => !r.reachable,
      ))
        a.results.push({
          id: r.id,
          index: r.index,
          floor,
          code: "route",
          pass: false,
          text: r.name + ": no route to the outside building envelope",
          severity: "warning",
        });
    return a;
  };
  function dxfParse(text) {
    if (text.length > 8e6) throw Error("DXF exceeds 8 MB");
    const ls = text.replace(/\r/g, "").split("\n"),
      pairs = [];
    for (let i = 0; i + 1 < ls.length; i += 2) {
      const code = Number(ls[i].trim());
      if (!Number.isInteger(code)) throw Error("Malformed DXF group code");
      pairs.push([code, ls[i + 1].trim()]);
    }
    let unit = 1;
    for (let i = 0; i < pairs.length; i++)
      if (pairs[i][0] === 9 && pairs[i][1] === "$INSUNITS")
        unit = Number(pairs[i + 1]?.[1]);
    const factor = {
      0: 1,
      1: 1,
      2: 12,
      4: 1 / 25.4,
      5: 1 / 2.54,
      6: 100 / 2.54,
    }[unit];
    if (!factor) throw Error("Unsupported DXF units");
    const entities = [],
      unsupported = {};
    let inEntities = false;
    for (let i = 0; i < pairs.length; i++) {
      if (pairs[i][0] === 2 && pairs[i][1] === "ENTITIES") {
        inEntities = true;
        continue;
      }
      if (pairs[i][0] === 0 && pairs[i][1] === "ENDSEC") inEntities = false;
      if (
        inEntities &&
        pairs[i][0] === 0 &&
        !["LINE", "LWPOLYLINE", "TEXT", "CIRCLE", "ENDSEC"].includes(
          pairs[i][1],
        )
      ) {
        unsupported[pairs[i][1]] = (unsupported[pairs[i][1]] || 0) + 1;
      }
      if (!inEntities) continue;
      if (
        pairs[i][0] !== 0 ||
        !["LINE", "LWPOLYLINE", "TEXT", "CIRCLE"].includes(pairs[i][1])
      )
        continue;
      const type = pairs[i][1],
        data = [];
      for (i++; i < pairs.length && pairs[i][0] !== 0; i++) data.push(pairs[i]);
      i--;
      const val = (code, def = 0) =>
          Number(data.find((p) => p[0] === code)?.[1] ?? def),
        layer = data.find((p) => p[0] === 8)?.[1] || "0";
      if (type === "LINE")
        entities.push({
          type,
          layer,
          a: point(val(10) * factor, -val(20) * factor),
          b: point(val(11) * factor, -val(21) * factor),
        });
      if (type === "LWPOLYLINE") {
        if (data.some(([code, value]) => code === 42 && Number(value) !== 0)) {
          unsupported["LWPOLYLINE with arcs"] =
            (unsupported["LWPOLYLINE with arcs"] || 0) + 1;
          continue;
        }
        const pts = [];
        for (let n = 0; n < data.length; n++)
          if (data[n][0] === 10) {
            const y = data.slice(n + 1).find((p) => p[0] === 20);
            pts.push(
              point(Number(data[n][1]) * factor, -Number(y?.[1]) * factor),
            );
          }
        entities.push({ type, layer, points: pts, closed: !!(val(70) & 1) });
      }
      if (type === "TEXT")
        entities.push({
          type,
          layer,
          x: val(10) * factor,
          y: -val(20) * factor,
          text: data.find((p) => p[0] === 1)?.[1] || "",
        });
      if (type === "CIRCLE")
        entities.push({
          type,
          layer,
          x: val(10) * factor,
          y: -val(20) * factor,
          r: val(40) * factor,
        });
    }
    if (entities.length > 15000) throw Error("DXF has too many entities");
    return {
      entities,
      unsupported,
      units: unit,
      factor,
      layers: [...new Set(entities.map((e) => e.layer))],
    };
  }
  function ifc(p) {
    let n = 1,
      lines = [],
      add = (s) => {
        const id = n++;
        lines.push("#" + id + "=" + s + ";");
        return "#" + id;
      },
      str = (s) =>
        "'" +
        String(s)
          .replace(/'/g, "''")
          .replace(/[^\x20-\x7e]/g, "?") +
        "'",
      guid = () => {
        const alphabet =
          "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
        let s = "0";
        for (let i = 0; i < 21; i++)
          s += alphabet[Math.floor(Math.random() * 64)];
        return str(s);
      },
      pt = (x, y, z = 0) =>
        add(
          `IFCCARTESIANPOINT((${(x * 25.4).toFixed(3)},${(y * 25.4).toFixed(3)},${(z * 25.4).toFixed(3)}))`,
        );
    const person = add("IFCPERSON($,$,'ArchCAD',$,$,$,$,$)"),
      organization = add("IFCORGANIZATION($,'ArchCAD',$,$,$)"),
      actor = add(`IFCPERSONANDORGANIZATION(${person},${organization},$)`),
      app = add(`IFCAPPLICATION(${organization},'2.0','ArchCAD','ArchCAD')`),
      owner = add(
        `IFCOWNERHISTORY(${actor},${app},$,.ADDED.,$,$,$,${Math.floor(Date.now() / 1000)})`,
      );
    const origin = pt(0, 0),
      dir = add("IFCDIRECTION((0.,0.,1.))"),
      xdir = add("IFCDIRECTION((1.,0.,0.))"),
      axis = add(`IFCAXIS2PLACEMENT3D(${origin},${dir},${xdir})`),
      context = add(
        `IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,0.001,${axis},$)`,
      ),
      unit = add("IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.)"),
      units = add(`IFCUNITASSIGNMENT((${unit}))`),
      project = add(
        `IFCPROJECT(${guid()},${owner},${str(p.name)},$,$,$,$,(${context}),${units})`,
      ),
      local = () => add(`IFCLOCALPLACEMENT($,${axis})`),
      site = add(
        `IFCSITE(${guid()},${owner},'Site',$,$,${local()},$,$,.ELEMENT.,$,$,$,$,$)`,
      ),
      building = add(
        `IFCBUILDING(${guid()},${owner},${str(p.name)},$,$,${local()},$,$,.ELEMENT.,$,$,$)`,
      );
    add(`IFCRELAGGREGATES(${guid()},${owner},$,$,${project},(${site}))`);
    add(`IFCRELAGGREGATES(${guid()},${owner},$,$,${site},(${building}))`);
    for (let f = 0; f < p.floorCount; f++) {
      const floor = add(
        `IFCBUILDINGSTOREY(${guid()},${owner},${str(p.planning.floorNames?.[f] || "Floor " + f)},$,$,${local()},$,$,.ELEMENT.,${(f * p.wallSettings.height * 25.4).toFixed(3)})`,
      );
      add(`IFCRELAGGREGATES(${guid()},${owner},$,$,${building},(${floor}))`);
      const walls = [];
      for (const w of P.walls(p).filter((w) => w.floor === f)) {
        const poly = wallStrip(w, false)[0],
          points = poly
            .concat([poly[0]])
            .map(([x, y]) =>
              add(
                `IFCCARTESIANPOINT((${(x * 25.4).toFixed(3)},${(y * 25.4).toFixed(3)}))`,
              ),
            ),
          line = add(`IFCPOLYLINE((${points.join(",")}))`),
          profile = add(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,${line})`),
          base = add(
            `IFCAXIS2PLACEMENT3D(${pt(0, 0, f * p.wallSettings.height)},${dir},${xdir})`,
          ),
          solid = add(
            `IFCEXTRUDEDAREASOLID(${profile},${base},${dir},${(p.wallSettings.height * 25.4).toFixed(3)})`,
          ),
          shape = add(
            `IFCSHAPEREPRESENTATION(${context},'Body','SweptSolid',(${solid}))`,
          ),
          representation = add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${shape}))`),
          wall = add(
            `IFCWALL(${guid()},${owner},${str(w.id)},$,$,${local()},${representation},$)`,
          );
        walls.push(wall);
      }
      if (walls.length)
        add(
          `IFCRELCONTAINEDINSPATIALSTRUCTURE(${guid()},${owner},$,$,(${walls.join(",")}),${floor})`,
        );
      for (const e of p.elements.filter(
        (e) => e.floor === f && !e.isFurniture,
      )) {
        const space = add(
          `IFCSPACE(${guid()},${owner},${str(e.customName || e.type)},$,$,${local()},$,$,.ELEMENT.,.INTERNAL.,$)`,
        );
        add(`IFCRELAGGREGATES(${guid()},${owner},$,$,${floor},(${space}))`);
      }
    }
    return `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ArchCAD IFC2X3 coordination export; gross wall solids, opening schedule in project package'),'2;1');\nFILE_NAME('ArchCAD.ifc','${new Date().toISOString()}',(''),(''),'ArchCAD','ArchCAD','');\nFILE_SCHEMA(('IFC2X3'));\nENDSEC;\nDATA;\n${lines.join("\n")}\nENDSEC;\nEND-ISO-10303-21;`;
  }
  function alternatives(p, req) {
    const out = [];
    for (let v = 0; v < 3; v++) {
      try {
        let next = M.generate(p, req, v),
          report = requirementReport(next),
          analysis = analyze(next),
          q = M.quantities(next);
        out.push({
          project: next,
          variant: v,
          requirements: report,
          warnings: analysis,
          score:
            100 -
            report.reduce(
              (s, r) =>
                s +
                (r.pass
                  ? 0
                  : r.priority === "mandatory"
                    ? 30
                    : r.priority === "preferred"
                      ? 10
                      : 3),
              0,
            ) -
            analysis.filter((r) => r.severity === "error").length * 5,
          area: q.floors.reduce((s, f) => s + f.floorArea, 0),
          cost: q.total,
        });
      } catch (error) {
        out.push({ variant: v, error: error.message });
      }
    }
    const valid = out.filter((c) => c.project),
      costs = valid.map((c) => c.cost),
      min = Math.min(...costs),
      max = Math.max(...costs);
    for (const c of valid) {
      const rooms = c.project.elements.filter((e) => !e.isFurniture),
        reachable = Array.from(
          { length: c.project.floorCount },
          (_, f) => M.connectivity(c.project, f).rooms,
        ).flat();
      const windowRooms = new Set(
        c.project.fixtures
          .filter((f) => f.type === "window" && exterior(c.project, f))
          .map((f) => c.project.elements[f.roomId].id),
      );
      c.components = {
        requirements: Math.max(0, c.score),
        privacy: Math.max(
          0,
          100 - c.warnings.filter((r) => r.code === "privacy").length * 20,
        ),
        circulation: reachable.length
          ? (100 * reachable.filter((r) => r.reachable).length) /
            reachable.length
          : 0,
        daylight: rooms.length
          ? (100 *
              rooms.filter(
                (e) =>
                  windowRooms.has(e.id) &&
                  !c.warnings.some(
                    (r) => r.id === e.id && r.code === "window-obstruction",
                  ),
              ).length) /
            rooms.length
          : 0,
        cost: max > min ? (100 * (max - c.cost)) / (max - min) : 100,
      };
      c.score = Math.round(
        c.components.requirements * 0.4 +
          c.components.circulation * 0.25 +
          c.components.privacy * 0.15 +
          c.components.daylight * 0.1 +
          c.components.cost * 0.1,
      );
    }
    return out;
  }
  root.DesignModel = {
    defaults,
    validate,
    polygon,
    paths,
    geomArea,
    wallStrip,
    clear,
    floorUnion,
    exterior,
    onSegment,
    intersection,
    offsetPath,
    faces,
    recognize,
    transformSelection,
    moveWall,
    geometricConstraints,
    narrow,
    requirementReport,
    analyze,
    sun,
    shadows,
    route,
    clashes,
    finishes,
    tiles,
    preflight,
    dxfParse,
    ifc,
    alternatives,
  };
  if (typeof module !== "undefined") module.exports = root.DesignModel;
})(typeof window !== "undefined" ? window : globalThis);
// Sampled stair headroom uses individual tread elevations and actual ceiling-zone footprints.
(function () {
  const D = DesignModel,
    M = PlanningModel;
  D.stairHeadroom = function (p, e) {
    const d = M.stairs(e),
      style = e.stairStyle || "straight",
      half = Math.ceil(d.count / 2),
      sideways = ["left", "right"].includes(e.dir),
      width = sideways ? e.h : e.w,
      depth = sideways ? e.w : e.h;
    let minimum = Infinity,
      obstruction = "Open stairwell";
    for (let i = 0; i < d.count; i++) {
      let x = width / 2,
        y = (i + 0.5) * d.tread;
      if (style === "u-shape") {
        x = i < half ? width / 4 : (width * 3) / 4;
        y = (i < half ? i + 0.5 : d.count - i - 0.5) * d.tread;
      } else if (style === "l-shape") {
        x = i < half ? 18 : d.landing + (i - half + 0.5) * d.tread;
        y = i < half ? (i + 0.5) * d.tread : half * d.tread + 18;
      }
      if (e.dir === "down") {
        x = width - x;
        y = depth - y;
      } else if (e.dir === "right") {
        const tmp = x;
        x = y;
        y = width - tmp;
      } else if (e.dir === "left") {
        const tmp = x;
        x = depth - y;
        y = tmp;
      }
      const q = { x: e.x + x, y: e.y + y },
        elevation = (i + 1) * d.actual;
      for (const c of p.design.ceilings.filter(
        (c) =>
          c.floor === e.floor &&
          q.x >= c.x &&
          q.y >= c.y &&
          q.x <= c.x + c.w &&
          q.y <= c.y + c.h,
      )) {
        const clearance = c.height - elevation;
        if (clearance < minimum) {
          minimum = clearance;
          obstruction = c.label || "Ceiling";
        }
      }
      const footprint = M.inside(q, M.points(e));
      if (!footprint && e.floor < p.floorCount - 1) {
        const clearance = p.wallSettings.height - elevation;
        if (clearance < minimum) {
          minimum = clearance;
          obstruction = "Upper slab outside stair opening";
        }
      }
    }
    return {
      minimum: Number.isFinite(minimum) ? minimum : null,
      target: d.headroom,
      pass: minimum >= d.headroom,
      obstruction,
      samples: d.count,
    };
  };
  const analyze = D.analyze;
  D.analyze = function (p) {
    const rows = analyze(p).filter((r) => r.code !== "headroom");
    for (const e of p.elements.filter((e) => e.type === "staircase")) {
      const h = D.stairHeadroom(p, e);
      if (!h.pass)
        rows.push({
          code: "headroom",
          id: e.id,
          floor: e.floor,
          text: "Stair headroom is blocked by " + h.obstruction,
          measured: h.minimum.toFixed(1) + " in",
          target: h.target + " in",
          severity: "error",
          samples: h.samples,
        });
    }
    return rows;
  };
})();

// Per-project wall cache invalidates whenever geometry changes, including in-place editor mutations.
(function () {
  const P = globalThis.ProjectModel,
    walls = P.walls,
    cache = new WeakMap();
  P.walls = function (p) {
    const signature = JSON.stringify([
      p.elements,
      p.fixtures,
      p.wallSettings,
      p.wallOverrides,
      p.planning?.walls,
    ]);
    const previous = cache.get(p);
    if (previous?.signature === signature) return previous.value;
    const value = walls(p);
    cache.set(p, { signature, value });
    return value;
  };
})();
