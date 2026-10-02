import { isSeasonOver } from '../../../game/career.ts';
import { askingPrice, loanFee, minAuctionPrice, salaryDemand, windowOpen } from '../../../game/manager/market.ts';
import { PERSONALITY_LABEL, flagOf, personalityOf } from '../../../game/manager/people.ts';
import { EMPTY_LINE } from '../../../game/manager/state.ts';
import type { GameController } from '../controller.ts';
import { h, type Child } from '../dom.ts';
import { POSITION_NAME, money } from '../format.ts';
import { btn, modalBox, stat } from './common.ts';

// Perfil do jogador: dados, estatísticas reais (temporada e carreira), personalidade, contrato e as ações possíveis.
// As negociações mesmo acontecem nas telas MERCADO e MEU TIME; aqui ficam os atalhos.

const draft = { offer: '', salary: '', years: '', auction: '', id: '' };

export function statusOf(p: { condition: { injuryRounds: number; suspensionRounds: number } }): string {
  if (p.condition.injuryRounds > 0) return `🩹 Lesionado (${p.condition.injuryRounds} rod.)`;
  if (p.condition.suspensionRounds > 0) return `🟥 Suspenso (${p.condition.suspensionRounds} rod.)`;
  return '✅ Disponível';
}

export function renderPlayer(ctrl: GameController): HTMLElement | null {
  const id = ctrl.state.playerId;
  const c = ctrl.state.career;
  if (!id || !c) return null;
  const p = c.world.players[id];
  if (!p) return null;
  if (draft.id !== id) Object.assign(draft, { id, offer: '', salary: '', years: '', auction: '' });
  const m = c.manager;
  const club = p.clubId ? c.world.clubs[p.clubId] : null;
  const mine = p.clubId !== null && p.clubId === c.userClubId;
  const season = m?.stats.season[id] ?? EMPTY_LINE;
  const career = m?.stats.career[id] ?? EMPTY_LINE;
  const pers = personalityOf(c.seed, p);
  const open = windowOpen(c.roundNumber, isSeasonOver(c));
  const live = ctrl.state.phase === 'LIVE';
  const talk = m?.contracts[id];
  const neg = m?.market.negotiations.find((n) => n.playerId === id && (n.status === 'OPEN' || n.status === 'COUNTER'));
  const wish = m?.market.wishlist.includes(id) ?? false;
  const loaned = m?.market.loans.find((l) => l.playerId === id);
  const body: Child[] = [
    h('div', { class: 'stats' }, stat('Força', p.strength), stat('Idade', p.age), stat('Posição', POSITION_NAME[p.position]), stat('Valor', money(p.marketValue))),
    h('p', null, `${flagOf(p.nationality)} ${p.nationality} · ${club ? club.name : 'Sem clube (livre)'}${loaned ? ' · emprestado' : ''}`),
    h('p', null, h('span', { class: 'label' }, 'Situação '), statusOf(p)),
    h('p', null, h('span', { class: 'label' }, 'Personalidade '), PERSONALITY_LABEL[pers]),
    h('p', null, h('span', { class: 'label' }, 'Contrato '), `até ${p.contract.endSeason} · salário ${money(p.salary)} por rodada`),
    h('h4', { class: 'season-sub' }, 'Estatísticas'),
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, ['', 'J', 'Gols', 'Amarelos', 'Vermelhos', 'Lesões'].map((t) => h('th', null, t)))), h('tbody', null, [['Temporada', season], ['Carreira', career]].map(([label, l]) => { const x = l as typeof EMPTY_LINE; return h('tr', null, h('td', null, label as string), h('td', null, x.apps), h('td', null, x.goals), h('td', null, x.yellows), h('td', null, x.reds), h('td', null, x.injuries)); })))),
    h('p', { class: 'muted small' }, 'Assistências não aparecem: o motor de partida não registra o passe do gol (ver docs/ENGINE.md).'),
  ];
  const actions: Child[] = [];
  if (!live && c.userClubId && mine && !loaned) {
    if (talk && talk.status === 'OPEN') {
      body.push(
        h('h4', { class: 'season-sub' }, 'Renovação'),
        h('p', { class: 'notice' }, `${talk.message} Pede ${money(talk.askSalary)} por rodada, ${talk.askYears} temporada(s). Tentativa ${talk.attempts} de 3.`),
        h('div', { class: 'row gap wrap' }, h('label', { class: 'field grow' }, h('span', null, 'Salário por rodada (R$)'), h('input', { type: 'number', min: '0', step: '100', value: draft.salary || String(talk.askSalary), onInput: (e: Event) => (draft.salary = (e.target as HTMLInputElement).value) })), h('label', { class: 'field grow' }, h('span', null, 'Temporadas'), h('input', { type: 'number', min: '1', max: '5', value: draft.years || String(talk.askYears), onInput: (e: Event) => (draft.years = (e.target as HTMLInputElement).value) }))),
      );
      actions.push(btn('PROPOR RENOVAÇÃO', () => ctrl.proposeRenewal(id, Number(draft.salary || talk.askSalary), Number(draft.years || talk.askYears)), { kind: 'primary' }));
    } else if (talk && talk.status === 'BROKEN') {
      body.push(h('p', { class: 'notice' }, 'Sem acordo de renovação: sai ao fim do contrato.'));
    } else actions.push(btn('RENOVAR CONTRATO', () => ctrl.startRenewal(id)));
    if (open) {
      body.push(h('label', { class: 'field' }, h('span', null, `Leilão: lance mínimo (≥ ${money(minAuctionPrice(p))})`), h('input', { type: 'number', min: String(minAuctionPrice(p)), step: '5000', value: draft.auction || String(minAuctionPrice(p)), onInput: (e: Event) => (draft.auction = (e.target as HTMLInputElement).value) })));
      actions.push(btn('VENDER EM LEILÃO', () => ctrl.openAuction(id, Number(draft.auction || minAuctionPrice(p)))), btn('EMPRESTAR', () => ctrl.loanOut(id)));
    }
  }
  if (!live && c.userClubId && !mine) {
    actions.push(btn(wish ? 'TIRAR DOS DESEJOS' : '★ LISTA DE DESEJOS', () => ctrl.toggleWish(id)));
    if (!club) actions.push(btn(`CONTRATAR LIVRE (${money(salaryDemand(c.seed, p))}/rod.)`, () => ctrl.signFreeAgent(id), { kind: 'primary' }));
    else if (open) {
      const asking = askingPrice(c.world, c.seed, id, c.world.clubs[c.userClubId]);
      body.push(
        h('h4', { class: 'season-sub' }, 'Negociação'),
        h('p', null, `Preço pedido pelo ${club.name}: `, h('b', null, money(asking)), `. Salário pedido: ${money(salaryDemand(c.seed, p))} por rodada.`),
        neg ? h('p', { class: 'notice' }, neg.status === 'COUNTER' ? `Contraproposta do clube: ${money(neg.counter ?? 0)}. ${neg.message}` : neg.message) : null,
        h('label', { class: 'field' }, h('span', null, 'Sua oferta (R$)'), h('input', { type: 'number', min: '0', step: '5000', value: draft.offer || String(Math.round(asking * 0.8 / 5000) * 5000), onInput: (e: Event) => (draft.offer = (e.target as HTMLInputElement).value) })),
      );
      actions.push(btn('FAZER OFERTA', () => ctrl.makeOffer(id, Number(draft.offer || Math.round(asking * 0.8 / 5000) * 5000)), { kind: 'primary' }));
      if (neg?.status === 'COUNTER') actions.push(btn('ACEITAR CONTRAPROPOSTA', () => ctrl.acceptCounter(neg.id), { kind: 'good' }));
      actions.push(btn(`PEDIR EMPRESTADO (${money(loanFee(p))})`, () => ctrl.requestLoan(id)));
    } else body.push(h('p', { class: 'muted' }, 'Janela de transferências fechada.'));
  }
  return modalBox(p.name, `${club ? club.name : 'Livre'} · ${POSITION_NAME[p.position]}`, body, [...actions, btn('FECHAR', () => ctrl.openPlayer(null))], 'blue', 'modal-wide');
}
