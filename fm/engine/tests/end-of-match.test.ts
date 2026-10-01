import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../config.ts';
import { autoLineup } from '../lineup.ts';
import { applyCommand } from '../match/commands.ts';
import { simulateMatch } from '../match/simulate.ts';
import { clockLabel, createMatch, isPastEnd } from '../match/state.ts';
import { step } from '../match/step.ts';
import { createRng } from '../rng.ts';
import { prepareFixture } from '../round.ts';
import { overallStrength, positionFactor } from '../strength.ts';
import type { Club, Command, MatchEvent, MatchInput, MatchState, Player, Side, TeamState } from '../types.ts';
import { generateWorld } from '../world/generate.ts';
import { matchInput, playerLikeCpu } from './helpers.ts';

// Regressão do bug de fim de partida (seção 23): decisão gerada em 90+ era descartada e a partida terminava
// sem goleiro. Regra definida: a partida NUNCA vira FINISHED com decisão obrigatória pendente; depois de resolvida,
// o motor verifica se o relógio já passou do fim. Sem exceção especial para 90+.
//
// Os cenários abaixo são os do balance.ts (mundo "balance-world", seeds "balance:<cenário>:<índice>"),
// reconstruídos aqui de forma determinística.

const BAL = generateWorld('balance-world');

function playersOf(...clubs: Club[]): Record<string, Player> {
  const out: Record<string, Player> = {};
  for (const c of clubs) for (const id of c.squad) out[id] = BAL.players[id];
  return out;
}

/** Cenário "mundo": o par sorteado para o índice dado (mesma sequência do balance.ts). */
function worldPair(index: number): [Club, Club] {
  const pairRng = createRng('balance:pares');
  let pair: [Club, Club] | null = null;
  for (let i = 0; i <= index; i++) {
    const div = BAL.divisions[i % BAL.divisions.length];
    const a = pairRng.int(0, div.clubIds.length - 1);
    let b = pairRng.int(0, div.clubIds.length - 2);
    if (b >= a) b += 1;
    if (i === index) pair = [BAL.clubs[div.clubIds[a]], BAL.clubs[div.clubIds[b]]];
  }
  return pair as [Club, Club];
}

/** Cenário "forte em casa": o mais forte da 1ª divisão contra o mais fraco da última. */
function strongPair(): [Club, Club] {
  const overall = (c: Club) => overallStrength(autoLineup(c, BAL.players, {}, DEFAULT_CONFIG).starters, BAL.players, DEFAULT_CONFIG);
  const first = BAL.divisions[0].clubIds.map((id) => BAL.clubs[id]);
  const last = BAL.divisions[BAL.divisions.length - 1].clubIds.map((id) => BAL.clubs[id]);
  const strongest = first.reduce((a, b) => (overall(b) > overall(a) ? b : a));
  const weakest = last.reduce((a, b) => (overall(b) < overall(a) ? b : a));
  return [strongest, weakest];
}

function scenario(id: string, index: number, [home, away]: [Club, Club], controlled: Side | null = null): MatchInput {
  const fx = prepareFixture(`bal-${id}-${index}`, home, away, playersOf(home, away));
  const controlledClubId = controlled === 'home' ? home.id : controlled === 'away' ? away.id : null;
  return { matchId: fx.matchId, seed: `balance:${id}:${index}`, home: fx.home, away: fx.away, controlledClubId, attendance: fx.attendance };
}

const goalkeepers = (t: TeamState) => t.onField.filter((s) => s.sector === 'GK');
const isGoalkeeper = (t: TeamState, id: string | null) => id !== null && t.players[id].position === 'GK';
const last = (s: MatchState) => s.events[s.events.length - 1];
const fullTimes = (s: MatchState) => s.events.filter((e) => e.type === 'FULL_TIME');
const humanLike = (s: MatchState): Command => playerLikeCpu(s, s.decision as NonNullable<MatchState['decision']>);

