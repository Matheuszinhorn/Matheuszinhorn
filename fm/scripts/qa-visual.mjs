// QA visual/UX (ETAPA 9) nas 6 larguras: início (sem save, save corrompido, save inválido), PARTIDA (antes, ao vivo, resultado,
// fim de temporada), pop-ups (MEU TIME, pênalti, lesão, expulsão, goleiro lesionado com/sem reserva, goleiro expulso),
// MEU TIME, CAMPEONATO (4 abas), CLUBES (+detalhe), CARREIRA. Em cada tela: layout (overflow, corte, sobreposição, pop-up
// centralizado), texto (palavra partida, aba cortada) e console. Capturas em dist/qa/visual/<largura>/.
// Uso: node scripts/qa-visual.mjs [--only=360,1280]
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { APP_URL, ROOT, SAVE_KEY, chromium, clickIn, driveRound, layoutIssues, nav, shotDir, startCareerUI, textIssues, watch } from './qa-lib.mjs';
const { careerOffers, createCareer, finishRound, planRound, serializeCareer, ROUNDS_PER_SEASON } = await import('../game/career.ts');
const { createRound, roundResults, simulateRound } = await import('../engine/index.ts');

const ONLY = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean).map(Number);
const VPS = [[360, 780, 1], [390, 844, 1], [412, 915, 1], [1280, 720, 0], [1440, 900, 0], [1920, 1080, 0]].filter(([w]) => !ONLY.length || ONLY.includes(w));
const save = (seed) => serializeCareer(createCareer({ seed, coachName: 'QA Visual', clubId: careerOffers(seed)[0] }));
// cenários determinísticos das etapas 4/5 (primeira decisão do jogador na rodada 1)
const DECISIONS = { penalti: save('qa-vel-1'), expulsao: save('qa-vel-2'), lesao: save('qa-vel-9'), 'gk-lesionado': save('qa-vel-706'), 'gk-expulso': save('qa-vel-1643') };
const noRes = join(ROOT, 'dist/qa/scenarios/goleiro-lesionado-sem-reserva.json');
if (existsSync(noRes)) DECISIONS['gk-lesionado-sem-reserva'] = JSON.parse(readFileSync(noRes, 'utf8')).save;
let seasonEnd; { let c = createCareer({ seed: 'qa-visual-fim', coachName: 'QA Visual', clubId: careerOffers('qa-visual-fim')[0] }); while (c.roundNumber <= ROUNDS_PER_SEASON) { const p = planRound(c); c = finishRound(c, roundResults(simulateRound(createRound(p.roundId, p.seed, p.fixtures, null)))).career; } seasonEnd = serializeCareer(c); }
const BAD = { 'save-corrompido': '{ruim', 'save-clube-inexistente': JSON.stringify({ ...JSON.parse(DECISIONS.penalti), userClubId: 'clb-nao-existe' }) };

