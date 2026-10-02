import { createRng, deriveSeed, type MatchResult, type MatchState } from '../../engine/index.ts';
import {
  CareerError,
  divisionStandings,
  finishRound,
  hasClub,
  isSeasonOver,
  planRound,
  startNextSeason,
  type CareerState,
  type RoundOutcome,
  type RoundPlan,
} from '../career.ts';
import { FIRING_MORALE, moraleAfterRound, moraleAfterSeason, objectiveFor, recentForm, clamp } from './board.ts';
import { ensureManager, mgr } from './core.ts';
import { goalMet, line, payInstallment, prizeMoney, sponsorInstallment, sponsorOffers } from './finance.ts';
import { addMoney, auctionBids, movePlayer, windowOpen } from './market.ts';
import { draft, publish, roundNews, type Draft } from './news.ts';
import { coachName, refereeFor } from './people.ts';
import { applyWork, attendanceFor, homeExtras, upgradeInfo, youthBonus } from './stadium.ts';
import { addLines, addReferee, matchStatLines, refereeLine } from './stats.ts';
import { absRound, ROUNDS, type ExtraLine, type JobOffer, type ManagerState, type Referee } from './state.ts';
import { agePlayers, cpuCoachChanges, cpuRenewals, cpuTransfers, youthIntake, CPU_MIN_SQUAD } from './world.ts';
import { MIN_SQUAD } from './market.ts';

// Fluxo da carreira com a camada de gestão. Envolve planRound / finishRound / startNextSeason sem mudar nenhuma regra
// de partida: o engine recebe os mesmos elencos e as mesmas seeds; só o PÚBLICO de cada jogo é calculado aqui
// (o engine apenas o guarda; ele não entra em nenhuma chance) e vira bilheteria no fechamento da rodada.

export interface ManagedPlan extends RoundPlan {
  referees: Record<string, Referee>;
}

const levelOf = (c: CareerState, clubId: string) => c.world.divisions.find((d) => d.id === c.world.clubs[clubId].divisionId)?.level ?? 4;

/** Público previsto de cada jogo da rodada. */
export function roundAttendance(c: CareerState, m: ManagerState, home: string, away: string): number {
  const club = c.world.clubs[home];
  const opp = c.world.clubs[away];
  const form = recentForm(c.results, home, 5);
  const pts = form.reduce((s, x) => s + (x === 'V' ? 3 : x === 'E' ? 1 : 0), 0);
  let percentile: number | null = null;
  if (c.results.length > 0) {
    const table = divisionStandings(c, club.divisionId);
    percentile = (table.findIndex((r) => r.clubId === home) + 1) / table.length;
  }
  return attendanceFor({
    capacity: club.stadium.capacity,
    reputation: club.reputation,
    divisionLevel: levelOf(c, home),
    formRatio: form.length ? pts / (form.length * 3) : null,
    tablePercentile: percentile,
    opponentReputation: opp.reputation,
    rivalry: club.city === opp.city,
    levels: home === c.userClubId ? m.stadium.levels : {},
  });
}

export function planManagedRound(career: CareerState): ManagedPlan {
  const c = ensureManager(career);
  const m = c.manager;
  const plan = planRound(c);
  const fixtures = plan.fixtures.map((f) => ({ ...f, attendance: roundAttendance(c, m, f.home.club.id, f.away.club.id) }));
  const referees: Record<string, Referee> = {};
  for (const f of fixtures) referees[f.matchId] = refereeFor(m.referees, c.seed, f.matchId);
  return { ...plan, fixtures, referees };
}

export interface ManagedOutcome extends RoundOutcome {
  /** linhas extras do extrato nesta rodada (obras, patrocínio, parcelas, vendas...) */
  extras: ExtraLine[];
  fired: boolean;
  news: number;
}

