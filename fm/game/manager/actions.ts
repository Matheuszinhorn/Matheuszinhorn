import { CareerError, createCareer, isSeasonOver, type CareerState } from '../career.ts';
import { objectiveFor } from './board.ts';
import { ensureManager } from './core.ts';
import { openTalk, proposeRenewal as talkPropose } from './contracts.ts';
import { creditLimit, debtOf, financeStatus, line, quoteLoan, sponsorOffers } from './finance.ts';
import {
  addMoney,
  askingPrice,
  contractYears,
  evaluateOffer,
  loanDestination,
  loanFee,
  loanable,
  minAuctionPrice,
  movePlayer,
  newNegotiation,
  playerAccepts,
  salaryDemand,
  squadCheckIn,
  squadCheckOut,
  windowOpen,
} from './market.ts';
import { draft, publish, type Draft } from './news.ts';
import { coachName } from './people.ts';
import { canStartWork, upgradeInfo } from './stadium.ts';
import { absRound, type ExtraLine, type ManagerState, type Negotiation, type UpgradeId } from './state.ts';
import { payroll } from '../../engine/index.ts';

// Ações do treinador fora da partida. Cada uma devolve uma carreira NOVA (ou lança CareerError com o motivo, em
// português, pronto para a tela). Nenhuma mexe em partida em andamento: a interface só as oferece fora da rodada.

export interface ActionResult {
  career: CareerState;
  message: string;
  kind: 'good' | 'info' | 'error';
}

type Managed = CareerState & { manager: ManagerState; userClubId: string };

function managed(c: CareerState): Managed {
  const x = ensureManager(c);
  if (x.userClubId === null) throw new CareerError('NO_CLUB', 'Você está sem clube.');
  return x as Managed;
}

const fail = (message: string): never => {
  throw new CareerError('ACTION', message);
};

/** Rodada "agora" para extrato e notícias: a próxima a jogar (ou a 38ª, na intertemporada). */
const nowRound = (c: CareerState) => Math.min(c.roundNumber, 38);

function commit(c: Managed, m: ManagerState, drafts: Draft[], extras: ExtraLine[] = [], money = 0): CareerState {
  const ledger = extras.length ? [...m.finance.ledger, ...extras] : m.finance.ledger;
  const withNews = publish({ ...m, finance: { ...m.finance, ledger } }, c.season, nowRound(c), drafts);
  const world = money !== 0 ? addMoney(c.world, c.userClubId, money) : c.world;
  return { ...c, world, manager: withNews };
}

function requireWindow(c: CareerState): void {
  if (!windowOpen(c.roundNumber, isSeasonOver(c))) fail('A janela de transferências está fechada.');
}

// ---------- lista de desejos ----------

export function toggleWish(career: CareerState, playerId: string): ActionResult {
  const c = ensureManager(career);
  const m = c.manager;
  const has = m.market.wishlist.includes(playerId);
  const wishlist = has ? m.market.wishlist.filter((x) => x !== playerId) : [...m.market.wishlist, playerId];
  return { career: { ...c, manager: { ...m, market: { ...m.market, wishlist } } }, message: has ? 'Removido da lista de desejos.' : 'Adicionado à lista de desejos.', kind: 'info' };
}

// ---------- compra ----------

function executeTransfer(c: Managed, m: ManagerState, playerId: string, price: number, drafts: Draft[], extras: ExtraLine[]): CareerState {
  const p = c.world.players[playerId];
  const sellerId = p.clubId as string;
  const seller = c.world.clubs[sellerId];
  let world = movePlayer(c.world, playerId, c.userClubId, { salary: salaryDemand(c.seed, p), contract: { endSeason: c.season + contractYears(c.seed, p) } });
  world = addMoney(world, sellerId, price);
  extras.push(line(c.season, nowRound(c), `Compra de ${p.name} (${seller.name})`, -price));
  drafts.push(draft('NOTICIA', `${c.world.clubs[c.userClubId].name} contrata ${p.name}, ex-${seller.name}`, { body: `Valor: R$ ${price.toLocaleString('pt-BR')}.`, clubId: c.userClubId, playerId, mine: true }));
  const wishlist = m.market.wishlist.filter((x) => x !== playerId);
  return commit({ ...c, world }, { ...m, market: { ...m.market, wishlist } }, drafts, extras, -price);
}

