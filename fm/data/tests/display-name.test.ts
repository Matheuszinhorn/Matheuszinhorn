import assert from 'node:assert/strict';
import { test } from 'node:test';
import { autoLineup, createMatch, simulateMatch, prepareFixture } from '../../engine/index.ts';
import { loadUniverse } from '../load-node.ts';
import type { Universe, UniverseFiles } from '../model.ts';
import { resolveDisplayName } from '../normalize.ts';
import { universeToWorld } from '../to-world.ts';
import { validateUniverse } from '../validate.ts';
import { PROVISIONAL_TEST_PROFILE } from './provisional-test-profile.ts';

// Regra oficial do nome: o jogo exibe o "Apelido" da fonte quando ele existe; senão, o nome disponível.
// fullName é só referência: fica no universo e nunca chega ao World (engine e interface).

const SRC = { source: 'teste', ref: null, confirmedByPrimary: false };
const NAMED = [
  { id: 'a-p1', fullName: 'Gustavo Martins de Souza Santos', nickname: 'G. Martins', position: 'GOL' },
  { id: 'a-p2', fullName: 'Jeferson Forneck', nickname: 'Jefinho', position: 'DEF' },
  { id: 'a-p3', fullName: 'Carlos Eduardo Lima', nickname: null, position: 'DEF' },
  { id: 'a-p4', fullName: 'Rafael Prado', nickname: '   ', position: 'MEI' },
];

/** Dois clubes de 12; o clube "a" usa os jogadores acima, com nome completo e apelido. */
function files(): UniverseFiles & { players: Record<string, unknown>[] } {
  const players: Record<string, unknown>[] = [];
  for (const club of ['a', 'b']) {
    for (let n = 1; n <= 12; n++) {
      const named = club === 'a' ? NAMED[n - 1] : undefined;
      const fullName = named?.fullName ?? null;
      const nickname = named?.nickname ?? null;
      players.push({
        id: named?.id ?? `${club}-p${n}`,
        fullName,
        nickname,
        displayName: resolveDisplayName(nickname, fullName, `Jogador ${n} ${club}`),
        clubId: club,
        position: named?.position ?? (n === 1 ? 'GOL' : n < 6 ? 'DEF' : n < 10 ? 'MEI' : 'ATA'),
        number: n, age: null, nationality: 'Brasil', strength: null, status: 'ATIVO', notes: null, source: SRC,
      });
    }
  }
  return {
    universe: { id: 'u', name: 'U', season: 2026, country: 'Brasil', competitions: ['comp'], defaultCompetitionId: 'comp', primarySource: 'teste', dataStatus: '' },
    competitions: [{ id: 'comp', universeId: 'u', name: 'Comp', season: 2026, country: 'Brasil', division: 1, clubs: ['a', 'b'] }],
    clubs: ['a', 'b'].map((id) => ({ id, name: `Clube ${id}`, fullName: null, competitionId: 'comp', division: 1, city: null, state: null, stadium: null, colors: null, source: SRC })),
    players,
    sources: [{ id: 'teste', name: 'teste', role: 'principal', url: null, retrievedAt: null, notes: '' }],
  };
}

test('1. jogador com apelido: displayName = apelido; fullName guardado como referência', () => {
  assert.equal(resolveDisplayName('G. Martins', 'Gustavo Martins de Souza Santos'), 'G. Martins');
  const u = validateUniverse(files()).universe!;
  assert.deepEqual(
    { fullName: u.players['a-p1'].fullName, displayName: u.players['a-p1'].displayName },
    { fullName: 'Gustavo Martins de Souza Santos', displayName: 'G. Martins' },
  );
});

test('2. jogador sem apelido (null, vazio ou só espaços): displayName = nome disponível', () => {
  assert.equal(resolveDisplayName(null, 'Carlos Eduardo Lima'), 'Carlos Eduardo Lima');
  assert.equal(resolveDisplayName('', 'Carlos Eduardo Lima'), 'Carlos Eduardo Lima');
  assert.equal(resolveDisplayName('   ', 'Rafael Prado'), 'Rafael Prado');
  assert.equal(resolveDisplayName(null, null, 'Nome da fonte'), 'Nome da fonte');
  const u = validateUniverse(files()).universe!;
  assert.equal(u.players['a-p3'].displayName, 'Carlos Eduardo Lima');
  assert.equal(u.players['a-p4'].displayName, 'Rafael Prado');
});