rmSync(join(ROOT, 'dist/qa/visual'), { recursive: true, force: true });
const browser = await chromium.launch(); const summary = {}; let failed = false;
for (const [w, h, mobile] of VPS) {
  const dir = shotDir('visual', String(w)); const errors = []; const issues = []; let n = 0;
  const opts = mobile ? { viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: w, height: h } };
  const ctx = await browser.newContext(opts);
  const open = async (saveStr) => { const page = await ctx.newPage(); watch(page, errors); await page.goto(APP_URL); await page.evaluate(([k, v]) => { localStorage.clear(); if (v !== null) localStorage.setItem(k, v); }, [SAVE_KEY, saveStr]); await page.reload(); return page; };
  const check = async (page, where, shotName = where) => { for (const i of await layoutIssues(page)) issues.push(`${where}: ${i}`); for (const i of await textIssues(page)) issues.push(`${where}: ${i}`); await page.screenshot({ path: join(dir, `${String(++n).padStart(2, '0')}-${shotName}.png`) }); };
  const go = async (page) => { await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click(); await page.waitForSelector('.topbar'); };

  // ---- início: sem save, saves ruins, propostas ----
  let page = await open(null); await check(page, 'inicio-sem-save');
  await page.getByRole('button', { name: 'RECEBER PROPOSTAS DE CLUBE' }).click(); await check(page, 'inicio-nome-vazio');
  await page.fill('input[type=text]', 'QA Visual'); await page.getByRole('button', { name: 'RECEBER PROPOSTAS DE CLUBE' }).click(); await check(page, 'propostas');
  await page.close();
  for (const [name, raw] of Object.entries(BAD)) {
    page = await open(raw); await check(page, name);
    if (await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).count()) { await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click(); await page.waitForTimeout(150); await check(page, `${name}-continuar`); }
    await page.close();
  }

  // ---- carreira: PARTIDA antes / abas / ao vivo / MEU TIME pop-up / resultado ----
  page = await open(DECISIONS.penalti); await go(page);
  await check(page, 'partida-pre');
  await nav(page, 'MEU TIME'); await check(page, 'meu-time');
  await nav(page, 'CAMPEONATO'); for (let i = 0; i < 4; i++) { await page.locator('.tab').nth(i).click(); await check(page, `campeonato-div${i + 1}`); }
  await nav(page, 'CLUBES'); await check(page, 'clubes'); await page.locator('.clubrow').nth(3).click(); await check(page, 'clube-detalhe');
  await nav(page, 'CARREIRA'); await check(page, 'carreira');
  await nav(page, 'PARTIDA');
  await page.getByRole('button', { name: 'MUITO RÁPIDA', exact: true }).click(); await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
  await page.waitForFunction(() => (globalThis.__fm.userMatch()?.clock.minute ?? 0) >= 14, null, { timeout: 30000 });
  await clickIn(page, '.controls', 'PAUSAR'); await check(page, 'partida-ao-vivo');
  await clickIn(page, '.controls', 'MEU TIME', true); await page.waitForSelector('.modal'); await check(page, 'popup-meu-time'); await clickIn(page, '.modal footer', 'CANCELAR');
  await clickIn(page, '.controls', 'CONTINUAR', true);
  await page.getByRole('button', { name: 'INSTANTÂNEA', exact: true }).first().click().catch(() => {});
  await driveRound(page, { policy: 'suggest' }); await check(page, 'partida-resultado');
  await page.close();

  // ---- pop-ups de decisão ----
  for (const [name, s] of Object.entries(DECISIONS)) {
    page = await open(s); await go(page);
    await page.getByRole('button', { name: 'INSTANTÂNEA', exact: true }).first().click();
    await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
    await page.waitForSelector('.modal-back', { timeout: 20000 });
    await check(page, `popup-${name}`);
    // clicar fora / ESC não fecha (decisão continua pausando)
    await page.mouse.click(4, 4); await page.keyboard.press('Escape');
    if (!(await page.locator('.modal-back').count())) issues.push(`popup-${name}: fechou ao clicar fora/ESC`);
    await page.close();
  }

  // ---- fim de temporada ----
  page = await open(seasonEnd); await go(page); await check(page, 'fim-de-temporada');
  await nav(page, 'CAMPEONATO'); await check(page, 'fim-campeonato');
  await page.close();

  summary[w] = { issues: [...new Set(issues)], errors };
  console.log(`${issues.length + errors.length === 0 ? 'OK    ' : 'FALHOU'} ${w}px: ${new Set(issues).size} problemas, ${errors.length} erros de console, ${n} capturas${issues.length ? '\n   ' + [...new Set(issues)].slice(0, 12).join('\n   ') : ''}${errors.length ? '\n   ' + errors[0] : ''}`);
  if (issues.length || errors.length) failed = true;
  await ctx.close();
}
writeFileSync(join(ROOT, 'dist/qa/visual-summary.json'), JSON.stringify(summary, null, 1));
await browser.close(); process.exit(failed ? 1 : 0);
