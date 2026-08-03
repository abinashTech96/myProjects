// =========================================
// 📡 GLOBAL EVENT BUS (core/events.js)
// =========================================
// Explicitly attached to 'window' to guarantee global scope across all files.

window.ArchEventBus = new EventTarget();

window.AppEvents = {
    // Call this whenever the building data (elements/fixtures) changes
    triggerStateChange() {
        window.ArchEventBus.dispatchEvent(new Event('app:stateChanged'));
    },
    
    // Call this whenever the active selected room changes
    triggerSelectionChange() {
        window.ArchEventBus.dispatchEvent(new Event('app:selectionChanged'));
    },

    // UI/Engine listeners
    onStateChange(callback) {
        window.ArchEventBus.addEventListener('app:stateChanged', callback);
    },
    
    onSelectionChange(callback) {
        window.ArchEventBus.addEventListener('app:selectionChanged', callback);
    }
};