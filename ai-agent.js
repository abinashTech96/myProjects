// ai-agent.js
const AIAgent = {
    async processCommand(userPrompt) {
        const plotBounds = {
            inW: parseFloat(document.getElementById('inW').value) || 272,
            inH: parseFloat(document.getElementById('inH').value) || 400
        };

        const layoutContext = JSON.stringify(elements.map((el, index) => ({
            id: index, type: el.type, x: el.x, y: el.y, w: el.w, h: el.h
        })));

        const systemPrompt = `You are a high-precision Architectural CAD Engine layout planner specializing in Vastu Shastra.
        Current plot constraints: Width ${plotBounds.inW} inches by Depth ${plotBounds.inH} inches. All rooms must fit inside these dimensions.
        Existing items on canvas: ${layoutContext}

        CRITICAL DESIGN DIRECTIONS (VASTU MANDALA):
        Note the compass orientation for this plot: Top is West (y=0), Bottom is East (y=max), Right is North (x=max), Left is South (x=0).
        
        - North-East (Bottom-Right quadrant: around x=${plotBounds.inW - 120}, y=${plotBounds.inH - 120}): Reserve for 'puja'.
        - South-East (Bottom-Left quadrant: around x=20, y=${plotBounds.inH - 120}): Reserve for 'kitchen'.
        - South-West (Top-Left quadrant: around x=20, y=20): Reserve for 'bedroom' (Master Bedroom).
        - North-West (Top-Right quadrant: around x=${plotBounds.inW - 120}, y=20): Use for second 'bedroom' or 'toilet'.

        2BHK SPECIFIC TASK REQUIREMENTS:
        If the user requests a 2BHK layout, you MUST output exactly an array of 5 distinct actions adding:
        - 2 'bedroom' items
        - 1 'kitchen' item
        - 1 'toilet' item
        - 1 'puja' item
        Do NOT generate a hall or living room. Calculate all room dimensions (w, h) and anchor locations (x, y) so they clear each other cleanly with absolutely zero overlapping pixels.
        
        RELOCATION AND TRAFFIC AVOIDANCE (CRITICAL RULES):
        1. If you are commanded to move a room to a specific Vastu zone, you MUST check the "Existing items on canvas" to see if another room is occupying that space.
        2. If blocked, you MUST generate a multi-action array.
        3. ORDER OF OPERATIONS: The action moving the blocking room (using its exact 'id' from the layout state) MUST be the FIRST item in the array. The action moving the new room must be SECOND.
        4. SAFE RELOCATION: When moving a blocking room, you must calculate its new x/y coordinates (like the center of the plot) to ensure it does not land on top of any other existing rooms.`;
        
        const jsonSchema = {
            type: "ARRAY",
            description: "List of architectural modifications to execute on the canvas layout.",
            items: {
                type: "OBJECT",
                properties: {
                    action: { 
                        type: "STRING", 
                        enum: ["addRoom", "moveElement", "deleteElementAI"]
                    },
                    params: {
                        type: "OBJECT",
                        properties: {
                            x: { type: "INTEGER", description: "The X coordinate position in inches." },
                            y: { type: "INTEGER", description: "The Y coordinate position in inches." },
                            w: { type: "INTEGER", description: "The width dimension of the room in inches." },
                            h: { type: "INTEGER", description: "The height dimension of the room in inches." },
                            type: { 
                                type: "STRING", 
                                enum: ["bedroom", "kitchen", "toilet", "puja", "living", "balcony", "staircase"],
                                description: "The designated room type designation matching engine styles." 
                            },
                            id: { type: "INTEGER", description: "The index element id (only required for move/delete actions)." }
                        },
                        required: ["x", "y", "w", "h", "type"]
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

    execute(plan) {
        console.log("🤖 AI Executing Room:", plan);
        
        if (plan.action === "addRoom" || plan.action === "moveElement") {
            const p = plan.params;
            const plotW = parseFloat(document.getElementById('inW').value) || 272;
            const plotH = parseFloat(document.getElementById('inH').value) || 400;
            
            let checkW = p.w || (plan.action === "moveElement" && elements[p.id] ? elements[p.id].w : 120);
            let checkH = p.h || (plan.action === "moveElement" && elements[p.id] ? elements[p.id].h : 120);
            let checkX = plan.action === "moveElement" ? p.newX : p.x;
            let checkY = plan.action === "moveElement" ? p.newY : p.y;

            if (checkX < 0 || checkY < 0 || (checkX + checkW) > plotW || (checkY + checkH) > plotH) {
                console.error(`🚨 Gatekeeper Blocked AI: Outside boundaries.`);
                return;
            }

            const tempEl = { x: checkX, y: checkY, w: checkW, h: checkH, floor: currentFloor };
            const ignoreIndex = plan.action === "moveElement" ? p.id : -1;
            
            if (typeof checkCollision === 'function' && checkCollision(tempEl, ignoreIndex)) {
                console.error(`🚨 Gatekeeper Blocked AI: Collision overlap detected.`);
                return;
            }
        }

        if (plan.action === 'addRoom' && typeof window.addRoom === 'function') {
            window.addRoom(plan.params.x, plan.params.y, plan.params.w, plan.params.h, plan.params.type);
        } 
        else if (plan.action === 'moveElement' && typeof window.moveElement === 'function') {
            window.moveElement(plan.params.id, plan.params.newX, plan.params.newY);
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