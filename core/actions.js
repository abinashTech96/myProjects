// =========================================
// TOOLBAR & ROOM ACTIONS (actions.js)
// =========================================

function addElement(overrideType = null) {
    const type = overrideType || document.getElementById('elem-type').value;

    // 🛑 1. INTERCEPT FIXTURES FIRST
    if (type === 'door' || type === 'window') {
        if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) {
            return alert("Please click on a room first to select it before adding a door or window!");
        }
        addFixture(type);
        return;
    }

    if(typeof saveState === 'function') saveState();
    
    // 🌟 REFACTORED: Dynamic Defaults
    let w = ARCH_CONFIG.DEFAULTS.ROOM_W, h = ARCH_CONFIG.DEFAULTS.ROOM_H, isFurniture = false;

    if (ARCH_CONFIG && ARCH_CONFIG.DEFAULTS.FURNITURE[type]) {
        w = ARCH_CONFIG.DEFAULTS.FURNITURE[type].w;
        h = ARCH_CONFIG.DEFAULTS.FURNITURE[type].h;
        isFurniture = true;
    }

    elements.push({ 
        type: type, w: w, h: h,
        x: ARCH_CONFIG.DEFAULTS.SPAWN_X, // 🌟 REFACTORED
        y: ARCH_CONFIG.DEFAULTS.SPAWN_Y, // 🌟 REFACTORED
        floor: currentFloor, locked: false, 
        dir: type === 'staircase' ? 'up' : null,
        isFurniture: isFurniture
    });
    
    if(typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas();
}

