import { crowd } from './audio.ts';
import { GameController, browserStorage } from './controller.ts';
import { render } from './dom.ts';
import { renderApp } from './views/shell.ts';

// Ponto de entrada: cria o controlador e redesenha a tela sempre que o estado muda.
const root = document.getElementById('app');
if (!root) throw new Error('#app não encontrado');
const ctrl = new GameController({ storage: browserStorage() });
const draw = () => {
  render(root, ...renderApp(ctrl));
  const s = ctrl.state;
  const m = ctrl.userMatch();
  crowd(s.audio, s.phase === 'LIVE' && s.snapshot.status === 'PLAYING', s.plan?.roundId ?? null, m ? m.score.home + m.score.away : 0);
};
// A velocidade instantânea (só QA) roda a rodada de forma síncrona e notifica a cada minuto: desenha uma vez só, quando o laço termina.
let scheduled = false;
ctrl.subscribe(() => {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    draw();
  });
});
draw();

// Splash (index.html): logo oficial com barra de carregamento por cerca de 8 s na primeira abertura da sessão do
// navegador. Não é trava: um toque pula, e quem já viu nesta sessão (ou prefere menos movimento) entra direto.
const SPLASH_KEY = 'elite-manager:splash-visto';
const splash = document.getElementById('splash');
if (splash) {
  const fill = document.getElementById('splash-fill');
  let seen = false;
  try {
    seen = sessionStorage.getItem(SPLASH_KEY) === '1';
  } catch {
    seen = false;
  }
  const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    try {
      sessionStorage.setItem(SPLASH_KEY, '1');
    } catch {
      /* sem sessionStorage: mostra de novo na próxima vez */
    }
    if (reduced) return splash.remove();
    splash.addEventListener('animationend', (e) => { if (e.target === splash) splash.remove(); });
    splash.classList.add('out');
  };
  if (seen || reduced) finish();
  else {
    const total = 8000;
    const t0 = performance.now();
    splash.addEventListener('pointerdown', finish);
    const step = (t: number) => {
      if (done) return;
      const k = Math.min(1, (t - t0) / total);
      if (fill) fill.style.width = `${Math.round(k * 100)}%`;
      if (k >= 1) finish();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
// Gancho para inspeção e QA automatizado no navegador (não é usado pelo jogo).
Object.assign(globalThis, { __fm: ctrl });
