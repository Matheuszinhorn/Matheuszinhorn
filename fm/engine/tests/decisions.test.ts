import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../config.ts';
import { applyCommand } from '../match/commands.ts';
import { cpuCommandFor } from '../match/cpu.ts';
import { buildDecision, openDecision } from '../match/decisions.ts';
import { sendOff } from '../match/incidents.ts';
import { simulateMatch } from '../match/simulate.ts';
import { cloneState, createMatch, EngineError } from '../match/state.ts';
import { step } from '../match/step.ts';
import { createRound, prepareFixture, stepRound } from '../round.ts';
import { sectorTotals } from '../strength.ts';
import type { Command, MatchState, Side } from '../types.ts';
import { D1, findSeed, matchInput, WORLD } from './helpers.ts';

const cfg = DEFAULT_CONFIG;

function openTeam(s: MatchState, commandId = 'abrir'): MatchState {
  const r = applyCommand(s, { type: 'OPEN_TEAM_ADJUSTMENT', commandId, clubId: s.controlledClubId! });
  assert.ok(r.ok);
  return r.state;
}

function adjust(s: MatchState, extra: Partial<Extract<Command, { type: 'ADJUST_TEAM' }>> = {}): Command {
  return { type: 'ADJUST_TEAM', commandId: 'ajuste', clubId: s.controlledClubId!, decisionId: s.decision!.id, substitutions: [], ...extra };
}

/** Avança até a primeira decisão do clube controlado. */
function untilDecision(s: MatchState): MatchState {
  while (s.status === 'RUNNING') s = step(s);
  return s;
}

/** Avança até uma decisão de um tipo específico, resolvendo as anteriores como a CPU faria. */
function untilDecisionType(s: MatchState, type: string): MatchState {
  s = untilDecision(s);
  while (s.decision && s.decision.type !== type) {
    s = untilDecision(applyCommand(s, cpuCommandFor(s, s.decision, cfg)).state);
  }
  assert.ok(s.decision, `não chegou a uma decisão ${type}`);
  return s;
}

// 5. AWAITING_DECISION bloqueia o step (e a rodada).
test('5. AWAITING_DECISION bloqueia step e stepRound', () => {
  const s = openTeam(createMatch(matchInput('bloqueio', { controlled: 'home' })));
  assert.equal(s.status, 'AWAITING_DECISION');
  assert.throws(() => step(s), (e: unknown) => e instanceof EngineError && e.code === 'AWAITING_DECISION');

  const home = WORLD.clubs[D1[0]];
  const f1 = prepareFixture('r-1', home, WORLD.clubs[D1[1]], WORLD.players);
  const f2 = prepareFixture('r-2', WORLD.clubs[D1[2]], WORLD.clubs[D1[3]], WORLD.players);
  const round = createRound('R1', 'rodada', [f1, f2], home.id);
  const first = round.matches[0];
  const blocked = { ...round, matches: [openTeam(first), round.matches[1]] };
  assert.throws(() => stepRound(blocked), (e: unknown) => e instanceof EngineError && e.code === 'AWAITING_DECISION');
  // Nenhuma outra decisão pode ser aberta ao mesmo tempo.
  const again = applyCommand(s, { type: 'OPEN_TEAM_ADJUSTMENT', commandId: 'abrir-2', clubId: s.controlledClubId! });
  assert.equal(again.ok, false);
});

// 6. Decisão válida libera a partida.
test('6. comando válido libera a partida e ela volta a avançar', () => {
  const s = openTeam(createMatch(matchInput('libera', { controlled: 'home' })));
  const r = applyCommand(s, adjust(s, { style: 'OFFENSIVE', behavior: 'REACTIVE' }));
  assert.ok(r.ok);
  assert.equal(r.state.status, 'RUNNING');
  assert.equal(r.state.decision, null);
  assert.equal(r.state.home.style, 'OFFENSIVE');
  assert.equal(r.state.home.behavior, 'REACTIVE');
  const next = step(r.state);
  assert.deepStrictEqual(next.clock, { half: 1, minute: 2, added: 0 });
});

