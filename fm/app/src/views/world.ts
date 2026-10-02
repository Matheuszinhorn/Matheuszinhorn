import { ROUNDS_PER_SEASON, isSeasonOver } from '../../../game/career.ts';
import { KIND_LABEL, dailyPaper } from '../../../game/manager/news.ts';
import { roundDate } from '../../../game/manager/people.ts';
import { WINDOWS } from '../../../game/manager/market.ts';
import type { NewsItem, NewsKind } from '../../../game/manager/state.ts';
import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { badge, card, empty, tabsRow } from './common.ts';

// NOTÍCIAS (Jornal do Dia + arquivo por categoria) e CALENDÁRIO da temporada.

type Filter = 'TODAS' | 'MEU' | NewsKind;
let filter: Filter = 'TODAS';
const TONE: Record<NewsKind, 'blue' | 'green' | 'red' | 'yellow' | 'gray'> = { NOTICIA: 'blue', RUMOR: 'yellow', OPINIAO: 'gray', URGENTE: 'red', ANALISE: 'green' };

function item(n: NewsItem): HTMLElement {
  return h('li', { class: `news${n.mine ? ' mine' : ''}` }, h('div', { class: 'news-top' }, badge(KIND_LABEL[n.kind].toUpperCase(), TONE[n.kind]), h('span', { class: 'muted small' }, n.round > 0 ? `T${n.season} · R${n.round}` : `T${n.season} · pré-temporada`)), h('b', null, n.title), n.body ? h('p', { class: 'small muted' }, n.body) : null);
}

export function renderNews(ctrl: GameController): HTMLElement {
  const m = ctrl.state.career!.manager!;
  const paper = dailyPaper(m.news);
  const all = [...m.news].reverse().filter((n) => filter === 'TODAS' || (filter === 'MEU' ? n.mine : n.kind === filter));
  return h(
    'div',
    { class: 'page' },
    card('Jornal do Dia', paper.length ? h('ul', { class: 'newslist' }, paper.slice(0, 8).map(item)) : empty('Nada publicado ainda. As notícias saem dos jogos e das decisões.')),
    card(
      'Arquivo',
      tabsRow<Filter>([{ id: 'TODAS', label: 'Todas' }, { id: 'MEU', label: 'Meu clube' }, { id: 'URGENTE', label: 'Urgente' }, { id: 'NOTICIA', label: 'Notícia' }, { id: 'RUMOR', label: 'Rumor' }, { id: 'OPINIAO', label: 'Opinião' }, { id: 'ANALISE', label: 'Análise' }], filter, (f) => { filter = f; ctrl.notifyRender(); }),
      all.length ? h('ul', { class: 'newslist' }, all.slice(0, 60).map(item)) : empty('Nenhuma notícia nesta categoria.'),
    ),
  );
}

export function renderCalendar(ctrl: GameController): HTMLElement {
  const c = ctrl.state.career!;
  const uid = c.userClubId;
  const div = uid ? c.world.clubs[uid].divisionId : null;
  const rounds = Array.from({ length: ROUNDS_PER_SEASON }, (_, i) => i + 1);
  const over = isSeasonOver(c);
  return h(
    'div',
    { class: 'page' },
    card(
      `Calendário ${c.season}`,
      h('ul', { class: 'calendar' }, rounds.map((r) => {
        const d = roundDate(c.season, r);
        const fx = div ? (c.schedule[div][r - 1] ?? []).find((f) => f.home === uid || f.away === uid) : null;
        const res = fx ? c.results.find((x) => x.round === r && x.homeClubId === fx.home && x.awayClubId === fx.away) : null;
        const isWindow = WINDOWS.some(([a, b]) => r >= a && r <= b);
        const now = !over && r === c.roundNumber;
        const opp = fx ? c.world.clubs[fx.home === uid ? fx.away : fx.home].name : null;
        return h(
          'li',
          { class: `cal${now ? ' now' : ''}${r < c.roundNumber ? ' past' : ''}` },
          h('span', { class: 'cal-r' }, `R${r}`),
          h('span', { class: 'cal-d' }, d.label),
          h('span', { class: 'cal-m' }, fx ? `${fx.home === uid ? 'x' : '@'} ${opp}` : 'Rodada (sem clube)'),
          h('span', { class: 'cal-s' }, res ? `${res.homeGoals}–${res.awayGoals}` : now ? 'PRÓXIMA' : ''),
          isWindow ? h('span', { class: 'cal-w', title: 'Janela de transferências aberta' }, '⇄') : h('span', { class: 'cal-w' }),
        );
      })),
      h('p', { class: 'muted small' }, '⇄ janela de transferências aberta (rodadas 1–6 e 19–24 e intertemporada). Rodadas de meio de semana caem na quarta.'),
    ),
  );
}
