// SIMULAÇÃO da EM-RATING-2.0 (não aplica nada): lê o universo e o snapshot da CBF já versionados, calcula a força
// de todos os atletas e grava o resultado e o relatório em reports/. Sem rede, sem relógio, sem aleatoriedade:
// rodar de novo com os mesmos arquivos gera exatamente os mesmos arquivos.
// Também cria a planilha modelo de curadoria de posição (se ainda não existir; nunca sobrescreve o que foi preenchido).
// Uso: node scripts/simulate-em-rating-2.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURATION_COLUMNS, CURATION_SOURCE, csvCell, curatedPositions, parseCurationCsv } from '../data/curation.ts';
import type { CbfRawSnapshot } from '../data/import/cbf-squads.ts';
import type { UniversePlayer, UniversePosition } from '../data/model.ts';
import { COMPONENTS, EM_RATING_2_0, strengthV2, withWeights, type ComponentId, type EmRating2Config, type Rating2Result } from '../data/rating/em-rating-2.ts';
import { inputsFromCbf, snapshotSeasonOf } from '../data/rating/em-rating-2-inputs.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const U = join(ROOT, 'data/universes/brasileirao-2026');
const players = JSON.parse(readFileSync(join(U, 'players.json'), 'utf8')) as UniversePlayer[];
const raw = JSON.parse(readFileSync(join(U, 'raw/cbf-2026.raw.json'), 'utf8')) as CbfRawSnapshot;
const byId = Object.fromEntries(players.map((p) => [p.id, p]));

// ---------- curadoria (planilha modelo + leitura) ----------
const curationFile = join(U, 'curation/positions.csv');
if (!existsSync(curationFile)) {
  mkdirSync(dirname(curationFile), { recursive: true });
  const rows = players.filter((p) => p.position === null).map((p) => [p.id, p.displayName, p.clubId, p.birthDate ?? '', 'position', '', '', CURATION_SOURCE, '', '', ''].map(csvCell).join(','));
  writeFileSync(curationFile, `${CURATION_COLUMNS.join(',')}\n${rows.join('\n')}\n`);
}
const cur = parseCurationCsv(readFileSync(curationFile, 'utf8'));
const curPos = curatedPositions(cur.entries, byId);
if (cur.errors.length || curPos.errors.length) throw new Error(`curadoria inválida:\n${[...cur.errors, ...curPos.errors].join('\n')}`);

// ---------- cenários ----------
// OFICIAL: só CBF + curadoria. COMPARAÇÃO: posição da fonte de conferência (Wikipédia) declarada, só para medir o
// efeito das regras por posição enquanto a curadoria não existe. Nenhum cenário usa rating de terceiros.
const wikiPos = new Map(players.filter((p) => p.position && p.fieldSources?.position === 'wikipedia-en').map((p) => [p.id, p.position as UniversePosition]));
const comparePos = new Map([...wikiPos, ...curPos.positions]);
const scenarios = {
  oficial: { label: 'CBF + curadoria', positions: curPos.positions, positionSource: CURATION_SOURCE },
  comparacao: { label: 'CBF + posição da Wikipédia (declarada; só comparação)', positions: comparePos, positionSource: 'wikipedia-en' },
};
const run = (key: keyof typeof scenarios, cfg: EmRating2Config = EM_RATING_2_0) => {
  const s = scenarios[key];
  return inputsFromCbf(players, raw, { positions: s.positions, positionSource: s.positionSource, competition: 'brasileirao-a' }).map((i) => ({ input: i, result: strengthV2(i, cfg) }));
};
const A = run('oficial');
const B = run('comparacao');

// ---------- estatística ----------
const q = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const sd = (v: number[]) => Math.sqrt(mean(v.map((x) => (x - mean(v)) ** 2)));
const f1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
function stats(v: number[]) {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  return { n: v.length, min: s[0], max: s[s.length - 1], media: mean(v), mediana: q(s, 0.5), dp: sd(v), p10: q(s, 0.1), p25: q(s, 0.25), p75: q(s, 0.75), p90: q(s, 0.9) };
}
const BANDS = [[1, 5], [6, 10], [11, 15], [16, 20], [21, 25], [26, 30], [31, 35], [36, 40], [41, 45], [46, 50]] as const;
const bands = (v: number[]) => BANDS.map(([lo, hi]) => v.filter((x) => x >= lo && x <= hi).length);
const strengths = (rows: { result: Rating2Result }[]) => rows.map((r) => r.result.strength).filter((x): x is number => x !== null);
const pearson = (x: number[], y: number[]) => {
  const mx = mean(x), my = mean(y);
  const num = x.reduce((a, xi, k) => a + (xi - mx) * (y[k] - my), 0);
  const den = Math.sqrt(x.reduce((a, xi) => a + (xi - mx) ** 2, 0) * y.reduce((a, yi) => a + (yi - my) ** 2, 0));
  return den === 0 ? 0 : num / den;
};

