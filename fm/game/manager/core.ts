import type { CareerState } from '../career.ts';
import { objectiveFor } from './board.ts';
import { initialCoaches, initialReferees } from './people.ts';
import { sponsorOffers } from './finance.ts';
import type { ManagerState } from './state.ts';

// Criação e migração do estado de gestão. Um save antigo (sem CareerState.manager) recebe os padrões aqui:
// é a única "migração" desta versão, e ela é compatível (a chave e a versão do save não mudam).

const levelOf = (c: CareerState, id: string) => c.world.divisions.find((d) => d.id === c.world.clubs[id].divisionId)?.level ?? 4;

export function createManager(c: CareerState): ManagerState {
  return {
    v: 1,
    stats: { season: {}, career: {} },
    coaches: initialCoaches(c.seed, c.world, c.userClubId, c.season),
    referees: initialReferees(c.seed),
    refereeStats: {},
    morale: 65,
    reputation: 10,
    news: [],
    newsSeq: 0,
    market: { wishlist: [], negotiations: [], auctions: [], loans: [], freeAgents: [], seq: 0 },
    contracts: {},
    finance: { sponsor: null, sponsorOffers: c.userClubId ? sponsorOffers(c.seed, c.season, c.userClubId, levelOf(c, c.userClubId), c.world.clubs[c.userClubId].reputation) : [], loans: [], ledger: [], seq: 0 },
    stadium: { levels: {}, works: [] },
    jobs: { offers: [], seq: 0, national: 'NONE' },
    objective: c.userClubId ? objectiveFor(c, c.userClubId) : null,
    clubsCoached: c.userClubId ? [[c.userClubId, c.season]] : [],
  };
}

/** Garante o estado de gestão (carreira nova ou save antigo). Não altera o resto da carreira. */
export function ensureManager(c: CareerState): CareerState & { manager: ManagerState } {
  if (c.manager && c.manager.v === 1) return c as CareerState & { manager: ManagerState };
  return { ...c, manager: createManager(c) };
}

export function mgr(c: CareerState): ManagerState {
  if (!c.manager) throw new Error('estado de gestão ausente: chame ensureManager');
  return c.manager;
}

/** Atualiza o estado de gestão de forma imutável. */
export function withManager(c: CareerState, fn: (m: ManagerState) => ManagerState): CareerState {
  return { ...c, manager: fn(mgr(c)) };
}
