// Simulação em massa para observar o comportamento estatístico do motor (seção 21 da especificação).
// É uma ferramenta de desenvolvimento: NÃO altera nenhuma regra e não tenta "embelezar" números.
//
// Uso:
//   node engine/sim/balance.ts [--n 10000] [--seed balance] [--world-seed balance-world]
//                              [--scenarios world,equal,strong_home,weak_home] [--json caminho.json]
//                              [--home-advantage 1.25]   (observação: varre o mando SEM alterar o DEFAULT_CONFIG)
//                              [--chances-base 5.50]     (observação: varre chancesBase SEM alterar o DEFAULT_CONFIG)
//
// Cenários: núcleo (padrão) = world, equal, strong_home, weak_home.
// Extensões (informe em --scenarios; grupos: gaps, formations, cross):
//   gaps        gap_30x30 (exemplo A da spec), gap_30x33, gap_30x36, gap_25x40 — times sintéticos, todos com a mesma força
//   formations  formation_2-2-6, formation_6-3-1 — formação extrema contra 4-4-2 (espelho do mesmo clube)
//   cross       cross_<ESTILO>_<COMPORTAMENTO> (9) e rps_* (4) — estilo × comportamento contra o padrão
//
// Determinismo: mesma seed + mesmos dados = mesmos números (só o tempo de execução varia).
// Código de saída: 1 se alguma invariante for violada (algo quebrado de verdade); metas fora da faixa só são reportadas.

import { writeFileSync } from 'node:fs';
import { DEFAULT_CONFIG, type EngineConfig } from '../config.ts';
import { autoLineup, parseFormation } from '../lineup.ts';
import { simulateMatch } from '../match/simulate.ts';
import { prepareFixture } from '../round.ts';
import { createRng } from '../rng.ts';
import { overallStrength } from '../strength.ts';
import type { Behavior, Club, Lineup, MatchInput, MatchState, Player, Style, TeamState } from '../types.ts';
import { generateWorld, type World } from '../world/generate.ts';

// ---------- Cenários ----------

interface Pairing {
  home: Club;
  away: Club;
  players: Record<string, Player>;
  /** Escalações forçadas (por id de clube). Sem isso, vale a escalação automática do jogo. */
  lineups?: Record<string, Lineup>;
  /** Lado em foco do cenário (o mais forte, a formação extrema, o estilo testado). */
  focus?: 'home' | 'away';
}

interface Scenario {
  id: string;
  title: string;
  note: string;
  /** Nome do lado em foco, para o relatório (ex.: "o mais forte"). */
  focusLabel?: string;
  make(i: number): Pairing;
}

function overallOf(club: Club, world: World): number {
  return overallStrength(autoLineup(club, world.players, {}, DEFAULT_CONFIG).starters, world.players, DEFAULT_CONFIG);
}

/** Clone exato de um clube (mesmos jogadores e forças, outros ids): o confronto "times iguais". */
function mirror(world: World, club: Club): Pairing {
  const suffix = '~espelho';
  const players: Record<string, Player> = {};
  for (const id of club.squad) players[id] = world.players[id];
  const clonedSquad = club.squad.map((id) => `${id}${suffix}`);
  for (const id of club.squad) {
    const p = world.players[id];
    players[`${id}${suffix}`] = { ...p, id: `${id}${suffix}`, clubId: `${club.id}${suffix}`, condition: { ...p.condition } };
  }
  const away: Club = {
    ...club,
    id: `${club.id}${suffix}`,
    name: `${club.name} (espelho)`,
    squad: clonedSquad,
    penaltyTakerId: club.penaltyTakerId ? `${club.penaltyTakerId}${suffix}` : null,
  };
  return { home: club, away, players };
}

