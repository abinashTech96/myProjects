// =========================================
// STATE & DATA MANAGEMENT (state.js)
// =========================================

// Global Variables
let elements = [];
let fixtures = []; 
let currentFloor = 0;
let globalCompassDir = 'West';
let historyStack = [];
let redoStack = [];
let clipboard = null;
let selectedElIndex = -1;
const MAX_HISTORY = 20;

// Centralized Dictionaries
const colors = { 
    living: '168, 85, 247', bedroom: '34, 197, 94', toilet: '129, 140, 248', 
    kitchen: '245, 158, 11', puja: '236, 72, 153', staircase: '156, 163, 175', balcony: '20, 184, 166' 
};

const colors3D = { 
    living: 0xa855f7, bedroom: 0x22c55e, toilet: 0x818cf8, 
    kitchen: 0xf59e0b, puja: 0xec4899, staircase: 0x9ca3af, balcony: 0x14b8a6 
};

const floorLayouts = {
    '1bhk': [{ type: 'living', w: 192, h: 192, x: 20, y: 20 }, { type: 'kitchen', w: 120, h: 120, x: 230, y: 20 }, { type: 'bedroom', w: 144, h: 144, x: 20, y: 230 }, { type: 'toilet', w: 72, h: 96, x: 180, y: 230 }],
    '2bhk': [{ type: 'living', w: 192, h: 216, x: 20, y: 20 }, { type: 'kitchen', w: 120, h: 120, x: 230, y: 20 }, { type: 'bedroom', w: 144, h: 168, x: 20, y: 250 }, { type: 'toilet', w: 72, h: 96, x: 180, y: 250 }, { type: 'bedroom', w: 144, h: 144, x: 20, y: 440 }, { type: 'toilet', w: 72, h: 96, x: 180, y: 440 }],
    '3bhk': [{ type: 'living', w: 240, h: 240, x: 20, y: 20 }, { type: 'kitchen', w: 120, h: 144, x: 280, y: 20 }, { type: 'bedroom', w: 168, h: 168, x: 20, y: 280 }, { type: 'toilet', w: 72, h: 96, x: 200, y: 280 }, { type: 'bedroom', w: 144, h: 144, x: 20, y: 460 }, { type: 'toilet', w: 72, h: 96, x: 180, y: 460 }, { type: 'bedroom', w: 144, h: 144, x: 280, y: 460 }]
};

// --- DATA LOGIC ---
function saveState() {
    const state = JSON.stringify({ elements: elements, fixtures: fixtures });
    historyStack.push(state);
    redoStack = []; 
    if (historyStack.length > MAX_HISTORY) historyStack.shift();
}

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
        try {
            const data = JSON.parse(saved);
            if (data.elements && data.elements.length > 0) {
                elements = data.elements;
                fixtures = data.fixtures || [];
                if (data.inW) document.getElementById('inW').value = data.inW;
                if (data.inH) document.getElementById('inH').value = data.inH;
                
                let maxFloor = 0;
                elements.forEach(el => { if (el.floor > maxFloor) maxFloor = el.floor; });
                const bFloorsInput = document.getElementById('b-floors');
                if (bFloorsInput) bFloorsInput.value = maxFloor + 1;
            }
        } catch (e) { console.error("Auto-save load failed.", e); }
    }
}

// --- IMPORT / EXPORT ---
function exportJSON() { 
    let fileName = prompt("Enter a name for your design:", "My-ArchCAD-Design");
    if (fileName === null) return; 
    if (fileName.trim() === "") fileName = "My-ArchCAD-Design";
    if (!fileName.endsWith('.json')) fileName += '.json';

    const data = JSON.stringify({ 
        elements: elements, fixtures: fixtures, 
        building: { w: document.getElementById('inW').value, h: document.getElementById('inH').value }, 
        floors: parseInt(document.getElementById('b-floors').value) 
    }); 
    const a = document.createElement('a'); 
    a.href = 'data:application/json,' + encodeURIComponent(data); 
    a.download = fileName; 
    a.click(); 
}

