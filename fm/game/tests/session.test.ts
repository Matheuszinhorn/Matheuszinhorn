import assert from 'node:assert/strict';
import { test } from 'node:test';
import { awaitingMatch, createRound, prepareFixture, stepRound, type Fixture, type MatchState, type RoundState } from '../../engine/index.ts';
import { cpuCommandFor } from '../../engine/match/cpu.ts';
import { D1, WORLD } from '../../engine/tests/helpers.ts';
import {
  createSession,
  SessionError,
  SPEED_ORDER,
  SPEEDS,
  type Scheduler,
  type Session,
  type SpeedId,
} from '../session.ts';

// A sessão fica ENTRE o engine e a interface. Aqui ela é testada com um temporizador falso e relógio virtual:
// nenhum teste espera tempo real, e a velocidade só pode mudar QUANDO stepRound é chamado, nunca o que ele calcula.

// ---------- Temporizador falso (relógio virtual) ----------

class FakeScheduler implements Scheduler {
  now = 0;
  requested: number[] = []; // ms de cada setTimeout pedido
  cleared = 0;
  private seq = 0;
  private timers = new Map<number, { at: number; ms: number; cb: () => void }>();

  setTimeout(cb: () => void, ms: number): unknown {
    const id = ++this.seq;
    this.requested.push(ms);
    this.timers.set(id, { at: this.now + ms, ms, cb });
    return id;
  }

  clearTimeout(handle: unknown): void {
    if (this.timers.delete(handle as number)) this.cleared += 1;
  }

  get pending(): number {
    return this.timers.size;
  }

  pendingMs(): number[] {
    return [...this.timers.values()].map((t) => t.ms);
  }

  private nextDue(limit: number): [number, { at: number; ms: number; cb: () => void }] | null {
    let best: [number, { at: number; ms: number; cb: () => void }] | null = null;
    for (const entry of this.timers) {
      if (entry[1].at <= limit && (best === null || entry[1].at < best[1].at)) best = entry;
    }
    return best;
  }

  /** Avança o relógio virtual, disparando os temporizadores vencidos em ordem. */
  advance(ms: number): void {
    const end = this.now + ms;
    for (let due = this.nextDue(end); due !== null; due = this.nextDue(end)) {
      this.timers.delete(due[0]);
      this.now = due[1].at;
      due[1].cb();
    }
    this.now = end;
  }

  /** Dispara o próximo temporizador (avançando o relógio até ele). Devolve false se não há nenhum. */
  fireNext(): boolean {
    const due = this.nextDue(Infinity);
    if (due === null) return false;
    this.timers.delete(due[0]);
    this.now = due[1].at;
    due[1].cb();
    return true;
  }
}

// ---------- Cenário ----------

const CONTROLLED = D1[0]; // mandante da 1ª partida

function fixtures(count = 6): Fixture[] {
  return Array.from({ length: count }, (_, i) =>
    prepareFixture(`S-P${i + 1}`, WORLD.clubs[D1[2 * i]], WORLD.clubs[D1[2 * i + 1]], WORLD.players),
  );
}

const controlledMatch = (round: RoundState): MatchState =>
  round.matches.find((m) => m.home.clubId === CONTROLLED || m.away.clubId === CONTROLLED) as MatchState;

const roundOf = (s: Session): RoundState => s.getState().round as RoundState;
const maxMinutes = (r: RoundState): number => Math.max(...r.matches.map((m) => m.minutesPlayed));

function newSession(speed: SpeedId, count = 6, controlled: string | null = null, seed = 'sessao') {
  const sched = new FakeScheduler();
  const session = createSession({ scheduler: sched, speed });
  session.startRound({ roundId: 'R1', seed, fixtures: fixtures(count), controlledClubId: controlled });
  return { sched, session };
}

/** Primeira seed de rodada em que o clube controlado recebe uma decisão obrigatória do próprio jogo (lesão, expulsão ou pênalti). */
let cachedSeed: string | null = null;
function decisionSeed(): string {
  if (cachedSeed) return cachedSeed;
  for (let i = 1; i <= 60; i++) {
    let r = createRound('R1', `dec-${i}`, fixtures(), CONTROLLED);
    for (let g = 0; g < 400 && !awaitingMatch(r) && r.matches.some((m) => m.status !== 'FINISHED'); g++) r = stepRound(r);
    if (awaitingMatch(r)) return (cachedSeed = `dec-${i}`);
  }
  throw new Error('nenhuma seed com decisão obrigatória encontrada');
}

