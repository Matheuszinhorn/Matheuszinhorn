import { DEFAULT_CONFIG, type EngineConfig } from './config.ts';
import type { LineupSlot, Position, Sector } from './types.ts';

export interface Rated {
  position: Position;
  strength: number;
}

const LINE_ORDER: Record<Exclude<Position, 'GK'>, number> = { DEF: 0, MID: 1, ATT: 2 };

/** Fator de fora de posição (seção 5): mesma 1,00; vizinha 0,80; distante 0,60; gol ↔ linha 0,30. */
export function positionFactor(natural: Position, sector: Sector, cfg: EngineConfig = DEFAULT_CONFIG): number {
  if (natural === sector) return cfg.positionFactor.same;
  if (natural === 'GK' || sector === 'GK') return cfg.positionFactor.goal;
  const distance = Math.abs(LINE_ORDER[natural] - LINE_ORDER[sector]);
  return distance === 1 ? cfg.positionFactor.adjacent : cfg.positionFactor.far;
}

export function effectiveStrength(player: Rated, sector: Sector, cfg: EngineConfig = DEFAULT_CONFIG): number {
  return player.strength * positionFactor(player.position, sector, cfg);
}

export interface SectorTotals {
  GK: number;
  DEF: number;
  MID: number;
  ATT: number;
}

/** Soma (não média) da força efetiva por setor (seção 4). */
export function sectorTotals(
  slots: readonly LineupSlot[],
  players: Record<string, Rated>,
  cfg: EngineConfig = DEFAULT_CONFIG,
): SectorTotals {
  const totals: SectorTotals = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  for (const slot of slots) totals[slot.sector] += effectiveStrength(players[slot.playerId], slot.sector, cfg);
  return totals;
}

export function attackAndDefense(t: SectorTotals, cfg: EngineConfig = DEFAULT_CONFIG): { attack: number; defense: number } {
  return {
    attack: t.ATT + cfg.midfieldShare * t.MID,
    defense: t.DEF + cfg.midfieldShare * t.MID,
  };
}

/** Força geral: média da força efetiva dos jogadores em campo (tela e CPU; não entra no cálculo da partida). */
export function overallStrength(
  slots: readonly LineupSlot[],
  players: Record<string, Rated>,
  cfg: EngineConfig = DEFAULT_CONFIG,
): number {
  if (slots.length === 0) return 0;
  let sum = 0;
  for (const slot of slots) sum += effectiveStrength(players[slot.playerId], slot.sector, cfg);
  return sum / slots.length;
}
