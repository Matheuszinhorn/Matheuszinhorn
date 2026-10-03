// DIAGNÓSTICO da DEV-PROTO-0.3 (variantes A, B, C): decomposição da variação de força em idade, inatividade,
// rendimento e ambiente/divisão. NÃO altera fórmula, NÃO cria variante, NÃO integra. Só observa.
// Mesmo mundo das validações anteriores (seed elite-dev-world-10, 10 temporadas, 15.200 partidas do Engine 0.2.0);
// um mundo de controle sem observador confirma que os placares são idênticos.
//
// Decomposição exata por rodada (a soma bate com roundPoints().points; o script confere):
//   idade        = desenvolvimento bruto pela idade (minutos × tendência ≥ 0) + envelhecimento (tendência < 0, como aplicado)
//   rendimento   = minutos × peso × rendimento da partida (bruto, sem o fator de oportunidade)
//   inatividade  = perda por rodadas paradas (já com o limite da variante)
//   ambiente     = (ganho efetivamente recebido) − (desenvolvimento bruto + rendimento bruto): o efeito do contexto
//                  (elenco + divisão) e do limite contextual sobre o ganho; nunca soma força sozinho
// Por temporada: soma dos pontos de cada componente (1 ponto ≈ 1 de força) e a variação real de strengthCurrent;
// a diferença (acúmulo entre temporadas, passos inteiros, limite 1–50) aparece como "resíduo".
// Contrafactuais "só idade" e "só inatividade": a mesma mecânica de janela (±1 a cada 5 rodadas, sobra ≤ 0,99) aplicada
// só ao componente, sobre os pontos medidos na trajetória real (aproximação registrada no relatório).
// Uso: node scripts/diagnose-development-v03.ts  →  reports/development-diagnosis-inactivity-age.md
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRound, roundResults, simulateRound, type Player, type World } from '../engine/index.ts';
import { careerOffers, isSeasonOver, type CareerState } from '../game/career.ts';
import { newManagedCareer } from '../game/manager/actions.ts';
import { finishManagedRound, planManagedRound, startManagedSeason } from '../game/manager/flow.ts';
import { curveAt, devProto03, developRound, environmentLevel, matchPerformance, newDevelopment, roundPoints, type DevelopmentConfig, type DevPosition, type MatchEvidence, type PlayerDevelopment } from '../game/development/development.ts';
import { evidenceFromMatch } from '../game/development/evidence.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 'elite-dev-world-10';
const SEASONS = 10;
const ROUNDS = 38;
const POS: Record<Player['position'], DevPosition> = { GK: 'GOL', DEF: 'DEF', MID: 'MEI', ATT: 'ATA' };
const VARIANTS: { key: 'A' | 'B' | 'C'; cfg: DevelopmentConfig }[] = (['A', 'B', 'C'] as const).map((k) => ({ key: k, cfg: devProto03(k) }));
const COMP = ['dev', 'aging', 'perf', 'idle', 'env'] as const;
type Comp = (typeof COMP)[number];
type Pts = Record<Comp, number>;
const zero = (): Pts => ({ dev: 0, aging: 0, perf: 0, idle: 0, env: 0 });

/** mini-acumulador com a mesma mecânica de janela da DEV-PROTO (para os contrafactuais) */
interface Acc { s: number; p: number }
function accStep(a: Acc, pts: number, ceiling: number, round: number, cfg: DevelopmentConfig): Acc {
  const upper = a.s >= ceiling ? 0 : cfg.accumulatorCap;
  let p = Math.max(-cfg.accumulatorCap, Math.min(upper, a.p + pts));
  let s = a.s;
  if (round % cfg.windowRounds === 0 || round === cfg.seasonRounds) {
    let step = p >= 1 ? 1 : p <= -1 ? -1 : 0;
    if (step === 1 && s >= ceiling) step = 0;
    const to = Math.max(1, Math.min(50, s + step));
    if (to !== s) { p -= step; s = to; }
    p = Math.max(-0.99, Math.min(0.99, p));
  }
  return { s, p };
}

