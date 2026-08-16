// =================================================================
// GEOMETRY & MATH ENGINE (geometry.js)
// Pure mathematical calculations (No DOM manipulation)
// =================================================================

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

function _calcArea(elements, currentFloor) {
    let currentFloorTotals = {};
    let currentFloorGrandTotal = 0;
    let totalBuiltUpAreaAllFloors = 0;

    elements.forEach(el => {
        if (el.isFurniture || el.type === 'staircase') return;
        const sqft = (el.w * el.h) / 144;
        totalBuiltUpAreaAllFloors += sqft;
        if (el.floor === currentFloor) {
            currentFloorGrandTotal += sqft;
            const typeName = el.customName || el.type.toUpperCase();
            if (!currentFloorTotals[typeName]) currentFloorTotals[typeName] = 0;
            currentFloorTotals[typeName] += sqft;
        }
    });
    
    const sortedRooms = Object.keys(currentFloorTotals).sort((a, b) => currentFloorTotals[b] - currentFloorTotals[a]);
    let sortedTotals = {};
    sortedRooms.forEach(room => sortedTotals[room] = currentFloorTotals[room]);

    return { currentFloorTotals: sortedTotals, currentFloorGrandTotal, totalBuiltUpAreaAllFloors };
}