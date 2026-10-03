// VALIDAÇÃO DEV-PROTO-0.3 NO MUNDO REAL (nada integrado; engine intocado).
// Mesmo método da validação da 0.2 (scripts/simulate-development-world.ts): 10 temporadas do universo fictício, carreira
// gerenciada sem decisões manuais, 15.200 partidas reais do Engine 0.2.0.
// - CONTROLE: o mundo sem nenhuma camada de desenvolvimento observando.
// - Observadores sobre AS MESMAS partidas: DEV-PROTO-0.2 (referência) e DEV-PROTO-0.3 variantes A, B e C.
//   Os observadores só leem o MatchState e o estado da carreira; a força deles NUNCA volta ao engine, então os placares
//   são idênticos em todos os mundos (conferido por hash). Limitação: o efeito de volta não é medido.
// Uso: npm run development:world03  →  reports/development-world-10-seasons-v03.{md,json}
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRound, roundResults, simulateRound, type Player, type World } from '../engine/index.ts';
import { careerOffers, isSeasonOver, type CareerState } from '../game/career.ts';
import { newManagedCareer } from '../game/manager/actions.ts';
import { finishManagedRound, planManagedRound, startManagedSeason } from '../game/manager/flow.ts';
import { DEVELOPMENT_PROTO, devProto03, developRound, environmentLevel, newDevelopment, roundPoints, type DevelopmentConfig, type DevPosition, type MatchEvidence, type PlayerDevelopment } from '../game/development/development.ts';
import { evidenceFromMatch } from '../game/development/evidence.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 'elite-dev-world-10';
const SEASONS = 10;
const ROUNDS = DEVELOPMENT_PROTO.seasonRounds;
const POS: Record<Player['position'], DevPosition> = { GK: 'GOL', DEF: 'DEF', MID: 'MEI', ATT: 'ATA' };
const VARIANTS: { key: string; label: string; cfg: DevelopmentConfig }[] = [
  { key: '0.2', label: 'DEV-PROTO-0.2 (referência)', cfg: DEVELOPMENT_PROTO },
  { key: 'A', label: '0.3-A: inatividade ≤ −1/temporada', cfg: devProto03('A') },
  { key: 'B', label: '0.3-B: inatividade ≤ −0,5/temporada', cfg: devProto03('B') },
  { key: 'C', label: '0.3-C: sem perda por inatividade; idade só com participação', cfg: devProto03('C') },
];

// ---------- fatos do mundo (iguais para todas as variantes) ----------
interface Fact { clubId: string | null; division: number | null; age: number; minutes: number; apps: number; starts: number; injuredRounds: number; longestInjury: number }
interface Move { playerId: string; season: number; kind: 'transferencia' | 'promocao' | 'rebaixamento'; fromDiv: number | null; toDiv: number | null; at: Record<string, number>; afterFirst: Record<string, number | null> }
// ---------- estado de cada variante ----------
interface VLine { start: number; end: number; pts: { dev: number; perf: number; aging: number; idle: number } }
interface VState { devs: Map<string, PlayerDevelopment>; lines: Map<string, Map<number, VLine>>; snapshots: Record<number, Record<string, number>> }

const divisionOf = (w: World, clubId: string | null) => (clubId ? (w.divisions.find((d) => d.id === w.clubs[clubId]?.divisionId)?.level ?? null) : null);

