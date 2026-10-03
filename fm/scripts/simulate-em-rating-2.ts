// CALIBRAÇÃO da EM-RATING-2.0 (nada é aplicado): compara modelos de pesos (A, B, C), curvas de participação
// (raiz, log, saturante) e o tratamento da experiência com cobertura histórica limitada, sobre os fatos da CBF já
// versionados. Sem rede, sem relógio, sem aleatoriedade: os mesmos arquivos geram exatamente a mesma saída.
// Posição: só para ANÁLISE, usa a posição hoje disponível no universo (Wikipédia, conferência) declarada como tal;
// a posição oficial virá da curadoria. Sem posição = "sem posição" (nada é inventado).
// Também mantém a planilha de curadoria (curation/positions.csv), sem nunca apagar uma linha já preenchida.
// Uso: npm run rating:sim
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURATION_COLUMNS, CURATION_SOURCE, csvCell, curatedPositions, parseCurationCsv } from '../data/curation.ts';
import type { CbfRawSnapshot } from '../data/import/cbf-squads.ts';
import type { UniversePlayer, UniversePosition } from '../data/model.ts';
import { COMPONENTS, MODEL_IDS, calibrationVariant, strengthV2, withWeights, type ComponentId, type EmRating2Config, type ModelId, type ParticipationCurve, type Rating2Input, type Rating2Result } from '../data/rating/em-rating-2.ts';
import { inputsFromCbf, snapshotSeasonOf } from '../data/rating/em-rating-2-inputs.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const U = join(ROOT, 'data/universes/brasileirao-2026');
const players = JSON.parse(readFileSync(join(U, 'players.json'), 'utf8')) as UniversePlayer[];
const raw = JSON.parse(readFileSync(join(U, 'raw/cbf-2026.raw.json'), 'utf8')) as CbfRawSnapshot;
const byId = Object.fromEntries(players.map((p) => [p.id, p]));
const auxPosition = (p: UniversePlayer) => (p.position && p.fieldSources?.position ? `${p.position} (${p.fieldSources.position}, auxiliar)` : '');

// ---------- planilha de curadoria: uma linha por atleta; linhas preenchidas nunca são reescritas ----------
const curationFile = join(U, 'curation/positions.csv');
mkdirSync(dirname(curationFile), { recursive: true });
const keep = new Map<string, string>();
if (existsSync(curationFile)) {
  const text = readFileSync(curationFile, 'utf8');
  const parsed = parseCurationCsv(text);
  if (parsed.errors.length) throw new Error(`curadoria inválida:\n${parsed.errors.join('\n')}`);
  const filled = new Set(parsed.entries.map((e) => e.playerId));
  for (const line of text.split(/\r?\n/).slice(1)) {
    const id = line.split(',')[0];
    if (filled.has(id)) keep.set(id, line);
  }
}
const sheetRows = [...players].sort((a, b) => Number(a.position !== null) - Number(b.position !== null) || a.clubId.localeCompare(b.clubId) || a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id))
  .map((p) => keep.get(p.id) ?? [p.id, p.displayName, p.clubId, p.birthDate ?? '', auxPosition(p), 'position', p.position ?? '', '', CURATION_SOURCE, '', '', ''].map(csvCell).join(','));
writeFileSync(curationFile, `${CURATION_COLUMNS.join(',')}\n${sheetRows.join('\n')}\n`);
const cur = parseCurationCsv(readFileSync(curationFile, 'utf8'));
const curPos = curatedPositions(cur.entries, byId);
if (cur.errors.length || curPos.errors.length) throw new Error(`curadoria inválida:\n${[...cur.errors, ...curPos.errors].join('\n')}`);

// ---------- entradas (análise): posição curada quando existir; senão a posição disponível, declarada ----------
const analysisPos = new Map<string, UniversePosition>();
const posSource = new Map<string, string>();
for (const p of players) {
  const c = curPos.positions.get(p.id);
  if (c) { analysisPos.set(p.id, c); posSource.set(p.id, CURATION_SOURCE); } else if (p.position) { analysisPos.set(p.id, p.position); posSource.set(p.id, `${p.fieldSources?.position ?? '?'} (só análise)`); }
}
const inputs: Rating2Input[] = inputsFromCbf(players, raw, { positions: analysisPos, positionSource: 'análise', competition: 'brasileirao-a' })
  .map((i) => ({ ...i, positionSource: i.position ? posSource.get(i.playerId)! : null }));
