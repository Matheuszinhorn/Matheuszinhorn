import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { DEVELOPMENT_PROTO, developRound, developmentCeiling, environmentLevel, matchPerformance, newDevelopment, type DevPosition, type MatchEvidence, type PlayerDevelopment } from '../development/development.ts';

// PROTÓTIPO PlayerDevelopment (não integrado): invariantes da evolução contextual (docs/PLAYER-DEVELOPMENT.md).

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const titular = (goals = 0, gf = 2, ga = 1): MatchEvidence => ({ played: true, minutes: 90, started: true, goals, saves: 3, teamGoalsFor: gf, teamGoalsAgainst: ga, redCard: false, injured: false });
const bench: MatchEvidence = { played: false, minutes: 0, started: false, goals: 0, saves: 0, teamGoalsFor: 1, teamGoalsAgainst: 0, redCard: false, injured: false };

function season(dev: PlayerDevelopment, o: { age: number; env: number; pos?: DevPosition; ev: (round: number) => MatchEvidence; season?: number }) {
  const windows: number[] = [];
  for (let round = 1; round <= DEVELOPMENT_PROTO.seasonRounds; round++) {
    const before = dev.strengthCurrent;
    dev = developRound(dev, { season: o.season ?? 1, round, age: o.age, position: o.pos ?? 'ATA', environmentLevel: o.env, evidence: o.ev(round) });
    assert.ok(Math.abs(dev.strengthCurrent - before) <= 1, 'nunca mais de 1 ponto por vez');
    if (dev.strengthCurrent !== before) windows.push(round);
  }
  return { dev, windows };
}

test('mudança máxima de ±1, só no fim das janelas; nunca +5/+10 numa atualização', () => {
  const { dev, windows } = season(newDevelopment('x', 15), { age: 18, env: 45, ev: (r) => titular(r % 2) });
  for (const r of windows) assert.ok(r % DEVELOPMENT_PROTO.windowRounds === 0 || r === DEVELOPMENT_PROTO.seasonRounds, `mudou na rodada ${r}`);
  assert.ok(dev.strengthCurrent - 15 <= 8, 'no máximo uma subida por janela');
  for (const h of dev.history) assert.equal(Math.abs(h.to - h.from), 1);
});

test('contratação ≠ aumento: trocar de ambiente não muda a força na hora (caso A: 23 entra na Série A com 23)', () => {
  const d = newDevelopment('a', 23);
  const first = developRound(d, { season: 1, round: 1, age: 22, position: 'ATA', environmentLevel: 40, evidence: titular(1) });
  assert.equal(first.strengthCurrent, 23);
  const { dev } = season(d, { age: 22, env: 40, ev: (r) => titular(r % 2) });
  assert.ok(dev.strengthCurrent > 23 && dev.strengthCurrent <= 28, `gradual: ${dev.strengthCurrent}`);
});

test('ganho só abaixo do teto do ambiente; acima do teto não cresce, mas também não cai por isso (caso C)', () => {
  assert.equal(developmentCeiling(16, 27), 18);
  const { dev } = season(newDevelopment('c', 45), { age: 27, env: 16, ev: (r) => titular(1, 3, 0) });
  assert.equal(dev.strengthCurrent, 45);
  const near = season(newDevelopment('n', 43), { age: 22, env: 40, ev: () => titular(2) }).dev;
  assert.ok(near.strengthCurrent <= developmentCeiling(40, 22));
});

test('banco em clube forte não evolui (caso D); minutos de lixo quase não contam', () => {
  const d = season(newDevelopment('d', 20), { age: 25, env: 40, ev: () => bench }).dev;
  assert.ok(d.strengthCurrent <= 20);
  const lixo = season(newDevelopment('l', 22), { age: 20, env: 40, ev: () => ({ ...titular(0, 3, 0), minutes: 5 }) }).dev;
  assert.equal(lixo.strengthCurrent, 22);
});

test('titular com bom rendimento evolui (caso E); jovem cresce mais que veterano; veterano não cresce', () => {
  const e = season(newDevelopment('e', 25), { age: 23, env: 40, pos: 'MEI', ev: (r) => titular(r % 3 === 0 ? 1 : 0) }).dev;
  assert.ok(e.strengthCurrent > 25);
  const young = season(newDevelopment('y', 25), { age: 19, env: 35, ev: () => titular(0) }).dev;
  const old = season(newDevelopment('o', 25), { age: 34, env: 35, ev: () => titular(0) }).dev;
  assert.ok(young.strengthCurrent > old.strengthCurrent);
  assert.ok(old.strengthCurrent <= 25);
});

