// SIMULAÇÃO do protótipo PlayerDevelopment (game/development/development.ts). Nada é aplicado ao jogo.
// Partidas SINTÉTICAS por padrões fixos (sem RNG): os mesmos padrões geram sempre o mesmo relatório.
// Uso: node scripts/simulate-development.ts  →  reports/development-simulation.md
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Player } from '../engine/index.ts';
import { DEVELOPMENT_PROTO, developRound, developmentCeiling, newDevelopment, type DevPosition, type MatchEvidence, type PlayerDevelopment } from '../game/development/development.ts';
import { evolutionScore, evolutionStep } from '../game/manager/progression.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROUNDS = DEVELOPMENT_PROTO.seasonRounds;

// ---------- padrões de partida (ciclos fixos) ----------
type Role = 'TITULAR_BOM' | 'TITULAR_MEDIO' | 'TITULAR_RUIM' | 'RESERVA' | 'BANCO' | 'LIXO' | 'LESIONADO_METADE';
const RESULTS: Record<string, [number, number][]> = {
  bom: [[2, 0], [1, 1], [2, 1], [0, 1], [3, 1]], // time que vence mais do que perde
  medio: [[1, 1], [2, 1], [0, 1], [1, 0], [1, 2]],
  ruim: [[0, 2], [1, 1], [0, 1], [1, 3], [2, 1]],
};
const GOALS: Record<DevPosition, Record<'bom' | 'medio' | 'ruim', number[]>> = {
  ATA: { bom: [1, 0, 1, 0, 2], medio: [0, 1, 0, 0, 1], ruim: [0, 0, 0, 0, 1] },
  MEI: { bom: [0, 1, 0, 0, 1], medio: [0, 0, 1, 0, 0], ruim: [0, 0, 0, 0, 0] },
  DEF: { bom: [0, 0, 0, 0, 1], medio: [0, 0, 0, 0, 0], ruim: [0, 0, 0, 0, 0] },
  GOL: { bom: [0, 0, 0, 0, 0], medio: [0, 0, 0, 0, 0], ruim: [0, 0, 0, 0, 0] },
};
function evidence(role: Role, pos: DevPosition, round: number, team: 'bom' | 'medio' | 'ruim'): MatchEvidence {
  const k = (round - 1) % 5;
  const [gf, ga] = RESULTS[team][k];
  const none: MatchEvidence = { played: false, minutes: 0, started: false, goals: 0, saves: 0, teamGoalsFor: gf, teamGoalsAgainst: ga, redCard: false, injured: false };
  if (role === 'BANCO') return none;
  if (role === 'LESIONADO_METADE' && round > ROUNDS / 2) return { ...none, injured: true };
  if (role === 'RESERVA' && round % 3 !== 0) return none;
  if (role === 'LIXO') return { ...none, played: true, minutes: 5, goals: 0 };
  const level = role === 'TITULAR_BOM' || role === 'LESIONADO_METADE' ? 'bom' : role === 'TITULAR_RUIM' ? 'ruim' : 'medio';
  const minutes = role === 'RESERVA' ? 25 : 90;
  return { played: true, minutes, started: role !== 'RESERVA', goals: role === 'RESERVA' ? 0 : GOALS[pos][level][k], saves: pos === 'GOL' ? 3 : 0, teamGoalsFor: gf, teamGoalsAgainst: ga, redCard: false, injured: false };
}

interface Stage { seasons: number; env: number; role: Role; team: 'bom' | 'medio' | 'ruim'; label: string }
interface Case { id: string; title: string; base: number; age: number; pos: DevPosition; stages: Stage[]; expect: string }

function run(c: Case) {
  let dev: PlayerDevelopment = newDevelopment(c.id, c.base);
  let age = c.age;
  let season = 0;
  const perWindow: { season: number; label: string; values: number[] }[] = [];
  for (const st of c.stages) for (let s = 0; s < st.seasons; s++) {
    season++;
    const values: number[] = [];
    for (let round = 1; round <= ROUNDS; round++) {
      dev = developRound(dev, { season, round, age, position: c.pos, environmentLevel: st.env, evidence: evidence(st.role, c.pos, round, st.team) });
      if (round % DEVELOPMENT_PROTO.windowRounds === 0 || round === ROUNDS) values.push(dev.strengthCurrent);
    }
    perWindow.push({ season, label: `${st.label} (ambiente ${st.env}, teto ${developmentCeiling(st.env, age)}, ${age} anos)`, values });
    age++;
  }
  return { dev, perWindow };
}

