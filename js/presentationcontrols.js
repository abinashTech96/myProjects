// =========================================
// 🎬 PRESENTATION CONTROLS MODULE (presentationcontrols.js)
// Handles Sunlight, Cinematic Tours, Showcase Mode, and Explode View
// =========================================

// --- 1. SUNLIGHT CONTROLS ---
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

// --- 2. CLIENT SHOWCASE MODE ---
window.toggleShowcaseMode = function() {
    if (typeof is3DMode !== 'undefined' && !is3DMode) {
        if (typeof window.toggle3D === 'function') window.toggle3D();
    }

    // 1. Toggle the CSS state to instantly start the smooth CSS animations
    const isShowcase = document.body.classList.toggle('showcase-active');

    // 2. DELAY the heavy OS fullscreen API call so the CSS animations don't freeze
    setTimeout(() => {
        if (isShowcase) {
            const elem = document.documentElement;
            if (elem.requestFullscreen) elem.requestFullscreen();
            else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen(); 
            else if (elem.msRequestFullscreen) elem.msRequestFullscreen(); 
        } else {
            if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                else if (document.msExitFullscreen) document.msExitFullscreen();
            }
        }
    }, 150); // 150ms head start for the CSS transition

    // 3. Resize the 3D Canvas AFTER the transition is mostly done to prevent flickering
    setTimeout(() => {
        if (typeof Engine3D !== 'undefined' && Engine3D.camera && Engine3D.renderer) {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            Engine3D.camera.aspect = width / height;
            Engine3D.camera.updateProjectionMatrix();
            Engine3D.renderer.setSize(width, height);
            
            if (Engine3D.scene) {
                Engine3D.renderer.render(Engine3D.scene, Engine3D.camera);
            }
        }
    }, 450); 
};

// --- 3. EXPLODED AXONOMETRIC VIEW ---
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
        btn.innerHTML = isExploded ? '<span class="pc-icon">🔽</span> COLLAPSE VIEW' : '<span class="pc-icon">💥</span> EXPLODE VIEW';
    }

    const WALL_HEIGHT = (typeof ARCH_CONFIG !== 'undefined' && ARCH_CONFIG.DEFAULTS) ? ARCH_CONFIG.DEFAULTS.WALL_HEIGHT_3D : 120;

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

// --- 4. CINEMATIC 3D TOUR ENGINE ---
window.tourWaypoints = [];
window.isPlayingTour = false;
window.tourAnimationId = null;

window.captureWaypoint = function() {
    if (!window.Engine3D || !Engine3D.camera || !Engine3D.controls) {
        console.warn("3D Engine not fully initialized yet.");
        return;
    }
    
    const point = {
        position: { x: Engine3D.camera.position.x, y: Engine3D.camera.position.y, z: Engine3D.camera.position.z },
        target: { x: Engine3D.controls.target.x, y: Engine3D.controls.target.y, z: Engine3D.controls.target.z }
    };
    
    window.tourWaypoints.push(point);
    console.log(`Waypoint captured! Total: ${window.tourWaypoints.length}`);
    
    const wpCount = document.getElementById('wp-count');
    if (wpCount) {
        wpCount.innerText = window.tourWaypoints.length;
        wpCount.style.transform = 'scale(1.2)';
        setTimeout(() => wpCount.style.transform = 'scale(1)', 200);
    }
};

window.clearTour = function() {
    window.tourWaypoints = [];
    window.isPlayingTour = false;
    if (window.tourAnimationId) cancelAnimationFrame(window.tourAnimationId);
    
    console.log("Tour waypoints cleared.");
    
    const wpCount = document.getElementById('wp-count');
    if (wpCount) wpCount.innerText = "0";
};

window.playCinematicTour = function() {
    if (window.tourWaypoints.length < 2) {
        alert("Please capture at least 2 waypoints to play a cinematic tour.");
        return;
    }
    
    if (!window.Engine3D || !Engine3D.camera || !Engine3D.controls) {
        console.warn("3D Engine not fully initialized yet.");
        return;
    }

    if (window.isPlayingTour) return;
    window.isPlayingTour = true;
    Engine3D.controls.enabled = false; 
    
    let currentWpIndex = 0;
    const durationPerPoint = 3000;
    let startTime = performance.now();
    
    function animateTour(time) {
        if (!window.isPlayingTour) return;
        
        const elapsed = time - startTime;
        let rawProgress = elapsed / durationPerPoint;
        
        const startWp = window.tourWaypoints[currentWpIndex];
        const endWp = window.tourWaypoints[currentWpIndex + 1];
        
        if (rawProgress < 1) {
            let progress = rawProgress * rawProgress * (3 - 2 * rawProgress); 
            
            Engine3D.camera.position.lerpVectors(
                new THREE.Vector3(startWp.position.x, startWp.position.y, startWp.position.z), 
                new THREE.Vector3(endWp.position.x, endWp.position.y, endWp.position.z), 
                progress
            );
            
            Engine3D.controls.target.lerpVectors(
                new THREE.Vector3(startWp.target.x, startWp.target.y, startWp.target.z), 
                new THREE.Vector3(endWp.target.x, endWp.target.y, endWp.target.z), 
                progress
            );
            
            Engine3D.controls.update(); 
            window.tourAnimationId = requestAnimationFrame(animateTour);
        } else {
            Engine3D.camera.position.set(endWp.position.x, endWp.position.y, endWp.position.z);
            Engine3D.controls.target.set(endWp.target.x, endWp.target.y, endWp.target.z);
            Engine3D.controls.update();

            currentWpIndex++;
            
            if (currentWpIndex >= window.tourWaypoints.length - 1) {
                window.isPlayingTour = false;
                Engine3D.controls.enabled = true;
            } else {
                startTime = time; 
                window.tourAnimationId = requestAnimationFrame(animateTour);
            }
        }
    }
    window.tourAnimationId = requestAnimationFrame(animateTour);
};

// Original Aliases
window.addWaypoint = window.captureWaypoint; 
window.playTour = window.playCinematicTour; 
window.clearWaypoints = window.clearTour;

// --- 5. NIGHT MODE ---
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
            if (child.isPointLight) child.intensity = isNightMode ? 1.0 : 0;
        });
    }
};