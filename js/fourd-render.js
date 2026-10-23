/* 4D-owned GPU services: HDR environments, local reflections, photographic
 * projection and bounded multisample still refinement. No editor resources owned. */
window.FourDRender = {
  init(engine) {
    this.engine = engine;
    this.environmentKey = null;
    this.bokeh = null;
    this.initPhotoResources();
  },
  ensureBokeh() {
    if (this.bokeh) return;
    const engine=this.engine;
    this.bokeh = new THREE.BokehPass(engine.scene, Engine3D.camera, {
      width: 1,
      height: 1,
      focus: 240,
      aperture: 0.000025,
      maxblur: 0.008,
    });
    this.bokeh.needsSwap = true;
    this.bokeh.enabled = false;
    this.bokeh.setSize = (w, h) =>
      this.bokeh.renderTargetDepth.setSize(
        this.bokeh.enabled ? w : 1,
        this.bokeh.enabled ? h : 1,
      );
    engine.composer.insertPass(this.bokeh, 2);
  },
  initPhotoResources() {
    this.average = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        previous: { value: null },
        current: { value: null },
        weight: { value: 1 },
      },
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader:
        "varying vec2 vUv;uniform sampler2D previous;uniform sampler2D current;uniform float weight;void main(){vec4 c=texture2D(current,vUv);gl_FragColor=weight>=.999?c:mix(texture2D(previous,vUv),c,weight);}",
    });
    this.quad = new THREE.FullScreenQuad(this.average);
    this.sample = 0;
    this.active = false;
  },
  environment(settings) {
    if (
      settings.environment === "custom" &&
      settings.hdr &&
      this.failedHDR === settings.hdr
    )
      settings = { ...settings, environment: "studio", hdr: "" };
    const key = [
      settings.environment,
      settings.environmentRotation,
      settings.showSky,
      settings.hdr,
    ];
    if (
      this.environmentKey &&
      key.every((v, i) => v === this.environmentKey[i])
    ) {
      // Lighting presets and theme changes can replace the background independently.
      if (settings.showSky) this.engine.scene.background = this.sky;
      return;
    }
    const e = this.engine;
    let source;
    if (settings.environment === "custom" && settings.hdr) {
      let parsed;
      try {
        const str = atob(settings.hdr.split(",")[1]),
          bytes = Uint8Array.from(str, (c) => c.charCodeAt(0));
        parsed = new THREE.RGBELoader()
          .setDataType(THREE.HalfFloatType)
          .parse(bytes.buffer);
      } catch (error) {
        this.failedHDR = settings.hdr;
        StudioUI.message(
          "The saved HDR could not be decoded; studio lighting is being used. Import the HDR again.",
          "error",
        );
        return this.environment({
          ...settings,
          environment: "studio",
          hdr: "",
        });
      }
      source = new THREE.DataTexture(
        parsed.data,
        parsed.width,
        parsed.height,
        parsed.format,
        parsed.type,
      );
      source.encoding = THREE.LinearEncoding;
    } else {
      const w = 256,
        h = 128,
        data = new Float32Array(w * h * 4),
        palettes = {
          studio: [
            [0.38, 0.48, 0.68],
            [1.2, 1.2, 1.15],
            [0.22, 0.18, 0.15],
          ],
          overcast: [
            [0.8, 0.9, 1.1],
            [1.3, 1.35, 1.4],
            [0.28, 0.3, 0.3],
          ],
          sunset: [
            [0.12, 0.16, 0.36],
            [2.2, 0.75, 0.22],
            [0.22, 0.12, 0.1],
          ],
          night: [
            [0.008, 0.015, 0.045],
            [0.04, 0.055, 0.09],
            [0.01, 0.012, 0.02],
          ],
        },
        c = palettes[settings.environment] || palettes.studio;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const v = y / (h - 1),
            u = (x / w) * Math.PI * 2,
            upper = Math.min(1, v * 2),
            base =
              v < 0.5
                ? c[0].map((n, i) => n * (1 - upper) + c[1][i] * upper)
                : c[1].map((n, i) => n * (2 - v * 2) + c[2][i] * (v * 2 - 1));
          const angle = Math.atan2(Math.sin(u - 0.8), Math.cos(u - 0.8)),
            sun = Math.exp(
              -(
                (angle * angle) / 0.002 +
                (v - (settings.environment === "sunset" ? 0.47 : 0.28)) ** 2 /
                  0.0006
              ),
            );
          const softbox =
            settings.environment === "studio" &&
            ((x > 30 && x < 65) || (x > 165 && x < 190)) &&
            y > 23 &&
            y < 47
              ? 5
              : 0;
          const energy =
            settings.environment === "overcast"
              ? 0
              : settings.environment === "night"
                ? 2
                : 35;
          for (let k = 0; k < 3; k++)
            data[(y * w + x) * 4 + k] =
              base[k] +
              sun * energy * (k === 0 ? 1 : k === 1 ? 0.8 : 0.55) +
              softbox;
          data[(y * w + x) * 4 + 3] = 1;
        }
      source = new THREE.DataTexture(
        data,
        w,
        h,
        THREE.RGBAFormat,
        THREE.FloatType,
      );
      source.encoding = THREE.LinearEncoding;
    }
    if (settings.environmentRotation) {
      const { width, height, data } = source.image,
        stride = data.length / (width * height),
        shift = Math.round((width * settings.environmentRotation) / 360),
        rotated = new data.constructor(data.length);
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
          for (let k = 0; k < stride; k++)
            rotated[(y * width + x) * stride + k] =
              data[(y * width + ((x + shift) % width)) * stride + k];
      source.image.data = rotated;
    }
    source.mapping = THREE.EquirectangularReflectionMapping;
    source.needsUpdate = true;
    source.minFilter = source.magFilter = THREE.NearestFilter;
    const generator = new THREE.PMREMGenerator(e.renderer);
    let target;
    try {
      target = generator.fromEquirectangular(source);
    } catch (error) {
      source.dispose();
      throw error;
    } finally {
      generator.dispose();
    }
    e.environment?.dispose();
    this.sky?.dispose();
    this.sky = source;
    e.environment = target;
    e.scene.environment = target.texture;
    if (settings.showSky) e.scene.background = source;
    else
      e.scene.background = new THREE.Color(
        StudioEnhancements.viewportBackground("4d"),
      ).convertSRGBToLinear();
    this.environmentKey = key;
    this.probeDirty = true;
  },
  camera(camera, settings) {
    if (!camera.isPerspectiveCamera) return;
    if (settings.lens) {
      camera.filmGauge = 36;
      camera.setFocalLength(settings.lens);
    }
    if (settings.verticals) {
      const target = Engine3D.controls.target.clone(),
        flat = target.clone();
      flat.y = camera.position.y;
      if (flat.distanceToSquared(camera.position) > 0.001) {
        camera.lookAt(flat);
        camera.updateMatrixWorld(true);
        const v = target.applyMatrix4(camera.matrixWorldInverse);
        camera.projectionMatrix.elements[9] = THREE.MathUtils.clamp(
          (camera.projectionMatrix.elements[5] * v.y) / Math.max(0.1, -v.z),
          -2,
          2,
        );
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      }
    }
  },
  clearMirrors() {
    for (const m of this.mirrors || []) {
      this.engine?.scene.remove(m);
      m.getRenderTarget().dispose();
      m.geometry.dispose();
      m.material.dispose();
    }
    this.mirrors = [];
    this.mirrorKey = null;
  },
  mirrorsFor(project, settings) {
    const key = JSON.stringify([settings.mirrors, this.engine.modelVersion]);
    if (key === this.mirrorKey) return;
    this.clearMirrors();
    this.mirrorKey = key;
    const { SCALE: S, I } = get3DEnvironmentParams();
    for (const config of settings.mirrors) {
      const room = project.elements.find((e) => e.id === config.room);
      if (!room) continue;
      const wall = project.wallSettings.external / 2 + 0.5,
        h = Math.min(
          config.height,
          WorkbenchModel.floorHeight(project, room.floor) - config.sill,
        ),
        length = ["top", "bottom"].includes(config.edge) ? room.w : room.h,
        w = Math.min(config.width, length - wall * 2);
      if (h <= 0 || w <= 0) continue;
      const mesh = new THREE.Reflector(new THREE.PlaneGeometry(w * S, h * S), {
        color: 0xf5f5f5,
        textureWidth: 512,
        textureHeight: 512,
        clipBias: 0.003,
      });
      const along = wall + w / 2 + (length - wall * 2 - w) * config.offset;
      mesh.position.set(
        I.x +
          (room.x +
            (["top", "bottom"].includes(config.edge)
              ? along
              : config.edge === "left"
                ? wall
                : room.w - wall)) *
            S,
        (WorkbenchModel.roomBase(project, room) + config.sill + h / 2) * S,
        I.z +
          (room.y +
            (["left", "right"].includes(config.edge)
              ? along
              : config.edge === "top"
                ? wall
                : room.h - wall)) *
            S,
      );
      mesh.rotation.y = {
        top: 0,
        bottom: Math.PI,
        left: Math.PI / 2,
        right: -Math.PI / 2,
      }[config.edge];
      mesh.userData = {
        fourDAuxiliary: true,
        mirror: true,
        elementId: room.id,
      };
      const draw = mesh.onBeforeRender;
      mesh.onBeforeRender = (renderer, scene, camera, ...args) => {
        if (
          this.reflectionDrawing ||
          scene.overrideMaterial ||
          !camera.isPerspectiveCamera
        )
          return;
        const hidden = [
          ...(this.mirrors || []).filter((m) => m !== mesh),
          FourDStudio.outlines,
          FourDStudio.clearanceGroup,
        ]
          .filter(Boolean)
          .map((m) => [m, m.visible]);
        this.reflectionDrawing = true;
        hidden.forEach(([m]) => (m.visible = false));
        try {
          draw.call(mesh, renderer, scene, camera, ...args);
        } finally {
          hidden.forEach(([m, v]) => (m.visible = v));
          mesh.visible = true;
          this.reflectionDrawing = false;
        }
      };
      this.engine.scene.add(mesh);
      this.mirrors.push(mesh);
    }
  },
  updateProbe(settings) {
    const e = this.engine;
    if (settings.reflections !== "local") {
      if (this.probe) {
        e.scene.environment = e.environment.texture;
        this.probe.dispose();
        this.probe = null;
        this.probeEnvironment?.dispose();
        this.probeEnvironment = null;
      }
      return;
    }
    if (
      !this.probeDirty ||
      StudioEnhancements.navigating ||
      this.active ||
      FourDStudio.comparison ||
      performance.now() - (this.cameraChangedAt || 0) < 300
    )
      return;
    this.probeDirty = false;
    if (!this.probe)
      this.probe = new THREE.WebGLCubeRenderTarget(128, {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      });
    const camera = new THREE.CubeCamera(
        0.5,
        Math.max(3000, e.camera.far),
        this.probe,
      ),
      p = ProjectState.capture(),
      room =
        elements[selectedElIndex] && !elements[selectedElIndex].isFurniture
          ? elements[selectedElIndex]
          : p.elements.find((e) => !e.isFurniture);
    const { SCALE: S, I } = get3DEnvironmentParams();
    camera.position.copy(
      room
        ? new THREE.Vector3(
            I.x + (room.x + room.w / 2) * S,
            (WorkbenchModel.roomBase(p, room) + 64) * S,
            I.z + (room.y + room.h / 2) * S,
          )
        : Engine3D.controls.target,
    );
    const hidden = [
      ...this.mirrors,
      FourDStudio.outlines,
      FourDStudio.clearanceGroup,
    ]
      .filter(Boolean)
      .map((m) => [m, m.visible]);
    hidden.forEach(([m]) => (m.visible = false));
    const background = e.scene.background;
    e.scene.environment = e.environment.texture;
    e.scene.background = this.sky || background;
    this.reflectionDrawing = true;
    try {
      camera.update(e.renderer, e.scene);
      const generator = new THREE.PMREMGenerator(e.renderer);
      let environment;
      try {
        environment = generator.fromCubemap(this.probe.texture);
      } finally {
        generator.dispose();
      }
      this.probeEnvironment?.dispose();
      this.probeEnvironment = environment;
      e.scene.environment = environment.texture;
    } finally {
      e.scene.background = background;
      hidden.forEach(([m, v]) => (m.visible = v));
      this.reflectionDrawing = false;
    }
  },
  resize() {
    this.cancelPhoto();
    if (!this.engine?.renderer) return;
    this.bokeh?.renderTargetDepth.setSize(
      this.bokeh.enabled ? this.engine.renderer.domElement.width : 1,
      this.bokeh.enabled ? this.engine.renderer.domElement.height : 1,
    );
    this.targets?.forEach((t) => t.dispose());
    this.targets = null;
  },
  requestPhoto() {
    if (!this.engine?.ready || FourDStudio.comparison || FourDStudio.playing)
      return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (
        !this.engine.ready ||
        StudioEnhancements.navigating ||
        StudioEnhancements.walking
      )
        return;
      if (FourDStudio.settings.dof) this.ensureBokeh();
      this.active = true;
      this.sample = 0;
      this.photoStamp = FourDStudio.visualStamp();
      this.drawPhoto();
    }, 400);
  },
  drawPhoto() {
    if (!this.active || !this.engine?.ready) return;
    if (this.photoStamp !== FourDStudio.visualStamp()) {
      this.cancelPhoto();
      return;
    }
    if (!this.engine.render(Engine3D.camera)) {
      this.cancelPhoto();
      return;
    }
    if (this.sample < FourDStudio.settings.samples)
      this.raf = requestAnimationFrame(() => this.drawPhoto());
    else {
      this.active = false;
      FourDStudio.photoStatus("Refined · " + this.sample + " raster samples");
    }
  },
  cancelPhoto() {
    clearTimeout(this.timer);
    cancelAnimationFrame(this.raf);
    this.active = false;
    this.sample = 0;
    if (this.bokeh) {
      this.bokeh.enabled = false;
      this.bokeh.renderTargetDepth.setSize(1, 1);
    }
    if (this.engine?.composer) this.engine.composer.renderToScreen = true;
  },
  presentPhoto() {
    if (
      !this.sample ||
      this.active ||
      !this.targets ||
      this.photoStamp !== FourDStudio.visualStamp()
    )
      return false;
    this.average.uniforms.current.value =
      this.targets[(this.sample - 1) % 2].texture;
    this.average.uniforms.weight.value = 1;
    this.engine.renderer.setRenderTarget(null);
    this.quad.render(this.engine.renderer);
    return true;
  },
  before(camera, settings) {
    if (this.active && this.photoStamp !== FourDStudio.visualStamp())
      this.cancelPhoto();
    const e = this.engine;
    e.composer.renderToScreen = !this.active;
    const bokeh = !!(this.active && settings.dof && camera.isPerspectiveCamera);
    if (bokeh) this.ensureBokeh();
    if (this.bokeh) {
      this.bokeh.enabled = bokeh;
      this.bokeh.camera = camera;
    }
    if (bokeh) {
      this.bokeh.renderTargetDepth.setSize(
        e.renderer.domElement.width,
        e.renderer.domElement.height,
      );
      this.bokeh.uniforms.focus.value =
        settings.focusDistance * get3DEnvironmentParams().SCALE;
      this.bokeh.uniforms.aperture.value = 0.00012 / settings.fstop;
      this.bokeh.uniforms.aspect.value = camera.aspect;
    }
    if (!this.active) return;
    const canvas = e.renderer.domElement;
    if (
      !this.targets ||
      this.targets[0].width !== canvas.width ||
      this.targets[0].height !== canvas.height
    ) {
      this.targets?.forEach((t) => t.dispose());
      this.targets = [0, 1].map(
        () =>
          new THREE.WebGLRenderTarget(canvas.width, canvas.height, {
            depthBuffer: false,
            stencilBuffer: false,
          }),
      );
      this.sample = 0;
    }
    this.projection = camera.projectionMatrix.clone();
    camera.projectionMatrix.elements[8] +=
      ((FourDModel.halton(this.sample + 1, 2) - 0.5) * 2) / canvas.width;
    camera.projectionMatrix.elements[9] +=
      ((FourDModel.halton(this.sample + 1, 3) - 0.5) * 2) / canvas.height;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  },
  after(camera, settings) {
    const e = this.engine;
    if (!this.active) {
      if (
        settings.progressive &&
        !FourDStudio.comparison &&
        !FourDStudio.playing
      )
        this.requestPhoto();
      return;
    }
    camera.projectionMatrix.copy(this.projection);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    const out = this.targets[this.sample % 2],
      prior = this.targets[(this.sample + 1) % 2];
    this.average.uniforms.previous.value = prior.texture;
    this.average.uniforms.current.value = e.composer.readBuffer.texture;
    this.average.uniforms.weight.value = 1 / (this.sample + 1);
    e.renderer.setRenderTarget(out);
    this.quad.render(e.renderer);
    this.average.uniforms.current.value = out.texture;
    this.average.uniforms.weight.value = 1;
    e.renderer.setRenderTarget(null);
    this.quad.render(e.renderer);
    this.sample++;
    FourDStudio.photoStatus(
      "Refining · " + this.sample + " / " + settings.samples,
    );
  },
  dispose() {
    this.cancelPhoto();
    this.clearMirrors();
    this.probe?.dispose();
    this.probe = null;
    this.probeEnvironment?.dispose();
    this.probeEnvironment = null;
    this.sky?.dispose();
    this.sky = null;
    this.targets?.forEach((t) => t.dispose());
    this.targets = null;
    this.bokeh?.renderTargetDepth.dispose();
    this.bokeh?.materialDepth.dispose();
    this.bokeh?.materialBokeh.dispose();
    this.bokeh?.fsQuad.dispose();
    this.average?.dispose();
    this.quad?.dispose();
    this.bokeh = null;
    this.environmentKey = null;
  },
};
