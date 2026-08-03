// =========================================
// 🎬 PRESENTATION & SHOWCASE MODULE (presentation.js)
// Handles Sun Environment, Showcase Mode, and Exploded Architectural View
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
    // 1. Force 3D mode if it isn't currently active
    if (typeof is3DMode !== 'undefined' && !is3DMode) {
        if (typeof window.toggle3D === 'function') window.toggle3D();
    }

    // 2. Toggle the CSS state class
    const isShowcase = document.body.classList.toggle('showcase-active');

    // 3. Handle the OS-Level Fullscreen API
    if (isShowcase) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen(); // Safari
        else if (elem.msRequestFullscreen) elem.msRequestFullscreen(); // IE11
    } else {
        if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        }
    }

    // 4. Force the Three.js renderer to recalculate its aspect ratio perfectly
    setTimeout(() => {
        if (typeof Engine3D !== 'undefined' && Engine3D.camera && Engine3D.renderer) {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            // Adjust camera
            Engine3D.camera.aspect = width / height;
            Engine3D.camera.updateProjectionMatrix();
            
            // Adjust renderer
            Engine3D.renderer.setSize(width, height);
            
            // Re-render immediately to prevent flickering
            if (Engine3D.scene) {
                Engine3D.renderer.render(Engine3D.scene, Engine3D.camera);
            }
        }
    }, 100); 
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
        btn.innerHTML = isExploded ? '🔽 COLLAPSE VIEW' : '💥 EXPLODE VIEW';
    }

    // Ensure we have a fallback for WALL_HEIGHT if ARCH_CONFIG isn't loaded yet
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