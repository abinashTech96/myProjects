// =========================================
// 🎛️ 3D WIDGET CONFIGURATION
// =========================================
const WIDGET_3D_CONFIG = {
    // 🎬 Presentation & Showcase Controls
    PRESENTATION: {
        id: 'presentation-widget',
        wrapperId: 'presentation-controls',
        exitBtn: {
            id: 'exit-showcase-btn',
            text: '✕ EXIT PRESENTATION',
            actionType: 'EXIT_SHOWCASE' // Maps to handleAction dispatcher
        },
        sun: { 
            id: 'sun-slider',
            min: 6, max: 18, step: 0.1, default: 12, 
            iconDawn: '🌅', iconDusk: '🌇',
            actionType: 'UPDATE_SUNLIGHT'
        },
        buttons: {
            set: { id: 'btn-wp-set', icon: '📷', text: 'Set', countId: 'wp-count', actionType: 'SET_WAYPOINT' },
            play: { id: 'btn-wp-play', icon: '▶️', text: 'Play', actionType: 'PLAY_TOUR' },
            clear: { id: 'btn-wp-clear', icon: '🗑️', title: 'Clear All', actionType: 'CLEAR_TOUR' },
            show: { 
                id: 'btn-showcase', 
                actionType: 'TOGGLE_SHOWCASE',
                states: {
                    off: { icon: '🎬', text: 'SHOW' },
                    on:  { icon: '🎬', text: 'HIDE' }
                }
            },
            explode: {
                id: 'btn-explode',
                actionType: 'TOGGLE_EXPLODE',
                states: {
                    off: { icon: '💥', text: 'EXPLODE VIEW', bg: 'rgba(56, 189, 248, 0.1)', color: '', border: '' },
                    on:  { icon: '🔽', text: 'COLLAPSE VIEW', bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.4)' }
                }
            }
        },
        timeStages: {
            morning: { maxHour: 8, text: "Morning Glow", color: "#fb923c", lightHex: 0xffedd5 },
            golden: { minHour: 16, text: "Golden Hour", color: "#f59e0b", lightHex: 0xfef3c7 },
            midday: { text: "Midday", color: "#38bdf8", lightHex: 0xffffff }
        }
    },

    // 🕹️ 3D Right-Canvas Navigation Pad
    NAVPAD: {
        id: 'nav-pad',
        buttons: {
            raycaster: { 
                id: 'btn-raycaster', 
                actionType: 'TOGGLE_RAYCASTER', 
                class: "",
                states: {
                    off: { icon: '🖱️', text: '3D SELECTION: OFF', bg: 'rgba(15, 23, 42, 0.85)', color: '#38bdf8' },
                    on:  { icon: '🖱️', text: '3D SELECTION: ON', bg: '#38bdf8', color: '#0f172a' }
                }
            },
            performance: { 
                id: 'btn-performance', 
                actionType: 'TOGGLE_PERFORMANCE', 
                class: "perf-btn",
                states: {
                    off: { icon: '⚡', text: 'PERF MODE: OFF', bg: 'rgba(15, 23, 42, 0.85)', color: '#38bdf8' },
                    on:  { icon: '⚡', text: 'PERF MODE: ON', bg: 'rgba(234, 179, 8, 0.2)', color: '#facc15' }
                }
            },
            walkthrough: { 
                id: 'btn-walk', 
                actionType: 'START_WALKTHROUGH', 
                class: "walk-btn",
                states: {
                    default: { icon: '🚶', text: 'ENTER WALKTHROUGH' }
                },
                // 🚶 Nested HUD Configuration exclusively tied to the Walkthrough Button
                hud: {
                    hintId: 'fly-hint',
                    crosshairId: 'walk-crosshair',
                    title: '🚶 VIRTUAL TOUR ACTIVE',
                    instructions: [
                        { keys: 'W A S D', action: 'Walk Around', colorClass: '#38bdf8' },
                        { keys: 'MOUSE', action: 'Look Around', colorClass: '#38bdf8' },
                        { keys: 'ESC', action: 'Exit Tour', colorClass: '#ef4444' }
                    ]
                }
            }
        }
    }
};