function buildScenarios(world: World, seed: string): Record<string, Scenario> {
  const allClubs = world.divisions.flatMap((d) => d.clubIds.map((id) => world.clubs[id]));
  const pairRng = createRng(`${seed}:pares`);

  const d1 = world.divisions[0].clubIds.map((id) => world.clubs[id]);
  const last = world.divisions[world.divisions.length - 1].clubIds.map((id) => world.clubs[id]);
  const strongest = d1.reduce((a, b) => (overallOf(b, world) > overallOf(a, world) ? b : a));
  const weakest = last.reduce((a, b) => (overallOf(b, world) < overallOf(a, world) ? b : a));
  const strongPlayers: Record<string, Player> = {};
  for (const c of [strongest, weakest]) for (const id of c.squad) strongPlayers[id] = world.players[id];
  const gapNote = `${strongest.name} (força ${overallOf(strongest, world).toFixed(1)}, 1ª div.) × ${weakest.name} (força ${overallOf(weakest, world).toFixed(1)}, última div.)`;

  const mirrors = new Map<string, Pairing>();
  const extra = extensionScenarios(world, allClubs, mirrors);
  return {
    ...extra,
    world: {
      id: 'world',
      title: 'Mundo: clubes da mesma divisão',
      note: 'pares sorteados dentro de cada divisão, as 4 em rodízio',
      make(i) {
        const div = world.divisions[i % world.divisions.length];
        const a = pairRng.int(0, div.clubIds.length - 1);
        let b = pairRng.int(0, div.clubIds.length - 2);
        if (b >= a) b += 1;
        const home = world.clubs[div.clubIds[a]];
        const away = world.clubs[div.clubIds[b]];
        const players: Record<string, Player> = {};
        for (const c of [home, away]) for (const id of c.squad) players[id] = world.players[id];
        return { home, away, players };
      },
    },
    equal: {
      id: 'equal',
      title: 'Times iguais (clube contra o próprio espelho)',
      note: 'isola o efeito do mando: forças, escalação e estilo idênticos',
      make(i) {
        const club = allClubs[i % allClubs.length];
        let m = mirrors.get(club.id);
        if (!m) {
          m = mirror(world, club);
          mirrors.set(club.id, m);
        }
        return m;
      },
    },
    strong_home: {
      id: 'strong_home',
      title: 'Grande diferença: o forte joga em casa',
      note: gapNote,
      make: () => ({ home: strongest, away: weakest, players: strongPlayers }),
    },
    weak_home: {
      id: 'weak_home',
      title: 'Grande diferença: o fraco joga em casa',
      note: gapNote,
      make: () => ({ home: weakest, away: strongest, players: strongPlayers }),
    },
  };
}

// ---------- Extensões (lacunas da seção 21) ----------

const STYLE_LABEL: Record<Style, string> = { DEFENSIVE: 'defensivo', BALANCED: 'equilibrado', OFFENSIVE: 'ofensivo' };
const BEHAVIOR_LABEL: Record<Behavior, string> = { NORMAL: 'normal', AGGRESSIVE: 'agressivo', REACTIVE: 'reativo' };

/** Clone de um clube com TODOS os jogadores na mesma força. Muda só a força: posições, nomes e temperamentos ficam iguais. */
function synthetic(world: World, base: Club, strength: number, tag: string): { club: Club; players: Record<string, Player> } {
  const suffix = `~${tag}`;
  const players: Record<string, Player> = {};
  for (const id of base.squad) {
    const p = world.players[id];
    players[`${id}${suffix}`] = {
      ...p,
      id: `${id}${suffix}`,
      clubId: `${base.id}${suffix}`,
      strength,
      condition: { injuryRounds: 0, suspensionRounds: 0, yellowCardsAccumulated: 0 },
    };
  }
  const club: Club = {
    ...base,
    id: `${base.id}${suffix}`,
    name: `${base.name} (força ${strength})`,
    squad: base.squad.map((id) => `${id}${suffix}`),
    penaltyTakerId: base.penaltyTakerId ? `${base.penaltyTakerId}${suffix}` : null,
  };
  return { club, players };
}

interface Tactic {
  formation: string;
  style: Style;
  behavior: Behavior;
}

const BASELINE_TACTIC: Tactic = { formation: '4-4-2', style: 'BALANCED', behavior: 'NORMAL' };

function lineupFor(club: Club, players: Record<string, Player>, t: Tactic): Lineup {
  return autoLineup(club, players, { formation: parseFormation(t.formation), style: t.style, behavior: t.behavior }, DEFAULT_CONFIG);
}

