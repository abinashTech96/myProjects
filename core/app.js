// =================================================================
// APP.JS - CORE 2D ENGINE (Unabridged)
// =================================================================
let cachedSnapBoundaries = [];
// --- CAMERA & VIEWPORT (Secured Namespace) ---
const CanvasState = {
    panX: 0,
    panY: 0,
    zoomLvl: 1,
    snapLines: []
};

function updateViewport() {
    if (UI.viewport) UI.viewport.setAttribute('transform', `matrix(${CanvasState.zoomLvl}, 0, 0, ${CanvasState.zoomLvl}, ${CanvasState.panX}, ${CanvasState.panY})`);
}
function panCamera(dx, dy) {
    CanvasState.panX += dx; CanvasState.panY += dy;
    updateViewport();
}
function zoomCamera(factor, e = null) {
    const newZoom = CanvasState.zoomLvl * factor;
    if (newZoom < 0.2 || newZoom > 5) return;
    let pointerX = 500;
    let pointerY = 500;
    if (e && UI.blueprint) {
        const pt = UI.blueprint.createSVGPoint();
        pt.x = e.clientX || (e.touches ? e.touches[0].clientX : 500);
        pt.y = e.clientY || (e.touches ? e.touches[0].clientY : 500);
        const svgP = pt.matrixTransform(UI.blueprint.getScreenCTM().inverse());
        pointerX = svgP.x;
        pointerY = svgP.y;
    }
    CanvasState.panX = pointerX - (pointerX - CanvasState.panX) * factor;
    CanvasState.panY = pointerY - (pointerY - CanvasState.panY) * factor;
    CanvasState.zoomLvl = newZoom;
    updateViewport();
}
function resetCamera() {
    CanvasState.panX = 0; CanvasState.panY = 0; CanvasState.zoomLvl = 1;
    updateViewport();
}

// --- SVG DRAWING HELPERS ---
function updateSVGPosition(id, x, y, labelText, isVisible) {
    const el = document.getElementById(id); 
    if (!el) return;
    el.setAttribute('x', x); el.setAttribute('y', y); 
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
    g.innerHTML = `<circle cx="0" cy="0" r="12" fill="rgba(15, 23, 42, 0.9)" stroke="${color}" stroke-width="2" />
                   <text x="0" y="4" fill="#f8fafc" font-size="11" font-weight="bold" text-anchor="middle" style="pointer-events: none;">${label}</text>`;
}

function createOrUpdateText(id, container, x, y, text, color, fontSize, isBold) {
    let t = document.getElementById(id);
    if (!t || t.tagName !== 'text') {
        if(t) t.remove();
        t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.id = id;
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('pointer-events', 'none'); 
        t.style.textShadow = "1px 1px 2px #000";
        container.appendChild(t);
    }
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('fill', color); t.setAttribute('font-size', fontSize);
    if (isBold) t.setAttribute('font-weight', 'bold');
    t.textContent = text; t.style.display = 'block';
}

function drawColumnsOld(geom) {
    const toggle = UI.showColsToggle || document.getElementById('showColsToggle');
    if (!toggle || !toggle.checked) return; 
    let group = getOrCreateSVG('g', 'column-container', UI.elementContainer || UI.blueprint);
    group.style.display = '';
    const SCALE = geom ? geom.SCALE : (parseFloat(UI.scaleInput?.value) || 1.2);
    const I = geom ? geom.I : { 
        x: 500 - (toInches(UI.inW?.value || 0, UI.unitSelect?.value || 'in') * SCALE / 2), 
        y: 500 - (toInches(UI.inH?.value || 0, UI.unitSelect?.value || 'in') * SCALE / 2) 
    };
    const placedColumns = new Set();
    let displayIdx = 0;
    elements.forEach(el => {
        // 🌟 FIX: Always calculate columns from the Ground Floor (Foundation)
        if (el.floor !== 0 || el.isFurniture) return;
        const corners = [ 
            { x: el.x, y: el.y }, 
            { x: el.x + el.w, y: el.y }, 
            { x: el.x, y: el.y + el.h }, 
            { x: el.x + el.w, y: el.y + el.h } 
        ];
        corners.forEach(pos => {
            const key = `${Math.round(pos.x)}_${Math.round(pos.y)}`;
            if (!placedColumns.has(key)) {
                placedColumns.add(key);
                const col = getOrCreateSVG('circle', `col-${displayIdx}`, group);
                col.setAttribute('cx', I.x + (pos.x * SCALE)); 
                col.setAttribute('cy', I.y + (pos.y * SCALE));
                col.setAttribute('r', 6 * SCALE); 
                col.setAttribute('fill', '#94a3b8');
                col.setAttribute('stroke', '#0f172a');
                col.setAttribute('stroke-width', '1.5');
                displayIdx++;
            }
        });
    });
    hideExcessSVG('col', displayIdx);
}
function drawColumns(geom) {
    const toggle = UI.showColsToggle || document.getElementById('showColsToggle');
    if (!toggle || !toggle.checked) return; 

    let group = getOrCreateSVG('g', 'column-container', UI.elementContainer || UI.blueprint);
    group.style.display = '';

    const SCALE = geom ? geom.SCALE : (parseFloat(UI.scaleInput?.value) || 1.2);
    const I = geom ? geom.I : { 
        x: 500 - (toInches(UI.inW?.value || 0, UI.unitSelect?.value || 'in') * SCALE / 2), 
        y: 500 - (toInches(UI.inH?.value || 0, UI.unitSelect?.value || 'in') * SCALE / 2) 
    };
    
    // Foundation level only
    const groundRooms = elements.filter(el => el.floor === 0 && !el.isFurniture);
    
    // 🌟 ADVANCED STRUCTURAL RULES 🌟
    const MAX_SPAN = 180; // 15 feet (180 inches) max structural span before requiring a support column
    let potentialPoints = [];

    // 1. Collect all structural load nodes (Corners + Mid-Span Supports)
    groundRooms.forEach(el => {
        // A. Base Corners
        potentialPoints.push(
            { x: el.x, y: el.y }, 
            { x: el.x + el.w, y: el.y }, 
            { x: el.x, y: el.y + el.h }, 
            { x: el.x + el.w, y: el.y + el.h }
        );

        // B. Calculate Span Supports for Horizontal Walls
        if (el.w > MAX_SPAN) {
            const splits = Math.ceil(el.w / MAX_SPAN);
            const step = el.w / splits;
            for (let i = 1; i < splits; i++) {
                potentialPoints.push({ x: el.x + (step * i), y: el.y });           // Top Wall
                potentialPoints.push({ x: el.x + (step * i), y: el.y + el.h });    // Bottom Wall
            }
        }

        // C. Calculate Span Supports for Vertical Walls
        if (el.h > MAX_SPAN) {
            const splits = Math.ceil(el.h / MAX_SPAN);
            const step = el.h / splits;
            for (let i = 1; i < splits; i++) {
                potentialPoints.push({ x: el.x, y: el.y + (step * i) });           // Left Wall
                potentialPoints.push({ x: el.x + el.w, y: el.y + (step * i) });    // Right Wall
            }
        }
    });

    // 2. Intersection Merging (Deduplication)
    let finalColumns = [];
    potentialPoints.forEach(pt => {
        // If a column already exists within 12 inches (wall thickness tolerance), do not place another one.
        const isDuplicate = finalColumns.some(col => 
            Math.hypot(col.x - pt.x, col.y - pt.y) < 12
        );
        if (!isDuplicate) {
            finalColumns.push(pt);
        }
    });

    // 3. Purge "Floating" Internal Columns
    // If rooms overlap during drafting, this ensures columns are strictly placed on valid walls,
    // destroying any points that fall completely inside the open floor space of another room.
    const isStrictlyInside = (px, py) => {
        return groundRooms.some(el => 
            px > el.x + 2 && px < el.x + el.w - 2 && 
            py > el.y + 2 && py < el.y + el.h - 2
        );
    };
    finalColumns = finalColumns.filter(pt => !isStrictlyInside(pt.x, pt.y));

    // 4. Render the structural grid to the canvas
    let displayIdx = 0;
    finalColumns.forEach(pos => {
        const col = getOrCreateSVG('circle', `col-${displayIdx}`, group);
        col.setAttribute('cx', I.x + (pos.x * SCALE)); 
        col.setAttribute('cy', I.y + (pos.y * SCALE));
        col.setAttribute('r', 6 * SCALE); 
        col.setAttribute('fill', '#94a3b8');
        col.setAttribute('stroke', '#0f172a');
        col.setAttribute('stroke-width', '1.5');
        displayIdx++;
    });
    
    hideExcessSVG('col', displayIdx);
}

