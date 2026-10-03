// EM-RATING-1.0 — DESCONTINUADA em 03/10/2026 (decisão do proprietário: a força não depende de ratings de terceiros).
// Mantida só como registro histórico da etapa anterior; nenhum código de dados ou build a usa. A metodologia vigente é
// a EM-RATING-2.0 (data/rating/em-rating-2.ts). docs/PLAYER-RATINGS.md.
// EM-RATING-1.0: metodologia de força do ELITE MANAGER baseada em referência externa.
// Converte uma referência externa (hoje: Overall do EA SPORTS FC 26) para a escala própria 1–50.
// Regras: determinística, versionada, explicável. A mesma entrada + a mesma versão = a mesma força, com a trilha do
// cálculo (base e ajustes) guardada junto. Nada aqui é decidido por IA, sorteio ou "olho": é uma tabela fixa.
// O engine continua lendo só `strength`; esta camada não o conhece.

export const EM_RATING_VERSION = 'EM-RATING-1.0';

/** Fontes externas de referência conhecidas. Uma edição nova (FC 27...) entra como outro valor, sem apagar o histórico. */
export type RatingSource = 'EA_FC_26';

/** Referência externa de um jogador, exatamente como veio da fonte (nada é estimado aqui). */
export interface ExternalRating {
  source: RatingSource;
  /** edição/lote da fonte (ex.: "FC26-api-2026-10-02"): recalibrar = nova versão, não sobrescrever a antiga */
  sourceVersion: string;
  sourcePlayerId: string;
  overall: number;
  /** posição curta da fonte (GK, CB, CM, ST...) */
  sourcePosition: string | null;
  retrievedAt: string;
  /** como o jogador da fonte foi ligado ao do universo (auditável) */
  matchedBy: string;
}

export interface StrengthStep {
  rule: string;
  delta: number;
}

/** Resultado da conversão, com a trilha completa. */
export interface StrengthResult {
  strength: number;
  methodVersion: string;
  source: RatingSource;
  sourceVersion: string;
  sourceOverall: number;
  base: number;
  steps: StrengthStep[];
  notes: string;
}

export const STRENGTH_MIN = 1;
export const STRENGTH_MAX = 50;
/** Deslocamento da tabela EM-RATING-1.0: força = Overall − 42 (ver a tabela por faixas em PLAYER-RATINGS.md). */
export const OVERALL_OFFSET = 42;

const clamp = (v: number) => Math.max(STRENGTH_MIN, Math.min(STRENGTH_MAX, v));

/**
 * Tabela EM-RATING-1.0 (Overall → força). É a tabela por faixas proposta pelo proprietário escrita como uma linha:
 *   90+ → 48–50 · 86–89 → 44–47 · 82–85 → 40–43 · 78–81 → 36–39 · 74–77 → 32–35 · 70–73 → 28–31 · 66–69 → 24–27
 *   62–65 → 20–23 · 58–61 → 16–19 · 54–57 → 12–15 · 50–53 → 8–11 · < 50 → 1–7
 * = Overall − 42, limitada a 1–50 (92+ satura em 50; 43 ou menos vira 1).
 */
export function baseFromOverall(overall: number): number {
  if (!Number.isInteger(overall) || overall < 1 || overall > 99) throw new RangeError(`Overall inválido: ${overall}`);
  return clamp(overall - OVERALL_OFFSET);
}

/**
 * Força EM-RATING-1.0. Versão 1.0 NÃO aplica ajuste por posição nem por divisão:
 * - o Overall da fonte já é calculado por posição (o de goleiro sai dos atributos de goleiro);
 * - a divisão não reduz ninguém (jogador forte em divisão menor continua forte; docs/PLAYER-RATINGS.md).
 * Os passos ficam registrados mesmo vazios, para versões futuras poderem acrescentar regras sem esconder nada.
 */
export function strengthFrom(r: ExternalRating): StrengthResult {
  const base = baseFromOverall(r.overall);
  const steps: StrengthStep[] = [];
  const strength = clamp(base + steps.reduce((s, x) => s + x.delta, 0));
  return {
    strength,
    methodVersion: EM_RATING_VERSION,
    source: r.source,
    sourceVersion: r.sourceVersion,
    sourceOverall: r.overall,
    base,
    steps,
    notes: `${r.source} Overall ${r.overall} → base ${base} (Overall − ${OVERALL_OFFSET}); sem ajustes na ${EM_RATING_VERSION}; ligação: ${r.matchedBy}`,
  };
}
