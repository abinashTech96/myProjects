// ==========================================
// 📤 EXPORT & REPORTING ENGINE (export.js)
// Single-File Component (CSS + JS)
// ==========================================

// 1. INJECT MODULE-SPECIFIC CSS
const exportStyles = `
    /* --- Export Dialog & Panel Styles --- */
    #export-modal-backdrop {
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(8px);
        z-index: 9998;
        display: none;
        opacity: 0;
        transition: opacity 0.4s ease;
    }

    #export-modal {
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        width: 500px; /* Widened slightly to fit 3 columns */
        background: linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-top: 3px solid #10b981;
        border-radius: 16px;
        padding: 30px;
        z-index: 9999;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
        display: none;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: auto;
    }

    .export-modal-active {
        opacity: 1 !important;
        transform: translate(-50%, -50%) scale(1) !important;
    }

    .export-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 12px;
    }

    .export-title {
        color: #f8fafc;
        font-size: 1.1rem;
        font-weight: 800;
        letter-spacing: 0.5px;
        margin: 0;
    }

    .export-close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 1.4rem;
        transition: color 0.2s, transform 0.2s;
    }

    .export-close-btn:hover {
        color: #f8fafc;
        transform: scale(1.1);
    }

    .export-options-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr; /* 3 Columns for Pro Tools */
        gap: 12px;
        margin-bottom: 25px;
    }

    .export-option-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 15px 10px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .export-option-card:hover {
        background: rgba(139, 92, 246, 0.1);
        border-color: rgba(139, 92, 246, 0.4);
        transform: translateY(-2px);
    }

    .export-option-icon {
        font-size: 1.8rem;
        margin-bottom: 8px;
        display: block;
    }

    .export-option-label {
        color: #e2e8f0;
        font-size: 0.75rem;
        font-weight: 700;
        margin-bottom: 4px;
        text-transform: uppercase;
    }

    .export-option-desc {
        color: #94a3b8;
        font-size: 0.6rem;
        line-height: 1.3;
    }

    .export-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding-top: 15px;
    }

    .export-btn-cancel {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .export-btn-cancel:hover {
        background: rgba(255, 255, 255, 0.05);
        color: #f8fafc;
    }

    /* Print specific CSS */
    @media print {
        @page { margin: 0; size: landscape; }
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: #0f172a !important; }
        .glass-panel, #toggle-camera-cb, #export-modal, #export-modal-backdrop { display: none !important; }
        .canvas-area { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999; background: #0f172a !important; }
        #blueprint { width: 100% !important; height: 100% !important; }
    }
`;

document.head.insertAdjacentHTML("beforeend", `<style>${exportStyles}</style>`);


