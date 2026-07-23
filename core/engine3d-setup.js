let scene3D, camera3D, renderer3D, controls3D;
let buildingGroup;
let sunLight, hemiLight;
let waypoints = [];
let isPlayingTour = false;

let fpsControls;
let isWalkthrough = false;
let moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };


// =========================================
// CORE 3D TOGGLE & INIT
// =========================================
function toggle3D(targetMode = null) {
    const leftSide = document.getElementById('canvas-wrapper');
    const rightSide = document.getElementById('right-canvas-wrapper');
    const resizer = document.getElementById('split-resizer');
    
    const svg = document.getElementById('blueprint');
    const container3D = document.getElementById('three-container');
    const navPad = document.getElementById('nav-pad'); 
    const presControls = document.getElementById('presentation-controls');

    // 1. Determine the mode change
    // If a button explicitly passes '2d' or '3d', use it. Otherwise, toggle the boolean.
    if (targetMode === '2d') is3DMode = false;
    else if (targetMode === '3d') is3DMode = true;
    else is3DMode = !is3DMode;

    // 2. Synchronize your custom switch-btn and active classes
    const btn2d = document.getElementById('mode-2d');
    const btn3d = document.getElementById('mode-3d');
    
    if (btn2d) btn2d.className = is3DMode ? 'nav-switch-btn' : 'nav-switch-btn active';
    if (btn3d) btn3d.className = is3DMode ? 'nav-switch-btn active' : 'nav-switch-btn';

    // Ensure the draggable center splitter is always visible for split-screen utility
    if (resizer) resizer.style.display = 'flex';

    if (is3DMode) {
        // --- TURN ON 3D PRIMARY FOCUS (30% Left / 70% Right) ---
        if (leftSide) leftSide.style.flex = '0 0 30%';
        if (rightSide) rightSide.style.flex = '1 1 70%';
        
        // Keep both viewports physically active in the DOM for live real-time split sync
        if (svg) svg.style.display = 'block';
        if (container3D) container3D.style.display = 'block';
        
        // Show 3D HUD controls because 3D is now wide enough (70%)
        if (navPad) navPad.style.display = 'flex'; 
        if (presControls) presControls.style.display = 'flex';
        
        if (!scene3D) init3D();
        generate3DModel();
    } else {
        // --- TURN ON 2D PRIMARY FOCUS (70% Left / 30% Right) ---
        if (leftSide) leftSide.style.flex = '0 0 70%';
        if (rightSide) rightSide.style.flex = '1 1 30%';
        
        // Keep both active in the DOM so you can watch them simultaneously
        if (svg) svg.style.display = 'block';
        if (container3D) container3D.style.display = 'block';
        
        // Hide 3D HUD controls because the right panel is now the minor display (30%)
        if (navPad) navPad.style.display = 'none'; 
        if (presControls) presControls.style.display = 'none';
        
        // 🌟 FIXED SCENARIO 2: Safely exit Drone mode if user clicks "2D PLAN" while flying
        if (typeof fpsControls !== 'undefined' && fpsControls.isLocked) {
            fpsControls.unlock();
        }
    }

    // 🌟 BUTTER-SMOOTH TRANSITION SYNC
    // Forces WebGL to continually capture layout width updates over 400ms while CSS is sliding
    let frames = 0;
    const resizeInterval = setInterval(() => {
        window.dispatchEvent(new Event('resize'));
        frames++;
        if (frames > 25) clearInterval(resizeInterval);
    }, 16);
}

// Map the old global window routing to use your customized method seamlessly
window.setWorkspaceLayout = function(mode) {
    toggle3D(mode);
};

