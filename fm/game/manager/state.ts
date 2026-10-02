// Camada de GESTÃO da carreira (fora da partida): estatísticas, contratos, mercado, finanças, estádio, notícias,
// moral, árbitros e técnicos da CPU. Tudo aqui é determinístico (seed + dados + decisões do jogador) e NUNCA muda
// regra de partida: o engine 0.2.0 só recebe os dados (elencos, público) já resolvidos.
// Persistência: o estado vive em CareerState.manager (campo opcional). Saves antigos não têm o campo e recebem os
// valores padrão em ensureManager (migração compatível, sem trocar a chave nem a versão do save).

export type Personality = 'LEAL' | 'AMBICIOSO' | 'FINANCEIRO' | 'COMPETITIVO' | 'JOVEM' | 'VETERANO';

export interface StatLine {
  apps: number; // partidas em que entrou em campo
  goals: number;
  yellows: number;
  reds: number;
  injuries: number;
}

export interface CpuCoach {
  name: string;
  /** rodada (absoluta: temporada*100 + rodada) em que assumiu */
  since: number;
}

export interface Referee {
  id: string;
  name: string;
}

export interface RefereeStats {
  matches: number;
  yellows: number;
  reds: number;
  penalties: number;
}

export type NewsKind = 'NOTICIA' | 'RUMOR' | 'OPINIAO' | 'URGENTE' | 'ANALISE';

export interface NewsItem {
  id: string;
  season: number;
  round: number;
  kind: NewsKind;
  title: string;
  body: string | null;
  clubId: string | null;
  playerId: string | null;
  /** notícia do clube do treinador */
  mine: boolean;
}

export type NegotiationKind = 'TRANSFER' | 'LOAN';
export type NegotiationStatus = 'OPEN' | 'COUNTER' | 'ACCEPTED' | 'REFUSED' | 'DONE' | 'CANCELLED';

export interface Negotiation {
  id: string;
  kind: NegotiationKind;
  playerId: string;
  sellerClubId: string;
  /** valor oferecido pelo treinador (última oferta) */
  offer: number;
  /** contraproposta do clube vendedor, se houver */
  counter: number | null;
  status: NegotiationStatus;
  attempts: number;
  message: string;
  season: number;
  round: number;
}

export interface Bid {
  clubId: string;
  amount: number;
  round: number;
}

export interface Auction {
  id: string;
  playerId: string;
  startPrice: number;
  bids: Bid[];
  openedRound: number; // absoluta
  closesRound: number; // absoluta: fecha quando esta rodada é aplicada
  status: 'OPEN' | 'SOLD' | 'NO_BIDS' | 'WITHDRAWN';
  winner: Bid | null;
}

export interface Loan {
  playerId: string;
  fromClubId: string;
  toClubId: string;
  untilSeason: number;
  fee: number;
}

export interface ContractTalk {
  playerId: string;
  askSalary: number;
  askYears: number;
  minSalary: number;
  attempts: number;
  status: 'OPEN' | 'AGREED' | 'BROKEN';
  message: string;
}

export interface SponsorOffer {
  id: string;
  name: string;
  amount: number; // por temporada
  goal: SponsorGoal;
  bonus: number; // pago no fim da temporada se a meta for cumprida
}

export type SponsorGoal = { kind: 'TOP'; position: number } | { kind: 'PROMOTION' } | { kind: 'NONE' };

export interface SponsorDeal extends SponsorOffer {
  season: number;
  paid: number;
}

export interface BankLoan {
  id: string;
  principal: number;
  total: number; // a devolver
  rounds: number; // parcelas (uma por rodada)
  installment: number;
  remaining: number; // ainda a pagar
  takenSeason: number;
  takenRound: number;
}

export type UpgradeId =
  | 'ARQUIBANCADA'
  | 'GRAMADO'
  | 'ILUMINACAO'
  | 'SEGURANCA'
  | 'ACESSOS'
  | 'ESTACIONAMENTO'
  | 'ALIMENTACAO'
  | 'LOJA'
  | 'VIP'
  | 'CONFORTO'
  | 'CT';

export interface StadiumWork {
  upgrade: UpgradeId;
  level: number; // nível que será alcançado
  cost: number;
  doneAtRound: number; // absoluta: fica pronta quando esta rodada é aplicada
}

export interface ExtraLine {
  season: number;
  round: number;
  label: string;
  amount: number; // + receita, − despesa
}

export interface JobOffer {
  id: string;
  clubId: string;
  season: number;
  round: number;
  expiresRound: number; // absoluta
  reason: string;
  status: 'OPEN' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED';
}

export interface ManagerState {
  v: 1;
  stats: { season: Record<string, StatLine>; career: Record<string, StatLine> };
  coaches: Record<string, CpuCoach>;
  referees: Referee[];
  refereeStats: Record<string, RefereeStats>;
  /** confiança da diretoria no treinador, 0–100 */
  morale: number;
  /** reputação do treinador, 0–100 (sobe com acessos, títulos e boas campanhas) */
  reputation: number;
  news: NewsItem[];
  newsSeq: number;
  market: { wishlist: string[]; negotiations: Negotiation[]; auctions: Auction[]; loans: Loan[]; freeAgents: string[]; seq: number };
  contracts: Record<string, ContractTalk>;
  finance: { sponsor: SponsorDeal | null; sponsorOffers: SponsorOffer[]; loans: BankLoan[]; ledger: ExtraLine[]; seq: number };
  stadium: { levels: Partial<Record<UpgradeId, number>>; works: StadiumWork[] };
  jobs: { offers: JobOffer[]; seq: number; national: NationalStatus };
  /** objetivo da diretoria para a temporada (definido quando o treinador assume ou a temporada começa) */
  objective: { target: number; label: string; kind: string } | null;
  /** clubes em que o treinador trabalhou: [clubId, temporada de chegada] */
  clubsCoached: [string, number][];
}

export type NationalStatus = 'NONE' | 'INVITED' | 'COACH' | 'DECLINED';

export const ROUNDS = 38;
/** Rodada absoluta: compara rodadas de temporadas diferentes. */
export const absRound = (season: number, round: number): number => season * 100 + round;

export const EMPTY_LINE: StatLine = { apps: 0, goals: 0, yellows: 0, reds: 0, injuries: 0 };