// ---------- cobertura ----------
const N = players.length;
const det = (p: UniversePlayer) => raw.athletes[p.externalIds?.cbf ?? ''];
const hasSeasons = (p: UniversePlayer) => (det(p)?.years ?? []).some((y) => /^\d{4}$/.test(y));
const coverage: [string, number][] = [
  ['idade (nascimento CBF)', players.filter((p) => p.age !== null).length],
  ['partidas 2026 (CBF)', players.filter((p) => typeof det(p)?.matches === 'number').length],
  ['gols 2026 (CBF)', players.filter((p) => typeof det(p)?.goals === 'number').length],
  ['temporadas com registro (CBF)', players.filter(hasSeasons).length],
  ['clube (CBF)', players.filter((p) => p.clubId).length],
  ['posição — CBF', 0],
  ['posição — curadoria', curPos.positions.size],
  ['posição — Wikipédia (conferência, fora da fórmula oficial)', wikiPos.size],
  ['dados CBF completos (idade, partidas, gols, temporadas)', players.filter((p) => p.age !== null && typeof det(p)?.matches === 'number' && typeof det(p)?.goals === 'number' && hasSeasons(p)).length],
];

// ---------- anomalias (só listadas, nunca corrigidas) ----------
function anomalies(rows: typeof A, scenario: string) {
  const out: { tipo: string; jogadores: string[]; nota: string }[] = [];
  const name = (r: (typeof rows)[number]) => `${byId[r.input.playerId].displayName} (${byId[r.input.playerId].clubId.slice(3)}, ${r.result.strength})`;
  const add = (tipo: string, list: typeof rows, nota: string) => { if (list.length) out.push({ tipo, jogadores: list.map(name), nota }); };
  add('poucos dados e força alta', rows.filter((r) => (r.input.matches ?? 0) <= 5 && (r.input.seasons?.length ?? 0) <= 2 && (r.result.strength ?? 0) >= 30), '≤ 5 partidas, ≤ 2 temporadas e força ≥ 30');
  add('muita experiência e força muito baixa', rows.filter((r) => (r.input.seasons?.length ?? 0) >= 10 && (r.result.strength ?? 99) <= 20), '≥ 10 temporadas e força ≤ 20 (em geral: quase sem partidas em 2026)');
  add('atacante com produção alta e força baixa', rows.filter((r) => r.input.position === 'ATA' && (r.input.goals ?? 0) >= 8 && (r.result.strength ?? 99) < 30), 'ATA com ≥ 8 gols e força < 30');
  add('goleiro afetado por gols', rows.filter((r) => r.input.position === 'GOL' && r.result.components.production.value !== EM_RATING_2_0.goalkeeperProduction), 'produção de goleiro diferente do neutro fixo (não deveria existir)');
  add('experiência provavelmente subestimada', rows.filter((r) => (r.input.age ?? 0) >= 27 && (r.input.seasons?.length ?? 99) <= 2), '27+ anos e ≤ 2 temporadas na base CBF: carreira anterior fora da base (exterior ou antes de 2013) não é vista');
  add('dados insuficientes (força não calculada)', rows.filter((r) => r.result.strength === null), 'sem temporadas com registro na CBF');
  add('jogador sem posição (produção não avaliada)', rows.filter((r) => r.result.flags.includes('POSICAO_AUSENTE')), 'precisa de curadoria para o cálculo posicional');
  add('sem partidas na temporada', rows.filter((r) => r.input.matches === 0), 'participação 0: força puxada por experiência e idade');
  const s = strengths(rows).sort((a, b) => a - b);
  const iqr = q(s, 0.75) - q(s, 0.25);
  const top = Math.max(...bands(s));
  if (top / s.length > 0.25) out.push({ tipo: 'distribuição concentrada', jogadores: [], nota: `${Math.round((100 * top) / s.length)}% numa única faixa de 5 pontos` });
  const high = s.filter((x) => x >= 41).length;
  if (high / s.length > 0.3) out.push({ tipo: 'topo saturado', jogadores: [], nota: `${Math.round((100 * high) / s.length)}% com força 41–50 e ${s.filter((x) => x === 50).length} com 50: titular regular e experiente chega a 1,0 em quase todos os componentes; os dados não distinguem titular de destaque` });
  out.push({ tipo: 'diferença entre divisões', jogadores: [], nota: `não avaliável: a base tem só a Série A (${scenario})` });
  if (iqr < 8) out.push({ tipo: 'amplitude interquartil pequena', jogadores: [], nota: `IQR ${iqr}` });
  return out;
}

