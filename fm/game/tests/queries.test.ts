import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  applyRoundCommand,
  autoLineup,
  awaitingMatch,
  clockLabel,
  computeAttendance,
  computeStandings,
  createRound,
  doubleRoundRobin,
  isRoundFinished,
  overallStrength,
  prepareFixture,
  roundResults,
  simulateRound,
  stepRound,
  type Fixture,
  type RoundState,
  type ScheduledMatch,
} from '../../engine/index.ts';
import { D1, playerLikeCpu, WORLD } from '../../engine/tests/helpers.ts';
import {
  getClubView,
  getStandings,
  listClubs,
  QueryError,
  type ClubsContext,
  type PlayedMatch,
} from '../queries.ts';
import { createSession, type Scheduler } from '../session.ts';

// A área CLUBES é uma camada de LEITURA. Aqui se prova o que ela mostra (visão completa e coerente com o MatchState)
// e, principalmente, que ela não altera nada: contexto congelado, respostas desacopladas, jogo idêntico com e sem
// consultas, e nenhuma dependência de comandos.

const CONTROLLED = D1[0];

const SCHEDULE: Record<string, ScheduledMatch[][]> = Object.fromEntries(
  WORLD.divisions.map((d) => [d.id, doubleRoundRobin(d.clubIds, 'T1')]),
);

/** Rodada N das 4 divisões ao mesmo tempo. */
function fixturesFor(round: number): Fixture[] {
  return WORLD.divisions.flatMap((d) =>
    SCHEDULE[d.id][round - 1].map((m, k) =>
      prepareFixture(`T1-${d.id}-R${round}-P${k + 1}`, WORLD.clubs[m.home], WORLD.clubs[m.away], WORLD.players),
    ),
  );
}

function resolveAwaiting(round: RoundState): RoundState {
  const m = awaitingMatch(round);
  if (!m || !m.decision) return round;
  const r = applyRoundCommand(round, m.matchId, playerLikeCpu(m, m.decision));
  assert.ok(r.result.ok);
  return r.round;
}

/** Avança `ticks` minutos; o jogador aceita as sugestões quando o jogo pede. Termina sempre em RUNNING. */
function advance(round: RoundState, ticks: number): RoundState {
  let r = round;
  for (let i = 0; i < ticks; i++) {
    while (awaitingMatch(r)) r = resolveAwaiting(r);
    r = stepRound(r);
  }
  while (awaitingMatch(r)) r = resolveAwaiting(r);
  return r;
}

// Rodadas 1 e 2 concluídas (a classificação e os resultados recentes vêm delas); a rodada 3 está em andamento.
const RESULTS: PlayedMatch[] = [];
for (let r = 1; r <= 2; r++) {
  const done = simulateRound(createRound(`T1-R${r}`, 'seed-q', fixturesFor(r)));
  for (const res of roundResults(done)) {
    RESULTS.push({ round: r, homeClubId: res.homeClubId, awayClubId: res.awayClubId, homeGoals: res.homeGoals, awayGoals: res.awayGoals });
  }
}
const LIVE: RoundState = advance(createRound('T1-R3', 'seed-q', fixturesFor(3), CONTROLLED), 35);

const CTX: ClubsContext = {
  world: WORLD,
  controlledClubId: CONTROLLED,
  roundNumber: 3,
  round: LIVE,
  schedule: SCHEDULE,
  results: RESULTS,
};

const matchOf = (round: RoundState, clubId: string) =>
  round.matches.find((m) => m.home.clubId === clubId || m.away.clubId === clubId) as RoundState['matches'][number];

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value as object)) deepFreeze(v);
  }
  return value;
}

const PLAYER_KEYS = ['age', 'id', 'injuredRounds', 'marketValue', 'name', 'nationality', 'position', 'strength', 'suspendedRounds'];

// ---------- O que a consulta mostra ----------