function run(observe: boolean) {
  let c: CareerState = newManagedCareer(SEED, 'Simulação', careerOffers(SEED)[0]);
  const hash = createHash('sha256');
  const facts = new Map<string, Map<number, Fact>>();
  const first = new Map<string, { season: number; age: number; base: number; position: DevPosition; name: string }>();
  const retired = new Map<string, number>();
  const moves: Move[] = [];
  const streak = new Map<string, number>();
  const states: Record<string, VState> = Object.fromEntries(VARIANTS.map((v) => [v.key, { devs: new Map(), lines: new Map(), snapshots: {} }]));
  let last = new Map<string, { club: string | null; div: number | null }>();

  const strengthIn = (st: VState, w: World, id: string) => st.devs.get(id)?.strengthCurrent ?? w.players[id].strength;
  const envs = (st: VState, w: World) => {
    const env = new Map<string, number>();
    for (const [id, club] of Object.entries(w.clubs)) env.set(id, environmentLevel(club.squad.filter((p) => w.players[p]).map((p) => strengthIn(st, w, p))));
    const div = new Map<string, number>();
    for (const d of w.divisions) div.set(d.id, d.clubIds.reduce((a, id) => a + (env.get(id) ?? 0), 0) / Math.max(1, d.clubIds.length));
    return { env, div };
  };
  const register = (p: Player, season: number) => {
    if (!first.has(p.id)) first.set(p.id, { season, age: p.age, base: p.strength, position: POS[p.position], name: p.name });
    for (const v of VARIANTS) if (!states[v.key].devs.has(p.id)) states[v.key].devs.set(p.id, newDevelopment(p.id, p.strength));
  };
  const snap = (k: number, w: World) => {
    for (const v of VARIANTS) {
      const st = states[v.key];
      st.snapshots[k] = Object.fromEntries(Object.values(w.players).filter((p) => p.clubId).map((p) => [p.id, strengthIn(st, w, p.id)]));
    }
  };
  const track = (w: World, season: number, turnover: boolean) => {
    const next = new Map<string, { club: string | null; div: number | null }>();
    for (const p of Object.values(w.players)) {
      const now = { club: p.clubId, div: divisionOf(w, p.clubId) };
      next.set(p.id, now);
      const b = last.get(p.id);
      if (!b || !now.club) continue;
      const kind = b.club !== now.club ? 'transferencia' : turnover && b.div !== now.div ? ((now.div ?? 9) < (b.div ?? 9) ? 'promocao' : 'rebaixamento') : null;
      if (kind) moves.push({ playerId: p.id, season, kind, fromDiv: b.div, toDiv: now.div, at: Object.fromEntries(VARIANTS.map((v) => [v.key, strengthIn(states[v.key], w, p.id)])), afterFirst: Object.fromEntries(VARIANTS.map((v) => [v.key, null])) });
    }
    last = next;
  };

  if (observe) { for (const p of Object.values(c.world.players)) register(p, 1); snap(0, c.world); track(c.world, 1, false); }

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
        const ctxs = Object.fromEntries(VARIANTS.map((v) => [v.key, envs(states[v.key], w0)]));
        const pending = moves.filter((m) => VARIANTS.some((v) => m.afterFirst[v.key] === null));
        for (const p of Object.values(w0.players)) {
          if (!p.clubId) continue;
          register(p, season);
          const injured = p.condition.injuryRounds > 0;
          const e: MatchEvidence = ev.get(p.id) ? { ...ev.get(p.id)!, injured: false } : { played: false, minutes: 0, started: false, goals: 0, saves: 0, teamGoalsFor: 0, teamGoalsAgainst: 0, redCard: false, injured };
          // fatos
          let fs = facts.get(p.id);
          if (!fs) { fs = new Map(); facts.set(p.id, fs); }
          let f = fs.get(season);
          if (!f) { f = { clubId: p.clubId, division: divisionOf(w0, p.clubId), age: p.age, minutes: 0, apps: 0, starts: 0, injuredRounds: 0, longestInjury: 0 }; fs.set(season, f); }
          f.clubId = p.clubId; f.division = divisionOf(w0, p.clubId);
          if (e.played) { f.minutes += e.minutes; f.apps++; if (e.started) f.starts++; }
          if (injured) { f.injuredRounds++; streak.set(p.id, (streak.get(p.id) ?? 0) + 1); f.longestInjury = Math.max(f.longestInjury, streak.get(p.id)!); } else streak.set(p.id, 0);
          // cada variante
          const divId = w0.clubs[p.clubId].divisionId;
          for (const v of VARIANTS) {
            const st = states[v.key];
            const dev = st.devs.get(p.id)!;
            const ctx = { season, round, age: p.age, position: POS[p.position], environmentLevel: ctxs[v.key].env.get(p.clubId) ?? 0, divisionLevel: ctxs[v.key].div.get(divId) ?? null, evidence: e };
            const b = roundPoints(dev, ctx, v.cfg);
            let ls = st.lines.get(p.id);
            if (!ls) { ls = new Map(); st.lines.set(p.id, ls); }
            let l = ls.get(season);
            if (!l) { l = { start: dev.strengthCurrent, end: dev.strengthCurrent, pts: { dev: 0, perf: 0, aging: 0, idle: 0 } }; ls.set(season, l); }
            l.pts.dev += b.age; l.pts.perf += b.performance; l.pts.aging += b.aging; l.pts.idle += b.idle;
            const nd = developRound(dev, ctx, v.cfg);
            st.devs.set(p.id, nd);
            l.end = nd.strengthCurrent;
          }
          for (const m of pending) if (m.playerId === p.id) for (const v of VARIANTS) if (m.afterFirst[v.key] === null) m.afterFirst[v.key] = states[v.key].devs.get(p.id)!.strengthCurrent;
        }
      }
      c = finishManagedRound(c, results, sim.matches).career;
      if (observe) track(c.world, season, false);
    }
    if (!isSeasonOver(c)) throw new Error(`temporada ${season} não terminou`);
    if (observe && [1, 3, 5, 10].includes(season)) snap(season, c.world);
    if (season < SEASONS) {
      const before = new Set(Object.keys(c.world.players));
      c = startManagedSeason(c).career;
      if (observe) { for (const id of before) if (!c.world.players[id]) retired.set(id, season); track(c.world, season + 1, true); }
    }
  }
  return { hash: hash.digest('hex'), facts, first, retired, moves, states };
}

