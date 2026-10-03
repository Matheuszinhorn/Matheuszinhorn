// DEV-DIAGNOSTIC-0.5 — DIAGNÓSTICO de extremos (caminho até 50, caminho até 1, seleção como fator). NADA é calibrado:
// a fórmula DEV-PROTO-0.4-B é usada como está. Engine 0.2.0 intocado; nada integrado; a Seleção NÃO existe no jogo.
// Partes sintéticas (determinísticas, sem RNG): padrões fixos de partida alimentados direto em developRound, com os
// ambientes MEDIDOS no mundo fictício (seed elite-dev-world-10). Parte 5: refaz o mundo B da DEV-INTEGRATION-0.2
// (mesma seed, mesma composição; hash de evolução conferido contra o relatório da 0.2) guardando o histórico rico.
// "Sondas" (marcadas como tal) mudam UMA entrada só para explicar um bloqueio; não são propostas de calibração.
// Uso: npm run development:diagnostic05  →  reports/development-diagnostic-05.{md,json}   (DIAG_SKIP_REAL=1 pula a parte 5)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRound, roundResults, simulateRound, type World } from '../engine/index.ts';
import { careerOffers, isSeasonOver, type CareerState } from '../game/career.ts';
import { newManagedCareer } from '../game/manager/actions.ts';
import { finishManagedRound, planManagedRound, startManagedSeason } from '../game/manager/flow.ts';
import { contextLevel, curveAt, devProto04, developRound, developmentCeiling, environmentLevel, matchPerformance, newDevelopment, roundPoints, type DevelopmentConfig, type DevPosition, type MatchEvidence, type PlayerDevelopment } from '../game/development/development.ts';
import { evidenceFromMatch } from '../game/development/evidence.ts';
import { POSITION, stepDevelopment, withDevelopedStrength } from '../game/development/feedback.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 'elite-dev-world-10';
const CFG = devProto04('B', 'B');
const ROUNDS = 38;
const RETIRE = 37;
const f1 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') : '–');
const f2 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') : '–');
const sg = (v: number) => (!Number.isFinite(v) ? '–' : v > 0 ? `+${v}` : `${v}`);
const H = (cols: string[]) => [`| ${cols.join(' | ')} |`, `|${cols.map((_, i) => (i ? '---:' : '---')).join('|')}|`];
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);

// ---------- ambientes medidos no mundo fictício ----------
const world0 = newManagedCareer(SEED, 'Diagnóstico', careerOffers(SEED)[0]).world;
const clubEnv = (id: string) => environmentLevel(world0.clubs[id].squad.map((p) => world0.players[p].strength));
const ENV: Record<number, { level: number; best: number }> = {};
for (const d of world0.divisions) { const e = d.clubIds.map(clubEnv); ENV[d.level] = { level: mean(e), best: Math.max(...e) }; }
const brazil = Object.values(world0.players).filter((p) => p.nationality === 'Brasil').map((p) => p.strength).sort((a, b) => b - a);
const NATIONAL_ENV = mean(brazil.slice(0, 16)); // "ambiente" da seleção = 16 melhores brasileiros (só para a sonda)

// ---------- padrões sintéticos (ciclos de 5 rodadas) ----------
interface G { played: boolean; minutes: number; started: boolean; goals: number; gf: number; ga: number }
const g = (gf: number, ga: number, goals = 0, minutes = 90, started = true): G => ({ played: true, minutes, started, goals, gf, ga });
const OFF: G = { played: false, minutes: 0, started: false, goals: 0, gf: 1, ga: 1 };
const PAT = {
  EXC: [g(2, 1, 1), g(1, 0, 1), g(1, 1, 0), g(0, 1, 0), g(3, 1, 2)], // excepcional, time bom mas não campeão (3V 1E 1D)
  TITLE: [g(2, 0, 1), g(3, 1, 1), g(1, 0, 1), g(1, 1, 0), g(2, 1, 2)], // excepcional em time campeão (4V 1E)
  STAR: [g(2, 0, 2), g(3, 1, 1), g(1, 0, 1), g(1, 1, 1), g(2, 1, 2)], // + destaque individual (7 gols / 5 jogos)
  MED: [g(1, 0, 0), g(1, 1, 1), g(0, 2, 0), g(2, 1, 0), g(1, 2, 1)], // médio (2V 1E 2D, 2 gols / 5 jogos)
  BAD: [g(0, 2, 0), g(1, 3, 0), g(0, 1, 0), g(1, 1, 0), g(0, 2, 0)], // titular ruim (0V 1E 4D, sem gols)
  GOOD: [g(2, 1, 1), g(1, 1, 0), g(2, 0, 1), g(0, 1, 0), g(1, 0, 0)], // titular bom (3V 1E 1D)
  RES: [OFF, g(2, 0, 0, 20, false), OFF, g(1, 1, 0, 20, false), OFF], // reserva: 2 entradas de 20 min a cada 5 rodadas
  ZERO: [OFF, OFF, OFF, OFF, OFF],
} as const;
type PatKey = keyof typeof PAT;
const INTL: G[] = [g(2, 0, 1), g(1, 0, 1), g(2, 1, 1), g(1, 1, 0), g(3, 0, 2), g(1, 0, 0), g(2, 1, 1), g(0, 0, 0)]; // seleção excelente
const INTL_ROUNDS = [3, 8, 13, 18, 23, 28, 33, 36]; // datas FIFA fictícias (nunca fim de janela)
const ev = (x: G): MatchEvidence => ({ played: x.played, minutes: x.minutes, started: x.started, goals: x.goals, saves: 0, teamGoalsFor: x.gf, teamGoalsAgainst: x.ga, redCard: false, injured: false });