test('clube controlado com a partida em andamento: visão completa e coerente com o MatchState', () => {
  const view = getClubView(CTX, CONTROLLED);
  const club = WORLD.clubs[CONTROLLED];
  const match = matchOf(LIVE, CONTROLLED);
  const team = match.home.clubId === CONTROLLED ? match.home : match.away;
  const home = match.home.clubId === CONTROLLED;

  // Identificação, divisão, estádio.
  assert.equal(view.id, CONTROLLED);
  assert.equal(view.name, club.name);
  assert.deepStrictEqual(view.division, { id: 'D1', name: WORLD.divisions[0].name, level: 1 });
  assert.equal(view.isControlled, true);
  assert.deepStrictEqual(view.stadium, club.stadium);
  assert.equal(view.reputation, club.reputation);

  // Elenco: todos os jogadores, só com campos públicos, ordenados por posição (GOL, DEF, MEI, ATA) e força.
  assert.equal(view.squad.length, club.squad.length);
  assert.deepStrictEqual([...new Set(view.squad.map((p) => p.id))].sort(), [...club.squad].sort());
  for (const p of view.squad) assert.deepStrictEqual(Object.keys(p).sort(), PLAYER_KEYS);
  const order = { GK: 0, DEF: 1, MID: 2, ATT: 3 };
  for (let i = 1; i < view.squad.length; i++) {
    const a = view.squad[i - 1];
    const b = view.squad[i];
    assert.ok(order[a.position] < order[b.position] || (a.position === b.position && a.strength >= b.strength));
  }

  // Escalação ao vivo: titulares, reservas, formação, estilo e comportamento vêm da partida.
  assert.ok(view.lineup);
  assert.equal(view.lineup.source, 'LIVE');
  assert.deepStrictEqual(view.lineup.starters.map((s) => s.id), team.onField.map((s) => s.playerId));
  assert.equal(view.lineup.starters.filter((s) => s.sector === 'GK').length, 1);
  const counts = { DEF: 0, MID: 0, ATT: 0 };
  for (const s of view.lineup.starters) if (s.sector !== 'GK') counts[s.sector] += 1;
  assert.deepStrictEqual(view.lineup.formation, counts);
  assert.equal(view.lineup.formationLabel, `${counts.DEF}-${counts.MID}-${counts.ATT}`);
  assert.equal(view.lineup.style, team.style);
  assert.equal(view.lineup.behavior, team.behavior);
  assert.deepStrictEqual(view.lineup.bench.map((p) => p.id).sort(), [...team.bench].sort());
  assert.equal(view.lineup.substitutionsUsed, team.subsUsed);
  assert.equal(view.lineup.strength, overallStrength(team.onField, team.players));

  // Partida em andamento.
  assert.ok(view.live);
  assert.equal(view.live.matchId, match.matchId);
  assert.equal(view.live.status, 'RUNNING');
  assert.equal(view.live.minute, clockLabel(match.clock));
  assert.equal(view.live.home, home);
  assert.equal(view.live.opponentId, home ? match.away.clubId : match.home.clubId);
  assert.deepStrictEqual(view.live.score, { for: home ? match.score.home : match.score.away, against: home ? match.score.away : match.score.home });
  assert.equal(view.live.attendance, match.attendance);

  // Força geral do melhor time disponível.
  assert.equal(view.strength, overallStrength(autoLineup(club, WORLD.players).starters, WORLD.players));

  // Resultados recentes (mais novo primeiro) das rodadas concluídas.
  assert.deepStrictEqual(view.form.map((r) => r.round), [2, 1]);
  for (const r of view.form) {
    const played = RESULTS.find((x) => x.round === r.round && (x.homeClubId === CONTROLLED || x.awayClubId === CONTROLLED)) as PlayedMatch;
    assert.equal(r.home, played.homeClubId === CONTROLLED);
    assert.equal(r.goalsFor, r.home ? played.homeGoals : played.awayGoals);
    assert.equal(r.goalsAgainst, r.home ? played.awayGoals : played.homeGoals);
    assert.equal(r.outcome, r.goalsFor > r.goalsAgainst ? 'W' : r.goalsFor < r.goalsAgainst ? 'L' : 'D');
    assert.equal(r.opponentName, WORLD.clubs[r.opponentId].name);
  }
  assert.equal(getClubView({ ...CTX, recentResults: 1 }, CONTROLLED).form.length, 1);

  // Classificação: só rodadas concluídas (a rodada em andamento não entra).
  const table = computeStandings(WORLD.divisions[0].clubIds, RESULTS, 'classificacao:D1');
  const idx = table.findIndex((r) => r.clubId === CONTROLLED);
  assert.ok(view.standing);
  assert.equal(view.standing.position, idx + 1);
  assert.equal(view.standing.clubsInDivision, 20);
  assert.equal(view.standing.played, 2);
  assert.deepStrictEqual({ ...view.standing, position: undefined, clubsInDivision: undefined }, { ...table[idx], position: undefined, clubsInDivision: undefined });

  // Próximo jogo: com a rodada 3 em andamento, é o da rodada 4 do calendário.
  const fixture = SCHEDULE.D1[3].find((m) => m.home === CONTROLLED || m.away === CONTROLLED) as ScheduledMatch;
  assert.ok(view.nextMatch);
  assert.equal(view.nextMatch.round, 4);
  assert.equal(view.nextMatch.home, fixture.home === CONTROLLED);
  assert.equal(view.nextMatch.opponentId, fixture.home === CONTROLLED ? fixture.away : fixture.home);

  // Finanças públicas; o clube controlado vê o próprio saldo exato.
  const payroll = club.squad.reduce((sum, id) => sum + WORLD.players[id].salary, 0);
  assert.equal(view.finance.payrollPerRound, payroll);
  assert.equal(view.finance.estimatedAttendance, computeAttendance(club));
  assert.deepStrictEqual(view.finance.balance, { kind: 'EXACT', amount: club.money });
});