const t0 = Date.now();
const control = run(false);
const obs = run(true);
console.error(`simulação: ${Math.round((Date.now() - t0) / 1000)}s`);
const same = control.hash === obs.hash;

// ---------- estatística ----------
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const pct = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const f1 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') : '–');
const sg = (v: number) => (!Number.isFinite(v) ? '–' : v > 0 ? `+${v}` : `${v}`);
const pc = (n: number, d: number) => (d ? `${f1((100 * n) / d)}%` : '–');
const K = VARIANTS.map((v) => v.key);
const H = (cols: string[]) => [`| ${cols.join(' | ')} |`, `|${cols.map((_, i) => (i ? '---:' : '---')).join('|')}|`];
const ids = [...obs.first.keys()].sort();
const last = (st: VState, id: string) => st.devs.get(id)!.strengthCurrent;
const base = (id: string) => obs.first.get(id)!.base;
const seasonsOf = (id: string) => [...(obs.facts.get(id)?.keys() ?? [])].sort((a, b) => a - b);
const usage = (f: Fact) => { const s = f.minutes / (ROUNDS * 90); return f.minutes === 0 ? 'zero minutos' : s >= 0.7 ? 'titular frequente' : s >= 0.4 ? 'titular parcial' : 'reserva'; };
const USAGE = ['titular frequente', 'titular parcial', 'reserva', 'zero minutos'];
const ageBand = (a: number) => (a <= 20 ? '18–20' : a <= 23 ? '21–23' : a <= 27 ? '24–27' : a <= 30 ? '28–30' : a <= 33 ? '31–33' : '34–36');
const AGES = ['18–20', '21–23', '24–27', '28–30', '31–33', '34–36'];
const injBand = (f: Fact) => (f.injuredRounds === 0 ? 'sem lesão' : f.longestInjury >= 8 ? 'lesão longa (8+ rodadas)' : 'lesão curta');
const INJ = ['sem lesão', 'lesão curta', 'lesão longa (8+ rodadas)'];
// linhas jogador × temporada (fatos + variação por variante)
const rows = ids.flatMap((id) => seasonsOf(id).map((s) => ({ id, s, f: obs.facts.get(id)!.get(s)!, d: Object.fromEntries(K.map((k) => { const l = obs.states[k].lines.get(id)?.get(s); return [k, l ? l.end - l.start : 0]; })) as Record<string, number> })));

function distribution(k: string, snap: number) {
  const v = Object.values(obs.states[k].snapshots[snap] ?? {});
  return { n: v.length, media: mean(v), mediana: pct(v, 0.5), p10: pct(v, 0.1), p25: pct(v, 0.25), p75: pct(v, 0.75), p90: pct(v, 0.9), b1: v.filter((x) => x <= 10).length, b2: v.filter((x) => x >= 11 && x <= 20).length, b3: v.filter((x) => x >= 21 && x <= 30).length, b4: v.filter((x) => x >= 31 && x <= 40).length, b5: v.filter((x) => x >= 41).length, eq50: v.filter((x) => x === 50).length, eq1: v.filter((x) => x === 1).length };
}
function totals(k: string) {
  const st = obs.states[k];
  const d = ids.filter((id) => seasonsOf(id).length).map((id) => last(st, id) - base(id));
  const s0 = st.snapshots[0], s10 = st.snapshots[10];
  const both = Object.keys(s0).filter((id) => s10[id] !== undefined);
  const peak = ids.filter((id) => base(id) < 50 && [...(st.lines.get(id)?.values() ?? [])].some((l) => l.end === 50)).length;
  const floor = ids.filter((id) => base(id) > 1 && [...(st.lines.get(id)?.values() ?? [])].some((l) => l.end === 1)).length;
  return { maxGain: Math.max(...d), maxDrop: Math.min(...d), up5: d.filter((x) => x >= 5).length, down5: d.filter((x) => x <= -5).length, up10: d.filter((x) => x >= 10).length, down10: d.filter((x) => x <= -10).length, sameSet: mean(both.map((id) => s10[id] - s0[id])), sameSetN: both.length, reached50: peak, reached1: floor };
}

