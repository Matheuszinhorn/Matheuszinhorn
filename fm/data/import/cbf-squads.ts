import type { PlayerRatingRef, UniverseClub, UniversePlayer, UniversePosition } from '../model.ts';
import { normalizeName, normalizeNationality, resolveDisplayName } from '../normalize.ts';
import { foldName, isoDate, namesCompatible } from '../rating/em-rating.ts';

// Importador "CBF" (fonte PRINCIPAL): elencos da Série A a partir do snapshot bruto do site oficial da CBF.
// Da CBF vêm: id do atleta, nome civil, APELIDO, data de nascimento e clube ATUAL (atleta_time_atual).
// A CBF não publica posição, número nem nacionalidade: esses campos vêm da fonte de conferência (Wikipédia), só quando
// o mesmo jogador é encontrado nela sem ambiguidade, e a origem fica gravada em fieldSources. Nada é estimado.

export interface CbfRawAthlete {
  cbfId: string;
  name: string; // atleta_nome (civil)
  nickname: string | null; // Atleta_apelido
}

export interface CbfRawTeam {
  cbfTeamId: string;
  pageTitle: string; // "Palmeiras - SP"
  fullName: string | null;
  uf: string | null;
  athletes: CbfRawAthlete[];
}

export interface CbfRawDetail {
  birth: string | null; // DD/MM/AAAA
  current: { time_id: string; time_nome: string; time_nome_popular: string; time_uf: string } | null;
  years: string[];
  matches: number | null;
  goals: number | null;
}

export interface CbfRawSnapshot {
  format: 'cbf-site-atletas';
  source: string;
  retrievedAt: string;
  teamUrl: string;
  athleteUrl: string;
  teams: CbfRawTeam[];
  athletes: Record<string, CbfRawDetail>;
}

/** Idade máxima aceita para jogador (a mesma do validador). */
export const MAX_PLAYER_AGE = 50;

const WIKI_POSITION: Record<string, UniversePosition> = { GOL: 'GOL', DEF: 'DEF', MEI: 'MEI', ATA: 'ATA' };
/** Posição curta do EA FC → posição do ELITE MANAGER (só usada quando a Wikipédia não informa). */
export const EA_POSITION: Record<string, UniversePosition> = {
  GK: 'GOL', CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  CDM: 'MEI', CM: 'MEI', CAM: 'MEI', LM: 'MEI', RM: 'MEI',
  LW: 'ATA', RW: 'ATA', ST: 'ATA', CF: 'ATA',
};

/** Idade (anos completos) numa data de referência ISO. */
export function ageAt(birthIso: string | null, refIso: string): number | null {
  if (!birthIso) return null;
  const [by, bm, bd] = birthIso.split('-').map(Number);
  const [ry, rm, rd] = refIso.slice(0, 10).split('-').map(Number);
  return ry - by - (rm < bm || (rm === bm && rd < bd) ? 1 : 0);
}

export interface CbfImportInput {
  raw: CbfRawSnapshot;
  /** clubes existentes do universo (id, nome): o clube CBF é ligado pelo nome */
  clubs: UniverseClub[];
  /** jogadores da fonte de conferência (Wikipédia), para posição/número/nacionalidade */
  reference: UniversePlayer[];
  referenceSource: string; // id em sources.json (ex.: "wikipedia-en")
  /** referências externas de força já ligadas, por id CBF do atleta */
  ratings: Record<string, PlayerRatingRef>;
}

export interface CbfImportReport {
  athletes: number;
  ativos: number;
  transferidos: number;
  semPagina: number;
  posicaoReferencia: number;
  posicaoEa: number;
  semPosicao: number;
  ambiguosReferencia: number;
  referenciaSemCbf: string[]; // jogadores da Wikipédia que a CBF não lista no clube
  foraDoUniverso: string[]; // registros da lista de atletas da CBF que não podem ser jogador (ex.: idade acima do limite)
  clubMap: Record<string, string>; // cbfTeamId → clubId
}

const teamName = (title: string) => foldName(title.split(' - ')[0]).replace(/ (saf|fc)$/, '');

export function clubMapFor(teams: readonly CbfRawTeam[], clubs: readonly UniverseClub[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of teams) {
    const n = teamName(t.pageTitle);
    const hits = clubs.filter((c) => {
      const cn = foldName(c.name);
      return cn === n || cn.startsWith(n) || n.startsWith(cn);
    });
    if (hits.length !== 1) throw new Error(`clube da CBF sem par único no universo: "${t.pageTitle}" (${hits.length})`);
    map[t.cbfTeamId] = hits[0].id;
  }
  return map;
}

const namesOf = (a: CbfRawAthlete) => [a.nickname, a.name].filter((x): x is string => !!x && !!x.trim());

/**
 * Liga atleta da CBF ↔ jogador da fonte de conferência no MESMO clube, só quando a ligação é mútua e única:
 * 1º nome idêntico (sem acento/caixa); depois, entre os que sobraram, as regras de namesCompatible.
 * Um jogador da conferência nunca vale para dois atletas (ex.: "Gabriel" e "Gabriel Girotto" no mesmo clube).
 */
