// =========================================
// UTILITIES, MATH & COLLISION (utils.js)
// =========================================

function getMousePos(evt) {
    const pt = UI.blueprint.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const svgP = pt.matrixTransform(UI.blueprint.getScreenCTM().inverse());
    return { x: (svgP.x - panX) / zoomLvl, y: (svgP.y - panY) / zoomLvl };
}

function getTouchPos(evt) {
    const pt = UI.blueprint.createSVGPoint();
    pt.x = evt.touches[0].clientX; pt.y = evt.touches[0].clientY;
    const svgP = pt.matrixTransform(UI.blueprint.getScreenCTM().inverse());
    return { x: (svgP.x - panX) / zoomLvl, y: (svgP.y - panY) / zoomLvl };
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