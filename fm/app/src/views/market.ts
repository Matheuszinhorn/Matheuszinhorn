import type { Position } from '../../../engine/index.ts';
import { isSeasonOver } from '../../../game/career.ts';
import { searchPlayers, windowLabel, windowOpen, type SearchFilters } from '../../../game/manager/market.ts';
import { flagOf } from '../../../game/manager/people.ts';
import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { POSITION_LABEL, money } from '../format.ts';
import { badge, btn, card, empty, table, tabsRow } from './common.ts';

// MERCADO: janela, busca com filtros, negociações (com contraproposta), lista de desejos, leilões e empréstimos.
// Toda resposta vem da regra fixa de game/manager/market.ts; a tela só mostra e encaminha.

type Tab = 'BUSCA' | 'NEGOCIACOES' | 'DESEJOS' | 'VENDAS';
const ui: { tab: Tab; f: SearchFilters; init: boolean } = { tab: 'BUSCA', f: { position: '', divisionLevel: 0 }, init: false };

const STATUS: Record<string, [string, 'blue' | 'green' | 'red' | 'yellow' | 'gray']> = {
  OPEN: ['EM ABERTO', 'blue'], COUNTER: ['CONTRAPROPOSTA', 'yellow'], ACCEPTED: ['ACEITA', 'green'], DONE: ['FECHADO', 'green'], REFUSED: ['RECUSADA', 'red'], CANCELLED: ['ENCERRADA', 'gray'],
  SOLD: ['VENDIDO', 'green'], NO_BIDS: ['SEM LANCES', 'red'], WITHDRAWN: ['CANCELADO', 'gray'],
};

