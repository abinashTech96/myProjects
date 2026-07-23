// =========================================
// ADVANCED 3D ISOLATION LOGIC (advanced3d.js)
// =========================================

// --- 1. STATE MANAGEMENT ---
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


// --- 2. DOM & UI MANAGERS ---
function closeAdvPanel() {
    const panel = document.getElementById('adv-3d-panel');
    if (panel) {
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(-10px)';
        setTimeout(() => panel.style.display = 'none', ARCH3D_CONFIG.ADVANCED_UI.ANIMATION_SPEED_MS);
    }
}

function toggleAdvWorkspace(isAdvanced) {
    const sidebar = document.querySelector('.sidebar');
    const real3dToggle = document.querySelector('input[id*="real3D"], input[id*="real3d"]');
    const panel = document.getElementById('adv-3d-panel');

    if (isAdvanced) {
        if (sidebar) sidebar.classList.add('collapsed');
        if (real3dToggle && !real3dToggle.checked) {
            real3dToggle.checked = true;
            real3dToggle.dispatchEvent(new Event('change'));
        }
        panel.style.display = 'block';
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
        renderAdvFloors();
    } else {
        if (sidebar) sidebar.classList.remove('collapsed');
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


// --- 3. EVENT CONTROLLERS ---
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
    if (!is3DMode || !buildingGroup) {
        toggleAdvWorkspace(false);
        return;
    }

    // 1. Capture current positions
    const startCam = camera3D.position.clone();
    const startTarget = controls3D.target.clone();
    
    // 2. Calculate "Home" destinations
    const { pos: endCam, target: endTarget } = getHomeViewCamera();
    
    // 3. Find current clipping height and calculate safe roof height
    const startCutY = renderer3D.localClippingEnabled && buildingGroup.children[0]?.material?.clippingPlanes 
                      ? buildingGroup.children[0].material.clippingPlanes[0].constant : 0;
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


// --- 4. CORE 3D ORCHESTRATORS ---
function executeIsolation() {
    if (Adv3DState.selectedFloor === null) return alert("Please select a floor first!");
    
    sync2DToAdv3D();

    setTimeout(() => {
        if (!buildingGroup || typeof renderer3D === 'undefined') return;

        renderer3D.localClippingEnabled = true;

        const startCamPos = camera3D.position.clone();
        const startTarget = controls3D.target.clone();

        const targetCutY = calculateClippingPlaneY();
        // 🌟 REFACTORED: Dynamic sweep offset
        const startCutY = targetCutY + ARCH3D_CONFIG.ADVANCED_UI.CINEMATIC.SWEEP_OFFSET;
        const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), startCutY);
        
        const ghostMat = createGhostMaterial(clipPlane);
        const isolatedBox = new THREE.Box3();
        let hasValidBounds = false;

        buildingGroup.traverse(child => {
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
    if (typeof renderer3D !== 'undefined') renderer3D.localClippingEnabled = false;

    buildingGroup.traverse(child => {
        if (child.isMesh) {
            child.visible = true;
            if (Adv3DState.originalMaterials.has(child.uuid)) {
                const originalMat = Adv3DState.originalMaterials.get(child.uuid);
                applyClipToMaterial(originalMat, null);
                child.material = originalMat;
            }
        }
    });
    controls3D.enabled = true;
}


// --- 5. 3D MATH & RENDER HELPERS ---
function sync2DToAdv3D() {
    if (typeof setFloor === 'function' && currentFloor !== Adv3DState.selectedFloor) setFloor(Adv3DState.selectedFloor);
    if (typeof selectedElIndex !== 'undefined') selectedElIndex = Adv3DState.selectedElement !== null ? Adv3DState.selectedElement : -1;
    if (typeof renderSidebar === 'function') renderSidebar();
    if (typeof is3DMode !== 'undefined' && !is3DMode) toggle3D();
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
    const fov = camera3D.fov * (Math.PI / 180);
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


// --- 6. ANIMATION CONTROLLERS ---
function animateCinematicSweep(startCam, endCam, startTarget, endTarget, clipPlane, startCutY, endCutY) {
    if (typeof controls3D === 'undefined' || !camera3D) return;

    controls3D.enabled = false; 
    // 🌟 REFACTORED
    const duration = ARCH3D_CONFIG.ADVANCED_UI.CINEMATIC.SWEEP_DURATION_MS;
    const startTime = performance.now();
    const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    function updateFrame(time) {
        const elapsed = time - startTime;
        let progress = elapsed / duration;

        if (progress < 1) {
            const easedProgress = easeInOutCubic(progress);
            camera3D.position.lerpVectors(startCam, endCam, easedProgress);
            controls3D.target.lerpVectors(startTarget, endTarget, easedProgress);
            controls3D.update();
            clipPlane.constant = startCutY + (endCutY - startCutY) * easedProgress;

            requestAnimationFrame(updateFrame);
        } else {
            camera3D.position.copy(endCam);
            controls3D.target.copy(endTarget);
            clipPlane.constant = endCutY;
            controls3D.update();
            controls3D.enabled = true; 
        }
    }
    requestAnimationFrame(updateFrame);
}

function animateCinematicReset(startCam, endCam, startTarget, endTarget, clipPlane, startCutY, endCutY) {
    if (typeof controls3D === 'undefined' || !camera3D) return;

    controls3D.enabled = false;
    // 🌟 REFACTORED
    const duration = ARCH3D_CONFIG.ADVANCED_UI.CINEMATIC.RESET_DURATION_MS;
    const startTime = performance.now();
    const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    function update(time) {
        const elapsed = time - startTime;
        let progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);

        camera3D.position.lerpVectors(startCam, endCam, eased);
        controls3D.target.lerpVectors(startTarget, endTarget, eased);
        controls3D.update();
        clipPlane.constant = startCutY + (endCutY - startCutY) * eased;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            finalizeReset();
        }
    }
    requestAnimationFrame(update);
}

// 🌟 MISSING MECHANICS: Render Modes & Clipping
function setAdvRenderMode(mode, btnElement) {
    if (!buildingGroup) return;

    // Update UI button styles
    const tabs = document.querySelectorAll('#render-mode-tabs .adv-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    // Loop through all 3D meshes
    buildingGroup.traverse(child => {
        if (child.isMesh && child.material) {
            let mats = Array.isArray(child.material) ? child.material : [child.material];
            
            mats.forEach(mat => {
                // Ensure we don't accidentally ruin the Ghost Material from Isolate mode
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
    if (!buildingGroup || typeof renderer3D === 'undefined') return;
    
    // Ensure Three.js allows clipping
    renderer3D.localClippingEnabled = true;

    // Try to find the existing clipping plane if isolation has occurred
    let globalClipPlane = null;
    buildingGroup.traverse(child => {
        if (child.isMesh && child.material && child.material.clippingPlanes && child.material.clippingPlanes.length > 0) {
            globalClipPlane = child.material.clippingPlanes[0];
        }
    });

    // If no plane exists, create one and apply it to everything
    if (!globalClipPlane) {
        globalClipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), val);
        buildingGroup.traverse(child => {
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
        // Just move the existing plane
        globalClipPlane.constant = val;
    }
}


// --- 7. PUBLIC API FACADE ---
window.Adv3D = {
    closePanel: closeAdvPanel,
    toggleWorkspaceMode: toggleAdvWorkspace,
    toggleGhostMode: toggleAdvGhostMode,
    viewIsolated: executeIsolation,
    resetIsolation: resetAdvIsolation,
    setRenderMode: setAdvRenderMode,           // <-- NEW
    updateClippingPlane: updateClippingPlane   // <-- NEW
};

// --- 8. INITIALIZATION ---
// Add the event listener LAST, after everything else is defined
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initAdvanced3D === 'function') {
        initAdvanced3D();
    }
});