import { ROUNDS_PER_SEASON, divisionStandings } from '../../../game/career.ts';
import { MOOD_ICON, MOOD_LABEL, moodOf } from '../../../game/manager/board.ts';
import { flagOf } from '../../../game/manager/people.ts';
import type { GameController, Screen } from '../controller.ts';
import { CLUB_SCREENS } from '../controller.ts';
import { h } from '../dom.ts';
import { money, useNamesOf } from '../format.ts';
import { crest } from './common.ts';
import { renderCareer } from './careerview.ts';
import { renderFinance, renderStadium } from './club-admin.ts';
import { renderClubs } from './clubs.ts';
import { renderDecision } from './decision.ts';
import { renderEntry, renderMode } from './entry.ts';
import { renderLeague } from './league.ts';
import { renderMarket } from './market.ts';
import { renderMatch } from './match.ts';
import { renderPlayer } from './player.ts';
import { renderProposal } from './proposal.ts';
import { renderStart } from './start.ts';
import { renderStop } from './stop.ts';
import { renderTeam } from './team.ts';
import { renderCalendar, renderNews } from './world.ts';

// Estrutura do app: barra superior, navegação (rodapé no celular com MAIS; coluna lateral no computador),
// pop-ups (decisão, parada da partida, proposta, perfil do jogador) e avisos.

interface NavItem {
  id: Screen;
  label: string;
  icon: string;
}

const I = {
  team: 'M8 3 3 6l2 4 3-1v11h8V9l3 1 2-4-5-3c-.5 1.5-1.7 2.3-3 2.3S8.5 4.5 8 3z',
  match: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-2 5.5 6 3.5-6 3.5z',
  league: 'M4 5h16v3H4zm0 5.5h16v3H4zM4 16h16v3H4z',
  market: 'M4 7h13l-3-3 1.4-1.4L21 8l-5.6 5.4L14 12l3-3H4zm16 10H7l3 3-1.4 1.4L3 16l5.6-5.4L10 12l-3 3h13z',
  clubs: 'M12 3 4 6v6c0 4.5 3.2 7.6 8 9 4.8-1.4 8-4.5 8-9V6z',
  news: 'M4 4h13v15a1 1 0 0 0 2 0V8h2v11a3 3 0 0 1-3 3H6a2 2 0 0 1-2-2zm3 3v3h7V7zm0 5v2h7v-2zm0 4v2h7v-2z',
  calendar: 'M7 2h2v2h6V2h2v2h3v17H4V4h3zm-1 7v10h12V9z',
  stadium: 'M2 18h20v3H2zm2-2c0-5 3.6-8 8-8s8 3 8 8h-3c0-3.3-2.2-5-5-5s-5 1.7-5 5z',
  finance: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15v2h-2v-2c-1.7-.3-3-1.4-3-3h2c0 .8.9 1.3 2 1.3s2-.4 2-1.2c0-.9-.9-1.1-2.3-1.5C9.9 12.2 8 11.6 8 9.6c0-1.4 1.2-2.4 3-2.7V5h2v2c1.6.3 2.8 1.4 2.8 3h-2c0-.7-.7-1.2-1.8-1.2s-1.8.4-1.8 1c0 .8.8 1 2.3 1.4 1.9.5 3.5 1.2 3.5 3.2 0 1.6-1.2 2.6-3 2.6z',
  career: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-8 16c0-4 3.6-6 8-6s8 2 8 6z',
  more: 'M5 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
};

const NAV: NavItem[] = [
  { id: 'TEAM', label: 'MEU TIME', icon: I.team },
  { id: 'MATCH', label: 'PARTIDA', icon: I.match },
  { id: 'LEAGUE', label: 'CAMPEONATO', icon: I.league },
  { id: 'MARKET', label: 'MERCADO', icon: I.market },
  { id: 'CLUBS', label: 'CLUBES', icon: I.clubs },
  { id: 'NEWS', label: 'NOTÍCIAS', icon: I.news },
  { id: 'CALENDAR', label: 'CALENDÁRIO', icon: I.calendar },
  { id: 'STADIUM', label: 'ESTÁDIO', icon: I.stadium },
  { id: 'FINANCE', label: 'FINANÇAS', icon: I.finance },
  { id: 'CAREER', label: 'CARREIRA', icon: I.career },
];
/** Celular: os quatro primeiros ficam na barra; o resto abre no MAIS. */
const PRIMARY: Screen[] = ['TEAM', 'MATCH', 'LEAGUE', 'MARKET'];

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
  const m = career.manager;
  const sound = h('button', { type: 'button', class: `tb-sound${ctrl.state.audio ? ' on' : ''}`, title: ctrl.state.audio ? 'Som da torcida: ligado' : 'Som da torcida: desligado', 'aria-label': 'Som da torcida', 'aria-pressed': ctrl.state.audio ? 'true' : 'false', onClick: () => ctrl.toggleAudio() }, ctrl.state.audio ? '🔊' : '🔇');
  if (!career.userClubId) {
    return h('header', { class: 'topbar' }, h('span', { class: 'crest crest-md crest-none' }, '?'), h('div', { class: 'tb-main' }, h('strong', null, career.coach.name), h('span', { class: 'tb-sub' }, `Sem clube · aguardando propostas · T${career.season} · R${Math.min(career.roundNumber, ROUNDS_PER_SEASON)}/${ROUNDS_PER_SEASON}`)), sound);
  }
  const club = career.world.clubs[career.userClubId];
  const div = career.world.divisions.find((d) => d.id === club.divisionId)!;
  const pos = divisionStandings(career, div.id).findIndex((r) => r.clubId === club.id) + 1;
  const mood = m ? moodOf(m.morale) : 'GOOD';
  return h(
    'header',
    { class: 'topbar', style: `--club-a:${club.primaryColor};--club-b:${club.secondaryColor}` },
    crest(club, 'md'),
    h('div', { class: 'tb-main' }, h('strong', null, club.name), h('span', { class: 'tb-sub' }, `${flagOf(club.country)} ${div.name} · ${career.roundNumber > 1 ? `${pos}º` : 'sem jogos'} · T${career.season} · R${Math.min(career.roundNumber, ROUNDS_PER_SEASON)}/${ROUNDS_PER_SEASON}`)),
    m ? h('button', { type: 'button', class: 'tb-mood', title: `${MOOD_LABEL[mood]} (moral ${m.morale})`, 'aria-label': `Moral: ${MOOD_LABEL[mood]}`, onClick: () => ctrl.go('CAREER') }, MOOD_ICON[mood]) : null,
    sound,
    h('div', { class: 'tb-cash' }, h('span', { class: 'tb-cash-l' }, 'CAIXA'), h('b', null, money(club.money))),
  );
}