function preTransferChecks(c: Managed, playerId: string, price: number): void {
  const p = c.world.players[playerId];
  if (!p) fail('Jogador não encontrado.');
  if (p.clubId === c.userClubId) fail('Esse jogador já é do seu clube.');
  if (!p.clubId) fail('Jogador livre: use CONTRATAR LIVRE.');
  if (c.manager.market.loans.some((l) => l.playerId === playerId)) fail('Jogador emprestado: não pode ser negociado agora.');
  const me = c.world.clubs[c.userClubId];
  const inErr = squadCheckIn(me);
  if (inErr) fail(inErr);
  const outErr = squadCheckOut(c.world, c.world.clubs[p.clubId as string], playerId);
  if (outErr) fail(`O clube vendedor não pode liberar: ${outErr.toLowerCase()}`);
  if (me.money < price) fail('Caixa insuficiente para essa proposta.');
  const accept = playerAccepts(c.world, c.seed, p, me);
  if (!accept.ok) fail(accept.reason);
}

export function makeOffer(career: CareerState, playerId: string, amount: number): ActionResult {
  const c = managed(career);
  requireWindow(c);
  const offer = Math.round(amount);
  if (!Number.isFinite(offer) || offer <= 0) fail('Valor inválido.');
  preTransferChecks(c, playerId, offer);
  const m = c.manager;
  const p = c.world.players[playerId];
  const existing = m.market.negotiations.find((n) => n.playerId === playerId && (n.status === 'OPEN' || n.status === 'COUNTER'));
  const seq = m.market.seq + 1;
  const neg: Negotiation = existing ?? newNegotiation(`neg${seq}`, 'TRANSFER', p, offer, c.season, nowRound(c));
  const asking = askingPrice(c.world, c.seed, playerId, c.world.clubs[c.userClubId]);
  const verdict = evaluateOffer(asking, offer, neg.attempts);
  const drafts: Draft[] = [];
  let next: Negotiation = { ...neg, offer, attempts: neg.attempts + 1, message: verdict.message };
  if (verdict.kind === 'ACCEPTED') {
    next = { ...next, status: 'DONE', counter: null };
    const mm = { ...m, market: { ...m.market, seq, negotiations: upsert(m.market.negotiations, next) } };
    return { career: executeTransfer(c, mm, playerId, offer, drafts, []), message: `Negócio fechado: ${p.name} é do seu clube.`, kind: 'good' };
  }
  if (verdict.kind === 'COUNTER') next = { ...next, status: 'COUNTER', counter: verdict.counter };
  else next = { ...next, status: verdict.final ? 'REFUSED' : 'OPEN', counter: null };
  if (!existing) drafts.push(draft('RUMOR', `${c.world.clubs[c.userClubId].name} faz proposta por ${p.name}`, { clubId: p.clubId, playerId, mine: true }));
  const mm = { ...m, market: { ...m.market, seq, negotiations: upsert(m.market.negotiations, next) } };
  return { career: commit(c, mm, drafts), message: verdict.kind === 'COUNTER' ? `${verdict.message} R$ ${verdict.counter.toLocaleString('pt-BR')}.` : verdict.message, kind: verdict.kind === 'COUNTER' ? 'info' : 'error' };
}

function upsert(list: Negotiation[], n: Negotiation): Negotiation[] {
  return list.some((x) => x.id === n.id) ? list.map((x) => (x.id === n.id ? n : x)) : [...list, n];
}

