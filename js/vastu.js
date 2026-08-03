// =========================================
// 🧭 VASTU SHASTRA ENGINE & UI (vastu.js)
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

// Extracted from ui.js
window.renderVastuUI = function(vastuData) {
    let vastuContainer = document.getElementById('vastu-widget-container');
    if (!vastuContainer) return;
    vastuContainer.innerHTML = `
        <div class="neo-sunken" style="margin-top: 20px; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 0.75rem; color: #cbd5e1; font-weight: bold; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                <span>🧭 VASTU SCORE</span>
                <span style="color: ${vastuData.color}; background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 10px; box-shadow: 0 0 8px ${vastuData.color}44;">${vastuData.score}/100</span>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 50px; height: 50px; border-radius: 50%; background: conic-gradient(${vastuData.color} ${vastuData.score}%, #1e293b 0); display: flex; justify-content: center; align-items: center; box-shadow: inset 0 4px 8px rgba(0,0,0,0.5); flex-shrink: 0;">
                    <div style="width: 40px; height: 40px; background: #0f172a; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 0.9rem; font-weight: bold; color: #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                        ${vastuData.score}
                    </div>
                </div>
                <div style="font-size: 0.7rem; color: #94a3b8; flex: 1; line-height: 1.4;">
                    ${vastuData.text}
                </div>
            </div>
        </div>
    `;

    const badge = document.getElementById('vastu-score-badge');
    const ring = document.getElementById('vastu-ring');
    const circleText = document.getElementById('vastu-circle-text');
    const feedbackText = document.getElementById('vastu-feedback-text');

    if (badge && ring && circleText && feedbackText) {
        badge.innerText = `${vastuData.score}/100`;
        badge.style.color = vastuData.color;
        badge.style.boxShadow = `0 0 8px ${vastuData.color}44`;
        ring.style.background = `conic-gradient(${vastuData.color} ${vastuData.score}%, #1e293b 0)`;
        circleText.innerText = vastuData.score;
        feedbackText.innerText = vastuData.text;
        feedbackText.title = vastuData.text; 
    }
};

window.toggleVastuWidget = function() {
    const widget = document.getElementById('vastu-floating-widget');
    const toggleBtn = document.getElementById('vastu-toggle-btn');
    
    if (widget) {
        widget.classList.toggle('minimized');
        
        if (widget.classList.contains('minimized')) {
            toggleBtn.innerHTML = '＋';
            toggleBtn.style.transform = 'translateY(1px)'; 
        } else {
            toggleBtn.innerHTML = '—';
            toggleBtn.style.transform = 'translateY(-2px)'; 
        }
    }
};

function getDynamicVastuZone(cx, cy, plotW, plotH, topDirection) {
    const centerX = plotW / 2;
    const centerY = plotH / 2;
    
    if (Math.abs(cx - centerX) < (plotW * 0.1) && Math.abs(cy - centerY) < (plotH * 0.1)) {
        return "CENTER";
    }
    
    let angle = Math.atan2(cy - centerY, cx - centerX) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    let offset = 0;
    switch (topDirection) {
        case 'North': offset = 270; break;
        case 'East':  offset = 0; break;
        case 'South': offset = 90; break;
        case 'West':  offset = 180; break;
        default:      offset = 180; break;
    }
    
    let normalizedAngle = (angle - offset + 360) % 360;
    const zones = ["E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW", "N", "NNE", "NE", "ENE"];
    const index = Math.floor(((normalizedAngle + 11.25) % 360) / 22.5);
    return zones[index];
}

// --- Self-Contained Settings Toggle ---
document.addEventListener('DOMContentLoaded', () => {
    const vastuCb = document.getElementById('toggle-vastu-cb');
    if (vastuCb) {
        vastuCb.addEventListener('change', (e) => {
            if (typeof window.toggleWidget === 'function') {
                window.toggleWidget('vastu-floating-widget', e.target.checked);
            }
        });
    }    
});