import * as THREE from 'three';

// One geometry, one material, for the whole page. Context only moves uniforms.
// That constraint is the argument: the clay is never swapped out.
//
// Shaping is direct. Press the clay and it yields under the pointer; let go and
// the dent stays. Marks fade only with time, slowly — which is the claim the
// essay makes about luka, enforced here as a decay constant rather than prose.

const SHAPES = {
  tenang:  { amp: 0.16, freq: 1.05, churn: 0.10, spin: 0.05, color: 0x6f7a86, glow: 0x1a2029 },
  cinta:   { amp: 0.34, freq: 1.60, churn: 0.30, spin: 0.14, color: 0xc98a6b, glow: 0x3a1f18 },
  rindu:   { amp: 0.26, freq: 2.90, churn: 0.16, spin: 0.06, color: 0x7f8ab8, glow: 0x1c2038 },
  kecewa:  { amp: 0.44, freq: 4.30, churn: 0.55, spin: 0.02, color: 0x8f8676, glow: 0x241f1a },
  luka:    { amp: 0.62, freq: 6.20, churn: 0.85, spin: 0.20, color: 0xa3564f, glow: 0x2c1213 },
};

/* --- shaping constants ---------------------------------------------------- */

const MARK_SLOTS = 12;        // fixed uniform array: no allocation while shaping
const MARK_MAX = 0.30;        // deepest a single press can go
const MARK_GAIN = 0.85;       // depth added per second of holding
const MARK_HALF_LIFE = 75;    // seconds for a mark to fade to half — time, slowly
const MARK_TIGHT = 26.0;      // gaussian falloff; higher = smaller thumbprint
const RADIUS = 1.25;

const canvas = document.getElementById('scene');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
} catch (err) {
  // No WebGL: text stays readable, that's the fallback.
  canvas.remove();
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.z = 4.2;

/* Denser mesh reads the thumbprint better, but not every device can afford it. */
const coarse = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 4) <= 4;
const detail = coarse ? 40 : 72;

const markDirs = Array.from({ length: MARK_SLOTS }, () => new THREE.Vector3(0, 0, 1));
const markStrengths = new Float32Array(MARK_SLOTS);

const uniforms = {
  uTime:      { value: 0 },
  uAmp:       { value: SHAPES.tenang.amp },
  uFreq:      { value: SHAPES.tenang.freq },
  uChurn:     { value: SHAPES.tenang.churn },
  uColor:     { value: new THREE.Color(SHAPES.tenang.color) },
  uGlow:      { value: new THREE.Color(SHAPES.tenang.glow) },
  uMarkDir:   { value: markDirs },
  uMarkStr:   { value: markStrengths },
  uMarkTight: { value: MARK_TIGHT },
  uPressDir:  { value: new THREE.Vector3(0, 0, 1) },
  uPressAmp:  { value: 0 },
};