/** O jogador aceita a sugestão do jogo. commandId próprio e determinístico (não depende da velocidade). */
function resolveDecision(session: Session): void {
  const round = roundOf(session);
  const match = awaitingMatch(round) as MatchState;
  const decision = match.decision as NonNullable<MatchState['decision']>;
  const command = { ...cpuCommandFor(match, decision), commandId: `jogador:${decision.id}` };
  const result = session.dispatch(command);
  assert.ok(result.ok, `decisão ${decision.type} deveria ser aceita`);
}

/** Roda a rodada até o fim, decidindo quando o jogo pede. Para timers falsos, dispara um por vez. */
function finish(session: Session, sched: FakeScheduler): void {
  for (let guard = 0; guard < 5000; guard++) {
    const status = session.getState().status;
    if (status === 'ROUND_FINISHED') return;
    if (status === 'AWAITING_DECISION') resolveDecision(session);
    else if (status === 'PLAYING') assert.ok(sched.fireNext(), 'PLAYING deveria ter um temporizador pendente');
    else throw new Error(`status inesperado: ${status}`);
  }
  throw new Error('a rodada não terminou');
}

// ---------- Velocidades ----------

test('as 5 velocidades têm os intervalos da especificação e o engine não conhece nenhuma delas', () => {
  assert.deepStrictEqual(SPEED_ORDER, ['SLOW', 'NORMAL', 'FAST', 'VERY_FAST', 'INSTANT']);
  assert.deepStrictEqual(
    SPEED_ORDER.map((s) => [SPEEDS[s].label, SPEEDS[s].intervalMs]),
    [['LENTA', 1000], ['NORMAL', 500], ['RÁPIDA', 250], ['MUITO RÁPIDA', 100], ['INSTANTÂNEA', 0]],
  );
  // Velocidade não entra no estado do jogo.
  const { session } = newSession('NORMAL');
  assert.ok(!JSON.stringify(roundOf(session)).toLowerCase().includes('speed'));
});

for (const speed of ['SLOW', 'NORMAL', 'FAST', 'VERY_FAST'] as const) {
  test(`velocidade ${SPEEDS[speed].label}: 1 minuto de jogo a cada ${SPEEDS[speed].intervalMs} ms, nem antes nem depois`, () => {
    const interval = SPEEDS[speed].intervalMs;
    const { sched, session } = newSession(speed, 4);
    assert.equal(session.getState().status, 'READY');
    assert.equal(sched.pending, 0, 'nada corre antes do play');

    session.play();
    assert.equal(session.getState().status, 'PLAYING');
    assert.deepStrictEqual(sched.pendingMs(), [interval]);

    sched.advance(interval - 1);
    assert.equal(maxMinutes(roundOf(session)), 0, 'um instante antes do intervalo, nada aconteceu');
    sched.advance(1);
    assert.equal(maxMinutes(roundOf(session)), 1);
    assert.deepStrictEqual(sched.pendingMs(), [interval], 'sempre um único temporizador pendente');
    sched.advance(interval * 9);
    assert.equal(maxMinutes(roundOf(session)), 10);

    // Até o fim: um pedido de espera por minuto de jogo, todos com o mesmo intervalo.
    const startTime = sched.now;
    while (session.getState().status === 'PLAYING') assert.ok(sched.fireNext());
    const round = roundOf(session);
    assert.equal(session.getState().status, 'ROUND_FINISHED');
    assert.equal(sched.requested.length, maxMinutes(round));
    assert.ok(sched.requested.every((ms) => ms === interval));
    assert.equal(sched.now - startTime, (maxMinutes(round) - 10) * interval);
    assert.ok(round.matches.every((m) => m.status === 'FINISHED' && m.minutesPlayed >= 90));
    assert.equal(session.results().length, 4);
  });
}

