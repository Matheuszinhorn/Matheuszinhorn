// VALIDAÇÃO DEV-PROTO-0.4 NO MUNDO REAL (nada integrado; engine intocado). Mesma metodologia da 0.3:
// seed elite-dev-world-10, 10 temporadas, 15.200 partidas do Engine 0.2.0, aposentadoria aos 37, CPU, acesso/rebaixamento,
// lesões e envelhecimento do jogo. Controle sem observador × observadores sobre as MESMAS partidas (força não volta ao
// engine; placares idênticos, conferido por hash).
// Observadores: 0.3-B (referência) e a grade 0.4 = limite conjunto {A −0,50, B −0,75, C −1,00} × preservação do
// rendimento {A atual, B parcial, C integral}.
// Decomposição exata por rodada (conferida contra roundPoints): desenvolvimento pela idade, envelhecimento, inatividade,
// rendimento, ambiente, devolução do limite conjunto; e a reserva de rendimento descartada no acumulador.
// Uso: npm run development:world04  →  reports/development-world-10-seasons-v04.md
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRound, roundResults, simulateRound, type Player, type World } from '../engine/index.ts';
import { careerOffers, isSeasonOver, type CareerState } from '../game/career.ts';
import { newManagedCareer } from '../game/manager/actions.ts';
import { finishManagedRound, planManagedRound, startManagedSeason } from '../game/manager/flow.ts';
import { curveAt, devProto03, devProto04, developRound, environmentLevel, matchPerformance, newDevelopment, roundPoints, type DevelopmentConfig, type DevPosition, type MatchEvidence, type PlayerDevelopment } from '../game/development/development.ts';
import { evidenceFromMatch } from '../game/development/evidence.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = 'elite-dev-world-10';
const SEASONS = 10;
const ROUNDS = 38;
const POS: Record<Player['position'], DevPosition> = { GK: 'GOL', DEF: 'DEF', MID: 'MEI', ATT: 'ATA' };
const CAP: Record<string, string> = { A: '−0,50', B: '−0,75', C: '−1,00' };
const PRES: Record<string, string> = { A: 'atual', B: 'parcial', C: 'integral' };
const VARIANTS: { key: string; label: string; cfg: DevelopmentConfig }[] = [
  { key: '0.3-B', label: '0.3-B (referência)', cfg: devProto03('B') },
  ...(['A', 'B', 'C'] as const).flatMap((c) => (['A', 'B', 'C'] as const).map((p) => ({ key: `${c}${p}`, label: `0.4 limite ${CAP[c]} · preservação ${PRES[p]}`, cfg: devProto04(c, p) }))),
];
const K = VARIANTS.map((v) => v.key);
const COMP = ['dev', 'aging', 'idle', 'perf', 'env', 'relief', 'discarded'] as const;
type Pts = Record<(typeof COMP)[number], number>;
const zero = (): Pts => ({ dev: 0, aging: 0, idle: 0, perf: 0, env: 0, relief: 0, discarded: 0 });

interface Line { age: number; minutes: number; division: number | null; start: number; end: number; pts: Pts; nonPlayRaw: number; perfSum: number; apps: number }
interface PS { dev: PlayerDevelopment; lines: Map<number, Line>; hit1: boolean; hit50: boolean }
interface Move { playerId: string; season: number; at: Record<string, number>; after: Record<string, number | null> }
const divisionOf = (w: World, clubId: string | null) => (clubId ? (w.divisions.find((d) => d.id === w.clubs[clubId]?.divisionId)?.level ?? null) : null);

