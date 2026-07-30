// =========================================
// 📡 GLOBAL EVENT BUS (core/events.js)
// =========================================
// This acts as the central communication hub for the entire application.

const ArchEventBus = new EventTarget();

const AppEvents = {
    // Call this whenever the building data (elements/fixtures) changes
    triggerStateChange() {
        ArchEventBus.dispatchEvent(new Event('app:stateChanged'));
    },
    
    // Call this whenever the active selected room changes
    triggerSelectionChange() {
        ArchEventBus.dispatchEvent(new Event('app:selectionChanged'));
    },

    // UI/Engine listeners
    onStateChange(callback) {
        ArchEventBus.addEventListener('app:stateChanged', callback);
    },
    
    onSelectionChange(callback) {
        ArchEventBus.addEventListener('app:selectionChanged', callback);
    }
};