interface Line { age: number; minutes: number; apps: number; clubDiv: number | null; start: number; end: number; pts: Pts; total: number; agingFull: number; cfAge: { start: number; end: number }; cfIdle: { start: number; end: number }; cfAging: { start: number; end: number } }
interface PState { hitAge: number | null; zeroSeasonsAtHit: number; dev: PlayerDevelopment; cfAge: Acc; cfIdle: Acc; cfAging: Acc; lines: Map<number, Line>; hit1: number | null; cumAtHit: Pts | null; cum: Pts; cfAgeHit1: boolean; cfIdleHit1: boolean; cfAgingHit1: boolean }

const divisionOf = (w: World, clubId: string | null) => (clubId ? (w.divisions.find((d) => d.id === w.clubs[clubId]?.divisionId)?.level ?? null) : null);

function run(observe: boolean) {
  let c: CareerState = newManagedCareer(SEED, 'Simulação', careerOffers(SEED)[0]);
  const hash = createHash('sha256');
  const info = new Map<string, { name: string; pos: DevPosition; firstAge: number; base: number }>();
  const st: Record<string, Map<string, PState>> = Object.fromEntries(VARIANTS.map((v) => [v.key, new Map()]));
  let maxErr = 0;
  const strengthOf = (k: string, w: World, id: string) => st[k].get(id)?.dev.strengthCurrent ?? w.players[id].strength;
  for (let season = 1; season <= SEASONS; season++) {
    for (let round = 1; round <= ROUNDS; round++) {
      const plan = planManagedRound(c);
      const w0 = c.world;
      const sim = simulateRound(createRound(plan.roundId, plan.seed, plan.fixtures, null));
      const results = roundResults(sim);
      for (const r of results) hash.update(`${season}|${r.matchId}|${r.homeGoals}-${r.awayGoals};`);
      if (observe) {
        const ev = new Map<string, Omit<MatchEvidence, 'injured'>>();
        for (const m of sim.matches) for (const [id, e] of evidenceFromMatch(m)) ev.set(id, e);
        for (const v of VARIANTS) {
          const env = new Map<string, number>();
          for (const [id, club] of Object.entries(w0.clubs)) env.set(id, environmentLevel(club.squad.filter((p) => w0.players[p]).map((p) => strengthOf(v.key, w0, p))));
          const div = new Map<string, number>();
          for (const d of w0.divisions) div.set(d.id, d.clubIds.reduce((a, id) => a + (env.get(id) ?? 0), 0) / Math.max(1, d.clubIds.length));
          for (const p of Object.values(w0.players)) {
            if (!p.clubId) continue;
            if (!info.has(p.id)) info.set(p.id, { name: p.name, pos: POS[p.position], firstAge: p.age, base: p.strength });
            let ps = st[v.key].get(p.id);
            if (!ps) { ps = { hitAge: null, zeroSeasonsAtHit: 0, dev: newDevelopment(p.id, p.strength), cfAge: { s: p.strength, p: 0 }, cfIdle: { s: p.strength, p: 0 }, cfAging: { s: p.strength, p: 0 }, lines: new Map(), hit1: null, cumAtHit: null, cum: zero(), cfAgeHit1: false, cfIdleHit1: false, cfAgingHit1: false }; st[v.key].set(p.id, ps); }
            const e: MatchEvidence = ev.get(p.id) ? { ...ev.get(p.id)!, injured: false } : { played: false, minutes: 0, started: false, goals: 0, saves: 0, teamGoalsFor: 0, teamGoalsAgainst: 0, redCard: false, injured: p.condition.injuryRounds > 0 };
            const ctx = { season, round, age: p.age, position: POS[p.position], environmentLevel: env.get(p.clubId) ?? 0, divisionLevel: div.get(w0.clubs[p.clubId].divisionId) ?? null, evidence: e };
            const b = roundPoints(ps.dev, ctx, v.cfg);
            // decomposição exata
            const share = e.played ? Math.max(0, Math.min(1, e.minutes / 90)) : 0;
            const trend = curveAt(v.cfg.ageTrend, p.age);
            const devRaw = share * Math.max(0, trend);
            const perfRaw = share * v.cfg.performanceWeight * matchPerformance(e, POS[p.position]);
            const pts: Pts = { dev: devRaw, aging: b.aging, perf: perfRaw, idle: b.idle, env: b.age + b.performance - (devRaw + perfRaw) };
            maxErr = Math.max(maxErr, Math.abs(pts.dev + pts.aging + pts.perf + pts.idle + pts.env - b.points));
            let l = ps.lines.get(season);
            if (!l) { l = { age: p.age, minutes: 0, apps: 0, clubDiv: divisionOf(w0, p.clubId), start: ps.dev.strengthCurrent, end: ps.dev.strengthCurrent, pts: zero(), total: 0, agingFull: 0, cfAge: { start: ps.cfAge.s, end: ps.cfAge.s }, cfIdle: { start: ps.cfIdle.s, end: ps.cfIdle.s }, cfAging: { start: ps.cfAging.s, end: ps.cfAging.s } }; ps.lines.set(season, l); }
            for (const k of COMP) { l.pts[k] += pts[k]; ps.cum[k] += pts[k]; }
            l.total += b.points;
            l.agingFull += Math.min(0, trend); // envelhecimento "cheio" (sem compensação, como se não jogasse) — referência
            if (e.played) { l.minutes += e.minutes; l.apps++; }
            ps.dev = developRound(ps.dev, ctx, v.cfg);
            l.end = ps.dev.strengthCurrent;
            ps.cfAge = accStep(ps.cfAge, pts.dev + pts.aging, b.ceiling, round, v.cfg);
            ps.cfIdle = accStep(ps.cfIdle, pts.idle, b.ceiling, round, v.cfg);
            ps.cfAging = accStep(ps.cfAging, pts.aging, b.ceiling, round, v.cfg);
            l.cfAge.end = ps.cfAge.s; l.cfIdle.end = ps.cfIdle.s; l.cfAging.end = ps.cfAging.s;
            if (ps.dev.strengthCurrent === 1 && ps.hit1 === null && ps.dev.strengthBase > 1) { ps.hit1 = season; ps.cumAtHit = { ...ps.cum }; ps.hitAge = p.age; ps.zeroSeasonsAtHit = [...ps.lines.values()].filter((x) => x.minutes === 0).length; }
            if (ps.cfAge.s === 1 && ps.dev.strengthBase > 1) ps.cfAgeHit1 = true;
            if (ps.cfIdle.s === 1 && ps.dev.strengthBase > 1) ps.cfIdleHit1 = true;
            if (ps.cfAging.s === 1 && ps.dev.strengthBase > 1) ps.cfAgingHit1 = true;
          }
        }
      }
      c = finishManagedRound(c, results, sim.matches).career;
    }
    if (!isSeasonOver(c)) throw new Error('temporada incompleta');
    if (season < SEASONS) c = startManagedSeason(c).career;
  }
  return { hash: hash.digest('hex'), info, st, maxErr };
}

