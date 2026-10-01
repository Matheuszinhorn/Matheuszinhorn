import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRound, prepareFixture, roundResults, simulateRound } from '../round.ts';
import { doubleRoundRobin } from '../season/calendar.ts';
import {
  applyPromotionRelegation,
  PromotionError,
  standardRules,
  type PromotionRules,
  type SeasonDivision,
  withDivisions,
} from '../season/promotion.ts';
import { computeStandings, type ScoreLine, type StandingRow } from '../season/standings.ts';
import { generateWorld } from '../world/generate.ts';

/** Classificação fictícia: a ordem dos ids é a ordem da tabela (o primeiro é o campeão). */
function table(ids: string[]): StandingRow[] {
  return ids.map((clubId, i) => ({
    clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: ids.length - i,
  }));
}

function ladder(sizes: number[], prefix = 'D'): SeasonDivision[] {
  return sizes.map((size, i) => ({
    id: `${prefix}${i + 1}`,
    name: `${i + 1}ª`,
    level: i + 1,
    standings: table(Array.from({ length: size }, (_, k) => `${prefix}${i + 1}-c${k + 1}`)),
  }));
}

const clubsOf = (r: { divisions: { id: string; clubIds: string[] }[] }, id: string) => r.divisions.find((d) => d.id === id)!.clubIds;

test('escada 4 × 20: sobem os 4 primeiros, descem os 4 últimos, tamanhos se mantêm', () => {
  const season = { divisions: ladder([20, 20, 20, 20]) };
  const r = applyPromotionRelegation(season, standardRules(season.divisions, 4));

  for (const d of r.divisions) assert.equal(d.clubIds.length, 20);
  const all = r.divisions.flatMap((d) => d.clubIds);
  assert.equal(new Set(all).size, 80, 'nenhum clube some ou aparece duas vezes');

  // D1 recebe os 4 primeiros da D2 e manda os 4 últimos para a D2.
  assert.deepStrictEqual(['D2-c1', 'D2-c2', 'D2-c3', 'D2-c4'].every((c) => clubsOf(r, 'D1').includes(c)), true);
  assert.deepStrictEqual(['D1-c17', 'D1-c18', 'D1-c19', 'D1-c20'].every((c) => clubsOf(r, 'D2').includes(c)), true);
  assert.deepStrictEqual(['D4-c1', 'D4-c2', 'D4-c3', 'D4-c4'].every((c) => clubsOf(r, 'D3').includes(c)), true);
  assert.deepStrictEqual(['D3-c17', 'D3-c18', 'D3-c19', 'D3-c20'].every((c) => clubsOf(r, 'D4').includes(c)), true);
});

test('primeira divisão não sobe e última não rebaixa', () => {
  const season = { divisions: ladder([20, 20, 20, 20]) };
  const r = applyPromotionRelegation(season, standardRules(season.divisions, 4));
  // O campeão da D1 continua na D1 e é o campeão registrado.
  assert.ok(clubsOf(r, 'D1').includes('D1-c1'));
  assert.equal(r.champions.D1, 'D1-c1');
  assert.ok(!r.movements.some((m) => m.fromDivisionId === 'D1' && m.kind === 'PROMOTED'));
  // Os 4 últimos da D4 ficam na D4.
  for (const c of ['D4-c17', 'D4-c18', 'D4-c19', 'D4-c20']) assert.ok(clubsOf(r, 'D4').includes(c));
  assert.ok(!r.movements.some((m) => m.fromDivisionId === 'D4' && m.kind === 'RELEGATED'));
});

test('o campeão de uma divisão que promove sobe e é marcado como campeão', () => {
  const season = { divisions: ladder([20, 20, 20, 20]) };
  const r = applyPromotionRelegation(season, standardRules(season.divisions, 4));
  for (const id of ['D2', 'D3', 'D4']) {
    const champion = r.champions[id];
    const move = r.movements.find((m) => m.clubId === champion)!;
    assert.equal(move.kind, 'PROMOTED');
    assert.equal(move.champion, true);
    assert.equal(move.position, 1);
  }
  assert.equal(r.movements.filter((m) => m.champion).length, 3);
});

