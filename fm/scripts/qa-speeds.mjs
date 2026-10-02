// QA da ETAPA 5 — velocidades e decisões, SÓ pela interface (cliques e leitura da tela).
// Uso: node scripts/qa-speeds.mjs [--w=1280 --h=800 | --w=390 --h=844 --mobile]  → dist/qa/speeds-<w>.json + capturas
//
// 1. Cenários determinísticos (carreira nova na D4, rodada 1) cuja PRIMEIRA decisão do jogador é: pênalti, lesão, expulsão,
//    goleiro lesionado, goleiro expulso, e um com FILA (2+ decisões no mesmo minuto).
// 2. Cada cenário roda nas 5 velocidades com o relógio falso do Playwright (os setTimeout reais da sessão, com os
//    intervalos de cada velocidade, avançados à mão). A mesma política de decisão (escolhas DIFERENTES da sugestão) é
//    aplicada em todas; o cenário de pênalti roda também com "ACEITAR SUGESTÃO".
// 3. Em cada decisão: pop-up único, relógio parado mesmo com o tempo correndo, ESC/clique fora não fecham, comando aceito,
//    decisão limpa, partida retoma. Resultado (placar, eventos, minutos, decisões, comandos) comparado entre velocidades.
// 4. Tempo real (sem relógio falso): o relógio de jogo anda na proporção de cada velocidade.
// 5. MEU TIME durante a partida e durante uma decisão (fluxo existente; só teste).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_URL, ROOT, SAVE_KEY, chromium, clickIn, layoutIssues, shotDir, watch, instant } from './qa-lib.mjs';
const { careerOffers, createCareer, planRound, serializeCareer } = await import('../game/career.ts');
const { awaitingMatch, createRound, stepRound } = await import('../engine/index.ts');
const { SPEEDS, SPEED_ORDER } = await import('../game/session.ts');

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const W = Number(arg('w', 1280)), H = Number(arg('h', 800)), MOBILE = process.argv.includes('--mobile');
const ctxOpts = MOBILE ? { viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: W, height: H } };
const dir = shotDir(`speeds-${W}`);
const LABEL = Object.fromEntries(SPEED_ORDER.map((s) => [s, SPEEDS[s].label]));
/** Escolhe a velocidade pela tela (LENTA, NORMAL, RÁPIDA); MUITO RÁPIDA e INSTANTÂNEA só pelo controlador (QA). */
const pickSpeed = (page, speed) => (['INSTANT', 'VERY_FAST'].includes(speed) ? page.evaluate((id) => globalThis.__fm.setSpeed(id), speed) : page.getByRole('button', { name: LABEL[speed], exact: true }).first().click());
/** O pop-up aberto é uma parada obrigatória (intervalo/lance), não uma decisão do engine. */
const isStop = (page) => page.evaluate(() => { const s = globalThis.__fm.state.snapshot; return !!s.stop && s.status === 'PAUSED'; });
const R = { width: W, checks: {}, scenarios: {}, realtime: {}, meuTime: {}, errors: [], layout: [] };
let failed = false;
const check = (name, ok, extra = '') => { R.checks[name] = ok ? 'ok' : `FALHOU ${extra}`; if (!ok) failed = true; console.log(`${ok ? 'OK    ' : 'FALHOU'} ${name}${extra && !ok ? ' — ' + extra : ''}`); };

