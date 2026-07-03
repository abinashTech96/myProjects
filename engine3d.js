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
        const time = performance.now();
        const delta = (time - prevTime) / 1000;

        if (isWalkthrough) {
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
    // 🌟 FIXED: Tell the engine how to check if Real3D is active
    const useReal3D = document.getElementById('real3D-toggle') ? document.getElementById('real3D-toggle').checked : false;

    if (buildingGroup) {
        function disposeNode(node) {
            if (node.geometry) node.geometry.dispose();
            if (node.material) {
                if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());
                else node.material.dispose();
            }
            if (node.children) node.children.forEach(disposeNode);
        }
        buildingGroup.children.forEach(disposeNode);
        scene3D.remove(buildingGroup);
    }
    buildingGroup = new THREE.Group();


    
    const unitSelect = document.getElementById('unitSelect');
    const scaleInput = document.getElementById('scaleInput');
    const unit = unitSelect ? unitSelect.value : 'in';
    const SCALE = scaleInput ? parseFloat(scaleInput.value) || 1.2 : 1.2;
    
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

        // 👈 NEW: Render 3D Furniture Models
        if (el.isFurniture) {
            mesh = createFurniture3D(el.type, width, depth);
            // Furniture sits on the floor, so Y = floor base height
            mesh.position.set(centerX, el.floor * WALL_HEIGHT, centerZ); 
        }else

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
        }
        /*
        else {
            const geometry = new THREE.BoxGeometry(width, WALL_HEIGHT, depth);
            
            // Default 2D Draft Material
            let materialProps = { 
                color: roomColor, 
                transparent: true, 
                opacity: isColliding ? 0.95 : 0.85 
            };

            // 🌟 THE UPGRADE: Apply Textures if Real3D is ON and no collisions
            if (useReal3D && !isColliding) {
                const texType = getTextureForRoom(el.type);
                const baseTexture = getProceduralTexture(texType);
                
                // Clone texture so we can scale it to match the specific room's size
                const roomTex = baseTexture.clone();
                roomTex.needsUpdate = true;
                // Scale the texture mapping based on room dimensions so tiles/wood don't stretch!
                roomTex.repeat.set(width / 60, depth / 60); 

                materialProps.map = roomTex;
                materialProps.color = 0xffffff; // Reset base color so texture shows properly
                materialProps.opacity = 1.0;    // Make walls solid in Real3D
                materialProps.roughness = texType === 'tile' ? 0.2 : 0.8; // Tiles are shiny, wood is matte!
            }

            const material = new THREE.MeshStandardMaterial(materialProps);
            
            mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true; 
            mesh.position.set(centerX, centerY, centerZ);

            // 🌿 NEW: Populate the Balcony with props
            if (el.type === 'balcony' && showBalconyExtras && useReal3D && !isColliding) {
                // Since the balcony mesh center is now the floor, Y=0 is the floor level
                const surfaceY = 0; 

                const chair1 = createBalconyChair();
                chair1.position.set(-width/4, surfaceY, 0); 
                chair1.rotation.y = Math.PI / 4; 
                mesh.add(chair1);

                const chair2 = createBalconyChair();
                chair2.position.set(width/4, surfaceY, 0); 
                chair2.rotation.y = -Math.PI / 4; 
                mesh.add(chair2);

                const plant = createBalconyPlant();
                plant.position.set(0, surfaceY, -depth/4 + 5); 
                mesh.add(plant);
            }
            
            // Only show glowing wireframe outlines in standard draft mode
            if (!useReal3D || isColliding) {
                const edges = new THREE.EdgesGeometry(geometry);
                const edgeColor = isColliding ? 0x991b1b : 0xffffff;
                const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 2 }));
                mesh.add(line);
            }
        }
        */

        else {
            // 🌟 NEW: Custom Balcony Logic
            if (el.type === 'balcony' && useReal3D && !isColliding) {
                mesh = new THREE.Group();
                
                // 1. Create Balcony Floor Plane (Greenish tint)
                const floorMat = new THREE.MeshStandardMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
                const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMat);
                floor.rotation.x = -Math.PI / 2; // Lay flat
                mesh.add(floor);
                
                // 2. Add Railings
                const railMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
                const railH = 30 * SCALE;
                const thickness = 4 * SCALE;
                
                // North, South, East, West railings
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
                //Balcony Glass Pane Block
                // 🌟 UPDATED: Subtle Greenish Architectural Glass
                const glassMat = new THREE.MeshStandardMaterial({ 
                    color: 0x98d8c8,    // Icy greenish-blue tint
                    transparent: true, 
                    opacity: 0.25,      // Increased slightly to catch more light
                    side: THREE.DoubleSide,
                    roughness: 0.1,     // Glass is smooth
                    metalness: 0.1      // Glass has a tiny bit of reflection
                });
                const glassH = (WALL_HEIGHT - railH); // The "rest space" from railing to roof
                
                const glassPanes = [
                    { w: width, h: glassH, d: 2, x: 0, z: -depth/2 }, // North
                    { w: width, h: glassH, d: 2, x: 0, z: depth/2 },  // South
                    { w: 2, h: glassH, d: depth, x: width/2, z: 0 },  // East
                    { w: 2, h: glassH, d: depth, x: -width/2, z: 0 }  // West
                ];

                glassPanes.forEach(p => {
                    const glass = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), glassMat);
                    // Positioned at railH + half the remaining height
                    glass.position.set(p.x, railH + (glassH/2), p.z);
                    mesh.add(glass);
                });
                //Balcony Glass Pane Block

                // Position the Balcony Group
                mesh.position.set(centerX, (el.floor * WALL_HEIGHT) + 2, centerZ);

                // 3. Populate Balcony with Furniture (Local coordinates)
                if (showBalconyExtras) {
                    const surfaceY = 0; // Relative to the balcony floor

                    const chair1 = createBalconyChair();
                    chair1.position.set(-width/4, surfaceY, 0); 
                    chair1.rotation.y = Math.PI / 4; 
                    mesh.add(chair1);

                    const chair2 = createBalconyChair();
                    chair2.position.set(width/4, surfaceY, 0); 
                    chair2.rotation.y = -Math.PI / 4; 
                    mesh.add(chair2);

                    const plant = createBalconyPlant();
                    plant.position.set(0, surfaceY, -depth/4 + 5); 
                    mesh.add(plant);
                }
            } 
            // ----------------------------------------------------
            // STANDARD ROOM LOGIC (Solid Box)
            // ----------------------------------------------------
            // ----------------------------------------------------
            // STANDARD ROOM LOGIC (Hollow Walkthrough Walls)
            // ----------------------------------------------------
            else {
                mesh = new THREE.Group();
                const t = 4 * SCALE; // 4 inch wall thickness
                
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
                    // Real3D: Build 4 hollow walls and an inner floor
                    const wN = new THREE.Mesh(new THREE.BoxGeometry(width, WALL_HEIGHT, t), material);
                    wN.position.set(0, WALL_HEIGHT/2, -depth/2 + t/2);
                    wN.castShadow = true; wN.receiveShadow = true;
                    
                    const wS = new THREE.Mesh(new THREE.BoxGeometry(width, WALL_HEIGHT, t), material);
                    wS.position.set(0, WALL_HEIGHT/2, depth/2 - t/2);
                    wS.castShadow = true; wS.receiveShadow = true;
                    
                    const wE = new THREE.Mesh(new THREE.BoxGeometry(t, WALL_HEIGHT, depth - t*2), material);
                    wE.position.set(width/2 - t/2, WALL_HEIGHT/2, 0);
                    wE.castShadow = true; wE.receiveShadow = true;
                    
                    const wW = new THREE.Mesh(new THREE.BoxGeometry(t, WALL_HEIGHT, depth - t*2), material);
                    wW.position.set(-width/2 + t/2, WALL_HEIGHT/2, 0);
                    wW.castShadow = true; wW.receiveShadow = true;
                    
                    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width - t*2, depth - t*2), material);
                    floor.rotation.x = -Math.PI / 2;
                    floor.position.y = 1; // Prevents z-fighting with main slab
                    floor.receiveShadow = true;
                    
                    mesh.add(wN, wS, wE, wW, floor);
                } else {
                    // Draft Mode: Keep the classic translucent solid block
                    const solid = new THREE.Mesh(new THREE.BoxGeometry(width, WALL_HEIGHT, depth), material);
                    solid.position.y = WALL_HEIGHT/2;
                    const edges = new THREE.EdgesGeometry(solid.geometry);
                    const edgeColor = isColliding ? 0x991b1b : 0xffffff;
                    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 2 }));
                    solid.add(line);
                    mesh.add(solid);
                }
                
                // Position Group at base floor level
                mesh.position.set(centerX, el.floor * WALL_HEIGHT, centerZ);
            }
        }





        
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
        
        // 🌟 THE UPGRADE: Switch between Draft gray and Real3D Concrete Texture
        let slabMaterial;
        
        // Check if useReal3D is active (defined earlier in generate3DModel)
        if (typeof useReal3D !== 'undefined' && useReal3D) {
            const slabTex = getProceduralTexture('concrete').clone();
            slabTex.needsUpdate = true;
            // Scale the texture wrapping so it looks realistic, not stretched
            slabTex.repeat.set(inW / 100, inH / 100); 
            slabMaterial = new THREE.MeshStandardMaterial({ 
                map: slabTex, 
                color: 0xffffff, 
                roughness: 0.9 
            });
        } else {
            // Default Draft Mode Material
            slabMaterial = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
        }

        const slab = new THREE.Mesh(slabGeometry, slabMaterial);
        slab.castShadow = true;
        slab.receiveShadow = true;
        slab.position.set(500, slabY, 500); 
        buildingGroup.add(slab);
    }

    // 3. Render Advanced Fixtures (Doors/Windows with Frames)
    fixtures.forEach(fix => {
        const el = elements[fix.roomId];
        if (!el || el.floor !== currentFloor) return;

        const isDoor = fix.type === 'door';
        const width = fix.size * SCALE;
        const height = isDoor ? (80 * SCALE) : (40 * SCALE);
        const depth = 8 * SCALE; // Frame is thicker than the wall
        
        const group = new THREE.Group();
        
        // Premium Materials
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
        const panelMat = isDoor 
            ? new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 }) // Solid Wood
            : new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.4, roughness: 0.1 }); // Glass
            
        const ft = 3 * SCALE; // Frame border thickness
        const isHoriz = (fix.edge === 'top' || fix.edge === 'bottom');
        const fw = isHoriz ? width : depth;
        const fd = isHoriz ? depth : width;

        if (isHoriz) {
            // Horizontal Wall Frame
            const fL = new THREE.Mesh(new THREE.BoxGeometry(ft, height, fd), frameMat); fL.position.set(-fw/2 + ft/2, 0, 0);
            const fR = new THREE.Mesh(new THREE.BoxGeometry(ft, height, fd), frameMat); fR.position.set(fw/2 - ft/2, 0, 0);
            const fT = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, fd), frameMat); fT.position.set(0, height/2 - ft/2, 0);
            group.add(fL, fR, fT);
            if (!isDoor) { const fB = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, fd), frameMat); fB.position.set(0, -height/2 + ft/2, 0); group.add(fB); }
            
            // Panel (The actual door or glass window)
            const pW = fw - (ft * 2);
            const pH = isDoor ? height - ft : height - (ft * 2);
            const panel = new THREE.Mesh(new THREE.BoxGeometry(pW, pH, 2 * SCALE), panelMat);
            panel.position.set(0, isDoor ? -ft/2 : 0, 0);
            
            // 🚪 Open the door in Real3D!
            if (isDoor && useReal3D) {
                panel.position.set(-pW/2 + ft, -ft/2, -pW/2);
                panel.rotation.y = Math.PI / 3; // 60-degree swing
            }
            group.add(panel);
        } else {
            // Vertical Wall Frame
            const fN = new THREE.Mesh(new THREE.BoxGeometry(fw, height, ft), frameMat); fN.position.set(0, 0, -fd/2 + ft/2);
            const fS = new THREE.Mesh(new THREE.BoxGeometry(fw, height, ft), frameMat); fS.position.set(0, 0, fd/2 - ft/2);
            const fT = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, fd), frameMat); fT.position.set(0, height/2 - ft/2, 0);
            group.add(fN, fS, fT);
            if (!isDoor) { const fB = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, fd), frameMat); fB.position.set(0, -height/2 + ft/2, 0); group.add(fB); }
            
            const pD = fd - (ft * 2);
            const pH = isDoor ? height - ft : height - (ft * 2);
            const panel = new THREE.Mesh(new THREE.BoxGeometry(2 * SCALE, pH, pD), panelMat);
            panel.position.set(0, isDoor ? -ft/2 : 0, 0);
            
            if (isDoor && useReal3D) {
                panel.position.set(pD/2, -ft/2, -pD/2 + ft);
                panel.rotation.y = Math.PI / 3;
            }
            group.add(panel);
        }

        // Global Positioning
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
// 3D UTILITIES 
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
    // A clean, soft gray material for all furniture
    const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });

    if (type === 'bed') {
        // Mattress
        const bed = new THREE.Mesh(new THREE.BoxGeometry(w, 18, d), mat);
        bed.position.y = 9; // Sit on floor
        bed.castShadow = true; bed.receiveShadow = true;
        group.add(bed);
        
        // Headboard (Sticks to the "top" edge of the drag box)
        const head = new THREE.Mesh(new THREE.BoxGeometry(w, 40, 6), mat);
        head.position.set(0, 20, -d/2 + 3);
        group.add(head);
    } 
    else if (type === 'sofa') {
        // Seat
        const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 15, d), mat);
        seat.position.y = 7.5;
        group.add(seat);
        // Backrest
        const back = new THREE.Mesh(new THREE.BoxGeometry(w, 30, 8), mat);
        back.position.set(0, 15, -d/2 + 4);
        group.add(back);
        // Armrests
        const armGeom = new THREE.BoxGeometry(8, 22, d);
        const armL = new THREE.Mesh(armGeom, mat); armL.position.set(-w/2 + 4, 11, 0);
        const armR = new THREE.Mesh(armGeom, mat); armR.position.set(w/2 - 4, 11, 0);
        group.add(armL); group.add(armR);
    } 
    else if (type === 'dining') {
        // Table Top
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), mat);
        top.position.y = 30;
        group.add(top);
        // Legs
        const legGeom = new THREE.BoxGeometry(4, 29, 4);
        [[-1,-1], [1,-1], [-1,1], [1,1]].forEach(pos => {
            const leg = new THREE.Mesh(legGeom, mat);
            leg.position.set(pos[0] * (w/2 - 4), 14.5, pos[1] * (d/2 - 4));
            group.add(leg);
        });
    } 
    else if (type === 'counter') {
        // Basic Kitchen Counter / Island
        const counter = new THREE.Mesh(new THREE.BoxGeometry(w, 36, d), mat);
        counter.position.y = 18;
        counter.castShadow = true;
        group.add(counter);
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
    } else {
        // Default Concrete/Plaster
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

function getTextureForRoom(roomType) {
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