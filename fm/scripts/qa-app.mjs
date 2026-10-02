// QA automatizado do app no Chromium headless, usando SÓ a interface (cliques e leitura da tela).
// Uso: NODE_PATH=<npm global> node scripts/qa-app.mjs [--season] [--only=mobile|desktop]
// Gera capturas em dist/qa/<viewport>/ e dist/qa/report.json. Sai com código 1 se houver erro de console, estouro de largura ou travamento.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acceptOffer, instant, toStart } from './qa-lib.mjs';

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
// Carreira fixa (reprodutível): mesmo clube e mesmas partidas a cada execução. QA_SEED troca a carreira testada.
const QA_SEED = process.env.QA_SEED || 'qa-app-v1';
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
  // splash de ~8 s só na 1ª abertura da sessão: o QA abre como numa 2ª visita (o QA do splash testa o splash)
  await page.addInitScript(() => { try { sessionStorage.setItem('elite-manager:splash-visto', '1'); } catch { /* */ } });
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
  const navClick = async (label, timeout) => {
    const direct = page.locator('.nav .nav-btn:visible', { hasText: label });
    if (await direct.count()) await direct.first().click({ timeout });
    else { await page.locator('.nav-more').click({ timeout }); await page.locator('.more-sheet .nav-btn', { hasText: label }).click({ timeout }); }
  };
  const nav = async (label) => { await navClick(label); await page.waitForTimeout(150); };
  // innerText respeita text-transform (títulos em CAIXA ALTA): comparar sempre em minúsculas.
  const text = () => page.evaluate(() => document.body.innerText.toLowerCase());

  // ----- decisões abertas (pop-up obrigatório) -----
  // Numa rodada ao vivo, uma decisão pode abrir a qualquer instante e bloquear PAUSAR, as abas e o MEU TIME (correto:
  // o pop-up é obrigatório). O QA lê o estado do jogo e resolve a decisão pela tela antes da próxima ação.
  const resolve = async () => {
    const title = (await page.locator('.modal h2').innerText()).trim();
    r.decisions[title] = (r.decisions[title] ?? 0) + 1;
    if (!r.decisions._shot?.[title]) { (r.decisions._shot ??= {})[title] = 1; await shot('modal-' + title.toLowerCase().replace(/[^a-z]+/g, '-')); await noOverflow('modal ' + title); }
    if (title.startsWith('PÊNALTI') && (await page.locator('.modal .prow').count())) await page.locator('.modal .prow').first().click();
    else if (title === 'MEU TIME') await clickIn('.modal footer', 'CONTINUAR', true);
    else {
      const confirm = page.locator('.modal footer').getByRole('button', { name: 'CONFIRMAR SUBSTITUIÇÃO' });
      if (await confirm.count() && await confirm.isEnabled()) await confirm.click();
      else if (await page.locator('.modal footer').getByRole('button', { name: 'ACEITAR SUGESTÃO' }).count()) await clickIn('.modal footer', 'ACEITAR SUGESTÃO');
      else await clickIn('.modal footer', 'CONTINUAR', true);
    }
  };
  const live = () => page.evaluate(() => {
    const s = globalThis.__fm.state.snapshot;
    return { status: s.status, decision: s.pending ? s.pending.decision.id : null, clocks: s.round ? s.round.matches.map((m) => `${m.clock.half}:${m.clock.minute}+${m.clock.added}:${m.status}`).join() : '' };
  });
  const modalTitle = async () => ((await page.locator('.modal-back').count()) ? (await page.locator('.modal h2').innerText()).trim() : null);
  let decisionRulesChecked = false;
  /** Na primeira decisão real (não o MEU TIME aberto pelo jogador), na tela PARTIDA: confere que ela segura o jogo. */
  const checkDecisionRules = async () => {
    const a = await live();
    const pause = page.locator('.controls').getByRole('button', { name: 'PAUSAR' });
    const pauseBlocked = (await pause.count()) > 0 && (await pause.first().isDisabled());
    await page.keyboard.press('Escape');
    await page.locator('.modal-back').first().click({ position: { x: 4, y: 4 }, force: true }); // clique fora do pop-up
    await page.waitForTimeout(600); // janela de MEDIÇÃO: com a decisão aberta, nenhum relógio pode andar
    const b = await live();
    check('decisão aberta: jogo em AWAITING_DECISION com a decisão pendente', a.status === 'AWAITING_DECISION' && a.decision !== null, JSON.stringify(a));
    check('decisão aberta: os relógios das 40 partidas não andam', a.clocks === b.clocks && b.status === 'AWAITING_DECISION' && b.decision === a.decision);
    check('decisão aberta: PAUSAR fica bloqueado (não executa durante a decisão)', pauseBlocked);
    check('decisão aberta: o pop-up é obrigatório (ESC e clique fora não fecham)', (await page.locator('.modal-back').count()) === 1);
    await resolve();
    const c = await live();
    check('depois de resolver a decisão o jogo continua', c.status !== 'AWAITING_DECISION' || c.decision !== a.decision, JSON.stringify(c));
    decisionRulesChecked = true;
  };
  let stopRulesChecked = false;
  /** Primeiro INTERVALO: a rodada fica parada (relógios congelados) até o CONTINUAR. */
  const checkStopRules = async () => {
    const a = await live();
    await page.waitForTimeout(600);
    const b = await live();
    check('intervalo: a rodada para (PAUSED) e os relógios não andam até CONTINUAR', a.status === 'PAUSED' && a.clocks === b.clocks, JSON.stringify(a));
    check('intervalo: pop-up com resumo e CONTINUAR', (await page.locator('.modal footer').getByRole('button', { name: 'CONTINUAR', exact: true }).count()) === 1 && (await page.locator('.modal .stat').count()) >= 3);
    await resolve();
    const c = await live();
    check('intervalo: CONTINUAR retoma o segundo tempo', c.status !== 'PAUSED' || c.clocks !== a.clocks, JSON.stringify(c));
    stopRulesChecked = true;
  };
  const handleDecision = async () => {
    const title = await modalTitle();
    const st = await live();
    if (!stopRulesChecked && title === 'INTERVALO' && (await page.locator('.controls').count())) return checkStopRules();
    if (!decisionRulesChecked && title !== 'MEU TIME' && st.status === 'AWAITING_DECISION' && (await page.locator('.controls').count())) return checkDecisionRules();
    return resolve();
  };
  const settle = async () => { while (await page.locator('.modal-back').count()) await handleDecision(); };
  /** Ação que exige o jogo sem pop-up. Se uma decisão abrir entre a verificação e o clique, o clique é bloqueado; o QA resolve e repete. */
  const whenNoDecision = async (what, act) => {
    for (let i = 0; i < 25; i++) {
      await settle();
      try { return await act(); } catch (e) {
        if (await page.locator('.modal-back').count()) continue; // decisão abriu no meio: resolver e repetir
        throw e;
      }
    }
    throw new Error(`${what}: decisões em sequência demais`);
  };
  const liveNav = (label) => whenNoDecision(`aba ${label}`, async () => { await navClick(label, 3000); await page.waitForTimeout(150); });
  const driveRound = async () => {
    const t0 = Date.now();
    for (;;) {
      if (Date.now() - t0 > 90_000) throw new Error('rodada travou (mais de 90 s)');
      if (await page.locator('.modal-back').count()) { await handleDecision(); continue; }
      if (await page.locator('.cta .btn').count()) return;
      await page.waitForTimeout(40);
    }
  };

  await page.goto(process.env.APP_URL || 'file://' + join(ROOT, 'dist/app/index.html'));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.entry');
  await shot('entrada');
  check('entrada: ENTRAR, CRIAR CONTA e CONTINUAR COM GOOGLE', (await page.getByRole('button', { name: 'CRIAR CONTA', exact: true }).count()) === 1 && (await page.getByRole('button', { name: 'CONTINUAR COM GOOGLE' }).count()) === 1 && (await page.getByRole('button', { name: 'ENTRAR', exact: true }).count()) === 1);
  await click('CONTINUAR COM GOOGLE');
  check('Google não finge login (avisa e fica na entrada)', (await page.locator('.entry').count()) === 1 && (await text()).includes('online'));
  await toStart(page, 'Perfil QA');
  check('perfil local criado e modo CARREIRA abriu o início', (await page.locator('.start').count()) === 1 && (await page.evaluate(() => JSON.parse(localStorage.getItem('elite-manager:perfil-local') || '{}').name)) === 'Perfil QA');
  await shot('inicio');
  check('inicio mostra o título', (await text()).includes('elite manager'));
  await page.fill('input[type=text]', '');

  // ----- iniciar carreira -----
  await click('RECEBER PROPOSTAS'); // sem nome: deve avisar, não avançar
  check('nome vazio é recusado', (await text()).includes('digite o nome do treinador'));
  await page.fill('input[type=text]', 'Marcos Vilela');
  await click('RECEBER PROPOSTAS');
  // Mesmo trio de propostas a cada execução: o próprio controlador sorteia as propostas por seed (offerClubs).
  await page.evaluate((seed) => globalThis.__fm.offerClubs(seed), QA_SEED);
  await shot('propostas');
  check('3 propostas de clube', (await page.locator('.offer').count()) === 3);
  // anti-reroll: recarregar com as propostas abertas mostra as MESMAS (e a recusa continua)
  const offerNames = await page.locator('.offer h4').allInnerTexts();
  await page.locator('.offer').nth(2).getByRole('button', { name: 'VER PROPOSTA' }).click();
  await clickIn('.modal footer', 'RECUSAR');
  await page.reload(); await toStart(page);
  check('anti-reroll: recarregar mostra as mesmas 3 propostas, com a recusa', JSON.stringify(await page.locator('.offer h4').allInnerTexts()) === JSON.stringify(offerNames) && (await page.locator('.offer.refused').count()) === 1, JSON.stringify(offerNames));
  check('sem sortear outras propostas', (await page.getByRole('button', { name: /SORTEAR/ }).count()) === 0 && (await page.getByRole('button', { name: 'AGUARDAR PROPOSTAS' }).count()) === 1);
  await page.locator('.offer').nth(0).getByRole('button', { name: 'VER PROPOSTA' }).click();
  check('pop-up da proposta: ACEITAR, RECUSAR e ANALISAR CLUBE', (await modalTitle()) === 'PROPOSTA DE TRABALHO' && (await page.locator('.modal footer .btn').count()) === 3);
  await shot('proposta');
  await clickIn('.modal footer', 'ANALISAR CLUBE');
  const analysis = (await page.locator('.modal').innerText()).toLowerCase();
  check('análise: elenco, finanças, estádio, objetivo e divisão', ['elenco', 'finanças', 'estádio', 'objetivo', 'divisão', 'diretoria'].every((w) => analysis.includes(w)) && (await page.locator('.modal tbody tr').count()) >= 36, analysis.slice(0, 120));
  await shot('proposta-analise');
  await noOverflow('proposta-analise');
  await clickIn('.modal footer', 'VOLTAR À PROPOSTA');
  check('VOLTAR devolve à proposta sem perdê-la', (await modalTitle()) === 'PROPOSTA DE TRABALHO');
  await acceptOffer(page, 0);
  await page.waitForSelector('.topbar');
  await shot('partida-antes');
  await noOverflow('partida-antes');
  check('navegação com as 10 telas (+ MAIS no celular)', (await page.locator('.nav > .nav-btn').count()) === 11 && (await page.locator('.nav .nav-btn:visible').count()) === (vp.name === 'mobile' ? 5 : 10));
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
  await page.getByRole('button', { name: 'RÁPIDA', exact: true }).first().click();
  await click('JOGAR RODADA');
  await page.waitForSelector('.scoreboard');
  const minute = () => page.locator('.match-card .sb-clock').innerText();
  await page.waitForTimeout(1500);
  const m1 = await minute();
  check('relógio avança em RÁPIDA', /\d+/.test(m1) && !m1.startsWith('0\''), m1);
  await shot('partida-ao-vivo');
  await noOverflow('partida-ao-vivo');
  await whenNoDecision('PAUSAR', () => page.locator('.controls').getByRole('button', { name: 'PAUSAR' }).first().click({ timeout: 3000 }));
  const paused = await minute();
  await page.waitForTimeout(700);
  check('PAUSAR segura o relógio', (await minute()) === paused, paused);
  check('mostra PAUSADO', paused.includes('PAUSADO'));
  await clickIn('.controls', 'CONTINUAR', true);
  await liveNav('CLUBES');
  await shot('clubes-pausa');
  check('CLUBES avisa que a rodada está pausada', (await text()).includes('pausada'));
  await page.locator('.clubrow').first().click();
  await shot('clube-detalhe');
  await liveNav('PARTIDA');
  check('sair de CLUBES retoma o jogo', (await minute()).includes('AO VIVO') || (await minute()).includes('DECIS'));
  await liveNav('CAMPEONATO'); await shot('campeonato-durante'); await liveNav('PARTIDA');

  // ----- MEU TIME durante a partida (sempre testado: decisões abertas são resolvidas antes) -----
  await whenNoDecision('abrir MEU TIME', () => page.locator('.controls').getByRole('button', { name: 'MEU TIME', exact: true }).first().click({ timeout: 3000 }));
  await page.waitForSelector('.modal-back');
  await shot('modal-meu-time');
  check('pop-up MEU TIME abre e pausa', (await modalTitle()) === 'MEU TIME' && (await minute()).includes('DECIS') && (await live()).status === 'AWAITING_DECISION');
  await noOverflow('modal-meu-time');
  await clickIn('.modal footer', 'CONTINUAR', true);

  // ----- terminar a rodada, resolvendo decisões pela tela -----
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
  check('carreira mostra moral, objetivo e propostas', (await text()).includes('objetivo da temporada') && (await text()).includes('propostas de trabalho'));
  await nav('FINANÇAS'); await shot('financas'); await noOverflow('financas');
  const fin = await text();
  check('finanças mostram situação, temporada, patrocínio e empréstimo', ['situação', 'temporada', 'patrocínio', 'empréstimo bancário'].every((w) => fin.includes(w)));
  await nav('NOTÍCIAS');
  if (await page.locator('.news').count()) {
    await page.locator('.news').first().click();
    const np = await text();
    check('notícia abre a página completa (categoria, fonte, tags, VOLTAR PARA NOTÍCIAS)', np.includes('voltar para notícias') && np.includes('fonte:') && (await page.locator('.news-tags .badge').count()) >= 2);
    await shot('noticia-pagina'); await noOverflow('noticia-pagina');
    await click('VOLTAR PARA NOTÍCIAS');
  } else check('notícia abre a página completa', false, 'sem notícias depois da rodada');
  for (const [label, word] of [['MERCADO', 'mercado aberto'], ['NOTÍCIAS', 'jornal do dia'], ['CALENDÁRIO', 'calendário 2026'], ['ESTÁDIO', 'obras disponíveis']]) {
    await nav(label); await shot(label.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')); await noOverflow(label);
    check(`${label} abre`, (await text()).includes(word));
  }

  // ----- salvar/continuar: recarregar a página mantém a carreira -----
  await page.reload();
  await toStart(page);
  check('após recarregar existe carreira salva para continuar', (await text()).includes('continuar carreira'));
  await click('CONTINUAR CARREIRA');
  await page.waitForSelector('.topbar');
  check('carreira continuada na rodada 2', (await text()).includes('rodada 2 de 38'));

  // ----- rodadas seguintes (ou a temporada inteira) -----
  await nav('PARTIDA');
  const target = FULL_SEASON ? 38 : 4;
  await instant(page);
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
  check('intervalo verificado (para, resume e CONTINUAR)', stopRulesChecked);
  check('regras da decisão verificadas numa decisão real (pausa, relógio parado, PAUSAR bloqueado, pop-up obrigatório, retomada)', decisionRulesChecked);
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
  await page.evaluate((seed) => globalThis.__fm.offerClubs(seed), `${QA_SEED}-nova`);
  await acceptOffer(page, 1);
  await page.waitForSelector('.topbar');
  await nav('PARTIDA');
  await instant(page);
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
