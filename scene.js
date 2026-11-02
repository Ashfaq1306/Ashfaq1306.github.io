// WebGL background: a glowing "neural globe" of nodes and synapses plus a starfield.
import * as THREE from "three";

const canvas = document.getElementById("bg3d");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
const lowEnd = mobile || (navigator.hardwareConcurrency || 8) <= 4;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowEnd, alpha: true, powerPreference: "high-performance" });
} catch (e) {
  canvas.remove();
  throw e;
}
// phones: render at a lower resolution (the glow hides it) and adapt further if frames are slow
let dpr = mobile ? Math.min(devicePixelRatio, 1.25) : Math.min(devicePixelRatio, 2);
const minDpr = mobile ? 0.6 : 1;
renderer.setPixelRatio(dpr);
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x040a1c, 0.045);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 9);

// soft round sprite for points
const sprite = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(160,200,255,.9)");
  grd.addColorStop(1, "rgba(60,120,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

// ---------- neural globe ----------
const globe = new THREE.Group();
scene.add(globe);

const N = mobile ? 240 : lowEnd ? 500 : 900;
const R = 2.6;
const nodes = [];
const pos = new Float32Array(N * 3);
const col = new Float32Array(N * 3);
const cA = new THREE.Color("#3d7bff"), cB = new THREE.Color("#22d3ee"), cC = new THREE.Color("#a78bfa");
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = Math.PI * (3 - Math.sqrt(5)) * i;
  const jitter = 1 + (Math.random() - 0.5) * 0.12;
  const v = new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r).multiplyScalar(R * jitter);
  nodes.push(v);
  pos.set([v.x, v.y, v.z], i * 3);
  const c = cA.clone().lerp(Math.random() > 0.5 ? cB : cC, Math.random() * 0.8);
  col.set([c.r, c.g, c.b], i * 3);
}
const nodeGeo = new THREE.BufferGeometry();
nodeGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
nodeGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
const nodeMat = new THREE.PointsMaterial({
  size: mobile ? 0.11 : 0.09, map: sprite, vertexColors: true, transparent: true,
  depthWrite: false, blending: THREE.AdditiveBlending,
});
globe.add(new THREE.Points(nodeGeo, nodeMat));

// synapses between nearby nodes
const linePos = [];
const maxD = R * (mobile ? 0.3 : 0.19);
for (let i = 0; i < N; i++) {
  let k = 0;
  for (let j = i + 1; j < N && k < (mobile ? 2 : 3); j++) {
    if (nodes[i].distanceTo(nodes[j]) < maxD) {
      linePos.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
      k++;
    }
  }
}
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
const lineMat = new THREE.LineBasicMaterial({ color: 0x4f8cff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
globe.add(new THREE.LineSegments(lineGeo, lineMat));

// inner glowing core + wire shells
const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(1.15, 2),
  new THREE.MeshBasicMaterial({ color: 0x2a5cff, wireframe: true, transparent: true, opacity: 0.18 })
);
globe.add(core);
const shell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(R * 1.18, 1),
  new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.05 })
);
globe.add(shell);

// orbit rings
const rings = [];
[[R * 1.35, 0.9, 0x3d7bff], [R * 1.55, -0.5, 0x8b5cf6], [R * 1.2, 0.2, 0x22d3ee]].forEach(([rad, tilt, color], i) => {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(rad, 0.008, 8, 200),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending })
  );
  ring.rotation.x = Math.PI / 2 + tilt;
  ring.rotation.y = i * 0.6;
  // a satellite on each ring
  const sat = new THREE.Sprite(new THREE.SpriteMaterial({ map: sprite, color, blending: THREE.AdditiveBlending, depthWrite: false }));
  sat.scale.setScalar(0.35);
  ring.add(sat);
  ring.userData = { rad, sat, speed: 0.25 + i * 0.12 };
  rings.push(ring);
  globe.add(ring);
});

