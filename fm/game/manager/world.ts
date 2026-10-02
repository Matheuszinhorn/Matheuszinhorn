import { createRng, deriveSeed, type Player, type Position, type World } from '../../engine/index.ts';
import type { CareerState } from '../career.ts';
import { coachName, stableHash } from './people.ts';
import { recentForm } from './board.ts';
import { divisionStandings } from '../career.ts';
import { MAX_SQUAD, MIN_GOALKEEPERS, addMoney, movePlayer } from './market.ts';
import type { CpuCoach } from './state.ts';
import { absRound } from './state.ts';
import { roundTo } from './finance.ts';

// Mundo vivo: técnicos da CPU caem e chegam, jogadores envelhecem e evoluem, contratos vencem, clubes da CPU
// contratam na intertemporada e as categorias de base repõem elencos curtos.
// Tudo o que muda JOGADORES acontece só na virada da temporada: durante a temporada o mundo esportivo da CPU fica
// parado, então a 1ª temporada joga exatamente as mesmas partidas da versão anterior (mesma seed = mesmos placares).

const SALARY_PER_POINT: Record<number, number> = { 1: 900, 2: 400, 3: 150, 4: 60 };
const YOUTH_STRENGTH: Record<number, [number, number]> = { 1: [22, 34], 2: [16, 28], 3: [11, 22], 4: [7, 17] };
export const RETIRE_AGE = 37;
export const CPU_MIN_SQUAD = 18;

const levelOfClub = (world: World, clubId: string) => world.divisions.find((d) => d.id === world.clubs[clubId]?.divisionId)?.level ?? 4;

// ---------- técnicos da CPU ----------

export interface CoachChange {
  clubId: string;
  out: string;
  in: string;
}

/**
 * Demissões na CPU depois da rodada: a partir da 6ª, quem está entre os 3 últimos da divisão e perdeu 3 dos últimos
 * 4 jogos, com o técnico há pelo menos 6 rodadas no cargo. No máximo 2 por rodada no mundo todo.
 */
export function cpuCoachChanges(c: CareerState, coaches: Record<string, CpuCoach>, playedRound: number): { coaches: Record<string, CpuCoach>; changes: CoachChange[] } {
  if (playedRound < 6) return { coaches, changes: [] };
  const now = absRound(c.season, playedRound);
  const changes: CoachChange[] = [];
  const next = { ...coaches };
  for (const d of [...c.world.divisions].sort((a, b) => a.level - b.level)) {
    const table = divisionStandings(c, d.id);
    for (const row of table.slice(-3)) {
      if (row.clubId === c.userClubId || changes.length >= 2) continue;
      const coach = next[row.clubId];
      if (!coach || now - coach.since < 6) continue;
      const losses = recentForm(c.results, row.clubId, 4).filter((x) => x === 'D').length;
      if (losses < 3) continue;
      const fresh: CpuCoach = { name: coachName(c.seed, `${row.clubId}:${c.season}:${playedRound}`), since: now };
      changes.push({ clubId: row.clubId, out: coach.name, in: fresh.name });
      next[row.clubId] = fresh;
    }
  }
  return { coaches: next, changes };
}

// ---------- virada de temporada ----------

const FIRST = ['Adriano', 'Bruno', 'Caio', 'Davi', 'Enzo', 'Felipe', 'Gabriel', 'Heitor', 'Igor', 'João', 'Kauã', 'Lucas', 'Matheus', 'Nicolas', 'Otávio', 'Pedro', 'Rafael', 'Samuel', 'Thiago', 'Vinícius', 'Wesley', 'Yuri'];
const LAST = ['Alves', 'Barbosa', 'Cardoso', 'Duarte', 'Esteves', 'Farias', 'Gomes', 'Henrique', 'Lopes', 'Macedo', 'Nogueira', 'Oliveira', 'Pereira', 'Queiroz', 'Rocha', 'Santana', 'Teixeira', 'Viana'];

