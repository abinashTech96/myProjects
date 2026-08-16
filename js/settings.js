// =========================================
// ⚙️ SETTINGS ENGINE (settings.js)
// =========================================

// 1. CONFIGURATION
const SETTINGS_CONFIG = [
    {
        id: 'widget-visibility',
        icon: '👁️',
        title: 'UI WIDGETS',
        open: true,
        animation: 'blastAndSparkleFocus',
        items: [
            { type: 'toggle', id: 'toggle-qc-cb', label: '📏 Quick Converter', checked: true, action: "window.toggleWidget('qc-widget-wrapper', this.checked)" },
            { type: 'toggle', id: 'toggle-camera-cb', label: '📷 Camera Controls', checked: true, action: "window.toggleWidget('camera-controls', this.checked)" },
            { type: 'toggle', id: 'toggle-compliance-cb', label: '✅ Code Inspector', checked: true, action: "window.toggleWidget('compliance-widget', this.checked)" },
            { type: 'toggle', id: 'toggle-vastu-cb', label: '🧭 Vastu Score', checked: true, action: "window.toggleWidget('vastu-widget', this.checked)" },
            { type: 'toggle', id: 'toggle-cheatsheet-cb', label: '⌨️ Shortcuts Guide', checked: true, action: "if(typeof toggleCheatSheet === 'function') { const btn = document.getElementById('btn-cheat-sheet'); if(btn) btn.style.display = this.checked ? '' : 'none'; }" }
        ]
    },
    {
        id: 'pro-tools',
        icon: '🚀',
        title: 'BUILDER TOOLS',
        open: false,
        isGrid: true,
        animation: 'blastAndSparkleRing',
        items: [
            { type: 'buttons', buttons: [
                { label: '✨ Auto-Builder', action: "toggleAutoBuilder()", class: 'sidebar-btn secondary', style: 'flex:1; padding: 5px;' },
                { label: '🤖 AI Agent', action: "toggleAIAgent(); window.populateAIModelDropdown();", class: 'sidebar-btn secondary', style: 'flex:1; padding: 5px;' }
            ]}
        ]
    },
    {
        id: 'demo-section',
        icon: '🧪',
        title: 'DEMO FEATURES',
        open: false,
        animation: 'blastAndSparkleHotFlash',
        items: [
            { type: 'toggle', id: 'demo-toggle-1', label: '🚀 Future Feature A', checked: false, action: "console.log('Feature A toggled')" },
            { type: 'toggle', id: 'demo-toggle-2', label: '🔮 Future Feature B', checked: false, action: "console.log('Feature B toggled')" }
        ]
    },
    {
        id: 'canvas-controls',
        icon: '🎨',
        title: 'CANVAS CONTROLS',
        open: false,
        animation: 'blastAndSparkleFocus',
        items: [
            { type: 'toggle', id: 'showColsToggle', label: '🏗️ Show Columns', checked: false, action: "CanvasControlsEngine.toggle('showColsToggle', this.checked)" },
            { type: 'toggle', id: 'showDims', label: '📏 Show Dimensions', checked: false, action: "CanvasControlsEngine.toggle('showDims', this.checked)" },
            { type: 'toggle', id: 'showOffsetsToggle', label: '📏 Show Site Offsets', checked: false, action: "CanvasControlsEngine.toggle('showOffsetsToggle', this.checked)" },
            
            { type: 'toggle', id: 'showLabelsToggle', label: '🔠 Show Plot Labels', checked: true, action: "CanvasControlsEngine.toggle('showLabelsToggle', this.checked)" },
            { type: 'toggle', id: 'smartMergeToggle', label: '🧩 Smart-Merge', checked: false, action: "CanvasControlsEngine.toggle('smartMergeToggle', this.checked)" },
            { type: 'toggle', id: 'gridSnapToggle', label: '📐 Snap to 1ft Grid', checked: true, action: "CanvasControlsEngine.toggle('gridSnapToggle', this.checked)" },
            { type: 'toggle', id: 'real3DToggle', label: '🏠 Real3D View', checked: false, action: "CanvasControlsEngine.toggle('real3DToggle', this.checked)" }
        ]
    }
];

// 2. SETTINGS ENGINE
const SettingsEngine = {
    init: function() {
        let overlay = document.getElementById('settings-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'settings-overlay';
            overlay.className = 'glass-panel settings-dropdown';
            
            overlay.innerHTML = `
                <div class="panel-header settings-header">
                    <span class="icon settings-icon-color">⚙️</span>
                    <h2 class="settings-title">SETTINGS</h2>
                </div>
                <div id="settings-content" class="settings-content"></div>
            `;
            
            const btn = document.getElementById('settings-btn');
            if (btn && btn.parentNode) {
                btn.parentNode.appendChild(overlay);
            } else {
                document.body.appendChild(overlay);
            }
        }
        
        this.renderMenu();
    },

    renderMenu: function() {
        const container = document.getElementById('settings-content');
        if (!container) return;

        container.innerHTML = SETTINGS_CONFIG.map(section => {
            const activeClass = section.open ? 'active' : '';
            const gridClass = section.isGrid ? 'btn-grid' : '';
            // 🌟 INJECT THE ANIMATION VARIABLE IF IT EXISTS
            const customAnim = section.animation ? `style="--accordion-anim: ${section.animation};"` : '';
            const itemsHTML = section.items.map(item => {
                if (item.type === 'toggle') {
                    return `
                        <label class="ui-toggle">
                            <span class="settings-label-text">${item.label}</span>
                            <input type="checkbox" id="${item.id}" ${item.checked ? 'checked' : ''} autocomplete="off" onchange="${item.action}">
                            <div class="slider"></div>
                        </label>
                    `;
                } else if (item.type === 'button') {
                    return `<button class="${item.class}" onclick="${item.action}">${item.label}</button>`;
                } else if (item.type === 'buttons') {
                    const btnRow = item.buttons.map(b => `<button class="${b.class}" style="${b.style}" onclick="${b.action}">${b.label}</button>`).join('');
                    return `<div class="flex-row">${btnRow}</div>`;
                }
                return '';
            }).join('');

            return `
                <div class="settings-accordion-wrapper">
                    <button class="settings-accordion-btn ${activeClass}" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('active');">
                        <div class="accordion-title-wrap" style="display: flex; align-items: center; gap: 8px;">
                            <span class="accordion-emoji">${section.icon}</span>
                            <span class="settings-category">${section.title}</span>
                        </div>
                        <span class="settings-chevron">▼</span>
                    </button>                    
                    <div class="settings-accordion-content ${activeClass}">
                        <div class="settings-accordion-inner ${gridClass}" ${customAnim}>
                            ${itemsHTML}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

window.toggleSettings = function() {
    if (typeof toggleOverlayPanel === 'function') {
        toggleOverlayPanel('settings-overlay', 'settings-btn', 'rgba(148, 163, 184, 0.4)', 'rgba(148, 163, 184, 0.15)');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    SettingsEngine.init();
    if (typeof initDOMCache === 'function') {
        initDOMCache();
    }
});