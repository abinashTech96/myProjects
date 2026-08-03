// =========================================
// 📷 2D CAMERA & VIEWPORT ENGINE (camera.js)
// =========================================

// Attach state globally so other modules (like drag-and-drop) can read the zoom level
window.CanvasState = {
    panX: 0,
    panY: 0,
    zoomLvl: 1,
    snapLines: []
};

window.updateViewport = function() {
    // Attempt to use the UI cache, fallback to direct DOM query if loading asynchronously
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

// --- Self-Contained Settings Toggle ---
// Note: Ensure your checkbox in index.html has id="toggle-camera-cb" for this to attach!
document.addEventListener('DOMContentLoaded', () => {
    const cameraCb = document.getElementById('toggle-camera-cb');
    if (cameraCb) {
        cameraCb.addEventListener('change', (e) => {
            if (typeof window.toggleWidget === 'function') {
                window.toggleWidget('camera-controls', e.target.checked);
            }
        });
    }
});