// ---------- 1. cenários (Node, mesmo código do jogo) ----------
function firstDecision(career) {
  const plan = planRound(career);
  const fx = plan.fixtures.find((f) => f.matchId === plan.userMatchId);
  let round = createRound(plan.roundId, plan.seed, [fx], plan.controlledClubId);
  for (let g = 0; g < 400; g++) {
    const m = awaitingMatch(round);
    if (m) { const d = m.decision; const t = m[d.side]; return { type: d.type, gk: d.playerId ? t.vacated[d.playerId]?.sector === 'GK' : false, reserveGk: t.bench.some((id) => t.players[id].position === 'GK'), queue: m.decisionQueue.length, minute: d.createdAt.minute }; }
    if (round.matches.every((x) => x.status === 'FINISHED')) return null;
    round = stepRound(round);
  }
  return null;
}
const wants = {
  penalti: (d) => d.type === 'PENALTY_TAKER' && d.queue === 0,
  lesao: (d) => d.type === 'INJURY_SUBSTITUTION' && !d.gk && d.queue === 0,
  expulsao: (d) => d.type === 'RED_CARD_ADJUSTMENT' && !d.gk && d.queue === 0,
  'gk-lesionado': (d) => d.type === 'INJURY_SUBSTITUTION' && d.gk && d.reserveGk,
  'gk-expulso': (d) => d.type === 'RED_CARD_ADJUSTMENT' && d.gk && d.reserveGk,
  fila: (d) => d.queue >= 1,
};
const scen = {};
const t0 = Date.now();
for (let i = 0; i < 40000 && Object.keys(scen).length < Object.keys(wants).length; i++) {
  const seed = `qa-vel-${i}`;
  const career = createCareer({ seed, coachName: 'QA Velocidade', clubId: careerOffers(seed)[0] });
  const d = firstDecision(career);
  if (d) for (const [k, want] of Object.entries(wants)) if (!scen[k] && want(d)) scen[k] = { seed, first: d, save: serializeCareer(career) };
}
console.log(`cenários: ${Object.entries(scen).map(([k, v]) => `${k}=${v.seed}(${v.first.type}@${v.first.minute}'${v.first.queue ? ` fila+${v.first.queue}` : ''})`).join(' ')} — ${((Date.now() - t0) / 1000).toFixed(0)} s`);
check('6 cenários de decisão encontrados (pênalti, lesão, expulsão, GK lesionado, GK expulso, fila)', Object.keys(scen).length === 6, Object.keys(scen).join(','));

// ---------- helpers de navegador ----------
const browser = await chromium.launch();
const clocks = (page) => page.evaluate(() => globalThis.__fm.state.snapshot.round.matches.map((m) => `${m.clock.half}:${m.clock.minute}:${m.clock.added}:${m.status}`).join('|'));
const pend = (page) => page.evaluate(() => { const s = globalThis.__fm.state.snapshot; const m = globalThis.__fm.pendingMatch(); return { status: s.status, id: s.pending?.decision.id ?? null, type: s.pending?.decision.type ?? null, queue: m ? m.decisionQueue.length : 0, minute: m ? m.clock.minute : null, createdAt: s.pending?.decision.createdAt.minute ?? null }; });
/** Só os relógios (sem o status da partida, que muda para AWAITING_DECISION quando o pop-up abre). */
const onlyClocks = (page) => page.evaluate(() => globalThis.__fm.state.snapshot.round.matches.map((m) => `${m.clock.half}:${m.clock.minute}:${m.clock.added}`).join('|'));
const userMinute = (page) => page.evaluate(() => { const m = globalThis.__fm.userMatch(); return m ? m.clock.minute + (m.clock.half === 2 ? 0 : 0) : null; });
const sessionStatus = (page) => page.evaluate(() => globalThis.__fm.state.snapshot.status);
const finished = async (page) => (await page.locator('.cta .btn').count()) > 0;

/** Resolve o pop-up aberto. policy 'choice' = escolhas diferentes da sugestão; 'suggest' = ACEITAR SUGESTÃO. */
async function resolve(page, policy) {
  const title = (await page.locator('.modal h2').innerText()).trim();
  const footer = page.locator('.modal footer');
  const has = async (n) => (await footer.getByRole('button', { name: n, exact: true }).count()) > 0;
  if (policy === 'suggest' && await has('ACEITAR SUGESTÃO')) { await clickIn(page, '.modal footer', 'ACEITAR SUGESTÃO', true); return `${title}: sugestão`; }
  if (title.startsWith('PÊNALTI')) { const rows = page.locator('.modal .prow:not(:has(.badge))'); const n = await rows.count(); const row = n ? rows.last() : page.locator('.modal .prow').last(); const who = (await row.locator('.prow-name').innerText()).trim(); await row.click(); return `${title}: cobrador ${who} (≠ sugestão)`; }
  if (title === 'LESÃO' || title === 'GOLEIRO LESIONADO') {
    if (await has('CONFIRMAR SUBSTITUIÇÃO')) { const rows = page.locator('.modal .prow'); const row = title === 'LESÃO' ? rows.last() : rows.first(); const who = (await row.locator('.prow-name').innerText()).trim(); await row.click(); await clickIn(page, '.modal footer', 'CONFIRMAR SUBSTITUIÇÃO'); return `${title}: entra ${who}`; }
    if (await has('CONFIRMAR')) { await clickIn(page, '.modal footer', 'CONFIRMAR', true); return `${title}: confirmar`; }
    await clickIn(page, '.modal footer', await has('CONTINUAR') ? 'CONTINUAR' : 'ACEITAR SUGESTÃO', true); return `${title}: continuar`;
  }
  if (title === 'GOLEIRO EXPULSO') {
    const sel = page.locator('.modal select[aria-label="Sai"]');
    if (await sel.count()) { const v = await sel.evaluate((s) => { const o = [...s.options].map((x) => x.value).filter((x) => x && x !== s.value); return o[o.length - 1]; }); await sel.selectOption(v); }
    await clickIn(page, '.modal footer', 'CONFIRMAR', true); return `${title}: sai outro jogador (≠ sugestão)`;
  }
  if (title === 'EXPULSÃO') { await page.locator('.modal .seg-btn', { hasText: 'Defensivo' }).first().click(); await clickIn(page, '.modal footer', 'CONTINUAR', true); return `${title}: estilo Defensivo`; }
  await clickIn(page, '.modal footer', 'CONTINUAR', true); return `${title}: continuar`;
}

/** Contagem por tipo: eventos do engine × linhas que a tela mostra em LANCES. */
const feedVsEvents = (page) => page.evaluate(() => {
  const m = globalThis.__fm.userMatch(); if (!m || !document.querySelector('.feed')) return null;
  const map = { GOAL: 'goal', PENALTY_GOAL: 'goal', PENALTY_AWARDED: 'pen', PENALTY_MISSED: 'pen', YELLOW_CARD: 'yellow', RED_CARD: 'red', INJURY: 'injury', SUBSTITUTION: 'sub' };
  const ev = {}; for (const e of m.events) { const k = map[e.type]; if (k) ev[k] = (ev[k] ?? 0) + 1; }
  const ui = {}; for (const li of document.querySelectorAll('.feed li')) { const k = [...li.classList].find((c) => c.startsWith('ev-'))?.slice(3); if (k && k in { goal: 1, pen: 1, yellow: 1, red: 1, injury: 1, sub: 1 }) ui[k] = (ui[k] ?? 0) + 1; }
  const sorted = (o) => Object.fromEntries(Object.entries(o).sort());
  return { ev: sorted(ev), ui: sorted(ui) };
});

/** Joga a rodada 1 do cenário numa velocidade, com relógio falso. Devolve o resultado comparável e as observações. */
async function runScenario(name, speed, policy) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage(); const errors = []; watch(page, errors);
  await page.clock.install({ time: new Date('2026-10-01T12:00:00Z') }); await page.clock.pauseAt(new Date('2026-10-01T12:00:01Z')); // tempo só anda com runFor
  await page.goto(APP_URL);
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [SAVE_KEY, scen[name].save]);
  await page.reload();
  await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click();
  await pickSpeed(page, speed);
  await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
  const obs = { decisions: [], stops: [], notes: [], problems: [], advanced: null, feed: [], statuses: new Set() };
  const iv = SPEEDS[speed].intervalMs;
  // relógio avança: 10 intervalos ⇒ ~10 minutos (antes da primeira decisão)
  if (iv > 0) {
    const m0 = await userMinute(page);
    if (m0 !== 0 && m0 !== 1) obs.problems.push(`antes de o tempo correr o relógio já estava em ${m0}'`);
    await page.clock.runFor(iv * 5);
    const m1 = await userMinute(page);
    obs.advanced = `${m0}' → ${m1}' após ${iv * 5} ms`;
    if (!(m1 > m0) && !(await page.locator('.modal-back').count())) obs.problems.push(`relógio não avançou (${obs.advanced})`);
  } else {
    // INSTANTÂNEA: o clique já roda tudo até a 1ª decisão, sem nenhum tempo passar
    obs.advanced = `instantânea: ${(await pend(page)).minute ?? '?'}' no 1º evento de decisão, 0 ms`;
  }
  for (let guard = 0; guard < 400; guard++) {
    obs.statuses.add(await sessionStatus(page));
    if (await finished(page)) break;
    const modals = await page.locator('.modal-back').count();
    if (modals > 1) obs.problems.push(`${modals} pop-ups ao mesmo tempo`);
    if (modals && (await isStop(page))) {
      // parada obrigatória (intervalo ou lance sem decisão): o relógio fica parado até o CONTINUAR
      const c0 = await clocks(page);
      const title = (await page.locator('.modal h2').innerText()).trim();
      await page.clock.runFor(Math.max(iv, 100) * 30);
      if ((await clocks(page)) !== c0) obs.problems.push(`relógio andou com a parada "${title}" aberta`);
      obs.stops.push(title);
      await page.locator('.modal footer').getByRole('button', { name: 'CONTINUAR', exact: true }).click();
      continue;
    }
    if (modals) {
      const p = await pend(page);
      const c0 = await clocks(page);
      if (p.status !== 'AWAITING_DECISION') obs.problems.push(`pop-up com status ${p.status}`);
      const title = (await page.locator('.modal h2').innerText()).trim();
      // o tempo passa (muito), a tecla ESC e o clique fora do pop-up não podem ignorar a decisão
      await page.clock.runFor(Math.max(iv, 100) * 30);
      await page.keyboard.press('Escape');
      await page.mouse.click(3, 3);
      const c1 = await clocks(page); const p1 = await pend(page);
      if (c1 !== c0) obs.problems.push(`relógio andou com a decisão "${title}" pendente`);
      if (p1.id !== p.id || (await page.locator('.modal-back').count()) !== 1) obs.problems.push(`decisão "${title}" foi ignorada/fechada sem comando`);
      if (obs.decisions.length === 0 || obs.decisions.length === 1) { const lay = await layoutIssues(page); if (lay.length) R.layout.push(`${name}/${speed}/${title}: ${lay.join('; ')}`); }
      if (speed === 'INSTANT' && obs.decisions.length === 0) await page.screenshot({ path: join(dir, `${name}-instant-decisao.png`) });
      const what = await resolve(page, policy);
      await page.waitForTimeout(0);
      const p2 = await pend(page);
      if (p2.id === p.id) obs.problems.push(`comando da decisão "${title}" não foi aceito`);
      const c2 = await clocks(page);
      obs.decisions.push({ title, type: p.type, minute: p.minute, queueBehind: p.queue, what });
      if (p.queue > 0) {
        // fila: a próxima decisão abre JÁ, sozinha, sem o relógio andar entre as duas
        if (!p2.id) obs.problems.push('fila: a 2ª decisão sumiu'); else if (c2 !== c0) obs.problems.push('fila: o relógio andou entre as decisões');
        if ((await page.locator('.modal-back').count()) !== 1) obs.problems.push('fila: a 2ª decisão não abriu como pop-up único');
      } else if (!p2.id) {
        // fila vazia: a partida retoma (status volta a PLAYING; o tempo andando move o relógio)
        const st = await sessionStatus(page);
        // PAUSED só vale se for uma parada obrigatória nova (na instantânea o jogo corre até o intervalo na hora)
        if (!['PLAYING', 'ROUND_FINISHED', 'AWAITING_DECISION'].includes(st) && !(st === 'PAUSED' && (await isStop(page)))) obs.problems.push(`após a decisão o status ficou ${st}`);
        if (iv > 0 && st === 'PLAYING') { await page.clock.runFor(iv * 2); if ((await clocks(page)) === c2 && !(await page.locator('.modal-back').count())) obs.problems.push('a partida não retomou após a decisão'); }
      }
      continue;
    }
    const f = await feedVsEvents(page); if (f) obs.feed.push(f);
    if (f && JSON.stringify(f.ev) !== JSON.stringify(f.ui)) obs.problems.push(`LANCES diferente dos eventos: ${JSON.stringify(f)}`);
    await page.clock.runFor(iv > 0 ? iv * 3 : 50);
  }
  if (!(await finished(page))) obs.problems.push('a rodada não terminou');
  const result = await page.evaluate(() => {
    const c = globalThis.__fm; const r = c.state.snapshot.round; const uid = c.state.career.userClubId;
    const um = r.matches.find((m) => m.home.clubId === uid || m.away.clubId === uid);
    const ev = (m) => m.events.map((e) => `${e.clock.half}|${e.clock.minute}|${e.clock.added} ${e.type} ${e.side ?? ''} ${e.playerId ?? ''} ${e.relatedPlayerId ?? ''} ${JSON.stringify(e.detail ?? null)}`);
    return {
      user: { score: `${um.score.home}-${um.score.away}`, events: ev(um), commands: um.commands.map((x) => `${x.origin} ${x.clock.half}|${x.clock.minute}|${x.clock.added} ${JSON.stringify({ ...x.command, commandId: undefined })}`), status: um.status, end: `${um.clock.half}|${um.clock.minute}|${um.clock.added}`, gk: ['home', 'away'].map((s) => um[s].onField.filter((x) => x.sector === 'GK').length).join('/') },
      round: r.matches.map((m) => `${m.matchId} ${m.score.home}-${m.score.away} ${m.events.length}ev ${m.status}`).join('\n'),
      kinds: [...new Set(um.events.map((e) => e.type))].sort(),
      allKinds: [...new Set(r.matches.flatMap((m) => m.events.map((e) => e.type)))].sort(),
    };
  });
  const finalFeed = obs.feed[obs.feed.length - 1] ?? null;
  if (errors.length) obs.problems.push('console: ' + errors.join(' | ').slice(0, 200));
  await page.screenshot({ path: join(dir, `${name}-${speed}-fim.png`) });
  await ctx.close();
  return { result, obs: { ...obs, statuses: [...obs.statuses], feed: finalFeed } };
}

