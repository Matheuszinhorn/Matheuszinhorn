import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyEntry,
  computeAttendance,
  computeClubEntry,
  DEFAULT_FINANCE,
  FinanceError,
  type FinanceConfig,
  payroll,
  settleRound,
  stadiumUpkeep,
  ticketRevenue,
  totalsByClub,
} from '../finance.ts';
import { createRound, prepareFixture, roundResults, simulateRound } from '../round.ts';
import type { Club, MatchResult, Player } from '../types.ts';
import { D1, WORLD } from './helpers.ts';

// Clube do exemplo numérico da especificação (seção 19): D3, 12.000 lugares, reputação 40, folha de R$ 75.000 por rodada.
const SPEC_CFG: FinanceConfig = {
  byDivision: { D3: { ticketPrice: 20, tvRightsPerRound: 50_000 } },
  fallback: { ticketPrice: 1, tvRightsPerRound: 1 },
  upkeepPerSeatPerRound: 1,
};

function specClub(): { club: Club; players: Record<string, Player> } {
  const base = WORLD.clubs[D1[0]];
  const template = WORLD.players[base.squad[0]];
  const players: Record<string, Player> = {};
  for (const id of ['p1', 'p2', 'p3']) players[id] = { ...template, id, salary: 25_000, clubId: 'spec' };
  const club: Club = {
    ...base,
    id: 'spec',
    divisionId: 'D3',
    stadium: { name: 'Estádio Exemplo', capacity: 12_000, maxCapacity: 18_000 },
    reputation: 40,
    money: 1_000_000,
    squad: ['p1', 'p2', 'p3'],
  };
  return { club, players };
}

test('público: ocupação = 0,30 + 0,005 × reputação (o exemplo da especificação: 50% de 12.000 = 6.000)', () => {
  const { club } = specClub();
  assert.equal(computeAttendance(club), 6_000);
  assert.equal(computeAttendance({ ...club, reputation: 100 }), 9_600);
  assert.equal(computeAttendance({ ...club, reputation: 0 }), 3_600);
  for (const c of Object.values(WORLD.clubs)) {
    const a = computeAttendance(c);
    assert.ok(Number.isInteger(a) && a > 0 && a <= c.stadium.capacity, `${c.id}: público ${a}`);
  }
});

test('reproduz o exemplo numérico da especificação: +83.000 em casa e −37.000 fora', () => {
  const { club, players } = specClub();
  const attendance = computeAttendance(club);
  const home = computeClubEntry(club, players, { matchId: 'm1', home: true, attendance }, SPEC_CFG);
  assert.equal(home.ticketRevenue, 120_000);
  assert.equal(home.tvRevenue, 50_000);
  assert.equal(home.salaries, 75_000);
  assert.equal(home.upkeep, 12_000);
  assert.equal(home.net, 83_000);

  const away = computeClubEntry(club, players, { matchId: 'm2', home: false, attendance }, SPEC_CFG);
  assert.equal(away.ticketRevenue, 0, 'visitante não recebe bilheteria');
  assert.equal(away.attendance, 0);
  assert.equal(away.tvRevenue, 50_000, 'visitante recebe a cota de TV');
  assert.equal(away.salaries, 75_000, 'salário e manutenção são pagos também fora de casa');
  assert.equal(away.net, -37_000);
});

test('componentes: bilheteria por divisão, folha inclui lesionados, manutenção por lugar', () => {
  const { club, players } = specClub();
  assert.equal(ticketRevenue(club, 1_000, SPEC_CFG), 20_000);
  // Sem a divisão na configuração, vale o valor padrão (fallback).
  assert.equal(ticketRevenue({ ...club, divisionId: 'D9' }, 1_000, SPEC_CFG), 1_000);
  assert.equal(stadiumUpkeep(club, { ...SPEC_CFG, upkeepPerSeatPerRound: 2 }), 24_000);
  // Lesionado e suspenso continuam recebendo.
  players.p1 = { ...players.p1, condition: { injuryRounds: 5, suspensionRounds: 1, yellowCardsAccumulated: 3 } };
  assert.equal(payroll(club, players), 75_000);
  assert.throws(() => payroll({ ...club, squad: ['p1', 'fantasma'] }, players), (e: unknown) => e instanceof FinanceError && e.code === 'UNKNOWN_PLAYER');
});

test('todo valor em dinheiro é inteiro, com a configuração padrão, em qualquer clube do mundo', () => {
  for (const club of Object.values(WORLD.clubs)) {
    const e = computeClubEntry(club, WORLD.players, { matchId: 'x', home: true, attendance: computeAttendance(club) });
    for (const [key, value] of Object.entries(e)) {
      if (typeof value === 'number') assert.ok(Number.isInteger(value), `${club.id}.${key} = ${value}`);
    }
    assert.equal(e.net, e.revenue - e.expenses);
    assert.equal(e.revenue, e.ticketRevenue + e.tvRevenue);
    assert.equal(e.expenses, e.salaries + e.upkeep);
  }
});

test('applyEntry: atualiza o saldo, aceita saldo negativo e não altera o clube original', () => {
  const { club, players } = specClub();
  const away = computeClubEntry(club, players, { matchId: 'm', home: false, attendance: 0 }, SPEC_CFG);
  const after = applyEntry({ ...club, money: 10_000 }, away);
  assert.equal(after.money, 10_000 - 37_000);
  assert.ok(after.money < 0, 'o saldo pode ficar negativo');
  assert.equal(club.money, 1_000_000);
  assert.throws(() => applyEntry(WORLD.clubs[D1[1]], away), (e: unknown) => e instanceof FinanceError && e.code === 'WRONG_CLUB');
});