// =========================================
// FULL RENDERING ENGINE (Modularized)
// =========================================
// 🌟 1. The Main Orchestrator
function updateCanvas(force3D = true) {
    // PHASE 1: PRE-PROCESSING & MATH
    syncStaircasesIfNeeded();
    updateCompass();
    
    const unit = UI.unitSelect ? UI.unitSelect.value : 'in';
    const SCALE = parseFloat(UI.scaleInput ? UI.scaleInput.value : 1.2) || 1.2;
    const geom = calculateGeometry(SCALE, unit); 

    // PHASE 2: 2D RENDER PIPELINE
    renderSiteEnvironment(geom);
    renderArchitecture(geom);
    renderOverlaysAndStats(geom);
    cleanupExcessSVG();
    
    // PHASE 3: POST-PROCESSING & SIDE EFFECTS
    if (force3D && typeof request3DUpdate === 'function') request3DUpdate();
    if (typeof markStateDirty === 'function') markStateDirty();
    if (typeof updateAreaDashboard === 'function') updateAreaDashboard();
    if (typeof updateVastuHUD === 'function') updateVastuHUD();
    if (typeof calculateVastuScore === 'function') calculateVastuScore();
    // ✨ ADD THIS LINE: Trigger the local math engine!
    if (typeof requestBackgroundMath === 'function') requestBackgroundMath();
}

// -----------------------------------------
// 🛠️ 2. Core Math & Geometry Module
// -----------------------------------------
function calculateGeometry(SCALE, unit) {
    const inW = toInches(UI.inW.value, unit) * SCALE;
    const inH = toInches(UI.inH.value, unit) * SCALE;
    const val = (id) => toInches(document.getElementById(id)?.value || 0, unit) * SCALE;
    
    const I = { x: 500 - (inW/2), y: 500 - (inH/2) };
    const J = { x: 500 + (inW/2), y: 500 - (inH/2) };
    const K = { x: 500 + (inW/2), y: 500 + (inH/2) };
    const L = { x: 500 - (inW/2), y: 500 + (inH/2) };

    return {
        SCALE, inW, inH, I, J, K, L,
        A: { x: I.x - val('aL'), y: I.y - val('aU') },
        B: { x: J.x + val('bR'), y: J.y - val('bU') },
        C: { x: K.x + val('cR'), y: K.y + val('cD') },
        D: { x: L.x - val('dL'), y: L.y + val('dD') }
    };
}
// --- RENDER MANAGERS ---

// Handles everything related to the plot, land, and outside environment
function renderSiteEnvironment(geom) {
    renderPlotBoundaries(geom); // Draws the Plot & Built-up shapes, badges, and corner measurements
    renderSiteOffsets(geom);    // Draws the dashed measurement lines between them
    renderRoad(geom);           // Draws the road outside the plot
}

// Handles everything related to the physical building elements
function renderArchitecture(geom) {
    renderRooms(geom);          // Draws walls, floors, and smart-merge logic
    renderFixtures(geom);       // Draws doors and windows
    handleColumnToggle(geom);   // Draws structural columns
}

// -----------------------------------------
// 🏗️ 3. Environment & Plot Modules
// -----------------------------------------
function renderPlotBoundaries(geom) {
    const showLabels = UI.showLabelsToggle ? UI.showLabelsToggle.checked : true;

    // 1. Draw the physical SVG shapes
    drawInnerBuiltUpArea(geom);
    drawOuterPlotArea(geom);

    // 2. Overlay the UI text and badges
    renderPlotCornerBadges(geom, showLabels);
    renderPlotMeasurements(geom, showLabels);
}
function drawInnerBuiltUpArea(geom) {
    const { I, inW, inH } = geom;
    if (UI.innerRect) {
        UI.innerRect.setAttribute('x', I.x); 
        UI.innerRect.setAttribute('y', I.y);
        UI.innerRect.setAttribute('width', inW); 
        UI.innerRect.setAttribute('height', inH);
    }
}
function drawOuterPlotArea(geom) {
    const { A, B, C, D } = geom;
    if (UI.outerPoly) {
        UI.outerPoly.setAttribute('points', `${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y} ${D.x},${D.y}`);
    }
}

function renderPlotCornerBadges(geom, showLabels) {
    if (typeof drawProBadge !== 'function') return;
    const { A, B, C, D, I, J, K, L } = geom;
    const zoom = CanvasState.zoomLvl;
    const vp = UI.viewport;
    drawProBadge('A', A.x - 15, A.y - 15, 'A', '#f59e0b', showLabels, zoom, vp);
    drawProBadge('B', B.x + 15, B.y - 15, 'B', '#f59e0b', showLabels, zoom, vp);
    drawProBadge('C', C.x + 15, C.y + 15, 'C', '#f59e0b', showLabels, zoom, vp);
    drawProBadge('D', D.x - 15, D.y + 15, 'D', '#f59e0b', showLabels, zoom, vp);
    
    drawProBadge('I', I.x - 15, I.y - 15, 'I', '#38bdf8', showLabels, zoom, vp);
    drawProBadge('J', J.x + 15, J.y - 15, 'J', '#38bdf8', showLabels, zoom, vp);
    drawProBadge('K', K.x + 15, K.y + 15, 'K', '#38bdf8', showLabels, zoom, vp);
    drawProBadge('L', L.x - 15, L.y + 15, 'L', '#38bdf8', showLabels, zoom, vp);
}
function renderPlotMeasurements(geom, showLabels) {
    const { A, B, C, D, I, J, K, L, SCALE } = geom;
    const formatDim = (inches) => {
        const ft = Math.floor(inches / 12);
        const inc = Math.round(inches % 12);
        return ft > 0 ? `${ft}' ${inc}"` : `${inc}"`;
    };
    const renderText = (id, x, y, text, color = '#f59e0b') => {
        let el = document.getElementById(id);
        if (!showLabels) {
            if (el) el.style.display = 'none'; 
            return;
        }
        if (!el) {
            el = document.createElementNS("http://www.w3.org/2000/svg", "text");
            el.id = id;
            el.setAttribute('font-size', '14');
            el.setAttribute('font-weight', 'bold');
            el.setAttribute('text-anchor', 'middle');
            el.setAttribute('pointer-events', 'none');
            el.style.textShadow = "1px 1px 2px #000";
            if (UI.viewport) UI.viewport.appendChild(el);
        }
        el.setAttribute('x', x);
        el.setAttribute('y', y);
        el.setAttribute('fill', color); // Applies the dynamic color
        el.textContent = text;
        el.style.display = 'block';
    };

    // 1. OUTER PLOT MEASUREMENTS (A,B,C,D) - AMBER
    const distAB = Math.hypot(B.x - A.x, B.y - A.y) / SCALE;
    const distBC = Math.hypot(C.x - B.x, C.y - B.y) / SCALE;
    const distCD = Math.hypot(D.x - C.x, D.y - C.y) / SCALE;
    const distDA = Math.hypot(A.x - D.x, A.y - D.y) / SCALE;
    renderText('plot-dim-ab', (A.x + B.x) / 2, (A.y + B.y) / 2 - 12, formatDim(distAB), '#f59e0b');
    renderText('plot-dim-bc', (B.x + C.x) / 2 + 30, (B.y + C.y) / 2 + 5, formatDim(distBC), '#f59e0b');
    renderText('plot-dim-cd', (C.x + D.x) / 2, (C.y + D.y) / 2 + 22, formatDim(distCD), '#f59e0b');
    renderText('plot-dim-da', (D.x + A.x) / 2 - 30, (D.y + A.y) / 2 + 5, formatDim(distDA), '#f59e0b');

    // 2. INNER BUILT-UP MEASUREMENTS (I,J,K,L) - BLUE
    const distIJ = Math.hypot(J.x - I.x, J.y - I.y) / SCALE;
    const distJK = Math.hypot(K.x - J.x, K.y - J.y) / SCALE;
    const distKL = Math.hypot(L.x - K.x, L.y - K.y) / SCALE;
    const distLI = Math.hypot(I.x - L.x, I.y - L.y) / SCALE;
    // Shifted UP (-10)
    renderText('plot-dim-ij', (I.x + J.x) / 2, (I.y + J.y) / 2 - 10, formatDim(distIJ), '#38bdf8');
    // Shifted RIGHT (+25)
    renderText('plot-dim-jk', (J.x + K.x) / 2 + 25, (J.y + K.y) / 2 + 30, formatDim(distJK), '#38bdf8');
    // Shifted DOWN (+20)
    renderText('plot-dim-kl', (K.x + L.x) / 2, (K.y + L.y) / 2 + 20, formatDim(distKL), '#38bdf8');
    // Shifted LEFT (-25)
    renderText('plot-dim-li', (L.x + I.x) / 2 - 25, (L.y + I.y) / 2 +30, formatDim(distLI), '#38bdf8');
}


