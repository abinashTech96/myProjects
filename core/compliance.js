// ==========================================
// ✅ BUILDING CODE & COMPLIANCE ENGINE (compliance.js)
// ==========================================

// 1. The Math Algorithm
function _calcCompliance(elements, fixtures) {
    let warnings = [];
    let passed = 0;
    let totalChecks = 0;

    elements.forEach((el, index) => {
        if (el.isFurniture || el.type === 'staircase' || el.type === 'balcony') return;
        const sqft = (el.w * el.h) / 144;
        const name = el.customName || el.type.toUpperCase();
        
        let minArea = 0;
        if (el.type === 'bedroom') minArea = 70; 
        if (el.type === 'living') minArea = 120; 
        if (el.type === 'toilet') minArea = 15;  
        
        if (minArea > 0) {
            totalChecks++;
            if (sqft < minArea) {
                warnings.push(`[${name}] Area is ${sqft.toFixed(1)} sqft (Min required: ${minArea} sqft)`);
            } else { passed++; }
        }
        
        if (el.type === 'bedroom' || el.type === 'living') {
            totalChecks++;
            const minDimInches = 7 * 12; 
            if (el.w < minDimInches || el.h < minDimInches) {
                warnings.push(`[${name}] Width or depth is too narrow. Minimum 7'0" required.`);
            } else { passed++; }
        }
        
        if (fixtures && (el.type === 'bedroom' || el.type === 'living' || el.type === 'kitchen')) {
            totalChecks++;
            const roomFixtures = fixtures.filter(f => f.roomId === index);
            const hasWindow = roomFixtures.some(f => f.type === 'window');
            const hasDoor = roomFixtures.some(f => f.type === 'door');
            if (!hasWindow && !hasDoor) {
                warnings.push(`[${name}] Missing egress/ventilation. Add a door or window.`);
            } else { passed++; }
        }
    });
    const score = totalChecks > 0 ? Math.round((passed / totalChecks) * 100) : 100;
    return { score, warnings, totalChecks, passed };
}

// 2. The UI Renderer
window.renderComplianceUI = function(data) {
    if (!data) return;
    let widget = document.getElementById('compliance-widget');
    
    if (!widget) {
        widget = document.createElement('div');
        widget.id = 'compliance-widget';
        const canvasWrapper = document.getElementById('canvas-wrapper');
        if (canvasWrapper) canvasWrapper.appendChild(widget);
        else document.body.appendChild(widget);
    }

    let color = '#10b981'; // Green
    let icon = '✅';
    if (data.score < 100) { color = '#f59e0b'; icon = '⚠️'; } 
    if (data.score < 70) { color = '#ef4444'; icon = '🚨'; }  

    let warningsHtml = data.warnings.length > 0 
        ? data.warnings.map(w => `<div class="compliance-warning">${w}</div>`).join('')
        : `<div class="compliance-success">All elements meet standard building codes.</div>`;

    widget.innerHTML = `
        <div class="compliance-header">
            <span class="compliance-title">${icon} CODE INSPECTOR</span>
            <span class="compliance-score" style="color: ${color};">${data.score}%</span>
        </div>
        <div style="max-height: 180px; overflow-y: auto; padding-right: 4px;" class="explorer-scroll">
            ${warningsHtml}
        </div>
    `;
};