const t0 = Date.now();
const control = run(false);
const obs = run(true);
console.error(`diagnóstico: ${Math.round((Date.now() - t0) / 1000)}s`);

// ---------- análise ----------
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const f1 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') : '–');
const f2 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') : '–');
const sg = (v: number) => (!Number.isFinite(v) ? '–' : v > 0 ? `+${v}` : `${v}`);
const H = (cols: string[]) => [`| ${cols.join(' | ')} |`, `|${cols.map((_, i) => (i ? '---:' : '---')).join('|')}|`];
const usage = (l: Line) => { const s = l.minutes / (ROUNDS * 90); return l.minutes === 0 ? 'zero minutos' : s >= 0.7 ? 'titular frequente' : s >= 0.4 ? 'titular parcial' : 'reserva'; };
const USAGE = ['titular frequente', 'titular parcial', 'reserva', 'zero minutos'];
const band = (a: number) => (a <= 20 ? '18–20' : a <= 23 ? '21–23' : a <= 27 ? '24–27' : a <= 30 ? '28–30' : a <= 33 ? '31–33' : '34–36');
const BANDS = ['18–20', '21–23', '24–27', '28–30', '31–33', '34–36'];
const linesOf = (k: string) => [...obs.st[k].entries()].flatMap(([id, ps]) => [...ps.lines.entries()].map(([season, l]) => ({ id, season, l })));
const idade = (l: Line) => l.pts.dev + l.pts.aging;
type Row = ReturnType<typeof linesOf>[number];
const avg = (g: Row[], f: (l: Line) => number) => f1(mean(g.map((r) => f(r.l))));