// ==========================================
// 2. ENGINE LOGIC & CONTROLLER
// ==========================================
const ExportEngine = {
    buildUI() {
        if (document.getElementById('export-modal')) return;

        const modalTemplate = `
            <div id="export-modal-backdrop"></div>
            <div id="export-modal">
                <div class="export-header">
                    <h3 class="export-title">📦 Export Project Data</h3>
                    <button class="export-close-btn" title="Close">&times;</button>
                </div>
                <div class="export-options-grid">
                    <div class="export-option-card" data-action="dxf">
                        <span class="export-option-icon">💽</span>
                        <div class="export-option-label">AutoCAD DXF</div>
                        <div class="export-option-desc">Professional 2D CAD drafting file</div>
                    </div>
                    <div class="export-option-card" data-action="pdf">
                        <span class="export-option-icon">🖨️</span>
                        <div class="export-option-label">Print PDF</div>
                        <div class="export-option-desc">Title block & vector blueprint</div>
                    </div>
                    <div class="export-option-card" data-action="glb">
                        <span class="export-option-icon">🧊</span>
                        <div class="export-option-label">3D Mesh GLB</div>
                        <div class="export-option-desc">Export building for Blender/Web</div>
                    </div>
                    <div class="export-option-card" data-action="png">
                        <span class="export-option-icon">🖼️</span>
                        <div class="export-option-label">Image PNG</div>
                        <div class="export-option-desc">High-resolution 2D snapshot</div>
                    </div>
                    <div class="export-option-card" data-action="svg">
                        <span class="export-option-icon">📐</span>
                        <div class="export-option-label">Vector SVG</div>
                        <div class="export-option-desc">Raw scalable vector graphics</div>
                    </div>
                    <div class="export-option-card" data-action="json">
                        <span class="export-option-icon">📄</span>
                        <div class="export-option-label">Project JSON</div>
                        <div class="export-option-desc">Save editable layout state</div>
                    </div>
                </div>
                <div class="export-footer">
                    <button class="export-btn-cancel">Cancel</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalTemplate);

        const backdrop = document.getElementById('export-modal-backdrop');
        const modal = document.getElementById('export-modal');
        const closeFn = () => this.toggleModal(false);

        backdrop.addEventListener('click', closeFn);
        modal.querySelector('.export-close-btn').addEventListener('click', closeFn);
        modal.querySelector('.export-btn-cancel').addEventListener('click', closeFn);

        modal.querySelectorAll('.export-option-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                this.handleExport(action);
                closeFn();
            });
        });
    },

    toggleModal(show) {
        this.buildUI();
        const backdrop = document.getElementById('export-modal-backdrop');
        const modal = document.getElementById('export-modal');

        if (show) {
            backdrop.style.display = 'block';
            modal.style.display = 'block';
            requestAnimationFrame(() => {
                backdrop.classList.add('export-modal-active');
                modal.classList.add('export-modal-active');
            });
        } else {
            backdrop.classList.remove('export-modal-active');
            modal.classList.remove('export-modal-active');
            setTimeout(() => {
                backdrop.style.display = 'none';
                modal.style.display = 'none';
            }, 400);
        }
    },

    handleExport(type) {
        // ✨ FIX: Safely pull the data directly from the global arrays if ProjectState isn't formatting it
        const currentState = {
            version: "1.2",
            timestamp: new Date().toISOString(),
            elements: typeof elements !== 'undefined' ? elements : [],
            fixtures: typeof fixtures !== 'undefined' ? fixtures : [],
            plot: {
                inW: document.getElementById('inW')?.value,
                inH: document.getElementById('inH')?.value
            }
        };


        switch (type) {
            case 'json':
                this.downloadBlob(JSON.stringify(currentState, null, 2), 'archcad-project.json', 'application/json');
                break;
            case 'svg':
                const svgElement = document.getElementById('blueprint');
                if (svgElement) {
                    const serializer = new XMLSerializer();
                    const svgString = serializer.serializeToString(svgElement);
                    this.downloadBlob(svgString, 'archcad-blueprint.svg', 'image/svg+xml;charset=utf-8');
                }
                break;
            case 'png':
                this.exportPNG();
                break;
            case 'pdf':
                this.exportPDF();
                break;
            case 'dxf':
                this.exportDXF();
                break;
            case 'glb':
                this.exportGLB();
                break;
        }
    },

    downloadBlob(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // ==========================================
    // 3. CORE EXPORT SCRIPTS
    // ==========================================
    exportPNG() {
        const svgElement = document.getElementById('blueprint');
        if (!svgElement) return;
        
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
            downloadLink.download = 'ArchCAD-Blueprint.png';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        };
        img.src = url;
    },

    exportPDF() {
        const svgNode = document.getElementById('blueprint').cloneNode(true);
        const layersToHide = ['smart-guides', 'measure-group', 'column-container', 'dim-group'];
        layersToHide.forEach(id => {
            const el = svgNode.querySelector(`#${id}`);
            if (el) el.remove();
        });
        
        svgNode.querySelectorAll('.room-selected').forEach(el => {
            el.classList.remove('room-selected');
            el.setAttribute('stroke', '#ffffff');
        });

        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        let totalArea = "0.0";
        if (typeof elements !== 'undefined') {
            totalArea = elements
                .filter(el => !el.isFurniture && el.type !== 'staircase')
                .reduce((sum, el) => sum + ((el.w * el.h) / 144), 0)
                .toFixed(1);
        }
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>ArchCAD_Blueprint</title>
                    <style>
                        body { margin: 0; padding: 0; background: #ffffff; font-family: sans-serif; }
                        .print-wrapper { width: 100vw; height: 100vh; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
                        .frame { flex-grow: 1; border: 4px solid #0f172a; position: relative; overflow: hidden; display: flex; justify-content: center; align-items: center; background: #0f172a; }
                        svg { width: 100%; height: 100%; object-fit: contain; }
                        .title-block { position: absolute; bottom: 0; right: 0; width: 400px; background: white; border-top: 4px solid #0f172a; border-left: 4px solid #0f172a; display: grid; grid-template-columns: 1fr 1fr; color: #0f172a; }
                        .title-header { grid-column: span 2; padding: 12px; background: #0f172a; color: white; text-align: center; font-weight: 900; font-size: 1.2rem; letter-spacing: 2px; }
                        .title-cell { padding: 10px; border-right: 2px solid #0f172a; border-bottom: 2px solid #0f172a; font-size: 0.7rem; }
                        .title-cell:nth-child(even) { border-right: none; }
                        .title-cell strong { color: #64748b; }
                        .title-val { display: block; font-size: 1rem; font-weight: bold; margin-top: 4px; }
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
                                <div class="title-cell"><strong>DATE</strong><span class="title-val">${new Date().toLocaleDateString()}</span></div>
                                <div class="title-cell" style="border-bottom: none;"><strong>DRAWN BY</strong><span class="title-val">System Admin</span></div>
                                <div class="title-cell" style="border-bottom: none;"><strong>TOTAL AREA</strong><span class="title-val">${totalArea} sqft</span></div>
                            </div>
                        </div>
                    </div>
                    <script>
                        window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    },

    exportDXF() {
        const unit = UI.unitSelect ? UI.unitSelect.value : 'in';
        const SCALE = parseFloat(UI.scaleInput ? UI.scaleInput.value : 1.2) || 1.2;
        const geom = typeof calculateGeometry === 'function' ? calculateGeometry(SCALE, unit) : null;
        
        if (!geom) return alert("Geometry engine not ready!");

        let dxf = "  0\nSECTION\n  2\nHEADER\n  0\nENDSEC\n  0\nSECTION\n  2\nENTITIES\n";
        const addLine = (x1, y1, x2, y2, layer = "0") => {
            dxf += `  0\nLINE\n  8\n${layer}\n`;
            dxf += ` 10\n${x1.toFixed(2)}\n 20\n${y1.toFixed(2)}\n 30\n0.0\n`;
            dxf += ` 11\n${x2.toFixed(2)}\n 21\n${y2.toFixed(2)}\n 31\n0.0\n`;
        };

        const { A, B, C, D, I, J, K, L } = geom;
        const toReal = (val, origin) => (val - origin) / SCALE;

        // Plot Boundaries
        addLine(toReal(A.x, 500), toReal(A.y, 500), toReal(B.x, 500), toReal(B.y, 500), "PLOT");
        addLine(toReal(B.x, 500), toReal(B.y, 500), toReal(C.x, 500), toReal(C.y, 500), "PLOT");
        addLine(toReal(C.x, 500), toReal(C.y, 500), toReal(D.x, 500), toReal(D.y, 500), "PLOT");
        addLine(toReal(D.x, 500), toReal(D.y, 500), toReal(A.x, 500), toReal(A.y, 500), "PLOT");

        // Built-up Area
        addLine(toReal(I.x, 500), toReal(I.y, 500), toReal(J.x, 500), toReal(J.y, 500), "BUILT_UP");
        addLine(toReal(J.x, 500), toReal(J.y, 500), toReal(K.x, 500), toReal(K.y, 500), "BUILT_UP");
        addLine(toReal(K.x, 500), toReal(K.y, 500), toReal(L.x, 500), toReal(L.y, 500), "BUILT_UP");
        addLine(toReal(L.x, 500), toReal(L.y, 500), toReal(I.x, 500), toReal(I.y, 500), "BUILT_UP");

        // Rooms
        if (typeof elements !== 'undefined') {
            elements.forEach(el => {
                if (el.floor !== currentFloor || el.isFurniture) return;
                const rx = toReal(I.x, 500) + el.x;
                const ry = toReal(I.y, 500) + el.y;
                addLine(rx, ry, rx + el.w, ry, "WALLS");
                addLine(rx + el.w, ry, rx + el.w, ry + el.h, "WALLS");
                addLine(rx + el.w, ry + el.h, rx, ry + el.h, "WALLS");
                addLine(rx, ry + el.h, rx, ry, "WALLS");
            });
        }

        dxf += "  0\nENDSEC\n  0\nEOF\n";
        this.downloadBlob(dxf, `ArchCAD_Export_${new Date().getTime()}.dxf`, 'text/plain');
    },

    exportGLB() {
        if (!window.is3DMode || typeof Engine3D === 'undefined' || !Engine3D.buildingGroup) {
            return alert("Please open the 3D Preview first to generate the mesh!");
        }
        
        if (typeof THREE.GLTFExporter === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/exporters/GLTFExporter.js';
            script.onload = () => this.runGLTFExport();
            document.head.appendChild(script);
        } else {
            this.runGLTFExport();
        }
    },

    runGLTFExport() {
        const exporter = new THREE.GLTFExporter();
        exporter.parse(Engine3D.buildingGroup, (gltf) => {
            this.downloadBlob(gltf, `ArchCAD_3D_Model_${new Date().getTime()}.glb`, 'application/octet-stream');
        }, { binary: true });
    }
};

// 🌟 GLOBAL COMPATIBILITY HOOKS
window.toggleExportModal = (show) => ExportEngine.toggleModal(show);
window.triggerExport = (type) => ExportEngine.handleExport(type);

// Backwards compatibility for UI buttons that call global functions directly
window.exportPNG = () => ExportEngine.exportPNG();
window.exportPDF = () => ExportEngine.exportPDF();
window.exportDXF = () => ExportEngine.exportDXF();
window.exportGLB = () => ExportEngine.exportGLB();

// Initialize modal builder structure on DOM load
document.addEventListener('DOMContentLoaded', () => {
    ExportEngine.buildUI();
});