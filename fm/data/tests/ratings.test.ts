import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { generateWorld } from '../../engine/index.ts';
import { BRASILEIRAO_A_2026, BRAZIL_2026, FICTIONAL_SYSTEM, checkLeagueSystem } from '../competition-rules.ts';
import { ageAt } from '../import/cbf-squads.ts';
import { isoDate, linkByBirthAndName, namesCompatible } from '../import/matching.ts';
import { loadUniverse } from '../load-node.ts';
import type { Universe } from '../model.ts';
import { resolveDisplayName } from '../normalize.ts';
import { EM_RATING_2_VERSION } from '../rating/em-rating-2.ts';
import { FICTIONAL_UNIVERSE_ID, worldForUniverse } from '../registry.ts';
import { validateUniverse } from '../validate.ts';
import { createCareer, deserializeCareer, serializeCareer, careerOffers } from '../../game/career.ts';
import { ensureManager } from '../../game/manager/core.ts';
import { playerAccepts } from '../../game/manager/market.ts';
import { personalityOf } from '../../game/manager/people.ts';

// Universo real (CBF) + metodologia de força (EM-RATING-2.0, só simulada) + regras por competição.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const loaded = loadUniverse('brasileirao-2026');
const U = loaded.universe as Universe;
const players = Object.values(U.players);
const sim = JSON.parse(readFileSync(join(ROOT, 'reports/em-rating-2.0-simulation.json'), 'utf8'));
const simStrengths = sim.players.map((x: { oficial: { strength: number | null } }) => x.oficial.strength).filter((v: number | null) => v !== null) as number[];

test('1. todo jogador tem displayName válido (texto não vazio, sem espaços nas pontas)', () => {
  assert.ok(loaded.ok, 'universo válido');
  for (const p of players) assert.ok(typeof p.displayName === 'string' && p.displayName.trim() === p.displayName && p.displayName.length > 0, p.id);
});

test('2. o apelido da CBF é priorizado no nome exibido', () => {
  const withNick = players.filter((p) => p.nickname);
  assert.ok(withNick.length > players.length * 0.9, `${withNick.length} de ${players.length} com apelido`);
  for (const p of withNick) assert.equal(p.displayName, p.nickname, p.id);
  assert.equal(resolveDisplayName('Jefinho', 'Jeferson Forneck'), 'Jefinho');
});

test('3. sem apelido, o nome disponível é usado (e o nome civil fica só como referência)', () => {
  assert.equal(resolveDisplayName(null, 'Carlos Eduardo Lima'), 'Carlos Eduardo Lima');
  assert.equal(resolveDisplayName('  ', 'Carlos Eduardo Lima'), 'Carlos Eduardo Lima');
  for (const p of players.filter((x) => !x.nickname)) assert.equal(p.displayName, p.fullName, p.id);
});

test('4. nenhum clube usa escudo, logo ou imagem', () => {
  const raw = readFileSync(join(ROOT, 'data/universes/brasileirao-2026/clubs.json'), 'utf8').toLowerCase();
  for (const word of ['crest', 'escudo', 'logo', 'badge', '.png', '.svg', '.jpg', 'brasao']) assert.ok(!raw.includes(word), word);
});

