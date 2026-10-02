import { ROUNDS_PER_SEASON, isSeasonOver } from '../../../game/career.ts';
import { KIND_LABEL, dailyPaper } from '../../../game/manager/news.ts';
import { flagOf, roundDate, stableHash } from '../../../game/manager/people.ts';
import { WINDOWS } from '../../../game/manager/market.ts';
import type { NewsItem, NewsKind } from '../../../game/manager/state.ts';
import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { badge, btn, card, crest, empty, tabsRow } from './common.ts';

// NOTÍCIAS (Jornal do Dia + arquivo por categoria) e CALENDÁRIO da temporada.

type Filter = 'TODAS' | 'MEU' | NewsKind;
let filter: Filter = 'TODAS';
const TONE: Record<NewsKind, 'blue' | 'green' | 'red' | 'yellow' | 'gray'> = { NOTICIA: 'blue', RUMOR: 'yellow', OPINIAO: 'gray', URGENTE: 'red', ANALISE: 'green' };

const SOURCE: Record<NewsKind, string> = { NOTICIA: 'Gazeta da Rodada', RUMOR: 'Bastidores do Mercado', OPINIAO: 'Coluna da Arquibancada', URGENTE: 'Plantão ELITE', ANALISE: 'Central de Análise' };

/** Hora de publicação: estável por notícia (mesmo id = mesma hora), entre 08h e 22h59. */
function newsTime(n: NewsItem): string {
  const h_ = stableHash(`hora|${n.id}`);
  return `${String(8 + (h_ % 15)).padStart(2, '0')}:${String((h_ >> 4) % 60).padStart(2, '0')}`;
}

function newsDate(n: NewsItem): string {
  return n.round > 0 ? roundDate(n.season, Math.min(n.round, ROUNDS_PER_SEASON)).label : `pré-temporada ${n.season}`;
}

/** Página completa da notícia: tudo vem do fato registrado (manchete e corpo) e das entidades ligadas a ele. */
function newsPage(ctrl: GameController, n: NewsItem): HTMLElement {
  const c = ctrl.state.career!;
  const club = n.clubId ? c.world.clubs[n.clubId] : null;
  const player = n.playerId ? c.world.players[n.playerId] : null;
  const div = club ? c.world.divisions.find((d) => d.id === club.divisionId) : null;
  const tags = [KIND_LABEL[n.kind], n.mine ? 'Meu clube' : null, club?.name ?? null, player?.name ?? null, `Temporada ${n.season}`].filter((x): x is string => !!x);
  return h(
    'div',
    { class: 'page' },
    h('div', { class: 'row gap wrap' }, btn('← VOLTAR PARA NOTÍCIAS', () => ctrl.openNews(null), { kind: 'primary' })),
    h(
      'article',
      { class: 'card news-page' },
      h('div', { class: 'news-top' }, badge(KIND_LABEL[n.kind].toUpperCase(), TONE[n.kind]), h('span', { class: 'muted small' }, `${newsDate(n)} · ${newsTime(n)}${n.round > 0 ? ` · rodada ${n.round}` : ''}`)),
      h('h2', { class: 'news-head' }, n.title),
      h('p', { class: 'muted small' }, `Fonte: ${SOURCE[n.kind]} (veículo fictício do jogo)`),
      h('div', { class: 'news-body' }, h('p', null, n.body ?? n.title), h('p', { class: 'muted' }, 'Registro do acontecimento no jogo: o texto descreve só o que aconteceu, sem fatos inventados.')),
      club || player
        ? h(
            'div',
            { class: 'news-entities' },
            h('h4', { class: 'season-sub' }, 'Relacionados'),
            club ? h('button', { type: 'button', class: 'clubrow', onClick: () => { ctrl.openClub(club.id); ctrl.go('CLUBS'); } }, crest(club, 'sm'), h('span', { class: 'cname' }, club.name), h('span', { class: 'muted small' }, `${flagOf(club.country)} ${club.city}${div ? ` · hoje na ${div.name}` : ''}`)) : null,
            player ? h('button', { type: 'button', class: 'clubrow', onClick: () => ctrl.openPlayer(player.id) }, h('span', { class: `pos pos-${player.position}` }, player.position === 'GK' ? 'GOL' : player.position === 'DEF' ? 'DEF' : player.position === 'MID' ? 'MEI' : 'ATA'), h('span', { class: 'cname' }, player.name), h('span', { class: 'muted small' }, `hoje: ${player.age} anos · força ${player.strength}`)) : null,
          )
        : null,
      h('div', { class: 'news-tags' }, tags.map((t) => h('span', { class: 'badge badge-gray' }, `#${t}`))),
    ),
  );
}

