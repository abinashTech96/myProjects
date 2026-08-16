// =========================================
// 🎛️ NAVBAR ACTION BUTTONS CONFIGURATION
// =========================================
const NAV_ACTION_CONFIG = {
    containerId: 'nav-action-buttons',
    fileInputId: 'nav-import-file',
    classes: {
        baseBtn: 'nav-add-floor-btn tool-btn',
        icon: 'tool-icon'
    },
    buttons: [
        { 
            id: 'project-info-btn', title: 'Project Details', icon: 'i', 
            themeClass: 'theme-blue', iconClass: 'italic-serif', actionType: 'TOGGLE_INFO' 
        },
        { 
            id: 'save-project-btn', title: 'Save Project JSON', icon: '💾', 
            themeClass: 'theme-blue', actionType: 'SAVE_PROJECT',
            hasDropdown: true,
            dropdownId: 'nav-export-menu',
            dropdownItems: [
                { label: '🖨️ PDF', title: '🖨️ Print PDF', actionType: 'EXPORT_PDF' },
                { label: '💽 DXF', title: '💽 AutoCAD DXF', actionType: 'EXPORT_DXF' },
                { label: '🖼️ PNG', title: '🖼️ Image PNG', actionType: 'EXPORT_PNG' },
                { label: '🧊 GLB', title: '🧊 3D Mesh GLB', actionType: 'EXPORT_GLB' }
            ]
        },
        { 
            id: 'load-project-btn', title: 'Load Project JSON', icon: '📂', 
            themeClass: 'theme-yellow', actionType: 'LOAD_PROJECT' 
        },
        { 
            id: 'reset-workspace-btn', title: 'Factory Reset', icon: '⚠️', 
            themeClass: 'theme-red', actionType: 'RESET_WORKSPACE' 
        }
    ],
    infoPanel: {
        id: 'project-info-overlay',
        classes: {
            panel: 'glass-panel nav-dropdown-panel offset-right',
            header: 'panel-header drop-header-blue',
            hud: 'nav-stats-hud transparent-hud',
            row: 'hud-stat stat-row',
            label: 'hud-label',
            valBlue: 'hud-value blue',
            valGreen: 'hud-value green',
            valPurple: 'hud-value purple'
        },
        ids: { plot: 'plot-area', build: 'build-area', total: 'total-built-area' }
    }
};

