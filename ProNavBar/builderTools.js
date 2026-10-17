// =========================================
// ✨ BUILDER TOOLS & AI AGENT ENGINE
// =========================================

const BuilderToolsEngine = {
    init: function() {
        this.initAutoBuilder();
        this.initAIAgent();
        
        // Execute dropdown population securely
        if (typeof this.populateAIModelDropdown === 'function') {
            this.populateAIModelDropdown();
        }
    },

    // -----------------------------------------
    // 1. AUTO-BUILDER UI MODULE
    // -----------------------------------------
    initAutoBuilder: function() {
        if (document.getElementById('autobuilder-modal-container')) return;

        const modalContainer = document.createElement('div');
        modalContainer.id = 'autobuilder-modal-container';
        
        modalContainer.innerHTML = `
            <div id="autobuilder-backdrop" onclick="toggleAutoBuilder()"></div>
            <div id="autobuilder-modal" class="glass-panel">
                <div class="builder-header orange">
                    <div class="builder-header-title">
                        <span class="icon">✨</span><h2>AUTO-BUILDER</h2>
                    </div>
                    <button class="builder-close-btn" onclick="toggleAutoBuilder()">&times;</button>
                </div>
                <div class="glass-field ab-input-row">
                    <label>Total Floors:</label>
                    <input type="number" id="b-floors" class="neo-sunken ab-floors-input" value="1" min="1" max="10" oninput="renderFloorSelectors()">
                </div>
                <div id="floor-layout-selectors" class="ab-selectors-container"></div>
                <button class="ab-generate-btn" onclick="generateBuilding(); toggleAutoBuilder();">
                    <span class="btn-icon">🏗️</span> <span class="btn-text">GENERATE BUILDING</span>
                </button>
            </div>
        `;
        document.body.appendChild(modalContainer);
    },

    toggleAutoBuilder: function() {
        // 1. Force the Settings Menu to close
        const settingsOverlay = document.getElementById('settings-overlay');
        if (settingsOverlay) {
            settingsOverlay.style.opacity = '0';
            settingsOverlay.style.transform = 'scale(0)';
            setTimeout(() => settingsOverlay.style.display = 'none', 300);
        }

        // 2. Open the Centered Auto-Builder Modal
        const backdrop = document.getElementById('autobuilder-backdrop');
        const modal = document.getElementById('autobuilder-modal');
        if (!modal || !backdrop) return;
        
        const isShowing = modal.style.display === 'block';
        if (!isShowing) {
            backdrop.style.display = 'block';
            modal.style.display = 'block';
            setTimeout(() => {
                backdrop.style.opacity = '1';
                modal.style.opacity = '1';
                modal.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
            if (typeof renderFloorSelectors === 'function') renderFloorSelectors();
        } else {
            backdrop.style.opacity = '0';
            modal.style.opacity = '0';
            modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                backdrop.style.display = 'none';
                modal.style.display = 'none';
            }, 300);
        }
    },

    // -----------------------------------------
    // 2. AI AGENT UI MODULE
    // -----------------------------------------
    initAIAgent: function() {
        if (document.getElementById('ai-agent-modal-container')) return;

        const modalContainer = document.createElement('div');
        modalContainer.id = 'ai-agent-modal-container';
        
        modalContainer.innerHTML = `
            <div id="ai-agent-backdrop" onclick="toggleAIAgent()"></div>
            <div id="ai-agent-modal" class="glass-panel">
                <div class="builder-header purple">
                    <div class="builder-header-title">
                        <span class="icon">🤖</span><h2>AI ASSISTANT</h2>
                    </div>
                    <button class="builder-close-btn" onclick="toggleAIAgent()">&times;</button>
                </div>
                
                <div>
                    <div class="ai-field-group">
                        <label class="ai-field-label">ACTIVE MODEL</label>
                        <select id="ai-model-select" class="modern-select neo-sunken" style="width:100%;"></select>
                    </div>

                    <div class="ai-field-group">
                        <label class="ai-field-label">PROMPT COMMAND</label>
                        <textarea id="ai-input" class="neo-sunken ai-prompt-input" placeholder="e.g., Add a 10x12 master bedroom on the left..."></textarea>
                    </div>
                    
                    <button id="ai-generate-btn" class="theme-purple-btn ai-generate-btn" onclick="handleAICommand()">
                        <span class="btn-icon">✨</span> <span class="btn-text">GENERATE LAYOUT</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalContainer);
    },

    toggleAIAgent: function() {
        // 1. Force the Settings Menu to close
        const settingsOverlay = document.getElementById('settings-overlay');
        if (settingsOverlay) {
            settingsOverlay.style.opacity = '0';
            settingsOverlay.style.transform = 'scale(0)';
            setTimeout(() => settingsOverlay.style.display = 'none', 300);
        }

        // 2. Open the Centered AI Agent Modal
        const backdrop = document.getElementById('ai-agent-backdrop');
        const modal = document.getElementById('ai-agent-modal');
        if (!modal || !backdrop) return;
        
        const isShowing = modal.style.display === 'block';
        if (!isShowing) {
            backdrop.style.display = 'block';
            modal.style.display = 'block';
            setTimeout(() => {
                backdrop.style.opacity = '1';
                modal.style.opacity = '1';
                modal.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
        } else {
            backdrop.style.opacity = '0';
            modal.style.opacity = '0';
            modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                backdrop.style.display = 'none';
                modal.style.display = 'none';
            }, 300);
        }
    },

    populateAIModelDropdown: function() {
        const selectEl = document.getElementById('ai-model-select');
        if (!selectEl) return;
        if (selectEl.options.length > 0) return;
        selectEl.innerHTML = '';
        if (typeof CONFIG === 'undefined' || !CONFIG.MODELS) {
            console.error("❌ CONFIG.MODELS is missing. Check config.js!");
            const errOpt = document.createElement('option');
            errOpt.textContent = "⚠️ Error: Check config.js";
            selectEl.appendChild(errOpt);
            return;
        }
        const groups = {};
        Object.entries(CONFIG.MODELS).forEach(([key, model]) => {
            const groupName = model.group || 'General';
            if (!groups[groupName]) {
                groups[groupName] = document.createElement('optgroup');
                groups[groupName].label = groupName;
            }
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = model.label;
            if (key === CONFIG.DEFAULT_MODEL) opt.selected = true;
            groups[groupName].appendChild(opt);
        });
        Object.values(groups).forEach(groupEl => selectEl.appendChild(groupEl));
        selectEl.addEventListener('change', function() {
            CONFIG.ACTIVE_LLM = this.value;
            console.log('🔄 AI Model Switched to:', this.value);
        });
        if (selectEl.hasAttribute('data-customized')) {
            const wrapper = selectEl.parentNode;
            if (wrapper && wrapper.classList.contains('pro-dropdown-wrapper')) {
                wrapper.parentNode.insertBefore(selectEl, wrapper);
                wrapper.remove();
                selectEl.removeAttribute('data-customized');
                selectEl.style.display = '';
                if (typeof initAnimatedDropdowns === 'function') {
                    initAnimatedDropdowns();
                }
            }
        }
    }
};

// =========================================
// 🧠 AI AGENT LOGIC ENGINE
// =========================================
const AIAgent = {
    processCommand(prompt){StudioUI.aiDialog();document.getElementById('studio-ai-prompt').value=prompt;return Promise.resolve()},
    _executePlan(plan){StudioUI.previewPlan(plan)},
    execute(plan){StudioUI.previewPlan([plan])},
    calculateZoneCoordinates(zone,w,h){const {inW,inH,SCALE}=Utils.getMetrics();return ProjectModel.zonePosition(zone,w,h,inW/SCALE,inH/SCALE,globalCompassDir,20)}
};

// =========================================
// 🌐 GLOBAL HOOKS
// =========================================
window.handleAICommand = function() {
    const input = document.getElementById('ai-input');
    const prompt = input.value.trim();
    if (!prompt) return;
    
    const btn = document.getElementById('ai-generate-btn');
    const originalHTML = btn ? btn.innerHTML : ''; 
    
    if (btn) {
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
        btn.style.opacity = '0.6';
        btn.innerText = "⏳ Thinking...";
    }
    
    AIAgent.processCommand(prompt).then(() => {
        if (btn) {
            btn.disabled = false;
            btn.style.cursor = 'pointer';
            btn.style.opacity = '1';
            btn.innerHTML = originalHTML; 
        }
        input.value = ""; 
    });
};

// Expose internal methods to the window for the HTML UI
window.populateAIModelDropdown = () => BuilderToolsEngine.populateAIModelDropdown();
window.toggleAutoBuilder = () => BuilderToolsEngine.toggleAutoBuilder();
window.toggleAIAgent = () => BuilderToolsEngine.toggleAIAgent();

// Initialize everything securely on load
document.addEventListener('DOMContentLoaded', () => {
    BuilderToolsEngine.init();
});