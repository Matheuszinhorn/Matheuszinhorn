// QA da ETAPA 7 — persistência da carreira, pela interface, com perfil de navegador PERSISTENTE (fechar/reabrir de verdade).
// Uso: node scripts/qa-persist.mjs [--w=1280 --h=800 | --w=390 --h=844 --mobile]   → dist/qa/persist-<w>.json
// Mecanismo testado: localStorage['fm-brasileiro:carreira:v1'] = serializeCareer(career) (JSON da carreira inteira), gravado
// ao criar a carreira, ao aplicar cada rodada, ao virar a temporada e a cada edição do MEU TIME; velocidade em
// localStorage['fm-brasileiro:velocidade']. CONTINUAR CARREIRA = deserializeCareer. A rodada em andamento NÃO é salva.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_URL, ROOT, SAVE_KEY, chromium, driveRound, layoutIssues, nav, startCareerUI, text, watch, instant } from './qa-lib.mjs';
const { careerOffers, createCareer, finishRound, isSeasonOver, planRound, serializeCareer, ROUNDS_PER_SEASON } = await import('../game/career.ts');
const { createRound, roundResults, simulateRound } = await import('../engine/index.ts');

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const W = Number(arg('w', 1280)), H = Number(arg('h', 800)), MOBILE = process.argv.includes('--mobile');
const ctxOpts = MOBILE ? { viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: W, height: H } };
const PROFILE = join(ROOT, 'dist/qa', `persist-profile-${W}`);
const R = { width: W, checks: {}, errors: [], layout: [], notes: {} };
let failed = false;
const check = (name, ok, extra = '') => { R.checks[name] = ok ? 'ok' : `FALHOU ${extra}`; if (!ok) failed = true; console.log(`${ok ? 'OK    ' : 'FALHOU'} [${W}] ${name}${!ok && extra ? ' — ' + extra : ''}`); };
const lay = async (page, where) => { for (const i of await layoutIssues(page)) R.layout.push(`${where}: ${i}`); };