test('velocidade INSTANTÂNEA: a rodada inteira roda sem esperar e sem pedir nenhum temporizador', () => {
  const { sched, session } = newSession('INSTANT', 4);
  session.play();
  assert.equal(session.getState().status, 'ROUND_FINISHED');
  assert.equal(sched.requested.length, 0);
  assert.equal(sched.pending, 0);
  assert.ok(roundOf(session).matches.every((m) => m.status === 'FINISHED'));
  assert.equal(session.results().length, 4);
});

test('trocar de velocidade no meio reprograma o próximo minuto com o novo intervalo, sem mudar nada do jogo', () => {
  const { sched, session } = newSession('SLOW', 4);
  session.play();
  assert.deepStrictEqual(sched.pendingMs(), [1000]);
  sched.advance(3000);
  assert.equal(maxMinutes(roundOf(session)), 3);

  const before = JSON.stringify(roundOf(session));
  session.setSpeed('FAST');
  assert.equal(JSON.stringify(roundOf(session)), before, 'trocar a velocidade não altera o jogo');
  assert.deepStrictEqual(sched.pendingMs(), [250], 'um só temporizador, com o novo intervalo');
  assert.equal(session.getState().speed, 'FAST');

  session.setSpeed('INSTANT');
  assert.equal(session.getState().status, 'ROUND_FINISHED');
  assert.equal(sched.pending, 0);
  assert.throws(() => session.setSpeed('TURBO' as SpeedId), (e: unknown) => e instanceof SessionError && e.code === 'INVALID_SPEED');
});

// ---------- Temporizador injetável ----------

test('temporizador injetável: a sessão usa só o temporizador recebido e dispose() cancela o que estiver pendente', () => {
  const { sched, session } = newSession('NORMAL', 4);
  const calls = { emitted: 0 };
  session.subscribe(() => {
    calls.emitted += 1;
  });
  session.play();
  assert.equal(sched.requested.length, 1);
  sched.advance(1500);
  assert.equal(sched.requested.length, 4, 'um pedido por minuto avançado, todos no temporizador injetado');
  assert.ok(calls.emitted > 0);

  session.dispose();
  assert.equal(sched.pending, 0, 'dispose cancela o temporizador pendente');
  const frozen = JSON.stringify(roundOf(session));
  sched.advance(60_000);
  assert.equal(JSON.stringify(roundOf(session)), frozen, 'depois do dispose nada mais avança');
});

test('subscribe: recebe os estados e para de receber depois de cancelar a assinatura', () => {
  const { sched, session } = newSession('NORMAL', 2);
  const seen: string[] = [];
  const off = session.subscribe((snap) => seen.push(snap.status));
  session.play();
  sched.advance(500);
  assert.ok(seen.includes('PLAYING'));
  off();
  const count = seen.length;
  sched.advance(2000);
  assert.equal(seen.length, count);
});

// ---------- Pausas ----------

test('pausa USER: para o relógio, cancela o temporizador e só retoma no resume', () => {
  const { sched, session } = newSession('NORMAL', 4);
  session.play();
  sched.advance(1500);
  assert.equal(maxMinutes(roundOf(session)), 3);

  session.pause();
  const snap = session.getState();
  assert.equal(snap.status, 'PAUSED');
  assert.deepStrictEqual(snap.pauses, ['USER']);
  assert.equal(sched.pending, 0);
  const frozen = JSON.stringify(roundOf(session));
  sched.advance(100_000);
  assert.equal(JSON.stringify(roundOf(session)), frozen, 'nada acontece durante a pausa');

  session.resume();
  assert.equal(session.getState().status, 'PLAYING');
  assert.deepStrictEqual(sched.pendingMs(), [500]);
  sched.advance(500);
  assert.equal(maxMinutes(roundOf(session)), 4);
});