const cases: Case[] = [
  { id: 'A', title: 'CASO A — força 23, destaque na Série D, contratado por clube da Série A (ambiente 40)', base: 23, age: 22, pos: 'ATA',
    stages: [{ seasons: 1, env: 16, role: 'TITULAR_BOM', team: 'bom', label: 'Série D, titular, bom rendimento' }, { seasons: 3, env: 40, role: 'TITULAR_BOM', team: 'medio', label: 'Série A, titular, bom rendimento' }],
    expect: '23 na chegada; evolução gradual (nunca 23 → 40).' },
  { id: 'A2', title: 'CASO A (variante) — mesmo jogador, mas vira reserva na Série A', base: 23, age: 22, pos: 'ATA',
    stages: [{ seasons: 1, env: 16, role: 'TITULAR_BOM', team: 'bom', label: 'Série D, titular' }, { seasons: 3, env: 40, role: 'RESERVA', team: 'medio', label: 'Série A, reserva (25 min a cada 3 rodadas)' }],
    expect: 'cresce bem menos: o ambiente só ajuda quem joga.' },
  { id: 'B', title: 'CASO B — força 34, Série D, contratado pela Série A (ambiente 40)', base: 34, age: 24, pos: 'MEI',
    stages: [{ seasons: 1, env: 17, role: 'TITULAR_BOM', team: 'bom', label: 'Série D, titular' }, { seasons: 2, env: 40, role: 'TITULAR_BOM', team: 'medio', label: 'Série A, titular, bom rendimento' }],
    expect: 'chega mais rápido ao nível competitivo, ainda no máximo +1 por janela.' },
  { id: 'C', title: 'CASO C — força 45, continua na Série D', base: 45, age: 27, pos: 'ATA',
    stages: [{ seasons: 3, env: 16, role: 'TITULAR_BOM', team: 'bom', label: 'Série D, titular' }],
    expect: 'não cai por estar na Série D; não cresce acima do ambiente; idade decide a partir dos 31.' },
  { id: 'D', title: 'CASO D — força 20, Série A, fica no banco', base: 20, age: 25, pos: 'DEF',
    stages: [{ seasons: 2, env: 40, role: 'BANCO', team: 'bom', label: 'Série A, sem jogar' }],
    expect: 'não evolui por pertencer a clube forte; parado, perde ritmo devagar.' },
  { id: 'E', title: 'CASO E — força 25, Série A, vira titular com bom rendimento', base: 25, age: 23, pos: 'MEI',
    stages: [{ seasons: 3, env: 40, role: 'TITULAR_BOM', team: 'medio', label: 'Série A, titular, bom rendimento' }],
    expect: 'evolução gradual e perceptível ao longo das temporadas.' },
  { id: 'P1', title: 'PERFIL — estrela pronta (46, 27 anos, Série A ambiente 42)', base: 46, age: 27, pos: 'ATA',
    stages: [{ seasons: 3, env: 42, role: 'TITULAR_BOM', team: 'bom', label: 'Série A, titular' }], expect: 'permanece forte.' },
  { id: 'P2', title: 'PERFIL — jovem promessa (22, 18 anos, ambiente 30)', base: 22, age: 18, pos: 'MEI',
    stages: [{ seasons: 3, env: 30, role: 'TITULAR_MEDIO', team: 'medio', label: 'titular, rendimento médio' }], expect: 'cresce.' },
  { id: 'P3', title: 'PERFIL — jogador mediano (30, 27 anos, ambiente 31)', base: 30, age: 27, pos: 'DEF',
    stages: [{ seasons: 3, env: 31, role: 'TITULAR_MEDIO', team: 'medio', label: 'titular, rendimento médio' }], expect: 'estável, no máximo +1.' },
  { id: 'P4', title: 'PERFIL — veterano (40, 33 anos, ambiente 38)', base: 40, age: 33, pos: 'DEF',
    stages: [{ seasons: 3, env: 38, role: 'TITULAR_MEDIO', team: 'medio', label: 'titular' }], expect: 'estabiliza ou começa a cair devagar.' },
  { id: 'P5', title: 'PERFIL — subindo de divisão com o clube (24, 23 anos; ambiente sobe 22 → 28 → 34)', base: 24, age: 23, pos: 'ATA',
    stages: [{ seasons: 1, env: 22, role: 'TITULAR_BOM', team: 'bom', label: 'Série C' }, { seasons: 1, env: 28, role: 'TITULAR_MEDIO', team: 'medio', label: 'Série B (clube subiu)' }, { seasons: 1, env: 34, role: 'TITULAR_MEDIO', team: 'ruim', label: 'Série A (clube subiu de novo)' }],
    expect: 'adaptação: ambiente maior abre espaço, mas o ganho depende de jogar e render.' },
  { id: 'P6', title: 'PERFIL — goleiro jovem titular (24, 21 anos, ambiente 36)', base: 24, age: 21, pos: 'GOL',
    stages: [{ seasons: 3, env: 36, role: 'TITULAR_BOM', team: 'bom', label: 'titular' }], expect: 'cresce mais devagar que o jogador de linha equivalente.' },
  { id: 'P7', title: 'PERFIL — titular com rendimento ruim (30, 26 anos, ambiente 32)', base: 30, age: 26, pos: 'ATA',
    stages: [{ seasons: 2, env: 32, role: 'TITULAR_RUIM', team: 'ruim', label: 'titular, time perde, sem gols' }], expect: 'não cresce; pode cair.' },
  { id: 'P8', title: 'PERFIL — lesionado na metade da temporada (26, 22 anos, ambiente 35)', base: 26, age: 22, pos: 'MEI',
    stages: [{ seasons: 1, env: 35, role: 'LESIONADO_METADE', team: 'bom', label: 'joga o 1º turno, lesionado no 2º' }], expect: 'lesão pausa a evolução, não pune.' },
];
const exploits: Case[] = [
  { id: 'X1', title: 'EXPLOIT — "minutos de lixo": entra aos 85\' toda rodada num time forte', base: 22, age: 20, pos: 'ATA',
    stages: [{ seasons: 2, env: 40, role: 'LIXO', team: 'bom', label: '5 minutos por jogo' }], expect: 'quase nada: o ganho é proporcional aos minutos.' },
  { id: 'X2', title: 'EXPLOIT — goleador acima do ambiente (30 num ambiente 18)', base: 30, age: 22, pos: 'ATA',
    stages: [{ seasons: 2, env: 18, role: 'TITULAR_BOM', team: 'bom', label: 'artilheiro de time fraco' }], expect: 'não passa do teto do ambiente.' },
  { id: 'X3', title: 'EXPLOIT — guardar evolução: jovem titular brilhante (15, 18 anos, ambiente 45)', base: 15, age: 18, pos: 'ATA',
    stages: [{ seasons: 2, env: 45, role: 'TITULAR_BOM', team: 'bom', label: 'máximo de ganho possível' }], expect: 'no máximo +1 por janela (8 por temporada); acúmulo limitado.' },
];

