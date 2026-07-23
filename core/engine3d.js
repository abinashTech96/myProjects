// =========================================
// 3D ENGINE & WALKTHROUGH (engine3d.js)
// =========================================

// 🌟 REFACTORED: 3D Mode is now PERMANENTLY TRUE for the Split Screen live preview!
let is3DMode = true;

// =========================================
// 🌟 AUTO-START THE DUAL ENGINE
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    // ✅ KEEP THIS FALSE: App starts in 2D-dominant mode
    is3DMode = false;
    setTimeout(() => {
        if (!scene3D) init3D();
        generate3DModel();
        // ✅ ADD THIS: Force the layout to 2D view on load
        if (typeof setWorkspaceLayout === 'function') {
            setWorkspaceLayout('2d'); 
        }
    }, 300); 

    // 🌟 ADD THIS: Make the Real 3D toggle trigger a re-render!
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

// =========================================
// 🌟 NEW: LIVE 3D LASER MEASURE TOOL
// =========================================
let laserActive = false;
let laserLine = null;
let laserHUD = null;
let crosshairHUD = null;

window.toggleLaserMeasure = function() {
    laserActive = !laserActive;

    // 🌟 Update the UI Button colors
    const btn = document.getElementById('btn-laser');
    if (btn) {
        const textSpan = btn.querySelector('.text');
        if (laserActive) {
            if (textSpan) textSpan.innerHTML = 'LASER: ON';
            btn.style.background = '#0ea5e9';
            btn.style.color = '#0f172a';
        } else {
            if (textSpan) textSpan.innerHTML = 'LASER: OFF';
            btn.style.background = 'rgba(15, 23, 42, 0.85)';
            btn.style.color = '#0ea5e9';
        }
    }
    
    // Create UI elements dynamically if they don't exist
    if (!laserHUD) {
        laserHUD = document.createElement('div');
        laserHUD.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(20px, -20px); background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); border:1px solid #0ea5e9; color:#0ea5e9; padding:8px 12px; border-radius:8px; font-family:monospace; font-size:1.1rem; font-weight:bold; z-index:10000; pointer-events:none; box-shadow:0 0 15px rgba(14,165,233,0.4);';
        document.body.appendChild(laserHUD);
        
        crosshairHUD = document.createElement('div');
        crosshairHUD.innerHTML = '⌖';
        crosshairHUD.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); color:#0ea5e9; font-size:1.8rem; font-weight:100; z-index:10000; pointer-events:none; text-shadow:0 0 10px #0ea5e9;';
        document.body.appendChild(crosshairHUD);
    }
    
    laserHUD.style.display = laserActive ? 'block' : 'none';
    crosshairHUD.style.display = laserActive ? 'block' : 'none';
    
    if (!laserActive && laserLine) {
        scene3D.remove(laserLine);
        laserLine = null;
    }
};

function updateLaserMeasure() {
    if (!laserActive || !camera3D || !scene3D || !buildingGroup) return;
    
    // Shoot ray directly from the center of the camera view
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera3D);
    
    // Intersect against the entire building group
    const intersects = raycaster.intersectObjects(buildingGroup.children, true);
    
    if (intersects.length > 0) {
        const hit = intersects[0];
        const dist = hit.distance;
        
        // Convert Three.js units to Real World Feet/Inches
        const scaleInput = document.getElementById('scaleInput');
        const SCALE = scaleInput ? parseFloat(scaleInput.value) || 1.2 : 1.2;
        const totalInches = dist / SCALE;
        const ft = Math.floor(totalInches / 12);
        const inchRem = Math.round(totalInches % 12);
        
        laserHUD.innerHTML = `📏 ${ft}' ${inchRem}"`;
        
        // Draw Neon Beam Line
        if (!laserLine) {
            const mat = new THREE.LineBasicMaterial({ color: 0x0ea5e9, linewidth: 2, transparent: true, opacity: 0.8 });
            const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
            laserLine = new THREE.Line(geo, mat);
            scene3D.add(laserLine);
        }
        
        const positions = laserLine.geometry.attributes.position.array;
        const camPos = new THREE.Vector3();
        camera3D.getWorldPosition(camPos);
        
        // Push start point slightly ahead of camera so it doesn't clip into the lens
        const startPos = camPos.clone().add(raycaster.ray.direction.clone().multiplyScalar(5));
        
        positions[0] = startPos.x; positions[1] = startPos.y; positions[2] = startPos.z;
        positions[3] = hit.point.x; positions[4] = hit.point.y; positions[5] = hit.point.z;
        laserLine.geometry.attributes.position.needsUpdate = true;
    } else {
        laserHUD.innerHTML = `📏 --' --"`;
        if (laserLine) { scene3D.remove(laserLine); laserLine = null; }
    }
}
// =========================================
// 🌟 NEW: LIVE 3D LASER MEASURE TOOL
// =========================================

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
            
            const hint = document.getElementById('fly-hint');
            if(hint) hint.remove();

            // Kill momentum instantly when exiting drone mode
            moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false };
        });
    }

    isWalkthrough = true;
    controls3D.enabled = false; 
    document.getElementById('nav-pad').style.display = 'none';

    if (!document.getElementById('fly-hint')) {
        const hint = document.createElement('div');
        hint.id = 'fly-hint';
        hint.innerHTML = "<b>DRONE MODE:</b> WASD to Move | Mouse to Look | <b>E</b> to Fly Up | <b>Q</b> to Fly Down | <b>ESC</b> to Exit";
        hint.style.cssText = "position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(15,23,42,0.8); color:#38bdf8; padding:10px 20px; border-radius:8px; font-size:14px; z-index:100; pointer-events:none; border:1px solid #38bdf8; box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);";
        document.body.appendChild(hint);
    }

    const scaleInput = document.getElementById('scaleInput');
    const SCALE = scaleInput ? parseFloat(scaleInput.value) || 1.2 : 1.2;
    camera3D.position.set(500, 66 * SCALE, 1000); 
    camera3D.lookAt(500, 66 * SCALE, 500);
    
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
            for (let i = 0; i < intersects.length; i++) {
                const object = intersects[i].object;
                if (object.userData && object.userData.isRoom) {
                    clickedRoomIndex = object.userData.roomIndex;
                    break; 
                }
            }

            if (typeof selectedElIndex !== 'undefined') {
                selectedElIndex = clickedRoomIndex;
                if (typeof renderSidebar === 'function') renderSidebar(); 
                if (typeof updateCanvas === 'function') updateCanvas();  
            }
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




