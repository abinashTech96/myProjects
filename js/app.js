// =================================================================
// APP BOOTSTRAPPER (app.js)
// Central event hub, AI bindings, and startup routines
// =================================================================

// -----------------------------------------
// AI AGENT BRIDGE API
// -----------------------------------------
window.addRoom = function(x,y,w,h,type='living') {
    return ProjectState.commit('AI added room',()=>elements.push({id:ProjectModel.uid(),type,x:x??20,y:y??20,w:w??120,h:h??120,floor:currentFloor,locked:false}));
};
window.moveElement = function(id,x,y) { const idx=typeof id==='number'?id:elements.findIndex(e=>e.id===id); return ProjectState.updateElement(idx,{x,y},'AI moved element'); };
window.deleteElementAI = function(id) {return ProjectState.deleteElement(typeof id==='number'?id:elements.findIndex(e=>e.id===id));};

// -----------------------------------------
// BACKGROUND MATH WORKER
// -----------------------------------------
window.requestBackgroundMath = debounce(() => {
    if (typeof StudioUI !== 'undefined' && StudioUI.mode === '4d') return;
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

    if (typeof renderFloorSelectors === 'function') renderFloorSelectors(); 

    
    if (typeof setFloor === 'function') setFloor(0); 
    ProjectState.baseline();
    if (typeof loadFromMemory === 'function') loadFromMemory();
    if (typeof updateCanvas === 'function') updateCanvas();
});
