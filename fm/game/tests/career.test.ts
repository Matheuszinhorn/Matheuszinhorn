import assert from 'node:assert/strict';
import { test } from 'node:test';
import { autoLineup, createRound, roundResults, simulateRound, type MatchResult, type Player } from '../../engine/index.ts';
import { suggestedCommand } from '../assist.ts';
import {
  ROUNDS_PER_SEASON,
  applyConditions,
  careerOffers,
  clubsContext,
  createCareer,
  deserializeCareer,
  divisionStandings,
  finishRound,
  isSeasonOver,
  matchIdFor,
  planRound,
  resolveUserLineup,
  serializeCareer,
  startNextSeason,
  userClub,
  withUserLineup,
  CareerError,
  type CareerState,
} from '../career.ts';
import { createSession, type Scheduler } from '../session.ts';

// Carreira: rodadas em sequência, lesões e suspensões, finanças uma vez por rodada, temporada, promoção e persistência.

const SEED = 'carreira-de-teste';
const offers = careerOffers(SEED);
const fresh = () => createCareer({ seed: SEED, coachName: 'Marcos Vilela', clubId: offers[0] });

/** Joga uma rodada só com a CPU (sem clube controlado) e aplica o resultado. */
function cpuRound(c: CareerState) {
  const plan = planRound(c);
  const round = simulateRound(createRound(plan.roundId, plan.seed, plan.fixtures, null));
  return finishRound(c, roundResults(round));
}

test('ofertas de clube: 3 clubes distintos (um da 3ª e dois da 4ª divisão), sempre os mesmos para a mesma seed', () => {
  assert.equal(offers.length, 3);
  assert.equal(new Set(offers).size, 3);
  assert.deepStrictEqual(careerOffers(SEED), offers);
  const world = createCareer({ seed: SEED, coachName: 'A', clubId: offers[0] }).world;
  assert.deepStrictEqual(offers.map((id) => world.clubs[id].divisionId), ['D3', 'D4', 'D4']);
});

test('criar carreira: 4 divisões × 20 clubes, calendário de 38 rodadas com 10 jogos por divisão, rodada 1', () => {
  const c = fresh();
  assert.equal(c.season, 2026);
  assert.equal(c.roundNumber, 1);
  assert.equal(c.world.divisions.length, 4);
  for (const d of c.world.divisions) {
    assert.equal(d.clubIds.length, 20);
    assert.equal(c.schedule[d.id].length, ROUNDS_PER_SEASON);
    assert.ok(c.schedule[d.id].every((r) => r.length === 10));
  }
  assert.equal(c.coach.name, 'Marcos Vilela');
  assert.throws(() => createCareer({ seed: SEED, coachName: '   ', clubId: offers[0] }), (e: unknown) => (e as CareerError).code === 'COACH_NAME');
  assert.throws(() => createCareer({ seed: SEED, coachName: 'X', clubId: 'nao-existe' }), (e: unknown) => (e as CareerError).code === 'UNKNOWN_CLUB');
});

test('planRound: 40 partidas com id estável, o jogo do jogador incluído e o clube dele como controlado', () => {
  const c = fresh();
  const plan = planRound(c);
  assert.equal(plan.fixtures.length, 40);
  assert.equal(new Set(plan.fixtures.map((f) => f.matchId)).size, 40);
  assert.ok(plan.fixtures.every((f) => /^T2026-D[1-4]-R01-P\d\d$/.test(f.matchId)));
  assert.equal(matchIdFor(2026, 2, 5, 7), 'T2026-D2-R05-P07');
  const mine = plan.fixtures.find((f) => f.matchId === plan.userMatchId);
  assert.ok(mine && (mine.home.club.id === c.userClubId || mine.away.club.id === c.userClubId));
  assert.equal(plan.controlledClubId, c.userClubId);
  assert.deepStrictEqual(planRound(c).seed, plan.seed, 'determinístico');
});

test('finishRound: classificação, finanças e rodada avançam; resultados de outra rodada são recusados', () => {
  const c = fresh();
  const plan = planRound(c);
  const results = roundResults(simulateRound(createRound(plan.roundId, plan.seed, plan.fixtures, null)));
  const before = userClub(c).money;
  const out = finishRound(c, results);
  assert.equal(out.career.roundNumber, 2);
  assert.equal(out.career.results.length, 40);
  assert.equal(userClub(out.career).money, before + out.ledger.net, 'o caixa muda exatamente pelo extrato');
  assert.equal(out.career.userLedger.length, 1);
  for (const d of out.career.world.divisions) {
    const table = divisionStandings(out.career, d.id);
    assert.equal(table.length, 20);
    assert.ok(table.every((row) => row.played === 1));
  }
  assert.equal(c.roundNumber, 1, 'a carreira recebida não é alterada');
  // Aplicar a mesma rodada duas vezes (cobraria tudo em dobro) ou uma rodada trocada é recusado.
  assert.throws(() => finishRound(out.career, results), (e: unknown) => (e as CareerError).code === 'ROUND_MISMATCH');
  assert.throws(() => finishRound(c, results.slice(1)), (e: unknown) => (e as CareerError).code === 'ROUND_MISMATCH');
});

