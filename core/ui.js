// =========================================
// UI & DOM MANAGEMENT (ui.js)
// =========================================

const UI = {
    // Inputs
    scaleInput: null, unitSelect: null, compassDir: null,
    inW: null, inH: null, roadSide: null,
    smartMergeToggle: null, real3DToggle: null,
    showLabelsToggle: null, showOffsetsToggle: null, showDims: null,
    
    // Static SVG Layers & Displays
    blueprint: null, viewport: null, elementContainer: null,
    dimContainer: null, siteOffsets: null, fixtureContainer: null,
    columnContainer: null, dirTop: null, dirRight: null,
    outerPoly: null, innerRect: null, roadPoly: null, roadText: null,
    
    // Stats Panels
    plotArea: null, buildArea: null, stairWarning: null,

    gridSnapToggle: null,
    
    // App State Tracking
    isSpacePanMode: false, isSpacePanning: false, spacePanStart: { x: 0, y: 0 }
};

let ctrl, container, dimContainer;

function initDOMCache() {
    UI.scaleInput = document.getElementById('scaleInput');
    UI.unitSelect = document.getElementById('unitSelect');
    UI.compassDir = document.getElementById('compassDir');
    UI.inW = document.getElementById('inW');
    UI.inH = document.getElementById('inH');
    UI.roadSide = document.getElementById('roadSide');
    UI.smartMergeToggle = document.getElementById('smartMergeToggle');
    UI.real3DToggle = document.getElementById('real3DToggle');
    UI.showLabelsToggle = document.getElementById('showLabelsToggle');
    UI.showOffsetsToggle = document.getElementById('showOffsetsToggle');
    UI.showColsToggle = document.getElementById('showColsToggle');
    UI.showDims = document.getElementById('showDims');
    
    UI.blueprint = document.getElementById('blueprint');
    UI.viewport = document.getElementById('viewport');
    UI.elementContainer = document.getElementById('element-container');
    UI.dimContainer = document.getElementById('dim-container');
    UI.siteOffsets = document.getElementById('site-offsets');
    UI.fixtureContainer = document.getElementById('fixture-container');
    UI.columnContainer = document.getElementById('column-container');
    UI.dirTop = document.getElementById('dir-top');
    UI.dirRight = document.getElementById('dir-right');
    UI.outerPoly = document.getElementById('outer-poly');
    UI.innerRect = document.getElementById('inner-rect');
    UI.roadPoly = document.getElementById('road-poly');
    UI.roadText = document.getElementById('road-text');
    
    UI.plotArea = document.getElementById('plot-area');
    UI.buildArea = document.getElementById('build-area');
    UI.stairWarning = document.getElementById('stair-warning');

    ctrl = document.getElementById('element-controls');
    container = document.getElementById('element-container');
    dimContainer = document.getElementById('dim-container');

    UI.gridSnapToggle = document.getElementById('gridSnapToggle');

    initAnimatedDropdowns();
}

function getFloorLabel(index) {
    if (index === 0) return 'G';
    if (index === 1) return '1st';
    if (index === 2) return '2nd';
    return `${index}th`;
}
function getFloorDisplayName(index) {
    if (index === 0) return 'Ground Floor';
    if (index === 1) return '1st Floor';
    if (index === 2) return '2nd Floor';
    return `${index}th Floor`;
}
function renderFloorButtons(containerId, count, activeFloor, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const btn = document.createElement('button');
        btn.className = `floor-btn ${i === activeFloor ? 'active' : ''}`;
        btn.dataset.floor = i;
        btn.textContent = getFloorLabel(i);
        btn.onclick = () => {
            if (typeof callback === 'function') callback(i);
            else if (typeof window[callback] === 'function') window[callback](i);
        };
        container.appendChild(btn);
    }
}
function toggleOverlayPanel(panelId, buttonId, activeColor, inactiveColor) {
    const panel = document.getElementById(panelId);
    const btn = document.getElementById(buttonId);
    if (!panel) return;

    const isOpen = panel.style.display === 'block' && panel.style.opacity !== '0';

    if (!isOpen) {
        panel.style.display = 'block';
        if (btn) {
            btn.style.transform = 'scale(0.8)';
            btn.style.background = activeColor;
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
            btn.style.background = inactiveColor;
            setTimeout(() => btn.style.transform = 'scale(1)', 150);
        }
        panel.style.opacity = '0';
        panel.style.transform = 'scale(0)';
        panel.style.pointerEvents = 'none';
        setTimeout(() => {
            panel.style.display = 'none';
        }, 400);
    }
}

