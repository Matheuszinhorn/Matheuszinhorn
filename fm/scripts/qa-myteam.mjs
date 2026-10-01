// QA da ETAPA 6 — MEU TIME durante a partida, SÓ pela interface (cliques/toques e leitura da tela).
// Uso: node scripts/qa-myteam.mjs [--w=1280 --h=800 | --w=390 --h=844 --mobile]  → dist/qa/myteam-<w>.json + capturas
// Relógio falso do Playwright (pausado): o tempo de jogo só anda quando o script manda, para medir pausa/retomada.
// Depois de CADA alteração confere as invariantes do time do jogador (1 goleiro, sem duplicados/inexistentes,
// expulso/lesionado/substituído fora, limite de trocas) e que o relógio retoma ao voltar para a PARTIDA.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_URL, ROOT, SAVE_KEY, chromium, clickIn, layoutIssues, shotDir, watch } from './qa-lib.mjs';
const { careerOffers, createCareer, serializeCareer } = await import('../game/career.ts');
const { DEFAULT_CONFIG } = await import('../engine/index.ts');

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const W = Number(arg('w', 1280)), H = Number(arg('h', 800)), MOBILE = process.argv.includes('--mobile');
const ctxOpts = MOBILE ? { viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: W, height: H } };
const dir = shotDir(`myteam-${W}`);
const MAX_SUBS = DEFAULT_CONFIG.maxSubs;
const R = { width: W, checks: {}, layout: [], errors: [], notes: {} };
let failed = false;
const check = (name, ok, extra = '') => { R.checks[name] = ok ? 'ok' : `FALHOU ${extra}`; if (!ok) failed = true; console.log(`${ok ? 'OK    ' : 'FALHOU'} [${W}] ${name}${!ok && extra ? ' — ' + extra : ''}`); };
// Cenários das etapas anteriores (determinísticos): qa-vel-1 = pênalti do jogador aos 28'; qa-vel-2 = expulsão do jogador aos 36'.
const save = (seed) => serializeCareer(createCareer({ seed, coachName: 'QA Meu Time', clubId: careerOffers(seed)[0] }));
const SAVES = { penalti: save('qa-vel-1'), expulsao: save('qa-vel-2') };