test('pausa CLUBES: pausa a rodada, e USER + CLUBES precisam ser liberadas separadamente', () => {
  const { sched, session } = newSession('NORMAL', 4);
  session.play();
  sched.advance(1000);
  const frozen = JSON.stringify(roundOf(session));

  session.openClubs();
  assert.equal(session.getState().status, 'PAUSED');
  assert.deepStrictEqual(session.getState().pauses, ['CLUBS']);
  assert.equal(sched.pending, 0);
  sched.advance(50_000);
  assert.equal(JSON.stringify(roundOf(session)), frozen, 'consultar clubes não avança nem altera a partida');

  session.pause(); // pausa do usuário por cima da consulta
  assert.deepStrictEqual([...session.getState().pauses].sort(), ['CLUBS', 'USER']);
  session.resume();
  assert.equal(session.getState().status, 'PAUSED', 'ainda em CLUBES');
  assert.equal(sched.pending, 0);
  session.closeClubs();
  assert.equal(session.getState().status, 'PLAYING');
  assert.equal(sched.pending, 1);
  sched.advance(500);
  assert.equal(maxMinutes(roundOf(session)), 3);
});

// ---------- Decisão obrigatória ----------

test('decisão obrigatória interrompe a simulação: nada avança, nenhum temporizador fica pendente, e a resposta retoma o jogo', () => {
  const { sched, session } = newSession('NORMAL', 6, CONTROLLED, decisionSeed());
  session.play();
  for (let g = 0; g < 400 && session.getState().status === 'PLAYING'; g++) sched.fireNext();

  const snap = session.getState();
  assert.equal(snap.status, 'AWAITING_DECISION');
  assert.ok(snap.pending);
  assert.equal(snap.pending?.decision.clubId, CONTROLLED);
  assert.equal(sched.pending, 0, 'sem temporizador enquanto o jogador decide');

  const frozen = JSON.stringify(roundOf(session));
  sched.advance(600_000);
  assert.equal(JSON.stringify(roundOf(session)), frozen, 'o tempo real passa, o jogo não');
  session.play(); // tentar andar de novo com a decisão aberta não faz nada
  assert.equal(sched.pending, 0);
  assert.equal(JSON.stringify(roundOf(session)), frozen);

  // Retomada: respondida a decisão, a rodada volta a andar sozinha.
  const minutesBefore = maxMinutes(roundOf(session));
  resolveDecision(session);
  assert.notEqual(session.getState().status, 'AWAITING_DECISION');
  assert.equal(session.getState().status, 'PLAYING');
  assert.deepStrictEqual(sched.pendingMs(), [500]);
  sched.advance(500);
  assert.equal(maxMinutes(roundOf(session)), minutesBefore + 1);
  finish(session, sched);
  assert.equal(session.getState().status, 'ROUND_FINISHED');
  assert.equal(session.results().length, 6);
});

test('decisão obrigatória pausa em QUALQUER velocidade, inclusive a instantânea, e é a mesma decisão em todas', () => {
  const seen = SPEED_ORDER.map((speed) => {
    const { sched, session } = newSession(speed, 6, CONTROLLED, decisionSeed());
    session.play();
    for (let g = 0; g < 400 && session.getState().status === 'PLAYING'; g++) assert.ok(sched.fireNext());
    const snap = session.getState();
    assert.equal(snap.status, 'AWAITING_DECISION', `${speed}: parou na decisão`);
    assert.equal(sched.pending, 0, `${speed}: sem temporizador pendente`);
    assert.ok(!roundOf(session).matches.every((m) => m.status === 'FINISHED'), `${speed}: a rodada não terminou por cima da decisão`);
    if (speed === 'INSTANT') assert.equal(sched.requested.length, 0, 'a instantânea não pede nenhuma espera');
    const frozen = JSON.stringify(roundOf(session));
    sched.advance(60_000);
    assert.equal(JSON.stringify(roundOf(session)), frozen);
    const d = snap.pending?.decision as NonNullable<MatchState['decision']>;
    return { matchId: snap.pending?.matchId, id: d.id, type: d.type, createdAt: d.createdAt, minutes: maxMinutes(roundOf(session)) };
  });
  for (const s of seen) assert.deepStrictEqual(s, seen[0], 'mesma decisão, no mesmo minuto, em todas as velocidades');
});

test('retomada respeita a pausa: resolver uma decisão com a pausa USER ligada não faz a rodada andar', () => {
  const { sched, session } = newSession('NORMAL', 6, CONTROLLED, decisionSeed());
  session.play();
  for (let g = 0; g < 400 && session.getState().status === 'PLAYING'; g++) sched.fireNext();
  assert.equal(session.getState().status, 'AWAITING_DECISION');

  session.pause();
  resolveDecision(session);
  assert.equal(session.getState().status, 'PAUSED');
  assert.equal(sched.pending, 0);
  session.resume();
  assert.equal(session.getState().status, 'PLAYING');
  assert.equal(sched.pending, 1);
});