const L: string[] = ['# Diagnóstico DEV-PROTO-0.3 — inatividade × idade', '', '> **Este diagnóstico não altera a fórmula e não representa uma decisão de calibração.**', '> DEV-PROTO-0.3 continua NÃO integrada e isolada. Nenhuma variante nova foi criada.', ''];
L.push('## Método', '');
L.push(`- Mesmo mundo das validações anteriores: seed \`${SEED}\`, ${SEASONS} temporadas, ${SEASONS * ROUNDS * 40} partidas reais do Engine 0.2.0. Variantes analisadas: 0.3-A, 0.3-B, 0.3-C (sem nenhuma mudança).`);
L.push(`- Controle sem observador × observado: hash dos placares **${control.hash === obs.hash ? 'idêntico' : 'DIFERENTE'}** (\`${control.hash.slice(0, 16)}…\`).`);
L.push(`- Decomposição exata por rodada: idade (desenvolvimento + envelhecimento) + rendimento + inatividade + ambiente = pontos da fórmula. Maior diferença encontrada entre a soma e roundPoints(): ${obs.maxErr.toExponential(1)}.`);
L.push('- Unidade: pontos de desenvolvimento por temporada (1 ponto ≈ 1 de força). A variação real de strengthCurrent é inteira e acontece em janelas; a diferença para a soma dos pontos fica no "resíduo" (acúmulo entre temporadas, passos inteiros, limites 1–50).');
L.push('- "Ambiente" = efeito do contexto (elenco + divisão) e do limite contextual sobre o ganho: quanto do desenvolvimento e do rendimento brutos o jogador NÃO recebeu (≤ 0). Ele nunca soma força sozinho.');
L.push('- Contrafactuais "só idade" / "só inatividade": mesma mecânica de janela aplicada só ao componente, sobre os pontos medidos na trajetória real (aproximação: na trajetória real, a força e portanto a oportunidade seriam outras).', '');

for (const v of VARIANTS) {
  const rows = linesOf(v.key);
  L.push(`## Variante 0.3-${v.key}`, '');
  L.push('### Componentes por faixa de idade e utilização (pontos por temporada; entre parênteses: variação real média de strengthCurrent)', '');
  L.push(...H(['Uso · idade', 'linhas', 'desenv. (idade)', 'envelhec. (idade)', 'idade total', 'inatividade', 'rendimento', 'ambiente', 'total', 'variação real']));
  for (const u of USAGE) for (const b of BANDS) {
    const g = rows.filter((r) => usage(r.l) === u && band(r.l.age) === b);
    if (!g.length) continue;
    L.push(`| ${u} · ${b} | ${g.length} | ${avg(g, (l) => l.pts.dev)} | ${avg(g, (l) => l.pts.aging)} | ${avg(g, idade)} | ${avg(g, (l) => l.pts.idle)} | ${avg(g, (l) => l.pts.perf)} | ${avg(g, (l) => l.pts.env)} | ${avg(g, (l) => l.total)} | ${avg(g, (l) => l.end - l.start)} |`);
  }
  L.push('', '### Por idade (todas as utilizações)', '', ...H(['Idade', 'linhas', 'idade total', 'envelhec.', 'inatividade', 'rendimento', 'ambiente', 'variação real']));
  for (let a = 17; a <= 36; a++) {
    const g = rows.filter((r) => r.l.age === a);
    if (g.length) L.push(`| ${a} | ${g.length} | ${avg(g, idade)} | ${avg(g, (l) => l.pts.aging)} | ${avg(g, (l) => l.pts.idle)} | ${avg(g, (l) => l.pts.perf)} | ${avg(g, (l) => l.pts.env)} | ${avg(g, (l) => l.end - l.start)} |`);
  }
  L.push('');
}

