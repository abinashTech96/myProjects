// config.js
const CONFIG = {
    // ⚠️ Insert your Gemini API Key here for local testing
    GEMINI_API_KEY: '',
    
    // When you build your Java/Python backend, you will simply change this URL
    // e.g., AI_ENDPOINT: 'http://localhost:8080/api/architect'
    AI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',

    // This tells Gemini what functions it is allowed to call
    MANIFEST: [
        { name: "addRoom", params: ["x", "y", "w", "h", "type"] },
        { name: "moveElement", params: ["id", "newX", "newY"] },
        { name: "deleteElementAI", params: ["id"] } // Forces AI to specify which room to delete
    ]
};