// ---------- comparação com a evolução em uso (game/manager/progression.ts): passo esperado por temporada ----------
function currentSystemExpected(base: number, age: number, pos: DevPosition, divisionMean: number, appsShare: number, goalsPerRound: number) {
  const p = { strength: base, age, position: pos === 'ATA' ? 'ATT' : pos === 'MEI' ? 'MID' : pos === 'DEF' ? 'DEF' : 'GK' } as unknown as Player;
  const line = { apps: Math.round(appsShare * 19), goals: Math.round(goalsPerRound * 19), yellows: 0, reds: 0, injuries: 0 };
  const score = evolutionScore(p, divisionMean, line, 19, 0);
  // probabilidades de subir/cair do checkpoint (mesma fórmula de evolutionStep)
  let up = 0, down = 0;
  for (let k = 0; k < 1000; k++) { const s = evolutionStep(score, (k + 0.5) / 1000); if (s === 1) up++; else if (s === -1) down++; }
  return (2 * (up - down)) / 1000;
}

// ---------- relatório ----------
const L: string[] = ['# PlayerDevelopment — simulação do protótipo', '', '> Protótipo de evolução contextual (game/development/development.ts, versão DEV-PROTO-0.1). Não integrado ao jogo; nada aplicado. Partidas sintéticas com padrões fixos (sem RNG). Metodologia: docs/PLAYER-DEVELOPMENT.md.', ''];
L.push(`Força ao fim de cada janela de ${DEVELOPMENT_PROTO.windowRounds} rodadas (rodadas ${Array.from({ length: Math.floor(ROUNDS / DEVELOPMENT_PROTO.windowRounds) }, (_, k) => (k + 1) * DEVELOPMENT_PROTO.windowRounds).join(', ')} e ${ROUNDS}).`, '');
const summary: (string | number)[][] = [];
for (const group of [['Casos pedidos e perfis', cases], ['Tentativas de exploit', exploits]] as const) {
  L.push(`## ${group[0]}`, '');
  for (const c of group[1]) {
    const { dev, perWindow } = run(c);
    L.push(`### ${c.title}`, '', `Esperado: ${c.expect}`, '', '| Temporada | Contexto | Força por janela |', '|---|---|---|');
    for (const w of perWindow) L.push(`| ${w.season} | ${w.label} | ${w.values.join(' → ')} |`);
    const maxJump = Math.max(0, ...dev.history.map((h) => Math.abs(h.to - h.from)));
    L.push('', `Resultado: ${c.base} → ${dev.strengthCurrent} (base ${dev.strengthBase}); ${dev.history.length} mudança(s); maior salto ${maxJump}.`, '');
    if (dev.history.length) L.push('<details><summary>Histórico</summary>', '', ...dev.history.map((h) => `- T${h.season} R${h.round}: ${h.from} → ${h.to} — ${h.reason} (ambiente ${h.context.environmentLevel}, teto ${h.context.ceiling}, ${h.context.age} anos)`), '', '</details>', '');
    summary.push([c.id, c.base, dev.strengthCurrent, perWindow.length, dev.history.filter((h) => h.to > h.from).length, dev.history.filter((h) => h.to < h.from).length, maxJump]);
  }
}
L.push('## Resumo', '');
L.push('| Caso | início | fim | temporadas | subidas | quedas | maior salto |', '|---|---:|---:|---:|---:|---:|---:|', ...summary.map((r) => `| ${r.join(' | ')} |`), '');