function item(ctrl: GameController, n: NewsItem): HTMLElement {
  return h('li', { class: `news${n.mine ? ' mine' : ''}`, role: 'button', tabindex: '0', onClick: () => ctrl.openNews(n.id), onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') ctrl.openNews(n.id); } }, h('div', { class: 'news-top' }, badge(KIND_LABEL[n.kind].toUpperCase(), TONE[n.kind]), h('span', { class: 'muted small' }, n.round > 0 ? `T${n.season} · R${n.round}` : `T${n.season} · pré-temporada`)), h('b', null, n.title), n.body ? h('p', { class: 'small muted' }, n.body) : null);
}

export function renderNews(ctrl: GameController): HTMLElement {
  const m = ctrl.state.career!.manager!;
  const open = ctrl.state.newsId ? m.news.find((x) => x.id === ctrl.state.newsId) : null;
  if (open) return newsPage(ctrl, open);
  const paper = dailyPaper(m.news);
  const all = [...m.news].reverse().filter((n) => filter === 'TODAS' || (filter === 'MEU' ? n.mine : n.kind === filter));
  return h(
    'div',
    { class: 'page' },
    card('Jornal do Dia', paper.length ? h('ul', { class: 'newslist' }, paper.slice(0, 8).map((n) => item(ctrl, n))) : empty('Nada publicado ainda. As notícias saem dos jogos e das decisões.')),
    card(
      'Arquivo',
      tabsRow<Filter>([{ id: 'TODAS', label: 'Todas' }, { id: 'MEU', label: 'Meu clube' }, { id: 'URGENTE', label: 'Urgente' }, { id: 'NOTICIA', label: 'Notícia' }, { id: 'RUMOR', label: 'Rumor' }, { id: 'OPINIAO', label: 'Opinião' }, { id: 'ANALISE', label: 'Análise' }], filter, (f) => { filter = f; ctrl.notifyRender(); }),
      all.length ? h('ul', { class: 'newslist' }, all.slice(0, 60).map((n) => item(ctrl, n))) : empty('Nenhuma notícia nesta categoria.'),
    ),
  );
}

export function renderCalendar(ctrl: GameController): HTMLElement {
  const c = ctrl.state.career!;
  const uid = c.userClubId;
  const div = uid ? c.world.clubs[uid].divisionId : null;
  const rounds = Array.from({ length: ROUNDS_PER_SEASON }, (_, i) => i + 1);
  const over = isSeasonOver(c);
  const compName = div ? `${c.world.divisions.find((d) => d.id === div)?.name ?? ''} ${c.season}` : '';
  const out = uid ? c.world.clubs[uid].squad.map((id) => c.world.players[id]).filter((p) => p && (p.condition.injuryRounds > 0 || p.condition.suspensionRounds > 0)) : [];
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
          h('span', { class: 'cal-m' }, fx ? `${fx.home === uid ? 'Casa' : 'Fora'} · ${opp}` : 'Rodada (sem clube)', h('span', { class: 'cal-c' }, compName)),
          h('span', { class: 'cal-s' }, res ? `${res.homeGoals}–${res.awayGoals}` : now ? 'PRÓXIMA' : ''),
          isWindow ? h('span', { class: 'cal-w', title: 'Janela de transferências aberta' }, '⇄') : h('span', { class: 'cal-w' }),
        );
      })),
      h('p', { class: 'muted small' }, '⇄ janela de transferências aberta (rodadas 1–6 e 19–24 e intertemporada). Rodadas de meio de semana caem na quarta.'),
    ),
    uid
      ? card(
          'Desfalques',
          out.length
            ? h('ul', { class: 'plain' }, out.map((p) => { const n = p.condition.injuryRounds || p.condition.suspensionRounds; const back = Math.min(c.roundNumber + n, ROUNDS_PER_SEASON + 1); return h('li', null, `${p.condition.injuryRounds > 0 ? '🩹 Lesão' : '🟥 Suspensão'} · ${p.name} · fora por ${n} partida${n === 1 ? '' : 's'}${back <= ROUNDS_PER_SEASON ? ` · volta na rodada ${back}` : ''}`); }))
            : empty('Nenhum lesionado ou suspenso.'),
        )
      : null,
  );
}
