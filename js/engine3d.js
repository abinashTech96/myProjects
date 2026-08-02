// =========================================
// 3D ENGINE & WALKTHROUGH (engine3d.js)
// =========================================

// 🌟 REFACTORED: 3D Mode is now PERMANENTLY TRUE for the Split Screen live preview!
window.is3DMode = true;

// =========================================
// 🛑 PHASE 1: DEMAND-DRIVEN RENDERING
// =========================================
window.isEnginePaused = false;

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        window.isEnginePaused = true;
        console.log("⏸️ 3D Engine Paused (Tab Hidden)");
    } else {
        window.isEnginePaused = false;
        console.log("▶️ 3D Engine Resumed");
        // Force a fresh render the second they switch back to this tab
        if (typeof request3DUpdate === 'function') request3DUpdate();
    }
});

// =========================================
// 🌟 AUTO-START THE DUAL ENGINE
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    window.is3DMode = false;
    setTimeout(() => {
        if (!Engine3D.scene) Engine3D.init();
        if (typeof generate3DModel === 'function') generate3DModel();
        if (typeof setWorkspaceLayout === 'function') {
            setWorkspaceLayout('2d'); 
        }
    }, 300);
    const real3DToggle = document.getElementById('real3DToggle');
    if (real3DToggle) {
        real3DToggle.addEventListener('change', () => {
            if (typeof generate3DModel === 'function') {
                generate3DModel();
            }
        });
    }
});

// --- 3D RAYCASTER STATE & SELECTION ---
let isRaycasterActive = false;
const raycaster = new THREE.Raycaster();
const mouse3D = new THREE.Vector2();

// --- 🌟 NEW: 3D PERFORMANCE DEBOUNCER ---
let render3DTimeout = null;
window.request3DUpdate = function() {
    if (render3DTimeout) clearTimeout(render3DTimeout);
    render3DTimeout = setTimeout(() => {
        if (typeof generate3DModel === 'function') generate3DModel();
    }, 50); 
};

// =========================================
// 3D UTILITIES 
// =========================================

window.pan = function(direction) {
    if (!Engine3D.controls || !Engine3D.camera) return;
    const speed = 50; 
    const offset = new THREE.Vector3();
    
    if (direction === 'up') offset.set(0, speed, 0);
    if (direction === 'down') offset.set(0, -speed, 0);
    if (direction === 'left') offset.set(-speed, 0, 0);
    if (direction === 'right') offset.set(speed, 0, 0);

    Engine3D.controls.target.add(offset);
    Engine3D.camera.position.add(offset);
    Engine3D.controls.update();
};

window.resetCamera3D = function() {
    if (!Engine3D.camera || !Engine3D.controls) return;
    Engine3D.camera.position.set(500, 800, 1000);
    Engine3D.controls.target.set(500, 0, 500);
    Engine3D.controls.update();
};

window.startWalkthrough = function() {
    if (!window.is3DMode || !Engine3D.fpsControls) return;
    
    Engine3D.isWalkthrough = true;
    Engine3D.controls.enabled = false; 
    const navPad = document.getElementById('nav-pad');
    if(navPad) navPad.style.display = 'none';

    // 🌟 PREMIUM UPGRADE: Glassmorphism HUD overlay
    if (!document.getElementById('fly-hint')) {
        const hint = document.createElement('div');
        hint.id = 'fly-hint';
        hint.innerHTML = `
            <div style="font-size: 1.1rem; font-weight: bold; color: #f8fafc; margin-bottom: 12px;">🚶 VIRTUAL TOUR ACTIVE</div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 15px; text-align: left; font-size: 0.8rem; color: #94a3b8; align-items: center;">
                <div><kbd style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; color: #38bdf8; font-family: monospace;">W A S D</kbd></div><div>Walk Around</div>
                <div><kbd style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; color: #38bdf8; font-family: monospace;">MOUSE</kbd></div><div>Look Around</div>
                <div><kbd style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; color: #ef4444; font-family: monospace;">ESC</kbd></div><div>Exit Tour</div>
            </div>
        `;
        hint.style.cssText = "position:absolute; bottom:30px; left:50%; transform:translateX(-50%); background:rgba(15, 23, 42, 0.85); backdrop-filter:blur(10px); padding:20px 30px; border-radius:16px; z-index:100; pointer-events:none; border:1px solid rgba(56, 189, 248, 0.3); box-shadow: 0 10px 40px rgba(0,0,0,0.6); text-align: center;";
        document.body.appendChild(hint);
    }

    // 🌟 PREMIUM UPGRADE: Minimalist FPS Crosshair
    if (!document.getElementById('walk-crosshair')) {
        const crosshair = document.createElement('div');
        crosshair.id = 'walk-crosshair';
        crosshair.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:6px; height:6px; background:rgba(255,255,255,0.9); border-radius:50%; z-index:100; pointer-events:none; box-shadow:0 0 6px rgba(0,0,0,0.8); mix-blend-mode: difference;";
        document.body.appendChild(crosshair);
    }

    // Lock camera perfectly to human eye level on start
    const scaleInput = document.getElementById('scaleInput');
    const SCALE = scaleInput ? parseFloat(scaleInput.value) || 1.2 : 1.2;
    Engine3D.camera.position.set(Engine3D.camera.position.x, 65 * SCALE, Engine3D.camera.position.z); 
    
    Engine3D.fpsControls.lock();
};

