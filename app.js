// Renders the profile from data/profile.json and adds the interactions.
import { initChat } from "./chat.js";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// *word* in the data becomes <em>word</em>
const rich = (s = "") => esc(s).replace(/\*(.+?)\*/g, "<em>$1</em>");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;
const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);

async function loadProfile() {
  // ?preview shows an unpublished draft, only when the site is opened from your own PC
  if (isLocal && new URLSearchParams(location.search).has("preview")) {
    try { const d = localStorage.getItem("profileDraft"); if (d) return JSON.parse(d); } catch {}
  }
  const res = await fetch(`data/profile.json?v=${Date.now()}`);
  return res.json();
}

/* ---------------- render ---------------- */
function render(p) {
  $$("[data-bind]").forEach((el) => (el.textContent = p[el.dataset.bind] ?? ""));
  document.title = `${p.name} · ${p.title}`;
  $("#year").textContent = new Date().getFullYear();

  // hero
  const parts = p.name.trim().split(/\s+/);
  $("#nameFirst").textContent = parts.slice(0, -1).join(" ");
  $("#nameLast").textContent = parts.at(-1);
  $("#eyebrow").textContent = `${p.title} · ${p.location}`;
  $("#tagline").innerHTML = rich(p.tagline);
  $("#portrait").src = p.photo;
  $("#heroFacts").innerHTML = (p.heroFacts || []).map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join("");

  // marquee (doubled for a seamless loop)
  const items = (p.marquee || []).map((m) => `<span>${esc(m)}</span>`).join("");
  $("#marqueeTrack").innerHTML = items + items;

  // work
  const projects = p.projects || [];
  $("#workCount").textContent = `${String(projects.length).padStart(2, "0")} projects`;
  $("#workList").innerHTML = projects.map((x, i) => `
    <article class="work">
      <div class="work-info reveal">
        <div class="work-meta"><span class="num">${String(i + 1).padStart(2, "0")}</span><span class="rule"></span><span>${esc(x.category || "")}${x.year ? ` · ${esc(x.year)}` : ""}</span></div>
        <h3>${esc(x.name)}${x.native ? `<span class="native">${esc(x.native)}</span>` : ""}</h3>
        <p class="subtitle">${esc(x.subtitle || "")}</p>
        <p class="desc">${esc(x.description || "")}</p>
        <div class="tags">${(x.tags || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
        <div class="links">${(x.links || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} <span aria-hidden="true">↗</span></a>`).join("")}</div>
      </div>
      <div class="work-visual reveal">${visual(x)}</div>
    </article>`).join("");

  // about
  $("#statement").innerHTML = rich(p.statement || "");
  $("#aboutText").innerHTML = (p.about || []).map((t) => `<p>${esc(t)}</p>`).join("");
  const facts = [{ label: "Based in", value: p.location }];
  if ((p.education || []).length) facts.push({ label: "Education", value: p.education.map((e) => [e.degree, e.school].filter(Boolean).join(", ")), list: true });
  if ((p.experience || []).length) facts.push({ label: "Experience", value: p.experience.map((e) => [e.role, e.org].filter(Boolean).join(", ")), list: true });
  facts.push(...(p.facts || []));
  $("#facts").innerHTML = facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${f.list ? f.value.map((v) => `<span>${esc(v)}</span>`).join("") : esc(f.value)}</dd></div>`).join("");
  $("#stats").innerHTML = (p.stats || []).map((s) => `<div class="stat reveal"><span class="v" data-to="${esc(s.value)}">${esc(s.value)}</span><span class="l">${esc(s.label)}</span></div>`).join("");

  // stack
  $("#stackGrid").innerHTML = (p.skills || []).map((g) => `<div class="stack-col reveal"><h4>${esc(g.group)}</h4><ul>${g.items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>`).join("");

  // contact
  $("#mail").href = `mailto:${p.email}`;
  $("#mailText").textContent = p.email;
  $("#contactLinks").innerHTML = (p.links || []).map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a></li>`).join("");

  if (p.github?.showLatest) moreOnGithub(p.github, projects);
}

function visual(x) {
  const v = x.visual || {};
  if (v.type === "voice") {
    return `<div class="visual" data-voice='${esc(JSON.stringify(v.lines || []))}'>
      <span class="visual-label"><i></i>Listening</span>
      <div class="voice"><div class="orb"></div>
        <div class="wave">${Array.from({ length: 14 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
        <div class="bubble"><div class="say"></div><div class="does"></div></div>
      </div></div>`;
  }
  if (v.type === "phone" && v.image) {
    return `<div class="visual"><div class="phone-stage"><div class="phone"><img src="${esc(v.image)}" alt="${esc(x.name)} app screen" loading="lazy"></div></div><div class="phone-shadow"></div></div>`;
  }
  if (v.type === "decision") {
    return `<div class="visual"><div class="decision">
      <div class="lbl">Input</div><div class="input">${esc(v.input || "")}</div>
      <div class="q">${esc(v.question || "")}</div>
      ${(v.options || []).map((o) => `<div class="opt"><span>${esc(o.label)}</span><span class="v">${Math.round((+o.value || 0) * 100)}%</span><div class="bar"><i data-w="${Math.round((+o.value || 0) * 100)}"></i></div></div>`).join("")}
      ${v.note ? `<div class="note">${esc(v.note)}</div>` : ""}
    </div></div>`;
  }
  if (v.type === "sos") {
    return `<div class="visual sos-visual">
      <span class="visual-label"><i class="red"></i>Emergency</span>
      <div class="sos"><div class="sos-ring"></div><div class="sos-ring r2"></div><div class="sos-disc"><b>SOS</b><small class="sos-count">Hold</small></div></div>
      <div class="sos-facts">${(v.facts || []).map((f) => `<div><b>${esc(f.value)}</b><span>${esc(f.label)}</span></div>`).join("")}</div>
    </div>`;
  }
  if (v.type === "image" && v.image) {
    return `<div class="visual"><img src="${esc(v.image)}" alt="${esc(x.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover"></div>`;
  }
  const initials = x.name.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("");
  return `<div class="visual"><span class="mono-visual">${esc(initials)}</span></div>`;
}

async function moreOnGithub(cfg, projects) {
  try {
    const res = await fetch(`https://api.github.com/users/${cfg.username}/repos?sort=updated&per_page=40`);
    if (!res.ok) return;
    const shown = new Set(projects.flatMap((x) => (x.links || []).map((l) => l.url.toLowerCase().replace(/\/$/, ""))));
    const repos = (await res.json()).filter((r) => !r.private && !r.archived && !(cfg.exclude || []).includes(r.name) && !shown.has(r.html_url.toLowerCase()));
    if (!repos.length) return;
    $("#moreList").innerHTML = repos.slice(0, 6).map((r) => `<li><a href="${r.html_url}" target="_blank" rel="noopener"><b>${esc(r.name)}</b><span class="d">${esc(r.description || "")}</span><span class="m">${esc(r.language || "")} ↗</span></a></li>`).join("");
    $("#more").hidden = false;
    observeReveal($("#more"));
  } catch {}
}

/* ---------------- behaviour ---------------- */
let revealIO;
function observeReveal(el) { revealIO ? revealIO.observe(el) : el.classList.add("in"); }
function reveals() {
  revealIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    revealIO.unobserve(e.target);
    e.target.querySelectorAll?.(".bar i").forEach((b) => (b.style.width = b.dataset.w + "%"));
    if (e.target.classList.contains("stat")) countUp(e.target.querySelector(".v"));
  }), { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
  $$(".reveal").forEach((el) => {
    const sib = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    el.style.transitionDelay = `${Math.min(sib.indexOf(el), 4) * 90}ms`;
    revealIO.observe(el);
  });
}

