// VALIDAÇÃO do protótipo PlayerDevelopment (DEV-PROTO-0.2) no MUNDO REAL do engine: 10 temporadas do universo fictício.
// Nada é integrado ao jogo e nada muda no engine.
//
// MUNDO A (controle): a carreira gerenciada exatamente como o jogo roda hoje (evolução em uso: progression.ts).
// MUNDO B: a camada DEV-PROTO-0.2 em modo OBSERVADOR. Lê os eventos que o Engine 0.2.0 já produziu para o mundo A
//   (minutos, substituições, gols, cartões, lesões, defesas, gols sofridos, resultado) e calcula strengthCurrent à parte.
//   Como o B não devolve nada ao engine, os clubes, jogadores, calendários, seeds, decisões e resultados são os mesmos.
//   Limitação (registrada no relatório): o efeito de volta da força do B nas partidas não é medido nesta etapa.
// Determinismo: o mundo A é rodado também SEM o observador e as duas execuções têm de dar o mesmo hash de resultados.
// Uso: npm run development:world  →  reports/development-world-10-seasons.{md,json}
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRound, roundResults, simulateRound, type MatchState, type Player, type World } from '../engine/index.ts';
import { careerOffers, isSeasonOver, type CareerState } from '../game/career.ts';
import { newManagedCareer } from '../game/manager/actions.ts';
import { finishManagedRound, planManagedRound, startManagedSeason } from '../game/manager/flow.ts';
import { evidenceFromMatch } from '../game/development/evidence.ts';
import { DEVELOPMENT_PROTO, developRound, environmentLevel, matchPerformance, newDevelopment, roundPoints, type DevPosition, type MatchEvidence, type PlayerDevelopment } from '../game/development/development.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 'elite-dev-world-10';
const SEASONS = 10;
const ROUNDS = DEVELOPMENT_PROTO.seasonRounds;
const POS: Record<Player['position'], DevPosition> = { GK: 'GOL', DEF: 'DEF', MID: 'MEI', ATT: 'ATA' };

// ---------- registros do observador ----------
interface SeasonLine { pts: { age: number; performance: number; aging: number; idle: number }; season: number; clubId: string | null; division: number | null; age: number; strengthStart: number; strengthEnd: number; strengthA: number; minutes: number; apps: number; starts: number; perfSum: number; injuredRounds: number; ups: number; downs: number; envMean: number; envN: number }
interface Rec { id: string; name: string; position: DevPosition; firstSeason: number; firstAge: number; dev: PlayerDevelopment; seasons: SeasonLine[]; retiredAfter: number | null }
interface Move { playerId: string; season: number; fromClub: string | null; fromDiv: number | null; toClub: string | null; toDiv: number | null; strength: number; envBefore: number | null; envAfter: number | null; strengthAfterFirstRound: number | null; kind: 'transferencia' | 'promocao' | 'rebaixamento' }
interface InjuryRun { playerId: string; season: number; startRound: number; rounds: number; before: number; atStart: number; atEnd: number; after: number | null; endAbs: number }

const divisionOf = (w: World, clubId: string | null) => (clubId ? (w.divisions.find((d) => d.id === w.clubs[clubId]?.divisionId)?.level ?? null) : null);

