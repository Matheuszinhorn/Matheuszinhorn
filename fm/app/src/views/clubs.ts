import { getClubView, listClubs, type ClubView } from '../../../game/queries.ts';
import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { POSITION_LABEL, money, num, shortName, strengthLabel } from '../format.ts';
import { btn, card, crest, stat } from './common.ts';

// CLUBES: consulta somente leitura (seção 24). Abrir esta tela durante a rodada pausa a sessão; sair retoma.

function detail(ctrl: GameController, v: ClubView): HTMLElement {
  const balance = v.finance.balance.kind === 'EXACT' ? money(v.finance.balance.amount) : { LOW: 'Baixo', MEDIUM: 'Médio', HIGH: 'Alto' }[v.finance.balance.band];
  return h(
    'div',
    { class: 'page' },
    btn('← VOLTAR À LISTA', () => ctrl.openClub(null)),
    h('div', { class: 'team-head' }, crest(v, 'lg'), h('div', null, h('h2', null, v.name), h('p', { class: 'muted' }, `${v.division?.name ?? ''} · ${v.city}`))),
    h('div', { class: 'stats' }, stat('Força', strengthLabel(v.strength)), stat('Reputação', v.reputation), stat('Posição', v.standing ? `${v.standing.position}º de ${v.standing.clubsInDivision}` : '—'), stat('Pontos', v.standing?.points ?? 0)),
    v.live ? h('p', { class: 'notice' }, `Jogando agora: ${v.live.minute}' · ${v.live.score.for} × ${v.live.score.against} contra ${v.live.opponentName}`) : null,
    h('div', { class: 'two' }, card('Estádio e finanças', h('p', null, `${v.stadium.name} · ${num(v.stadium.capacity)} lugares`), h('p', { class: 'muted' }, `Folha salarial: ${money(v.finance.payrollPerRound)} por rodada · público estimado ${num(v.finance.estimatedAttendance)}`), h('p', null, `Caixa: ${balance}`)), card(v.lineup ? `Time (${v.lineup.formationLabel})` : 'Time', v.lineup ? h('ul', { class: 'plain' }, v.lineup.starters.map((p) => h('li', null, h('span', { class: `pos pos-${p.sector}` }, POSITION_LABEL[p.sector]), ` ${shortName(p.name)} `, h('b', null, p.strength)))) : h('p', { class: 'muted' }, 'Sem 11 jogadores disponíveis.'))),
    card('Últimos resultados', v.form.length ? h('ul', { class: 'results' }, v.form.map((f) => h('li', null, h('span', { class: `wdl wdl-${f.outcome}` }, f.outcome === 'W' ? 'V' : f.outcome === 'D' ? 'E' : 'D'), h('span', { class: 'r' }, `R${f.round} ${f.home ? 'x' : '@'} ${f.opponentName}`), h('b', null, `${f.goalsFor} – ${f.goalsAgainst}`)))) : h('p', { class: 'muted' }, 'Ainda sem jogos.')),
    card(`Elenco (${v.squad.length})`, h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['', 'Jogador', 'Idade', 'For.'].map((t) => h('th', null, t)))), h('tbody', null, v.squad.map((p) => h('tr', { class: p.injuredRounds > 0 || p.suspendedRounds > 0 ? 'unavailable' : '' }, h('td', null, h('span', { class: `pos pos-${p.position}` }, POSITION_LABEL[p.position])), h('td', null, p.name), h('td', null, p.age), h('td', null, h('b', null, p.strength))))))) ),
  );
}

export function renderClubs(ctrl: GameController): HTMLElement {
  const ctx = ctrl.ctx!;
  const id = ctrl.state.clubId;
  if (id) return detail(ctrl, getClubView(ctx, id));
  const all = listClubs(ctx);
  const groups = [1, 2, 3, 4].map((level) => all.filter((c) => c.divisionLevel === level));
  return h(
    'div',
    { class: 'page' },
    ctrl.state.phase === 'LIVE' ? h('p', { class: 'notice' }, 'A rodada está pausada enquanto você consulta os clubes.') : null,
    groups.map((g) =>
      g.length
        ? card(g[0].divisionName, h('ul', { class: 'clublist' }, g.map((c) => { const club = ctx.world.clubs[c.id]; return h('li', null, h('button', { type: 'button', class: `clubrow${c.isControlled ? ' me' : ''}`, onClick: () => ctrl.openClub(c.id) }, crest(club, 'sm'), h('span', { class: 'cname' }, c.name), h('span', { class: 'cstr' }, strengthLabel(c.strength)))); })))
        : null,
    ),
  );
}
