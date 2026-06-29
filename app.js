// =================================================================
// APP.JS - CORE 2D ENGINE (Unabridged)
// =================================================================

// --- CAMERA & VIEWPORT ---
let panX = 0, panY = 0, zoomLvl = 1; 

function updateViewport() {
    if (UI.viewport) UI.viewport.setAttribute('transform', `matrix(${zoomLvl}, 0, 0, ${zoomLvl}, ${panX}, ${panY})`);
}

function panCamera(dx, dy) {
    panX += dx; panY += dy;
    updateViewport();
}

function zoomCamera(factor) {
    const newZoom = zoomLvl * factor;
    if(newZoom < 0.2 || newZoom > 5) return; 
    const cx = 500, cy = 500;
    panX = cx - (cx - panX) * factor;
    panY = cy - (cy - panY) * factor;
    zoomLvl = newZoom;
    updateViewport();
}

// --- MATH & UTILITIES ---
function getMousePos(evt) {
    const pt = UI.blueprint.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    const svgP = pt.matrixTransform(UI.blueprint.getScreenCTM().inverse());
    return { x: (svgP.x - panX) / zoomLvl, y: (svgP.y - panY) / zoomLvl };
}

function getTouchPos(evt) {
    const pt = UI.blueprint.createSVGPoint();
    pt.x = evt.touches[0].clientX; pt.y = evt.touches[0].clientY;
    const svgP = pt.matrixTransform(UI.blueprint.getScreenCTM().inverse());
    return { x: (svgP.x - panX) / zoomLvl, y: (svgP.y - panY) / zoomLvl };
}

const toInches = (val, unit) => unit === 'cm' ? parseFloat(val) / 2.54 : parseFloat(val);
const getPolygonArea = (coords) => { 
    let area = 0; 
    for (let i = 0; i < coords.length; i++) { 
        let j = (i + 1) % coords.length; 
        area += coords[i].x * coords[j].y; area -= coords[j].x * coords[i].y; 
    } 
    return Math.abs(area) / 2; 
};

