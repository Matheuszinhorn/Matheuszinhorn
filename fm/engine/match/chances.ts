import { perMinute, type EngineConfig } from '../config.ts';
import { channel, pickWeighted } from '../rng.ts';
import { attackAndDefense, effectiveStrength, overallStrength, sectorTotals } from '../strength.ts';
import type { Clock, MatchState, Side, TeamState } from '../types.ts';
import { otherSide, pushEvent } from './state.ts';

// Taxas "por partida" de cada time, calculadas com o estado do INÍCIO do minuto (seção 25).
// Probabilidade num minuto = taxa ÷ cfg.matchMinutes (seção 15): a taxa vale para a partida inteira, acréscimos incluídos.

/** Contexto de qualidade das chances de um time no minuto (camada de qualidade, 0.2.0). */
export interface ChanceQuality {
  /** vantagem de força geral sobre o rival: max(0, força ÷ força do rival − 1). 0 para o time que não é o favorito. */
  X: number;
  /** fração das chances que já existiriam com força igual (as "de equilíbrio"): f(r ÷ (1+X)) ÷ f(r) */
  baseShare: number;
  /** fração das chances ADICIONAIS que é degradada: X ÷ (X + h) */
  delta: number;
}

export interface TeamRates {
  chancesPerMatch: number;
  conversion: number; // chance de uma chance virar gol contra o goleiro adversário
  /** só existe com cfg.quality.enabled; a conversão de cada chance passa a ser a da sua categoria × o fator do goleiro */
  quality?: ChanceQuality;
  yellowPerMatch: number;
  redPerMatch: number;
  injuryPerMatch: number; // lesões sofridas por este time
  penaltyPerMatch: number; // pênaltis a favor deste time
}

export interface MinuteRates {
  home: TeamRates;
  away: TeamRates;
  possessionHome: number; // 0–1, só informativa
}

/**
 * Curva força → volume de chances (seção 8, 0.2.0): f(r) = (1+c)·r ÷ (r+c), r = ataque efetivo ÷ defesa adversária.
 * Com c = 2 (oficial): f(r) = 3r ÷ (r+2). f(1) = 1 para qualquer c > 0, então um confronto equilibrado não muda de nível.
 * Cresce menos que a razão linear acima de r = 1 (f(2) = 1,5; f(3) = 1,8; assíntota 3) e mais abaixo de r = 1.
 */
export function chanceCurve(r: number, cfg: EngineConfig): number {
  const c = cfg.chanceCurveC;
  return ((1 + c) * r) / (r + c);
}

/**
 * Camada de qualidade: X = vantagem de força geral do time (média da força efetiva em campo), r0 = r ÷ (1+X) é a razão que
 * o time teria com a força do rival, e baseShare = f(r0) ÷ f(r) é a parcela das chances que já existiria com força igual.
 * O resto são as chances ADICIONAIS pela superioridade, e a fração δ = X ÷ (X+h) delas é degradada.
 */
export function chanceQualityContext(team: TeamState, rival: TeamState, ratio: number, cfg: EngineConfig): ChanceQuality {
  const ovSelf = overallStrength(team.onField, team.players, cfg);
  const ovRival = overallStrength(rival.onField, rival.players, cfg);
  const X = ovRival > 0 ? Math.max(0, ovSelf / ovRival - 1) : 0;
  const fr = chanceCurve(ratio, cfg);
  const baseShare = fr > 0 ? Math.min(1, chanceCurve(ratio / (1 + X), cfg) / fr) : 1;
  return { X, baseShare, delta: X / (X + cfg.quality.h) };
}

/** Probabilidade de uma chance ser baixa, média ou alta: a parte de equilíbrio (e a adicional não degradada) usa baseShares; a degradada, degradedShares. */
export function qualityShares(q: ChanceQuality, cfg: EngineConfig): [number, number, number] {
  const add = 1 - q.baseShare;
  const keep = q.baseShare + add * (1 - q.delta);
  const base = cfg.quality.baseShares;
  const degraded = cfg.quality.degradedShares;
  return [
    base[0] * keep + add * q.delta * degraded[0],
    base[1] * keep + add * q.delta * degraded[1],
    base[2] * keep + add * q.delta * degraded[2],
  ];
}

/** Categoria (0 baixa, 1 média, 2 alta) para o sorteio v ∈ [0,1). */
export function chanceCategory(shares: [number, number, number], v: number): 0 | 1 | 2 {
  return v < shares[0] ? 0 : v < shares[0] + shares[1] ? 1 : 2;
}

function behaviorOwn(team: TeamState, opp: TeamState, cfg: EngineConfig): number {
  if (team.behavior !== 'REACTIVE') return 1;
  if (opp.style === 'OFFENSIVE') return cfg.reactive.vsOffensive;
  if (opp.style === 'DEFENSIVE') return cfg.reactive.vsDefensive;
  return 1;
}

function cardFactor(team: TeamState, cfg: EngineConfig): number {
  if (team.behavior === 'AGGRESSIVE') return cfg.aggressive.cards;
  if (team.behavior === 'REACTIVE') return cfg.reactive.cards;
  return 1;
}

