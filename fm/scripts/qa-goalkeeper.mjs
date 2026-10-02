// QA de interface dos casos de goleiro. Pré-requisito: node scripts/qa-scenarios.mjs.
// Uso: node scripts/qa-goalkeeper.mjs [--w=390 --h=844 --mobile]
// A–D: o clube do jogador perde o goleiro (lesão/expulsão, com/sem goleiro reserva); a escolha é feita SÓ pela tela,
//      de propósito DIFERENTE da sugestão quando há alternativa (prova que a decisão do usuário vale).
// E:   a CPU perde o goleiro: mesma máquina de estados (decisão → comando de origem CPU), 1 goleiro até o fim.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_URL, ROOT, SAVE_KEY, chromium, clickIn, driveRound, layoutIssues, roundStats, shotDir, startCareerUI, watch, instant, untilDecision } from './qa-lib.mjs';
const { effectiveStrength, DEFAULT_CONFIG } = await import('../engine/index.ts');

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const W = Number(arg('w', 390)), H = Number(arg('h', 844)), MOBILE = process.argv.includes('--mobile') || !process.argv.some((a) => a.startsWith('--w='));
const ctxOpts = MOBILE ? { viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: W, height: H } };
const dir = shotDir(`goalkeeper-${W}`);

/** Estado do time do jogador na partida dele. */
const userTeam = (page) => page.evaluate(() => {
  const c = globalThis.__fm; const m = c.userMatch(); const side = m.home.clubId === c.state.career.userClubId ? 'home' : 'away'; const t = m[side];
  return { onField: t.onField.map((s) => ({ id: s.playerId, sector: s.sector, pos: t.players[s.playerId].position, name: t.players[s.playerId].name, strength: t.players[s.playerId].strength })), bench: t.bench, sentOff: t.sentOff, injured: t.injured, subbedOff: t.subbedOff, subsUsed: t.subsUsed, status: m.status, pending: c.state.snapshot.pending?.decision.id ?? null, players: Object.fromEntries(Object.values(t.players).map((p) => [p.id, { name: p.name, position: p.position, strength: p.strength }])) };
});
const idByName = (team, name) => Object.entries(team.players).find(([, p]) => p.name === name)?.[0] ?? null;
const otherOption = async (page, label) => page.locator(`.modal select[aria-label="${label}"]`).evaluate((sel) => { const opts = [...sel.options].map((o) => o.value).filter(Boolean); const other = opts.filter((v) => v !== sel.value); return other[other.length - 1] ?? opts[0]; });
const choose = async (page, label, value) => { await page.locator(`.modal select[aria-label="${label}"]`).selectOption(value); await page.waitForTimeout(80); };
const confirm = (page) => clickIn(page, '.modal footer', 'CONFIRMAR', true);

