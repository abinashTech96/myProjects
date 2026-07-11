// =========================================
// 3D ENGINE & WALKTHROUGH (engine3d.js)
// =========================================

let is3DMode = false;
let scene3D, camera3D, renderer3D, controls3D;
let buildingGroup;
// Phase 3 Variables
let sunLight, hemiLight;
let waypoints = [];
let isPlayingTour = false;

// --- FPS WALKTHROUGH STATE ---
let fpsControls;
let isWalkthrough = false;
let moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };




// =========================================
// REAL-3D TEXTURE MANAGER
// =========================================
const texLoader = new THREE.TextureLoader();

// Helper to load and tile a texture so it looks realistic
function loadRepeatTex(url, scale) {
    const tex = texLoader.load(url);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(scale, scale);
    return tex;
}

// 📸 HIGH-DEF PRINTS (Only loads when Real3D is ON)
const HD_TEXTURES = {
    'wood': new THREE.MeshStandardMaterial({ map: loadRepeatTex('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/hardwood2_diffuse.jpg', 4), roughness: 0.6 }),
    'grass': new THREE.MeshStandardMaterial({ map: loadRepeatTex('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/grasslight-big.jpg', 8), roughness: 1.0 }),
    'kitchen-tile': new THREE.MeshStandardMaterial({ map: loadRepeatTex('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/floors/FloorsCheckerboard_S_Diffuse.jpg', 8), roughness: 0.1 }),
    'bathroom-tile': new THREE.MeshStandardMaterial({ color: 0xe0e7ff, roughness: 0.1 }), // Fallback shiny blue
    'concrete': new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 })
};

// ⚡ FAST FLAT COLORS (Default 3D Mode)
const FAST_COLORS = {
    'wood': new THREE.MeshStandardMaterial({ color: 0x8b5a2b }),
    'grass': new THREE.MeshStandardMaterial({ color: 0x228b22 }), // Flat Green
    'kitchen-tile': new THREE.MeshStandardMaterial({ color: 0xffffff }),
    'bathroom-tile': new THREE.MeshStandardMaterial({ color: 0xbae6fd }),
    'concrete': new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
};

// 🧠 THE DECISION MAKER
function getFloorMaterial(texType) {
    // Check if the user has the Real3D checkbox toggled ON
    const real3DCheckbox = document.getElementById('real3DToggle');
    const isReal3D = real3DCheckbox ? real3DCheckbox.checked : false;
    
    if (isReal3D && HD_TEXTURES[texType]) {
        return HD_TEXTURES[texType]; // Return the photographic print
    }
    // Otherwise, return the fast-loading flat color
    return FAST_COLORS[texType] || FAST_COLORS['concrete'];
}


// 🌟 1. MEMORY MANAGEMENT UTILITY
function disposeScene() {
    if (!buildingGroup) return;
    
    // Traverse every object in the building and delete it from the GPU
    buildingGroup.traverse((object) => {
        if (object.isMesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(mat => mat.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }
    });

    // Remove the old group and create a fresh one
    scene3D.remove(buildingGroup);
    buildingGroup = new THREE.Group();
    scene3D.add(buildingGroup);
}


// --- 3D RAYCASTER STATE & SELECTION ---
let isRaycasterActive = false;
const raycaster = new THREE.Raycaster();
const mouse3D = new THREE.Vector2();

// =========================================
// 🌟 NEW: LIVE 3D LASER MEASURE TOOL
// =========================================
let laserActive = false;
let laserLine = null;
let laserHUD = null;
let crosshairHUD = null;

window.toggleLaserMeasure = function() {
    laserActive = !laserActive;

    // 🌟 Update the UI Button colors
    const btn = document.getElementById('btn-laser');
    if (btn) {
        const textSpan = btn.querySelector('.text');
        if (laserActive) {
            if (textSpan) textSpan.innerHTML = 'LASER: ON';
            btn.style.background = '#0ea5e9';
            btn.style.color = '#0f172a';
        } else {
            if (textSpan) textSpan.innerHTML = 'LASER: OFF';
            btn.style.background = 'rgba(15, 23, 42, 0.85)';
            btn.style.color = '#0ea5e9';
        }
    }
    
    // Create UI elements dynamically if they don't exist
    if (!laserHUD) {
        laserHUD = document.createElement('div');
        laserHUD.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(20px, -20px); background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); border:1px solid #0ea5e9; color:#0ea5e9; padding:8px 12px; border-radius:8px; font-family:monospace; font-size:1.1rem; font-weight:bold; z-index:10000; pointer-events:none; box-shadow:0 0 15px rgba(14,165,233,0.4);';
        document.body.appendChild(laserHUD);
        
        crosshairHUD = document.createElement('div');
        crosshairHUD.innerHTML = '⌖';
        crosshairHUD.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); color:#0ea5e9; font-size:1.8rem; font-weight:100; z-index:10000; pointer-events:none; text-shadow:0 0 10px #0ea5e9;';
        document.body.appendChild(crosshairHUD);
    }
    
    laserHUD.style.display = laserActive ? 'block' : 'none';
    crosshairHUD.style.display = laserActive ? 'block' : 'none';
    
    if (!laserActive && laserLine) {
        scene3D.remove(laserLine);
        laserLine = null;
    }
};

function updateLaserMeasure() {
    if (!laserActive || !camera3D || !scene3D || !buildingGroup) return;
    
    // Shoot ray directly from the center of the camera view
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera3D);
    
    // Intersect against the entire building group
    const intersects = raycaster.intersectObjects(buildingGroup.children, true);
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        const dist = hit.distance;
        
        // Convert Three.js units to Real World Feet/Inches
        const scaleInput = document.getElementById('scaleInput');
        const SCALE = scaleInput ? parseFloat(scaleInput.value) || 1.2 : 1.2;
        const totalInches = dist / SCALE;
        const ft = Math.floor(totalInches / 12);
        const inchRem = Math.round(totalInches % 12);
        
        laserHUD.innerHTML = `📏 ${ft}' ${inchRem}"`;
        
        // Draw Neon Beam Line
        if (!laserLine) {
            const mat = new THREE.LineBasicMaterial({ color: 0x0ea5e9, linewidth: 2, transparent: true, opacity: 0.8 });
            const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
            laserLine = new THREE.Line(geo, mat);
            scene3D.add(laserLine);
        }
        
        const positions = laserLine.geometry.attributes.position.array;
        const camPos = new THREE.Vector3();
        camera3D.getWorldPosition(camPos);
        
        // Push start point slightly ahead of camera so it doesn't clip into the lens
        const startPos = camPos.clone().add(raycaster.ray.direction.clone().multiplyScalar(5));
        
        positions[0] = startPos.x; positions[1] = startPos.y; positions[2] = startPos.z;
        positions[3] = hit.point.x; positions[4] = hit.point.y; positions[5] = hit.point.z;
        laserLine.geometry.attributes.position.needsUpdate = true;
    } else {
        laserHUD.innerHTML = `📏 --' --"`;
        if (laserLine) { scene3D.remove(laserLine); laserLine = null; }
    }
}
// =========================================
// 🌟 NEW: LIVE 3D LASER MEASURE TOOL
// =========================================

// --- 🌟 NEW: 3D PERFORMANCE DEBOUNCER ---
let render3DTimeout = null;
function request3DUpdate() {
    if (!is3DMode) return;
    
    // Clear the previous timeout if the user is still typing/sliding
    if (render3DTimeout) clearTimeout(render3DTimeout);
    
    // Wait exactly 50ms after the last input before rebuilding the 3D scene
    render3DTimeout = setTimeout(() => {
        if (typeof generate3DModel === 'function') generate3DModel();
    }, 50); 
}