// ---------- MEU TIME ----------

test('MEU TIME: pausa a partida do clube controlado a qualquer momento; CONTINUAR retoma; mudanças de estilo e comportamento valem', () => {
  for (const ticksBefore of [0, 1, 60]) {
    const { sched, session } = newSession('NORMAL', 4, CONTROLLED);
    session.play();
    // Conta minutos efetivamente jogados, não disparos do temporizador: se o jogo pedir uma decisão obrigatória
    // no caminho (lesão, expulsão, pênalti), o jogador responde e o aquecimento continua.
    for (let played = 0; played < ticksBefore; ) {
      if (session.getState().status === 'AWAITING_DECISION') {
        resolveDecision(session);
        continue;
      }

      assert.ok(sched.fireNext());
      played++;
    }

    const minutes = maxMinutes(roundOf(session));
    const opened = session.openTeamAdjustment();
    assert.ok(opened.ok, `aberto após ${ticksBefore} minutos`);
    const snap = session.getState();
    assert.equal(snap.status, 'AWAITING_DECISION');
    assert.equal(snap.pending?.decision.type, 'TEAM_ADJUSTMENT');
    assert.equal(sched.pending, 0, 'partida pausada: sem temporizador');
    sched.advance(60_000);
    assert.equal(maxMinutes(roundOf(session)), minutes, 'o relógio do jogo não avança durante o ajuste');

    const done = session.adjustTeam({ style: 'DEFENSIVE', behavior: 'REACTIVE' });
    assert.ok(done.ok);
    assert.equal(session.getState().status, 'PLAYING');
    const m = controlledMatch(roundOf(session));
    const team = m.home.clubId === CONTROLLED ? m.home : m.away;
    assert.equal(team.style, 'DEFENSIVE');
    assert.equal(team.behavior, 'REACTIVE');
    assert.deepStrictEqual(sched.pendingMs(), [500]);
  }
});

test('MEU TIME é recusado (INVALID_STATUS) enquanto há uma decisão obrigatória pendente: uma decisão por vez, e nada muda', () => {
  const { sched, session } = newSession('NORMAL', 6, CONTROLLED, decisionSeed());
  session.play();
  for (let g = 0; g < 400 && session.getState().status === 'PLAYING'; g++) assert.ok(sched.fireNext());

  // Uma decisão obrigatória do próprio jogo está aberta.
  const before = session.getState();
  assert.equal(before.status, 'AWAITING_DECISION');
  const pending = before.pending?.decision as NonNullable<MatchState['decision']>;
  assert.ok(pending);
  assert.notEqual(pending.type, 'TEAM_ADJUSTMENT', 'não é um MEU TIME: é uma decisão obrigatória');
  assert.ok((['PENALTY_TAKER', 'INJURY_SUBSTITUTION', 'RED_CARD_ADJUSTMENT'] as string[]).includes(pending.type));
  const frozenRound = JSON.stringify(roundOf(session));
  const commandsBefore = controlledMatch(roundOf(session)).commands.length;

  // MEU TIME não pode abrir por cima dela.
  const attempt = session.openTeamAdjustment();
  assert.equal(attempt.ok, false);
  assert.equal(attempt.ok ? null : attempt.error, 'INVALID_STATUS');

  // O estado não foi alterado e a decisão original continua pendente, intacta.
  assert.equal(JSON.stringify(roundOf(session)), frozenRound, 'nenhuma mudança na rodada');
  assert.equal(controlledMatch(roundOf(session)).commands.length, commandsBefore, 'a tentativa recusada não é gravada como comando');
  const after = session.getState();
  assert.equal(after.status, 'AWAITING_DECISION');
  assert.deepStrictEqual(after.pending?.decision, pending, 'a mesma decisão, com o mesmo id, segue pendente');
  assert.equal(controlledMatch(roundOf(session)).decisionQueue.length, 0, 'MEU TIME não entrou na fila');
  assert.equal(sched.pending, 0, 'e o jogo continua parado');

  // A regra é só "uma por vez": resolvida a obrigatória, MEU TIME volta a abrir.
  for (let g = 0; g < 5 && session.getState().status === 'AWAITING_DECISION'; g++) resolveDecision(session);
  assert.equal(session.getState().status, 'PLAYING');
  assert.ok(session.openTeamAdjustment().ok);
  assert.equal(session.getState().pending?.decision.type, 'TEAM_ADJUSTMENT');
});

