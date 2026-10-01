import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG, applyCommand, createMatch, type MatchState, type Side } from '../../engine/index.ts';
import { buildDecision, openDecision } from '../../engine/match/decisions.ts';
import { sendOff } from '../../engine/match/incidents.ts';
import { cloneState, removeFromField } from '../../engine/match/state.ts';
import { matchInput } from '../../engine/tests/helpers.ts';
import { suggestedCommand } from '../assist.ts';
import { goalkeeperChanges, goalkeeperOptions, suggestedGoalkeeperChoice, type GoalkeeperChoice } from '../goalkeeper.ts';
import type { TeamChanges } from '../session.ts';

// Decisão do jogador quando o goleiro sai: a escolha do usuário vira um comando que o ENGINE aceita, sempre com 1 goleiro.

const cfg = DEFAULT_CONFIG;
type Opts = { removeBenchKeeper?: boolean; noSubsLeft?: boolean };

function keeperOut(kind: 'red' | 'injury', opts: Opts = {}, side: Side = 'home'): MatchState {
  const s = cloneState(createMatch(matchInput('goleiro-ui', { controlled: side })));
  const team = s[side];
  if (opts.removeBenchKeeper) team.bench = team.bench.filter((id) => team.players[id].position !== 'GK');
  if (opts.noSubsLeft) team.subsUsed = cfg.maxSubs;
  const keeper = team.onField.find((x) => x.sector === 'GK')!.playerId;
  if (kind === 'red') {
    sendOff(s, side, keeper, s.clock, 'direct');
    openDecision(s, buildDecision(s, side, 'RED_CARD_ADJUSTMENT', keeper, s.clock, cfg), cfg);
  } else {
    removeFromField(team, keeper);
    team.injured.push(keeper);
    openDecision(s, buildDecision(s, side, 'INJURY_SUBSTITUTION', keeper, s.clock, cfg), cfg);
  }
  return s;
}

function send(s: MatchState, changes: TeamChanges) {
  return applyCommand(s, { type: 'ADJUST_TEAM', commandId: 'goleiro-ui', clubId: s.controlledClubId!, decisionId: s.decision!.id, substitutions: changes.substitutions ?? [], positions: changes.positions });
}

function keepers(s: MatchState, side: Side = 'home') {
  return s[side].onField.filter((x) => x.sector === 'GK');
}

test('goleiro expulso com reserva: usuário escolhe QUAL jogador de linha sai; o goleiro reserva entra; 1 goleiro', () => {
  const s = keeperOut('red');
  const team = s.home;
  const opts = goalkeeperOptions(team, s.decision!)!;
  assert.equal(opts.mode, 'RESERVE_GK');
  assert.ok(opts.reserveGks.length >= 1);
  const sug = suggestedGoalkeeperChoice(s, s.decision!);
  const out = opts.outfield.find((id) => id !== sug.out)!; // escolha diferente da sugestão
  const r = send(s, goalkeeperChanges(team, s.decision!, opts, { reserveIn: opts.reserveGks[0], out, toGoal: null })!);
  assert.ok(r.ok, r.ok ? '' : r.message);
  const after = r.state.home;
  assert.equal(keepers(r.state).length, 1);
  assert.equal(keepers(r.state)[0].playerId, opts.reserveGks[0]);
  assert.ok(!after.onField.some((x) => x.playerId === out) && after.subbedOff.includes(out));
  assert.ok(!after.onField.some((x) => x.playerId === s.decision!.playerId));
  assert.equal(after.onField.length, 10);
  assert.equal(r.state.status, 'RUNNING');
});

test('goleiro expulso com reserva: jogador de linha no gol não é opção (o engine também recusaria)', () => {
  const s = keeperOut('red');
  const opts = goalkeeperOptions(s.home, s.decision!)!;
  const bad: GoalkeeperChoice = { reserveIn: opts.outfield[0], out: opts.outfield[1], toGoal: null };
  assert.equal(goalkeeperChanges(s.home, s.decision!, opts, bad), null);
});

test('goleiro expulso sem goleiro reserva (ou sem trocas): usuário escolhe quem vai para o gol; 1 goleiro, 10 em campo', () => {
  for (const o of [{ removeBenchKeeper: true }, { noSubsLeft: true }]) {
    const s = keeperOut('red', o);
    const opts = goalkeeperOptions(s.home, s.decision!)!;
    assert.equal(opts.mode, 'OUTFIELD_TO_GOAL');
    const toGoal = opts.outfield[opts.outfield.length - 1];
    const r = send(s, goalkeeperChanges(s.home, s.decision!, opts, { reserveIn: null, out: null, toGoal })!);
    assert.ok(r.ok, r.ok ? '' : r.message);
    assert.deepStrictEqual(keepers(r.state).map((x) => x.playerId), [toGoal]);
    assert.equal(r.state.home.onField.length, 10);
    assert.equal(r.state.home.subsUsed, s.home.subsUsed);
  }
});

