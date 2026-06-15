let elements = [];
let fixtures = []; // Array to hold our doors and windows
let currentFloor = 0;
let globalCompassDir = 'West';
const colors = { 
    living: '168, 85, 247', 
    bedroom: '34, 197, 94', 
    toilet: '129, 140, 248', 
    kitchen: '245, 158, 11', 
    puja: '236, 72, 153', 
    staircase: '156, 163, 175',
    balcony: '20, 184, 166' // Our new teal color
};


// --- HIGH PERFORMANCE DOM CACHE ---
const UI = {
    // Inputs
    scaleInput: null,
    unitSelect: null,
    compassDir: null,
    inW: null,
    inH: null,
    roadSide: null,
    smartMergeToggle: null,
    real3DToggle: null,

    showLabelsToggle: null,
    showOffsetsToggle: null,
    showDims: null,
    
    // Static SVG Layers & Displays
    blueprint: null,
    viewport: null,
    elementContainer: null,
    dimContainer: null,
    siteOffsets: null,
    fixtureContainer: null,
    columnContainer: null,
    dirTop: null,
    dirRight: null,
    outerPoly: null,
    innerRect: null,
    roadPoly: null,
    roadText: null,
    
    // Stats Panels
    plotArea: null,
    buildArea: null,
    stairWarning: null,
    // --- NEW: App State Tracking ---
    isSpacePanMode: false,
    isSpacePanning: false,
    spacePanStart: { x: 0, y: 0 }
};

function initDOMCache() {
    // Cache all input elements
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

    // Cache SVG structural elements
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

    // Cache tracking displays
    UI.plotArea = document.getElementById('plot-area');
    UI.buildArea = document.getElementById('build-area');
    UI.stairWarning = document.getElementById('stair-warning');
}

function handleCompassChange() {
    // 1. Update the global variable
    const compass = globalCompassDir; 
    
    // 2. Redraw the UI
    updateCanvas();
}


const ctrl = document.getElementById('element-controls');
const container = document.getElementById('element-container');
const dimContainer = document.getElementById('dim-container');

// --- UI CAMERA CONTROLS (BUTTON DRIVEN) ---
let panX = 0, panY = 0, zoomLvl = 1; 
const svg = document.getElementById('blueprint');
const viewport = document.getElementById('viewport');

function updateViewport() {
    if (viewport) viewport.setAttribute('transform', `matrix(${zoomLvl}, 0, 0, ${zoomLvl}, ${panX}, ${panY})`);
}

function panCamera(dx, dy) {
    panX += dx;
    panY += dy;
    updateViewport();
}

function zoomCamera(factor) {
    const newZoom = zoomLvl * factor;
    if(newZoom < 0.2 || newZoom > 5) return; 
    
    // Zoom perfectly towards the center of the 1000x1000 canvas
    const cx = 500, cy = 500;
    panX = cx - (cx - panX) * factor;
    panY = cy - (cy - panY) * factor;
    zoomLvl = newZoom;
    
    updateViewport();
}

function resetCamera() {
    panX = 0; panY = 0; zoomLvl = 1;
    updateViewport();
}

// Click empty space to deselect rooms
svg.addEventListener('mousedown', (e) => {
    if (UI.isSpacePanMode) {
        UI.isSpacePanning = true;
        UI.spacePanStart = { x: e.clientX, y: e.clientY };
        svg.style.cursor = 'grabbing'; 
        return; 
    }
    if (e.target === svg || e.target.id === 'inner-rect' || e.target.id === 'outer-poly') {
        selectedElIndex = -1; 
        updateCanvas();
    }
});


// --- HIGH PERFORMANCE DRAG & DROP ---
let selectedElIndex = -1;
let isDragging = false, dragElIndex = -1; 
let startMousePos, startElPos, animationFrameId = null;

function getMousePos(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    return {
        x: (svgP.x - panX) / zoomLvl,
        y: (svgP.y - panY) / zoomLvl
    };
}

function startDrag(evt, index) {
    if (UI.isSpacePanMode) return; // Updated
    if (evt.button === 1 || evt.shiftKey) return; 
    if (elements[index].locked) return; // Prevent dragging locked rooms
    
    selectedElIndex = index;
    isDragging = true; dragElIndex = index;
    startMousePos = getMousePos(evt);
    startElPos = { x: elements[index].x, y: elements[index].y };
    updateCanvas();
}

svg.addEventListener('mousemove', (e) => {
    if (UI.isSpacePanning) {
        const dx = e.clientX - UI.spacePanStart.x;
        const dy = e.clientY - UI.spacePanStart.y;
        panCamera(dx, dy); 
        UI.spacePanStart = { x: e.clientX, y: e.clientY };
        return;
    }
    // Only proceed if one of the modes is active
    if ((!isDragging || dragElIndex === -1) && (!isDraggingFixture || dragFixtureIndex === -1)) return;

    const currentMouse = getMousePos(e);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    animationFrameId = requestAnimationFrame(() => {
        const SCALE = parseFloat(document.getElementById('scaleInput').value);
        
        // --- MODE 1: DRAGGING FIXTURES (DOORS/WINDOWS) ---
        if (isDraggingFixture && dragFixtureIndex !== -1) {
            const fix = fixtures[dragFixtureIndex];
            const el = elements[fix.roomId];
            
            // Re-calculate Building Origin (I)
            const inW = toInches(document.getElementById('inW').value, document.getElementById('unitSelect').value);
            const inH = toInches(document.getElementById('inH').value, document.getElementById('unitSelect').value);
            const Ix = 500 - (inW / 2);
            const Iy = 500 - (inH / 2);

            // Relative mouse position inside the room
            const relX = (currentMouse.x - (Ix + el.x * SCALE)) / SCALE;
            const relY = (currentMouse.y - (Iy + el.y * SCALE)) / SCALE;

            if (fix.edge === 'bottom' || fix.edge === 'top') {
                fix.offset = Math.round(relX);
            } else {
                fix.offset = Math.round(relY);
            }

            // Boundary constraints for fixtures
            const limit = (fix.edge === 'bottom' || fix.edge === 'top') ? el.w : el.h;
            fix.offset = Math.max(0, Math.min(fix.offset, limit - fix.size));
            
            updateCanvas();
            renderSidebar(); 
        } 
        
        // --- MODE 2: DRAGGING ROOMS (Existing Logic) ---
        else if (isDragging && dragElIndex !== -1) {
            const dx = currentMouse.x - startMousePos.x;
            const dy = currentMouse.y - startMousePos.y;
            const inW = toInches(document.getElementById('inW').value, document.getElementById('unitSelect').value);
            const inH = toInches(document.getElementById('inH').value, document.getElementById('unitSelect').value);
            
            let newX = startElPos.x + (dx / SCALE);
            let newY = startElPos.y + (dy / SCALE);
            
            // --- NEW: ORTHOGONAL DRAGGING (SHIFT + DRAG) ---
            if (e.shiftKey) {
                // Determine which direction the user moved more: horizontal or vertical
                if (Math.abs(dx) > Math.abs(dy)) {
                    newY = startElPos.y; // Lock to horizontal movement
                } else {
                    newX = startElPos.x; // Lock to vertical movement
                }
            }
            // -----------------------------------------------

            const SNAP = 12; const el = elements[dragElIndex];
            if (Math.abs(newX) < SNAP) newX = 0;
            if (Math.abs(newX + el.w - inW) < SNAP) newX = inW - el.w;
            if (Math.abs(newY) < SNAP) newY = 0;
            if (Math.abs(newY + el.h - inH) < SNAP) newY = inH - el.h;
            
            elements.forEach((other, i) => {
                if (i === dragElIndex || other.floor !== currentFloor) return;
                if (Math.abs(newX - (other.x + other.w)) < SNAP) newX = other.x + other.w;
                if (Math.abs((newX + el.w) - other.x) < SNAP) newX = other.x - el.w;
                if (Math.abs(newX - other.x) < SNAP) newX = other.x;
                if (Math.abs((newX + el.w) - (other.x + other.w)) < SNAP) newX = other.x + other.w - el.w;
                if (Math.abs(newY - (other.y + other.h)) < SNAP) newY = other.y + other.h;
                if (Math.abs((newY + el.h) - other.y) < SNAP) newY = other.y - el.h;
                if (Math.abs(newY - other.y) < SNAP) newY = other.y;
                if (Math.abs((newY + el.h) - (other.y + other.h)) < SNAP) newY = other.y + other.h - el.h;
            });

            elements[dragElIndex].x = Math.round(newX); elements[dragElIndex].y = Math.round(newY);
            updateCanvas(); 
            
            // Sync Sidebar
            const rangeX = document.getElementById(`range-x-${dragElIndex}`);
            const rangeY = document.getElementById(`range-y-${dragElIndex}`);
            const numX = document.getElementById(`num-x-${dragElIndex}`);
            const numY = document.getElementById(`num-y-${dragElIndex}`);
            if(rangeX) rangeX.value = elements[dragElIndex].x;
            if(rangeY) rangeY.value = elements[dragElIndex].y;
            if(numX) numX.value = elements[dragElIndex].x;
            if(numY) numY.value = elements[dragElIndex].y;
        }
    });
});

svg.addEventListener('mouseup', () => { 
    UI.isSpacePanning = false; // Updated
    if (UI.isSpacePanMode) svg.style.cursor = 'grab'; // Updated
    isDragging = false; 
    dragFixtureIndex = -1; 
    isDraggingFixture = false; 
});
svg.addEventListener('mouseleave', () => { isDragging = false; dragElIndex = -1; });

// --- UTILITIES & TEMPLATES ---
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

