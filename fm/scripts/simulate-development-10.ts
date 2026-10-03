// CALIBRAÇÃO de 10 temporadas do protótipo PlayerDevelopment (game/development/development.ts). Nada é aplicado.
// Partidas SINTÉTICAS por padrões fixos (sem RNG): mesmos padrões = mesmos arquivos.
// Uso: npm run development:sim10  →  reports/development-10-seasons.{md,json}
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEVELOPMENT_PROTO, developRound, developmentCeiling, newDevelopment, roundPoints, type DevelopmentConfig, type DevPosition, type MatchEvidence, type PlayerDevelopment } from '../game/development/development.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = DEVELOPMENT_PROTO.seasonRounds;

// ---------- padrões de partida (ciclos de 5 rodadas) ----------
type Role = 'TITULAR_BOM' | 'TITULAR_MEDIO' | 'TITULAR_RUIM' | 'RESERVA' | 'LESAO_T2';
const TEAM: Record<'bom' | 'medio' | 'ruim', [number, number][]> = {
  bom: [[2, 0], [1, 1], [2, 1], [0, 1], [3, 1]],
  medio: [[1, 1], [2, 1], [0, 1], [1, 0], [1, 2]],
  ruim: [[0, 2], [1, 1], [0, 1], [1, 3], [2, 1]],
};
const GOALS: Record<DevPosition, Record<'bom' | 'medio' | 'ruim', number[]>> = {
  ATA: { bom: [1, 0, 1, 0, 2], medio: [0, 1, 0, 0, 1], ruim: [0, 0, 0, 0, 0] },
  MEI: { bom: [0, 1, 0, 0, 1], medio: [0, 0, 1, 0, 0], ruim: [0, 0, 0, 0, 0] },
  DEF: { bom: [0, 0, 0, 0, 1], medio: [0, 0, 0, 0, 0], ruim: [0, 0, 0, 0, 0] },
  GOL: { bom: [0, 0, 0, 0, 0], medio: [0, 0, 0, 0, 0], ruim: [0, 0, 0, 0, 0] },
};
function evidence(role: Role, pos: DevPosition, season: number, round: number): MatchEvidence {
  const k = (round - 1) % 5;
  const level = role === 'TITULAR_BOM' || role === 'LESAO_T2' ? 'bom' : role === 'TITULAR_RUIM' ? 'ruim' : 'medio';
  const [gf, ga] = TEAM[level][k];
  const none: MatchEvidence = { played: false, minutes: 0, started: false, goals: 0, saves: 0, teamGoalsFor: gf, teamGoalsAgainst: ga, redCard: false, injured: false };
  if (role === 'LESAO_T2' && season === 2 && round >= 10 && round < 20) return { ...none, injured: true }; // 10 rodadas lesionado
  if (role === 'RESERVA') return round % 3 === 0 ? { ...none, played: true, minutes: 25, goals: 0 } : none;
  return { played: true, minutes: 90, started: true, goals: GOALS[pos][level][k], saves: pos === 'GOL' ? 3 : 0, teamGoalsFor: gf, teamGoalsAgainst: ga, redCard: false, injured: false };
}

interface Stage { seasons: number; env: number; role: Role; label: string }
interface Case { id: string; group: string; title: string; base: number; age: number; pos: DevPosition; stages: Stage[]; expect: string }

