// Renders the profile from data/profile.json. Edit that file (or use edit.html) to update the site.
const ICONS = {
  github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>',
  huggingface: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="11" r="8.5"/><circle cx="9" cy="9.5" r=".9" fill="currentColor"/><circle cx="15" cy="9.5" r=".9" fill="currentColor"/><path d="M8.6 13.2c.9 1.5 2 2.2 3.4 2.2s2.5-.7 3.4-2.2"/><path d="M4.2 15.5c-1 .6-1.6 1.8-.9 3 .9 1.4 3 1.6 4.4 2.5M19.8 15.5c1 .6 1.6 1.8.9 3-.9 1.4-3 1.6-4.4 2.5"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  lock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
};

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (s, r = document) => r.querySelector(s);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;

async function loadProfile() {
  const params = new URLSearchParams(location.search);
  if (params.has("preview")) {
    try {
      const draft = localStorage.getItem("profileDraft");
      if (draft) return JSON.parse(draft);
    } catch {}
  }
  const res = await fetch(`data/profile.json?v=${Date.now()}`);
  return res.json();
}

function linkBtn(l) {
  const icon = /github/i.test(l.url) ? ICONS.github : /huggingface/i.test(l.url) ? ICONS.huggingface : ICONS.link;
  return `<a class="link-btn" href="${esc(l.url)}" target="_blank" rel="noopener">${icon}${esc(l.label)}</a>`;
}

function render(p) {
  document.querySelectorAll("[data-bind]").forEach((el) => (el.textContent = p[el.dataset.bind] ?? ""));
  $("#portrait").src = p.photo;
  $("#year").textContent = new Date().getFullYear();

  const socials = (p.links || []).map((l) => `<a class="social" href="${esc(l.url)}" ${l.url.startsWith("mailto") ? "" : 'target="_blank" rel="noopener"'} aria-label="${esc(l.label)}" title="${esc(l.label)}">${ICONS[l.icon] || ICONS.link}</a>`).join("");
  $("#heroSocials").innerHTML = socials;
  $("#footSocials").innerHTML = socials;
  $("#mailBtn").href = `mailto:${p.email}`;
  $("#mailBtn").textContent = `Say hello · ${p.email}`;

  $("#aboutText").innerHTML = (p.about || []).map((t) => `<p>${esc(t)}</p>`).join("") +
    `<div class="about-meta"><span class="meta-tag">📍 ${esc(p.location)}</span><span class="meta-tag">🎓 ${esc(p.affiliation)}</span><span class="meta-tag">🗣️ Bangla · English</span></div>`;
  $("#stats").innerHTML = (p.stats || []).map((s) => `<div class="stat glass tilt reveal"><span class="v" data-count="${esc(s.value)}">${esc(s.value)}</span><span class="l">${esc(s.label)}</span></div>`).join("");

  // Projects
  const projects = p.projects || [];
  const cats = ["All", ...new Set(projects.map((x) => (x.category || "").split(" · ")[0]).filter(Boolean))];
  $("#filters").innerHTML = cats.map((c, i) => `<button class="filter ${i ? "" : "on"}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  $("#projectGrid").innerHTML = projects.map((x) => `
    <article class="project glass tilt reveal" data-cat="${esc((x.category || "").split(" · ")[0])}" style="--accent:${esc(x.accent || "#3d7bff")}">
      ${x.image ? `<div class="shot"><img src="${esc(x.image)}" alt="${esc(x.name)} screenshot" loading="lazy"></div>` : `<div class="icon">${esc(initials(x.name))}</div>`}
      <span class="cat">${esc(x.category || "")}</span>
      <h3>${esc(x.name)}</h3>
      <div class="sub">${esc(x.subtitle || "")}</div>
      <p>${esc(x.description || "")}</p>
      <div class="tags">${(x.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      ${x.links?.length ? `<div class="links">${x.links.map(linkBtn).join("")}</div>` : `<span class="private">${ICONS.lock} Private / client work · details on request</span>`}
    </article>`).join("");
  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest(".filter");
    if (!b) return;
    document.querySelectorAll(".filter").forEach((f) => f.classList.toggle("on", f === b));
    document.querySelectorAll(".project").forEach((card) => card.classList.toggle("hide", b.dataset.cat !== "All" && card.dataset.cat !== b.dataset.cat));
  });

  // Journey
  const tl = (items, a, b) => items.map((e) => `<li class="glass reveal">${e.period ? `<span class="when">${esc(e.period)}</span>` : ""}<h4>${esc(e[a])}</h4><div class="org">${[e[b], e.location].filter(Boolean).map(esc).join(" · ")}</div>${e.description ? `<p>${esc(e.description)}</p>` : ""}</li>`).join("");
  const hasExp = (p.experience || []).length > 0;
  $("#expCol").hidden = !hasExp;
  $("#journey .timeline-wrap").classList.toggle("single", !hasExp);
  $("#journey h2").textContent = hasExp ? "Experience & education" : "Education";
  $("#experience").innerHTML = tl(p.experience || [], "role", "org");
  $("#education").innerHTML = tl(p.education || [], "school", "degree");

  // Skills
  $("#skillGroups").innerHTML = (p.skills || []).map((g) => `<div class="skill-group glass reveal"><h4>${esc(g.group)}</h4><div class="tags">${g.items.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></div>`).join("");
  tagSphere((p.skills || []).flatMap((g) => g.items));

  typeRoles(p.roles || [p.title]);
  if (p.github?.showLatest) liveGithub(p.github, projects);
}

const initials = (n) => n.replace(/\(.*?\)/g, "").split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function typeRoles(roles) {
  const el = $("#typed");
  if (reduced) { el.textContent = roles[0]; return; }
  let i = 0, j = 0, del = false;
  (function tick() {
    const word = roles[i % roles.length];
    el.textContent = word.slice(0, j);
    if (!del && j === word.length) { del = true; return setTimeout(tick, 1700); }
    if (del && j === 0) { del = false; i++; }
    j += del ? -1 : 1;
    setTimeout(tick, del ? 32 : 65);
  })();
}

async function liveGithub(cfg, projects) {
  try {
    const res = await fetch(`https://api.github.com/users/${cfg.username}/repos?sort=updated&per_page=30`);
    if (!res.ok) return;
    const shown = new Set(projects.flatMap((x) => (x.links || []).map((l) => l.url.toLowerCase().replace(/\/$/, ""))));
    const repos = (await res.json()).filter((r) => !r.private && !(cfg.exclude || []).includes(r.name) && !shown.has(r.html_url.toLowerCase()));
    if (!repos.length) return;
    $("#ghGrid").innerHTML = repos.slice(0, 6).map((r) => `<a class="gh-card" href="${r.html_url}" target="_blank" rel="noopener"><b>${esc(r.name)}</b><span class="d">${esc(r.description || "No description yet")}</span><span>${esc(r.language || "")} · ★ ${r.stargazers_count} · updated ${new Date(r.updated_at).toLocaleDateString()}</span></a>`).join("");
    $("#ghLive").hidden = false;
    observe($("#ghLive"));
  } catch {}
}

// 3D skill sphere (pure CSS transforms)
function tagSphere(words) {
  const box = $("#tagSphere");
  const uniq = [...new Set(words)].slice(0, 30);
  box.innerHTML = uniq.map((w) => `<span>${esc(w)}</span>`).join("");
  const els = [...box.children];
  const n = els.length;
  const pts = els.map((_, i) => {
    const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = Math.PI * (3 - Math.sqrt(5)) * i;
    return [Math.cos(t) * r, y, Math.sin(t) * r];
  });
  let ax = 0.003, ay = 0.005, rx = 0, ry = 0, dragging = false, lx = 0, ly = 0;
  const draw = () => {
    const R = box.clientWidth * 0.44;
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
    els.forEach((el, i) => {
      let [x, y, z] = pts[i];
      [y, z] = [y * cx - z * sx, y * sx + z * cx];
      [x, z] = [x * cy + z * sy, -x * sy + z * cy];
      const s = (z + 2) / 3;
      el.style.transform = `translate(-50%,-50%) translate3d(${x * R}px,${y * R}px,0) scale(${0.55 + s * 0.65})`;
      el.style.opacity = (0.25 + s * 0.75).toFixed(2);
      el.style.zIndex = Math.round(s * 100);
    });
  };
  // animate only while the sphere is on screen
  let visible = false, raf = 0;
  const loop = () => { if (!visible) { raf = 0; return; } if (!dragging) { rx += ax; ry += ay; } draw(); raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf && !reduced) raf = requestAnimationFrame(loop); }).observe(box);
  box.addEventListener("pointerdown", (e) => { dragging = true; lx = e.clientX; ly = e.clientY; box.setPointerCapture(e.pointerId); });
  box.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    ry += (e.clientX - lx) * 0.008; rx -= (e.clientY - ly) * 0.008;
    ay = (e.clientX - lx) * 0.0008 || ay; ax = -(e.clientY - ly) * 0.0008 || ax;
    lx = e.clientX; ly = e.clientY;
  });
  box.addEventListener("pointerup", () => (dragging = false));
  draw();
}

