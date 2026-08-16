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
    async processCommand(userPrompt) {
        const selectEl = document.getElementById('ai-model-select');
        const selectedKey = selectEl ? selectEl.value : (CONFIG.DEFAULT_MODEL || 'gemini-3.5-flash');
        const modelConfig = CONFIG.MODELS ? CONFIG.MODELS[selectedKey] : null;

        if (!modelConfig || !modelConfig.endpoint) {
            alert(`Error: AI Model '${selectedKey}' is not properly configured in config.js.`);
            return;
        }

        try {
            const systemPrompt = this._buildSystemPrompt();
            const requestPayload = this._buildPayload(modelConfig, systemPrompt, userPrompt);
            console.log(`🚀 [${selectedKey.toUpperCase()}] REQUEST:`, JSON.stringify(requestPayload.body, null, 2));

            const response = await fetch(requestPayload.url, {
                method: 'POST',
                headers: requestPayload.headers,
                body: JSON.stringify(requestPayload.body)
            });

            const data = await response.json();
            console.log(`📥 [${selectedKey.toUpperCase()}] RAW RESPONSE:`, JSON.stringify(data, null, 2));

            if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

            const actionPlan = this._parseResponse(modelConfig, data);
            this._executePlan(actionPlan);

        } catch (error) {
            console.error("AI processing failed:", error);
            alert(`AI Processing Failed: ${error.message}`);
        }
    },

    _buildSystemPrompt() {
        const layoutContext = JSON.stringify(elements.map((el, index) => ({
            id: index, type: el.type, x: el.x, y: el.y, w: el.w, h: el.h
        })));

        return `You are a high-precision Architectural CAD Engine layout planner specializing in Vastu Shastra.
        Existing items on canvas: ${layoutContext}

        CRITICAL DESIGN DIRECTIONS (VASTU MANDALA):
        - North-East: Reserve for 'puja'.
        - South-East: Reserve for 'kitchen'.
        - South-West: Reserve for 'bedroom' (Master Bedroom).
        - North-West: Use for second 'bedroom' or 'toilet'.

        TASK REQUIREMENTS:
        Output a valid JSON array of architectural modifications. Instead of guessing pixel coordinates, output the logical Vastu 'zone' where the room should be placed.
        Available zones: "NE", "NW", "SE", "SW", "CENTER".
        
        DIMENSION CONVERSION (CRITICAL): 
        The user will frequently request room sizes in feet (e.g., 5ft x 8ft). The JSON schema 'w' and 'h' parameters ONLY accept inches. You MUST multiply feet by 12 before outputting the JSON (e.g., 5ft x 8ft becomes "w": 60, "h": 96).

        RELOCATION:
        If you are commanded to move a room to a specific Vastu zone, check the "Existing items on canvas". If a room is occupying that space, you must output an array of 2 actions: FIRST move the blocking room to the "CENTER", THEN move the new room to the desired zone.
        
        IMPORTANT: Only output the EXACT modifications requested by the user. Do not duplicate actions.
        
        ACTION FORMAT:
        Each element in the JSON array must strictly follow this structure:
        [
          {
            "action": "addRoom" | "moveElement" | "deleteElementAI",
            "params": {
              "zone": "NE" | "NW" | "SE" | "SW" | "CENTER",
              "type": "bedroom" | "kitchen" | "puja" | "living" | "toilet" | "balcony",
              "id": 0,
              "w": 120,
              "h": 120
            }
          }
        ]`;
    },

    _getSchema() {
        return {
            type: "ARRAY",
            description: "List of architectural modifications to execute.",
            items: {
                type: "OBJECT",
                properties: {
                    action: { type: "STRING", enum: ["addRoom", "moveElement", "deleteElementAI"] },
                    params: {
                        type: "OBJECT",
                        properties: {
                            zone: { type: "STRING", enum: ["NE", "NW", "SE", "SW", "CENTER"], description: "The logical zone for placement." },
                            type: { type: "STRING", description: "Room type (e.g., bedroom, kitchen, puja)" },
                            id: { type: "INTEGER", description: "The index element id (only required for move/delete)." },
                            w: { type: "INTEGER", description: "Width in inches (default 120 if omitted)" },
                            h: { type: "INTEGER", description: "Height in inches (default 120 if omitted)" }
                        }
                    }
                },
                required: ["action", "params"]
            }
        };
    },

    _buildPayload(modelConfig, systemPrompt, userPrompt) {
        let payload = { url: modelConfig.endpoint, headers: { 'Content-Type': 'application/json' }, body: {} };

        if (modelConfig.protocol === 'gemini') {
            payload.url = `${modelConfig.endpoint}?key=${modelConfig.key}`;
            payload.body = {
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: userPrompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: this._getSchema()
                }
            };
        } else if (modelConfig.protocol === 'openai') {
            payload.headers['Authorization'] = `Bearer ${modelConfig.key}`;
            payload.body = {
                model: modelConfig.apiModelName || 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' }
            };
        }
        return payload;
    },

    _parseResponse(modelConfig, data) {
        let aiResponseText = '';
        if (modelConfig.protocol === 'gemini' && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            aiResponseText = data.candidates[0].content.parts[0].text;
        } else if (data.choices?.[0]?.message?.content) {
            aiResponseText = data.choices[0].message.content;
        }

        if (!aiResponseText) return null;
        aiResponseText = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();

        let actionPlan = JSON.parse(aiResponseText);
        if (!Array.isArray(actionPlan) && typeof actionPlan === 'object') {
            actionPlan = actionPlan.actions || actionPlan.modifications || Object.values(actionPlan)[0];
        }
        return actionPlan;
    },

    _executePlan(actionPlan) {
        if (!actionPlan) return;
        if (Array.isArray(actionPlan)) {
            actionPlan.forEach(plan => this.execute(plan));
        } else if (actionPlan.action) {
            this.execute(actionPlan);
        }
    },

    calculateZoneCoordinates(zone, roomW, roomH) {
        const plotW = parseFloat(document.getElementById('inW').value) || AI_CONFIG.DEFAULT_PLOT_W;
        const plotH = parseFloat(document.getElementById('inH').value) || AI_CONFIG.DEFAULT_PLOT_H;
        const padding = AI_CONFIG.VASTU_PADDING_INCHES;
        
        switch (zone) {
            case "NE": return { x: plotW - roomW - padding, y: plotH - roomH - padding };
            case "NW": return { x: plotW - roomW - padding, y: padding };
            case "SE": return { x: padding, y: plotH - roomH - padding };
            case "SW": return { x: padding, y: padding };
            case "CENTER": return { x: (plotW / 2) - (roomW / 2), y: (plotH / 2) - (roomH / 2) };
            default: return { x: padding, y: padding };
        }
    },

    execute(plan) {
        console.log("🤖 AI Executing Room:", plan);
        
        if (plan.action === "addRoom" || plan.action === "moveElement") {
            const p = plan.params;
            const plotW = parseFloat(document.getElementById('inW').value) || AI_CONFIG.DEFAULT_PLOT_W;
            const plotH = parseFloat(document.getElementById('inH').value) || AI_CONFIG.DEFAULT_PLOT_H;
            
            let checkW = p.w || (plan.action === "moveElement" && elements[p.id] ? elements[p.id].w : (typeof ARCH_CONFIG !== 'undefined' ? ARCH_CONFIG.DEFAULTS.ROOM_W : 120));
            let checkH = p.h || (plan.action === "moveElement" && elements[p.id] ? elements[p.id].h : (typeof ARCH_CONFIG !== 'undefined' ? ARCH_CONFIG.DEFAULTS.ROOM_H : 120));
            
            let checkX, checkY;
            if (p.zone && typeof this.calculateZoneCoordinates === 'function') {
                const coords = this.calculateZoneCoordinates(p.zone, checkW, checkH);
                checkX = coords.x;
                checkY = coords.y;
            } else {
                checkX = plan.action === "moveElement" ? p.newX : p.x;
                checkY = plan.action === "moveElement" ? p.newY : p.y;
            }

            if (checkX < 0 || checkY < 0 || (checkX + checkW) > plotW || (checkY + checkH) > plotH) {
                return console.error(`🚨 Gatekeeper Blocked AI: Outside boundaries.`);
            }

            let tempEl = { x: checkX, y: checkY, w: checkW, h: checkH, floor: currentFloor };
            const ignoreIndex = plan.action === "moveElement" ? p.id : -1;
            
            if (typeof checkCollision === 'function' && checkCollision(tempEl, ignoreIndex)) {
                console.warn(`⚠️ AI Collision detected at [${checkX}, ${checkY}]. Attempting evasion...`);
                let resolved = false;
                const offsets = [
                    {dx: checkW, dy: 0}, {dx: -checkW, dy: 0}, 
                    {dx: 0, dy: checkH}, {dx: 0, dy: -checkH}
                ];
                for (let off of offsets) {
                    tempEl.x = checkX + off.dx;
                    tempEl.y = checkY + off.dy;
                    if (tempEl.x >= 0 && tempEl.y >= 0 && (tempEl.x + tempEl.w) <= plotW && (tempEl.y + tempEl.h) <= plotH) {
                        if (!checkCollision(tempEl, ignoreIndex)) {
                            checkX = tempEl.x;
                            checkY = tempEl.y;
                            resolved = true;
                            console.log(`✅ AI successfully evaded collision. New coords: [${checkX}, ${checkY}]`);
                            break;
                        }
                    }
                }

                if (!resolved) {
                    return console.error(`🛑 Gatekeeper Blocked AI: Could not find safe placement.`);
                }
            }

            if (plan.action === 'addRoom' && typeof window.addRoom === 'function') {
                window.addRoom(checkX, checkY, checkW, checkH, p.type);
            } 
            else if (plan.action === 'moveElement' && typeof window.moveElement === 'function') {
                window.moveElement(p.id, checkX, checkY);
            }
        }
        else if (plan.action === 'deleteElementAI' && typeof window.deleteElementAI === 'function') {
            window.deleteElementAI(plan.params.id);
        }
    }
};

// Global Command Hook
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

// ✨ ADD THIS MISSING GLOBAL HOOK:
window.populateAIModelDropdown = () => BuilderToolsEngine.populateAIModelDropdown();

// Initialize everything securely on load
document.addEventListener('DOMContentLoaded', () => {
    BuilderToolsEngine.init();
});