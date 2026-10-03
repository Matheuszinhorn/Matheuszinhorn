// DEV-INTEGRATION-0.1 — PRIMEIRO TESTE DE FEEDBACK (experimental; NÃO integrado ao produto; Engine 0.2.0 intocado).
// Dois mundos, UMA temporada, mesma seed/universo/calendário/carreira:
//   Controle:        strengthBase → Engine 0.2.0 (força fixa; checkpoints antigos de evolução desligados)
//   Desenvolvimento: strengthBase → DEV-PROTO-0.4-B → strengthCurrent → Engine 0.2.0
// A única intervenção é game/development/feedback.ts (withDevelopedStrength) entre as rodadas. Todo o resto
// (escalação da CPU, chances, conversão, RNG, gols, cartões, lesões, placares, tabela, calendário) é do jogo/engine.
// O experimento roda duas vezes e compara os hashes (placares, evolução, relatório).
// Uso: npm run development:feedback1  →  reports/development-feedback-season-01.{md,json}
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRound, roundResults, simulateRound, type MatchState, type Player, type World } from '../engine/index.ts';
import { careerOffers, isSeasonOver, type CareerState } from '../game/career.ts';
import { newManagedCareer } from '../game/manager/actions.ts';
import { finishManagedRound, planManagedRound } from '../game/manager/flow.ts';
import { devProto04, matchPerformance, type MatchEvidence, type PlayerDevelopment } from '../game/development/development.ts';
import { evidenceFromMatch } from '../game/development/evidence.ts';
import { POSITION, stepDevelopment, withDevelopedStrength } from '../game/development/feedback.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 'elite-dev-world-10';
const ROUNDS = 38;
const SEASON = 1;
const CFG = devProto04('B', 'B');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

interface MatchRow { round: number; div: number; matchId: string; hg: number; ag: number; hc: number; ac: number; hs: number; as: number }
interface Usage { minutes: number; apps: number; starts: number; perfSum: number }
interface WorldRun {
  matches: MatchRow[];
  calendar: string[];
  scoreHash: string;
  start: World;
  end: World;
  /** mundo de cada rodada ANTES da composição (para conferir rodadas 1–5 e a pureza da composição) */
  worldHashBefore: string[];
  usage: Map<string, Usage>;
  divisionOf: Map<string, number[]>;
  devs: Map<string, PlayerDevelopment> | null;
  windows: Map<string, number[]>;
  evoHash: string;
  compositionErrors: string[];
}

const divLevel = (w: World, clubId: string | null) => (clubId ? (w.divisions.find((d) => d.id === w.clubs[clubId]?.divisionId)?.level ?? 0) : 0);
/** titulares do apito inicial (evidência da própria partida) */
const XI = (m: MatchState, side: 'home' | 'away', ev: ReturnType<typeof evidenceFromMatch>) => Object.keys(m[side].players).filter((id) => ev.get(id)?.started);
/** sem estado do engine: só o que a camada de gestão salva entre rodadas (World inteiro + ordem determinística) */
const worldKey = (w: World) => sha(JSON.stringify(w));
const maskStrength = (w: World) => JSON.stringify({ ...w, players: Object.fromEntries(Object.entries(w.players).map(([id, p]) => [id, { ...p, strength: 0 }])) });

