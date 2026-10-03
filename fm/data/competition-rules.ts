// REGRAS POR COMPETIÇÃO (CompetitionRules). Cada liga tem as suas: número de clubes, formato, acesso, rebaixamento,
// calendário, janelas e inscrição. Nada de "regra global": o Brasileirão usa regras brasileiras; o universo fictício
// usa as regras que o jogo sempre usou; outra liga pode trazer as próprias.
// Só o que foi confirmado entra como fato; o que não foi fica marcado (confirmed: false) com a nota do que falta.
// Esta camada é DADO: o engine não a lê. A carreira atual (universo fictício) não muda.

export type SeasonFormat =
  | { kind: 'DOUBLE_ROUND_ROBIN'; rounds: number } // pontos corridos, turno e returno
  | { kind: 'OTHER'; description: string }; // formatos com fases (grupos, mata-mata): descritos, ainda não simulados

export interface TransferWindow {
  label: string;
  /** datas ISO (AAAA-MM-DD) */
  from: string;
  to: string;
}

export interface CompetitionRules {
  id: string;
  name: string;
  country: string;
  season: number;
  /** nível na pirâmide (1 = elite) */
  level: number;
  clubs: number;
  format: SeasonFormat;
  /** quantos sobem para a divisão de cima (0 = topo da pirâmide) */
  promotion: number;
  /** quantos caem para a divisão de baixo (0 = base da pirâmide) */
  relegation: number;
  transferWindows: TransferWindow[];
  /** regras de inscrição, em texto (ex.: substituições permitidas depois da janela) */
  registrationRules: string[];
  confirmed: boolean;
  source: string;
  notes: string;
}

/** Pirâmide de um país/universo: as divisões em ordem e as regras de cada uma. */
export interface LeagueSystem {
  id: string;
  name: string;
  divisions: CompetitionRules[];
}

// ---------- Brasil ----------

/** Série A 2026: 20 clubes, pontos corridos (38 rodadas), 4 rebaixados; 2ª janela até 11/09/2026 (informada pelo proprietário). */
export const BRASILEIRAO_A_2026: CompetitionRules = {
  id: 'brasileirao-a-2026',
  name: 'Campeonato Brasileiro Série A',
  country: 'Brasil',
  season: 2026,
  level: 1,
  clubs: 20,
  format: { kind: 'DOUBLE_ROUND_ROBIN', rounds: 38 },
  promotion: 0,
  relegation: 4,
  transferWindows: [{ label: '2ª janela de 2026', from: '2026-07-01', to: '2026-09-11' }],
  registrationRules: [
    'Inscrições depois do fim da janela só nas situações previstas no regulamento da CBF (ex.: substituições dentro dos limites regulamentares).',
    'O elenco "atual" é o clube atual informado pela CBF para cada atleta (atleta_time_atual), não uma lista antiga.',
  ],
  confirmed: true,
  source: 'CBF (tabela da Série A 2026: 20 clubes, 38 rodadas) + data da janela informada pelo proprietário',
  notes: 'Data de início da 2ª janela não conferida na fonte primária: só o fim (11/09/2026) foi informado.',
};

/** Série B: mesma forma da A (20 clubes, 38 rodadas), sobe 4 e cai 4. Elencos ainda não importados. */
export const BRASILEIRAO_B_2026: CompetitionRules = {
  id: 'brasileirao-b-2026',
  name: 'Campeonato Brasileiro Série B',
  country: 'Brasil',
  season: 2026,
  level: 2,
  clubs: 20,
  format: { kind: 'DOUBLE_ROUND_ROBIN', rounds: 38 },
  promotion: 4,
  relegation: 4,
  transferWindows: [],
  registrationRules: [],
  confirmed: false,
  source: 'formato tradicional da competição (sem consulta à fonte primária nesta etapa)',
  notes: 'Confirmar na CBF antes de usar em jogo. Elencos da Série B não importados.',
};

