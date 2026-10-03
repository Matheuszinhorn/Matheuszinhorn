import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateWorld, type Player, type World } from '../../engine/index.ts';
import { careerOffers, deserializeCareer, serializeCareer, type CareerState } from '../career.ts';
import { newManagedCareer } from '../manager/actions.ts';
import { startManagedSeason } from '../manager/flow.ts';
import { movePlayer } from '../manager/market.ts';
import { evolveWorld } from '../manager/progression.ts';
import { agePlayers, youthPlayer } from '../manager/world.ts';
import { DEVELOPMENT_PROTO, devProto03, devProto04, developRound, newDevelopment, type DevPosition, type MatchEvidence } from '../development/development.ts';
import { stepDevelopment, withDevelopedStrength } from '../development/feedback.ts';

// DEV-DIAGNOSTIC-0.5 — INVARIANTE DO PRODUTO: 1 ≤ força ≤ 50, inteira, em TODO caminho que cria ou altera força.

const valid = (v: number) => Number.isInteger(v) && v >= 1 && v <= 50;
const assertWorld = (w: World, where: string) => { for (const p of Object.values(w.players)) assert.ok(valid(p.strength), `${where}: ${p.id} com força ${p.strength}`); };
/** mundo com extremos: os 2 primeiros de cada elenco em 1 e 50 */
function extremes(w: World): World {
  const players = { ...w.players };
  for (const club of Object.values(w.clubs)) { const [a, b] = club.squad; players[a] = { ...players[a], strength: 1 }; players[b] = { ...players[b], strength: 50 }; }
  return { ...w, players };
}

test('invariante 1–50: geração do mundo fictício (várias seeds) e juniores de todas as divisões', () => {
  for (const seed of ['a', 'b', 'elite-dev-world-10', 'inv-4']) assertWorld(generateWorld(seed), `generateWorld(${seed})`);
  for (const level of [1, 2, 3, 4, 5]) for (let n = 1; n <= 40; n++) for (const pos of ['GK', 'DEF', 'MID', 'ATT'] as const) assert.ok(valid(youthPlayer('inv', 3, 'c', n, pos, level).strength));
});

test('invariante 1–50: desenvolvimento (0.2, 0.3, 0.4) nos extremos — força 1 jogando mal sem parar e 50 jogando muito bem, todas as idades', () => {
  const awful: MatchEvidence = { played: true, minutes: 90, started: true, goals: 0, saves: 0, teamGoalsFor: 0, teamGoalsAgainst: 5, redCard: true, injured: false };
  const great: MatchEvidence = { played: true, minutes: 90, started: true, goals: 3, saves: 9, teamGoalsFor: 5, teamGoalsAgainst: 0, redCard: false, injured: false };
  const idle: MatchEvidence = { ...awful, played: false, minutes: 0, started: false, redCard: false };
  for (const cfg of [DEVELOPMENT_PROTO, devProto03('A'), devProto03('C'), devProto04('A', 'A'), devProto04('B', 'B'), devProto04('C', 'C')]) {
    for (const [base, e, env] of [[1, awful, 50], [1, idle, 1], [2, awful, 1], [50, great, 50], [49, great, 50], [50, great, 1], [50, idle, 50]] as const) {
      for (const age of [17, 25, 36]) for (const pos of ['GOL', 'ATA'] as DevPosition[]) {
        let dev = newDevelopment('x', base);
        for (let season = 1; season <= 6; season++) for (let round = 1; round <= 38; round++) {
          dev = developRound(dev, { season, round, age, position: pos, environmentLevel: env, divisionLevel: env, evidence: e }, cfg);
          assert.ok(valid(dev.strengthCurrent), `${cfg.version} base ${base} idade ${age}: ${dev.strengthCurrent}`);
          assert.equal(dev.strengthBase, base, 'strengthBase nunca muda');
        }
      }
    }
  }
});

