import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../config.ts';
import { applyCommand } from '../match/commands.ts';
import { reproduceMatch, simulateMatch } from '../match/simulate.ts';
import { createMatch } from '../match/state.ts';
import { step } from '../match/step.ts';
import { channel } from '../rng.ts';
import type { Clock, MatchState } from '../types.ts';
import { matchInput, playEvents, playerLikeCpu } from './helpers.ts';

const SEEDS = Array.from({ length: 60 }, (_, i) => `seed-${i + 1}`);

// 1. Mesma seed → mesmo resultado.
test('1. mesma seed + mesmos dados produz exatamente o mesmo resultado', () => {
  const input = matchInput('20260928001');
  const first = simulateMatch(input);
  for (let i = 0; i < 100; i++) assert.deepStrictEqual(simulateMatch(input), first);
  // Controle: outra seed muda a partida, e uma seed maior que 32 bits não é truncada.
  const other = simulateMatch(matchInput(String(20260928001 + 2 ** 32)));
  assert.notDeepStrictEqual(other.events, first.events);
});

// 2. Cada step avança exatamente 1 minuto.
test('2. step avança exatamente um minuto de jogo', () => {
  let s = createMatch(matchInput('passo'));
  assert.deepStrictEqual(s.clock, { half: 1, minute: 1, added: 0 });
  s = step(s);
  assert.deepStrictEqual(s.clock, { half: 1, minute: 2, added: 0 });
  assert.equal(s.minutesPlayed, 1);

  for (const seed of SEEDS.slice(0, 20)) {
    let m = createMatch(matchInput(seed));
    const visited: Clock[] = [];
    while (m.status !== 'FINISHED') {
      if (m.status === 'AWAITING_DECISION') throw new Error('sem clube controlado não deveria pausar');
      const before = m.minutesPlayed;
      visited.push({ ...m.clock });
      m = step(m);
      assert.equal(m.minutesPlayed, before + 1, 'cada step soma 1 minuto');
    }
    // A sequência de relógio é exatamente 1'…45', 45+1'…, 46'…90', 90+1'… (mais eventual minuto de cobrança).
    const first = visited.filter((c) => c.half === 1);
    const second = visited.filter((c) => c.half === 2);
    assert.deepStrictEqual(first.slice(0, 45).map((c) => c.minute), Array.from({ length: 45 }, (_, i) => i + 1));
    assert.deepStrictEqual(second.slice(0, 45).map((c) => c.minute), Array.from({ length: 45 }, (_, i) => i + 46));
    first.slice(45).forEach((c, i) => assert.deepStrictEqual(c, { half: 1, minute: 45, added: i + 1 }));
    second.slice(45).forEach((c, i) => assert.deepStrictEqual(c, { half: 2, minute: 90, added: i + 1 }));
  }
});

function extensionMinutes(s: MatchState, half: 1 | 2): number {
  const st = (half === 1 ? s.stoppage.first : s.stoppage.second) ?? 0;
  const last = Math.max(0, ...s.events.filter((e) => e.clock.half === half).map((e) => e.clock.added));
  return Math.max(0, last - st);
}

// 3. Termina em 90' + acréscimos; acréscimo fixado aos 45'/90' e dentro dos limites.
test('3. a partida termina só depois do acréscimo do 2º tempo', () => {
  const c = DEFAULT_CONFIG.stoppage;
  for (const seed of SEEDS) {
    const s = simulateMatch(matchInput(seed));
    assert.equal(s.status, 'FINISHED');
    const first = s.stoppage.first as number;
    const second = s.stoppage.second as number;
    assert.ok(first >= c.firstMin && first <= c.max && second >= c.secondMin && second <= c.max);

    const stoppageEvents = s.events.filter((e) => e.type === 'STOPPAGE');
    assert.equal(stoppageEvents.length, 2, 'acréscimo definido uma vez por tempo');
    assert.deepStrictEqual(stoppageEvents[0].clock, { half: 1, minute: 45, added: 0 });
    assert.deepStrictEqual(stoppageEvents[1].clock, { half: 2, minute: 90, added: 0 });

    const full = s.events[s.events.length - 1];
    assert.equal(full.type, 'FULL_TIME', 'FULL_TIME é o último evento');
    assert.deepStrictEqual(full.clock, { half: 2, minute: 90, added: second + extensionMinutes(s, 2) });
    assert.equal(s.minutesPlayed, 90 + first + second + extensionMinutes(s, 1) + extensionMinutes(s, 2));
  }
});

// 4. Eventos de jogo acontecem nos acréscimos.
test('4. eventos podem ocorrer nos acréscimos', () => {
  let inStoppage = 0;
  for (let i = 1; i <= 300; i++) {
    const s = simulateMatch(matchInput(`acr-${i}`));
    inStoppage += playEvents(s).filter((e) => e.clock.added > 0).length;
  }
  assert.ok(inStoppage > 0, `esperava eventos nos acréscimos, veio ${inStoppage}`);
});