/** Joga como jogador: resolve as decisões com a sugestão da CPU, mas PARA na primeira decisão que surgir com o relógio além do fim. */
function playUntilEndDecision(input: MatchInput): MatchState {
  let s = createMatch(input);
  for (let guard = 0; guard < 2000; guard++) {
    if (s.status === 'FINISHED') return s;
    if (s.status === 'AWAITING_DECISION') {
      if (isPastEnd(s)) return s;
      const r = applyCommand(s, humanLike(s));
      assert.ok(r.ok, 'decisão do meio do jogo deveria ser aceita');
      s = r.state;
    } else {
      s = step(s);
    }
  }
  throw new Error('a partida não terminou');
}

function assertOneGoalkeeper(s: MatchState): void {
  for (const side of ['home', 'away'] as const) {
    assert.equal(goalkeepers(s[side]).length, 1, `${side}: exatamente um jogador no gol`);
    assert.ok(s[side].onField.length >= 1 && s[side].onField.length <= 11);
  }
}

// ---------- O caso bal-world-6401 ----------

test('bal-world-6401 (CPU): goleiro do mandante expulso aos 90+5 — a partida termina com exatamente 1 goleiro', () => {
  const input = scenario('world', 6401, worldPair(6401));
  const initial = createMatch(input);
  const reserveGks = initial.home.bench.filter((id) => isGoalkeeper(initial.home, id));
  assert.ok(reserveGks.length > 0, 'neste cenário o mandante tem goleiro reserva elegível');

  const s = simulateMatch(input);
  assert.equal(s.status, 'FINISHED');
  assertOneGoalkeeper(s);

  const red = s.events.find((e) => e.type === 'RED_CARD' && e.side === 'home' && isGoalkeeper(s.home, e.playerId)) as MatchEvent;
  assert.ok(red, 'o goleiro do mandante foi expulso');
  assert.equal(clockLabel(red.clock), '90+5');
  assert.equal(red.detail, 'second_yellow');

  // Expulso não volta: fora de campo, fora do banco, registrado como expulso e sem nenhum evento depois.
  const expelled = red.playerId as string;
  assert.ok(s.home.sentOff.includes(expelled));
  assert.ok(!s.home.onField.some((x) => x.playerId === expelled));
  assert.ok(!s.home.bench.includes(expelled));
  assert.ok(!s.events.some((e) => e.seq > red.seq && (e.playerId === expelled || e.relatedPlayerId === expelled)));

  // Regra: goleiro reserva elegível entra (custa uma troca) e ocupa o gol.
  const keeper = goalkeepers(s.home)[0];
  assert.ok(reserveGks.includes(keeper.playerId), 'o goleiro reserva assumiu o gol');
  assert.equal(s.home.subsUsed, 1);
  assert.equal(s.home.onField.length, 9, '11 − 2 expulsos');

  // Ordem dos eventos no fim: expulsão → troca → FULL_TIME, tudo em 90+5.
  const sub = s.events.find((e) => e.type === 'SUBSTITUTION' && e.side === 'home' && e.relatedPlayerId === keeper.playerId) as MatchEvent;
  assert.ok(sub, 'a entrada do goleiro reserva foi registrada');
  assert.equal(sub.detail, 'red_card');
  assert.equal(clockLabel(sub.clock), '90+5');
  assert.ok(red.seq < sub.seq && sub.seq < last(s).seq);
  assert.equal(last(s).type, 'FULL_TIME');
  assert.equal(clockLabel(last(s).clock), '90+5');
  assert.equal(fullTimes(s).length, 1);
});