test('adversário e clube de outra divisão: a mesma visão, com a escalação ao vivo e sem saldo exato', () => {
  const match = matchOf(LIVE, CONTROLLED);
  const opponentId = match.home.clubId === CONTROLLED ? match.away.clubId : match.home.clubId;
  const controlled = getClubView(CTX, CONTROLLED);
  const opponent = getClubView(CTX, opponentId);

  assert.equal(opponent.isControlled, false);
  assert.equal(opponent.lineup?.source, 'LIVE');
  assert.equal(opponent.live?.matchId, match.matchId);
  assert.equal(opponent.live?.opponentId, CONTROLLED);
  // O placar visto de cada lado é o espelho do outro.
  assert.deepStrictEqual(opponent.live?.score, { for: controlled.live?.score.against, against: controlled.live?.score.for });
  assert.equal(opponent.live?.home, !controlled.live?.home);
  const oppTeam = match.home.clubId === opponentId ? match.home : match.away;
  assert.equal(opponent.lineup?.style, oppTeam.style);
  assert.equal(opponent.lineup?.behavior, oppTeam.behavior);
  assert.deepStrictEqual(opponent.lineup?.starters.map((s) => s.id), oppTeam.onField.map((s) => s.playerId));
  assert.equal(opponent.finance.balance.kind, 'BAND');

  // Outra divisão: mesmas regras.
  const d4 = WORLD.divisions[3].clubIds[0];
  const far = getClubView(CTX, d4);
  assert.equal(far.division?.level, 4);
  assert.equal(far.standing?.clubsInDivision, 20);
  assert.equal(far.lineup?.source, 'LIVE');
  assert.equal(far.form.length, 2);
  assert.equal(far.finance.balance.kind, 'BAND');
});

test('sem rodada em andamento: escalação AUTO (melhor time disponível) e próximo jogo é o da rodada indicada', () => {
  const idle: ClubsContext = { ...CTX, round: null, roundNumber: 3 };
  const view = getClubView(idle, CONTROLLED);
  const club = WORLD.clubs[CONTROLLED];
  const auto = autoLineup(club, WORLD.players);

  assert.equal(view.live, null);
  assert.equal(view.lineup?.source, 'AUTO');
  assert.deepStrictEqual(view.lineup?.starters.map((s) => s.id), auto.starters.map((s) => s.playerId));
  assert.deepStrictEqual(view.lineup?.bench.map((p) => p.id).sort(), [...auto.bench].sort());
  assert.equal(view.lineup?.style, club.defaultTactics.style);
  assert.equal(view.lineup?.behavior, club.defaultTactics.behavior);
  assert.equal(view.lineup?.strength, view.strength);

  const fixture = SCHEDULE.D1[2].find((m) => m.home === CONTROLLED || m.away === CONTROLLED) as ScheduledMatch;
  assert.equal(view.nextMatch?.round, 3);
  assert.equal(view.nextMatch?.home, fixture.home === CONTROLLED);

  // Fim da temporada: não há próximo jogo.
  assert.equal(getClubView({ ...CTX, round: null, roundNumber: 39 }, CONTROLLED).nextMatch, null);
  // Rodada já terminada (todas as partidas FINISHED) conta como "sem rodada em andamento".
  const finished = simulateRound(createRound('T1-R3', 'seed-q', fixturesFor(3)));
  const after = getClubView({ ...CTX, round: finished, roundNumber: 3 }, CONTROLLED);
  assert.equal(after.live?.status, 'FINISHED');
  assert.equal(after.nextMatch?.round, 3, 'sem rodada em andamento, o próximo é o da rodada indicada');
});

