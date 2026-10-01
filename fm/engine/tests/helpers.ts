import { DEFAULT_CONFIG } from '../config.ts';
import { cpuCommandFor } from '../match/cpu.ts';
import { simulateMatch } from '../match/simulate.ts';
import { prepareFixture } from '../round.ts';
import type { Command, Decision, MatchInput, MatchState, Side } from '../types.ts';
import { generateWorld } from '../world/generate.ts';

export const WORLD = generateWorld('mundo-de-teste');
export const D1 = WORLD.divisions[0].clubIds;

/** Partida entre dois clubes fictícios da 1ª divisão. */
export function matchInput(seed: string, opts: { controlled?: Side; home?: number; away?: number } = {}): MatchInput {
  const home = WORLD.clubs[D1[opts.home ?? 0]];
  const away = WORLD.clubs[D1[opts.away ?? 1]];
  const f = prepareFixture(`m-${seed}`, home, away, WORLD.players);
  const controlled = opts.controlled === 'home' ? home.id : opts.controlled === 'away' ? away.id : null;
  return { matchId: f.matchId, seed, home: f.home, away: f.away, controlledClubId: controlled, attendance: f.attendance };
}

/** Procura a primeira seed cuja partida (só CPU) satisfaz o predicado. */
export function findSeed(predicate: (s: MatchState) => boolean, max = 3000, prefix = 's'): string {
  for (let i = 1; i <= max; i++) {
    const seed = `${prefix}${i}`;
    if (predicate(simulateMatch(matchInput(seed)))) return seed;
  }
  throw new Error('nenhuma seed encontrada');
}

/** "Jogador" de teste: aceita a sugestão, com commandId próprio (origem PLAYER). */
export function playerLikeCpu(state: MatchState, decision: Decision): Command {
  const cmd = cpuCommandFor(state, decision, DEFAULT_CONFIG);
  return { ...cmd, commandId: `jogador:${decision.id}` };
}

/** Eventos sem os de estrutura (início, intervalo, fim, acréscimo). */
export function playEvents(s: MatchState) {
  return s.events.filter((e) => !['KICKOFF', 'HALF_TIME', 'FULL_TIME', 'STOPPAGE'].includes(e.type));
}
