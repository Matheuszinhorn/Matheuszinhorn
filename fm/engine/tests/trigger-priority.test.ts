import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG, type EngineConfig } from '../config.ts';
import { autoLineup } from '../lineup.ts';
import { applyCommand } from '../match/commands.ts';
import { prioritizeTriggers, vacatedGoalkeeper, type Trigger } from '../match/incidents.ts';
import { simulateMatch } from '../match/simulate.ts';
import { clockLabel, createMatch, isPastEnd, removeFromField } from '../match/state.ts';
import { step } from '../match/step.ts';
import { prepareFixture } from '../round.ts';
import { overallStrength, positionFactor } from '../strength.ts';
import type { Club, Clock, MatchEvent, MatchInput, MatchState, Player, Position, Side, TeamState } from '../types.ts';
import { generateWorld } from '../world/generate.ts';
import { matchInput, playerLikeCpu } from './helpers.ts';

// Regressão do bug do balance-baseline 0.1.1 (seed balance:strong_home:5780, 2T 73'):
// uma expulsão de jogador de linha e a lesão do goleiro no MESMO minuto. Os eventos tiram os dois de campo na hora;
// as decisões vêm depois, uma por vez. Resolvida antes a decisão do jogador de linha, o time estava sem goleiro e a
// validação "exatamente 1 no gol" nunca podia ser satisfeita (CPU: EngineError; humano: pop-up impossível).
// Correção: a decisão que restaura o gol é resolvida primeiro (prioritizeTriggers), para CPU e humano.
// (Motor 0.2.0: o caso real passou a ser reproduzido pela seed balance:strong_home:65925; ver a seção 1 abaixo.)

// ---------- Auxiliares ----------

const goalkeepers = (t: TeamState) => t.onField.filter((s) => s.sector === 'GK');
const posOf = (t: TeamState, id: string | null): Position | null => (id === null ? null : t.players[id].position);
const keyOf = (c: Clock) => `${c.half}|${c.minute}|${c.added}`;
const eventsAt = (s: MatchState, key: string) => s.events.filter((e) => keyOf(e.clock) === key);
const fullTimes = (s: MatchState) => s.events.filter((e) => e.type === 'FULL_TIME');
const lastEvent = (s: MatchState) => s.events[s.events.length - 1];

/** Comandos gravados para as decisões DE UM TIME (o mandante, por padrão) criadas num minuto, na ordem: "2|57|0:INJURY_SUBSTITUTION:3". */
function decisionsAt(s: MatchState, key: string, side: Side = 'home'): string[] {
  return s.commands
    .filter((c) => c.command.clubId === s[side].clubId && c.commandId.includes(`:${key}:`))
    .map((c) => c.commandId.slice(c.commandId.indexOf(`:${key}:`) + 1));
}
const typesAt = (s: MatchState, key: string, side: Side = 'home') => decisionsAt(s, key, side).map((d) => d.split(':')[1]);

function assertOneGoalkeeper(s: MatchState): void {
  for (const side of ['home', 'away'] as const) assert.equal(goalkeepers(s[side]).length, 1, `${side}: exatamente um jogador no gol`);
}

// ---------- Cenário real: balance-world, strong_home ----------

const BAL = generateWorld('balance-world');
const PAIR = ((): [Club, Club] => {
  const overall = (c: Club) => overallStrength(autoLineup(c, BAL.players, {}, DEFAULT_CONFIG).starters, BAL.players, DEFAULT_CONFIG);
  const first = BAL.divisions[0].clubIds.map((id) => BAL.clubs[id]);
  const last = BAL.divisions[BAL.divisions.length - 1].clubIds.map((id) => BAL.clubs[id]);
  return [first.reduce((a, b) => (overall(b) > overall(a) ? b : a)), last.reduce((a, b) => (overall(b) < overall(a) ? b : a))];
})();

function strongInput(index: number, controlled: Side | null = null, tweak?: (i: MatchInput) => void): MatchInput {
  const [home, away] = PAIR;
  const players: Record<string, Player> = {};
  for (const c of [home, away]) for (const id of c.squad) players[id] = BAL.players[id];
  const fx = prepareFixture(`bal-strong_home-${index}`, home, away, players);
  const input: MatchInput = {
    matchId: fx.matchId,
    seed: `balance:strong_home:${index}`,
    home: fx.home,
    away: fx.away,
    controlledClubId: controlled === 'home' ? home.id : controlled === 'away' ? away.id : null,
    attendance: fx.attendance,
  };
  tweak?.(input);
  return input;
}

