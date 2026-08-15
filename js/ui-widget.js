// =========================================
// 🎛️ MASTER WIDGET CONFIGURATION
// =========================================
const WIDGET_CONFIG = {
    // ⌨️ Shortcuts Guide Configuration
    CHEATSHEET: {
        id: 'cheatsheet-widget',
        title: 'KEYBOARD SHORTCUTS',
        icon: '⌨️',
        actionToggle: 'TOGGLE_CHEATSHEET',
        layout: { 
            buttonPos: 'position: fixed; bottom: 5px; left: 5px; z-index: 1000;', 
            panelPos: 'position: fixed; bottom: 60px; left: 20px; z-index: 1000;' 
        },
        domIds: {
            btn: 'btn-cheat-sheet',
            panel: 'cheat-sheet-panel',
            content: 'cs-dynamic-content'
        },
        classes: { 
            button: 'cs-action-btn', 
            panel: 'cs-panel',
            header: 'cs-panel-header',
            divider: 'cs-divider',
            scroll: 'cs-scroll',
            label: 'cs-label',
            row: 'cs-row',
            desc: 'cs-desc',
            shortcut: 'cs-shortcut',
            icon: 'cs-icon',
            text: 'cs-text'
        },
        controls: {
            minimizeBtn: { icon: '✕', class: 'cs-minimize-btn', title: 'Minimize' }
        },
        categories: [
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
        ]
    },

    // ✅ Building Code & Compliance Rules
    COMPLIANCE: {
        id: 'compliance-widget',
        title: 'CODE INSPECTOR',
        actionToggle: 'TOGGLE_COMPLIANCE',
        layout: { position: 'top: 190px; left: 24px;' },
        icons: { success: '✅', warning: '⚠️', error: '🚨' },
        messages: {
            success: 'All elements meet standard building codes.',
            empty: 'Waiting for compliance scan...'
        },
        controls: {
            minimizeBtn: { icon: '&times;', class: 'compliance-close-btn', title: 'Minimize' },
            expandBtn: { title: 'Expand Code Inspector' }
        },
        classes: {
            maxView: 'compliance-max-view',
            minView: 'compliance-min-view',
            header: 'compliance-header',
            title: 'compliance-title',
            scoreWrap: 'compliance-score-wrapper',
            score: 'compliance-score',
            scoreMin: 'compliance-score-min',
            warningsContainer: 'explorer-scroll compliance-warnings-container',
            warning: 'compliance-warning',
            success: 'compliance-success',
            icon: 'compliance-icon',
            colorGreen: 'compliance-green',
            colorYellow: 'compliance-yellow',
            colorRed: 'compliance-red'
        },
        constants: { SQ_INCHES_TO_SQFT: 144 },
        rules: {
            bedroom: { minAreaSqft: 70, minDimInches: 84, requiresEgress: true }, // 84 inches = 7'0"
            living: { minAreaSqft: 120, minDimInches: 84, requiresEgress: true },
            toilet: { minAreaSqft: 15, minDimInches: 0, requiresEgress: false },
            kitchen: { minAreaSqft: 0, minDimInches: 0, requiresEgress: true }
        }
    },

    // 🧭 Vastu Shastra Scoring Rules
    VASTU: {
        id: 'vastu-widget',
        title: 'VASTU SCORE',
        icon: '🧭',
        actionToggle: 'TOGGLE_VASTU',
        layout: { position: 'bottom: 20px; left: 20px;' },
        controls: {
            minimizeBtn: { icon: '&times;', class: 'vastu-close-btn', title: 'Minimize' },
            expandBtn: { title: 'Expand Vastu Inspector' }
        },
        classes: { 
            container: 'minimized',
            maxView: 'vastu-max-view',
            minView: 'vastu-min-view',
            header: 'vastu-header',
            title: 'vastu-title',
            scoreWrap: 'vastu-score-wrapper',
            score: 'vastu-score',
            scoreMin: 'vastu-score-min',
            warningsContainer: 'explorer-scroll vastu-warnings-container',
            warning: 'vastu-warning',
            success: 'vastu-success',
            icon: 'vastu-icon',
            colorGreen: 'vastu-green',
            colorYellow: 'vastu-yellow',
            colorRed: 'vastu-red'
        },
        messages: {
            success: "Good overall spatial flow.",
            empty: "Add rooms to calculate Vastu."
        },
        config: {
            baseScore: 50,
            kitchen: { ideal: "SE", acceptable: "NW", idealScore: 20, acceptableScore: 10, penalty: -15 },
            puja: { ideal: "NE", idealScore: 20, penalty: -10 },
            bedroom: { ideal: "SW", idealScore: 15 },
            toilet: { prohibited: ["NE", "SW"], penalty: -25, safeScore: 10 }
        }
    },

    // 📏 Quick Converter Configuration
    CONVERTER: {
        id: 'qc-widget-wrapper',
        title: 'QUICK CONVERTER',
        icon: '📏',
        actionToggle: 'TOGGLE_CONVERTER',
        actionCalc: 'CALC_CONVERTER',
        layout: { position: 'top: 24px; left: 24px;' },
        domIds: {
            minBtn: 'qc-min-btn',
            fullWidget: 'qc-full-widget',
            minFt: 'minFt', minIn: 'minIn', minText: 'qc-min-text',
            calcFt: 'calcFt', calcIn: 'calcIn', resIn: 'resIn'
        },
        controls: {
            minimizeBtn: { icon: '&times;', class: 'converter-close-btn', title: 'Minimize Converter' },
            expandBtn: { title: 'Maximize Converter' }
        },
        labels: { 
            ft: 'FT', in: 'IN', total: 'Total',
            symbols: { foot: "'", inch: '"', eq: "=" },
            placeholder: "0"
        },
        classes: { 
            container: 'canvas-widget-top-left qc-wrapper', 
            inner: 'sidebar-converter',
            minBtn: 'qc-min-btn',
            minInput: 'qc-min-input',
            header: 'converter-header',
            row: 'converter-row',
            inputGroup: 'converter-input-group',
            resultGroup: 'result-group',
            equals: 'converter-equals',
            unit: 'unit',
            icon: 'icon'
        }
    }
};