test('3. apelido diferente do nome completo: "Jeferson Forneck" → "Jefinho"', () => {
  assert.equal(resolveDisplayName('Jefinho', 'Jeferson Forneck'), 'Jefinho');
  const u = validateUniverse(files()).universe!;
  assert.equal(u.players['a-p2'].displayName, 'Jefinho');
  assert.equal(u.players['a-p2'].fullName, 'Jeferson Forneck');
});

test('validador: com apelido na fonte, exibir outro nome é ERRO (com a sugestão do apelido)', () => {
  const f = files();
  f.players[1].displayName = 'Jeferson Forneck';
  const issue = validateUniverse(f).issues.find((i) => i.code === 'DISPLAY_NAME_MISMATCH');
  assert.ok(issue);
  assert.equal(issue.entity, 'a-p2');
  assert.equal(issue.suggestion, 'Jefinho');
});

test('4. o World do adaptador usa displayName em Player.name, e a partida também (escalação, eventos)', () => {
  const u = validateUniverse(files()).universe as Universe;
  const { world } = universeToWorld(u, { seed: 's', provisional: PROVISIONAL_TEST_PROFILE });
  for (const p of Object.values(u.players)) assert.equal(world.players[p.id].name, p.displayName);
  const fx = prepareFixture('M1', world.clubs.a, world.clubs.b, world.players);
  const state = createMatch({ matchId: 'M1', seed: 'm', home: fx.home, away: fx.away });
  assert.equal(state.home.players['a-p1'].name, 'G. Martins');
  assert.equal(state.home.players['a-p2'].name, 'Jefinho');
  const lineup = autoLineup(world.clubs.a, world.players);
  assert.ok(lineup.starters.some((s) => s.playerId === 'a-p1')); // o goleiro (G. Martins) é escalado pelo id
  const done = simulateMatch({ matchId: 'M1', seed: 'm', home: fx.home, away: fx.away });
  for (const e of done.events.filter((x) => x.playerId)) assert.equal(done[e.side!].players[e.playerId!].name, world.players[e.playerId!].name);
});

test('5. fullName só existe no universo, como referência: nunca chega ao World nem à partida', () => {
  const u = validateUniverse(files()).universe as Universe;
  const { world } = universeToWorld(u, { seed: 's', provisional: PROVISIONAL_TEST_PROFILE });
  const fx = prepareFixture('M1', world.clubs.a, world.clubs.b, world.players);
  const match = simulateMatch({ matchId: 'M1', seed: 'm', home: fx.home, away: fx.away });
  const worldJson = JSON.stringify(world);
  const matchJson = JSON.stringify(match);
  for (const full of ['Gustavo Martins de Souza Santos', 'Jeferson Forneck']) {
    assert.ok(!worldJson.includes(full), `World contém "${full}"`);
    assert.ok(!matchJson.includes(full), `partida contém "${full}"`);
  }
  assert.ok(!Object.values(world.players).some((p) => 'fullName' in p || 'nickname' in p));
  assert.equal(u.players['a-p1'].fullName, 'Gustavo Martins de Souza Santos'); // continua disponível no universo
});

test('universo real: a Wikipédia não tem apelido nem nome civil; displayName = nome da fonte, força continua null', () => {
  const u = loadUniverse('brasileirao-2026').universe as Universe;
  const ps = Object.values(u.players);
  assert.equal(ps.length, 644);
  assert.ok(ps.every((p) => p.fullName === null && p.nickname === null && p.displayName.trim() !== ''));
  assert.ok(ps.every((p) => p.strength === null && p.source.confirmedByPrimary === false));
  assert.equal(u.players['p-027ce63b'].displayName, 'Gustavo Gómez');
});