const withoutReserveGoalkeepers = (i: MatchInput) => {
  i.home.lineup = { ...i.home.lineup, bench: i.home.lineup.bench.filter((id) => i.home.players[id].position !== 'GK') };
};

/** Joga como jogador, aceitando a sugestão do jogo. Cada decisão apresentada precisa ser resolvível. */
function playAsHuman(input: MatchInput) {
  const presented: { type: string; key: string; playerPos: Position | null; gkBefore: number; queue: string[]; queuePos: (Position | null)[] }[] = [];
  let s = createMatch(input);
  for (let guard = 0; s.status !== 'FINISHED'; guard++) {
    assert.ok(guard < 3000, 'a partida deveria terminar');
    if (s.status === 'AWAITING_DECISION') {
      const d = s.decision as NonNullable<MatchState['decision']>;
      presented.push({
        type: d.type,
        key: keyOf(d.createdAt),
        playerPos: posOf(s[d.side], d.playerId),
        gkBefore: goalkeepers(s[d.side]).length,
        queue: s.decisionQueue.map((q) => q.type),
        queuePos: s.decisionQueue.map((q) => posOf(s[q.side], q.playerId)),
      });
      const r = applyCommand(s, playerLikeCpu(s, d));
      assert.ok(r.ok, `${d.type} (${keyOf(d.createdAt)}) deveria ser resolvível${r.ok ? '' : ': ' + r.message}`);
      s = r.state;
    } else {
      s = step(s);
    }
  }
  return { final: s, presented };
}

// ---------- 8. Unitário da função de priorização ----------

function unitState() {
  const s = createMatch(matchInput('prioridade-unitaria'));
  const ids = (side: Side) => {
    const field = s[side].onField;
    return { gk: field.find((x) => x.sector === 'GK')?.playerId as string, a: field.filter((x) => x.sector !== 'GK')[0].playerId, b: field.filter((x) => x.sector !== 'GK')[1].playerId, c: field.filter((x) => x.sector !== 'GK')[2].playerId };
  };
  const home = ids('home');
  const away = ids('away');
  // Como o engine faz: o evento tira o jogador de campo (e guarda a vaga em vacated) ANTES das decisões.
  for (const [side, group] of [['home', home], ['away', away]] as const) for (const id of [group.gk, group.a, group.b, group.c]) removeFromField(s[side], id);
  const t = (side: Side, kind: Trigger['kind'], playerId: string | null): Trigger => ({ side, kind, playerId });
  return { s, home, away, t };
}

test('prioritizeTriggers: a decisão que tirou o goleiro passa à frente das anteriores do mesmo time', () => {
  const { s, home, t } = unitState();
  const red = t('home', 'RED_CARD', home.a);
  const injury = t('home', 'INJURY', home.gk);
  assert.deepStrictEqual(prioritizeTriggers(s, [red, injury]), [injury, red], 'cartões vêm antes de lesões no step; aqui o goleiro sobe');
  assert.equal(vacatedGoalkeeper(s, injury), true);
  assert.equal(vacatedGoalkeeper(s, red), false);
});

test('prioritizeTriggers: goleiro já como primeiro gatilho, ou só gatilhos de linha, mantêm exatamente a ordem original', () => {
  const { s, home, t } = unitState();
  const gkFirst = [t('home', 'RED_CARD', home.gk), t('home', 'INJURY', home.a)];
  assert.deepStrictEqual(prioritizeTriggers(s, gkFirst), gkFirst);
  const twoLine = [t('home', 'RED_CARD', home.a), t('home', 'RED_CARD', home.b)];
  assert.deepStrictEqual(prioritizeTriggers(s, twoLine), twoLine);
  const lineThenInjury = [t('home', 'RED_CARD', home.a), t('home', 'RED_CARD', home.b), t('home', 'INJURY', home.c)];
  assert.deepStrictEqual(prioritizeTriggers(s, lineThenInjury), lineThenInjury);
  assert.deepStrictEqual(prioritizeTriggers(s, []), []);
});