function runWorld(develop: boolean): WorldRun {
  let c: CareerState = newManagedCareer(SEED, 'Simulação', careerOffers(SEED)[0]);
  const start = c.world;
  const hash = createHash('sha256');
  const evo = createHash('sha256');
  const matches: MatchRow[] = [];
  const calendar: string[] = [];
  const worldHashBefore: string[] = [];
  const usage = new Map<string, Usage>();
  const divisionOf = new Map<string, number[]>();
  const windows = new Map<string, number[]>();
  const compositionErrors: string[] = [];
  let devs: Map<string, PlayerDevelopment> = new Map();
  for (let round = 1; round <= ROUNDS; round++) {
    const plan = planManagedRound(c);
    calendar.push(`${round}|${plan.roundId}|${plan.seed}|${plan.fixtures.map((f) => `${f.matchId}:${f.home.club.id}-${f.away.club.id}`).join(',')}`);
    const w0 = c.world;
    for (const p of Object.values(w0.players)) if (p.clubId) { const a = divisionOf.get(p.id) ?? []; a.push(divLevel(w0, p.clubId)); divisionOf.set(p.id, a); }
    const sim = simulateRound(createRound(plan.roundId, plan.seed, plan.fixtures, null));
    const results = roundResults(sim);
    for (const r of results) hash.update(`${round}|${r.matchId}|${r.homeGoals}-${r.awayGoals};`);
    for (const m of sim.matches) {
      const ev = evidenceFromMatch(m);
      const st = (side: 'home' | 'away') => { const ids = XI(m, side, ev); return ids.reduce((a, id) => a + m[side].players[id].strength, 0) / Math.max(1, ids.length); };
      matches.push({ round, div: divLevel(w0, m.home.clubId), matchId: m.matchId, hg: m.score.home, ag: m.score.away, hc: m.stats.home.chances, ac: m.stats.away.chances, hs: st('home'), as: st('away') });
      for (const [id, e] of ev) {
        const u = usage.get(id) ?? { minutes: 0, apps: 0, starts: 0, perfSum: 0 };
        if (e.played) { u.minutes += e.minutes; u.apps++; if (e.started) u.starts++; u.perfSum += matchPerformance({ ...e, injured: false } as MatchEvidence, POSITION[w0.players[id].position]); }
        usage.set(id, u);
      }
    }
    if (develop) devs = stepDevelopment(devs, w0, sim.matches, SEASON, round, CFG);
    c = finishManagedRound(c, results, sim.matches, { evolution: false }).career;
    worldHashBefore.push(worldKey(c.world));
    if (develop) {
      const composed = withDevelopedStrength(c.world, devs);
      if (maskStrength(composed) !== maskStrength(c.world)) compositionErrors.push(`rodada ${round}: a composição alterou algo além de Player.strength`);
      for (const [id, d] of devs) if (composed.players[id] && composed.players[id].strength !== d.strengthCurrent) compositionErrors.push(`rodada ${round}: ${id} não recebeu strengthCurrent`);
      c = { ...c, world: composed };
      evo.update(`${round}|${[...devs.values()].map((d) => `${d.playerId}:${d.strengthCurrent}:${d.progress.toFixed(6)}`).join(',')};`);
      if (round % CFG.windowRounds === 0 || round === ROUNDS) for (const [id, d] of devs) { const a = windows.get(id) ?? []; a.push(d.strengthCurrent); windows.set(id, a); }
    }
  }
  if (!isSeasonOver(c)) throw new Error('temporada incompleta');
  return { matches, calendar, scoreHash: hash.digest('hex'), start, end: c.world, worldHashBefore, usage, divisionOf, devs: develop ? devs : null, windows, evoHash: develop ? evo.digest('hex') : '', compositionErrors };
}

// ---------- utilitários ----------
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const pct = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const f1 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') : '–');
const f2 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') : '–');
const f3 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 1000) / 1000).toFixed(3).replace('.', ',') : '–');
const pc = (v: number) => (Number.isFinite(v) ? `${f1(v * 100)}%` : '–');
const sg = (v: number, f = (x: number) => String(x)) => (!Number.isFinite(v) ? '–' : v > 0 ? `+${f(v)}` : f(v));
const H = (cols: string[]) => [`| ${cols.join(' | ')} |`, `|${cols.map((_, i) => (i ? '---:' : '---')).join('|')}|`];

function engineMetrics(rows: MatchRow[]) {
  const n = rows.length;
  const goals = rows.reduce((a, r) => a + r.hg + r.ag, 0);
  const chances = rows.reduce((a, r) => a + r.hc + r.ac, 0);
  const fav = rows.filter((r) => Math.abs(r.hs - r.as) > 1e-9);
  const favWin = fav.filter((r) => (r.hs > r.as ? r.hg > r.ag : r.ag > r.hg)).length;
  const dogWin = fav.filter((r) => (r.hs > r.as ? r.ag > r.hg : r.hg > r.ag)).length;
  const sc = (a: number, b: number) => rows.filter((r) => (r.hg === a && r.ag === b) || (r.hg === b && r.ag === a)).length / n;
  const tot = (k: number) => rows.filter((r) => r.hg + r.ag >= k).length / n;
  return {
    n, goalsPerMatch: goals / n, goalsPerTeam: goals / (2 * n), chancesPerMatch: chances / n, conversion: goals / chances,
    home: rows.filter((r) => r.hg > r.ag).length / n, draw: rows.filter((r) => r.hg === r.ag).length / n, away: rows.filter((r) => r.hg < r.ag).length / n,
    favN: fav.length, favWin: favWin / fav.length, favDraw: (fav.length - favWin - dogWin) / fav.length, dogWin: dogWin / fav.length,
    strengthDiff: mean(rows.map((r) => Math.abs(r.hs - r.as))), goalDiff: mean(rows.map((r) => Math.abs(r.hg - r.ag))),
    s00: sc(0, 0), s10: sc(1, 0), s11: sc(1, 1), s21: sc(2, 1), s31: sc(3, 1), g4: tot(4), g5: tot(5), g7: tot(7),
  };
}
type EM = ReturnType<typeof engineMetrics>;
const EM_ROWS: [string, (m: EM) => string, (m: EM) => number][] = [
  ['partidas', (m) => String(m.n), (m) => m.n],
  ['gols por partida', (m) => f3(m.goalsPerMatch), (m) => m.goalsPerMatch],
  ['gols por time', (m) => f3(m.goalsPerTeam), (m) => m.goalsPerTeam],
  ['chances por partida', (m) => f2(m.chancesPerMatch), (m) => m.chancesPerMatch],
  ['conversão (gols/chances)', (m) => pc(m.conversion), (m) => m.conversion],
  ['vitória mandante', (m) => pc(m.home), (m) => m.home],
  ['empate', (m) => pc(m.draw), (m) => m.draw],
  ['vitória visitante', (m) => pc(m.away), (m) => m.away],
  ['jogos com favorito', (m) => String(m.favN), (m) => m.favN],
  ['vitória do favorito', (m) => pc(m.favWin), (m) => m.favWin],
  ['empate (com favorito)', (m) => pc(m.favDraw), (m) => m.favDraw],
  ['vitória do azarão', (m) => pc(m.dogWin), (m) => m.dogWin],
  ['diferença média de força (titulares)', (m) => f2(m.strengthDiff), (m) => m.strengthDiff],
  ['diferença média de gols', (m) => f3(m.goalDiff), (m) => m.goalDiff],
  ['0×0', (m) => pc(m.s00), (m) => m.s00],
  ['1×0', (m) => pc(m.s10), (m) => m.s10],
  ['1×1', (m) => pc(m.s11), (m) => m.s11],
  ['2×1', (m) => pc(m.s21), (m) => m.s21],
  ['3×1', (m) => pc(m.s31), (m) => m.s31],
  ['4+ gols', (m) => pc(m.g4), (m) => m.g4],
  ['5+ gols', (m) => pc(m.g5), (m) => m.g5],
  ['7+ gols', (m) => pc(m.g7), (m) => m.g7],
];