test('minuto mostrado: no fim do jogo aparece o último minuto jogado, nunca um minuto que não existe', () => {
  const finished = simulateRound(createRound('T1-R3', 'seed-q', fixturesFor(3)));
  const v = getClubView({ ...CTX, round: finished }, CONTROLLED);
  const match = matchOf(finished, CONTROLLED);
  assert.equal(v.live?.status, 'FINISHED');
  assert.equal(v.live?.minute, clockLabel(match.events[match.events.length - 1].clock));
  assert.match(v.live?.minute as string, /^90\+\d+$/);
});

test('classificação e lista de clubes: 4 divisões de 20, ordenadas, com o clube controlado marcado', () => {
  const clubs = listClubs(CTX);
  assert.equal(clubs.length, 80);
  assert.deepStrictEqual(clubs.map((c) => c.divisionLevel), [...clubs.map((c) => c.divisionLevel)].sort((a, b) => a - b));
  assert.equal(clubs.filter((c) => c.isControlled).length, 1);
  assert.equal(clubs.find((c) => c.isControlled)?.id, CONTROLLED);
  assert.ok(clubs.every((c) => c.strength !== null && c.strength > 0));

  for (const d of WORLD.divisions) {
    const rows = getStandings(CTX, d.id);
    assert.equal(rows.length, 20);
    assert.deepStrictEqual(rows.map((r) => r.position), Array.from({ length: 20 }, (_, i) => i + 1));
    const expected = computeStandings(d.clubIds, RESULTS.filter((r) => d.clubIds.includes(r.homeClubId)), `classificacao:${d.id}`);
    assert.deepStrictEqual(rows.map((r) => r.clubId), expected.map((r) => r.clubId));
    for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].points >= rows[i].points);
    assert.ok(rows.every((r) => r.played === 2 && r.clubName === WORLD.clubs[r.clubId].name));
  }
  assert.equal(getStandings(CTX, 'D1').filter((r) => r.isControlled).length, 1);

  assert.throws(() => getClubView(CTX, 'clube-fantasma'), (e: unknown) => e instanceof QueryError && e.code === 'UNKNOWN_CLUB');
  assert.throws(() => getStandings(CTX, 'D9'), (e: unknown) => e instanceof QueryError && e.code === 'UNKNOWN_DIVISION');
});

// ---------- Privacidade ----------

test('privacidade: sem salário individual, temperamento, contrato ou saldo exato de outros clubes; saldo em faixas por tercis', () => {
  const bands: Record<string, number[]> = { LOW: [], MEDIUM: [], HIGH: [] };
  for (const c of listClubs(CTX)) {
    const view = getClubView(CTX, c.id);
    const json = JSON.stringify(view);
    for (const forbidden of ['"salary"', '"temperament"', '"contract"', '"money"']) assert.ok(!json.includes(forbidden), `${c.id}: ${forbidden}`);
    if (c.id === CONTROLLED) {
      assert.equal(view.finance.balance.kind, 'EXACT');
    } else {
      assert.equal(view.finance.balance.kind, 'BAND');
      assert.ok(!('amount' in view.finance.balance), 'sem valor exato');
      if (view.finance.balance.kind === 'BAND') bands[view.finance.balance.band].push(WORLD.clubs[c.id].money);
    }
  }
  // Tercis entre os 80 clubes: cada faixa tem cerca de um terço, e a ordem das faixas respeita o dinheiro.
  for (const list of Object.values(bands)) assert.ok(list.length >= 24 && list.length <= 29, `faixa com ${list.length} clubes`);
  assert.ok(Math.max(...bands.LOW) <= Math.min(...bands.MEDIUM));
  assert.ok(Math.max(...bands.MEDIUM) <= Math.min(...bands.HIGH));
});

// ---------- SOMENTE LEITURA ----------