function renderSiteOffsets(geom) {
    const showOffsets = UI.showOffsetsToggle && UI.showOffsetsToggle.checked;
    if (!UI.siteOffsets) return;
    
    if (!showOffsets) { UI.siteOffsets.style.display = 'none'; return; } 
    UI.siteOffsets.style.display = ''; 

    const { SCALE, I, J, K, L, A, B, C, D } = geom;
    const unit = UI.unitSelect ? UI.unitSelect.value : 'in';
    const val = (id) => toInches(document.getElementById(id)?.value || 0, unit) * SCALE;

    let displayIdx = 0;
    const addDim = (x1, y1, x2, y2, v, label, isVert) => {
        if (v <= 0) return;
        const cx = (x1 + x2) / 2; const cy = (y1 + y2) / 2;
        const ft = Math.floor(v / 12); const inch = Math.round(v % 12);
        const text = ft > 0 ? `${ft}'${inch}"` : `${inch}"`;
        
        // 🚀 DIFF ENGINE
        const line = getOrCreateSVG('line', `offset-line-${displayIdx}`, UI.siteOffsets);
        line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', x2); line.setAttribute('y2', y2);
        line.setAttribute('stroke', '#10b981'); line.setAttribute('stroke-width', '1.5'); line.setAttribute('stroke-dasharray', '3,3');

        const c1 = getOrCreateSVG('circle', `offset-c1-${displayIdx}`, UI.siteOffsets);
        c1.setAttribute('cx', x1); c1.setAttribute('cy', y1); c1.setAttribute('r', '2'); c1.setAttribute('fill', '#10b981');

        const c2 = getOrCreateSVG('circle', `offset-c2-${displayIdx}`, UI.siteOffsets);
        c2.setAttribute('cx', x2); c2.setAttribute('cy', y2); c2.setAttribute('r', '2'); c2.setAttribute('fill', '#10b981');

        const txt = getOrCreateSVG('text', `offset-txt-${displayIdx}`, UI.siteOffsets);
        if (isVert) { txt.setAttribute('x', cx + 6); txt.setAttribute('y', cy + 3); txt.removeAttribute('text-anchor'); } 
        else { txt.setAttribute('x', cx); txt.setAttribute('y', cy - 6); txt.setAttribute('text-anchor', 'middle'); }
        txt.setAttribute('fill', '#10b981'); txt.setAttribute('font-size', '11'); txt.setAttribute('font-weight', 'bold');
        txt.textContent = `${label}: ${text}`;
        
        displayIdx++;
    };

    addDim(I.x, I.y, I.x, A.y, val('aU'), 'U', true); addDim(I.x, I.y, A.x, I.y, val('aL'), 'L', false);
    addDim(J.x, J.y, J.x, B.y, val('bU'), 'U', true); addDim(J.x, J.y, B.x, J.y, val('bR'), 'R', false);
    addDim(K.x, K.y, K.x, C.y, val('cD'), 'D', true); addDim(K.x, K.y, C.x, K.y, val('cR'), 'R', false);
    addDim(L.x, L.y, L.x, D.y, val('dD'), 'D', true); addDim(L.x, L.y, D.x, L.y, val('dL'), 'L', false);
    
    hideExcessSVG('offset-line', displayIdx); hideExcessSVG('offset-c1', displayIdx);
    hideExcessSVG('offset-c2', displayIdx); hideExcessSVG('offset-txt', displayIdx);
}

function renderRoad(geom) {
    const road = UI.roadSide ? UI.roadSide.value : 'none';
    if (road === 'none') {
        if (UI.roadPoly) UI.roadPoly.style.display = 'none';
        if (UI.roadText) UI.roadText.style.display = 'none';
        return;
    } 

    if (UI.roadPoly) UI.roadPoly.style.display = 'block';
    if (UI.roadText) UI.roadText.style.display = 'block';
    
    const { A, B, C, D } = geom;
    let P1, P2;
    if (road === 'west') { P1 = A; P2 = B; } 
    else if (road === 'north') { P1 = B; P2 = C; }
    else if (road === 'east') { P1 = C; P2 = D; } 
    else if (road === 'south') { P1 = D; P2 = A; }
    
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

// -----------------------------------------
// 🚪 4. Architecture & SmartMerge Module
// -----------------------------------------
function renderRooms(geom) {
    const { I, SCALE } = geom;
    
    let gBorders = document.getElementById('group-borders') || createSVGGroup('group-borders');
    let gHollows = document.getElementById('group-hollows') || createSVGGroup('group-hollows');
    let gRooms = document.getElementById('group-rooms') || createSVGGroup('group-rooms');
    let gText = document.getElementById('group-text') || createSVGGroup('group-text');

    // 🌟 SMART MERGE LOGIC CAPTURED HERE
    const smartMerge = UI.smartMergeToggle && UI.smartMergeToggle.checked;
    window.renderedLabels = [];

    elements.forEach((el, i) => {
        let r = document.getElementById(`rect-${i}`) || createSVGRect(`rect-${i}`, gRooms);
        let rb = document.getElementById(`rect-border-${i}`) || createSVGRect(`rect-border-${i}`, gBorders);
        let rh = document.getElementById(`rect-hollow-${i}`) || createSVGRect(`rect-hollow-${i}`, gHollows);

        // 🌟 FIX 1: GHOST FLOOR SILHOUETTE
        if (el.floor !== currentFloor) {
            if (el.floor === currentFloor - 1 && !el.isFurniture) {
                r.style.display = 'block'; rb.style.display = 'none'; rh.style.display = 'none';
                r.setAttribute('style', `fill: transparent; stroke: #94a3b8; stroke-width: 1.5; stroke-dasharray: 6,4; opacity: ${ARCH_CONFIG.REFINEMENTS.GHOST_FLOOR_OPACITY}; pointer-events: none;`);
            } else {
                r.style.display = 'none'; rb.style.display = 'none'; rh.style.display = 'none';
            }
            ['title', 'dims', 'area'].forEach(t => { let node = document.getElementById(`txt-${t}-${i}`); if(node) node.style.display = 'none'; });
            return; 
        }
        const rx = I.x + (el.x * SCALE); const ry = I.y + (el.y * SCALE);
        const w = el.w * SCALE; const h = el.h * SCALE;
        
        [r, rb].forEach(rect => { rect.setAttribute('x', rx); rect.setAttribute('y', ry); rect.setAttribute('width', w); rect.setAttribute('height', h); });
        rh.setAttribute('x', rx + 1.5); rh.setAttribute('y', ry + 1.5); rh.setAttribute('width', w - 3); rh.setAttribute('height', h - 3);

        const isSelected = (i === selectedElIndex);
        r.setAttribute('class', isSelected ? 'room-rect room-selected' : 'room-rect');
        r.onmousedown = function(e) { startDrag(e, i); };

        const isColliding = smartMerge ? false : (typeof checkCollision === 'function' ? checkCollision(el, i) : false);
        let baseColor = ARCH_CONFIG?.COLORS[el.type]?.rgb || '255,255,255';
        if (el.customColor) {
            const hex = el.customColor.replace('#', '');
            baseColor = `${parseInt(hex.substring(0,2),16)}, ${parseInt(hex.substring(2,4),16)}, ${parseInt(hex.substring(4,6),16)}`;
        }

        const strokeColor = isSelected ? '#ffffff' : (isColliding ? '#ef4444' : `rgb(${baseColor})`);
        const fillColor = isColliding ? 'rgba(239, 68, 68, 0.4)' : `rgba(${baseColor}, 0.2)`;

        // SMART MERGE STYLING APPLIED
        if (el.isFurniture) {
            r.style.display = 'block'; rb.style.display = 'none'; rh.style.display = 'none';
            r.setAttribute('style', `fill: rgba(148, 163, 184, 0.2); stroke: #cbd5e1; stroke-width: 2; stroke-dasharray: 4, 4;`);
            if (isSelected) r.setAttribute('style', `fill: rgba(56,189,248,0.3); stroke: #38bdf8; stroke-width: 3; stroke-dasharray: none;`);
        } else if (smartMerge) {
            r.style.display = 'block'; rb.style.display = 'block'; rh.style.display = 'block';
            rb.setAttribute('style', `fill: ${strokeColor}; stroke: none;`);
            rh.setAttribute('style', `fill: #0f172a; stroke: none;`);
            r.setAttribute('style', `fill: ${fillColor}; stroke: none;`);
        } else {
            r.style.display = 'block'; rb.style.display = 'none'; rh.style.display = 'none';
            r.setAttribute('style', `fill: ${fillColor}; stroke: ${strokeColor}; stroke-width: ${isSelected ? '3' : '1.5'}; ${el.type === 'balcony' ? 'stroke-dasharray: 6, 4;' : ''}`);
        }
        applyRoomTooltips(r, el);
        renderRoomText(i, el, rx, ry, w, h, I.x, I.y);
    });
}

function renderFixtures(geom) {
    const { I, SCALE } = geom;
    let fixtureGroup = getOrCreateSVG('g', 'fixture-container', UI.elementContainer || UI.blueprint);
    let displayIdx = 0;
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
        const rect = getOrCreateSVG('rect', `fix-rect-${displayIdx}`, fixtureGroup);
        const path = getOrCreateSVG('path', `fix-swing-${displayIdx}`, fixtureGroup);
        path.style.display = 'none';
        if (fix.type === 'window') {
            rect.setAttribute('x', fx); rect.setAttribute('y', fy); rect.setAttribute('width', fw); rect.setAttribute('height', fh);
            rect.setAttribute('fill', 'rgba(251, 191, 36, 0.2)');
            rect.setAttribute('stroke', '#fbbf24'); rect.setAttribute('stroke-width', '1.5');
            rect.onmousedown = (e) => { e.stopPropagation(); startDragFixture(e, i); }; 
        } else if (fix.type === 'door') {
            rect.setAttribute('x', fx); rect.setAttribute('y', fy); rect.setAttribute('width', fw); rect.setAttribute('height', fh);
            rect.setAttribute('fill', '#0f172a'); rect.setAttribute('stroke', 'none');
            rect.onmousedown = (e) => { e.stopPropagation(); startDragFixture(e, i); };
            let d = '';
            if (fix.edge === 'bottom') d = `M ${fx} ${fy+3} L ${fx} ${fy+3 - fixSize} A ${fixSize} ${fixSize} 0 0 1 ${fx + fixSize} ${fy+3}`;
            else if (fix.edge === 'top') d = `M ${fx} ${fy+3} L ${fx} ${fy+3 + fixSize} A ${fixSize} ${fixSize} 0 0 0 ${fx + fixSize} ${fy+3}`;
            else if (fix.edge === 'left') d = `M ${fx+3} ${fy} L ${fx+3 + fixSize} ${fy} A ${fixSize} ${fixSize} 0 0 1 ${fx+3} ${fy + fixSize}`;
            else if (fix.edge === 'right') d = `M ${fx+3} ${fy} L ${fx+3 - fixSize} ${fy} A ${fixSize} ${fixSize} 0 0 0 ${fx+3} ${fy + fixSize}`;
            path.setAttribute('d', d); path.setAttribute('fill', 'rgba(251, 191, 36, 0.1)'); 
            path.setAttribute('stroke', '#fbbf24'); path.setAttribute('stroke-width', '1.5');
            path.style.display = '';
        }
        displayIdx++;
    });
    hideExcessSVG('fix-rect', displayIdx);
    hideExcessSVG('fix-swing', displayIdx);
}