test('invariantes: placar = gols registrados, ninguém expulso volta, sempre 1 goleiro, sem NaN', () => {
  for (const seed of SEEDS) {
    const s = simulateMatch(matchInput(seed));
    for (const side of ['home', 'away'] as const) {
      const goals = s.events.filter((e) => e.side === side && (e.type === 'GOAL' || e.type === 'PENALTY_GOAL')).length;
      assert.equal(s.score[side], goals);
      const team = s[side];
      assert.ok(team.onField.length <= 11);
      assert.equal(team.onField.filter((x) => x.sector === 'GK').length, 1);
      assert.ok(team.subsUsed <= DEFAULT_CONFIG.maxSubs);
      for (const id of team.sentOff) {
        assert.ok(!team.onField.some((x) => x.playerId === id));
        const off = s.events.find((e) => e.type === 'RED_CARD' && e.playerId === id);
        assert.ok(!s.events.some((e) => e.seq > (off?.seq ?? -1) && e.type === 'GOAL' && e.playerId === id));
      }
    }
    assert.ok(Number.isFinite(s.stats.home.possession) && Number.isFinite(s.stats.away.possession));
    for (let i = 1; i < s.events.length; i++) assert.equal(s.events[i].seq, i);
  }
});

test('canais independentes: o mesmo endereço sempre dá o mesmo número, canais diferentes não interferem', () => {
  const clock: Clock = { half: 2, minute: 67, added: 0 };
  const a = channel('seed', clock, 'CHANCE:HOME');
  const b = channel('seed', clock, 'CHANCE:HOME');
  channel('seed', clock, 'CANAL_NOVO')(5); // criar e usar outro canal não desloca nada
  assert.equal(a(2), b(2));
  assert.equal(a(0), b(0));
  assert.notEqual(channel('seed', clock, 'CARD:HOME')(0), a(0));
});

// 10. Reprodução técnica: mesma seed + mesmos dados + mesmas decisões = mesmo resultado.
test('10. resultado reproduzível com decisões do jogador (reprodução técnica interna)', () => {
  const input = matchInput('reproducao', { controlled: 'home' });
  const clubId = input.home.club.id;
  let s = createMatch(input);
  let opened = false;
  while (s.status !== 'FINISHED') {
    if (s.status === 'AWAITING_DECISION') {
      const d = s.decision!;
      const r =
        d.type === 'TEAM_ADJUSTMENT'
          ? applyCommand(s, {
              type: 'ADJUST_TEAM',
              commandId: 'meu-time-1',
              clubId,
              decisionId: d.id,
              substitutions: [{ out: s.home.onField.find((x) => x.sector === 'ATT')!.playerId, in: s.home.bench[1] }],
              style: 'OFFENSIVE',
            })
          : applyCommand(s, playerLikeCpu(s, d));
      assert.ok(r.ok, r.ok ? '' : r.message);
      s = r.state;
    } else if (!opened && s.clock.minute === 30) {
      const r = applyCommand(s, { type: 'OPEN_TEAM_ADJUSTMENT', commandId: 'abrir-1', clubId });
      assert.ok(r.ok);
      s = r.state;
      opened = true;
    } else {
      s = step(s);
    }
  }
  assert.ok(s.events.some((e) => e.type === 'SUBSTITUTION' && e.detail === 'tactical'));
  const again = reproduceMatch(input, s.commands);
  assert.deepStrictEqual(again, s);
});

test('pausa neutra: abrir MEU TIME e continuar sem mudanças não altera a partida', () => {
  const input = matchInput('pausa', { controlled: 'home' });
  const clubId = input.home.club.id;
  const plain = simulateMatch(input, playerLikeCpu);

  let s = createMatch(input);
  while (s.status !== 'FINISHED') {
    if (s.status === 'AWAITING_DECISION') {
      const d = s.decision!;
      const cmd =
        d.type === 'TEAM_ADJUSTMENT'
          ? { type: 'ADJUST_TEAM' as const, commandId: `cont-${d.id}`, clubId, decisionId: d.id, substitutions: [] }
          : playerLikeCpu(s, d);
      const r = applyCommand(s, cmd);
      assert.ok(r.ok);
      s = r.state;
    } else if ([10, 20, 46, 80].includes(s.clock.minute) && s.clock.added === 0 && !s.commands.some((c) => c.commandId === `abrir-${s.clock.minute}`)) {
      s = (applyCommand(s, { type: 'OPEN_TEAM_ADJUSTMENT', commandId: `abrir-${s.clock.minute}`, clubId }) as { state: MatchState }).state;
    } else {
      s = step(s);
    }
  }
  assert.deepStrictEqual(s.events, plain.events);
  assert.deepStrictEqual(s.score, plain.score);
});
