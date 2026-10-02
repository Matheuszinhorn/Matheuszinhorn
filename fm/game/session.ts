import {
  applyRoundCommand,
  awaitingMatch,
  createRound,
  isRoundFinished,
  roundResults,
  stepRound,
  type Command,
  type CommandResult,
  type Decision,
  type Fixture,
  type LineupSlot,
  type MatchEvent,
  type MatchResult,
  type RoundState,
  type Style,
  type Behavior,
  type Substitution,
} from '../engine/index.ts';

// Sessão de jogo (seções 23 e 26). Fica ENTRE o engine e a interface:
//   ENGINE  →  GAME (esta camada)  →  INTERFACE (futura)
//
// A sessão decide QUANDO chamar stepRound. É só isso que a velocidade faz.
// O engine não conhece velocidade, relógio real, pausa de interface nem telas.
//
// Determinismo: mesma seed + mesmos dados + mesmas decisões do jogador = mesmo resultado,
// em qualquer velocidade, com qualquer número de pausas.

// ---------- Velocidades ----------

/** Identificadores em inglês no código; o rótulo em português é o que a interface mostra. */
export type SpeedId = 'SLOW' | 'NORMAL' | 'FAST' | 'VERY_FAST' | 'INSTANT';

export interface SpeedInfo {
  label: string;
  /** Espera real, em ms, entre uma chamada de stepRound (1 minuto de jogo) e a seguinte. 0 = sem espera. */
  intervalMs: number;
}

export const SPEEDS: Record<SpeedId, SpeedInfo> = {
  SLOW: { label: 'LENTA', intervalMs: 1000 },
  NORMAL: { label: 'NORMAL', intervalMs: 500 },
  FAST: { label: 'RÁPIDA', intervalMs: 250 },
  VERY_FAST: { label: 'MUITO RÁPIDA', intervalMs: 100 },
  INSTANT: { label: 'INSTANTÂNEA', intervalMs: 0 },
};

export const SPEED_ORDER: SpeedId[] = ['SLOW', 'NORMAL', 'FAST', 'VERY_FAST', 'INSTANT'];

// ---------- Temporizador injetável ----------

export interface Scheduler {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

/** Temporizador real. Nos testes, injete um temporizador falso que avança o tempo à mão. */
export const systemScheduler: Scheduler = {
  setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>),
};

// ---------- Estado ----------

export type SessionStatus =
  | 'IDLE' // sem rodada
  | 'READY' // rodada criada, ainda não iniciada
  | 'PLAYING'
  | 'PAUSED' // pausa do usuário ou consulta a CLUBES
  | 'AWAITING_DECISION' // o engine espera uma decisão do jogador
  | 'ROUND_FINISHED';

/**
 * Por que a rodada está parada, do ponto de vista da interface. Decisões obrigatórias não entram aqui: vêm do engine.
 * HALFTIME e EVENT só existem com a opção stopOnEvents: intervalo, pênalti, lesão e expulsão na partida do clube
 * controlado sempre param a rodada (quando o próprio engine não abriu uma decisão para o lance).
 */
export type PauseReason = 'USER' | 'CLUBS' | 'HALFTIME' | 'EVENT';

/** Lances que param a partida do clube controlado. */
export const STOP_EVENTS: readonly MatchEvent['type'][] = ['PENALTY_AWARDED', 'INJURY', 'RED_CARD'];

export interface SessionStop {
  kind: 'HALFTIME' | 'EVENT';
  matchId: string;
  event: MatchEvent;
}

export interface PendingDecision {
  matchId: string;
  decision: Decision;
}

export interface SessionSnapshot {
  status: SessionStatus;
  round: RoundState | null;
  controlledClubId: string | null;
  speed: SpeedId;
  pauses: PauseReason[];
  pending: PendingDecision | null;
  /** Parada obrigatória atual (intervalo ou lance importante), se houver. */
  stop: SessionStop | null;
}

export interface StartRoundInput {
  roundId: string;
  seed: string;
  fixtures: readonly Fixture[];
  controlledClubId?: string | null;
}

export interface TeamChanges {
  substitutions?: Substitution[];
  positions?: LineupSlot[];
  style?: Style;
  behavior?: Behavior;
}

export class SessionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
  }
}