function extensionScenarios(world: World, allClubs: Club[], mirrors: Map<string, Pairing>): Record<string, Scenario> {
  const out: Record<string, Scenario> = {};
  const baseClub = world.clubs[world.divisions[0].clubIds[0]];

  // Lacunas de força: todos os jogadores com a mesma força, ambos em 4-4-2 equilibrado e normal.
  // O lado mais forte alterna entre casa e fora (i par: em casa), então o mando se cancela no "mais forte vence".
  for (const [a, b] of [[30, 30], [30, 33], [30, 36], [25, 40]] as const) {
    const id = `gap_${a}x${b}`;
    const weak = synthetic(world, baseClub, a, `f${a}a`);
    const strong = synthetic(world, baseClub, b, `f${b}b`);
    const players = { ...weak.players, ...strong.players };
    const lineups = {
      [weak.club.id]: lineupFor(weak.club, players, BASELINE_TACTIC),
      [strong.club.id]: lineupFor(strong.club, players, BASELINE_TACTIC),
    };
    const even = a === b;
    out[id] = {
      id,
      title: even ? 'Times sintéticos iguais: todos com força 30 (exemplo A da especificação)' : `Diferença de força: ${a} × ${b} (o mais forte alterna casa/fora)`,
      note: even ? '4-4-2, equilibrado, comportamento normal; o mandante é o lado em foco' : `todos os jogadores do fraco com ${a} e do forte com ${b}; 4-4-2 equilibrado e normal nos dois`,
      focusLabel: even ? 'o mandante' : 'o mais forte',
      make: (i) => {
        const strongHome = even || i % 2 === 0;
        return {
          home: strongHome ? strong.club : weak.club,
          away: strongHome ? weak.club : strong.club,
          players,
          lineups,
          focus: strongHome ? 'home' : 'away',
        };
      },
    };
  }

  // Duelo de táticas: o clube em foco contra o próprio espelho, com o foco alternando entre casa e fora.
  const versus = (id: string, title: string, note: string, focusLabel: string, subject: Tactic, opponent: Tactic): Scenario => ({
    id,
    title,
    note,
    focusLabel,
    make(i) {
      const club = allClubs[i % allClubs.length];
      let m = mirrors.get(club.id);
      if (!m) {
        m = mirror(world, club);
        mirrors.set(club.id, m);
      }
      const subjectHome = i % 2 === 0;
      const lineups = {
        [club.id]: lineupFor(club, m.players, subject),
        [m.away.id]: lineupFor(m.away, m.players, opponent),
      };
      return { home: subjectHome ? club : m.away, away: subjectHome ? m.away : club, players: m.players, lineups, focus: subjectHome ? 'home' : 'away' };
    },
  });

  // Formações extremas (spec §21) contra 4-4-2.
  for (const f of ['2-2-6', '6-3-1']) {
    out[`formation_${f}`] = versus(
      `formation_${f}`,
      `Formação extrema ${f} contra 4-4-2 (clube contra o próprio espelho)`,
      'mesmos jogadores dos dois lados; equilibrado e normal; o foco alterna casa/fora',
      `o ${f}`,
      { ...BASELINE_TACTIC, formation: f },
      BASELINE_TACTIC,
    );
  }

  // Estilo × comportamento contra o padrão (4-4-2 equilibrado e normal).
  for (const style of ['DEFENSIVE', 'BALANCED', 'OFFENSIVE'] as const) {
    for (const behavior of ['NORMAL', 'AGGRESSIVE', 'REACTIVE'] as const) {
      const id = `cross_${style}_${behavior}`;
      out[id] = versus(
        id,
        `Estilo ${STYLE_LABEL[style]} + comportamento ${BEHAVIOR_LABEL[behavior]} contra equilibrado + normal`,
        'espelho do mesmo clube, 4-4-2 nos dois; o foco alterna casa/fora',
        `o ${STYLE_LABEL[style]}/${BEHAVIOR_LABEL[behavior]}`,
        { ...BASELINE_TACTIC, style, behavior },
        BASELINE_TACTIC,
      );
    }
  }

  // Pedra-papel-tesoura do comportamento reativo (spec §7): bom contra ofensivo, ruim contra defensivo.
  for (const [behavior, label] of [['REACTIVE', 'reativo'], ['NORMAL', 'normal']] as const) {
    for (const oppStyle of ['OFFENSIVE', 'DEFENSIVE'] as const) {
      const id = `rps_${behavior.toLowerCase()}_vs_${oppStyle.toLowerCase()}`;
      out[id] = versus(
        id,
        `Equilibrado + ${label} contra ${STYLE_LABEL[oppStyle]} + normal`,
        'espelho do mesmo clube, 4-4-2; o foco alterna casa/fora',
        `o ${label}`,
        { ...BASELINE_TACTIC, behavior },
        { ...BASELINE_TACTIC, style: oppStyle },
      );
    }
  }
  return out;
}

const GROUPS: Record<string, (id: string) => boolean> = {
  gaps: (id) => id.startsWith('gap_'),
  formations: (id) => id.startsWith('formation_'),
  cross: (id) => id.startsWith('cross_') || id.startsWith('rps_'),
};
const CORE = ['world', 'equal', 'strong_home', 'weak_home'];

// ---------- Contagem ----------