test('5. todos os clubes têm cores válidas (#RRGGBB) e a origem das cores registrada', () => {
  for (const c of Object.values(U.clubs)) {
    assert.ok(c.colors, c.id);
    for (const k of ['primary', 'secondary', 'accent'] as const) assert.match(c.colors![k] ?? '', /^#[0-9A-F]{6}$/, `${c.id}.${k}`);
    assert.equal(c.colorsSource, 'curadoria-elite-manager');
  }
});

test('6. a força simulada fica sempre entre 1 e 50; nenhuma força oficial aplicada', () => {
  assert.ok(simStrengths.length > 0);
  for (const v of simStrengths) assert.ok(Number.isInteger(v) && v >= 1 && v <= 50, String(v));
  for (const p of players) assert.equal(p.strength, null, p.id);
});

test('7–8. simulação determinística: mesmo dado + mesma versão = mesma força (gravada com a versão)', () => {
  assert.equal(sim.methodVersion, EM_RATING_2_VERSION);
  assert.equal(sim.config.version, EM_RATING_2_VERSION);
  // a simulação é refeita nos testes de em-rating-2.test.ts; aqui, o arquivo cobre todos os atletas
  assert.equal(sim.players.length, players.length);
});

test('9. nenhum rating de terceiros: jogadores sem referência externa e simulação declarada sem terceiros', () => {
  assert.equal(sim.thirdPartyRatings, 'nenhum');
  for (const p of players) assert.ok(!p.rating && !p.externalIds?.eaFc, p.id);
});

test('10. jogadores com dados insuficientes ficam identificados (força null + motivo), não estimados', () => {
  const missing = sim.players.filter((x: { oficial: { strength: number | null } }) => x.oficial.strength === null);
  for (const x of missing) assert.ok(x.oficial.flags.includes('DADOS_INSUFICIENTES'), x.playerId);
});

test('11. dado incompleto não é inventado: posição/nacionalidade só com fonte; força não aplicada', () => {
  assert.equal(sim.applied, false);
  for (const p of players) {
    assert.equal(p.strength, null, `${p.id}: força aplicada antes da aprovação da metodologia`);
    if (p.position !== null) assert.ok(p.fieldSources?.position, `${p.id}: posição sem fonte`);
    if (p.nationality !== null) assert.ok(p.fieldSources?.nationality, `${p.id}: nacionalidade sem fonte`);
    assert.equal(p.source.source, 'cbf');
    assert.equal(p.source.confirmedByPrimary, true);
  }
  assert.ok(players.some((p) => p.position === null), 'há jogadores sem posição em fonte nenhuma: ficam null, não estimados');
});

test('12. o universo fictício continua o padrão e igual ao gerado pelo engine', () => {
  assert.equal(FICTIONAL_UNIVERSE_ID, 'ficticio-v1');
  assert.deepStrictEqual(worldForUniverse(FICTIONAL_UNIVERSE_ID, { seed: 'semente-x' }).world, generateWorld('semente-x'));
});

test('13. o universo real carrega separadamente, com a CBF como fonte principal', () => {
  assert.equal(U.manifest.primarySource, 'cbf');
  assert.equal(Object.keys(U.clubs).length, 20);
  const cbf = U.sources.find((s) => s.id === 'cbf')!;
  assert.ok(cbf.retrievedAt, 'data da coleta registrada');
  for (const c of Object.values(U.clubs)) assert.ok(c.squad.length >= 11 && c.squad.some((id) => U.players[id].position === 'GOL'), c.id);
});

test('14. Engine 0.2.0 intacto (impressão digital das fontes do engine)', () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(join(ROOT, d)).sort()) {
      const p = `${d}/${f}`;
      if (statSync(join(ROOT, p)).isDirectory()) {
        if (f !== 'tests') walk(p);
      } else if (p.endsWith('.ts')) files.push(p);
    }
  };
  walk('engine');
  const h = createHash('sha256');
  for (const f of files) {
    h.update(`${f}\n`);
    h.update(readFileSync(join(ROOT, f)));
  }
  assert.equal(h.digest('hex'), 'da6749ed0e9f113441d12418b36e6c67da016cec1d955d699a24ee6b1895b35a');
});

test('15. saves antigos continuam funcionando (V1 sem gestão)', () => {
  const seed = 'save-antigo';
  const old = createCareer({ seed, coachName: 'A', clubId: careerOffers(seed)[0] });
  const raw = serializeCareer(old);
  assert.ok(!raw.includes('"manager"'));
  const back = ensureManager(deserializeCareer(raw));
  assert.ok(back.manager);
  assert.equal(back.userClubId, old.userClubId);
});

