// PROTÓTIPO — PlayerDevelopment (evolução contextual de força). NÃO integrado ao jogo: nenhum módulo de game/, app/ ou
// engine/ importa este arquivo. Serve para projetar e SIMULAR (scripts/simulate-development.ts, docs/PLAYER-DEVELOPMENT.md)
// antes de qualquer implementação definitiva. A evolução em uso continua sendo game/manager/progression.ts.
//
// Princípio (inspirado no Elifoot 98, sem copiar código): a força só muda pouco a pouco, rodada a rodada pelo
// rendimento, e o nível do clube funciona como AMBIENTE de desenvolvimento (um teto para crescer), nunca como bônus.
// Contratação ≠ aumento de força. Determinístico: sem RNG, sem relógio; mesma sequência de jogos = mesma evolução.

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

export interface DevelopmentConfig {
  version: string;
  /** rodadas por janela de desenvolvimento: só no fim da janela a força muda, no máximo ±1 */
  windowRounds: number;
  /** última rodada da temporada (fecha a janela incompleta) */
  seasonRounds: number;
  /** acúmulo máximo (evita "guardar" evolução para várias janelas) */
  accumulatorCap: number;
  /** tendência por idade, por rodada (pontos de desenvolvimento) */
  ageTrend: readonly (readonly [maxAge: number, perRound: number])[];
  /** margem do teto sobre o nível do ambiente, por idade (promessa tem mais espaço) */
  ceilingMargin: readonly (readonly [maxAge: number, margin: number])[];
  /** distância ao teto em que o crescimento fica pleno (perto do teto, cresce devagar) */
  fullGrowthGap: number;
  /** peso do rendimento da partida (−1…+1) nos pontos da rodada */
  performanceWeight: number;
  /** rodadas seguidas sem jogar (sem lesão) a partir das quais o jogador começa a perder ritmo */
  idleRoundsBeforeDecline: number;
  /** perda por rodada parada além do limite (só a partir de idleMinAge) */
  idleDeclinePerRound: number;
  idleMinAge: number;
  /** goleiro: fração do ganho (o goleiro evolui mais devagar) */
  goalkeeperGainFactor: number;
  /** jogadores que formam o "nível do ambiente" (os N mais fortes do elenco) */
  environmentCore: number;
}

export const DEVELOPMENT_PROTO: DevelopmentConfig = Object.freeze({
  version: 'DEV-PROTO-0.1',
  windowRounds: 5,
  seasonRounds: 38,
  accumulatorCap: 1.5,
  ageTrend: Object.freeze([[21, 0.14], [24, 0.09], [28, 0.04], [30, 0], [32, -0.03], [99, -0.06]] as const),
  ceilingMargin: Object.freeze([[21, 6], [24, 4], [28, 2], [30, 0], [99, -2]] as const),
  fullGrowthGap: 6,
  performanceWeight: 0.15,
  idleRoundsBeforeDecline: 6,
  idleDeclinePerRound: 0.05,
  idleMinAge: 23,
  goalkeeperGainFactor: 0.75,
  environmentCore: 16,
}) as DevelopmentConfig;

