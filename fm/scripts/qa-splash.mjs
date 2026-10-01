// QA da splash e da marca: em 6 larguras, a splash (logo oficial no marinho) aparece, mantém a proporção da logo, cabe
// inteira na tela, não bloqueia toques e some sozinha logo depois do primeiro desenho do jogo; com "reduzir movimento"
// ela some na hora. Também confere título da aba, favicon e a logo na tela inicial.
// Uso: node scripts/qa-splash.mjs   (capturas em dist/qa/splash/)
import { APP_URL, chromium, shotDir, watch } from './qa-lib.mjs';

const VIEWPORTS = [
  { w: 360, h: 780, mobile: true }, { w: 390, h: 844, mobile: true }, { w: 412, h: 915, mobile: true },
  { w: 1280, h: 720 }, { w: 1440, h: 900 }, { w: 1920, h: 1080 },
];
const RATIO = 824 / 754;
const dir = shotDir('splash');
const results = [];
const browser = await chromium.launch();
const box = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight }; }, sel);

for (const vp of VIEWPORTS) {
  const opts = vp.mobile ? { viewport: { width: vp.w, height: vp.h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: vp.w, height: vp.h } };
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage(); const errors = []; watch(page, errors);
  const checks = {};
  const check = (name, ok) => { checks[name] = ok ? 'ok' : 'FALHOU'; };

  await page.goto(APP_URL);
  await page.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 3000 }).catch(() => {});
  check('a splash sai sozinha depois do primeiro desenho (< 3 s)', !(await page.evaluate(() => document.getElementById('splash'))));
  check('título da aba = ELITE MANAGER', (await page.title()) === 'ELITE MANAGER');
  check('favicon e ícone de atalho embutidos (PNG)', await page.evaluate(() => [...document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')].filter((l) => l.href.startsWith('data:image/png;base64,')).length === 2));
  const hero = await box(page, '.hero .brand-logo');
  check('tela inicial mostra a logo oficial inteira e na proporção', !!hero && hero.w >= 200 && Math.abs(hero.w / hero.h - RATIO) < 0.02 && hero.x >= 0 && hero.x + hero.w <= hero.vw);
  check('tela inicial tem o nome ELITE MANAGER (título acessível)', await page.evaluate(() => document.querySelector('h1')?.textContent === 'ELITE MANAGER' && document.querySelector('.hero [role=img]')?.getAttribute('aria-label') === 'ELITE MANAGER'));
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('fundo da página = marinho #071522', bg === 'rgb(7, 21, 34)');
  await page.screenshot({ path: `${dir}/inicio-${vp.w}.png` });

  // A splash como ela é na abertura (mesma marcação e CSS do index.html), recolocada para a captura e as medidas.
  await page.evaluate(() => document.body.insertAdjacentHTML('afterbegin', '<div id="splash" class="splash" aria-hidden="true"><div class="brand-logo"></div><div class="splash-bar"></div></div>'));
  await page.waitForTimeout(150);
  const logo = await box(page, '#splash .brand-logo');
  check('splash: logo na proporção original (824 × 754)', !!logo && Math.abs(logo.w / logo.h - RATIO) < 0.02);
  check('splash: logo inteira dentro da tela', !!logo && logo.x >= 0 && logo.y >= 0 && logo.x + logo.w <= logo.vw && logo.y + logo.h <= logo.vh);
  check('splash: logo não fica pequena (≥ 260 px ou ≥ 55% da largura)', !!logo && (logo.w >= 260 || logo.w >= 0.55 * logo.vw));
  check('splash: fundo marinho #071522', (await page.evaluate(() => getComputedStyle(document.getElementById('splash')).backgroundColor)) === 'rgb(7, 21, 34)');
  check('splash: não bloqueia toques', (await page.evaluate(() => getComputedStyle(document.getElementById('splash')).pointerEvents)) === 'none');
  await page.screenshot({ path: `${dir}/splash-${vp.w}.png` });
  await page.evaluate(() => document.getElementById('splash')?.remove());

  // "Reduzir movimento": a splash some no primeiro desenho, sem animação.
  const rctx = await browser.newContext({ ...opts, reducedMotion: 'reduce' });
  const rpage = await rctx.newPage(); watch(rpage, errors);
  await rpage.goto(APP_URL);
  check('reduzir movimento: a splash some sem animação', !(await rpage.evaluate(() => document.getElementById('splash'))));
  await rctx.close();

  check('sem erros de console', errors.length === 0);
  const ok = Object.values(checks).filter((v) => v === 'ok').length;
  results.push({ width: vp.w, ok, total: Object.keys(checks).length, checks, errors });
  console.log(`${ok === Object.keys(checks).length ? 'OK    ' : 'FALHOU'} ${vp.w}px: ${ok}/${Object.keys(checks).length}`);
  for (const [k, v] of Object.entries(checks)) if (v !== 'ok') console.log(`   FALHOU ${k}`);
  await ctx.close();
}
await browser.close();
const all = results.every((r) => r.ok === r.total);
console.log(`RESUMO splash/marca: ${results.filter((r) => r.ok === r.total).length}/${results.length} larguras ok`);
process.exit(all ? 0 : 1);
