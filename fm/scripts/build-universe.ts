// Gera os arquivos de um universo a partir dos snapshots brutos versionados em data/universes/<id>/raw/:
//   CBF (fonte PRINCIPAL) + Wikipédia (conferência) + cores curadas → normalize → validate → competition/clubs/players.json
// Ferramenta de desenvolvimento (Node), SEM rede: o jogo nunca roda este script e nunca acessa fonte externa.
// Nenhum rating de terceiros entra aqui (EA FC e similares ficaram fora por decisão do proprietário, 03/10/2026).
// A força NÃO é aplicada (strength continua null); a simulação EM-RATING-2.0 é outro script (scripts/simulate-em-rating-2.ts).
// Uso: node scripts/build-universe.ts brasileirao-2026
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { importCbfSquads, type CbfRawSnapshot } from '../data/import/cbf-squads.ts';
import { normalizeWikipediaSquads, type WikipediaRawSnapshot } from '../data/import/wikipedia-squads.ts';
import { loadUniverseFromDir, UNIVERSES_DIR } from '../data/load-node.ts';
import type { UniverseClub } from '../data/model.ts';
import { formatIssue } from '../data/validate.ts';

const id = process.argv[2] ?? 'brasileirao-2026';
if (id !== 'brasileirao-2026') throw new Error(`universo sem receita de build: ${id}`);
const dir = join(UNIVERSES_DIR, id);
const read = (f: string) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const json = (v: unknown) => `${JSON.stringify(v, null, 1)}\n`;
const competition = { id: 'brasileirao-a-2026', name: 'Campeonato Brasileiro Série A', season: 2026, country: 'Brasil', division: 1 };

// 1. conferência: Wikipédia (clubes: cidade, estado, estádio; jogadores: posição, número, nacionalidade)
const wiki = read('raw/wikipedia-en-2026.raw.json') as WikipediaRawSnapshot;
const ref = normalizeWikipediaSquads(wiki, { competitionId: competition.id, division: competition.division });

// 2. principal: CBF
const cbf = read('raw/cbf-2026.raw.json') as CbfRawSnapshot;

// 4. clubes: dados da conferência + cores curadas + id da CBF
const colors = read('raw/club-colors.curated.json') as { source: string; clubs: Record<string, { primary: string; secondary: string; accent: string }> };
const { players, report } = importCbfSquads({ raw: cbf, clubs: ref.clubs, reference: ref.players, referenceSource: 'wikipedia-en' });
const cbfIdOf = Object.fromEntries(Object.entries(report.clubMap).map(([cbfId, clubId]) => [clubId, cbfId]));
const clubs: UniverseClub[] = ref.clubs.map((c) => {
  const col = colors.clubs[c.id];
  const cbfId = cbfIdOf[c.id];
  const team = cbf.teams.find((t) => t.cbfTeamId === cbfId);
  // o clube está na Série A segundo a CBF (página do time); cidade, estado e estádio vêm da conferência
  const fromRef = Object.fromEntries((['city', 'state', 'stadium'] as const).filter((k) => c[k] !== null).map((k) => [k, c.source.source]));
  return {
    ...c,
    fullName: team?.fullName ?? c.fullName,
    country: 'Brasil',
    colors: col ? { primary: col.primary, secondary: col.secondary, accent: col.accent } : null,
    colorsSource: col ? colors.source : null,
    externalIds: (cbfId ? { cbf: cbfId } : {}) as Record<string, string>,
    fieldSources: fromRef,
    source: cbfId ? { source: 'cbf', ref: `cbf:time:${cbfId}`, confirmedByPrimary: true } : c.source,
  };
});
writeFileSync(join(dir, 'competition.json'), json({ ...competition, universeId: id, clubs: clubs.map((c) => c.id) }));
writeFileSync(join(dir, 'clubs.json'), json(clubs));
writeFileSync(join(dir, 'players.json'), json(players));

const result = loadUniverseFromDir(dir);
const errors = result.issues.filter((i) => i.level === 'ERROR');
for (const i of errors) console.log(formatIssue(i));
const warnings: Record<string, number> = {};
for (const i of result.issues.filter((x) => x.level === 'WARNING')) warnings[i.code] = (warnings[i.code] ?? 0) + 1;
console.log(JSON.stringify({ report: { ...report, referenciaSemCbf: report.referenciaSemCbf.length }, avisos: warnings, erros: errors.length }, null, 1));
process.exit(result.ok ? 0 : 1);