/** Fecha a rodada (finishRound) e aplica a gestão: estatísticas, árbitros, dinheiro extra, obras, leilões, moral, notícias. */
export function finishManagedRound(career: CareerState, results: readonly MatchResult[], matches: readonly MatchState[]): ManagedOutcome {
  const before = ensureManager(career);
  const season = before.season;
  const round = before.roundNumber;
  const abs = absRound(season, round);
  const out = finishRound(before, results);
  let c: CareerState = out.career;
  let m: ManagerState = mgr(c);
  const drafts: Draft[] = [];
  const extras: ExtraLine[] = [];
  const userId = c.userClubId;

  // estatísticas de jogadores e de árbitros (eventos reais)
  let lines = {};
  for (const match of matches) lines = addLines(lines, matchStatLines(match));
  const refStats = { ...m.refereeStats };
  for (const match of matches) {
    const ref = refereeFor(m.referees, c.seed, match.matchId);
    refStats[ref.id] = addReferee(refStats[ref.id], refereeLine(match));
  }
  m = { ...m, stats: { season: addLines(m.stats.season, lines), career: addLines(m.stats.career, lines) }, refereeStats: refStats };

  // dinheiro extra do clube do treinador
  if (userId) {
    const add = (label: string, amount: number) => {
      if (amount === 0) return;
      extras.push(line(season, round, label, amount));
    };
    const home = matches.find((x) => x.home.clubId === userId);
    if (home) add('Estádio: receitas extras (loja, alimentação, estacionamento, VIP)', homeExtras(m.stadium.levels, home.attendance));
    if (m.finance.sponsor && m.finance.sponsor.season === season) {
      const amount = sponsorInstallment(m.finance.sponsor.amount, round, ROUNDS);
      add(`Patrocínio ${m.finance.sponsor.name}`, amount);
      m = { ...m, finance: { ...m.finance, sponsor: { ...m.finance.sponsor, paid: m.finance.sponsor.paid + amount } } };
    }
    const loans = [];
    for (const l of m.finance.loans) {
      const { loan, paid } = payInstallment(l);
      add('Parcela de empréstimo bancário', -paid);
      if (loan.remaining > 0) loans.push(loan);
      else drafts.push(draft('NOTICIA', 'Clube quita um empréstimo bancário', { clubId: userId, mine: true }));
    }
    m = { ...m, finance: { ...m.finance, loans } };
  }

  // obras concluídas
  if (userId) {
    const done = m.stadium.works.filter((w) => w.doneAtRound <= abs);
    if (done.length) {
      let world = c.world;
      const levels = { ...m.stadium.levels };
      for (const w of done) {
        levels[w.upgrade] = w.level;
        world = { ...world, clubs: { ...world.clubs, [userId]: applyWork(world.clubs[userId], w.upgrade) } };
        drafts.push(draft('NOTICIA', `Obra concluída: ${upgradeInfo(w.upgrade).label} (nível ${w.level})`, { clubId: userId, mine: true }));
      }
      c = { ...c, world };
      m = { ...m, stadium: { levels, works: m.stadium.works.filter((w) => w.doneAtRound > abs) } };
    }
  }

  // leilões que fecham nesta rodada
  ({ c, m } = closeAuctions(c, m, abs, round, drafts, extras));

  // negociações abertas caem quando a janela fecha
  if (!windowOpen(c.roundNumber, isSeasonOver(c))) {
    const open = m.market.negotiations.filter((n) => n.status === 'OPEN' || n.status === 'COUNTER');
    if (open.length) {
      m = { ...m, market: { ...m.market, negotiations: m.market.negotiations.map((n) => (n.status === 'OPEN' || n.status === 'COUNTER' ? { ...n, status: 'CANCELLED' as const, message: 'A janela fechou.' } : n)) } };
      drafts.push(draft('NOTICIA', 'Janela de transferências fechada: negociações em aberto foram encerradas', { clubId: userId, mine: true }));
    }
  }

  // aplica o dinheiro extra
  const extraTotal = extras.reduce((s, e) => s + e.amount, 0);
  if (userId && extraTotal !== 0) c = { ...c, world: addMoney(c.world, userId, extraTotal) };
  m = { ...m, finance: { ...m.finance, ledger: [...m.finance.ledger, ...extras] } };

  // notícias da rodada
  const top = [...c.world.divisions].sort((a, b) => a.level - b.level)[0]?.id ?? null;
  drafts.unshift(...roundNews(c.world, matches, userId, top));

  // moral do treinador
  let fired = false;
  if (userId) {
    const letter = recentForm(c.results, userId, 1)[0];
    const table = divisionStandings(c, c.world.clubs[userId].divisionId);
    const pos = table.findIndex((r) => r.clubId === userId) + 1;
    const target = m.objective?.target ?? 20;
    const before = m.morale;
    let morale = letter ? moraleAfterRound(m.morale, letter, round, pos, target) : m.morale;
    const last4 = recentForm(c.results, userId, 4).filter((x) => x === 'D').length;
    if (last4 >= 3 && before >= 35 && morale < 35) drafts.push(draft('OPINIAO', 'Pressão aumenta: diretoria cobra reação depois de três derrotas', { clubId: userId, mine: true }));
    if (!out.seasonEnded && round >= 10 && morale < FIRING_MORALE) {
      ({ c, m } = fire(c, { ...m, morale }, round, drafts));
      fired = true;
      morale = mgr(c).morale;
    }
    if (!fired) m = { ...m, morale };
  }

  // técnicos da CPU
  const cpu = cpuCoachChanges(c, m.coaches, round);
  m = { ...m, coaches: cpu.coaches };
  for (const ch of cpu.changes) {
    drafts.push(draft('URGENTE', `${c.world.clubs[ch.clubId].name} demite ${ch.out}; ${ch.in} é o novo técnico`, { clubId: ch.clubId }));
  }

  // propostas de emprego (treinador sem clube) e validade das abertas
  m = expireOffers(m, abs);
  if (!c.userClubId && !out.seasonEnded) ({ m } = organicOffers(c, m, round, cpu.changes.map((x) => x.clubId), drafts));

  // análise a cada 5 rodadas: líderes das divisões
  if (round % 5 === 0 && !out.seasonEnded) {
    for (const d of [...c.world.divisions].sort((a, b) => a.level - b.level).slice(0, 2)) {
      const lead = divisionStandings(c, d.id)[0];
      if (lead) drafts.push(draft('ANALISE', `${d.name}: ${lead.clubName} lidera com ${lead.points} pontos após ${round} rodadas`, { clubId: lead.clubId, mine: lead.clubId === userId }));
    }
  }

  if (out.seasonEnded && !fired) {
    // premiação e bônus entram no caixa dentro de closeManagedSeason; aqui só vão para o extrato
    const n0 = extras.length;
    ({ c, m } = closeManagedSeason(c, m, drafts, extras));
    m = { ...m, finance: { ...m.finance, ledger: [...m.finance.ledger, ...extras.slice(n0)] } };
    if (c.userClubId && m.morale < 20) {
      ({ c, m } = fire(c, m, ROUNDS, drafts));
      fired = true;
    }
  }

  const newsBefore = m.newsSeq;
  m = publish(m, season, round, drafts);
  c = { ...c, manager: m };
  return { ...out, career: c, extras, fired, news: m.newsSeq - newsBefore };
}

