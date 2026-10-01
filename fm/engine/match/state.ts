import { DEFAULT_CONFIG, type EngineConfig } from '../config.ts';
import { validateLineup } from '../lineup.ts';
import type {
  Clock,
  MatchEvent,
  MatchInput,
  MatchPlayer,
  MatchState,
  MatchTeamInput,
  Side,
  TeamState,
  TeamStats,
} from '../types.ts';

/** Erro do motor com código estável (ex.: step chamado com decisão pendente). */
export class EngineError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
  }
}

export function emptyStats(): TeamStats {
  return {
    chances: 0,
    goals: 0,
    saves: 0,
    woodwork: 0,
    offTarget: 0,
    yellowCards: 0,
    redCards: 0,
    penalties: 0,
    penaltyGoals: 0,
    injuries: 0,
    possession: 50,
  };
}

function buildTeam(input: MatchTeamInput): TeamState {
  const players: Record<string, MatchPlayer> = {};
  for (const id of [...input.lineup.starters.map((s) => s.playerId), ...input.lineup.bench]) {
    const p = input.players[id];
    players[id] = { id: p.id, name: p.name, position: p.position, strength: p.strength, temperament: p.temperament };
  }
  return {
    clubId: input.club.id,
    name: input.club.name,
    players,
    onField: input.lineup.starters.map((s) => ({ ...s })),
    bench: [...input.lineup.bench],
    subbedOff: [],
    sentOff: [],
    injured: [],
    yellowCards: [],
    subsUsed: 0,
    style: input.lineup.style,
    behavior: input.lineup.behavior,
    penaltyTakerId: input.lineup.penaltyTakerId,
    vacated: {},
  };
}

/** Cria a partida. Escalação inválida gera erro: o motor não simula nem "conserta" em silêncio. */
export function createMatch(input: MatchInput, cfg: EngineConfig = DEFAULT_CONFIG): MatchState {
  for (const side of ['home', 'away'] as const) {
    const t = input[side];
    const errors = validateLineup(t.lineup, t.club, t.players, cfg);
    if (errors.length > 0) throw new EngineError('INVALID_LINEUP', `${t.club.name}: ${errors.join('; ')}`);
  }
  if (input.home.club.id === input.away.club.id) throw new EngineError('INVALID_MATCH', 'um clube não joga contra si mesmo');
  const controlled = input.controlledClubId ?? null;
  if (controlled !== null && controlled !== input.home.club.id && controlled !== input.away.club.id) {
    throw new EngineError('INVALID_MATCH', 'clube controlado não está nesta partida');
  }

  const state: MatchState = {
    engineVersion: cfg.engineVersion,
    matchId: input.matchId,
    seed: input.seed,
    clock: { half: 1, minute: 1, added: 0 },
    stoppage: { first: null, second: null },
    status: 'RUNNING',
    decision: null,
    decisionQueue: [],
    controlledClubId: controlled,
    attendance: input.attendance ?? 0,
    home: buildTeam(input.home),
    away: buildTeam(input.away),
    pendingPenalty: null,
    score: { home: 0, away: 0 },
    events: [],
    stats: { home: emptyStats(), away: emptyStats() },
    commands: [],
    minutesPlayed: 0,
    decisionSeq: 0,
  };
  pushEvent(state, { clock: state.clock, type: 'KICKOFF', side: null });
  return state;
}

export function otherSide(side: Side): Side {
  return side === 'home' ? 'away' : 'home';
}

export function sideOfClub(state: MatchState, clubId: string): Side | null {
  if (state.home.clubId === clubId) return 'home';
  if (state.away.clubId === clubId) return 'away';
  return null;
}

/** Cópia profunda: o motor trabalha sempre numa cópia e nunca altera o estado recebido. */
export function cloneState(state: MatchState): MatchState {
  return structuredClone(state);
}

/**
 * O relógio já ultrapassou o fim da partida?
 * Ao jogar o último minuto do 2º tempo (o último de acréscimo, ou a extensão de um pênalti), o relógio vai para
 * "um minuto depois" (90, added > acréscimo). Esse é o sinal de fim: a partida só vira FINISHED quando não há
 * decisão pendente (seção 23: decisão obrigatória bloqueia o FINISHED, inclusive em 90+).
 * Com pênalti pendente o relógio também fica além do acréscimo (extensão), mas aí o jogo continua.
 */
export function isPastEnd(state: MatchState): boolean {
  const stoppage = state.stoppage.second;
  return (
    state.clock.half === 2 &&
    state.clock.minute === 90 &&
    stoppage !== null &&
    state.clock.added > stoppage &&
    state.pendingPenalty === null
  );
}

/** Último minuto realmente jogado, quando o relógio já passou do fim. */
function lastPlayedClock(state: MatchState): Clock {
  return { half: 2, minute: 90, added: state.clock.added - 1 };
}

/** Relógio a gravar num evento gerado agora: no fim da partida, o último minuto jogado (não o "minuto seguinte"). */
export function eventClock(state: MatchState): Clock {
  return isPastEnd(state) ? lastPlayedClock(state) : state.clock;
}

/**
 * Encerra a partida se o relógio já passou do fim E não há decisão pendente. Chamada depois de cada minuto
 * jogado e depois de cada decisão resolvida: é o único caminho para FINISHED.
 */
export function finishIfOver(state: MatchState): void {
  if (state.status !== 'RUNNING' || state.decision !== null || !isPastEnd(state)) return;
  pushEvent(state, { clock: lastPlayedClock(state), type: 'FULL_TIME', side: null });
  state.status = 'FINISHED';
}

export function sameClock(a: Clock, b: Clock): boolean {
  return a.half === b.half && a.minute === b.minute && a.added === b.added;
}

/** Rótulo neutro de idioma, útil em logs e testes: "45+2", "90". */
export function clockLabel(c: Clock): string {
  return c.added > 0 ? `${c.minute}+${c.added}` : `${c.minute}`;
}

export function pushEvent(
  state: MatchState,
  e: Pick<MatchEvent, 'clock' | 'type' | 'side'> & Partial<Pick<MatchEvent, 'playerId' | 'relatedPlayerId' | 'detail'>>,
): void {
  state.events.push({
    seq: state.events.length,
    clock: { ...e.clock },
    type: e.type,
    side: e.side,
    playerId: e.playerId ?? null,
    relatedPlayerId: e.relatedPlayerId ?? null,
    detail: e.detail ?? null,
    score: { ...state.score },
  });
}

/** Tira um jogador de campo (lesão ou expulsão) e guarda a posição que ele ocupava. */
export function removeFromField(team: TeamState, playerId: string): void {
  const idx = team.onField.findIndex((s) => s.playerId === playerId);
  if (idx === -1) return;
  team.vacated[playerId] = { ...team.onField[idx] };
  team.onField.splice(idx, 1);
}

export function isOnField(team: TeamState, playerId: string): boolean {
  return team.onField.some((s) => s.playerId === playerId);
}