const L: string[] = ['# DEV-PROTO-0.3 — validação no mundo real (10 temporadas)', '', '> **DEV-PROTO-0.3 continua NÃO integrada ao jogo.** Simulação apenas: Engine 0.2.0, saves, gameplay, calendário e universo fictício intocados; nenhuma força aplicada.', ''];
L.push('## 1. Metodologia', '');
L.push(`- Universo fictício, seed \`${SEED}\`, carreira gerenciada sem decisões manuais, ${SEASONS} temporadas × ${ROUNDS} rodadas × 40 partidas = ${SEASONS * ROUNDS * 40} partidas reais do Engine 0.2.0, com a gestão da CPU, envelhecimento, aposentadoria aos 37, acesso/rebaixamento, transferências da CPU e lesões do jogo.`);
L.push(`- **Controle** (nenhuma camada observando) × **observadores** 0.2, A, B e C sobre as mesmas partidas: hash dos placares **${same ? 'idêntico' : 'DIFERENTE'}** (\`${control.hash.slice(0, 16)}…\`). A força dos observadores não volta ao engine.`);
L.push('- **Limitação registrada:** sem efeito de volta (strengthCurrent → engine → novo rendimento → novo desenvolvimento). As variantes são comparadas com os MESMOS resultados de partida.');
L.push('- Contexto 0.3 = 50% ambiente do elenco (média dos 16 mais fortes) + 50% nível da divisão (média dos ambientes dos clubes da divisão), recalculado a cada rodada; usado só na oportunidade e no limite do ganho.', '');
L.push('## 2. Variantes', '', ...H(['Variante', 'inatividade', 'idade sem jogar', 'divisão no contexto']), '| 0.2 | −0,04/rodada após 6 sem jogar, sem limite | sim | não |', '| 0.3-A | idem, no máximo −1 por temporada | sim | 50% |', '| 0.3-B | idem, no máximo −0,5 por temporada | sim | 50% |', '| 0.3-C | nenhuma perda direta | não (idade só pesa quando joga) | 50% |', '');

L.push('## 3–5. Resultados, comparação com a 0.2 e distribuição', '');
const tot = Object.fromEntries(K.map((k) => [k, totals(k)]));
L.push(...H(['Métrica (10 temporadas)', ...K]));
const tr = (label: string, f: (k: string) => string | number) => L.push(`| ${label} | ${K.map(f).join(' | ')} |`);
tr('variação média, mesmo conjunto (início e fim)', (k) => f1(tot[k].sameSet));
tr('maior ganho', (k) => sg(tot[k].maxGain));
tr('maior queda', (k) => sg(tot[k].maxDrop));
tr('+5 ou mais', (k) => tot[k].up5);
tr('−5 ou mais', (k) => tot[k].down5);
tr('+10 ou mais', (k) => tot[k].up10);
tr('−10 ou mais', (k) => tot[k].down10);
tr('chegaram a 50 (sem começar em 50)', (k) => tot[k].reached50);
tr('chegaram a 1 (sem começar em 1)', (k) => tot[k].reached1);
L.push('', `Mesmo conjunto = os ${tot['0.2'].sameSetN} jogadores em clube no início e ao fim das 10 temporadas.`, '');
for (const snapK of [0, 1, 3, 5, 10]) {
  L.push(`### ${snapK === 0 ? 'Distribuição inicial' : `Após ${snapK} temporada${snapK > 1 ? 's' : ''}`}`, '', ...H(['Variante', 'n', 'média', 'mediana', 'P10', 'P25', 'P75', 'P90', '1–10', '11–20', '21–30', '31–40', '41–50', '=50', '=1']));
  for (const k of snapK === 0 ? ['0.2'] : K) { const d = distribution(k, snapK); L.push(`| ${snapK === 0 ? 'todas' : k} | ${d.n} | ${f1(d.media)} | ${d.mediana} | ${d.p10} | ${d.p25} | ${d.p75} | ${d.p90} | ${d.b1} | ${d.b2} | ${d.b3} | ${d.b4} | ${d.b5} | ${d.eq50} | ${d.eq1} |`); }
  L.push('');
}

