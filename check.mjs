// Self-check: every data-shape in the HTML must exist in SHAPES, and the mesh
// must stay singular. Run: node check.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const html = readFileSync('index.html', 'utf8');
const js = readFileSync('assets/main.js', 'utf8');

const defined = new Set(
  [...js.matchAll(/^\s{2}(\w+):\s*\{ amp:/gm)].map((m) => m[1])
);
assert.ok(defined.size >= 5, `expected >=5 shapes, got ${defined.size}`);

const used = new Set([...html.matchAll(/data-shape="([^"]+)"/g)].map((m) => m[1]));
assert.ok(used.size > 0, 'no data-shape attributes found in index.html');

for (const name of used) {
  assert.ok(defined.has(name), `data-shape="${name}" has no entry in SHAPES`);
}

// The whole point: one mesh, one material.
assert.equal((js.match(/new THREE\.Mesh\(/g) || []).length, 1, 'more than one mesh');
assert.equal((js.match(/new THREE\.ShaderMaterial\(/g) || []).length, 1, 'more than one material');

// Every button must be reachable by keyboard as a real button.
const buttons = [...html.matchAll(/<button[^>]*>/g)];
assert.ok(buttons.length >= 5, 'context buttons missing');
for (const [tag] of buttons) {
  assert.match(tag, /type="button"/, `button missing type="button": ${tag}`);
  assert.match(tag, /aria-pressed="(true|false)"/, `button missing aria-pressed: ${tag}`);
}

// Shaping must be additive uniforms, not new objects. A dent that allocates
// geometry would be a second clay, which is exactly the claim being denied.
assert.equal(
  (js.match(/new THREE\.(IcosahedronGeometry|BufferGeometry|SphereGeometry)\(/g) || []).length,
  1,
  'more than one geometry allocated'
);
assert.ok(
  /const MARK_SLOTS = \d+/.test(js),
  'MARK_SLOTS missing — mark storage must be a fixed-size uniform array'
);
assert.ok(
  !/setAnimationLoop\([\s\S]*new THREE\./.test(js),
  'allocating THREE objects inside the render loop'
);

// Marks may only leave by decay. An explicit reset would contradict the essay:
// "ada bentuk yang hanya bisa berubah melalui waktu".
assert.ok(/MARK_HALF_LIFE/.test(js), 'MARK_HALF_LIFE missing — marks must fade over time');
assert.ok(
  !/(reset|clearMarks|hapus)\s*\(/i.test(js.replace(/MARK_HALF_LIFE/g, '')),
  'found a reset path for marks; decay must be the only way out'
);

// The clay is interactive, so it must be reachable and described.
const canvasTag = /<canvas[^>]*id="scene"[^>]*>/.exec(html);
assert.ok(canvasTag, 'canvas#scene missing');
assert.match(canvasTag[0], /tabindex="0"/, 'canvas must be keyboard focusable');
assert.match(canvasTag[0], /aria-label="/, 'canvas must carry an aria-label');
assert.ok(!/aria-hidden="true"[^>]*id="scene"|id="scene"[^>]*aria-hidden="true"/.test(html),
  'interactive canvas must not be aria-hidden');

// Keyboard shaping must exist, not just pointer shaping.
for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']) {
  assert.ok(js.includes(`'${key}'`), `keyboard shaping missing case: ${key}`);
}
assert.ok(/aria-live="polite"[^>]*id="mark-count"|id="mark-count"[^>]*aria-live="polite"/.test(html),
  'mark count must be announced politely to screen readers');

// Favicon: easy to forget, so pin it here.
assert.match(html, /<link rel="icon"[^>]*href="favicon\.svg"/, 'favicon.svg not linked');
assert.ok(readFileSync('favicon.svg', 'utf8').includes('<svg'), 'favicon.svg missing or not svg');

const marks = /const MARK_SLOTS = (\d+)/.exec(js)[1];
console.log(
  `ok — ${defined.size} shapes, ${used.size} used, 1 mesh, 1 material, ` +
  `1 geometry, ${marks} mark slots, keyboard + pointer shaping, favicon linked`
);
