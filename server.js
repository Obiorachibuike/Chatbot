/* Zara AI – tiny zero-dependency Node server (Node 18+).
 * Serves the chat UI and proxies /api/chat to any OpenAI-compatible
 * chat-completions API, so your API key never reaches the browser. */
const http = require("http");
const fs = require("fs");
const path = require("path");

// ---- Minimal .env loader ----
try {
  fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !line.trim().startsWith("#") && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  });
} catch (_) { /* no .env file – fine */ }

const PORT = process.env.PORT || 8000;
const API_KEY = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
const BASE_URL = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const SYSTEM_PROMPT = process.env.AI_SYSTEM_PROMPT ||
  "You are Zara, a friendly, witty AI assistant chatting with someone on a WhatsApp-style app. " +
  "Keep replies short and conversational (usually 1-3 sentences), use an occasional emoji, " +
  "and only write longer answers when the user asks for detail. Plain text only – no markdown headings.";

const MAX_HISTORY = 20;
const MAX_CHARS = 2000;

const STATIC = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/script.js": ["script.js", "application/javascript; charset=utf-8"],
};

// ---- naive per-IP rate limit: 30 requests / minute ----
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 30;
}

function sendJSON(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit = 100000) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > limit) { reject(new Error("too large")); req.destroy(); }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function handleChat(req, res) {
  if (!API_KEY) return sendJSON(res, 503, { error: "AI is not configured. Set AI_API_KEY on the server." });
  if (limited(req.socket.remoteAddress)) return sendJSON(res, 429, { error: "Slow down a little 🙂" });

  let body;
  try { body = JSON.parse(await readBody(req)); } catch (_) { return sendJSON(res, 400, { error: "Bad request" }); }
  if (!body || !Array.isArray(body.messages)) return sendJSON(res, 400, { error: "messages[] required" });

  const history = body.messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  if (!history.length || history[history.length - 1].role !== "user") {
    return sendJSON(res, 400, { error: "Last message must be from user" });
  }

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
      signal: AbortSignal.timeout(30000),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("Upstream error", r.status, JSON.stringify(data).slice(0, 300));
      return sendJSON(res, 502, { error: "The AI provider returned an error (" + r.status + ")." });
    }
    const reply = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!reply) return sendJSON(res, 502, { error: "Empty reply from AI." });
    sendJSON(res, 200, { reply: reply.trim() });
  } catch (err) {
    console.error("Chat failure:", err.message);
    sendJSON(res, 504, { error: "Couldn't reach the AI provider." });
  }
}

http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  if (url === "/api/status" && req.method === "GET") return sendJSON(res, 200, { configured: !!API_KEY, model: MODEL });
  if (url === "/api/chat" && req.method === "POST") return handleChat(req, res);

  const file = STATIC[url];
  if (file && req.method === "GET") {
    return fs.readFile(path.join(__dirname, file[0]), (err, buf) => {
      if (err) { res.writeHead(500); return res.end("Error"); }
      res.writeHead(200, { "Content-Type": file[1], "Cache-Control": "no-cache" });
      res.end(buf);
    });
  }
  res.writeHead(404); res.end("Not found");
}).listen(PORT, "0.0.0.0", () => {
  console.log("Zara AI running on http://localhost:" + PORT + " – " + (API_KEY ? "model " + MODEL : "NO API KEY (using offline fallback replies)"));
});
