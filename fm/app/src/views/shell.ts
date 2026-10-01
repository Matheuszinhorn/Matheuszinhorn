import { ROUNDS_PER_SEASON, divisionStandings, userClub } from '../../../game/career.ts';
import type { GameController, Screen } from '../controller.ts';
import { h } from '../dom.ts';
import { money } from '../format.ts';
import { crest } from './common.ts';
import { renderCareer } from './careerview.ts';
import { renderClubs } from './clubs.ts';
import { renderDecision } from './decision.ts';
import { renderLeague } from './league.ts';
import { renderMatch } from './match.ts';
import { renderStart } from './start.ts';
import { renderTeam } from './team.ts';

// Estrutura do app: barra superior, navegação (rodapé no celular, coluna lateral no computador), pop-up de decisão e avisos.

const NAV: { id: Screen; label: string; icon: string }[] = [
  { id: 'TEAM', label: 'MEU TIME', icon: 'M8 3 3 6l2 4 3-1v11h8V9l3 1 2-4-5-3c-.5 1.5-1.7 2.3-3 2.3S8.5 4.5 8 3z' },
  { id: 'MATCH', label: 'PARTIDA', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-2 5.5 6 3.5-6 3.5z' },
  { id: 'LEAGUE', label: 'CAMPEONATO', icon: 'M4 5h16v3H4zm0 5.5h16v3H4zM4 16h16v3H4z' },
  { id: 'CLUBS', label: 'CLUBES', icon: 'M12 3 4 6v6c0 4.5 3.2 7.6 8 9 4.8-1.4 8-4.5 8-9V6z' },
  { id: 'CAREER', label: 'CARREIRA', icon: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-8 16c0-4 3.6-6 8-6s8 2 8 6z' },
];

function icon(path: string): HTMLElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'ico-svg');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', path);
  p.setAttribute('fill', 'currentColor');
  svg.appendChild(p);
  const span = document.createElement('span');
  span.className = 'nav-ico';
  span.appendChild(svg);
  return span;
}

function topbar(ctrl: GameController): HTMLElement {
  const career = ctrl.state.career!;
  const club = userClub(career);
  const div = career.world.divisions.find((d) => d.id === club.divisionId)!;
  const pos = divisionStandings(career, div.id).findIndex((r) => r.clubId === club.id) + 1;
  return h(
    'header',
    { class: 'topbar' },
    crest(club, 'md'),
    h('div', { class: 'tb-main' }, h('strong', null, club.name), h('span', { class: 'tb-sub' }, `${div.name} · ${career.roundNumber > 1 ? `${pos}º` : 'sem jogos'} · T${career.season} · R${Math.min(career.roundNumber, ROUNDS_PER_SEASON)}/${ROUNDS_PER_SEASON}`)),
    h('div', { class: 'tb-cash' }, h('span', { class: 'tb-cash-l' }, 'CAIXA'), h('b', null, money(club.money))),
  );
}

export function renderApp(ctrl: GameController): HTMLElement[] {
  const s = ctrl.state;
  const toast = s.toast ? h('div', { class: `toast toast-${s.toast.kind}`, role: 'status', onClick: () => ctrl.dismissToast() }, s.toast.text) : null;
  if (s.screen === 'START' || !s.career) return [renderStart(ctrl), ...(toast ? [toast] : [])];
  const body = { TEAM: renderTeam, MATCH: renderMatch, LEAGUE: renderLeague, CLUBS: renderClubs, CAREER: renderCareer }[s.screen](ctrl);
  const deciding = s.snapshot.status === 'AWAITING_DECISION';
  const nav = h(
    'nav',
    { class: 'nav', 'aria-label': 'Navegação principal' },
    NAV.map((n) => h('button', { type: 'button', class: `nav-btn${n.id === s.screen ? ' on' : ''}`, 'aria-current': n.id === s.screen ? 'page' : null, onClick: () => ctrl.go(n.id) }, icon(n.icon), h('span', { class: 'nav-l' }, n.label), n.id === 'MATCH' && s.phase === 'LIVE' ? h('span', { class: `nav-dot${deciding ? ' warn' : ''}` }) : null)),
  );
  const modal = renderDecision(ctrl);
  return [h('div', { class: 'shell' }, topbar(ctrl), nav, h('main', { class: 'content' }, body)), ...(modal ? [modal] : []), ...(toast ? [toast] : [])];
}