test('prioritizeTriggers: estável — só o gatilho do goleiro se move; os demais mantêm a ordem, inclusive o pênalti', () => {
  const { s, home, t } = unitState();
  const r1 = t('home', 'RED_CARD', home.a);
  const r2 = t('home', 'RED_CARD', home.b);
  const gk = t('home', 'INJURY', home.gk);
  const pen = t('home', 'PENALTY', null);
  assert.deepStrictEqual(prioritizeTriggers(s, [r1, r2, gk, pen]), [gk, r1, r2, pen]);
  assert.equal(vacatedGoalkeeper(s, pen), false, 'pênalti não tem jogador e nunca conta como vaga do gol');
});

test('prioritizeTriggers: só reordena dentro do mesmo time; o gol do adversário não move as decisões do outro lado', () => {
  const { s, home, away, t } = unitState();
  const homeRed = t('home', 'RED_CARD', home.a);
  const awayRed = t('away', 'RED_CARD', away.a);
  const homeGk = t('home', 'INJURY', home.gk);
  const awayGk = t('away', 'INJURY', away.gk);
  // Goleiro do outro time: nada muda para o mandante.
  assert.deepStrictEqual(prioritizeTriggers(s, [homeRed, awayGk]), [homeRed, awayGk]);
  // O goleiro do mandante sobe à frente da expulsão do mandante; a ordem relativa com o visitante se mantém.
  assert.deepStrictEqual(prioritizeTriggers(s, [homeRed, awayRed, homeGk]), [homeGk, homeRed, awayRed]);
  // Cada time resolve o seu goleiro primeiro.
  assert.deepStrictEqual(prioritizeTriggers(s, [homeRed, awayRed, awayGk, homeGk]), [homeGk, homeRed, awayGk, awayRed]);
});

test('prioritizeTriggers: não altera a lista recebida, e quem já ocupava o gol (jogador de linha improvisado) conta como vaga do goleiro', () => {
  const { s, home, t } = unitState();
  const input = [t('home', 'RED_CARD', home.a), t('home', 'INJURY', home.gk)];
  const frozen = JSON.stringify(input);
  prioritizeTriggers(s, input);
  assert.equal(JSON.stringify(input), frozen);

  // Um jogador de linha que assumiu o gol: a vaga que ele deixa é a do goleiro.
  s.home.vacated[home.b] = { ...s.home.vacated[home.gk] };
  assert.equal(vacatedGoalkeeper(s, t('home', 'RED_CARD', home.b)), true);
});

// ---------- 1. O caso real, balance:strong_home:5780 (0.1.1) → balance:strong_home:65925 (0.2.0) ----------
// Re-fixado no motor 0.2.0 (testes "CPU", "sem goleiro reserva" e "mandante controlado"). A calibração 0.2.0 (curva sat 2, camada de
// qualidade, mando 1,25) mudou os gols, logo a duração e as decisões de cada partida, e a seed 5780 deixou de reproduzir o caso.
//   seed antiga  balance:strong_home:5780  (0.1.1): MEIA expulso + lesão do goleiro do mandante no mesmo minuto, 2T 73' ("2|73|0"), decisões :2 e :3.
//                no 0.2.0 ela dá 2×2, com a lesão do goleiro aos 73' mas o vermelho só aos 80': já não há dois gatilhos no mesmo minuto.
//   seed nova    balance:strong_home:65925 (0.2.0): ATACANTE expulso + lesão do goleiro do mandante no mesmo minuto, 2T 57' ("2|57|0"),
//                decisões :3 e :4 (antes dela há duas decisões: vermelhos de zagueiros aos 29' e 38'). Encontrada na busca em strong_home 0–140.000.
//   Literais alterados: a seed, o minuto/chave, a posição do expulso (MID → ATT) e os números de sequência das decisões. Nada mais.
//   Contrato que continua validado: cartões saem antes de lesões no step, mas a decisão do goleiro (que restaura o gol) é resolvida PRIMEIRO,
//   para CPU e humano; a fila guarda a expulsão; sem goleiro reserva um jogador de linha assume o gol (fator 0,30); sempre 1 goleiro.
// O teste "com goleiro reserva" (abaixo) segue na seed 5780: no 0.2.0 ela ainda tem a lesão do goleiro aos 73' e o reserva assume o gol,
// o que é tudo o que ele verifica; ele não depende do gatilho duplo.

