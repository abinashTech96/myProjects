// =========================================
// 🎥 CINEMATIC 3D TOUR ENGINE (tour.js)
// =========================================

window.tourWaypoints = [];
window.isPlayingTour = false;
window.tourAnimationId = null;

window.captureWaypoint = function() {
    if (!window.Engine3D || !Engine3D.camera || !Engine3D.controls) {
        console.warn("3D Engine not fully initialized yet.");
        return;
    }
    
    const point = {
        position: { x: Engine3D.camera.position.x, y: Engine3D.camera.position.y, z: Engine3D.camera.position.z },
        target: { x: Engine3D.controls.target.x, y: Engine3D.controls.target.y, z: Engine3D.controls.target.z }
    };
    
    window.tourWaypoints.push(point);
    console.log(`Waypoint captured! Total: ${window.tourWaypoints.length}`);
    
    const wpCount = document.getElementById('wp-count');
    if (wpCount) {
        wpCount.innerText = window.tourWaypoints.length;
        wpCount.style.transform = 'scale(1.2)';
        setTimeout(() => wpCount.style.transform = 'scale(1)', 200);
    }
};

window.clearTour = function() {
    window.tourWaypoints = [];
    window.isPlayingTour = false;
    if (window.tourAnimationId) cancelAnimationFrame(window.tourAnimationId);
    
    console.log("Tour waypoints cleared.");
    
    const wpCount = document.getElementById('wp-count');
    if (wpCount) wpCount.innerText = "0";
};

window.playCinematicTour = function() {
    if (window.tourWaypoints.length < 2) {
        alert("Please capture at least 2 waypoints to play a cinematic tour.");
        return;
    }
    
    if (!window.Engine3D || !Engine3D.camera || !Engine3D.controls) {
        console.warn("3D Engine not fully initialized yet.");
        return;
    }

    if (window.isPlayingTour) return;
    window.isPlayingTour = true;
    
    Engine3D.controls.enabled = false; 
    
    let currentWpIndex = 0;
    const durationPerPoint = 3000;
    let startTime = performance.now();
    
    function animateTour(time) {
        if (!window.isPlayingTour) return;
        
        const elapsed = time - startTime;
        let rawProgress = elapsed / durationPerPoint;
        
        const startWp = window.tourWaypoints[currentWpIndex];
        const endWp = window.tourWaypoints[currentWpIndex + 1];
        
        if (rawProgress < 1) {
            let progress = rawProgress * rawProgress * (3 - 2 * rawProgress); 
            
            Engine3D.camera.position.lerpVectors(
                new THREE.Vector3(startWp.position.x, startWp.position.y, startWp.position.z), 
                new THREE.Vector3(endWp.position.x, endWp.position.y, endWp.position.z), 
                progress
            );
            
            Engine3D.controls.target.lerpVectors(
                new THREE.Vector3(startWp.target.x, startWp.target.y, startWp.target.z), 
                new THREE.Vector3(endWp.target.x, endWp.target.y, endWp.target.z), 
                progress
            );
            
            Engine3D.controls.update(); 
            window.tourAnimationId = requestAnimationFrame(animateTour);
        } else {
            Engine3D.camera.position.set(endWp.position.x, endWp.position.y, endWp.position.z);
            Engine3D.controls.target.set(endWp.target.x, endWp.target.y, endWp.target.z);
            Engine3D.controls.update();

            currentWpIndex++;
            
            if (currentWpIndex >= window.tourWaypoints.length - 1) {
                window.isPlayingTour = false;
                Engine3D.controls.enabled = true;
            } else {
                startTime = time; 
                window.tourAnimationId = requestAnimationFrame(animateTour);
            }
        }
    }
    
    window.tourAnimationId = requestAnimationFrame(animateTour);
};

// 🌟 FIX: Map these to match your exact HTML onclick calls (`captureWaypoint`, `playCinematicTour`, `clearTour`)
window.addWaypoint = window.captureWaypoint; 
window.playTour = window.playCinematicTour; 
window.clearWaypoints = window.clearTour;