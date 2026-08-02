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