const runCfg = (cfg: EmRating2Config) => inputs.map((i) => ({ input: i, result: strengthV2(i, cfg) }));
type Row = ReturnType<typeof runCfg>[number];

const CURVES: ParticipationCurve[] = ['sqrt', 'log', 'saturating'];
const FACTORS = [1, 0.5, 0];
const main = Object.fromEntries(MODEL_IDS.map((m) => [m, runCfg(calibrationVariant(m))])) as Record<ModelId, Row[]>;

// ---------- estatística ----------
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const sd = (v: number[]) => Math.sqrt(mean(v.map((x) => (x - mean(v)) ** 2)));
const pct = (s: number[], p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
const f1 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') : '–');
const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2).replace('.', ',') : '–');
const pc = (n: number, d: number) => `${f1((100 * n) / d)}%`;
const pearson = (x: number[], y: number[]) => {
  const mx = mean(x), my = mean(y);
  const num = x.reduce((a, xi, k) => a + (xi - mx) * (y[k] - my), 0);
  const den = Math.sqrt(x.reduce((a, xi) => a + (xi - mx) ** 2, 0) * y.reduce((a, yi) => a + (yi - my) ** 2, 0));
  return den === 0 ? NaN : num / den;
};
const ok = (rows: Row[]) => rows.filter((r) => r.result.strength !== null);
const S = (rows: Row[]) => ok(rows).map((r) => r.result.strength!);
const BANDS: [string, number, number][] = [['1–10', 1, 10], ['11–20', 11, 20], ['21–30', 21, 30], ['31–35', 31, 35], ['36–40', 36, 40], ['41–45', 41, 45], ['46–49', 46, 49], ['50', 50, 50]];
function summary(rows: Row[]) {
  const s = S(rows).sort((a, b) => a - b);
  const n = s.length;
  const comp = (id: ComponentId) => { const r = ok(rows).filter((x) => x.result.components[id].value !== null && x.result.components[id].weight > 0); return pearson(r.map((x) => x.result.components[id].value!), r.map((x) => x.result.strength!)); };
  return {
    n, min: s[0], max: s[n - 1], media: mean(s), mediana: pct(s, 0.5), dp: sd(s),
    p10: pct(s, 0.1), p25: pct(s, 0.25), p50: pct(s, 0.5), p75: pct(s, 0.75), p90: pct(s, 0.9), p95: pct(s, 0.95),
    bands: BANDS.map(([, lo, hi]) => s.filter((x) => x >= lo && x <= hi).length),
    top41: s.filter((x) => x >= 41).length, top46: s.filter((x) => x >= 46).length, eq50: s.filter((x) => x === 50).length,
    maxBand: Math.max(...[1, 6, 11, 16, 21, 26, 31, 36, 41, 46].map((lo) => s.filter((x) => x >= lo && x <= lo + 4).length)),
    corrPart: comp('participation'), corrProd: comp('production'), corrExp: comp('experience'),
  };
}
const POS = ['GOL', 'DEF', 'MEI', 'ATA'] as const;
const byPos = (rows: Row[], pos: UniversePosition | null) => S(rows.filter((r) => r.input.position === pos));
/** maior força alcançável (todos os componentes avaliáveis em 1; goleiro com produção neutra) */
function ceiling(cfg: EmRating2Config, pos: UniversePosition | null) {
  const w = cfg.weights;
  const tot = COMPONENTS.reduce((a, k) => a + (k === 'production' && pos === null ? 0 : w[k]), 0);
  const got = COMPONENTS.reduce((a, k) => a + (k === 'production' ? (pos === null ? 0 : pos === 'GOL' ? w[k] * cfg.goalkeeperProduction : w[k]) : w[k]), 0);
  return Math.round(1 + 49 * (got / tot));
}