function countUp(el) {
  const m = /^(\d+)(.*)$/.exec(el.dataset.to || "");
  if (!m || reduced) return;
  const end = +m[1], suffix = m[2], t0 = performance.now(), dur = 1400;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
    el.textContent = Math.round(end * e) + suffix;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Sohayok: cycle through example commands
function voiceDemos() {
  $$("[data-voice]").forEach((box) => {
    let lines = [];
    try { lines = JSON.parse(box.dataset.voice); } catch {}
    if (!lines.length) return;
    const say = $(".say", box), does = $(".does", box);
    let i = 0, timer = 0, visible = false;
    const show = () => {
      const l = lines[i++ % lines.length];
      say.classList.remove("show"); does.classList.remove("show");
      setTimeout(() => { say.textContent = `“${l.say}”`; say.classList.add("show"); }, 350);
      setTimeout(() => { does.textContent = `→ ${l.does}`; does.classList.add("show"); }, 1250);
    };
    const run = () => { clearInterval(timer); if (!visible) return; show(); if (!reduced) timer = setInterval(show, 3600); };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; run(); box.classList.toggle("paused", !visible); }, { threshold: 0.2 }).observe(box);
  });
}

// Joruri BD: SOS countdown loop
function sosDemos() {
  $$(".sos-visual").forEach((box) => {
    const c = $(".sos-count", box), disc = $(".sos-disc", box);
    const steps = ["Hold", "3", "2", "1", "Sent ✓"];
    let i = 0, timer = 0;
    const tick = () => { const s = steps[i++ % steps.length]; c.textContent = s; disc.classList.toggle("sent", s.startsWith("Sent")); };
    new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (e.isIntersecting && !reduced) timer = setInterval(tick, 900);
    }, { threshold: 0.2 }).observe(box);
  });
}

