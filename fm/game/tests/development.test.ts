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
  for (const f of files) assert.ok(!readFileSync(join(ROOT, f), 'utf8').includes('development/development'), f);
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