// -----------------------------------------
// 📊 5. Overlays, Stats & Toggles
// -----------------------------------------
function handleColumnToggle(geom) {
    const toggle = UI.showColsToggle || document.getElementById('showColsToggle');
    const showCols = toggle && toggle.checked;
    if (showCols && typeof drawColumns === 'function') {
        drawColumns(geom);
    } else {
        const colContainer = document.getElementById('column-container');
        if (colContainer) colContainer.innerHTML = '';
    }
}

function renderOverlaysAndStats(geom) {
    if(typeof validateStairs === 'function') validateStairs();
    if(typeof renderAutoDimensions === 'function') renderAutoDimensions();

    const { SCALE, inW, inH, A, B, C, D } = geom;
    const plotAreaSqFt = getPolygonArea([A, B, C, D]) / (SCALE * SCALE) / 144;
    const buildAreaSqFt = (inW * inH / (SCALE * SCALE) / 144);
    const coverage = plotAreaSqFt > 0 ? ((buildAreaSqFt / plotAreaSqFt) * 100).toFixed(1) : 0;
    
    if (UI.plotArea) UI.plotArea.innerText = `Plot Area: ${plotAreaSqFt.toFixed(2)} sq.ft`;
    if (UI.buildArea) UI.buildArea.innerText = `Build Area: ${buildAreaSqFt.toFixed(2)} sq.ft (${coverage}% Coverage)`;

    // Draw Smart Alignment Guides
    const svg = document.getElementById('blueprint');
    CanvasState.snapLines.forEach(line => {
        const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
        if (line.type === 'v') { l.setAttribute("x1", line.x); l.setAttribute("x2", line.x); l.setAttribute("y1", 0); l.setAttribute("y2", 1000); }
        else { l.setAttribute("y1", line.y); l.setAttribute("y2", line.y); l.setAttribute("x1", 0); l.setAttribute("x2", 1000); }
        l.setAttribute("style", "stroke: #fbbf24; stroke-width: 1.5; stroke-dasharray: 6,4;");
        if(svg) svg.appendChild(l);
    });
}

// -----------------------------------------
// 🧹 6. Helpers
// -----------------------------------------
function cleanupExcessSVG() {
    let excessIndex = elements.length;
    while(document.getElementById(`rect-${excessIndex}`)) {
        // 🛠️ PERFORMANCE FIX: Hide elements instead of calling .remove()
        document.getElementById(`rect-${excessIndex}`).style.display = 'none';
        let rb = document.getElementById(`rect-border-${excessIndex}`); 
        if (rb) rb.style.display = 'none';
        let rh = document.getElementById(`rect-hollow-${excessIndex}`); 
        if (rh) rh.style.display = 'none';
        ['title', 'dims', 'area'].forEach(t => { 
            let n = document.getElementById(`txt-${t}-${excessIndex}`); 
            if(n) n.style.display = 'none'; 
        });
        excessIndex++;
    }
}
// ==========================================
// 🚀 PHASE 2: "DIFF" ENGINE SVG RECYCLING
// ==========================================
function getOrCreateSVG(type, id, parent) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElementNS("http://www.w3.org/2000/svg", type);
        el.id = id;
        parent.appendChild(el);
    }
    el.style.display = ''; // Ensure it is visible if it was previously hidden
    return el;
}

function hideExcessSVG(prefix, count) {
    let el = document.getElementById(`${prefix}-${count}`);
    while (el) {
        el.style.display = 'none'; // Hide it instead of deleting it (DOM Recycling)
        count++;
        el = document.getElementById(`${prefix}-${count}`);
    }
}

function createSVGGroup(id) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.id = id;
    if (UI.elementContainer) UI.elementContainer.appendChild(g);
    return g;
}

function createSVGRect(id, parentGroup) {
    const r = document.createElementNS("http://www.w3.org/2000/svg", "rect"); r.id = id;
    parentGroup.appendChild(r);
    return r;
}

function syncStaircasesIfNeeded() {
    if (typeof selectedElIndex !== 'undefined' && selectedElIndex !== -1) {
        const activeRoom = elements[selectedElIndex];
        if (activeRoom && activeRoom.type === 'staircase' && typeof syncStaircases === 'function') {
            syncStaircases(selectedElIndex);
        }
    }
}

function updateCompass() {
    if (UI.dirTop && UI.dirRight) {
        if (globalCompassDir === 'North') { UI.dirTop.textContent = 'N'; UI.dirRight.textContent = 'E'; }
        else if (globalCompassDir === 'East') { UI.dirTop.textContent = 'E'; UI.dirRight.textContent = 'S'; }
        else if (globalCompassDir === 'South') { UI.dirTop.textContent = 'S'; UI.dirRight.textContent = 'W'; }
        else if (globalCompassDir === 'West') { UI.dirTop.textContent = 'W'; UI.dirRight.textContent = 'N'; }
    }
}

