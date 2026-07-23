// constants.js
// --- 2D & CORE CONFIGURATION ---
const ARCH_CONFIG = {
    CANVAS: {
        CENTER_X: 500,
        CENTER_Y: 500,
        SNAP_TOLERANCE: 5,
        DEFAULT_SCALE: 1.2
    },
    DEFAULTS: {
        ROOM_W: 120,
        ROOM_H: 120,
        WALL_THICKNESS_3D: 4, // inches
        WALL_HEIGHT_3D: 120,  // inches
        DOOR_SIZE: 30,
        WINDOW_SIZE: 15,
        // 🌟 NEW: Core Spawning & Layout Constants
        SPAWN_X: 20,
        SPAWN_Y: 20,
        CLONE_OFFSET: 20,
        FIXTURE_OFFSET: 36,
        STAIRCASE: { w: 96, h: 144, x: 450, y: 20 },
        FURNITURE: {
            bed: { w: 72, h: 84 },
            nightstand: { w: 24, h: 18 },
            wardrobe: { w: 48, h: 24 },
            sofa: { w: 84, h: 36 },
            tv_unit: { w: 72, h: 18 },
            coffee_table: { w: 36, h: 24 },
            bookshelf: { w: 36, h: 12 },
            rug: { w: 96, h: 72 },
            dining: { w: 72, h: 48 },
            counter: { w: 96, h: 24 },
            island: { w: 72, h: 36 },
            fridge: { w: 36, h: 30 },
            stove: { w: 30, h: 24 },
            desk: { w: 48, h: 24 },
            chair: { w: 24, h: 24 },
            bathtub: { w: 60, h: 30 },
            toilet_seat: { w: 18, h: 30 },
            plant: { w: 18, h: 18 }
        }
    },
    // Unified color dictionary (combining 2D RGB and 3D Hex)
    COLORS: {
        living: { rgb: '168, 85, 247', hex: 0xa855f7 },
        bedroom: { rgb: '34, 197, 94', hex: 0x22c55e },
        toilet: { rgb: '129, 140, 248', hex: 0x818cf8 },
        kitchen: { rgb: '245, 158, 11', hex: 0xf59e0b },
        puja: { rgb: '236, 72, 153', hex: 0xec4899 },
        staircase: { rgb: '156, 163, 175', hex: 0x9ca3af },
        balcony: { rgb: '20, 184, 166', hex: 0x14b8a6 }
    },
    LAYOUTS: {
        '1bhk': [{ type: 'living', w: 192, h: 192, x: 20, y: 20 }, { type: 'kitchen', w: 120, h: 120, x: 230, y: 20 }, { type: 'bedroom', w: 144, h: 144, x: 20, y: 230 }, { type: 'toilet', w: 72, h: 96, x: 180, y: 230 }],
        '2bhk': [{ type: 'living', w: 192, h: 216, x: 20, y: 20 }, { type: 'kitchen', w: 120, h: 120, x: 230, y: 20 }, { type: 'bedroom', w: 144, h: 168, x: 20, y: 250 }, { type: 'toilet', w: 72, h: 96, x: 180, y: 250 }, { type: 'bedroom', w: 144, h: 144, x: 20, y: 440 }, { type: 'toilet', w: 72, h: 96, x: 180, y: 440 }],
        '3bhk': [{ type: 'living', w: 240, h: 240, x: 20, y: 20 }, { type: 'kitchen', w: 120, h: 144, x: 280, y: 20 }, { type: 'bedroom', w: 168, h: 168, x: 20, y: 280 }, { type: 'toilet', w: 72, h: 96, x: 200, y: 280 }, { type: 'bedroom', w: 144, h: 144, x: 20, y: 460 }, { type: 'toilet', w: 72, h: 96, x: 180, y: 460 }, { type: 'bedroom', w: 144, h: 144, x: 280, y: 460 }]
    }
};

