// =================================================================
// 2D RENDERER (renderer2d.js)
// Strictly handles drawing paths, rects, text, and SVG diffing
// =================================================================

// 🌟 1. The Main Orchestrator
function updateCanvas(force3D = true) {
    if (typeof syncStaircasesIfNeeded === 'function') syncStaircasesIfNeeded();
    updateCompass();
    
    const unit = UI.unitSelect ? UI.unitSelect.value : 'in';
    const SCALE = parseFloat(UI.scaleInput ? UI.scaleInput.value : 1.2) || 1.2;
    const geom = calculateGeometry(SCALE, unit); 

    renderSiteEnvironment(geom);
    renderArchitecture(geom);
    renderOverlaysAndStats(geom);
    cleanupExcessSVG();
    
    if (force3D && typeof request3DUpdate === 'function') request3DUpdate();
    if (typeof markStateDirty === 'function') markStateDirty();
    if (typeof updateAreaDashboard === 'function') updateAreaDashboard();
    if (typeof updateVastuHUD === 'function') updateVastuHUD();
    if (typeof calculateVastuScore === 'function') calculateVastuScore();
    if (typeof runComplianceCheck === 'function') runComplianceCheck();
    if (typeof requestBackgroundMath === 'function') requestBackgroundMath();
    if (typeof refreshProjectStatsUI === 'function') refreshProjectStatsUI(geom);
}

// -----------------------------------------
// SVG DRAWING HELPERS
// -----------------------------------------
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

// -----------------------------------------
// ENVIRONMENT & PLOT RENDERING
// -----------------------------------------
function renderSiteEnvironment(geom) {
    renderPlotBoundaries(geom); 
    renderSiteOffsets(geom);    
    renderRoad(geom);           
}

function renderArchitecture(geom) {
    renderRooms(geom);          
    renderFixtures(geom);       
    handleColumnToggle(geom);   
}