// =========================================
// CORE 3D TOGGLE & INIT
// =========================================
function toggle3D() {
    is3DMode = !is3DMode;
    const svg = document.getElementById('blueprint');
    const container3D = document.getElementById('three-container');
    const navPad = document.getElementById('nav-pad'); 

    document.getElementById('mode-2d').className = is3DMode ? 'switch-btn' : 'switch-btn active';
    document.getElementById('mode-3d').className = is3DMode ? 'switch-btn active' : 'switch-btn';

    if (is3DMode) {
        // Turn ON 3D, Turn OFF 2D
        document.getElementById('mode-3d').classList.add('active');
        document.getElementById('mode-2d').classList.remove('active');
        svg.style.display = 'none';
        container3D.style.display = 'block';
        if (navPad) navPad.style.display = 'flex'; 
        
        if (!scene3D) init3D();
        generate3DModel();
    } else {
        // Turn ON 2D, Turn OFF 3D
        document.getElementById('mode-2d').classList.add('active');
        document.getElementById('mode-3d').classList.remove('active');
        svg.style.display = 'block';
        container3D.style.display = 'none';
        if (navPad) navPad.style.display = 'none'; 
        // 🌟 FIXED SCENARIO 2: Safely exit Drone mode if user clicks "2D PLAN" while flying
        if (typeof fpsControls !== 'undefined' && fpsControls.isLocked) {
            fpsControls.unlock();
        }
    }

    // 🌟 FIXED SCENARIO 5 & 6: Make controls visible whenever 3D mode is active
    const presControls = document.getElementById('presentation-controls');
    if (presControls) {
        presControls.style.display = is3DMode ? 'flex' : 'none';
    }
}

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
        // 🛑 STOP: Don't calculate 3D rendering or physics if we are in 2D mode
        if (!is3DMode) return;
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

// =========================================
// 3D GEOMETRY GENERATOR (Modularized)
// =========================================
function generate3DModel() {
    const real3DToggle = document.getElementById('real3DToggle');
    const useReal3D = real3DToggle ? real3DToggle.checked : false;

    // 🌟 MEMORY DISPOSAL
    if (!buildingGroup) {
        buildingGroup = new THREE.Group();
        scene3D.add(buildingGroup);
    } else {
        disposeScene(); 
    }

    // 🌟 REFACTORED: Call the helper method in one line!
    const { SCALE, unit, inW, inH, I, WALL_HEIGHT } = get3DEnvironmentParams();

    // 🌟 MODULAR BUILDERS (Roof safely removed)
    build3DRooms(SCALE, I, WALL_HEIGHT, useReal3D);
    build3DSlabs(SCALE, I, WALL_HEIGHT, useReal3D); // Still includes the Parapet!
    build3DFixtures(SCALE, I, WALL_HEIGHT, useReal3D);
    build3DBoundaries(SCALE, unit, I, inW, inH);

    // 🌟 THE FIX: Actually call the roof builder!
    build3DRoof(SCALE, I, WALL_HEIGHT);

    scene3D.add(buildingGroup);
}