// signals travelling along synapses
const PULSES = mobile ? 16 : 70;
const pulsePos = new Float32Array(PULSES * 3);
const pulses = [];
const segCount = linePos.length / 6;
for (let i = 0; i < PULSES; i++) pulses.push({ seg: (Math.random() * segCount) | 0, t: Math.random(), v: 0.4 + Math.random() * 0.9 });
const pulseGeo = new THREE.BufferGeometry();
pulseGeo.setAttribute("position", new THREE.BufferAttribute(pulsePos, 3));
globe.add(new THREE.Points(pulseGeo, new THREE.PointsMaterial({ size: 0.16, map: sprite, color: 0xbff4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));

// ---------- starfield ----------
const S = mobile ? 450 : 2200;
const starPos = new Float32Array(S * 3);
for (let i = 0; i < S; i++) {
  starPos.set([(Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, -Math.random() * 40 - 2], i * 3);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.06, map: sprite, color: 0x9cc3ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(stars);

// floating geometric shards
const shards = [];
const shardGeos = [new THREE.OctahedronGeometry(0.28), new THREE.TetrahedronGeometry(0.3), new THREE.IcosahedronGeometry(0.24)];
for (let i = 0; i < (mobile ? 4 : 14); i++) {
  const m = new THREE.Mesh(shardGeos[i % 3], new THREE.MeshBasicMaterial({ color: [0x3d7bff, 0x22d3ee, 0x8b5cf6][i % 3], wireframe: true, transparent: true, opacity: 0.5 }));
  m.position.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 12, -Math.random() * 8 - 1);
  m.userData = { s: 0.2 + Math.random() * 0.6, o: Math.random() * 10 };
  shards.push(m);
  scene.add(m);
}

// ---------- interaction ----------
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener("pointermove", (e) => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
let scrollP = 0;
addEventListener("scroll", () => { scrollP = scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight); }, { passive: true });
// Mobile browsers fire resize whenever the address bar shows/hides while scrolling.
// Re-allocating the canvas then causes visible jank, so only resize on real changes.
let lastW = innerWidth, lastH = innerHeight;
addEventListener("resize", () => {
  if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 160) return;
  lastW = innerWidth; lastH = innerHeight;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}, { passive: true });

const clock = new THREE.Clock();
const a = new THREE.Vector3(), b = new THREE.Vector3();
let running = true;
document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running && !reduced) { clock.getDelta(); loop(); } });

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;

  // globe sits right of the hero, drifts left and back as you scroll
  const wide = innerWidth > 960;
  const baseX = wide ? 3.4 : 0;
  const baseY = wide ? 0 : 1.8;
  globe.position.x = baseX - Math.sin(scrollP * Math.PI * 2) * (wide ? 6.5 : 0.5);
  globe.position.y = baseY + Math.cos(scrollP * Math.PI * 4) * 0.4 - (wide ? 0 : scrollP * 1.5);
  globe.position.z = -scrollP * 3 - (wide ? 1.5 : 3);
  globe.rotation.y += dt * 0.12 + mouse.x * dt * 0.6;
  globe.rotation.x = mouse.y * 0.5 + Math.sin(t * 0.2) * 0.1;
  core.rotation.x -= dt * 0.3;
  core.rotation.z += dt * 0.2;
  shell.rotation.y -= dt * 0.05;
  const pulse = 1 + Math.sin(t * 1.6) * 0.04;
  core.scale.setScalar(pulse);

  rings.forEach((r) => {
    const { rad, sat, speed } = r.userData;
    const ang = t * speed;
    sat.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, 0);
  });

  const lp = lineGeo.attributes.position.array;
  pulses.forEach((p, i) => {
    p.t += dt * p.v;
    if (p.t > 1) { p.t = 0; p.seg = (Math.random() * segCount) | 0; }
    const o = p.seg * 6;
    a.set(lp[o], lp[o + 1], lp[o + 2]);
    b.set(lp[o + 3], lp[o + 4], lp[o + 5]);
    a.lerp(b, p.t);
    pulsePos.set([a.x, a.y, a.z], i * 3);
  });
  pulseGeo.attributes.position.needsUpdate = true;

  stars.rotation.z = t * 0.005;
  stars.position.y = scrollP * 6;
  shards.forEach((m) => {
    m.rotation.x += dt * m.userData.s;
    m.rotation.y += dt * m.userData.s * 0.7;
    m.position.y += Math.sin(t + m.userData.o) * 0.002;
  });

  camera.position.x = mouse.x * 1.2;
  camera.position.y = -mouse.y * 0.8;
  camera.lookAt(0, 0, -2);
  renderer.render(scene, camera);
}

// Adaptive quality: if frames take too long, lower the resolution step by step,
// and if that is not enough, render every other frame (30 fps).
let acc = 0, count = 0, cap30 = false, skip = false;
function loop() {
  if (!running) return;
  requestAnimationFrame(loop);
  if (cap30 && (skip = !skip)) return;
  const t0 = performance.now();
  frame();
  acc += performance.now() - t0;
  if (++count === 45) {
    const avg = acc / count;
    if (avg > 8 && dpr > minDpr) { dpr = Math.max(minDpr, dpr - 0.2); renderer.setPixelRatio(dpr); renderer.setSize(innerWidth, innerHeight); }
    else if (avg > 8 && !cap30) cap30 = true;
    acc = 0; count = 0;
  }
}
reduced ? frame() : loop();