test('goleiro: gols não contam; evolui mais devagar que o jogador de linha equivalente', () => {
  assert.equal(matchPerformance({ ...titular(0, 1, 0) }, 'GOL'), matchPerformance({ ...titular(3, 1, 0) }, 'GOL'));
  const gk = season(newDevelopment('g', 24), { age: 21, env: 36, pos: 'GOL', ev: () => titular(0, 1, 0) }).dev;
  const df = season(newDevelopment('f', 24), { age: 21, env: 36, pos: 'DEF', ev: () => titular(0, 1, 0) }).dev;
  assert.ok(gk.strengthCurrent <= df.strengthCurrent);
});

test('lesão pausa (não conta como tempo sem jogar); ficar parado sem lesão faz perder ritmo devagar', () => {
  const injured = season(newDevelopment('i', 30), { age: 27, env: 30, ev: () => ({ ...bench, injured: true }) }).dev;
  const idle = season(newDevelopment('j', 30), { age: 27, env: 30, ev: () => bench }).dev;
  assert.equal(injured.strengthCurrent, 30);
  assert.equal(injured.idleRounds, 0);
  assert.ok(idle.strengthCurrent < 30 && idle.strengthCurrent >= 28, `${idle.strengthCurrent}`);
});

test('determinístico e rastreável: mesma sequência = mesma evolução; strengthBase nunca muda; histórico com motivo e contexto', () => {
  const run = () => season(newDevelopment('z', 24), { age: 22, env: 38, ev: (r) => titular(r % 2, 2, r % 3) }).dev;
  assert.deepStrictEqual(run(), run());
  const d = run();
  assert.equal(d.strengthBase, 24);
  for (const h of d.history) assert.ok(h.reason && h.context.ceiling > 0 && h.context.environmentLevel > 0);
  const src = readFileSync(join(ROOT, 'game/development/development.ts'), 'utf8');
  for (const banned of ['Math.random', 'Date.now', 'new Date(']) assert.ok(!src.includes(banned), banned);
});

test('ambiente = média dos 16 mais fortes do elenco (clube, não divisão)', () => {
  assert.equal(environmentLevel([...Array(16).fill(40), ...Array(10).fill(10)]), 40);
  assert.equal(environmentLevel([30, 20]), 25);
});

test('protótipo isolado: nada em engine/, game/ (fora de development/) ou app/ importa o PlayerDevelopment', () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(join(ROOT, d))) {
      const p = `${d}/${f}`;
      if (statSync(join(ROOT, p)).isDirectory()) { if (!['tests', 'development', 'node_modules'].includes(f)) walk(p); } else if (/\.(ts|mjs)$/.test(f)) files.push(p);
    }
  };
  for (const d of ['engine', 'game', 'app']) walk(d);
  for (const f of files) for (const m of ['development/development', 'development/feedback', 'development/evidence']) assert.ok(!readFileSync(join(ROOT, f), 'utf8').includes(m), `${f} importa ${m}`);
});

// ---------- calibração DEV-PROTO-0.2 ----------

test('0.2: ritmo de 10 temporadas — promessa titular cresce ≤ 6 por temporada e nunca chega a 50', () => {
  let dev = newDevelopment('p', 22);
  for (let s = 1; s <= 10; s++) {
    const start = dev.strengthCurrent;
    dev = season(dev, { age: 20 + s, env: 32, season: s, ev: (r) => titular(r % 5 === 0 || r % 5 === 2 ? 1 : 0, 2, r % 4 === 0 ? 1 : 0) }).dev;
    assert.ok(dev.strengthCurrent - start <= 6, `temporada ${s}: +${dev.strengthCurrent - start}`);
  }
  assert.ok(dev.strengthCurrent < 50 && dev.strengthCurrent > 22);
});

test('0.2: ambiente é oportunidade, não alvo — 23/35/43 em ambiente 40 têm espaços diferentes e 43 não sobe para "acompanhar"', () => {
  const after = (base: number) => {
    let d = newDevelopment(`e${base}`, base);
    for (let s = 1; s <= 3; s++) d = season(d, { age: 23 + s, env: 40, pos: 'MEI', season: s, ev: (r) => titular(r % 5 === 0 ? 1 : 0) }).dev;
    return d.strengthCurrent - base;
  };
  const [a, b, c] = [after(23), after(35), after(43)];
  assert.ok(a > b && b >= c, `${a} ${b} ${c}`);
  assert.ok(c <= 1);
});

