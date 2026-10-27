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
  function* stages(engine, source, project, options = {}) {
    const T = root.THREE,
      geometries = new Map(),
      textures = new Map(),
      materials = new Set(),
      pairs = [],
      issues = [];
    const ownedTexture = (texture) => {
      if (!textures.has(texture)) {
        const clone = texture.clone();
        root.FourDAssets?.prepareTexture(clone, texture);
        clone.needsUpdate = true;
        textures.set(texture, clone);
      }
      return textures.get(texture);
    };
    const material = (original, node) => {
      const previous = engine.materials;
      let copy;
      engine.materials = materials;
      try { copy = engine.material(original, node); }
      finally { engine.materials = previous; }
      for (const slot of textureSlots)
        if (copy[slot] && copy[slot] === original[slot])
          copy[slot] = ownedTexture(copy[slot]);
      for (const slot of textureSlots) if(copy[slot] && !root.FourDAssets?.entries.has(copy[slot])) root.FourDAssets?.prepareTexture(copy[slot],copy[slot]);
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
          {
            const geometry=node.geometry.clone(), data=node.userData||{};
            // Extruded/polygon architectural meshes use physical planar UVs.
            // Imported models and authored furniture retain their own UV layout.
            if ((data.isWall || (data.isRoom&&!data.isOpening&&!project.elements[data.roomIndex]?.isFurniture)) && /^(Extrude|Shape)Geometry$/.test(geometry.type)) {
              geometry.computeBoundingBox();const b=geometry.boundingBox,pos=geometry.attributes.position,norm=geometry.attributes.normal,uv=[];
              const sx=Math.max(.01,b.max.x-b.min.x),sy=Math.max(.01,b.max.y-b.min.y),sz=Math.max(.01,b.max.z-b.min.z),length=Math.max(.01,Math.hypot(sx,sz));
              for(let i=0;i<pos.count;i++) {
                if(data.isWall&&Math.abs(norm?.getY(i)||0)<.5) {
                  const nx=norm?.getX(i)||0,nz=norm?.getZ(i)||1;
                  uv.push((pos.getX(i)*nz-pos.getZ(i)*nx)/length,(pos.getY(i)-b.min.y)/sy);
                } else uv.push((pos.getX(i)-b.min.x)/sx,(pos.getZ(i)-b.min.z)/sz);
              }
              geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
            }
            geometries.set(node.geometry,geometry);
          }
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
    let model, complete = false;
    try {
      model = source.clone(false);
      pairs.push([source,model]);
      for (const child of source.children) {
        const copy = cloneNode(child);
        if (copy) model.add(copy);
        yield;
      }
      const { SCALE, I } = get3DEnvironmentParams();
      for (let f = 0; f < project.floorCount; f++) {
        if (options.floors && !options.floors.has(f)) continue;
        // Empty storeys do not create a slab over the entire plot.
        if (!(options.prepared?.[f]?.union || root.DesignModel.floorUnion(project, f)).length) continue;
        const footprint = options.prepared?.[f]?.slab || root.WorkbenchModel.slabGeometry(project, f),
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
          const packed = options.slabBuffers?.[f]?.[footprint.indexOf(polygon)];
          const geometry = packed ? root.FourDJobs.unpack(packed) : new T.ExtrudeGeometry(shape, {
            depth: 6 * SCALE, bevelEnabled: false, steps: 1,
          });
          if (!packed) geometry.rotateX(-Math.PI / 2);
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
        yield;
      }
      const Roof = root.RoofModel || (typeof require==='function'?require('./roof-model.js'):null),
        surface = options.roof !== false ? Roof.describe(project,options.prepared) : null;
      if(surface) {
        const group=new T.Group();
        group.userData={isRoof:true,floor:surface.floor,presentationGenerated:true,datumResolved:true};
        group.position.set(I.x,surface.base*SCALE,I.z);
        const mat=new T.MeshStandardMaterial({color:0x7d8785,roughness:.85,side:T.DoubleSide});materials.add(mat);
        for(const polygon of surface.patches){
          const geometry=Roof.geometry(surface,polygon,SCALE);geometries.set(geometry,geometry);
          const mesh=new T.Mesh(geometry,mat);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={...group.userData};group.add(mesh);
        }
        const anchor=new T.Group();anchor.position.copy(group.position);anchor.userData={...group.userData};pairs.push([anchor,group]);model.add(group);
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
      root.FourDAssets?.enforce();
      complete = true;
      return {
        model,
        pairs,
        materials,
        resources: {
          instances: instancesIn(model),
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
    } finally {
      if (!complete) dispose({
        model,
        materials,
        sceneResources: {
          instances: instancesIn(model),
          geometries: new Set(geometries.values()),
          textures: new Set(textures.values()),
        },
      });
    }
  }
  function stage(engine, source, project, options) {
    const iterator = stages(engine,source,project,options);
    let result;
    do { result = iterator.next(); } while (!result.done);
    return result.value;
  }
  async function stageAsync(engine,source,project,checkpoint,options = {}) {
    if (root.FourDJobs) {
      const prepared = await root.FourDJobs.run({kind:'footprints',project});
      await checkpoint();
      const slabBuffers = {}, {SCALE:scale}=get3DEnvironmentParams();
      for(let f=0;f<project.floorCount;f++) if(!options.floors||options.floors.has(f)) {
        slabBuffers[f]=await root.FourDJobs.run({kind:'extrude',polygons:prepared[f].slab,depth:6,scale});
        await checkpoint();
      }
      options={...options,prepared,slabBuffers};
    }
    const iterator = stages(engine,source,project,options);
    let began = performance.now();
    try {
      for (;;) {
        const result = iterator.next();
        if (result.done) {
          const stage=result.value;
          try {
            if(root.FourDJobs) {
              const candidates=new Map(),budget=root.FourDWorkspace?.quality==='eco'?80:256;
              stage.model.traverse(n=>{const element=project.elements.find(e=>e.id===n.userData.elementId);if(n.isMesh&&n.geometry.type==='BoxGeometry'&&element?.isFurniture&&!element.assetId&&candidates.size<budget)candidates.set(n.geometry,n.geometry.parameters);});
              if(candidates.size){
                const rows=[...candidates],boxes=rows.map(([,p])=>({w:p.width,h:p.height,d:p.depth,r:Math.min(p.width,p.height,p.depth)*.1}));
                const rounded=await root.FourDJobs.run({kind:'rounded',boxes});await checkpoint();
                const replacements=new Map(rows.map(([g],i)=>[g,root.FourDJobs.unpack(rounded[i])]));
                stage.model.traverse(n=>{if(replacements.has(n.geometry))n.geometry=replacements.get(n.geometry);});
                for(const [old,replacement]of replacements){stage.resources.geometries.delete(old);old.dispose();stage.resources.geometries.add(replacement);}
              }
              const meshes=[];stage.model.traverse(n=>{if(n.isMesh&&n.userData.isRoof&&n.geometry.type==='ShapeGeometry')meshes.push(n);});
              for(const n of meshes){
                const original=n.geometry, packed=root.FourDGeometry.pack(original.clone());
                const solid=await root.FourDJobs.run({kind:'shell',geometry:packed,depth:2*get3DEnvironmentParams().SCALE});
                await checkpoint();n.geometry=root.FourDJobs.unpack(solid);stage.resources.geometries.delete(original);original.dispose();stage.resources.geometries.add(n.geometry);
              }
            }
            stage.triangles=triangles(stage.model);return stage;
          } catch(error){dispose({model:stage.model,materials:stage.materials,sceneResources:stage.resources});throw error;}
        }
        if (performance.now()-began > 8) {
          await checkpoint();
          began = performance.now();
        }
      }
    } catch (error) { iterator.return(); throw error; }
  }
  function instancesIn(model) {
    const instances=new Set();model?.traverse(n=>{if(n.isInstancedMesh)instances.add(n);});return instances;
  }
  function dispose(engine) {
    const resources = engine.sceneResources || {},
      textures = new Set(resources.textures || []);
    for(const node of new Set([...instancesIn(engine.model),...(resources.instances||[])]))node.dispose();
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
        root.FourDAssets?.resized.delete(source.image);
        root.FourDAssets?.prepareTexture(copy,source);
        copy.needsUpdate = true;
        r.textureVersions.set(source, source.version);
      }
  }
  function triangles(model) {
    let count=0;
    model.traverse(n=>{if(n.isMesh&&n.geometry) count+=(n.geometry.index?.count||n.geometry.attributes.position?.count||0)/3*(n.isInstancedMesh?n.count:1);});
    return count;
  }
  function reconcile(engine, added = {}) {
    const geometries=new Set(), materials=new Set(), textures=new Set();
    engine.model.traverse(n=>{
      if(n.geometry) geometries.add(n.geometry);
      for(const m of [].concat(n.material||[])) {materials.add(m);for(const slot of textureSlots) if(m[slot]) textures.add(m[slot]);}
    });
    for(const t of textures) if(!root.FourDAssets?.entries.has(t)) root.FourDAssets?.prepareTexture(t,t);
    root.FourDAssets?.enforce();
    const old=engine.sceneResources||{}, instances=instancesIn(engine.model);
    for(const node of new Set([...(old.instances||[]),...(added.instances||[])]))if(!instances.has(node))node.dispose();
    for(const g of new Set([...(old.geometries||[]),...(added.geometries||[])])) if(!geometries.has(g))g.dispose();
    for(const m of engine.materials||[]) if(!materials.has(m))m.dispose();
    for(const t of new Set([...(old.textures||[]),...(added.textures||[])])) if(!textures.has(t))t.dispose();
    const textureLinks=new Map([...(old.textureLinks||[])].filter(([,t])=>textures.has(t)));
    engine.materials=materials;
    engine.sceneResources={instances,geometries,textures,textureLinks,textureVersions:new Map([...textureLinks.keys()].map(t=>[t,t.version]))};
  }
  root.Scene4D = { stage, stageAsync, dispose, textureSlots, updateTextures, reconcile, triangles };
  if (typeof module === "object") module.exports = root.Scene4D;
})(globalThis);