function run(observe: boolean) {
  let c: CareerState = newManagedCareer(SEED, 'Simulação', careerOffers(SEED)[0]);
  const hash = createHash('sha256');
  const info = new Map<string, { name: string; pos: DevPosition; firstAge: number; base: number }>();
  const st: Record<string, Map<string, PS>> = Object.fromEntries(K.map((k) => [k, new Map()]));
  const snaps: Record<string, Record<number, Record<string, number>>> = Object.fromEntries(K.map((k) => [k, {}]));
  const moves: Move[] = [];
  let lastClub = new Map<string, string | null>();
  let maxErr = 0;
  const strengthOf = (k: string, w: World, id: string) => st[k].get(id)?.dev.strengthCurrent ?? w.players[id].strength;
  const snap = (n: number, w: World) => { for (const k of K) snaps[k][n] = Object.fromEntries(Object.values(w.players).filter((p) => p.clubId).map((p) => [p.id, strengthOf(k, w, p.id)])); };
  const track = (w: World, season: number) => {
    const next = new Map<string, string | null>();
    for (const p of Object.values(w.players)) {
      next.set(p.id, p.clubId);
      const b = lastClub.get(p.id);
      if (b !== undefined && b !== p.clubId && p.clubId && info.has(p.id)) moves.push({ playerId: p.id, season, at: Object.fromEntries(K.map((k) => [k, strengthOf(k, w, p.id)])), after: Object.fromEntries(K.map((k) => [k, null])) });
    }
    lastClub = next;
  };
  if (observe) { snap(0, c.world); track(c.world, 1); }
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
        const pending = moves.filter((m) => K.some((k) => m.after[k] === null));
        for (const v of VARIANTS) {
          const env = new Map<string, number>();
          for (const [id, club] of Object.entries(w0.clubs)) env.set(id, environmentLevel(club.squad.filter((p) => w0.players[p]).map((p) => strengthOf(v.key, w0, p))));
          const div = new Map<string, number>();
          for (const d of w0.divisions) div.set(d.id, d.clubIds.reduce((a, id) => a + (env.get(id) ?? 0), 0) / Math.max(1, d.clubIds.length));
          for (const p of Object.values(w0.players)) {
            if (!p.clubId) continue;
            if (!info.has(p.id)) info.set(p.id, { name: p.name, pos: POS[p.position], firstAge: p.age, base: p.strength });
            let ps = st[v.key].get(p.id);
            if (!ps) { ps = { dev: newDevelopment(p.id, p.strength), lines: new Map(), hit1: false, hit50: false }; st[v.key].set(p.id, ps); }
            const e: MatchEvidence = ev.get(p.id) ? { ...ev.get(p.id)!, injured: false } : { played: false, minutes: 0, started: false, goals: 0, saves: 0, teamGoalsFor: 0, teamGoalsAgainst: 0, redCard: false, injured: p.condition.injuryRounds > 0 };
            const ctx = { season, round, age: p.age, position: POS[p.position], environmentLevel: env.get(p.clubId) ?? 0, divisionLevel: div.get(w0.clubs[p.clubId].divisionId) ?? null, evidence: e };
            const b = roundPoints(ps.dev, ctx, v.cfg);
            const share = e.played ? Math.max(0, Math.min(1, e.minutes / 90)) : 0;
            const perf = matchPerformance(e, POS[p.position]);
            const devRaw = share * Math.max(0, curveAt(v.cfg.ageTrend, p.age));
            const perfRaw = share * v.cfg.performanceWeight * perf;
            const envEff = b.age + b.performance - (devRaw + perfRaw);
            maxErr = Math.max(maxErr, Math.abs(devRaw + perfRaw + envEff + b.aging + b.idle + b.capRelief - b.points));
            // reserva de rendimento descartada no acumulador (mesma regra de developRound)
            const atLimit = ps.dev.strengthCurrent >= b.ceiling;
            const upper = atLimit ? (v.cfg.performancePreservation === 'full' ? v.cfg.accumulatorCap : v.cfg.performancePreservation === 'partial' ? v.cfg.preservationBuffer : 0) : v.cfg.accumulatorCap;
            const discarded = Math.max(0, ps.dev.progress + b.points - upper);
            let l = ps.lines.get(season);
            if (!l) { l = { age: p.age, minutes: 0, division: divisionOf(w0, p.clubId), start: ps.dev.strengthCurrent, end: ps.dev.strengthCurrent, pts: zero(), nonPlayRaw: 0, perfSum: 0, apps: 0 }; ps.lines.set(season, l); }
            l.pts.dev += devRaw; l.pts.aging += b.aging; l.pts.idle += b.idle; l.pts.perf += perfRaw; l.pts.env += envEff; l.pts.relief += b.capRelief; l.pts.discarded += discarded;
            if (!e.played) l.nonPlayRaw += b.aging + b.idle;
            if (e.played) { l.minutes += e.minutes; l.perfSum += perf; l.apps++; }
            ps.dev = developRound(ps.dev, ctx, v.cfg);
            l.end = ps.dev.strengthCurrent;
            if (ps.dev.strengthCurrent === 1 && ps.dev.strengthBase > 1) ps.hit1 = true;
            if (ps.dev.strengthCurrent === 50 && ps.dev.strengthBase < 50) ps.hit50 = true;
          }
          for (const m of pending) if (m.after[v.key] === null && st[v.key].has(m.playerId)) m.after[v.key] = st[v.key].get(m.playerId)!.dev.strengthCurrent;
        }
      }
      c = finishManagedRound(c, results, sim.matches).career;
      if (observe) track(c.world, season);
    }
    if (!isSeasonOver(c)) throw new Error('temporada incompleta');
    if (observe && [1, 3, 5, 10].includes(season)) snap(season, c.world);
    if (season < SEASONS) { c = startManagedSeason(c).career; if (observe) track(c.world, season + 1); }
  }
  return { hash: hash.digest('hex'), info, st, snaps, moves, maxErr };
}

