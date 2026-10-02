import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRound, parseFormation, roundResults, simulateRound } from '../../engine/index.ts';
import { ROUNDS_PER_SEASON, finishRound, isSeasonOver, planRound, resolveUserLineup, serializeCareer, userClub } from '../../game/career.ts';
import type { Scheduler } from '../../game/session.ts';
import { GameController, OFFERS_KEY, PROFILE_KEY, SAVE_KEY, SPEED_KEY, UI_SPEEDS, memoryStorage } from '../src/controller.ts';

// Fluxo do app sem tela: iniciar carreira, jogar rodadas (com decisões), editar o time, salvar e continuar.

class ManualScheduler implements Scheduler {
  private seq = 0;
  private timers = new Map<number, () => void>();
  setTimeout(cb: () => void): unknown {
    const id = ++this.seq;
    this.timers.set(id, cb);
    return id;
  }
  clearTimeout(handle: unknown): void {
    this.timers.delete(handle as number);
  }
  fireNext(): boolean {
    const first = this.timers.entries().next();
    if (first.done) return false;
    this.timers.delete(first.value[0]);
    first.value[1]();
    return true;
  }
}

function boot(storage = memoryStorage()) {
  const sched = new ManualScheduler();
  const ctrl = new GameController({ storage, scheduler: sched, randomSeed: () => 'semente-app', toastMs: 0 });
  return { ctrl, sched, storage };
}

function startedCareer() {
  const b = boot();
  b.ctrl.offerClubs('semente-app');
  b.ctrl.startCareer('Marcos Vilela', b.ctrl.state.offers!.clubIds[1]);
  return b;
}

/** Joga a rodada até ela ser aplicada à carreira, resolvendo toda decisão como o jogador faria (aceitando a sugestão). */
function playRound(b: ReturnType<typeof boot>): number {
  const { ctrl, sched } = b;
  ctrl.startRound();
  let decisions = 0;
  for (let guard = 0; ctrl.state.phase !== 'POST'; guard++) {
    assert.ok(guard < 6000, 'a rodada deveria terminar');
    const snap = ctrl.state.snapshot;
    if (snap.stop && snap.status === 'PAUSED') {
      ctrl.continueStop(); // intervalo ou lance importante: a tela mostra o resumo e o jogador toca CONTINUAR
    } else if (snap.status === 'AWAITING_DECISION' && snap.pending) {
      const d = snap.pending.decision;
      if (d.type === 'PENALTY_TAKER') ctrl.choosePenaltyTaker(d.suggested ?? d.eligible[0]);
      else ctrl.acceptSuggestion();
      decisions += 1;
      assert.notEqual(ctrl.state.snapshot.pending?.decision.id, d.id, 'a decisão foi resolvida');
    } else assert.ok(sched.fireNext(), 'sem temporizador e sem decisão: travou');
  }
  return decisions;
}

test('iniciar carreira: treinador + clube da oferta → tela PARTIDA antes da rodada 1, carreira salva', () => {
  const { ctrl, storage } = boot();
  assert.equal(ctrl.state.screen, 'ENTRY');
  assert.equal(ctrl.state.hasSave, false);
  ctrl.offerClubs('semente-app');
  assert.equal(ctrl.state.offers!.clubIds.length, 3);
  ctrl.startCareer('Marcos Vilela', ctrl.state.offers!.clubIds[0]);
  assert.equal(ctrl.state.screen, 'MATCH');
  assert.equal(ctrl.state.phase, 'PRE');
  assert.equal(ctrl.state.career!.roundNumber, 1);
  assert.ok(storage.get(SAVE_KEY));
  assert.equal(ctrl.state.hasSave, true);
  // nome vazio é recusado com aviso, sem criar carreira
  const b2 = boot();
  b2.ctrl.offerClubs('semente-app');
  b2.ctrl.startCareer('   ', b2.ctrl.state.offers!.clubIds[0]);
  assert.equal(b2.ctrl.state.career, null);
  assert.equal(b2.ctrl.state.toast?.kind, 'error');
});

