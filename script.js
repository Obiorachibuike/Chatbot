/* Zara AI – WhatsApp-style chatbot. Replies come from a real LLM via /api/chat
   (see server.js); the keyword rules below are only an offline fallback. */

var BOT_NAME = "Zara";
var box = document.getElementById("messagesdivid");
var input = document.getElementById("message_box");
var statusEl = document.getElementById("spanonline");
var quickEl = document.getElementById("quick_replies");
var busy = false;

/* ---------- Knowledge: keyword intents ---------- */
var intents = [
  { keys: ["hello", "hi", "hey", "hola", "yo", "sup"],
    replies: ["Hey there! 👋 I'm Zara. What's up?", "Hi! 😊 How can I help you today?", "Hello! Great to hear from you."] },
  { keys: ["how are you", "how r u", "how are u", "wassup", "what's up", "whats up"],
    replies: ["I'm doing great, thanks for asking! 😄 How about you?", "All good on my side! What's on your mind?"] },
  { keys: ["good morning", "morning"], replies: ["Good morning! ☀️ Hope you have an amazing day."] },
  { keys: ["good night", "goodnight", "night"], replies: ["Good night! 🌙 Sleep well."] },
  { keys: ["your name", "who are you", "who r u"],
    replies: ["I'm Zara, your friendly AI chat buddy 🤖💚"] },
  { keys: ["what can you do", "help", "features"],
    replies: ["I can chat, tell jokes, share the time and date, do quick maths, and flip a coin. Try \"joke\", \"time\", or \"5 * 12\"! ✨"] },
  { keys: ["joke", "funny", "make me laugh"],
    replies: [
      "Why do programmers prefer dark mode? Because light attracts bugs 🐛",
      "I told my computer I needed a break… it said no problem, it'll go to sleep 😴",
      "Why was the JavaScript developer sad? Because he didn't Node how to Express himself 😅"
    ] },
  { keys: ["time", "what time"], dynamic: function () { return "It's " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " ⏰"; } },
  { keys: ["date", "today", "day is it"], dynamic: function () { return "Today is " + new Date().toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" }) + " 📅"; } },
  { keys: ["coin", "flip"], dynamic: function () { return "🪙 " + (Math.random() < 0.5 ? "Heads!" : "Tails!"); } },
  { keys: ["thank", "thanks", "thx"], replies: ["You're welcome! 😊", "Anytime! 💚", "No problem at all!"] },
  { keys: ["sorry"], replies: ["No worries at all! 🙂"] },
  { keys: ["love you", "i love"], replies: ["Aww, that's sweet! 🥰"] },
  { keys: ["bye", "goodbye", "see you", "cya"], replies: ["Bye! 👋 Talk soon.", "See you later! 💚"] },
  { keys: ["yes", "yeah", "yep"], replies: ["Nice! 👍 Tell me more."] },
  { keys: ["no", "nope"], replies: ["Alright, no problem. 🙂"] },
  { keys: ["ok", "okay", "cool"], replies: ["👍"] },
  { keys: ["lol", "haha", "hehe"], replies: ["😂😂", "Haha glad I made you smile! 😄"] }
];

var fallbacks = [
  "Hmm, I'm not sure I got that 🤔 Could you say it another way?",
  "Interesting! Tell me more. 🙂",
  "I'm still learning, so I didn't fully understand. Try \"help\" to see what I can do!"
];

function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

function matches(text, key) {
  // whole word / phrase matching so "hi" doesn't match "this"
  var re = new RegExp("(^|[^a-z0-9'])" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9']|$)");
  return re.test(text);
}

function tryMath(text) {
  var m = text.match(/^\s*(?:what is|what's|calc|calculate)?\s*(-?\d+(?:\.\d+)?)\s*([+\-*x\/×÷])\s*(-?\d+(?:\.\d+)?)\s*\??\s*$/);
  if (!m) return null;
  var a = parseFloat(m[1]), b = parseFloat(m[3]), op = m[2], r;
  if (op === "+") r = a + b;
  else if (op === "-") r = a - b;
  else if (op === "*" || op === "x" || op === "×") r = a * b;
  else { if (b === 0) return "I can't divide by zero 😅"; r = a / b; }
  return "🧮 " + a + " " + op + " " + b + " = " + Math.round(r * 1e8) / 1e8;
}

function getReply(raw) {
  var text = raw.toLowerCase().trim();
  var math = tryMath(text);
  if (math) return math;
  for (var i = 0; i < intents.length; i++) {
    for (var k = 0; k < intents[i].keys.length; k++) {
      if (matches(text, intents[i].keys[k])) {
        return intents[i].dynamic ? intents[i].dynamic() : pick(intents[i].replies);
      }
    }
  }
  return pick(fallbacks);
}

/* ---------- UI helpers ---------- */
function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function scrollDown() { box.scrollTo({ top: box.scrollHeight, behavior: "smooth" }); }

var TICKS_SVG = '<svg class="ticks" viewBox="0 0 17 11"><path d="M1 6l3 3 7-8"/><path d="M6 8l1 1 7-8"/></svg>';
var TICK_SVG = '<svg class="ticks" viewBox="0 0 17 11"><path d="M3 6l3 3 7-8"/></svg>';

var lastSide = null;

function addMessage(text, side) {
  var el = document.createElement("div");
  el.className = "msg " + (side === "out" ? "out" : "in") + (lastSide === side ? " cont" : "");
  lastSide = side;

  el.appendChild(document.createTextNode(text)); // textContent-safe (no HTML injection)

  var meta = document.createElement("span");
  meta.className = "meta";
  meta.appendChild(document.createTextNode(timeNow()));
  el.appendChild(meta);

  var tick = null;
  if (side === "out") {
    tick = document.createElement("span");
    tick.innerHTML = TICK_SVG;
    meta.appendChild(tick);
  }
  box.appendChild(el);
  scrollDown();
  return tick;
}

function addChip(text, cls) {
  var c = document.createElement("div");
  c.className = "chip " + (cls || "");
  c.textContent = text;
  box.appendChild(c);
  lastSide = null;
}

function showTyping() {
  var el = document.createElement("div");
  el.className = "msg in typing" + (lastSide === "in" ? " cont" : "");
  el.id = "typing_bubble";
  el.innerHTML = "<span></span><span></span><span></span>";
  box.appendChild(el);
  scrollDown();
}
function hideTyping() {
  var t = document.getElementById("typing_bubble");
  if (t) t.remove();
}

function setReadTicks(tick, read) {
  if (!tick) return;
  tick.innerHTML = read === "read" ? TICKS_SVG : read === "delivered" ? TICKS_SVG : TICK_SVG;
  if (read === "read") tick.firstChild.classList.add("read");
}

/* ---------- Main flow ---------- */
var history = [];          // conversation sent to the AI model
var aiConfigured = null;   // null = unknown, true/false after /api/status

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function askAI(text) {
  history.push({ role: "user", content: text });
  return fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history })
  }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (data) {
      if (!r.ok) { var e = new Error(data.error || "Request failed"); e.status = r.status; throw e; }
      history.push({ role: "assistant", content: data.reply });
      return data.reply;
    });
  }).catch(function (err) {
    history.pop(); // don't keep the failed turn
    throw err;
  });
}

