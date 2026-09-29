# Zara AI

A WhatsApp-style chatbot powered by a real AI model (any OpenAI-compatible API: OpenAI, Groq, OpenRouter, Gemini, Ollama…).

## Run

Requires Node 18+. No dependencies to install.

```bash
cp .env.example .env     # then edit .env and add your API key
npm start                # http://localhost:8000
```

The browser never sees your key: `server.js` serves the UI and forwards chats to the provider through `/api/chat`.

## Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `AI_API_KEY` | – | Your provider key (`OPENAI_API_KEY` also works) |
| `AI_MODEL` | `gpt-4o-mini` | Model name |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Provider endpoint |
| `AI_SYSTEM_PROMPT` | Zara persona | Customize personality |
| `PORT` | `8000` | Server port |

Without a key the app still opens and falls back to simple keyword replies.
