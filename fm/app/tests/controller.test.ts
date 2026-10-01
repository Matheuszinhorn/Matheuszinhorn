import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseFormation } from '../../engine/index.ts';
import { resolveUserLineup, userClub } from '../../game/career.ts';
import type { Scheduler } from '../../game/session.ts';
import { GameController, SAVE_KEY, SPEED_KEY, memoryStorage } from '../src/controller.ts';

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
    if (snap.status === 'AWAITING_DECISION' && snap.pending) {
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
  assert.equal(ctrl.state.screen, 'START');
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
  assert.equal(userClub(career!).money, before + outcome!.ledger.net);
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

test('velocidade: as cinco existem, a escolha é lembrada, a pausa do jogador segura o relógio e o instantâneo só para em decisão ou no fim', () => {
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
  b.ctrl.setSpeed('VERY_FAST');
  assert.equal(b.storage.get(SPEED_KEY), 'VERY_FAST');
  assert.equal(boot(b.storage).ctrl.state.speed, 'VERY_FAST');
});

test('velocidade instantânea: joga sem esperar temporizador e só para em uma decisão do jogador ou no fim da rodada', () => {
  const b = startedCareer();
  b.ctrl.setSpeed('INSTANT');
  b.ctrl.startRound();
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