// --- HELPER 1: BUILD ROOMS (No Bases, Isolated Living Room) ---
function build3DRooms(SCALE, I, WALL_HEIGHT, useReal3D) {
    // 1. Generate Rooms
    elements.forEach((el, i) => { 
        const width = el.w * SCALE;
        const depth = el.h * SCALE; 
        
        const centerX = I.x + (el.x * SCALE) + (width / 2);
        const centerZ = I.z + (el.y * SCALE) + (depth / 2);
        const centerY = (el.floor * WALL_HEIGHT) + (WALL_HEIGHT / 2);

        const smartMergeToggle = document.getElementById('smartMergeToggle');
        const smartMerge = smartMergeToggle && smartMergeToggle.checked;
        
        // 🌟 THE FIX: Skip furniture entirely and use your global collision logic!
        let isColliding = false;
        if (!smartMerge && !el.isFurniture) {
            isColliding = typeof checkCollision === 'function' ? checkCollision(el, i) : false;
        }

        let roomColor = isColliding ? 0xef4444 : (ARCH_CONFIG?.COLORS[el.type]?.hex || 0xffffff);
        if (!isColliding && el.customColor) {
            roomColor = parseInt(el.customColor.replace('#', '0x'));
        }

        let mesh; 

        // --- FURNITURE ---
        if (el.isFurniture) {
            mesh = createFurniture3D(el.type, width, depth);
            mesh.position.set(centerX, el.floor * WALL_HEIGHT, centerZ); 
        }
        
        // --- STAIRCASES ---
        else if (el.type === 'staircase') {
            const direction = el.dir || 'up'; 
            const style = el.stairStyle || 'u-shape'; // 🌟 Read user preference
            
            let run = depth, extWidth = width;
            if (direction === 'left' || direction === 'right') { run = width; extWidth = depth; }

            const matColor = isColliding ? 0xef4444 : 0x9ca3af;
            const mat = new THREE.MeshStandardMaterial({ color: matColor, transparent: true, opacity: isColliding ? 0.95 : 1.0 });

            // 🌟 Route to the correct Parametric Builder
            if (style === 'straight') {
                mesh = createStraightStaircaseGroup(run, WALL_HEIGHT, extWidth, mat);
            } else if (style === 'l-shape') {
                mesh = createLShapedGroup(run, WALL_HEIGHT, extWidth, mat);
            } else {
                mesh = createUShapedGroup(run, WALL_HEIGHT, extWidth, mat); 
            }
            
            const startX = I.x + (el.x * SCALE);
            const startZ = I.z + (el.y * SCALE);
            const baseY = el.floor * WALL_HEIGHT;
            
            switch(direction) {
                case 'right': mesh.rotation.y = 0; mesh.position.set(startX, baseY, startZ); break;
                case 'left':  mesh.rotation.y = Math.PI; mesh.position.set(startX + width, baseY, startZ + depth); break;
                case 'up':    mesh.rotation.y = Math.PI / 2; mesh.position.set(startX, baseY, startZ + depth); break;
                case 'down':  mesh.rotation.y = -Math.PI / 2; mesh.position.set(startX + width, baseY, startZ); break;
            }
        }
        
        // --- BALCONY ---
        else if (el.type === 'balcony' && useReal3D && !isColliding) {
            mesh = new THREE.Group();
            
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
            const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMat);
            floor.rotation.x = -Math.PI / 2;
            mesh.add(floor);
            
            const railMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
            const railH = 30 * SCALE;
            const thickness = 4 * SCALE;
            
            const rails = [
                { w: width, h: railH, d: thickness, x: 0, z: -depth/2 },
                { w: width, h: railH, d: thickness, x: 0, z: depth/2 },
                { w: thickness, h: railH, d: depth, x: width/2, z: 0 },
                { w: thickness, h: railH, d: depth, x: -width/2, z: 0 }
            ];
            rails.forEach(r => {
                const rail = new THREE.Mesh(new THREE.BoxGeometry(r.w, r.h, r.d), railMat);
                rail.position.set(r.x, railH/2, r.z);
                mesh.add(rail);
            });

            const glassMat = new THREE.MeshStandardMaterial({ color: 0x98d8c8, transparent: true, opacity: 0.25, side: THREE.DoubleSide, roughness: 0.1, metalness: 0.1 });
            const glassH = (WALL_HEIGHT - railH);
            
            const glassPanes = [
                { w: width, h: glassH, d: 2, x: 0, z: -depth/2 },
                { w: width, h: glassH, d: 2, x: 0, z: depth/2 },
                { w: 2, h: glassH, d: depth, x: width/2, z: 0 },
                { w: 2, h: glassH, d: depth, x: -width/2, z: 0 }
            ];
            glassPanes.forEach(p => {
                const glass = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), glassMat);
                glass.position.set(p.x, railH + (glassH/2), p.z);
                mesh.add(glass);
            });

            mesh.position.set(centerX, (el.floor * WALL_HEIGHT) + 2, centerZ);

            if (showBalconyExtras) {
                const chair1 = createBalconyChair();
                chair1.position.set(-width/4, 0, 0); chair1.rotation.y = Math.PI / 4; mesh.add(chair1);
                const chair2 = createBalconyChair();
                chair2.position.set(width/4, 0, 0); chair2.rotation.y = -Math.PI / 4; mesh.add(chair2);
                const plant = createBalconyPlant();
                plant.position.set(0, 0, -depth/4 + 5); mesh.add(plant);
            }
        }

        else if (el.type === 'living' && useReal3D && !isColliding) {
            mesh = new THREE.Group();
            
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
            const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMat);
            floor.rotation.x = -Math.PI / 2;
            mesh.add(floor);
            
            // 3. 🌟 UPDATED: Glass now spans full height
            const glassMat = new THREE.MeshStandardMaterial({ 
                color: 0xd898a8, transparent: true, opacity: 0.25, side: THREE.DoubleSide, roughness: 0.1, metalness: 0.1 
            });
            
            // Full height instead of (WALL_HEIGHT - railH)
            const glassH = WALL_HEIGHT;

            const glassPanes = [
                { w: width, h: glassH, d: 2, x: 0, z: -depth/2 },
                { w: width, h: glassH, d: 2, x: 0, z: depth/2 },
                { w: 2, h: glassH, d: depth, x: width/2, z: 0 },
                { w: 2, h: glassH, d: depth, x: -width/2, z: 0 }
            ];
            glassPanes.forEach(p => {
                const glass = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), glassMat);
                // 🌟 UPDATED: Position at exactly half height (centered on the wall)
                glass.position.set(p.x, glassH / 2, p.z);
                mesh.add(glass);
            });
            
            mesh.position.set(centerX, (el.floor * WALL_HEIGHT) + 2, centerZ);
        }

        
        // 🌟 NEW: ISOLATED LIVING ROOM (With HD Floor Support)
        else if (el.type === 'living2' && useReal3D && !isColliding) {
            mesh = new THREE.Group();
            // 🌟 REFACTORED: Dynamic Wall Thickness
            const t = ARCH_CONFIG.DEFAULTS.WALL_THICKNESS_3D * SCALE;
            
            const texType = getTextureForRoom(el);

            // --- 1. WALLS (Keep your procedural textures for the walls) ---
            const baseTexture = getProceduralTexture(texType);
            const roomTex = baseTexture.clone();
            roomTex.needsUpdate = true;
            roomTex.repeat.set(width / 60, depth / 60); 

            const wallMaterial = new THREE.MeshStandardMaterial({ map: roomTex, color: 0xffffff, opacity: 1.0, transparent: true, roughness: 0.8 });
            
            const wN = new THREE.Mesh(new THREE.BoxGeometry(width, WALL_HEIGHT, t), wallMaterial);
            wN.position.set(0, WALL_HEIGHT/2, -depth/2 + t/2); wN.castShadow = true; wN.receiveShadow = true;
            
            const wS = new THREE.Mesh(new THREE.BoxGeometry(width, WALL_HEIGHT, t), wallMaterial);
            wS.position.set(0, WALL_HEIGHT/2, depth/2 - t/2); wS.castShadow = true; wS.receiveShadow = true;
            
            const wE = new THREE.Mesh(new THREE.BoxGeometry(t, WALL_HEIGHT, depth - t*2), wallMaterial);
            wE.position.set(width/2 - t/2, WALL_HEIGHT/2, 0); wE.castShadow = true; wE.receiveShadow = true;
            
            const wW = new THREE.Mesh(new THREE.BoxGeometry(t, WALL_HEIGHT, depth - t*2), wallMaterial);
            wW.position.set(-width/2 + t/2, WALL_HEIGHT/2, 0); wW.castShadow = true; wW.receiveShadow = true;
            
            // --- 2. FLOOR (Generate the floor using our new HD Material logic) ---
            const floorMaterial = getFloorMaterial(texType); 
            // Create a flat box for the floor (2 units thick)
            const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(width, 2, depth), floorMaterial);
            floorMesh.position.set(0, 1, 0); // Rest it on the ground
            floorMesh.receiveShadow = true;

            // Add the walls AND the floor to the room group!
            mesh.add(wN, wS, wE, wW, floorMesh); 
            mesh.position.set(centerX, el.floor * WALL_HEIGHT, centerZ);
        }
        
        // --- ALL OTHER STANDARD ROOMS (Blank Base) ---
        else {
            mesh = new THREE.Group();
            const t = 4 * SCALE; 
            
            let materialProps = { color: roomColor, transparent: true, opacity: isColliding ? 0.95 : 0.85 };
            
            if (useReal3D && !isColliding) {
                const texType = getTextureForRoom(el.type);
                const baseTexture = getProceduralTexture(texType);
                const roomTex = baseTexture.clone();
                roomTex.needsUpdate = true;
                roomTex.repeat.set(width / 60, depth / 60); 

                materialProps.map = roomTex;
                materialProps.color = 0xffffff;
                materialProps.opacity = 1.0;
                materialProps.roughness = texType === 'tile' ? 0.2 : 0.8;
            }

            const material = new THREE.MeshStandardMaterial(materialProps);
            
            if (useReal3D && !isColliding) {
                const wN = new THREE.Mesh(new THREE.BoxGeometry(width, WALL_HEIGHT, t), material);
                wN.position.set(0, WALL_HEIGHT/2, -depth/2 + t/2); wN.castShadow = true; wN.receiveShadow = true;
                
                const wS = new THREE.Mesh(new THREE.BoxGeometry(width, WALL_HEIGHT, t), material);
                wS.position.set(0, WALL_HEIGHT/2, depth/2 - t/2); wS.castShadow = true; wS.receiveShadow = true;
                
                const wE = new THREE.Mesh(new THREE.BoxGeometry(t, WALL_HEIGHT, depth - t*2), material);
                wE.position.set(width/2 - t/2, WALL_HEIGHT/2, 0); wE.castShadow = true; wE.receiveShadow = true;
                
                const wW = new THREE.Mesh(new THREE.BoxGeometry(t, WALL_HEIGHT, depth - t*2), material);
                wW.position.set(-width/2 + t/2, WALL_HEIGHT/2, 0); wW.castShadow = true; wW.receiveShadow = true;
                
                // Note: No floor mesh added here!
                mesh.add(wN, wS, wE, wW);
            } else {
                const solid = new THREE.Mesh(new THREE.BoxGeometry(width, WALL_HEIGHT, depth), material);
                solid.position.y = WALL_HEIGHT/2;
                const edges = new THREE.EdgesGeometry(solid.geometry);
                const edgeColor = isColliding ? 0x991b1b : 0xffffff;
                const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 2 }));
                solid.add(line);
                mesh.add(solid);
            }
            
            mesh.position.set(centerX, el.floor * WALL_HEIGHT, centerZ);
        }

        if (mesh.type === 'Group') {
            mesh.traverse(child => {
                if (child.isMesh) {
                    child.userData = { roomIndex: i, isRoom: true };
                }
            });
        } else {
            mesh.userData = { roomIndex: i, isRoom: true };
        }
        
        buildingGroup.add(mesh);
    });
}

