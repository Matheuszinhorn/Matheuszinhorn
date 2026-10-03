// EXPERIMENTAL (DEV-INTEGRATION-0.1) — camada de COMPOSIÇÃO para o teste de feedback. Não integrada ao produto:
// nenhum módulo de game/ (fora de development/), app/ ou engine/ importa este arquivo; só o script do experimento.
// Ela faz duas coisas, e só elas:
// 1) observa as partidas que o Engine 0.2.0 já jogou e avança o PlayerDevelopment (DEV-PROTO-0.4-B);
// 2) devolve um World igual ao recebido, trocando APENAS Player.strength por strengthCurrent.
// Nenhuma regra do engine é reproduzida aqui: chances, conversão, RNG, gols, cartões, lesões, decisões, placares e
// calendário continuam 100% no engine e no fluxo do jogo.

import type { MatchState, Player, World } from '../../engine/index.ts';
import { developRound, environmentLevel, newDevelopment, type DevelopmentConfig, type DevPosition, type MatchEvidence, type PlayerDevelopment } from './development.ts';
import { evidenceFromMatch } from './evidence.ts';

export const POSITION: Record<Player['position'], DevPosition> = { GK: 'GOL', DEF: 'DEF', MID: 'MEI', ATT: 'ATA' };

/** Estado do desenvolvimento de todos os jogadores (por id). Começa vazio: strengthBase = força no 1º encontro. */
export type DevelopmentState = ReadonlyMap<string, PlayerDevelopment>;

/**
 * Avança uma rodada para todos os jogadores com clube, a partir do mundo ANTES da rodada (elencos, idade, lesões) e
 * das partidas que o engine produziu. Função pura: devolve um novo mapa.
 */
export function stepDevelopment(state: DevelopmentState, worldBefore: World, matches: readonly MatchState[], season: number, round: number, cfg: DevelopmentConfig): Map<string, PlayerDevelopment> {
  const next = new Map(state);
  const strengthOf = (id: string) => next.get(id)?.strengthCurrent ?? worldBefore.players[id].strength;
  const env = new Map<string, number>();
  for (const [id, club] of Object.entries(worldBefore.clubs)) env.set(id, environmentLevel(club.squad.filter((p) => worldBefore.players[p]).map(strengthOf)));
  const div = new Map<string, number>();
  for (const d of worldBefore.divisions) div.set(d.id, d.clubIds.reduce((a, id) => a + (env.get(id) ?? 0), 0) / Math.max(1, d.clubIds.length));
  const ev = new Map<string, Omit<MatchEvidence, 'injured'>>();
  for (const m of matches) for (const [id, e] of evidenceFromMatch(m)) ev.set(id, e);
  for (const id of Object.keys(worldBefore.players).sort()) {
    const p = worldBefore.players[id];
    if (!p.clubId) continue;
    const dev = next.get(id) ?? newDevelopment(id, p.strength);
    const e: MatchEvidence = ev.get(id) ? { ...ev.get(id)!, injured: false } : { played: false, minutes: 0, started: false, goals: 0, saves: 0, teamGoalsFor: 0, teamGoalsAgainst: 0, redCard: false, injured: p.condition.injuryRounds > 0 };
    next.set(id, developRound(dev, { season, round, age: p.age, position: POSITION[p.position], environmentLevel: env.get(p.clubId) ?? 0, divisionLevel: div.get(worldBefore.clubs[p.clubId].divisionId) ?? null, evidence: e }, cfg));
  }
  return next;
}

/** O mesmo World, com Player.strength = strengthCurrent de quem tem desenvolvimento. Nada além da força muda. */
export function withDevelopedStrength(world: World, state: DevelopmentState): World {
  let players: Record<string, Player> | null = null;
  for (const [id, dev] of state) {
    const p = world.players[id];
    if (!p || p.strength === dev.strengthCurrent) continue;
    players ??= { ...world.players };
    players[id] = { ...p, strength: dev.strengthCurrent };
  }
  return players ? { ...world, players } : world;
}