// ---------- relatório ----------
const L: string[] = [];
const T = (head: (string | number)[], rows: (string | number)[][]) => { L.push(`| ${head.join(' | ')} |`, `|${head.map((_, k) => (k ? '---:' : '---')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`), ''); };
const sums = Object.fromEntries(MODEL_IDS.map((m) => [m, summary(main[m])])) as Record<ModelId, ReturnType<typeof summary>>;
const cfgs = Object.fromEntries(MODEL_IDS.map((m) => [m, calibrationVariant(m)])) as Record<ModelId, EmRating2Config>;
const N = players.length;
const withPos = inputs.filter((i) => i.position).length;

L.push('# EM-RATING-2.0 — calibração (2ª rodada)', '', '> EM-RATING-2.0 encontra-se em fase de calibração e ainda não é a força oficial. Nenhum modelo abaixo é definitivo; nada foi aplicado.', '');
L.push(`Gerado por \`scripts/simulate-em-rating-2.ts\` (\`npm run rating:sim\`) a partir de \`raw/cbf-2026.raw.json\` (coleta ${raw.retrievedAt}, temporada ${snapshotSeasonOf(raw)}). Nenhum rating de terceiros.`, '');
L.push(`Posição usada só nesta análise: ${withPos} atletas com a posição hoje disponível no universo (Wikipédia, declarada; não oficial) e ${N - withPos} "sem posição". Posições curadas: ${curPos.positions.size}. Curva de participação: raiz (modelos A/B/C); outras curvas na seção própria.`, '');

L.push('## Modelos', '');
T(['Componente', ...MODEL_IDS], COMPONENTS.map((k) => [k, ...MODEL_IDS.map((m) => `${Math.round(cfgs[m].weights[k] * 100)}%`)]));

L.push('## Comparação', '');
T(['Métrica', ...MODEL_IDS], [
  ['Média', ...MODEL_IDS.map((m) => f1(sums[m].media))],
  ['Mediana', ...MODEL_IDS.map((m) => sums[m].mediana)],
  ['P90', ...MODEL_IDS.map((m) => sums[m].p90)],
  ['P95', ...MODEL_IDS.map((m) => sums[m].p95)],
  ['% 41–50', ...MODEL_IDS.map((m) => pc(sums[m].top41, sums[m].n))],
  ['% 46–50', ...MODEL_IDS.map((m) => pc(sums[m].top46, sums[m].n))],
  ['% = 50', ...MODEL_IDS.map((m) => pc(sums[m].eq50, sums[m].n))],
  ['Correlação participação', ...MODEL_IDS.map((m) => f2(sums[m].corrPart))],
  ['Correlação produção', ...MODEL_IDS.map((m) => f2(sums[m].corrProd))],
  ['Correlação experiência', ...MODEL_IDS.map((m) => f2(sums[m].corrExp))],
  ['Desvio-padrão', ...MODEL_IDS.map((m) => f1(sums[m].dp))],
]);
const sumsPos = Object.fromEntries(MODEL_IDS.map((m) => [m, summary(main[m].filter((r) => r.input.position !== null))])) as Record<ModelId, ReturnType<typeof summary>>;
const fiftyNoPos = (m: ModelId) => main[m].filter((r) => r.result.strength === 50 && r.input.position === null).length;
L.push(`Só atletas COM posição (análise; n = ${sumsPos.A.n}): sem eles, "sem posição" (produção fora da conta) não distorce o topo.`, '');
T(['Métrica (com posição)', ...MODEL_IDS], [
  ['Média', ...MODEL_IDS.map((m) => f1(sumsPos[m].media))],
  ['Mediana', ...MODEL_IDS.map((m) => sumsPos[m].mediana)],
  ['P90', ...MODEL_IDS.map((m) => sumsPos[m].p90)],
  ['P95', ...MODEL_IDS.map((m) => sumsPos[m].p95)],
  ['% 41–50', ...MODEL_IDS.map((m) => pc(sumsPos[m].top41, sumsPos[m].n))],
  ['% 46–50', ...MODEL_IDS.map((m) => pc(sumsPos[m].top46, sumsPos[m].n))],
  ['% = 50', ...MODEL_IDS.map((m) => pc(sumsPos[m].eq50, sumsPos[m].n))],
  ['Correlação participação', ...MODEL_IDS.map((m) => f2(sumsPos[m].corrPart))],
  ['Correlação produção', ...MODEL_IDS.map((m) => f2(sumsPos[m].corrProd))],
  ['Força 50 vinda de "sem posição" (todos)', ...MODEL_IDS.map((m) => `${fiftyNoPos(m)} de ${sums[m].eq50}`)],
]);

