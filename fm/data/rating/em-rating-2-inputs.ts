// Entradas da EM-RATING-2.0 a partir do snapshot da CBF já versionado (raw/cbf-2026.raw.json) e do universo.
// Só fatos da CBF: idade (nascimento × data do snapshot), anos com registro, partidas e gols da temporada, clube.
// A posição NÃO vem da CBF (ela não publica): entra só de uma fonte declarada pelo chamador (curadoria; ou, num
// cenário de comparação explícito, a fonte de conferência), e a origem fica gravada em positionSource.

import type { CbfRawSnapshot } from '../import/cbf-squads.ts';
import type { UniversePlayer, UniversePosition } from '../model.ts';
import type { Rating2Input } from './em-rating-2.ts';

export interface InputOptions {
  /** posições por playerId e a fonte delas (ex.: curadoria) */
  positions: ReadonlyMap<string, UniversePosition>;
  positionSource: string;
  /** id curto da competição de inscrição (ex.: "brasileirao-a") */
  competition: string;
}

/** Temporada do snapshot = ano da data de coleta (fixa; nunca a data do relógio). */
export const snapshotSeasonOf = (raw: CbfRawSnapshot) => Number(raw.retrievedAt.slice(0, 4));

/** Maior número de partidas na temporada entre os atletas ATIVOS de cada clube (escala da participação). */
export function clubReferenceMatches(players: readonly UniversePlayer[], raw: CbfRawSnapshot): Record<string, number> {
  const ref: Record<string, number> = {};
  for (const p of players) {
    const m = raw.athletes[p.externalIds?.cbf ?? '']?.matches;
    if (p.status !== 'ATIVO' || typeof m !== 'number') continue;
    ref[p.clubId] = Math.max(ref[p.clubId] ?? 0, m);
  }
  return ref;
}

export function inputsFromCbf(players: readonly UniversePlayer[], raw: CbfRawSnapshot, o: InputOptions): Rating2Input[] {
  const season = snapshotSeasonOf(raw);
  const ref = clubReferenceMatches(players, raw);
  return players.map((p) => {
    const d = raw.athletes[p.externalIds?.cbf ?? ''];
    const years = d ? d.years.filter((y) => /^\d{4}$/.test(y)).map(Number) : null;
    const position = o.positions.get(p.id) ?? null;
    return {
      playerId: p.id,
      age: p.age,
      seasons: years && years.length ? years : null,
      snapshotSeason: season,
      matches: typeof d?.matches === 'number' ? d.matches : null,
      goals: typeof d?.goals === 'number' ? d.goals : null,
      clubReferenceMatches: ref[p.clubId] ?? null,
      position,
      positionSource: position ? o.positionSource : null,
      competition: o.competition,
    };
  });
}