function importJSON(event) { 
    const reader = new FileReader(); 
    reader.onload = (e) => { 
        try {
            const data = JSON.parse(e.target.result); 
            elements = data.elements || []; 
            historyStack = []; redoStack = [];
            fixtures = data.fixtures || []; 
            
            let maxFloor = 0;
            elements.forEach(el => { 
                if (el.floor === undefined) el.floor = 0; 
                el.floor = parseInt(el.floor); 
                if (el.floor > maxFloor) maxFloor = el.floor;
                if (!el.type) el.type = 'living'; 
            }); 
            
            if (data.building) {
                document.getElementById('inW').value = data.building.w || 600; 
                document.getElementById('inH').value = data.building.h || 700; 
            }
            const bFloorsInput = document.getElementById('b-floors');
            if (bFloorsInput) bFloorsInput.value = Math.max(maxFloor + 1, data.floors || 1); 

            if (typeof renderFloorSelectors === 'function') renderFloorSelectors(); 
            if (typeof setFloor === 'function') setFloor(0); 
        } catch (error) { alert("Error reading JSON file."); }
    }; 
    reader.readAsText(event.target.files[0]); 
    event.target.value = '';
}

function resetWorkspace() {
    if (confirm("⚠️ WARNING: This will completely erase your building and clear your saved memory.\\n\\nAre you sure you want to reset?")) {
        elements = []; fixtures = []; currentFloor = 0;
        document.getElementById('inW').value = 272;
        document.getElementById('inH').value = 400;
        const bFloorsInput = document.getElementById('b-floors');
        if (bFloorsInput) bFloorsInput.value = 1;
        
        localStorage.removeItem('ArchCAD_AutoSave');
        
        if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
        if (typeof setFloor === 'function') setFloor(0);
        if (typeof is3DMode !== 'undefined' && is3DMode) toggle3D();
        if (typeof updateCanvas === 'function') updateCanvas();
    }
}

// --- GLOBAL KEYBOARD SHORTCUTS (Delete, Undo, Redo, Copy, Paste) ---
document.addEventListener('keydown', (e) => {
    // Ignore if typing in an input
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;

    // Delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (typeof selectedElIndex !== 'undefined' && selectedElIndex !== -1 && typeof deleteElement === 'function') {
            e.preventDefault();
            deleteElement(selectedElIndex);
        }
        return;
    }

    // Copy
    if (e.ctrlKey && e.key === 'c' && typeof selectedElIndex !== 'undefined' && selectedElIndex !== -1) {
        clipboard = JSON.parse(JSON.stringify(elements[selectedElIndex]));
    }
    
    // Paste
    if (e.ctrlKey && e.key === 'v' && clipboard) {
        saveState();
        const clone = JSON.parse(JSON.stringify(clipboard));
        clone.x += 20; clone.y += 20;
        elements.push(clone);
        if (typeof selectedElIndex !== 'undefined') selectedElIndex = elements.length - 1;
        if (typeof renderSidebar === 'function') renderSidebar();
        if (typeof updateCanvas === 'function') updateCanvas();
    }

    // Undo (Ctrl+Z)
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (historyStack.length > 0) {
            redoStack.push(JSON.stringify({ elements: elements, fixtures: fixtures }));
            const previousState = JSON.parse(historyStack.pop());
            elements = previousState.elements; fixtures = previousState.fixtures;
            if (typeof renderSidebar === 'function') renderSidebar();
            if (typeof updateCanvas === 'function') updateCanvas();
        }
    }
    
    // Redo (Ctrl+Shift+Z)
    if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        if (redoStack.length > 0) {
            historyStack.push(JSON.stringify({ elements: elements, fixtures: fixtures }));
            const nextState = JSON.parse(redoStack.pop());
            elements = nextState.elements; fixtures = nextState.fixtures;
            if (typeof renderSidebar === 'function') renderSidebar();
            if (typeof updateCanvas === 'function') updateCanvas();
        }
    }
});