import type { Division, World } from '../world/generate.ts';
import type { StandingRow } from './standings.ts';

// Promoção e rebaixamento (seção 17). Função pura: recebe as classificações finais e as regras,
// devolve as divisões da próxima temporada. Nada aqui conhece um campeonato específico:
// quantidade e destino de cada movimento vêm das regras.

export class PromotionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'PromotionError';
    this.code = code;
  }
}

export interface MoveRule {
  count: number;
  destinationId: string | null; // obrigatório quando count > 0
}

export interface PromotionRule {
  /** Os melhores colocados (o campeão é o 1º) sobem para destinationId. */
  promotion: MoveRule;
  /** Os piores colocados descem para destinationId. */
  relegation: MoveRule;
}

/** Uma regra por divisão, indexada pelo id da divisão. */
export type PromotionRules = Record<string, PromotionRule>;

export interface SeasonDivision {
  id: string;
  name: string;
  level: number; // 1 = topo
  standings: readonly StandingRow[]; // classificação final, do campeão ao último
}

export interface SeasonOutcome {
  divisions: readonly SeasonDivision[];
}

export interface Movement {
  clubId: string;
  fromDivisionId: string;
  toDivisionId: string;
  kind: 'PROMOTED' | 'RELEGATED';
  position: number; // colocação final (1 = campeão)
  champion: boolean;
}

export interface PromotionResult {
  divisions: Division[]; // configuração da temporada seguinte
  champions: Record<string, string>; // id da divisão → id do clube campeão
  movements: Movement[];
}

/**
 * Regras usuais em escada: cada divisão promove `count` para a de cima e rebaixa `count` para a de baixo.
 * A primeira divisão não promove e a última não rebaixa.
 */
export function standardRules(divisions: readonly { id: string; level: number }[], count = 4): PromotionRules {
  const ordered = [...divisions].sort((a, b) => a.level - b.level);
  const rules: PromotionRules = {};
  ordered.forEach((d, i) => {
    const above = ordered[i - 1];
    const below = ordered[i + 1];
    rules[d.id] = {
      promotion: above ? { count, destinationId: above.id } : { count: 0, destinationId: null },
      relegation: below ? { count, destinationId: below.id } : { count: 0, destinationId: null },
    };
  });
  return rules;
}

function validate(season: SeasonOutcome, rules: PromotionRules): void {
  const ids = new Set(season.divisions.map((d) => d.id));
  if (ids.size !== season.divisions.length) throw new PromotionError('DUPLICATE_DIVISION', 'há divisões com o mesmo id');
  for (const id of Object.keys(rules)) {
    if (!ids.has(id)) throw new PromotionError('UNKNOWN_DIVISION', `regra para uma divisão inexistente: ${id}`);
  }
  const seen = new Set<string>();
  for (const d of season.divisions) {
    const rule = rules[d.id];
    if (!rule) throw new PromotionError('MISSING_RULE', `falta a regra da divisão ${d.id}`);
    for (const [name, move] of [['promoção', rule.promotion], ['rebaixamento', rule.relegation]] as const) {
      if (!Number.isInteger(move.count) || move.count < 0) throw new PromotionError('INVALID_COUNT', `${name} em ${d.id}: quantidade inválida`);
      if (move.count > 0) {
        if (move.destinationId === null || !ids.has(move.destinationId)) {
          throw new PromotionError('INVALID_DESTINATION', `${name} em ${d.id}: destino inexistente`);
        }
        if (move.destinationId === d.id) throw new PromotionError('INVALID_DESTINATION', `${name} em ${d.id}: o destino é a própria divisão`);
      }
    }
    if (rule.promotion.count + rule.relegation.count > d.standings.length) {
      throw new PromotionError('TOO_MANY_MOVES', `${d.id}: promoção + rebaixamento excede o número de clubes`);
    }
    for (const row of d.standings) {
      if (seen.has(row.clubId)) throw new PromotionError('DUPLICATE_CLUB', `clube repetido: ${row.clubId}`);
      seen.add(row.clubId);
    }
  }
}

/**
 * Produz as divisões da próxima temporada. Em cada divisão, primeiro ficam os clubes que permaneceram
 * (na ordem da tabela) e depois os que chegaram (vindos de cima e de baixo, na ordem dos movimentos).
 * O tamanho de cada divisão se mantém: o que sai de uma precisa entrar em outra, senão as regras são recusadas.
 */
export function applyPromotionRelegation(season: SeasonOutcome, rules: PromotionRules): PromotionResult {
  validate(season, rules);

  const movements: Movement[] = [];
  const champions: Record<string, string> = {};
  const moved = new Set<string>();

  for (const d of season.divisions) {
    const rule = rules[d.id];
    const total = d.standings.length;
    if (total > 0) champions[d.id] = d.standings[0].clubId;
    if (rule.promotion.count > 0) {
      d.standings.slice(0, rule.promotion.count).forEach((row, i) => {
        movements.push({
          clubId: row.clubId,
          fromDivisionId: d.id,
          toDivisionId: rule.promotion.destinationId as string,
          kind: 'PROMOTED',
          position: i + 1,
          champion: i === 0,
        });
        moved.add(row.clubId);
      });
    }
    if (rule.relegation.count > 0) {
      const first = total - rule.relegation.count;
      d.standings.slice(first).forEach((row, i) => {
        movements.push({
          clubId: row.clubId,
          fromDivisionId: d.id,
          toDivisionId: rule.relegation.destinationId as string,
          kind: 'RELEGATED',
          position: first + i + 1,
          champion: false,
        });
        moved.add(row.clubId);
      });
    }
  }

  for (const d of season.divisions) {
    const out = movements.filter((m) => m.fromDivisionId === d.id).length;
    const incoming = movements.filter((m) => m.toDivisionId === d.id).length;
    if (out !== incoming) {
      throw new PromotionError('UNBALANCED', `${d.id}: saem ${out} clubes e entram ${incoming}; as regras alterariam o tamanho da divisão`);
    }
  }

  const divisions: Division[] = season.divisions.map((d) => ({
    id: d.id,
    name: d.name,
    level: d.level,
    clubIds: [
      ...d.standings.filter((row) => !moved.has(row.clubId)).map((row) => row.clubId),
      ...movements.filter((m) => m.toDivisionId === d.id).map((m) => m.clubId),
    ],
  }));

  return { divisions, champions, movements };
}

/** Novo mundo com as divisões da próxima temporada; o divisionId de cada clube acompanha. Não altera o original. */
export function withDivisions(world: World, divisions: readonly Division[]): World {
  const clubs = { ...world.clubs };
  for (const d of divisions) {
    for (const id of d.clubIds) {
      const club = clubs[id];
      if (!club) throw new PromotionError('UNKNOWN_CLUB', `clube inexistente no mundo: ${id}`);
      clubs[id] = { ...club, divisionId: d.id };
    }
  }
  return { ...world, divisions: divisions.map((d) => ({ ...d, clubIds: [...d.clubIds] })), clubs };
}