/** Snapshot lógico da carreira (memória) + o que está gravado + o que a TELA mostra. */
const snap = (page) => page.evaluate((k) => {
  const c = globalThis.__fm.state.career; const club = c.world.clubs[c.userClubId];
  const div = c.world.divisions.find((d) => d.clubIds.includes(c.userClubId));
  const pts = {}; for (const id of div.clubIds) pts[id] = { p: 0, gd: 0, gf: 0 };
  for (const r of c.results) for (const [me, op, gm, go] of [[r.homeClubId, r.awayClubId, r.homeGoals, r.awayGoals], [r.awayClubId, r.homeClubId, r.awayGoals, r.homeGoals]]) if (pts[me]) { pts[me].p += gm > go ? 3 : gm === go ? 1 : 0; pts[me].gd += gm - go; pts[me].gf += gm; }
  const squad = club.squad.map((id) => c.world.players[id]);
  return {
    json: JSON.stringify(c), raw: localStorage.getItem(k), phase: globalThis.__fm.state.phase,
    coach: c.coach.name, club: club.name, clubId: c.userClubId, division: div.id, level: div.level, season: c.season, round: c.roundNumber, money: club.money,
    points: pts[c.userClubId]?.p ?? 0, squad: squad.map((p) => p.id).join(','), lineup: JSON.stringify(c.userLineup),
    injured: squad.filter((p) => p.condition.injuryRounds > 0).map((p) => `${p.id}:${p.condition.injuryRounds}`), suspended: squad.filter((p) => p.condition.suspensionRounds > 0).map((p) => `${p.id}:${p.condition.suspensionRounds}`),
    ledger: c.userLedger.length, results: c.results.length, resultIds: new Set(c.results.map((r) => `${r.round}:${r.homeClubId}:${r.awayClubId}`)).size, recent: c.results.slice(-3).map((r) => `R${r.round} ${r.homeClubId} ${r.homeGoals}-${r.awayGoals} ${r.awayClubId}`), history: c.history.length,
  };
}, SAVE_KEY);
/** O que a tela mostra (topo, MEU TIME, CARREIRA, CAMPEONATO). */
async function uiView(page) {
  const top = (await page.locator('.topbar').innerText()).toLowerCase().replace(/\s+/g, ' ');
  await nav(page, 'MEU TIME');
  const team = await page.evaluate(() => ({ formation: document.querySelector('.pill.on')?.textContent ?? null, segs: [...document.querySelectorAll('.seg-btn.on')].map((b) => b.textContent.toLowerCase()), taker: document.querySelector('label.field select')?.value ?? null, chips: [...document.querySelectorAll('.pitch .chip .chip-name')].map((x) => x.textContent).join('|') }));
  await nav(page, 'CARREIRA'); const ledgerRows = await page.locator('.tbl tbody tr').count();
  await nav(page, 'CAMPEONATO'); const myRow = (await page.locator('.standings tbody tr.me').innerText().catch(() => '')).replace(/\s+/g, ' ');
  await nav(page, 'PARTIDA');
  return { top, ...team, ledgerRows, myRow };
}
/** Invariantes da carreira carregada. */
const consistency = (page) => page.evaluate(() => {
  const c = globalThis.__fm.state.career; const e = [];
  const club = c.world.clubs[c.userClubId]; if (!club) e.push('clube inexistente');
  if (c.world.divisions.length !== 4 || c.world.divisions.some((d) => d.clubIds.length !== 20)) e.push('divisões ≠ 4×20');
  if (!c.world.divisions.some((d) => d.clubIds.includes(c.userClubId) && d.id === club.divisionId)) e.push('divisão do clube incoerente');
  if (!(c.season >= 2026) || !(c.roundNumber >= 1 && c.roundNumber <= 39)) e.push(`temporada/rodada inválida ${c.season}/${c.roundNumber}`);
  if (c.results.length !== (Math.min(c.roundNumber, 39) - 1) * 40) e.push(`resultados ${c.results.length} ≠ ${(c.roundNumber - 1) * 40}`);
  if (new Set(c.results.map((r) => `${r.round}:${r.homeClubId}:${r.awayClubId}`)).size !== c.results.length) e.push('resultado duplicado');
  if (c.userLedger.length !== c.roundNumber - 1) e.push(`extrato ${c.userLedger.length} ≠ ${c.roundNumber - 1}`);
  if (new Set(c.userLedger.map((l) => l.matchId)).size !== c.userLedger.length) e.push('extrato duplicado (mesma partida 2×)');
  const ids = new Set(); for (const cl of Object.values(c.world.clubs)) for (const id of cl.squad) { if (ids.has(id)) e.push(`jogador em 2 elencos: ${id}`); ids.add(id); if (!c.world.players[id]) e.push(`jogador inexistente ${id}`); }
  const l = c.userLineup; if (l) { const st = l.starters.map((s) => s.playerId); if (l.starters.filter((s) => s.sector === 'GK').length !== 1) e.push('escalação salva sem exatamente 1 GK'); if (new Set([...st, ...l.bench]).size !== st.length + l.bench.length) e.push('escalação salva com duplicado'); if ([...st, ...l.bench].some((id) => !club.squad.includes(id))) e.push('escalação com jogador fora do elenco'); }
  return e;
});
const playRoundUI = async (page) => { await nav(page, 'PARTIDA'); await page.getByRole('button', { name: 'JOGAR RODADA' }).click(); await driveRound(page, { policy: 'suggest' }); };
const nextRoundUI = async (page) => { await page.locator('.cta .btn').click(); await page.waitForTimeout(100); };
const continueUI = async (page) => { await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click(); await page.waitForSelector('.topbar'); };
const roundDigest = (page) => page.evaluate(() => { const r = globalThis.__fm.state.snapshot.round; return r.matches.map((m) => `${m.matchId} ${m.score.home}-${m.score.away} ${m.events.map((e) => `${e.clock.minute}${e.type[0]}${e.playerId ?? ''}`).join('.')}`).join('\n'); });

