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

// =========================================
// UI CONTROLS & SIDEBAR
// =========================================

function handleCompassChange() {
    globalCompassDir = document.getElementById('compassDir').value;
    if (typeof updateCanvas === 'function') updateCanvas();
}

const calcInches = () => { 
    const ft = parseFloat(document.getElementById('calcFt').value) || 0; 
    const inc = parseFloat(document.getElementById('calcIn').value) || 0; 
    document.getElementById('resIn').value = (ft * 12 + inc) + " in"; 
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

function renderSidebarBackup() {
    if (!ctrl) return;
    ctrl.innerHTML = '';
    
    if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) {
        ctrl.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 0.8rem; border: 1px dashed #334155; border-radius: 8px; margin-top: 10px; background: rgba(0,0,0,0.2);">
                <div style="font-size: 1.5rem; margin-bottom: 10px;">🖱️</div>
                Select any room on the blueprint to edit its dimensions, position, doors, and windows.
            </div>`;
        return;
    }

    const i = selectedElIndex;
    const el = elements[i];
    if (!el || el.floor !== currentFloor) return; 
    
    const div = document.createElement('div');
    div.className = 'panel';
    div.id = `panel-${i}`;
    div.style.marginBottom = "20px";
    div.style.border = "1px solid #38bdf8"; 
    div.style.boxShadow = "0 0 15px rgba(56, 189, 248, 0.15)";

    let staircaseControls = '';
    if (el.type === 'staircase') {
        staircaseControls = `
            <button class="action-btn" onclick="rotateStaircase(${i})" title="Rotate Staircase">
                🔄 ${el.dir ? el.dir.toUpperCase() : 'UP'}
            </button>
        `;
    }
    
    const defaultHex = "#38bdf8"; 

    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
            <span style="font-weight: 800; font-size: 0.75rem; color: #38bdf8; letter-spacing: 1px; text-transform: uppercase;">
                📐 ${getRoomDisplayName(i)}
            </span>
            <div style="display: flex; gap: 6px; align-items: center;">
                <input type="text" placeholder="Custom Name" value="${el.customName || ''}" 
                    onchange="elements[${i}].customName=this.value; updateCanvas();" 
                    style="width: 110px; padding: 4px 8px; font-size: 0.75rem; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px;">
                <input type="color" value="${el.customColor || defaultHex}" 
                    onchange="elements[${i}].customColor=this.value; updateCanvas();" 
                    style="width: 26px; height: 26px; padding: 0; cursor: pointer; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); background: transparent;">
            </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 6px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.05);">
            ${typeof staircaseControls !== 'undefined' ? staircaseControls : ''}
            <button class="action-btn" onclick="centerOnSelection()" title="Center View" style="padding: 6px 8px;">🎯</button>
            <button class="action-btn" onclick="addDoor(${i})" title="Add Door" style="padding: 6px 8px;">🚪</button>
            <button class="action-btn" onclick="addWindow(${i})" title="Add Window" style="padding: 6px 8px;">🪟</button>
            
            <div style="width: 1px; background: rgba(255,255,255,0.1); margin: 0 2px;"></div> <button class="action-btn" onclick="rotateElement(${i})" title="Rotate" style="padding: 6px 8px;">🔄</button>
            <button class="action-btn" onclick="cloneElement(${i})" title="Duplicate" style="padding: 6px 8px;">📋</button>
            <button class="action-btn" onclick="elements[${i}].locked = !elements[${i}].locked; renderSidebar();" title="Lock" style="padding: 6px 8px;">${el.locked ? '🔒' : '🔓'}</button>
            <button class="action-btn del" onclick="deleteElement(${i})" title="Delete" style="padding: 6px 8px; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3);">🗑️</button>
        </div>  

        <div style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 0.65rem; color: #94a3b8; font-weight: bold; letter-spacing: 0.5px;">WIDTH</label>
                    <input type="number" value="${el.w}" onchange="elements[${i}].w=parseInt(this.value); updateCanvas()" style="text-align: center; font-family: monospace;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 0.65rem; color: #94a3b8; font-weight: bold; letter-spacing: 0.5px;">HEIGHT</label>
                    <input type="number" value="${el.h}" onchange="elements[${i}].h=parseInt(this.value); updateCanvas()" style="text-align: center; font-family: monospace;">
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-size: 0.7rem; color: #94a3b8; width: 12px; font-weight: bold;">X</label>
                    <input type="number" id="num-x-${i}" value="${el.x}" oninput="elements[${i}].x=parseInt(this.value); document.getElementById('range-x-${i}').value=this.value; updateCanvas()" style="width: 55px; text-align: center; padding: 4px; font-family: monospace;">
                    <input type="range" id="range-x-${i}" min="0" max="800" value="${el.x}" oninput="elements[${i}].x=parseInt(this.value); document.getElementById('num-x-${i}').value=this.value; updateCanvas()" style="flex-grow: 1; accent-color: #38bdf8; height: 4px;">
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-size: 0.7rem; color: #94a3b8; width: 12px; font-weight: bold;">Y</label>
                    <input type="number" id="num-y-${i}" value="${el.y}" oninput="elements[${i}].y=parseInt(this.value); document.getElementById('range-y-${i}').value=this.value; updateCanvas()" style="width: 55px; text-align: center; padding: 4px; font-family: monospace;">
                    <input type="range" id="range-y-${i}" min="0" max="800" value="${el.y}" oninput="elements[${i}].y=parseInt(this.value); document.getElementById('num-y-${i}').value=this.value; updateCanvas()" style="flex-grow: 1; accent-color: #38bdf8; height: 4px;">
                </div>
            </div>

        </div>
    `;
   
    const roomFixtures = fixtures.filter(f => f.roomId === i);
    if (roomFixtures.length > 0) {
        // Main Fixtures Header
        div.innerHTML += `
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 20px; margin-bottom: 10px;">
                <div style="height: 1px; flex-grow: 1; background: rgba(255,255,255,0.1);"></div>
                <span style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; letter-spacing: 1px;">ATTACHED FIXTURES</span>
                <div style="height: 1px; flex-grow: 1; background: rgba(255,255,255,0.1);"></div>
            </div>`;
        
        roomFixtures.forEach((fix) => {
            const globalIdx = fixtures.indexOf(fix);
            const maxOffset = (fix.edge === 'bottom' || fix.edge === 'top') ? (el.w - fix.size) : (el.h - fix.size);
            
            const emoji = fix.type === 'door' ? '🚪' : '🪟';
            const accentColor = fix.type === 'door' ? '#fbbf24' : '#cbd5e1'; 

            div.innerHTML += `
                <div class="fixture-card" style="background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); border-left: 3px solid ${accentColor}; border-radius: 6px; padding: 10px; margin-bottom: 8px;">

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-weight: 800; font-size: 0.7rem; color: ${accentColor}; letter-spacing: 0.5px;">
                            ${emoji} ${fix.type.toUpperCase()}
                        </span>
                        <button class="action-btn del" onclick="fixtures.splice(${globalIdx},1); renderSidebar(); updateCanvas()" title="Remove ${fix.type}" style="padding: 4px 8px; font-size: 0.65rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; border-radius: 4px; box-shadow: none; transition: all 0.3s ease;">
                            ✕ Remove
                        </button>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-size: 0.65rem; color: #94a3b8; font-weight: bold; letter-spacing: 0.5px;">SIZE</label>
                            <input type="number" class="pro-input" value="${fix.size}" 
                                oninput="fixtures[${globalIdx}].size=parseInt(this.value); document.getElementById('range-fix-${globalIdx}').max = (fixtures[${globalIdx}].edge === 'bottom' || fixtures[${globalIdx}].edge === 'top') ? (${el.w} - this.value) : (${el.h} - this.value); updateCanvas();" 
                                style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; text-align: center; font-family: monospace; width: 100%; padding: 6px;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-size: 0.65rem; color: #94a3b8; font-weight: bold; letter-spacing: 0.5px;">WALL EDGE</label>
                            
                            <select class="fixture-select" onchange="fixtures[${globalIdx}].edge=this.value; renderSidebar(); updateCanvas()" style="width: 100%; font-size: 0.75rem;">
                                <option value="bottom" ${fix.edge==='bottom'?'selected':''}>Bottom</option>
                                <option value="top" ${fix.edge==='top'?'selected':''}>Top</option>
                                <option value="left" ${fix.edge==='left'?'selected':''}>Left</option>
                                <option value="right" ${fix.edge==='right'?'selected':''}>Right</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <label style="font-size: 0.65rem; color: #94a3b8; font-weight: bold; letter-spacing: 0.5px;">WALL OFFSET</label>
                            <input type="number" id="num-fix-${globalIdx}" class="pro-input" value="${fix.offset}" 
                                oninput="fixtures[${globalIdx}].offset=parseInt(this.value); document.getElementById('range-fix-${globalIdx}').value=this.value; updateCanvas()" 
                                style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; width: 60px; text-align: center; padding: 6px; font-family: monospace; font-size: 0.75rem;">
                        </div>
                        <input type="range" id="range-fix-${globalIdx}" min="0" max="${maxOffset}" value="${fix.offset}" 
                            oninput="fixtures[${globalIdx}].offset=parseInt(this.value); document.getElementById('num-fix-${globalIdx}').value=this.value; updateCanvas()" 
                            style="--thumb-color: ${accentColor}; width: 100%; margin-top: 4px;">
                    </div>

                </div>`;
        });
    }
    ctrl.appendChild(div);
    if (typeof initAnimatedDropdowns === 'function') {
        initAnimatedDropdowns();
    }
}



function renderSidebar() {
    if (!ctrl) return;
    ctrl.innerHTML = '';
    
    if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) {
        ctrl.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #64748b; font-size: 0.8rem; border: 1px dashed #334155; border-radius: 8px; margin-top: 10px; background: rgba(0,0,0,0.2);">
                <div style="font-size: 1.5rem; margin-bottom: 10px;">🖱️</div>
                Select any room on the blueprint to edit its dimensions, position, doors, and windows.
            </div>`;
        return;
    }

    const i = selectedElIndex;
    const el = elements[i];
    if (!el || el.floor !== currentFloor) return; 
    
    const div = document.createElement('div');
    div.className = 'panel';
    div.id = `panel-${i}`;
    div.style.marginBottom = "20px";
    div.style.border = "1px solid #38bdf8"; 
    div.style.boxShadow = "0 0 15px rgba(56, 189, 248, 0.15)";

    let staircaseControls = '';
    if (el.type === 'staircase') {
        staircaseControls = `
            <button class="action-btn" onclick="rotateStaircase(${i})" title="Rotate Staircase">
                🔄 ${el.dir ? el.dir.toUpperCase() : 'UP'}
            </button>
        `;
    }
    
    const defaultHex = "#38bdf8"; 

    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
            <span style="font-weight: 800; font-size: 0.75rem; color: #38bdf8; letter-spacing: 1px; text-transform: uppercase;">
                📐 ${getRoomDisplayName(i)}
            </span>
            <div style="display: flex; gap: 6px; align-items: center;">
                <input type="text" placeholder="Custom Name" value="${el.customName || ''}" 
                    onchange="elements[${i}].customName=this.value; updateCanvas();" 
                    style="width: 110px; padding: 4px 8px; font-size: 0.75rem; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px;">
                <input type="color" value="${el.customColor || defaultHex}" 
                    onchange="elements[${i}].customColor=this.value; updateCanvas();" 
                    style="width: 26px; height: 26px; padding: 0; cursor: pointer; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); background: transparent;">
            </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 6px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.05);">
            ${typeof staircaseControls !== 'undefined' ? staircaseControls : ''}
            <button class="action-btn" onclick="centerOnSelection()" title="Center View" style="padding: 6px 8px;">🎯</button>
            
            ${!el.isFurniture ? `
                <button class="action-btn" onclick="addDoor(${i})" title="Add Door" style="padding: 6px 8px;">🚪</button>
                <button class="action-btn" onclick="addWindow(${i})" title="Add Window" style="padding: 6px 8px;">🪟</button>
            ` : ''}
            
            <div style="width: 1px; background: rgba(255,255,255,0.1); margin: 0 2px;"></div> 
            <button class="action-btn" onclick="rotateElement(${i})" title="Rotate" style="padding: 6px 8px;">🔄</button>
            <button class="action-btn" onclick="cloneElement(${i})" title="Duplicate" style="padding: 6px 8px;">📋</button>
            <button class="action-btn" onclick="elements[${i}].locked = !elements[${i}].locked; renderSidebar();" title="Lock" style="padding: 6px 8px;">${el.locked ? '🔒' : '🔓'}</button>
            <button class="action-btn del" onclick="deleteElement(${i})" title="Delete" style="padding: 6px 8px; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3);">🗑️</button>
        </div>  

        <div style="background: rgba(0,0,0,0.15); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 0.65rem; color: #94a3b8; font-weight: bold; letter-spacing: 0.5px;">WIDTH</label>
                    <input type="number" value="${el.w}" onchange="elements[${i}].w=parseInt(this.value); updateCanvas()" style="text-align: center; font-family: monospace;">
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 0.65rem; color: #94a3b8; font-weight: bold; letter-spacing: 0.5px;">HEIGHT</label>
                    <input type="number" value="${el.h}" onchange="elements[${i}].h=parseInt(this.value); updateCanvas()" style="text-align: center; font-family: monospace;">
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-size: 0.7rem; color: #94a3b8; width: 12px; font-weight: bold;">X</label>
                    <input type="number" id="num-x-${i}" value="${el.x}" oninput="elements[${i}].x=parseInt(this.value); document.getElementById('range-x-${i}').value=this.value; updateCanvas()" style="width: 55px; text-align: center; padding: 4px; font-family: monospace;">
                    <input type="range" id="range-x-${i}" min="0" max="800" value="${el.x}" oninput="elements[${i}].x=parseInt(this.value); document.getElementById('num-x-${i}').value=this.value; updateCanvas()" style="flex-grow: 1; accent-color: #38bdf8; height: 4px;">
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="font-size: 0.7rem; color: #94a3b8; width: 12px; font-weight: bold;">Y</label>
                    <input type="number" id="num-y-${i}" value="${el.y}" oninput="elements[${i}].y=parseInt(this.value); document.getElementById('range-y-${i}').value=this.value; updateCanvas()" style="width: 55px; text-align: center; padding: 4px; font-family: monospace;">
                    <input type="range" id="range-y-${i}" min="0" max="800" value="${el.y}" oninput="elements[${i}].y=parseInt(this.value); document.getElementById('num-y-${i}').value=this.value; updateCanvas()" style="flex-grow: 1; accent-color: #38bdf8; height: 4px;">
                </div>
            </div>

        </div>
    `;
   
    const roomFixtures = fixtures.filter(f => f.roomId === i);
    if (roomFixtures.length > 0) {
        // Main Fixtures Header
        div.innerHTML += `
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 20px; margin-bottom: 10px;">
                <div style="height: 1px; flex-grow: 1; background: rgba(255,255,255,0.1);"></div>
                <span style="font-size: 0.65rem; font-weight: 800; color: #94a3b8; letter-spacing: 1px;">ATTACHED FIXTURES</span>
                <div style="height: 1px; flex-grow: 1; background: rgba(255,255,255,0.1);"></div>
            </div>`;
        
        roomFixtures.forEach((fix) => {
            const globalIdx = fixtures.indexOf(fix);
            const maxOffset = (fix.edge === 'bottom' || fix.edge === 'top') ? (el.w - fix.size) : (el.h - fix.size);
            
            const emoji = fix.type === 'door' ? '🚪' : '🪟';
            const accentColor = fix.type === 'door' ? '#fbbf24' : '#cbd5e1'; 

            div.innerHTML += `
                <div class="fixture-card" style="background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); border-left: 3px solid ${accentColor}; border-radius: 6px; padding: 10px; margin-bottom: 8px;">

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="font-weight: 800; font-size: 0.7rem; color: ${accentColor}; letter-spacing: 0.5px;">
                            ${emoji} ${fix.type.toUpperCase()}
                        </span>
                        <button class="action-btn del" onclick="fixtures.splice(${globalIdx},1); renderSidebar(); updateCanvas()" title="Remove ${fix.type}" style="padding: 4px 8px; font-size: 0.65rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; border-radius: 4px; box-shadow: none; transition: all 0.3s ease;">
                            ✕ Remove
                        </button>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-size: 0.65rem; color: #94a3b8; font-weight: bold; letter-spacing: 0.5px;">SIZE</label>
                            <input type="number" class="pro-input" value="${fix.size}" 
                                oninput="fixtures[${globalIdx}].size=parseInt(this.value); document.getElementById('range-fix-${globalIdx}').max = (fixtures[${globalIdx}].edge === 'bottom' || fixtures[${globalIdx}].edge === 'top') ? (${el.w} - this.value) : (${el.h} - this.value); updateCanvas();" 
                                style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; text-align: center; font-family: monospace; width: 100%; padding: 6px;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-size: 0.65rem; color: #94a3b8; font-weight: bold; letter-spacing: 0.5px;">WALL EDGE</label>
                            
                            <select class="fixture-select" onchange="fixtures[${globalIdx}].edge=this.value; renderSidebar(); updateCanvas()" style="width: 100%; font-size: 0.75rem;">
                                <option value="bottom" ${fix.edge==='bottom'?'selected':''}>Bottom</option>
                                <option value="top" ${fix.edge==='top'?'selected':''}>Top</option>
                                <option value="left" ${fix.edge==='left'?'selected':''}>Left</option>
                                <option value="right" ${fix.edge==='right'?'selected':''}>Right</option>
                            </select>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <label style="font-size: 0.65rem; color: #94a3b8; font-weight: bold; letter-spacing: 0.5px;">WALL OFFSET</label>
                            <input type="number" id="num-fix-${globalIdx}" class="pro-input" value="${fix.offset}" 
                                oninput="fixtures[${globalIdx}].offset=parseInt(this.value); document.getElementById('range-fix-${globalIdx}').value=this.value; updateCanvas()" 
                                style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px; width: 60px; text-align: center; padding: 6px; font-family: monospace; font-size: 0.75rem;">
                        </div>
                        <input type="range" id="range-fix-${globalIdx}" min="0" max="${maxOffset}" value="${fix.offset}" 
                            oninput="fixtures[${globalIdx}].offset=parseInt(this.value); document.getElementById('num-fix-${globalIdx}').value=this.value; updateCanvas()" 
                            style="--thumb-color: ${accentColor}; width: 100%; margin-top: 4px;">
                    </div>

                </div>`;
        });
    }
    ctrl.appendChild(div);
    if (typeof initAnimatedDropdowns === 'function') {
        initAnimatedDropdowns();
    }
}




function renderFloorSelectors() {
    let count = parseInt(document.getElementById('b-floors').value);
    if (count < 1 || isNaN(count)) count = 1;

    // 1. Update Auto-Builder Dropdowns
    const container = document.getElementById('floor-layout-selectors');
    if (container) {
        container.innerHTML = '';
        for(let i = 0; i < count; i++) {
            let fName = i === 0 ? "Ground" : i === 1 ? "1st" : i === 2 ? "2nd" : `${i}th`;
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

    // 2. Update Top Bar Tabs
    const tabsContainer = document.getElementById('top-floor-tabs');
    if (tabsContainer) {
        tabsContainer.innerHTML = ''; 
        for(let i = 0; i < count; i++) {
            let label = i === 0 ? "G" : i === 1 ? "1st" : i === 2 ? "2nd" : `${i}th`;
            tabsContainer.innerHTML += `<button class="floor-btn ${i === currentFloor ? 'active' : ''}" data-floor="${i}" onclick="setFloor(${i})">${label}</button>`;
        }
    }

    // 3. Update Sidebar Tabs
    const sidebarTabs = document.getElementById('floor-tabs');
    if (sidebarTabs) {
        sidebarTabs.innerHTML = '';
        for(let i = 0; i < count; i++) {
            let label = i === 0 ? "G" : i === 1 ? "1st" : i === 2 ? "2nd" : `${i}th`;
            sidebarTabs.innerHTML += `<button class="floor-btn ${i === currentFloor ? 'active' : ''}" data-floor="${i}" onclick="setFloor(${i})">${label}</button>`;
        }
    }

    // 4. THE FIX: Apply the new animated dropdown script to the newly created HTML
    if (typeof initAnimatedDropdowns === 'function') {
        initAnimatedDropdowns(); 
    }
}

function renderFloorSelectorsBkup() {
    let count = parseInt(document.getElementById('b-floors').value);
    if (count < 1 || isNaN(count)) count = 1;

    // 1. Update Auto-Builder Dropdowns
    const container = document.getElementById('floor-layout-selectors');
    if (container) {
        container.innerHTML = '';
        for(let i = 0; i < count; i++) {
            let fName = i === 0 ? "Ground" : i === 1 ? "1st" : i === 2 ? "2nd" : `${i}th`;
            container.innerHTML += `
                <div class="field">
                    <label>${fName} Floor Layout:</label>
                    <select id="layout-f${i}">
                        <option value="none">Empty / Open Terrace</option>
                        <option value="1bhk">1 BHK</option>
                        <option value="2bhk" ${i === 0 ? 'selected' : ''}>2 BHK</option>
                        <option value="3bhk">3 BHK</option>
                    </select>
                </div>`;
        }
    }

    // 2. Update Top Bar Tabs
    const tabsContainer = document.getElementById('top-floor-tabs');
    if (tabsContainer) {
        tabsContainer.innerHTML = ''; 
        for(let i = 0; i < count; i++) {
            let label = i === 0 ? "G" : i === 1 ? "1st" : i === 2 ? "2nd" : `${i}th`;
            tabsContainer.innerHTML += `<button class="floor-btn ${i === currentFloor ? 'active' : ''}" data-floor="${i}" onclick="setFloor(${i})">${label}</button>`;
        }
    }

    // 3. Update Sidebar Tabs
    const sidebarTabs = document.getElementById('floor-tabs');
    if (sidebarTabs) {
        sidebarTabs.innerHTML = '';
        for(let i = 0; i < count; i++) {
            let label = i === 0 ? "G" : i === 1 ? "1st" : i === 2 ? "2nd" : `${i}th`;
            sidebarTabs.innerHTML += `<button class="floor-btn ${i === currentFloor ? 'active' : ''}" data-floor="${i}" onclick="setFloor(${i})">${label}</button>`;
        }
    }
    //commented for DropDown Glitch
    //if (typeof applyCustomSelects === 'function') applyCustomSelects(); 
}

// =========================================
// UI TOGGLES & THEMES
// =========================================

function toggleWidget(widgetId, isVisible) {
    const widget = document.getElementById(widgetId);
    if (!widget) return;
    
    widget.style.transition = 'opacity 0.3s ease';
    if (isVisible) {
        widget.style.opacity = '1';
        widget.style.pointerEvents = 'auto'; 
    } else {
        widget.style.opacity = '0';
        widget.style.pointerEvents = 'none'; 
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
}

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
/* //commented for DropDown Glitch
function applyCustomSelects() {
    const selects = document.querySelectorAll('select');
    selects.forEach(sel => {
        if (sel.dataset.customized) return; 
        sel.dataset.customized = true;
        sel.style.display = 'none'; 

        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select';
        sel.parentNode.insertBefore(wrapper, sel);
        wrapper.appendChild(sel);

        const selectedDiv = document.createElement('div');
        selectedDiv.className = 'select-selected';
        selectedDiv.innerHTML = sel.options[sel.selectedIndex].innerHTML;
        wrapper.appendChild(selectedDiv);

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'select-items';

        for (let i = 0; i < sel.options.length; i++) {
            const opt = document.createElement('div');
            opt.innerHTML = sel.options[i].innerHTML;
            if (i === sel.selectedIndex) opt.classList.add('same-as-selected');
            
            opt.addEventListener('click', function(e) {
                sel.selectedIndex = i;
                selectedDiv.innerHTML = this.innerHTML;
                
                sel.dispatchEvent(new Event('change'));
                
                const siblings = this.parentNode.querySelectorAll('div');
                siblings.forEach(s => s.classList.remove('same-as-selected'));
                this.classList.add('same-as-selected');
                selectedDiv.click(); 
            });
            optionsDiv.appendChild(opt);
        }
        wrapper.appendChild(optionsDiv);

        selectedDiv.addEventListener('click', function(e) {
            e.stopPropagation();
            closeAllSelect(this);
            this.nextSibling.classList.toggle('select-show');
            this.classList.toggle('select-arrow-active');
        });
    });
}


function closeAllSelect(elmnt) {
    const items = document.querySelectorAll('.select-items');
    const selected = document.querySelectorAll('.select-selected');
    for (let i = 0; i < selected.length; i++) {
        if (elmnt !== selected[i]) {
            selected[i].classList.remove('select-arrow-active');
            items[i].classList.remove('select-show');
        }
    }
}
document.addEventListener('click', closeAllSelect);
*/

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('ai-generate-btn');
    if (btn) btn.addEventListener('click', handleAICommand);
});

// =========================================
// PRO ANIMATED DROPDOWNS ENGINE
// =========================================
function initAnimatedDropdowns() {
    const selects = document.querySelectorAll('select:not([data-customized])');
    
    selects.forEach(select => {
        select.style.display = 'none'; // Hide native select
        select.setAttribute('data-customized', 'true');
        
        // Create Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'pro-dropdown-wrapper';
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select); 
        
        // Create Header (Visible Button)
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
        
        // Create Options List
        const list = document.createElement('div');
        list.className = 'pro-dropdown-list';
        
        Array.from(select.options).forEach((option, index) => {
            const item = document.createElement('div');
            item.className = 'pro-dropdown-item';
            if (index === select.selectedIndex) item.classList.add('selected');
            item.textContent = option.text;
            
            // Handle Click
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                select.selectedIndex = index;
                selectedText.textContent = option.text;
                
                select.dispatchEvent(new Event('change')); // Trigger app.js logic
                
                list.querySelectorAll('.pro-dropdown-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                wrapper.classList.remove('open');
            });
            
            list.appendChild(item);
        });
        
        wrapper.appendChild(list);
        
        // Handle Opening/Closing
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.pro-dropdown-wrapper').forEach(w => {
                if (w !== wrapper) w.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });
    });
}

// Close dropdowns if clicking anywhere else on the screen
document.addEventListener('click', () => {
    document.querySelectorAll('.pro-dropdown-wrapper').forEach(w => w.classList.remove('open'));
});