// --- 3D ENGINE CONFIGURATION ---
const ARCH3D_CONFIG = {
    DEFAULTS: {
        WALL_THICKNESS: 4, // inches
        WALL_HEIGHT: 120   // inches
    },
    ADVANCED_UI: {
        ANIMATION_SPEED_MS: 300,
        ISOLATION_CUT_RATIO: 0.30, // Cuts walls at 30% height for dollhouse view
        // 🌟 NEW: Cinematic Drone Timings
        CINEMATIC: {
            SWEEP_OFFSET: 2000,
            SWEEP_DURATION_MS: 1200,
            RESET_DURATION_MS: 1000
        },
        GHOST_MATERIAL: {
            COLOR: 0x38bdf8,
            OPACITY: 0.1
        },
        CAMERA: {
            ISOLATED_ZOOM: 0.65,
            ISOLATED_Y_OFFSET: 1.6,
            ISOLATED_Z_OFFSET: 0.6,
            FLOOR_ZOOM: 1.5,
            FLOOR_X_OFFSET: 0.5,
            FLOOR_Y_OFFSET: 0.8,
            FLOOR_Z_OFFSET: 1.0
        }
    }
};


const FURNITURE_CATALOG = [
    { id: 'bed', icon: '🛏️', label: 'King Bed' },
    { id: 'nightstand', icon: '🪑', label: 'Nightstand' },
    { id: 'wardrobe', icon: '🚪', label: 'Wardrobe' },
    { id: 'sofa', icon: '🛋️', label: 'Sofa' },
    { id: 'tv_unit', icon: '📺', label: 'TV Unit' },
    { id: 'coffee_table', icon: '☕', label: 'Coffee Table' },
    { id: 'bookshelf', icon: '📚', label: 'Bookshelf' },
    { id: 'rug', icon: '🔲', label: 'Area Rug' },
    { id: 'dining', icon: '🍽️', label: 'Dining Table' },
    { id: 'counter', icon: '🍳', label: 'Counter' },
    { id: 'island', icon: '🏝️', label: 'Island' },
    { id: 'fridge', icon: '🧊', label: 'Fridge' },
    { id: 'stove', icon: '🔥', label: 'Stove' },
    { id: 'desk', icon: '💻', label: 'Desk' },
    { id: 'chair', icon: '🪑', label: 'Chair' },
    { id: 'bathtub', icon: '🛁', label: 'Bathtub' },
    { id: 'toilet_seat', icon: '🚽', label: 'Toilet' },
    { id: 'plant', icon: '🪴', label: 'Plant' }
];


// =========================================
// 🌟 NEW: FEATURE CONFIGURATIONS 🌟
// =========================================

const STUDIO_CONFIG = {
    GRID_SNAP_INCHES: 6,         // The step size when dragging furniture in Room Studio
    MAGNETIC_SNAP_DIST: 18,      // How close to a wall before it auto-rotates and flushes
    SELECTION_GLOW: 0x0ea5e9,    // The neon blue glow in 3D preview
    WALL_OPACITY: 0.35           // Translucency of walls in the Room Studio
};

const AI_CONFIG = {
    DEFAULT_PLOT_W: 278,         // Fallback width if input is empty
    DEFAULT_PLOT_H: 417,         // Fallback height if input is empty
    VASTU_PADDING_INCHES: 20     // Distance to keep AI-placed rooms away from the boundary walls
};

// =========================================
// 🌟 REFINEMENTS & SAFEGUARDS
// =========================================
ARCH_CONFIG.REFINEMENTS = {
    GHOST_FLOOR_OPACITY: 0.15,        // Faintness of the floor below
    SECTION_SNAP_TOLERANCE: 20,       // Distance to auto-snap section lines straight
    NIGHT_MODE_SUN_INTENSITY: 0.05,   // Dimmed moon-light level
    DAY_MODE_SUN_INTENSITY: 1.2,      // Standard sun level
    SMART_MERGE_TEXT_RADIUS: 150      // Merges duplicate room labels within this distance
};