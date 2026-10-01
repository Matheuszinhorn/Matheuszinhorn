import {
  DEFAULT_FINANCE,
  applyPromotionRelegation,
  autoLineup,
  createRng,
  deriveSeed,
  doubleRoundRobin,
  formationOf,
  generateWorld,
  prepareFixture,
  settleRound,
  standardRules,
  validateLineup,
  withDivisions,
  type Club,
  type ClubFinanceEntry,
  type Fixture,
  type Lineup,
  type MatchResult,
  type Movement,
  type Player,
  type PromotionResult,
  type RoundState,
  type ScheduledMatch,
  type World,
} from '../engine/index.ts';
import { getStandings, type ClubsContext, type PlayedMatch } from './queries.ts';

// Carreira (camada game/): junta os módulos que já existem (calendário, classificação, promoção, finanças, mundo, escalação)
// e faz o que faltava entre uma rodada e outra: aplicar lesões e suspensões, fechar as finanças UMA vez, virar a temporada.
// Funções puras: cada uma devolve uma carreira nova e nunca altera a recebida. Nada aqui conhece telas.
// O engine é o contrato: nenhuma regra de partida mora aqui.

export const CAREER_VERSION = 1;
export const ROUNDS_PER_SEASON = 38;
export const FIRST_SEASON = 2026;
/** Suspensões (seção 14): vermelho = 1 rodada; 3 amarelos acumulados = 1 rodada. */
export const YELLOW_LIMIT = 3;

export class CareerError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'CareerError';
    this.code = code;
  }
}

export interface Coach {
  name: string;
}

export interface SeasonReport {
  season: number;
  userClubId: string;
  userDivisionId: string;
  userPosition: number;
  champions: Record<string, string>;
  movements: Movement[];
  userMovement: Movement | null;
  /** saldo financeiro do clube do jogador na temporada (soma do extrato) */
  userNet: number;
}

export interface CareerState {
  version: number;
  seed: string;
  season: number;
  coach: Coach;
  userClubId: string;
  world: World;
  /** Calendário da temporada por divisão: rodada → partidas. */
  schedule: Record<string, ScheduledMatch[][]>;
  /** Próxima rodada a jogar (1 a 38). Passa de 38 quando a temporada termina. */
  roundNumber: number;
  results: PlayedMatch[];
  /** Escalação escolhida pelo jogador. null = melhor time disponível com a tática padrão do clube. */
  userLineup: Lineup | null;
  /** Extrato financeiro do clube do jogador nesta temporada, uma linha por rodada. */
  userLedger: ClubFinanceEntry[];
  /** Definido quando a temporada termina; aplicado por startNextSeason. */
  pendingPromotion: PromotionResult | null;
  history: SeasonReport[];
}

// ---------- Criação ----------

/** Três clubes oferecidos ao treinador novo: um da 3ª divisão e dois da 4ª (a carreira começa por baixo). */
export function careerOffers(seed: string): string[] {
  const world = generateWorld(seed);
  const rng = createRng(deriveSeed(seed, 'ofertas'));
  const pool = (level: number) => (world.divisions.find((d) => d.level === level)?.clubIds ?? []).slice();
  const picks: string[] = [];
  for (const level of [3, 4, 4]) {
    const options = pool(level).filter((id) => !picks.includes(id));
    picks.push(rng.pick(options));
  }
  return picks;
}

function buildSchedule(world: World, seed: string, season: number): Record<string, ScheduledMatch[][]> {
  const schedule: Record<string, ScheduledMatch[][]> = {};
  for (const d of world.divisions) schedule[d.id] = doubleRoundRobin(d.clubIds, deriveSeed(seed, `S${season}:${d.id}`));
  return schedule;
}

export function createCareer(input: { seed: string; coachName: string; clubId: string; season?: number }): CareerState {
  const name = input.coachName.trim();
  if (name.length === 0) throw new CareerError('COACH_NAME', 'o treinador precisa de um nome');
  const world = generateWorld(input.seed);
  if (!world.clubs[input.clubId]) throw new CareerError('UNKNOWN_CLUB', `clube inexistente: ${input.clubId}`);
  const season = input.season ?? FIRST_SEASON;
  return {
    version: CAREER_VERSION,
    seed: input.seed,
    season,
    coach: { name },
    userClubId: input.clubId,
    world,
    schedule: buildSchedule(world, input.seed, season),
    roundNumber: 1,
    results: [],
    userLineup: null,
    userLedger: [],
    pendingPromotion: null,
    history: [],
  };
}

// ---------- Leitura ----------

export function isSeasonOver(c: CareerState): boolean {
  return c.roundNumber > ROUNDS_PER_SEASON;
}

export function userClub(c: CareerState): Club {
  return c.world.clubs[c.userClubId];
}

