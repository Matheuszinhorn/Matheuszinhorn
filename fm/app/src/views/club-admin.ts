import { payroll } from '../../../engine/index.ts';
import { isSeasonOver, userClub } from '../../../game/career.ts';
import { financeView } from '../../../game/manager/actions.ts';
import { LOAN_TERMS, STATUS_ICON, STATUS_LABEL, goalLabel, interestRate, sponsorSector, type FinanceStatus } from '../../../game/manager/finance.ts';
import { MAX_WORKS, UPGRADES } from '../../../game/manager/stadium.ts';
import { ROUNDS } from '../../../game/manager/state.ts';
import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { money, num, signedMoney } from '../format.ts';
import { badge, btn, card, empty, stat } from './common.ts';

// ESTÁDIO e FINANÇAS do clube do treinador.

export function renderStadium(ctrl: GameController): HTMLElement {
  const c = ctrl.state.career!;
  const club = userClub(c);
  const m = c.manager!;
  const nowAbs = (isSeasonOver(c) ? c.season + 1 : c.season) * 100 + (isSeasonOver(c) ? 0 : c.roundNumber - 1);
  return h(
    'div',
    { class: 'page' },
    card(
      club.stadium.name,
      h('div', { class: 'stats' }, stat('Lugares', num(club.stadium.capacity)), stat('Manutenção/rodada', money(club.stadium.capacity)), stat('Obras', `${m.stadium.works.length}/${MAX_WORKS}`), stat('Caixa', money(club.money))),
      m.stadium.works.length ? h('ul', { class: 'deals' }, m.stadium.works.map((w) => h('li', null, h('div', { class: 'deal-main' }, h('b', null, `${UPGRADES.find((u) => u.id === w.upgrade)?.label} → nível ${w.level}`), h('span', { class: 'muted' }, `Fica pronta em ${Math.max(1, w.doneAtRound - nowAbs)} rodada(s)`))))) : h('p', { class: 'muted' }, 'Nenhuma obra em andamento.'),
      h('p', { class: 'muted small' }, 'Obras não mudam o resultado das partidas: aumentam lugares, público (ocupação) ou receita por torcedor. Lugares a mais também custam manutenção.'),
    ),
    card(
      'Obras disponíveis',
      h(
        'ul',
        { class: 'upgrades' },
        UPGRADES.map((u) => {
          const level = m.stadium.levels[u.id] ?? 0;
          const pending = m.stadium.works.filter((w) => w.upgrade === u.id).length;
          const maxed = level + pending >= u.maxLevel;
          return h(
            'li',
            { class: 'upgrade' },
            h('div', { class: 'deal-main' }, h('b', null, `${u.label} `, h('span', { class: 'muted' }, `nível ${level}/${u.maxLevel}`)), h('span', { class: 'small' }, u.description), h('span', { class: 'muted small' }, `Custo ${money(u.cost)} · ${u.rounds} rodadas de obra`)),
            maxed ? badge(pending ? 'EM OBRA' : 'MÁXIMO', pending ? 'yellow' : 'green') : btn('CONSTRUIR', () => ctrl.startWork(u.id), { kind: 'primary', disabled: ctrl.state.phase === 'LIVE' }),
          );
        }),
      ),
    ),
  );
}

const loanForm = { amount: '', rounds: 19 };

/** Simulação antes de confirmar: valor recebido, juros, prazo, total, parcela e o peso dela na rodada. */
function loanQuote(amount: number, rounds: number, status: FinanceStatus, payrollPerRound: number): HTMLElement {
  const rate = interestRate(rounds, status);
  const total = Math.round(amount * (1 + rate));
  const installment = Math.ceil(total / rounds);
  return h(
    'div',
    { class: 'loan-quote' },
    h('div', { class: 'stats' }, stat('Valor recebido', money(amount)), stat('Juros', `${Math.round(rate * 100)}% · ${money(total - amount)}`), stat('Prazo', `${rounds} rodadas`), stat('Total a pagar', money(total)), stat('Parcela por rodada', money(installment))),
    h('p', { class: 'muted small' }, `Impacto: a parcela soma ${money(installment)} por rodada às despesas (hoje a folha custa ${money(payrollPerRound)} por rodada). Dívida alta piora a situação financeira, o crédito futuro e o patrocínio. Dinheiro do jogo: não existe compra com dinheiro real.`),
  );
}