function fakeResults(): MatchResult[] {
  const mk = (i: number, h: string, a: string): MatchResult => ({
    matchId: `F${i}`, homeClubId: h, awayClubId: a, homeGoals: 1, awayGoals: 0,
    attendance: computeAttendance(WORLD.clubs[h]), injuries: [], redCards: [], yellowCards: [],
  });
  return [mk(1, D1[0], D1[1]), mk(2, D1[2], D1[3])];
}

test('settleRound: cada clube que jogou é lançado; os demais ficam iguais; a entrada não é alterada', () => {
  const clubsBefore = JSON.stringify(WORLD.clubs);
  const results = fakeResults();
  const { clubs, ledger } = settleRound(WORLD.clubs, WORLD.players, results);

  assert.equal(JSON.stringify(WORLD.clubs), clubsBefore, 'o mundo original não muda');
  assert.equal(ledger.length, 4);
  assert.deepStrictEqual(ledger.map((e) => [e.clubId, e.home]), [[D1[0], true], [D1[1], false], [D1[2], true], [D1[3], false]]);
  for (const e of ledger) assert.equal(clubs[e.clubId].money, WORLD.clubs[e.clubId].money + e.net);
  // Clube que não jogou: idêntico (mesma referência).
  assert.equal(clubs[D1[5]], WORLD.clubs[D1[5]]);
  // Bilheteria do mandante = público × preço da divisão dele.
  const home = ledger[0];
  assert.equal(home.ticketRevenue, results[0].attendance * DEFAULT_FINANCE.byDivision.D1.ticketPrice);
});

test('settleRound: recusa clube inexistente e clube jogando duas vezes na mesma rodada', () => {
  const [a, b] = fakeResults();
  const code = (results: MatchResult[]) => {
    try {
      settleRound(WORLD.clubs, WORLD.players, results);
    } catch (e) {
      assert.ok(e instanceof FinanceError);
      return e.code;
    }
    return 'NENHUM_ERRO';
  };
  assert.equal(code([{ ...a, homeClubId: 'clube-fantasma' }]), 'UNKNOWN_CLUB');
  assert.equal(code([a, { ...b, homeClubId: a.homeClubId }]), 'CLUB_TWICE_IN_ROUND');
});

test('determinismo: o mesmo extrato sempre gera os mesmos números', () => {
  const r1 = settleRound(WORLD.clubs, WORLD.players, fakeResults());
  const r2 = settleRound(WORLD.clubs, WORLD.players, fakeResults());
  assert.deepStrictEqual(r1, r2);
});

test('totalsByClub: soma várias rodadas por clube', () => {
  const round1 = settleRound(WORLD.clubs, WORLD.players, fakeResults());
  const round2 = settleRound(round1.clubs, WORLD.players, fakeResults().map((r) => ({ ...r, matchId: `${r.matchId}-b` })));
  const totals = totalsByClub([...round1.ledger, ...round2.ledger]);
  const id = D1[0];
  assert.equal(totals[id].rounds, 2);
  assert.equal(totals[id].net, round1.ledger[0].net + round2.ledger[0].net);
  assert.equal(round2.clubs[id].money, WORLD.clubs[id].money + totals[id].net);
  for (const t of Object.values(totals)) {
    assert.equal(t.revenue, t.ticketRevenue + t.tvRevenue);
    assert.equal(t.net, t.revenue - t.expenses);
  }
});

test('integração: rodada simulada → resultados → finanças (o público da partida vira bilheteria)', () => {
  const fixtures = [];
  for (let i = 0; i < 10; i++) fixtures.push(prepareFixture(`FIN-P${i + 1}`, WORLD.clubs[D1[2 * i]], WORLD.clubs[D1[2 * i + 1]], WORLD.players));
  const round = simulateRound(createRound('FIN', 'seed-financas', fixtures));
  const results = roundResults(round);
  const { clubs, ledger } = settleRound(WORLD.clubs, WORLD.players, results);

  assert.equal(ledger.length, 20);
  for (const state of round.matches) {
    const homeEntry = ledger.find((e) => e.matchId === state.matchId && e.home)!;
    assert.equal(state.attendance, computeAttendance(WORLD.clubs[state.home.clubId]));
    assert.equal(homeEntry.attendance, state.attendance);
    assert.equal(homeEntry.ticketRevenue, state.attendance * DEFAULT_FINANCE.byDivision.D1.ticketPrice);
  }
  for (const id of D1) assert.notEqual(clubs[id].money, WORLD.clubs[id].money);
});

test('calibragem: em cada divisão o clube médio fecha a temporada perto do equilíbrio; há clubes no azul e no vermelho', () => {
  // 38 rodadas: 19 em casa e 19 fora, com o público-base de cada clube.
  for (const division of WORLD.divisions) {
    const margins = division.clubIds.map((id) => {
      const club = WORLD.clubs[id];
      const attendance = computeAttendance(club);
      const home = computeClubEntry(club, WORLD.players, { matchId: 'h', home: true, attendance });
      const away = computeClubEntry(club, WORLD.players, { matchId: 'a', home: false, attendance });
      return (home.net + away.net) / (home.expenses + away.expenses);
    });
    const average = margins.reduce((s, m) => s + m, 0) / margins.length;
    assert.ok(average > 0 && average < 0.2, `${division.id}: margem média ${(100 * average).toFixed(1)}%`);
    assert.ok(margins.some((m) => m < 0), `${division.id}: deveria haver clubes no vermelho`);
    assert.ok(margins.some((m) => m > 0.2), `${division.id}: deveria haver clubes com folga`);
  }
});
