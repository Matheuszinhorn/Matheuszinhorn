import { DEFAULT_CONFIG, type EngineConfig } from './config.ts';
import { computeAttendance } from './finance.ts';
import { autoLineup } from './lineup.ts';
import { applyCommand } from './match/commands.ts';
import { cpuPreMatchStyle } from './match/cpu.ts';
import { type Decider, resolveOpenDecision, summarizeMatch } from './match/simulate.ts';
import { createMatch, EngineError } from './match/state.ts';
import { step } from './match/step.ts';
import { deriveSeed } from './rng.ts';
import { overallStrength } from './strength.ts';
import type { Club, Command, CommandResult, Lineup, MatchResult, MatchState, MatchTeamInput, Player } from './types.ts';

// Rodada simultânea (seção 16): todas as partidas avançam juntas, 1 minuto por stepRound.
// Cada partida tem sua própria seed (seedDaRodada:matchId) e nenhuma lê o estado de outra.

export interface Fixture {
  matchId: string;
  home: MatchTeamInput;
  away: MatchTeamInput;
  attendance: number;
}

export interface RoundState {
  roundId: string;
  seed: string;
  matches: MatchState[];
}

/**
 * Monta uma partida a partir dos clubes: escalação automática, estilo da CPU e público.
 * lineups permite passar a escalação escolhida pelo jogador para o clube dele.
 */
export function prepareFixture(
  matchId: string,
  home: Club,
  away: Club,
  players: Record<string, Player>,
  lineups: Record<string, Lineup> = {},
  cfg: EngineConfig = DEFAULT_CONFIG,
): Fixture {
  const base = { home: autoLineup(home, players, {}, cfg), away: autoLineup(away, players, {}, cfg) };
  const overall = {
    home: overallStrength(base.home.starters, players, cfg),
    away: overallStrength(base.away.starters, players, cfg),
  };
  const homeLineup = lineups[home.id] ?? { ...base.home, style: cpuPreMatchStyle(overall.home, overall.away) };
  const awayLineup = lineups[away.id] ?? { ...base.away, style: cpuPreMatchStyle(overall.away, overall.home) };
  return {
    matchId,
    home: { club: home, lineup: homeLineup, players },
    away: { club: away, lineup: awayLineup, players },
    attendance: computeAttendance(home),
  };
}

export function createRound(
  roundId: string,
  seed: string,
  fixtures: readonly Fixture[],
  controlledClubId: string | null = null,
  cfg: EngineConfig = DEFAULT_CONFIG,
): RoundState {
  const ids = new Set<string>();
  const matches = fixtures.map((f) => {
    if (ids.has(f.matchId)) throw new EngineError('INVALID_ROUND', `matchId repetido: ${f.matchId}`);
    ids.add(f.matchId);
    const inMatch = controlledClubId === f.home.club.id || controlledClubId === f.away.club.id;
    return createMatch(
      {
        matchId: f.matchId,
        seed: deriveSeed(seed, f.matchId),
        home: f.home,
        away: f.away,
        controlledClubId: inMatch ? controlledClubId : null,
        attendance: f.attendance,
      },
      cfg,
    );
  });
  return { roundId, seed, matches };
}

export function awaitingMatch(round: RoundState): MatchState | null {
  return round.matches.find((m) => m.status === 'AWAITING_DECISION') ?? null;
}

export function isRoundFinished(round: RoundState): boolean {
  return round.matches.every((m) => m.status === 'FINISHED');
}

/** Avança 1 minuto em todas as partidas não encerradas. Bloqueado enquanto houver decisão pendente. */
export function stepRound(round: RoundState, cfg: EngineConfig = DEFAULT_CONFIG): RoundState {
  const waiting = awaitingMatch(round);
  if (waiting) throw new EngineError('AWAITING_DECISION', `a partida ${waiting.matchId} espera uma decisão`);
  return { ...round, matches: round.matches.map((m) => (m.status === 'FINISHED' ? m : step(m, cfg))) };
}

export function applyRoundCommand(
  round: RoundState,
  matchId: string,
  command: Command,
  cfg: EngineConfig = DEFAULT_CONFIG,
): { round: RoundState; result: CommandResult } {
  const idx = round.matches.findIndex((m) => m.matchId === matchId);
  if (idx === -1) throw new EngineError('UNKNOWN_MATCH', `partida inexistente: ${matchId}`);
  const result = applyCommand(round.matches[idx], command, 'PLAYER', cfg);
  if (!result.ok || result.duplicate) return { round, result };
  const matches = [...round.matches];
  matches[idx] = result.state;
  return { round: { ...round, matches }, result };
}

/** Roda a rodada inteira. Decisões do clube controlado vão para o decider (ou para a CPU, se não houver). */
export function simulateRound(round: RoundState, decider?: Decider, cfg: EngineConfig = DEFAULT_CONFIG): RoundState {
  let r = round;
  for (let guard = 0; !isRoundFinished(r); guard++) {
    if (guard > 1000) throw new EngineError('RUNAWAY', 'a rodada não terminou');
    const waiting = awaitingMatch(r);
    if (waiting) {
      const resolved = resolveOpenDecision(waiting, decider, cfg);
      r = { ...r, matches: r.matches.map((m) => (m.matchId === waiting.matchId ? resolved : m)) };
    } else {
      r = stepRound(r, cfg);
    }
  }
  return r;
}

export function roundResults(round: RoundState): MatchResult[] {
  return round.matches.filter((m) => m.status === 'FINISHED').map(summarizeMatch);
}