interface SeasonRow {
  season: number; age: number; env: number; ceiling: number; label: string;
  start: number; end: number; ups: number; downs: number;
  points: { age: number; performance: number; aging: number; idle: number; total: number };
  meanOpportunity: number; roundsPlayed: number;
}
function run(c: Case, cfg: DevelopmentConfig = DEVELOPMENT_PROTO) {
  let dev: PlayerDevelopment = newDevelopment(c.id, c.base);
  let age = c.age;
  let season = 0;
  let abs = 0;
  let firstUp: number | null = null;
  const seasons: SeasonRow[] = [];
  const transfers: { season: number; before: number; afterFirstRound: number }[] = [];
  for (const [si, st] of c.stages.entries()) for (let s = 0; s < st.seasons; s++) {
    season++;
    const start = dev.strengthCurrent;
    const pts = { age: 0, performance: 0, aging: 0, idle: 0, total: 0 };
    let opp = 0, oppN = 0, played = 0;
    for (let round = 1; round <= R; round++) {
      abs++;
      const ctx = { season, round, age, position: c.pos, environmentLevel: st.env, evidence: evidence(st.role, c.pos, season, round) };
      const b = roundPoints(dev, ctx, cfg);
      pts.age += b.age; pts.performance += b.performance; pts.aging += b.aging; pts.idle += b.idle; pts.total += b.points;
      if (ctx.evidence.played) { played++; opp += b.opportunity; oppN++; }
      const before = dev.strengthCurrent;
      dev = developRound(dev, ctx, cfg);
      if (si > 0 && s === 0 && round === 1) transfers.push({ season, before, afterFirstRound: dev.strengthCurrent });
      if (firstUp === null && dev.strengthCurrent > before) firstUp = abs;
    }
    const evs = dev.history.filter((h) => h.season === season);
    const r1 = (v: number) => Math.round(v * 100) / 100;
    seasons.push({ season, age, env: st.env, ceiling: developmentCeiling(st.env, age, cfg), label: st.label, start, end: dev.strengthCurrent, ups: evs.filter((h) => h.to > h.from).length, downs: evs.filter((h) => h.to < h.from).length,
      points: { age: r1(pts.age), performance: r1(pts.performance), aging: r1(pts.aging), idle: r1(pts.idle), total: r1(pts.total) }, meanOpportunity: oppN ? r1(opp / oppN) : 0, roundsPlayed: played });
    age++;
  }
  const deltas = seasons.map((x) => x.end - x.start);
  return { dev, seasons, transfers, firstUpRound: firstUp, maxGain: Math.max(0, ...deltas), maxDrop: Math.min(0, ...deltas) };
}

