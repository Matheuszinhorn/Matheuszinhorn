// EM-RATING-2.0 (EXPERIMENTAL) — metodologia PRÓPRIA de força do ELITE MANAGER (docs/PLAYER-RATINGS.md).
// Usa só fatos da CBF já coletados (idade, temporadas com registro, partidas e gols da temporada) e posição de
// fonte declarada (curadoria). Nenhum rating de terceiros (EA FC, Flashscore, Opta, Transfermarkt, SofaScore...).
// Função pura: sem random, sem seed, sem data do relógio, sem rede. Mesma entrada + mesma versão = mesma força.
// A força é uma abstração do jogo, não uma medida de "talento real". Nada aqui é aplicado aos jogadores: só simulado.

import type { UniversePosition } from '../model.ts';

export const EM_RATING_2_VERSION = 'EM-RATING-2.0';

/** Componentes da fórmula, todos normalizados em 0–1. */
export type ComponentId = 'participation' | 'experience' | 'recency' | 'age' | 'production' | 'context';
export const COMPONENTS: readonly ComponentId[] = ['participation', 'experience', 'recency', 'age', 'production', 'context'];

export interface EmRating2Config {
  version: string;
  /** peso de cada componente (a soma dos pesos efetivos normaliza o índice; não precisa somar 1) */
  weights: Record<ComponentId, number>;
  /**
   * âncoras de produção por posição, em gols por partida ajustados (gols ÷ (partidas + prior)):
   * 0 gols → 0; "typical" → 0,5; "high" → 1 (interpolação linear). Valores fixos da versão, medidos uma vez na base
   * CBF 2026 (mediana e p90 da posição entre quem tem 10+ partidas) e documentados; não são recalculados a cada execução.
   */
  productionAnchors: Record<Exclude<UniversePosition, 'GOL'>, { typical: number; high: number }>;
  /** goleiro: produção fixa no ponto neutro (gols não contam, nem a favor nem contra) */
  goalkeeperProduction: number;
  /** partidas somadas ao denominador dos gols: 1 gol em 1 jogo não vira "artilheiro" */
  productionPriorMatches: number;
  /** experiência = (1 − e^(−temporadas/meiaVida)) normalizada para valer 1 em maxSeasons */
  experienceHalfLife: number;
  /** teto de temporadas observáveis (a base da CBF começa em 2013) */
  maxSeasons: number;
  /** quantas temporadas mais recentes (até a do snapshot) contam para a recência */
  recencyWindow: number;
  /** curva de idade (moderada): pontos [idade, valor] interpolados linearmente; fora das pontas, o valor da ponta */
  ageCurve: readonly (readonly [number, number])[];
  /** contexto competitivo por competição em que o atleta está inscrito; 2.0 NÃO diferencia divisões */
  contextByCompetition: Record<string, number>;
}

export const EM_RATING_2_0: EmRating2Config = Object.freeze({
  version: EM_RATING_2_VERSION,
  weights: Object.freeze({ participation: 0.4, experience: 0.2, recency: 0.1, age: 0.1, production: 0.15, context: 0.05 }),
  productionAnchors: Object.freeze({ ATA: { typical: 0.075, high: 0.26 }, MEI: { typical: 0.03, high: 0.12 }, DEF: { typical: 0.025, high: 0.09 } }),
  goalkeeperProduction: 0.5,
  productionPriorMatches: 5,
  experienceHalfLife: 4,
  maxSeasons: 14,
  recencyWindow: 3,
  ageCurve: Object.freeze([[17, 0.6], [24, 1], [31, 1], [40, 0.6]] as const),
  contextByCompetition: Object.freeze({ 'brasileirao-a': 1, 'brasileirao-b': 1, 'brasileirao-c': 1, 'brasileirao-d': 1 }),
}) as EmRating2Config;

/** Fatos de entrada. null = ausente na fonte (nunca estimado). */
export interface Rating2Input {
  playerId: string;
  age: number | null;
  /** anos com registro do atleta na CBF (ex.: ["2023","2024","2025","2026"]) */
  seasons: readonly number[] | null;
  /** temporada do snapshot (ex.: 2026): referência fixa da recência, nunca a data do relógio */
  snapshotSeason: number;
  /** partidas e gols na temporada do snapshot (página da competição na CBF) */
  matches: number | null;
  goals: number | null;
  /** maior número de partidas entre os atletas do mesmo clube na mesma base (escala da participação) */
  clubReferenceMatches: number | null;
  position: UniversePosition | null;
  /** de onde veio a posição (ex.: "curadoria"); null quando não há posição */
  positionSource: string | null;
  /** competição de inscrição (id curto, ex.: "brasileirao-a") */
  competition: string | null;
}

export interface ComponentTrace {
  value: number | null; // 0–1; null = não avaliado
  weight: number; // peso efetivo usado (0 se não avaliado)
  detail: string;
}

export interface Rating2Result {
  playerId: string;
  methodVersion: string;
  strength: number | null; // null = dados insuficientes
  index: number | null; // 0–1
  components: Record<ComponentId, ComponentTrace>;
  flags: string[];
}

export const STRENGTH_MIN = 1;
export const STRENGTH_MAX = 50;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** arredondamento estável (evita 0.49999999 por ponto flutuante) */
const round = (v: number, d = 6) => Math.round(v * 10 ** d) / 10 ** d;

