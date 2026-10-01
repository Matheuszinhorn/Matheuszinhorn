import type { Competition, DataSource, Universe, UniverseClub, UniverseFiles, UniverseManifest, UniversePlayer } from './model.ts';
import { PLAYER_STATUSES, UNIVERSE_POSITIONS } from './model.ts';
import { normalizeName, POSITION_SUGGESTIONS, resolveDisplayName } from './normalize.ts';

// Validação dos arquivos de um universo. Nada é corrigido aqui: só apontado, com mensagem clara e, quando
// existe, uma sugestão. Com qualquer ERROR o universo não é montado (WARNING não impede).

export type IssueCode =
  | 'INVALID_FILE'
  | 'MISSING_FIELD'
  | 'COMPETITION_NOT_FOUND'
  | 'COMPETITION_DUPLICATE_ID'
  | 'CLUB_NOT_FOUND'
  | 'CLUB_DUPLICATE_ID'
  | 'CLUB_NOT_IN_COMPETITION'
  | 'PLAYER_WITHOUT_CLUB'
  | 'PLAYER_DUPLICATE_ID'
  | 'PLAYER_DUPLICATE'
  | 'DISPLAY_NAME_MISMATCH'
  | 'INVALID_POSITION'
  | 'STRENGTH_OUT_OF_RANGE'
  | 'INVALID_NUMBER'
  | 'DUPLICATE_NUMBER'
  | 'INVALID_AGE'
  | 'INVALID_STATUS'
  | 'UNKNOWN_SOURCE'
  | 'SQUAD_TOO_SMALL'
  | 'NO_GOALKEEPER';

export interface Issue {
  level: 'ERROR' | 'WARNING';
  code: IssueCode;
  entity: string; // id do registro (ou nome do arquivo)
  message: string;
  suggestion: string | null;
}

export interface ValidationResult {
  ok: boolean; // sem ERROR
  issues: Issue[];
  universe: Universe | null;
}

/** "ERROR:\nplayer_123\nposição inválida: \"VOL\"\n\nSugestão:\nMEI" */
export function formatIssue(i: Issue): string {
  return `${i.level}:\n${i.entity}\n${i.message}${i.suggestion ? `\n\nSugestão:\n${i.suggestion}` : ''}`;
}

const MIN_SQUAD = 11; // o engine precisa de 11 jogadores disponíveis para escalar

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

