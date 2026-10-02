import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRound, roundResults, simulateRound } from '../../engine/index.ts';
import { careerOffers, createCareer, deserializeCareer, finishRound, isSeasonOver, planRound, serializeCareer, type CareerState } from '../career.ts';
import {
  acceptCounter,
  acceptJob,
  makeOffer,
  newManagedCareer,
  openAuction,
  proposeRenewal,
  signFreeAgent,
  startRenewal,
  startWork,
  takeBankLoan,
  chooseSponsor,
  toggleWish,
  requestLoan,
  financeView,
} from '../manager/actions.ts';
import { moodOf, moraleAfterRound, objectiveFor } from '../manager/board.ts';
import { openTalk, proposeRenewal as talk } from '../manager/contracts.ts';
import { ensureManager } from '../manager/core.ts';
import { creditLimit, financeStatus, prizeMoney, quoteLoan, sponsorInstallment } from '../manager/finance.ts';
import { finishManagedRound, planManagedRound, startManagedSeason } from '../manager/flow.ts';
import { askingPrice, evaluateOffer, searchPlayers, windowOpen } from '../manager/market.ts';
import { personalityOf, refereeFor, roundDate, clubColors, flagOf } from '../manager/people.ts';
import { attendanceFor, canStartWork } from '../manager/stadium.ts';
import { refereeProfile } from '../manager/stats.ts';

// Camada de gestão: determinismo, regras fixas de negociação, finanças, estádio, fluxo da rodada e da temporada.

const SEED = 'gestao-teste';
const offers = careerOffers(SEED);
const fresh = () => newManagedCareer(SEED, 'Ana Souza', offers[0]);

function managedRound(c: CareerState) {
  const plan = planManagedRound(c);
  const round = simulateRound(createRound(plan.roundId, plan.seed, plan.fixtures, null));
  return finishManagedRound(c, roundResults(round), round.matches);
}

test('mesma seed = mesmo estado de gestão (árbitros, técnicos, patrocínios, objetivo)', () => {
  const a = fresh();
  const b = fresh();
  assert.deepStrictEqual(a.manager, b.manager);
  assert.equal(a.manager!.referees.length, 24);
  assert.equal(new Set(a.manager!.referees.map((r) => r.name)).size, 24);
  assert.equal(a.manager!.finance.sponsorOffers.length, 3);
  assert.ok(a.manager!.objective);
  assert.equal(a.manager!.coaches[offers[0]], undefined, 'o clube do treinador não tem técnico da CPU');
});

test('save antigo (sem manager) recebe os padrões e continua igual no resto', () => {
  const old = createCareer({ seed: SEED, coachName: 'Ana', clubId: offers[0] });
  const restored = deserializeCareer(serializeCareer(old));
  assert.equal(restored.manager, undefined);
  const m = ensureManager(restored);
  assert.ok(m.manager);
  assert.deepStrictEqual({ ...m, manager: undefined }, { ...restored, manager: undefined });
});

test('público dinâmico não muda placares: a rodada gerenciada tem os mesmos resultados da rodada original', () => {
  const c = fresh();
  const base = planRound(c);
  const managed = planManagedRound(c);
  const a = roundResults(simulateRound(createRound(base.roundId, base.seed, base.fixtures, null)));
  const b = roundResults(simulateRound(createRound(managed.roundId, managed.seed, managed.fixtures, null)));
  assert.deepStrictEqual(a.map((r) => [r.matchId, r.homeGoals, r.awayGoals]), b.map((r) => [r.matchId, r.homeGoals, r.awayGoals]));
  for (const f of managed.fixtures) assert.ok(f.attendance <= f.home.club.stadium.capacity && f.attendance > 0);
});