// ======================= 1–6, 7A/B/D/E: carreira nova → rodadas → edição → refresh → fechar/reabrir → continuar =======================
rmSync(PROFILE, { recursive: true, force: true });
const launch = () => chromium.launchPersistentContext(PROFILE, ctxOpts);
let ctx = await launch(); let page = ctx.pages()[0] ?? (await ctx.newPage()); watch(page, R.errors);
await page.addInitScript(() => { Math.random = () => 0.2718; Date.now = () => 1_700_000_000_000; }); // mesma carreira em toda execução
await page.goto(APP_URL); await page.evaluate(() => localStorage.clear()); await page.reload();
check('sem save: a tela inicial NÃO oferece CONTINUAR CARREIRA', !(await text(page)).includes('continuar carreira'));
await startCareerUI(page, 'Treinador Persistência');
let s0 = await snap(page);
check(`nova carreira salva na hora: ${s0.coach}, ${s0.club} (${s0.division}, nível ${s0.level}), T${s0.season} R${s0.round}, caixa ${s0.money}`, s0.raw === s0.json && s0.level === 4 && s0.season === 2026 && s0.round === 1 && s0.ledger === 0 && s0.results === 0 && s0.coach === 'Treinador Persistência', JSON.stringify({ level: s0.level, round: s0.round }));
const ui0 = await uiView(page);
check('nova carreira: MEU TIME com escalação, estilo, comportamento e batedor (automático) exibidos', !!ui0.formation && ui0.segs.length === 2 && ui0.taker === '' && ui0.chips.split('|').length === 11, JSON.stringify(ui0));
await page.reload(); await continueUI(page);
check('7A) antes da 1ª rodada: refresh devolve exatamente a carreira nova', (await snap(page)).json === s0.json);

// rodadas até haver lesão ou suspensão no elenco (no máx. 12)
await instant(page);
let rounds = 0; let s;
do { await playRoundUI(page); rounds++; s = await snap(page); if (rounds === 1) check('7B) depois da rodada (tela de resultado): carreira já salva (gravado == memória)', s.raw === s.json && s.round === 2 && s.phase === 'POST'); await nextRoundUI(page); s = await snap(page); } while (rounds < 15 && (rounds < 3 || s.injured.length === 0 || s.suspended.length === 0));
R.notes.rodadasAteLesaoOuSuspensao = rounds;
// 7D/E: alteração de escalação (formação + troca por toque no campo + batedor) e de estilo/comportamento
await nav(page, 'MEU TIME');
await page.locator('.pill', { hasText: '3-5-2' }).click();
const chipsBefore = await page.locator('.pitch .chip .chip-name').allInnerTexts();
await page.locator('.pitch .chip-ATT').first().click(); await page.locator('.pitch .chip-DEF').first().click();
const chipsAfter = await page.locator('.pitch .chip .chip-name').allInnerTexts();
await page.locator('.seg-btn', { hasText: /^Ofensivo$/i }).first().click();
await page.locator('.seg-btn', { hasText: /^Agressivo$/i }).first().click();
const tsel = page.locator('label.field select'); const takerId = await tsel.evaluate((x) => [...x.options].filter((o) => o.value).pop().value); await tsel.selectOption(takerId);
await page.waitForTimeout(100);
const before = await snap(page);
const uiBefore = await uiView(page);
check('7D/E) edições de escalação, estilo, comportamento e batedor gravadas na hora (gravado == memória)', before.raw === before.json && JSON.stringify(chipsBefore) !== JSON.stringify(chipsAfter) && before.lineup.includes('"OFFENSIVE"') && before.lineup.includes('"AGGRESSIVE"') && before.lineup.includes(takerId) && uiBefore.formation === '3-5-2');
R.notes.antes = { ...before, json: undefined, raw: undefined, squad: undefined, lineup: undefined, ui: uiBefore };
check(`snapshot com lesões E suspensões no elenco (lesões ${before.injured.join(',')}; suspensões ${before.suspended.join(',')})`, before.injured.length > 0 && before.suspended.length > 0, `após ${rounds} rodadas`);
let c1 = await consistency(page); check('consistência antes de salvar', c1.length === 0, c1.join('; '));