function valueFor(strength: number, level: number): { salary: number; marketValue: number } {
  const per = SALARY_PER_POINT[level] ?? 60;
  return { salary: Math.max(100, Math.round((strength * per) / 100) * 100), marketValue: Math.max(1_000, Math.round((strength * strength * per * 4) / 1000) * 1000) };
}

/** Jovem da base: 17–19 anos, força da faixa de baixo da divisão, contrato de 3 temporadas. */
export function youthPlayer(seed: string, season: number, clubId: string, n: number, position: Position, level: number): Player {
  const rng = createRng(deriveSeed(seed, `base:${season}:${clubId}:${n}`));
  const [lo, hi] = YOUTH_STRENGTH[level] ?? [7, 17];
  const strength = rng.int(lo, hi);
  return {
    id: `${clubId}-b${season}-${n}`,
    name: `${rng.pick(FIRST)} ${rng.pick(LAST)}`,
    age: rng.int(17, 19),
    nationality: 'Brasil',
    position,
    strength,
    temperament: rng.pick(['CALM', 'NORMAL', 'NORMAL', 'EXPLOSIVE'] as const),
    ...valueFor(strength, level),
    contract: { endSeason: season + 3 },
    clubId,
    condition: { injuryRounds: 0, suspensionRounds: 0, yellowCardsAccumulated: 0 },
  };
}

/** Repõe elencos curtos com jovens da base (goleiros primeiro). */
export function youthIntake(world: World, seed: string, season: number, minSquad: (clubId: string) => number): { world: World; added: Record<string, string[]> } {
  let w = world;
  const added: Record<string, string[]> = {};
  for (const id of Object.keys(world.clubs).sort()) {
    let n = 0;
    const level = levelOfClub(w, id);
    const need = () => {
      const club = w.clubs[id];
      const gks = club.squad.filter((p) => w.players[p]?.position === 'GK').length;
      if (gks < MIN_GOALKEEPERS) return 'GK' as Position;
      if (club.squad.length >= minSquad(id)) return null;
      const count = (pos: Position) => club.squad.filter((p) => w.players[p]?.position === pos).length;
      const ratios: [Position, number][] = [['DEF', count('DEF') / 7], ['MID', count('MID') / 7], ['ATT', count('ATT') / 4]];
      return ratios.sort((a, b) => a[1] - b[1])[0][0];
    };
    for (let pos = need(); pos !== null && n < 12; pos = need()) {
      const p = youthPlayer(seed, season, id, ++n, pos, level);
      w = { ...w, players: { ...w.players, [p.id]: p }, clubs: { ...w.clubs, [id]: { ...w.clubs[id], squad: [...w.clubs[id].squad, p.id] } } };
      (added[id] ??= []).push(p.id);
    }
  }
  return { world: w, added };
}

/**
 * Envelhecimento e evolução (uma vez por virada): +1 ano; até 23 anos sobe 0 a 2 (+ bônus do CT no clube do treinador),
 * 24–29 varia de −1 a +1, 30–32 cai 0 a 1, 33+ cai 0 a 2. Valor de mercado e salário-base acompanham a nova força.
 * Quem chega a 37 anos se aposenta.
 */
export function agePlayers(world: World, seed: string, season: number, bonus: (p: Player) => number): { world: World; retired: Player[] } {
  const players: Record<string, Player> = {};
  const retired: Player[] = [];
  const clubs = { ...world.clubs };
  for (const id of Object.keys(world.players).sort()) {
    const p = world.players[id];
    const age = p.age + 1;
    if (age >= RETIRE_AGE) {
      retired.push(p);
      if (p.clubId && clubs[p.clubId]) clubs[p.clubId] = { ...clubs[p.clubId], squad: clubs[p.clubId].squad.filter((x) => x !== id), penaltyTakerId: clubs[p.clubId].penaltyTakerId === id ? null : clubs[p.clubId].penaltyTakerId };
      continue;
    }
    const h = stableHash(`${seed}|evolucao|${season}|${id}`);
    const roll = (lo: number, hi: number) => lo + (h % (hi - lo + 1));
    const delta = age <= 23 ? roll(0, 2) + bonus(p) : age <= 29 ? roll(-1, 1) : age <= 32 ? roll(-1, 0) : roll(-2, 0);
    const strength = Math.max(1, Math.min(50, p.strength + delta));
    const ratio = strength / Math.max(1, p.strength);
    players[id] = { ...p, age, strength, marketValue: Math.max(1_000, roundTo(p.marketValue * ratio * ratio * (age >= 31 ? 0.85 : 1), 1_000)) };
  }
  return { world: { ...world, players, clubs }, retired };
}

