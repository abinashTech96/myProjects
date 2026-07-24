// =========================================
// UTILITIES, MATH & COLLISION (utils.js)
// =========================================
// 🚀 SHARED UTILITIES & PERFORMANCE OPTIMIZERS
const Utils = {
    // DRY: Centralized Hex to RGB converter
    hexToRgb(hexString) {
        const hex = hexString.replace('#', '');
        return `${parseInt(hex.substring(0,2),16)}, ${parseInt(hex.substring(2,4),16)}, ${parseInt(hex.substring(4,6),16)}`;
    },
    
    // DRY: Centralized Canvas Dimensions (Stops redundant DOM querying)
    getMetrics() {
        const SCALE = parseFloat(document.getElementById('scaleInput')?.value || 1.2);
        const unit = document.getElementById('unitSelect')?.value || 'in';
        const inW = toInches(document.getElementById('inW')?.value || 0, unit) * SCALE;
        const inH = toInches(document.getElementById('inH')?.value || 0, unit) * SCALE;
        const I = { x: 500 - (inW/2), y: 500 - (inH/2) };
        return { SCALE, unit, inW, inH, I };
    },

    // ANTI-THRASHING: Only touches the DOM if the value actually changed!
    setAttr(el, attr, val) {
        if (el && el.getAttribute(attr) !== String(val)) {
            el.setAttribute(attr, val);
        }
    }
};


function getMousePos(evt) {
    const pt = UI.blueprint.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const svgP = pt.matrixTransform(UI.blueprint.getScreenCTM().inverse());
    return { x: (svgP.x - CanvasState.panX) / CanvasState.zoomLvl, y: (svgP.y - CanvasState.panY) / CanvasState.zoomLvl };
}

function getTouchPos(evt) {
    const pt = UI.blueprint.createSVGPoint();
    pt.x = evt.touches[0].clientX; pt.y = evt.touches[0].clientY;
    const svgP = pt.matrixTransform(UI.blueprint.getScreenCTM().inverse());
    return { x: (svgP.x - CanvasState.panX) / CanvasState.zoomLvl, y: (svgP.y - CanvasState.panY) / CanvasState.zoomLvl };
}

const toInches = (val, unit) => unit === 'cm' ? parseFloat(val) / 2.54 : parseFloat(val);

const getPolygonArea = (coords) => { 
    let area = 0; 
    for (let i = 0; i < coords.length; i++) { 
        let j = (i + 1) % coords.length; 
        area += coords[i].x * coords[j].y; area -= coords[j].x * coords[i].y; 
    } 
    return Math.abs(area) / 2; 
};

function checkCollision(el, index) {
    if (el.isFurniture) return false;
    return elements.some((other, i) => 
        i !== index && 
        other.floor === el.floor && 
        !other.isFurniture &&
        !(el.x + el.w <= other.x || el.x >= other.x + other.w || el.y + el.h <= other.y || el.y >= other.y + other.h)
    ); 
}

function applySmartSnap(el, index) {
    snapLines = [];
    const TOLERANCE = 5; // Will snap if within 5 pixels
    
    elements.forEach((other, i) => {
        if (i === index || other.floor !== el.floor) return;
        
        // Vertical Snapping (X-axis)
        if (Math.abs(el.x - other.x) < TOLERANCE) { el.x = other.x; snapLines.push({x: el.x, type: 'v'}); }
        else if (Math.abs((el.x + el.w) - (other.x + other.w)) < TOLERANCE) { el.x = other.x + other.w - el.w; snapLines.push({x: el.x + el.w, type: 'v'}); }
        
        // Horizontal Snapping (Y-axis)
        if (Math.abs(el.y - other.y) < TOLERANCE) { el.y = other.y; snapLines.push({y: el.y, type: 'h'}); }
        else if (Math.abs((el.y + el.h) - (other.y + other.h)) < TOLERANCE) { el.y = other.y + other.h - el.h; snapLines.push({y: el.y + el.h, type: 'h'}); }
    });
}

// ==========================================
// ⏱️ ENGINE OPTIMIZATION: DEBOUNCE
// ==========================================
window.debounce = function(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// 🌟 Create safe, debounced versions of your heaviest functions
// This waits 150 milliseconds after the user stops dragging before firing
window.debounced3DUpdate = debounce(() => {
    if (typeof generate3DModel === 'function') generate3DModel();
}, 150);

window.debouncedUpdateCanvas = debounce(() => {
    if (typeof updateCanvas === 'function') updateCanvas();
}, 50); // 50ms is perfect for 2D drawing (feels instant, but drops 80% of the CPU load)