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
            let zoneStr = "";
            if (cx > cellW * 2) zoneStr += "N";
            else if (cx < cellW) zoneStr += "S";
            if (cy > cellH * 2) zoneStr += "E";
            else if (cy < cellH) zoneStr += "W";
            if (zoneStr === "") zoneStr = "CENTER";
            
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