test('balance:strong_home:65925 (CPU): expulsão de linha + lesão do goleiro em 2T 57\' — termina sem EngineError e o gol é decidido primeiro', () => {
  const s = simulateMatch(strongInput(65925));
  assert.equal(s.status, 'FINISHED');
  assertOneGoalkeeper(s);

  const minute = eventsAt(s, '2|57|0');
  const red = minute.find((e) => e.type === 'RED_CARD' && e.side === 'home') as MatchEvent;
  const injury = minute.find((e) => e.type === 'INJURY' && e.side === 'home') as MatchEvent;
  assert.equal(posOf(s.home, red.playerId), 'ATT');
  assert.equal(posOf(s.home, injury.playerId), 'GK');
  assert.ok(red.seq < injury.seq, 'os eventos saem nesta ordem (cartões antes de lesões)');

  // A decisão do goleiro foi resolvida ANTES da expulsão, embora o evento dela tenha vindo depois.
  assert.deepStrictEqual(decisionsAt(s, '2|57|0'), ['2|57|0:INJURY_SUBSTITUTION:3', '2|57|0:RED_CARD_ADJUSTMENT:4']);

  // Estado final coerente: o expulso e o lesionado fora de campo, o goleiro substituído.
  assert.ok(s.home.sentOff.includes(red.playerId as string));
  assert.ok(s.home.injured.includes(injury.playerId as string));
  for (const id of [red.playerId, injury.playerId]) assert.ok(!s.home.onField.some((x) => x.playerId === id));
  const sub = s.events.find((e) => e.type === 'SUBSTITUTION' && e.side === 'home' && e.playerId === injury.playerId) as MatchEvent;
  assert.ok(sub, 'a lesão do goleiro gerou a troca');
  assert.equal(sub.detail, 'injury');
  assert.ok(sub.seq > injury.seq);
});

// ---------- 2. Com goleiro reserva ----------

test('balance:strong_home:5780 com goleiro reserva: o reserva assume o gol e o time termina com exatamente 1 goleiro', () => {
  const initial = createMatch(strongInput(5780));
  const reserves = initial.home.bench.filter((id) => posOf(initial.home, id) === 'GK');
  assert.ok(reserves.length >= 1, 'o mandante tem goleiro reserva neste cenário');

  const s = simulateMatch(strongInput(5780));
  assertOneGoalkeeper(s);
  const keeper = goalkeepers(s.home)[0];
  assert.ok(reserves.includes(keeper.playerId), 'quem está no gol é um dos goleiros que estavam no banco');
  assert.equal(posOf(s.home, keeper.playerId), 'GK', 'sem jogar fora de posição');
  const injury = eventsAt(s, '2|73|0').find((e) => e.type === 'INJURY' && e.side === 'home') as MatchEvent;
  assert.equal(s.events.find((e) => e.type === 'SUBSTITUTION' && e.playerId === injury.playerId)?.relatedPlayerId, keeper.playerId);
});

// ---------- 3. Sem goleiro reserva ----------

test('balance:strong_home:65925 sem goleiro reserva: sem EngineError, um jogador de linha assume o gol (fator 0,30) e há exatamente 1 goleiro', () => {
  const input = strongInput(65925, null, withoutReserveGoalkeepers);
  const initial = createMatch(input);
  assert.ok(!initial.home.bench.some((id) => posOf(initial.home, id) === 'GK'), 'sem goleiro no banco');

  const s = simulateMatch(input);
  assert.equal(s.status, 'FINISHED');
  assertOneGoalkeeper(s);

  // O mesmo minuto acontece (o banco não muda os eventos) e a ordem das decisões é a mesma.
  const minute = eventsAt(s, '2|57|0');
  assert.ok(minute.some((e) => e.type === 'RED_CARD' && e.side === 'home' && posOf(s.home, e.playerId) === 'ATT'));
  assert.ok(minute.some((e) => e.type === 'INJURY' && e.side === 'home' && posOf(s.home, e.playerId) === 'GK'));
  assert.deepStrictEqual(typesAt(s, '2|57|0'), ['INJURY_SUBSTITUTION', 'RED_CARD_ADJUSTMENT']);

  const keeper = goalkeepers(s.home)[0];
  const natural = posOf(s.home, keeper.playerId) as Position;
  assert.notEqual(natural, 'GK', 'quem está no gol é jogador de linha');
  assert.equal(positionFactor(natural, 'GK', DEFAULT_CONFIG), 0.3, 'aplica o fator de fora de posição do gol');
});

