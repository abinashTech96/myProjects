// =========================================
// 🌟 CLIENT SHOWCASE MODE (showcase.js)
// =========================================

window.toggleShowcaseMode = function() {
    // 1. Force 3D mode if it isn't currently active
    if (typeof is3DMode !== 'undefined' && !is3DMode) {
        if (typeof window.toggle3D === 'function') window.toggle3D();
    }

    // 2. Toggle the CSS state class
    const isShowcase = document.body.classList.toggle('showcase-active');

    // 3. Handle the OS-Level Fullscreen API
    if (isShowcase) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen();
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen(); // Safari
        else if (elem.msRequestFullscreen) elem.msRequestFullscreen(); // IE11
    } else {
        if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        }
    }

    // 4. Force the Three.js renderer to recalculate its aspect ratio perfectly
    setTimeout(() => {
        if (typeof camera3D !== 'undefined' && typeof renderer3D !== 'undefined') {
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            // Adjust camera
            camera3D.aspect = width / height;
            camera3D.updateProjectionMatrix();
            
            // Adjust renderer
            renderer3D.setSize(width, height);
            
            // Re-render immediately to prevent flickering
            if (typeof scene3D !== 'undefined') {
                renderer3D.render(scene3D, camera3D);
            }
        }
    }, 100); // 100ms delay ensures the browser has finished resizing before calculating
};