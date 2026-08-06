// =========================================
// 🚀 TOOLBAR & WORKSPACE ACTIONS (actions.js) 
// Modular Architecture powered by Event Bus & State Manager
// =========================================

// -----------------------------------------
// 1. ROOM & ELEMENT ACTIONS
// -----------------------------------------
const ElementActions = {
    add: function(overrideType = null) {
        const type = overrideType || document.getElementById('elem-type').value;
        
        if (type === 'door' || type === 'window') {
            if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) {
                return alert("Please click on a room first to select it before adding a door or window!");
            }
            FixtureActions.add(type);
            return;
        }
        
        ProjectState.commit(`Added ${type}`, () => {
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
        });
    },

    delete: function(idx) {
        ProjectState.deleteElement(idx); // ProjectState handles its own commit
        AppEvents.triggerStateChange(); 
    },

    clone: function(idx) {
        ProjectState.commit('Cloned Element', () => {
            const clone = structuredClone(elements[idx]);
            clone.x += ARCH_CONFIG.DEFAULTS.CLONE_OFFSET; 
            clone.y += ARCH_CONFIG.DEFAULTS.CLONE_OFFSET;
            elements.push(clone);
        });
    },

    rotate: function(idx) {
        ProjectState.commit('Rotated Room', () => {
            const el = elements[idx]; 
            const tempW = el.w; 
            el.w = el.h; 
            el.h = tempW;
            
            // Ensure any attached doors/windows don't float outside the new dimensions
            if (typeof fixtures !== 'undefined') {
                fixtures.filter(f => f.roomId === idx).forEach(fix => {
                    const limit = (fix.edge === 'bottom' || fix.edge === 'top') ? el.w : el.h;
                    fix.offset = Math.max(0, Math.min(fix.offset, limit - fix.size));
                });
            }
        });
        
        // Explicitly force the 2D canvas and Sidebar to repaint instantly
        if (typeof updateCanvas === 'function') updateCanvas();
        if (typeof renderSidebar === 'function') renderSidebar();
    }
};

// -----------------------------------------
// 2. FIXTURE ACTIONS (Doors & Windows)
// -----------------------------------------
const FixtureActions = {
    add: function(type) {
        if (typeof selectedElIndex === 'undefined' || selectedElIndex === -1) return alert("Please click on a room first to select it!");
        if (elements[selectedElIndex].isFurniture) return alert("Cannot add doors or windows to furniture.");
        
        ProjectState.commit(`Added ${type}`, () => {
            fixtures.push({ 
                type: type, 
                roomId: selectedElIndex, 
                edge: 'bottom', 
                offset: ARCH_CONFIG.DEFAULTS.FIXTURE_OFFSET,
                size: type === 'door' ? (ARCH_CONFIG?.DEFAULTS?.DOOR_SIZE || 30) : (ARCH_CONFIG?.DEFAULTS?.WINDOW_SIZE || 15)
            });
        });
    },

    // ✨ NEW: Route deletion through the State Manager
    delete: function(idx) {
        ProjectState.commit(`Deleted Fixture`, () => {
            fixtures.splice(idx, 1);
        });
        if (typeof renderSidebar === 'function') renderSidebar();
        if (typeof updateCanvas === 'function') updateCanvas();
    }
};

// -----------------------------------------
// 3. STAIRCASE ACTIONS
// -----------------------------------------
const StaircaseActions = {
    rotate: function(index) {
        const el = elements[index];
        if (el.type !== 'staircase') return;
        
        ProjectState.commit('Rotated Staircase', () => {
            const directions = ['up', 'right', 'down', 'left'];
            el.dir = directions[(directions.indexOf(el.dir || 'up') + 1) % 4];
        });
    },

    sync: function(sourceIndex) {
        const source = elements[sourceIndex];
        if (!source || source.type !== 'staircase') return;
        elements.forEach((el, index) => {
            if (el.type === 'staircase' && index !== sourceIndex) {
                el.x = source.x; el.y = source.y; el.w = source.w; el.h = source.h; el.dir = source.dir;
            }
        });
    }
};

