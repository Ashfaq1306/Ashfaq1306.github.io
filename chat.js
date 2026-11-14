// "Ask my AI" chat widget.
// With profile.chat.endpoint set, answers stream from the Claude backend (chat-server/).
// Without it (or if the backend is unreachable), a built-in assistant answers from the profile itself.
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// escape first, then turn URLs and emails into links
const linkify = (s) => esc(s)
  .replace(/https?:\/\/[^\s<)]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\/(www\.)?/, "")}</a>`)
  .replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, (m) => `<a href="mailto:${m}">${m}</a>`)
  .replace(/\n/g, "<br>");

/* ---------------- built-in assistant (no AI, no server) ---------------- */
function localAnswer(p, q) {
  const t = q.toLowerCase();
  const bn = /[ঀ-৿]/.test(q);
  const has = (...w) => w.some((x) => t.includes(x));
  const projects = p.projects || [];
  const link = (x) => (x.links || []).map((l) => `${l.label}: ${l.url}`).join("\n");
  const first = p.name.split(" ").slice(-2, -1)[0] || p.name;

  if (/^\s*(hi|hello|hey|salam|assalamu|yo|হ্যালো|হাই|সালাম|আসসালামু)/i.test(q))
    return bn ? `হ্যালো! আমি ${first}-এর অ্যাসিস্ট্যান্ট। ওনার প্রজেক্ট, স্কিল বা যোগাযোগ নিয়ে জিজ্ঞেস করুন।` : `Hello! Ask me about ${first}'s projects, skills or how to reach him.`;

  if (has("educat", "universit", "college", "school", "nsu", "degree", "where did he study", "পড়া", "পড়াশোনা"))
    return "Education:\n" + (p.education || []).map((e) => `• ${[e.degree, e.school].filter(Boolean).join(", ")}`).join("\n");
  if (has("contact", "email", "mail", "hire", "reach", "connect", "talk", "collab", "work with", "যোগাযোগ", "ইমেইল"))
    return `The best way is email: ${p.email}\n` + (p.links || []).map((l) => `${l.label}: ${l.url}`).join("\n");

  const aliases = { sohayok: ["tammy", "voice assistant", "siri", "সহায়ক"], "joruri bd": ["joruri", "emergency", "sos", "জরুরি"], "study mate": ["quiz", "lock apps", "distract"], "laya-bangla": ["laya", "classif", "moderation", "routing"] };
  const hit = projects.find((x) => has(x.name.toLowerCase(), ...(x.native ? [x.native] : []), ...(aliases[x.name.toLowerCase()] || [])));
  if (hit) return `${hit.name}: ${hit.subtitle}\n${hit.description}\n${link(hit)}`;

  if (has("project", "build", "built", "work", "portfolio", "made", "app", "প্রজেক্ট", "কাজ"))
    return `He has built ${projects.length} projects:\n` + projects.map((x) => `• ${x.name}: ${x.subtitle}`).join("\n") + "\nAsk about any of them for details.";
  if (has("skill", "stack", "tech", "tool", "framework", "language", "know", "python", "flutter", "স্কিল"))
    return (p.skills || []).map((g) => `${g.group}: ${g.items.join(", ")}`).join("\n");
  if (has("where", "based", "location", "live", "from", "country", "কোথায়"))
    return `He is based in ${p.location}.`;
  if (has("github", "hugging", "open source", "model", "link", "linkedin"))
    return (p.links || []).map((l) => `${l.label}: ${l.url}`).join("\n");
  if (has("who", "about", "yourself", "introduce", "background", "tell me", "কে"))
    return `${p.name} is an ${p.title.toLowerCase()} in ${p.location}. ${(p.about || [])[0] || ""}`;
  if (has("are you", "bot", " ai", "robot"))
    return "I'm a small assistant on this page. I answer from his public profile.";
  return `I'm not sure about that. I can tell you about his projects (${projects.map((x) => x.name).join(", ")}), his skills, education or how to contact him. For anything else, email ${p.email}.`;
}

