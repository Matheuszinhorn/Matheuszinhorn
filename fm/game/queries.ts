import {
  autoLineup,
  clockLabel,
  computeAttendance,
  computeStandings,
  DEFAULT_CONFIG,
  formationLabel,
  formationOf,
  overallStrength,
  payroll,
  type Behavior,
  type Clock,
  type Club,
  type Formation,
  type LineupSlot,
  type MatchState,
  type MatchStatus,
  type Player,
  type Position,
  type RoundState,
  type ScheduledMatch,
  type Sector,
  type StandingRow,
  type Style,
  type TeamState,
  type World,
} from '../engine/index.ts';

// Consulta de clubes (seção 24): a área CLUBES da interface. Camada GAME, SOMENTE LEITURA.
//
//   ENGINE  →  GAME (session, queries)  →  APP
//
// Regras desta camada:
//  - só funções puras: recebem um contexto (dados do jogo) e devolvem objetos NOVOS; nada é alterado nem compartilhado;
//  - não conhece Command, não chama step/stepRound/applyCommand e não cria nem altera nenhuma decisão:
//    do engine importa apenas funções de leitura (escalação automática, força, classificação, público, folha);
//  - funciona igual para o clube controlado e para qualquer adversário, com a partida parada, em andamento ou
//    esperando uma decisão. A pausa da consulta é da sessão (openClubs/closeClubs); aqui não existe relógio.
//
// O que é público (decisão de implementação, ver seção 24 da especificação):
//  - jogador: nome, idade, nacionalidade, posição, força, valor de mercado, lesão e suspensão. NÃO: salário individual,
//    temperamento e contrato;
//  - finanças: capacidade, público estimado e folha salarial da rodada. O saldo exato só do clube controlado;
//    o dos demais aparece em faixas (BAIXO, MÉDIO, ALTO), por tercis entre todos os clubes do mundo.

export class QueryError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'QueryError';
    this.code = code;
  }
}

// ---------- Contexto ----------

