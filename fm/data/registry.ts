import { generateWorld, type World } from '../engine/index.ts';
import type { Universe } from './model.ts';
import { universeToWorld, type ConversionReport, type ProvisionalProfile } from './to-world.ts';

// Registro de universos: a forma controlada de escolher de onde vem o mundo do jogo.
// Os dois universos coexistem; o PADRÃO continua sendo o fictício da V1. Trocar o padrão é uma decisão de
// produto explícita (alterar DEFAULT_UNIVERSE_ID) e ainda não foi tomada.
//
// O jogo (game/career.ts) ainda chama generateWorld diretamente; ligá-lo a este registro é o próximo passo,
// depois da decisão sobre como uma carreira de 4 divisões usa um universo que hoje tem só a Série A.

export type UniverseKind = 'generated' | 'data';

export interface UniverseEntry {
  id: string;
  name: string;
  kind: UniverseKind;
  divisions: number;
  /** Pode virar carreira hoje? (a carreira da V1 precisa de 4 divisões × 20 clubes) */
  careerReady: boolean;
  notes: string;
}

export const FICTIONAL_UNIVERSE_ID = 'ficticio-v1';

export const UNIVERSES: readonly UniverseEntry[] = [
  { id: FICTIONAL_UNIVERSE_ID, name: 'Universo fictício (V1)', kind: 'generated', divisions: 4, careerReady: true, notes: 'Gerado por seed (engine/world/generate.ts). Universo da V1.' },
  {
    id: 'brasileirao-2026',
    name: 'Brasileirão Série A 2026',
    kind: 'data',
    divisions: 1,
    careerReady: false,
    notes: 'Clubes e elencos reais (fonte de conferência: Wikipédia; CBF pendente). Força ainda não avaliada. Só a Série A.',
  },
];

export const DEFAULT_UNIVERSE_ID = FICTIONAL_UNIVERSE_ID;

export function universeEntry(id: string): UniverseEntry {
  const e = UNIVERSES.find((u) => u.id === id);
  if (!e) throw new Error(`universo inexistente: "${id}"`);
  return e;
}

/**
 * Mundo de um universo. O fictício sai de generateWorld(seed) exatamente como na V1; um universo de dados
 * precisa vir carregado e validado (o navegador não lê disco) e, enquanto houver dado ausente, de um perfil provisório explícito.
 */
export function worldForUniverse(
  id: string,
  opts: { seed: string; universe?: Universe; competitionId?: string; provisional?: ProvisionalProfile },
): { world: World; report: ConversionReport | null } { // UniverseWorld quando vem de dados
  const entry = universeEntry(id);
  if (entry.kind === 'generated') return { world: generateWorld(opts.seed), report: null };
  if (!opts.universe || opts.universe.manifest.id !== id) throw new Error(`universo "${id}" precisa ser carregado e validado antes`);
  return universeToWorld(opts.universe, { seed: opts.seed, competitionId: opts.competitionId, provisional: opts.provisional });
}
