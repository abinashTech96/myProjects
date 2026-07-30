// =========================================
// ROOM STUDIO ENGINE (studio.js)
// Local Sandbox Editor with Resizing, Realism & 3D Preview
// =========================================

const RoomStudio = {
    activeRoomIndex: null,
    activeRoom: null,
    sandboxFixtures: [], 
    sandboxDoorsWindows: [], 
    selectedFixtureIndex: -1, 
    boundKeyHandler: null,

    // Drag State (2D)
    isDragging: false,
    dragOffset: { x: 0, y: 0 },

    // 3D State & Raycasting
    is3DActive: false,
    scene3D: null, camera3D: null, renderer3D: null, controls3D: null, reqAnim: null,
    raycaster: null, mouse3D: null, dragPlane: null, is3DDragging: false, dragOffset3D: null,

    // 🌟 1. NEW: Store the HTML inside the feature script
    buildUI() {
        // Only build if it doesn't already exist
        if (document.getElementById('room-studio-modal')) return;

        const uiTemplate = `
            <div id="room-studio-modal" style="display: none;">
                <div class="rs-backdrop"></div>
                <div class="rs-container">
                    <div class="rs-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 1.5rem;">🛋️</span>
                            <div>
                                <div id="rs-room-title" style="font-weight: 900; font-size: 1.1rem; color: white;">ROOM STUDIO</div>
                                <div id="rs-room-dims" style="font-size: 0.7rem; color: #38bdf8; font-weight: bold;"></div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button id="rs-toggle-3d-btn" class="rs-btn" style="background: rgba(56, 189, 248, 0.1); color: #38bdf8;" onclick="RoomStudio.toggle3D()">👁️ 3D PREVIEW</button>
                            <button class="rs-btn cancel" onclick="RoomStudio.close()">Discard</button>
                            <button class="rs-btn save" onclick="RoomStudio.save()">💾 Save to Plan</button>
                        </div>
                    </div>
                    
                    <div class="rs-workspace">
                        <div class="rs-canvas-wrapper">
                            <div id="studio-3d-container" style="display: none; width: 100%; height: 100%;"></div>
                            <svg id="studio-svg" style="width: 100%; height: 100%;">
                                <defs>
                                    <pattern id="rs-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                                        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
                                    </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#rs-grid)" />
                                <g id="rs-ghost-group"></g>
                                <g id="rs-room-group"></g>
                                <g id="rs-furniture-group"></g>
                            </svg>
                            <div id="rs-hint" class="rs-hint">Drag to add. Click to select. 'R' to Rotate. 'Del' to Remove.</div>
                        </div>

                        <div class="rs-catalog">
                            <div id="rs-properties" style="display: none; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #38bdf8;"></div>
                            <h3 style="color: #cbd5e1; font-size: 0.8rem; margin-top: 0; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">CATALOG</h3>
                            <div id="rs-catalog-grid" class="rs-grid"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', uiTemplate);
    },

    init() {
        this.buildUI();
        this.renderCatalog();
        this.setupDragAndDrop();
        this.boundKeyHandler = this.handleKeydown.bind(this);
        
        window.addEventListener('mousemove', (e) => this.handleDragMove(e));
        window.addEventListener('mouseup', () => { this.isDragging = false; });
    },

    open() {
        if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) return;
        
        this.activeRoomIndex = selectedElIndex;
        this.activeRoom = elements[this.activeRoomIndex];
        this.selectedFixtureIndex = -1;
        this.is3DActive = false;
        
        // RESTORED: Room Dimensions
        document.getElementById('rs-room-title').innerText = this.activeRoom.customName || this.activeRoom.type;
        const dimsEl = document.getElementById('rs-room-dims');
        if (dimsEl) {
            dimsEl.innerText = `${Math.floor(this.activeRoom.w/12)}'${Math.round(this.activeRoom.w%12)}" × ${Math.floor(this.activeRoom.h/12)}'${Math.round(this.activeRoom.h%12)}"`;
        }

        this.sandboxFixtures = [];
        elements.forEach((el, globalIdx) => {
            if (el.isFurniture && el.floor === this.activeRoom.floor) {
                const cx = el.x + (el.w / 2);
                const cy = el.y + (el.h / 2);
                const rx = this.activeRoom.x;
                const ry = this.activeRoom.y;

                if (cx >= rx && cx <= rx + this.activeRoom.w && cy >= ry && cy <= ry + this.activeRoom.h) {
                    // const localFurniture = JSON.parse(JSON.stringify(el));
                    const localFurniture = structuredClone(el);
                    localFurniture.x = el.x - this.activeRoom.x;
                    localFurniture.y = el.y - this.activeRoom.y;
                    localFurniture.globalRef = globalIdx; 
                    localFurniture.rot = el.rot || 0; 
                    this.sandboxFixtures.push(localFurniture);
                }
            }
        });

        this.sandboxDoorsWindows = typeof fixtures !== 'undefined' ? fixtures.filter(f => f.roomId === this.activeRoomIndex) : [];

        const btn = document.getElementById('rs-toggle-3d-btn');
        btn.innerHTML = '👁️ 3D PREVIEW';
        btn.style.background = 'rgba(56, 189, 248, 0.1)';
        btn.style.color = '#38bdf8';
        document.getElementById('studio-svg').style.display = 'block';
        document.getElementById('studio-3d-container').style.display = 'none';

        document.getElementById('room-studio-modal').style.display = 'flex';
        document.addEventListener('keydown', this.boundKeyHandler);
        this.renderCanvas();
    },

    close() {
        this.activeRoomIndex = null;
        this.activeRoom = null;
        this.sandboxFixtures = [];
        this.sandboxDoorsWindows = [];
        this.selectedFixtureIndex = -1;
        this.isDragging = false;
        if (this.reqAnim) cancelAnimationFrame(this.reqAnim);

        document.getElementById('room-studio-modal').style.display = 'none';
        document.removeEventListener('keydown', this.boundKeyHandler);
    },

    save() {
        if(typeof saveState === 'function') saveState();

        const indicesToRemove = this.sandboxFixtures
            .filter(f => f.globalRef !== undefined)
            .map(f => f.globalRef)
            .sort((a, b) => b - a);
        indicesToRemove.forEach(idx => {
            elements.splice(idx, 1);
            if (typeof fixtures !== 'undefined') {
                fixtures.forEach(fix => {
                    if (fix.roomId > idx) {
                        fix.roomId -= 1;
                    }
                });
            }
        });
        this.sandboxFixtures.forEach(fix => {
            // const globalFurniture = JSON.parse(JSON.stringify(fix));
            const globalFurniture = structuredClone(fix);
            delete globalFurniture.globalRef;
            globalFurniture.x = this.activeRoom.x + fix.x;
            globalFurniture.y = this.activeRoom.y + fix.y;
            globalFurniture.floor = this.activeRoom.floor;
            globalFurniture.locked = false;
            elements.push(globalFurniture);
        });
        this.close();
        if (typeof updateCanvas === 'function') updateCanvas();
        if (typeof renderSidebar === 'function') renderSidebar();
        if (typeof is3DMode !== 'undefined' && is3DMode && typeof generate3DModel === 'function') generate3DModel();
    },

    getSVGPos(evt) {
        const svg = document.getElementById('studio-svg');
        const pt = svg.createSVGPoint();
        pt.x = evt.clientX; 
        pt.y = evt.clientY;
        return pt.matrixTransform(svg.getScreenCTM().inverse());
    },

    startDrag(idx, event) {
        event.stopPropagation();
        this.selectedFixtureIndex = idx;
        this.isDragging = true;
        const pt = this.getSVGPos(event);
        const fix = this.sandboxFixtures[idx];
        this.dragOffset = { x: pt.x - fix.x, y: pt.y - fix.y };
        this.renderCanvas();
        this.renderProperties(); 
    },

    handleDragMove(event) {
        if (!this.isDragging || this.selectedFixtureIndex === -1 || this.is3DActive) return;
        const pt = this.getSVGPos(event);
        const fix = this.sandboxFixtures[this.selectedFixtureIndex];
        
        // 1. Calculate raw drop coordinates
        let newX = pt.x - this.dragOffset.x;
        let newY = pt.y - this.dragOffset.y;
        
        // 2. Apply your existing Grid Snapping
        let snap = typeof STUDIO_CONFIG !== 'undefined' ? STUDIO_CONFIG.GRID_SNAP_INCHES : 6;
        if (typeof CanvasState !== 'undefined') {
            if (CanvasState.zoomLvl > 2.5) snap = 1;
            else if (CanvasState.zoomLvl < 0.8) snap = 12;
        }
        newX = Math.round(newX / snap) * snap; 
        newY = Math.round(newY / snap) * snap;

        // 🌟 3. MAGNETIC WALL SNAPPING & ROTATION
        const SNAP_DIST = STUDIO_CONFIG.MAGNETIC_SNAP_DIST;

        // Calculate distance to all 4 walls
        const distLeft = newX;
        const distRight = roomW - (newX + fix.w);
        const distTop = newY;
        const distBottom = roomH - (newY + fix.h);

        // Find the closest wall
        const minDist = Math.min(distLeft, distRight, distTop, distBottom);

        // If dragged close enough to a wall, snap it flush and rotate it!
        if (minDist < SNAP_DIST) {
            if (minDist === distTop) {
                newY = 0;
                fix.rot = 0;   // Back against Top Wall
            } else if (minDist === distBottom) {
                newY = roomH - fix.h;
                fix.rot = 180; // Back against Bottom Wall
            } else if (minDist === distLeft) {
                newX = 0;
                fix.rot = 270; // Back against Left Wall
            } else if (minDist === distRight) {
                newX = roomW - fix.w;
                fix.rot = 90;  // Back against Right Wall
            }
        }
        
        // 4. Apply boundaries (prevents dragging outside the room)
        newX = Math.max(0, Math.min(newX, roomW - fix.w));
        newY = Math.max(0, Math.min(newY, roomH - fix.h));
        
        // 5. Save and Render
        fix.x = newX;
        fix.y = newY;
        
        this.renderCanvas();
        if (typeof this.renderProperties === 'function') {
            this.renderProperties(); // Sync pos and rotation inputs in the UI
        }
    },

    renderCanvas() {
        const svg = document.getElementById('studio-svg');
        const roomGroup = document.getElementById('rs-room-group');
        const furnGroup = document.getElementById('rs-furniture-group');
        const ghostGroup = document.getElementById('rs-ghost-group');
        
        const maxDim = Math.max(this.activeRoom.w, this.activeRoom.h);
        const padding = maxDim * 0.35; 
        const vW = this.activeRoom.w + (padding * 2);
        const vH = this.activeRoom.h + (padding * 2);
        svg.setAttribute('viewBox', `-${padding} -${padding} ${vW} ${vH}`);

        // RESTORED: GHOST CONTEXT
        let ghostHTML = '';
        elements.forEach((el, idx) => {
            if (idx === this.activeRoomIndex || el.floor !== this.activeRoom.floor || el.isFurniture) return;
            const localX = el.x - this.activeRoom.x;
            const localY = el.y - this.activeRoom.y;
            ghostHTML += `
                <rect x="${localX}" y="${localY}" width="${el.w}" height="${el.h}" 
                      fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" 
                      stroke-dasharray="4,4" stroke-width="2" pointer-events="none" />
            `;
        });
        ghostGroup.innerHTML = ghostHTML;

        // RESTORED: ACTIVE ROOM & DOORS/WINDOWS
        let rgb = ARCH_CONFIG?.COLORS?.[this.activeRoom.type]?.rgb || '255,255,255';
        if (this.activeRoom.customColor) {
            const hex = this.activeRoom.customColor.replace('#', '');
            rgb = `${parseInt(hex.substring(0,2),16)}, ${parseInt(hex.substring(2,4),16)}, ${parseInt(hex.substring(4,6),16)}`;
        }

        let roomHTML = `<rect x="0" y="0" width="${this.activeRoom.w}" height="${this.activeRoom.h}" fill="rgba(${rgb}, 0.15)" stroke="rgb(${rgb})" stroke-width="3" />`;
        
        // Draw 2D local doors and windows
        this.sandboxDoorsWindows.forEach(fix => {
            const fw = (fix.edge === 'top' || fix.edge === 'bottom') ? fix.size : 6;
            const fh = (fix.edge === 'left' || fix.edge === 'right') ? fix.size : 6;
            let fx = 0, fy = 0;
            if (fix.edge === 'bottom') { fx = fix.offset; fy = this.activeRoom.h - 3; }
            if (fix.edge === 'top') { fx = fix.offset; fy = -3; }
            if (fix.edge === 'left') { fx = -3; fy = fix.offset; }
            if (fix.edge === 'right') { fx = this.activeRoom.w - 3; fy = fix.offset; }
            
            const color = fix.type === 'door' ? '#fbbf24' : '#06b6d4';
            roomHTML += `<rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="rgba(0,0,0,0.8)" stroke="${color}" stroke-width="2" />`;
        });
        roomGroup.innerHTML = roomHTML;

        // FURNITURE
        furnGroup.innerHTML = '';
        this.sandboxFixtures.forEach((f, idx) => {
            const isSelected = idx === this.selectedFixtureIndex;
            const strokeColor = isSelected ? '#38bdf8' : '#ec4899';
            const fillColor = isSelected ? 'rgba(56, 189, 248, 0.3)' : 'rgba(236, 72, 153, 0.2)';
            
            // 🌟 NEW: Calculate visual dimensions based on rotation
            const isTurned = Math.abs(f.rot) === 90 || Math.abs(f.rot) === 270;
            const drawW = isTurned ? f.h : f.w;
            const drawH = isTurned ? f.w : f.h;

            furnGroup.innerHTML += `
                <g transform="translate(${f.x}, ${f.y})" 
                   onmousedown="RoomStudio.startDrag(${idx}, event)" 
                   style="cursor: ${isSelected ? 'grabbing' : 'grab'};">
                    <rect width="${drawW}" height="${drawH}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${isSelected ? 3 : 1}" />
                    <text x="${drawW/2}" y="${drawH/2 + 4}" fill="#f8fafc" font-size="10" text-anchor="middle" font-weight="bold" pointer-events="none">
                          ${f.type.toUpperCase()}
                    </text>
                </g>
            `;
        });

        this.renderProperties();
    },

    // =========================================
    // ENHANCED PROPERTIES PANEL (No Focus Loss!)
    // =========================================
    renderProperties() {
        const propPanel = document.getElementById('rs-properties');
        if (this.selectedFixtureIndex === -1) {
            propPanel.style.display = 'none';
            return;
        }

        const fix = this.sandboxFixtures[this.selectedFixtureIndex];
        const isAlreadyOpen = propPanel.style.display === 'block';
        const currentTitle = document.getElementById('rs-prop-title');

        // 🚀 ANTI-THRASHING: If panel is open for the same item, just update the numbers!
        if (isAlreadyOpen && currentTitle && currentTitle.innerText.includes(fix.type.toUpperCase())) {
            document.getElementById('rs-pos-x').value = fix.x;
            document.getElementById('rs-pos-y').value = fix.y;
            document.getElementById('rs-dim-w').value = fix.w;
            document.getElementById('rs-dim-h').value = fix.h;
            return; // Exit early! No HTML wiping!
        }

        // Otherwise, build the HTML freshly (Notice the new IDs on the inputs)
        propPanel.style.display = 'block';
        propPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span id="rs-prop-title" style="font-weight: 800; font-size: 0.75rem; color: #38bdf8; text-transform: uppercase;">
                    ⚙️ EDIT ${fix.type}
                </span>
                <button onclick="RoomStudio.deleteSelected()" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; padding: 4px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: bold; cursor: pointer;">✕ Del</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 0.6rem; color: #94a3b8; font-weight: bold;">POS X (in)</label>
                    <input id="rs-pos-x" type="number" value="${fix.x}" step="6" oninput="RoomStudio.modifyFixture('x', this.value)" 
                           style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; padding: 4px; text-align: center;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 0.6rem; color: #94a3b8; font-weight: bold;">POS Y (in)</label>
                    <input id="rs-pos-y" type="number" value="${fix.y}" step="6" oninput="RoomStudio.modifyFixture('y', this.value)" 
                           style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; padding: 4px; text-align: center;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 0.6rem; color: #94a3b8; font-weight: bold;">WIDTH (in)</label>
                    <input id="rs-dim-w" type="number" value="${fix.w}" min="12" step="6" oninput="RoomStudio.modifyFixture('w', this.value)" 
                           style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; padding: 4px; text-align: center;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 0.6rem; color: #94a3b8; font-weight: bold;">DEPTH (in)</label>
                    <input id="rs-dim-h" type="number" value="${fix.h}" min="12" step="6" oninput="RoomStudio.modifyFixture('h', this.value)" 
                           style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; padding: 4px; text-align: center;">
                </div>
            </div>
            <button onclick="RoomStudio.rotateSelected()" style="width: 100%; background: rgba(56, 189, 248, 0.15); border: 1px dashed #38bdf8; color: #38bdf8; padding: 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; cursor: pointer;">
                🔄 Rotate 90°
            </button>
        `;
    },

    modifyFixture(prop, value) {
        if (this.selectedFixtureIndex === -1) return;
        let num = parseInt(value);
        if (isNaN(num)) return;
        
        this.sandboxFixtures[this.selectedFixtureIndex][prop] = num;
        
        const fix = this.sandboxFixtures[this.selectedFixtureIndex];
        fix.x = Math.max(0, Math.min(fix.x, this.activeRoom.w - fix.w));
        fix.y = Math.max(0, Math.min(fix.y, this.activeRoom.h - fix.h));

        if(this.is3DActive) this.build3DScene();
        else this.renderCanvas();
    },

    // =========================================
    // 🌟 THE 4-SIDED ROTATION FIX 🌟
    // =========================================
    rotateSelected() {
        if (this.selectedFixtureIndex === -1) return;
        const fix = this.sandboxFixtures[this.selectedFixtureIndex];
        
        // 1. Only track the mathematical rotation
        fix.rot = ((fix.rot || 0) + 90) % 360;
        
        // 2. Calculate the visual footprint for boundary collisions
        const isTurned = Math.abs(fix.rot) === 90 || Math.abs(fix.rot) === 270;
        const visualW = isTurned ? fix.h : fix.w;
        const visualH = isTurned ? fix.w : fix.h;
        
        // 3. Safety bound check using the active visual footprint
        fix.x = Math.max(0, Math.min(fix.x, this.activeRoom.w - visualW));
        fix.y = Math.max(0, Math.min(fix.y, this.activeRoom.h - visualH));
        
        this.renderCanvas();
        if (this.is3DActive) this.build3DScene();
    },

    deleteSelected() {
        if (this.selectedFixtureIndex === -1) return;
        this.sandboxFixtures.splice(this.selectedFixtureIndex, 1);
        this.selectedFixtureIndex = -1;
        this.renderCanvas();
        this.renderProperties();
        if (this.is3DActive) this.build3DScene();
    },

    // =========================================
    // 3D ENGINE PREVIEWER (Raycaster Enabled)
    // =========================================
    toggle3D() {
        this.is3DActive = !this.is3DActive;
        const btn = document.getElementById('rs-toggle-3d-btn');
        const svg = document.getElementById('studio-svg');
        const container3D = document.getElementById('studio-3d-container');

        if (this.is3DActive) {
            btn.innerHTML = '📐 BACK TO 2D';
            btn.style.background = '#38bdf8';
            btn.style.color = '#0f172a';
            svg.style.display = 'none';
            container3D.style.display = 'block';
            
            this.init3D();
            this.build3DScene();
        } else {
            btn.innerHTML = '👁️ 3D PREVIEW';
            btn.style.background = 'rgba(56, 189, 248, 0.1)';
            btn.style.color = '#38bdf8';
            svg.style.display = 'block';
            container3D.style.display = 'none';
        }
    },

    init3D() {
        const container = document.getElementById('studio-3d-container');
        if (!this.scene3D) {
            this.scene3D = new THREE.Scene();
            this.scene3D.background = new THREE.Color(0x0f172a);
            
            this.camera3D = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 1, 3000);
            this.renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer3D.setSize(container.clientWidth, container.clientHeight);
            this.renderer3D.shadowMap.enabled = true;
            this.renderer3D.shadowMap.type = THREE.PCFSoftShadowMap; 
            container.appendChild(this.renderer3D.domElement);

            this.controls3D = new THREE.OrbitControls(this.camera3D, this.renderer3D.domElement);
            this.controls3D.enableDamping = true;
            this.controls3D.dampingFactor = 0.05;
            this.controls3D.maxPolarAngle = Math.PI / 2.1; 

            // 🌟 INIT RAYCASTER FOR 3D DRAG & DROP 🌟
            this.raycaster = new THREE.Raycaster();
            this.mouse3D = new THREE.Vector2();
            this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            this.dragOffset3D = new THREE.Vector3();
            
            container.addEventListener('pointerdown', this.on3DPointerDown.bind(this));
            container.addEventListener('pointermove', this.on3DPointerMove.bind(this));
            container.addEventListener('pointerup', this.on3DPointerUp.bind(this));
        }

        if (this.reqAnim) cancelAnimationFrame(this.reqAnim);
        
        const animate = () => {
            if (!this.is3DActive) return;
            this.reqAnim = requestAnimationFrame(animate);
            this.controls3D.update();
            this.renderer3D.render(this.scene3D, this.camera3D);
        };
        animate(); 
    },

    build3DScene() {
        while(this.scene3D.children.length > 0){ this.scene3D.remove(this.scene3D.children[0]); }

        const W = this.activeRoom.w;
        const D = this.activeRoom.h;
        const H = ARCH_CONFIG.DEFAULTS.WALL_HEIGHT_3D; 
        const T = ARCH_CONFIG.DEFAULTS.WALL_THICKNESS_3D;
        
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene3D.add(ambient);
        const pointLight = new THREE.PointLight(0xfff5e6, 0.8, 1000); 
        pointLight.position.set(W/2, H - 20, D/2);
        this.scene3D.add(pointLight);

        // FLOOR
        let floorMat;
        if (typeof getProceduralTexture === 'function') {
            const texType = typeof getTextureForRoom === 'function' ? getTextureForRoom(this.activeRoom.type) : 'wood';
            const floorTex = getProceduralTexture(texType).clone();
            floorTex.needsUpdate = true;
            floorTex.repeat.set(W / 60, D / 60);
            floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6, metalness: 0.1 });
        } else {
            floorMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1 });
        }

        const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(W/2, 0, D/2);
        this.scene3D.add(floor);

        // 🌟 RESTORED: TRANSLUCENT WALLS
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x475569, transparent: true, opacity: STUDIO_CONFIG.WALL_OPACITY, side: THREE.DoubleSide });
        const wN = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), wallMat); wN.position.set(W/2, H/2, -T/2);
        const wS = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), wallMat); wS.position.set(W/2, H/2, D + T/2);
        const wE = new THREE.Mesh(new THREE.BoxGeometry(T, H, D), wallMat); wE.position.set(W + T/2, H/2, D/2);
        const wW = new THREE.Mesh(new THREE.BoxGeometry(T, H, D), wallMat); wW.position.set(-T/2, H/2, D/2);
        this.scene3D.add(wN, wS, wE, wW);

        // 🌟 RESTORED: 3D DOORS & WINDOWS
        this.sandboxDoorsWindows.forEach(fix => {
            const isDoor = fix.type === 'door';
            const fw = fix.size;
            const fh = isDoor ? 80 : 40;
            const fd = 8;
            
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
            const panelMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
            
            const group = new THREE.Group();
            const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, fd), frameMat);
            const panel = new THREE.Mesh(new THREE.BoxGeometry(fw-4, fh-4, fd+1), panelMat);
            group.add(frame, panel);

            let px = 0, py = isDoor ? fh/2 : 40 + fh/2, pz = 0;
            
            if (fix.edge === 'bottom') { px = fix.offset + fw/2; pz = D; }
            if (fix.edge === 'top') { px = fix.offset + fw/2; pz = 0; }
            if (fix.edge === 'left') { pz = fix.offset + fw/2; px = 0; group.rotation.y = Math.PI/2; }
            if (fix.edge === 'right') { pz = fix.offset + fw/2; px = W; group.rotation.y = Math.PI/2; }

            group.position.set(px, py, pz);
            this.scene3D.add(group);
        });

        // RENDER FURNITURE WITH ROTATION SUPPORT
        this.sandboxFixtures.forEach((fix, idx) => {
            if (typeof FurnitureFactory !== 'undefined') {
                let drawW = fix.w;
                let drawH = fix.h;
                
                if (Math.abs(fix.rot) === 90 || Math.abs(fix.rot) === 270) {
                    drawW = fix.h;
                    drawH = fix.w;
                }
                
                const mesh = createFurniture3D(fix.type, drawW, drawH);
                
                if (fix.rot) mesh.rotation.y = fix.rot * (Math.PI / 180);
                mesh.position.set(fix.x + (fix.w/2), 0, fix.y + (fix.h/2));
                
                mesh.userData = { isFurniture: true, index: idx };
                
                mesh.traverse(child => { 
                    if(child.isMesh){ 
                        child.castShadow = true; 
                        if (idx === this.selectedFixtureIndex) {
                            child.material = child.material.clone(); 
                            child.material.emissive = new THREE.Color(0x0ea5e9);
                            child.material.emissiveIntensity = 0.3;
                        }
                    }
                });
                
                this.scene3D.add(mesh);
            }
        });

        this.controls3D.target.set(W/2, H/4, D/2);
        this.camera3D.position.set(W/2, H * 2.2, D * 2.2);
        this.controls3D.update();
    },

    // =========================================
    // 🌟 3D RAYCASTING EVENT HANDLERS 🌟
    // =========================================
    on3DPointerDown(event) {
        if (!this.is3DActive) return;
        const container = document.getElementById('studio-3d-container');
        const rect = container.getBoundingClientRect();
        
        // Convert mouse position to normalized device coordinates (-1 to +1)
        this.mouse3D.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        this.mouse3D.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse3D, this.camera3D);
        
        // Intersect all children
        const intersects = this.raycaster.intersectObjects(this.scene3D.children, true);
        let selectedGroup = null;
        
        for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;
            // Climb up the hierarchy to find the parent group we tagged
            while (obj.parent && obj.parent !== this.scene3D) {
                if (obj.userData && obj.userData.isFurniture) break;
                obj = obj.parent;
            }
            if (obj.userData && obj.userData.isFurniture) {
                selectedGroup = obj;
                break;
            }
        }
        
        if (selectedGroup) {
            this.selectedFixtureIndex = selectedGroup.userData.index;
            this.is3DDragging = true;
            this.controls3D.enabled = false; // Disable camera orbit while dragging object
            
            // Calculate where we clicked on the plane to establish a drag offset
            this.raycaster.ray.intersectPlane(this.dragPlane, this.dragOffset3D);
            this.dragOffset3D.sub(selectedGroup.position);
            
            this.renderProperties();
            this.build3DScene(); // Rebuild to apply blue glow
        } else {
            this.selectedFixtureIndex = -1;
            this.renderProperties();
            this.build3DScene();
        }
    },

    on3DPointerMove(event) {
        if (!this.is3DDragging || this.selectedFixtureIndex === -1 || !this.is3DActive) return;
        
        // 🚀 THROTTLE: If a frame is already waiting to be drawn, skip this mouse event!
        if (this._raycastPending) return;
        this._raycastPending = true;
        
        requestAnimationFrame(() => {
            const container = document.getElementById('studio-3d-container');
            const rect = container.getBoundingClientRect();
            this.mouse3D.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
            this.mouse3D.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
            
            this.raycaster.setFromCamera(this.mouse3D, this.camera3D);
            
            const intersectPoint = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
            
            if (intersectPoint) {
                const fix = this.sandboxFixtures[this.selectedFixtureIndex];
                
                // Calculate new X/Z position minus the offset we started the drag with
                let newX = intersectPoint.x - this.dragOffset3D.x - (fix.w/2);
                let newY = intersectPoint.z - this.dragOffset3D.z - (fix.h/2); 
                
                // Apply grid snap
                const snap = typeof STUDIO_CONFIG !== 'undefined' ? STUDIO_CONFIG.GRID_SNAP_INCHES : 6;
                newX = Math.round(newX / snap) * snap;
                newY = Math.round(newY / snap) * snap;
                
                // Boundaries
                newX = Math.max(0, Math.min(newX, this.activeRoom.w - fix.w));
                newY = Math.max(0, Math.min(newY, this.activeRoom.h - fix.h));
                
                fix.x = newX;
                fix.y = newY;
                
                // Sync UI panel and rebuild scene
                this.renderProperties();
                this.build3DScene();
            }
            
            // 🚀 Unlock the throttle so the next frame can process
            this._raycastPending = false; 
        });
    },

    on3DPointerUp() {
        this.is3DDragging = false;
        if (this.controls3D) this.controls3D.enabled = true; // Re-enable camera orbit
    },

    handleKeydown(e) {
        if (document.activeElement.tagName === 'INPUT') return;
        if (e.key.toLowerCase() === 'r') this.rotateSelected();
        if (e.key === 'Delete' || e.key === 'Backspace') this.deleteSelected();
    },

    renderCatalog() {
        const grid = document.getElementById('rs-catalog-grid');
        if (!grid) {
            console.warn("Catalog grid container not found!");
            return;
        }
        
        // Clear previous items
        grid.innerHTML = '';
        
        // Check if catalog data exists in constants.js
        if (typeof FURNITURE_CATALOG === 'undefined') {
            console.error("FURNITURE_CATALOG is missing from constants.js");
            return;
        }
        
        FURNITURE_CATALOG.forEach(item => {
            const div = document.createElement('div');
            div.className = 'rs-item';
            div.draggable = true;
            
            // Build the UI card for the furniture
            div.innerHTML = `
                <div style="font-size: 1.8rem; margin-bottom: 5px; pointer-events: none;">${item.icon}</div>
                <div style="font-size: 0.65rem; color: #cbd5e1; pointer-events: none;">${item.label}</div>
            `;
            
            // Drag and Drop Event Listeners
            div.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', item.id);
                e.dataTransfer.effectAllowed = 'copy';
                div.style.opacity = '0.5';
                div.style.border = '1px dashed #38bdf8'; // Visual feedback while dragging
            };
            
            div.ondragend = () => { 
                div.style.opacity = '1'; 
                div.style.border = '1px solid rgba(255,255,255,0.05)';
            };
            
            grid.appendChild(div);
        });
    },

    setupDragAndDrop() {
        // FIX: Target the actual canvas wrapper class used in your HTML
        const dropzone = document.querySelector('.rs-canvas-wrapper') || document.getElementById('studio-svg');
        if (!dropzone) return;

        dropzone.addEventListener('click', (e) => {
            if (e.target.tagName === 'rect' && e.target.parentElement.id === 'rs-room-group') {
                this.selectedFixtureIndex = -1;
                this.renderCanvas();
            }
        });

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.is3DActive) return alert("Please switch back to 2D Plan to drop furniture.");

            const type = e.dataTransfer.getData('text/plain');
            if (!type || !ARCH_CONFIG.DEFAULTS.FURNITURE[type]) return;

            const pt = this.getSVGPos(e);
            const w = ARCH_CONFIG.DEFAULTS.FURNITURE[type].w;
            const h = ARCH_CONFIG.DEFAULTS.FURNITURE[type].h;

            const snap = STUDIO_CONFIG.GRID_SNAP_INCHES;
            let localX = Math.round((pt.x - (w / 2)) / snap) * snap;
            let localY = Math.round((pt.y - (h / 2)) / snap) * snap;

            localX = Math.max(0, Math.min(localX, this.activeRoom.w - w));
            localY = Math.max(0, Math.min(localY, this.activeRoom.h - h));

            this.sandboxFixtures.push({
                type: type, w: w, h: h, 
                x: localX, y: localY, rot: 0,
                isFurniture: true
            });

            this.selectedFixtureIndex = this.sandboxFixtures.length - 1;
            this.renderCanvas();
            this.renderProperties();
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (typeof RoomStudio !== 'undefined') {
        RoomStudio.init();
    }
});