// =========================================
// UI CONTROLS & SIDEBAR
// =========================================
function handleCompassChange() {
    globalCompassDir = document.getElementById('compassDir').value;
    if (typeof updateCanvas === 'function') updateCanvas();
}
const calcInches = () => { 
    const ftInput = document.getElementById('calcFt');
    const inInput = document.getElementById('calcIn');
    
    const ft = parseFloat(ftInput.value) || 0; 
    const inc = parseFloat(inInput.value) || 0; 
    const total = ft * 12 + inc;
    
    // Update the main big result
    document.getElementById('resIn').value = total + " in"; 

    // Update the micro-inputs and text in the minimized pill
    const minFt = document.getElementById('minFt');
    const minIn = document.getElementById('minIn');
    const minText = document.getElementById('qc-min-text');
    
    // Check activeElement so we don't accidentally overwrite the input the user is currently typing in
    if (minFt && document.activeElement !== minFt) minFt.value = ftInput.value;
    if (minIn && document.activeElement !== minIn) minIn.value = inInput.value;
    if (minText) minText.innerText = total + '"';
};


function getRoomDisplayName(index) {
    const el = elements[index];
    let count = 0;
    for(let i = 0; i <= index; i++) {
        if(elements[i].type === el.type && elements[i].floor === el.floor) count++;
    }
    if (el.type === 'bedroom') return count === 1 ? 'MASTER BEDROOM' : `BEDROOM ${count - 1}`;
    if (el.type === 'toilet' || el.type === 'staircase') return `${el.type.toUpperCase()} ${count}`;
    return el.type.toUpperCase();
}

// =========================================
// MAIN SIDEBAR ORCHESTRATOR
// =========================================
function renderSidebar() {
    const ctrl = document.getElementById('element-controls');
    if (!ctrl) return;
    ctrl.innerHTML = '';
    const studioBtn = document.getElementById('btn-room-studio');
    if (studioBtn) {
        if (selectedElIndex !== -1 && !elements[selectedElIndex].isFurniture) {
            studioBtn.style.display = 'flex'; 
        } else {
            studioBtn.style.display = 'none'; 
        }
    }
    if (typeof UI.prevSelected === 'undefined') UI.prevSelected = -1;
    let isGoingBack = UI.prevSelected !== -1 && selectedElIndex === -1;
    let isGoingDeeper = UI.prevSelected === -1 && selectedElIndex !== -1;
    let animClass = isGoingBack ? 'slide-in-left' : (isGoingDeeper ? 'slide-in-right' : 'fade-in-ui');
    UI.prevSelected = selectedElIndex;
    // 🌟 THE FIX: The auto-switching logic that forced the "Interiors" tab to open has been removed.
    // if (selectedElIndex !== -1) {
    //     const tabInteriors = document.getElementById('drawer-tab-interiors');
    //     const tabBtn = document.querySelector('.drawer-tab-btn:nth-child(3)');
    //     if (tabInteriors && !tabInteriors.classList.contains('active') && tabBtn) {
    //         if (typeof switchDrawerTab === 'function') switchDrawerTab({ currentTarget: tabBtn }, 'interiors');
    //     }
    // }
    if (selectedElIndex === -1) {
        ctrl.innerHTML = buildExplorerView(animClass);
    } else {
        const el = elements[selectedElIndex];
        if (!el) return; 
        const div = document.createElement('div');
        div.className = animClass;
        div.innerHTML = buildEditorView(selectedElIndex, el) + buildFixturesView(selectedElIndex, el);
        ctrl.appendChild(div);
    }
    if (typeof initAnimatedDropdowns === 'function') initAnimatedDropdowns();
}

// =========================================
// SUB-VIEW 1: ROOM EXPLORER
// =========================================
function buildExplorerView(animClass) {
    let count = parseInt(document.getElementById('b-floors').value) || 1;
    let floorOptions = '';
    for(let i = 0; i < count; i++) {
        const label = getFloorDisplayName(i);
        floorOptions += `<option value="${i}" ${i === currentFloor ? 'selected' : ''}>${label}</option>`;
    }
    let html = `
        <div class="${animClass}">
            <div class="neo-explorer-panel">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <span class="neo-label" style="color: #f59e0b;">📋 ROOM EXPLORER</span>
                        <span style="font-size: 0.65rem; color: #94a3b8;">Select a room to edit</span>
                    </div>
                    <select class="modern-select neo-sunken" style="width: 120px;" onchange="setFloor(parseInt(this.value));">
                        ${floorOptions}
                    </select>
                </div>
                <div class="explorer-scroll">
    `;
    const floorElements = elements.map((el, idx) => ({...el, idx})).filter(e => e.floor === currentFloor);
    if (floorElements.length === 0) {
        html += `
            <div class="neo-sunken" style="text-align: center; color: #a78bfa; font-size: 0.75rem; padding: 20px;">
                No rooms on this floor.<br>Add one from the buttons above!
            </div>`;
    } else {
        floorElements.forEach(el => {
            const name = el.customName || getRoomDisplayName(el.idx);
            const area = ((el.w * el.h)/144).toFixed(1);
            let rgb = '139, 92, 246'; 
            if (typeof ARCH_CONFIG !== 'undefined' && ARCH_CONFIG.COLORS && ARCH_CONFIG.COLORS[el.type]) rgb = ARCH_CONFIG.COLORS[el.type].rgb;
            if (el.customColor) {
                const hex = el.customColor.replace('#', '');
                rgb = `${parseInt(hex.substring(0,2),16)}, ${parseInt(hex.substring(2,4),16)}, ${parseInt(hex.substring(4,6),16)}`;
            }
            const emoji = el.isFurniture ? '🛋️' : (el.type === 'staircase' ? '🪜' : (el.type === 'balcony' ? '🌿' : '🚪'));
            html += `
                <div class="neo-card" style="border-left: 4px solid rgb(${rgb});" onclick="selectedElIndex = ${el.idx}; renderSidebar(); updateCanvas();">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="font-size: 1.2rem; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; box-shadow: inset 1px 1px 3px rgba(0,0,0,0.5);">${emoji}</div>
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <span style="color: #f8fafc; font-size: 0.75rem; font-weight: bold; letter-spacing: 0.5px;">${name}</span>
                            <span style="color: #94a3b8; font-size: 0.65rem; font-family: monospace;">${Math.floor(el.w/12)}'${Math.round(el.w%12)}" × ${Math.floor(el.h/12)}'${Math.round(el.h%12)}"</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                        <span class="explorer-badge" style="background: transparent; border:none; box-shadow: inset 2px 2px 4px rgba(0,0,0,0.5); padding: 4px 8px;">${area} sqft</span>
                    </div>
                </div>
            `;
        });
    }

    html += `</div></div></div>`;
    return html;
}

