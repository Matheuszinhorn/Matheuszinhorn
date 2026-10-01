// Tipos centrais do engine. Código em inglês; textos exibidos ficam em game/.
// Só "type" e "interface": nada de enum, para rodar com o TypeScript nativo do Node.

export type Position = 'GK' | 'DEF' | 'MID' | 'ATT';
export type Sector = Position;
export type Style = 'DEFENSIVE' | 'BALANCED' | 'OFFENSIVE';
export type Behavior = 'NORMAL' | 'AGGRESSIVE' | 'REACTIVE';
export type Temperament = 'CALM' | 'NORMAL' | 'EXPLOSIVE';
export type Side = 'home' | 'away';

// ---------- Mundo ----------

export interface Player {
  id: string;
  name: string;
  age: number;
  nationality: string;
  position: Position;
  strength: number; // 1–50
  temperament: Temperament;
  salary: number; // R$ por rodada, inteiro
  marketValue: number; // R$, inteiro
  contract: { endSeason: number };
  clubId: string | null;
  condition: { injuryRounds: number; suspensionRounds: number; yellowCardsAccumulated: number };
}

/** Formação livre: quantos jogadores de linha em cada setor (soma 10). */
export interface Formation {
  DEF: number;
  MID: number;
  ATT: number;
}

export interface Tactics {
  formation: Formation;
  style: Style;
  behavior: Behavior;
}

export interface Club {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  country: string;
  city: string;
  divisionId: string;
  stadium: { name: string; capacity: number; maxCapacity: number };
  money: number;
  reputation: number; // 1–100
  squad: string[]; // ids de jogadores
  defaultTactics: Tactics;
  penaltyTakerId: string | null;
}

// ---------- Escalação ----------

export interface LineupSlot {
  playerId: string;
  sector: Sector;
  x: number; // 0–100, só para a futura tela de campo
  y: number;
}

export interface Lineup {
  clubId: string;
  starters: LineupSlot[];
  bench: string[];
  style: Style;
  behavior: Behavior;
  penaltyTakerId: string | null;
}

// ---------- Partida ----------

export interface Clock {
  half: 1 | 2;
  minute: number; // 1–45 no 1º tempo, 46–90 no 2º
  added: number; // 0 no tempo regulamentar; 1..n nos acréscimos
}

export type MatchStatus = 'RUNNING' | 'AWAITING_DECISION' | 'FINISHED';

/** Cópia dos dados de um jogador que a partida precisa. Deixa o MatchState autossuficiente. */
export interface MatchPlayer {
  id: string;
  name: string;
  position: Position;
  strength: number;
  temperament: Temperament;
}

export interface TeamState {
  clubId: string;
  name: string;
  players: Record<string, MatchPlayer>; // titulares + reservas relacionados
  onField: LineupSlot[];
  bench: string[]; // reservas ainda disponíveis
  subbedOff: string[];
  sentOff: string[];
  injured: string[];
  yellowCards: string[]; // quem já tem um amarelo nesta partida
  subsUsed: number;
  style: Style;
  behavior: Behavior;
  penaltyTakerId: string | null;
  /** Posição que um lesionado/expulso ocupava. O substituto entra ali se o comando não disser outra. */
  vacated: Record<string, LineupSlot>;
}

export type MatchEventType =
  | 'KICKOFF'
  | 'GOAL'
  | 'SAVE'
  | 'WOODWORK'
  | 'PENALTY_AWARDED'
  | 'PENALTY_GOAL'
  | 'PENALTY_MISSED'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'INJURY'
  | 'SUBSTITUTION'
  | 'STOPPAGE'
  | 'HALF_TIME'
  | 'FULL_TIME';

export interface MatchEvent {
  seq: number;
  clock: Clock;
  type: MatchEventType;
  side: Side | null;
  playerId: string | null;
  relatedPlayerId: string | null;
  // PENALTY_MISSED: 'saved' | 'wide'; RED_CARD: 'direct' | 'second_yellow';
  // INJURY: rodadas fora; SUBSTITUTION: 'injury' | 'red_card' | 'tactical'; STOPPAGE: minutos.
  detail: string | number | null;
  score: Score;
}

export interface Score {
  home: number;
  away: number;
}

export interface TeamStats {
  chances: number;
  goals: number;
  saves: number; // defesas do goleiro deste time
  woodwork: number;
  offTarget: number;
  yellowCards: number;
  redCards: number;
  penalties: number;
  penaltyGoals: number;
  injuries: number;
  possession: number; // % informativa, calculada do meio-campo
}

export type DecisionType = 'PENALTY_TAKER' | 'INJURY_SUBSTITUTION' | 'RED_CARD_ADJUSTMENT' | 'TEAM_ADJUSTMENT';

export interface Decision {
  id: string;
  type: DecisionType;
  clubId: string;
  side: Side;
  createdAt: Clock;
  playerId: string | null; // lesionado ou expulso
  eligible: string[];
  suggested: string | null;
}

export interface Substitution {
  out: string;
  in: string;
}

export type Command =
  | { type: 'OPEN_TEAM_ADJUSTMENT'; commandId: string; clubId: string }
  | { type: 'CHOOSE_PENALTY_TAKER'; commandId: string; clubId: string; decisionId: string; playerId: string }
  | {
      type: 'ADJUST_TEAM';
      commandId: string;
      clubId: string;
      decisionId: string;
      substitutions: Substitution[];
      positions?: LineupSlot[];
      style?: Style;
      behavior?: Behavior;
    };

export interface CommandRecord {
  commandId: string;
  clock: Clock;
  origin: 'PLAYER' | 'CPU';
  command: Command;
}

export interface PendingPenalty {
  side: Side;
  awardedAt: Clock;
  takerId: string | null;
}

export interface MatchState {
  engineVersion: string;
  matchId: string;
  seed: string;
  clock: Clock; // próximo minuto a ser jogado
  stoppage: { first: number | null; second: number | null };
  status: MatchStatus;
  decision: Decision | null;
  decisionQueue: Decision[];
  controlledClubId: string | null;
  attendance: number;
  home: TeamState;
  away: TeamState;
  pendingPenalty: PendingPenalty | null;
  score: Score;
  events: MatchEvent[];
  stats: { home: TeamStats; away: TeamStats };
  commands: CommandRecord[];
  /** Minutos já jogados (inclui acréscimos). Usado na posse de bola média. */
  minutesPlayed: number;
  /** Contador que torna o id de cada Decision determinístico. */
  decisionSeq: number;
}

/** Resumo de uma partida encerrada: o que as camadas de temporada e economia precisam aplicar. */
export interface MatchResult {
  matchId: string;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
  attendance: number;
  injuries: { clubId: string; playerId: string; rounds: number }[];
  redCards: { clubId: string; playerId: string }[];
  yellowCards: { clubId: string; playerId: string }[];
}

export interface MatchTeamInput {
  club: Club;
  lineup: Lineup;
  players: Record<string, Player>;
}

export interface MatchInput {
  matchId: string;
  seed: string;
  home: MatchTeamInput;
  away: MatchTeamInput;
  controlledClubId?: string | null;
  attendance?: number;
}

export type CommandErrorCode =
  | 'INVALID_STATUS'
  | 'NOT_CONTROLLED'
  | 'NO_DECISION'
  | 'WRONG_DECISION'
  | 'INVALID_PLAYER'
  | 'INVALID_LINEUP';

export type CommandResult =
  | { ok: true; state: MatchState; duplicate: boolean }
  | { ok: false; state: MatchState; error: CommandErrorCode; message: string };