function fire(c: CareerState, m: ManagerState, round: number, drafts: Draft[]): { c: CareerState; m: ManagerState } {
  const clubId = c.userClubId as string;
  const name = c.world.clubs[clubId].name;
  drafts.push(draft('URGENTE', `${c.coach.name} é demitido do ${name}`, { body: 'A diretoria perdeu a confiança depois da sequência de maus resultados.', clubId, mine: true }));
  const coaches = { ...m.coaches, [clubId]: { name: coachName(c.seed, `${clubId}:${c.season}:${round}:sucessor`), since: absRound(c.season, round) } };
  const next: ManagerState = {
    ...m,
    coaches,
    morale: 50,
    reputation: clamp(m.reputation - 5),
    objective: null,
    finance: { ...m.finance, sponsor: null, sponsorOffers: [], loans: [] },
    stadium: { levels: {}, works: [] },
    market: { ...m.market, negotiations: [], auctions: m.market.auctions.map((a) => (a.status === 'OPEN' ? { ...a, status: 'WITHDRAWN' as const } : a)) },
    contracts: {},
  };
  return { c: { ...c, userClubId: null, userLineup: null, manager: next }, m: next };
}

function closeAuctions(c: CareerState, m: ManagerState, abs: number, round: number, drafts: Draft[], extras: ExtraLine[]): { c: CareerState; m: ManagerState } {
  const auctions = [];
  let world = c.world;
  for (const a of m.market.auctions) {
    if (a.status !== 'OPEN' || a.closesRound > abs) {
      auctions.push(a);
      continue;
    }
    const p = world.players[a.playerId];
    if (!p || p.clubId !== c.userClubId) {
      auctions.push({ ...a, status: 'WITHDRAWN' as const });
      continue;
    }
    const bids = auctionBids(world, c.seed, a, round);
    if (bids.length === 0) {
      auctions.push({ ...a, bids, status: 'NO_BIDS' as const });
      drafts.push(draft('NOTICIA', `Leilão de ${p.name} termina sem lances`, { clubId: c.userClubId, playerId: p.id, mine: true }));
      continue;
    }
    const win = bids[0];
    world = movePlayer(world, p.id, win.clubId, { contract: { endSeason: Math.max(p.contract.endSeason, c.season + 1) } });
    world = addMoney(world, win.clubId, -win.amount);
    extras.push(line(c.season, round, `Venda de ${p.name} (leilão) para ${world.clubs[win.clubId].name}`, win.amount));
    auctions.push({ ...a, bids, status: 'SOLD' as const, winner: win });
    drafts.push(draft('NOTICIA', `${p.name} é vendido em leilão para o ${world.clubs[win.clubId].name}`, { body: `${bids.length} lance(s). Valor final: R$ ${win.amount.toLocaleString('pt-BR')}.`, clubId: c.userClubId, playerId: p.id, mine: true }));
  }
  return { c: { ...c, world }, m: { ...m, market: { ...m.market, auctions } } };
}

