// =========================================
// core/parapet.js
// 🌟 FULLY MODULAR PARAPET SYSTEM
// =========================================

const ParapetModule = {
    // 1. STATE MANAGER
    config: {
        heightOffset: 0,
        thicknessOffset: 0,
        // ✨ NEW CONTROLS BELOW:
        elevationOffset: 0,    
        theme: 'midnight-aurora', 
        accentColor: '#38bdf8',  
        glassOpacity: 0.4,       
        glowIntensity: 1.2
    },

    // 2. MAIN ROUTER
    build(useReal3D) {
        const { SCALE, inW, inH, CX, CY, WALL_HEIGHT } = get3DEnvironmentParams();
        const styleDropdown = document.getElementById('parapetStyleSelect');
        const currentStyle = styleDropdown ? styleDropdown.value : 'premium-canopy';

        if (currentStyle === 'none') return;

        let maxFloor = -1;
        elements.forEach(el => {
            if (!el.isFurniture && el.floor > maxFloor) maxFloor = el.floor;
        });
        if (maxFloor < 0) return;

        const bounds = this.getBounds(SCALE);
        if (!bounds) return;

        const w = (bounds.maxX - bounds.minX);
        const d = (bounds.maxZ - bounds.minZ);
        const centerX = bounds.minX + (w / 2) + CX - (inW / 2);
        const centerZ = bounds.minZ + (d / 2) + CY - (inH / 2);
        const baseY = ((maxFloor + 1) * WALL_HEIGHT) + (this.config.elevationOffset * SCALE);

        const effectiveBaseY = this.buildTerraceSlab(w, d, centerX, centerZ, baseY, SCALE);
        const frontZ = centerZ + (d / 2);

        // Routing to distinct logic methods
        if (currentStyle === 'premium-canopy') this.styles.buildPremiumCanopy(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ);
        else if (currentStyle === 'modern-brown') this.styles.buildModernBrown(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ);
        else if (currentStyle === 'geo-interlock') this.styles.buildGeoInterlock(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ);
        else if (currentStyle === 'classic-curve') this.styles.buildClassicCurve(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ);
        else if (currentStyle === 'modern-glass') this.styles.buildModernGlass(SCALE, w, d, centerX, centerZ, effectiveBaseY);
        // ✨ NEW STYLES ADDED HERE:
        else if (currentStyle === 'neo-brutalist') this.styles.buildNeoBrutalist(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ);
        else if (currentStyle === 'zen-pergola') this.styles.buildZenPergola(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ);
        else if (currentStyle === 'cyber-cantilever') this.styles.buildCyberCantilever(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ);

        else if (currentStyle === 'standard') this.styles.buildStandardWall(SCALE, w, d, centerX, centerZ, effectiveBaseY, useReal3D);
    },

    // ✨ NEW MATERIAL GENERATOR
    getMaterials(SCALE) {
        const cfg = this.config;
        const accentHex = parseInt(cfg.accentColor.replace('#', '0x'), 16);

        let primaryHex = 0xf8fafc, secondaryHex = 0x0f172a, woodHex = 0x3e2723, activeAccentHex = accentHex;

        if (cfg.theme === 'midnight-aurora') {
            primaryHex = 0x1e293b; secondaryHex = 0x020617; activeAccentHex = 0x38bdf8;
        } else if (cfg.theme === 'cyberpunk') {
            primaryHex = 0x180828; secondaryHex = 0x090014; activeAccentHex = 0xf43f5e; woodHex = 0x4c0519;
        } else if (cfg.theme === 'warm-wood') {
            primaryHex = 0xfef3c7; secondaryHex = 0x451a03; activeAccentHex = 0xd97706; woodHex = 0x78350f;
        } else if (cfg.theme === 'monochrome-slate') {
            primaryHex = 0x64748b; secondaryHex = 0x0f172a; activeAccentHex = 0xcbd5e1;
        }

        return {
            matPrimary: new THREE.MeshStandardMaterial({ color: primaryHex, roughness: 0.8 }),
            matSecondary: new THREE.MeshStandardMaterial({ color: secondaryHex, roughness: 0.9 }),
            matAccent: new THREE.MeshStandardMaterial({ color: activeAccentHex, roughness: 0.4, metalness: 0.2 }),
            matWood: new THREE.MeshStandardMaterial({ color: woodHex, roughness: 0.85 }),
            matSteel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 }),
            matGlass: new THREE.MeshStandardMaterial({ color: activeAccentHex, transparent: true, opacity: cfg.glassOpacity, metalness: 0.8, roughness: 0.1, side: THREE.DoubleSide }),
            matGlow: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: activeAccentHex, emissiveIntensity: cfg.glowIntensity })
        };
    },

    // 3. HELPER METHODS
    getBounds(SCALE) {
        let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
        elements.forEach(el => {
            if (!el.isFurniture && el.floor === Math.max(...elements.map(e => e.floor))) {
                const rx = el.x * SCALE, rz = el.y * SCALE, rw = el.w * SCALE, rd = el.h * SCALE;
                if (rx < minX) minX = rx; if (rz < minZ) minZ = rz;
                if (rx + rw > maxX) maxX = rx + rw; if (rz + rd > maxZ) maxZ = rz + rd;
            }
        });
        return (maxX === -Infinity) ? null : { minX, minZ, maxX, maxZ };
    },

    addMesh(mesh) {
        mesh.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.userData = { isParapet: true };
            }
        });
        Engine3D.buildingGroup.add(mesh)
    },

    buildTerraceSlab(w, d, centerX, centerZ, baseY, SCALE) {
        const slabT = 2 * SCALE;
        const matTerrace = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });
        const roofSlab = new THREE.Mesh(new THREE.BoxGeometry(w, slabT, d), matTerrace);
        roofSlab.position.set(centerX, baseY + (slabT / 2), centerZ);
        this.addMesh(roofSlab);
        return baseY + slabT;
    },

    buildPerimeterEnclosure(w, d, centerX, centerZ, baseY, t, h, material) {
        const pN = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), material); pN.position.set(centerX, baseY + h/2, centerZ - d/2 + t/2);
        const pE = new THREE.Mesh(new THREE.BoxGeometry(t, h, d - t), material); pE.position.set(centerX + w/2 - t/2, baseY + h/2, centerZ + t/2);
        const pW = new THREE.Mesh(new THREE.BoxGeometry(t, h, d - t), material); pW.position.set(centerX - w/2 + t/2, baseY + h/2, centerZ + t/2);
        [pN, pE, pW].forEach(m => this.addMesh(m));
    },

    // 4. UI POPUP CONTROLLER
    getEditorHTML() {
        return `
            <div class="parapet-header">
                <span class="parapet-title">⚙️ PARAPET STUDIO</span>
                <button class="parapet-close-btn" onclick="ParapetModule.closeEditor()">✕</button>
            </div>
            <div class="parapet-content">
                <!-- 2x2 GRID FOR COMPACT CONTROLS -->
                <div class="parapet-grid">
                    <div class="parapet-group">
                        <div class="parapet-row">
                            <label class="parapet-label">Height</label>
                            <span id="val-heightOffset" class="parapet-val-badge">${this.config.heightOffset}</span>
                        </div>
                        <input type="range" class="parapet-slider" min="-15" max="30" value="${this.config.heightOffset}" 
                            oninput="window._updateParapetConfig('heightOffset', this.value, parseInt)">
                    </div>
                    
                    <div class="parapet-group">
                        <div class="parapet-row">
                            <label class="parapet-label">Thickness</label>
                            <span id="val-thicknessOffset" class="parapet-val-badge">${this.config.thicknessOffset}</span>
                        </div>
                        <input type="range" class="parapet-slider" min="0" max="15" value="${this.config.thicknessOffset}" 
                            oninput="window._updateParapetConfig('thicknessOffset', this.value, parseInt)">
                    </div>

                    <div class="parapet-group">
                        <div class="parapet-row">
                            <label class="parapet-label">Elevation</label>
                            <span id="val-elevationOffset" class="parapet-val-badge">${this.config.elevationOffset}</span>
                        </div>
                        <input type="range" class="parapet-slider" min="-10" max="25" value="${this.config.elevationOffset}" 
                            oninput="window._updateParapetConfig('elevationOffset', this.value, parseInt)">
                    </div>

                    <div class="parapet-group">
                        <div class="parapet-row">
                            <label class="parapet-label">Opacity</label>
                            <span id="val-glassOpacity" class="parapet-val-badge">${this.config.glassOpacity}</span>
                        </div>
                        <input type="range" class="parapet-slider" min="0.1" max="1.0" step="0.05" value="${this.config.glassOpacity}" 
                            oninput="window._updateParapetConfig('glassOpacity', this.value, parseFloat)">
                    </div>
                </div>

                <hr class="parapet-divider">

                <!-- FULL WIDTH THEME CONTROLS -->
                <div class="parapet-group">
                    <label class="parapet-label">Theme Preset</label>
                    <select class="parapet-select" onchange="window._updateParapetConfig('theme', this.value, String)">
                        <option value="midnight-aurora" ${this.config.theme === 'midnight-aurora' ? 'selected' : ''}>🌌 Midnight Aurora</option>
                        <option value="cyberpunk" ${this.config.theme === 'cyberpunk' ? 'selected' : ''}>🌆 Cyberpunk Neon</option>
                        <option value="warm-wood" ${this.config.theme === 'warm-wood' ? 'selected' : ''}>🪵 Warm Wood</option>
                        <option value="monochrome-slate" ${this.config.theme === 'monochrome-slate' ? 'selected' : ''}>🗿 Slate</option>
                        <option value="custom" ${this.config.theme === 'custom' ? 'selected' : ''}>🎯 Custom Accent</option>
                    </select>
                </div>

                <div class="parapet-row">
                    <label class="parapet-label">Accent Color</label>
                    <input type="color" class="parapet-color-picker" value="${this.config.accentColor}" 
                        onchange="window._updateParapetConfig('accentColor', this.value, String)">
                </div>

                <div class="parapet-group" style="margin-bottom: 5px;">
                    <div class="parapet-row">
                        <label class="parapet-label">Glow Intensity</label>
                        <span id="val-glowIntensity" class="parapet-val-badge">${this.config.glowIntensity}</span>
                    </div>
                    <input type="range" class="parapet-slider" min="0.0" max="3.0" step="0.1" value="${this.config.glowIntensity}" 
                        oninput="window._updateParapetConfig('glowIntensity', this.value, parseFloat)">
                </div>
            </div>
        `;
    },
    openEditor() {
        let popup = document.getElementById('parapet-editor-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'parapet-editor-popup';
            popup.className = 'parapet-panel'; 
            document.body.appendChild(popup);
        }

        // ✨ THE FIX: Debouncing for ultra-smooth sliders
        let renderTimeout;
        window._updateParapetConfig = (key, val, parseFn = parseFloat) => {
            ParapetModule.config[key] = parseFn(val);
            
            // 1. Instantly update the text value in the UI (feels responsive)
            const displayEl = document.getElementById(`val-${key}`);
            if (displayEl) displayEl.innerText = val;
            
            // 2. Delay the heavy 3D rendering slightly so the slider doesn't lock up
            clearTimeout(renderTimeout);
            renderTimeout = setTimeout(() => {
                if (typeof request3DUpdate === 'function') request3DUpdate();
            }, 40); // 40ms delay allows the slider to glide smoothly
        };

        popup.innerHTML = this.getEditorHTML();
        popup.style.display = 'block';
    },
    closeEditor() {
        const popup = document.getElementById('parapet-editor-popup');
        if (popup) popup.style.display = 'none';
    },

    // 5. INDIVIDUAL DESIGN BUILDERS
    styles: {
        buildPremiumCanopy(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ) {
            // Incorporating User UI Modifiers
            const extraH = ParapetModule.config.heightOffset * SCALE;
            const extraT = ParapetModule.config.thicknessOffset * SCALE;

            // Add extraH to wallH, and extraT to the thickness variables!
            const wallH = (30 * SCALE) + extraH; 
            const wallT = (5 * SCALE) + extraT; 
            const capH = 4 * SCALE; 
            const capT = (9 * SCALE) + extraT;

            // const matWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
            // const matBlack = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
            // const matPink = new THREE.MeshStandardMaterial({ color: 0xfca5a5, roughness: 0.9 });
            // const matOrange = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
            // const matBlue = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 1.0 });

            const { matPrimary: matWhite, matSecondary: matBlack, matAccent: matPink, matGlow: matOrange, matPrimary: matBlue } = ParapetModule.getMaterials(SCALE);

            const featW = w * 0.45; 
            const featH = (55 * SCALE) + extraH; 
            const featT = (8 * SCALE) + extraT;
            const featX = centerX - (w / 2) + (featW / 2);

            const featureWall = new THREE.Mesh(new THREE.BoxGeometry(featW, featH, featT), matBlue);
            featureWall.position.set(featX, effectiveBaseY + (featH / 2), frontZ - (featT / 2));
            ParapetModule.addMesh(featureWall);
            
            const ribW = 4 * SCALE, ribH = featH + (5 * SCALE), ribT = 2 * SCALE;
            for (let i = 0; i < 3; i++) {
                const rib = new THREE.Mesh(new THREE.BoxGeometry(ribW, ribH, ribT), matPink);
                rib.position.set(featX + (featW/4) + (i * (ribW + 2*SCALE)), effectiveBaseY + (ribH / 2), frontZ + (ribT/2) - (featT/2));
                ParapetModule.addMesh(rib);
            }

            const boxW = 18 * SCALE, boxH = 8 * SCALE, boxT = 4 * SCALE;
            const boxGroup = new THREE.Group();
            const tB = 2 * SCALE; 
            const bTop = new THREE.Mesh(new THREE.BoxGeometry(boxW, tB, boxT), matPink); bTop.position.set(0, boxH/2 - tB/2, 0);
            const bBot = new THREE.Mesh(new THREE.BoxGeometry(boxW, tB, boxT), matPink); bBot.position.set(0, -boxH/2 + tB/2, 0);
            const bLef = new THREE.Mesh(new THREE.BoxGeometry(tB, boxH - tB*2, boxT), matPink); bLef.position.set(-boxW/2 + tB/2, 0, 0);
            const bRig = new THREE.Mesh(new THREE.BoxGeometry(tB, boxH - tB*2, boxT), matPink); bRig.position.set(boxW/2 - tB/2, 0, 0);
            boxGroup.add(bTop, bBot, bLef, bRig);
            boxGroup.position.set(featX - (featW/4), effectiveBaseY + 25*SCALE + extraH/2, frontZ + (boxT/2) - (featT/2)); 
            ParapetModule.addMesh(boxGroup);

            const canW = w * 0.65, canD = 35 * SCALE, canT = 4 * SCALE;
            const canopy = new THREE.Mesh(new THREE.BoxGeometry(canW, canT, canD), matWhite);
            canopy.position.set(centerX + (w/2) - (canW/2) + (5*SCALE), effectiveBaseY + featH, frontZ - (canD/2) + (5*SCALE));
            canopy.rotation.z = 0.05; 
            ParapetModule.addMesh(canopy);
            
            const ring = new THREE.Mesh(new THREE.CylinderGeometry(8*SCALE, 8*SCALE, canT + 2*SCALE, 32), matOrange);
            ring.position.set(centerX + (w*0.3), effectiveBaseY + featH, frontZ - 15*SCALE);
            ParapetModule.addMesh(ring);
            
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2.5*SCALE, 2.5*SCALE, featH, 16), matWhite);
            pillar.position.set(centerX + (w*0.3), effectiveBaseY + (featH/2), frontZ - 15*SCALE);
            ParapetModule.addMesh(pillar);

            const railBaseH = 10 * SCALE, railT = (4 * SCALE) + extraT;
            ParapetModule.buildPerimeterEnclosure(w, d, centerX, centerZ, effectiveBaseY, railT, railBaseH, matWhite);
            const bS = new THREE.Mesh(new THREE.BoxGeometry(w - featW, railBaseH, railT), matWhite); 
            bS.position.set(centerX + featW/2, effectiveBaseY + railBaseH/2, frontZ - railT/2);
            ParapetModule.addMesh(bS);

            function buildRailingSegment(startX, startZ, endX, endZ, length) {
                const spacing = 20 * SCALE, count = Math.floor(length / spacing);
                const dx = (endX - startX) / count, dz = (endZ - startZ) / count;
                for (let i = 0; i <= count; i++) {
                    const px = startX + (dx * i), pz = startZ + (dz * i);
                    const post = new THREE.Mesh(new THREE.BoxGeometry(6*SCALE, 20*SCALE + extraH/2, 6*SCALE), matBlack);
                    post.position.set(px, effectiveBaseY + railBaseH + (10*SCALE) + extraH/4, pz);
                    ParapetModule.addMesh(post);
                    
                    const cap = new THREE.Mesh(new THREE.BoxGeometry(7*SCALE, 2*SCALE, 7*SCALE), matWhite);
                    cap.position.set(px, effectiveBaseY + railBaseH + (21*SCALE) + extraH/2, pz);
                    ParapetModule.addMesh(cap);

                    if (i < count) {
                        const rLen = Math.sqrt(dx*dx + dz*dz), rCx = px + dx/2, rCz = pz + dz/2, angle = Math.atan2(dx, dz); 
                        [12*SCALE, 18*SCALE].forEach((h, idx) => {
                            const rail = new THREE.Mesh(new THREE.BoxGeometry(2*SCALE, 1.5*SCALE, rLen), matBlack);
                            rail.position.set(rCx, effectiveBaseY + railBaseH + h + (extraH/4 * (idx+1)), rCz);
                            rail.rotation.y = angle;
                            ParapetModule.addMesh(rail);
                        });
                    }
                }
            }
            buildRailingSegment(centerX + w/2 - railT/2, frontZ - railT/2, centerX + featW/2, frontZ - railT/2, w/2 - featW/2); 
            buildRailingSegment(centerX + w/2 - railT/2, centerZ - d/2 + railT/2, centerX + w/2 - railT/2, frontZ - railT/2, d); 
            buildRailingSegment(centerX - w/2 + railT/2, centerZ - d/2 + railT/2, centerX + w/2 - railT/2, centerZ - d/2 + railT/2, w); 
            buildRailingSegment(centerX - w/2 + railT/2, centerZ - d/2 + railT/2, centerX - w/2 + railT/2, frontZ - railT/2, d); 
        },

        buildModernBrown(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ) {
            const extraH = ParapetModule.config.heightOffset * SCALE;
            const extraT = ParapetModule.config.thicknessOffset * SCALE;

            // const matBrown = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
            // const matWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
            // const matSteel = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.6 });
            // const matDark = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });

            const { matWood: matBrown, matPrimary: matWhite, matSteel: matSteel, matSecondary: matDark } = ParapetModule.getMaterials(SCALE);

            const wallT = (6 * SCALE) + extraT;
            
            // Perimeter Enclosure (N, E, W)
            ParapetModule.buildPerimeterEnclosure(w, d, centerX, centerZ, effectiveBaseY, wallT, (30 * SCALE) + extraH, matDark);

            // Front Facade Dimensions
            const leftW = w * 0.35, rightW = w * 0.25, railW = w - leftW - rightW;
            const h1 = (35 * SCALE) + extraH, h2 = (45 * SCALE) + extraH;

            // LEFT SECTION: Brown wall with 3 White Diamond Cutouts
            const leftWall = new THREE.Mesh(new THREE.BoxGeometry(leftW, h1, wallT), matBrown);
            leftWall.position.set(centerX - w/2 + leftW/2, effectiveBaseY + h1/2, frontZ - wallT/2);
            ParapetModule.addMesh(leftWall);
            
            // Diamonds
            for (let i = 0; i < 3; i++) {
                const diamond = new THREE.Mesh(new THREE.BoxGeometry(6*SCALE, 6*SCALE, wallT + 2*SCALE), matWhite);
                diamond.position.set(centerX - w/2 + (leftW/4) + (i * 8*SCALE), effectiveBaseY + h1/2 + 2*SCALE, frontZ - wallT/2);
                diamond.rotation.z = Math.PI / 4; 
                ParapetModule.addMesh(diamond);
            }
            
            // White Cap on Left Wall
            const leftCap = new THREE.Mesh(new THREE.BoxGeometry(leftW + 4*SCALE, 2*SCALE, wallT + 2*SCALE), matWhite);
            leftCap.position.set(centerX - w/2 + leftW/2, effectiveBaseY + h1, frontZ - wallT/2);
            ParapetModule.addMesh(leftCap);

            // RIGHT SECTION: Tall Brown wall with vertical white slats
            const rightWall = new THREE.Mesh(new THREE.BoxGeometry(rightW, h2, wallT), matBrown);
            rightWall.position.set(centerX + w/2 - rightW/2, effectiveBaseY + h2/2, frontZ - wallT/2);
            ParapetModule.addMesh(rightWall);

            for(let i = 0; i < 4; i++) {
                const slat = new THREE.Mesh(new THREE.BoxGeometry(2*SCALE, h2 - 10*SCALE, wallT + 4*SCALE), matWhite);
                slat.position.set(centerX + w/2 - rightW + 8*SCALE + (i*6*SCALE), effectiveBaseY + h2/2, frontZ - wallT/2);
                ParapetModule.addMesh(slat);
            }

            // MIDDLE SECTION: Steel Railings
            const railX = centerX - w/2 + leftW;
            const baseC = new THREE.Mesh(new THREE.BoxGeometry(railW, 6*SCALE, wallT), matDark);
            baseC.position.set(railX + railW/2, effectiveBaseY + 3*SCALE, frontZ - wallT/2);
            ParapetModule.addMesh(baseC);
            
            [12*SCALE, 18*SCALE, 24*SCALE].forEach(ry => {
                const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.8*SCALE, 0.8*SCALE, railW), matSteel);
                rail.rotation.z = Math.PI / 2;
                rail.position.set(railX + railW/2, effectiveBaseY + ry + (extraH/2), frontZ - wallT/2);
                ParapetModule.addMesh(rail);
            });
        },

        buildGeoInterlock(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ) {
            const extraH = ParapetModule.config.heightOffset * SCALE;
            const extraT = ParapetModule.config.thicknessOffset * SCALE;

            // const matCream = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.9 });
            // const matBrown = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });
            // const matOrange = new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.6 });
            // const matSteel = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.6 });

            const { matPrimary: matCream, matWood: matBrown, matAccent: matOrange, matSteel: matSteel } = ParapetModule.getMaterials(SCALE);

            const wallT = (6 * SCALE) + extraT;
            const facadeH = (35 * SCALE) + extraH;

            // Perimeter Enclosure
            ParapetModule.buildPerimeterEnclosure(w, d, centerX, centerZ, effectiveBaseY, wallT, facadeH, matCream);

            // Base Front Wall (Cream)
            const frontWall = new THREE.Mesh(new THREE.BoxGeometry(w, facadeH, wallT), matCream);
            frontWall.position.set(centerX, effectiveBaseY + facadeH/2, frontZ - wallT/2);
            ParapetModule.addMesh(frontWall);

            // LEFT: Horizontal Brown Slits
            const slitX = centerX - w/2 + 20*SCALE;
            for (let i = 0; i < 4; i++) {
                const slit = new THREE.Mesh(new THREE.BoxGeometry(15*SCALE, 3*SCALE, wallT + 2*SCALE), matBrown);
                slit.position.set(slitX, effectiveBaseY + 10*SCALE + (i*6*SCALE), frontZ - wallT/2);
                ParapetModule.addMesh(slit);
            }

            // MIDDLE: The L-Shape and Orange Box Interlock
            const intX = centerX - 5*SCALE;
            
            const lVert = new THREE.Mesh(new THREE.BoxGeometry(6*SCALE, 25*SCALE + extraH, wallT + 4*SCALE), matBrown);
            lVert.position.set(intX - 15*SCALE, effectiveBaseY + (25*SCALE + extraH)/2, frontZ - wallT/2);
            ParapetModule.addMesh(lVert);

            const lHorz = new THREE.Mesh(new THREE.BoxGeometry(25*SCALE, 6*SCALE, wallT + 4*SCALE), matBrown);
            lHorz.position.set(intX - 5.5*SCALE, effectiveBaseY + facadeH, frontZ - wallT/2);
            ParapetModule.addMesh(lHorz);
            
            const oS = 22*SCALE, oT = 4*SCALE;
            const boxGroup = new THREE.Group();
            const oTop = new THREE.Mesh(new THREE.BoxGeometry(oS, oT, wallT + 6*SCALE), matOrange); oTop.position.set(0, oS/2 - oT/2, 0);
            const oBot = new THREE.Mesh(new THREE.BoxGeometry(oS, oT, wallT + 6*SCALE), matOrange); oBot.position.set(0, -oS/2 + oT/2, 0);
            const oLef = new THREE.Mesh(new THREE.BoxGeometry(oT, oS - oT*2, wallT + 6*SCALE), matOrange); oLef.position.set(-oS/2 + oT/2, 0, 0);
            const oRig = new THREE.Mesh(new THREE.BoxGeometry(oT, oS - oT*2, wallT + 6*SCALE), matOrange); oRig.position.set(oS/2 - oT/2, 0, 0);
            boxGroup.add(oTop, oBot, oLef, oRig);
            boxGroup.position.set(intX + 5*SCALE, effectiveBaseY + 15*SCALE, frontZ - wallT/2);
            ParapetModule.addMesh(boxGroup);

            const wBox = new THREE.Mesh(new THREE.BoxGeometry(oS - oT*2, oS - oT*2, wallT + 4*SCALE), new THREE.MeshStandardMaterial({color:0xffffff}));
            wBox.position.set(intX + 5*SCALE, effectiveBaseY + 15*SCALE, frontZ - wallT/2);
            ParapetModule.addMesh(wBox);

            // RIGHT: Siding & Railings
            const sidW = 20*SCALE;
            const siding = new THREE.Mesh(new THREE.BoxGeometry(sidW, facadeH - 10*SCALE, wallT + 2*SCALE), new THREE.MeshStandardMaterial({color: 0xeff6ff}));
            siding.position.set(centerX + 25*SCALE, effectiveBaseY + facadeH/2 - 5*SCALE, frontZ - wallT/2);
            ParapetModule.addMesh(siding);
            
            const pillar = new THREE.Mesh(new THREE.BoxGeometry(6*SCALE, facadeH + 5*SCALE, wallT + 6*SCALE), matBrown);
            pillar.position.set(centerX + 38*SCALE, effectiveBaseY + facadeH/2, frontZ - wallT/2);
            ParapetModule.addMesh(pillar);

            const railW = (w/2) - 38*SCALE - 3*SCALE;
            const railX = centerX + 38*SCALE + 3*SCALE;
            [10*SCALE, 16*SCALE, 22*SCALE, 28*SCALE].forEach(ry => {
                const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.8*SCALE, 0.8*SCALE, railW), matSteel);
                rail.rotation.z = Math.PI / 2;
                rail.position.set(railX + railW/2, effectiveBaseY + ry + (extraH/2), frontZ - wallT/2);
                ParapetModule.addMesh(rail);
            });
        },

        buildClassicCurve(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ) {
             const extraH = ParapetModule.config.heightOffset * SCALE;
             const wallT = (6 * SCALE) + (ParapetModule.config.thicknessOffset * SCALE);
             const H = (40 * SCALE) + extraH; 

            //  const matConcrete = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 });
            //  const matSteel = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.6 });

             const { matPrimary: matConcrete, matSteel: matSteel } = ParapetModule.getMaterials(SCALE);

             ParapetModule.buildPerimeterEnclosure(w, d, centerX, centerZ, effectiveBaseY, wallT, 30*SCALE + extraH, matConcrete);

             const shape = new THREE.Shape();
             shape.moveTo(0, 0); shape.lineTo(w, 0);
             shape.lineTo(w, H); shape.lineTo(w * 0.92, H); shape.lineTo(w * 0.92, H * 0.4);
             shape.quadraticCurveTo(w * 0.85, H * 0.1, w * 0.75, H * 0.5);
             shape.quadraticCurveTo(w * 0.5, H * 1.4, w * 0.25, H * 0.5);
             shape.quadraticCurveTo(w * 0.15, H * 0.1, w * 0.08, H * 0.4);
             shape.lineTo(w * 0.08, H); shape.lineTo(0, H); shape.lineTo(0, 0);

             const extrudeSettings = { depth: wallT, bevelEnabled: false };
             const curveFacade = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, extrudeSettings), matConcrete);
             curveFacade.position.set(centerX - w/2, effectiveBaseY, frontZ - wallT);
             ParapetModule.addMesh(curveFacade);
        },

        buildModernGlass(SCALE, w, d, centerX, centerZ, effectiveBaseY) {
            const railH = 36 * SCALE, baseH = 4 * SCALE, postT = 2 * SCALE;
            // const matBase = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 }); 
            // const matGlass = new THREE.MeshStandardMaterial({ color: 0x98d8c8, transparent: true, opacity: 0.3, side: THREE.DoubleSide, roughness: 0.1, metalness: 0.8 });
            // const matRail = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.4 }); 

            const { matSecondary: matBase, matGlass: matGlass, matSteel: matRail } = ParapetModule.getMaterials(SCALE);

            const bN = new THREE.Mesh(new THREE.BoxGeometry(w, baseH, postT), matBase); bN.position.set(centerX, effectiveBaseY + baseH/2, centerZ - d/2 + postT/2);
            const bS = new THREE.Mesh(new THREE.BoxGeometry(w, baseH, postT), matBase); bS.position.set(centerX, effectiveBaseY + baseH/2, centerZ + d/2 - postT/2);
            const bE = new THREE.Mesh(new THREE.BoxGeometry(postT, baseH, d - postT*2), matBase); bE.position.set(centerX + w/2 - postT/2, effectiveBaseY + baseH/2, centerZ);
            const bW = new THREE.Mesh(new THREE.BoxGeometry(postT, baseH, d - postT*2), matBase); bW.position.set(centerX - w/2 + postT/2, effectiveBaseY + baseH/2, centerZ);
            
            const rN = new THREE.Mesh(new THREE.BoxGeometry(w, postT, postT), matRail); rN.position.set(centerX, effectiveBaseY + railH, centerZ - d/2 + postT/2);
            const rS = new THREE.Mesh(new THREE.BoxGeometry(w, postT, postT), matRail); rS.position.set(centerX, effectiveBaseY + railH, centerZ + d/2 - postT/2);
            const rE = new THREE.Mesh(new THREE.BoxGeometry(postT, postT, d - postT*2), matRail); rE.position.set(centerX + w/2 - postT/2, effectiveBaseY + railH, centerZ);
            const rW = new THREE.Mesh(new THREE.BoxGeometry(postT, postT, d - postT*2), matRail); rW.position.set(centerX - w/2 + postT/2, effectiveBaseY + railH, centerZ);

            const glassH = railH - baseH - postT;
            const gN = new THREE.Mesh(new THREE.BoxGeometry(w - postT*2, glassH, 1*SCALE), matGlass); gN.position.set(centerX, effectiveBaseY + baseH + glassH/2, centerZ - d/2 + postT/2);
            const gS = new THREE.Mesh(new THREE.BoxGeometry(w - postT*2, glassH, 1*SCALE), matGlass); gS.position.set(centerX, effectiveBaseY + baseH + glassH/2, centerZ + d/2 - postT/2);
            const gE = new THREE.Mesh(new THREE.BoxGeometry(1*SCALE, glassH, d - postT*2), matGlass); gE.position.set(centerX + w/2 - postT/2, effectiveBaseY + baseH + glassH/2, centerZ);
            const gW = new THREE.Mesh(new THREE.BoxGeometry(1*SCALE, glassH, d - postT*2), matGlass); gW.position.set(centerX - w/2 + postT/2, effectiveBaseY + baseH + glassH/2, centerZ);

            [bN, bS, bE, bW, rN, rS, rE, rW, gN, gS, gE, gW].forEach(m => { 
                if (m.material !== matGlass) { m.castShadow = true; m.receiveShadow = true; }
                Engine3D.buildingGroup.add(m); 
            });
        },

        // ==========================================
        // 🏗️ NEW PREMIUM STYLES
        // ==========================================
        buildNeoBrutalist(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ) {
            const extraH = ParapetModule.config.heightOffset * SCALE;
            const extraT = ParapetModule.config.thicknessOffset * SCALE;
            const wallT = (12 * SCALE) + extraT;
            const facadeH = (45 * SCALE) + extraH;
            
            // const matConcrete = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 1.0 });
            // const matDark = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
            // const matGlow = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x38bdf8, emissiveIntensity: 1.5 });

            const { matPrimary: matConcrete, matSecondary: matDark, matGlow: matGlow } = ParapetModule.getMaterials(SCALE);

            // Side Enclosures
            ParapetModule.buildPerimeterEnclosure(w, d, centerX, centerZ, effectiveBaseY, wallT, facadeH, matConcrete);

            // Front Deep Inset Wall
            const insetD = 8 * SCALE;
            const frontBacking = new THREE.Mesh(new THREE.BoxGeometry(w, facadeH, wallT), matDark);
            frontBacking.position.set(centerX, effectiveBaseY + facadeH/2, frontZ - wallT/2 - insetD);
            ParapetModule.addMesh(frontBacking);

            // Vertical Ribs (Fins)
            const finW = 4 * SCALE, finD = 12 * SCALE;
            const spacing = 14 * SCALE;
            const finCount = Math.floor(w / spacing);
            const startX = centerX - w/2 + finW/2 + (w - (finCount * spacing))/2;

            for(let i = 0; i <= finCount; i++) {
                const fin = new THREE.Mesh(new THREE.BoxGeometry(finW, facadeH, finD), matConcrete);
                fin.position.set(startX + (i * spacing), effectiveBaseY + facadeH/2, frontZ - finD/2);
                ParapetModule.addMesh(fin);
            }

            // Top LED Glow Strip Frame
            const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(w, 2*SCALE, 2*SCALE), matGlow);
            ledStrip.position.set(centerX, effectiveBaseY + facadeH - 4*SCALE, frontZ + 1*SCALE);
            ParapetModule.addMesh(ledStrip);
        },

        buildZenPergola(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ) {
            const extraH = ParapetModule.config.heightOffset * SCALE;
            
            const wallT = 6 * SCALE;
            const railH = (35 * SCALE) + extraH;
            
            // const matWood = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
            // const matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
            // const matGlass = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.4, metalness: 0.9 });

            const { matWood: matWood, matSecondary: matDarkSteel, matGlass: matGlass } = ParapetModule.getMaterials(SCALE);

            // Floating Wood Base Line
            const baseWall = new THREE.Mesh(new THREE.BoxGeometry(w, 8*SCALE, wallT), matWood);
            baseWall.position.set(centerX, effectiveBaseY + 4*SCALE, frontZ - wallT/2);
            ParapetModule.addMesh(baseWall);

            // Left Side Heavy Wood Anchor
            const anchorW = w * 0.3;
            const anchor = new THREE.Mesh(new THREE.BoxGeometry(anchorW, railH, wallT), matWood);
            anchor.position.set(centerX - w/2 + anchorW/2, effectiveBaseY + railH/2, frontZ - wallT/2);
            ParapetModule.addMesh(anchor);

            // Smoked Glass Railing for the rest of the front
            const glassW = w - anchorW;
            const glass = new THREE.Mesh(new THREE.BoxGeometry(glassW, railH - 8*SCALE, 2*SCALE), matGlass);
            glass.position.set(centerX + anchorW/2, effectiveBaseY + 8*SCALE + (railH - 8*SCALE)/2, frontZ - wallT/2);
            ParapetModule.addMesh(glass);

            // Floating Pergola Slats overhead
            const slatL = 40 * SCALE; // Sticks out over the edge
            const slatW = 3 * SCALE;
            const slatH = 6 * SCALE;
            for(let i = 0; i < 6; i++) {
                const slat = new THREE.Mesh(new THREE.BoxGeometry(slatW, slatH, slatL), matWood);
                slat.position.set(centerX - w/2 + 8*SCALE + (i * 12*SCALE), effectiveBaseY + railH + slatH/2, frontZ - wallT/2 + 10*SCALE);
                ParapetModule.addMesh(slat);
            }

            // Simple side rails
            ParapetModule.buildPerimeterEnclosure(w, d, centerX, centerZ, effectiveBaseY, wallT, 8*SCALE, matDarkSteel);
        },

        buildCyberCantilever(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ) {
            const extraH = ParapetModule.config.heightOffset * SCALE;
            const extraT = ParapetModule.config.thicknessOffset * SCALE;
            
            const h = (40 * SCALE) + extraH;
            const t = (8 * SCALE) + extraT;
            
            // const matChrome = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 1.0, roughness: 0.1 });
            // const matBlackMetal = new THREE.MeshStandardMaterial({ color: 0x020617, metalness: 0.8, roughness: 0.3 });
            // const matCyanGlass = new THREE.MeshStandardMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.5, metalness: 0.8, side: THREE.DoubleSide });

            const { matSteel: matChrome, matSecondary: matBlackMetal, matGlass: matCyanGlass } = ParapetModule.getMaterials(SCALE);

            // Base and Side Enclosures in Black Metal
            ParapetModule.buildPerimeterEnclosure(w, d, centerX, centerZ, effectiveBaseY, t, 6*SCALE, matBlackMetal);

            // Heavy Cantilever Top Frame (Extends past the building width)
            const overW = w + (40 * SCALE); 
            const topFrame = new THREE.Mesh(new THREE.BoxGeometry(overW, 8*SCALE, t + 4*SCALE), matBlackMetal);
            topFrame.position.set(centerX, effectiveBaseY + h, frontZ - t/2);
            ParapetModule.addMesh(topFrame);

            // Support Pillars for Cantilever
            const pL = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), matChrome);
            pL.position.set(centerX - w/2 + t/2, effectiveBaseY + h/2, frontZ - t/2);
            const pR = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), matChrome);
            pR.position.set(centerX + w/2 - t/2, effectiveBaseY + h/2, frontZ - t/2);
            ParapetModule.addMesh(pL); ParapetModule.addMesh(pR);

            // Floating Angled Glass Panels
            const panelW = (w - (t*4)) / 3;
            for(let i = 0; i < 3; i++) {
                const glass = new THREE.Mesh(new THREE.BoxGeometry(panelW, h - 14*SCALE, 2*SCALE), matCyanGlass);
                // Position them slightly pushed forward from the frame
                glass.position.set(centerX - w/2 + t*2 + panelW/2 + (i * (panelW + 4*SCALE)), effectiveBaseY + 6*SCALE + (h - 14*SCALE)/2, frontZ + 4*SCALE);
                // Give them an aggressive sci-fi tilt
                glass.rotation.x = -0.1;
                ParapetModule.addMesh(glass);
            }
        },

        buildStandardWall(SCALE, w, d, centerX, centerZ, effectiveBaseY, useReal3D) {
            const wallH = 30 * SCALE, wallT = 5 * SCALE, capH = 4 * SCALE, capT = 9 * SCALE;
            const { matPrimary, matSecondary } = ParapetModule.getMaterials(SCALE);
            const capMat = matSecondary;
            let wallMat = matPrimary;
            
            if (useReal3D && typeof getProceduralTexture === 'function') {
                const pTex = getProceduralTexture('concrete').clone();
                pTex.needsUpdate = true;
                pTex.repeat.set(w / 100, wallH / 100);
                wallMat = new THREE.MeshStandardMaterial({ map: pTex, color: matPrimary.color, roughness: 0.9 });
            }

            const capY = effectiveBaseY + wallH + (capH / 2);
            const cN = new THREE.Mesh(new THREE.BoxGeometry(w, capH, capT), capMat); cN.position.set(centerX, capY, centerZ - d/2 + capT/2);
            const cS = new THREE.Mesh(new THREE.BoxGeometry(w, capH, capT), capMat); cS.position.set(centerX, capY, centerZ + d/2 - capT/2);
            const cE = new THREE.Mesh(new THREE.BoxGeometry(capT, capH, d - capT*2), capMat); cE.position.set(centerX + w/2 - capT/2, capY, centerZ);
            const cW = new THREE.Mesh(new THREE.BoxGeometry(capT, capH, d - capT*2), capMat); cW.position.set(centerX - w/2 + capT/2, capY, centerZ);

            const wallY = effectiveBaseY + (wallH / 2);
            const inset = capT - wallT;
            const wN = new THREE.Mesh(new THREE.BoxGeometry(w - inset, wallH, wallT), wallMat); wN.position.set(centerX, wallY, centerZ - d/2 + capT/2);
            const wS = new THREE.Mesh(new THREE.BoxGeometry(w - inset, wallH, wallT), wallMat); wS.position.set(centerX, wallY, centerZ + d/2 - capT/2);
            const wE = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, d - capT*2 + inset), wallMat); wE.position.set(centerX + w/2 - capT/2, wallY, centerZ);
            const wW = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, d - capT*2 + inset), wallMat); wW.position.set(centerX - w/2 + capT/2, wallY, centerZ);

            [cN, cS, cE, cW, wN, wS, wE, wW].forEach(m => { m.castShadow = true; m.receiveShadow = true; Engine3D.buildingGroup.add(m); });
        }
    }
};

window.build3DParapet = function(useReal3D) {
    ParapetModule.build(useReal3D);
};