const floorLayouts = {
    '1bhk': [{ type: 'living', w: 192, h: 192, x: 20, y: 20 }, { type: 'kitchen', w: 120, h: 120, x: 230, y: 20 }, { type: 'bedroom', w: 144, h: 144, x: 20, y: 230 }, { type: 'toilet', w: 72, h: 96, x: 180, y: 230 }],
    '2bhk': [{ type: 'living', w: 192, h: 216, x: 20, y: 20 }, { type: 'kitchen', w: 120, h: 120, x: 230, y: 20 }, { type: 'bedroom', w: 144, h: 168, x: 20, y: 250 }, { type: 'toilet', w: 72, h: 96, x: 180, y: 250 }, { type: 'bedroom', w: 144, h: 144, x: 20, y: 440 }, { type: 'toilet', w: 72, h: 96, x: 180, y: 440 }],
    '3bhk': [{ type: 'living', w: 240, h: 240, x: 20, y: 20 }, { type: 'kitchen', w: 120, h: 144, x: 280, y: 20 }, { type: 'bedroom', w: 168, h: 168, x: 20, y: 280 }, { type: 'toilet', w: 72, h: 96, x: 200, y: 280 }, { type: 'bedroom', w: 144, h: 144, x: 20, y: 460 }, { type: 'toilet', w: 72, h: 96, x: 180, y: 460 }, { type: 'bedroom', w: 144, h: 144, x: 280, y: 460 }]
};
/*
function renderFloorSelectors() {
    let count = parseInt(document.getElementById('b-floors').value);
    if (count < 1 || isNaN(count)) count = 1;
    const container = document.getElementById('floor-layout-selectors');
    container.innerHTML = '';
    for(let i = 0; i < count; i++) {
        let fName = i === 0 ? "Ground" : i === 1 ? "1st" : i === 2 ? "2nd" : `${i}th`;
        container.innerHTML += `<div class="field"><label>${fName} Floor Layout:</label><select id="layout-f${i}"><option value="none">Empty / Open Terrace</option><option value="1bhk">1 BHK</option><option value="2bhk" ${i === 0 ? 'selected' : ''}>2 BHK</option><option value="3bhk">3 BHK</option></select></div>`;
    }
    applyCustomSelects();
}
*/
function renderFloorSelectors() {
    let count = parseInt(document.getElementById('b-floors').value);
    if (count < 1 || isNaN(count)) count = 1;

    // 1. Render the Layout Dropdowns (Your existing logic)
    const container = document.getElementById('floor-layout-selectors');
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

    // 2. Render the Navigation Buttons (The "missing" logic)
    const tabsContainer = document.getElementById('top-floor-tabs');
    tabsContainer.innerHTML = ''; // Clear old buttons
    for(let i = 0; i < count; i++) {
        let label = i === 0 ? "G" : i === 1 ? "1st" : i === 2 ? "2nd" : `${i}th`;
        // Create the button and apply the 'active' class only to the current floor
        tabsContainer.innerHTML += `
            <button class="floor-btn ${i === currentFloor ? 'active' : ''}" 
                    data-floor="${i}" 
                    onclick="setFloor(${i})">${label}</button>`;
    }

    applyCustomSelects(); // Re-apply your custom UI styling
}

function generateBuilding() {
    if (elements.length > 0 && !confirm("Generating a new building will clear your current rooms. Continue?")) return;
    let floorCount = parseInt(document.getElementById('b-floors').value);
    if (floorCount < 1 || isNaN(floorCount)) floorCount = 1;
    
    let maxReqW = 0; let maxReqH = 0;
    for(let i = 0; i < floorCount; i++) {
        const layoutKey = document.getElementById(`layout-f${i}`).value;
        if(layoutKey !== 'none' && floorLayouts[layoutKey]) {
            floorLayouts[layoutKey].forEach(room => {
                if (room.x + room.w > maxReqW) maxReqW = room.x + room.w;
                if (room.y + room.h > maxReqH) maxReqH = room.y + room.h;
            });
        }
        if (floorCount > 1) {
            if (450 + 96 > maxReqW) maxReqW = 450 + 96;
            if (20 + 144 > maxReqH) maxReqH = 20 + 144;
        }
    }
    
    maxReqW += 20; maxReqH += 20;
    let currentInW = parseInt(document.getElementById('inW').value) || 0;
    let currentInH = parseInt(document.getElementById('inH').value) || 0;
    let scaleFactor = 1;

    if (maxReqW > currentInW || maxReqH > currentInH) {
        const shrink = confirm(`⛔ Boundary Warning\n\nThe selected layout requires a ${Math.ceil(maxReqW/12)}ft × ${Math.ceil(maxReqH/12)}ft plot.\nYour current plot is only ${Math.floor(currentInW/12)}ft × ${Math.floor(currentInH/12)}ft.\n\nDo you want the engine to automatically shrink and fit the layout into your plot?`);
        if (shrink) scaleFactor = Math.min(currentInW / maxReqW, currentInH / maxReqH);
        else return; 
    }

    elements = []; 
    const tabsContainer = document.getElementById('floor-tabs');
    tabsContainer.innerHTML = '';
    
    for(let i = 0; i < floorCount; i++) {
        let label = i === 0 ? "G" : i === 1 ? "1st" : i === 2 ? "2nd" : `${i}th`;
        tabsContainer.innerHTML += `<button class="floor-btn" data-floor="${i}" onclick="setFloor(${i})">${label}</button>`;
        
        const layoutKey = document.getElementById(`layout-f${i}`).value;
        if(layoutKey !== 'none' && floorLayouts[layoutKey]) {
            const layoutData = JSON.parse(JSON.stringify(floorLayouts[layoutKey]));
            layoutData.forEach(room => { 
                room.w = Math.round(room.w * scaleFactor); room.h = Math.round(room.h * scaleFactor);
                room.x = Math.round(room.x * scaleFactor); room.y = Math.round(room.y * scaleFactor);
                room.floor = i; elements.push(room); 
            });
        }
        if (floorCount > 1) {
            elements.push({ 
                type: 'staircase', 
                w: Math.round(96 * scaleFactor), 
                h: Math.round(144 * scaleFactor), 
                x: Math.round(450 * scaleFactor), 
                y: Math.round(20 * scaleFactor), 
                floor: i,
                locked: true,
                dir: 'up' // <--- Now it's future-proofed!
            });
        }
    }
    setFloor(0); 
}

const toInches = (val, unit) => unit === 'cm' ? parseFloat(val) / 2.54 : parseFloat(val);
const getPolygonArea = (coords) => { let area = 0; for (let i = 0; i < coords.length; i++) { let j = (i + 1) % coords.length; area += coords[i].x * coords[j].y; area -= coords[j].x * coords[i].y; } return Math.abs(area) / 2; };
const calcInches = () => { 
    const ft = parseFloat(document.getElementById('calcFt').value) || 0; 
    const inc = parseFloat(document.getElementById('calcIn').value) || 0; 
    document.getElementById('resIn').value = (ft * 12 + inc) + " in"; 
};
function checkCollision(el, index) { 
    return elements.some((other, i) => 
        i !== index && 
        other.floor === el.floor && 
        !(el.x + el.w <= other.x || el.x >= other.x + other.w || el.y + el.h <= other.y || el.y >= other.y + other.h)
    ); 
}

function addManualFloor() {
    // 1. Find the highest floor by counting the actual UI tabs
    const existingTabs = document.querySelectorAll('#top-floor-tabs .floor-btn');
    const maxFloor = existingTabs.length > 0 ? existingTabs.length - 1 : 0;
    
    const newFloorNum = maxFloor + 1;

    // 2. Auto-clone staircases from the top floor to the new floor
    const stairsToClone = elements.filter(e => e.type === 'staircase' && e.floor === maxFloor);
    stairsToClone.forEach(stair => {
        const clone = JSON.parse(JSON.stringify(stair));
        clone.floor = newFloorNum;
        elements.push(clone);
    });

    // 3. Update the Auto-Builder's hidden floor counter
    const bFloorsInput = document.getElementById('b-floors');
    if (bFloorsInput) {
        bFloorsInput.value = newFloorNum + 1; 
    }

    // 4. THE FIX: Tell the engine to dynamically redraw BOTH the dropdowns and the top tabs!
    renderFloorSelectors();

    // 5. Instantly switch the user to their newly created floor
    setFloor(newFloorNum);
}

function setFloor(f) {
    currentFloor = f;
    // Update the button classes manually
    document.querySelectorAll('.floor-btn').forEach((b) => { 
        b.className = parseInt(b.getAttribute('data-floor')) === f ? 'floor-btn active' : 'floor-btn'; 
    });
    renderSidebar(); 
    updateCanvas();
}

function validateStairs() {
    const stairs = elements.filter(e => e.type === 'staircase');
    const warningDiv = document.getElementById('stair-warning');
    if (stairs.length < 2) { warningDiv.style.display = 'none'; return; }
    const anchorX = stairs[0].x; const anchorY = stairs[0].y; const anchorW = stairs[0].w; const anchorH = stairs[0].h;
    const misaligned = stairs.some(s => s.x !== anchorX || s.y !== anchorY || s.w !== anchorW || s.h !== anchorH);
    warningDiv.style.display = misaligned ? 'block' : 'none';
}

function deleteElement(idx) {
    if(confirm('Are you sure you want to delete this room?')) { 
        elements.splice(idx, 1); 
        
        // --- Safe Selection Management ---
        // If we deleted the currently selected room, clear the selection
        if (selectedElIndex === idx) {
            selectedElIndex = -1;
        } 
        // If we deleted a room that came before the selected room in the array, shift the index down by 1
        else if (selectedElIndex > idx) {
            selectedElIndex--;
        }

        renderSidebar(); 
        updateCanvas(); 
    }
}
function cloneElement(idx) {
    const clone = JSON.parse(JSON.stringify(elements[idx]));
    clone.x += 20; clone.y += 20; elements.push(clone);
    renderSidebar(); updateCanvas();
}
function rotateElement(idx) {
    const el = elements[idx]; const tempW = el.w; el.w = el.h; el.h = tempW;
    renderSidebar(); updateCanvas();
}