// ---------- 4. Jogador humano controlando o time ----------

test('balance:strong_home:65925 com o mandante controlado: o primeiro pop-up é o do goleiro, a expulsão espera na fila e todo pop-up é resolvível', () => {
  const { final, presented } = playAsHuman(strongInput(65925, 'home'));

  const atMinute = presented.filter((p) => p.key === '2|57|0');
  assert.equal(atMinute.length, 2, 'duas decisões neste minuto, uma por vez');

  // 1º pop-up: o goleiro. A expulsão do meia permanece na fila.
  assert.equal(atMinute[0].type, 'INJURY_SUBSTITUTION');
  assert.equal(atMinute[0].playerPos, 'GK');
  assert.deepStrictEqual(atMinute[0].queue, ['RED_CARD_ADJUSTMENT']);
  assert.deepStrictEqual(atMinute[0].queuePos, ['ATT']);

  // 2º pop-up: a expulsão do meia, agora com o time já com goleiro (resolvível), e a fila vazia.
  assert.equal(atMinute[1].type, 'RED_CARD_ADJUSTMENT');
  assert.equal(atMinute[1].playerPos, 'ATT');
  assert.equal(atMinute[1].gkBefore, 1, 'o time já tem exatamente 1 goleiro quando esta decisão aparece');
  assert.deepStrictEqual(atMinute[1].queue, []);

  // (playAsHuman já garantiu que CADA decisão apresentada na partida inteira foi aceita.)
  assert.equal(final.status, 'FINISHED');
  assertOneGoalkeeper(final);
  assert.equal(final.decision, null);
  assert.equal(final.decisionQueue.length, 0);
});

// ---------- 5. Duas expulsões de linha no mesmo minuto: ordem inalterada ----------

test('duas expulsões de linha no mesmo minuto (partidas reais 5915 e 5925): a ordem das decisões não mudou', () => {
  // Linha de base gravada do motor ANTES da correção: as duas partidas ficam byte a byte iguais.
  for (const [index, key] of [[5915, '1|21|0'], [5925, '2|53|0']] as const) {
    const s = simulateMatch(strongInput(index));
    assert.equal(s.status, 'FINISHED');
    const reds = eventsAt(s, key).filter((e) => e.type === 'RED_CARD');
    assert.equal(reds.length, 2, `${index}: duas expulsões no mesmo minuto`);
    assert.ok(reds.every((e) => posOf(s[e.side ?? 'home'], e.playerId) !== 'GK'), 'as duas são de jogadores de linha');
    assert.deepStrictEqual(decisionsAt(s, key), [`${key}:RED_CARD_ADJUSTMENT:1`, `${key}:RED_CARD_ADJUSTMENT:2`]);
    assertOneGoalkeeper(s);
  }
});

// ---------- Cenários sintéticos por seed: minutos com 2 gatilhos, inclusive em 90+ ----------
// Configuração SÓ DE TESTE: cartões e lesões frequentes fazem os dois gatilhos caírem no mesmo minuto por busca de seed.
// Os padrões do jogo (DEFAULT_CONFIG) não mudam. Todos com o mandante como time afetado.

const hot = (over: Partial<EngineConfig>): EngineConfig => ({ ...DEFAULT_CONFIG, yellowRatePerTeam: 45, directRedRatePerTeam: 0, injuryRatePerTeam: 45, ...over });
const LINE_RED_THEN_GK_INJURY = hot({ cardSectorWeights: { GK: 0, DEF: 1, MID: 1, ATT: 1 }, injuryGoalkeeperWeight: 1000 });
const GK_RED_THEN_LINE_INJURY = hot({ cardSectorWeights: { GK: 1000, DEF: 0.001, MID: 0.001, ATT: 0.001 }, injuryGoalkeeperWeight: 0 });
const TWO_LINE_REDS = hot({ cardSectorWeights: { GK: 0, DEF: 1, MID: 1, ATT: 1 }, injuryRatePerTeam: 0, directRedRatePerTeam: 45 });