test('quantidade configurável: 0, 1, 2 e valores diferentes por fronteira', () => {
  const season = { divisions: ladder([20, 20, 20, 20]) };
  const none = applyPromotionRelegation(season, standardRules(season.divisions, 0));
  assert.equal(none.movements.length, 0);
  assert.deepStrictEqual(clubsOf(none, 'D1'), season.divisions[0].standings.map((r) => r.clubId));

  for (const count of [1, 2, 3, 5]) {
    const r = applyPromotionRelegation(season, standardRules(season.divisions, count));
    assert.equal(r.movements.filter((m) => m.kind === 'PROMOTED').length, 3 * count);
    assert.equal(r.movements.filter((m) => m.kind === 'RELEGATED').length, 3 * count);
    for (const d of r.divisions) assert.equal(d.clubIds.length, 20);
  }

  // Fronteiras diferentes: 3 entre D1 e D2, 4 entre D2 e D3, 2 entre D3 e D4.
  const rules: PromotionRules = {
    D1: { promotion: { count: 0, destinationId: null }, relegation: { count: 3, destinationId: 'D2' } },
    D2: { promotion: { count: 3, destinationId: 'D1' }, relegation: { count: 4, destinationId: 'D3' } },
    D3: { promotion: { count: 4, destinationId: 'D2' }, relegation: { count: 2, destinationId: 'D4' } },
    D4: { promotion: { count: 2, destinationId: 'D3' }, relegation: { count: 0, destinationId: null } },
  };
  const r = applyPromotionRelegation(season, rules);
  assert.equal(r.movements.length, 3 + 3 + 4 + 4 + 2 + 2);
  for (const d of r.divisions) assert.equal(d.clubIds.length, 20);
});

test('genérico: outros formatos (2 divisões de 10; 3 divisões de 6) sem nada específico de um campeonato', () => {
  const two = { divisions: ladder([10, 10], 'L') };
  const r2 = applyPromotionRelegation(two, standardRules(two.divisions, 3));
  assert.equal(clubsOf(r2, 'L1').length, 10);
  assert.ok(['L2-c1', 'L2-c2', 'L2-c3'].every((c) => clubsOf(r2, 'L1').includes(c)));
  assert.ok(['L1-c8', 'L1-c9', 'L1-c10'].every((c) => clubsOf(r2, 'L2').includes(c)));

  const three = { divisions: ladder([6, 6, 6], 'X') };
  const r3 = applyPromotionRelegation(three, standardRules(three.divisions, 2));
  for (const d of r3.divisions) assert.equal(d.clubIds.length, 6);

  // Uma única divisão: ninguém sobe nem desce.
  const solo = { divisions: ladder([8], 'S') };
  const r1 = applyPromotionRelegation(solo, standardRules(solo.divisions, 4));
  assert.equal(r1.movements.length, 0);
  assert.equal(r1.champions.S1, 'S1-c1');
});

test('destino configurável: pode pular um nível (a divisão de baixo sobe direto para a do topo)', () => {
  const season = { divisions: ladder([6, 6, 6], 'Y') };
  const rules: PromotionRules = {
    Y1: { promotion: { count: 0, destinationId: null }, relegation: { count: 2, destinationId: 'Y3' } },
    Y2: { promotion: { count: 0, destinationId: null }, relegation: { count: 0, destinationId: null } },
    Y3: { promotion: { count: 2, destinationId: 'Y1' }, relegation: { count: 0, destinationId: null } },
  };
  const r = applyPromotionRelegation(season, rules);
  assert.ok(['Y3-c1', 'Y3-c2'].every((c) => clubsOf(r, 'Y1').includes(c)));
  assert.ok(['Y1-c5', 'Y1-c6'].every((c) => clubsOf(r, 'Y3').includes(c)));
  assert.deepStrictEqual(clubsOf(r, 'Y2'), season.divisions[1].standings.map((x) => x.clubId));
});

test('regras inválidas são recusadas com erro claro, sem resultado parcial', () => {
  const season = { divisions: ladder([6, 6, 6], 'Z') };
  const code = (rules: PromotionRules, s = season) => {
    try {
      applyPromotionRelegation(s, rules);
    } catch (e) {
      assert.ok(e instanceof PromotionError);
      return e.code;
    }
    return 'NENHUM_ERRO';
  };
  const std = standardRules(season.divisions, 2);

  // Sobem 3 mas descem 2: a divisão mudaria de tamanho.
  assert.equal(code({ ...std, Z2: { ...std.Z2, promotion: { count: 3, destinationId: 'Z1' } } }), 'UNBALANCED');
  assert.equal(code({ ...std, Z1: { ...std.Z1, relegation: { count: 2, destinationId: 'Z9' } } }), 'INVALID_DESTINATION');
  assert.equal(code({ ...std, Z1: { ...std.Z1, relegation: { count: 2, destinationId: 'Z1' } } }), 'INVALID_DESTINATION');
  assert.equal(code({ ...std, Z1: { ...std.Z1, relegation: { count: -1, destinationId: 'Z2' } } }), 'INVALID_COUNT');
  assert.equal(code({ ...std, ZX: std.Z1 }), 'UNKNOWN_DIVISION');
  const { Z3: _sem, ...faltando } = std;
  assert.equal(code(faltando), 'MISSING_RULE');
  // Promoção + rebaixamento maior que a divisão.
  assert.equal(code({ ...std, Z2: { promotion: { count: 4, destinationId: 'Z1' }, relegation: { count: 4, destinationId: 'Z3' } } }), 'TOO_MANY_MOVES');
  // Clube repetido em duas divisões.
  const dup = { divisions: [season.divisions[0], { ...season.divisions[1], standings: [...season.divisions[0].standings.slice(0, 1), ...season.divisions[1].standings.slice(1)] }, season.divisions[2]] };
  assert.equal(code(std, dup), 'DUPLICATE_CLUB');
});