function addElement() {
    // 1. Get the type first
    const type = document.getElementById('elem-type').value;    
    // 2. Define the base object
    const newRoom = { 
        type: type, 
        w: 120, 
        h: 120, 
        x: 20, 
        y: 20, 
        floor: currentFloor, 
        locked: false 
    };
    // 3. Future-proof: If it's a staircase, inject the default direction
    if (type === 'staircase') {
        newRoom.dir = 'up'; 
    }
    // 4. Push to elements
    elements.push(newRoom);
    
    renderSidebar(); 
    updateCanvas();
}

function addFixture(type) {
    if (selectedElIndex === -1) {
        alert("Please click on a room first to select it!");
        return;
    }
    // Default to a 36-inch fixture, placed on the bottom edge of the selected room
    fixtures.push({
        type: type,
        roomId: selectedElIndex,
        edge: 'bottom', // We will default to bottom for now
        offset: 36,     // Starts 36 inches from the left corner
        size: 36        // 36 inches wide
    });
    updateCanvas();
}

// --- RENDERING ---
/*
function renderSidebar() {
    ctrl.innerHTML = '';
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.floor !== currentFloor) continue; 
        
        const div = document.createElement('div');
        div.className = 'panel';
        div.id = `panel-${i}`;
        const displayName = getRoomDisplayName(i);
        
        div.innerHTML = `
            <div class="action-bar">
                <button class="action-btn" onclick="elements[${i}].locked = !elements[${i}].locked; renderSidebar(); updateCanvas();"
                    style="border-color: ${el.locked ? '#fbbf24' : '#475569'}; color: ${el.locked ? '#fbbf24' : ''}"
                    title="Lock/Unlock Room">
                    ${el.locked ? '🔒' : '🔓'}
                </button>
                <button class="action-btn" onclick="rotateElement(${i})" title="Rotate Room">🔄</button>
                <button class="action-btn" onclick="cloneElement(${i})" title="Duplicate Room">📋</button>
                <button class="action-btn del" onclick="deleteElement(${i})" title="Delete Room">🗑️</button>
            </div>
            <b style="font-size:0.75rem">${displayName}</b>
            
            <div class="input-grid" style="margin-top: 10px;">
                <input type="number" value="${el.w}" onchange="elements[${i}].w=parseInt(this.value);updateCanvas()"> 
                <input type="number" value="${el.h}" onchange="elements[${i}].h=parseInt(this.value);updateCanvas()">
            </div>

            <div class="field">
                <label>X-Position
                    <input type="number" id="num-x-${i}" value="${el.x}" style="width: 60px; height: 20px;" 
                        oninput="elements[${i}].x=parseInt(this.value); document.getElementById('range-x-${i}').value=this.value; updateCanvas()">
                </label>
                <input type="range" id="range-x-${i}" min="0" max="800" value="${el.x}" 
                    oninput="elements[${i}].x=parseInt(this.value); document.getElementById('num-x-${i}').value=this.value; updateCanvas()">
            </div>

            <div class="field">
                <label>Y-Position
                    <input type="number" id="num-y-${i}" value="${el.y}" style="width: 60px; height: 20px;" 
                        oninput="elements[${i}].y=parseInt(this.value); document.getElementById('range-y-${i}').value=this.value; updateCanvas()">
                </label>
                <input type="range" id="range-y-${i}" min="0" max="800" value="${el.y}" 
                    oninput="elements[${i}].y=parseInt(this.value); document.getElementById('num-y-${i}').value=this.value; updateCanvas()">
            </div>`;
        ctrl.appendChild(div);
    }
}
*/

let isDraggingFixture = false;
let dragFixtureIndex = -1;

function addDoor(roomId) {
    // Push a new door to the fixtures array, linked to the roomId
    fixtures.push({
        type: 'door',
        roomId: roomId,
        size: 30,      // Default width in inches/units
        offset: 0,     // Default position from start of wall
        edge: 'bottom' // Default wall
    });
    // Refresh UI to show the new door controls immediately
    renderSidebar();
    updateCanvas();
}

function addWindow(roomId) {
    fixtures.push({
        type: 'window',
        roomId: roomId,
        size: 15,      // Default width in inches
        offset: 15,     // Default position
        edge: 'bottom' // Default wall
    });
    renderSidebar();
    updateCanvas();
}

function startDragFixture(index) {
    isDraggingFixture = true;
    dragFixtureIndex = index;
}