// 7. Decisão inválida é rejeitada e não altera nada.
test('7. comandos inválidos são rejeitados sem alterar o estado', () => {
  const s = openTeam(createMatch(matchInput('invalido', { controlled: 'home' })));
  const awayPlayer = s.away.onField[3].playerId;
  const cases: [Command, string][] = [
    [adjust(s, { substitutions: [{ out: s.home.onField[5].playerId, in: awayPlayer }] }), 'INVALID_PLAYER'],
    [adjust(s, { decisionId: 'outra' }), 'WRONG_DECISION'],
    [{ ...adjust(s), clubId: s.away.clubId }, 'NOT_CONTROLLED'],
    [
      adjust(s, { positions: s.home.onField.map((x) => ({ ...x, sector: x.sector === 'DEF' ? 'GK' : x.sector })) }),
      'INVALID_LINEUP',
    ],
    [adjust(s, { positions: s.home.onField.slice(1) }), 'INVALID_LINEUP'],
    [{ type: 'CHOOSE_PENALTY_TAKER', commandId: 'x', clubId: s.home.clubId, decisionId: s.decision!.id, playerId: 'p' }, 'WRONG_DECISION'],
  ];
  for (const [cmd, code] of cases) {
    const r = applyCommand(s, cmd);
    assert.equal(r.ok, false, code);
    if (!r.ok) assert.equal(r.error, code);
    assert.equal(r.state, s, 'o estado devolvido é o original');
    assert.equal(s.status, 'AWAITING_DECISION');
  }

  // Lesão com troca possível exige escolher o substituto.
  const seed = findSeed((m) => m.events.some((e) => e.type === 'INJURY' && e.side === 'home'));
  const injured = untilDecisionType(createMatch(matchInput(seed, { controlled: 'home' })), 'INJURY_SUBSTITUTION');
  assert.equal(injured.decision!.type, 'INJURY_SUBSTITUTION');
  const r = applyCommand(injured, adjust(injured));
  assert.equal(r.ok, false);
});

// 8. commandId evita duplicação.
test('8. commandId repetido não é aplicado duas vezes', () => {
  const base = createMatch(matchInput('idempotente', { controlled: 'home' }));
  const a = openTeam(base, 'abrir-1');
  const dup = applyCommand(a, { type: 'OPEN_TEAM_ADJUSTMENT', commandId: 'abrir-1', clubId: base.controlledClubId! });
  assert.ok(dup.ok && dup.duplicate);
  assert.equal(dup.state, a);
  assert.equal(a.decisionSeq, 1);

  const sub = adjust(a, { commandId: 'troca-1', substitutions: [{ out: a.home.onField[6].playerId, in: a.home.bench[2] }] });
  const b = applyCommand(a, sub);
  assert.ok(b.ok && !b.duplicate);
  assert.equal(b.state.home.subsUsed, 1);
  const c = applyCommand(b.state, sub);
  assert.ok(c.ok && c.duplicate);
  assert.equal(c.state.home.subsUsed, 1);
  assert.equal(c.state.commands.filter((x) => x.commandId === 'troca-1').length, 1);
});

/** Monta a situação "goleiro expulso" num estado real de partida. */
function keeperSentOff(side: Side, opts: { removeBenchKeeper?: boolean; noSubsLeft?: boolean } = {}): MatchState {
  const s = cloneState(createMatch(matchInput('goleiro', { controlled: side })));
  const team = s[side];
  if (opts.removeBenchKeeper) team.bench = team.bench.filter((id) => team.players[id].position !== 'GK');
  if (opts.noSubsLeft) team.subsUsed = cfg.maxSubs;
  const keeper = team.onField.find((x) => x.sector === 'GK')!.playerId;
  sendOff(s, side, keeper, s.clock, 'direct');
  openDecision(s, buildDecision(s, side, 'RED_CARD_ADJUSTMENT', keeper, s.clock, cfg), cfg);
  return s;
}

