// QA de velocidades e de MEU TIME durante a partida. Usa o cenário determinístico "goleiro lesionado com reserva"
// (o minuto da decisão vem do próprio cenário gerado por qa-scenarios.mjs; hoje, 62').
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_URL, ROOT, SAVE_KEY, chromium, clickIn, driveRound, layoutIssues, nav, roundStats, shotDir, watch, instant, untilDecision } from './qa-lib.mjs';

const scenario = JSON.parse(readFileSync(join(ROOT, 'dist/qa/scenarios/goleiro-lesionado-com-reserva.json'), 'utf8'));
const dir = shotDir('live');
const out = { speeds: {}, myTeam: {} };
let failed = false;
const browser = await chromium.launch();
const openCareer = async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errors = []; watch(page, errors);
  await page.goto(APP_URL);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, scenario.save]);
  await page.reload();
  await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click();
  await page.waitForSelector('.topbar');
  return { ctx, page, errors };
};
const clocks = (page) => page.evaluate(() => globalThis.__fm.state.snapshot.round.matches.map((x) => `${x.clock.half}:${x.clock.minute}:${x.clock.added}`).join(','));

// ---------- 1. VELOCIDADES ----------
const SPEEDS = [['LENTA', 1000], ['NORMAL', 500], ['RÁPIDA', 250], ['MUITO RÁPIDA', 100], ['INSTANTÂNEA', 0]];
const digests = {};
for (const [label, interval] of SPEEDS) {
  const { ctx, page, errors } = await openCareer();
  const notes = []; let ok = true; const fail = (m) => { ok = false; notes.push('✗ ' + m); };
  if (interval === 0) await instant(page); else await page.getByRole('button', { name: label, exact: true }).click();
  const t0 = Date.now();
  await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
  await untilDecision(page, 120000); // lances do adversário antes dos 36' também param (CONTINUAR)
  const elapsed = Date.now() - t0;
  const info = await page.evaluate(() => { const c = globalThis.__fm; const m = c.userMatch(); const d = c.state.snapshot.pending.decision; return { minute: d.createdAt.minute, half: d.createdAt.half, status: c.state.snapshot.status, type: c.state.snapshot.pending.decision.type, speed: c.state.snapshot.speed }; });
  const want = scenario.decision.minute; const wantHalf = want > 45 ? 2 : 1;
  const lo = interval === 0 ? 0 : 0.8 * (want - 1) * interval, hi = interval === 0 ? 8000 : 1.7 * (want + 1) * interval + 3000;
  if (elapsed < lo || elapsed > hi) fail(`tempo até a decisão ${elapsed} ms fora de [${lo}, ${hi}]`); else notes.push(`decisão aos ${info.minute}' após ${(elapsed / 1000).toFixed(1)} s`);
  if (info.status !== 'AWAITING_DECISION' || info.type !== 'INJURY_SUBSTITUTION') fail('não parou na decisão de lesão');
  if (info.minute !== want || info.half !== wantHalf) fail(`decisão criada em ${info.half}T ${info.minute}' (esperado ${wantHalf}T ${want}' igual em todas as velocidades)`);
  // Tentativas de ultrapassar a decisão: velocidade instantânea, retomar, play.
  const before = await clocks(page);
  const attempt = await page.evaluate(() => { const c = globalThis.__fm; const r = []; for (const f of [() => c.setSpeed('INSTANT'), () => c.resume(), () => c.session.play(), () => c.pause(), () => c.resume()]) { try { f(); r.push('ok'); } catch (e) { r.push('lançou:' + e.code); } } return r; });
  await page.waitForTimeout(1200);
  const stillPending = await page.evaluate(() => globalThis.__fm.state.snapshot.status);
  if (stillPending !== 'AWAITING_DECISION' || (await clocks(page)) !== before) fail('a decisão pendente foi ultrapassada!'); else notes.push(`tentativas de ultrapassar (${attempt.join(',')}) não moveram o relógio`);
  await page.evaluate((s) => globalThis.__fm.setSpeed(s), Object.fromEntries([['LENTA', 'SLOW'], ['NORMAL', 'NORMAL'], ['RÁPIDA', 'FAST'], ['MUITO RÁPIDA', 'VERY_FAST'], ['INSTANTÂNEA', 'INSTANT']])[label]);
  // resolve pela tela e vê o relógio voltar a andar
  await clickIn(page, '.modal footer', 'ACEITAR SUGESTÃO');
  if (interval > 0) { await page.waitForFunction(() => globalThis.__fm.userMatch().clock.minute > 36 || globalThis.__fm.userMatch().clock.half === 2 || globalThis.__fm.state.snapshot.pending, null, { timeout: 8000 }).then(() => notes.push('partida continuou após resolver')).catch(() => fail('partida não continuou após resolver')); await instant(page); }
  await driveRound(page, { policy: 'suggest' });
  const st = await roundStats(page);
  if (st.gkIssues !== 0) fail('problemas de goleiro/estado ao fim');
  digests[label] = await page.evaluate(() => { const r = globalThis.__fm.state.snapshot.round; return JSON.stringify(r.matches.map((m) => [m.matchId, m.score.home, m.score.away, m.events.filter((e) => e.type !== 'STOPPAGE').map((e) => `${e.clock.half}${e.clock.minute}+${e.clock.added}${e.type}${e.side}${e.playerId}`).join('|')])); });
  if (errors.length) fail('console: ' + errors.slice(0, 2).join(' | '));
  out.speeds[label] = { ok, notes };
  console.log(`${ok ? 'OK    ' : 'FALHOU'} velocidade ${label}: ${notes.join(' ; ')}`);
  if (!ok) failed = true;
  await ctx.close();
}
const same = new Set(Object.values(digests)).size === 1;
console.log(`${same ? 'OK    ' : 'FALHOU'} resultado idêntico nas 5 velocidades (placares e todos os eventos das 40 partidas): ${same ? 'sim' : 'NÃO'}`);
if (!same) failed = true;
out.identicalAcrossSpeeds = same;