function renderSidebar() {
    ctrl.innerHTML = '';
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.floor !== currentFloor) continue; 
        
        const div = document.createElement('div');
        div.className = 'panel';
        div.id = `panel-${i}`;
        div.style.marginBottom = "20px";

        // --- 1. THE ROOM HEADER & CONTROLS ---
        let staircaseControls = '';
        if (el.type === 'staircase') {
            staircaseControls = `
                <button class="action-btn" onclick="rotateStaircase(${i})" title="Rotate Staircase">
                    🔄 ${el.dir ? el.dir.toUpperCase() : 'UP'}
                </button>
            `;
        }
        
        div.innerHTML = `
            <div class="room-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-weight:bold; font-size: 0.8rem;">${getRoomDisplayName(i)}</span>
                <div class="action-bar" style="display:flex; gap:2px;">
                    ${staircaseControls}
                    <button class="action-btn" onclick="addDoor(${i})" title="Add Door">🚪</button>
                    <button class="action-btn" onclick="addWindow(${i})" title="Add Window">🪟</button>
                    <button class="action-btn" onclick="rotateElement(${i})" title="Rotate">🔄</button>
                    <button class="action-btn" onclick="cloneElement(${i})" title="Duplicate">📋</button>
                    <button class="action-btn" onclick="elements[${i}].locked = !elements[${i}].locked; renderSidebar();" title="Lock">${el.locked ? '🔒' : '🔓'}</button>
                    <button class="action-btn" onclick="deleteElement(${i})" title="Delete">🗑️</button>
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

        // --- 2. EXISTING FIXTURE CONTROLS ---
        const roomFixtures = fixtures.filter(f => f.roomId === i);
        if (roomFixtures.length > 0) {
            div.innerHTML += `<div style="margin-top:15px; border-top:1px solid #334155; padding-top:10px; font-size:0.7rem; color:#94a3b8;">FIXTURES:</div>`;
            
            roomFixtures.forEach((fix) => {
                const globalIdx = fixtures.indexOf(fix);
                // Calculate the physical limit for the slider so it never leaves the room walls
                const maxOffset = (fix.edge === 'bottom' || fix.edge === 'top') 
                                ? (el.w - fix.size) : (el.h - fix.size);

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
                            <input type="number" value="${fix.offset}" 
                                oninput="fixtures[${globalIdx}].offset=parseInt(this.value); document.getElementById('range-fix-${globalIdx}').value=this.value; updateCanvas()">
                            <input type="range" id="range-fix-${globalIdx}" min="0" max="${maxOffset}" value="${fix.offset}" 
                                oninput="fixtures[${globalIdx}].offset=parseInt(this.value); document.getElementById('num-fix-${globalIdx}').value=this.value; updateCanvas()">
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
}

// ==========================================
// EXTRACTED SVG UTILITIES (High Performance)
// ==========================================
function updateSVGPosition(id, x, y, labelText, isVisible) {
    const el = document.getElementById(id); 
    if (!el) return;
    el.setAttribute('x', x); 
    el.setAttribute('y', y); 
    if (labelText !== null) el.textContent = labelText;
    el.style.display = isVisible ? 'block' : 'none';
}

function drawProBadge(id, x, y, label, color, isVisible, currentZoom, container) {
    let g = document.getElementById(`badge-${id}`);
    if (!g) {
        g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.id = `badge-${id}`;
        if(container) container.appendChild(g);
    }
    g.setAttribute('transform', `translate(${x}, ${y}) scale(${1/currentZoom})`);
    g.style.display = isVisible ? 'block' : 'none';
    g.innerHTML = `
        <circle cx="0" cy="0" r="12" fill="rgba(15, 23, 42, 0.9)" stroke="${color}" stroke-width="2" />
        <text x="0" y="4" fill="#f8fafc" font-size="11" font-weight="bold" text-anchor="middle" style="pointer-events: none;">${label}</text>
    `;
}

function createOrUpdateText(id, container, x, y, text, color, fontSize, isBold) {
    let t = document.getElementById(id);
    if (!t) {
        t = document.createElementNS("http://www.w3.org/2000/svg", "text"); 
        t.id = id; 
        t.setAttribute('text-anchor', 'middle'); 
        t.setAttribute('pointer-events', 'none'); 
        t.style.textShadow = "1px 1px 2px #000"; 
        container.appendChild(t);
    }
    t.setAttribute('x', x); 
    t.setAttribute('y', y); 
    t.setAttribute('fill', color); 
    t.setAttribute('font-size', fontSize);
    if (isBold) t.setAttribute('font-weight', 'bold');
    t.textContent = text; 
    t.style.display = 'block';
}


function updateCanvas() {
    // --- 1. QUICK READS FROM CACHE ---
    const unit = UI.unitSelect.value;
    const SCALE = parseFloat(UI.scaleInput.value);
    const compass = globalCompassDir;
    
    if (compass === 'North') { UI.dirTop.textContent = 'N'; UI.dirRight.textContent = 'E'; }
    else if (compass === 'East') { UI.dirTop.textContent = 'E'; UI.dirRight.textContent = 'S'; }
    else if (compass === 'South') { UI.dirTop.textContent = 'S'; UI.dirRight.textContent = 'W'; }
    else if (compass === 'West') { UI.dirTop.textContent = 'W'; UI.dirRight.textContent = 'N'; }

    // --- 2. CORE DIMENSIONS ---
    const inW = toInches(UI.inW.value, unit) * SCALE;
    const inH = toInches(UI.inH.value, unit) * SCALE;
    const val = (id) => toInches(document.getElementById(id)?.value || 0, unit) * SCALE;
    
    const I = { x: 500 - (inW/2), y: 500 - (inH/2) };
    const J = { x: 500 + (inW/2), y: 500 - (inH/2) };
    const K = { x: 500 + (inW/2), y: 500 + (inH/2) };
    const L = { x: 500 - (inW/2), y: 500 + (inH/2) };

    const A = { x: I.x - val('aL'), y: I.y - val('aU') };
    const B = { x: J.x + val('bR'), y: J.y - val('bU') };
    const C = { x: K.x + val('cR'), y: K.y + val('cD') };
    const D = { x: L.x - val('dL'), y: L.y + val('dD') };

    if (UI.innerRect) {
        UI.innerRect.setAttribute('x', I.x); UI.innerRect.setAttribute('y', I.y);
        UI.innerRect.setAttribute('width', inW); UI.innerRect.setAttribute('height', inH);
    }
    if (UI.outerPoly) {
        UI.outerPoly.setAttribute('points', `${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y} ${D.x},${D.y}`);
    }

    // --- 3. LABELS & BADGES (Using Extracted Utils) ---
    const showLabels = UI.showLabelsToggle ? UI.showLabelsToggle.checked : true;

    updateSVGPosition('labI', I.x + 5, I.y - 5, 'I', showLabels); 
    updateSVGPosition('labJ', J.x + 5, J.y - 5, 'J', showLabels);
    updateSVGPosition('labK', K.x + 5, K.y - 5, 'K', showLabels); 
    updateSVGPosition('labL', L.x + 5, L.y - 5, 'L', showLabels);
    
    updateSVGPosition('labA', A.x - 20, A.y - 10, null, showLabels); 
    updateSVGPosition('labB', B.x + 15, B.y - 10, null, showLabels); 
    updateSVGPosition('labC', C.x + 15, C.y + 35, null, showLabels); 
    updateSVGPosition('labD', D.x - 20, D.y + 35, null, showLabels);

    drawProBadge('A', A.x - 15, A.y - 15, 'A', '#94a3b8', showLabels, zoomLvl, UI.viewport);
    drawProBadge('B', B.x + 15, B.y - 15, 'B', '#94a3b8', showLabels, zoomLvl, UI.viewport);
    drawProBadge('C', C.x + 15, C.y + 15, 'C', '#94a3b8', showLabels, zoomLvl, UI.viewport);
    drawProBadge('D', D.x - 15, D.y + 15, 'D', '#94a3b8', showLabels, zoomLvl, UI.viewport);

    drawProBadge('I', I.x - 15, I.y - 15, 'I', '#38bdf8', showLabels, zoomLvl, UI.viewport);
    drawProBadge('J', J.x + 15, J.y - 15, 'J', '#38bdf8', showLabels, zoomLvl, UI.viewport);
    drawProBadge('K', K.x + 15, K.y + 15, 'K', '#38bdf8', showLabels, zoomLvl, UI.viewport);
    drawProBadge('L', L.x - 15, L.y + 15, 'L', '#38bdf8', showLabels, zoomLvl, UI.viewport);

    // --- 4. SITE OFFSETS ---
    const showOffsets = UI.showOffsetsToggle && UI.showOffsetsToggle.checked;
    if (!showOffsets) {
        if(UI.siteOffsets) UI.siteOffsets.innerHTML = '';
    } else {
        let html = '';
        const addDim = (x1, y1, x2, y2, v, label, isVert) => {
            if (v <= 0) return;
            const cx = (x1 + x2) / 2; const cy = (y1 + y2) / 2;
            const ft = Math.floor(v / 12); const inch = Math.round(v % 12);
            const text = ft > 0 ? `${ft}'${inch}"` : `${inch}"`;
            html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#10b981" stroke-width="1.5" stroke-dasharray="3,3" />`;
            html += `<circle cx="${x1}" cy="${y1}" r="2" fill="#10b981" /><circle cx="${x2}" cy="${y2}" r="2" fill="#10b981" />`;
            if (isVert) html += `<text x="${cx + 6}" y="${cy + 3}" fill="#10b981" font-size="11" font-weight="bold">${label}: ${text}</text>`;
            else html += `<text x="${cx}" y="${cy - 6}" fill="#10b981" font-size="11" font-weight="bold" text-anchor="middle">${label}: ${text}</text>`;
        };
        addDim(I.x, I.y, I.x, A.y, val('aU'), 'U', true); addDim(I.x, I.y, A.x, I.y, val('aL'), 'L', false);
        addDim(J.x, J.y, J.x, B.y, val('bU'), 'U', true); addDim(J.x, J.y, B.x, J.y, val('bR'), 'R', false);
        addDim(K.x, K.y, K.x, C.y, val('cD'), 'D', true); addDim(K.x, K.y, C.x, K.y, val('cR'), 'R', false);
        addDim(L.x, L.y, L.x, D.y, val('dD'), 'D', true); addDim(L.x, L.y, D.x, L.y, val('dL'), 'L', false);
        if(UI.siteOffsets) UI.siteOffsets.innerHTML = html;
    }

    // --- 5. ROAD LOGIC ---
    const road = UI.roadSide.value;
    if (road === 'none') {
        if (UI.roadPoly) UI.roadPoly.style.display = 'none';
        if (UI.roadText) UI.roadText.style.display = 'none';
    } else {
        if (UI.roadPoly) UI.roadPoly.style.display = 'block';
        if (UI.roadText) UI.roadText.style.display = 'block';
        let P1, P2;
        if (road === 'north') { P1 = A; P2 = B; } else if (road === 'east') { P1 = B; P2 = C; }
        else if (road === 'south') { P1 = C; P2 = D; } else if (road === 'west') { P1 = D; P2 = A; }
        const dx = P2.x - P1.x, dy = P2.y - P1.y;
        const len = Math.sqrt(dx*dx + dy*dy);
        const ux = dy / len, uy = -dx / len;
        
        const P1_out = { x: P1.x + ux * 120, y: P1.y + uy * 120 };
        const P2_out = { x: P2.x + ux * 120, y: P2.y + uy * 120 };
        
        if (UI.roadPoly) UI.roadPoly.setAttribute('points', `${P1.x},${P1.y} ${P2.x},${P2.y} ${P2_out.x},${P2_out.y} ${P1_out.x},${P1_out.y}`);
        
        const cx = (P1.x + P2.x) / 2 + (ux * 60); const cy = (P1.y + P2.y) / 2 + (uy * 60);
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle > 90 || angle < -90) angle += 180; 
        
        if (UI.roadText) {
            UI.roadText.setAttribute('x', cx); UI.roadText.setAttribute('y', cy + 6);
            UI.roadText.setAttribute('transform', `rotate(${angle}, ${cx}, ${cy})`);
        }
    }

    // --- 6. RENDER ROOMS (WITH SMART-MERGE ENGINE) ---
    const smartMerge = UI.smartMergeToggle && UI.smartMergeToggle.checked;

    // Ensure layer groups exist for perfect Z-index stacking
    let gBorders = document.getElementById('group-borders');
    let gHollows = document.getElementById('group-hollows');
    let gRooms = document.getElementById('group-rooms');
    let gText = document.getElementById('group-text');

    if (!gBorders) {
        gBorders = document.createElementNS("http://www.w3.org/2000/svg", "g"); gBorders.id = 'group-borders';
        gHollows = document.createElementNS("http://www.w3.org/2000/svg", "g"); gHollows.id = 'group-hollows';
        gRooms = document.createElementNS("http://www.w3.org/2000/svg", "g"); gRooms.id = 'group-rooms';
        gText = document.createElementNS("http://www.w3.org/2000/svg", "g"); gText.id = 'group-text';
        if (UI.elementContainer) {
            UI.elementContainer.appendChild(gBorders);
            UI.elementContainer.appendChild(gHollows);
            UI.elementContainer.appendChild(gRooms);
            UI.elementContainer.appendChild(gText);
        }
    }

    elements.forEach((el, i) => {
        let r = document.getElementById(`rect-${i}`);
        let rb = document.getElementById(`rect-border-${i}`);
        let rh = document.getElementById(`rect-hollow-${i}`);

        if (!r) { r = document.createElementNS("http://www.w3.org/2000/svg", "rect"); r.id = `rect-${i}`; gRooms.appendChild(r); }
        if (!rb) { rb = document.createElementNS("http://www.w3.org/2000/svg", "rect"); rb.id = `rect-border-${i}`; gBorders.appendChild(rb); }
        if (!rh) { rh = document.createElementNS("http://www.w3.org/2000/svg", "rect"); rh.id = `rect-hollow-${i}`; gHollows.appendChild(rh); }
        
        if (el.floor !== currentFloor) {
            r.style.display = 'none'; rb.style.display = 'none'; rh.style.display = 'none';
            ['title', 'dims', 'area'].forEach(t => { let node = document.getElementById(`txt-${t}-${i}`); if(node) node.style.display = 'none'; });
            let dTop = document.getElementById(`dim-top-${i}`); let dLeft = document.getElementById(`dim-left-${i}`);
            if(dTop) dTop.style.display = 'none'; if(dLeft) dLeft.style.display = 'none';
            return; 
        }

        const rx = I.x + (el.x * SCALE); const ry = I.y + (el.y * SCALE);
        const w = el.w * SCALE; const h = el.h * SCALE;
        
        // Geometry setup
        [r, rb].forEach(rect => { rect.setAttribute('x', rx); rect.setAttribute('y', ry); rect.setAttribute('width', w); rect.setAttribute('height', h); });
        
        // The Hollow mask is shrunk by 1.5px to leave a clean border
        rh.setAttribute('x', rx + 1.5); rh.setAttribute('y', ry + 1.5);
        rh.setAttribute('width', w - 3); rh.setAttribute('height', h - 3);

        // Drag Behavior
        const isSelected = (i === selectedElIndex);
        r.setAttribute('class', isSelected ? 'room-rect room-selected' : 'room-rect');
        r.onmousedown = function(e) { startDrag(e, i); };

        // Smart-Merge Exception: If ON, overlapping is "fusion", not an error!
        const isColliding = smartMerge ? false : checkCollision(el, i);
        const overlapText = document.getElementById(`overlap-${i}`);
        if (overlapText) overlapText.innerText = isColliding ? ' (Overlap!)' : '';

        const baseColor = colors[el.type] || '255,255,255';
        const strokeColor = isSelected ? '#ffffff' : (isColliding ? '#ef4444' : `rgb(${baseColor})`);
        const fillColor = isColliding ? 'rgba(239, 68, 68, 0.4)' : `rgba(${baseColor}, 0.2)`;

        if (smartMerge) {
            r.style.display = 'block'; rb.style.display = 'block'; rh.style.display = 'block';
            rb.setAttribute('style', `fill: ${strokeColor}; stroke: none;`);
            rh.setAttribute('style', `fill: #0f172a; stroke: none;`); // Matches your dark background
            r.setAttribute('style', `fill: ${fillColor}; stroke: none;`);
        } else {
            // Standard Engine
            r.style.display = 'block'; rb.style.display = 'none'; rh.style.display = 'none';
            r.setAttribute('style', `
                fill: ${fillColor}; 
                stroke: ${strokeColor}; 
                stroke-width: ${isSelected ? '3' : '1.5'};
                ${el.type === 'balcony' ? 'stroke-dasharray: 6, 4;' : ''}
            `);
        }

        // Text & Data (Appended to gText layer to ensure it stays on top of fills)
        const cx = rx + w / 2; const cy = ry + h / 2;
        createOrUpdateText(`txt-title-${i}`, gText, cx, cy - 12, getRoomDisplayName(i), '#ffffff', '12', true);
        createOrUpdateText(`txt-dims-${i}`, gText, cx, cy + 4, `${Math.floor(el.w/12)}'${Math.round(el.w%12)}" × ${Math.floor(el.h/12)}'${Math.round(el.h%12)}"`, '#cbd5e1', '10', false);
        createOrUpdateText(`txt-area-${i}`, gText, cx, cy + 20, `${((el.w * el.h)/144).toFixed(1)} sq.ft`, '#94a3b8', '10', false);

        // Grid Dimensions (Unchanged)
        const showDimsToggle = UI.showDims;
        let dimTop = document.getElementById(`dim-top-${i}`);
        let dimLeft = document.getElementById(`dim-left-${i}`);
        
        if (showDimsToggle && showDimsToggle.checked) {
            if (!dimTop) { dimTop = document.createElementNS("http://www.w3.org/2000/svg", "line"); dimTop.id = `dim-top-${i}`; dimTop.setAttribute('class', 'dim-line'); if(UI.dimContainer) UI.dimContainer.appendChild(dimTop); }
            if (!dimLeft) { dimLeft = document.createElementNS("http://www.w3.org/2000/svg", "line"); dimLeft.id = `dim-left-${i}`; dimLeft.setAttribute('class', 'dim-line'); if(UI.dimContainer) UI.dimContainer.appendChild(dimLeft); }
            dimTop.setAttribute('x1', rx); dimTop.setAttribute('y1', ry); dimTop.setAttribute('x2', rx); dimTop.setAttribute('y2', I.y);
            dimLeft.setAttribute('x1', rx); dimLeft.setAttribute('y1', ry); dimLeft.setAttribute('x2', I.x); dimLeft.setAttribute('y2', ry);
            dimTop.style.display = 'block'; dimLeft.style.display = 'block';
        } else {
            if (dimTop) dimTop.style.display = 'none';
            if (dimLeft) dimLeft.style.display = 'none';
        }
    });

    // --- 7. FIXTURES ---
    let fixtureGroup = UI.fixtureContainer;
    if (!fixtureGroup) {
        fixtureGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        fixtureGroup.id = 'fixture-container';
        if(UI.elementContainer) UI.elementContainer.appendChild(fixtureGroup);
    }
    fixtureGroup.innerHTML = ''; 

    fixtures.forEach((fix, i) => {
        const room = elements[fix.roomId];
        if (!room || room.floor !== currentFloor) return;

        const rx = I.x + (room.x * SCALE); const ry = I.y + (room.y * SCALE);
        const fixSize = fix.size * SCALE; const offset = fix.offset * SCALE;

        let fx, fy, fw, fh;
        if (fix.edge === 'bottom') { fx = rx + offset; fy = ry + (room.h * SCALE) - 3; fw = fixSize; fh = 6; }
        else if (fix.edge === 'top') { fx = rx + offset; fy = ry - 3; fw = fixSize; fh = 6; }
        else if (fix.edge === 'left') { fx = rx - 3; fy = ry + offset; fw = 6; fh = fixSize; }
        else if (fix.edge === 'right') { fx = rx + (room.w * SCALE) - 3; fy = ry + offset; fw = 6; fh = fixSize; }

        if (fix.type === 'window') {
            const wRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            wRect.setAttribute('x', fx); wRect.setAttribute('y', fy); wRect.setAttribute('width', fw); wRect.setAttribute('height', fh);
            wRect.setAttribute('fill', '#06b6d4');
            wRect.onmousedown = (e) => { e.stopPropagation(); startDragFixture(i); }; 
            fixtureGroup.appendChild(wRect);
        } else if (fix.type === 'door') {
            const gap = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            gap.setAttribute('x', fx); gap.setAttribute('y', fy); gap.setAttribute('width', fw); gap.setAttribute('height', fh);
            gap.setAttribute('fill', '#0f172a'); 
            gap.onmousedown = (e) => { e.stopPropagation(); startDragFixture(i); };
            fixtureGroup.appendChild(gap);

            const swing = document.createElementNS("http://www.w3.org/2000/svg", "path");
            let d = '';
            if (fix.edge === 'bottom') d = `M ${fx} ${fy+3} L ${fx} ${fy+3 - fixSize} A ${fixSize} ${fixSize} 0 0 1 ${fx + fixSize} ${fy+3}`;
            else if (fix.edge === 'top') d = `M ${fx} ${fy+3} L ${fx} ${fy+3 + fixSize} A ${fixSize} ${fixSize} 0 0 0 ${fx + fixSize} ${fy+3}`;
            else if (fix.edge === 'left') d = `M ${fx+3} ${fy} L ${fx+3 + fixSize} ${fy} A ${fixSize} ${fixSize} 0 0 1 ${fx+3} ${fy + fixSize}`;
            else if (fix.edge === 'right') d = `M ${fx+3} ${fy} L ${fx+3 - fixSize} ${fy} A ${fixSize} ${fixSize} 0 0 0 ${fx+3} ${fy + fixSize}`;
            
            swing.setAttribute('d', d);
            swing.setAttribute('fill', 'rgba(251, 191, 36, 0.1)'); 
            swing.setAttribute('stroke', '#fbbf24'); 
            swing.setAttribute('stroke-width', '1.5');
            fixtureGroup.appendChild(swing);
        }
    });

    // --- 8. CLEANUP ---
    // --- 8. CLEANUP (Upgraded to handle the extra layers) ---
    let excessIndex = elements.length;
    while(document.getElementById(`rect-${excessIndex}`)) {
        document.getElementById(`rect-${excessIndex}`).remove();
        let rb = document.getElementById(`rect-border-${excessIndex}`); if (rb) rb.remove();
        let rh = document.getElementById(`rect-hollow-${excessIndex}`); if (rh) rh.remove();
        ['title', 'dims', 'area'].forEach(t => { let n = document.getElementById(`txt-${t}-${excessIndex}`); if(n) n.remove(); });
        let dt = document.getElementById(`dim-top-${excessIndex}`); if(dt) dt.remove();
        let dl = document.getElementById(`dim-left-${excessIndex}`); if(dl) dl.remove();
        excessIndex++;
    }
    drawColumns();

    // --- 9. STATS ---
    const plotAreaSqFt = getPolygonArea([A, B, C, D]) / (SCALE * SCALE) / 144;
    const buildAreaSqFt = (inW * inH / (SCALE * SCALE) / 144);
    const coverage = plotAreaSqFt > 0 ? ((buildAreaSqFt / plotAreaSqFt) * 100).toFixed(1) : 0;

    if (UI.plotArea) UI.plotArea.innerText = `Plot Area: ${plotAreaSqFt.toFixed(2)} sq.ft`;
    if (UI.buildArea) UI.buildArea.innerText = `Build Area: ${buildAreaSqFt.toFixed(2)} sq.ft (${coverage}% Coverage)`;
    
    validateStairs();
    // --- 10. MASTER 3D SYNC ---
    // If the 3D view is currently open, instantly regenerate it to match the new dimensions!
    if (typeof is3DMode !== 'undefined' && is3DMode) {
        generate3DModel();
    } 
    saveToMemory();
}