test('applyConditions: lesão e suspensão descontam 1 rodada; vermelho = 1 rodada; 3 amarelos = 1 rodada e zera', () => {
  const base = (id: string, cond: Player['condition']): Player => ({ id, name: id, age: 25, nationality: 'BR', position: 'MID', strength: 20, temperament: 'NORMAL', salary: 1, marketValue: 1, contract: { endSeason: 2030 }, clubId: 'c', condition: cond });
  const players: Record<string, Player> = {
    hurt: base('hurt', { injuryRounds: 3, suspensionRounds: 0, yellowCardsAccumulated: 0 }),
    banned: base('banned', { injuryRounds: 0, suspensionRounds: 1, yellowCardsAccumulated: 0 }),
    newInjury: base('newInjury', { injuryRounds: 0, suspensionRounds: 0, yellowCardsAccumulated: 0 }),
    sent: base('sent', { injuryRounds: 0, suspensionRounds: 0, yellowCardsAccumulated: 0 }),
    booked: base('booked', { injuryRounds: 0, suspensionRounds: 0, yellowCardsAccumulated: 2 }),
    once: base('once', { injuryRounds: 0, suspensionRounds: 0, yellowCardsAccumulated: 0 }),
  };
  const result: MatchResult = {
    matchId: 'm', homeClubId: 'c', awayClubId: 'd', homeGoals: 0, awayGoals: 0, attendance: 1,
    injuries: [{ clubId: 'c', playerId: 'newInjury', rounds: 2 }],
    redCards: [{ clubId: 'c', playerId: 'sent' }],
    yellowCards: [{ clubId: 'c', playerId: 'booked' }, { clubId: 'c', playerId: 'once' }],
  };
  const next = applyConditions(players, [result]);
  assert.equal(next.hurt.condition.injuryRounds, 2, 'quem estava lesionado cumpre uma rodada');
  assert.equal(next.banned.condition.suspensionRounds, 0, 'quem estava suspenso cumpre e volta');
  assert.equal(next.newInjury.condition.injuryRounds, 2, 'lesão nova não é descontada na própria rodada');
  assert.equal(next.sent.condition.suspensionRounds, 1, 'vermelho = 1 rodada');
  assert.equal(next.booked.condition.suspensionRounds, 1, '3º amarelo = 1 rodada');
  assert.equal(next.booked.condition.yellowCardsAccumulated, 0, 'e o acumulado zera');
  assert.equal(next.once.condition.yellowCardsAccumulated, 1);
  assert.equal(players.hurt.condition.injuryRounds, 3, 'a entrada não é alterada');
});

test('escalação do jogador: inválida é recusada; se um titular fica indisponível, o jogo monta o melhor time sem ele', () => {
  const c = fresh();
  const club = userClub(c);
  const auto = autoLineup(club, c.world.players, club.defaultTactics);
  const chosen = withUserLineup(c, { ...auto, style: 'OFFENSIVE', behavior: 'AGGRESSIVE' });
  assert.equal(resolveUserLineup(chosen).lineup.style, 'OFFENSIVE');
  assert.equal(resolveUserLineup(chosen).adjusted, false);
  assert.throws(() => withUserLineup(c, { ...auto, starters: auto.starters.slice(1) }), (e: unknown) => (e as CareerError).code === 'INVALID_LINEUP');
  // Um titular se lesiona entre as rodadas.
  const hurtId = auto.starters.find((s) => s.sector !== 'GK')!.playerId;
  const hurt: CareerState = { ...chosen, world: { ...chosen.world, players: { ...chosen.world.players, [hurtId]: { ...chosen.world.players[hurtId], condition: { injuryRounds: 2, suspensionRounds: 0, yellowCardsAccumulated: 0 } } } } };
  const fixed = resolveUserLineup(hurt);
  assert.equal(fixed.adjusted, true);
  assert.ok(!fixed.lineup.starters.some((s) => s.playerId === hurtId));
  assert.equal(fixed.lineup.starters.length, 11);
  assert.equal(fixed.lineup.style, 'OFFENSIVE', 'mantém a tática escolhida');
});

test('persistência: salvar e carregar devolve a mesma carreira; arquivo estranho é recusado', () => {
  const played = cpuRound(fresh()).career;
  const restored = deserializeCareer(serializeCareer(played));
  assert.deepStrictEqual(restored, played);
  assert.throws(() => deserializeCareer('{isto não é json'), (e: unknown) => (e as CareerError).code === 'BAD_SAVE');
  assert.throws(() => deserializeCareer('{"version":99}'), (e: unknown) => (e as CareerError).code === 'BAD_SAVE');
});

test('determinismo: a mesma carreira, jogada do mesmo jeito, dá exatamente a mesma classificação', () => {
  let a = fresh();
  let b = fresh();
  for (let i = 0; i < 3; i++) {
    a = cpuRound(a).career;
    b = cpuRound(b).career;
  }
  assert.deepStrictEqual(a.results, b.results);
  assert.deepStrictEqual(divisionStandings(a, 'D1'), divisionStandings(b, 'D1'));
});

