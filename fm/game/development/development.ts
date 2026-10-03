// PROTÓTIPO — PlayerDevelopment (evolução contextual de força). NÃO integrado ao jogo: nenhum módulo de game/, app/ ou
// engine/ importa este arquivo. Serve para projetar e SIMULAR (scripts/simulate-development*.ts, docs/PLAYER-DEVELOPMENT.md)
// antes de qualquer implementação definitiva. A evolução em uso continua sendo game/manager/progression.ts.
//
// Princípio (referência histórica do Elifoot 98; nada copiado): a força só muda pouco a pouco, por ACÚMULO de
// rendimento rodada a rodada, no máximo ±1 por janela. O nível do clube é AMBIENTE: dá OPORTUNIDADE de
// desenvolvimento e um limite contextual para o ganho, nunca uma força-alvo. Contratação ≠ aumento de força.
// Determinístico: sem RNG, sem relógio; a mesma sequência de jogos gera a mesma evolução.

export type DevPosition = 'GOL' | 'DEF' | 'MEI' | 'ATA';

/** O que uma partida diz sobre o jogador. Tudo derivável dos eventos que o engine já produz (sem mudar o engine). */
export interface MatchEvidence {
  /** relacionado e entrou em campo */
  played: boolean;
  /** minutos em campo (0–90), das substituições/expulsões/lesões da partida */
  minutes: number;
  started: boolean;
  goals: number;
  /** defesas registradas (eventos SAVE do goleiro) */
  saves: number;
  teamGoalsFor: number;
  teamGoalsAgainst: number;
  redCard: boolean;
  /** fora da rodada por lesão (não conta como "sem jogar") */
  injured: boolean;
}

/** Curva por pontos [idade, valor], interpolada linearmente; fora das pontas vale a ponta. */
export type Curve = readonly (readonly [number, number])[];

export interface DevelopmentConfig {
  version: string;
  /** rodadas por janela de desenvolvimento: só no fim da janela a força muda, no máximo ±1 */
  windowRounds: number;
  /** última rodada da temporada (fecha a janela incompleta) */
  seasonRounds: number;
  /** acúmulo máximo dentro de uma janela (não se "guarda" evolução) */
  accumulatorCap: number;
  /** tendência de desenvolvimento por idade, por rodada (curva suave; negativa = envelhecimento) */
  ageTrend: Curve;
  /** quanto do envelhecimento um bom rendimento compensa (0–1), na rodada em que o jogador joga bem */
  agingCompensation: number;
  /** margem do limite contextual sobre o ambiente, por idade (referência histórica: o Elifoot usa uma margem fixa) */
  ceilingMargin: Curve;
  /** distância ao limite em que o ganho começa a diminuir */
  ceilingTaper: number;
  /** oportunidade do ambiente: fator do ganho abaixo do ambiente (mín. → máx. conforme a distância) e acima dele */
  opportunity: { atEnvironment: number; farBelow: number; farBelowGap: number; aboveEnvironment: number };
  /** peso do rendimento da partida (−1…+1) */
  performanceWeight: number;
  /** rodadas seguidas sem jogar (sem lesão) a partir das quais o jogador perde ritmo */
  idleRoundsBeforeDecline: number;
  idleDeclinePerRound: number;
  idleMinAge: number;
  /** goleiro: fração do ganho (evolui mais devagar) */
  goalkeeperGainFactor: number;
  /** jogadores que formam o "nível do ambiente" (os N mais fortes do elenco) */
  environmentCore: number;
  /** teto opcional de subidas por temporada (null = sem teto; só para teste de calibração) */
  seasonGainCap: number | null;
  // ---- campos da DEV-PROTO-0.3 (inertes na 0.2) ----
  /** peso do nível da DIVISÃO no contexto (0 = só o elenco). Afeta só oportunidade e limite, nunca a força direto. */
  divisionWeight: number;
  /** perda máxima por inatividade numa temporada, em pontos (null = sem limite, como na 0.2) */
  idleSeasonCap: number | null;
  /** envelhecimento também nas rodadas sem jogar (true na 0.2; false = idade só pesa quando o jogador participa) */
  agingWhenNotPlayed: boolean;
}