//Phase - 3
// --- DYNAMIC SUNLIGHT CONTROLLER ---
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
}

// =========================================
// PHASE 3: CINEMATIC TOUR ENGINE
// =========================================

function captureWaypoint() {
    // 🌟 FIXED: Use camera3D and controls3D
    if (!camera3D || !controls3D) return; 
    
    waypoints.push({
        position: camera3D.position.clone(),
        target: controls3D.target.clone()
    });
    
    const countEl = document.getElementById('wp-count');
    if (countEl) countEl.innerText = waypoints.length;
}

function clearTour() {
    waypoints = [];
    const countEl = document.getElementById('wp-count');
    if (countEl) countEl.innerText = '0';
}

function playCinematicTour() {
    if (waypoints.length < 2) {
        alert("Please set at least 2 waypoints using the camera first!");
        return;
    }
    if (isPlayingTour) return;
    
    isPlayingTour = true;
    controls3D.enabled = false; // Disable mouse orbit while touring
    
    let currentWpIndex = 0;
    const durationPerPoint = 3000; // 3 seconds per transition
    let startTime = performance.now();
    
    function animateTour(time) {
        if (!isPlayingTour) return;
        
        const elapsed = time - startTime;
        let rawProgress = elapsed / durationPerPoint;
        
        const startWp = waypoints[currentWpIndex];
        const endWp = waypoints[currentWpIndex + 1];
        
        // 🌟 FIXED: Strictly check raw elapsed time so it NEVER goes over 100%
        if (rawProgress < 1) {
            // Easing function (Smoothstep) applied safely
            let progress = rawProgress * rawProgress * (3 - 2 * rawProgress); 
            
            // Interpolate Camera Position
            camera3D.position.lerpVectors(startWp.position, endWp.position, progress);
            // Interpolate Camera Look Target
            controls3D.target.lerpVectors(startWp.target, endWp.target, progress);
            controls3D.update(); 
            
            requestAnimationFrame(animateTour);
        } else {
            // 🌟 FIXED: Snap exactly to the target to prevent micro-drifting
            camera3D.position.copy(endWp.position);
            controls3D.target.copy(endWp.target);
            controls3D.update();

            // Move to next waypoint leg
            currentWpIndex++;
            
            if (currentWpIndex >= waypoints.length - 1) {
                // Tour Finished safely
                isPlayingTour = false;
                controls3D.enabled = true; 
            } else {
                // 🌟 FIXED: Continue to next point using exact frame time
                startTime = time; 
                requestAnimationFrame(animateTour);
            }
        }
    }
    
    requestAnimationFrame(animateTour);
}




// =========================================
// 🌟 EXPLODED AXONOMETRIC VIEW ENGINE
// =========================================
let isExploded = false;
const OFFSET_PER_FLOOR = 350; // How high each floor lifts // Adjust spacing as needed
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