export function acceptCounter(career: CareerState, negotiationId: string): ActionResult {
  const c = managed(career);
  requireWindow(c);
  const m = c.manager;
  const neg = m.market.negotiations.find((n) => n.id === negotiationId);
  if (!neg || neg.status !== 'COUNTER' || neg.counter === null) fail('Não há contraproposta para aceitar.');
  const n = neg as Negotiation & { counter: number };
  preTransferChecks(c, n.playerId, n.counter);
  const done: Negotiation = { ...n, offer: n.counter, status: 'DONE', message: 'Contraproposta aceita.' };
  const mm = { ...m, market: { ...m.market, negotiations: upsert(m.market.negotiations, done) } };
  return { career: executeTransfer(c, mm, n.playerId, n.counter, [], []), message: `Negócio fechado: ${c.world.players[n.playerId].name} é do seu clube.`, kind: 'good' };
}

export function cancelNegotiation(career: CareerState, negotiationId: string): ActionResult {
  const c = ensureManager(career);
  const m = c.manager;
  const negotiations = m.market.negotiations.map((n) => (n.id === negotiationId && (n.status === 'OPEN' || n.status === 'COUNTER') ? { ...n, status: 'CANCELLED' as const, message: 'Você desistiu da negociação.' } : n));
  return { career: { ...c, manager: { ...m, market: { ...m.market, negotiations } } }, message: 'Negociação encerrada.', kind: 'info' };
}

// ---------- livres e empréstimos ----------

export function signFreeAgent(career: CareerState, playerId: string): ActionResult {
  const c = managed(career);
  const p = c.world.players[playerId];
  if (!p || p.clubId !== null) fail('Esse jogador não está livre.');
  const inErr = squadCheckIn(c.world.clubs[c.userClubId]);
  if (inErr) fail(inErr);
  const accept = playerAccepts(c.world, c.seed, p, c.world.clubs[c.userClubId]);
  if (!accept.ok) fail(accept.reason);
  const salary = salaryDemand(c.seed, p);
  const world = movePlayer(c.world, playerId, c.userClubId, { salary, contract: { endSeason: c.season + contractYears(c.seed, p) } });
  const drafts = [draft('NOTICIA', `${p.name} assina com o ${c.world.clubs[c.userClubId].name} sem custo de transferência`, { clubId: c.userClubId, playerId, mine: true })];
  return { career: commit({ ...c, world }, c.manager, drafts), message: `${p.name} contratado (salário R$ ${salary.toLocaleString('pt-BR')} por rodada).`, kind: 'good' };
}

export function requestLoan(career: CareerState, playerId: string): ActionResult {
  const c = managed(career);
  requireWindow(c);
  const p = c.world.players[playerId];
  if (!p || !p.clubId || p.clubId === c.userClubId) fail('Jogador indisponível para empréstimo.');
  const ok = loanable(c.world, playerId);
  if (!ok.ok) fail(ok.reason);
  const inErr = squadCheckIn(c.world.clubs[c.userClubId]);
  if (inErr) fail(inErr);
  const fee = loanFee(p);
  if (c.world.clubs[c.userClubId].money < fee) fail('Caixa insuficiente para a taxa de empréstimo.');
  const from = p.clubId as string;
  let world = movePlayer(c.world, playerId, c.userClubId);
  world = addMoney(world, from, fee);
  const m = c.manager;
  const until = isSeasonOver(c) ? c.season + 1 : c.season;
  const mm = { ...m, market: { ...m.market, loans: [...m.market.loans, { playerId, fromClubId: from, toClubId: c.userClubId, untilSeason: until, fee }] } };
  const drafts = [draft('NOTICIA', `${p.name} chega por empréstimo do ${c.world.clubs[from].name}`, { body: `Até o fim da temporada ${until}. Taxa: R$ ${fee.toLocaleString('pt-BR')}.`, clubId: c.userClubId, playerId, mine: true })];
  return { career: commit({ ...c, world }, mm, drafts, [line(c.season, nowRound(c), `Empréstimo de ${p.name}`, -fee)], -fee), message: `${p.name} chegou por empréstimo.`, kind: 'good' };
}