const material = new THREE.ShaderMaterial({
  uniforms,
  defines: { MARK_SLOTS },
  vertexShader: /* glsl */`
    uniform float uTime, uAmp, uFreq, uChurn, uMarkTight, uPressAmp;
    uniform vec3 uMarkDir[MARK_SLOTS];
    uniform float uMarkStr[MARK_SLOTS];
    uniform vec3 uPressDir;
    varying vec3 vNormal;
    varying float vDisp;
    varying float vDent;
    varying float vPress;

    // Ashima simplex noise (3D), public domain.
    vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
    vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1./6.,1./3.);
      const vec4 D=vec4(0.,.5,1.,2.);
      vec3 i=floor(v+dot(v,C.yyy));
      vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);
      vec3 l=1.-g;
      vec3 i1=min(g.xyz,l.zxy);
      vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;
      vec3 x2=x0-i2+C.yyy;
      vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(
        i.z+vec4(0.,i1.z,i2.z,1.))
        +i.y+vec4(0.,i1.y,i2.y,1.))
        +i.x+vec4(0.,i1.x,i2.x,1.));
      float n_=0.142857142857;
      vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z);
      vec4 y_=floor(j-7.*x_);
      vec4 x=x_*ns.x+ns.yyyy;
      vec4 y=y_*ns.x+ns.yyyy;
      vec4 h=1.-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);
      vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.+1.;
      vec4 s1=floor(b1)*2.+1.;
      vec4 sh=-step(h,vec4(0.));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
      vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);
      vec3 p1=vec3(a0.zw,h.y);
      vec3 p2=vec3(a1.xy,h.z);
      vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
      m=m*m;
      return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    /* Context: the ambient churn of the material. */
    float contextDisp(vec3 n) {
      float t = uTime * uChurn;
      float d = snoise(n * uFreq + vec3(0., 0., t)) * uAmp;
      d += snoise(n * uFreq * 2.7 + vec3(t, 0., 0.)) * uAmp * 0.35;
      return d;
    }

    /* Marks left by hand: gaussian dents that persist in the clay's own frame. */
    float dentDisp(vec3 n) {
      float d = 0.0;
      for (int i = 0; i < MARK_SLOTS; i++) {
        float s = uMarkStr[i];
        if (s <= 0.0005) continue;
        float r = distance(n, uMarkDir[i]);
        d -= s * exp(-r * r * uMarkTight);
      }
      return d;
    }

    float pressDisp(vec3 n) {
      if (uPressAmp <= 0.0005) return 0.0;
      float r = distance(n, uPressDir);
      return -uPressAmp * exp(-r * r * uMarkTight * 0.75);
    }

    float totalDisp(vec3 n) {
      return contextDisp(n) + dentDisp(n) + pressDisp(n);
    }

    void main() {
      vec3 n = normalize(position);
      float d = totalDisp(n);

      /* Real normals: finite differences on the displaced surface, so lighting
         actually follows the dents instead of the underlying sphere. */
      vec3 tangent = normalize(cross(n, abs(n.y) < 0.99 ? vec3(0., 1., 0.) : vec3(1., 0., 0.)));
      vec3 bitangent = cross(n, tangent);
      float eps = 0.035;
      vec3 na = normalize(n + tangent * eps);
      vec3 nb = normalize(n + bitangent * eps);
      vec3 p0 = n * (1.0 + d);
      vec3 pa = na * (1.0 + totalDisp(na));
      vec3 pb = nb * (1.0 + totalDisp(nb));
      vec3 geoNormal = normalize(cross(pa - p0, pb - p0));
      if (dot(geoNormal, n) < 0.0) geoNormal = -geoNormal;

      vDisp = d / max(uAmp, 0.001);
      vDent = clamp(-dentDisp(n) / 0.12, 0.0, 1.0);
      vPress = clamp(-pressDisp(n) / 0.12, 0.0, 1.0);
      vNormal = normalMatrix * geoNormal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p0, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform vec3 uColor, uGlow;
    varying vec3 vNormal;
    varying float vDisp;
    varying float vDent;
    varying float vPress;

    void main() {
      vec3 nrm = normalize(vNormal);
      vec3 lightDir = normalize(vec3(0.4, 0.7, 0.6));
      float light = clamp(dot(nrm, lightDir), 0.0, 1.0);
      float rim = pow(1.0 - abs(nrm.z), 2.2);

      vec3 col = mix(uGlow, uColor, light * 0.85 + 0.15);
      col += uColor * rim * 0.5;

      /* Clay sheen — enough specular to read the new surface detail. */
      vec3 halfway = normalize(lightDir + vec3(0.0, 0.0, 1.0));
      col += vec3(1.0) * pow(clamp(dot(nrm, halfway), 0.0, 1.0), 22.0) * 0.16;

      col = mix(col, uColor, clamp(vDisp, 0.0, 1.0) * 0.18);

      /* Old marks sit in shadow; the one under the hand right now glows. */
      col = mix(col, uGlow * 0.75, vDent * 0.55);
      col += uColor * vPress * 0.35;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(RADIUS, detail), material);
scene.add(mesh);

/* --- context switching ---------------------------------------------------- */

const target = { ...SHAPES.tenang };
const targetColor = new THREE.Color(SHAPES.tenang.color);
const targetGlow = new THREE.Color(SHAPES.tenang.glow);
let current = 'tenang';

function setShape(name) {
  const next = SHAPES[name];
  if (!next || name === current) return;
  current = name;
  target.amp = next.amp;
  target.freq = next.freq;
  target.churn = next.churn;
  target.spin = next.spin;
  targetColor.setHex(next.color);
  targetGlow.setHex(next.glow);
}

const buttons = [...document.querySelectorAll('.controls button')];
const ctxName = document.getElementById('ctx-name');
let pinned = false; // manual choice wins over scroll

for (const btn of buttons) {
  btn.addEventListener('click', () => {
    pinned = true;
    setShape(btn.dataset.shape);
    for (const other of buttons) {
      other.setAttribute('aria-pressed', String(other === btn));
    }
    if (ctxName) ctxName.textContent = btn.textContent;
  });
}

const observer = new IntersectionObserver((entries) => {
  if (pinned) return;
  for (const entry of entries) {
    if (entry.isIntersecting) setShape(entry.target.dataset.shape);
  }
}, { rootMargin: '-45% 0px -45% 0px' });

for (const panel of document.querySelectorAll('.panel[data-shape]')) {
  observer.observe(panel);
}

/* --- shaping: pointer, touch, keyboard ------------------------------------ */

const stage = document.getElementById('stage');
const markCountEl = document.getElementById('mark-count');
const raycaster = new THREE.Raycaster();
const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), RADIUS);
const hit = new THREE.Vector3();
const pointer = new THREE.Vector2();
const localDir = new THREE.Vector3();

let pressing = false;
let pressAmp = 0;
let liveSlot = -1;
let shapedOnce = false;

/** Screen point → direction on the clay's own surface, or null if it missed. */
function surfaceDirAt(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (!raycaster.ray.intersectSphere(sphere, hit)) return null;
  return mesh.worldToLocal(localDir.copy(hit)).normalize();
}

/** Reuse the nearest existing mark, or the shallowest slot. */
function slotFor(dir) {
  let best = -1;
  let bestDist = 0.22; // close enough to count as the same thumbprint
  for (let i = 0; i < MARK_SLOTS; i++) {
    if (markStrengths[i] <= 0.0005) continue;
    const d = markDirs[i].distanceTo(dir);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  if (best !== -1) return best;

  let weakest = 0;
  for (let i = 1; i < MARK_SLOTS; i++) {
    if (markStrengths[i] < markStrengths[weakest]) weakest = i;
  }
  markStrengths[weakest] = 0;
  return weakest;
}

function beginPress(dir) {
  pressing = true;
  liveSlot = slotFor(dir);
  markDirs[liveSlot].copy(dir);
  uniforms.uPressDir.value.copy(dir);
  stage?.classList.add('is-shaping');
}

function movePress(dir) {
  if (!pressing || liveSlot < 0) return;
  /* Dragging across the surface walks the dent along with the hand. */
  if (markDirs[liveSlot].distanceTo(dir) > 0.22) liveSlot = slotFor(dir);
  markDirs[liveSlot].copy(dir);
  uniforms.uPressDir.value.copy(dir);
}

function endPress() {
  if (!pressing) return;
  pressing = false;
  /* Whatever was pressed in stays pressed in. */
  if (liveSlot >= 0) {
    markStrengths[liveSlot] = Math.min(MARK_MAX, markStrengths[liveSlot] + pressAmp);
  }
  pressAmp = 0;
  liveSlot = -1;
  stage?.classList.remove('is-shaping');
  announceMarks();
}

function activeMarkCount() {
  let n = 0;
  for (let i = 0; i < MARK_SLOTS; i++) if (markStrengths[i] > 0.01) n++;
  return n;
}

function announceMarks() {
  if (!markCountEl) return;
  const n = activeMarkCount();
  markCountEl.textContent = n === 0
    ? 'Belum ada bekas.'
    : `${n} bekas di permukaan — memudar perlahan, bukan seketika.`;
  if (!shapedOnce && n > 0) {
    shapedOnce = true;
    stage?.classList.add('has-been-shaped');
  }
}

canvas.addEventListener('pointerdown', (e) => {
  const dir = surfaceDirAt(e.clientX, e.clientY);
  if (!dir) return;
  canvas.setPointerCapture(e.pointerId);
  beginPress(dir);
});

canvas.addEventListener('pointermove', (e) => {
  if (!pressing) return;
  const dir = surfaceDirAt(e.clientX, e.clientY);
  if (dir) movePress(dir);
});

canvas.addEventListener('pointerup', endPress);
canvas.addEventListener('pointercancel', endPress);
canvas.addEventListener('lostpointercapture', endPress);

/* Touch: pressing the clay should not also scroll the essay. */
canvas.addEventListener('touchmove', (e) => {
  if (pressing) e.preventDefault();
}, { passive: false });

/* Keyboard path: a cursor in spherical coordinates, pressed with Enter/Space.
   Same mechanism as the pointer — not a lesser fallback. */
let keyLat = 0;
let keyLon = 0;
const keyDir = new THREE.Vector3();

function keyCursor() {
  const cosLat = Math.cos(keyLat);
  return keyDir.set(
    cosLat * Math.sin(keyLon),
    Math.sin(keyLat),
    cosLat * Math.cos(keyLon),
  ).normalize();
}

canvas.addEventListener('keydown', (e) => {
  const step = 0.22;
  switch (e.key) {
    case 'ArrowUp':    keyLat = Math.min(1.4, keyLat + step); break;
    case 'ArrowDown':  keyLat = Math.max(-1.4, keyLat - step); break;
    case 'ArrowLeft':  keyLon -= step; break;
    case 'ArrowRight': keyLon += step; break;
    case 'Enter':
    case ' ':
      if (!pressing) beginPress(keyCursor());
      break;
    default:
      return;
  }
  e.preventDefault();
  if (pressing) movePress(keyCursor());
  else uniforms.uPressDir.value.copy(keyCursor());
});

canvas.addEventListener('keyup', (e) => {
  if (e.key === 'Enter' || e.key === ' ') endPress();
});
canvas.addEventListener('blur', endPress);

/* --- loop ----------------------------------------------------------------- */

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
let spin = SHAPES.tenang.spin;
const healPerSecond = Math.log(2) / MARK_HALF_LIFE;
let sinceAnnounce = 0;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const k = 1 - Math.exp(-dt * 1.8); // frame-rate independent easing

  uniforms.uAmp.value += (target.amp - uniforms.uAmp.value) * k;
  uniforms.uFreq.value += (target.freq - uniforms.uFreq.value) * k;
  uniforms.uChurn.value += (target.churn - uniforms.uChurn.value) * k;
  uniforms.uColor.value.lerp(targetColor, k);
  uniforms.uGlow.value.lerp(targetGlow, k);
  spin += (target.spin - spin) * k;

  /* Holding deepens the press; releasing commits it. */
  if (pressing) pressAmp = Math.min(MARK_MAX, pressAmp + MARK_GAIN * dt);
  uniforms.uPressAmp.value += (pressAmp - uniforms.uPressAmp.value) * (1 - Math.exp(-dt * 12));

  /* Time, little by little. */
  const decay = Math.exp(-healPerSecond * dt);
  for (let i = 0; i < MARK_SLOTS; i++) {
    if (markStrengths[i] > 0) markStrengths[i] *= decay;
  }

  sinceAnnounce += dt;
  if (sinceAnnounce > 4 && !pressing) { sinceAnnounce = 0; announceMarks(); }

  if (!reduced) {
    uniforms.uTime.value += dt;
    /* The clay holds still while it is being worked. */
    const spinScale = pressing ? 0.08 : 1;
    mesh.rotation.y += dt * spin * spinScale;
    mesh.rotation.x += dt * spin * 0.35 * spinScale;
  }

  renderer.render(scene, camera);
});
