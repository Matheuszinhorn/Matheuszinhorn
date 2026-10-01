import { DEFAULT_CONFIG, perMinute, type EngineConfig } from '../config.ts';
import { channel, pickWeighted } from '../rng.ts';
import { effectiveStrength } from '../strength.ts';
import type { Clock, MatchState, Side, TeamState } from '../types.ts';
import { cpuPenaltyTaker } from './cpu.ts';
import type { TeamRates } from './chances.ts';
import { isOnField, otherSide, pushEvent, removeFromField } from './state.ts';

/** Algo que aconteceu no minuto e pode exigir decisão (seção 23). */
export interface Trigger {
  side: Side;
  kind: 'RED_CARD' | 'INJURY' | 'PENALTY';
  playerId: string | null;
}

/** Este gatilho tirou o goleiro (a vaga do gol) de campo? Vale para o goleiro titular e para quem já o substituía. */
export function vacatedGoalkeeper(state: MatchState, trigger: Trigger): boolean {
  return trigger.playerId !== null && state[trigger.side].vacated[trigger.playerId]?.sector === 'GK';
}

/**
 * Ordem em que as decisões do minuto são resolvidas (seção 23).
 *
 * Os eventos do minuto (expulsão, lesão) tiram os jogadores de campo NA HORA; as decisões vêm depois, uma por vez.
 * Se a decisão de um jogador de linha fosse resolvida antes da do goleiro, ela seria validada com o time sem goleiro
 * e nunca poderia ser satisfeita. Por isso a decisão que restaura o gol vem primeiro, e só ela se move:
 * ela passa à frente das decisões anteriores do MESMO time; todo o resto mantém a ordem original (ordenação estável).
 * CPU e jogador humano usam a mesma lista, então a mesma ordem.
 */
export function prioritizeTriggers(state: MatchState, triggers: readonly Trigger[]): Trigger[] {
  const ordered: Trigger[] = [];
  for (const trigger of triggers) {
    if (vacatedGoalkeeper(state, trigger)) {
      const at = ordered.findIndex((o) => o.side === trigger.side && !vacatedGoalkeeper(state, o));
      if (at !== -1) {
        ordered.splice(at, 0, trigger);
        continue;
      }
    }
    ordered.push(trigger);
  }
  return ordered;
}

function tag(side: Side): string {
  return side.toUpperCase();
}

/** Expulsão: sai de campo, guarda a posição e nunca mais volta. */
export function sendOff(state: MatchState, side: Side, playerId: string, clock: Clock, detail: 'direct' | 'second_yellow'): void {
  const team = state[side];
  removeFromField(team, playerId);
  team.sentOff.push(playerId);
  state.stats[side].redCards += 1;
  pushEvent(state, { clock, type: 'RED_CARD', side, playerId, detail });
}

function cardWeights(team: TeamState, cfg: EngineConfig): number[] {
  return team.onField.map(
    (s) => cfg.cardSectorWeights[s.sector] * cfg.temperamentWeights[team.players[s.playerId].temperament],
  );
}

/**
 * Canal CARD:<lado>: 0 = amarelo?; 1 = vermelho direto?; 2 = quem leva o amarelo; 3 = quem leva o vermelho.
 * Posições fixas: a ocorrência 2 é sempre "quem leva o amarelo", mesmo sem amarelo.
 */
export function resolveCards(state: MatchState, side: Side, rates: TeamRates, clock: Clock, cfg: EngineConfig): Trigger[] {
  const draw = channel(state.seed, clock, `CARD:${tag(side)}`);
  const team = state[side];
  const triggers: Trigger[] = [];

  if (draw(0) < perMinute(rates.yellowPerMatch, cfg) && team.onField.length > 0) {
    const idx = pickWeighted(cardWeights(team, cfg), draw(2));
    if (idx !== -1) {
      const playerId = team.onField[idx].playerId;
      state.stats[side].yellowCards += 1;
      pushEvent(state, { clock, type: 'YELLOW_CARD', side, playerId });
      if (team.yellowCards.includes(playerId)) {
        sendOff(state, side, playerId, clock, 'second_yellow');
        triggers.push({ side, kind: 'RED_CARD', playerId });
      } else {
        team.yellowCards.push(playerId);
      }
    }
  }
  if (draw(1) < perMinute(rates.redPerMatch, cfg) && team.onField.length > 0) {
    const idx = pickWeighted(cardWeights(team, cfg), draw(3));
    if (idx !== -1) {
      const playerId = team.onField[idx].playerId;
      sendOff(state, side, playerId, clock, 'direct');
      triggers.push({ side, kind: 'RED_CARD', playerId });
    }
  }
  return triggers;
}

