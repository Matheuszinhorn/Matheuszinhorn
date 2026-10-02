import { generateWorld } from '../../../engine/index.ts';
import { flagOf } from '../../../game/manager/people.ts';
import { clubStrength } from '../../../game/queries-lite.ts';
import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { money, num } from '../format.ts';
import { badge, btn, clubStripe, crest } from './common.ts';
import { renderProposal } from './proposal.ts';

// Início da carreira: continuar a salva ou criar o treinador e receber TRÊS propostas (sem sortear de novo).
// Cada proposta abre um pop-up com ACEITAR / RECUSAR / ANALISAR CLUBE. AGUARDAR PROPOSTAS começa sem clube.

export const startForm = { name: '' };
let worldCache: { seed: string; world: ReturnType<typeof generateWorld> } | null = null;

export function renderStart(ctrl: GameController): HTMLElement[] {
  const s = ctrl.state;
  const offers = s.offers;
  if (!startForm.name && s.profile) startForm.name = s.profile.name;
  if (offers && (!worldCache || worldCache.seed !== offers.seed)) worldCache = { seed: offers.seed, world: generateWorld(offers.seed) };
  const world = offers ? worldCache!.world : null;
  const coach = startForm.name.trim() || 'Treinador';
  const page = h(
    'div',
    { class: 'start' },
    h('div', { class: 'hero' }, h('div', { class: 'brand-logo', role: 'img', 'aria-label': 'ELITE MANAGER' }), h('h1', { class: 'sr-only' }, 'ELITE MANAGER'), h('p', null, 'Comande um clube do futebol de acesso até a elite. Quatro divisões, uma rodada por vez, decisões ao vivo.')),
    h(
      'div',
      { class: 'start-panel' },
      s.hasSave && !offers ? h('div', { class: 'card' }, h('h3', { class: 'card-title' }, 'Carreira salva'), btn('CONTINUAR CARREIRA', () => ctrl.continueCareer(), { kind: 'primary', big: true })) : null,
      s.saveProblem && !offers ? h('div', { class: 'card' }, h('h3', { class: 'card-title' }, 'Carreira salva'), h('p', { class: 'notice' }, s.saveProblem), h('p', { class: 'hint' }, 'Comece uma nova carreira abaixo. Ela substitui o salvamento antigo.')) : null,
      !offers
        ? h(
            'div',
            { class: 'card' },
            h('h3', { class: 'card-title' }, 'Nova carreira'),
            h('label', { class: 'field' }, h('span', null, 'Nome do treinador'), h('input', { type: 'text', maxlength: '32', placeholder: 'Ex.: Marcos Vilela', value: startForm.name, autocomplete: 'off', onInput: (e: Event) => (startForm.name = (e.target as HTMLInputElement).value) })),
            btn('RECEBER PROPOSTAS DE CLUBE', () => (startForm.name.trim() ? ctrl.offerClubs() : ctrl.notify('Digite o nome do treinador.', 'error')), { kind: 'primary', big: true }),
            s.hasSave ? h('p', { class: 'hint' }, 'Criar uma nova carreira substitui a carreira salva.') : null,
          )
        : h(
            'div',
            { class: 'card' },
            h('h3', { class: 'card-title' }, `${coach}, três clubes querem você`),
            h('p', { class: 'hint' }, 'Toda carreira começa nas divisões de baixo. Toque numa proposta para ver e decidir. Não há novo sorteio: recusou todas, aguarde outras propostas enquanto o mundo joga.'),
            h(
              'div',
              { class: 'offers' },
              offers.clubIds.map((id) => {
                const club = world!.clubs[id];
                const div = world!.divisions.find((d) => d.id === club.divisionId)!;
                const refused = offers.refused.includes(id);
                return h(
                  'article',
                  { class: `offer${refused ? ' refused' : ''}` },
                  crest(club, 'lg'),
                  h('h4', null, club.name),
                  clubStripe(club),
                  h('p', { class: 'muted' }, `${flagOf(club.country)} ${div.name} · ${club.city}`),
                  h('dl', { class: 'facts' }, h('dt', null, 'Estádio'), h('dd', null, `${club.stadium.name} (${num(club.stadium.capacity)} lugares)`), h('dt', null, 'Caixa'), h('dd', null, money(club.money)), h('dt', null, 'Força do elenco'), h('dd', null, String(clubStrength(world!.players, club)))),
                  refused ? badge('RECUSADA', 'red') : btn('VER PROPOSTA', () => ctrl.openProposal(id), { kind: 'primary' }),
                );
              }),
            ),
            btn('AGUARDAR PROPOSTAS', () => ctrl.waitForOffers(startForm.name), { kind: 'ghost', big: true }),
            h('p', { class: 'hint' }, 'Aguardar: a carreira começa sem clube; as rodadas são jogadas pela CPU e novas propostas chegam com o tempo.'),
          ),
    ),
    h('p', { class: 'legal' }, 'Clubes, jogadores e competições fictícios. Nenhum dado real ou licenciado.'),
  );
  const modal = renderProposal(ctrl, startForm.name);
  return modal ? [page, modal] : [page];
}
