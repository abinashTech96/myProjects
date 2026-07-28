// =========================================
// TOOLBAR & ROOM ACTIONS (actions.js)
// =========================================
function addElement(overrideType = null) {
    const type = overrideType || document.getElementById('elem-type').value;
    if (type === 'door' || type === 'window') {
        if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) {
            return alert("Please click on a room first to select it before adding a door or window!");
        }
        addFixture(type);
        return;
    }
    if(typeof saveState === 'function') saveState();
    let w = ARCH_CONFIG.DEFAULTS.ROOM_W, h = ARCH_CONFIG.DEFAULTS.ROOM_H, isFurniture = false;
    if (ARCH_CONFIG && ARCH_CONFIG.DEFAULTS.FURNITURE[type]) {
        w = ARCH_CONFIG.DEFAULTS.FURNITURE[type].w;
        h = ARCH_CONFIG.DEFAULTS.FURNITURE[type].h;
        isFurniture = true;
    }
    elements.push({ 
        type: type, w: w, h: h,
        x: ARCH_CONFIG.DEFAULTS.SPAWN_X,
        y: ARCH_CONFIG.DEFAULTS.SPAWN_Y,
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
        offset: ARCH_CONFIG.DEFAULTS.FIXTURE_OFFSET,
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
    const container1 = ['plot', 'floors'];
    const container2 = ['workspace', 'interiors'];
    const activeContainer = container1.includes(panelName) ? container1 : container2;
    const targetContent = document.getElementById(`content-${panelName}`);
    if (!targetContent) return;
    const isAlreadyActive = targetContent.classList.contains('active');
    activeContainer.forEach(name => {
        const btn = document.getElementById(`btn-${name}`);
        const content = document.getElementById(`content-${name}`);
        if (btn) btn.classList.remove('active');
        if (content) content.classList.remove('active');
    });
    if (!isAlreadyActive) {
        const btn = document.getElementById(`btn-${panelName}`);
        const content = document.getElementById(`content-${panelName}`);
        if (btn) btn.classList.add('active');
        if (content) content.classList.add('active');
    }
}