interface Spec { base: number; age: number; pos: DevPosition; env: number; div: number; pattern: (season: number) => PatKey; intl?: boolean; seasons: number; cfg?: DevelopmentConfig; titles?: (season: number) => boolean }
interface SeasonRow { season: number; age: number; start: number; end: number; ceiling: number; context: number; apps: number; minutes: number; goals: number; wins: number; title: boolean; intlApps: number; perf: number; windowsAtLimit: number; discarded: number; aging: number; idle: number; relief: number }
function runSpec(s: Spec): SeasonRow[] {
  const cfg = s.cfg ?? CFG;
  let dev: PlayerDevelopment = newDevelopment('x', s.base);
  const rows: SeasonRow[] = [];
  for (let season = 1; season <= s.seasons; season++) {
    const age = s.age + season - 1;
    if (age >= RETIRE) break;
    const pat = PAT[s.pattern(season)];
    const row: SeasonRow = { season, age, start: dev.strengthCurrent, end: 0, ceiling: developmentCeiling(contextLevel({ environmentLevel: s.env, divisionLevel: s.div }, cfg), age, cfg), context: contextLevel({ environmentLevel: s.env, divisionLevel: s.div }, cfg), apps: 0, minutes: 0, goals: 0, wins: 0, title: s.titles?.(season) ?? false, intlApps: 0, perf: 0, windowsAtLimit: 0, discarded: 0, aging: 0, idle: 0, relief: 0 };
    let intlI = 0;
    const step = (ctx: Parameters<typeof developRound>[1]) => {
      const b = roundPoints(dev, ctx, cfg);
      const atLimit = dev.strengthCurrent >= b.ceiling;
      const upper = atLimit ? (cfg.performancePreservation === 'full' ? cfg.accumulatorCap : cfg.performancePreservation === 'partial' ? cfg.preservationBuffer : 0) : cfg.accumulatorCap;
      row.discarded += Math.max(0, dev.progress + b.points - upper);
      row.aging += b.aging; row.idle += b.idle; row.relief += b.capRelief;
      dev = developRound(dev, ctx, cfg);
      if ((ctx.round % cfg.windowRounds === 0 || ctx.round === cfg.seasonRounds) && dev.strengthCurrent >= b.ceiling) row.windowsAtLimit++;
    };
    for (let round = 1; round <= ROUNDS; round++) {
      const x = pat[(round - 1) % 5];
      const e = ev(x);
      if (x.played) { row.apps++; row.minutes += x.minutes; row.goals += x.goals; row.perf += matchPerformance(e, s.pos); if (x.gf > x.ga) row.wins++; }
      step({ season, round, age, position: s.pos, environmentLevel: s.env, divisionLevel: s.div, evidence: e });
      if (s.intl && INTL_ROUNDS.includes(round)) {
        const y = INTL[intlI++ % INTL.length];
        row.intlApps++;
        step({ season, round, age, position: s.pos, environmentLevel: NATIONAL_ENV, divisionLevel: NATIONAL_ENV, evidence: ev(y) });
      }
    }
    row.end = dev.strengthCurrent;
    row.perf = row.apps ? row.perf / row.apps : NaN;
    rows.push(row);
  }
  return rows;
}
const firstAt = (rows: SeasonRow[], v: number) => rows.find((r) => r.end >= v)?.season ?? null;
const firstDown = (rows: SeasonRow[], v: number) => rows.find((r) => r.end <= v)?.season ?? null;
const maxGain = (rows: SeasonRow[]) => Math.max(0, ...rows.map((r) => r.end - r.start));
const maxDrop = (rows: SeasonRow[]) => Math.min(0, ...rows.map((r) => r.end - r.start));
const peak = (rows: SeasonRow[]) => Math.max(...rows.map((r) => r.end), rows[0]?.start ?? 0);
const path = (rows: SeasonRow[]) => [rows[0]?.start, ...rows.map((r) => r.end)].join('→');
const CLUB_ONLY: DevelopmentConfig = Object.freeze({ ...CFG, version: `${CFG.version}+sonda-sem-divisão`, divisionWeight: 0 }) as DevelopmentConfig;

// ---------- PARTE 1 ----------
const D1 = { env: ENV[1].best, div: ENV[1].level };
const D1_CTX = contextLevel({ environmentLevel: D1.env, divisionLevel: D1.div }, CFG);
const SCN: { key: string; label: string; env: number; div: number; pattern: (s: number) => PatKey; intl?: boolean; titles: (s: number) => boolean }[] = [
  { key: 'A', label: 'D1 + titular + excepcional + sem títulos', ...D1, pattern: () => 'EXC', titles: () => false },
  { key: 'B', label: 'D1 + titular + excepcional + 1 título (T1)', ...D1, pattern: (s) => (s === 1 ? 'TITLE' : 'EXC'), titles: (s) => s === 1 },
  { key: 'C', label: 'D1 + titular + excepcional + títulos recorrentes', ...D1, pattern: () => 'TITLE', titles: () => true },
  { key: 'D', label: 'C + destaque individual', ...D1, pattern: () => 'STAR', titles: () => true },
  { key: 'E', label: 'D + seleção excelente — fórmula atual (não há canal para a seleção)', ...D1, pattern: () => 'STAR', titles: () => true },
  { key: 'E*', label: 'D + seleção excelente — SONDA: 8 jogos/ano como evidência extra, ambiente da seleção', ...D1, pattern: () => 'STAR', intl: true, titles: () => true },
  { key: 'F', label: 'D1 + titular + desempenho médio', ...D1, pattern: () => 'MED', titles: () => false },
  { key: 'G', label: 'D1 + reserva + poucos minutos', ...D1, pattern: () => 'RES', titles: () => false },
  { key: 'H', label: 'D2 (melhor clube) + titular + excepcional (campeão)', env: ENV[2].best, div: ENV[2].level, pattern: () => 'TITLE', titles: () => true },
  { key: 'I', label: 'D4 (melhor clube) + titular + excepcional (campeão)', env: ENV[4].best, div: ENV[4].level, pattern: () => 'TITLE', titles: () => true },
];
const BASES1 = [40, 43, 45, 47, 48, 49];
const AGE1 = 24;
const part1 = SCN.map((sc) => ({ sc, cells: BASES1.map((base) => ({ base, rows: runSpec({ base, age: AGE1, pos: 'ATA', env: sc.env, div: sc.div, pattern: sc.pattern, intl: sc.intl, seasons: 10, titles: sc.titles }) })) }));

