import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  autoLineup,
  computeStandings,
  createRound,
  deriveSeed,
  doubleRoundRobin,
  generateWorld,
  prepareFixture,
  roundResults,
  simulateMatch,
  simulateRound,
  summarizeMatch,
  validateLineup,
  type MatchResult,
  type World,
} from '../../engine/index.ts';
import { loadUniverse } from '../load-node.ts';
import { UNIVERSE_POSITIONS, type Universe } from '../model.ts';
import { DEFAULT_UNIVERSE_ID, FICTIONAL_UNIVERSE_ID, UNIVERSES, worldForUniverse } from '../registry.ts';
import { universeToWorld, UniverseConversionError } from '../to-world.ts';
import { PROVISIONAL_TEST_PROFILE } from './provisional-test-profile.ts';

// Universo Brasileirão 2026: carga, integridade dos dados e uso pelo engine SEM mudar o engine.

const loaded = loadUniverse('brasileirao-2026');
const U = loaded.universe as Universe;
const toWorld = (seed = 'teste-universo') => universeToWorld(U, { seed, provisional: PROVISIONAL_TEST_PROFILE });

function playSeason(world: World, seed: string): MatchResult[] {
  const div = world.divisions[0];
  const rounds = doubleRoundRobin(div.clubIds, deriveSeed(seed, 'calendario'));
  const results: MatchResult[] = [];
  rounds.forEach((matches, r) => {
    const fixtures = matches.map((m, i) => prepareFixture(`T2026-R${r + 1}-P${i + 1}`, world.clubs[m.home], world.clubs[m.away], world.players));
    results.push(...roundResults(simulateRound(createRound(`T2026-R${r + 1}`, deriveSeed(seed, `R${r + 1}`), fixtures))));
  });
  return results;
}

test('1. carrega o universo sem erros; avisos só de posição ausente em todas as fontes', () => {
  assert.equal(loaded.ok, true, loaded.issues.map((i) => `${i.code} ${i.entity} ${i.message}`).join('\n'));
  const codes: Record<string, number> = {};
  for (const i of loaded.issues) codes[i.code] = (codes[i.code] ?? 0) + 1;
  assert.deepEqual(codes, { POSITION_MISSING: 303 });
  assert.equal(U.manifest.id, 'brasileirao-2026');
  assert.equal(U.manifest.season, 2026);
  const comp = U.competitions['brasileirao-a-2026'];
  assert.deepEqual([comp.name, comp.season, comp.country, comp.division], ['Campeonato Brasileiro Série A', 2026, 'Brasil', 1]);
});

test('2. a Série A 2026 tem 20 clubes, todos da competição e com elenco', () => {
  const comp = U.competitions['brasileirao-a-2026'];
  assert.equal(comp.clubs.length, 20);
  assert.equal(Object.keys(U.clubs).length, 20);
  for (const c of Object.values(U.clubs)) {
    assert.equal(c.competitionId, comp.id);
    assert.equal(c.division, 1);
    assert.ok(c.squad.length >= 11, `${c.name}: ${c.squad.length}`);
  }
  assert.ok(Object.values(U.clubs).some((c) => c.name === 'Palmeiras') && Object.values(U.clubs).some((c) => c.name === 'Remo'));
});

test('3. jogadores carregados e ligados aos clubes (elenco jogável = ATIVOS com posição daquele clubId)', () => {
  const players = Object.values(U.players);
  assert.equal(players.length, 897);
  for (const c of Object.values(U.clubs)) assert.deepEqual(c.squad, players.filter((p) => p.clubId === c.id && p.status === 'ATIVO' && p.position !== null).map((p) => p.id));
});

test('4. ids estáveis e únicos: clube "br-<slug>", jogador "p-cbf-<id do atleta na CBF>", nunca o nome', () => {
  const ids = Object.values(U.players).map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^p-cbf-[0-9]+$/.test(id)));
  assert.ok(Object.keys(U.clubs).every((id) => /^br-[a-z0-9-]+$/.test(id)));
  // Recarregar dá exatamente os mesmos ids.
  assert.deepEqual(Object.keys((loadUniverse('brasileirao-2026').universe as Universe).players), Object.keys(U.players));
});

test('5. posições só GOL/DEF/MEI/ATA (ou ausente, fora do elenco) e todo clube tem goleiro', () => {
  for (const p of Object.values(U.players)) assert.ok(p.position === null || UNIVERSE_POSITIONS.includes(p.position), `${p.id}: ${p.position}`);
  for (const c of Object.values(U.clubs)) for (const id of c.squad) assert.ok(U.players[id].position !== null && U.players[id].status === 'ATIVO', `${id} no elenco sem posição ou fora do clube`);
  for (const c of Object.values(U.clubs)) assert.ok(c.squad.some((id) => U.players[id].position === 'GOL'), c.name);
});