function init3D() {
    const container = document.getElementById('three-container');
    
    // 1. Setup Scene & Camera (Theme-Aware)
    const isClassic = document.body.classList.contains('classic-theme');
    const bgColor = isClassic ? 0xe2e8f0 : 0x0f172a;
    
    scene3D = new THREE.Scene();
    scene3D.background = new THREE.Color(bgColor); 
    scene3D.fog = new THREE.FogExp2(bgColor, 0.0005);
    
    camera3D = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 1, 10000);
    camera3D.position.set(500, 800, 1000); 

    renderer3D = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer3D.setPixelRatio(window.devicePixelRatio); 
    renderer3D.setSize(container.clientWidth, container.clientHeight);
    renderer3D.shadowMap.enabled = true; 
    renderer3D.shadowMap.type = THREE.PCFSoftShadowMap; 
    renderer3D.outputEncoding = THREE.sRGBEncoding; 
    container.appendChild(renderer3D.domElement);

    controls3D = new THREE.OrbitControls(camera3D, renderer3D.domElement);
    controls3D.enableDamping = true; 
    controls3D.dampingFactor = 0.05;
    controls3D.target.set(500, 0, 500);
    controls3D.maxPolarAngle = Math.PI / 2 - 0.05; 


    // 🌟 PHASE 3: Dynamic Global Lighting
    hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 0.6); // Sky color, Ground color, Intensity
    hemiLight.position.set(0, 200, 0);
    scene3D.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.castShadow = true;
    // High-res shadows
    sunLight.shadow.mapSize.width = 2048; 
    sunLight.shadow.mapSize.height = 2048;
    // Large shadow camera bounds to cover the whole building
    const d = 1500;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.far = 3000;
    
    scene3D.add(sunLight);
    
    // Soft ambient backup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3); 
    scene3D.add(ambientLight);

    // Initialize sun position to High Noon (12)
    if (typeof updateSunlight === 'function') updateSunlight(12);


    const gridHelper = new THREE.GridHelper(3000, 100, 0x334155, 0x1e293b);
    gridHelper.position.set(500, -1, 500); 
    scene3D.add(gridHelper);

    // FPS PHYSICS & COLLISION SETUP
    fpsControls = new THREE.PointerLockControls(camera3D, document.body);
    
    fpsControls.addEventListener('unlock', () => {
        isWalkthrough = false;
        controls3D.enabled = true; 
        document.getElementById('nav-pad').style.display = 'flex'; 
        
        const hint = document.getElementById('fly-hint');
        if(hint) hint.remove();

        // Kill momentum instantly when exiting drone mode
        moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };
    });

    scene3D.add(fpsControls.getObject());
    
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    let prevTime = performance.now();

    function animate() {
        requestAnimationFrame(animate);
        // if (!is3DMode) return;
        const time = performance.now();
        const delta = (time - prevTime) / 1000;

        if (isWalkthrough && fpsControls.isLocked) {
            velocity.x -= velocity.x * 10.0 * delta;
            velocity.y -= velocity.y * 10.0 * delta; 
            velocity.z -= velocity.z * 10.0 * delta;

            direction.z = Number(moveState.forward) - Number(moveState.backward);
            direction.x = Number(moveState.right) - Number(moveState.left);
            direction.y = Number(moveState.up) - Number(moveState.down);
            direction.normalize();

            const speedMultiplier = 600.0;
            if (moveState.forward || moveState.backward) velocity.z -= direction.z * speedMultiplier * delta;
            if (moveState.left || moveState.right) velocity.x -= direction.x * speedMultiplier * delta;
            if (moveState.up || moveState.down) velocity.y -= direction.y * speedMultiplier * delta;

            const controlObj = fpsControls.getObject();
            
            controlObj.translateX(velocity.x * delta);
            controlObj.translateZ(velocity.z * delta);
            controlObj.position.y += (velocity.y * delta);

            const camBox = new THREE.Box3().setFromCenterAndSize(controlObj.position, new THREE.Vector3(15, 60, 15));
            let isColliding = false;

            if (buildingGroup) {
                buildingGroup.children.forEach(mesh => {
                    if (mesh.geometry && mesh.geometry.type === 'BoxGeometry' && mesh.position.y > 10) {
                        const wallBox = new THREE.Box3().setFromObject(mesh);
                        if (camBox.intersectsBox(wallBox)) isColliding = true;
                    }
                });
            }

            if (isColliding) {
                controlObj.translateX(-velocity.x * delta);
                controlObj.translateZ(-velocity.z * delta);
                velocity.x = 0;
                velocity.z = 0;
            }

            const scaleInput = document.getElementById('scaleInput');
            const SCALE = scaleInput ? parseFloat(scaleInput.value) || 1.2 : 1.2;
            if (controlObj.position.y < 20 * SCALE) {
                controlObj.position.y = 20 * SCALE;
            }

        } else {
            controls3D.update(); 
        }
        // 🌟 NEW: Update the Laser Measure before drawing the frame!
        if (typeof updateLaserMeasure === 'function') updateLaserMeasure();

        renderer3D.render(scene3D, camera3D);
        prevTime = time;
    }
    animate();

    window.addEventListener('resize', () => {
        if (!is3DMode) return;
        camera3D.aspect = container.clientWidth / container.clientHeight;
        camera3D.updateProjectionMatrix();
        renderer3D.setSize(container.clientWidth, container.clientHeight);
    });
}