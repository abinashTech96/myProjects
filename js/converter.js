// =========================================
// 📏 QUICK CONVERTER ENGINE (converter.js)
// =========================================

const ConverterEngine = {
    // Set to true to strictly require <div id="qc-widget-wrapper"></div> in index.html
    REQUIRE_HTML_CONTAINER: true,

    init: function() {
        let widget = document.getElementById('qc-widget-wrapper');
        
        if (!widget) {
            if (this.REQUIRE_HTML_CONTAINER) return;
            widget = document.createElement('div');
            widget.id = 'qc-widget-wrapper';
            widget.className = 'canvas-widget-top-left qc-wrapper';
            const canvasWrapper = document.getElementById('canvas-wrapper') || document.body;
            canvasWrapper.appendChild(widget);
        }

        // Inject the HTML structure into the anchor div
        widget.innerHTML = `
            <!-- Minimized Micro-Input Pill -->
            <div id="qc-min-btn" class="qc-min-btn">
                <button onclick="toggleQuickConverter()" style="background:transparent; border:none; cursor:pointer; padding:0; display:flex;" title="Maximize Converter">
                    <span class="icon" style="font-size: 1.1rem; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">📏</span>
                </button>
                <div style="display:flex; align-items:center; gap:2px; margin-left:6px;">
                    <!-- Tiny Feet Input -->
                    <input type="number" id="minFt" class="qc-min-input" placeholder="0" oninput="document.getElementById('calcFt').value = this.value; calcInches();">
                    <span style="color:#94a3b8; font-weight:bold;">'</span>
                    
                    <!-- Tiny Inches Input -->
                    <input type="number" id="minIn" class="qc-min-input" placeholder="0" oninput="document.getElementById('calcIn').value = this.value; calcInches();">
                    <span style="color:#94a3b8; font-weight:bold;">"</span>
                    
                    <span style="color:#38bdf8; margin: 0 4px; font-weight:bold;">=</span>
                    <span id="qc-min-text" style="color:#f8fafc; font-family:monospace; font-weight:bold; font-size:0.9rem;">0"</span>
                </div>
            </div>
            
            <!-- Maximized Full Widget -->
            <div id="qc-full-widget" class="sidebar-converter">
                <div class="converter-header">
                    <div><span class="icon">📏</span> QUICK CONVERTER</div>
                    <button onclick="toggleQuickConverter()" title="Minimize Converter" class="converter-close-btn">&times;</button>
                </div>
                <div class="converter-row">
                    <div class="converter-input-group">
                        <input type="number" id="calcFt" placeholder="0" oninput="calcInches()">
                        <span class="unit">FT</span>
                    </div>
                    <div class="converter-input-group">
                        <input type="number" id="calcIn" placeholder="0" oninput="calcInches()">
                        <span class="unit">IN</span>
                    </div>
                    <span class="converter-equals">=</span>
                    <div class="converter-input-group result-group">
                        <input type="text" id="resIn" placeholder="Total" readonly>
                        <span class="unit">IN</span>
                    </div>
                </div>
            </div>
        `;

        this.setupListeners();
    },

    calcInches: function() {
        const ftInput = document.getElementById('calcFt');
        const inInput = document.getElementById('calcIn');
        
        const ft = parseFloat(ftInput?.value) || 0; 
        const inc = parseFloat(inInput?.value) || 0; 
        const total = ft * 12 + inc;
        
        // Update the main big result
        const resIn = document.getElementById('resIn');
        if (resIn) resIn.value = total + " in"; 

        // Update the micro-inputs and text in the minimized pill
        const minFt = document.getElementById('minFt');
        const minIn = document.getElementById('minIn');
        const minText = document.getElementById('qc-min-text');
        
        // Check activeElement so we don't accidentally overwrite the input the user is currently typing in
        if (minFt && document.activeElement !== minFt && ftInput) minFt.value = ftInput.value;
        if (minIn && document.activeElement !== minIn && inInput) minIn.value = inInput.value;
        if (minText) minText.innerText = total + '"';
    },

    toggle: function() {
        const fullWidget = document.getElementById('qc-full-widget');
        const minBtn = document.getElementById('qc-min-btn');
        
        if (!fullWidget || !minBtn) return;    
        const isClosed = fullWidget.style.opacity === '0';
        
        if (isClosed) {
            // 1. Shrink and hide the small button
            minBtn.style.opacity = '0';
            minBtn.style.transform = 'scale(0.5)';
            minBtn.style.pointerEvents = 'none';        
            // 2. Expand and show the full widget
            fullWidget.style.opacity = '1';
            fullWidget.style.transform = 'scale(1)';
            fullWidget.style.pointerEvents = 'auto';
        } else {
            // 1. Shrink and hide the full widget
            fullWidget.style.opacity = '0';
            fullWidget.style.transform = 'scale(0.5)';
            fullWidget.style.pointerEvents = 'none';        
            // 2. Expand and show the small button
            minBtn.style.opacity = '1';
            minBtn.style.transform = 'scale(1)';
            minBtn.style.pointerEvents = 'auto';
        }
    },

    setupListeners: function() {
        // Tie into the existing settings toggle
        const qcCb = document.getElementById('toggle-qc-cb');
        if (qcCb) {
            qcCb.addEventListener('change', (e) => {
                if (typeof window.toggleWidget === 'function') {
                    window.toggleWidget('qc-widget-wrapper', e.target.checked);
                }
            });
        }
    }
};

// --- GLOBAL BRIDGE ---
// Keep these functions globally accessible for the inline HTML onclick/oninput handlers
window.calcInches = () => ConverterEngine.calcInches();
window.toggleQuickConverter = () => ConverterEngine.toggle();

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    ConverterEngine.init();
});