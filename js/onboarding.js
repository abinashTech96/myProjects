// =========================================
// ONBOARDING ENGINE (onboarding.js)
// =========================================

const Onboarding = {
    step: 0,
    data: [
        { 
            icon: '✨', 
            title: 'Welcome to ArchCAD Pro', 
            desc: "Let's take a quick 3-step tour to get you familiar with your new high-performance workspace.", 
            targetId: null 
        },
        { 
            icon: '📐', 
            title: 'The Blueprint Canvas', 
            desc: 'Click and drag the grid to pan your view. Scroll your mouse wheel up and down to infinitely zoom in and out.', 
            targetId: 'blueprint' 
        },
        { 
            icon: '📋', 
            title: 'The Room Explorer', 
            desc: 'This is your Command Center. Use it to switch between floors and select individual rooms to edit their dimensions.', 
            targetId: 'sidebar' 
        },
        { 
            icon: '🧊', 
            title: 'Real-Time 3D Engine', 
            desc: 'Once your 2D plan is ready, click this button to instantly render a fully walkable 3D environment.', 
            targetId: 'mode-3d' 
        }
    ],

    // 🌟 1. NEW: Inject the Onboarding HTML dynamically
    buildUI() {
        if (document.getElementById('tour-backdrop')) return;

        const uiTemplate = `
            <div id="tour-backdrop" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(8px); z-index: 99998; display: none; transition: opacity 0.5s;"></div>
            <div id="tour-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 99999; display: none; justify-content: center; align-items: center; transition: opacity 0.5s;">
                <div id="tour-card" style="background: rgba(15, 23, 42, 0.95); padding: 30px; border-radius: 16px; max-width: 400px; text-align: center; pointer-events: auto; border: 1px solid rgba(56, 189, 248, 0.5); box-shadow: 0 20px 40px rgba(0,0,0,0.8); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
                    <div id="tour-icon" style="font-size: 3.5rem; margin-bottom: 15px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));"></div>
                    <h2 id="tour-title" style="margin-top: 0; color: #f8fafc; font-weight: 800; letter-spacing: 0.5px;"></h2>
                    <p id="tour-desc" style="color: #94a3b8; line-height: 1.6; margin-bottom: 25px; font-size: 0.95rem;"></p>
                    <div id="tour-dots" style="display: flex; justify-content: center; gap: 8px; margin-bottom: 25px;"></div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="tour-next-btn" onclick="Onboarding.next()" style="background: linear-gradient(135deg, #0ea5e9, #3b82f6); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4);">Next ➡️</button>
                        <button onclick="Onboarding.end()" style="background: transparent; color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 12px 16px; border-radius: 8px; font-weight: bold; cursor: pointer;">Skip</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', uiTemplate);
    },

    init() {
        if (!localStorage.getItem('ArchCAD_TourDone')) {
            this.buildUI(); // 🌟 ADD THIS LINE to inject the HTML!
            setTimeout(() => {
                const backdrop = document.getElementById('tour-backdrop');
                const overlay = document.getElementById('tour-overlay');
                
                if(!backdrop || !overlay) return;

                backdrop.style.display = 'block';
                overlay.style.display = 'flex';
                
                requestAnimationFrame(() => {
                    backdrop.style.opacity = '1';
                    overlay.style.opacity = '1';
                    document.getElementById('tour-card').style.transform = 'translateY(0) scale(1)';
                    document.getElementById('tour-card').style.opacity = '1';
                });
                
                this.renderStep();
            }, 400); 
        }
    },

    renderStep() {
        const stepData = this.data[this.step];
        
        // Update Content
        document.getElementById('tour-icon').innerText = stepData.icon;
        document.getElementById('tour-title').innerText = stepData.title;
        document.getElementById('tour-desc').innerText = stepData.desc;
        
        // Update Modern Pill Indicators
        const dotsContainer = document.getElementById('tour-dots');
        dotsContainer.innerHTML = this.data.map((_, i) => 
            `<div class="tour-pill ${i === this.step ? 'active' : ''}"></div>`
        ).join('');
        
        // Update Button
        const nextBtn = document.getElementById('tour-next-btn');
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
        
        const backdrop = document.getElementById('tour-backdrop');
        const overlay = document.getElementById('tour-overlay');
        const card = document.getElementById('tour-card');
        
        backdrop.style.opacity = '0';
        overlay.style.opacity = '0';
        
        // Animate card away
        card.style.transform = 'translateY(20px) scale(0.95)';
        card.style.opacity = '0';
        
        setTimeout(() => {
            backdrop.style.display = 'none';
            overlay.style.display = 'none';
        }, 500);
    }
};

// Start engine on load
window.addEventListener('DOMContentLoaded', () => Onboarding.init());