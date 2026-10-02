// Utilitários compartilhados dos scripts de QA em navegador (só interface: cliques e leitura da tela).
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// APP_URL=http://... testa o build servido por HTTP (como publicado); sem a variável, abre o arquivo local.
export const APP_URL = process.env.APP_URL || 'file://' + join(ROOT, 'dist/app/index.html');
export const SAVE_KEY = 'fm-brasileiro:carreira:v1';
// Playwright é ferramenta de QA (não faz parte do produto): procura no projeto (npm install -D playwright) e depois em NODE_PATH.
function loadPlaywright() {
  const places = [import.meta.url, ...(process.env.NODE_PATH ?? '').split(':').filter(Boolean).map((p) => p.replace(/\/?$/, '/'))];
  for (const base of places) { try { return createRequire(base)('playwright'); } catch { /* tenta o próximo */ } }
  console.error('Playwright não encontrado. Instale (npm install -D playwright && npx playwright install chromium) ou aponte NODE_PATH para uma instalação existente.');
  process.exit(2);
}
export const { chromium } = loadPlaywright();
export const shotDir = (...p) => { const d = join(ROOT, 'dist/qa', ...p); mkdirSync(d, { recursive: true }); return d; };

/**
 * Observa erros da página e a prepara para o QA (padrão): o splash de ~8 s não aparece (sessionStorage, o mesmo que
 * acontece na 2ª abertura da sessão) e cada carregamento passa pela ENTRADA (perfil local "QA") e pelo MODO
 * (CARREIRA OFFLINE) até a tela de início da carreira, onde os roteiros antigos começam.
 * { start: false } deixa a página como o jogador a vê (o QA do splash e da entrada usam assim).
 */
