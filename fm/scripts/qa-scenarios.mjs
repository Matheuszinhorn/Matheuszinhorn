// Procura, de forma determinística, carreiras em que o PRIMEIRO lance de decisão da rodada 1 do jogador é um caso raro
// (goleiro lesionado com/sem goleiro reserva, goleiro expulso) e grava saves para o QA de interface reproduzir.
// Uso: node scripts/qa-scenarios.mjs   → dist/qa/scenarios/<caso>.json  (o save + a decisão esperada)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { careerOffers, createCareer, planRound, resolveUserLineup, serializeCareer, withUserLineup } = await import('../game/career.ts');
const { awaitingMatch, createRound, stepRound } = await import('../engine/index.ts');

/** Primeira decisão do jogo do jogador na rodada 1 (ou null). Só simula a partida do jogador: as seeds são independentes por partida. */
function firstDecision(career) {
  const plan = planRound(career);
  const fx = plan.fixtures.find((f) => f.matchId === plan.userMatchId);
  let round = createRound(plan.roundId, plan.seed, [fx], plan.controlledClubId);
  for (let g = 0; g < 400; g++) {
    const m = awaitingMatch(round);
    if (m) {
      const d = m.decision;
      const team = m[d.side];
      const subject = d.playerId ? team.players[d.playerId] : null;
      return { type: d.type, side: d.side, subjectPos: subject?.position ?? null, eligibleHasGK: d.eligible.some((id) => team.players[id]?.position === 'GK'), eligible: d.eligible.length, minute: d.createdAt.minute };
    }
    if (round.matches.every((x) => x.status === 'FINISHED')) return null;
    round = stepRound(round);
  }
  return null;
}

const wants = {
  'goleiro-lesionado-com-reserva': (d) => d.type === 'INJURY_SUBSTITUTION' && d.subjectPos === 'GK' && d.eligibleHasGK,
  'goleiro-lesionado-sem-reserva': (d) => d.type === 'INJURY_SUBSTITUTION' && d.subjectPos === 'GK' && !d.eligibleHasGK,
  'goleiro-expulso-com-reserva': (d) => d.type === 'RED_CARD_ADJUSTMENT' && d.subjectPos === 'GK' && d.eligibleHasGK,
  'goleiro-expulso-sem-reserva': (d) => d.type === 'RED_CARD_ADJUSTMENT' && d.subjectPos === 'GK' && !d.eligibleHasGK,
};
// Casos "sem reserva": mesma carreira, banco só com jogadores de linha (a escolha é do jogador, validada pelo engine).
const NO_RESERVE = new Set(['goleiro-lesionado-sem-reserva', 'goleiro-expulso-sem-reserva']);
const found = {};
mkdirSync(join(ROOT, 'dist/qa/scenarios'), { recursive: true });
const t0 = Date.now();
const TOTAL = Object.keys(wants).length;
for (let i = 0; i < 20000 && Object.keys(found).length < TOTAL; i++) {
  const seed = `qa-cenario-${i}`;
  const clubId = careerOffers(seed)[0];
  const base = createCareer({ seed, coachName: 'QA Goleiro', clubId });
  const d0 = firstDecision(base);
  if (d0) for (const [name, want] of Object.entries(wants)) if (!found[name] && !NO_RESERVE.has(name) && want(d0)) found[name] = { career: base, decision: d0 };
  if ([...NO_RESERVE].some((n) => !found[n])) {
    const players = base.world.players;
    const lineup = resolveUserLineup(base).lineup;
    const club = base.world.clubs[clubId];
    const used = new Set([...lineup.starters.map((s) => s.playerId)]);
    const bench = club.squad.filter((id) => !used.has(id) && players[id].position !== 'GK').sort((a, b) => players[b].strength - players[a].strength).slice(0, 7);
    try {
      const custom = withUserLineup(base, { ...lineup, bench });
      const d1 = firstDecision(custom);
      if (d1) for (const name of NO_RESERVE) if (!found[name] && wants[name](d1)) found[name] = { career: custom, decision: d1 };
    } catch { /* banco sem goleiro não valeu para este clube: segue */ }
  }
}
for (const [name, { career, decision }] of Object.entries(found)) {
  writeFileSync(join(ROOT, 'dist/qa/scenarios', `${name}.json`), JSON.stringify({ name, decision, save: serializeCareer(career) }));
  console.log(`${name}: seed ${career.seed}, decisão no minuto ${decision.minute} (${decision.type})`);
}
console.log(`${Object.keys(found).length}/${TOTAL} cenários em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