// ---------- PARTE 2 e 3 ----------
const AGES2 = [21, 24, 27];
const part2 = [45, 47, 48, 49].flatMap((base) => AGES2.flatMap((age) => (['D', 'E*'] as const).map((k) => { const sc = SCN.find((x) => x.key === k)!; return { base, age, k, rows: runSpec({ base, age, pos: 'ATA', env: sc.env, div: sc.div, pattern: sc.pattern, intl: sc.intl, seasons: 15, titles: sc.titles }) }; })));
const part3 = [40, 43, 45, 47].flatMap((base) => AGES2.map((age) => {
  const a = runSpec({ base, age, pos: 'ATA', ...D1, pattern: () => 'TITLE', seasons: 10 });
  const b = runSpec({ base, age, pos: 'ATA', ...D1, pattern: () => 'TITLE', intl: true, seasons: 10 });
  return { base, age, a, b };
}));

// ---------- PARTE 4 ----------
const BASES4 = [5, 8, 10, 12, 15, 20];
const AGES4 = [19, 25, 31];
const P4: { key: string; label: string; pattern: PatKey }[] = [
  { key: 'A', label: 'zero minutos', pattern: 'ZERO' }, { key: 'B', label: 'poucos minutos (2×20 min a cada 5 rodadas)', pattern: 'RES' },
  { key: 'C', label: 'titular + desempenho ruim', pattern: 'BAD' }, { key: 'D', label: 'titular + desempenho médio', pattern: 'MED' }, { key: 'E', label: 'titular + desempenho bom', pattern: 'GOOD' },
];
const D4avg = { env: ENV[4].level, div: ENV[4].level };
const part4 = AGES4.flatMap((age) => BASES4.flatMap((base) => P4.map((p) => ({ age, base, p, rows: runSpec({ base, age, pos: 'MEI', ...D4avg, pattern: () => p.pattern, seasons: 30 }) }))));
const part4Ata = AGES4.map((age) => ({ age, rows: runSpec({ base: 10, age, pos: 'ATA', ...D4avg, pattern: () => 'BAD', seasons: 30 }) }));

// ---------- PARTE 9 e 10 ----------
const p9 = runSpec({ base: 45, age: 21, pos: 'ATA', ...D1, pattern: () => 'STAR', intl: true, seasons: 15, titles: () => true });
const p9club = runSpec({ base: 45, age: 21, pos: 'ATA', ...D1, pattern: () => 'STAR', intl: true, seasons: 15, titles: () => true, cfg: CLUB_ONLY });
const p9max = runSpec({ base: 45, age: 21, pos: 'ATA', env: 50, div: ENV[1].level, pattern: () => 'STAR', intl: true, seasons: 15, titles: () => true });
const p10 = runSpec({ base: 45, age: 21, pos: 'ATA', env: ENV[4].best, div: ENV[4].level, pattern: () => 'GOOD', seasons: 15 });
const p10avg = runSpec({ base: 45, age: 21, pos: 'ATA', ...D4avg, pattern: () => 'GOOD', seasons: 15 });