test('continuar: outro controlador com a mesma memória carrega exatamente a carreira salva', () => {
  const a = startedCareer();
  playRound(a);
  const b = boot(a.storage);
  assert.equal(b.ctrl.state.hasSave, true);
  b.ctrl.continueCareer();
  assert.deepStrictEqual(b.ctrl.state.career, a.ctrl.state.career);
  assert.equal(b.ctrl.state.screen, 'MATCH');
  const broken = boot();
  broken.storage.set(SAVE_KEY, '{ruim');
  broken.ctrl.continueCareer();
  assert.equal(broken.ctrl.state.toast?.kind, 'error');
  assert.equal(broken.ctrl.state.career, null);
});

test('jogar uma rodada inteira: decisões resolvidas, resultado aplicado UMA vez, finanças e classificação atualizadas, fase POST', () => {
  const b = startedCareer();
  const before = userClub(b.ctrl.state.career!).money;
  const decisions = playRound(b);
  const { career, outcome } = b.ctrl.state;
  assert.ok(decisions >= 0);
  assert.equal(b.ctrl.state.phase, 'POST');
  assert.equal(career!.roundNumber, 2);
  assert.equal(career!.results.length, 40);
  assert.equal(userClub(career!).money, before + outcome!.ledger!.net + outcome!.extras.reduce((a, e) => a + e.amount, 0));
  assert.equal(b.ctrl.state.snapshot.status, 'ROUND_FINISHED');
  for (const side of ['home', 'away'] as const) assert.equal(b.ctrl.userMatch()![side].onField.filter((s) => s.sector === 'GK').length, 1);
  // Não dá para aplicar de novo: reiniciar a rodada não é permitido em POST.
  b.ctrl.startRound();
  assert.equal(b.ctrl.state.career!.roundNumber, 2);
  // Próxima rodada.
  b.ctrl.nextRound();
  assert.equal(b.ctrl.state.phase, 'PRE');
  assert.equal(b.ctrl.state.outcome, null);
  playRound(b);
  assert.equal(b.ctrl.state.career!.roundNumber, 3);
});

test('velocidade: as cinco existem no controlador (a tela mostra quatro), a escolha é lembrada, a pausa do jogador segura o relógio e o instantâneo só para em decisão ou no fim', () => {
  const b = startedCareer();
  for (const s of ['SLOW', 'NORMAL', 'FAST', 'VERY_FAST', 'INSTANT', 'NORMAL'] as const) {
    b.ctrl.setSpeed(s);
    assert.equal(b.ctrl.state.speed, s);
    assert.equal(b.ctrl.session.getState().speed, s);
  }
  b.ctrl.startRound();
  assert.equal(b.ctrl.state.snapshot.status, 'PLAYING');
  b.ctrl.pause();
  assert.equal(b.ctrl.state.snapshot.status, 'PAUSED');
  const minute = b.ctrl.userMatch()!.clock.minute;
  assert.equal(b.sched.fireNext(), false, 'pausada: nenhum temporizador pendente');
  b.ctrl.resume();
  assert.notEqual(b.ctrl.state.snapshot.status, 'PAUSED');
  assert.equal(b.ctrl.userMatch()!.clock.minute, minute);
  // A velocidade escolhida é lembrada num novo início.
  b.ctrl.setSpeed('FAST');
  assert.equal(b.storage.get(SPEED_KEY), 'FAST');
  assert.equal(boot(b.storage).ctrl.state.speed, 'FAST');
});

test('velocidade instantânea: joga sem esperar temporizador e só para em uma decisão do jogador ou no fim da rodada', () => {
  const b = startedCareer();
  b.ctrl.setSpeed('INSTANT');
  b.ctrl.startRound();
  // o intervalo (e lances importantes do jogo do treinador) também param o instantâneo: CONTINUAR segue
  while (b.ctrl.state.snapshot.stop && b.ctrl.state.snapshot.status === 'PAUSED') b.ctrl.continueStop();
  const snap = b.ctrl.state.snapshot;
  assert.ok(snap.status === 'AWAITING_DECISION' || snap.status === 'ROUND_FINISHED', `parou em ${snap.status}`);
  assert.equal(b.sched.fireNext(), false, 'nenhum temporizador foi necessário');
  if (snap.status === 'AWAITING_DECISION') {
    b.ctrl.acceptSuggestion();
    assert.notEqual(b.ctrl.state.snapshot.pending?.decision.id, snap.pending!.decision.id);
  }
});

