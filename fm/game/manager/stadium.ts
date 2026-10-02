import type { Club } from '../../engine/index.ts';
import type { StadiumWork, UpgradeId } from './state.ts';

// Estádio: obras com custo, prazo e benefício. A capacidade é dado do mundo (o engine cobra manutenção por lugar);
// os demais itens melhoram a ocupação (público) ou a receita por torcedor. Nenhum afeta o resultado das partidas.

export interface UpgradeInfo {
  id: UpgradeId;
  label: string;
  description: string;
  maxLevel: number;
  cost: number; // por nível
  rounds: number; // tempo de obra
  /** + lugares por nível */
  seats?: number;
  /** + ocupação por nível (fração: 0.02 = 2 pontos percentuais) */
  fill?: number;
  /** + receita por torcedor por nível (R$) */
  perFan?: number;
  /** + receita fixa por jogo em casa por nível (R$) */
  perGame?: number;
  /** + evolução dos jovens no fim da temporada (níveis) */
  youth?: number;
}

export const UPGRADES: readonly UpgradeInfo[] = [
  { id: 'ARQUIBANCADA', label: 'Arquibancadas', description: '+1.500 lugares por nível. Mais lugares não garantem mais público: a ocupação depende do time e do adversário.', maxLevel: 5, cost: 450_000, rounds: 6, seats: 1500 },
  { id: 'GRAMADO', label: 'Gramado', description: 'Gramado melhor atrai mais torcedores.', maxLevel: 3, cost: 120_000, rounds: 3, fill: 0.02 },
  { id: 'ILUMINACAO', label: 'Iluminação', description: 'Jogos noturnos mais atraentes.', maxLevel: 2, cost: 150_000, rounds: 3, fill: 0.02 },
  { id: 'SEGURANCA', label: 'Segurança', description: 'Famílias voltam ao estádio.', maxLevel: 3, cost: 100_000, rounds: 2, fill: 0.02 },
  { id: 'ACESSOS', label: 'Acessos', description: 'Entrada e saída mais rápidas.', maxLevel: 2, cost: 180_000, rounds: 4, fill: 0.03 },
  { id: 'ESTACIONAMENTO', label: 'Estacionamento', description: '+R$ 0,80 por torcedor em cada jogo em casa.', maxLevel: 2, cost: 120_000, rounds: 3, perFan: 0.8 },
  { id: 'ALIMENTACAO', label: 'Alimentação', description: '+R$ 1,50 por torcedor em cada jogo em casa.', maxLevel: 3, cost: 90_000, rounds: 2, perFan: 1.5 },
  { id: 'LOJA', label: 'Loja do clube', description: '+R$ 1,20 por torcedor em cada jogo em casa.', maxLevel: 3, cost: 110_000, rounds: 3, perFan: 1.2 },
  { id: 'VIP', label: 'Área VIP', description: '+R$ 4.000 por jogo em casa.', maxLevel: 2, cost: 250_000, rounds: 5, perGame: 4000 },
  { id: 'CONFORTO', label: 'Conforto', description: 'Assentos e cobertura: mais ocupação.', maxLevel: 2, cost: 200_000, rounds: 4, fill: 0.03 },
  { id: 'CT', label: 'Centro de treinamento', description: 'Jogadores de até 23 anos evoluem mais no fim da temporada.', maxLevel: 2, cost: 400_000, rounds: 8, youth: 1 },
];

export const MAX_WORKS = 2;

export function upgradeInfo(id: UpgradeId): UpgradeInfo {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) throw new Error(`obra desconhecida: ${id}`);
  return u;
}

export type Levels = Partial<Record<UpgradeId, number>>;

const lvl = (levels: Levels, id: UpgradeId) => levels[id] ?? 0;

export function fillBonus(levels: Levels): number {
  return UPGRADES.reduce((sum, u) => sum + (u.fill ?? 0) * lvl(levels, u.id), 0);
}

export function homeExtras(levels: Levels, attendance: number): number {
  return Math.round(UPGRADES.reduce((sum, u) => sum + (u.perFan ?? 0) * lvl(levels, u.id) * attendance + (u.perGame ?? 0) * lvl(levels, u.id), 0));
}

export function youthBonus(levels: Levels): number {
  return UPGRADES.reduce((sum, u) => sum + (u.youth ?? 0) * lvl(levels, u.id), 0);
}

export type WorkCheck = { ok: true; cost: number; rounds: number; level: number } | { ok: false; reason: string };

export function canStartWork(levels: Levels, works: readonly StadiumWork[], id: UpgradeId, money: number): WorkCheck {
  const u = upgradeInfo(id);
  const pending = works.filter((w) => w.upgrade === id).length;
  const next = lvl(levels, id) + pending + 1;
  if (next > u.maxLevel) return { ok: false, reason: `${u.label} já está no nível máximo.` };
  if (works.length >= MAX_WORKS) return { ok: false, reason: `No máximo ${MAX_WORKS} obras ao mesmo tempo.` };
  if (money < u.cost) return { ok: false, reason: 'Caixa insuficiente para a obra.' };
  return { ok: true, cost: u.cost, rounds: u.rounds, level: next };
}

/** Aplica a obra concluída ao clube (só arquibancada muda dado do mundo). */
export function applyWork(club: Club, id: UpgradeId): Club {
  const u = upgradeInfo(id);
  if (!u.seats) return club;
  const capacity = club.stadium.capacity + u.seats;
  return { ...club, stadium: { ...club.stadium, capacity, maxCapacity: Math.max(club.stadium.maxCapacity, capacity) } };
}

// ---------- público (camada de jogo) ----------

export interface AttendanceInput {
  capacity: number;
  reputation: number; // 1–100 do mandante
  divisionLevel: number;
  /** pontos nos últimos (até) 5 jogos do mandante / máximo possível; null sem jogos */
  formRatio: number | null;
  /** posição / total de clubes da divisão; null sem jogos */
  tablePercentile: number | null;
  opponentReputation: number;
  rivalry: boolean;
  levels: Levels;
}

/**
 * Público de um jogo: ocupação base pela reputação e pela divisão, ajustada pela fase do time, pela tabela, pelo
 * adversário, por rivalidade (mesma cidade) e pelo conforto do estádio. Limitada à capacidade.
 */
export function attendanceFor(i: AttendanceInput): number {
  const divisionBase = [0, 0.3, 0.26, 0.22, 0.18][i.divisionLevel] ?? 0.18;
  let fill = divisionBase + 0.004 * i.reputation;
  if (i.formRatio !== null) fill += (i.formRatio - 0.45) * 0.3;
  if (i.tablePercentile !== null) fill += i.tablePercentile <= 0.25 ? 0.06 : i.tablePercentile > 0.75 ? -0.05 : 0;
  fill += Math.min(0.1, i.opponentReputation / 1000);
  if (i.rivalry) fill += 0.12;
  fill += fillBonus(i.levels);
  fill = Math.max(0.08, Math.min(1, fill));
  return Math.round(i.capacity * fill);
}
