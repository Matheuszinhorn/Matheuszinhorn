import assert from 'node:assert/strict';
import { test } from 'node:test';
import { autoLineup, formationLabel, generateWorld, parseFormation, validateLineup } from '../../engine/index.ts';
import { LineupEditError, applyFormation, bestLineup, setPenaltyTaker, setTactics, swapPlayers } from '../lineup-edit.ts';

const world = generateWorld('edicao-de-escalacao');
const club = world.clubs[world.divisions[3].clubIds[0]];
const base = autoLineup(club, world.players, { formation: parseFormation('4-4-2') });
const ok = (l: typeof base) => assert.deepStrictEqual(validateLineup(l, club, world.players), []);

test('titular ↔ titular: trocam de posição e a escalação segue válida', () => {
  const [a, b] = [base.starters.find((s) => s.sector === 'DEF')!, base.starters.find((s) => s.sector === 'MID')!];
  const next = swapPlayers(base, world.players, a.playerId, b.playerId);
  assert.equal(next.starters.find((s) => s.playerId === b.playerId)!.sector, 'DEF');
  assert.equal(next.starters.find((s) => s.playerId === a.playerId)!.sector, 'MID');
  ok(next);
  assert.equal(base.starters.find((s) => s.playerId === a.playerId)!.sector, 'DEF', 'a original não é alterada');
});

test('titular ↔ reserva: o reserva assume a vaga e o titular vai para o banco', () => {
  const out = base.starters.find((s) => s.sector === 'ATT')!;
  const inn = base.bench.find((id) => world.players[id].position !== 'GK')!;
  const next = swapPlayers(base, world.players, out.playerId, inn);
  assert.ok(next.starters.some((s) => s.playerId === inn));
  assert.ok(next.bench.includes(out.playerId) && !next.bench.includes(inn));
  assert.equal(next.bench.length, base.bench.length);
  ok(next);
  // a ordem dos argumentos não importa
  assert.deepStrictEqual(swapPlayers(base, world.players, inn, out.playerId), next);
});

test('jogador fora do banco entra e o banco respeita o limite; dois reservas não trocam entre si', () => {
  const outsider = club.squad.find((id) => !base.bench.includes(id) && !base.starters.some((s) => s.playerId === id) && world.players[id].position !== 'GK')!;
  const starter = base.starters.find((s) => s.sector === 'MID')!;
  const next = swapPlayers(base, world.players, starter.playerId, outsider);
  assert.ok(next.starters.some((s) => s.playerId === outsider));
  assert.ok(next.bench.length <= 7);
  assert.ok(next.bench.includes(starter.playerId));
  ok(next);
  assert.throws(() => swapPlayers(base, world.players, base.bench[0], base.bench[1]), (e: unknown) => e instanceof LineupEditError);
});

test('trocar o goleiro titular por um jogador de linha mantém exatamente 1 vaga de goleiro: o engine aceita (fator de fora de posição 0,30)', () => {
  const gk = base.starters.find((s) => s.sector === 'GK')!;
  const field = base.bench.find((id) => world.players[id].position !== 'GK')!;
  const next = swapPlayers(base, world.players, gk.playerId, field);
  assert.equal(next.starters.filter((s) => s.sector === 'GK').length, 1);
  assert.equal(next.starters.find((s) => s.sector === 'GK')!.playerId, field);
  assert.notEqual(world.players[field].position, 'GK');
  ok(next);
});

test('tática, batedor de pênalti e formação', () => {
  const t = setTactics(base, { style: 'OFFENSIVE' });
  assert.equal(t.style, 'OFFENSIVE');
  assert.equal(t.behavior, base.behavior);
  const taker = base.starters.find((s) => s.sector === 'ATT')!.playerId;
  assert.equal(setPenaltyTaker(base, taker).penaltyTakerId, taker);
  assert.throws(() => setPenaltyTaker(base, base.bench[0]), (e: unknown) => e instanceof LineupEditError);
  const f = applyFormation(club, world.players, setPenaltyTaker(t, taker), parseFormation('3-5-2'));
  assert.equal(formationLabel({ DEF: 3, MID: 5, ATT: 2 }), '3-5-2');
  assert.equal(f.style, 'OFFENSIVE', 'mantém o estilo');
  assert.deepStrictEqual(f.starters.filter((s) => s.sector === 'MID').length, 5);
  ok(f);
  ok(bestLineup(club, world.players, f));
});
