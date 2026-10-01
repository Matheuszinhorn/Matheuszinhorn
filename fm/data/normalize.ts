import type { UniversePosition } from './model.ts';

// Normalização: transforma valores como vieram da fonte em valores do modelo do universo.
// Regra: normalizar o formato (acentos, espaços, códigos conhecidos da fonte), NUNCA completar dado ausente.
// O que não puder ser normalizado com segurança passa adiante como está, para o validador apontar o erro.

/** Hash FNV-1a de 32 bits em 8 hex: base dos ids estáveis (o mesmo texto de origem dá sempre o mesmo id). */
export function hash8(text: string): string {
  let h = 0x811c9dc5;
  for (const ch of text.normalize('NFC')) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** "São Paulo FC" → "sao-paulo-fc": minúsculas, sem acento, só [a-z0-9-]. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Id estável de clube: independe da temporada (o mesmo clube mantém o id na Série A, B, C...). */
export function clubIdFor(country: string, slug: string): string {
  return `${slugify(country).slice(0, 2)}-${slugify(slug)}`;
}

/**
 * Id estável de jogador. Preferência: identificador do jogador na fonte (ex.: "enwiki:Gustavo Gómez").
 * Sem identificador na fonte, usa clube + nome normalizado (mais frágil; o registro fica marcado com ref = null).
 */
export function playerIdFor(sourceRef: string | null, clubId: string, name: string): string {
  return `p-${hash8(sourceRef ?? `${clubId}|${normalizeName(name).toLowerCase()}`)}`;
}

/** Remove marcação de wiki ([[alvo|texto]] → texto), espaços duplicados e espaços não separáveis. */
export function normalizeName(raw: string): string {
  return raw
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/[ \s]+/g, ' ')
    .trim()
    .normalize('NFC');
}

/**
 * Nome exibido pelo jogo: o apelido da fonte, se existir e não estiver vazio; senão, o primeiro nome disponível
 * (nome completo ou o nome que a fonte mostra). Ex.: nome "Gustavo Martins de Souza Santos", apelido "G. Martins" → "G. Martins".
 */
export function resolveDisplayName(nickname: string | null | undefined, ...available: (string | null | undefined)[]): string {
  const clean = (s: string | null | undefined) => (s ? normalizeName(s) : '');
  return clean(nickname) || available.map(clean).find((s) => s !== '') || '';
}

/** Códigos de posição aceitos sem ambiguidade: os do jogo e o vocabulário fixo das fontes já usadas (Wikipédia: GK/DF/MF/FW). */
const POSITION_ALIASES: Record<string, UniversePosition> = {
  GOL: 'GOL', DEF: 'DEF', MEI: 'MEI', ATA: 'ATA',
  GK: 'GOL', DF: 'DEF', MF: 'MEI', FW: 'ATA',
};

/** Sugestões para códigos que NÃO são convertidos automaticamente (o validador mostra a sugestão; a correção é humana). */
export const POSITION_SUGGESTIONS: Record<string, UniversePosition> = {
  G: 'GOL', GOLEIRO: 'GOL', ZAG: 'DEF', ZAGUEIRO: 'DEF', LAT: 'DEF', LD: 'DEF', LE: 'DEF', LATERAL: 'DEF',
  VOL: 'MEI', VOLANTE: 'MEI', MC: 'MEI', MEIA: 'MEI', MID: 'MEI',
  PD: 'ATA', PE: 'ATA', CA: 'ATA', SA: 'ATA', ATACANTE: 'ATA', ATT: 'ATA', PON: 'ATA', PONTA: 'ATA',
};

/** Posição conhecida → código do jogo; desconhecida → devolve o texto original (maiúsculo) para o validador. */
export function normalizePosition(raw: unknown): string {
  const key = String(raw ?? '').trim().toUpperCase();
  return POSITION_ALIASES[key] ?? key;
}

/** Número da camisa / idade: vazio → null; inteiro em texto → número; qualquer outra coisa passa adiante. */
export function normalizeOptionalInt(raw: unknown): number | null | unknown {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  const s = String(raw).trim();
  if (s === '' || s === '—' || s === '-') return null;
  return /^\d+$/.test(s) ? Number(s) : raw;
}

/** Nacionalidades: códigos e nomes em inglês das fontes → nome em português. Desconhecida → mantém o texto. */
const NATIONALITIES: Record<string, string> = {
  BRA: 'Brasil', BRAZIL: 'Brasil', ARG: 'Argentina', ARGENTINA: 'Argentina', URU: 'Uruguai', URUGUAY: 'Uruguai',
  PAR: 'Paraguai', PARAGUAY: 'Paraguai', COL: 'Colômbia', COLOMBIA: 'Colômbia', CHI: 'Chile', CHILE: 'Chile',
  ECU: 'Equador', ECUADOR: 'Equador', PER: 'Peru', PERU: 'Peru', VEN: 'Venezuela', VENEZUELA: 'Venezuela',
  BOL: 'Bolívia', BOLIVIA: 'Bolívia', PAN: 'Panamá', PANAMA: 'Panamá', POR: 'Portugal', PORTUGAL: 'Portugal',
  ESP: 'Espanha', SPAIN: 'Espanha', ITA: 'Itália', ITALY: 'Itália', ENG: 'Inglaterra', ENGLAND: 'Inglaterra',
  NED: 'Países Baixos', NETHERLANDS: 'Países Baixos', BEL: 'Bélgica', BELGIUM: 'Bélgica', DEN: 'Dinamarca',
  DENMARK: 'Dinamarca', SWE: 'Suécia', SWEDEN: 'Suécia', CRO: 'Croácia', CROATIA: 'Croácia', MAR: 'Marrocos',
  MOROCCO: 'Marrocos', GHA: 'Gana', GHANA: 'Gana', CMR: 'Camarões', CAMEROON: 'Camarões', COD: 'RD Congo',
  'DR CONGO': 'RD Congo', CPV: 'Cabo Verde', 'CAPE VERDE': 'Cabo Verde', ANG: 'Angola', ANGOLA: 'Angola',
  GUI: 'Guiné', GUINEA: 'Guiné', JPN: 'Japão', JAPAN: 'Japão',
};

export function normalizeNationality(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  return NATIONALITIES[s.toUpperCase()] ?? s;
}

/** Observações da fonte em português, sem marcação ("on loan from [[X|Y]]" → "emprestado por Y"). */
export function normalizeNotes(raw: unknown): string | null {
  const s = normalizeName(String(raw ?? ''))
    .replace(/\{\{\s*small\s*\|([^}]*)\}\}/gi, '$1')
    .replace(/<\/?small>/gi, '')
    .trim();
  if (!s) return null;
  const ORD: Record<string, string> = { '2nd': '2º', '3rd': '3º', '4th': '4º' };
  const one = (part: string): string => {
    const t = part.trim();
    const loan = /^on loan from (.+)$/i.exec(t);
    if (loan) return `emprestado por ${loan[1].trim()}`;
    const cap = /^(?:(2nd|3rd|4th) )?(vice-)?captain$/i.exec(t);
    if (cap) return `${cap[1] ? `${ORD[cap[1].toLowerCase()]} ` : ''}${cap[2] ? 'vice-capitão' : 'capitão'}`;
    return t;
  };
  return s.split(';').map(one).filter(Boolean).join('; ');
}
