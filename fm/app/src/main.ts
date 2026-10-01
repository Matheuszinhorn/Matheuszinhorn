import { GameController, browserStorage } from './controller.ts';
import { render } from './dom.ts';
import { renderApp } from './views/shell.ts';

// Ponto de entrada: cria o controlador e redesenha a tela sempre que o estado muda.
const root = document.getElementById('app');
if (!root) throw new Error('#app não encontrado');
const ctrl = new GameController({ storage: browserStorage() });
const draw = () => render(root, ...renderApp(ctrl));
// A velocidade instantânea roda a rodada de forma síncrona e notifica a cada minuto: desenha uma vez só, quando o laço termina.
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
// Gancho para inspeção e QA automatizado no navegador (não é usado pelo jogo).
Object.assign(globalThis, { __fm: ctrl });
