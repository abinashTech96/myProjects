// =========================================
// 🖨️ EXPORT & DOCUMENT ENGINE (export.js)
// =========================================
// --- 1. EXPORT TO HIGH-RES PNG ---
window.exportPNG = function() {
    const svgElement = document.getElementById('blueprint');
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgElement);

    if (!svgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = 2000;
        canvas.height = 2000;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url); 

        const downloadLink = document.createElement('a');
        downloadLink.href = canvas.toDataURL('image/png', 1.0);
        downloadLink.download = 'Architectural-Blueprint.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };
    img.src = url;
};
// --- 2. EXPORT TO VECTOR PDF (Print Layout) ---
window.exportPDF = function() {
    // 1. Clone the pristine SVG canvas directly
    const svgNode = document.getElementById('blueprint').cloneNode(true);
    
    // 2. Remove all UI overlays, crosshairs, and selection borders from the clone
    const layersToHide = ['smart-guides', 'measure-group', 'column-container', 'dim-group'];
    layersToHide.forEach(id => {
        const el = svgNode.querySelector(`#${id}`);
        if (el) el.remove();
    });
    
    // Remove the glowing selection border from any active room
    svgNode.querySelectorAll('.room-selected').forEach(el => {
        el.classList.remove('room-selected');
        el.setAttribute('stroke', '#ffffff');
    });

    // 3. Create a clean, temporary print window
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    
    // Calculate Total Area for the Title Block (Excluding Furniture & Stairs)
    let totalArea = "0.0";
    if (typeof elements !== 'undefined') {
        totalArea = elements
            .filter(el => !el.isFurniture && el.type !== 'staircase')
            .reduce((sum, el) => sum + ((el.w * el.h) / 144), 0)
            .toFixed(1);
    }
    const dateStr = new Date().toLocaleDateString();

    // 4. Inject the Vector SVG and a professional Title Block into the print window
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>ArchCAD_Blueprint_Export</title>
                <style>
                    body { margin: 0; padding: 0; background: #ffffff; font-family: sans-serif; }
                    .print-wrapper { width: 100vw; height: 100vh; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
                    .frame { flex-grow: 1; border: 4px solid #0f172a; position: relative; overflow: hidden; display: flex; justify-content: center; align-items: center; background: #0f172a; }
                    svg { width: 100%; height: 100%; object-fit: contain; }
                    
                    /* The Professional Title Block */
                    .title-block { position: absolute; bottom: 0; right: 0; width: 400px; background: white; border-top: 4px solid #0f172a; border-left: 4px solid #0f172a; display: grid; grid-template-columns: 1fr 1fr; color: #0f172a; }
                    .title-header { grid-column: span 2; padding: 12px; background: #0f172a; color: white; text-align: center; font-weight: 900; font-size: 1.2rem; letter-spacing: 2px; }
                    .title-cell { padding: 10px; border-right: 2px solid #0f172a; border-bottom: 2px solid #0f172a; font-size: 0.7rem; }
                    .title-cell:nth-child(even) { border-right: none; }
                    .title-cell strong { color: #64748b; }
                    .title-val { display: block; font-size: 1rem; font-weight: bold; margin-top: 4px; }
                    
                    /* Force landscape mode in the browser print dialog */
                    @page { size: landscape; margin: 0; }
                </style>
            </head>
            <body>
                <div class="print-wrapper">
                    <div class="frame">
                        ${svgNode.outerHTML}
                        <div class="title-block">
                            <div class="title-header">ARCHCAD PRO</div>
                            <div class="title-cell"><strong>PROJECT</strong><span class="title-val">Floorplan</span></div>
                            <div class="title-cell"><strong>DATE</strong><span class="title-val">${dateStr}</span></div>
                            <div class="title-cell" style="border-bottom: none;"><strong>DRAWN BY</strong><span class="title-val">System Admin</span></div>
                            <div class="title-cell" style="border-bottom: none;"><strong>TOTAL AREA</strong><span class="title-val">${totalArea} sqft</span></div>
                        </div>
                    </div>
                </div>
                <script>
                    // Wait for the SVG to render, then open the print dialog!
                    window.onload = () => {
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
};
function exportDXF() {
    const unit = UI.unitSelect ? UI.unitSelect.value : 'in';
    const SCALE = parseFloat(UI.scaleInput ? UI.scaleInput.value : 1.2) || 1.2;
    const geom = typeof calculateGeometry === 'function' ? calculateGeometry(SCALE, unit) : null;
    
    if (!geom) {
        alert("Geometry engine not ready!");
        return;
    }

    let dxf = "";
    
    // DXF Header & Entities Section Start
    dxf += "  0\nSECTION\n  2\nHEADER\n  0\nENDSEC\n";
    dxf += "  0\nSECTION\n  2\nENTITIES\n";

    // Helper to draw a DXF Line
    const addLine = (x1, y1, x2, y2, layer = "0") => {
        dxf += `  0\nLINE\n  8\n${layer}\n`;
        dxf += ` 10\n${x1.toFixed(2)}\n 20\n${y1.toFixed(2)}\n 30\n0.0\n`;
        dxf += ` 11\n${x2.toFixed(2)}\n 21\n${y2.toFixed(2)}\n 31\n0.0\n`;
    };

    // 1. Export Plot Boundaries (Convert back to real-world inches)
    const { A, B, C, D, I, J, K, L } = geom;
    const toReal = (val, origin) => (val - origin) / SCALE;

    // Outer Plot (Layer: PLOT)
    addLine(toReal(A.x, 500), toReal(A.y, 500), toReal(B.x, 500), toReal(B.y, 500), "PLOT");
    addLine(toReal(B.x, 500), toReal(B.y, 500), toReal(C.x, 500), toReal(C.y, 500), "PLOT");
    addLine(toReal(C.x, 500), toReal(C.y, 500), toReal(D.x, 500), toReal(D.y, 500), "PLOT");
    addLine(toReal(D.x, 500), toReal(D.y, 500), toReal(A.x, 500), toReal(A.y, 500), "PLOT");

    // Inner Built-up Area (Layer: BUILT_UP)
    addLine(toReal(I.x, 500), toReal(I.y, 500), toReal(J.x, 500), toReal(J.y, 500), "BUILT_UP");
    addLine(toReal(J.x, 500), toReal(J.y, 500), toReal(K.x, 500), toReal(K.y, 500), "BUILT_UP");
    addLine(toReal(K.x, 500), toReal(K.y, 500), toReal(L.x, 500), toReal(L.y, 500), "BUILT_UP");
    addLine(toReal(L.x, 500), toReal(L.y, 500), toReal(I.x, 500), toReal(I.y, 500), "BUILT_UP");

    // 2. Export Rooms (Layer: WALLS)
    elements.forEach(el => {
        if (el.floor !== currentFloor || el.isFurniture) return;
        
        // Calculate real-world coordinates relative to the inner plot (I)
        const rx = toReal(I.x, 500) + el.x;
        const ry = toReal(I.y, 500) + el.y;
        const rw = el.w;
        const rh = el.h;

        addLine(rx, ry, rx + rw, ry, "WALLS");
        addLine(rx + rw, ry, rx + rw, ry + rh, "WALLS");
        addLine(rx + rw, ry + rh, rx, ry + rh, "WALLS");
        addLine(rx, ry + rh, rx, ry, "WALLS");
    });

    // Close DXF File
    dxf += "  0\nENDSEC\n  0\nEOF\n";

    // Trigger Download
    const blob = new Blob([dxf], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ArchCAD_Export_${new Date().getTime()}.dxf`;
    a.click();
    window.URL.revokeObjectURL(url);
}
window.exportGLB = function() {
    if (!window.is3DMode || !Engine3D.buildingGroup) {
        return alert("Please open the 3D Preview first to generate the mesh!");
    }
    
    // Dynamically load the Three.js GLTFExporter if it isn't in the HTML
    if (typeof THREE.GLTFExporter === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js';
        script.onload = () => runGLTFExport();
        document.head.appendChild(script);
    } else {
        runGLTFExport();
    }
};
function runGLTFExport() {
    const exporter = new THREE.GLTFExporter();
    
    // Export the entire building group
    exporter.parse(Engine3D.buildingGroup, function (gltf) {
        const blob = new Blob([gltf], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `ArchCAD_3D_Model_${new Date().getTime()}.glb`;
        downloadLink.click();
        window.URL.revokeObjectURL(url);
    }, { binary: true }); // binary: true generates a .glb file instead of a text .gltf
}