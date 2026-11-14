// Hero 3D: a breathing sphere of points (animated on the GPU) with a gold orbit and drifting dust.
// It renders only while the hero is on screen, at a resolution that adapts to the device.
import * as THREE from "three";

const canvas = document.getElementById("sphere");
const hero = document.getElementById("hero");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 720px), (pointer: coarse)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
} catch {
  canvas.remove();
  throw new Error("WebGL unavailable");
}
let dpr = Math.min(devicePixelRatio, mobile ? 1.5 : 2);
const minDpr = mobile ? 0.75 : 1;
renderer.setPixelRatio(dpr);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 0, 10);

const uniforms = {
  uTime: { value: 0 },
  uPixel: { value: dpr },
  uMouse: { value: new THREE.Vector2() },
};

// ---------- the sphere ----------
const N = mobile ? 2600 : 7000;
const pos = new Float32Array(N * 3);
const rnd = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = Math.PI * (3 - Math.sqrt(5)) * i;
  pos.set([Math.cos(t) * r, y, Math.sin(t) * r], i * 3);
  rnd[i] = Math.random();
}
const geo = new THREE.BufferGeometry();
geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
geo.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 1));

const mat = new THREE.ShaderMaterial({
  uniforms,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    uniform float uTime; uniform float uPixel; uniform vec2 uMouse;
    attribute float aRnd;
    varying float vDepth; varying float vWave; varying float vRnd;
    void main() {
      vec3 p = position;
      float w = sin(p.x * 3.1 + uTime * 0.9) * sin(p.y * 3.7 + uTime * 0.7) * sin(p.z * 2.9 + uTime * 0.8);
      float ripple = sin(dot(p.xy, uMouse) * 4.0 - uTime * 1.6) * 0.03 * length(uMouse);
      p *= 1.0 + w * 0.11 + ripple;
      vec4 mv = modelViewMatrix * vec4(p * 2.35, 1.0);
      gl_Position = projectionMatrix * mv;
      vDepth = smoothstep(-12.5, -7.6, mv.z);
      vWave = w; vRnd = aRnd;
      gl_PointSize = (1.4 + aRnd * 1.6 + max(w, 0.0) * 2.2) * uPixel * (9.0 / -mv.z);
    }`,
  fragmentShader: /* glsl */ `
    varying float vDepth; varying float vWave; varying float vRnd;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.0, d);
      vec3 ivory = vec3(0.93, 0.91, 0.87);
      vec3 gold  = vec3(0.90, 0.76, 0.49);
      vec3 blue  = vec3(0.45, 0.56, 1.0);
      vec3 c = mix(blue, ivory, vDepth);
      c = mix(c, gold, smoothstep(0.15, 0.7, vWave) * 0.9 + step(0.97, vRnd) * 0.6);
      gl_FragColor = vec4(c, a * (0.12 + vDepth * 0.75));
    }`,
});
const sphere = new THREE.Points(geo, mat);
const group = new THREE.Group();
group.add(sphere);
scene.add(group);

// ---------- gold orbit ring of points ----------
const RN = mobile ? 260 : 520;
const rpos = new Float32Array(RN * 3);
for (let i = 0; i < RN; i++) {
  const a = (i / RN) * Math.PI * 2, rr = 3.25 + (Math.random() - 0.5) * 0.08;
  rpos.set([Math.cos(a) * rr, (Math.random() - 0.5) * 0.04, Math.sin(a) * rr], i * 3);
}
const ringGeo = new THREE.BufferGeometry();
ringGeo.setAttribute("position", new THREE.BufferAttribute(rpos, 3));
const dot = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 32;
  const g = c.getContext("2d"), grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
})();
const ring = new THREE.Points(ringGeo, new THREE.PointsMaterial({ size: 0.05, map: dot, color: 0xd9bd84, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
ring.rotation.set(1.15, 0.2, -0.35);
group.add(ring);
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xf3e3bd, depthWrite: false, blending: THREE.AdditiveBlending }));
moon.scale.setScalar(0.28);
ring.add(moon);

// ---------- dust ----------
const DN = mobile ? 120 : 320;
const dpos = new Float32Array(DN * 3);
for (let i = 0; i < DN; i++) dpos.set([(Math.random() - 0.5) * 22, (Math.random() - 0.5) * 12, -Math.random() * 10], i * 3);
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.035, map: dot, color: 0xa9b8ff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
scene.add(dust);

// ---------- layout ----------
function layout() {
  const w = hero.clientWidth, h = hero.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // desktop: sphere sits behind the portrait on the right; phones: behind the portrait at the top
  const wide = w > 980;
  const visibleH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
  const visibleW = visibleH * camera.aspect;
  if (wide) {
    group.position.set(visibleW * 0.2, 0.1, 0);
    group.scale.setScalar(1);
  } else {
    group.position.set(0, visibleH * 0.26, 0);
    group.scale.setScalar(Math.min(1, visibleW / 7.4));
  }
}
let lastW = 0, lastH = 0;
function onResize() {
  // ignore the small height changes caused by mobile address bars
  if (hero.clientWidth === lastW && Math.abs(hero.clientHeight - lastH) < 160) return;
  lastW = hero.clientWidth; lastH = hero.clientHeight;
  layout();
}
addEventListener("resize", onResize, { passive: true });
onResize();

// ---------- interaction ----------
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener("pointermove", (e) => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }, { passive: true });

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = (uniforms.uTime.value += dt);
  mouse.x += (mouse.tx - mouse.x) * 0.04;
  mouse.y += (mouse.ty - mouse.y) * 0.04;
  uniforms.uMouse.value.set(mouse.x * 2, -mouse.y * 2);
  sphere.rotation.y += dt * 0.08;
  group.rotation.y = mouse.x * 0.5;
  group.rotation.x = mouse.y * 0.35 + Math.sin(t * 0.25) * 0.05;
  ring.rotation.z += dt * 0.05;
  const a = t * 0.35;
  moon.position.set(Math.cos(a) * 3.25, 0, Math.sin(a) * 3.25);
  dust.rotation.y = t * 0.01;
  // fade and sink as the hero scrolls away
  const k = Math.min(1, scrollY / (hero.clientHeight || 1));
  canvas.style.opacity = String(1 - k * 0.9);
  group.position.z = -k * 2;
  renderer.render(scene, camera);
}

// ---------- loop: only while visible, adaptive quality ----------
let visible = true, raf = 0, acc = 0, n = 0, half = false, skip = false;
function loop() {
  raf = 0;
  if (!visible || document.hidden) return;
  raf = requestAnimationFrame(loop);
  if (half && (skip = !skip)) return;
  const t0 = performance.now();
  frame();
  acc += performance.now() - t0;
  if (++n === 50) {
    if (acc / n > 7) {
      if (dpr > minDpr) { dpr = Math.max(minDpr, dpr - 0.25); renderer.setPixelRatio(dpr); uniforms.uPixel.value = dpr; layout(); }
      else half = true;
    }
    acc = 0; n = 0;
  }
}
const start = () => { if (!raf && !reduced) { clock.getDelta(); raf = requestAnimationFrame(loop); } };
new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }).observe(hero);
document.addEventListener("visibilitychange", () => { if (!document.hidden) start(); });
reduced ? frame() : start();