test('CLUBES durante a rodada pausa a sessão e sair retoma; o resultado não muda', () => {
  const b = startedCareer();
  b.ctrl.startRound();
  assert.equal(b.ctrl.state.snapshot.status, 'PLAYING');
  b.ctrl.go('CLUBS');
  assert.equal(b.ctrl.state.snapshot.status, 'PAUSED');
  assert.deepStrictEqual(b.ctrl.state.snapshot.pauses, ['CLUBS']);
  b.ctrl.go('MATCH');
  assert.equal(b.ctrl.state.snapshot.status, 'PLAYING');
});

test('MEU TIME: trocar titular por reserva, mudar formação, estilo e comportamento; escalação inválida é recusada com aviso', () => {
  const b = startedCareer();
  const { ctrl } = b;
  const club = () => userClub(ctrl.state.career!);
  const lineup = () => resolveUserLineup(ctrl.state.career!).lineup;
  const players = () => ctrl.state.career!.world.players;
  const starter = lineup().starters.find((s) => s.sector === 'ATT')!.playerId;
  const bench = lineup().bench.find((id) => players()[id].position !== 'GK')!;
  ctrl.selectPlayer(starter);
  assert.equal(ctrl.state.selected, starter);
  ctrl.selectPlayer(bench);
  assert.equal(ctrl.state.selected, null);
  assert.ok(lineup().starters.some((s) => s.playerId === bench), 'o reserva agora é titular');
  ctrl.setFormation(parseFormation('3-5-2'));
  assert.equal(lineup().starters.filter((s) => s.sector === 'MID').length, 5);
  ctrl.setTactics({ style: 'OFFENSIVE', behavior: 'AGGRESSIVE' });
  assert.equal(lineup().style, 'OFFENSIVE');
  assert.equal(lineup().behavior, 'AGGRESSIVE');
  const taker = lineup().starters.find((s) => s.sector === 'ATT')!.playerId;
  ctrl.setPenaltyTaker(taker);
  assert.equal(lineup().penaltyTakerId, taker);
  ctrl.bestTeam();
  assert.equal(lineup().style, 'OFFENSIVE', 'MELHOR TIME mantém a tática');
  // Dois reservas não trocam entre si: aviso, nada muda.
  const before = JSON.stringify(ctrl.state.career!.userLineup);
  ctrl.selectPlayer(lineup().bench[0]);
  ctrl.selectPlayer(lineup().bench[1]);
  assert.equal(ctrl.state.toast?.kind, 'error');
  assert.equal(JSON.stringify(ctrl.state.career!.userLineup), before);
  // A escolha é salva e vai a campo.
  assert.ok(ctrl.state.hasSave);
  ctrl.startRound();
  const match = ctrl.userMatch()!;
  const side = match.home.clubId === club().id ? 'home' : 'away';
  assert.equal(match[side].style, 'OFFENSIVE');
  assert.equal(match[side].behavior, 'AGGRESSIVE');
  // Durante a partida a edição direta é bloqueada.
  ctrl.setTactics({ style: 'DEFENSIVE' });
  assert.equal(ctrl.state.toast?.kind, 'error');
  assert.equal(resolveUserLineup(ctrl.state.career!).lineup.style, 'OFFENSIVE');
});