function expireOffers(m: ManagerState, abs: number): ManagerState {
  const offers = m.jobs.offers.map((o) => (o.status === 'OPEN' && o.expiresRound < abs ? { ...o, status: 'EXPIRED' as const } : o));
  return { ...m, jobs: { ...m.jobs, offers } };
}

/** Nível de divisão mais alto que aceita o treinador, pela reputação dele. */
export function reachLevel(reputation: number): number {
  return reputation >= 70 ? 1 : reputation >= 45 ? 2 : reputation >= 25 ? 3 : 4;
}

export function addJobOffer(c: CareerState, m: ManagerState, clubId: string, round: number, reason: string, drafts: Draft[]): ManagerState {
  if (m.jobs.offers.some((o) => o.clubId === clubId && o.status === 'OPEN')) return m;
  const seq = m.jobs.seq + 1;
  const offer: JobOffer = { id: `job${seq}`, clubId, season: c.season, round, expiresRound: absRound(c.season, round) + 3, reason, status: 'OPEN' };
  drafts.push(draft('URGENTE', `Proposta de trabalho: ${c.world.clubs[clubId].name} quer ${c.coach.name}`, { body: reason, clubId, mine: true }));
  return { ...m, jobs: { ...m.jobs, seq, offers: [...m.jobs.offers, offer] } };
}

/** Treinador sem clube: clubes que acabaram de demitir chamam primeiro; fora isso, de vez em quando surge uma proposta. */
function organicOffers(c: CareerState, m: ManagerState, round: number, firedClubs: string[], drafts: Draft[]): { m: ManagerState } {
  const reach = reachLevel(m.reputation);
  const open = m.jobs.offers.filter((o) => o.status === 'OPEN').length;
  if (open >= 3) return { m };
  for (const id of firedClubs) {
    if (levelOf(c, id) >= reach) m = addJobOffer(c, m, id, round, 'O clube acabou de trocar de técnico e procura um nome para a sequência da temporada.', drafts);
  }
  const rng = createRng(deriveSeed(c.seed, `emprego:${c.season}:${round}`));
  if (m.jobs.offers.filter((o) => o.status === 'OPEN').length === 0 || rng.next() < 0.3) {
    const pool = c.world.divisions.filter((d) => d.level >= reach).flatMap((d) => divisionStandings(c, d.id).slice(-8).map((r) => r.clubId)).sort();
    const options = pool.filter((id) => !m.jobs.offers.some((o) => o.clubId === id && o.status === 'OPEN'));
    if (options.length) m = addJobOffer(c, m, options[rng.int(0, options.length - 1)], round, 'A diretoria quer mudar o rumo da temporada e gostou do seu perfil.', drafts);
  }
  return { m };
}

