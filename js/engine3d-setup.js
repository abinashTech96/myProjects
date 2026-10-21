// =========================================
// 🚀 CORE 3D ENGINE & SETUP (engine3d-setup.js)
// Encapsulated Module
// =========================================

window.Engine3D = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    buildingGroup: null,
    sunLight: null,
    hemiLight: null,
    
    // FPS & Walkthrough State
    fpsControls: null,
    isWalkthrough: false,
    moveState: { forward: false, backward: false, left: false, right: false, up: false, down: false },

    // Core Initialization
    init() {
        if (this.scene) return;
        const container = document.getElementById('three-container');
        if (!container) return;
        
        // 1. Setup Scene & Camera (Theme-Aware)
        const isClassic = document.body.classList.contains('classic-theme');
        const bgColor = isClassic ? 0xe2e8f0 : 0x0f172a;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(bgColor); 
        this.scene.fog = null; // Keep distant architectural geometry readable.
        
        this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 1, 10000);
        this.camera.position.set(500, 800, 1000);
        this.perspectiveCamera = this.camera;

        // 2. Setup Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        const quality = typeof PlanningUI !== 'undefined' ? PlanningUI.preferences.quality || PlanningUI.readPrefs().quality || 'balanced' : 'balanced';
        this.renderer.setPixelRatio(quality === 'high' ? Math.min(window.devicePixelRatio, 2) : 1);
        this.renderer.setSize(container.clientWidth, container.clientHeight, false);
        this.renderer.shadowMap.enabled = quality !== 'low';
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.autoUpdate = false; // Shadow optimization
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        container.appendChild(this.renderer.domElement);

        // 3. Setup Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true; 
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(500, 0, 500);
        this.controls.addEventListener('change',()=>{this.needsRender=true});
        this.controls.addEventListener('start',()=>{this.cameraTween=null;if(typeof ViewportUI!=='undefined')ViewportUI.view='free';this.needsRender=true});
        //this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // <-- This was the restriction for 360deg vertically
        this.controls.maxPolarAngle = Math.PI; // Allows going completely underneath

        // 4. Setup Lighting
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.6);
        this.hemiLight.position.set(0, 200, 0);
        this.scene.add(this.hemiLight);

        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048; 
        this.sunLight.shadow.mapSize.height = 2048;
        const d = 1500;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.sunLight.shadow.camera.far = 3000;
        this.scene.add(this.sunLight);
        
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3); 
        this.scene.add(ambientLight);

        if (typeof updateSunlight === 'function') updateSunlight(12);

        const gridHelper = new THREE.GridHelper(3000, 100, 0x334155, 0x1e293b);
        gridHelper.position.set(500, -1, 500); 
        this.scene.add(gridHelper);
        this.gridHelper = gridHelper;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.24;
        gridHelper.material.depthWrite = false;

        // 5. Setup FPS Controls for Walkthrough
        this.fpsControls = new THREE.PointerLockControls(this.camera, document.body);
        
        this.fpsControls.addEventListener('unlock', () => {
            this.isWalkthrough = false;
            this.controls.enabled = true; 
            const navPad = document.getElementById('nav-pad');
            if (navPad) navPad.style.display = 'flex'; 
            
            const hint = document.getElementById('fly-hint');
            if (hint) hint.remove();
            this.moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };
        });

        this.scene.add(this.fpsControls.getObject());
        
        this.syncVisibility();
        this.setupResizeObserver(container);
        if (typeof Workbench3D !== 'undefined') Workbench3D.init();
        if (typeof ViewportUI !== 'undefined') ViewportUI.engineReady();
    },

    syncVisibility() {
        const visible = !document.hidden && window.is3DMode;
        window.isEnginePaused = !visible;
        if (!visible) {
            for (const key of Object.keys(this.moveState)) this.moveState[key] = false;
            if (this.fpsControls?.isLocked) this.fpsControls.unlock();
            if (this.animationFrame != null) cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
            this.loopRunning = false;
            return;
        }
        if (this.modelDirty && typeof window.request3DUpdate === 'function') window.request3DUpdate();
        if (this.scene && !this.loopRunning) this.startAnimationLoop();
    },

    startAnimationLoop() {
        if (this.loopRunning || !this.scene) return;
        this.loopRunning = true;
        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();
        let prevTime = performance.now();

        const animate = () => {
            this.animationFrame = null;
            if (document.hidden || !window.is3DMode) {
                this.loopRunning = false;
                this.animationFrame = null;
                return;
            }
            const time = performance.now();
            const delta = Math.min((time - prevTime) / 1000, 0.1);

            let controlsChanged = false;
            if (typeof ViewportUI !== 'undefined') ViewportUI.tick(time);
            if (this.isWalkthrough && this.fpsControls.isLocked) {
                // Physics & Friction
                velocity.x -= velocity.x * 10.0 * delta;
                velocity.y -= velocity.y * 10.0 * delta; 
                velocity.z -= velocity.z * 10.0 * delta; 

                direction.z = Number(this.moveState.forward) - Number(this.moveState.backward);
                direction.x = Number(this.moveState.right) - Number(this.moveState.left);
                direction.y = Number(this.moveState.up) - Number(this.moveState.down); 
                direction.normalize();

                const speedMultiplier = 800.0;
                if (this.moveState.forward || this.moveState.backward) velocity.z -= direction.z * speedMultiplier * delta;
                if (this.moveState.left || this.moveState.right) velocity.x -= direction.x * speedMultiplier * delta;
                if (this.moveState.up || this.moveState.down) velocity.y -= direction.y * speedMultiplier * delta; 

                const controlObj = this.fpsControls.getObject();
                const originalPos = controlObj.position.clone();
                const scaleInput = document.getElementById('scaleInput');
                const SCALE = scaleInput ? parseFloat(scaleInput.value) || 1.2 : 1.2;
                const HITBOX_RADIUS = 10 * SCALE; 

                // X Collision
                controlObj.translateX(velocity.x * delta);
                let hitX = false;
                let camBoxX = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(controlObj.position.x,controlObj.position.y-25*SCALE,controlObj.position.z), new THREE.Vector3(HITBOX_RADIUS, 60*SCALE, HITBOX_RADIUS));
                
                if (this.buildingGroup) this.buildingGroup.traverse(mesh=>{
                    if(mesh.isMesh&&mesh.userData.isWall&&camBoxX.intersectsBox(new THREE.Box3().setFromObject(mesh)))hitX=true;
                });
                if (hitX) { controlObj.position.x = originalPos.x; velocity.x = 0; }

                // Z Collision
                originalPos.copy(controlObj.position); 
                controlObj.translateZ(velocity.z * delta);
                let hitZ = false;
                let camBoxZ = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(controlObj.position.x,controlObj.position.y-25*SCALE,controlObj.position.z), new THREE.Vector3(HITBOX_RADIUS, 60*SCALE, HITBOX_RADIUS));

                if (this.buildingGroup) this.buildingGroup.traverse(mesh=>{
                    if(mesh.isMesh&&mesh.userData.isWall&&camBoxZ.intersectsBox(new THREE.Box3().setFromObject(mesh)))hitZ=true;
                });
                if (hitZ) { controlObj.position.z = originalPos.z; velocity.z = 0; }

                // Y Movement (Flying constraints)
                controlObj.position.y += (velocity.y * delta);
                if (controlObj.position.y < 40 * SCALE) { 
                    controlObj.position.y = 40 * SCALE;
                    velocity.y = 0;
                }
            } else {
                controlsChanged = this.controls.update();
            }
            
            const continuous = this.isWalkthrough || window.isPlayingTour || this.controls.autoRotate || !!this.cameraTween;
            if (continuous || controlsChanged || this.needsRender) {
                this.renderer.render(this.scene, this.camera);
                this.renderFrames = (this.renderFrames || 0) + 1;
                this.needsRender = false;
                this.afterRender?.(time, !continuous && !controlsChanged);
            }
            prevTime = time;
            if (continuous || controlsChanged || this.needsRender) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                this.loopRunning = false;
            }
        };
        this.animationFrame = requestAnimationFrame(animate);
    },

    resize(width, height) {
        if (!this.camera || !this.renderer || width <= 0 || height <= 0) return;
        this.camera.aspect = width / height;
        if (this.camera.isOrthographicCamera) {
            const half = (this.camera.top - this.camera.bottom) / 2;
            this.camera.left = -half * this.camera.aspect;
            this.camera.right = half * this.camera.aspect;
        }
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
        this.needsRender = true;
    },

    setupResizeObserver(container) {
        const resizeObserver = new ResizeObserver(entries => {
            if (!this.camera || !this.renderer) return;
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    this.resize(width, height);
                }
            }
        });
        resizeObserver.observe(container);
    }
};