function renderPlotBoundaries(geom) {
    const showLabels = UI.showLabelsToggle ? UI.showLabelsToggle.checked : true;
    drawInnerBuiltUpArea(geom);
    drawOuterPlotArea(geom);
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
    const zoom = window.CanvasState.zoomLvl;
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
        if (!showLabels) { if (el) el.style.display = 'none'; return; }
        if (!el) {
            el = document.createElementNS("http://www.w3.org/2000/svg", "text");
            el.id = id; el.setAttribute('font-size', '14'); el.setAttribute('font-weight', 'bold');
            el.setAttribute('text-anchor', 'middle'); el.setAttribute('pointer-events', 'none');
            el.style.textShadow = "1px 1px 2px #000";
            if (UI.viewport) UI.viewport.appendChild(el);
        }
        el.setAttribute('x', x); el.setAttribute('y', y);
        el.setAttribute('fill', color); el.textContent = text;
        el.style.display = 'block';
    };

    const distAB = Math.hypot(B.x - A.x, B.y - A.y) / SCALE;
    const distBC = Math.hypot(C.x - B.x, C.y - B.y) / SCALE;
    const distCD = Math.hypot(D.x - C.x, D.y - C.y) / SCALE;
    const distDA = Math.hypot(A.x - D.x, A.y - D.y) / SCALE;
    renderText('plot-dim-ab', (A.x + B.x) / 2, (A.y + B.y) / 2 - 12, formatDim(distAB), '#f59e0b');
    renderText('plot-dim-bc', (B.x + C.x) / 2 + 30, (B.y + C.y) / 2 + 5, formatDim(distBC), '#f59e0b');
    renderText('plot-dim-cd', (C.x + D.x) / 2, (C.y + D.y) / 2 + 22, formatDim(distCD), '#f59e0b');
    renderText('plot-dim-da', (D.x + A.x) / 2 - 30, (D.y + A.y) / 2 + 5, formatDim(distDA), '#f59e0b');

    const distIJ = Math.hypot(J.x - I.x, J.y - I.y) / SCALE;
    const distJK = Math.hypot(K.x - J.x, K.y - J.y) / SCALE;
    const distKL = Math.hypot(L.x - K.x, L.y - K.y) / SCALE;
    const distLI = Math.hypot(I.x - L.x, I.y - L.y) / SCALE;
    renderText('plot-dim-ij', (I.x + J.x) / 2, (I.y + J.y) / 2 - 10, formatDim(distIJ), '#38bdf8');
    renderText('plot-dim-jk', (J.x + K.x) / 2 + 25, (J.y + K.y) / 2 + 30, formatDim(distJK), '#38bdf8');
    renderText('plot-dim-kl', (K.x + L.x) / 2, (K.y + L.y) / 2 + 20, formatDim(distKL), '#38bdf8');
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
// ROOMS & FIXTURES RENDERING
// -----------------------------------------
function renderRooms(geom) {
    const { I, SCALE } = geom;
    let gBorders = document.getElementById('group-borders') || createSVGGroup('group-borders');
    let gHollows = document.getElementById('group-hollows') || createSVGGroup('group-hollows');
    let gRooms = document.getElementById('group-rooms') || createSVGGroup('group-rooms');
    let gText = document.getElementById('group-text') || createSVGGroup('group-text');

    const smartMerge = UI.smartMergeToggle && UI.smartMergeToggle.checked;
    window.renderedLabels = [];

    elements.forEach((el, i) => {
        let r = document.getElementById(`rect-${i}`) || createSVGRect(`rect-${i}`, gRooms);
        let rb = document.getElementById(`rect-border-${i}`) || createSVGRect(`rect-border-${i}`, gBorders);
        let rh = document.getElementById(`rect-hollow-${i}`) || createSVGRect(`rect-hollow-${i}`, gHollows);

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
        r.onmousedown = function(e) { if(typeof startDrag === 'function') startDrag(e, i); };

        const isColliding = smartMerge ? false : (typeof checkCollision === 'function' ? checkCollision(el, i) : false);
        let baseColor = ARCH_CONFIG?.COLORS[el.type]?.rgb || '255,255,255';
        if (el.customColor) {
            const hex = el.customColor.replace('#', '');
            baseColor = `${parseInt(hex.substring(0,2),16)}, ${parseInt(hex.substring(2,4),16)}, ${parseInt(hex.substring(4,6),16)}`;
        }

        const strokeColor = isSelected ? '#ffffff' : (isColliding ? '#ef4444' : `rgb(${baseColor})`);
        const fillColor = isColliding ? 'rgba(239, 68, 68, 0.4)' : `rgba(${baseColor}, 0.2)`;

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
            rect.onmousedown = (e) => { e.stopPropagation(); if(typeof startDragFixture === 'function') startDragFixture(e, i); }; 
        } else if (fix.type === 'door') {
            rect.setAttribute('x', fx); rect.setAttribute('y', fy); rect.setAttribute('width', fw); rect.setAttribute('height', fh);
            rect.setAttribute('fill', '#0f172a'); rect.setAttribute('stroke', 'none');
            rect.onmousedown = (e) => { e.stopPropagation(); if(typeof startDragFixture === 'function') startDragFixture(e, i); };
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

function drawColumns(geom) {
    let group = getOrCreateSVG('g', 'column-container', UI.elementContainer || UI.blueprint);
    group.style.display = '';
    const SCALE = geom.SCALE;
    const I = geom.I;
    
    const groundRooms = elements.filter(el => el.floor === 0 && !el.isFurniture);
    const MAX_SPAN = 180; 
    let potentialPoints = [];

    groundRooms.forEach(el => {
        potentialPoints.push(
            { x: el.x, y: el.y }, 
            { x: el.x + el.w, y: el.y }, 
            { x: el.x, y: el.y + el.h }, 
            { x: el.x + el.w, y: el.y + el.h }
        );
        if (el.w > MAX_SPAN) {
            const splits = Math.ceil(el.w / MAX_SPAN);
            const step = el.w / splits;
            for (let i = 1; i < splits; i++) {
                potentialPoints.push({ x: el.x + (step * i), y: el.y });           
                potentialPoints.push({ x: el.x + (step * i), y: el.y + el.h });    
            }
        }
        if (el.h > MAX_SPAN) {
            const splits = Math.ceil(el.h / MAX_SPAN);
            const step = el.h / splits;
            for (let i = 1; i < splits; i++) {
                potentialPoints.push({ x: el.x, y: el.y + (step * i) });           
                potentialPoints.push({ x: el.x + el.w, y: el.y + (step * i) });    
            }
        }
    });

    let finalColumns = [];
    potentialPoints.forEach(pt => {
        const isDuplicate = finalColumns.some(col => Math.hypot(col.x - pt.x, col.y - pt.y) < 12);
        if (!isDuplicate) finalColumns.push(pt);
    });

    const isStrictlyInside = (px, py) => {
        return groundRooms.some(el => px > el.x + 2 && px < el.x + el.w - 2 && py > el.y + 2 && py < el.y + el.h - 2);
    };
    finalColumns = finalColumns.filter(pt => !isStrictlyInside(pt.x, pt.y));

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

// -----------------------------------------
// TEXT & STATS RENDERING
// -----------------------------------------
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
        tooltip.style.left = (e.clientX + 20) + 'px';
        tooltip.style.top = (e.clientY + 20) + 'px';
    };
    r.onmouseout = function() { 
        const tooltip = document.getElementById('room-tooltip');
        tooltip.style.display = 'none';
    };
}

function renderRoomText(i, el, rx, ry, w, h, IX, IY) {
    let gText = document.getElementById('group-text');
    const cx = rx + w / 2; const cy = ry + h / 2;
    const labelText = el.customName || (typeof getRoomDisplayName === 'function' ? getRoomDisplayName(i) : el.type.toUpperCase());
    
    if (UI.showLabelsToggle && !UI.showLabelsToggle.checked) return;
    
    const SCALE = parseFloat(UI.scaleInput?.value) || 1.2;

    if (UI.smartMergeToggle && UI.smartMergeToggle.checked) {
        const isDuplicate = window.renderedLabels.find(l => l.text === labelText && Math.hypot(l.x - cx, l.y - cy) < ARCH_CONFIG.REFINEMENTS.SMART_MERGE_TEXT_RADIUS * SCALE);
        if (isDuplicate) return; 
        window.renderedLabels.push({ text: labelText, x: cx, y: cy });
    }
    
    const minSize = 45 * SCALE; 
    
    if (w < minSize || h < minSize) {
        ['title', 'dims', 'area'].forEach(t => { 
            let node = document.getElementById(`txt-${t}-${i}`); 
            if(node) node.style.display = 'none'; 
        });
    } else {
        const dimsText = `${Math.floor(el.w/12)}'${Math.round(el.w%12)}" × ${Math.floor(el.h/12)}'${Math.round(el.h%12)}"`;
        const areaText = `${((el.w * el.h)/144).toFixed(1)} sq.ft`;
        createOrUpdateText(`txt-title-${i}`, gText, cx, cy - 8, labelText, '#ffffff', '12', true);
        createOrUpdateText(`txt-dims-${i}`, gText, cx, cy + 6, dimsText, '#cbd5e1', '10', false);
        createOrUpdateText(`txt-area-${i}`, gText, cx, cy + 20, areaText, '#94a3b8', '10', false);
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

function renderOverlaysAndStats(geom) {
    if(typeof validateStairs === 'function') validateStairs();
    if(typeof renderAutoDimensions === 'function') renderAutoDimensions();
    const svg = document.getElementById('blueprint');
    window.CanvasState.snapLines.forEach(line => {
        const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
        if (line.type === 'v') { l.setAttribute("x1", line.x); l.setAttribute("x2", line.x); l.setAttribute("y1", 0); l.setAttribute("y2", 1000); }
        else { l.setAttribute("y1", line.y); l.setAttribute("y2", line.y); l.setAttribute("x1", 0); l.setAttribute("x2", 1000); }
        l.setAttribute("style", "stroke: #fbbf24; stroke-width: 1.5; stroke-dasharray: 6,4;");
        if(svg) svg.appendChild(l);
    });
}

window.renderAreaUI = function(areaData) {
    const dash = document.getElementById('area-dashboard');
    if (!dash) return;
    if (Object.keys(areaData.currentFloorTotals).length === 0) {
        dash.innerHTML = '<div style="color: #94a3b8; text-align: center;">No rooms on this floor...</div>';
        return;
    }
    let html = '';
    for (const [room, sqft] of Object.entries(areaData.currentFloorTotals)) {
        html += `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
                <span style="color: #cbd5e1;">${room}</span>
                <span style="color: #38bdf8; font-weight: bold; font-family: monospace;">${sqft.toFixed(1)} sqft</span>
            </div>
        `;
    }
    html += `
        <div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid #38bdf8;">
            <span style="color: #f8fafc; font-weight: 900;">THIS FLOOR TOTAL</span>
            <span style="color: #10b981; font-weight: 900; font-family: monospace; font-size: 0.85rem;">${areaData.currentFloorGrandTotal.toFixed(1)} sqft</span>
        </div>
    `;
    dash.innerHTML = html;
};

// -----------------------------------------
// SVG DIFF ENGINE (Optimization)
// -----------------------------------------
function getOrCreateSVG(type, id, parent) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElementNS("http://www.w3.org/2000/svg", type);
        el.id = id;
        parent.appendChild(el);
    }
    el.style.display = ''; 
    return el;
}

function hideExcessSVG(prefix, count) {
    let el = document.getElementById(`${prefix}-${count}`);
    while (el) {
        el.style.display = 'none'; 
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

function cleanupExcessSVG() {
    let excessIndex = elements.length;
    while(document.getElementById(`rect-${excessIndex}`)) {
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

function updateCompass() {
    if (UI.dirTop && UI.dirRight) {
        if (globalCompassDir === 'North') { UI.dirTop.textContent = 'N'; UI.dirRight.textContent = 'E'; }
        else if (globalCompassDir === 'East') { UI.dirTop.textContent = 'E'; UI.dirRight.textContent = 'S'; }
        else if (globalCompassDir === 'South') { UI.dirTop.textContent = 'S'; UI.dirRight.textContent = 'W'; }
        else if (globalCompassDir === 'West') { UI.dirTop.textContent = 'W'; UI.dirRight.textContent = 'N'; }
    }
}

function fastUpdateDrag(index) {
    const el = elements[index];
    const { SCALE, I } = Utils.getMetrics();
    const rx = I.x + (el.x * SCALE); 
    const ry = I.y + (el.y * SCALE);

    Utils.setAttr(document.getElementById(`rect-${index}`), 'x', rx);
    Utils.setAttr(document.getElementById(`rect-${index}`), 'y', ry);
    Utils.setAttr(document.getElementById(`rect-border-${index}`), 'x', rx);
    Utils.setAttr(document.getElementById(`rect-border-${index}`), 'y', ry);
    Utils.setAttr(document.getElementById(`rect-hollow-${index}`), 'x', rx + 1.5);
    Utils.setAttr(document.getElementById(`rect-hollow-${index}`), 'y', ry + 1.5);

    const cx = rx + (el.w * SCALE) / 2; 
    const cy = ry + (el.h * SCALE) / 2;
    
    Utils.setAttr(document.getElementById(`txt-title-${index}`), 'x', cx);
    Utils.setAttr(document.getElementById(`txt-title-${index}`), 'y', cy - 8);
    Utils.setAttr(document.getElementById(`txt-dims-${index}`), 'x', cx);
    Utils.setAttr(document.getElementById(`txt-dims-${index}`), 'y', cy + 6);
    Utils.setAttr(document.getElementById(`txt-area-${index}`), 'x', cx);
    Utils.setAttr(document.getElementById(`txt-area-${index}`), 'y', cy + 20);

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

function renderDynamicDistances(guideLayer, SCALE, Ix, Iy, draggedBounds) {
    const { dLeft, dRight, dTop, dBottom, dCenter, dMiddle } = draggedBounds;
    const drawDist = (x1, y1, x2, y2, distVal) => {
        const ft = Math.floor(distVal / 12);
        const inc = Math.round(distVal % 12);
        if (ft === 0 && inc === 0) return;
        
        const textStr = ft > 0 ? `${ft}' ${inc}"` : `${inc}"`;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        
        const dLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        dLine.setAttribute('x1', Ix + (x1 * SCALE)); dLine.setAttribute('x2', Ix + (x2 * SCALE));
        dLine.setAttribute('y1', Iy + (y1 * SCALE)); dLine.setAttribute('y2', Iy + (y2 * SCALE));
        dLine.setAttribute('style', 'stroke: #ef4444; stroke-width: 1.5; stroke-dasharray: 4,4;');
        guideLayer.appendChild(dLine);
        
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute('x', Ix + (cx * SCALE) - 15); bg.setAttribute('y', Iy + (cy * SCALE) - 8);
        bg.setAttribute('width', 30); bg.setAttribute('height', 16);
        bg.setAttribute('fill', '#0f172a'); bg.setAttribute('rx', 4);
        guideLayer.appendChild(bg);

        const dText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        dText.setAttribute('x', Ix + (cx * SCALE)); dText.setAttribute('y', Iy + (cy * SCALE) + 3);
        dText.setAttribute('fill', '#ef4444'); dText.setAttribute('font-size', '10');
        dText.setAttribute('font-weight', 'bold'); dText.setAttribute('text-anchor', 'middle');
        dText.textContent = textStr;
        guideLayer.appendChild(dText);
    };

    cachedSnapBoundaries.forEach((boundary) => {
        if (!boundary) return;
        const overlapY = (dTop < boundary.bottom && dBottom > boundary.top);
        if (overlapY) {
            const distRight = boundary.left - dRight; 
            const distLeft = dLeft - boundary.right;  
            if (distRight > 0 && distRight < 120) drawDist(dRight, dMiddle, boundary.left, dMiddle, distRight);
            if (distLeft > 0 && distLeft < 120) drawDist(dLeft, dMiddle, boundary.right, dMiddle, distLeft);
        }
        
        const overlapX = (dLeft < boundary.right && dRight > boundary.left);
        if (overlapX) {
            const distBottom = boundary.top - dBottom; 
            const distTop = dTop - boundary.bottom;    
            if (distBottom > 0 && distBottom < 120) drawDist(dCenter, dBottom, dCenter, boundary.top, distBottom);
            if (distTop > 0 && distTop < 120) drawDist(dCenter, dTop, dCenter, boundary.bottom, distTop);
        }
    });
}