/** DEV-PROTO-0.2 (calibração de 03/10/2026). Valores em teste; nada aqui é definitivo. */
export const DEVELOPMENT_PROTO: DevelopmentConfig = Object.freeze({
  version: 'DEV-PROTO-0.2',
  windowRounds: 5,
  seasonRounds: 38,
  accumulatorCap: 1.5,
  ageTrend: Object.freeze([[18, 0.08], [21, 0.07], [24, 0.05], [27, 0.02], [29, 0], [32, -0.02], [35, -0.04], [38, -0.06]] as const),
  agingCompensation: 0.7,
  ceilingMargin: Object.freeze([[20, 5], [24, 4], [27, 2], [30, 0], [33, -2]] as const),
  ceilingTaper: 3,
  opportunity: Object.freeze({ atEnvironment: 0.6, farBelow: 1, farBelowGap: 12, aboveEnvironment: 0.5 }),
  performanceWeight: 0.1,
  idleRoundsBeforeDecline: 6,
  idleDeclinePerRound: 0.04,
  idleMinAge: 23,
  goalkeeperGainFactor: 0.75,
  environmentCore: 16,
  seasonGainCap: null,
  divisionWeight: 0,
  idleSeasonCap: null,
  agingWhenNotPlayed: true,
}) as DevelopmentConfig;

export type Proto03Variant = 'A' | 'B' | 'C';
/**
 * DEV-PROTO-0.3 (calibração; não integrada). Mesma fórmula da 0.2 com duas mudanças:
 * 1) inatividade com limite — A: perda por inatividade de no máximo 1 ponto por temporada; B: no máximo 0,5;
 *    C: nenhuma perda direta por inatividade e envelhecimento só nas rodadas em que o jogador participa;
 * 2) contexto = 50% ambiente do elenco + 50% nível da divisão (média dos ambientes dos clubes dela), usado SÓ para
 *    oportunidade e limite do ganho. A divisão nunca soma força.
 */
export function devProto03(variant: Proto03Variant): DevelopmentConfig {
  return Object.freeze({
    ...DEVELOPMENT_PROTO,
    version: `DEV-PROTO-0.3-${variant}`,
    divisionWeight: 0.5,
    idleSeasonCap: variant === 'A' ? 1 : variant === 'B' ? 0.5 : 0,
    agingWhenNotPlayed: variant !== 'C',
  }) as DevelopmentConfig;
}

/** Estado de desenvolvimento de um jogador: três números além do histórico (nada de atributos ocultos extras). */
export interface PlayerDevelopment {
  playerId: string;
  /** força inicial (EM-RATING para jogador real; geração do mundo para o fictício). Nunca muda. */
  strengthBase: number;
  /** força usada pelo jogo (o engine leria só esta, como Player.strength). */
  strengthCurrent: number;
  /** pontos acumulados na janela atual */
  progress: number;
  /** rodadas seguidas sem jogar (sem contar lesão) */
  idleRounds: number;
  /** 0.3: perda por inatividade já aplicada na temporada (para o limite por temporada) */
  idleLoss?: { season: number; points: number };
  history: DevelopmentEvent[];
}

export interface DevelopmentEvent {
  season: number;
  round: number;
  from: number;
  to: number;
  reason: string;
  context: { environmentLevel: number; ceiling: number; age: number; windowPoints: number };
}

export interface RoundContext {
  season: number;
  round: number;
  age: number;
  position: DevPosition;
  /** nível do ambiente: média de força dos N mais fortes do elenco atual do clube */
  environmentLevel: number;
  /** 0.3: nível da divisão do clube (média dos ambientes dos clubes da divisão); ignorado se divisionWeight = 0 */
  divisionLevel?: number | null;
  evidence: MatchEvidence;
}

/** Contexto de desenvolvimento: ambiente do elenco, misturado ao nível da divisão quando a configuração pede (0.3). */
export function contextLevel(ctx: Pick<RoundContext, 'environmentLevel' | 'divisionLevel'>, cfg: DevelopmentConfig = DEVELOPMENT_PROTO): number {
  if (!cfg.divisionWeight || ctx.divisionLevel === null || ctx.divisionLevel === undefined) return ctx.environmentLevel;
  return (1 - cfg.divisionWeight) * ctx.environmentLevel + cfg.divisionWeight * ctx.divisionLevel;
}