test('0.2: acima do limite, bons jogos compensam os ruins — ambiente fraco não derruba quem rende (sem deriva)', () => {
  const mixed = (r: number) => (r % 2 ? titular(1, 2, 0) : titular(0, 0, 1)); // vitória com gol / derrota sem gol, alternadas
  const weak = season(newDevelopment('w', 45), { age: 27, env: 25, ev: mixed }).dev;
  assert.equal(weak.strengthCurrent, 45);
  assert.ok(weak.progress <= 0, 'sem crédito de ganho guardado acima do limite');
  const bad = season(newDevelopment('b', 45), { age: 27, env: 25, ev: () => titular(0, 0, 2) }).dev;
  assert.ok(bad.strengthCurrent < 45, 'rendimento ruim persistente ainda derruba');
});

test('0.2: idade é curva suave e o rendimento compensa parte do envelhecimento; reserva veterano cai mais que titular', () => {
  const vet = (ev: (r: number) => MatchEvidence) => {
    let d = newDevelopment('v', 40);
    for (let s = 1; s <= 3; s++) d = season(d, { age: 32 + s, env: 38, pos: 'DEF', season: s, ev }).dev;
    return d.strengthCurrent;
  };
  const good = vet(() => titular(0, 2, 0));
  const reserve = vet((r) => (r % 3 === 0 ? { ...titular(0, 1, 1), minutes: 25 } : bench));
  assert.ok(good >= 38, `titular bom aos 33–35: ${good}`);
  assert.ok(reserve < good, `reserva ${reserve} × titular ${good}`);
});

test('0.2: teto sazonal opcional (calibração) limita subidas por temporada', () => {
  const cfg = { ...DEVELOPMENT_PROTO, seasonGainCap: 2 };
  let d = newDevelopment('cap', 15);
  for (let round = 1; round <= 38; round++) d = developRound(d, { season: 1, round, age: 18, position: 'ATA', environmentLevel: 45, evidence: titular(2, 3, 0) }, cfg);
  assert.ok(d.strengthCurrent - 15 <= 2);
});

// ---------- validação no mundo real (leitura de partidas do engine) ----------

test('evidência lida de uma rodada real do engine: titulares, minutos, gols e placar coerentes; só leitura', async () => {
  const { createRound, roundResults, simulateRound } = await import('../../engine/index.ts');
  const { careerOffers } = await import('../career.ts');
  const { newManagedCareer } = await import('../manager/actions.ts');
  const { planManagedRound } = await import('../manager/flow.ts');
  const { evidenceFromMatch } = await import('../development/evidence.ts');
  const c = newManagedCareer('dev-evidencia', 'T', careerOffers('dev-evidencia')[0]);
  const plan = planManagedRound(c);
  const sim = simulateRound(createRound(plan.roundId, plan.seed, plan.fixtures, null));
  const frozen = JSON.stringify(sim.matches);
  for (const m of sim.matches) {
    const ev = evidenceFromMatch(m);
    for (const side of ['home', 'away'] as const) {
      const mine = [...ev.entries()].filter(([id]) => m[side].players[id]);
      assert.equal(mine.filter(([, e]) => e.started).length, 11, `${m.matchId} ${side}: 11 titulares`);
      for (const [, e] of mine) assert.ok(e.played && e.minutes >= 1 && e.minutes <= 90 && e.teamGoalsFor === m.score[side]);
      assert.ok(mine.reduce((a, [, e]) => a + e.goals, 0) <= m.score[side]);
    }
  }
  assert.equal(JSON.stringify(sim.matches), frozen, 'a leitura não altera a partida');
  // o mundo A não muda com o observador: mesma rodada simulada de novo = mesmos placares
  const again = roundResults(simulateRound(createRound(plan.roundId, plan.seed, plan.fixtures, null)));
  assert.deepStrictEqual(again.map((r) => `${r.homeGoals}-${r.awayGoals}`), roundResults(sim).map((r) => `${r.homeGoals}-${r.awayGoals}`));
});

// ---------- DEV-PROTO-0.3 (calibração; não integrada) ----------

test('0.3: campos novos são inertes na 0.2 (a 0.2 continua exatamente igual)', async () => {
  const { contextLevel } = await import('../development/development.ts');
  assert.equal(DEVELOPMENT_PROTO.divisionWeight, 0);
  assert.equal(DEVELOPMENT_PROTO.idleSeasonCap, null);
  assert.equal(DEVELOPMENT_PROTO.agingWhenNotPlayed, true);
  assert.equal(contextLevel({ environmentLevel: 30, divisionLevel: 40 }, DEVELOPMENT_PROTO), 30);
});

