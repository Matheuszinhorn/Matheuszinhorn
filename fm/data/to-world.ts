import type { Club, Player, Position, Tactics, Temperament, World } from '../engine/index.ts';
import type { Universe, UniversePosition } from './model.ts';
import { slugify } from './normalize.ts';

// Adaptador DATA → GAME MODEL: transforma um Universe validado no World que o engine já sabe usar.
// O engine não muda e não sabe a origem dos dados: recebe Club/Player válidos, como os do mundo fictício.
//
// Campos que o engine exige e a fonte não tem (força ainda não avaliada, temperamento, salário, caixa,
// reputação, cores, tática) NUNCA são inventados em silêncio: vêm de um ProvisionalProfile passado
// explicitamente por quem chama. Sem perfil, a conversão falha e diz o que falta. O perfil não altera os dados
// do universo (players.json continua com strength = null): só preenche o World daquela conversão.

const ENGINE_POSITION: Record<UniversePosition, Position> = { GOL: 'GK', DEF: 'DEF', MEI: 'MID', ATA: 'ATT' };

/** Valores provisórios usados SÓ onde o dado está ausente. Tudo que vem daqui é contado no relatório. */
export interface ProvisionalProfile {
  id: string; // identifica o perfil no relatório e na documentação
  strength: number; // 1–50, para jogador sem força avaliada
  age: number; // para jogador sem idade (o engine não usa idade na partida)
  temperament: Temperament;
  salary: number; // R$ por rodada
  marketValue: number;
  contractEndSeason: number;
  money: number; // caixa inicial do clube
  reputation: number; // 1–100
  stadiumCapacity: number; // se a fonte não tiver
  colors: { primary: string; secondary: string };
  tactics: Tactics;
}

// Não existe perfil provisório pronto no código de produção: os dados reais continuam com força null até a
// metodologia oficial. Testes técnicos passam o seu (data/tests/provisional-test-profile.ts).

export interface ConversionReport {
  profile: string | null;
  provisional: { strength: number; age: number; colors: number; stadiumCapacity: number }; // quantos registros usaram o perfil
}

export class UniverseConversionError extends Error {}

/**
 * Mundo vindo de um universo de dados. nameStyle = 'display': os nomes dos jogadores já são o displayName oficial
 * e a interface deve mostrá-los inteiros, sem nova abreviação (app/src/format.ts). Campo extra, fora do tipo do
 * engine: o engine não o lê, e o jogo o preserva porque sempre copia o mundo com { ...world }.
 */
export type UniverseWorld = World & { nameStyle: 'display' };

/** Sigla de 3 letras derivada do nome (sem acento), única dentro do mundo. */
function shortNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    const letters = slugify(name).replace(/-/g, '').toUpperCase();
    const candidates = [letters.slice(0, 3), letters[0] + letters.slice(2, 4), letters[0] + letters.slice(3, 5), letters[0] + letters[1] + letters[letters.length - 1]];
    const pick = candidates.find((c) => c.length === 3 && !used.has(c)) ?? `${letters.slice(0, 2)}${used.size}`;
    used.add(pick);
    return pick;
  });
}

export function universeToWorld(
  universe: Universe,
  opts: { seed: string; competitionId?: string; provisional?: ProvisionalProfile },
): { world: UniverseWorld; report: ConversionReport } {
  const competitionId = opts.competitionId ?? universe.manifest.defaultCompetitionId;
  const comp = universe.competitions[competitionId];
  if (!comp) throw new UniverseConversionError(`competição inexistente: "${competitionId}"`);
  const prov = opts.provisional ?? null;
  const report: ConversionReport = { profile: prov?.id ?? null, provisional: { strength: 0, age: 0, colors: 0, stadiumCapacity: 0 } };
  const needProfile = (what: string): ProvisionalProfile => {
    if (!prov) throw new UniverseConversionError(`dado ausente sem perfil provisório: ${what} (passe opts.provisional explicitamente)`);
    return prov;
  };

  const divisionId = `D${comp.division}`;
  const clubs: Record<string, Club> = {};
  const players: Record<string, Player> = {};
  const sigla = shortNames(comp.clubs.map((id) => universe.clubs[id].name));

  comp.clubs.forEach((clubId, i) => {
    const uc = universe.clubs[clubId];
    for (const pid of uc.squad) {
      const up = universe.players[pid];
      let strength = up.strength;
      if (strength === null) {
        strength = needProfile(`força de ${up.id} (${up.displayName})`).strength;
        report.provisional.strength++;
      }
      let age = up.age;
      if (age === null) {
        age = needProfile(`idade de ${up.id}`).age;
        report.provisional.age++;
      }
      const p = needProfile('temperamento, salário, valor e contrato');
      players[up.id] = {
        id: up.id,
        // O engine e a interface só conhecem este nome: o displayName. O fullName fica no universo, como referência.
        name: up.displayName,
        age,
        nationality: up.nationality ?? '',
        position: ENGINE_POSITION[up.position],
        strength,
        temperament: p.temperament,
        salary: p.salary,
        marketValue: p.marketValue,
        contract: { endSeason: p.contractEndSeason },
        clubId: uc.id,
        condition: { injuryRounds: 0, suspensionRounds: 0, yellowCardsAccumulated: 0 },
      };
    }
    const p = needProfile('caixa, reputação e tática do clube');
    let colors = uc.colors;
    if (!colors) {
      colors = p.colors;
      report.provisional.colors++;
    }
    let capacity = uc.stadium?.capacity ?? null;
    if (capacity === null) {
      capacity = p.stadiumCapacity;
      report.provisional.stadiumCapacity++;
    }
    clubs[uc.id] = {
      id: uc.id,
      name: uc.name,
      shortName: sigla[i],
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      country: universe.manifest.country,
      city: uc.city ?? '',
      divisionId,
      stadium: { name: uc.stadium?.name ?? '(estádio não informado)', capacity, maxCapacity: capacity },
      money: p.money,
      reputation: p.reputation,
      squad: [...uc.squad],
      defaultTactics: structuredClone(p.tactics),
      penaltyTakerId: null,
    };
  });

  return {
    world: { seed: opts.seed, nameStyle: 'display', divisions: [{ id: divisionId, name: comp.name, level: comp.division, clubIds: [...comp.clubs] }], clubs, players },
    report,
  };
}
