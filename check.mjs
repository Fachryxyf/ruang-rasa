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

console.log(`ok — ${defined.size} shapes, ${used.size} used, 1 mesh, 1 material`);
