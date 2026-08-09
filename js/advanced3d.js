// =========================================
// ADVANCED 3D ISOLATION LOGIC (advanced3d.js)
// Single-File Component (CSS + JS)
// =========================================

// --- 1. INJECT MODULE-SPECIFIC CSS ---
const advanced3DStyles = `
    /* =========================================
       FLOATING BUTTON CSS (Adv3D Specific)
    ========================================= */
    .Adv3d_btn-adv-3d {
        width: 120px; 
        justify-content: center;
        background: linear-gradient(135deg, #0ea5e9, #3b82f6);
        border: none;
        color: #ffffff; 
        padding: 6px 10px; 
        border-radius: 10px; 
        font-weight: 800;
        font-size: 0.60rem; 
        letter-spacing: 0.5px;
        white-space: nowrap; 
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 3px; 
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        --nm-dark: rgba(4, 40, 80, 0.75);
        --nm-dark-soft: rgba(4, 40, 80, 0.4);
        --nm-light: rgba(125, 190, 255, 0.55);
        --nm-light-soft: rgba(125, 190, 255, 0.25);
        box-shadow:
            6px 6px 10px var(--nm-dark),
            12px 12px 28px var(--nm-dark-soft),
            -6px -6px 10px var(--nm-light),
            -12px -12px 28px var(--nm-light-soft),
            inset 0 2px 0 rgba(255,255,255,0.35),
            inset 0 -2px 4px rgba(0,0,0,0.25);
    }
    .Adv3d_btn-adv-3d:hover {
        transform: translateY(-3px);
        box-shadow:
            8px 8px 14px var(--nm-dark),
            16px 16px 34px var(--nm-dark-soft),
            -8px -8px 14px var(--nm-light),
            -16px -16px 34px var(--nm-light-soft),
            0 10px 28px rgba(59, 130, 246, 0.5),
            inset 0 2px 0 rgba(255,255,255,0.4),
            inset 0 -2px 4px rgba(0,0,0,0.25);
    }
    .Adv3d_btn-adv-3d:active {
        transform: translateY(2px);
        box-shadow:
            inset 8px 8px 16px var(--nm-dark),
            inset 14px 14px 26px var(--nm-dark-soft),
            inset -6px -6px 12px var(--nm-light),
            inset -2px -2px 4px rgba(0,0,0,0.4);
    }
    .Adv3d_btn-adv-3d .icon {
        font-size: 0.85rem;
        display: inline-block;
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .Adv3d_btn-adv-3d:hover .icon {
        transform: scale(1.25) rotate(-8deg);
    }

    /* =========================================
       ADVANCED 3D - NEUMORPHIC UI PANEL
    ========================================= */
    :root {
        --neu-bg: #151f32; 
        --neu-dark-shadow: 6px 6px 12px rgba(0, 0, 0, 0.6);
        --neu-light-shadow: -6px -6px 12px rgba(255, 255, 255, 0.05);
        --neu-inset-dark: inset 4px 4px 8px rgba(0, 0, 0, 0.6);
        --neu-inset-light: inset -4px -4px 8px rgba(255, 255, 255, 0.05);
    }

    .adv-3d-panel {
        position: absolute;
        top: 65px;
        right: 20px;
        width: 340px;
        background: var(--neu-bg);
        padding: 25px;
        border-radius: 20px;
        box-shadow: 12px 12px 24px rgba(0, 0, 0, 0.7), 
                   -2px -2px 10px rgba(255, 255, 255, 0.02);
        border: none;
        color: #f8fafc;
    }

    .adv-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 25px;
        padding-bottom: 15px;
        box-shadow: 0 4px 2px -2px rgba(0,0,0,0.4); 
    }

    .adv-header h3 {
        margin: 0;
        color: #e2e8f0;
        font-weight: 800;
        letter-spacing: 0.5px;
    }

    .adv-close-btn {
        background: var(--neu-bg);
        border: none;
        color: #94a3b8;
        width: 32px; height: 32px;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 3px 3px 6px rgba(0,0,0,0.5), 
                   -3px -3px 6px rgba(255,255,255,0.05);
        transition: all 0.2s ease;
        display: flex; align-items: center; justify-content: center;
    }
    .adv-close-btn:active {
        box-shadow: var(--neu-inset-dark), var(--neu-inset-light);
        color: #ef4444;
    }

    .adv-label {
        display: block;
        font-size: 0.65rem;
        font-weight: 800;
        color: #64748b;
        letter-spacing: 1px;
        margin-bottom: 12px;
        text-transform: uppercase;
    }

    .adv-tab-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
    }

    .adv-tab {
        background: var(--neu-bg);
        border: none;
        color: #94a3b8;
        padding: 8px 16px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 4px 4px 8px rgba(0,0,0,0.5), 
                   -4px -4px 8px rgba(255,255,255,0.05);
    }

    .adv-tab:hover {
        color: #e2e8f0;
        transform: translateY(-1px);
    }

    .adv-tab.active {
        color: #38bdf8;
        box-shadow: var(--neu-inset-dark), var(--neu-inset-light);
    }

    .adv-action-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin-bottom: 25px;
        margin-top: 15px;
    }

    .adv-btn {
        background: var(--neu-bg);
        border: none;
        padding: 12px;
        border-radius: 12px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 5px 5px 10px rgba(0,0,0,0.5), 
                   -5px -5px 10px rgba(255,255,255,0.05);
    }
    .adv-btn:active {
        box-shadow: var(--neu-inset-dark), var(--neu-inset-light);
    }
    .adv-btn-primary { color: #38bdf8; }
    .adv-btn-danger { color: #ef4444; }

    #adv-clip-slider {
        -webkit-appearance: none;
        width: 100%;
        background: transparent;
        margin-top: 5px;
    }
    #adv-clip-slider:focus { outline: none; }

    #adv-clip-slider::-webkit-slider-runnable-track {
        height: 10px;
        background: var(--neu-bg);
        border-radius: 10px;
        box-shadow: var(--neu-inset-dark), var(--neu-inset-light);
    }

    #adv-clip-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 20px;
        width: 20px;
        border-radius: 50%;
        background: #38bdf8;
        margin-top: -5px;
        box-shadow: 0 0 10px rgba(56, 189, 248, 0.4), 
                    3px 3px 6px rgba(0,0,0,0.6);
        cursor: pointer;
        transition: transform 0.1s;
    }
    #adv-clip-slider::-webkit-slider-thumb:active {
        transform: scale(0.85);
    }
`;

