// =========================================
// 📏 QUICK CONVERTER ENGINE (converter.js)
// =========================================

window.calcInches = () => { 
    const ftInput = document.getElementById('calcFt');
    const inInput = document.getElementById('calcIn');
    
    const ft = parseFloat(ftInput.value) || 0; 
    const inc = parseFloat(inInput.value) || 0; 
    const total = ft * 12 + inc;
    
    // Update the main big result
    document.getElementById('resIn').value = total + " in"; 

    // Update the micro-inputs and text in the minimized pill
    const minFt = document.getElementById('minFt');
    const minIn = document.getElementById('minIn');
    const minText = document.getElementById('qc-min-text');
    
    // Check activeElement so we don't accidentally overwrite the input the user is currently typing in
    if (minFt && document.activeElement !== minFt) minFt.value = ftInput.value;
    if (minIn && document.activeElement !== minIn) minIn.value = inInput.value;
    if (minText) minText.innerText = total + '"';
};

window.toggleQuickConverter = function() {
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
};

// --- Self-Contained Settings Toggle ---
document.addEventListener('DOMContentLoaded', () => {
    const qcCb = document.getElementById('toggle-qc-cb');
    if (qcCb) {
        qcCb.addEventListener('change', (e) => {
            if (typeof window.toggleWidget === 'function') {
                window.toggleWidget('qc-widget-wrapper', e.target.checked);
            }
        });
    }
});