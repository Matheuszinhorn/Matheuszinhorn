import type { UniverseClub, UniversePlayer } from '../model.ts';
import { clubIdFor, normalizeName, normalizeNationality, normalizeNotes, normalizeOptionalInt, normalizePosition, playerIdFor, resolveDisplayName } from '../normalize.ts';

// Importador do formato bruto "wikipedia-fs-player": as linhas {{Fs player|no=|nat=|pos=|name=|other=}} do elenco
// principal de cada artigo de clube, copiadas sem alteração para raw/*.raw.json. Este arquivo só NORMALIZA:
// não busca nada na internet, não completa lacuna e não decide força.

export interface WikipediaRawClub {
  club: string; // slug do clube no snapshot
  commonName: string;
  fullName: string | null;
  city: string | null;
  state: string | null;
  stadium: string | null;
  capacity: number | null;
  article: string;
  articleUrl: string;
  articleRevision: number | null;
}

export interface WikipediaRawPlayer {
  club: string;
  no: string | null;
  nat: string | null;
  pos: string | null;
  name: string; // como na fonte, com marcação de link: "[[Alvo|Texto]]"
  other: string | null;
}

export interface WikipediaRawSnapshot {
  format: 'wikipedia-fs-player';
  source: string; // id em sources.json
  country: string;
  clubs: WikipediaRawClub[];
  players: WikipediaRawPlayer[];
}

export interface NormalizedRecords {
  clubs: UniverseClub[];
  players: UniversePlayer[];
}

/** Alvo do link de wiki do nome ("[[Carlos Miguel (footballer, born 1998)|Carlos Miguel]]" → "Carlos Miguel (footballer, born 1998)"). */
function linkTarget(raw: string): string | null {
  const m = /\[\[([^\]|#]+)/.exec(raw);
  return m ? m[1].trim().replace(/_/g, ' ') : null;
}

export function normalizeWikipediaSquads(raw: WikipediaRawSnapshot, target: { competitionId: string; division: number }): NormalizedRecords {
  const idOf = new Map<string, string>();
  const clubs: UniverseClub[] = raw.clubs.map((c) => {
    const id = clubIdFor(raw.country, c.club);
    idOf.set(c.club, id);
    return {
      id,
      name: normalizeName(c.commonName),
      fullName: c.fullName ? normalizeName(c.fullName) : null,
      competitionId: target.competitionId,
      division: target.division,
      city: c.city ? normalizeName(c.city) : null,
      state: c.state ? normalizeName(c.state) : null,
      stadium: c.stadium ? { name: normalizeName(c.stadium), capacity: c.capacity ?? null } : null,
      colors: null, // a fonte não traz as cores do clube de forma confiável: ausente (ver docs/UNIVERSES.md)
      source: { source: raw.source, ref: `enwiki:${c.article}`, confirmedByPrimary: false },
    };
  });

  const players: UniversePlayer[] = raw.players.map((p) => {
    // Clube desconhecido passa adiante com o slug cru: o validador aponta "clube inexistente".
    const clubId = idOf.get(p.club) ?? p.club;
    const target = linkTarget(p.name);
    const ref = target ? `enwiki:${target}` : null;
    // A Wikipédia não tem campo "Apelido" nem nome civil no elenco: mostra o nome esportivo do jogador.
    // Por isso fullName e nickname ficam null (ausentes) e o displayName é o nome disponível na fonte.
    return {
      id: playerIdFor(ref, clubId, p.name),
      fullName: null,
      nickname: null,
      displayName: resolveDisplayName(null, p.name),
      clubId,
      position: normalizePosition(p.pos) as UniversePlayer['position'],
      number: normalizeOptionalInt(p.no) as number | null,
      age: null, // a fonte (elenco) não informa idade: ausente
      nationality: normalizeNationality(p.nat),
      strength: null, // força ELITE MANAGER ainda não avaliada (nunca copiada de outro jogo/site)
      status: 'ATIVO',
      notes: normalizeNotes(p.other),
      source: { source: raw.source, ref, confirmedByPrimary: false },
    };
  });
  return { clubs, players };
}
