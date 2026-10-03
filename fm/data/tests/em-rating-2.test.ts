import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { CURATION_COLUMNS, curatedPositions, parseCurationCsv } from '../curation.ts';
import type { CbfRawSnapshot } from '../import/cbf-squads.ts';
import type { UniversePlayer } from '../model.ts';
import { COMPONENTS, EM_RATING_2_0, EM_RATING_2_VERSION, MODEL_IDS, ageValue, calibrationVariant, experienceValue, participationValue, productionValue, strengthV2, withWeights, type Rating2Input } from '../rating/em-rating-2.ts';
import { inputsFromCbf } from '../rating/em-rating-2-inputs.ts';

// EM-RATING-2.0 (experimental, só simulação): fórmula própria sobre fatos da CBF; nenhum rating de terceiros.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const U = join(ROOT, 'data/universes/brasileirao-2026');
const players = JSON.parse(readFileSync(join(U, 'players.json'), 'utf8')) as UniversePlayer[];
const raw = JSON.parse(readFileSync(join(U, 'raw/cbf-2026.raw.json'), 'utf8')) as CbfRawSnapshot;

const base: Rating2Input = { playerId: 'x', age: 27, seasons: [2022, 2023, 2024, 2025, 2026], snapshotSeason: 2026, matches: 20, goals: 2, clubReferenceMatches: 30, position: 'MEI', positionSource: 'curadoria', competition: 'brasileirao-a' };
const S = (o: Partial<Rating2Input> = {}) => strengthV2({ ...base, ...o }).strength!;

test('determinismo: mesma entrada + mesma versão = mesmo resultado (com a trilha); sem relógio, random ou rede', () => {
  assert.deepStrictEqual(strengthV2(base), strengthV2({ ...base }));
  const all = (seed: string) => inputsFromCbf(players, raw, { positions: new Map(), positionSource: 'curadoria', competition: 'brasileirao-a' }).map((i) => strengthV2(i).strength);
  assert.deepStrictEqual(all('a'), all('b'));
  const src = readFileSync(join(ROOT, 'data/rating/em-rating-2.ts'), 'utf8') + readFileSync(join(ROOT, 'data/rating/em-rating-2-inputs.ts'), 'utf8');
  for (const banned of ['Math.random', 'Date.now', 'new Date(', 'fetch(', 'deriveSeed', 'createRng']) assert.ok(!src.includes(banned), banned);
});

test('escala 1–50: nunca negativa, nunca acima de 50, sempre inteira (varredura das entradas)', () => {
  for (const age of [15, 17, 20, 24, 28, 31, 35, 40, 46]) for (const matches of [0, 1, 5, 15, 30, 42]) for (const goals of [0, 1, 10, 40]) for (const seasons of [[2026], [2020, 2026], [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]]) for (const position of ['GOL', 'DEF', 'MEI', 'ATA', null] as const) {
    const r = strengthV2({ ...base, age, matches, goals: Math.min(goals, matches * 3), seasons, position });
    assert.ok(Number.isInteger(r.strength) && r.strength! >= 1 && r.strength! <= 50, JSON.stringify({ age, matches, goals, position, s: r.strength }));
    assert.ok(r.index! >= 0 && r.index! <= 1);
  }
});

test('jogador sem posição: produção não avaliada, marcado para curadoria, força ainda calculada', () => {
  const r = strengthV2({ ...base, position: null, positionSource: null });
  assert.equal(r.components.production.value, null);
  assert.ok(r.flags.includes('POSICAO_AUSENTE'));
  assert.ok(r.strength! >= 1);
});

test('jogador sem gols: atacante sem gols fica abaixo do atacante típico, mas defensor/goleiro não são punidos por isso', () => {
  assert.ok(S({ position: 'ATA', goals: 0 }) < S({ position: 'ATA', goals: 3 }));
  assert.ok(S({ position: 'DEF', goals: 0 }) >= S({ position: 'ATA', goals: 0 }));
});

test('goleiro: gols não mudam a força (produção neutra fixa)', () => {
  const g = [0, 1, 5].map((goals) => strengthV2({ ...base, position: 'GOL', goals }));
  assert.equal(new Set(g.map((r) => r.strength)).size, 1);
  for (const r of g) assert.equal(r.components.production.value, EM_RATING_2_0.goalkeeperProduction);
});