// 4) refresh
await page.reload();
check('refresh: tela inicial oferece CONTINUAR CARREIRA', (await text(page)).includes('continuar carreira'));
await continueUI(page);
let a = await snap(page); let uiA = await uiView(page);
const same = (x, y) => ['coach', 'club', 'division', 'season', 'round', 'money', 'points', 'squad', 'lineup', 'ledger', 'results', 'history'].filter((k) => JSON.stringify(x[k]) !== JSON.stringify(y[k])).concat(JSON.stringify(x.injured) !== JSON.stringify(y.injured) ? ['lesões'] : [], JSON.stringify(x.suspended) !== JSON.stringify(y.suspended) ? ['suspensões'] : [], JSON.stringify(x.recent) !== JSON.stringify(y.recent) ? ['resultados recentes'] : []);
check('refresh: carreira IDÊNTICA (JSON completo)', a.json === before.json);
check('refresh: campo a campo (treinador, clube, divisão, temporada, rodada, caixa, pontos, elenco, escalação, lesões, suspensões, extrato, resultados recentes)', same(a, before).length === 0, same(a, before).join(','));
check('refresh: a TELA mostra o mesmo (topo, formação, estilo/comportamento, batedor, campo, extrato, linha da tabela)', JSON.stringify(uiA) === JSON.stringify(uiBefore), JSON.stringify({ uiA, uiBefore }).slice(0, 300));
await lay(page, 'após refresh');

// 5) fechar e reabrir o navegador (mesmo perfil)
await ctx.close();
ctx = await launch(); page = ctx.pages()[0] ?? (await ctx.newPage()); watch(page, R.errors);
await page.goto(APP_URL);
check('fechar/reabrir: existe carreira para continuar', (await text(page)).includes('continuar carreira'));
await continueUI(page);
let b = await snap(page); let uiB = await uiView(page);
check('fechar/reabrir: carreira IDÊNTICA (JSON completo) e mesma tela', b.json === before.json && JSON.stringify(uiB) === JSON.stringify(uiBefore), same(b, before).join(','));
check('fechar/reabrir: velocidade escolhida é lembrada (INSTANTÂNEA)', (await page.evaluate(() => localStorage.getItem('fm-brasileiro:velocidade'))) === 'INSTANT');
c1 = await consistency(page); check('consistência após reabrir (1 GK na escalação salva, sem duplicados, clube/divisão/temporada/rodada/finanças coerentes)', c1.length === 0, c1.join('; '));

// 9) determinismo: o mesmo save antes da rodada → mesma rodada (mesmas decisões = sugestão)
await playRoundUI(page); const d1 = await roundDigest(page);
const afterPlay = await snap(page);
// 6) continuar jogando: nada duplicado, escalação mantida, lesões/suspensões evoluem
// regra do jogo (game/career.ts applyConditions): a cada rodada, lesão e suspensão caem 1; ao chegar a 0 o jogador volta
const evolved = (beforeList, afterList) => beforeList.every((x) => { const [id, n] = x.split(':'); const now = afterList.find((y) => y.startsWith(id + ':')); return Number(n) === 1 ? !now : Number(now?.split(':')[1]) === Number(n) - 1; });
const injuryOk = evolved(before.injured, afterPlay.injured);
const suspOk = evolved(before.suspended, afterPlay.suspended);
const lastLedger = await page.evaluate(() => { const c = globalThis.__fm.state.career; return c.userLedger[c.userLedger.length - 1].net; });
check(`continuar: rodada ${before.round} jogada UMA vez (rodada ${afterPlay.round}, +40 resultados sem duplicar, +1 linha de extrato, caixa = antes + resultado da rodada)`, afterPlay.round === before.round + 1 && afterPlay.results === before.results + 40 && afterPlay.resultIds === afterPlay.results && afterPlay.ledger === before.ledger + 1 && afterPlay.money === before.money + lastLedger, JSON.stringify({ r: afterPlay.round, res: afterPlay.results, ids: afterPlay.resultIds, l: afterPlay.ledger, m: [before.money, lastLedger, afterPlay.money] }));
const keptLineup = await page.evaluate(() => { const l = globalThis.__fm.state.career.userLineup; return { style: l?.style, behavior: l?.behavior, taker: l?.penaltyTakerId }; });
check('continuar: escalação/tática/batedor NÃO resetam depois da rodada', keptLineup.style === 'OFFENSIVE' && keptLineup.behavior === 'AGGRESSIVE' && keptLineup.taker === takerId, JSON.stringify(keptLineup));
check('continuar: lesões e suspensões do save seguem valendo (contam rodada a rodada, não somem)', injuryOk && suspOk, JSON.stringify({ antes: [before.injured, before.suspended], depois: [afterPlay.injured, afterPlay.suspended] }));
// 7B de novo: refresh na tela de resultado (POST, rodada já aplicada) não aplica de novo
await page.reload(); await continueUI(page);
const p2 = await snap(page);
check('refresh depois da rodada: não reaplica (mesma rodada, caixa, extrato e resultados) e volta para "antes da próxima"', p2.json === afterPlay.json && p2.phase === 'PRE');
// determinismo: outro contexto (não persistente) com o MESMO save de antes da rodada
{
  const tmp = await (await chromium.launch()).newContext(ctxOpts); const pg = await tmp.newPage(); watch(pg, R.errors);
  await pg.goto(APP_URL); await pg.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); localStorage.setItem('fm-brasileiro:velocidade', 'INSTANT'); }, [SAVE_KEY, before.json]); await pg.reload(); await continueUI(pg);
  await playRoundUI(pg); const d2 = await roundDigest(pg); const s2 = await snap(pg);
  check('9) determinismo: mesmo save + mesmas decisões = mesma rodada (40 placares/eventos) e mesma carreira resultante', d1 === d2 && s2.json === afterPlay.json);
  await tmp.browser().close();
}

