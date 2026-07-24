// =========================================
// ⏳ PHASE 3: DELTA STATE MANAGEMENT (state.js)
// =========================================
const ProjectState = {
    data: {
        elements: [],
        fixtures: [],
        currentFloor: 0,
        globalCompassDir: 'West',
        selectedElIndex: -1
    },
    history: {
        stack: [],       // Now stores lightweight deltas: { action, time, delta }
        redoStack: [],
        baseState: null, // A single full snapshot to build upon
        clipboard: null,
        MAX_HISTORY: 50  // Increased to 50 because deltas take virtually no RAM!
    },

    // --- DELTA ENGINE HELPERS ---
    _clone(obj) { 
        return JSON.parse(JSON.stringify(obj)); 
    },

    // Calculates the exact mathematical difference between two arrays
    _getDelta(oldState, newState) {
        const delta = { elements: { length: newState.elements.length }, fixtures: { length: newState.fixtures.length } };
        let hasChanges = false;

        const maxEl = Math.max(oldState.elements.length, newState.elements.length);
        for (let i = 0; i < maxEl; i++) {
            const oldEl = oldState.elements[i];
            const newEl = newState.elements[i];
            if (JSON.stringify(oldEl) !== JSON.stringify(newEl)) {
                delta.elements[i] = newEl ? this._clone(newEl) : null;
                hasChanges = true;
            }
        }

        const maxFix = Math.max(oldState.fixtures.length, newState.fixtures.length);
        for (let i = 0; i < maxFix; i++) {
            const oldFix = oldState.fixtures[i];
            const newFix = newState.fixtures[i];
            if (JSON.stringify(oldFix) !== JSON.stringify(newFix)) {
                delta.fixtures[i] = newFix ? this._clone(newFix) : null;
                hasChanges = true;
            }
        }

        if (oldState.elements.length !== newState.elements.length || oldState.fixtures.length !== newState.fixtures.length) {
            hasChanges = true;
        }

        return hasChanges ? delta : null;
    },

    // Applies a delta patch onto a state to reconstruct it
    _applyDelta(state, delta) {
        const newState = this._clone(state);
        if (delta.elements) {
            for (let i in delta.elements) {
                if (i === 'length') continue;
                newState.elements[i] = delta.elements[i] ? this._clone(delta.elements[i]) : null;
            }
            newState.elements.length = delta.elements.length; 
        }
        if (delta.fixtures) {
            for (let i in delta.fixtures) {
                if (i === 'length') continue;
                newState.fixtures[i] = delta.fixtures[i] ? this._clone(delta.fixtures[i]) : null;
            }
            newState.fixtures.length = delta.fixtures.length;
        }
        return newState;
    },

    // Rebuilds the house from the Base Frame + Deltas
    _buildStateFromHistory(targetIndex) {
        if (!this.history.baseState) return { elements: [], fixtures: [] };
        let state = this._clone(this.history.baseState);
        for (let i = 0; i <= targetIndex; i++) {
            state = this._applyDelta(state, this.history.stack[i].delta);
        }
        return state;
    },

    // --- PUBLIC API ---
    saveState(actionName = "Action Executed") {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const currentState = { elements: this.data.elements, fixtures: this.data.fixtures };

        // Save the very first state as our Base Frame
        if (!this.history.baseState) {
            this.history.baseState = this._clone(currentState);
            return;
        }

        const lastState = this.history.stack.length > 0
            ? this._buildStateFromHistory(this.history.stack.length - 1)
            : this.history.baseState;

        const delta = this._getDelta(lastState, currentState);

        if (!delta) return; // If user clicked but didn't change anything, don't bloat history!

        const hist = this.history.stack;
        
        // Smart Continuous Dragging Overwrite
        if (hist.length > 0 && actionName === "Moved Element" && hist[hist.length - 1].action === "Moved Element") {
            const stateBeforeMove = hist.length > 1 ? this._buildStateFromHistory(hist.length - 2) : this.history.baseState;
            const updatedDelta = this._getDelta(stateBeforeMove, currentState);
            if (updatedDelta) {
                hist[hist.length - 1].delta = updatedDelta;
                hist[hist.length - 1].time = timeStr;
            }
            if (typeof renderTimeMachine === 'function') renderTimeMachine();
            return;
        }

        hist.push({ action: actionName, time: timeStr, delta: delta });
        this.history.redoStack = [];

        // If history exceeds max, lock in the oldest delta to the base frame to save memory
        if (hist.length > this.history.MAX_HISTORY) {
            const oldestItem = hist.shift();
            this.history.baseState = this._applyDelta(this.history.baseState, oldestItem.delta);
        }

        if (typeof renderTimeMachine === 'function') renderTimeMachine();
    },

    undo() {
        if (this.history.stack.length > 0) {
            const popped = this.history.stack.pop();
            this.history.redoStack.push(popped);

            const restoredState = this.history.stack.length > 0
                ? this._buildStateFromHistory(this.history.stack.length - 1)
                : this.history.baseState;

            this.data.elements = this._clone(restoredState.elements);
            this.data.fixtures = this._clone(restoredState.fixtures);
            this._syncGlobals();
            return true;
        }
        return false;
    },

    redo() {
        if (this.history.redoStack.length > 0) {
            const item = this.history.redoStack.pop();
            this.history.stack.push(item);

            const restoredState = this._buildStateFromHistory(this.history.stack.length - 1);
            this.data.elements = this._clone(restoredState.elements);
            this.data.fixtures = this._clone(restoredState.fixtures);
            this._syncGlobals();
            return true;
        }
        return false;
    },

    jumpToTime(index) {
        if (index < 0 || index >= this.history.stack.length) return false;
        
        const toRedo = this.history.stack.splice(index + 1);
        toRedo.reverse().forEach(item => this.history.redoStack.push(item));

        const restoredState = this._buildStateFromHistory(index);
        this.data.elements = this._clone(restoredState.elements);
        this.data.fixtures = this._clone(restoredState.fixtures);
        this._syncGlobals();

        if (typeof renderSidebar === 'function') renderSidebar();
        if (typeof updateCanvas === 'function') updateCanvas(true);
        if (typeof renderTimeMachine === 'function') renderTimeMachine();

        return true;
    },
    
    deleteElement(idx) {
        const el = this.data.elements[idx];
        const elName = el ? (el.customName || el.type.toUpperCase()) : "Element";
        this.saveState(`Deleted ${elName}`);
        
        this.data.elements.splice(idx, 1);
        this.data.fixtures = this.data.fixtures.filter(f => f.roomId !== idx);
        this.data.fixtures.forEach(f => { if (f.roomId > idx) f.roomId--; });
        
        if (this.data.selectedElIndex === idx) this.data.selectedElIndex = -1;
        else if (this.data.selectedElIndex > idx) this.data.selectedElIndex--;
        
        this._syncGlobals();
    },
    
    _syncGlobals() {
        if (typeof elements !== 'undefined') {
            elements.length = 0;
            elements.push(...this.data.elements);
        }
        if (typeof fixtures !== 'undefined') {
            fixtures.length = 0;
            fixtures.push(...this.data.fixtures);
        }
    }
};

