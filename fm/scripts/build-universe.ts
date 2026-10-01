// Gera os arquivos de um universo a partir do snapshot bruto: RAW → normalize → validate → competition/clubs/players.json.
// Ferramenta de desenvolvimento (Node), sem rede: lê só o que já está em data/universes/<id>/raw/.
// O jogo nunca roda este script e nunca acessa a fonte externa.
// Uso: node scripts/build-universe.ts brasileirao-2026
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeWikipediaSquads, type WikipediaRawSnapshot } from '../data/import/wikipedia-squads.ts';
import { loadUniverseFromDir, UNIVERSES_DIR } from '../data/load-node.ts';
import { formatIssue } from '../data/validate.ts';

const BUILDS: Record<string, { raw: string; competition: { id: string; name: string; season: number; country: string; division: number } }> = {
  'brasileirao-2026': {
    raw: 'raw/wikipedia-en-2026.raw.json',
    competition: { id: 'brasileirao-a-2026', name: 'Campeonato Brasileiro Série A', season: 2026, country: 'Brasil', division: 1 },
  },
};

const id = process.argv[2] ?? 'brasileirao-2026';
const build = BUILDS[id];
if (!build) throw new Error(`universo sem receita de build: ${id}`);
const dir = join(UNIVERSES_DIR, id);
const raw = JSON.parse(readFileSync(join(dir, build.raw), 'utf8')) as WikipediaRawSnapshot;
if (raw.format !== 'wikipedia-fs-player') throw new Error(`formato bruto não suportado: ${raw.format}`);

const { clubs, players } = normalizeWikipediaSquads(raw, { competitionId: build.competition.id, division: build.competition.division });
const competition = { ...build.competition, universeId: id, clubs: clubs.map((c) => c.id) };
const json = (v: unknown) => `${JSON.stringify(v, null, 1)}\n`;
writeFileSync(join(dir, 'competition.json'), json(competition));
writeFileSync(join(dir, 'clubs.json'), json(clubs));
writeFileSync(join(dir, 'players.json'), json(players));

const result = loadUniverseFromDir(dir);
for (const i of result.issues) console.log(`${formatIssue(i)}\n`);
const errors = result.issues.filter((i) => i.level === 'ERROR').length;
console.log(`${id}: ${clubs.length} clubes, ${players.length} jogadores, ${errors} erros, ${result.issues.length - errors} avisos`);
process.exit(result.ok ? 0 : 1);
