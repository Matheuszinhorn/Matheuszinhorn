// Build do app SEM dependências externas (o ambiente não tem rede): o Node remove os tipos (stripTypeScriptTypes),
// este script resolve os imports relativos, empacota tudo num único <script> e gera dist/app/index.html autocontido.
// Não há bundler de terceiros: por isso o código do app usa só imports relativos e sintaxe apagável (erasableSyntaxOnly).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = 'app/src/main.ts';
const IMPORT_RE = /^import\s+([\s\S]*?)\s+from\s+['"](.+?)['"];?[ \t]*$/gm;
const SIDE_IMPORT_RE = /^import\s+['"](.+?)['"];?[ \t]*$/gm;

const modules = new Map(); // id → código JS já convertido
function idOf(path) { return relative(ROOT, path).split('\\').join('/'); }

function resolveSpec(fromId, spec) {
  if (!spec.startsWith('.')) throw new Error(`import não relativo em ${fromId}: "${spec}" (o app não pode depender de pacotes)`);
  return idOf(resolve(ROOT, dirname(fromId), spec));
}

function convert(id, source) {
  let src = stripTypeScriptTypes(source, { mode: 'strip' });
  const deps = [];
  const exported = [];
  src = src.replace(IMPORT_RE, (_m, clause, spec) => {
    const dep = resolveSpec(id, spec); deps.push(dep);
    const c = clause.trim();
    if (c.startsWith('* as ')) return `const ${c.slice(5).trim()} = __req(${JSON.stringify(dep)});`;
    if (c.startsWith('{')) return `const ${c.replace(/\bas\b/g, ':')} = __req(${JSON.stringify(dep)});`;
    throw new Error(`import padrão não suportado em ${id}: ${c}`);
  });
  src = src.replace(SIDE_IMPORT_RE, (_m, spec) => { const dep = resolveSpec(id, spec); deps.push(dep); return `__req(${JSON.stringify(dep)});`; });
  // export * from / export { a as b } from
  src = src.replace(/^export\s*\*\s*from\s*['"](.+?)['"];?[ \t]*$/gm, (_m, spec) => {
    const dep = resolveSpec(id, spec); deps.push(dep);
    return `{ const __m = __req(${JSON.stringify(dep)}); for (const k in __m) if (k !== 'default') __exports[k] = __m[k]; }`;
  });
  src = src.replace(/^export\s*\{([\s\S]*?)\}\s*from\s*['"](.+?)['"];?[ \t]*$/gm, (_m, names, spec) => {
    const dep = resolveSpec(id, spec); deps.push(dep);
    const parts = names.split(',').map((s) => s.trim()).filter(Boolean).map((n) => { const [a, b] = n.split(/\s+as\s+/); return `__exports[${JSON.stringify((b ?? a).trim())}] = __m[${JSON.stringify(a.trim())}];`; });
    return `{ const __m = __req(${JSON.stringify(dep)}); ${parts.join(' ')} }`;
  });
  src = src.replace(/^export\s*\{([\s\S]*?)\};?[ \t]*$/gm, (_m, names) => {
    for (const n of names.split(',').map((s) => s.trim()).filter(Boolean)) { const [a, b] = n.split(/\s+as\s+/); exported.push([(b ?? a).trim(), a.trim()]); }
    return '';
  });
  src = src.replace(/^export\s+(async\s+function\s*\*?|function\s*\*?|class)\s+([A-Za-z_$][\w$]*)/gm, (_m, kw, name) => { exported.push([name, name]); return `${kw} ${name}`; });
  src = src.replace(/^export\s+(const|let|var)\s+([A-Za-z_$][\w$]*)/gm, (_m, kw, name) => { exported.push([name, name]); return `${kw} ${name}`; });
  if (/^export\s+default/m.test(src)) throw new Error(`export default não suportado em ${id}`);
  if (/^export\s/m.test(src)) throw new Error(`export não reconhecido em ${id}: ${src.match(/^export\s.*$/m)[0]}`);
  const tail = exported.map(([out, local]) => `__exports[${JSON.stringify(out)}] = ${local};`).join('\n');
  modules.set(id, `${src}\n${tail}`);
  return deps;
}

function collect(id) {
  if (modules.has(id)) return;
  modules.set(id, '');
  const deps = convert(id, readFileSync(join(ROOT, id), 'utf8'));
  for (const d of deps) collect(d);
}

collect(ENTRY);
const body = [...modules.entries()].map(([id, code]) => `__defs[${JSON.stringify(id)}] = function (__exports, __req) {\n${code}\n};`).join('\n\n');
const js = `(function () {\n'use strict';\nvar __defs = {}; var __cache = {};\nfunction __req(id) { var c = __cache[id]; if (c) return c.exports; c = __cache[id] = { exports: {} }; if (!__defs[id]) throw new Error('módulo ausente: ' + id); __defs[id](c.exports, __req); return c.exports; }\n${body}\n__req(${JSON.stringify(ENTRY)});\n})();`;

const html = readFileSync(join(ROOT, 'app/index.html'), 'utf8');
const css = readFileSync(join(ROOT, 'app/styles.css'), 'utf8');
const out = html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js.replace(/<\/script/gi, '<\\/script'));
mkdirSync(join(ROOT, 'dist/app'), { recursive: true });
writeFileSync(join(ROOT, 'dist/app/index.html'), out);
console.log(`build ok: ${modules.size} módulos, ${(out.length / 1024).toFixed(0)} KB → dist/app/index.html`);