export function loanOut(career: CareerState, playerId: string): ActionResult {
  const c = managed(career);
  requireWindow(c);
  const me = c.world.clubs[c.userClubId];
  const p = c.world.players[playerId];
  if (!p || p.clubId !== c.userClubId) fail('Jogador não é do seu elenco.');
  if (c.manager.market.loans.some((l) => l.playerId === playerId)) fail('Jogador emprestado ao seu clube não pode ser repassado.');
  if (c.manager.market.auctions.some((a) => a.playerId === playerId && a.status === 'OPEN')) fail('Esse jogador está em leilão.');
  const outErr = squadCheckOut(c.world, withoutAuctioned(c, c.manager), playerId);
  if (outErr) fail(outErr);
  const dest = loanDestination(c.world, c.seed, me, playerId);
  if (!dest) fail('Nenhum clube interessado no empréstimo agora.');
  const to = dest as NonNullable<typeof dest>;
  const world = movePlayer(c.world, playerId, to.id);
  const m = c.manager;
  const until = isSeasonOver(c) ? c.season + 1 : c.season;
  const mm = { ...m, market: { ...m.market, loans: [...m.market.loans, { playerId, fromClubId: c.userClubId, toClubId: to.id, untilSeason: until, fee: 0 }] } };
  const drafts = [draft('NOTICIA', `${p.name} é emprestado ao ${to.name}`, { body: `Volta ao fim da temporada ${until}. O clube que recebe paga o salário.`, clubId: c.userClubId, playerId, mine: true })];
  return { career: commit({ ...c, world }, mm, drafts), message: `${p.name} emprestado ao ${to.name}.`, kind: 'good' };
}

/** Elenco do treinador sem os jogadores já em leilão aberto (as regras de elenco mínimo valem para o pior caso). */
function withoutAuctioned(c: Managed, m: ManagerState) {
  const club = c.world.clubs[c.userClubId];
  const out = new Set(m.market.auctions.filter((a) => a.status === 'OPEN').map((a) => a.playerId));
  return { ...club, squad: club.squad.filter((id) => !out.has(id)) };
}

// ---------- venda por leilão ----------

export function openAuction(career: CareerState, playerId: string, startPrice: number): ActionResult {
  const c = managed(career);
  requireWindow(c);
  const p = c.world.players[playerId];
  if (!p || p.clubId !== c.userClubId) fail('Jogador não é do seu elenco.');
  const m = c.manager;
  if (m.market.loans.some((l) => l.playerId === playerId)) fail('Jogador emprestado não pode ir a leilão.');
  if (m.market.auctions.some((a) => a.playerId === playerId && a.status === 'OPEN')) fail('Esse jogador já está em leilão.');
  const outErr = squadCheckOut(c.world, withoutAuctioned(c, m), playerId);
  if (outErr) fail(outErr);
  const min = minAuctionPrice(p);
  const price = Math.round(startPrice);
  if (!(price >= min)) fail(`O lance mínimo precisa ser de pelo menos R$ ${min.toLocaleString('pt-BR')}.`);
  const seq = m.market.seq + 1;
  const abs = absRound(c.season, isSeasonOver(c) ? 39 : c.roundNumber);
  const auction = { id: `lei${seq}`, playerId, startPrice: price, bids: [], openedRound: abs, closesRound: abs, status: 'OPEN' as const, winner: null };
  const mm = { ...m, market: { ...m.market, seq, auctions: [...m.market.auctions, auction] } };
  const drafts = [draft('RUMOR', `${p.name} está à venda: clubes avaliam lances`, { clubId: c.userClubId, playerId, mine: true })];
  return { career: commit(c, mm, drafts), message: `${p.name} foi a leilão. O resultado sai ${isSeasonOver(c) ? 'na virada da temporada' : 'depois da próxima rodada'}.`, kind: 'good' };
}