// Map to Window Scope
['elements', 'fixtures', 'currentFloor', 'globalCompassDir', 'selectedElIndex'].forEach(key => {
    Object.defineProperty(window, key, {
        get: () => ProjectState.data[key],
        set: (value) => { ProjectState.data[key] = value; }
    });
});

Object.defineProperty(window, 'clipboard', {
    get: () => ProjectState.history.clipboard,
    set: (value) => { ProjectState.history.clipboard = value; }
});

// --- SAVE / LOAD DATA (Basic Storage) ---
// =========================================
// 💾 ASYNC INDEXED-DB STORAGE ENGINE
// =========================================
const DB_NAME = 'ArchCAD_Storage';
const STORE_NAME = 'autosaves';

// Helper to open the background database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 🌟 Fire-and-forget Async Saving (Never blocks the UI!)
async function saveToMemory() {
    const data = {
        elements: elements, fixtures: fixtures,
        inW: document.getElementById('inW')?.value || 278,
        inH: document.getElementById('inH')?.value || 417,
        floors: document.getElementById('b-floors')?.value || 1
    };
    
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(data, 'latest_session');
    } catch (e) {
        console.warn("Async save failed. Falling back to LocalStorage.", e);
        localStorage.setItem('ArchCAD_AutoSave', JSON.stringify(data));
    }
}

// 🌟 Async Loading with graceful fallbacks
async function loadFromMemory() {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get('latest_session');
        
        request.onsuccess = () => {
            const data = request.result;
            // Check both new IndexedDB and old LocalStorage
            if (!data && !localStorage.getItem('ArchCAD_AutoSave')) return; 

            const wantsToRestore = confirm("💾 A previous session was found.\n\nWould you like to restore your last design?");
            if (wantsToRestore) {
                // If DB has data, use it. Otherwise, pull legacy data from LocalStorage
                const finalData = data || JSON.parse(localStorage.getItem('ArchCAD_AutoSave'));
                
                if (finalData && finalData.elements && finalData.elements.length > 0) {
                    elements = finalData.elements;
                    fixtures = finalData.fixtures || [];
                    if (finalData.inW && document.getElementById('inW')) document.getElementById('inW').value = finalData.inW;
                    if (finalData.inH && document.getElementById('inH')) document.getElementById('inH').value = finalData.inH;
                    
                    let maxFloor = 0;
                    elements.forEach(el => { if (el.floor > maxFloor) maxFloor = el.floor; });
                    if (document.getElementById('b-floors')) document.getElementById('b-floors').value = maxFloor + 1;
                    
                    if (typeof setFloor === 'function') setFloor(currentFloor || 0);
                    if (typeof renderSidebar === 'function') renderSidebar();
                    if (typeof updateCanvas === 'function') updateCanvas(false); 
                }
            } else {
                // User declined, clear both memories
                db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete('latest_session');
                localStorage.removeItem('ArchCAD_AutoSave');
            }
        };
    } catch (e) { 
        console.error("Async load failed.", e); 
    }
}