test('MEU TIME durante a partida: abre a decisão, envia trocas e CONTINUAR devolve o jogo', () => {
  const b = startedCareer();
  const { ctrl, sched } = b;
  ctrl.startRound();
  for (let i = 0; i < 5; i++) sched.fireNext();
  ctrl.openTeamAdjustment();
  assert.equal(ctrl.state.snapshot.status, 'AWAITING_DECISION');
  assert.equal(ctrl.state.snapshot.pending?.decision.type, 'TEAM_ADJUSTMENT');
  assert.equal(ctrl.sendAdjustment({ style: 'DEFENSIVE' }), true);
  assert.notEqual(ctrl.state.snapshot.status, 'AWAITING_DECISION');
  const m = ctrl.userMatch()!;
  assert.equal(m[m.home.clubId === ctrl.state.career!.userClubId ? 'home' : 'away'].style, 'DEFENSIVE');
});

test('abandonar a carreira apaga o salvamento e volta ao início', () => {
  const b = startedCareer();
  b.ctrl.abandonCareer();
  assert.equal(b.ctrl.state.screen, 'START');
  assert.equal(b.storage.get(SAVE_KEY), null);
  assert.equal(b.ctrl.state.hasSave, false);
});

test('recarregar no fim da temporada (após a rodada 38, antes de INICIAR TEMPORADA): a carreira não trava e a virada funciona', () => {
  const a = startedCareer();
  // avança a carreira até o fim da temporada com rodadas só da CPU (mesmas funções do jogo) e salva como o app salva
  let c = a.ctrl.state.career!;
  while (!isSeasonOver(c)) {
    const plan = planRound(c);
    c = finishRound(c, roundResults(simulateRound(createRound(plan.roundId, plan.seed, plan.fixtures, null)))).career;
  }
  assert.ok(c.pendingPromotion);
  a.storage.set(SAVE_KEY, serializeCareer(c));
  // "recarregar": outro controlador, mesma memória
  const b = boot(a.storage);
  b.ctrl.continueCareer();
  assert.equal(b.ctrl.state.career!.roundNumber, ROUNDS_PER_SEASON + 1);
  assert.equal(b.ctrl.state.phase, 'POST', 'temporada encerrada volta na tela de fim de temporada');
  b.ctrl.startRound(); // não pode tentar jogar a "rodada 39"
  assert.notEqual(b.ctrl.state.toast?.kind, 'error');
  b.ctrl.nextRound(); // INICIAR TEMPORADA
  const n = b.ctrl.state.career!;
  assert.equal(n.season, c.season + 1);
  assert.equal(n.roundNumber, 1);
  assert.equal(n.pendingPromotion, null);
  assert.equal(b.ctrl.state.phase, 'PRE');
  playRound(b);
  assert.equal(b.ctrl.state.career!.roundNumber, 2);
});

test('tela inicial e saves: só oferece CONTINUAR com save carregável; corrompido/incompatível avisa em português', () => {
  const valid = startedCareer().storage.get(SAVE_KEY)!;
  const cases: [string, string | null, boolean, boolean][] = [
    ['sem save', null, false, false],
    ['vazio', '', false, false],
    ['corrompido', '{ruim', false, true],
    ['versão 2', JSON.stringify({ ...JSON.parse(valid), version: 2 }), false, true],
    ['clube inexistente', JSON.stringify({ ...JSON.parse(valid), userClubId: 'clb-nao-existe' }), false, true],
    ['válido', valid, true, false],
  ];
  for (const [name, raw, hasSave, problem] of cases) {
    const storage = memoryStorage();
    if (raw !== null) storage.set(SAVE_KEY, raw);
    const b = boot(storage);
    assert.equal(b.ctrl.state.hasSave, hasSave, name);
    assert.equal(b.ctrl.state.saveProblem !== null, problem, name);
    b.ctrl.continueCareer();
    if (hasSave) assert.ok(b.ctrl.state.career, name);
    else {
      assert.equal(b.ctrl.state.career, null, name);
      assert.equal(b.ctrl.state.toast?.kind, 'error', name);
      assert.doesNotMatch(b.ctrl.state.toast!.text, /Cannot|undefined|reading/, name);
    }
    // o que estava salvo não é apagado só por abrir o jogo
    assert.equal(storage.get(SAVE_KEY), raw, name);
  }
});

