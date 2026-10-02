import { payroll } from '../../../engine/index.ts';
import { createCareer, divisionStandings, type CareerState } from '../../../game/career.ts';
import { objectiveFor } from '../../../game/manager/board.ts';
import { flagOf } from '../../../game/manager/people.ts';
import { clubStrength } from '../../../game/queries-lite.ts';
import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { POSITION_LABEL, money, num } from '../format.ts';
import { btn, clubStripe, crest, modalBox, stat, table } from './common.ts';

// Pop-up de PROPOSTA (inicial ou de emprego): ACEITAR / RECUSAR / ANALISAR CLUBE.
// A análise mostra elenco, finanças, estádio, objetivo da diretoria e a divisão; VOLTAR devolve à proposta sem perdê-la.

let cache: { seed: string; career: CareerState } | null = null;

/** Mundo de referência da proposta: a carreira em andamento ou, no início, o mundo da seed das propostas. */
function worldCareer(ctrl: GameController): CareerState | null {
  if (ctrl.state.career) return ctrl.state.career;
  const offers = ctrl.state.offers;
  if (!offers) return null;
  if (!cache || cache.seed !== offers.seed) cache = { seed: offers.seed, career: createCareer({ seed: offers.seed, coachName: 'Proposta', clubId: offers.clubIds[0] }) };
  return cache.career;
}

export function renderProposal(ctrl: GameController, coachName: string): HTMLElement | null {
  const p = ctrl.state.proposal;
  if (!p) return null;
  const c = worldCareer(ctrl);
  if (!c) return null;
  const club = c.world.clubs[p.clubId];
  if (!club) return null;
  const div = c.world.divisions.find((d) => d.id === club.divisionId)!;
  const objective = objectiveFor(c, club.id);
  const strength = clubStrength(c.world.players, club);
  const job = p.jobId ? c.manager?.jobs.offers.find((o) => o.id === p.jobId) : null;
  const accept = () => (p.jobId ? ctrl.acceptJob(p.jobId) : ctrl.startCareer(coachName, club.id));
  const refuse = () => (p.jobId ? ctrl.refuseJob(p.jobId) : ctrl.refuseOffer(club.id));
  const head = h('div', { class: 'prop-head' }, crest(club, 'lg'), h('div', null, h('strong', { class: 'prop-name' }, club.name), h('span', { class: 'muted' }, `${flagOf(club.country)} ${div.name} · ${club.city}`), clubStripe(club)));

  if (!p.analyze) {
    return modalBox(
      'PROPOSTA DE TRABALHO',
      job ? job.reason : 'A diretoria quer você como técnico.',
      [
        head,
        h('div', { class: 'stats' }, stat('Força', strength), stat('Caixa', money(club.money)), stat('Estádio', `${num(club.stadium.capacity)} lug.`), stat('Reputação', club.reputation)),
        h('p', { class: 'objective' }, h('span', { class: 'label' }, 'Objetivo da diretoria'), h('b', null, objective.label)),
      ],
      [btn('ACEITAR', accept, { kind: 'primary' }), btn('ANALISAR CLUBE', () => ctrl.analyzeProposal(true)), btn('RECUSAR', refuse, { kind: 'danger' })],
    );
  }

  const squad = club.squad.map((id) => c.world.players[id]).filter(Boolean).sort((a, b) => ['GK', 'DEF', 'MID', 'ATT'].indexOf(a.position) - ['GK', 'DEF', 'MID', 'ATT'].indexOf(b.position) || b.strength - a.strength);
  const table_ = divisionStandings(c, div.id);
  const started = c.results.length > 0;
  const pay = payroll(club, c.world.players);
  return modalBox(
    'ANÁLISE DO CLUBE',
    `${club.name} · ${div.name}`,
    [
      head,
      h('h4', { class: 'season-sub' }, 'Diretoria'),
      h('p', null, `Objetivo: `, h('b', null, objective.label), '.'),
      h('h4', { class: 'season-sub' }, 'Finanças'),
      h('div', { class: 'stats' }, stat('Caixa', money(club.money)), stat('Folha/rodada', money(pay)), stat('Reputação', club.reputation)),
      h('h4', { class: 'season-sub' }, 'Estádio'),
      h('p', null, `${club.stadium.name} · ${num(club.stadium.capacity)} lugares`),
      h('h4', { class: 'season-sub' }, `Elenco (${squad.length}) · força ${strength}`),
      table(['', 'Jogador', 'Idade', 'For.'], squad.map((pl) => ({ cells: [h('span', { class: `pos pos-${pl.position}` }, POSITION_LABEL[pl.position]), `${flagOf(pl.nationality)} ${pl.name}`, pl.age, h('b', null, pl.strength)] }))),
      h('h4', { class: 'season-sub' }, `${div.name}${started ? '' : ' (temporada não começou)'}`),
      table(['#', 'Clube', 'Pts', 'J', 'Força'], table_.map((r) => ({ cls: r.clubId === club.id ? 'me' : '', cells: [r.position, r.clubName, r.points, r.played, clubStrength(c.world.players, c.world.clubs[r.clubId])] }))),
    ],
    [btn('VOLTAR À PROPOSTA', () => ctrl.analyzeProposal(false), { kind: 'primary' })],
  );
}
