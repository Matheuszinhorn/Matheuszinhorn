// EM-RATING — metodologia OFICIAL de força do ELITE MANAGER (docs/PLAYER-RATINGS.md).
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

// ---------- ligação jogador do universo ↔ jogador da fonte ----------

/** Nome comparável: sem acento, minúsculo, sem pontuação, espaços simples. */
export function foldName(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Data em ISO (AAAA-MM-DD) a partir de "DD/MM/AAAA" (CBF) ou "M/D/AAAA ..." (EA). null se não der para ler. */
export function isoDate(s: string | null | undefined, order: 'DMY' | 'MDY'): string | null {
  const m = s ? /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s) : null;
  if (!m) return null;
  const [a, b, y] = [Number(m[1]), Number(m[2]), m[3]];
  const [d, mo] = order === 'DMY' ? [a, b] : [b, a];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export interface MatchCandidate {
  id: string;
  names: string[]; // nome, apelido, primeiro+último...
  birthDate: string | null; // ISO
}

/**
 * Liga dois jogadores SÓ com evidência forte: mesma data de nascimento E pelo menos um nome compatível (um contém o
 * outro, ou mesmo sobrenome + mesma inicial). Sem data de nascimento dos dois lados não há ligação (não se chuta).
 * Mais de um candidato possível = ambíguo = sem ligação (registrado como pendência).
 */
export function linkByBirthAndName(a: MatchCandidate, pool: readonly MatchCandidate[]): { id: string; rule: string } | { id: null; rule: string } {
  if (!a.birthDate) return { id: null, rule: 'sem data de nascimento' };
  const same = pool.filter((p) => p.birthDate === a.birthDate);
  const ok = same.filter((p) => namesCompatible(a.names, p.names));
  if (ok.length === 1) return { id: ok[0].id, rule: 'nascimento + nome' };
  if (ok.length > 1) return { id: null, rule: `ambíguo (${ok.length} candidatos)` };
  return { id: null, rule: same.length ? 'nascimento sem nome compatível' : 'não encontrado' };
}

const inOrder = (short: readonly string[], long: readonly string[]) => {
  let i = 0;
  for (const w of long) if (w === short[i]) i++;
  return i === short.length;
};

export function namesCompatible(xs: readonly string[], ys: readonly string[]): boolean {
  const A = xs.map(foldName).filter(Boolean);
  const B = ys.map(foldName).filter(Boolean);
  for (const a of A) for (const b of B) {
    if (a === b) return true;
    const wa = a.split(' ');
    const wb = b.split(' ');
    // um nome de uma palavra (apelido) contido como palavra no outro
    if ((wa.length === 1 && wb.includes(wa[0]) && wa[0].length >= 4) || (wb.length === 1 && wa.includes(wb[0]) && wb[0].length >= 4)) return true;
    // nome de 2+ palavras contido, na mesma ordem, no outro ("Ignacio Sosa" em "Ignacio Sosa Ospital")
    const [short, long] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
    if (short.length > 1 && short.length < long.length && inOrder(short, long)) return true;
    // mesmo último sobrenome e mesma inicial
    if (wa.length > 1 && wb.length > 1 && wa[wa.length - 1] === wb[wb.length - 1] && wa[0][0] === wb[0][0]) return true;
  }
  return false;
}