export function validateUniverse(files: UniverseFiles): ValidationResult {
  const issues: Issue[] = [];
  const err = (code: IssueCode, entity: string, message: string, suggestion: string | null = null) => issues.push({ level: 'ERROR', code, entity, message, suggestion });
  const warn = (code: IssueCode, entity: string, message: string, suggestion: string | null = null) => issues.push({ level: 'WARNING', code, entity, message, suggestion });
  const need = (obj: Record<string, unknown>, entity: string, fields: string[]) => {
    for (const f of fields) if (obj[f] === undefined || obj[f] === null || obj[f] === '') err('MISSING_FIELD', entity, `campo obrigatório ausente: "${f}"`);
  };

  // ---------- universe.json ----------
  const m = files.universe;
  if (!isObj(m)) {
    err('INVALID_FILE', 'universe.json', 'universe.json não é um objeto JSON');
    return { ok: false, issues, universe: null };
  }
  need(m, 'universe.json', ['id', 'name', 'season', 'country', 'competitions', 'defaultCompetitionId', 'primarySource']);
  const manifest = m as unknown as UniverseManifest;
  const manifestComps: string[] = Array.isArray(m.competitions) ? m.competitions.map(String) : [];

  // ---------- sources.json ----------
  const sources: DataSource[] = Array.isArray(files.sources) ? (files.sources as DataSource[]) : [];
  if (!Array.isArray(files.sources)) err('INVALID_FILE', 'sources.json', 'sources.json deve ser uma lista');
  const sourceIds = new Set(sources.map((s) => s.id));

  // ---------- competições ----------
  const competitions: Record<string, Competition> = {};
  for (const c of files.competitions) {
    if (!isObj(c) || !isStr(c.id)) {
      err('INVALID_FILE', 'competition.json', 'competição sem "id"');
      continue;
    }
    if (competitions[c.id]) err('COMPETITION_DUPLICATE_ID', c.id, `competição repetida: "${c.id}"`);
    need(c, c.id, ['name', 'season', 'country', 'division', 'clubs']);
    if (c.universeId !== manifest.id) err('COMPETITION_NOT_FOUND', c.id, `competição pertence a outro universo: "${String(c.universeId)}"`, String(manifest.id));
    if (!manifestComps.includes(c.id)) err('COMPETITION_NOT_FOUND', c.id, 'competição não listada em universe.json');
    competitions[c.id] = c as unknown as Competition;
  }
  for (const id of manifestComps) if (!competitions[id]) err('COMPETITION_NOT_FOUND', 'universe.json', `competição inexistente: "${id}"`);
  if (isStr(m.defaultCompetitionId) && !manifestComps.includes(m.defaultCompetitionId)) err('COMPETITION_NOT_FOUND', 'universe.json', `competição padrão inexistente: "${m.defaultCompetitionId}"`);

  // ---------- clubes ----------
  const clubs: Record<string, UniverseClub & { squad: string[] }> = {};
  if (!Array.isArray(files.clubs)) err('INVALID_FILE', 'clubs.json', 'clubs.json deve ser uma lista');
  for (const c of Array.isArray(files.clubs) ? files.clubs : []) {
    if (!isObj(c) || !isStr(c.id)) {
      err('INVALID_FILE', 'clubs.json', 'clube sem "id"');
      continue;
    }
    if (clubs[c.id]) err('CLUB_DUPLICATE_ID', c.id, `clubId duplicado: "${c.id}"`);
    need(c, c.id, ['name', 'competitionId', 'division', 'source']);
    if (isStr(c.competitionId) && !competitions[c.competitionId]) err('COMPETITION_NOT_FOUND', c.id, `competição inexistente: "${c.competitionId}"`);
    else if (isStr(c.competitionId) && !competitions[c.competitionId].clubs?.includes(c.id)) err('CLUB_NOT_IN_COMPETITION', c.id, `clube não listado em ${c.competitionId}`);
    if (isObj(c.source) && isStr(c.source.source) && !sourceIds.has(c.source.source)) warn('UNKNOWN_SOURCE', c.id, `fonte não cadastrada em sources.json: "${c.source.source}"`);
    clubs[c.id] = { ...(c as unknown as UniverseClub), squad: [] };
  }
  for (const comp of Object.values(competitions)) for (const id of Array.isArray(comp.clubs) ? comp.clubs : []) if (!clubs[id]) err('CLUB_NOT_FOUND', comp.id, `clube inexistente: "${id}"`);

  // ---------- jogadores ----------
  const players: Record<string, UniversePlayer> = {};
  const byRef = new Map<string, string>();
  const byClubName = new Map<string, string>();
  const byClubNumber = new Map<string, string>();
  if (!Array.isArray(files.players)) err('INVALID_FILE', 'players.json', 'players.json deve ser uma lista');
  for (const p of Array.isArray(files.players) ? files.players : []) {
    if (!isObj(p) || !isStr(p.id)) {
      err('INVALID_FILE', 'players.json', 'jogador sem "id"');
      continue;
    }
    const id = p.id;
    if (players[id]) err('PLAYER_DUPLICATE_ID', id, `playerId duplicado: "${id}"`);
    need(p, id, ['displayName', 'position', 'status', 'source']);
    // Regra do nome exibido: com apelido na fonte, displayName TEM de ser o apelido.
    const expected = resolveDisplayName(p.nickname as string | null, p.displayName as string | null);
    if (isStr(p.displayName) && expected !== p.displayName) err('DISPLAY_NAME_MISMATCH', id, `displayName "${p.displayName}" diferente do apelido "${String(p.nickname)}"`, expected);
    if (!isStr(p.clubId)) err('PLAYER_WITHOUT_CLUB', id, 'jogador sem clubId');
    else if (!clubs[p.clubId]) err('CLUB_NOT_FOUND', id, `clube inexistente: "${p.clubId}"`);

    const pos = String(p.position ?? '');
    if (!(UNIVERSE_POSITIONS as readonly string[]).includes(pos)) {
      err('INVALID_POSITION', id, `posição inválida: "${pos}"`, POSITION_SUGGESTIONS[pos.toUpperCase()] ?? `uma de ${UNIVERSE_POSITIONS.join(', ')}`);
    }
    if (p.strength !== null && p.strength !== undefined && !(isInt(p.strength) && p.strength >= 1 && p.strength <= 50)) {
      err('STRENGTH_OUT_OF_RANGE', id, `força fora de 1–50: ${JSON.stringify(p.strength)}`, isInt(p.strength) ? String(Math.max(1, Math.min(50, p.strength))) : 'null (ainda não avaliada)');
    }
    if (p.number !== null && p.number !== undefined && !(isInt(p.number) && p.number >= 1 && p.number <= 99)) {
      err('INVALID_NUMBER', id, `número inválido: ${JSON.stringify(p.number)}`, 'inteiro de 1 a 99, ou null se ausente');
    }
    if (p.age !== null && p.age !== undefined && !(isInt(p.age) && p.age >= 14 && p.age <= 50)) {
      err('INVALID_AGE', id, `idade inválida: ${JSON.stringify(p.age)}`, 'inteiro de 14 a 50, ou null se ausente');
    }
    if (!(PLAYER_STATUSES as readonly string[]).includes(String(p.status))) err('INVALID_STATUS', id, `status inválido: "${String(p.status)}"`, PLAYER_STATUSES.join(', '));

    if (isStr(p.clubId) && isStr(p.displayName)) {
      // Duplicidade: mesmo nome completo (se houver) ou, sem ele, mesmo nome exibido no mesmo clube.
      const who = isStr(p.fullName) ? `completo:${normalizeName(p.fullName)}` : `exibido:${normalizeName(p.displayName)}`;
      const nameKey = `${p.clubId}|${who.toLowerCase()}`;
      const prev = byClubName.get(nameKey);
      if (prev && prev !== id) err('PLAYER_DUPLICATE', id, `jogador duplicado no clube: "${p.displayName}" (também ${prev})`);
      byClubName.set(nameKey, id);
      if (isInt(p.number)) {
        const numKey = `${p.clubId}|${p.number}`;
        const other = byClubNumber.get(numKey);
        if (other && other !== id) warn('DUPLICATE_NUMBER', id, `número ${p.number} repetido no clube (também ${other})`);
        byClubNumber.set(numKey, id);
      }
    }
    if (isObj(p.source)) {
      if (isStr(p.source.ref)) {
        const prev = byRef.get(p.source.ref);
        if (prev && prev !== id) err('PLAYER_DUPLICATE', id, `mesmo jogador da fonte em dois registros: "${p.source.ref}" (também ${prev})`);
        byRef.set(p.source.ref, id);
      }
      if (isStr(p.source.source) && !sourceIds.has(p.source.source)) warn('UNKNOWN_SOURCE', id, `fonte não cadastrada em sources.json: "${p.source.source}"`);
    }
    players[id] = p as unknown as UniversePlayer;
    if (isStr(p.clubId) && clubs[p.clubId]) clubs[p.clubId].squad.push(id);
  }

  // ---------- elencos jogáveis ----------
  for (const c of Object.values(clubs)) {
    if (c.squad.length < MIN_SQUAD) err('SQUAD_TOO_SMALL', c.id, `elenco com ${c.squad.length} jogadores (mínimo ${MIN_SQUAD})`);
    if (!c.squad.some((pid) => players[pid]?.position === 'GOL')) err('NO_GOALKEEPER', c.id, 'elenco sem goleiro (GOL)');
  }

  const ok = !issues.some((i) => i.level === 'ERROR');
  return { ok, issues, universe: ok ? { manifest, sources, competitions, clubs, players } : null };
}
