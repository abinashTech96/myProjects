// =========================================
// 🎬 PRESENTATION CONTROLS ENGINE (presentationcontrols.js)
// Single-File Component (CSS + JS + HTML)
// =========================================

// 1. INJECT MODULE-SPECIFIC CSS
const presentationStyles = `
    .pc-wrapper {
        position: fixed; 
        bottom: 25px; left: 50%; 
        background: rgba(15, 23, 42, 0.75); 
        backdrop-filter: blur(16px) saturate(180%); 
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(56, 189, 248, 0.2); 
        border-radius: 50px; padding: 6px 14px; z-index: 100; 
        display: flex; align-items: center; gap: 10px; 
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.05);
        animation: pcFloatUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes pcFloatUp {
        0% { transform: translate(-50%, 20px); opacity: 0; }
        100% { transform: translate(-50%, 0); opacity: 1; }
    }
    .pc-sun-group { display: flex; align-items: center; gap: 10px; width: 140px; }
    .pc-btn-group { display: flex; align-items: center; gap: 8px; }
    .pc-divider { 
        width: 2px; height: 20px; border-radius: 2px;
        background: rgba(255, 255, 255, 0.2); 
        animation: pcDividerBreathe 4s infinite ease-in-out;
    }
    @keyframes pcDividerBreathe {
        0%, 100% { box-shadow: 0 0 4px rgba(255, 255, 255, 0.1); }
        50% { box-shadow: 0 0 10px rgba(255, 255, 255, 0.4); }
    }
    .pc-sun-icon { font-size: 1.1rem; cursor: pointer; transition: all 0.3s ease; }
    .pc-dawn { filter: grayscale(100%); opacity: 0.7; }
    .pc-dawn:hover { filter: grayscale(0%); opacity: 1; transform: scale(1.15) rotate(-10deg); }
    .pc-dusk:hover { transform: scale(1.15) rotate(10deg); }
    .pc-sun-slider { flex-grow: 1; height: 4px; margin: 0; accent-color: #fbbf24; cursor: pointer; }
    
    .pc-btn {
        border-radius: 50px; font-size: 0.75rem; margin: 0; font-weight: 600;
        display: flex; align-items: center; justify-content: center; gap: 6px;
        white-space: nowrap; cursor: pointer; color: #e2e8f0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .pc-icon { display: inline-block; transition: all 0.3s ease; }
    .pc-btn:hover .pc-icon { transform: scale(1.15) rotate(10deg); }
    .pc-btn:hover { transform: translateY(-2px); }
    .pc-btn:active { transform: translateY(1px); }
    
    .pc-btn-set { padding: 6px 14px; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); color: #e9d5ff; }
    .pc-btn-set:hover { box-shadow: 0 6px 15px rgba(168, 85, 247, 0.25); border-color: #a855f7; }
    #wp-count { color: #c084fc; font-weight: 900; }
    
    .pc-btn-play { padding: 6px 16px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #a7f3d0; }
    .pc-btn-play:hover { box-shadow: 0 6px 15px rgba(16, 185, 129, 0.25); border-color: #10b981; }
    
    .pc-btn-clear { padding: 6px 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); }
    .pc-btn-clear:hover { box-shadow: 0 6px 15px rgba(239, 68, 68, 0.25); border-color: #ef4444; }
    
    .pc-btn-view { padding: 6px 10px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); color: #bae6fd; }
    .pc-btn-view:hover { box-shadow: 0 6px 15px rgba(56, 189, 248, 0.25); border-color: #38bdf8; }

    /* CLIENT SHOWCASE MODE OVERRIDES */
    .pro-studio-navbar, .navbar-toggle-btn, .nav-drawer-panel,
    #qc-widget-wrapper, .adv-btn-container, .neo-panel, #cheat-sheet-panel {
        transition: opacity 0.5s ease, transform 0.5s ease !important;
    }
    body.showcase-active .pro-studio-navbar, body.showcase-active .navbar-toggle-btn,
    body.showcase-active .nav-drawer-panel, body.showcase-active #qc-widget-wrapper,
    body.showcase-active .adv-btn-container, body.showcase-active .neo-panel:not(#presentation-controls),
    body.showcase-active #cheat-sheet-panel {
        opacity: 0 !important; pointer-events: none !important; transform: translateY(-20px) !important;
    }
    body.showcase-active #three-container {
        position: fixed !important; top: 0 !important; left: 0 !important;
        width: 100vw !important; height: 100vh !important; z-index: 9000 !important;
    }
    body.showcase-active #presentation-controls {
        position: fixed !important; bottom: 15px !important; left: 50% !important;
        transform: translateX(-50%) scale(0.85) !important; z-index: 10000 !important;
        background: rgba(15, 23, 42, 0.9) !important; backdrop-filter: blur(16px) saturate(180%) !important;
        border: 1px solid rgba(56, 189, 248, 0.3) !important; border-radius: 50px !important; 
        padding: 4px 12px !important; gap: 6px !important; width: auto !important; max-width: 90vw !important;
        box-shadow: 0 20px 50px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255, 255, 255, 0.1) !important;
    }
    #exit-showcase-btn {
        display: none; position: fixed; top: 20px; right: 20px; z-index: 10001;
        background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444;
        padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;
        backdrop-filter: blur(5px); transition: all 0.2s;
    }
    #exit-showcase-btn:hover { background: #ef4444; color: white; }
    body.showcase-active #exit-showcase-btn { display: block; }
`;