// interactions
function tilt() {
  if (!finePointer || reduced) return;
  document.querySelectorAll(".tilt, .tilt-soft").forEach((el) => {
    const max = el.classList.contains("tilt-soft") ? 3 : 9;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateZ(0)`;
      el.style.setProperty("--mx", `${px * 100}%`); el.style.setProperty("--my", `${py * 100}%`);
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });
  const card = $("#portraitCard");
  window.addEventListener("pointermove", (e) => {
    const px = e.clientX / innerWidth - 0.5, py = e.clientY / innerHeight - 0.5;
    card.style.transform = `rotateY(${px * 22}deg) rotateX(${-py * 18}deg)`;
    const shine = card.querySelector(".shine");
    shine.style.setProperty("--mx", `${50 + px * 80}%`); shine.style.setProperty("--my", `${50 + py * 80}%`);
  });
}

let io;
function observe(el) { io ? io.observe(el) : el.classList.add("in"); }
function reveals() {
  io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal").forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });
}

function nav() {
  const navEl = $("#nav");
  addEventListener("scroll", () => navEl.classList.toggle("scrolled", scrollY > 30), { passive: true });
  $("#navToggle").addEventListener("click", () => navEl.classList.toggle("open"));
  $("#navLinks").addEventListener("click", () => navEl.classList.remove("open"));
  const links = [...document.querySelectorAll(".nav-links a")];
  const spy = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${e.target.id}`));
  }), { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("section[id]").forEach((s) => spy.observe(s));
}

// pause decorative CSS animations (portrait rings) while they are off screen
function pauseOffscreen() {
  const po = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("paused", !e.isIntersecting)));
  document.querySelectorAll(".hero-visual").forEach((el) => po.observe(el));
}

loadProfile().then((p) => { render(p); reveals(); tilt(); nav(); pauseOffscreen(); document.title = `${p.name} · ${p.title}`; })
  .catch((e) => { console.error(e); document.body.insertAdjacentHTML("beforeend", '<p style="position:relative;z-index:5;text-align:center">Could not load profile data.</p>'); });