// ---------- 2/3/4. cenários × velocidades ----------
const runs = [...Object.keys(scen).map((n) => [n, 'choice']), ['penalti', 'suggest']];
for (const [name, policy] of runs) {
  const key = policy === 'suggest' ? `${name}+sugestao` : name;
  const per = {};
  for (const speed of SPEED_ORDER) per[speed] = await runScenario(name, speed, policy);
  const ref = JSON.stringify(per.INSTANT.result);
  const same = SPEED_ORDER.filter((s) => JSON.stringify(per[s].result) === ref);
  R.scenarios[key] = Object.fromEntries(SPEED_ORDER.map((s) => [s, { ...per[s].obs, score: per[s].result.user.score, end: per[s].result.user.end, gk: per[s].result.user.gk, kinds: per[s].result.kinds }]));
  const d = per.INSTANT.obs.decisions;
  console.log(`\n[${key}] placar ${per.INSTANT.result.user.score} | fim ${per.INSTANT.result.user.end} | decisões: ${d.map((x) => `${x.minute}' ${x.what}${x.queueBehind ? ` (+${x.queueBehind} na fila)` : ''}`).join(' ; ')}`);
  console.log(`   eventos da partida do jogador: ${per.INSTANT.result.kinds.join(', ')}`);
  for (const s of SPEED_ORDER) { const o = per[s].obs; check(`${key} · ${LABEL[s]}: pausa em cada decisão, pop-up único, não ignorável, retoma, termina (${o.decisions.length} decisões; ${o.advanced})`, o.problems.length === 0 && per[s].result.user.status === 'FINISHED' && per[s].result.user.gk === '1/1', o.problems.slice(0, 3).join(' | ')); }
  check(`${key}: MESMO resultado nas 5 velocidades (placar, eventos/minutos, comandos/decisões e as 40 partidas da rodada)`, same.length === 5, `iguais à instantânea: ${same.join(',')}`);
}
// o que de fato apareceu (cobertura de eventos)
const kindsSeen = new Set(Object.values(R.scenarios).flatMap((sc) => sc.INSTANT.kinds));
check('eventos vistos nas partidas do jogador: gol, cartão amarelo, expulsão, lesão, pênalti, substituição', ['GOAL', 'YELLOW_CARD', 'RED_CARD', 'INJURY', 'PENALTY_AWARDED', 'SUBSTITUTION'].every((k) => kindsSeen.has(k)), [...kindsSeen].join(','));
const statusesSeen = new Set(Object.values(R.scenarios).flatMap((sc) => sc.INSTANT.statuses));
check('INSTANTÂNEA passa por AWAITING_DECISION e termina (não pula decisões)', statusesSeen.has('AWAITING_DECISION') && statusesSeen.has('ROUND_FINISHED') && Object.values(R.scenarios).every((sc) => sc.INSTANT.decisions.length >= 1), [...statusesSeen].join(','));

// ---------- 4b. tempo real: o relógio de jogo anda na proporção da velocidade ----------
for (const speed of SPEED_ORDER.filter((s) => SPEEDS[s].intervalMs > 0)) {
  const ctx = await browser.newContext(ctxOpts); const page = await ctx.newPage(); const errors = []; watch(page, errors);
  await page.goto(APP_URL);
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [SAVE_KEY, scen.penalti.save]);
  await page.reload(); await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click();
  await pickSpeed(page, speed);
  await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
  const ms = 3000; const t = Date.now(); const m0 = await userMinute(page);
  await page.waitForTimeout(ms);
  const m1 = await userMinute(page); const real = Date.now() - t;
  const expected = real / SPEEDS[speed].intervalMs; const got = m1 - m0;
  R.realtime[speed] = { realMs: real, minutes: got, expected: +expected.toFixed(1) };
  const pausedByDecision = (await page.locator('.modal-back').count()) > 0;
  check(`tempo real ${LABEL[speed]} (${SPEEDS[speed].intervalMs} ms/minuto): ${got} minutos em ${real} ms (esperado ≈${expected.toFixed(1)})`, pausedByDecision || (got >= expected * 0.6 && got <= expected * 1.15 + 1), pausedByDecision ? '' : `${got} vs ${expected.toFixed(1)}`);
  if (errors.length) R.errors.push(...errors);
  await ctx.close();
}