function checkCollision(el, index) { 
    return elements.some((other, i) => 
        i !== index && other.floor === el.floor && 
        !(el.x + el.w <= other.x || el.x >= other.x + other.w || el.y + el.h <= other.y || el.y >= other.y + other.h)
    ); 
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

function drawColumns() {
    const toggle = document.getElementById('showColsToggle');
    let group = document.getElementById('column-container');
    
    if (toggle && !toggle.checked) { if (group) group.innerHTML = ''; return; }
    if (!group) {
        group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.id = 'column-container';
        if (UI.elementContainer) UI.elementContainer.appendChild(group);
    }
    group.innerHTML = ''; 

    const SCALE = parseFloat(UI.scaleInput.value) || 1.2;
    const inW = toInches(UI.inW.value, UI.unitSelect.value);
    const inH = toInches(UI.inH.value, UI.unitSelect.value);
    const I = { x: 500 - (inW/2), y: 500 - (inH/2) };
    const placedColumns = new Map();

    elements.forEach(el => {
        if (el.floor !== currentFloor) return;
        const corners = [{ x: el.x, y: el.y }, { x: el.x + el.w, y: el.y }, { x: el.x, y: el.y + el.h }, { x: el.x + el.w, y: el.y + el.h }];
        corners.forEach(pos => {
            const key = `${Math.round(pos.x)}_${Math.round(pos.y)}`;
            if (!placedColumns.has(key)) {
                const col = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                col.setAttribute('cx', I.x + (pos.x * SCALE)); col.setAttribute('cy', I.y + (pos.y * SCALE));
                col.setAttribute('r', 6 * SCALE); col.setAttribute('fill', '#94a3b8');
                col.setAttribute('stroke', '#1e293b'); col.setAttribute('stroke-width', '1');
                group.appendChild(col);
                placedColumns.set(key, true);
            }
        });
    });
}

// =========================================
// FULL RENDERING ENGINE (updateCanvas)
// =========================================
function updateCanvas() {
    const unit = UI.unitSelect.value;
    const SCALE = parseFloat(UI.scaleInput.value) || 1.2;
    
    // Compass
    if (UI.dirTop && UI.dirRight) {
        if (globalCompassDir === 'North') { UI.dirTop.textContent = 'N'; UI.dirRight.textContent = 'E'; }
        else if (globalCompassDir === 'East') { UI.dirTop.textContent = 'E'; UI.dirRight.textContent = 'S'; }
        else if (globalCompassDir === 'South') { UI.dirTop.textContent = 'S'; UI.dirRight.textContent = 'W'; }
        else if (globalCompassDir === 'West') { UI.dirTop.textContent = 'W'; UI.dirRight.textContent = 'N'; }
    }

    // Geometry
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

    // Core Boundaries
    if (UI.innerRect) {
        UI.innerRect.setAttribute('x', I.x); UI.innerRect.setAttribute('y', I.y);
        UI.innerRect.setAttribute('width', inW); UI.innerRect.setAttribute('height', inH);
    }
    if (UI.outerPoly) UI.outerPoly.setAttribute('points', `${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y} ${D.x},${D.y}`);

    // Labels & Badges
    const showLabels = UI.showLabelsToggle ? UI.showLabelsToggle.checked : true;
    updateSVGPosition('labI', I.x + 5, I.y - 5, 'I', showLabels); updateSVGPosition('labJ', J.x + 5, J.y - 5, 'J', showLabels);
    updateSVGPosition('labK', K.x + 5, K.y - 5, 'K', showLabels); updateSVGPosition('labL', L.x + 5, L.y - 5, 'L', showLabels);
    updateSVGPosition('labA', A.x - 20, A.y - 10, null, showLabels); updateSVGPosition('labB', B.x + 15, B.y - 10, null, showLabels); 
    updateSVGPosition('labC', C.x + 15, C.y + 35, null, showLabels); updateSVGPosition('labD', D.x - 20, D.y + 35, null, showLabels);

    drawProBadge('A', A.x - 15, A.y - 15, 'A', '#94a3b8', showLabels, zoomLvl, UI.viewport);
    drawProBadge('B', B.x + 15, B.y - 15, 'B', '#94a3b8', showLabels, zoomLvl, UI.viewport);
    drawProBadge('C', C.x + 15, C.y + 15, 'C', '#94a3b8', showLabels, zoomLvl, UI.viewport);
    drawProBadge('D', D.x - 15, D.y + 15, 'D', '#94a3b8', showLabels, zoomLvl, UI.viewport);
    drawProBadge('I', I.x - 15, I.y - 15, 'I', '#38bdf8', showLabels, zoomLvl, UI.viewport);
    drawProBadge('J', J.x + 15, J.y - 15, 'J', '#38bdf8', showLabels, zoomLvl, UI.viewport);
    drawProBadge('K', K.x + 15, K.y + 15, 'K', '#38bdf8', showLabels, zoomLvl, UI.viewport);
    drawProBadge('L', L.x - 15, L.y + 15, 'L', '#38bdf8', showLabels, zoomLvl, UI.viewport);

    // Site Offsets
    const showOffsets = UI.showOffsetsToggle && UI.showOffsetsToggle.checked;
    if (!showOffsets) { if(UI.siteOffsets) UI.siteOffsets.innerHTML = ''; } 
    else {
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

    // Road Logic
    const road = UI.roadSide ? UI.roadSide.value : 'none';
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

    // Room Rendering & Layering
    let gBorders = document.getElementById('group-borders');
    let gHollows = document.getElementById('group-hollows');
    let gRooms = document.getElementById('group-rooms');
    let gText = document.getElementById('group-text');
    let fixtureGroup = document.getElementById('fixture-container'); 

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

    const smartMerge = UI.smartMergeToggle && UI.smartMergeToggle.checked;

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
            return; 
        }

        const rx = I.x + (el.x * SCALE); const ry = I.y + (el.y * SCALE);
        const w = el.w * SCALE; const h = el.h * SCALE;
        
        [r, rb].forEach(rect => { rect.setAttribute('x', rx); rect.setAttribute('y', ry); rect.setAttribute('width', w); rect.setAttribute('height', h); });
        rh.setAttribute('x', rx + 1.5); rh.setAttribute('y', ry + 1.5); rh.setAttribute('width', w - 3); rh.setAttribute('height', h - 3);

        const isSelected = (i === selectedElIndex);
        r.setAttribute('class', isSelected ? 'room-rect room-selected' : 'room-rect');
        r.onmousedown = function(e) { startDrag(e, i); };

        const isColliding = smartMerge ? false : checkCollision(el, i);
        let baseColor = colors[el.type] || '255,255,255';
        if (el.customColor) {
            const hex = el.customColor.replace('#', '');
            baseColor = `${parseInt(hex.substring(0,2),16)}, ${parseInt(hex.substring(2,4),16)}, ${parseInt(hex.substring(4,6),16)}`;
        }

        const strokeColor = isSelected ? '#ffffff' : (isColliding ? '#ef4444' : `rgb(${baseColor})`);
        const fillColor = isColliding ? 'rgba(239, 68, 68, 0.4)' : `rgba(${baseColor}, 0.2)`;

        if (smartMerge) {
            r.style.display = 'block'; rb.style.display = 'block'; rh.style.display = 'block';
            rb.setAttribute('style', `fill: ${strokeColor}; stroke: none;`);
            rh.setAttribute('style', `fill: #0f172a; stroke: none;`); 
            r.setAttribute('style', `fill: ${fillColor}; stroke: none;`);
        } else {
            r.style.display = 'block'; rb.style.display = 'none'; rh.style.display = 'none';
            r.setAttribute('style', `fill: ${fillColor}; stroke: ${strokeColor}; stroke-width: ${isSelected ? '3' : '1.5'}; ${el.type === 'balcony' ? 'stroke-dasharray: 6, 4;' : ''}`);
        }

// ... after you set the attributes for r (the rect) ...
r.onmouseover = function(e) {
    const tooltip = document.getElementById('room-tooltip');
    tooltip.style.display = 'block';
    // Format the tooltip content
    const area = ((el.w * el.h)/144).toFixed(1);
    tooltip.innerHTML = `
        <div style="font-weight:bold; color:#38bdf8;">${el.customName || el.type.toUpperCase()}</div>
        <div>${Math.floor(el.w/12)}'${Math.round(el.w%12)}" × ${Math.floor(el.h/12)}'${Math.round(el.h%12)}"</div>
        <div>${area} sq.ft</div>
    `;
};

r.onmousemove = function(e) {
    const tooltip = document.getElementById('room-tooltip');
    // Position the tooltip near the mouse cursor
    tooltip.style.left = (e.clientX + 15) + 'px';
    tooltip.style.top = (e.clientY + 15) + 'px';
};

r.onmouseout = function(e) {
    document.getElementById('room-tooltip').style.display = 'none';
};

        // Text & Data
        const cx = rx + w / 2; const cy = ry + h / 2;
        const labelText = el.customName || (typeof getRoomDisplayName === 'function' ? getRoomDisplayName(i) : el.type.toUpperCase());
        const dimsText = `${Math.floor(el.w/12)}'${Math.round(el.w%12)}" × ${Math.floor(el.h/12)}'${Math.round(el.h%12)}"`;
        const areaText = `${((el.w * el.h)/144).toFixed(1)} sq.ft`;
        
        createOrUpdateText(`txt-title-${i}`, gText, cx, cy - 8, labelText, '#ffffff', '12', true);
        createOrUpdateText(`txt-dims-${i}`, gText, cx, cy + 6, dimsText, '#cbd5e1', '10', false);
        createOrUpdateText(`txt-area-${i}`, gText, cx, cy + 20, areaText, '#94a3b8', '10', false);
    
        // ==========================================
        // 🎯 PASTE THE MISSING DIMENSIONS CODE HERE:
        // ==========================================
        const showDimsToggle = UI.showDims || document.getElementById('showDims');
        let dimTop = document.getElementById(`dim-top-${i}`);
        let dimLeft = document.getElementById(`dim-left-${i}`);
        
        if (showDimsToggle && showDimsToggle.checked) {
            // Force the dimensions into the top border layer so they are never hidden
            let dimContainer = UI.dimContainer || document.getElementById('dim-container') || document.getElementById('group-borders');
            
            if (!dimTop) { 
                dimTop = document.createElementNS("http://www.w3.org/2000/svg", "line"); 
                dimTop.id = `dim-top-${i}`; 
                dimContainer.appendChild(dimTop); 
            }
            if (!dimLeft) { 
                dimLeft = document.createElementNS("http://www.w3.org/2000/svg", "line"); 
                dimLeft.id = `dim-left-${i}`; 
                dimContainer.appendChild(dimLeft); 
            }
            
            dimTop.setAttribute('x1', rx); dimTop.setAttribute('y1', ry); 
            dimTop.setAttribute('x2', rx); dimTop.setAttribute('y2', I.y);
            dimLeft.setAttribute('x1', rx); dimLeft.setAttribute('y1', ry); 
            dimLeft.setAttribute('x2', I.x); dimLeft.setAttribute('y2', ry);
            
            // Force explicit styling to guarantee visibility
            dimTop.setAttribute('style', 'stroke: #cbd5e1; stroke-width: 1.5; stroke-dasharray: 4,4; pointer-events: none;');
            dimLeft.setAttribute('style', 'stroke: #cbd5e1; stroke-width: 1.5; stroke-dasharray: 4,4; pointer-events: none;');
            
            dimTop.style.display = 'block'; dimLeft.style.display = 'block';
        } else {
            if (dimTop) dimTop.style.display = 'none';
            if (dimLeft) dimLeft.style.display = 'none';
        }
        // ==========================================

    });

    // Fixtures Rendering
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
            wRect.onmousedown = (e) => { e.stopPropagation(); startDragFixture(e, i); }; 
            fixtureGroup.appendChild(wRect);
        } else if (fix.type === 'door') {
            const gap = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            gap.setAttribute('x', fx); gap.setAttribute('y', fy); gap.setAttribute('width', fw); gap.setAttribute('height', fh);
            gap.setAttribute('fill', '#0f172a'); 
            gap.onmousedown = (e) => { e.stopPropagation(); startDragFixture(e, i); };
            fixtureGroup.appendChild(gap);

            const swing = document.createElementNS("http://www.w3.org/2000/svg", "path");
            let d = '';
            if (fix.edge === 'bottom') d = `M ${fx} ${fy+3} L ${fx} ${fy+3 - fixSize} A ${fixSize} ${fixSize} 0 0 1 ${fx + fixSize} ${fy+3}`;
            else if (fix.edge === 'top') d = `M ${fx} ${fy+3} L ${fx} ${fy+3 + fixSize} A ${fixSize} ${fixSize} 0 0 0 ${fx + fixSize} ${fy+3}`;
            else if (fix.edge === 'left') d = `M ${fx+3} ${fy} L ${fx+3 + fixSize} ${fy} A ${fixSize} ${fixSize} 0 0 1 ${fx+3} ${fy + fixSize}`;
            else if (fix.edge === 'right') d = `M ${fx+3} ${fy} L ${fx+3 - fixSize} ${fy} A ${fixSize} ${fixSize} 0 0 0 ${fx+3} ${fy + fixSize}`;
            swing.setAttribute('d', d); swing.setAttribute('fill', 'rgba(251, 191, 36, 0.1)'); 
            swing.setAttribute('stroke', '#fbbf24'); swing.setAttribute('stroke-width', '1.5');
            fixtureGroup.appendChild(swing);
        }
    });

    // Cleanup & Stats
    let excessIndex = elements.length;
    while(document.getElementById(`rect-${excessIndex}`)) {
        document.getElementById(`rect-${excessIndex}`).remove();
        let rb = document.getElementById(`rect-border-${excessIndex}`); if (rb) rb.remove();
        let rh = document.getElementById(`rect-hollow-${excessIndex}`); if (rh) rh.remove();
        ['title', 'dims', 'area'].forEach(t => { let n = document.getElementById(`txt-${t}-${excessIndex}`); if(n) n.remove(); });
        excessIndex++;
    }
    
    drawColumns();
    if(typeof validateStairs === 'function') validateStairs();

    const plotAreaSqFt = getPolygonArea([A, B, C, D]) / (SCALE * SCALE) / 144;
    const buildAreaSqFt = (inW * inH / (SCALE * SCALE) / 144);
    const coverage = plotAreaSqFt > 0 ? ((buildAreaSqFt / plotAreaSqFt) * 100).toFixed(1) : 0;
    if (UI.plotArea) UI.plotArea.innerText = `Plot Area: ${plotAreaSqFt.toFixed(2)} sq.ft`;
    if (UI.buildArea) UI.buildArea.innerText = `Build Area: ${buildAreaSqFt.toFixed(2)} sq.ft (${coverage}% Coverage)`;

    renderAutoDimensions();
    if (is3DMode && typeof generate3DModel === 'function') generate3DModel();
    if (typeof saveToMemory === 'function') saveToMemory();
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
}

