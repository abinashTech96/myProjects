/* Portable presentation settings and geometric placement/clearance checks. */
(function (root) {
  const P = root.ProjectModel || require("./project-model.js");
  const types = [
    "auto",
    "paint",
    "wood",
    "kitchen-tile",
    "bathroom-tile",
    "grass",
    "concrete",
    "shingle",
  ];
  const defaults = () => ({
    surfaces: {},
    openings: {},
    clearance: 36,
    wallSnap: true,
    sunlight: 100,
    eyeHeight: 64,
    walkSpeed: 1,
    lights: { enabled: true, intensity: 0.7, temperature: 3000 },
  });
  function validate(raw, p) {
    const d = { ...defaults(), ...structuredClone(raw || {}) };
    if (
      !d.surfaces ||
      Array.isArray(d.surfaces) ||
      typeof d.surfaces !== "object" ||
      Object.keys(d.surfaces).length > 3000
    )
      throw Error("Invalid surface assignments");
    const ids = new Set(p.elements.map((e) => e.id));
    for (const [id, channels] of Object.entries(d.surfaces)) {
      if (!ids.has(id)) {
        delete d.surfaces[id];
        continue;
      }
      if (!channels || typeof channels !== "object" || Array.isArray(channels))
        throw Error("Invalid surface channels");
      for (const [channel, s] of Object.entries(channels)) {
        if (
          !["floor", "wall", "ceiling"].includes(channel) ||
          !s ||
          !types.includes(s.type) ||
          !/^#[a-f0-9]{6}$/i.test(s.color)
        )
          throw Error("Invalid surface finish");
        P.finite(s.scale, "Texture scale", 0.1, 10);
        P.finite(s.rotation, "Texture rotation", 0, 360);
        P.finite(s.roughness, "Surface roughness", 0.02, 1);
      }
    }
    if (
      !d.openings ||
      typeof d.openings !== "object" ||
      Array.isArray(d.openings) ||
      Object.keys(d.openings).length > 6000
    )
      throw Error("Invalid opening states");
    const fixtures = new Set(p.fixtures.map((f) => f.id));
    for (const [id, fraction] of Object.entries(d.openings)) {
      if (!fixtures.has(id)) delete d.openings[id];
      else P.finite(fraction, "Opening position", 0, 1);
    }
    P.finite(d.sunlight, "Sunlight strength", 0, 100);
    d.wallSnap = d.wallSnap !== false;
    P.finite(d.clearance, "Walking clearance", 6, 120);
    P.finite(d.eyeHeight, "Eye height", 36, 90);
    P.finite(d.walkSpeed, "Walk speed", 0.25, 3);
    d.lights = { ...defaults().lights, ...d.lights };
    d.lights.enabled = !!d.lights.enabled;
    P.finite(d.lights.intensity, "Room light intensity", 0, 3);
    P.finite(d.lights.temperature, "Light temperature", 2000, 6500);
    return d;
  }
  const bounds = (e) => {
    const r = ((e.rot || 0) * Math.PI) / 180,
      c = Math.abs(Math.cos(r)),
      s = Math.abs(Math.sin(r));
    return { x: e.x, y: e.y, w: e.w * c + e.h * s, h: e.w * s + e.h * c };
  };
  const overlap = (a, b) =>
    Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x) + 0.01 &&
    Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y) + 0.01;
  function place(p, id, roomId, edge, gap, align = "center") {
    const object = p.elements.find((e) => e.id === id),
      room = p.elements.find((e) => e.id === roomId);
    if (
      !object?.isFurniture ||
      !room ||
      room.isFurniture ||
      object.floor !== room.floor ||
      object.id === room.id
    )
      throw Error("Choose furniture and a room on the same floor");
    if (object.locked) throw Error("Unlock the furniture first");
    if (
      !["left", "right", "top", "bottom"].includes(edge) ||
      !["start", "center", "end"].includes(align)
    )
      throw Error("Invalid alignment");
    P.finite(gap, "Wall distance", 0, 10000);
    if (room.points) throw Error("Use direct placement for polygon rooms");
    const b = bounds(object),
      inset = p.wallSettings.external / 2 + gap,
      inner = {
        x: room.x + inset,
        y: room.y + inset,
        w: room.w - 2 * inset,
        h: room.h - 2 * inset,
      };
    if (b.w > inner.w || b.h > inner.h)
      throw Error("The furniture does not fit at this wall distance");
    const at = (start, length, size) =>
      start +
      (align === "start"
        ? 0
        : align === "end"
          ? length - size
          : (length - size) / 2);
    return {
      x:
        edge === "left"
          ? inner.x
          : edge === "right"
            ? inner.x + inner.w - b.w
            : at(inner.x, inner.w, b.w),
      y:
        edge === "top"
          ? inner.y
          : edge === "bottom"
            ? inner.y + inner.h - b.h
            : at(inner.y, inner.h, b.h),
    };
  }
  function checks(p, width = p.design?.presentation?.clearance || 36) {
    P.finite(width, "Walking clearance", 6, 120);
    const result = [],
      items = p.elements.filter((e) => e.isFurniture);
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i],
          b = items[j];
        if (a.floor !== b.floor) continue;
        const x = bounds(a),
          y = bounds(b);
        if (overlap(x, y)) {
          result.push({
            ids: [a.id, b.id],
            text: "Furniture collision",
            floor: a.floor,
          });
          continue;
        }
        const vertical = Math.min(x.y + x.h, y.y + y.h) > Math.max(x.y, y.y),
          horizontal = Math.min(x.x + x.w, y.x + y.w) > Math.max(x.x, y.x);
        const gap = vertical
          ? Math.max(y.x - (x.x + x.w), x.x - (y.x + y.w))
          : horizontal
            ? Math.max(y.y - (x.y + x.h), x.y - (y.y + y.h))
            : Infinity;
        if (gap > 0 && gap < width)
          result.push({
            ids: [a.id, b.id],
            text: `Potential narrow passage: ${gap.toFixed(1)} in`,
            floor: a.floor,
          });
      }
    for (const f of p.fixtures.filter((f) => f.type === "door")) {
      const room = p.elements[f.roomId];
      if (!room) continue;
      if (!["open", "sliding"].includes(f.style)) {
        const M = root.PlanningModel || require("./planning-model.js"),
          segment = M.openingSegment(p, f),
          hinge = f.handing === "right" ? segment.b : segment.a,
          mid = {
            x: (segment.a.x + segment.b.x) / 2,
            y: (segment.a.y + segment.b.y) / 2,
          };
        let normal = { x: -segment.u.y, y: segment.u.x };
        if (
          !M.inside(
            { x: mid.x + normal.x, y: mid.y + normal.y },
            M.points(room),
          )
        )
          normal = { x: -normal.x, y: -normal.y };
        if (f.swing === "out") normal = { x: -normal.x, y: -normal.y };
        const points = [
            segment.a,
            segment.b,
            hinge,
            { x: hinge.x + normal.x * f.size, y: hinge.y + normal.y * f.size },
          ],
          xs = points.map((q) => q.x),
          ys = points.map((q) => q.y),
          zone = {
            x: Math.min(...xs),
            y: Math.min(...ys),
            w: Math.max(...xs) - Math.min(...xs),
            h: Math.max(...ys) - Math.min(...ys),
          };
        for (const e of items.filter((e) => e.floor === room.floor))
          if (overlap(bounds(e), zone))
            result.push({
              ids: [e.id, room.id],
              openingId: f.id,
              text: "Furniture enters the door swing envelope",
              floor: room.floor,
            });
      }
      if (f.size < width)
        result.push({
          ids: [room.id],
          openingId: f.id,
          text: `Door narrower than the configured ${width} in clearance`,
          floor: room.floor,
        });
    }
    return result.slice(0, 500);
  }
  function snap(p, e, tolerance = 6) {
    if (
      !e.isFurniture ||
      e.locked ||
      p.design?.presentation?.wallSnap === false
    )
      return {};
    const b = bounds(e),
      room = p.elements
        .filter(
          (r) =>
            !r.isFurniture &&
            !r.points &&
            r.floor === e.floor &&
            b.x + b.w / 2 >= r.x &&
            b.x + b.w / 2 <= r.x + r.w &&
            b.y + b.h / 2 >= r.y &&
            b.y + b.h / 2 <= r.y + r.h,
        )
        .sort((a, b) => a.w * a.h - b.w * b.h)[0];
    if (!room) return {};
    const inset = p.wallSettings.external / 2,
      patch = {};
    for (const [axis, targets] of [
      ["x", [room.x + inset, room.x + room.w - inset - b.w]],
      ["y", [room.y + inset, room.y + room.h - inset - b.h]],
    ]) {
      const nearest = targets.sort(
        (a, b) => Math.abs(a - e[axis]) - Math.abs(b - e[axis]),
      )[0];
      if (Math.abs(nearest - e[axis]) <= tolerance) patch[axis] = nearest;
    }
    return patch;
  }
  const api = {
    defaults,
    validate,
    types,
    bounds,
    overlap,
    place,
    checks,
    snap,
  };
  root.PresentationModel = api;
  if (typeof module === "object") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
