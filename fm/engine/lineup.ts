import { ALL_BEHAVIORS, ALL_STYLES, DEFAULT_CONFIG, type EngineConfig } from './config.ts';
import { effectiveStrength } from './strength.ts';
import type { Behavior, Club, Formation, Lineup, LineupSlot, Player, Sector, Style } from './types.ts';

// Escalação (seções 3 e 5). Formação livre: qualquer divisão dos 10 jogadores de linha, mais 1 goleiro.

export const SECTORS: Sector[] = ['GK', 'DEF', 'MID', 'ATT'];
const SECTOR_Y: Record<Sector, number> = { GK: 5, DEF: 30, MID: 55, ATT: 80 };

export function formationLabel(f: Formation): string {
  return `${f.DEF}-${f.MID}-${f.ATT}`;
}

/** "4-3-3" → { DEF: 4, MID: 3, ATT: 3 }. Lança erro se não somar 10. */
export function parseFormation(label: string): Formation {
  const parts = label.split('-').map((n) => Number.parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new Error(`Formação inválida: ${label}`);
  }
  const [DEF, MID, ATT] = parts;
  if (DEF + MID + ATT !== 10) throw new Error(`Formação precisa somar 10 jogadores de linha: ${label}`);
  return { DEF, MID, ATT };
}

export function formationOf(slots: readonly LineupSlot[]): Formation {
  const f: Formation = { DEF: 0, MID: 0, ATT: 0 };
  for (const s of slots) if (s.sector !== 'GK') f[s.sector] += 1;
  return f;
}

export function isAvailable(p: Player): boolean {
  return p.condition.injuryRounds === 0 && p.condition.suspensionRounds === 0;
}

/** Espalha x no campo e fixa y pelo setor. Só serve à futura tela; o motor usa o setor. */
export function arrangeSlots(entries: readonly { playerId: string; sector: Sector }[]): LineupSlot[] {
  const bySector: Record<Sector, string[]> = { GK: [], DEF: [], MID: [], ATT: [] };
  for (const e of entries) bySector[e.sector].push(e.playerId);
  const slots: LineupSlot[] = [];
  for (const sector of SECTORS) {
    const ids = bySector[sector];
    ids.forEach((playerId, i) => {
      slots.push({ playerId, sector, x: Math.round(((i + 1) * 100) / (ids.length + 1)), y: SECTOR_Y[sector] });
    });
  }
  return slots;
}

/** Ordena por força e usa o id como desempate: a mesma entrada sempre gera a mesma escalação. */
function byStrengthDesc(a: Player, b: Player): number {
  return b.strength - a.strength || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export interface AutoLineupOptions {
  formation?: Formation;
  style?: Style;
  behavior?: Behavior;
}

/**
 * Escalação automática (CPU e botão "melhor time"): goleiro mais forte, depois os mais fortes
 * de cada posição natural. Faltando alguém, entra quem rende mais naquele setor.
 */
export function autoLineup(
  club: Club,
  players: Record<string, Player>,
  opts: AutoLineupOptions = {},
  cfg: EngineConfig = DEFAULT_CONFIG,
): Lineup {
  const formation = opts.formation ?? club.defaultTactics.formation;
  const pool = club.squad
    .map((id) => players[id])
    .filter((p): p is Player => p !== undefined && isAvailable(p))
    .sort(byStrengthDesc);
  if (pool.length < 11) throw new Error(`${club.name} não tem 11 jogadores disponíveis`);

  const taken = new Set<string>();
  const chosen: { playerId: string; sector: Sector }[] = [];
  const need: Record<Sector, number> = { GK: 1, DEF: formation.DEF, MID: formation.MID, ATT: formation.ATT };

  // 1ª passada: posições naturais.
  for (const sector of SECTORS) {
    for (const p of pool) {
      if (need[sector] === 0) break;
      if (p.position === sector && !taken.has(p.id)) {
        chosen.push({ playerId: p.id, sector });
        taken.add(p.id);
        need[sector] -= 1;
      }
    }
  }
  // 2ª passada: vagas restantes vão para quem tiver mais força efetiva no setor.
  for (const sector of SECTORS) {
    while (need[sector] > 0) {
      const best = pool
        .filter((p) => !taken.has(p.id))
        .sort((a, b) => effectiveStrength(b, sector, cfg) - effectiveStrength(a, sector, cfg) || byStrengthDesc(a, b))[0];
      if (!best) throw new Error(`${club.name}: faltam jogadores para ${formationLabel(formation)}`);
      chosen.push({ playerId: best.id, sector });
      taken.add(best.id);
      need[sector] -= 1;
    }
  }

  // Banco: um goleiro reserva primeiro (se houver), depois os mais fortes.
  const rest = pool.filter((p) => !taken.has(p.id));
  const bench: string[] = [];
  const reserveGk = rest.find((p) => p.position === 'GK');
  if (reserveGk) bench.push(reserveGk.id);
  for (const p of rest) {
    if (bench.length >= cfg.maxBench) break;
    if (!bench.includes(p.id)) bench.push(p.id);
  }

  const starters = arrangeSlots(chosen);
  const taker = club.penaltyTakerId && starters.some((s) => s.playerId === club.penaltyTakerId) ? club.penaltyTakerId : null;
  return {
    clubId: club.id,
    starters,
    bench,
    style: opts.style ?? club.defaultTactics.style,
    behavior: opts.behavior ?? club.defaultTactics.behavior,
    penaltyTakerId: taker,
  };
}

/** Devolve a lista de problemas. Lista vazia = escalação válida. O motor nunca "conserta" em silêncio. */
export function validateLineup(
  lineup: Lineup,
  club: Club,
  players: Record<string, Player>,
  cfg: EngineConfig = DEFAULT_CONFIG,
): string[] {
  const errors: string[] = [];
  const squad = new Set(club.squad);
  const seen = new Set<string>();

  if (lineup.clubId !== club.id) errors.push('escalação de outro clube');
  if (lineup.starters.length !== 11) errors.push(`precisa de 11 titulares (tem ${lineup.starters.length})`);
  const goalkeepers = lineup.starters.filter((s) => s.sector === 'GK').length;
  if (goalkeepers !== 1) errors.push(`precisa de exatamente 1 no gol (tem ${goalkeepers})`);
  if (lineup.bench.length > cfg.maxBench) errors.push(`banco com mais de ${cfg.maxBench} reservas`);

  for (const id of [...lineup.starters.map((s) => s.playerId), ...lineup.bench]) {
    if (seen.has(id)) errors.push(`jogador repetido: ${id}`);
    seen.add(id);
    const p = players[id];
    if (!p || !squad.has(id)) errors.push(`jogador fora do elenco: ${id}`);
    else if (!isAvailable(p)) errors.push(`jogador lesionado ou suspenso: ${id}`);
  }
  for (const s of lineup.starters) {
    if (!SECTORS.includes(s.sector)) errors.push(`setor inválido: ${s.sector}`);
  }
  if (!ALL_STYLES.includes(lineup.style)) errors.push(`estilo inválido: ${lineup.style}`);
  if (!ALL_BEHAVIORS.includes(lineup.behavior)) errors.push(`comportamento inválido: ${lineup.behavior}`);
  if (lineup.penaltyTakerId && !lineup.starters.some((s) => s.playerId === lineup.penaltyTakerId)) {
    errors.push('batedor de pênalti precisa ser titular');
  }
  return errors;
}