function run(observe: boolean) {
  const offers = careerOffers(SEED);
  let c: CareerState = newManagedCareer(SEED, 'Simulação', offers[0]);
  const hash = createHash('sha256');
  const recs = new Map<string, Rec>();
  const moves: Move[] = [];
  const injuries: InjuryRun[] = [];
  const openInjury = new Map<string, InjuryRun>();
  const snapshots: Record<number, { base: number[]; current: number[]; a: number[]; byId: Record<string, [number, number, number]> }> = {};
  let abs = 0;
  let lastClub = new Map<string, { club: string | null; div: number | null; env: number | null }>();

  const devStrength = (id: string, w: World) => recs.get(id)?.dev.strengthCurrent ?? w.players[id].strength;
  const envOf = (w: World, clubId: string | null) => (clubId ? environmentLevel(w.clubs[clubId].squad.filter((id) => w.players[id]).map((id) => devStrength(id, w))) : null);
  const ensure = (p: Player, season: number) => {
    let r = recs.get(p.id);
    if (!r) { r = { id: p.id, name: p.name, position: POS[p.position], firstSeason: season, firstAge: p.age, dev: newDevelopment(p.id, p.strength), seasons: [], retiredAfter: null }; recs.set(p.id, r); }
    return r;
  };
  const line = (r: Rec, season: number, w: World) => {
    let l = r.seasons.find((x) => x.season === season);
    if (!l) {
      const p = w.players[r.id];
      l = { pts: { age: 0, performance: 0, aging: 0, idle: 0 }, season, clubId: p.clubId, division: divisionOf(w, p.clubId), age: p.age, strengthStart: r.dev.strengthCurrent, strengthEnd: r.dev.strengthCurrent, strengthA: p.strength, minutes: 0, apps: 0, starts: 0, perfSum: 0, injuredRounds: 0, ups: 0, downs: 0, envMean: 0, envN: 0 };
      r.seasons.push(l);
    }
    return l;
  };
  const snapshot = (k: number, w: World) => {
    const ids = Object.keys(w.players).filter((id) => w.players[id].clubId).sort();
    const byId: Record<string, [number, number, number]> = {};
    for (const id of ids) { const r = recs.get(id); byId[id] = [r?.dev.strengthBase ?? w.players[id].strength, r?.dev.strengthCurrent ?? w.players[id].strength, w.players[id].strength]; }
    snapshots[k] = { base: ids.map((id) => byId[id][0]), current: ids.map((id) => byId[id][1]), a: ids.map((id) => byId[id][2]), byId };
  };
  const trackClubs = (w: World, season: number, kind: 'virada' | 'rodada') => {
    const next = new Map<string, { club: string | null; div: number | null; env: number | null }>();
    for (const p of Object.values(w.players)) {
      const now = { club: p.clubId, div: divisionOf(w, p.clubId), env: envOf(w, p.clubId) };
      next.set(p.id, now);
      const before = lastClub.get(p.id);
      if (!before || !recs.has(p.id)) continue;
      if (before.club !== now.club && now.club) moves.push({ playerId: p.id, season, fromClub: before.club, fromDiv: before.div, toClub: now.club, toDiv: now.div, strength: recs.get(p.id)!.dev.strengthCurrent, envBefore: before.env, envAfter: now.env, strengthAfterFirstRound: null, kind: 'transferencia' });
      else if (kind === 'virada' && before.club === now.club && now.club && before.div !== now.div) moves.push({ playerId: p.id, season, fromClub: before.club, fromDiv: before.div, toClub: now.club, toDiv: now.div, strength: recs.get(p.id)!.dev.strengthCurrent, envBefore: before.env, envAfter: now.env, strengthAfterFirstRound: null, kind: (now.div ?? 9) < (before.div ?? 9) ? 'promocao' : 'rebaixamento' });
    }
    lastClub = next;
  };

  if (observe) {
    for (const p of Object.values(c.world.players)) ensure(p, 1);
    snapshot(0, c.world);
    trackClubs(c.world, 1, 'rodada');
  }

  for (let season = 1; season <= SEASONS; season++) {
    for (let round = 1; round <= ROUNDS; round++) {
      abs++;
      const plan = planManagedRound(c);
      const w0 = c.world;
      const sim = simulateRound(createRound(plan.roundId, plan.seed, plan.fixtures, null));
      const results = roundResults(sim);
      for (const r of results) hash.update(`${season}|${r.matchId}|${r.homeGoals}-${r.awayGoals};`);
      if (observe) {
        const ev = new Map<string, Omit<MatchEvidence, 'injured'>>();
        for (const m of sim.matches) for (const [id, e] of evidenceFromMatch(m)) ev.set(id, e);
        const envByClub = new Map<string, number>();
        for (const clubId of Object.keys(w0.clubs)) envByClub.set(clubId, envOf(w0, clubId) ?? 0);
        const newlyMoved = moves.filter((mv) => mv.strengthAfterFirstRound === null);
        for (const p of Object.values(w0.players)) {
          if (!p.clubId) continue;
          const r = ensure(p, season);
          const l = line(r, season, w0);
          const injured = p.condition.injuryRounds > 0;
          const e: MatchEvidence = ev.get(p.id) ? { ...ev.get(p.id)!, injured: false } : { played: false, minutes: 0, started: false, goals: 0, saves: 0, teamGoalsFor: 0, teamGoalsAgainst: 0, redCard: false, injured };
          const env = envByClub.get(p.clubId) ?? 0;
          const before = r.dev.strengthCurrent;
          const bk = roundPoints(r.dev, { season, round, age: p.age, position: POS[p.position], environmentLevel: env, evidence: e });
          l.pts.age += bk.age; l.pts.performance += bk.performance; l.pts.aging += bk.aging; l.pts.idle += bk.idle;
          r.dev = developRound(r.dev, { season, round, age: p.age, position: POS[p.position], environmentLevel: env, evidence: e });
          if (r.dev.strengthCurrent > before) l.ups++;
          if (r.dev.strengthCurrent < before) l.downs++;
          l.strengthEnd = r.dev.strengthCurrent;
          l.strengthA = p.strength;
          l.envMean += env; l.envN++;
          if (e.played) { l.apps++; l.minutes += e.minutes; l.perfSum += matchPerformance(e, POS[p.position]); if (e.started) l.starts++; }
          if (injured) {
            l.injuredRounds++;
            const o = openInjury.get(p.id);
            if (o) { o.rounds++; o.atEnd = r.dev.strengthCurrent; o.endAbs = abs; } else openInjury.set(p.id, { playerId: p.id, season, startRound: round, rounds: 1, before: before, atStart: before, atEnd: r.dev.strengthCurrent, after: null, endAbs: abs });
          } else {
            const o = openInjury.get(p.id);
            if (o) { if (o.rounds >= 8) injuries.push(o); openInjury.delete(p.id); }
          }
          const mv = newlyMoved.find((x) => x.playerId === p.id);
          if (mv) mv.strengthAfterFirstRound = r.dev.strengthCurrent;
        }
        // força 10 rodadas depois do fim de cada lesão longa
        for (const inj of injuries) if (inj.after === null && abs - inj.endAbs >= 10) inj.after = recs.get(inj.playerId)?.dev.strengthCurrent ?? null;
      }
      c = finishManagedRound(c, results, sim.matches).career;
      if (observe) trackClubs(c.world, season, 'rodada');
    }
    if (!isSeasonOver(c)) throw new Error(`temporada ${season} não terminou`);
    if (observe) {
      if ([1, 3, 5, 10].includes(season)) snapshot(season, c.world);
    }
    if (season < SEASONS) {
      const before = new Set(Object.keys(c.world.players));
      c = startManagedSeason(c).career;
      if (observe) {
        for (const id of before) if (!c.world.players[id] && recs.has(id)) recs.get(id)!.retiredAfter = season;
        trackClubs(c.world, season + 1, 'virada');
      }
    }
  }
  return { hash: hash.digest('hex'), recs, moves, injuries, snapshots, finalWorld: c.world };
}

