import { generateWorld } from '../../../engine/index.ts';
import { clubStrength } from '../../../game/queries-lite.ts';
import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { money, num } from '../format.ts';
import { btn, crest } from './common.ts';

// Tela de início: continuar carreira ou criar treinador → receber um clube.

const form = { name: '' };

export function renderStart(ctrl: GameController): HTMLElement {
  const s = ctrl.state;
  const offers = s.offers;
  const world = offers ? generateWorld(offers.seed) : null;
  return h(
    'div',
    { class: 'start' },
    h('div', { class: 'hero' }, h('div', { class: 'hero-mark' }, 'FM'), h('h1', null, 'FOOTBALL MANAGER', h('br'), 'BRASILEIRO'), h('p', null, 'Comande um clube do futebol de acesso até a elite. Quatro divisões, uma rodada por vez, decisões ao vivo.')),
    h(
      'div',
      { class: 'start-panel' },
      s.hasSave && !offers ? h('div', { class: 'card' }, h('h3', { class: 'card-title' }, 'Carreira salva'), btn('CONTINUAR CARREIRA', () => ctrl.continueCareer(), { kind: 'primary', big: true })) : null,
      !offers
        ? h(
            'div',
            { class: 'card' },
            h('h3', { class: 'card-title' }, 'Nova carreira'),
            h('label', { class: 'field' }, h('span', null, 'Nome do treinador'), h('input', { type: 'text', maxlength: '32', placeholder: 'Ex.: Marcos Vilela', value: form.name, autocomplete: 'off', onInput: (e: Event) => (form.name = (e.target as HTMLInputElement).value) })),
            btn('RECEBER PROPOSTAS DE CLUBE', () => (form.name.trim() ? ctrl.offerClubs() : ctrl.notify('Digite o nome do treinador.', 'error')), { kind: 'primary', big: true }),
            s.hasSave ? h('p', { class: 'hint' }, 'Criar uma nova carreira substitui a carreira salva quando você aceitar um clube.') : null,
          )
        : h(
            'div',
            { class: 'card' },
            h('h3', { class: 'card-title' }, `${form.name.trim() || 'Treinador'}, três clubes querem você`),
            h('p', { class: 'hint' }, 'Toda carreira começa nas divisões de baixo. Escolha o desafio.'),
            h(
              'div',
              { class: 'offers' },
              offers.clubIds.map((id) => {
                const club = world!.clubs[id];
                const div = world!.divisions.find((d) => d.id === club.divisionId)!;
                return h(
                  'article',
                  { class: 'offer' },
                  crest(club, 'lg'),
                  h('h4', null, club.name),
                  h('p', { class: 'muted' }, `${div.name} · ${club.city}`),
                  h('dl', { class: 'facts' }, h('dt', null, 'Estádio'), h('dd', null, `${club.stadium.name} (${num(club.stadium.capacity)} lugares)`), h('dt', null, 'Caixa'), h('dd', null, money(club.money)), h('dt', null, 'Força do elenco'), h('dd', null, String(clubStrength(world!.players, club)))),
                  btn('ASSUMIR ESTE CLUBE', () => ctrl.startCareer(form.name, id), { kind: 'primary' }),
                );
              }),
            ),
            btn('SORTEAR OUTRAS PROPOSTAS', () => ctrl.offerClubs(), { kind: 'ghost' }),
          ),
    ),
    h('p', { class: 'legal' }, 'Clubes, jogadores e competições fictícios. Nenhum dado real ou licenciado.'),
  );
}