test('atacante: mais gols por partida = mais força (retorno limitado ao topo da posição)', () => {
  const xs = [0, 1, 3, 6, 10, 20].map((goals) => S({ position: 'ATA', matches: 30, goals }));
  for (let k = 1; k < xs.length; k++) assert.ok(xs[k] >= xs[k - 1], xs.join(','));
  assert.equal(productionValue(30, 30, 'ATA', EM_RATING_2_0), 1);
});

test('jovem não é automaticamente fraco; veterano não é automaticamente forte', () => {
  const youngStarter = S({ age: 19, seasons: [2024, 2025, 2026], matches: 30 });
  const oldBench = S({ age: 35, seasons: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026], matches: 2 });
  assert.ok(youngStarter > oldBench, `${youngStarter} x ${oldBench}`);
  // idade é moderada: do pior ao melhor ponto da curva, no máximo 10% do índice
  const span = Math.max(...[16, 24, 45].map((a) => S({ age: a }))) - Math.min(...[16, 24, 45].map((a) => S({ age: a })));
  assert.ok(span <= 5, `idade move ${span} pontos`);
  assert.equal(ageValue(28, EM_RATING_2_0.ageCurve), 1);
  assert.ok(ageValue(40, EM_RATING_2_0.ageCurve) >= 0.6 && ageValue(16, EM_RATING_2_0.ageCurve) >= 0.6);
});

test('muitas partidas > poucas partidas; experiência com retorno decrescente (100 jogos ≠ +100 de força)', () => {
  const xs = [0, 2, 5, 10, 20, 30].map((matches) => S({ matches, goals: 0 }));
  for (let k = 1; k < xs.length; k++) assert.ok(xs[k] >= xs[k - 1], xs.join(','));
  const e = [1, 2, 4, 8, 14].map((s) => experienceValue(s, EM_RATING_2_0));
  assert.ok(e[1] - e[0] > e[4] - e[3], 'cada temporada a mais vale menos');
  assert.equal(experienceValue(30, EM_RATING_2_0), 1, 'teto: base da CBF desde 2013');
});

test('produção alta: atacante goleador fica acima do atacante com a mesma participação e sem gols', () => {
  assert.ok(S({ position: 'ATA', matches: 30, goals: 15 }) - S({ position: 'ATA', matches: 30, goals: 0 }) >= 5);
  // 1 gol em 1 jogo não vira "artilheiro" (prior de partidas)
  assert.ok(productionValue(1, 1, 'ATA', EM_RATING_2_0) < productionValue(15, 30, 'ATA', EM_RATING_2_0));
});

test('dados ausentes: nada é estimado; sem partidas ou temporadas a força fica null; idade ausente só sai da conta', () => {
  assert.equal(strengthV2({ ...base, matches: null }).strength, null);
  assert.ok(strengthV2({ ...base, matches: null }).flags.includes('DADOS_INSUFICIENTES'));
  assert.equal(strengthV2({ ...base, seasons: null }).strength, null);
  const noAge = strengthV2({ ...base, age: null });
  assert.ok(noAge.strength !== null && noAge.components.age.value === null && noAge.flags.includes('IDADE_AUSENTE'));
  // divisão não determina força: contexto igual para todas as séries
  assert.equal(S({ competition: 'brasileirao-a' }), S({ competition: 'brasileirao-d' }));
});