// 11) refresh DURANTE a partida: volta ao início da mesma rodada, sem cobrar/aplicar nada; jogar de novo dá o mesmo resultado
{
  const pre = await snap(page);
  await page.getByRole('button', { name: 'RÁPIDA', exact: true }).first().click();
  await page.getByRole('button', { name: 'JOGAR RODADA' }).click(); await page.waitForTimeout(1500);
  const midMinute = await page.evaluate(() => globalThis.__fm.userMatch()?.clock.minute ?? null);
  await page.reload(); await continueUI(page);
  const mid = await snap(page);
  check(`11) refresh no meio da partida (${midMinute}'): carreira intacta = antes da rodada (sem rodada duplicada, sem resultado parcial, sem cobrança)`, mid.json === pre.json && mid.phase === 'PRE', JSON.stringify({ round: mid.round, results: mid.results, ledger: mid.ledger }));
  await instant(page);
  await playRoundUI(page); const after = await snap(page);
  check('11) a rodada interrompida é jogada depois normalmente, UMA vez', after.round === pre.round + 1 && after.results === pre.results + 40 && after.resultIds === after.results && after.ledger === pre.ledger + 1);
  await nextRoundUI(page);
}
await ctx.close();

// ======================= 7C: entre temporadas =======================
{
  // carreira avançada até a rodada 38 com as funções do jogo (atalho do teste); a rodada 38 e a virada são pela interface
  const seed = 'qa-persist-temporada'; let c = createCareer({ seed, coachName: 'Treinador Temporada', clubId: careerOffers(seed)[0] });
  while (c.roundNumber < ROUNDS_PER_SEASON) { const p = planRound(c); c = finishRound(c, roundResults(simulateRound(createRound(p.roundId, p.seed, p.fixtures, null)))).career; }
  rmSync(PROFILE, { recursive: true, force: true });
  ctx = await launch(); page = ctx.pages()[0] ?? (await ctx.newPage()); watch(page, R.errors);
  await page.goto(APP_URL); await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); localStorage.setItem('fm-brasileiro:velocidade', 'INSTANT'); }, [SAVE_KEY, serializeCareer(c)]); await page.reload(); await continueUI(page);
  await playRoundUI(page);
  const end = await snap(page);
  check('7C) rodada 38 pela interface: fim de temporada salvo (rodada 39, 1520 resultados, promoção pendente)', end.round === 39 && end.results === 1520 && end.raw === end.json && (await page.evaluate(() => !!globalThis.__fm.state.career.pendingPromotion)));
  // refresh no fim da temporada, ANTES de INICIAR TEMPORADA
  await page.reload(); await continueUI(page);
  const t1 = (await text(page));
  const btn = (await page.locator('.cta .btn').innerText().catch(() => '')).trim();
  check('7C) refresh no fim da temporada: volta na tela FIM DE TEMPORADA com o botão INICIAR TEMPORADA 2027 (não trava em "rodada 39")', t1.includes('fim de temporada 2026') && btn === 'INICIAR TEMPORADA 2027' && !t1.includes('rodada 39 de 38'), btn);
  await lay(page, 'fim de temporada após refresh');
  // fechar/reabrir no fim da temporada
  await ctx.close(); ctx = await launch(); page = ctx.pages()[0] ?? (await ctx.newPage()); watch(page, R.errors); await page.goto(APP_URL); await continueUI(page);
  check('7C) fechar/reabrir no fim da temporada: mesma tela e carreira idêntica', (await snap(page)).json === end.json && (await page.locator('.cta .btn').innerText()).trim() === 'INICIAR TEMPORADA 2027');
  await nextRoundUI(page);
  const n = await snap(page);
  check('7C) virada pela interface após reabrir: 2027, rodada 1, resultados/extrato zerados, histórico 1, salvo', n.season === 2027 && n.round === 1 && n.results === 0 && n.ledger === 0 && n.history === 1 && n.raw === n.json);
  await page.reload(); await continueUI(page);
  const n2 = await snap(page);
  check('7C) refresh depois da virada: 2027 rodada 1 (não vira de novo, não volta para 2026)', n2.json === n.json && n2.phase === 'PRE');
  await playRoundUI(page);
  const n3 = await snap(page); c1 = await consistency(page);
  check('7C) temporada 2027 continua jogável depois de tudo isso (rodada 1 aplicada uma vez)', n3.season === 2027 && n3.round === 2 && n3.results === 40 && n3.ledger === 1 && c1.length === 0, c1.join('; '));
  await ctx.close();
}