export function matchReference(teams: readonly CbfRawTeam[], clubMap: Record<string, string>, reference: readonly UniversePlayer[]) {
  const refOf = new Map<string, UniversePlayer>();
  const ambiguous = new Set<string>();
  for (const t of teams) {
    const clubId = clubMap[t.cbfTeamId];
    let athletes = t.athletes.map((a) => ({ key: `${clubId}|${a.cbfId}`, names: namesOf(a) }));
    let refs = reference.filter((r) => r.clubId === clubId);
    const tiers: ((xs: string[], r: UniversePlayer) => boolean)[] = [
      (xs, r) => xs.some((x) => foldName(x) === foldName(r.displayName)),
      (xs, r) => namesCompatible(xs, [r.displayName]),
    ];
    for (const fits of tiers) {
      const hits = new Map(athletes.map((a) => [a.key, refs.filter((r) => fits(a.names, r))]));
      const claims = new Map<string, number>();
      for (const rs of hits.values()) for (const r of rs) claims.set(r.id, (claims.get(r.id) ?? 0) + 1);
      for (const a of athletes) {
        const rs = hits.get(a.key)!;
        if (rs.length === 1 && claims.get(rs[0].id) === 1) refOf.set(a.key, rs[0]);
      }
      const taken = new Set([...refOf.values()].map((r) => r.id));
      athletes = athletes.filter((a) => !refOf.has(a.key));
      refs = refs.filter((r) => !taken.has(r.id));
    }
    for (const a of athletes) if (refs.some((r) => namesCompatible(a.names, [r.displayName]))) ambiguous.add(a.key);
  }
  return { refOf, ambiguous };
}

export function importCbfSquads(i: CbfImportInput): { players: UniversePlayer[]; report: CbfImportReport } {
  const clubMap = clubMapFor(i.raw.teams, i.clubs);
  const refDate = i.raw.retrievedAt.slice(0, 10);
  const report: CbfImportReport = { athletes: 0, ativos: 0, transferidos: 0, semPagina: 0, posicaoReferencia: 0, posicaoEa: 0, semPosicao: 0, ambiguosReferencia: 0, referenciaSemCbf: [], foraDoUniverso: [], clubMap };
  const { refOf, ambiguous } = matchReference(i.raw.teams, clubMap, i.reference);
  const seen = new Map<string, UniversePlayer>();
  const usedRef = new Set<string>();
  for (const t of i.raw.teams) {
    const clubId = clubMap[t.cbfTeamId];
    for (const a of t.athletes) {
      const det = i.raw.athletes[a.cbfId];
      const currentId = det?.current?.time_id ?? null;
      const here = currentId === t.cbfTeamId;
      const prev = seen.get(a.cbfId);
      // o mesmo atleta inscrito por dois clubes da Série A: fica um registro, no clube ATUAL quando ele é um deles
      if (prev && (prev.status === 'ATIVO' || !here)) continue;
      const nickname = a.nickname && a.nickname.trim() ? normalizeName(a.nickname) : null;
      const fullName = normalizeName(a.name);
      const ref = refOf.get(`${clubId}|${a.cbfId}`) ?? null;
      if (ambiguous.has(`${clubId}|${a.cbfId}`)) report.ambiguosReferencia++;
      if (ref) usedRef.add(ref.id);
      const rating = i.ratings[a.cbfId] ?? null;
      const fieldSources: Record<string, string> = {};
      let position: UniversePosition | null = null;
      if (ref && ref.position && WIKI_POSITION[ref.position]) {
        position = WIKI_POSITION[ref.position];
        fieldSources.position = i.referenceSource;
      } else if (rating?.sourcePosition && EA_POSITION[rating.sourcePosition]) {
        position = EA_POSITION[rating.sourcePosition];
        fieldSources.position = rating.source;
      }
      const nationality = ref?.nationality ?? null;
      if (nationality) fieldSources.nationality = i.referenceSource;
      if (ref?.number) fieldSources.number = i.referenceSource;
      const birthDate = isoDate(det?.birth ?? null, 'DMY');
      const age = ageAt(birthDate, refDate);
      // a lista de "atletas" da CBF pode trazer membro da comissão técnica: acima da idade máxima de jogador, fica de fora (relatado, não apagado da fonte)
      if (age !== null && age > MAX_PLAYER_AGE) {
        report.foraDoUniverso.push(`${a.cbfId} ${fullName} (${t.pageTitle}): ${age} anos`);
        continue;
      }
      const notes = !det ? 'página do atleta não lida na CBF' : !here ? `clube atual na CBF: ${det.current?.time_nome_popular ?? 'desconhecido'}` : ref?.notes ?? null;
      const player: UniversePlayer = {
        id: `p-cbf-${a.cbfId}`,
        fullName,
        nickname,
        displayName: resolveDisplayName(nickname, fullName),
        clubId,
        position,
        number: ref?.number ?? null,
        age,
        nationality: nationality ? normalizeNationality(nationality) : null,
        strength: null,
        status: here ? 'ATIVO' : 'TRANSFERIDO',
        notes,
        source: { source: 'cbf', ref: `cbf:atleta:${a.cbfId}`, confirmedByPrimary: true },
        birthDate,
        externalIds: { cbf: a.cbfId, ...(rating ? { eaFc: rating.sourcePlayerId } : {}) },
        fieldSources,
        rating,
        strengthMethodVersion: null,
        strengthNotes: null,
      };
      seen.set(a.cbfId, player);
    }
  }
  const players = [...seen.values()].sort((x, y) => x.clubId.localeCompare(y.clubId) || x.displayName.localeCompare(y.displayName) || x.id.localeCompare(y.id));
  for (const p of players) {
    report.athletes++;
    if (p.status === 'ATIVO') report.ativos++;
    else report.transferidos++;
    if (!i.raw.athletes[p.externalIds!.cbf]) report.semPagina++;
    if (p.fieldSources?.position === i.referenceSource) report.posicaoReferencia++;
    else if (p.position) report.posicaoEa++;
    else report.semPosicao++;
  }
  report.referenciaSemCbf = i.reference.filter((r) => !usedRef.has(r.id)).map((r) => `${r.displayName} (${r.clubId})`);
  return { players, report };
}