// Data Management
// Data Management (Upgraded Save/Load)
function exportJSON() { 
    // 1. Ask the user for a filename
    let fileName = prompt("Enter a name for your design:", "My-ArchCAD-Design");
    
    // If they click Cancel, stop the export
    if (fileName === null) return; 
    
    // If they leave it blank, default to something safe
    if (fileName.trim() === "") fileName = "My-ArchCAD-Design";
    
    // Auto-append .json if they forgot to type it
    if (!fileName.endsWith('.json')) fileName += '.json';

    // 2. Bundle all the data (including FIXTURES!)
    const data = JSON.stringify({ 
        elements: elements, 
        fixtures: fixtures, // <-- Bug Fixed: Now saves doors/windows
        building: { 
            w: document.getElementById('inW').value, 
            h: document.getElementById('inH').value 
        }, 
        floors: parseInt(document.getElementById('b-floors').value) 
    }); 
    
    // 3. Trigger the download
    const a = document.createElement('a'); 
    a.href = 'data:application/json,' + encodeURIComponent(data); 
    a.download = fileName; 
    a.click(); 
}

// Data Management (Upgraded Save/Load funcationality)
function importJSON(event) { 
    const reader = new FileReader(); 
    reader.onload = (e) => { 
        const data = JSON.parse(e.target.result); 
        
        elements = data.elements || []; 
        fixtures = data.fixtures || []; 
        
        // --- BULLETPROOF MULTI-FLOOR FIX ---
        let maxFloor = 0;
        elements.forEach(el => { 
            if (el.floor === undefined) el.floor = 0; 
            if (el.floor > maxFloor) maxFloor = el.floor;
        }); 
        
        document.getElementById('inW').value = data.building.w || 600; 
        document.getElementById('inH').value = data.building.h || 700; 
        
        const bFloorsInput = document.getElementById('b-floors');
        if (bFloorsInput) {
            // Pick whichever is higher: the saved count or the highest actual room
            bFloorsInput.value = Math.max(maxFloor + 1, data.floors || 1); 
        }

        renderFloorSelectors(); 
        setFloor(0); 
    }; 
    reader.readAsText(event.target.files[0]); 
    
    // Clear the input so you can load the exact same file again if you need to
    event.target.value = '';
}

