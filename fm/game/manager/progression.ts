import type { Player, World } from '../../engine/index.ts';
import { stableHash } from './people.ts';
import { roundTo } from './finance.ts';
import type { StatLine } from './state.ts';

// FORÇA RELATIVA e EVOLUÇÃO (docs/PLAYER-PROGRESSION.md).
// A força (1–50) continua sendo o único atributo; a divisão NÃO limita a força. O que muda com a divisão é a LEITURA:
// força 30 é destaque na 4ª e abaixo da média na 1ª. A "força esperada" de uma divisão é a média real dos elencos dela.
// Evolução: dois checkpoints por temporada (meio, depois da rodada 19, e fim, antes do acesso/rebaixamento), cada um
// com no máximo ±1. Subir de divisão não aumenta ninguém na hora; cair não derruba ninguém na hora: a adaptação ao novo
// nível vem nos checkpoints seguintes. Tudo sai de um hash estável (seed + temporada + checkpoint + jogador).

export type Tier = 'DESTAQUE' | 'ACIMA' | 'MEDIA' | 'ABAIXO';
export const TIER_LABEL: Record<Tier, string> = { DESTAQUE: '⭐ Destaque da divisão', ACIMA: 'Acima da média da divisão', MEDIA: 'Na média da divisão', ABAIXO: 'Abaixo da média da divisão' };
/** Diferença para a média da divisão a partir da qual o jogador é destaque (⭐). */
export const STAR_GAP = 8;

/** Média de força dos elencos de cada divisão (por id da divisão). */
export function divisionMeans(world: World): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of world.divisions) {
    let sum = 0;
    let n = 0;
    for (const id of d.clubIds) for (const pid of world.clubs[id]?.squad ?? []) {
      const p = world.players[pid];
      if (p) {
        sum += p.strength;
        n += 1;
      }
    }
    out[d.id] = n ? sum / n : 0;
  }
  return out;
}

export interface Relative {
  divisionId: string;
  mean: number;
  delta: number;
  tier: Tier;
  star: boolean;
}

/** Leitura da força em relação à divisão do clube do jogador (null para jogador sem clube). */
export function relativeOf(world: World, means: Record<string, number>, p: Pick<Player, 'strength' | 'clubId'>): Relative | null {
  const club = p.clubId ? world.clubs[p.clubId] : null;
  if (!club) return null;
  const mean = means[club.divisionId] ?? 0;
  const delta = p.strength - mean;
  const tier: Tier = delta >= STAR_GAP ? 'DESTAQUE' : delta >= 3 ? 'ACIMA' : delta > -3 ? 'MEDIA' : 'ABAIXO';
  return { divisionId: club.divisionId, mean, delta, tier, star: tier === 'DESTAQUE' };
}

export type Checkpoint = 'MEIO' | 'FIM';

export interface EvolutionInput {
  seed: string;
  season: number;
  checkpoint: Checkpoint;
  /** estatísticas da temporada até aqui (jogos, gols) */
  stats: Record<string, StatLine>;
  /** rodadas já jogadas na temporada */
  roundsPlayed: number;
  /** bônus de centro de treinamento para jovens de um clube (níveis) */
  youthBonus: (p: Player) => number;
}

export interface StrengthChange {
  playerId: string;
  clubId: string | null;
  from: number;
  to: number;
}

/** Pontuação de tendência (positiva = tende a subir). Pequena por construção: o passo é sempre ±1 ou 0. */
export function evolutionScore(p: Player, mean: number | null, line: StatLine | undefined, roundsPlayed: number, youth: number): number {
  let score = p.age <= 21 ? 0.6 : p.age <= 24 ? 0.3 : p.age <= 29 ? 0 : p.age <= 32 ? -0.3 : -0.6;
  if (mean !== null) {
    const gap = mean - p.strength;
    if (gap >= 6) score += 0.3; // abaixo do nível da divisão: o nível puxa para cima (ex.: clube que subiu)
    else if (gap <= -6) score -= 0.3; // acima: adapta-se para baixo devagar (ex.: clube que caiu)
  }
  const apps = line?.apps ?? 0;
  if (roundsPlayed > 0) {
    if (apps / roundsPlayed >= 0.5) score += 0.2; // jogando
    else if (apps === 0 && p.age >= 23) score -= 0.2; // sem jogar
    if ((p.position === 'ATT' || p.position === 'MID') && (line?.goals ?? 0) >= roundsPlayed * 0.3) score += 0.2; // decidindo
  }
  return score + youth;
}

/** Passo do checkpoint: +1, 0 ou −1, decidido por um hash estável (sem RNG de partida). */
export function evolutionStep(score: number, u: number): -1 | 0 | 1 {
  const clamp = (v: number) => Math.max(0.02, Math.min(0.85, v));
  const up = clamp(0.12 + 0.6 * score);
  const down = clamp(0.12 - 0.6 * score);
  if (u < up) return 1;
  if (u >= 1 - down) return -1;
  return 0;
}

/** Aplica um checkpoint de evolução a todos os jogadores com clube. Valor de mercado acompanha a força. */
export function evolveWorld(world: World, i: EvolutionInput): { world: World; changes: StrengthChange[] } {
  const means = divisionMeans(world);
  const players: Record<string, Player> = { ...world.players };
  const changes: StrengthChange[] = [];
  for (const id of Object.keys(world.players).sort()) {
    const p = world.players[id];
    if (!p.clubId) continue;
    const club = world.clubs[p.clubId];
    const mean = club ? (means[club.divisionId] ?? null) : null;
    const score = evolutionScore(p, mean, i.stats[id], i.roundsPlayed, i.youthBonus(p));
    const u = stableHash(`${i.seed}|evolucao|${i.season}|${i.checkpoint}|${id}`) / 0x100000000;
    const step = evolutionStep(score, u);
    if (step === 0) continue;
    const strength = Math.max(1, Math.min(50, p.strength + step));
    if (strength === p.strength) continue;
    const ratio = strength / p.strength;
    players[id] = { ...p, strength, marketValue: Math.max(1_000, roundTo(p.marketValue * ratio * ratio, 1_000)) };
    changes.push({ playerId: id, clubId: p.clubId, from: p.strength, to: strength });
  }
  return { world: { ...world, players }, changes };
}

/** Fator de mercado do destaque: quanto mais acima da média da divisão, mais caro e mais bem pago (teto de +30%). */
export function starPremium(rel: Relative | null): number {
  if (!rel || rel.delta <= 3) return 1;
  return 1 + Math.min(0.3, (rel.delta - 3) * 0.03);
}
