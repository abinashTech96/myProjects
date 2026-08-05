// =========================================
// 📷 2D CAMERA & VIEWPORT ENGINE (camera.js)
// Single-File Component (CSS + JS + HTML)
// =========================================

// 1. INJECT MODULE-SPECIFIC CSS
const cameraStyles = `
    .cam-bar-wrapper {
        position: absolute;
        bottom: 20px; right: 20px; 
        display: flex;
        flex-direction: column; align-items: center;
        z-index: 50;
        gap: 6px; 
    }
    .cam-squircle-btn {
        background: #0f172a; 
        border: 1px solid rgba(16, 185, 129, 0.2); 
        border-radius: 10px; 
        color: #e2e8f0;
        width: 36px; height: 36px;
        font-size: 0.9rem;
        cursor: pointer;
        display: flex; justify-content: center; align-items: center;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.6), 0 0 10px rgba(16, 185, 129, 0.15);
    }
    .cam-squircle-btn:hover {
        background: #1e293b;
        border-color: rgba(16, 185, 129, 0.6);
        color: #10b981; 
        transform: scale(1.1);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.8), 0 0 15px rgba(16, 185, 129, 0.4);
    }
    .cam-squircle-btn:active {
        transform: scale(0.95);
    }
    .cam-main-bar {
        display: flex;
        align-items: center;
        gap: 6px; 
    }
    .cam-toggle-btn {
        position: relative;
        font-size: 1.2rem;
        color: #10b981; 
    }
    .cam-icon, .close-icon { 
        position: absolute; 
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); 
    }
    .close-icon { 
        opacity: 0; 
        transform: rotate(-90deg) scale(0); 
        color: #ef4444; 
        font-size: 1.4rem;
    }
    .cam-bar-wrapper.open .cam-toggle-btn {
        border-color: rgba(239, 68, 68, 0.4);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.6), 0 0 10px rgba(239, 68, 68, 0.2);
    }
    .cam-bar-wrapper.open .cam-icon { opacity: 0; transform: rotate(90deg) scale(0); }
    .cam-bar-wrapper.open .close-icon { opacity: 1; transform: rotate(0deg) scale(1); }
    
    .cam-pan-popout {
        display: grid;
        grid-template-areas: 
            ". up ." 
            "left center right" 
            ". down .";
        gap: 6px;
        opacity: 0;
        transform: translateY(15px) scale(0.8);
        transform-origin: bottom center;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
    }
    .cam-bar-wrapper.open .cam-pan-popout {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
    }
    .pan-center { font-size: 0.6rem; color: #f8fafc; }
    .pan-dir.up { grid-area: up; }
    .pan-dir.down { grid-area: down; }
    .pan-dir.left { grid-area: left; }
    .pan-dir.right { grid-area: right; }
    .pan-center { grid-area: center; }
`;

document.head.insertAdjacentHTML("beforeend", `<style>${cameraStyles}</style>`);

// 2. GLOBAL STATE & CORE CAMERA FUNCTIONS
window.CanvasState = {
    panX: 0,
    panY: 0,
    zoomLvl: 1,
    snapLines: []
};

window.updateViewport = function() {
    const vp = (typeof UI !== 'undefined' && UI.viewport) ? UI.viewport : document.getElementById('viewport');
    if (vp) {
        vp.setAttribute('transform', `matrix(${window.CanvasState.zoomLvl}, 0, 0, ${window.CanvasState.zoomLvl}, ${window.CanvasState.panX}, ${window.CanvasState.panY})`);
    }
};

window.panCamera = function(dx, dy) {
    window.CanvasState.panX += dx; 
    window.CanvasState.panY += dy;
    window.updateViewport();
};

window.zoomCamera = function(factor, e = null) {
    const newZoom = window.CanvasState.zoomLvl * factor;
    
    // Limits: Max zoom out 0.2x, Max zoom in 5x
    if (newZoom < 0.2 || newZoom > 5) return;
    
    // Default zoom to the center of the canvas
    let pointerX = 500;
    let pointerY = 500;
    
    const svg = (typeof UI !== 'undefined' && UI.blueprint) ? UI.blueprint : document.getElementById('blueprint');
    
    if (e && svg) {
        // If an event is passed (e.g., mouse wheel), zoom directly towards the cursor
        const pt = svg.createSVGPoint();
        pt.x = e.clientX || (e.touches ? e.touches[0].clientX : 500);
        pt.y = e.clientY || (e.touches ? e.touches[0].clientY : 500);
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        pointerX = svgP.x;
        pointerY = svgP.y;
    }
    
    window.CanvasState.panX = pointerX - (pointerX - window.CanvasState.panX) * factor;
    window.CanvasState.panY = pointerY - (pointerY - window.CanvasState.panY) * factor;
    window.CanvasState.zoomLvl = newZoom;
    window.updateViewport();
};

window.resetCamera = function() {
    window.CanvasState.panX = 0; 
    window.CanvasState.panY = 0; 
    window.CanvasState.zoomLvl = 1;
    window.updateViewport();
};

// 3. CAMERA WIDGET ENGINE
const CameraEngine = {
    // Set to true to strictly require <div id="camera-controls"></div> in index.html
    REQUIRE_HTML_CONTAINER: true,

    init: function() {
        let widget = document.getElementById('camera-controls');
        
        if (!widget) {
            if (this.REQUIRE_HTML_CONTAINER) return;
            widget = document.createElement('div');
            widget.id = 'camera-controls';
            // Find the left canvas area to append to, or fallback to body
            const canvasWrapper = document.getElementById('canvas-wrapper') || document.body;
            canvasWrapper.appendChild(widget);
        }

        // Apply the base class for styling
        widget.className = 'cam-bar-wrapper';

        // Inject the HTML structure into the anchor div
        widget.innerHTML = `
            <div class="cam-pan-popout">
                <button class="cam-squircle-btn pan-dir up" onclick="panCamera(0, 50)" title="Pan Up">▲</button>
                <button class="cam-squircle-btn pan-dir left" onclick="panCamera(50, 0)" title="Pan Left">◄</button>
                <button class="cam-squircle-btn pan-center" onclick="resetCamera()" title="Reset Camera">⚪</button>
                <button class="cam-squircle-btn pan-dir right" onclick="panCamera(-50, 0)" title="Pan Right">►</button>
                <button class="cam-squircle-btn pan-dir down" onclick="panCamera(0, -50)" title="Pan Down">▼</button>
            </div>
            <div class="cam-main-bar">
                <button class="cam-squircle-btn cam-zoom-btn" onclick="zoomCamera(1.2)" title="Zoom In">➕</button>
                <button class="cam-squircle-btn cam-toggle-btn" onclick="document.getElementById('camera-controls').classList.toggle('open')" title="Toggle Pan Controls">
                    <span class="cam-icon">🎥</span>
                    <span class="close-icon">✕</span>
                </button>
                <button class="cam-squircle-btn cam-zoom-btn" onclick="zoomCamera(0.8)" title="Zoom Out">➖</button>
            </div>
        `;

        this.setupListeners();
    },

    setupListeners: function() {
        const cameraCb = document.getElementById('toggle-camera-cb');
        if (cameraCb) {
            cameraCb.addEventListener('change', (e) => {
                if (typeof window.toggleWidget === 'function') {
                    window.toggleWidget('camera-controls', e.target.checked);
                }
            });
        }
    }
};

// 4. INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    CameraEngine.init();
});