// Global State Variables shared with Engine3D
window.isRaycasterActive = false;
window.isPerformanceMode = false;
window.tourWaypoints = [];
window.isPlayingTour = false;
window.tourAnimationId = null;

// ==========================================
// 🧩 3D WIDGET ENGINE
// ==========================================
const Widget3DEngine = {
    isExploded: false,
    isNightMode: false,

    init: function() {
        this._initPresentation();
        this._initNavPad();
    },

    // 🌟 CENTRALIZED ACTION DISPATCHER
    handleAction: function(actionType, payload = null) {
        if (actionType === 'SET_WAYPOINT') this.captureWaypoint();
        else if (actionType === 'PLAY_TOUR') this.playCinematicTour();
        else if (actionType === 'CLEAR_TOUR') this.clearTour();
        else if (actionType === 'TOGGLE_SHOWCASE' || actionType === 'EXIT_SHOWCASE') this.toggleShowcaseMode();
        else if (actionType === 'TOGGLE_EXPLODE') this.toggleExplodeView();
        else if (actionType === 'TOGGLE_RAYCASTER') this.toggleRaycaster();
        else if (actionType === 'TOGGLE_PERFORMANCE') this.togglePerformanceMode();
        else if (actionType === 'START_WALKTHROUGH') this.startWalkthrough();
        else if (actionType === 'UPDATE_SUNLIGHT') this.updateSunlight(payload);
        else console.warn(`ActionType '${actionType}' is unhandled.`);
    },

    // -----------------------------------------
    // 1. PRESENTATION CONTROLS
    // -----------------------------------------
    _initPresentation: function() {
        const conf = WIDGET_3D_CONFIG.PRESENTATION;
        let widget = document.getElementById(conf.id);
        
        if (!widget) {
            widget = document.createElement('div');
            widget.id = conf.id;
            document.body.appendChild(widget);
        }

        widget.innerHTML = `
            <button id="${conf.exitBtn.id}" onclick="Widget3DEngine.handleAction('${conf.exitBtn.actionType}')">
                ${conf.exitBtn.text}
            </button>
            <div id="${conf.wrapperId}" class="pc-wrapper" style="display: none;">
                <div class="pc-sun-group">
                    <span class="pc-sun-icon pc-dawn" title="Dawn">${conf.sun.iconDawn}</span>
                    <input type="range" id="${conf.sun.id}" class="pc-sun-slider" min="${conf.sun.min}" max="${conf.sun.max}" step="${conf.sun.step}" value="${conf.sun.default}" oninput="Widget3DEngine.handleAction('${conf.sun.actionType}', this.value)">
                    <span class="pc-sun-icon pc-dusk" title="Dusk">${conf.sun.iconDusk}</span>
                </div>
                <div class="pc-divider"></div>
                <div class="pc-btn-group">
                    <button id="${conf.buttons.set.id}" class="pc-btn pc-btn-set" onclick="Widget3DEngine.handleAction('${conf.buttons.set.actionType}')">
                        <span class="pc-icon">${conf.buttons.set.icon}</span> ${conf.buttons.set.text} (<span id="${conf.buttons.set.countId}">0</span>)
                    </button>
                    <button id="${conf.buttons.play.id}" class="pc-btn pc-btn-play" onclick="Widget3DEngine.handleAction('${conf.buttons.play.actionType}')">
                        <span class="pc-icon">${conf.buttons.play.icon}</span> ${conf.buttons.play.text}
                    </button>
                    <button id="${conf.buttons.clear.id}" class="pc-btn pc-btn-clear" onclick="Widget3DEngine.handleAction('${conf.buttons.clear.actionType}')" title="${conf.buttons.clear.title}">
                        <span class="pc-icon">${conf.buttons.clear.icon}</span>
                    </button>
                </div>
                <div class="pc-divider"></div>
                <div class="pc-btn-group">
                    <button id="${conf.buttons.show.id}" class="pc-btn pc-btn-view" onclick="Widget3DEngine.handleAction('${conf.buttons.show.actionType}')">
                        <span class="pc-icon">${conf.buttons.show.states.off.icon}</span> <span class="btn-text">${conf.buttons.show.states.off.text}</span>
                    </button>
                    <button id="${conf.buttons.explode.id}" class="pc-btn pc-btn-view" onclick="Widget3DEngine.handleAction('${conf.buttons.explode.actionType}')">
                        <span class="pc-icon">${conf.buttons.explode.states.off.icon}</span> <span class="btn-text">${conf.buttons.explode.states.off.text}</span>
                    </button>
                </div>
            </div>
        `;
    },

    updateSunlight: function(hour) {
        if (!Engine3D.sunLight || !Engine3D.scene) return; 
        const conf = WIDGET_3D_CONFIG.PRESENTATION.timeStages;
        
        const normalizedTime = (hour - 6) / 12; 
        const angle = normalizedTime * Math.PI;
        const radius = 1000;
        
        Engine3D.sunLight.position.set(Math.cos(angle) * -radius, Math.sin(angle) * radius, 300);
        
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            if (hour < conf.morning.maxHour) {
                timeDisplay.innerText = conf.morning.text;
                timeDisplay.style.color = conf.morning.color; 
                Engine3D.sunLight.color.setHex(conf.morning.lightHex); 
            } else if (hour > conf.golden.minHour) {
                timeDisplay.innerText = conf.golden.text;
                timeDisplay.style.color = conf.golden.color;
                Engine3D.sunLight.color.setHex(conf.golden.lightHex);
            } else {
                timeDisplay.innerText = conf.midday.text;
                timeDisplay.style.color = conf.midday.color;
                Engine3D.sunLight.color.setHex(conf.midday.lightHex); 
            }
        }
    
        if (typeof Engine3D.renderer !== 'undefined') Engine3D.renderer.shadowMap.needsUpdate = true;
    },

    toggleShowcaseMode: function() {
        if (typeof is3DMode !== 'undefined' && !is3DMode) {
            if (typeof window.toggle3D === 'function') window.toggle3D();
        }
    
        const isShowcase = document.body.classList.toggle('showcase-active');

        // Dynamically update button text/icon from Config
        const conf = WIDGET_3D_CONFIG.PRESENTATION.buttons.show;
        const btn = document.getElementById(conf.id);
        if (btn) {
            const state = isShowcase ? conf.states.on : conf.states.off;
            btn.innerHTML = `<span class="pc-icon">${state.icon}</span> <span class="btn-text">${state.text}</span>`;
        }
    
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
                Engine3D.camera.aspect = window.innerWidth / window.innerHeight;
                Engine3D.camera.updateProjectionMatrix();
                Engine3D.renderer.setSize(window.innerWidth, window.innerHeight);
                if (Engine3D.scene) Engine3D.renderer.render(Engine3D.scene, Engine3D.camera);
            }
        }, 450); 
    },

    toggleExplodeView: function() {
        if (!Engine3D.buildingGroup || !window.is3DMode) return;
        this.isExploded = !this.isExploded;
        
        // Dynamically update UI from Config
        const expConf = WIDGET_3D_CONFIG.PRESENTATION.buttons.explode;
        const btn = document.getElementById(expConf.id);
        if (btn) {
            const state = this.isExploded ? expConf.states.on : expConf.states.off;
            btn.style.background = state.bg;
            btn.style.color = state.color;
            btn.style.borderColor = state.border;
            btn.innerHTML = `<span class="pc-icon">${state.icon}</span> <span class="btn-text">${state.text}</span>`;
        }
    
        const WALL_HEIGHT = (typeof ARCH_CONFIG !== 'undefined' && ARCH_CONFIG.DEFAULTS) ? ARCH_CONFIG.DEFAULTS.WALL_HEIGHT_3D : 120;
        const OFFSET_PER_FLOOR = 350;
    
        Engine3D.buildingGroup.children.forEach(child => {
            if (child.userData.originalY === undefined) child.userData.originalY = child.position.y;
            const floorLevel = Math.floor((child.userData.originalY + 5) / WALL_HEIGHT);
            const targetFloor = Math.max(0, floorLevel);
            child.userData.targetY = this.isExploded ? child.userData.originalY + (targetFloor * OFFSET_PER_FLOOR) : child.userData.originalY;
        });
    
        if (this._explodeAnimation) cancelAnimationFrame(this._explodeAnimation);
    
        const animateExplode = () => {
            let allArrived = true;
            Engine3D.buildingGroup.children.forEach(child => {
                const diff = child.userData.targetY - child.position.y;
                if (Math.abs(diff) > 0.5) {
                    child.position.y += diff * 0.08; 
                    allArrived = false;
                } else {
                    child.position.y = child.userData.targetY;
                }
            });
    
            if (!allArrived) this._explodeAnimation = requestAnimationFrame(animateExplode);
            else this._explodeAnimation = null;
        }
        animateExplode();
    },

    captureWaypoint: function() {
        if (!window.Engine3D || !Engine3D.camera || !Engine3D.controls) return;
        window.tourWaypoints.push({
            position: { x: Engine3D.camera.position.x, y: Engine3D.camera.position.y, z: Engine3D.camera.position.z },
            target: { x: Engine3D.controls.target.x, y: Engine3D.controls.target.y, z: Engine3D.controls.target.z }
        });
        const wpCount = document.getElementById(WIDGET_3D_CONFIG.PRESENTATION.buttons.set.countId);
        if (wpCount) {
            wpCount.innerText = window.tourWaypoints.length;
            wpCount.style.transform = 'scale(1.2)';
            setTimeout(() => wpCount.style.transform = 'scale(1)', 200);
        }
    },
    
    clearTour: function() {
        window.tourWaypoints = [];
        window.isPlayingTour = false;
        if (window.tourAnimationId) cancelAnimationFrame(window.tourAnimationId);
        const wpCount = document.getElementById(WIDGET_3D_CONFIG.PRESENTATION.buttons.set.countId);
        if (wpCount) wpCount.innerText = "0";
    },
    
    playCinematicTour: function() {
        if (window.tourWaypoints.length < 2) return alert("Please capture at least 2 waypoints to play a cinematic tour.");
        if (!window.Engine3D || !Engine3D.camera || !Engine3D.controls || window.isPlayingTour) return;
        
        window.isPlayingTour = true;
        Engine3D.controls.enabled = false; 
        let currentWpIndex = 0;
        const durationPerPoint = 3000;
        let startTime = performance.now();
        
        const animateTour = (time) => {
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
        };
        window.tourAnimationId = requestAnimationFrame(animateTour);
    },

    toggleNightMode: function() {
        this.isNightMode = !this.isNightMode;
        
        if (this.isNightMode) {
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
                if (child.isPointLight) child.intensity = this.isNightMode ? 1.0 : 0;
            });
        }
    },

    // -----------------------------------------
    // 2. 3D NAVIGATION PAD & LOGIC
    // -----------------------------------------
    _initNavPad: function() {
        const conf = WIDGET_3D_CONFIG.NAVPAD;
        let widget = document.getElementById(conf.id);
        
        if (!widget) {
            widget = document.createElement('div');
            widget.id = conf.id;
            const rightCanvas = document.getElementById('right-canvas-wrapper') || document.body;
            rightCanvas.appendChild(widget);
        }

        widget.innerHTML = Object.values(conf.buttons).map(btn => {
            const state = btn.states.off || btn.states.default;
            return `
            <button id="${btn.id}" class="float-action-btn ${btn.class}" onclick="Widget3DEngine.handleAction('${btn.actionType}')">
                <span class="icon">${state.icon}</span><span class="text">${state.text}</span>
            </button>
            `;
        }).join('');
    },

    toggleRaycaster: function() {
        window.isRaycasterActive = !window.isRaycasterActive;
        const conf = WIDGET_3D_CONFIG.NAVPAD.buttons.raycaster;
        const btn = document.getElementById(conf.id);
        
        if (btn) {
            const state = window.isRaycasterActive ? conf.states.on : conf.states.off;
            const textSpan = btn.querySelector('.text');
            if (textSpan) textSpan.innerHTML = state.text;
            btn.style.background = state.bg;
            btn.style.color = state.color;
        }

        if (!window.isRaycasterActive) {
            if (typeof selectedElIndex !== 'undefined') window.selectedElIndex = -1;
            if (typeof renderSidebar === 'function') renderSidebar();
            if (typeof updateCanvas === 'function') updateCanvas();
        }
    },

    togglePerformanceMode: function() {
        window.isPerformanceMode = !window.isPerformanceMode;
        const conf = WIDGET_3D_CONFIG.NAVPAD.buttons.performance;
        const btn = document.getElementById(conf.id);

        if (btn) {
            const state = window.isPerformanceMode ? conf.states.on : conf.states.off;
            const textSpan = btn.querySelector('.text');
            if (textSpan) textSpan.innerHTML = state.text;
            btn.style.background = state.bg;
            btn.style.color = state.color;
        }
    
        document.body.classList.toggle('perf-mode-active', window.isPerformanceMode);
    
        if (!Engine3D.scene || !Engine3D.renderer) return;
    
        Engine3D.renderer.setPixelRatio(window.isPerformanceMode ? 1 : window.devicePixelRatio);
    
        Engine3D.scene.traverse((object) => {
            if (object.isDirectionalLight) object.castShadow = !window.isPerformanceMode;
            if (object.isMesh) {
                object.castShadow = !window.isPerformanceMode;
                object.receiveShadow = !window.isPerformanceMode;
                if (object.material) object.material.needsUpdate = true;
            }
        });
    
        if (window.is3DMode && !Engine3D.isWalkthrough) {
            Engine3D.controls.update();
            Engine3D.renderer.render(Engine3D.scene, Engine3D.camera);
        }
    },

    startWalkthrough: function() {
        if (!window.is3DMode || !Engine3D.fpsControls) return;
        
        Engine3D.isWalkthrough = true;
        Engine3D.controls.enabled = false; 
        const navPad = document.getElementById(WIDGET_3D_CONFIG.NAVPAD.id);
        if(navPad) navPad.style.display = 'none';
    
        const conf = WIDGET_3D_CONFIG.NAVPAD.buttons.walkthrough.hud;

        if (!document.getElementById(conf.hintId)) {
            const hint = document.createElement('div');
            hint.id = conf.hintId;
            hint.className = 'tour-hud';
            
            const instructionsHTML = conf.instructions.map(inst => `
                <div><kbd style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; color: ${inst.colorClass}; font-family: monospace;">${inst.keys}</kbd></div>
                <div>${inst.action}</div>
            `).join('');

            hint.innerHTML = `
                <div style="font-size: 1.1rem; font-weight: bold; color: #f8fafc; margin-bottom: 12px;">${conf.title}</div>
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 15px; text-align: left; font-size: 0.8rem; color: #94a3b8; align-items: center;">
                    ${instructionsHTML}
                </div>
            `;
            document.body.appendChild(hint);
        }
    
        if (!document.getElementById(conf.crosshairId)) {
            const crosshair = document.createElement('div');
            crosshair.id = conf.crosshairId;
            crosshair.className = 'tour-crosshair';
            document.body.appendChild(crosshair);
        }
    
        const scaleInput = document.getElementById('scaleInput');
        const SCALE = scaleInput ? parseFloat(scaleInput.value) || 1.2 : 1.2;
        Engine3D.camera.position.set(Engine3D.camera.position.x, 65 * SCALE, Engine3D.camera.position.z); 
        
        Engine3D.fpsControls.lock();
    }
};

// ==========================================
// 🌐 GLOBAL HOOKS (Backwards Compatibility)
// ==========================================

// Map global inline HTML calls to the new Widget3DEngine
window.updateSunlight = (hour) => Widget3DEngine.handleAction('UPDATE_SUNLIGHT', hour);
window.toggleShowcaseMode = () => Widget3DEngine.handleAction('TOGGLE_SHOWCASE');
window.toggleExplodeView = () => Widget3DEngine.handleAction('TOGGLE_EXPLODE');
window.captureWaypoint = () => Widget3DEngine.handleAction('SET_WAYPOINT');
window.clearTour = () => Widget3DEngine.handleAction('CLEAR_TOUR');
window.playCinematicTour = () => Widget3DEngine.handleAction('PLAY_TOUR');
window.toggleNightMode = () => Widget3DEngine.toggleNightMode();
// Aliases for tour
window.addWaypoint = window.captureWaypoint; 
window.playTour = window.playCinematicTour; 
window.clearWaypoints = window.clearTour;

// Auto-Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    Widget3DEngine.init();
});