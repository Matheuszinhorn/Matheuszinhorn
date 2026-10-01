import { DEFAULT_CONFIG, type EngineConfig } from '../config.ts';
import { channel } from '../rng.ts';
import type { Clock, DecisionType, MatchEventType, MatchState, Side } from '../types.ts';
import { computeRates, resolveChance } from './chances.ts';
import { executeDecision, recordCommand } from './commands.ts';
import { cpuCommandFor } from './cpu.ts';
import { buildDecision, openDecision } from './decisions.ts';
import {
  prioritizeTriggers,
  resolveCards,
  resolveInjury,
  resolvePenaltyAward,
  resolvePenaltyKick,
  type Trigger,
} from './incidents.ts';
import { cloneState, EngineError, finishIfOver, isPastEnd, pushEvent } from './state.ts';

const SIDES: Side[] = ['home', 'away'];
const STOPPAGE_EVENTS: MatchEventType[] = ['GOAL', 'PENALTY_GOAL', 'INJURY', 'SUBSTITUTION', 'RED_CARD'];
const TRIGGER_TYPE: Record<Trigger['kind'], DecisionType> = {
  RED_CARD: 'RED_CARD_ADJUSTMENT',
  INJURY: 'INJURY_SUBSTITUTION',
  PENALTY: 'PENALTY_TAKER',
};

function stoppageOf(state: MatchState, half: 1 | 2): number | null {
  return half === 1 ? state.stoppage.first : state.stoppage.second;
}

/** Minuto extra só para cobrar um pênalti marcado no último minuto de acréscimo. */
function isPenaltyExtension(state: MatchState, clock: Clock): boolean {
  const st = stoppageOf(state, clock.half);
  return st !== null && clock.added > st;
}

/** Acréscimo definido aos 45' e aos 90' (canal STOPPAGE). Depois de definido, não muda. */
function fixStoppage(state: MatchState, clock: Clock, cfg: EngineConfig): void {
  const regulationEnd = clock.half === 1 ? 45 : 90;
  if (clock.minute !== regulationEnd || clock.added !== 0 || stoppageOf(state, clock.half) !== null) return;
  const c = cfg.stoppage;
  const [min, max] = clock.half === 1 ? [c.firstMin, c.firstMax] : [c.secondMin, c.secondMax];
  const base = min + Math.floor(channel(state.seed, clock, 'STOPPAGE')(0) * (max - min + 1));
  const stops = state.events.filter((e) => e.clock.half === clock.half && STOPPAGE_EVENTS.includes(e.type)).length;
  const value = Math.min(c.max, base + Math.floor(stops * c.perEvent));
  if (clock.half === 1) state.stoppage.first = value;
  else state.stoppage.second = value;
  pushEvent(state, { clock, type: 'STOPPAGE', side: null, detail: value });
}

/** Próximo minuto: 1'…45', 45+1'…45+n', 46'…90', 90+1'…90+n'. */
function advanceClock(state: MatchState, clock: Clock): void {
  const regulationEnd = clock.half === 1 ? 45 : 90;
  const st = stoppageOf(state, clock.half) ?? 0;
  if (clock.minute < regulationEnd) {
    state.clock = { half: clock.half, minute: clock.minute + 1, added: 0 };
  } else if (clock.added < st || state.pendingPenalty !== null) {
    state.clock = { half: clock.half, minute: regulationEnd, added: clock.added + 1 };
  } else if (clock.half === 1) {
    pushEvent(state, { clock, type: 'HALF_TIME', side: null });
    state.clock = { half: 2, minute: 46, added: 0 };
  } else {
    // Fim do jogo: o relógio passa do último minuto, mas a partida ainda NÃO está FINISHED. Decisões geradas neste
    // minuto (goleiro expulso ou lesionado, por exemplo) precisam ser resolvidas antes; quem encerra é finishIfOver.
    state.clock = { half: 2, minute: 90, added: clock.added + 1 };
  }
}

function updatePossession(state: MatchState, shareHome: number): void {
  const n = state.minutesPlayed;
  const home = (state.stats.home.possession * n + shareHome * 100) / (n + 1);
  state.stats.home.possession = home;
  state.stats.away.possession = 100 - home;
}

/**
 * Clube controlado: a decisão abre (ou entra na fila) e a partida para.
 * Demais clubes: a CPU resolve na hora, pelo mesmo caminho de comandos.
 */
function handleTriggers(state: MatchState, triggers: Trigger[], playedAt: Clock, cfg: EngineConfig): void {
  for (const t of triggers) {
    const d = buildDecision(state, t.side, TRIGGER_TYPE[t.kind], t.playerId, playedAt, cfg);
    if (state[t.side].clubId === state.controlledClubId) {
      openDecision(state, d, cfg);
      continue;
    }
    const command = cpuCommandFor(state, d, cfg);
    const outcome = executeDecision(state, d, command, cfg);
    if (!outcome.ok) throw new EngineError('CPU_COMMAND_FAILED', `${d.type}: ${outcome.message}`);
    recordCommand(state, command, 'CPU');
  }
}

/**
 * Avança exatamente 1 minuto de jogo. Nunca altera o estado recebido.
 * Ordem do minuto: cobrança pendente → cartões → lesões → pênaltis → chances (mandante, visitante).
 * Probabilidades usam o estado do início do minuto; mudanças valem a partir do minuto seguinte.
 */
export function step(state: MatchState, cfg: EngineConfig = DEFAULT_CONFIG): MatchState {
  if (state.status === 'AWAITING_DECISION') {
    throw new EngineError('AWAITING_DECISION', 'a partida espera uma decisão do jogador');
  }
  if (state.status === 'FINISHED') throw new EngineError('FINISHED', 'a partida já terminou');
  if (isPastEnd(state)) throw new EngineError('PAST_END', 'o relógio já passou do fim da partida');

  const s = cloneState(state);
  const clock: Clock = { ...s.clock };
  const rates = computeRates(s, cfg);

  resolvePenaltyKick(s, clock, cfg);
  const triggers: Trigger[] = [];
  if (!isPenaltyExtension(s, clock)) {
    for (const side of SIDES) triggers.push(...resolveCards(s, side, rates[side], clock, cfg));
    for (const side of SIDES) triggers.push(...resolveInjury(s, side, rates[side], clock, cfg));
    for (const side of SIDES) triggers.push(...resolvePenaltyAward(s, side, rates[side], clock, cfg));
    for (const side of SIDES) resolveChance(s, side, rates[side], clock, cfg);
  }

  updatePossession(s, rates.possessionHome);
  s.minutesPlayed += 1;
  fixStoppage(s, clock, cfg);
  advanceClock(s, clock);
  handleTriggers(s, prioritizeTriggers(s, triggers), clock, cfg); // vale também no último minuto, sem exceção para 90+
  finishIfOver(s);
  return s;
}
