// Deploy this route on a Node serverless host; GitHub Pages serves static files only.
export default async function handler(req, res) {
  const origin = req.headers.origin,
    allowed = process.env.ARCHCAD_ALLOWED_ORIGIN;
  if (origin) {
    if (!allowed || origin !== allowed)
      return res
        .status(403)
        .json({ error: { message: "Origin is not allowed." } });
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: { message: "Use POST." } });
  const expected = process.env.ARCHCAD_ACCESS_TOKEN;
  if (!expected)
    return res
      .status(503)
      .json({ error: { message: "AI service is not configured." } });
  if (req.headers.authorization !== `Bearer ${expected}`)
    return res
      .status(401)
      .json({ error: { message: "Invalid service access token." } });
  const { provider = "openai", promptBody } = req.body || {};
  if (
    !promptBody ||
    typeof promptBody !== "object" ||
    JSON.stringify(promptBody).length > 150000
  )
    return res
      .status(400)
      .json({ error: { message: "Invalid or oversized prompt." } });
  const key =
    provider === "openai"
      ? process.env.OPENAI_SECRET_KEY
      : provider === "gemini"
        ? process.env.GEMINI_SECRET_KEY
        : null;
  if (!key)
    return res
      .status(400)
      .json({ error: { message: "Provider is not configured." } });
  const model =
    provider === "openai" ? process.env.OPENAI_MODEL : process.env.GEMINI_MODEL;
  if (!model || !/^[a-zA-Z0-9._-]+$/.test(model))
    return res
      .status(503)
      .json({ error: { message: "Configure the server model name." } });
  const url =
    provider === "openai"
      ? "https://api.openai.com/v1/chat/completions"
      : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const headers = {
    "Content-Type": "application/json",
    ...(provider === "openai"
      ? { Authorization: `Bearer ${key}` }
      : { "x-goog-api-key": key }),
  };
  const system =
    "Return only JSON with an actions array. Allowed actions: addRoom(x,y,w,h,type), moveElement(id,newX,newY), deleteElementAI(id). Dimensions and coordinates are inches. Use stable string IDs from the supplied project. Never change unrequested elements.";
  const body =
    provider === "openai"
      ? {
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: JSON.stringify(promptBody) },
          ],
          response_format: { type: "json_object" },
        }
      : {
          system_instruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: JSON.stringify(promptBody) }] }],
          generationConfig: { responseMimeType: "application/json" },
        };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res
      .status(error.name === "TimeoutError" ? 504 : 502)
      .json({
        error: {
          message: "The AI provider could not be reached. Retry later.",
        },
      });
  }
}