function importJSON(event) { 
    const reader = new FileReader(); 
    reader.onload = (e) => { 
        const data = JSON.parse(e.target.result); 
        
        elements = data.elements || []; 
        fixtures = data.fixtures || []; // <-- Bug Fixed: Now loads doors/windows
        
        elements.forEach(el => { if (el.floor === undefined) el.floor = 0; }); 
        
        document.getElementById('inW').value = data.building.w || 600; 
        document.getElementById('inH').value = data.building.h || 700; 
        
        if(data.floors) { 
            document.getElementById('b-floors').value = data.floors; 
            renderFloorSelectors(); 
        } 
        setFloor(0); 
    }; 
    reader.readAsText(event.target.files[0]); 
    
    // Clear the input so you can load the exact same file again if you need to
    event.target.value = '';
}

// =========================================
// --- SPACEBAR LISTENERS ---
// =========================================
document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
    if (e.code === 'Space') {
        e.preventDefault(); 
        UI.isSpacePanMode = true; 
        svg.style.cursor = 'grab'; 
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        UI.isSpacePanMode = false; 
        UI.isSpacePanning = false; 
        svg.style.cursor = ''; 
    }
});

// Keyboard Control Engine (Nudge & Hotkeys)
document.addEventListener('keydown', (e) => {
    // 1. Ignore keystrokes if typing in an input field or not selecting anything
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
    if (selectedElIndex === -1 || isDragging) return;

    // --- NEW: DELETE HOTKEY ---
    if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault(); // Stop Backspace from navigating the browser "Back"
        deleteElement(selectedElIndex);
        return; // Stop the rest of the function
    }

    // 2. Prevent moving locked rooms
    if (elements[selectedElIndex].locked) return;

    // 3. Arrow Key Nudging
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }

    const speed = e.shiftKey ? 1 : 12; 
    
    if (e.key === 'ArrowUp') elements[selectedElIndex].y -= speed;
    if (e.key === 'ArrowDown') elements[selectedElIndex].y += speed;
    if (e.key === 'ArrowLeft') elements[selectedElIndex].x -= speed;
    if (e.key === 'ArrowRight') elements[selectedElIndex].x += speed;

    updateCanvas();
    
    // Sync the sidebar sliders visually
    const rx = document.getElementById(`range-x-${selectedElIndex}`);
    const ry = document.getElementById(`range-y-${selectedElIndex}`);
    const nx = document.getElementById(`num-x-${selectedElIndex}`);
    const ny = document.getElementById(`num-y-${selectedElIndex}`);
    
    if(rx) rx.value = elements[selectedElIndex].x;
    if(ry) ry.value = elements[selectedElIndex].y;
    if(nx) nx.value = elements[selectedElIndex].x;
    if(ny) ny.value = elements[selectedElIndex].y;
});


// Workspace UI Toggle Engine
function toggleWidget(widgetId, isVisible) {
    const widget = document.getElementById(widgetId);
    if (!widget) return;
    
    // Ensure the widget has a transition for a smooth fade
    widget.style.transition = 'opacity 0.3s ease';
    
    if (isVisible) {
        widget.style.opacity = '1';
        widget.style.pointerEvents = 'auto'; // Re-enable clicking
    } else {
        widget.style.opacity = '0';
        widget.style.pointerEvents = 'none'; // Prevent clicking invisible buttons
    }
}
// --- SIDEBAR TOGGLE ---
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('collapsed');
}

// =========================================
// EXPORT ENGINES (PNG & PDF)
// =========================================

function exportPNG() {
    const svgElement = document.getElementById('blueprint');
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);

    // Ensure the SVG namespace is present for the canvas renderer
    if (!svgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = function() {
        const canvas = document.createElement('canvas');
        // High-resolution export (2000x2000)
        canvas.width = 2000;
        canvas.height = 2000;
        const ctx = canvas.getContext('2d');
        
        // Fill the background with the app's dark mode color
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the blueprint
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url); // Free up memory

        // Trigger automatic download
        const downloadLink = document.createElement('a');
        downloadLink.href = canvas.toDataURL('image/png', 1.0);
        downloadLink.download = 'Architectural-Blueprint.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };
    img.src = url;
}

function exportPDF() {
    // Triggers the browser's native print-to-PDF engine.
    // Our @media print CSS ensures it strips the UI and perfectly frames the blueprint.
    window.print();
}

//This engine finds all your native <select> tags, hides them,
// and builds the beautiful new UI over them.

// --- FLUID CUSTOM DROPDOWN ENGINE ---
function applyCustomSelects() {
    const selects = document.querySelectorAll('select');
    selects.forEach(sel => {
        if (sel.dataset.customized) return; // Prevent double-wrapping
        sel.dataset.customized = true;
        sel.style.display = 'none'; // Hide native OS select

        // Wrap the native select
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select';
        sel.parentNode.insertBefore(wrapper, sel);
        wrapper.appendChild(sel);

        // Create the visible face of the dropdown
        const selectedDiv = document.createElement('div');
        selectedDiv.className = 'select-selected';
        selectedDiv.innerHTML = sel.options[sel.selectedIndex].innerHTML;
        wrapper.appendChild(selectedDiv);

        // Create the expanding list
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'select-items';

        for (let i = 0; i < sel.options.length; i++) {
            const opt = document.createElement('div');
            opt.innerHTML = sel.options[i].innerHTML;
            if (i === sel.selectedIndex) opt.classList.add('same-as-selected');
            
            opt.addEventListener('click', function(e) {
                sel.selectedIndex = i;
                selectedDiv.innerHTML = this.innerHTML;
                
                // Trigger your existing onchange logic (like updateCanvas)
                sel.dispatchEvent(new Event('change'));
                
                // Update hover highlights
                const siblings = this.parentNode.querySelectorAll('div');
                siblings.forEach(s => s.classList.remove('same-as-selected'));
                this.classList.add('same-as-selected');
                selectedDiv.click(); // Close dropdown
            });
            optionsDiv.appendChild(opt);
        }
        wrapper.appendChild(optionsDiv);

        // Handle opening and closing
        selectedDiv.addEventListener('click', function(e) {
            e.stopPropagation();
            closeAllSelect(this);
            this.nextSibling.classList.toggle('select-show');
            this.classList.toggle('select-arrow-active');
        });
    });
}

// Close dropdowns if the user clicks anywhere else on the screen
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

// =========================================
// First-Person Camera
// =========================================

// Add to your global 3D variables
let moveState = { forward: false, backward: false, left: false, right: false };
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

// Add this event listener setup inside init3D()
document.addEventListener('keydown', (e) => {
    if (e.key === 'w') moveState.forward = true;
    if (e.key === 's') moveState.backward = true;
    if (e.key === 'a') moveState.left = true;
    if (e.key === 'd') moveState.right = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'w') moveState.forward = false;
    if (e.key === 's') moveState.backward = false;
    if (e.key === 'a') moveState.left = false;
    if (e.key === 'd') moveState.right = false;
});


// =========================================
// 3D EXTRUSION ENGINE (Three.js)
// =========================================

let is3DMode = false;
let scene3D, camera3D, renderer3D, controls3D;
let buildingGroup;

// Map your existing 2D hex colors to 3D materials
const colors3D = { 
    living: 0xa855f7, bedroom: 0x22c55e, toilet: 0x818cf8, 
    kitchen: 0xf59e0b, puja: 0xec4899, staircase: 0x9ca3af,
    balcony: 0x14b8a6 // <-- ADD THIS LINE
};

function toggle3D() {
    is3DMode = !is3DMode;
    const svg = document.getElementById('blueprint');
    const container3D = document.getElementById('three-container');
    const navPad = document.getElementById('nav-pad'); // <-- ADDED THIS

    // --- NEW: Update Top Bar UI states ---
    document.getElementById('mode-2d').className = is3DMode ? 'switch-btn' : 'switch-btn active';
    document.getElementById('mode-3d').className = is3DMode ? 'switch-btn active' : 'switch-btn';

    if (is3DMode) {
        svg.style.display = 'none';
        container3D.style.display = 'block';
        if (navPad) navPad.style.display = 'grid'; // <-- ADDED THIS (matches your grid CSS)
        
        if (!scene3D) init3D();
        generate3DModel();
    } else {
        svg.style.display = 'block';
        container3D.style.display = 'none';
        if (navPad) navPad.style.display = 'none'; // <-- ADDED THIS
    }
}

