/* Portable, validated presentation configuration. All distances are inches. */
(function (root) {
  const P = root.ProjectModel || require("./project-model.js");
  const materials = {
    brick: {
      label: "Brick",
      color: "#b57356",
      roughness: 0.9,
      metalness: 0,
      tile: 24,
    },
    stone: {
      label: "Stone",
      color: "#a5a49c",
      roughness: 0.8,
      metalness: 0,
      tile: 36,
    },
    concrete: {
      label: "Concrete",
      color: "#b6b6ae",
      roughness: 0.92,
      metalness: 0,
      tile: 48,
    },
    timber: {
      label: "Timber",
      color: "#ba8754",
      roughness: 0.45,
      metalness: 0,
      tile: 36,
    },
    fabric: {
      label: "Fabric",
      color: "#a4a8aa",
      roughness: 1,
      metalness: 0,
      tile: 12,
    },
    glass: {
      label: "Glass",
      color: "#e6f3f5",
      roughness: 0.06,
      metalness: 0,
      tile: 48,
    },
    metal: {
      label: "Brushed metal",
      color: "#c1c7cc",
      roughness: 0.28,
      metalness: 1,
      tile: 24,
    },
    mirror: {
      label: "Mirror finish",
      color: "#eeeeee",
      roughness: 0.02,
      metalness: 1,
      tile: 48,
    },
  };
  const defaults = () => ({
    version: 1,
    environment: "studio",
    environmentIntensity: 1,
    environmentRotation: 0,
    showSky: false,
    hdr: "",
    lens: 0,
    verticals: false,
    dof: false,
    focusDistance: 240,
    fstop: 4,
    progressive: false,
    samples: 16,
    lod: "auto",
    cleanSelection: true,
    reflections: "environment",
    mirrors: [],
    phases: ["Structure", "Roof & slabs", "Envelope", "Interiors", "Furniture"],
    assignments: {},
    phaseSeconds: 2,
  });
  function hdrSize(header) {
    const match = header.match(/-Y\s+(\d+)\s+\+X\s+(\d+)/);
    if (
      !/^#\?(RADIANCE|RGBE)/.test(header) ||
      !header.includes("FORMAT=32-bit_rle_rgbe") ||
      !match ||
      +match[1] < 1 ||
      +match[2] < 1 ||
      +match[1] > 1024 ||
      +match[2] > 2048
    )
      throw Error("HDR must be Radiance RGBE, at most 2048 × 1024");
    return { width: +match[2], height: +match[1] };
  }
  function validate(raw, p) {
    const d = { ...defaults(), ...structuredClone(raw || {}) };
    if (d.version !== 1) throw Error("Unsupported 4D settings version");
    for (const [k, allowed] of Object.entries({
      environment: ["studio", "overcast", "sunset", "night", "custom"],
      lod: ["full", "auto", "economy"],
      reflections: ["environment", "local"],
    }))
      if (!allowed.includes(d[k])) throw Error("Invalid 4D " + k);
    for (const [k, min, max] of [
      ["environmentIntensity", 0, 3],
      ["environmentRotation", 0, 360],
      ["focusDistance", 1, 100000],
      ["fstop", 1, 22],
      ["samples", 4, 64],
      ["phaseSeconds", 0.25, 10],
    ])
      P.finite(d[k], "4D " + k, min, max);
    if (d.lens !== 0) P.finite(d.lens, "4D lens", 14, 120);
    if (!Number.isInteger(d.samples))
      throw Error("4D samples must be an integer");
    for (const key of [
      "showSky",
      "verticals",
      "dof",
      "progressive",
      "cleanSelection",
    ])
      d[key] = !!d[key];
    if (
      typeof d.hdr !== "string" ||
      d.hdr.length > 5600000 ||
      (d.hdr &&
        !/^data:application\/octet-stream;base64,[A-Za-z0-9+/]+=*$/.test(d.hdr))
    )
      throw Error("Invalid embedded HDR environment");
    if (d.hdr) {
      try {
        hdrSize(atob(d.hdr.split(",")[1].slice(0, 2732)));
      } catch (error) {
        throw Error("Invalid embedded HDR: " + error.message);
      }
    }
    if (
      !Array.isArray(d.phases) ||
      d.phases.length < 1 ||
      d.phases.length > 12 ||
      d.phases.some((v) => typeof v !== "string" || !v.trim() || v.length > 48)
    )
      throw Error("Use 1–12 named construction stages");
    if (
      !d.assignments ||
      typeof d.assignments !== "object" ||
      Array.isArray(d.assignments) ||
      Object.keys(d.assignments).length > 10000
    )
      throw Error("Invalid construction assignments");
    const ids = new Set((p?.elements || []).map((e) => e.id));
    for (const [id, phase] of Object.entries(d.assignments)) {
      if (!ids.has(id)) {
        delete d.assignments[id];
        continue;
      }
      if (!Number.isInteger(phase) || phase < 0 || phase >= d.phases.length)
        throw Error("Invalid construction stage");
    }
    if (!Array.isArray(d.mirrors) || d.mirrors.length > 4)
      throw Error("Use at most four presentation mirrors");
    d.mirrors = d.mirrors.filter((m) => ids.has(m.room));
    for (const m of d.mirrors) {
      if (
        !["top", "bottom", "left", "right"].includes(m.edge) ||
        !p.elements.some((e) => e.id === m.room && !e.isFurniture && !e.points)
      )
        throw Error("Choose a rectangular room wall for the mirror");
      for (const [k, min, max] of [
        ["width", 6, 240],
        ["height", 6, 120],
        ["sill", 0, 120],
        ["offset", 0, 1],
      ])
        P.finite(m[k], "Mirror " + k, min, max);
    }
    return d;
  }
  function stageFor(data, p, settings) {
    const room =
      p.elements[data.roomIndex] ||
      p.elements.find((e) => e.id === data.elementId);
    if (room && settings.assignments[room.id] !== undefined)
      return settings.assignments[room.id];
    return Math.min(
      settings.phases.length - 1,
      room?.isFurniture
        ? 4
        : data.isOpening || data.openingId
          ? 2
          : data.isRoof || data.isSlab
            ? 1
            : data.presentationSurface === "ceiling"
              ? 3
              : 0,
    );
  }
  function projectedPixels(radius, distance, height, fov) {
    return (
      (radius * 2 * height) /
      (Math.max(1, distance) * 2 * Math.tan((fov * Math.PI) / 360))
    );
  }
  function halton(index, base) {
    let f = 1,
      r = 0;
    for (let i = index; i > 0; i = Math.floor(i / base)) {
      f /= base;
      r += f * (i % base);
    }
    return r;
  }
  const api = {
    defaults,
    validate,
    materials,
    hdrSize,
    stageFor,
    projectedPixels,
    halton,
  };
  root.FourDModel = api;
  if (typeof module === "object") module.exports = api;
})(globalThis);
