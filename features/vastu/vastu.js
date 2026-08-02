// =========================================
// 🌟 VASTU SHASTRA SCORING ENGINE (vastu.js)
// =========================================

window.calculateVastuScore = function() {
    let score = 0;
    let mainText = "Add rooms to calculate Vastu.";
    let color = "#94a3b8"; // Gray default

    if (typeof elements !== 'undefined' && elements.length > 0) {
        score = 50; // Neutral base score
        let feedback = [];
        const inW = parseFloat(document.getElementById('inW')?.value || 272);
        const inH = parseFloat(document.getElementById('inH')?.value || 400);

        // Divide plot into 3x3 grid (9 Mandala Zones)
        const cellW = inW / 3;
        const cellH = inH / 3;

        elements.forEach(el => {
            if (el.isFurniture || el.floor > 0) return; // Vastu is primarily evaluated on the Ground Floor
            const cx = el.x + (el.w / 2);
            const cy = el.y + (el.h / 2);
            
            // Determine Compass Zone
            const compassDir = document.getElementById('compassDir')?.value || 'West';
            let zoneStr = getDynamicVastuZone(cx, cy, inW, inH, compassDir);
            
            // Apply Global Rules
            if (el.type === 'kitchen') {
                if (zoneStr === "SE") { score += 20; feedback.push("Kitchen perfectly in SE (+20)"); }
                else if (zoneStr === "NW") { score += 10; feedback.push("Kitchen acceptable in NW (+10)"); }
                else { score -= 15; feedback.push(`Kitchen in ${zoneStr} (Should be SE) (-15)`); }
            }
            if (el.type === 'puja') {
                if (zoneStr === "NE") { score += 20; feedback.push("Puja perfectly in NE (+20)"); }
                else { score -= 10; feedback.push(`Puja in ${zoneStr} (Should be NE) (-10)`); }
            }
            if (el.type === 'bedroom') {
                if (zoneStr === "SW") { score += 15; feedback.push("Master Bed perfectly in SW (+15)"); }
            }
            if (el.type === 'toilet') {
                if (zoneStr === "NE" || zoneStr === "SW") { score -= 25; feedback.push(`Toilet strictly prohibited in ${zoneStr} (-25)`); }
                else { score += 10; }
            }
        });
        
        score = Math.max(0, Math.min(100, score)); // Clamp between 0 and 100
        
        // Determine Color based on score
        color = "#10b981"; // Green (Good)
        if (score < 40) color = "#ef4444"; // Red (Bad)
        else if (score < 70) color = "#f59e0b"; // Orange (Average)
        
        mainText = feedback.length > 0 ? feedback[0] : "Good overall spatial flow.";
        if (score === 50 && feedback.length === 0) mainText = "Add specific rooms (Kitchen, Puja, Toilets) for scoring.";
    }

    const badge = document.getElementById('vastu-score-badge');
    const ring = document.getElementById('vastu-ring');
    const circleText = document.getElementById('vastu-circle-text');
    const feedbackEl = document.getElementById('vastu-feedback-text');

    if (badge && ring && circleText && feedbackEl) {
        badge.innerText = `${score}/100`;
        badge.style.color = color;
        badge.style.boxShadow = `0 0 8px ${color}44`;

        ring.style.background = `conic-gradient(${color} ${score}%, #1e293b 0)`;
        circleText.innerText = score;
        feedbackEl.innerText = mainText;
        feedbackEl.title = mainText;
    }
    return { score, text: mainText, color };
};

// Toggles the Vastu widget between expanded and minimized states
function toggleVastuWidget() {
    const widget = document.getElementById('vastu-floating-widget');
    const toggleBtn = document.getElementById('vastu-toggle-btn');
    
    if (widget) {
        widget.classList.toggle('minimized');
        
        // Update button text to visually indicate state ( + or - )
        if (widget.classList.contains('minimized')) {
            toggleBtn.innerHTML = '＋';
            toggleBtn.style.transform = 'translateY(1px)'; // subtle alignment tweak for the plus sign
        } else {
            toggleBtn.innerHTML = '—';
            toggleBtn.style.transform = 'translateY(-2px)'; // subtle alignment tweak for the minus sign
        }
    }
}

function getDynamicVastuZoneOld(cx, cy, cellW, cellH, topDirection) {
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
function getDynamicVastuZone(cx, cy, plotW, plotH, topDirection) {
    // 1. Find Brahmasthan (Exact Center of Plot)
    const centerX = plotW / 2;
    const centerY = plotH / 2;
    
    // If the room is practically dead-center
    if (Math.abs(cx - centerX) < (plotW * 0.1) && Math.abs(cy - centerY) < (plotH * 0.1)) {
        return "CENTER";
    }
    
    // 2. Calculate angle from center to room (in degrees, 0 to 360)
    let angle = Math.atan2(cy - centerY, cx - centerX) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    // 3. Adjust angle offset based on the user's Compass Top Direction
    let offset = 0;
    switch (topDirection) {
        case 'North': offset = 270; break; // SVG Y grows downwards, so North is at 270 deg
        case 'East':  offset = 0; break;
        case 'South': offset = 90; break;
        case 'West':  offset = 180; break;
        default:      offset = 180; break;
    }
    
    // Normalize the adjusted angle back to a 0-360 scale
    let normalizedAngle = (angle - offset + 360) % 360;
    
    // 4. Map to the 16 Professional Vastu Zones (22.5 degrees each)
    const zones = ["E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW", "N", "NNE", "NE", "ENE"];
    
    // Shift by 11.25 degrees so each zone is centered exactly on its primary angle
    const index = Math.floor(((normalizedAngle + 11.25) % 360) / 22.5);
    return zones[index];
}