function init3D() {
    const container = document.getElementById('three-container');
    
    // 1. Setup Scene & Camera
    scene3D = new THREE.Scene();
    scene3D.background = new THREE.Color(0x0f172a); 
    // Add a subtle premium fog to blend the horizon
    scene3D.fog = new THREE.FogExp2(0x0f172a, 0.0005);
    
    camera3D = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 1, 10000);
    camera3D.position.set(500, 800, 1000); 

    // 2. Setup Premium Renderer (Shadows & Pixel Ratio)
    renderer3D = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer3D.setPixelRatio(window.devicePixelRatio); // Crisp on Retina/4K screens
    renderer3D.setSize(container.clientWidth, container.clientHeight);
    renderer3D.shadowMap.enabled = true; // Turn on shadows
    renderer3D.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadow edges
    renderer3D.outputEncoding = THREE.sRGBEncoding; // Better color accuracy
    container.appendChild(renderer3D.domElement);

    // 3. Setup Controls
    controls3D = new THREE.OrbitControls(camera3D, renderer3D.domElement);
    controls3D.enableDamping = true; // Adds smooth, premium camera glide
    controls3D.dampingFactor = 0.05;
    controls3D.target.set(500, 0, 500);
    controls3D.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera from going under the floor

    // 4. Premium Lighting Setup
    // Hemisphere light gives realistic sky/ground ambient bounce
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 1000, 0);
    scene3D.add(hemiLight);

    // Sun light that casts actual shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(800, 1500, 500);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 2000;
    dirLight.shadow.camera.bottom = -2000;
    dirLight.shadow.camera.left = -2000;
    dirLight.shadow.camera.right = 2000;
    dirLight.shadow.bias = -0.001; // Prevents shadow artifacts
    dirLight.shadow.mapSize.width = 2048; // High-res shadows
    dirLight.shadow.mapSize.height = 2048;
    scene3D.add(dirLight);

    // 5. Floor/Grid setup
    const gridHelper = new THREE.GridHelper(3000, 100, 0x334155, 0x1e293b);
    gridHelper.position.set(500, -1, 500); // Drop slightly to prevent Z-fighting with slabs
    scene3D.add(gridHelper);

    // 6. Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        
        const speed = 15;
        direction.z = Number(moveState.forward) - Number(moveState.backward);
        direction.x = Number(moveState.left) - Number(moveState.right);
        direction.normalize();

        if (moveState.forward || moveState.backward) camera3D.translateZ(-direction.z * speed);
        if (moveState.left || moveState.right) camera3D.translateX(-direction.x * speed);

        controls3D.update(); // Required for enableDamping
        renderer3D.render(scene3D, camera3D);
    }
    animate();

    window.addEventListener('resize', () => {
        if (!is3DMode) return;
        camera3D.aspect = container.clientWidth / container.clientHeight;
        camera3D.updateProjectionMatrix();
        renderer3D.setSize(container.clientWidth, container.clientHeight);
    });
}



function generate3DModel() {
    // Clear the old building if it exists
    if (buildingGroup) scene3D.remove(buildingGroup);
    buildingGroup = new THREE.Group();
    
    // --- FAST CACHE READS ---
    const unit = UI.unitSelect.value;
    const SCALE = parseFloat(UI.scaleInput.value);
    const inW = toInches(UI.inW.value, unit) * SCALE;
    const inH = toInches(UI.inH.value, unit) * SCALE;
    
    // SVG 'y' maps to 3D 'z'. 'I' is the top-left corner of the building
    const I = { x: 500 - (inW/2), z: 500 - (inH/2) }; 
    const WALL_HEIGHT = 120 * SCALE; 

    // 1. Generate Rooms
    elements.forEach((el, i) => { 
        const width = el.w * SCALE;
        const depth = el.h * SCALE; 
        
        const centerX = I.x + (el.x * SCALE) + (width / 2);
        const centerZ = I.z + (el.y * SCALE) + (depth / 2);
        const centerY = (el.floor * WALL_HEIGHT) + (WALL_HEIGHT / 2);

        // --- 3D Collision Warning Logic ---
        const smartMerge = UI.smartMergeToggle && UI.smartMergeToggle.checked;
        const isColliding = !smartMerge && checkCollision(el, i);
        const roomColor = isColliding ? 0xef4444 : (colors3D[el.type] || 0xffffff);

        // --- NEW: Read the Real3D Toggle ---
        const useReal3D = UI.real3DToggle && UI.real3DToggle.checked;

        let mesh; 

        // If Real3D is ON, check if we have a detailed model for this room type
        if (useReal3D && el.type === 'staircase') {
            
            const direction = el.dir || 'up'; 
            let run = depth;
            let extWidth = width;
            if (direction === 'left' || direction === 'right') {
                run = width;
                extWidth = depth;
            }

            //const geom = createStaircaseGeometry(extWidth, WALL_HEIGHT, run);
            const matColor = isColliding ? 0xef4444 : 0x9ca3af;
            const mat = new THREE.MeshStandardMaterial({ 
                color: matColor, 
                transparent: true, 
                opacity: isColliding ? 0.95 : 1.0 
            });
/*          
            mesh = new THREE.Mesh(geom, mat); 
            // ---> SHADOWS HERE <---
            mesh.castShadow = true;
            mesh.receiveShadow = true;
*/
            // ---> THE NEW UPGRADE: Generate the U-Shape <---
            mesh = createUShapedGroup(run, WALL_HEIGHT, extWidth, mat); 
            // (Note: We removed mesh.castShadow here because the new function handles it internally!)
            
            const startX = I.x + (el.x * SCALE);
            const startZ = I.z + (el.y * SCALE);
            const baseY = el.floor * WALL_HEIGHT;
            
            switch(direction) {
                case 'right': 
                    mesh.rotation.y = 0; 
                    mesh.position.set(startX, baseY, startZ); 
                    break;
                case 'left':  
                    mesh.rotation.y = Math.PI; 
                    mesh.position.set(startX + width, baseY, startZ + depth); 
                    break;
                case 'up':    
                    mesh.rotation.y = Math.PI / 2; 
                    mesh.position.set(startX, baseY, startZ + depth); 
                    break;
                case 'down':  
                    mesh.rotation.y = -Math.PI / 2; 
                    mesh.position.set(startX + width, baseY, startZ); 
                    break;
            }
            
        } else {
            // THE FALLBACK: Standard Box Logic
            // Used for all normal rooms, AND staircases if Real3D is turned OFF
            const geometry = new THREE.BoxGeometry(width, WALL_HEIGHT, depth);
            const material = new THREE.MeshStandardMaterial({ 
                color: roomColor, 
                transparent: true, 
                opacity: isColliding ? 0.95 : 0.85 
            });
            
            mesh = new THREE.Mesh(geometry, material);
            // ---> SHADOWS HERE <---
            mesh.castShadow = true;
            mesh.receiveShadow = true; 
            mesh.position.set(centerX, centerY, centerZ);
            
            const edges = new THREE.EdgesGeometry(geometry);
            const edgeColor = isColliding ? 0x991b1b : 0xffffff;
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: edgeColor, linewidth: 2 }));
            mesh.add(line);
        }
        
        buildingGroup.add(mesh);
    });

    // 2. Generate Slabs
    const floors = elements.map(e => e.floor);
    const maxFloor = floors.length > 0 ? Math.max(...floors) : 0;
    for (let f = 0; f <= maxFloor; f++) {
        const slabY = ((f + 1) * WALL_HEIGHT);
        const slabGeometry = new THREE.BoxGeometry(inW, 10 * SCALE, inH);
        const slabMaterial = new THREE.MeshStandardMaterial({ color: 0x475569 });
        const slab = new THREE.Mesh(slabGeometry, slabMaterial);
        // ---> SHADOWS HERE <---
        slab.castShadow = true;
        slab.receiveShadow = true;
        slab.position.set(500, slabY, 500); 
        buildingGroup.add(slab);
    }

    // 3. Render Doors and Windows
    fixtures.forEach(fix => {
        const el = elements[fix.roomId];
        if (!el || el.floor !== currentFloor) return;

        const isDoor = fix.type === 'door';
        const width = fix.size * SCALE;
        const height = isDoor ? (80 * SCALE) : (40 * SCALE);
        const depth = 6 * SCALE; 
        
        const geometry = new THREE.BoxGeometry(
            (isDoor || fix.edge === 'top' || fix.edge === 'bottom') ? width : depth,
            height,
            (isDoor || fix.edge === 'top' || fix.edge === 'bottom') ? depth : width
        );
        const material = new THREE.MeshStandardMaterial({ color: isDoor ? 0x8b4513 : 0x38bdf8 });
        const fixMesh = new THREE.Mesh(geometry, material);

        // ---> SHADOWS HERE <---
        fixMesh.castShadow = true;
        fixMesh.receiveShadow = true;

        const yPos = (el.floor * WALL_HEIGHT) + (height / 2) + (isDoor ? 0 : 40 * SCALE);
        
        let xPos = I.x + (el.x * SCALE);
        let zPos = I.z + (el.y * SCALE);

        if (fix.edge === 'bottom') { zPos = I.z + (el.y + el.h) * SCALE; xPos = I.x + (el.x + fix.offset) * SCALE; }
        else if (fix.edge === 'top') { zPos = I.z + (el.y * SCALE); xPos = I.x + (el.x + fix.offset) * SCALE; }
        else if (fix.edge === 'left') { xPos = I.x + (el.x * SCALE); zPos = I.z + (el.y + fix.offset) * SCALE; }
        else if (fix.edge === 'right') { xPos = I.x + (el.x + el.w) * SCALE; zPos = I.z + (el.y + fix.offset) * SCALE; }

        fixMesh.position.set(xPos, yPos, zPos);
        buildingGroup.add(fixMesh);
    });

    // 4. Plot/Building Boundaries
    const val = (id) => toInches(UI[id]?.value || document.getElementById(id)?.value || 0, unit) * SCALE;
    const plotA = { x: I.x - val('aL'), z: I.z - val('aU') };
    const plotB = { x: I.x + inW + val('bR'), z: I.z - val('bU') };
    const plotC = { x: I.x + inW + val('cR'), z: I.z + inH + val('cD') };
    const plotD = { x: I.x - val('dL'), z: I.z + inH + val('dD') };

    const plotGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(plotA.x, 0, plotA.z), new THREE.Vector3(plotB.x, 0, plotB.z),
        new THREE.Vector3(plotC.x, 0, plotC.z), new THREE.Vector3(plotD.x, 0, plotD.z)
    ]);
    const plotLine = new THREE.LineLoop(plotGeom, new THREE.LineBasicMaterial({ color: 0xff4d4d }));
    buildingGroup.add(plotLine);

    const buildGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(I.x, 0.5, I.z), new THREE.Vector3(I.x + inW, 0.5, I.z),
        new THREE.Vector3(I.x + inW, 0.5, I.z + inH), new THREE.Vector3(I.x, 0.5, I.z + inH)
    ]);
    const buildLine = new THREE.LineLoop(buildGeom, new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
    buildingGroup.add(buildLine);

    scene3D.add(buildingGroup);
}
// ... existing 3D code above ...