const S10 = (env: number, role: Role, label: string): Stage[] => [{ seasons: 10, env, role, label }];
const CASES: Case[] = [
  { id: 'C1', group: '10 temporadas', title: 'Caso 1 — promessa 21 anos, força 22, titular, bom rendimento', base: 22, age: 21, pos: 'ATA', stages: S10(32, 'TITULAR_BOM', 'titular, bom'), expect: 'cresce de forma perceptível, sem chegar a 50; estabiliza no limite do ambiente; idade cobra no fim' },
  { id: 'C2', group: '10 temporadas', title: 'Caso 2 — promessa 21 anos, força 22, reserva', base: 22, age: 21, pos: 'ATA', stages: S10(32, 'RESERVA', 'reserva (25 min a cada 3 rodadas)'), expect: 'cresce pouco: sem minutos não há desenvolvimento' },
  { id: 'C3', group: '10 temporadas', title: 'Caso 3 — 25 anos, força 28, titular, bom rendimento', base: 28, age: 25, pos: 'MEI', stages: S10(32, 'TITULAR_BOM', 'titular, bom'), expect: 'sobe um pouco até o limite do ambiente e se mantém' },
  { id: 'C4', group: '10 temporadas', title: 'Caso 4 — 25 anos, força 28, titular, rendimento médio', base: 28, age: 25, pos: 'MEI', stages: S10(32, 'TITULAR_MEDIO', 'titular, médio'), expect: 'estável ou pouco acima' },
  { id: 'C5', group: '10 temporadas', title: 'Caso 5 — 25 anos, força 28, titular, rendimento ruim', base: 28, age: 25, pos: 'MEI', stages: S10(32, 'TITULAR_RUIM', 'titular, ruim'), expect: 'não cresce; cai devagar' },
  { id: 'C6', group: '10 temporadas', title: 'Caso 6 — veterano 33 anos, força 40, titular, bom rendimento', base: 40, age: 33, pos: 'DEF', stages: S10(38, 'TITULAR_BOM', 'titular, bom'), expect: 'cai devagar; o rendimento compensa parte da idade' },
  { id: 'C7', group: '10 temporadas', title: 'Caso 7 — veterano 33 anos, força 40, reserva', base: 40, age: 33, pos: 'DEF', stages: S10(38, 'RESERVA', 'reserva'), expect: 'cai mais rápido que o titular, sem desaparecer de uma vez' },
  { id: 'C8', group: '10 temporadas', title: 'Caso 8 — jogador forte 45 (27 anos) em ambiente 25, titular', base: 45, age: 27, pos: 'ATA', stages: S10(25, 'TITULAR_BOM', 'titular, bom'), expect: 'não cai pelo ambiente; só a idade, devagar' },
  { id: 'C9', group: '10 temporadas', title: 'Caso 9 — jogador fraco 20 (24 anos) em ambiente 40, reserva', base: 20, age: 24, pos: 'DEF', stages: S10(40, 'RESERVA', 'reserva'), expect: 'não cresce por estar num clube forte' },
  { id: 'C10', group: '10 temporadas', title: 'Caso 10 — jogador fraco 20 (24 anos) em ambiente 40, titular, bom rendimento', base: 20, age: 24, pos: 'DEF', stages: S10(40, 'TITULAR_BOM', 'titular, bom'), expect: 'cresce gradualmente; não vira 40 de uma vez' },
  { id: 'C11', group: '10 temporadas', title: 'Caso 11 — lesão de 10 rodadas na 2ª temporada (26 anos, força 30, ambiente 34)', base: 30, age: 26, pos: 'MEI', stages: S10(34, 'LESAO_T2', 'titular, bom (lesão na T2)'), expect: 'a lesão só interrompe o desenvolvimento; sem queda grande' },
  { id: 'E23', group: 'Força × ambiente (40)', title: 'Força 23 em ambiente 40 (24 anos, titular médio)', base: 23, age: 24, pos: 'MEI', stages: S10(40, 'TITULAR_MEDIO', 'titular, médio'), expect: 'maior espaço potencial' },
  { id: 'E35', group: 'Força × ambiente (40)', title: 'Força 35 em ambiente 40 (24 anos, titular médio)', base: 35, age: 24, pos: 'MEI', stages: S10(40, 'TITULAR_MEDIO', 'titular, médio'), expect: 'espaço moderado' },
  { id: 'E43', group: 'Força × ambiente (40)', title: 'Força 43 em ambiente 40 (24 anos, titular médio)', base: 43, age: 24, pos: 'MEI', stages: S10(40, 'TITULAR_MEDIO', 'titular, médio'), expect: 'não precisa "acompanhar" o ambiente' },
  { id: 'T41', group: 'Transferências', title: 'D4 → D1: força 20, 22 anos (ambiente 16 → 39)', base: 20, age: 22, pos: 'ATA', stages: [{ seasons: 1, env: 16, role: 'TITULAR_BOM', label: 'D4, titular' }, { seasons: 4, env: 39, role: 'TITULAR_MEDIO', label: 'D1, titular médio' }], expect: 'mantém 20 na chegada; depois evolui' },
  { id: 'T32', group: 'Transferências', title: 'D3 → D2: força 24, 23 anos (ambiente 22 → 30)', base: 24, age: 23, pos: 'MEI', stages: [{ seasons: 1, env: 22, role: 'TITULAR_BOM', label: 'D3, titular' }, { seasons: 4, env: 30, role: 'TITULAR_MEDIO', label: 'D2, titular médio' }], expect: 'mantém 24 na chegada' },
  { id: 'T21', group: 'Transferências', title: 'D2 → D1: força 31, 24 anos (ambiente 30 → 39)', base: 31, age: 24, pos: 'DEF', stages: [{ seasons: 1, env: 30, role: 'TITULAR_BOM', label: 'D2, titular' }, { seasons: 4, env: 39, role: 'TITULAR_MEDIO', label: 'D1, titular médio' }], expect: 'mantém 31 na chegada' },
  { id: 'T12', group: 'Transferências', title: 'D1 → D2: força 37, 27 anos (ambiente 39 → 30)', base: 37, age: 27, pos: 'ATA', stages: [{ seasons: 1, env: 39, role: 'TITULAR_MEDIO', label: 'D1, titular médio' }, { seasons: 4, env: 30, role: 'TITULAR_BOM', label: 'D2, titular' }], expect: 'não cai pela divisão' },
  { id: 'T14', group: 'Transferências', title: 'D1 → D4: força 36, 29 anos (ambiente 39 → 16)', base: 36, age: 29, pos: 'MEI', stages: [{ seasons: 1, env: 39, role: 'TITULAR_MEDIO', label: 'D1, titular médio' }, { seasons: 4, env: 16, role: 'TITULAR_BOM', label: 'D4, titular' }], expect: 'não cai pela divisão; só a idade' },
  { id: 'S46c', group: 'Estrela pronta', title: 'Controle: a mesma estrela 46 fica no clube forte (ambiente 42)', base: 46, age: 27, pos: 'ATA', stages: [{ seasons: 6, env: 42, role: 'TITULAR_BOM', label: 'clube forte' }], expect: 'referência: só a idade age' },
  { id: 'C8c', group: '10 temporadas', title: 'Controle do caso 8: o mesmo 45 em ambiente 45', base: 45, age: 27, pos: 'ATA', stages: S10(45, 'TITULAR_BOM', 'titular, bom'), expect: 'referência: só a idade age' },
  { id: 'S46', group: 'Estrela pronta', title: 'Estrela 46 (27 anos) vai para clube de ambiente 30', base: 46, age: 27, pos: 'ATA', stages: [{ seasons: 1, env: 42, role: 'TITULAR_BOM', label: 'clube forte' }, { seasons: 5, env: 30, role: 'TITULAR_BOM', label: 'clube de ambiente 30' }], expect: 'não reduz porque o clube é mais fraco' },
];

