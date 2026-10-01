import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseUniverseJson } from './import-json.ts';
import type { ValidationResult } from './validate.ts';

// Leitura de um universo do disco (só Node: testes e scripts). O jogo no navegador não usa este arquivo.

export const UNIVERSES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'universes');

export function loadUniverseFromDir(dir: string): ValidationResult {
  const read = (f: string) => readFileSync(join(dir, f), 'utf8');
  const manifest = JSON.parse(read('universe.json')) as { competitionFiles?: string[] };
  return parseUniverseJson({
    universe: read('universe.json'),
    competitions: (manifest.competitionFiles ?? ['competition.json']).map(read),
    clubs: read('clubs.json'),
    players: read('players.json'),
    sources: read('sources.json'),
  });
}

export function loadUniverse(id: string): ValidationResult {
  return loadUniverseFromDir(join(UNIVERSES_DIR, id));
}