test('temporada inteira gerenciada: mesmos placares da carreira sem gestão, estatísticas e notícias reais', () => {
  let plain: CareerState = createCareer({ seed: SEED, coachName: 'Ana', clubId: offers[0] });
  let c: CareerState = fresh();
  const scores: string[] = [];
  const scoresPlain: string[] = [];
  for (let r = 1; r <= 38; r++) {
    const out = managedRound(c);
    c = out.career;
    scores.push(c.results.slice(-80).map((x) => `${x.homeGoals}-${x.awayGoals}`).join(','));
    const plan = planRound(plain);
    plain = finishRound(plain, roundResults(simulateRound(createRound(plan.roundId, plan.seed, plan.fixtures, null)))).career;
    scoresPlain.push(plain.results.slice(-80).map((x) => `${x.homeGoals}-${x.awayGoals}`).join(','));
  }
  assert.deepStrictEqual(scores, scoresPlain);
  assert.ok(isSeasonOver(c));
  const m = c.manager!;
  const lines = Object.values(m.stats.season);
  const goals = lines.reduce((s, l) => s + l.goals, 0);
  const total = c.results.reduce((s, r) => s + r.homeGoals + r.awayGoals, 0);
  assert.equal(goals, total, 'gols nas estatísticas = gols nos placares');
  assert.ok(m.news.length > 38);
  assert.ok(m.news.some((n) => n.mine && /Vitória|Empate|Derrota/.test(n.title)));
  const refMatches = Object.values(m.refereeStats).reduce((s, x) => s + x.matches, 0);
  assert.equal(refMatches, 38 * 40);
  assert.ok(m.finance.ledger.some((l) => l.label.startsWith('Premiação')));
  // virada
  const turn = startManagedSeason(c);
  const n = turn.career;
  assert.equal(n.season, c.season + 1);
  assert.deepStrictEqual(n.manager!.stats.season, {});
  for (const club of Object.values(n.world.clubs)) {
    assert.ok(club.squad.length >= 16, `${club.id} ficou com ${club.squad.length}`);
    assert.ok(club.squad.filter((id) => n.world.players[id].position === 'GK').length >= 2, `${club.id} sem goleiros`);
    for (const id of club.squad) assert.equal(n.world.players[id].clubId, club.id);
  }
  assert.deepStrictEqual(startManagedSeason(c).career, n, 'virada determinística');
  // a 2ª temporada roda
  const r1 = managedRound(n);
  assert.equal(r1.career.roundNumber, 2);
});

test('treinador sem clube: o mundo roda e chegam propostas; aceitar troca o clube', () => {
  let c: CareerState = newManagedCareer(SEED, 'Sem Clube', null);
  for (let r = 1; r <= 3; r++) c = managedRound(c).career;
  const open = c.manager!.jobs.offers.filter((o) => o.status === 'OPEN');
  assert.ok(open.length >= 1, 'chegou ao menos uma proposta');
  const res = acceptJob(c, open[0].id);
  assert.equal(res.career.userClubId, open[0].clubId);
  assert.ok(res.career.manager!.objective);
  const next = managedRound(res.career);
  assert.equal(next.career.userClubId, open[0].clubId);
});

test('negociação: aceita, contraproposta e recusa seguem regra fixa', () => {
  assert.equal(evaluateOffer(100_000, 100_000, 0).kind, 'ACCEPTED');
  const counter = evaluateOffer(100_000, 80_000, 0);
  assert.equal(counter.kind, 'COUNTER');
  if (counter.kind === 'COUNTER') assert.ok(counter.counter > 80_000 && counter.counter <= 100_000);
  assert.equal(evaluateOffer(100_000, 40_000, 0).kind, 'REFUSED');
  const last = evaluateOffer(100_000, 90_000, 2);
  assert.ok(last.kind === 'REFUSED' && last.final);
});

test('compra pela tela: contraproposta aceita move o jogador e o dinheiro', () => {
  let c = fresh();
  const me = c.userClubId!;
  c = { ...c, world: { ...c.world, clubs: { ...c.world.clubs, [me]: { ...c.world.clubs[me], money: 50_000_000 } } } };
  const rows = searchPlayers(c.world, c.seed, me, [], { divisionLevel: 4 }, 200);
  let done = false;
  for (const row of rows) {
    const asking = askingPrice(c.world, c.seed, row.player.id, c.world.clubs[me]);
    let r;
    try {
      r = makeOffer(c, row.player.id, Math.round(asking * 0.8));
    } catch {
      continue; // jogador recusa (personalidade) ou elenco vendedor curto
    }
    const neg = r.career.manager!.market.negotiations.find((n) => n.playerId === row.player.id)!;
    assert.equal(neg.status, 'COUNTER');
    const moneyBefore = r.career.world.clubs[me].money;
    const sellerBefore = r.career.world.clubs[row.club!.id].money;
    const ok = acceptCounter(r.career, neg.id).career;
    assert.equal(ok.world.players[row.player.id].clubId, me);
    assert.ok(ok.world.clubs[me].squad.includes(row.player.id));
    assert.ok(!ok.world.clubs[row.club!.id].squad.includes(row.player.id));
    assert.equal(ok.world.clubs[me].money, moneyBefore - neg.counter!);
    assert.equal(ok.world.clubs[row.club!.id].money, sellerBefore + neg.counter!);
    done = true;
    break;
  }
  assert.ok(done);
});

test('janela: aberta nas rodadas 1–6 e 19–24 e na intertemporada', () => {
  assert.ok(windowOpen(1, false) && windowOpen(6, false) && !windowOpen(7, false) && windowOpen(19, false) && !windowOpen(25, false) && windowOpen(39, true));
});

