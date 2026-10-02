import type { MatchState, TeamState } from '../../engine/index.ts';
import type { RefereeStats, StatLine } from './state.ts';
import { EMPTY_LINE } from './state.ts';

// Estatísticas dos jogadores e dos árbitros, lidas dos eventos REAIS das partidas (o engine não muda).
// Assistências não existem aqui: o evento de gol do Engine 0.2.0 não registra quem deu o passe (ver docs/ENGINE.md).

/** Quem entrou em campo: titulares que ainda estão, os que saíram, os expulsos e os lesionados. */
export function appeared(team: TeamState): string[] {
  const ids = new Set<string>([...team.onField.map((s) => s.playerId), ...team.subbedOff, ...team.sentOff, ...team.injured]);
  return [...ids];
}

export function matchStatLines(m: MatchState): Record<string, StatLine> {
  const out: Record<string, StatLine> = {};
  const line = (id: string) => (out[id] ??= { ...EMPTY_LINE });
  for (const side of ['home', 'away'] as const) for (const id of appeared(m[side])) line(id).apps += 1;
  for (const e of m.events) {
    if (!e.playerId) continue;
    if (e.type === 'GOAL' || e.type === 'PENALTY_GOAL') line(e.playerId).goals += 1;
    else if (e.type === 'YELLOW_CARD') line(e.playerId).yellows += 1;
    else if (e.type === 'RED_CARD') line(e.playerId).reds += 1;
    else if (e.type === 'INJURY') line(e.playerId).injuries += 1;
  }
  return out;
}

export function addLines(base: Record<string, StatLine>, add: Record<string, StatLine>): Record<string, StatLine> {
  const out = { ...base };
  for (const [id, l] of Object.entries(add)) {
    const b = out[id] ?? EMPTY_LINE;
    out[id] = { apps: b.apps + l.apps, goals: b.goals + l.goals, yellows: b.yellows + l.yellows, reds: b.reds + l.reds, injuries: b.injuries + l.injuries };
  }
  return out;
}

export function refereeLine(m: MatchState): RefereeStats {
  let yellows = 0;
  let reds = 0;
  let penalties = 0;
  for (const e of m.events) {
    if (e.type === 'YELLOW_CARD') yellows++;
    else if (e.type === 'RED_CARD') reds++;
    else if (e.type === 'PENALTY_AWARDED') penalties++;
  }
  return { matches: 1, yellows, reds, penalties };
}

export function addReferee(a: RefereeStats | undefined, b: RefereeStats): RefereeStats {
  return a ? { matches: a.matches + b.matches, yellows: a.yellows + b.yellows, reds: a.reds + b.reds, penalties: a.penalties + b.penalties } : b;
}

export interface RefereeProfile {
  matches: number;
  cardsPerMatch: number;
  penaltiesPerMatch: number;
  label: string;
}

/** Perfil a partir dos jogos que o árbitro de fato apitou, comparado com a média de todos os árbitros. */
export function refereeProfile(stats: RefereeStats | undefined, all: readonly RefereeStats[]): RefereeProfile {
  if (!stats || stats.matches < 3) {
    return { matches: stats?.matches ?? 0, cardsPerMatch: stats ? (stats.yellows + stats.reds) / Math.max(1, stats.matches) : 0, penaltiesPerMatch: stats ? stats.penalties / Math.max(1, stats.matches) : 0, label: 'Poucos jogos na temporada: ainda sem um perfil claro.' };
  }
  const tot = all.reduce((acc, s) => ({ m: acc.m + s.matches, c: acc.c + s.yellows + s.reds, p: acc.p + s.penalties }), { m: 0, c: 0, p: 0 });
  const avgCards = tot.m ? tot.c / tot.m : 0;
  const avgPens = tot.m ? tot.p / tot.m : 0;
  const cards = (stats.yellows + stats.reds) / stats.matches;
  const pens = stats.penalties / stats.matches;
  let label = 'Equilibrado: distribui cartões na média do campeonato.';
  if (cards >= avgCards * 1.15) label = 'Rigoroso: mostra mais cartões que a média e para bastante o jogo.';
  else if (cards <= avgCards * 0.85) label = 'Deixa o jogo correr: mostra menos cartões que a média.';
  if (avgPens > 0 && pens >= avgPens * 1.5 && stats.penalties >= 2) label += ' Marca pênaltis com frequência.';
  return { matches: stats.matches, cardsPerMatch: cards, penaltiesPerMatch: pens, label };
}