export interface Session {
  getState(): SessionSnapshot;
  subscribe(listener: (snapshot: SessionSnapshot) => void): () => void;
  startRound(input: StartRoundInput): void;
  play(): void;
  pause(): void;
  resume(): void;
  openClubs(): void;
  closeClubs(): void;
  setSpeed(speed: SpeedId): void;
  /** CONTINUAR depois do intervalo ou de um lance que parou a partida. */
  continueStop(): void;
  /** MEU TIME: pausa a partida do clube controlado e abre o ajuste do time. */
  openTeamAdjustment(opts?: { commandId?: string }): CommandResult;
  choosePenaltyTaker(playerId: string, opts?: { commandId?: string }): CommandResult;
  /** CONTINUAR: envia as mudanças do rascunho (ou nenhuma) e libera a partida. */
  adjustTeam(changes?: TeamChanges, opts?: { commandId?: string }): CommandResult;
  /** Caminho genérico: qualquer comando do engine, encaminhado para a partida do clube dele. */
  dispatch(command: Command): CommandResult;
  results(): MatchResult[];
  dispose(): void;
}

export interface SessionOptions {
  scheduler?: Scheduler;
  speed?: SpeedId;
  /** Para no intervalo e nos lances importantes da partida do clube controlado (o app liga; os testes antigos não). */
  stopOnEvents?: boolean;
}

// Nunca chega perto disso: 90 minutos + acréscimos (máx. 8 + 8) + extensões de pênalti.
const MAX_STEPS = 1000;