// ---------- execução: controle sem observador × com observador ----------
const t0 = Date.now();
const control = run(false);
const B = run(true);
console.error(`simulação: ${Math.round((Date.now() - t0) / 1000)}s`);
const sameResults = control.hash === B.hash;

// ---------- análise ----------
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const pct = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const f1 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') : '–');
const sg = (v: number) => (v > 0 ? `+${v}` : `${v}`);
const recs = [...B.recs.values()];
const dist = (v: number[]) => ({ n: v.length, media: mean(v), mediana: pct(v, 0.5), p10: pct(v, 0.1), p25: pct(v, 0.25), p50: pct(v, 0.5), p75: pct(v, 0.75), p90: pct(v, 0.9), p95: pct(v, 0.95), eq1: v.filter((x) => x === 1).length, eq50: v.filter((x) => x === 50).length, b4650: v.filter((x) => x >= 46).length, b4145: v.filter((x) => x >= 41 && x <= 45).length });
const dists = Object.fromEntries(Object.entries(B.snapshots).map(([k, s]) => [k, { base: dist(s.base), current: dist(s.current), a: dist(s.a) }]));

// variação por jogador (do início do registro ao último registro)
const total = recs.filter((r) => r.seasons.length).map((r) => ({ r, delta: r.dev.strengthCurrent - r.dev.strengthBase, last: r.seasons[r.seasons.length - 1] }));
const ageBand = (a: number) => (a <= 20 ? 'até 20' : a <= 23 ? '21–23' : a <= 27 ? '24–27' : a <= 30 ? '28–30' : a <= 33 ? '31–33' : a <= 36 ? '34–36' : '37+');
const AGE_BANDS = ['até 20', '21–23', '24–27', '28–30', '31–33', '34–36', '37+'];
// por temporada (cada linha = um jogador numa temporada)
const seasonLines = recs.flatMap((r) => r.seasons.map((l) => ({ r, l, d: l.strengthEnd - l.strengthStart })));
const share = (l: SeasonLine) => l.minutes / (ROUNDS * 90);
const usage = (l: SeasonLine) => (l.minutes === 0 ? 'sem minutos' : share(l) < 0.15 ? 'poucos minutos' : share(l) < 0.55 ? 'reserva' : 'titular');
const USAGE = ['titular', 'reserva', 'poucos minutos', 'sem minutos'];

// ---------- exemplos reais (critérios automáticos e determinísticos) ----------
const byDelta = [...total].sort((a, b) => b.delta - a.delta || a.r.id.localeCompare(b.r.id));
const pick = (list: typeof total) => list[0] ?? null;
const desc = (x: (typeof total)[number] | null) => (x ? `${x.r.name} (${x.r.position}, ${x.r.firstAge} anos no início, ${x.r.seasons.length} temporadas): ${x.r.dev.strengthBase} → ${x.r.dev.strengthCurrent} (${sg(x.delta)}); mundo A: ${x.last.strengthA}` : '— (nenhum caso)');
const minutesAll = (r: Rec) => r.seasons.reduce((a, l) => a + l.minutes, 0);
const examples: [string, string][] = [
  ['A. jogador fraco que evoluiu (21+ anos no início)', desc(pick(byDelta.filter((x) => x.r.dev.strengthBase <= 18 && x.r.firstAge >= 21 && x.delta > 0)))],
  ['B. jogador forte que permaneceu estável', desc(pick(total.filter((x) => x.r.dev.strengthBase >= 42 && Math.abs(x.delta) <= 1 && x.r.seasons.length >= 5).sort((a, b) => b.r.dev.strengthBase - a.r.dev.strengthBase)))],
  ['C. jogador que caiu', desc(pick([...byDelta].reverse()))],
  ['D. jovem que evoluiu muito', desc(pick(byDelta.filter((x) => x.r.firstAge <= 20)))],
  ['E. veterano', desc(pick(total.filter((x) => x.r.firstAge >= 33 && x.r.seasons.length >= 3).sort((a, b) => minutesAll(b.r) - minutesAll(a.r))))],
  ['F. reserva', desc(pick(total.filter((x) => x.r.seasons.length >= 5 && x.r.seasons.every((l) => usage(l) !== 'titular')).sort((a, b) => b.r.seasons.length - a.r.seasons.length || a.r.id.localeCompare(b.r.id))))],
  ['G. transferido para divisão superior', (() => { const m = B.moves.find((x) => x.kind === 'transferencia' && x.fromDiv !== null && x.toDiv !== null && x.toDiv < x.fromDiv); const r = m && B.recs.get(m.playerId); return r && m ? `${r.name}: D${m.fromDiv} → D${m.toDiv} na T${m.season}, força ${m.strength} na chegada (ambiente ${f1(m.envBefore ?? NaN)} → ${f1(m.envAfter ?? NaN)}); hoje ${r.dev.strengthCurrent}` : '— (nenhum caso)'; })()],
  ['H. transferido para divisão inferior', (() => { const m = B.moves.find((x) => x.kind === 'transferencia' && x.fromDiv !== null && x.toDiv !== null && x.toDiv > x.fromDiv); const r = m && B.recs.get(m.playerId); if (r && m) return `${r.name}: D${m.fromDiv} → D${m.toDiv} na T${m.season}, força ${m.strength} na chegada; hoje ${r.dev.strengthCurrent}`; const rb = B.moves.filter((x) => x.kind === 'rebaixamento' && x.strength >= 35).sort((a, b) => b.strength - a.strength)[0]; const rr = rb && B.recs.get(rb.playerId); return rr && rb ? `nenhuma transferência para divisão inferior no período; pelo rebaixamento do clube: ${rr.name}, D${rb.fromDiv} → D${rb.toDiv} na T${rb.season}, força ${rb.strength} (ambiente ${f1(rb.envBefore ?? NaN)} → ${f1(rb.envAfter ?? NaN)}); hoje ${rr.dev.strengthCurrent}` : '— (nenhum caso)'; })()],
  ['I. jogador que foi titular', desc(pick(total.filter((x) => x.r.seasons.length >= 8 && x.r.seasons.every((l) => usage(l) === 'titular')).sort((a, b) => b.delta - a.delta)))],
  ['J. jogador que perdeu espaço', desc(pick(total.filter((x) => x.r.seasons.length >= 4 && usage(x.r.seasons[0]) === 'titular' && ['poucos minutos', 'sem minutos'].includes(usage(x.r.seasons[x.r.seasons.length - 1]))).sort((a, b) => a.delta - b.delta)))],
];