L.push('## 6. Por idade (idade na temporada; variação média por temporada · % subiu / % caiu)', '', ...H(['Idade', 'linhas', ...K]));
for (const a of AGES) { const g = rows.filter((r) => ageBand(r.f.age) === a); L.push(`| ${a} | ${g.length} | ${K.map((k) => `${f1(mean(g.map((r) => r.d[k])))} · ${pc(g.filter((r) => r.d[k] > 0).length, g.length)} / ${pc(g.filter((r) => r.d[k] < 0).length, g.length)}`).join(' | ')} |`); }
L.push('');
L.push('## 7. Por utilização (minutos na temporada: titular frequente ≥ 70%, parcial 40–70%, reserva > 0 e < 40%)', '', ...H(['Uso', 'linhas', ...K.map((k) => `${k}: média`), ...K.map((k) => `${k}: +1/−1`)]));
for (const u of USAGE) { const g = rows.filter((r) => usage(r.f) === u); L.push(`| ${u} | ${g.length} | ${K.map((k) => f1(mean(g.map((r) => r.d[k])))).join(' | ')} | ${K.map((k) => `${g.filter((r) => r.d[k] > 0).length}/${g.filter((r) => r.d[k] < 0).length}`).join(' | ')} |`); }
L.push('', 'Uso × idade (variação média por temporada):', '', ...H(['Uso · variante', ...AGES]));
for (const u of USAGE) for (const k of K) L.push(`| ${u} · ${k} | ${AGES.map((a) => { const g = rows.filter((r) => usage(r.f) === u && ageBand(r.f.age) === a); return g.length ? f1(mean(g.map((r) => r.d[k]))) : '–'; }).join(' | ')} |`);
const idleCareer = ids.map((id) => ({ id, zero: seasonsOf(id).filter((s) => obs.facts.get(id)!.get(s)!.minutes === 0).length })).filter((x) => x.zero >= 3);
L.push('', `Jogadores com 3+ temporadas sem nenhum minuto: ${idleCareer.length}.`, '', ...H(['Temporadas sem jogar', 'jogadores', ...K.map((k) => `${k}: variação total média (pior)`)]));
for (const [lo, hi] of [[3, 4], [5, 7], [8, 10]] as const) {
  const g = idleCareer.filter((x) => x.zero >= lo && x.zero <= hi);
  if (g.length) L.push(`| ${lo}–${hi} | ${g.length} | ${K.map((k) => { const d = g.map((x) => last(obs.states[k], x.id) - base(x.id)); return `${f1(mean(d))} (${sg(Math.min(...d))})`; }).join(' | ')} |`);
}
L.push('', '**Um jogador que não joga perde força, mas essa perda destrói a carreira?** Ver "zero minutos" acima e os alertas.', '');