export function withdrawAuction(career: CareerState, auctionId: string): ActionResult {
  const c = ensureManager(career);
  const m = c.manager;
  const auctions = m.market.auctions.map((a) => (a.id === auctionId && a.status === 'OPEN' ? { ...a, status: 'WITHDRAWN' as const } : a));
  return { career: { ...c, manager: { ...m, market: { ...m.market, auctions } } }, message: 'Leilão cancelado.', kind: 'info' };
}

// ---------- contratos ----------

export function startRenewal(career: CareerState, playerId: string): ActionResult {
  const c = managed(career);
  const p = c.world.players[playerId];
  if (!p || p.clubId !== c.userClubId) fail('Jogador não é do seu elenco.');
  if (c.manager.market.loans.some((l) => l.playerId === playerId)) fail('Jogador emprestado: o contrato é com o clube dono.');
  const existing = c.manager.contracts[playerId];
  if (existing && existing.status !== 'AGREED') return { career: c, message: existing.message, kind: 'info' };
  const talk = openTalk(c.seed, p);
  const m = c.manager;
  return { career: { ...c, manager: { ...m, contracts: { ...m.contracts, [playerId]: talk } } }, message: talk.message, kind: 'info' };
}

export function proposeRenewal(career: CareerState, playerId: string, salary: number, years: number): ActionResult {
  const c = managed(career);
  const p = c.world.players[playerId];
  const talk = c.manager.contracts[playerId];
  if (!p || p.clubId !== c.userClubId || !talk) fail('Abra a negociação primeiro.');
  if (!(years >= 1 && years <= 5)) fail('O contrato vai de 1 a 5 temporadas.');
  const res = talkPropose(c.seed, p, talk, Math.round(salary), Math.round(years));
  const m = c.manager;
  let world = c.world;
  const drafts: Draft[] = [];
  if (res.agreed) {
    // N temporadas a partir de agora: na temporada S (ou na intertemporada depois dela), o contrato vai até S + N
    const endSeason = Math.max(p.contract.endSeason, c.season + res.agreed.years);
    world = { ...world, players: { ...world.players, [playerId]: { ...p, salary: res.agreed.salary, contract: { endSeason } } } };
    drafts.push(draft('NOTICIA', `${p.name} renova contrato`, { body: `Até ${world.players[playerId].contract.endSeason}, com salário de R$ ${res.agreed.salary.toLocaleString('pt-BR')} por rodada.`, clubId: c.userClubId, playerId, mine: true }));
  } else if (res.talk.status === 'BROKEN') {
    drafts.push(draft('RUMOR', `${p.name} não renova e deve deixar o clube`, { clubId: c.userClubId, playerId, mine: true }));
  }
  const mm = { ...m, contracts: { ...m.contracts, [playerId]: res.talk } };
  return { career: commit({ ...c, world }, mm, drafts), message: res.talk.message, kind: res.agreed ? 'good' : res.talk.status === 'BROKEN' ? 'error' : 'info' };
}

// ---------- estádio ----------

export function startWork(career: CareerState, id: UpgradeId): ActionResult {
  const c = managed(career);
  const m = c.manager;
  const check = canStartWork(m.stadium.levels, m.stadium.works, id, c.world.clubs[c.userClubId].money);
  if (!check.ok) fail(check.reason);
  const ok = check as Extract<typeof check, { ok: true }>;
  const base = isSeasonOver(c) ? absRound(c.season + 1, 0) : absRound(c.season, c.roundNumber - 1);
  const work = { upgrade: id, level: ok.level, cost: ok.cost, doneAtRound: base + ok.rounds };
  const mm = { ...m, stadium: { ...m.stadium, works: [...m.stadium.works, work] } };
  const u = upgradeInfo(id);
  const drafts = [draft('NOTICIA', `Começa a obra: ${u.label} (nível ${ok.level})`, { body: `Prazo: ${ok.rounds} rodadas. Custo: R$ ${ok.cost.toLocaleString('pt-BR')}.`, clubId: c.userClubId, mine: true })];
  return { career: commit(c, mm, drafts, [line(c.season, nowRound(c), `Obra: ${u.label} (nível ${ok.level})`, -ok.cost)], -ok.cost), message: `Obra iniciada: fica pronta em ${ok.rounds} rodadas.`, kind: 'good' };
}

