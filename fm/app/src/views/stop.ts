import type { MatchState, Side } from '../../../engine/index.ts';
import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { shortName } from '../format.ts';
import { btn, modalBox, stat } from './common.ts';

// Paradas obrigatórias da partida do treinador: INTERVALO (resumo + ações) e lances importantes (pênalti, lesão,
// expulsão) que o engine não transformou em decisão do jogador. CONTINUAR libera a rodada.

export function renderStop(ctrl: GameController): HTMLElement | null {
  const snap = ctrl.state.snapshot;
  const stop = snap.stop;
  if (!stop || snap.status === 'AWAITING_DECISION' || !snap.round) return null;
  const m = snap.round.matches.find((x) => x.matchId === stop.matchId);
  if (!m) return null;
  const uid = ctrl.state.career?.userClubId ?? null;
  const mine: Side = m.home.clubId === uid ? 'home' : 'away';
  if (stop.kind === 'HALFTIME') return halftime(ctrl, m, mine);
  const e = stop.event;
  const who = e.side && e.playerId && m[e.side].players[e.playerId] ? shortName(m[e.side].players[e.playerId].name) : 'Jogador';
  const team = e.side ? m[e.side].name : '';
  const ours = e.side === mine;
  let title = 'LANCE';
  let text = '';
  if (e.type === 'PENALTY_AWARDED') {
    title = ours ? 'PÊNALTI A FAVOR' : 'PÊNALTI CONTRA';
    text = `Pênalti marcado para o ${team}. A cobrança sai em seguida.`;
  } else if (e.type === 'INJURY') {
    title = ours ? 'LESÃO NO SEU TIME' : 'LESÃO NO ADVERSÁRIO';
    text = `${who} (${team}) se machucou.${ours ? '' : ' O adversário faz a troca.'}`;
  } else if (e.type === 'RED_CARD') {
    title = ours ? 'EXPULSÃO NO SEU TIME' : 'EXPULSÃO NO ADVERSÁRIO';
    text = `${who} (${team}) foi expulso${e.detail === 'second_yellow' ? ' (segundo amarelo)' : ''}.`;
  }
  return modalBox(title, `${m.home.name} ${m.score.home} × ${m.score.away} ${m.away.name}`, [h('p', null, text)], [btn('CONTINUAR', () => ctrl.continueStop(), { kind: 'primary' }), btn('MEU TIME', () => ctrl.openTeamAdjustment())], ours ? 'red' : 'yellow');
}

function halftime(ctrl: GameController, m: MatchState, mine: Side): HTMLElement {
  const other: Side = mine === 'home' ? 'away' : 'home';
  const st = m.stats;
  const goals = m.events.filter((e) => e.type === 'GOAL' || e.type === 'PENALTY_GOAL').map((e) => `${e.clock.minute}' ${e.side && e.playerId ? shortName(m[e.side].players[e.playerId]?.name ?? '') : ''} (${e.side ? m[e.side].name : ''})`);
  const ahead = m.score[mine] - m.score[other];
  const read = ahead > 0 ? 'Vencendo no intervalo. Segurar ou buscar mais?' : ahead < 0 ? 'Atrás no placar. Hora de mexer?' : 'Empate no intervalo.';
  return modalBox(
    'INTERVALO',
    `${m.home.name} ${m.score.home} × ${m.score.away} ${m.away.name}`,
    [
      h('p', null, read),
      h('div', { class: 'stats' }, stat('Chances', `${st[mine].chances} × ${st[other].chances}`), stat('Posse', `${Math.round(st[mine].possession)}%`), stat('Defesas', `${st[mine].saves} × ${st[other].saves}`), stat('Cartões', `${st[mine].yellowCards + st[mine].redCards} × ${st[other].yellowCards + st[other].redCards}`)),
      goals.length ? h('ul', { class: 'plain small' }, goals.map((g) => h('li', null, `⚽ ${g}`))) : h('p', { class: 'muted small' }, 'Sem gols no primeiro tempo.'),
      h('p', { class: 'muted small' }, 'MEU TIME abre o ajuste (substituições, estilo, posições). O segundo tempo começa no CONTINUAR.'),
    ],
    [btn('CONTINUAR', () => ctrl.continueStop(), { kind: 'primary' }), btn('MEU TIME', () => ctrl.openTeamAdjustment())],
  );
}