// --- HELPER 2: BUILD SLABS (All Shingles, Top Parapet) ---
function build3DSlabs(SCALE, I, WALL_HEIGHT, useReal3D) {
    const floors = elements.map(e => e.floor);
    const maxFloor = floors.length > 0 ? Math.max(...floors) : 0;
    
    // 🌟 REFACTORED: Get dimensions and center points from helper
    const { inW, inH, CX, CY } = get3DEnvironmentParams();

    for (let f = 0; f <= maxFloor; f++) {
        const slabY = ((f + 1) * WALL_HEIGHT);
        const slabGeometry = new THREE.BoxGeometry(inW, 10 * SCALE, inH);
        
        let slabMaterial;
        if (useReal3D) {
            const slabTex = getProceduralTexture('shingle').clone();
            slabTex.wrapS = THREE.RepeatWrapping;
            slabTex.wrapT = THREE.RepeatWrapping;
            slabTex.needsUpdate = true;
            
            const textureScale = 60; 
            slabTex.repeat.set(inW / textureScale, inH / textureScale); 
            slabMaterial = new THREE.MeshStandardMaterial({ map: slabTex, color: 0xffffff, roughness: 0.9 });
        } else {
            slabMaterial = new THREE.MeshStandardMaterial({ color: 0x8a4b43 });
        }

        const slab = new THREE.Mesh(slabGeometry, slabMaterial);
        slab.castShadow = true; 
        slab.receiveShadow = true;
        
        slab.position.set(CX, slabY, CY); 
        buildingGroup.add(slab);

        // 🌟 PARAPET: Safely locked to ONLY the maxFloor (Top Roof)
        if (f === maxFloor) {
            const parapetH = 36 * SCALE; 
            const t = 6 * SCALE;         
            
            let pMat;
            if (useReal3D) {
                const pTex = getProceduralTexture('concrete').clone();
                pTex.needsUpdate = true;
                pTex.repeat.set(inW / 100, parapetH / 100);
                pMat = new THREE.MeshStandardMaterial({ map: pTex, color: 0xffffff, roughness: 0.9 });
            } else {
                pMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
            }

            // 🌟 REFACTORED: Replaced all '500's with CX and CY
            const pN = new THREE.Mesh(new THREE.BoxGeometry(inW, parapetH, t), pMat);
            pN.position.set(CX, slabY + (parapetH / 2), CY - (inH / 2) + (t / 2));
            
            const pS = new THREE.Mesh(new THREE.BoxGeometry(inW, parapetH, t), pMat);
            pS.position.set(CX, slabY + (parapetH / 2), CY + (inH / 2) - (t / 2));

            const pE = new THREE.Mesh(new THREE.BoxGeometry(t, parapetH, inH - t * 2), pMat);
            pE.position.set(CX + (inW / 2) - (t / 2), slabY + (parapetH / 2), CY);
            
            const pW = new THREE.Mesh(new THREE.BoxGeometry(t, parapetH, inH - t * 2), pMat);
            pW.position.set(CX - (inW / 2) + (t / 2), slabY + (parapetH / 2), CY);

            [pN, pS, pE, pW].forEach(wall => {
                wall.castShadow = true;
                wall.receiveShadow = true;
                buildingGroup.add(wall);
            });
        }
    }
}

// --- HELPER 3: BUILD FIXTURES ---
function build3DFixtures(SCALE, I, WALL_HEIGHT, useReal3D) {
    fixtures.forEach(fix => {
        const el = elements[fix.roomId];
        if (!el || el.floor !== currentFloor) return;

        const isDoor = fix.type === 'door';
        const width = fix.size * SCALE;
        const height = isDoor ? (80 * SCALE) : (40 * SCALE);
        const depth = 8 * SCALE; 
        
        const group = new THREE.Group();
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });    

        const ft = 3 * SCALE; 
        const isHoriz = (fix.edge === 'top' || fix.edge === 'bottom');
        const fw = isHoriz ? width : depth;
        const fd = isHoriz ? depth : width;

        if (isHoriz) {
            const fL = new THREE.Mesh(new THREE.BoxGeometry(ft, height, fd), frameMat); fL.position.set(-fw/2 + ft/2, 0, 0);
            const fR = new THREE.Mesh(new THREE.BoxGeometry(ft, height, fd), frameMat); fR.position.set(fw/2 - ft/2, 0, 0);
            const fT = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, fd), frameMat); fT.position.set(0, height/2 - ft/2, 0);
            group.add(fL, fR, fT);
            if (!isDoor) { const fB = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, fd), frameMat); fB.position.set(0, -height/2 + ft/2, 0); group.add(fB); }
            
            const pW = fw - (ft * 2);
            const pH = isDoor ? height - ft : height - (ft * 2);
            const panel = new THREE.Mesh(new THREE.BoxGeometry(pW, pH, 2 * SCALE), panelMat);
            panel.position.set(0, isDoor ? -ft/2 : 0, 0);
            
            if (isDoor && useReal3D) { panel.position.set(-pW/2 + ft, -ft/2, -pW/2); panel.rotation.y = Math.PI / 3; }
            group.add(panel);
        } else {
            const fN = new THREE.Mesh(new THREE.BoxGeometry(fw, height, ft), frameMat); fN.position.set(0, 0, -fd/2 + ft/2);
            const fS = new THREE.Mesh(new THREE.BoxGeometry(fw, height, ft), frameMat); fS.position.set(0, 0, fd/2 - ft/2);
            const fT = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, fd), frameMat); fT.position.set(0, height/2 - ft/2, 0);
            group.add(fN, fS, fT);
            if (!isDoor) { const fB = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, fd), frameMat); fB.position.set(0, -height/2 + ft/2, 0); group.add(fB); }
            
            const pD = fd - (ft * 2);
            const pH = isDoor ? height - ft : height - (ft * 2);
            const panel = new THREE.Mesh(new THREE.BoxGeometry(2 * SCALE, pH, pD), panelMat);
            panel.position.set(0, isDoor ? -ft/2 : 0, 0);
            
            if (isDoor && useReal3D) { panel.position.set(pD/2, -ft/2, -pD/2 + ft); panel.rotation.y = Math.PI / 3; }
            group.add(panel);
        }

        const yPos = (el.floor * WALL_HEIGHT) + (height / 2) + (isDoor ? 0 : 40 * SCALE);
        let xPos = I.x + (el.x * SCALE);
        let zPos = I.z + (el.y * SCALE);

        if (fix.edge === 'bottom') { zPos = I.z + (el.y + el.h) * SCALE; xPos = I.x + (el.x + fix.offset) * SCALE; }
        else if (fix.edge === 'top') { zPos = I.z + (el.y * SCALE); xPos = I.x + (el.x + fix.offset) * SCALE; }
        else if (fix.edge === 'left') { xPos = I.x + (el.x * SCALE); zPos = I.z + (el.y + fix.offset) * SCALE; }
        else if (fix.edge === 'right') { xPos = I.x + (el.x + el.w) * SCALE; zPos = I.z + (el.y + fix.offset) * SCALE; }

        group.position.set(xPos, yPos, zPos);
        buildingGroup.add(group);
    });
}

// --- HELPER 4: BUILD BOUNDARIES ---
function build3DBoundaries(SCALE, unit, I, inW, inH) {
    const toInches3D = (val, u) => u === 'cm' ? parseFloat(val) / 2.54 : parseFloat(val);
    const val = (id) => toInches3D(document.getElementById(id)?.value || 0, unit) * SCALE;
    
    const plotA = { x: I.x - val('aL'), z: I.z - val('aU') };
    const plotB = { x: I.x + inW + val('bR'), z: I.z - val('bU') };
    const plotC = { x: I.x + inW + val('cR'), z: I.z + inH + val('cD') };
    const plotD = { x: I.x - val('dL'), z: I.z + inH + val('dD') };

    const plotGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(plotA.x, 0, plotA.z), new THREE.Vector3(plotB.x, 0, plotB.z),
        new THREE.Vector3(plotC.x, 0, plotC.z), new THREE.Vector3(plotD.x, 0, plotD.z)
    ]);
    const plotLine = new THREE.LineLoop(plotGeom, new THREE.LineBasicMaterial({ color: 0xff4d4d }));
    buildingGroup.add(plotLine);

    const buildGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(I.x, 0.5, I.z), new THREE.Vector3(I.x + inW, 0.5, I.z),
        new THREE.Vector3(I.x + inW, 0.5, I.z + inH), new THREE.Vector3(I.x, 0.5, I.z + inH)
    ]);
    const buildLine = new THREE.LineLoop(buildGeom, new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
    buildingGroup.add(buildLine);
}

