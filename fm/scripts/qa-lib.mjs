// Utilitários compartilhados dos scripts de QA em navegador (só interface: cliques e leitura da tela).
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const APP_URL = 'file://' + join(ROOT, 'dist/app/index.html');
export const SAVE_KEY = 'fm-brasileiro:carreira:v1';
export const { chromium } = createRequire((process.env.NODE_PATH || '/home/claude/.npm-global/lib/node_modules') + '/')('playwright');
export const shotDir = (...p) => { const d = join(ROOT, 'dist/qa', ...p); mkdirSync(d, { recursive: true }); return d; };

export function watch(page, errors) {
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ` + m.text()); });
}

/** Problemas de layout na tela atual: estouro horizontal, conteúdo fora da tela, botões sobrepostos, navegação coberta. */
export async function layoutIssues(page) {
  await page.waitForTimeout(350); // deixa a animação de entrada do pop-up terminar
  return page.evaluate(() => {
    const W = window.innerWidth; const issues = [];
    const sw = document.documentElement.scrollWidth; if (sw > W + 1) issues.push(`scrollWidth ${sw} > ${W}`);
    const contained = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if ((r.right > W + 1 || r.left < -1) && !contained(el)) { issues.push(`fora da tela: <${el.tagName.toLowerCase()} class="${el.className}"> ${Math.round(r.left)}..${Math.round(r.right)}`); if (issues.length > 6) break; }
    }
    if (!document.querySelector('.modal-back')) document.querySelectorAll('.nav-btn').forEach((b) => { const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!t || !t.closest('.nav-btn')) issues.push('navegação coberta: ' + b.textContent.trim()); });
    const scope = document.querySelector('.modal') ?? document;
    // Só botões realmente visíveis: o elemento no topo no centro do botão é ele mesmo (ignora o que rola por baixo da navegação fixa ou de um rodapé).
    const btns = [...scope.querySelectorAll('button:not(.chip):not(.nav-btn)')].map((b) => ({ b, r: b.getBoundingClientRect() })).filter(({ b, r }) => { if (r.width <= 0 || r.height <= 0) return false; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === b || b.contains(t)); }).map((x) => { let r = x.r; for (let p = x.b.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p); if (o.overflowY !== 'visible' || o.overflowX !== 'visible') { const q = p.getBoundingClientRect(); r = { left: Math.max(r.left, q.left), right: Math.min(r.right, q.right), top: Math.max(r.top, q.top), bottom: Math.min(r.bottom, q.bottom), width: 0, height: 0 }; } } return { b: x.b, r }; });
    for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) {
      const a = btns[i], c = btns[j]; if (a.b.contains(c.b) || c.b.contains(a.b)) continue;
      const w = Math.min(a.r.right, c.r.right) - Math.max(a.r.left, c.r.left), h = Math.min(a.r.bottom, c.r.bottom) - Math.max(a.r.top, c.r.top);
      if (w > 3 && h > 3) issues.push(`botões sobrepostos: "${a.b.textContent.trim().slice(0, 18)}" x "${c.b.textContent.trim().slice(0, 18)}"`);
    }
    const m = document.querySelector('.modal');
    if (m) { const r = m.getBoundingClientRect(); const dx = Math.abs(r.left + r.width / 2 - W / 2); if (dx > 2) issues.push(`pop-up fora do centro (dx=${Math.round(dx)})`); if (r.bottom > innerHeight + 1 || r.top < -1) issues.push('pop-up maior que a tela'); }
    return issues;
  });
}

export const text = (page) => page.evaluate(() => document.body.innerText.toLowerCase());
export const nav = async (page, label) => { await page.locator('.nav-btn', { hasText: label }).click(); await page.waitForTimeout(120); };
export const clickIn = (page, scope, name, exact = false) => page.locator(scope).getByRole('button', { name, exact }).first().click({ timeout: 8000 });

/** Cria a carreira pela interface (nome + primeira proposta). */
export async function startCareerUI(page, name = 'Marcos Vilela') {
  await page.fill('input[type=text]', name);
  await page.getByRole('button', { name: 'RECEBER PROPOSTAS' }).click();
  await page.locator('.offer').first().getByRole('button').click();
  await page.waitForSelector('.topbar');
}

/** Resolve o pop-up aberto SÓ pela interface. policy 'suggest' sempre aceita a sugestão (reprodutível). */
export async function resolveModal(page, policy = 'ui', log = null) {
  const title = (await page.locator('.modal h2').innerText()).trim();
  const footer = page.locator('.modal footer');
  log?.(title);
  const has = async (n, exact = false) => (await footer.getByRole('button', { name: n, exact }).count()) > 0;
  if (policy === 'suggest' || title.includes('GOLEIRO')) {
    if (await has('ACEITAR SUGESTÃO')) return void (await clickIn(page, '.modal footer', 'ACEITAR SUGESTÃO'));
  }
  if (title.startsWith('PÊNALTI')) return void (await page.locator('.modal .prow').first().click());
  const confirm = footer.getByRole('button', { name: 'CONFIRMAR SUBSTITUIÇÃO' });
  if (await confirm.count() && await confirm.isEnabled()) return void (await confirm.click());
  if (await has('ACEITAR SUGESTÃO') && !(await has('CONTINUAR', true))) return void (await clickIn(page, '.modal footer', 'ACEITAR SUGESTÃO'));
  await clickIn(page, '.modal footer', 'CONTINUAR', true);
}

/** Roda até a rodada terminar e ser aplicada (botão de próxima rodada aparece). */
export async function driveRound(page, { policy = 'ui', log = null, onModal = null, limitMs = 240000 } = {}) {
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > limitMs) throw new Error('rodada travou (tempo excedido)');
    if (await page.locator('.modal-back').count()) { if (onModal) await onModal(); await resolveModal(page, policy, log); continue; }
    if (await page.locator('.cta .btn').count()) return;
    await page.waitForTimeout(30);
  }
}

/** Estado resumido da rodada para estatísticas: placares, expulsões, goleiros. Lê o estado do jogo no navegador. */
export function roundStats(page) {
  return page.evaluate(() => {
    const c = globalThis.__fm; const r = c.state.snapshot.round; const uid = c.state.career.userClubId;
    const o = { scores: [], reds: [], yellows: 0, injuries: 0, gkIssues: 0, cpuGkEvents: 0, matches: r.matches.length, userReds: 0 };
    for (const m of r.matches) {
      o.scores.push(`${m.score.home}-${m.score.away}`);
      if (m.status !== 'FINISHED') o.gkIssues += 100;
      for (const side of ['home', 'away']) if (m[side].onField.filter((s) => s.sector === 'GK').length !== 1) o.gkIssues++;
      for (const e of m.events) {
        if (e.type === 'YELLOW_CARD') o.yellows++;
        if (e.type === 'INJURY') o.injuries++;
        if (e.type === 'RED_CARD') o.reds.push({ user: m[e.side].clubId === uid, detail: e.detail, minute: e.clock.minute, half: e.clock.half, added: e.clock.added });
        if ((e.type === 'INJURY' || e.type === 'RED_CARD') && e.side && m[e.side].clubId !== uid && m[e.side].players[e.playerId]?.position === 'GK') o.cpuGkEvents++;
      }
    }
    return o;
  });
}
