// =========================================
// REAL-3D TEXTURE MANAGER
// =========================================
const texLoader = new THREE.TextureLoader();
function loadRepeatTex(url, scale) {
    const tex = texLoader.load(url, () => { Engine3D.needsRender = true; });
    tex.encoding = THREE.sRGBEncoding;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(scale, scale);
    return tex;
}
// Materials and network textures are created only when textured mode needs them.
const HD_TEXTURES = {};
function getHDMaterial(type) {
    if (HD_TEXTURES[type]) return HD_TEXTURES[type];
    // Local procedural finishes work offline and never depend on remote texture URLs.
    const roughness = {wood:0.55,grass:1,'kitchen-tile':0.25,'bathroom-tile':0.3,concrete:0.95,shingle:0.9};
    if (!(type in roughness)) return null;
    return HD_TEXTURES[type] = new THREE.MeshStandardMaterial({map:getProceduralTexture(type), roughness:roughness[type]});
}
const FAST_COLORS = {
    'wood': new THREE.MeshStandardMaterial({ color: 0x8b5a2b }),
    'grass': new THREE.MeshStandardMaterial({ color: 0x228b22 }), // Flat Green
    'kitchen-tile': new THREE.MeshStandardMaterial({ color: 0xffffff }),
    'bathroom-tile': new THREE.MeshStandardMaterial({ color: 0xbae6fd }),
    'concrete': new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
};


// =========================================
// PROCEDURAL TEXTURE GENERATOR (Real3D)
// =========================================
const textureCache = {};

function getProceduralTexture(type) {
    if (textureCache[type]) return textureCache[type];

    const canvas = document.createElement('canvas');
    canvas.width = 256; 
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (type === 'wood') {
        // Hardwood Floor Pattern
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#6b4226';
        for(let i=0; i<256; i+=32) {
            ctx.fillRect(0, i, 256, 2); // Planks
            for(let j=0; j<5; j++) {
                ctx.fillRect(Math.random()*256, i+Math.random()*32, Math.random()*40+20, 1); // Wood grain
            }
        }
    } else if (type === 'bathroom-tile') {
        // Light Blue/Cyan water-resistant tile for Toilets
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 4;
        for(let i=0; i<=256; i+=32) { // Smaller 32px grids
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
        }
    } else if (type === 'kitchen-tile') {
        // Classic Black & White checkered tile for Kitchens
        for(let i=0; i<256; i+=64) {
            for(let j=0; j<256; j+=64) {
                ctx.fillStyle = ((i/64 + j/64) % 2 === 0) ? '#f8fafc' : '#334155';
                ctx.fillRect(i, j, 64, 64);
            }
        }
    } else if (type === 'brick' || type === 'tile') {
        ctx.fillStyle = type === 'brick' ? '#b8ada0' : '#59473b';
        ctx.fillRect(0, 0, 256, 256);
        const brick = type === 'brick', width = brick ? 64 : 64, height = brick ? 32 : 64;
        for (let y = 0; y < 256; y += height) {
            const offset = brick && (y / height) % 2 ? width / 2 : 0;
            for (let x = -width; x < 256; x += width) {
                ctx.fillStyle = brick ? ['#a96146','#b77453','#99583f'][(x / width + y / height + 12) % 3] : '#ad6548';
                ctx.fillRect(x + offset + 2, y + 2, width - 4, height - 4);
                ctx.fillStyle = brick ? 'rgba(62,35,20,.12)' : 'rgba(255,213,170,.18)';
                ctx.fillRect(x + offset + 4, y + 4, width - 8, 2);
            }
        }
    } else if (type === 'grass') {
        // Lawn / Balcony Turf Pattern
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#16a34a';
        for(let i=0; i<2000; i++) {
            ctx.fillRect(Math.random()*256, Math.random()*256, 2, 6); // Grass blades
        }
    } else if (type === 'shingle') {
        const colors = ['#8f4236', '#7b3e34', '#5c2e26', '#6d4c4a', '#8a4b43', '#4a2c2a'];
        ctx.fillStyle = '#2c1b18';
        ctx.fillRect(0, 0, 256, 256);

        const sW = 64; // Shingle Width
        const sH = 32; // Shingle Height

        for (let y = 0; y < 256; y += sH) {
            // Offset every other row by half a shingle to create the staggered look
            const offset = (y / sH) % 2 === 0 ? 0 : sW / 2;
            
            for (let x = -sW; x < 256; x += sW) {
                // Pick a random terracotta/brown color
                ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                ctx.fillRect(x + offset, y, sW - 2, sH - 2); // 2px gap for shadows

                // Add grit/noise for the asphalt texture
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                for(let k = 0; k < 30; k++) {
                    ctx.fillRect(x + offset + Math.random()*(sW-2), y + Math.random()*(sH-2), 2, 2);
                }
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(x + offset, y + sH - 6, sW - 2, 4);
            }
        }
    }
    else {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#cbd5e1';
        for(let i=0; i<1000; i++) {
            ctx.fillRect(Math.random()*256, Math.random()*256, 2, 2); // Concrete speckles
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    textureCache[type] = texture;
    return texture;
}

function getTextureForRoom(roomObj) {
    if (roomObj && roomObj.material && roomObj.material !== 'auto') {
        return roomObj.material;
    }
    const roomType = typeof roomObj === 'string' ? roomObj : roomObj.type;
    if (['living', 'bedroom'].includes(roomType)) return 'wood';
    if (['toilet'].includes(roomType)) return 'bathroom-tile';
    if (['kitchen'].includes(roomType)) return 'kitchen-tile';
    if (['balcony'].includes(roomType)) return 'grass';
    return 'concrete';
}
// 🧠 THE DECISION MAKER
function getFloorMaterial(texType, explicit = false) {
    const real3DCheckbox = document.getElementById('real3DToggle');
    const isReal3D = real3DCheckbox ? real3DCheckbox.checked : false;
    if (isReal3D || explicit || (typeof StudioUI !== "undefined" && StudioUI.mode === "4d")) {
        const material = getHDMaterial(texType);
        if (material) return material;
    }
    return FAST_COLORS[texType] || FAST_COLORS['concrete'];
}
// 🌟 NEW: Global Texture Cache Cleanup
window.clearTextureCache = function() {
    for (const key in textureCache) {
        if (textureCache[key]) {
            textureCache[key].dispose();
        }
    }
    for (const key in textureCache) delete textureCache[key];
    console.log("🧹 Texture Cache Cleared");
};

// =========================================
// 🚀 IDLE TEXTURE PRE-CACHING
// =========================================
function preloadProceduralTextures() {
    const runWhenIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    runWhenIdle(() => {
        console.log("⏳ Pre-generating procedural 3D textures in background...");
        const textureTypes = ['wood', 'bathroom-tile', 'kitchen-tile', 'grass', 'shingle', 'concrete'];
        textureTypes.forEach(type => {
            getProceduralTexture(type);
        });
        console.log("✅ 3D Textures ready!");
    });
}
// Textures are generated on demand by getProceduralTexture().