function closeManagedSeason(c: CareerState, m: ManagerState, drafts: Draft[], extras: ExtraLine[]): { c: CareerState; m: ManagerState } {
  const report = c.history[c.history.length - 1];
  const round = ROUNDS;
  // premiação para todos os clubes
  let world = c.world;
  for (const d of world.divisions) {
    divisionStandings(c, d.id).forEach((row, i) => {
      const prize = prizeMoney(d.level, i + 1, d.clubIds.length);
      world = addMoney(world, row.clubId, prize);
      if (row.clubId === c.userClubId) extras.push(line(c.season, round, `Premiação: ${i + 1}º lugar`, prize));
    });
  }
  for (const [divId, clubId] of Object.entries(report.champions)) {
    const d = world.divisions.find((x) => x.id === divId);
    drafts.push(draft('NOTICIA', `${world.clubs[clubId].name} é campeão da ${d?.name ?? divId}`, { clubId, mine: clubId === c.userClubId }));
  }
  if (c.userClubId) {
    const mv = report.userMovement;
    const champion = Object.values(report.champions).includes(c.userClubId);
    const sp = m.finance.sponsor;
    if (sp && sp.season === c.season && sp.bonus > 0 && goalMet(sp.goal, report.userPosition, mv?.kind === 'PROMOTED')) {
      world = addMoney(world, c.userClubId, sp.bonus);
      extras.push(line(c.season, round, `Bônus de meta do patrocínio ${sp.name}`, sp.bonus));
      drafts.push(draft('NOTICIA', `Meta cumprida: ${sp.name} paga bônus ao clube`, { clubId: c.userClubId, mine: true }));
    }
    const target = m.objective?.target ?? 20;
    const morale = moraleAfterSeason(m.morale, report.userPosition, target, mv?.kind ?? null, champion);
    let reputation = m.reputation + (report.userPosition <= target ? 4 : -2) + (mv?.kind === 'PROMOTED' ? 8 : mv?.kind === 'RELEGATED' ? -6 : 0) + (champion ? 6 : 0);
    reputation = clamp(reputation);
    m = { ...m, morale, reputation };
    if (mv?.kind === 'PROMOTED') drafts.push(draft('URGENTE', `ACESSO! ${world.clubs[c.userClubId].name} sobe de divisão`, { clubId: c.userClubId, mine: true }));
    if (mv?.kind === 'RELEGATED') drafts.push(draft('URGENTE', `${world.clubs[c.userClubId].name} é rebaixado`, { clubId: c.userClubId, mine: true }));
    if (morale >= 70) {
      const reach = reachLevel(reputation);
      const myLevel = levelOf({ ...c, world }, c.userClubId);
      const rng = createRng(deriveSeed(c.seed, `propostas-fim:${c.season}`));
      const upLevel = Math.max(reach, myLevel - 1);
      const pool = world.divisions.filter((d) => d.level === upLevel && d.level < myLevel).flatMap((d) => d.clubIds).filter((id) => id !== c.userClubId).sort();
      if (pool.length) m = addJobOffer({ ...c, world }, m, pool[rng.int(0, pool.length - 1)], round, 'O seu trabalho chamou atenção: o clube quer você para a próxima temporada.', drafts);
    }
    if (m.jobs.national === 'NONE' && reputation >= 60) {
      m = { ...m, jobs: { ...m.jobs, national: 'INVITED' } };
      drafts.push(draft('URGENTE', `${c.coach.name} é convidado para comandar a seleção`, { body: 'Convite honorário: o cargo acumula com o clube. Veja em CARREIRA.', mine: true }));
    }
  }
  return { c: { ...c, world }, m };
}

// ---------- virada de temporada ----------

export interface SeasonTurnover {
  career: CareerState;
  left: string[]; // jogadores do treinador que saíram livres
  retired: number;
  cpuMoves: number;
}