window.toggleRaycaster = function() {
    isRaycasterActive = !isRaycasterActive;
    const btn = document.getElementById('btn-raycaster');
    const textSpan = btn.querySelector('.text');
    
    if (isRaycasterActive) {
        if(textSpan) textSpan.innerHTML = '3D SELECTION: ON';
        btn.style.background = '#38bdf8';
        btn.style.color = '#0f172a';
    } else {
        if(textSpan) textSpan.innerHTML = '3D SELECTION: OFF';
        btn.style.background = 'rgba(15, 23, 42, 0.85)';
        btn.style.color = '#38bdf8';
        
        if (typeof selectedElIndex !== 'undefined') window.selectedElIndex = -1;
        if (typeof renderSidebar === 'function') renderSidebar();
        if (typeof updateCanvas === 'function') updateCanvas();
    }
};

// =========================================
// 3D EVENT LISTENERS 
// =========================================
document.addEventListener('keydown', (e) => {
    if (!Engine3D.isWalkthrough) return;
    
    if (document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'SELECT' || 
        document.activeElement.tagName === 'TEXTAREA') return;

    if (e.key.toLowerCase() === 'w') Engine3D.moveState.forward = true;
    if (e.key.toLowerCase() === 's') Engine3D.moveState.backward = true;
    if (e.key.toLowerCase() === 'a') Engine3D.moveState.left = true;
    if (e.key.toLowerCase() === 'd') Engine3D.moveState.right = true;
    if (e.key.toLowerCase() === 'e') Engine3D.moveState.up = true;   
    if (e.key.toLowerCase() === 'q') Engine3D.moveState.down = true; 
});

document.addEventListener('keyup', (e) => {
    if (!Engine3D.isWalkthrough) return;
    
    if (e.key.toLowerCase() === 'w') Engine3D.moveState.forward = false;
    if (e.key.toLowerCase() === 's') Engine3D.moveState.backward = false;
    if (e.key.toLowerCase() === 'a') Engine3D.moveState.left = false;
    if (e.key.toLowerCase() === 'd') Engine3D.moveState.right = false;
    if (e.key.toLowerCase() === 'e') Engine3D.moveState.up = false;
    if (e.key.toLowerCase() === 'q') Engine3D.moveState.down = false;
});