// ---------- 5. MEU TIME durante a partida e durante uma decisão ----------
{
  const ctx = await browser.newContext(ctxOpts); const page = await ctx.newPage(); const errors = []; watch(page, errors);
  await page.clock.install({ time: new Date('2026-10-01T12:00:00Z') }); await page.clock.pauseAt(new Date('2026-10-01T12:00:01Z')); // tempo só anda com runFor
  await page.goto(APP_URL);
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [SAVE_KEY, scen.expulsao.save]);
  await page.reload(); await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click();
  await page.getByRole('button', { name: 'NORMAL', exact: true }).first().click();
  await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
  await page.clock.runFor(500 * 10);
  const team = () => page.evaluate(() => { const c = globalThis.__fm; const m = c.userMatch(); const t = m.home.clubId === c.state.career.userClubId ? m.home : m.away; return { style: t.style, behavior: t.behavior, onField: t.onField.length, clock: `${m.clock.half}:${m.clock.minute}` }; });
  // (a) antes da decisão: abrir MEU TIME pausa; CANCELAR volta sem mudar nada; a partida retoma
  const c0 = await onlyClocks(page); const before = await team();
  await clickIn(page, '.controls', 'MEU TIME', true);
  await page.waitForSelector('.modal-back');
  const t0m = (await page.locator('.modal h2').innerText()).trim();
  await page.clock.runFor(5000);
  const pausedOk = (await onlyClocks(page)) === c0;
  await clickIn(page, '.modal footer', 'CANCELAR', true);
  await page.clock.runFor(500 * 2);
  const resumed = (await onlyClocks(page)) !== c0; const afterCancel = await team();
  check('MEU TIME durante a partida: abre pop-up, pausa o relógio, CANCELAR volta sem mudar o time e a partida retoma', t0m === 'MEU TIME' && pausedOk && resumed && afterCancel.style === before.style && afterCancel.behavior === before.behavior && afterCancel.onField === 11, JSON.stringify({ t0m, pausedOk, resumed, before, afterCancel }));
  // (b) segue até a decisão (expulsão): mesma decisão, no mesmo minuto do cenário (abrir/cancelar MEU TIME não perdeu nem mudou nada)
  for (let g = 0; g < 200 && !(await finished(page)); g++) {
    if (await page.locator('.modal-back').count()) { if (await isStop(page)) { await page.locator('.modal footer').getByRole('button', { name: 'CONTINUAR', exact: true }).click(); continue; } break; }
    await page.clock.runFor(500);
  }
  const p = await pend(page);
  const decTitle = (await page.locator('.modal h2').count()) ? (await page.locator('.modal h2').innerText()).trim() : '(nenhuma)';
  let navBlocked = false;
  try { await page.locator('.nav-btn', { hasText: 'MEU TIME' }).click({ timeout: 1000 }); } catch { navBlocked = true; }
  const stillSame = (await pend(page)).id === p.id;
  const engineRefuses = await page.evaluate(() => { const r = globalThis.__fm.session.openTeamAdjustment(); return r.ok ? 'aceitou' : r.error; }).catch((e) => 'exceção: ' + String(e).slice(0, 80));
  check(`decisão "${decTitle}" criada aos ${p.createdAt}' (cenário sem MEU TIME: ${scen.expulsao.first.minute}'): MEU TIME não abre por cima (aba coberta; engine: ${engineRefuses}) e a decisão continua`, decTitle === 'EXPULSÃO' && p.createdAt === scen.expulsao.first.minute && navBlocked && stillSame && engineRefuses === 'INVALID_STATUS', JSON.stringify({ decTitle, minute: p.minute, navBlocked, stillSame, engineRefuses }));
  // (c) resolve; depois abre MEU TIME, muda estilo/comportamento, volta; aba MEU TIME ida/volta; joga até o fim
  if (decTitle === 'EXPULSÃO') await clickIn(page, '.modal footer', 'CONTINUAR', true);
  const afterDec = await team();
  await page.clock.runFor(500 * 2);
  await clickIn(page, '.controls', 'MEU TIME', true); await page.waitForSelector('.modal-back');
  await page.locator('.modal .seg-btn', { hasText: 'Ofensivo' }).first().click();
  await page.locator('.modal .seg-btn', { hasText: 'Reativo' }).first().click();
  await clickIn(page, '.modal footer', 'CONTINUAR', true);
  const afterEdit = await team();
  await page.locator('.nav-btn', { hasText: 'MEU TIME' }).click(); await page.waitForTimeout(100);
  await page.locator('.nav-btn', { hasText: 'PARTIDA' }).click(); await page.waitForTimeout(100);
  await clickIn(page, '.controls', 'MEU TIME', true); await page.waitForSelector('.modal-back');
  const shownStyle = await page.locator('.modal .seg-btn.on').allInnerTexts();
  await clickIn(page, '.modal footer', 'CANCELAR', true);
  for (let g = 0; g < 400 && !(await finished(page)); g++) { if (await page.locator('.modal-back').count()) await resolve(page, 'suggest'); else await page.clock.runFor(500 * 4); }
  const end = await page.evaluate(() => { const c = globalThis.__fm; const r = c.state.snapshot.round; const uid = c.state.career.userClubId; const m = r.matches.find((x) => x.home.clubId === uid || x.away.clubId === uid); const t = m.home.clubId === uid ? m.home : m.away; return { style: t.style, behavior: t.behavior, status: m.status, onField: t.onField.length }; });
  R.meuTime = { before, afterCancel, decTitle, afterDec, afterEdit, shownStyle, end };
  check('após a decisão: MEU TIME aplica Ofensivo/Reativo, o pop-up reabre mostrando a escolha, aba MEU TIME ida/volta não perde nada e a rodada termina com a tática', afterDec.onField === 10 && afterEdit.style === 'OFFENSIVE' && afterEdit.behavior === 'REACTIVE' && shownStyle.join().toUpperCase() === 'OFENSIVO,REATIVO' && end.style === 'OFFENSIVE' && end.behavior === 'REACTIVE' && end.status === 'FINISHED', JSON.stringify(R.meuTime));
  if (errors.length) R.errors.push(...errors);
  await ctx.close();
}

await browser.close();
const allErrors = R.errors.concat(Object.values(R.scenarios).flatMap((sc) => Object.values(sc).flatMap((o) => o.problems.filter((p) => p.startsWith('console')))));
check('sem erros de console', allErrors.length === 0, allErrors.slice(0, 2).join(' | '));
check('pop-ups de decisão sem problemas de layout', R.layout.length === 0, R.layout.slice(0, 3).join(' | '));
mkdirSync(join(ROOT, 'dist/qa'), { recursive: true });
writeFileSync(join(ROOT, 'dist/qa', `speeds-${W}.json`), JSON.stringify(R, null, 1));
const bad = Object.values(R.checks).filter((v) => v !== 'ok').length;
console.log(`\nRESUMO [${W}]: ${Object.keys(R.checks).length - bad}/${Object.keys(R.checks).length} ok`);
process.exit(failed ? 1 : 0);