const browser = await chromium.launch();
async function open(saveStr, speedLabel = 'NORMAL') {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage(); const errors = []; watch(page, errors);
  await page.clock.install({ time: new Date('2026-10-01T12:00:00Z') }); await page.clock.pauseAt(new Date('2026-10-01T12:00:01Z'));
  await page.goto(APP_URL);
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [SAVE_KEY, saveStr]);
  await page.reload();
  await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click();
  await page.getByRole('button', { name: speedLabel, exact: true }).first().click();
  return { ctx, page, errors };
}
const clocks = (page) => page.evaluate(() => globalThis.__fm.state.snapshot.round.matches.map((m) => `${m.clock.half}:${m.clock.minute}:${m.clock.added}`).join('|'));
const minute = (page) => page.evaluate(() => globalThis.__fm.userMatch()?.clock.minute ?? null);
const finished = async (page) => (await page.locator('.cta .btn').count()) > 0;
const modalTitle = async (page) => ((await page.locator('.modal h2').count()) ? (await page.locator('.modal h2').innerText()).trim() : null);
const team = (page) => page.evaluate(() => {
  const c = globalThis.__fm; const m = c.userMatch(); const t = m.home.clubId === c.state.career.userClubId ? m.home : m.away;
  const n = (id) => t.players[id]?.name;
  return { onField: t.onField.map((s) => ({ id: s.playerId, name: n(s.playerId), sector: s.sector })), bench: [...t.bench], subbedOff: [...t.subbedOff], sentOff: [...t.sentOff], injured: [...t.injured], subsUsed: t.subsUsed, style: t.style, behavior: t.behavior, penaltyTakerId: t.penaltyTakerId, status: m.status, pending: c.state.snapshot.pending?.decision.type ?? null, minute: m.clock.minute };
});
const formation = (t) => ['GK', 'DEF', 'MID', 'ATT'].map((s) => t.onField.filter((x) => x.sector === s).length).join('-');
/** Invariantes do time do jogador. Devolve a lista de violações (vazia = ok). */
const invariants = (page) => page.evaluate((max) => {
  const c = globalThis.__fm; const m = c.userMatch(); const t = m.home.clubId === c.state.career.userClubId ? m.home : m.away;
  const ids = t.onField.map((s) => s.playerId); const e = [];
  if (t.onField.filter((s) => s.sector === 'GK').length !== 1) e.push(`goleiros: ${t.onField.filter((s) => s.sector === 'GK').length}`);
  if (new Set(ids).size !== ids.length) e.push('jogador duplicado em campo');
  if (ids.some((id) => !t.players[id])) e.push('jogador inexistente em campo');
  if (ids.some((id) => t.sentOff.includes(id))) e.push('expulso em campo');
  if (ids.some((id) => t.injured.includes(id))) e.push('lesionado em campo');
  if (ids.some((id) => t.subbedOff.includes(id))) e.push('substituído voltou');
  if (t.bench.some((id) => ids.includes(id))) e.push('jogador no banco e em campo');
  if (t.subsUsed > max) e.push(`trocas ${t.subsUsed} > ${max}`);
  if (ids.length > 11 || ids.length + t.sentOff.length > 11) e.push(`${ids.length} em campo com ${t.sentOff.length} expulsos`);
  return e;
}, MAX_SUBS);
/** Resolve qualquer decisão obrigatória que aparecer, com a sugestão (registra o que foi). */
async function clearDecisions(page, log) {
  for (let g = 0; g < 10; g++) {
    const t = await modalTitle(page); if (!t || t === 'MEU TIME') return;
    log.push(`${await minute(page)}' ${t}`);
    await clickIn(page, '.modal footer', 'ACEITAR SUGESTÃO', true);
  }
}
/** Abre o pop-up MEU TIME pelo botão da PARTIDA e confirma: pausa (relógio parado com o tempo correndo) e 1 pop-up. */
async function openMeuTime(page, log) {
  await clearDecisions(page, log);
  if (await finished(page)) return { ok: false, why: 'rodada já terminou' };
  const c0 = await clocks(page);
  await clickIn(page, '.controls', 'MEU TIME', true);
  await page.waitForSelector('.modal-back');
  const title = await modalTitle(page);
  const st = await page.evaluate(() => globalThis.__fm.state.snapshot.status);
  await page.clock.runFor(4000);
  const frozen = (await clocks(page)) === c0;
  return { ok: title === 'MEU TIME' && st === 'AWAITING_DECISION' && frozen && (await page.locator('.modal-back').count()) === 1, why: JSON.stringify({ title, st, frozen }) };
}
/** CONTINUAR do pop-up e volta para a PARTIDA: pop-up fecha, nada de erro, relógio retoma. */
async function continueMatch(page, button = 'CONTINUAR') {
  await clickIn(page, '.modal footer', button, true);
  await page.waitForTimeout(30);
  const toastErr = await page.locator('.toast-error').count();
  const closed = (await modalTitle(page)) !== 'MEU TIME';
  const c0 = await clocks(page);
  await page.clock.runFor(500 * 2);
  const resumed = (await clocks(page)) !== c0 || (await page.locator('.modal-back').count()) > 0 || (await finished(page));
  return { ok: !toastErr && closed && resumed && (await page.locator('.modal-back').count()) <= 1, why: JSON.stringify({ toastErr, closed, resumed }) };
}
async function playToEnd(page, log) {
  for (let g = 0; g < 500 && !(await finished(page)); g++) { if (await page.locator('.modal-back').count()) await clearDecisions(page, log); else await page.clock.runFor(500 * 4); }
}
const lay = async (page, where) => { for (const i of await layoutIssues(page)) R.layout.push(`${where}: ${i}`); };