const BUCKETS = ['1-15', '16-30', '31-45', '45+', '46-60', '61-75', '76-90', '90+'];

function bucketOf(half: 1 | 2, minute: number, added: number): number {
  if (added > 0) return half === 1 ? 3 : 7;
  if (half === 1) return minute <= 15 ? 0 : minute <= 30 ? 1 : 2;
  return minute <= 60 ? 4 : minute <= 75 ? 5 : 6;
}

interface Tally {
  n: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  homeGoals: number;
  awayGoals: number;
  scorelines: Map<string, number>;
  goalless: number;
  sevenPlus: number;
  maxTeamGoals: number;
  yellow: number;
  red: number;
  redDirect: number;
  redSecondYellow: number;
  injuries: number;
  penaltiesAwarded: number;
  penaltyGoals: number;
  penaltyMissed: number;
  subs: number;
  goalsByBucket: number[];
  stoppageFirst: number;
  stoppageSecond: number;
  chances: number;
  saves: number;
  woodwork: number;
  possessionHome: number;
  minutes: number; // minutos jogados (90 + acréscimos + extensões de pênalti)
  focusWins: number;
  focusLosses: number;
  nominalYellow: number; // taxa nominal por partida (config × comportamento), sem o fator de tempo
  nominalDirectRed: number;
  nominalInjuries: number;
  nominalPenalties: number;
  prepMs: number;
  simMs: number;
  violations: Map<string, number>;
  firstViolation: Map<string, string>;
  ms: number;
}

function newTally(): Tally {
  return {
    n: 0, homeWins: 0, draws: 0, awayWins: 0, homeGoals: 0, awayGoals: 0, scorelines: new Map(),
    goalless: 0, sevenPlus: 0, maxTeamGoals: 0, yellow: 0, red: 0, redDirect: 0, redSecondYellow: 0,
    injuries: 0, penaltiesAwarded: 0, penaltyGoals: 0, penaltyMissed: 0, subs: 0,
    goalsByBucket: BUCKETS.map(() => 0), stoppageFirst: 0, stoppageSecond: 0,
    chances: 0, saves: 0, woodwork: 0, possessionHome: 0,
    minutes: 0, focusWins: 0, focusLosses: 0, nominalYellow: 0, nominalDirectRed: 0, nominalInjuries: 0, nominalPenalties: 0,
    prepMs: 0, simMs: 0,
    violations: new Map(), firstViolation: new Map(), ms: 0,
  };
}

function violate(t: Tally, code: string, detail: string): void {
  t.violations.set(code, (t.violations.get(code) ?? 0) + 1);
  if (!t.firstViolation.has(code)) t.firstViolation.set(code, detail);
}

/** Taxas nominais por partida de um time (constantes do config e comportamento), SEM o fator de minutos jogados. */
function nominal(team: TeamState, rival: TeamState, cfg: EngineConfig) {
  const cards = team.behavior === 'AGGRESSIVE' ? cfg.aggressive.cards : team.behavior === 'REACTIVE' ? cfg.reactive.cards : 1;
  const aggressiveRival = rival.behavior === 'AGGRESSIVE';
  return {
    yellow: cfg.yellowRatePerTeam * cards,
    directRed: cfg.directRedRatePerTeam * cards,
    injuries: cfg.injuryRatePerTeam * (aggressiveRival ? cfg.aggressive.injuriesCaused : 1),
    penalties: cfg.penaltyRatePerTeam * (aggressiveRival ? cfg.aggressive.penaltiesConceded : 1),
  };
}

