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