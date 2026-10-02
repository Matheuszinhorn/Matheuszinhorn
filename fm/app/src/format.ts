import type { Behavior, Position, Style } from '../../engine/index.ts';

// Textos e formatos em português do Brasil. Os identificadores do código ficam em inglês; a interface mostra estes rótulos.

const nf = new Intl.NumberFormat('pt-BR');

export const num = (n: number): string => nf.format(Math.round(n));

/** Dinheiro em R$, compacto: R$ 1,2 mi · R$ 350 mil · R$ 980. */
export function money(n: number): string {
  const sign = n < 0 ? '−' : '';
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${sign}R$ ${(v / 1_000_000).toFixed(v >= 10_000_000 ? 1 : 2).replace('.', ',')} mi`;
  if (v >= 10_000) return `${sign}R$ ${Math.round(v / 1000)} mil`;
  return `${sign}R$ ${num(v)}`;
}

export const signedMoney = (n: number): string => (n > 0 ? '+' : '') + money(n);

export const POSITION_LABEL: Record<Position, string> = { GK: 'GOL', DEF: 'DEF', MID: 'MEI', ATT: 'ATA' };
export const POSITION_NAME: Record<Position, string> = { GK: 'Goleiro', DEF: 'Defensor', MID: 'Meia', ATT: 'Atacante' };
export const STYLE_LABEL: Record<Style, string> = { DEFENSIVE: 'Defensivo', BALANCED: 'Equilibrado', OFFENSIVE: 'Ofensivo' };
export const BEHAVIOR_LABEL: Record<Behavior, string> = { NORMAL: 'Normal', AGGRESSIVE: 'Agressivo', REACTIVE: 'Reativo' };
export const STYLES: Style[] = ['DEFENSIVE', 'BALANCED', 'OFFENSIVE'];
export const BEHAVIORS: Behavior[] = ['NORMAL', 'AGGRESSIVE', 'REACTIVE'];
export const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '5-3-2', '4-5-1', '3-4-3', '5-4-1', '4-2-4'];

/** Força vinda das consultas pode ser decimal (média); a tela sempre mostra inteiro. */
export const strengthLabel = (n: number | null | undefined): string => (n === null || n === undefined ? '—' : String(Math.round(n)));

// Nomes de jogador. Mundo de universo de dados (World.nameStyle = 'display', ver data/to-world.ts): o nome já é o
// displayName oficial e aparece INTEIRO ("Felipe Anderson", "João Pedro"). Mundo fictício da V1 (sem a marca):
// abreviado como sempre ("Thiago Pacheco Lopes" → "T. Lopes"). A tela informa o mundo atual a cada desenho (shell.ts).
let displayNames = false;
export const useNamesOf = (world: object | null | undefined): boolean => {
  displayNames = !!world && (world as { nameStyle?: unknown }).nameStyle === 'display';
  return displayNames;
};

export const shortName = (full: string): string => {
  if (displayNames) return full;
  const parts = full.trim().split(/\s+/);
  return parts.length <= 1 ? full : `${parts[0][0]}. ${parts[parts.length - 1]}`;
};

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || name.slice(0, 2).toUpperCase();

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** Salário: guardado POR RODADA (a unidade que as finanças cobram); mostrado POR TEMPORADA (38 rodadas). */
export const SEASON_ROUNDS = 38;
export const seasonSalary = (perRound: number): number => perRound * SEASON_ROUNDS;
export const perRoundFromSeason = (perSeason: number): number => Math.round(perSeason / SEASON_ROUNDS);

/** Lesão contada em PARTIDAS: 1–2 leve, 3–5 moderada, 6+ grave. */
export function injuryLabel(matches: number): string {
  const grade = matches >= 6 ? 'grave' : matches >= 3 ? 'moderada' : 'leve';
  return `🩹 Lesão ${grade} · fora por ${matches} partida${matches === 1 ? '' : 's'}`;
}
