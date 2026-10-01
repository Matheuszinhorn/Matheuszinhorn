import { deriveSeed } from '../rng.ts';

// Classificação (seção 17). Desempate: pontos → vitórias → saldo → gols pró → confronto direto → sorteio com seed.

export interface StandingRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface ScoreLine {
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface PointsRule {
  win: number;
  draw: number;
  loss: number;
}

export const DEFAULT_POINTS: PointsRule = { win: 3, draw: 1, loss: 0 };

function emptyRow(clubId: string): StandingRow {
  return { clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 };
}

function tally(clubIds: readonly string[], results: readonly ScoreLine[], rule: PointsRule): Map<string, StandingRow> {
  const rows = new Map(clubIds.map((id) => [id, emptyRow(id)]));
  for (const r of results) {
    const h = rows.get(r.homeClubId);
    const a = rows.get(r.awayClubId);
    if (!h || !a) continue;
    h.played++;
    a.played++;
    h.goalsFor += r.homeGoals;
    h.goalsAgainst += r.awayGoals;
    a.goalsFor += r.awayGoals;
    a.goalsAgainst += r.homeGoals;
    if (r.homeGoals > r.awayGoals) {
      h.won++;
      a.lost++;
      h.points += rule.win;
      a.points += rule.loss;
    } else if (r.homeGoals < r.awayGoals) {
      a.won++;
      h.lost++;
      a.points += rule.win;
      h.points += rule.loss;
    } else {
      h.drawn++;
      a.drawn++;
      h.points += rule.draw;
      a.points += rule.draw;
    }
  }
  for (const row of rows.values()) row.goalDiff = row.goalsFor - row.goalsAgainst;
  return rows;
}

function compareMain(a: StandingRow, b: StandingRow): number {
  return b.points - a.points || b.won - a.won || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor;
}

export function computeStandings(
  clubIds: readonly string[],
  results: readonly ScoreLine[],
  tiebreakSeed: string,
  rule: PointsRule = DEFAULT_POINTS,
): StandingRow[] {
  const rows = [...tally(clubIds, results, rule).values()].sort(compareMain);
  const drawKey = (id: string) => deriveSeed(tiebreakSeed, `desempate:${id}`);

  // Grupos empatados nos critérios principais: confronto direto (mini-tabela), depois sorteio.
  const out: StandingRow[] = [];
  for (let i = 0; i < rows.length; ) {
    let j = i + 1;
    while (j < rows.length && compareMain(rows[i], rows[j]) === 0) j++;
    const group = rows.slice(i, j);
    if (group.length > 1) {
      const ids = new Set(group.map((r) => r.clubId));
      const mini = tally([...ids], results.filter((r) => ids.has(r.homeClubId) && ids.has(r.awayClubId)), rule);
      group.sort((a, b) => {
        const ma = mini.get(a.clubId) as StandingRow;
        const mb = mini.get(b.clubId) as StandingRow;
        return mb.points - ma.points || (drawKey(a.clubId) < drawKey(b.clubId) ? -1 : 1);
      });
    }
    out.push(...group);
    i = j;
  }
  return out;
}