function deleteElement(idx) {
    ProjectState.deleteElement(idx);
    if(typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas(); 
}

function cloneElement(idx) {
    if(typeof saveState === 'function') saveState();
    const clone = JSON.parse(JSON.stringify(elements[idx]));
    // 🌟 REFACTORED: Use Clone Offset
    clone.x += ARCH_CONFIG.DEFAULTS.CLONE_OFFSET; 
    clone.y += ARCH_CONFIG.DEFAULTS.CLONE_OFFSET;
    elements.push(clone);
    if(typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas();
}

function rotateElement(idx) {
    if(typeof saveState === 'function') saveState();
    const el = elements[idx]; 
    const tempW = el.w; el.w = el.h; el.h = tempW;
    if(typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas();
}

function addFixture(type) {
    if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) return alert("Please click on a room first to select it!");
    if (elements[selectedElIndex].isFurniture) return alert("Cannot add doors or windows to furniture.");

    if(typeof saveState === 'function') saveState();
    fixtures.push({ 
        type: type, 
        roomId: selectedElIndex, 
        edge: 'bottom', 
        offset: ARCH_CONFIG.DEFAULTS.FIXTURE_OFFSET, // 🌟 REFACTORED
        size: type === 'door' ? (ARCH_CONFIG?.DEFAULTS?.DOOR_SIZE || 30) : (ARCH_CONFIG?.DEFAULTS?.WINDOW_SIZE || 15)
    });
    
    if (typeof renderSidebar === 'function') renderSidebar();
    updateCanvas();
}

function addDoor(roomId) { addFixture('door'); }
function addWindow(roomId) { addFixture('window'); }

function rotateStaircase(index) {
    if(typeof saveState === 'function') saveState();
    const el = elements[index];
    if (el.type !== 'staircase') return;
    const directions = ['up', 'right', 'down', 'left'];
    el.dir = directions[(directions.indexOf(el.dir || 'up') + 1) % 4];
    if(typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas();
    if (typeof request3DUpdate === 'function') request3DUpdate();
}

function syncStaircases(sourceIndex) {
    const source = elements[sourceIndex];
    if (!source || source.type !== 'staircase') return;
    elements.forEach((el, index) => {
        if (el.type === 'staircase' && index !== sourceIndex) {
            el.x = source.x; el.y = source.y; el.w = source.w; el.h = source.h; el.dir = source.dir;
        }
    });
}

// --- FLOOR MANAGEMENT ---
function setFloor(f) {
    currentFloor = f;
    selectedElIndex = -1;
    if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
    if (typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas();
}

function addManualFloor() {
    if(typeof saveState === 'function') saveState();
    const bFloorsInput = document.getElementById('b-floors');
    let currentCount = parseInt(bFloorsInput.value) || 1;
    const newFloorNum = currentCount; 
    bFloorsInput.value = currentCount + 1; 

    elements.filter(e => e.type === 'staircase' && e.floor === newFloorNum - 1).forEach(stair => {
        const clone = JSON.parse(JSON.stringify(stair));
        clone.floor = newFloorNum; 
        elements.push(clone);
    });
    
    if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
    setFloor(newFloorNum);
}

function deleteCurrentFloor() {
    if (currentFloor === 0) return alert("You cannot delete the Ground Floor. Delete the individual rooms instead.");
    if (!confirm(`⚠️ Are you sure you want to completely delete the ${currentFloor === 1 ? '1st' : currentFloor + 'th'} floor and all its rooms?`)) return;

    if (typeof saveState === 'function') saveState();
    const indicesToDelete = [];
    elements.forEach((el, index) => { if (el.floor === currentFloor) indicesToDelete.push(index); });
    indicesToDelete.reverse();

    indicesToDelete.forEach(idx => {
        elements.splice(idx, 1);
        fixtures = fixtures.filter(f => f.roomId !== idx);
        fixtures.forEach(f => { if (f.roomId > idx) f.roomId--; });
    });

    elements.forEach(el => { if (el.floor > currentFloor) el.floor -= 1; });
    
    const bFloorsInput = document.getElementById('b-floors');
    bFloorsInput.value = Math.max(1, (parseInt(bFloorsInput.value) || 1) - 1);

    if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
    setFloor(currentFloor - 1);
}

function cloneEntireFloor() {
    const currentElements = elements.filter(e => e.floor === currentFloor);
    if (currentElements.length === 0) return alert("Nothing to clone!");
    
    const bFloorsInput = document.getElementById('b-floors');
    let currentCount = parseInt(bFloorsInput.value) || 1;
    let targetName = currentCount === 1 ? "1st" : currentCount === 2 ? "2nd" : `${currentCount}th`;
    
    if (!confirm(`Clone this floor to a new ${targetName} Floor level?`)) return;
    
    if(typeof saveState === 'function') saveState();
    const targetFloor = currentCount; 
    const newRoomStartIndex = elements.length;
    bFloorsInput.value = targetFloor + 1;

    currentElements.forEach(room => {
        const clone = JSON.parse(JSON.stringify(room)); 
        clone.floor = targetFloor; 
        elements.push(clone);
    });
    
    const currentFixtures = fixtures.filter(f => elements[f.roomId] && elements[f.roomId].floor === currentFloor);
    currentFixtures.forEach(fix => {
        const room = elements[fix.roomId];
        const cloneFix = JSON.parse(JSON.stringify(fix));
        cloneFix.roomId = newRoomStartIndex + currentElements.indexOf(room);
        fixtures.push(cloneFix);
    });
    
    if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
    setFloor(targetFloor);
}

function generateBuilding() {
    if (elements.length > 0 && !confirm("Generating a new building will clear your current rooms. Continue?")) return;
    if(typeof saveState === 'function') saveState();
    let floorCount = parseInt(document.getElementById('b-floors').value);
    if (floorCount < 1 || isNaN(floorCount)) floorCount = 1;
    
    let maxReqW = 0; let maxReqH = 0;
    // 🌟 REFACTORED: Dynamic Staircase Bound Checking
    const sConf = ARCH_CONFIG.DEFAULTS.STAIRCASE;
    for(let i = 0; i < floorCount; i++) {
        const layoutKey = document.getElementById(`layout-f${i}`).value;
        if(layoutKey !== 'none' && ARCH_CONFIG.LAYOUTS && ARCH_CONFIG.LAYOUTS[layoutKey]) {
            ARCH_CONFIG.LAYOUTS[layoutKey].forEach(room => {
                if (room.x + room.w > maxReqW) maxReqW = room.x + room.w;
                if (room.y + room.h > maxReqH) maxReqH = room.y + room.h;
            });
        }
        if (floorCount > 1) {
            if (sConf.x + sConf.w > maxReqW) maxReqW = sConf.x + sConf.w;
            if (sConf.y + sConf.h > maxReqH) maxReqH = sConf.y + sConf.h;
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
    
    const tabsContainer = document.getElementById('top-floor-tabs');
    if (tabsContainer) tabsContainer.innerHTML = '';
    
    for(let i = 0; i < floorCount; i++) {
        let label = i === 0 ? "G" : i === 1 ? "1st" : i === 2 ? "2nd" : `${i}th`;
        if (tabsContainer) tabsContainer.innerHTML += `<button class="floor-btn" data-floor="${i}" onclick="setFloor(${i})">${label}</button>`;
        
        const layoutKey = document.getElementById(`layout-f${i}`).value;
        if(layoutKey !== 'none' && ARCH_CONFIG.LAYOUTS && ARCH_CONFIG.LAYOUTS[layoutKey]) {
            const layoutData = JSON.parse(JSON.stringify(ARCH_CONFIG.LAYOUTS[layoutKey]));
            layoutData.forEach(room => { 
                room.w = Math.round(room.w * scaleFactor); room.h = Math.round(room.h * scaleFactor);
                room.x = Math.round(room.x * scaleFactor); room.y = Math.round(room.y * scaleFactor);
                room.floor = i; elements.push(room); 
            });
        }
        // 🌟 REFACTORED: Dynamic Staircase Generation
        if (floorCount > 1) {
            elements.push({ 
                type: 'staircase', 
                w: Math.round(sConf.w * scaleFactor), 
                h: Math.round(sConf.h * scaleFactor), 
                x: Math.round(sConf.x * scaleFactor), 
                y: Math.round(sConf.y * scaleFactor), 
                floor: i,
                locked: false,
                dir: 'up' 
            });
        }
    }
    setFloor(0); 
}



function toggleHybrid(panelName) {
    // Define the two INDEPENDENT accordion containers
    const container1 = ['plot', 'floors'];
    const container2 = ['workspace', 'interiors'];

    // Determine which container the clicked panel belongs to
    const activeContainer = container1.includes(panelName) ? container1 : container2;

    const targetContent = document.getElementById(`content-${panelName}`);
    if (!targetContent) return;
    
    const isAlreadyActive = targetContent.classList.contains('active');

    // 1. Close ALL panels ONLY in the active container (ignores the other container completely)
    activeContainer.forEach(name => {
        const btn = document.getElementById(`btn-${name}`);
        const content = document.getElementById(`content-${name}`);
        if (btn) btn.classList.remove('active');
        if (content) content.classList.remove('active');
    });

    // 2. If the user clicked a closed panel, open it
    if (!isAlreadyActive) {
        const btn = document.getElementById(`btn-${panelName}`);
        const content = document.getElementById(`content-${panelName}`);
        if (btn) btn.classList.add('active');
        if (content) content.classList.add('active');
    }
}


// =========================================
// VECTOR PDF EXPORT ENGINE (Browser Native)
// =========================================
window.exportPDF = function() {
    // 1. Clone the pristine SVG canvas directly
    const svgNode = document.getElementById('blueprint').cloneNode(true);
    
    // 2. Remove all UI overlays, crosshairs, and selection borders from the clone
    const layersToHide = ['smart-guides', 'measure-group', 'column-container', 'dim-group'];
    layersToHide.forEach(id => {
        const el = svgNode.querySelector(`#${id}`);
        if (el) el.remove();
    });
    
    // Remove the glowing selection border from any active room
    svgNode.querySelectorAll('.room-selected').forEach(el => {
        el.classList.remove('room-selected');
        el.setAttribute('stroke', '#ffffff');
    });

    // 3. Create a clean, temporary print window
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    
    // Calculate Total Area for the Title Block
    const totalArea = elements.reduce((sum, el) => sum + ((el.w * el.h) / 144), 0).toFixed(1);
    const dateStr = new Date().toLocaleDateString();

    // 4. Inject the Vector SVG and a professional Title Block into the print window
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>ArchCAD_Blueprint_Export</title>
                <style>
                    body { margin: 0; padding: 0; background: #ffffff; font-family: sans-serif; }
                    .print-wrapper { width: 100vw; height: 100vh; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
                    .frame { flex-grow: 1; border: 4px solid #0f172a; position: relative; overflow: hidden; display: flex; justify-content: center; align-items: center; background: #0f172a; }
                    svg { width: 100%; height: 100%; object-fit: contain; }
                    
                    /* The Professional Title Block */
                    .title-block { position: absolute; bottom: 0; right: 0; width: 400px; background: white; border-top: 4px solid #0f172a; border-left: 4px solid #0f172a; display: grid; grid-template-columns: 1fr 1fr; color: #0f172a; }
                    .title-header { grid-column: span 2; padding: 12px; background: #0f172a; color: white; text-align: center; font-weight: 900; font-size: 1.2rem; letter-spacing: 2px; }
                    .title-cell { padding: 10px; border-right: 2px solid #0f172a; border-bottom: 2px solid #0f172a; font-size: 0.7rem; }
                    .title-cell:nth-child(even) { border-right: none; }
                    .title-cell strong { color: #64748b; }
                    .title-val { display: block; font-size: 1rem; font-weight: bold; margin-top: 4px; }
                    
                    /* Force landscape mode in the browser print dialog */
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
                            <div class="title-cell"><strong>DATE</strong><span class="title-val">${dateStr}</span></div>
                            <div class="title-cell" style="border-bottom: none;"><strong>DRAWN BY</strong><span class="title-val">System Admin</span></div>
                            <div class="title-cell" style="border-bottom: none;"><strong>TOTAL AREA</strong><span class="title-val">${totalArea} sqft</span></div>
                        </div>
                    </div>
                </div>
                <script>
                    // Wait for the SVG to render, then open the print dialog!
                    window.onload = () => {
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
};

// =========================================
// 🌟 2D SECTION CUT & ELEVATION ENGINE
// =========================================
let isSectionMode = false;
let sectionStart = null;
let sectionLine = null;

window.toggleSectionCut = function() {
    isSectionMode = !isSectionMode;
    const btn = document.getElementById('btn-section');
    const svg = document.getElementById('blueprint'); // Your main 2D canvas

    if (isSectionMode) {
        btn.style.background = '#0ea5e9';
        btn.style.color = '#0f172a';
        svg.style.cursor = 'crosshair';
        
        svg.addEventListener('mousedown', onSectionDown);
        svg.addEventListener('mousemove', onSectionMove);
        svg.addEventListener('mouseup', onSectionUp);
    } else {
        btn.style.background = '';
        btn.style.color = '';
        svg.style.cursor = 'default';
        
        svg.removeEventListener('mousedown', onSectionDown);
        svg.removeEventListener('mousemove', onSectionMove);
        svg.removeEventListener('mouseup', onSectionUp);
        if (sectionLine) { sectionLine.remove(); sectionLine = null; }
    }
};
function getSectionPos(evt) {
    const svg = document.getElementById('blueprint');
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function onSectionDown(e) {
    if (!isSectionMode) return;
    sectionStart = getSectionPos(e);
    
    sectionLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    sectionLine.setAttribute("x1", sectionStart.x);
    sectionLine.setAttribute("y1", sectionStart.y);
    sectionLine.setAttribute("x2", sectionStart.x);
    sectionLine.setAttribute("y2", sectionStart.y);
    sectionLine.setAttribute("stroke", "#ef4444");
    sectionLine.setAttribute("stroke-width", "4");
    sectionLine.setAttribute("stroke-dasharray", "10,10");
    document.getElementById('blueprint').appendChild(sectionLine);
}
function onSectionMove(e) {
    if (!isSectionMode || !sectionStart || !sectionLine) return;
    const pt = getSectionPos(e);
    
    // 🌟 FIX 4: STRAIGHT-AXIS LOCKING
    const dx = Math.abs(pt.x - sectionStart.x);
    const dy = Math.abs(pt.y - sectionStart.y);
    const tol = ARCH_CONFIG.REFINEMENTS.SECTION_SNAP_TOLERANCE;
    
    // Snap to straight lines if within tolerance, or if holding SHIFT
    if (dx < tol || (e.shiftKey && dx < dy)) pt.x = sectionStart.x;
    if (dy < tol || (e.shiftKey && dy < dx)) pt.y = sectionStart.y;
    
    sectionLine.setAttribute("x2", pt.x);
    sectionLine.setAttribute("y2", pt.y);
}
function onSectionUp(e) {
    if (!isSectionMode || !sectionStart) return;
    const pt = getSectionPos(e);
    
    // Process the cut if line is long enough
    const dist = Math.hypot(pt.x - sectionStart.x, pt.y - sectionStart.y);
    if (dist > 20) {
        generateElevation(sectionStart.x, sectionStart.y, pt.x, pt.y, dist);
    }
    
    toggleSectionCut(); // Turn tool off after one cut
    sectionStart = null;
}
function getIntersection(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
    const d = (p2x - p1x) * (p4y - p3y) - (p2y - p1y) * (p4x - p3x);
    if (d === 0) return null; // Parallel

    const u = ((p3x - p1x) * (p4y - p3y) - (p3y - p1y) * (p4x - p3x)) / d;
    const v = ((p3x - p1x) * (p2y - p1y) - (p3y - p1y) * (p2x - p1x)) / d;

    if (u < 0 || u > 1 || v < 0 || v > 1) return null; // Doesn't intersect within segments
    
    return { x: p1x + u * (p2x - p1x), y: p1y + u * (p2y - p1y), distanceRatio: u };
}
function generateElevation(x1, y1, x2, y2, totalDist) {
    const wallH = (typeof ARCH_CONFIG !== 'undefined' ? ARCH_CONFIG.DEFAULTS.WALL_HEIGHT_3D : 120);
    const wallT = (typeof ARCH_CONFIG !== 'undefined' ? ARCH_CONFIG.DEFAULTS.WALL_THICKNESS_3D : 4);
    
    let cuts = [];

    // Check intersections with every room
    elements.forEach(el => {
        if (el.isFurniture) return;
        
        const walls = [
            { x3: el.x, y3: el.y, x4: el.x + el.w, y4: el.y },                 // Top
            { x3: el.x + el.w, y3: el.y, x4: el.x + el.w, y4: el.y + el.h },   // Right
            { x3: el.x, y3: el.y + el.h, x4: el.x + el.w, y4: el.y + el.h },   // Bottom
            { x3: el.x, y3: el.y, x4: el.x, y4: el.y + el.h }                  // Left
        ];

        walls.forEach(w => {
            const hit = getIntersection(x1, y1, x2, y2, w.x3, w.y3, w.x4, w.y4);
            if (hit) {
                cuts.push({
                    dist: hit.distanceRatio * totalDist,
                    floor: el.floor,
                    color: ARCH_CONFIG?.COLORS?.[el.type]?.rgb || '148,163,184'
                });
            }
        });
    });

    // Remove duplicates (shared walls)
    cuts = cuts.filter((v, i, a) => a.findIndex(t => (Math.abs(t.dist - v.dist) < 1 && t.floor === v.floor)) === i);
    cuts.sort((a, b) => a.dist - b.dist);

    renderElevationModal(cuts, totalDist, wallH, wallT);
}
function renderElevationModal(cuts, totalDist, wallH, wallT) {
    let existing = document.getElementById('elevation-modal');
    if (existing) existing.remove();

    const maxFloor = cuts.length > 0 ? Math.max(...cuts.map(c => c.floor)) : 0;
    
    // Increase margins for professional blueprint look
    const leftMargin = 100;
    const rightMargin = 50;
    const bottomMargin = 80;
    const topMargin = 80;

    const viewWidth = totalDist + leftMargin + rightMargin;
    const viewHeight = ((maxFloor + 2) * wallH) + bottomMargin + topMargin;
    const groundY = viewHeight - bottomMargin; 
    
    // --- 1. SVG Definitions (Grid, Hatching, Gradients) ---
    let svgContent = `
        <defs>
            <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56, 189, 248, 0.07)" stroke-width="1"/>
            </pattern>
            <pattern id="wall-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
            </pattern>
            <linearGradient id="ground-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgba(16, 185, 129, 0.2)" />
                <stop offset="100%" stop-color="rgba(16, 185, 129, 0)" />
            </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bp-grid)" />
    `;

    // --- 2. Ground & Subterranean Gradient ---
    svgContent += `
        <rect x="0" y="${groundY}" width="100%" height="${bottomMargin}" fill="url(#ground-fade)" />
        <line x1="0" y1="${groundY}" x2="100%" y2="${groundY}" stroke="#10b981" stroke-width="4" />
        <text x="15" y="${groundY - 10}" fill="#10b981" font-size="14" font-family="monospace" font-weight="bold">GL ±0'-0"</text>
    `;

    // --- 3. Elevation Axes & Slabs ---
    for(let f = 0; f <= maxFloor + 1; f++) {
        const slabY = groundY - (f * wallH);
        const elevationFeet = (f * wallH) / 12; // Calculate feet based on your engine scale
        
        // Slab Line
        svgContent += `<line x1="${leftMargin - 20}" y1="${slabY}" x2="100%" y2="${slabY}" stroke="#475569" stroke-width="4" stroke-dasharray="15,5" />`;
        
        // Elevation Level Text
        if (f > 0) {
            const label = f > maxFloor ? "ROOF LEVEL" : `LEVEL ${f}`;
            svgContent += `
                <text x="15" y="${slabY - 5}" fill="#38bdf8" font-size="12" font-family="monospace" font-weight="bold">${label}</text>
                <text x="15" y="${slabY + 15}" fill="#94a3b8" font-size="10" font-family="monospace">EL +${Math.floor(elevationFeet)}'-0"</text>
            `;
        }
    }

    // --- 4. Architect Scale Figure (6ft tall) ---
    const scaleX = leftMargin + 20;
    const scaleY = groundY;
    svgContent += `
        <g opacity="0.4">
            <circle cx="${scaleX}" cy="${scaleY - 65}" r="6" fill="#cbd5e1" />
            <rect x="${scaleX - 7}" y="${scaleY - 57}" width="14" height="28" rx="4" fill="#cbd5e1" />
            <rect x="${scaleX - 5}" y="${scaleY - 30}" width="4" height="30" fill="#cbd5e1" />
            <rect x="${scaleX + 1}" y="${scaleY - 30}" width="4" height="30" fill="#cbd5e1" />
            <text x="${scaleX - 10}" y="${scaleY - 80}" fill="#cbd5e1" font-size="9" font-family="monospace">6' SCALE</text>
        </g>
    `;

    // --- 5. Cut Walls ---
    cuts.forEach(cut => {
        const xPos = leftMargin + cut.dist;
        const baseY = groundY - (cut.floor * wallH);
        
        // Draw a subtle centerline axis for the wall
        svgContent += `<line x1="${xPos}" y1="${baseY}" x2="${xPos}" y2="${baseY - wallH}" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="4,4" />`;
        
        // Draw the solid hatched wall block
        svgContent += `
            <rect x="${xPos - (wallT/2)}" y="${baseY - wallH}" width="${wallT}" height="${wallH}" 
                  fill="url(#wall-hatch)" stroke="rgb(${cut.color})" stroke-width="3" />
            
            <circle cx="${xPos}" cy="${baseY}" r="4" fill="rgb(${cut.color})" />
        `;
        
        // Distance marker (from start of cut)
        const distFeet = Math.floor(cut.dist / 12);
        const distInch = Math.round(cut.dist % 12);
        svgContent += `
            <text x="${xPos}" y="${groundY + 25}" fill="#94a3b8" font-size="10" font-family="monospace" text-anchor="middle">
                ${distFeet}' ${distInch}"
            </text>
            <circle cx="${xPos}" cy="${groundY}" r="3" fill="#cbd5e1" />
        `;
    });

    const totalFeet = Math.floor(totalDist / 12);
    const totalInch = Math.round(totalDist % 12);

    // --- 6. The UI Modal HTML ---
    const modalHTML = `
        <div id="elevation-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(2, 6, 23, 0.85); backdrop-filter:blur(15px); z-index:100000; display:flex; justify-content:center; align-items:center; flex-direction:column;">
            
            <div style="width:95%; max-width:1400px; background:#0f172a; border:1px solid rgba(56, 189, 248, 0.4); border-radius:16px; padding:25px; box-shadow:0 30px 60px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.1);">
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.1);">
                    <div style="display:flex; align-items:center; gap: 15px;">
                        <div style="background: rgba(56, 189, 248, 0.1); padding: 10px; border-radius: 10px; border: 1px solid rgba(56,189,248,0.2);">
                            <span style="font-size: 1.5rem;">📐</span>
                        </div>
                        <div>
                            <h2 style="color:#f1f5f9; margin:0; font-size:1.4rem; letter-spacing: 1px;">CROSS SECTION <span style="color:#38bdf8;">ELEVATION</span></h2>
                            <span style="color:#94a3b8; font-size:0.85rem; font-family: monospace;">A-A' Profile View • Auto-Generated Architecture</span>
                        </div>
                    </div>
                    <button class="neo-btn" onclick="document.getElementById('elevation-modal').remove()" style="padding:10px 20px; font-weight: bold; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); cursor: pointer; border-radius: 8px;">
                        ✕ CLOSE SECTION
                    </button>
                </div>

                <div style="background:#020617; border-radius:12px; overflow-x:auto; overflow-y:hidden; display:flex; justify-content:flex-start; border: 1px inset rgba(255,255,255,0.05); padding: 10px; box-shadow: inset 0 10px 20px rgba(0,0,0,0.5);">
                    <svg width="${viewWidth}" height="${viewHeight}" style="min-width:100%; max-height: 65vh; font-family: monospace;">
                        ${svgContent}
                    </svg>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
                    <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; border-left: 3px solid #38bdf8;">
                        <div style="font-size: 0.7rem; color: #94a3b8; font-weight: bold; margin-bottom: 5px;">TOTAL CUT LENGTH</div>
                        <div style="font-size: 1.2rem; color: #f1f5f9; font-family: monospace;">${totalFeet}' ${totalInch}"</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; border-left: 3px solid #10b981;">
                        <div style="font-size: 0.7rem; color: #94a3b8; font-weight: bold; margin-bottom: 5px;">INTERSECTED WALLS</div>
                        <div style="font-size: 1.2rem; color: #f1f5f9; font-family: monospace;">${cuts.length} LOAD-BEARING</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; border-left: 3px solid #f59e0b;">
                        <div style="font-size: 0.7rem; color: #94a3b8; font-weight: bold; margin-bottom: 5px;">MAX HEIGHT (GL TO ROOF)</div>
                        <div style="font-size: 1.2rem; color: #f1f5f9; font-family: monospace;">${Math.floor(((maxFloor + 1) * wallH) / 12)}'-0"</div>
                    </div>
                </div>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// =========================================
// 🌟 CLIENT SHOWCASE MODE
// =========================================
window.toggleShowcaseMode = function() {
    // 1. Force 3D mode if it isn't currently active
    if (typeof is3DMode !== 'undefined' && !is3DMode) {
        toggle3D();
    }

    // 2. Toggle the CSS state class
    const isShowcase = document.body.classList.toggle('showcase-active');

    // 3. Handle the OS-Level Fullscreen API
    if (isShowcase) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen(); // Safari
        else if (elem.msRequestFullscreen) elem.msRequestFullscreen(); // IE11
    } else {
        if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        }
    }

    // 4. Force the Three.js renderer to recalculate its aspect ratio perfectly
    setTimeout(() => {
        if (typeof camera3D !== 'undefined' && typeof renderer3D !== 'undefined') {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            // Adjust camera
            camera3D.aspect = width / height;
            camera3D.updateProjectionMatrix();
            
            // Adjust renderer
            renderer3D.setSize(width, height);
            
            // Re-render immediately to prevent flickering
            if (typeof scene3D !== 'undefined') {
                renderer3D.render(scene3D, camera3D);
            }
        }
    }, 100); // 100ms delay ensures the browser has finished resizing before calculating
};
// =========================================
// 🌟 CLIENT SHOWCASE MODE
// =========================================
// =========================================
// 🌟 VASTU SHASTRA SCORING ENGINE
// =========================================
window.calculateVastuScore = function() {
    let score = 0;
    let mainText = "Add rooms to calculate Vastu.";
    let color = "#94a3b8"; // Gray default

    if (elements.length > 0) {
        score = 50; // Neutral base score
        let feedback = [];
        const inW = parseFloat(document.getElementById('inW')?.value || 272);
        const inH = parseFloat(document.getElementById('inH')?.value || 400);

        // Divide plot into 3x3 grid (9 Mandala Zones)
        const cellW = inW / 3;
        const cellH = inH / 3;

        elements.forEach(el => {
            if (el.isFurniture || el.floor > 0) return; // Vastu is primarily evaluated on the Ground Floor
            const cx = el.x + (el.w / 2);
            const cy = el.y + (el.h / 2);
            // Determine Compass Zone
            let zoneStr = "";
            if (cx > cellW * 2) zoneStr += "N";
            else if (cx < cellW) zoneStr += "S";
            if (cy > cellH * 2) zoneStr += "E";
            else if (cy < cellH) zoneStr += "W";
            if (zoneStr === "") zoneStr = "CENTER";
            // Apply Global Rules
            if (el.type === 'kitchen') {
                if (zoneStr === "SE") { score += 20; feedback.push("Kitchen perfectly in SE (+20)"); }
                else if (zoneStr === "NW") { score += 10; feedback.push("Kitchen acceptable in NW (+10)"); }
                else { score -= 15; feedback.push(`Kitchen in ${zoneStr} (Should be SE) (-15)`); }
            }
            if (el.type === 'puja') {
                if (zoneStr === "NE") { score += 20; feedback.push("Puja perfectly in NE (+20)"); }
                else { score -= 10; feedback.push(`Puja in ${zoneStr} (Should be NE) (-10)`); }
            }
            if (el.type === 'bedroom') {
                if (zoneStr === "SW") { score += 15; feedback.push("Master Bed perfectly in SW (+15)"); }
            }
            if (el.type === 'toilet') {
                if (zoneStr === "NE" || zoneStr === "SW") { score -= 25; feedback.push(`Toilet strictly prohibited in ${zoneStr} (-25)`); }
                else { score += 10; }
            }
        });
        
        score = Math.max(0, Math.min(100, score)); // Clamp between 0 and 100
        
        // Determine Color based on score
        color = "#10b981"; // Green (Good)
        if (score < 40) color = "#ef4444"; // Red (Bad)
        else if (score < 70) color = "#f59e0b"; // Orange (Average)
        
        mainText = feedback.length > 0 ? feedback[0] : "Good overall spatial flow.";
        if (score === 50 && feedback.length === 0) mainText = "Add specific rooms (Kitchen, Puja, Toilets) for scoring.";
    }

    // 🌟 Update the Floating Dark-Themed Vastu Widget on the 2D Canvas
    const badge = document.getElementById('vastu-score-badge');
    const ring = document.getElementById('vastu-ring');
    const circleText = document.getElementById('vastu-circle-text');
    const feedback = document.getElementById('vastu-feedback-text');

    if (badge && ring && circleText && feedback) {
        badge.innerText = `${score}/100`;
        badge.style.color = color;
        badge.style.boxShadow = `0 0 8px ${color}44`;

        ring.style.background = `conic-gradient(${color} ${score}%, #1e293b 0)`;
        circleText.innerText = score;
        feedback.innerText = mainText;
        feedback.title = mainText; // Adds hover tooltip for detailed feedback
    }

    return { score, text: mainText, color };
};
// =========================================
// 🌟 VASTU SHASTRA SCORING ENGINE
// =========================================