document.head.insertAdjacentHTML("beforeend", '<style>' + advanced3DStyles + '</style>');

// --- 2. STATE MANAGEMENT ---
const Adv3DState = {
    selectedFloor: null,
    selectedElement: null,
    ghostMode: true,
    originalMaterials: new Map()
};

// 🌟 THE COMPLETE NEUMORPHIC UI INJECTION
function initAdvanced3D() {
    if (document.getElementById('adv-3d-panel')) return;

    const uiTemplate = `
        <div id="adv-3d-panel" class="adv-3d-panel" style="display: none; z-index: 9999;">
            
            <div class="adv-header">
                <h3>⚙️ Advanced Studio</h3>
                <button class="adv-close-btn" onclick="Adv3D.closePanel()">✕</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <span class="adv-label">1. Select Floor</span>
                <div id="adv-floor-tabs" class="adv-tab-row"></div>
            </div>

            <div style="margin-bottom: 20px;">
                <span class="adv-label">2. Isolate Element</span>
                <div id="adv-element-tabs" class="adv-tab-row"></div>
            </div>

            <div style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;">
                <span class="adv-label" style="margin: 0;">Ghost Surroundings</span>
                <label class="ui-toggle" style="margin: 0;">
                    <input type="checkbox" checked onchange="Adv3D.toggleGhostMode(this.checked)">
                    <div class="slider"></div>
                </label>
            </div>

            <div class="adv-action-grid">
                <button class="adv-btn adv-btn-primary" onclick="Adv3D.viewIsolated()">🎯 Frame</button>
                <button class="adv-btn adv-btn-danger" onclick="Adv3D.resetIsolation()">↺ Reset</button>
            </div>

            <div style="margin-bottom: 25px;">
                <span class="adv-label">Render Mode</span>
                <div class="adv-tab-row" id="render-mode-tabs">
                    <button class="adv-tab active" onclick="Adv3D.setRenderMode('solid', this)">Solid</button>
                    <button class="adv-tab" onclick="Adv3D.setRenderMode('wireframe', this)">Wireframe</button>
                    <button class="adv-tab" onclick="Adv3D.setRenderMode('glass', this)">Glass</button>
                </div>
            </div>

            <div>
                <span class="adv-label">Y-Axis Clipping</span>
                <input type="range" id="adv-clip-slider" min="0" max="1500" value="1500" oninput="Adv3D.updateClippingPlane(this.value)">
            </div>

        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', uiTemplate);
}


// --- 3. DOM & UI MANAGERS ---
function closeAdvPanel() {
    const panel = document.getElementById('adv-3d-panel');
    if (panel) {
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(-10px)';
        setTimeout(() => panel.style.display = 'none', ARCH3D_CONFIG.ADVANCED_UI.ANIMATION_SPEED_MS);
    }
}

function toggleAdvWorkspace(isAdvanced) {
    const real3dToggle = document.querySelector('input[id*="real3D"], input[id*="real3d"]');
    const panel = document.getElementById('adv-3d-panel');

    if (isAdvanced) {
        if (real3dToggle && !real3dToggle.checked) {
            real3dToggle.checked = true;
            real3dToggle.dispatchEvent(new Event('change'));
        }
        panel.style.display = 'block';
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
        renderAdvFloors();
    } else {
        if (real3dToggle && real3dToggle.checked) {
            real3dToggle.checked = false;
            real3dToggle.dispatchEvent(new Event('change'));
        }
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(-10px)';
        setTimeout(() => panel.style.display = 'none', ARCH3D_CONFIG.ADVANCED_UI.ANIMATION_SPEED_MS);
    }
}

function renderAdvFloors() {
    const container = document.getElementById('adv-floor-tabs');
    if (!container) return;
    container.innerHTML = '';
    
    const maxFloor = elements.reduce((max, el) => Math.max(max, el.floor), 0);
    const floorCount = Math.max(parseInt(document.getElementById('b-floors')?.value || 1), maxFloor + 1);

    for (let i = 0; i < floorCount; i++) {
        const btn = document.createElement('button');
        btn.className = `adv-tab ${Adv3DState.selectedFloor === i ? 'active' : ''}`;
        btn.innerText = i === 0 ? 'Ground' : i === 1 ? '1st' : i === 2 ? '2nd' : `${i}th`;
        btn.onclick = () => selectAdvFloor(i);
        container.appendChild(btn);
    }
}

function renderAdvElements() {
    const container = document.getElementById('adv-element-tabs');
    if (!container) return;
    container.innerHTML = '';
    
    if (Adv3DState.selectedFloor === null) {
        container.innerHTML = '<span style="color: #64748b; font-size: 0.75rem;">Select a floor first...</span>';
        return;
    }

    const floorElements = elements
        .map((el, idx) => ({ ...el, originalIndex: idx }))
        .filter(el => el.floor === Adv3DState.selectedFloor && !el.isFurniture);

    if (floorElements.length === 0) {
        container.innerHTML = '<span style="color: #64748b; font-size: 0.75rem;">No elements on this floor.</span>';
        return;
    }

    const allBtn = document.createElement('button');
    allBtn.className = `adv-tab ${Adv3DState.selectedElement === null ? 'active' : ''}`;
    allBtn.innerText = "🌟 Entire Floor";
    allBtn.onclick = () => selectAdvElement(null);
    container.appendChild(allBtn);

    floorElements.forEach(el => {
        const btn = document.createElement('button');
        btn.className = `adv-tab ${Adv3DState.selectedElement === el.originalIndex ? 'active' : ''}`;
        const name = el.customName || el.type.toUpperCase();
        const emoji = el.isFurniture ? '🛋️' : (el.type === 'staircase' ? '🪜' : '🚪');
        
        btn.innerText = `${emoji} ${name}`;
        btn.onclick = () => selectAdvElement(el.originalIndex);
        container.appendChild(btn);
    });
}


// --- 4. EVENT CONTROLLERS ---
function selectAdvFloor(floorIndex) {
    Adv3DState.selectedFloor = floorIndex;
    Adv3DState.selectedElement = null; 
    renderAdvFloors(); 
    renderAdvElements();
}

function selectAdvElement(elIndex) {
    Adv3DState.selectedElement = elIndex;
    renderAdvElements();
}

function toggleAdvGhostMode(isActive) {
    Adv3DState.ghostMode = isActive;
    if (Adv3DState.selectedFloor !== null) executeIsolation();
}

function resetAdvIsolation() {
    if (!window.is3DMode || !Engine3D.buildingGroup) {
        toggleAdvWorkspace(false);
        return;
    }

    // 1. Capture current positions
    const startCam = Engine3D.camera.position.clone();
    const startTarget = Engine3D.controls.target.clone();
    
    // 2. Calculate "Home" destinations
    const { pos: endCam, target: endTarget } = getHomeViewCamera();
    
    // 3. Find current clipping height and calculate safe roof height
    const startCutY = Engine3D.renderer.localClippingEnabled && Engine3D.buildingGroup.children[0]?.material?.clippingPlanes 
                      ? Engine3D.buildingGroup.children[0].material.clippingPlanes[0].constant : 0;
    const endCutY = getRoofClippingHeight();

    // 4. Create dummy plane for reverse animation
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), startCutY);

    // 5. Trigger Cinematic Reset
    animateCinematicReset(startCam, endCam, startTarget, endTarget, clipPlane, startCutY, endCutY);
    
    // 6. Reset UI immediately
    Adv3DState.selectedFloor = null;
    Adv3DState.selectedElement = null;
    renderAdvFloors();
    renderAdvElements();
    toggleAdvWorkspace(false);
}


// --- 5. CORE 3D ORCHESTRATORS ---
function executeIsolation() {
    if (Adv3DState.selectedFloor === null) return alert("Please select a floor first!");
    
    sync2DToAdv3D();

    setTimeout(() => {
        if (!Engine3D.buildingGroup || typeof Engine3D.renderer === 'undefined') return;

        Engine3D.renderer.localClippingEnabled = true;

        const startCamPos = Engine3D.camera.position.clone();
        const startTarget = Engine3D.controls.target.clone();

        const targetCutY = calculateClippingPlaneY();
        const startCutY = targetCutY + ARCH3D_CONFIG.ADVANCED_UI.CINEMATIC.SWEEP_OFFSET;
        const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), startCutY);
        
        const ghostMat = createGhostMaterial(clipPlane);
        const isolatedBox = new THREE.Box3();
        let hasValidBounds = false;

        Engine3D.buildingGroup.traverse(child => {
            if (child.isMesh) {
                const isValid = processMeshNode(child, clipPlane, ghostMat, isolatedBox);
                if (isValid) hasValidBounds = true;
            } 
        });

        if (hasValidBounds) {
            const { endCamPos, endTarget } = calculateCameraTargets(isolatedBox);
            animateCinematicSweep(startCamPos, endCamPos, startTarget, endTarget, clipPlane, startCutY, targetCutY);
        }
    }, 100);
}

// Fired automatically by animateCinematicReset when it finishes
function finalizeReset() {
    if (typeof Engine3D.renderer !== 'undefined') Engine3D.renderer.localClippingEnabled = false;

    Engine3D.buildingGroup.traverse(child => {
        if (child.isMesh) {
            child.visible = true;
            if (Adv3DState.originalMaterials.has(child.uuid)) {
                const originalMat = Adv3DState.originalMaterials.get(child.uuid);
                applyClipToMaterial(originalMat, null);
                child.material = originalMat;
            }
        }
    });
    Engine3D.controls.enabled = true;
}


// --- 6. 3D MATH & RENDER HELPERS ---
function sync2DToAdv3D() {
    if (typeof setFloor === 'function' && currentFloor !== Adv3DState.selectedFloor) setFloor(Adv3DState.selectedFloor);
    if (typeof selectedElIndex !== 'undefined') selectedElIndex = Adv3DState.selectedElement !== null ? Adv3DState.selectedElement : -1;
    if (typeof renderSidebar === 'function') renderSidebar();
    if (typeof window.is3DMode !== 'undefined' && !window.is3DMode) toggle3D();
}

function calculateClippingPlaneY() {
    const scale = parseFloat(document.getElementById('scaleInput')?.value || 1.2);
    const wallHeight = ARCH3D_CONFIG.DEFAULTS.WALL_HEIGHT * scale;
    const floorBaseY = Adv3DState.selectedFloor * wallHeight;
    return floorBaseY + (wallHeight * ARCH3D_CONFIG.ADVANCED_UI.ISOLATION_CUT_RATIO); 
}

function createGhostMaterial(clipPlane) {
    return new THREE.MeshStandardMaterial({ 
        color: ARCH3D_CONFIG.ADVANCED_UI.GHOST_MATERIAL.COLOR, 
        transparent: true, 
        opacity: ARCH3D_CONFIG.ADVANCED_UI.GHOST_MATERIAL.OPACITY, 
        depthWrite: false, 
        wireframe: true,
        clippingPlanes: [clipPlane]
    });
}

function applyClipToMaterial(material, planes) {
    if (!material) return;
    if (Array.isArray(material)) {
        material.forEach(m => { m.clippingPlanes = planes; m.needsUpdate = true; });
    } else {
        material.clippingPlanes = planes;
        material.needsUpdate = true;
    }
}

function processMeshNode(child, clipPlane, ghostMat, isolatedBox) {
    if (!Adv3DState.originalMaterials.has(child.uuid)) {
        Adv3DState.originalMaterials.set(child.uuid, child.material);
    }

    let mat = Adv3DState.originalMaterials.get(child.uuid);
    let elIndex = child.userData ? child.userData.roomIndex : null;
    let el = (elIndex !== null && elIndex !== undefined) ? elements[elIndex] : null;

    if (child.userData && child.userData.isRoof) {
        child.visible = false;
        return false;
    }

    if (el) {
        if (el.floor > Adv3DState.selectedFloor) {
            child.visible = false;
        } else if (el.floor < Adv3DState.selectedFloor) {
            child.visible = true;
            applyClipToMaterial(mat, null); 
            child.material = mat;
        } else if (el.floor === Adv3DState.selectedFloor) {
            child.visible = true;
            applyClipToMaterial(mat, [clipPlane]); 

            if (Adv3DState.selectedElement !== null) {
                if (elIndex === Adv3DState.selectedElement || el.isFurniture) {
                    child.material = mat; 
                } else {
                    child.material = Adv3DState.ghostMode ? ghostMat : (child.visible = false, mat);
                }
            } else {
                child.material = mat;
            }
        }
    } else {
        child.visible = true;
        applyClipToMaterial(mat, [clipPlane]);
        child.material = mat;
    }

    if (child.visible && child.material !== ghostMat && el && el.floor === Adv3DState.selectedFloor) {
        if (Adv3DState.selectedElement === null || elIndex === Adv3DState.selectedElement) {
            isolatedBox.expandByObject(child);
            return true;
        }
    }
    return false;
}

function calculateCameraTargets(isolatedBox) {
    const center = new THREE.Vector3();
    isolatedBox.getCenter(center);
    const size = new THREE.Vector3();
    isolatedBox.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = Engine3D.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2)); 
    const camConfig = ARCH3D_CONFIG.ADVANCED_UI.CAMERA;

    const endCamPos = new THREE.Vector3();
    const endTarget = center.clone();

    if (Adv3DState.selectedElement !== null) {
        cameraZ *= camConfig.ISOLATED_ZOOM; 
        endCamPos.set(
            center.x, 
            center.y + (cameraZ * camConfig.ISOLATED_Y_OFFSET), 
            center.z + (cameraZ * camConfig.ISOLATED_Z_OFFSET)
        ); 
    } else {
        cameraZ *= camConfig.FLOOR_ZOOM; 
        endCamPos.set(
            center.x + (cameraZ * camConfig.FLOOR_X_OFFSET), 
            center.y + (cameraZ * camConfig.FLOOR_Y_OFFSET), 
            center.z + cameraZ * camConfig.FLOOR_Z_OFFSET
        );
    }
    return { endCamPos, endTarget };
}

function getHomeViewCamera() {
    return {
        pos: new THREE.Vector3(500, 800, 1000),
        target: new THREE.Vector3(500, 0, 500)
    };
}

function getRoofClippingHeight() {
    const scale = parseFloat(document.getElementById('scaleInput')?.value || 1.2);
    const maxFloor = elements.reduce((max, el) => Math.max(max, el.floor), 0);
    return (maxFloor + 2) * ARCH3D_CONFIG.DEFAULTS.WALL_HEIGHT * scale * 1.5;
}


// --- 7. ANIMATION CONTROLLERS ---
function animateCinematicSweep(startCam, endCam, startTarget, endTarget, clipPlane, startCutY, endCutY) {
    if (typeof Engine3D.controls === 'undefined' || !Engine3D.camera) return;

    Engine3D.controls.enabled = false; 
    const duration = ARCH3D_CONFIG.ADVANCED_UI.CINEMATIC.SWEEP_DURATION_MS;
    const startTime = performance.now();
    const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    function updateFrame(time) {
        const elapsed = time - startTime;
        let progress = elapsed / duration;

        if (progress < 1) {
            const easedProgress = easeInOutCubic(progress);
            Engine3D.camera.position.lerpVectors(startCam, endCam, easedProgress);
            Engine3D.controls.target.lerpVectors(startTarget, endTarget, easedProgress);
            Engine3D.controls.update();
            clipPlane.constant = startCutY + (endCutY - startCutY) * easedProgress;

            requestAnimationFrame(updateFrame);
        } else {
            Engine3D.camera.position.copy(endCam);
            Engine3D.controls.target.copy(endTarget);
            clipPlane.constant = endCutY;
            Engine3D.controls.update();
            Engine3D.controls.enabled = true; 
        }
    }
    requestAnimationFrame(updateFrame);
}

function animateCinematicReset(startCam, endCam, startTarget, endTarget, clipPlane, startCutY, endCutY) {
    if (typeof Engine3D.controls === 'undefined' || !Engine3D.camera) return;

    Engine3D.controls.enabled = false;
    const duration = ARCH3D_CONFIG.ADVANCED_UI.CINEMATIC.RESET_DURATION_MS;
    const startTime = performance.now();
    const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    function update(time) {
        const elapsed = time - startTime;
        let progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);

        Engine3D.camera.position.lerpVectors(startCam, endCam, eased);
        Engine3D.controls.target.lerpVectors(startTarget, endTarget, eased);
        Engine3D.controls.update();
        clipPlane.constant = startCutY + (endCutY - startCutY) * eased;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            finalizeReset();
        }
    }
    requestAnimationFrame(update);
}

// 🌟 Render Modes & Clipping
function setAdvRenderMode(mode, btnElement) {
    if (!Engine3D.buildingGroup) return;

    const tabs = document.querySelectorAll('#render-mode-tabs .adv-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    Engine3D.buildingGroup.traverse(child => {
        if (child.isMesh && child.material) {
            let mats = Array.isArray(child.material) ? child.material : [child.material];
            
            mats.forEach(mat => {
                const ghostOpacity = typeof ARCH3D_CONFIG !== 'undefined' ? ARCH3D_CONFIG.ADVANCED_UI.GHOST_MATERIAL.OPACITY : 0.1;
                if (mat.opacity === ghostOpacity) return;

                if (mode === 'solid') {
                    mat.wireframe = false;
                    mat.transparent = false;
                    mat.opacity = 1.0;
                } else if (mode === 'wireframe') {
                    mat.wireframe = true;
                    mat.transparent = true;
                    mat.opacity = 0.5;
                } else if (mode === 'glass') {
                    mat.wireframe = false;
                    mat.transparent = true;
                    mat.opacity = 0.3;
                }
                mat.needsUpdate = true;
            });
        }
    });
}

function updateClippingPlane(val) {
    if (!Engine3D.buildingGroup || typeof Engine3D.renderer === 'undefined') return;
    
    Engine3D.renderer.localClippingEnabled = true;

    let globalClipPlane = null;
    Engine3D.buildingGroup.traverse(child => {
        if (child.isMesh && child.material && child.material.clippingPlanes && child.material.clippingPlanes.length > 0) {
            globalClipPlane = child.material.clippingPlanes[0];
        }
    });

    if (!globalClipPlane) {
        globalClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), val);
        Engine3D.buildingGroup.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => { m.clippingPlanes = [globalClipPlane]; m.needsUpdate = true; });
                } else {
                    child.material.clippingPlanes = [globalClipPlane];
                    child.material.needsUpdate = true;
                }
            }
        });
    } else {
        globalClipPlane.constant = val;
    }
}


// --- 8. PUBLIC API FACADE ---
window.Adv3D = {
    closePanel: closeAdvPanel,
    toggleWorkspaceMode: toggleAdvWorkspace,
    toggleGhostMode: toggleAdvGhostMode,
    viewIsolated: executeIsolation,
    resetIsolation: resetAdvIsolation,
    setRenderMode: setAdvRenderMode,
    updateClippingPlane: updateClippingPlane 
};

// --- 9. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initAdvanced3D === 'function') {
        initAdvanced3D();
    }
});