// ---------- PARTE 5: casos reais (mundo B da DEV-INTEGRATION-0.2, refeito) ----------
interface PS { s: number; age: number; club: string; div: number; apps: number; starts: number; minutes: number; goals: number; injured: number; champion: boolean; end: number }
function realWorld() {
  let c: CareerState = newManagedCareer(SEED, 'Simulação', careerOffers(SEED)[0]);
  const evo = createHash('sha256');
  let devs: Map<string, PlayerDevelopment> = new Map();
  const seasons = new Map<string, PS[]>();
  const info = new Map<string, { name: string; pos: string; age0: number; firstSeason: number }>();
  const cur = (id: string, s: number, w: World): PS => {
    const a = seasons.get(id) ?? [];
    let r = a.find((x) => x.s === s);
    if (!r) { const p = w.players[id]; r = { s, age: p.age, club: p.clubId!, div: w.divisions.find((d) => d.id === w.clubs[p.clubId!].divisionId)!.level, apps: 0, starts: 0, minutes: 0, goals: 0, injured: 0, champion: false, end: p.strength }; a.push(r); seasons.set(id, a); }
    return r;
  };
  for (let season = 1; season <= 10; season++) {
    for (let round = 1; round <= ROUNDS; round++) {
      const plan = planManagedRound(c);
      const w0 = c.world;
      for (const p of Object.values(w0.players)) {
        if (!p.clubId) continue;
        if (!info.has(p.id)) info.set(p.id, { name: p.name, pos: POSITION[p.position], age0: p.age, firstSeason: season });
        const r = cur(p.id, season, w0);
        r.club = p.clubId; r.div = w0.divisions.find((d) => d.id === w0.clubs[p.clubId!].divisionId)!.level;
        if (p.condition.injuryRounds > 0) r.injured++;
      }
      const sim = simulateRound(createRound(plan.roundId, plan.seed, plan.fixtures, null));
      const results = roundResults(sim);
      for (const m of sim.matches) for (const [id, e] of evidenceFromMatch(m)) { if (!e.played || !w0.players[id]?.clubId) continue; const r = cur(id, season, w0); r.apps++; r.minutes += e.minutes; r.goals += e.goals; if (e.started) r.starts++; }
      devs = stepDevelopment(devs, w0, sim.matches, season, round, CFG);
      c = finishManagedRound(c, results, sim.matches, { evolution: false }).career;
      c = { ...c, world: withDevelopedStrength(c.world, devs) };
      evo.update(`${season}|${round}|${[...devs.values()].map((d) => `${d.playerId}:${d.strengthCurrent}:${d.progress.toFixed(6)}`).join(',')};`);
    }
    if (!isSeasonOver(c)) throw new Error('temporada incompleta');
    const champs = new Set(Object.values(c.pendingPromotion?.champions ?? {}));
    for (const [id, a] of seasons) { const r = a.find((x) => x.s === season); if (!r) continue; const p = c.world.players[id]; if (p) r.end = p.strength; if (champs.has(r.club)) r.champion = true; }
    if (season < 10) c = startManagedSeason(c, { evolution: false }).career;
  }
  return { devs, seasons, info, evoHash: evo.digest('hex') };
}

// ---------- relatório ----------
const L: string[] = ['# DEV-DIAGNOSTIC-0.5 — diagnóstico de desenvolvimento, elite, seleção e limites de força', '', '> **Diagnóstico apenas.** DEV-PROTO-0.4-B NÃO foi alterada, nada foi calibrado, nada integrado, Engine 0.2.0 intocado, sem deploy. A Seleção NÃO existe no jogo nem na fórmula; onde aparece "SONDA", é uma simulação hipotética para medir um efeito, não uma proposta.', ''];

L.push('## 1. Auditoria', '');
L.push('**Onde a força pode mudar (todas as escritas de `strength`/`strengthCurrent` no código):**', '');
L.push('- `engine/world/generate.ts` — geração do mundo fictício: `clampStrength` (1–50, inteiro).');
L.push('- `game/manager/world.ts` `youthPlayer` — juniores: faixa por divisão (dentro de 1–50).');
L.push('- `game/manager/progression.ts` `evolveWorld` — evolução ANTIGA do jogo (±1, `Math.max(1, Math.min(50, …))`); desligada nos experimentos.');
L.push('- `data/validate.ts` / `data/to-world.ts` — importação do universo real: força fora de 1–50 é rejeitada na validação.');
L.push('- `game/development/development.ts` `developRound` — desenvolvimento experimental: `clamp(strengthCurrent + step, 1, 50)`, ±1 por janela.');
L.push('- `game/development/feedback.ts` `withDevelopedStrength` — só copia strengthCurrent para Player.strength.');
L.push('- Transferência (`movePlayer`), envelhecimento (`agePlayers`), renovações, acesso/rebaixamento (`startNextSeason`) e persistência (`serializeCareer`/`deserializeCareer`) **não escrevem** força.');
L.push('- Nenhum caminho produz força fora de 1–50 (testes de invariante novos em `game/tests/strength-invariants.test.ts`). Observação: `deserializeCareer` não valida faixas de um save adulterado — ele não PRODUZ valor inválido, só não rejeita; registrado, não alterado.', '');
L.push('**O que a fórmula DEV-PROTO-0.4-B lê:** idade, posição, minutos, gols, defesas, placar do time, cartão vermelho, lesão, ambiente do elenco (16 melhores) e nível da divisão. **Não lê títulos, tabela, prêmios nem seleção.** Títulos só entram de forma indireta (time que vence muito dá +0,2 de rendimento por vitória).', '');
L.push('**Limite contextual do GANHO** (`developmentCeiling`): `round(contexto + margem(idade))`, com contexto = 0,5 × ambiente do clube + 0,5 × nível da divisão e margem 5 (≤ 20 anos), 4 (24), 2 (27), 0 (30), −2 (33+). No limite, o +1 é proibido; acima dele só se mantém com rendimento bom.', '');
L.push('**Ambientes medidos no mundo fictício (início):**', '', ...H(['Divisão', 'nível (média dos ambientes)', 'melhor clube', 'contexto do melhor clube', 'limite aos 21', '24', '27', '30']));
for (const lv of [1, 2, 3, 4]) { const ctx = contextLevel({ environmentLevel: ENV[lv].best, divisionLevel: ENV[lv].level }, CFG); L.push(`| D${lv} | ${f2(ENV[lv].level)} | ${f2(ENV[lv].best)} | ${f2(ctx)} | ${[21, 24, 27, 30].map((a) => developmentCeiling(ctx, a, CFG)).join(' | ')} |`); }
L.push('', `Seleção (só para a sonda): média dos 16 melhores brasileiros = ${f2(NATIONAL_ENV)}.`, '');
const need = (age: number) => 49.5 - curveAt(CFG.ceilingMargin, age);
L.push('**Contexto necessário para o limite chegar a 50:** ' + [20, 21, 24, 27, 30].map((a) => `${a} anos ≥ ${f2(need(a))}`).join(' · ') + `. Com o peso 0,5 da divisão e a D1 em ${f2(ENV[1].level)}, o clube precisaria de ambiente ≥ ${f2(2 * need(21) - ENV[1].level)} aos 21 — acima de 50, impossível. Mesmo um elenco inteiro de força 50 dá contexto ${f2(contextLevel({ environmentLevel: 50, divisionLevel: ENV[1].level }, CFG))} e limite ${developmentCeiling(contextLevel({ environmentLevel: 50, divisionLevel: ENV[1].level }, CFG), 20, CFG)} aos 20 anos.`, '');
L.push(`**Bloqueio estrutural identificado:** no mundo fictício, com a DEV-PROTO-0.4-B, o maior limite de ganho possível é ${developmentCeiling(D1_CTX, 20, CFG)} (melhor clube da D1, 20 anos) e ${developmentCeiling(D1_CTX, 21, CFG)} dos 21 aos 24 anos. Ninguém GANHA força acima disso.` + ' Os jogadores que já nascem 46–50 só se mantêm (rendimento bom compensa a idade) ou caem.', '');

