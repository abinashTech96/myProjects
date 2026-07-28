// =========================================
// ⚙️ SETTINGS MENU LOGIC (core/settings.js)
// =========================================

// 1. Global Toggle Function (Wired directly to the HTML button)
window.toggleSettings = function() {
    if (typeof toggleOverlayPanel === 'function') {
        toggleOverlayPanel('settings-overlay', 'settings-btn', 'rgba(148, 163, 184, 0.4)', 'rgba(148, 163, 184, 0.15)');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    
    // 2. Settings Accordion Toggle Logic
    const widgetAccBtn = document.getElementById('btn-widget-visibility');
    if (widgetAccBtn) {
        widgetAccBtn.addEventListener('click', () => {
            widgetAccBtn.classList.toggle('active');
            const content = document.getElementById('content-widget-visibility');
            if (content) {
                content.classList.toggle('active');
            }
        });
    }

    // 3. Control Panel Display Toggle
    const sidebarCb = document.getElementById('toggle-sidebar-cb');
    if (sidebarCb) {
        sidebarCb.addEventListener('change', (e) => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.style.display = e.target.checked ? '' : 'none';
        });
    }

    // 4. Quick Converter Display Toggle
    const qcCb = document.getElementById('toggle-qc-cb');
    if (qcCb) {
        qcCb.addEventListener('change', (e) => {
            if (typeof toggleWidget === 'function') toggleWidget('qc-widget-wrapper', e.target.checked);
        });
    }

    // 5. Vastu Score Display Toggle
    const vastuCb = document.getElementById('toggle-vastu-cb');
    if (vastuCb) {
        vastuCb.addEventListener('change', (e) => {
            if (typeof toggleWidget === 'function') toggleWidget('vastu-floating-widget', e.target.checked);
        });
    }

    // 6. Data Controls Accordion Toggle Logic
    const dataAccBtn = document.getElementById('btn-data-controls');
    if (dataAccBtn) {
        dataAccBtn.addEventListener('click', () => {
            dataAccBtn.classList.toggle('active');
            const content = document.getElementById('content-data-controls');
            if (content) {
                content.classList.toggle('active');
            }
        });
    }
    
});