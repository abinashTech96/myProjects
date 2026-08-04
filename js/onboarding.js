// =========================================
// ✨ ONBOARDING ENGINE (onboarding.js)
// Single-File Component (CSS + JS)
// =========================================

// 1. INJECT PREMIUM CSS
const onboardingStyles = `
    /* --- Ultra-Light Crystal Glass Backdrop --- */
    .ob-backdrop {
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(255, 255, 255, 0.03); 
        backdrop-filter: blur(10px) brightness(115%) saturate(120%);
        -webkit-backdrop-filter: blur(10px) brightness(115%) saturate(120%);
        z-index: 99998;
        opacity: 0;
        display: none;
        transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .ob-overlay-container {
        position: fixed;
        top: 0; left: 0; width: 100vw; height: 100vh;
        z-index: 99999;
        display: none;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.5s ease;
    }

    /* --- The Glassmorphic Card --- */
    .ob-card {
        pointer-events: auto;
        background: linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-top: 3px solid #f59e0b;
        border-radius: 16px;
        padding: 35px 30px;
        width: 380px;
        text-align: center;
        box-shadow: 0 30px 60px rgba(0,0,0,0.6), inset 0 1px 15px rgba(139, 92, 246, 0.1);
        transform: translateY(20px) scale(0.95);
        opacity: 0;
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    /* Active Animation States */
    .ob-active { opacity: 1 !important; }
    .ob-card.ob-active { transform: translateY(0) scale(1); opacity: 1; }

    /* --- Floating Icon Array --- */
    .ob-icon-container {
        display: inline-block;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.05);
        padding: 15px;
        border-radius: 50%;
        margin-bottom: 20px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }

    .ob-icon {
        font-size: 3rem;
        line-height: 1;
        animation: obFloatIcon 3s ease-in-out infinite;
        filter: drop-shadow(0 4px 6px rgba(245, 158, 11, 0.4));
    }

    .ob-title {
        color: #f8fafc;
        margin-top: 0;
        margin-bottom: 12px;
        font-weight: 800;
        letter-spacing: 0.5px;
        font-size: 1.4rem;
    }

    .ob-desc {
        color: #94a3b8;
        font-size: 0.9rem;
        margin-bottom: 30px;
        line-height: 1.6;
    }

    /* --- Modern Expanding Pills --- */
    .ob-dots {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-bottom: 25px;
    }

    .ob-pill {
        width: 8px; height: 8px;
        border-radius: 4px;
        background: rgba(139, 92, 246, 0.2);
        transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
    }

    .ob-pill.active {
        width: 24px;
        background: #f59e0b;
        box-shadow: 0 0 12px rgba(245, 158, 11, 0.5);
    }

    /* --- Actions & Buttons --- */
    .ob-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid rgba(255,255,255,0.05);
        padding-top: 20px;
    }

    .ob-btn-skip {
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 600;
        transition: 0.2s;
    }

    .ob-btn-skip:hover { color: #a78bfa; }

    .ob-btn-primary {
        background: linear-gradient(135deg, #f59e0b, #ea580c);
        color: #fff;
        border: none;
        padding: 10px 24px;
        border-radius: 8px;
        font-weight: 800;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(234, 88, 12, 0.4);
    }

    .ob-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(234, 88, 12, 0.6);
    }

    @keyframes obFloatIcon {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-8px) rotate(5deg); }
    }
`;

// Insert the CSS into the <head> automatically
document.head.insertAdjacentHTML("beforeend", `<style>${onboardingStyles}</style>`);


// 2. ENGINE LOGIC
const Onboarding = {
    step: 0,
    data: [
        { 
            icon: '✨', 
            title: 'Welcome to ArchCAD Pro', 
            desc: "Let's take a quick 3-step tour to get you familiar with your new high-performance workspace."
        },
        { 
            icon: '📐', 
            title: 'The Blueprint Canvas', 
            desc: 'Click and drag the grid to pan your view. Scroll your mouse wheel up and down to infinitely zoom in and out.'
        },
        { 
            icon: '📋', 
            title: 'The Room Explorer', 
            desc: 'This is your Command Center. Use it to switch between floors and select individual rooms to edit their dimensions.'
        },
        { 
            icon: '🧊', 
            title: 'Real-Time 3D Engine', 
            desc: 'Once your 2D plan is ready, click this button to instantly render a fully walkable 3D environment.'
        }
    ],

    // 🌟 CLEAN UI INJECTION
    buildUI() {
        if (document.getElementById('ob-backdrop')) return;

        const uiTemplate = `
            <div id="ob-backdrop" class="ob-backdrop"></div>
            <div id="ob-overlay" class="ob-overlay-container">
                <div id="ob-card" class="ob-card">
                    <div class="ob-icon-container">
                        <div id="ob-icon" class="ob-icon"></div>
                    </div>
                    <h2 id="ob-title" class="ob-title"></h2>
                    <p id="ob-desc" class="ob-desc"></p>
                    
                    <div id="ob-dots" class="ob-dots"></div>
                    
                    <div class="ob-actions">
                        <button class="ob-btn-skip" onclick="Onboarding.end()">Skip Tour</button>
                        <button id="ob-next-btn" class="ob-btn-primary" onclick="Onboarding.next()">Next ➡️</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', uiTemplate);
    },

    init() {
        if (!localStorage.getItem('ArchCAD_TourDone')) {
            this.buildUI(); 
            
            setTimeout(() => {
                const backdrop = document.getElementById('ob-backdrop');
                const overlay = document.getElementById('ob-overlay');
                const card = document.getElementById('ob-card');
                
                if(!backdrop || !overlay) return;

                // 1. Un-hide elements
                backdrop.style.display = 'block';
                overlay.style.display = 'flex';
                
                // 2. Trigger CSS Transitions
                requestAnimationFrame(() => {
                    backdrop.classList.add('ob-active');
                    overlay.classList.add('ob-active');
                    card.classList.add('ob-active');
                });
                
                this.renderStep();
            }, 400); 
        }
    },

    renderStep() {
        const stepData = this.data[this.step];
        
        // Update Content
        document.getElementById('ob-icon').innerText = stepData.icon;
        document.getElementById('ob-title').innerText = stepData.title;
        document.getElementById('ob-desc').innerText = stepData.desc;
        
        // Update Modern Pill Indicators
        const dotsContainer = document.getElementById('ob-dots');
        dotsContainer.innerHTML = this.data.map((_, i) => 
            `<div class="ob-pill ${i === this.step ? 'active' : ''}"></div>`
        ).join('');
        
        // Update Button
        const nextBtn = document.getElementById('ob-next-btn');
        nextBtn.innerText = this.step === this.data.length - 1 ? 'Start Designing 🚀' : 'Next ➡️';
    },

    next() {
        if (this.step < this.data.length - 1) {
            this.step++;
            this.renderStep();
        } else {
            this.end();
        }
    },

    end() {
        localStorage.setItem('ArchCAD_TourDone', 'true');
        
        const backdrop = document.getElementById('ob-backdrop');
        const overlay = document.getElementById('ob-overlay');
        const card = document.getElementById('ob-card');
        
        if (!backdrop || !overlay) return;

        // 1. Trigger CSS Fade Out
        backdrop.classList.remove('ob-active');
        overlay.classList.remove('ob-active');
        card.classList.remove('ob-active'); 
        
        // 2. Remove from display flow after transition
        setTimeout(() => {
            backdrop.style.display = 'none';
            overlay.style.display = 'none';
        }, 600);
    }
};

// Start engine on load
window.addEventListener('DOMContentLoaded', () => Onboarding.init());