L.push('## 2. Caminho até 50', '', `### Parte 1 — matriz de cenários (ATA, ${AGE1} anos, 10 temporadas ou até a aposentadoria; ambientes medidos)`, '', 'Célula: pico · final (temporada em que chegou a 50, se chegou). Cenários: ' + SCN.map((s) => `**${s.key}** ${s.label}`).join('; ') + '.', '', ...H(['Cenário', ...BASES1.map((b) => `início ${b}`)]));
for (const { sc, cells } of part1) L.push(`| ${sc.key} | ${cells.map((c) => `${peak(c.rows)} · ${c.rows.at(-1)!.end}${firstAt(c.rows, 50) ? ` (T${firstAt(c.rows, 50)})` : ''}`).join(' | ')} |`);
L.push('', `Limite de ganho por idade nos cenários D1 (melhor clube): ${[24, 25, 26, 27, 28, 29, 30, 31, 32, 33].map((a) => `${a}→${developmentCeiling(D1_CTX, a, CFG)}`).join(' · ')}.`, '');
L.push('Detalhe do início 40 (onde há espaço para crescer):', '', ...H(['Cenário', 'caminho', 'maior ganho anual', 'janelas no limite', 'rendimento descartado no limite (pts)']));
for (const { sc, cells } of part1) { const c = cells[0]; L.push(`| ${sc.key} | ${path(c.rows)} | ${sg(maxGain(c.rows))} | ${c.rows.reduce((a, r) => a + r.windowsAtLimit, 0)} / ${c.rows.length * 8} | ${f1(c.rows.reduce((a, r) => a + r.discarded, 0))} |`); }
L.push('');

L.push('### Parte 2 — 45/47/48/49 → 50', '', 'Melhor cenário de clube (**D**: D1, melhor clube, titular, destaque, campeão todo ano) e **E*** (D + sonda da seleção). Até 15 temporadas ou aposentadoria.', '', ...H(['Início', 'idade', 'cenário', 'chegou a 50?', 'caminho', 'maior ganho anual', 'limite de ganho (1ª temp.)', 'minutos/ano', 'jogos/ano (+ seleção)', 'rendimento médio', 'títulos']));
for (const r of part2) { const x = r.rows[0]; L.push(`| ${r.base} | ${r.age} | ${r.k} | ${firstAt(r.rows, 50) ? `sim, T${firstAt(r.rows, 50)}` : 'não'} | ${path(r.rows)} | ${sg(maxGain(r.rows))} | ${x.ceiling} (contexto ${f2(x.context)}) | ${x.minutes} | ${x.apps}${x.intlApps ? ` + ${x.intlApps}` : ''} | ${f2(x.perf)} | ${r.rows.filter((y) => y.title).length} |`); }
L.push('');

L.push('## 3. Caminho até 1', '', `### Parte 4 — MEI em clube médio da D4 (contexto ${f2(D4avg.env)}), até a aposentadoria`, '', 'Célula: temporada em que chegou a 1 (idade) ou força final; entre parênteses a maior queda anual.', '');
for (const age of AGES4) {
  L.push(`**Começando com ${age} anos**`, '', ...H(['strengthBase', ...P4.map((p) => `${p.key} ${p.label}`)]));
  for (const base of BASES4) L.push(`| ${base} | ${P4.map((p) => { const rows = part4.find((x) => x.age === age && x.base === base && x.p.key === p.key)!.rows; const t = firstDown(rows, 1); return `${t ? `**1 na T${t} (${age + t - 1} anos)**` : `fim ${rows.at(-1)!.end} (${age + rows.length - 1} anos)`} (${sg(maxDrop(rows))})`; }).join(' | ')} |`);
  L.push('');
}
L.push('ATA titular ruim (o atacante sem gol perde −0,1 extra por jogo de 60+ min), início 10: ' + part4Ata.map((x) => `${x.age} anos → ${firstDown(x.rows, 1) ? `1 na T${firstDown(x.rows, 1)}` : `fim ${x.rows.at(-1)!.end}`} (maior queda ${sg(maxDrop(x.rows))})`).join(' · ') + '.', '');
const dec = (age: number, pat: PatKey) => { const r = runSpec({ base: 20, age, pos: 'MEI', ...D4avg, pattern: () => pat, seasons: 1 })[0]; return `${age} anos: envelhecimento ${f2(r.aging)}, inatividade ${f2(r.idle)}, limite devolve ${f2(r.relief)}`; };
L.push('Decomposição de uma temporada sem minutos: ' + [19, 25, 31, 35].map((a) => dec(a, 'ZERO')).join(' · ') + '.', '');