// ---------- relatório ----------
const L: string[] = ['# PlayerDevelopment no mundo real do engine — 10 temporadas', ''];
L.push(`> DEV-PROTO-0.2 em modo observador sobre o universo fictício (seed \`${SEED}\`, carreira gerenciada sem decisões manuais). Engine 0.2.0 inalterado; nada integrado; nenhuma força aplicada ao jogo.`, '');
L.push('## Determinismo e isolamento', '');
L.push(`- Mundo A sem observador × com observador: hash dos ${SEASONS * ROUNDS * 40} placares **${sameResults ? 'idêntico' : 'DIFERENTE'}** (\`${control.hash.slice(0, 16)}…\`).`);
L.push('- O observador só lê o `MatchState` produzido pelo engine e o estado da carreira; não escreve em nenhum deles. O mundo B nunca devolve força ao engine.');
L.push('- **Limitação:** como o B é observador, o efeito de volta (jogador que evolui → joga melhor → rende mais) não é medido aqui. Ele exige integrar a força do B nas partidas, o que muda os resultados (etapa futura, com aprovação).', '');

L.push('## 1–5. Distribuição (jogadores com clube)', '');
const D = (label: string, k: string) => { const d = dists[k]; return d ? [[`${label} — força base`, d.base], [`${label} — força atual B`, d.current], [`${label} — mundo A (evolução em uso)`, d.a]] as [string, ReturnType<typeof dist>][] : []; };
const rowsD = [...D('Início', '0'), ...D('Após 1 temporada', '1'), ...D('Após 3', '3'), ...D('Após 5', '5'), ...D('Após 10', '10')];
L.push('| | n | média | mediana | P10 | P25 | P50 | P75 | P90 | P95 | =1 | =50 | 46–50 | 41–45 |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const [k, d] of rowsD) L.push(`| ${k} | ${d.n} | ${f1(d.media)} | ${d.mediana} | ${d.p10} | ${d.p25} | ${d.p50} | ${d.p75} | ${d.p90} | ${d.p95} | ${d.eq1} | ${d.eq50} | ${d.b4650} | ${d.b4145} |`);
L.push('', '"Força base" = strengthBase de quem está em clube naquele momento (inclui a base que entrou depois e exclui aposentados). Por isso a comparação justa de inflação é feita no mesmo conjunto de jogadores (seção 6).', '');

L.push('## 6. Inflação / deflação', '');
const k0 = B.snapshots[0].byId;
const k10 = B.snapshots[10].byId;
const both = Object.keys(k0).filter((id) => k10[id]);
const dB = both.map((id) => k10[id][1] - k0[id][1]);
const dA = both.map((id) => k10[id][2] - k0[id][2]);
L.push(`- Mesmo conjunto (jogadores em clube no início e após 10 temporadas, n = ${both.length}): variação média B ${f1(mean(dB))} (mediana ${sg(pct(dB, 0.5))}); mundo A ${f1(mean(dA))} (mediana ${sg(pct(dA, 0.5))}).`);
L.push(`- Média do mundo inteiro (quem está em clube): início ${f1(dists['0'].current.media)} → 10 temporadas: B ${f1(dists['10'].current.media)}, A ${f1(dists['10'].a.media)}.`);
const perSeasonMean = [1, 3, 5, 10].map((k) => `${k}: B ${f1(dists[String(k)].current.media)} · A ${f1(dists[String(k)].a.media)}`).join(' | ');
L.push(`- Trajetória da média: início ${f1(dists['0'].current.media)} | ${perSeasonMean}.`, '');

L.push('## 7. Distribuição por idade (idade no início do registro)', '');
L.push('| Faixa | n | força inicial | força atual | variação média | variação mediana | +5 ou mais | +10 ou mais |', '|---|---:|---:|---:|---:|---:|---:|---:|');
for (const b of AGE_BANDS) {
  const g = total.filter((x) => ageBand(x.r.firstAge) === b);
  L.push(`| ${b} | ${g.length} | ${f1(mean(g.map((x) => x.r.dev.strengthBase)))} | ${f1(mean(g.map((x) => x.r.dev.strengthCurrent)))} | ${f1(mean(g.map((x) => x.delta)))} | ${sg(pct(g.map((x) => x.delta), 0.5))} | ${g.filter((x) => x.delta >= 5).length} | ${g.filter((x) => x.delta >= 10).length} |`);
}
L.push('', 'Por temporada e idade naquela temporada (cada linha = jogador × temporada):', '', '| Idade na temporada | linhas | variação média | % com +1 ou mais | % com −1 ou menos |', '|---|---:|---:|---:|---:|');
for (const b of AGE_BANDS) {
  const g = seasonLines.filter((x) => ageBand(x.l.age) === b);
  L.push(`| ${b} | ${g.length} | ${f1(mean(g.map((x) => x.d)))} | ${f1((100 * g.filter((x) => x.d > 0).length) / g.length)}% | ${f1((100 * g.filter((x) => x.d < 0).length) / g.length)}% |`);
}
L.push('');

L.push('## 8. Jovens (≤ 20 anos no início do registro)', '');
const young = total.filter((x) => x.r.firstAge <= 20);
const youngPlayed = young.filter((x) => minutesAll(x.r) >= 90 * 38);
const youngIdle = young.filter((x) => minutesAll(x.r) < 90 * 5);
L.push(`- ${young.length} jovens. Variação média ${f1(mean(young.map((x) => x.delta)))}, mediana ${sg(pct(young.map((x) => x.delta), 0.5))}; maior evolução ${sg(Math.max(...young.map((x) => x.delta)))}; +5 ou mais: ${young.filter((x) => x.delta >= 5).length}; +10 ou mais: ${young.filter((x) => x.delta >= 10).length}.`);
L.push(`- Jovens com 38+ partidas completas somadas: ${youngPlayed.length}, variação média ${f1(mean(youngPlayed.map((x) => x.delta)))}. Jovens com menos de 5 partidas completas: ${youngIdle.length}, variação média ${f1(mean(youngIdle.map((x) => x.delta)))} → **jovem ≠ evolução automática**: ${youngIdle.filter((x) => x.delta > 0).length} deles subiram.`, '');

L.push('## 9–10. Titulares × reservas (por temporada)', '');
L.push('Classificação por minutos na temporada: titular ≥ 55% dos minutos possíveis; reserva 15–55%; poucos minutos < 15%; sem minutos = 0.', '');
L.push('| Uso | linhas | variação média | quedas médias (quem caiu) | linhas com +1 ou mais | linhas com −1 ou menos | % que subiu | % que caiu |', '|---|---:|---:|---:|---:|---:|---:|---:|');
for (const u of USAGE) {
  const g = seasonLines.filter((x) => usage(x.l) === u);
  const dn = g.filter((x) => x.d < 0);
  L.push(`| ${u} | ${g.length} | ${f1(mean(g.map((x) => x.d)))} | ${f1(mean(dn.map((x) => x.d)))} | ${g.filter((x) => x.d > 0).length} | ${dn.length} | ${f1((100 * g.filter((x) => x.d > 0).length) / g.length)}% | ${f1((100 * dn.length) / g.length)}% |`);
}
L.push('', 'Uso × idade (variação média por temporada; entre parênteses, linhas):', '', `| Uso | ${AGE_BANDS.slice(0, 6).join(' | ')} |`, `|---|${AGE_BANDS.slice(0, 6).map(() => '---:').join('|')}|`);
for (const u of USAGE) L.push(`| ${u} | ${AGE_BANDS.slice(0, 6).map((b) => { const g = seasonLines.filter((x) => usage(x.l) === u && ageBand(x.l.age) === b); return g.length ? `${f1(mean(g.map((x) => x.d)))} (${g.length})` : '–'; }).join(' | ')} |`);
L.push('', 'De onde vem a variação (pontos de desenvolvimento por componente, média por linha de temporada; 1 ponto ≈ 1 de força):', '', '| Uso | desenvolvimento (idade) | rendimento | envelhecimento | parado | total |', '|---|---:|---:|---:|---:|---:|');
for (const u of [...USAGE, 'todos']) {
  const g = seasonLines.filter((x) => u === 'todos' || usage(x.l) === u);
  const c = (k: keyof SeasonLine['pts']) => f1(mean(g.map((x) => x.l.pts[k])));
  L.push(`| ${u} | ${c('age')} | ${c('performance')} | ${c('aging')} | ${c('idle')} | ${f1(mean(g.map((x) => x.l.pts.age + x.l.pts.performance + x.l.pts.aging + x.l.pts.idle)))} |`);
}
const zeroUp = seasonLines.filter((x) => usage(x.l) === 'sem minutos' && x.d > 0);
L.push('', `Sem minutos e com subida na temporada: **${zeroUp.length}** (esperado 0).`);
const zeroYoungDown = seasonLines.filter((x) => usage(x.l) === 'sem minutos' && x.l.age < 31);
L.push(`Sem minutos, com menos de 31 anos: ${zeroYoungDown.length} linhas, variação média ${f1(mean(zeroYoungDown.map((x) => x.d)))} (perda de ritmo, não punição).`, '');

L.push('## 11–13. Transferências, promoções e rebaixamentos', '');
const later = (m: Move, seasons: number) => { const r = B.recs.get(m.playerId); const l = r?.seasons.find((x) => x.season === m.season + seasons - 1); return l ? l.strengthEnd - m.strength : null; };
const groupMoves = (label: string, list: Move[]) => {
  const d1 = list.map((m) => later(m, 1)).filter((x): x is number => x !== null);
  const d3 = list.map((m) => later(m, 3)).filter((x): x is number => x !== null);
  const keep = list.filter((m) => m.strengthAfterFirstRound !== null);
  const unchanged = keep.filter((m) => m.strengthAfterFirstRound === m.strength || Math.abs((m.strengthAfterFirstRound ?? 0) - m.strength) <= 1).length;
  return `| ${label} | ${list.length} | ${f1(mean(list.map((m) => m.strength)))} | ${f1(mean(list.map((m) => m.envBefore ?? NaN).filter(Number.isFinite)))} → ${f1(mean(list.map((m) => m.envAfter ?? NaN).filter(Number.isFinite)))} | ${f1(mean(d1))} (n=${d1.length}) | ${f1(mean(d3))} (n=${d3.length}) | ${unchanged}/${keep.length} |`;
};
L.push('| Grupo | n | força na chegada | ambiente antes → depois | evolução após 1 temporada | após 3 temporadas | força igual na chegada (±1 da 1ª rodada) |', '|---|---:|---:|---|---:|---:|---:|');
const tr = B.moves.filter((m) => m.kind === 'transferencia' && m.fromDiv !== null && m.toDiv !== null);
for (const [a, b] of [[4, 3], [3, 2], [2, 1], [1, 2], [2, 3], [3, 4], [4, 2], [4, 1], [3, 1], [1, 3], [1, 4]] as const) {
  const g = tr.filter((m) => m.fromDiv === a && m.toDiv === b);
  if (g.length) L.push(groupMoves(`D${a} → D${b}`, g));
}
L.push(groupMoves('mesma divisão', tr.filter((m) => m.fromDiv === m.toDiv)));
for (const kind of ['promocao', 'rebaixamento'] as const) for (const [a, b] of (kind === 'promocao' ? [[4, 3], [3, 2], [2, 1]] : [[1, 2], [2, 3], [3, 4]]) as [number, number][]) {
  const g = B.moves.filter((m) => m.kind === kind && m.fromDiv === a && m.toDiv === b);
  if (g.length) L.push(groupMoves(`${kind === 'promocao' ? 'promoção' : 'rebaixamento'} do clube D${a} → D${b}`, g));
}
const promoStarters = (kind: 'promocao' | 'rebaixamento') => B.moves.filter((m) => m.kind === kind).filter((m) => { const l = B.recs.get(m.playerId)?.seasons.find((x) => x.season === m.season); return l && usage(l) === 'titular'; });
L.push('', `Só titulares na temporada seguinte à mudança: promoção ${f1(mean(promoStarters('promocao').map((m) => later(m, 1)).filter((x): x is number => x !== null)))} após 1 temporada (n=${promoStarters('promocao').length}); rebaixamento ${f1(mean(promoStarters('rebaixamento').map((m) => later(m, 1)).filter((x): x is number => x !== null)))} (n=${promoStarters('rebaixamento').length}).`);
const exact = B.moves.filter((m) => m.strengthAfterFirstRound !== null && m.strengthAfterFirstRound !== m.strength);
L.push('', `Força na transferência: o registro grava a força do B no momento da mudança; a 1ª rodada no clube novo é a 1ª janela parcial, então pode haver ±1 que já estava acumulado. Mudanças de exatamente 0 na chegada: ${B.moves.length - exact.length}/${B.moves.length}. Nenhuma mudança vem da transferência em si (o ambiente só entra nos pontos das rodadas seguintes).`, '');

L.push('## 14–15. Maiores ganhos e maiores quedas (do registro inicial ao final)', '');
const tableTop = (list: typeof total) => ['| Jogador | pos. | idade inicial | temporadas | base → atual | Δ | minutos totais | mundo A |', '|---|---|---:|---:|---|---:|---:|---:|', ...list.map((x) => `| ${x.r.name} | ${x.r.position} | ${x.r.firstAge} | ${x.r.seasons.length} | ${x.r.dev.strengthBase} → ${x.r.dev.strengthCurrent} | ${sg(x.delta)} | ${minutesAll(x.r)} | ${x.last.strengthA} |`)];
L.push('### 20 maiores ganhos', '', ...tableTop(byDelta.slice(0, 20)), '', '### 20 maiores quedas', '', ...tableTop([...byDelta].reverse().slice(0, 20)), '');
L.push('### Extremos', '');
const peak = (r: Rec) => Math.max(r.dev.strengthBase, ...r.seasons.map((l) => l.strengthEnd));
const low = (r: Rec) => Math.min(r.dev.strengthBase, ...r.seasons.map((l) => l.strengthEnd));
const hit50 = recs.filter((r) => peak(r) === 50 && r.dev.strengthBase < 50);
const hit1 = recs.filter((r) => low(r) === 1 && r.dev.strengthBase > 1);
L.push(`- Chegaram a 50 (sem começar em 50): **${hit50.length}**${hit50.length ? ` — ${hit50.map((r) => `${r.name} (${r.dev.strengthBase} → 50, ${r.firstAge} anos)`).join('; ')}` : ''}. Começaram em 50: ${recs.filter((r) => r.dev.strengthBase === 50).length}.`);
L.push(`- Chegaram a 1 (sem começar em 1): **${hit1.length}**${hit1.length ? ` — ${hit1.slice(0, 10).map((r) => `${r.name} (${r.dev.strengthBase} → 1)`).join('; ')}` : ''}.`);
L.push(`- Passaram de +10: ${total.filter((x) => x.delta > 10).length}; de +15: ${total.filter((x) => x.delta > 15).length}; perderam mais de 10: ${total.filter((x) => x.delta < -10).length}.`);
L.push(`- Maior ganho: ${sg(byDelta[0].delta)} (${byDelta[0].r.name}); maior queda: ${sg(byDelta[byDelta.length - 1].delta)} (${byDelta[byDelta.length - 1].r.name}).`);
const perSeasonMax = Math.max(...seasonLines.map((x) => x.d));
const perSeasonMin = Math.min(...seasonLines.map((x) => x.d));
L.push(`- Maior variação numa única temporada: ${sg(perSeasonMax)} / ${sg(perSeasonMin)}.`, '');

L.push('## 16. Veteranos', '');
L.push('Aposentadoria do jogo atual: aos 37 anos (game/manager/world.ts `agePlayers`), e livres com 34+ na virada. O protótipo não muda isso.', '');
L.push('| Idade na temporada | linhas | força média no início | variação média | minutos médios | % titular | % caiu |', '|---|---:|---:|---:|---:|---:|---:|');
for (const [lab, lo, hi] of [['35+', 35, 99], ['38+', 38, 99], ['40+', 40, 99]] as const) {
  const g = seasonLines.filter((x) => x.l.age >= lo && x.l.age <= hi);
  L.push(`| ${lab} | ${g.length} | ${f1(mean(g.map((x) => x.l.strengthStart)))} | ${f1(mean(g.map((x) => x.d)))} | ${f1(mean(g.map((x) => x.l.minutes)))} | ${g.length ? f1((100 * g.filter((x) => usage(x.l) === 'titular').length) / g.length) : '–'}% | ${g.length ? f1((100 * g.filter((x) => x.d < 0).length) / g.length) : '–'}% |`);
}
const vets = total.filter((x) => x.r.firstAge >= 33);
L.push('', `Começaram com 33+: ${vets.length}; variação média até se aposentarem ${f1(mean(vets.map((x) => x.delta)))}; maior queda ${sg(Math.min(...vets.map((x) => x.delta)))}; aposentados no período: ${vets.filter((x) => x.r.retiredAfter !== null).length}.`);
L.push('O caso sintético "40 → 22 em 10 temporadas" (veterano reserva até 42 anos) **não pode ocorrer** no mundo real atual: a aposentadoria aos 37 interrompe a carreira antes. No mundo real, o maior declínio de veterano está na linha acima.', '');

L.push('## 17. Estrelas (força atual ≥ 45 em algum momento)', '');
const stars = recs.filter((r) => peak(r) >= 45);
L.push(`- ${stars.length} jogadores chegaram a 45+ (${stars.filter((r) => r.dev.strengthBase >= 45).length} já começaram assim; ${stars.filter((r) => r.dev.strengthBase < 45).length} subiram até 45+).`);
const newStars = stars.filter((r) => r.dev.strengthBase < 45);
if (newStars.length) {
  L.push('', '| Jogador | pos. | idade inicial | base → pico | temporadas até 45 | minutos/temporada | ambiente médio |', '|---|---|---:|---|---:|---:|---:|');
  for (const r of newStars.slice(0, 20)) {
    const at = r.seasons.find((l) => l.strengthEnd >= 45);
    L.push(`| ${r.name} | ${r.position} | ${r.firstAge} | ${r.dev.strengthBase} → ${peak(r)} | ${at ? at.season - r.firstSeason + 1 : '–'} | ${f1(mean(r.seasons.map((l) => l.minutes)))} | ${f1(mean(r.seasons.map((l) => l.envMean / Math.max(1, l.envN))))} |`);
  }
}
L.push(`- Chegaram a 50: ${hit50.length}.`, '');

L.push('## 18. Reservas e minutos', '');
L.push(`- Linhas de temporada sem minutos: ${seasonLines.filter((x) => usage(x.l) === 'sem minutos').length}; com subida: ${zeroUp.length}.`);
L.push(`- Penalidade no banco: queda média das linhas "sem minutos" ${f1(mean(seasonLines.filter((x) => usage(x.l) === 'sem minutos').map((x) => x.d)))} por temporada; "poucos minutos" ${f1(mean(seasonLines.filter((x) => usage(x.l) === 'poucos minutos').map((x) => x.d)))}.`, '');

L.push('## 19. Lesões longas (8+ rodadas seguidas)', '');
L.push(`- ${B.injuries.length} lesões longas.`);
if (B.injuries.length) {
  const dur = B.injuries.map((i) => i.atEnd - i.atStart);
  const aft = B.injuries.filter((i) => i.after !== null).map((i) => (i.after ?? 0) - i.atEnd);
  L.push(`- Durante a lesão: variação média ${f1(mean(dur))} (pior ${sg(Math.min(...dur))}); nas 10 rodadas seguintes: ${f1(mean(aft))} (n=${aft.length}).`);
  L.push('', '| Jogador | T | rodadas lesionado | força antes | ao fim da lesão | 10 rodadas depois |', '|---|---:|---:|---:|---:|---:|', ...B.injuries.slice(0, 15).map((i) => `| ${B.recs.get(i.playerId)?.name} (${i.playerId}) | ${i.season} | ${i.rounds} | ${i.atStart} | ${i.atEnd} | ${i.after ?? '–'} |`));
}
L.push('');

L.push('## Exemplos reais (selecionados automaticamente)', '', ...examples.map(([k, v]) => `- **${k}:** ${v}`), '');

// ---------- anomalias (listadas, não corrigidas) ----------
const anomalies: string[] = [];
const infl = mean(dB);
if (infl > 2) anomalies.push(`Inflação: o mesmo conjunto de jogadores subiu em média ${f1(infl)} em 10 temporadas.`);
if (infl < -2) anomalies.push(`Deflação: o mesmo conjunto de jogadores caiu em média ${f1(infl)} em 10 temporadas.`);
if (hit50.length) anomalies.push(`${hit50.length} jogador(es) chegaram a 50 sem começar em 50.`);
if (hit1.length) anomalies.push(`${hit1.length} jogador(es) chegaram a 1.`);
if (zeroUp.length) anomalies.push(`${zeroUp.length} temporada(s) com subida sem nenhum minuto.`);
if (perSeasonMax > 6) anomalies.push(`Ganho de ${sg(perSeasonMax)} numa temporada (acima de 6).`);
if (total.filter((x) => x.delta > 15).length) anomalies.push(`${total.filter((x) => x.delta > 15).length} jogador(es) com mais de +15.`);
const lowUse = seasonLines.filter((x) => usage(x.l) === 'titular');
if (mean(lowUse.map((x) => x.d)) <= 0) anomalies.push('Titulares não evoluem em média (variação ≤ 0).');
const dRes = dists['10'].current;
const dIni = dists['0'].current;
if (dRes.b4650 > 2 * Math.max(1, dIni.b4650)) anomalies.push(`Jogadores 46–50 mais que dobraram (${dIni.b4650} → ${dRes.b4650}).`);
if (!sameResults) anomalies.push('Resultados do mundo A mudaram com o observador ligado (não deveria).');
L.push('## Anomalias (listadas, não corrigidas)', '', ...(anomalies.length ? anomalies.map((a) => `- ${a}`) : ['- Nenhuma anomalia pelos critérios automáticos.']), '');

mkdirSync(join(ROOT, 'reports'), { recursive: true });
writeFileSync(join(ROOT, 'reports/development-world-10-seasons.md'), L.join('\n'));
writeFileSync(join(ROOT, 'reports/development-world-10-seasons.json'), `${JSON.stringify({
  version: DEVELOPMENT_PROTO.version, seed: SEED, seasons: SEASONS, mode: 'observador (mundo B não devolve força ao engine)', integrated: false, applied: false,
  determinism: { controlHash: control.hash, observedHash: B.hash, identical: sameResults },
  distributions: dists,
  sameSetDelta: { n: both.length, meanB: mean(dB), medianB: pct(dB, 0.5), meanA: mean(dA), medianA: pct(dA, 0.5) },
  anomalies,
  moveColumns: ['playerId', 'season', 'kind', 'fromClub', 'fromDiv', 'toClub', 'toDiv', 'strength', 'envBefore', 'envAfter', 'strengthAfterFirstRound'],
  moves: B.moves.map((m) => [m.playerId, m.season, m.kind, m.fromClub, m.fromDiv, m.toClub, m.toDiv, m.strength, m.envBefore === null ? null : Math.round(m.envBefore * 10) / 10, m.envAfter === null ? null : Math.round(m.envAfter * 10) / 10, m.strengthAfterFirstRound]),
  longInjuries: B.injuries,
  seasonColumns: ['season', 'clubId', 'division', 'age', 'strengthStart', 'strengthEnd', 'strengthWorldA', 'minutes', 'apps', 'starts', 'perfMean', 'injuredRounds', 'envMean', 'ptsDevelopment', 'ptsPerformance', 'ptsAging', 'ptsIdle'],
  changeColumns: ['season', 'round', 'from', 'to', 'reason', 'environmentLevel', 'ceiling', 'age'],
  players: recs.map((r) => ({ id: r.id, name: r.name, position: r.position, firstSeason: r.firstSeason, firstAge: r.firstAge, strengthBase: r.dev.strengthBase, strengthCurrent: r.dev.strengthCurrent, progress: r.dev.progress, retiredAfter: r.retiredAfter,
    seasons: r.seasons.map((l) => [l.season, l.clubId, l.division, l.age, l.strengthStart, l.strengthEnd, l.strengthA, l.minutes, l.apps, l.starts, l.apps ? Math.round((l.perfSum / l.apps) * 100) / 100 : null, l.injuredRounds, l.envN ? Math.round((l.envMean / l.envN) * 10) / 10 : null, ...[l.pts.age, l.pts.performance, l.pts.aging, l.pts.idle].map((v) => Math.round(v * 100) / 100)]),
    changes: r.dev.history.map((h) => [h.season, h.round, h.from, h.to, h.reason, h.context.environmentLevel, h.context.ceiling, h.context.age]) })),
})}\n`);
console.log(L.join('\n'));
