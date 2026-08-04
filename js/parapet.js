// =========================================
// core/parapet.js
// 🌟 FULLY MODULAR PARAPET SYSTEM
// =========================================

// 1. INJECT PREMIUM NEUMORPHIC CSS (Preserved Exactly)
const parapetStyles = `
    @keyframes emeraldBreathe {
        0% { box-shadow: 0 10px 40px rgba(0,0,0,0.8), inset 0 2px 15px rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.2); }
        100% { box-shadow: 0 10px 40px rgba(0,0,0,0.8), inset 0 2px 25px rgba(16, 185, 129, 0.15); border-color: rgba(16, 185, 129, 0.5); }
    }

    .parapet-panel {
        position: absolute;
        top: 80px;
        right: 20px;
        width: 290px;
        background: rgba(9, 14, 23, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-radius: 14px;
        padding: 16px;
        color: #f8fafc;
        font-family: 'Inter', system-ui, sans-serif;
        z-index: 10000;
        animation: emeraldBreathe 3s infinite alternate ease-in-out;
    }

    .parapet-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(16, 185, 129, 0.2);
        padding-bottom: 10px;
        margin-bottom: 14px;
    }

    .parapet-title {
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: #10b981;
        text-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
    }

    .parapet-close-btn {
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        font-size: 1rem;
        transition: all 0.2s ease;
    }

    .parapet-close-btn:hover {
        color: #ef4444;
        transform: scale(1.1) rotate(90deg);
    }

    .parapet-content { display: flex; flex-direction: column; gap: 12px; }
    .parapet-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; }
    .parapet-group { display: flex; flex-direction: column; gap: 4px; }
    .parapet-row { display: flex; justify-content: space-between; align-items: center; }

    .parapet-divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.2), transparent);
        margin: 4px 0;
        border: none;
    }

    .parapet-label {
        font-size: 0.6rem;
        text-transform: uppercase;
        color: #94a3b8;
        font-weight: 600;
        letter-spacing: 0.5px;
    }

    .parapet-val-badge {
        font-size: 0.6rem;
        color: #10b981;
        font-family: 'Courier New', monospace;
        background: rgba(2, 6, 23, 0.8);
        padding: 2px 5px;
        border-radius: 4px;
        border: 1px solid rgba(16, 185, 129, 0.15);
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
    }

    .parapet-slider {
        -webkit-appearance: none;
        width: 100%;
        height: 4px;
        background: rgba(2, 6, 23, 0.9);
        border-radius: 2px;
        outline: none;
        border: 1px solid rgba(255,255,255,0.05);
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.8);
        margin: 4px 0;
    }

    .parapet-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #10b981;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
        transition: transform 0.1s ease, background 0.1s;
    }

    .parapet-slider::-webkit-slider-thumb:hover {
        transform: scale(1.4);
        background: #34d399;
    }

    .parapet-select {
        width: 100%;
        background: rgba(2, 6, 23, 0.8);
        color: #e2e8f0;
        border: 1px solid rgba(16, 185, 129, 0.2);
        padding: 6px 8px;
        border-radius: 6px;
        font-size: 0.7rem;
        outline: none;
        cursor: pointer;
        appearance: none;
        box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);
        background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2310b981%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
        background-repeat: no-repeat;
        background-position: right 8px top 50%;
        background-size: 8px auto;
        transition: border-color 0.2s, box-shadow 0.2s;
    }

    .parapet-select:hover { 
        border-color: rgba(16, 185, 129, 0.5);
        box-shadow: inset 0 2px 5px rgba(0,0,0,0.5), 0 0 5px rgba(16, 185, 129, 0.2); 
    }

    .parapet-color-picker {
        -webkit-appearance: none;
        width: 20px;
        height: 20px;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        padding: 0;
        background: transparent;
    }

    .parapet-color-picker::-webkit-color-swatch-wrapper { padding: 0; }
    .parapet-color-picker::-webkit-color-swatch {
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        box-shadow: 0 0 8px rgba(0,0,0,0.6);
    }
`;
document.head.insertAdjacentHTML("beforeend", `<style>${parapetStyles}</style>`);

// 2. DATA-DRIVEN CONTROLS CONFIGURATION
const PARAPET_CONTROLS_CONFIG = [
    { id: 'heightOffset', label: 'Height', min: -15, max: 30, step: 1, type: 'int' },
    { id: 'thicknessOffset', label: 'Thickness', min: 0, max: 15, step: 1, type: 'int' },
    { id: 'elevationOffset', label: 'Elevation', min: -10, max: 25, step: 1, type: 'int' },
    { id: 'glassOpacity', label: 'Opacity', min: 0.1, max: 1.0, step: 0.05, type: 'float' }
];