export function watch(page, errors, { start = true } = {}) {
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ` + m.text()); });
  if (!start) return;
  void page.addInitScript(() => { try { sessionStorage.setItem('elite-manager:splash-visto', '1'); } catch { /* sem sessionStorage */ } });
  for (const fn of ['goto', 'reload']) {
    const orig = page[fn].bind(page);
    page[fn] = async (...args) => { const r = await orig(...args); await toStart(page); return r; };
  }
}

/** ENTRADA → MODO → início da carreira, pela interface (perfil local; nada é autenticado). */
export async function toStart(page, name = 'QA') {
  await page.waitForSelector('.entry, .start, .shell', { timeout: 15000 });
  if (await page.locator('.entry .stack-btns').count()) {
    const enterAs = page.getByRole('button', { name: /^ENTRAR COMO/ });
    if (await enterAs.count()) await enterAs.click();
    else {
      await page.getByRole('button', { name: 'CRIAR CONTA', exact: true }).click();
      await page.fill('.entry input[type=text]', name);
      await page.getByRole('button', { name: 'CRIAR CONTA', exact: true }).click();
    }
  }
  if (await page.locator('.mode-card').count()) await page.locator('.mode-card').first().click();
  await page.waitForSelector('.start:not(.entry), .shell', { timeout: 15000 });
}

/**
 * Espera o próximo pop-up de DECISÃO do engine, passando (CONTINUAR) pelas paradas obrigatórias do caminho:
 * intervalo e lances importantes que não pedem decisão. Devolve quando há uma decisão aberta.
 */
export async function untilDecision(page, timeout = 20000) {
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > timeout) throw new Error('nenhuma decisão apareceu');
    await page.waitForSelector('.modal-back', { timeout: Math.max(1000, timeout - (Date.now() - t0)) });
    const st = await page.evaluate(() => { const s = globalThis.__fm.state.snapshot; return { stop: !!s.stop, status: s.status }; });
    if (st.status === 'AWAITING_DECISION') return;
    if (st.stop && st.status === 'PAUSED') { await page.locator('.modal footer').getByRole('button', { name: 'CONTINUAR', exact: true }).click(); await page.waitForTimeout(30); continue; }
    await page.waitForTimeout(30);
  }
}

/** Velocidade INSTANTÂNEA: saiu da interface, mas continua no controlador para o QA automatizado. */
export const instant = (page) => page.evaluate(() => globalThis.__fm.setSpeed('INSTANT'));

/** Aceita a proposta aberta no pop-up (ou abre a n-ésima e aceita). */
export async function acceptOffer(page, n = 0) {
  if (!(await page.locator('.modal').count())) await page.locator('.offer').nth(n).getByRole('button', { name: 'VER PROPOSTA' }).click();
  await page.locator('.modal footer').getByRole('button', { name: 'ACEITAR', exact: true }).click();
  await page.waitForSelector('.topbar');
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
    if (!document.querySelector('.modal-back') && !document.querySelector('.more-back')) document.querySelectorAll('.nav .nav-btn').forEach((b) => { const r = b.getBoundingClientRect(); if (!r.width || !r.height) return; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!t || !t.closest('.nav-btn')) issues.push('navegação coberta: ' + b.textContent.trim()); });
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
/** Navega pela barra (no celular, o que não cabe na barra fica no MAIS). */
export const nav = async (page, label) => {
  const direct = page.locator('.nav .nav-btn:visible', { hasText: label });
  if (await direct.count()) await direct.first().click();
  else { await page.locator('.nav-more').click(); await page.locator('.more-sheet .nav-btn', { hasText: label }).click(); }
  await page.waitForTimeout(120);
};
export const clickIn = (page, scope, name, exact = false) => page.locator(scope).getByRole('button', { name, exact }).first().click({ timeout: 8000 });

/** Cria a carreira pela interface (nome + primeira proposta). */
export async function startCareerUI(page, name = 'Marcos Vilela') {
  await page.fill('input[type=text]', name);
  await page.getByRole('button', { name: 'RECEBER PROPOSTAS' }).click();
  await acceptOffer(page, 0);
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
  if (title.startsWith('PÊNALTI') && (await page.locator('.modal .prow').count())) return void (await page.locator('.modal .prow').first().click());
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

/** Texto ilegível: palavra partida entre duas linhas (nomes) e aba de divisão cortada/fora da área visível. */
export function textIssues(page) {
  return page.evaluate(() => {
    const issues = [];
    const sel = '.sb-name, .mteam, .standings td, .clubrow, .prow-name, .chip-name, .topbar h1, .topbar .club-name, .offer h4, .next-vs span, .scorers li, .ev-txt, .card-title, .modal h2, .modal p, .btn, .tab, .nav-btn, .seg-btn, .pill, td, th, h2, h3, p, li';
    const seen = new Set();
    for (const el of document.querySelectorAll(sel)) {
      const r0 = el.getBoundingClientRect(); if (!r0.width || !r0.height) continue;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (seen.has(n)) continue; seen.add(n);
        const re = /\S{3,}/g; let m;
        while ((m = re.exec(n.textContent))) {
          const range = document.createRange(); range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
          const tops = new Set([...range.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top)));
          if (tops.size > 1) issues.push(`palavra partida: "${m[0]}" em <${el.tagName.toLowerCase()} class="${el.className}">`);
        }
      }
    }
    for (const b of document.querySelectorAll('button')) { const r = b.getBoundingClientRect(); if (r.width && r.height && b.scrollHeight > b.clientHeight + 2) issues.push(`conteúdo vazando do botão: "${b.textContent.trim().slice(0, 30)}" (${b.scrollHeight} > ${b.clientHeight})`); }
    const tabs = document.querySelector('.tabs');
    if (tabs) {
      const tr = tabs.getBoundingClientRect();
      if (tabs.scrollWidth > tabs.clientWidth + 1) issues.push(`abas com rolagem escondida (${tabs.scrollWidth} > ${tabs.clientWidth})`);
      for (const t of tabs.querySelectorAll('.tab')) { const r = t.getBoundingClientRect(); if (r.right > tr.right + 1 || r.left < tr.left - 1) issues.push(`aba cortada: ${t.textContent}`); if (t.scrollWidth > t.clientWidth + 1) issues.push(`texto da aba cortado: ${t.textContent}`); }
    }
    return [...new Set(issues)];
  });
}
