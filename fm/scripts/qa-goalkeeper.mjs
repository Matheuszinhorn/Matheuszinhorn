// QA de interface dos casos de goleiro (Fase G). Pré-requisito: node scripts/qa-scenarios.mjs.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_URL, ROOT, SAVE_KEY, chromium, clickIn, driveRound, layoutIssues, roundStats, shotDir, startCareerUI, watch } from './qa-lib.mjs';
const { effectiveStrength, DEFAULT_CONFIG } = await import('../engine/index.ts');
const dir = shotDir('goalkeeper');

const cases = {
  'goleiro-lesionado-com-reserva': { title: 'GOLEIRO LESIONADO', act: async (page) => { await page.locator('.modal .prow').first().click(); await clickIn(page, '.modal footer', 'CONFIRMAR SUBSTITUIÇÃO'); } },
  'goleiro-lesionado-sem-reserva': { title: 'GOLEIRO LESIONADO', needText: 'sem goleiro reserva', act: (page) => clickIn(page, '.modal footer', 'CONTINUAR', true) },
  'goleiro-expulso': { title: 'GOLEIRO EXPULSO', act: (page) => clickIn(page, '.modal footer', 'ACEITAR SUGESTÃO') },
};
let failed = false;
const browser = await chromium.launch();
for (const [name, spec] of Object.entries(cases)) {
  const scenario = JSON.parse(readFileSync(join(ROOT, 'dist/qa/scenarios', `${name}.json`), 'utf8'));
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errors = []; watch(page, errors);
  await page.goto(APP_URL);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, scenario.save]);
  await page.reload();
  await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click();
  await page.locator('.seg-btn', { hasText: 'INSTANTÂNEA' }).first().click();
  await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
  const notes = []; let ok = true; const fail = (m) => { ok = false; notes.push('✗ ' + m); };
  try {
    await page.waitForSelector('.modal-back', { timeout: 20000 });
    const title = (await page.locator('.modal h2').innerText()).trim();
    if (title !== spec.title) fail(`título "${title}" ≠ "${spec.title}"`); else notes.push(`pop-up "${title}"`);
    if (spec.needText && !(await page.locator('.modal').innerText()).toLowerCase().includes(spec.needText)) fail('faltou explicação: ' + spec.needText);
    const before = await page.evaluate(() => { const c = globalThis.__fm; const s = c.state.snapshot; const m = c.pendingMatch(); const d = s.pending.decision; const t = m[d.side]; return { status: s.status, id: d.id, type: d.type, injured: d.playerId, benchGKs: t.bench.filter((id) => t.players[id].position === 'GK'), clocks: s.round.matches.map((x) => `${x.clock.half}:${x.clock.minute}:${x.clock.added}`), minute: m.clock.minute }; });
    if (before.status !== 'AWAITING_DECISION') fail('partida deveria estar pausada aguardando decisão');
    const lay = await layoutIssues(page); if (lay.length) fail('layout do pop-up: ' + lay.join('; '));
    await page.screenshot({ path: join(dir, `${name}.png`) });
    await page.waitForTimeout(800);
    const still = await page.evaluate(() => globalThis.__fm.state.snapshot.round.matches.map((x) => `${x.clock.half}:${x.clock.minute}:${x.clock.added}`));
    if (JSON.stringify(still) !== JSON.stringify(before.clocks)) fail('o relógio andou com a decisão pendente');
    await spec.act(page);
    await page.waitForTimeout(150);
    const after = await page.evaluate((b) => { const c = globalThis.__fm; const m = c.userMatch(); const side = m.home.clubId === c.state.career.userClubId ? 'home' : 'away'; const t = m[side]; const gk = t.onField.filter((s) => s.sector === 'GK'); const occ = gk.length === 1 ? t.players[gk[0].playerId] : null; return { gkSlots: gk.length, occ, injuredOnField: t.onField.some((s) => s.playerId === b.injured), onField: t.onField.length, pending: c.state.snapshot.pending?.decision.id ?? null, sentOff: t.sentOff.includes(b.injured), injuredList: t.injured.includes(b.injured), status: c.state.snapshot.status }; }, before);
    if (after.gkSlots !== 1) fail(`goleiros em campo: ${after.gkSlots}`);
    if (after.injuredOnField) fail('o jogador lesionado/expulso continua em campo');
    if (after.pending === before.id) fail('a decisão continuou pendente');
    const hadGk = before.benchGKs.length > 0;
    if (name === 'goleiro-lesionado-com-reserva' || (name === 'goleiro-expulso' && hadGk)) { if (after.occ?.position !== 'GK' || !before.benchGKs.includes(after.occ.id)) fail('o goleiro reserva deveria assumir o gol'); else notes.push(`reserva ${after.occ.name} (GK) assumiu o gol; lesionado/expulso fora`); }
    else { if (after.occ?.position === 'GK') fail('sem goleiro reserva: jogador de linha deveria assumir o gol'); else { const eff = effectiveStrength(after.occ, 'GK', DEFAULT_CONFIG); notes.push(`sem reserva GK: ${after.occ.name} (${after.occ.position}, força ${after.occ.strength}) no gol; força efetiva ${eff.toFixed(1)} (fator ${(eff / after.occ.strength).toFixed(2)}, esperado ${DEFAULT_CONFIG.positionFactor.goal})`); if (Math.abs(eff / after.occ.strength - DEFAULT_CONFIG.positionFactor.goal) > 0.02) fail('fator de fora de posição não é o do engine'); } }
    notes.push(`${after.onField} em campo após a decisão; 1 goleiro`);
    await driveRound(page, { policy: 'suggest' });
    const st = await roundStats(page);
    if (st.matches !== 40 || st.gkIssues !== 0) fail(`ao fim: partidas ${st.matches}, problemas de goleiro/estado ${st.gkIssues}`); else notes.push('rodada terminou: 40 partidas encerradas, 1 goleiro de cada lado em todas');
    if ((await page.evaluate(() => globalThis.__fm.state.career.roundNumber)) !== 2) fail('rodada não aplicada à carreira'); else notes.push('rodada aplicada (partida continuou após a decisão)');
  } catch (e) { fail('exceção: ' + String(e).split('\n')[0]); }
  if (errors.length) fail('console: ' + errors.join(' | ').slice(0, 200));
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${name}\n   ${notes.join('\n   ')}`);
  if (!ok) failed = true;
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