test('NOVA CARREIRA na mesma página: a carreira nova joga a rodada (antes ficava presa em "Preparando a rodada…")', () => {
  // depois de uma rodada jogada
  const a = startedCareer();
  playRound(a);
  a.ctrl.nextRound();
  a.ctrl.abandonCareer();
  a.ctrl.offerClubs('nova-carreira');
  a.ctrl.startCareer('Outro Treinador', a.ctrl.state.offers!.clubIds[0]);
  assert.equal(a.ctrl.state.snapshot.status, 'IDLE', 'a sessão nova começa sem rodada');
  playRound(a);
  assert.equal(a.ctrl.state.phase, 'POST');
  assert.equal(a.ctrl.state.career!.roundNumber, 2);
  assert.equal(a.ctrl.state.career!.results.length, 40);

  // no meio de uma rodada em andamento: o relógio da sessão antiga para e não mexe na carreira nova
  const b = startedCareer();
  b.ctrl.startRound();
  assert.ok(b.sched.fireNext());
  assert.equal(b.ctrl.state.phase, 'LIVE');
  b.ctrl.abandonCareer();
  assert.equal(b.ctrl.state.phase, 'PRE');
  b.ctrl.offerClubs('nova-carreira-2');
  b.ctrl.startCareer('Outro', b.ctrl.state.offers!.clubIds[1]);
  const career = b.ctrl.state.career;
  playRound(b);
  assert.equal(b.ctrl.state.career!.roundNumber, 2);
  assert.equal(b.ctrl.state.career!.seed, career!.seed);
  assert.equal(b.ctrl.state.career!.results.length, 40);
});

// ---------- ELITE MANAGER: entrada, propostas, sem clube, gestão ----------

test('entrada: perfil LOCAL (sem senha), Google não finge login, online em desenvolvimento, carreira offline abre o início', () => {
  const { ctrl, storage } = boot();
  assert.equal(ctrl.state.screen, 'ENTRY');
  ctrl.enter();
  assert.equal(ctrl.state.screen, 'ENTRY', 'sem perfil não entra');
  ctrl.googleLogin();
  assert.equal(ctrl.state.screen, 'ENTRY');
  assert.match(ctrl.state.toast!.text, /online/i);
  ctrl.createProfile('  Ana  ');
  assert.equal(ctrl.state.screen, 'MODE');
  assert.equal(JSON.parse(storage.get(PROFILE_KEY)!).name, 'Ana');
  ctrl.chooseMode('ONLINE');
  assert.equal(ctrl.state.screen, 'MODE');
  ctrl.chooseMode('OFFLINE');
  assert.equal(ctrl.state.screen, 'START');
  // o perfil é lembrado
  const again = boot(storage);
  assert.equal(again.ctrl.state.profile!.name, 'Ana');
  again.ctrl.enter();
  assert.equal(again.ctrl.state.screen, 'MODE');
});

test('propostas iniciais: três, sem sortear de novo; recusar marca; AGUARDAR começa sem clube e o mundo joga', () => {
  const b = boot();
  b.ctrl.offerClubs('semente-app');
  const first = b.ctrl.state.offers!.clubIds;
  b.ctrl.offerClubs(); // sem seed: não sorteia outra
  assert.deepStrictEqual(b.ctrl.state.offers!.clubIds, first);
  b.ctrl.openProposal(first[0]);
  b.ctrl.analyzeProposal(true);
  assert.equal(b.ctrl.state.proposal!.analyze, true);
  b.ctrl.analyzeProposal(false);
  assert.deepStrictEqual(b.ctrl.state.proposal, { clubId: first[0], jobId: null, analyze: false }, 'voltar não perde a proposta');
  b.ctrl.refuseOffer(first[0]);
  assert.deepStrictEqual(b.ctrl.state.offers!.refused, [first[0]]);
  b.ctrl.waitForOffers('Sem Clube');
  const c = b.ctrl.state.career!;
  assert.equal(c.userClubId, null);
  assert.equal(b.ctrl.state.screen, 'MATCH');
  b.ctrl.go('MARKET');
  assert.equal(b.ctrl.state.screen, 'MATCH', 'sem clube não há mercado');
  let offers = b.ctrl.state.career!.manager!.jobs.offers.filter((o) => o.status === 'OPEN');
  for (let r = 0; r < 30 && offers.length === 0; r++) {
    playRound(b);
    b.ctrl.nextRound();
    offers = b.ctrl.state.career!.manager!.jobs.offers.filter((o) => o.status === 'OPEN');
  }
  assert.ok(offers.length > 0, 'propostas chegam enquanto o mundo joga');
  b.ctrl.acceptJob(offers[0].id);
  assert.equal(b.ctrl.state.career!.userClubId, offers[0].clubId);
  const round = b.ctrl.state.career!.roundNumber;
  playRound(b);
  assert.equal(b.ctrl.state.career!.roundNumber, round + 1);
});