// ======================= 10: save inválido =======================
{
  const brw = await chromium.launch();
  const valid = JSON.parse(serializeCareer(createCareer({ seed: 'qa-save-ruim', coachName: 'X', clubId: careerOffers('qa-save-ruim')[0] })));
  const cases = {
    'JSON corrompido': '{ruim',
    'incompleto (só a versão)': JSON.stringify({ version: 1 }),
    'versão incompatível (2)': JSON.stringify({ ...valid, version: 2 }),
    'clube do jogador inexistente': JSON.stringify({ ...valid, userClubId: 'clb-nao-existe' }),
    'vazio': '',
  };
  for (const [name, raw] of Object.entries(cases)) {
    const cx = await brw.newContext(ctxOpts); const pg = await cx.newPage(); const errs = []; watch(pg, errs);
    await pg.goto(APP_URL); await pg.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [SAVE_KEY, raw]); await pg.reload();
    const offers = (await text(pg)).includes('continuar carreira');
    let toast = ''; let started = false;
    if (offers) { await pg.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click(); await pg.waitForTimeout(200); toast = await pg.locator('.toast').innerText().catch(() => ''); }
    const stillOk = await pg.evaluate(() => !!document.querySelector('.start') && !globalThis.__fm.state.career);
    // a aplicação continua utilizável: começa uma carreira nova por cima
    try { await startCareerUI(pg, 'Recomeço'); started = (await pg.evaluate(() => !!globalThis.__fm.state.career)); } catch { started = false; }
    R.notes[`save inválido: ${name}`] = { offers, toast, stillOk, started, errs };
    check(`10) save inválido — ${name}: não quebra (mensagem de erro, sem exceção na página) e dá para começar outra carreira`, (toast !== '' || !offers) && stillOk && started && errs.length === 0, JSON.stringify({ offers, toast, stillOk, started, errs: errs.slice(0, 1) }));
    await cx.close();
  }
  await brw.close();
}

rmSync(PROFILE, { recursive: true, force: true });
check('sem erros de console', R.errors.length === 0, R.errors.slice(0, 2).join(' | '));
check('sem overflow / corte / sobreposição nas telas verificadas', R.layout.length === 0, R.layout.slice(0, 3).join(' | '));
mkdirSync(join(ROOT, 'dist/qa'), { recursive: true });
writeFileSync(join(ROOT, 'dist/qa', `persist-${W}.json`), JSON.stringify(R, null, 1));
const bad = Object.values(R.checks).filter((v) => v !== 'ok').length;
console.log(`RESUMO [${W}]: ${Object.keys(R.checks).length - bad}/${Object.keys(R.checks).length} ok; rodadas até haver lesão/suspensão: ${R.notes.rodadasAteLesaoOuSuspensao}`);
process.exit(failed ? 1 : 0);