function send_text(presetText) {
  var x = (typeof presetText === "string" ? presetText : input.value).trim();
  if (x === "" || busy) return;
  busy = true;

  var tick = addMessage(x, "out");
  input.value = "";
  quickEl.innerHTML = "";
  input.focus();

  setTimeout(function () { setReadTicks(tick, "delivered"); }, 300);

  var started = Date.now();
  var replyPromise = aiConfigured === false
    ? Promise.resolve(getReply(x))                 // offline fallback
    : askAI(x).catch(function (err) {
        if (err.status === 503) {                  // server has no API key
          aiConfigured = false;
          return getReply(x);
        }
        return "⚠️ " + (err.status ? err.message : "Can't reach the chat server. Is it running?");
      });

  sleep(600).then(function () {
    setReadTicks(tick, "read");
    statusEl.textContent = "typing...";
    showTyping();
    return replyPromise;
  }).then(function (reply) {
    // make sure the typing dots show for a natural minimum time
    var minTyping = Math.min(800 + reply.length * 10, 2000);
    return sleep(Math.max(0, minTyping - (Date.now() - started - 600))).then(function () { return reply; });
  }).then(function (reply) {
    hideTyping();
    addMessage(reply, "in");
    statusEl.textContent = "online";
    busy = false;
  });
}

function answer() {} // kept for backwards compatibility

function showQuickReplies() {
  ["Tell me a joke 😂", "What time is it?", "What can you do?", "Flip a coin"].forEach(function (label) {
    var b = document.createElement("button");
    b.textContent = label;
    b.onclick = function () { send_text(label); };
    quickEl.appendChild(b);
  });
}

function startChat() {
  box.innerHTML = "";
  lastSide = null;
  addChip("Today");
  addChip("🤖 Zara is an AI chatbot. Replies are generated by an AI model and may not always be accurate.", "notice");
  addMessage("Hi! I'm " + BOT_NAME + " 👋 Your AI chat buddy. Ask me anything or tap a suggestion below.", "in");
  history = [];
  quickEl.innerHTML = "";
  showQuickReplies();
}

input.addEventListener("keydown", function (e) {
  if (e.key === "Enter") { e.preventDefault(); send_text(); }
});

document.getElementById("clear_btn").addEventListener("click", function () {
  if (!busy && confirm("Clear this chat?")) startChat();
});

startChat();

fetch("/api/status").then(function (r) { return r.json(); }).then(function (d) {
  aiConfigured = !!d.configured;
  if (!aiConfigured) addChip("⚠️ No AI key set on the server, so Zara is using basic offline replies. See the README to enable the real AI model.", "notice");
}).catch(function () {});
