// Modelos da camada de DADOS (universos). Esta camada fornece dados ao jogo; o engine não a conhece.
// Fluxo: fonte externa → raw → normalize.ts → validate.ts → Universe (este arquivo) → to-world.ts → World do engine.
// Só "type" e "interface" (sintaxe apagável, como o resto do projeto).

/** Posições do modelo simplificado do ELITE MANAGER (o engine usa GK/DEF/MID/ATT; a conversão fica em to-world.ts). */
export type UniversePosition = 'GOL' | 'DEF' | 'MEI' | 'ATA';
export const UNIVERSE_POSITIONS: readonly UniversePosition[] = ['GOL', 'DEF', 'MEI', 'ATA'];

/**
 * Situação do jogador no cadastro. ATIVO = o clube atual na fonte é este clube. TRANSFERIDO = inscrito pelo clube na
 * temporada, mas a fonte principal (CBF: atleta_time_atual) aponta outro clube hoje. Só ATIVO entra no elenco jogável.
 */
export type PlayerStatus = 'ATIVO' | 'TRANSFERIDO';
export const PLAYER_STATUSES: readonly PlayerStatus[] = ['ATIVO', 'TRANSFERIDO'];

/** De onde veio um registro: identifica a fonte e o item nela (ex.: "enwiki:Gustavo Gómez"). */
export interface SourceRef {
  source: string; // id em sources.json
  ref: string | null; // identificador do item na fonte (null quando a fonte não tem um)
  confirmedByPrimary: boolean; // confirmado pela fonte principal (CBF)?
}

/** universe.json: o universo é o conjunto de competições, clubes e jogadores de uma temporada/mundo. */
export interface UniverseManifest {
  id: string;
  name: string;
  season: number;
  country: string;
  competitions: string[]; // ids de competição deste universo
  competitionFiles?: string[]; // arquivos das competições (padrão: ["competition.json"])
  defaultCompetitionId: string;
  primarySource: string; // id em sources.json (ex.: "cbf")
  dataStatus: string; // texto livre: o que está confirmado e o que falta
}

/** competition.json */
export interface Competition {
  id: string;
  universeId: string;
  name: string;
  season: number;
  country: string;
  division: number; // 1 = primeira divisão
  clubs: string[]; // ids de clube
}

/** clubs.json (um item). Identidade no jogo: NOME + COR; nada de escudo/imagem obrigatório. */
export interface UniverseClub {
  id: string; // estável entre temporadas (ex.: "br-palmeiras")
  name: string; // nome popular
  fullName: string | null;
  competitionId: string;
  division: number;
  city: string | null;
  state: string | null;
  stadium: { name: string; capacity: number | null } | null;
  colors: { primary: string; secondary: string; accent?: string } | null; // null = ausente na fonte
  /** de onde vieram as cores (ex.: "curadoria-elite-manager"); ausente = mesma fonte do clube */
  colorsSource?: string | null;
  country?: string | null;
  /** ids do clube em fontes externas (ex.: { cbf: "20002" }) */
  externalIds?: Record<string, string>;
  /** origem dos campos que não vieram da fonte principal (ex.: { city: "wikipedia-en" }) */
  fieldSources?: Record<string, string>;
  source: SourceRef;
}

/**
 * players.json (um item). Sem atributos extras: posição + força 1–50, como no resto do jogo.
 * Nome: o jogo exibe SÓ displayName. Regra (resolveDisplayName): apelido da fonte, se existir e não estiver
 * vazio; senão, o nome disponível. fullName é referência e nunca chega ao engine nem à interface.
 */
export interface UniversePlayer {
  id: string; // estável; nunca o nome
  fullName: string | null; // nome completo/civil, só quando a fonte informa
  nickname: string | null; // campo "Apelido" da fonte, quando existir
  displayName: string; // o nome que o jogo mostra
  clubId: string;
  /** null = nenhuma fonte informou a posição (a CBF não publica posição); jogador fica fora do elenco jogável */
  position: UniversePosition | null;
  number: number | null; // 1–99; null = ausente
  age: number | null; // null = ausente
  nationality: string | null;
  strength: number | null; // força ELITE MANAGER 1–50; null = ainda não avaliada
  status: PlayerStatus;
  notes: string | null; // ex.: "capitão", "emprestado por Cruzeiro"
  source: SourceRef;
  // ---- campos acrescentados na etapa "Universo real + EM-RATING" (todos opcionais: arquivos antigos continuam válidos) ----
  /** data de nascimento ISO (AAAA-MM-DD), da fonte principal */
  birthDate?: string | null;
  /** ids do jogador em fontes externas (ex.: { cbf: "710301" }) */
  externalIds?: Record<string, string>;
  /** fonte de cada campo que NÃO veio da fonte principal (ex.: { position: "wikipedia-en", nationality: "wikipedia-en" }) */
  fieldSources?: Record<string, string>;
  /** versão da metodologia que produziu `strength` (null = força não aplicada) */
  strengthMethodVersion?: string | null;
  strengthNotes?: string | null;
}

/** sources.json (um item). */
export interface DataSource {
  id: string;
  name: string;
  role: 'principal' | 'conferencia' | 'curadoria';
  url: string | null;
  retrievedAt: string | null;
  notes: string;
}

/** Universo carregado em memória (elenco de cada clube já montado a partir de players.json). */
export interface Universe {
  manifest: UniverseManifest;
  sources: DataSource[];
  competitions: Record<string, Competition>;
  clubs: Record<string, UniverseClub & { squad: string[] }>;
  players: Record<string, UniversePlayer>;
}

/** Arquivos de um universo, já lidos como JSON (ainda sem validação). */
export interface UniverseFiles {
  universe: unknown;
  competitions: unknown[];
  clubs: unknown;
  players: unknown;
  sources: unknown;
}
