import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG, type EngineConfig } from '../config.ts';
import { chanceCategory, chanceCurve, chanceQualityContext, computeRates, qualityShares } from '../match/chances.ts';
import { resolveOpenDecision, simulateMatch } from '../match/simulate.ts';
import { createMatch } from '../match/state.ts';
import { step } from '../match/step.ts';
import type { MatchInput, MatchState } from '../types.ts';
import { matchInput } from './helpers.ts';

// Motor 0.2.0: curva sat 2 (força → volume de chances) e camada de qualidade das chances (calibração validada em 40.000 partidas).

const cfg = DEFAULT_CONFIG;
const noQuality: EngineConfig = { ...cfg, quality: { ...cfg.quality, enabled: false } };
const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);
const meanConversion = (shares: [number, number, number]) => shares.reduce((s, p, i) => s + p * cfg.quality.conversions[i], 0);

// ---------- Configuração oficial ----------

test('0.2.0: constantes oficiais da calibração', () => {
  assert.equal(cfg.engineVersion, '0.2.0');
  assert.equal(cfg.chancesBase, 4.75);
  assert.equal(cfg.homeAdvantage, 1.25);
  assert.equal(cfg.matchMinutes, 97);
  assert.equal(cfg.maxExpectedGoals, 6.0);
  assert.equal(cfg.conversionBase, 0.33);
  assert.equal(cfg.chanceCurveC, 2);
  assert.equal(cfg.quality.enabled, true);
  assert.deepStrictEqual(cfg.quality.conversions, [0.2, 0.32, 0.5]);
  assert.deepStrictEqual(cfg.quality.baseShares, [0.35, 0.35, 0.3]);
  assert.deepStrictEqual(cfg.quality.degradedShares, [0.5, 0.5, 0]);
  assert.equal(cfg.quality.h, 1.0);
  near(cfg.quality.baseShares.reduce((a, b) => a + b, 0), 1);
  near(cfg.quality.degradedShares.reduce((a, b) => a + b, 0), 1);
});

// ---------- Curva sat 2 ----------

test('chanceCurve: f(1) = 1 (confronto equilibrado não muda de nível) para qualquer c > 0', () => {
  for (const c of [0.5, 1, 2, 5]) assert.equal(chanceCurve(1, { ...cfg, chanceCurveC: c }), 1);
});

test('chanceCurve sat 2: f(r) = 3r ÷ (r+2)', () => {
  near(chanceCurve(0.25, cfg), 1 / 3);
  near(chanceCurve(0.5, cfg), 0.6);
  near(chanceCurve(2, cfg), 1.5);
  near(chanceCurve(3, cfg), 1.8);
  near(chanceCurve(4, cfg), 2);
  near(chanceCurve(5, cfg), 15 / 7);
  assert.equal(chanceCurve(0, cfg), 0);
});

test('chanceCurve sat 2: crescente, acima da linear abaixo de r = 1, abaixo dela acima de r = 1, assíntota 3', () => {
  let prev = -1;
  for (const r of [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10, 50, 1000]) {
    const f = chanceCurve(r, cfg);
    assert.ok(f > prev, `crescente em r = ${r}`);
    prev = f;
    assert.ok(f < 3, 'limitada pela assíntota (1 + c)');
    if (r < 1) assert.ok(f > r, `mais chances que a linear em r = ${r}`);
    if (r > 1) assert.ok(f < r, `menos chances que a linear em r = ${r}`);
  }
});

// ---------- Camada de qualidade: composição ----------

test('qualityShares: soma 1; sem vantagem de força usa a distribuição base; totalmente degradada usa a degradada', () => {
  for (const [baseShare, delta] of [[1, 0], [0.9, 0.2], [0.6, 0.5], [0.3, 0.8], [0, 1]] as const) {
    const p = qualityShares({ X: 1, baseShare, delta }, cfg);
    near(p[0] + p[1] + p[2], 1);
    for (const x of p) assert.ok(x >= 0);
  }
  const base = qualityShares({ X: 0, baseShare: 1, delta: 0 }, cfg);
  near(base[0], 0.35);
  near(base[1], 0.35);
  near(base[2], 0.3);
  near(meanConversion(base), 0.332); // reproduz o nível anterior (33,0% com goleiro 25) dentro de 0,6%
  const degraded = qualityShares({ X: 9, baseShare: 0, delta: 1 }, cfg);
  near(degraded[0], 0.5);
  near(degraded[1], 0.5);
  near(degraded[2], 0);
});

