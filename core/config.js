// config.js
const CONFIG = {
    // 1. THE SWITCH: Change this string to route traffic to a different AI
    ACTIVE_LLM: 'gemini-3.5-flash',
    
    // 2. 🌟 SINGLE SOURCE OF TRUTH FOR ALL MODELS
    MODELS: {
        'gemini-3.6-flash': {
            label: 'Gemini 3.6 Flash (Fastest)',
            group: 'Google Gemini',
            protocol: 'gemini', // Used by ai-agent.js to pick payload structure
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
            key: GEMINI_API_KEY
        },
        'gemini-3.5-flash': {
            label: 'Gemini 3.5 Flash (Balanced Draft)',
            group: 'Google Gemini',
            protocol: 'gemini',
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
            key: GEMINI_API_KEY
        },
        'gemini-3.5-flash-lite': {
            label: 'Gemini 3.5 Flash Lite (Low Cost)',
            group: 'Google Gemini',
            protocol: 'gemini',
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
            key: GEMINI_API_KEY
        },
        'gemini-3.1-pro': {
            label: 'Gemini 3.1 Pro (Advanced Reasoning)',
            group: 'Google Gemini',
            protocol: 'gemini',
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent',
            key: GEMINI_API_KEY
        },
        'gemini-3.0-ultra': {
            label: 'Gemini 3.0 Ultra (Heavy Architecture)',
            group: 'Google Gemini',
            protocol: 'gemini',
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-ultra:generateContent',
            key: GEMINI_API_KEY
        },
        'openai-gpt4o': {
            label: 'OpenAI GPT-4o (Complex Layouts)',
            group: 'Other Providers',
            protocol: 'openai',
            apiModelName: 'gpt-4o',
            endpoint: 'https://api.openai.com/v1/chat/completions',
            key: OPENAI_API_KEY
        },
        'perplexity-sonar': {
            label: 'Perplexity Sonar (Vastu Code Search)',
            group: 'Other Providers',
            protocol: 'openai', // Perplexity uses standard OpenAI Chat Completions endpoint format
            apiModelName: 'sonar',
            endpoint: 'https://api.perplexity.ai/chat/completions',
            key: PERPLEXITY_API_KEY
        }
    },

    // 3. YOUR EXISTING MANIFEST: Tells the active AI what functions it is allowed to call
    MANIFEST: [
        { name: "addRoom", params: ["x", "y", "w", "h", "type"] },
        { name: "moveElement", params: ["id", "newX", "newY"] },
        { name: "deleteElementAI", params: ["id"] }
    ]
};