test('6. força: ainda não avaliada (null) em todos; nunca fora de 1–50', () => {
  for (const p of Object.values(U.players)) assert.ok(p.strength === null || (Number.isInteger(p.strength) && p.strength >= 1 && p.strength <= 50));
  assert.ok(Object.values(U.players).every((p) => p.strength === null));
});

test('7. vínculo jogador/clube e origem: todo jogador confirmado pela CBF; idade da data de nascimento; ausentes ficam null', () => {
  for (const p of Object.values(U.players)) {
    assert.ok(U.clubs[p.clubId]);
    assert.equal(p.source.source, 'cbf');
    assert.equal(p.source.confirmedByPrimary, true);
    assert.ok(p.birthDate && Number.isInteger(p.age) && p.age! >= 14 && p.age! <= 50, p.id);
    assert.ok(p.number === null || (p.number >= 1 && p.number <= 99));
    assert.ok(p.status === 'ATIVO' || /clube atual na CBF/.test(p.notes ?? ''), `${p.id}: transferido sem o clube atual`);
  }
  for (const c of Object.values(U.clubs)) assert.equal(c.colorsSource, 'curadoria-elite-manager');
});

test('8. converter sem perfil provisório falha e diz o que falta (nada é inventado em silêncio)', () => {
  assert.throws(() => universeToWorld(U, { seed: 's' }), (e: unknown) => e instanceof UniverseConversionError && /força de p-/.test((e as Error).message));
});

test('9. o World convertido é aceito pelo engine: escalação válida e partida jogada', () => {
  const { world, report } = toWorld();
  assert.equal(world.divisions.length, 1);
  assert.equal(world.divisions[0].clubIds.length, 20);
  assert.equal(Object.keys(world.players).length, 593); // só ATIVO com posição
  assert.deepEqual(report.provisional, { strength: 593, age: 0, colors: 0, stadiumCapacity: 0 });
  for (const club of Object.values(world.clubs)) assert.deepEqual(validateLineup(autoLineup(club, world.players), club, world.players), []);
  const fx = prepareFixture('M1', world.clubs['br-palmeiras'], world.clubs['br-flamengo'], world.players);
  const match = simulateMatch({ matchId: 'M1', seed: 'seed-partida', home: fx.home, away: fx.away, attendance: fx.attendance });
  assert.equal(match.status, 'FINISHED');
  const ids = new Set(Object.keys(world.players));
  assert.ok(match.events.filter((e) => e.playerId).every((e) => ids.has(e.playerId!)));
});

test('10. temporada inteira (38 rodadas, 380 jogos) com o universo: classificação coerente', () => {
  const { world } = toWorld();
  const results = playSeason(world, 'seed-temporada');
  assert.equal(results.length, 380);
  const table = computeStandings(world.divisions[0].clubIds, results, 'desempate');
  assert.equal(table.length, 20);
  assert.ok(table.every((r) => r.played === 38));
});

test('11. determinismo: mesma seed + mesmos dados + mesmas decisões = mesmo resultado', () => {
  const a = toWorld('mesma-seed');
  const b = toWorld('mesma-seed');
  assert.deepEqual(a.world, b.world);
  assert.deepEqual(playSeason(a.world, 'seed-x'), playSeason(b.world, 'seed-x'));
  const other = playSeason(a.world, 'seed-y');
  assert.notDeepEqual(playSeason(a.world, 'seed-x'), other);
});

test('registro: o padrão continua o universo fictício da V1, idêntico a generateWorld', () => {
  assert.equal(DEFAULT_UNIVERSE_ID, FICTIONAL_UNIVERSE_ID);
  assert.deepEqual(worldForUniverse(DEFAULT_UNIVERSE_ID, { seed: 'qa-v1' }).world, generateWorld('qa-v1'));
  const br = UNIVERSES.find((u) => u.id === 'brasileirao-2026')!;
  assert.equal(br.careerReady, false);
  assert.throws(() => worldForUniverse('brasileirao-2026', { seed: 's' }), /carregado e validado/);
  assert.deepEqual(worldForUniverse('brasileirao-2026', { seed: 's', universe: U, provisional: PROVISIONAL_TEST_PROFILE }).world, toWorld('s').world);
});