test('curadoria: planilha modelo válida, linhas pendentes ignoradas, linha preenchida rastreável e conferida', () => {
  const csv = readFileSync(join(U, 'curation/positions.csv'), 'utf8');
  assert.deepStrictEqual(csv.split('\n')[0].split(','), [...CURATION_COLUMNS]);
  const parsed = parseCurationCsv(csv);
  assert.deepStrictEqual(parsed.errors, []);
  // uma linha por atleta: a posição oficial é sempre de curadoria (a da Wikipédia é só referência auxiliar)
  assert.equal(parsed.pending + parsed.entries.length, players.length);
  assert.ok(csv.split('\n').slice(1).filter(Boolean).every((l) => !/wikipedia/.test(l) || /\(wikipedia-en, auxiliar\)/.test(l)), 'Wikipédia só como referência auxiliar');
  const current = Object.fromEntries(players.map((p) => [p.id, p]));
  const id = players.find((p) => p.position === null)!.id;
  const ok = parseCurationCsv(`${CURATION_COLUMNS.join(',')}\n${id},x,c,,,position,,MEI,curadoria,equipe ELITE MANAGER,2026-10-03,"posição definida para permitir cálculo posicional"\n`);
  assert.deepStrictEqual(ok.errors, []);
  assert.deepStrictEqual(ok.entries[0], { playerId: id, field: 'position', oldValue: null, newValue: 'MEI', fieldSource: 'curadoria', curator: 'equipe ELITE MANAGER', date: '2026-10-03', reason: 'posição definida para permitir cálculo posicional' });
  assert.equal(curatedPositions(ok.entries, current).positions.get(id), 'MEI');
  // incompleta, inválida ou desatualizada: recusada
  assert.ok(parseCurationCsv(`${CURATION_COLUMNS.join(',')}\n${id},x,c,,,position,,MEI,curadoria,,2026-10-03,motivo\n`).errors[0].includes('curador'));
  assert.ok(parseCurationCsv(`${CURATION_COLUMNS.join(',')}\n${id},x,c,,,position,,VOL,curadoria,eu,2026-10-03,motivo\n`).errors[0].includes('posição inválida'));
  const withWiki = players.find((p) => p.position !== null)!;
  const stale = parseCurationCsv(`${CURATION_COLUMNS.join(',')}\n${withWiki.id},x,c,,,position,,MEI,curadoria,eu,2026-10-03,motivo\n`);
  assert.match(curatedPositions(stale.entries, current).errors[0], /oldValue/);
  // a curadoria entra no cálculo com a origem gravada; o dado factual (players.json) não muda
  const inp = inputsFromCbf(players.filter((p) => p.id === id), raw, { positions: new Map([[id, 'MEI']]), positionSource: 'curadoria', competition: 'brasileirao-a' })[0];
  assert.equal(inp.positionSource, 'curadoria');
  assert.equal(current[id].position, null);
});

test('versionamento: versão gravada no resultado; pesos, curvas e âncoras congelados na configuração', () => {
  assert.equal(EM_RATING_2_VERSION, 'EM-RATING-2.0');
  assert.equal(strengthV2(base).methodVersion, 'EM-RATING-2.0');
  assert.ok(Object.isFrozen(EM_RATING_2_0) && Object.isFrozen(EM_RATING_2_0.weights));
  assert.deepStrictEqual(EM_RATING_2_0.weights, { participation: 0.4, experience: 0.2, recency: 0.1, age: 0.1, production: 0.15, context: 0.05 });
  assert.deepStrictEqual([...COMPONENTS], Object.keys(EM_RATING_2_0.weights));
  // mudar peso gera outra configuração, sem tocar a oficial
  const alt = withWeights(EM_RATING_2_0, { production: 0.3 });
  assert.equal(EM_RATING_2_0.weights.production, 0.15);
  assert.notEqual(strengthV2({ ...base, position: 'ATA', goals: 12 }, alt).strength, null);
});

test('calibração gravada em reports/: não aplicada, sem ratings de terceiros, nenhuma força oficial alterada; EA fora do repositório', () => {
  for (const gone of ['data/universes/brasileirao-2026/raw/ea-fc-26.candidates.raw.json', 'data/universes/brasileirao-2026/ratings/EM-RATING-1.0.simulacao.json', 'data/rating/em-rating.ts']) assert.ok(!existsSync(join(ROOT, gone)), gone);
  const sim = JSON.parse(readFileSync(join(ROOT, 'reports/em-rating-2.0-calibracao.json'), 'utf8'));
  assert.equal(sim.applied, false);
  assert.match(sim.status, /calibração/);
  assert.equal(sim.methodVersion, 'EM-RATING-2.0');
  assert.equal(sim.thirdPartyRatings, 'nenhum');
  assert.equal(sim.players.length, players.length);
  assert.ok(players.every((p) => p.strength === null && p.strengthMethodVersion === null && !('rating' in p) && !('eaFc' in (p.externalIds ?? {}))));
  // nenhum código da força 2.0, do build ou da simulação lê o arquivo do EA
  for (const f of ['data/rating/em-rating-2.ts', 'data/rating/em-rating-2-inputs.ts', 'data/curation.ts', 'data/import/cbf-squads.ts', 'scripts/build-universe.ts', 'scripts/simulate-em-rating-2.ts']) {
    assert.ok(!/ea-fc|EA_FC|eaFc|overall/i.test(readFileSync(join(ROOT, f), 'utf8')), f);
  }
});

// ---------- calibração (2ª rodada) ----------