/** Séries C e D têm fases (grupos/mata-mata): formato próprio, ainda não confirmado nem simulado. */
export const BRASILEIRAO_C_2026: CompetitionRules = {
  id: 'brasileirao-c-2026',
  name: 'Campeonato Brasileiro Série C',
  country: 'Brasil',
  season: 2026,
  level: 3,
  clubs: 20,
  format: { kind: 'OTHER', description: 'primeira fase em turno único seguida de fase de grupos (formato com fases; não confirmado para 2026)' },
  promotion: 4,
  relegation: 2,
  transferWindows: [],
  registrationRules: [],
  confirmed: false,
  source: 'nenhuma consulta à fonte primária nesta etapa',
  notes: 'Número de clubes, acesso e rebaixamento a confirmar na CBF. Não usar em jogo até confirmar.',
};

export const BRASILEIRAO_D_2026: CompetitionRules = {
  id: 'brasileirao-d-2026',
  name: 'Campeonato Brasileiro Série D',
  country: 'Brasil',
  season: 2026,
  level: 4,
  clubs: 0,
  format: { kind: 'OTHER', description: 'fase de grupos regionais seguida de mata-mata (não confirmado para 2026)' },
  promotion: 4,
  relegation: 0,
  transferWindows: [],
  registrationRules: [],
  confirmed: false,
  source: 'nenhuma consulta à fonte primária nesta etapa',
  notes: 'Número de clubes (clubs: 0 = desconhecido) e formato a confirmar na CBF.',
};

export const BRAZIL_2026: LeagueSystem = {
  id: 'brasil-2026',
  name: 'Campeonato Brasileiro 2026',
  divisions: [BRASILEIRAO_A_2026, BRASILEIRAO_B_2026, BRASILEIRAO_C_2026, BRASILEIRAO_D_2026],
};

// ---------- Universo fictício (o que o jogo usa hoje) ----------

const fictional = (level: number): CompetitionRules => ({
  id: `ficticio-d${level}`,
  name: `${level}ª Divisão`,
  country: 'Brasil (fictício)',
  season: 0,
  level,
  clubs: 20,
  format: { kind: 'DOUBLE_ROUND_ROBIN', rounds: 38 },
  promotion: level === 1 ? 0 : 4,
  relegation: level === 4 ? 0 : 4,
  transferWindows: [],
  registrationRules: ['Janelas do jogo: rodadas 1–6 e 19–24 e intertemporada (docs/MARKET.md).'],
  confirmed: true,
  source: 'regras do ELITE MANAGER (engine/season/promotion.ts: standardRules, 4 sobem e 4 caem)',
  notes: 'Regras do universo padrão; não mudam com esta camada.',
});

export const FICTIONAL_SYSTEM: LeagueSystem = { id: 'ficticio', name: 'Universo fictício', divisions: [1, 2, 3, 4].map(fictional) };

/** Problemas de coerência de uma pirâmide (vazio = coerente). Cada divisão é validada pelas regras DELA. */
export function checkLeagueSystem(s: LeagueSystem): string[] {
  const out: string[] = [];
  s.divisions.forEach((d, i) => {
    if (d.level !== i + 1) out.push(`${d.id}: nível ${d.level} fora de ordem`);
    if (i === 0 && d.promotion !== 0) out.push(`${d.id}: o topo não sobe`);
    if (i === s.divisions.length - 1 && d.relegation !== 0) out.push(`${d.id}: a base não cai`);
    if (d.format.kind === 'DOUBLE_ROUND_ROBIN' && d.clubs > 0 && d.format.rounds !== 2 * (d.clubs - 1)) out.push(`${d.id}: ${d.clubs} clubes pedem ${2 * (d.clubs - 1)} rodadas`);
    const below = s.divisions[i + 1];
    if (below && below.confirmed && d.confirmed && d.relegation !== below.promotion) out.push(`${d.id}: caem ${d.relegation}, sobem ${below.promotion} de ${below.id}`);
  });
  return out;
}