test('função pura: não altera a entrada e repete o mesmo resultado', () => {
  const season = { divisions: ladder([20, 20, 20, 20]) };
  const snapshot = JSON.stringify(season);
  const rules = standardRules(season.divisions, 4);
  const rulesSnapshot = JSON.stringify(rules);
  const a = applyPromotionRelegation(season, rules);
  const b = applyPromotionRelegation(season, rules);
  assert.equal(JSON.stringify(season), snapshot);
  assert.equal(JSON.stringify(rules), rulesSnapshot);
  assert.deepStrictEqual(a, b);
});

test('withDivisions: atualiza o divisionId dos clubes sem alterar o mundo original', () => {
  const world = generateWorld('promo-world', 6);
  const before = JSON.stringify(world);
  const season = {
    divisions: world.divisions.map((d) => ({ id: d.id, name: d.name, level: d.level, standings: table(d.clubIds) })),
  };
  const r = applyPromotionRelegation(season, standardRules(season.divisions, 2));
  const next = withDivisions(world, r.divisions);
  assert.equal(JSON.stringify(world), before);
  for (const d of next.divisions) for (const id of d.clubIds) assert.equal(next.clubs[id].divisionId, d.id);
  const promoted = r.movements.find((m) => m.kind === 'PROMOTED')!;
  assert.equal(next.clubs[promoted.clubId].divisionId, promoted.toDivisionId);
  assert.notEqual(world.clubs[promoted.clubId].divisionId, promoted.toDivisionId);
  assert.throws(() => withDivisions(world, [{ id: 'D1', name: 'x', level: 1, clubIds: ['clube-fantasma'] }]), PromotionError);
});

test('temporada simulada de ponta a ponta: partidas → classificação → promoção → nova temporada', () => {
  // Mundo pequeno (4 divisões × 6 clubes) para manter o teste rápido: 10 rodadas × 12 partidas.
  const world = generateWorld('temporada-integrada', 6);
  const schedules = world.divisions.map((d) => doubleRoundRobin(d.clubIds, 'T1'));
  const rounds = schedules[0].length;
  assert.equal(rounds, 10);

  const results: ScoreLine[][] = world.divisions.map(() => []);
  for (let r = 0; r < rounds; r++) {
    const fixtures = world.divisions.flatMap((d, di) =>
      schedules[di][r].map((m, k) => prepareFixture(`T1-${d.id}-R${r + 1}-P${k + 1}`, world.clubs[m.home], world.clubs[m.away], world.players)),
    );
    const done = simulateRound(createRound(`T1-R${r + 1}`, 'seed-t1', fixtures));
    const byMatch = new Map(roundResults(done).map((x) => [x.matchId, x]));
    world.divisions.forEach((d, di) => {
      schedules[di][r].forEach((_, k) => {
        const res = byMatch.get(`T1-${d.id}-R${r + 1}-P${k + 1}`)!;
        results[di].push({ homeClubId: res.homeClubId, awayClubId: res.awayClubId, homeGoals: res.homeGoals, awayGoals: res.awayGoals });
      });
    });
  }

  const season = {
    divisions: world.divisions.map((d, di) => ({
      id: d.id, name: d.name, level: d.level, standings: computeStandings(d.clubIds, results[di], `desempate-T1-${d.id}`),
    })),
  };
  for (const d of season.divisions) assert.ok(d.standings.every((row) => row.played === 10));

  const outcome = applyPromotionRelegation(season, standardRules(season.divisions, 2));
  const next = withDivisions(world, outcome.divisions);

  for (const d of next.divisions) assert.equal(d.clubIds.length, 6);
  assert.equal(new Set(next.divisions.flatMap((d) => d.clubIds)).size, 24);
  // O campeão da D2 (ao menos ele) está na D1 na temporada seguinte.
  assert.equal(next.clubs[outcome.champions.D2].divisionId, 'D1');
  // O campeão da D1 continua na D1; o último da D4 continua na D4.
  assert.equal(next.clubs[outcome.champions.D1].divisionId, 'D1');
  assert.equal(next.clubs[season.divisions[3].standings[5].clubId].divisionId, 'D4');
  // A nova configuração alimenta o calendário da temporada seguinte sem ajustes.
  for (const d of next.divisions) assert.equal(doubleRoundRobin(d.clubIds, 'T2').length, 10);
});
