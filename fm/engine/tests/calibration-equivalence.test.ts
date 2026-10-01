import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_CONFIG } from '../config.ts';
import { autoLineup } from '../lineup.ts';
import { simulateMatch } from '../match/simulate.ts';
import { createRng } from '../rng.ts';
import { prepareFixture } from '../round.ts';
import { overallStrength } from '../strength.ts';
import type { Club, MatchInput, MatchState, Player } from '../types.ts';
import { generateWorld } from '../world/generate.ts';

// Equivalência com a calibração (motor 0.2.0). A tabela abaixo foi gerada pela LÓGICA VALIDADA em cópia temporária
// (sat 2 + chancesBase 4,75 + camada de qualidade C com h = 1,0 + homeAdvantage 1,25), NÃO por este motor.
// Este teste garante que a implementação definitiva reproduz a lógica validada: mesmas seeds, mesmo resultado, evento por evento.
// Se ele quebrar depois de uma mudança no motor, o comportamento calibrado mudou: não "conserte" a tabela sem nova calibração.
//
// Cenários do balance.ts (mundo "balance-world", seeds "balance:<cenário>:<índice>", índices 0–3 de cada um).

const BAL = generateWorld('balance-world');

function playersOf(...clubs: Club[]): Record<string, Player> {
  const out: Record<string, Player> = {};
  for (const c of clubs) for (const id of c.squad) out[id] = BAL.players[id];
  return out;
}

const overall = (c: Club) => overallStrength(autoLineup(c, BAL.players, {}, DEFAULT_CONFIG).starters, BAL.players, DEFAULT_CONFIG);
const ALL = BAL.divisions.flatMap((d) => d.clubIds.map((id) => BAL.clubs[id]));
const FIRST = BAL.divisions[0].clubIds.map((id) => BAL.clubs[id]);
const LAST = BAL.divisions[BAL.divisions.length - 1].clubIds.map((id) => BAL.clubs[id]);
const STRONGEST = FIRST.reduce((a, b) => (overall(b) > overall(a) ? b : a));
const WEAKEST = LAST.reduce((a, b) => (overall(b) < overall(a) ? b : a));

/** Time contra o próprio espelho (mesma força): clones dos jogadores com id sufixado. */
function mirror(club: Club): { home: Club; away: Club; players: Record<string, Player> } {
  const suffix = '~espelho';
  const players = playersOf(club);
  for (const id of club.squad) {
    const p = BAL.players[id];
    players[`${id}${suffix}`] = { ...p, id: `${id}${suffix}`, clubId: `${club.id}${suffix}`, condition: { ...p.condition } };
  }
  const away: Club = { ...club, id: `${club.id}${suffix}`, name: `${club.name} (espelho)`, squad: club.squad.map((id) => `${id}${suffix}`), penaltyTakerId: club.penaltyTakerId ? `${club.penaltyTakerId}${suffix}` : null };
  return { home: club, away, players };
}

const worldPairs: [Club, Club][] = (() => {
  const rng = createRng('balance:pares');
  const out: [Club, Club][] = [];
  for (let i = 0; i < 4; i++) {
    const div = BAL.divisions[i % BAL.divisions.length];
    const a = rng.int(0, div.clubIds.length - 1);
    let b = rng.int(0, div.clubIds.length - 2);
    if (b >= a) b += 1;
    out.push([BAL.clubs[div.clubIds[a]], BAL.clubs[div.clubIds[b]]]);
  }
  return out;
})();

function pairFor(scenario: string, index: number): { home: Club; away: Club; players: Record<string, Player> } {
  if (scenario === 'equal') return mirror(ALL[index % ALL.length]);
  if (scenario === 'world') return { home: worldPairs[index][0], away: worldPairs[index][1], players: playersOf(...worldPairs[index]) };
  if (scenario === 'strong_home') return { home: STRONGEST, away: WEAKEST, players: playersOf(STRONGEST, WEAKEST) };
  return { home: WEAKEST, away: STRONGEST, players: playersOf(WEAKEST, STRONGEST) };
}

function play(scenario: string, index: number): MatchState {
  const { home, away, players } = pairFor(scenario, index);
  const fx = prepareFixture(`bal-${scenario}-${index}`, home, away, players);
  const input: MatchInput = { matchId: fx.matchId, seed: `balance:${scenario}:${index}`, home: fx.home, away: fx.away, controlledClubId: null, attendance: fx.attendance };
  return simulateMatch(input);
}

