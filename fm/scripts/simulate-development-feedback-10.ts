// DEV-INTEGRATION-0.2 — INTEGRAÇÃO EXPERIMENTAL DE DESENVOLVIMENTO POR 10 TEMPORADAS (NÃO integrado ao produto;
// Engine 0.2.0 intocado). Dois mundos com a mesma seed, universo e regras do jogo (calendário, acesso/rebaixamento,
// transferências da CPU, renovações, base, aposentadoria, finanças, lesões, suspensões):
//   A — Controle:        força fixa (checkpoints antigos de progression.ts desligados: evolution: false)
//   B — Desenvolvimento: strengthBase → DEV-PROTO-0.4-B → strengthCurrent → Engine 0.2.0 (feedback.ts entre rodadas)
// A única intervenção é withDevelopedStrength; tudo o mais é do jogo/engine. Roda duas vezes e compara hashes.
// Uso: npm run development:feedback10  →  reports/development-feedback-10-seasons.{md,json}
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRound, roundResults, simulateRound, type MatchState, type Player, type World } from '../engine/index.ts';
import { careerOffers, isSeasonOver, type CareerState } from '../game/career.ts';
import { newManagedCareer } from '../game/manager/actions.ts';
import { finishManagedRound, planManagedRound, startManagedSeason } from '../game/manager/flow.ts';
import { devProto04, matchPerformance, type MatchEvidence, type PlayerDevelopment } from '../game/development/development.ts';
import { evidenceFromMatch } from '../game/development/evidence.ts';
import { POSITION, stepDevelopment, withDevelopedStrength } from '../game/development/feedback.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 'elite-dev-world-10';
const SEASONS = Number(process.env.DEV_SEASONS ?? 10); // só para depuração; o relatório oficial usa 10
const ROUNDS = 38;
const CFG = devProto04('B', 'B');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const SEASON_LIST = Array.from({ length: SEASONS }, (_, i) => i + 1);

interface MatchRow { season: number; round: number; div: number; matchId: string; home: string; away: string; hg: number; ag: number; hc: number; ac: number; hs: number; as: number }
interface Usage { minutes: number; apps: number; perfSum: number }
interface Move { id: string; season: number; fromDiv: number; toDiv: number; strength: number }
interface SeasonSnap { strength: Map<string, number>; club: Map<string, string>; divComp: string; divMeans: Record<number, number>; money: Map<string, number> }
interface WorldRun {
  matches: MatchRow[];
  roundKeys: string[];
  fixtures: string[];
  scoreHash: string;
  start: World;
  firstSeasonWorlds: string[];
  usage: Map<string, Usage>;
  division: Map<string, number>;
  snaps: SeasonSnap[];
  seasonStartDivComp: string[];
  devs: Map<string, PlayerDevelopment> | null;
  everHit1: Set<string>;
  everHit50: Set<string>;
  moves: Move[];
  info: Map<string, Player>;
  evoHash: string;
  errors: string[];
}

const divLevel = (w: World, clubId: string | null) => (clubId ? (w.divisions.find((d) => d.id === w.clubs[clubId]?.divisionId)?.level ?? 0) : 0);
const worldKey = (w: World) => sha(JSON.stringify(w));
const maskStrength = (w: World) => JSON.stringify({ ...w, players: Object.fromEntries(Object.entries(w.players).map(([id, p]) => [id, { ...p, strength: 0 }])) });
const divOrder = (w: World) => [...w.divisions].sort((a, b) => a.level - b.level).map((d) => `${d.level}:${d.clubIds.join(',')}`).join('|');
const divComp = (w: World) => w.divisions.map((d) => `${d.level}:${[...d.clubIds].sort().join(',')}`).sort().join('|');
const divMeans = (w: World) => Object.fromEntries(w.divisions.map((d) => [d.level, mean(d.clubIds.flatMap((cid) => w.clubs[cid].squad.map((pid) => w.players[pid]?.strength).filter((x): x is number => x !== undefined)))]));
const startersOf = (m: MatchState, side: 'home' | 'away', ev: ReturnType<typeof evidenceFromMatch>) => Object.keys(m[side].players).filter((id) => ev.get(id)?.started);