//populate the room tooltip with relevant information and positioning near the mouse cursor
function applyRoomTooltips(r, el) {
    r.onmouseover = function(e) {
        const tooltip = document.getElementById('room-tooltip');
        tooltip.style.display = 'block';
        tooltip.style.background = 'rgba(15, 23, 42, 0.85)';
        tooltip.style.backdropFilter = 'blur(10px)';
        tooltip.style.border = '1px solid rgba(56, 189, 248, 0.5)';
        tooltip.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5), inset 0 0 15px rgba(56, 189, 248, 0.1)';
        tooltip.style.borderRadius = '8px';
        tooltip.style.padding = '6px 8px';
        tooltip.style.minWidth = '160px';
        const area = ((el.w * el.h)/144).toFixed(1);
        const floorName = el.floor === 0 ? 'Ground' : (el.floor === 1 ? '1st' : el.floor + 'th');
        let icon = '🚪'; 
        if (el.isFurniture) icon = '🛋️';
        else if (el.type === 'staircase') icon = '🪜';
        else if (el.type === 'kitchen') icon = '🍳';
        else if (el.type === 'toilet') icon = '🚿';
        else if (el.type === 'bedroom') icon = '🛏️';
        else if (el.type === 'balcony') icon = '🌿';
        else if (el.type === 'puja') icon = '🕉️';
        tooltip.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 2px; border-bottom: 1px solid rgba(56, 189, 248, 0.3); padding-bottom: 6px;">
                    <div style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 6px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        ${icon}
                    </div>
                    <span style="font-weight: 800; color: #38bdf8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">
                        ${el.customName || el.type}
                    </span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.7rem; color: #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 4px 6px; border-radius: 4px;">
                        <span style="color: #94a3b8;">🏢 Level</span>
                        <span style="font-weight: 600; color: #f1f5f9;">${floorName}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 4px 6px; border-radius: 4px;">
                        <span style="color: #94a3b8;">📐 Size</span>
                        <span style="font-weight: 600; font-family: monospace; color: #f1f5f9;">${Math.floor(el.w/12)}'${Math.round(el.w%12)}" × ${Math.floor(el.h/12)}'${Math.round(el.h%12)}"</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 6px; border-radius: 4px; margin-top: 2px;">
                        <span style="color: #10b981; font-weight: 600;">📏 Area</span>
                        <span style="font-weight: 700; color: #10b981; font-family: monospace;">${area} sq.ft</span>
                    </div>
                </div>
            </div>
        `;
    };
    r.onmousemove = function(e) {
        const tooltip = document.getElementById('room-tooltip');
        tooltip.style.left = (e.clientX + 200) + 'px';
        tooltip.style.top = (e.clientY + 0) + 'px';
    };
    r.onmouseout = function() { 
        const tooltip = document.getElementById('room-tooltip');
        tooltip.style.display = 'none';
        tooltip.style.backdropFilter = 'none';
        tooltip.style.minWidth = 'auto';
    };
}

function renderRoomText(i, el, rx, ry, w, h, IX, IY) {
    let gText = document.getElementById('group-text');
    const cx = rx + w / 2; const cy = ry + h / 2;
    const labelText = el.customName || (typeof getRoomDisplayName === 'function' ? getRoomDisplayName(i) : el.type.toUpperCase());
    
    // 🌟 FIX 6: SMART-MERGE TEXT AGGREGATION
    if (UI.showLabelsToggle && !UI.showLabelsToggle.checked) return;
    
    // Calculate global scale once for this function
    const SCALE = parseFloat(UI.scaleInput?.value) || 1.2;

    if (UI.smartMergeToggle && UI.smartMergeToggle.checked) {
        // If an identical label is already rendered nearby, skip drawing a duplicate
        const isDuplicate = window.renderedLabels.find(l => l.text === labelText && Math.hypot(l.x - cx, l.y - cy) < ARCH_CONFIG.REFINEMENTS.SMART_MERGE_TEXT_RADIUS * SCALE);
        if (isDuplicate) return; 
        window.renderedLabels.push({ text: labelText, x: cx, y: cy });
    }
    
    // 🌟 NEW: Responsive Text Hiding Threshold
    const minSize = 45 * SCALE; // Minimum pixels required to comfortably display text
    
    if (w < minSize || h < minSize) {
        // Hide existing text nodes if the room was shrunk too small
        ['title', 'dims', 'area'].forEach(t => { 
            let node = document.getElementById(`txt-${t}-${i}`); 
            if(node) node.style.display = 'none'; 
        });
    } else {
        // Render text normally if space permits
        const dimsText = `${Math.floor(el.w/12)}'${Math.round(el.w%12)}" × ${Math.floor(el.h/12)}'${Math.round(el.h%12)}"`;
        const areaText = `${((el.w * el.h)/144).toFixed(1)} sq.ft`;
        
        if (typeof createOrUpdateText === 'function') {
            createOrUpdateText(`txt-title-${i}`, gText, cx, cy - 8, labelText, '#ffffff', '12', true);
            createOrUpdateText(`txt-dims-${i}`, gText, cx, cy + 6, dimsText, '#cbd5e1', '10', false);
            createOrUpdateText(`txt-area-${i}`, gText, cx, cy + 20, areaText, '#94a3b8', '10', false);
        }
    }

    const showDimsToggle = UI.showDims || document.getElementById('showDims');
    let dimTop = document.getElementById(`dim-top-${i}`);
    let dimLeft = document.getElementById(`dim-left-${i}`);
    
    if (showDimsToggle && showDimsToggle.checked) {
        let dimContainer = UI.dimContainer || document.getElementById('dim-container');
        
        if (!dimTop) { dimTop = document.createElementNS("http://www.w3.org/2000/svg", "line"); dimTop.id = `dim-top-${i}`; dimContainer.appendChild(dimTop); }
        if (!dimLeft) { dimLeft = document.createElementNS("http://www.w3.org/2000/svg", "line"); dimLeft.id = `dim-left-${i}`; dimContainer.appendChild(dimLeft); }
        
        dimTop.setAttribute('x1', rx); dimTop.setAttribute('y1', ry); dimTop.setAttribute('x2', rx); dimTop.setAttribute('y2', IY);
        dimLeft.setAttribute('x1', rx); dimLeft.setAttribute('y1', ry); dimLeft.setAttribute('x2', IX); dimLeft.setAttribute('y2', ry);
        
        dimTop.setAttribute('style', 'stroke: #cbd5e1; stroke-width: 1.5; stroke-dasharray: 4,4; pointer-events: none;');
        dimLeft.setAttribute('style', 'stroke: #cbd5e1; stroke-width: 1.5; stroke-dasharray: 4,4; pointer-events: none;');
        dimTop.style.display = 'block'; dimLeft.style.display = 'block';
    } else {
        if (dimTop) dimTop.style.display = 'none';
        if (dimLeft) dimLeft.style.display = 'none';
    }
}


function fastUpdateDrag(index) {
    const el = elements[index];
    const { SCALE, I } = Utils.getMetrics();
    const rx = I.x + (el.x * SCALE); 
    const ry = I.y + (el.y * SCALE);

    // 1. Update the Main Room Rectangles (NO DOM THRASHING!)
    Utils.setAttr(document.getElementById(`rect-${index}`), 'x', rx);
    Utils.setAttr(document.getElementById(`rect-${index}`), 'y', ry);
    Utils.setAttr(document.getElementById(`rect-border-${index}`), 'x', rx);
    Utils.setAttr(document.getElementById(`rect-border-${index}`), 'y', ry);
    Utils.setAttr(document.getElementById(`rect-hollow-${index}`), 'x', rx + 1.5);
    Utils.setAttr(document.getElementById(`rect-hollow-${index}`), 'y', ry + 1.5);

    // 2. Update Text Labels
    const cx = rx + (el.w * SCALE) / 2; 
    const cy = ry + (el.h * SCALE) / 2;
    
    Utils.setAttr(document.getElementById(`txt-title-${index}`), 'x', cx);
    Utils.setAttr(document.getElementById(`txt-title-${index}`), 'y', cy - 8);
    Utils.setAttr(document.getElementById(`txt-dims-${index}`), 'x', cx);
    Utils.setAttr(document.getElementById(`txt-dims-${index}`), 'y', cy + 6);
    Utils.setAttr(document.getElementById(`txt-area-${index}`), 'x', cx);
    Utils.setAttr(document.getElementById(`txt-area-${index}`), 'y', cy + 20);

    // 3. Update Dimension Lines
    const dimTop = document.getElementById(`dim-top-${index}`);
    const dimLeft = document.getElementById(`dim-left-${index}`);
    if (dimTop) {
        Utils.setAttr(dimTop, 'x1', rx); Utils.setAttr(dimTop, 'x2', rx);
        Utils.setAttr(dimTop, 'y1', ry); Utils.setAttr(dimTop, 'y2', I.y);
    }
    if (dimLeft) {
        Utils.setAttr(dimLeft, 'x1', rx); Utils.setAttr(dimLeft, 'x2', I.x);
        Utils.setAttr(dimLeft, 'y1', ry); Utils.setAttr(dimLeft, 'y2', ry);
    }
}


// =========================================
// INTERACTION ENGINE (Mouse & Touch)
// =========================================
let isDragging = false, dragElIndex = -1; 
let isDraggingFixture = false, dragFixtureIndex = -1;
let hasDragged = false, startMousePos, startElPos, animationFrameId = null;

function startDrag(evt, index) {
    if (UI.isSpacePanMode || evt.button === 1 || evt.shiftKey) return; 
    selectedElIndex = index;
    if(typeof renderSidebar === 'function') renderSidebar();
    updateCanvas(); 
    if (elements[index].locked) return; 
    
    isDragging = true; dragElIndex = index; hasDragged = false; 
    startMousePos = getMousePos(evt);
    startElPos = { x: elements[index].x, y: elements[index].y };

    // --- NEW: Cache boundaries for fast snapping ---
    cachedSnapBoundaries = elements.map((other, i) => {
        if (i === index || other.floor !== elements[index].floor) return null;
        return {
            left: other.x, right: other.x + other.w, center: other.x + (other.w / 2),
            top: other.y, bottom: other.y + other.h, middle: other.y + (other.h / 2)
        };
    });
}

function startDragFixture(evt, index) {
    isDraggingFixture = true; dragFixtureIndex = index; hasDragged = false;
}

// ==========================================
// 📏 DYNAMIC DISTANCE TO NEIGHBORS HELPER
// ==========================================
function renderDynamicDistances(guideLayer, SCALE, Ix, Iy, draggedBounds) {
    const { dLeft, dRight, dTop, dBottom, dCenter, dMiddle } = draggedBounds;

    const drawDist = (x1, y1, x2, y2, distVal) => {
        const ft = Math.floor(distVal / 12);
        const inc = Math.round(distVal % 12);
        if (ft === 0 && inc === 0) return; // Don't show 0"
        
        const textStr = ft > 0 ? `${ft}' ${inc}"` : `${inc}"`;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        
        // Draw Dashed Line
        const dLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        dLine.setAttribute('x1', Ix + (x1 * SCALE)); dLine.setAttribute('x2', Ix + (x2 * SCALE));
        dLine.setAttribute('y1', Iy + (y1 * SCALE)); dLine.setAttribute('y2', Iy + (y2 * SCALE));
        dLine.setAttribute('style', 'stroke: #ef4444; stroke-width: 1.5; stroke-dasharray: 4,4;');
        guideLayer.appendChild(dLine);
        
        // Draw Text Background Pill
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute('x', Ix + (cx * SCALE) - 15); bg.setAttribute('y', Iy + (cy * SCALE) - 8);
        bg.setAttribute('width', 30); bg.setAttribute('height', 16);
        bg.setAttribute('fill', '#0f172a'); bg.setAttribute('rx', 4);
        guideLayer.appendChild(bg);

        // Draw Text
        const dText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        dText.setAttribute('x', Ix + (cx * SCALE)); dText.setAttribute('y', Iy + (cy * SCALE) + 3);
        dText.setAttribute('fill', '#ef4444'); dText.setAttribute('font-size', '10');
        dText.setAttribute('font-weight', 'bold'); dText.setAttribute('text-anchor', 'middle');
        dText.textContent = textStr;
        guideLayer.appendChild(dText);
    };

    // cachedSnapBoundaries is a global variable populated in startDrag()
    cachedSnapBoundaries.forEach((boundary) => {
        if (!boundary) return;
        
        // Check if rooms overlap vertically
        const overlapY = (dTop < boundary.bottom && dBottom > boundary.top);
        if (overlapY) {
            const distRight = boundary.left - dRight; 
            const distLeft = dLeft - boundary.right;  
            
            if (distRight > 0 && distRight < 120) drawDist(dRight, dMiddle, boundary.left, dMiddle, distRight);
            if (distLeft > 0 && distLeft < 120) drawDist(dLeft, dMiddle, boundary.right, dMiddle, distLeft);
        }
        
        // Check if rooms overlap horizontally
        const overlapX = (dLeft < boundary.right && dRight > boundary.left);
        if (overlapX) {
            const distBottom = boundary.top - dBottom; 
            const distTop = dTop - boundary.bottom;    
            
            if (distBottom > 0 && distBottom < 120) drawDist(dCenter, dBottom, dCenter, boundary.top, distBottom);
            if (distTop > 0 && distTop < 120) drawDist(dCenter, dTop, dCenter, boundary.bottom, distTop);
        }
    });
}


