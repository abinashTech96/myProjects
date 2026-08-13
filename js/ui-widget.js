// =========================================
// 🎛️ MASTER WIDGET CONFIGURATION
// =========================================
const WIDGET_CONFIG = {
    // ⌨️ Shortcuts Guide Configuration
    CHEATSHEET: [
        {
            category: "GENERAL EDITING",
            color: "#38bdf8",
            items: [
                { desc: "Copy / Paste", keys: "Ctrl+C / Ctrl+V" },
                { desc: "Undo Action", keys: "Ctrl+Z" },
                { desc: "Duplicate Room", keys: "Ctrl+D" },
                { desc: "Lock/Unlock", keys: "Ctrl+L" },
                { desc: "Delete Item", keys: "Del / Bksp", overrideColor: "#ef4444" }
            ]
        },
        {
            category: "2D CANVAS CONTROLS",
            color: "#10b981",
            items: [
                { desc: "Pan View", keys: "Hold Space" },
                { desc: "Zoom In / Out", keys: "Mouse Scroll" },
                { desc: "Straight Line Drag", keys: "Shift + Drag" },
                { desc: "Nudge Item", keys: "Arrow Keys" }
            ]
        },
        {
            category: "DRONE MODE (3D)",
            color: "#f59e0b",
            items: [
                { desc: "Fly / Navigate", keys: "WASD + QE" }
            ]
        }
    ],

    // ✅ Building Code & Compliance Rules
    COMPLIANCE: {
        SQ_INCHES_TO_SQFT: 144,
        RULES: {
            bedroom: { minAreaSqft: 70, minDimInches: 84, requiresEgress: true }, // 84 inches = 7'0"
            living: { minAreaSqft: 120, minDimInches: 84, requiresEgress: true },
            toilet: { minAreaSqft: 15, minDimInches: 0, requiresEgress: false },
            kitchen: { minAreaSqft: 0, minDimInches: 0, requiresEgress: true }
        }
    },

    // 🧭 Vastu Shastra Scoring Rules
    VASTU: {
        baseScore: 50,
        kitchen: { ideal: "SE", acceptable: "NW", idealScore: 20, acceptableScore: 10, penalty: -15 },
        puja: { ideal: "NE", idealScore: 20, penalty: -10 },
        bedroom: { ideal: "SW", idealScore: 15 },
        toilet: { prohibited: ["NE", "SW"], penalty: -25, safeScore: 10 }
    }
};

