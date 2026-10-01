import { ROUNDS_PER_SEASON, userClub } from '../../../game/career.ts';
import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { money, num, signedMoney } from '../format.ts';
import { badge, btn, card, crest, empty, stat } from './common.ts';

// CARREIRA: treinador, clube, finanças (do módulo finance existente) e histórico de temporadas.

// Confirmação em dois toques (o confirm() do navegador é bloqueado em páginas dentro de iframe isolado).
let armed = false;

export function renderCareer(ctrl: GameController): HTMLElement {
  const career = ctrl.state.career!;
  const club = userClub(career);
  const led = career.userLedger;
  const sum = (f: (e: (typeof led)[number]) => number) => led.reduce((a, e) => a + f(e), 0);
  const divName = (id: string) => career.world.divisions.find((d) => d.id === id)?.name ?? id;
  const net = sum((e) => e.net);
  return h(
    'div',
    { class: 'page' },
    card(null, h('div', { class: 'team-head' }, crest(club, 'lg'), h('div', null, h('h2', null, career.coach.name), h('p', { class: 'muted' }, `Treinador do ${club.name} · ${divName(club.divisionId)} · Temporada ${career.season}`)))),
    card(
      'Finanças',
      h('div', { class: 'stats' }, stat('Caixa', money(club.money)), stat('Receita na temporada', signedMoney(sum((e) => e.revenue))), stat('Despesas na temporada', signedMoney(-sum((e) => e.expenses))), stat('Resultado', signedMoney(net), net >= 0 ? 'good' : 'bad')),
      h('div', { class: 'stats' }, stat('Bilheteria', signedMoney(sum((e) => e.ticketRevenue))), stat('Cota de TV', signedMoney(sum((e) => e.tvRevenue))), stat('Salários', signedMoney(-sum((e) => e.salaries))), stat('Manutenção', signedMoney(-sum((e) => e.upkeep)))),
      led.length
        ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Rod.', 'Mando', 'Público', 'Receita', 'Despesa', 'Resultado'].map((t, i) => h('th', { class: i > 1 ? 'n' : '' }, t)))), h('tbody', null, led.map((e, i) => ({ e, r: i + 1 })).reverse().slice(0, 12).map(({ e, r }) => h('tr', null, h('td', null, r), h('td', null, e.home ? 'Casa' : 'Fora'), h('td', { class: 'n' }, e.home ? num(e.attendance) : '—'), h('td', { class: 'n' }, money(e.revenue)), h('td', { class: 'n' }, money(e.expenses)), h('td', { class: `n ${e.net >= 0 ? 'good' : 'bad'}` }, signedMoney(e.net)))))))
        : empty('Nenhuma rodada jogada ainda.'),
      h('p', { class: 'muted small' }, `Rodada ${Math.min(career.roundNumber, ROUNDS_PER_SEASON)} de ${ROUNDS_PER_SEASON}. Premiação de fim de temporada ainda não está no jogo.`),
    ),
    card(
      'Histórico de temporadas',
      career.history.length
        ? h('ul', { class: 'results' }, career.history.map((r) => h('li', null, h('b', null, String(r.season)), h('span', { class: 'r' }, `${r.userPosition}º na ${divName(r.userDivisionId)}`), r.userMovement ? badge(r.userMovement.kind === 'PROMOTED' ? 'ACESSO' : 'REBAIXADO', r.userMovement.kind === 'PROMOTED' ? 'green' : 'red') : badge('MANTEVE', 'gray'), h('span', { class: 'muted' }, signedMoney(r.userNet)))))
        : empty('A primeira temporada ainda não terminou.'),
    ),
    card('Carreira', h('p', { class: 'muted' }, 'A carreira é salva automaticamente ao fim de cada rodada, neste navegador.'), armed ? h('p', { class: 'notice' }, 'Isto apaga a carreira salva e não pode ser desfeito.') : null, h('div', { class: 'row gap wrap' }, btn(armed ? 'SIM, APAGAR E RECOMEÇAR' : 'NOVA CARREIRA', () => { if (armed) { armed = false; ctrl.abandonCareer(); } else { armed = true; ctrl.notifyRender(); } }, { kind: 'danger' }), armed ? btn('CANCELAR', () => { armed = false; ctrl.notifyRender(); }) : null)),
  );
}