async function resetWorkspace() {
    if (confirm("⚠️ This will completely erase your building. Continue?")) {
        elements = []; fixtures = []; currentFloor = 0;
        ProjectState.history.baseState = null; 
        ProjectState.history.stack = [];
        
        if(document.getElementById('inW')) document.getElementById('inW').value = 278;
        if(document.getElementById('inH')) document.getElementById('inH').value = 417;
        if(document.getElementById('b-floors')) document.getElementById('b-floors').value = 1;
        
        // Clear both storages safely
        try {
            const db = await initDB();
            db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete('latest_session');
        } catch(e) {}
        localStorage.removeItem('ArchCAD_AutoSave');
        
        if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
        if (typeof setFloor === 'function') setFloor(0);
        if (typeof updateCanvas === 'function') updateCanvas();
        if (typeof generate3DModel === 'function') generate3DModel();
    }
}

// --- JSON EXPORT / IMPORT ---
function exportJSON() {
    const projectData = {
        version: "1.2",
        timestamp: new Date().toISOString(),
        floorCount: parseInt(document.getElementById('b-floors')?.value) || 1,
        elements: elements, fixtures: fixtures,
        plot: {
            inW: document.getElementById('inW')?.value,
            inH: document.getElementById('inH')?.value,
            aL: document.getElementById('aL')?.value, aU: document.getElementById('aU')?.value,
            bR: document.getElementById('bR')?.value, bU: document.getElementById('bU')?.value,
            cR: document.getElementById('cR')?.value, cD: document.getElementById('cD')?.value,
            dL: document.getElementById('dL')?.value, dD: document.getElementById('dD')?.value,
            roadSide: document.getElementById('roadSide')?.value
        }
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ArchCAD_Project_" + Math.floor(Date.now() / 1000) + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!importedData.elements) return alert("Invalid project file.");
            
            elements = importedData.elements;
            fixtures = importedData.fixtures || [];            
            const importedFloors = importedData.floorCount || 1;
            
            if (document.getElementById('b-floors')) document.getElementById('b-floors').value = importedFloors;
            if (importedData.plot) {
                const p = importedData.plot;
                const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val; };
                setVal('inW', p.inW); setVal('inH', p.inH);
                setVal('aL', p.aL); setVal('aU', p.aU);
                setVal('bR', p.bR); setVal('bU', p.bU);
                setVal('cR', p.cR); setVal('cD', p.cD);
                setVal('dL', p.dL); setVal('dD', p.dD);
                setVal('roadSide', p.roadSide || 'none');
            }
            if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
            setFloor(0); selectedElIndex = -1;
            if (typeof renderSidebar === 'function') renderSidebar();
            updateCanvas(false);
            
            setTimeout(() => {
                if (typeof generate3DModel === 'function') generate3DModel();
                alert("✅ Project loaded successfully!");
            }, 100);
            document.getElementById('importFile').value = ''; 
        } catch (error) { alert("Error parsing file: " + error.message); }
    };
    reader.readAsText(file);
}

function resetWorkspaceOldv2() {
    if (confirm("⚠️ This will completely erase your building. Continue?")) {
        elements = []; fixtures = []; currentFloor = 0;
        ProjectState.history.baseState = null; 
        ProjectState.history.stack = [];
        
        if(document.getElementById('inW')) document.getElementById('inW').value = 278;
        if(document.getElementById('inH')) document.getElementById('inH').value = 417;
        if(document.getElementById('b-floors')) document.getElementById('b-floors').value = 1;
        
        localStorage.removeItem('ArchCAD_AutoSave');
        
        if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
        if (typeof setFloor === 'function') setFloor(0);
        if (typeof updateCanvas === 'function') updateCanvas();
        if (typeof generate3DModel === 'function') generate3DModel();
    }
}

function undoAction() {
    ProjectState.undo();
    if (typeof renderSidebar === 'function') renderSidebar();
    if (typeof updateCanvas === 'function') updateCanvas();
}

function redoAction() {
    ProjectState.redo();
    if (typeof renderSidebar === 'function') renderSidebar();
    if (typeof updateCanvas === 'function') updateCanvas();
}