test('leilão: fecha depois da rodada com lance vencedor ou sem lances, sempre igual', () => {
  let c = fresh();
  const me = c.userClubId!;
  const squad = [...c.world.clubs[me].squad].sort((a, b) => c.world.players[b].strength - c.world.players[a].strength);
  const id = squad.find((p) => c.world.players[p].position !== 'GK')!;
  const p = c.world.players[id];
  c = openAuction(c, id, Math.round(p.marketValue * 0.5)).career;
  const a = managedRound(c).career;
  const b = managedRound(c).career;
  assert.deepStrictEqual(a.manager!.market.auctions, b.manager!.market.auctions);
  const auction = a.manager!.market.auctions[0];
  assert.ok(auction.status === 'SOLD' || auction.status === 'NO_BIDS');
  if (auction.status === 'SOLD') assert.equal(a.world.players[id].clubId, auction.winner!.clubId);
});

test('contratos: renovação por personalidade, contraproposta e quebra após 3 recusas', () => {
  const c = fresh();
  const id = c.world.clubs[c.userClubId!].squad[0];
  const p = c.world.players[id];
  const t = openTalk(c.seed, p);
  assert.ok(t.askSalary >= p.salary && t.minSalary <= t.askSalary);
  const ok = talk(c.seed, p, t, t.askSalary, t.askYears);
  assert.ok(ok.agreed);
  let x = t;
  for (let i = 0; i < 3; i++) x = talk(c.seed, p, x, 1, t.askYears).talk;
  assert.equal(x.status, 'BROKEN');
  const started = startRenewal(c, id).career;
  const agreed = proposeRenewal(started, id, t.askSalary, t.askYears).career;
  assert.equal(agreed.world.players[id].salary, t.askSalary);
  assert.equal(agreed.world.players[id].contract.endSeason, Math.max(p.contract.endSeason, c.season + t.askYears));
});

test('finanças: status, limite, juros, parcelas e premiação', () => {
  assert.equal(financeStatus(-1, 1000, 0), 'CRITICO');
  assert.equal(financeStatus(1_000_000, 10_000, 0), 'SAUDAVEL');
  assert.equal(creditLimit(4, 20, 0, -5), 0);
  const q = quoteLoan(100_000, 10, 500_000, 'SAUDAVEL');
  assert.ok(q.ok && q.loan.total === 106_000 && q.loan.installment === 10_600);
  assert.equal(quoteLoan(100_000, 10, 500_000, 'CRITICO').ok, false);
  assert.equal(Array.from({ length: 38 }, (_, i) => sponsorInstallment(1_000_001, i + 1, 38)).reduce((a, b) => a + b, 0), 1_000_001);
  assert.ok(prizeMoney(1, 1) > prizeMoney(1, 20) && prizeMoney(1, 20) > 0);
  let c = fresh();
  const v = financeView(c);
  c = takeBankLoan(c, 50_000, 10).career;
  assert.equal(c.world.clubs[c.userClubId!].money, v.money + 50_000);
  assert.equal(c.manager!.finance.loans.length, 1);
  c = chooseSponsor(c, c.manager!.finance.sponsorOffers[0].id).career;
  const after = managedRound(c).career;
  assert.equal(after.manager!.finance.loans[0].remaining, c.manager!.finance.loans[0].remaining - c.manager!.finance.loans[0].installment);
  assert.ok(after.manager!.finance.ledger.some((l) => l.label.startsWith('Patrocínio')));
});

test('estádio: obra custa, leva tempo e entrega o benefício', () => {
  let c = fresh();
  const me = c.userClubId!;
  c = { ...c, world: { ...c.world, clubs: { ...c.world.clubs, [me]: { ...c.world.clubs[me], money: 5_000_000 } } } };
  const cap = c.world.clubs[me].stadium.capacity;
  c = startWork(c, 'ARQUIBANCADA').career;
  assert.equal(c.world.clubs[me].money, 5_000_000 - 450_000);
  for (let i = 0; i < 5; i++) c = managedRound(c).career;
  assert.equal(c.world.clubs[me].stadium.capacity, cap);
  c = managedRound(c).career;
  assert.equal(c.world.clubs[me].stadium.capacity, cap + 1500);
  assert.equal(c.manager!.stadium.levels.ARQUIBANCADA, 1);
  assert.equal(canStartWork({ GRAMADO: 3 }, [], 'GRAMADO', 1e9).ok, false);
});