/** Curva de idade (interpolação linear entre os pontos da configuração). */
export function ageValue(age: number, curve: EmRating2Config['ageCurve']): number {
  if (age <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    const [a1, v1] = curve[i];
    const [a0, v0] = curve[i - 1];
    if (age <= a1) return v0 + ((v1 - v0) * (age - a0)) / (a1 - a0);
  }
  return curve[curve.length - 1][1];
}

/** Experiência: retorno decrescente por temporada, 1 no teto observável. */
export function experienceValue(seasons: number, cfg: EmRating2Config): number {
  const f = (s: number) => 1 - Math.exp(-s / cfg.experienceHalfLife);
  return clamp01(f(Math.min(seasons, cfg.maxSeasons)) / f(cfg.maxSeasons));
}

/** Participação na temporada: raiz da fração de partidas (retorno decrescente). */
export function participationValue(matches: number, reference: number): number {
  return Math.sqrt(clamp01(matches / reference));
}

/** Produção: gols por partida com "prior" no denominador, comparada às âncoras da posição (goleiro: neutro fixo). */
export function productionValue(goals: number, matches: number, position: UniversePosition, cfg: EmRating2Config): number {
  if (position === 'GOL') return cfg.goalkeeperProduction;
  const { typical, high } = cfg.productionAnchors[position];
  const rate = goals / (matches + cfg.productionPriorMatches);
  return rate <= typical ? 0.5 * (rate / typical) : clamp01(0.5 + (0.5 * (rate - typical)) / (high - typical));
}

/** Força EM-RATING-2.0 (pura). */
export function strengthV2(i: Rating2Input, cfg: EmRating2Config = EM_RATING_2_0): Rating2Result {
  const flags: string[] = [];
  const c = {} as Record<ComponentId, ComponentTrace>;
  const off = (detail: string): ComponentTrace => ({ value: null, weight: 0, detail });
  const on = (id: ComponentId, value: number, detail: string): ComponentTrace => ({ value: round(value), weight: cfg.weights[id], detail });

  // participação (temporada do snapshot)
  if (i.matches === null || i.clubReferenceMatches === null || i.clubReferenceMatches <= 0) {
    c.participation = off('partidas da temporada ausentes');
    flags.push('PARTIDAS_AUSENTES');
  } else c.participation = on('participation', participationValue(i.matches, i.clubReferenceMatches), `√(${i.matches}/${i.clubReferenceMatches})`);

  // experiência e recência (anos com registro na CBF)
  const seasons = i.seasons ? [...new Set(i.seasons.filter((y) => Number.isInteger(y) && y <= i.snapshotSeason))] : null;
  if (!seasons || seasons.length === 0) {
    c.experience = off('temporadas ausentes');
    c.recency = off('temporadas ausentes');
    flags.push('TEMPORADAS_AUSENTES');
  } else {
    c.experience = on('experience', experienceValue(seasons.length, cfg), `${seasons.length} temporada(s) com registro (teto ${cfg.maxSeasons})`);
    const recent = seasons.filter((y) => y > i.snapshotSeason - cfg.recencyWindow).length;
    c.recency = on('recency', recent / cfg.recencyWindow, `${recent} de ${cfg.recencyWindow} temporadas recentes`);
  }

  // idade (moderada)
  if (i.age === null) {
    c.age = off('idade ausente');
    flags.push('IDADE_AUSENTE');
  } else c.age = on('age', ageValue(i.age, cfg.ageCurve), `${i.age} anos`);

  // produção (só com posição de fonte declarada; goleiro não ganha nem perde por gols)
  if (i.position === null) {
    c.production = off('posição ausente: produção não avaliada');
    flags.push('POSICAO_AUSENTE');
  } else if (i.position === 'GOL') {
    c.production = on('production', cfg.goalkeeperProduction, `GOL: neutro fixo (gols não contam; fonte da posição: ${i.positionSource})`);
  } else if (i.matches === null || i.goals === null) {
    c.production = off('gols ou partidas ausentes');
    flags.push('GOLS_AUSENTES');
  } else {
    const a = cfg.productionAnchors[i.position];
    c.production = on('production', productionValue(i.goals, i.matches, i.position, cfg), `${i.goals} gol(s) em ${i.matches} partida(s); ${i.position}: típico ${a.typical}, alto ${a.high} gol/jogo ajustado (fonte da posição: ${i.positionSource})`);
  }

  // contexto (constante entre divisões na 2.0)
  const ctx = i.competition === null ? undefined : cfg.contextByCompetition[i.competition];
  if (ctx === undefined) {
    c.context = off('competição ausente ou sem regra');
    flags.push('CONTEXTO_AUSENTE');
  } else c.context = on('context', ctx, `inscrito em ${i.competition}`);

  const core = c.participation.value !== null && c.experience.value !== null;
  if (!core) {
    flags.push('DADOS_INSUFICIENTES');
    return { playerId: i.playerId, methodVersion: cfg.version, strength: null, index: null, components: c, flags };
  }
  let num = 0;
  let den = 0;
  for (const id of COMPONENTS) {
    if (c[id].value === null) continue;
    num += c[id].value! * c[id].weight;
    den += c[id].weight;
  }
  const index = round(num / den);
  const strength = Math.max(STRENGTH_MIN, Math.min(STRENGTH_MAX, Math.round(round(1 + 49 * index, 4))));
  return { playerId: i.playerId, methodVersion: cfg.version, strength, index, components: c, flags };
}

/** Mesma configuração com pesos alterados (análise de sensibilidade). */
export function withWeights(cfg: EmRating2Config, change: Partial<Record<ComponentId, number>>): EmRating2Config {
  return { ...cfg, weights: { ...cfg.weights, ...change } };
}