/** CPU renova automaticamente quem tem contrato vencendo (1 a 3 temporadas). */
export function cpuRenewals(world: World, newSeason: number, isUser: (clubId: string) => boolean): World {
  const players = { ...world.players };
  for (const p of Object.values(world.players)) {
    if (!p.clubId || isUser(p.clubId) || p.contract.endSeason >= newSeason) continue;
    players[p.id] = { ...p, contract: { endSeason: newSeason - 1 + 1 + (stableHash(`renova|${p.id}|${newSeason}`) % 3) } };
  }
  return { ...world, players };
}

export interface CpuMove {
  playerId: string;
  from: string | null;
  to: string;
  fee: number;
}

/**
 * Transferências da CPU na intertemporada: os destaques das divisões de baixo sobem para clubes da divisão de cima
 * que podem pagar; depois, clubes de elenco curto contratam jogadores livres. O clube do treinador não entra.
 */
export function cpuTransfers(world: World, seed: string, season: number, userClubId: string | null): { world: World; moves: CpuMove[] } {
  const rng = createRng(deriveSeed(seed, `mercado-cpu:${season}`));
  let w = world;
  const moves: CpuMove[] = [];
  const levels = [...w.divisions].sort((a, b) => a.level - b.level);
  for (let i = 1; i < levels.length; i++) {
    const below = levels[i];
    const above = levels[i - 1];
    const stars = below.clubIds
      .filter((id) => id !== userClubId)
      .flatMap((id) => w.clubs[id].squad.map((p) => w.players[p]))
      .filter(Boolean)
      .sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id))
      .slice(0, 8);
    for (const p of stars) {
      if (rng.next() < 0.5) continue;
      const from = w.clubs[p.clubId as string];
      if (from.squad.length <= CPU_MIN_SQUAD - 2) continue;
      const fee = roundTo(p.marketValue * 1.2, 5_000);
      const buyers = above.clubIds.filter((id) => id !== userClubId && w.clubs[id].money > fee * 3 && w.clubs[id].squad.length < MAX_SQUAD - 2).sort();
      if (buyers.length === 0) continue;
      const to = buyers[rng.int(0, buyers.length - 1)];
      const salary = Math.max(p.salary, valueFor(p.strength, above.level).salary);
      w = movePlayer(w, p.id, to, { salary, contract: { endSeason: season + 2 } });
      w = addMoney(addMoney(w, to, -fee), from.id, fee);
      moves.push({ playerId: p.id, from: from.id, to, fee });
    }
  }
  const free = Object.values(w.players).filter((p) => p.clubId === null).sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
  for (const p of free) {
    const needy = Object.values(w.clubs)
      .filter((c) => c.id !== userClubId && c.squad.length < CPU_MIN_SQUAD + 2)
      .sort((a, b) => a.squad.length - b.squad.length || a.id.localeCompare(b.id))[0];
    if (!needy) break;
    const level = levelOfClub(w, needy.id);
    w = movePlayer(w, p.id, needy.id, { salary: valueFor(p.strength, level).salary, contract: { endSeason: season + 1 } });
    moves.push({ playerId: p.id, from: null, to: needy.id, fee: 0 });
  }
  return { world: w, moves };
}