// =============== FLUXO PRINCIPAL: abrir, formação ×2, posições, estilo ×3, comportamento ×3, substituições até o limite ===============
async function mainFlow(tag) {
  const { ctx, page, errors } = await open(SAVES.penalti);
  const log = []; const steps = []; const step = (name, ok, why = '') => steps.push({ name, ok, why });
  const afterChange = async (name) => { const inv = await invariants(page); step(`${name}: invariantes`, inv.length === 0, inv.join('; ')); };
  await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
  await page.clock.runFor(500 * 8);
  const t0 = await team(page);

  // 1. aba MEU TIME durante a partida (comportamento existente: consulta, sem edição)
  await page.locator('.nav-btn', { hasText: 'MEU TIME' }).click(); await page.waitForTimeout(80);
  const tabInfo = await page.evaluate(() => ({ notice: document.body.innerText.toLowerCase().includes('use o botão meu time na tela partida'), chipsDisabled: [...document.querySelectorAll('.pitch .chip')].every((b) => b.disabled), chips: document.querySelectorAll('.pitch .chip').length }));
  const ct0 = await clocks(page); await page.clock.runFor(1000); const tabRuns = (await clocks(page)) !== ct0;
  if (tag === 'a') { await lay(page, 'aba MEU TIME ao vivo'); await page.screenshot({ path: join(dir, '01-aba-meu-time-ao-vivo.png') }); }
  await page.locator('.nav-btn', { hasText: 'PARTIDA' }).click(); await page.waitForTimeout(80);
  R.notes.abaAoVivo = { ...tabInfo, relogioContinua: tabRuns };

  // 2. abrir o pop-up MEU TIME
  let o = await openMeuTime(page, log); step('abrir MEU TIME: pop-up único, partida pausada, relógio parado', o.ok, o.why);
  if (tag === 'a') { await lay(page, 'pop-up MEU TIME'); await page.screenshot({ path: join(dir, '02-popup-meu-time.png') }); }
  const tOpen = await team(page);
  step('estado do match consistente com o pop-up aberto (mesmo time, mesma tática)', JSON.stringify(tOpen.onField) === JSON.stringify((await team(page)).onField) && tOpen.style === t0.style, '');
  await afterChange('abrir');
  let c = await continueMatch(page, 'CANCELAR'); step('CANCELAR volta para a PARTIDA sem mudar nada e o relógio retoma', c.ok && formation(await team(page)) === formation(t0), c.why);

  // 3. formação: duas configurações
  for (const f of ['3-5-2', '4-3-3']) {
    const before = await team(page);
    o = await openMeuTime(page, log); if (!o.ok) { step(`formação ${f}: abrir`, false, o.why); continue; }
    if ((await team(page)).onField.length !== 11) { step(`formação ${f}`, false, 'time com menos de 11 (formação não editável)'); await continueMatch(page, 'CANCELAR'); continue; }
    await page.locator('.modal .pill', { hasText: f }).click();
    c = await continueMatch(page);
    const after = await team(page);
    const [, d, m, a] = f.split('-').map(Number).length === 3 ? [0, ...f.split('-').map(Number)] : [];
    const sameSet = JSON.stringify(before.onField.map((x) => x.id).sort()) === JSON.stringify(after.onField.map((x) => x.id).sort());
    step(`formação ${f} aplicada (1 GK, ${d}-${m}-${a}), mesmos 11 jogadores, retorno à PARTIDA`, c.ok && formation(after) === `1-${d}-${m}-${a}` && sameSet, `${formation(after)} mesmos=${sameSet} ${c.why}`);
    await afterChange(`formação ${f}`);
    // aba MEU TIME mostra a formação efetiva
    await page.locator('.nav-btn', { hasText: 'MEU TIME' }).click(); await page.waitForTimeout(60);
    const shown = await page.evaluate(() => ['GK', 'DEF', 'MID', 'ATT'].map((s) => document.querySelectorAll(`.pitch .chip-${s}`).length).join('-'));
    await page.locator('.nav-btn', { hasText: 'PARTIDA' }).click(); await page.waitForTimeout(60);
    step(`formação ${f}: o campo da aba MEU TIME mostra a escalação efetiva do jogo`, shown === formation(await team(page)), `${shown} vs ${formation(await team(page))}`);
    // reabrir mostra a formação atual
    o = await openMeuTime(page, log); const pillOn = o.ok ? (await page.locator('.modal .pill.on').allInnerTexts()).join() : '?'; await continueMatch(page, 'CANCELAR');
    step(`formação ${f}: ao reabrir MEU TIME a formação marcada é ${f}`, pillOn === f, pillOn);
  }

  // 4. posições: troca de dois jogadores de setores diferentes (seletores do pop-up)
  {
    o = await openMeuTime(page, log);
    const t = await team(page);
    const pa = t.onField.find((x) => x.sector === 'DEF'); const pb = t.onField.find((x) => x.sector === 'ATT');
    if (o.ok && pa && pb) {
      await page.locator('.modal select[aria-label="a"]').selectOption(pa.id);
      await page.locator('.modal select[aria-label="b"]').selectOption(pb.id);
      await clickIn(page, '.modal', 'TROCAR POSIÇÕES', true);
      const listed = (await page.locator('.modal .pair span').allInnerTexts()).join(' | ');
      c = await continueMatch(page);
      const after = await team(page);
      const sa = after.onField.find((x) => x.id === pa.id)?.sector, sb = after.onField.find((x) => x.id === pb.id)?.sector;
      step(`posições: ${pa.name} (DEF) ⇄ ${pb.name} (ATT) aplicada no jogo`, c.ok && sa === 'ATT' && sb === 'DEF', `${sa}/${sb} ${listed} ${c.why}`);
      await afterChange('troca de posições');
      await page.locator('.nav-btn', { hasText: 'MEU TIME' }).click(); await page.waitForTimeout(60);
      const chipSectors = await page.evaluate(([na, nb]) => { const find = (n) => [...document.querySelectorAll('.pitch .chip')].find((b) => b.title === n || b.querySelector('.chip-name')?.textContent && n.endsWith(b.querySelector('.chip-name').textContent.split('. ').pop())); const sec = (b) => [...(b?.classList ?? [])].find((k) => /^chip-(GK|DEF|MID|ATT)$/.test(k)); return [sec(find(na)), sec(find(nb))]; }, [pa.name, pb.name]);
      if (tag === 'a') await page.screenshot({ path: join(dir, '03-aba-campo-apos-troca.png') });
      await page.locator('.nav-btn', { hasText: 'PARTIDA' }).click(); await page.waitForTimeout(60);
      step('posições: o campo mostra os dois jogadores nos setores trocados', chipSectors[0] === 'chip-ATT' && chipSectors[1] === 'chip-DEF', JSON.stringify(chipSectors));
    } else step('posições: abrir e achar DEF/ATT', false, o.why);
  }

  // 5/6. estilo e comportamento: os 3 valores de cada, com reabertura e troca de aba
  const tacticsLoop = async (kind, values) => {
    for (const [id, label] of values) {
      o = await openMeuTime(page, log); if (!o.ok) { step(`${kind} ${label}: abrir`, false, o.why); continue; }
      await page.locator('.modal .seg-btn', { hasText: new RegExp(`^${label}$`, 'i') }).first().click();
      c = await continueMatch(page);
      const v1 = (await team(page))[kind];
      const sb = (await page.locator('.match-card .sb-team.me .sb-style, .sb-team.me .sb-style').first().innerText()).toLowerCase();
      await page.locator('.nav-btn', { hasText: 'CLUBES' }).click(); await page.waitForTimeout(60);
      await page.locator('.nav-btn', { hasText: 'MEU TIME' }).click(); await page.waitForTimeout(60);
      await page.locator('.nav-btn', { hasText: 'PARTIDA' }).click(); await page.waitForTimeout(60);
      o = await openMeuTime(page, log);
      const on = o.ok ? (await page.locator('.modal .seg-btn.on').allInnerTexts()).map((x) => x.toLowerCase()) : [];
      await continueMatch(page, 'CANCELAR');
      await page.clock.runFor(500 * 2);
      const v2 = (await team(page))[kind];
      step(`${kind === 'style' ? 'estilo' : 'comportamento'} ${label}: registrado, placar mostra, reabertura mostra, troca de aba não perde, jogo continua com ele`, c.ok && v1 === id && v2 === id && sb.includes(label.toLowerCase()) && on.includes(label.toLowerCase()), JSON.stringify({ v1, v2, sb, on, c: c.why }));
      await afterChange(`${kind} ${label}`);
    }
  };
  await tacticsLoop('style', [['DEFENSIVE', 'Defensivo'], ['BALANCED', 'Equilibrado'], ['OFFENSIVE', 'Ofensivo']]);
  await tacticsLoop('behavior', [['NORMAL', 'Normal'], ['AGGRESSIVE', 'Agressivo'], ['REACTIVE', 'Reativo']]);

  // 7. substituições pelo pop-up até o limite; depois o limite é respeitado
  const subsDone = [];
  for (let k = 0; k < MAX_SUBS + 1; k++) {
    o = await openMeuTime(page, log); if (!o.ok) { step(`substituição ${k + 1}: abrir`, false, o.why); break; }
    const t = await team(page);
    if (t.subsUsed >= MAX_SUBS) {
      const txt = (await page.locator('.modal').innerText()).toLowerCase();
      const pickerGone = (await page.locator('.modal select[aria-label="sai"]').count()) === 0;
      const engine = await page.evaluate((ids) => { const r = globalThis.__fm.session.adjustTeam({ substitutions: [{ out: ids[0], in: ids[1] }] }); return r.ok ? 'aceitou' : r.error; }, [t.onField.find((x) => x.sector !== 'GK').id, t.bench[0] ?? 'x']);
      await continueMatch(page, 'CANCELAR');
      step(`limite de ${MAX_SUBS} substituições: pop-up avisa e esconde a troca; o engine recusa a 6ª (${engine})`, txt.includes('limite de substituições atingido') && pickerGone && engine !== 'aceitou', JSON.stringify({ pickerGone, engine }));
      break;
    }
    const out = t.onField.filter((x) => x.sector !== 'GK' && !subsDone.some((s) => s.in === x.id))[k % 3 === 0 ? 0 : 1];
    const inn = t.bench.find((id) => true);
    if (!out || !inn) { step(`substituição ${k + 1}`, false, 'sem jogador para trocar'); await continueMatch(page, 'CANCELAR'); break; }
    await page.locator('.modal select[aria-label="sai"]').selectOption(out.id);
    await page.locator('.modal select[aria-label="entra"]').selectOption(inn);
    await clickIn(page, '.modal', 'TROCAR', true);
    c = await continueMatch(page);
    const after = await team(page);
    const outGone = !after.onField.some((x) => x.id === out.id) && after.subbedOff.includes(out.id);
    const inOn = after.onField.find((x) => x.id === inn);
    step(`substituição ${k + 1}: sai ${out.name}, entra reserva no mesmo setor (${out.sector}); trocas ${after.subsUsed}`, c.ok && outGone && inOn?.sector === out.sector && after.subsUsed === t.subsUsed + 1, JSON.stringify({ outGone, inSector: inOn?.sector, subs: after.subsUsed, c: c.why }));
    subsDone.push({ out: out.id, in: inn });
    await afterChange(`substituição ${k + 1}`);
  }

  // 8. até o fim: ninguém que saiu volta; invariantes finais
  await playToEnd(page, log);
  const end = await page.evaluate((outs) => {
    const c = globalThis.__fm; const r = c.state.snapshot.round; const uid = c.state.career.userClubId;
    const m = r.matches.find((x) => x.home.clubId === uid || x.away.clubId === uid); const t = m.home.clubId === uid ? m.home : m.away;
    const ids = t.onField.map((s) => s.playerId);
    return { status: m.status, score: `${m.score.home}-${m.score.away}`, back: outs.filter((id) => ids.includes(id)), gk: t.onField.filter((s) => s.sector === 'GK').length, dup: new Set(ids).size !== ids.length, subs: t.subsUsed, style: t.style, behavior: t.behavior,
      digest: JSON.stringify({ events: m.events.map((e) => `${e.clock.half}|${e.clock.minute}|${e.clock.added} ${e.type} ${e.playerId ?? ''} ${e.relatedPlayerId ?? ''}`), field: t.onField, cmds: m.commands.map((x) => `${x.origin} ${x.command.type} ${JSON.stringify(x.command.substitutions ?? null)} ${JSON.stringify(x.command.positions ?? null)} ${x.command.style ?? ''} ${x.command.behavior ?? ''}`) }) };
  }, subsDone.map((s) => s.out));
  step(`fim do jogo (${end.score}): nenhum substituído voltou, 1 GK, sem duplicados, ${end.subs} trocas, tática final mantida (Ofensivo/Reativo)`, end.status === 'FINISHED' && end.back.length === 0 && end.gk === 1 && !end.dup && end.subs <= MAX_SUBS && end.style === 'OFFENSIVE' && end.behavior === 'REACTIVE', JSON.stringify({ ...end, digest: undefined }));
  R.notes.decisoesNoFluxo = log;
  if (errors.length) step('console', false, errors.join(' | ').slice(0, 200));
  await ctx.close();
  return { steps, digest: end.digest };
}