test('bal-world-6401 sem goleiro reserva: um jogador de linha assume o gol (fator 0,30) e a partida não termina sem goleiro', () => {
  const input = scenario('world', 6401, worldPair(6401));
  // Mesmo cenário e mesma seed; só o banco do mandante perde os goleiros. Os 11 em campo não mudam, então os eventos até o fim são os mesmos.
  input.home.lineup = { ...input.home.lineup, bench: input.home.lineup.bench.filter((id) => input.home.players[id].position !== 'GK') };
  const initial = createMatch(input);
  assert.ok(!initial.home.bench.some((id) => isGoalkeeper(initial.home, id)), 'sem goleiro no banco');

  const s = simulateMatch(input);
  assert.equal(s.status, 'FINISHED');
  assertOneGoalkeeper(s);

  const red = s.events.find((e) => e.type === 'RED_CARD' && e.side === 'home' && isGoalkeeper(s.home, e.playerId)) as MatchEvent;
  assert.equal(clockLabel(red.clock), '90+5');
  assert.ok(!s.home.onField.some((x) => x.playerId === red.playerId), 'o goleiro expulso não retorna');

  const keeper = goalkeepers(s.home)[0];
  const natural = s.home.players[keeper.playerId].position;
  assert.notEqual(natural, 'GK', 'quem assumiu o gol é jogador de linha');
  assert.equal(positionFactor(natural, 'GK', DEFAULT_CONFIG), 0.3, 'aplica o fator de fora de posição do gol');
  assert.equal(s.home.subsUsed, 0, 'sem goleiro reserva, não gasta troca');
  assert.equal(s.home.onField.length, 9);
  assert.equal(last(s).type, 'FULL_TIME');
});

test('bal-world-6401 com o mandante controlado pelo jogador: a decisão nasce em 90+5, bloqueia o FINISHED e só depois da resposta a partida encerra', () => {
  const input = scenario('world', 6401, worldPair(6401), 'home');
  const s = playUntilEndDecision(input);

  // A partida parou no fim do jogo, esperando o jogador.
  assert.equal(s.status, 'AWAITING_DECISION');
  assert.ok(s.decision);
  assert.equal(s.decision?.type, 'RED_CARD_ADJUSTMENT');
  assert.equal(s.decision?.side, 'home');
  assert.ok(isGoalkeeper(s.home, s.decision?.playerId ?? null), 'o expulso é o goleiro');
  assert.ok(isPastEnd(s));
  assert.equal(s.clock.added, (s.stoppage.second as number) + 1, 'o relógio já passou do último minuto de acréscimo');
  assert.equal(fullTimes(s).length, 0, 'ainda não houve FULL_TIME');
  assert.equal(goalkeepers(s.home).length, 0, 'o time está sem goleiro até o jogador decidir');
  assert.throws(() => step(s), (e: unknown) => (e as { code?: string }).code === 'AWAITING_DECISION');

  // Resposta inválida (deixaria o time sem goleiro): recusada, e a partida continua esperando.
  const bad = applyCommand(s, { type: 'ADJUST_TEAM', commandId: 'sem-goleiro', clubId: s.decision?.clubId as string, decisionId: s.decision?.id as string, substitutions: [] });
  assert.equal(bad.ok, false);
  assert.equal(bad.state.status, 'AWAITING_DECISION');
  assert.equal(fullTimes(bad.state).length, 0);

  // Resposta válida: agora o motor verifica o relógio e encerra.
  const done = applyCommand(s, humanLike(s));
  assert.ok(done.ok);
  const f = done.state;
  assert.equal(f.status, 'FINISHED');
  assert.equal(f.decision, null);
  assert.equal(f.decisionQueue.length, 0);
  assertOneGoalkeeper(f);
  assert.equal(last(f).type, 'FULL_TIME');
  assert.equal(clockLabel(last(f).clock), '90+5');
  assert.equal(fullTimes(f).length, 1);
  const sub = f.events.find((e) => e.type === 'SUBSTITUTION' && e.side === 'home' && e.detail === 'red_card') as MatchEvent;
  assert.equal(clockLabel(sub.clock), '90+5', 'a troca do fim fica no último minuto jogado, não em um minuto que não existe');

  // Jogador que aceita a sugestão e CPU chegam ao mesmo jogo: um só caminho de comandos.
  const cpu = simulateMatch(scenario('world', 6401, worldPair(6401)));
  assert.deepStrictEqual(f.events, cpu.events);
  assert.deepStrictEqual(f.score, cpu.score);
});

