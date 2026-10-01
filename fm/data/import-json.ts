import type { UniverseFiles } from './model.ts';
import { validateUniverse, type ValidationResult } from './validate.ts';

// Importação JSON (formato nativo do universo): textos dos arquivos → JSON → validação → Universe.
// Funciona igual no Node e no navegador (não lê disco nem rede: recebe os textos prontos).
// CSV e XLSX entram no futuro como outros "parsers" que produzem os mesmos UniverseFiles.

export interface UniverseJsonTexts {
  universe: string;
  competitions: string[]; // um texto por arquivo de competição (hoje: competition.json)
  clubs: string;
  players: string;
  sources: string;
}

export function parseUniverseJson(texts: UniverseJsonTexts): ValidationResult {
  const files: Partial<UniverseFiles> = {};
  const parseErrors: string[] = [];
  const parse = (name: string, text: string): unknown => {
    try {
      return JSON.parse(text);
    } catch (e) {
      parseErrors.push(`${name}: ${(e as Error).message}`);
      return null;
    }
  };
  files.universe = parse('universe.json', texts.universe);
  files.competitions = texts.competitions.map((t, i) => parse(`competition[${i}]`, t));
  files.clubs = parse('clubs.json', texts.clubs);
  files.players = parse('players.json', texts.players);
  files.sources = parse('sources.json', texts.sources);
  if (parseErrors.length) {
    return {
      ok: false,
      universe: null,
      issues: parseErrors.map((message) => ({ level: 'ERROR', code: 'INVALID_FILE', entity: message.split(':')[0], message: `JSON inválido — ${message}`, suggestion: null })),
    };
  }
  return validateUniverse(files as UniverseFiles);
}
