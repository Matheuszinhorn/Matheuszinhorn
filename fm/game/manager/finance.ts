import { createRng, deriveSeed } from '../../engine/index.ts';
import type { BankLoan, ExtraLine, SponsorGoal, SponsorOffer } from './state.ts';

// Finanças da gestão (fora do engine): patrocínio com metas, empréstimos bancários, premiação de fim de temporada e o
// extrato extra (obras, transferências, parcelas). Só dinheiro do jogo: nada aqui pode ser comprado com dinheiro real.

export type FinanceStatus = 'SAUDAVEL' | 'ATENCAO' | 'ALERTA' | 'CRITICO';
export const STATUS_ICON: Record<FinanceStatus, string> = { SAUDAVEL: '🟢', ATENCAO: '🟡', ALERTA: '🟠', CRITICO: '🔴' };
export const STATUS_LABEL: Record<FinanceStatus, string> = { SAUDAVEL: 'Saudável', ATENCAO: 'Atenção', ALERTA: 'Alerta', CRITICO: 'Crítico' };

export function debtOf(loans: readonly BankLoan[]): number {
  return loans.reduce((s, l) => s + l.remaining, 0);
}

/** Situação: caixa comparado com a folha de uma rodada e com a dívida bancária. */
export function financeStatus(money: number, payrollPerRound: number, debt: number): FinanceStatus {
  if (money < 0) return 'CRITICO';
  const cushion = payrollPerRound > 0 ? money / payrollPerRound : 99;
  if (debt > money * 2 || cushion < 3) return 'ALERTA';
  if (debt > money || cushion < 8) return 'ATENCAO';
  return 'SAUDAVEL';
}

const DIVISION_SCALE: Record<number, number> = { 1: 12, 2: 5, 3: 2, 4: 1 };

/** Limite de crédito: depende da divisão e da reputação do clube; some com o que já se deve. Caixa negativo: sem crédito. */
export function creditLimit(level: number, reputation: number, debt: number, money: number): number {
  if (money < 0) return 0;
  const base = 250_000 * (DIVISION_SCALE[level] ?? 1) * (0.6 + reputation / 100);
  return Math.max(0, roundTo(base - debt, 10_000));
}

export const LOAN_TERMS = [10, 19, 38] as const;

/** Juros totais do empréstimo: prazo mais longo e situação pior custam mais. */
export function interestRate(rounds: number, status: FinanceStatus): number {
  const base = rounds <= 10 ? 0.06 : rounds <= 19 ? 0.1 : 0.16;
  return base + (status === 'ATENCAO' ? 0.03 : status === 'ALERTA' ? 0.07 : 0);
}

export type LoanCheck = { ok: true; loan: Omit<BankLoan, 'id' | 'takenSeason' | 'takenRound'> } | { ok: false; reason: string };

export function quoteLoan(amount: number, rounds: number, limit: number, status: FinanceStatus): LoanCheck {
  if (status === 'CRITICO') return { ok: false, reason: 'O banco não empresta para um clube com caixa negativo.' };
  if (!(LOAN_TERMS as readonly number[]).includes(rounds)) return { ok: false, reason: 'Prazo inválido.' };
  if (!Number.isFinite(amount) || amount < 50_000) return { ok: false, reason: 'O valor mínimo é R$ 50 mil.' };
  if (amount > limit) return { ok: false, reason: 'O valor passa do limite de crédito do clube.' };
  const total = Math.round(amount * (1 + interestRate(rounds, status)));
  const installment = Math.ceil(total / rounds);
  return { ok: true, loan: { principal: amount, total, rounds, installment, remaining: total } };
}

/** Uma parcela: devolve o empréstimo atualizado e o quanto foi pago. */
export function payInstallment(l: BankLoan): { loan: BankLoan; paid: number } {
  const paid = Math.min(l.installment, l.remaining);
  return { loan: { ...l, remaining: l.remaining - paid }, paid };
}

// ---------- patrocínio ----------

const SPONSOR_NAMES = ['Banco Horizonte', 'Construtora Pilar', 'Laticínios Serra Azul', 'Rede Farma Vida', 'Auto Peças Rota', 'Café Tropeiro', 'Seguros Âncora', 'Móveis Carvalho', 'Telecom Sinal', 'Supermercados Bom Preço', 'Energia Vale Verde', 'Transportes Estrela'];
const SPONSOR_BASE: Record<number, number> = { 1: 6_000_000, 2: 2_000_000, 3: 600_000, 4: 180_000 };

/**
 * Três propostas de patrocínio para a temporada: uma segura (sem meta), uma com meta de posição e uma arriscada
 * (meta mais alta e bônus maior). Valores pela divisão e pela reputação do clube.
 */
export function sponsorOffers(seed: string, season: number, clubId: string, level: number, reputation: number): SponsorOffer[] {
  const rng = createRng(deriveSeed(seed, `patrocinio:${season}:${clubId}`));
  const base = (SPONSOR_BASE[level] ?? 180_000) * (0.7 + reputation / 100);
  const names = [...SPONSOR_NAMES];
  const pick = () => names.splice(rng.int(0, names.length - 1), 1)[0];
  const safeGoal: SponsorGoal = { kind: 'NONE' };
  const midGoal: SponsorGoal = { kind: 'TOP', position: level === 1 ? 10 : 8 };
  const bigGoal: SponsorGoal = level === 1 ? { kind: 'TOP', position: 4 } : { kind: 'PROMOTION' };
  return [
    { id: `sp-${season}-1`, name: pick(), amount: roundTo(base, 10_000), goal: safeGoal, bonus: 0 },
    { id: `sp-${season}-2`, name: pick(), amount: roundTo(base * 0.85, 10_000), goal: midGoal, bonus: roundTo(base * 0.5, 10_000) },
    { id: `sp-${season}-3`, name: pick(), amount: roundTo(base * 0.7, 10_000), goal: bigGoal, bonus: roundTo(base * 1.2, 10_000) },
  ];
}

export function goalLabel(g: SponsorGoal): string {
  if (g.kind === 'NONE') return 'Sem meta';
  if (g.kind === 'PROMOTION') return 'Conquistar o acesso';
  return `Terminar entre os ${g.position} primeiros`;
}

export function goalMet(g: SponsorGoal, position: number, promoted: boolean): boolean {
  if (g.kind === 'NONE') return false;
  if (g.kind === 'PROMOTION') return promoted;
  return position > 0 && position <= g.position;
}

/** Parcela por rodada do patrocínio (o resto da divisão inteira vai na última rodada). */
export function sponsorInstallment(amount: number, round: number, rounds: number): number {
  const each = Math.floor(amount / rounds);
  return round === rounds ? amount - each * (rounds - 1) : each;
}

// ---------- premiação ----------

const PRIZE_TOP: Record<number, number> = { 1: 5_000_000, 2: 1_500_000, 3: 500_000, 4: 150_000 };

/** Premiação por colocação: o campeão leva o valor cheio da divisão; o 20º leva 5% dele. */
export function prizeMoney(level: number, position: number, total = 20): number {
  if (position < 1) return 0;
  const top = PRIZE_TOP[level] ?? 150_000;
  const share = 1 - ((position - 1) / Math.max(1, total - 1)) * 0.95;
  return roundTo(top * share, 1_000);
}

export function line(season: number, round: number, label: string, amount: number): ExtraLine {
  return { season, round, label, amount: Math.round(amount) };
}

export function roundTo(v: number, step: number): number {
  return Math.round(v / step) * step;
}