// ==========================================
// 🧩 CENTRAL WIDGET ENGINE (Modular Router)
// ==========================================
const WidgetEngine = {
    REQUIRE_HTML_CONTAINER: true,

    // -----------------------------------------
    // 1. COMMON ROUTER METHODS
    // -----------------------------------------
    init: function(type) {
        if (type === 'cheatsheet') this._initCheatSheet();
        else if (type === 'compliance') this._initCompliance();
        else if (type === 'vastu') this._initVastu();
    },

    render: function(type, arg1, arg2) {
        if (type === 'cheatsheet') this._renderCheatSheet();
        else if (type === 'compliance') this._renderCompliance(arg1, arg2);
        else if (type === 'vastu') this._renderVastu(arg1);
    },

    toggle: function(type) {
        if (type === 'cheatsheet') this._toggleCheatSheet();
        else if (type === 'compliance') this._toggleCompliance();
        else if (type === 'vastu') this._toggleVastu();
    },

    // -----------------------------------------
    // 2. CHEATSHEET MODULE
    // -----------------------------------------
    _initCheatSheet: function() {
        let widget = document.getElementById('cheatsheet-widget');
        
        if (!widget) {
            if (this.REQUIRE_HTML_CONTAINER) return;
            widget = document.createElement('div');
            widget.id = 'cheatsheet-widget';
            document.body.appendChild(widget);
        }

        widget.innerHTML = `
            <button id="btn-cheat-sheet" class="cs-action-btn" onclick="WidgetEngine.toggle('cheatsheet')">
                <span class="cs-icon">⌨️</span>
                <span class="cs-text">Shortcuts Guide</span>
            </button>
            <div id="cheat-sheet-panel" class="cs-panel">
                <div class="cs-panel-header">
                    <h2>⌨️ KEYBOARD SHORTCUTS</h2>
                    <button class="cs-minimize-btn" onclick="WidgetEngine.toggle('cheatsheet')">✕</button>
                </div>
                <div class="cs-divider"></div>
                <div id="cs-dynamic-content" class="cs-scroll"></div>
            </div>
        `;

        this.render('cheatsheet');

        // Setup Bindings
        const cheatSheetCb = document.getElementById('toggle-cheatsheet-cb');
        const cheatSheetBtn = document.getElementById('btn-cheat-sheet');
        const cheatSheetPanel = document.getElementById('cheat-sheet-panel');

        if (cheatSheetCb) {
            cheatSheetCb.addEventListener('change', (e) => {
                const isVisible = e.target.checked;
                if (cheatSheetBtn) cheatSheetBtn.style.display = isVisible ? '' : 'none';
                
                if (!isVisible && cheatSheetPanel && cheatSheetPanel.style.display === 'block') {
                    cheatSheetPanel.style.opacity = '0';
                    cheatSheetPanel.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        cheatSheetPanel.style.display = 'none';
                    }, 300);
                }
            });
        }
    },

    _renderCheatSheet: function() {
        const container = document.getElementById('cs-dynamic-content');
        if (!container) return;
        let htmlContent = '';

        WIDGET_CONFIG.CHEATSHEET.forEach((section, index) => {
            if (index > 0) htmlContent += `<div class="cs-divider" style="margin: 5px 0;"></div>`;
            const topMargin = index === 0 ? '5px' : '4px';
            htmlContent += `<span class="cs-label" style="color: ${section.color}; margin-top: ${topMargin};">${section.category}</span>`;

            section.items.forEach(item => {
                const keyColor = item.overrideColor ? item.overrideColor : section.color;
                htmlContent += `
                <div class="cs-row">
                    <span class="cs-desc">${item.desc}</span>
                    <span class="cs-shortcut" style="color: ${keyColor};">${item.keys}</span>
                </div>`;
            });
        });

        container.innerHTML = htmlContent;
    },

    _toggleCheatSheet: function() {
        const panel = document.getElementById('cheat-sheet-panel');
        if (!panel) return;
        
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
    },

    // -----------------------------------------
    // 3. COMPLIANCE MODULE
    // -----------------------------------------
    _initCompliance: function() {
        const complianceCb = document.getElementById('toggle-compliance-cb');
        if (complianceCb) {
            complianceCb.addEventListener('change', (e) => {
                if (typeof window.toggleWidget === 'function') {
                    window.toggleWidget('compliance-widget', e.target.checked);
                }
            });
        }
    },

    _calculateCompliance: function(elements, fixtures) {
        let warnings = [];
        let passed = 0;
        let totalChecks = 0;
        const config = WIDGET_CONFIG.COMPLIANCE;

        elements.forEach((el, index) => {
            if (el.isFurniture || el.type === 'staircase' || el.type === 'balcony') return;
            
            const sqft = (el.w * el.h) / config.SQ_INCHES_TO_SQFT;
            const name = el.customName || el.type.toUpperCase();
            const rules = config.RULES[el.type];

            if (!rules) return;

            if (rules.minAreaSqft > 0) {
                totalChecks++;
                if (sqft < rules.minAreaSqft) {
                    warnings.push(`[${name}] Area is ${sqft.toFixed(1)} sqft (Min required: ${rules.minAreaSqft} sqft)`);
                } else { passed++; }
            }
            
            if (rules.minDimInches > 0) {
                totalChecks++;
                if (el.w < rules.minDimInches || el.h < rules.minDimInches) {
                    const minFeet = rules.minDimInches / 12;
                    warnings.push(`[${name}] Width or depth is too narrow. Minimum ${minFeet}'0" required.`);
                } else { passed++; }
            }
            
            if (rules.requiresEgress && fixtures) {
                totalChecks++;
                const roomFixtures = fixtures.filter(f => f.roomId === index);
                const hasEgress = roomFixtures.some(f => f.type === 'window' || f.type === 'door');
                if (!hasEgress) {
                    warnings.push(`[${name}] Missing egress/ventilation. Add a door or window.`);
                } else { passed++; }
            }
        });

        const score = totalChecks > 0 ? Math.round((passed / totalChecks) * 100) : 100;
        return { score, warnings, totalChecks, passed };
    },

    _renderCompliance: function(elementsData, fixturesData) {
        const data = this._calculateCompliance(elementsData, fixturesData);
        if (!data) return;
        
        let widget = document.getElementById('compliance-widget');
        
        if (!widget) {
            if (this.REQUIRE_HTML_CONTAINER) return;            
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

        // Restored exactly from compliance.js
        widget.querySelector('.compliance-close-btn').addEventListener('click', () => this._toggleCompliance());
        widget.querySelector('.compliance-min-view').addEventListener('click', () => this._toggleCompliance());
    },

    _toggleCompliance: function() {
        const widget = document.getElementById('compliance-widget');
        if (widget) {
            widget.classList.toggle('minimized');
        }
    },

    // -----------------------------------------
    // 4. VASTU MODULE
    // -----------------------------------------
    _initVastu: function() {
        const vastuCb = document.getElementById('toggle-vastu-cb');
        if (vastuCb) {
            vastuCb.addEventListener('change', (e) => {
                const widget = document.getElementById('vastu-widget');
                if (widget) {
                    widget.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
    },

    _getVastuDynamicZone: function(cx, cy, plotW, plotH, topDirection) {
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

    _calculateVastu: function(elements) {
        let score = 0;
        let warnings = [];
        
        if (!elements || elements.length === 0) {
            return { score: 0, warnings: [], text: "Add rooms to calculate Vastu." };
        }

        const vConf = WIDGET_CONFIG.VASTU;
        score = vConf.baseScore; 
        const inW = parseFloat(document.getElementById('inW')?.value || 272);
        const inH = parseFloat(document.getElementById('inH')?.value || 400);
        const compassDir = document.getElementById('compassDir')?.value || 'West';

        elements.forEach(el => {
            if (el.isFurniture || el.floor > 0) return; 
            
            const cx = el.x + (el.w / 2);
            const cy = el.y + (el.h / 2);
            let zoneStr = this._getVastuDynamicZone(cx, cy, inW, inH, compassDir);
            
            if (el.type === 'kitchen') {
                if (zoneStr === vConf.kitchen.ideal) { 
                    score += vConf.kitchen.idealScore; 
                    warnings.push(`✅ Kitchen perfectly in ${vConf.kitchen.ideal} (+${vConf.kitchen.idealScore})`); 
                }
                else if (zoneStr === vConf.kitchen.acceptable) { 
                    score += vConf.kitchen.acceptableScore; 
                    warnings.push(`✅ Kitchen acceptable in ${vConf.kitchen.acceptable} (+${vConf.kitchen.acceptableScore})`); 
                }
                else { 
                    score += vConf.kitchen.penalty; 
                    warnings.push(`⚠️ Kitchen in ${zoneStr} (Should be ${vConf.kitchen.ideal}) (${vConf.kitchen.penalty})`); 
                }
            }
            if (el.type === 'puja') {
                if (zoneStr === vConf.puja.ideal) { 
                    score += vConf.puja.idealScore; 
                    warnings.push(`✅ Puja perfectly in ${vConf.puja.ideal} (+${vConf.puja.idealScore})`); 
                }
                else { 
                    score += vConf.puja.penalty; 
                    warnings.push(`⚠️ Puja in ${zoneStr} (Should be ${vConf.puja.ideal}) (${vConf.puja.penalty})`); 
                }
            }
            if (el.type === 'bedroom') {
                if (zoneStr === vConf.bedroom.ideal) { 
                    score += vConf.bedroom.idealScore; 
                    warnings.push(`✅ Master Bed perfectly in ${vConf.bedroom.ideal} (+${vConf.bedroom.idealScore})`); 
                }
            }
            if (el.type === 'toilet') {
                if (vConf.toilet.prohibited.includes(zoneStr)) { 
                    score += vConf.toilet.penalty; 
                    warnings.push(`⚠️ Toilet prohibited in ${zoneStr} (${vConf.toilet.penalty})`); 
                }
                else { 
                    score += vConf.toilet.safeScore; 
                }
            }
        });
        
        score = Math.max(0, Math.min(100, score));
        return { score, warnings, text: warnings.length > 0 ? warnings[0] : "Good overall spatial flow." };
    },

    _renderVastu: function(elementsData) {
        const data = this._calculateVastu(elementsData);
        let widget = document.getElementById('vastu-widget');
        if (!widget) {
            if (this.REQUIRE_HTML_CONTAINER) return;             
            widget = document.createElement('div');
            widget.id = 'vastu-widget';
            widget.className = 'minimized';
            const canvasWrapper = document.getElementById('canvas-wrapper');
            (canvasWrapper || document.body).appendChild(widget);
        }

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

        // Restored exactly from vastu.js (including the stopPropagation)
        widget.querySelector('.vastu-close-btn').addEventListener('click', (e) => {
            e.stopPropagation(); 
            this._toggleVastu();
        });
        widget.querySelector('.vastu-min-view').addEventListener('click', () => this._toggleVastu());
    },

    _toggleVastu: function() {
        const widget = document.getElementById('vastu-widget');
        if (widget) widget.classList.toggle('minimized');
    }
};

// ==========================================
// 🌐 GLOBAL HOOKS & EXPORTS
// ==========================================

// Backwards compatibility mappings for older scripts (e.g. settings.js)
window.toggleCheatSheet = () => WidgetEngine.toggle('cheatsheet');

window.runComplianceCheck = () => {
    if (typeof elements !== 'undefined' && typeof fixtures !== 'undefined') {
        WidgetEngine.render('compliance', elements, fixtures);
    }
};
window.toggleComplianceWidget = () => WidgetEngine.toggle('compliance');

window.calculateVastuScore = () => {
    if (typeof elements !== 'undefined') {
        WidgetEngine.render('vastu', elements);
    }
};
window.toggleVastuWidget = () => WidgetEngine.toggle('vastu');

// Auto-Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    WidgetEngine.init('cheatsheet');
    WidgetEngine.init('compliance');
    WidgetEngine.init('vastu');
});