test('modelos A/B/C: pesos registrados; A é a configuração da 1ª simulação; nenhum é tratado como definitivo', () => {
  assert.deepStrictEqual(MODEL_IDS, ['A', 'B', 'C']);
  assert.deepStrictEqual(calibrationVariant('A').weights, EM_RATING_2_0.weights);
  assert.deepStrictEqual(calibrationVariant('B').weights, { participation: 0.25, experience: 0.2, recency: 0.15, age: 0.1, production: 0.25, context: 0.05 });
  assert.deepStrictEqual(calibrationVariant('C').weights, { participation: 0.2, experience: 0.15, recency: 0.15, age: 0.1, production: 0.35, context: 0.05 });
  for (const m of MODEL_IDS) {
    const r = strengthV2(base, calibrationVariant(m, 'log', 0.5));
    assert.equal(r.methodVersion, 'EM-RATING-2.0');
    assert.equal(r.variant, `${m}/log/exp×0.5`);
  }
});

test('curvas de participação: 0 → 0, 1 → 1, crescentes, com retorno decrescente; saturante satura mais cedo', () => {
  for (const c of ['sqrt', 'log', 'saturating'] as const) {
    const v = [0, 5, 10, 15, 20, 25, 30, 34].map((m) => participationValue(m, 34, c));
    assert.equal(v[0], 0);
    assert.ok(Math.abs(v[v.length - 1] - 1) < 1e-12);
    for (let k = 1; k < v.length; k++) assert.ok(v[k] > v[k - 1], c);
    for (let k = 2; k < v.length; k++) assert.ok(v[k] - v[k - 1] <= v[k - 1] - v[k - 2] + 1e-12, `${c}: retorno decrescente`);
  }
  assert.ok(participationValue(17, 34, 'saturating') > participationValue(17, 34, 'sqrt'));
});

test('experienceDataLimited: marca sem inventar experiência; o fator só reduz o peso de experiência e recência', () => {
  const lim = { age: 30, seasons: [2026] };
  for (const k of [1, 0.5, 0]) {
    const r = strengthV2({ ...base, ...lim }, calibrationVariant('B', 'sqrt', k));
    assert.equal(r.experienceDataLimited, true);
    assert.ok(r.flags.includes('EXPERIENCIA_LIMITADA'));
    assert.equal(r.components.experience.value, Math.round(experienceValue(1, EM_RATING_2_0) * 1e6) / 1e6, 'valor da experiência é o observado (1 temporada)');
    assert.equal(r.components.experience.weight, Math.round(0.2 * k * 1e6) / 1e6);
  }
  // jovem com poucas temporadas não é "limitado" (a carreira dele cabe na base)
  assert.equal(strengthV2({ ...base, age: 21, seasons: [2025, 2026] }).experienceDataLimited, false);
  assert.equal(strengthV2({ ...base, age: 30, seasons: [2020, 2022, 2024, 2026] }).experienceDataLimited, false);
});

test('extremos coerentes em todos os modelos e curvas', () => {
  const ALL = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  for (const m of MODEL_IDS) for (const c of ['sqrt', 'log', 'saturating'] as const) {
    const cfg = calibrationVariant(m, c);
    const s = (o: Partial<Rating2Input>) => strengthV2({ ...base, ...o }, cfg).strength!;
    const tag = `${m}/${c}`;
    assert.ok(s({ matches: 0, goals: 0 }) < s({ matches: 34 }), `${tag}: 0 partidas < muitas`);
    assert.ok(s({ position: 'ATA', matches: 30, goals: 0 }) < s({ position: 'ATA', matches: 30, goals: 15 }), `${tag}: 0 gols < produção excepcional`);
    assert.ok(s({ seasons: [2026] }) < s({ seasons: ALL }), `${tag}: experiência baixa < alta`);
    // idade moderada: 16 e 40 anos ficam a poucos pontos do auge
    for (const age of [16, 40]) assert.ok(s({ age: 27 }) - s({ age, seasons: age === 16 ? [2026] : ALL }) <= 12 && s({ age: 27 }) - s({ age }) <= 5, `${tag}: idade ${age}`);
    // goleiro: gols não mudam nada; sem posição: produção fora, sinalizado
    assert.equal(s({ position: 'GOL', goals: 0 }), s({ position: 'GOL', goals: 4 }));
    assert.ok(strengthV2({ ...base, position: null, positionSource: null }, cfg).flags.includes('POSICAO_AUSENTE'));
    // 50 continua possível (sem teto artificial), e só no extremo de todos os componentes
    assert.equal(s({ position: 'ATA', matches: 34, goals: 17, seasons: ALL, age: 29 }), 50);
    assert.ok(s({ position: 'MEI', matches: 34, goals: 1, seasons: ALL, age: 29 }) < 50);
    // dados insuficientes continuam null
    assert.equal(strengthV2({ ...base, seasons: null }, cfg).strength, null);
  }
});
