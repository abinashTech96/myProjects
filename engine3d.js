// =========================================
// 3D ENGINE & WALKTHROUGH (engine3d.js)
// =========================================

let is3DMode = false;
let scene3D, camera3D, renderer3D, controls3D;
let buildingGroup;

// --- FPS WALKTHROUGH STATE ---
let fpsControls;
let isWalkthrough = false;
let moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };

// --- 3D RAYCASTER STATE ---
let isRaycasterActive = false;
const raycaster = new THREE.Raycaster();
const mouse3D = new THREE.Vector2();

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
        svg.style.display = 'none';
        container3D.style.display = 'block';
        if (navPad) navPad.style.display = 'flex'; 
        
        if (!scene3D) init3D();
        generate3DModel();
    } else {
        svg.style.display = 'block';
        container3D.style.display = 'none';
        if (navPad) navPad.style.display = 'none'; 
    }
}

function init3D() {
    const container = document.getElementById('three-container');
    
    // 1. Setup Scene & Camera (Now Theme-Aware!)
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

    // 4. Premium Lighting Setup
    // Lower the ground ambient light (0x1e293b) so shadows become darker
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.4);
    hemiLight.position.set(0, 1000, 0);
    scene3D.add(hemiLight);

    // Increase the sun intensity from 0.8 to 1.2 to create sharp contrast
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(800, 1500, 500);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 2000;
    dirLight.shadow.camera.bottom = -2000;
    dirLight.shadow.camera.left = -2000;
    dirLight.shadow.camera.right = 2000;
    dirLight.shadow.bias = -0.001; 
    dirLight.shadow.mapSize.width = 2048; 
    dirLight.shadow.mapSize.height = 2048;

    dirLight.target.position.set(500, 0, 500); // Aim at the center of the building
    scene3D.add(dirLight.target);              // Add the target to the world

    scene3D.add(dirLight);

    const gridHelper = new THREE.GridHelper(3000, 100, 0x334155, 0x1e293b);
    gridHelper.position.set(500, -1, 500); 
    scene3D.add(gridHelper);

    // FPS PHYSICS & COLLISION SETUP
    fpsControls = new THREE.PointerLockControls(camera3D, document.body);
    
    fpsControls.addEventListener('unlock', () => {
        isWalkthrough = false;
        controls3D.enabled = true; 
        document.getElementById('nav-pad').style.display = 'flex'; 
    });

    scene3D.add(fpsControls.getObject());
    
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    let prevTime = performance.now();

    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now();
        const delta = (time - prevTime) / 1000;

        if (isWalkthrough) {
            // Apply friction to all 3 axes (X, Y, Z)
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
            
            // Move X & Z (Forward/Back/Left/Right)
            controlObj.translateX(velocity.x * delta);
            controlObj.translateZ(velocity.z * delta);
            
            // Move Y (Up/Down) vertically, independent of where you are looking
            controlObj.position.y += (velocity.y * delta);

            // Wall Collision Check (So you don't fly out of the building horizontally)
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

            // Floor constraint: Prevents you from flying underneath the grass
            const scaleInput = document.getElementById('scaleInput');
            const SCALE = scaleInput ? parseFloat(scaleInput.value) || 1.2 : 1.2;
            if (controlObj.position.y < 20 * SCALE) {
                controlObj.position.y = 20 * SCALE;
            }

        } else {
            controls3D.update(); 
        }

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
// 3D GEOMETRY GENERATOR
// =========================================
function generate3DModel() {
    if (buildingGroup) scene3D.remove(buildingGroup);
    buildingGroup = new THREE.Group();
    
    const unitSelect = document.getElementById('unitSelect');
    const scaleInput = document.getElementById('scaleInput');
    const unit = unitSelect ? unitSelect.value : 'in';
    const SCALE = scaleInput ? parseFloat(scaleInput.value) || 1.2 : 1.2;
    
    // Quick inline conversion to avoid dependency errors during modularization
    const toInches3D = (val, u) => u === 'cm' ? parseFloat(val) / 2.54 : parseFloat(val);
    const inW = toInches3D(document.getElementById('inW').value, unit) * SCALE;
    const inH = toInches3D(document.getElementById('inH').value, unit) * SCALE;
    
    const I = { x: 500 - (inW/2), z: 500 - (inH/2) }; 
    const WALL_HEIGHT = 120 * SCALE; 

    // 1. Generate Rooms
    elements.forEach((el, i) => { 

        const width = el.w * SCALE;
        const depth = el.h * SCALE; 
        
        const centerX = I.x + (el.x * SCALE) + (width / 2);
        const centerZ = I.z + (el.y * SCALE) + (depth / 2);
        const centerY = (el.floor * WALL_HEIGHT) + (WALL_HEIGHT / 2);

        // Simple inline collision check for the 3D module
        const smartMergeToggle = document.getElementById('smartMergeToggle');
        const smartMerge = smartMergeToggle && smartMergeToggle.checked;
        let isColliding = false;
        if (!smartMerge) {
            isColliding = elements.some((other, j) => 
                j !== i && other.floor === el.floor && 
                !(el.x + el.w <= other.x || el.x >= other.x + other.w || el.y + el.h <= other.y || el.y >= other.y + other.h)
            );
        }

        let roomColor = isColliding ? 0xef4444 : (colors3D[el.type] || 0xffffff);
        if (!isColliding && el.customColor) {
            roomColor = parseInt(el.customColor.replace('#', '0x'));
        }

        const real3DToggle = document.getElementById('real3DToggle');
        const useReal3D = real3DToggle && real3DToggle.checked;

        let mesh; 

        if (useReal3D && el.type === 'staircase') {
            const direction = el.dir || 'up'; 
            let run = depth;
            let extWidth = width;
            if (direction === 'left' || direction === 'right') {
                run = width;
                extWidth = depth;
            }

            const matColor = isColliding ? 0xef4444 : 0x9ca3af;
            const mat = new THREE.MeshStandardMaterial({ 
                color: matColor, transparent: true, opacity: isColliding ? 0.95 : 1.0 
            });

            mesh = createUShapedGroup(run, WALL_HEIGHT, extWidth, mat); 
            
            const startX = I.x + (el.x * SCALE);
            const startZ = I.z + (el.y * SCALE);
            const baseY = el.floor * WALL_HEIGHT;
            
            switch(direction) {
                case 'right': mesh.rotation.y = 0; mesh.position.set(startX, baseY, startZ); break;
                case 'left':  mesh.rotation.y = Math.PI; mesh.position.set(startX + width, baseY, startZ + depth); break;
                case 'up':    mesh.rotation.y = Math.PI / 2; mesh.position.set(startX, baseY, startZ + depth); break;
                case 'down':  mesh.rotation.y = -Math.PI / 2; mesh.position.set(startX + width, baseY, startZ); break;
            }
        } else {
            const geometry = new THREE.BoxGeometry(width, WALL_HEIGHT, depth);
            const material = new THREE.MeshStandardMaterial({ 
                color: roomColor, transparent: true, opacity: isColliding ? 0.95 : 0.85 
            });
            
            mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true; 
            mesh.position.set(centerX, centerY, centerZ);
            
            const edges = new THREE.EdgesGeometry(geometry);
            const edgeColor = isColliding ? 0x991b1b : 0xffffff;
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 2 }));
            mesh.add(line);
        }
        
        // --- 3D RAYCASTER DATA BINDING ---
        if (mesh.type === 'Group') {
            mesh.children.forEach(child => child.userData = { roomIndex: i, isRoom: true });
        } else {
            mesh.userData = { roomIndex: i, isRoom: true };
        }
        
        buildingGroup.add(mesh);
    });

    // 2. Generate Slabs
    const floors = elements.map(e => e.floor);
    const maxFloor = floors.length > 0 ? Math.max(...floors) : 0;
    for (let f = 0; f <= maxFloor; f++) {
        const slabY = ((f + 1) * WALL_HEIGHT);
        const slabGeometry = new THREE.BoxGeometry(inW, 10 * SCALE, inH);
        // ---> CHANGE THE COLOR HERE to 0x94a3b8 (Lighter Grey) <---
        const slabMaterial = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
        const slab = new THREE.Mesh(slabGeometry, slabMaterial);
        slab.castShadow = true;
        slab.receiveShadow = true;
        slab.position.set(500, slabY, 500); 
        buildingGroup.add(slab);
    }

    // 3. Render Doors and Windows
    fixtures.forEach(fix => {
        const el = elements[fix.roomId];
        if (!el || el.floor !== currentFloor) return;

        const isDoor = fix.type === 'door';
        const width = fix.size * SCALE;
        const height = isDoor ? (80 * SCALE) : (40 * SCALE);
        const depth = 6 * SCALE; 
        
        const geometry = new THREE.BoxGeometry(
            (isDoor || fix.edge === 'top' || fix.edge === 'bottom') ? width : depth,
            height,
            (isDoor || fix.edge === 'top' || fix.edge === 'bottom') ? depth : width
        );
        const material = new THREE.MeshStandardMaterial({ color: isDoor ? 0x8b4513 : 0x38bdf8 });
        const fixMesh = new THREE.Mesh(geometry, material);

        fixMesh.castShadow = true;
        fixMesh.receiveShadow = true;

        const yPos = (el.floor * WALL_HEIGHT) + (height / 2) + (isDoor ? 0 : 40 * SCALE);
        
        let xPos = I.x + (el.x * SCALE);
        let zPos = I.z + (el.y * SCALE);

        if (fix.edge === 'bottom') { zPos = I.z + (el.y + el.h) * SCALE; xPos = I.x + (el.x + fix.offset) * SCALE; }
        else if (fix.edge === 'top') { zPos = I.z + (el.y * SCALE); xPos = I.x + (el.x + fix.offset) * SCALE; }
        else if (fix.edge === 'left') { xPos = I.x + (el.x * SCALE); zPos = I.z + (el.y + fix.offset) * SCALE; }
        else if (fix.edge === 'right') { xPos = I.x + (el.x + el.w) * SCALE; zPos = I.z + (el.y + fix.offset) * SCALE; }

        fixMesh.position.set(xPos, yPos, zPos);
        buildingGroup.add(fixMesh);
    });

    // 4. Plot/Building Boundaries
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

    scene3D.add(buildingGroup);
}