L.push('## 8–9. Divisões e transferências', '');
const later = (m: Move, k: string, n: number) => { const l = obs.states[k].lines.get(m.playerId)?.get(m.season + n - 1); return l ? l.end - m.at[k] : null; };
const moveRow = (label: string, g: Move[]) => g.length ? `| ${label} | ${g.length} | ${K.map((k) => `${f1(mean(g.map((m) => m.at[k])))} → ${f1(mean(g.map((m) => m.afterFirst[k]).filter((x): x is number => x !== null)))} · 1T ${f1(mean(g.map((m) => later(m, k, 1)).filter((x): x is number => x !== null)))} · 3T ${f1(mean(g.map((m) => later(m, k, 3)).filter((x): x is number => x !== null)))} · 5T ${f1(mean(g.map((m) => later(m, k, 5)).filter((x): x is number => x !== null)))}`).join(' | ')} |` : `| ${label} | 0 | ${K.map(() => 'nenhum caso no mundo').join(' | ')} |`;
L.push('Cada célula: força média antes → logo depois (1ª rodada) · evolução média após 1, 3 e 5 temporadas.', '', ...H(['Movimento', 'n', ...K]));
const PAIRS: [number, number][] = [[4, 3], [3, 2], [2, 1], [1, 2], [1, 4]];
for (const [a, b] of PAIRS) L.push(moveRow(`transferência D${a} → D${b}`, obs.moves.filter((m) => m.kind === 'transferencia' && m.fromDiv === a && m.toDiv === b)));
L.push(moveRow('transferência na mesma divisão', obs.moves.filter((m) => m.kind === 'transferencia' && m.fromDiv === m.toDiv)));
for (const [a, b] of [[4, 3], [3, 2], [2, 1], [1, 2], [2, 3], [3, 4]] as [number, number][]) L.push(moveRow(`${a > b ? 'promoção' : 'rebaixamento'} do clube D${a} → D${b}`, obs.moves.filter((m) => m.kind !== 'transferencia' && m.fromDiv === a && m.toDiv === b)));
const movedIds = new Set(obs.moves.map((m) => m.playerId));
const still = rows.filter((r) => !movedIds.has(r.id));
L.push(`| sem transferência nem mudança de divisão (por temporada) | ${still.length} | ${K.map((k) => f1(mean(still.map((r) => r.d[k])))).join(' | ')} |`);
const instant = K.map((k) => obs.moves.filter((m) => m.afterFirst[k] !== null && Math.abs((m.afterFirst[k] ?? 0) - m.at[k]) > 0).length);
L.push('', `Mudança de força na 1ª rodada após o movimento (fim de janela coincidente, nunca o movimento em si): ${K.map((k, i) => `${k} ${instant[i]}/${obs.moves.length}`).join(' · ')}.`);
// efeito isolado da divisão: titulares frequentes na temporada logo após o clube mudar de divisão (a inatividade não
// pesa para eles, então a diferença entre a 0.2 e as variantes 0.3 vem do contexto da divisão)
const changed = new Map<string, string>();
for (const m of obs.moves) if (m.kind !== 'transferencia') changed.set(`${m.playerId}|${m.season}`, m.kind);
L.push('', 'Efeito isolado da divisão — titulares frequentes na 1ª temporada após o clube mudar de divisão (variação média; entre parênteses, % que subiu):', '', ...H(['Grupo', 'linhas', ...K]));
for (const kind of ['promocao', 'rebaixamento']) {
  const g = rows.filter((r) => changed.get(`${r.id}|${r.s}`) === kind && usage(r.f) === 'titular frequente');
  L.push(`| titulares após ${kind === 'promocao' ? 'promoção' : 'rebaixamento'} | ${g.length} | ${K.map((k) => `${f1(mean(g.map((r) => r.d[k])))} (${pc(g.filter((r) => r.d[k] > 0).length, g.length)})`).join(' | ')} |`);
}
for (const dv of [1, 2, 3, 4]) {
  const g = rows.filter((r) => r.f.division === dv && usage(r.f) === 'titular frequente' && r.f.age <= 27);
  L.push(`| titulares até 27 anos na D${dv} (todas as temporadas) | ${g.length} | ${K.map((k) => `${f1(mean(g.map((r) => r.d[k])))} (${pc(g.filter((r) => r.d[k] > 0).length, g.length)})`).join(' | ')} |`);
}
const d1Bench = rows.filter((r) => r.f.division === 1 && r.f.minutes === 0);
L.push(`Na 1ª divisão sem nenhum minuto: ${d1Bench.length} linhas; subidas: ${K.map((k) => `${k} ${d1Bench.filter((r) => r.d[k] > 0).length}`).join(' · ')} (divisão superior não dá força a quem não joga).`, '');

L.push('## 10. Lesões (por temporada)', '', ...H(['Situação', 'linhas', ...K]));
for (const b of INJ) { const g = rows.filter((r) => injBand(r.f) === b); L.push(`| ${b} | ${g.length} | ${K.map((k) => f1(mean(g.map((r) => r.d[k])))).join(' | ')} |`); }
L.push('');