/** FNV-1a de 32 bits: resumo compacto e determinístico de uma lista de eventos ou de comandos. */
function digest(value: unknown): string {
  const str = JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

interface Expected {
  id: string;
  score: string;
  chances: string; // mandante/visitante
  goals: number;
  penalties: number;
  yellow: number;
  red: number;
  injuries: number;
  subs: number;
  events: number;
  commands: number;
  eventsDigest: string;
  commandsDigest: string;
}

// Gerada pela lógica validada (ver cabeçalho). Não editar à mão.
const EXPECTED: Expected[] = [
  { id: 'equal-0', score: '0-0', chances: '3/3', goals: 0, penalties: 0, yellow: 2, red: 0, injuries: 0, subs: 0, events: 12, commands: 0, eventsDigest: '44496400', commandsDigest: '741638a5' },
  { id: 'equal-1', score: '1-5', chances: '5/7', goals: 6, penalties: 0, yellow: 8, red: 1, injuries: 0, subs: 0, events: 23, commands: 1, eventsDigest: '215514dc', commandsDigest: '10b50096' },
  { id: 'equal-2', score: '1-0', chances: '1/4', goals: 1, penalties: 1, yellow: 8, red: 1, injuries: 0, subs: 0, events: 20, commands: 2, eventsDigest: '6f73ef51', commandsDigest: '96bdffa2' },
  { id: 'equal-3', score: '1-1', chances: '2/2', goals: 2, penalties: 1, yellow: 4, red: 0, injuries: 0, subs: 0, events: 14, commands: 1, eventsDigest: 'ae10f765', commandsDigest: '031b3fb0' },
  { id: 'world-0', score: '0-1', chances: '2/5', goals: 1, penalties: 0, yellow: 6, red: 1, injuries: 0, subs: 0, events: 19, commands: 1, eventsDigest: 'f399262b', commandsDigest: '215f0e53' },
  { id: 'world-1', score: '3-0', chances: '11/3', goals: 3, penalties: 1, yellow: 4, red: 0, injuries: 1, subs: 1, events: 21, commands: 2, eventsDigest: 'efcf5ac2', commandsDigest: '07fdaf57' },
  { id: 'world-2', score: '3-1', chances: '8/2', goals: 4, penalties: 0, yellow: 6, red: 1, injuries: 1, subs: 1, events: 23, commands: 2, eventsDigest: 'd4861799', commandsDigest: '2234bef8' },
  { id: 'world-3', score: '2-3', chances: '3/5', goals: 5, penalties: 3, yellow: 4, red: 0, injuries: 0, subs: 0, events: 22, commands: 3, eventsDigest: '34b03739', commandsDigest: '76c5eeb9' },
  { id: 'strong_home-0', score: '2-0', chances: '7/0', goals: 2, penalties: 0, yellow: 3, red: 1, injuries: 0, subs: 0, events: 14, commands: 1, eventsDigest: 'd4bd1d1e', commandsDigest: 'f3019b02' },
  { id: 'strong_home-1', score: '4-0', chances: '8/0', goals: 4, penalties: 0, yellow: 8, red: 0, injuries: 0, subs: 0, events: 21, commands: 0, eventsDigest: 'e0183db4', commandsDigest: '741638a5' },
  { id: 'strong_home-2', score: '3-1', chances: '7/0', goals: 4, penalties: 1, yellow: 8, red: 0, injuries: 0, subs: 0, events: 21, commands: 1, eventsDigest: '541da48b', commandsDigest: '6ad62ee4' },
  { id: 'strong_home-3', score: '5-0', chances: '16/1', goals: 5, penalties: 1, yellow: 4, red: 0, injuries: 1, subs: 1, events: 26, commands: 2, eventsDigest: 'f75ea0f0', commandsDigest: '04aaa866' },
  { id: 'weak_home-0', score: '0-1', chances: '0/10', goals: 1, penalties: 0, yellow: 3, red: 0, injuries: 0, subs: 0, events: 14, commands: 0, eventsDigest: '6c6febf4', commandsDigest: '741638a5' },
  { id: 'weak_home-1', score: '1-1', chances: '2/9', goals: 2, penalties: 0, yellow: 5, red: 0, injuries: 0, subs: 0, events: 18, commands: 0, eventsDigest: '91c9e593', commandsDigest: '741638a5' },
  { id: 'weak_home-2', score: '0-3', chances: '0/6', goals: 3, penalties: 0, yellow: 8, red: 0, injuries: 0, subs: 0, events: 17, commands: 0, eventsDigest: '5735bc56', commandsDigest: '741638a5' },
  { id: 'weak_home-3', score: '0-4', chances: '1/10', goals: 4, penalties: 0, yellow: 6, red: 2, injuries: 0, subs: 0, events: 22, commands: 2, eventsDigest: '0d5cbbf5', commandsDigest: 'f2c5046f' },
];

for (const e of EXPECTED) {
  const scenario = e.id.slice(0, e.id.lastIndexOf('-'));
  const index = Number(e.id.slice(e.id.lastIndexOf('-') + 1));
  test(`equivalência com a calibração (0.2.0): balance:${scenario}:${index} reproduz a lógica validada evento por evento`, () => {
    const s = play(scenario, index);
    const sum = (k: 'goals' | 'penalties' | 'yellowCards' | 'redCards' | 'injuries') => s.stats.home[k] + s.stats.away[k];
    assert.equal(s.status, 'FINISHED');
    assert.equal(`${s.score.home}-${s.score.away}`, e.score, 'placar');
    assert.equal(`${s.stats.home.chances}/${s.stats.away.chances}`, e.chances, 'chances (mandante/visitante)');
    assert.equal(sum('goals'), e.goals, 'gols');
    assert.equal(sum('penalties'), e.penalties, 'pênaltis');
    assert.equal(sum('yellowCards'), e.yellow, 'amarelos');
    assert.equal(sum('redCards'), e.red, 'vermelhos');
    assert.equal(sum('injuries'), e.injuries, 'lesões');
    assert.equal(s.home.subsUsed + s.away.subsUsed, e.subs, 'substituições');
    assert.equal(s.events.length, e.events, 'quantidade de eventos');
    assert.equal(s.commands.length, e.commands, 'quantidade de comandos/decisões');
    assert.equal(digest(s.events), e.eventsDigest, 'resumo dos eventos (ordem, minuto, tipo, jogador, detalhe)');
    assert.equal(digest(s.commands), e.commandsDigest, 'resumo dos comandos (decisões da CPU)');
    assert.equal(s.engineVersion, '0.2.0');
  });
}
