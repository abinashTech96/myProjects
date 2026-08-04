// =========================================
// ⌨️ SHORTCUTS GUIDE ENGINE (cheatsheet.js)
// =========================================

// 🛠️ CONFIGURATION: Add or remove shortcuts here!
const SHORTCUT_CONFIG = [
    {
        category: "GENERAL EDITING",
        color: "#38bdf8", // Cyan
        items: [
            { desc: "Copy / Paste", keys: "Ctrl+C / Ctrl+V" },
            { desc: "Undo Action", keys: "Ctrl+Z" },
            { desc: "Duplicate Room", keys: "Ctrl+D" },
            { desc: "Lock/Unlock", keys: "Ctrl+L" },
            { desc: "Delete Item", keys: "Del / Bksp", overrideColor: "#ef4444" } // Red specifically for delete
        ]
    },
    {
        category: "2D CANVAS CONTROLS",
        color: "#10b981", // Green
        items: [
            { desc: "Pan View", keys: "Hold Space" },
            { desc: "Zoom In / Out", keys: "Mouse Scroll" },
            { desc: "Straight Line Drag", keys: "Shift + Drag" },
            { desc: "Nudge Item", keys: "Arrow Keys" }
        ]
    },
    {
        category: "DRONE MODE (3D)",
        color: "#f59e0b", // Orange
        items: [
            { desc: "Fly / Navigate", keys: "WASD + QE" }
        ]
    }


];

// --- RENDER FUNCTION ---
function renderCheatSheet() {
    const container = document.getElementById('cs-dynamic-content');
    if (!container) return;

    let htmlContent = '';

    SHORTCUT_CONFIG.forEach((section, index) => {
        // 1. Add divider between sections (skip for the first one)
        if (index > 0) {
            htmlContent += `<div class="cs-divider" style="margin: 5px 0;"></div>`;
        }

        // 2. Add Category Label
        const topMargin = index === 0 ? '5px' : '4px';
        htmlContent += `<span class="cs-label" style="color: ${section.color}; margin-top: ${topMargin};">${section.category}</span>`;

        // 3. Loop through and add each shortcut row
        section.items.forEach(item => {
            const keyColor = item.overrideColor ? item.overrideColor : section.color;
            
            htmlContent += `
            <div class="cs-row">
                <span class="cs-desc">${item.desc}</span>
                <span class="cs-shortcut" style="color: ${keyColor};">${item.keys}</span>
            </div>`;
        });
    });

    // Inject into the DOM
    container.innerHTML = htmlContent;
}


// --- PANEL TOGGLE LOGIC ---
window.toggleCheatSheet = function() {
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
};


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Render the dynamic shortcuts on load
    renderCheatSheet();
    
    // 2. Setup widget visibility toggle listeners
    const cheatSheetCb = document.getElementById('toggle-cheatsheet-cb');
    const cheatSheetBtn = document.getElementById('btn-cheat-sheet');
    const cheatSheetPanel = document.getElementById('cheat-sheet-panel');

    if (cheatSheetCb) {
        cheatSheetCb.addEventListener('change', (e) => {
            const isVisible = e.target.checked;
            
            // Hide/Show the floating button
            if (cheatSheetBtn) {
                cheatSheetBtn.style.display = isVisible ? '' : 'none';
            }
            
            // Force close the panel smoothly if the widget is disabled
            if (!isVisible && cheatSheetPanel && cheatSheetPanel.style.display === 'block') {
                cheatSheetPanel.style.opacity = '0';
                cheatSheetPanel.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    cheatSheetPanel.style.display = 'none';
                }, 300);
            }
        });
    }
});