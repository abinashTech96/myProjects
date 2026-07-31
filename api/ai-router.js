// api/ai-router.js (Serverless Function Example)

export default async function handler(req, res) {
    // 1. Extract the prompt and the requested model from the frontend
    const { model, promptBody } = req.body;
    
    let apiUrl = '';
    let apiKey = '';

    // 2. Safely fetch the secure environment variables
    if (model === 'gemini') {
        apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';
        apiKey = process.env.GEMINI_SECRET_KEY;
    } else if (model === 'openai') {
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        apiKey = process.env.OPENAI_SECRET_KEY;
    }

    // 3. Make the secure request to the AI provider
    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promptBody)
    });

    const data = await response.json();

    // 4. Send the data back to your static frontend
    return res.status(200).json(data);
}