const cases = {
  // A: goleiro reserva disponível → usuário escolhe o reserva (goleiro aparece primeiro) e confirma.
  'goleiro-lesionado-com-reserva': {
    letter: 'A', title: 'GOLEIRO LESIONADO',
    act: async (page) => { const name = (await page.locator('.modal .prow .prow-name').first().innerText()).trim(); await page.locator('.modal .prow').first().click(); await clickIn(page, '.modal footer', 'CONFIRMAR SUBSTITUIÇÃO'); return { reserveName: name }; },
    expect: (b, a, ch) => { const gk = a.onField.find((s) => s.sector === 'GK'); return gk && gk.pos === 'GK' && gk.name === ch.reserveName ? `goleiro reserva ${gk.name} escolhido pelo usuário entrou no gol` : `esperado ${ch.reserveName} (GK) no gol, veio ${gk?.name}`; },
  },
  // B: sem goleiro reserva → usuário escolhe o reserva que entra e um JOGADOR DE LINHA EM CAMPO para o gol (≠ sugestão).
  'goleiro-lesionado-sem-reserva': {
    letter: 'B', title: 'GOLEIRO LESIONADO', needText: 'sem goleiro reserva',
    act: async (page, before) => { const rows = page.locator('.modal .prow'); const name = (await rows.last().locator('.prow-name').innerText()).trim(); await rows.last().click(); await page.waitForTimeout(80); const reserveIn = idByName(before, name); const goal = await otherOption(page, 'Gol'); await choose(page, 'Gol', goal === reserveIn ? await otherOption(page, 'Gol') : goal); const toGoal = await page.locator('.modal select[aria-label="Gol"]').inputValue(); await confirm(page); return { reserveIn, toGoal }; },
    expect: (b, a, ch) => { const gk = a.onField.filter((s) => s.sector === 'GK'); if (gk.length !== 1 || gk[0].id !== ch.toGoal) return `esperado ${ch.toGoal} no gol, veio ${gk.map((x) => x.id)}`; if (!a.onField.some((s) => s.id === ch.reserveIn)) return 'o reserva escolhido não entrou'; const eff = effectiveStrength(b.players[ch.toGoal], 'GK', DEFAULT_CONFIG) / b.players[ch.toGoal].strength; return Math.abs(eff - DEFAULT_CONFIG.positionFactor.goal) > 0.02 && b.players[ch.toGoal].position !== 'GK' ? `fator ${eff}` : `${gk[0].name} (${gk[0].pos}) foi para o gol por escolha do usuário (fator ${eff.toFixed(2)}); reserva ${b.players[ch.reserveIn].name} entrou`; },
  },
  // C: goleiro expulso com reserva → usuário escolhe QUAL jogador de linha sai (≠ sugestão); o goleiro reserva entra.
  'goleiro-expulso-com-reserva': {
    letter: 'C', title: 'GOLEIRO EXPULSO',
    act: async (page) => { const out = await otherOption(page, 'Sai'); await choose(page, 'Sai', out); await page.locator('.modal .seg-btn', { hasText: 'Defensivo' }).first().click(); await confirm(page); return { out, style: 'DEFENSIVE' }; },
    expect: (b, a, ch) => { const gk = a.onField.filter((s) => s.sector === 'GK'); if (gk.length !== 1 || gk[0].pos !== 'GK' || !b.bench.includes(gk[0].id)) return 'o goleiro reserva deveria assumir o gol'; if (a.onField.some((s) => s.id === ch.out) || !a.subbedOff.includes(ch.out)) return 'o jogador escolhido para sair continua em campo'; return `goleiro reserva ${gk[0].name} entrou; saiu ${b.players[ch.out].name} (escolha do usuário); ${a.onField.length} em campo`; },
  },
  // D: goleiro expulso sem reserva → usuário escolhe o jogador de linha que vai para o gol (≠ sugestão).
  'goleiro-expulso-sem-reserva': {
    letter: 'D', title: 'GOLEIRO EXPULSO', needText: 'sem goleiro reserva',
    act: async (page, before) => { const rows = page.locator('.modal .prow:not(.on)'); const name = (await rows.last().locator('.prow-name').innerText()).trim(); await rows.last().click(); await page.waitForTimeout(80); await confirm(page); return { toGoal: idByName(before, name) }; },
    expect: (b, a, ch) => { const gk = a.onField.filter((s) => s.sector === 'GK'); if (gk.length !== 1 || gk[0].id !== ch.toGoal) return `esperado ${ch.toGoal} no gol`; return `${gk[0].name} (${gk[0].pos}) foi para o gol por escolha do usuário; ${a.onField.length} em campo`; },
  },
};

