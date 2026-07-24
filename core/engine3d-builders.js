// =========================================
// 🎨 PHASE 1: MATERIAL & TEXTURE POOLING
// =========================================
const SOLID_MAT_CACHE = {};

function getCachedSolidMaterial(hexColor, opacity) {
    // Creates a unique key like "16777215_0.85"
    const key = `${hexColor}_${opacity}`; 
    
    // If the material doesn't exist yet, create it and store it
    if (!SOLID_MAT_CACHE[key]) {
        SOLID_MAT_CACHE[key] = new THREE.MeshStandardMaterial({ 
            color: hexColor, 
            transparent: opacity < 1.0, 
            opacity: opacity 
        });
    }
    // Return the shared instance!
    return SOLID_MAT_CACHE[key];
}

// =========================================
// 3D GEOMETRY GENERATOR (Modularized)
// =========================================
function generate3DModelBkup() {
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
function generate3DModel() {
    // 🌟 THE FIX: Prevent early auto-saves from building 3D before the engine boots!
    if (typeof scene3D === 'undefined' || !scene3D) return;
    const real3DToggle = document.getElementById('real3DToggle');
    const useReal3D = real3DToggle ? real3DToggle.checked : false;
    if (!buildingGroup) {
        buildingGroup = new THREE.Group();
        scene3D.add(buildingGroup);
    } else {
        disposeScene(); 
    }
    const { SCALE, unit, inW, inH, I, WALL_HEIGHT } = get3DEnvironmentParams();
    if (typeof elements !== 'undefined' && elements.length > 0) {
        build3DRooms(SCALE, I, WALL_HEIGHT, useReal3D);
        build3DSlabs(SCALE, I, WALL_HEIGHT, useReal3D);
        build3DFixtures(SCALE, I, WALL_HEIGHT, useReal3D);
        if (typeof build3DRoof === 'function') {
            build3DRoof(SCALE, I, WALL_HEIGHT);
        }
    }
    build3DBoundaries(SCALE, unit, I, inW, inH);
    scene3D.add(buildingGroup);
}
function build3DRooms(SCALE, I, WALL_HEIGHT, useReal3D) {
    // ⚡ OPTIMIZATION: Fetch DOM elements ONCE before the loop
    const smartMerge = document.getElementById('smartMergeToggle')?.checked;

    elements.forEach((el, i) => {
        // 🌟 REFACTORED: Single call for all positioning math
        const center = getRoomCenter(el, SCALE, I);
        const isColliding = !smartMerge && !el.isFurniture && typeof checkCollision === 'function' ? checkCollision(el, i) : false;

        // 🐛 BUG FIX: Restored Custom Color Logic
        let roomColor = isColliding ? 0xef4444 : (typeof ARCH_CONFIG !== 'undefined' && ARCH_CONFIG.COLORS[el.type]?.hex || 0xffffff);
        if (!isColliding && el.customColor) {
            roomColor = parseInt(el.customColor.replace('#', '0x'));
        }

        let mesh;

        // Route to the appropriate modular builder
        if (el.isFurniture) {
            mesh = createFurniture3D(el.type, center.width, center.depth);
            mesh.position.set(center.x, el.floor * WALL_HEIGHT, center.z);
        } else if (el.type === 'staircase') {
            mesh = buildStaircase(el, center, WALL_HEIGHT, isColliding);
        } else if (el.type === 'balcony') {
            mesh = buildBalcony(el, center, WALL_HEIGHT, useReal3D, isColliding, SCALE);
        } else if (el.type === 'living') {
            mesh = buildLivingRoom(el, center, WALL_HEIGHT, useReal3D, isColliding, SCALE);
        } else if (el.type === 'living2') { 
            // 🐛 BUG FIX: Restored the living2 (HD Floor) routing
            mesh = buildIsolatedLivingRoom(el, center, WALL_HEIGHT, useReal3D, isColliding, SCALE);
        } else {
            mesh = buildStandardRoom(el, center, WALL_HEIGHT, useReal3D, isColliding, SCALE, roomColor);
        }

        // Apply metadata and add to scene
        if (mesh) {
            mesh.traverse(child => { if (child.isMesh) child.userData = { roomIndex: i, isRoom: true }; });
            buildingGroup.add(mesh);
        }
    });
}

// ==========================================
// 🧩 2. NEW SHARED HELPER (DRY Principle)
// ==========================================
function createRoomWallsOld(width, height, depth, thickness, material) {
    const group = new THREE.Group();
    const wGeom = new THREE.BoxGeometry(width, height, thickness);
    const dGeom = new THREE.BoxGeometry(thickness, height, depth - thickness * 2);

    const wN = new THREE.Mesh(wGeom, material); wN.position.set(0, height/2, -depth/2 + thickness/2);
    const wS = new THREE.Mesh(wGeom, material); wS.position.set(0, height/2, depth/2 - thickness/2);
    const wE = new THREE.Mesh(dGeom, material); wE.position.set(width/2 - thickness/2, height/2, 0);
    const wW = new THREE.Mesh(dGeom, material); wW.position.set(-width/2 + thickness/2, height/2, 0);

    [wN, wS, wE, wW].forEach(w => { w.castShadow = true; w.receiveShadow = true; group.add(w); });
    return group;
}
// ==========================================
// 🧩 PHASE 1: STATIC GEOMETRY BATCHING
// ==========================================
function createRoomWalls(width, height, depth, thickness, material) {
    // 1. Create base geometries
    const wN = new THREE.BoxGeometry(width, height, thickness);
    const wS = new THREE.BoxGeometry(width, height, thickness);
    const wE = new THREE.BoxGeometry(thickness, height, depth - thickness * 2);
    const wW = new THREE.BoxGeometry(thickness, height, depth - thickness * 2);

    // 2. Mathematically shift the geometry vertices into position (no meshes needed yet)
    wN.translate(0, height/2, -depth/2 + thickness/2);
    wS.translate(0, height/2, depth/2 - thickness/2);
    wE.translate(width/2 - thickness/2, height/2, 0);
    wW.translate(-width/2 + thickness/2, height/2, 0);

    // 3. 🌟 MERGE THEM ALL INTO ONE SINGLE GEOMETRY
    const mergedGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries([wN, wS, wE, wW]);
    
    // 4. Create one single mesh for the entire room's walls
    const wallMesh = new THREE.Mesh(mergedGeometry, material);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;

    // Return inside a group to maintain structural parity with your existing code
    const group = new THREE.Group();
    group.add(wallMesh);
    return group;
}
function buildStaircase(el, center, WALL_HEIGHT, isColliding) {
    const group = new THREE.Group();
    const direction = el.dir || 'up';
    const style = el.stairStyle || 'u-shape';
    const { width, depth } = center;

    let run = depth, extWidth = width;
    if (direction === 'left' || direction === 'right') { run = width; extWidth = depth; }

    const matColor = isColliding ? 0xef4444 : 0x9ca3af;
    const mat = new THREE.MeshStandardMaterial({ color: matColor, transparent: true, opacity: isColliding ? 0.95 : 1.0 });

    let stairs;
    if (style === 'straight') stairs = createStraightStaircaseGroup(run, WALL_HEIGHT, extWidth, mat);
    else if (style === 'l-shape') stairs = createLShapedGroup(run, WALL_HEIGHT, extWidth, mat);
    else stairs = createUShapedGroup(run, WALL_HEIGHT, extWidth, mat);
    group.add(stairs);

    switch(direction) {
        case 'right': stairs.rotation.y = 0; break;
        case 'left':  stairs.rotation.y = Math.PI; stairs.position.set(width, 0, depth); break;
        case 'up':    stairs.rotation.y = Math.PI / 2; stairs.position.set(0, 0, depth); break;
        case 'down':  stairs.rotation.y = -Math.PI / 2; stairs.position.set(width, 0, 0); break;
    }

    group.position.set(center.x - (width / 2), el.floor * WALL_HEIGHT, center.z - (depth / 2));
    return group;
}
function buildBalcony(el, center, WALL_HEIGHT, useReal3D, isColliding, SCALE) {
    if (!useReal3D || isColliding) return buildStandardRoom(el, center, WALL_HEIGHT, useReal3D, isColliding, SCALE, 0x10b981);

    const mesh = new THREE.Group();
    const { width, depth } = center;

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMat);
    floor.rotation.x = -Math.PI / 2;
    mesh.add(floor);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const railH = 30 * SCALE;
    const thickness = 4 * SCALE;

    const rails = [
        { w: width, h: railH, d: thickness, x: 0, z: -depth / 2 },
        { w: width, h: railH, d: thickness, x: 0, z: depth / 2 },
        { w: thickness, h: railH, d: depth, x: width / 2, z: 0 },
        { w: thickness, h: railH, d: depth, x: -width / 2, z: 0 }
    ];
    rails.forEach(r => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(r.w, r.h, r.d), railMat);
        rail.position.set(r.x, railH / 2, r.z);
        mesh.add(rail);
    });

    const glassMat = new THREE.MeshStandardMaterial({ color: 0x98d8c8, transparent: true, opacity: 0.25, side: THREE.DoubleSide, roughness: 0.1, metalness: 0.1 });
    const glassH = (WALL_HEIGHT - railH);
    const glassPanes = [
        { w: width, h: glassH, d: 2, x: 0, z: -depth / 2 },
        { w: width, h: glassH, d: 2, x: 0, z: depth / 2 },
        { w: 2, h: glassH, d: depth, x: width / 2, z: 0 },
        { w: 2, h: glassH, d: depth, x: -width / 2, z: 0 }
    ];
    glassPanes.forEach(p => {
        const glass = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), glassMat);
        glass.position.set(p.x, railH + (glassH / 2), p.z);
        mesh.add(glass);
    });

    if (typeof showBalconyExtras !== 'undefined' && showBalconyExtras) {
        const chair1 = createBalconyChair(); chair1.position.set(-width / 4, 0, 0); chair1.rotation.y = Math.PI / 4; mesh.add(chair1);
        const chair2 = createBalconyChair(); chair2.position.set(width / 4, 0, 0); chair2.rotation.y = -Math.PI / 4; mesh.add(chair2);
        const plant = createBalconyPlant(); plant.position.set(0, 0, -depth / 4 + 5); mesh.add(plant);
    }

    mesh.position.set(center.x, (el.floor * WALL_HEIGHT) + 2, center.z);
    return mesh;
}
function buildLivingRoom(el, center, WALL_HEIGHT, useReal3D, isColliding, SCALE) {
    if (!useReal3D || isColliding) return buildStandardRoom(el, center, WALL_HEIGHT, useReal3D, isColliding, SCALE, 0xd898a8);

    const mesh = new THREE.Group();
    const { width, depth } = center;

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMat);
    floor.rotation.x = -Math.PI / 2;
    mesh.add(floor);

    const glassMat = new THREE.MeshStandardMaterial({ color: 0xd898a8, transparent: true, opacity: 0.25, side: THREE.DoubleSide, roughness: 0.1, metalness: 0.1 });
    const glassPanes = [
        { w: width, h: WALL_HEIGHT, d: 2, x: 0, z: -depth / 2 },
        { w: width, h: WALL_HEIGHT, d: 2, x: 0, z: depth / 2 },
        { w: 2, h: WALL_HEIGHT, d: depth, x: width / 2, z: 0 },
        { w: 2, h: WALL_HEIGHT, d: depth, x: -width / 2, z: 0 }
    ];
    glassPanes.forEach(p => {
        const glass = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), glassMat);
        glass.position.set(p.x, WALL_HEIGHT / 2, p.z);
        mesh.add(glass);
    });

    mesh.position.set(center.x, (el.floor * WALL_HEIGHT) + 2, center.z);
    return mesh;
}
// 🐛 BUG FIX: Restored the Isolated Living Room (HD Floor) Builder
function buildIsolatedLivingRoom(el, center, WALL_HEIGHT, useReal3D, isColliding, SCALE) {
    if (!useReal3D || isColliding) return buildStandardRoom(el, center, WALL_HEIGHT, useReal3D, isColliding, SCALE, 0xffffff);

    const mesh = new THREE.Group();
    const t = (typeof ARCH_CONFIG !== 'undefined' ? ARCH_CONFIG.DEFAULTS.WALL_THICKNESS_3D : 4) * SCALE;
    const { width, depth } = center;
    const texType = getTextureForRoom(el);

    // ⚡ OPTIMIZATION: Using the new createRoomWalls helper!
    const baseTexture = getProceduralTexture(texType);
    const roomTex = baseTexture.clone();
    roomTex.needsUpdate = true;
    roomTex.repeat.set(width / 60, depth / 60);

    const wallMaterial = new THREE.MeshStandardMaterial({ map: roomTex, color: 0xffffff, opacity: 1.0, transparent: true, roughness: 0.8 });
    mesh.add(createRoomWalls(width, WALL_HEIGHT, depth, t, wallMaterial));

    // Floor
    const floorMaterial = getFloorMaterial(texType);
    const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(width, 2, depth), floorMaterial);
    floorMesh.position.set(0, 1, 0); 
    floorMesh.receiveShadow = true;
    mesh.add(floorMesh);

    mesh.position.set(center.x, el.floor * WALL_HEIGHT, center.z);
    return mesh;
}
function buildStandardRoom(el, center, WALL_HEIGHT, useReal3D, isColliding, SCALE, roomColor) {
    const mesh = new THREE.Group();
    const t = 4 * SCALE;
    const { width, depth } = center;

    let material; // 🌟 Declared properly as 'let'

    if (useReal3D && !isColliding) {
        // Create the high-definition textured material directly
        const texType = getTextureForRoom(el.type);
        const roomTex = getProceduralTexture(texType).clone();
        roomTex.repeat.set(width / 60, depth / 60);
        roomTex.needsUpdate = true;
        
        material = new THREE.MeshStandardMaterial({ 
            map: roomTex, 
            color: 0xffffff, 
            opacity: 1.0, 
            transparent: true,
            roughness: texType === 'tile' ? 0.2 : 0.8 
        });
    } else {
        // 🌟 PHASE 1 - OPTIMIZATION: Pull from cache instead of creating 100 duplicates!
        material = getCachedSolidMaterial(roomColor, isColliding ? 0.95 : 0.85);
    }

    if (useReal3D && !isColliding) {
        // ⚡ OPTIMIZATION: Using the new createRoomWalls helper!
        mesh.add(createRoomWalls(width, WALL_HEIGHT, depth, t, material));
    } else {
        const solid = new THREE.Mesh(new THREE.BoxGeometry(width, WALL_HEIGHT, depth), material);
        solid.position.y = WALL_HEIGHT / 2;
        const edges = new THREE.EdgesGeometry(solid.geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: isColliding ? 0x991b1b : 0xffffff, linewidth: 2 }));
        solid.add(line);
        mesh.add(solid);
    }

    mesh.position.set(center.x, el.floor * WALL_HEIGHT, center.z);
    return mesh;
}
function build3DSlabs(SCALE, I, WALL_HEIGHT, useReal3D) {
    const floors = elements.map(e => e.floor);
    const maxFloor = floors.length > 0 ? Math.max(...floors) : 0;
    
    // 🌟 REFACTORED: Get dimensions and center points from helper
    const { inW, inH, CX, CY } = get3DEnvironmentParams();

    for (let f = 0; f <= maxFloor; f++) {
        const slabY = ((f + 1) * WALL_HEIGHT);
        
        // 🌟 FIX 5: STAIRCASE SLAB CUTOUTS 🌟
        const shape = new THREE.Shape();
        shape.moveTo(-inW/2, -inH/2);
        shape.lineTo(inW/2, -inH/2);
        shape.lineTo(inW/2, inH/2);
        shape.lineTo(-inW/2, inH/2);
        shape.lineTo(-inW/2, -inH/2);
        
        // Carve holes for staircases on the floor BELOW this slab
        elements.forEach(el => {
            if (el.type === 'staircase' && el.floor === f - 1) {
                const hole = new THREE.Path();
                // Map 2D coordinates to 3D center-origin coords
                const hx = (el.x * SCALE) - (inW/2);
                const hz = (el.y * SCALE) - (inH/2); 
                const hw = el.w * SCALE;
                const hd = el.h * SCALE;
                
                hole.moveTo(hx, hz);
                hole.lineTo(hx + hw, hz);
                hole.lineTo(hx + hw, hz + hd);
                hole.lineTo(hx, hz + hd);
                hole.lineTo(hx, hz);
                shape.holes.push(hole);
            }
        });

        const extrudeSettings = { depth: 10 * SCALE, bevelEnabled: false };
        const slabGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        slabGeometry.rotateX(Math.PI / 2); // Lay it flat

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
function build3DFixturesOldv2(SCALE, I, WALL_HEIGHT, useReal3D) {
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
// ==========================================
// 🧱 PHASE 3: GPU DRAW CALL REDUCTION (Fixtures)
// ==========================================
function build3DFixtures(SCALE, I, WALL_HEIGHT, useReal3D) {
    // 1. Fetch Shared Materials (Zero GPU duplication)
    const frameMat = getCachedSolidMaterial(0x334155, 1.0);
    const woodMat = getCachedSolidMaterial(0x8b4513, 1.0);
    
    let glassMat = SOLID_MAT_CACHE['glass'];
    if (!glassMat) {
        glassMat = new THREE.MeshStandardMaterial({ color: 0x98d8c8, transparent: true, opacity: 0.25, side: THREE.DoubleSide, roughness: 0.1, metalness: 0.1 });
        SOLID_MAT_CACHE['glass'] = glassMat;
    }

    // 2. Arrays to hold our batched geometries
    const frameGeoms = [];
    const woodGeoms = [];
    const glassGeoms = [];

    fixtures.forEach(fix => {
        const el = elements[fix.roomId];
        if (!el || el.floor !== currentFloor) return;

        const isDoor = fix.type === 'door';
        const width = fix.size * SCALE;
        const height = isDoor ? (80 * SCALE) : (40 * SCALE);
        const depth = 8 * SCALE; 
        const ft = 3 * SCALE; 
        
        const isHoriz = (fix.edge === 'top' || fix.edge === 'bottom');
        const fw = isHoriz ? width : depth;
        const fd = isHoriz ? depth : width;

        // Create a temporary dummy group for local positioning (Never added to scene!)
        const dummyGroup = new THREE.Group();

        if (isHoriz) {
            const fL = new THREE.Mesh(new THREE.BoxGeometry(ft, height, fd)); fL.position.set(-fw/2 + ft/2, 0, 0);
            const fR = new THREE.Mesh(new THREE.BoxGeometry(ft, height, fd)); fR.position.set(fw/2 - ft/2, 0, 0);
            const fT = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, fd)); fT.position.set(0, height/2 - ft/2, 0);
            dummyGroup.add(fL, fR, fT);
            if (!isDoor) { const fB = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, fd)); fB.position.set(0, -height/2 + ft/2, 0); dummyGroup.add(fB); }
            
            const pW = fw - (ft * 2);
            const pH = isDoor ? height - ft : height - (ft * 2);
            const panel = new THREE.Mesh(new THREE.BoxGeometry(pW, pH, 2 * SCALE));
            panel.position.set(0, isDoor ? -ft/2 : 0, 0);
            if (isDoor && useReal3D) { panel.position.set(-pW/2 + ft, -ft/2, -pW/2); panel.rotation.y = Math.PI / 3; }
            
            panel.userData.matType = isDoor ? 'wood' : 'glass';
            dummyGroup.add(panel);
        } else {
            const fN = new THREE.Mesh(new THREE.BoxGeometry(fw, height, ft)); fN.position.set(0, 0, -fd/2 + ft/2);
            const fS = new THREE.Mesh(new THREE.BoxGeometry(fw, height, ft)); fS.position.set(0, 0, fd/2 - ft/2);
            const fT = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, fd)); fT.position.set(0, height/2 - ft/2, 0);
            dummyGroup.add(fN, fS, fT);
            if (!isDoor) { const fB = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, fd)); fB.position.set(0, -height/2 + ft/2, 0); dummyGroup.add(fB); }
            
            const pD = fd - (ft * 2);
            const pH = isDoor ? height - ft : height - (ft * 2);
            const panel = new THREE.Mesh(new THREE.BoxGeometry(2 * SCALE, pH, pD));
            panel.position.set(0, isDoor ? -ft/2 : 0, 0);
            if (isDoor && useReal3D) { panel.position.set(pD/2, -ft/2, -pD/2 + ft); panel.rotation.y = Math.PI / 3; }
            
            panel.userData.matType = isDoor ? 'wood' : 'glass';
            dummyGroup.add(panel);
        }

        // Global positioning
        const yPos = (el.floor * WALL_HEIGHT) + (height / 2) + (isDoor ? 0 : 40 * SCALE);
        let xPos = I.x + (el.x * SCALE);
        let zPos = I.z + (el.y * SCALE);

        if (fix.edge === 'bottom') { zPos = I.z + (el.y + el.h) * SCALE; xPos = I.x + (el.x + fix.offset) * SCALE; }
        else if (fix.edge === 'top') { zPos = I.z + (el.y * SCALE); xPos = I.x + (el.x + fix.offset) * SCALE; }
        else if (fix.edge === 'left') { xPos = I.x + (el.x * SCALE); zPos = I.z + (el.y + fix.offset) * SCALE; }
        else if (fix.edge === 'right') { xPos = I.x + (el.x + el.w) * SCALE; zPos = I.z + (el.y + fix.offset) * SCALE; }

        dummyGroup.position.set(xPos, yPos, zPos);
        dummyGroup.updateMatrixWorld(true);

        // 3. Extract mathematically perfect global geometries
        dummyGroup.children.forEach(child => {
            const geom = child.geometry.clone();
            geom.applyMatrix4(child.matrixWorld); // Converts local position to global!
            
            if (child.userData.matType === 'glass') glassGeoms.push(geom);
            else if (child.userData.matType === 'wood') woodGeoms.push(geom);
            else frameGeoms.push(geom); // Frames have no userData
        });
    });

    // 4. Batch and push to GPU!
    if (frameGeoms.length) {
        const merged = THREE.BufferGeometryUtils.mergeBufferGeometries(frameGeoms);
        const mesh = new THREE.Mesh(merged, frameMat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        buildingGroup.add(mesh);
    }
    if (woodGeoms.length) {
        const merged = THREE.BufferGeometryUtils.mergeBufferGeometries(woodGeoms);
        const mesh = new THREE.Mesh(merged, woodMat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        buildingGroup.add(mesh);
    }
    if (glassGeoms.length) {
        const merged = THREE.BufferGeometryUtils.mergeBufferGeometries(glassGeoms);
        const mesh = new THREE.Mesh(merged, glassMat);
        buildingGroup.add(mesh);
    }
}
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

// ==========================================
// 🧹 UPGRADED ENGINE OPTIMIZATION: MEMORY CLEANUP
// ==========================================
function disposeScene() {
    if (!buildingGroup) return;
    
    buildingGroup.traverse((child) => {
        if (child.isMesh) {
            // 1. Destroy Geometry
            if (child.geometry) child.geometry.dispose();
            
            // 2. Destroy Materials AND Textures
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat.map) mat.map.dispose(); // Delete Texture
                        mat.dispose(); // Delete Material
                    });
                } else {
                    if (child.material.map) child.material.map.dispose(); // Delete Texture
                    child.material.dispose(); // Delete Material
                }
            }
        }
    });
    
    buildingGroup.clear(); 
}

function update3DTransforms() {
    if (!is3DMode || !buildingGroup) return;
    const { SCALE, I } = get3DEnvironmentParams();
    buildingGroup.children.forEach(mesh => {
        if (mesh.userData && mesh.userData.isRoom) {
            const index = mesh.userData.roomIndex;
            const el = elements[index];
            if (el) {
                const width = el.w * SCALE;
                const depth = el.h * SCALE; 
                const centerX = I.x + (el.x * SCALE) + (width / 2);
                const centerZ = I.z + (el.y * SCALE) + (depth / 2);
                mesh.position.x = centerX;
                mesh.position.z = centerZ;
            }
        }
    });
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
    const potMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 }); 
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(6, 4, 12, 8), potMat);
    pot.position.y = 6;
    group.add(pot);
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 });
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(10, 0), plantMat);
    leaves.position.y = 16;
    group.add(leaves);    
    return group;
}
function getRoomCenter(el, SCALE, I) {
    const width = el.w * SCALE;
    const depth = el.h * SCALE;
    return {
        x: I.x + (el.x * SCALE) + (width / 2),
        z: I.z + (el.y * SCALE) + (depth / 2),
        width,
        depth
    };
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