function startDragFixture(evt, index) {
    isDraggingFixture = true; dragFixtureIndex = index; hasDragged = false;
}

const handleMove = (currentMouse, e) => {
    // --- UNDO BUG FIX: Save state BEFORE the room moves ---
    if (!hasDragged) {
        if (typeof saveState === 'function') saveState();
        hasDragged = true;
    }

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(() => {
        const SCALE = parseFloat(UI.scaleInput.value) || 1.2;
        
        // Mode 1: Fixtures
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
        // Mode 2: Rooms (Smart Snapping)
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

            elements.forEach((other, i) => {
                if (i === dragElIndex || other.floor !== currentFloor) return;
                let oLeft = other.x, oRight = other.x + other.w, oCenter = other.x + (other.w / 2);
                let oTop = other.y, oBottom = other.y + other.h, oMiddle = other.y + (other.h / 2);

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

            //const isStrictSnap = document.getElementById('gridSnapToggle') ? document.getElementById('gridSnapToggle').checked : false;
            const isStrictSnap = UI.gridSnapToggle ? UI.gridSnapToggle.checked : false;
            if (!snappedX) newX = isStrictSnap ? Math.round(newX / 12) * 12 : Math.round(newX);
            if (!snappedY) newY = isStrictSnap ? Math.round(newY / 12) * 12 : Math.round(newY);

            newX = Math.max(0, Math.min(newX, inW - el.w));
            newY = Math.max(0, Math.min(newY, inH - el.h));

            el.x = newX; el.y = newY;
            updateCanvas(); 

            // Render Guides
            const Ix = 500 - ((inW * SCALE)/2); const Iy = 500 - ((inH * SCALE)/2);
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

            const rx = document.getElementById(`range-x-${dragElIndex}`); const ry = document.getElementById(`range-y-${dragElIndex}`);
            const nx = document.getElementById(`num-x-${dragElIndex}`); const ny = document.getElementById(`num-y-${dragElIndex}`);
            if(rx) rx.value = newX; if(ry) ry.value = newY;
            if(nx) nx.value = newX; if(ny) ny.value = newY;
        }
    });
};

const endDrag = () => {
    // --- UNDO BUG FIX: Removed saveState from here so it doesn't overwrite history ---
    UI.isSpacePanning = false; 
    if (UI.isSpacePanMode) UI.blueprint.style.cursor = 'grab'; 
    isDragging = false; dragFixtureIndex = -1; isDraggingFixture = false; dragElIndex = -1;
    const guideLayer = document.getElementById('smart-guides');
    if (guideLayer) guideLayer.innerHTML = '';
};

// Event Listeners (Mouse & Touch)
function initInteractions() {
if (!UI.blueprint) return;
    UI.blueprint.addEventListener('mousemove', (e) => {
        if (UI.isSpacePanning) { panCamera(e.clientX - UI.spacePanStart.x, e.clientY - UI.spacePanStart.y); UI.spacePanStart = { x: e.clientX, y: e.clientY }; return; }
        
        // Measuring Mode logic during mousemove
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
        if ((isDragging && dragElIndex !== -1) || (isDraggingFixture && dragFixtureIndex !== -1)) {
            if(e.touches.length === 1) { e.preventDefault(); handleMove(getTouchPos(e), e); }
        }
    }, {passive: false});

    const endDrag = () => {
        if (hasDragged && typeof saveState === 'function') saveState();
        UI.isSpacePanning = false; 
        if (UI.isSpacePanMode) UI.blueprint.style.cursor = 'grab'; 
        isDragging = false; dragFixtureIndex = -1; isDraggingFixture = false; dragElIndex = -1;
        const guideLayer = document.getElementById('smart-guides');
        if (guideLayer) guideLayer.innerHTML = '';
    };

    UI.blueprint.addEventListener('mouseup', endDrag);
    UI.blueprint.addEventListener('mouseleave', endDrag);
    UI.blueprint.addEventListener('touchend', endDrag);

    // Click / Tape Measure / Deselect
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
        if (e.touches.length === 1 && e.target.id.startsWith('rect-')) {
            const index = parseInt(e.target.id.split('-')[1]);
            startDrag({ button: 0, shiftKey: false, clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }, index);
        }
    }, {passive: false});

}

