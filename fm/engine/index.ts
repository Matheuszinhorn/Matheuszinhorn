// API pública do engine. As camadas game/ e app/ importam só daqui.

export * from './types.ts';
export { DEFAULT_CONFIG, type EngineConfig } from './config.ts';
export { deriveSeed, createRng } from './rng.ts';
export { effectiveStrength, overallStrength, positionFactor, sectorTotals, attackAndDefense } from './strength.ts';
export { autoLineup, validateLineup, parseFormation, formationLabel, formationOf, arrangeSlots } from './lineup.ts';
export { createMatch, EngineError, clockLabel } from './match/state.ts';
export { step } from './match/step.ts';
// Sugestão automática da CPU para uma decisão (a interface a oferece como "aceitar sugestão"). Só exporta; não altera nenhuma regra.
export { cpuCommandFor } from './match/cpu.ts';
export { applyCommand } from './match/commands.ts';
export { penaltyChance } from './match/incidents.ts';
export { simulateMatch, summarizeMatch, reproduceMatch, type Decider } from './match/simulate.ts';
export {
  createRound,
  stepRound,
  simulateRound,
  applyRoundCommand,
  roundResults,
  awaitingMatch,
  isRoundFinished,
  prepareFixture,
  type Fixture,
  type RoundState,
} from './round.ts';
export { doubleRoundRobin, type ScheduledMatch } from './season/calendar.ts';
export { computeStandings, DEFAULT_POINTS, type PointsRule, type ScoreLine, type StandingRow } from './season/standings.ts';
export {
  applyPromotionRelegation,
  PromotionError,
  standardRules,
  withDivisions,
  type MoveRule,
  type Movement,
  type PromotionResult,
  type PromotionRule,
  type PromotionRules,
  type SeasonDivision,
  type SeasonOutcome,
} from './season/promotion.ts';
export {
  applyEntry,
  computeAttendance,
  computeClubEntry,
  DEFAULT_FINANCE,
  FinanceError,
  payroll,
  settleRound,
  stadiumUpkeep,
  ticketRevenue,
  totalsByClub,
  type ClubFinanceEntry,
  type ClubFinanceTotals,
  type DivisionFinance,
  type FinanceConfig,
} from './finance.ts';
export { generateWorld, type World, type Division } from './world/generate.ts';
