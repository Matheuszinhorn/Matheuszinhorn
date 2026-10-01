import type { Club, MatchResult, Player } from './types.ts';

// Finanças (seção 19). Duas partes:
//  1. Público (computeAttendance): calculado antes do jogo e guardado no MatchState.
//  2. Receitas e despesas por rodada (mais abaixo): primeira versão determinística e simples.
//
// Ocupação = 0,30 + 0,005 × reputação, limitada a 100%. O fator de momento (últimos 5 jogos) entra depois.

export function computeAttendance(club: Club): number {
  const occupancy = Math.min(1, Math.max(0, 0.3 + 0.005 * club.reputation));
  return Math.round(club.stadium.capacity * occupancy);
}

// ---------- Receitas e despesas por rodada ----------
//
// Regras desta versão (todas em reais inteiros; nada de decimais em dinheiro):
//  - Bilheteria: só o mandante recebe, público × preço do ingresso da divisão dele.
//  - Cota de TV: todo clube que joga a rodada recebe o valor da sua divisão.
//  - Salários: soma dos salários do elenco, paga a cada rodada, em casa ou fora, lesionado ou não.
//  - Manutenção do estádio: R$ por lugar (capacidade atual) por rodada.
//  - Saldo do clube = Club.money; pode ficar negativo (as consequências vêm com o mercado).
// Ficam para depois: premiação de fim de temporada, preço de ingresso ajustável, fator de momento no público.

export class FinanceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'FinanceError';
    this.code = code;
  }
}

export interface DivisionFinance {
  ticketPrice: number; // R$ por ingresso
  tvRightsPerRound: number; // R$ por rodada, para cada clube que joga
}

export interface FinanceConfig {
  byDivision: Record<string, DivisionFinance>; // chave: Club.divisionId
  fallback: DivisionFinance; // usado quando a divisão do clube não está em byDivision
  upkeepPerSeatPerRound: number; // R$ por lugar por rodada
}

// Calibragem inicial: um clube médio de cada divisão fecha a temporada com margem de cerca de +8% sobre o custo.
// Clubes grandes e de torcida forte ganham mais; clubes pequenos com folha pesada entram no vermelho.
// Difere do exemplo ilustrativo da especificação (D3 a R$ 20 e TV R$ 50.000), que deixaria o clube médio com ~+27%.
export const DEFAULT_FINANCE: FinanceConfig = {
  byDivision: {
    D1: { ticketPrice: 40, tvRightsPerRound: 350_000 },
    D2: { ticketPrice: 25, tvRightsPerRound: 160_000 },
    D3: { ticketPrice: 15, tvRightsPerRound: 50_000 },
    D4: { ticketPrice: 8, tvRightsPerRound: 18_000 },
  },
  fallback: { ticketPrice: 8, tvRightsPerRound: 18_000 },
  upkeepPerSeatPerRound: 1,
};

/** O que uma partida (uma rodada) rende e custa a um clube. */
export interface ClubFinanceEntry {
  clubId: string;
  matchId: string;
  home: boolean;
  attendance: number; // 0 para o visitante
  ticketRevenue: number;
  tvRevenue: number;
  revenue: number; // ticketRevenue + tvRevenue
  salaries: number;
  upkeep: number;
  expenses: number; // salaries + upkeep
  net: number; // revenue − expenses
}

export function divisionFinance(club: Club, cfg: FinanceConfig = DEFAULT_FINANCE): DivisionFinance {
  return cfg.byDivision[club.divisionId] ?? cfg.fallback;
}

/** Folha salarial de uma rodada: soma dos salários de todo o elenco. */
export function payroll(club: Club, players: Record<string, Player>): number {
  let total = 0;
  for (const id of club.squad) {
    const p = players[id];
    if (!p) throw new FinanceError('UNKNOWN_PLAYER', `jogador do elenco de ${club.id} não encontrado: ${id}`);
    total += p.salary;
  }
  return total;
}

export function ticketRevenue(club: Club, attendance: number, cfg: FinanceConfig = DEFAULT_FINANCE): number {
  return attendance * divisionFinance(club, cfg).ticketPrice;
}