// ---------- Lesão do goleiro no último minuto (bal-strong_home-28727) ----------
// Re-fixada no motor 0.2.0. No 0.1.1 esta condição vinha da seed 2717; com a calibração 0.2.0 (curva sat 2, camada de qualidade,
// mando 1,25) os jogos têm outros gols, logo outra duração e outras decisões, e a 2717 não produz mais nenhuma lesão de goleiro.
// A condição protegida é a mesma: lesão do goleiro do VISITANTE em 90+3, o último minuto jogado, com o visitante usando só 1 troca.
// Encontrada na busca em balance:strong_home 0–40.000 (a única em 90+3; a 20369 é em 90+8). As asserções não mudaram.

test('bal-strong_home-28727 (CPU): goleiro do visitante lesionado aos 90+3 — troca automática antes do FULL_TIME', () => {
  const s = simulateMatch(scenario('strong_home', 28727, strongPair()));
  assert.equal(s.status, 'FINISHED');
  assertOneGoalkeeper(s);

  const injury = s.events.find((e) => e.type === 'INJURY' && e.side === 'away' && isGoalkeeper(s.away, e.playerId)) as MatchEvent;
  assert.ok(injury, 'o goleiro do visitante se lesionou');
  assert.equal(clockLabel(injury.clock), '90+3');
  assert.ok(s.away.injured.includes(injury.playerId as string));
  assert.ok(!s.away.onField.some((x) => x.playerId === injury.playerId));
  assert.equal(s.away.subsUsed, 1);

  const sub = s.events.find((e) => e.type === 'SUBSTITUTION' && e.side === 'away' && e.playerId === injury.playerId) as MatchEvent;
  assert.ok(sub);
  assert.equal(sub.detail, 'injury');
  assert.equal(clockLabel(sub.clock), '90+3');
  assert.ok(injury.seq < sub.seq && sub.seq < last(s).seq);
  assert.equal(last(s).type, 'FULL_TIME');
});

test('bal-strong_home-28727 com o visitante controlado: a lesão em 90+3 pausa a partida e o jogador escolhe o substituto', () => {
  const s = playUntilEndDecision(scenario('strong_home', 28727, strongPair(), 'away'));
  assert.equal(s.status, 'AWAITING_DECISION');
  assert.equal(s.decision?.type, 'INJURY_SUBSTITUTION');
  assert.ok(isGoalkeeper(s.away, s.decision?.playerId ?? null));
  assert.ok(isPastEnd(s));
  assert.equal(fullTimes(s).length, 0);
  assert.ok((s.decision?.eligible.length ?? 0) > 0, 'há reservas para escolher');

  // Sem escolher o substituto (havendo troca possível), o jogador não consegue continuar.
  const bad = applyCommand(s, { type: 'ADJUST_TEAM', commandId: 'sem-substituto', clubId: s.decision?.clubId as string, decisionId: s.decision?.id as string, substitutions: [] });
  assert.equal(bad.ok, false);
  assert.equal(bad.state.status, 'AWAITING_DECISION');

  const done = applyCommand(s, humanLike(s));
  assert.ok(done.ok);
  assert.equal(done.state.status, 'FINISHED');
  assertOneGoalkeeper(done.state);
  assert.equal(last(done.state).type, 'FULL_TIME');
  assert.equal(fullTimes(done.state).length, 1);
});

// ---------- Invariante geral ----------

test('invariante: com o clube controlado, nunca há FINISHED com decisão pendente, e todo jogo termina com 1 goleiro por time', () => {
  for (let i = 1; i <= 40; i++) {
    let s = createMatch(matchInput(`fim-${i}`, { controlled: 'home' }));
    for (let guard = 0; s.status !== 'FINISHED'; guard++) {
      assert.ok(guard < 2000, 'a partida deveria terminar');
      if (s.status === 'AWAITING_DECISION') {
        const r = applyCommand(s, humanLike(s));
        assert.ok(r.ok);
        s = r.state;
      } else {
        s = step(s);
      }
      if (s.status === 'FINISHED') {
        assert.equal(s.decision, null, `fim-${i}: FINISHED com decisão pendente`);
        assert.equal(s.decisionQueue.length, 0);
      }
    }
    assertOneGoalkeeper(s);
  }
});