test('16. força alta pode existir em divisão inferior (nenhuma regra limita por divisão)', () => {
  const files = {
    universe: { id: 'u', name: 'u', season: 2026, country: 'X', competitions: ['c4'], defaultCompetitionId: 'c4', primarySource: 's', dataStatus: '' },
    competitions: [{ id: 'c4', universeId: 'u', name: 'Quarta', season: 2026, country: 'X', division: 4, clubs: ['k'] }],
    clubs: [{ id: 'k', name: 'K', fullName: null, competitionId: 'c4', division: 4, city: null, state: null, stadium: null, colors: null, source: { source: 's', ref: null, confirmedByPrimary: false } }],
    players: Array.from({ length: 11 }, (_, i) => ({ id: `p${i}`, fullName: null, nickname: null, displayName: `P${i}`, clubId: 'k', position: i === 0 ? 'GOL' : 'DEF', number: null, age: null, nationality: null, strength: 50, status: 'ATIVO', notes: null, source: { source: 's', ref: `r${i}`, confirmedByPrimary: false } })),
    sources: [{ id: 's', name: 's', role: 'principal', url: null, retrievedAt: null, notes: '' }],
  };
  const r = validateUniverse(files);
  assert.ok(r.ok, r.issues.map((x) => x.message).join('; '));
});

test('17. não existe barreira artificial de contratação por divisão (só a personalidade e o dinheiro decidem)', () => {
  const c = createCareer({ seed: 'divisao', coachName: 'A', clubId: careerOffers('divisao')[0] });
  const w = c.world;
  const d4 = w.clubs[c.userClubId!];
  const d1 = w.divisions.find((d) => d.level === 1)!;
  const star = d1.clubIds.flatMap((id) => w.clubs[id].squad).map((id) => w.players[id]).find((p) => personalityOf(c.seed, p) === 'FINANCEIRO')!;
  assert.ok(star, 'um jogador da 1ª divisão sem restrição de personalidade');
  assert.equal(playerAccepts(w, c.seed, star, d4).ok, true, 'jogador da 1ª aceita conversar com clube da 4ª');
});

test('18–20. cada competição tem regras próprias; Brasileirão usa regras brasileiras; outras podem diferir', () => {
  assert.deepStrictEqual(checkLeagueSystem(BRAZIL_2026), []);
  assert.deepStrictEqual(checkLeagueSystem(FICTIONAL_SYSTEM), []);
  assert.equal(BRASILEIRAO_A_2026.clubs, U.competitions['brasileirao-a-2026'].clubs.length);
  assert.deepStrictEqual(BRASILEIRAO_A_2026.format, { kind: 'DOUBLE_ROUND_ROBIN', rounds: 38 });
  assert.equal(BRASILEIRAO_A_2026.relegation, 4);
  assert.equal(BRASILEIRAO_A_2026.transferWindows[0].to, '2026-09-11');
  // a Série C brasileira tem formato com fases, diferente do fictício (sempre pontos corridos)
  assert.equal(BRAZIL_2026.divisions[2].format.kind, 'OTHER');
  assert.equal(FICTIONAL_SYSTEM.divisions[2].format.kind, 'DOUBLE_ROUND_ROBIN');
  assert.notDeepStrictEqual(BRAZIL_2026.divisions.map((d) => d.relegation), FICTIONAL_SYSTEM.divisions.map((d) => d.relegation));
});

test('ligação CBF × EA só com evidência forte; datas e idade lidas sem chute', () => {
  assert.equal(isoDate('16/09/2007', 'DMY'), '2007-09-16');
  assert.equal(isoDate('6/15/1992 12:00:00 AM', 'MDY'), '1992-06-15');
  assert.equal(isoDate('31/13/2000', 'DMY'), null);
  assert.equal(ageAt('2007-09-16', '2026-10-02'), 19);
  assert.equal(ageAt('2007-10-03', '2026-10-02'), 18);
  const pool = [{ id: 'a', names: ['Jesse Lingard'], birthDate: '1992-12-15' }, { id: 'b', names: ['Outro Nome'], birthDate: '1992-12-15' }];
  assert.deepStrictEqual(linkByBirthAndName({ id: 'x', names: ['Lingard', 'Jesse Ellis Lingard'], birthDate: '1992-12-15' }, pool), { id: 'a', rule: 'nascimento + nome' });
  assert.equal(linkByBirthAndName({ id: 'x', names: ['Lingard'], birthDate: null }, pool).id, null);
  assert.equal(namesCompatible(['Gabriel'], ['Gabriel Paulista']), true);
  assert.equal(namesCompatible(['Ana Silva'], ['Bruno Souza']), false);
  assert.ok(existsSync(join(ROOT, 'data/universes/brasileirao-2026/raw/cbf-2026.raw.json')));
});