/* ---------------- widget ---------------- */
export function initChat(p) {
  const cfg = p.chat || {};
  if (cfg.enabled === false) return;
  const endpoint = (cfg.endpoint || "").replace(/\/$/, "");
  const history = [];

  document.body.insertAdjacentHTML("beforeend", `
    <button class="chat-launch" id="chatLaunch" aria-label="Ask my AI assistant" aria-expanded="false">
      <span class="chat-launch-star">✦</span><span class="chat-launch-text">Ask my AI</span>
    </button>
    <section class="chat" id="chat" role="dialog" aria-label="Chat with Ashfaqur's assistant" hidden>
      <header class="chat-head">
        <span class="chat-avatar"><img src="${esc(p.photo)}" alt=""></span>
        <div><b>${esc((p.shortName || p.name))}'s assistant</b><span class="chat-status"><i></i>${endpoint ? "AI · usually answers in seconds" : "Answers from this profile"}</span></div>
        <button class="chat-close" id="chatClose" aria-label="Close chat">✕</button>
      </header>
      <div class="chat-body" id="chatBody" aria-live="polite"></div>
      <div class="chat-suggest" id="chatSuggest">${(cfg.suggestions || []).map((s) => `<button>${esc(s)}</button>`).join("")}</div>
      <form class="chat-form" id="chatForm">
        <textarea id="chatInput" rows="1" maxlength="1000" placeholder="Ask anything about ${esc(p.name.split(" ").slice(-2, -1)[0] || "me")}…" aria-label="Your message"></textarea>
        <button type="submit" aria-label="Send" id="chatSend">↑</button>
      </form>
      <p class="chat-note">${endpoint ? "AI can make mistakes. Answers are based on this public profile." : "Answers are based on this public profile."}</p>
    </section>`);

  const $ = (id) => document.getElementById(id);
  const panel = $("chat"), launch = $("chatLaunch"), body = $("chatBody"), input = $("chatInput"), form = $("chatForm"), send = $("chatSend");

  const bubble = (role, html) => {
    const el = document.createElement("div");
    el.className = `msg ${role}`;
    el.innerHTML = html;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  };
  bubble("bot", linkify(cfg.greeting || "Hi! Ask me anything about this profile."));

  const open = (v) => {
    panel.hidden = !v;
    launch.setAttribute("aria-expanded", v);
    document.body.classList.toggle("chat-open", v);
    if (v) setTimeout(() => input.focus(), 50);
  };
  launch.addEventListener("click", () => open(panel.hidden));
  $("chatClose").addEventListener("click", () => open(false));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) open(false); });

  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 120) + "px"; });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  $("chatSuggest").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) ask(b.textContent); });
  form.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });

  let busy = false;
  async function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true; send.disabled = true;
    input.value = ""; input.style.height = "auto";
    $("chatSuggest").hidden = true;
    bubble("me", esc(text));
    history.push({ role: "user", content: text });
    const out = bubble("bot typing", "<span></span><span></span><span></span>");
    let answer = "";
    try {
      if (!endpoint) throw new Error("no endpoint");
      const slow = setTimeout(() => { if (!answer) out.dataset.wait = "Waking the assistant up…"; }, 4000);
      const res = await fetch(`${endpoint}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }) });
      clearTimeout(slow);
      if (!res.ok || !res.body) { answer = (await res.text()) || "Sorry, something went wrong."; }
      else {
        const reader = res.body.getReader(), dec = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          answer += dec.decode(value, { stream: true });
          out.className = "msg bot"; out.removeAttribute("data-wait");
          out.innerHTML = linkify(answer);
          body.scrollTop = body.scrollHeight;
        }
      }
    } catch {
      // no backend configured or it is unreachable: answer from the profile
      await new Promise((r) => setTimeout(r, 450));
      answer = localAnswer(p, text);
    }
    out.className = "msg bot"; out.removeAttribute("data-wait");
    out.innerHTML = linkify(answer.trim() || "Sorry, I couldn't answer that.");
    history.push({ role: "assistant", content: answer.trim() || "…" });
    body.scrollTop = body.scrollHeight;
    busy = false; send.disabled = false;
  }
}