// =========================================
// SUB-VIEW 2: ROOM EDITOR
// =========================================
function buildEditorView(i, el) {
    let staircaseControls = '';
    // 🌟 NEW: PARAMETRIC STAIRCASE UI
    if (el.type === 'staircase') {
        const wallH = typeof ARCH_CONFIG !== 'undefined' ? ARCH_CONFIG.DEFAULTS.WALL_HEIGHT_3D : 120;
        const steps = Math.round(wallH / 7.5); // Standard 7.5 inch riser height
        staircaseControls = `
            <div class="neo-sunken" style="padding: 12px; margin-bottom: 15px; display: flex; flex-direction: column; gap: 12px; background: rgba(0,0,0,0.15);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="neo-label">STAIR STYLE</span>
                    <select class="neo-sunken" style="width: 125px; padding: 4px; font-size: 0.65rem;" 
                        onchange="elements[${i}].stairStyle=this.value; if(typeof ProjectState !== 'undefined') ProjectState.saveState(); updateCanvas(); if(typeof generate3DModel === 'function') generate3DModel();">
                        <option value="u-shape" ${!el.stairStyle || el.stairStyle === 'u-shape' ? 'selected' : ''}>U-Shape (Return)</option>
                        <option value="l-shape" ${el.stairStyle === 'l-shape' ? 'selected' : ''}>L-Shape (Quarter)</option>
                        <option value="straight" ${el.stairStyle === 'straight' ? 'selected' : ''}>Straight Run</option>
                    </select>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 10px;">
                    <span class="neo-label">CALCULATED</span>
                    <span style="font-size: 0.7rem; color: #10b981; font-weight: bold;">${steps} Steps (7.5" Riser)</span>
                </div>
                <button class="neo-btn outline-cyan" style="padding: 6px; font-size: 0.7rem;" onclick="rotateStaircase(${i})" title="Rotate Staircase">
                    🔄 DIRECTION: ${el.dir ? el.dir.toUpperCase() : 'UP'}
                </button>
            </div>
        `;
    }
    
    const defaultHex = "#38bdf8"; 

    return `
        <button onclick="selectedElIndex = -1; renderSidebar(); updateCanvas();" class="neo-back-btn">
            <span style="font-size: 1.2rem; margin-right: 8px;">←</span> BACK TO EXPLORER
        </button>

        <div class="neo-explorer-panel">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="neo-label" style="color: #38bdf8;">📐 ${getRoomDisplayName(i)}</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" class="neo-sunken" placeholder="Custom Name" value="${el.customName || ''}" 
                        oninput="elements[${i}].customName=this.value; updateCanvas();" 
                        style="width: 85px; font-size: 0.75rem; padding: 6px;">
                    
                    <!-- 🌟 NEW: MATERIAL DROPDOWN 🌟 -->
                    <select class="neo-sunken" style="width: 85px; padding: 4px; font-size: 0.65rem;" 
                            onchange="elements[${i}].material=this.value; updateCanvas(); if(typeof is3DMode !== 'undefined' && is3DMode && typeof generate3DModel === 'function') generate3DModel();">
                        <option value="auto" ${!el.material || el.material === 'auto' ? 'selected' : ''}>Auto</option>
                        <option value="wood" ${el.material === 'wood' ? 'selected' : ''}>Wood</option>
                        <option value="kitchen-tile" ${el.material === 'kitchen-tile' ? 'selected' : ''}>Tile 1</option>
                        <option value="bathroom-tile" ${el.material === 'bathroom-tile' ? 'selected' : ''}>Tile 2</option>
                        <option value="grass" ${el.material === 'grass' ? 'selected' : ''}>Grass</option>
                        <option value="concrete" ${el.material === 'concrete' ? 'selected' : ''}>Concrete</option>
                        <option value="shingle" ${el.material === 'shingle' ? 'selected' : ''}>Shingle</option>
                    </select>

                    <div class="neo-color-wrapper" title="Change Room Color">
                        <input type="color" value="${el.customColor || defaultHex}" 
                            oninput="elements[${i}].customColor=this.value; updateCanvas(false); updateRoomMaterial3D(${i}, parseInt(this.value.replace('#', '0x')));">
                    </div>
                </div>
            </div>

            <div class="neo-divider"></div>

            <div class="neo-sunken" style="display: flex; flex-wrap: wrap; gap: 8px; padding: 12px; margin-bottom: 15px;">
                ${staircaseControls}
                <button class="neo-btn" onclick="centerOnSelection()" title="Center View">🎯</button>
                ${!el.isFurniture ? `
                    <button class="neo-btn outline-yellow" onclick="addDoor(${i})" title="Add Door">🚪</button>
                    <button class="neo-btn outline-cyan" onclick="addWindow(${i})" title="Add Window">🪟</button>
                ` : ''}
                <button class="neo-btn" onclick="rotateElement(${i})" title="Rotate">🔄</button>
                <button class="neo-btn" onclick="cloneElement(${i})" title="Duplicate">📋</button>
                <button class="neo-btn ${el.locked ? 'outline-yellow' : ''}" onclick="elements[${i}].locked = !elements[${i}].locked; renderSidebar();" title="Lock">${el.locked ? '🔒' : '🔓'}</button>
                <button class="neo-btn outline-yellow" style="color: #ef4444;" onclick="deleteElement(${i})" title="Delete">🗑️</button>
            </div>  

            <div class="neo-sunken" style="padding: 15px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label class="neo-label">WIDTH (in)</label>
                        <input type="number" class="neo-sunken" value="${el.w}" oninput="elements[${i}].w=parseInt(this.value); updateCanvas()" style="text-align: center; font-family: monospace;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label class="neo-label">HEIGHT (in)</label>
                        <input type="number" class="neo-sunken" value="${el.h}" oninput="elements[${i}].h=parseInt(this.value); updateCanvas()" style="text-align: center; font-family: monospace;">
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label class="neo-label" style="width: 15px;">X</label>
                        <input type="number" id="num-x-${i}" class="neo-sunken" value="${el.x}" 
                            oninput="elements[${i}].x=parseInt(this.value); document.getElementById('range-x-${i}').value=this.value; updateCanvas(); if(typeof is3DMode !== 'undefined' && is3DMode) debounced3DUpdate();" 
                            style="width: 65px; text-align: center; padding: 6px; font-family: monospace;">
                        <input type="range" class="neo-range" id="range-x-${i}" min="0" max="800" value="${el.x}" 
                            oninput="elements[${i}].x=parseInt(this.value); document.getElementById('num-x-${i}').value=this.value; debouncedUpdateCanvas(); if(typeof is3DMode !== 'undefined' && is3DMode) debounced3DUpdate();" 
                            style="flex-grow: 1;">
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label class="neo-label" style="width: 15px;">Y</label>
                        <input type="number" id="num-y-${i}" class="neo-sunken" value="${el.y}" 
                            oninput="elements[${i}].y=parseInt(this.value); document.getElementById('range-y-${i}').value=this.value; updateCanvas(); if(typeof is3DMode !== 'undefined' && is3DMode) debounced3DUpdate();" 
                            style="width: 65px; text-align: center; padding: 6px; font-family: monospace;">
                        <input type="range" class="neo-range" id="range-y-${i}" min="0" max="800" value="${el.y}" 
                            oninput="elements[${i}].y=parseInt(this.value); document.getElementById('num-y-${i}').value=this.value; debouncedUpdateCanvas(); if(typeof is3DMode !== 'undefined' && is3DMode) debounced3DUpdate();" 
                            style="flex-grow: 1;">
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =========================================
// SUB-VIEW 3: FIXTURES LIST
// =========================================
function buildFixturesView(i, el) {
    const roomFixtures = fixtures.filter(f => f.roomId === i);
    if (roomFixtures.length === 0) return ''; // No fixtures, return empty

    let html = `
        <div style="display: flex; align-items: center; gap: 6px; margin-top: 20px; margin-bottom: 10px;">
            <div class="neo-divider" style="margin: 0; flex-grow: 1; height: 2px;"></div>
            <span class="neo-label">ATTACHED FIXTURES</span>
            <div class="neo-divider" style="margin: 0; flex-grow: 1; height: 2px;"></div>
        </div>`;
    
    roomFixtures.forEach((fix) => {
        const globalIdx = fixtures.indexOf(fix);
        const maxOffset = (fix.edge === 'bottom' || fix.edge === 'top') ? (el.w - fix.size) : (el.h - fix.size);
        const emoji = fix.type === 'door' ? '🚪' : '🪟';
        const accentColor = fix.type === 'door' ? 'outline-yellow' : 'outline-cyan'; 

        html += `
            <div class="neo-panel" style="padding: 12px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <span class="neo-label ${accentColor}" style="font-size: 0.75rem;">${emoji} ${fix.type.toUpperCase()}</span>
                    
                    <button class="neo-btn-icon danger" onclick="fixtures.splice(${globalIdx},1); renderSidebar(); updateCanvas()" title="Remove ${fix.type}">
                        &times;
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label class="neo-label">SIZE</label>
                        <input type="number" class="neo-sunken" value="${fix.size}" 
                            oninput="fixtures[${globalIdx}].size=parseInt(this.value); document.getElementById('range-fix-${globalIdx}').max = (fixtures[${globalIdx}].edge === 'bottom' || fixtures[${globalIdx}].edge === 'top') ? (${el.w} - this.value) : (${el.h} - this.value); updateCanvas();" 
                            style="text-align: center; font-family: monospace; padding: 8px;">
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <label class="neo-label">WALL EDGE</label>
                        <select class="modern-select neo-sunken" onchange="fixtures[${globalIdx}].edge=this.value; renderSidebar(); updateCanvas()">
                            <option value="bottom" ${fix.edge==='bottom'?'selected':''}>Bottom</option>
                            <option value="top" ${fix.edge==='top'?'selected':''}>Top</option>
                            <option value="left" ${fix.edge==='left'?'selected':''}>Left</option>
                            <option value="right" ${fix.edge==='right'?'selected':''}>Right</option>
                        </select>
                    </div>
                </div>

                <div class="neo-sunken" style="display: flex; flex-direction: column; gap: 8px; padding: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label class="neo-label">WALL OFFSET</label>
                        <input type="number" id="num-fix-${globalIdx}" class="neo-sunken" value="${fix.offset}" 
                            oninput="fixtures[${globalIdx}].offset=parseInt(this.value); document.getElementById('range-fix-${globalIdx}').value=this.value; updateCanvas()" 
                            style="width: 65px; text-align: center; padding: 6px; font-family: monospace;">
                    </div>
                    <input type="range" class="neo-range" id="range-fix-${globalIdx}" min="0" max="${maxOffset}" value="${fix.offset}" 
                        oninput="fixtures[${globalIdx}].offset=parseInt(this.value); document.getElementById('num-fix-${globalIdx}').value=this.value; updateCanvas()" 
                        style="width: 100%; margin-top: 4px;">
                </div>
            </div>`;
    });

    return html;
}






function renderFloorSelectors() {
    let count = parseInt(document.getElementById('b-floors').value);
    if (count < 1 || isNaN(count)) count = 1;

    const container = document.getElementById('floor-layout-selectors');
    if (container) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const fName = i === 0 ? 'Ground' : i === 1 ? '1st' : i === 2 ? '2nd' : `${i}th`;
            container.innerHTML += `
                <div class="field">
                    <label>${fName} Floor Layout:</label>
                    <select id="layout-f${i}" class="modern-select">
                        <option value="none">Empty / Open Terrace</option>
                        <option value="1bhk">1 BHK</option>
                        <option value="2bhk" ${i === 0 ? 'selected' : ''}>2 BHK</option>
                        <option value="3bhk">3 BHK</option>
                    </select>
                </div>`;
        }
    }

    renderFloorButtons('top-floor-tabs', count, currentFloor, 'setFloor');
    renderFloorButtons('floor-tabs', count, currentFloor, 'setFloor');

    if (typeof initAnimatedDropdowns === 'function') {
        initAnimatedDropdowns();
    }
}

/*UI TOGGLES & THEMES*/
function toggleTheme() {
    const isClassic = document.body.classList.toggle('classic-theme');
    if (typeof updateCanvas === 'function') updateCanvas(); 
    if (typeof scene3D !== 'undefined' && scene3D) {
        const bgColor = isClassic ? 0xe2e8f0 : 0x0f172a; 
        scene3D.background.setHex(bgColor);
        if (scene3D.fog) scene3D.fog.color.setHex(bgColor);
    }
}

// =========================================
// CUSTOM DROPDOWN ENGINE
// =========================================
// document.addEventListener('DOMContentLoaded', () => {
//     const btn = document.getElementById('ai-generate-btn');
//     if (btn) btn.addEventListener('click', handleAICommand);
// });
document.addEventListener('click', () => {
    document.querySelectorAll('.pro-dropdown-wrapper').forEach(w => w.classList.remove('open'));
});




// =========================================
// PRO ANIMATED DROPDOWNS ENGINE (Upgraded)
// =========================================
function initAnimatedDropdowns() {
    const selects = document.querySelectorAll('select:not([data-customized])');
    
    selects.forEach(select => {
        select.style.display = 'none';
        select.setAttribute('data-customized', 'true');
        
        const wrapper = document.createElement('div');
        wrapper.className = 'pro-dropdown-wrapper';
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select); 
        
        const header = document.createElement('div');
        header.className = 'pro-dropdown-header';
        
        const selectedText = document.createElement('span');
        selectedText.className = 'pro-dropdown-value';
        selectedText.textContent = select.options[select.selectedIndex]?.text || '';
        
        const arrow = document.createElement('span');
        arrow.className = 'pro-dropdown-arrow';
        arrow.textContent = '▼';
        
        header.appendChild(selectedText);
        header.appendChild(arrow);
        wrapper.appendChild(header);
        
        const list = document.createElement('div');
        list.className = 'pro-dropdown-list';
        list.style.maxHeight = '300px'; // Prevents list from overflowing screen
        list.style.overflowY = 'auto';  // Adds scrollbar to the dropdown
        
        // Helper function to build clickable items
        const createOptionItem = (option) => {
            const item = document.createElement('div');
            item.className = 'pro-dropdown-item';
            const index = Array.from(select.options).indexOf(option);
            
            if (index === select.selectedIndex) item.classList.add('selected');
            item.textContent = option.text;
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                select.selectedIndex = index;
                selectedText.textContent = option.text;
                select.dispatchEvent(new Event('change')); 
                
                list.querySelectorAll('.pro-dropdown-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                wrapper.classList.remove('open');
            });
            list.appendChild(item);
        };

        // Parse standard options AND optgroups
        Array.from(select.children).forEach(child => {
            if (child.tagName === 'OPTGROUP') {
                const groupLabel = document.createElement('div');
                groupLabel.className = 'pro-dropdown-group';
                groupLabel.textContent = child.label;
                // Premium styling for the category headers
                groupLabel.style.cssText = 'font-size: 0.65rem; color: #38bdf8; padding: 10px 12px 4px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; background: rgba(0,0,0,0.5); pointer-events: none;';
                list.appendChild(groupLabel);
                
                Array.from(child.children).forEach(option => createOptionItem(option));
            } else if (child.tagName === 'OPTION') {
                createOptionItem(child);
            }
        });
        
        wrapper.appendChild(list);
        
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.pro-dropdown-wrapper').forEach(w => {
                if (w !== wrapper) w.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });
    });
}
// =========================================
// 🌟 SPLIT SCREEN RESIZER ENGINE
// =========================================
function initSplitScreen() {
    const resizer = document.getElementById('split-resizer');
    const leftSide = document.getElementById('canvas-wrapper');
    const rightSide = document.getElementById('right-canvas-wrapper');
    const workspace = document.getElementById('main-workspace');
    
    if (!resizer || !leftSide || !rightSide) return;
    let isDragging = false;

    resizer.addEventListener('mousedown', function(e) {
        isDragging = true;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        
        // Disable pointer events to stop the mouse from catching on elements
        leftSide.style.pointerEvents = 'none';
        rightSide.style.pointerEvents = 'none';
    });
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        const rect = workspace.getBoundingClientRect();
        let newWidthPercent = ((e.clientX - rect.left) / rect.width) * 100;
        
        // Min 15%, Max 85% limits
        if (newWidthPercent < 15) newWidthPercent = 15;
        if (newWidthPercent > 85) newWidthPercent = 85;
        
        leftSide.style.flex = `0 0 ${newWidthPercent}%`;
        rightSide.style.flex = `1 1 0%`; 
    });
    document.addEventListener('mouseup', function(e) {
        if (isDragging) {
            isDragging = false;
            resizer.classList.remove('dragging');
            document.body.style.cursor = 'default';
            
            leftSide.style.pointerEvents = 'auto';
            rightSide.style.pointerEvents = 'auto';
            
            // Forces canvas elements to adjust their aspect ratios
            window.dispatchEvent(new Event('resize'));
        }
    });
}
document.addEventListener('DOMContentLoaded', initSplitScreen);
// =========================================
// 🌟 SPLIT SCREEN RESIZER ENGINE ends
// =========================================
// =========================================
// 🌟 AUTO-BUILDER DROPDOWN TOGGLE (Squeeze Effect)
// =========================================
window.toggleAutoBuilder = function() {
    toggleOverlayPanel('template-builder-overlay', 'auto-builder-btn', 'rgba(245, 158, 11, 0.4)', 'rgba(245, 158, 11, 0.15)');
};

// =========================================
// 🌟 PROJECT INFO DROPDOWN TOGGLE
// =========================================
window.toggleProjectInfo = function() {
    toggleOverlayPanel('project-info-overlay', 'project-info-btn', 'rgba(56, 189, 248, 0.4)', 'rgba(56, 189, 248, 0.15)');
};

// ==========================================
// WORKSPACE UI TOGGLES (Floating Panels)
// ==========================================
window.toggleWidget = function(widgetId, isVisible) {
    const widget = document.getElementById(widgetId);
    if (!widget) return;
    if (isVisible) {
        widget.style.display = ''; 
        widget.style.opacity = '0';
        setTimeout(() => {
            widget.style.transition = 'opacity 0.2s ease-in-out';
            widget.style.opacity = '1';
        }, 10);
    } else {
        widget.style.transition = 'opacity 0.2s ease-in-out';
        widget.style.opacity = '0';
        setTimeout(() => {
            widget.style.display = 'none';
        }, 200); 
    }
};
window.toggleCheatSheet = function() {
    const panel = document.getElementById('cheat-sheet-panel');
    if (!panel) return;
    
    if (panel.style.display === 'none') {
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
};
window.toggleTimeMachine = function() {
    let panel = document.getElementById('time-machine-panel');
    if(!panel) {
        panel = document.createElement('div');
        panel.id = 'time-machine-panel';
        panel.className = 'neo-panel';
        panel.style.cssText = 'position:fixed; bottom:20px; right:20px; width:300px; transform:translateY(150%); transition:transform 0.4s cubic-bezier(0.4,0,0.2,1); z-index:9999; display:flex; flex-direction:column;';
        document.body.appendChild(panel);
    }
    
    if (panel.style.transform.includes('translateY(150%)')) {
        renderTimeMachine();
        panel.style.transform = 'translateY(0)';
    } else {
        panel.style.transform = 'translateY(150%)';
    }
};
window.renderTimeMachine = function() {
    const panel = document.getElementById('time-machine-panel');
    if(!panel) return;
    
    let html = ProjectState.history.stack.map((item, idx) => {
        const isCurrent = idx === ProjectState.history.stack.length - 1;
        const color = isCurrent ? '#10b981' : '#38bdf8';
        return `
        <div class="ctx-item" onclick="ProjectState.jumpToTime(${idx})" style="padding: 10px; border-left: 3px solid ${color}; cursor:pointer;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#f8fafc; font-weight:bold; font-size:0.8rem;">${item.action}</span>
                <span style="color:#94a3b8; font-size:0.65rem;">${item.time}</span>
            </div>
        </div>`;
    }).reverse().join('');
    
    panel.innerHTML = `
        <div class="neo-panel-header" style="justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:10px;">
            <h2 style="color:#f59e0b;">⏳ TIME MACHINE</h2>
            <button class="neo-minimize-btn" onclick="toggleTimeMachine()">✕</button>
        </div>
        <div class="explorer-scroll" style="max-height: 250px; padding: 10px 0; display:flex; flex-direction:column; gap:6px;">
            ${html}
        </div>
    `;
};

// =========================================
// 🌟 DROPDOWN DRAWER (TABBED_LAYOUT)
// =========================================
window.toggleNavbarDrawer = function() {
    const drawer = document.getElementById('nav-drawer');
    const btn = document.getElementById('navbar-toggle-btn');
    if (drawer && btn) {
        const isOpen = drawer.classList.toggle('drawer-open');
        btn.classList.toggle('drawer-open', isOpen);
        if (isOpen) {
            setTimeout(() => {
              //btn.style.top = `${drawer.offsetHeight + 15}px`;
                btn.style.top = `${60 + drawer.offsetHeight - 10}px`;
            }, 50);
        } else {
            btn.style.top = '48px'; 
        }
    }
};
window.switchDrawerTab = function(event, tabId) {
    const clickedBtn = event.currentTarget;
    const targetPanel = document.getElementById(`drawer-tab-${tabId}`);
    const contentContainer = document.querySelector('.drawer-tabs-content');
    if (!targetPanel || !contentContainer) return;
    const isAlreadyActive = clickedBtn.classList.contains('active');
    document.querySelectorAll('.drawer-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.drawer-tab-panel').forEach(panel => panel.classList.remove('active'));
    if (isAlreadyActive) {
        contentContainer.style.display = 'none';
    } else {
        clickedBtn.classList.add('active');
        targetPanel.classList.add('active');
        contentContainer.style.display = 'block';
    }
    setTimeout(() => {
        const drawerPanel = document.getElementById('nav-drawer');
        const pullTab = document.getElementById('navbar-toggle-btn');
        
        if (drawerPanel && pullTab && drawerPanel.classList.contains('drawer-open')) {
            pullTab.style.top = `${60 + drawerPanel.offsetHeight - 10}px`;
        }
    }, 50); 
}
// =========================================
// 🌟 TOOLBAR WIDGET VISIBILITY TOGGLE (ANIMATED)
// =========================================
window.toggleNavTool = function(btnId, isVisible) {
    const btn = document.getElementById(btnId);
    if (btn) {
        if (isVisible) {
            btn.style.display = 'flex';
            setTimeout(() => {
                btn.classList.remove('hidden-tool');
            }, 10);
        } else {
            btn.classList.add('hidden-tool');
            setTimeout(() => {
                if (btn.classList.contains('hidden-tool')) {
                    btn.style.display = 'none';
                }
            }, 300);
            const overlayId = btnId.replace('-btn', '-overlay'); 
            const overlay = document.getElementById(overlayId);
            if (overlay) {
                overlay.style.display = 'none';
                overlay.style.opacity = '0';
                overlay.style.transform = 'scale(0)';
            }
        }
    }
};

// =========================================
// VASTU UI DASHBOARD UPDATER (Worker Receiver)
// =========================================
window.renderVastuUI = function(vastuData) {
    let vastuContainer = document.getElementById('vastu-widget-container');
    if (!vastuContainer) return;
    vastuContainer.innerHTML = `
        <div class="neo-sunken" style="margin-top: 20px; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 0.75rem; color: #cbd5e1; font-weight: bold; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                <span>🧭 VASTU SCORE</span>
                <span style="color: ${vastuData.color}; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 10px; box-shadow: 0 0 8px ${vastuData.color}44;">${vastuData.score}/100</span>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 50px; height: 50px; border-radius: 50%; background: conic-gradient(${vastuData.color} ${vastuData.score}%, #1e293b 0); display: flex; justify-content: center; align-items: center; box-shadow: inset 0 4px 8px rgba(0,0,0,0.5); flex-shrink: 0;">
                    <div style="width: 40px; height: 40px; background: #0f172a; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 0.9rem; font-weight: bold; color: #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        ${vastuData.score}
                    </div>
                </div>
                <div style="font-size: 0.7rem; color: #94a3b8; flex: 1; line-height: 1.4;">
                    ${vastuData.text}
                </div>
            </div>
        </div>
    `;

    const badge = document.getElementById('vastu-score-badge');
    const ring = document.getElementById('vastu-ring');
    const circleText = document.getElementById('vastu-circle-text');
    const feedbackText = document.getElementById('vastu-feedback-text');

    if (badge && ring && circleText && feedbackText) {
        badge.innerText = `${vastuData.score}/100`;
        badge.style.color = vastuData.color;
        badge.style.boxShadow = `0 0 8px ${vastuData.color}44`;
        ring.style.background = `conic-gradient(${vastuData.color} ${vastuData.score}%, #1e293b 0)`;
        circleText.innerText = vastuData.score;
        feedbackText.innerText = vastuData.text;
        feedbackText.title = vastuData.text; 
    }
};

// =========================================
// 🌟 QUICK CONVERTER TOGGLE ENGINE (Animated)
// =========================================
window.toggleQuickConverter = function() {
    const fullWidget = document.getElementById('qc-full-widget');
    const minBtn = document.getElementById('qc-min-btn');
    
    if (!fullWidget || !minBtn) return;    
    const isClosed = fullWidget.style.opacity === '0';
    
    if (isClosed) {
        // 1. Shrink and hide the small button
        minBtn.style.opacity = '0';
        minBtn.style.transform = 'scale(0.5)';
        minBtn.style.pointerEvents = 'none';        
        // 2. Expand and show the full widget
        fullWidget.style.opacity = '1';
        fullWidget.style.transform = 'scale(1)';
        fullWidget.style.pointerEvents = 'auto';
    } else {
        // 1. Shrink and hide the full widget
        fullWidget.style.opacity = '0';
        fullWidget.style.transform = 'scale(0.5)';
        fullWidget.style.pointerEvents = 'none';        
        // 2. Expand and show the small button
        minBtn.style.opacity = '1';
        minBtn.style.transform = 'scale(1)';
        minBtn.style.pointerEvents = 'auto';
    }
};
// =========================================
// 🌟 AI AGENT DROPDOWN TOGGLE
// =========================================
window.toggleAIAgent = function() {
    toggleOverlayPanel('ai-agent-overlay', 'ai-agent-btn', 'rgba(168, 85, 247, 0.4)', 'rgba(168, 85, 247, 0.15)');
};
// =========================================
// 🌟 SETTINGS DROPDOWN TOGGLE
// =========================================
window.toggleSettings = function() {
    toggleOverlayPanel('settings-overlay', 'settings-btn', 'rgba(148, 163, 184, 0.4)', 'rgba(148, 163, 184, 0.15)');
};

// ==========================================
// 🧠 PHASE 4: WEB WORKER (Background Math)
// ==========================================
// Initialize the Worker Safely (Prevents Ghost Threads on reload)
if (window.mathWorker) {
    window.mathWorker.terminate();
}

// 🚀 MODULARIZED: Load the worker directly from the separate file!
window.mathWorker = new Worker('core/worker.js');

// Listen for the results from the background core
window.mathWorker.onmessage = function(e) {
    if (e.data.type === 'MATH_COMPLETE') {
        if (typeof renderVastuUI === 'function') renderVastuUI(e.data.vastu);
        if (typeof renderAreaUI === 'function') renderAreaUI(e.data.area);
    }
};

// A debounced trigger we can safely call 60 times a second without flooding the worker
window.requestBackgroundMath = debounce(() => {
    if (!window.mathWorker || !elements) return;
    
    window.mathWorker.postMessage({
        type: 'CALCULATE_MATH',
        payload: {
            elements: elements,
            currentFloor: currentFloor,
            inW: parseFloat(document.getElementById('inW')?.value || 272),
            inH: parseFloat(document.getElementById('inH')?.value || 400),
            compassDir: document.getElementById('compassDir')?.value || 'West' // 🌟 NEW: Pass direction
        }
    });
}, 50);
// ==========================================
// 🧠 PHASE 4: WEB WORKER (Background Math)
// ==========================================