// PROTÓTIPO (não integrado) — evidência de desenvolvimento lida de uma partida JÁ simulada pelo Engine 0.2.0.
// Só leitura do MatchState: nada aqui altera a partida, o engine ou a carreira. Minutos e titularidade saem dos
// eventos de substituição e de expulsão; gols, defesas, placar e expulsões, dos eventos e do placar final.
import type { MatchState } from '../../engine/index.ts';
import type { MatchEvidence } from './development.ts';

const minuteOf = (clock: { minute: number }) => Math.max(0, Math.min(90, clock.minute));
export function evidenceFromMatch(m: MatchState): Map<string, Omit<MatchEvidence, 'injured'>> {
  const out = new Map<string, Omit<MatchEvidence, 'injured'>>();
  for (const side of ['home', 'away'] as const) {
    const team = m[side];
    const opp = side === 'home' ? 'away' : 'home';
    const subIn = new Map<string, number>();
    const leftAt = new Map<string, number>();
    for (const e of m.events) {
      if (e.side !== side) continue;
      if (e.type === 'SUBSTITUTION') {
        if (e.relatedPlayerId) subIn.set(e.relatedPlayerId, minuteOf(e.clock));
        if (e.playerId && !leftAt.has(e.playerId)) leftAt.set(e.playerId, minuteOf(e.clock));
      } else if (e.type === 'RED_CARD' && e.playerId && !leftAt.has(e.playerId)) leftAt.set(e.playerId, minuteOf(e.clock));
    }
    const appeared = new Set<string>([...team.onField.map((s) => s.playerId), ...team.subbedOff, ...team.sentOff, ...team.injured, ...subIn.keys()]);
    for (const id of appeared) {
      const from = subIn.get(id) ?? 0;
      const to = leftAt.get(id) ?? 90;
      out.set(id, {
        played: true, minutes: Math.max(1, to - from), started: !subIn.has(id),
        goals: m.events.filter((e) => (e.type === 'GOAL' || e.type === 'PENALTY_GOAL') && e.playerId === id).length,
        saves: m.events.filter((e) => e.type === 'SAVE' && e.playerId === id).length,
        teamGoalsFor: m.score[side], teamGoalsAgainst: m.score[opp],
        redCard: m.events.some((e) => e.type === 'RED_CARD' && e.playerId === id),
      });
    }
  }
  return out;
}