L.push('## 4. Impacto da seleção', '', '**Na fórmula atual a seleção não tem efeito nenhum** (E = D em todas as células): não há entrada para ela. A SONDA abaixo alimenta 8 jogos internacionais excelentes por ano como evidência extra, com o ambiente da seleção — sem convocação gerar força direta.', '', '### Parte 3 — A (D1 + titular + excelente + títulos) × B (A + seleção excelente, sonda)', '', ...H(['Início', 'idade', 'A: caminho', 'B: caminho', 'B − A no fim', 'B − A no pico']));
for (const r of part3) L.push(`| ${r.base} | ${r.age} | ${path(r.a)} | ${path(r.b)} | ${sg(r.b.at(-1)!.end - r.a.at(-1)!.end)} | ${sg(peak(r.b) - peak(r.a))} |`);
L.push('');

L.push('## Parte 9 — caso especial: 21 anos, 45, D1, melhor clube, titular, destaque, títulos, seleção excelente (sonda)', '', ...H(['T', 'idade', 'início', 'fim', 'limite de ganho', 'janelas no limite', 'rendimento descartado no limite', 'envelhecimento']));
for (const r of p9) L.push(`| ${r.season} | ${r.age} | ${r.start} | ${r.end} | ${r.ceiling} | ${r.windowsAtLimit}/8 | ${f2(r.discarded)} | ${f2(r.aging)} |`);
L.push('', `Resultado: ${path(p9)} — ${firstAt(p9, 50) ? `chega a 50 na T${firstAt(p9, 50)}` : `NÃO chega a 50; pico ${peak(p9)}`}.`, '');
L.push(`**Por quê:** o limite de ganho é ${p9[0].ceiling} aos 21 (contexto ${f2(p9[0].context)} = 0,5 × ${f2(D1.env)} do clube + 0,5 × ${f2(D1.div)} da D1, + margem ${f2(curveAt(CFG.ceilingMargin, 21))}) e cai com a idade (${p9.map((r) => r.ceiling).join(', ')}). Começando em 45, o jogador já está NO limite: todo rendimento acima da reserva parcial (0,5) é descartado (${f2(mean(p9.map((r) => r.discarded)))} pontos por temporada). A seleção, na sonda, entra com o ambiente ${f2(NATIONAL_ENV)} — limite ${developmentCeiling(NATIONAL_ENV, 21, CFG)} aos 21 —, mas só nos jogos dela; nos 38 jogos do clube o limite volta a ${p9[0].ceiling}, e o +1 é decidido no fim da janela com o limite do jogo que fecha a janela (do clube).`, '');
L.push(`Sondas de bloqueio (não são propostas): sem o peso da divisão (contexto = só o clube): ${path(p9club)}${firstAt(p9club, 50) ? ` — chega a 50 na T${firstAt(p9club, 50)}` : ''}. Clube com elenco inteiro de força 50 (contexto ${f2(contextLevel({ environmentLevel: 50, divisionLevel: D1.div }, CFG))}): ${path(p9max)}.`, '');
L.push('## Parte 10 — caso contrário: 21 anos, 45, D4, titular, desempenho bom', '', `Melhor clube da D4 (contexto ${f2(contextLevel({ environmentLevel: ENV[4].best, divisionLevel: ENV[4].level }, CFG))}): ${path(p10)}. Clube médio da D4: ${path(p10avg)}. Muito acima do limite (${p10[0].ceiling}): não ganha nada; mantém a força enquanto joga bem (o rendimento com sinal compensa a idade) e cai devagar com a idade a partir dos ~30 anos. **O clube não dá força de presente** — nem para cima (D1) nem para baixo (D4).`, '');

