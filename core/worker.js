// ==========================================
// 🧠 BACKGROUND MATH WORKER (core/worker.js)
// ==========================================

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'CALCULATE_MATH') {
        const vastuResult = calculateVastu(payload.elements, payload.inW, payload.inH);
        const areaResult = calculateArea(payload.elements, payload.currentFloor);
        // Send the finalized data back to the main UI thread
        self.postMessage({ type: 'MATH_COMPLETE', vastu: vastuResult, area: areaResult });
    }
};

function calculateVastu(elements, inW, inH) {
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
            let zoneStr = "";
            if (cx > cellW * 2) zoneStr += "N";
            else if (cx < cellW) zoneStr += "S";
            if (cy > cellH * 2) zoneStr += "E";
            else if (cy < cellH) zoneStr += "W";
            if (zoneStr === "") zoneStr = "CENTER";

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