test('público: rivalidade e boa fase enchem mais; nunca passa da capacidade', () => {
  const base = { capacity: 10_000, reputation: 30, divisionLevel: 4, formRatio: 0.5, tablePercentile: 0.5, opponentReputation: 30, rivalry: false, levels: {} };
  assert.ok(attendanceFor({ ...base, rivalry: true }) > attendanceFor(base));
  assert.ok(attendanceFor({ ...base, formRatio: 1 }) > attendanceFor({ ...base, formRatio: 0 }));
  assert.ok(attendanceFor({ ...base, reputation: 100, rivalry: true, formRatio: 1, tablePercentile: 0.05, levels: { CONFORTO: 2 } }) <= 10_000);
});

test('moral, objetivo, árbitro, data, cores e bandeira', () => {
  assert.equal(moraleAfterRound(50, 'V', 1, 10, 10), 53);
  assert.equal(moraleAfterRound(50, 'D', 8, 20, 10), 45);
  assert.equal(moodOf(70), 'GOOD');
  assert.equal(moodOf(40), 'WARN');
  assert.equal(moodOf(10), 'BAD');
  const c = fresh();
  assert.ok(objectiveFor(c, c.userClubId!).target >= 1);
  const ref = refereeFor(c.manager!.referees, c.seed, 'T2026-D1-R01-P01');
  assert.deepStrictEqual(refereeFor(c.manager!.referees, c.seed, 'T2026-D1-R01-P01'), ref);
  assert.match(refereeProfile(undefined, []).label, /Poucos jogos/);
  assert.equal(roundDate(2026, 1).label.startsWith('dom'), true);
  assert.equal(roundDate(2026, 5).label.startsWith('qua'), true);
  assert.equal(roundDate(2026, 6).label.startsWith('dom'), true);
  assert.equal(clubColors({ primaryColor: '#000000', secondaryColor: '#ffffff' }).accent.toLowerCase(), '#ffffff');
  assert.equal(flagOf('Brasil'), '🇧🇷');
  assert.ok(['LEAL', 'AMBICIOSO', 'FINANCEIRO', 'COMPETITIVO', 'JOVEM', 'VETERANO'].includes(personalityOf(SEED, { id: 'x', age: 25 })));
});

test('lista de desejos, livre e empréstimo', () => {
  let c = fresh();
  const other = Object.values(c.world.players).find((p) => p.clubId && p.clubId !== c.userClubId)!;
  c = toggleWish(c, other.id).career;
  assert.deepStrictEqual(c.manager!.market.wishlist, [other.id]);
  c = toggleWish(c, other.id).career;
  assert.deepStrictEqual(c.manager!.market.wishlist, []);
  // livre: solta um jogador da CPU para testar
  const me = c.userClubId!;
  const free = { ...other, clubId: null };
  const from = c.world.clubs[other.clubId!];
  c = { ...c, world: { ...c.world, players: { ...c.world.players, [other.id]: free }, clubs: { ...c.world.clubs, [from.id]: { ...from, squad: from.squad.filter((x) => x !== other.id) }, [me]: { ...c.world.clubs[me], money: 10_000_000 } } } };
  try {
    const s = signFreeAgent(c, other.id).career;
    assert.equal(s.world.players[other.id].clubId, me);
  } catch (e) {
    assert.match(String(e), /ambicioso|competitivo|leal/i);
  }
  // empréstimo: um reserva de um clube de elenco grande
  const cand = Object.values(c.world.clubs).filter((x) => x.id !== me && x.squad.length >= 20).flatMap((x) => [...x.squad].sort((a, b) => c.world.players[a].strength - c.world.players[b].strength).slice(0, 2));
  let loaned = false;
  for (const id of cand) {
    try {
      const r = requestLoan(c, id).career;
      assert.equal(r.world.players[id].clubId, me);
      assert.equal(r.manager!.market.loans.length, 1);
      loaned = true;
      break;
    } catch {
      continue;
    }
  }
  assert.ok(loaned);
});

test('leilões simultâneos não levam o elenco abaixo do mínimo (o 2º conta o 1º como vendido)', () => {
  let c = fresh();
  const me = c.userClubId!;
  const club = c.world.clubs[me];
  const gks = club.squad.filter((id) => c.world.players[id].position === 'GK');
  const field = club.squad.filter((id) => c.world.players[id].position !== 'GK');
  // elenco com 17: um leilão passa (16), o segundo não
  const keep = [...gks, ...field].slice(0, 17);
  c = { ...c, world: { ...c.world, clubs: { ...c.world.clubs, [me]: { ...club, squad: keep } } } };
  const [a, b] = keep.filter((id) => c.world.players[id].position !== 'GK');
  c = openAuction(c, a, c.world.players[a].marketValue).career;
  assert.throws(() => openAuction(c, b, c.world.players[b].marketValue), /menos de 16/);
});
