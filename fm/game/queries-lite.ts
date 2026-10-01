import { autoLineup, overallStrength, type Club, type Player } from '../engine/index.ts';

/** Força geral (média da força efetiva dos titulares do melhor time disponível), arredondada, para mostrar em ofertas e listas. */
export function clubStrength(players: Record<string, Player>, club: Club): number {
  return Math.round(overallStrength(autoLineup(club, players, club.defaultTactics).starters, players));
}