let real: ReturnType<typeof realWorld> | null = null;
const json: Record<string, unknown> = { diagnostic: 'DEV-DIAGNOSTIC-0.5', config: CFG, environments: ENV, nationalEnvProbe: NATIONAL_ENV, part1: part1.map(({ sc, cells }) => ({ scenario: sc.key, label: sc.label, cells: cells.map((c) => ({ base: c.base, path: path(c.rows), peak: peak(c.rows), reached50: firstAt(c.rows, 50) })) })), part2: part2.map((r) => ({ base: r.base, age: r.age, scenario: r.k, path: path(r.rows), reached50: firstAt(r.rows, 50), ceilings: r.rows.map((x) => x.ceiling) })), part3: part3.map((r) => ({ base: r.base, age: r.age, a: path(r.a), b: path(r.b) })), part4: part4.map((r) => ({ age: r.age, base: r.base, pattern: r.p.key, path: path(r.rows), reached1: firstDown(r.rows, 1) })), part9: { formula: path(p9), probeNoDivision: path(p9club), probeClub50: path(p9max) }, part10: { bestD4: path(p10), avgD4: path(p10avg) } };
if (!process.env.DIAG_SKIP_REAL) {
  real = realWorld();
  const ref = existsSync(join(ROOT, 'reports/development-feedback-10-seasons.json')) ? (JSON.parse(readFileSync(join(ROOT, 'reports/development-feedback-10-seasons.json'), 'utf8')) as { hashes: { evolution: string } }).hashes.evolution : null;
  const sameWorld = ref === real.evoHash;
  const { devs, seasons, info } = real;
  const maxOf = (d: PlayerDevelopment) => Math.max(d.strengthBase, ...d.history.map((h) => h.to));
  const ids = [...devs.keys()].sort();
  const hit1 = ids.filter((id) => devs.get(id)!.history.some((h) => h.to === 1));
  const byDelta = [...ids].sort((a, b) => devs.get(a)!.strengthCurrent - devs.get(a)!.strengthBase - (devs.get(b)!.strengthCurrent - devs.get(b)!.strengthBase) || a.localeCompare(b));
  const drops = byDelta.slice(0, 20);
  const gains = [...byDelta].reverse().slice(0, 20);
  const elite = ids.filter((id) => maxOf(devs.get(id)!) >= 46);
  const got49 = ids.filter((id) => devs.get(id)!.history.some((h) => h.to === 49 && h.from === 48));
  const at49 = ids.filter((id) => maxOf(devs.get(id)!) >= 49);
  const forty = ids.filter((id) => devs.get(id)!.strengthBase >= 40);
  const line = (id: string) => {
    const d = devs.get(id)!, i = info.get(id)!, ss = (seasons.get(id) ?? []).sort((a, b) => a.s - b.s);
    const clubs = [...new Set(ss.map((x) => x.club))];
    const transfers = ss.filter((x, k) => k > 0 && x.club !== ss[k - 1].club).length;
    const evol = ss.map((x) => `T${x.s} D${x.div} ${x.minutes}′ ${x.end}${x.champion ? '🏆' : ''}`).join(' · ');
    return `| ${i.name} | ${i.pos} | ${i.age0}→${ss.at(-1)?.age ?? i.age0} | ${d.strengthBase} | ${d.strengthBase}→${d.strengthCurrent} (pico ${maxOf(d)}) | ${clubs.length} | ${ss.reduce((a, x) => a + x.apps, 0)} | ${ss.reduce((a, x) => a + x.minutes, 0)} | ${ss.filter((x) => x.champion).length} | ${transfers} | ${ss.reduce((a, x) => a + x.injured, 0)} | ${evol} |`;
  };
  const table = (title: string, list: string[], note = '') => {
    L.push(`### ${title} (${list.length})`, '', ...(note ? [note, ''] : []));
    if (!list.length) { L.push('— nenhum.', ''); return; }
    L.push(...H(['Nome', 'pos.', 'idade ini→fim', 'base', 'atual ini→fim', 'clubes', 'jogos', 'minutos', 'títulos', 'transf.', 'rodadas lesionado', 'evolução (temporada: divisão, minutos, força no fim; 🏆 campeão da divisão)']));
    for (const id of list) L.push(line(id));
    L.push('');
  };
  L.push('## 5. Casos reais (mundo B da DEV-INTEGRATION-0.2)', '', `Mundo B refeito com a mesma seed e a mesma composição. Hash de evolução ${sameWorld ? '**idêntico** ao do relatório da 0.2' : `**DIFERENTE** do relatório da 0.2 (${ref ?? 'sem referência'})`} (\`${real.evoHash.slice(0, 16)}…\`). Seleção: não existe no jogo (coluna omitida). Títulos = campeão da própria divisão.`, '');
  // perfil de quem chega a 1
  const h1 = hit1.map((id) => ({ id, d: devs.get(id)!, ss: seasons.get(id) ?? [] }));
  const ageAt1 = h1.map(({ d, ss }) => { const s = d.history.find((h) => h.to === 1)!.season; return ss.find((x) => x.s === s)?.age ?? NaN; });
  const reasons = new Map<string, number>(); for (const { d } of h1) for (const h of d.history.filter((x) => x.to < x.from)) reasons.set(h.reason, (reasons.get(h.reason) ?? 0) + 1);
  const minutesPerSeason = h1.flatMap(({ ss }) => ss.map((x) => x.minutes));
  L.push(`**Perfil de quem chegou a 1:** strengthBase ${h1.map((x) => x.d.strengthBase).sort((a, b) => a - b).join(', ')}; idade ao chegar a 1: média ${f1(mean(ageAt1))} (mín. ${Math.min(...ageAt1)}, máx. ${Math.max(...ageAt1)}); divisões: ${[...new Set(h1.flatMap(({ ss }) => ss.map((x) => `D${x.div}`)))].sort().join(', ')}; minutos por temporada: média ${f1(mean(minutesPerSeason))}, temporadas com 0 minutos ${minutesPerSeason.filter((m) => m === 0).length} de ${minutesPerSeason.length}. Motivos das quedas (todas as quedas desses jogadores): ${[...reasons].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('; ')}.`, '');
  json.real = { sameWorldAsIntegration02: sameWorld, evolutionHash: real.evoHash, hit1: hit1.length, ageAt1, reasons: Object.fromEntries(reasons), lists: { hit1, drops, gains, elite, got49, at49, forty }, players: Object.fromEntries([...new Set([...hit1, ...drops, ...gains, ...elite, ...at49, ...forty])].map((id) => [id, { ...info.get(id), base: devs.get(id)!.strengthBase, current: devs.get(id)!.strengthCurrent, seasons: seasons.get(id) }])) };
  table('Todos que chegaram a 1', hit1);
  table('Top 20 maiores quedas (atual − base)', drops);
  table('Top 20 maiores ganhos (atual − base)', gains);
  table('Todos que chegaram a 46+ (base ou desenvolvimento)', elite);
  table('Quem chegou a 49 por ganho (48 → 49)', got49, at49.length ? `Jogadores que estiveram em 49 ou 50 em algum momento (inclui quem já nasceu assim): ${at49.length}.` : '');
  L.push(`### Jogadores que começaram com 40+ (${forty.length})`, '', `Resumo: final médio ${f2(mean(forty.map((id) => devs.get(id)!.strengthCurrent)))} (base média ${f2(mean(forty.map((id) => devs.get(id)!.strengthBase)))}); subiram ${forty.filter((id) => devs.get(id)!.strengthCurrent > devs.get(id)!.strengthBase).length}, iguais ${forty.filter((id) => devs.get(id)!.strengthCurrent === devs.get(id)!.strengthBase).length}, caíram ${forty.filter((id) => devs.get(id)!.strengthCurrent < devs.get(id)!.strengthBase).length}; pico acima da base em algum momento: ${forty.filter((id) => maxOf(devs.get(id)!) > devs.get(id)!.strengthBase).length}; maior pico ganho ${sg(Math.max(...forty.map((id) => maxOf(devs.get(id)!) - devs.get(id)!.strengthBase)))}. Lista completa no JSON; tabela:`, '');
  L.push(...H(['Nome', 'pos.', 'idade ini→fim', 'base', 'atual ini→fim', 'clubes', 'jogos', 'minutos', 'títulos', 'transf.', 'rodadas lesionado', 'evolução']));
  for (const id of forty) L.push(line(id));
  L.push('');
}