test('SOMENTE LEITURA (1): com o contexto totalmente congelado, nenhuma consulta escreve em nada', () => {
  const frozen: ClubsContext = deepFreeze(structuredClone(CTX));
  // O congelamento vale mesmo: qualquer escrita, em qualquer nível, lança erro.
  assert.throws(() => {
    (frozen.results[0] as PlayedMatch).homeGoals = 99;
  }, TypeError);
  assert.throws(() => {
    (frozen.round as RoundState).matches[0].score.home = 99;
  }, TypeError);
  assert.throws(() => {
    frozen.world.clubs[CONTROLLED].defaultTactics.style = 'OFFENSIVE';
  }, TypeError);
  assert.throws(() => {
    frozen.world.clubs[CONTROLLED].squad.push('intruso');
  }, TypeError);

  // Todas as consultas sobre todos os clubes, sem lançar (senão algo tentou escrever).
  const before = JSON.stringify(frozen);
  assert.equal(listClubs(frozen).length, 80);
  for (const c of listClubs(frozen)) assert.ok(getClubView(frozen, c.id));
  for (const d of frozen.world.divisions) assert.equal(getStandings(frozen, d.id).length, 20);
  assert.equal(getClubView({ ...frozen, round: null }, CONTROLLED).lineup?.source, 'AUTO');
  assert.equal(JSON.stringify(frozen), before);
});

test('SOMENTE LEITURA (2): as respostas são cópias; mexer nelas não altera o jogo nem as próximas respostas', () => {
  const snapshot = JSON.stringify(CTX);
  const first = getClubView(CTX, CONTROLLED);
  const pristine = structuredClone(first);

  // Sabota a resposta em todos os níveis.
  first.name = 'SABOTADO';
  first.squad.length = 0;
  first.squad.push({ ...pristine.squad[0], strength: 99 });
  first.form.length = 0;
  if (first.lineup) {
    first.lineup.starters.length = 0;
    first.lineup.style = 'DEFENSIVE';
    first.lineup.bench.length = 0;
  }
  if (first.standing) first.standing.points = 999;
  if (first.live) first.live.score.for = 50;
  first.stadium.name = 'X';
  first.finance.balance = { kind: 'EXACT', amount: -1 };

  assert.equal(JSON.stringify(CTX), snapshot, 'o contexto (mundo, rodada, resultados) continua idêntico');
  assert.deepStrictEqual(getClubView(CTX, CONTROLLED), pristine, 'a próxima consulta não vê a sabotagem');
  const table = getStandings(CTX, 'D1');
  table[0].points = 999;
  assert.notEqual(getStandings(CTX, 'D1')[0].points, 999);
});

test('SOMENTE LEITURA (3): consultar durante uma decisão pendente não altera a decisão nem a partida', () => {
  // Abre o MEU TIME do clube controlado (decisão pendente) e consulta todo mundo.
  const opened = applyRoundCommand(LIVE, matchOf(LIVE, CONTROLLED).matchId, { type: 'OPEN_TEAM_ADJUSTMENT', commandId: 'q-open', clubId: CONTROLLED });
  assert.ok(opened.result.ok);
  const pendingRound = opened.round;
  const match = matchOf(pendingRound, CONTROLLED);
  assert.equal(match.status, 'AWAITING_DECISION');
  const decisionBefore = structuredClone(match.decision);
  const roundBefore = JSON.stringify(pendingRound);

  const ctx: ClubsContext = { ...CTX, round: pendingRound };
  for (const c of listClubs(ctx)) getClubView(ctx, c.id);
  const view = getClubView(ctx, CONTROLLED);
  assert.equal(view.live?.status, 'AWAITING_DECISION');

  assert.equal(JSON.stringify(pendingRound), roundBefore, 'a rodada é idêntica depois das consultas');
  const after = matchOf(pendingRound, CONTROLLED);
  assert.equal(after.status, 'AWAITING_DECISION');
  assert.deepStrictEqual(after.decision, decisionBefore, 'a mesma decisão, com o mesmo id, segue pendente');
  assert.equal(after.decisionQueue.length, 0);
  assert.equal(after.commands.length, match.commands.length, 'consultar não gera comando');
});

test('SOMENTE LEITURA (4): jogar a rodada consultando clubes a cada minuto dá exatamente o mesmo resultado que jogá-la sem consultar', () => {
  const opponentId = (() => {
    const m = matchOf(LIVE, CONTROLLED);
    return m.home.clubId === CONTROLLED ? m.away.clubId : m.home.clubId;
  })();
  const watched = [CONTROLLED, opponentId, D1[2], WORLD.divisions[3].clubIds[0]];

  const plain = simulateRound(LIVE, playerLikeCpu);

  let r = LIVE;
  let queries = 0;
  while (!isRoundFinished(r)) {
    const ctx: ClubsContext = { ...CTX, round: r };
    for (const id of watched) {
      getClubView(ctx, id);
      queries += 1;
    }
    getStandings(ctx, 'D1');
    const waiting = awaitingMatch(r);
    r = waiting ? resolveAwaiting(r) : stepRound(r);
  }
  assert.ok(queries > 200, 'consultou de verdade, muitas vezes');
  assert.equal(JSON.stringify(r.matches), JSON.stringify(plain.matches));
});