/** Decomposição dos pontos de uma rodada (para auditoria e para medir o efeito de cada fator). */
export interface RoundBreakdown {
  points: number;
  /** parte positiva da idade (desenvolvimento) já multiplicada pelos minutos e pelo ambiente */
  age: number;
  /** rendimento da partida (positivo ou negativo) */
  performance: number;
  /** envelhecimento (≤ 0), já com a compensação do rendimento */
  aging: number;
  /** perda de ritmo por ficar parado (≤ 0) */
  idle: number;
  /** fator de oportunidade aplicado ao ganho (0 = sem espaço) */
  opportunity: number;
  ceiling: number;
  idleRounds: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r4 = (v: number) => Math.round(v * 1e4) / 1e4;

export function curveAt(curve: Curve, x: number): number {
  if (x <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    const [x1, y1] = curve[i];
    const [x0, y0] = curve[i - 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return curve[curve.length - 1][1];
}

export function newDevelopment(playerId: string, strengthBase: number): PlayerDevelopment {
  return { playerId, strengthBase, strengthCurrent: strengthBase, progress: 0, idleRounds: 0, history: [] };
}

/** Nível do ambiente: média dos N mais fortes do elenco (o clube como ambiente, não a divisão). */
export function environmentLevel(squadStrengths: readonly number[], cfg: DevelopmentConfig = DEVELOPMENT_PROTO): number {
  const top = [...squadStrengths].sort((a, b) => b - a).slice(0, cfg.environmentCore);
  return top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0;
}

/** Limite contextual do GANHO: ambiente + margem por idade (≤ 50). Não é alvo: acima dele só não se ganha. */
export function developmentCeiling(envLevel: number, age: number, cfg: DevelopmentConfig = DEVELOPMENT_PROTO): number {
  return Math.min(50, Math.round(envLevel + curveAt(cfg.ceilingMargin, age)));
}

/** Oportunidade do ambiente (multiplica o ganho): maior quanto mais abaixo do ambiente; acima dele, reduzida. */
export function opportunityFactor(strength: number, envLevel: number, ceiling: number, cfg: DevelopmentConfig = DEVELOPMENT_PROTO): number {
  if (strength >= ceiling) return 0;
  const o = cfg.opportunity;
  const gap = envLevel - strength;
  const base = gap >= 0 ? o.atEnvironment + (o.farBelow - o.atEnvironment) * clamp(gap / o.farBelowGap, 0, 1) : o.aboveEnvironment;
  return base * clamp((ceiling - strength) / cfg.ceilingTaper, 0, 1);
}

/** Rendimento da partida em −1…+1, só com o que a partida registra. */
export function matchPerformance(e: MatchEvidence, position: DevPosition): number {
  if (!e.played) return 0;
  let s = e.teamGoalsFor > e.teamGoalsAgainst ? 0.2 : e.teamGoalsFor < e.teamGoalsAgainst ? -0.2 : 0;
  if (position === 'GOL') {
    s += e.teamGoalsAgainst === 0 ? 0.5 : e.teamGoalsAgainst >= 3 ? -0.4 : 0;
    s += Math.min(0.3, 0.1 * e.saves);
  } else if (position === 'DEF') {
    s += e.teamGoalsAgainst === 0 ? 0.3 : e.teamGoalsAgainst >= 3 ? -0.3 : 0;
    s += Math.min(0.4, 0.4 * e.goals);
  } else {
    s += Math.min(0.8, (position === 'ATA' ? 0.4 : 0.5) * e.goals);
    if (position === 'ATA' && e.goals === 0 && e.minutes >= 60) s -= 0.1;
  }
  if (e.redCard) s -= 0.5;
  return clamp(s, -1, 1);
}

/** Pontos de uma rodada (pós-jogo), com a decomposição. */
export function roundPoints(dev: PlayerDevelopment, ctx: RoundContext, cfg: DevelopmentConfig = DEVELOPMENT_PROTO): RoundBreakdown {
  const env = contextLevel(ctx, cfg);
  const ceiling = developmentCeiling(env, ctx.age, cfg);
  const e = ctx.evidence;
  const idleRounds = e.played ? 0 : e.injured ? dev.idleRounds : dev.idleRounds + 1;
  const trend = curveAt(cfg.ageTrend, ctx.age);
  let age = 0;
  let performance = 0;
  let opportunity = 0;
  let aging = 0;
  let idle = 0;
  const perf = matchPerformance(e, ctx.position);
  if (e.played) {
    const share = clamp(e.minutes / 90, 0, 1);
    const devPart = share * Math.max(0, trend);
    const perfPart = share * cfg.performanceWeight * perf;
    opportunity = opportunityFactor(dev.strengthCurrent, env, ceiling, cfg) * (ctx.position === 'GOL' ? cfg.goalkeeperGainFactor : 1);
    if (opportunity === 0) {
      // sem espaço para crescer (no limite contextual ou acima): o rendimento conta COM SINAL — jogos bons compensam
      // os ruins — e o acumulador não guarda crédito de ganho (developRound). Assim o ambiente fraco não derruba
      // ninguém por si só; só um rendimento ruim persistente derruba.
      performance = perfPart;
    } else if (devPart + perfPart > 0) {
      // ganho: só com minutos, multiplicado pela oportunidade do ambiente
      age = devPart * opportunity;
      performance = perfPart * opportunity;
    } else performance = devPart + perfPart; // rodada ruim: pesa inteira
  }
  if (trend < 0 && (e.played || cfg.agingWhenNotPlayed)) aging = trend * (e.played ? 1 - cfg.agingCompensation * Math.max(0, perf) * clamp(e.minutes / 90, 0, 1) : 1);
  if (!e.played && !e.injured && idleRounds > cfg.idleRoundsBeforeDecline && ctx.age >= cfg.idleMinAge) {
    idle = -cfg.idleDeclinePerRound;
    if (cfg.idleSeasonCap !== null) {
      const spent = dev.idleLoss?.season === ctx.season ? dev.idleLoss.points : 0;
      idle = Math.max(idle, -Math.max(0, cfg.idleSeasonCap - spent));
    }
  }
  return { points: r4(age + performance + aging + idle), age: r4(age), performance: r4(performance), aging: r4(aging), idle: r4(idle), opportunity: r4(opportunity), ceiling, idleRounds };
}

/** Uma rodada: acumula pontos; no fim da janela aplica no máximo ±1 (nunca mais). */
export function developRound(dev: PlayerDevelopment, ctx: RoundContext, cfg: DevelopmentConfig = DEVELOPMENT_PROTO): PlayerDevelopment {
  const b = roundPoints(dev, ctx, cfg);
  // no limite contextual (ou acima), o acumulador não guarda crédito de ganho: só pode ficar em 0 ou negativo
  const upper = dev.strengthCurrent >= b.ceiling ? 0 : cfg.accumulatorCap;
  let progress = clamp(r4(dev.progress + b.points), -cfg.accumulatorCap, upper);
  let strengthCurrent = dev.strengthCurrent;
  let event: DevelopmentEvent | null = null;
  if (ctx.round % cfg.windowRounds === 0 || ctx.round === cfg.seasonRounds) {
    let step = progress >= 1 ? 1 : progress <= -1 ? -1 : 0;
    if (step === 1 && strengthCurrent >= b.ceiling) step = 0; // nunca ganha acima do limite contextual
    if (step === 1 && cfg.seasonGainCap !== null && dev.history.filter((h) => h.season === ctx.season && h.to > h.from).length >= cfg.seasonGainCap) step = 0;
    const to = clamp(strengthCurrent + step, 1, 50);
    if (to !== strengthCurrent) {
      const reason = step > 0 ? 'evolução: jogou, rendeu e havia espaço no ambiente' : b.idleRounds > cfg.idleRoundsBeforeDecline ? 'queda: muito tempo sem jogar' : b.aging < 0 && b.performance >= 0 ? 'queda: idade' : 'queda: rendimento';
      event = { season: ctx.season, round: ctx.round, from: strengthCurrent, to, reason, context: { environmentLevel: r4(contextLevel(ctx, cfg)), ceiling: b.ceiling, age: ctx.age, windowPoints: progress } };
      progress = r4(progress - step);
      strengthCurrent = to;
    }
    // a sobra passa adiante, mas nunca vira um segundo passo
    progress = clamp(progress, -0.99, 0.99);
  }
  const next: PlayerDevelopment = { ...dev, strengthCurrent, progress, idleRounds: b.idleRounds, history: event ? [...dev.history, event] : dev.history };
  if (cfg.idleSeasonCap !== null && b.idle < 0) next.idleLoss = { season: ctx.season, points: r4((dev.idleLoss?.season === ctx.season ? dev.idleLoss.points : 0) - b.idle) };
  return next;
}
