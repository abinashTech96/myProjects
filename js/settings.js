// =========================================
// ⚙️ SETTINGS MENU LOGIC (core/settings.js)
// =========================================
window.toggleSettings = function() {
    if (typeof toggleOverlayPanel === 'function') {
        toggleOverlayPanel('settings-overlay', 'settings-btn', 'rgba(148, 163, 184, 0.4)', 'rgba(148, 163, 184, 0.15)');
    }
};