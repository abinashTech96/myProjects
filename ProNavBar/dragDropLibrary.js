// =========================================
// 📦 DRAG & DROP ASSET LIBRARY ENGINE
// =========================================

// 🌟 INDEPENDENT DATA CATALOGS (WITH EMBEDDED DIMENSIONS)
const INTERNAL_ROOM_CATALOG = [
    { id: 'living', label: 'Living Room', icon: '📺', defWdh: 120, defHgt: 120 },
    { id: 'bedroom', label: 'Bedroom', icon: '🛏️', defWdh: 144, defHgt: 144 },
    { id: 'toilet', label: 'Toilet', icon: '🚽', defWdh: 48, defHgt: 84 },
    { id: 'kitchen', label: 'Kitchen', icon: '🍳', defWdh: 120, defHgt: 144 },
    { id: 'puja', label: 'Puja Room', icon: '🕉️', defWdh: 72, defHgt: 72 },
    { id: 'staircase', label: 'Staircase', icon: '🪜', defWdh: 132, defHgt: 84 },
    { id: 'balcony', label: 'Balcony', icon: '🌅', defWdh: 120, defHgt: 60 },
    { id: 'garage', label: 'Garage', icon: '🚗', defWdh: 240, defHgt: 240 },     // extra
    { id: 'office', label: 'Home Office', icon: '💼', defWdh: 120, defHgt: 120 } // extra
];

const INTERNAL_FURNITURE_CATALOG = [
    { id: 'door', icon: '🚪', label: 'Door', defWdh: 36, defHgt: 6 },
    { id: 'window', icon: '🪟', label: 'Window', defWdh: 48, defHgt: 6 },
    { id: 'bed', icon: '🛏️', label: 'King Bed', defWdh: 76, defHgt: 80 },
    { id: 'nightstand', icon: '🪑', label: 'Nightstand', defWdh: 24, defHgt: 24 },
    { id: 'wardrobe', icon: '🚪', label: 'Wardrobe', defWdh: 60, defHgt: 24 },
    { id: 'sofa', icon: '🛋️', label: 'Sofa', defWdh: 84, defHgt: 36 },
    { id: 'tv_unit', icon: '📺', label: 'TV Unit', defWdh: 60, defHgt: 18 },
    { id: 'coffee_table', icon: '☕', label: 'Coffee Table', defWdh: 48, defHgt: 24 },
    { id: 'bookshelf', icon: '📚', label: 'Bookshelf', defWdh: 36, defHgt: 12 },
    { id: 'rug', icon: '🔲', label: 'Area Rug', defWdh: 96, defHgt: 72 },
    { id: 'dining', icon: '🍽️', label: 'Dining Table', defWdh: 72, defHgt: 48 },
    { id: 'counter', icon: '🍳', label: 'Counter', defWdh: 72, defHgt: 24 },
    { id: 'island', icon: '🏝️', label: 'Island', defWdh: 48, defHgt: 36 },
    { id: 'fridge', icon: '🧊', label: 'Fridge', defWdh: 36, defHgt: 36 },
    { id: 'stove', icon: '🔥', label: 'Stove', defWdh: 30, defHgt: 30 },
    { id: 'desk', icon: '💻', label: 'Desk', defWdh: 60, defHgt: 30 },
    { id: 'chair', icon: '🪑', label: 'Chair', defWdh: 24, defHgt: 24 },
    { id: 'bathtub', icon: '🛁', label: 'Bathtub', defWdh: 60, defHgt: 30 },
    { id: 'toilet_seat', icon: '🚽', label: 'Toilet', defWdh: 24, defHgt: 36 },
    { id: 'plant', icon: '🪴', label: 'Plant', defWdh: 20, defHgt: 20 },
    { id: 'washing_machine', icon: '🧺', label: 'Washer', defWdh: 30, defHgt: 30 }, // extra
    { id: 'gym_bike', icon: '🚲', label: 'Gym Bike', defWdh: 48, defHgt: 24 }       // extra
];

// 🌟 ASSET CATALOG MAPPING (Extracts w and h safely)
const ASSET_CATALOGS = {
    rooms: INTERNAL_ROOM_CATALOG.map(room => ({
        type: room.id,
        icon: room.icon,
        label: room.label,
        w: room.defWdh || 120, // Fallback to 120 if missing
        h: room.defHgt || 120  // Fallback to 120 if missing
    })),
    furniture: INTERNAL_FURNITURE_CATALOG.map(furn => ({
        type: furn.id,
        icon: furn.icon,
        label: furn.label,
        w: furn.defWdh || 48,  // Fallback to 48 if missing
        h: furn.defHgt || 48   // Fallback to 48 if missing
    }))
};