let failed = false;
const browser = await chromium.launch();
for (const [name, spec] of Object.entries(cases)) {
  const scenario = JSON.parse(readFileSync(join(ROOT, 'dist/qa/scenarios', `${name}.json`), 'utf8'));
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage(); const errors = []; watch(page, errors);
  await page.goto(APP_URL);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, scenario.save]);
  await page.reload();
  await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click();
  await instant(page); // decisão precisa pausar até no instantâneo
  await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
  const notes = []; let ok = true; const fail = (m) => { ok = false; notes.push('✗ ' + m); };
  try {
    await untilDecision(page, 20000); // passa pelo intervalo (a decisão do cenário pode ser no 2º tempo)
    const title = (await page.locator('.modal h2').innerText()).trim();
    if (title !== spec.title) fail(`título "${title}" ≠ "${spec.title}"`); else notes.push(`pop-up "${title}"`);
    if (spec.needText && !(await page.locator('.modal').innerText()).toLowerCase().includes(spec.needText)) fail('faltou explicação: ' + spec.needText);
    if ((await page.locator('.modal-back').count()) !== 1) fail('mais de um pop-up aberto');
    const { subject, decisionId } = await page.evaluate(() => { const d = globalThis.__fm.state.snapshot.pending.decision; return { subject: d.playerId, decisionId: d.id }; });
    const snap = await page.evaluate(() => { const s = globalThis.__fm.state.snapshot; return { status: s.status, clocks: s.round.matches.map((x) => `${x.clock.half}:${x.clock.minute}:${x.clock.added}`) }; });
    const before = await userTeam(page);
    if (snap.status !== 'AWAITING_DECISION') fail('partida deveria estar pausada aguardando decisão'); else notes.push('partida pausada (AWAITING_DECISION)');
    if (before.onField.filter((s) => s.sector === 'GK').length !== 0) fail('durante a decisão o goleiro deveria ter saído do campo');
    const lay = await layoutIssues(page); if (lay.length) fail('layout do pop-up: ' + lay.join('; '));
    await page.screenshot({ path: join(dir, `${spec.letter}-${name}.png`) });
    await page.waitForTimeout(800);
    const still = await page.evaluate(() => globalThis.__fm.state.snapshot.round.matches.map((x) => `${x.clock.half}:${x.clock.minute}:${x.clock.added}`));
    if (JSON.stringify(still) !== JSON.stringify(snap.clocks)) fail('o relógio andou com a decisão pendente'); else notes.push('relógio parado com a decisão pendente (velocidade INSTANTÂNEA)');
    const choice = await spec.act(page, before);
    await page.waitForTimeout(150);
    if (await page.locator('.toast-error, .toast.error').count()) fail('a tela mostrou erro ao confirmar');
    const after = await userTeam(page);
    if (after.pending === decisionId) fail('a decisão continuou pendente (comando recusado?)');
    if (after.onField.filter((s) => s.sector === 'GK').length !== 1) fail(`goleiros em campo: ${after.onField.filter((s) => s.sector === 'GK').length}`); else notes.push('exatamente 1 goleiro em campo');
    if (after.onField.some((s) => s.id === subject)) fail('o goleiro lesionado/expulso continua em campo');
    const msg = spec.expect(before, after, choice); if (/^(esperado|o |fator)/.test(msg)) fail(msg); else notes.push(msg);
    await page.screenshot({ path: join(dir, `${spec.letter}-${name}-depois.png`) });
    await driveRound(page, { policy: 'suggest' });
    const st = await roundStats(page);
    const end = await page.evaluate((pid) => { const c = globalThis.__fm; const r = c.state.snapshot.round; const m = r.matches.find((x) => x.matchId === c.state.plan?.userMatchId) ?? r.matches.find((x) => x.home.clubId === c.state.career.userClubId || x.away.clubId === c.state.career.userClubId); const side = m.home.clubId === c.state.career.userClubId ? 'home' : 'away'; const t = m[side]; return { onFieldAgain: t.onField.some((s) => s.playerId === pid), gk: t.onField.filter((s) => s.sector === 'GK').length, status: m.status, playerCmds: m.commands.filter((x) => x.origin === 'PLAYER').length }; }, subject);
    if (end.onFieldAgain) fail('o goleiro lesionado/expulso voltou a campo'); else notes.push('lesionado/expulso não voltou até o fim do jogo');
    if (end.gk !== 1 || end.status !== 'FINISHED') fail(`fim do jogo: ${end.gk} goleiro(s), status ${end.status}`);
    if (st.matches !== 40 || st.gkIssues !== 0) fail(`ao fim: partidas ${st.matches}, problemas de goleiro/estado ${st.gkIssues}`); else notes.push('rodada terminou: 40 partidas, 1 goleiro de cada lado em todas');
    if ((await page.evaluate(() => globalThis.__fm.state.career.roundNumber)) !== 2) fail('rodada não aplicada à carreira'); else notes.push('partida continuou e a rodada foi aplicada');
  } catch (e) { fail('exceção: ' + String(e).split('\n')[0]); }
  if (errors.length) fail('console: ' + errors.join(' | ').slice(0, 200));
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${spec.letter} ${name} [${W}]\n   ${notes.join('\n   ')}`);
  if (!ok) failed = true;
  await ctx.close();
}

// ----- E: CPU perde o goleiro (carreira nova, rodadas pela UI até haver casos) -----
{
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage(); const errors = []; watch(page, errors);
  await page.addInitScript(() => { Math.random = () => 0.4242; Date.now = () => 1_700_000_000_000; });
  await page.goto(APP_URL); await page.evaluate(() => localStorage.clear()); await page.reload();
  await startCareerUI(page, 'QA CPU');
  await instant(page);
  const cases = []; let ok = true; const notes = []; let rounds = 0;
  for (; rounds < 20 && cases.length < 3; rounds++) {
    await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
    await driveRound(page, { policy: 'suggest' });
    const found = await page.evaluate(() => {
      const c = globalThis.__fm; const uid = c.state.career.userClubId; const out = [];
      for (const m of c.state.snapshot.round.matches) for (const side of ['home', 'away']) {
        const t = m[side]; if (t.clubId === uid) continue;
        for (const e of m.events) {
          if (e.side !== side || (e.type !== 'INJURY' && e.type !== 'RED_CARD')) continue;
          const slot = t.vacated[e.playerId]; if (!slot || slot.sector !== 'GK') continue;
          const type = e.type === 'INJURY' ? 'INJURY_SUBSTITUTION' : 'RED_CARD_ADJUSTMENT';
          const key = `${e.clock.half}|${e.clock.minute}|${e.clock.added}`;
          // o commandId da CPU é cpu:<id da decisão> e o id da decisão leva o minuto do evento: <partida>:<h|m|a>:<tipo>:<seq>
          const cmd = m.commands.find((x) => x.origin === 'CPU' && x.commandId.startsWith(`cpu:${m.matchId}:${key}:${type}:`));
          const gk = t.onField.filter((s) => s.sector === 'GK');
          out.push({ match: m.matchId, club: t.name, type, minute: e.clock.minute, cmd: !!cmd, subs: cmd?.command.substitutions?.length ?? 0, gkEnd: gk.length, gkPos: gk[0] ? t.players[gk[0].playerId].position : null, subjectBack: t.onField.some((s) => s.playerId === e.playerId), status: m.status });
        }
      }
      return out;
    });
    cases.push(...found);
    await page.locator('.cta .btn').click();
  }
  if (cases.length === 0) { ok = false; notes.push(`✗ nenhum goleiro da CPU lesionado/expulso em ${rounds} rodadas`); }
  for (const x of cases) {
    const good = x.cmd && x.gkEnd === 1 && !x.subjectBack && x.status === 'FINISHED';
    if (!good) ok = false;
    notes.push(`${good ? '' : '✗ '}${x.club} ${x.type === 'RED_CARD_ADJUSTMENT' ? 'goleiro expulso' : 'goleiro lesionado'} aos ${x.minute}': comando CPU registrado=${x.cmd}, trocas ${x.subs}, fim com ${x.gkEnd} goleiro (${x.gkPos}), titular não voltou=${!x.subjectBack}`);
  }
  if (await page.locator('.modal-back').count()) { ok = false; notes.push('✗ pop-up aberto para decisão da CPU'); }
  if (errors.length) { ok = false; notes.push('✗ console: ' + errors.join(' | ').slice(0, 200)); }
  console.log(`${ok ? 'OK    ' : 'FALHOU'} E cpu [${W}] (${rounds} rodadas, ${cases.length} casos)\n   ${notes.join('\n   ')}`);
  if (!ok) failed = true;
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
