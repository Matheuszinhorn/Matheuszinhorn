import { DEFAULT_CONFIG, type EngineConfig } from '../config.ts';
import type { Command, CommandRecord, Decision, MatchInput, MatchResult, MatchState } from '../types.ts';
import { applyCommand } from './commands.ts';
import { cpuCommandFor } from './cpu.ts';
import { createMatch, EngineError, sameClock } from './state.ts';
import { step } from './step.ts';

/** Quem responde às decisões do clube controlado. Sem decider, a CPU decide por ele. */
export type Decider = (state: MatchState, decision: Decision) => Command;

// 90 minutos + acréscimos (máx. 8 + 8) + extensões de pênalti: nunca passa disso.
const MAX_STEPS = 200;

/** Resolve a decisão aberta com o decider (origem PLAYER) ou com a CPU (origem CPU). */
export function resolveOpenDecision(
  state: MatchState,
  decider: Decider | undefined,
  cfg: EngineConfig = DEFAULT_CONFIG,
): MatchState {
  const decision = state.decision;
  if (!decision) return state;
  const command = decider ? decider(state, decision) : cpuCommandFor(state, decision, cfg);
  const result = applyCommand(state, command, decider ? 'PLAYER' : 'CPU', cfg);
  if (!result.ok) throw new EngineError(result.error, result.message);
  return result.state;
}

export function simulateMatch(
  input: MatchInput | MatchState,
  decider?: Decider,
  cfg: EngineConfig = DEFAULT_CONFIG,
): MatchState {
  let s = 'status' in input ? input : createMatch(input, cfg);
  for (let i = 0; s.status !== 'FINISHED'; i++) {
    if (i > MAX_STEPS * 4) throw new EngineError('RUNAWAY', 'a partida não terminou');
    s = s.status === 'AWAITING_DECISION' ? resolveOpenDecision(s, decider, cfg) : step(s, cfg);
  }
  return s;
}

/** O que as camadas de temporada e economia precisam aplicar depois do jogo. */
export function summarizeMatch(state: MatchState): MatchResult {
  const clubOf = (side: 'home' | 'away' | null) => (side === 'away' ? state.away.clubId : state.home.clubId);
  const result: MatchResult = {
    matchId: state.matchId,
    homeClubId: state.home.clubId,
    awayClubId: state.away.clubId,
    homeGoals: state.score.home,
    awayGoals: state.score.away,
    attendance: state.attendance,
    injuries: [],
    redCards: [],
    yellowCards: [],
  };
  for (const e of state.events) {
    if (!e.playerId) continue;
    if (e.type === 'INJURY') result.injuries.push({ clubId: clubOf(e.side), playerId: e.playerId, rounds: Number(e.detail) });
    if (e.type === 'RED_CARD') result.redCards.push({ clubId: clubOf(e.side), playerId: e.playerId });
    if (e.type === 'YELLOW_CARD') result.yellowCards.push({ clubId: clubOf(e.side), playerId: e.playerId });
  }
  return result;
}

/**
 * Reprodução técnica (só desenvolvimento: testes, depuração, balanceamento).
 * Reaplica, na mesma seed e nos mesmos dados, os comandos do clube controlado no minuto em que foram dados.
 * NÃO é recurso do jogador: não existe replay no jogo.
 */
export function reproduceMatch(input: MatchInput, records: readonly CommandRecord[], cfg: EngineConfig = DEFAULT_CONFIG): MatchState {
  const controlled = input.controlledClubId ?? null;
  const queue = records.filter((r) => r.command.clubId === controlled);
  let s = createMatch(input, cfg);
  let i = 0;
  for (let guard = 0; s.status !== 'FINISHED'; guard++) {
    if (guard > MAX_STEPS * 4) throw new EngineError('RUNAWAY', 'a reprodução não terminou');
    const next = queue[i];
    if (next && sameClock(next.clock, s.clock) && (s.status === 'AWAITING_DECISION' || next.command.type === 'OPEN_TEAM_ADJUSTMENT')) {
      const r = applyCommand(s, next.command, next.origin, cfg);
      if (!r.ok) throw new EngineError(r.error, `reprodução: ${r.message}`);
      s = r.state;
      i++;
      continue;
    }
    if (s.status === 'AWAITING_DECISION') throw new EngineError('MISSING_COMMAND', 'faltou um comando gravado');
    s = step(s, cfg);
  }
  return s;
}