/** Estado montado no minuto pedido; todos já têm um amarelo, então o próximo amarelo vira vermelho. */
function crafted(seed: string, clock: Clock, stoppageSecond: number, controlled: Side | null = null): MatchState {
  const s = createMatch(matchInput(seed, controlled ? { controlled } : {}));
  s.clock = { ...clock };
  s.stoppage.first = 2;
  s.stoppage.second = stoppageSecond;
  for (const side of ['home', 'away'] as const) s[side].yellowCards = s[side].onField.map((x) => x.playerId);
  return s;
}
const MID_GAME: Clock = { half: 2, minute: 60, added: 0 };
const LAST_MINUTE: Clock = { half: 2, minute: 90, added: 3 }; // último minuto de acréscimo (acréscimo = 3)

// ---------- 7. Caso equivalente em 90+ ----------

const SEED_LINE_THEN_GK_90 = 'lineGoalkeeperLater-2-90-3-2'; // ATT expulso + lesão do goleiro, ambos em 90+3

test('caso equivalente em 90+ (CPU): expulsão de linha + lesão do goleiro no último minuto — sem EngineError, gol decidido primeiro, fim depois da decisão', () => {
  const s = step(crafted(SEED_LINE_THEN_GK_90, LAST_MINUTE, 3), LINE_RED_THEN_GK_INJURY);
  const minute = eventsAt(s, '2|90|3').filter((e) => e.side === 'home');
  const red = minute.find((e) => e.type === 'RED_CARD') as MatchEvent;
  const injury = minute.find((e) => e.type === 'INJURY') as MatchEvent;
  assert.notEqual(posOf(s.home, red.playerId), 'GK');
  assert.equal(posOf(s.home, injury.playerId), 'GK');
  assert.ok(red.seq < injury.seq, 'a expulsão de linha veio antes da lesão do goleiro');

  assert.equal(s.status, 'FINISHED');
  assertOneGoalkeeper(s);
  assert.deepStrictEqual(typesAt(s, '2|90|3'), ['INJURY_SUBSTITUTION', 'RED_CARD_ADJUSTMENT']);
  const sub = s.events.find((e) => e.type === 'SUBSTITUTION' && e.side === 'home' && e.playerId === injury.playerId) as MatchEvent;
  assert.equal(clockLabel(sub.clock), '90+3', 'a troca do fim fica no último minuto jogado');
  assert.equal(lastEvent(s).type, 'FULL_TIME');
  assert.ok(sub.seq < lastEvent(s).seq);
  assert.equal(fullTimes(s).length, 1);
});

test('caso equivalente em 90+ (humano): a partida NÃO termina com decisão pendente; o pop-up do goleiro vem primeiro, depois o da expulsão, e só então o FULL_TIME', () => {
  let s = step(crafted(SEED_LINE_THEN_GK_90, LAST_MINUTE, 3, 'home'), LINE_RED_THEN_GK_INJURY);
  assert.equal(s.status, 'AWAITING_DECISION');
  assert.ok(isPastEnd(s));
  assert.equal(fullTimes(s).length, 0, 'sem FULL_TIME enquanto houver decisão obrigatória');
  const first = s.decision as NonNullable<MatchState['decision']>;
  assert.equal(first.type, 'INJURY_SUBSTITUTION');
  assert.equal(posOf(s.home, first.playerId), 'GK');
  assert.deepStrictEqual(s.decisionQueue.map((d) => d.type), ['RED_CARD_ADJUSTMENT']);

  const r1 = applyCommand(s, playerLikeCpu(s, first));
  assert.ok(r1.ok, 'o pop-up do goleiro é resolvível');
  s = r1.state;
  assert.equal(s.status, 'AWAITING_DECISION', 'ainda falta a expulsão: não encerra');
  assert.equal(fullTimes(s).length, 0);
  assert.equal(s.decision?.type, 'RED_CARD_ADJUSTMENT');
  assert.equal(goalkeepers(s.home).length, 1, 'quando o pop-up da expulsão aparece, o time já tem goleiro');

  const r2 = applyCommand(s, playerLikeCpu(s, s.decision as NonNullable<MatchState['decision']>));
  assert.ok(r2.ok, 'o pop-up da expulsão é resolvível');
  assert.equal(r2.state.status, 'FINISHED');
  assertOneGoalkeeper(r2.state);
  assert.equal(lastEvent(r2.state).type, 'FULL_TIME');
  assert.equal(fullTimes(r2.state).length, 1);
});

// ---------- 6. Goleiro como primeiro gatilho: o comportamento atual continua ----------

