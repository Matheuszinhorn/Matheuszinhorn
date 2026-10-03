// Casos SINTÉTICOS determinísticos da DEV-PROTO-0.4 (5 temporadas cada; nada integrado). Padrões fixos de partida
// (sem RNG): titular bom / titular ruim / zero minutos. Referência 0.3-B e a grade 0.4 (limite × preservação).
// Uso: npm run development:synthetic04  →  reports/development-v04-synthetic.md
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { devProto03, devProto04, developRound, developmentCeiling, newDevelopment, roundPoints, type DevelopmentConfig, type DevPosition, type MatchEvidence } from '../game/development/development.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROUNDS = 38;
const VARIANTS: { key: string; cfg: DevelopmentConfig }[] = [
  { key: '0.3-B', cfg: devProto03('B') },
  ...(['A', 'B', 'C'] as const).flatMap((c) => (['A', 'B', 'C'] as const).map((p) => ({ key: `${c}${p}`, cfg: devProto04(c, p) }))),
];
type Role = 'BOM' | 'RUIM' | 'ZERO';
const TEAM = { BOM: [[2, 0], [1, 1], [2, 1], [0, 1], [3, 1]], RUIM: [[0, 2], [1, 1], [0, 1], [1, 3], [2, 1]] } as const;
const GOALS: Record<DevPosition, { BOM: number[]; RUIM: number[] }> = {
  ATA: { BOM: [1, 0, 1, 0, 2], RUIM: [0, 0, 0, 0, 0] }, MEI: { BOM: [0, 1, 0, 0, 1], RUIM: [0, 0, 0, 0, 0] },
  DEF: { BOM: [0, 0, 0, 0, 1], RUIM: [0, 0, 0, 0, 0] }, GOL: { BOM: [0, 0, 0, 0, 0], RUIM: [0, 0, 0, 0, 0] },
};
function evidence(role: Role, pos: DevPosition, round: number): MatchEvidence {
  const k = (round - 1) % 5;
  if (role === 'ZERO') return { played: false, minutes: 0, started: false, goals: 0, saves: 0, teamGoalsFor: 1, teamGoalsAgainst: 1, redCard: false, injured: false };
  const [gf, ga] = TEAM[role][k];
  return { played: true, minutes: 90, started: true, goals: GOALS[pos][role][k], saves: pos === 'GOL' ? 3 : 0, teamGoalsFor: gf, teamGoalsAgainst: ga, redCard: false, injured: false };
}
interface Case { title: string; age: number; base: number; env: number; pos: DevPosition; role: Role }
const CASES: Case[] = [
  { title: '20 anos · força 20 · zero minutos (ambiente 30)', age: 20, base: 20, env: 30, pos: 'MEI', role: 'ZERO' },
  { title: '20 anos · força 20 · titular bom (ambiente 30)', age: 20, base: 20, env: 30, pos: 'MEI', role: 'BOM' },
  { title: '30 anos · força 40 · zero minutos (ambiente 38)', age: 30, base: 40, env: 38, pos: 'DEF', role: 'ZERO' },
  { title: '30 anos · força 40 · titular bom (ambiente 38)', age: 30, base: 40, env: 38, pos: 'DEF', role: 'BOM' },
  { title: '35 anos · força 40 · zero minutos (ambiente 38)', age: 35, base: 40, env: 38, pos: 'DEF', role: 'ZERO' },
  { title: '35 anos · força 40 · titular bom (ambiente 38)', age: 35, base: 40, env: 38, pos: 'DEF', role: 'BOM' },
  { title: '36 anos · força 48 · titular bom (ambiente 42)', age: 36, base: 48, env: 42, pos: 'ATA', role: 'BOM' },
  { title: '36 anos · força 48 · titular ruim (ambiente 42)', age: 36, base: 48, env: 42, pos: 'ATA', role: 'RUIM' },
  { title: 'força 48 no limite contextual · titular bom (27 anos, ambiente 46 → limite 48)', age: 27, base: 48, env: 46, pos: 'ATA', role: 'BOM' },
  { title: 'força 48 no limite contextual · titular ruim (27 anos, ambiente 46 → limite 48)', age: 27, base: 48, env: 46, pos: 'ATA', role: 'RUIM' },
];

const f2 = (v: number) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
const L: string[] = ['# DEV-PROTO-0.4 — casos sintéticos (5 temporadas)', '', '> Simulação apenas; **DEV-PROTO-0.4 NÃO integrada**; nenhuma variante definitiva. Partidas sintéticas com padrões fixos (sem RNG). As idades avançam a cada temporada; aposentadoria não é modelada aqui (no jogo, aos 37).', '', 'Variantes: 0.3-B (referência); 0.4 = limite conjunto da perda sem participação {A −0,50, B −0,75, C −1,00} × preservação do rendimento no limite contextual {A atual, B parcial, C integral}.', ''];
for (const c of CASES) {
  L.push(`## ${c.title}`, '', `Limite contextual por idade: ${[0, 1, 2, 3, 4].map((i) => `${c.age + i} anos → ${developmentCeiling(c.env, c.age + i)}`).join(' · ')}.`, '');
  L.push(`| Variante | início | T1 | T2 | T3 | T4 | T5 | Δ total | perda sem participação aplicada (média/ano) | devolvido pelo limite (média/ano) |`, '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const v of VARIANTS) {
    let dev = newDevelopment('s', c.base);
    const ends: number[] = [];
    let nonPlay = 0;
    let relief = 0;
    for (let s = 1; s <= 5; s++) for (let round = 1; round <= ROUNDS; round++) {
      const ctx = { season: s, round, age: c.age + s - 1, position: c.pos, environmentLevel: c.env, divisionLevel: c.env, evidence: evidence(c.role, c.pos, round) };
      const b = roundPoints(dev, ctx, v.cfg);
      if (!ctx.evidence.played) { nonPlay += b.aging + b.idle + b.capRelief; relief += b.capRelief; }
      dev = developRound(dev, ctx, v.cfg);
      if (round === ROUNDS) ends.push(dev.strengthCurrent);
    }
    const d = ends[4] - c.base;
    L.push(`| ${v.key} | ${c.base} | ${ends.join(' | ')} | ${d > 0 ? '+' : ''}${d} | ${f2(nonPlay / 5)} | ${f2(relief / 5)} |`);
  }
  L.push('');
}
mkdirSync(join(ROOT, 'reports'), { recursive: true });
writeFileSync(join(ROOT, 'reports/development-v04-synthetic.md'), L.join('\n'));
console.log(L.join('\n'));