// ---------- casos individuais (reais, escolhidos por regra fixa) ----------
const F = (id: string) => seasonsOf(id).map((s) => obs.facts.get(id)!.get(s)!);
const minutesTotal = (id: string) => F(id).reduce((a, f) => a + f.minutes, 0);
const byKey = <T,>(arr: T[], key: (x: T) => number) => [...arr].sort((a, b) => key(b) - key(a));
const CASES: [string, string | undefined][] = [
  ['1. jovem fraco que vira titular em clube forte (D1)', byKey(ids.filter((id) => obs.first.get(id)!.age <= 21 && base(id) <= 30 && F(id).filter((f) => f.division === 1 && usage(f) === 'titular frequente').length >= 2), (id) => F(id).filter((f) => f.division === 1 && usage(f) === 'titular frequente').length * 1e6 - base(id))[0]],
  ['2. jovem fraco que permanece reserva', byKey(ids.filter((id) => obs.first.get(id)!.age <= 21 && base(id) <= 25 && F(id).length >= 4 && F(id).every((f) => ['reserva', 'zero minutos'].includes(usage(f)))), (id) => F(id).length)[0]],
  ['3. jogador forte em clube fraco (maior força inicial entre quem começa na D3/D4)', byKey(ids.filter((id) => (F(id)[0]?.division ?? 0) >= 3 && F(id).length >= 3), (id) => base(id) * 100 + F(id).length)[0]],
  ['4. jogador forte que vai para clube forte (chega à D1 com 38+, até 30 anos)', obs.moves.filter((m) => m.toDiv === 1 && (m.fromDiv ?? 0) > 1 && m.at['0.2'] >= 38 && (obs.facts.get(m.playerId)?.get(m.season)?.age ?? 99) <= 30).sort((a, b) => b.at['0.2'] - a.at['0.2'] || a.playerId.localeCompare(b.playerId)).map((m) => m.playerId)[0]],
  ['5. veterano titular', byKey(ids.filter((id) => obs.first.get(id)!.age >= 32 && F(id).length >= 3), minutesTotal)[0]],
  ['6. veterano reserva', byKey(ids.filter((id) => obs.first.get(id)!.age >= 32 && F(id).length >= 3 && F(id).every((f) => usage(f) !== 'titular frequente')), (id) => -minutesTotal(id))[0]],
  ['7. transferido de divisão inferior para superior', obs.moves.filter((m) => m.kind === 'transferencia' && (m.toDiv ?? 9) < (m.fromDiv ?? 0) && (obs.facts.get(m.playerId)?.get(m.season)?.age ?? 99) <= 28).map((m) => m.playerId)[0] ?? obs.moves.find((m) => m.kind === 'transferencia' && (m.toDiv ?? 9) < (m.fromDiv ?? 0))?.playerId],
  ['8. transferido de divisão superior para inferior', obs.moves.find((m) => m.kind === 'transferencia' && (m.toDiv ?? 0) > (m.fromDiv ?? 9))?.playerId ?? obs.moves.filter((m) => m.kind === 'rebaixamento' && m.at['0.2'] >= 38).map((m) => m.playerId)[0]],
  ['9. várias temporadas sem jogar', byKey(idleCareer, (x) => x.zero * 100 + base(x.id)).map((x) => x.id)[0]],
  ['10. retorna após lesão longa', byKey(ids.filter((id) => F(id).some((f) => f.longestInjury >= 8)), (id) => Math.max(...F(id).map((f) => f.longestInjury)))[0]],
];
L.push('## 11. Casos individuais (reais)', '', 'Força ao fim de cada temporada (antes do 1º valor: força inicial). Uso e divisão por temporada.', '');
const caseJson: unknown[] = [];
for (const [label, id] of CASES) {
  if (!id) { L.push(`### ${label}`, '', '— nenhum caso no mundo simulado.', ''); continue; }
  const fi = obs.first.get(id)!;
  const ss = seasonsOf(id);
  const extra = label.startsWith('8') && !obs.moves.some((m) => m.playerId === id && m.kind === 'transferencia') ? ' (nenhuma transferência para divisão inferior no período: caso de rebaixamento do clube)' : '';
  L.push(`### ${label}${extra}`, '', `${fi.name} — ${fi.position}, ${fi.age} anos na T${fi.season}, força inicial ${fi.base}${obs.retired.has(id) ? `; aposentou após a T${obs.retired.get(id)}` : ''}.`, '');
  L.push(...H(['', ...ss.map((s) => `T${s}`)]));
  L.push(`| uso | ${ss.map((s) => usage(obs.facts.get(id)!.get(s)!).replace('titular frequente', 'titular').replace('titular parcial', 'parcial').replace('zero minutos', '0 min')).join(' | ')} |`);
  L.push(`| divisão · idade | ${ss.map((s) => { const f = obs.facts.get(id)!.get(s)!; return `D${f.division ?? '–'} · ${f.age}`; }).join(' | ')} |`);
  L.push(`| lesão (rodadas) | ${ss.map((s) => obs.facts.get(id)!.get(s)!.injuredRounds || '').join(' | ')} |`);
  for (const k of K) L.push(`| ${k} | ${ss.map((s) => obs.states[k].lines.get(id)?.get(s)?.end ?? '').join(' | ')} |`);
  L.push('');
  caseJson.push({ label, id, name: fi.name, position: fi.position, startAge: fi.age, base: fi.base, seasons: ss.map((s) => ({ season: s, ...obs.facts.get(id)!.get(s)!, strength: Object.fromEntries(K.map((k) => [k, obs.states[k].lines.get(id)?.get(s)?.end ?? null])) })) });
}