export function createSession(options: SessionOptions = {}): Session {
  const scheduler = options.scheduler ?? systemScheduler;
  let speed: SpeedId = options.speed ?? 'NORMAL';
  let round: RoundState | null = null;
  let controlledClubId: string | null = null;
  let playing = false;
  const pauses = new Set<PauseReason>();
  let timer: unknown = null;
  let commandSeq = 0;
  let disposed = false;
  const stopOnEvents = options.stopOnEvents ?? false;
  /** quantos eventos da partida controlada já foram examinados */
  let seen = 0;
  let stop: SessionStop | null = null;
  const queue: SessionStop[] = [];
  const listeners = new Set<(snapshot: SessionSnapshot) => void>();

  // ----- leitura -----

  function pendingDecision(): PendingDecision | null {
    if (!round) return null;
    const match = awaitingMatch(round);
    return match && match.decision ? { matchId: match.matchId, decision: match.decision } : null;
  }

  function statusOf(): SessionStatus {
    if (!round) return 'IDLE';
    if (isRoundFinished(round)) return 'ROUND_FINISHED';
    if (awaitingMatch(round)) return 'AWAITING_DECISION';
    if (pauses.size > 0) return 'PAUSED';
    return playing ? 'PLAYING' : 'READY';
  }

  function snapshot(): SessionSnapshot {
    return { status: statusOf(), round, controlledClubId, speed, pauses: [...pauses], pending: pendingDecision(), stop };
  }

  function emit(): void {
    if (disposed) return;
    const snap = snapshot();
    for (const listener of [...listeners]) listener(snap);
  }

  // ----- o laço de avanço: a única coisa que a velocidade controla -----

  function canAdvance(): boolean {
    return !disposed && round !== null && playing && pauses.size === 0 && !isRoundFinished(round) && !awaitingMatch(round);
  }

  function cancelTimer(): void {
    if (timer !== null) {
      scheduler.clearTimeout(timer);
      timer = null;
    }
  }

  /** Examina os eventos novos da partida controlada e para a rodada no intervalo e nos lances importantes. */
  function checkStops(): void {
    if (!stopOnEvents || !round || !controlledClubId) return;
    const m = round.matches.find((x) => x.home.clubId === controlledClubId || x.away.clubId === controlledClubId);
    if (!m) return;
    const fresh = m.events.slice(seen);
    seen = m.events.length;
    for (const e of fresh) {
      if (e.type === 'HALF_TIME') queue.push({ kind: 'HALFTIME', matchId: m.matchId, event: e });
      else if (STOP_EVENTS.includes(e.type)) {
        // o engine já abriu uma decisão do jogador para este lance (pênalti a favor, lesão ou expulsão no time dele):
        // o pop-up da decisão é a parada; não empilha outra
        const ownDecision = e.side !== null && m[e.side].clubId === controlledClubId && (m.decision !== null || m.decisionQueue.length > 0);
        if (!ownDecision) queue.push({ kind: 'EVENT', matchId: m.matchId, event: e });
      }
    }
    if (!stop && queue.length) {
      stop = queue.shift() as SessionStop;
      pauses.add(stop.kind);
    }
  }

  function tick(): void {
    timer = null;
    if (!canAdvance()) return;
    round = stepRound(round as RoundState);
    checkStops();
    emit();
    scheduleNext();
  }

  /** INSTANTÂNEA: sem espera. Avança até a próxima decisão, pausa ou o fim, e avisa uma única vez. */
  function runWithoutWaiting(): void {
    let stepped = 0;
    while (canAdvance()) {
      if (++stepped > MAX_STEPS) throw new SessionError('RUNAWAY', 'a rodada não terminou');
      round = stepRound(round as RoundState);
      checkStops();
    }
    if (stepped > 0) emit();
  }

  function scheduleNext(): void {
    cancelTimer();
    if (!canAdvance()) return;
    if (SPEEDS[speed].intervalMs === 0) runWithoutWaiting();
    else timer = scheduler.setTimeout(tick, SPEEDS[speed].intervalMs);
  }

  // ----- comandos -----

  function nextCommandId(matchId: string, override?: string): string {
    return override ?? `${matchId}:c${++commandSeq}`;
  }

  function requireRound(): RoundState {
    if (!round) throw new SessionError('NO_ROUND', 'não há rodada em andamento');
    return round;
  }

  function controlledMatchId(): string {
    const r = requireRound();
    if (!controlledClubId) throw new SessionError('NO_CONTROLLED_CLUB', 'não há clube controlado nesta rodada');
    const match = r.matches.find((m) => m.home.clubId === controlledClubId || m.away.clubId === controlledClubId);
    if (!match) throw new SessionError('UNKNOWN_CLUB', `o clube controlado não joga esta rodada: ${controlledClubId}`);
    return match.matchId;
  }

  function dispatch(command: Command): CommandResult {
    const r = requireRound();
    const match = r.matches.find((m) => m.home.clubId === command.clubId || m.away.clubId === command.clubId);
    if (!match) throw new SessionError('UNKNOWN_CLUB', `o clube ${command.clubId} não joga esta rodada`);
    const applied = applyRoundCommand(r, match.matchId, command);
    round = applied.round;
    emit();
    scheduleNext(); // se a decisão foi resolvida e a rodada estava em andamento, volta a andar
    return applied.result;
  }

  function pendingOfType(...types: Decision['type'][]): PendingDecision {
    const pending = pendingDecision();
    if (!pending) throw new SessionError('NO_DECISION', 'não há decisão pendente');
    if (!types.includes(pending.decision.type)) {
      throw new SessionError('WRONG_DECISION', `a decisão pendente é ${pending.decision.type}`);
    }
    return pending;
  }

  return {
    getState: snapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    startRound(input) {
      if (round && !isRoundFinished(round)) throw new SessionError('ROUND_IN_PROGRESS', 'a rodada anterior ainda não terminou');
      cancelTimer();
      controlledClubId = input.controlledClubId ?? null;
      round = createRound(input.roundId, input.seed, input.fixtures, controlledClubId);
      playing = false;
      pauses.clear();
      commandSeq = 0;
      seen = 0;
      stop = null;
      queue.length = 0;
      emit();
    },

    play() {
      requireRound();
      playing = true;
      emit();
      scheduleNext();
    },

    pause() {
      pauses.add('USER');
      cancelTimer();
      emit();
    },

    resume() {
      pauses.delete('USER');
      emit();
      scheduleNext();
    },

    openClubs() {
      pauses.add('CLUBS');
      cancelTimer();
      emit();
    },

    closeClubs() {
      pauses.delete('CLUBS');
      emit();
      scheduleNext();
    },

    continueStop() {
      if (!stop) return;
      pauses.delete(stop.kind);
      stop = null;
      if (queue.length) {
        stop = queue.shift() as SessionStop;
        pauses.add(stop.kind);
      }
      emit();
      scheduleNext();
    },

    setSpeed(next) {
      if (!(next in SPEEDS)) throw new SessionError('INVALID_SPEED', `velocidade desconhecida: ${String(next)}`);
      speed = next;
      emit();
      scheduleNext(); // reprograma com o novo intervalo; nada do jogo muda
    },

    openTeamAdjustment(opts) {
      const matchId = controlledMatchId();
      return dispatch({ type: 'OPEN_TEAM_ADJUSTMENT', commandId: nextCommandId(matchId, opts?.commandId), clubId: controlledClubId as string });
    },

    choosePenaltyTaker(playerId, opts) {
      const { matchId, decision } = pendingOfType('PENALTY_TAKER');
      return dispatch({
        type: 'CHOOSE_PENALTY_TAKER',
        commandId: nextCommandId(matchId, opts?.commandId),
        clubId: decision.clubId,
        decisionId: decision.id,
        playerId,
      });
    },

    adjustTeam(changes = {}, opts) {
      const { matchId, decision } = pendingOfType('INJURY_SUBSTITUTION', 'RED_CARD_ADJUSTMENT', 'TEAM_ADJUSTMENT');
      return dispatch({
        type: 'ADJUST_TEAM',
        commandId: nextCommandId(matchId, opts?.commandId),
        clubId: decision.clubId,
        decisionId: decision.id,
        substitutions: changes.substitutions ?? [],
        positions: changes.positions,
        style: changes.style,
        behavior: changes.behavior,
      });
    },

    dispatch,

    results() {
      return round ? roundResults(round) : [];
    },

    dispose() {
      disposed = true;
      cancelTimer();
      listeners.clear();
    },
  };
}
