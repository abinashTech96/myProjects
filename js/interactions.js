// =================================================================
// INTERACTIONS ENGINE (interactions.js)
// Handles Mouse, Touch, Keyboard, and Canvas Dragging
// =================================================================

let cachedSnapBoundaries = [];
let isDragging = false, dragElIndex = -1; 
let isDraggingFixture = false, dragFixtureIndex = -1;
let hasDragged = false, startMousePos, startElPos, animationFrameId = null;
let isMeasuringMode = false, measureStart = null, tempMeasureLine = null, measureGroup = null;

// -----------------------------------------
// DRAGGING LOGIC
// -----------------------------------------
function startDrag(evt, index) {
    if (UI.isSpacePanMode || evt.button === 1 || evt.shiftKey) return; 
    selectedElIndex = index;
    if(typeof renderSidebar === 'function') renderSidebar();
    updateCanvas(); 
    if (elements[index].locked) return; 
    
    isDragging = true; dragElIndex = index; hasDragged = false; 
    startMousePos = getMousePos(evt);
    startElPos = { x: elements[index].x, y: elements[index].y };

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

            cachedSnapBoundaries.forEach((boundary, i) => {
                if (!boundary) return; 

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
            let snapRes = 12; 
            if (window.CanvasState.zoomLvl > 2.5) snapRes = 1;      
            else if (window.CanvasState.zoomLvl > 1.2) snapRes = 6; 

            if (!snappedX) newX = isStrictSnap ? Math.round(newX / snapRes) * snapRes : Math.round(newX);
            if (!snappedY) newY = isStrictSnap ? Math.round(newY / snapRes) * snapRes : Math.round(newY);

            newX = Math.max(0, Math.min(newX, inW - el.w));
            newY = Math.max(0, Math.min(newY, inH - el.h));

            el.x = newX; el.y = newY;
            if (el.type === 'staircase') syncStaircases(dragElIndex);
            if (typeof applySmartSnap === 'function') applySmartSnap(el, dragElIndex);
            
            if (typeof fastUpdateDrag === 'function') {
                fastUpdateDrag(dragElIndex);
            } else {
                updateCanvas(); 
            }
            
            if (typeof update3DTransforms === 'function') update3DTransforms();

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

            const draggedBounds = {
                dLeft: el.x, dRight: el.x + el.w, dCenter: el.x + (el.w / 2),
                dTop: el.y, dBottom: el.y + el.h, dMiddle: el.y + (el.h / 2)
            };
            if (typeof renderDynamicDistances === 'function') renderDynamicDistances(guideLayer, SCALE, Ix, Iy, draggedBounds);

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
    window.CanvasState.snapLines = [];
    updateCanvas(true);
    if (typeof requestBackgroundMath === 'function') requestBackgroundMath();
};

// -----------------------------------------
// EVENT LISTENERS & HOTKEYS
// -----------------------------------------
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
            const currentDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const factor = currentDist / initialPinchDist;
            const pseudoEvent = { clientX: (e.touches[0].clientX + e.touches[1].clientX) / 2, clientY: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
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
        window.CanvasState.snapLines = [];
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
            initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            return;
        }
        if (e.touches.length === 1 && e.target.id.startsWith('rect-')) {
            const index = parseInt(e.target.id.split('-')[1]);
            startDrag({ button: 0, shiftKey: false, clientX: e.touches[0].clientX, clientY: e.touches[0].clientY }, index);
        }
    }, {passive: false});
    UI.blueprint.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'copy';
    });
    UI.blueprint.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        if (!type || !ARCH_CONFIG.DEFAULTS.FURNITURE[type]) return;
        if (typeof saveState === 'function') saveState();

        const pos = getMousePos(e); 
        const w = ARCH_CONFIG.DEFAULTS.FURNITURE[type].w;
        const h = ARCH_CONFIG.DEFAULTS.FURNITURE[type].h;

        const SCALE = parseFloat(UI.scaleInput.value) || 1.2;
        const unit = UI.unitSelect.value;
        const inW = toInches(UI.inW.value, unit) * SCALE;
        const inH = toInches(UI.inH.value, unit) * SCALE;
        const I = { x: 500 - (inW/2), y: 500 - (inH/2) };
        
        const elementX = (pos.x - I.x) / SCALE;
        const elementY = (pos.y - I.y) / SCALE;

        const plotWInches = toInches(UI.inW.value, unit);
        const plotHInches = toInches(UI.inH.value, unit);

        let safeX = elementX - (w / 2);
        let safeY = elementY - (h / 2);

        safeX = Math.max(0, Math.min(safeX, plotWInches - w));
        safeY = Math.max(0, Math.min(safeY, plotHInches - h));

        elements.push({ type: type, w: w, h: h, x: elementX - (w / 2), y: elementY - (h / 2), floor: currentFloor, locked: false, isFurniture: true });
        selectedElIndex = elements.length - 1;
        if (typeof renderSidebar === 'function') renderSidebar(); 
        updateCanvas();
    });
    UI.blueprint.addEventListener('wheel', (e) => {
        e.preventDefault(); 
        const factor = e.deltaY < 0 ? 1.1 : 0.9; 
        zoomCamera(factor, e);
    }, { passive: false });
}

// Global Keyboard Bindings (Nudge, Hotkeys, Tool Toggles)
document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    if (e.code === 'Space') { e.preventDefault(); UI.isSpacePanMode = true; if(UI.blueprint) UI.blueprint.style.cursor = 'grab'; return; }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) { if(typeof redoAction === 'function') redoAction(); }
        else { if(typeof undoAction === 'function') undoAction(); }
        return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if(typeof redoAction === 'function') redoAction();
        return;
    }

    if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) return;
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); if(typeof cloneElement === 'function') cloneElement(selectedElIndex); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        elements[selectedElIndex].locked = !elements[selectedElIndex].locked;
        if(typeof renderSidebar === 'function') renderSidebar();
        return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if(typeof deleteElement === 'function') deleteElement(selectedElIndex);
        return;
    }

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

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') { UI.isSpacePanMode = false; UI.isSpacePanning = false; if(UI.blueprint) UI.blueprint.style.cursor = ''; }
});

// -----------------------------------------
// ACTION UTILITIES
// -----------------------------------------
function centerOnSelection() {
    if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) return;
    const el = elements[selectedElIndex];
    if (!el || el.locked) return;
    const { SCALE, I } = Utils.getMetrics(); 
    const roomCenterX = I.x + (el.x * SCALE) + ((el.w * SCALE) / 2);
    const roomCenterY = I.y + (el.y * SCALE) + ((el.h * SCALE) / 2);
    window.CanvasState.panX = 500 - (roomCenterX * window.CanvasState.zoomLvl);
    window.CanvasState.panY = 500 - (roomCenterY * window.CanvasState.zoomLvl);
    updateViewport();
}

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
            el.x = source.x; el.y = source.y; el.w = source.w; el.h = source.h; el.dir = source.dir;
        }
    });
}

function syncStaircasesIfNeeded() {
    if (typeof selectedElIndex !== 'undefined' && selectedElIndex !== -1) {
        const activeRoom = elements[selectedElIndex];
        if (activeRoom && activeRoom.type === 'staircase') syncStaircases(selectedElIndex);
    }
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

function setFloor(f) {
    currentFloor = f;
    selectedElIndex = -1;
    if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
    if (typeof renderSidebar === 'function') renderSidebar(); 
    updateCanvas();
}