// =========================================
// 3D NAVIGATION UTILITIES
// =========================================

function pan(direction) {
    if (!controls3D || !camera3D) return;
    const speed = 50; 
    
    // 1. Calculate the movement based on the camera's rotation
    // This ensures that "Up" is always "Up" relative to your screen, not the world
    const offset = new THREE.Vector3();
    
    if (direction === 'up') offset.set(0, speed, 0);
    if (direction === 'down') offset.set(0, -speed, 0);
    if (direction === 'left') offset.set(-speed, 0, 0);
    if (direction === 'right') offset.set(speed, 0, 0);

    // 2. Apply movement to both the target AND the camera
    controls3D.target.add(offset);
    camera3D.position.add(offset);
    
    // 3. Refresh the controls
    controls3D.update();
}

function resetCamera3D() {
    camera3D.position.set(500, 800, 1000);
    controls3D.target.set(500, 0, 500);
    controls3D.update();
}

// =========================================
// END OF 3D ENGINE
// =========================================

// =========================================
// STRUCTURAL COLUMN ENGINE
// =========================================
function drawColumns() {
    // 1. Safely check for the toggle element
    const toggle = document.getElementById('showColsToggle');
    const columnGroup = document.getElementById('column-container');
    
    if (toggle && !toggle.checked) {
        if (columnGroup) columnGroup.innerHTML = '';
        return;
    }
    
    let group = columnGroup;
    if (!group) {
        group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.id = 'column-container';
        // Ensure element-container exists before appending
        const container = document.getElementById('element-container');
        if (container) {
            container.appendChild(group);
        } else {
            console.error("element-container not found!");
            return;
        }
    }
    group.innerHTML = ''; 

    // 3. Calculation Logic
    const SCALE = parseFloat(document.getElementById('scaleInput').value);
    const inW = toInches(document.getElementById('inW').value, document.getElementById('unitSelect').value);
    const inH = toInches(document.getElementById('inH').value, document.getElementById('unitSelect').value);
    const I = { x: 500 - (inW/2), y: 500 - (inH/2) };

    const placedColumns = new Map();

    elements.forEach(el => {
        if (el.floor !== currentFloor) return;

        const corners = [
            { x: el.x, y: el.y },
            { x: el.x + el.w, y: el.y },
            { x: el.x, y: el.y + el.h },
            { x: el.x + el.w, y: el.y + el.h }
        ];

        corners.forEach(pos => {
            const key = `${Math.round(pos.x)}_${Math.round(pos.y)}`;
            
            if (!placedColumns.has(key)) {
                const cx = I.x + (pos.x * SCALE);
                const cy = I.y + (pos.y * SCALE);
                
                const col = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                col.setAttribute('cx', cx);
                col.setAttribute('cy', cy);
                col.setAttribute('r', 6 * SCALE);
                col.setAttribute('fill', '#94a3b8');
                col.setAttribute('stroke', '#1e293b');
                col.setAttribute('stroke-width', '1');
                group.appendChild(col);
                
                placedColumns.set(key, true);
            }
        });
    });
}

function createUShapedGroup(run, height, extWidth, material) {
    const group = new THREE.Group();

    // Calculate dimensions
    const halfW = extWidth / 2; 
    // Keep the landing square, but don't let it exceed 40% of the total length
    const landingDepth = Math.min(halfW, run * 0.4); 
    const flightRun = run - landingDepth;
    const halfH = height / 2;
    const steps = 10;
    const stepRun = flightRun / steps;
    const stepH = halfH / steps;

    // 1. Flight 1 (Left Side: Goes UP to the mid-landing)
    for(let i = 0; i < steps; i++) {
        const h = stepH * (i + 1);
        const geom = new THREE.BoxGeometry(stepRun, h, halfW);
        const step = new THREE.Mesh(geom, material);
        // Position on the left side, moving backwards
        step.position.set(i * stepRun + stepRun / 2, h / 2, halfW / 2);
        step.castShadow = true; step.receiveShadow = true;
        group.add(step);
    }

    // 2. Mid-Landing (The back platform)
    const landGeom = new THREE.BoxGeometry(landingDepth, halfH, extWidth);
    const landMesh = new THREE.Mesh(landGeom, material);
    landMesh.position.set(flightRun + landingDepth / 2, halfH / 2, extWidth / 2);
    landMesh.castShadow = true; landMesh.receiveShadow = true;
    group.add(landMesh);

    // 3. Flight 2 (Right Side: Turns 180 degrees and goes UP to next floor)
    for(let i = 0; i < steps; i++) {
        const h = halfH + stepH * (i + 1);
        const geom = new THREE.BoxGeometry(stepRun, h, halfW);
        const step = new THREE.Mesh(geom, material);
        // Position on the right side, moving forwards
        step.position.set(flightRun - (i * stepRun) - stepRun / 2, h / 2, halfW + halfW / 2);
        step.castShadow = true; step.receiveShadow = true;
        group.add(step);
    }

    return group;
}

function createStaircaseGeometry(w, h, depth) {
    const steps = 12; // Number of steps
    const stepDepth = depth / steps;
    const stepHeight = h / steps;
    
    const shape = new THREE.Shape();
    // Start at bottom-left (0,0)
    shape.moveTo(0, 0);
    
    // Draw the staircase profile (the side view)
    for (let i = 0; i < steps; i++) {
        shape.lineTo(i * stepDepth, (i + 1) * stepHeight);
        shape.lineTo((i + 1) * stepDepth, (i + 1) * stepHeight);
    }
    shape.lineTo(depth, 0);
    shape.lineTo(0, 0);
    
    // Extrude the profile along the width
    return new THREE.ExtrudeGeometry(shape, {
        depth: w,
        bevelEnabled: false
    });
}

function rotateStaircase(index) {
    const el = elements[index];
    if (el.type !== 'staircase') return;

    // 1. Calculate the NEW direction based on the clicked staircase
    const directions = ['up', 'right', 'down', 'left'];
    const currentIndex = directions.indexOf(el.dir || 'up');
    const newDirection = directions[(currentIndex + 1) % 4];

    // 2. MULTI-FLOOR SYNC: Apply the new direction to ALL staircases in the building
    elements.forEach(room => {
        if (room.type === 'staircase') {
            room.dir = newDirection;
        }
    });

    // 3. Trigger updates
    renderSidebar(); 
    updateCanvas();
    if (is3DMode) generate3DModel(); 
}

// =========================================
// AUTO-SAVE ENGINE (Browser Memory)
// =========================================
function saveToMemory() {
    const data = {
        elements: elements,
        fixtures: fixtures,
        inW: document.getElementById('inW').value,
        inH: document.getElementById('inH').value,
        floors: document.getElementById('b-floors').value
    };
    localStorage.setItem('ArchCAD_AutoSave', JSON.stringify(data));
}

function loadFromMemory() {
    const saved = localStorage.getItem('ArchCAD_AutoSave');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.elements && data.elements.length > 0) {
                elements = data.elements;
                fixtures = data.fixtures || [];
                if (data.inW) document.getElementById('inW').value = data.inW;
                if (data.inH) document.getElementById('inH').value = data.inH;
                
                // --- BULLETPROOF MULTI-FLOOR FIX ---
                // Scan the saved memory to find the highest floor actually used
                let maxFloor = 0;
                elements.forEach(el => {
                    if (el.floor > maxFloor) maxFloor = el.floor;
                });

                // Force the Auto-Builder input to match the actual floor count
                const bFloorsInput = document.getElementById('b-floors');
                if (bFloorsInput) {
                    bFloorsInput.value = maxFloor + 1;
                }
            }
        } catch (e) {
            console.error("Auto-save load failed.", e);
        }
    }
}

// =========================================
// RESET ENGINE
// =========================================
function resetWorkspace() {
    // 1. Strong Confirmation Warning
    if (confirm("⚠️ WARNING: This will completely erase your building and clear your saved memory. This cannot be undone.\n\nAre you sure you want to reset?")) {
        
        // 2. Clear all internal data arrays
        elements = [];
        fixtures = [];
        currentFloor = 0;
        
        // 3. Reset Plot Dimensions to your original defaults
        document.getElementById('inW').value = 272;
        document.getElementById('inH').value = 400;
        
        // 4. Reset Floor Counts back to Ground Floor only
        const bFloorsInput = document.getElementById('b-floors');
        if (bFloorsInput) bFloorsInput.value = 1;
        
        // 5. THE MOST IMPORTANT PART: Nuke the browser's Auto-Save memory
        localStorage.removeItem('ArchCAD_AutoSave');
        
        // 6. Reset the UI
        renderFloorSelectors();
        setFloor(0);
        
        // 7. Safety check: If they are in 3D mode, kick them back to 2D
        if (typeof is3DMode !== 'undefined' && is3DMode) {
            toggle3D();
        }
        
        // 8. Force the canvas to redraw everything completely blank
        updateCanvas();
    }
}


// Initialization
initDOMCache();
loadFromMemory();
renderFloorSelectors(); 
updateCanvas();
