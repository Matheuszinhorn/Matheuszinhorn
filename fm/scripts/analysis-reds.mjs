// Análise factual (NÃO altera o engine): taxa de expulsões produzida pelo Engine 0.2.0 em partidas simuladas, por comportamento.
const { DEFAULT_CONFIG, createRng, generateWorld, prepareFixture, simulateMatch, deriveSeed } = await import('../engine/index.ts');
const N = Number(process.argv[2] ?? 6000);
const world = generateWorld('analise-expulsoes');
const rng = createRng('analise-pares');
const acc = {};
const bucket = (m) => Math.min(5, Math.floor((m - 1) / 15));
const add = (key, f) => { acc[key] ??= { teamMatches: 0, yellows: 0, direct: 0, second: 0, minutes: [0, 0, 0, 0, 0, 0] }; f(acc[key]); };
let matches = 0, redsTotal = 0, yellowsTotal = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const div = rng.pick(world.divisions); const [a, b] = [rng.pick(div.clubIds), rng.pick(div.clubIds)]; if (a === b) { i--; continue; }
  const fx = prepareFixture(`A-${i}`, world.clubs[a], world.clubs[b], world.players);
  const state = simulateMatch({ matchId: fx.matchId, seed: deriveSeed('analise', String(i)), home: fx.home, away: fx.away, controlledClubId: null, attendance: fx.attendance });
  matches++;
  for (const side of ['home', 'away']) {
    const beh = fx[side].lineup.behavior;
    for (const key of [beh, 'TODOS']) add(key, (o) => { o.teamMatches++; });
    for (const e of state.events) {
      if (e.side !== side) continue;
      for (const key of [beh, 'TODOS']) add(key, (o) => {
        if (e.type === 'YELLOW_CARD') o.yellows++;
        if (e.type === 'RED_CARD') { if (e.detail === 'second_yellow') o.second++; else o.direct++; o.minutes[bucket(e.clock.minute + (e.clock.half === 1 && e.clock.minute > 45 ? 0 : 0))]++; }
      });
      if (e.type === 'RED_CARD') redsTotal++; if (e.type === 'YELLOW_CARD') yellowsTotal++;
    }
  }
}
console.log(`partidas: ${matches} (${((Date.now() - t0) / 1000).toFixed(0)} s) | config: amarelos ${DEFAULT_CONFIG.yellowRatePerTeam}/time/jogo, vermelho direto ${DEFAULT_CONFIG.directRedRatePerTeam}/time/jogo, fator agressivo ${DEFAULT_CONFIG.aggressive.cards}, reativo ${DEFAULT_CONFIG.reactive.cards}`);
for (const [k, o] of Object.entries(acc)) {
  const r = (x) => (x / o.teamMatches).toFixed(3);
  console.log(`${k.padEnd(10)} time-jogos ${String(o.teamMatches).padStart(6)} | amarelos/tj ${r(o.yellows)} | vermelho direto/tj ${r(o.direct)} | 2º amarelo/tj ${r(o.second)} | TOTAL vermelhos/tj ${r(o.direct + o.second)} | minutos [1-15,16-30,31-45,46-60,61-75,76+]: ${o.minutes.join('/')}`);
}
console.log(JSON.stringify({ perTeamMatch: Object.fromEntries(Object.entries(acc).map(([k, o]) => [k, (o.direct + o.second) / o.teamMatches])) }));