/** Contexto das consultas (CLUBES, classificação): a mesma estrutura que game/queries.ts já espera. */
export function clubsContext(c: CareerState, round: RoundState | null = null): ClubsContext {
  return {
    world: c.world,
    controlledClubId: c.userClubId,
    roundNumber: Math.min(c.roundNumber, ROUNDS_PER_SEASON),
    round,
    schedule: c.schedule,
    results: c.results,
    tiebreakSeed: undefined,
  };
}

/** Classificação atual da divisão (a mesma regra da tabela final, que decide acesso e rebaixamento). */
export function divisionStandings(c: CareerState, divisionId: string) {
  return getStandings(clubsContext(c), divisionId);
}

// ---------- Escalação do jogador ----------

export interface ResolvedLineup {
  lineup: Lineup;
  /** true quando a escalação escolhida deixou de valer (lesão, suspensão) e o jogo montou outra */
  adjusted: boolean;
  errors: string[];
}

/** A escalação que vai a campo: a do jogador, se ainda for válida; senão o melhor time disponível, mantendo formação e tática. */
export function resolveUserLineup(c: CareerState): ResolvedLineup {
  const club = userClub(c);
  const chosen = c.userLineup;
  if (chosen) {
    const errors = validateLineup(chosen, club, c.world.players);
    if (errors.length === 0) return { lineup: chosen, adjusted: false, errors: [] };
    const auto = autoLineup(club, c.world.players, { formation: formationOf(chosen.starters), style: chosen.style, behavior: chosen.behavior });
    return { lineup: auto, adjusted: true, errors };
  }
  return { lineup: autoLineup(club, c.world.players, club.defaultTactics), adjusted: false, errors: [] };
}

/** Grava a escalação escolhida. Recusa escalação inválida (o motor nunca recebe uma). */
export function withUserLineup(c: CareerState, lineup: Lineup): CareerState {
  const errors = validateLineup(lineup, userClub(c), c.world.players);
  if (errors.length > 0) throw new CareerError('INVALID_LINEUP', errors.join('; '));
  return { ...c, userLineup: lineup };
}

// ---------- Rodada ----------