// ---------- respostas ----------
L.push('## Respostas (com evidência)', '');
const Q = (n: number, t: string, body: string[]) => L.push(`### ${n}. ${t}`, '', ...body, '');
const perV = (f: (k: 'A' | 'B' | 'C', rows: Row[]) => string) => VARIANTS.map((v) => `- **${v.key}:** ${f(v.key, linesOf(v.key))}`);
Q(1, 'Quanto a idade sozinha reduz por temporada?', [
  'Envelhecimento (parte negativa da idade), média por temporada, por faixa e por uso (titular frequente / zero minutos):', '',
  ...H(['Idade', ...VARIANTS.flatMap((v) => [`${v.key} titular`, `${v.key} 0 min`])]),
  ...BANDS.map((b) => `| ${b} | ${VARIANTS.flatMap((v) => { const g = linesOf(v.key).filter((r) => band(r.l.age) === b); return [avg(g.filter((r) => usage(r.l) === 'titular frequente'), (l) => l.pts.aging), avg(g.filter((r) => usage(r.l) === 'zero minutos'), (l) => l.pts.aging)]; }).join(' | ')} |`),
  '', 'O envelhecimento começa aos 29 anos (tendência < 0) e cresce com a idade: o máximo teórico sem compensação é a curva × 38 rodadas (−0,8 aos 32; −1,5 aos 35; −2,3 aos 38).',
]);
Q(2, 'Quanto a inatividade sozinha reduz por temporada?', perV((k, rows) => {
  const g = rows.filter((r) => usage(r.l) === 'zero minutos');
  return `zero minutos: média ${f2(mean(g.map((r) => r.l.pts.idle)))} por temporada (mín. ${f2(Math.min(...g.map((r) => r.l.pts.idle)))}); reserva: ${f2(mean(rows.filter((r) => usage(r.l) === 'reserva').map((r) => r.l.pts.idle)))}.`;
}));
Q(3, 'Existe interação entre idade e ausência de minutos?', [
  'Envelhecimento médio de quem tem zero minutos menos o de titular frequente na mesma faixa (negativo = quem não joga envelhece mais):', '',
  ...H(['Idade', ...VARIANTS.map((v) => v.key)]),
  ...BANDS.slice(3).map((b) => `| ${b} | ${VARIANTS.map((v) => { const g = linesOf(v.key).filter((r) => band(r.l.age) === b); return f2(mean(g.filter((r) => usage(r.l) === 'zero minutos').map((r) => r.l.pts.aging)) - mean(g.filter((r) => usage(r.l) === 'titular frequente').map((r) => r.l.pts.aging))); }).join(' | ')} |`),
  '', 'A interação vem da regra: quem joga bem compensa até 70% do envelhecimento da rodada; quem não joga recebe o envelhecimento inteiro (A, B) ou nenhum (C). Nas variantes A e B, a idade e a inatividade se SOMAM para quem não joga.',
]);
Q(4, 'O componente de idade é diferente para titular e reserva?', [
  ...H(['Idade', ...VARIANTS.flatMap((v) => USAGE.map((u) => `${v.key} ${u.split(' ')[0]}${u.includes('parcial') ? ' parc.' : ''}`))]),
  ...BANDS.map((b) => `| ${b} | ${VARIANTS.flatMap((v) => USAGE.map((u) => avg(linesOf(v.key).filter((r) => band(r.l.age) === b && usage(r.l) === u), idade))).join(' | ')} |`),
  '', '"Idade" = desenvolvimento pela idade (só com minutos) + envelhecimento. Até 28 anos, a diferença é o desenvolvimento, que só existe com minutos; depois dos 29, é o envelhecimento compensado pelo rendimento.',
]);
Q(5, 'O rendimento consegue compensar a idade?', perV((k, rows) => {
  const g = rows.filter((r) => r.l.age >= 31 && usage(r.l) === 'titular frequente');
  const full = mean(g.map((r) => r.l.agingFull));
  return `titulares frequentes 31–36: envelhecimento potencial ${f2(full)} → aplicado ${f2(mean(g.map((r) => r.l.pts.aging)))} (compensação ${f1((100 * (1 - mean(g.map((r) => r.l.pts.aging)) / full)))}%); rendimento ${f2(mean(g.map((r) => r.l.pts.perf)))}; ambiente ${f2(mean(g.map((r) => r.l.pts.env)))}; variação real ${f2(mean(g.map((r) => r.l.end - r.l.start)))}. Compensação parcial, nunca total.`;
}));
Q(6, 'A partir de qual idade a queda passa a dominar?', perV((k, rows) => {
  const first = (u: string) => { for (let a = 18; a <= 36; a++) { const g = rows.filter((r) => r.l.age === a && usage(r.l) === u); if (g.length >= 20 && mean(g.map((r) => r.l.end - r.l.start)) < 0) return a; } return null; };
  const all = (() => { for (let a = 18; a <= 36; a++) { const g = rows.filter((r) => r.l.age === a); if (g.length >= 20 && mean(g.map((r) => r.l.end - r.l.start)) < 0) return a; } return null; })();
  return `todos: ${all ?? 'nunca'} anos; titular frequente: ${first('titular frequente') ?? 'nunca'}; reserva: ${first('reserva') ?? 'nunca'}; zero minutos: ${first('zero minutos') ?? 'nunca'} (1ª idade com variação real média negativa, mínimo de 20 linhas).`;
}));
Q(7, 'Maior queda anual atribuível à idade', perV((k, rows) => {
  const w = rows.reduce((a, r) => (r.l.pts.aging < a.l.pts.aging ? r : a));
  return `${f2(w.l.pts.aging)} pontos de envelhecimento numa temporada (${obs.info.get(w.id)?.name}, ${w.l.age} anos, ${usage(w.l)}, ${w.l.start} → ${w.l.end}).`;
}));
Q(8, 'Maior queda anual atribuível à inatividade', perV((k, rows) => {
  const w = rows.reduce((a, r) => (r.l.pts.idle < a.l.pts.idle ? r : a));
  return `${f2(w.l.pts.idle)} pontos de inatividade numa temporada (${obs.info.get(w.id)?.name}, ${w.l.age} anos, ${w.l.start} → ${w.l.end}).`;
}));
const hits = (k: string) => [...obs.st[k].values()].filter((p) => p.hit1 !== null);
Q(9, 'Quantos chegam a 1 por causa da idade?', perV((k) => { const h = hits(k); const byAge = h.filter((p) => p.cumAtHit!.aging <= p.cumAtHit!.idle); return `${h.length} chegaram a 1; em ${byAge.length} o envelhecimento acumulado até chegar a 1 foi a maior perda.`; }));
Q(10, 'Quantos chegam a 1 por causa da inatividade?', perV((k) => { const h = hits(k); const byIdle = h.filter((p) => p.cumAtHit!.idle < p.cumAtHit!.aging); return `${byIdle.length} de ${h.length} (a inatividade acumulada foi a maior perda até chegar a 1). Envelhecimento médio acumulado ${f1(mean(h.map((p) => p.cumAtHit!.aging)))}, inatividade ${f1(mean(h.map((p) => p.cumAtHit!.idle)))}.`; }));
L.push('Perfil de quem chega a 1 (força inicial, idade ao chegar a 1, temporadas sem minutos até então):', '', ...H(['Variante', 'chegaram a 1', 'força inicial média', 'força inicial ≤ 10', 'força inicial 11–15', 'força inicial 16+', 'idade média ao chegar', 'chegaram com < 29 anos', 'temporadas sem minutos (média)']));
for (const v of VARIANTS) {
  const h = hits(v.key);
  const b = h.map((p) => p.dev.strengthBase);
  L.push(`| ${v.key} | ${h.length} | ${f1(mean(b))} | ${b.filter((x) => x <= 10).length} | ${b.filter((x) => x > 10 && x <= 15).length} | ${b.filter((x) => x > 15).length} | ${f1(mean(h.map((p) => p.hitAge ?? NaN)))} | ${h.filter((p) => (p.hitAge ?? 99) < 29).length} | ${f1(mean(h.map((p) => p.zeroSeasonsAtHit)))} |`);
}
const startWeak = (k: string) => [...obs.st[k].values()].filter((p) => p.dev.strengthBase <= 10).length;
L.push('', `Jogadores com força inicial ≤ 10 no mundo (todos os registrados): ${startWeak('A')}.`, '');
Q(11, 'Quantos chegariam a 1 se apenas o componente de idade fosse aplicado?', perV((k) => { const ps = [...obs.st[k].values()]; return `idade total (desenvolvimento + envelhecimento): ${ps.filter((p) => p.cfAgeHit1).length}; só envelhecimento: ${ps.filter((p) => p.cfAgingHit1).length}.`; }));
Q(12, 'Quantos chegariam a 1 se apenas o componente de inatividade fosse aplicado?', perV((k) => `${[...obs.st[k].values()].filter((p) => p.cfIdleHit1).length}.`));