const results = CASES.map((c) => ({ c, r: run(c) }));
// variante de calibração: teto opcional de 4 subidas por temporada (só para comparar)
const capped = CASES.filter((c) => ['C1', 'C10', 'E23', 'T41'].includes(c.id)).map((c) => ({ c, r: run(c, { ...DEVELOPMENT_PROTO, seasonGainCap: 4 }) }));

// ---------- verificações dos objetivos ----------
const byId = Object.fromEntries(results.map((x) => [x.c.id, x.r]));
const tenYear = results.filter((x) => x.c.group === '10 temporadas' && !x.c.id.endsWith('c'));
const checks: [string, boolean, string][] = [
  ['nenhum jovem chega a 50', results.every((x) => x.r.dev.strengthCurrent < 50 && x.r.seasons.every((s) => s.end < 50 || x.c.base >= 46)), `maior força final entre promessas: ${Math.max(byId.C1.dev.strengthCurrent, byId.C2.dev.strengthCurrent, byId.C10.dev.strengthCurrent)}`],
  ['caso excepcional ≤ 6 por temporada', results.every((x) => x.r.maxGain <= 6), `maior ganho numa temporada (todos os casos): +${Math.max(...results.map((x) => x.r.maxGain))}`],
  ['nenhuma queda > 3 numa temporada', results.every((x) => x.r.maxDrop >= -3), `maior queda numa temporada: ${Math.min(...results.map((x) => x.r.maxDrop))}`],
  ['reservas não evoluem mais que titulares', byId.C2.dev.strengthCurrent < byId.C1.dev.strengthCurrent && byId.C9.dev.strengthCurrent <= byId.C9.dev.strengthBase + 1, `C2 ${byId.C2.dev.strengthCurrent} × C1 ${byId.C1.dev.strengthCurrent}; C9 ${byId.C9.dev.strengthBase} → ${byId.C9.dev.strengthCurrent}`],
  ['titulares com bom rendimento evoluem', byId.C1.dev.strengthCurrent > 22 && byId.C10.dev.strengthCurrent > 20, `C1 22 → ${byId.C1.dev.strengthCurrent}; C10 20 → ${byId.C10.dev.strengthCurrent}`],
  ['bom > médio > ruim (mesmo jogador)', byId.C3.dev.strengthCurrent >= byId.C4.dev.strengthCurrent && byId.C4.dev.strengthCurrent >= byId.C5.dev.strengthCurrent, `C3 ${byId.C3.dev.strengthCurrent} · C4 ${byId.C4.dev.strengthCurrent} · C5 ${byId.C5.dev.strengthCurrent}`],
  ['veterano não desaparece rápido', byId.C6.seasons[2].end >= 37 && byId.C7.seasons[2].end >= 34, `C6 após 3 temporadas ${byId.C6.seasons[2].end}; C7 ${byId.C7.seasons[2].end}`],
  ['veterano titular bom cai menos que reserva', byId.C6.dev.strengthCurrent > byId.C7.dev.strengthCurrent, `C6 ${byId.C6.dev.strengthCurrent} × C7 ${byId.C7.dev.strengthCurrent}`],
  ['ambiente não cria força: 43 em ambiente 40 não sobe para "acompanhar"', byId.E43.dev.strengthCurrent <= 44, `E43: 43 → ${byId.E43.dev.strengthCurrent}`],
  ['espaço: 23 > 35 > 43 em ambiente 40', byId.E23.dev.strengthCurrent - 23 > byId.E35.dev.strengthCurrent - 35 && byId.E35.dev.strengthCurrent - 35 >= byId.E43.dev.strengthCurrent - 43, `ganhos: +${byId.E23.dev.strengthCurrent - 23} · +${byId.E35.dev.strengthCurrent - 35} · ${byId.E43.dev.strengthCurrent - 43 >= 0 ? '+' : ''}${byId.E43.dev.strengthCurrent - 43}`],
  ['transferência mantém a força na chegada', results.flatMap((x) => x.r.transfers).every((t) => t.before === t.afterFirstRound), results.filter((x) => x.r.transfers.length).map((x) => `${x.c.id} ${x.r.transfers[0].before}→${x.r.transfers[0].afterFirstRound}`).join(', ')],
  ['estrela não cai por ir para clube fraco (igual ao controle no clube forte)', byId.S46.dev.strengthCurrent >= byId.S46c.dev.strengthCurrent, `S46 (ambiente 30): 46 → ${byId.S46.dev.strengthCurrent}; controle (ambiente 42): 46 → ${byId.S46c.dev.strengthCurrent}`],
  ['jogador forte em ambiente fraco não cai pelo ambiente (caso 8 não cai mais que o controle; só não cresce)', byId.C8.dev.strengthBase - byId.C8.dev.strengthCurrent <= Math.max(0, byId.C8c.dev.strengthBase - byId.C8c.dev.strengthCurrent), `C8 (ambiente 25): 45 → ${byId.C8.dev.strengthCurrent}; controle (ambiente 45): 45 → ${byId.C8c.dev.strengthCurrent}`],
  ['lesão não provoca queda grande', byId.C11.seasons[1].end >= byId.C11.seasons[1].start - 1, `C11 T2: ${byId.C11.seasons[1].start} → ${byId.C11.seasons[1].end}`],
  ['sem inflação geral', mean(tenYear.map((x) => x.r.dev.strengthCurrent - x.c.base)) < 4, `variação média dos 11 casos de 10 temporadas: ${f1(mean(tenYear.map((x) => x.r.dev.strengthCurrent - x.c.base)))}`],
];
function mean(v: number[]) { return v.reduce((a, b) => a + b, 0) / v.length; }
function f1(v: number) { return (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); }
const sgn = (v: number) => (v > 0 ? `+${v}` : `${v}`);
const bar = (v: number) => '█'.repeat(Math.max(0, Math.round(v / 2)));

