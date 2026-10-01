import { createRng, deriveSeed, type Rng } from '../rng.ts';
import type { Behavior, Club, Formation, Player, Position, Style, Temperament } from '../types.ts';

// Universo fictício (seção 4 da especificação original): 4 divisões × 20 clubes, sem nenhum dado real.
// Tudo sai de uma seed: a mesma seed gera exatamente o mesmo mundo.

export interface Division {
  id: string;
  name: string;
  level: number;
  clubIds: string[];
}

export interface World {
  seed: string;
  divisions: Division[];
  clubs: Record<string, Club>;
  players: Record<string, Player>;
}

interface DivisionProfile {
  strength: [number, number]; // faixa da força média dos clubes (seção 2)
  capacity: [number, number];
  reputation: [number, number];
  money: [number, number];
  salaryPerPoint: number;
}

const PROFILES: DivisionProfile[] = [
  { strength: [30, 45], capacity: [30000, 60000], reputation: [60, 90], money: [8_000_000, 20_000_000], salaryPerPoint: 900 },
  { strength: [22, 38], capacity: [15000, 35000], reputation: [40, 70], money: [3_000_000, 8_000_000], salaryPerPoint: 400 },
  { strength: [15, 30], capacity: [8000, 20000], reputation: [25, 50], money: [1_000_000, 3_000_000], salaryPerPoint: 150 },
  { strength: [8, 24], capacity: [3000, 10000], reputation: [10, 35], money: [300_000, 1_000_000], salaryPerPoint: 60 },
];

// Nomes inventados: prefixo + palavra, evitando combinações que coincidam com clubes reais conhecidos.
const PLACE_PREFIX = ['Vila', 'Porto', 'Campo', 'Serra', 'Barra', 'Lagoa', 'Monte', 'Ponte', 'Passo', 'Vale'];
const PLACE_WORD = [
  'Aurora', 'Anil', 'Brava', 'Cerejeira', 'Esmeralda', 'Figueira', 'Garça', 'Jacarandá', 'Lírio', 'Marola',
  'Neblina', 'Orvalho', 'Quaresma', 'Ribeira', 'Seriema', 'Taboca', 'Urutau', 'Ventania', 'Maresia', 'Pitanga',
  'Juriti', 'Sabiá', 'Araçá', 'Ipê', 'Carnaúba', 'Buriti',
];
const CLUB_TYPE = ['Esporte Clube', 'Futebol Clube', 'Atlético', 'Sport Club', 'Recreativo', 'União', 'Associação', 'Clube'];
const FIRST_NAMES = [
  'Adriano', 'Bruno', 'Caio', 'Diego', 'Everton', 'Fábio', 'Gustavo', 'Heitor', 'Igor', 'João', 'Kaio', 'Leandro',
  'Marcos', 'Nícolas', 'Otávio', 'Paulo', 'Rafael', 'Samuel', 'Thiago', 'Ulisses', 'Vinícius', 'Wesley', 'Yuri',
  'André', 'Breno', 'Cauã', 'Davi', 'Elias', 'Felipe', 'Gabriel', 'Henrique', 'Luan', 'Mateus', 'Renan', 'Wallace',
];
const LAST_NAMES = [
  'Almeida', 'Barbosa', 'Cardoso', 'Duarte', 'Esteves', 'Farias', 'Gomes', 'Honório', 'Ientes', 'Jardim', 'Lacerda',
  'Macedo', 'Nogueira', 'Oliveira', 'Prates', 'Queiroz', 'Rezende', 'Siqueira', 'Teixeira', 'Uchoa', 'Valadares',
  'Xavier', 'Zanetti', 'Bragança', 'Coutinho', 'Freitas', 'Guedes', 'Lopes', 'Moraes', 'Pacheco', 'Rocha', 'Toledo',
];
const COLORS = ['#1B5E20', '#B71C1C', '#0D47A1', '#F9A825', '#212121', '#FAFAFA', '#4A148C', '#E65100', '#006064', '#880E4F'];
const FORMATIONS: Formation[] = [
  { DEF: 4, MID: 4, ATT: 2 },
  { DEF: 4, MID: 3, ATT: 3 },
  { DEF: 3, MID: 5, ATT: 2 },
  { DEF: 4, MID: 5, ATT: 1 },
  { DEF: 5, MID: 3, ATT: 2 },
];
const SQUAD_SHAPE: Record<Position, number> = { GK: 3, DEF: 8, MID: 8, ATT: 5 };
const TEMPERAMENTS: Temperament[] = ['CALM', 'NORMAL', 'NORMAL', 'NORMAL', 'EXPLOSIVE'];

