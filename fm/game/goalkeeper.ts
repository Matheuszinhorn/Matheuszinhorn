import { DEFAULT_CONFIG, type Decision, type LineupSlot, type MatchState, type TeamState } from '../engine/index.ts';
import { suggestedCommand } from './assist.ts';
import type { TeamChanges } from './session.ts';

// Decisão do jogador quando o GOLEIRO sai (lesionado ou expulso): a tela só coleta a escolha,
// este módulo monta o comando (trocas + posições) e quem valida é o engine (exatamente 1 goleiro, limite de trocas...).
//
// Modos:
// - RESERVE_GK: expulsão com goleiro reserva e troca disponível → escolhe o goleiro reserva que entra e o jogador de linha que sai
//   (o engine exige que o goleiro reserva entre).
// - INJURY_NO_RESERVE_GK: lesão, há troca mas nenhum goleiro no banco → escolhe o reserva que entra e quem vai para o gol
//   (o próprio reserva ou um jogador de linha que já está em campo).
// - OUTFIELD_TO_GOAL: sem troca possível (ou expulsão sem goleiro reserva) → escolhe o jogador de linha que vai para o gol.
// Lesão com goleiro no banco segue o pop-up comum de substituição (escolhe o reserva que entra no lugar do lesionado).

export type GoalkeeperMode = 'RESERVE_GK' | 'INJURY_NO_RESERVE_GK' | 'OUTFIELD_TO_GOAL';

export interface GoalkeeperOptions {
  mode: GoalkeeperMode;
  /** Vaga deixada pelo goleiro (onde quem assume o gol fica). */
  vacated: LineupSlot;
  /** Goleiros no banco (RESERVE_GK). */
  reserveGks: string[];
  /** Reservas que podem entrar (INJURY_NO_RESERVE_GK). */
  bench: string[];
  /** Jogadores de linha em campo. */
  outfield: string[];
}

export interface GoalkeeperChoice {
  reserveIn: string | null;
  out: string | null;
  toGoal: string | null;
}

/** Opções da decisão de goleiro, ou null se a decisão não é de goleiro (ou é lesão com goleiro reserva no banco). */
export function goalkeeperOptions(team: TeamState, decision: Decision, maxSubs = DEFAULT_CONFIG.maxSubs): GoalkeeperOptions | null {
  if (decision.type !== 'INJURY_SUBSTITUTION' && decision.type !== 'RED_CARD_ADJUSTMENT') return null;
  const vacated = decision.playerId ? team.vacated[decision.playerId] : undefined;
  if (!vacated || vacated.sector !== 'GK' || team.onField.some((s) => s.sector === 'GK')) return null;
  const canSub = team.subsUsed < maxSubs && team.bench.length > 0;
  const reserveGks = canSub ? team.bench.filter((id) => team.players[id].position === 'GK') : [];
  const outfield = team.onField.filter((s) => s.sector !== 'GK').map((s) => s.playerId);
  const base = { vacated, reserveGks, bench: canSub ? [...team.bench] : [], outfield };
  if (decision.type === 'RED_CARD_ADJUSTMENT') return { ...base, mode: reserveGks.length > 0 ? 'RESERVE_GK' : 'OUTFIELD_TO_GOAL' };
  if (!canSub) return { ...base, mode: 'OUTFIELD_TO_GOAL' };
  return reserveGks.length > 0 ? null : { ...base, mode: 'INJURY_NO_RESERVE_GK' };
}

/** Escolha pré-preenchida = a sugestão do jogo (mesma política da CPU). */
export function suggestedGoalkeeperChoice(match: MatchState, decision: Decision): GoalkeeperChoice {
  const cmd = suggestedCommand(match, decision);
  const choice: GoalkeeperChoice = { reserveIn: null, out: null, toGoal: null };
  if (cmd.type !== 'ADJUST_TEAM') return choice;
  const sub = cmd.substitutions[0];
  if (sub) { choice.reserveIn = sub.in; choice.out = sub.out === decision.playerId ? null : sub.out; }
  const gk = cmd.positions?.find((p) => p.sector === 'GK');
  choice.toGoal = gk ? gk.playerId : sub && sub.out === decision.playerId ? sub.in : null;
  return choice;
}

/** Monta as mudanças para o engine; null se a escolha está incompleta ou não pertence às opções. */
export function goalkeeperChanges(team: TeamState, decision: Decision, opts: GoalkeeperOptions, choice: GoalkeeperChoice): TeamChanges | null {
  const { vacated } = opts;
  const atGoal = (s: LineupSlot): LineupSlot => ({ ...s, sector: 'GK', x: vacated.x, y: vacated.y });

  if (opts.mode === 'RESERVE_GK') {
    const { reserveIn, out } = choice;
    if (!reserveIn || !out || !opts.reserveGks.includes(reserveIn) || !opts.outfield.includes(out)) return null;
    const positions = team.onField.filter((s) => s.playerId !== out).map((s) => ({ ...s })).concat(atGoal({ playerId: reserveIn, sector: 'GK', x: 0, y: 0 }));
    return { substitutions: [{ out, in: reserveIn }], positions };
  }

  if (opts.mode === 'OUTFIELD_TO_GOAL') {
    const { toGoal } = choice;
    if (!toGoal || !opts.outfield.includes(toGoal)) return null;
    return { substitutions: [], positions: team.onField.map((s) => (s.playerId === toGoal ? atGoal(s) : { ...s })) };
  }

  // INJURY_NO_RESERVE_GK: o reserva entra na vaga do goleiro; se outro for para o gol, os dois trocam de lugar.
  const { reserveIn, toGoal } = choice;
  if (!reserveIn || !toGoal || !opts.bench.includes(reserveIn) || (toGoal !== reserveIn && !opts.outfield.includes(toGoal))) return null;
  const injured = decision.playerId ?? '';
  let positions: LineupSlot[] = team.onField.map((s) => ({ ...s })).concat({ ...vacated, playerId: reserveIn });
  if (toGoal !== reserveIn) {
    const target = positions.find((s) => s.playerId === toGoal)!;
    positions = positions.map((s) => (s.playerId === toGoal ? atGoal(s) : s.playerId === reserveIn ? { ...target, playerId: reserveIn } : s));
  }
  return { substitutions: [{ out: injured, in: reserveIn }], positions };
}
