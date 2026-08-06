// =========================================
// ℹ️ PROJECT INFO ENGINE (projectinfo.js)
// =========================================

const ProjectInfoEngine = {
    init: function() {
        let overlay = document.getElementById('project-info-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'project-info-overlay';
            overlay.className = 'glass-panel nav-dropdown-panel offset-right';
            
            overlay.innerHTML = `
                <div class="panel-header drop-header-blue">
                    <span class="icon">ℹ️</span>
                    <h2>PROJECT DETAILS</h2>
                </div>
                
                <div class="nav-stats-hud transparent-hud">
                    <div class="hud-stat stat-row">
                        <span class="hud-label">PLOT AREA</span> 
                        <span id="plot-area" class="hud-value blue">0 sq ft</span>
                    </div>
                    <div class="hud-stat stat-row">
                        <span class="hud-label">BUILD AREA</span> 
                        <span id="build-area" class="hud-value green">0 sq ft</span>
                    </div>
                    <div class="hud-stat stat-row no-border">
                        <span class="hud-label">TOTAL BUILT-UP</span> 
                        <span id="total-built-area" class="hud-value purple">0 sq ft</span>
                    </div>
                </div>
            `;
            
            const btn = document.getElementById('project-info-btn');
            if (btn && btn.parentNode) {
                btn.parentNode.appendChild(overlay);
            } else {
                document.body.appendChild(overlay);
            }
        }
    },

    updateAreas: function(plot, build, total) {
        const plotEl = document.getElementById('plot-area');
        const buildEl = document.getElementById('build-area');
        const totalEl = document.getElementById('total-built-area');

        if (plotEl) plotEl.innerText = (plot || 0) + ' sq ft';
        if (buildEl) buildEl.innerText = (build || 0) + ' sq ft';
        if (totalEl) totalEl.innerText = (total || 0) + ' sq ft';
    },

    // ✨ NEW: Extracted Math Logic!
    refreshStats: function(geom) {
        if (!geom) return;
        const { SCALE, inW, inH, A, B, C, D } = geom;

        // 1. Calculate Plot Area
        let plotAreaSqFt = 0;
        if (typeof getPolygonArea === 'function') {
            plotAreaSqFt = getPolygonArea([A, B, C, D]) / (SCALE * SCALE) / 144;
        }

        // 2. Calculate Build Footprint Area
        const buildAreaSqFt = (inW * inH / (SCALE * SCALE) / 144);

        // 3. Calculate Total Built-Up Area (Iterates through global elements array)
        let totalBuiltUpArea = 0;
        if (typeof elements !== 'undefined') {
            elements.forEach(el => {
                // Ignore furniture and staircases in the total floor area
                if (el.isFurniture || el.type === 'staircase') return;
                totalBuiltUpArea += (el.w * el.h) / 144;
            });
        }

        // 4. Update the UI
        this.updateAreas(
            plotAreaSqFt.toFixed(2),
            buildAreaSqFt.toFixed(2),
            totalBuiltUpArea.toFixed(1)
        );
    }
};

// --- GLOBAL BRIDGE ---
window.refreshProjectStatsUI = function(geom) {
    ProjectInfoEngine.refreshStats(geom);
};

document.addEventListener('DOMContentLoaded', () => {
    ProjectInfoEngine.init();
});