/** Uma partida já concluída em rodadas anteriores. */
export interface PlayedMatch {
  round: number; // 1 = primeira rodada da temporada
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface ClubsContext {
  readonly world: World;
  readonly controlledClubId: string | null;
  /** Número (a partir de 1) da rodada em andamento; sem rodada em andamento, o da próxima a jogar. */
  readonly roundNumber: number;
  /** Rodada em andamento (dá a escalação ao vivo e o placar). null = nenhuma rodada em andamento. */
  readonly round: RoundState | null;
  /** Calendário por divisão: rodadas → partidas. */
  readonly schedule: Readonly<Record<string, readonly (readonly ScheduledMatch[])[]>>;
  /** Resultados das rodadas já concluídas. A rodada em andamento não entra na classificação. */
  readonly results: readonly PlayedMatch[];
  /** Semente do desempate final da classificação. Padrão: "classificacao:<divisão>". */
  readonly tiebreakSeed?: string;
  /** Quantos resultados recentes mostrar. Padrão: 5. */
  readonly recentResults?: number;
}

// ---------- Visões ----------

export interface PlayerView {
  id: string;
  name: string;
  age: number;
  nationality: string;
  position: Position;
  strength: number;
  marketValue: number;
  injuredRounds: number;
  suspendedRounds: number;
}

export interface LineupPlayerView extends PlayerView {
  sector: Sector;
  x: number;
  y: number;
}

export interface LineupView {
  /** LIVE: a escalação viva da partida em andamento. AUTO: o melhor time disponível (clube que não está jogando agora). */
  source: 'LIVE' | 'AUTO';
  formation: Formation;
  formationLabel: string;
  style: Style;
  behavior: Behavior;
  /** Força geral desta escalação: média da força efetiva dos titulares. */
  strength: number;
  starters: LineupPlayerView[];
  bench: PlayerView[];
  /** Só na escalação ao vivo. */
  sentOff: PlayerView[];
  injured: PlayerView[];
  substitutionsUsed: number;
}

export interface LiveMatchView {
  matchId: string;
  status: MatchStatus;
  /** Minuto em que a partida está: "57", "45+2", "90+5". No fim da partida, o último minuto jogado. */
  minute: string;
  half: 1 | 2;
  home: boolean;
  opponentId: string;
  opponentName: string;
  score: { for: number; against: number };
  attendance: number;
}

export interface ResultView {
  round: number;
  opponentId: string;
  opponentName: string;
  home: boolean;
  goalsFor: number;
  goalsAgainst: number;
  outcome: 'W' | 'D' | 'L';
}

export interface NextMatchView {
  round: number;
  home: boolean;
  opponentId: string;
  opponentName: string;
  opponentStrength: number | null;
}

export type BalanceBand = 'LOW' | 'MEDIUM' | 'HIGH';
export type BalanceView = { kind: 'EXACT'; amount: number } | { kind: 'BAND'; band: BalanceBand };

export interface StandingView extends StandingRow {
  position: number;
  clubName: string;
  isControlled: boolean;
}

export interface ClubView {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  country: string;
  city: string;
  division: { id: string; name: string; level: number } | null;
  isControlled: boolean;
  reputation: number;
  /** Força geral do melhor time disponível. null se o clube não tem 11 jogadores disponíveis. */
  strength: number | null;
  squad: PlayerView[];
  /** null se não há 11 jogadores disponíveis e o clube não está jogando agora. */
  lineup: LineupView | null;
  live: LiveMatchView | null;
  form: ResultView[];
  standing: (StandingRow & { position: number; clubsInDivision: number }) | null;
  nextMatch: NextMatchView | null;
  stadium: { name: string; capacity: number; maxCapacity: number };
  finance: { payrollPerRound: number; estimatedAttendance: number; balance: BalanceView };
}

export interface ClubSummary {
  id: string;
  name: string;
  shortName: string;
  divisionId: string;
  divisionName: string;
  divisionLevel: number;
  strength: number | null;
  isControlled: boolean;
}

// ---------- Auxiliares (todos puros) ----------

const POSITION_ORDER: Record<Position, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

function playerOf(ctx: ClubsContext, id: string): Player {
  const p = ctx.world.players[id];
  if (!p) throw new QueryError('UNKNOWN_PLAYER', `jogador inexistente no mundo: ${id}`);
  return p;
}

function clubOf(ctx: ClubsContext, id: string): Club {
  const c = ctx.world.clubs[id];
  if (!c) throw new QueryError('UNKNOWN_CLUB', `clube inexistente: ${id}`);
  return c;
}

function playerView(p: Player): PlayerView {
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    nationality: p.nationality,
    position: p.position,
    strength: p.strength,
    marketValue: p.marketValue,
    injuredRounds: p.condition.injuryRounds,
    suspendedRounds: p.condition.suspensionRounds,
  };
}

