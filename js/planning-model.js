/* Planning geometry and analysis. All lengths are inches; no DOM or rendering dependencies. */
(function (root) {
  "use strict";
  const P = root.ProjectModel,
    eps = 1e-5;
  const cross = (a, b, c) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const area = (pts) =>
    Math.abs(
      pts.reduce((s, a, i) => {
        const b = pts[(i + 1) % pts.length];
        return s + a.x * b.y - b.x * a.y;
      }, 0) / 2,
    );
  const signed = (pts) =>
    pts.reduce((s, a, i) => {
      const b = pts[(i + 1) % pts.length];
      return s + a.x * b.y - b.x * a.y;
    }, 0) / 2;
  const points = (e) =>
    e.points
      ? e.points.map((p) => ({ x: e.x + p.x, y: e.y + p.y }))
      : [
          { x: e.x, y: e.y },
          { x: e.x + e.w, y: e.y },
          { x: e.x + e.w, y: e.y + e.h },
          { x: e.x, y: e.y + e.h },
        ];
  function intersect(a, b, c, d, strict = false) {
    const x = cross(a, b, c),
      y = cross(a, b, d),
      z = cross(c, d, a),
      w = cross(c, d, b);
    return strict
      ? x * y < -eps && z * w < -eps
      : x * y <= eps &&
          z * w <= eps &&
          Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <=
            Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) + eps &&
          Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <=
            Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) + eps;
  }
  function inside(p, poly) {
    let yes = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i],
        b = poly[j];
      if (
        Math.abs(cross(a, b, p)) < eps &&
        p.x >= Math.min(a.x, b.x) - eps &&
        p.x <= Math.max(a.x, b.x) + eps &&
        p.y >= Math.min(a.y, b.y) - eps &&
        p.y <= Math.max(a.y, b.y) + eps
      )
        return true;
      if (
        a.y > p.y !== b.y > p.y &&
        p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
      )
        yes = !yes;
    }
    return yes;
  }
  function simple(poly) {
    if (poly.length < 3 || poly.length > 100 || area(poly) < 1) return false;
    for (let i = 0; i < poly.length; i++) {
      if (distance(poly[i], poly[(i + 1) % poly.length]) < 1) return false;
      for (let j = i + 1; j < poly.length; j++) {
        if (j === i + 1 || (i === 0 && j === poly.length - 1)) continue;
        if (
          intersect(
            poly[i],
            poly[(i + 1) % poly.length],
            poly[j],
            poly[(j + 1) % poly.length],
          )
        )
          return false;
      }
    }
    return true;
  }
  function overlap(a, b) {
    const ap = points(a),
      bp = points(b);
    for (let i = 0; i < ap.length; i++)
      for (let j = 0; j < bp.length; j++)
        if (
          intersect(
            ap[i],
            ap[(i + 1) % ap.length],
            bp[j],
            bp[(j + 1) % bp.length],
            true,
          )
        )
          return true;
    const strictly = (p, q) =>
      inside(p, q) &&
      !q.some((v, i) => Math.abs(cross(v, q[(i + 1) % q.length], p)) < eps);
    return (
      ap.some((p) => strictly(p, bp)) ||
      bp.some((p) => strictly(p, ap)) ||
      (inside(
        {
          x: ap.reduce((s, p) => s + p.x, 0) / ap.length,
          y: ap.reduce((s, p) => s + p.y, 0) / ap.length,
        },
        bp,
      ) &&
        inside(
          {
            x: bp.reduce((s, p) => s + p.x, 0) / bp.length,
            y: bp.reduce((s, p) => s + p.y, 0) / bp.length,
          },
          ap,
        ))
    );
  }
  function lineIntersection(a, u, b, v) {
    const den = u.x * v.y - u.y * v.x;
    if (Math.abs(den) < eps) return null;
    const t = ((b.x - a.x) * v.y - (b.y - a.y) * v.x) / den;
    return { x: a.x + t * u.x, y: a.y + t * u.y };
  }
  function inset(poly, d) {
    const sign = signed(poly) > 0 ? 1 : -1;
    const edges = poly.map((a, i) => {
      const b = poly[(i + 1) % poly.length],
        l = distance(a, b),
        u = { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
      return { a: { x: a.x - u.y * d * sign, y: a.y + u.x * d * sign }, u };
    });
    const out = edges.map((e, i) => {
      const prev = edges[(i + edges.length - 1) % edges.length];
      return lineIntersection(prev.a, prev.u, e.a, e.u) || e.a;
    });
    return simple(out) &&
      area(out) < area(poly) &&
      out.every((p) => inside(p, poly))
      ? out
      : [];
  }
  function edge(e, which) {
    const ps = points(e);
    if (String(which).startsWith("segment:")) {
      const i = Number(which.split(":")[1]);
      return [ps[i], ps[(i + 1) % ps.length]];
    }
    return {
      top: [ps[0], ps[1]],
      right: [ps[1], ps[2]],
      bottom: [ps[3], ps[2]],
      left: [ps[0], ps[3]],
    }[which];
  }
  function defaults() {
    return {
      walls: [],
      measurements: [],
      annotations: [],
      services: [],
      underlays: [],
      floorNames: {},
      layers: Object.fromEntries(
        [
          "walls",
          "rooms",
          "furniture",
          "dimensions",
          "annotations",
          "electrical",
          "plumbing",
          "underlay",
        ].map((k) => [k, { visible: true, locked: false }]),
      ),
      snap: {
        spacing: 6,
        endpoints: true,
        midpoints: true,
        faces: true,
        perpendicular: true,
      },
      overlays: { clearance: false, comparisonFloor: null },
      rules: {
        bedroom: {
          minAreaSqft: 70,
          minDimInches: 84,
          requiresAccess: true,
          ventRatio: 0.04,
        },
        living: {
          minAreaSqft: 120,
          minDimInches: 84,
          requiresAccess: true,
          ventRatio: 0.04,
        },
        toilet: {
          minAreaSqft: 15,
          minDimInches: 30,
          requiresAccess: true,
          ventRatio: 0,
        },
        kitchen: {
          minAreaSqft: 35,
          minDimInches: 60,
          requiresAccess: true,
          ventRatio: 0.04,
        },
      },
      cost: { wall: 0, paint: 0, floor: 0, wastage: 10, currency: "INR" },
      regional: { label: "Custom regional area", sqft: 435.6 },
      site: { setback: 0 },
      notes: [],
    };
  }
  function normalizePlanning(raw) {
    const d = defaults(),
      v = raw || {};
    const p = {
      ...d,
      ...P.clone(v),
      layers: { ...d.layers, ...v.layers },
      snap: { ...d.snap, ...v.snap },
      overlays: { ...d.overlays, ...v.overlays },
      cost: { ...d.cost, ...v.cost },
      regional: { ...d.regional, ...v.regional },
      site: { ...d.site, ...v.site },
      rules: { ...d.rules, ...v.rules },
    };
    const validId = (x) =>
      typeof x === "string" && /^[a-zA-Z0-9:_-]{1,100}$/.test(x);
    const pt = (p) => {
      P.finite(p?.x, "Point X", 0, 100000);
      P.finite(p?.y, "Point Y", 0, 100000);
    };
    const used = new Set();
    for (const k of [
      "walls",
      "measurements",
      "annotations",
      "services",
      "underlays",
    ]) {
      if (!Array.isArray(p[k]) || p[k].length > 1500)
        throw Error("Invalid " + k);
      p[k].forEach((x) => {
        if (!validId(x.id)) x.id = P.uid();
        if (used.has(x.id)) throw Error("Duplicate planning object ID");
        used.add(x.id);
        P.finite(x.floor, "Object floor", 0, 49);
        if (!Number.isInteger(x.floor))
          throw Error("Object floor must be an integer");
        if (k === "walls" || k === "measurements") {
          pt(x.a);
          pt(x.b);
          if (distance(x.a, x.b) < 1)
            throw Error("Segment must be at least one inch");
          if (k === "walls") P.finite(x.thickness, "Wall thickness", 1, 36);
          x.label = String(x.label || "").slice(0, 120);
        }
        if (k === "annotations") {
          if (!["note", "callout", "cloud"].includes(x.kind))
            throw Error("Invalid annotation");
          pt(x);
          x.text = String(x.text || "").slice(0, 1000);
          if (x.kind === "cloud") {
            P.finite(x.w, "Cloud width", 1, 100000);
            P.finite(x.h, "Cloud depth", 1, 100000);
          }
          if (x.target) pt(x.target);
        }
        if (k === "services") {
          if (
            !["electrical", "plumbing"].includes(x.layer) ||
            ![
              "light",
              "switch",
              "socket",
              "panel",
              "supply",
              "drain",
              "shaft",
            ].includes(x.kind)
          )
            throw Error("Invalid service");
          if (
            !Array.isArray(x.points) ||
            !x.points.length ||
            x.points.length > 100
          )
            throw Error("Invalid service route");
          x.points.forEach(pt);
          x.circuit = String(x.circuit || "").slice(0, 80);
          x.label = String(x.label || "").slice(0, 120);
        }
        if (k === "underlays") {
          pt(x);
          P.finite(x.w, "Underlay width", 1, 100000);
          P.finite(x.h, "Underlay depth", 1, 100000);
          P.finite(x.opacity, "Image opacity", 0.05, 1);
          if (
            typeof x.data !== "string" ||
            x.data.length > 4 * 1024 * 1024 ||
            !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(x.data)
          )
            throw Error("Use a PNG, JPEG or WebP underlay below 3 MB");
          x.locked = !!x.locked;
        }
      });
    }
    for (const key of Object.keys(d.layers)) {
      if (
        typeof p.layers[key]?.visible !== "boolean" ||
        typeof p.layers[key]?.locked !== "boolean"
      )
        throw Error("Invalid layer");
    }
    P.finite(p.snap.spacing, "Snap spacing", 0.125, 120);
    for (const k of ["endpoints", "midpoints", "faces", "perpendicular"])
      p.snap[k] = !!p.snap[k];
    P.finite(p.cost.wastage, "Wastage", 0, 100);
    for (const k of ["wall", "paint", "floor"])
      P.finite(p.cost[k], "Rate", 0, 1e9);
    p.cost.currency = String(p.cost.currency).slice(0, 10);
    P.finite(p.regional.sqft, "Regional area factor", 0.0001, 1e9);
    p.regional.label = String(p.regional.label).slice(0, 80);
    P.finite(p.site.setback, "Setback", 0, 10000);
    if (p.overlays.comparisonFloor !== null)
      P.finite(p.overlays.comparisonFloor, "Comparison floor", 0, 49);
    for (const r of Object.values(p.rules)) {
      for (const [k, max] of [
        ["minAreaSqft", 1e6],
        ["minDimInches", 10000],
        ["ventRatio", 1],
      ])
        P.finite(r[k], k, 0, max);
      r.requiresAccess = !!r.requiresAccess;
    }
    p.notes = p.notes.map((x) => String(x).slice(0, 1000)).slice(0, 100);
    p.floorNames = Object.fromEntries(
      Object.entries(p.floorNames)
        .filter(([k]) => /^\d+$/.test(k) && +k < 50)
        .map(([k, v]) => [k, String(v).slice(0, 80)]),
    );
    return p;
  }
  const originalNormalize = P.normalize;
  P.normalize = function (raw) {
    const source = P.clone(raw); // Base validator handles rectangular openings; polygon openings use their measured edge.
    const polygonFixtures = [];
    (source.fixtures || []).forEach((f, i) => {
      if (String(f.edge).startsWith("segment:")) {
        const e =
          source.elements?.[f.roomId] ||
          source.elements?.find((e) => e.id === f.roomUid);
        if (!e?.points) throw Error("Polygon opening requires a polygon room");
        const n = Number(f.edge.split(":")[1]);
        if (!Number.isInteger(n) || n < 0 || n >= e.points.length)
          throw Error("Invalid polygon edge");
        polygonFixtures.push([i, f.edge]);
        f.edge = "top";
        f._polygonSize = f.size;
        f._polygonOffset = f.offset;
        f.size = 1;
        f.offset = 0;
      }
    });
    const p = originalNormalize(source);
    p.planning = normalizePlanning(raw.planning);
    p.elements.forEach((e) => {
      if (e.points) {
        if (e.isFurniture || ["staircase", "balcony"].includes(e.type))
          throw Error("Polygon shape is for rooms");
        if (!Array.isArray(e.points)) throw Error("Invalid polygon");
        e.points.forEach((q) => {
          P.finite(q.x, "Vertex X", 0, e.w);
          P.finite(q.y, "Vertex Y", 0, e.h);
        });
        if (!simple(e.points))
          throw Error("Room polygon must be simple, with no crossing edges");
        const maxX = Math.max(...e.points.map((q) => q.x)),
          maxY = Math.max(...e.points.map((q) => q.y));
        if (
          Math.abs(maxX - e.w) > eps ||
          Math.abs(maxY - e.h) > eps ||
          Math.min(...e.points.map((q) => q.x)) > eps ||
          Math.min(...e.points.map((q) => q.y)) > eps
        )
          throw Error("Polygon bounds must match its vertices");
      }
      if (e.role && !["master", "bedroom"].includes(e.role))
        throw Error("Invalid bedroom role");
      if (e.attachedTo && typeof e.attachedTo !== "string")
        throw Error("Invalid attached room");
      if (e.stairDesign) {
        for (const [k, min, max] of [
          ["rise", 1, 240],
          ["riser", 3, 12],
          ["tread", 6, 24],
          ["landing", 0, 120],
          ["headroom", 48, 120],
        ])
          P.finite(e.stairDesign[k], k, min, max);
      }
    });
    polygonFixtures.forEach(([i, ed]) => {
      const f = p.fixtures[i],
        e = p.elements[f.roomId];
      f.edge = ed;
      f.size = f._polygonSize;
      f.offset = f._polygonOffset;
      delete f._polygonSize;
      delete f._polygonOffset;
      P.finite(f.size, "Opening width", 1, 100000);
      P.finite(f.offset, "Opening offset", 0, 100000);
      const [a, b] = edge(e, ed);
      if (f.offset + f.size > distance(a, b) + eps)
        throw Error("Opening must fit its polygon edge");
    });
    p.fixtures.forEach((f) => {
      if (
        p.elements[f.roomId]?.points &&
        !String(f.edge).startsWith("segment:")
      )
        throw Error("Choose a polygon segment for this opening");
      f.handing = f.handing || "left";
      f.swing = f.swing || "in";
      f.style = f.style || "hinged";
      if (
        !["left", "right"].includes(f.handing) ||
        !["in", "out"].includes(f.swing) ||
        !["hinged", "sliding", "open"].includes(f.style)
      )
        throw Error("Invalid opening style");
    });
    for (const k of [
      "walls",
      "measurements",
      "annotations",
      "services",
      "underlays",
    ])
      for (const x of p.planning[k])
        if (x.floor >= p.floorCount)
          throw Error("Planning object refers to a missing floor");
    const width = P.inches(p.plot.inW, p.unit),
      depth = P.inches(p.plot.inH, p.unit);
    for (const k of ["walls", "measurements", "annotations", "services"])
      for (const x of p.planning[k]) {
        const coords =
          k === "walls" || k === "measurements"
            ? [x.a, x.b]
            : k === "services"
              ? x.points
              : [
                  x,
                  ...(x.target ? [x.target] : []),
                  ...(x.kind === "cloud"
                    ? [{ x: x.x + x.w, y: x.y + x.h }]
                    : []),
                ];
        if (coords.some((q) => q.x > width + eps || q.y > depth + eps))
          throw Error(
            "Planning objects must fit inside the buildable boundary",
          );
      }
    return p;
  };
  const oldWalls = P.walls;
  P.walls = function (p) {
    if (!p.elements.some((e) => e.points) && !p.planning?.walls?.length)
      return oldWalls(p).map((w) => ({
        ...w,
        a: {
          x: w.horizontal ? w.start : w.fixed,
          y: w.horizontal ? w.fixed : w.start,
        },
        b: {
          x: w.horizontal ? w.end : w.fixed,
          y: w.horizontal ? w.fixed : w.end,
        },
        length: w.end - w.start,
      }));
    const groups = new Map();
    const add = (a, b, floor, owner, thickness) => {
      let dx = b.x - a.x,
        dy = b.y - a.y,
        l = Math.hypot(dx, dy);
      if (l < eps) return;
      let u = { x: dx / l, y: dy / l };
      if (u.x < -eps || (Math.abs(u.x) < eps && u.y < 0))
        u = { x: -u.x, y: -u.y };
      const n = { x: -u.y, y: u.x },
        fixed = a.x * n.x + a.y * n.y,
        key = `${floor}:${u.x.toFixed(5)}:${u.y.toFixed(5)}:${fixed.toFixed(3)}`,
        ta = a.x * u.x + a.y * u.y,
        tb = b.x * u.x + b.y * u.y;
      const item = {
        a,
        b,
        u,
        n,
        fixed,
        start: Math.min(ta, tb),
        end: Math.max(ta, tb),
        floor,
        owner,
        thickness,
        reverse: ta > tb,
      };
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    };
    p.elements.forEach((e, index) => {
      if (e.isFurniture || ["staircase", "balcony"].includes(e.type)) return;
      const ps = points(e);
      if (e.points)
        ps.forEach((a, i) =>
          add(a, ps[(i + 1) % ps.length], e.floor, {
            index,
            edge: `segment:${i}`,
          }),
        );
      else
        for (const ed of ["top", "bottom", "left", "right"]) {
          const [a, b] = edge(e, ed);
          add(a, b, e.floor, { index, edge: ed });
        }
    });
    (p.planning?.walls || []).forEach((w) =>
      add(w.a, w.b, w.floor, { wallId: w.id }, w.thickness),
    );
    const result = [];
    groups.forEach((list, key) => {
      const cuts = [...new Set(list.flatMap((e) => [e.start, e.end]))].sort(
        (a, b) => a - b,
      );
      for (let i = 0; i < cuts.length - 1; i++) {
        const s = cuts[i],
          t = cuts[i + 1],
          mid = (s + t) / 2,
          owners = list.filter((e) => e.start < mid + eps && e.end > mid - eps);
        if (!owners.length || t - s < eps) continue;
        const base = owners[0],
          at = (q) => ({
            x: base.u.x * q + base.n.x * base.fixed,
            y: base.u.y * q + base.n.y * base.fixed,
          }),
          a = at(s),
          b = at(t),
          shared = owners.filter((o) => o.owner.index !== undefined).length > 1,
          id =
            Math.abs(a.y - b.y) < eps
              ? `${base.floor}:h:${a.y.toFixed(3)}:${a.x.toFixed(3)}:${b.x.toFixed(3)}`
              : Math.abs(a.x - b.x) < eps
                ? `${base.floor}:v:${a.x.toFixed(3)}:${a.y.toFixed(3)}:${b.y.toFixed(3)}`
                : `${key}:${s.toFixed(3)}:${t.toFixed(3)}`,
          openings = [];
        owners.forEach((o) => {
          if (o.owner.index === undefined) return;
          p.fixtures
            .filter(
              (f) => f.roomId === o.owner.index && f.edge === o.owner.edge,
            )
            .forEach((f) => {
              const origin = o.reverse
                  ? o.end - f.offset - f.size
                  : o.start + f.offset,
                end = origin + f.size;
              if (end > s && origin < t)
                openings.push({
                  id: f.id,
                  start: Math.max(s, origin) - s,
                  end: Math.min(t, end) - s,
                  height: f.height,
                  sill: f.sill,
                  type: f.type,
                });
            });
        });
        result.push({
          id,
          a,
          b,
          length: t - s,
          horizontal: Math.abs(a.y - b.y) < eps,
          fixed: Math.abs(a.y - b.y) < eps ? a.y : a.x,
          start: Math.abs(a.y - b.y) < eps ? a.x : a.y,
          end: Math.abs(a.y - b.y) < eps ? b.x : b.y,
          floor: base.floor,
          owners: owners.map((o) => o.owner),
          shared,
          thickness:
            p.wallOverrides[id] ??
            Math.max(
              ...owners.map(
                (o) =>
                  o.thickness ||
                  p.wallSettings[shared ? "internal" : "external"],
              ),
            ),
          openings,
        });
      }
    });
    return result;
  };
  function clear(p, e, allWalls = null) {
    if (e.points) {
      const t = p.wallSettings.external / 2,
        poly = inset(points(e), t);
      return {
        w: Math.max(0, e.w - t * 2),
        h: Math.max(0, e.h - t * 2),
        area: poly.length ? area(poly) : null,
        polygon: poly,
      };
    }
    const i = p.elements.findIndex((n) => n.id === e.id),
      ws = (allWalls || P.walls(p)).filter((w) =>
        w.owners.some((o) => o.index === i),
      ),
      th = (ed) =>
        Math.max(
          0,
          ...ws
            .filter((w) => w.owners.some((o) => o.index === i && o.edge === ed))
            .map((w) => w.thickness / 2),
        );
    const w = Math.max(0, e.w - th("left") - th("right")),
      h = Math.max(0, e.h - th("top") - th("bottom"));
    return { w, h, area: w * h };
  }
  function openingSegment(p, f) {
    const e = p.elements[f.roomId],
      [a, b] = edge(e, f.edge),
      len = distance(a, b),
      u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    return {
      a: { x: a.x + u.x * f.offset, y: a.y + u.y * f.offset },
      b: {
        x: a.x + u.x * (f.offset + f.size),
        y: a.y + u.y * (f.offset + f.size),
      },
      u,
      room: e,
    };
  }
  function connectivity(p, floor, allWalls = null) {
    const rooms = p.elements
        .map((e, i) => ({ e, i }))
        .filter(
          ({ e }) =>
            !e.isFurniture &&
            e.floor === floor &&
            !["staircase", "balcony"].includes(e.type),
        ),
      links = [],
      external = new Set();
    p.fixtures
      .filter((f) => f.type === "door" && p.elements[f.roomId]?.floor === floor)
      .forEach((f) => {
        const s = openingSegment(p, f),
          mid = { x: (s.a.x + s.b.x) / 2, y: (s.a.y + s.b.y) / 2 };
        const ws = (allWalls || P.walls(p)).filter(
          (w) =>
            w.floor === floor &&
            Math.abs(cross(w.a, w.b, mid)) < 0.1 &&
            distance(w.a, mid) + distance(mid, w.b) <= w.length + 0.1,
        );
        const indices = [
          ...new Set(
            ws
              .flatMap((w) => w.owners.map((o) => o.index))
              .filter((i) => i !== undefined),
          ),
        ];
        if (indices.length === 1) external.add(indices[0]);
        for (const other of indices.filter((i) => i !== f.roomId))
          if (
            !links.some(
              (l) =>
                (l.a === other && l.b === f.roomId) ||
                (l.b === other && l.a === f.roomId),
            )
          )
            links.push({ a: f.roomId, b: other, door: f.id });
      });
    const reachable = new Set(external);
    let changed = true;
    while (changed) {
      changed = false;
      links.forEach((l) => {
        if (reachable.has(l.a) && !reachable.has(l.b)) {
          reachable.add(l.b);
          changed = true;
        }
        if (reachable.has(l.b) && !reachable.has(l.a)) {
          reachable.add(l.a);
          changed = true;
        }
      });
    }
    return {
      rooms: rooms.map(({ e, i }) => ({
        id: e.id,
        index: i,
        name: e.customName || e.type,
        reachable: reachable.has(i),
        external: external.has(i),
      })),
      links,
    };
  }
  function analyze(p, scope = "all") {
    const results = [],
      checks = [],
      rule = p.planning?.rules || defaults().rules,
      ws = P.walls(p);
    const add = (e, index, code, pass, text, severity = "warning") => {
      const r = {
        id: e?.id,
        index,
        floor: e?.floor,
        code,
        pass,
        text,
        severity,
      };
      checks.push(r);
      if (!pass) results.push(r);
    };
    p.elements.forEach((e, i) => {
      if (scope !== "all" && e.floor !== Number(scope)) return;
      const plotW = P.inches(p.plot.inW, p.unit),
        plotH = P.inches(p.plot.inH, p.unit);
      add(
        e,
        i,
        "boundary",
        points(e).every(
          (q) => q.x >= 0 && q.y >= 0 && q.x <= plotW && q.y <= plotH,
        ),
        "Outside the buildable boundary",
        "error",
      );
      if (e.isFurniture) return;
      p.elements.forEach((b, j) => {
        if (j > i && !b.isFurniture && e.floor === b.floor && overlap(e, b))
          add(
            e,
            i,
            "overlap",
            false,
            `Overlaps ${b.customName || b.type}`,
            "error",
          );
      });
      if (e.type === "staircase" && e.stairDesign) {
        const d = stairs(e);
        add(
          e,
          i,
          "stair-fit",
          d.fits,
          "Stair flights and landing exceed the footprint",
        );
        add(
          e,
          i,
          "stair-rise",
          Math.abs(d.rise - p.wallSettings.height) < 0.01,
          "Stair total rise differs from the floor-to-floor wall height",
        );
      }
      const r = rule[e.type];
      if (!r) return;
      const c = clear(p, e, ws),
        name = e.customName || e.type;
      if (c.area === null) {
        add(
          e,
          i,
          "clear-area",
          false,
          "Clear area cannot be evaluated for this concave offset",
          "unsupported",
        );
        return;
      }
      add(
        e,
        i,
        "area",
        c.area / 144 >= r.minAreaSqft,
        `${name}: clear area ${(c.area / 144).toFixed(1)} sq ft; target ${r.minAreaSqft}`,
      );
      add(
        e,
        i,
        "width",
        Math.min(c.w, c.h) >= r.minDimInches,
        `${name}: clear minimum dimension ${P.display(Math.min(c.w, c.h), "ftin")}; target ${P.display(r.minDimInches, "ftin")}`,
      );
      const fs = p.fixtures.filter((f) => {
        if (f.roomId === i) return true;
        const seg = openingSegment(p, f),
          mid = { x: (seg.a.x + seg.b.x) / 2, y: (seg.a.y + seg.b.y) / 2 };
        return ws.some(
          (w) =>
            w.floor === e.floor &&
            w.owners.some((o) => o.index === i) &&
            Math.abs(cross(w.a, w.b, mid)) < 0.1 &&
            distance(w.a, mid) + distance(mid, w.b) <= w.length + 0.1,
        );
      });
      if (r.requiresAccess)
        add(
          e,
          i,
          "access",
          fs.some((f) => f.type === "door"),
          `${name}: add an access door`,
        );
      if (r.ventRatio > 0) {
        const windows = fs.filter(
          (f) =>
            f.type === "window" &&
            ws.some(
              (w) =>
                !w.shared &&
                w.owners.some((o) => o.index === i && o.edge === f.edge),
            ),
        );
        const glazing = windows.reduce((s, f) => s + f.size * f.height, 0);
        add(
          e,
          i,
          "ventilation",
          glazing >= c.area * r.ventRatio,
          `${name}: exterior window area ${(glazing / 144).toFixed(1)} sq ft; target ${((c.area * r.ventRatio) / 144).toFixed(1)} (operability not assessed)`,
        );
      }
      const setback = p.planning?.site.setback || 0;
      if (setback)
        add(
          e,
          i,
          "setback",
          points(e).every(
            (q) =>
              q.x >= setback &&
              q.y >= setback &&
              q.x <= plotW - setback &&
              q.y <= plotH - setback,
          ),
          "Room crosses configured setback",
        );
    });
    const floors =
      scope === "all"
        ? Array.from({ length: p.floorCount }, (_, i) => i)
        : [+scope];
    floors.forEach((f) => {
      const c = connectivity(p, f, ws);
      c.rooms
        .filter((r) => !r.reachable)
        .forEach((r) =>
          add(
            p.elements[r.index],
            r.index,
            "route",
            false,
            `${r.name}: no connected door route to an exterior entrance`,
          ),
        );
    });
    return {
      results,
      checks,
      passed: checks.filter((r) => r.pass).length,
      total: checks.length,
      score: checks.length
        ? Math.round(
            (checks.filter((r) => r.pass).length / checks.length) * 100,
          )
        : null,
      unsupported: [
        "Escape suitability needs opening clear dimensions and route criteria",
        "Ventilation uses exterior window area; mechanical systems and operability are not assessed",
      ],
    };
  }
  function vastu(p, floor) {
    const out = [];
    p.elements.forEach((e, index) => {
      if (e.isFurniture || e.floor !== floor) return;
      const z = P.zone(
        e.x + e.w / 2,
        e.y + e.h / 2,
        P.inches(p.plot.inW, p.unit),
        P.inches(p.plot.inH, p.unit),
        p.compass,
      );
      let rating = null,
        target = "";
      if (e.type === "kitchen") {
        rating = z === "SE" ? 1 : z === "NW" ? 0.5 : 0;
        target = "SE preferred; NW alternative";
      }
      if (e.type === "puja") {
        rating = z === "NE" ? 1 : 0;
        target = "NE preferred";
      }
      if (e.type === "bedroom" && e.role === "master") {
        rating = z === "SW" ? 1 : 0;
        target = "SW preferred for master bedroom";
      }
      if (e.type === "toilet") {
        rating = ["NE", "SW"].includes(z) ? 0 : 1;
        target = "Avoid NE and SW in this preference set";
      }
      if (rating !== null)
        out.push({
          id: e.id,
          index,
          floor,
          name: e.customName || e.type,
          zone: z,
          rating,
          target,
        });
    });
    return {
      score: out.length
        ? Math.round((out.reduce((s, r) => s + r.rating, 0) / out.length) * 100)
        : null,
      count: out.length,
      rooms: out,
    };
  }
  function quantities(p) {
    const allWalls = P.walls(p);
    const floors = Array.from({ length: p.floorCount }, (_, floor) => {
      const rooms = p.elements.filter(
          (e) => e.floor === floor && !e.isFurniture,
        ),
        ws = allWalls.filter((w) => w.floor === floor);
      let wall = 0,
        paint = 0;
      ws.forEach((w) => {
        const cuts = [
          ...new Set([
            0,
            w.length,
            ...w.openings.flatMap((o) => [o.start, o.end]),
          ]),
        ].sort((a, b) => a - b);
        let openings = 0;
        for (let i = 0; i < cuts.length - 1; i++) {
          const a = cuts[i],
            b = cuts[i + 1],
            ranges = w.openings
              .filter((o) => o.start < (a + b) / 2 && o.end > (a + b) / 2)
              .map((o) => [o.sill, o.sill + o.height])
              .sort((a, b) => a[0] - b[0]);
          let top = 0,
            vertical = 0;
          for (const [lo, hi] of ranges) {
            vertical += Math.max(0, hi - Math.max(lo, top));
            top = Math.max(top, hi);
          }
          openings += (b - a) * vertical;
        }
        wall += Math.max(0, w.length * p.wallSettings.height - openings) / 144;
        paint +=
          (Math.max(0, w.length * p.wallSettings.height - openings) * 2) / 144;
      });
      const floorArea = rooms.reduce(
          (s, e) => s + (clear(p, e, allWalls).area || 0) / 144,
          0,
        ),
        boundArea = rooms.reduce((s, e) => s + area(points(e)) / 144, 0);
      const cost = p.planning.cost,
        mult = 1 + cost.wastage / 100;
      return {
        floor,
        wall,
        paint,
        floorArea,
        boundArea,
        wallLength: ws.reduce((s, w) => s + w.length, 0) / 12,
        estimate:
          (wall * cost.wall + paint * cost.paint + floorArea * cost.floor) *
          mult,
      };
    });
    return { floors, total: floors.reduce((s, f) => s + f.estimate, 0) };
  }
  function stairs(e) {
    const d = e.stairDesign || {
        rise: 120,
        riser: 7,
        tread: 10,
        landing: 36,
        headroom: 80,
      },
      count = Math.ceil(d.rise / d.riser),
      actual = d.rise / count,
      style = e.stairStyle || "straight",
      runs = style === "straight" ? 1 : 2,
      run = Math.ceil(count / runs) * d.tread,
      needed = run + (runs > 1 ? d.landing : 0),
      sideways = ["left", "right"].includes(e.dir),
      width = sideways ? e.h : e.w,
      depth = sideways ? e.w : e.h,
      neededW = style === "u-shape" ? 76 : style === "l-shape" ? needed : 36,
      neededH = needed;
    return {
      ...d,
      count,
      actual,
      run,
      needed,
      neededW,
      neededH,
      fits: neededW <= width && neededH <= depth,
      headroomCheck:
        "Required headroom stored; inspect the coordinated section for overhead clearance",
    };
  }
  function snap(p, pt, floor, origin = null) {
    const conf = p.planning.snap,
      threshold = 8,
      targets = [];
    p.elements
      .filter((e) => e.floor === floor)
      .forEach((e) => {
        const ps = points(e);
        if (conf.endpoints)
          targets.push(...ps.map((q) => ({ ...q, priority: 0 })));
        if (conf.midpoints)
          ps.forEach((a, i) => {
            const b = ps[(i + 1) % ps.length];
            targets.push({
              x: (a.x + b.x) / 2,
              y: (a.y + b.y) / 2,
              priority: 1,
            });
          });
        if (conf.faces)
          ps.forEach((a, i) => {
            const b = ps[(i + 1) % ps.length],
              len = distance(a, b),
              t = Math.max(
                0,
                Math.min(
                  1,
                  ((pt.x - a.x) * (b.x - a.x) + (pt.y - a.y) * (b.y - a.y)) /
                    (len * len),
                ),
              );
            targets.push({
              x: a.x + t * (b.x - a.x),
              y: a.y + t * (b.y - a.y),
              priority: 2,
            });
          });
      });
    p.planning.walls
      .filter((w) => w.floor === floor)
      .forEach((w) =>
        targets.push({ ...w.a, priority: 0 }, { ...w.b, priority: 0 }),
      );
    const close = targets
      .map((q) => ({ q, d: distance(q, pt) }))
      .filter((x) => x.d < threshold)
      .sort(
        (a, b) => (a.q.priority || 0) - (b.q.priority || 0) || a.d - b.d,
      )[0];
    if (close) return { ...close.q, kind: "geometry" };
    const q = {
      x: Math.round(pt.x / conf.spacing) * conf.spacing,
      y: Math.round(pt.y / conf.spacing) * conf.spacing,
      kind: "grid",
    };
    if (origin && conf.perpendicular) {
      if (Math.abs(pt.x - origin.x) < threshold) q.x = origin.x;
      if (Math.abs(pt.y - origin.y) < threshold) q.y = origin.y;
    }
    return q;
  }
  function generate(p, req, variant = 0) {
    if (req.perFloor) {
      let next = structuredClone(p);
      for (const floor of req.floors || [p.currentFloor]) {
        const layout = req.perFloor[floor] || "custom";
        if (layout === "none") {
          const old = next.elements,
            keep = new Set(req.preserve || []);
          next.elements = old.filter(
            (e) => e.floor !== floor || e.locked || keep.has(e.id),
          );
          next.fixtures = next.fixtures
            .filter((f) =>
              next.elements.some((e) => e.id === old[f.roomId]?.id),
            )
            .map((f) => ({
              ...f,
              roomId: next.elements.findIndex((e) => e.id === old[f.roomId].id),
            }));
          next.constraints = next.constraints.filter(
            (c) =>
              next.elements.some((e) => e.id === c.source) &&
              next.elements.some((e) => e.id === c.target),
          );
        } else
          next = generate(
            next,
            {
              ...req,
              perFloor: null,
              floors: [floor],
              ...(layout === "custom" ? {} : { bedrooms: Number(layout[0]) }),
            },
            variant,
          );
        next.layouts["layout-f" + floor] = layout;
      }
      return P.normalize(next);
    }
    const next = structuredClone(p),
      floors = req.floors || [p.currentFloor],
      preserve = new Set(req.preserve || []);
    const count = Number(req.bedrooms ?? 1),
      attached = Number(req.attached ?? 0),
      baths = Number(req.baths ?? 1),
      bedW = Number(req.bedW ?? 120),
      bedH = Number(req.bedH ?? 132),
      margin = Number(req.setback ?? 0);
    for (const [k, n] of Object.entries({
      count,
      attached,
      baths,
      bedW,
      bedH,
      margin,
    }))
      P.finite(n, k, 0, 10000);
    if (
      count < 1 ||
      count > 10 ||
      !Number.isInteger(count) ||
      !Number.isInteger(baths) ||
      !Number.isInteger(attached) ||
      baths > 10 ||
      attached > count ||
      bedW < 48 ||
      bedH < 48
    )
      throw Error(
        "Choose 1–10 bedrooms, valid bathroom counts and bedroom dimensions of at least 48 inches",
      );
    const pw = P.inches(p.plot.inW, p.unit),
      ph = P.inches(p.plot.inH, p.unit);
    if (margin * 2 >= Math.min(pw, ph))
      throw Error("Setbacks leave no buildable space");
    const old = next.elements;
    next.elements = old.filter(
      (e) => !floors.includes(e.floor) || e.locked || preserve.has(e.id),
    );
    next.fixtures = next.fixtures
      .filter((f) => next.elements.some((e) => e.id === old[f.roomId]?.id))
      .map((f) => ({
        ...f,
        roomId: next.elements.findIndex((e) => e.id === old[f.roomId].id),
      }));
    next.constraints = next.constraints.filter(
      (c) =>
        next.elements.some((e) => e.id === c.source) &&
        next.elements.some((e) => e.id === c.target),
    );
    const units = Array.from({ length: count }, (_, i) => ({
      type: "bedroom",
      w: bedW,
      h: bedH,
      customName: `Bedroom ${i + 1}`,
      role: i === 0 ? "master" : "bedroom",
      attached: i < attached,
    }));
    units.push(
      { type: "living", w: 144, h: 144 },
      { type: "kitchen", w: 96, h: 108 },
      ...Array.from({ length: baths }, (_, i) => ({
        type: "toilet",
        w: 60,
        h: 84,
        customName: `Common toilet ${i + 1}`,
      })),
    );
    if (req.puja) units.push({ type: "puja", w: 36, h: 36 });
    const placed = [];
    for (const floor of floors) {
      if (!Number.isInteger(floor) || floor < 0 || floor >= p.floorCount)
        throw Error("Select existing floors");
      const ordered = variant === 1 ? [...units].reverse() : units;
      const blockers = next.elements.filter(
        (e) => e.floor === floor && !e.isFurniture,
      );
      const fixedWalls = next.planning.walls.filter((w) => w.floor === floor);
      const shafts = next.planning.services
        .filter((s) => s.floor === floor && s.kind === "shaft")
        .flatMap((s) =>
          s.points.map((q) => ({ x: q.x - 6, y: q.y - 6, w: 12, h: 12 })),
        );
      for (const spec of ordered) {
        const orientations =
          variant === 2
            ? [
                { w: spec.h, h: spec.w },
                { w: spec.w, h: spec.h },
              ]
            : [{ w: spec.w, h: spec.h }];
        let best = null;
        for (const dim of orientations) {
          const unitW = dim.w + (spec.attached ? 60 : 0),
            unitH = Math.max(dim.h, spec.attached ? 84 : 0),
            xs = new Set([margin, ...blockers.map((e) => e.x + e.w)]),
            ys = new Set([margin, ...blockers.map((e) => e.y + e.h)]);
          for (const y of [...ys].sort((a, b) => a - b))
            for (const x of [...xs].sort((a, b) =>
              variant === 1 ? b - a : a - b,
            )) {
              const box = { x, y, w: unitW, h: unitH };
              if (
                x + unitW > pw - margin ||
                y + unitH > ph - margin ||
                blockers.some((b) => overlap(box, b)) ||
                shafts.some((b) => overlap(box, b))
              )
                continue;
              const poly = points(box);
              if (
                fixedWalls.some(
                  (w) =>
                    inside(
                      { x: (w.a.x + w.b.x) / 2, y: (w.a.y + w.b.y) / 2 },
                      poly,
                    ) ||
                    poly.some((q, i) =>
                      intersect(q, poly[(i + 1) % poly.length], w.a, w.b, true),
                    ),
                )
              )
                continue;
              const z = P.zone(x + dim.w / 2, y + dim.h / 2, pw, ph, p.compass),
                target = { kitchen: "SE", puja: "NE", bedroom: "SW" }[
                  spec.type
                ],
                score =
                  (req.vastu && z === target ? -1e6 : 0) +
                  y * pw +
                  (variant === 1 ? -x : x);
              if (!best || score < best.score) best = { x, y, dim, score };
            }
        }
        if (!best)
          throw Error(
            `Floor ${floor}: ${spec.customName || spec.type} (${spec.w} × ${spec.h} in${spec.attached ? " plus attached toilet" : ""}) cannot fit around fixed objects and setbacks. Reduce requirements or enlarge the plot.`,
          );
        const { attached: hasAttached, ...roomSpec } = spec,
          el = {
            ...roomSpec,
            ...best.dim,
            id: P.uid(),
            x: best.x,
            y: best.y,
            floor,
            locked: false,
            rot: 0,
          };
        next.elements.push(el);
        blockers.push(el);
        placed.push(el);
        if (hasAttached) {
          const bath = {
            id: P.uid(),
            type: "toilet",
            customName: "Attached toilet · " + el.customName,
            attachedTo: el.id,
            x: el.x + el.w,
            y: el.y,
            w: 60,
            h: 84,
            floor,
            rot: 0,
            locked: false,
          };
          next.elements.push(bath);
          blockers.push(bath);
          placed.push(bath);
        }
      }
    }
    next.planning.site.setback = margin;
    let ws = P.walls(next);
    // Attached bathrooms always share a doorway with their bedroom.
    for (const el of placed.filter((e) => e.attachedTo)) {
      const roomId = next.elements.indexOf(el);
      next.fixtures.push({
        id: P.uid(),
        type: "door",
        roomId,
        roomUid: el.id,
        edge: "left",
        offset: 24,
        size: 30,
        height: 80,
        sill: 0,
      });
    }
    for (const el of placed.filter((e) => !e.attachedTo)) {
      const roomId = next.elements.indexOf(el),
        walls = ws.filter((w) => w.owners.some((o) => o.index === roomId));
      const access =
        walls.find(
          (w) =>
            w.shared &&
            w.length >= 36 &&
            !w.owners.some((o) => next.elements[o.index]?.attachedTo === el.id),
        ) || walls.find((w) => !w.shared && w.length >= 36);
      if (access) {
        const owner = access.owners.find((o) => o.index === roomId),
          [a] = edge(el, owner.edge),
          base =
            distance(a, access.a) < distance(a, access.b) ? access.a : access.b;
        next.fixtures.push({
          id: P.uid(),
          type: "door",
          roomId,
          roomUid: el.id,
          edge: owner.edge,
          offset: distance(a, base),
          size: Math.min(36, access.length),
          height: 80,
          sill: 0,
        });
      }
      const exterior = walls.find((w) => !w.shared && w.length >= 36);
      if (exterior) {
        const owner = exterior.owners.find((o) => o.index === roomId),
          [a] = edge(el, owner.edge),
          base =
            distance(a, exterior.a) < distance(a, exterior.b)
              ? exterior.a
              : exterior.b,
          off = distance(a, base) + (exterior.length - 36) / 2;
        if (
          !next.fixtures.some(
            (f) =>
              f.roomId === roomId &&
              f.edge === owner.edge &&
              Math.abs(f.offset - off) < 36,
          )
        )
          next.fixtures.push({
            id: P.uid(),
            type: "window",
            roomId,
            roomUid: el.id,
            edge: owner.edge,
            offset: off,
            size: 36,
            height: 40,
            sill: 40,
          });
      }
    }
    return P.normalize(next);
  }
  const units = {
    parse(value, unit = "in") {
      const text = String(value).trim();
      if (!text) return NaN;
      const fraction = (s) => {
        const m = s.trim().match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
        return m && +m[3] > 0
          ? +(m[1] || 0) + m[2] / m[3]
          : /^\d+(?:\.\d+)?$/.test(s.trim())
            ? Number(s)
            : NaN;
      };
      if (unit === "ftin") {
        const m = text.match(
          /^(-?)(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*(.*?)\s*(?:"|in|inches)?$/i,
        );
        if (m) {
          const tail = m[3].replace(/(?:"|in|inches)$/i, "").trim();
          return (
            (m[1] ? -1 : 1) * (Number(m[2]) * 12 + (tail ? fraction(tail) : 0))
          );
        }
      }
      const sign = text[0] === "-" ? -1 : 1,
        n = fraction(text.replace(/^[-+]/, ""));
      return (
        n *
        sign *
        ({ in: 1, ftin: 1, ft: 12, mm: 1 / 25.4, cm: 1 / 2.54, m: 100 / 2.54 }[
          unit
        ] ?? NaN)
      );
    },
    format(inches, unit) {
      if (unit === "ftin") {
        const sign = inches < 0 ? "-" : "",
          n = Math.round(Math.abs(inches) * 16),
          feet = Math.floor(n / 192),
          rest = n % 192,
          whole = Math.floor(rest / 16),
          num = rest % 16,
          gcd = (a, b) => (b ? gcd(b, a % b) : a),
          g = gcd(num, 16);
        return `${sign}${feet}' ${whole}${num ? " " + num / g + "/" + 16 / g : ""}"`;
      }
      return String(
        Number(
          (
            inches /
            ({ in: 1, ft: 12, mm: 1 / 25.4, cm: 1 / 2.54, m: 100 / 2.54 }[
              unit
            ] || 1)
          ).toFixed(6),
        ),
      );
    },
  };

  const originalInches = P.inches;
  P.inches = function (value, unit = "in") {
    if (typeof value === "string" && (value.includes("/") || unit === "ftin"))
      return units.parse(value, unit);
    return originalInches(value, unit);
  };
  const originalDisplay = P.display;
  P.display = function (value, unit) {
    if (unit === "ftin" && value < 0)
      return "-" + originalDisplay(Math.abs(value), unit);
    return originalDisplay(value, unit);
  };
  root.PlanningModel = {
    units,
    defaults,
    normalizePlanning,
    points,
    area,
    signed,
    simple,
    inside,
    overlap,
    inset,
    distance,
    edge,
    clear,
    openingSegment,
    analyze,
    vastu,
    connectivity,
    quantities,
    stairs,
    snap,
    generate,
  };
  if (typeof module !== "undefined") module.exports = root.PlanningModel;
})(typeof window !== "undefined" ? window : globalThis);
