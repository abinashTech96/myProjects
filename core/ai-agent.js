// ai-agent.js
const AIAgent = {
    async processCommand(userPrompt) {
        const plotBounds = {
            inW: parseFloat(document.getElementById('inW').value) || AI_CONFIG.DEFAULT_PLOT_W,
            inH: parseFloat(document.getElementById('inH').value) || AI_CONFIG.DEFAULT_PLOT_H
        };

        const layoutContext = JSON.stringify(elements.map((el, index) => ({
            id: index, type: el.type, x: el.x, y: el.y, w: el.w, h: el.h
        })));

        const systemPrompt = `You are a high-precision Architectural CAD Engine layout planner specializing in Vastu Shastra.
        Existing items on canvas: ${layoutContext}

        CRITICAL DESIGN DIRECTIONS (VASTU MANDALA):
        - North-East: Reserve for 'puja'.
        - South-East: Reserve for 'kitchen'.
        - South-West: Reserve for 'bedroom' (Master Bedroom).
        - North-West: Use for second 'bedroom' or 'toilet'.

        TASK REQUIREMENTS:
        Output an array of architectural modifications. Instead of guessing pixel coordinates, output the logical Vastu 'zone' where the room should be placed.
        Available zones: "NE", "NW", "SE", "SW", "CENTER".
        
        RELOCATION:
        If you are commanded to move a room to a specific Vastu zone, check the "Existing items on canvas". If a room is occupying that space, you must output an array of 2 actions: FIRST move the blocking room to the "CENTER", THEN move the new room to the desired zone.`;
        
        const jsonSchema = {
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
                        },
                        required: ["action", "params"]
                    }
                },
                required: ["action", "params"]
            }
        };

        try {
            const requestBody = {
                system_instruction: { parts: [{ text: systemPrompt }] }, 
                contents: [{ parts: [{ text: userPrompt }] }],
                generationConfig: { 
                    responseMimeType: "application/json",
                    responseSchema: jsonSchema 
                }
            };

            console.log("🚀 AI REQUEST BODY:", JSON.stringify(requestBody, null, 2));

            const url = `${CONFIG.AI_ENDPOINT}?key=${CONFIG.GEMINI_API_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            console.log("📥 AI RAW RESPONSE:", JSON.stringify(data, null, 2));

            if (data.error) {
                console.error("Gemini API Error:", data.error.message);
                alert(`AI Error: ${data.error.message}`);
                return;
            }

            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const aiResponseText = data.candidates[0].content.parts[0].text;
                const actionPlan = JSON.parse(aiResponseText);
                
                if (Array.isArray(actionPlan)) {
                    actionPlan.forEach(plan => this.execute(plan));
                } else {
                    this.execute(actionPlan);
                }
            }
        } catch (error) {
            console.error("AI processing failed:", error);
        }
    },

    calculateZoneCoordinates(zone, roomW, roomH) {
        const plotW = parseFloat(document.getElementById('inW').value) || AI_CONFIG.DEFAULT_PLOT_W;
        const plotH = parseFloat(document.getElementById('inH').value) || AI_CONFIG.DEFAULT_PLOT_H;
        
        // Compass Mapping: Top is West(y=0), Bottom is East(y=max), Right is North(x=max), Left is South(x=0)
        // Therefore:
        // NE = Bottom-Right (Max X, Max Y)
        // NW = Top-Right (Max X, Min Y)
        // SE = Bottom-Left (Min X, Max Y)
        // SW = Top-Left (Min X, Min Y)

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
            
            // 1. Determine safe Width and Height (fallback to globals if missing)
            let checkW = p.w || (plan.action === "moveElement" && elements[p.id] ? elements[p.id].w : (typeof ARCH_CONFIG !== 'undefined' ? ARCH_CONFIG.DEFAULTS.ROOM_W : 120));
            let checkH = p.h || (plan.action === "moveElement" && elements[p.id] ? elements[p.id].h : (typeof ARCH_CONFIG !== 'undefined' ? ARCH_CONFIG.DEFAULTS.ROOM_H : 120));
            
            // 2. 🚀 THE UPGRADE: Calculate exact X and Y based on Vastu Zone, or fallback to exact coords
            let checkX, checkY;
            if (p.zone && typeof this.calculateZoneCoordinates === 'function') {
                const coords = this.calculateZoneCoordinates(p.zone, checkW, checkH);
                checkX = coords.x;
                checkY = coords.y;
            } else {
                checkX = plan.action === "moveElement" ? p.newX : p.x;
                checkY = plan.action === "moveElement" ? p.newY : p.y;
            }

            // 3. Gatekeeper: Boundary Check
            if (checkX < 0 || checkY < 0 || (checkX + checkW) > plotW || (checkY + checkH) > plotH) {
                console.error(`🚨 Gatekeeper Blocked AI: Outside boundaries.`);
                return;
            }

            // 4. 🚀 Gatekeeper & Evasion: Collision Check
            let tempEl = { x: checkX, y: checkY, w: checkW, h: checkH, floor: currentFloor };
            const ignoreIndex = plan.action === "moveElement" ? p.id : -1;
            
            // If it collides, attempt to find a nearby safe spot by nudging it around
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
                    console.error(`🛑 Gatekeeper Blocked AI: Could not find safe placement.`);
                    return;
                }
            }

            // 5. Execute Safe Action
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

function handleAICommand() {
    const input = document.getElementById('ai-input');
    const prompt = input.value.trim();
    if (!prompt) return;
    
    const btn = document.getElementById('ai-generate-btn');
    if (btn) btn.innerText = "Thinking...";
    
    AIAgent.processCommand(prompt).then(() => {
        if (btn) btn.innerText = "Generate";
        input.value = ""; 
    });
}