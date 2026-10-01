import { DEFAULT_CONFIG, type EngineConfig } from '../config.ts';
import { effectiveStrength } from '../strength.ts';
import type { Command, Decision, LineupSlot, MatchState, Sector, Style, TeamState } from '../types.ts';

// Política automática da CPU: regras fixas, sem sorteio (não consome aleatoriedade).
// Gera os MESMOS comandos que o jogador enviaria; quem aplica é commands.ts.

function byId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Batedor: o da escalação, se em campo; senão o mais forte entre atacantes e meias; senão o mais forte. */
export function cpuPenaltyTaker(team: TeamState): string | null {
  if (team.penaltyTakerId && team.onField.some((s) => s.playerId === team.penaltyTakerId)) return team.penaltyTakerId;
  const onField = team.onField.map((s) => team.players[s.playerId]);
  const pool = onField.filter((p) => p.position === 'ATT' || p.position === 'MID');
  const candidates = (pool.length > 0 ? pool : onField).sort((a, b) => b.strength - a.strength || byId(a.id, b.id));
  return candidates[0]?.id ?? null;
}

/** Melhor reserva para um setor: mesma posição natural primeiro, depois quem rende mais ali. */
export function cpuReplacement(team: TeamState, sector: Sector, cfg: EngineConfig = DEFAULT_CONFIG): string | null {
  const bench = team.bench.map((id) => team.players[id]);
  const natural = bench.filter((p) => p.position === sector).sort((a, b) => b.strength - a.strength || byId(a.id, b.id));
  if (natural.length > 0) return natural[0].id;
  const any = bench.sort(
    (a, b) => effectiveStrength(b, sector, cfg) - effectiveStrength(a, sector, cfg) || byId(a.id, b.id),
  );
  return any[0]?.id ?? null;
}

export function strongestBenchGoalkeeper(team: TeamState): string | null {
  const gks = team.bench
    .map((id) => team.players[id])
    .filter((p) => p.position === 'GK')
    .sort((a, b) => b.strength - a.strength || byId(a.id, b.id));
  return gks[0]?.id ?? null;
}

/** Jogador de linha que menos rende onde está. Usado para ceder vaga ao goleiro reserva ou ir para o gol. */
export function weakestOutfield(team: TeamState, cfg: EngineConfig = DEFAULT_CONFIG): LineupSlot | null {
  const outfield = team.onField
    .filter((s) => s.sector !== 'GK')
    .sort(
      (a, b) =>
        effectiveStrength(team.players[a.playerId], a.sector, cfg) -
          effectiveStrength(team.players[b.playerId], b.sector, cfg) || byId(a.playerId, b.playerId),
    );
  return outfield[0] ?? null;
}

export function canSubstitute(team: TeamState, cfg: EngineConfig = DEFAULT_CONFIG): boolean {
  return team.subsUsed < cfg.maxSubs && team.bench.length > 0;
}

/**
 * Regra do goleiro fora (expulso ou lesionado sem troca): goleiro reserva entra, se houver e ainda houver troca;
 * senão o jogador de linha mais fraco vai para o gol (fator 0,30 de fora de posição).
 * Devolve substituições + posições finais, ou null se o time ainda tem goleiro.
 */
export function goalkeeperFix(
  team: TeamState,
  vacatedGk: LineupSlot,
  cfg: EngineConfig = DEFAULT_CONFIG,
): { substitutions: { out: string; in: string }[]; positions: LineupSlot[] } | null {
  if (team.onField.some((s) => s.sector === 'GK')) return null;
  const weakest = weakestOutfield(team, cfg);
  if (!weakest) return null;
  const reserveGk = team.subsUsed < cfg.maxSubs ? strongestBenchGoalkeeper(team) : null;
  if (reserveGk) {
    const positions = team.onField
      .filter((s) => s.playerId !== weakest.playerId)
      .map((s) => ({ ...s }))
      .concat({ playerId: reserveGk, sector: 'GK', x: vacatedGk.x, y: vacatedGk.y });
    return { substitutions: [{ out: weakest.playerId, in: reserveGk }], positions };
  }
  const positions = team.onField.map((s) =>
    s.playerId === weakest.playerId ? { ...s, sector: 'GK' as const, x: vacatedGk.x, y: vacatedGk.y } : { ...s },
  );
  return { substitutions: [], positions };
}

/** Comando que a CPU envia para resolver uma decisão. */
export function cpuCommandFor(state: MatchState, decision: Decision, cfg: EngineConfig = DEFAULT_CONFIG): Command {
  const team = state[decision.side];
  const base = { commandId: `cpu:${decision.id}`, clubId: decision.clubId, decisionId: decision.id };

  if (decision.type === 'PENALTY_TAKER') {
    return { ...base, type: 'CHOOSE_PENALTY_TAKER', playerId: decision.suggested ?? cpuPenaltyTaker(team) ?? '' };
  }

  const vacated = decision.playerId ? team.vacated[decision.playerId] : undefined;

  if (decision.type === 'INJURY_SUBSTITUTION' && decision.playerId && vacated) {
    if (canSubstitute(team, cfg)) {
      const incoming = cpuReplacement(team, vacated.sector, cfg);
      if (incoming) return { ...base, type: 'ADJUST_TEAM', substitutions: [{ out: decision.playerId, in: incoming }] };
    }
    if (vacated.sector === 'GK') {
      const fix = goalkeeperFix(team, vacated, cfg);
      if (fix) return { ...base, type: 'ADJUST_TEAM', ...fix };
    }
    return { ...base, type: 'ADJUST_TEAM', substitutions: [] };
  }

  if (decision.type === 'RED_CARD_ADJUSTMENT' && vacated && vacated.sector === 'GK') {
    const fix = goalkeeperFix(team, vacated, cfg);
    if (fix) return { ...base, type: 'ADJUST_TEAM', ...fix };
  }

  // Expulsão de jogador de linha ou MEU TIME: a CPU não mexe no MVP.
  return { ...base, type: 'ADJUST_TEAM', substitutions: [] };
}

/** Estilo da CPU antes do jogo (seção 6): ofensivo se ≥10% mais forte, defensivo se ≥10% mais fraco. */
export function cpuPreMatchStyle(ownOverall: number, oppOverall: number): Style {
  if (oppOverall <= 0) return 'BALANCED';
  const ratio = ownOverall / oppOverall;
  if (ratio >= 1.1) return 'OFFENSIVE';
  if (ratio <= 1 / 1.1) return 'DEFENSIVE';
  return 'BALANCED';
}