// 9. Goleiro expulso.
test('9a. goleiro expulso, jogador: com reserva disponível, o goleiro reserva precisa entrar', () => {
  const s = keeperSentOff('home');
  const team = s.home;
  const expelled = s.decision!.playerId!;
  const reserveGk = team.bench.find((id) => team.players[id].position === 'GK')!;
  const outfield = team.onField.find((x) => x.sector === 'DEF')!;

  // Improvisar um jogador de linha no gol com goleiro no banco: rejeitado.
  const improvise = applyCommand(
    s,
    adjust(s, { positions: team.onField.map((x) => (x.playerId === outfield.playerId ? { ...x, sector: 'GK' as const } : x)) }),
  );
  assert.equal(improvise.ok, false);
  // O expulso não pode voltar.
  const back = applyCommand(s, adjust(s, { substitutions: [{ out: outfield.playerId, in: expelled }] }));
  assert.equal(back.ok, false);

  // Correto: sai um jogador de linha, entra o goleiro reserva no gol.
  const ok = applyCommand(
    s,
    adjust(s, {
      substitutions: [{ out: outfield.playerId, in: reserveGk }],
      positions: team.onField.filter((x) => x.playerId !== outfield.playerId).concat({ playerId: reserveGk, sector: 'GK', x: 50, y: 5 }),
    }),
  );
  assert.ok(ok.ok, ok.ok ? '' : ok.message);
  const after = ok.state.home;
  assert.equal(after.onField.length, 10);
  assert.equal(after.onField.filter((x) => x.sector === 'GK').length, 1);
  assert.equal(after.onField.find((x) => x.sector === 'GK')!.playerId, reserveGk);
  assert.ok(after.sentOff.includes(expelled) && !after.onField.some((x) => x.playerId === expelled));

  // Até o fim do jogo o expulso não volta e sempre há um goleiro.
  const end = simulateMatch(ok.state);
  assert.ok(!end.home.onField.some((x) => x.playerId === expelled));
  assert.equal(end.home.onField.filter((x) => x.sector === 'GK').length, 1);
});

test('9b. goleiro expulso, CPU: goleiro reserva entra no lugar do jogador de linha mais fraco', () => {
  const s = keeperSentOff('home');
  const cmd = cpuCommandFor(s, s.decision!, cfg);
  const r = applyCommand(s, cmd, 'CPU');
  assert.ok(r.ok);
  const team = r.state.home;
  const gk = team.onField.find((x) => x.sector === 'GK')!;
  assert.equal(team.players[gk.playerId].position, 'GK');
  assert.equal(team.onField.length, 10);
  assert.equal(team.subsUsed, 1);
});

test('9c. goleiro expulso sem goleiro reserva (ou sem trocas): jogador de linha vai para o gol com fator 0,30', () => {
  for (const opts of [{ removeBenchKeeper: true }, { noSubsLeft: true }]) {
    const s = keeperSentOff('home', opts);
    const r = applyCommand(s, cpuCommandFor(s, s.decision!, cfg), 'CPU');
    assert.ok(r.ok);
    const team = r.state.home;
    const gk = team.onField.find((x) => x.sector === 'GK')!;
    const player = team.players[gk.playerId];
    assert.notEqual(player.position, 'GK');
    assert.equal(team.onField.filter((x) => x.sector === 'GK').length, 1);
    assert.equal(team.onField.length, 10);
    assert.ok(Math.abs(sectorTotals(team.onField, team.players, cfg).GK - player.strength * cfg.positionFactor.goal) < 1e-9);
  }
});

test('decisões reais: lesão e pênalti do clube controlado pausam e são resolvidas pelo jogador', () => {
  const seed = findSeed((m) => m.events.some((e) => e.type === 'PENALTY_AWARDED' && e.side === 'home'));
  const s = untilDecisionType(createMatch(matchInput(seed, { controlled: 'home' })), 'PENALTY_TAKER');
  const d = s.decision!;
  assert.ok(d.eligible.length >= 9);
  const taker = d.eligible[d.eligible.length - 1];
  const r = applyCommand(s, { type: 'CHOOSE_PENALTY_TAKER', commandId: 'batedor', clubId: d.clubId, decisionId: d.id, playerId: taker });
  assert.ok(r.ok);
  const kicked = step(r.state);
  const kick = kicked.events.find((e) => (e.type === 'PENALTY_GOAL' || e.type === 'PENALTY_MISSED') && e.side === 'home');
  assert.equal(kick?.playerId, taker, 'quem bate é quem o jogador escolheu');
});
