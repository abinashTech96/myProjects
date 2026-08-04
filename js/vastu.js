// ==========================================
// ✅ VASTU SHASTRA COMPLIANCE ENGINE (vastu.js)
// Single-File Component (CSS + JS)
// ==========================================

// 1. INJECT MODULE-SPECIFIC CSS
const vastuStyles = `
    /* --- Vastu Widget Container --- */
    #vastu-widget {
        position: absolute; 
        bottom: 20px; /* Kept at the bottom left for UI consistency */
        left: 20px; 
        z-index: 100;
        width: 280px; 
        max-height: 400px; 
        padding: 15px; 
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.85); 
        backdrop-filter: blur(12px); 
        border: 1px solid rgba(255, 255, 255, 0.05); 
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); 
        pointer-events: auto;
        overflow: hidden;
        transition: width 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55),
                    max-height 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55),
                    padding 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55),
                    border-radius 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    /* --- Minimized Pill State --- */
    #vastu-widget.minimized {
        width: 100px;
        max-height: 45px;
        padding: 10px 16px;
        border-radius: 25px;
        cursor: pointer;
    }

    #vastu-widget.minimized:hover {
        transform: scale(1.05);
        background: rgba(15, 23, 42, 0.95);
        transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    /* --- View Toggling --- */
    .vastu-max-view { 
        display: block; 
        opacity: 1;
        transition: opacity 0.3s ease;
    }

    .vastu-min-view { 
        display: flex; 
        align-items: center; 
        justify-content: center;
        gap: 8px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.5);
        opacity: 0;
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
        white-space: nowrap;
    }

    #vastu-widget.minimized .vastu-max-view { 
        opacity: 0; 
        pointer-events: none;
    }

    #vastu-widget.minimized .vastu-min-view { 
        opacity: 1; 
        transform: translate(-50%, -50%) scale(1);
        pointer-events: auto;
    }

    /* --- Internal Elements & Layout --- */
    .vastu-header { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        margin-bottom: 12px; 
        border-bottom: 1px solid rgba(255, 255, 255, 0.1); 
        padding-bottom: 10px; 
    }

    .vastu-title { 
        font-size: 0.75rem; 
        color: #cbd5e1; 
        font-weight: bold; 
        letter-spacing: 0.5px; 
    }

    .vastu-score-wrapper {
        display: flex; 
        align-items: center;
        gap: 8px;
    }

    .vastu-close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 1.4rem;
        line-height: 0.5;
        padding: 0 0 0 10px;
        transition: color 0.2s, transform 0.2s;
    }

    .vastu-close-btn:hover {
        color: #f8fafc;
        transform: scale(1.2);
    }

    .vastu-warnings-container {
        max-height: 180px; 
        overflow-y: auto; 
        padding-right: 4px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    /* --- Typography & Dynamic Colors --- */
    .vastu-icon {
        font-size: 1.1rem;
    }

    .vastu-score { 
        font-family: monospace; 
        font-weight: bold; 
        background: rgba(0, 0, 0, 0.4); 
        padding: 2px 8px; 
        border-radius: 10px; 
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5); 
    }

    .vastu-score-min {
        font-family: monospace; 
        font-weight: bold; 
        font-size: 0.85rem;
    }

    .vastu-green { color: #10b981; }
    .vastu-yellow { color: #f59e0b; }
    .vastu-red { color: #ef4444; }

    /* --- Feedback Messages --- */
    .vastu-warning { 
        font-size: 0.65rem; 
        color: #fca5a5; 
        background: rgba(239, 68, 68, 0.1); 
        padding: 6px; 
        border-radius: 6px; 
        border-left: 3px solid #ef4444; 
    }

    .vastu-success { 
        font-size: 0.7rem; 
        color: #a7f3d0; 
        background: rgba(16, 185, 129, 0.1); 
        padding: 8px; 
        border-radius: 6px; 
        text-align: center; 
    }
`;

// Inject CSS automatically on load
document.head.insertAdjacentHTML("beforeend", `<style>${vastuStyles}</style>`);


