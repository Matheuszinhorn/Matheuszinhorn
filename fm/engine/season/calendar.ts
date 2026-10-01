import { createRng, deriveSeed } from '../rng.ts';

export interface ScheduledMatch {
  home: string;
  away: string;
}

/**
 * Pontos corridos ida e volta (seção 18): turno pelo método do círculo, returno espelhado com mando invertido.
 * A ordem dos clubes é embaralhada com a seed: cada temporada tem um calendário diferente, mas reproduzível.
 */
export function doubleRoundRobin(clubIds: readonly string[], seed: string): ScheduledMatch[][] {
  const n = clubIds.length;
  if (n < 2 || n % 2 !== 0) throw new Error('o calendário precisa de um número par de clubes');

  // Embaralhamento Fisher–Yates determinístico.
  const teams = [...clubIds];
  const rng = createRng(deriveSeed(seed, 'calendar'));
  for (let i = teams.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }

  const fixed = teams[n - 1];
  const rotating = teams.slice(0, n - 1);
  const m = n - 1;
  const firstHalf: ScheduledMatch[][] = [];
  for (let r = 0; r < m; r++) {
    const round: ScheduledMatch[] = [];
    // O fixo alterna o mando a cada rodada.
    const opponent = rotating[r];
    round.push(r % 2 === 0 ? { home: fixed, away: opponent } : { home: opponent, away: fixed });
    for (let i = 1; i < n / 2; i++) {
      const a = rotating[(r + i) % m];
      const b = rotating[(r - i + m) % m];
      round.push(i % 2 === 1 ? { home: a, away: b } : { home: b, away: a });
    }
    firstHalf.push(round);
  }
  // Returno: mando invertido, com a ordem deslocada em 1 rodada (começa pelo espelho da 2ª rodada
  // e termina com o da 1ª). Assim ninguém faz 3 jogos seguidos no mesmo mando na virada do turno,
  // e não há revanche imediata entre a última rodada do turno e a primeira do returno.
  const secondHalf = firstHalf.map((_, j) => firstHalf[(j + 1) % m].map((f) => ({ home: f.away, away: f.home })));
  return [...firstHalf, ...secondHalf];
}

/** Maior sequência de jogos seguidos em casa ou fora de um clube (usada nos testes de qualidade do calendário). */
export function longestHomeAwayRun(rounds: readonly ScheduledMatch[][], clubId: string): number {
  let best = 0;
  let run = 0;
  let last: 'H' | 'A' | null = null;
  for (const round of rounds) {
    const f = round.find((x) => x.home === clubId || x.away === clubId);
    if (!f) continue;
    const venue = f.home === clubId ? 'H' : 'A';
    run = venue === last ? run + 1 : 1;
    last = venue;
    best = Math.max(best, run);
  }
  return best;
}