test('invariante 1–50: transferência, envelhecimento, evolução antiga do jogo e composição experimental', () => {
  const c = newManagedCareer('inv-1', 'T', careerOffers('inv-1')[0]);
  const w = extremes(c.world);
  const clubs = Object.keys(w.clubs).sort();
  let t = w;
  for (const club of clubs.slice(0, 10)) t = movePlayer(t, w.clubs[club].squad[0], clubs[clubs.length - 1]);
  assertWorld(t, 'movePlayer');
  for (const club of clubs.slice(0, 10)) assert.equal(t.players[w.clubs[club].squad[0]].strength, 1, 'transferência não muda força');
  assertWorld(agePlayers(w).world, 'agePlayers');
  let e = w;
  for (let i = 0; i < 30; i++) e = evolveWorld(e, { seed: 'inv', season: i, checkpoint: i % 2 ? 'FIM' : 'MEIO', stats: {}, roundsPlayed: 38, youthBonus: () => 5 }).world;
  assertWorld(e, 'evolveWorld (30 checkpoints)');
  const devs = stepDevelopment(new Map(), w, [], 1, 1, devProto04('B', 'B'));
  assertWorld(withDevelopedStrength(w, devs), 'withDevelopedStrength');
});

test('invariante 1–50: virada de temporada com acesso e rebaixamento (força preservada) e persistência', () => {
  const c0 = newManagedCareer('inv-2', 'T', careerOffers('inv-2')[0]);
  const w = extremes(c0.world);
  // fim de temporada montado: 2 clubes trocam entre a D1 e a D2, 2 entre a D3 e a D4
  const divs = [...w.divisions].sort((a, b) => a.level - b.level).map((d) => ({ ...d, clubIds: [...d.clubIds] }));
  const swap = (a: number, b: number) => { for (let k = 0; k < 2; k++) { const x = divs[a].clubIds[k], y = divs[b].clubIds[k]; divs[a].clubIds[k] = y; divs[b].clubIds[k] = x; } };
  swap(0, 1); swap(2, 3);
  const c: CareerState = { ...c0, world: w, roundNumber: 39, pendingPromotion: { divisions: divs, champions: {}, movements: [] } };
  const n = startManagedSeason(c, { evolution: false }).career;
  assertWorld(n.world, 'startManagedSeason');
  for (const p of Object.values(n.world.players)) if (w.players[p.id]) assert.equal(p.strength, w.players[p.id].strength, `virada mudou a força de ${p.id}`);
  const moved = divs[0].clubIds.slice(0, 2);
  for (const id of moved) assert.equal(n.world.clubs[id].divisionId, divs[0].id, 'clube promovido');
  const back = deserializeCareer(serializeCareer(n));
  assertWorld(back.world, 'deserializeCareer');
  assert.deepStrictEqual(Object.values(back.world.players).map((p: Player) => p.strength), Object.values(n.world.players).map((p) => p.strength));
});

test('invariante 1–50: importação do universo real (perfil provisório de teste)', async () => {
  const { loadUniverse } = await import('../../data/load-node.ts');
  const { universeToWorld } = await import('../../data/to-world.ts');
  const { PROVISIONAL_TEST_PROFILE } = await import('../../data/tests/provisional-test-profile.ts');
  const u = loadUniverse('brasileirao-2026').universe;
  assert.ok(u, 'universo real carrega');
  assertWorld(universeToWorld(u as never, { seed: 'inv', provisional: PROVISIONAL_TEST_PROFILE }).world, 'universeToWorld');
});

test('seleção ≠ força: o desenvolvimento só lê evidência de partida; nenhum dado de convocação altera strengthCurrent', () => {
  const cfg = devProto04('B', 'B');
  const e: MatchEvidence = { played: true, minutes: 90, started: true, goals: 1, saves: 0, teamGoalsFor: 2, teamGoalsAgainst: 1, redCard: false, injured: false };
  let a = newDevelopment('x', 40);
  let b = newDevelopment('x', 40);
  for (let round = 1; round <= 38; round++) {
    const ctx = { season: 1, round, age: 22, position: 'ATA' as DevPosition, environmentLevel: 44, divisionLevel: 36, evidence: e };
    a = developRound(a, ctx, cfg);
    // a mesma rodada com dados de seleção "pendurados" (convocado, jogos e gols internacionais): nada muda
    b = developRound(b, { ...ctx, nationalTeam: { called: true, caps: 10, goals: 5 } } as never, cfg);
    assert.deepStrictEqual(b, a);
  }
  // convocar não é um evento de força: sem partida, uma convocação não produz nenhum +1
  let c = newDevelopment('y', 40);
  for (let round = 1; round <= 38; round++) c = developRound(c, { season: 1, round, age: 22, position: 'ATA', environmentLevel: 44, divisionLevel: 36, evidence: { ...e, played: false, minutes: 0, started: false, goals: 0 }, nationalTeam: { called: true } } as never, cfg);
  assert.ok(c.strengthCurrent <= 40, 'convocado sem jogar não ganha força');
  assert.ok(c.history.every((h) => h.to <= h.from));
});