L.push('## Distribuição completa', '');
T(['', ...MODEL_IDS], [
  ['n', ...MODEL_IDS.map((m) => sums[m].n)], ['mínimo', ...MODEL_IDS.map((m) => sums[m].min)], ['máximo', ...MODEL_IDS.map((m) => sums[m].max)],
  ['média', ...MODEL_IDS.map((m) => f1(sums[m].media))], ['mediana', ...MODEL_IDS.map((m) => sums[m].mediana)],
  ...(['p10', 'p25', 'p50', 'p75', 'p90', 'p95'] as const).map((k) => [k.toUpperCase(), ...MODEL_IDS.map((m) => sums[m][k])]),
  ...BANDS.map(([label], k) => [label, ...MODEL_IDS.map((m) => `${sums[m].bands[k]} (${pc(sums[m].bands[k], sums[m].n)})`)]),
  ['maior concentração em 5 pontos', ...MODEL_IDS.map((m) => pc(sums[m].maxBand, sums[m].n))],
]);

L.push('## Por posição (análise)', '');
T(['Posição', ...MODEL_IDS.flatMap((m) => [`${m} média`, `${m} mediana`, `${m} teto`]), 'n'], [...POS, null].map((pos) => {
  const n = byPos(main.A, pos).length;
  return [pos ?? 'sem posição', ...MODEL_IDS.flatMap((m) => { const s = byPos(main[m], pos).sort((a, b) => a - b); return [f1(mean(s)), pct(s, 0.5), ceiling(cfgs[m], pos)]; }), n];
}));
L.push('"teto" = força máxima alcançável com todos os componentes avaliáveis em 1 (goleiro com produção neutra 0,5; "sem posição" com a produção fora da conta).', '');

L.push('## Por clube (média)', '');
const clubs = [...new Set(players.map((p) => p.clubId))].sort();
const ofClub = (rows: Row[], c: string) => S(rows.filter((r) => byId[r.input.playerId].clubId === c));
T(['Clube', ...MODEL_IDS, 'n'], clubs.map((c) => [c.slice(3), ...MODEL_IDS.map((m) => f1(mean(ofClub(main[m], c)))), ofClub(main.A, c).length]));

L.push('## Curva da participação', '', 'p = partidas ÷ maior número de partidas do clube. raiz: √p · log: ln(1 + 9p)/ln 10 · saturante: (1 − e^(−3p))/(1 − e^(−3)).', '');
T(['p', 'raiz', 'log', 'saturante'], [0.1, 0.25, 0.5, 0.75, 1].map((p) => [f2(p), ...CURVES.map((c) => f2(c === 'sqrt' ? Math.sqrt(p) : c === 'log' ? Math.log(1 + 9 * p) / Math.log(10) : (1 - Math.exp(-3 * p)) / (1 - Math.exp(-3))))]));
T(['Modelo/curva', 'média', 'mediana', 'P90', 'P95', '% 41–50', '% 46–50', '% = 50', 'corr. participação', 'corr. produção'], MODEL_IDS.flatMap((m) => CURVES.map((c) => {
  const s = summary(runCfg(calibrationVariant(m, c)));
  return [`${m}/${c}`, f1(s.media), s.mediana, s.p90, s.p95, pc(s.top41, s.n), pc(s.top46, s.n), pc(s.eq50, s.n), f2(s.corrPart), f2(s.corrProd)];
})));