test('0.3: inatividade com limite por temporada (A ≤ 1, B ≤ 0,5) e C sem perda nem idade sem jogar', async () => {
  const { devProto03, roundPoints } = await import('../development/development.ts');
  const idleTotal = (cfg: typeof DEVELOPMENT_PROTO, age: number) => {
    let d = newDevelopment('i', 30);
    let idle = 0;
    let aging = 0;
    for (let round = 1; round <= 38; round++) {
      const ctx = { season: 1, round, age, position: 'MEI' as const, environmentLevel: 30, divisionLevel: 30, evidence: bench };
      const b = roundPoints(d, ctx, cfg);
      idle += b.idle;
      aging += b.aging;
      d = developRound(d, ctx, cfg);
    }
    return { idle, aging, d };
  };
  assert.ok(idleTotal(devProto03('A'), 27).idle >= -1 - 1e-9);
  assert.ok(idleTotal(devProto03('B'), 27).idle >= -0.5 - 1e-9);
  assert.ok(idleTotal(DEVELOPMENT_PROTO, 27).idle < -1, '0.2 sem limite');
  const c = idleTotal(devProto03('C'), 35);
  assert.equal(c.idle, 0);
  assert.equal(c.aging, 0);
  assert.equal(c.d.strengthCurrent, 30);
  assert.ok(idleTotal(devProto03('B'), 35).aging < 0, 'A e B mantêm a idade para quem não joga');
});

test('0.3: divisão é só oportunidade — sem minutos nada sobe; com minutos, divisão mais forte dá mais espaço; nunca muda a força na hora', async () => {
  const { devProto03, roundPoints } = await import('../development/development.ts');
  const cfg = devProto03('B');
  const d = newDevelopment('x', 23);
  const ctx = (divisionLevel: number, evidence: MatchEvidence) => ({ season: 1, round: 1, age: 22, position: 'ATA' as const, environmentLevel: 20, divisionLevel, evidence });
  assert.equal(roundPoints(d, ctx(40, bench), cfg).points, 0, 'divisão forte sem minutos: zero');
  assert.ok(roundPoints(d, ctx(40, titular(1)), cfg).points > roundPoints(d, ctx(16, titular(1)), cfg).points);
  // força igual logo após trocar de contexto (D4 → D1)
  const after = developRound(d, ctx(40, titular(1)), cfg);
  assert.equal(after.strengthCurrent, 23);
  let s = d;
  for (let round = 1; round <= 38; round++) s = developRound(s, { ...ctx(40, titular(round % 2)), round }, cfg);
  assert.ok(s.strengthCurrent > 23 && s.strengthCurrent <= 27, `gradual: ${s.strengthCurrent}`);
});

// ---------- DEV-PROTO-0.4 (calibração; não integrada) ----------

test('0.4: campos novos inertes na 0.2 e na 0.3', async () => {
  const { devProto03 } = await import('../development/development.ts');
  for (const cfg of [DEVELOPMENT_PROTO, devProto03('B')]) {
    assert.equal(cfg.nonPlayingSeasonCap, null);
    assert.equal(cfg.performancePreservation, 'none');
  }
});

test('0.4: limite CONJUNTO — temporada inteira sem minutos perde no máximo o teto (idade + inatividade somadas)', async () => {
  const { devProto04, roundPoints } = await import('../development/development.ts');
  for (const [cap, max] of [['A', 0.5], ['B', 0.75], ['C', 1]] as const) {
    const cfg = devProto04(cap);
    let d = newDevelopment('v', 40);
    let applied = 0;
    let raw = 0;
    for (let round = 1; round <= 38; round++) {
      const ctx = { season: 1, round, age: 35, position: 'DEF' as const, environmentLevel: 38, divisionLevel: 38, evidence: bench };
      const b = roundPoints(d, ctx, cfg);
      raw += b.aging + b.idle;
      applied += b.aging + b.idle + b.capRelief;
      d = developRound(d, ctx, cfg);
    }
    assert.ok(raw < -max, `perda bruta ${raw} maior que o teto`);
    assert.ok(Math.abs(applied + max) < 1e-3, `${cap}: aplicada ${applied}, teto ${max}`);
  }
});