export function computeRates(state: MatchState, cfg: EngineConfig): MinuteRates {
  const totals = {
    home: sectorTotals(state.home.onField, state.home.players, cfg),
    away: sectorTotals(state.away.onField, state.away.players, cfg),
  };
  const ad = { home: attackAndDefense(totals.home, cfg), away: attackAndDefense(totals.away, cfg) };

  const rates = (side: Side): TeamRates => {
    const opp = otherSide(side);
    const team = state[side];
    const rival = state[opp];
    const ratio = ad[side].attack / Math.max(ad[opp].defense, 1);
    let chances =
      cfg.chancesBase *
      chanceCurve(ratio, cfg) *
      (side === 'home' ? cfg.homeAdvantage : 1) *
      cfg.style[team.style].own *
      cfg.style[rival.style].opp *
      behaviorOwn(team, rival, cfg) *
      (rival.behavior === 'AGGRESSIVE' ? cfg.aggressive.oppChances : 1);
    const conversion = cfg.conversionBase * (cfg.gkFactorBase - (cfg.gkFactorSlope * totals[opp].GK) / 50);
    // Piso e teto de gols esperados (seção 8): ajusta as chances, mantém a conversão.
    const expected = chances * conversion;
    if (expected < cfg.minExpectedGoals) chances = cfg.minExpectedGoals / conversion;
    if (expected > cfg.maxExpectedGoals) chances = cfg.maxExpectedGoals / conversion;
    if (team.onField.length === 0) chances = 0;

    return {
      quality: cfg.quality.enabled ? chanceQualityContext(team, rival, ratio, cfg) : undefined,
      chancesPerMatch: chances,
      conversion,
      yellowPerMatch: cfg.yellowRatePerTeam * cardFactor(team, cfg),
      redPerMatch: cfg.directRedRatePerTeam * cardFactor(team, cfg),
      injuryPerMatch: cfg.injuryRatePerTeam * (rival.behavior === 'AGGRESSIVE' ? cfg.aggressive.injuriesCaused : 1),
      penaltyPerMatch: cfg.penaltyRatePerTeam * (rival.behavior === 'AGGRESSIVE' ? cfg.aggressive.penaltiesConceded : 1),
    };
  };

  const midTotal = totals.home.MID + totals.away.MID;
  return {
    home: rates('home'),
    away: rates('away'),
    possessionHome: midTotal > 0 ? totals.home.MID / midTotal : 0.5,
  };
}

/** Sorteia o autor do gol entre quem está em campo agora. */
function pickScorer(team: TeamState, u: number, cfg: EngineConfig): string | null {
  const weights = team.onField.map((s) => effectiveStrength(team.players[s.playerId], s.sector, cfg) * cfg.scorerWeights[s.sector]);
  let idx = pickWeighted(weights, u);
  if (idx === -1) {
    // Só o goleiro (ou ninguém com peso) em campo: o gol ainda precisa de um autor.
    if (team.onField.length === 0) return null;
    idx = Math.min(Math.floor(u * team.onField.length), team.onField.length - 1);
  }
  return team.onField[idx].playerId;
}

/**
 * Canal CHANCE:<lado> (seção 25): ocorrência 0 = houve chance?; 1 = resultado; 2 = autor do gol;
 * 3 = categoria de qualidade da chance (0.2.0, só com cfg.quality.enabled; entra no FIM do canal e não desloca as demais).
 */
export function resolveChance(state: MatchState, side: Side, rates: TeamRates, clock: Clock, cfg: EngineConfig): void {
  const draw = channel(state.seed, clock, `CHANCE:${side.toUpperCase()}`);
  if (draw(0) >= perMinute(rates.chancesPerMatch, cfg)) return;

  const team = state[side];
  const opp = otherSide(side);
  const stats = state.stats[side];
  stats.chances += 1;

  const u = draw(1);
  let conversion = rates.conversion;
  if (rates.quality) {
    const category = chanceCategory(qualityShares(rates.quality, cfg), draw(3));
    conversion = cfg.quality.conversions[category] * (rates.conversion / cfg.conversionBase); // categoria × fator do goleiro (1,00 com GK 25)
  }
  if (u < conversion) {
    const scorer = pickScorer(team, draw(2), cfg);
    state.score[side] += 1;
    stats.goals += 1;
    pushEvent(state, { clock, type: 'GOAL', side, playerId: scorer });
    return;
  }
  const rest = (u - conversion) / (1 - conversion);
  if (rest < cfg.outcomeSaveShare) {
    state.stats[opp].saves += 1;
    const keeper = state[opp].onField.find((s) => s.sector === 'GK');
    pushEvent(state, { clock, type: 'SAVE', side: opp, playerId: keeper ? keeper.playerId : null });
  } else if (rest < cfg.outcomeSaveShare + cfg.outcomeWoodworkShare) {
    stats.woodwork += 1;
    pushEvent(state, { clock, type: 'WOODWORK', side });
  } else {
    stats.offTarget += 1;
  }
}