test('qualityShares: quanto maior a vantagem de força, menor a conversão média do favorito (piso = distribuição degradada)', () => {
  const r0 = 0.69; // razão média das escalações do mundo
  let prev = Infinity;
  for (const X of [0, 0.2, 0.4, 1, 2, 3.6]) {
    const baseShare = chanceCurve(r0, cfg) / chanceCurve(r0 * (1 + X), cfg);
    const mean = meanConversion(qualityShares({ X, baseShare, delta: X / (X + cfg.quality.h) }, cfg));
    assert.ok(mean <= prev + 1e-12, `não cresce em X = ${X}`);
    assert.ok(mean >= meanConversion(cfg.quality.degradedShares) - 1e-12, 'nunca abaixo da conversão da distribuição degradada');
    prev = mean;
    if (X === 0) near(mean, 0.332);
    if (X === 2) near(mean, 0.3082, 5e-4); // conversão efetiva do favorito com +200% de força
  }
});

test('chanceCategory: 0 baixa, 1 média, 2 alta, com as fronteiras nas somas acumuladas', () => {
  const shares: [number, number, number] = [0.35, 0.35, 0.3];
  assert.equal(chanceCategory(shares, 0), 0);
  assert.equal(chanceCategory(shares, 0.3499), 0);
  assert.equal(chanceCategory(shares, 0.35), 1);
  assert.equal(chanceCategory(shares, 0.6999), 1);
  assert.equal(chanceCategory(shares, 0.7), 2);
  assert.equal(chanceCategory(shares, 0.9999), 2);
});

// ---------- Camada de qualidade: contexto no jogo ----------

test('chanceQualityContext: só um lado tem vantagem de força; quem não é favorito mantém X = 0 e todas as chances "de equilíbrio"', () => {
  const s = createMatch(matchInput('qualidade-1', { home: 0, away: 7 }));
  const ratio = 1; // a razão só entra em baseShare; 1 basta para verificar a estrutura
  const qh = chanceQualityContext(s.home, s.away, ratio, cfg);
  const qa = chanceQualityContext(s.away, s.home, ratio, cfg);
  assert.equal(Math.min(qh.X, qa.X), 0, 'o time mais fraco tem X = 0');
  const [weak, strong] = qh.X === 0 ? [qh, qa] : [qa, qh];
  assert.equal(weak.baseShare, 1);
  assert.equal(weak.delta, 0);
  if (strong.X > 0) {
    assert.ok(strong.baseShare < 1, 'o favorito tem chances adicionais');
    assert.ok(strong.delta > 0 && strong.delta < 1);
    near(strong.delta, strong.X / (strong.X + cfg.quality.h));
  }
});

test('computeRates: só traz o contexto de qualidade com a camada ligada; volume de chances não depende dela', () => {
  const s = createMatch(matchInput('qualidade-2'));
  const on = computeRates(s, cfg);
  const off = computeRates(s, noQuality);
  assert.ok(on.home.quality && on.away.quality);
  assert.equal(off.home.quality, undefined);
  assert.equal(off.away.quality, undefined);
  for (const side of ['home', 'away'] as const) {
    assert.equal(on[side].chancesPerMatch, off[side].chancesPerMatch, 'a camada só muda a conversão de cada chance, nunca quantas chances existem');
    assert.equal(on[side].conversion, off[side].conversion, 'conversão-base (goleiro adversário) inalterada');
  }
});

// ---------- Determinismo e contrato de RNG ----------

function playFirstHalfUntil(input: MatchInput, config: EngineConfig, minute: number): MatchState {
  let s = createMatch(input, config);
  for (let guard = 0; guard < 500; guard++) {
    if (s.status === 'FINISHED') break;
    if (s.status === 'AWAITING_DECISION') {
      s = resolveOpenDecision(s, undefined, config);
      continue;
    }
    if (s.clock.half === 1 && s.clock.minute >= minute) break;
    s = step(s, config);
  }
  return s;
}

test('determinismo com a camada ligada: mesma seed + mesmos dados + mesmas decisões = mesmo resultado', () => {
  for (const seed of ['det-1', 'det-2', 'det-3', 'det-4']) {
    const a = simulateMatch(matchInput(seed));
    const b = simulateMatch(matchInput(seed));
    assert.deepStrictEqual(a, b);
    assert.equal(a.engineVersion, '0.2.0');
  }
});

test('a categoria de qualidade (canal CHANCE, ocorrência 3) não desloca nenhum outro sorteio: chances, cartões, lesões e pênaltis são os mesmos com a camada ligada e desligada', () => {
  let outcomesDiffer = 0;
  for (let i = 1; i <= 25; i++) {
    const input = matchInput(`rng-${i}`);
    const on = playFirstHalfUntil(input, cfg, 40);
    const off = playFirstHalfUntil(input, noQuality, 40);
    for (const side of ['home', 'away'] as const) {
      for (const k of ['chances', 'yellowCards', 'redCards', 'injuries', 'penalties'] as const) {
        assert.equal(on.stats[side][k], off.stats[side][k], `rng-${i} ${side} ${k}`);
      }
    }
    if (on.stats.home.goals !== off.stats.home.goals || on.stats.away.goals !== off.stats.away.goals) outcomesDiffer++;
  }
  assert.ok(outcomesDiffer > 0, 'a camada está ativa: o resultado das chances muda em pelo menos uma das partidas');
});