test('goleiro como primeiro gatilho (expulsão do goleiro, depois lesão de linha): a ordem original é mantida e tudo continua funcionando', () => {
  for (const [seed, clock, stoppage] of [['goalkeeperFirst-2-60-0-1', MID_GAME, 0], ['goalkeeperFirst-2-90-3-3', LAST_MINUTE, 3]] as const) {
    const s = step(crafted(seed, clock, stoppage), GK_RED_THEN_LINE_INJURY);
    const minute = eventsAt(s, keyOf(clock)).filter((e) => e.side === 'home');
    const red = minute.find((e) => e.type === 'RED_CARD') as MatchEvent;
    const injury = minute.find((e) => e.type === 'INJURY') as MatchEvent;
    assert.equal(posOf(s.home, red.playerId), 'GK', `${seed}: o goleiro é expulso`);
    assert.notEqual(posOf(s.home, injury.playerId), 'GK', `${seed}: a lesão é de jogador de linha`);
    assertOneGoalkeeper(s);
    // Ordem de resolução = ordem dos eventos: goleiro primeiro, sem reordenação.
    assert.deepStrictEqual(typesAt(s, keyOf(clock)), ['RED_CARD_ADJUSTMENT', 'INJURY_SUBSTITUTION'], seed);
    assert.equal(s.status, clock.minute === 90 ? 'FINISHED' : 'RUNNING');
  }
});

test('goleiro como primeiro gatilho com jogador humano: o pop-up do goleiro já era o primeiro e continua sendo; ambos resolvíveis', () => {
  let s = step(crafted('goalkeeperFirst-2-60-0-1', MID_GAME, 0, 'home'), GK_RED_THEN_LINE_INJURY);
  assert.equal(s.status, 'AWAITING_DECISION');
  const first = s.decision as NonNullable<MatchState['decision']>;
  assert.equal(first.type, 'RED_CARD_ADJUSTMENT');
  assert.equal(posOf(s.home, first.playerId), 'GK');
  assert.deepStrictEqual(s.decisionQueue.map((d) => d.type), ['INJURY_SUBSTITUTION']);

  const r1 = applyCommand(s, playerLikeCpu(s, first));
  assert.ok(r1.ok);
  s = r1.state;
  assert.equal(s.decision?.type, 'INJURY_SUBSTITUTION');
  assert.equal(goalkeepers(s.home).length, 1);
  const r2 = applyCommand(s, playerLikeCpu(s, s.decision as NonNullable<MatchState['decision']>));
  assert.ok(r2.ok);
  assert.equal(r2.state.status, 'RUNNING');
  assertOneGoalkeeper(r2.state);
});

// ---------- 5 (sintético). Duas expulsões de linha: ordem intacta também via step, CPU e humano, em jogo e em 90+ ----------

test('duas expulsões de linha no mesmo minuto (por seed): decisões na ordem dos eventos, para CPU e humano, no meio do jogo e em 90+', () => {
  for (const [seed, clock, stoppage] of [['twoLineReds-2-60-0-1', MID_GAME, 0], ['twoLineReds-2-90-3-4', LAST_MINUTE, 3]] as const) {
    const cpu = step(crafted(seed, clock, stoppage), TWO_LINE_REDS);
    const reds = eventsAt(cpu, keyOf(clock)).filter((e) => e.type === 'RED_CARD' && e.side === 'home');
    assert.equal(reds.length, 2, `${seed}: duas expulsões`);
    assert.ok(reds.every((e) => posOf(cpu.home, e.playerId) !== 'GK'));
    assert.deepStrictEqual(typesAt(cpu, keyOf(clock)).slice(0, 2), ['RED_CARD_ADJUSTMENT', 'RED_CARD_ADJUSTMENT']);
    assertOneGoalkeeper(cpu);

    // Humano: o 1º pop-up é da 1ª expulsão, e a 2ª espera na fila, exatamente como os eventos ocorreram.
    const human = step(crafted(seed, clock, stoppage, 'home'), TWO_LINE_REDS);
    assert.equal(human.status, 'AWAITING_DECISION');
    assert.equal(human.decision?.playerId, reds[0].playerId, `${seed}: primeira expulsão primeiro`);
    assert.deepStrictEqual(human.decisionQueue.map((d) => d.playerId), [reds[1].playerId]);
  }
});
