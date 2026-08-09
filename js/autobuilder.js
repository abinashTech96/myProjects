// =========================================
// ✨ AUTO-BUILDER ENGINE (autobuilder.js)
// =========================================

const AutoBuilderEngine = {
    init: function() {
        if (document.getElementById('autobuilder-modal-container')) return;

        const modalContainer = document.createElement('div');
        modalContainer.id = 'autobuilder-modal-container';
        
        modalContainer.innerHTML = `
            <div id="autobuilder-backdrop" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15, 23, 42, 0.75); backdrop-filter:blur(8px); z-index:99998; display:none; opacity:0; transition:opacity 0.3s ease;" onclick="toggleAutoBuilder()"></div>
            <div id="autobuilder-modal" class="glass-panel" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%) scale(0.9); width:350px; z-index:99999; display:none; opacity:0; transition:all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
                <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(245, 158, 11, 0.3); padding-bottom: 10px; margin-bottom: 15px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="icon">✨</span><h2 style="margin:0; color:#f59e0b; font-size:1.1rem; letter-spacing:1px;">AUTO-BUILDER</h2>
                    </div>
                    <button onclick="toggleAutoBuilder()" style="background:transparent; border:none; color:#94a3b8; font-size:1.4rem; cursor:pointer;">&times;</button>
                </div>
                <div class="glass-field" style="display:flex; justify-content:space-between; align-items:center;">
                    <label style="color:#cbd5e1; font-weight:bold; font-size:0.8rem;">Total Floors:</label>
                    <input type="number" id="b-floors" class="neo-sunken" style="width:60px; text-align:center; padding:6px; font-weight:bold;" value="1" min="1" max="10" oninput="renderFloorSelectors()">
                </div>
                <div id="floor-layout-selectors" class="layout-selectors" style="margin-top:15px; max-height:250px; overflow-y:auto; padding-right:5px; display:flex; flex-direction:column; gap:10px;"></div>
                <button class="btn-generate" style="width:100%; margin-top:20px; background:linear-gradient(135deg, #f59e0b, #ea580c); color:white; padding:12px; border-radius:8px; border:none; font-weight:bold; cursor:pointer; box-shadow:0 4px 15px rgba(234,88,12,0.4);" onclick="generateBuilding(); toggleAutoBuilder();">
                    <span class="btn-icon">🏗️</span> <span class="btn-text">GENERATE BUILDING</span>
                </button>
            </div>
        `;
        document.body.appendChild(modalContainer);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AutoBuilderEngine.init();
});

document.addEventListener('DOMContentLoaded', () => {
    AutoBuilderEngine.init();
});