// --- HELPER 5: PROCEDURAL AUTO-ROOFING ENGINE ---
function build3DRoof(SCALE, I, WALL_HEIGHT) {
    let maxFloor = -1;
    
    // Find the highest floor level
    elements.forEach(el => {
        if (!el.isFurniture && el.floor > maxFloor) maxFloor = el.floor;
    });

    if (maxFloor < 0) return;

    // Calculate the exact bounding footprint of the top floor
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    
    elements.forEach(el => {
        if (!el.isFurniture && el.floor === maxFloor) {
            const rx = el.x * SCALE;
            const rz = el.y * SCALE;
            const rw = el.w * SCALE;
            const rd = el.h * SCALE;
            
            if (rx < minX) minX = rx;
            if (rz < minZ) minZ = rz;
            if (rx + rw > maxX) maxX = rx + rw;
            if (rz + rd > maxZ) maxZ = rz + rd;
        }
    });

    if (maxX === -Infinity) return;

    // Base Math & Overhangs
    const overhang = 18 * SCALE; 
    const w = (maxX - minX) + (overhang * 2);
    const d = (maxZ - minZ) + (overhang * 2);
    const h = 72 * SCALE; 
    const parapetH = 36 * SCALE; 
    
    const centerX = minX + ((maxX - minX) / 2) + I.x;
    const centerZ = minZ + ((maxZ - minZ) / 2) + I.z;
    
    // Lift roof to sit exactly on top of the parapet/slab
    const baseY = ((maxFloor + 1) * WALL_HEIGHT) + parapetH - (2 * SCALE);

    const roofStyle = document.getElementById('roofStyleSelect')?.value || 'hip';
    
    // Apply realistic Shingle Texture if Real3D is active, else flat color
    const real3DToggle = document.getElementById('real3DToggle');
    let roofMat;
    
    if (real3DToggle && real3DToggle.checked && typeof getProceduralTexture === 'function') {
        const tex = getProceduralTexture('shingle').clone();
        tex.needsUpdate = true;
        tex.repeat.set(w / 60, d / 60);
        roofMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    } else {
        roofMat = new THREE.MeshStandardMaterial({ color: 0xa8412b, roughness: 0.9 });
    }

    let roofMesh;

    // 🔨 BUILD 1: FLAT ROOF
    if (roofStyle === 'flat') {
        const geom = new THREE.BoxGeometry(w - overhang, 8 * SCALE, d - overhang);
        roofMesh = new THREE.Mesh(geom, roofMat);
        roofMesh.position.set(centerX, baseY - parapetH + (4 * SCALE), centerZ);
    } 
    
    // 🔨 BUILD 2: GABLE ROOF (Triangular Prism)
    else if (roofStyle === 'gable') {
        const shape = new THREE.Shape();
        shape.moveTo(-w/2, 0);
        shape.lineTo(w/2, 0);
        shape.lineTo(0, h);
        shape.lineTo(-w/2, 0);

        const extrudeSettings = { depth: d, bevelEnabled: false };
        const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        roofMesh = new THREE.Mesh(geom, roofMat);
        
        // Extrude geometry draws along the Z axis, so we offset it by half depth
        roofMesh.position.set(centerX, baseY, centerZ - d/2);
    }
    
    // 🔨 BUILD 3: HIP ROOF (Complex Sloped Geometry)
    else {
        const geom = new THREE.BufferGeometry();
        const ridgeL = w * 0.4; // The top ridge is 40% of the total width
        
        // Counter-Clockwise Winding for perfect normals
        const vertices = new Float32Array([
            // Front Sloped Face
            -w/2, 0, d/2,   w/2, 0, d/2,    ridgeL/2, h, 0,
            -w/2, 0, d/2,   ridgeL/2, h, 0, -ridgeL/2, h, 0,
            // Back Sloped Face
            w/2, 0, -d/2,  -w/2, 0, -d/2,  -ridgeL/2, h, 0,
            w/2, 0, -d/2,  -ridgeL/2, h, 0, ridgeL/2, h, 0,
            // Left Triangle Face
            -w/2, 0, -d/2, -w/2, 0, d/2,   -ridgeL/2, h, 0,
            // Right Triangle Face
            w/2, 0, d/2,   w/2, 0, -d/2,   ridgeL/2, h, 0,
            // Flat Bottom Base
            -w/2, 0, d/2,  -w/2, 0, -d/2,  w/2, 0, -d/2,
            -w/2, 0, d/2,  w/2, 0, -d/2,   w/2, 0, d/2
        ]);
        
        geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geom.computeVertexNormals(); // Auto-calculate light bouncing
        
        roofMesh = new THREE.Mesh(geom, roofMat);
        roofMesh.position.set(centerX, baseY, centerZ);
    }

    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    roofMesh.userData = { isRoof: true };
    
    buildingGroup.add(roofMesh);
}

// =========================================
// 3D UTILITIES 
// =========================================
// 🌟 NEW: STRAIGHT STAIRCASE BUILDER
function createStraightStaircaseGroup(run, height, width, material) {
    const group = new THREE.Group();
    const steps = Math.round(height / 7.5); // 7.5 inch max riser
    const stepRun = run / steps;
    const stepH = height / steps;

    for(let i = 0; i < steps; i++) {
        const h = stepH * (i + 1);
        const geom = new THREE.BoxGeometry(stepRun, h, width);
        const step = new THREE.Mesh(geom, material);
        // Build staircase from the ground up along the run axis
        step.position.set(i * stepRun + stepRun / 2, h / 2, width / 2);
        step.castShadow = true; step.receiveShadow = true;
        group.add(step);
    }
    return group;
}

// 🌟 NEW: L-SHAPED STAIRCASE BUILDER
function createLShapedGroup(run, height, extWidth, material) {
    const group = new THREE.Group();
    
    // Divide the space into two flights and a square landing in the corner
    const landingSize = extWidth / 2; 
    const flightWidth = landingSize;
    
    const flight1Run = run - landingSize;
    const flight2Run = extWidth - landingSize;
    
    const halfH = height / 2;
    const stepsPerFlight = Math.round(halfH / 7.5); // Steps for half the height
    
    // --- FLIGHT 1 (Going up the run axis) ---
    const step1Run = flight1Run / stepsPerFlight;
    const stepH = halfH / stepsPerFlight;

    for(let i = 0; i < stepsPerFlight; i++) {
        const h = stepH * (i + 1);
        const geom = new THREE.BoxGeometry(step1Run, h, flightWidth);
        const step = new THREE.Mesh(geom, material);
        step.position.set(i * step1Run + step1Run / 2, h / 2, flightWidth / 2);
        step.castShadow = true; step.receiveShadow = true;
        group.add(step);
    }

    // --- CORNER LANDING ---
    const landGeom = new THREE.BoxGeometry(landingSize, halfH, landingSize);
    const landMesh = new THREE.Mesh(landGeom, material);
    landMesh.position.set(flight1Run + landingSize / 2, halfH / 2, flightWidth / 2);
    landMesh.castShadow = true; landMesh.receiveShadow = true;
    group.add(landMesh);

    // --- FLIGHT 2 (Rotated 90 degrees up the width axis) ---
    const step2Run = flight2Run / stepsPerFlight;
    for(let i = 0; i < stepsPerFlight; i++) {
        const h = halfH + stepH * (i + 1);
        const geom = new THREE.BoxGeometry(landingSize, h, step2Run);
        const step = new THREE.Mesh(geom, material);
        // Positioned next to the landing, iterating along the Z axis
        step.position.set(flight1Run + landingSize / 2, h / 2, flightWidth + (i * step2Run) + step2Run / 2);
        step.castShadow = true; step.receiveShadow = true;
        group.add(step);
    }

    return group;
}

function createUShapedGroup(run, height, extWidth, material) {
    const group = new THREE.Group();
    const halfW = extWidth / 2; 
    const landingDepth = Math.min(halfW, run * 0.4); 
    const flightRun = run - landingDepth;
    const halfH = height / 2;
    const steps = 10;
    const stepRun = flightRun / steps;
    const stepH = halfH / steps;

    for(let i = 0; i < steps; i++) {
        const h = stepH * (i + 1);
        const geom = new THREE.BoxGeometry(stepRun, h, halfW);
        const step = new THREE.Mesh(geom, material);
        step.position.set(i * stepRun + stepRun / 2, h / 2, halfW / 2);
        step.castShadow = true; step.receiveShadow = true;
        group.add(step);
    }

    const landGeom = new THREE.BoxGeometry(landingDepth, halfH, extWidth);
    const landMesh = new THREE.Mesh(landGeom, material);
    landMesh.position.set(flightRun + landingDepth / 2, halfH / 2, extWidth / 2);
    landMesh.castShadow = true; landMesh.receiveShadow = true;
    group.add(landMesh);

    for(let i = 0; i < steps; i++) {
        const h = halfH + stepH * (i + 1);
        const geom = new THREE.BoxGeometry(stepRun, h, halfW);
        const step = new THREE.Mesh(geom, material);
        step.position.set(flightRun - (i * stepRun) - stepRun / 2, h / 2, halfW + halfW / 2);
        step.castShadow = true; step.receiveShadow = true;
        group.add(step);
    }
    return group;
}

