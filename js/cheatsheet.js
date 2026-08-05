// =========================================
// ⌨️ SHORTCUTS GUIDE ENGINE (cheatsheet.js)
// Single-File Component (CSS + JS + HTML)
// =========================================

// 1. INJECT MODULE-SPECIFIC CSS
const cheatSheetStyles = `
    .cs-action-btn {
        position: fixed; bottom: 5px; left: 5px; z-index: 1000;
        background: #1e293b; color: #f8fafc; border: 0.2px solid #95daf8;
        width: 36px; height: 36px; border-radius: 18px; padding: 0;
        overflow: hidden; display: flex; align-items: center; justify-content: flex-start;
        cursor: pointer; font-family: 'Segoe UI', system-ui, sans-serif;
        font-weight: 600; font-size: 0.9rem; white-space: nowrap;
        box-shadow: 6px 6px 12px #151d2a, -6px -6px 12px #27354c;
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
    }
    .cs-action-btn .cs-icon { font-size: 1.1rem; min-width: 36px; display: flex; justify-content: center; align-items: center; }
    .cs-action-btn .cs-text { opacity: 0; padding-right: 16px; transition: opacity 0.2s ease; }
    .cs-action-btn:hover { width: 160px; transform: translateY(-2px); box-shadow: 8px 8px 16px #151d2a, -8px -8px 16px #27354c; color: #38bdf8; }
    .cs-action-btn:hover .cs-text { opacity: 1; transition-delay: 0.1s; }
    .cs-action-btn:active { transform: translateY(1px); box-shadow: inset 4px 4px 8px #151d2a, inset -4px -4px 8px #27354c; }
    
    @media (max-width: 1024px) { #btn-cheat-sheet, #cheat-sheet-panel { display: none !important; } }
    
    .cs-panel {
        position: fixed; bottom: 60px; left: 20px; z-index: 1000;
        width: 250px; background: #1e293b; border-radius: 12px; padding: 12px 14px;
        box-shadow: 6px 6px 12px #151d2a, -6px -6px 12px #27354c;
        color: #e2e8f0; font-family: 'Segoe UI', system-ui, sans-serif;
        display: none; opacity: 0; transform: translateY(15px);
        transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .cs-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .cs-panel-header h2 { font-size: 0.8rem; margin: 0; font-weight: 700; letter-spacing: 0.5px; color: #f8fafc; }
    
    .cs-minimize-btn {
        background: #1e293b; color: #94a3b8; border: none; width: 24px; height: 24px;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        cursor: pointer; font-size: 10px; box-shadow: 3px 3px 6px #151d2a, -3px -3px 6px #27354c;
        transition: all 0.2s ease-in-out;
    }
    .cs-minimize-btn:hover { color: #ef4444; transform: rotate(90deg) scale(1.1); }
    .cs-minimize-btn:active { box-shadow: inset 2px 2px 4px #151d2a, inset -2px -2px 4px #27354c; transform: rotate(90deg) scale(0.95); }
    
    .cs-divider { height: 1px; background: #1e293b; box-shadow: inset 1px 1px 1px #151d2a, inset -1px -1px 1px #27354c; margin: 8px 0; border-radius: 1px; }
    
    .cs-scroll { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; padding-right: 8px; padding-bottom: 2px; }
    .cs-scroll::-webkit-scrollbar { width: 4px; }
    .cs-scroll::-webkit-scrollbar-track { background: #161e2b; border-radius: 4px; }
    .cs-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    .cs-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
    
    .cs-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 4px; margin-bottom: 0px; display: block; opacity: 0.9; }
    .cs-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #1e293b; border-radius: 6px; box-shadow: 2px 2px 4px #151d2a, -2px -2px 4px #27354c; transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .cs-row:hover { transform: translateY(-1px); box-shadow: 3px 3px 6px #151d2a, -3px -3px 6px #27354c; }
    .cs-desc { color: #cbd5e1; font-size: 0.75rem; font-weight: 500; }
    .cs-shortcut { font-family: 'Courier New', Courier, monospace; font-size: 0.65rem; font-weight: bold; background: #0f172a; padding: 3px 6px; border-radius: 4px; box-shadow: inset 1px 1px 3px #080c16, inset -1px -1px 3px #16223e; }
`;

document.head.insertAdjacentHTML("beforeend", `<style>${cheatSheetStyles}</style>`);