L.push('## Experiência com cobertura histórica limitada', '');
const limitedIds = new Set(main.A.filter((r) => r.result.experienceDataLimited).map((r) => r.input.playerId));
L.push(`experienceDataLimited = idade ≥ ${cfgs.A.limitedExperience.minAge} e no máximo ${cfgs.A.limitedExperience.maxSeasons} temporadas na base da CBF: ${limitedIds.size} atletas. Nada é atribuído; testado o peso de experiência e recência ×1 (sem mudança), ×0,5 e ×0 (fora da conta).`, '');
T(['Modelo', 'fator', 'média dos limitados', 'média dos demais', 'média geral', '% 41–50'], MODEL_IDS.flatMap((m) => FACTORS.map((k) => {
  const rows = runCfg(calibrationVariant(m, 'sqrt', k));
  const lim = S(rows.filter((r) => limitedIds.has(r.input.playerId)));
  const rest = S(rows.filter((r) => !limitedIds.has(r.input.playerId)));
  const s = summary(rows);
  return [m, f1(k), f1(mean(lim)), f1(mean(rest)), f1(s.media), pc(s.top41, s.n)];
})));

L.push('## Atletas sem partidas em 2026', '');
const zero = main.A.filter((r) => r.input.matches === 0);
L.push(`${zero.length} atletas com 0 partidas na temporada. A força deles vem só de experiência, recência, idade, contexto e (com posição) produção 0 ou neutra: a participação vale 0, mas os outros componentes continuam. A base não diz se é recém-chegado, lesionado, reserva ou contratação recente — ver colunas de status e temporadas; nada é afirmado sobre o motivo.`, '');
T(['Jogador', 'clube', 'status CBF', 'idade', 'temporadas', 'última temporada registrada', 'posição (análise)', ...MODEL_IDS], zero.map((r) => {
  const p = byId[r.input.playerId];
  const k = main.A.indexOf(r);
  return [p.displayName, p.clubId.slice(3), p.status, r.input.age ?? '–', r.input.seasons?.length ?? '–', r.input.seasons ? Math.max(...r.input.seasons) : '–', r.input.position ?? 'sem posição', ...MODEL_IDS.map((m) => main[m][k].result.strength ?? 'null')];
}));

L.push('## Dados insuficientes', '');
T(['Jogador', 'clube', 'motivo', ...MODEL_IDS], main.A.filter((r) => r.result.strength === null).map((r) => [byId[r.input.playerId].displayName, byId[r.input.playerId].clubId.slice(3), r.result.flags.join(', '), ...MODEL_IDS.map(() => 'null')]));

L.push('## Casos sintéticos (extremos)', '');
const base: Rating2Input = { playerId: 'sintetico', age: 26, seasons: [2022, 2023, 2024, 2025, 2026], snapshotSeason: 2026, matches: 20, goals: 2, clubReferenceMatches: 34, position: 'MEI', positionSource: 'sintético', competition: 'brasileirao-a' };
const ALL = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const CASES: [string, Partial<Rating2Input>][] = [
  ['referência: MEI 26 anos, 5 temporadas, 20/34 jogos, 2 gols', {}],
  ['0 partidas', { matches: 0, goals: 0 }],
  ['muitas partidas (34/34)', { matches: 34 }],
  ['0 gols (ATA, 30 jogos)', { position: 'ATA', matches: 30, goals: 0 }],
  ['produção excepcional (ATA, 30 jogos, 15 gols)', { position: 'ATA', matches: 30, goals: 15 }],
  ['goleiro titular (34/34, 13 temporadas)', { position: 'GOL', matches: 34, goals: 0, seasons: ALL.slice(1), age: 30 }],
  ['idade muito baixa (16)', { age: 16, seasons: [2026] }],
  ['idade elevada (40)', { age: 40, seasons: ALL }],
  ['experiência alta (14 temporadas)', { seasons: ALL }],
  ['experiência baixa (1 temporada, 26 anos)', { seasons: [2026] }],
  ['experiência limitada (30 anos, 1 temporada)', { age: 30, seasons: [2026] }],
  ['ausência de posição', { position: null, positionSource: null }],
  ['titular experiente, produção típica (MEI, 34/34, 14 temporadas)', { matches: 34, goals: 1, seasons: ALL, age: 29 }],
  ['titular experiente, produção excepcional (ATA, 34/34, 14 temporadas, 17 gols)', { position: 'ATA', matches: 34, goals: 17, seasons: ALL, age: 29 }],
  ['titular experiente sem posição (34/34, 14 temporadas)', { position: null, positionSource: null, matches: 34, seasons: ALL, age: 29 }],
];
T(['Caso', ...MODEL_IDS], CASES.map(([label, o]) => [label, ...MODEL_IDS.map((m) => strengthV2({ ...base, ...o }, cfgs[m]).strength ?? 'null')]));

