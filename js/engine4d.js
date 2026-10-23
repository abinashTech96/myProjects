/* Independent presentation renderer. Geometry and camera coordinates come from the
 * editable model; scene ownership, PBR materials, lights and GPU passes stay here. */
window.Engine4D = {
  active: false,
  ready: false,
  preset: "daylight",
  modelVersion: null,
  pairs: [],
  materials: new Set(),
  textures: new Map(),
  generation: 0,
  state: "idle",
  recoveries: 0,
  async dependencies() {
    if (!this.loading)
      this.loading = (async () => {
        this.libraryLoads ||= new Map();
        const load = name => {
          if (THREE[name]) return Promise.resolve();
          if (this.libraryLoads.has(name)) return this.libraryLoads.get(name);
          const pending = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = `vendor/three/${name}.js`;
            script.onload = resolve;
            script.onerror = () => { this.libraryLoads.delete(name); script.remove(); reject(Error(`Cannot load ${name}`)); };
            document.head.append(script);
          });
          this.libraryLoads.set(name,pending);
          return pending;
        };
        // Each batch is independent; only class inheritance needs ordering.
        for (const batch of [
          ["CopyShader","SSAOShader","GammaCorrectionShader","FXAAShader","SimplexNoise","Pass","RGBELoader","Reflector","BokehShader"],
          ["ShaderPass","EffectComposer","BokehPass"],
          ["SSAOPass"],
        ]) await Promise.all(batch.map(load));
      })().catch((error) => {
        this.loading = null;
        throw error;
      });
    return this.loading;
  },
  async enable(workspaceToken) {
    if (!window.FourDWorkspace?.starting || workspaceToken !== FourDWorkspace.token)
      return this.status("Click Render 4D to start");
    const token = ++this.generation;
    if (
      this.ready &&
      this.active &&
      !this.renderer?.getContext().isContextLost()
    ) {
      this.resize();
      Engine3D.needsRender = true;
      return;
    }
    this.active = true;
    this.state = "loading";
    this.status("Loading presentation renderer…");
    try {
      await this.dependencies();
      if (!this.active || token !== this.generation) return;
      if (this.renderer?.getContext().isContextLost()) this.releaseRenderer();
      if (!this.renderer) this.init();
      this.lastError = null;
      Engine3D.renderer.domElement.classList.add("presentation-input-surface");
      this.resize();
      this.setPreset(this.preset);
      const stage = await Scene4D.stageAsync(this, Engine3D.buildingGroup, ProjectState.capture(),
        () => FourDWorkspace.checkpoint(null, workspaceToken));
      if (!this.active || token !== this.generation || workspaceToken !== FourDWorkspace.token) {
        Scene4D.dispose({model:stage.model,materials:stage.materials,sceneResources:stage.resources});
        return;
      }
      this.ready = true;
      this.state = "ready";
      this.renderer.domElement.hidden = false;
      this.syncModel(true, stage);
      Engine3D.needsRender = true;
    } catch (error) {
      if (token !== this.generation) return;
      this.fail(error);
      this.status("4D unavailable · retry in Rendering");
      StudioUI.message(
        `4D rendering could not start: ${error.message}. Standard 3D remains available.`,
        "error",
      );
    }
  },
  disable() {
    FourDStudio.leave();
    FourDRender.resize();
    this.active = false;
    this.ready = false;
    this.state = "idle";
    ++this.generation;
    if (this.renderer) this.renderer.domElement.hidden = true;
    Engine3D.renderer?.domElement.classList.remove(
      "presentation-input-surface",
    );
    this.clearModel();
    if (this.renderer && !this.renderer.getContext().isContextLost()) {
      this.renderer.setSize(1, 1, false);
      this.composer?.setSize(1, 1);
      this.lastSize = null;
      this.key.shadow.map?.dispose();
      this.key.shadow.map = null;
    }
    Engine3D.needsRender = true;
  },
  fail(error) {
    FourDStudio.leave();
    FourDRender.cancelPhoto();
    this.ready = false;
    this.state = "fallback";
    this.lastError = String(error?.message || error);
    this.lastErrorStack = error?.stack;
    if (this.renderer) this.renderer.domElement.hidden = true;
    Engine3D.renderer?.domElement.classList.remove(
      "presentation-input-surface",
    );
    this.status("3D fallback · 4D recovery available");
    Engine3D.needsRender = true;
    if (window.FourDWorkspace?.running && !FourDWorkspace.starting)
      FourDWorkspace.failed(this.lastError);
  },
  releaseRenderer() {
    FourDStudio.leave();
    this.clearModel();
    FourDRender.dispose();
    FourDTextures.dispose();
    this.observer?.disconnect();
    const canvas = this.renderer?.domElement;
    if (canvas) {
      canvas.removeEventListener("webglcontextlost", this.onLost);
      canvas.removeEventListener("webglcontextrestored", this.onRestored);
    }
    this.ao?.ssaoMaterial.dispose();
    this.ao?.dispose();
    this.gamma?.material.dispose();
    this.fxaa?.material.dispose();
    this.composer?.renderTarget1.dispose();
    this.composer?.renderTarget2.dispose();
    this.composer?.copyPass?.material.dispose();
    this.ao?.noiseTexture?.dispose();
    this.key?.shadow.map?.dispose();
    for (const { map, bump } of this.textures.values()) {
      map.dispose();
      bump.dispose();
    }
    this.textures.clear();
    this.environment?.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    canvas?.remove();
    this.renderer = null;
    this.composer = null;
    this.environment = null;
    this.camera = null;
    this.lastSize = null;
  },
  async recover() {
    this.recoveries++;
    FourDWorkspace.stop();
    return FourDWorkspace.start();
  },
  healthDialog() {
    const issues = this.geometryIssues || [];
    StudioUI.dialog(
      "4D rendering",
      `<p role="status">${ProjectModel.escapeHTML(this.state)} · ${Math.round(this.modelTriangles || 0).toLocaleString()} building triangles · ${this.sceneResources?.geometries.size || 0} owned geometries</p><p>${this.lastError ? ProjectModel.escapeHTML(this.lastError) : "Scene resources are isolated from the editable model. Resolution adapts to the available drawing space."}</p><div class="studio-action-grid">${StudioUI.button("Retry 4D renderer", "Engine4D.recover()")}${StudioUI.button("Lighting & garden", "Engine4D.lightingDialog()")}</div>${issues.length ? "<p>" + issues.length + " malformed objects were excluded.</p>" : "<p>Geometry audit: no malformed objects detected.</p>"}`,
    );
  },
  init() {
    this.scene = new THREE.Scene();
    this.aoFault = false;
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.domElement.id = "four-d-canvas";
    this.onLost = (event) => {
      event.preventDefault();
      if (!this.active) return;
      this.fail(Error("Graphics context lost"));
      this.state = "context-lost";
    };
    this.onRestored = () => {
      if (this.active && StudioUI.mode === "4d") this.recover();
    };
    this.renderer.domElement.addEventListener("webglcontextlost", this.onLost);
    this.renderer.domElement.addEventListener(
      "webglcontextrestored",
      this.onRestored,
    );
    this.renderer.domElement.setAttribute(
      "aria-label",
      "4D architectural visualization",
    );
    this.renderer.domElement.setAttribute("role", "img");
    document.getElementById("three-container").append(this.renderer.domElement);
    this.renderer.outputEncoding = THREE.LinearEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.physicallyCorrectLights = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.supportsAO =
      this.renderer.capabilities.isWebGL2 ||
      (this.renderer.extensions.has("WEBGL_depth_texture") &&
        this.renderer.extensions.has("OES_texture_float"));
    this.key = new THREE.DirectionalLight(0xfff0db, 3.2);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.bias = -0.00015;
    this.key.shadow.normalBias = 0.3;
    this.fill = new THREE.HemisphereLight(0xdceaff, 0xb2a08b, 1.2);
    this.rim = new THREE.DirectionalLight(0xd6e7ff, 0.8);
    this.scene.add(this.key, this.key.target, this.fill, this.rim);
    this.composer = new THREE.EffectComposer(this.renderer);
    this.ao = new THREE.SSAOPass(this.scene, Engine3D.camera, 1, 1);
    this.ao.kernelRadius = 12;
    this.ao.minDistance = 0.0001;
    this.ao.maxDistance = 0.025;
    this.ao.ssaoMaterial.fragmentShader =
      this.ao.ssaoMaterial.fragmentShader.replace(
        "float depth = getDepth( vUv );",
        "float depth = getDepth( vUv ); if (texture2D(tDepth,vUv).x >= 0.999999) { gl_FragColor=vec4(1.0); return; }",
      );
    this.ao.normalMaterial.clipping = true;
    this.gamma = new THREE.ShaderPass(THREE.GammaCorrectionShader);
    this.fxaa = new THREE.ShaderPass(THREE.FXAAShader);
    this.beautyPass = new THREE.Pass();
    this.beautyPass.render = (renderer, writeBuffer) => {
      renderer.setRenderTarget(writeBuffer);
      renderer.clear();
      renderer.render(this.scene, this.camera);
    };
    this.beautyPass.enabled = !this.supportsAO;
    this.ao.enabled = this.supportsAO;
    this.composer.addPass(this.beautyPass);
    this.composer.addPass(this.ao);
    this.composer.addPass(this.gamma);
    this.composer.addPass(this.fxaa);
    FourDRender.init(this);
    this.observer = new ResizeObserver(() => {
      if (this.active) this.resize();
    });
    this.observer.observe(document.getElementById("three-container"));
  },
  makeEnvironment() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d"),
      gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, "#809bc7");
    gradient.addColorStop(0.46, "#f3f5f7");
    gradient.addColorStop(0.52, "#d6caba");
    gradient.addColorStop(1, "#7b756a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(80, 35, 90, 45);
    ctx.fillRect(320, 50, 60, 32);
    const sky = new THREE.CanvasTexture(canvas);
    sky.encoding = THREE.sRGBEncoding;
    const generator = new THREE.PMREMGenerator(this.renderer);
    this.environment = generator.fromEquirectangular(sky);
    this.scene.environment = this.environment.texture;
    generator.dispose();
    sky.dispose();
  },
  status(value) {
    const label = document.getElementById("four-d-render-status");
    if (label && label.textContent !== value) label.textContent = value;
    const quality = document.getElementById("viewport-quality");
    if (quality && StudioUI.mode === "4d" && quality.textContent !== value)
      quality.textContent = value;
  },
  setPreset(value) {
    const presets = {
      daylight: {
        background: 0xe8edf2,
        key: 0xfff1dc,
        intensity: 3.2,
        fill: 1.15,
        rim: 0.8,
        exposure: 1.05,
      },
      interior: {
        background: 0xe6dfd5,
        key: 0xffd6ad,
        intensity: 2.1,
        fill: 1.6,
        rim: 1.2,
        exposure: 1.2,
      },
      studio: {
        background: 0xd7dde5,
        key: 0xffffff,
        intensity: 2.8,
        fill: 1.05,
        rim: 1.6,
        exposure: 1.1,
      },
    };
    if (!presets[value]) return;
    this.preset = value;
    if (!this.renderer) return;
    const p = presets[value];
    this.scene.background = new THREE.Color(
      typeof StudioEnhancements !== "undefined"
        ? StudioEnhancements.viewportBackground("4d")
        : p.background,
    );
    if (typeof StudioEnhancements !== "undefined")
      this.scene.background.convertSRGBToLinear();
    this.key.color.setHex(p.key);
    this.key.intensity = p.intensity;
    this.baseSunIntensity = p.intensity;
    this.fill.intensity = p.fill;
    this.rim.intensity = p.rim;
    this.exposure = p.exposure;
    this.renderer.toneMappingExposure = p.exposure;
    const select = document.getElementById("four-d-engine-preset");
    if (select) select.value = value;
    this.renderer.shadowMap.needsUpdate = true;
    this.status(
      `${value[0].toUpperCase() + value.slice(1)} · ${this.supportsAO ? "PBR + AO" : "PBR"}`,
    );
    Engine3D.needsRender = true;
  },
  setExposure(value) {
    if (!this.renderer || !Number.isFinite(Number(value))) return;
    this.exposure = Math.max(0.5, Math.min(1.8, Number(value)));
    this.renderer.toneMappingExposure = this.exposure;
    Engine3D.needsRender = true;
  },
  setGlass(value) {
    this.physicalGlass = !!value;
    try {
      localStorage.setItem(
        "ArchCAD_Physical_Glass",
        String(this.physicalGlass),
      );
    } catch {}
    if (this.ready) for (const material of this.materials) {
      if (!material.userData.glazing) continue;
      material.transmission = this.physicalGlass ? 0.88 : 0;
      material.opacity = this.physicalGlass ? 1 : 0.3;
      material.transparent = !this.physicalGlass;
      material.depthWrite = !!this.physicalGlass;
      material.needsUpdate = true;
    }
    Engine3D.needsRender = true;
  },
  toggleLandscape(value) {
    this.landscapeEnabled = !!value;
    try {
      localStorage.setItem(
        "ArchCAD_4D_Landscape",
        String(this.landscapeEnabled),
      );
    } catch {}
    if (this.ready) Landscape4D.build(this);
    if (this.renderer) this.renderer.shadowMap.needsUpdate = true;
    Engine3D.needsRender = true;
  },
  lightingDialog() {
    if (!this.ready)
      return StudioUI.message("The 4D renderer is still loading.");
    StudioUI.dialog(
      "4D lighting",
      `<p>Physical materials · quality and effects adapt to device load.</p><label>Rendering style<select aria-label="4D rendering style" onchange="Engine4D.setPreset(this.value)">${["daylight","interior","studio"].map(value=>`<option value="${value}" ${this.preset===value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label>Exposure<input aria-label="4D exposure" type="range" min="0.5" max="1.8" step="0.05" value="${this.exposure}" oninput="Engine4D.setExposure(this.value)"></label><label>Sun position<input aria-label="4D sun position" type="range" min="6" max="18" step="0.25" value="${Widget3DEngine.sunHour || 12}" oninput="updateSunlight(Number(this.value));Engine4D.renderer.shadowMap.needsUpdate=true;Engine3D.needsRender=true"></label><label><input type="checkbox" ${this.ao.output === THREE.SSAOPass.OUTPUT.Default ? "checked" : ""} onchange="Engine4D.ao.output=this.checked?THREE.SSAOPass.OUTPUT.Default:THREE.SSAOPass.OUTPUT.Beauty;Engine3D.needsRender=true">Ambient occlusion</label><label><input type="checkbox" ${this.renderer.shadowMap.enabled ? "checked" : ""} onchange="Engine4D.renderer.shadowMap.enabled=this.checked;Engine4D.renderer.shadowMap.needsUpdate=true;Engine3D.needsRender=true">Soft shadows</label><label><input type="checkbox" ${this.landscapeEnabled !== false ? "checked" : ""} onchange="Engine4D.toggleLandscape(this.checked)">Exterior garden · 4D only</label><label><input type="checkbox" ${this.physicalGlass ? "checked" : ""} onchange="Engine4D.setGlass(this.checked)">Physical glass · higher GPU use</label><p>Interactive visualization; lighting is not a daylight compliance calculation.</p>`,
    );
  },
  resize() {
    if (!this.renderer) return;
    const box = document.getElementById("three-container");
    if (!box.clientWidth || !box.clientHeight) return;
    const ratio =
      Math.min(
        devicePixelRatio || 1,
        this.maxPixelRatio || 1.25,
        Math.sqrt((this.pixelBudget || 1100000) / (box.clientWidth * box.clientHeight)),
      ) * (this.dynamicScale || 1);
    const size = [box.clientWidth, box.clientHeight, ratio].join("|");
    if (this.lastSize === size) return;
    this.lastSize = size;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(box.clientWidth, box.clientHeight, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(box.clientWidth, box.clientHeight);
    this.fxaa.uniforms.resolution.value.set(
      1 / (box.clientWidth * ratio),
      1 / (box.clientHeight * ratio),
    );
    FourDRender.resize();
    Engine3D.needsRender = true;
  },
  finish(type) {
    if (this.textures.has(type)) return this.textures.get(type);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    let seed = 19;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const colors = {
      wood: "#b98b59",
      grass: "#63844b",
      "kitchen-tile": "#d8d1c5",
      "bathroom-tile": "#c7d5d7",
      concrete: "#b8b6b0",
      shingle: "#8f6556",
    };
    ctx.fillStyle = colors[type] || colors.concrete;
    ctx.fillRect(0, 0, 512, 512);
    for (let n = 0; n < 14000; n++) {
      ctx.fillStyle = `rgba(${random() > 0.5 ? "255,255,255" : "30,24,16"},${random() * 0.1})`;
      ctx.fillRect(
        random() * 512,
        random() * 512,
        type === "wood" ? random() * 70 + 8 : 2,
        type === "grass" ? 4 : 1,
      );
    }
    ctx.strokeStyle = type === "wood" ? "#72502d" : "#a5a59f";
    ctx.lineWidth = type === "wood" ? 1.5 : 2;
    const spacing = type === "wood" ? 64 : type === "shingle" ? 48 : 128;
    if (type !== "grass" && type !== "concrete")
      for (let y = 0; y < 512; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
        for (
          let x = ((y / spacing) % 2) * 64;
          x < 512;
          x += type === "wood" ? 256 : 128
        ) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + spacing);
          ctx.stroke();
        }
      }
    const map = new THREE.CanvasTexture(canvas);
    map.encoding = THREE.sRGBEncoding;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    const bump = map.clone();
    bump.encoding = THREE.LinearEncoding;
    bump.needsUpdate = true;
    this.textures.set(type, { map, bump });
    return { map, bump };
  },
  material(original, object) {
    if (
      !original.isMeshStandardMaterial &&
      !original.isMeshPhongMaterial &&
      !original.isMeshLambertMaterial
    ) {
      const copy = original.clone();
      this.materials.add(copy);
      return copy;
    }
    const data = object.userData || {},
      room = elements[data.roomIndex];
    const { SCALE } = get3DEnvironmentParams();
    if (object.geometry && !object.geometry.boundingBox)
      object.geometry.computeBoundingBox();
    const bounds = object.geometry?.boundingBox;
    const thin =
      object.geometry?.type === "ShapeGeometry" ||
      (bounds && bounds.max.y - bounds.min.y <= 4 * SCALE);
    const floor =
      data.isRoom &&
      !data.isWall &&
      !data.isOpening &&
      !room?.isFurniture &&
      room?.type !== "staircase" &&
      thin;
    const opening =
      data.openingId && fixtures.find((f) => f.id === data.openingId);
    const glass =
      !floor &&
      original.transparent &&
      original.opacity < 0.75 &&
      (opening?.type === "window" || (original.roughness ?? 1) <= 0.3);
    const material = new THREE.MeshPhysicalMaterial({
      color: original.color || 0xffffff,
      map: original.map || null,
      roughness: original.roughness ?? 0.75,
      metalness: original.metalness || 0,
      roughnessMap: original.roughnessMap || null,
      metalnessMap: original.metalnessMap || null,
      normalMap: original.normalMap || null,
      normalScale: original.normalScale || new THREE.Vector2(1, 1),
      bumpMap: original.bumpMap || null,
      bumpScale: original.bumpScale ?? 1,
      aoMap: original.aoMap || null,
      aoMapIntensity: original.aoMapIntensity ?? 1,
      emissiveMap: original.emissiveMap || null,
      alphaMap: original.alphaMap || null,
      alphaTest: original.alphaTest,
      skinning: original.skinning || false,
      morphTargets: original.morphTargets || false,
      morphNormals: original.morphNormals || false,
      transparent: original.transparent,
      opacity: original.opacity,
      side: original.side,
      depthWrite: original.depthWrite,
      vertexColors: original.vertexColors,
      emissive: original.emissive || 0x000000,
      emissiveIntensity: original.emissiveIntensity ?? 1,
      envMapIntensity: 0.7,
    });
    if (floor && room) {
      const type = getTextureForRoom(room),
        finish = this.finish(type);
      material.map = finish.map.clone();
      material.bumpMap = finish.bump.clone();
      const { SCALE } = get3DEnvironmentParams();
      for (const map of [material.map, material.bumpMap]) {
        map.repeat.set(
          Math.max(0.25, (room.w * SCALE) / 120),
          Math.max(0.25, (room.h * SCALE) / 120),
        );
        map.anisotropy = Math.min(
          4,
          this.renderer.capabilities.getMaxAnisotropy(),
        );
        map.needsUpdate = true;
      }
      material.opacity = 1;
      material.transparent = false;
      material.depthWrite = true;
      material.bumpScale = type === "grass" ? 0.45 : 0.12;
      material.color.set(room.customColor || "#ffffff");
      material.roughness =
        {
          wood: 0.42,
          "kitchen-tile": 0.27,
          "bathroom-tile": 0.24,
          grass: 1,
          concrete: 0.92,
          shingle: 0.9,
        }[type] ?? 0.8;
      material.clearcoat = ["wood", "kitchen-tile", "bathroom-tile"].includes(
        type,
      )
        ? 0.25
        : 0;
      material.clearcoatRoughness = 0.35;
      material.userData.ownedMaps = true;
    } else if (glass) {
      material.userData.glazing = true;
      material.transmission = this.physicalGlass ? 0.88 : 0;
      material.ior = 1.5;
      material.opacity = this.physicalGlass ? 1 : 0.3;
      material.transparent = !this.physicalGlass;
      material.depthWrite = !!this.physicalGlass;
      material.roughness = 0.08;
      material.clearcoat = 1;
      material.clearcoatRoughness = 0.08;
      material.envMapIntensity = 1.2;
    } else if (data.isWall) {
      material.roughness = 0.9;
      material.envMapIntensity = 0.25;
    }
    this.materials.add(material);
    return material;
  },
  clearModel() {
    window.FourDViews?.restoreReveal();
    FourDStudio.clearScene();
    Landscape4D.dispose(this);
    if (this.model) this.scene.remove(this.model);
    Scene4D.dispose(this);
    this.model = null;
    this.pairs = [];
    this.modelVersion = null;
    this.renderer?.renderLists.dispose();
    this.clearOverlay();
  },
  clearOverlay() {
    if (this.overlay) this.scene.remove(this.overlay);
    Scene4D.dispose({
      model: this.overlay,
      materials: new Set(this.overlayMaterials || []),
      sceneResources: this.overlayResources,
    });
    this.overlayResources = null;
    this.overlay = null;
    this.overlayPairs = [];
    this.overlayVersion = null;
    this.overlayMaterials = [];
  },
  syncOverlay() {
    // Editor measurements, axes and transform gizmos do not belong in presentation.
    if ((!window.FourDWorkspace?.dimensions && !Workbench3D.measurePoints) || window.FourDWorkspace?.exporting) {
      if (this.overlay) this.overlay.visible = false;
      return;
    }
    const roots = Engine3D.scene.children.filter(
      (object) =>
        object !== Engine3D.buildingGroup &&
        object !== Engine3D.gridHelper &&
        !object.isLight &&
        !object.isCamera &&
        object !== Engine3D.sunLight.target,
    );
    const ids = [];
    for (const root of roots)
      root.traverse((object) =>
        ids.push(object.uuid + "|" + (object.geometry?.uuid || "")),
      );
    const version = ids.join("|");
    if (this.overlayVersion !== version) {
      this.clearOverlay();
      this.overlayVersion = version;
      this.overlay = new THREE.Group();
      this.scene.add(this.overlay);
      const geometryCopies = new Map(),
        textureCopies = new Map();
      this.overlayResources = { geometries: new Set(), textures: new Set() };
      const cloneNode = (source) => {
        // Editor controls have constructors that require a live DOM/camera.
        // Copy their transform hierarchy without constructing another controller.
        const copy =
          source.isInstancedMesh || source.isSkinnedMesh
            ? source.clone(false)
            : source.isMesh
              ? new THREE.Mesh().copy(source, false)
              : source.isLine || source.isPoints || source.isSprite
                ? source.clone(false)
                : new THREE.Group().copy(source, false);
        copy.layers.mask = source.layers.mask;
        if (source.geometry) {
          if (!geometryCopies.has(source.geometry)) {
            const g = source.geometry.clone();
            geometryCopies.set(source.geometry, g);
            this.overlayResources.geometries.add(g);
          }
          copy.geometry = geometryCopies.get(source.geometry);
        }
        if (source.material) {
          const material = (m) => {
            const clone = m.clone();
            for (const slot of Scene4D.textureSlots)
              if (clone[slot]) {
                if (!textureCopies.has(m[slot])) {
                  const texture = m[slot].clone();
                  texture.needsUpdate = true;
                  textureCopies.set(m[slot], texture);
                  this.overlayResources.textures.add(texture);
                }
                clone[slot] = textureCopies.get(m[slot]);
              }
            this.overlayMaterials.push(clone);
            return clone;
          };
          copy.material = Array.isArray(source.material)
            ? source.material.map(material)
            : material(source.material);
        }
        this.overlayPairs.push([source, copy]);
        for (const child of source.children) copy.add(cloneNode(child));
        return copy;
      };
      for (const root of roots) this.overlay.add(cloneNode(root));
    }
    for (const [source, copy] of this.overlayPairs) {
      copy.position.copy(source.position);
      copy.quaternion.copy(source.quaternion);
      copy.scale.copy(source.scale);
      copy.visible = source.visible;
      if (source.matrixAutoUpdate === false) copy.matrix.copy(source.matrix);
    }
    if (this.overlay) this.overlay.visible = true;
  },
  syncModel(force = false, prepared = null) {
    const source = Engine3D.buildingGroup;
    if (!this.ready || !source) return;
    const version = Engine3D.modelSignature + "|" + Workbench3D.generation;
    if (!force && (window.FourDWorkspace?.structuralPending || this.modelVersion === version)) return;
    let stage;
    try {
      stage = prepared || Scene4D.stage(this, source, ProjectState.capture());
    } catch (error) {
      this.fail(error);
      return false;
    }
    this.clearModel();
    this.modelVersion = version;
    this.model = stage.model;
    this.pairs = stage.pairs;
    this.materials = stage.materials;
    this.sceneResources = stage.resources;
    this.geometryIssues = stage.issues;
    this.modelTriangles = stage.triangles;
    if (window.FourDWorkspace) FourDWorkspace.metrics.builds++;
    this.scene.add(this.model);
    this.frameLighting();
    try {
      Landscape4D.build(this);
    } catch (error) {
      Landscape4D.dispose(this);
      this.geometryIssues.push({ element: "Garden", reason: error.message });
    }
    this.renderer.shadowMap.needsUpdate = true;
  },
  frameLighting() {
    const box = new THREE.Box3().setFromObject(this.model);
    this.modelBounds = box;
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3()),
        radius = Math.max(100, box.getSize(new THREE.Vector3()).length() * 0.6);
      this.key.target.position.copy(center);
      this.rim.position
        .copy(center)
        .add(new THREE.Vector3(-radius, radius, -radius));
      Object.assign(this.key.shadow.camera, {
        left: -radius,
        right: radius,
        top: radius,
        bottom: -radius,
        near: 0.1,
        far: Math.max(3000, radius * 8),
      });
      this.key.shadow.camera.updateProjectionMatrix();
      this.key.shadow.bias=-0.00015;
      this.key.shadow.normalBias=0.25;
      this.key.shadow.radius=2;
    }
  },
  updateCamera(source) {
    if (!this.camera || this.camera.type !== source.type)
      this.camera = source.clone(false);
    else this.camera.copy(source, false);
    // The editing camera allows a very wide depth range. Fit the presentation
    // camera to the model so the AO depth texture can resolve nearby surfaces.
    const box =
      (typeof StudioEnhancements !== "undefined" &&
        StudioEnhancements.explodedBounds) ||
      this.modelBounds;
    if (box && !box.isEmpty()) {
      const distance = source.position.distanceTo(
        box.getCenter(new THREE.Vector3()),
      );
      const radius = Math.max(
        10,
        box.getSize(new THREE.Vector3()).length() / 2,
      );
      this.camera.near = Math.max(0.2, distance - radius * 1.4);
      this.camera.far = Math.max(
        this.camera.near + 100,
        distance + radius * 2.5,
      );
      this.camera.updateProjectionMatrix();
    }
    FourDRender.camera(this.camera, FourDStudio.settings);
    return this.camera;
  },
  render(camera = Engine3D.camera) {
    if (!this.active || !this.ready) return false;
    try {
      return this.renderFrame(camera);
    } catch (error) {
      this.fail(error);
      return false;
    }
  },
  renderFrame(camera) {
    Engine3D.scene.updateMatrixWorld(true);
    this.syncModel();
    if (!this.ready) return false;
    this.syncOverlay();
    Scene4D.updateTextures(this);
    camera = this.updateCamera(camera);
    FourDStudio.restoreFilters();
    for (const [source, copy] of this.pairs) {
      copy.position.copy(source.position);
      copy.quaternion.copy(source.quaternion);
      copy.scale.copy(source.scale);
      copy.visible = source.visible;
      if (source.matrixAutoUpdate === false) copy.matrix.copy(source.matrix);
    }
    if (typeof StudioEnhancements !== "undefined")
      StudioEnhancements.applyPresentation();
    this.renderer.clippingPlanes =
      typeof StudioEnhancements !== "undefined"
        ? StudioEnhancements.clipping(Engine3D.renderer.clippingPlanes)
        : Engine3D.renderer.clippingPlanes;
    // Match the shared sun control while retaining this engine's own light rig.
    this.key.position.copy(Engine3D.sunLight.position);
    if (!this.lastSun || !this.lastSun.equals(this.key.position)) {
      this.renderer.shadowMap.needsUpdate = true;
      this.lastSun = this.key.position.clone();
    }
    FourDStudio.frame(camera);
    window.FourDViews?.effects(camera);
    if (FourDStudio.renderComparison(camera)) {
      this.frames = (this.frames || 0) + 1;
      this.status("4D alternatives · synchronized cameras");
      return true;
    }
    const ao = this.ao,
      perspective = camera.isPerspectiveCamera ? 1 : 0;
    ao.camera = camera;
    if (ao.ssaoMaterial.defines.PERSPECTIVE_CAMERA !== perspective) {
      ao.ssaoMaterial.defines.PERSPECTIVE_CAMERA = perspective;
      ao.ssaoMaterial.needsUpdate = true;
      ao.depthRenderMaterial.defines.PERSPECTIVE_CAMERA = perspective;
      ao.depthRenderMaterial.needsUpdate = true;
    }
    for (const uniforms of [
      ao.ssaoMaterial.uniforms,
      ao.depthRenderMaterial.uniforms,
    ]) {
      uniforms.cameraNear.value = camera.near;
      uniforms.cameraFar.value = camera.far;
    }
    ao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(
      camera.projectionMatrix,
    );
    ao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(
      camera.projectionMatrixInverse,
    );
    // Global geometry clipping must not clip the fullscreen post-processing quad.
    const planes = this.renderer.clippingPlanes;
    ao.normalMaterial.clippingPlanes = planes;
    const originalRenderPass = ao.renderPass;
    ao.renderPass = function (renderer, ...args) {
      const clips = renderer.clippingPlanes;
      renderer.clippingPlanes = [];
      try {
        return originalRenderPass.call(this, renderer, ...args);
      } finally {
        renderer.clippingPlanes = clips;
      }
    };
    try {
      try {
        this.composer.render();
      } catch (error) {
        if (!ao.enabled) throw error;
        this.aoFault = true;
        ao.enabled = false;
        this.beautyPass.enabled = true;
        this.lastError = "Ambient occlusion was reduced: " + error.message;
        this.composer.render();
      }
    } finally {
      ao.renderPass = originalRenderPass;
      this.renderer.clippingPlanes = planes;
    }
    FourDRender.after(camera, FourDStudio.settings);
    this.frames = (this.frames || 0) + 1;
    this.status(
      `${this.preset[0].toUpperCase() + this.preset.slice(1)} · ${this.supportsAO && this.ao.enabled && this.ao.output === THREE.SSAOPass.OUTPUT.Default ? "PBR + AO" : "PBR"}`,
    );
    return true;
  },
  async capture() {
    if (!this.ready || window.FourDWorkspace?.paused)
      return StudioUI.message("The 4D renderer is still loading.");
    const stamp=this.generation;
    if (FourDWorkspace.includeAnnotations) FourDRender.cancelPhoto();
    FourDWorkspace.exporting = !FourDWorkspace.includeAnnotations;
    let blob;
    try {
    if (!FourDRender.presentPhoto() && !this.render())
      return StudioUI.message(
        "Recover the 4D renderer before exporting.",
        "error",
      );
    blob = await new Promise((resolve) =>
      this.renderer.domElement.toBlob(resolve, "image/png"),
    );
    } finally {
      FourDWorkspace.exporting=false;
      Engine3D.needsRender=true;
    }
    if (stamp !== this.generation) return;
    if (!blob)
      return StudioUI.message("The render could not be captured.", "error");
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "ArchCAD_4D_Render.png";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

try {
  Engine4D.landscapeEnabled =
    localStorage.getItem("ArchCAD_4D_Landscape") !== "false";
} catch {}

try {
  Engine4D.physicalGlass =
    localStorage.getItem("ArchCAD_Physical_Glass") === "true";
} catch {}
