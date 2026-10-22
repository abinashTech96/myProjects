/* 4D scene compilation. Every GPU resource is owned by the presentation scene;
 * rebuilding or disposing the editor cannot invalidate a displayed 4D mesh. */
(function (root) {
  "use strict";
  const textureSlots = [
    "map",
    "bumpMap",
    "normalMap",
    "roughnessMap",
    "metalnessMap",
    "aoMap",
    "emissiveMap",
    "alphaMap",
    "displacementMap",
    "clearcoatMap",
    "clearcoatNormalMap",
    "clearcoatRoughnessMap",
  ];
  function stage(engine, source, project) {
    const T = root.THREE,
      geometries = new Map(),
      textures = new Map(),
      materials = new Set(),
      pairs = [],
      issues = [];
    const previous = engine.materials;
    engine.materials = materials;
    const ownedTexture = (texture) => {
      if (!textures.has(texture)) {
        const clone = texture.clone();
        clone.needsUpdate = true;
        textures.set(texture, clone);
      }
      return textures.get(texture);
    };
    const material = (original, node) => {
      const copy = engine.material(original, node);
      for (const slot of textureSlots)
        if (copy[slot] && copy[slot] === original[slot])
          copy[slot] = ownedTexture(copy[slot]);
      return copy;
    };
    const cloneNode = (node, inDesign = false) => {
      const data = node.userData || {},
        design = inDesign || data.designObject;
      if (data.isSlab || data.isRoof) return null;
      let valid = true;
      if (node.geometry?.attributes.position) {
        const array = node.geometry.attributes.position.array;
        valid = array.length > 0 && array.every(Number.isFinite);
        if (!valid)
          issues.push({
            element: data.elementId || node.name || node.type,
            reason: "Non-finite or empty geometry",
          });
      }
      const copy = valid ? node.clone(false) : new T.Group().copy(node, false);
      if (valid && node.geometry) {
        if (!geometries.has(node.geometry))
          geometries.set(node.geometry, node.geometry.clone());
        copy.geometry = geometries.get(node.geometry);
      }
      if (valid && node.material)
        copy.material = Array.isArray(node.material)
          ? node.material.map((m) => material(m, node))
          : material(node.material, node);
      if (copy.isMesh) {
        copy.castShadow = !(
          copy.material?.transparent && copy.material.opacity < 0.75
        );
        copy.receiveShadow = true;
      }
      pairs.push([node, copy]);
      for (const child of node.children) {
        const clone = cloneNode(child, design);
        if (clone) copy.add(clone);
      }
      return copy;
    };
    let model;
    try {
      model = cloneNode(source);
      const { SCALE, I } = get3DEnvironmentParams();
      for (let f = 0; f < project.floorCount; f++) {
        // Empty storeys do not create a slab over the entire plot.
        if (!root.DesignModel.floorUnion(project, f).length) continue;
        const footprint = root.WorkbenchModel.slabGeometry(project, f),
          group = new T.Group();
        group.userData = {
          isSlab: true,
          floor: f,
          presentationGenerated: true,
        };
        const base =
          (root.WorkbenchModel.floorBase(project, f) +
            root.WorkbenchModel.floorHeight(project, f) -
            6) *
          SCALE;
        group.position.set(I.x, base, I.z);
        for (const polygon of footprint) {
          const ring = (points) =>
            points.map(([x, y]) => new T.Vector2(x * SCALE, -y * SCALE));
          const shape = new T.Shape(ring(polygon[0]));
          shape.holes = polygon.slice(1).map((hole) => new T.Path(ring(hole)));
          const geometry = new T.ExtrudeGeometry(shape, {
            depth: 6 * SCALE,
            bevelEnabled: false,
            steps: 1,
          });
          geometry.rotateX(-Math.PI / 2);
          geometries.set(geometry, geometry);
          const mat = new T.MeshStandardMaterial({
            color: 0xc6c6bd,
            roughness: 0.86,
          });
          materials.add(mat);
          const mesh = new T.Mesh(geometry, mat);
          mesh.castShadow = mesh.receiveShadow = true;
          mesh.userData = { ...group.userData };
          group.add(mesh);
        }
        const anchor = new T.Group();
        anchor.position.copy(group.position);
        anchor.userData = { ...group.userData };
        pairs.push([anchor, group]);
        model.add(group);
      }
      const top = Math.max(
          -1,
          ...project.elements
            .filter((e) => !e.isFurniture && e.type !== "staircase")
            .map((e) => e.floor),
        ),
        roof = project.design.roof;
      if (
        roof.type !== "flat" &&
        root.DesignModel.floorUnion(project, top).length
      ) {
        const clipping = root.polygonClipping,
          base =
            root.WorkbenchModel.floorBase(project, top) +
            root.WorkbenchModel.floorHeight(project, top);
        const footprint = root.DesignModel.floorUnion(project, top),
          expanded = [];
        for (const polygon of footprint) {
          const outlines = root.DesignModel.offsetPath(
            polygon[0].slice(0, -1).map(([x, y]) => ({ x, y })),
            roof.overhang,
            true,
          );
          for (const outline of outlines)
            expanded.push([outline.map((q) => [q.x, q.y])]);
        }
        const polygons = expanded.length
            ? clipping.union(...expanded)
            : footprint,
          group = new T.Group();
        group.userData = {
          isRoof: true,
          floor: top,
          presentationGenerated: true,
        };
        group.position.set(I.x, base * SCALE, I.z);
        const all = polygons.flatMap((p) => p[0]),
          xs = all.map((p) => p[0]),
          ys = all.map((p) => p[1]);
        const minX = Math.min(...xs),
          maxX = Math.max(...xs),
          minY = Math.min(...ys),
          maxY = Math.max(...ys),
          cx = (minX + maxX) / 2,
          cy = (minY + maxY) / 2;
        const cells =
          roof.type === "gable"
            ? [
                [
                  [minX, minY],
                  [cx, minY],
                  [cx, maxY],
                  [minX, maxY],
                ],
                [
                  [cx, minY],
                  [maxX, minY],
                  [maxX, maxY],
                  [cx, maxY],
                ],
              ]
            : roof.type === "hip"
              ? [
                  [
                    [minX, minY],
                    [maxX, minY],
                    [cx, cy],
                  ],
                  [
                    [maxX, minY],
                    [maxX, maxY],
                    [cx, cy],
                  ],
                  [
                    [maxX, maxY],
                    [minX, maxY],
                    [cx, cy],
                  ],
                  [
                    [minX, maxY],
                    [minX, minY],
                    [cx, cy],
                  ],
                ]
              : [
                  [
                    [minX, minY],
                    [maxX, minY],
                    [maxX, maxY],
                    [minX, maxY],
                  ],
                ];
        const mat = new T.MeshStandardMaterial({
          color: 0x7d8785,
          roughness: 0.85,
          side: T.DoubleSide,
        });
        materials.add(mat);
        for (const cell of cells)
          for (const polygon of clipping.intersection(polygons, [cell])) {
            const shape = new T.Shape(
              polygon[0].map(([x, y]) => new T.Vector2(x, y)),
            );
            shape.holes = polygon
              .slice(1)
              .map((h) => new T.Path(h.map(([x, y]) => new T.Vector2(x, y))));
            const geometry = new T.ShapeGeometry(shape),
              positions = geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
              const x = positions.getX(i),
                z = positions.getY(i),
                rx = 1 - Math.abs(x - cx) / Math.max(1, (maxX - minX) / 2),
                rz = 1 - Math.abs(z - cy) / Math.max(1, (maxY - minY) / 2);
              const rise =
                roof.rise *
                Math.max(
                  0,
                  roof.type === "shed"
                    ? (maxX - x) / Math.max(1, maxX - minX)
                    : roof.type === "gable"
                      ? rx
                      : Math.min(rx, rz),
                );
              positions.setXYZ(i, x * SCALE, rise * SCALE, z * SCALE);
            }
            const index = geometry.index;
            for (let i = 0; i < index.count; i += 3) {
              const a = index.getX(i);
              index.setX(i, index.getX(i + 2));
              index.setX(i + 2, a);
            }
            geometry.computeVertexNormals();
            geometries.set(geometry, geometry);
            const mesh = new T.Mesh(geometry, mat);
            mesh.castShadow = mesh.receiveShadow = true;
            mesh.userData = { ...group.userData };
            group.add(mesh);
          }
        const anchor = new T.Group();
        anchor.position.copy(group.position);
        anchor.userData = { ...group.userData };
        pairs.push([anchor, group]);
        model.add(group);
      }
      let triangles = 0;
      model.traverse((node) => {
        if (node.isMesh && node.geometry)
          triangles +=
            ((node.geometry.index?.count ||
              node.geometry.attributes.position?.count ||
              0) /
              3) *
            (node.isInstancedMesh ? node.count : 1);
      });
      return {
        model,
        pairs,
        materials,
        resources: {
          geometries: new Set(geometries.values()),
          textures: new Set(textures.values()),
          textureLinks: textures,
          textureVersions: new Map(
            [...textures.keys()].map((t) => [t, t.version]),
          ),
        },
        issues,
        triangles,
      };
    } catch (error) {
      dispose({
        model,
        materials,
        sceneResources: {
          geometries: new Set(geometries.values()),
          textures: new Set(textures.values()),
        },
      });
      throw error;
    } finally {
      engine.materials = previous;
    }
  }
  function dispose(engine) {
    const resources = engine.sceneResources || {},
      textures = new Set(resources.textures || []);
    engine.model?.traverse((node) => {
      if (node.isInstancedMesh) node.dispose();
    });
    for (const material of engine.materials || []) {
      for (const slot of textureSlots)
        if (material[slot]) textures.add(material[slot]);
      for (const uniform of Object.values(material.uniforms || {})) {
        if (uniform?.value?.isTexture) textures.add(uniform.value);
      }
      material.dispose();
    }
    for (const geometry of resources.geometries || []) geometry.dispose();
    for (const texture of textures) texture.dispose();
    engine.materials?.clear();
    engine.sceneResources = null;
  }
  function updateTextures(engine) {
    const r = engine.sceneResources;
    if (!r?.textureLinks) return;
    for (const [source, copy] of r.textureLinks)
      if (r.textureVersions.get(source) !== source.version) {
        copy.image = source.image;
        copy.needsUpdate = true;
        r.textureVersions.set(source, source.version);
      }
  }
  root.Scene4D = { stage, dispose, textureSlots, updateTextures };
  if (typeof module === "object") module.exports = root.Scene4D;
})(globalThis);