const ParapetModule = {
    // 1. STATE MANAGER
    config: {
        heightOffset: 0,
        thicknessOffset: 0,
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
        else if (currentStyle === 'neo-brutalist') this.styles.buildNeoBrutalist(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ);
        else if (currentStyle === 'zen-pergola') this.styles.buildZenPergola(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ);
        else if (currentStyle === 'cyber-cantilever') this.styles.buildCyberCantilever(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ);
        else if (currentStyle === 'standard') this.styles.buildStandardWall(SCALE, w, d, centerX, centerZ, effectiveBaseY, useReal3D);
    },

    getMaterials(SCALE) {
        const cfg = this.config;
        const accentHex = parseInt(cfg.accentColor.replace('#', '0x'), 16);
        let primaryHex = 0xf8fafc, secondaryHex = 0x0f172a, woodHex = 0x3e2723, activeAccentHex = accentHex;

        if (cfg.theme === 'midnight-aurora') { primaryHex = 0x1e293b; secondaryHex = 0x020617; activeAccentHex = 0x38bdf8; } 
        else if (cfg.theme === 'cyberpunk') { primaryHex = 0x180828; secondaryHex = 0x090014; activeAccentHex = 0xf43f5e; woodHex = 0x4c0519; } 
        else if (cfg.theme === 'warm-wood') { primaryHex = 0xfef3c7; secondaryHex = 0x451a03; activeAccentHex = 0xd97706; woodHex = 0x78350f; } 
        else if (cfg.theme === 'monochrome-slate') { primaryHex = 0x64748b; secondaryHex = 0x0f172a; activeAccentHex = 0xcbd5e1; }

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
        mesh.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; child.userData = { isParapet: true }; } });
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

    // 🌟 DATA-DRIVEN UI GENERATOR
    getEditorHTML() {
        const sliderHTML = PARAPET_CONTROLS_CONFIG.map(ctrl => `
            <div class="parapet-group">
                <div class="parapet-row">
                    <label class="parapet-label">${ctrl.label}</label>
                    <span id="val-${ctrl.id}" class="parapet-val-badge">${this.config[ctrl.id]}</span>
                </div>
                <input type="range" class="parapet-slider" min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}" value="${this.config[ctrl.id]}" 
                    oninput="window._updateParapetConfig('${ctrl.id}', this.value, '${ctrl.type}')">
            </div>
        `).join('');

        return `
            <div class="parapet-header">
                <span class="parapet-title">⚙️ PARAPET STUDIO</span>
                <button class="parapet-close-btn" onclick="ParapetModule.closeEditor()">✕</button>
            </div>
            <div class="parapet-content">
                <div class="parapet-grid">
                    ${sliderHTML}
                </div>
                <hr class="parapet-divider">
                <div class="parapet-group">
                    <label class="parapet-label">Theme Preset</label>
                    <select class="parapet-select" onchange="window._updateParapetConfig('theme', this.value, 'string')">
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
                        onchange="window._updateParapetConfig('accentColor', this.value, 'string')">
                </div>
                <div class="parapet-group" style="margin-top: 10px;">
                    <div class="parapet-row">
                        <label class="parapet-label">Glow Intensity</label>
                        <span id="val-glowIntensity" class="parapet-val-badge">${this.config.glowIntensity}</span>
                    </div>
                    <input type="range" class="parapet-slider" min="0.0" max="3.0" step="0.1" value="${this.config.glowIntensity}" 
                        oninput="window._updateParapetConfig('glowIntensity', this.value, 'float')">
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

        let renderTimeout;
        window._updateParapetConfig = (key, val, parseType = 'float') => {
            let parsedVal = val;
            if (parseType === 'int') parsedVal = parseInt(val, 10);
            else if (parseType === 'float') parsedVal = parseFloat(val);
            else if (parseType === 'string') parsedVal = String(val);
            
            ParapetModule.config[key] = parsedVal;
            const displayEl = document.getElementById(`val-${key}`);
            if (displayEl) displayEl.innerText = val;
            
            clearTimeout(renderTimeout);
            renderTimeout = setTimeout(() => {
                if (typeof request3DUpdate === 'function') request3DUpdate();
            }, 40); 
        };

        popup.innerHTML = this.getEditorHTML();
        popup.style.display = 'block';
    },

    closeEditor() {
        const popup = document.getElementById('parapet-editor-popup');
        if (popup) popup.style.display = 'none';
    },

    styles: {
        buildPremiumCanopy(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ) {
            const extraH = ParapetModule.config.heightOffset * SCALE;
            const extraT = ParapetModule.config.thicknessOffset * SCALE;
            const wallH = (30 * SCALE) + extraH; 
            const wallT = (5 * SCALE) + extraT; 
            const capH = 4 * SCALE; 
            const capT = (9 * SCALE) + extraT;
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
            const { matWood: matBrown, matPrimary: matWhite, matSteel: matSteel, matSecondary: matDark } = ParapetModule.getMaterials(SCALE);
            const wallT = (6 * SCALE) + extraT;
            
            ParapetModule.buildPerimeterEnclosure(w, d, centerX, centerZ, effectiveBaseY, wallT, (30 * SCALE) + extraH, matDark);

            const leftW = w * 0.35, rightW = w * 0.25, railW = w - leftW - rightW;
            const h1 = (35 * SCALE) + extraH, h2 = (45 * SCALE) + extraH;

            const leftWall = new THREE.Mesh(new THREE.BoxGeometry(leftW, h1, wallT), matBrown);
            leftWall.position.set(centerX - w/2 + leftW/2, effectiveBaseY + h1/2, frontZ - wallT/2);
            ParapetModule.addMesh(leftWall);
            
            for (let i = 0; i < 3; i++) {
                const diamond = new THREE.Mesh(new THREE.BoxGeometry(6*SCALE, 6*SCALE, wallT + 2*SCALE), matWhite);
                diamond.position.set(centerX - w/2 + (leftW/4) + (i * 8*SCALE), effectiveBaseY + h1/2 + 2*SCALE, frontZ - wallT/2);
                diamond.rotation.z = Math.PI / 4; 
                ParapetModule.addMesh(diamond);
            }
            
            const leftCap = new THREE.Mesh(new THREE.BoxGeometry(leftW + 4*SCALE, 2*SCALE, wallT + 2*SCALE), matWhite);
            leftCap.position.set(centerX - w/2 + leftW/2, effectiveBaseY + h1, frontZ - wallT/2);
            ParapetModule.addMesh(leftCap);

            const rightWall = new THREE.Mesh(new THREE.BoxGeometry(rightW, h2, wallT), matBrown);
            rightWall.position.set(centerX + w/2 - rightW/2, effectiveBaseY + h2/2, frontZ - wallT/2);
            ParapetModule.addMesh(rightWall);

            for(let i = 0; i < 4; i++) {
                const slat = new THREE.Mesh(new THREE.BoxGeometry(2*SCALE, h2 - 10*SCALE, wallT + 4*SCALE), matWhite);
                slat.position.set(centerX + w/2 - rightW + 8*SCALE + (i*6*SCALE), effectiveBaseY + h2/2, frontZ - wallT/2);
                ParapetModule.addMesh(slat);
            }

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
            const { matPrimary: matCream, matWood: matBrown, matAccent: matOrange, matSteel: matSteel } = ParapetModule.getMaterials(SCALE);
            const wallT = (6 * SCALE) + extraT;
            const facadeH = (35 * SCALE) + extraH;

            ParapetModule.buildPerimeterEnclosure(w, d, centerX, centerZ, effectiveBaseY, wallT, facadeH, matCream);

            const frontWall = new THREE.Mesh(new THREE.BoxGeometry(w, facadeH, wallT), matCream);
            frontWall.position.set(centerX, effectiveBaseY + facadeH/2, frontZ - wallT/2);
            ParapetModule.addMesh(frontWall);

            const slitX = centerX - w/2 + 20*SCALE;
            for (let i = 0; i < 4; i++) {
                const slit = new THREE.Mesh(new THREE.BoxGeometry(15*SCALE, 3*SCALE, wallT + 2*SCALE), matBrown);
                slit.position.set(slitX, effectiveBaseY + 10*SCALE + (i*6*SCALE), frontZ - wallT/2);
                ParapetModule.addMesh(slit);
            }

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

        buildNeoBrutalist(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ) {
            const extraH = ParapetModule.config.heightOffset * SCALE;
            const extraT = ParapetModule.config.thicknessOffset * SCALE;
            const wallT = (12 * SCALE) + extraT;
            const facadeH = (45 * SCALE) + extraH;
            const { matPrimary: matConcrete, matSecondary: matDark, matGlow: matGlow } = ParapetModule.getMaterials(SCALE);

            ParapetModule.buildPerimeterEnclosure(w, d, centerX, centerZ, effectiveBaseY, wallT, facadeH, matConcrete);

            const insetD = 8 * SCALE;
            const frontBacking = new THREE.Mesh(new THREE.BoxGeometry(w, facadeH, wallT), matDark);
            frontBacking.position.set(centerX, effectiveBaseY + facadeH/2, frontZ - wallT/2 - insetD);
            ParapetModule.addMesh(frontBacking);

            const finW = 4 * SCALE, finD = 12 * SCALE, spacing = 14 * SCALE;
            const finCount = Math.floor(w / spacing);
            const startX = centerX - w/2 + finW/2 + (w - (finCount * spacing))/2;

            for(let i = 0; i <= finCount; i++) {
                const fin = new THREE.Mesh(new THREE.BoxGeometry(finW, facadeH, finD), matConcrete);
                fin.position.set(startX + (i * spacing), effectiveBaseY + facadeH/2, frontZ - finD/2);
                ParapetModule.addMesh(fin);
            }

            const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(w, 2*SCALE, 2*SCALE), matGlow);
            ledStrip.position.set(centerX, effectiveBaseY + facadeH - 4*SCALE, frontZ + 1*SCALE);
            ParapetModule.addMesh(ledStrip);
        },

        buildZenPergola(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ) {
            const extraH = ParapetModule.config.heightOffset * SCALE;
            const wallT = 6 * SCALE;
            const railH = (35 * SCALE) + extraH;
            const { matWood: matWood, matSecondary: matDarkSteel, matGlass: matGlass } = ParapetModule.getMaterials(SCALE);

            const baseWall = new THREE.Mesh(new THREE.BoxGeometry(w, 8*SCALE, wallT), matWood);
            baseWall.position.set(centerX, effectiveBaseY + 4*SCALE, frontZ - wallT/2);
            ParapetModule.addMesh(baseWall);

            const anchorW = w * 0.3;
            const anchor = new THREE.Mesh(new THREE.BoxGeometry(anchorW, railH, wallT), matWood);
            anchor.position.set(centerX - w/2 + anchorW/2, effectiveBaseY + railH/2, frontZ - wallT/2);
            ParapetModule.addMesh(anchor);

            const glassW = w - anchorW;
            const glass = new THREE.Mesh(new THREE.BoxGeometry(glassW, railH - 8*SCALE, 2*SCALE), matGlass);
            glass.position.set(centerX + anchorW/2, effectiveBaseY + 8*SCALE + (railH - 8*SCALE)/2, frontZ - wallT/2);
            ParapetModule.addMesh(glass);

            const slatL = 40 * SCALE, slatW = 3 * SCALE, slatH = 6 * SCALE;
            for(let i = 0; i < 6; i++) {
                const slat = new THREE.Mesh(new THREE.BoxGeometry(slatW, slatH, slatL), matWood);
                slat.position.set(centerX - w/2 + 8*SCALE + (i * 12*SCALE), effectiveBaseY + railH + slatH/2, frontZ - wallT/2 + 10*SCALE);
                ParapetModule.addMesh(slat);
            }

            ParapetModule.buildPerimeterEnclosure(w, d, centerX, centerZ, effectiveBaseY, wallT, 8*SCALE, matDarkSteel);
        },

        buildCyberCantilever(SCALE, w, d, centerX, centerZ, effectiveBaseY, frontZ) {
            const extraH = ParapetModule.config.heightOffset * SCALE;
            const extraT = ParapetModule.config.thicknessOffset * SCALE;
            const h = (40 * SCALE) + extraH;
            const t = (8 * SCALE) + extraT;
            const { matSteel: matChrome, matSecondary: matBlackMetal, matGlass: matCyanGlass } = ParapetModule.getMaterials(SCALE);

            ParapetModule.buildPerimeterEnclosure(w, d, centerX, centerZ, effectiveBaseY, t, 6*SCALE, matBlackMetal);

            const overW = w + (40 * SCALE); 
            const topFrame = new THREE.Mesh(new THREE.BoxGeometry(overW, 8*SCALE, t + 4*SCALE), matBlackMetal);
            topFrame.position.set(centerX, effectiveBaseY + h, frontZ - t/2);
            ParapetModule.addMesh(topFrame);

            const pL = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), matChrome);
            pL.position.set(centerX - w/2 + t/2, effectiveBaseY + h/2, frontZ - t/2);
            const pR = new THREE.Mesh(new THREE.BoxGeometry(t, h, t), matChrome);
            pR.position.set(centerX + w/2 - t/2, effectiveBaseY + h/2, frontZ - t/2);
            ParapetModule.addMesh(pL); ParapetModule.addMesh(pR);

            const panelW = (w - (t*4)) / 3;
            for(let i = 0; i < 3; i++) {
                const glass = new THREE.Mesh(new THREE.BoxGeometry(panelW, h - 14*SCALE, 2*SCALE), matCyanGlass);
                glass.position.set(centerX - w/2 + t*2 + panelW/2 + (i * (panelW + 4*SCALE)), effectiveBaseY + 6*SCALE + (h - 14*SCALE)/2, frontZ + 4*SCALE);
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