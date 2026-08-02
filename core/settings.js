// =========================================
// ⚙️ SETTINGS MENU LOGIC (core/settings.js)
// =========================================
window.toggleSettings = function() {
    if (typeof toggleOverlayPanel === 'function') {
        toggleOverlayPanel('settings-overlay', 'settings-btn', 'rgba(148, 163, 184, 0.4)', 'rgba(148, 163, 184, 0.15)');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const qcCb = document.getElementById('toggle-qc-cb');
    if (qcCb) {
        qcCb.addEventListener('change', (e) => {
            if (typeof toggleWidget === 'function') toggleWidget('qc-widget-wrapper', e.target.checked);
        });
    }
    // ✨ NEW: Code Inspector Toggle Logic
    const complianceCb = document.getElementById('toggle-compliance-cb');
    if (complianceCb) {
        complianceCb.addEventListener('change', (e) => {
            if (typeof toggleWidget === 'function') toggleWidget('compliance-widget', e.target.checked);
        });
    }

    const vastuCb = document.getElementById('toggle-vastu-cb');
    if (vastuCb) {
        vastuCb.addEventListener('change', (e) => {
            if (typeof toggleWidget === 'function') toggleWidget('vastu-floating-widget', e.target.checked);
        });
    }    
});