// ==========================================
// 🧩 CENTRAL WIDGET ENGINE (Modular Router)
// ==========================================
const WidgetEngine = {
    REQUIRE_HTML_CONTAINER: true,

    // -----------------------------------------
    // 1. COMMON ROUTER METHODS & DISPATCHER
    // -----------------------------------------
    init: function(type) {
        if (type === 'cheatsheet') this._initCheatSheet();
        else if (type === 'compliance') this._initCompliance();
        else if (type === 'vastu') this._initVastu();
        else if (type === 'converter') this._initConverter();
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
        else if (type === 'converter') this._toggleConverter();
    },

    // 🌟 CENTRALIZED ACTION DISPATCHER
    handleAction: function(actionType, payload = null) {
        if (actionType === WIDGET_CONFIG.CHEATSHEET.actionToggle) this.toggle('cheatsheet');
        else if (actionType === WIDGET_CONFIG.COMPLIANCE.actionToggle) {
            if (payload) payload.stopPropagation();
            this.toggle('compliance');
        }
        else if (actionType === WIDGET_CONFIG.VASTU.actionToggle) {
            if (payload) payload.stopPropagation();
            this.toggle('vastu');
        }
        else if (actionType === WIDGET_CONFIG.CONVERTER.actionToggle) this.toggle('converter');
        else if (actionType === WIDGET_CONFIG.CONVERTER.actionCalc) this._calcConverterInches();
        else console.warn(`ActionType '${actionType}' is unhandled in 2D Widget Engine.`);
    },

    // -----------------------------------------
    // 2. CHEATSHEET MODULE
    // -----------------------------------------
    _initCheatSheet: function() {
        const conf = WIDGET_CONFIG.CHEATSHEET;
        let widget = document.getElementById(conf.id);
        
        if (!widget) {
            if (this.REQUIRE_HTML_CONTAINER) return;
            widget = document.createElement('div');
            widget.id = conf.id;
            document.body.appendChild(widget);
        }

        widget.innerHTML = `
            <button id="${conf.domIds.btn}" class="${conf.classes.button}" style="${conf.layout.buttonPos}" onclick="WidgetEngine.handleAction('${conf.actionToggle}')">
                <span class="${conf.classes.icon}">${conf.icon}</span>
                <span class="${conf.classes.text}">${conf.title}</span>
            </button>
            <div id="${conf.domIds.panel}" class="${conf.classes.panel}" style="${conf.layout.panelPos}">
                <div class="${conf.classes.header}">
                    <h2>${conf.icon} ${conf.title}</h2>
                    <button class="${conf.controls.minimizeBtn.class}" title="${conf.controls.minimizeBtn.title}" onclick="WidgetEngine.handleAction('${conf.actionToggle}')">${conf.controls.minimizeBtn.icon}</button>
                </div>
                <div class="${conf.classes.divider}"></div>
                <div id="${conf.domIds.content}" class="${conf.classes.scroll}"></div>
            </div>
        `;

        this.render('cheatsheet');

        const cheatSheetCb = document.getElementById('toggle-cheatsheet-cb');
        const cheatSheetBtn = document.getElementById(conf.domIds.btn);
        const cheatSheetPanel = document.getElementById(conf.domIds.panel);

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
        const conf = WIDGET_CONFIG.CHEATSHEET;
        const container = document.getElementById(conf.domIds.content);
        if (!container) return;
        let htmlContent = '';

        conf.categories.forEach((section, index) => {
            if (index > 0) htmlContent += `<div class="${conf.classes.divider}" style="margin: 5px 0;"></div>`;
            const topMargin = index === 0 ? '5px' : '4px';
            htmlContent += `<span class="${conf.classes.label}" style="color: ${section.color}; margin-top: ${topMargin};">${section.category}</span>`;

            section.items.forEach(item => {
                const keyColor = item.overrideColor ? item.overrideColor : section.color;
                htmlContent += `
                <div class="${conf.classes.row}">
                    <span class="${conf.classes.desc}">${item.desc}</span>
                    <span class="${conf.classes.shortcut}" style="color: ${keyColor};">${item.keys}</span>
                </div>`;
            });
        });

        container.innerHTML = htmlContent;
    },

    _toggleCheatSheet: function() {
        const conf = WIDGET_CONFIG.CHEATSHEET;
        const panel = document.getElementById(conf.domIds.panel);
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
        const conf = WIDGET_CONFIG.COMPLIANCE;
        const complianceCb = document.getElementById('toggle-compliance-cb');
        if (complianceCb) {
            complianceCb.addEventListener('change', (e) => {
                if (typeof window.toggleWidget === 'function') {
                    window.toggleWidget(conf.id, e.target.checked);
                }
            });
        }
    },

    _calculateCompliance: function(elements, fixtures) {
        let warnings = [];
        let passed = 0;
        let totalChecks = 0;
        const conf = WIDGET_CONFIG.COMPLIANCE;

        elements.forEach((el, index) => {
            if (el.isFurniture || el.type === 'staircase' || el.type === 'balcony') return;
            
            const sqft = (el.w * el.h) / conf.constants.SQ_INCHES_TO_SQFT;
            const name = el.customName || el.type.toUpperCase();
            const rules = conf.rules[el.type];

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
        
        const conf = WIDGET_CONFIG.COMPLIANCE;
        let widget = document.getElementById(conf.id);
        
        if (!widget) {
            if (this.REQUIRE_HTML_CONTAINER) return;            
            widget = document.createElement('div');
            widget.id = conf.id;
            const canvasWrapper = document.getElementById('canvas-wrapper');
            (canvasWrapper || document.body).appendChild(widget);
        }

        widget.style.cssText = `position: absolute; ${conf.layout.position}; z-index: 100;`;

        let colorClass = conf.classes.colorGreen;
        let statusIcon = conf.icons.success;
        if (data.score < 100) { colorClass = conf.classes.colorYellow; statusIcon = conf.icons.warning; } 
        if (data.score < 70) { colorClass = conf.classes.colorRed; statusIcon = conf.icons.error; }  

        widget.innerHTML = `
            <!-- MAXIMIZED VIEW -->
            <div class="${conf.classes.maxView}">
                <div class="${conf.classes.header}">
                    <span class="${conf.classes.title}">${statusIcon} ${conf.title}</span>
                    <div class="${conf.classes.scoreWrap}">
                        <span class="${conf.classes.score} ${colorClass}">${data.score}%</span>
                        <button class="${conf.controls.minimizeBtn.class}" title="${conf.controls.minimizeBtn.title}" onclick="WidgetEngine.handleAction('${conf.actionToggle}', event)">${conf.controls.minimizeBtn.icon}</button>
                    </div>
                </div>
                <div class="${conf.classes.warningsContainer}"></div>
            </div>

            <!-- MINIMIZED VIEW -->
            <div class="${conf.classes.minView}" title="${conf.controls.expandBtn.title}" onclick="WidgetEngine.handleAction('${conf.actionToggle}', event)">
                <span class="${conf.classes.icon}">${statusIcon}</span>
                <span class="${conf.classes.scoreMin} ${colorClass}">${data.score}%</span>
            </div>
        `;

        const warningsContainer = widget.querySelector(`.${conf.classes.warningsContainer.split(' ')[1]}`);
        if (data.warnings.length > 0) {
            data.warnings.forEach(w => {
                const warnEl = document.createElement('div');
                warnEl.className = conf.classes.warning;
                warnEl.textContent = w;
                warningsContainer.appendChild(warnEl);
            });
        } else {
            const successEl = document.createElement('div');
            successEl.className = conf.classes.success;
            successEl.textContent = conf.messages.success;
            warningsContainer.appendChild(successEl);
        }
    },

    _toggleCompliance: function() {
        const conf = WIDGET_CONFIG.COMPLIANCE;
        const widget = document.getElementById(conf.id);
        if (widget) {
            widget.classList.toggle('minimized'); // Base CSS transition class
        }
    },

    // -----------------------------------------
    // 4. VASTU MODULE
    // -----------------------------------------
    _initVastu: function() {
        const conf = WIDGET_CONFIG.VASTU;
        const vastuCb = document.getElementById('toggle-vastu-cb');
        if (vastuCb) {
            vastuCb.addEventListener('change', (e) => {
                const widget = document.getElementById(conf.id);
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
        const vConf = WIDGET_CONFIG.VASTU;
        let score = 0;
        let warnings = [];
        
        if (!elements || elements.length === 0) {
            return { score: 0, warnings: [], text: vConf.messages.empty };
        }

        score = vConf.config.baseScore; 
        const inW = parseFloat(document.getElementById('inW')?.value || 272);
        const inH = parseFloat(document.getElementById('inH')?.value || 400);
        const compassDir = document.getElementById('compassDir')?.value || 'West';

        elements.forEach(el => {
            if (el.isFurniture || el.floor > 0) return; 
            
            const cx = el.x + (el.w / 2);
            const cy = el.y + (el.h / 2);
            let zoneStr = this._getVastuDynamicZone(cx, cy, inW, inH, compassDir);
            
            if (el.type === 'kitchen') {
                if (zoneStr === vConf.config.kitchen.ideal) { 
                    score += vConf.config.kitchen.idealScore; 
                    warnings.push(`✅ Kitchen perfectly in ${vConf.config.kitchen.ideal} (+${vConf.config.kitchen.idealScore})`); 
                }
                else if (zoneStr === vConf.config.kitchen.acceptable) { 
                    score += vConf.config.kitchen.acceptableScore; 
                    warnings.push(`✅ Kitchen acceptable in ${vConf.config.kitchen.acceptable} (+${vConf.config.kitchen.acceptableScore})`); 
                }
                else { 
                    score += vConf.config.kitchen.penalty; 
                    warnings.push(`⚠️ Kitchen in ${zoneStr} (Should be ${vConf.config.kitchen.ideal}) (${vConf.config.kitchen.penalty})`); 
                }
            }
            if (el.type === 'puja') {
                if (zoneStr === vConf.config.puja.ideal) { 
                    score += vConf.config.puja.idealScore; 
                    warnings.push(`✅ Puja perfectly in ${vConf.config.puja.ideal} (+${vConf.config.puja.idealScore})`); 
                }
                else { 
                    score += vConf.config.puja.penalty; 
                    warnings.push(`⚠️ Puja in ${zoneStr} (Should be ${vConf.config.puja.ideal}) (${vConf.config.puja.penalty})`); 
                }
            }
            if (el.type === 'bedroom') {
                if (zoneStr === vConf.config.bedroom.ideal) { 
                    score += vConf.config.bedroom.idealScore; 
                    warnings.push(`✅ Master Bed perfectly in ${vConf.config.bedroom.ideal} (+${vConf.config.bedroom.idealScore})`); 
                }
            }
            if (el.type === 'toilet') {
                if (vConf.config.toilet.prohibited.includes(zoneStr)) { 
                    score += vConf.config.toilet.penalty; 
                    warnings.push(`⚠️ Toilet prohibited in ${zoneStr} (${vConf.config.toilet.penalty})`); 
                }
                else { 
                    score += vConf.config.toilet.safeScore; 
                }
            }
        });
        
        score = Math.max(0, Math.min(100, score));
        return { score, warnings, text: warnings.length > 0 ? warnings[0] : vConf.messages.success };
    },

    _renderVastu: function(elementsData) {
        const data = this._calculateVastu(elementsData);
        const conf = WIDGET_CONFIG.VASTU;
        let widget = document.getElementById(conf.id);

        if (!widget) {
            if (this.REQUIRE_HTML_CONTAINER) return;             
            widget = document.createElement('div');
            widget.id = conf.id;
            widget.className = conf.classes.container;
            const canvasWrapper = document.getElementById('canvas-wrapper');
            (canvasWrapper || document.body).appendChild(widget);
        }

        widget.style.cssText = `position: absolute; ${conf.layout.position}; z-index: 100;`;

        let colorClass = conf.classes.colorGreen;
        if (data.score < 40) { colorClass = conf.classes.colorRed; } 
        else if (data.score < 70) { colorClass = conf.classes.colorYellow; }  

        widget.innerHTML = `
            <!-- MAXIMIZED VIEW -->
            <div class="${conf.classes.maxView}">
                <div class="${conf.classes.header}">
                    <span class="${conf.classes.title}">${conf.icon} ${conf.title}</span>
                    <div class="${conf.classes.scoreWrap}">
                        <span class="${conf.classes.score} ${colorClass}">${data.score}/100</span>
                        <button class="${conf.controls.minimizeBtn.class}" title="${conf.controls.minimizeBtn.title}" onclick="WidgetEngine.handleAction('${conf.actionToggle}', event)">${conf.controls.minimizeBtn.icon}</button>
                    </div>
                </div>
                <div class="${conf.classes.warningsContainer}"></div>
            </div>

            <!-- MINIMIZED VIEW -->
            <div class="${conf.classes.minView}" title="${conf.controls.expandBtn.title}" onclick="WidgetEngine.handleAction('${conf.actionToggle}', event)">
                <span class="${conf.classes.icon}">${conf.icon}</span>
                <span class="${conf.classes.scoreMin} ${colorClass}">${data.score}%</span>
            </div>
        `;

        const warningsContainer = widget.querySelector(`.${conf.classes.warningsContainer.split(' ')[1]}`);
        
        if (data.score === 0 && data.warnings.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = conf.classes.success;
            emptyEl.style.color = '#94a3b8';
            emptyEl.style.background = 'rgba(255,255,255,0.05)';
            emptyEl.textContent = data.text;
            warningsContainer.appendChild(emptyEl);
        } else if (data.warnings.length > 0) {
            data.warnings.forEach(w => {
                const warnEl = document.createElement('div');
                warnEl.className = w.includes('✅') ? conf.classes.success : conf.classes.warning;
                warnEl.textContent = w;
                warningsContainer.appendChild(warnEl);
            });
        } else {
            const successEl = document.createElement('div');
            successEl.className = conf.classes.success;
            successEl.textContent = data.text;
            warningsContainer.appendChild(successEl);
        }
    },

    _toggleVastu: function() {
        const widget = document.getElementById(WIDGET_CONFIG.VASTU.id);
        if (widget) widget.classList.toggle('minimized');
    },

    // -----------------------------------------
    // 5. QUICK CONVERTER MODULE
    // -----------------------------------------
    _initConverter: function() {
        const conf = WIDGET_CONFIG.CONVERTER;
        let widget = document.getElementById(conf.id);
        
        if (!widget) {
            if (this.REQUIRE_HTML_CONTAINER) return;
            widget = document.createElement('div');
            widget.id = conf.id;
            const canvasWrapper = document.getElementById('canvas-wrapper') || document.body;
            canvasWrapper.appendChild(widget);
        }

        widget.className = conf.classes.container;

        widget.innerHTML = `
            <!-- Minimized Micro-Input Pill -->
            <div id="${conf.domIds.minBtn}" class="${conf.classes.minBtn}">
                <button onclick="WidgetEngine.handleAction('${conf.actionToggle}')" style="background:transparent; border:none; cursor:pointer; padding:0; display:flex;" title="${conf.controls.expandBtn.title}">
                    <span class="${conf.classes.icon}" style="font-size: 1.1rem; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">${conf.icon}</span>
                </button>
                <div style="display:flex; align-items:center; gap:2px; margin-left:6px;">
                    <!-- Tiny Feet Input -->
                    <input type="number" id="${conf.domIds.minFt}" class="${conf.classes.minInput}" placeholder="${conf.labels.placeholder}" oninput="document.getElementById('${conf.domIds.calcFt}').value = this.value; WidgetEngine.handleAction('${conf.actionCalc}');">
                    <span style="color:#94a3b8; font-weight:bold;">${conf.labels.symbols.foot}</span>
                    
                    <!-- Tiny Inches Input -->
                    <input type="number" id="${conf.domIds.minIn}" class="${conf.classes.minInput}" placeholder="${conf.labels.placeholder}" oninput="document.getElementById('${conf.domIds.calcIn}').value = this.value; WidgetEngine.handleAction('${conf.actionCalc}');">
                    <span style="color:#94a3b8; font-weight:bold;">${conf.labels.symbols.inch}</span>
                    
                    <span style="color:#38bdf8; margin: 0 4px; font-weight:bold;">${conf.labels.symbols.eq}</span>
                    <span id="${conf.domIds.minText}" style="color:#f8fafc; font-family:monospace; font-weight:bold; font-size:0.9rem;">0${conf.labels.symbols.inch}</span>
                </div>
            </div>
            
            <!-- Maximized Full Widget -->
            <div id="${conf.domIds.fullWidget}" class="${conf.classes.inner}">
                <div class="${conf.classes.header}">
                    <div><span class="${conf.classes.icon}">${conf.icon}</span> ${conf.title}</div>
                    <button onclick="WidgetEngine.handleAction('${conf.actionToggle}')" title="${conf.controls.minimizeBtn.title}" class="${conf.controls.minimizeBtn.class}">${conf.controls.minimizeBtn.icon}</button>
                </div>
                <div class="${conf.classes.row}">
                    <div class="${conf.classes.inputGroup}">
                        <input type="number" id="${conf.domIds.calcFt}" placeholder="${conf.labels.placeholder}" oninput="WidgetEngine.handleAction('${conf.actionCalc}')">
                        <span class="${conf.classes.unit}">${conf.labels.ft}</span>
                    </div>
                    <div class="${conf.classes.inputGroup}">
                        <input type="number" id="${conf.domIds.calcIn}" placeholder="${conf.labels.placeholder}" oninput="WidgetEngine.handleAction('${conf.actionCalc}')">
                        <span class="${conf.classes.unit}">${conf.labels.in}</span>
                    </div>
                    <span class="${conf.classes.equals}">${conf.labels.symbols.eq}</span>
                    <div class="${conf.classes.inputGroup} ${conf.classes.resultGroup}">
                        <input type="text" id="${conf.domIds.resIn}" placeholder="${conf.labels.total}" readonly>
                        <span class="${conf.classes.unit}">${conf.labels.in}</span>
                    </div>
                </div>
            </div>
        `;

        const qcCb = document.getElementById('toggle-qc-cb');
        if (qcCb) {
            qcCb.addEventListener('change', (e) => {
                if (typeof window.toggleWidget === 'function') {
                    window.toggleWidget(conf.id, e.target.checked);
                }
            });
        }
    },

    _calcConverterInches: function() {
        const conf = WIDGET_CONFIG.CONVERTER;
        const ftInput = document.getElementById(conf.domIds.calcFt);
        const inInput = document.getElementById(conf.domIds.calcIn);
        
        const ft = parseFloat(ftInput?.value) || 0; 
        const inc = parseFloat(inInput?.value) || 0; 
        const total = ft * 12 + inc;
        
        const resIn = document.getElementById(conf.domIds.resIn);
        if (resIn) resIn.value = total + " " + conf.labels.in.toLowerCase(); 

        const minFt = document.getElementById(conf.domIds.minFt);
        const minIn = document.getElementById(conf.domIds.minIn);
        const minText = document.getElementById(conf.domIds.minText);
        
        if (minFt && document.activeElement !== minFt && ftInput) minFt.value = ftInput.value;
        if (minIn && document.activeElement !== minIn && inInput) minIn.value = inInput.value;
        if (minText) minText.innerText = total + conf.labels.symbols.inch;
    },

    _toggleConverter: function() {
        const conf = WIDGET_CONFIG.CONVERTER;
        const fullWidget = document.getElementById(conf.domIds.fullWidget);
        const minBtn = document.getElementById(conf.domIds.minBtn);
        
        if (!fullWidget || !minBtn) return;    
        const isClosed = fullWidget.style.opacity === '0';
        
        if (isClosed) {
            minBtn.style.opacity = '0';
            minBtn.style.transform = 'scale(0.5)';
            minBtn.style.pointerEvents = 'none';        
            fullWidget.style.opacity = '1';
            fullWidget.style.transform = 'scale(1)';
            fullWidget.style.pointerEvents = 'auto';
        } else {
            fullWidget.style.opacity = '0';
            fullWidget.style.transform = 'scale(0.5)';
            fullWidget.style.pointerEvents = 'none';        
            minBtn.style.opacity = '1';
            minBtn.style.transform = 'scale(1)';
            minBtn.style.pointerEvents = 'auto';
        }
    }
};

// ==========================================
// 🌐 GLOBAL HOOKS & EXPORTS
// ==========================================

window.toggleCheatSheet = () => WidgetEngine.handleAction('TOGGLE_CHEATSHEET');

window.runComplianceCheck = () => {
    if (typeof elements !== 'undefined' && typeof fixtures !== 'undefined') {
        WidgetEngine.render('compliance', elements, fixtures);
    }
};
window.toggleComplianceWidget = () => WidgetEngine.handleAction('TOGGLE_COMPLIANCE');

window.calculateVastuScore = () => {
    if (typeof elements !== 'undefined') {
        WidgetEngine.render('vastu', elements);
    }
};
window.toggleVastuWidget = (e) => WidgetEngine.handleAction('TOGGLE_VASTU', e);

window.calcInches = () => WidgetEngine.handleAction('CALC_CONVERTER');
window.toggleQuickConverter = () => WidgetEngine.handleAction('TOGGLE_CONVERTER');

// Auto-Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    WidgetEngine.init('cheatsheet');
    WidgetEngine.init('compliance');
    WidgetEngine.init('vastu');
    WidgetEngine.init('converter');
});