// ---------- alertas (só sinalizados) ----------
const alerts: string[] = [];
for (const k of K) {
  const t = tot[k];
  const g = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f);
  const zero = g((r) => r.f.minutes === 0);
  const young = g((r) => r.f.age <= 20);
  const vet = g((r) => r.f.age >= 34);
  const strongWeak = ids.filter((id) => base(id) >= 40 && F(id).length >= 3 && F(id).every((f) => (f.division ?? 0) >= 3 && usage(f) === 'titular frequente'));
  const A = (cond: boolean, msg: string) => { if (cond) alerts.push(`**${k}** — ${msg}`); };
  A(t.reached1 > 20, `muitos jogadores chegando a 1: ${t.reached1}.`);
  A(t.reached50 > 5, `muitos jogadores chegando a 50: ${t.reached50}.`);
  A(t.sameSet < -1.5, `deflação generalizada: ${f1(t.sameSet)} no mesmo conjunto.`);
  A(t.sameSet > 2, `inflação generalizada: ${f1(t.sameSet)} no mesmo conjunto.`);
  A(mean(young.map((r) => r.d[k])) > 2 || young.some((r) => r.d[k] >= 5), `jovens rápidos demais: média ${f1(mean(young.map((r) => r.d[k])))} por temporada, máximo ${sg(Math.max(...young.map((r) => r.d[k])))}.`);
  A(mean(vet.map((r) => r.d[k])) < -1.5, `veteranos (34+) caindo rápido: ${f1(mean(vet.map((r) => r.d[k])))} por temporada.`);
  A(mean(zero.map((r) => r.d[k])) < -1, `reserva sem minutos perdendo força rápido: ${f1(mean(zero.map((r) => r.d[k])))} por temporada.`);
  A(zero.some((r) => r.d[k] > 0), `jogador evoluindo sem minutos: ${zero.filter((r) => r.d[k] > 0).length} temporada(s).`);
  A(zero.length > 0 && zero.every((r) => r.d[k] >= 0), `inatividade sem nenhuma consequência: ${zero.length} temporadas sem minutos e nenhuma queda (o "deve perder força" não é atendido).`);
  A(instant[K.indexOf(k)] > 0, `força mudou na 1ª rodada após movimento em ${instant[K.indexOf(k)]} caso(s) (verificar se é fim de janela).`);
  A(d1Bench.some((r) => r.d[k] > 0), 'jogador ganhando força só por estar na 1ª divisão sem jogar.');
  const sw = strongWeak.map((id) => last(obs.states[k], id) - base(id));
  A(sw.some((x) => x <= -5), `jogador forte destruído por ambiente inferior: ${sw.filter((x) => x <= -5).length} caso(s) com −5 ou pior sendo titular na D3/D4.`);
}
L.push('## 12. Alertas (sinalizados, não corrigidos)', '', ...(alerts.length ? alerts.map((a) => `- ${a}`) : ['- Nenhum alerta pelos critérios.']), '');
L.push('Critérios: inatividade sem nenhuma queda em todas as temporadas sem minutos; chegar a 1 > 20 jogadores; chegar a 50 > 5; mesmo conjunto < −1,5 (deflação) ou > +2 (inflação); jovens ≤ 20 com média > +2 por temporada ou alguma temporada ≥ +5; 34+ com média < −1,5; zero minutos com média < −1; qualquer subida sem minutos; qualquer subida sem minutos na D1; forte (40+) titular na D3/D4 por 3+ temporadas caindo 5 ou mais.', '');
L.push('## 13. Limitações', '', '- Sem efeito de volta da força nas partidas (todos os mundos usam os mesmos placares).', '- Transferências entre clubes são raras no mundo fictício (CPU); a mudança de divisão vem quase toda de acesso/rebaixamento.', '- Uma seed só; aposentadoria aos 37 (do jogo) limita a análise de veteranos.', '');

mkdirSync(join(ROOT, 'reports'), { recursive: true });
writeFileSync(join(ROOT, 'reports/development-world-10-seasons-v03.md'), L.join('\n'));
writeFileSync(join(ROOT, 'reports/development-world-10-seasons-v03.json'), `${JSON.stringify({
  versions: VARIANTS.map((v) => ({ key: v.key, label: v.label, config: v.cfg })), seed: SEED, seasons: SEASONS, integrated: false, applied: false,
  determinism: { controlHash: control.hash, observedHash: obs.hash, identical: same },
  totals: tot,
  distributions: Object.fromEntries(K.map((k) => [k, Object.fromEntries([0, 1, 3, 5, 10].map((s) => [s, distribution(k, s)]))])),
  alerts, cases: caseJson,
}, null, 1)}\n`);
console.log(L.join('\n'));