document.addEventListener('DOMContentLoaded', () => {
    const threeContainer = document.getElementById('three-container');
    if (threeContainer) {
        threeContainer.addEventListener('click', (event) => {
            if (!window.is3DMode || !isRaycasterActive || Engine3D.isWalkthrough) return;

            const rect = Engine3D.renderer.domElement.getBoundingClientRect();
            mouse3D.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse3D.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse3D, Engine3D.camera);
            const intersects = raycaster.intersectObjects(Engine3D.buildingGroup.children, true);

            let clickedRoomIndex = -1;
            let clickedParapet = false;

            for (let i = 0; i < intersects.length; i++) {
                const object = intersects[i].object;
                if (object.userData && object.userData.isParapet) {
                    clickedParapet = true;
                    break;
                }
                if (object.userData && object.userData.isRoom) {
                    clickedRoomIndex = object.userData.roomIndex;
                    break; 
                }
            }

            if (clickedParapet) {
                if (typeof ParapetModule !== 'undefined' && typeof ParapetModule.openEditor === 'function') ParapetModule.openEditor();
                return; 
            } else {
                if (typeof ParapetModule !== 'undefined' && typeof ParapetModule.closeEditor === 'function') ParapetModule.closeEditor();
            }

            if (typeof selectedElIndex !== 'undefined') {
                window.selectedElIndex = clickedRoomIndex;

                if (clickedRoomIndex !== -1 && typeof elements !== 'undefined' && elements[clickedRoomIndex]) {
                    const targetFloor = elements[clickedRoomIndex].floor;
                    if (window.currentFloor !== targetFloor) {
                        window.currentFloor = targetFloor; 
                        if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
                    }
                }

                if (typeof renderSidebar === 'function') renderSidebar(); 
                if (typeof updateCanvas === 'function') updateCanvas();  
            }
        });

        let hoveredObject = null;
        let hoveredOriginalEmissive = new THREE.Color(0x000000);
        
        threeContainer.addEventListener('mousemove', (event) => {
            if (!window.is3DMode || !isRaycasterActive || Engine3D.isWalkthrough) {
                if (threeContainer.style.cursor === 'pointer') threeContainer.style.cursor = 'default';
                return;
            }
            const rect = Engine3D.renderer.domElement.getBoundingClientRect();
            mouse3D.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse3D.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse3D, Engine3D.camera);
            const intersects = raycaster.intersectObjects(Engine3D.buildingGroup.children, true);
            let foundHover = null;
            for (let i = 0; i < intersects.length; i++) {
                const object = intersects[i].object;
                if (object.userData && (object.userData.isRoom || object.userData.isParapet)) {
                    foundHover = object;
                    break;
                }
            }
            if (hoveredObject !== foundHover) {
                if (hoveredObject && hoveredObject.material) {
                    hoveredObject.material.emissive.copy(hoveredOriginalEmissive);
                }
                hoveredObject = foundHover;
                if (hoveredObject && hoveredObject.material) {
                    hoveredOriginalEmissive.copy(hoveredObject.material.emissive);
                    hoveredObject.material.emissive.setHex(0x38bdf8);
                }
            }
            threeContainer.style.cursor = hoveredObject ? 'pointer' : 'default';
        });
    }
});

// =========================================
// 3D PERFORMANCE MANAGEMENT
// =========================================
let isPerformanceMode = false;

window.togglePerformanceMode = function() {
    isPerformanceMode = !isPerformanceMode;
    const btn = document.getElementById('btn-performance');
    
    if (btn) {
        const textSpan = btn.querySelector('.text');
        if(textSpan) textSpan.innerHTML = isPerformanceMode ? 'PERF MODE: ON' : 'PERF MODE: OFF';
        btn.style.background = isPerformanceMode ? 'rgba(234, 179, 8, 0.2)' : 'rgba(15, 23, 42, 0.85)';
        btn.style.color = isPerformanceMode ? '#facc15' : '#facc15';
    }

    if (!Engine3D.scene || !Engine3D.renderer) return;

    Engine3D.renderer.setPixelRatio(isPerformanceMode ? 1 : window.devicePixelRatio);

    Engine3D.scene.traverse((object) => {
        if (object.isDirectionalLight) {
            object.castShadow = !isPerformanceMode;
        }
        if (object.isMesh) {
            object.castShadow = !isPerformanceMode;
            object.receiveShadow = !isPerformanceMode;
            if (object.material) object.material.needsUpdate = true;
        }
    });

    if (window.is3DMode && !Engine3D.isWalkthrough) {
        Engine3D.controls.update();
        Engine3D.renderer.render(Engine3D.scene, Engine3D.camera);
    }
};