// ---------- sensibilidade (cenário de comparação: único com produção ativa) ----------
const baseB = new Map(B.map((r) => [r.input.playerId, r.result.strength]));
const sensitivity = COMPONENTS.flatMap((id) => [0.5, 1.5].map((k) => {
  const rows = run('comparacao', withWeights(EM_RATING_2_0, { [id]: EM_RATING_2_0.weights[id] * k }));
  const d = rows.map((r) => Math.abs((r.result.strength ?? 0) - (baseB.get(r.input.playerId) ?? 0)));
  const st = stats(strengths(rows))!;
  return { componente: id, fator: k, media: st.media, dp: st.dp, mediaDelta: mean(d), mudam3: d.filter((x) => x >= 3).length };
}));
const dominance = COMPONENTS.map((id) => {
  const ok = B.filter((r) => r.result.strength !== null);
  const contrib = ok.map((r) => {
    const c = r.result.components;
    const den = COMPONENTS.reduce((a, k) => a + (c[k].value === null ? 0 : c[k].weight), 0);
    return c[id].value === null ? 0 : (49 * c[id].value! * c[id].weight) / den;
  });
  const vals = ok.filter((r) => r.result.components[id].value !== null);
  return { componente: id, peso: EM_RATING_2_0.weights[id], contribMedia: mean(contrib), contribDp: sd(contrib), correlacao: vals.length > 1 ? pearson(vals.map((r) => r.result.components[id].value!), vals.map((r) => r.result.strength!)) : 0, avaliados: vals.length };
});

// ---------- exemplos ----------
// representantes por percentil da força (ordem: força, depois id): sempre há exemplo em cada categoria
const CATS: [string, number][] = [['muito baixa', 0.01], ['baixa', 0.2], ['média', 0.5], ['alta', 0.8], ['muito alta', 0.99]];
function examples(rows: typeof A) {
  const ok = rows.filter((r) => r.result.strength !== null).sort((a, b) => a.result.strength! - b.result.strength! || a.input.playerId.localeCompare(b.input.playerId));
  return CATS.map(([cat, p]) => {
    const k = Math.min(ok.length - 2, Math.floor(p * ok.length));
    return { categoria: cat, faixa: `p${Math.round(p * 100)}`, exemplos: [ok[k], ok[k + 1]] };
  });
}

// ---------- saída ----------
const row = (r: (typeof A)[number], rb: (typeof B)[number]) => {
  const p = byId[r.input.playerId];
  return {
    playerId: p.id, displayName: p.displayName, clubId: p.clubId, status: p.status,
    age: r.input.age, seasons: r.input.seasons?.length ?? null, matches: r.input.matches, goals: r.input.goals, clubReferenceMatches: r.input.clubReferenceMatches,
    oficial: { position: r.input.position, strength: r.result.strength, index: r.result.index, flags: r.result.flags },
    comparacao: { position: rb.input.position, positionSource: rb.input.positionSource, strength: rb.result.strength, index: rb.result.index, flags: rb.result.flags, components: rb.result.components },
  };
};
mkdirSync(join(ROOT, 'reports'), { recursive: true });
const out = {
  methodVersion: EM_RATING_2_0.version,
  applied: false,
  config: EM_RATING_2_0,
  source: { cbf: raw.source, retrievedAt: raw.retrievedAt, snapshotSeason: snapshotSeasonOf(raw), file: 'data/universes/brasileirao-2026/raw/cbf-2026.raw.json' },
  thirdPartyRatings: 'nenhum',
  scenarios: Object.fromEntries(Object.entries(scenarios).map(([k, s]) => [k, s.label])),
  curation: { file: 'data/universes/brasileirao-2026/curation/positions.csv', filled: cur.entries.length, pending: cur.pending },
  players: A.map((r, k) => row(r, B[k])),
};
writeFileSync(join(ROOT, 'reports/em-rating-2.0-simulation.json'), `${JSON.stringify(out, null, 1)}\n`);

