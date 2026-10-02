import { createRng, deriveSeed, type Club, type Player, type Position, type World } from '../../engine/index.ts';
import { personalityOf } from './people.ts';
import type { Auction, Bid, Negotiation, Personality } from './state.ts';
import { roundTo } from './finance.ts';

// Mercado: janela, busca, propostas com contraproposta, empréstimo, leilão e jogadores livres.
// A negociação é uma regra fixa e determinística (preço pedido, personalidade, tentativas): não há sorteio na resposta
// e nenhuma IA decide nada. O mesmo pedido, no mesmo estado, tem sempre a mesma resposta.

export const MIN_SQUAD = 16;
export const MAX_SQUAD = 32;
export const MIN_GOALKEEPERS = 2;
export const MAX_ATTEMPTS = 3;
/** Rodadas (a próxima a jogar) com a janela aberta; fora da temporada (entre a 38ª e a virada) ela também abre. */
export const WINDOWS: readonly [number, number][] = [[1, 6], [19, 24]];

export function windowOpen(roundNumber: number, seasonOver: boolean): boolean {
  return seasonOver || WINDOWS.some(([a, b]) => roundNumber >= a && roundNumber <= b);
}

export function windowLabel(roundNumber: number, seasonOver: boolean): string {
  if (seasonOver) return 'Janela aberta (intertemporada)';
  const w = WINDOWS.find(([a, b]) => roundNumber >= a && roundNumber <= b);
  if (w) return `Janela aberta até a rodada ${w[1]}`;
  const next = WINDOWS.find(([a]) => roundNumber < a);
  return next ? `Janela fechada · abre na rodada ${next[0]}` : 'Janela fechada · abre na intertemporada';
}

// ---------- leitura ----------

/** Ordem de importância no elenco (1 = o mais forte). */
export function squadRank(world: World, club: Club, playerId: string): number {
  const ranked = club.squad.map((id) => world.players[id]).filter(Boolean).sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
  return ranked.findIndex((p) => p.id === playerId) + 1;
}

const levelOf = (world: World, club: Club | null | undefined) => (club ? (world.divisions.find((d) => d.id === club.divisionId)?.level ?? 4) : 5);

/** Preço pedido pelo clube dono: valor de mercado ajustado pela importância do jogador e pela situação do vendedor. */
export function askingPrice(world: World, seed: string, playerId: string, buyer: Club | null): number {
  const p = world.players[playerId];
  const seller = p.clubId ? world.clubs[p.clubId] : null;
  if (!seller) return 0;
  const rank = squadRank(world, seller, playerId);
  let f = rank <= 11 ? 1.35 : rank <= 16 ? 1.1 : 0.9;
  const pers = personalityOf(seed, p);
  if (pers === 'LEAL') f *= 1.15;
  if (pers === 'AMBICIOSO' && buyer && levelOf(world, buyer) < levelOf(world, seller)) f *= 0.95;
  if (seller.money < 0) f *= 0.85;
  if (p.contract.endSeason <= 0) f *= 0.8;
  return Math.max(5_000, roundTo(p.marketValue * f, 5_000));
}

const SALARY_FACTOR: Record<Personality, number> = { LEAL: 1.05, AMBICIOSO: 1.2, FINANCEIRO: 1.3, COMPETITIVO: 1.15, JOVEM: 1.05, VETERANO: 1.0 };

export function salaryDemand(seed: string, p: Player): number {
  return roundTo(Math.max(p.salary, 100) * SALARY_FACTOR[personalityOf(seed, p)], 100);
}

export function contractYears(seed: string, p: Player): number {
  const pers = personalityOf(seed, p);
  return pers === 'JOVEM' ? 3 : pers === 'VETERANO' ? 2 : p.age >= 31 ? 1 : 2;
}

/** O jogador aceita mudar para o clube comprador? (decisão do jogador, antes da conversa com o clube) */
export function playerAccepts(world: World, seed: string, p: Player, buyer: Club): { ok: boolean; reason: string } {
  const seller = p.clubId ? world.clubs[p.clubId] : null;
  const pers = personalityOf(seed, p);
  const from = levelOf(world, seller);
  const to = levelOf(world, buyer);
  if (pers === 'AMBICIOSO' && to > from) return { ok: false, reason: `${p.name} é ambicioso e não aceita jogar uma divisão abaixo.` };
  if (pers === 'COMPETITIVO' && seller && buyer.reputation < seller.reputation - 15) return { ok: false, reason: `${p.name} é competitivo e quer um clube de mais peso.` };
  if (pers === 'LEAL' && to > from + 1) return { ok: false, reason: `${p.name} é leal ao clube e não quer cair duas divisões.` };
  return { ok: true, reason: '' };
}

