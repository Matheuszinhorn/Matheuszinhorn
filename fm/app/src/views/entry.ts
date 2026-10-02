import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { btn } from './common.ts';

// ENTRADA e MODO DE JOGO. O "login" desta versão é um PERFIL LOCAL: só um nome guardado neste navegador.
// Não existe servidor, senha nem conta de verdade; a tela diz isso com todas as letras (docs/SECURITY-ONLINE.md).

const form = { name: '', creating: false };

function hero(sub: string): HTMLElement {
  return h('div', { class: 'hero' }, h('div', { class: 'brand-logo', role: 'img', 'aria-label': 'ELITE MANAGER' }), h('h1', { class: 'sr-only' }, 'ELITE MANAGER'), h('p', null, sub));
}

export function renderEntry(ctrl: GameController): HTMLElement {
  const profile = ctrl.state.profile;
  return h(
    'div',
    { class: 'start entry' },
    hero('Comande um clube do futebol de acesso até a elite.'),
    h(
      'div',
      { class: 'start-panel narrow' },
      h(
        'div',
        { class: 'card' },
        form.creating
          ? [
              h('h3', { class: 'card-title' }, 'Criar conta local'),
              h('label', { class: 'field' }, h('span', null, 'Seu nome'), h('input', { type: 'text', maxlength: '32', placeholder: 'Ex.: Marcos Vilela', value: form.name, autocomplete: 'off', onInput: (e: Event) => (form.name = (e.target as HTMLInputElement).value) })),
              h('div', { class: 'stack-btns' }, btn('CRIAR CONTA', () => { ctrl.createProfile(form.name); if (ctrl.state.profile) form.creating = false; }, { kind: 'primary', big: true }), btn('VOLTAR', () => { form.creating = false; ctrl.notifyRender(); })),
            ]
          : [
              h('h3', { class: 'card-title' }, 'Entrar'),
              profile ? h('p', { class: 'muted' }, `Perfil neste navegador: `, h('b', null, profile.name)) : h('p', { class: 'muted' }, 'Nenhum perfil neste navegador ainda.'),
              h(
                'div',
                { class: 'stack-btns' },
                btn(profile ? `ENTRAR COMO ${profile.name.toUpperCase()}` : 'ENTRAR', () => ctrl.enter(), { kind: 'primary', big: true, disabled: !profile }),
                btn('CRIAR CONTA', () => { form.creating = true; form.name = ''; ctrl.notifyRender(); }, { big: true }),
                btn('CONTINUAR COM GOOGLE', () => ctrl.googleLogin(), { big: true }),
              ),
            ],
        h('p', { class: 'hint' }, 'Versão offline: o perfil é local (só um nome salvo neste navegador). Não há senha, servidor nem dados enviados. O login com Google chega com o modo online.'),
      ),
    ),
    h('p', { class: 'legal' }, 'Clubes, jogadores e competições fictícios.'),
  );
}

export function renderMode(ctrl: GameController): HTMLElement {
  const name = ctrl.state.profile?.name ?? 'Treinador';
  return h(
    'div',
    { class: 'start entry' },
    hero(`Olá, ${name}. Escolha como jogar.`),
    h(
      'div',
      { class: 'start-panel modes' },
      h('button', { type: 'button', class: 'mode-card', onClick: () => ctrl.chooseMode('OFFLINE') }, h('span', { class: 'mode-k' }, 'OFFLINE'), h('strong', null, 'CARREIRA'), h('span', { class: 'muted' }, 'Comece na 4ª divisão e construa sua história. Salva neste navegador.')),
      h('button', { type: 'button', class: 'mode-card soon', 'aria-disabled': 'true', onClick: () => ctrl.chooseMode('ONLINE') }, h('span', { class: 'mode-k' }, 'ONLINE'), h('strong', null, 'EM DESENVOLVIMENTO'), h('span', { class: 'muted' }, 'Ligas com outros treinadores. Ainda não disponível.')),
      h('div', { class: 'center' }, btn('TROCAR PERFIL', () => ctrl.leaveProfile())),
    ),
  );
}
