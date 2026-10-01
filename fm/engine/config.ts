import type { Behavior, Position, Style, Temperament } from './types.ts';

// Todo número de balanceamento mora aqui. Mudou um valor que altera resultados?
// Suba engineVersion: é ela que permite reproduzir um cenário antigo em desenvolvimento.

export interface EngineConfig {
  engineVersion: string;
  // Gols (seção 8)
  chancesBase: number;
  /** Curva força → volume de chances (família sat): f(r) = (1+c)·r ÷ (r+c), com f(1) = 1. Oficial: c = 2, ou seja, f(r) = 3r ÷ (r+2). */
  chanceCurveC: number;
  /** Camada de qualidade das chances (0.2.0): as chances adicionais do favorito ficam menos perigosas conforme cresce a diferença de força. */
  quality: {
    enabled: boolean;
    /** conversão de cada categoria de chance (baixa, média, alta), para um goleiro de fator 1,00 */
    conversions: [number, number, number];
    /** distribuição das chances "de equilíbrio" entre as categorias */
    baseShares: [number, number, number];
    /** distribuição das chances adicionais totalmente degradadas (δ = 1) */
    degradedShares: [number, number, number];
    /** δ(X) = X ÷ (X + h): fração das chances adicionais degradadas quando o favorito tem X de vantagem de força */
    h: number;
  };
  midfieldShare: number;
  conversionBase: number;
  gkFactorBase: number;
  gkFactorSlope: number;
  minExpectedGoals: number;
  maxExpectedGoals: number;
  outcomeSaveShare: number; // do que não vira gol
  outcomeWoodworkShare: number; // do que não vira gol
  scorerWeights: Record<Position, number>;
  // Mando (seção 9)
  homeAdvantage: number;
  // Formação (seção 5)
  positionFactor: { same: number; adjacent: number; far: number; goal: number };
  // Estilo e comportamento (seções 6 e 7)
  style: Record<Style, { own: number; opp: number }>;
  aggressive: { oppChances: number; cards: number; penaltiesConceded: number; injuriesCaused: number };
  reactive: { vsOffensive: number; vsDefensive: number; cards: number };
  // Pênaltis (seção 11)
  penaltyRatePerTeam: number;
  penaltyConversionBase: number;
  penaltyConversionSlope: number;
  penaltyConversionMin: number;
  penaltyConversionMax: number;
  penaltySavedShare: number;
  // Lesões (seção 13)
  injuryRatePerTeam: number;
  injuryGoalkeeperWeight: number;
  // Cartões (seção 14)
  yellowRatePerTeam: number;
  directRedRatePerTeam: number;
  cardSectorWeights: Record<Position, number>;
  temperamentWeights: Record<Temperament, number>;
  // Tempo (seção 15)
  stoppage: { firstMin: number; firstMax: number; secondMin: number; secondMax: number; perEvent: number; max: number };
  /** Minutos efetivos de uma partida (90 + acréscimos médios). As taxas "por partida" valem para a partida INTEIRA; a probabilidade por minuto é taxa ÷ matchMinutes. */
  matchMinutes: number;
  // Substituições (seção 12)
  maxSubs: number;
  maxBench: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  // 0.1.1: correção do fim de partida (decisão em 90+ não é mais descartada; nunca termina sem goleiro). Nenhuma constante mudou.
  // 0.2.0: calibração de gols validada em 40.000 partidas (0 erros, 0 invariantes): curva sat 2, chancesBase 4,75,
  //        camada de qualidade C (h = 1,0) e mando 1,25. Muda os resultados de toda partida: partidas do 0.1.x não se reproduzem mais.
  engineVersion: '0.2.0',
  chancesBase: 4.75,
  chanceCurveC: 2,
  quality: {
    enabled: true,
    conversions: [0.2, 0.32, 0.5],
    baseShares: [0.35, 0.35, 0.3],
    degradedShares: [0.5, 0.5, 0],
    h: 1.0,
  },
  midfieldShare: 0.5,
  conversionBase: 0.33,
  gkFactorBase: 1.2,
  gkFactorSlope: 0.4,
  minExpectedGoals: 0.15,
  maxExpectedGoals: 6.0,
  outcomeSaveShare: 0.55,
  outcomeWoodworkShare: 0.1,
  scorerWeights: { ATT: 3.0, MID: 1.5, DEF: 0.5, GK: 0 },
  homeAdvantage: 1.25,
  positionFactor: { same: 1.0, adjacent: 0.8, far: 0.6, goal: 0.3 },
  style: {
    DEFENSIVE: { own: 0.85, opp: 0.8 },
    BALANCED: { own: 1.0, opp: 1.0 },
    OFFENSIVE: { own: 1.15, opp: 1.15 },
  },
  aggressive: { oppChances: 0.92, cards: 1.6, penaltiesConceded: 1.3, injuriesCaused: 1.3 },
  reactive: { vsOffensive: 1.15, vsDefensive: 0.9, cards: 0.8 },
  penaltyRatePerTeam: 0.14,
  penaltyConversionBase: 0.76,
  penaltyConversionSlope: 0.15,
  penaltyConversionMin: 0.55,
  penaltyConversionMax: 0.92,
  penaltySavedShare: 0.6,
  injuryRatePerTeam: 0.12,
  injuryGoalkeeperWeight: 0.3,
  yellowRatePerTeam: 2.2,
  directRedRatePerTeam: 0.05,
  cardSectorWeights: { DEF: 1.5, MID: 1.2, ATT: 0.8, GK: 0.2 },
  temperamentWeights: { CALM: 0.6, NORMAL: 1.0, EXPLOSIVE: 1.8 },
  stoppage: { firstMin: 0, firstMax: 3, secondMin: 2, secondMax: 6, perEvent: 0.5, max: 8 },
  // Calibração, rodada 1 (tempo): antes as probabilidades eram taxa ÷ 90, mas as partidas duram ~97 min (medido: 97,1 em jogos
  // típicos; 98,7 nos extremos). Agora a taxa é dividida pelo tempo efetivo. Só o denominador mudou; nenhuma taxa/constante.
  matchMinutes: 97,
  maxSubs: 5,
  maxBench: 7,
};

export const ALL_STYLES: Style[] = ['DEFENSIVE', 'BALANCED', 'OFFENSIVE'];
export const ALL_BEHAVIORS: Behavior[] = ['NORMAL', 'AGGRESSIVE', 'REACTIVE'];

/**
 * Probabilidade de um evento em UM minuto de jogo: taxa por partida ÷ minutos efetivos da partida.
 * Único ponto onde o tempo entra nas taxas (gols via chances, cartões, lesões e pênaltis).
 */
export function perMinute(ratePerMatch: number, cfg: EngineConfig): number {
  return ratePerMatch / cfg.matchMinutes;
}