const a = await mainFlow('a');
for (const s of a.steps) check(s.name, s.ok, s.why);
check(`aba MEU TIME durante a partida: consulta (campo desativado + aviso para usar o botão da PARTIDA); relógio ${R.notes.abaAoVivo.relogioContinua ? 'continua' : 'para'}`, R.notes.abaAoVivo.notice && R.notes.abaAoVivo.chipsDisabled && R.notes.abaAoVivo.chips === 11, JSON.stringify(R.notes.abaAoVivo));
const b = await mainFlow('b');
check('determinismo: o mesmo roteiro de MEU TIME (mesma seed, mesmos cliques) dá exatamente o mesmo jogo (eventos, comandos, escalação final)', a.digest === b.digest);

// =============== BATEDOR DE PÊNALTI ===============
async function penaltyFlow(mode) {
  const { ctx, page, errors } = await open(SAVES.penalti, 'INSTANTÂNEA');
  // antes da rodada: aba MEU TIME, escolhe como batedor o jogador de linha MAIS FRACO (≠ escolha automática)
  await page.locator('.nav-btn', { hasText: 'MEU TIME' }).click(); await page.waitForTimeout(80);
  const sel = page.locator('label.field select');
  const chosen = await sel.evaluate((s) => { const opts = [...s.options].filter((o) => o.value); const strength = (o) => Number(/\((\d+)\)/.exec(o.textContent)?.[1] ?? 0); opts.sort((x, y) => strength(x) - strength(y)); return { id: opts[0].value, label: opts[0].textContent }; });
  await sel.selectOption(chosen.id); await page.waitForTimeout(80);
  const savedTaker = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).userLineup?.penaltyTakerId ?? null, SAVE_KEY).catch(() => null);
  const shownAfter = await sel.inputValue();
  await page.locator('.nav-btn', { hasText: 'PARTIDA' }).click(); await page.waitForTimeout(80);
  await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
  await page.waitForSelector('.modal-back', { timeout: 10000 });
  const title = await modalTitle(page);
  const st = await team(page);
  const sugName = (await page.locator('.modal .prow:has(.badge) .prow-name').first().innerText().catch(() => '')).trim();
  const chosenName = await page.evaluate((id) => { const c = globalThis.__fm; const m = c.pendingMatch(); const t = m.home.clubId === c.state.career.userClubId ? m.home : m.away; return t.players[id]?.name ?? null; }, chosen.id);
  let kicker = null;
  if (mode === 'aceitar') { await clickIn(page, '.modal footer', 'ACEITAR SUGESTÃO', true); kicker = chosen.id; }
  else { const row = page.locator('.modal .prow:not(:has(.badge))').first(); const nm = (await row.locator('.prow-name').innerText()).trim(); kicker = await page.evaluate((n) => { const c = globalThis.__fm; const m = c.pendingMatch(); const t = m.home.clubId === c.state.career.userClubId ? m.home : m.away; return Object.values(t.players).find((p) => p.name === n)?.id; }, nm); await row.click(); }
  await page.waitForTimeout(50);
  // a cobrança acontece no minuto seguinte; segue até o fim resolvendo o resto com a sugestão
  await playToEnd(page, []);
  const kick = await page.evaluate(() => { const c = globalThis.__fm; const r = c.state.snapshot.round; const uid = c.state.career.userClubId; const m = r.matches.find((x) => x.home.clubId === uid || x.away.clubId === uid); const side = m.home.clubId === uid ? 'home' : 'away'; const e = m.events.find((x) => (x.type === 'PENALTY_GOAL' || x.type === 'PENALTY_MISSED') && x.side === side); return e ? { by: e.playerId, type: e.type } : null; });
  await ctx.close();
  return { title, chosen, chosenName, sugName, savedTaker, shownAfter, lineupTaker: st.penaltyTakerId, kicker, kick, errors };
}
const p1 = await penaltyFlow('aceitar');
check(`batedor: escolhido na aba MEU TIME (${p1.chosenName}) fica salvo, vira o batedor do jogo e o SUGERIDO do pop-up de pênalti`, p1.shownAfter === p1.chosen.id && p1.lineupTaker === p1.chosen.id && p1.title === 'PÊNALTI PARA O SEU TIME' && p1.sugName === p1.chosenName, JSON.stringify({ ...p1, errors: undefined }));
check(`batedor: ACEITAR SUGESTÃO → a cobrança é do batedor escolhido (${p1.kick?.type})`, p1.kick?.by === p1.chosen.id, JSON.stringify(p1.kick));
const p2 = await penaltyFlow('outro');
check(`batedor: no pop-up do pênalti o usuário ainda pode escolher outro cobrador, e é ele quem cobra (${p2.kick?.type})`, p2.kick?.by === p2.kicker && p2.kicker !== p2.chosen.id, JSON.stringify({ kicker: p2.kicker, chosen: p2.chosen.id, kick: p2.kick }));
if (p1.errors.length || p2.errors.length) R.errors.push(...p1.errors, ...p2.errors);