/** Canal INJURY:<lado>: 0 = lesão?; 1 = quem; 2 = duração. */
export function resolveInjury(state: MatchState, side: Side, rates: TeamRates, clock: Clock, cfg: EngineConfig): Trigger[] {
  const draw = channel(state.seed, clock, `INJURY:${tag(side)}`);
  const team = state[side];
  if (draw(0) >= perMinute(rates.injuryPerMatch, cfg) || team.onField.length === 0) return [];

  const weights = team.onField.map((s) => (s.sector === 'GK' ? cfg.injuryGoalkeeperWeight : 1));
  const idx = pickWeighted(weights, draw(1));
  if (idx === -1) return [];
  const playerId = team.onField[idx].playerId;

  // Duração: 1 rodada (60%), 2–3 (30%), 4–8 (10%).
  const u = draw(2);
  const rounds = u < 0.6 ? 1 : u < 0.9 ? 2 + Math.floor(((u - 0.6) / 0.3) * 2) : 4 + Math.floor(((u - 0.9) / 0.1) * 5);

  removeFromField(team, playerId);
  team.injured.push(playerId);
  state.stats[side].injuries += 1;
  pushEvent(state, { clock, type: 'INJURY', side, playerId, detail: Math.min(rounds, 8) });
  return [{ side, kind: 'INJURY', playerId }];
}

/** Canal PENALTY:<lado>: 0 = pênalti marcado? Só um pênalti pendente por vez. */
export function resolvePenaltyAward(state: MatchState, side: Side, rates: TeamRates, clock: Clock, cfg: EngineConfig = DEFAULT_CONFIG): Trigger[] {
  if (state.pendingPenalty !== null || state[side].onField.length === 0) return [];
  const draw = channel(state.seed, clock, `PENALTY:${tag(side)}`);
  if (draw(0) >= perMinute(rates.penaltyPerMatch, cfg)) return [];
  state.pendingPenalty = { side, awardedAt: { ...clock }, takerId: null };
  state.stats[side].penalties += 1;
  pushEvent(state, { clock, type: 'PENALTY_AWARDED', side });
  return [{ side, kind: 'PENALTY', playerId: null }];
}

/**
 * Cobrança no início do minuto seguinte ao da marcação (71' → 72').
 * Canal PENALTY_KICK:<lado>: 0 = converte?; 1 = defendido ou para fora.
 */
export function resolvePenaltyKick(state: MatchState, clock: Clock, cfg: EngineConfig): void {
  const pending = state.pendingPenalty;
  if (!pending) return;
  state.pendingPenalty = null;
  const side = pending.side;
  const team = state[side];
  const keeperSide = otherSide(side);
  const takerId = pending.takerId && isOnField(team, pending.takerId) ? pending.takerId : cpuPenaltyTaker(team);
  if (!takerId) return;
  const conversion = penaltyChance(state, side, takerId, cfg);

  const draw = channel(state.seed, clock, `PENALTY_KICK:${tag(side)}`);
  if (draw(0) < conversion) {
    state.score[side] += 1;
    state.stats[side].goals += 1;
    state.stats[side].penaltyGoals += 1;
    pushEvent(state, { clock, type: 'PENALTY_GOAL', side, playerId: takerId });
  } else if (draw(1) < cfg.penaltySavedShare) {
    state.stats[keeperSide].saves += 1;
    pushEvent(state, { clock, type: 'PENALTY_MISSED', side, playerId: takerId, detail: 'saved' });
  } else {
    pushEvent(state, { clock, type: 'PENALTY_MISSED', side, playerId: takerId, detail: 'wide' });
  }
}

/** Chance estimada de conversão, para o pop-up de escolha do batedor (função pura). */
export function penaltyChance(state: MatchState, side: Side, takerId: string, cfg: EngineConfig): number {
  const keeperSide = otherSide(side);
  const keeperSlot = state[keeperSide].onField.find((s) => s.sector === 'GK');
  const keeper = keeperSlot ? effectiveStrength(state[keeperSide].players[keeperSlot.playerId], 'GK', cfg) : 0;
  const taker = state[side].players[takerId];
  return Math.min(
    cfg.penaltyConversionMax,
    Math.max(cfg.penaltyConversionMin, cfg.penaltyConversionBase + (cfg.penaltyConversionSlope * (taker.strength - keeper)) / 50),
  );
}