// 2. SHORTCUT CONFIGURATION
const SHORTCUT_CONFIG = [
    {
        category: "GENERAL EDITING",
        color: "#38bdf8",
        items: [
            { desc: "Copy / Paste", keys: "Ctrl+C / Ctrl+V" },
            { desc: "Undo Action", keys: "Ctrl+Z" },
            { desc: "Duplicate Room", keys: "Ctrl+D" },
            { desc: "Lock/Unlock", keys: "Ctrl+L" },
            { desc: "Delete Item", keys: "Del / Bksp", overrideColor: "#ef4444" }
        ]
    },
    {
        category: "2D CANVAS CONTROLS",
        color: "#10b981",
        items: [
            { desc: "Pan View", keys: "Hold Space" },
            { desc: "Zoom In / Out", keys: "Mouse Scroll" },
            { desc: "Straight Line Drag", keys: "Shift + Drag" },
            { desc: "Nudge Item", keys: "Arrow Keys" }
        ]
    },
    {
        category: "DRONE MODE (3D)",
        color: "#f59e0b",
        items: [
            { desc: "Fly / Navigate", keys: "WASD + QE" }
        ]
    }
];

// 3. ENGINE LOGIC
const CheatSheetEngine = {
    // Set to true to strictly require <div id="cheatsheet-widget"></div> in index.html
    REQUIRE_HTML_CONTAINER: true,

    init: function() {
        let widget = document.getElementById('cheatsheet-widget');
        
        if (!widget) {
            if (this.REQUIRE_HTML_CONTAINER) return;
            widget = document.createElement('div');
            widget.id = 'cheatsheet-widget';
            document.body.appendChild(widget);
        }

        // Inject the HTML structure into the anchor div
        widget.innerHTML = `
            <button id="btn-cheat-sheet" class="cs-action-btn" onclick="toggleCheatSheet()">
                <span class="cs-icon">⌨️</span>
                <span class="cs-text">Shortcuts Guide</span>
            </button>
            <div id="cheat-sheet-panel" class="cs-panel">
                <div class="cs-panel-header">
                    <h2>⌨️ KEYBOARD SHORTCUTS</h2>
                    <button class="cs-minimize-btn" onclick="toggleCheatSheet()">✕</button>
                </div>
                <div class="cs-divider"></div>
                <div id="cs-dynamic-content" class="cs-scroll"></div>
            </div>
        `;

        this.render(document.getElementById('cs-dynamic-content'));
        this.setupListeners();
    },

    render: function(container) {
        if (!container) return;
        let htmlContent = '';

        SHORTCUT_CONFIG.forEach((section, index) => {
            if (index > 0) {
                htmlContent += `<div class="cs-divider" style="margin: 5px 0;"></div>`;
            }
            const topMargin = index === 0 ? '5px' : '4px';
            htmlContent += `<span class="cs-label" style="color: ${section.color}; margin-top: ${topMargin};">${section.category}</span>`;

            section.items.forEach(item => {
                const keyColor = item.overrideColor ? item.overrideColor : section.color;
                htmlContent += `
                <div class="cs-row">
                    <span class="cs-desc">${item.desc}</span>
                    <span class="cs-shortcut" style="color: ${keyColor};">${item.keys}</span>
                </div>`;
            });
        });

        container.innerHTML = htmlContent;
    },

    toggle: function() {
        const panel = document.getElementById('cheat-sheet-panel');
        if (!panel) return;
        
        if (panel.style.display === 'none' || panel.style.display === '') {
            panel.style.display = 'block';
            setTimeout(() => {
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
            }, 10);
        } else {
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(10px)';
            setTimeout(() => {
                panel.style.display = 'none';
            }, 300);
        }
    },

    setupListeners: function() {
        const cheatSheetCb = document.getElementById('toggle-cheatsheet-cb');
        const cheatSheetBtn = document.getElementById('btn-cheat-sheet');
        const cheatSheetPanel = document.getElementById('cheat-sheet-panel');

        if (cheatSheetCb) {
            cheatSheetCb.addEventListener('change', (e) => {
                const isVisible = e.target.checked;
                if (cheatSheetBtn) cheatSheetBtn.style.display = isVisible ? '' : 'none';
                
                if (!isVisible && cheatSheetPanel && cheatSheetPanel.style.display === 'block') {
                    cheatSheetPanel.style.opacity = '0';
                    cheatSheetPanel.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        cheatSheetPanel.style.display = 'none';
                    }, 300);
                }
            });
        }
    }
};

// 4. GLOBAL BRIDGE & INITIALIZATION
window.toggleCheatSheet = () => CheatSheetEngine.toggle();

document.addEventListener('DOMContentLoaded', () => {
    CheatSheetEngine.init();
});