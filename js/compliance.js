// ==========================================
// ✅ BUILDING CODE & COMPLIANCE ENGINE (compliance.js)
// Single-File Component (CSS + JS)
// ==========================================

// 1. INJECT MODULE-SPECIFIC CSS
const complianceStyles = `
    /* --- Code Inspector Dashboard Container --- */
    #compliance-widget {
        position: absolute; 
        top: 190px;
        left: 24px; 
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
    #compliance-widget.minimized {
        width: 100px;
        max-height: 45px;
        padding: 10px 16px;
        border-radius: 25px;
        cursor: pointer;
    }

    #compliance-widget.minimized:hover {
        transform: scale(1.05);
        background: rgba(15, 23, 42, 0.95);
        transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    /* --- View Toggling --- */
    .compliance-max-view { 
        display: block; 
        opacity: 1;
        transition: opacity 0.3s ease;
    }

    .compliance-min-view { 
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

    #compliance-widget.minimized .compliance-max-view { 
        opacity: 0; 
        pointer-events: none;
    }

    #compliance-widget.minimized .compliance-min-view { 
        opacity: 1; 
        transform: translate(-50%, -50%) scale(1);
        pointer-events: auto;
    }

    /* --- Internal Elements & Layout --- */
    .compliance-header { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        margin-bottom: 12px; 
        border-bottom: 1px solid rgba(255, 255, 255, 0.1); 
        padding-bottom: 10px; 
    }

    .compliance-title { 
        font-size: 0.75rem; 
        color: #cbd5e1; 
        font-weight: bold; 
        letter-spacing: 0.5px; 
    }

    .compliance-score-wrapper {
        display: flex; 
        align-items: center;
    }

    .compliance-close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 1.4rem;
        line-height: 0.5;
        padding: 0 0 0 10px;
        transition: color 0.2s, transform 0.2s;
    }

    .compliance-close-btn:hover {
        color: #f8fafc;
        transform: scale(1.2);
    }

    .compliance-warnings-container {
        max-height: 180px; 
        overflow-y: auto; 
        padding-right: 4px;
    }

    /* --- Typography & Dynamic Colors --- */
    .compliance-icon {
        font-size: 1.1rem;
    }

    .compliance-score { 
        font-family: monospace; 
        font-weight: bold; 
        background: rgba(0, 0, 0, 0.4); 
        padding: 2px 8px; 
        border-radius: 10px; 
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5); 
    }

    .compliance-score-min {
        font-family: monospace; 
        font-weight: bold; 
        font-size: 0.85rem;
    }

    .compliance-green { color: #10b981; }
    .compliance-yellow { color: #f59e0b; }
    .compliance-red { color: #ef4444; }

    /* --- Feedback Messages --- */
    .compliance-warning { 
        font-size: 0.65rem; 
        color: #fca5a5; 
        background: rgba(239, 68, 68, 0.1); 
        padding: 6px; 
        border-radius: 6px; 
        margin-bottom: 6px; 
        border-left: 3px solid #ef4444; 
        pointer-events: auto; 
    }

    .compliance-success { 
        font-size: 0.7rem; 
        color: #a7f3d0; 
        background: rgba(16, 185, 129, 0.1); 
        padding: 8px; 
        border-radius: 6px; 
        text-align: center; 
    }
`;

// Automatically inject styles into document head
document.head.insertAdjacentHTML("beforeend", `<style>${complianceStyles}</style>`);