function runWorld(develop: boolean): WorldRun {
  let c: CareerState = newManagedCareer(SEED, 'Simulação', careerOffers(SEED)[0]);
  const start = c.world;
  const hash = createHash('sha256');
  const evo = createHash('sha256');
  const r: WorldRun = { matches: [], roundKeys: [], fixtures: [], scoreHash: '', start, firstSeasonWorlds: [], usage: new Map(), division: new Map(), snaps: [], seasonStartDivComp: [], devs: null, everHit1: new Set(), everHit50: new Set(), moves: [], info: new Map(), evoHash: '', errors: [] };
  let devs: Map<string, PlayerDevelopment> = new Map();
  const fixed = new Map<string, number>(); // Controle: força do 1º encontro
  const remember = (w: World) => { for (const p of Object.values(w.players)) { if (!r.info.has(p.id)) r.info.set(p.id, p); if (!fixed.has(p.id)) fixed.set(p.id, p.strength); } };
  remember(start);
  for (let season = 1; season <= SEASONS; season++) {
    r.seasonStartDivComp.push(divOrder(c.world));
    for (let round = 1; round <= ROUNDS; round++) {
      const plan = planManagedRound(c);
      r.roundKeys.push(`${season}|${round}|${plan.roundId}|${plan.seed}`);
      r.fixtures.push(plan.fixtures.map((f) => `${f.matchId}:${f.home.club.id}-${f.away.club.id}`).join(','));
      const w0 = c.world;
      for (const p of Object.values(w0.players)) if (p.clubId && !r.division.has(`${season}|${p.id}`)) r.division.set(`${season}|${p.id}`, divLevel(w0, p.clubId));
      const sim = simulateRound(createRound(plan.roundId, plan.seed, plan.fixtures, null));
      const results = roundResults(sim);
      for (const x of results) hash.update(`${season}|${round}|${x.matchId}|${x.homeGoals}-${x.awayGoals};`);
      for (const m of sim.matches) {
        const ev = evidenceFromMatch(m);
        const st = (side: 'home' | 'away') => { const ids = startersOf(m, side, ev); return ids.reduce((a, id) => a + m[side].players[id].strength, 0) / Math.max(1, ids.length); };
        r.matches.push({ season, round, div: divLevel(w0, m.home.clubId), matchId: m.matchId, home: m.home.clubId, away: m.away.clubId, hg: m.score.home, ag: m.score.away, hc: m.stats.home.chances, ac: m.stats.away.chances, hs: st('home'), as: st('away') });
        for (const [id, e] of ev) {
          if (!e.played) continue;
          const k = `${season}|${id}`;
          const u = r.usage.get(k) ?? { minutes: 0, apps: 0, perfSum: 0 };
          u.minutes += e.minutes; u.apps++; u.perfSum += matchPerformance({ ...e, injured: false } as MatchEvidence, POSITION[w0.players[id].position]);
          r.usage.set(k, u);
        }
      }
      if (develop) devs = stepDevelopment(devs, w0, sim.matches, season, round, CFG);
      c = finishManagedRound(c, results, sim.matches, { evolution: false }).career;
      remember(c.world);
      if (season === 1) r.firstSeasonWorlds.push(worldKey(c.world));
      if (develop) {
        const composed = withDevelopedStrength(c.world, devs);
        if (maskStrength(composed) !== maskStrength(c.world)) r.errors.push(`T${season} R${round}: a composição alterou algo além de Player.strength`);
        c = { ...c, world: composed };
        if (round % CFG.windowRounds === 0 || round === ROUNDS) for (const d of devs.values()) { if (d.strengthCurrent === 1 && d.strengthBase > 1) r.everHit1.add(d.playerId); if (d.strengthCurrent === 50 && d.strengthBase < 50) r.everHit50.add(d.playerId); }
        evo.update(`${season}|${round}|${[...devs.values()].map((d) => `${d.playerId}:${d.strengthCurrent}:${d.progress.toFixed(6)}`).join(',')};`);
      } else {
        for (const p of Object.values(c.world.players)) if (p.strength !== fixed.get(p.id)) r.errors.push(`Controle T${season} R${round}: força de ${p.id} mudou`);
      }
    }
    if (!isSeasonOver(c)) throw new Error('temporada incompleta');
    const w = c.world;
    const clubbed = Object.values(w.players).filter((p) => p.clubId);
    r.snaps.push({ strength: new Map(clubbed.map((p) => [p.id, p.strength])), club: new Map(clubbed.map((p) => [p.id, p.clubId!])), divComp: divComp(w), divMeans: divMeans(w), money: new Map(Object.values(w.clubs).map((cl) => [cl.id, cl.money])) });
    if (season < SEASONS) {
      const before = c.world;
      c = startManagedSeason(c, { evolution: false }).career;
      const after = c.world;
      remember(after);
      for (const p of Object.values(after.players)) {
        const b = before.players[p.id];
        if (!b) continue;
        if (b.strength !== p.strength) r.errors.push(`virada ${season}→${season + 1}: a lógica do jogo alterou a força de ${p.id}`);
        if (develop && devs.has(p.id) && devs.get(p.id)!.strengthCurrent !== p.strength) r.errors.push(`virada ${season}→${season + 1}: ${p.id} perdeu strengthCurrent`);
        if (b.clubId && p.clubId && b.clubId !== p.clubId) {
          const fromDiv = divLevel(before, b.clubId), toDiv = divLevel(after, p.clubId);
          if (fromDiv !== toDiv) r.moves.push({ id: p.id, season: season + 1, fromDiv, toDiv, strength: p.strength });
        }
      }
    }
  }
  r.scoreHash = hash.digest('hex');
  r.devs = develop ? devs : null;
  r.evoHash = develop ? evo.digest('hex') : '';
  return r;
}

// ---------- utilitários ----------
function mean(v: number[]) { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; }
const pct = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const f1 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') : '–');
const f2 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') : '–');
const f3 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 1000) / 1000).toFixed(3).replace('.', ',') : '–');
const pc = (v: number) => (Number.isFinite(v) ? `${f1(v * 100)}%` : '–');
const sg = (v: number, f = (x: number) => String(x)) => (!Number.isFinite(v) ? '–' : v > 0 ? `+${f(v)}` : f(v));
const pp = (v: number) => `${sg(v * 100, f1)} p.p.`;
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
// [rótulo, formato, valor, tipo do Δ]
const EM_ROWS: [string, (m: EM) => string, (m: EM) => number, 'int' | 'num' | 'pct'][] = [
  ['partidas', (m) => String(m.n), (m) => m.n, 'int'],
  ['gols por partida', (m) => f3(m.goalsPerMatch), (m) => m.goalsPerMatch, 'num'],
  ['gols por time', (m) => f3(m.goalsPerTeam), (m) => m.goalsPerTeam, 'num'],
  ['chances por partida', (m) => f2(m.chancesPerMatch), (m) => m.chancesPerMatch, 'num'],
  ['conversão (gols/chances)', (m) => pc(m.conversion), (m) => m.conversion, 'pct'],
  ['vitória mandante', (m) => pc(m.home), (m) => m.home, 'pct'],
  ['empate', (m) => pc(m.draw), (m) => m.draw, 'pct'],
  ['vitória visitante', (m) => pc(m.away), (m) => m.away, 'pct'],
  ['jogos com favorito', (m) => String(m.favN), (m) => m.favN, 'int'],
  ['vitória do favorito', (m) => pc(m.favWin), (m) => m.favWin, 'pct'],
  ['empate (com favorito)', (m) => pc(m.favDraw), (m) => m.favDraw, 'pct'],
  ['vitória do azarão', (m) => pc(m.dogWin), (m) => m.dogWin, 'pct'],
  ['diferença média de força (titulares)', (m) => f2(m.strengthDiff), (m) => m.strengthDiff, 'num'],
  ['diferença média de gols', (m) => f3(m.goalDiff), (m) => m.goalDiff, 'num'],
  ['0×0', (m) => pc(m.s00), (m) => m.s00, 'pct'],
  ['1×0', (m) => pc(m.s10), (m) => m.s10, 'pct'],
  ['1×1', (m) => pc(m.s11), (m) => m.s11, 'pct'],
  ['2×1', (m) => pc(m.s21), (m) => m.s21, 'pct'],
  ['3×1', (m) => pc(m.s31), (m) => m.s31, 'pct'],
  ['4+ gols', (m) => pc(m.g4), (m) => m.g4, 'pct'],
  ['5+ gols', (m) => pc(m.g5), (m) => m.g5, 'pct'],
  ['7+ gols', (m) => pc(m.g7), (m) => m.g7, 'pct'],
];
const delta = (kind: 'int' | 'num' | 'pct', d: number) => (kind === 'pct' ? pp(d) : kind === 'int' ? sg(d) : sg(d, f3));
const dist = (v: number[]) => ({ mean: mean(v), median: pct(v, 0.5), p10: pct(v, 0.1), p90: pct(v, 0.9), b1: v.filter((x) => x <= 10).length, b2: v.filter((x) => x > 10 && x <= 20).length, b3: v.filter((x) => x > 20 && x <= 30).length, b4: v.filter((x) => x > 30 && x <= 40).length, b5: v.filter((x) => x > 40).length, eq50: v.filter((x) => x === 50).length, eq1: v.filter((x) => x === 1).length, n: v.length });

