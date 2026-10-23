/* Deterministic PBR textures: color in sRGB, normals/roughness in linear space. */
window.FourDTextures = {
  cache: new Map(),
  get(type) {
    if (this.cache.has(type)) return this.cache.get(type);
    const spec = FourDModel.materials[type] || FourDModel.materials.concrete,
      n = 256;
    const color = document.createElement("canvas");
    color.width = color.height = n;
    const ctx = color.getContext("2d");
    const image = ctx.createImageData(n, n),
      normal = ctx.createImageData(n, n),
      rough = ctx.createImageData(n, n),
      heights = new Float32Array(n * n);
    // Neutral color modulation lets the saved tint stay accurate instead of tinting twice.
    const rgb = [255, 255, 255];
    const noise = (x, y) => {
      let k = (x * 374761393 + y * 668265263 + 19) | 0;
      k = Math.imul(k ^ (k >>> 13), 1274126177);
      return ((k ^ (k >>> 16)) >>> 0) / 4294967295;
    };
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const i = y * n + x,
          q = noise(x, y);
        let h = 0.5,
          tint = 0;
        if (type === "brick") {
          const mortar =
            y % 32 < 3 || (x + (Math.floor(y / 32) % 2) * 32) % 64 < 3;
          h = mortar ? 0.1 : 0.65 + q * 0.1;
          tint = mortar
            ? -0.3
            : (noise(
                Math.floor((x + (Math.floor(y / 32) % 2) * 32) / 64),
                Math.floor(y / 32),
              ) -
                0.5) *
              0.2;
        } else if (type === "stone") {
          h =
            0.5 + Math.sin(x * 0.06 + Math.sin(y * 0.04) * 3) * 0.1 + q * 0.12;
          tint = (h - 0.5) * 0.5;
        } else if (type === "timber") {
          const seam=x%64<1 || (y+(Math.floor(x/64)%2)*128)%256<1;
          const grain=Math.sin(y*Math.PI/8+Math.sin(x*Math.PI/128)*3);
          h=seam?.18:.5+grain*.06+q*.02;
          tint=seam?-.18:grain*.06+(noise(Math.floor(x/64),0)-.5)*.09;
        } else if (type === "fabric") {
          h = 0.4 + (x % 4 < 2 === y % 4 < 2 ? 0.2 : 0) + q * 0.05;
          tint = (h - 0.5) * 0.3;
        } else {
          h = 0.5 + (q - 0.5) * (type === "concrete" ? 0.2 : 0.04);
          tint = (q - 0.5) * (type === "concrete" ? 0.16 : 0.04);
        }
        heights[i] = h;
        for (let k = 0; k < 3; k++) {
          image.data[i * 4 + k] = Math.max(
            0,
            Math.min(255, rgb[k] * (0.95 + tint)),
          );
          rough.data[i * 4 + k] = Math.max(
            0,
            Math.min(255, (type === "brick" ? (h<.2 ? 1 : .86+q*.1) : type === "timber" ? .87+q*.08 : .97+(q-.5)*.06) * 255),
          );
        }
        image.data[i * 4 + 3] = rough.data[i * 4 + 3] = 255;
      }
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const i = y * n + x,
          dx =
            heights[y * n + ((x + 1) % n)] - heights[y * n + ((x + n - 1) % n)],
          dy =
            heights[((y + 1) % n) * n + x] - heights[((y + n - 1) % n) * n + x];
        const v = new THREE.Vector3(-dx * 2, -dy * 2, 1).normalize();
        normal.data.set(
          [
            (v.x * 0.5 + 0.5) * 255,
            (v.y * 0.5 + 0.5) * 255,
            (v.z * 0.5 + 0.5) * 255,
            255,
          ],
          i * 4,
        );
      }
    const texture = (data, encoding) => {
      const c = document.createElement("canvas");
      c.width = c.height = n;
      c.getContext("2d").putImageData(data, 0, 0);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.encoding = encoding;
      return t;
    };
    const result = {
      map: texture(image, THREE.sRGBEncoding),
      normalMap: texture(normal, THREE.LinearEncoding),
      roughnessMap: texture(rough, THREE.LinearEncoding),
    };
    this.cache.set(type, result);
    return result;
  },
  apply(
    material,
    type,
    dimensions = { w: 120, h: 120 },
    scale = 1,
    rotation = 0,
    color,
  ) {
    const spec = FourDModel.materials[type];
    if (!spec) return false;
    for (const key of ["map", "bumpMap", "normalMap", "roughnessMap"]) {
      material[key]?.dispose();
      material[key] = null;
    }
    if (!["glass", "mirror", "metal"].includes(type))
      for (const [key, texture] of Object.entries(this.get(type))) {
        material[key] = texture.clone();
        material[key].repeat.set(
          Math.max(0.1, dimensions.w / spec.tile) * scale,
          Math.max(0.1, dimensions.h / spec.tile) * scale,
        );
        material[key].center.set(0.5, 0.5);
        material[key].rotation = (rotation * Math.PI) / 180;
        material[key].needsUpdate = true;
      }
    material.color.set(color || spec.color).convertSRGBToLinear();
    material.roughness = spec.roughness;
    material.metalness = spec.metalness;
    material.transparent = type === "glass";
    material.opacity = type === "glass" ? 0.28 : 1;
    material.depthWrite = type !== "glass";
    material.transmission = 0;
    material.normalScale?.set(0.45, 0.45);
    material.userData.fourDMaterial = type;
    material.needsUpdate = true;
    return true;
  },
  dispose() {
    for (const maps of this.cache.values())
      for (const texture of Object.values(maps)) texture.dispose();
    this.cache.clear();
  },
};
