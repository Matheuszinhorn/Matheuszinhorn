import type { CareerState } from '../career.ts';
import { divisionStandings } from '../career.ts';
import { clubStrength } from '../queries-lite.ts';
import type { PlayedMatch } from '../queries.ts';

// Diretoria: objetivo da temporada, moral (confiança) do treinador e forma recente.
// O objetivo sai da força do elenco comparada com a da divisão (o mesmo número que o jogo mostra nas listas).

export interface Objective {
  /** posição que a diretoria considera aceitável (ou melhor) */
  target: number;
  label: string;
  kind: 'ACESSO' | 'TOPO' | 'MEIO' | 'PERMANENCIA' | 'TITULO';
}

export function strengthRank(c: CareerState, clubId: string): { rank: number; total: number } {
  const club = c.world.clubs[clubId];
  const div = c.world.divisions.find((d) => d.id === club.divisionId);
  const ids = div ? div.clubIds : [clubId];
  const ranked = ids.map((id) => ({ id, s: clubStrength(c.world.players, c.world.clubs[id]) })).sort((a, b) => b.s - a.s || a.id.localeCompare(b.id));
  return { rank: ranked.findIndex((r) => r.id === clubId) + 1, total: ids.length };
}

export function objectiveFor(c: CareerState, clubId: string): Objective {
  const { rank } = strengthRank(c, clubId);
  const level = c.world.divisions.find((d) => d.id === c.world.clubs[clubId].divisionId)?.level ?? 4;
  if (level === 1) {
    if (rank <= 3) return { target: 1, label: 'Brigar pelo título', kind: 'TITULO' };
    if (rank <= 8) return { target: 6, label: 'Terminar entre os 6 primeiros', kind: 'TOPO' };
    if (rank <= 14) return { target: 12, label: 'Fazer uma campanha segura (até o 12º)', kind: 'MEIO' };
    return { target: 16, label: 'Evitar o rebaixamento', kind: 'PERMANENCIA' };
  }
  if (rank <= 4) return { target: 4, label: 'Conquistar o acesso', kind: 'ACESSO' };
  if (rank <= 8) return { target: 8, label: 'Brigar pelas primeiras posições (até o 8º)', kind: 'TOPO' };
  if (rank <= 14) return { target: 12, label: 'Fazer uma campanha segura (até o 12º)', kind: 'MEIO' };
  return { target: level === 4 ? 20 : 16, label: level === 4 ? 'Reconstruir o time sem sustos' : 'Evitar o rebaixamento', kind: 'PERMANENCIA' };
}

export type Mood = 'GOOD' | 'WARN' | 'BAD';

export function moodOf(morale: number): Mood {
  return morale >= 60 ? 'GOOD' : morale >= 35 ? 'WARN' : 'BAD';
}

export const MOOD_ICON: Record<Mood, string> = { GOOD: '🟢', WARN: '🟡', BAD: '🔴' };
export const MOOD_LABEL: Record<Mood, string> = { GOOD: 'Diretoria confiante', WARN: 'Diretoria atenta', BAD: 'Cargo ameaçado' };

export type FormLetter = 'V' | 'E' | 'D';

/** Últimos n resultados de um clube (mais antigo primeiro). */
export function recentForm(results: readonly PlayedMatch[], clubId: string, n = 5): FormLetter[] {
  const mine = results.filter((r) => r.homeClubId === clubId || r.awayClubId === clubId);
  return mine.slice(-n).map((r) => {
    const gf = r.homeClubId === clubId ? r.homeGoals : r.awayGoals;
    const ga = r.homeClubId === clubId ? r.awayGoals : r.homeGoals;
    return gf > ga ? 'V' : gf === ga ? 'E' : 'D';
  });
}

export function positionOf(c: CareerState, clubId: string): number {
  const table = divisionStandings(c, c.world.clubs[clubId].divisionId);
  return table.findIndex((r) => r.clubId === clubId) + 1;
}

/**
 * Moral depois de uma rodada: vitória +3, empate 0, derrota −3; a partir da 6ª rodada a posição na tabela
 * comparada com o objetivo também pesa (+1 dentro da meta, −2 bem abaixo dela).
 */
export function moraleAfterRound(morale: number, letter: FormLetter, round: number, position: number, target: number): number {
  let m = morale + (letter === 'V' ? 3 : letter === 'D' ? -3 : 0);
  if (round >= 6) m += position <= target ? 1 : position > target + 4 ? -2 : 0;
  return clamp(m);
}

/** Fim de temporada: meta cumprida sobe a moral; acesso e título mais ainda; rebaixamento derruba. */
export function moraleAfterSeason(morale: number, position: number, target: number, movement: 'PROMOTED' | 'RELEGATED' | null, champion: boolean): number {
  let m = morale + (position <= target ? 15 : position > target + 4 ? -20 : -5);
  if (movement === 'PROMOTED') m += 15;
  if (movement === 'RELEGATED') m -= 25;
  if (champion) m += 10;
  return clamp(m);
}

/** Demissão: moral muito baixa depois da 10ª rodada (ou ao fim da temporada abaixo de 20). */
export const FIRING_MORALE = 15;

export const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(v)));