function experiment() {
  const ctl = runWorld(false);
  const dev = runWorld(true);
  const devs = dev.devs!;
  const errors: string[] = [...ctl.errors, ...dev.errors];
  const derived: string[] = [];

  // ---------- divergências obrigatoriamente nulas ----------
  if (worldKey(ctl.start) !== worldKey(dev.start)) errors.push('universo inicial diferente');
  const keyDiff = ctl.roundKeys.filter((k, i) => k !== dev.roundKeys[i]).length;
  if (keyDiff) errors.push(`id/seed de rodada diferentes em ${keyDiff} rodada(s)`);
  const sameDivSeasons = SEASON_LIST.filter((s) => ctl.seasonStartDivComp[s - 1] === dev.seasonStartDivComp[s - 1]);
  let fixtureErr = 0, fixtureDerived = 0;
  ctl.fixtures.forEach((f, i) => { if (f === dev.fixtures[i]) return; const s = Math.floor(i / ROUNDS) + 1; if (sameDivSeasons.includes(s)) fixtureErr++; else fixtureDerived++; });
  if (fixtureErr) errors.push(`calendário/mandos diferentes em ${fixtureErr} rodada(s) de temporadas com divisões iguais (mesmos clubes, mesma ordem)`);
  const firstChange = Math.min(ROUNDS, ...[...devs.values()].flatMap((d) => d.history.filter((h) => h.season === 1 && h.to !== h.from).map((h) => h.round)));
  for (let i = 0; i < firstChange; i++) if (ctl.firstSeasonWorlds[i] !== dev.firstSeasonWorlds[i]) errors.push(`mundo diferente na T1 R${i + 1}, antes de qualquer mudança de força`);
  const early = (w: WorldRun) => w.matches.filter((m) => m.season === 1 && m.round <= firstChange).map((m) => `${m.matchId}:${m.hg}-${m.ag}`).join(',');
  if (early(ctl) !== early(dev)) errors.push(`placares da T1 até a rodada ${firstChange} diferentes`);
  const STATIC: (keyof Player)[] = ['name', 'nationality', 'position', 'temperament'];
  let staticDiff = 0;
  for (const [id, a] of ctl.info) { const b = dev.info.get(id); if (b && STATIC.some((k) => a[k] !== b[k])) staticDiff++; }
  if (staticDiff) errors.push(`${staticDiff} jogador(es) com o mesmo id e identidade diferente`);
  const strengthTouched = [...devs.values()].filter((d) => d.strengthBase !== (dev.info.get(d.playerId)?.strength ?? d.strengthBase)).length;
  if (strengthTouched) errors.push(`${strengthTouched} strengthBase diferente(s) da força do 1º encontro`);

  // ---------- divergências derivadas (efeito da força) ----------
  const firstDiff = ctl.matches.findIndex((m, i) => m.hg !== dev.matches[i].hg || m.ag !== dev.matches[i].ag);
  const sameSetSeasons = SEASON_LIST.filter((s) => s === 1 || ctl.snaps[s - 2].divComp === dev.snaps[s - 2].divComp);
  derived.push(`id e seed das ${SEASONS * ROUNDS} rodadas idênticos. Temporadas que começam com os mesmos clubes em cada divisão: ${sameSetSeasons.map((s) => `T${s}`).join(', ')}; com os mesmos clubes NA MESMA ORDEM (a ordem vem da classificação final, via applyPromotionRelegation, e define o sorteio do calendário): ${sameDivSeasons.map((s) => `T${s}`).join(', ')} — calendário idêntico nestas. Rodadas com calendário diferente por divisões/ordem diferentes: ${fixtureDerived}`);
  derived.push(`primeiro placar diferente: T${ctl.matches[firstDiff]?.season ?? '—'} R${ctl.matches[firstDiff]?.round ?? '—'}`);
  const onlyIn = (a: WorldRun, b: WorldRun) => [...a.info.keys()].filter((id) => !b.info.has(id)).length;
  derived.push(`jogadores que só existem em um mundo (base gerada por necessidade do elenco): ${onlyIn(ctl, dev)} só no Controle, ${onlyIn(dev, ctl)} só no Desenvolvimento`);
  derived.push(`transferências entre divisões na intertemporada: Controle ${ctl.moves.length}, Desenvolvimento ${dev.moves.length}`);

  // ---------- por temporada ----------
  const seasonRows = SEASON_LIST.map((s) => {
    const cs = ctl.snaps[s - 1], ds = dev.snaps[s - 1];
    const cm = ctl.matches.filter((m) => m.season === s), dm = dev.matches.filter((m) => m.season === s);
    const scoreDiff = cm.filter((m, i) => m.hg !== dm[i].hg || m.ag !== dm[i].ag || m.matchId !== dm[i].matchId).length;
    const levelMap = (comp: string) => new Map(comp.split('|').flatMap((x) => { const [lv, ids] = x.split(':'); return ids.split(',').map((id) => [id, lv] as const); }));
    const ca = levelMap(cs.divComp), da = levelMap(ds.divComp);
    const clubDiv = [...ca.entries()].filter(([id, lv]) => da.get(id) !== lv).length;
    const prevDev = s > 1 ? dev.snaps[s - 2].strength : null;
    const ch = [...ds.strength.entries()].map(([id, v]) => [id, v - (prevDev?.get(id) ?? devs.get(id)?.strengthBase ?? v)] as const).filter(([id]) => devs.has(id));
    const moved = ch.filter(([, d]) => d !== 0);
    return {
      s, c: dist([...cs.strength.values()]), d: dist([...ds.strength.values()]), ec: engineMetrics(cm), ed: engineMetrics(dm), scoreDiff, clubDiv,
      changed: moved.length, up: moved.filter(([, d]) => d > 0).length, down: moved.filter(([, d]) => d < 0).length, mag: mean(moved.map(([, d]) => Math.abs(d))), meanDelta: mean(ch.map(([, d]) => d)),
      maxUp: Math.max(...ch.map(([, d]) => d)), maxDown: Math.min(...ch.map(([, d]) => d)),
      cDiv: cs.divMeans, dDiv: ds.divMeans,
      moneyDiff: [...cs.money.entries()].filter(([id, v]) => ds.money.get(id) !== v).length,
    };
  });
  // retroalimentação pela tabela: variação na temporada dos jogadores dos 4 primeiros × 4 últimos de cada divisão
  const levels = [1, 2, 3, 4];
  const tableFeedback = SEASON_LIST.map((s) => {
    const pts = new Map<string, number>();
    const divOfClub = new Map<string, number>();
    for (const m of dev.matches.filter((x) => x.season === s)) {
      divOfClub.set(m.home, m.div); divOfClub.set(m.away, m.div);
      pts.set(m.home, (pts.get(m.home) ?? 0) + (m.hg > m.ag ? 3 : m.hg === m.ag ? 1 : 0));
      pts.set(m.away, (pts.get(m.away) ?? 0) + (m.ag > m.hg ? 3 : m.hg === m.ag ? 1 : 0));
    }
    const end = dev.snaps[s - 1], prev = s > 1 ? dev.snaps[s - 2].strength : null;
    return levels.map((lv) => {
      const order = [...divOfClub.entries()].filter(([, l]) => l === lv).map(([id]) => id).sort((a, b) => (pts.get(b) ?? 0) - (pts.get(a) ?? 0) || a.localeCompare(b));
      const g = (cids: string[]) => mean([...end.club.entries()].filter(([id, cl]) => cids.includes(cl) && devs.has(id)).map(([id]) => end.strength.get(id)! - (prev?.get(id) ?? devs.get(id)!.strengthBase)));
      return g(order.slice(0, 4)) - g(order.slice(-4));
    });
  });

  // ---------- acumulado (10 temporadas) ----------
  const s1Start = new Set(Object.values(dev.start.players).filter((p) => p.clubId).map((p) => p.id));
  const sameSet = [...dev.snaps[SEASONS - 1].strength.keys()].filter((id) => s1Start.has(id));
  const sameSetDelta = mean(sameSet.map((id) => dev.snaps[SEASONS - 1].strength.get(id)! - devs.get(id)!.strengthBase));
  const allD = [...devs.values()].map((d) => d.strengthCurrent - d.strengthBase);
  const acc = { maxGain: Math.max(...allD), maxDrop: Math.min(...allD), up5: allD.filter((x) => x >= 5).length, dn5: allD.filter((x) => x <= -5).length, up10: allD.filter((x) => x >= 10).length, dn10: allD.filter((x) => x <= -10).length, hit1: dev.everHit1.size, hit50: dev.everHit50.size, n: devs.size };
  const emC = engineMetrics(ctl.matches), emD = engineMetrics(dev.matches);

  // ---------- critérios de segurança (por temporada) ----------
  const gap = (o: Record<number, number>, a: number, b: number) => o[a] - o[b];
  const SAFETY: [string, string, (r: (typeof seasonRows)[number], i: number) => boolean][] = [
    ['inflação/deflação forte', 'média do mundo B − média do mundo A, em módulo, > 2,0', (r) => Math.abs(r.d.mean - r.c.mean) > 2],
    ['concentração em 50', 'jogadores com exatamente 50: B − A > 5', (r) => r.d.eq50 - r.c.eq50 > 5],
    ['concentração em 1', 'jogadores com exatamente 1: B − A > 10', (r) => r.d.eq1 - r.c.eq1 > 10],
    ['mudança extrema de gols', 'gols por partida B/A − 1, em módulo, > 5%', (r) => Math.abs(r.ed.goalsPerMatch / r.ec.goalsPerMatch - 1) > 0.05],
    ['mudança extrema de conversão', 'conversão B/A − 1, em módulo, > 5%', (r) => Math.abs(r.ed.conversion / r.ec.conversion - 1) > 0.05],
    ['favorito dominante demais', 'vitória do favorito B − A > +5 p.p.', (r) => r.ed.favWin - r.ec.favWin > 0.05],
    ['divisão inferior forte demais', 'distância entre divisões vizinhas em B < 75% da de A, ou invertida', (r) => levels.slice(1).some((lv) => gap(r.dDiv, lv - 1, lv) < 0.75 * gap(r.cDiv, lv - 1, lv) || gap(r.dDiv, lv - 1, lv) < 0)],
    ['retroalimentação positiva explosiva', 'topo 4 − fundo 4 > +1,0 numa divisão, ou variação média da temporada > +0,5 e crescendo 3 temporadas seguidas', (r, i) => tableFeedback[i].some((x) => x > 1) || (r.meanDelta > 0.5 && i >= 2 && seasonRows[i - 1].meanDelta < r.meanDelta && seasonRows[i - 2].meanDelta < seasonRows[i - 1].meanDelta)],
  ];
  const safety = SAFETY.map(([k, m, f]) => { const hits = seasonRows.filter((r, i) => f(r, i)).map((r) => r.s); return { k, m, hits }; });
  const tripped = safety.filter((x) => x.hits.length);

  // ---------- casos ----------
  const u = (s: number, id: string) => dev.usage.get(`${s}|${id}`) ?? { minutes: 0, apps: 0, perfSum: 0 };
  const share = (s: number, id: string) => u(s, id).minutes / (ROUNDS * 90);
  const perf = (s: number, id: string) => (u(s, id).apps ? u(s, id).perfSum / u(s, id).apps : NaN);
  const d1 = (id: string) => dev.division.get(`1|${id}`);
  const base = (id: string) => devs.get(id)?.strengthBase ?? NaN;
  const age0 = (id: string) => dev.start.players[id]?.age ?? dev.info.get(id)!.age;
  const env1 = dev.snaps.length ? divMeans(dev.start) : {};
  const ids1 = [...devs.keys()].filter((id) => s1Start.has(id)).sort();
  const pick = (f: (id: string) => boolean, score: (id: string) => number) => ids1.filter(f).sort((a, b) => score(a) - score(b) || a.localeCompare(b))[0] ?? null;
  const mv = [...dev.moves].sort((a, b) => b.toDiv - b.fromDiv - (a.toDiv - a.fromDiv) || a.season - b.season || a.id.localeCompare(b.id));
  const upMove = dev.moves.filter((m) => m.toDiv < m.fromDiv).sort((a, b) => a.season - b.season || b.strength - a.strength || a.id.localeCompare(b.id))[0];
  const CASES: [string, string | null, string][] = [
    ['jovem fraco titular na D1', pick((id) => age0(id) <= 21 && d1(id) === 1 && share(1, id) >= 0.6 && base(id) < env1[1], base), 'até 21 anos, D1, ≥ 60% dos minutos na T1, força abaixo da média da D1; o mais fraco'],
    ['jovem fraco reserva na D1', pick((id) => age0(id) <= 21 && d1(id) === 1 && share(1, id) < 0.25 && base(id) < env1[1], base), 'até 21 anos, D1, < 25% dos minutos na T1, força abaixo da média da D1; o mais fraco'],
    ['jovem forte titular na D4', pick((id) => age0(id) <= 21 && d1(id) === 4 && share(1, id) >= 0.6, (id) => -base(id)), 'até 21 anos, D4, ≥ 60% dos minutos na T1; o mais forte'],
    ['veterano bom titular', pick((id) => age0(id) >= 31 && share(1, id) >= 0.7 && perf(1, id) > 0, (id) => -perf(1, id)), '31+, ≥ 70% dos minutos na T1; maior rendimento médio'],
    ['veterano ruim titular', pick((id) => age0(id) >= 31 && share(1, id) >= 0.7, (id) => perf(1, id)), '31+, ≥ 70% dos minutos na T1; menor rendimento médio'],
    ['veterano sem minutos', pick((id) => age0(id) >= 31 && u(1, id).minutes === 0, (id) => -base(id)), '31+, zero minutos na T1; o mais forte'],
    ['estrela 46+', pick((id) => base(id) >= 46, (id) => -base(id) * 1000 + share(1, id)), 'força inicial ≥ 46; a mais forte'],
    ['transferido entre divisões', upMove?.id ?? mv[0]?.id ?? null, 'primeira transferência da CPU para uma divisão de cima (mundo B); a mais forte da temporada'],
  ];

  // ---------- relatório ----------
  const L: string[] = ['# DEV-INTEGRATION-0.2 — integração experimental de desenvolvimento por 10 temporadas', '', '> **Simulação/validação EXPERIMENTAL.** Não é integração oficial; nada entra no produto, nos saves, na UI, no gameplay, no calendário ou no deploy. Engine 0.2.0 intocado. Nenhum balanceamento foi alterado. A única diferença entre os mundos é `Player.strength` = strengthCurrent no mundo B.', ''];
  L.push('## Configuração', '');
  L.push(`- Candidata: **${CFG.version}** (DEV-PROTO-0.4-B): limite conjunto −0,75/temporada sem participação; preservação parcial; divisão como oportunidade (peso ${CFG.divisionWeight}); sem piso de strengthBase; curva de idade inalterada.`);
  L.push(`- Seed \`${SEED}\`, universo fictício, carreira gerenciada sem decisões manuais, ${SEASONS} temporadas × ${ROUNDS} rodadas, ${ctl.matches.length} partidas por mundo.`);
  L.push('- Regras do jogo ativas nos dois mundos: calendário, acesso/rebaixamento, transferências e renovações da CPU, base (juniores), aposentadoria aos 37 e de livres 34+, finanças, lesões, suspensões, demissão do treinador.');
  L.push('- **Mundo A — Controle:** força fixa. Os checkpoints antigos de evolução (`progression.ts`, rodada 19 e fim da temporada) ficam desligados (`evolution: false`) nos DOIS mundos; juniores entram com a força gerada e ela não muda.');
  L.push('- **Mundo B — Desenvolvimento:** após cada rodada, `stepDevelopment` observa as partidas e `withDevelopedStrength` devolve o mundo com Player.strength = strengthCurrent (±1 só no fim das janelas: rodadas 5, 10, …, 35, 38).');
  L.push('- Efeitos derivados esperados: escalação da CPU, placares, tabela, acesso/rebaixamento, mercado da CPU (escolhe por força), base (repõe elencos curtos), caixa e calendário das temporadas seguintes podem mudar porque a força mudou.', '');

  L.push('## Auditoria antes da simulação', '');
  L.push('- **Temporada começa:** `newManagedCareer` (T1) e `startManagedSeason` (viradas): empréstimos voltam, renovações da CPU, livres 34+ se aposentam, `startNextSeason` (acesso/rebaixamento + calendário novo da mesma seed), `agePlayers` (+1 ano, aposenta aos 37), `cpuTransfers`, `youthIntake`.');
  L.push('- **Rodada avança:** `planManagedRound` (escalações, público, árbitros) → `simulateRound(createRound(...))` (Engine 0.2.0) → `roundResults` → `finishManagedRound` (tabela, lesões/suspensões, finanças, estatísticas).');
  L.push('- **Jogador entra em campo / força consumida:** a escalação automática (`engine/lineup.ts`) ordena por `Player.strength`; o engine lê `MatchPlayer.strength`, copiado de `Player.strength` na montagem da partida. É o único ponto de leitura.');
  L.push('- **Transferência:** `movePlayer` copia o jogador inteiro (`{ ...p, clubId }`) — a força vai junto; salário/contrato mudam por regra do mercado.');
  L.push('- **Promoção/rebaixamento:** `startNextSeason` troca a divisão do CLUBE; a força dos jogadores não é tocada.');
  L.push('- **Desenvolvimento:** só em `game/development/` (development.ts + feedback.ts), chamado apenas por este script; o ambiente é recalculado a cada rodada a partir do clube/divisão atuais.');
  L.push('- **Escritas de força no jogo:** só `progression.ts` (desligado nos dois mundos). `agePlayers`, `cpuRenewals`, `cpuTransfers`, `movePlayer` não alteram a força (conferido em cada virada abaixo).');
  L.push('- **strengthBase não muda:** é fixado no 1º encontro e nunca é reescrito (conferido contra a força do 1º encontro).');
  L.push('- **Transferência mantém strengthCurrent:** conferido em cada virada (força depois = strengthCurrent antes).');
  L.push('- **Nova divisão só muda o ambiente futuro:** nenhuma mudança de força na virada; a 1ª mudança possível é no fim da janela da rodada 5 da temporada seguinte.');
  L.push('- **Engine 0.2.0 inalterado:** nenhum commit em `engine/` desde o snapshot; impressão digital das fontes conferida pelo teste 14 de `data/tests/ratings.test.ts`.', '');

  L.push('## Divergências', '', `**Obrigatoriamente idênticos (divergência = erro):** universo inicial; id e seed das ${SEASONS * ROUNDS} rodadas; calendário e mandos em toda temporada que começa com as divisões iguais nos dois mundos (mesmos clubes, mesma ordem); mundo inteiro e placares da T1 até a 1ª mudança real de força (rodada ${firstChange}); identidade dos jogadores; força fixa no Controle em todas as rodadas; nenhuma alteração de força pela lógica do jogo nas viradas; strengthCurrent preservado nas transferências; a composição só altera Player.strength (todas as rodadas).`, '');
  const uniq = [...new Set(errors)];
  L.push(uniq.length ? uniq.slice(0, 30).map((e) => `- **ERRO:** ${e}`).join('\n') + (uniq.length > 30 ? `\n- … e mais ${uniq.length - 30}` : '') : '- Nenhuma divergência além de strengthCurrent. ✔', '');
  L.push('**Derivadas da força (registradas, esperadas):**', '', ...derived.map((d) => `- ${d}`), '');
  L.push(...H(['Temporada', 'placares diferentes', 'clubes em outra divisão (fim)', 'clubes com caixa diferente']));
  for (const r of seasonRows) L.push(`| ${r.s} | ${r.scoreDiff} / ${r.ec.n} | ${r.clubDiv} | ${r.moneyDiff} |`);
  L.push('');

  L.push('## Desenvolvimento — Controle (A) × Desenvolvimento (B), fim de cada temporada', '', 'Todos os jogadores com clube no fim da temporada em cada mundo.', '', ...H(['T', 'média A', 'média B', 'mediana A/B', 'P10 A/B', 'P90 A/B', '1–10 A/B', '11–20 A/B', '21–30 A/B', '31–40 A/B', '41–50 A/B', '=50 A/B', '=1 A/B']));
  for (const r of seasonRows) L.push(`| ${r.s} | ${f2(r.c.mean)} | ${f2(r.d.mean)} | ${r.c.median}/${r.d.median} | ${r.c.p10}/${r.d.p10} | ${r.c.p90}/${r.d.p90} | ${r.c.b1}/${r.d.b1} | ${r.c.b2}/${r.d.b2} | ${r.c.b3}/${r.d.b3} | ${r.c.b4}/${r.d.b4} | ${r.c.b5}/${r.d.b5} | ${r.c.eq50}/${r.d.eq50} | ${r.c.eq1}/${r.d.eq1} |`);
  L.push('', 'Mudança de força no mundo B em cada temporada (jogadores com desenvolvimento e clube no fim):', '', ...H(['T', 'mudaram', 'subiram', 'caíram', 'magnitude média (quem mudou)', 'variação média', 'maior ganho', 'maior queda']));
  for (const r of seasonRows) L.push(`| ${r.s} | ${r.changed} | ${r.up} | ${r.down} | ${f2(r.mag)} | ${sg(r.meanDelta, f3)} | ${sg(r.maxUp)} | ${sg(r.maxDown)} |`);
  L.push('', `**Acumulado (strengthCurrent − strengthBase, ${acc.n} jogadores que tiveram desenvolvimento):** maior ganho ${sg(acc.maxGain)}, maior queda ${sg(acc.maxDrop)}; +5 ou mais: ${acc.up5}; −5 ou mais: ${acc.dn5}; +10 ou mais: ${acc.up10}; −10 ou mais: ${acc.dn10}; chegaram a 50 alguma vez: ${acc.hit50}; chegaram a 1 alguma vez: ${acc.hit1}. Mesmo conjunto (${sameSet.length} jogadores em clube no início da T1 e no fim da T${SEASONS}): variação média ${sg(sameSetDelta, f2)}.`, '');
  if (dev.everHit1.size) {
    const b = [...dev.everHit1].map((id) => devs.get(id)!.strengthBase);
    L.push(`Quem chegou a 1: força inicial ≤ 10: ${b.filter((x) => x <= 10).length}; 11–15: ${b.filter((x) => x > 10 && x <= 15).length}; 16+: ${b.filter((x) => x > 15).length}.`, '');
  }

  L.push('## Engine — Controle (A) × Desenvolvimento (B)', '', '### 10 temporadas', '', ...H(['Métrica', 'A', 'B', 'Δ']));
  for (const [lab, f, v, k] of EM_ROWS) L.push(`| ${lab} | ${f(emC)} | ${f(emD)} | ${delta(k, v(emD) - v(emC))} |`);
  L.push('', 'Favorito = time com maior força média dos titulares do apito inicial (força que o engine recebeu naquela partida).', '', '### Por temporada', '', ...H(['T', 'gols/partida A', 'B', 'conversão A', 'B', 'favorito vence A', 'B', 'azarão vence A', 'B', 'dif. força A', 'B', '4+ A', 'B']));
  for (const r of seasonRows) L.push(`| ${r.s} | ${f3(r.ec.goalsPerMatch)} | ${f3(r.ed.goalsPerMatch)} | ${pc(r.ec.conversion)} | ${pc(r.ed.conversion)} | ${pc(r.ec.favWin)} | ${pc(r.ed.favWin)} | ${pc(r.ec.dogWin)} | ${pc(r.ed.dogWin)} | ${f2(r.ec.strengthDiff)} | ${f2(r.ed.strengthDiff)} | ${pc(r.ec.g4)} | ${pc(r.ed.g4)} |`);
  L.push('', '### Por divisão (10 temporadas)', '');
  for (const lv of levels) {
    const c = engineMetrics(ctl.matches.filter((m) => m.div === lv)), d = engineMetrics(dev.matches.filter((m) => m.div === lv));
    L.push(`**D${lv}**`, '', ...H(['Métrica', 'A', 'B', 'Δ']));
    for (const [lab, f, v, k] of EM_ROWS) L.push(`| ${lab} | ${f(c)} | ${f(d)} | ${delta(k, v(d) - v(c))} |`);
    L.push('');
  }

  L.push('## Divisões', '', 'Força média de todos os jogadores dos elencos no fim de cada temporada (início: A = B).', '', ...H(['T', ...levels.map((lv) => `D${lv} A/B`), 'D1−D2 A/B', 'D2−D3 A/B', 'D3−D4 A/B', 'D1−D4 A/B']));
  const d0 = divMeans(dev.start);
  L.push(`| 0 | ${levels.map((lv) => f2(d0[lv])).join(' | ')} | ${f2(gap(d0, 1, 2))} | ${f2(gap(d0, 2, 3))} | ${f2(gap(d0, 3, 4))} | ${f2(gap(d0, 1, 4))} |`);
  for (const r of seasonRows) L.push(`| ${r.s} | ${levels.map((lv) => `${f2(r.cDiv[lv])}/${f2(r.dDiv[lv])}`).join(' | ')} | ${f2(gap(r.cDiv, 1, 2))}/${f2(gap(r.dDiv, 1, 2))} | ${f2(gap(r.cDiv, 2, 3))}/${f2(gap(r.dDiv, 2, 3))} | ${f2(gap(r.cDiv, 3, 4))}/${f2(gap(r.dDiv, 3, 4))} | ${f2(gap(r.cDiv, 1, 4))}/${f2(gap(r.dDiv, 1, 4))} |`);
  const last = seasonRows[SEASONS - 1];
  const verdict = (a: number, b: number) => (b > a + 0.25 ? 'divergiu' : b < a - 0.25 ? 'convergiu' : 'estável');
  L.push('', `Após ${SEASONS} temporadas (B comparado com A): ${levels.slice(1).map((lv) => `D${lv - 1}−D${lv} ${verdict(gap(last.cDiv, lv - 1, lv), gap(last.dDiv, lv - 1, lv))}`).join('; ')}; D1−D4 ${verdict(gap(last.cDiv, 1, 4), gap(last.dDiv, 1, 4))} (tolerância ±0,25).`, '');

  L.push('## Feedback', '', ...H(['Pergunta', 'Resposta']));
  const tot = { changed: [...devs.values()].filter((d) => d.strengthCurrent !== d.strengthBase) };
  L.push(`| 1. quantos mudaram strengthCurrent (acumulado) | ${tot.changed.length} de ${devs.size} |`);
  L.push(`| 2. magnitude média da mudança (acumulada, quem mudou) | ${f2(mean(tot.changed.map((d) => Math.abs(d.strengthCurrent - d.strengthBase))))} |`);
  L.push(`| 3. mais fortes (acumulado) | ${tot.changed.filter((d) => d.strengthCurrent > d.strengthBase).length} |`);
  L.push(`| 4. mais fracos (acumulado) | ${tot.changed.filter((d) => d.strengthCurrent < d.strengthBase).length} |`);
  L.push(`| 5. chegaram a 50 | ${acc.hit50} |`, `| 6. chegaram a 1 | ${acc.hit1} |`);
  L.push(`| 7. médias por divisão | ${levels.slice(1).map((lv) => `D${lv - 1}−D${lv} ${f2(gap(last.cDiv, lv - 1, lv))} (A) × ${f2(gap(last.dDiv, lv - 1, lv))} (B)`).join('; ')} |`);
  L.push('', 'Retroalimentação pela tabela (mundo B): variação média na temporada dos jogadores dos 4 primeiros − 4 últimos de cada divisão.', '', ...H(['T', 'D1', 'D2', 'D3', 'D4']));
  tableFeedback.forEach((row, i) => L.push(`| ${i + 1} | ${row.map((x) => sg(x, f2)).join(' | ')} |`));
  L.push('');

  L.push('## Casos acompanhados (10 temporadas)', '', 'Escolhidos na T1 (ou na 1ª transferência), no mundo B. "A" = força no Controle (fixa), "B" = strengthCurrent no fim da temporada. Linhas param na aposentadoria.', '');
  for (const [title, id, rule] of CASES) {
    if (!id) { L.push(`### ${title}`, '', `— nenhum jogador com o perfil (${rule}).`, ''); continue; }
    const p = dev.info.get(id)!;
    L.push(`### ${title} — ${p.name} (${POSITION[p.position]}, força inicial ${base(id)})`, '', `Critério: ${rule}.`, '', ...H(['T', 'idade', 'divisão', 'minutos', 'rendimento médio', 'A', 'B', 'Δ temporada']));
    let prev = base(id);
    for (const s of SEASON_LIST) {
      const b = dev.snaps[s - 1].strength.get(id);
      if (b === undefined) { L.push(`| ${s} | — fora de clube ou aposentado | | | | | | |`); break; }
      const a = ctl.snaps[s - 1].strength.get(id);
      const mvH = dev.moves.find((m) => m.id === id && m.season === s);
      L.push(`| ${s} | ${age0(id) + s - 1} | D${dev.division.get(`${s}|${id}`) ?? '?'}${mvH ? ` (transferido da D${mvH.fromDiv})` : ''} | ${u(s, id).minutes} | ${f2(perf(s, id))} | ${a ?? '—'} | ${b} | ${sg(b - prev)} |`);
      prev = b;
    }
    L.push('');
  }

  L.push('## Critérios de segurança', '', ...H(['Critério', 'medida', 'temporadas em que disparou']));
  for (const x of safety) L.push(`| ${x.k} | ${x.m} | ${x.hits.length ? `**${x.hits.map((s) => `T${s}`).join(', ')}**` : 'nenhuma'} |`);
  L.push('', tripped.length ? `**Disparou:** ${tripped.map((t) => `${t.k} (a partir da T${t.hits[0]})`).join('; ')}. Registrado; nenhum balanceamento foi alterado.` : 'Nenhum critério disparou em nenhuma temporada.', '');
  L.push('## Limitações', '', '- Uma seed; carreira sem decisões manuais (o clube do treinador escala o melhor time disponível).', '- Favorito medido pela força média dos titulares; não considera tática nem mando.', '- Os critérios de segurança são limiares de alerta deste relatório, não regras do jogo.', '- Juniores gerados pela base nascem com a força da geração; no mundo B, essa é a strengthBase deles.', '');

  const report = L.join('\n');
  const allIds = [...new Set([...ctl.info.keys(), ...dev.info.keys()])].sort();
  const data = {
    experiment: 'DEV-INTEGRATION-0.2', seed: SEED, seasons: SEASONS, rounds: ROUNDS, config: CFG, reproduce: 'npm run development:feedback10',
    hashes: { scoreControl: ctl.scoreHash, scoreExperimental: dev.scoreHash, evolution: dev.evoHash },
    errors: uniq, derived, safety: safety.map((x) => ({ criterion: x.k, measure: x.m, seasons: x.hits })),
    playersColumns: ['id', 'strengthBase (B)', ...SEASON_LIST.map((s) => `T${s} A`), ...SEASON_LIST.map((s) => `T${s} B`)],
    players: allIds.map((id) => [id, devs.get(id)?.strengthBase ?? null, ...SEASON_LIST.map((s) => ctl.snaps[s - 1].strength.get(id) ?? null), ...SEASON_LIST.map((s) => dev.snaps[s - 1].strength.get(id) ?? null)]),
    scores: { columns: ['season', 'round', 'division', 'matchId', 'A', 'B (matchId se diferente)'], rows: ctl.matches.map((m, i) => { const d = dev.matches[i]; return [m.season, m.round, m.div, m.matchId, `${m.hg}-${m.ag}`, d.matchId === m.matchId ? `${d.hg}-${d.ag}` : `${d.matchId} ${d.hg}-${d.ag}`]; }) },
  };
  return { report, data, scoreControl: ctl.scoreHash, scoreExperimental: dev.scoreHash, evoHash: dev.evoHash, errors: uniq };
}