export function stadiumUpkeep(club: Club, cfg: FinanceConfig = DEFAULT_FINANCE): number {
  return club.stadium.capacity * cfg.upkeepPerSeatPerRound;
}

export function computeClubEntry(
  club: Club,
  players: Record<string, Player>,
  match: { matchId: string; home: boolean; attendance: number },
  cfg: FinanceConfig = DEFAULT_FINANCE,
): ClubFinanceEntry {
  const attendance = match.home ? match.attendance : 0;
  const ticket = match.home ? ticketRevenue(club, attendance, cfg) : 0;
  const tv = divisionFinance(club, cfg).tvRightsPerRound;
  const salaries = payroll(club, players);
  const upkeep = stadiumUpkeep(club, cfg);
  const revenue = ticket + tv;
  const expenses = salaries + upkeep;
  return {
    clubId: club.id,
    matchId: match.matchId,
    home: match.home,
    attendance,
    ticketRevenue: ticket,
    tvRevenue: tv,
    revenue,
    salaries,
    upkeep,
    expenses,
    net: revenue - expenses,
  };
}

/** Devolve o clube com o saldo atualizado; não altera o original. */
export function applyEntry(club: Club, entry: ClubFinanceEntry): Club {
  if (entry.clubId !== club.id) throw new FinanceError('WRONG_CLUB', `lançamento de ${entry.clubId} aplicado em ${club.id}`);
  return { ...club, money: club.money + entry.net };
}

/**
 * Fecha as finanças de uma rodada: cada clube que jogou recebe e paga o que lhe cabe.
 * Aplique UMA vez por rodada: aplicar de novo a mesma rodada cobraria tudo em dobro (quem controla isso é a camada de sessão).
 * Devolve novos clubes (os de fora da rodada seguem iguais) e o extrato, na ordem das partidas (mandante, visitante).
 */
export function settleRound(
  clubs: Record<string, Club>,
  players: Record<string, Player>,
  results: readonly MatchResult[],
  cfg: FinanceConfig = DEFAULT_FINANCE,
): { clubs: Record<string, Club>; ledger: ClubFinanceEntry[] } {
  const ledger: ClubFinanceEntry[] = [];
  const seen = new Set<string>();
  const next = { ...clubs };
  for (const r of results) {
    for (const [clubId, home] of [[r.homeClubId, true], [r.awayClubId, false]] as const) {
      const club = clubs[clubId];
      if (!club) throw new FinanceError('UNKNOWN_CLUB', `clube inexistente: ${clubId}`);
      if (seen.has(clubId)) throw new FinanceError('CLUB_TWICE_IN_ROUND', `${clubId} aparece duas vezes na mesma rodada`);
      seen.add(clubId);
      const entry = computeClubEntry(club, players, { matchId: r.matchId, home, attendance: r.attendance }, cfg);
      ledger.push(entry);
      next[clubId] = applyEntry(club, entry);
    }
  }
  return { clubs: next, ledger };
}

export interface ClubFinanceTotals {
  clubId: string;
  rounds: number;
  ticketRevenue: number;
  tvRevenue: number;
  revenue: number;
  salaries: number;
  upkeep: number;
  expenses: number;
  net: number;
}

/** Soma um extrato (várias rodadas) por clube. */
export function totalsByClub(ledger: readonly ClubFinanceEntry[]): Record<string, ClubFinanceTotals> {
  const out: Record<string, ClubFinanceTotals> = {};
  for (const e of ledger) {
    const t = (out[e.clubId] ??= {
      clubId: e.clubId, rounds: 0, ticketRevenue: 0, tvRevenue: 0, revenue: 0, salaries: 0, upkeep: 0, expenses: 0, net: 0,
    });
    t.rounds += 1;
    t.ticketRevenue += e.ticketRevenue;
    t.tvRevenue += e.tvRevenue;
    t.revenue += e.revenue;
    t.salaries += e.salaries;
    t.upkeep += e.upkeep;
    t.expenses += e.expenses;
    t.net += e.net;
  }
  return out;
}
