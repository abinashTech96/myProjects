/* Building and interior algorithms, with previewable geometry rather than UI-only settings. */
(function (root) {
  "use strict";
  const W = root.WorkbenchModel,
    P = root.ProjectModel,
    M = root.PlanningModel,
    D = root.DesignModel,
    PC =
      root.polygonClipping ||
      (typeof require === "function"
        ? require("../vendor/geometry/polygon-clipping.js")
        : null),
    { pt, clone } = W;
  const rect = (x, y, w, h) => [
    pt(x, y),
    pt(x + w, y),
    pt(x + w, y + h),
    pt(x, y + h),
  ];
  function stairs(config) {
    const s = { turnSteps: 3, ...config },
      count = Math.max(2, Math.ceil(s.rise / s.riser)),
      riser = s.rise / count,
      treads = [];
    let step = 0;
    const add = (points, landing = false) => {
      if (!landing) step++;
      treads.push({
        points,
        top: Math.min(s.rise, step * riser),
        step,
        landing,
      });
    };
    if (s.style === "straight") {
      for (let i = 0; i < count; i++)
        add(rect(0, i * s.tread, s.width, s.tread));
      add(rect(0, count * s.tread, s.width, s.landing), true);
    } else if (s.style === "u-shape") {
      const first = Math.ceil(count / 2),
        second = count - first,
        gap = 4,
        origin = Math.max(0, second - first) * s.tread;
      for (let i = 0; i < first; i++)
        add(rect(0, origin + i * s.tread, s.width, s.tread));
      add(
        rect(0, origin + first * s.tread, 2 * s.width + gap, s.landing),
        true,
      );
      for (let i = 0; i < second; i++)
        add(
          rect(
            s.width + gap,
            origin + (first - i - 1) * s.tread,
            s.width,
            s.tread,
          ),
        );
    } else if (s.style === "l-shape") {
      const first = Math.ceil(count / 2),
        second = count - first,
        landing = Math.max(s.landing, s.width);
      for (let i = 0; i < first; i++)
        add(rect(0, i * s.tread, s.width, s.tread));
      add(rect(0, first * s.tread, landing, landing), true);
      for (let i = 0; i < second; i++)
        add(
          rect(
            landing + i * s.tread,
            first * s.tread + landing - s.width,
            s.tread,
            s.width,
          ),
        );
    } else if (s.style === "winder") {
      const turn = Math.min(Math.floor(s.turnSteps), count - 2),
        first = Math.ceil((count - turn) / 2),
        second = count - first - turn,
        inner = Math.max(6, turn * 1.5),
        outer = inner + s.width,
        cx = outer,
        cy = first * s.tread;
      for (let i = 0; i < first; i++)
        add(rect(0, i * s.tread, s.width, s.tread));
      for (let i = 0; i < turn; i++) {
        const a = Math.PI - (i * Math.PI) / 2 / turn,
          b = Math.PI - ((i + 1) * Math.PI) / 2 / turn,
          ps = [],
          segments = Math.max(
            1,
            Math.min(6, Math.floor((outer * Math.abs(b - a)) / 1.5)),
          );
        for (let n = 0; n <= segments; n++) {
          const t = a + ((b - a) * n) / segments;
          ps.push(pt(cx + outer * Math.cos(t), cy + outer * Math.sin(t)));
        }
        for (let n = 1; n >= 0; n--) {
          const t = a + (b - a) * n;
          ps.push(pt(cx + inner * Math.cos(t), cy + inner * Math.sin(t)));
        }
        add(ps);
      }
      for (let i = 0; i < second; i++)
        add(rect(outer + i * s.tread, cy + inner, s.tread, s.width));
    } else throw Error("Choose a supported stair shape");
    const points = treads.flatMap((t) => t.points),
      xmin = Math.min(...points.map((q) => q.x)),
      ymin = Math.min(...points.map((q) => q.y));
    for (const t of treads)
      t.points = t.points.map((q) => pt(q.x - xmin, q.y - ymin));
    return {
      treads,
      count,
      riser,
      width: Math.max(...points.map((q) => q.x)) - xmin,
      depth: Math.max(...points.map((q) => q.y)) - ymin,
      walklineTread:
        s.style === "winder"
          ? ((Math.max(6, Math.min(s.turnSteps, count - 2) * 1.5) +
              s.width / 2) *
              Math.PI) /
            2 /
            Math.min(s.turnSteps, count - 2)
          : s.tread,
      landing: Math.max(s.landing, s.style === "l-shape" ? s.width : 0),
    };
  }
  function orientedStairs(p, e) {
    const spec = W.data(p).stairs[e.id];
    if (!spec) return null;
    const result = stairs(spec),
      sideways = ["left", "right"].includes(e.dir),
      w = result.width,
      h = result.depth;
    const turn = (q) =>
      e.dir === "right"
        ? pt(q.y, w - q.x)
        : e.dir === "left"
          ? pt(h - q.y, q.x)
          : e.dir === "down"
            ? pt(w - q.x, h - q.y)
            : q;
    return {
      ...result,
      width: sideways ? h : w,
      depth: sideways ? w : h,
      treads: result.treads.map((t) => ({
        ...t,
        points: t.points.map((q) => {
          const v = turn(q);
          return pt(v.x + e.x, v.y + e.y);
        }),
      })),
    };
  }
  function ramp(r) {
    const run = r.rise * r.ratio,
      count = Math.ceil(run / r.maxRun);
    if (count > 100) throw Error("Ramp requires more than 100 flights");
    const flights = [],
      landings = [],
      gap = 4;
    let used = 0;
    for (let i = 0; i < count; i++) {
      const length = Math.min(r.maxRun, run - used),
        x = r.x + i * (r.width + gap),
        y = r.y + r.landing + (i % 2 ? r.maxRun - length : 0),
        z0 = used / r.ratio,
        z1 = (used + length) / r.ratio;
      flights.push({
        points: rect(x, y, r.width, length),
        z0,
        z1,
        reverse: i % 2 === 1,
        index: i,
      });
      used += length;
      if (i < count - 1)
        landings.push({
          points: rect(
            x,
            i % 2 ? r.y : r.y + r.landing + r.maxRun,
            2 * r.width + gap,
            r.landing,
          ),
          top: z1,
        });
    }
    landings.push({ points: rect(r.x, r.y, r.width, r.landing), top: 0 });
    const last = flights.at(-1);
    landings.push({
      points: rect(
        last.points[0].x,
        count % 2 ? r.y + r.landing + r.maxRun : r.y,
        r.width,
        r.landing,
      ),
      top: r.rise,
    });
    return {
      flights,
      landings,
      count,
      run,
      width: count * r.width + (count - 1) * gap,
      depth: r.maxRun + 2 * r.landing,
      slope: 1 / r.ratio,
    };
  }
  function structureGrid(
    p,
    { xs, ys, floors, width = 12, depth = 12, beamDepth = 18 },
  ) {
    const next = clone(p);
    if (xs.length > 30 || ys.length > 30 || floors.length > 50)
      throw Error("Structural grid is too large");
    for (const floor of floors) {
      for (const x of xs)
        for (const y of ys)
          W.data(next).structure.push({
            id: P.uid(),
            name: "Column",
            kind: "column",
            floor,
            x: x - width / 2,
            y: y - depth / 2,
            w: width,
            h: depth,
            base: 0,
            height: W.floorHeight(p, floor),
          });
      for (const y of ys)
        for (let i = 1; i < xs.length; i++)
          W.data(next).structure.push({
            id: P.uid(),
            name: "Beam X",
            kind: "beam",
            floor,
            x: xs[i - 1],
            y: y - width / 2,
            w: xs[i] - xs[i - 1],
            h: width,
            base: W.floorHeight(p, floor) - beamDepth,
            height: beamDepth,
          });
      for (const x of xs)
        for (let i = 1; i < ys.length; i++)
          W.data(next).structure.push({
            id: P.uid(),
            name: "Beam Y",
            kind: "beam",
            floor,
            x: x - width / 2,
            y: ys[i - 1],
            w: width,
            h: ys[i] - ys[i - 1],
            base: W.floorHeight(p, floor) - beamDepth,
            height: beamDepth,
          });
    }
    return P.normalize(next);
  }
  function structureChecks(p) {
    const rows = [],
      members = W.data(p).structure;
    for (const c of members.filter((s) => s.kind === "column" && s.floor > 0)) {
      const below = members.find(
        (s) =>
          s.kind === "column" &&
          s.floor === c.floor - 1 &&
          Math.abs(s.x - c.x) < 0.01 &&
          Math.abs(s.y - c.y) < 0.01 &&
          Math.abs(s.w - c.w) < 0.01 &&
          Math.abs(s.h - c.h) < 0.01,
      );
      if (!below)
        rows.push({
          id: c.id,
          floor: c.floor,
          text: "Column has no aligned column below",
          severity: "warning",
        });
    }
    return rows;
  }
  function doorSector(p, f) {
    if (f.type !== "door" || ["sliding", "open"].includes(f.style)) return [];
    const s = M.openingSegment(p, f),
      len = f.size,
      hinge = f.handing === "right" ? s.b : s.a,
      leaf = f.handing === "right" ? s.a : s.b,
      start = Math.atan2(leaf.y - hinge.y, leaf.x - hinge.x),
      room = p.elements[f.roomId],
      center = pt(room.x + room.w / 2, room.y + room.h / 2),
      side =
        Math.sign(
          (leaf.x - hinge.x) * (center.y - hinge.y) -
            (leaf.y - hinge.y) * (center.x - hinge.x),
        ) || 1,
      sign = f.swing === "out" ? -side : side;
    return [
      hinge,
      ...Array.from({ length: 17 }, (_, i) =>
        pt(
          hinge.x + len * Math.cos(start + (((sign * Math.PI) / 2) * i) / 16),
          hinge.y + len * Math.sin(start + (((sign * Math.PI) / 2) * i) / 16),
        ),
      ),
    ];
  }
  function interiorChecks(p, layout) {
    const room = p.elements.find((e) => e.id === layout.room),
      out = [];
    if (!room) return [{ text: "Room no longer exists" }];
    const clear = D.clear(p, room).geometry,
      sectors = p.fixtures
        .filter((f) => f.roomUid === room.id)
        .map((f) => doorSector(p, f))
        .filter((ps) => ps.length);
    for (let n = 0; n < layout.items.length; n++) {
      const a = layout.items[n];
      if (D.geomArea(PC.difference(W.box(a), clear)) > 0.01)
        out.push({
          id: a.id,
          text: a.type + " crosses the clear room boundary",
        });
      if (
        (a.base || 0) < 72 &&
        sectors.some(
          (ps) => D.geomArea(PC.intersection(W.box(a), D.polygon(ps))) > 0.1,
        )
      )
        out.push({ id: a.id, text: a.type + " obstructs a door swing" });
      for (const b of layout.items.slice(n + 1))
        if (
          Math.max(a.base || 0, b.base || 0) <
            Math.min((a.base || 0) + a.height, (b.base || 0) + b.height) &&
          D.geomArea(PC.intersection(W.box(a), W.box(b))) > 0.1
        )
          out.push({ id: a.id, text: a.type + " overlaps " + b.type });
      if (a.clearance) {
        const front = { x: a.x, y: a.y + a.h, w: a.w, h: a.clearance };
        if (
          D.geomArea(PC.difference(W.box(front), clear)) > 0.1 ||
          layout.items.some(
            (b) =>
              b !== a &&
              (b.base || 0) < 72 &&
              D.geomArea(PC.intersection(W.box(front), W.box(b))) > 0.1,
          )
        )
          out.push({
            id: a.id,
            text: a.type + " has insufficient front clearance",
          });
      }
    }
    return out;
  }
  function bathroom(
    p,
    roomId,
    {
      toilet = true,
      basin = true,
      shower = true,
      clearance = 24,
      variant = 0,
    } = {},
  ) {
    const room = p.elements.find((e) => e.id === roomId);
    if (!room) throw Error("Choose a room");
    const c = D.clear(p, room),
      ps = D.paths(c.geometry).flat(),
      x = Math.min(...ps.map((q) => q.x)),
      y = Math.min(...ps.map((q) => q.y)),
      right = Math.max(...ps.map((q) => q.x)),
      bottom = Math.max(...ps.map((q) => q.y)),
      items = [];
    const add = (type, x, y, w, h, height, space = 0) =>
      items.push({
        id: P.uid(),
        type,
        x,
        y,
        w,
        h,
        height,
        base: 0,
        clearance: space,
      });
    if (toilet) add("toilet", x + 3, y + 3, 28, 30, 30, clearance);
    if (basin) add("basin", right - 25, y + 3, 24, 20, 32, clearance);
    if (shower) add("shower", x + 3, bottom - 39, 36, 36, 3, 0);
    if (variant) for (const i of items) i.x = x + right - i.x - i.w;
    const layout = {
      id: P.uid(),
      name: "Bathroom layout",
      room: roomId,
      kind: "bathroom",
      items,
    };
    return { layout, findings: interiorChecks(p, layout) };
  }
  function kitchen(
    p,
    roomId,
    {
      modules = 5,
      moduleWidth = 24,
      depth = 24,
      height = 34,
      wallUnits = true,
      shape = "straight",
    } = {},
  ) {
    const room = p.elements.find((e) => e.id === roomId);
    if (!room) throw Error("Choose a room");
    if (modules < 2 || modules > 30) throw Error("Use 2–30 kitchen modules");
    const c = D.clear(p, room),
      ps = D.paths(c.geometry).flat(),
      x = Math.min(...ps.map((q) => q.x)) + 1,
      y = Math.min(...ps.map((q) => q.y)) + 1,
      right = Math.max(...ps.map((q) => q.x)) - 1,
      items = [];
    for (let n = 0; n < modules; n++) {
      let ix = x + n * moduleWidth,
        iy = y,
        w = moduleWidth,
        h = depth;
      if (shape === "l-shape" && ix + w > right) {
        ix = x;
        iy =
          y + depth + (n - Math.floor((right - x) / moduleWidth)) * moduleWidth;
        w = depth;
        h = moduleWidth;
      }
      const type = n === 1 ? "sink" : n === modules - 2 ? "hob" : "cabinet";
      items.push({
        id: P.uid(),
        type,
        x: ix,
        y: iy,
        w,
        h,
        height,
        base: 0,
        clearance: 36,
      });
      if (wallUnits && type !== "hob")
        items.push({
          id: P.uid(),
          type: "wall-cabinet",
          x: ix,
          y: iy,
          w,
          h: Math.min(h, 14),
          height: 30,
          base: 54,
          clearance: 0,
        });
    }
    const layout = {
      id: P.uid(),
      name: "Kitchen layout",
      room: roomId,
      kind: "kitchen",
      items,
    };
    return {
      layout,
      findings: interiorChecks(p, layout),
      counterArea: items
        .filter((i) => i.base === 0)
        .reduce((s, i) => s + (i.w * i.h) / 144, 0),
      cabinetCount: items.filter((i) => i.type.includes("cabinet")).length,
    };
  }
  function interiorFurniture(p) {
    return W.data(p).interiors.flatMap((l) =>
      l.items
        .filter((i) => (i.base || 0) < 36)
        .map((i) => ({
          ...i,
          isFurniture: true,
          type: i.type,
          floor: p.elements.find((e) => e.id === l.room)?.floor || 0,
          rot: 0,
        })),
    );
  }
  function furnitureAlternatives(
    p,
    roomId,
    { clearance = 12, step = 12 } = {},
  ) {
    const room = p.elements.find((e) => e.id === roomId);
    if (!room) throw Error("Choose a room");
    const originals = p.elements.filter(
      (e) =>
        e.isFurniture &&
        e.floor === room.floor &&
        M.inside(pt(e.x + e.w / 2, e.y + e.h / 2), M.points(room)),
    );
    if (!originals.length) throw Error("Add furniture to this room first");
    if (originals.length > 30)
      throw Error("Optimize at most 30 furniture objects at once");
    const c = D.clear(p, room).geometry,
      points = D.paths(c).flat(),
      xmin = Math.min(...points.map((q) => q.x)),
      ymin = Math.min(...points.map((q) => q.y)),
      xmax = Math.max(...points.map((q) => q.x)),
      ymax = Math.max(...points.map((q) => q.y)),
      doors = p.fixtures.filter(
        (f) => f.roomUid === room.id && f.type === "door",
      ),
      sectors = doors.map((f) => doorSector(p, f)).filter((ps) => ps.length),
      out = [];
    for (let variant = 0; variant < 3; variant++) {
      const placed = [],
        ordered = [...originals].sort((a, b) =>
          variant === 1 ? a.w * a.h - b.w * b.h : b.w * b.h - a.w * a.h,
        );
      let failure = "";
      for (const e of ordered) {
        if (e.locked) {
          placed.push(clone(e));
          continue;
        }
        const spots = [];
        for (let y = ymin; y <= ymax - e.h; y += step)
          for (let x = xmin; x <= xmax - e.w; x += step) {
            spots.push({ x, y });
            if (spots.length > 15000) break;
          }
        spots.sort((a, b) =>
          variant === 2 ? b.x - a.x || b.y - a.y : a.y - b.y || a.x - b.x,
        );
        let best;
        for (const q of spots) {
          for (const rot of [0, 90]) {
            const candidate = { ...clone(e), x: q.x, y: q.y, rot },
              bounds = M.points(candidate),
              g = D.polygon(bounds);
            if (
              D.geomArea(PC.difference(g, c)) > 0.01 ||
              sectors.some(
                (ps) => D.geomArea(PC.intersection(g, D.polygon(ps))) > 0.01,
              ) ||
              placed.some(
                (b) =>
                  D.geomArea(
                    PC.intersection(
                      g,
                      D.polygon(
                        D.offsetPath(M.points(b), clearance)[0] || M.points(b),
                      ),
                    ),
                  ) > 0.01,
              )
            )
              continue;
            best = candidate;
            break;
          }
          if (best) break;
        }
        if (!best) {
          failure = "No placement found for " + (e.customName || e.type);
          break;
        }
        placed.push(best);
      }
      if (failure) {
        out.push({ error: failure, variant });
        continue;
      }
      const next = clone(p);
      for (const e of placed)
        Object.assign(
          next.elements.find((n) => n.id === e.id),
          e,
        );
      const free = [];
      for (let y = ymin + 18; y < ymax - 18; y += 18)
        for (let x = xmin + 18; x < xmax - 18; x += 18) {
          const q = pt(x, y);
          if (
            M.inside(q, M.points(room)) &&
            !placed.some((e) => M.inside(q, M.points(e)))
          )
            free.push(q);
        }
      free.sort(
        (a, b) =>
          Math.hypot(a.x - room.x - room.w / 2, a.y - room.y - room.h / 2) -
          Math.hypot(b.x - room.x - room.w / 2, b.y - room.y - room.h / 2),
      );
      const target = free[0];
      let circulation = !!target;
      for (const f of doors) {
        if (!target) break;
        const s = M.openingSegment(next, f),
          mid = pt((s.a.x + s.b.x) / 2, (s.a.y + s.b.y) / 2),
          dx = target.x - mid.x,
          dy = target.y - mid.y,
          len = Math.hypot(dx, dy) || 1,
          start = pt(mid.x + (dx / len) * 24, mid.y + (dy / len) * 24);
        const probe = { ...next, currentFloor: room.floor };
        if (
          !D.route(
            probe,
            start,
            target,
            Math.min(24, p.design.accessibility.width),
          ).found
        )
          circulation = false;
      }
      out.push({
        project: P.normalize(next),
        variant,
        circulation,
        score: circulation ? 100 : 40,
        warning: circulation
          ? ""
          : "No sampled access route was found for every door",
      });
    }
    return out;
  }
  function perimeterObjects(
    p,
    {
      height = 72,
      thickness = 9,
      gateEdge = 0,
      gateOffset = 30,
      gateWidth = 120,
    },
  ) {
    const next = clone(p),
      ps = W.boundary(p);
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i],
        b = ps[(i + 1) % ps.length],
        length = M.distance(a, b),
        at = (t) =>
          pt(
            a.x + ((b.x - a.x) * t) / length,
            a.y + ((b.y - a.y) * t) / length,
          ),
        parts =
          i === gateEdge
            ? [
                [0, Math.max(0, gateOffset)],
                [Math.min(length, gateOffset + gateWidth), length],
              ]
            : [[0, length]];
      if (i === gateEdge && gateOffset + gateWidth > length)
        throw Error("Gate does not fit this boundary edge");
      for (const [start, end] of parts)
        if (end > start) {
          const points = D.wallStrip(
            { a: at(start), b: at(end), thickness },
            false,
          )[0].map(([x, y]) => pt(x, y));
          W.data(next).outdoors.push({
            id: P.uid(),
            name: "Compound wall",
            kind: "wall",
            points,
            height,
            base: 0,
          });
        }
      if (i === gateEdge) {
        const points = D.wallStrip(
          { a: at(gateOffset), b: at(gateOffset + gateWidth), thickness: 2 },
          false,
        )[0].map(([x, y]) => pt(x, y));
        W.data(next).outdoors.push({
          id: P.uid(),
          name: "Gate",
          kind: "gate",
          points,
          height,
          base: 0,
        });
      }
    }
    return P.normalize(next);
  }
  function packSite(p, req, variant = 0) {
    let next = M.generateLegacy ? M.generateLegacy(p, req, variant) : null;
    if (!next) throw Error("Generator unavailable");
    if (!W.data(p).site.boundary.length) return next;
    const fixed = new Set([
        ...p.elements.filter((e) => e.locked).map((e) => e.id),
        ...(req.preserve || []),
      ]),
      placed = next.elements.filter(
        (e) =>
          fixed.has(e.id) || !req.floors.includes(e.floor) || e.isFurniture,
      ),
      movable = next.elements.filter(
        (e) =>
          !fixed.has(e.id) && req.floors.includes(e.floor) && !e.isFurniture,
      ),
      bounds = W.boundary(p),
      xmin = Math.max(0, Math.min(...bounds.map((q) => q.x))),
      ymin = Math.max(0, Math.min(...bounds.map((q) => q.y))),
      xmax = Math.min(
        P.inches(p.plot.inW, p.unit),
        Math.max(...bounds.map((q) => q.x)),
      ),
      ymax = Math.min(
        P.inches(p.plot.inH, p.unit),
        Math.max(...bounds.map((q) => q.y)),
      );
    for (const e of movable.sort((a, b) => b.w * b.h - a.w * a.h)) {
      let found = false;
      for (let y = ymin; y + e.h <= ymax && !found; y += 6)
        for (let x = xmin; x + e.w <= xmax && !found; x += 6) {
          const q = { ...e, x, y };
          if (
            W.insideSite(p, q) &&
            !placed.some(
              (b) => b.floor === e.floor && !b.isFurniture && M.overlap(q, b),
            )
          ) {
            e.x = x;
            e.y = y;
            placed.push(e);
            found = true;
          }
        }
      if (!found)
        throw Error(
          (e.customName || e.type) + " cannot fit inside the setback polygon",
        );
    }
    return P.normalize(next);
  }
  M.generateLegacy = M.generate;
  M.generate = function (p, req, variant) {
    return W.data(p).site.boundary.length
      ? packSite(p, req, variant)
      : M.generateLegacy(p, req, variant);
  };
  Object.assign(W, {
    rect,
    stairs,
    orientedStairs,
    ramp,
    structureGrid,
    structureChecks,
    doorSector,
    interiorChecks,
    bathroom,
    kitchen,
    interiorFurniture,
    furnitureAlternatives,
    perimeterObjects,
    packSite,
  });
  if (typeof module !== "undefined") module.exports = W;
})(typeof window !== "undefined" ? window : globalThis);
(function (root) {
  const W = root.WorkbenchModel,
    D = root.DesignModel,
    M = root.PlanningModel,
    P = root.ProjectModel,
    PC =
      root.polygonClipping ||
      (typeof require === "function"
        ? require("../vendor/geometry/polygon-clipping.js")
        : null),
    originalClear = D.clear;
  function roomHoles(p, e) {
    return [
      ...W.data(p)
        .voids.filter((v) => e.floor > v.from && e.floor <= v.to)
        .map((v) => D.polygon(v.points)),
      ...W.data(p)
        .shafts.filter((s) => e.floor >= s.from && e.floor <= s.to)
        .map((s) => (s.points ? D.polygon(s.points) : W.box(s))),
    ];
  }
  D.clear = M.clear = function (p, e, walls) {
    const c = originalClear(p, e, walls),
      holes = e.isFurniture ? [] : roomHoles(p, e);
    if (!holes.length) return c;
    const geometry = PC.difference(c.geometry, ...holes),
      points = D.paths(geometry).flat();
    return {
      ...c,
      geometry,
      polygon: D.paths(geometry)[0] || [],
      area: D.geomArea(geometry),
      w: points.length
        ? Math.max(...points.map((q) => q.x)) -
          Math.min(...points.map((q) => q.x))
        : 0,
      h: points.length
        ? Math.max(...points.map((q) => q.y)) -
          Math.min(...points.map((q) => q.y))
        : 0,
    };
  };
  const originalAnalysis = D.analyze;
  D.analyze = function (p) {
    const out = originalAnalysis(p),
      w = W.data(p);
    out.push(...W.siteFindings(p), ...W.structureChecks(p));
    for (const l of w.interiors)
      for (const f of W.interiorChecks(p, l))
        out.push({
          ...f,
          code: "interior-fit",
          floor: p.elements.find((e) => e.id === l.room)?.floor || 0,
          severity: "warning",
          measured: "Geometry conflict",
          target: "Room and access clearance",
        });
    for (const e of p.elements.filter(
      (e) => e.type === "staircase" && w.stairs[e.id],
    )) {
      const stair = W.orientedStairs(p, e),
        target = e.stairDesign?.headroom || 80;
      let min = Infinity;
      for (const t of stair.treads) {
        const q = {
            x: t.points.reduce((s, q) => s + q.x, 0) / t.points.length,
            y: t.points.reduce((s, q) => s + q.y, 0) / t.points.length,
          },
          z = W.roomBase(p, e) + t.top;
        for (const c of p.design.ceilings.filter(
          (c) => c.floor === e.floor && M.inside(q, M.points(c)),
        ))
          min = Math.min(min, W.floorBase(p, c.floor) + c.height - z);
        if (e.floor < p.floorCount - 1) {
          const slab = W.slabGeometry(p, e.floor);
          if (
            slab.some(
              (poly) =>
                M.inside(
                  q,
                  poly[0].map(([x, y]) => ({ x, y })),
                ) &&
                !poly.slice(1).some((r) =>
                  M.inside(
                    q,
                    r.map(([x, y]) => ({ x, y })),
                  ),
                ),
            )
          )
            min = Math.min(
              min,
              W.floorBase(p, e.floor) + W.floorHeight(p, e.floor) - 6 - z,
            );
        }
      }
      if (min < target)
        out.push({
          id: e.id,
          floor: e.floor,
          code: "parametric-stair-headroom",
          text: "Stair tread samples intersect the required overhead clearance",
          measured: min.toFixed(1) + " in",
          target: target + " in",
          severity: "error",
        });
    }
    return out;
  };
  const originalQuantities = M.quantities;
  M.quantities = function (p) {
    const q = originalQuantities(p),
      w = W.data(p);
    if (!w.levels.length && !w.voids.length && !w.shafts.length) return q;
    for (const f of q.floors) {
      let area = 0;
      for (const wall of P.walls(p).filter((w) => w.floor === f.floor)) {
        const wallHeight = wall.height || W.floorHeight(p, wall.floor),
          cuts = [
            ...new Set([
              0,
              wall.length,
              ...wall.openings.flatMap((o) => [o.start, o.end]),
            ]),
          ].sort((a, b) => a - b);
        for (let i = 1; i < cuts.length; i++) {
          const a = cuts[i - 1],
            b = cuts[i],
            ranges = wall.openings
              .filter((o) => (a + b) / 2 > o.start && (a + b) / 2 < o.end)
              .map((o) => [o.sill, o.sill + o.height])
              .sort((a, b) => a[0] - b[0]);
          let top = 0,
            opened = 0;
          for (const [lo, hi] of ranges) {
            opened += Math.max(0, Math.min(wallHeight, hi) - Math.max(lo, top));
            top = Math.max(top, hi);
          }
          area += ((b - a) * (wallHeight - opened)) / 144;
        }
      }
      f.wall = area;
      f.paint = area * 2;
      const geometries = p.elements
        .filter((e) => !e.isFurniture && e.floor === f.floor)
        .map((e) => D.clear(p, e).geometry);
      f.floorArea = geometries.length
        ? D.geomArea(PC.union(...geometries)) / 144
        : 0;
      const c = p.planning.cost;
      f.estimate =
        (f.wall * c.wall + f.paint * c.paint + f.floorArea * c.floor) *
        (1 + c.wastage / 100);
    }
    q.total = q.floors.reduce((s, f) => s + f.estimate, 0);
    return q;
  };
})(typeof window !== "undefined" ? window : globalThis);
(function (root) {
  const W = root.WorkbenchModel,
    P = root.ProjectModel,
    D = root.DesignModel,
    M = root.PlanningModel,
    PC =
      root.polygonClipping ||
      (typeof require === "function"
        ? require("../vendor/geometry/polygon-clipping.js")
        : null);
  W.roofElevation = function (p, q) {
    const r = p.design.roof,
      width = P.inches(p.plot.inW, p.unit),
      depth = P.inches(p.plot.inH, p.unit),
      base =
        W.floorBase(p, p.floorCount - 1) + W.floorHeight(p, p.floorCount - 1),
      x = Math.abs(q.x - width / 2) / (width / 2 + r.overhang),
      y = Math.abs(q.y - depth / 2) / (depth / 2 + r.overhang);
    return (
      base +
      (r.type === "flat"
        ? 8
        : r.type === "shed"
          ? Math.max(0, (width + r.overhang - q.x) / (width + 2 * r.overhang)) *
            r.rise
          : r.type === "hip"
            ? Math.max(0, 1 - Math.max(x, y)) * r.rise
            : Math.max(0, 1 - x) * r.rise)
    );
  };
  const originalClashes = W.serviceClashes;
  W.serviceClashes = function (p) {
    const out = originalClashes(p);
    for (const service of W.data(p).services3d)
      for (let i = 1; i < service.points.length; i++) {
        const a = service.points[i - 1],
          b = service.points[i];
        for (let f = 0; f < p.floorCount; f++) {
          const top = W.floorBase(p, f) + W.floorHeight(p, f),
            bottom = top - 6,
            radius = service.diameter / 2,
            lo = Math.min(a.z, b.z) - radius,
            hi = Math.max(a.z, b.z) + radius;
          if (hi < bottom || lo > top) continue;
          const t =
              Math.abs(b.z - a.z) < 0.0001
                ? 0.5
                : Math.max(
                    0,
                    Math.min(1, ((top + bottom) / 2 - a.z) / (b.z - a.z)),
                  ),
            q = {
              x: a.x + (b.x - a.x) * t,
              y: a.y + (b.y - a.y) * t,
              z: a.z + (b.z - a.z) * t,
            };
          if (
            W.slabGeometry(p, f).some(
              (poly) =>
                M.inside(
                  q,
                  poly[0].map(([x, y]) => ({ x, y })),
                ) &&
                !poly.slice(1).some((r) =>
                  M.inside(
                    q,
                    r.map(([x, y]) => ({ x, y })),
                  ),
                ),
            )
          )
            out.push({ a: service.id, b: "slab:" + f, point: q, kind: "slab" });
        }
      }
    return out;
  };
})(typeof window !== "undefined" ? window : globalThis);
// Keep room-owned fitouts attached through the editor's existing move/transform paths.
(function (root) {
  const W = root.WorkbenchModel,
    D = root.DesignModel,
    M = root.PlanningModel;
  W.followNativeChanges = function (before, after) {
    const old = W.data(before),
      w = W.data(after);
    for (const layout of w.interiors) {
      const prior = old.interiors.find((l) => l.id === layout.id),
        a = before.elements.find((e) => e.id === layout.room),
        b = after.elements.find((e) => e.id === layout.room);
      if (
        !prior ||
        !a ||
        !b ||
        JSON.stringify(prior.items) !== JSON.stringify(layout.items)
      )
        continue;
      const dx = b.x - a.x,
        dy = b.y - a.y;
      if (dx || dy)
        layout.items.forEach((i) => {
          i.x += dx;
          i.y += dy;
        });
    }
    for (const f of after.fixtures) {
      const prior = before.fixtures.find((v) => v.id === f.id),
        link = w.openingLinks[f.id];
      if (!prior || !link) continue;
      const oldType = old.openingTypes.find((t) => t.id === link.type),
        newType = w.openingTypes.find((t) => t.id === link.type);
      if (JSON.stringify(oldType) !== JSON.stringify(newType)) continue;
      for (const k of ["size", "height", "sill", "style", "handing", "swing"])
        if (f[k] !== prior[k] && !link.overrides.includes(k))
          link.overrides.push(k);
    }
  };
  const transform = D.transformSelection;
  D.transformSelection = function (p, ids, fn) {
    const n = transform(p, ids, fn);
    for (const l of W.data(n).interiors.filter((l) => ids.includes(l.room)))
      for (const item of l.items) {
        const ps = M.points(item).map(fn),
          xs = ps.map((q) => q.x),
          ys = ps.map((q) => q.y);
        item.x = Math.min(...xs);
        item.y = Math.min(...ys);
        item.w = Math.max(...xs) - item.x;
        item.h = Math.max(...ys) - item.y;
      }
    return root.ProjectModel.normalize(n);
  };
  const route = D.route;
  D.route = function (p, ...args) {
    const extra = W.interiorFurniture(p);
    return route(
      extra.length ? { ...p, elements: [...p.elements, ...extra] } : p,
      ...args,
    );
  };
})(typeof window !== "undefined" ? window : globalThis);