// 2. ENGINE LOGIC & CONTROLLER
const ComplianceEngine = {
    REQUIRE_HTML_CONTAINER: true,
    RULES: {
        bedroom: { minAreaSqft: 70, minDimInches: 84, requiresEgress: true }, // 84 inches = 7'0"
        living: { minAreaSqft: 120, minDimInches: 84, requiresEgress: true },
        toilet: { minAreaSqft: 15, minDimInches: 0, requiresEgress: false },
        kitchen: { minAreaSqft: 0, minDimInches: 0, requiresEgress: true }
    },

    SQ_INCHES_TO_SQFT: 144,

    calculate: function(elements, fixtures) {
        let warnings = [];
        let passed = 0;
        let totalChecks = 0;

        elements.forEach((el, index) => {
            if (el.isFurniture || el.type === 'staircase' || el.type === 'balcony') return;
            
            const sqft = (el.w * el.h) / this.SQ_INCHES_TO_SQFT;
            const name = el.customName || el.type.toUpperCase();
            const rules = this.RULES[el.type];

            if (!rules) return;

            // 1. Minimum Area Check
            if (rules.minAreaSqft > 0) {
                totalChecks++;
                if (sqft < rules.minAreaSqft) {
                    warnings.push(`[${name}] Area is ${sqft.toFixed(1)} sqft (Min required: ${rules.minAreaSqft} sqft)`);
                } else { 
                    passed++; 
                }
            }
            
            // 2. Minimum Dimension Check
            if (rules.minDimInches > 0) {
                totalChecks++;
                if (el.w < rules.minDimInches || el.h < rules.minDimInches) {
                    const minFeet = rules.minDimInches / 12;
                    warnings.push(`[${name}] Width or depth is too narrow. Minimum ${minFeet}'0" required.`);
                } else { 
                    passed++; 
                }
            }
            
            // 3. Egress & Ventilation Check
            if (rules.requiresEgress && fixtures) {
                totalChecks++;
                const roomFixtures = fixtures.filter(f => f.roomId === index);
                const hasEgress = roomFixtures.some(f => f.type === 'window' || f.type === 'door');
                if (!hasEgress) {
                    warnings.push(`[${name}] Missing egress/ventilation. Add a door or window.`);
                } else { 
                    passed++; 
                }
            }
        });

        const score = totalChecks > 0 ? Math.round((passed / totalChecks) * 100) : 100;
        return { score, warnings, totalChecks, passed };
    },

    toggleUI: function() {
        const widget = document.getElementById('compliance-widget');
        if (widget) {
            widget.classList.toggle('minimized');
        }
    },

    renderUI: function(data) {
        if (!data) return;
        let widget = document.getElementById('compliance-widget');
        
        if (!widget) {
            // Abort if strict HTML is required
            if (this.REQUIRE_HTML_CONTAINER) return;            
            // Otherwise, auto-generate the fallback div
            widget = document.createElement('div');
            widget.id = 'compliance-widget';
            const canvasWrapper = document.getElementById('canvas-wrapper');
            (canvasWrapper || document.body).appendChild(widget);
        }

        let colorClass = 'compliance-green';
        let icon = '✅';
        if (data.score < 100) { colorClass = 'compliance-yellow'; icon = '⚠️'; } 
        if (data.score < 70) { colorClass = 'compliance-red'; icon = '🚨'; }  

        widget.innerHTML = `
            <!-- MAXIMIZED VIEW -->
            <div class="compliance-max-view">
                <div class="compliance-header">
                    <span class="compliance-title">${icon} CODE INSPECTOR</span>
                    <div class="compliance-score-wrapper">
                        <span class="compliance-score ${colorClass}">${data.score}%</span>
                        <button class="compliance-close-btn" title="Minimize">&times;</button>
                    </div>
                </div>
                <div class="explorer-scroll compliance-warnings-container"></div>
            </div>

            <!-- MINIMIZED VIEW -->
            <div class="compliance-min-view" title="Expand Code Inspector">
                <span class="compliance-icon">${icon}</span>
                <span class="compliance-score-min ${colorClass}">${data.score}%</span>
            </div>
        `;

        const warningsContainer = widget.querySelector('.compliance-warnings-container');
        if (data.warnings.length > 0) {
            data.warnings.forEach(w => {
                const warnEl = document.createElement('div');
                warnEl.className = 'compliance-warning';
                warnEl.textContent = w;
                warningsContainer.appendChild(warnEl);
            });
        } else {
            const successEl = document.createElement('div');
            successEl.className = 'compliance-success';
            successEl.textContent = 'All elements meet standard building codes.';
            warningsContainer.appendChild(successEl);
        }

        widget.querySelector('.compliance-close-btn').addEventListener('click', () => this.toggleUI());
        widget.querySelector('.compliance-min-view').addEventListener('click', () => this.toggleUI());
    }
};

// 🌟 GLOBAL COMPATIBILITY HOOKS
window._calcCompliance = (elements, fixtures) => ComplianceEngine.calculate(elements, fixtures);
window.toggleComplianceWidget = () => ComplianceEngine.toggleUI();
window.renderComplianceUI = (data) => ComplianceEngine.renderUI(data);

// --- Self-Contained Settings Toggle ---
document.addEventListener('DOMContentLoaded', () => {
    const complianceCb = document.getElementById('toggle-compliance-cb');
    if (complianceCb) {
        complianceCb.addEventListener('change', (e) => {
            if (typeof window.toggleWidget === 'function') {
                window.toggleWidget('compliance-widget', e.target.checked);
            }
        });
    }
});