const SETTINGS_CONFIG = [
    {
        id: 'widget-visibility',
        icon: '👁️',
        title: 'UI WIDGETS',
        open: true,
        animation: 'blastAndSparkleFocus',
        items: [
            { type: 'toggle', id: 'toggle-qc-cb', label: '📏 Quick Converter', checked: true, action: "window.toggleWidget('qc-widget-wrapper', this.checked)" },
            { type: 'toggle', id: 'toggle-camera-cb', label: '📷 Camera Controls', checked: true, action: "window.toggleWidget('camera-controls', this.checked)" },
            { type: 'toggle', id: 'toggle-compliance-cb', label: '✅ Code Inspector', checked: true, action: "window.toggleWidget('compliance-widget', this.checked)" },
            { type: 'toggle', id: 'toggle-vastu-cb', label: '🧭 Vastu Score', checked: true, action: "window.toggleWidget('vastu-widget', this.checked)" },
            { type: 'toggle', id: 'toggle-cheatsheet-cb', label: '⌨️ Shortcuts Guide', checked: true, action: "if(typeof toggleCheatSheet === 'function') { const btn = document.getElementById('btn-cheat-sheet'); if(btn) btn.style.display = this.checked ? '' : 'none'; }" }
        ]
    },
    {
        id: 'pro-tools',
        icon: '🚀',
        title: 'BUILDER TOOLS',
        open: false,
        isGrid: true,
        animation: 'blastAndSparkleRing',
        items: [
            { type: 'buttons', buttons: [
                { label: '✨ Auto-Builder', action: "toggleAutoBuilder()", class: 'sidebar-btn secondary', style: 'flex:1; padding: 5px;' },
                { label: '🤖 AI Agent', action: "toggleAIAgent(); window.populateAIModelDropdown();", class: 'sidebar-btn secondary', style: 'flex:1; padding: 5px;' }
            ]}
        ]
    },
    {
        id: 'demo-section',
        icon: '🧪',
        title: 'DEMO FEATURES',
        open: false,
        animation: 'blastAndSparkleHotFlash',
        items: [
            { type: 'toggle', id: 'demo-toggle-1', label: '🚀 Future Feature A', checked: false, action: "console.log('Feature A toggled')" },
            { type: 'toggle', id: 'demo-toggle-2', label: '🔮 Future Feature B', checked: false, action: "console.log('Feature B toggled')" }
        ]
    },
    {
        id: 'canvas-controls',
        icon: '🎨',
        title: 'CANVAS CONTROLS',
        open: false,
        animation: 'blastAndSparkleFocus',
        items: [
            { type: 'toggle', id: 'showColsToggle', label: '🏗️ Show Columns', checked: false, action: "CanvasControlsEngine.toggle('showColsToggle', this.checked)" },
            { type: 'toggle', id: 'showDims', label: '📏 Show Dimensions', checked: false, action: "CanvasControlsEngine.toggle('showDims', this.checked)" },
            { type: 'toggle', id: 'showOffsetsToggle', label: '📏 Show Site Offsets', checked: false, action: "CanvasControlsEngine.toggle('showOffsetsToggle', this.checked)" },
            { type: 'toggle', id: 'showLabelsToggle', label: '🔠 Show Plot Labels', checked: true, action: "CanvasControlsEngine.toggle('showLabelsToggle', this.checked)" },
            { type: 'toggle', id: 'smartMergeToggle', label: '🧩 Smart-Merge', checked: false, action: "CanvasControlsEngine.toggle('smartMergeToggle', this.checked)" },
            { type: 'toggle', id: 'gridSnapToggle', label: '📐 Snap to 1ft Grid', checked: true, action: "CanvasControlsEngine.toggle('gridSnapToggle', this.checked)" },
            { type: 'toggle', id: 'real3DToggle', label: '🏠 Real3D View', checked: false, action: "CanvasControlsEngine.toggle('real3DToggle', this.checked)" }
        ]
    }
];


