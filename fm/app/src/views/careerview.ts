import { MOOD_ICON, MOOD_LABEL, moodOf } from '../../../game/manager/board.ts';
import { flagOf } from '../../../game/manager/people.ts';
import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { signedMoney } from '../format.ts';
import { badge, btn, card, crest, empty, stat } from './common.ts';

// CARREIRA: o treinador (moral, objetivo, reputação), propostas de trabalho, seleção e histórico.

let armed = false;

export function renderCareer(ctrl: GameController): HTMLElement {
  const career = ctrl.state.career!;
  const m = career.manager!;
  const club = career.userClubId ? career.world.clubs[career.userClubId] : null;
  const divName = (id: string | null) => (id ? (career.world.divisions.find((d) => d.id === id)?.name ?? id) : '—');
  const mood = moodOf(m.morale);
  const offers = m.jobs.offers.filter((o) => o.status === 'OPEN');
  const live = ctrl.state.phase === 'LIVE';
  return h(
    'div',
    { class: 'page' },
    card(
      null,
      h('div', { class: 'team-head' }, club ? crest(club, 'lg') : h('span', { class: 'crest crest-lg crest-none' }, '?'), h('div', null, h('h2', null, career.coach.name), h('p', { class: 'muted' }, club ? `Técnico do ${club.name} · ${flagOf(club.country)} ${divName(club.divisionId)} · Temporada ${career.season}` : `Sem clube · aguardando propostas · Temporada ${career.season}`))),
      h('div', { class: 'stats' }, club ? stat('Moral', `${MOOD_ICON[mood]} ${m.morale}`) : null, stat('Reputação', m.reputation), stat('Clubes', m.clubsCoached.length), stat('Seleção', m.jobs.national === 'COACH' ? 'Técnico' : m.jobs.national === 'INVITED' ? 'Convite' : '—')),
      club ? h('p', null, h('span', { class: 'label' }, 'Diretoria '), `${MOOD_ICON[mood]} ${MOOD_LABEL[mood]}`) : null,
      club && m.objective ? h('p', null, h('span', { class: 'label' }, 'Objetivo da temporada '), h('b', null, m.objective.label)) : null,
      club ? h('p', { class: 'muted small' }, 'A moral sobe com vitórias e com a campanha dentro do objetivo; sequências ruins abaixo da meta levam à demissão.') : null,
    ),
    card(
      'Propostas de trabalho',
      offers.length
        ? h('ul', { class: 'deals' }, offers.map((o) => { const cl = career.world.clubs[o.clubId]; return h('li', null, h('div', { class: 'deal-main' }, h('b', null, cl.name), h('span', { class: 'muted' }, `${flagOf(cl.country)} ${divName(cl.divisionId)} · válida até a rodada ${o.expiresRound % 100} de ${Math.floor(o.expiresRound / 100)}`), h('span', { class: 'small' }, o.reason)), btn('VER PROPOSTA', () => ctrl.openProposal(o.clubId, o.id), { kind: 'primary', disabled: live })); }))
        : empty(club ? 'Nenhuma proposta no momento. Bons trabalhos atraem clubes maiores.' : 'Nenhuma proposta ainda. Jogue as rodadas: clubes que trocam de técnico procuram nomes.'),
    ),
    m.jobs.national === 'INVITED'
      ? card('Seleção', h('p', null, 'Você recebeu o convite para comandar a seleção. É um cargo honorário nesta versão: acumula com o clube e soma reputação. Copa e jogos da seleção estão no roadmap (docs/ONLINE-ROADMAP.md).'), h('div', { class: 'row gap wrap' }, btn('ACEITAR CONVITE', () => ctrl.answerNational(true), { kind: 'primary', disabled: live }), btn('RECUSAR', () => ctrl.answerNational(false), { disabled: live })))
      : null,
    card(
      'Histórico de temporadas',
      career.history.length
        ? h('ul', { class: 'results' }, career.history.map((r) => h('li', null, h('b', null, String(r.season)), h('span', { class: 'r' }, r.userClubId ? `${r.userPosition}º na ${divName(r.userDivisionId)} · ${career.world.clubs[r.userClubId]?.name ?? ''}` : 'Sem clube'), r.userMovement ? badge(r.userMovement.kind === 'PROMOTED' ? 'ACESSO' : 'REBAIXADO', r.userMovement.kind === 'PROMOTED' ? 'green' : 'red') : badge('MANTEVE', 'gray'), h('span', { class: 'muted' }, signedMoney(r.userNet)))))
        : empty('A primeira temporada ainda não terminou.'),
      m.clubsCoached.length ? h('p', { class: 'muted small' }, `Clubes: ${m.clubsCoached.map(([id, s]) => `${career.world.clubs[id]?.name ?? id} (${s})`).join(' · ')}`) : null,
    ),
    card('Carreira', h('p', { class: 'muted' }, 'A carreira é salva automaticamente ao fim de cada rodada e a cada decisão de gestão, neste navegador.'), armed ? h('p', { class: 'notice' }, 'Isto apaga a carreira salva e não pode ser desfeito.') : null, h('div', { class: 'row gap wrap' }, btn(armed ? 'SIM, APAGAR E RECOMEÇAR' : 'NOVA CARREIRA', () => { if (armed) { armed = false; ctrl.abandonCareer(); } else { armed = true; ctrl.notifyRender(); } }, { kind: 'danger' }), armed ? btn('CANCELAR', () => { armed = false; ctrl.notifyRender(); }) : null)),
  );
}
