// ==========================================
// 🧠 BACKGROUND MATH WORKER (core/worker.js)
// ==========================================

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'CALCULATE_MATH') {
        // 🌟 FIX: Pass payload.compassDir into calculateVastu
        const vastuResult = calculateVastu(payload.elements, payload.inW, payload.inH, payload.compassDir);
        const areaResult = calculateArea(payload.elements, payload.currentFloor);
        self.postMessage({ type: 'MATH_COMPLETE', vastu: vastuResult, area: areaResult });
    }
};

function calculateVastu(elements, inW, inH, compassDir) {
    let score = 0;
    let mainText = "Add rooms to calculate Vastu.";
    let color = "#94a3b8";

    if (elements.length > 0) {
        score = 50;
        let feedback = [];
        const cellW = inW / 3;
        const cellH = inH / 3;

        elements.forEach(el => {
            if (el.isFurniture || el.floor > 0) return;
            const cx = el.x + (el.w / 2);
            const cy = el.y + (el.h / 2);
            let zoneStr = getDynamicVastuZone(cx, cy, cellW, cellH, compassDir);

            if (el.type === 'kitchen') {
                if (zoneStr === "SE") { score += 20; feedback.push("Kitchen perfectly in SE (+20)"); }
                else if (zoneStr === "NW") { score += 10; feedback.push("Kitchen acceptable in NW (+10)"); }
                else { score -= 15; feedback.push("Kitchen in " + zoneStr + " (Should be SE) (-15)"); }
            }
            if (el.type === 'puja') {
                if (zoneStr === "NE") { score += 20; feedback.push("Puja perfectly in NE (+20)"); }
                else { score -= 10; feedback.push("Puja in " + zoneStr + " (Should be NE) (-10)"); }
            }
            if (el.type === 'bedroom') {
                if (zoneStr === "SW") { score += 15; feedback.push("Master Bed perfectly in SW (+15)"); }
            }
            if (el.type === 'toilet') {
                if (zoneStr === "NE" || zoneStr === "SW") { score -= 25; feedback.push("Toilet prohibited in " + zoneStr + " (-25)"); }
                else { score += 10; }
            }
        });
        score = Math.max(0, Math.min(100, score));
        color = "#10b981";
        if (score < 40) color = "#ef4444";
        else if (score < 70) color = "#f59e0b";
        mainText = feedback.length > 0 ? feedback[0] : "Good overall spatial flow.";
        if (score === 50 && feedback.length === 0) mainText = "Add specific rooms (Kitchen, Puja, Toilets) for scoring.";
    }
    return { score, text: mainText, color };
}

function calculateArea(elements, currentFloor) {
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
    // Sort rooms from largest to smallest area before sending to UI
    const sortedRooms = Object.keys(currentFloorTotals).sort((a, b) => currentFloorTotals[b] - currentFloorTotals[a]);
    let sortedTotals = {};
    sortedRooms.forEach(room => sortedTotals[room] = currentFloorTotals[room]);

    return { currentFloorTotals: sortedTotals, currentFloorGrandTotal, totalBuiltUpAreaAllFloors };
}

function getDynamicVastuZone(cx, cy, cellW, cellH, topDirection) {
    let gridX = cx < cellW ? 0 : (cx > cellW * 2 ? 2 : 1);
    let gridY = cy < cellH ? 0 : (cy > cellH * 2 ? 2 : 1);

    // If perfectly in the middle box
    if (gridX === 1 && gridY === 1) return "CENTER";
    
    // Map the 4 edges based on what the user set as "Top"
    let up = "", down = "", left = "", right = "";
    switch (topDirection) {
        case 'North': up="N"; down="S"; left="W"; right="E"; break;
        case 'East':  up="E"; down="W"; left="N"; right="S"; break;
        case 'South': up="S"; down="N"; left="E"; right="W"; break;
        case 'West':  up="W"; down="E"; left="S"; right="N"; break;
        default:      up="W"; down="E"; left="S"; right="N"; break;
    }

    let zone = "";
    
    // Calculate N/S component first
    if (gridY === 0 && (up === 'N' || up === 'S')) zone += up;
    else if (gridY === 2 && (down === 'N' || down === 'S')) zone += down;
    else if (gridX === 0 && (left === 'N' || left === 'S')) zone += left;
    else if (gridX === 2 && (right === 'N' || right === 'S')) zone += right;

    // Calculate E/W component second
    if (gridY === 0 && (up === 'E' || up === 'W')) zone += up;
    else if (gridY === 2 && (down === 'E' || down === 'W')) zone += down;
    else if (gridX === 0 && (left === 'E' || left === 'W')) zone += left;
    else if (gridX === 2 && (right === 'E' || right === 'W')) zone += right;

    return zone;
}