// =========================================
// 🚀 DRAG & DROP ENGINE LOGIC
// =========================================
const DragDropEngine = {
    activeTab: 'rooms',

    init: function() {
        const wrapper = document.getElementById('drag-drop-library-wrapper');
        if (!wrapper) return;

        wrapper.innerHTML = `
            <button id="dd-library-btn" title="Toggle Assets" onclick="DragDropEngine.togglePanel()">
                <span class="icon">📦</span>
            </button>
            <div id="dd-library-panel">
                <div class="dd-tabs">
                    <button id="tab-rooms" class="dd-tab-btn active" onclick="DragDropEngine.switchTab('rooms')">Rooms</button>
                    <button id="tab-furniture" class="dd-tab-btn" onclick="DragDropEngine.switchTab('furniture')">Furniture</button>
                </div>
                <div id="dd-content-area" class="explorer-scroll">
                    ${this.generateCatalogHTML(this.activeTab)}
                </div>
            </div>
        `;

        this.bindDragEvents();
        this.bindCanvasDrop();
    },

    // 🌟 Inject width and height into HTML dataset attributes
    generateCatalogHTML: function(category) {
        const items = ASSET_CATALOGS[category] || [];
        return items.map(item => `
            <div class="dd-item-row" draggable="true" data-type="${item.type}" data-category="${category}" data-w="${item.w}" data-h="${item.h}">
                <span class="dd-item-icon">${item.icon}</span>
                <span class="dd-item-label">${item.label}</span>
            </div>
        `).join('');
    },

    switchTab: function(tabName) {
        this.activeTab = tabName;
        document.querySelectorAll('.dd-tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`tab-${tabName}`);
        if (activeBtn) activeBtn.classList.add('active');

        const contentArea = document.getElementById('dd-content-area');
        if (contentArea) {
            contentArea.innerHTML = this.generateCatalogHTML(tabName);
            this.bindDragEvents();
        }
    },

    togglePanel: function() {
        const panel = document.getElementById('dd-library-panel');
        const btn = document.getElementById('dd-library-btn');
        if (!panel) return;
        
        if (panel.classList.contains('open')) {
            panel.classList.remove('open');
            if (btn) btn.classList.remove('active');
        } else {
            panel.classList.add('open');
            if (btn) btn.classList.add('active');
        }
    },

    // =========================================
    // 🖱️ DRAG & DROP EVENT HANDLERS
    // =========================================

    bindDragEvents: function() {
        const rows = document.querySelectorAll('.dd-item-row');
        rows.forEach(row => {
            row.addEventListener('dragstart', (e) => {
                // 🌟 Package the payload with exact dimensions
                const payload = {
                    type: row.dataset.type,
                    category: row.dataset.category,
                    w: parseInt(row.dataset.w),
                    h: parseInt(row.dataset.h)
                };
                e.dataTransfer.setData('application/json', JSON.stringify(payload));
                e.dataTransfer.effectAllowed = 'copy';
                setTimeout(() => row.style.opacity = '0.4', 0);
            });

            row.addEventListener('dragend', () => {
                row.style.opacity = '1';
            });
        });
    },

    bindCanvasDrop: function() {
        const svg = document.getElementById('blueprint');
        if (!svg) return;

        svg.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            e.dataTransfer.dropEffect = 'copy';
        });

        svg.addEventListener('drop', (e) => {
            e.preventDefault();
            const dataStr = e.dataTransfer.getData('application/json');
            if (!dataStr) return;

            try {
                const data = JSON.parse(dataStr);
                DragDropEngine.handleDrop(data, e.clientX, e.clientY);
            } catch (err) {
                console.error("Failed to parse dropped item:", err);
            }
        });
    },

    handleDrop: function(data, clientX, clientY) {
        const svg = document.getElementById('blueprint');
        const container = document.getElementById('element-container') || svg; 
        
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const svgP = pt.matrixTransform(container.getScreenCTM().inverse());
        
        let offsetX = 0;
        let offsetY = 0;
        let maxW = 5000; 
        let maxH = 5000;

        if (typeof calculateGeometry === 'function') {
            const unit = document.getElementById('unitSelect') ? document.getElementById('unitSelect').value : 'in';
            const SCALE = parseFloat(document.getElementById('scaleInput') ? document.getElementById('scaleInput').value : 1.2) || 1.2;
            const geom = calculateGeometry(SCALE, unit);
            if (geom && geom.I) {
                offsetX = geom.I.x;    
                offsetY = geom.I.y;    
                maxW = geom.inW || maxW;
                maxH = geom.inH || maxH;
            }
        } else {
            const innerRect = document.getElementById('inner-rect');
            if (innerRect) {
                offsetX = parseFloat(innerRect.getAttribute('x')) || 0;
                offsetY = parseFloat(innerRect.getAttribute('y')) || 0;
            }
        }

        let relativeX = svgP.x - offsetX;
        let relativeY = svgP.y - offsetY;
        const currentFloor = typeof window.currentFloor !== 'undefined' ? window.currentFloor : 0;
        
        // 🌟 Pull dimensions directly from the dropped payload
        const w = data.w;
        const h = data.h;

        if (data.category === 'rooms') {
            const newRoom = {
                id: `room_${Date.now()}`,
                type: data.type,
                x: Math.max(0, Math.min(Math.round(relativeX - (w/2)), maxW - w)),
                y: Math.max(0, Math.min(Math.round(relativeY - (h/2)), maxH - h)),
                w: w, 
                h: h,
                floor: currentFloor
            };
            
            if (typeof window.elements !== 'undefined') window.elements.push(newRoom);

        } else if (data.category === 'furniture') {
            const newFurn = {
                id: `furn_${Date.now()}`,
                type: data.type,
                x: Math.max(0, Math.min(Math.round(relativeX - (w/2)), maxW - w)),
                y: Math.max(0, Math.min(Math.round(relativeY - (h/2)), maxH - h)),
                w: w,
                h: h,
                rotation: 0,
                floor: currentFloor,
                isFurniture: true
            };
            
            if (typeof window.elements !== 'undefined') window.elements.push(newFurn);
        }

        if (typeof updateCanvas === 'function') updateCanvas();
        
        if (typeof ProjectState !== 'undefined' && typeof ProjectState.save === 'function') {
            ProjectState.save();
        } else if (typeof saveState === 'function') {
            saveState(); 
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    DragDropEngine.init();
});