// ---------- finanças ----------

export function financeView(career: CareerState) {
  const c = managed(career);
  const club = c.world.clubs[c.userClubId];
  const debt = debtOf(c.manager.finance.loans);
  const pay = payroll(club, c.world.players);
  const status = financeStatus(club.money, pay, debt);
  const level = c.world.divisions.find((d) => d.id === club.divisionId)?.level ?? 4;
  return { money: club.money, payroll: pay, debt, status, limit: creditLimit(level, club.reputation, debt, club.money) };
}

export function takeBankLoan(career: CareerState, amount: number, rounds: number): ActionResult {
  const c = managed(career);
  const v = financeView(c);
  const q = quoteLoan(Math.round(amount), rounds, v.limit, v.status);
  if (!q.ok) fail(q.reason);
  const ok = q as Extract<typeof q, { ok: true }>;
  const m = c.manager;
  const seq = m.finance.seq + 1;
  const loan = { ...ok.loan, id: `emp${seq}`, takenSeason: c.season, takenRound: nowRound(c) };
  const mm = { ...m, finance: { ...m.finance, seq, loans: [...m.finance.loans, loan] } };
  const drafts = [draft('ANALISE', `Clube toma empréstimo bancário de R$ ${loan.principal.toLocaleString('pt-BR')}`, { body: `${loan.rounds} parcelas de R$ ${loan.installment.toLocaleString('pt-BR')}.`, clubId: c.userClubId, mine: true })];
  return { career: commit(c, mm, drafts, [line(c.season, nowRound(c), 'Empréstimo bancário recebido', loan.principal)], loan.principal), message: 'Empréstimo aprovado.', kind: 'good' };
}

export function payOffBankLoan(career: CareerState, loanId: string): ActionResult {
  const c = managed(career);
  const m = c.manager;
  const loan = m.finance.loans.find((l) => l.id === loanId);
  if (!loan) fail('Empréstimo não encontrado.');
  const l = loan as NonNullable<typeof loan>;
  if (c.world.clubs[c.userClubId].money < l.remaining) fail('Caixa insuficiente para quitar.');
  const mm = { ...m, finance: { ...m.finance, loans: m.finance.loans.filter((x) => x.id !== loanId) } };
  return { career: commit(c, mm, [], [line(c.season, nowRound(c), 'Quitação de empréstimo bancário', -l.remaining)], -l.remaining), message: 'Empréstimo quitado.', kind: 'good' };
}

export function chooseSponsor(career: CareerState, offerId: string): ActionResult {
  const c = managed(career);
  const m = c.manager;
  if (m.finance.sponsor && m.finance.sponsor.season >= c.season && !isSeasonOver(c)) fail('O clube já tem patrocinador nesta temporada.');
  const offer = m.finance.sponsorOffers.find((o) => o.id === offerId);
  if (!offer) fail('Proposta de patrocínio não encontrada.');
  const o = offer as NonNullable<typeof offer>;
  const season = isSeasonOver(c) ? c.season + 1 : c.season;
  const mm = { ...m, finance: { ...m.finance, sponsor: { ...o, season, paid: 0 }, sponsorOffers: [] } };
  const drafts = [draft('NOTICIA', `${o.name} é o novo patrocinador do ${c.world.clubs[c.userClubId].name}`, { clubId: c.userClubId, mine: true })];
  return { career: commit(c, mm, drafts), message: `Contrato com ${o.name} assinado.`, kind: 'good' };
}

// ---------- emprego ----------

