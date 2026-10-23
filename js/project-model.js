/* Pure project data, coordinates and validation. Internal geometry is always inches. */
(function (root) {
  "use strict";
  const PLOT_DEFAULTS = {
    inW: "278",
    inH: "417",
    aL: "26",
    aU: "28",
    bR: "75",
    bU: "35",
    cR: "22",
    cD: "33",
    dL: "51",
    dD: "41",
    roadSide: "east",
  };
  const uid = () =>
    root.crypto?.randomUUID?.() ||
    `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const clone = (value) => structuredClone(value);
  const escapeHTML = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function inches(value, unit = "in") {
    if (typeof value === "number") return unit === "cm" ? value / 2.54 : value;
    const text = String(value ?? "").trim();
    if (!text) return NaN;
    if (unit === "ftin") {
      const match = text.match(
        /^(-?\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in|inches)?)?$/i,
      );
      if (match)
        return (
          Number(match[1]) * 12 +
          Math.sign(Number(match[1]) || 1) * Number(match[2] || 0)
        );
    }
    if (!/^-?\d+(?:\.\d+)?$/.test(text)) return NaN;
    return Number(text) / (unit === "cm" ? 2.54 : 1);
  }
  function display(value, unit) {
    if (unit === "cm") return String(Number((value * 2.54).toFixed(4)));
    if (unit === "ftin") {
      const v = Math.round(value * 1000) / 1000;
      return `${Math.floor(v / 12)}' ${Number((v % 12).toFixed(3))}"`;
    }
    return String(Number(value.toFixed(4)));
  }
  function finite(value, label, min = -1000000, max = 1000000) {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    )
      throw new Error(`${label} must be between ${min} and ${max}.`);
    return value;
  }
  function normalize(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.elements))
      throw new Error("A project must contain an elements array.");
    if (raw.elements.length > 3000 || (raw.fixtures?.length || 0) > 6000)
      throw new Error("Project exceeds the supported element limit.");
    if (raw.version && Number.parseFloat(raw.version) > 2)
      throw new Error("This project uses a newer format.");
    const project = {
      version: "2.0",
      name: String(raw.name || "Untitled plan").slice(0, 100),
      author: String(raw.author || "").slice(0, 100),
      unit: raw.unit || "in",
      compass: raw.compass || "West",
      scale: Number(raw.scale ?? 1.2),
      floorCount: Number(raw.floorCount ?? raw.floors ?? 1),
      currentFloor: Number(raw.currentFloor ?? 0),
      plot: {
        ...PLOT_DEFAULTS,
        ...(raw.plot || { inW: raw.inW ?? "278", inH: raw.inH ?? "417" }),
      },
      layouts: { ...raw.layouts },
      wallSettings: {
        external: 9,
        internal: 4.5,
        height: 120,
        ...(raw.wallSettings || {}),
      },
      wallOverrides: { ...raw.wallOverrides },
      constraints: clone(raw.constraints || []),
      view: clone(raw.view || {}),
      elements: clone(raw.elements),
      fixtures: clone(raw.fixtures || []),
    };
    if (
      !["in", "cm", "ftin"].includes(project.unit) ||
      !["North", "East", "South", "West"].includes(project.compass)
    )
      throw new Error("Invalid units or compass direction.");
    finite(project.scale, "Drawing scale", 0.1, 10);
    for (const key of Object.keys(PLOT_DEFAULTS).filter(
      (k) => k !== "roadSide",
    )) {
      const n = inches(project.plot[key], project.unit);
      finite(n, `Plot ${key}`, ["inW", "inH"].includes(key) ? 1 : 0, 100000);
      project.plot[key] = String(project.plot[key]);
    }
    if (
      !["north", "south", "east", "west", "none"].includes(
        project.plot.roadSide,
      )
    )
      throw new Error("Invalid road direction.");
    const ids = new Set();
    project.elements.forEach((el, i) => {
      if (
        !el ||
        typeof el !== "object" ||
        typeof el.type !== "string" ||
        !/^[a-z][a-z0-9_-]{0,40}$/i.test(el.type)
      )
        throw new Error(`Invalid element ${i + 1}.`);
      ["x", "y"].forEach((k) => finite(el[k], `Element ${i + 1} ${k}`));
      ["w", "h"].forEach((k) =>
        finite(el[k], `Element ${i + 1} ${k}`, 1, 100000),
      );
      finite(el.floor, "Floor", 0, 49);
      if (!Number.isInteger(el.floor))
        throw new Error("Floor must be an integer.");
      el.id =
        typeof el.id === "string" && /^[a-zA-Z0-9:_-]{1,100}$/.test(el.id)
          ? el.id
          : uid();
      if (ids.has(el.id)) el.id = uid();
      ids.add(el.id);
      el.rot = ((Number(el.rot ?? el.rotation ?? 0) % 360) + 360) % 360;
      finite(el.rot, "Rotation", 0, 360);
      if (el.rot % 90 !== 0)
        throw new Error("Use rotation in 90 degree increments.");
      delete el.rotation;
      if (el.type === "staircase")
        el.stackId =
          typeof el.stackId === "string" &&
          /^[a-zA-Z0-9:_-]{1,100}$/.test(el.stackId)
            ? el.stackId
            : el.id;
      el.customName = String(el.customName || "").slice(0, 120);
      if (el.customColor && !/^#[0-9a-f]{6}$/i.test(el.customColor))
        throw new Error("Invalid element color.");
      if (
        el.material &&
        ![
          "auto",
          "wood",
          "kitchen-tile",
          "bathroom-tile",
          "grass",
          "concrete",
          "shingle",
        ].includes(el.material)
      )
        throw new Error("Invalid material.");
      el.locked = !!el.locked;
      el.isFurniture = !!el.isFurniture;
      if (el.groupId) el.groupId = String(el.groupId).slice(0, 100);
    });
    project.fixtures.forEach((f, i) => {
      if (
        !f ||
        !["door", "window"].includes(f.type) ||
        !["top", "bottom", "left", "right"].includes(f.edge)
      )
        throw new Error(`Invalid opening ${i + 1}.`);
      if (
        (!Number.isInteger(f.roomId) || !project.elements[f.roomId]) &&
        f.roomUid
      )
        f.roomId = project.elements.findIndex((el) => el.id === f.roomUid);
      if (
        !Number.isInteger(f.roomId) ||
        !project.elements[f.roomId] ||
        project.elements[f.roomId].isFurniture
      )
        throw new Error("Opening refers to a missing room.");
      f.roomUid = project.elements[f.roomId].id;
      f.id =
        typeof f.id === "string" && /^[a-zA-Z0-9:_-]{1,100}$/.test(f.id)
          ? f.id
          : uid();
      finite(f.size, "Opening width", 1, 100000);
      finite(f.offset, "Opening offset", 0, 100000);
      const limit = ["top", "bottom"].includes(f.edge)
        ? project.elements[f.roomId].w
        : project.elements[f.roomId].h;
      if (f.size > limit || f.offset + f.size > limit + 0.001)
        throw new Error("Opening must fit within its wall.");
      f.height = finite(
        Number(f.height ?? (f.type === "door" ? 80 : 40)),
        "Opening height",
        1,
        project.wallSettings.height,
      );
      f.sill = finite(
        Number(f.sill ?? (f.type === "door" ? 0 : 40)),
        "Opening sill",
        0,
        project.wallSettings.height,
      );
      if (f.height + f.sill > project.wallSettings.height)
        throw new Error("Opening extends above the wall.");
    });
    project.floorCount = Math.max(
      project.floorCount,
      1,
      ...project.elements.map((e) => e.floor + 1),
    );
    finite(project.floorCount, "Floor count", 1, 50);
    if (!Number.isInteger(project.floorCount))
      throw new Error("Floor count must be an integer.");
    project.currentFloor = Math.max(
      0,
      Math.min(project.floorCount - 1, Math.floor(project.currentFloor || 0)),
    );
    ["external", "internal"].forEach((k) =>
      finite(project.wallSettings[k], `${k} wall thickness`, 1, 36),
    );
    finite(project.wallSettings.height, "Wall height", 48, 240);
    if (
      !Array.isArray(project.constraints) ||
      project.constraints.length > 1000
    )
      throw new Error("Invalid constraint list.");
    for (const rule of project.constraints) {
      rule.id =
        typeof rule.id === "string" && /^[a-zA-Z0-9:_-]{1,100}$/.test(rule.id)
          ? rule.id
          : uid();
      if (
        !["offset-x", "offset-y"].includes(rule.kind) ||
        !ids.has(rule.source) ||
        !ids.has(rule.target) ||
        rule.source === rule.target
      )
        throw new Error("Invalid distance constraint.");
      finite(rule.distance, "Constraint distance", -100000, 100000);
    }
    if (project.view.parapetConfig?.version !== undefined) {
      const model = root.ParapetModel || (typeof require === "function" ? require("./parapet-model.js") : null);
      if (!model) throw Error("Parapet validation module is unavailable");
      project.view.parapetConfig = model.config(project.view.parapetConfig, project.view.parapet);
    }
    if (project.view.parapetConfig) {
      const c = project.view.parapetConfig;
      for (const [k, min, max] of [
        ["heightOffset", -15, 30],
        ["thicknessOffset", 0, 15],
        ["elevationOffset", -10, 25],
        ["glassOpacity", 0.1, 1],
        ["glowIntensity", 0, 5],
      ])
        if (c[k] !== undefined) finite(c[k], k, min, max);
      if (c.accentColor && !/^#[a-f0-9]{6}$/i.test(c.accentColor))
        throw new Error("Invalid facade color.");
      if (c.theme && !/^[a-z-]+$/.test(c.theme))
        throw new Error("Invalid facade theme.");
    }
    if (project.view.tour) {
      if (!Array.isArray(project.view.tour) || project.view.tour.length > 100)
        throw new Error("Too many camera waypoints.");
      for (const p of project.view.tour)
        for (const key of ["position", "target"])
          for (const axis of ["x", "y", "z"])
            finite(p[key]?.[axis], "Waypoint");
    }
    if (project.view.mode && !["2d", "split", "3d", "4d"].includes(project.view.mode))
      throw new Error("Invalid workspace mode.");
    if (project.view.camera) {
      finite(project.view.camera.zoomLvl, "Zoom", 0.2, 5);
      finite(project.view.camera.panX, "Camera X");
      finite(project.view.camera.panY, "Camera Y");
    }
    Object.values(project.wallOverrides).forEach((v) =>
      finite(v, "Wall thickness", 1, 36),
    );
    return project;
  }
  function zone(cx, cy, w, h, top) {
    if (Math.abs(cx - w / 2) < w * 0.1 && Math.abs(cy - h / 2) < h * 0.1)
      return "CENTER";
    const rotation = { North: 0, East: 90, South: 180, West: 270 }[top] ?? 270;
    const angle =
      ((Math.atan2(cy - h / 2, cx - w / 2) * 180) / Math.PI + rotation + 720) %
      360;
    return [
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
      "N",
      "NNE",
      "NE",
      "ENE",
    ][Math.floor(((angle + 11.25) % 360) / 22.5)];
  }
  function zonePosition(direction, w, h, plotW, plotH, top, padding = 20) {
    if (direction === "CENTER")
      return { x: (plotW - w) / 2, y: (plotH - h) / 2 };
    const rotation = { North: 0, East: 90, South: 180, West: 270 }[top] ?? 270;
    const angle =
      ({ NE: 315, NW: 225, SE: 45, SW: 135 }[direction] - rotation + 720) % 360;
    return {
      x: Math.cos((angle * Math.PI) / 180) > 0 ? plotW - w - padding : padding,
      y: Math.sin((angle * Math.PI) / 180) > 0 ? plotH - h - padding : padding,
    };
  }
  function walls(project) {
    const edges = [];
    project.elements.forEach((el, i) => {
      if (el.isFurniture || ["staircase", "balcony"].includes(el.type)) return;
      for (const edge of ["top", "bottom", "left", "right"]) {
        const horizontal = ["top", "bottom"].includes(edge);
        edges.push({
          floor: el.floor,
          horizontal,
          fixed: horizontal
            ? el.y + (edge === "bottom" ? el.h : 0)
            : el.x + (edge === "right" ? el.w : 0),
          start: horizontal ? el.x : el.y,
          end: horizontal ? el.x + el.w : el.y + el.h,
          room: i,
          edge,
        });
      }
    });
    const groups = new Map();
    edges.forEach((e) => {
      const k = `${e.floor}:${e.horizontal ? "h" : "v"}:${e.fixed.toFixed(3)}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(e);
    });
    const result = [];
    groups.forEach((list, key) => {
      const points = [...new Set(list.flatMap((e) => [e.start, e.end]))].sort(
        (a, b) => a - b,
      );
      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i],
          end = points[i + 1],
          mid = (start + end) / 2,
          owners = list.filter(
            (e) => mid > e.start - 0.001 && mid < e.end + 0.001,
          );
        if (!owners.length || end - start < 0.001) continue;
        const id = `${key}:${start.toFixed(3)}:${end.toFixed(3)}`,
          shared = owners.length > 1;
        const openings = [];
        owners.forEach((owner) =>
          project.fixtures
            .filter((f) => f.roomId === owner.room && f.edge === owner.edge)
            .forEach((f) => {
              const a = owner.start + f.offset,
                b = a + f.size;
              if (b > start && a < end)
                openings.push({
                  start: Math.max(start, a) - start,
                  end: Math.min(end, b) - start,
                  height: f.height ?? (f.type === "door" ? 80 : 40),
                  sill: f.sill ?? (f.type === "door" ? 0 : 40),
                  type: f.type,
                });
            }),
        );
        result.push({
          id,
          floor: list[0].floor,
          horizontal: list[0].horizontal,
          fixed: list[0].fixed,
          start,
          end,
          owners: owners.map((o) => ({ index: o.room, edge: o.edge })),
          shared,
          thickness:
            project.wallOverrides[id] ??
            project.wallSettings[shared ? "internal" : "external"],
          openings,
        });
      }
    });
    return result;
  }
  function solveConstraints(project) {
    const byId = new Map(project.elements.map((e) => [e.id, e])),
      incoming = new Map();
    project.constraints.forEach((r) => {
      const key = `${r.target}:${r.kind}`;
      if (incoming.has(key))
        throw new Error("Only one constraint per target axis is allowed.");
      incoming.set(key, r);
    });
    for (const axis of ["x", "y"]) {
      const visited = new Set(),
        active = new Set();
      function visit(id) {
        if (active.has(id))
          throw new Error("Distance constraints contain a cycle.");
        if (visited.has(id)) return;
        active.add(id);
        const rule = incoming.get(`${id}:offset-${axis}`);
        if (rule) {
          visit(rule.source);
          const target = byId.get(id),
            source = byId.get(rule.source);
          if (target.locked)
            throw new Error("Unlock the constrained target first.");
          target[axis] = source[axis] + rule.distance;
        }
        active.delete(id);
        visited.add(id);
      }
      byId.forEach((_, id) => visit(id));
    }
    return project;
  }
  root.ProjectModel = {
    PLOT_DEFAULTS,
    uid,
    clone,
    escapeHTML,
    inches,
    display,
    finite,
    normalize,
    zone,
    zonePosition,
    walls,
    solveConstraints,
  };
  if (typeof module !== "undefined") module.exports = root.ProjectModel;
})(typeof window !== "undefined" ? window : globalThis);