// ---------- 2. MEU TIME DURANTE A PARTIDA ----------
{
  const { ctx, page, errors } = await openCareer();
  const notes = []; let ok = true; const fail = (m) => { ok = false; notes.push('✗ ' + m); };
  await page.getByRole('button', { name: 'MUITO RÁPIDA', exact: true }).click();
  await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
  await page.waitForFunction(() => (globalThis.__fm.userMatch()?.clock.minute ?? 0) >= 8, null, { timeout: 30000 });
  await clickIn(page, '.controls', 'PAUSAR');
  const paused = await page.evaluate(() => globalThis.__fm.state.snapshot.status);
  if (paused !== 'PAUSED') fail('PAUSAR não pausou'); else notes.push('pausou');
  const m0 = await clocks(page);
  await nav(page, 'MEU TIME');
  const chipsDisabled = await page.evaluate(() => [...document.querySelectorAll('.chip')].every((c) => c.disabled));
  const hasNote = (await page.evaluate(() => document.body.innerText.toLowerCase())).includes('rodada em andamento');
  if (!chipsDisabled || !hasNote) fail('aba MEU TIME durante a rodada deveria ser somente leitura com aviso'); else notes.push('aba MEU TIME durante a rodada: somente leitura + aviso');
  await page.screenshot({ path: join(dir, 'meu-time-durante-partida.png') });
  await nav(page, 'PARTIDA');
  await clickIn(page, '.controls', 'MEU TIME', true);
  await page.waitForSelector('.modal');
  const pre = await page.evaluate(() => { const c = globalThis.__fm; const m = c.userMatch(); const side = m.home.clubId === c.state.career.userClubId ? 'home' : 'away'; const t = m[side]; const cnt = (s) => t.onField.filter((x) => x.sector === s).length; return { side, form: `${cnt('DEF')}-${cnt('MID')}-${cnt('ATT')}`, style: t.style, behavior: t.behavior, subs: t.subsUsed }; });
  await page.locator('.modal .seg').nth(0).getByRole('button', { name: 'Defensivo' }).click();
  await page.locator('.modal .seg').nth(1).getByRole('button', { name: 'Agressivo' }).click();
  const target = await page.locator('.modal .pill:not(.on)').first().innerText();
  await page.locator('.modal .pill:not(.on)').first().click();
  // troca de posições entre dois atacantes/meias do fim da lista; substituição de um defensor
  const optsA = await page.locator('.modal select[aria-label=a] option').allInnerTexts();
  const nA = optsA.length;
  await page.locator('.modal select[aria-label=a]').selectOption({ index: nA - 1 });
  await page.locator('.modal select[aria-label=b]').selectOption({ index: nA - 2 });
  await clickIn(page, '.modal', 'TROCAR POSIÇÕES');
  const outs = await page.locator('.modal select[aria-label=sai] option').allInnerTexts();
  const ins = await page.locator('.modal select[aria-label=entra] option').allInnerTexts();
  const outIdx = outs.findIndex((t, i) => i > 0 && !t.startsWith('GOL')); const inIdx = ins.findIndex((t, i) => i > 0 && !t.startsWith('GOL'));
  await page.locator('.modal select[aria-label=sai]').selectOption({ index: outIdx });
  await page.locator('.modal select[aria-label=entra]').selectOption({ index: inIdx });
  await clickIn(page, '.modal', 'TROCAR', true);
  const lay = await layoutIssues(page); if (lay.length) fail('layout do pop-up MEU TIME: ' + lay.join('; '));
  await page.screenshot({ path: join(dir, 'modal-meu-time-completo.png') });
  await clickIn(page, '.modal footer', 'CONTINUAR', true);
  await page.waitForTimeout(200);
  const post = await page.evaluate((pre) => { const c = globalThis.__fm; const m = c.userMatch(); const t = m[pre.side]; const cnt = (s) => t.onField.filter((x) => x.sector === s).length; return { form: `${cnt('DEF')}-${cnt('MID')}-${cnt('ATT')}`, style: t.style, behavior: t.behavior, subs: t.subsUsed, field: t.onField.length, gk: cnt('GK'), toast: c.state.toast?.text ?? null, status: c.state.snapshot.status, modal: !!document.querySelector('.modal') }; }, pre);
  if (post.toast) fail('aviso de erro: ' + post.toast);
  if (post.style !== 'DEFENSIVE' || post.behavior !== 'AGGRESSIVE') fail(`tática não aplicada (${post.style}/${post.behavior})`);
  if (post.form !== target) fail(`formação ${post.form} ≠ ${target}`);
  if (post.subs !== pre.subs + 1) fail(`substituições ${post.subs} (esperado ${pre.subs + 1})`);
  if (post.field !== 11 || post.gk !== 1) fail(`em campo ${post.field}, goleiros ${post.gk}`);
  if (post.modal) fail('pop-up não fechou');
  if (ok) notes.push(`aplicado: ${pre.form}→${post.form}, estilo ${post.style}, comportamento ${post.behavior}, 1 troca, troca de posições, 11 em campo, 1 goleiro`);
  if (post.status === 'PAUSED') { await clickIn(page, '.controls', 'CONTINUAR', true); }
  await page.waitForTimeout(900);
  const m1 = await page.evaluate(() => globalThis.__fm.userMatch().clock.minute);
  if (m1 <= 8) fail('a partida não continuou depois do MEU TIME'); else notes.push(`partida continuou (minuto ${m1}')`);
  // CANCELAR não altera nada
  await clickIn(page, '.controls', 'PAUSAR');
  await clickIn(page, '.controls', 'MEU TIME', true);
  await page.waitForSelector('.modal');
  await page.locator('.modal .seg').nth(0).getByRole('button', { name: 'Ofensivo' }).click();
  await clickIn(page, '.modal footer', 'CANCELAR');
  const st2 = await page.evaluate((pre) => globalThis.__fm.userMatch()[pre.side].style, pre);
  if (st2 !== 'DEFENSIVE') fail('CANCELAR alterou o estilo'); else notes.push('CANCELAR não altera o time');
  await clickIn(page, '.controls', 'CONTINUAR', true).catch(() => {});
  await instant(page);
  await driveRound(page, { policy: 'suggest' });
  const st = await roundStats(page);
  if (st.gkIssues !== 0) fail('estado inconsistente ao fim da rodada'); else notes.push('rodada terminou íntegra (40 encerradas, 1 goleiro de cada lado)');
  if (errors.length) fail('console: ' + errors.slice(0, 2).join(' | '));
  out.myTeam = { ok, notes };
  console.log(`${ok ? 'OK    ' : 'FALHOU'} MEU TIME durante a partida: ${notes.join(' ; ')}`);
  if (!ok) failed = true;
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
