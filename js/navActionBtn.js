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
        { id: 'project-info-btn', title: 'Project Details', icon: 'i', themeClass: 'theme-blue', iconClass: 'italic-serif', actionType: 'TOGGLE_INFO' },
        { id: 'save-project-btn', title: 'Save Project JSON', icon: '💾', themeClass: 'theme-blue', actionType: 'SAVE_PROJECT' },
        { id: 'load-project-btn', title: 'Load Project JSON', icon: '📂', themeClass: 'theme-yellow', actionType: 'LOAD_PROJECT' },
        { id: 'reset-workspace-btn', title: 'Factory Reset', icon: '⚠️', themeClass: 'theme-red', actionType: 'RESET_WORKSPACE' }
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

// ==========================================
// 🧩 NAVBAR ACTION ENGINE
// ==========================================
const NavActionEngine = {
    init: function() {
        const container = document.getElementById(NAV_ACTION_CONFIG.containerId);
        if (!container) return;

        // 1. Build the 4 Buttons
        let html = NAV_ACTION_CONFIG.buttons.map(btn => {
            const iconClass = btn.iconClass ? ` ${btn.iconClass}` : '';
            return `
                <button id="${btn.id}" class="${NAV_ACTION_CONFIG.classes.baseBtn} ${btn.themeClass}" title="${btn.title}" onclick="NavActionEngine.handleAction('${btn.actionType}')">
                    <span class="${NAV_ACTION_CONFIG.classes.icon}${iconClass}">${btn.icon}</span>
                </button>
            `;
        }).join('');

        // 2. Inject a Hidden File Input for the "Load JSON" functionality
        html += `<input type="file" id="${NAV_ACTION_CONFIG.fileInputId}" style="display:none" accept=".json">`;
        container.innerHTML = html;

        // 3. Bind the Import Event Listener
        const importInput = document.getElementById(NAV_ACTION_CONFIG.fileInputId);
        if (importInput) {
            importInput.addEventListener('change', (e) => this.importProjectJSON(e));
        }

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
        else console.warn(`ActionType '${actionType}' is unhandled in Nav Action Engine.`);
    },

    // -----------------------------------------
    // 💼 BUSINESS LOGIC & STATE MUTATION
    // -----------------------------------------
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
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "ArchCAD_Project_" + Math.floor(Date.now() / 1000) + ".json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    importProjectJSON: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!importedData.elements) return alert("Invalid project file.");
                
                // Directly mutate the global variables
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
                
                // Reset the input so the same file can be loaded again if needed
                document.getElementById(NAV_ACTION_CONFIG.fileInputId).value = ''; 
            } catch (error) { 
                alert("Error parsing file: " + error.message); 
            }
        };
        reader.readAsText(file);
    },

    async resetWorkspace() {
        if (confirm("⚠️ This will completely erase your building. Continue?")) {
            if (typeof clearTextureCache === 'function') clearTextureCache();
            
            // Empty globals
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
                } catch(e) {
                    console.warn('DB clear failed');
                }
            }
            localStorage.removeItem('ArchCAD_AutoSave');
            
            if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
            if (typeof setFloor === 'function') setFloor(0);
            if (typeof updateCanvas === 'function') updateCanvas();
            if (typeof generate3DModel === 'function') generate3DModel();
        }
    }
};

// Global Hook for Math Engine
window.refreshProjectStatsUI = (geom) => NavActionEngine.refreshStats(geom);

// Auto-Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    NavActionEngine.init();
});