/** Estado de desenvolvimento de um jogador. Só três números além do histórico: nada de atributos ocultos extras. */
export interface PlayerDevelopment {
  playerId: string;
  /** força inicial (EM-RATING para jogador real; geração do mundo para o fictício). Nunca muda. */
  strengthBase: number;
  /** força usada pelo jogo (o engine leria só esta, como Player.strength). */
  strengthCurrent: number;
  /** pontos acumulados na janela atual (−cap…+cap) */
  progress: number;
  /** rodadas seguidas sem jogar (sem contar lesão) */
  idleRounds: number;
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
  evidence: MatchEvidence;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
const byAge = (table: DevelopmentConfig['ageTrend'], age: number) => (table.find(([max]) => age <= max) ?? table[table.length - 1])[1];

export function newDevelopment(playerId: string, strengthBase: number): PlayerDevelopment {
  return { playerId, strengthBase, strengthCurrent: strengthBase, progress: 0, idleRounds: 0, history: [] };
}

/** Nível do ambiente: média dos N mais fortes do elenco (o clube como ambiente, não a divisão). */
export function environmentLevel(squadStrengths: readonly number[], cfg: DevelopmentConfig = DEVELOPMENT_PROTO): number {
  const top = [...squadStrengths].sort((a, b) => b - a).slice(0, cfg.environmentCore);
  return top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0;
}

/** Teto de desenvolvimento: ambiente + margem por idade (limitado a 50). Não é alvo: é até onde o ganho é possível. */
export function developmentCeiling(envLevel: number, age: number, cfg: DevelopmentConfig = DEVELOPMENT_PROTO): number {
  return Math.min(50, Math.round(envLevel + byAge(cfg.ceilingMargin, age)));
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

/**
 * Pontos de desenvolvimento de uma rodada (pós-jogo). Ganho só para quem jogou (proporcional aos minutos) e só
 * enquanto estiver abaixo do teto do ambiente; perda por idade, por rendimento ruim ou por ficar parado.
 */
export function roundPoints(dev: PlayerDevelopment, ctx: RoundContext, cfg: DevelopmentConfig = DEVELOPMENT_PROTO): { points: number; ceiling: number; idleRounds: number } {
  const ceiling = developmentCeiling(ctx.environmentLevel, ctx.age, cfg);
  const e = ctx.evidence;
  const idleRounds = e.played ? 0 : e.injured ? dev.idleRounds : dev.idleRounds + 1;
  const trend = byAge(cfg.ageTrend, ctx.age);
  let points = 0;
  if (e.played) {
    const share = clamp(e.minutes / 90, 0, 1);
    const perf = matchPerformance(e, ctx.position);
    const raw = share * (Math.max(0, trend) + cfg.performanceWeight * perf);
    if (raw > 0) {
      // ganho limitado pelo ambiente: pleno longe do teto, cada vez menor perto dele, nenhum acima dele
      const room = clamp((ceiling - dev.strengthCurrent) / cfg.fullGrowthGap, 0, 1);
      points += raw * room * (ctx.position === 'GOL' ? cfg.goalkeeperGainFactor : 1);
    } else points += raw; // rendimento ruim pesa mesmo acima do teto
  }
  if (trend < 0) points += trend * (e.played ? 1 : 0.5); // idade: declínio lento, mais lento para quem não joga (menos desgaste)
  if (!e.played && !e.injured && idleRounds > cfg.idleRoundsBeforeDecline && ctx.age >= cfg.idleMinAge) points -= cfg.idleDeclinePerRound;
  return { points: r4(points), ceiling, idleRounds };
}

/** Uma rodada: acumula pontos; no fim da janela aplica no máximo ±1 (nunca mais). */
export function developRound(dev: PlayerDevelopment, ctx: RoundContext, cfg: DevelopmentConfig = DEVELOPMENT_PROTO): PlayerDevelopment {
  const { points, ceiling, idleRounds } = roundPoints(dev, ctx, cfg);
  let progress = clamp(r4(dev.progress + points), -cfg.accumulatorCap, cfg.accumulatorCap);
  let strengthCurrent = dev.strengthCurrent;
  const history = dev.history;
  const endOfWindow = ctx.round % cfg.windowRounds === 0 || ctx.round === cfg.seasonRounds;
  let event: DevelopmentEvent | null = null;
  if (endOfWindow) {
    let step = progress >= 1 ? 1 : progress <= -1 ? -1 : 0;
    if (step === 1 && strengthCurrent >= ceiling) step = 0; // nunca passa do teto do ambiente
    const to = clamp(strengthCurrent + step, 1, 50);
    if (to !== strengthCurrent) {
      const reason = step > 0 ? 'evolução: jogou, rendeu e havia espaço no ambiente' : idleRounds > cfg.idleRoundsBeforeDecline ? 'queda: muito tempo sem jogar' : ctx.age > 30 ? 'queda: idade' : 'queda: rendimento';
      event = { season: ctx.season, round: ctx.round, from: strengthCurrent, to, reason, context: { environmentLevel: r4(ctx.environmentLevel), ceiling, age: ctx.age, windowPoints: progress } };
      progress = r4(progress - step);
      strengthCurrent = to;
    }
    // a sobra passa adiante, mas nunca vira um segundo passo: no máximo 0,99 (o passo seguinte exige nova janela)
    progress = clamp(progress, -0.99, 0.99);
  }
  return { ...dev, strengthCurrent, progress, idleRounds, history: event ? [...history, event] : history };
}