const a = experiment();
const b = experiment();
const det: [string, string, string][] = [
  ['placares Controle', a.scoreControl, b.scoreControl],
  ['placares Desenvolvimento', a.scoreExperimental, b.scoreExperimental],
  ['evolução (strengthCurrent + progresso por rodada)', a.evoHash, b.evoHash],
  ['relatório (sem esta seção)', sha(a.report), sha(b.report)],
];
const detOk = det.every(([, x, y]) => x === y);
const tail = ['## Determinismo', '', 'O experimento inteiro (A + B, 10 temporadas cada) rodou duas vezes no mesmo processo.', '', ...H(['Hash', 'execução 1', 'execução 2', 'igual?']), ...det.map(([k, x, y]) => `| ${k} | \`${x.slice(0, 16)}…\` | \`${y.slice(0, 16)}…\` | ${x === y ? '✔' : '✘'} |`), '', `Hashes completos no JSON. Resultado: **${detOk ? 'determinístico' : 'NÃO determinístico'}**.`, ''];
const final = `${a.report}\n${tail.join('\n')}`;
mkdirSync(join(ROOT, 'reports'), { recursive: true });
writeFileSync(join(ROOT, 'reports/development-feedback-10-seasons.md'), final);
writeFileSync(join(ROOT, 'reports/development-feedback-10-seasons.json'), JSON.stringify({ ...a.data, determinism: Object.fromEntries(det.map(([k, x, y]) => [k, { run1: x, run2: y, equal: x === y }])) }));
console.log(final);
if (a.errors.length || !detOk) process.exitCode = 1;
