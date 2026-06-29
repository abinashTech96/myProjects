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
        <div class="room-header" style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold; font-size: 0.8rem; color: #38bdf8;">📝 EDITING</span>
                <div class="action-bar" style="position:relative; right:0; top:0; display:flex; gap:2px;">
                    ${staircaseControls}
                    <button class="action-btn" onclick="centerOnSelection()" title="Center View">🎯</button>
                    <button class="action-btn" onclick="addDoor(${i})" title="Add Door">🚪</button>
                    <button class="action-btn" onclick="addWindow(${i})" title="Add Window">🪟</button>
                    <button class="action-btn" onclick="rotateElement(${i})" title="Rotate">🔄</button>
                    <button class="action-btn" onclick="cloneElement(${i})" title="Duplicate">📋</button>
                    <button class="action-btn" onclick="elements[${i}].locked = !elements[${i}].locked; renderSidebar();" title="Lock">${el.locked ? '🔒' : '🔓'}</button>
                    <button class="action-btn del" onclick="deleteElement(${i})" title="Delete">🗑️</button>
                </div>
            </div>
            
            <div style="display:flex; gap:8px;">
                <input type="text" placeholder="${getRoomDisplayName(i)}" value="${el.customName || ''}" 
                    onchange="elements[${i}].customName=this.value; updateCanvas();" 
                    style="flex-grow: 1; padding: 6px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 4px;">
                <input type="color" value="${el.customColor || defaultHex}" 
                    onchange="elements[${i}].customColor=this.value; updateCanvas();" 
                    style="width: 36px; height: 32px; padding: 0; cursor: pointer; border-radius:4px; border:none; background: transparent;">
            </div>
        </div>

        <div class="dim-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:10px;">
            <div><label style="font-size:0.65rem; color:#94a3b8;">WIDTH</label><input type="number" value="${el.w}" onchange="elements[${i}].w=parseInt(this.value);updateCanvas()"></div>
            <div><label style="font-size:0.65rem; color:#94a3b8;">HEIGHT</label><input type="number" value="${el.h}" onchange="elements[${i}].h=parseInt(this.value);updateCanvas()"></div>
        </div>

        <div class="pos-group">
            <div class="pos-row" style="display:flex; align-items:center; gap:8px; margin-bottom:5px;">
                <label style="font-size:0.7rem; width:15px;">X</label>
                <input type="number" id="num-x-${i}" value="${el.x}" oninput="elements[${i}].x=parseInt(this.value); document.getElementById('range-x-${i}').value=this.value; updateCanvas()">
                <input type="range" id="range-x-${i}" min="0" max="800" value="${el.x}" oninput="elements[${i}].x=parseInt(this.value); document.getElementById('num-x-${i}').value=this.value; updateCanvas()">
            </div>
            <div class="pos-row" style="display:flex; align-items:center; gap:8px;">
                <label style="font-size:0.7rem; width:15px;">Y</label>
                <input type="number" id="num-y-${i}" value="${el.y}" oninput="elements[${i}].y=parseInt(this.value); document.getElementById('range-y-${i}').value=this.value; updateCanvas()">
                <input type="range" id="range-y-${i}" min="0" max="800" value="${el.y}" oninput="elements[${i}].y=parseInt(this.value); document.getElementById('num-y-${i}').value=this.value; updateCanvas()">
            </div>
        </div>`;

    const roomFixtures = fixtures.filter(f => f.roomId === i);
    if (roomFixtures.length > 0) {
        div.innerHTML += `<div style="margin-top:15px; border-top:1px solid #334155; padding-top:10px; font-size:0.7rem; color:#94a3b8;">FIXTURES:</div>`;
        
        roomFixtures.forEach((fix) => {
            const globalIdx = fixtures.indexOf(fix);
            const maxOffset = (fix.edge === 'bottom' || fix.edge === 'top') ? (el.w - fix.size) : (el.h - fix.size);

            div.innerHTML += `
                <div style="font-size:0.75rem; margin-top:5px; background:rgba(0,0,0,0.2); padding:8px; border-radius:4px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                        <b>${fix.type.toUpperCase()}</b>
                        <button class="action-btn" onclick="fixtures.splice(${globalIdx},1); renderSidebar(); updateCanvas()">🗑️</button>
                    </div>
                    
                    <label style="font-size:0.6rem; color:#94a3b8;">SIZE</label>
                    <input type="number" style="width:100%; margin-bottom:5px;" value="${fix.size}" onchange="fixtures[${globalIdx}].size=parseInt(this.value); renderSidebar(); updateCanvas()">
                    
                    <label style="font-size:0.6rem; color:#94a3b8;">POSITION (OFFSET)</label>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="number" value="${fix.offset}" oninput="fixtures[${globalIdx}].offset=parseInt(this.value); document.getElementById('range-fix-${globalIdx}').value=this.value; updateCanvas()">
                        <input type="range" id="range-fix-${globalIdx}" min="0" max="${maxOffset}" value="${fix.offset}" oninput="fixtures[${globalIdx}].offset=parseInt(this.value); document.getElementById('num-fix-${globalIdx}').value=this.value; updateCanvas()">
                    </div>

                    <select onchange="fixtures[${globalIdx}].edge=this.value; renderSidebar(); updateCanvas()" style="width:100%; margin-top:5px; background:#0f172a; color:white; border:none; padding:2px;">
                        <option value="bottom" ${fix.edge==='bottom'?'selected':''}>Bottom</option>
                        <option value="top" ${fix.edge==='top'?'selected':''}>Top</option>
                        <option value="left" ${fix.edge==='left'?'selected':''}>Left</option>
                        <option value="right" ${fix.edge==='right'?'selected':''}>Right</option>
                    </select>
                </div>`;
        });
    }
    ctrl.appendChild(div);
}

function renderFloorSelectors() {
    let count = parseInt(document.getElementById('b-floors').value);
    if (count < 1 || isNaN(count)) count = 1;

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

    const tabsContainer = document.getElementById('top-floor-tabs');
    if (tabsContainer) {
        tabsContainer.innerHTML = ''; 
        for(let i = 0; i < count; i++) {
            let label = i === 0 ? "G" : i === 1 ? "1st" : i === 2 ? "2nd" : `${i}th`;
            tabsContainer.innerHTML += `<button class="floor-btn ${i === currentFloor ? 'active' : ''}" data-floor="${i}" onclick="setFloor(${i})">${label}</button>`;
        }
    }
    applyCustomSelects(); 
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
    // 1. Toggle the 2D UI class
    const isClassic = document.body.classList.toggle('classic-theme');
    
    // 2. Redraw the 2D canvas
    if (typeof updateCanvas === 'function') updateCanvas(); 

    // 3. INSTANTLY sync the 3D world if it has been loaded!
    if (typeof scene3D !== 'undefined' && scene3D) {
        // 0xe2e8f0 is a perfect, professional "Matte Grey" (Tailwind slate-200)
        const bgColor = isClassic ? 0xe2e8f0 : 0x0f172a; 
        
        scene3D.background.setHex(bgColor);
        if (scene3D.fog) scene3D.fog.color.setHex(bgColor);
    }
}

// =========================================
// CUSTOM DROPDOWN ENGINE
// =========================================

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