function record(t: Tally, s: MatchState, cfg: EngineConfig = DEFAULT_CONFIG, focus?: 'home' | 'away'): void {
  const id = s.matchId;
  t.n += 1;

  // Invariantes: se alguma falhar, há algo quebrado de verdade.
  if (s.status !== 'FINISHED') violate(t, 'PARTIDA_NAO_TERMINOU', id);
  const h = s.score.home;
  const a = s.score.away;
  if (![h, a].every((g) => Number.isInteger(g) && g >= 0)) violate(t, 'PLACAR_INVALIDO', `${id}: ${h}-${a}`);
  let goalEvents = 0;
  for (const e of s.events) {
    if (e.type === 'GOAL' || e.type === 'PENALTY_GOAL') {
      goalEvents += 1;
      t.goalsByBucket[bucketOf(e.clock.half, e.clock.minute, e.clock.added)] += 1;
    }
    if (e.type === 'YELLOW_CARD') t.yellow += 1;
    if (e.type === 'RED_CARD') {
      t.red += 1;
      if (e.detail === 'second_yellow') t.redSecondYellow += 1;
      else t.redDirect += 1;
    }
    if (e.type === 'INJURY') t.injuries += 1;
    if (e.type === 'PENALTY_AWARDED') t.penaltiesAwarded += 1;
    if (e.type === 'PENALTY_GOAL') t.penaltyGoals += 1;
    if (e.type === 'PENALTY_MISSED') t.penaltyMissed += 1;
    if (e.type === 'SUBSTITUTION') t.subs += 1;
  }
  if (goalEvents !== h + a) violate(t, 'PLACAR_DIFERE_DOS_EVENTOS', `${id}: placar ${h + a}, eventos ${goalEvents}`);
  const lastType = s.events[s.events.length - 1]?.type;
  if (lastType !== 'FULL_TIME') violate(t, 'SEM_FULL_TIME_NO_FIM', `${id}: último evento ${lastType}`);

  for (const side of ['home', 'away'] as const) {
    const team = s[side];
    const onField = team.onField;
    if (onField.length > 11 || onField.length < 1) violate(t, 'JOGADORES_EM_CAMPO_INVALIDO', `${id}: ${side} ${onField.length}`);
    if (onField.filter((p) => p.sector === 'GK').length !== 1) violate(t, 'GOLEIROS_EM_CAMPO_DIFERENTE_DE_1', `${id}: ${side}`);
    if (onField.some((p) => team.sentOff.includes(p.playerId))) violate(t, 'EXPULSO_EM_CAMPO', `${id}: ${side}`);
    if (new Set(team.sentOff).size !== team.sentOff.length) violate(t, 'EXPULSO_DUAS_VEZES', `${id}: ${side}`);
    if (team.subsUsed > cfg.maxSubs) violate(t, 'MAIS_TROCAS_QUE_O_LIMITE', `${id}: ${side} ${team.subsUsed}`);
    const st = s.stats[side];
    for (const v of Object.values(st)) if (typeof v === 'number' && Number.isNaN(v)) violate(t, 'ESTATISTICA_NAN', `${id}: ${side}`);
    t.chances += st.chances;
    t.saves += st.saves;
    t.woodwork += st.woodwork;
  }
  t.possessionHome += s.stats.home.possession;
  t.minutes += s.minutesPlayed;
  for (const [team, rival] of [[s.home, s.away], [s.away, s.home]] as const) {
    const nom = nominal(team, rival, cfg);
    t.nominalYellow += nom.yellow;
    t.nominalDirectRed += nom.directRed;
    t.nominalInjuries += nom.injuries;
    t.nominalPenalties += nom.penalties;
  }
  if (focus) {
    const focusGoals = focus === 'home' ? h : a;
    const otherGoals = focus === 'home' ? a : h;
    if (focusGoals > otherGoals) t.focusWins += 1;
    else if (focusGoals < otherGoals) t.focusLosses += 1;
  }
  t.homeGoals += h;
  t.awayGoals += a;
  if (h > a) t.homeWins += 1;
  else if (h < a) t.awayWins += 1;
  else t.draws += 1;
  if (h + a === 0) t.goalless += 1;
  if (h + a >= 7) t.sevenPlus += 1;
  t.maxTeamGoals = Math.max(t.maxTeamGoals, h, a);
  const key = `${h}-${a}`;
  t.scorelines.set(key, (t.scorelines.get(key) ?? 0) + 1);
  t.stoppageFirst += s.stoppage.first ?? 0;
  t.stoppageSecond += s.stoppage.second ?? 0;
}

// ---------- Relatório ----------

const f = (x: number, d = 2): string => x.toFixed(d).replace('.', ',');
const pct = (x: number, n: number): string => `${f((100 * x) / n, 1)}%`;

interface Target {
  label: string;
  value: number;
  min: number;
  max: number;
  fmt: (x: number) => string;
}

