import { isSeasonOver } from '../../../game/career.ts';
import { satisfaction } from '../../../game/manager/contracts.ts';
import { askingPrice, loanFee, minAuctionPrice, salaryDemand, windowOpen } from '../../../game/manager/market.ts';
import { PERSONALITY_LABEL, flagOf, personalityOf } from '../../../game/manager/people.ts';
import { TIER_LABEL, divisionMeans, relativeOf } from '../../../game/manager/progression.ts';
import { EMPTY_LINE } from '../../../game/manager/state.ts';
import type { GameController } from '../controller.ts';
import { h, type Child } from '../dom.ts';
import { POSITION_NAME, injuryLabel, money, perRoundFromSeason, seasonSalary } from '../format.ts';
import { btn, clubStripe, modalBox, stat } from './common.ts';

// Perfil do jogador: dados, força relativa à divisão, estatísticas reais (temporada e carreira), personalidade,
// satisfação, contrato (salário POR TEMPORADA) e as ações possíveis. As regras moram em game/manager.

const draft = { offer: '', salary: '', years: '', auction: '', id: '' };

export function statusOf(p: { condition: { injuryRounds: number; suspensionRounds: number } }): string {
  if (p.condition.injuryRounds > 0) return injuryLabel(p.condition.injuryRounds);
  if (p.condition.suspensionRounds > 0) return `🟥 Suspenso · fora por ${p.condition.suspensionRounds} partida${p.condition.suspensionRounds === 1 ? '' : 's'}`;
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
  const rel = relativeOf(c.world, divisionMeans(c.world), p);
  const divName = rel ? (c.world.divisions.find((d) => d.id === rel.divisionId)?.name ?? '') : '';
  const roundsPlayed = Math.min(c.roundNumber - 1, 38);
  const mood = satisfaction(c.seed, p, roundsPlayed > 0 ? season.apps / roundsPlayed : null, roundsPlayed);
  const body: Child[] = [
    club ? clubStripe(club) : null,
    h('div', { class: 'stats' }, stat('Força', `${rel?.star ? '⭐ ' : ''}${p.strength}`), stat('Idade', p.age), stat('Posição', POSITION_NAME[p.position]), stat('Valor', money(p.marketValue))),
    rel ? h('p', null, h('span', { class: 'label' }, 'Na divisão '), `${TIER_LABEL[rel.tier]} (média da ${divName}: ${rel.mean.toFixed(1).replace('.', ',')})`) : null,
    h('p', null, `${flagOf(p.nationality)} ${p.nationality} · ${club ? club.name : 'Sem clube (livre)'}${loaned ? ' · emprestado' : ''}`),
    h('p', null, h('span', { class: 'label' }, 'Situação '), statusOf(p)),
    h('p', null, h('span', { class: 'label' }, 'Personalidade '), `${PERSONALITY_LABEL[pers]} · ${mood.happy ? '🙂' : '😠'} ${mood.reason}`),
    h('p', null, h('span', { class: 'label' }, 'Contrato '), `até ${p.contract.endSeason} · salário ${money(seasonSalary(p.salary))} por temporada (${money(p.salary)} por rodada)`),
    h('h4', { class: 'season-sub' }, 'Estatísticas'),
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, ['', 'J', 'Gols', 'Amarelos', 'Vermelhos', 'Lesões'].map((t) => h('th', null, t)))), h('tbody', null, [['Temporada', season], ['Carreira', career]].map(([label, l]) => { const x = l as typeof EMPTY_LINE; return h('tr', null, h('td', null, label as string), h('td', null, x.apps), h('td', null, x.goals), h('td', null, x.yellows), h('td', null, x.reds), h('td', null, x.injuries)); })))),
    h('p', { class: 'muted small' }, 'Assistências não aparecem: o motor de partida não registra o passe do gol (ver docs/ENGINE.md).'),
  ];
  const actions: Child[] = [];
  if (!live && c.userClubId && mine && !loaned) {
    if (talk && talk.status === 'OPEN') {
      const askSeason = seasonSalary(talk.askSalary);
      body.push(
        h('h4', { class: 'season-sub' }, 'Renovação'),
        h('p', { class: 'notice' }, `${talk.message} Pede ${money(askSeason)} por temporada, ${talk.askYears} temporada(s). Tentativa ${talk.attempts} de 3.`),
        h('div', { class: 'row gap wrap' }, h('label', { class: 'field grow' }, h('span', null, 'Salário por temporada (R$)'), h('input', { type: 'number', min: '0', step: '10000', value: draft.salary || String(askSeason), onInput: (e: Event) => (draft.salary = (e.target as HTMLInputElement).value) })), h('label', { class: 'field grow' }, h('span', null, 'Temporadas'), h('input', { type: 'number', min: '1', max: '5', value: draft.years || String(talk.askYears), onInput: (e: Event) => (draft.years = (e.target as HTMLInputElement).value) }))),
      );
      actions.push(btn('PROPOR RENOVAÇÃO', () => ctrl.proposeRenewal(id, perRoundFromSeason(Number(draft.salary || askSeason)), Number(draft.years || talk.askYears)), { kind: 'primary' }));
    } else if (talk && talk.status === 'BROKEN') {
      body.push(h('p', { class: 'notice' }, 'Sem acordo de renovação: sai ao fim do contrato.'));
    } else actions.push(btn('RENOVAR CONTRATO', () => ctrl.startRenewal(id)));
    if (open) {
      body.push(h('label', { class: 'field' }, h('span', null, `Leilão: lance mínimo (≥ ${money(minAuctionPrice(p))})`), h('input', { type: 'number', min: String(minAuctionPrice(p)), step: '5000', value: draft.auction || String(minAuctionPrice(p)), onInput: (e: Event) => (draft.auction = (e.target as HTMLInputElement).value) })));
      actions.push(btn('VENDER EM LEILÃO', () => ctrl.openAuction(id, Number(draft.auction || minAuctionPrice(p)))), btn('EMPRESTAR', () => ctrl.loanOut(id)));
    }
  }
  if (!live && c.userClubId && !mine) {
    const demand = salaryDemand(c.seed, p, c.world);
    actions.push(btn(wish ? 'TIRAR DOS DESEJOS' : '★ LISTA DE DESEJOS', () => ctrl.toggleWish(id)));
    if (!club) actions.push(btn(`CONTRATAR LIVRE (${money(seasonSalary(demand))}/temp.)`, () => ctrl.signFreeAgent(id), { kind: 'primary' }));
    else if (open) {
      const asking = askingPrice(c.world, c.seed, id, c.world.clubs[c.userClubId]);
      body.push(
        h('h4', { class: 'season-sub' }, 'Negociação'),
        h('p', null, `Preço pedido pelo ${club.name}: `, h('b', null, money(asking)), `. Salário pedido: ${money(seasonSalary(demand))} por temporada. A compra é uma OFERTA: o clube aceita, recusa ou faz contraproposta.`),
        neg ? h('p', { class: 'notice' }, neg.status === 'COUNTER' ? `Contraproposta do clube: ${money(neg.counter ?? 0)}. ${neg.message}` : neg.message) : null,
        h('label', { class: 'field' }, h('span', null, 'Sua oferta (R$)'), h('input', { type: 'number', min: '0', step: '5000', value: draft.offer || String(Math.round(asking * 0.8 / 5000) * 5000), onInput: (e: Event) => (draft.offer = (e.target as HTMLInputElement).value) })),
      );
      actions.push(btn('FAZER OFERTA', () => ctrl.makeOffer(id, Number(draft.offer || Math.round(asking * 0.8 / 5000) * 5000)), { kind: 'primary' }));
      if (neg?.status === 'COUNTER') actions.push(btn('ACEITAR CONTRAPROPOSTA', () => ctrl.acceptCounter(neg.id), { kind: 'good' }));
      actions.push(btn(`PEDIR EMPRESTADO (${money(loanFee(p))})`, () => ctrl.requestLoan(id)));
    } else body.push(h('p', { class: 'muted' }, 'Janela de transferências fechada.'));
  }
  if (!live && c.userClubId) actions.push(btn('PROCURAR JOGADORES', () => { ctrl.openPlayer(null); ctrl.go('MARKET'); }));
  return modalBox(p.name, `${club ? club.name : 'Livre'} · ${POSITION_NAME[p.position]}`, body, [...actions, btn('VOLTAR', () => ctrl.openPlayer(null))], 'blue', 'modal-wide');
}
