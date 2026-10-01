import { ROUNDS_PER_SEASON, divisionStandings, userClub } from '../../../game/career.ts';
import { getClubView } from '../../../game/queries.ts';
import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { badge, card, empty } from './common.ts';

// CAMPEONATO: classificação das 4 divisões, resultados da última rodada e a agenda do clube.

export function renderLeague(ctrl: GameController): HTMLElement {
  const s = ctrl.state;
  const career = s.career!;
  const club = userClub(career);
  const divId = s.leagueDivision ?? club.divisionId;
  const div = career.world.divisions.find((d) => d.id === divId) ?? career.world.divisions[0];
  const table = divisionStandings(career, div.id);
  const size = table.length;
  const zone = (pos: number) => (div.level > 1 && pos <= 4 ? 'up' : div.level < 4 && pos > size - 4 ? 'down' : '');
  const last = career.results.filter((r) => r.round === career.roundNumber - 1 && career.world.clubs[r.homeClubId].divisionId === div.id);
  const view = getClubView(ctrl.ctx!, club.id);
  return h(
    'div',
    { class: 'page' },
    h('div', { class: 'tabs', role: 'tablist' }, career.world.divisions.map((d) => h('button', { type: 'button', role: 'tab', class: `tab${d.id === div.id ? ' on' : ''}`, 'aria-selected': d.id === div.id ? 'true' : 'false', onClick: () => ctrl.setLeagueDivision(d.id) }, d.name))),
    card(
      `${div.name} · Temporada ${career.season}`,
      career.roundNumber === 1 ? h('p', { class: 'muted' }, 'A temporada ainda não começou.') : h('p', { class: 'muted' }, `Depois de ${Math.min(career.roundNumber - 1, ROUNDS_PER_SEASON)} de ${ROUNDS_PER_SEASON} rodadas.`),
      h(
        'div',
        { class: 'tbl-wrap' },
        h(
          'table',
          { class: 'tbl standings' },
          h('thead', null, h('tr', null, ['#', 'Clube', 'Pts', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG'].map((t, i) => h('th', { class: `${i > 1 ? 'n' : ''}${t === 'GP' || t === 'GC' ? ' hs' : ''}` }, t)))),
          h(
            'tbody',
            null,
            table.map((r) => h('tr', { class: `${r.isControlled ? 'me' : ''} ${zone(r.position)}`, onClick: () => { ctrl.openClub(r.clubId); ctrl.go('CLUBS'); } }, h('td', { class: 'pos-n' }, r.position), h('td', { class: 'club' }, r.clubName), h('td', { class: 'n' }, h('b', null, r.points)), h('td', { class: 'n' }, r.played), h('td', { class: 'n' }, r.won), h('td', { class: 'n' }, r.drawn), h('td', { class: 'n' }, r.lost), h('td', { class: 'n hs' }, r.goalsFor), h('td', { class: 'n hs' }, r.goalsAgainst), h('td', { class: 'n' }, r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff))),
          ),
        ),
      ),
      h('p', { class: 'legend' }, div.level > 1 ? badge('ACESSO', 'green') : null, div.level < 4 ? badge('REBAIXAMENTO', 'red') : null, h('span', { class: 'muted small' }, ' Toque em um clube para ver detalhes.')),
    ),
    h(
      'div',
      { class: 'two' },
      card('Última rodada', last.length ? h('ul', { class: 'results' }, last.map((r) => h('li', { class: r.homeClubId === club.id || r.awayClubId === club.id ? 'me' : '' }, h('span', { class: 'r' }, career.world.clubs[r.homeClubId].name), h('b', null, `${r.homeGoals} – ${r.awayGoals}`), h('span', null, career.world.clubs[r.awayClubId].name)))) : empty('Nenhuma rodada jogada nesta divisão.')),
      card('Seu clube', view.form.length ? h('ul', { class: 'results' }, view.form.map((f) => h('li', null, h('span', { class: `wdl wdl-${f.outcome}` }, f.outcome === 'W' ? 'V' : f.outcome === 'D' ? 'E' : 'D'), h('span', { class: 'r' }, `R${f.round} ${f.home ? 'x' : '@'} ${f.opponentName}`), h('b', null, `${f.goalsFor} – ${f.goalsAgainst}`)))) : empty('Ainda sem jogos.'), view.nextMatch ? h('p', { class: 'muted' }, `Próximo: rodada ${view.nextMatch.round}, ${view.nextMatch.home ? 'em casa' : 'fora'} contra ${view.nextMatch.opponentName}.`) : null),
    ),
  );
}