function navButton(ctrl: GameController, n: NavItem, extra = ''): HTMLElement {
  const s = ctrl.state;
  const deciding = s.snapshot.status === 'AWAITING_DECISION';
  const locked = !s.career?.userClubId && CLUB_SCREENS.includes(n.id);
  return h('button', { type: 'button', class: `nav-btn${n.id === s.screen ? ' on' : ''}${locked ? ' locked' : ''} ${extra}`, 'aria-current': n.id === s.screen ? 'page' : null, onClick: () => ctrl.go(n.id) }, icon(n.icon), h('span', { class: 'nav-l' }, n.label), n.id === 'MATCH' && s.phase === 'LIVE' ? h('span', { class: `nav-dot${deciding ? ' warn' : ''}` }) : null);
}

// A tela é redesenhada a cada minuto de jogo: a animação de entrada do pop-up e do MAIS só pode rodar no PRIMEIRO
// desenho deles (senão ela recomeça a cada redesenho, a peça "treme" e não dá para tocar nela durante a rodada).
let lastModal: string | null = null;
let lastMore = false;
let lastToast: unknown = null;

function enterOnce(el: HTMLElement | null, key: string | null, last: string | null): void {
  if (el && key !== null && key !== last) el.querySelector('.modal, .more-sheet')?.classList.add('enter');
}

export function renderApp(ctrl: GameController): HTMLElement[] {
  const s = ctrl.state;
  const toast = s.toast ? h('div', { class: `toast toast-${s.toast.kind}${s.toast !== lastToast ? ' enter' : ''}`, role: 'status', onClick: () => ctrl.dismissToast() }, s.toast.text) : null;
  lastToast = s.toast;
  if (s.screen === 'ENTRY') return [renderEntry(ctrl), ...(toast ? [toast] : [])];
  if (s.screen === 'MODE') return [renderMode(ctrl), ...(toast ? [toast] : [])];
  if (s.screen === 'START' || !s.career) return [...renderStart(ctrl), ...(toast ? [toast] : [])];
  const fullNames = useNamesOf(s.career.world);
  const views: Record<string, (c: GameController) => HTMLElement> = { TEAM: renderTeam, MATCH: renderMatch, LEAGUE: renderLeague, CLUBS: renderClubs, CAREER: renderCareer, MARKET: renderMarket, NEWS: renderNews, CALENDAR: renderCalendar, STADIUM: renderStadium, FINANCE: renderFinance };
  const body = (views[s.screen] ?? renderMatch)(ctrl);
  const inMore = !PRIMARY.includes(s.screen);
  const nav = h(
    'nav',
    { class: 'nav', 'aria-label': 'Navegação principal' },
    h('div', { class: 'brand-logo nav-brand', role: 'img', 'aria-label': 'ELITE MANAGER' }),
    NAV.map((n) => navButton(ctrl, n, PRIMARY.includes(n.id) ? '' : 'nav-extra')),
    h('button', { type: 'button', class: `nav-btn nav-more${inMore ? ' on' : ''}`, 'aria-expanded': s.more ? 'true' : 'false', onClick: () => ctrl.toggleMore() }, icon(I.more), h('span', { class: 'nav-l' }, 'MAIS')),
  );
  const sheet = s.more
    ? h('div', { class: 'more-back', onClick: (e: Event) => { if (e.target === e.currentTarget) ctrl.toggleMore(false); } }, h('div', { class: 'more-sheet', role: 'menu' }, NAV.filter((n) => !PRIMARY.includes(n.id)).map((n) => navButton(ctrl, n, 'sheet-btn'))))
    : null;
  const modal = renderDecision(ctrl) ?? renderStop(ctrl) ?? renderProposal(ctrl, s.career.coach.name) ?? renderPlayer(ctrl);
  const modalKey = modal ? modal.getAttribute('aria-label') : null;
  enterOnce(modal, modalKey, lastModal);
  lastModal = modalKey;
  enterOnce(sheet, s.more ? 'more' : null, lastMore ? 'more' : null);
  lastMore = s.more;
  return [h('div', { class: fullNames ? 'shell names-full' : 'shell' }, topbar(ctrl), nav, h('main', { class: 'content' }, body)), ...(sheet ? [sheet] : []), ...(modal ? [modal] : []), ...(toast ? [toast] : [])];
}
