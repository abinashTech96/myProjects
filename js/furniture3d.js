// =========================================
// 3D FURNITURE FACTORY (furniture3d.js)
// HIGH-FIDELITY COMPOSITE MESHES
// =========================================

const FurnitureFactory = {
    // Reusable Materials
    mats: {
        wood: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 }),
        fabricLight: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 1.0 }),
        fabricDark: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 1.0 }),
        metal: new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 }),
        glass: new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.4, roughness: 0.1 }),
        ceramic: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 }),
        blackPlastic: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 }),
        marble: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 })
    },

    buildBed(group, w, d) {
        // Wooden Frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 10, d), this.mats.wood);
        frame.position.y = 5;
        // Mattress
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(w - 4, 12, d - 4), this.mats.fabricLight);
        mattress.position.y = 16;
        // Headboard
        const head = new THREE.Mesh(new THREE.BoxGeometry(w, 40, 6), this.mats.wood);
        head.position.set(0, 20, -d/2 + 3);
        // Pillows
        const pGeo = new THREE.BoxGeometry(w/2 - 10, 4, 12);
        const p1 = new THREE.Mesh(pGeo, this.mats.fabricLight); p1.position.set(-w/4 + 2, 24, -d/2 + 15); p1.rotation.x = Math.PI/12;
        const p2 = new THREE.Mesh(pGeo, this.mats.fabricLight); p2.position.set(w/4 - 2, 24, -d/2 + 15); p2.rotation.x = Math.PI/12;
        
        group.add(frame, mattress, head, p1, p2);
    },

    buildSofa(group, w, d) {
        // Base & Backrest
        const base = new THREE.Mesh(new THREE.BoxGeometry(w, 10, d), this.mats.fabricDark); base.position.y = 5;
        const back = new THREE.Mesh(new THREE.BoxGeometry(w, 24, 8), this.mats.fabricDark); back.position.set(0, 22, -d/2 + 4);
        const armL = new THREE.Mesh(new THREE.BoxGeometry(8, 20, d), this.mats.fabricDark); armL.position.set(-w/2 + 4, 15, 0);
        const armR = new THREE.Mesh(new THREE.BoxGeometry(8, 20, d), this.mats.fabricDark); armR.position.set(w/2 - 4, 15, 0);
        
        // 3 Seat Cushions
        for(let i=-1; i<=1; i++) {
            const cushion = new THREE.Mesh(new THREE.BoxGeometry((w-16)/3 - 1, 6, d-10), this.mats.fabricDark);
            cushion.position.set(i * ((w-16)/3), 13, 1);
            group.add(cushion);
        }
        group.add(base, back, armL, armR);
    },

    buildTVUnit(group, w, d) {
        // Console Base
        const base = new THREE.Mesh(new THREE.BoxGeometry(w, 16, d), this.mats.wood); base.position.y = 8;
        // Screen
        const screen = new THREE.Mesh(new THREE.BoxGeometry(w*0.8, 30, 2), this.mats.blackPlastic); screen.position.set(0, 35, -d/2 + 6);
        // TV Stand
        const stand = new THREE.Mesh(new THREE.BoxGeometry(16, 4, 8), this.mats.metal); stand.position.set(0, 18, -d/2 + 6);
        group.add(base, screen, stand);
    },

    buildWardrobe(group, w, d) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, 84, d), this.mats.wood); body.position.y = 42;
        // Doors (Slightly lighter to show depth)
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.8 });
        const doorL = new THREE.Mesh(new THREE.BoxGeometry(w/2 - 1, 80, 2), doorMat); doorL.position.set(-w/4, 42, d/2 + 1);
        const doorR = new THREE.Mesh(new THREE.BoxGeometry(w/2 - 1, 80, 2), doorMat); doorR.position.set(w/4, 42, d/2 + 1);
        // Handles
        const handle = new THREE.CylinderGeometry(0.5, 0.5, 12);
        const hL = new THREE.Mesh(handle, this.mats.metal); hL.position.set(-2, 42, d/2 + 3);
        const hR = new THREE.Mesh(handle, this.mats.metal); hR.position.set(2, 42, d/2 + 3);
        group.add(body, doorL, doorR, hL, hR);
    },

    buildBathtub(group, w, d) {
        // Hollow Bathtub built from 5 panels
        const t = 4; // Thickness
        const h = 24; // Height
        const floor = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), this.mats.ceramic); floor.position.y = t/2;
        const wN = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), this.mats.ceramic); wN.position.set(0, h/2, -d/2 + t/2);
        const wS = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), this.mats.ceramic); wS.position.set(0, h/2, d/2 - t/2);
        const wE = new THREE.Mesh(new THREE.BoxGeometry(t, h, d-t*2), this.mats.ceramic); wE.position.set(w/2 - t/2, h/2, 0);
        const wW = new THREE.Mesh(new THREE.BoxGeometry(t, h, d-t*2), this.mats.ceramic); wW.position.set(-w/2 + t/2, h/2, 0);
        
        // Faucet
        const faucet = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 6), this.mats.metal);
        faucet.position.set(0, h + 3, -d/2 + t); faucet.rotation.x = Math.PI/2;
        
        group.add(floor, wN, wS, wE, wW, faucet);
    },

    buildToiletSeat(group, w, d) {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 16), this.mats.ceramic); base.position.set(0, 8, d/4);
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(9, 6, 8), this.mats.ceramic); bowl.position.set(0, 16, d/4);
        const tank = new THREE.Mesh(new THREE.BoxGeometry(18, 16, 10), this.mats.ceramic); tank.position.set(0, 24, -d/2 + 5);
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 1), this.mats.ceramic);
        lid.position.set(0, 20.5, 0); lid.rotation.x = -Math.PI/4; // Open lid
        group.add(base, bowl, tank, lid);
    },

    buildBookshelf(group, w, d) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 84, d), this.mats.wood); frame.position.y = 42;
        const inner = new THREE.Mesh(new THREE.BoxGeometry(w-4, 76, d+1), new THREE.MeshStandardMaterial({color: 0x1e293b})); inner.position.set(0, 42, 1);
        group.add(frame, inner);

        // Add shelves and random colored blocks as books
        const colors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x6366f1];
        for(let i=1; i<=4; i++) {
            const shelfY = 42 - 38 + (i * 15.2);
            const board = new THREE.Mesh(new THREE.BoxGeometry(w-4, 2, d-2), this.mats.wood); board.position.set(0, shelfY, 0);
            group.add(board);
            
            // Generate 3-5 random books per shelf
            for(let b=0; b<4; b++) {
                const bMat = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
                const book = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 8), bMat);
                book.position.set(-w/2 + 8 + (b*3) + (Math.random()*10), shelfY + 6, 0);
                // Randomly lean some books
                if (Math.random() > 0.7) book.rotation.z = Math.PI/12;
                group.add(book);
            }
        }
    },

    buildDining(group, w, d) {
        // Table
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), this.mats.wood); top.position.y = 30;
        const legGeom = new THREE.BoxGeometry(4, 29, 4);
        [[-1,-1], [1,-1], [-1,1], [1,1]].forEach(pos => {
            const leg = new THREE.Mesh(legGeom, this.mats.metal);
            leg.position.set(pos[0] * (w/2 - 4), 14.5, pos[1] * (d/2 - 4));
            group.add(leg);
        });
        group.add(top);

        // Add 4 Chairs tucked in
        const buildSmallChair = (x, z, rot) => {
            const cGroup = new THREE.Group();
            const seat = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 16), this.mats.fabricDark); seat.position.y = 16;
            const back = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 2), this.mats.wood); back.position.set(0, 24, -7);
            const legs = new THREE.Mesh(new THREE.BoxGeometry(14, 15, 14), this.mats.metal); legs.position.y = 7.5;
            cGroup.add(seat, back, legs);
            cGroup.position.set(x, 0, z);
            cGroup.rotation.y = rot;
            return cGroup;
        };
        group.add(buildSmallChair(0, d/2 + 2, Math.PI));    // North
        group.add(buildSmallChair(0, -d/2 - 2, 0));         // South
        group.add(buildSmallChair(w/2 + 2, 0, Math.PI/2));  // East
        group.add(buildSmallChair(-w/2 - 2, 0, -Math.PI/2));// West
    },

    buildFridge(group, w, d) {
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, 72, d), this.mats.metal); body.position.y = 36;
        const split = new THREE.Mesh(new THREE.BoxGeometry(w+1, 2, d+1), this.mats.blackPlastic); split.position.set(0, 48, 0); // Freezer top
        
        const hGeo = new THREE.CylinderGeometry(1, 1, 16);
        const handle1 = new THREE.Mesh(hGeo, this.mats.ceramic); handle1.position.set(-w/2 + 4, 30, d/2 + 2);
        const handle2 = new THREE.Mesh(hGeo, this.mats.ceramic); handle2.position.set(-w/2 + 4, 60, d/2 + 2);
        
        group.add(body, split, handle1, handle2);
    },

    buildStove(group, w, d) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(w, 36, d), this.mats.metal); base.position.y = 18;
        // Glass top
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), this.mats.blackPlastic); top.position.y = 37;
        // Oven Window
        const window = new THREE.Mesh(new THREE.BoxGeometry(w-8, 20, 2), this.mats.glass); window.position.set(0, 16, d/2 + 1);
        // 4 Burners
        for(let x of [-1, 1]) {
            for(let z of [-1, 1]) {
                const burner = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1), new THREE.MeshStandardMaterial({color: 0xef4444}));
                burner.position.set(x * (w/4), 38, z * (d/4));
                group.add(burner);
            }
        }
        group.add(base, top, window);
    },

    buildIsland(group, w, d) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(w-4, 34, d-4), this.mats.wood); base.position.y = 17;
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), this.mats.marble); top.position.y = 35;
        group.add(base, top);
    },

    buildPlant(group, w, d) {
        const potMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 });
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(w/2.5, w/4, 16, 12), potMat); pot.position.y = 8;
        
        // Dirt
        const dirt = new THREE.Mesh(new THREE.CylinderGeometry(w/2.6, w/2.6, 1, 12), new THREE.MeshStandardMaterial({color: 0x3e2723}));
        dirt.position.y = 15;
        
        // Leaves (3 overlapping spheres for a bushy look)
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 });
        const l1 = new THREE.Mesh(new THREE.IcosahedronGeometry(w/2.2, 1), leafMat); l1.position.set(0, 24, 0);
        const l2 = new THREE.Mesh(new THREE.IcosahedronGeometry(w/2.5, 1), leafMat); l2.position.set(-4, 20, 4);
        const l3 = new THREE.Mesh(new THREE.IcosahedronGeometry(w/2.5, 1), leafMat); l3.position.set(4, 20, -4);
        
        group.add(pot, dirt, l1, l2, l3);
    },

    // --- STANDARD FALLBACKS ---
    buildCounter(group, w, d) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(w, 34, d), this.mats.wood); base.position.y = 17;
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), this.mats.marble); top.position.y = 35;
        group.add(base, top);
    },
    buildCoffeeTable(group, w, d) {
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), this.mats.glass); top.position.y = 16;
        const base = new THREE.Mesh(new THREE.BoxGeometry(w-4, 15, d-4), this.mats.wood); base.position.y = 7.5;
        group.add(top, base);
    },
    buildDesk(group, w, d) {
        const top = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), this.mats.wood); top.position.y = 30;
        const legsL = new THREE.Mesh(new THREE.BoxGeometry(4, 29, d), this.mats.metal); legsL.position.set(-w/2 + 2, 14.5, 0);
        const legsR = new THREE.Mesh(new THREE.BoxGeometry(4, 29, d), this.mats.metal); legsR.position.set(w/2 - 2, 14.5, 0);
        group.add(top, legsL, legsR);
    },
    buildChair(group, w, d) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), this.mats.fabricDark); seat.position.y = 18;
        const back = new THREE.Mesh(new THREE.BoxGeometry(w, 18, 2), this.mats.fabricDark); back.position.set(0, 27, -d/2 + 1);
        group.add(seat, back);
    },
    buildNightstand(group, w, d) {
        const stand = new THREE.Mesh(new THREE.BoxGeometry(w, 24, d), this.mats.wood); stand.position.y = 12;
        const drawer = new THREE.Mesh(new THREE.BoxGeometry(w+1, 2, d+1), this.mats.blackPlastic); drawer.position.set(0, 16, 0);
        group.add(stand, drawer);
    },
    buildRug(group, w, d) {
        const rug = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), new THREE.MeshStandardMaterial({color: 0x94a3b8})); rug.position.y = 1;
        const border = new THREE.Mesh(new THREE.BoxGeometry(w+2, 0.5, d+2), new THREE.MeshStandardMaterial({color: 0x475569})); border.position.y = 0.5;
        group.add(rug, border);
    }
};