// ==========================================
// 🧩 SETTINGS MENU & NAVBAR ACTION ENGINE
// ==========================================
const SettingsEngine = {
    init: function() {
        let overlay = document.getElementById('settings-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'settings-overlay';
            overlay.className = 'glass-panel settings-dropdown';
            
            overlay.innerHTML = `
                <div class="panel-header settings-header">
                    <span class="icon settings-icon-color">⚙️</span>
                    <h2 class="settings-title">SETTINGS</h2>
                </div>
                <div id="settings-content" class="settings-content"></div>
            `;
            
            const btn = document.getElementById('settings-btn');
            if (btn && btn.parentNode) {
                btn.parentNode.appendChild(overlay);
            } else {
                document.body.appendChild(overlay);
            }
        }
        
        this.renderMenu();
    },

    renderMenu: function() {
        const container = document.getElementById('settings-content');
        if (!container) return;

        container.innerHTML = SETTINGS_CONFIG.map(section => {
            const activeClass = section.open ? 'active' : '';
            const gridClass = section.isGrid ? 'btn-grid' : '';
            const customAnim = section.animation ? `style="--accordion-anim: ${section.animation};"` : '';
            const itemsHTML = section.items.map(item => {
                if (item.type === 'toggle') {
                    return `
                        <label class="ui-toggle">
                            <span class="settings-label-text">${item.label}</span>
                            <input type="checkbox" id="${item.id}" ${item.checked ? 'checked' : ''} autocomplete="off" onchange="${item.action}">
                            <div class="slider"></div>
                        </label>
                    `;
                } else if (item.type === 'button') {
                    return `<button class="${item.class}" onclick="${item.action}">${item.label}</button>`;
                } else if (item.type === 'buttons') {
                    const btnRow = item.buttons.map(b => `<button class="${b.class}" style="${b.style}" onclick="${b.action}">${b.label}</button>`).join('');
                    return `<div class="flex-row">${btnRow}</div>`;
                }
                return '';
            }).join('');

            return `
                <div class="settings-accordion-wrapper">
                    <button class="settings-accordion-btn ${activeClass}" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('active');">
                        <div class="accordion-title-wrap" style="display: flex; align-items: center; gap: 8px;">
                            <span class="accordion-emoji">${section.icon}</span>
                            <span class="settings-category">${section.title}</span>
                        </div>
                        <span class="settings-chevron">▼</span>
                    </button>                    
                    <div class="settings-accordion-content ${activeClass}">
                        <div class="settings-accordion-inner ${gridClass}" ${customAnim}>
                            ${itemsHTML}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
};
const NavActionEngine = {
    init: function() {
        const container = document.getElementById(NAV_ACTION_CONFIG.containerId);
        if (!container) return;

        // 1. Build the Buttons & Split Dropdowns
        let html = NAV_ACTION_CONFIG.buttons.map(btn => {
            const iconClass = btn.iconClass ? ` ${btn.iconClass}` : '';
            const mainBtnHtml = `
                <button id="${btn.id}" class="${NAV_ACTION_CONFIG.classes.baseBtn} ${btn.themeClass}" title="${btn.title}" onclick="NavActionEngine.handleAction('${btn.actionType}')">
                    <span class="${NAV_ACTION_CONFIG.classes.icon}${iconClass}">${btn.icon}</span>
                </button>
            `;

            if (btn.hasDropdown) {
                const dropItemsHtml = btn.dropdownItems.map(item => `
                    <div class="export-drop-item" onclick="NavActionEngine.handleAction('${item.actionType}')">${item.label}</div>
                `).join('');

                return `
                <div class="nav-btn-group">
                    ${mainBtnHtml}
                    <button class="${NAV_ACTION_CONFIG.classes.baseBtn} ${btn.themeClass} dropdown-trigger-btn" onclick="NavActionEngine.toggleDropdown('${btn.dropdownId}', event)" title="More Export Options">
                        <span class="drop-arrow">▼</span>
                    </button>
                    <div id="${btn.dropdownId}" class="export-dropdown-panel">
                        ${dropItemsHtml}
                    </div>
                </div>`;
            }

            return mainBtnHtml;
        }).join('');

        // 2. Inject a Hidden File Input for "Load JSON"
        html += `<input type="file" id="${NAV_ACTION_CONFIG.fileInputId}" style="display:none" accept=".json">`;
        container.innerHTML = html;

        // 3. Bind Event Listeners (Import & Outside Click)
        const importInput = document.getElementById(NAV_ACTION_CONFIG.fileInputId);
        if (importInput) importInput.addEventListener('change', (e) => this.importProjectJSON(e));

        // ✨ UPDATED: Close menu and reset arrow rotation on outside click
        document.addEventListener('click', () => {
            document.querySelectorAll('.export-dropdown-panel').forEach(p => {
                p.classList.remove('show');
                if (p.parentElement) p.parentElement.classList.remove('open');
            });
        });

        // 4. Build the Project Info Popup Panel
        this._buildInfoPanel(container);
    },

    _buildInfoPanel: function(container) {
        const conf = NAV_ACTION_CONFIG.infoPanel;
        const overlay = document.createElement('div');
        overlay.id = conf.id;
        overlay.className = conf.classes.panel;
        
        overlay.innerHTML = `
            <div class="${conf.classes.header}">
                <span class="icon">ℹ️</span>
                <h2>PROJECT DETAILS</h2>
            </div>
            <div class="${conf.classes.hud}">
                <div class="${conf.classes.row}">
                    <span class="${conf.classes.label}">PLOT AREA</span> 
                    <span id="${conf.ids.plot}" class="${conf.classes.valBlue}">0 sq ft</span>
                </div>
                <div class="${conf.classes.row}">
                    <span class="${conf.classes.label}">BUILD AREA</span> 
                    <span id="${conf.ids.build}" class="${conf.classes.valGreen}">0 sq ft</span>
                </div>
                <div class="${conf.classes.row}" style="border-bottom: none;">
                    <span class="${conf.classes.label}">TOTAL BUILT-UP</span> 
                    <span id="${conf.ids.total}" class="${conf.classes.valPurple}">0 sq ft</span>
                </div>
            </div>
        `;
        container.appendChild(overlay);
    },

    // -----------------------------------------
    // 🌟 CENTRALIZED DISPATCHER
    // -----------------------------------------
    handleAction: function(actionType) {
        if (actionType === 'TOGGLE_INFO') this.toggleInfoPanel();
        else if (actionType === 'SAVE_PROJECT') this.exportProjectJSON();
        else if (actionType === 'LOAD_PROJECT') {
            const fi = document.getElementById(NAV_ACTION_CONFIG.fileInputId);
            if (fi) fi.click();
        } 
        else if (actionType === 'RESET_WORKSPACE') this.resetWorkspace();
        
        // 📤 EXPORT ROUTES
        else if (actionType === 'EXPORT_PDF') this.exportPDF();
        else if (actionType === 'EXPORT_DXF') this.exportDXF();
        else if (actionType === 'EXPORT_PNG') this.exportPNG();
        else if (actionType === 'EXPORT_GLB') this.exportGLB();

        else console.warn(`ActionType '${actionType}' is unhandled in Nav Action Engine.`);
    },

    // -----------------------------------------
    // 💼 UI & WORKSPACE STATE MUTATION
    // -----------------------------------------
    toggleDropdown: function(dropdownId, event) {
        event.stopPropagation();
        const menu = document.getElementById(dropdownId);
        if (!menu) return;
        
        // ✨ UPDATED: Manage the 'open' class on the parent group for arrow rotation
        document.querySelectorAll('.export-dropdown-panel').forEach(p => {
            if (p.id !== dropdownId) {
                p.classList.remove('show');
                if (p.parentElement) p.parentElement.classList.remove('open');
            }
        });
        menu.classList.toggle('show');
        menu.parentElement.classList.toggle('open');
    },

    toggleInfoPanel: function() {
        const panel = document.getElementById(NAV_ACTION_CONFIG.infoPanel.id);
        const btn = document.getElementById('project-info-btn');
        if (!panel) return;

        const isOpen = panel.style.display === 'block' && panel.style.opacity !== '0';

        if (!isOpen) {
            panel.style.display = 'block';
            if (btn) {
                btn.style.transform = 'scale(0.8)';
                btn.style.background = 'rgba(56, 189, 248, 0.4)';
                setTimeout(() => btn.style.transform = 'scale(1)', 150);
            }
            setTimeout(() => {
                panel.style.opacity = '1';
                panel.style.transform = 'scale(1)';
                panel.style.pointerEvents = 'auto';
            }, 10);
        } else {
            if (btn) {
                btn.style.transform = 'scale(0.8)';
                btn.style.background = 'rgba(56, 189, 248, 0.15)';
                setTimeout(() => btn.style.transform = 'scale(1)', 150);
            }
            panel.style.opacity = '0';
            panel.style.transform = 'scale(0)';
            panel.style.pointerEvents = 'none';
            setTimeout(() => {
                panel.style.display = 'none';
            }, 400);
        }
    },

    refreshStats: function(geom) {
        if (!geom) return;
        const { SCALE, inW, inH, A, B, C, D } = geom;

        let plotAreaSqFt = 0;
        if (typeof getPolygonArea === 'function') {
            plotAreaSqFt = getPolygonArea([A, B, C, D]) / (SCALE * SCALE) / 144;
        }
        const buildAreaSqFt = (inW * inH / (SCALE * SCALE) / 144);
        
        let totalBuiltUpArea = 0;
        if (typeof elements !== 'undefined') {
            elements.forEach(el => {
                if (el.isFurniture || el.type === 'staircase') return;
                totalBuiltUpArea += (el.w * el.h) / 144;
            });
        }

        const conf = NAV_ACTION_CONFIG.infoPanel.ids;
        const plotEl = document.getElementById(conf.plot);
        const buildEl = document.getElementById(conf.build);
        const totalEl = document.getElementById(conf.total);

        if (plotEl) plotEl.innerText = plotAreaSqFt.toFixed(2) + ' sq ft';
        if (buildEl) buildEl.innerText = buildAreaSqFt.toFixed(2) + ' sq ft';
        if (totalEl) totalEl.innerText = totalBuiltUpArea.toFixed(1) + ' sq ft';
    },

    async resetWorkspace() {
        if (confirm("⚠️ This will completely erase your building. Continue?")) {
            if (typeof clearTextureCache === 'function') clearTextureCache();
            
            window.elements = []; 
            window.fixtures = []; 
            window.currentFloor = 0;
            
            if (typeof ProjectState !== 'undefined') {
                ProjectState.history.baseState = null; 
                ProjectState.history.stack = [];
                ProjectState.history.redoStack = [];
            }
            
            if(document.getElementById('inW')) document.getElementById('inW').value = 278;
            if(document.getElementById('inH')) document.getElementById('inH').value = 417;
            if(document.getElementById('b-floors')) document.getElementById('b-floors').value = 1;
            
            if (typeof StorageEngine !== 'undefined') {
                try {
                    const db = await StorageEngine.initDB();
                    db.transaction(StorageEngine.STORE_NAME, 'readwrite').objectStore(StorageEngine.STORE_NAME).delete('latest_session');
                } catch(e) { console.warn('DB clear failed'); }
            }
            localStorage.removeItem('ArchCAD_AutoSave');
            
            if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
            if (typeof setFloor === 'function') setFloor(0);
            if (typeof updateCanvas === 'function') updateCanvas();
            if (typeof generate3DModel === 'function') generate3DModel();
        }
    },

    // -----------------------------------------
    // 📤 ADVANCED EXPORT LOGIC
    // -----------------------------------------
    downloadBlob: function(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    exportProjectJSON: function() {
        const projectData = {
            version: "1.2",
            timestamp: new Date().toISOString(),
            floorCount: parseInt(document.getElementById('b-floors')?.value) || 1,
            elements: typeof elements !== 'undefined' ? elements : [], 
            fixtures: typeof fixtures !== 'undefined' ? fixtures : [],
            plot: {
                inW: document.getElementById('inW')?.value,
                inH: document.getElementById('inH')?.value,
                aL: document.getElementById('aL')?.value, aU: document.getElementById('aU')?.value,
                bR: document.getElementById('bR')?.value, bU: document.getElementById('bU')?.value,
                cR: document.getElementById('cR')?.value, cD: document.getElementById('cD')?.value,
                dL: document.getElementById('dL')?.value, dD: document.getElementById('dD')?.value,
                roadSide: document.getElementById('roadSide')?.value
            }
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData, null, 2));
        this.downloadBlob(JSON.stringify(projectData, null, 2), "ArchCAD_Project_" + Math.floor(Date.now() / 1000) + ".json", 'application/json');
    },

    importProjectJSON: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!importedData.elements) return alert("Invalid project file.");
                
                window.elements = importedData.elements;
                window.fixtures = importedData.fixtures || [];

                if (typeof ProjectState !== 'undefined') {
                    ProjectState.history.stack = [];
                    ProjectState.history.redoStack = [];
                    ProjectState.history.baseState = ProjectState._clone({ elements: window.elements, fixtures: window.fixtures });
                    if (typeof renderTimeMachine === 'function') renderTimeMachine();
                }

                const maxFloor = window.elements.reduce((max, el) => Math.max(max, el.floor || 0), 0);
                const calculatedFloors = maxFloor + 1;
                const finalFloorCount = Math.max(importedData.floorCount || 1, calculatedFloors);
                
                if (document.getElementById('b-floors')) document.getElementById('b-floors').value = finalFloorCount;
                
                if (importedData.plot) {
                    const p = importedData.plot;
                    const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val; };
                    setVal('inW', p.inW); setVal('inH', p.inH);
                    setVal('aL', p.aL); setVal('aU', p.aU);
                    setVal('bR', p.bR); setVal('bU', p.bU);
                    setVal('cR', p.cR); setVal('cD', p.cD);
                    setVal('dL', p.dL); setVal('dD', p.dD);
                    setVal('roadSide', p.roadSide || 'none');
                }
                
                if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
                
                window.currentFloor = 0; 
                window.selectedElIndex = -1;
                
                if (typeof renderSidebar === 'function') renderSidebar();
                if (typeof updateCanvas === 'function') updateCanvas(false);
                setTimeout(() => {
                    if (typeof generate3DModel === 'function') generate3DModel();
                    alert("✅ Project loaded successfully!");
                }, 100);
                
                document.getElementById(NAV_ACTION_CONFIG.fileInputId).value = ''; 
            } catch (error) { 
                alert("Error parsing file: " + error.message); 
            }
        };
        reader.readAsText(file);
    },

    exportPNG: function() {
        const svgElement = document.getElementById('blueprint');
        if (!svgElement) return;
        
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgElement);
        if (!svgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 2000;
            canvas.height = 2000;
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url); 

            const downloadLink = document.createElement('a');
            downloadLink.href = canvas.toDataURL('image/png', 1.0);
            downloadLink.download = 'ArchCAD-Blueprint.png';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        };
        img.src = url;
    },

    exportPDF: function() {
        const svgNode = document.getElementById('blueprint').cloneNode(true);
        const layersToHide = ['smart-guides', 'measure-group', 'column-container', 'dim-group'];
        layersToHide.forEach(id => {
            const el = svgNode.querySelector(`#${id}`);
            if (el) el.remove();
        });
        
        svgNode.querySelectorAll('.room-selected').forEach(el => {
            el.classList.remove('room-selected');
            el.setAttribute('stroke', '#ffffff');
        });

        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        let totalArea = "0.0";
        if (typeof elements !== 'undefined') {
            totalArea = elements
                .filter(el => !el.isFurniture && el.type !== 'staircase')
                .reduce((sum, el) => sum + ((el.w * el.h) / 144), 0)
                .toFixed(1);
        }
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>ArchCAD_Blueprint</title>
                    <style>
                        body { margin: 0; padding: 0; background: #ffffff; font-family: sans-serif; }
                        .print-wrapper { width: 100vw; height: 100vh; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
                        .frame { flex-grow: 1; border: 4px solid #0f172a; position: relative; overflow: hidden; display: flex; justify-content: center; align-items: center; background: #0f172a; }
                        svg { width: 100%; height: 100%; object-fit: contain; }
                        .title-block { position: absolute; bottom: 0; right: 0; width: 400px; background: white; border-top: 4px solid #0f172a; border-left: 4px solid #0f172a; display: grid; grid-template-columns: 1fr 1fr; color: #0f172a; }
                        .title-header { grid-column: span 2; padding: 12px; background: #0f172a; color: white; text-align: center; font-weight: 900; font-size: 1.2rem; letter-spacing: 2px; }
                        .title-cell { padding: 10px; border-right: 2px solid #0f172a; border-bottom: 2px solid #0f172a; font-size: 0.7rem; }
                        .title-cell:nth-child(even) { border-right: none; }
                        .title-cell strong { color: #64748b; }
                        .title-val { display: block; font-size: 1rem; font-weight: bold; margin-top: 4px; }
                        @page { size: landscape; margin: 0; }
                    </style>
                </head>
                <body>
                    <div class="print-wrapper">
                        <div class="frame">
                            ${svgNode.outerHTML}
                            <div class="title-block">
                                <div class="title-header">ARCHCAD PRO</div>
                                <div class="title-cell"><strong>PROJECT</strong><span class="title-val">Floorplan</span></div>
                                <div class="title-cell"><strong>DATE</strong><span class="title-val">${new Date().toLocaleDateString()}</span></div>
                                <div class="title-cell" style="border-bottom: none;"><strong>DRAWN BY</strong><span class="title-val">System Admin</span></div>
                                <div class="title-cell" style="border-bottom: none;"><strong>TOTAL AREA</strong><span class="title-val">${totalArea} sqft</span></div>
                            </div>
                        </div>
                    </div>
                    <script>
                        window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    },

    exportDXF: function() {
        // Safe access to DOM values mapped in UI object or directly via ID
        const unit = document.getElementById('unitSelect') ? document.getElementById('unitSelect').value : 'in';
        const SCALE = parseFloat(document.getElementById('scaleInput') ? document.getElementById('scaleInput').value : 1.2) || 1.2;
        const geom = typeof calculateGeometry === 'function' ? calculateGeometry(SCALE, unit) : null;
        
        if (!geom) return alert("Geometry engine not ready!");

        let dxf = "  0\nSECTION\n  2\nHEADER\n  0\nENDSEC\n  0\nSECTION\n  2\nENTITIES\n";
        const addLine = (x1, y1, x2, y2, layer = "0") => {
            dxf += `  0\nLINE\n  8\n${layer}\n`;
            dxf += ` 10\n${x1.toFixed(2)}\n 20\n${y1.toFixed(2)}\n 30\n0.0\n`;
            dxf += ` 11\n${x2.toFixed(2)}\n 21\n${y2.toFixed(2)}\n 31\n0.0\n`;
        };

        const { A, B, C, D, I, J, K, L } = geom;
        const toReal = (val, origin) => (val - origin) / SCALE;

        // Plot Boundaries
        addLine(toReal(A.x, 500), toReal(A.y, 500), toReal(B.x, 500), toReal(B.y, 500), "PLOT");
        addLine(toReal(B.x, 500), toReal(B.y, 500), toReal(C.x, 500), toReal(C.y, 500), "PLOT");
        addLine(toReal(C.x, 500), toReal(C.y, 500), toReal(D.x, 500), toReal(D.y, 500), "PLOT");
        addLine(toReal(D.x, 500), toReal(D.y, 500), toReal(A.x, 500), toReal(A.y, 500), "PLOT");

        // Built-up Area
        addLine(toReal(I.x, 500), toReal(I.y, 500), toReal(J.x, 500), toReal(J.y, 500), "BUILT_UP");
        addLine(toReal(J.x, 500), toReal(J.y, 500), toReal(K.x, 500), toReal(K.y, 500), "BUILT_UP");
        addLine(toReal(K.x, 500), toReal(K.y, 500), toReal(L.x, 500), toReal(L.y, 500), "BUILT_UP");
        addLine(toReal(L.x, 500), toReal(L.y, 500), toReal(I.x, 500), toReal(I.y, 500), "BUILT_UP");

        // Rooms
        if (typeof elements !== 'undefined') {
            elements.forEach(el => {
                // Ensure currentFloor is globally accessed
                const cFloor = typeof window.currentFloor !== 'undefined' ? window.currentFloor : 0;
                if (el.floor !== cFloor || el.isFurniture) return;
                const rx = toReal(I.x, 500) + el.x;
                const ry = toReal(I.y, 500) + el.y;
                addLine(rx, ry, rx + el.w, ry, "WALLS");
                addLine(rx + el.w, ry, rx + el.w, ry + el.h, "WALLS");
                addLine(rx + el.w, ry + el.h, rx, ry + el.h, "WALLS");
                addLine(rx, ry + el.h, rx, ry, "WALLS");
            });
        }

        dxf += "  0\nENDSEC\n  0\nEOF\n";
        this.downloadBlob(dxf, `ArchCAD_Export_${new Date().getTime()}.dxf`, 'text/plain');
    },

    exportGLB: function() {
        if (!window.is3DMode || typeof Engine3D === 'undefined' || !Engine3D.buildingGroup) {
            return alert("Please open the 3D Preview first to generate the mesh!");
        }
        
        if (typeof THREE.GLTFExporter === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js';
            script.onload = () => this.runGLTFExport();
            document.head.appendChild(script);
        } else {
            this.runGLTFExport();
        }
    },

    runGLTFExport: function() {
        const exporter = new THREE.GLTFExporter();
        exporter.parse(Engine3D.buildingGroup, (gltf) => {
            this.downloadBlob(gltf, `ArchCAD_3D_Model_${new Date().getTime()}.glb`, 'application/octet-stream');
        }, { binary: true });
    }
};

// ==========================================
// 🌐 GLOBAL HOOKS
// ==========================================

// Hooks for Settings Engine
window.toggleSettings = function() {
    if (typeof toggleOverlayPanel === 'function') {
        toggleOverlayPanel('settings-overlay', 'settings-btn', 'rgba(148, 163, 184, 0.4)', 'rgba(148, 163, 184, 0.15)');
    }
};

// Hooks for Nav Action Engine
window.refreshProjectStatsUI = (geom) => NavActionEngine.refreshStats(geom);
window.exportPNG = () => NavActionEngine.exportPNG();
window.exportPDF = () => NavActionEngine.exportPDF();
window.exportDXF = () => NavActionEngine.exportDXF();
window.exportGLB = () => NavActionEngine.exportGLB();
window.exportJSON = () => NavActionEngine.exportProjectJSON();

// ==========================================
// 🚀 INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Init Navbar Action Buttons
    NavActionEngine.init();
    
    // Init Settings Dropdown
    SettingsEngine.init();
    
    // Refresh DOM Cache 
    if (typeof initDOMCache === 'function') {
        initDOMCache();
    }
});