function byPositionThenStrength(a: PlayerView, b: PlayerView): number {
  return (
    POSITION_ORDER[a.position] - POSITION_ORDER[b.position] || b.strength - a.strength || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

function slotView(ctx: ClubsContext, slot: LineupSlot): LineupPlayerView {
  return { ...playerView(playerOf(ctx, slot.playerId)), sector: slot.sector, x: slot.x, y: slot.y };
}

/** Força geral do melhor time disponível, ou null se não há 11 disponíveis. */
function bestStrength(ctx: ClubsContext, club: Club): number | null {
  try {
    const lineup = autoLineup(club, ctx.world.players, {}, DEFAULT_CONFIG);
    return overallStrength(lineup.starters, ctx.world.players, DEFAULT_CONFIG);
  } catch {
    return null;
  }
}

function liveMatchOf(ctx: ClubsContext, clubId: string): MatchState | null {
  if (!ctx.round) return null;
  return ctx.round.matches.find((m) => m.home.clubId === clubId || m.away.clubId === clubId) ?? null;
}

/**
 * Minuto a mostrar. No fim do jogo (ou com uma decisão pendente depois do último minuto de acréscimo) o relógio interno
 * fica um minuto além do último jogado; a consulta mostra o último minuto realmente jogado.
 */
function shownClock(m: MatchState): Clock {
  const pastEnd =
    m.status === 'FINISHED' ||
    (m.clock.half === 2 && m.clock.minute === 90 && m.stoppage.second !== null && m.clock.added > m.stoppage.second && m.pendingPenalty === null);
  return pastEnd ? m.events[m.events.length - 1].clock : m.clock;
}

function roundInProgress(ctx: ClubsContext): boolean {
  return ctx.round !== null && ctx.round.matches.some((m) => m.status !== 'FINISHED');
}

function liveLineup(ctx: ClubsContext, team: TeamState): LineupView {
  const starters = team.onField.map((slot) => slotView(ctx, slot));
  const view = (ids: readonly string[]) => ids.map((id) => playerView(playerOf(ctx, id))).sort(byPositionThenStrength);
  const formation = formationOf(team.onField);
  const rated = Object.fromEntries(team.onField.map((s) => [s.playerId, team.players[s.playerId]]));
  return {
    source: 'LIVE',
    formation,
    formationLabel: formationLabel(formation),
    style: team.style,
    behavior: team.behavior,
    strength: overallStrength(team.onField, rated, DEFAULT_CONFIG),
    starters,
    bench: view(team.bench),
    sentOff: view(team.sentOff),
    injured: view(team.injured),
    substitutionsUsed: team.subsUsed,
  };
}

function autoLineupView(ctx: ClubsContext, club: Club): LineupView | null {
  try {
    const lineup = autoLineup(club, ctx.world.players, {}, DEFAULT_CONFIG);
    const formation = formationOf(lineup.starters);
    return {
      source: 'AUTO',
      formation,
      formationLabel: formationLabel(formation),
      style: lineup.style,
      behavior: lineup.behavior,
      strength: overallStrength(lineup.starters, ctx.world.players, DEFAULT_CONFIG),
      starters: lineup.starters.map((slot) => slotView(ctx, slot)),
      bench: lineup.bench.map((id) => playerView(playerOf(ctx, id))).sort(byPositionThenStrength),
      sentOff: [],
      injured: [],
      substitutionsUsed: 0,
    };
  } catch {
    return null;
  }
}

function divisionResults(ctx: ClubsContext, clubIds: readonly string[]): PlayedMatch[] {
  const ids = new Set(clubIds);
  return ctx.results.filter((r) => ids.has(r.homeClubId) && ids.has(r.awayClubId));
}

function tableFor(ctx: ClubsContext, divisionId: string): StandingRow[] {
  const division = ctx.world.divisions.find((d) => d.id === divisionId);
  if (!division) throw new QueryError('UNKNOWN_DIVISION', `divisão inexistente: ${divisionId}`);
  const results = divisionResults(ctx, division.clubIds).map((r) => ({
    homeClubId: r.homeClubId,
    awayClubId: r.awayClubId,
    homeGoals: r.homeGoals,
    awayGoals: r.awayGoals,
  }));
  return computeStandings(division.clubIds, results, ctx.tiebreakSeed ?? `classificacao:${divisionId}`);
}

function balanceOf(ctx: ClubsContext, club: Club): BalanceView {
  if (club.id === ctx.controlledClubId) return { kind: 'EXACT', amount: club.money };
  const all = Object.values(ctx.world.clubs);
  const below = all.filter((c) => c.money < club.money).length;
  const band: BalanceBand = below * 3 < all.length ? 'LOW' : below * 3 < 2 * all.length ? 'MEDIUM' : 'HIGH';
  return { kind: 'BAND', band };
}

function recentResultsOf(ctx: ClubsContext, clubId: string): ResultView[] {
  const limit = ctx.recentResults ?? 5;
  return ctx.results
    .filter((r) => r.homeClubId === clubId || r.awayClubId === clubId)
    .sort((a, b) => b.round - a.round)
    .slice(0, limit)
    .map((r) => {
      const home = r.homeClubId === clubId;
      const goalsFor = home ? r.homeGoals : r.awayGoals;
      const goalsAgainst = home ? r.awayGoals : r.homeGoals;
      const opponentId = home ? r.awayClubId : r.homeClubId;
      return {
        round: r.round,
        opponentId,
        opponentName: clubOf(ctx, opponentId).name,
        home,
        goalsFor,
        goalsAgainst,
        outcome: goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D',
      };
    });
}

function nextMatchOf(ctx: ClubsContext, club: Club): NextMatchView | null {
  const rounds = ctx.schedule[club.divisionId];
  if (!rounds) return null;
  // Com uma rodada em andamento, o próximo jogo é o da rodada seguinte; sem ela, o da rodada indicada.
  const first = roundInProgress(ctx) ? ctx.roundNumber : ctx.roundNumber - 1;
  for (let i = Math.max(0, first); i < rounds.length; i++) {
    const m = rounds[i].find((x) => x.home === club.id || x.away === club.id);
    if (!m) continue;
    const home = m.home === club.id;
    const opponent = clubOf(ctx, home ? m.away : m.home);
    return { round: i + 1, home, opponentId: opponent.id, opponentName: opponent.name, opponentStrength: bestStrength(ctx, opponent) };
  }
  return null;
}

// ---------- API pública ----------

/** Visão pública de um clube. Igual para o clube controlado e para qualquer adversário. */
export function getClubView(ctx: ClubsContext, clubId: string): ClubView {
  const club = clubOf(ctx, clubId);
  const division = ctx.world.divisions.find((d) => d.id === club.divisionId) ?? null;

  const match = liveMatchOf(ctx, clubId);
  const team = match ? (match.home.clubId === clubId ? match.home : match.away) : null;
  let live: LiveMatchView | null = null;
  if (match && team) {
    const home = match.home.clubId === clubId;
    const opponent = home ? match.away : match.home;
    const shown = shownClock(match);
    live = {
      matchId: match.matchId,
      status: match.status,
      minute: clockLabel(shown),
      half: shown.half,
      home,
      opponentId: opponent.clubId,
      opponentName: opponent.name,
      score: { for: home ? match.score.home : match.score.away, against: home ? match.score.away : match.score.home },
      attendance: match.attendance,
    };
  }

  let standing: ClubView['standing'] = null;
  if (division) {
    const table = tableFor(ctx, division.id);
    const idx = table.findIndex((r) => r.clubId === clubId);
    if (idx !== -1) standing = { ...table[idx], position: idx + 1, clubsInDivision: table.length };
  }

  return {
    id: club.id,
    name: club.name,
    shortName: club.shortName,
    primaryColor: club.primaryColor,
    secondaryColor: club.secondaryColor,
    country: club.country,
    city: club.city,
    division: division ? { id: division.id, name: division.name, level: division.level } : null,
    isControlled: club.id === ctx.controlledClubId,
    reputation: club.reputation,
    strength: bestStrength(ctx, club),
    squad: club.squad.map((id) => playerView(playerOf(ctx, id))).sort(byPositionThenStrength),
    lineup: team ? liveLineup(ctx, team) : autoLineupView(ctx, club),
    live,
    form: recentResultsOf(ctx, clubId),
    standing,
    nextMatch: nextMatchOf(ctx, club),
    stadium: { name: club.stadium.name, capacity: club.stadium.capacity, maxCapacity: club.stadium.maxCapacity },
    finance: {
      payrollPerRound: payroll(club, ctx.world.players),
      estimatedAttendance: computeAttendance(club),
      balance: balanceOf(ctx, club),
    },
  };
}

/** Classificação de uma divisão (rodadas concluídas). */
export function getStandings(ctx: ClubsContext, divisionId: string): StandingView[] {
  return tableFor(ctx, divisionId).map((row, i) => {
    const club = clubOf(ctx, row.clubId);
    return { ...row, position: i + 1, clubName: club.name, isControlled: club.id === ctx.controlledClubId };
  });
}

/** Lista de todos os clubes, para o menu da área CLUBES: por divisão (do topo para baixo) e por nome. */
export function listClubs(ctx: ClubsContext): ClubSummary[] {
  const out: ClubSummary[] = [];
  for (const d of ctx.world.divisions) {
    for (const id of d.clubIds) {
      const club = clubOf(ctx, id);
      out.push({
        id: club.id,
        name: club.name,
        shortName: club.shortName,
        divisionId: d.id,
        divisionName: d.name,
        divisionLevel: d.level,
        strength: bestStrength(ctx, club),
        isControlled: club.id === ctx.controlledClubId,
      });
    }
  }
  return out.sort((a, b) => a.divisionLevel - b.divisionLevel || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