// 🌟 NEW: STRAIGHT STAIRCASE BUILDER
function createStraightStaircaseGroup(run, height, width, material) {
    const group = new THREE.Group();
    const steps = Math.max(1, Math.round(height / 7.5)); // 7.5 inch max riser
    const stepRun = run / steps;
    const stepH = height / steps;

    for(let i = 0; i < steps; i++) {
        const h = stepH * (i + 1);
        const geom = new THREE.BoxGeometry(stepRun, h, width);
        const step = new THREE.Mesh(geom, material);
        step.position.set(i * stepRun + stepRun / 2, h / 2, width / 2);
        step.castShadow = true; step.receiveShadow = true;
        group.add(step);
    }
    return group;
}

// 🌟 NEW: L-SHAPED STAIRCASE BUILDER
function createLShapedGroup(run, height, extWidth, material) {
    const group = new THREE.Group();
    
    const flightWidth = extWidth / 2; 
    const landingSize = flightWidth;
    
    const flight1Run = run - landingSize;
    const flight2Run = extWidth - landingSize; 
    
    const halfH = height / 2;
    const stepsPerFlight = Math.max(1, Math.round(halfH / 7.5)); 
    
    const step1Run = flight1Run / stepsPerFlight;
    const stepH = halfH / stepsPerFlight;

    // FLIGHT 1
    for(let i = 0; i < stepsPerFlight; i++) {
        const h = stepH * (i + 1);
        const geom = new THREE.BoxGeometry(step1Run, h, flightWidth);
        const step = new THREE.Mesh(geom, material);
        step.position.set(i * step1Run + step1Run / 2, h / 2, flightWidth / 2);
        step.castShadow = true; step.receiveShadow = true;
        group.add(step);
    }

    // LANDING
    const landGeom = new THREE.BoxGeometry(landingSize, halfH, landingSize);
    const landMesh = new THREE.Mesh(landGeom, material);
    landMesh.position.set(flight1Run + landingSize / 2, halfH / 2, flightWidth / 2);
    landMesh.castShadow = true; landMesh.receiveShadow = true;
    group.add(landMesh);

    // FLIGHT 2
    const step2Run = flight2Run / stepsPerFlight;
    for(let i = 0; i < stepsPerFlight; i++) {
        const h = halfH + stepH * (i + 1);
        const geom = new THREE.BoxGeometry(landingSize, h, step2Run);
        const step = new THREE.Mesh(geom, material);
        step.position.set(flight1Run + landingSize / 2, h / 2, flightWidth + (i * step2Run) + step2Run / 2);
        step.castShadow = true; step.receiveShadow = true;
        group.add(step);
    }

    return group;
}

function pan(direction) {
    if (!controls3D || !camera3D) return;
    const speed = 50; 
    const offset = new THREE.Vector3();
    
    if (direction === 'up') offset.set(0, speed, 0);
    if (direction === 'down') offset.set(0, -speed, 0);
    if (direction === 'left') offset.set(-speed, 0, 0);
    if (direction === 'right') offset.set(speed, 0, 0);

    controls3D.target.add(offset);
    camera3D.position.add(offset);
    controls3D.update();
}

function resetCamera3D() {
    camera3D.position.set(500, 800, 1000);
    controls3D.target.set(500, 0, 500);
    controls3D.update();
}

function startWalkthrough() {
    if (!is3DMode) return;
    
    if (!fpsControls) {
        fpsControls = new THREE.PointerLockControls(camera3D, document.body);
        scene3D.add(fpsControls.getObject());
        
        fpsControls.addEventListener('unlock', () => {
            isWalkthrough = false;
            controls3D.enabled = true; 
            document.getElementById('nav-pad').style.display = 'flex'; 
            
            const hint = document.getElementById('fly-hint');
            if(hint) hint.remove();

            // Kill momentum instantly when exiting drone mode
            moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };
        });
    }

    isWalkthrough = true;
    controls3D.enabled = false; 
    document.getElementById('nav-pad').style.display = 'none';

    if (!document.getElementById('fly-hint')) {
        const hint = document.createElement('div');
        hint.id = 'fly-hint';
        hint.innerHTML = "<b>DRONE MODE:</b> WASD to Move | Mouse to Look | <b>E</b> to Fly Up | <b>Q</b> to Fly Down | <b>ESC</b> to Exit";
        hint.style.cssText = "position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(15,23,42,0.8); color:#38bdf8; padding:10px 20px; border-radius:8px; font-size:14px; z-index:100; pointer-events:none; border:1px solid #38bdf8; box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);";
        document.body.appendChild(hint);
    }

    const scaleInput = document.getElementById('scaleInput');
    const SCALE = scaleInput ? parseFloat(scaleInput.value) || 1.2 : 1.2;
    camera3D.position.set(500, 66 * SCALE, 1000); 
    camera3D.lookAt(500, 66 * SCALE, 500);
    
    fpsControls.lock();
}

function toggleRaycaster() {
    isRaycasterActive = !isRaycasterActive;
    const btn = document.getElementById('btn-raycaster');
    const textSpan = btn.querySelector('.text'); // Safely target just the text
    
    if (isRaycasterActive) {
        if(textSpan) textSpan.innerHTML = '3D SELECTION: ON';
        btn.style.background = '#38bdf8';
        btn.style.color = '#0f172a';
    } else {
        if(textSpan) textSpan.innerHTML = '3D SELECTION: OFF';
        btn.style.background = 'rgba(15, 23, 42, 0.85)';
        btn.style.color = '#38bdf8';
        
        if (typeof selectedElIndex !== 'undefined') selectedElIndex = -1;
        if (typeof renderSidebar === 'function') renderSidebar();
        if (typeof updateCanvas === 'function') updateCanvas();
    }
}

// =========================================
// 3D EVENT LISTENERS (Keyboard Safety Fixed)
// =========================================
document.addEventListener('keydown', (e) => {
    if (!isWalkthrough) return;
    
    // Ignore input if user is typing in a text box
    if (document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'SELECT' || 
        document.activeElement.tagName === 'TEXTAREA') return;

    if (e.key.toLowerCase() === 'w') moveState.forward = true;
    if (e.key.toLowerCase() === 's') moveState.backward = true;
    if (e.key.toLowerCase() === 'a') moveState.left = true;
    if (e.key.toLowerCase() === 'd') moveState.right = true;
    if (e.key.toLowerCase() === 'e') moveState.up = true;   
    if (e.key.toLowerCase() === 'q') moveState.down = true; 
});

document.addEventListener('keyup', (e) => {
    if (!isWalkthrough) return;
    
    if (e.key.toLowerCase() === 'w') moveState.forward = false;
    if (e.key.toLowerCase() === 's') moveState.backward = false;
    if (e.key.toLowerCase() === 'a') moveState.left = false;
    if (e.key.toLowerCase() === 'd') moveState.right = false;
    if (e.key.toLowerCase() === 'e') moveState.up = false;
    if (e.key.toLowerCase() === 'q') moveState.down = false;
});

document.addEventListener('DOMContentLoaded', () => {
    const threeContainer = document.getElementById('three-container');
    if (threeContainer) {
        threeContainer.addEventListener('click', (event) => {
            if (!is3DMode || !isRaycasterActive || isWalkthrough) return;

            const rect = renderer3D.domElement.getBoundingClientRect();
            mouse3D.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse3D.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse3D, camera3D);
            const intersects = raycaster.intersectObjects(buildingGroup.children, true);

            let clickedRoomIndex = -1;
            for (let i = 0; i < intersects.length; i++) {
                const object = intersects[i].object;
                if (object.userData && object.userData.isRoom) {
                    clickedRoomIndex = object.userData.roomIndex;
                    break; 
                }
            }

            if (typeof selectedElIndex !== 'undefined') {
                selectedElIndex = clickedRoomIndex;
                if (typeof renderSidebar === 'function') renderSidebar(); 
                if (typeof updateCanvas === 'function') updateCanvas();  
            }
        });
    }
});

