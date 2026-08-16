// =========================================
// 🎨 CANVAS & 3D CONTROLS ENGINE
// Manages the state and rendering logic for workspace toggles
// =========================================

const CanvasControlsEngine = {
    // Centralized State
    state: {
        showOffsetsToggle: false,
        showLabelsToggle: true,
        smartMergeToggle: false,
        gridSnapToggle: true,
        showColsToggle: false,
        showDims: false,
        real3DToggle: false
    },

    init: function() {
        // Sync initial state from the DOM on load
        Object.keys(this.state).forEach(key => {
            const el = document.getElementById(key);
            if (el) this.state[key] = el.checked;
        });
    },

    // 🌟 Master Action Toggle
    toggle: function(id, isChecked) {
        if (this.state.hasOwnProperty(id)) {
            this.state[id] = isChecked;
            
            // Execute side effects based on the toggle
            if (id === 'real3DToggle') {
                if (typeof generate3DModel === 'function') generate3DModel();
            } else if (id !== 'gridSnapToggle') {
                // gridSnapToggle only affects dragging, doesn't need an instant canvas repaint
                if (typeof updateCanvas === 'function') updateCanvas();
            }
        }
    },

    // 🌟 High-Performance Getters for the Rendering Engines
    showOffsets: () => CanvasControlsEngine.state.showOffsetsToggle,
    showLabels: () => CanvasControlsEngine.state.showLabelsToggle,
    isSmartMerge: () => CanvasControlsEngine.state.smartMergeToggle,
    isGridSnap: () => CanvasControlsEngine.state.gridSnapToggle,
    showCols: () => CanvasControlsEngine.state.showColsToggle,
    showDims: () => CanvasControlsEngine.state.showDims,
    isReal3D: () => CanvasControlsEngine.state.real3DToggle,

    // =========================================
    // 🧱 EXTRACTED RENDER LOGIC (OVERLAYS)
    // =========================================
    
    renderSiteOffsets: function(geom) {
        const siteOffsetsLayer = UI.siteOffsets || document.getElementById('site-offsets');
        if (!siteOffsetsLayer) return;

        if (!this.showOffsets()) { 
            siteOffsetsLayer.style.display = 'none'; 
            return; 
        } 
        siteOffsetsLayer.style.display = ''; 

        const { SCALE, I, J, K, L, A, B, C, D } = geom;
        const unit = UI.unitSelect ? UI.unitSelect.value : 'in';
        const val = (id) => toInches(document.getElementById(id)?.value || 0, unit) * SCALE;
        let displayIdx = 0;
        
        const addDim = (x1, y1, x2, y2, v, label, isVert) => {
            if (v <= 0) return;
            const cx = (x1 + x2) / 2; const cy = (y1 + y2) / 2;
            const ft = Math.floor(v / 12); const inch = Math.round(v % 12);
            const text = ft > 0 ? `${ft}'${inch}"` : `${inch}"`;
            
            const line = getOrCreateSVG('line', `offset-line-${displayIdx}`, siteOffsetsLayer);
            line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', x2); line.setAttribute('y2', y2);
            line.setAttribute('stroke', '#10b981'); line.setAttribute('stroke-width', '1.5'); line.setAttribute('stroke-dasharray', '3,3');

            const c1 = getOrCreateSVG('circle', `offset-c1-${displayIdx}`, siteOffsetsLayer);
            c1.setAttribute('cx', x1); c1.setAttribute('cy', y1); c1.setAttribute('r', '2'); c1.setAttribute('fill', '#10b981');

            const c2 = getOrCreateSVG('circle', `offset-c2-${displayIdx}`, siteOffsetsLayer);
            c2.setAttribute('cx', x2); c2.setAttribute('cy', y2); c2.setAttribute('r', '2'); c2.setAttribute('fill', '#10b981');

            const txt = getOrCreateSVG('text', `offset-txt-${displayIdx}`, siteOffsetsLayer);
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
    },

    renderColumns: function(geom) {
        const colContainer = document.getElementById('column-container');
        if (!this.showCols()) {
            if (colContainer) colContainer.innerHTML = '';
            return;
        }

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
    },

    renderAutoDimensions: function() {
        let dimGroup = getOrCreateSVG('g', 'dim-group', UI.blueprint);
        if (!this.showDims()) { 
            dimGroup.style.display = 'none'; 
            return; 
        }
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
};

// Expose global hook for the HTML triggers
window.CanvasControlsEngine = CanvasControlsEngine;

// Auto-Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    CanvasControlsEngine.init();
});