test('MEU TIME: só o clube do jogador pode ser ajustado; sem clube controlado a sessão recusa', () => {
  const { sched, session } = newSession('NORMAL', 4, CONTROLLED);
  session.play();
  sched.fireNext();
  const before = JSON.stringify(roundOf(session));
  // Tentar abrir o ajuste de OUTRO clube: o engine rejeita.
  const other = session.dispatch({ type: 'OPEN_TEAM_ADJUSTMENT', commandId: 'intruso', clubId: D1[2] });
  assert.equal(other.ok, false);
  assert.equal(JSON.stringify(roundOf(session)), before, 'nenhuma mudança em outro clube');

  const free = newSession('NORMAL', 2, null);
  free.session.play();
  assert.throws(() => free.session.openTeamAdjustment(), (e: unknown) => e instanceof SessionError && e.code === 'NO_CONTROLLED_CLUB');
});

test('MEU TIME e CONTINUAR sem mudanças não alteram o resultado do jogo', () => {
  const run = (withMeuTime: boolean) => {
    const { sched, session } = newSession('NORMAL', 4, CONTROLLED, 'neutra');
    session.play();
    for (let i = 0; i < 30; i++) sched.fireNext();
    if (withMeuTime) {
      session.openTeamAdjustment();
      session.adjustTeam();
    }
    finish(session, sched);
    return roundOf(session).matches.map((m) => ({ score: m.score, events: m.events, stats: m.stats }));
  };
  assert.deepStrictEqual(run(true), run(false));
});

// ---------- commandId ----------

test('commandId: gerado por partida e em sequência, respeitado quando informado, e repetido não é aplicado duas vezes', () => {
  const { sched, session } = newSession('NORMAL', 4, CONTROLLED);
  session.play();
  sched.fireNext();
  const matchId = controlledMatch(roundOf(session)).matchId;

  assert.ok(session.openTeamAdjustment().ok);
  assert.ok(session.adjustTeam({ style: 'OFFENSIVE' }).ok);
  const playerIds = () =>
    controlledMatch(roundOf(session)).commands.filter((c) => c.origin === 'PLAYER').map((c) => c.commandId);
  assert.deepStrictEqual(playerIds(), [`${matchId}:c1`, `${matchId}:c2`]);

  // commandId informado é o que vale, e reenviar o mesmo comando devolve duplicate sem aplicar de novo.
  const first = session.openTeamAdjustment({ commandId: 'meu-time-7' });
  assert.ok(first.ok && !first.duplicate);
  assert.equal(session.getState().status, 'AWAITING_DECISION');
  const frozen = JSON.stringify(roundOf(session));
  const again = session.openTeamAdjustment({ commandId: 'meu-time-7' });
  assert.ok(again.ok && again.duplicate);
  assert.equal(JSON.stringify(roundOf(session)), frozen, 'o comando repetido não muda nada');
  assert.equal(playerIds().filter((id) => id === 'meu-time-7').length, 1);

  // Resolver com um commandId já usado também é idempotente.
  assert.ok(session.adjustTeam({}, { commandId: 'meu-time-7' }).ok);
  assert.equal(session.getState().status, 'AWAITING_DECISION', 'como o id já foi usado, a decisão continua aberta');
  assert.ok(session.adjustTeam({}, { commandId: 'ajuste-8' }).ok);
  assert.equal(session.getState().status, 'PLAYING');
});

// ---------- Erros de uso ----------

