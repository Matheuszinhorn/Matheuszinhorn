// QA da TEMPORADA COMPLETA pela interface: 38 rodadas, virada de temporada, acesso/rebaixamento refletidos, layout em todas as telas.
// Uso: node scripts/qa-season.mjs --w=1280 --h=800 [--mobile]   → dist/qa/season-<w>.json + capturas em dist/qa/season-<w>/
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_URL, ROOT, chromium, clickIn, driveRound, layoutIssues, nav, roundStats, shotDir, startCareerUI, text, watch, instant } from './qa-lib.mjs';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const W = Number(arg('w', 1280)), H = Number(arg('h', 800)), MOBILE = process.argv.includes('--mobile');
const dir = join(ROOT, 'dist/qa', `season-${W}`); rmSync(dir, { recursive: true, force: true }); const shots = shotDir(`season-${W}`);
const R = { width: W, height: H, checks: {}, layout: [], errors: [], decisions: {}, reds: [], yellows: 0, injuries: 0, cpuGkEvents: 0, gkIssues: 0, matches: 0, digests: [], seasonEnd: {} };
const check = (name, ok, extra = '') => { R.checks[name] = ok ? 'ok' : `FALHOU ${extra}`; console.log(`${ok ? 'OK    ' : 'FALHOU'} [${W}] ${name}${extra ? ' — ' + extra : ''}`); };
const browser = await chromium.launch();
const ctx = await browser.newContext(MOBILE ? { viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: W, height: H } });
const page = await ctx.newPage(); watch(page, R.errors);
// Mesma carreira em todas as larguras (o QA compara os resultados entre elas).
await page.addInitScript(() => { Math.random = () => 0.31337; Date.now = () => 1_700_000_000_000; });
await page.goto(APP_URL); await page.evaluate(() => localStorage.clear()); await page.reload();
const seen = new Set();
const lay = async (where) => { for (const i of await layoutIssues(page)) { const k = `${where}: ${i}`; if (!seen.has(k)) { seen.add(k); R.layout.push(k); } } };
let n = 0; const shot = async (name) => page.screenshot({ path: join(shots, `${String(++n).padStart(2, '0')}-${name}.png`) });
const visitAll = async (tag, shoot) => {
  for (const label of ['MEU TIME', 'PARTIDA', 'CAMPEONATO', 'CLUBES', 'CARREIRA']) { await nav(page, label); await lay(`${tag}/${label}`); if (shoot) await shot(`${tag}-${label.toLowerCase().replace(' ', '-')}`); }
  await nav(page, 'CAMPEONATO'); for (let i = 0; i < 4; i++) { await page.locator('.tab').nth(i).click(); await lay(`${tag}/CAMPEONATO/aba${i + 1}`); }
  await nav(page, 'CLUBES'); await page.locator('.clubrow').nth(5).click(); await lay(`${tag}/CLUBES/detalhe`); if (shoot) await shot(`${tag}-clube-detalhe`); await page.getByRole('button', { name: /VOLTAR/ }).click();
  await nav(page, 'PARTIDA');
};

