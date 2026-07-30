
// =========================================
// 🌟 2D SECTION CUT & ELEVATION ENGINE
// =========================================
let isSectionMode = false;
let sectionStart = null;
let sectionLine = null;

window.toggleSectionCut = function() {
    isSectionMode = !isSectionMode;
    const btn = document.getElementById('btn-section');
    const svg = document.getElementById('blueprint'); // Your main 2D canvas

    if (isSectionMode) {
        btn.style.background = '#0ea5e9';
        btn.style.color = '#0f172a';
        svg.style.cursor = 'crosshair';
        
        svg.addEventListener('mousedown', onSectionDown);
        svg.addEventListener('mousemove', onSectionMove);
        svg.addEventListener('mouseup', onSectionUp);
    } else {
        btn.style.background = '';
        btn.style.color = '';
        svg.style.cursor = 'default';
        
        svg.removeEventListener('mousedown', onSectionDown);
        svg.removeEventListener('mousemove', onSectionMove);
        svg.removeEventListener('mouseup', onSectionUp);
        if (sectionLine) { sectionLine.remove(); sectionLine = null; }
    }
};
function getSectionPos(evt) {
    const svg = document.getElementById('blueprint');
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function onSectionDown(e) {
    if (!isSectionMode) return;
    sectionStart = getSectionPos(e);
    
    sectionLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    sectionLine.setAttribute("x1", sectionStart.x);
    sectionLine.setAttribute("y1", sectionStart.y);
    sectionLine.setAttribute("x2", sectionStart.x);
    sectionLine.setAttribute("y2", sectionStart.y);
    sectionLine.setAttribute("stroke", "#ef4444");
    sectionLine.setAttribute("stroke-width", "4");
    sectionLine.setAttribute("stroke-dasharray", "10,10");
    document.getElementById('blueprint').appendChild(sectionLine);
}
function onSectionMove(e) {
    if (!isSectionMode || !sectionStart || !sectionLine) return;
    const pt = getSectionPos(e);
    
    // 🌟 FIX 4: STRAIGHT-AXIS LOCKING
    const dx = Math.abs(pt.x - sectionStart.x);
    const dy = Math.abs(pt.y - sectionStart.y);
    const tol = ARCH_CONFIG.REFINEMENTS.SECTION_SNAP_TOLERANCE;
    
    // Snap to straight lines if within tolerance, or if holding SHIFT
    if (dx < tol || (e.shiftKey && dx < dy)) pt.x = sectionStart.x;
    if (dy < tol || (e.shiftKey && dy < dx)) pt.y = sectionStart.y;
    
    sectionLine.setAttribute("x2", pt.x);
    sectionLine.setAttribute("y2", pt.y);
}
function onSectionUp(e) {
    if (!isSectionMode || !sectionStart) return;
    const pt = getSectionPos(e);
    
    // Process the cut if line is long enough
    const dist = Math.hypot(pt.x - sectionStart.x, pt.y - sectionStart.y);
    if (dist > 20) {
        generateElevation(sectionStart.x, sectionStart.y, pt.x, pt.y, dist);
    }
    
    toggleSectionCut(); // Turn tool off after one cut
    sectionStart = null;
}
function getIntersection(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
    const d = (p2x - p1x) * (p4y - p3y) - (p2y - p1y) * (p4x - p3x);
    if (d === 0) return null; // Parallel

    const u = ((p3x - p1x) * (p4y - p3y) - (p3y - p1y) * (p4x - p3x)) / d;
    const v = ((p3x - p1x) * (p2y - p1y) - (p3y - p1y) * (p2x - p1x)) / d;

    if (u < 0 || u > 1 || v < 0 || v > 1) return null; // Doesn't intersect within segments
    
    return { x: p1x + u * (p2x - p1x), y: p1y + u * (p2y - p1y), distanceRatio: u };
}
function generateElevation(x1, y1, x2, y2, totalDist) {
    const wallH = (typeof ARCH_CONFIG !== 'undefined' ? ARCH_CONFIG.DEFAULTS.WALL_HEIGHT_3D : 120);
    const wallT = (typeof ARCH_CONFIG !== 'undefined' ? ARCH_CONFIG.DEFAULTS.WALL_THICKNESS_3D : 4);
    
    let cuts = [];

    // Check intersections with every room
    elements.forEach(el => {
        if (el.isFurniture) return;
        
        const walls = [
            { x3: el.x, y3: el.y, x4: el.x + el.w, y4: el.y },                 // Top
            { x3: el.x + el.w, y3: el.y, x4: el.x + el.w, y4: el.y + el.h },   // Right
            { x3: el.x, y3: el.y + el.h, x4: el.x + el.w, y4: el.y + el.h },   // Bottom
            { x3: el.x, y3: el.y, x4: el.x, y4: el.y + el.h }                  // Left
        ];

        walls.forEach(w => {
            const hit = getIntersection(x1, y1, x2, y2, w.x3, w.y3, w.x4, w.y4);
            if (hit) {
                cuts.push({
                    dist: hit.distanceRatio * totalDist,
                    floor: el.floor,
                    color: ARCH_CONFIG?.COLORS?.[el.type]?.rgb || '148,163,184'
                });
            }
        });
    });

    // Remove duplicates (shared walls)
    cuts = cuts.filter((v, i, a) => a.findIndex(t => (Math.abs(t.dist - v.dist) < 1 && t.floor === v.floor)) === i);
    cuts.sort((a, b) => a.dist - b.dist);

    renderElevationModal(cuts, totalDist, wallH, wallT);
}
function renderElevationModal(cuts, totalDist, wallH, wallT) {
    let existing = document.getElementById('elevation-modal');
    if (existing) existing.remove();

    const maxFloor = cuts.length > 0 ? Math.max(...cuts.map(c => c.floor)) : 0;
    
    // Increase margins for professional blueprint look
    const leftMargin = 100;
    const rightMargin = 50;
    const bottomMargin = 80;
    const topMargin = 80;

    const viewWidth = totalDist + leftMargin + rightMargin;
    const viewHeight = ((maxFloor + 2) * wallH) + bottomMargin + topMargin;
    const groundY = viewHeight - bottomMargin; 
    
    // --- 1. SVG Definitions (Grid, Hatching, Gradients) ---
    let svgContent = `
        <defs>
            <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(56, 189, 248, 0.07)" stroke-width="1"/>
            </pattern>
            <pattern id="wall-hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.4)" stroke-width="2" />
            </pattern>
            <linearGradient id="ground-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgba(16, 185, 129, 0.2)" />
                <stop offset="100%" stop-color="rgba(16, 185, 129, 0)" />
            </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bp-grid)" />
    `;

    // --- 2. Ground & Subterranean Gradient ---
    svgContent += `
        <rect x="0" y="${groundY}" width="100%" height="${bottomMargin}" fill="url(#ground-fade)" />
        <line x1="0" y1="${groundY}" x2="100%" y2="${groundY}" stroke="#10b981" stroke-width="4" />
        <text x="15" y="${groundY - 10}" fill="#10b981" font-size="14" font-family="monospace" font-weight="bold">GL ±0'-0"</text>
    `;

    // --- 3. Elevation Axes & Slabs ---
    for(let f = 0; f <= maxFloor + 1; f++) {
        const slabY = groundY - (f * wallH);
        const elevationFeet = (f * wallH) / 12; // Calculate feet based on your engine scale
        
        // Slab Line
        svgContent += `<line x1="${leftMargin - 20}" y1="${slabY}" x2="100%" y2="${slabY}" stroke="#475569" stroke-width="4" stroke-dasharray="15,5" />`;
        
        // Elevation Level Text
        if (f > 0) {
            const label = f > maxFloor ? "ROOF LEVEL" : `LEVEL ${f}`;
            svgContent += `
                <text x="15" y="${slabY - 5}" fill="#38bdf8" font-size="12" font-family="monospace" font-weight="bold">${label}</text>
                <text x="15" y="${slabY + 15}" fill="#94a3b8" font-size="10" font-family="monospace">EL +${Math.floor(elevationFeet)}'-0"</text>
            `;
        }
    }

    // --- 4. Architect Scale Figure (6ft tall) ---
    const scaleX = leftMargin + 20;
    const scaleY = groundY;
    svgContent += `
        <g opacity="0.4">
            <circle cx="${scaleX}" cy="${scaleY - 65}" r="6" fill="#cbd5e1" />
            <rect x="${scaleX - 7}" y="${scaleY - 57}" width="14" height="28" rx="4" fill="#cbd5e1" />
            <rect x="${scaleX - 5}" y="${scaleY - 30}" width="4" height="30" fill="#cbd5e1" />
            <rect x="${scaleX + 1}" y="${scaleY - 30}" width="4" height="30" fill="#cbd5e1" />
            <text x="${scaleX - 10}" y="${scaleY - 80}" fill="#cbd5e1" font-size="9" font-family="monospace">6' SCALE</text>
        </g>
    `;

    // --- 5. Cut Walls ---
    cuts.forEach(cut => {
        const xPos = leftMargin + cut.dist;
        const baseY = groundY - (cut.floor * wallH);
        
        // Draw a subtle centerline axis for the wall
        svgContent += `<line x1="${xPos}" y1="${baseY}" x2="${xPos}" y2="${baseY - wallH}" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="4,4" />`;
        
        // Draw the solid hatched wall block
        svgContent += `
            <rect x="${xPos - (wallT/2)}" y="${baseY - wallH}" width="${wallT}" height="${wallH}" 
                  fill="url(#wall-hatch)" stroke="rgb(${cut.color})" stroke-width="3" />
            
            <circle cx="${xPos}" cy="${baseY}" r="4" fill="rgb(${cut.color})" />
        `;
        
        // Distance marker (from start of cut)
        const distFeet = Math.floor(cut.dist / 12);
        const distInch = Math.round(cut.dist % 12);
        svgContent += `
            <text x="${xPos}" y="${groundY + 25}" fill="#94a3b8" font-size="10" font-family="monospace" text-anchor="middle">
                ${distFeet}' ${distInch}"
            </text>
            <circle cx="${xPos}" cy="${groundY}" r="3" fill="#cbd5e1" />
        `;
    });

    const totalFeet = Math.floor(totalDist / 12);
    const totalInch = Math.round(totalDist % 12);

    // --- 6. The UI Modal HTML ---
    const modalHTML = `
        <div id="elevation-modal" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(2, 6, 23, 0.85); backdrop-filter:blur(15px); z-index:100000; display:flex; justify-content:center; align-items:center; flex-direction:column;">
            
            <div style="width:95%; max-width:1400px; background:#0f172a; border:1px solid rgba(56, 189, 248, 0.4); border-radius:16px; padding:25px; box-shadow:0 30px 60px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.1);">
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.1);">
                    <div style="display:flex; align-items:center; gap: 15px;">
                        <div style="background: rgba(56, 189, 248, 0.1); padding: 10px; border-radius: 10px; border: 1px solid rgba(56,189,248,0.2);">
                            <span style="font-size: 1.5rem;">📐</span>
                        </div>
                        <div>
                            <h2 style="color:#f1f5f9; margin:0; font-size:1.4rem; letter-spacing: 1px;">CROSS SECTION <span style="color:#38bdf8;">ELEVATION</span></h2>
                            <span style="color:#94a3b8; font-size:0.85rem; font-family: monospace;">A-A' Profile View • Auto-Generated Architecture</span>
                        </div>
                    </div>
                    <button class="neo-btn" onclick="document.getElementById('elevation-modal').remove()" style="padding:10px 20px; font-weight: bold; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); cursor: pointer; border-radius: 8px;">
                        ✕ CLOSE SECTION
                    </button>
                </div>

                <div style="background:#020617; border-radius:12px; overflow-x:auto; overflow-y:hidden; display:flex; justify-content:flex-start; border: 1px inset rgba(255,255,255,0.05); padding: 10px; box-shadow: inset 0 10px 20px rgba(0,0,0,0.5);">
                    <svg width="${viewWidth}" height="${viewHeight}" style="min-width:100%; max-height: 65vh; font-family: monospace;">
                        ${svgContent}
                    </svg>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
                    <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; border-left: 3px solid #38bdf8;">
                        <div style="font-size: 0.7rem; color: #94a3b8; font-weight: bold; margin-bottom: 5px;">TOTAL CUT LENGTH</div>
                        <div style="font-size: 1.2rem; color: #f1f5f9; font-family: monospace;">${totalFeet}' ${totalInch}"</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; border-left: 3px solid #10b981;">
                        <div style="font-size: 0.7rem; color: #94a3b8; font-weight: bold; margin-bottom: 5px;">INTERSECTED WALLS</div>
                        <div style="font-size: 1.2rem; color: #f1f5f9; font-family: monospace;">${cuts.length} LOAD-BEARING</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; border-left: 3px solid #f59e0b;">
                        <div style="font-size: 0.7rem; color: #94a3b8; font-weight: bold; margin-bottom: 5px;">MAX HEIGHT (GL TO ROOF)</div>
                        <div style="font-size: 1.2rem; color: #f1f5f9; font-family: monospace;">${Math.floor(((maxFloor + 1) * wallH) / 12)}'-0"</div>
                    </div>
                </div>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}