const handleMove = (currentMouse, e) => {
    if (!hasDragged) {
        if (typeof saveState === 'function') saveState();
        hasDragged = true;
    }

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(() => {
        const SCALE = parseFloat(UI.scaleInput.value) || 1.2;
        
        if (isDraggingFixture && dragFixtureIndex !== -1) {
            const fix = fixtures[dragFixtureIndex];
            const el = elements[fix.roomId];
            const inW = toInches(UI.inW.value, UI.unitSelect.value);
            const inH = toInches(UI.inH.value, UI.unitSelect.value);
            const Ix = 500 - (inW / 2); const Iy = 500 - (inH / 2);

            const relX = (currentMouse.x - (Ix + el.x * SCALE)) / SCALE;
            const relY = (currentMouse.y - (Iy + el.y * SCALE)) / SCALE;
            fix.offset = Math.round((fix.edge === 'bottom' || fix.edge === 'top') ? relX : relY);
            const limit = (fix.edge === 'bottom' || fix.edge === 'top') ? el.w : el.h;
            fix.offset = Math.max(0, Math.min(fix.offset, limit - fix.size));
            updateCanvas(); if(typeof renderSidebar === 'function') renderSidebar(); 
        } 
        else if (isDragging && dragElIndex !== -1) {
            const dx = currentMouse.x - startMousePos.x;
            const dy = currentMouse.y - startMousePos.y;
            const inW = toInches(UI.inW.value, UI.unitSelect.value);
            const inH = toInches(UI.inH.value, UI.unitSelect.value);
            
            let newX = startElPos.x + (dx / SCALE);
            let newY = startElPos.y + (dy / SCALE);
            if (e && e.shiftKey) { Math.abs(dx) > Math.abs(dy) ? newY = startElPos.y : newX = startElPos.x; }

            const el = elements[dragElIndex];
            const SNAP_DIST = 8 / SCALE; 
            let snappedX = false, snappedY = false;
            let guideLines = []; 

            let guideLayer = document.getElementById('smart-guides');
            if (!guideLayer) { guideLayer = document.createElementNS("http://www.w3.org/2000/svg", "g"); guideLayer.id = 'smart-guides'; UI.blueprint.appendChild(guideLayer); }
            guideLayer.innerHTML = '';

            let dLeft = newX, dRight = newX + el.w, dCenter = newX + (el.w / 2);
            let dTop = newY, dBottom = newY + el.h, dMiddle = newY + (el.h / 2);

            // 🚀 FAST ALIGNMENT: Iterate over the cached boundaries instead of recalculating
            cachedSnapBoundaries.forEach((boundary, i) => {
                if (!boundary) return; // Skips null entries (the active room or rooms on other floors)

                let oLeft = boundary.left, oRight = boundary.right, oCenter = boundary.center;
                let oTop = boundary.top, oBottom = boundary.bottom, oMiddle = boundary.middle;

                if (!snappedX) {
                    const xChecks = [{d: dLeft, o: oLeft, off: 0}, {d: dLeft, o: oRight, off: 0}, {d: dRight, o: oLeft, off: -el.w}, {d: dRight, o: oRight, off: -el.w}, {d: dCenter, o: oCenter, off: -el.w/2}];
                    for (let check of xChecks) {
                        if (Math.abs(check.d - check.o) < SNAP_DIST) { newX = check.o + check.off; snappedX = true; guideLines.push({ type: 'x', pos: check.o }); break; }
                    }
                }
                if (!snappedY) {
                    const yChecks = [{d: dTop, o: oTop, off: 0}, {d: dTop, o: oBottom, off: 0}, {d: dBottom, o: oTop, off: -el.h}, {d: dBottom, o: oBottom, off: -el.h}, {d: dMiddle, o: oMiddle, off: -el.h/2}];
                    for (let check of yChecks) {
                        if (Math.abs(check.d - check.o) < SNAP_DIST) { newY = check.o + check.off; snappedY = true; guideLines.push({ type: 'y', pos: check.o }); break; }
                    }
                }
            });

            const isStrictSnap = UI.gridSnapToggle ? UI.gridSnapToggle.checked : false;
            
            // 🌟 DYNAMIC SNAP RESOLUTION
            let snapRes = 12; // Default: 1 foot
            if (CanvasState.zoomLvl > 2.5) snapRes = 1;      // Deep Zoom: 1 inch precision
            else if (CanvasState.zoomLvl > 1.2) snapRes = 6; // Mid Zoom: 6 inch precision

            if (!snappedX) newX = isStrictSnap ? Math.round(newX / snapRes) * snapRes : Math.round(newX);
            if (!snappedY) newY = isStrictSnap ? Math.round(newY / snapRes) * snapRes : Math.round(newY);

            newX = Math.max(0, Math.min(newX, inW - el.w));
            newY = Math.max(0, Math.min(newY, inH - el.h));

            el.x = newX; el.y = newY;
            if (el.type === 'staircase') syncStaircases(dragElIndex);
            //🌟Calculate the snap lines right before drawing!
            applySmartSnap(el, dragElIndex);
            // 🚀 THE FIX: Sync while dragging so ghost floors follow along perfectly
            if (el.type === 'staircase' && typeof syncStaircases === 'function') {
                syncStaircases(dragElIndex);
            }
            // 🚀 THE NEW FAST RENDER PIPELINE:
            // 1. Fast 2D SVG Update (Avoids full DOM rebuild)
            if (typeof fastUpdateDrag === 'function') {
                fastUpdateDrag(dragElIndex);
            } else {
                updateCanvas(); // Fallback
            }
            
            // 2. Fast 3D Mesh Transform (Avoids destroying/rebuilding Three.js geometries)
            if (typeof update3DTransforms === 'function') {
                update3DTransforms();
            }

            // Render Guides
            const Ix = 500 - ((inW * SCALE)/2); const Iy = 500 - ((inH * SCALE)/2);
            
            // 1. Draw alignment snap lines
            guideLines.forEach(line => {
                const svgLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                svgLine.setAttribute('class', 'smart-guide');
                if (line.type === 'x') {
                    svgLine.setAttribute('x1', Ix + (line.pos * SCALE)); svgLine.setAttribute('x2', Ix + (line.pos * SCALE));
                    svgLine.setAttribute('y1', Iy - 50); svgLine.setAttribute('y2', Iy + (inH * SCALE) + 50);
                } else {
                    svgLine.setAttribute('y1', Iy + (line.pos * SCALE)); svgLine.setAttribute('y2', Iy + (line.pos * SCALE));
                    svgLine.setAttribute('x1', Ix - 50); svgLine.setAttribute('x2', Ix + (inW * SCALE) + 50);
                }
                guideLayer.appendChild(svgLine);
            });

            // 🌟 2. CALL THE NEW DYNAMIC DISTANCE METHOD
            // We use el.x and el.y here so the distances are accurate AFTER snapping!
            const draggedBounds = {
                dLeft: el.x, 
                dRight: el.x + el.w, 
                dCenter: el.x + (el.w / 2),
                dTop: el.y, 
                dBottom: el.y + el.h, 
                dMiddle: el.y + (el.h / 2)
            };
            renderDynamicDistances(guideLayer, SCALE, Ix, Iy, draggedBounds);

            // 3. Update Input Sliders
            const rx = document.getElementById(`range-x-${dragElIndex}`); const ry = document.getElementById(`range-y-${dragElIndex}`);
            const nx = document.getElementById(`num-x-${dragElIndex}`); const ny = document.getElementById(`num-y-${dragElIndex}`);
            if(rx) rx.value = newX; if(ry) ry.value = newY;
            if(nx) nx.value = newX; if(ny) ny.value = newY;
        }
    });
};

const endDrag = () => {
    UI.isSpacePanning = false; 
    if (UI.isSpacePanMode) UI.blueprint.style.cursor = 'grab'; 
    isDragging = false; dragFixtureIndex = -1; isDraggingFixture = false; dragElIndex = -1;
    const guideLayer = document.getElementById('smart-guides');
    if (guideLayer) guideLayer.innerHTML = '';
    CanvasState.snapLines = [];
    updateCanvas(true);    
    // 🌟 NEW: Calculate heavy math only after the drop
    if (typeof requestBackgroundMath === 'function') requestBackgroundMath();
};