export function renderMarket(ctrl: GameController): HTMLElement {
  const c = ctrl.state.career!;
  const m = c.manager!;
  const over = isSeasonOver(c);
  const open = windowOpen(c.roundNumber, over);
  const name = (id: string) => c.world.players[id]?.name ?? 'Jogador';
  // primeira visita: a busca começa na divisão do clube (onde estão os jogadores que cabem no caixa)
  if (!ui.init && c.userClubId) {
    ui.init = true;
    ui.f.divisionLevel = c.world.divisions.find((d) => d.id === c.world.clubs[c.userClubId!].divisionId)?.level ?? 0;
  }
  const header = h('div', { class: `window ${open ? 'open' : 'closed'}` }, h('span', { class: 'window-dot' }), h('b', null, open ? 'MERCADO ABERTO' : 'MERCADO FECHADO'), h('span', { class: 'muted' }, windowLabel(c.roundNumber, over)));
  const tabs = tabsRow<Tab>([{ id: 'BUSCA', label: 'Buscar' }, { id: 'NEGOCIACOES', label: 'Negociações' }, { id: 'DESEJOS', label: `Desejos (${m.market.wishlist.length})` }, { id: 'VENDAS', label: 'Leilões e empréstimos' }], ui.tab, (t) => { ui.tab = t; ctrl.notifyRender(); });
  let body: HTMLElement;
  if (ui.tab === 'BUSCA' || ui.tab === 'DESEJOS') {
    const f = ui.tab === 'DESEJOS' ? { wishlistOnly: true } : ui.f;
    const rows = searchPlayers(c.world, c.seed, c.userClubId, m.market.wishlist, f, 80);
    const set = (k: keyof SearchFilters, v: unknown) => { (ui.f as Record<string, unknown>)[k] = v; ctrl.notifyRender(); };
    body = card(
      ui.tab === 'DESEJOS' ? 'Lista de desejos' : 'Buscar jogadores',
      ui.tab === 'BUSCA'
        ? h(
            'div',
            { class: 'filters' },
            h('label', { class: 'field' }, h('span', null, 'Nome ou clube'), h('input', { type: 'text', value: ui.f.text ?? '', placeholder: 'Buscar…', onChange: (e: Event) => set('text', (e.target as HTMLInputElement).value) })),
            h('label', { class: 'field' }, h('span', null, 'Posição'), h('select', { onChange: (e: Event) => set('position', (e.target as HTMLSelectElement).value as Position | '') }, h('option', { value: '' }, 'Todas'), (['GK', 'DEF', 'MID', 'ATT'] as const).map((p) => h('option', { value: p, selected: ui.f.position === p }, POSITION_LABEL[p])))),
            h('label', { class: 'field' }, h('span', null, 'Divisão'), h('select', { onChange: (e: Event) => set('divisionLevel', Number((e.target as HTMLSelectElement).value)) }, h('option', { value: '0' }, 'Todas'), [1, 2, 3, 4].map((l) => h('option', { value: String(l), selected: ui.f.divisionLevel === l }, `${l}ª divisão`)), h('option', { value: '5', selected: ui.f.divisionLevel === 5 }, 'Sem clube'))),
            h('label', { class: 'field' }, h('span', null, 'Idade máx.'), h('input', { type: 'number', min: '16', max: '40', value: ui.f.maxAge ?? '', onChange: (e: Event) => set('maxAge', Number((e.target as HTMLInputElement).value) || undefined) })),
            h('label', { class: 'field' }, h('span', null, 'Preço máx. (R$)'), h('input', { type: 'number', min: '0', step: '10000', value: ui.f.maxPrice ?? '', onChange: (e: Event) => set('maxPrice', Number((e.target as HTMLInputElement).value) || undefined) })),
          )
        : null,
      rows.length
        ? table(['', 'Jogador', 'For.', 'Idade', 'Preço', ''], rows.map((r) => ({ onClick: () => ctrl.openPlayer(r.player.id), cells: [h('span', { class: `pos pos-${r.player.position}` }, POSITION_LABEL[r.player.position]), h('div', { class: 'pcell' }, h('span', null, `${flagOf(r.player.nationality)} ${r.player.name}`), h('span', { class: 'muted small' }, r.club ? r.club.name : 'Livre')), h('b', { title: r.rel ? `${Math.round(r.rel.delta) >= 0 ? '+' : ''}${Math.round(r.rel.delta)} sobre a média da divisão` : '' }, `${r.rel?.star ? '⭐' : ''}${r.player.strength}`), r.player.age, r.club ? money(r.price) : '—', r.wish ? '★' : ''] })), 'tbl market', [2, 3, 4])
        : empty(ui.tab === 'DESEJOS' ? 'Nenhum jogador na lista. Abra um jogador e toque em ★ LISTA DE DESEJOS.' : 'Nenhum jogador com esses filtros.'),
      h('p', { class: 'muted small' }, 'Toque num jogador para ver o perfil, fazer oferta ou pedir emprestado. ⭐ = destaque da divisão dele (contexto: força 30 é destaque na 4ª e abaixo da média na 1ª).'),
    );
  } else if (ui.tab === 'NEGOCIACOES') {
    const list = [...m.market.negotiations].reverse();
    body = card(
      'Negociações',
      list.length
        ? h('ul', { class: 'deals' }, list.map((n) => h('li', null, h('div', { class: 'deal-main' }, h('b', null, name(n.playerId)), h('span', { class: 'muted' }, `${c.world.clubs[n.sellerClubId]?.name ?? ''} · oferta ${money(n.offer)}${n.counter ? ` · pedem ${money(n.counter)}` : ''}`), h('span', { class: 'small' }, n.message)), h('div', { class: 'deal-side' }, badge(...STATUS[n.status]), n.status === 'COUNTER' && open ? btn('ACEITAR', () => ctrl.acceptCounter(n.id), { kind: 'good' }) : null, n.status === 'OPEN' || n.status === 'COUNTER' ? btn('NOVA OFERTA', () => ctrl.openPlayer(n.playerId)) : null, n.status === 'OPEN' || n.status === 'COUNTER' ? btn('DESISTIR', () => ctrl.cancelNegotiation(n.id)) : null))))
        : empty('Nenhuma negociação ainda. Use Buscar.'),
    );
  } else {
    body = h(
      'div',
      null,
      card('Leilões', m.market.auctions.length ? h('ul', { class: 'deals' }, [...m.market.auctions].reverse().map((a) => h('li', null, h('div', { class: 'deal-main' }, h('b', null, name(a.playerId)), h('span', { class: 'muted' }, `Lance mínimo ${money(a.startPrice)}${a.winner ? ` · vendido por ${money(a.winner.amount)} ao ${c.world.clubs[a.winner.clubId]?.name}` : ''}${a.bids.length ? ` · ${a.bids.length} lance(s)` : ''}`)), h('div', { class: 'deal-side' }, badge(...STATUS[a.status]), a.status === 'OPEN' ? btn('CANCELAR', () => ctrl.withdrawAuction(a.id)) : null)))) : empty('Nenhum leilão. Abra um jogador do seu elenco e toque em VENDER EM LEILÃO.')),
      card('Empréstimos', m.market.loans.length ? h('ul', { class: 'deals' }, m.market.loans.map((l) => h('li', null, h('div', { class: 'deal-main' }, h('b', null, name(l.playerId)), h('span', { class: 'muted' }, l.toClubId === c.userClubId ? `Chegou do ${c.world.clubs[l.fromClubId]?.name} até ${l.untilSeason}` : `Emprestado ao ${c.world.clubs[l.toClubId]?.name} até ${l.untilSeason}`))))) : empty('Nenhum empréstimo.')),
    );
  }
  return h('div', { class: 'page' }, header, tabs, body);
}