function between(rng: Rng, [min, max]: [number, number]): number {
  return rng.int(min, max);
}

function clampStrength(n: number): number {
  return Math.max(1, Math.min(50, Math.round(n)));
}

export function generateWorld(seed: string, clubsPerDivision = 20): World {
  const rng = createRng(deriveSeed(seed, 'world'));
  const clubs: Record<string, Club> = {};
  const players: Record<string, Player> = {};
  const divisions: Division[] = [];

  // Cidades únicas para todos os clubes.
  const places: string[] = [];
  for (const p of PLACE_PREFIX) for (const w of PLACE_WORD) places.push(`${p} ${w}`);
  for (let i = places.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [places[i], places[j]] = [places[j], places[i]];
  }

  let clubSeq = 0;
  let playerSeq = 0;
  const usedNames = new Set<string>();

  PROFILES.forEach((profile, level) => {
    const division: Division = { id: `D${level + 1}`, name: `${level + 1}ª Divisão`, level: level + 1, clubIds: [] };
    for (let c = 0; c < clubsPerDivision; c++) {
      clubSeq++;
      const id = `clb-${String(clubSeq).padStart(3, '0')}`;
      const city = places[clubSeq - 1];
      const type = rng.pick(CLUB_TYPE);
      const name = rng.next() < 0.5 ? `${type} ${city}` : `${city} ${type}`;
      const quality = between(rng, profile.strength);
      const capacity = Math.round(between(rng, profile.capacity) / 500) * 500;
      const primary = rng.pick(COLORS);
      const secondary = rng.pick(COLORS.filter((c2) => c2 !== primary));

      const squad: string[] = [];
      for (const position of ['GK', 'DEF', 'MID', 'ATT'] as Position[]) {
        for (let k = 0; k < SQUAD_SHAPE[position]; k++) {
          playerSeq++;
          const pid = `ply-${String(playerSeq).padStart(4, '0')}`;
          // Nome + sobrenome; se repetir, ganha um segundo sobrenome. Tentativas limitadas: nunca trava.
          let pname = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
          for (let tries = 0; usedNames.has(pname) && tries < 50; tries++) {
            pname = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)} ${rng.pick(LAST_NAMES)}`;
          }
          if (usedNames.has(pname)) pname = `${pname} ${playerSeq}`;
          usedNames.add(pname);
          // Força em torno da qualidade do clube: soma de dois sorteios dá uma curva mais "normal".
          const strength = clampStrength(quality + (rng.next() + rng.next() - 1) * 8);
          players[pid] = {
            id: pid,
            name: pname,
            age: rng.int(17, 35),
            nationality: rng.next() < 0.9 ? 'Brasil' : rng.pick(['Argentina', 'Uruguai', 'Paraguai', 'Colômbia']),
            position,
            strength,
            temperament: rng.pick(TEMPERAMENTS),
            salary: Math.round((strength * profile.salaryPerPoint) / 100) * 100,
            marketValue: Math.round((strength * strength * profile.salaryPerPoint * 4) / 1000) * 1000,
            contract: { endSeason: 2026 + rng.int(0, 3) },
            clubId: id,
            condition: { injuryRounds: 0, suspensionRounds: 0, yellowCardsAccumulated: 0 },
          };
          squad.push(pid);
        }
      }

      const style: Style = 'BALANCED';
      const behavior: Behavior = rng.next() < 0.8 ? 'NORMAL' : rng.pick(['AGGRESSIVE', 'REACTIVE'] as Behavior[]);
      clubs[id] = {
        id,
        name,
        // Sigla: 1ª letra do prefixo + 2 primeiras da palavra (ex.: Vila Aurora → VAU).
        shortName: (city.split(' ')[0].slice(0, 1) + city.split(' ')[1].slice(0, 2))
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase(),
        primaryColor: primary,
        secondaryColor: secondary,
        country: 'Brasil',
        city,
        divisionId: division.id,
        stadium: { name: `Estádio ${city}`, capacity, maxCapacity: Math.round((capacity * 1.5) / 500) * 500 },
        money: Math.round(between(rng, profile.money) / 1000) * 1000,
        reputation: between(rng, profile.reputation),
        squad,
        defaultTactics: { formation: rng.pick(FORMATIONS), style, behavior },
        penaltyTakerId: null,
      };
      division.clubIds.push(id);
    }
    divisions.push(division);
  });
  return { seed, divisions, clubs, players };
}
