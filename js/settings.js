// =========================================
// ⚙️ SETTINGS MENU LOGIC (core/settings.js)
// =========================================

const SETTINGS_CONFIG = [
    {
        id: 'widget-visibility',
        icon: '👁️',
        title: 'WIDGET VISIBILITY',
        open: true,
        items: [
            { type: 'toggle', id: 'toggle-qc-cb', label: '📏 Quick Converter', checked: true, action: "window.toggleWidget('qc-widget-wrapper', this.checked)" },
            { type: 'toggle', id: 'toggle-camera-cb', label: '📷 Camera Controls', checked: true, action: "window.toggleWidget('camera-controls', this.checked)" },
            { type: 'toggle', id: 'toggle-compliance-cb', label: '✅ Code Inspector', checked: true, action: "window.toggleWidget('compliance-widget', this.checked)" },
            // { type: 'toggle', id: 'toggle-vastu-cb', label: '🧭 Vastu Score', checked: true, action: "window.toggleWidget('vastu-floating-widget', this.checked)" },
            { type: 'toggle', id: 'toggle-vastu-cb', label: '🧭 Vastu Score', checked: true, action: "window.toggleWidget('vastu-widget', this.checked)" },
            { type: 'toggle', id: 'toggle-cheatsheet-cb', label: '⌨️ Shortcuts Guide', checked: true, action: "if(typeof toggleCheatSheet === 'function') { const btn = document.getElementById('btn-cheat-sheet'); if(btn) btn.style.display = this.checked ? '' : 'none'; }" }
        ]
    },
    {
        id: 'data-controls',
        icon: '💾',
        title: 'DATA CONTROLS',
        open: false,
        isGrid: true, // Uses btn-grid class
        items: [
            { type: 'buttons', buttons: [
                { label: '💾 Save', action: 'exportJSON()', class: 'sidebar-btn secondary', style: 'flex:1; padding: 5px;' },
                { label: '📂 Load', action: "document.getElementById('importFile').click()", class: 'sidebar-btn secondary', style: 'flex:1; padding: 5px;' }
            ]},
            { type: 'button', label: '⚠️ FACTORY RESET', action: 'resetWorkspace()', class: 'sidebar-btn secondary danger-override' }
        ]
    },
    {
        id: 'toolbar-controls',
        icon: '🛠️',
        title: 'TOOLBAR TOOLS',
        open: false,
        items: [
            { type: 'toggle', id: 'toggle-project-info-cb', label: 'ℹ️ Project Info', checked: true, action: "toggleNavTool('project-info-btn', this.checked)" },
            { type: 'toggle', id: 'toggle-auto-builder-cb', label: '✨ Auto-Builder', checked: true, action: "toggleNavTool('auto-builder-btn', this.checked)" },
            { type: 'toggle', id: 'toggle-ai-agent-cb', label: '🤖 AI Agent', checked: true, action: "toggleNavTool('ai-agent-btn', this.checked)" }
        ]
    }
];

window.initSettingsMenu = function() {
    const container = document.getElementById('settings-content');
    if (!container) return;

    container.innerHTML = SETTINGS_CONFIG.map(section => {
        const activeClass = section.open ? 'active' : '';
        const gridClass = section.isGrid ? 'btn-grid' : '';

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
                    <div class="accordion-title-wrap">
                        <span class="accordion-emoji">${section.icon}</span>
                        <span class="settings-category">${section.title}</span>
                    </div>
                    <span class="settings-chevron">▼</span>
                </button>                    
                <div class="settings-accordion-content ${activeClass}">
                    <div class="settings-accordion-inner ${gridClass}">
                        ${itemsHTML}
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

window.toggleSettings = function() {
    if (typeof toggleOverlayPanel === 'function') {
        toggleOverlayPanel('settings-overlay', 'settings-btn', 'rgba(148, 163, 184, 0.4)', 'rgba(148, 163, 184, 0.15)');
    }
};

// Auto-initialize when the script loads
document.addEventListener('DOMContentLoaded', () => {
    initSettingsMenu();
});