test('gestão: ações bloqueadas durante a rodada, liberadas fora dela e salvas', () => {
  const b = startedCareer();
  const c = b.ctrl.state.career!;
  b.ctrl.startRound();
  b.ctrl.chooseSponsor(c.manager!.finance.sponsorOffers[0].id);
  assert.equal(b.ctrl.state.toast!.kind, 'error');
  assert.equal(b.ctrl.state.career!.manager!.finance.sponsor, null);
  for (let g = 0; b.ctrl.state.phase !== 'POST' && g < 6000; g++) {
    const s = b.ctrl.state.snapshot;
    if (s.stop && s.status === 'PAUSED') b.ctrl.continueStop();
    else if (s.status === 'AWAITING_DECISION') b.ctrl.acceptSuggestion();
    else b.sched.fireNext();
  }
  b.ctrl.chooseSponsor(c.manager!.finance.sponsorOffers[0].id);
  assert.ok(b.ctrl.state.career!.manager!.finance.sponsor);
  const saved = JSON.parse(b.storage.get(SAVE_KEY)!);
  assert.ok(saved.manager.finance.sponsor, 'a escolha foi salva');
});

test('velocidades da tela: só LENTA, NORMAL e RÁPIDA; MUITO RÁPIDA/INSTANTÂNEA salvas voltam como RÁPIDA', () => {
  for (const old of ['INSTANT', 'VERY_FAST']) {
    const storage = memoryStorage();
    storage.set(SPEED_KEY, old);
    assert.equal(boot(storage).ctrl.state.speed, 'FAST');
  }
  assert.deepStrictEqual(UI_SPEEDS, ['SLOW', 'NORMAL', 'FAST']);
});

test('anti-reroll: as 3 propostas sobrevivem a recarregar/reabrir, com as recusas; nada é sorteado de novo', () => {
  const a = boot();
  a.ctrl.offerClubs(); // seed aleatória (randomSeed do boot é fixa, então troca-se depois por outra)
  const first = a.ctrl.state.offers!;
  a.ctrl.refuseOffer(first.clubIds[0]);
  // "fechar e abrir": outro controlador com o mesmo armazenamento e OUTRA fonte de seed
  const b = new GameController({ storage: a.storage, scheduler: a.sched, randomSeed: () => 'outra-seed-qualquer', toastMs: 0 });
  assert.deepStrictEqual(b.state.offers, { ...first, refused: [first.clubIds[0]] }, 'mesmas propostas e mesma recusa após reabrir');
  b.offerClubs(); // pedir de novo não sorteia
  assert.deepStrictEqual(b.state.offers!.clubIds, first.clubIds);
  b.refuseOffer(first.clubIds[1]);
  b.refuseOffer(first.clubIds[2]);
  const c = new GameController({ storage: a.storage, scheduler: a.sched, randomSeed: () => 'mais-uma-seed', toastMs: 0 });
  assert.equal(c.state.offers!.refused.length, 3, 'recusou todas: continua sem novas (só AGUARDAR)');
  assert.deepStrictEqual(c.state.offers!.clubIds, first.clubIds);
  c.waitForOffers('Aguardando');
  assert.equal(a.storage.get(OFFERS_KEY), null, 'a carreira criada leva as propostas; a chave é limpa');
});