// =========================================
// 3D UTILITIES (Stairs, Pan, Walkthrough, Raycaster)
// =========================================
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
            
            // Remove the flying hint when exiting
            const hint = document.getElementById('fly-hint');
            if(hint) hint.remove();
        });
    }

    isWalkthrough = true;
    controls3D.enabled = false; 
    document.getElementById('nav-pad').style.display = 'none';

    // Inject sleek on-screen instructions
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
    
    if (isRaycasterActive) {
        btn.innerHTML = '🖱️ 3D SELECTION: ON';
        btn.style.background = '#38bdf8';
        btn.style.color = '#0f172a';
    } else {
        btn.innerHTML = '🖱️ 3D SELECTION: OFF';
        btn.style.background = 'rgba(15, 23, 42, 0.8)';
        btn.style.color = '#38bdf8';
        
        if (typeof selectedElIndex !== 'undefined') selectedElIndex = -1;
        if (typeof renderSidebar === 'function') renderSidebar();
        if (typeof updateCanvas === 'function') updateCanvas();
    }
}

// =========================================
// 3D EVENT LISTENERS
// =========================================
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'w') moveState.forward = true;
    if (e.key.toLowerCase() === 's') moveState.backward = true;
    if (e.key.toLowerCase() === 'a') moveState.left = true;
    if (e.key.toLowerCase() === 'd') moveState.right = true;
    if (e.key.toLowerCase() === 'e') moveState.up = true;   // Fly Up
    if (e.key.toLowerCase() === 'q') moveState.down = true; // Fly Down
});

document.addEventListener('keyup', (e) => {
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
        btn.innerHTML = isPerformanceMode ? '⚡ PERF MODE: ON' : '⚡ PERF MODE: OFF';
        btn.style.background = isPerformanceMode ? 'rgba(234, 179, 8, 0.2)' : 'rgba(15, 23, 42, 0.8)';
        btn.style.color = isPerformanceMode ? '#facc15' : '#38bdf8';
    }

    if (!scene3D || !renderer3D) return;

    // 1. Toggle High-DPI Rendering
    // Standard screens use 1. Retina screens (MacBooks/Phones) use 2 or 3. 
    // Forcing 1 instantly halves the rendering workload.
    renderer3D.setPixelRatio(isPerformanceMode ? 1 : window.devicePixelRatio);

    // 2. Traverse the entire 3D world and turn off shadow calculations
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

    // 3. Force a frame re-render if the user is currently standing still
    if (is3DMode && !isWalkthrough) {
        controls3D.update();
        renderer3D.render(scene3D, camera3D);
    }
}