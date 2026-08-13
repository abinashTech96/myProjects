// =================================================================
// APP BOOTSTRAPPER (app.js)
// Central event hub, AI bindings, and startup routines
// =================================================================

// -----------------------------------------
// AI AGENT BRIDGE API
// -----------------------------------------
window.addRoom = function(x, y, w, h, type) {
    if(typeof saveState === 'function') saveState();
    const safeType = type || 'living';
    const safeW = w || 120;
    const safeH = h || 120;
    const safeX = x || 20;
    const safeY = y || 20;

    elements.push({ 
        type: safeType, w: safeW, h: safeH, x: safeX, y: safeY, 
        floor: currentFloor, locked: false, dir: safeType === 'staircase' ? 'up' : null 
    });
    
    if(typeof renderSidebar === 'function') renderSidebar();
    if(typeof updateCanvas === 'function') updateCanvas();
};

window.moveElement = function(id, newX, newY) {
    if (!elements[id]) return; 
    if (typeof ProjectState !== 'undefined') {
        ProjectState.commit('AI Moved Element', () => {
            elements[id].x = newX;
            elements[id].y = newY;
        });
    } else {
        if(typeof saveState === 'function') saveState();
        elements[id].x = newX;
        elements[id].y = newY;
    }
    if(typeof renderSidebar === 'function') renderSidebar();
    if(typeof updateCanvas === 'function') updateCanvas();
};

window.deleteElementAI = function(idx) {
    if (!elements[idx]) return;
    if(typeof saveState === 'function') saveState(); 
    
    elements.splice(idx, 1); 
    fixtures = fixtures.filter(f => f.roomId !== idx);
    fixtures.forEach(f => { if (f.roomId > idx) f.roomId--; });
    
    selectedElIndex = (selectedElIndex === idx) ? -1 : (selectedElIndex > idx ? selectedElIndex - 1 : selectedElIndex);
    if(typeof renderSidebar === 'function') renderSidebar(); 
    if(typeof updateCanvas === 'function') updateCanvas(); 
};

// -----------------------------------------
// BACKGROUND MATH WORKER
// -----------------------------------------
window.requestBackgroundMath = debounce(() => {
    if (typeof elements === 'undefined' || !elements) return;
    const areaResult = typeof _calcArea === 'function' ? _calcArea(elements, currentFloor) : null;
    if (areaResult && typeof renderAreaUI === 'function') {
        renderAreaUI(areaResult);
    }
}, 50);

// -----------------------------------------
// EVENT BUS LISTENERS
// -----------------------------------------
if (typeof AppEvents !== 'undefined') {
    AppEvents.onStateChange(() => {
        if (typeof updateCanvas === 'function') updateCanvas();
        if (typeof renderSidebar === 'function') renderSidebar();
    });

    AppEvents.onSelectionChange(() => {
        if (typeof renderSidebar === 'function') renderSidebar();
    });
}

// -----------------------------------------
// STARTUP ROUTINE
// -----------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initDOMCache === 'function') initDOMCache();
    if (typeof initInteractions === 'function') initInteractions(); 
    if (typeof loadFromMemory === 'function') loadFromMemory();
    if (typeof renderFloorSelectors === 'function') renderFloorSelectors(); 
    if (typeof loadState === 'function' && localStorage.getItem('ArchCAD_AutoSave')) loadState();
    
    if (typeof setFloor === 'function') setFloor(0); 
    if (typeof updateCanvas === 'function') updateCanvas();
});