// =============== INTERAÇÃO COM DECISÕES (A–F) ===============
{
  const { ctx, page, errors } = await open(SAVES.expulsao);
  const log = [];
  await page.getByRole('button', { name: 'JOGAR RODADA' }).click();
  await page.clock.runFor(500 * 10);
  // A) sem decisão pendente: abre e fecha
  let o = await openMeuTime(page, log); let c = await continueMatch(page, 'CANCELAR');
  check('A) MEU TIME sem decisão pendente: abre, pausa, volta e retoma', o.ok && c.ok, o.why + c.why);
  // até a decisão obrigatória (expulsão aos 36')
  for (let g = 0; g < 200 && !(await page.locator('.modal-back').count()) && !(await finished(page)); g++) await page.clock.runFor(500);
  const dec = await modalTitle(page);
  // B) com decisão pendente: botão MEU TIME desativado, aba coberta pelo pop-up, engine recusa; a decisão continua resolvível
  const btnDisabled = await page.locator('.controls').getByRole('button', { name: 'MEU TIME', exact: true }).isDisabled().catch(() => null);
  let tabBlocked = false; try { await page.locator('.nav-btn', { hasText: 'MEU TIME' }).click({ timeout: 800 }); } catch { tabBlocked = true; }
  const engine = await page.evaluate(() => { const r = globalThis.__fm.session.openTeamAdjustment(); return r.ok ? 'aceitou' : r.error; });
  const stillDec = await modalTitle(page);
  const confirmVisible = await page.locator('.modal footer').getByRole('button', { name: 'CONTINUAR', exact: true }).isVisible();
  check(`B) com a decisão "${dec}" pendente: MEU TIME não abre (botão desativado=${btnDisabled}, aba coberta=${tabBlocked}, engine ${engine}) e a decisão continua visível e resolvível`, dec === 'EXPULSÃO' && btnDisabled === true && tabBlocked && engine === 'INVALID_STATUS' && stillDec === dec && confirmVisible);
  // C) resolve
  await clickIn(page, '.modal footer', 'CONTINUAR', true);
  const afterC = await team(page);
  check('C) decisão resolvida: 10 em campo, expulso fora, partida retoma', afterC.onField.length === 10 && afterC.sentOff.length === 1 && afterC.pending === null && (await invariants(page)).length === 0, JSON.stringify({ n: afterC.onField.length, sentOff: afterC.sentOff }));
  await page.clock.runFor(500 * 2);
  // D) reabre; E) altera (com 10 a formação fica como está: troca posição + estilo + comportamento + substituição); F) volta
  o = await openMeuTime(page, log);
  const formNote = (await page.locator('.modal').innerText()).toLowerCase().includes('com um jogador a menos a formação fica como está');
  const t = await team(page);
  const pa = t.onField.find((x) => x.sector === 'MID'), pb = t.onField.find((x) => x.sector === 'DEF');
  await page.locator('.modal select[aria-label="a"]').selectOption(pa.id); await page.locator('.modal select[aria-label="b"]').selectOption(pb.id); await clickIn(page, '.modal', 'TROCAR POSIÇÕES', true);
  await page.locator('.modal .seg-btn', { hasText: /^Defensivo$/i }).first().click();
  await page.locator('.modal .seg-btn', { hasText: /^Agressivo$/i }).first().click();
  const out = t.onField.find((x) => x.sector === 'ATT') ?? t.onField.find((x) => x.sector === 'MID' && x.id !== pa.id);
  await page.locator('.modal select[aria-label="sai"]').selectOption(out.id); await page.locator('.modal select[aria-label="entra"]').selectOption(t.bench[0]); await clickIn(page, '.modal', 'TROCAR', true);
  c = await continueMatch(page);
  const afterE = await team(page);
  const ok = o.ok && formNote && c.ok && afterE.style === 'DEFENSIVE' && afterE.behavior === 'AGGRESSIVE' && afterE.onField.find((x) => x.id === pa.id)?.sector === 'DEF' && afterE.onField.find((x) => x.id === pb.id)?.sector === 'MID' && afterE.onField.some((x) => x.id === t.bench[0]) && !afterE.onField.some((x) => x.id === out.id) && afterE.onField.length === 10 && !afterE.onField.some((x) => afterC.sentOff.includes(x.id));
  check('D/E/F) reabre MEU TIME após a decisão, troca posição + estilo + comportamento + substituição com 10 em campo, volta e retoma; expulso não volta', ok && (await invariants(page)).length === 0, JSON.stringify({ o: o.why, formNote, c: c.why, style: afterE.style, behavior: afterE.behavior, n: afterE.onField.length }));
  await playToEnd(page, log);
  const fin = await page.evaluate(() => { const c = globalThis.__fm; const r = c.state.snapshot.round; const uid = c.state.career.userClubId; const m = r.matches.find((x) => x.home.clubId === uid || x.away.clubId === uid); const t = m.home.clubId === uid ? m.home : m.away; return { status: m.status, style: t.style, behavior: t.behavior, back: t.onField.some((s) => t.sentOff.includes(s.playerId) || t.subbedOff.includes(s.playerId)) }; });
  check('fim: tática da etapa E mantida até o apito final, ninguém expulso/substituído voltou', fin.status === 'FINISHED' && fin.style === 'DEFENSIVE' && fin.behavior === 'AGGRESSIVE' && !fin.back, JSON.stringify(fin));
  if (errors.length) R.errors.push(...errors);
  await ctx.close();
}

await browser.close();
check('sem erros de console', R.errors.length === 0, R.errors.slice(0, 2).join(' | '));
check('sem overflow / corte / sobreposição (aba ao vivo e pop-up MEU TIME)', R.layout.length === 0, R.layout.slice(0, 3).join(' | '));
mkdirSync(join(ROOT, 'dist/qa'), { recursive: true });
writeFileSync(join(ROOT, 'dist/qa', `myteam-${W}.json`), JSON.stringify(R, null, 1));
const bad = Object.values(R.checks).filter((v) => v !== 'ok').length;
console.log(`RESUMO [${W}]: ${Object.keys(R.checks).length - bad}/${Object.keys(R.checks).length} ok; decisões no fluxo principal: ${JSON.stringify(R.notes.decisoesNoFluxo)}`);
process.exit(failed ? 1 : 0);
