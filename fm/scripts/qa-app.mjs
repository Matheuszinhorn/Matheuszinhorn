// QA automatizado do app no Chromium headless, usando SÓ a interface (cliques e leitura da tela).
// Uso: NODE_PATH=<npm global> node scripts/qa-app.mjs [--season] [--only=mobile|desktop]
// Gera capturas em dist/qa/<viewport>/ e dist/qa/report.json. Sai com código 1 se houver erro de console, estouro de largura ou travamento.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Playwright é ferramenta de QA (não faz parte do produto): procura no projeto (npm install -D playwright) e depois em NODE_PATH.
function loadPlaywright() {
  const places = [import.meta.url, ...(process.env.NODE_PATH ?? '').split(':').filter(Boolean).map((p) => p.replace(/\/?$/, '/'))];
  for (const base of places) { try { return createRequire(base)('playwright'); } catch { /* tenta o próximo */ } }
  console.error('Playwright não encontrado. Instale (npm install -D playwright && npx playwright install chromium) ou aponte NODE_PATH para uma instalação existente.');
  process.exit(2);
}
const { chromium } = loadPlaywright();
const FULL_SEASON = process.argv.includes('--season');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7);
const VIEWPORTS = [
  { name: 'desktop', opts: { viewport: { width: 1280, height: 800 } } },
  { name: 'mobile', opts: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
].filter((v) => !ONLY || v.name === ONLY);

const report = { fullSeason: FULL_SEASON, viewports: {} };
let failed = false;

async function run(vp) {
  const dir = join(ROOT, 'dist/qa', vp.name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext(vp.opts);
  const page = await ctx.newPage();
  const r = { errors: [], overflow: [], shots: [], decisions: {}, rounds: 0, checks: {}, smallTargets: [] };
  report.viewports[vp.name] = r;
  page.on('pageerror', (e) => r.errors.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') r.errors.push('console: ' + m.text()); });
  let n = 0;
  const shot = async (name) => { const f = `${String(++n).padStart(2, '0')}-${name}.png`; await page.screenshot({ path: join(dir, f) }); r.shots.push(f); };
  const check = (name, ok, detail = '') => { r.checks[name] = ok ? 'ok' : `FALHOU ${detail}`; if (!ok) failed = true; };
  const noOverflow = async (where) => { const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); if (w[0] > w[1] + 1) { r.overflow.push(`${where}: ${w[0]} > ${w[1]}`); } };
  const click = (text, opts = {}) => page.getByRole('button', { name: text, exact: opts.exact ?? false }).first().click({ timeout: 8000 });
  const clickIn = (scope, name, exact = false) => page.locator(scope).getByRole('button', { name, exact }).first().click({ timeout: 8000 });
  const nav = async (label) => { await page.locator('.nav-btn', { hasText: label }).click(); await page.waitForTimeout(150); };
  // innerText respeita text-transform (títulos em CAIXA ALTA): comparar sempre em minúsculas.
  const text = () => page.evaluate(() => document.body.innerText.toLowerCase());

  await page.goto(process.env.APP_URL || 'file://' + join(ROOT, 'dist/app/index.html'));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await shot('inicio');
  check('inicio mostra o título', (await text()).includes('football manager'));

  // ----- iniciar carreira -----
  await click('RECEBER PROPOSTAS'); // sem nome: deve avisar, não avançar
  check('nome vazio é recusado', (await text()).includes('digite o nome do treinador'));
  await page.fill('input[type=text]', 'Marcos Vilela');
  await click('RECEBER PROPOSTAS');
  await shot('propostas');
  check('3 propostas de clube', (await page.locator('.offer').count()) === 3);
  await page.locator('.offer').first().getByRole('button').click();
  await page.waitForSelector('.topbar');
  await shot('partida-antes');
  await noOverflow('partida-antes');
  check('nav com 5 abas', (await page.locator('.nav-btn').count()) === 5);
  check('mostra a rodada 1', (await text()).includes('rodada 1 de 38'));

  // ----- MEU TIME -----
  await nav('MEU TIME');
  await shot('meu-time');
  await noOverflow('meu-time');
  check('campo com 11 titulares', (await page.locator('.chip').count()) === 11);
  const before = await page.locator('.chip-name').allInnerTexts();
  await page.locator('.pill', { hasText: '3-5-2' }).click();
  check('formação 3-5-2 aplicada (5 meias)', (await page.locator('.chip-MID').count()) === 5);
  await page.locator('.seg-btn', { hasText: 'Ofensivo' }).first().click();
  check('estilo ofensivo marcado', (await page.locator('.seg-btn.on', { hasText: 'Ofensivo' }).count()) >= 1);
  await page.locator('.chip-ATT').first().click();
  await page.locator('.chip-DEF').first().click(); // troca dois titulares
  const after = await page.locator('.chip-name').allInnerTexts();
  check('troca de titulares por toque mudou o campo', JSON.stringify(before) !== JSON.stringify(after));
  await shot('meu-time-editado');

  // ----- PARTIDA: velocidades, pausa, CLUBES -----
  await nav('PARTIDA');
  await page.locator('.seg-btn', { hasText: 'MUITO RÁPIDA' }).first().click();
  await click('JOGAR RODADA');
  await page.waitForSelector('.scoreboard');
  const minute = () => page.locator('.match-card .sb-clock').innerText();
  await page.waitForTimeout(1500);
  const m1 = await minute();
  check('relógio avança em MUITO RÁPIDA', /\d+/.test(m1) && !m1.startsWith('0\''), m1);
  await shot('partida-ao-vivo');
  await noOverflow('partida-ao-vivo');
  await clickIn('.controls', 'PAUSAR');
  const paused = await minute();
  await page.waitForTimeout(700);
  check('PAUSAR segura o relógio', (await minute()) === paused, paused);
  check('mostra PAUSADO', paused.includes('PAUSADO'));
  await clickIn('.controls', 'CONTINUAR', true);
  await nav('CLUBES');
  await shot('clubes-pausa');
  check('CLUBES avisa que a rodada está pausada', (await text()).includes('pausada'));
  await page.locator('.clubrow').first().click();
  await shot('clube-detalhe');
  await nav('PARTIDA');
  check('sair de CLUBES retoma o jogo', (await minute()).includes('AO VIVO') || (await minute()).includes('DECIS'));
  await nav('CAMPEONATO'); await shot('campeonato-durante'); await nav('PARTIDA');

  // ----- MEU TIME durante a partida -----
  if (!(await page.locator('.modal-back').count())) {
    await clickIn('.controls', 'MEU TIME', true);
    await page.waitForSelector('.modal-back');
    await shot('modal-meu-time');
    check('pop-up MEU TIME abre e pausa', (await minute()).includes('DECIS'));
    await noOverflow('modal-meu-time');
    await clickIn('.modal footer', 'CONTINUAR', true);
  }

  // ----- terminar a rodada em modo instantâneo, resolvendo decisões pela tela -----
  const resolve = async () => {
    const title = (await page.locator('.modal h2').innerText()).trim();
    r.decisions[title] = (r.decisions[title] ?? 0) + 1;
    if (!r.decisions._shot?.[title]) { (r.decisions._shot ??= {})[title] = 1; await shot('modal-' + title.toLowerCase().replace(/[^a-z]+/g, '-')); await noOverflow('modal ' + title); }
    if (title.startsWith('PÊNALTI')) await page.locator('.modal .prow').first().click();
    else if (title === 'MEU TIME') await clickIn('.modal footer', 'CONTINUAR', true);
    else {
      const confirm = page.locator('.modal footer').getByRole('button', { name: 'CONFIRMAR SUBSTITUIÇÃO' });
      if (await confirm.count() && await confirm.isEnabled()) await confirm.click();
      else if (await page.locator('.modal footer').getByRole('button', { name: 'ACEITAR SUGESTÃO' }).count()) await clickIn('.modal footer', 'ACEITAR SUGESTÃO');
      else await clickIn('.modal footer', 'CONTINUAR', true);
    }
  };
  const driveRound = async () => {
    const t0 = Date.now();
    for (;;) {
      if (Date.now() - t0 > 90_000) throw new Error('rodada travou (mais de 90 s)');
      if (await page.locator('.modal-back').count()) { await resolve(); continue; }
      if (await page.locator('.cta .btn').count()) return;
      await page.waitForTimeout(40);
    }
  };
  await driveRound();
  r.rounds = 1;
  await shot('partida-resultado');
  await noOverflow('partida-resultado');
  const post = await text();
  check('resultado mostra finanças da rodada', post.includes('finanças da rodada') && post.includes('bilheteria'));
  check('resultado mostra classificação do clube', post.includes('colocado'));
  await nav('CAMPEONATO'); await shot('campeonato'); await noOverflow('campeonato');
  check('tabela com 20 clubes', (await page.locator('.standings tbody tr').count()) === 20);
  check('todas as 4 divisões têm aba', (await page.locator('.tab').count()) === 4);
  await page.locator('.tab').first().click();
  check('divisão 1 lista 20 clubes', (await page.locator('.standings tbody tr').count()) === 20);
  await nav('CARREIRA'); await shot('carreira'); await noOverflow('carreira');
  check('carreira mostra o histórico de finanças', (await text()).includes('finanças') && (await page.locator('.tbl tbody tr').count()) >= 1);

  // ----- salvar/continuar: recarregar a página mantém a carreira -----
  await page.reload();
  await page.waitForSelector('.start, .topbar');
  check('após recarregar existe carreira salva para continuar', (await text()).includes('continuar carreira'));
  await click('CONTINUAR CARREIRA');
  await page.waitForSelector('.topbar');
  check('carreira continuada na rodada 2', (await text()).includes('rodada 2 de 38'));

  // ----- rodadas seguintes (ou a temporada inteira) -----
  await nav('PARTIDA');
  const target = FULL_SEASON ? 38 : 4;
  await page.locator('.seg-btn', { hasText: 'INSTANTÂNEA' }).first().click();
  const roundStart = Date.now();
  const st = () => page.evaluate(() => { const c = globalThis.__fm; const k = c.state.career; return { season: k.season, round: k.roundNumber, history: k.history.length, phase: c.state.phase, pending: c.state.snapshot.pending ? c.state.snapshot.pending.decision.type : null, status: c.state.snapshot.status, modals: document.querySelectorAll('.modal-back').length, ledger: k.userLedger.length, results: k.results.length }; });
  let seasonEnded = false;
  for (;;) {
    if (!FULL_SEASON && r.rounds >= target) break;
    if (await page.locator('.cta .btn').count()) { // POST
      const label = (await page.locator('.cta .btn').innerText()).trim();
      if (label.startsWith('INICIAR TEMPORADA')) {
        seasonEnded = true;
        const s38 = await st();
        check('rodada 38 concluída (roundNumber 39, extrato com 38 rodadas, 1520 resultados)', s38.round === 39 && s38.ledger === 38 && s38.results === 1520 && s38.history === 1, JSON.stringify(s38));
        check('rodada 38: nenhuma decisão pendente e nenhum pop-up aberto', s38.pending === null && s38.modals === 0, JSON.stringify(s38));
        await shot('fim-de-temporada'); await noOverflow('fim-de-temporada');
        const txt = await text();
        check('fim de temporada mostra campeões e resultado do clube', txt.includes('fim de temporada 2026') && txt.includes('campeões') && (txt.includes('acesso!') || txt.includes('rebaixamento.') || txt.includes('mesma divisão')));
        const before = await page.evaluate(() => { const k = globalThis.__fm.state.career; const rep = k.history[0]; return { moves: rep.movements.map((m) => [m.clubId, m.toDivisionId, m.kind]), userDiv: k.world.clubs[k.userClubId].divisionId, userMove: rep.userMovement ? rep.userMovement.kind : null, champions: rep.champions }; });
        check('24 movimentos (12 acessos + 12 rebaixamentos)', before.moves.length === 24 && before.moves.filter((m) => m[2] === 'PROMOTED').length === 12, String(before.moves.length));
        await page.locator('.cta .btn').click(); // VIRADA DE TEMPORADA PELA UI
        await page.waitForTimeout(300);
        await shot('nova-temporada'); await noOverflow('nova-temporada');
        const after = await page.evaluate((mv) => { const c = globalThis.__fm; const k = c.state.career; const sizes = k.world.divisions.map((d) => d.clubIds.length); const wrong = mv.filter(([id, to]) => k.world.clubs[id].divisionId !== to); const inDiv = k.world.divisions.every((d) => d.clubIds.every((id) => k.world.clubs[id].divisionId === d.id)); return { season: k.season, round: k.roundNumber, results: k.results.length, ledger: k.userLedger.length, history: k.history.length, sizes, wrong: wrong.length, inDiv, userDiv: k.world.clubs[k.userClubId].divisionId, phase: c.state.phase, pending: c.state.snapshot.pending, modals: document.querySelectorAll('.modal-back').length, sched: k.world.divisions.map((d) => k.schedule[d.id].length), saved: localStorage.getItem('fm-brasileiro:carreira:v1') !== null }; }, before.moves);
        check('nova temporada iniciada (2027, rodada 1, resultados e extrato zerados, histórico mantido)', after.season === 2027 && after.round === 1 && after.results === 0 && after.ledger === 0 && after.history === 1 && after.phase === 'PRE', JSON.stringify(after));
        check('promoção/rebaixamento refletidos: 4 divisões de 20, todos os 24 movidos na divisão de destino', after.sizes.join() === '20,20,20,20' && after.wrong === 0 && after.inDiv, JSON.stringify(after));
        check('clube do jogador na divisão coerente com o movimento', (before.userMove === null && after.userDiv === before.userDiv) || (before.userMove !== null && after.userDiv !== before.userDiv), JSON.stringify({ before: before.userDiv, after: after.userDiv, move: before.userMove }));
        check('calendário novo: 4 divisões × 38 rodadas', after.sched.join() === '38,38,38,38');
        check('sem decisão pendente nem pop-up na virada', after.pending === null && after.modals === 0);
        check('carreira salva após a virada', after.saved);
        const t2 = await text();
        check('tela mostra a rodada 1 de 38 da temporada 2027', t2.includes('rodada 1 de 38') && t2.includes('t2027'));
        // a rodada 1 da nova temporada é jogável
        await click('JOGAR RODADA'); await driveRound(); r.rounds += 1;
        const s2 = await st();
        check('rodada 1 da temporada 2027 jogada e aplicada', s2.season === 2027 && s2.round === 2 && s2.results === 40 && s2.ledger === 1 && s2.pending === null && s2.modals === 0, JSON.stringify(s2));
        await noOverflow('2027-r1');
        break;
      }
      await page.locator('.cta .btn').click();
      continue;
    }
    await click('JOGAR RODADA');
    await driveRound();
    r.rounds += 1;
    await noOverflow(`pos-rodada-${r.rounds}`);
    if (r.rounds % 10 === 0) console.log(`  [${vp.name}] ${r.rounds} rodadas... (${((Date.now() - roundStart) / 1000).toFixed(0)} s)`);
  }
  if (FULL_SEASON) check('as 38 rodadas da temporada 2026 foram jogadas pela UI e a virada foi executada pela UI', seasonEnded && r.rounds >= 39, `rodadas=${r.rounds} virada=${seasonEnded}`);
  else r.checks.temporadaCompleta = 'não executado (use --season)';
  r.secondsPerRound = +((Date.now() - roundStart) / 1000 / Math.max(1, r.rounds - 1)).toFixed(2);
  await nav('CAMPEONATO'); await shot('campeonato-final');

  // ----- alvos de toque pequenos no celular -----
  if (vp.name === 'mobile') {
    for (const s of ['MEU TIME', 'PARTIDA', 'CAMPEONATO', 'CLUBES', 'CARREIRA']) {
      await nav(s);
      const small = await page.evaluate(() => [...document.querySelectorAll('button, .tbl tbody tr')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.height < 30 && !e.classList.contains('x'); }).map((e) => (e.textContent || '').trim().slice(0, 24) + ' ' + Math.round(e.getBoundingClientRect().height) + 'px'));
      small.forEach((x) => r.smallTargets.push(`${s}: ${x}`));
    }
  }
  // ----- NOVA CARREIRA na mesma página (sem recarregar) e jogar a rodada 1 dela -----
  await nav('CARREIRA');
  await click('NOVA CARREIRA');
  await click('SIM, APAGAR E RECOMEÇAR');
  await page.waitForSelector('.start');
  await page.fill('input[type=text]', 'Segundo Treinador');
  await click('RECEBER PROPOSTAS');
  await page.locator('.offer').nth(1).getByRole('button').click();
  await page.waitForSelector('.topbar');
  await nav('PARTIDA');
  await page.locator('.seg-btn', { hasText: 'INSTANTÂNEA' }).first().click();
  await click('JOGAR RODADA');
  await driveRound();
  const second = await page.evaluate(() => { const c = globalThis.__fm.state; return { coach: c.career.coach.name, round: c.career.roundNumber, results: c.career.results.length, phase: c.phase }; });
  check('nova carreira na mesma página: a rodada 1 é jogada e aplicada (não fica em "Preparando a rodada…")', second.coach === 'Segundo Treinador' && second.round === 2 && second.results === 40 && second.phase === 'POST', JSON.stringify(second));
  await noOverflow('nova-carreira-r1');
  if (r.errors.length) failed = true;
  if (r.overflow.length) failed = true;
  await browser.close();
}

for (const vp of VIEWPORTS) { console.log(`QA ${vp.name}...`); await run(vp); }
mkdirSync(join(ROOT, 'dist/qa'), { recursive: true });
writeFileSync(join(ROOT, 'dist/qa/report.json'), JSON.stringify(report, null, 2));
for (const [name, r] of Object.entries(report.viewports)) {
  const bad = Object.entries(r.checks).filter(([, v]) => v !== 'ok' && !String(v).startsWith('não executado'));
  console.log(`\n[${name}] rodadas: ${r.rounds} | checks ok: ${Object.values(r.checks).filter((v) => v === 'ok').length}/${Object.keys(r.checks).length} | erros de console: ${r.errors.length} | estouro de largura: ${r.overflow.length} | decisões vistas: ${JSON.stringify(Object.fromEntries(Object.entries(r.decisions).filter(([k]) => k !== '_shot')))}`);
  bad.forEach(([k, v]) => console.log('  ✗', k, v));
  r.errors.slice(0, 5).forEach((e) => console.log('  erro:', e.slice(0, 200)));
  r.overflow.slice(0, 5).forEach((e) => console.log('  overflow:', e));
}
process.exit(failed ? 1 : 0);