// pause CSS animations that are off screen (cheaper on phones)
function pauseOffscreen() {
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("paused", !e.isIntersecting)));
  [".hero", ".marquee", ".visual"].forEach((s) => $$(s).forEach((el) => io.observe(el)));
}

function nav() {
  const navEl = $("#nav"), bar = $("#progress");
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    navEl.classList.toggle("scrolled", y > 40);
    navEl.classList.toggle("hide", y > lastY && y > 400 && !navEl.classList.contains("open"));
    lastY = y;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  const toggle = $("#navToggle");
  toggle.addEventListener("click", () => { const o = navEl.classList.toggle("open"); toggle.setAttribute("aria-expanded", o); document.body.style.overflow = o ? "hidden" : ""; });
  $("#navLinks").addEventListener("click", (e) => { if (e.target.closest("a")) { navEl.classList.remove("open"); toggle.setAttribute("aria-expanded", false); document.body.style.overflow = ""; } });
  const links = $$(".nav-links a:not(.nav-cta)");
  const spy = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${e.target.id}`));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("section[id]").forEach((s) => spy.observe(s));
}

function pointerFx() {
  if (!fine || reduced) return;
  // soft cursor ring
  const cur = $("#cursor");
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
  (function loop() { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
  document.addEventListener("pointerover", (e) => cur.classList.toggle("hover", !!e.target.closest("a, button")));

  // magnetic buttons
  $$(".magnetic").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });

  // portrait follows the pointer in 3D
  const arch = $("#arch");
  addEventListener("pointermove", (e) => {
    if (scrollY > innerHeight) return;
    const px = e.clientX / innerWidth - 0.5, py = e.clientY / innerHeight - 0.5;
    arch.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 8}deg)`;
    arch.style.setProperty("--sx", `${50 + px * 70}%`); arch.style.setProperty("--sy", `${40 + py * 70}%`);
  }, { passive: true });

  // project visuals tilt
  $$(".visual").forEach((v) => {
    v.addEventListener("pointermove", (e) => {
      const r = v.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      v.style.transform = `rotateY(${px * 8}deg) rotateX(${-py * 8}deg)`;
    });
    v.addEventListener("pointerleave", () => (v.style.transform = ""));
  });
}

function clock() {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: true });
  const tick = () => ($("#clock").textContent = fmt.format(new Date()).toUpperCase());
  tick(); setInterval(tick, 30000);
}

loadProfile()
  .then((p) => { render(p); reveals(); voiceDemos(); sosDemos(); pauseOffscreen(); nav(); pointerFx(); clock(); initChat(p); })
  .catch((e) => { console.error(e); document.body.insertAdjacentHTML("beforeend", '<p style="text-align:center;padding:40px">Could not load the profile.</p>'); });
