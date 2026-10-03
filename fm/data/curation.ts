// CURADORIA: correções e complementos manuais, sempre rastreáveis e separados do dado factual da fonte.
// Cada linha diz quem decidiu, quando, por quê e o valor anterior. A curadoria nunca reescreve players.json:
// ela é aplicada por cima, na hora do cálculo, e a origem fica registrada como fieldSource "curadoria".
// Hoje só o campo "position" é aceito (os atletas sem posição em nenhuma fonte; docs/PLAYER-RATINGS.md).

import { UNIVERSE_POSITIONS, type UniversePosition } from './model.ts';

export const CURATION_SOURCE = 'curadoria';
export const CURATION_FIELDS = ['position'] as const;
export type CurationField = (typeof CURATION_FIELDS)[number];

export interface CurationEntry {
  playerId: string;
  field: CurationField;
  oldValue: string | null;
  newValue: string;
  fieldSource: typeof CURATION_SOURCE;
  curator: string;
  date: string; // AAAA-MM-DD
  reason: string;
}

/**
 * Colunas do CSV. As de contexto (displayName, clubId, birthDate, referenciaAuxiliar) só ajudam quem preenche e são
 * ignoradas na leitura. referenciaAuxiliar = posição que a Wikipédia mostra, SÓ como apoio ao curador humano: nunca é
 * fonte oficial e nunca entra no cálculo; a decisão registrada é sempre a do curador (fieldSource "curadoria").
 */
export const CURATION_COLUMNS = ['playerId', 'displayName', 'clubId', 'birthDate', 'referenciaAuxiliar', 'field', 'oldValue', 'newValue', 'fieldSource', 'curator', 'date', 'reason'] as const;

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let k = 0; k < line.length; k++) {
    const ch = line[k];
    if (q) {
      if (ch === '"' && line[k + 1] === '"') { cur += '"'; k++; } else if (ch === '"') q = false; else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}

export const csvCell = (v: string | null | undefined) => {
  const s = v ?? '';
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Lê o CSV de curadoria. Linha com newValue vazio = pendente (ignorada, contada). Linha preenchida precisa de
 * curador, data e motivo; senão é erro (nada é aceito pela metade).
 */
export function parseCurationCsv(text: string): { entries: CurationEntry[]; pending: number; errors: string[] } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const errors: string[] = [];
  const entries: CurationEntry[] = [];
  let pending = 0;
  if (lines.length === 0) return { entries, pending, errors: ['arquivo vazio'] };
  const head = splitCsvLine(lines[0]);
  const col = (name: string) => head.indexOf(name);
  for (const need of ['playerId', 'field', 'oldValue', 'newValue', 'fieldSource', 'curator', 'date', 'reason']) if (col(need) < 0) errors.push(`coluna ausente: ${need}`);
  if (errors.length) return { entries, pending, errors };
  lines.slice(1).forEach((line, k) => {
    const cells = splitCsvLine(line);
    const get = (n: string) => (cells[col(n)] ?? '').trim();
    const where = `linha ${k + 2} (${get('playerId') || '?'})`;
    if (!get('newValue')) { pending++; return; }
    const field = get('field');
    if (!(CURATION_FIELDS as readonly string[]).includes(field)) { errors.push(`${where}: campo não curável "${field}"`); return; }
    if (get('fieldSource') !== CURATION_SOURCE) { errors.push(`${where}: fieldSource deve ser "${CURATION_SOURCE}"`); return; }
    if (field === 'position' && !(UNIVERSE_POSITIONS as readonly string[]).includes(get('newValue'))) { errors.push(`${where}: posição inválida "${get('newValue')}" (use ${UNIVERSE_POSITIONS.join(', ')})`); return; }
    if (!get('curator')) { errors.push(`${where}: curador ausente`); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(get('date'))) { errors.push(`${where}: data inválida "${get('date')}" (AAAA-MM-DD)`); return; }
    if (!get('reason')) { errors.push(`${where}: motivo ausente`); return; }
    entries.push({ playerId: get('playerId'), field: field as CurationField, oldValue: get('oldValue') || null, newValue: get('newValue'), fieldSource: CURATION_SOURCE, curator: get('curator'), date: get('date'), reason: get('reason') });
  });
  const seen = new Set<string>();
  for (const e of entries) {
    const key = `${e.playerId}|${e.field}`;
    if (seen.has(key)) errors.push(`${e.playerId}: mais de uma curadoria para "${e.field}"`);
    seen.add(key);
  }
  return { entries, pending, errors };
}

/**
 * Posições curadas, conferidas contra o universo: o jogador tem de existir e o oldValue tem de bater com o valor atual
 * (a curadoria não sobrescreve em silêncio um dado que mudou depois de ela ser escrita).
 */
export function curatedPositions(entries: readonly CurationEntry[], current: Record<string, { position: UniversePosition | null }>): { positions: Map<string, UniversePosition>; errors: string[] } {
  const positions = new Map<string, UniversePosition>();
  const errors: string[] = [];
  for (const e of entries) {
    if (e.field !== 'position') continue;
    const p = current[e.playerId];
    if (!p) { errors.push(`${e.playerId}: jogador inexistente no universo`); continue; }
    if ((p.position ?? null) !== e.oldValue) { errors.push(`${e.playerId}: oldValue "${e.oldValue}" diferente do atual "${p.position}"`); continue; }
    positions.set(e.playerId, e.newValue as UniversePosition);
  }
  return { positions, errors };
}