// =========================================
// EXPORT & VIEW UTILITIES
// =========================================

function resetCamera() {
    panX = 0; 
    panY = 0; 
    zoomLvl = 1;
    updateViewport();
}

function centerOnSelection() {
    if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) return;
    
    const el = elements[selectedElIndex];
    if (el.floor !== currentFloor) return; // Don't jump if it's on a hidden floor

    const SCALE = parseFloat(UI.scaleInput.value) || 1.2;
    const unit = UI.unitSelect.value;
    
    const inW = toInches(UI.inW.value, unit) * SCALE;
    const inH = toInches(UI.inH.value, unit) * SCALE;
    const I = { x: 500 - (inW/2), y: 500 - (inH/2) };

    // Find the mathematical center of the selected room
    const roomCenterX = I.x + (el.x * SCALE) + ((el.w * SCALE) / 2);
    const roomCenterY = I.y + (el.y * SCALE) + ((el.h * SCALE) / 2);

    // Pan the camera so this exact point aligns with the 500x500 center of the SVG
    panX = 500 - (roomCenterX * zoomLvl);
    panY = 500 - (roomCenterY * zoomLvl);
    
    updateViewport();
}

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
    window.print();
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


// --- DATA & ELEMENT BINDINGS ---
function addElement() {
    if(typeof saveState === 'function') saveState();
    const type = document.getElementById('elem-type').value;
    elements.push({ type: type, w: 120, h: 120, x: 20, y: 20, floor: currentFloor, locked: false, dir: type === 'staircase' ? 'up' : null });
    if(typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas();
}

function deleteElement(idx) {
    if(typeof saveState === 'function') saveState(); 
    if(confirm('Are you sure you want to delete this room?')) { 
        elements.splice(idx, 1); 
        fixtures = fixtures.filter(f => f.roomId !== idx);
        fixtures.forEach(f => { if (f.roomId > idx) f.roomId--; });
        selectedElIndex = (selectedElIndex === idx) ? -1 : (selectedElIndex > idx ? selectedElIndex - 1 : selectedElIndex);
        if(typeof renderSidebar === 'function') renderSidebar(); 
        updateCanvas(); 
    }
}

function cloneElement(idx) {
    const clone = JSON.parse(JSON.stringify(elements[idx]));
    clone.x += 20; clone.y += 20; elements.push(clone);
    if(typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas();
}

function rotateElement(idx) {
    if(typeof saveState === 'function') saveState();
    const el = elements[idx]; const tempW = el.w; el.w = el.h; el.h = tempW;
    if(typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas();
}

function addFixture(type) {
    if (selectedElIndex === -1) { alert("Please click on a room first to select it!"); return; }
    fixtures.push({ type: type, roomId: selectedElIndex, edge: 'bottom', offset: 36, size: 36 });
    updateCanvas();
}

function addDoor(roomId) { fixtures.push({ type: 'door', roomId: roomId, size: 30, offset: 0, edge: 'bottom' }); if(typeof renderSidebar === 'function') renderSidebar(); updateCanvas(); }
function addWindow(roomId) { fixtures.push({ type: 'window', roomId: roomId, size: 15, offset: 15, edge: 'bottom' }); if(typeof renderSidebar === 'function') renderSidebar(); updateCanvas(); }

function rotateStaircase(index) {
    const el = elements[index];
    if (el.type !== 'staircase') return;
    const directions = ['up', 'right', 'down', 'left'];
    const newDirection = directions[(directions.indexOf(el.dir || 'up') + 1) % 4];
    elements.forEach(room => { if (room.type === 'staircase') room.dir = newDirection; });
    if(typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas();
}

// --- FLOOR MANAGEMENT ---
function setFloor(f) {
    currentFloor = f;
    if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
    if (typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas();
}

function addManualFloor() {
    const maxFloor = document.querySelectorAll('.floor-btn').length - 1;
    const newFloorNum = maxFloor + 1;
    
    // Copy staircases up to the new floor automatically
    elements.filter(e => e.type === 'staircase' && e.floor === maxFloor).forEach(stair => {
        const clone = JSON.parse(JSON.stringify(stair));
        clone.floor = newFloorNum; elements.push(clone);
    });
    
    if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
    setFloor(newFloorNum);
}

function cloneEntireFloor() {
    const currentElements = elements.filter(e => e.floor === currentFloor);
    if (currentElements.length === 0) return alert("Nothing to clone!");
    if (!confirm("Clone this entire floor to the next level?")) return;
    
    const nextFloor = currentFloor + 1;
    const newRoomStartIndex = elements.length;
    
    currentElements.forEach(room => {
        const clone = JSON.parse(JSON.stringify(room)); 
        clone.floor = nextFloor; elements.push(clone);
    });
    
    fixtures.forEach(fix => {
        const room = elements[fix.roomId];
        if (room && room.floor === currentFloor) {
            const cloneFix = JSON.parse(JSON.stringify(fix));
            cloneFix.roomId = newRoomStartIndex + currentElements.indexOf(room);
            fixtures.push(cloneFix);
        }
    });
    
    if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
    setFloor(nextFloor);
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
    
    // --- SAFE TABS CLEARING ---
    const tabsContainer = document.getElementById('top-floor-tabs');
    if (tabsContainer) tabsContainer.innerHTML = '';
    
    for(let i = 0; i < floorCount; i++) {
        let label = i === 0 ? "G" : i === 1 ? "1st" : i === 2 ? "2nd" : `${i}th`;
        if (tabsContainer) tabsContainer.innerHTML += `<button class="floor-btn" data-floor="${i}" onclick="setFloor(${i})">${label}</button>`;
        
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
                locked: false,
                dir: 'up' 
            });
        }
    }
    setFloor(0); 
}

function renderAutoDimensions() {
    const showDims = UI.showDims ? UI.showDims.checked : false;
    let dimGroup = document.getElementById('dim-group');
    
    if (!dimGroup) {
        dimGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        dimGroup.id = 'dim-group';
        UI.blueprint.appendChild(dimGroup);
    }
    dimGroup.innerHTML = ''; 

    if (!showDims) return;

    const SCALE = parseFloat(UI.scaleInput.value) || 1.2;
    const inW = toInches(UI.inW.value, UI.unitSelect.value) * SCALE;
    const inH = toInches(UI.inH.value, UI.unitSelect.value) * SCALE;
    const I = { x: 500 - (inW/2), y: 500 - (inH/2) };

    elements.forEach((el, i) => {
        if (el.floor !== currentFloor) return;

        const rx = I.x + (el.x * SCALE);
        const ry = I.y + (el.y * SCALE);
        const w = el.w * SCALE;
        const h = el.h * SCALE;

        // 1. WIDTH DIMENSION (Top)
        const lineTop = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineTop.setAttribute('x1', rx); lineTop.setAttribute('y1', ry - 10);
        lineTop.setAttribute('x2', rx + w); lineTop.setAttribute('y2', ry - 10);
        lineTop.setAttribute('stroke', '#38bdf8'); lineTop.setAttribute('stroke-width', '1');
        dimGroup.appendChild(lineTop);

        const textWidth = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textWidth.setAttribute('x', rx + w/2); textWidth.setAttribute('y', ry - 15);
        textWidth.setAttribute('fill', '#38bdf8'); textWidth.setAttribute('font-size', '10');
        textWidth.setAttribute('text-anchor', 'middle');
        textWidth.textContent = `${Math.floor(el.w/12)}'${Math.round(el.w%12)}"`;
        dimGroup.appendChild(textWidth);

        // 2. HEIGHT DIMENSION (Left)
        const lineLeft = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineLeft.setAttribute('x1', rx - 10); lineLeft.setAttribute('y1', ry);
        lineLeft.setAttribute('x2', rx - 10); lineLeft.setAttribute('y2', ry + h);
        lineLeft.setAttribute('stroke', '#38bdf8'); lineLeft.setAttribute('stroke-width', '1');
        dimGroup.appendChild(lineLeft);

        const textHeight = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textHeight.setAttribute('x', rx - 15); textHeight.setAttribute('y', ry + h/2);
        textHeight.setAttribute('fill', '#38bdf8'); textHeight.setAttribute('font-size', '10');
        textHeight.setAttribute('text-anchor', 'end'); // Align to the left
        textHeight.setAttribute('alignment-baseline', 'middle'); // Vertically center
        textHeight.textContent = `${Math.floor(el.h/12)}'${Math.round(el.h%12)}"`;
        dimGroup.appendChild(textHeight);
    });
}


// --- SPACEBAR PANNING LISTENERS ---
// --- ARROW KEY NUDGING ---
document.addEventListener('keydown', (e) => {
    // Ignore if typing in an input, or if 3D mode is active, or if nothing is selected
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
    if (typeof is3DMode !== 'undefined' && is3DMode) return;
    if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) return;

    const el = elements[selectedElIndex];
    if (el.locked) return;

    const step = e.shiftKey ? 12 : 1; // Shift moves 1 foot, normal moves 1 inch
    let moved = false;

    if (e.key === 'ArrowUp') { el.y -= step; moved = true; }
    if (e.key === 'ArrowDown') { el.y += step; moved = true; }
    if (e.key === 'ArrowLeft') { el.x -= step; moved = true; }
    if (e.key === 'ArrowRight') { el.x += step; moved = true; }

    if (moved) {
        e.preventDefault(); // Stop the webpage from scrolling
        updateCanvas();
        if(typeof renderSidebar === 'function') renderSidebar();
    }
});

document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;
    if (e.code === 'Space') { e.preventDefault(); UI.isSpacePanMode = true; if(UI.blueprint) UI.blueprint.style.cursor = 'grab'; }
});
document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') { UI.isSpacePanMode = false; UI.isSpacePanning = false; if(UI.blueprint) UI.blueprint.style.cursor = ''; }
});

// --- BOOTSTRAP INITIALIZATION ---
if (typeof initDOMCache === 'function') {
    initDOMCache();
    initInteractions(); // <--- ADD THIS LINE TO ACTIVATE THE MOUSE
    if(typeof loadFromMemory === 'function') loadFromMemory();
    if(typeof renderFloorSelectors === 'function') renderFloorSelectors(); 
    updateCanvas();
}