window.updateSunlight = function(hour) {
    if (!Engine3D.sunLight || !Engine3D.scene) return; 
    
    const normalizedTime = (hour - 6) / 12; 
    const angle = normalizedTime * Math.PI;
    const radius = 1000;
    
    const x = Math.cos(angle) * -radius; 
    const y = Math.sin(angle) * radius;
    const z = 300; 
    
    Engine3D.sunLight.position.set(x, y, z);
    
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay) {
        if (hour < 8) {
            timeDisplay.innerText = "Morning Glow";
            timeDisplay.style.color = "#fb923c"; 
            Engine3D.sunLight.color.setHex(0xffedd5); 
        } else if (hour > 16) {
            timeDisplay.innerText = "Golden Hour";
            timeDisplay.style.color = "#f59e0b";
            Engine3D.sunLight.color.setHex(0xfef3c7);
        } else {
            timeDisplay.innerText = "Midday";
            timeDisplay.style.color = "#38bdf8";
            Engine3D.sunLight.color.setHex(0xffffff); 
        }
    }

    if (typeof Engine3D.renderer !== 'undefined') {
        Engine3D.renderer.shadowMap.needsUpdate = true;
    }
};

// =========================================
// 🌟 EXPLODED AXONOMETRIC VIEW ENGINE
// =========================================
let isExploded = false;
const OFFSET_PER_FLOOR = 350; 
let explodeAnimation = null;

window.toggleExplodeView = function() {
    if (!Engine3D.buildingGroup || !window.is3DMode) return;
    isExploded = !isExploded;
    const btn = document.getElementById('btn-explode');
    if (btn) {
        btn.style.background = isExploded ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.1)';
        btn.style.color = isExploded ? '#f59e0b' : '';
        btn.style.borderColor = isExploded ? 'rgba(245, 158, 11, 0.4)' : '';
        btn.innerHTML = isExploded ? '🔽 COLLAPSE VIEW' : '💥 EXPLODE VIEW';
    }

    const { WALL_HEIGHT } = get3DEnvironmentParams();

    Engine3D.buildingGroup.children.forEach(child => {
        if (child.userData.originalY === undefined) {
            child.userData.originalY = child.position.y;
        }

        const floorLevel = Math.floor((child.userData.originalY + 5) / WALL_HEIGHT);
        const targetFloor = Math.max(0, floorLevel);

        child.userData.targetY = isExploded
            ? child.userData.originalY + (targetFloor * OFFSET_PER_FLOOR)
            : child.userData.originalY;
    });

    if (explodeAnimation) cancelAnimationFrame(explodeAnimation);

    function animateExplode() {
        let allArrived = true;
        Engine3D.buildingGroup.children.forEach(child => {
            const target = child.userData.targetY;
            const current = child.position.y;
            const diff = target - current;

            if (Math.abs(diff) > 0.5) {
                child.position.y += diff * 0.08; 
                allArrived = false;
            } else {
                child.position.y = target;
            }
        });

        if (!allArrived) {
            explodeAnimation = requestAnimationFrame(animateExplode);
        } else {
            explodeAnimation = null;
        }
    }
    animateExplode();
};

// =========================================
// 🌟 NIGHT MODE DYNAMIC SHADOWS
// =========================================
let isNightMode = false;
window.toggleNightMode = function() {
    isNightMode = !isNightMode;
    const btn = document.getElementById('btn-night-mode'); 
    if (btn) btn.style.background = isNightMode ? '#3b82f6' : '';
    
    if (isNightMode) {
        if (Engine3D.sunLight) {
            Engine3D.sunLight.intensity = ARCH_CONFIG.REFINEMENTS.NIGHT_MODE_SUN_INTENSITY;
            Engine3D.sunLight.castShadow = false;
        }
        if (Engine3D.hemiLight) Engine3D.hemiLight.intensity = 0.1;
        Engine3D.scene.background = new THREE.Color(0x020617);
        if (Engine3D.scene.fog) Engine3D.scene.fog.color.setHex(0x020617);
    } else {
        if (Engine3D.sunLight) {
            Engine3D.sunLight.intensity = ARCH_CONFIG.REFINEMENTS.DAY_MODE_SUN_INTENSITY;
            Engine3D.sunLight.castShadow = true;
        }
        if (Engine3D.hemiLight) Engine3D.hemiLight.intensity = 0.6;
        const isClassic = document.body.classList.contains('classic-theme');
        const bgColor = isClassic ? 0xe2e8f0 : 0x0f172a;
        Engine3D.scene.background = new THREE.Color(bgColor);
        if (Engine3D.scene.fog) Engine3D.scene.fog.color.setHex(bgColor);
    }
    
    if (Engine3D.buildingGroup) {
        Engine3D.buildingGroup.traverse(child => {
            if (child.isPointLight) {
                child.intensity = isNightMode ? 1.0 : 0;
            }
        });
    }
};