// ==========================================
// 2. ENGINE LOGIC & CONTROLLER
// ==========================================
const VastuEngine = {
    
    // Core compass mathematics[cite: 4]
    getDynamicZone: function(cx, cy, plotW, plotH, topDirection) {
        const centerX = plotW / 2;
        const centerY = plotH / 2;
        
        if (Math.abs(cx - centerX) < (plotW * 0.1) && Math.abs(cy - centerY) < (plotH * 0.1)) {
            return "CENTER";
        }
        
        let angle = Math.atan2(cy - centerY, cx - centerX) * (180 / Math.PI);
        if (angle < 0) angle += 360;

        let offset = 0;
        switch (topDirection) {
            case 'North': offset = 270; break;
            case 'East':  offset = 0; break;
            case 'South': offset = 90; break;
            case 'West':  offset = 180; break;
            default:      offset = 180; break;
        }
        
        let normalizedAngle = (angle - offset + 360) % 360;
        const zones = ["E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW", "N", "NNE", "NE", "ENE"];
        const index = Math.floor(((normalizedAngle + 11.25) % 360) / 22.5);
        return zones[index];
    },

    calculate: function(elements) {
        let score = 0;
        let warnings = [];
        
        if (!elements || elements.length === 0) {
            return { score: 0, warnings: [], text: "Add rooms to calculate Vastu." };
        }

        score = 50; // Neutral base score[cite: 4]
        const inW = parseFloat(document.getElementById('inW')?.value || 272);
        const inH = parseFloat(document.getElementById('inH')?.value || 400);
        const compassDir = document.getElementById('compassDir')?.value || 'West';

        elements.forEach(el => {
            // Vastu is evaluated on Ground Floor[cite: 4]
            if (el.isFurniture || el.floor > 0) return; 
            
            const cx = el.x + (el.w / 2);
            const cy = el.y + (el.h / 2);
            let zoneStr = this.getDynamicZone(cx, cy, inW, inH, compassDir);
            
            // Dynamic Zoning Logic[cite: 4]
            if (el.type === 'kitchen') {
                if (zoneStr === "SE") { score += 20; warnings.push("✅ Kitchen perfectly in SE (+20)"); }
                else if (zoneStr === "NW") { score += 10; warnings.push("✅ Kitchen acceptable in NW (+10)"); }
                else { score -= 15; warnings.push(`⚠️ Kitchen in ${zoneStr} (Should be SE) (-15)`); }
            }
            if (el.type === 'puja') {
                if (zoneStr === "NE") { score += 20; warnings.push("✅ Puja perfectly in NE (+20)"); }
                else { score -= 10; warnings.push(`⚠️ Puja in ${zoneStr} (Should be NE) (-10)`); }
            }
            if (el.type === 'bedroom') {
                if (zoneStr === "SW") { score += 15; warnings.push("✅ Master Bed perfectly in SW (+15)"); }
            }
            if (el.type === 'toilet') {
                if (zoneStr === "NE" || zoneStr === "SW") { score -= 25; warnings.push(`⚠️ Toilet prohibited in ${zoneStr} (-25)`); }
                else { score += 10; }
            }
        });
        
        score = Math.max(0, Math.min(100, score));
        return { score, warnings, text: warnings.length > 0 ? warnings[0] : "Good overall spatial flow." };
    },

    toggleUI: function() {
        const widget = document.getElementById('vastu-widget');
        if (widget) widget.classList.toggle('minimized');
    },

    renderUI: function(elementsData) {
        const data = this.calculate(elementsData);
        let widget = document.getElementById('vastu-widget');
        
        // Initialize widget container if it doesn't exist
        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'vastu-widget';
            // Defaults to minimized so it doesn't crowd the screen immediately
            widget.className = 'minimized';
            const canvasWrapper = document.getElementById('canvas-wrapper');
            (canvasWrapper || document.body).appendChild(widget);
        }

        // Determine Color based on score[cite: 4]
        let colorClass = 'vastu-green';
        if (data.score < 40) { colorClass = 'vastu-red'; } 
        else if (data.score < 70) { colorClass = 'vastu-yellow'; }  

        widget.innerHTML = `
            <!-- MAXIMIZED VIEW -->
            <div class="vastu-max-view">
                <div class="vastu-header">
                    <span class="vastu-title">🧭 VASTU SCORE</span>
                    <div class="vastu-score-wrapper">
                        <span class="vastu-score ${colorClass}">${data.score}/100</span>
                        <button class="vastu-close-btn" title="Minimize">&times;</button>
                    </div>
                </div>
                <div class="explorer-scroll vastu-warnings-container"></div>
            </div>

            <!-- MINIMIZED VIEW -->
            <div class="vastu-min-view" title="Expand Vastu Inspector">
                <span class="vastu-icon">🧭</span>
                <span class="vastu-score-min ${colorClass}">${data.score}%</span>
            </div>
        `;

        const warningsContainer = widget.querySelector('.vastu-warnings-container');
        
        if (data.score === 0 && data.warnings.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'vastu-success';
            emptyEl.style.color = '#94a3b8';
            emptyEl.style.background = 'rgba(255,255,255,0.05)';
            emptyEl.textContent = data.text;
            warningsContainer.appendChild(emptyEl);
        } else if (data.warnings.length > 0) {
            data.warnings.forEach(w => {
                const warnEl = document.createElement('div');
                warnEl.className = w.includes('✅') ? 'vastu-success' : 'vastu-warning';
                warnEl.textContent = w;
                warningsContainer.appendChild(warnEl);
            });
        } else {
            const successEl = document.createElement('div');
            successEl.className = 'vastu-success';
            successEl.textContent = data.text;
            warningsContainer.appendChild(successEl);
        }

        // Re-attach event listeners
        widget.querySelector('.vastu-close-btn').addEventListener('click', (e) => {
            e.stopPropagation(); 
            this.toggleUI();
        });
        widget.querySelector('.vastu-min-view').addEventListener('click', () => this.toggleUI());
    }
};

// ==========================================
// 3. GLOBAL COMPATIBILITY HOOKS
// ==========================================
window.calculateVastuScore = () => {
    // Allows other parts of the app to trigger a re-render using the global 'elements' array
    if (typeof elements !== 'undefined') {
        VastuEngine.renderUI(elements);
    }
};
window.toggleVastuWidget = () => VastuEngine.toggleUI();

// Attach toggle logic to the Settings Dropdown Checkbox[cite: 4]
document.addEventListener('DOMContentLoaded', () => {
    const vastuCb = document.getElementById('toggle-vastu-cb');
    if (vastuCb) {
        vastuCb.addEventListener('change', (e) => {
            const widget = document.getElementById('vastu-widget');
            if (widget) {
                widget.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    }    
});