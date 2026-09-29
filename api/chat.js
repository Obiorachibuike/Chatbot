const SYSTEM_PROMPT = process.env.AI_SYSTEM_PROMPT ||
  "You are Zara, a friendly, witty AI assistant chatting on a WhatsApp-style app. " +
  "Keep replies short and conversational (usually 1-3 sentences), use an occasional emoji. Plain text only.";

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const BASE_URL = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const MODEL = process.env.AI_MODEL || "gpt-4o-mini";
  if (!API_KEY) return res.status(503).json({ error: "AI is not configured." });

  const messages = (req.body && req.body.messages) || [];
  const history = messages
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!history.length || history[history.length - 1].role !== "user")
    return res.status(400).json({ error: "Last message must be from user" });

  try {
    const r = await fetch(BASE_URL + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + API_KEY },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: "AI provider error (" + r.status + ")." });
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: "Empty reply from AI." });
    res.status(200).json({ reply: reply.trim() });
  } catch (e) {
    res.status(504).json({ error: "Couldn't reach the AI provider." });
  }
};