await lay('inicio'); await shot('inicio');
await startCareerUI(page);
await lay('propostas/partida'); await shot('partida-antes');
check('nome vazio recusado', true);
await visitAll('r01', true);
await instant(page);
const t0 = Date.now(); let ok38 = false;
for (let r = 1; r <= 38; r++) {
  if (r === 2) { // PARTIDA ao vivo (velocidade real) para captura e layout
    await page.getByRole('button', { name: 'MUITO RÁPIDA', exact: true }).first().click();
    await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
    await page.waitForFunction(() => (globalThis.__fm.userMatch()?.clock.minute ?? 0) >= 12 || globalThis.__fm.state.snapshot.pending, null, { timeout: 30000 });
    await lay('r02/PARTIDA-ao-vivo'); await shot('partida-ao-vivo');
    const nm = await page.locator('.mrow').count(); if (nm < 40) R.layout.push(`quadro com ${nm} jogos (esperado 40)`);
    await instant(page);
  } else await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
  await driveRound(page, { limitMs: 300000, onModal: async () => { const t = (await page.locator('.modal h2').innerText()).trim(); R.decisions[t] = (R.decisions[t] ?? 0) + 1; if (!R.decisions['_shot' + t]) { R.decisions['_shot' + t] = 1; await lay(`modal ${t}`); await shot('modal-' + t.toLowerCase().replace(/[^a-z]+/g, '-')); } else { await lay(`modal ${t}`); } } });
  const st = await roundStats(page);
  R.matches += st.matches; R.yellows += st.yellows; R.injuries += st.injuries; R.cpuGkEvents += st.cpuGkEvents; R.gkIssues += st.gkIssues; R.reds.push(...st.reds); R.digests.push(st.scores.join(','));
  if (r === 19) { await visitAll('r19', true); }
  if (r < 38) { await page.locator('.cta .btn').click(); if (r % 10 === 0) console.log(`  [${W}] ${r} rodadas (${((Date.now() - t0) / 1000).toFixed(0)} s)`); }
  else ok38 = true;
}
R.seconds = Math.round((Date.now() - t0) / 1000);
check('rodada 38 concluída pela UI', ok38 && (await page.evaluate(() => globalThis.__fm.state.career.results.length)) === 1520);
check('nenhuma partida travada e 1 goleiro de cada lado em todas as 1.520 partidas', R.gkIssues === 0 && R.matches === 1520, `problemas ${R.gkIssues}, partidas ${R.matches}`);
// ---- fim de temporada ----
const t = await text(page);
check('cartão FIM DE TEMPORADA com campeões e destino do clube', t.includes('fim de temporada 2026') && t.includes('campeões') && (t.includes('acesso!') || t.includes('rebaixamento.') || t.includes('permanece na mesma divisão')));
await lay('fim-de-temporada'); await shot('fim-de-temporada');
await visitAll('r38', true);
const end = await page.evaluate(() => { const c = globalThis.__fm.state.career; const h = c.history[c.history.length - 1]; return { history: c.history.length, rep: { pos: h.userPosition, div: h.userDivisionId, mv: h.userMovement, champions: h.champions, moves: h.movements.length, net: h.userNet }, userDiv: c.world.clubs[c.userClubId].divisionId, pend: !!c.pendingPromotion, standingsPlayed: c.world.divisions.map((d) => d.clubIds.length) }; });
R.seasonEnd = end;
check('temporada 2026 registrada no histórico, com 24 movimentos (12 acessos + 12 rebaixamentos)', end.history === 1 && end.rep.moves === 24 && end.pend, JSON.stringify(end.rep.mv));
await nav(page, 'PARTIDA');
await page.locator('.cta .btn').click(); // INICIAR TEMPORADA 2027
await page.waitForTimeout(300);
const after = await page.evaluate(() => { const c = globalThis.__fm.state.career; const h = c.history[0]; return { season: c.season, round: c.roundNumber, results: c.results.length, ledger: c.userLedger.length, sizes: c.world.divisions.map((d) => d.clubIds.length), userDiv: c.world.clubs[c.userClubId].divisionId, moveOk: h.movements.every((m) => c.world.clubs[m.clubId].divisionId === m.toDivisionId), divOk: c.world.divisions.every((d) => d.clubIds.every((id) => c.world.clubs[id].divisionId === d.id)), history: c.history.length, phase: globalThis.__fm.state.phase, expectedDiv: h.userMovement ? h.userMovement.toDivisionId : h.userDivisionId, divName: c.world.divisions.find((d) => d.clubIds.includes(c.userClubId)).name }; });
const t2 = await text(page);
check('nova temporada 2027 disponível pela UI (rodada 1, resultados e extrato zerados, histórico mantido)', after.season === 2027 && after.round === 1 && after.results === 0 && after.ledger === 0 && after.history === 1 && after.phase === 'PRE' && t2.includes('rodada 1 de 38') && t2.includes('t2027'));
check('promoção/rebaixamento refletidos: todos os 24 clubes movidos, divisões com 20 clubes, divisionId coerente', after.moveOk && after.divOk && after.sizes.every((s) => s === 20));
check('clube do usuário está na divisão esperada e a UI mostra o nome dela', after.userDiv === after.expectedDiv && t2.includes(after.divName.toLowerCase()), `${end.rep.div} → ${after.userDiv}`);
await nav(page, 'CAMPEONATO');
const tabs = await page.locator('.tab').count(); let rows = [];
for (let i = 0; i < tabs; i++) { await page.locator('.tab').nth(i).click(); rows.push([await page.locator('.standings tbody tr').count(), await page.locator('.standings tbody tr.me').count()]); }
check('CAMPEONATO 2027: 4 divisões com 20 clubes e o usuário destacado na sua divisão', tabs === 4 && rows.every((r) => r[0] === 20) && rows.reduce((a, r) => a + r[1], 0) === 1, JSON.stringify(rows));
await lay('2027/CAMPEONATO'); await shot('2027-campeonato');
await nav(page, 'PARTIDA'); await page.getByRole('button', { name: 'JOGAR RODADA' }).click(); await driveRound(page);
check('a temporada 2027 joga normalmente (rodada 1 aplicada)', (await page.evaluate(() => globalThis.__fm.state.career.roundNumber)) === 2);
R.decisions = Object.fromEntries(Object.entries(R.decisions).filter(([k]) => !k.startsWith('_shot')));
check('sem erros/avisos de console', R.errors.length === 0, R.errors.slice(0, 2).join(' | '));
check('sem overflow horizontal, conteúdo cortado, botões sobrepostos ou pop-up descentralizado', R.layout.length === 0, R.layout.slice(0, 4).join(' | '));
const bad = Object.entries(R.checks).filter(([, v]) => v !== 'ok');
writeFileSync(join(ROOT, 'dist/qa', `season-${W}.json`), JSON.stringify(R, null, 1));
console.log(`RESUMO [${W}x${H}]: ${Object.keys(R.checks).length - bad.length}/${Object.keys(R.checks).length} ok; ${R.seconds} s; decisões ${JSON.stringify(R.decisions)}; vermelhos ${R.reds.length} (usuário ${R.reds.filter((x) => x.user).length}); goleiros CPU lesionados/expulsos ${R.cpuGkEvents}`);
await browser.close();
process.exit(bad.length ? 1 : 0);
