/* Shared architectural roof for the editor, presentation, drawings and IFC.
 * Inches throughout; no renderer state or project mutations. */
(function (root) {
  'use strict';
  const library = () => root.THREE ||
    (typeof require === 'function' ? require('../vendor/three/three.min.js') : null);

  function describe(p, prepared) {
    const D = root.DesignModel, W = root.WorkbenchModel,
      clipping = root.polygonClipping ||
        (typeof require === 'function' ? require('../vendor/geometry/polygon-clipping.js') : null),
      roof = p.design.roof,
      floor = Math.max(-1, ...p.elements
        .filter(e => !e.isFurniture && e.type !== 'staircase').map(e => e.floor));
    if (floor < 0) return null;
    const footprint = roof.type === 'flat'
      ? (prepared?.[floor]?.slab || W.slabGeometry(p, floor))
      : (prepared?.[floor]?.union || D.floorUnion(p, floor));
    const expanded = [];
    for (const polygon of footprint) {
      const offset = (ring, amount) => D.offsetPath(
        ring.slice(0, -1).map(([x, y]) => ({ x, y })), amount, true,
      ).map(r => [r.map(q => [q.x, q.y])]);
      const outer = offset(polygon[0], roof.overhang),
        holes = polygon.slice(1).flatMap(h =>
          // Flat roof penetrations retain the structural shaft opening.
          roof.type === 'flat' ? [[h]] : offset(h, -roof.overhang));
      if (outer.length) expanded.push(...(holes.length
        ? clipping.difference(clipping.union(...outer), ...holes) : outer));
    }
    const polygons = expanded.length ? clipping.union(...expanded) : footprint;
    if (!polygons.length) return null;
    const points = polygons.flatMap(poly => poly[0]),
      xs = points.map(q => q[0]), ys = points.map(q => q[1]),
      minX = Math.min(...xs), maxX = Math.max(...xs),
      minY = Math.min(...ys), maxY = Math.max(...ys),
      cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    // Clip every pitch plane against the actual footprint, including islands
    // and courtyards, rather than filling its bounding rectangle.
    const cells = roof.type === 'gable' ? [
      [[minX, minY], [cx, minY], [cx, maxY], [minX, maxY]],
      [[cx, minY], [maxX, minY], [maxX, maxY], [cx, maxY]],
    ] : roof.type === 'hip' ? [
      [[minX, minY], [maxX, minY], [cx, cy]],
      [[maxX, minY], [maxX, maxY], [cx, cy]],
      [[maxX, maxY], [minX, maxY], [cx, cy]],
      [[minX, maxY], [minX, minY], [cx, cy]],
    ] : [[[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]]];
    function riseAt(x, y) {
      if (roof.type === 'flat') return roof.thickness ?? 4;
      const rx = 1 - Math.abs(x - cx) / Math.max(.001, (maxX - minX) / 2),
        ry = 1 - Math.abs(y - cy) / Math.max(.001, (maxY - minY) / 2);
      return roof.rise * Math.max(0, roof.type === 'shed'
        ? (maxX - x) / Math.max(.001, maxX - minX)
        : roof.type === 'gable' ? rx : Math.min(rx, ry));
    }
    return {
      floor, base: W.floorBase(p, floor) + W.floorHeight(p, floor), thickness: roof.thickness ?? 4,
      polygons, patches: cells.flatMap(cell => clipping.intersection(polygons, [cell])),
      riseAt, bounds: { minX, maxX, minY, maxY },
    };
  }

  function solid(surface, polygon) {
    const T = library(),
      rings = polygon.map(r => r.slice(0, -1).map(([x, y]) => new T.Vector2(x, y)));
    // Clipping rings close explicitly. Normalize winding for outward IFC faces.
    if (T.ShapeUtils.isClockWise(rings[0])) rings[0].reverse();
    for (const h of rings.slice(1)) if (!T.ShapeUtils.isClockWise(h)) h.reverse();
    const points = rings.flat(),
      top = points.map(q => ({ x: q.x, y: q.y, z: surface.base + surface.riseAt(q.x, q.y) })),
      count = top.length,
      vertices = [...top, ...top.map(q => ({ ...q, z: q.z - surface.thickness }))],
      triangles = T.ShapeUtils.triangulateShape(rings[0], rings.slice(1)), faces = [];
    for (const [a, b, c] of triangles) faces.push([a, b, c], [c + count, b + count, a + count]);
    let start = 0;
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const a = start + i, b = start + (i + 1) % ring.length;
        faces.push([a, a + count, b + count], [a, b + count, b]);
      }
      start += ring.length;
    }
    return { vertices, faces };
  }

  function geometry(surface, polygon, scale = 1, origin = { x: 0, z: 0 }, absolute = false) {
    const T = library(), { vertices, faces } = solid(surface, polygon), positions = [], uv = [];
    // Swapping IFC Z-up to renderer Y-up reflects the basis: reverse winding.
    for (const face of faces) for (const i of face.slice().reverse()) {
      const q = vertices[i];
      positions.push(origin.x + q.x * scale,
        (q.z - (absolute ? 0 : surface.base)) * scale, origin.z + q.y * scale);
      uv.push(q.x / 48, q.y / 48);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  root.RoofModel = { describe, solid, geometry };
  if (typeof module === 'object') module.exports = root.RoofModel;
})(globalThis);
