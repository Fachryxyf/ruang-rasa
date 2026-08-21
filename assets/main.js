import * as THREE from 'three';

// One geometry, one material, for the whole page. Context only moves uniforms.
// That constraint is the argument: the clay is never swapped out.

const SHAPES = {
  tenang:  { amp: 0.16, freq: 1.05, churn: 0.10, spin: 0.05, color: 0x6f7a86, glow: 0x1a2029 },
  cinta:   { amp: 0.34, freq: 1.60, churn: 0.30, spin: 0.14, color: 0xc98a6b, glow: 0x3a1f18 },
  rindu:   { amp: 0.26, freq: 2.90, churn: 0.16, spin: 0.06, color: 0x7f8ab8, glow: 0x1c2038 },
  kecewa:  { amp: 0.44, freq: 4.30, churn: 0.55, spin: 0.02, color: 0x8f8676, glow: 0x241f1a },
  luka:    { amp: 0.62, freq: 6.20, churn: 0.85, spin: 0.20, color: 0xa3564f, glow: 0x2c1213 },
};

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

const uniforms = {
  uTime:  { value: 0 },
  uAmp:   { value: SHAPES.tenang.amp },
  uFreq:  { value: SHAPES.tenang.freq },
  uChurn: { value: SHAPES.tenang.churn },
  uColor: { value: new THREE.Color(SHAPES.tenang.color) },
  uGlow:  { value: new THREE.Color(SHAPES.tenang.glow) },
};

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: /* glsl */`
    uniform float uTime, uAmp, uFreq, uChurn;
    varying vec3 vNormal;
    varying float vDisp;

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

    void main() {
      vec3 n = normalize(position);
      float t = uTime * uChurn;
      float d = snoise(n * uFreq + vec3(0., 0., t)) * uAmp;
      d += snoise(n * uFreq * 2.7 + vec3(t, 0., 0.)) * uAmp * 0.35;
      vDisp = d / max(uAmp, 0.001);
      vNormal = normalMatrix * n;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position * (1.0 + d), 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform vec3 uColor, uGlow;
    varying vec3 vNormal;
    varying float vDisp;

    void main() {
      vec3 nrm = normalize(vNormal);
      float light = clamp(dot(nrm, normalize(vec3(0.4, 0.7, 0.6))), 0.0, 1.0);
      float rim = pow(1.0 - abs(nrm.z), 2.2);
      vec3 col = mix(uGlow, uColor, light * 0.85 + 0.15);
      col += uColor * rim * 0.5;
      col = mix(col, uColor, clamp(vDisp, 0.0, 1.0) * 0.18);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 96), material);
scene.add(mesh);

// --- context switching -------------------------------------------------------

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

// --- loop --------------------------------------------------------------------

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

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  const k = 1 - Math.exp(-dt * 1.8); // frame-rate independent easing

  uniforms.uAmp.value += (target.amp - uniforms.uAmp.value) * k;
  uniforms.uFreq.value += (target.freq - uniforms.uFreq.value) * k;
  uniforms.uChurn.value += (target.churn - uniforms.uChurn.value) * k;
  uniforms.uColor.value.lerp(targetColor, k);
  uniforms.uGlow.value.lerp(targetGlow, k);
  spin += (target.spin - spin) * k;

  if (!reduced) {
    uniforms.uTime.value += dt;
    mesh.rotation.y += dt * spin;
    mesh.rotation.x += dt * spin * 0.35;
  }

  renderer.render(scene, camera);
});
