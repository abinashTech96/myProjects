// =========================================
// ✨ AUTO-BUILDER ENGINE (autobuilder.js)
// =========================================

const AutoBuilderEngine = {
    init: function() {
        let overlay = document.getElementById('template-builder-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'template-builder-overlay';
            overlay.className = 'glass-panel nav-dropdown-panel width-sm';
            
            overlay.innerHTML = `
                <div class="panel-header"><span class="icon">✨</span><h2>AUTO-BUILDER</h2></div>
                <div class="glass-field">
                    <label>Total Floors:</label>
                    <div class="number-input-wrapper">
                        <input type="number" id="b-floors" value="1" min="1" max="10" oninput="renderFloorSelectors()">
                    </div>
                </div>
                <div id="floor-layout-selectors" class="layout-selectors"></div>
                <button class="btn-generate" onclick="generateBuilding()">
                    <span class="btn-icon">🏗️</span><span class="btn-text">GENERATE BUILDING</span>
                </button>
            `;
            
            const btn = document.getElementById('auto-builder-btn');
            if (btn && btn.parentNode) {
                btn.parentNode.appendChild(overlay);
            } else {
                document.body.appendChild(overlay);
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AutoBuilderEngine.init();
});