document.head.insertAdjacentHTML("beforeend", `<style>${presentationStyles}</style>`);

// 2. PRESENTATION ENGINE
const PresentationEngine = {
    REQUIRE_HTML_CONTAINER: false, // Set to false so it auto-generates anywhere on the body if needed

    init: function() {
        let widget = document.getElementById('presentation-widget');
        
        if (!widget) {
            if (this.REQUIRE_HTML_CONTAINER) return;
            widget = document.createElement('div');
            widget.id = 'presentation-widget';
            document.body.appendChild(widget);
        }

        widget.innerHTML = `
            <!-- CLIENT SHOWCASE MODE EXIT -->
            <button id="exit-showcase-btn" onclick="toggleShowcaseMode()">
                ✕ EXIT PRESENTATION
            </button>
            <div id="presentation-controls" class="pc-wrapper" style="display: none;">
                <!-- Sun Controls -->
                <div class="pc-sun-group">
                    <span class="pc-sun-icon pc-dawn" title="Dawn">🌅</span>
                    <input type="range" id="sun-slider" class="pc-sun-slider" min="6" max="18" step="0.1" value="12" oninput="updateSunlight(this.value)">
                    <span class="pc-sun-icon pc-dusk" title="Dusk">🌇</span>
                </div>
                <div class="pc-divider"></div>
                <!-- Tour Controls -->
                <div class="pc-btn-group">
                    <button class="pc-btn pc-btn-set" onclick="captureWaypoint()">
                        <span class="pc-icon">📷</span> Set (<span id="wp-count">0</span>)
                    </button>
                    <button class="pc-btn pc-btn-play" onclick="playCinematicTour()">
                        <span class="pc-icon">▶️</span> Play
                    </button>
                    <button class="pc-btn pc-btn-clear" onclick="clearTour()" title="Clear All">
                        <span class="pc-icon">🗑️</span>
                    </button>
                </div>
                <div class="pc-divider"></div>
                <!-- View Controls -->
                <div class="pc-btn-group">
                    <button class="pc-btn pc-btn-view" onclick="toggleShowcaseMode()">
                        <span class="pc-icon">🎬</span> SHOW
                    </button>
                    <button id="btn-explode" class="pc-btn pc-btn-view" onclick="toggleExplodeView()">
                        <span class="pc-icon">💥</span> EXPLODE
                    </button>
                </div>
            </div>
        `;
    }
};

// --- 3. GLOBAL ENGINE CONTROLS ---

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

window.toggleShowcaseMode = function() {
    if (typeof is3DMode !== 'undefined' && !is3DMode) {
        if (typeof window.toggle3D === 'function') window.toggle3D();
    }

    const isShowcase = document.body.classList.toggle('showcase-active');

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
    }, 150); 

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

window.tourWaypoints = [];
window.isPlayingTour = false;
window.tourAnimationId = null;

window.captureWaypoint = function() {
    if (!window.Engine3D || !Engine3D.camera || !Engine3D.controls) return;
    const point = {
        position: { x: Engine3D.camera.position.x, y: Engine3D.camera.position.y, z: Engine3D.camera.position.z },
        target: { x: Engine3D.controls.target.x, y: Engine3D.controls.target.y, z: Engine3D.controls.target.z }
    };
    window.tourWaypoints.push(point);
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
    const wpCount = document.getElementById('wp-count');
    if (wpCount) wpCount.innerText = "0";
};

window.playCinematicTour = function() {
    if (window.tourWaypoints.length < 2) return alert("Please capture at least 2 waypoints to play a cinematic tour.");
    if (!window.Engine3D || !Engine3D.camera || !Engine3D.controls || window.isPlayingTour) return;
    
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

window.addWaypoint = window.captureWaypoint; 
window.playTour = window.playCinematicTour; 
window.clearWaypoints = window.clearTour;

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

document.addEventListener('DOMContentLoaded', () => {
    PresentationEngine.init();
});