// Event Listeners (Mouse & Touch)
function initInteractions() {
    if (!UI.blueprint) return;
    let initialPinchDist = null;
    UI.blueprint.addEventListener('mousemove', (e) => {
        if (UI.isSpacePanning) { panCamera(e.clientX - UI.spacePanStart.x, e.clientY - UI.spacePanStart.y); UI.spacePanStart = { x: e.clientX, y: e.clientY }; return; }
        
        if (isMeasuringMode && measureStart && tempMeasureLine) {
            const pos = getMousePos(e);
            tempMeasureLine.setAttribute('x1', measureStart.x); tempMeasureLine.setAttribute('y1', measureStart.y);
            tempMeasureLine.setAttribute('x2', pos.x); tempMeasureLine.setAttribute('y2', pos.y);
            return;
        }

        if ((isDragging && dragElIndex !== -1) || (isDraggingFixture && dragFixtureIndex !== -1)) {
            handleMove(getMousePos(e), e);
        }
    });
    UI.blueprint.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2 && initialPinchDist) {
            e.preventDefault();
            const currentDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const factor = currentDist / initialPinchDist;
            const pseudoEvent = {
                clientX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                clientY: (e.touches[0].clientY + e.touches[1].clientY) / 2
            };
            zoomCamera(factor, pseudoEvent);
            initialPinchDist = currentDist;
            return;
        }
        if ((isDragging && dragElIndex !== -1) || (isDraggingFixture && dragFixtureIndex !== -1)) {
            if(e.touches.length === 1) { e.preventDefault(); handleMove(getTouchPos(e), e); }
        }
    }, {passive: false});
    window.endDrag = (e) => {
        if (hasDragged && typeof saveState === 'function') saveState();
        UI.isSpacePanning = false; 
        if (UI.isSpacePanMode && UI.blueprint) UI.blueprint.style.cursor = 'grab'; 
        isDragging = false; dragFixtureIndex = -1; isDraggingFixture = false; dragElIndex = -1;
        const guideLayer = document.getElementById('smart-guides');
        if (guideLayer) guideLayer.innerHTML = '';
        
        snapLines = [];
        updateCanvas(true);
    };
    UI.blueprint.addEventListener('mouseup', window.endDrag);
    UI.blueprint.addEventListener('mouseleave', window.endDrag);
    UI.blueprint.addEventListener('touchend', window.endDrag);
    UI.blueprint.addEventListener('mousedown', (e) => {
        if (UI.isSpacePanMode) {
            UI.isSpacePanning = true; UI.spacePanStart = { x: e.clientX, y: e.clientY }; UI.blueprint.style.cursor = 'grabbing'; 
            return; 
        }
        if (isMeasuringMode) {
            const pos = getMousePos(e);
            if (!measureStart) {
                measureStart = pos;
                tempMeasureLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                tempMeasureLine.setAttribute('class', 'measure-line');
                measureGroup.appendChild(tempMeasureLine);
            } else {
                const SCALE = parseFloat(UI.scaleInput.value) || 1.2;
                const dx = pos.x - measureStart.x; const dy = pos.y - measureStart.y;
                const distInches = Math.sqrt(dx*dx + dy*dy) / SCALE;
                const ft = Math.floor(distInches / 12); const inc = Math.round(distInches % 12);
                
                const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
                txt.setAttribute('x', measureStart.x + dx/2); txt.setAttribute('y', measureStart.y + dy/2 - 10);
                txt.setAttribute('class', 'measure-text'); txt.textContent = `${ft}' ${inc}"`;
                measureGroup.appendChild(txt); measureStart = null; 
            }
            return;
        }
        
        if (e.target === UI.blueprint || e.target.id === 'inner-rect' || e.target.id === 'outer-poly') {
            selectedElIndex = -1; 
            if(typeof renderSidebar === 'function') renderSidebar(); 
            updateCanvas();
        }
    });
    UI.blueprint.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialPinchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            return;
        }
        if (e.touches.length === 1 && e.target.id.startsWith('rect-')) {
            const index = parseInt(e.target.id.split('-')[1]);
            startDrag({ button: 0, shiftKey: false, clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }, index);
        }
    }, {passive: false});
    UI.blueprint.addEventListener('dragover', (e) => {
        e.preventDefault(); // Required to allow dropping
        e.dataTransfer.dropEffect = 'copy';
    });
    UI.blueprint.addEventListener('drop', (e) => {
        e.preventDefault();
        
        // 1. Get the dragged item type (e.g., 'sofa', 'bed')
        const type = e.dataTransfer.getData('text/plain');
        if (!type || !ARCH_CONFIG.DEFAULTS.FURNITURE[type]) return;

        if (typeof saveState === 'function') saveState();

        // 2. Get exact mouse coordinates accounting for Pan & Zoom
        const pos = getMousePos(e); 
        const w = ARCH_CONFIG.DEFAULTS.FURNITURE[type].w;
        const h = ARCH_CONFIG.DEFAULTS.FURNITURE[type].h;

        // 3. Mathematical conversion: SVG Screen to Blueprint Inches
        const SCALE = parseFloat(UI.scaleInput.value) || 1.2;
        const unit = UI.unitSelect.value;
        const inW = toInches(UI.inW.value, unit) * SCALE;
        const inH = toInches(UI.inH.value, unit) * SCALE;
        const I = { x: 500 - (inW/2), y: 500 - (inH/2) };
        
        // Inverse calculation of your drawing logic
        const elementX = (pos.x - I.x) / SCALE;
        const elementY = (pos.y - I.y) / SCALE;

        // 🌟 FIX 2: DROP-ZONE BOUNDARY SAFEGUARDS
        const plotWInches = toInches(UI.inW.value, unit);
        const plotHInches = toInches(UI.inH.value, unit);

        let safeX = elementX - (w / 2);
        let safeY = elementY - (h / 2);

        // Clamp to property lines
        safeX = Math.max(0, Math.min(safeX, plotWInches - w));
        safeY = Math.max(0, Math.min(safeY, plotHInches - h));

        // 4. Instantiate the furniture centered exactly on the cursor
        elements.push({ 
            type: type, 
            w: w, h: h, 
            x: elementX - (w / 2), 
            y: elementY - (h / 2), 
            floor: currentFloor, 
            locked: false, 
            isFurniture: true 
        });

        // 5. Auto-select the newly dropped item and update UI
        selectedElIndex = elements.length - 1;
        if (typeof renderSidebar === 'function') renderSidebar(); 
        updateCanvas();
    });
    UI.blueprint.addEventListener('wheel', (e) => {
        e.preventDefault(); // Stop page scrolling
        const factor = e.deltaY < 0 ? 1.1 : 0.9; // Zoom in or out
        zoomCamera(factor, e);
    }, { passive: false });
}

// =========================================
// EXPORT & VIEW UTILITIES
// =========================================
function centerOnSelection() {
    if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) return;
    const el = elements[selectedElIndex];
    if (!el || el.locked) return;
    const { SCALE, I } = Utils.getMetrics(); 
    const roomCenterX = I.x + (el.x * SCALE) + ((el.w * SCALE) / 2);
    const roomCenterY = I.y + (el.y * SCALE) + ((el.h * SCALE) / 2);
    CanvasState.panX = 500 - (roomCenterX * CanvasState.zoomLvl);
    CanvasState.panY = 500 - (roomCenterY * CanvasState.zoomLvl);
    updateViewport();
}

// --- MEASUREMENT TOOL ---
let isMeasuringMode = false, measureStart = null, tempMeasureLine = null, measureGroup = null;
function toggleMeasureMode() {
    isMeasuringMode = !isMeasuringMode;
    if(UI.blueprint) UI.blueprint.style.cursor = isMeasuringMode ? 'crosshair' : 'default';
    measureStart = null;
    if (!measureGroup) {
        measureGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        measureGroup.id = 'measure-group';
        if(UI.blueprint) UI.blueprint.appendChild(measureGroup);
    }
    if (!isMeasuringMode) measureGroup.innerHTML = ''; 
}

function syncStaircases(sourceIndex) {
    const source = elements[sourceIndex];
    if (!source || source.type !== 'staircase') return;

    elements.forEach((el, index) => {
        if (el.type === 'staircase' && index !== sourceIndex) {
            el.x = source.x;
            el.y = source.y;
            el.w = source.w;
            el.h = source.h;
            el.dir = source.dir;
        }
    });
}

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