// =========================================
// 3D PERFORMANCE MANAGEMENT
// =========================================
let isPerformanceMode = false;

function togglePerformanceMode() {
    isPerformanceMode = !isPerformanceMode;
    const btn = document.getElementById('btn-performance');
    
    if (btn) {
        const textSpan = btn.querySelector('.text'); // Target the text span
        if(textSpan) textSpan.innerHTML = isPerformanceMode ? 'PERF MODE: ON' : 'PERF MODE: OFF';
        btn.style.background = isPerformanceMode ? 'rgba(234, 179, 8, 0.2)' : 'rgba(15, 23, 42, 0.85)';
        btn.style.color = isPerformanceMode ? '#facc15' : '#facc15';
    }

    if (!scene3D || !renderer3D) return;

    renderer3D.setPixelRatio(isPerformanceMode ? 1 : window.devicePixelRatio);

    scene3D.traverse((object) => {
        if (object.isDirectionalLight) {
            object.castShadow = !isPerformanceMode;
        }
        if (object.isMesh) {
            object.castShadow = !isPerformanceMode;
            object.receiveShadow = !isPerformanceMode;
            if (object.material) object.material.needsUpdate = true;
        }
    });

    if (is3DMode && !isWalkthrough) {
        controls3D.update();
        renderer3D.render(scene3D, camera3D);
    }
}


// =========================================
// 3D FURNITURE GENERATOR
// =========================================
function createFurniture3D(type, w, d) {
    const group = new THREE.Group();
    // A clean, soft gray material for all furniture (passed into the builders)
    const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });

    // Map the 2D 'type' string directly to the Factory function
    const builderMap = {
        'bed': FurnitureFactory.buildBed,
        'sofa': FurnitureFactory.buildSofa,
        'dining': FurnitureFactory.buildDining,
        'counter': FurnitureFactory.buildCounter,
        'tv_unit': FurnitureFactory.buildTVUnit,
        'coffee_table': FurnitureFactory.buildCoffeeTable,
        'wardrobe': FurnitureFactory.buildWardrobe,
        'desk': FurnitureFactory.buildDesk,
        'chair': FurnitureFactory.buildChair,
        'bathtub': FurnitureFactory.buildBathtub,
        'toilet_seat': FurnitureFactory.buildToiletSeat,
        'plant': FurnitureFactory.buildPlant,
        'bookshelf': FurnitureFactory.buildBookshelf,
        'nightstand': FurnitureFactory.buildNightstand,
        'rug': FurnitureFactory.buildRug,
        'island': FurnitureFactory.buildIsland,
        'fridge': FurnitureFactory.buildFridge,
        'stove': FurnitureFactory.buildStove
    };

    if (builderMap[type]) {
        builderMap[type].call(FurnitureFactory, group, w, d);
    } else {
        console.warn(`Furniture type '${type}' not found in FurnitureFactory.`);
    }

    return group;
}


// =========================================
// PROCEDURAL TEXTURE GENERATOR (Real3D)
// =========================================
const textureCache = {};

function getProceduralTexture(type) {
    if (textureCache[type]) return textureCache[type];

    const canvas = document.createElement('canvas');
    canvas.width = 256; 
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (type === 'wood') {
        // Hardwood Floor Pattern
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#6b4226';
        for(let i=0; i<256; i+=32) {
            ctx.fillRect(0, i, 256, 2); // Planks
            for(let j=0; j<5; j++) {
                ctx.fillRect(Math.random()*256, i+Math.random()*32, Math.random()*40+20, 1); // Wood grain
            }
        }
    } else if (type === 'bathroom-tile') {
        // Light Blue/Cyan water-resistant tile for Toilets
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 4;
        for(let i=0; i<=256; i+=32) { // Smaller 32px grids
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
        }
    } else if (type === 'kitchen-tile') {
        // Classic Black & White checkered tile for Kitchens
        for(let i=0; i<256; i+=64) {
            for(let j=0; j<256; j+=64) {
                ctx.fillStyle = ((i/64 + j/64) % 2 === 0) ? '#f8fafc' : '#334155';
                ctx.fillRect(i, j, 64, 64);
            }
        }
    } else if (type === 'grass') {
        // Lawn / Balcony Turf Pattern
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#16a34a';
        for(let i=0; i<2000; i++) {
            ctx.fillRect(Math.random()*256, Math.random()*256, 2, 6); // Grass blades
        }
    } else if (type === 'shingle') {
        const colors = ['#8f4236', '#7b3e34', '#5c2e26', '#6d4c4a', '#8a4b43', '#4a2c2a'];
        ctx.fillStyle = '#2c1b18';
        ctx.fillRect(0, 0, 256, 256);

        const sW = 64; // Shingle Width
        const sH = 32; // Shingle Height

        for (let y = 0; y < 256; y += sH) {
            // Offset every other row by half a shingle to create the staggered look
            const offset = (y / sH) % 2 === 0 ? 0 : sW / 2;
            
            for (let x = -sW; x < 256; x += sW) {
                // Pick a random terracotta/brown color
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillRect(x + offset, y, sW - 2, sH - 2); // 2px gap for shadows

                // Add grit/noise for the asphalt texture
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                for(let k = 0; k < 30; k++) {
                    ctx.fillRect(x + offset + Math.random()*(sW-2), y + Math.random()*(sH-2), 2, 2);
                }
                
                // Add a shadow ridge at the bottom of each shingle for 3D depth
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(x + offset, y + sH - 6, sW - 2, 4);
            }
        }
    }
    else {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#cbd5e1';
        for(let i=0; i<1000; i++) {
            ctx.fillRect(Math.random()*256, Math.random()*256, 2, 2); // Concrete speckles
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    textureCache[type] = texture;
    return texture;
}

// Replace the old getTextureForRoom with this:
function getTextureForRoom(roomObj) {
    // 1. Check if user manually applied a specific material
    if (roomObj && roomObj.material && roomObj.material !== 'auto') {
        return roomObj.material;
    }
    // 2. Otherwise, fall back to smart auto-defaults
    const roomType = typeof roomObj === 'string' ? roomObj : roomObj.type;
    if (['living', 'bedroom'].includes(roomType)) return 'wood';
    if (['toilet'].includes(roomType)) return 'bathroom-tile';
    if (['kitchen'].includes(roomType)) return 'kitchen-tile';
    if (['balcony'].includes(roomType)) return 'grass';
    return 'concrete';
}


// =========================================
// BALCONY DETAILS (Chairs & Plants)
// =========================================
// The flag to toggle balcony furniture visibility
let showBalconyExtras = true; 

function createBalconyChair() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 }); // Slate gray metal
    
    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 16), mat);
    seat.position.y = 10;
    group.add(seat);
    
    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 2), mat);
    back.position.set(0, 18, -7);
    group.add(back);
    
    // Legs
    const legGeom = new THREE.BoxGeometry(2, 10, 2);
    [[-7,-7], [7,-7], [-7,7], [7,7]].forEach(pos => {
        const leg = new THREE.Mesh(legGeom, mat);
        leg.position.set(pos[0], 5, pos[1]);
        group.add(leg);
    });
    
    return group;
}

function createBalconyPlant() {
    const group = new THREE.Group();
    
    // Terracotta Pot
    const potMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 }); 
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(6, 4, 12, 8), potMat);
    pot.position.y = 6;
    group.add(pot);
    
    // Plant/Leaves (A simple low-poly organic shape)
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 });
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(10, 0), plantMat);
    leaves.position.y = 16;
    group.add(leaves);
    
    return group;
}


