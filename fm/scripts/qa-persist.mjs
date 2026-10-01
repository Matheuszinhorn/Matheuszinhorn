// QA de persistência: recarregar a página E fechar/reabrir o navegador (perfil persistente) e comparar a carreira inteira.
import { rmSync } from 'node:fs';
import { APP_URL, SAVE_KEY, chromium, clickIn, driveRound, nav, startCareerUI, text, watch } from './qa-lib.mjs';
const DIR = '/tmp/pw-persist-profile';
rmSync(DIR, { recursive: true, force: true });
const launch = () => chromium.launchPersistentContext(DIR, { viewport: { width: 1280, height: 800 } });
let failed = false; const errors = [];
const check = (name, ok, extra = '') => { console.log(`${ok ? 'OK    ' : 'FALHOU'} ${name}${extra ? ' — ' + extra : ''}`); if (!ok) failed = true; };
const snap = (page) => page.evaluate(([k]) => { const c = globalThis.__fm.state.career; const raw = localStorage.getItem(k); return { json: JSON.stringify(c), raw, club: c.world.clubs[c.userClubId].name, money: c.world.clubs[c.userClubId].money, round: c.roundNumber, lineup: JSON.stringify(c.userLineup), ledger: c.userLedger.length, results: c.results.length, coach: c.coach.name, seed: c.seed, keys: Object.keys(localStorage), sizes: Object.fromEntries(Object.keys(localStorage).map((x) => [x, localStorage.getItem(x).length])) }; }, [SAVE_KEY]);

let ctx = await launch(); let page = ctx.pages()[0] ?? (await ctx.newPage()); watch(page, errors);
await page.goto(APP_URL);
await startCareerUI(page, 'Persistência Teste');
await page.getByRole('button', { name: 'INSTANTÂNEA', exact: true }).first().click();
for (let r = 0; r < 3; r++) { await page.getByRole('button', { name: 'JOGAR RODADA' }).click(); await driveRound(page); await page.locator('.cta .btn').click(); }
await nav(page, 'MEU TIME');
await page.locator('.pill', { hasText: '3-5-2' }).click();
await page.locator('.seg-btn', { hasText: 'Ofensivo' }).first().click();
await page.locator('.seg-btn', { hasText: 'Agressivo' }).first().click();
const takerOpts = await page.locator('select option').allInnerTexts();
await page.locator('select').first().selectOption({ index: 2 });
await page.waitForTimeout(200);
const before = await snap(page);
const takerBefore = await page.locator('select').first().inputValue();
check('estado salvo automaticamente após cada rodada e edição (localStorage == estado em memória)', before.raw === before.json, `chaves: ${before.keys.join(', ')}; tamanhos: ${JSON.stringify(before.sizes)} caracteres`);
check('escalação personalizada gravada (formação/estilo/batedor)', before.lineup.includes('"OFFENSIVE"') && before.lineup.includes('"AGGRESSIVE"') && takerBefore !== '');

// 1) recarregar
await page.reload();
check('após recarregar, a tela inicial oferece CONTINUAR CARREIRA', (await text(page)).includes('continuar carreira'));
await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click(); await page.waitForSelector('.topbar');
let a = await snap(page);
check('recarregar: carreira idêntica (JSON completo)', a.json === before.json);
check('recarregar: clube, treinador, rodada, caixa, extrato e resultados', a.club === before.club && a.coach === before.coach && a.round === 4 && a.money === before.money && a.ledger === 3 && a.results === 120, `${a.club}; rodada ${a.round}; caixa ${a.money}; extrato ${a.ledger}; resultados ${a.results}`);
const top = await text(page);
check('recarregar: topo mostra clube e rodada 4/38', top.includes(before.club.toLowerCase()) && top.includes('r4/38'));
await nav(page, 'MEU TIME');
const ui = await page.evaluate(() => ({ pill: document.querySelector('.pill.on')?.textContent, segs: [...document.querySelectorAll('.seg-btn.on')].map((b) => b.textContent), taker: document.querySelector('select').value }));
check('recarregar: MEU TIME mantém 3-5-2, Ofensivo, Agressivo e batedor', ui.pill === '3-5-2' && ui.segs.join(',').includes('Ofensivo') && ui.segs.join(',').includes('Agressivo') && ui.taker === takerBefore, JSON.stringify(ui));
await nav(page, 'CARREIRA');
check('recarregar: CARREIRA mostra o extrato das 3 rodadas', (await page.locator('.tbl tbody tr').count()) === 3);
// rodada em andamento NÃO é salva: recarregar no meio volta ao início da mesma rodada
await nav(page, 'PARTIDA');
await page.getByRole('button', { name: 'MUITO RÁPIDA', exact: true }).click();
await page.getByRole('button', { name: 'JOGAR RODADA' }).click(); await page.waitForTimeout(1200);
await page.reload(); await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click(); await page.waitForSelector('.topbar');
a = await snap(page);
check('recarregar no MEIO da rodada volta ao início da mesma rodada, sem cobrar nada em dobro (limitação documentada)', a.round === 4 && a.money === before.money && a.ledger === 3 && a.json === before.json);
check('velocidade escolhida é lembrada', (await page.evaluate(() => localStorage.getItem('fm-brasileiro:velocidade'))) === 'VERY_FAST');

// 2) fechar e reabrir o navegador
await ctx.close();
ctx = await launch(); page = ctx.pages()[0] ?? (await ctx.newPage()); watch(page, errors);
await page.goto(APP_URL);
check('navegador reaberto: existe carreira salva', (await text(page)).includes('continuar carreira'));
await page.getByRole('button', { name: 'CONTINUAR CARREIRA' }).click(); await page.waitForSelector('.topbar');
const b = await snap(page);
check('navegador reaberto: carreira idêntica ao antes de fechar (JSON completo)', b.json === before.json, `clube ${b.club}, rodada ${b.round}, caixa ${b.money}`);
await nav(page, 'MEU TIME');
check('navegador reaberto: escalação mantida', (await page.locator('.pill.on').innerText()) === '3-5-2');
// e a carreira continua jogável
await nav(page, 'PARTIDA');
await page.getByRole('button', { name: 'INSTANTÂNEA', exact: true }).first().click();
await page.getByRole('button', { name: 'JOGAR RODADA' }).click(); await driveRound(page);
check('carreira reaberta joga a rodada 4 normalmente', (await snap(page)).round === 5);
check('nenhum erro de console durante todo o teste', errors.length === 0, errors.slice(0, 2).join(' | '));
await ctx.close();
process.exit(failed ? 1 : 0);
