import type { EngineConfig } from '../config.ts';
import { clockKey } from '../rng.ts';
import type { Clock, Decision, DecisionType, MatchState, Side } from '../types.ts';
import { canSubstitute, cpuPenaltyTaker, cpuReplacement, strongestBenchGoalkeeper } from './cpu.ts';

// Uma decisão por vez (seção 23). As demais esperam em decisionQueue, na ordem dos eventos.

/** Recalcula quem é elegível e a sugestão com o estado ATUAL (o time pode ter mudado na decisão anterior). */
export function refreshDecision(state: MatchState, d: Decision, cfg: EngineConfig): Decision {
  const team = state[d.side];
  const subsLeft = canSubstitute(team, cfg);
  let eligible: string[];
  let suggested: string | null = null;

  if (d.type === 'PENALTY_TAKER') {
    eligible = team.onField.map((s) => s.playerId);
    suggested = cpuPenaltyTaker(team);
  } else {
    eligible = subsLeft ? [...team.bench] : [];
    const vacated = d.playerId ? team.vacated[d.playerId] : undefined;
    if (d.type === 'INJURY_SUBSTITUTION' && subsLeft && vacated) suggested = cpuReplacement(team, vacated.sector, cfg);
    if (d.type === 'RED_CARD_ADJUSTMENT' && subsLeft && vacated?.sector === 'GK') suggested = strongestBenchGoalkeeper(team);
  }
  return { ...d, eligible, suggested };
}

/** id determinístico: matchId + relógio + tipo + sequência. */
export function buildDecision(
  state: MatchState,
  side: Side,
  type: DecisionType,
  playerId: string | null,
  createdAt: Clock,
  cfg: EngineConfig,
): Decision {
  state.decisionSeq += 1;
  const d: Decision = {
    id: `${state.matchId}:${clockKey(createdAt)}:${type}:${state.decisionSeq}`,
    type,
    clubId: state[side].clubId,
    side,
    createdAt: { ...createdAt },
    playerId,
    eligible: [],
    suggested: null,
  };
  return refreshDecision(state, d, cfg);
}

/** Ativa a decisão (partida para em AWAITING_DECISION) ou a coloca na fila. */
export function openDecision(state: MatchState, d: Decision, cfg: EngineConfig): void {
  if (state.decision === null) {
    state.decision = refreshDecision(state, d, cfg);
    state.status = 'AWAITING_DECISION';
  } else {
    state.decisionQueue.push(d);
  }
}

/** Fecha a decisão atual: ativa a próxima da fila ou volta a RUNNING. */
export function closeDecision(state: MatchState, cfg: EngineConfig): void {
  const next = state.decisionQueue.shift();
  if (next) {
    state.decision = refreshDecision(state, next, cfg);
    state.status = 'AWAITING_DECISION';
  } else {
    state.decision = null;
    state.status = 'RUNNING';
  }
}