function targetsFor(id: string, t: Tally): Target[] {
  const n = t.n;
  const pen = t.penaltyGoals + t.penaltyMissed;
  const list: Target[] = [
    { label: 'gols por partida', value: (t.homeGoals + t.awayGoals) / n, min: 2.4, max: 2.8, fmt: (x) => f(x) },
    { label: '0×0 (% das partidas)', value: (100 * t.goalless) / n, min: 7, max: 10, fmt: (x) => `${f(x, 1)}%` },
    { label: 'amarelos por partida', value: t.yellow / n, min: 4, max: 5, fmt: (x) => f(x) },
    { label: 'vermelhos por partida', value: t.red / n, min: 0.15, max: 0.3, fmt: (x) => f(x) },
    { label: 'pênaltis por partida', value: t.penaltiesAwarded / n, min: 0.25, max: 0.35, fmt: (x) => f(x) },
    { label: 'conversão de pênaltis (%)', value: pen ? (100 * t.penaltyGoals) / pen : 0, min: 75, max: 80, fmt: (x) => `${f(x, 1)}%` },
    { label: 'lesões por partida', value: t.injuries / n, min: 0.2, max: 0.3, fmt: (x) => f(x) },
  ];
  if (id === 'equal' || id === 'gap_30x30') {
    list.push(
      { label: 'mandante vence (%)', value: (100 * t.homeWins) / n, min: 42, max: 48, fmt: (x) => `${f(x, 1)}%` },
      { label: 'empates (%)', value: (100 * t.draws) / n, min: 24, max: 30, fmt: (x) => `${f(x, 1)}%` },
      { label: 'visitante vence (%)', value: (100 * t.awayWins) / n, min: 25, max: 31, fmt: (x) => `${f(x, 1)}%` },
    );
  }
  // Spec §21: com ~20% de diferença de força (30×36), o mais forte vence 55–65% e a zebra fica em 12–20%.
  if (id === 'gap_30x36') {
    list.push(
      { label: 'mais forte vence (%)', value: (100 * t.focusWins) / n, min: 55, max: 65, fmt: (x) => `${f(x, 1)}%` },
      { label: 'zebra: o mais fraco vence (%)', value: (100 * t.focusLosses) / n, min: 12, max: 20, fmt: (x) => `${f(x, 1)}%` },
    );
  }
  return list;
}