// ---------- relatório em Markdown ----------
const L: string[] = [];
const table = (head: string[], rows: (string | number)[][]) => { L.push(`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`), ''); };
const statRow = (label: string, s: ReturnType<typeof stats>) => s ? [label, s.n, s.min, s.max, f1(s.media), s.mediana, f1(s.dp), s.p10, s.p25, s.p75, s.p90] : [label, 0, '–', '–', '–', '–', '–', '–', '–', '–', '–'];
const STAT_HEAD = ['', 'n', 'mín.', 'máx.', 'média', 'mediana', 'desvio', 'p10', 'p25', 'p75', 'p90'];
L.push(`# EM-RATING-2.0 — simulação (não aplicada)`, '', `Gerado por \`scripts/simulate-em-rating-2.ts\` a partir de \`raw/cbf-2026.raw.json\` (coleta ${raw.retrievedAt}). Nenhum rating de terceiros. Metodologia: docs/PLAYER-RATINGS.md.`, '');
L.push('## Cobertura', '');
table(['Campo', 'preenchidos', 'ausentes', 'cobertura'], [['jogadores totais', N, '', ''], ...coverage.map(([k, v]) => [k, v, N - v, `${f1((100 * v) / N)}%`])]);
for (const [key, rows] of [['oficial', A], ['comparacao', B]] as const) {
  const s = strengths(rows);
  L.push(`## Cenário ${key}: ${scenarios[key].label}`, '');
  L.push('### Distribuição geral', '');
  table(STAT_HEAD, [statRow('todos', stats(s)), statRow('ATIVOS', stats(strengths(rows.filter((r) => byId[r.input.playerId].status === 'ATIVO'))))]);
  table(BANDS.map(([lo, hi]) => `${lo}–${hi}`), [bands(s)]);
  L.push('### Por posição', '');
  table(STAT_HEAD, [...(['GOL', 'DEF', 'MEI', 'ATA'] as const).map((pos) => statRow(pos, stats(strengths(rows.filter((r) => r.input.position === pos))))), statRow('sem posição', stats(strengths(rows.filter((r) => r.input.position === null))))]);
  L.push('### Por divisão', '');
  table(STAT_HEAD, [statRow('Série A', stats(s)), statRow('Série B', null), statRow('Série C', null), statRow('Série D', null)]);
  L.push('Séries B, C e D: sem dados na base (só a Série A foi coletada).', '');
  L.push('### Exemplos', '');
  table(['categoria', 'jogador', 'clube', 'posição', 'idade', 'temporadas', 'partidas', 'gols', 'componentes usados', 'força'], examples(rows).flatMap((e) => e.exemplos.length ? e.exemplos.map((r) => {
    const p = byId[r.input.playerId];
    const used = COMPONENTS.filter((k) => r.result.components[k].value !== null).map((k) => `${k} ${f1(r.result.components[k].value! * 100)}%`).join('; ');
    return [`${e.categoria} (${e.faixa})`, p.displayName, p.clubId.slice(3), r.input.position ?? 'ausente', r.input.age ?? '–', r.input.seasons?.length ?? '–', r.input.matches ?? '–', r.input.goals ?? '–', used, r.result.strength ?? '–'];
  }) : []));
  L.push('### Anomalias (listadas, não corrigidas)', '');
  table(['tipo', 'quantidade', 'critério', 'exemplos'], anomalies(rows, key).map((a) => [a.tipo, a.jogadores.length || '–', a.nota, a.jogadores.slice(0, 6).join('; ')]));
}
L.push('## Sensibilidade (cenário de comparação)', '', 'Cada peso multiplicado por 0,5 e por 1,5, um de cada vez (os demais fixos; o índice renormaliza pelos pesos).', '');
table(['componente', 'fator', 'média', 'desvio', 'variação absoluta média', 'mudam ≥ 3 pontos'], sensitivity.map((x) => [x.componente, f1(x.fator), f1(x.media), f1(x.dp), f1(x.mediaDelta), x.mudam3]));
L.push('### Quem domina a fórmula', '');
table(['componente', 'peso', 'contribuição média (pontos)', 'desvio da contribuição', 'correlação com a força', 'avaliados'], dominance.map((x) => [x.componente, f1(x.peso * 100) + '%', f1(x.contribMedia), f1(x.contribDp), x.correlacao.toFixed(2).replace('.', ','), x.avaliados]));
writeFileSync(join(ROOT, 'reports/em-rating-2.0-report.md'), L.join('\n'));
console.log(L.join('\n'));