L.push('## Anomalias detectadas (listadas, não corrigidas)', '');
const anomalyRows: (string | number)[][] = [];
for (const m of MODEL_IDS) {
  const rows = main[m];
  const s = sums[m];
  const nm = (r: Row) => `${byId[r.input.playerId].displayName} (${r.result.strength})`;
  const add = (tipo: string, list: Row[], nota: string) => { if (list.length) anomalyRows.push([m, tipo, list.length, nota, list.slice(0, 5).map(nm).join('; ')]); };
  if (s.top41 / s.n > 0.3) anomalyRows.push([m, 'topo concentrado', s.top41, `${pc(s.top41, s.n)} em 41–50`, '']);
  if (s.maxBand / s.n > 0.25) anomalyRows.push([m, 'concentração em 5 pontos', s.maxBand, `${pc(s.maxBand, s.n)} numa faixa de 5 pontos`, '']);
  const gkCeil = ceiling(cfgs[m], 'GOL');
  const fieldCeil = ceiling(cfgs[m], 'ATA');
  if (gkCeil < fieldCeil) anomalyRows.push([m, 'teto do goleiro abaixo da linha', '–', `goleiro chega no máximo a ${gkCeil}; jogador de linha a ${fieldCeil} (produção neutra 0,5 vira limite quando o peso da produção cresce)`, '']);
  const posMeans = POS.map((p) => mean(byPos(rows, p)));
  const gap = Math.max(...posMeans) - Math.min(...posMeans);
  if (gap > 2) anomalyRows.push([m, 'desequilíbrio entre posições', '–', `diferença de ${f1(gap)} pontos entre as médias por posição (${POS.map((p, k) => `${p} ${f1(posMeans[k])}`).join(', ')})`, '']);
  const noPos = S(rows.filter((r) => r.input.position === null));
  const yesPos = S(rows.filter((r) => r.input.position !== null));
  if (mean(noPos) > mean(yesPos)) anomalyRows.push([m, '"sem posição" acima de "com posição"', noPos.length, `média ${f1(mean(noPos))} contra ${f1(mean(yesPos))}: sem posição, a produção sai da conta e não pesa contra`, '']);
  add('"sem posição" com força 50', rows.filter((r) => r.input.position === null && r.result.strength === 50), 'produção fora da conta: titular experiente sem posição chega a 50');
  add('poucos dados e força alta', rows.filter((r) => (r.input.matches ?? 0) <= 5 && (r.input.seasons?.length ?? 0) <= 2 && (r.result.strength ?? 0) >= 30), '≤ 5 partidas, ≤ 2 temporadas e força ≥ 30');
  add('muita experiência e força muito baixa', rows.filter((r) => (r.input.seasons?.length ?? 0) >= 10 && (r.result.strength ?? 99) <= 20), '≥ 10 temporadas e força ≤ 20');
  add('atacante com produção alta e força baixa', rows.filter((r) => r.input.position === 'ATA' && (r.input.goals ?? 0) >= 8 && (r.result.strength ?? 99) < 30), 'ATA com ≥ 8 gols e força < 30');
  add('goleiro afetado por gols', rows.filter((r) => r.input.position === 'GOL' && r.result.components.production.value !== cfgs[m].goalkeeperProduction), 'produção de goleiro diferente do neutro');
  add('experiência limitada', rows.filter((r) => r.result.experienceDataLimited), 'experienceDataLimited (carreira anterior fora da base)');
  add('sem partidas em 2026', rows.filter((r) => r.input.matches === 0 && r.result.strength !== null), 'força vinda só de experiência, idade e contexto');
  add('dados insuficientes', rows.filter((r) => r.result.strength === null), 'força null');
}
T(['Modelo', 'tipo', 'qtd.', 'critério / medida', 'exemplos'], anomalyRows);

