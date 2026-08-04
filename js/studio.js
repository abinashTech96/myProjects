// =========================================
// ROOM STUDIO ENGINE (studio.js) - REFACTORED
// Local Sandbox Editor with Resizing, Realism & 3D Preview
// =========================================

// 1. DATA-DRIVEN CONFIGURATION
const ROOM_STUDIO_CONFIG = {
    header: {
        icon: '🛋️',
        title: 'ROOM STUDIO',
        hint: "Drag to add. Click to select. 'R' to Rotate. 'Del' to Remove."
    },
    labels: {
        catalogTitle: 'CATALOG',
        editPrefix: '⚙️ EDIT',
        btnDelete: '✕ Del',
        btnRotate: '🔄 Rotate 90°'
    },
    actions: [
        { 
            id: 'std-toggle-3d-btn',
            class: 'std-btn std-btn-3d',
            text: '👁️ 3D PREVIEW',
            action: 'RoomStudio.toggle3D()' 
        },
        { 
            id: 'std-discard-btn',
            class: 'std-btn cancel',
            text: 'Discard',
            action: 'RoomStudio.close()' 
        },
        {
            id: 'std-save-btn',
            class: 'std-btn save',
            text: '💾 Save to Plan',
            action: 'RoomStudio.save()' 
        }
    ],
    propertyFields: [
        { prop: 'x', label: 'POS X (in)', step: 6, min: 0 },
        { prop: 'y', label: 'POS Y (in)', step: 6, min: 0 },
        { prop: 'w', label: 'WIDTH (in)', step: 6, min: 12 },
        { prop: 'h', label: 'DEPTH (in)', step: 6, min: 12 }
    ],
    catalog: typeof FURNITURE_CATALOG !== 'undefined' ? FURNITURE_CATALOG : []
};