// ---------- jogadores nomeados ----------
L.push('## Jogadores acompanhados', '', 'Por temporada: idade, minutos, força inicial e final, e pontos de cada componente (Δ ≈ força). O resíduo (acúmulo/passos inteiros) é a diferença entre a variação real e a soma.', '');
// perfil citado nos relatórios anteriores (posição, idade no início, força inicial): resolve homônimos sem ambiguidade
const NAMES: [string, DevPosition, number, number][] = [['Breno Bragança Almeida', 'GOL', 23, 35], ['Henrique Jardim', 'MEI', 32, 26], ['Luan Gomes', 'DEF', 27, 32], ['Gabriel Macedo', 'GOL', 27, 25], ['Igor Duarte', 'MEI', 19, 13], ['Caio Toledo Freitas', 'ATA', 21, 48]];
for (const [name, pos, age0, base0] of NAMES) {
  const ids = [...obs.info.entries()].filter(([, i]) => i.name === name).map(([id]) => id);
  const match = ids.filter((x) => { const i = obs.info.get(x)!; return i.pos === pos && i.firstAge === age0 && i.base === base0; });
  if (!match.length) { L.push(`### ${name}`, '', `— perfil citado (${pos}, ${age0} anos, força ${base0}) não encontrado; homônimos: ${ids.length}.`, ''); continue; }
  const id = match[0];
  const i = obs.info.get(id)!;
  L.push(`### ${name} (${i.pos}, ${i.firstAge} anos no início, força inicial ${i.base}${ids.length > 1 ? `; ${ids.length} homônimos, mostrado ${id}` : ''})`, '');
  for (const v of VARIANTS) {
    const ps = obs.st[v.key].get(id)!;
    L.push(`**0.3-${v.key}**`, '', ...H(['T', 'idade', 'minutos', 'força inicial', 'Δ idade (des. + envelh.)', 'Δ inatividade', 'Δ rendimento', 'Δ ambiente', 'resíduo', 'força final']));
    for (const [s, l] of [...ps.lines.entries()].sort((a, b) => a[0] - b[0])) {
      const sum = l.pts.dev + l.pts.aging + l.pts.idle + l.pts.perf + l.pts.env;
      L.push(`| ${s} | ${l.age} | ${l.minutes} | ${l.start} | ${f2(l.pts.dev + l.pts.aging)} (${f2(l.pts.dev)} ${f2(l.pts.aging)}) | ${f2(l.pts.idle)} | ${f2(l.pts.perf)} | ${f2(l.pts.env)} | ${f2(l.end - l.start - sum)} | ${l.end} |`);
    }
    L.push('');
  }
}