function experiment() {
  const ctl = runWorld(false);
  const dev = runWorld(true);
  const devs = dev.devs!;
  const errors: string[] = [...dev.compositionErrors];
  const derived: string[] = [];

  // ---------- divergências: o que precisa ser idêntico ----------
  if (worldKey(ctl.start) !== worldKey(dev.start)) errors.push('universo inicial diferente');
  const calDiff = ctl.calendar.filter((x, i) => x !== dev.calendar[i]).length;
  if (calDiff) errors.push(`calendário/seeds/mandos diferentes em ${calDiff} rodada(s)`);
  const firstWindow = CFG.windowRounds;
  const anyChangeBefore = [...devs.values()].some((d) => d.history.some((h) => h.round < firstWindow && h.to !== h.from));
  if (anyChangeBefore) errors.push(`força mudou antes do fim da 1ª janela (rodada ${firstWindow})`);
  // até a rodada da 1ª mudança real de força (inclusive) o engine recebeu exatamente o mesmo mundo: tudo tem de ser igual
  const firstChange = Math.min(ROUNDS, ...[...devs.values()].flatMap((d) => d.history.filter((h) => h.to !== h.from).map((h) => h.round)));
  for (let r = 0; r < firstChange; r++) if (ctl.worldHashBefore[r] !== dev.worldHashBefore[r]) errors.push(`mundo diferente na rodada ${r + 1}, antes de qualquer mudança de força`);
  const earlyScores = (w: WorldRun) => w.matches.filter((m) => m.round <= firstChange).map((m) => `${m.matchId}:${m.hg}-${m.ag}`).join(',');
  if (earlyScores(ctl) !== earlyScores(dev)) errors.push(`placares das rodadas 1–${firstChange} diferentes (a força ainda não tinha mudado)`);
  const STATIC: (keyof Player)[] = ['name', 'age', 'nationality', 'position', 'temperament'];
  let staticDiff = 0;
  for (const id of new Set([...Object.keys(ctl.end.players), ...Object.keys(dev.end.players)])) {
    const a = ctl.end.players[id], b = dev.end.players[id];
    if (!a || !b) { staticDiff++; continue; }
    if (STATIC.some((k) => a[k] !== b[k])) staticDiff++;
  }
  if (staticDiff) errors.push(`${staticDiff} jogador(es) com identidade/idade/posição/temperamento diferentes ou ausentes em um dos mundos`);
  const divSet = (w: World) => w.divisions.map((d) => `${d.id}:${[...d.clubIds].sort().join(',')}`).join('|');
  if (divSet(ctl.end) !== divSet(dev.end)) errors.push('composição das divisões mudou durante a temporada');
  if (Object.values(ctl.end.players).some((p) => p.strength !== ctl.start.players[p.id]?.strength)) errors.push('força do Controle mudou durante a temporada (deveria ser fixa)');

  // ---------- divergências derivadas (efeito da força, registradas) ----------
  const scoreDiffMatches = ctl.matches.filter((m, i) => m.hg !== dev.matches[i].hg || m.ag !== dev.matches[i].ag).length;
  const firstDiffRound = ctl.matches.find((m, i) => m.hg !== dev.matches[i].hg || m.ag !== dev.matches[i].ag)?.round ?? null;
  derived.push(`placares diferentes em ${scoreDiffMatches} de ${ctl.matches.length} partidas (primeira na rodada ${firstDiffRound ?? '—'})`);
  let clubDiff = 0, condDiff = 0, valueDiff = 0, salaryDiff = 0, contractDiff = 0;
  for (const p of Object.values(ctl.end.players)) {
    const q = dev.end.players[p.id];
    if (!q) continue;
    if (p.clubId !== q.clubId) clubDiff++;
    if (JSON.stringify(p.condition) !== JSON.stringify(q.condition)) condDiff++;
    if (p.marketValue !== q.marketValue) valueDiff++;
    if (p.salary !== q.salary) salaryDiff++;
    if (p.contract.endSeason !== q.contract.endSeason) contractDiff++;
  }
  derived.push(`jogadores com clube diferente no fim: ${clubDiff}; condição (lesão/suspensão/amarelos) diferente: ${condDiff}; valor de mercado diferente: ${valueDiff}; salário diferente: ${salaryDiff}; contrato diferente: ${contractDiff}`);
  const moneyDiff = Object.values(ctl.end.clubs).filter((cl) => cl.money !== dev.end.clubs[cl.id].money).length;
  derived.push(`clubes com caixa diferente no fim: ${moneyDiff} de ${Object.keys(ctl.end.clubs).length}`);

  // ---------- desenvolvimento: controle (base) × experimental (atual) ----------
  const ids = [...devs.keys()].filter((id) => dev.end.players[id]?.clubId).sort();
  const baseOf = (id: string) => devs.get(id)!.strengthBase;
  const curOf = (id: string) => devs.get(id)!.strengthCurrent;
  const dist = (v: number[]) => ({ mean: mean(v), median: pct(v, 0.5), p10: pct(v, 0.1), p90: pct(v, 0.9), b1: v.filter((x) => x <= 10).length, b2: v.filter((x) => x > 10 && x <= 20).length, b3: v.filter((x) => x > 20 && x <= 30).length, b4: v.filter((x) => x > 30 && x <= 40).length, b5: v.filter((x) => x > 40).length, eq50: v.filter((x) => x === 50).length, eq1: v.filter((x) => x === 1).length });
  const ctlEnd = Object.values(ctl.end.players).filter((p) => p.clubId).map((p) => p.strength);
  const dBase = dist(ids.map(baseOf)), dCtl = dist(ctlEnd), dCur = dist(ids.map(curOf));
  const deltas = ids.map((id) => curOf(id) - baseOf(id));
  const all = [...devs.values()];
  const changed = all.filter((d) => d.strengthCurrent !== d.strengthBase);
  const fb = {
    changed: changed.length, total: all.length, magnitude: mean(changed.map((d) => Math.abs(d.strengthCurrent - d.strengthBase))), magnitudeAll: mean(all.map((d) => Math.abs(d.strengthCurrent - d.strengthBase))),
    up: all.filter((d) => d.strengthCurrent > d.strengthBase).length, down: all.filter((d) => d.strengthCurrent < d.strengthBase).length,
    hit50: all.filter((d) => d.strengthCurrent === 50 && d.strengthBase < 50).length, hit1: all.filter((d) => d.strengthCurrent === 1 && d.strengthBase > 1).length,
    maxGain: Math.max(...deltas), maxDrop: Math.min(...deltas), meanDelta: mean(deltas),
  };

  // médias por divisão (força média do elenco, todos os jogadores com clube), início × fim, nos dois mundos
  const divMeans = (w: World) => Object.fromEntries(w.divisions.map((d) => [d.level, mean(d.clubIds.flatMap((cid) => w.clubs[cid].squad.map((pid) => w.players[pid]?.strength).filter((x): x is number => x !== undefined)))]));
  const dm = { start: divMeans(dev.start), ctlEnd: divMeans(ctl.end), devEnd: divMeans(dev.end) };
  const levels = dev.start.divisions.map((d) => d.level).sort();

  // por janela: variação média e % de quem subiu/caiu
  const nWin = Math.ceil(ROUNDS / CFG.windowRounds);
  const winStats = Array.from({ length: nWin }, (_, i) => {
    const pairs = [...dev.windows.entries()].filter(([, a]) => a.length === nWin).map(([id, a]) => [a[i] - (i ? a[i - 1] : baseOf(id))]).flat();
    return { mean: mean(pairs), up: pairs.filter((x) => x > 0).length, down: pairs.filter((x) => x < 0).length };
  });

  // retroalimentação por posição na tabela (pontos no mundo experimental): topo 4 × fundo 4 de cada divisão
  const pts = new Map<string, number>();
  const clubOfMatch = new Map<string, [string, string]>();
  for (const f of dev.calendar) for (const it of f.split('|')[3].split(',')) { const [mid, pair] = it.split(':'); const [h, a] = pair.split('-'); clubOfMatch.set(mid, [h, a]); }
  for (const m of dev.matches) { const [h, a] = clubOfMatch.get(m.matchId)!; pts.set(h, (pts.get(h) ?? 0) + (m.hg > m.ag ? 3 : m.hg === m.ag ? 1 : 0)); pts.set(a, (pts.get(a) ?? 0) + (m.ag > m.hg ? 3 : m.hg === m.ag ? 1 : 0)); }
  const topBottom = levels.map((lv) => {
    const d = dev.start.divisions.find((x) => x.level === lv)!;
    const order = [...d.clubIds].sort((a, b) => (pts.get(b) ?? 0) - (pts.get(a) ?? 0) || a.localeCompare(b));
    const g = (cids: string[]) => mean(ids.filter((id) => cids.includes(dev.end.players[id].clubId!)).map((id) => curOf(id) - baseOf(id)));
    return { lv, top: g(order.slice(0, 4)), bottom: g(order.slice(-4)) };
  });

  // ---------- engine ----------
  const emC = engineMetrics(ctl.matches), emD = engineMetrics(dev.matches);
  const emDiv = levels.map((lv) => ({ lv, c: engineMetrics(ctl.matches.filter((m) => m.div === lv)), d: engineMetrics(dev.matches.filter((m) => m.div === lv)) }));

  // ---------- critérios de segurança ----------
  const gap = (o: Record<number, number>, a: number, b: number) => o[a] - o[b];
  const safety: [string, string, boolean][] = [
    ['inflação/deflação forte', `variação média ${f2(fb.meanDelta)} (alerta se o módulo passar de 1,0 em uma temporada)`, Math.abs(fb.meanDelta) > 1],
    ['concentração em 50', `chegaram a 50: ${fb.hit50} (limite 5)`, fb.hit50 > 5],
    ['concentração em 1', `chegaram a 1: ${fb.hit1} (limite 10)`, fb.hit1 > 10],
    ['mudança extrema de gols', `gols/partida ${f3(emC.goalsPerMatch)} → ${f3(emD.goalsPerMatch)} (${sg((emD.goalsPerMatch / emC.goalsPerMatch - 1) * 100, f1)}%; limite ±5%)`, Math.abs(emD.goalsPerMatch / emC.goalsPerMatch - 1) > 0.05],
    ['mudança extrema de conversão', `conversão ${pc(emC.conversion)} → ${pc(emD.conversion)} (${sg((emD.conversion / emC.conversion - 1) * 100, f1)}%; limite ±5%)`, Math.abs(emD.conversion / emC.conversion - 1) > 0.05],
    ['favorito dominante demais', `vitória do favorito ${pc(emC.favWin)} → ${pc(emD.favWin)} (limite +5 p.p.)`, emD.favWin - emC.favWin > 0.05],
    ['divisão inferior forte demais', levels.slice(1).map((lv) => `D${lv - 1}−D${lv}: ${f2(gap(dm.ctlEnd, lv - 1, lv))} → ${f2(gap(dm.devEnd, lv - 1, lv))}`).join('; ') + ' (alerta se alguma distância cair mais de 25% ou inverter)', levels.slice(1).some((lv) => gap(dm.devEnd, lv - 1, lv) < 0.75 * gap(dm.ctlEnd, lv - 1, lv))],
    ['retroalimentação positiva explosiva', `variação por janela ${winStats.map((w) => f2(w.mean)).join(' · ')}; topo 4 − fundo 4 da tabela: ${topBottom.map((t) => `D${t.lv} ${sg(t.top - t.bottom, f2)}`).join(' · ')} (alerta se a última janela > 2× a primeira e positiva, ou topo − fundo > +1,0)`, (winStats[nWin - 1].mean > 0 && winStats[nWin - 1].mean > 2 * Math.max(0.01, winStats[0].mean)) || topBottom.some((t) => t.top - t.bottom > 1)],
  ];
  const tripped = safety.filter((s) => s[2]);

  // ---------- casos ----------
  const info = (id: string) => {
    const p = dev.start.players[id] ?? dev.end.players[id];
    const u = dev.usage.get(id) ?? { minutes: 0, apps: 0, starts: 0, perfSum: 0 };
    const divs = dev.divisionOf.get(id) ?? [];
    return { p, u, share: u.minutes / (ROUNDS * 90), perf: u.apps ? u.perfSum / u.apps : NaN, div0: divs[0], div1: divs[divs.length - 1], moved: new Set(divs).size > 1 };
  };
  const envOf = (lv: number) => dm.start[lv];
  const pick = (f: (id: string) => boolean, score: (id: string) => number) => ids.filter(f).sort((a, b) => score(a) - score(b) || a.localeCompare(b))[0] ?? null;
  const CASES: [string, string | null, string][] = [
    ['jovem fraco titular na D1', pick((id) => { const i = info(id); return i.p.age <= 21 && i.div0 === 1 && i.share >= 0.6 && baseOf(id) < envOf(1); }, (id) => baseOf(id)), 'até 21 anos, D1, ≥ 60% dos minutos, força abaixo da média da D1; o mais fraco'],
    ['jovem fraco reserva na D1', pick((id) => { const i = info(id); return i.p.age <= 21 && i.div0 === 1 && i.share < 0.25 && baseOf(id) < envOf(1); }, (id) => baseOf(id)), 'até 21 anos, D1, < 25% dos minutos, força abaixo da média da D1; o mais fraco'],
    ['jovem forte titular na D4', pick((id) => { const i = info(id); return i.p.age <= 21 && i.div0 === 4 && i.share >= 0.6; }, (id) => -baseOf(id)), 'até 21 anos, D4, ≥ 60% dos minutos; o mais forte'],
    ['veterano bom titular', pick((id) => { const i = info(id); return i.p.age >= 31 && i.share >= 0.7 && i.perf > 0; }, (id) => -info(id).perf), '31+, ≥ 70% dos minutos; maior rendimento médio'],
    ['veterano ruim titular', pick((id) => { const i = info(id); return i.p.age >= 31 && i.share >= 0.7; }, (id) => info(id).perf), '31+, ≥ 70% dos minutos; menor rendimento médio'],
    ['veterano sem minutos', pick((id) => { const i = info(id); return i.p.age >= 31 && i.u.minutes === 0; }, (id) => -baseOf(id)), '31+, zero minutos; o mais forte'],
    ['estrela 46+', pick((id) => baseOf(id) >= 46, (id) => -baseOf(id) * 1000 + info(id).share), 'força inicial ≥ 46; a mais forte'],
    ['transferido entre divisões', pick((id) => info(id).moved, (id) => -Math.abs(info(id).div0 - info(id).div1)), 'clube de outra divisão durante a temporada (mundo experimental). A CPU deste fluxo não transfere no meio da temporada (clube diferente no fim entre os mundos: 0), e acesso/rebaixamento só acontece na virada'],
  ];

  // ---------- relatório ----------
  const L: string[] = ['# DEV-INTEGRATION-0.1 — teste de feedback, temporada 1', '', '> **Teste de integração EXPERIMENTAL.** Não é integração oficial; nada entra no produto, nos saves, no gameplay, no calendário ou no deploy. Engine 0.2.0 intocado. A única diferença entre os mundos é `Player.strength` = strengthCurrent no mundo de Desenvolvimento.', ''];
  L.push('## Configuração', '');
  L.push(`- Candidata: **${CFG.version}** — limite conjunto −0,75/temporada sem participação; preservação parcial; divisão como oportunidade (peso ${CFG.divisionWeight}); sem piso de strengthBase; curva de idade inalterada.`);
  L.push(`- Seed \`${SEED}\`, universo fictício, carreira gerenciada sem decisões manuais, ${ROUNDS} rodadas, ${ctl.matches.length} partidas por mundo.`);
  L.push('- **Controle:** strengthBase → Engine 0.2.0 (`finishManagedRound(..., { evolution: false })`: força fixa a temporada toda).');
  L.push('- **Desenvolvimento:** mesma coisa + `game/development/feedback.ts` depois de cada rodada: `stepDevelopment` observa as partidas e `withDevelopedStrength` devolve o mundo com Player.strength = strengthCurrent. A força só muda no fim das janelas (rodadas 5, 10, …, 35, 38), então vale a partir da rodada seguinte.');
  L.push('- Efeitos esperados da força (não são divergências independentes): a escalação automática ordena por força, então titulares/reservas, placares, lesões, cartões, tabela, caixa e mercado podem mudar depois da 1ª janela.', '');

  L.push('## Divergências', '', `**Obrigatoriamente idênticos (divergência = erro):** universo inicial; calendário, seeds e mandos de todas as rodadas; mundo inteiro e placares até a rodada da 1ª mudança real de força (rodada ${firstChange}; nenhum ±1 antes dela); identidade/idade/posição/temperamento dos jogadores; composição das divisões; força fixa no Controle; a composição só altera Player.strength (conferido em todas as rodadas).`, '');
  L.push(errors.length ? errors.map((e) => `- **ERRO:** ${e}`).join('\n') : '- Nenhuma divergência além de strengthCurrent. ✔', '');
  L.push('**Derivadas da força (registradas, esperadas):**', '', ...derived.map((d) => `- ${d}`), '');

  L.push('## Desenvolvimento — Controle (base) × Experimental (atual)', '', ...H(['Métrica', 'Controle (strengthBase)', 'Experimental (strengthCurrent)', 'Δ']));
  const DR: [string, keyof typeof dBase, (v: number) => string][] = [['média', 'mean', f2], ['mediana', 'median', String], ['P10', 'p10', String], ['P90', 'p90', String], ['1–10', 'b1', String], ['11–20', 'b2', String], ['21–30', 'b3', String], ['31–40', 'b4', String], ['41–50', 'b5', String], ['exatamente 50', 'eq50', String], ['exatamente 1', 'eq1', String]];
  for (const [lab, k, f] of DR) L.push(`| ${lab} | ${f(dBase[k])} | ${f(dCur[k])} | ${sg(dCur[k] - dBase[k], f)} |`);
  L.push(`| maior ganho | – | ${sg(fb.maxGain)} | |`, `| maior queda | – | ${sg(fb.maxDrop)} | |`);
  L.push('', `Mesmo conjunto: ${ids.length} jogadores com clube no fim do mundo experimental (base = força no início, igual à do Controle). Conferência: a distribuição de força do mundo Controle no fim (todos com clube, n=${ctlEnd.length}) tem média ${f2(dCtl.mean)}, mediana ${dCtl.median}, P10 ${dCtl.p10}, P90 ${dCtl.p90}.`, '');

  L.push('## Engine — Controle × Experimental', '', ...H(['Métrica', 'Controle', 'Experimental', 'Δ']));
  for (const [lab, f, v] of EM_ROWS) { const d = v(emD) - v(emC); L.push(`| ${lab} | ${f(emC)} | ${f(emD)} | ${lab === 'partidas' || lab === 'jogos com favorito' ? sg(d) : f.toString().includes('pc(') ? `${sg(d * 100, f1)} p.p.` : sg(d, f3)} |`); }
  L.push('', 'Favorito = time com maior força média dos titulares em campo no apito inicial (força que o engine recebeu naquela partida); "diferença média de força" usa a mesma medida.', '');
  L.push('### Por divisão', '');
  for (const { lv, c, d } of emDiv) {
    L.push(`**D${lv}**`, '', ...H(['Métrica', 'Controle', 'Experimental']));
    for (const [lab, f] of EM_ROWS) L.push(`| ${lab} | ${f(c)} | ${f(d)} |`);
    L.push('');
  }

  L.push('## Feedback', '', ...H(['Pergunta', 'Resposta']));
  L.push(`| 1. quantos mudaram strengthCurrent | ${fb.changed} de ${fb.total} (${pc(fb.changed / fb.total)}) |`);
  L.push(`| 2. magnitude média da mudança | ${f2(fb.magnitude)} entre os que mudaram · ${f2(fb.magnitudeAll)} sobre todos |`);
  L.push(`| 3. ficaram mais fortes | ${fb.up} |`, `| 4. ficaram mais fracos | ${fb.down} |`, `| 5. chegaram a 50 | ${fb.hit50} |`, `| 6. chegaram a 1 | ${fb.hit1} |`);
  const conv = levels.slice(1).map((lv) => { const a = gap(dm.ctlEnd, lv - 1, lv), b = gap(dm.devEnd, lv - 1, lv); return `D${lv - 1}−D${lv} ${f2(a)} → ${f2(b)} (${b > a + 0.05 ? 'divergiu' : b < a - 0.05 ? 'convergiu' : 'estável'})`; });
  L.push(`| 7. médias por divisão divergiram ou convergiram? | ${conv.join('; ')}; D1−D4 ${f2(gap(dm.ctlEnd, 1, 4))} → ${f2(gap(dm.devEnd, 1, 4))} |`);
  L.push('', ...H(['Divisão', 'início', 'fim Controle', 'fim Experimental', 'Δ Experimental']));
  for (const lv of levels) L.push(`| D${lv} | ${f2(dm.start[lv])} | ${f2(dm.ctlEnd[lv])} | ${f2(dm.devEnd[lv])} | ${sg(dm.devEnd[lv] - dm.start[lv], f2)} |`);
  L.push('', 'Força média de todos os jogadores do elenco (com transferências e elencos do fim de cada mundo).', '');
  L.push('Por janela (mundo experimental; jogadores presentes em todas as janelas):', '', ...H(['Janela (fim na rodada)', 'variação média', 'subiram', 'caíram']));
  winStats.forEach((w, i) => L.push(`| ${Math.min(ROUNDS, (i + 1) * CFG.windowRounds)} | ${f3(w.mean)} | ${w.up} | ${w.down} |`));
  L.push('', 'Retroalimentação pela tabela (variação média dos jogadores dos 4 primeiros × 4 últimos de cada divisão, mundo experimental):', '', ...H(['Divisão', 'topo 4', 'fundo 4', 'topo − fundo']));
  for (const t of topBottom) L.push(`| D${t.lv} | ${f2(t.top)} | ${f2(t.bottom)} | ${sg(t.top - t.bottom, f2)} |`);
  L.push('');

  L.push('## Casos acompanhados', '', ...H(['Caso', 'Jogador', 'pos.', 'idade', 'divisão', 'minutos (exp.)', 'rendimento médio', 'Controle', 'janelas (5,10,…,38)', 'Experimental', 'Δ']));
  for (const [title, id, rule] of CASES) {
    if (!id) { L.push(`| ${title} | — nenhum jogador com o perfil (${rule}) | | | | | | | | | |`); continue; }
    const i = info(id);
    L.push(`| ${title} | ${i.p.name} | ${POSITION[i.p.position]} | ${i.p.age} | D${i.div0}${i.moved ? ` → D${i.div1}` : ''} | ${i.u.minutes} (${pc(i.share)}) | ${f2(i.perf)} | ${ctl.end.players[id]?.strength ?? baseOf(id)} | ${(dev.windows.get(id) ?? []).join(' · ')} | ${curOf(id)} | ${sg(curOf(id) - baseOf(id))} |`);
  }
  L.push('', 'Critérios de escolha: ' + CASES.map(([t, , r]) => `${t} — ${r}`).join('; ') + '.', '');

  L.push('## Critérios de segurança', '', ...H(['Critério', 'medida', 'disparou?']));
  for (const [lab, m, t] of safety) L.push(`| ${lab} | ${m} | ${t ? '**SIM — parar**' : 'não'} |`);
  L.push('', tripped.length ? `**Parada:** ${tripped.map((t) => t[0]).join(', ')}. Não avançar para 10 temporadas.` : 'Nenhum critério de parada disparou. **Mesmo assim, não avançar para 10 temporadas automaticamente** — a decisão é do responsável.', '');
  L.push('## Limitações', '', '- Uma temporada e uma seed: efeitos de feedback são pequenos por construção (a força só muda a partir da rodada 6 e ±1 por janela).', '- Sem envelhecimento/aposentadoria/acesso nesta temporada (só acontecem na virada).', '- Favorito medido pela força média dos titulares; não considera tática nem mando.', '');

  const report = L.join('\n');
  const data = {
    experiment: 'DEV-INTEGRATION-0.1', seed: SEED, rounds: ROUNDS, config: CFG,
    reproduce: 'npm run development:feedback1',
    hashes: { scoreControl: ctl.scoreHash, scoreExperimental: dev.scoreHash, evolution: dev.evoHash },
    errors, derived, safety: safety.map(([k, m, t]) => ({ criterion: k, measure: m, tripped: t })),
    players: ids.map((id) => [id, baseOf(id), curOf(id), info(id).div0, info(id).p.age, info(id).u.minutes, ...(dev.windows.get(id) ?? [])]),
    playersColumns: ['id', 'strengthBase', 'strengthCurrent', 'division', 'age', 'minutes', 'window5', 'window10', 'window15', 'window20', 'window25', 'window30', 'window35', 'window38'],
    scores: { columns: ['round', 'division', 'matchId', 'control', 'experimental'], rows: ctl.matches.map((m, i) => [m.round, m.div, m.matchId, `${m.hg}-${m.ag}`, `${dev.matches[i].hg}-${dev.matches[i].ag}`]) },
  };
  return { report, data, scoreControl: ctl.scoreHash, scoreExperimental: dev.scoreHash, evoHash: dev.evoHash, errors, tripped };
}