//Phase - 3
// --- DYNAMIC SUNLIGHT CONTROLLER ---
function updateSunlight(hour) {
    // 🌟 FIXED: Changed 'scene' to 'scene3D'
    if (!sunLight || !scene3D) return; 
    
    // Map hour (6 to 18) to an angle in radians (0 to PI)
    const normalizedTime = (hour - 6) / 12; 
    const angle = normalizedTime * Math.PI;
    
    const radius = 1000;
    
    // Calculate sun position in an arc
    const x = Math.cos(angle) * -radius; 
    const y = Math.sin(angle) * radius;
    const z = 300; 
    
    sunLight.position.set(x, y, z);
    
    // Update visual aesthetics based on time
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay) {
        if (hour < 8) {
            timeDisplay.innerText = "Morning Glow";
            timeDisplay.style.color = "#fb923c"; 
            sunLight.color.setHex(0xffedd5); 
        } else if (hour > 16) {
            timeDisplay.innerText = "Golden Hour";
            timeDisplay.style.color = "#f59e0b";
            sunLight.color.setHex(0xfef3c7);
        } else {
            timeDisplay.innerText = "Midday";
            timeDisplay.style.color = "#38bdf8";
            sunLight.color.setHex(0xffffff); 
        }
    }
}

// =========================================
// PHASE 3: CINEMATIC TOUR ENGINE
// =========================================

function captureWaypoint() {
    // 🌟 FIXED: Use camera3D and controls3D
    if (!camera3D || !controls3D) return; 
    
    waypoints.push({
        position: camera3D.position.clone(),
        target: controls3D.target.clone()
    });
    
    const countEl = document.getElementById('wp-count');
    if (countEl) countEl.innerText = waypoints.length;
}

function clearTour() {
    waypoints = [];
    const countEl = document.getElementById('wp-count');
    if (countEl) countEl.innerText = '0';
}

function playCinematicTour() {
    if (waypoints.length < 2) {
        alert("Please set at least 2 waypoints using the camera first!");
        return;
    }
    if (isPlayingTour) return;
    
    isPlayingTour = true;
    controls3D.enabled = false; // Disable mouse orbit while touring
    
    let currentWpIndex = 0;
    const durationPerPoint = 3000; // 3 seconds per transition
    let startTime = performance.now();
    
    function animateTour(time) {
        if (!isPlayingTour) return;
        
        const elapsed = time - startTime;
        let rawProgress = elapsed / durationPerPoint;
        
        const startWp = waypoints[currentWpIndex];
        const endWp = waypoints[currentWpIndex + 1];
        
        // 🌟 FIXED: Strictly check raw elapsed time so it NEVER goes over 100%
        if (rawProgress < 1) {
            // Easing function (Smoothstep) applied safely
            let progress = rawProgress * rawProgress * (3 - 2 * rawProgress); 
            
            // Interpolate Camera Position
            camera3D.position.lerpVectors(startWp.position, endWp.position, progress);
            // Interpolate Camera Look Target
            controls3D.target.lerpVectors(startWp.target, endWp.target, progress);
            controls3D.update(); 
            
            requestAnimationFrame(animateTour);
        } else {
            // 🌟 FIXED: Snap exactly to the target to prevent micro-drifting
            camera3D.position.copy(endWp.position);
            controls3D.target.copy(endWp.target);
            controls3D.update();

            // Move to next waypoint leg
            currentWpIndex++;
            
            if (currentWpIndex >= waypoints.length - 1) {
                // Tour Finished safely
                isPlayingTour = false;
                controls3D.enabled = true; 
            } else {
                // 🌟 FIXED: Continue to next point using exact frame time
                startTime = time; 
                requestAnimationFrame(animateTour);
            }
        }
    }
    
    requestAnimationFrame(animateTour);
}


function update3DTransforms() {
    if (!is3DMode || !buildingGroup) return;

    // 🌟 REFACTORED: Use the helper to instantly get SCALE and Center (I)
    const { SCALE, I } = get3DEnvironmentParams();

    // Find all meshes marked as rooms and update their X/Z positions
    buildingGroup.children.forEach(mesh => {
        if (mesh.userData && mesh.userData.isRoom) {
            const index = mesh.userData.roomIndex;
            const el = elements[index];
            if (el) {
                const width = el.w * SCALE;
                const depth = el.h * SCALE; 
                const centerX = I.x + (el.x * SCALE) + (width / 2);
                const centerZ = I.z + (el.y * SCALE) + (depth / 2);
                
                // Update position without recreating geometry
                mesh.position.x = centerX;
                mesh.position.z = centerZ;
            }
        }
    });
}

// =========================================
// 🌟 3D ENVIRONMENT MATH HELPER 
// =========================================
function get3DEnvironmentParams() {
    const scaleInput = document.getElementById('scaleInput');
    const unitSelect = document.getElementById('unitSelect');
    
    const SCALE = scaleInput ? parseFloat(scaleInput.value) || ARCH_CONFIG.CANVAS.DEFAULT_SCALE : ARCH_CONFIG.CANVAS.DEFAULT_SCALE;
    const unit = unitSelect ? unitSelect.value : 'in';
    
    const toInches3D = (val, u) => u === 'cm' ? parseFloat(val) / 2.54 : parseFloat(val);
    const inW = toInches3D(document.getElementById('inW')?.value || 0, unit) * SCALE;
    const inH = toInches3D(document.getElementById('inH')?.value || 0, unit) * SCALE;
    
    const CX = ARCH_CONFIG.CANVAS.CENTER_X;
    const CY = ARCH_CONFIG.CANVAS.CENTER_Y;
    
    const I = { x: CX - (inW/2), z: CY - (inH/2) }; 
    const WALL_HEIGHT = ARCH_CONFIG.DEFAULTS.WALL_HEIGHT_3D * SCALE;
    
    return { SCALE, unit, inW, inH, I, WALL_HEIGHT, CX, CY };
}


// =========================================
// 🌟 EXPLODED AXONOMETRIC VIEW ENGINE
// =========================================
let isExploded = false;
let explodeAnimation = null;
window.toggleExplodeView = function() {
    if (!buildingGroup || !is3DMode) return;
    isExploded = !isExploded;
    const btn = document.getElementById('btn-explode');
    if (btn) {
        btn.style.background = isExploded ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.1)';
        btn.style.color = isExploded ? '#f59e0b' : '';
        btn.style.borderColor = isExploded ? 'rgba(245, 158, 11, 0.4)' : '';
        btn.innerHTML = isExploded ? '🔽 COLLAPSE VIEW' : '💥 EXPLODE VIEW';
    }

    const OFFSET_PER_FLOOR = 350; // How high each floor lifts
    const { WALL_HEIGHT } = get3DEnvironmentParams();

    // 1. Calculate Target Positions for every single mesh
    buildingGroup.children.forEach(child => {
        if (child.userData.originalY === undefined) {
            child.userData.originalY = child.position.y;
        }

        // 🌟 Mathematical trick: Adding a +5 epsilon ensures that the ceiling slab 
        // perfectly binds to the floor ABOVE it and lifts off the walls below it!
        const floorLevel = Math.floor((child.userData.originalY + 5) / WALL_HEIGHT);
        const targetFloor = Math.max(0, floorLevel);

        child.userData.targetY = isExploded
            ? child.userData.originalY + (targetFloor * OFFSET_PER_FLOOR)
            : child.userData.originalY;
    });

    // 2. RequestAnimationFrame Lerp Loop
    if (explodeAnimation) cancelAnimationFrame(explodeAnimation);

    function animateExplode() {
        let allArrived = true;
        buildingGroup.children.forEach(child => {
            const target = child.userData.targetY;
            const current = child.position.y;
            const diff = target - current;

            // Smooth easing interpolation
            if (Math.abs(diff) > 0.5) {
                child.position.y += diff * 0.08; 
                allArrived = false;
            } else {
                child.position.y = target;
            }
        });

        if (!allArrived) {
            explodeAnimation = requestAnimationFrame(animateExplode);
        }
    }
    animateExplode();
};
// =========================================
// 🌟 EXPLODED AXONOMETRIC VIEW ENGINE
// =========================================
