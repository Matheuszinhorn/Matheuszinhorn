import assert from 'node:assert/strict';
import { test } from 'node:test';
import { simulateMatch, summarizeMatch } from '../match/simulate.ts';
import { deriveSeed } from '../rng.ts';
import { createRound, prepareFixture, roundResults, simulateRound } from '../round.ts';
import { doubleRoundRobin, longestHomeAwayRun } from '../season/calendar.ts';
import { computeStandings } from '../season/standings.ts';
import { generateWorld } from '../world/generate.ts';
import { D1, WORLD } from './helpers.ts';

function fixtures() {
  const out = [];
  for (let i = 0; i < 10; i++) {
    out.push(prepareFixture(`R1-P${i + 1}`, WORLD.clubs[D1[2 * i]], WORLD.clubs[D1[2 * i + 1]], WORLD.players));
  }
  return out;
}

test('rodada: a ordem das partidas não muda nenhum resultado', () => {
  const fx = fixtures();
  const normal = roundResults(simulateRound(createRound('R1', 'seed-rodada', fx)));
  const reversed = roundResults(simulateRound(createRound('R1', 'seed-rodada', [...fx].reverse())));
  const byId = (rs: typeof normal) => Object.fromEntries(rs.map((r) => [r.matchId, r]));
  assert.deepStrictEqual(byId(reversed), byId(normal));

  // Cada partida da rodada é idêntica à mesma partida simulada sozinha com a seed derivada.
  for (const f of fx) {
    const alone = simulateMatch({ matchId: f.matchId, seed: deriveSeed('seed-rodada', f.matchId), home: f.home, away: f.away, attendance: f.attendance });
    assert.deepStrictEqual(summarizeMatch(alone), byId(normal)[f.matchId]);
  }
});

test('rodada → classificação: 20 clubes, pontos e jogos coerentes', () => {
  const results = roundResults(simulateRound(createRound('R1', 'seed-rodada', fixtures())));
  const table = computeStandings(D1, results, 'desempate');
  assert.equal(table.length, 20);
  assert.ok(table.every((r) => r.played === 1));
  const totalPoints = table.reduce((n, r) => n + r.points, 0);
  const draws = results.filter((r) => r.homeGoals === r.awayGoals).length;
  assert.equal(totalPoints, 3 * (10 - draws) + 2 * draws);
  for (let i = 1; i < table.length; i++) assert.ok(table[i - 1].points >= table[i].points);
});

test('classificação: desempate por vitórias, saldo, gols pró e confronto direto', () => {
  const results = [
    { homeClubId: 'A', awayClubId: 'B', homeGoals: 1, awayGoals: 0 },
    { homeClubId: 'C', awayClubId: 'D', homeGoals: 3, awayGoals: 0 },
    { homeClubId: 'B', awayClubId: 'C', homeGoals: 2, awayGoals: 1 },
    { homeClubId: 'D', awayClubId: 'A', homeGoals: 0, awayGoals: 0 },
  ];
  const t = computeStandings(['A', 'B', 'C', 'D'], results, 's');
  // A: 4 pts; C: 3 pts (saldo +2); B: 3 pts (saldo 0); D: 1 pt.
  assert.deepStrictEqual(t.map((r) => r.clubId), ['A', 'C', 'B', 'D']);
  // Empate total entre X e Y: vale o confronto direto.
  const h2h = computeStandings(['X', 'Y', 'Z'], [
    { homeClubId: 'X', awayClubId: 'Y', homeGoals: 0, awayGoals: 1 },
    { homeClubId: 'X', awayClubId: 'Z', homeGoals: 1, awayGoals: 0 },
    { homeClubId: 'Z', awayClubId: 'Y', homeGoals: 1, awayGoals: 0 },
  ], 's');
  assert.equal(h2h[0].points, h2h[1].points);
});

test('calendário: 38 rodadas, todos se enfrentam em casa e fora, no máximo 2 jogos seguidos no mesmo mando', () => {
  const rounds = doubleRoundRobin(D1, 'temporada-2026');
  assert.equal(rounds.length, 38);
  const pairs = new Set<string>();
  for (const round of rounds) {
    const playing = new Set<string>();
    for (const f of round) {
      assert.ok(!playing.has(f.home) && !playing.has(f.away), 'ninguém joga duas vezes na rodada');
      playing.add(f.home);
      playing.add(f.away);
      pairs.add(`${f.home}>${f.away}`);
    }
    assert.equal(playing.size, 20);
  }
  assert.equal(pairs.size, 20 * 19);
  for (const id of D1) assert.ok(longestHomeAwayRun(rounds, id) <= 2);
  assert.deepStrictEqual(doubleRoundRobin(D1, 'temporada-2026'), rounds);
});

test('mundo fictício: 4 divisões × 20 clubes, forças 1–50, gerado igual pela mesma seed', () => {
  const w = generateWorld('mundo-x');
  assert.equal(w.divisions.length, 4);
  for (const d of w.divisions) assert.equal(d.clubIds.length, 20);
  for (const p of Object.values(w.players)) assert.ok(p.strength >= 1 && p.strength <= 50 && Number.isInteger(p.strength));
  assert.deepStrictEqual(generateWorld('mundo-x'), w);
  const names = new Set(Object.values(w.clubs).map((c) => c.name));
  assert.equal(names.size, 80, 'nomes de clube únicos');
});
