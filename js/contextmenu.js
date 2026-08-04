// =========================================
// 📋 CONTEXT MENU ENGINE (contextmenu.js)
// Single-File Component (CSS + JS)
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

// Insert the CSS into the <head> automatically
document.head.insertAdjacentHTML("beforeend", `<style>${contextMenuStyles}</style>`);

// 2. DATA CONFIGURATION
const CONTEXT_MENU_CONFIG = [
    { id: 'duplicate', icon: '📋', label: 'Duplicate', shortcut: 'Ctrl+D', action: 'cloneElement' },
    { id: 'lock', icon: '🔒', label: 'Lock/Unlock', shortcut: 'Ctrl+L', action: 'toggleLock' },
    { id: 'rotate', icon: '🔄', label: 'Rotate', action: 'rotateElement' },
    { type: 'divider' }, 
    { id: 'delete', icon: '🗑️', label: 'Delete', shortcut: 'Del', action: 'deleteElement', color: '#ef4444' }
];

// 3. UI GENERATOR
window.initContextMenu = function() {
    const ctxMenu = document.getElementById('context-menu');
    if (!ctxMenu) return;
    
    ctxMenu.innerHTML = CONTEXT_MENU_CONFIG.map(item => {
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
    if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) return;
    
    switch(actionId) {
        case 'duplicate': 
            if (typeof cloneElement === 'function') cloneElement(selectedElIndex); 
            break;
        case 'lock': 
            if (typeof elements !== 'undefined' && elements[selectedElIndex]) {
                elements[selectedElIndex].locked = !elements[selectedElIndex].locked; 
                if(typeof renderSidebar === 'function') renderSidebar(); 
            }
            break;
        case 'rotate': 
            if (typeof rotateElement === 'function') rotateElement(selectedElIndex); 
            break;
        case 'delete': 
            if (typeof deleteElement === 'function') deleteElement(selectedElIndex); 
            break;
    }
    
    // Hide menu after clicking
    const ctx = document.getElementById('context-menu');
    if (ctx) ctx.style.display = 'none';
};

// 5. EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    initContextMenu();

    // Right Click (Show Menu)
    const blueprint = document.getElementById('blueprint');
    if (blueprint) {
        blueprint.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (typeof selectedElIndex !== 'undefined' && selectedElIndex !== -1) {
                const ctx = document.getElementById('context-menu');
                if (ctx) {
                    ctx.style.display = 'block';
                    ctx.style.left = e.pageX + 'px';
                    ctx.style.top = e.pageY + 'px';
                }
            }
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