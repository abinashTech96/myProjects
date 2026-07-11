// =========================================
// STATE & DATA MANAGEMENT (state.js)
// =========================================

// =========================================
// MODULAR PROJECT STATE (state.js)
// =========================================

const ProjectState = {
    
    // -----------------------------------------
    // 1. DATA STORE (Single Source of Truth)
    // -----------------------------------------
    data: {
        elements: [],
        fixtures: [],
        currentFloor: 0,
        globalCompassDir: 'West',
        selectedElIndex: -1
    },

    // -----------------------------------------
    // 2. HISTORY STORE
    // -----------------------------------------
    history: {
        stack: [],
        redoStack: [],
        clipboard: null,
        MAX_HISTORY: 30 // Increased for the Time Machine UI
    },

    // -----------------------------------------
    // 3. TIME MACHINE & HISTORY ACTIONS
    // -----------------------------------------
    saveState(actionName = "Action Executed") {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newStateStr = JSON.stringify({ elements: this.data.elements, fixtures: this.data.fixtures });
        
        const hist = this.history.stack;
        
        // Prevent duplicate consecutive saves
        if (hist.length > 0 && hist[hist.length - 1].state === newStateStr) return;
        
        // Push object instead of string
        hist.push({ action: actionName, time: timeStr, state: newStateStr });
        this.history.redoStack = []; // Clear redo stack on new action
        
        if (hist.length > this.history.MAX_HISTORY) hist.shift();
        
        // Trigger UI Update
        if (typeof renderTimeMachine === 'function') renderTimeMachine();
    },

    undo() {
        if (this.history.stack.length > 0) {
            // Save current state to redo stack
            const currentStateStr = JSON.stringify({ elements: this.data.elements, fixtures: this.data.fixtures });
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            this.history.redoStack.push({ action: "Undo", time: timeStr, state: currentStateStr });
            
            // Pop previous state and apply
            const previous = this.history.stack.pop();
            const parsedState = JSON.parse(previous.state);
            this.data.elements = parsedState.elements; 
            this.data.fixtures = parsedState.fixtures;

            this._syncGlobals();
            if (typeof renderTimeMachine === 'function') renderTimeMachine();
            return true;
        }
        return false;
    },

    redo() {
        if (this.history.redoStack.length > 0) {
            // Save current state to undo stack
            const currentStateStr = JSON.stringify({ elements: this.data.elements, fixtures: this.data.fixtures });
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            this.history.stack.push({ action: "Redo", time: timeStr, state: currentStateStr });
            
            // Pop next state and apply
            const next = this.history.redoStack.pop();
            const parsedState = JSON.parse(next.state);
            this.data.elements = parsedState.elements; 
            this.data.fixtures = parsedState.fixtures;

            this._syncGlobals();
            if (typeof renderTimeMachine === 'function') renderTimeMachine();
            return true;
        }
        return false;
    },

    jumpToTime(index) {
        if (index < 0 || index >= this.history.stack.length) return;
        
        this.history.redoStack = []; 
        const targetState = JSON.parse(this.history.stack[index].state);
        
        // Truncate history timeline up to the selected point
        this.history.stack = this.history.stack.slice(0, index + 1);
        
        this.data.elements = targetState.elements;
        this.data.fixtures = targetState.fixtures;
        
        this._syncGlobals();
        if (typeof renderTimeMachine === 'function') renderTimeMachine();
        
        // Force rendering updates
        if (typeof updateCanvas === 'function') updateCanvas();
        if (typeof renderSidebar === 'function') renderSidebar();
        if (typeof is3DMode !== 'undefined' && is3DMode && typeof generate3DModel === 'function') generate3DModel();
    },

    // -----------------------------------------
    // 4. ELEMENT MANAGEMENT ACTIONS
    // -----------------------------------------
    deleteElement(idx) {
        // Intelligently name the action based on what is being deleted
        const el = this.data.elements[idx];
        const elName = el ? (el.customName || el.type.toUpperCase()) : "Element";
        this.saveState(`Deleted ${elName}`);
        
        this.data.elements.splice(idx, 1); 
        this.data.fixtures = this.data.fixtures.filter(f => f.roomId !== idx);
        this.data.fixtures.forEach(f => { if (f.roomId > idx) f.roomId--; });
        
        if (this.data.selectedElIndex === idx) {
            this.data.selectedElIndex = -1;
        } else if (this.data.selectedElIndex > idx) {
            this.data.selectedElIndex--;
        }

        this._syncGlobals();
    },

    // -----------------------------------------
    // 5. INTERNAL HELPERS
    // -----------------------------------------
    _syncGlobals() {
        // Safely updates the global variables used by the rest of the app without breaking references
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

// 🌉 THE BULLETPROOF COMPATIBILITY BRIDGE
// This goes right below the ProjectState object.
// It intercepts any time your older files try to read or write to these global variables.
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

// =========================================
// LOCAL STORAGE & EXPORT LOGIC
// =========================================

function saveToMemory() {
    const data = {
        elements: elements, fixtures: fixtures,
        inW: document.getElementById('inW').value,
        inH: document.getElementById('inH').value,
        floors: document.getElementById('b-floors').value
    };
    localStorage.setItem('ArchCAD_AutoSave', JSON.stringify(data));
}

function loadFromMemory() {
    const saved = localStorage.getItem('ArchCAD_AutoSave');
    
    if (saved) {
        // 1. Prompt the user
        const wantsToRestore = confirm("💾 A previous session was found in your browser memory.\n\nWould you like to restore your last design?\n(Click 'Cancel' to permanently delete it and start fresh).");
        
        // 2. USER CLICKS 'OK' -> Restore Project
        if (wantsToRestore) {
            try {
                const data = JSON.parse(saved);
                if (data.elements && data.elements.length > 0) {
                    elements = data.elements;
                    fixtures = data.fixtures || [];
                    
                    if (data.inW && document.getElementById('inW')) document.getElementById('inW').value = data.inW;
                    if (data.inH && document.getElementById('inH')) document.getElementById('inH').value = data.inH;
                    
                    let maxFloor = 0;
                    elements.forEach(el => { if (el.floor > maxFloor) maxFloor = el.floor; });
                    if (document.getElementById('b-floors')) document.getElementById('b-floors').value = maxFloor + 1;
                    
                    console.log("✅ Previous session restored.");
                    
                    // SMART LOGIC: They loaded a project, so permanently skip the tour!
                    localStorage.setItem('ArchCAD_TourDone', 'true');
                    
                    // 🌟 THE FIX: Force the UI and Canvas to physically re-draw the loaded data!
                    if (typeof setFloor === 'function') setFloor(currentFloor || 0);
                    if (typeof renderSidebar === 'function') renderSidebar();
                    if (typeof updateCanvas === 'function') updateCanvas(false); 
                }
            } catch (e) { 
                console.error("Auto-save load failed.", e); 
            }
        } 
        // 3. USER CLICKS 'CANCEL' -> Nuke Memory
        else {
            localStorage.removeItem('ArchCAD_AutoSave');
            
            // SMART LOGIC: We clear the Tour memory, so it plays for them!
            localStorage.removeItem('ArchCAD_TourDone');
            
            console.log("🗑️ Previous session cleared. Starting fresh.");
        }
    }

    // 4. Trigger Onboarding (Will safely ignore users who clicked 'OK')
    if (typeof Onboarding !== 'undefined') {
        Onboarding.init();
    }
}


function exportJSON() {
    const projectData = {
        version: "1.1",
        timestamp: new Date().toISOString(),
        floorCount: parseInt(document.getElementById('b-floors').value) || 1,
        elements: elements,
        fixtures: fixtures,
        plot: {
            inW: document.getElementById('inW').value,
            inH: document.getElementById('inH').value,
            aL: document.getElementById('aL').value,
            aU: document.getElementById('aU').value,
            bR: document.getElementById('bR').value,
            bU: document.getElementById('bU').value,
            cR: document.getElementById('cR').value,
            cD: document.getElementById('cD').value,
            dL: document.getElementById('dL').value,
            dD: document.getElementById('dD').value,
            roadSide: document.getElementById('roadSide').value
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
            if (!importedData.elements || !importedData.fixtures) return alert("Invalid project file.");

            elements = importedData.elements;
            fixtures = importedData.fixtures;
            
            const importedFloors = importedData.floorCount || importedData.floors || 1;
            const bFloors = document.getElementById('b-floors');
            if (bFloors) bFloors.value = importedFloors;

            if (importedData.plot) {
                const p = importedData.plot;
                const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val; };
                // 🌟 REFACTORED: Use AI_CONFIG
                setVal('inW', p.inW || AI_CONFIG.DEFAULT_PLOT_W); 
                setVal('inH', p.inH || AI_CONFIG.DEFAULT_PLOT_H);
                setVal('aL', p.aL || 26); setVal('aU', p.aU || 28);
                setVal('bR', p.bR || 75); setVal('bU', p.bU || 35);
                setVal('cR', p.cR || 22); setVal('cD', p.cD || 33);
                setVal('dL', p.dL || 51); setVal('dD', p.dD || 41);
                setVal('roadSide', p.roadSide || 'none');
            }

            if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
            
            setFloor(0);
            selectedElIndex = -1;
            
            if (typeof renderSidebar === 'function') renderSidebar();
            updateCanvas(false);
            
            document.getElementById('importFile').value = ''; 
            alert("✅ Project loaded successfully!");
            
        } catch (error) {
            alert("Error parsing the project file: " + error.message);
        }
    };
    reader.readAsText(file);
}

function resetWorkspace() {
    if (confirm("⚠️ WARNING: This will completely erase your building and clear your saved memory.\n\nAre you sure you want to reset?")) {
        elements = []; fixtures = []; currentFloor = 0;
        // 🌟 REFACTORED: Use AI_CONFIG
        document.getElementById('inW').value = AI_CONFIG.DEFAULT_PLOT_W;
        document.getElementById('inH').value = AI_CONFIG.DEFAULT_PLOT_H;
        const bFloorsInput = document.getElementById('b-floors');
        if (bFloorsInput) bFloorsInput.value = 1;
        
        localStorage.removeItem('ArchCAD_AutoSave');
        
        if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
        if (typeof setFloor === 'function') setFloor(0);
        if (typeof is3DMode !== 'undefined' && is3DMode) toggle3D();
        if (typeof updateCanvas === 'function') updateCanvas();
    }
}

// --- STANDALONE UNDO/REDO FUNCTIONS FOR UI BUTTONS ---
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