// ---------- relatório ----------
const L: string[] = ['# PlayerDevelopment — calibração em 10 temporadas', '', `> Protótipo ${DEVELOPMENT_PROTO.version} (game/development/development.ts). **Só simulação**: nada integrado ao jogo, nenhuma força aplicada, engine inalterado. Partidas sintéticas com padrões fixos (sem RNG). Metodologia: docs/PLAYER-DEVELOPMENT.md.`, ''];
L.push('## Verificações', '', '| Objetivo | ok | medida |', '|---|---|---|', ...checks.map(([k, ok, m]) => `| ${k} | ${ok ? 'sim' : '**NÃO**'} | ${m} |`), '');
L.push('## Resumo', '', '| Caso | força inicial | força final | maior ganho/temporada | maior queda/temporada | tempo para o 1º +1 (rodadas) |', '|---|---:|---:|---:|---:|---:|');
for (const { c, r } of results) L.push(`| ${c.id} — ${c.title.replace(/^[^—]*— /, '')} | ${c.base} | ${r.dev.strengthCurrent} | ${sgn(r.maxGain)} | ${sgn(r.maxDrop)} | ${r.firstUpRound ?? 'nunca'} |`);
L.push('', 'Efeito médio por temporada (pontos de desenvolvimento somados; 1 ponto ≈ 1 de força):', '', '| Caso | idade (desenvolvimento) | rendimento | envelhecimento | parado | total | oportunidade média do ambiente |', '|---|---:|---:|---:|---:|---:|---:|');
for (const { c, r } of results) {
  const n = r.seasons.length;
  const avg = (k: keyof SeasonRow['points']) => f1(r.seasons.reduce((a, s) => a + s.points[k], 0) / n);
  L.push(`| ${c.id} | ${avg('age')} | ${avg('performance')} | ${avg('aging')} | ${avg('idle')} | ${avg('total')} | ${f1(mean(r.seasons.map((s) => s.meanOpportunity)))} |`);
}
L.push('');
let group = '';
for (const { c, r } of results) {
  if (c.group !== group) { group = c.group; L.push(`## ${group}`, ''); }
  L.push(`### ${c.id} — ${c.title}`, '', `Esperado: ${c.expect}.`, '', '| T | idade | ambiente | limite | contexto | força | Δ | ↑ | ↓ | pts idade | pts rendimento | pts envelhecimento | pts parado | |', '|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|');
  for (const s of r.seasons) L.push(`| ${s.season} | ${s.age} | ${s.env} | ${s.ceiling} | ${s.label} | ${s.start} → ${s.end} | ${sgn(s.end - s.start)} | ${s.ups} | ${s.downs} | ${f1(s.points.age)} | ${f1(s.points.performance)} | ${f1(s.points.aging)} | ${f1(s.points.idle)} | \`${bar(s.end)}\` ${s.end} |`);
  L.push('', `Resultado: ${c.base} → ${r.dev.strengthCurrent}; maior ganho ${sgn(r.maxGain)}, maior queda ${sgn(r.maxDrop)} por temporada; 1º +1 na rodada ${r.firstUpRound ?? '— (nunca)'}.${r.transfers.length ? ` Transferência: força ${r.transfers[0].before} antes e ${r.transfers[0].afterFirstRound} depois da 1ª rodada no novo clube.` : ''}`, '');
}
L.push('## Variante: teto de 4 subidas por temporada (só comparação)', '', '| Caso | sem teto: final (maior ganho) | com teto 4: final (maior ganho) |', '|---|---:|---:|');
for (const { c, r } of capped) L.push(`| ${c.id} | ${byId[c.id].dev.strengthCurrent} (${sgn(byId[c.id].maxGain)}) | ${r.dev.strengthCurrent} (${sgn(r.maxGain)}) |`);
L.push('');

mkdirSync(join(ROOT, 'reports'), { recursive: true });
writeFileSync(join(ROOT, 'reports/development-10-seasons.md'), L.join('\n'));
writeFileSync(join(ROOT, 'reports/development-10-seasons.json'), `${JSON.stringify({
  version: DEVELOPMENT_PROTO.version, applied: false, integrated: false, config: DEVELOPMENT_PROTO,
  note: 'partidas sintéticas com padrões fixos; pontos de desenvolvimento por componente somados por temporada',
  checks: checks.map(([objective, ok, measure]) => ({ objective, ok, measure })),
  cases: results.map(({ c, r }) => ({ id: c.id, group: c.group, title: c.title, position: c.pos, startAge: c.age, strengthBase: c.base, strengthFinal: r.dev.strengthCurrent, maxGainPerSeason: r.maxGain, maxDropPerSeason: r.maxDrop, firstUpRound: r.firstUpRound, transfers: r.transfers, seasons: r.seasons, history: r.dev.history })),
  cappedVariant: capped.map(({ c, r }) => ({ id: c.id, seasonGainCap: 4, strengthFinal: r.dev.strengthCurrent, maxGainPerSeason: r.maxGain })),
}, null, 1)}\n`);
console.log(L.join('\n'));
