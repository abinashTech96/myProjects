// =========================================
// ⌨️ SHORTCUTS GUIDE ENGINE (cheatsheet.js)
// =========================================

window.toggleCheatSheet = function() {
    const panel = document.getElementById('cheat-sheet-panel');
    if (!panel) return;
    
    // Check if hidden or empty string (initial state before inline styles)
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

// =========================================
// WIDGET VISIBILITY TOGGLE LISTENER
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    const cheatSheetCb = document.getElementById('toggle-cheatsheet-cb');
    const cheatSheetBtn = document.getElementById('btn-cheat-sheet');
    const cheatSheetPanel = document.getElementById('cheat-sheet-panel');

    if (cheatSheetCb) {
        cheatSheetCb.addEventListener('change', (e) => {
            const isVisible = e.target.checked;
            
            // 1. Hide/Show the floating button
            if (cheatSheetBtn) {
                cheatSheetBtn.style.display = isVisible ? '' : 'none';
            }
            
            // 2. Force close the panel smoothly if the user turns the widget off while it's open
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