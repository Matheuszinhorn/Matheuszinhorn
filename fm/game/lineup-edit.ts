import { DEFAULT_CONFIG, autoLineup, formationOf, type Behavior, type Club, type Formation, type Lineup, type Player, type Style } from '../engine/index.ts';

// Edição da escalação no MEU TIME. Funções puras: devolvem uma escalação nova; a validação final (exatamente 1 goleiro,
// 11 titulares, disponíveis...) é do engine (validateLineup), aplicada por withUserLineup na carreira.

export class LineupEditError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'LineupEditError';
    this.code = code;
  }
}

const isStarter = (l: Lineup, id: string) => l.starters.some((s) => s.playerId === id);

/**
 * Troca dois jogadores. Titular ↔ titular: trocam de posição. Titular ↔ reserva (ou jogador fora da lista): o de fora
 * assume a posição do titular e o titular vai para o banco. O banco respeita o limite da configuração (o mais fraco que não é
 * goleiro sai da lista se estourar).
 */
export function swapPlayers(lineup: Lineup, players: Record<string, Player>, aId: string, bId: string): Lineup {
  if (aId === bId) return lineup;
  if (isStarter(lineup, aId) && isStarter(lineup, bId)) {
    return { ...lineup, starters: lineup.starters.map((s) => (s.playerId === aId ? { ...s, playerId: bId } : s.playerId === bId ? { ...s, playerId: aId } : s)) };
  }
  let [starterId, otherId] = [aId, bId];
  if (!isStarter(lineup, starterId)) [starterId, otherId] = [bId, aId];
  if (!isStarter(lineup, starterId)) throw new LineupEditError('NO_STARTER', 'um dos dois jogadores precisa ser titular');
  const starters = lineup.starters.map((s) => (s.playerId === starterId ? { ...s, playerId: otherId } : s));
  let bench = lineup.bench.includes(otherId) ? lineup.bench.map((id) => (id === otherId ? starterId : id)) : [...lineup.bench, starterId];
  while (bench.length > DEFAULT_CONFIG.maxBench) {
    const droppable = bench.filter((id) => id !== starterId && players[id]?.position !== 'GK');
    const weakest = droppable.sort((x, y) => players[x].strength - players[y].strength)[0];
    if (!weakest) break;
    bench = bench.filter((id) => id !== weakest);
  }
  const penaltyTakerId = lineup.penaltyTakerId === starterId ? null : lineup.penaltyTakerId;
  return { ...lineup, starters, bench, penaltyTakerId };
}

export function setTactics(lineup: Lineup, tactics: { style?: Style; behavior?: Behavior }): Lineup {
  return { ...lineup, style: tactics.style ?? lineup.style, behavior: tactics.behavior ?? lineup.behavior };
}

export function setPenaltyTaker(lineup: Lineup, playerId: string | null): Lineup {
  if (playerId !== null && !isStarter(lineup, playerId)) throw new LineupEditError('NOT_STARTER', 'o batedor de pênalti precisa ser titular');
  return { ...lineup, penaltyTakerId: playerId };
}

/** Nova formação: o jogo remonta o melhor time disponível nela, mantendo estilo, comportamento e batedor (se ainda titular). */
export function applyFormation(club: Club, players: Record<string, Player>, lineup: Lineup, formation: Formation): Lineup {
  const auto = autoLineup(club, players, { formation, style: lineup.style, behavior: lineup.behavior });
  const keep = lineup.penaltyTakerId !== null && auto.starters.some((s) => s.playerId === lineup.penaltyTakerId);
  return { ...auto, penaltyTakerId: keep ? lineup.penaltyTakerId : null };
}

/** O melhor time disponível na formação atual (botão MELHOR TIME). */
export function bestLineup(club: Club, players: Record<string, Player>, lineup: Lineup): Lineup {
  return applyFormation(club, players, lineup, formationOf(lineup.starters));
}