// ---------- grupos específicos ----------
L.push('## Grupos específicos (média por temporada)', '', ...H(['Grupo', 'variante', 'linhas', 'desenv.', 'envelhec.', 'inatividade', 'rendimento', 'ambiente', 'variação real']));
const GROUPS: [string, (l: Line) => boolean][] = [
  ['jovem (≤ 23) sem minutos', (l) => l.age <= 23 && l.minutes === 0],
  ['jovem (≤ 23) titular frequente', (l) => l.age <= 23 && usage(l) === 'titular frequente'],
  ['veterano (≥ 31) sem minutos', (l) => l.age >= 31 && l.minutes === 0],
  ['veterano (≥ 31) titular frequente', (l) => l.age >= 31 && usage(l) === 'titular frequente'],
];
for (const [label, f] of GROUPS) for (const v of VARIANTS) {
  const g = linesOf(v.key).filter((r) => f(r.l));
  L.push(`| ${label} | ${v.key} | ${g.length} | ${avg(g, (l) => l.pts.dev)} | ${avg(g, (l) => l.pts.aging)} | ${avg(g, (l) => l.pts.idle)} | ${avg(g, (l) => l.pts.perf)} | ${avg(g, (l) => l.pts.env)} | ${avg(g, (l) => l.end - l.start)} |`);
}
L.push('');

mkdirSync(join(ROOT, 'reports'), { recursive: true });
writeFileSync(join(ROOT, 'reports/development-diagnosis-inactivity-age.md'), L.join('\n'));
console.log(L.join('\n'));
