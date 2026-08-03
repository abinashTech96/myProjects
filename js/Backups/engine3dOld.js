// =========================================
// 3D ENGINE & WALKTHROUGH (engine3d.js)
// =========================================

// 🌟 REFACTORED: 3D Mode is now PERMANENTLY TRUE for the Split Screen live preview!
let is3DMode = true;
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
    is3DMode = false;
    setTimeout(() => {
        if (!scene3D) init3D();
        generate3DModel();
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
function request3DUpdate() {
    //if (!is3DMode) return;
    if (render3DTimeout) clearTimeout(render3DTimeout);
    render3DTimeout = setTimeout(() => {
        if (typeof generate3DModel === 'function') generate3DModel();
    }, 50); 
}


// =========================================
// 3D UTILITIES 
// =========================================

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
            
            // Clean up the premium UI when exiting
            const hint = document.getElementById('fly-hint');
            if(hint) hint.remove();
            const crosshair = document.getElementById('walk-crosshair');
            if(crosshair) crosshair.remove();

            // Kill momentum instantly when exiting
            moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };
        });
    }

    isWalkthrough = true;
    controls3D.enabled = false; 
    document.getElementById('nav-pad').style.display = 'none';

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
    camera3D.position.set(camera3D.position.x, 65 * SCALE, camera3D.position.z); 
    
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
            let clickedParapet = false;

            // Loop through all clicked elements to find matches
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
                if (typeof ParapetModule !== 'undefined' && typeof ParapetModule.openEditor === 'function') {
                    ParapetModule.openEditor();
                }
                return; // Stop execution so it doesn't clear room selection
            } else {
                if (typeof ParapetModule !== 'undefined' && typeof ParapetModule.closeEditor === 'function') {
                    ParapetModule.closeEditor();
                }
            }

            // Existing Room Selection Logic
            if (typeof selectedElIndex !== 'undefined') {
                selectedElIndex = clickedRoomIndex;

                // 🌟 THE FIX 3: Auto-switch the 2D UI to the exact floor of the clicked 3D room!
                if (clickedRoomIndex !== -1 && typeof elements !== 'undefined' && elements[clickedRoomIndex]) {
                    const targetFloor = elements[clickedRoomIndex].floor;
                    if (currentFloor !== targetFloor) {
                        currentFloor = targetFloor; 
                        // Update the floor tabs in the UI without wiping the selection
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
            if (!is3DMode || !isRaycasterActive || isWalkthrough) {
                if (threeContainer.style.cursor === 'pointer') threeContainer.style.cursor = 'default';
                return;
            }
            const rect = renderer3D.domElement.getBoundingClientRect();
            mouse3D.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse3D.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse3D, camera3D);
            const intersects = raycaster.intersectObjects(buildingGroup.children, true);
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

    // 🌟 NEW: Trigger a single shadow frame because the sun moved
    if (typeof renderer3D !== 'undefined') {
        renderer3D.shadowMap.needsUpdate = true;
    }
}

// =========================================
// 🌟 EXPLODED AXONOMETRIC VIEW ENGINE
// =========================================
let isExploded = false;
const OFFSET_PER_FLOOR = 350; // How high each floor lifts, Adjust spacing as needed
let explodeAnimation = null;
window.toggleExplodeView = function() {
    if (!buildingGroup || !is3DMode) return;
    isExploded = !isExploded;
    const btn = document.getElementById('btn-explode');
    if (btn) {
        btn.style.background = isExploded ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.1)';
        btn.style.color = isExploded ? '#f59e0b' : '';
        btn.style.borderColor = isExploded ? 'rgba(245, 158, 11, 0.4)' : '';
        btn.innerHTML = isExploded ? '🔽 COLLAPSE VIEW' : '💥 EXPLODE VIEW';
    }

    const { WALL_HEIGHT } = get3DEnvironmentParams();

    // 1. Calculate Target Positions for every single mesh
    buildingGroup.children.forEach(child => {
        if (child.userData.originalY === undefined) {
            child.userData.originalY = child.position.y;
        }

        // 🌟 Mathematical trick: Adding a +5 epsilon ensures that the ceiling slab 
        // perfectly binds to the floor ABOVE it and lifts off the walls below it!
        const floorLevel = Math.floor((child.userData.originalY + 5) / WALL_HEIGHT);
        const targetFloor = Math.max(0, floorLevel);

        child.userData.targetY = isExploded
            ? child.userData.originalY + (targetFloor * OFFSET_PER_FLOOR)
            : child.userData.originalY;
    });

    // 2. RequestAnimationFrame Lerp Loop
    if (explodeAnimation) cancelAnimationFrame(explodeAnimation);

    function animateExplode() {
        let allArrived = true;
        buildingGroup.children.forEach(child => {
            const target = child.userData.targetY;
            const current = child.position.y;
            const diff = target - current;

            // Smooth easing interpolation
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
            explodeAnimation = null; // 🌟 FIX 3: PREVENT MEMORY LEAK
        }
    }
    animateExplode();
};
// =========================================
// 🌟 EXPLODED AXONOMETRIC VIEW ENGINE
// =========================================


// =========================================
// 🌟 FIX 7: NIGHT MODE DYNAMIC SHADOWS
// =========================================
let isNightMode = false;

window.toggleNightMode = function() {
    isNightMode = !isNightMode;
    const btn = document.getElementById('btn-night-mode'); 
    if (btn) btn.style.background = isNightMode ? '#3b82f6' : '';
    
    if (isNightMode) {
        if (sunLight) {
            sunLight.intensity = ARCH_CONFIG.REFINEMENTS.NIGHT_MODE_SUN_INTENSITY;
            sunLight.castShadow = false; // Save GPU budget
        }
        if (hemiLight) hemiLight.intensity = 0.1;
        scene3D.background = new THREE.Color(0x020617);
        if (scene3D.fog) scene3D.fog.color.setHex(0x020617);
    } else {
        if (sunLight) {
            sunLight.intensity = ARCH_CONFIG.REFINEMENTS.DAY_MODE_SUN_INTENSITY;
            sunLight.castShadow = true;
        }
        if (hemiLight) hemiLight.intensity = 0.6;
        const isClassic = document.body.classList.contains('classic-theme');
        const bgColor = isClassic ? 0xe2e8f0 : 0x0f172a;
        scene3D.background = new THREE.Color(bgColor);
        if (scene3D.fog) scene3D.fog.color.setHex(bgColor);
    }
    
    // Toggle interior artificial lights
    if (buildingGroup) {
        buildingGroup.traverse(child => {
            if (child.isPointLight) {
                child.intensity = isNightMode ? 1.0 : 0;
            }
        });
    }
};