L.push('## Comparação com a evolução em uso (2 checkpoints/temporada, sorteio estável)', '');
L.push('Passo esperado por temporada no sistema atual (média sobre o sorteio, mesmos fatores) × resultado do protótipo na 1ª temporada no novo ambiente.', '');
const cmp: [string, number, number, DevPosition, number, number, number, string][] = [
  ['A (23 na Série A, 22 anos, titular)', 23, 22, 'ATA', 39, 1, 0.4, 'A'],
  ['B (34 na Série A, 24 anos, titular)', 34, 24, 'MEI', 39, 1, 0.2, 'B'],
  ['C (45 na Série D, 27 anos, titular)', 45, 27, 'ATA', 16, 1, 0.4, 'C'],
  ['D (20 na Série A, 25 anos, banco)', 20, 25, 'DEF', 39, 0, 0, 'D'],
  ['E (25 na Série A, 23 anos, titular)', 25, 23, 'MEI', 39, 1, 0.2, 'E'],
];
L.push('| Caso | sistema atual: passo esperado/temporada | protótipo: 1ª temporada no ambiente |', '|---|---:|---:|');
for (const [label, base, age, pos, mean, apps, gpr, id] of cmp) {
  const c = cases.find((x) => x.id === id)!;
  const { perWindow } = run(c);
  const idx = c.stages.length > 1 ? 1 : 0;
  const first = perWindow[idx];
  const start = idx === 0 ? c.base : perWindow[idx - 1].values[perWindow[idx - 1].values.length - 1];
  const delta = first.values[first.values.length - 1] - start;
  L.push(`| ${label} | ${currentSystemExpected(base, age, pos, mean, apps, gpr) >= 0 ? '+' : ''}${currentSystemExpected(base, age, pos, mean, apps, gpr).toFixed(2).replace('.', ',')} | ${delta >= 0 ? '+' : ''}${delta} |`);
}
L.push('', 'O sistema atual usa a média da DIVISÃO como referência e não olha minutos nem rendimento por partida; o protótipo usa o CLUBE como ambiente, exige minutos e só cresce abaixo do teto.', '');
mkdirSync(join(ROOT, 'reports'), { recursive: true });
writeFileSync(join(ROOT, 'reports/development-simulation.md'), L.join('\n'));
console.log(L.join('\n'));