test('0.4: quem joga continua com o envelhecimento normal (o limite só vale para rodadas sem participação)', async () => {
  const { devProto03, devProto04, roundPoints } = await import('../development/development.ts');
  const d = newDevelopment('t', 40);
  const ctx = { season: 1, round: 1, age: 35, position: 'DEF' as const, environmentLevel: 38, divisionLevel: 38, evidence: titular(0, 0, 1) };
  const a = roundPoints(d, ctx, devProto03('B'));
  const b = roundPoints(d, ctx, devProto04('A'));
  assert.equal(b.aging, a.aging);
  assert.equal(b.capRelief, 0);
});

test('0.4: preservação nunca dá +1 no limite contextual; só guarda reserva (parcial ≤ 0,5)', async () => {
  const { devProto04, developmentCeiling } = await import('../development/development.ts');
  for (const p of ['A', 'B', 'C'] as const) {
    const cfg = devProto04('B', p);
    let d = newDevelopment('s', 48);
    for (let round = 1; round <= 38; round++) d = developRound(d, { season: 1, round, age: 27, position: 'ATA', environmentLevel: 46, divisionLevel: 46, evidence: titular(2, 3, 0) }, cfg);
    assert.equal(d.strengthCurrent, 48, `${p}: não sobe acima do limite ${developmentCeiling(46, 27)}`);
    if (p === 'A') assert.ok(d.progress <= 0);
    if (p === 'B') assert.ok(d.progress <= 0.5 + 1e-9);
  }
});

// ---------- DEV-INTEGRATION-0.1 (teste de feedback experimental; não integrado) ----------

test('feedback: a composição só troca Player.strength por strengthCurrent; o resto do mundo e o calendário ficam idênticos', async () => {
  const { createRound, roundResults, simulateRound } = await import('../../engine/index.ts');
  const { careerOffers } = await import('../career.ts');
  const { newManagedCareer } = await import('../manager/actions.ts');
  const { finishManagedRound, planManagedRound } = await import('../manager/flow.ts');
  const { devProto04 } = await import('../development/development.ts');
  const { stepDevelopment, withDevelopedStrength } = await import('../development/feedback.ts');
  const cfg = devProto04('B', 'B');
  const c0 = newManagedCareer('dev-feedback', 'T', careerOffers('dev-feedback')[0]);
  const plan = planManagedRound(c0);
  const sim = simulateRound(createRound(plan.roundId, plan.seed, plan.fixtures, null));
  const frozenWorld = JSON.stringify(c0.world);
  const devs = stepDevelopment(new Map(), c0.world, sim.matches, 1, 1, cfg);
  assert.equal(JSON.stringify(c0.world), frozenWorld, 'stepDevelopment não altera o mundo');
  assert.deepStrictEqual([...stepDevelopment(new Map(), c0.world, sim.matches, 1, 1, cfg)], [...devs], 'determinístico');
  for (const p of Object.values(c0.world.players)) if (p.clubId) assert.equal(devs.get(p.id)!.strengthBase, p.strength, 'strengthBase = força no 1º encontro');
  const c1 = finishManagedRound(c0, roundResults(sim), sim.matches, { evolution: false }).career;
  // rodada 1: nada muda ainda → a composição devolve o mesmo mundo
  assert.equal(withDevelopedStrength(c1.world, devs), c1.world);
  // força alterada à mão: só strength muda, e só nesses jogadores
  const ids = Object.keys(c1.world.players).filter((id) => devs.has(id)).slice(0, 3);
  const forced = new Map(devs);
  for (const id of ids) forced.set(id, { ...forced.get(id)!, strengthCurrent: Math.min(50, forced.get(id)!.strengthCurrent + 1) });
  const w = withDevelopedStrength(c1.world, forced);
  const mask = (x: typeof w) => JSON.stringify({ ...x, players: Object.fromEntries(Object.entries(x.players).map(([id, p]) => [id, { ...p, strength: 0 }])) });
  assert.equal(mask(w), mask(c1.world), 'nada além de strength muda');
  for (const id of Object.keys(w.players)) assert.equal(w.players[id].strength, ids.includes(id) ? forced.get(id)!.strengthCurrent : c1.world.players[id].strength);
  // o calendário da rodada seguinte é o mesmo com e sem a composição (seed, partidas, mandos)
  const key = (p: ReturnType<typeof planManagedRound>) => `${p.roundId}|${p.seed}|${p.fixtures.map((f) => `${f.matchId}:${f.home.club.id}-${f.away.club.id}`).join(',')}`;
  assert.equal(key(planManagedRound({ ...c1, world: w })), key(planManagedRound(c1)));
});
