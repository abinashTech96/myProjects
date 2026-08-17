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
    //{ id: 'door', icon: '🚪', label: 'Door', defWdh: 36, defHgt: 6 },
    //{ id: 'window', icon: '🪟', label: 'Window', defWdh: 48, defHgt: 6 },
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
const ASSET_CATALOGS = {
    rooms: {
        title: 'Rooms',
        items: INTERNAL_ROOM_CATALOG.map(room => ({
            type: room.id, icon: room.icon, label: room.label,
            w: room.defWdh || 120, h: room.defHgt || 120
        }))
    },
    furniture: {
        title: 'Furniture',
        items: INTERNAL_FURNITURE_CATALOG.map(furn => ({
            type: furn.id, icon: furn.icon, label: furn.label,
            w: furn.defWdh || 48, h: furn.defHgt || 48
        }))
    }
};

// =========================================
// 🚀 DRAG & DROP ENGINE LOGIC
// =========================================
const DragDropEngine = {
    currentSlide: 0, // 0 = Rooms, 1 = Furniture

    init: function() {
        const wrapper = document.getElementById('drag-drop-library-wrapper');
        if (!wrapper) return;

        wrapper.innerHTML = `
            <button id="dd-library-btn" title="Toggle Assets" onclick="DragDropEngine.togglePanel()">
                <span class="icon">📦</span>
            </button>
            <div id="dd-library-panel">
                
                <!-- 🌟 Header Title with Embedded Arrows -->
                <div class="dd-panel-header">
                    <div id="dd-nav-left" class="dd-nav-btn" onclick="DragDropEngine.switchSlide(0)">❮</div>
                    <span id="dd-panel-title">Rooms Catalog</span>
                    <div id="dd-nav-right" class="dd-nav-btn" onclick="DragDropEngine.switchSlide(1)">❯</div>
                </div>

                <!-- 🌟 Slider Window -->
                <div class="dd-slider-window">
                    <!-- The Track that slides left/right -->
                    <div id="dd-slider-track" class="dd-slider-track">
                        <!-- Pane 1: Rooms -->
                        <div class="dd-slide-pane explorer-scroll">
                            ${this.generateCatalogHTML('rooms')}
                        </div>
                        <!-- Pane 2: Furniture -->
                        <div class="dd-slide-pane explorer-scroll">
                            ${this.generateCatalogHTML('furniture')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindDragEvents();
        this.bindCanvasDrop();
        this.updateNavUI();
    },

    generateCatalogHTML: function(category) {
        const items = ASSET_CATALOGS[category]?.items || [];
        return items.map(item => `
            <div class="dd-item-row" draggable="true" data-type="${item.type}" data-category="${category}" data-w="${item.w}" data-h="${item.h}">
                <span class="dd-item-icon">${item.icon}</span>
                <span class="dd-item-label">${item.label}</span>
            </div>
        `).join('');
    },

    // 🌟 Slide Transition Logic
    switchSlide: function(index) {
        this.currentSlide = index;
        const track = document.getElementById('dd-slider-track');
        if (track) {
            track.style.transform = `translateX(-${index * 50}%)`;
        }
        this.updateNavUI();
    },

    // 🌟 Arrow & Title State Manager
    updateNavUI: function() {
        const leftBtn = document.getElementById('dd-nav-left');
        const rightBtn = document.getElementById('dd-nav-right');
        const title = document.getElementById('dd-panel-title');
        
        // 🌟 Map the slide index to the catalog keys
        const slideKeys = ['rooms', 'furniture'];
        const currentKey = slideKeys[this.currentSlide];

        if (this.currentSlide === 0) {
            if(leftBtn) leftBtn.classList.remove('visible');
            if(rightBtn) rightBtn.classList.add('visible');
        } else {
            if(leftBtn) leftBtn.classList.add('visible');
            if(rightBtn) rightBtn.classList.remove('visible');
        }

        // 🌟 Inject the dynamic title from the config
        if(title && ASSET_CATALOGS[currentKey]) {
            title.innerText = ASSET_CATALOGS[currentKey].title;
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
            row.addEventListener('dragend', () => row.style.opacity = '1');
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
            } catch (err) { console.error(err); }
        });
    },

    handleDrop: function(data, clientX, clientY) {
        const svg = document.getElementById('blueprint');
        const container = document.getElementById('element-container') || svg; 
        
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const svgP = pt.matrixTransform(container.getScreenCTM().inverse());
        
        let offsetX = 0; let offsetY = 0;
        let maxW = 5000; let maxH = 5000;

        if (typeof calculateGeometry === 'function') {
            const unit = document.getElementById('unitSelect') ? document.getElementById('unitSelect').value : 'in';
            const SCALE = parseFloat(document.getElementById('scaleInput') ? document.getElementById('scaleInput').value : 1.2) || 1.2;
            const geom = calculateGeometry(SCALE, unit);
            if (geom && geom.I) {
                offsetX = geom.I.x; offsetY = geom.I.y;    
                maxW = geom.inW || maxW; maxH = geom.inH || maxH;
            }
        }

        let relativeX = svgP.x - offsetX;
        let relativeY = svgP.y - offsetY;
        const currentFloor = typeof window.currentFloor !== 'undefined' ? window.currentFloor : 0;
        
        const w = data.w; const h = data.h;

        const newElement = {
            id: `${data.category}_${Date.now()}`,
            type: data.type,
            x: Math.max(0, Math.min(Math.round(relativeX - (w/2)), maxW - w)),
            y: Math.max(0, Math.min(Math.round(relativeY - (h/2)), maxH - h)),
            w: w, h: h, floor: currentFloor,
            ...(data.category === 'furniture' && { rotation: 0, isFurniture: true })
        };
        
        if (typeof window.elements !== 'undefined') window.elements.push(newElement);

        if (typeof updateCanvas === 'function') updateCanvas();
        if (typeof ProjectState !== 'undefined' && typeof ProjectState.save === 'function') ProjectState.save();
        else if (typeof saveState === 'function') saveState(); 
    }
};

document.addEventListener('DOMContentLoaded', () => DragDropEngine.init());