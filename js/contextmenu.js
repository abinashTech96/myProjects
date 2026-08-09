// =========================================
// 🖱️ CONTEXT MENU ENGINE (contextmenu.js)
// Context-Aware (Elements, Plot, Outside)
// =========================================

// 1. INJECT NEUMORPHIC CSS
const contextMenuStyles = `
    #context-menu {
        position: absolute;
        background: #1e293b;
        border: none;
        border-radius: 12px;
        box-shadow: 8px 8px 16px rgba(0, 0, 0, 0.5),
                   -4px -4px 10px rgba(255, 255, 255, 0.03);
        padding: 8px;
        display: none;
        z-index: 9999;
        min-width: 180px;
    }
    .ctx-item {
        padding: 10px 14px;
        color: #94a3b8;
        cursor: pointer;
        font-size: 0.75rem;
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 700;
        transition: all 0.2s ease;
        margin-bottom: 4px;
    }
    .ctx-item:last-child { margin-bottom: 0; }
    .ctx-item:hover {
        background: rgba(15, 23, 42, 0.5);
        color: #38bdf8;
        box-shadow: inset 3px 3px 6px rgba(0, 0, 0, 0.5),
                    inset -3px -3px 6px rgba(255, 255, 255, 0.02);
        padding-left: 18px; 
    }
    .ctx-item[style*="color:#ef4444"]:hover {
        color: #f87171 !important;
    }
    .ctx-shortcut {
        opacity: 0.8;
        font-size: 0.65rem;
        background: rgba(0, 0, 0, 0.3);
        padding: 4px 8px;
        border-radius: 4px;
        box-shadow: inset 2px 2px 4px rgba(0,0,0,0.5);
    }
`;
document.head.insertAdjacentHTML("beforeend", `<style>${contextMenuStyles}</style>`);
// 2. DATA CONFIGURATION (Multi-Context Profiles)
const CONTEXT_MENUS = {
    element: [
        { id: 'duplicate', icon: '📋', label: 'Duplicate', shortcut: 'Ctrl+D' },
        { id: 'lock', icon: '🔒', label: 'Lock/Unlock', shortcut: 'Ctrl+L' },
        { id: 'rotate', icon: '🔄', label: 'Rotate' },
        { type: 'divider' }, 
        { id: 'delete', icon: '🗑️', label: 'Delete', shortcut: 'Del', color: '#ef4444' }
    ],
    plot: [
        { id: 'future_plot_1', icon: '🏗️', label: 'Add Room Here (Future)' },
        { id: 'future_plot_2', icon: '📐', label: 'Plot Settings (Future)' }
    ],
    outside: [
        { id: 'future_outside_1', icon: '🌳', label: 'Add Landscape (Future)' },
        { id: 'future_outside_2', icon: '🛣️', label: 'Road Settings (Future)' }
    ]
};

// 3. UI GENERATOR (Dynamic)
window.renderContextMenu = function(contextType) {
    const ctxMenu = document.getElementById('context-menu');
    if (!ctxMenu) return;
    
    const config = CONTEXT_MENUS[contextType] || CONTEXT_MENUS.element;

    ctxMenu.innerHTML = config.map(item => {
        if (item.type === 'divider') {
            return `<div style="height:1px; background:rgba(255,255,255,0.1); margin:4px 0;"></div>`;
        }
        
        const colorStyle = item.color ? `style="color:${item.color};"` : '';
        const shortcutHtml = item.shortcut ? `<span class="ctx-shortcut">${item.shortcut}</span>` : '';
        
        return `
            <div class="ctx-item" ${colorStyle} onclick="handleContextMenuAction('${item.id}')">
                <span>${item.icon} ${item.label}</span>
                ${shortcutHtml}
            </div>
        `;
    }).join('');
};

// 4. ACTION ROUTER
window.handleContextMenuAction = function(actionId) {
    // Hide menu immediately after clicking
    const ctx = document.getElementById('context-menu');
    if (ctx) ctx.style.display = 'none';

    // Route Element Actions
    if (typeof selectedElIndex !== 'undefined' && selectedElIndex !== -1) {
        switch(actionId) {
            case 'duplicate': if (typeof cloneElement === 'function') cloneElement(selectedElIndex); break;
            case 'lock': 
                if (typeof elements !== 'undefined' && elements[selectedElIndex]) {
                    elements[selectedElIndex].locked = !elements[selectedElIndex].locked; 
                    if(typeof renderSidebar === 'function') renderSidebar(); 
                }
                break;
            case 'rotate': if (typeof rotateElement === 'function') rotateElement(selectedElIndex); break;
            case 'delete': if (typeof deleteElement === 'function') deleteElement(selectedElIndex); break;
        }
    } 
    // Route Future Plot/Outside Actions
    else {
        switch(actionId) {
            case 'future_plot_1': console.log("Future: Add Room Triggered"); break;
            case 'future_plot_2': console.log("Future: Plot Settings Triggered"); break;
            case 'future_outside_1': console.log("Future: Add Landscape Triggered"); break;
            case 'future_outside_2': console.log("Future: Road Settings Triggered"); break;
        }
    }
};

// 5. GEOMETRY HELPER: Point-in-Polygon (Ray-Casting Algorithm)
function isPointInPolygon(point, vs) {
    let x = point.x, y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x, yi = vs[i].y;
        let xj = vs[j].x, yj = vs[j].y;
        
        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// 6. EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    const blueprint = document.getElementById('blueprint');
    
    if (blueprint) {
        blueprint.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const ctx = document.getElementById('context-menu');
            if (!ctx) return;

            // Scenario 1: Active Element is selected
            if (typeof selectedElIndex !== 'undefined' && selectedElIndex !== -1) {
                renderContextMenu('element');
            } 
            // Scenario 2: Empty space clicked
            else {
                // Get the exact SVG mouse coordinates
                const pt = getMousePos(e);
                
                // Get the A, B, C, D bounds from the current geometry
                const SCALE = parseFloat(UI.scaleInput?.value || 1.2);
                const unit = UI.unitSelect?.value || 'in';
                const geom = calculateGeometry(SCALE, unit); 
                
                // Check if the point is inside the A-B-C-D Polygon boundary
                const isInsidePlot = isPointInPolygon(pt, [geom.A, geom.B, geom.C, geom.D]);
                
                if (isInsidePlot) {
                    renderContextMenu('plot');
                } else {
                    renderContextMenu('outside');
                }
            }

            // Show and position the menu
            ctx.style.display = 'block';
            ctx.style.left = e.pageX + 'px';
            ctx.style.top = e.pageY + 'px';
        });
    }

    // Left Click anywhere else (Hide Menu)
    document.addEventListener('click', (e) => {
        const ctx = document.getElementById('context-menu');
        if (ctx && e.target.closest('#context-menu') === null) {
            ctx.style.display = 'none';
        }
    });
});