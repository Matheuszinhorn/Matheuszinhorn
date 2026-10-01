import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseUniverseJson } from '../import-json.ts';
import { normalizeNationality, normalizeNotes, normalizeOptionalInt, normalizePosition, playerIdFor } from '../normalize.ts';
import { formatIssue, validateUniverse, type IssueCode } from '../validate.ts';
import type { UniverseFiles } from '../model.ts';

// Validação e normalização com dados de teste pequenos (nada aqui depende do universo real).

const SRC = { source: 'teste', ref: null, confirmedByPrimary: false };
function base(): UniverseFiles & { clubs: Record<string, unknown>[]; players: Record<string, unknown>[] } {
  const players: Record<string, unknown>[] = [];
  for (const club of ['c-a', 'c-b']) {
    for (let n = 1; n <= 12; n++) {
      players.push({ id: `${club}-p${n}`, fullName: null, nickname: null, displayName: `Jogador ${n} ${club}`, clubId: club, position: n === 1 ? 'GOL' : n < 6 ? 'DEF' : n < 10 ? 'MEI' : 'ATA', number: n, age: null, nationality: 'Brasil', strength: null, status: 'ATIVO', notes: null, source: SRC });
    }
  }
  return {
    universe: { id: 'u', name: 'U', season: 2026, country: 'Brasil', competitions: ['comp'], defaultCompetitionId: 'comp', primarySource: 'teste', dataStatus: '' },
    competitions: [{ id: 'comp', universeId: 'u', name: 'Comp', season: 2026, country: 'Brasil', division: 1, clubs: ['c-a', 'c-b'] }],
    clubs: ['c-a', 'c-b'].map((id) => ({ id, name: id, fullName: null, competitionId: 'comp', division: 1, city: null, state: null, stadium: null, colors: null, source: SRC })),
    players,
    sources: [{ id: 'teste', name: 'teste', role: 'principal', url: null, retrievedAt: null, notes: '' }],
  };
}
const codes = (f: UniverseFiles) => validateUniverse(f).issues.map((i) => i.code);
const has = (f: UniverseFiles, code: IssueCode) => assert.ok(codes(f).includes(code), `esperado ${code}, veio ${codes(f).join(', ')}`);

test('dados corretos: sem problemas e universo montado', () => {
  const r = validateUniverse(base());
  assert.deepEqual(r.issues, []);
  assert.equal(r.universe!.clubs['c-a'].squad.length, 12);
});

test('posição inválida "VOL": erro claro com sugestão MEI (não converte sozinho)', () => {
  const f = base();
  f.players[5].position = 'VOL';
  const issue = validateUniverse(f).issues.find((i) => i.code === 'INVALID_POSITION')!;
  assert.equal(formatIssue(issue), 'ERROR:\nc-a-p6\nposição inválida: "VOL"\n\nSugestão:\nMEI');
  assert.equal(validateUniverse(f).universe, null);
});

test('força fora de 1–50', () => {
  for (const bad of [0, 51, 25.5, '30']) {
    const f = base();
    f.players[3].strength = bad;
    has(f, 'STRENGTH_OUT_OF_RANGE');
  }
});

test('clube inexistente, jogador sem clubId e competição inexistente', () => {
  let f = base();
  f.players[0].clubId = 'c-x';
  has(f, 'CLUB_NOT_FOUND');
  f = base();
  delete f.players[0].clubId;
  has(f, 'PLAYER_WITHOUT_CLUB');
  f = base();
  f.clubs[0].competitionId = 'comp-x';
  has(f, 'COMPETITION_NOT_FOUND');
  f = base();
  (f.universe as Record<string, unknown>).competitions = ['comp', 'comp-b'];
  has(f, 'COMPETITION_NOT_FOUND');
});

test('duplicidades: clubId, playerId e o mesmo jogador duas vezes', () => {
  let f = base();
  f.clubs.push({ ...f.clubs[0] });
  has(f, 'CLUB_DUPLICATE_ID');
  f = base();
  f.players[1].id = f.players[0].id;
  has(f, 'PLAYER_DUPLICATE_ID');
  f = base();
  f.players[1].displayName = f.players[0].displayName;
  has(f, 'PLAYER_DUPLICATE');
  f = base();
  f.players[1].source = { ...SRC, ref: 'fonte:1' };
  f.players[14].source = { ...SRC, ref: 'fonte:1' };
  has(f, 'PLAYER_DUPLICATE');
});

test('número inválido, idade inválida e número repetido (aviso)', () => {
  for (const bad of [0, 100, 7.5, '9']) {
    const f = base();
    f.players[2].number = bad;
    has(f, 'INVALID_NUMBER');
  }
  let f = base();
  f.players[2].age = 9;
  has(f, 'INVALID_AGE');
  f = base();
  f.players[2].number = 1;
  const r = validateUniverse(f);
  assert.equal(r.ok, true);
  assert.deepEqual(r.issues.map((i) => [i.level, i.code]), [['WARNING', 'DUPLICATE_NUMBER']]);
});

test('elenco jogável: mínimo de 11 e pelo menos um goleiro', () => {
  let f = base();
  f.players = f.players.filter((p) => p.id !== 'c-b-p11' && p.id !== 'c-b-p12');
  assert.deepEqual(validateUniverse(f).issues.map((i) => [i.code, i.entity, i.message]), [['SQUAD_TOO_SMALL', 'c-b', 'elenco com 10 jogadores (mínimo 11)']]);
  f = base();
  f.players[0].position = 'DEF';
  has(f, 'NO_GOALKEEPER');
});

test('JSON malformado: erro de arquivo, sem exceção', () => {
  const r = parseUniverseJson({ universe: '{', competitions: ['[]'], clubs: '[]', players: '[]', sources: '[]' });
  assert.equal(r.ok, false);
  assert.equal(r.issues[0].code, 'INVALID_FILE');
});

test('normalização: posições, números, nacionalidade, observações e id estável', () => {
  assert.deepEqual(['GK', 'df', 'MF', 'FW', 'GOL', 'VOL'].map(normalizePosition), ['GOL', 'DEF', 'MEI', 'ATA', 'GOL', 'VOL']);
  assert.deepEqual(['', '10', null, 'x'].map(normalizeOptionalInt), [null, 10, null, 'x']);
  assert.deepEqual(['BRA', 'Brazil', 'URU', 'Atlântida'].map(normalizeNationality), ['Brasil', 'Brasil', 'Uruguai', 'Atlântida']);
  assert.equal(normalizeNotes('on loan from [[Cruzeiro EC|Cruzeiro]]'), 'emprestado por Cruzeiro');
  assert.equal(normalizeNotes('{{small|on loan from [[Toluca]]}}'), 'emprestado por Toluca');
  assert.equal(normalizeNotes('<small>captain</small>'), 'capitão');
  assert.equal(normalizeNotes('captain; on loan from [[Fortaleza EC|Fortaleza]]'), 'capitão; emprestado por Fortaleza');
  assert.equal(normalizeNotes('2nd vice-captain'), '2º vice-capitão');
  assert.equal(normalizeNotes('3rd captain'), '3º capitão');
  assert.equal(playerIdFor('enwiki:X', 'c', 'Nome A'), playerIdFor('enwiki:X', 'outro-clube', 'Nome B'));
  assert.notEqual(playerIdFor(null, 'c', 'Nome'), playerIdFor(null, 'd', 'Nome'));
});
