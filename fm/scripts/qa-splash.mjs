// QA da splash e da marca, em 6 larguras. Splash: logo oficial no marinho com barra de carregamento que enche em ~8 s na
// primeira abertura da sessão; um toque pula (não é trava); na 2ª abertura da sessão e com "reduzir movimento" ela some
// logo. Também confere título da aba, favicon e a logo na tela de entrada.
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
const gone = (page) => page.evaluate(() => !document.getElementById('splash'));

for (const [i, vp] of VIEWPORTS.entries()) {
  const opts = vp.mobile ? { viewport: { width: vp.w, height: vp.h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: vp.w, height: vp.h } };
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage(); const errors = []; watch(page, errors, { start: false });
  const checks = {};
  const check = (name, ok, extra = '') => { checks[name] = ok ? 'ok' : `FALHOU ${extra}`; };

  // 1ª abertura da sessão: splash com barra que enche
  const t0 = Date.now();
  await page.goto(APP_URL);
  await page.waitForTimeout(1200);
  check('splash visível na 1ª abertura', !(await gone(page)));
  const fill1 = await page.evaluate(() => parseFloat(document.getElementById('splash-fill')?.style.width ?? '0'));
  await page.waitForTimeout(1000);
  const fill2 = await page.evaluate(() => parseFloat(document.getElementById('splash-fill')?.style.width ?? '0'));
  check('barra de carregamento enche com o tempo', fill1 > 0 && fill2 > fill1 && fill2 < 100, `${fill1}% → ${fill2}%`);
  const logo = await box(page, '#splash .brand-logo');
  check('splash: logo na proporção original (824 × 754)', !!logo && Math.abs(logo.w / logo.h - RATIO) < 0.02);
  check('splash: logo inteira dentro da tela', !!logo && logo.x >= 0 && logo.y >= 0 && logo.x + logo.w <= logo.vw && logo.y + logo.h <= logo.vh);
  check('splash: logo não fica pequena (≥ 260 px ou ≥ 55% da largura)', !!logo && (logo.w >= 260 || logo.w >= 0.55 * logo.vw));
  check('splash: fundo marinho #071522', (await page.evaluate(() => getComputedStyle(document.getElementById('splash')).backgroundColor)) === 'rgb(7, 21, 34)');
  check('splash: avisa que um toque pula', (await page.evaluate(() => document.getElementById('splash')?.innerText.toLowerCase() ?? '')).includes('toque para pular'));
  await page.screenshot({ path: `${dir}/splash-${vp.w}.png` });
  if (i === 0) {
    // sem toque: some sozinha em ~8 s (medido uma vez)
    await page.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 12000 }).catch(() => {});
    const total = Date.now() - t0;
    check('sem toque: some sozinha em cerca de 8 s', (await gone(page)) && total >= 7000 && total <= 11000, `${total} ms`);
  } else {
    // um toque pula (não é trava)
    await page.locator('#splash').click();
    await page.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 2000 }).catch(() => {});
    check('um toque pula a splash (sai em < 2 s)', await gone(page));
  }
  check('depois da splash: tela de entrada', (await page.locator('.entry').count()) === 1);
  check('título da aba = ELITE MANAGER', (await page.title()) === 'ELITE MANAGER');
  check('favicon e ícone de atalho embutidos (PNG)', await page.evaluate(() => [...document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')].filter((l) => l.href.startsWith('data:image/png;base64,')).length === 2));
  const hero = await box(page, '.hero .brand-logo');
  check('entrada mostra a logo oficial inteira e na proporção', !!hero && hero.w >= 200 && Math.abs(hero.w / hero.h - RATIO) < 0.02 && hero.x >= 0 && hero.x + hero.w <= hero.vw);
  check('entrada tem o nome ELITE MANAGER (título acessível)', await page.evaluate(() => document.querySelector('h1')?.textContent === 'ELITE MANAGER' && document.querySelector('.hero [role=img]')?.getAttribute('aria-label') === 'ELITE MANAGER'));
  check('fundo da página = marinho #071522', (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)) === 'rgb(7, 21, 34)');
  await page.screenshot({ path: `${dir}/entrada-${vp.w}.png` });

  // 2ª abertura na mesma sessão: entra direto
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 1500 }).catch(() => {});
  check('2ª abertura da sessão: sem espera (< 1,5 s)', await gone(page));

  // "Reduzir movimento": some no primeiro desenho, sem animação
  const rctx = await browser.newContext({ ...opts, reducedMotion: 'reduce' });
  const rpage = await rctx.newPage(); watch(rpage, errors, { start: false });
  await rpage.goto(APP_URL);
  check('reduzir movimento: a splash some na hora', await gone(rpage));
  await rctx.close();

  check('sem erros de console', errors.length === 0, errors.slice(0, 2).join(' | '));
  const ok = Object.values(checks).filter((v) => v === 'ok').length;
  results.push({ width: vp.w, ok, total: Object.keys(checks).length, checks, errors });
  console.log(`${ok === Object.keys(checks).length ? 'OK    ' : 'FALHOU'} ${vp.w}px: ${ok}/${Object.keys(checks).length}`);
  for (const [k, v] of Object.entries(checks)) if (v !== 'ok') console.log(`   ${v} ${k}`);
  await ctx.close();
}
await browser.close();
const all = results.every((r) => r.ok === r.total);
console.log(`RESUMO splash/marca: ${results.filter((r) => r.ok === r.total).length}/${results.length} larguras ok`);
process.exit(all ? 0 : 1);