test('SOMENTE LEITURA (5): queries.ts não conhece comandos: só importa leituras do engine e não chama nada que avance ou altere a partida', () => {
  const source = readFileSync(new URL('../queries.ts', import.meta.url), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  // Só importa do engine público.
  const modules = [...code.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
  assert.deepStrictEqual([...new Set(modules)], ['../engine/index.ts']);

  // Dos valores importados, só funções de leitura.
  const block = /import\s*\{([\s\S]*?)\}\s*from\s*'\.\.\/engine\/index\.ts'/.exec(code)?.[1] ?? '';
  const values = block.split(',').map((s) => s.trim()).filter((s) => s && !s.startsWith('type '));
  const allowed = ['autoLineup', 'clockLabel', 'computeAttendance', 'computeStandings', 'DEFAULT_CONFIG', 'formationLabel', 'formationOf', 'overallStrength', 'payroll'];
  assert.deepStrictEqual([...values].sort(), [...allowed].sort());

  // Nada de comandos, passos, simulação ou sessão.
  for (const word of ['Command', 'applyCommand', 'applyRoundCommand', 'stepRound', 'step', 'simulateMatch', 'simulateRound', 'createRound', 'createSession', 'dispatch', 'recordCommand']) {
    assert.ok(!new RegExp(`\\b${word}\\b`).test(code), `queries.ts não pode usar ${word}`);
  }
});

// ---------- Integração com a sessão (pausa CLUBES) ----------

class ManualScheduler implements Scheduler {
  private seq = 0;
  private timers = new Map<number, () => void>();
  setTimeout(cb: () => void): unknown {
    const id = ++this.seq;
    this.timers.set(id, cb);
    return id;
  }
  clearTimeout(handle: unknown): void {
    this.timers.delete(handle as number);
  }
  get pending(): number {
    return this.timers.size;
  }
  fireNext(): boolean {
    const first = [...this.timers][0];
    if (!first) return false;
    this.timers.delete(first[0]);
    first[1]();
    return true;
  }
}

test('pela sessão: openClubs pausa a rodada, as consultas não alteram nada e closeClubs retoma do mesmo ponto', () => {
  const sched = new ManualScheduler();
  const session = createSession({ scheduler: sched, speed: 'NORMAL' });
  session.startRound({ roundId: 'T1-R3', seed: 'seed-q', fixtures: fixturesFor(3), controlledClubId: CONTROLLED });
  session.play();
  for (let i = 0; i < 10 && session.getState().status !== 'ROUND_FINISHED'; ) {
    const status = session.getState().status;
    if (status === 'AWAITING_DECISION') {
      const m = awaitingMatch(session.getState().round as RoundState) as ReturnType<typeof awaitingMatch> & object;
      assert.ok(session.dispatch(playerLikeCpu(m, m.decision as NonNullable<typeof m.decision>)).ok);
    } else {
      assert.ok(sched.fireNext());
      i++;
    }
  }

  session.openClubs();
  assert.equal(session.getState().status, 'PAUSED');
  assert.deepStrictEqual(session.getState().pauses, ['CLUBS']);
  assert.equal(sched.pending, 0);

  const frozenRound = JSON.stringify(session.getState().round);
  const ctx: ClubsContext = { ...CTX, round: session.getState().round };
  const views = listClubs(ctx).map((c) => getClubView(ctx, c.id));
  assert.equal(views.length, 80);
  assert.equal(views.find((v) => v.isControlled)?.live?.status, 'RUNNING');
  assert.equal(JSON.stringify(session.getState().round), frozenRound, 'a consulta não alterou a rodada');
  assert.equal(session.getState().status, 'PAUSED');

  const minutes = Math.max(...(session.getState().round as RoundState).matches.map((m) => m.minutesPlayed));
  session.closeClubs();
  assert.equal(session.getState().status, 'PLAYING');
  assert.ok(sched.fireNext());
  assert.equal(Math.max(...(session.getState().round as RoundState).matches.map((m) => m.minutesPlayed)), minutes + 1, 'retoma do minuto onde parou');
});