test('erros de uso: sem rodada, rodada em andamento e comandos fora de hora', () => {
  const session = createSession({ scheduler: new FakeScheduler() });
  assert.equal(session.getState().status, 'IDLE');
  assert.throws(() => session.play(), (e: unknown) => e instanceof SessionError && e.code === 'NO_ROUND');
  assert.deepStrictEqual(session.results(), []);

  const { session: s2, sched } = newSession('NORMAL', 2, CONTROLLED);
  s2.play();
  sched.fireNext();
  assert.throws(
    () => s2.startRound({ roundId: 'R2', seed: 'x', fixtures: fixtures(2) }),
    (e: unknown) => e instanceof SessionError && e.code === 'ROUND_IN_PROGRESS',
  );
  assert.throws(() => s2.choosePenaltyTaker('ninguem'), (e: unknown) => e instanceof SessionError && e.code === 'NO_DECISION');
  assert.throws(() => s2.adjustTeam(), (e: unknown) => e instanceof SessionError && e.code === 'NO_DECISION');
});

// ---------- A velocidade NÃO altera o resultado lógico ----------

/**
 * Mesma rodada, mesma seed, mesmos dados e as MESMAS decisões nos mesmos minutos de jogo:
 * as decisões obrigatórias do jogo (aceitas como sugeridas) e um MEU TIME no minuto 30 com mudança de estilo.
 * Só a velocidade muda. Na instantânea o MEU TIME entra assim: a rodada anda até o minuto 30 e a velocidade
 * vira instantânea a partir daí (trocar de velocidade no meio é permitido).
 */
function playScripted(speed: SpeedId): { round: RoundState; results: unknown; meuTimeDone: boolean } {
  const sched = new FakeScheduler();
  const session = createSession({ scheduler: sched, speed: speed === 'INSTANT' ? 'SLOW' : speed });
  session.startRound({ roundId: 'R1', seed: decisionSeed(), fixtures: fixtures(), controlledClubId: CONTROLLED });
  session.play();
  let meuTimeDone = false;
  for (let guard = 0; guard < 5000; guard++) {
    const snap = session.getState();
    if (snap.status === 'ROUND_FINISHED') break;
    if (snap.status === 'AWAITING_DECISION') {
      resolveDecision(session);
      continue;
    }
    const m = controlledMatch(snap.round as RoundState);
    if (!meuTimeDone && m.clock.half === 1 && m.clock.minute >= 30) {
      meuTimeDone = true;
      assert.ok(session.openTeamAdjustment().ok);
      assert.ok(session.adjustTeam({ style: 'DEFENSIVE' }).ok);
      if (speed === 'INSTANT') session.setSpeed('INSTANT');
      continue;
    }
    assert.equal(snap.status, 'PLAYING');
    assert.ok(sched.fireNext());
  }
  return { round: roundOf(session), results: session.results(), meuTimeDone };
}

test('MESMA SEED + MESMOS DADOS + MESMAS DECISÕES + VELOCIDADES DIFERENTES = MESMO RESULTADO', () => {
  const runs = SPEED_ORDER.map((speed) => ({ speed, ...playScripted(speed) }));
  const reference = JSON.stringify(runs[0].round.matches);

  for (const run of runs) {
    assert.ok(run.meuTimeDone, `${run.speed}: o MEU TIME aconteceu`);
    assert.ok(run.round.matches.every((m) => m.status === 'FINISHED'));
    // Tudo igual: placares, eventos, estatísticas, acréscimos, relógio, comandos gravados (com seus minutos).
    assert.equal(JSON.stringify(run.round.matches), reference, `${run.speed}: partidas idênticas à referência`);
    assert.deepStrictEqual(run.results, runs[0].results, `${run.speed}: resultados idênticos`);
  }

  // Controle positivo: as decisões realmente entraram em jogo (senão a igualdade não provaria nada).
  const m = controlledMatch(runs[0].round);
  const team = m.home.clubId === CONTROLLED ? m.home : m.away;
  assert.equal(team.style, 'DEFENSIVE');
  const playerCommands = m.commands.filter((c) => c.origin === 'PLAYER');
  assert.ok(playerCommands.length >= 3, 'MEU TIME (abrir + continuar) e ao menos uma decisão obrigatória');
  assert.ok(playerCommands.some((c) => c.commandId.startsWith('jogador:')), 'houve decisão obrigatória respondida');
});