export function startManagedSeason(career: CareerState): SeasonTurnover {
  const c0 = ensureManager(career);
  let m = c0.manager;
  const newSeason = c0.season + 1;
  const drafts: Draft[] = [];
  let world = c0.world;
  const userId = c0.userClubId;

  // empréstimos voltam
  for (const l of m.market.loans) {
    if (l.untilSeason > c0.season) continue;
    const p = world.players[l.playerId];
    if (!p) continue;
    world = movePlayer(world, l.playerId, l.fromClubId);
  }
  m = { ...m, market: { ...m.market, loans: m.market.loans.filter((l) => l.untilSeason > c0.season) } };

  // contratos do treinador que venceram e não foram renovados: jogador sai livre (se o elenco aguentar; senão a base repõe)
  const left: string[] = [];
  if (userId) {
    for (const id of [...world.clubs[userId].squad]) {
      const p = world.players[id];
      if (p.contract.endSeason < newSeason) {
        world = movePlayer(world, id, null);
        left.push(id);
        drafts.push(draft('NOTICIA', `${p.name} deixa o clube ao fim do contrato`, { clubId: userId, playerId: id, mine: true }));
      }
    }
  }
  world = cpuRenewals(world, newSeason, (id) => id === userId);
  // livres veteranos se aposentam
  const players = { ...world.players };
  for (const p of Object.values(world.players)) if (p.clubId === null && p.age >= 34) delete players[p.id];
  world = { ...world, players };

  // acesso/rebaixamento e calendário novo
  let c = startNextSeason({ ...c0, world });
  world = c.world;
  const aged = agePlayers(world, c.seed, newSeason, (p) => (p.clubId === userId && p.age < 23 ? youthBonus(m.stadium.levels) : 0));
  world = aged.world;
  const moves = cpuTransfers(world, c.seed, newSeason, userId);
  world = moves.world;
  for (const mv of moves.moves.filter((x) => x.fee > 0).slice(0, 6)) {
    const p = world.players[mv.playerId];
    drafts.push(draft('NOTICIA', `${world.clubs[mv.to].name} contrata ${p.name}${mv.from ? ` (ex-${world.clubs[mv.from].name})` : ''}`, { clubId: mv.to, playerId: p.id }));
  }
  world = youthIntake(world, c.seed, newSeason, (id) => (id === userId ? MIN_SQUAD + 2 : CPU_MIN_SQUAD)).world;

  c = { ...c, world, userLineup: c.userLineup && left.length === 0 ? c.userLineup : null };
  const level = userId ? levelOf(c, userId) : 4;
  m = {
    ...m,
    stats: { season: {}, career: m.stats.career },
    refereeStats: {},
    contracts: {},
    market: { ...m.market, negotiations: [], auctions: m.market.auctions.filter((a) => a.status === 'OPEN') },
    finance: {
      ...m.finance,
      sponsor: null,
      sponsorOffers: userId ? sponsorOffers(c.seed, newSeason, userId, level, c.world.clubs[userId].reputation) : [],
      ledger: m.finance.ledger.filter((e) => e.season >= newSeason - 1),
    },
    objective: userId ? objectiveFor(c, userId) : null,
  };
  // leilões abertos na intertemporada fecham agora
  const extras: ExtraLine[] = [];
  const closed = closeAuctions(c, m, absRound(newSeason, 1), 0, drafts, extras);
  c = closed.c;
  m = closed.m;
  if (userId && extras.length) {
    c = { ...c, world: addMoney(c.world, userId, extras.reduce((s, e) => s + e.amount, 0)) };
    m = { ...m, finance: { ...m.finance, ledger: [...m.finance.ledger, ...extras.map((e) => ({ ...e, season: newSeason }))] } };
  }
  drafts.push(draft('NOTICIA', `Começa a temporada ${newSeason}`, { body: m.objective ? `Objetivo da diretoria: ${m.objective.label}.` : null, mine: true }));
  m = publish(m, newSeason, 0, drafts);
  return { career: { ...c, manager: m }, left, retired: aged.retired.length, cpuMoves: moves.moves.length };
}

export function requireManagedClub(c: CareerState): asserts c is CareerState & { userClubId: string } {
  if (!hasClub(c)) throw new CareerError('NO_CLUB', 'o treinador está sem clube');
}