export function renderFinance(ctrl: GameController): HTMLElement {
  const c = ctrl.state.career!;
  const club = userClub(c);
  const m = c.manager!;
  const v = financeView(c);
  const led = c.userLedger;
  const sum = (f: (e: (typeof led)[number]) => number) => led.reduce((a, e) => a + f(e), 0);
  const season = isSeasonOver(c) ? c.season : c.season;
  const extras = m.finance.ledger.filter((e) => e.season === season);
  const extraSum = extras.reduce((a, e) => a + e.amount, 0);
  const sp = m.finance.sponsor;
  const amount = Number(loanForm.amount) || Math.min(v.limit, 100_000);
  return h(
    'div',
    { class: 'page' },
    card(
      'Situação',
      h('div', { class: 'fin-status' }, h('span', { class: 'fin-ico' }, STATUS_ICON[v.status]), h('b', null, STATUS_LABEL[v.status])),
      h('div', { class: 'stats' }, stat('Caixa', money(club.money), club.money >= 0 ? 'default' : 'bad'), stat('Folha salarial/temporada', money(payroll(club, c.world.players) * ROUNDS)), stat('Custo da folha nesta rodada', money(payroll(club, c.world.players))), stat('Dívida bancária', money(v.debt), v.debt > 0 ? 'bad' : 'default'), stat('Limite de crédito', money(v.limit))),
    ),
    card(
      'Temporada',
      h('div', { class: 'stats' }, stat('Bilheteria', signedMoney(sum((e) => e.ticketRevenue))), stat('Cota de TV', signedMoney(sum((e) => e.tvRevenue))), stat('Salários', signedMoney(-sum((e) => e.salaries))), stat('Manutenção', signedMoney(-sum((e) => e.upkeep))), stat('Outros', signedMoney(extraSum), extraSum >= 0 ? 'good' : 'bad'), stat('Resultado', signedMoney(sum((e) => e.net) + extraSum), sum((e) => e.net) + extraSum >= 0 ? 'good' : 'bad')),
      extras.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, ['Rod.', 'Lançamento', 'Valor'].map((t, i) => h('th', { class: i === 2 ? 'n' : '' }, t)))), h('tbody', null, [...extras].reverse().slice(0, 30).map((e) => h('tr', null, h('td', null, e.round), h('td', { class: 'wrap-cell' }, e.label), h('td', { class: `n ${e.amount >= 0 ? 'good' : 'bad'}` }, signedMoney(e.amount))))))) : h('p', { class: 'muted small' }, 'Sem lançamentos extras (patrocínio, obras, transferências, empréstimos) nesta temporada.'),
    ),
    card(
      'Patrocínio',
      sp && sp.season >= c.season
        ? h('div', null, h('p', null, h('b', null, sp.name), ` (${sponsorSector(sp.name)}) · ${money(sp.amount)} na temporada ${sp.season} (pagos ${money(sp.paid)})`), h('p', { class: 'muted' }, `Meta: ${goalLabel(sp.goal)}${sp.bonus ? ` · bônus ${money(sp.bonus)}` : ''}`))
        : m.finance.sponsorOffers.length
          ? h('ul', { class: 'deals' }, m.finance.sponsorOffers.map((o) => h('li', null, h('div', { class: 'deal-main' }, h('b', null, `${o.name} · ${sponsorSector(o.name)}`), h('span', { class: 'muted' }, `${money(o.amount)} · duração: 1 temporada · pagos rodada a rodada (${money(Math.floor(o.amount / ROUNDS))})`), h('span', { class: 'small' }, `Meta: ${goalLabel(o.goal)}${o.bonus ? ` · bônus de ${money(o.bonus)} se cumprir` : ''}`)), btn('ASSINAR', () => ctrl.chooseSponsor(o.id), { kind: 'primary', disabled: ctrl.state.phase === 'LIVE' }))))
          : empty('Sem propostas de patrocínio agora. Novas chegam na virada da temporada.'),
    ),
    card(
      'Empréstimo bancário',
      v.status === 'CRITICO' ? h('p', { class: 'notice' }, 'Com caixa negativo o banco não empresta.') : null,
      h('div', { class: 'row gap wrap' }, h('label', { class: 'field grow' }, h('span', null, `Valor (até ${money(v.limit)})`), h('input', { type: 'number', min: '50000', step: '10000', value: loanForm.amount || String(Math.min(v.limit, 100_000)), onInput: (e: Event) => (loanForm.amount = (e.target as HTMLInputElement).value) })), h('label', { class: 'field grow' }, h('span', null, 'Prazo'), h('select', { onChange: (e: Event) => { loanForm.rounds = Number((e.target as HTMLSelectElement).value); ctrl.notifyRender(); } }, LOAN_TERMS.map((t) => h('option', { value: String(t), selected: loanForm.rounds === t }, `${t} rodadas · juros ${Math.round(interestRate(t, v.status) * 100)}%`))))),
      loanQuote(amount, loanForm.rounds, v.status, payroll(club, c.world.players)),
      btn('PEDIR EMPRÉSTIMO', () => ctrl.takeBankLoan(Number(loanForm.amount || Math.min(v.limit, 100_000)), loanForm.rounds), { kind: 'primary', disabled: v.limit < 50_000 || ctrl.state.phase === 'LIVE' }),
      m.finance.loans.length ? h('ul', { class: 'deals' }, m.finance.loans.map((l) => h('li', null, h('div', { class: 'deal-main' }, h('b', null, `${money(l.principal)} em ${l.rounds}x`), h('span', { class: 'muted' }, `Parcela ${money(l.installment)} · falta ${money(l.remaining)}`)), btn('QUITAR', () => ctrl.payOffBankLoan(l.id), { disabled: ctrl.state.phase === 'LIVE' })))) : null,
    ),
  );
}