const a = experiment();
const b = experiment();
const rh = (x: typeof a) => sha(x.report);
const det: [string, string, string][] = [
  ['placares Controle', a.scoreControl, b.scoreControl],
  ['placares Experimental', a.scoreExperimental, b.scoreExperimental],
  ['evolução (strengthCurrent + progresso por rodada)', a.evoHash, b.evoHash],
  ['relatório (sem esta seção)', rh(a), rh(b)],
];
const detOk = det.every(([, x, y]) => x === y);
const tail = ['## Determinismo', '', 'O experimento inteiro (Controle + Experimental) rodou duas vezes no mesmo processo.', '', ...H(['Hash', 'execução 1', 'execução 2', 'igual?']), ...det.map(([k, x, y]) => `| ${k} | \`${x.slice(0, 16)}…\` | \`${y.slice(0, 16)}…\` | ${x === y ? '✔' : '✘'} |`), '', `Hashes completos no JSON. Resultado: **${detOk ? 'determinístico' : 'NÃO determinístico'}**.`, ''];
const final = `${a.report}\n${tail.join('\n')}`;
mkdirSync(join(ROOT, 'reports'), { recursive: true });
writeFileSync(join(ROOT, 'reports/development-feedback-season-01.md'), final);
writeFileSync(join(ROOT, 'reports/development-feedback-season-01.json'), JSON.stringify({ ...a.data, determinism: Object.fromEntries(det.map(([k, x, y]) => [k, { run1: x, run2: y, equal: x === y }])) }));
console.log(final);
if (a.errors.length || !detOk) process.exitCode = 1;
