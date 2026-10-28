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
  Object.assign(materials, {
    wood:{...materials.timber,label:'Wood flooring',color:'#a98055',tile:48},
    'bathroom-tile':{label:'Bathroom ceramic',color:'#bed6dd',roughness:.28,metalness:0,tile:24},
    'kitchen-tile':{label:'Porcelain tile',color:'#ddd8cc',roughness:.32,metalness:0,tile:24},
    grass:{label:'Grass',color:'#75874e',roughness:1,metalness:0,tile:48},
    shingle:{label:'Roof shingle',color:'#855b4d',roughness:.9,metalness:0,tile:48},
    paint:{label:'Paint',color:'#dddcd5',roughness:.78,metalness:0,tile:48},
  });
  for(const [type,spec]of Object.entries(materials))spec.normalStrength=({brick:.28,stone:.18,timber:.14,wood:.14,fabric:.22,concrete:.08,grass:.25,shingle:.2,'bathroom-tile':.16,'kitchen-tile':.12})[type]||0;
  const defaults = () => ({
    version: 1,
    detailing: true, fixtures: [], bookmarks: [],
    guidedStops: [],
    tourSpeed: 1,
    preset: "daylight",
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
    const d = { ...defaults(), ...P.clone(raw || {}) };
    if (!raw?.preset && ["golden-hour", "courtyard"].includes(d.environment)) d.preset=d.environment;
    if (d.version !== 1) throw Error("Unsupported 4D settings version");
    for (const [k, allowed] of Object.entries({
      preset: ["daylight", "interior", "studio", "golden-hour", "courtyard"],
      environment: ["studio", "overcast", "sunset", "night", "custom", "golden-hour", "courtyard"],
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
    if (!Array.isArray(d.guidedStops) || d.guidedStops.length > 24) throw Error("Use at most 24 guided camera stops");
    if (![0.5,1,1.5,2,3].includes(d.tourSpeed)) throw Error("Invalid guided tour speed");
    for (const stop of d.guidedStops) {
      if (!stop || typeof stop.name !== "string" || !stop.name.trim() || stop.name.length>60) throw Error("Invalid guided stop name");
      for (const key of ["position","target"]) for (const axis of ["x","y","z"]) P.finite(stop[key]?.[axis],"Guided camera coordinate",-1000000,1000000);
      if (!["plot","building","floor","element","material"].includes(stop.kind) || !["perspective","orthographic"].includes(stop.projection)) throw Error("Invalid guided camera view");
      if (stop.zoom===undefined)stop.zoom=1;
      P.finite(stop.zoom,"Guided camera zoom",0.01,1000);
      stop.materialChannel=stop.materialChannel||"floor";
      if(!["floor","wall","ceiling"].includes(stop.materialChannel))throw Error("Invalid guided material view");
      if (stop.floor!=null && (!Number.isInteger(stop.floor)||stop.floor<0||stop.floor>=p.floorCount)) {stop.floor=null;stop.kind="building";stop.element=null;}
      if (stop.element!=null && !ids.has(stop.element)) {stop.element=null;stop.kind="building";}
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
    (root.FourDReviewModel || require("./fourd-review-model.js")).validate(d,p);
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
          : data.isRoof || data.isSlab || data.isParapet
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