L.push('## Sensibilidade (pesos ×0,5 e ×1,5, um de cada vez; curva raiz)', '');
T(['Modelo', 'componente', '×0,5: média', '×0,5: variação absoluta média', '×0,5: mudam ≥ 3', '×1,5: média', '×1,5: variação absoluta média', '×1,5: mudam ≥ 3'], MODEL_IDS.flatMap((m) => COMPONENTS.map((k) => {
  const baseS = main[m].map((r) => r.result.strength ?? 0);
  const cells = [0.5, 1.5].flatMap((f) => {
    const rows = runCfg(withWeights(cfgs[m], { [k]: cfgs[m].weights[k] * f }));
    const d = rows.map((r, j) => Math.abs((r.result.strength ?? 0) - baseS[j]));
    return [f1(mean(S(rows))), f1(mean(d)), d.filter((x) => x >= 3).length];
  });
  return [m, k, ...cells];
})));
L.push('### Contribuição média de cada componente (pontos de força)', '');
T(['Componente', ...MODEL_IDS.flatMap((m) => [`${m} média`, `${m} desvio`])], COMPONENTS.map((k) => [k, ...MODEL_IDS.flatMap((m) => {
  const c = ok(main[m]).map((r) => { const cs = r.result.components; const den = COMPONENTS.reduce((a, j) => a + (cs[j].value === null ? 0 : cs[j].weight), 0); return cs[k].value === null ? 0 : (49 * cs[k].value! * cs[k].weight) / den; });
  return [f1(mean(c)), f1(sd(c))];
})]));

// ---------- saída JSON (por atleta: força em cada variante) ----------
const variants: EmRating2Config[] = MODEL_IDS.flatMap((m) => [...CURVES.map((c) => calibrationVariant(m, c)), ...FACTORS.filter((k) => k !== 1).map((k) => calibrationVariant(m, 'sqrt', k))]);
const varRows = variants.map((v) => runCfg(v));
mkdirSync(join(ROOT, 'reports'), { recursive: true });
writeFileSync(join(ROOT, 'reports/em-rating-2.0-calibracao.json'), `${JSON.stringify({
  methodVersion: 'EM-RATING-2.0',
  status: 'em calibração; não é a força oficial',
  applied: false,
  thirdPartyRatings: 'nenhum',
  source: { file: 'data/universes/brasileirao-2026/raw/cbf-2026.raw.json', retrievedAt: raw.retrievedAt, snapshotSeason: snapshotSeasonOf(raw) },
  positionForAnalysis: 'curadoria quando existir; senão a posição hoje disponível no universo, declarada (não oficial); senão sem posição',
  curation: { file: 'data/universes/brasileirao-2026/curation/positions.csv', filled: cur.entries.length, pending: cur.pending },
  variants: Object.fromEntries(variants.map((v) => [v.variant, v])),
  players: inputs.map((i, k) => ({
    playerId: i.playerId, displayName: byId[i.playerId].displayName, clubId: byId[i.playerId].clubId, status: byId[i.playerId].status,
    age: i.age, seasons: i.seasons?.length ?? null, matches: i.matches, goals: i.goals, clubReferenceMatches: i.clubReferenceMatches,
    positionForAnalysis: i.position, positionSource: i.positionSource, experienceDataLimited: main.A[k].result.experienceDataLimited,
    strength: Object.fromEntries(variants.map((v, j) => [v.variant, varRows[j][k].result.strength])),
    flags: main.A[k].result.flags,
  })),
}, null, 1)}\n`);
writeFileSync(join(ROOT, 'reports/em-rating-2.0-calibracao.md'), L.join('\n'));
console.log(L.join('\n'));