/** Temporizador manual: cada chamada de fireNext dispara o próximo pedido. */
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

test('fluxo real pela Session: 3 rodadas no modo instantâneo, decisões do jogador resolvidas pela sugestão, resultados aplicados', () => {
  let c = fresh();
  const sched = new ManualScheduler();
  const session = createSession({ scheduler: sched, speed: 'INSTANT' });
  let decisions = 0;
  for (let r = 0; r < 3; r++) {
    const plan = planRound(c);
    session.startRound({ roundId: plan.roundId, seed: plan.seed, fixtures: plan.fixtures, controlledClubId: plan.controlledClubId });
    session.play();
    for (let guard = 0; session.getState().status !== 'ROUND_FINISHED'; guard++) {
      assert.ok(guard < 5000, 'a rodada deveria terminar');
      const snap = session.getState();
      if (snap.status === 'AWAITING_DECISION' && snap.pending) {
        const match = snap.round!.matches.find((m) => m.matchId === snap.pending!.matchId)!;
        const res = session.dispatch(suggestedCommand(match, snap.pending.decision));
        assert.ok(res.ok, 'toda decisão apresentada é resolvível pela sugestão');
        decisions += 1;
      } else assert.ok(sched.fireNext(), 'sem temporizador e sem decisão: a sessão travou');
    }
    const outcome = finishRound(c, session.results());
    assert.equal(outcome.career.roundNumber, r + 2);
    c = outcome.career;
    // Toda partida termina com exatamente 1 goleiro de cada lado.
    for (const m of session.getState().round!.matches) for (const side of ['home', 'away'] as const) assert.equal(m[side].onField.filter((s) => s.sector === 'GK').length, 1);
  }
  assert.equal(c.results.length, 120);
  assert.ok(decisions >= 0);
  session.dispose();
});

test('clubsContext: entrega ao game/queries a mesma estrutura da carreira (mundo, calendário, resultados)', () => {
  const c = cpuRound(fresh()).career;
  const ctx = clubsContext(c);
  assert.equal(ctx.controlledClubId, c.userClubId);
  assert.equal(ctx.roundNumber, 2);
  assert.equal(ctx.results.length, 40);
  assert.equal(ctx.round, null);
});

test('temporada inteira (CPU): 38 rodadas, finanças, tabela final, acesso e rebaixamento e a nova temporada', { timeout: 240_000 }, () => {
  let c = fresh();
  const startMoney = userClub(c).money;
  let net = 0;
  for (let r = 1; r <= ROUNDS_PER_SEASON; r++) {
    const out = cpuRound(c);
    net += out.ledger.net;
    c = out.career;
    assert.equal(out.seasonEnded, r === ROUNDS_PER_SEASON);
  }
  assert.ok(isSeasonOver(c));
  assert.equal(c.results.length, ROUNDS_PER_SEASON * 40);
  assert.equal(userClub(c).money, startMoney + net, 'o caixa da temporada fecha com a soma dos extratos');
  assert.equal(c.userLedger.length, ROUNDS_PER_SEASON);
  assert.throws(() => planRound(c), (e: unknown) => (e as CareerError).code === 'SEASON_OVER');

  // Tabela final: 38 jogos por clube; campeões e movimentos coerentes.
  for (const d of c.world.divisions) {
    const table = divisionStandings(c, d.id);
    assert.ok(table.every((row) => row.played === 38));
    assert.equal(c.pendingPromotion!.champions[d.id], table[0].clubId);
  }
  const movements = c.pendingPromotion!.movements;
  assert.equal(movements.filter((m) => m.kind === 'PROMOTED').length, 12, '4 sobem em cada uma das 3 divisões de baixo');
  assert.equal(movements.filter((m) => m.kind === 'RELEGATED').length, 12);
  assert.equal(c.history.length, 1);
  assert.equal(c.history[0].userNet, net);

  const next = startNextSeason(c);
  assert.equal(next.season, 2027);
  assert.equal(next.roundNumber, 1);
  assert.equal(next.results.length, 0);
  assert.equal(next.userLedger.length, 0);
  assert.equal(next.history.length, 1, 'o histórico se mantém');
  for (const d of next.world.divisions) {
    assert.equal(d.clubIds.length, 20, 'as divisões mantêm 20 clubes');
    assert.equal(next.schedule[d.id].length, ROUNDS_PER_SEASON);
    for (const id of d.clubIds) assert.equal(next.world.clubs[id].divisionId, d.id, 'o divisionId acompanha o clube');
  }
  for (const m of movements) assert.equal(next.world.clubs[m.clubId].divisionId, m.toDivisionId);
  assert.ok(Object.values(next.world.players).every((p) => p.condition.yellowCardsAccumulated === 0));
  // A temporada seguinte joga normalmente.
  assert.equal(planRound(next).fixtures.length, 40);
  assert.equal(planRound(next).roundId, 'T2027-R01');
});