// --- FLOOR MANAGEMENT ---
function setFloor(f) {
    currentFloor = f;
    selectedElIndex = -1;
    if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
    if (typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas();
}

function renderAutoDimensions() {
    const showDims = UI.showDims ? UI.showDims.checked : false;
    let dimGroup = getOrCreateSVG('g', 'dim-group', UI.blueprint);

    if (!showDims) { dimGroup.style.display = 'none'; return; }
    dimGroup.style.display = '';

    const SCALE = parseFloat(UI.scaleInput.value) || 1.2;
    const inW = toInches(UI.inW.value, UI.unitSelect.value) * SCALE;
    const inH = toInches(UI.inH.value, UI.unitSelect.value) * SCALE;
    const I = { x: 500 - (inW/2), y: 500 - (inH/2) };

    let displayIdx = 0;
    elements.forEach((el) => {
        if (el.floor !== currentFloor) return;

        const rx = I.x + (el.x * SCALE); const ry = I.y + (el.y * SCALE);
        const w = el.w * SCALE; const h = el.h * SCALE;

        // 🚀 DIFF ENGINE
        const lineTop = getOrCreateSVG('line', `dim-auto-tline-${displayIdx}`, dimGroup);
        lineTop.setAttribute('x1', rx); lineTop.setAttribute('y1', ry - 10);
        lineTop.setAttribute('x2', rx + w); lineTop.setAttribute('y2', ry - 10);
        lineTop.setAttribute('stroke', '#38bdf8'); lineTop.setAttribute('stroke-width', '1');

        const textWidth = getOrCreateSVG('text', `dim-auto-ttext-${displayIdx}`, dimGroup);
        textWidth.setAttribute('x', rx + w/2); textWidth.setAttribute('y', ry - 15);
        textWidth.setAttribute('fill', '#38bdf8'); textWidth.setAttribute('font-size', '10');
        textWidth.setAttribute('text-anchor', 'middle');
        textWidth.textContent = `${Math.floor(el.w/12)}'${Math.round(el.w%12)}"`;

        const lineLeft = getOrCreateSVG('line', `dim-auto-lline-${displayIdx}`, dimGroup);
        lineLeft.setAttribute('x1', rx - 10); lineLeft.setAttribute('y1', ry);
        lineLeft.setAttribute('x2', rx - 10); lineLeft.setAttribute('y2', ry + h);
        lineLeft.setAttribute('stroke', '#38bdf8'); lineLeft.setAttribute('stroke-width', '1');

        const textHeight = getOrCreateSVG('text', `dim-auto-ltext-${displayIdx}`, dimGroup);
        textHeight.setAttribute('x', rx - 15); textHeight.setAttribute('y', ry + h/2);
        textHeight.setAttribute('fill', '#38bdf8'); textHeight.setAttribute('font-size', '10');
        textHeight.setAttribute('text-anchor', 'end'); textHeight.setAttribute('alignment-baseline', 'middle'); 
        textHeight.textContent = `${Math.floor(el.h/12)}'${Math.round(el.h%12)}"`;
        
        displayIdx++;
    });

    hideExcessSVG('dim-auto-tline', displayIdx); hideExcessSVG('dim-auto-ttext', displayIdx);
    hideExcessSVG('dim-auto-lline', displayIdx); hideExcessSVG('dim-auto-ltext', displayIdx);
}

// =========================================
// AI AGENT BRIDGE API
// =========================================

window.addRoom = function(x, y, w, h, type) {
    if(typeof saveState === 'function') saveState();
    
    // Ensure all variables exist, fallback to defaults
    const safeType = type || 'living';
    const safeW = w || 120;
    const safeH = h || 120;
    const safeX = x || 20;
    const safeY = y || 20;

    elements.push({ 
        type: safeType, 
        w: safeW, 
        h: safeH, 
        x: safeX, 
        y: safeY, 
        floor: currentFloor, 
        locked: false, 
        dir: safeType === 'staircase' ? 'up' : null 
    });
    
    if(typeof renderSidebar === 'function') renderSidebar();
    updateCanvas();
};

window.moveElement = function(id, newX, newY) {
    if (!elements[id]) return; 
    if(typeof saveState === 'function') saveState();
    
    elements[id].x = newX;
    elements[id].y = newY;
    
    if(typeof renderSidebar === 'function') renderSidebar();
    updateCanvas();
};

window.deleteElementAI = function(idx) {
    if (!elements[idx]) return;
    if(typeof saveState === 'function') saveState(); 
    
    elements.splice(idx, 1); 
    fixtures = fixtures.filter(f => f.roomId !== idx);
    fixtures.forEach(f => { if (f.roomId > idx) f.roomId--; });
    
    selectedElIndex = (selectedElIndex === idx) ? -1 : (selectedElIndex > idx ? selectedElIndex - 1 : selectedElIndex);
    if(typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas(); 
};

document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    // Ignore input if user is typing in a text box
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    // 🌟 FIX 9: CTRL+Z and CTRL+Y (Undo/Redo Shortcuts)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redoAction();
        else undoAction();
        return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redoAction();
        return;
    }

    // --- Original Nudge (Arrow Keys) Logic ---
    if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) return;

    const el = elements[selectedElIndex];
    if (el.locked) return;

    const step = e.shiftKey ? 12 : 1; 
    let moved = false;

    if (e.key === 'ArrowUp') { el.y -= step; moved = true; }
    if (e.key === 'ArrowDown') { el.y += step; moved = true; }
    if (e.key === 'ArrowLeft') { el.x -= step; moved = true; }
    if (e.key === 'ArrowRight') { el.x += step; moved = true; }

    if (moved) {
        e.preventDefault(); 
        updateCanvas();
        if(typeof renderSidebar === 'function') renderSidebar();
    }
});

document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') { e.preventDefault(); UI.isSpacePanMode = true; if(UI.blueprint) UI.blueprint.style.cursor = 'grab'; }
});
document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') { UI.isSpacePanMode = false; UI.isSpacePanning = false; if(UI.blueprint) UI.blueprint.style.cursor = ''; }
});

if (typeof initDOMCache === 'function') {
    initDOMCache();
    initInteractions(); 
    if(typeof loadFromMemory === 'function') loadFromMemory();
    if(typeof renderFloorSelectors === 'function') renderFloorSelectors(); 
    updateCanvas();
}


// =========================================
// KEYBOARD & CONTEXT MENU LOGIC
// =========================================
document.addEventListener('keydown', (e) => {
    // Ignore if typing in a text input (like custom room names)
    if (e.target.tagName === 'INPUT' || typeof selectedElIndex === 'undefined' || selectedElIndex === -1) return; 

    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        cloneElement(selectedElIndex);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        elements[selectedElIndex].locked = !elements[selectedElIndex].locked;
        if(typeof renderSidebar === 'function') renderSidebar();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteElement(selectedElIndex);
    }
});

// Context Menu Listener
document.getElementById('blueprint').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (typeof selectedElIndex !== 'undefined' && selectedElIndex !== -1) {
        const ctx = document.getElementById('context-menu');
        ctx.style.display = 'block';
        ctx.style.left = e.pageX + 'px';
        ctx.style.top = e.pageY + 'px';
    }
});

// Hide menu on normal click
document.addEventListener('click', (e) => {
    const ctx = document.getElementById('context-menu');
    if (ctx && e.target.closest('#context-menu') === null) {
        ctx.style.display = 'none';
    }
});


// =========================================
// PHASE 2: PERSISTENCE & REPORTING
// =========================================

// --- 3. Auto-Area Calculation Dashboard (Worker Receiver) ---
window.renderAreaUI = function(areaData) {
    const dash = document.getElementById('area-dashboard');
    const totalBuiltAreaUI = document.getElementById('total-built-area'); 

    if (!dash) return;

    // 1. Update the Global Built-Up Area
    if (totalBuiltAreaUI) {
        totalBuiltAreaUI.innerText = `Built-Up Area: ${areaData.totalBuiltUpAreaAllFloors.toFixed(1)} sq.ft`;
    }

    // 2. Handle empty current floor
    if (Object.keys(areaData.currentFloorTotals).length === 0) {
        dash.innerHTML = '<div style="color: #94a3b8; text-align: center;">No rooms on this floor...</div>';
        return;
    }

    // 3. Build the UI HTML for the Current Floor
    let html = '';
    
    // The Web Worker already sorted the rooms by size for us, so we just loop and draw!
    for (const [room, sqft] of Object.entries(areaData.currentFloorTotals)) {
        html += `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
                <span style="color: #cbd5e1;">${room}</span>
                <span style="color: #38bdf8; font-weight: bold; font-family: monospace;">${sqft.toFixed(1)} sqft</span>
            </div>
        `;
    }

    // 4. Append the Grand Total
    html += `
        <div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid #38bdf8;">
            <span style="color: #f8fafc; font-weight: 900;">THIS FLOOR TOTAL</span>
            <span style="color: #10b981; font-weight: 900; font-family: monospace; font-size: 0.85rem;">${areaData.currentFloorGrandTotal.toFixed(1)} sqft</span>
        </div>
    `;

    dash.innerHTML = html;
};



// =========================================
// 📡 EVENT BUS LISTENERS
// =========================================
AppEvents.onStateChange(() => {
    if (typeof updateCanvas === 'function') updateCanvas();
    if (typeof renderSidebar === 'function') renderSidebar();
});

AppEvents.onSelectionChange(() => {
    if (typeof renderSidebar === 'function') renderSidebar();
});
// ==========================================
// 🌟 APP BOOTSTRAPPER (Auto-Starter) 🌟
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cache the HTML elements
    if (typeof initDOMCache === 'function') {
        initDOMCache();
    }
    
    // 2. Load any saved data from local storage (if you have an auto-save feature)
    if (typeof loadState === 'function' && localStorage.getItem('ArchCAD_AutoSave')) {
        loadState();
    }
    
    // 3. Force the 2D canvas to draw
    if (typeof updateCanvas === 'function') {
        updateCanvas();
    }
    
    // 4. Initialize the sidebar/floor data
    if (typeof setFloor === 'function') {
        setFloor(0); 
    }
});