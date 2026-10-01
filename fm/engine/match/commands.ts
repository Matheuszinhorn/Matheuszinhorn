import { DEFAULT_CONFIG, type EngineConfig } from '../config.ts';
import type { Command, CommandErrorCode, CommandResult, Decision, MatchState } from '../types.ts';
import { buildDecision, closeDecision, openDecision } from './decisions.ts';
import { applyAdjustTeam, type StepOutcome } from './substitutions.ts';
import { cloneState, finishIfOver, isOnField, sideOfClub } from './state.ts';

// Comando é a única forma de alterar uma partida (seção 23).

export function recordCommand(state: MatchState, command: Command, origin: 'PLAYER' | 'CPU'): void {
  state.commands.push({ commandId: command.commandId, clock: { ...state.clock }, origin, command: structuredClone(command) });
}

/** Executa um comando contra uma decisão específica. Usado pelo jogador (via applyCommand) e pela CPU (via step). */
export function executeDecision(state: MatchState, decision: Decision, command: Command, cfg: EngineConfig): StepOutcome {
  if (command.clubId !== decision.clubId) return { ok: false, error: 'NOT_CONTROLLED', message: 'decisão de outro clube' };

  if (decision.type === 'PENALTY_TAKER') {
    if (command.type !== 'CHOOSE_PENALTY_TAKER') {
      return { ok: false, error: 'WRONG_DECISION', message: 'esta decisão pede a escolha do cobrador' };
    }
    const pending = state.pendingPenalty;
    if (!pending || pending.side !== decision.side) return { ok: false, error: 'NO_DECISION', message: 'não há pênalti pendente' };
    if (!isOnField(state[decision.side], command.playerId)) {
      return { ok: false, error: 'INVALID_PLAYER', message: 'o cobrador precisa estar em campo' };
    }
    pending.takerId = command.playerId;
    return { ok: true };
  }

  if (command.type !== 'ADJUST_TEAM') {
    return { ok: false, error: 'WRONG_DECISION', message: 'esta decisão pede um ajuste do time' };
  }
  return applyAdjustTeam(state, decision, command, cfg);
}

/**
 * Aplica um comando do clube controlado. Nunca altera o estado recebido.
 * - commandId repetido: devolve o estado como está (duplicate: true), sem aplicar de novo.
 * - comando inválido: devolve o estado original e o erro.
 */
export function applyCommand(
  state: MatchState,
  command: Command,
  origin: 'PLAYER' | 'CPU' = 'PLAYER',
  cfg: EngineConfig = DEFAULT_CONFIG,
): CommandResult {
  if (state.commands.some((r) => r.commandId === command.commandId)) return { ok: true, state, duplicate: true };
  const fail = (error: CommandErrorCode, message: string): CommandResult => ({ ok: false, state, error, message });

  if (state.status === 'FINISHED') return fail('INVALID_STATUS', 'a partida já terminou');
  const side = sideOfClub(state, command.clubId);
  if (side === null || command.clubId !== state.controlledClubId) {
    return fail('NOT_CONTROLLED', 'só o clube do jogador aceita comandos');
  }

  if (command.type === 'OPEN_TEAM_ADJUSTMENT') {
    if (state.status !== 'RUNNING') return fail('INVALID_STATUS', 'MEU TIME só abre com a partida em andamento');
    const s = cloneState(state);
    openDecision(s, buildDecision(s, side, 'TEAM_ADJUSTMENT', null, s.clock, cfg), cfg);
    recordCommand(s, command, origin);
    return { ok: true, state: s, duplicate: false };
  }

  if (state.status !== 'AWAITING_DECISION' || state.decision === null) return fail('NO_DECISION', 'não há decisão aberta');
  if (command.decisionId !== state.decision.id) return fail('WRONG_DECISION', 'o comando não é para a decisão aberta');

  const s = cloneState(state);
  const outcome = executeDecision(s, s.decision as Decision, command, cfg);
  if (!outcome.ok) return fail(outcome.error, outcome.message);
  recordCommand(s, command, origin);
  closeDecision(s, cfg);
  finishIfOver(s); // depois da decisão, o motor verifica se o relógio já passou do fim (seção 23)
  return { ok: true, state: s, duplicate: false };
}