Object.defineProperty(Engine3D, 'needsRender', {
    get() { return !!this._needsRender; },
    set(value) {
        this._needsRender = !!value;
        if (value && this.scene && window.is3DMode && !document.hidden && !this.loopRunning)
            this.startAnimationLoop();
    }
});

// =========================================
// 🌐 GLOBAL BRIDGE & TOGGLE LOGIC
// =========================================
window.toggle3D = function(targetMode = null) {
    const leftSide = document.getElementById('canvas-wrapper');
    const rightSide = document.getElementById('right-canvas-wrapper');
    const resizer = document.getElementById('split-resizer');
    const svg = document.getElementById('blueprint');
    const container3D = document.getElementById('three-container');
    const navPad = document.getElementById('nav-pad'); 
    const presControls = document.getElementById('presentation-controls');

    if (targetMode === '2d') window.is3DMode = false;
    else if (targetMode === '3d') window.is3DMode = true;
    else window.is3DMode = !window.is3DMode;

    const btn2d = document.getElementById('mode-2d');
    const btn3d = document.getElementById('mode-3d');
    if (btn2d) btn2d.className = window.is3DMode ? 'nav-switch-btn' : 'nav-switch-btn active';
    if (btn3d) btn3d.className = window.is3DMode ? 'nav-switch-btn active' : 'nav-switch-btn';
    if (resizer) resizer.style.display = 'flex';

    if (window.is3DMode) {
        if (leftSide) leftSide.style.flex = '0 0 30%';
        if (rightSide) rightSide.style.flex = '1 1 70%';
        if (svg) svg.style.display = 'block';
        if (container3D) container3D.style.display = 'block';
        if (navPad) navPad.style.display = 'flex'; 
        if (presControls) presControls.style.display = 'flex';
        
        if (!Engine3D.scene) Engine3D.init();
        if (typeof generate3DModel === 'function') generate3DModel();
    } else {
        if (leftSide) leftSide.style.flex = '0 0 70%';
        if (rightSide) rightSide.style.flex = '1 1 30%';
        if (svg) svg.style.display = 'block';
        if (container3D) container3D.style.display = 'block';
        if (navPad) navPad.style.display = 'none'; 
        if (presControls) presControls.style.display = 'none';
        
        if (Engine3D.fpsControls && Engine3D.fpsControls.isLocked) {
            Engine3D.fpsControls.unlock();
        }
    }


};

window.setWorkspaceLayout = function(mode) {
    toggle3D(mode);
};