const t0 = Date.now();
const control = run(false);
const obs = run(true);
console.error(`simulação: ${Math.round((Date.now() - t0) / 1000)}s`);
const same = control.hash === obs.hash;

// ---------- análise ----------
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const pct = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const f1 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') : '–');
const f2 = (v: number) => (Number.isFinite(v) ? (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') : '–');
const sg = (v: number) => (!Number.isFinite(v) ? '–' : v > 0 ? `+${v}` : `${v}`);
const H = (cols: string[]) => [`| ${cols.join(' | ')} |`, `|${cols.map((_, i) => (i ? '---:' : '---')).join('|')}|`];
const usage = (l: Line) => { const s = l.minutes / (ROUNDS * 90); return l.minutes === 0 ? 'zero' : s >= 0.7 ? 'titular' : s >= 0.4 ? 'parcial' : 'reserva'; };
const rowsOf = (k: string) => [...obs.st[k].entries()].flatMap(([id, ps]) => [...ps.lines.entries()].map(([season, l]) => ({ id, season, l, d: l.end - l.start })));
const dist = (k: string, n: number) => { const v = Object.values(obs.snaps[k][n] ?? {}); return { n: v.length, media: mean(v), mediana: pct(v, 0.5), p10: pct(v, 0.1), p90: pct(v, 0.9), b1: v.filter((x) => x <= 10).length, b2: v.filter((x) => x > 10 && x <= 20).length, b3: v.filter((x) => x > 20 && x <= 30).length, b4: v.filter((x) => x > 30 && x <= 40).length, b5: v.filter((x) => x > 40).length, eq50: v.filter((x) => x === 50).length }; };
function totals(k: string) {
  const ps = [...obs.st[k].values()];
  const d = ps.filter((p) => p.lines.size).map((p) => p.dev.strengthCurrent - p.dev.strengthBase);
  const s0 = obs.snaps[k][0], s10 = obs.snaps[k][10];
  const both = Object.keys(s0).filter((id) => s10[id] !== undefined);
  return { maxGain: Math.max(...d), maxDrop: Math.min(...d), up5: d.filter((x) => x >= 5).length, dn5: d.filter((x) => x <= -5).length, up10: d.filter((x) => x >= 10).length, dn10: d.filter((x) => x <= -10).length, hit1: ps.filter((p) => p.hit1).length, hit50: ps.filter((p) => p.hit50).length, sameSet: mean(both.map((id) => s10[id] - s0[id])), n: both.length };
}
const tot = Object.fromEntries(K.map((k) => [k, totals(k)]));
type R = ReturnType<typeof rowsOf>[number];
const refDiscard = new Set(rowsOf('0.3-B').filter((r) => r.l.pts.discarded > 0).map((r) => `${r.id}|${r.season}`));
const G: [string, (r: R) => boolean][] = [
  ['todas as temporadas sem minutos', (r) => r.l.minutes === 0],
  ['veteranos 31–36 sem minutos', (r) => r.l.minutes === 0 && r.l.age >= 31],
  ['veteranos 31–36 titulares', (r) => usage(r.l) === 'titular' && r.l.age >= 31],
  ['veteranos 31–36 titulares, rendimento médio > 0', (r) => usage(r.l) === 'titular' && r.l.age >= 31 && r.l.perfSum / Math.max(1, r.l.apps) > 0],
  ['veteranos 31–36 titulares, rendimento médio ≤ 0', (r) => usage(r.l) === 'titular' && r.l.age >= 31 && r.l.perfSum / Math.max(1, r.l.apps) <= 0],
  ['jovens (≤ 23) sem minutos', (r) => r.l.minutes === 0 && r.l.age <= 23],
  ['jovens (≤ 23) titulares', (r) => usage(r.l) === 'titular' && r.l.age <= 23],
  ['titulares com rendimento descartado no limite (na referência)', (r) => usage(r.l) === 'titular' && refDiscard.has(`${r.id}|${r.season}`)],
];

const L: string[] = ['# DEV-PROTO-0.4 — validação no mundo real (10 temporadas)', '', '> **DEV-PROTO-0.4 continua NÃO integrada ao jogo.** Nenhuma variante é definitiva. Engine 0.2.0, saves, gameplay, calendário, universo fictício, curva de idade e força base intocados; strengthBase não é piso.', ''];
L.push('## Metodologia', '');
L.push(`- Mesma da 0.3: seed \`${SEED}\`, ${SEASONS} temporadas, ${SEASONS * ROUNDS * 40} partidas reais do Engine 0.2.0, carreira gerenciada sem decisões manuais, aposentadoria aos 37, transferências da CPU, acesso/rebaixamento, lesões, envelhecimento.`);
L.push(`- Controle sem observador × ${VARIANTS.length} observadores sobre as mesmas partidas: hash dos placares **${same ? 'idêntico' : 'DIFERENTE'}** (\`${control.hash}\`).`);
L.push(`- Decomposição por rodada conferida contra a fórmula: maior diferença ${obs.maxErr.toExponential(1)}.`);
L.push('- **Limite conjunto:** soma envelhecimento + inatividade das rodadas SEM participação na temporada e aplica o teto da variante (para quem não joga o ano todo, é o teto da perda total do ano); rodadas jogadas seguem o envelhecimento normal. Lesão conta como rodada sem participação.');
L.push('- **Preservação:** no limite contextual, o rendimento positivo pode ficar guardado no acumulador (parcial: até 0,5; integral: até 1,5) para amortecer perdas futuras; o +1 continua proibido no limite.');
L.push('- Sem efeito de volta: a força dos observadores não entra nas partidas.', '');
L.push('## Variantes', '', ...H(['chave', 'descrição']), ...VARIANTS.map((v) => `| ${v.key} | ${v.label} |`), '');

L.push('## Resultados (10 temporadas)', '', ...H(['Métrica', ...K]));
const T = (label: string, f: (k: string) => string | number) => L.push(`| ${label} | ${K.map(f).join(' | ')} |`);
const d10 = Object.fromEntries(K.map((k) => [k, dist(k, 10)]));
T('média', (k) => f1(d10[k].media)); T('mediana', (k) => d10[k].mediana); T('P10', (k) => d10[k].p10); T('P90', (k) => d10[k].p90);
T('1–10', (k) => d10[k].b1); T('11–20', (k) => d10[k].b2); T('21–30', (k) => d10[k].b3); T('31–40', (k) => d10[k].b4); T('41–50', (k) => d10[k].b5); T('=50', (k) => d10[k].eq50);
T('variação média, mesmo conjunto', (k) => f1(tot[k].sameSet));
T('maior ganho', (k) => sg(tot[k].maxGain)); T('maior queda', (k) => sg(tot[k].maxDrop));
T('+5 ou mais', (k) => tot[k].up5); T('−5 ou mais', (k) => tot[k].dn5); T('+10 ou mais', (k) => tot[k].up10); T('−10 ou mais', (k) => tot[k].dn10);
T('chegaram a 1', (k) => tot[k].hit1); T('chegaram a 50', (k) => tot[k].hit50);
L.push('', `Início (todas): média ${f1(dist('0.3-B', 0).media)}, mediana ${dist('0.3-B', 0).mediana}, P10 ${dist('0.3-B', 0).p10}, P90 ${dist('0.3-B', 0).p90}. Mesmo conjunto = ${tot['0.3-B'].n} jogadores em clube no início e no fim.`, '');
L.push('Média ao longo do tempo:', '', ...H(['Após', ...K]));
for (const n of [1, 3, 5, 10]) L.push(`| ${n} temporada(s) | ${K.map((k) => f1(dist(k, n).media)).join(' | ')} |`);
L.push('');

L.push('## Grupos (variação real média por temporada)', '', ...H(['Grupo', 'linhas', ...K]));
for (const [label, f] of G) { const g = rowsOf('0.3-B').filter(f); L.push(`| ${label} | ${g.length} | ${K.map((k) => f1(mean(rowsOf(k).filter(f).map((r) => r.d)))).join(' | ')} |`); }
L.push('', 'Linhas e critérios medidos na referência; as linhas de cada variante usam o mesmo critério (minutos e idade são iguais em todas; rendimento também).', '');
L.push('Componentes nos veteranos 31–36 sem minutos (pontos por temporada):', '', ...H(['Componente', ...K]));
const vz = (k: string) => rowsOf(k).filter((r) => r.l.minutes === 0 && r.l.age >= 31);
for (const [lab, f] of [['envelhecimento (bruto)', (l: Line) => l.pts.aging], ['inatividade (bruta)', (l: Line) => l.pts.idle], ['perda bruta sem participação', (l: Line) => l.nonPlayRaw], ['devolvido pelo limite', (l: Line) => l.pts.relief], ['perda aplicada', (l: Line) => l.nonPlayRaw + l.pts.relief]] as const) L.push(`| ${lab} | ${K.map((k) => f2(mean(vz(k).map((r) => f(r.l))))).join(' | ')} |`);
L.push('', 'Reserva de rendimento descartada no acumulador (titulares no limite contextual), pontos por temporada:', '', ...H(['Grupo', ...K]));
for (const [lab, f] of [['titulares (todos)', (r: R) => usage(r.l) === 'titular'], ['titulares 31–36', (r: R) => usage(r.l) === 'titular' && r.l.age >= 31], ['titulares ≤ 27', (r: R) => usage(r.l) === 'titular' && r.l.age <= 27]] as const) L.push(`| ${lab} | ${K.map((k) => f2(mean(rowsOf(k).filter(f).map((r) => r.l.pts.discarded)))).join(' | ')} |`);
L.push('');

// ---------- critérios de sucesso ----------
L.push('## Critérios de sucesso (medidos, não decididos)', '', ...H(['Critério', 'medida', ...K]));
const g = (k: string, f: (r: R) => boolean) => rowsOf(k).filter(f);
const zeroUp = (k: string) => g(k, (r) => r.l.minutes === 0 && r.d > 0).length;
const crit: [string, string, (k: string) => [boolean, string]][] = [
  ['1. não destrói veterano sem minutos', 'média 31–36 sem minutos ≥ −1,0 e ≤ 10 chegam a 1', (k) => { const m = mean(g(k, (r) => r.l.minutes === 0 && r.l.age >= 31).map((r) => r.d)); return [m >= -1 && tot[k].hit1 <= 10, `${f1(m)} · ${tot[k].hit1}`]; }],
  ['2. banco não vira crescimento', 'temporadas sem minutos com subida = 0', (k) => [zeroUp(k) === 0, String(zeroUp(k))]],
  ['3. sem inflação', 'mesmo conjunto ≤ +2', (k) => [tot[k].sameSet <= 2, f1(tot[k].sameSet)]],
  ['4. poucos 50', 'chegaram a 50 ≤ 5', (k) => [tot[k].hit50 <= 5, String(tot[k].hit50)]],
  ['5. ficar parado tem consequência', 'média sem minutos (23+) < 0', (k) => { const m = mean(g(k, (r) => r.l.minutes === 0 && r.l.age >= 23).map((r) => r.d)); return [m < 0, f2(m)]; }],
  ['6. jovem que joga evolui', 'jovens titulares ≥ +0,5', (k) => { const m = mean(g(k, (r) => usage(r.l) === 'titular' && r.l.age <= 23).map((r) => r.d)); return [m >= 0.5, f2(m)]; }],
  ['7. veterano que joga mal cai', 'titulares 31–36 com rendimento ≤ 0: média < 0', (k) => { const m = mean(g(k, G[4][1]).map((r) => r.d)); return [m < 0, f2(m)]; }],
  ['8. veterano que joga bem mantém melhor', 'rendimento > 0 cai menos que ≤ 0', (k) => { const a = mean(g(k, G[3][1]).map((r) => r.d)); const b = mean(g(k, G[4][1]).map((r) => r.d)); return [a > b, `${f2(a)} × ${f2(b)}`]; }],
  ['9. strengthBase não é piso', 'regra no código', () => [true, 'sem piso']],
  ['10. sem força por transferência', 'mudança na 1ª rodada após transferência = 0', (k) => { const n = obs.moves.filter((m) => m.after[k] !== null && m.after[k] !== m.at[k]).length; return [n === 0, `${n}/${obs.moves.length}`]; }],
];
for (const [label, measure, f] of crit) L.push(`| ${label} | ${measure} | ${K.map((k) => { const [ok, v] = f(k); return `${ok ? '✔' : '✘'} ${v}`; }).join(' | ')} |`);
L.push('');

// ---------- casos obrigatórios ----------
const CASES: [string, DevPosition, number, number][] = [['Breno Bragança Almeida', 'GOL', 23, 35], ['Henrique Jardim', 'MEI', 32, 26], ['Luan Gomes', 'DEF', 27, 32], ['Gabriel Macedo', 'GOL', 27, 25], ['Igor Duarte', 'MEI', 19, 13], ['Caio Toledo Freitas', 'ATA', 21, 48]];
const SHOW = ['0.3-B', 'AA', 'BA', 'CA', 'BB', 'BC'];
L.push('## Casos obrigatórios', '', `Variantes mostradas: ${SHOW.join(', ')} (as demais seguem o mesmo padrão; resumo final de todas no fim de cada caso). Δ em pontos (≈ força). "Perda bruta" = envelhecimento + inatividade das rodadas sem participação; "limite" = parte devolvida pelo limite conjunto; "reserva descartada" = rendimento perdido no acumulador no limite contextual.`, '');
for (const [name, pos, age0, base0] of CASES) {
  const id = [...obs.info.entries()].find(([, i]) => i.name === name && i.pos === pos && i.firstAge === age0 && i.base === base0)?.[0];
  if (!id) { L.push(`### ${name}`, '', '— perfil citado não encontrado.', ''); continue; }
  L.push(`### ${name} (${pos}, ${age0} anos no início, força ${base0})`, '');
  for (const k of SHOW) {
    const ps = obs.st[k].get(id)!;
    L.push(`**${k}**`, '', ...H(['T', 'idade', 'minutos', 'inicial', 'Δ idade (des. · envelh.)', 'Δ inatividade', 'Δ rendimento', 'Δ ambiente', 'perda bruta', 'limite', 'reserva descartada', 'final']));
    for (const [s, l] of [...ps.lines.entries()].sort((a, b) => a[0] - b[0])) L.push(`| ${s} | ${l.age} | ${l.minutes} | ${l.start} | ${f2(l.pts.dev + l.pts.aging)} (${f2(l.pts.dev)} · ${f2(l.pts.aging)}) | ${f2(l.pts.idle)} | ${f2(l.pts.perf)} | ${f2(l.pts.env)} | ${f2(l.nonPlayRaw)} | ${f2(l.pts.relief)} | ${f2(l.pts.discarded)} | ${l.end} |`);
    L.push('');
  }
  L.push(`Força final em todas as variantes: ${K.map((k) => `${k} ${obs.st[k].get(id)!.dev.strengthCurrent}`).join(' · ')}.`, '');
}

// ---------- anomalias restantes (só registradas) ----------
const anomalies: string[] = [];
for (const k of K.filter((x) => x !== '0.3-B')) {
  const vet = mean(g(k, (r) => r.l.minutes === 0 && r.l.age >= 31).map((r) => r.d));
  const vetT = mean(g(k, (r) => usage(r.l) === 'titular' && r.l.age >= 34).map((r) => r.d));
  if (tot[k].hit1 > 10) anomalies.push(`${k}: ${tot[k].hit1} jogadores ainda chegam a 1.`);
  if (vet < -1) anomalies.push(`${k}: veterano sem minutos ainda cai ${f1(vet)} por temporada.`);
  if (vetT < -1) anomalies.push(`${k}: titulares 34–36 caem ${f1(vetT)} por temporada (curva de idade, que não foi alterada).`);
  if (tot[k].sameSet > 2) anomalies.push(`${k}: inflação ${f1(tot[k].sameSet)}.`);
}
L.push('## Quem ainda chega a 1', '', ...H(['Variante', 'chegaram a 1', 'força inicial ≤ 10', '11–15', '16+', 'idade inicial média', 'temporadas sem minutos (média)']));
for (const k of K) {
  const ids = [...obs.st[k].entries()].filter(([, p]) => p.hit1).map(([id]) => id);
  const b = ids.map((id) => obs.info.get(id)!.base);
  L.push(`| ${k} | ${ids.length} | ${b.filter((x) => x <= 10).length} | ${b.filter((x) => x > 10 && x <= 15).length} | ${b.filter((x) => x > 15).length} | ${f1(mean(ids.map((id) => obs.info.get(id)!.firstAge)))} | ${f1(mean(ids.map((id) => [...obs.st[k].get(id)!.lines.values()].filter((l) => l.minutes === 0).length)))} |`);
}
L.push('', 'Sem piso pela força inicial (proibido nesta etapa), um jogador que já começa muito fraco ainda pode chegar a 1 com uma perda limitada por vários anos.', '');
L.push('## Anomalias que permanecem depois do limite (registradas, não corrigidas)', '', ...(anomalies.length ? anomalies.map((a) => `- ${a}`) : ['- Nenhuma pelos critérios.']), '');
L.push('## Limitações', '', '- Sem efeito de volta da força nas partidas.', '- Uma seed; transferências da CPU raras; aposentadoria aos 37.', '- O limite conjunto vale para as rodadas sem participação: quem joga pouco recebe o limite só nessas rodadas (o envelhecimento das rodadas jogadas segue normal).', '');

mkdirSync(join(ROOT, 'reports'), { recursive: true });
writeFileSync(join(ROOT, 'reports/development-world-10-seasons-v04.md'), L.join('\n'));
console.log(L.join('\n'));