export interface SearchFilters {
  text?: string;
  position?: Position | '';
  minAge?: number;
  maxAge?: number;
  maxPrice?: number;
  divisionLevel?: number | 0;
  nationality?: string;
  freeOnly?: boolean;
  wishlistOnly?: boolean;
}

export interface MarketRow {
  player: Player;
  club: Club | null;
  level: number;
  price: number;
  wish: boolean;
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca no mercado (jogadores de outros clubes e livres). Ordena por força e depois por preço. */
export function searchPlayers(world: World, seed: string, userClubId: string | null, wishlist: readonly string[], f: SearchFilters, limit = 60): MarketRow[] {
  const buyer = userClubId ? world.clubs[userClubId] : null;
  const text = f.text ? fold(f.text.trim()) : '';
  const out: MarketRow[] = [];
  for (const p of Object.values(world.players)) {
    if (p.clubId !== null && p.clubId === userClubId) continue;
    if (f.freeOnly && p.clubId !== null) continue;
    if (f.wishlistOnly && !wishlist.includes(p.id)) continue;
    if (f.position && p.position !== f.position) continue;
    if (f.minAge && p.age < f.minAge) continue;
    if (f.maxAge && p.age > f.maxAge) continue;
    if (f.nationality && p.nationality !== f.nationality) continue;
    const club = p.clubId ? world.clubs[p.clubId] : null;
    const level = levelOf(world, club);
    if (f.divisionLevel && level !== f.divisionLevel) continue;
    if (text && !fold(p.name).includes(text) && !(club && fold(club.name).includes(text))) continue;
    const price = club ? askingPrice(world, seed, p.id, buyer) : 0;
    if (f.maxPrice && price > f.maxPrice) continue;
    out.push({ player: p, club, level, price, wish: wishlist.includes(p.id) });
  }
  out.sort((a, b) => b.player.strength - a.player.strength || a.price - b.price || a.player.id.localeCompare(b.player.id));
  return out.slice(0, limit);
}

// ---------- regras de elenco ----------

export function squadCheckOut(world: World, club: Club, playerId: string): string | null {
  if (club.squad.length - 1 < MIN_SQUAD) return `O elenco não pode ficar com menos de ${MIN_SQUAD} jogadores.`;
  const p = world.players[playerId];
  if (p.position === 'GK') {
    const gks = club.squad.filter((id) => world.players[id]?.position === 'GK').length;
    if (gks - 1 < MIN_GOALKEEPERS) return `O elenco precisa de pelo menos ${MIN_GOALKEEPERS} goleiros.`;
  }
  return null;
}

export function squadCheckIn(club: Club): string | null {
  return club.squad.length + 1 > MAX_SQUAD ? `O elenco já tem ${MAX_SQUAD} jogadores.` : null;
}

/** Move um jogador entre clubes (ou para "sem clube"). Não mexe em dinheiro. */
export function movePlayer(world: World, playerId: string, toClubId: string | null, patch: Partial<Pick<Player, 'salary' | 'contract'>> = {}): World {
  const p = world.players[playerId];
  const clubs = { ...world.clubs };
  if (p.clubId) {
    const from = clubs[p.clubId];
    clubs[from.id] = { ...from, squad: from.squad.filter((id) => id !== playerId), penaltyTakerId: from.penaltyTakerId === playerId ? null : from.penaltyTakerId };
  }
  if (toClubId) {
    const to = clubs[toClubId];
    clubs[toClubId] = { ...to, squad: [...to.squad, playerId] };
  }
  const player: Player = { ...p, ...patch, clubId: toClubId, condition: { ...p.condition, yellowCardsAccumulated: p.condition.yellowCardsAccumulated } };
  return { ...world, clubs, players: { ...world.players, [playerId]: player } };
}

export function addMoney(world: World, clubId: string, amount: number): World {
  const c = world.clubs[clubId];
  return { ...world, clubs: { ...world.clubs, [clubId]: { ...c, money: c.money + Math.round(amount) } } };
}

// ---------- proposta de compra ----------

export type OfferVerdict =
  | { kind: 'ACCEPTED'; price: number; message: string }
  | { kind: 'COUNTER'; counter: number; message: string }
  | { kind: 'REFUSED'; final: boolean; message: string };

/**
 * Resposta do clube vendedor a uma oferta. Regra fixa:
 *  oferta ≥ preço pedido → aceita; ≥ 75% → contraproposta (2/3 do caminho até o preço); abaixo → recusa.
 *  Na 3ª tentativa sem acordo o clube encerra a conversa.
 */
export function evaluateOffer(asking: number, offer: number, attempts: number): OfferVerdict {
  if (offer >= asking) return { kind: 'ACCEPTED', price: offer, message: 'Proposta aceita pelo clube.' };
  const last = attempts + 1 >= MAX_ATTEMPTS;
  if (offer >= asking * 0.75 && !last) {
    const counter = Math.max(offer + 5_000, roundTo((asking * 2 + offer) / 3, 5_000));
    return { kind: 'COUNTER', counter: Math.min(counter, asking), message: 'O clube fez uma contraproposta.' };
  }
  if (last) return { kind: 'REFUSED', final: true, message: 'O clube encerrou a negociação depois de três tentativas.' };
  return { kind: 'REFUSED', final: false, message: offer < asking * 0.5 ? 'Proposta muito abaixo do valor: o clube nem respondeu.' : 'Proposta recusada: o clube espera bem mais.' };
}

export function newNegotiation(id: string, kind: Negotiation['kind'], p: Player, offer: number, season: number, round: number): Negotiation {
  return { id, kind, playerId: p.id, sellerClubId: p.clubId as string, offer, counter: null, status: 'OPEN', attempts: 0, message: '', season, round };
}

// ---------- empréstimo ----------

/** Pode emprestar? O clube dono só libera quem não está entre os 16 mais fortes e se o elenco seguir com 18+. */
export function loanable(world: World, playerId: string): { ok: boolean; reason: string } {
  const p = world.players[playerId];
  const club = p.clubId ? world.clubs[p.clubId] : null;
  if (!club) return { ok: false, reason: 'Jogador sem clube: contrate como livre.' };
  if (squadRank(world, club, playerId) <= 16) return { ok: false, reason: `${club.name} não empresta um jogador que usa.` };
  if (club.squad.length - 1 < 18) return { ok: false, reason: `${club.name} tem o elenco curto e não empresta.` };
  return { ok: true, reason: '' };
}

export function loanFee(p: Player): number {
  return Math.max(5_000, roundTo(p.marketValue * 0.1, 1_000));
}

/** Para onde vai um jogador emprestado pelo treinador: o clube da mesma divisão (ou da de baixo) com o elenco mais curto. */
export function loanDestination(world: World, seed: string, from: Club, playerId: string): Club | null {
  const level = levelOf(world, from);
  const pool = Object.values(world.clubs).filter((c) => c.id !== from.id && c.squad.length < MAX_SQUAD - 2 && [level, level + 1].includes(levelOf(world, c)));
  if (pool.length === 0) return null;
  const rng = createRng(deriveSeed(seed, `emprestimo:${playerId}`));
  const shortest = Math.min(...pool.map((c) => c.squad.length));
  const best = pool.filter((c) => c.squad.length <= shortest + 1).sort((a, b) => a.id.localeCompare(b.id));
  return best[rng.int(0, best.length - 1)];
}

// ---------- leilão ----------

/**
 * Lances da CPU num leilão, decididos quando ele fecha: clubes com caixa e para quem o jogador seria titular dão lance,
 * cada um com um teto próprio (seed do leilão). Vence o maior lance.
 */
export function auctionBids(world: World, seed: string, a: Auction, round: number): Bid[] {
  const p = world.players[a.playerId];
  const rng = createRng(deriveSeed(seed, `leilao:${a.id}`));
  const bids: Bid[] = [];
  const clubs = Object.values(world.clubs).sort((x, y) => x.id.localeCompare(y.id));
  for (const club of clubs) {
    if (club.id === p.clubId || club.squad.length >= MAX_SQUAD) continue;
    if (club.money * 0.4 < a.startPrice) continue;
    const eleventh = club.squad.map((id) => world.players[id]?.strength ?? 0).sort((x, y) => y - x)[10] ?? 0;
    if (p.strength < eleventh) continue;
    const roll = rng.next();
    if (roll < 0.55) continue;
    const ceiling = Math.min(club.money * 0.4, p.marketValue * 1.6);
    const amount = roundTo(a.startPrice * (1 + roll * 0.5), 5_000);
    if (amount < a.startPrice || amount > ceiling) continue;
    bids.push({ clubId: club.id, amount, round });
    if (bids.length >= 6) break;
  }
  return bids.sort((x, y) => y.amount - x.amount || x.clubId.localeCompare(y.clubId));
}

export function minAuctionPrice(p: Player): number {
  return Math.max(5_000, roundTo(p.marketValue * 0.5, 5_000));
}