/** Aceita uma proposta de trabalho: o treinador troca de clube (só fora da rodada). */
export function acceptJob(career: CareerState, offerId: string): ActionResult {
  const c = ensureManager(career);
  const m = c.manager;
  const offer = m.jobs.offers.find((o) => o.id === offerId && o.status === 'OPEN');
  if (!offer) fail('Proposta não está mais disponível.');
  const o = offer as NonNullable<typeof offer>;
  const coaches = { ...m.coaches };
  const prev = c.userClubId;
  if (prev) coaches[prev] = { name: coachName(c.seed, `${prev}:${c.season}:${c.roundNumber}:saida`), since: absRound(c.season, c.roundNumber) };
  delete coaches[o.clubId];
  const next: CareerState = { ...c, userClubId: o.clubId, userLineup: null, userLedger: [] };
  const club = c.world.clubs[o.clubId];
  const level = c.world.divisions.find((d) => d.id === club.divisionId)?.level ?? 4;
  const season = isSeasonOver(c) ? c.season + 1 : c.season;
  const mm: ManagerState = {
    ...m,
    coaches,
    morale: 65,
    objective: objectiveFor(next, o.clubId),
    jobs: { ...m.jobs, offers: m.jobs.offers.map((x) => (x.id === offerId ? { ...x, status: 'ACCEPTED' as const } : x.status === 'OPEN' ? { ...x, status: 'REFUSED' as const } : x)) },
    finance: { sponsor: null, sponsorOffers: sponsorOffers(c.seed, season, o.clubId, level, club.reputation), loans: [], ledger: m.finance.ledger, seq: m.finance.seq },
    stadium: { levels: {}, works: [] },
    market: { ...m.market, negotiations: [], auctions: m.market.auctions.map((a) => (a.status === 'OPEN' ? { ...a, status: 'WITHDRAWN' as const } : a)) },
    contracts: {},
    clubsCoached: [...m.clubsCoached, [o.clubId, c.season]],
  };
  const drafts = [draft('URGENTE', `${c.coach.name} é o novo técnico do ${club.name}`, { body: mm.objective ? `Objetivo: ${mm.objective.label}.` : null, clubId: o.clubId, mine: true })];
  return { career: { ...next, manager: publish(mm, c.season, nowRound(c), drafts) }, message: `Bem-vindo ao ${club.name}!`, kind: 'good' };
}

export function refuseJob(career: CareerState, offerId: string): ActionResult {
  const c = ensureManager(career);
  const m = c.manager;
  const offers = m.jobs.offers.map((o) => (o.id === offerId && o.status === 'OPEN' ? { ...o, status: 'REFUSED' as const } : o));
  return { career: { ...c, manager: { ...m, jobs: { ...m.jobs, offers } } }, message: 'Proposta recusada.', kind: 'info' };
}

export function answerNational(career: CareerState, accept: boolean): ActionResult {
  const c = ensureManager(career);
  const m = c.manager;
  if (m.jobs.national !== 'INVITED') fail('Não há convite da seleção.');
  const mm = { ...m, jobs: { ...m.jobs, national: accept ? ('COACH' as const) : ('DECLINED' as const) }, reputation: accept ? Math.min(100, m.reputation + 3) : m.reputation };
  const drafts = accept ? [draft('URGENTE', `${c.coach.name} aceita comandar a seleção`, { mine: true })] : [];
  return { career: { ...c, manager: publish(mm, c.season, nowRound(c), drafts) }, message: accept ? 'Você agora também é o técnico da seleção.' : 'Convite recusado.', kind: accept ? 'good' : 'info' };
}

/** Carreira nova a partir das propostas iniciais: com clube (aceitou) ou sem (AGUARDAR PROPOSTAS). */
export function newManagedCareer(seed: string, coachName_: string, clubId: string | null): CareerState {
  return ensureManager(createCareer({ seed, coachName: coachName_, clubId }));
}

export function isLoanedIn(c: CareerState, playerId: string): boolean {
  return !!c.manager?.market.loans.some((l) => l.playerId === playerId && l.toClubId === c.userClubId);
}