export interface RoundPlan {
  roundNumber: number;
  roundId: string;
  seed: string;
  fixtures: Fixture[];
  controlledClubId: string;
  userMatchId: string;
  lineupAdjusted: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Id estável de partida (seção 16): "T2026-D2-R05-P07". Mudar o formato muda as seeds. */
export function matchIdFor(season: number, level: number, round: number, pos: number): string {
  return `T${season}-D${level}-R${pad(round)}-P${pad(pos)}`;
}

function scheduledFor(c: CareerState, round: number) {
  const out: { matchId: string; home: string; away: string }[] = [];
  for (const d of c.world.divisions) {
    (c.schedule[d.id][round - 1] ?? []).forEach((f, i) => out.push({ matchId: matchIdFor(c.season, d.level, round, i + 1), home: f.home, away: f.away }));
  }
  return out;
}

export function planRound(c: CareerState): RoundPlan {
  if (isSeasonOver(c)) throw new CareerError('SEASON_OVER', 'a temporada terminou: comece a próxima');
  const resolved = resolveUserLineup(c);
  const lineups = { [c.userClubId]: resolved.lineup };
  const fixtures = scheduledFor(c, c.roundNumber).map((m) => prepareFixture(m.matchId, c.world.clubs[m.home], c.world.clubs[m.away], c.world.players, lineups));
  const mine = scheduledFor(c, c.roundNumber).find((m) => m.home === c.userClubId || m.away === c.userClubId);
  if (!mine) throw new CareerError('NO_MATCH', 'o clube do jogador não joga nesta rodada');
  const roundId = `T${c.season}-R${pad(c.roundNumber)}`;
  return {
    roundNumber: c.roundNumber,
    roundId,
    seed: deriveSeed(c.seed, roundId),
    fixtures,
    controlledClubId: c.userClubId,
    userMatchId: mine.matchId,
    lineupAdjusted: resolved.adjusted,
  };
}

/** Lesões e suspensões (seção 13 e 14): quem ficou de fora cumpre uma rodada; depois entram os eventos novos desta rodada. */
export function applyConditions(players: Record<string, Player>, results: readonly MatchResult[]): Record<string, Player> {
  const next: Record<string, Player> = { ...players };
  const patch = (id: string, fn: (c: Player['condition']) => Player['condition']) => {
    const p = next[id];
    if (p) next[id] = { ...p, condition: fn(p.condition) };
  };
  for (const id of Object.keys(next)) {
    const c = next[id].condition;
    if (c.injuryRounds > 0 || c.suspensionRounds > 0) {
      patch(id, (x) => ({ ...x, injuryRounds: Math.max(0, x.injuryRounds - 1), suspensionRounds: Math.max(0, x.suspensionRounds - 1) }));
    }
  }
  for (const r of results) {
    for (const i of r.injuries) patch(i.playerId, (x) => ({ ...x, injuryRounds: Math.max(x.injuryRounds, i.rounds) }));
    for (const y of r.yellowCards) {
      patch(y.playerId, (x) => {
        const total = x.yellowCardsAccumulated + 1;
        return total >= YELLOW_LIMIT ? { ...x, yellowCardsAccumulated: 0, suspensionRounds: Math.max(x.suspensionRounds, 1) } : { ...x, yellowCardsAccumulated: total };
      });
    }
    for (const red of r.redCards) patch(red.playerId, (x) => ({ ...x, suspensionRounds: Math.max(x.suspensionRounds, 1) }));
  }
  return next;
}

export interface RoundOutcome {
  career: CareerState;
  /** extrato do clube do jogador nesta rodada */
  ledger: ClubFinanceEntry;
  seasonEnded: boolean;
}

/** Fase de aplicação (seção 16): só depois que as 40 partidas terminam. Aplique UMA vez por rodada. */
export function finishRound(c: CareerState, results: readonly MatchResult[]): RoundOutcome {
  if (isSeasonOver(c)) throw new CareerError('SEASON_OVER', 'a temporada já terminou');
  const expected = scheduledFor(c, c.roundNumber).map((m) => m.matchId).sort();
  const got = results.map((r) => r.matchId).sort();
  if (expected.length !== got.length || expected.some((id, i) => id !== got[i])) {
    throw new CareerError('ROUND_MISMATCH', `os resultados não são os da rodada ${c.roundNumber}`);
  }
  const settled = settleRound(c.world.clubs, c.world.players, results, DEFAULT_FINANCE);
  const players = applyConditions(c.world.players, results);
  const played: PlayedMatch[] = results.map((r) => ({ round: c.roundNumber, homeClubId: r.homeClubId, awayClubId: r.awayClubId, homeGoals: r.homeGoals, awayGoals: r.awayGoals }));
  const mine = settled.ledger.find((e) => e.clubId === c.userClubId);
  if (!mine) throw new CareerError('NO_LEDGER', 'o clube do jogador não aparece nos resultados');
  let career: CareerState = {
    ...c,
    world: { ...c.world, clubs: settled.clubs, players },
    results: [...c.results, ...played],
    userLedger: [...c.userLedger, mine],
    roundNumber: c.roundNumber + 1,
  };
  const seasonEnded = isSeasonOver(career);
  if (seasonEnded) career = closeSeason(career);
  return { career, ledger: mine, seasonEnded };
}

function closeSeason(c: CareerState): CareerState {
  const ctx = clubsContext(c);
  const promotion = applyPromotionRelegation(
    { divisions: c.world.divisions.map((d) => ({ id: d.id, name: d.name, level: d.level, standings: getStandings(ctx, d.id) })) },
    standardRules(c.world.divisions),
  );
  const userDiv = userClub(c).divisionId;
  const table = getStandings(ctx, userDiv);
  const report: SeasonReport = {
    season: c.season,
    userClubId: c.userClubId,
    userDivisionId: userDiv,
    userPosition: table.findIndex((row) => row.clubId === c.userClubId) + 1,
    champions: promotion.champions,
    movements: promotion.movements,
    userMovement: promotion.movements.find((m) => m.clubId === c.userClubId) ?? null,
    userNet: c.userLedger.reduce((sum, e) => sum + e.net, 0),
  };
  return { ...c, pendingPromotion: promotion, history: [...c.history, report] };
}

/** Nova temporada: aplica acesso e rebaixamento, gera o calendário e zera resultados, extrato e cartões acumulados. */
export function startNextSeason(c: CareerState): CareerState {
  if (!isSeasonOver(c) || !c.pendingPromotion) throw new CareerError('SEASON_NOT_OVER', 'a temporada ainda não terminou');
  const moved = withDivisions(c.world, c.pendingPromotion.divisions);
  const players: Record<string, Player> = {};
  for (const [id, p] of Object.entries(moved.players)) {
    players[id] = p.condition.yellowCardsAccumulated > 0 ? { ...p, condition: { ...p.condition, yellowCardsAccumulated: 0 } } : p;
  }
  const world: World = { ...moved, players };
  const season = c.season + 1;
  return { ...c, world, season, schedule: buildSchedule(world, c.seed, season), roundNumber: 1, results: [], userLedger: [], pendingPromotion: null };
}

// ---------- Persistência ----------

export function serializeCareer(c: CareerState): string {
  return JSON.stringify(c);
}

export function deserializeCareer(json: string): CareerState {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new CareerError('BAD_SAVE', 'o arquivo de carreira está corrompido');
  }
  const c = data as Partial<CareerState> | null;
  if (!c || c.version !== CAREER_VERSION || !c.world || !c.schedule || !c.userClubId) throw new CareerError('BAD_SAVE', 'carreira salva em formato desconhecido');
  return c as CareerState;
}