L.push('## 6. Diagnóstico final (Parte 11)', '', ...H(['#', 'Pergunta', 'Resposta', 'Evidência']));
const ANS: [string, string, string][] = [
  ['Existe caminho legítimo até 50?', 'NÃO', `nenhum cenário sintético chega a 50; no mundo real ninguém passou de 46 por ganho (0 chegaram a 49 por ganho)`],
  ['50 está excessivamente fácil?', 'NÃO', 'é inalcançável por desenvolvimento'],
  ['50 está excessivamente difícil?', 'SIM', `limite de ganho máximo ${developmentCeiling(D1_CTX, 20, CFG)} (20 anos) / ${developmentCeiling(D1_CTX, 21, CFG)} (21–24) no melhor clube da D1`],
  ['Existe bloqueio estrutural?', 'SIM', `limite = contexto + margem, contexto = 50% clube + 50% divisão (D1 ${f2(ENV[1].level)} puxa para baixo); elenco inteiro de 50 dá limite ${developmentCeiling(contextLevel({ environmentLevel: 50, divisionLevel: D1.div }, CFG), 20, CFG)}`],
  ['A Seleção pode ser acelerador de elite sem quebrar o sistema?', 'SIM', 'a sonda dá no máximo +1 em 10 anos (sem explosão); para acelerar de fato precisa de uma entrada de contexto de elite — nada no engine'],
  ['Força 1 aparece em excesso?', 'NÃO', 'cauda de jogadores com base 3–9 (nenhum com base ≥ 10), 25–36 anos, D3/D4; ver concentração registrada na 0.2'],
  ['Principal causa da força 1', 'INTERAÇÃO', 'base ≤ 9 + inatividade (maior parte das quedas) + idade'],
  ['Precisamos de piso?', 'NÃO', 'o mínimo absoluto 1 já é invariante; ninguém com base razoável chega a 1'],
  ['Precisamos alterar idade?', 'NÃO', 'veterano excelente se mantém até ~35; ruim cai ~1/ano'],
  ['Precisamos alterar inatividade?', 'NÃO', 'limite conjunto −0,75/temporada; jovem ≤ 22 sem minutos não perde'],
  ['Precisamos alterar performance?', 'NÃO', 'o rendimento existe e é descartado NO LIMITE; o problema é o limite'],
  ['A arquitetura suporta Seleção sem modificar o Engine 0.2.0?', 'SIM', 'o engine joga qualquer Fixture; Seleção = camadas novas de jogo (docs/NATIONAL-TEAM.md)'],
];
ANS.forEach(([q, a, e], i) => L.push(`| ${i + 1} | ${q} | **${a}** | ${e} |`));
L.push('', '## 7. Problemas', '', '- **50 inalcançável por desenvolvimento** (bloqueio do limite contextual com 50% da divisão).', '- **Sem o bloqueio, 50 fica fácil demais** (sonda: 45 → 50 em 3 temporadas): só remover o peso da divisão não serve.', '- **Títulos e seleção não têm canal** na fórmula; títulos só pesam via vitórias (+0,2 por jogo).', '- **Rendimento de elite descartado** no limite (~3 pontos por temporada para o melhor perfil).', '- **Cauda da força 1** em jogadores de base 3–9 sem minutos por anos (registrada, não corrigida).', '- `deserializeCareer` não valida faixas de um save adulterado (não produz valor inválido; registrado).', '');
L.push('## 8. Recomendações e decisão sugerida para DEV-PROTO-0.5', '', '1. **Faixa de elite (46–50) separada do limite contextual atual:** acima de 45, o ganho exige excelência sustentada POR TEMPORADA (titular ≥ 70% dos minutos, rendimento alto) e é no máximo +1 por temporada; o peso da divisão continua valendo abaixo dela.', '2. **Aceleradores de elite** (títulos, destaque individual, Seleção): reduzem quantas temporadas excelentes são necessárias, nunca dão força direta; a Seleção entra como evidência de partida com contexto de elite.', '3. **Metas a medir** antes de aceitar: 45 → 50 em 4–6 temporadas excepcionais com títulos e Seleção; mais lento sem Seleção; nunca para médio, reserva ou D2–D4; ≤ 5 jogadores em 50 por década no mundo.', '4. **Não mexer** em idade, inatividade, rendimento, piso ou strengthBase; reavaliar a cauda da força 1 depois.', '5. Nada disso implementado nesta etapa.', '');
mkdirSync(join(ROOT, 'reports'), { recursive: true });
writeFileSync(join(ROOT, 'reports/development-diagnostic-05.md'), L.join('\n'));
writeFileSync(join(ROOT, 'reports/development-diagnostic-05.json'), JSON.stringify(json));
console.log(L.join('\n'));