// 2. CORE ENGINE
const RoomStudio = {
    activeRoomIndex: null,
    activeRoom: null,
    sandboxFixtures: [], 
    sandboxDoorsWindows: [], 
    selectedFixtureIndex: -1, 
    boundKeyHandler: null,
    boundDragMove: null,
    boundDragUp: null,

    // Drag State (2D)
    isDragging: false,
    dragOffset: { x: 0, y: 0 },

    // 3D State & Raycasting
    is3DActive: false,
    scene3D: null, camera3D: null, renderer3D: null, controls3D: null, reqAnim: null,
    raycaster: null, mouse3D: null, dragPlane: null, is3DDragging: false, dragOffset3D: null,

    // 🌟 DATA-DRIVEN UI GENERATOR
    buildUI() {
        if (document.getElementById('room-studio-modal')) return;

        const buttonsHTML = ROOM_STUDIO_CONFIG.actions.map(btn => 
            `<button id="${btn.id}" class="${btn.class}" onclick="${btn.action}">${btn.text}</button>`
        ).join('');

        const uiTemplate = `
            <div id="room-studio-modal" style="display: none;">
                <div class="std-backdrop"></div>
                <div class="std-container">
                    <div class="std-header">
                        <div class="std-header-left">
                            <span class="std-header-icon">${ROOM_STUDIO_CONFIG.header.icon}</span>
                            <div>
                                <div id="std-room-title" class="std-room-title">${ROOM_STUDIO_CONFIG.header.title}</div>
                                <div id="std-room-dims" class="std-room-dims"></div>
                            </div>
                        </div>
                        <div class="std-header-right">
                            ${buttonsHTML}
                        </div>
                    </div>
                    
                    <div class="std-workspace">
                        <div class="std-canvas-wrapper">
                            <div id="studio-3d-container" class="std-3d-container" style="display: none;"></div>
                            <svg id="studio-svg" class="std-svg-canvas">
                                <defs>
                                    <pattern id="std-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                                        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
                                    </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#std-grid)" />
                                <g id="std-ghost-group"></g>
                                <g id="std-room-group"></g>
                                <g id="std-furniture-group"></g>
                            </svg>
                            <div id="std-hint" class="std-hint">${ROOM_STUDIO_CONFIG.header.hint}</div>
                        </div>

                        <div class="std-catalog">
                            <div id="std-properties" class="std-properties-panel" style="display: none;"></div>
                            <h3 class="std-catalog-title">${ROOM_STUDIO_CONFIG.labels.catalogTitle}</h3>
                            <div id="std-catalog-grid" class="std-grid"></div>
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
        
        this.boundDragMove = (e) => this.handleDragMove(e);
        this.boundDragUp = () => { this.isDragging = false; };

        window.addEventListener('mousemove', this.boundDragMove);
        window.addEventListener('mouseup', this.boundDragUp);
    },

    open() {
        if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1 || typeof elements === 'undefined') return;
        
        this.activeRoomIndex = selectedElIndex;
        this.activeRoom = elements[this.activeRoomIndex];
        if (!this.activeRoom) return;

        this.selectedFixtureIndex = -1;
        this.is3DActive = false;
        
        document.getElementById('std-room-title').innerText = this.activeRoom.customName || this.activeRoom.type;
        const dimsEl = document.getElementById('std-room-dims');
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

        const btn = document.getElementById('std-toggle-3d-btn');
        if (btn) {
            btn.innerHTML = ROOM_STUDIO_CONFIG.actions[0].text;
            btn.classList.remove('std-btn-3d-active');
        }
        
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

        const modal = document.getElementById('room-studio-modal');
        if (modal) modal.style.display = 'none';
        document.removeEventListener('keydown', this.boundKeyHandler);
    },

    save() {
        if (typeof saveState === 'function') saveState();
        if (typeof elements === 'undefined') return;

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
        if (typeof window.is3DMode !== 'undefined' && window.is3DMode && typeof generate3DModel === 'function') generate3DModel();
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
        if (!this.isDragging || this.selectedFixtureIndex === -1 || this.is3DActive || !this.activeRoom) return;
        const pt = this.getSVGPos(event);
        const fix = this.sandboxFixtures[this.selectedFixtureIndex];
        
        let newX = pt.x - this.dragOffset.x;
        let newY = pt.y - this.dragOffset.y;
        
        let snap = (typeof STUDIO_CONFIG !== 'undefined' && STUDIO_CONFIG.GRID_SNAP_INCHES) ? STUDIO_CONFIG.GRID_SNAP_INCHES : 6;
        if (typeof CanvasState !== 'undefined') {
            if (CanvasState.zoomLvl > 2.5) snap = 1;
            else if (CanvasState.zoomLvl < 0.8) snap = 12;
        }
        newX = Math.round(newX / snap) * snap; 
        newY = Math.round(newY / snap) * snap;

        const SNAP_DIST = (typeof STUDIO_CONFIG !== 'undefined' && STUDIO_CONFIG.MAGNETIC_SNAP_DIST) ? STUDIO_CONFIG.MAGNETIC_SNAP_DIST : 18;
        const roomW = this.activeRoom.w;
        const roomH = this.activeRoom.h;

        const distLeft = newX;
        const distRight = roomW - (newX + fix.w);
        const distTop = newY;
        const distBottom = roomH - (newY + fix.h);

        const minDist = Math.min(distLeft, distRight, distTop, distBottom);

        // FIX 1: Removed forced fix.rot assignments. Only snap X/Y coordinates.
        if (minDist < SNAP_DIST) {
            if (minDist === distTop) { newY = 0; } 
            else if (minDist === distBottom) { newY = roomH - fix.h; } 
            else if (minDist === distLeft) { newX = 0; } 
            else if (minDist === distRight) { newX = roomW - fix.w; }
        }
        
        newX = Math.max(0, Math.min(newX, roomW - fix.w));
        newY = Math.max(0, Math.min(newY, roomH - fix.h));
        
        fix.x = newX;
        fix.y = newY;
        
        this.renderCanvas();
        if (typeof this.renderProperties === 'function') {
            this.renderProperties(); 
        }
    },

    renderCanvas() {
        if (!this.activeRoom) return;
        const svg = document.getElementById('studio-svg');
        const roomGroup = document.getElementById('std-room-group');
        const furnGroup = document.getElementById('std-furniture-group');
        const ghostGroup = document.getElementById('std-ghost-group');
        
        const maxDim = Math.max(this.activeRoom.w, this.activeRoom.h);
        const padding = maxDim * 0.35; 
        const vW = this.activeRoom.w + (padding * 2);
        const vH = this.activeRoom.h + (padding * 2);
        svg.setAttribute('viewBox', `-${padding} -${padding} ${vW} ${vH}`);

        let ghostHTML = '';
        if (typeof elements !== 'undefined') {
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
        }
        ghostGroup.innerHTML = ghostHTML;

        let rgb = (typeof ARCH_CONFIG !== 'undefined' && ARCH_CONFIG.COLORS && ARCH_CONFIG.COLORS[this.activeRoom.type]) ? ARCH_CONFIG.COLORS[this.activeRoom.type].rgb : '255,255,255';
        if (this.activeRoom.customColor) {
            const hex = this.activeRoom.customColor.replace('#', '');
            rgb = `${parseInt(hex.substring(0,2),16)}, ${parseInt(hex.substring(2,4),16)}, ${parseInt(hex.substring(4,6),16)}`;
        }

        let roomHTML = `<rect x="0" y="0" width="${this.activeRoom.w}" height="${this.activeRoom.h}" fill="rgba(${rgb}, 0.15)" stroke="rgb(${rgb})" stroke-width="3" />`;
        
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

        furnGroup.innerHTML = '';
        this.sandboxFixtures.forEach((f, idx) => {
            const isSelected = idx === this.selectedFixtureIndex;
            const strokeColor = isSelected ? '#38bdf8' : '#ec4899';
            const fillColor = isSelected ? 'rgba(56, 189, 248, 0.3)' : 'rgba(236, 72, 153, 0.2)';
            
            const isTurned = Math.abs(f.rot) === 90 || Math.abs(f.rot) === 270;
            const drawW = isTurned ? f.h : f.w;
            const drawH = isTurned ? f.w : f.h;

            // FIX 3: Reduced font-size from 10 to 4 (real-world inches).
            const displayName = f.type.toUpperCase().substring(0, 8); 

            furnGroup.innerHTML += `
                <g transform="translate(${f.x}, ${f.y})" 
                   onmousedown="RoomStudio.startDrag(${idx}, event)" 
                   class="${isSelected ? 'std-cursor-grabbing' : 'std-cursor-grab'}">
                    <rect width="${drawW}" height="${drawH}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${isSelected ? 3 : 1}" />
                    <text x="${drawW/2}" y="${drawH/2 + 1.5}" fill="#f8fafc" font-size="4" text-anchor="middle" font-weight="bold" pointer-events="none">
                          ${displayName}
                    </text>
                </g>
            `;
        });

        this.renderProperties();
    },

    renderProperties() {
        const propPanel = document.getElementById('std-properties');
        if (!propPanel) return;

        if (this.selectedFixtureIndex === -1) {
            propPanel.style.display = 'none';
            return;
        }

        const fix = this.sandboxFixtures[this.selectedFixtureIndex];
        const isAlreadyOpen = propPanel.style.display === 'block';
        const currentTitle = document.getElementById('std-prop-title');

        if (isAlreadyOpen && currentTitle && currentTitle.innerText.includes(fix.type.toUpperCase())) {
            ROOM_STUDIO_CONFIG.propertyFields.forEach(field => {
                const el = document.getElementById(`std-dim-${field.prop}`);
                if (el) el.value = fix[field.prop];
            });
            return; 
        }

        const inputsHTML = ROOM_STUDIO_CONFIG.propertyFields.map(field => `
            <div class="std-prop-field">
                <label class="std-prop-label">${field.label}</label>
                <input id="std-dim-${field.prop}" class="std-prop-input" type="number" value="${fix[field.prop]}" min="${field.min}" step="${field.step}" 
                       oninput="RoomStudio.modifyFixture('${field.prop}', this.value)">
            </div>
        `).join('');

        propPanel.style.display = 'block';
        propPanel.innerHTML = `
            <div class="std-prop-header">
                <span id="std-prop-title" class="std-prop-title-text">
                    ${ROOM_STUDIO_CONFIG.labels.editPrefix} ${fix.type}
                </span>
                <button class="std-btn-delete" onclick="RoomStudio.deleteSelected()">
                    ${ROOM_STUDIO_CONFIG.labels.btnDelete}
                </button>
            </div>
            
            <div class="std-prop-grid">
                ${inputsHTML}
            </div>
            <button class="std-btn-rotate" onclick="RoomStudio.rotateSelected()">
                ${ROOM_STUDIO_CONFIG.labels.btnRotate}
            </button>
        `;
    },

    modifyFixture(prop, value) {
        if (this.selectedFixtureIndex === -1 || !this.activeRoom) return;
        let num = parseInt(value);
        if (isNaN(num)) return;
        
        this.sandboxFixtures[this.selectedFixtureIndex][prop] = num;
        
        const fix = this.sandboxFixtures[this.selectedFixtureIndex];
        fix.x = Math.max(0, Math.min(fix.x, this.activeRoom.w - fix.w));
        fix.y = Math.max(0, Math.min(fix.y, this.activeRoom.h - fix.h));

        if (this.is3DActive) this.build3DScene();
        else this.renderCanvas();
    },

    rotateSelected() {
        if (this.selectedFixtureIndex === -1 || !this.activeRoom) return;
        const fix = this.sandboxFixtures[this.selectedFixtureIndex];
        
        fix.rot = ((fix.rot || 0) + 90) % 360;
        
        const isTurned = Math.abs(fix.rot) === 90 || Math.abs(fix.rot) === 270;
        const visualW = isTurned ? fix.h : fix.w;
        const visualH = isTurned ? fix.w : fix.h;
        
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

    toggle3D() {
        this.is3DActive = !this.is3DActive;
        const btn = document.getElementById('std-toggle-3d-btn');
        const svg = document.getElementById('studio-svg');
        const container3D = document.getElementById('studio-3d-container');

        if (this.is3DActive) {
            btn.innerHTML = '📐 BACK TO 2D';
            btn.classList.add('std-btn-3d-active');
            svg.style.display = 'none';
            container3D.style.display = 'block';
            
            this.init3D();
            this.build3DScene();
        } else {
            btn.innerHTML = ROOM_STUDIO_CONFIG.actions[0].text;
            btn.classList.remove('std-btn-3d-active');
            svg.style.display = 'block';
            container3D.style.display = 'none';
            // FIX 2: Force the 2D canvas to redraw using updated 3D coordinates
            this.renderCanvas();
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
            this.controls3D.maxPolarAngle = Math.PI;

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
        if (!this.scene3D) return;

        // Clean disposal of meshes, materials, and textures to prevent memory leaks
        while(this.scene3D.children.length > 0){ 
            const obj = this.scene3D.children[0];
            this.scene3D.remove(obj);
            obj.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => {
                            if (m.map) m.map.dispose();
                            m.dispose();
                        });
                    } else {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                }
            });
        }

        const W = this.activeRoom.w;
        const D = this.activeRoom.h;
        const H = typeof ARCH_CONFIG !== 'undefined' ? ARCH_CONFIG.DEFAULTS.WALL_HEIGHT_3D : 120; 
        const T = typeof ARCH_CONFIG !== 'undefined' ? ARCH_CONFIG.DEFAULTS.WALL_THICKNESS_3D : 6;
        
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene3D.add(ambient);
        const pointLight = new THREE.PointLight(0xfff5e6, 0.8, 1000); 
        pointLight.position.set(W/2, H - 20, D/2);
        this.scene3D.add(pointLight);

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
        
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x475569, transparent: true, opacity: typeof STUDIO_CONFIG !== 'undefined' ? STUDIO_CONFIG.WALL_OPACITY : 0.35, side: THREE.DoubleSide });
        const wN = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), wallMat); wN.position.set(W/2, H/2, -T/2);
        const wS = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), wallMat); wS.position.set(W/2, H/2, D + T/2);
        const wE = new THREE.Mesh(new THREE.BoxGeometry(T, H, D), wallMat); wE.position.set(W + T/2, H/2, D/2);
        const wW = new THREE.Mesh(new THREE.BoxGeometry(T, H, D), wallMat); wW.position.set(-T/2, H/2, D/2);
        this.scene3D.add(wN, wS, wE, wW);
        
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
        
        this.sandboxFixtures.forEach((fix, idx) => {
            if (typeof createFurniture3D !== 'undefined') {
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

    // 🌟 3D RAYCASTING EVENT HANDLERS
    on3DPointerDown(event) {
        if (!this.is3DActive) return;
        const container = document.getElementById('studio-3d-container');
        const rect = container.getBoundingClientRect();
        this.mouse3D.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
        this.mouse3D.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse3D, this.camera3D);
        const intersects = this.raycaster.intersectObjects(this.scene3D.children, true);
        let selectedGroup = null;
        
        for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;
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
            this.controls3D.enabled = false;
            
            this.raycaster.ray.intersectPlane(this.dragPlane, this.dragOffset3D);
            this.dragOffset3D.sub(selectedGroup.position);
            
            this.renderProperties();
            this.build3DScene();
        } else {
            this.selectedFixtureIndex = -1;
            this.renderProperties();
            this.build3DScene();
        }
    },

    on3DPointerMove(event) {
        if (!this.is3DDragging || this.selectedFixtureIndex === -1 || !this.is3DActive || !this.activeRoom) return;
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
                let newX = intersectPoint.x - this.dragOffset3D.x - (fix.w/2);
                let newY = intersectPoint.z - this.dragOffset3D.z - (fix.h/2); 
                const snap = (typeof STUDIO_CONFIG !== 'undefined' && STUDIO_CONFIG.GRID_SNAP_INCHES) ? STUDIO_CONFIG.GRID_SNAP_INCHES : 6;
                newX = Math.round(newX / snap) * snap;
                newY = Math.round(newY / snap) * snap;
                newX = Math.max(0, Math.min(newX, this.activeRoom.w - fix.w));
                newY = Math.max(0, Math.min(newY, this.activeRoom.h - fix.h));
                fix.x = newX;
                fix.y = newY;

                this.renderProperties();
                const activeMesh = this.scene3D.children.find(child => 
                    child.userData && child.userData.index === this.selectedFixtureIndex
                );
                if (activeMesh) {
                    activeMesh.position.set(fix.x + (fix.w/2), 0, fix.y + (fix.h/2));
                    if (this.renderer3D.shadowMap.enabled) {
                        this.renderer3D.shadowMap.needsUpdate = true;
                    }
                }
            }
            this._raycastPending = false; 
        });
    },

    on3DPointerUp() {
        this.is3DDragging = false;
        if (this.controls3D) this.controls3D.enabled = true; 
    },

    handleKeydown(e) {
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
        if (e.key.toLowerCase() === 'r') this.rotateSelected();
        if (e.key === 'Delete' || e.key === 'Backspace') this.deleteSelected();
    },

    renderCatalog() {
        const grid = document.getElementById('std-catalog-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        if (!ROOM_STUDIO_CONFIG.catalog) return;
        
        ROOM_STUDIO_CONFIG.catalog.forEach(item => {
            const div = document.createElement('div');
            div.className = 'std-item';
            div.draggable = true;
            
            div.innerHTML = `
                <div class="std-item-icon">${item.icon}</div>
                <div class="std-item-label">${item.label}</div>
            `;
            
            div.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', item.id);
                e.dataTransfer.effectAllowed = 'copy';
                div.classList.add('std-item-dragging');
            };
            
            div.ondragend = () => { 
                div.classList.remove('std-item-dragging');
            };
            
            grid.appendChild(div);
        });
    },

    setupDragAndDrop() {
        const dropzone = document.querySelector('.std-canvas-wrapper') || document.getElementById('studio-svg');
        if (!dropzone) return;

        dropzone.addEventListener('click', (e) => {
            if (e.target.tagName === 'rect' && e.target.parentElement.id === 'std-room-group') {
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
            if (!this.activeRoom || typeof ARCH_CONFIG === 'undefined') return;

            const type = e.dataTransfer.getData('text/plain');
            if (!type || !ARCH_CONFIG.DEFAULTS.FURNITURE[type]) return;

            const pt = this.getSVGPos(e);
            const w = ARCH_CONFIG.DEFAULTS.FURNITURE[type].w;
            const h = ARCH_CONFIG.DEFAULTS.FURNITURE[type].h;

            const snap = (typeof STUDIO_CONFIG !== 'undefined' && STUDIO_CONFIG.GRID_SNAP_INCHES) ? STUDIO_CONFIG.GRID_SNAP_INCHES : 6;
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