test('goleiro lesionado sem goleiro reserva: usuário escolhe o reserva e quem vai para o gol (o reserva ou um de linha)', () => {
  const s = keeperOut('injury', { removeBenchKeeper: true });
  const opts = goalkeeperOptions(s.home, s.decision!)!;
  assert.equal(opts.mode, 'INJURY_NO_RESERVE_GK');
  const reserveIn = opts.bench[opts.bench.length - 1];
  // a) o próprio reserva vai para o gol
  const a = send(s, goalkeeperChanges(s.home, s.decision!, opts, { reserveIn, out: null, toGoal: reserveIn })!);
  assert.ok(a.ok, a.ok ? '' : a.message);
  assert.deepStrictEqual(keepers(a.state).map((x) => x.playerId), [reserveIn]);
  assert.equal(a.state.home.onField.length, 11);
  // b) um jogador de linha em campo vai para o gol e o reserva assume a posição dele
  const toGoal = opts.outfield[0];
  const formerSector = s.home.onField.find((x) => x.playerId === toGoal)!.sector;
  const b = send(s, goalkeeperChanges(s.home, s.decision!, opts, { reserveIn, out: null, toGoal })!);
  assert.ok(b.ok, b.ok ? '' : b.message);
  assert.deepStrictEqual(keepers(b.state).map((x) => x.playerId), [toGoal]);
  assert.equal(b.state.home.onField.find((x) => x.playerId === reserveIn)!.sector, formerSector);
  assert.ok(!b.state.home.onField.some((x) => x.playerId === s.decision!.playerId));
  assert.equal(b.state.home.subsUsed, s.home.subsUsed + 1);
});

test('goleiro lesionado sem trocas: usuário escolhe o jogador de linha que vai para o gol', () => {
  const s = keeperOut('injury', { noSubsLeft: true });
  const opts = goalkeeperOptions(s.home, s.decision!)!;
  assert.equal(opts.mode, 'OUTFIELD_TO_GOAL');
  const toGoal = opts.outfield[2];
  const r = send(s, goalkeeperChanges(s.home, s.decision!, opts, { reserveIn: null, out: null, toGoal })!);
  assert.ok(r.ok, r.ok ? '' : r.message);
  assert.deepStrictEqual(keepers(r.state).map((x) => x.playerId), [toGoal]);
  assert.equal(r.state.home.onField.length, 10);
});

test('goleiro lesionado com goleiro reserva no banco e decisões que não são de goleiro: sem modo especial', () => {
  const s = keeperOut('injury');
  assert.equal(goalkeeperOptions(s.home, s.decision!), null);
  const plain = cloneState(createMatch(matchInput('goleiro-ui', { controlled: 'home' })));
  const outfield = plain.home.onField.find((x) => x.sector !== 'GK')!.playerId;
  sendOff(plain, 'home', outfield, plain.clock, 'direct');
  openDecision(plain, buildDecision(plain, 'home', 'RED_CARD_ADJUSTMENT', outfield, plain.clock, cfg), cfg);
  assert.equal(goalkeeperOptions(plain.home, plain.decision!), null);
});

test('a escolha pré-preenchida (sugestão) gera um comando válido igual ao resultado da sugestão, em todos os modos', () => {
  const cases: [('red' | 'injury'), Opts][] = [['red', {}], ['red', { removeBenchKeeper: true }], ['injury', { removeBenchKeeper: true }], ['injury', { noSubsLeft: true }]];
  for (const [kind, o] of cases) {
    const s = keeperOut(kind, o);
    const opts = goalkeeperOptions(s.home, s.decision!)!;
    const r = send(s, goalkeeperChanges(s.home, s.decision!, opts, suggestedGoalkeeperChoice(s, s.decision!))!);
    assert.ok(r.ok, `${kind} ${JSON.stringify(o)}: ${r.ok ? '' : r.message}`);
    assert.equal(keepers(r.state).length, 1);
    const viaSuggestion = applyCommand(s, suggestedCommand(s, s.decision!));
    assert.ok(viaSuggestion.ok);
    const lineup = (m: MatchState) => m.home.onField.map((x) => `${x.playerId}:${x.sector}`).sort();
    assert.deepStrictEqual(lineup(r.state), lineup(viaSuggestion.state), `${kind} ${JSON.stringify(o)}`);
  }
});