function report(sc: Scenario, t: Tally): { text: string; outside: string[] } {
  const n = t.n;
  const lines: string[] = [];
  lines.push(`=== ${sc.title} — ${n.toLocaleString('pt-BR')} partidas ===`);
  lines.push(`(${sc.note})`);
  lines.push(`Resultado: mandante ${pct(t.homeWins, n)} | empate ${pct(t.draws, n)} | visitante ${pct(t.awayWins, n)}`);
  lines.push(
    `Gols por partida: ${f((t.homeGoals + t.awayGoals) / n)} (mandante ${f(t.homeGoals / n)} | visitante ${f(t.awayGoals / n)})` +
      ` | 0×0: ${pct(t.goalless, n)} | 7+ gols: ${pct(t.sevenPlus, n)} | máx. de um time: ${t.maxTeamGoals}`,
  );
  const top = [...t.scorelines.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  lines.push(`Placares mais comuns: ${top.map(([k, c]) => `${k.replace('-', '×')} ${pct(c, n)}`).join(' | ')}`);
  const totalGoals = t.goalsByBucket.reduce((x, y) => x + y, 0) || 1;
  lines.push(`Gols por faixa de minutos: ${BUCKETS.map((b, i) => `${b}: ${pct(t.goalsByBucket[i], totalGoals)}`).join(' | ')}`);
  lines.push(
    `Cartões por partida: amarelos ${f(t.yellow / n)} | vermelhos ${f(t.red / n)} (direto ${f(t.redDirect / n)}, 2º amarelo ${f(t.redSecondYellow / n)})`,
  );
  const pen = t.penaltyGoals + t.penaltyMissed;
  lines.push(
    `Lesões por partida: ${f(t.injuries / n)} | Pênaltis por partida: ${f(t.penaltiesAwarded / n)} (conversão ${pen ? pct(t.penaltyGoals, pen) : '—'})` +
      ` | Substituições por partida: ${f(t.subs / n)}`,
  );
  lines.push(
    `Chances por partida: ${f(t.chances / n)} | defesas: ${f(t.saves / n)} | traves: ${f(t.woodwork / n)} | posse do mandante: ${f(t.possessionHome / n, 1)}%`,
  );
  lines.push(`Acréscimos médios: 1º tempo ${f(t.stoppageFirst / n, 1)} min | 2º tempo ${f(t.stoppageSecond / n, 1)} min`);

  // Distribuição do total de gols por partida.
  const byTotal = new Array<number>(8).fill(0);
  for (const [k, c] of t.scorelines) {
    const [hg, ag] = k.split('-').map(Number);
    byTotal[Math.min(7, hg + ag)] += c;
  }
  lines.push(`Total de gols na partida: ${byTotal.map((c, g) => `${g === 7 ? '7+' : g}: ${pct(c, n)}`).join(' | ')}`);

  if (sc.focusLabel) {
    lines.push(`Em foco: ${sc.focusLabel} — vence ${pct(t.focusWins, n)} | empate ${pct(t.draws, n)} | perde ${pct(t.focusLosses, n)}`);
  }

  // Hipótese dos acréscimos: probabilidade por minuto = taxa ÷ 90, mas se jogam mais de 90 minutos.
  const avgMinutes = t.minutes / n;
  const timeFactor = avgMinutes / 90;
  lines.push(`Minutos jogados por partida: ${f(avgMinutes, 1)} (fator de tempo ${f(timeFactor, 3)} sobre os 90 minutos)`);
  lines.push(
    `Observado ÷ nominal (nominal = constantes do config × comportamento; se só o tempo importasse, todos seriam ${f(timeFactor, 3)}): ` +
      `amarelos ${f(t.yellow / t.nominalYellow, 3)} | vermelhos diretos ${f(t.redDirect / t.nominalDirectRed, 3)} | ` +
      `lesões ${f(t.injuries / t.nominalInjuries, 3)} | pênaltis ${f(t.penaltiesAwarded / t.nominalPenalties, 3)}`,
  );
  lines.push(`Expulsões: ${f(t.red / n)} por partida, das quais ${pct(t.redSecondYellow, t.red || 1)} por 2º amarelo`);

  lines.push(
    `Tempo de execução: ${f(t.ms / 1000, 1)} s (${f(t.ms / n, 1)} ms por partida = preparação ${f(t.prepMs / n, 2)} ms + simulação ${f(t.simMs / n, 2)} ms)`,
  );

  const outside: string[] = [];
  lines.push('Metas iniciais da especificação (seção 21), só informativas:');
  for (const tg of targetsFor(sc.id, t)) {
    const ok = tg.value >= tg.min && tg.value <= tg.max;
    if (!ok) outside.push(`${sc.id}: ${tg.label} = ${tg.fmt(tg.value)} (meta ${tg.fmt(tg.min)} a ${tg.fmt(tg.max)})`);
    lines.push(`  ${ok ? 'ok   ' : 'FORA '} ${tg.label}: ${tg.fmt(tg.value)}  (meta ${tg.fmt(tg.min)} a ${tg.fmt(tg.max)})`);
  }
  const perTenK = (t.ms / n) * 10000;
  const okTime = perTenK < 5000;
  if (!okTime) outside.push(`${sc.id}: tempo para 10.000 partidas = ${f(perTenK / 1000, 0)} s (meta < 5 s)`);
  lines.push(`  ${okTime ? 'ok   ' : 'FORA '} tempo para 10.000 partidas: ${f(perTenK / 1000, 0)} s  (meta < 5 s; medido com o processo compartilhado)`);

  if (t.violations.size === 0) lines.push('Invariantes: nenhuma violação.');
  else {
    lines.push('INVARIANTES VIOLADAS:');
    for (const [code, count] of t.violations) lines.push(`  ${code}: ${count}× (primeiro caso: ${t.firstViolation.get(code)})`);
  }
  return { text: lines.join('\n'), outside };
}

// ---------- Execução ----------

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
  }
  return out;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const n = Number(args.n ?? 10000);
  const seed = args.seed ?? 'balance';
  const worldSeed = args['world-seed'] ?? 'balance-world';
  if (!Number.isInteger(n) || n <= 0) throw new Error('--n precisa ser um inteiro positivo');

  const cfg: EngineConfig = {
    ...DEFAULT_CONFIG,
    ...(args['home-advantage'] ? { homeAdvantage: Number(args['home-advantage']) } : {}),
    ...(args['chances-base'] ? { chancesBase: Number(args['chances-base']) } : {}),
  };
  if (!Number.isFinite(cfg.homeAdvantage) || cfg.homeAdvantage <= 0) throw new Error('--home-advantage precisa ser um número positivo');
  if (!Number.isFinite(cfg.chancesBase) || cfg.chancesBase <= 0) throw new Error('--chances-base precisa ser um número positivo');

  const world = generateWorld(worldSeed);
  const all = buildScenarios(world, seed);
  const ids: string[] = [];
  for (const r of (args.scenarios ?? CORE.join(',')).split(',')) {
    if (GROUPS[r]) ids.push(...Object.keys(all).filter(GROUPS[r]));
    else ids.push(r);
  }
  for (const id of ids) {
    if (!all[id]) throw new Error(`cenário desconhecido: ${id} (opções: ${Object.keys(all).join(', ')}; grupos: ${Object.keys(GROUPS).join(', ')})`);
  }

  const sweep =
    (args['home-advantage'] ? ` | mando (homeAdvantage) ${cfg.homeAdvantage} [varredura; DEFAULT_CONFIG = ${DEFAULT_CONFIG.homeAdvantage}]` : '') +
    (args['chances-base'] ? ` | chancesBase ${cfg.chancesBase} [varredura; DEFAULT_CONFIG = ${DEFAULT_CONFIG.chancesBase}]` : '');
  console.log(`Balanceamento — engineVersion ${DEFAULT_CONFIG.engineVersion} | seed "${seed}" | mundo "${worldSeed}" | ${n} partidas por cenário${sweep}\n`);
  const json: Record<string, unknown> = { engineVersion: DEFAULT_CONFIG.engineVersion, homeAdvantage: cfg.homeAdvantage, chancesBase: cfg.chancesBase, matchMinutes: cfg.matchMinutes, seed, worldSeed, n, scenarios: {} };
  const allOutside: string[] = [];
  let hardViolations = 0;

  for (const id of ids) {
    const sc = all[id];
    const t = newTally();
    for (let i = 0; i < n; i++) {
      const p = sc.make(i);
      const started = performance.now();
      const fixture = prepareFixture(`bal-${id}-${i}`, p.home, p.away, p.players, p.lineups ?? {}, cfg);
      const prepared = performance.now();
      const input: MatchInput = {
        matchId: fixture.matchId,
        seed: `${seed}:${id}:${i}`,
        home: fixture.home,
        away: fixture.away,
        controlledClubId: null,
        attendance: fixture.attendance,
      };
      const state = simulateMatch(input, undefined, cfg);
      const finished = performance.now();
      t.prepMs += prepared - started;
      t.simMs += finished - prepared;
      t.ms += finished - started;
      record(t, state, cfg, p.focus);
      if ((i + 1) % 1000 === 0) process.stderr.write(`  [${id}] ${i + 1}/${n}\n`);
    }
    const r = report(sc, t);
    console.log(r.text + '\n');
    allOutside.push(...r.outside);
    for (const c of t.violations.values()) hardViolations += c;
    (json.scenarios as Record<string, unknown>)[id] = {
      title: sc.title,
      matches: t.n,
      homeWins: t.homeWins,
      draws: t.draws,
      awayWins: t.awayWins,
      homeGoals: t.homeGoals,
      awayGoals: t.awayGoals,
      scorelines: Object.fromEntries(t.scorelines),
      yellow: t.yellow,
      red: t.red,
      injuries: t.injuries,
      redDirect: t.redDirect,
      redSecondYellow: t.redSecondYellow,
      goalless: t.goalless,
      sevenPlus: t.sevenPlus,
      maxTeamGoals: t.maxTeamGoals,
      subs: t.subs,
      chances: t.chances,
      saves: t.saves,
      woodwork: t.woodwork,
      possessionHome: t.possessionHome,
      minutes: t.minutes,
      stoppageFirst: t.stoppageFirst,
      stoppageSecond: t.stoppageSecond,
      nominal: { yellow: t.nominalYellow, directRed: t.nominalDirectRed, injuries: t.nominalInjuries, penalties: t.nominalPenalties },
      focus: sc.focusLabel ? { label: sc.focusLabel, wins: t.focusWins, losses: t.focusLosses } : undefined,
      timing: { totalMs: t.ms, prepMs: t.prepMs, simMs: t.simMs },
      penaltiesAwarded: t.penaltiesAwarded,
      penaltyGoals: t.penaltyGoals,
      penaltyMissed: t.penaltyMissed,
      goalsByBucket: Object.fromEntries(BUCKETS.map((b, i) => [b, t.goalsByBucket[i]])),
      violations: Object.fromEntries(t.violations),
      outsideTargets: r.outside,
    };
  }

  console.log('=== RESUMO ===');
  console.log(hardViolations === 0 ? 'Invariantes: nenhuma violação em nenhum cenário.' : `INVARIANTES VIOLADAS: ${hardViolations} ocorrência(s).`);
  console.log(allOutside.length === 0 ? 'Todas as metas iniciais dentro da faixa.' : `Fora da meta inicial (${allOutside.length}):\n  - ${allOutside.join('\n  - ')}`);
  if (args.json) {
    writeFileSync(args.json, JSON.stringify(json, null, 2));
    console.log(`JSON salvo em ${args.json}`);
  }
  process.exitCode = hardViolations === 0 ? 0 : 1;
}

main();