// -----------------------------------------
// 4. FLOOR & BUILDING ACTIONS
// -----------------------------------------
const FloorActions = {
    set: function(f) {
        currentFloor = f;
        selectedElIndex = -1;
        if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
        AppEvents.triggerStateChange();
    },

    addManual: function() {
        ProjectState.commit('Added Floor', () => {
            const bFloorsInput = document.getElementById('b-floors');
            let currentCount = parseInt(bFloorsInput.value) || 1;
            const newFloorNum = currentCount; 
            bFloorsInput.value = currentCount + 1; 

            const existingStairs = elements.filter(e => e.type === 'staircase' && e.floor === newFloorNum - 1);
            
            if (existingStairs.length > 0) {
                existingStairs.forEach(stair => {
                    const clone = structuredClone(stair);
                    clone.floor = newFloorNum; 
                    elements.push(clone);
                });
            } else {
                const sConf = (typeof ARCH_CONFIG !== 'undefined') ? ARCH_CONFIG.DEFAULTS.STAIRCASE : { w: 84, h: 132 };
                const spawnX = (typeof ARCH_CONFIG !== 'undefined') ? ARCH_CONFIG.DEFAULTS.SPAWN_X : 20;
                const spawnY = (typeof ARCH_CONFIG !== 'undefined') ? ARCH_CONFIG.DEFAULTS.SPAWN_Y : 20;
                
                elements.push({ type: 'staircase', w: sConf.w, h: sConf.h, x: spawnX, y: spawnY, floor: newFloorNum - 1, locked: false, dir: 'up' });
                elements.push({ type: 'staircase', w: sConf.w, h: sConf.h, x: spawnX, y: spawnY, floor: newFloorNum, locked: false, dir: 'up' });
            }
            
            currentFloor = newFloorNum;
            selectedElIndex = -1;
            if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
        });
    },

    deleteCurrent: function() {
        if (currentFloor === 0) return alert("You cannot delete the Ground Floor. Delete the individual rooms instead.");
        if (!confirm(`⚠️ Are you sure you want to completely delete the ${currentFloor === 1 ? '1st' : currentFloor + 'th'} floor and all its rooms?`)) return;
        
        ProjectState.commit('Deleted Floor', () => {
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
            
            currentFloor -= 1;
            selectedElIndex = -1;
            if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
        });
    },

    cloneEntire: function() {
        const currentElements = elements.filter(e => e.floor === currentFloor);
        if (currentElements.length === 0) return alert("Nothing to clone!");
        
        const bFloorsInput = document.getElementById('b-floors');
        let currentCount = parseInt(bFloorsInput.value) || 1;
        let targetName = currentCount === 1 ? "1st" : currentCount === 2 ? "2nd" : `${currentCount}th`;
        
        if (!confirm(`Clone this floor to a new ${targetName} Floor level?`)) return;
        
        ProjectState.commit('Cloned Entire Floor', () => {
            const targetFloor = currentCount; 
            const newRoomStartIndex = elements.length;
            bFloorsInput.value = targetFloor + 1;

            currentElements.forEach(room => {
                const clone = structuredClone(room); 
                clone.floor = targetFloor; 
                elements.push(clone);
            });
            
            const currentFixtures = fixtures.filter(f => elements[f.roomId] && elements[f.roomId].floor === currentFloor);
            currentFixtures.forEach(fix => {
                const room = elements[fix.roomId];
                const cloneFix = structuredClone(fix);
                cloneFix.roomId = newRoomStartIndex + currentElements.indexOf(room);
                fixtures.push(cloneFix);
            });
            
            currentFloor = targetFloor;
            selectedElIndex = -1;
            if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
        });
    },

    generateBuilding: function() {
        if (elements.length > 0 && !confirm("Generating a new building will clear your current rooms. Continue?")) return;
        
        let floorCount = parseInt(document.getElementById('b-floors').value);
        if (floorCount < 1 || isNaN(floorCount)) floorCount = 1;
        
        let maxReqW = 0; let maxReqH = 0;
        const sConf = ARCH_CONFIG.DEFAULTS.STAIRCASE;
        
        for (let i = 0; i < floorCount; i++) {
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
        
        ProjectState.commit('Auto-Generated Building', () => {
            elements = []; 
            fixtures = []; // Wipe old doors and windows
            
            const tabsContainer = document.getElementById('top-floor-tabs');
            if (tabsContainer) tabsContainer.innerHTML = '';
            
            for (let i = 0; i < floorCount; i++) {
                let label = i === 0 ? "G" : i === 1 ? "1st" : i === 2 ? "2nd" : `${i}th`;
                if (tabsContainer) tabsContainer.innerHTML += `<button class="floor-btn" data-floor="${i}" onclick="setFloor(${i})">${label}</button>`;
                const layoutKey = document.getElementById(`layout-f${i}`).value;
                
                if (layoutKey !== 'none' && ARCH_CONFIG.LAYOUTS && ARCH_CONFIG.LAYOUTS[layoutKey]) {
                    const layoutData = structuredClone(ARCH_CONFIG.LAYOUTS[layoutKey]);
                    layoutData.forEach(room => { 
                        room.w = Math.round(room.w * scaleFactor); room.h = Math.round(room.h * scaleFactor);
                        room.x = Math.round(room.x * scaleFactor); room.y = Math.round(room.y * scaleFactor);
                        room.floor = i; elements.push(room); 
                    });
                }
                if (floorCount > 1) {
                    elements.push({ 
                        type: 'staircase', 
                        w: Math.round(sConf.w * scaleFactor), h: Math.round(sConf.h * scaleFactor), 
                        x: Math.round(sConf.x * scaleFactor), y: Math.round(sConf.y * scaleFactor), 
                        floor: i, locked: false, dir: 'up' 
                    });
                }
            }
            currentFloor = 0;
            selectedElIndex = -1;
        });
    }
};

// =========================================
// 🌐 GLOBAL BRIDGE (HTML ONCLICK BINDINGS)
// =========================================
window.addElement = (type) => ElementActions.add(type);
window.deleteElement = (idx) => ElementActions.delete(idx);
window.cloneElement = (idx) => ElementActions.clone(idx);
window.rotateElement = (idx) => ElementActions.rotate(idx);

window.addFixture = (type) => FixtureActions.add(type);
window.addDoor = (roomId) => FixtureActions.add('door');
window.addWindow = (roomId) => FixtureActions.add('window');

window.rotateStaircase = (idx) => StaircaseActions.rotate(idx);
window.syncStaircases = (idx) => StaircaseActions.sync(idx);

window.setFloor = (f) => FloorActions.set(f);
window.addManualFloor = () => FloorActions.addManual();
window.deleteCurrentFloor = () => FloorActions.deleteCurrent();
window.cloneEntireFloor = () => FloorActions.cloneEntire();
window.generateBuilding = () => FloorActions.generateBuilding();
window.deleteFixture = (idx) => FixtureActions.delete(idx);