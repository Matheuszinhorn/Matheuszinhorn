import type { Clock, MatchEvent, MatchState, Side } from '../../../engine/index.ts';
import { ROUNDS_PER_SEASON, divisionStandings, resolveUserLineup, userClub } from '../../../game/career.ts';
import { getClubView } from '../../../game/queries.ts';
import { SPEEDS, SPEED_ORDER } from '../../../game/session.ts';
import type { GameController } from '../controller.ts';
import { h, type Child } from '../dom.ts';
import { BEHAVIOR_LABEL, POSITION_LABEL, STYLE_LABEL, money, num, plural, shortName, signedMoney, strengthLabel } from '../format.ts';
import { badge, btn, card, crest, empty, segmented, stat } from './common.ts';

// Tela PARTIDA: antes da rodada (PRE), com a rodada acontecendo (LIVE) e o resultado (POST).
// Só apresenta o que o engine e a sessão entregam; nenhuma regra de futebol mora aqui.

/** Minuto que a partida está jogando agora (o relógio do engine aponta para o PRÓXIMO minuto). */
export function minuteLabel(m: MatchState): string {
  if (m.status === 'FINISHED') return 'FIM';
  const c: Clock = m.clock;
  if (c.added > 1) return `${c.minute}+${c.added - 1}'`;
  if (c.added === 1) return `${c.minute}'`;
  if (c.minute === 1 && c.half === 1) return "0'";
  if (c.half === 2 && c.minute === 46) return 'INT';
  return `${c.minute - 1}'`;
}

const eventClock = (c: Clock) => (c.added > 0 ? `${c.minute}+${c.added}'` : `${c.minute}'`);

interface EventLine {
  kind: 'goal' | 'yellow' | 'red' | 'injury' | 'sub' | 'pen' | 'save' | 'wood' | 'info';
  text: string;
  side: Side | null;
  key: boolean;
}

/** Texto de cada evento do engine (o engine devolve eventos estruturados; quem escreve a frase é a interface). */
export function describeEvent(m: MatchState, e: MatchEvent): EventLine | null {
  const name = (side: Side | null, id: string | null) => (side && id && m[side].players[id] ? shortName(m[side].players[id].name) : 'Jogador');
  const team = e.side ? m[e.side].name : '';
  switch (e.type) {
    case 'KICKOFF':
      return { kind: 'info', text: 'Bola rolando!', side: null, key: false };
    case 'HALF_TIME':
      return { kind: 'info', text: `Intervalo · ${m.score.home} × ${m.score.away}`, side: null, key: false };
    case 'FULL_TIME':
      return { kind: 'info', text: `Fim de jogo · ${m.score.home} × ${m.score.away}`, side: null, key: true };
    case 'GOAL':
      return { kind: 'goal', text: `GOL! ${name(e.side, e.playerId)} (${team}) · ${e.score.home} × ${e.score.away}`, side: e.side, key: true };
    case 'PENALTY_GOAL':
      return { kind: 'goal', text: `GOL de pênalti! ${name(e.side, e.playerId)} (${team}) · ${e.score.home} × ${e.score.away}`, side: e.side, key: true };
    case 'PENALTY_AWARDED':
      return { kind: 'pen', text: `Pênalti marcado para o ${team}`, side: e.side, key: true };
    case 'PENALTY_MISSED':
      return { kind: 'pen', text: e.detail === 'saved' ? 'Pênalti defendido pelo goleiro!' : 'Pênalti para fora!', side: e.side, key: true };
    case 'YELLOW_CARD':
      return { kind: 'yellow', text: `Cartão amarelo · ${name(e.side, e.playerId)} (${team})`, side: e.side, key: false };
    case 'RED_CARD':
      return { kind: 'red', text: `EXPULSÃO · ${name(e.side, e.playerId)} (${team})${e.detail === 'second_yellow' ? ' · segundo amarelo' : ''}`, side: e.side, key: true };
    case 'INJURY':
      return { kind: 'injury', text: `Lesão · ${name(e.side, e.playerId)} (${team})`, side: e.side, key: true };
    case 'SUBSTITUTION':
      return { kind: 'sub', text: `Substituição (${team}) · sai ${name(e.side, e.playerId)}, entra ${name(e.side, e.relatedPlayerId)}`, side: e.side, key: false };
    case 'SAVE':
      return { kind: 'save', text: `Defesa de ${name(e.side, e.playerId)} (${team})`, side: e.side, key: false };
    case 'WOODWORK':
      return { kind: 'wood', text: `Bola na trave! (${team})`, side: e.side, key: false };
    default:
      return null; // STOPPAGE: só organiza o relógio
  }
}

const divOf = (m: MatchState) => Number(/-D(\d)-/.exec(m.matchId)?.[1] ?? 0);

/** Os jogos da rodada, agrupados por divisão, com placar e minuto ao vivo. */
function roundBoard(ctrl: GameController, mine: string | null): HTMLElement {
  const round = ctrl.state.snapshot.round;
  const career = ctrl.state.career!;
  if (!round) {
    const rows: Child[] = [];
    for (const d of career.world.divisions) {
      rows.push(h('h4', { class: 'board-div' }, d.name));
      (career.schedule[d.id][career.roundNumber - 1] ?? []).forEach((f) =>
        rows.push(h('div', { class: `mrow${f.home === career.userClubId || f.away === career.userClubId ? ' me' : ''}` }, h('span', { class: 'mmin' }, '—'), h('span', { class: 'mteam r' }, career.world.clubs[f.home].name), h('span', { class: 'mscore' }, 'x'), h('span', { class: 'mteam' }, career.world.clubs[f.away].name))),
      );
    }
    return h('div', { class: 'board' }, rows);
  }
  const rows: Child[] = [];
  for (const level of [1, 2, 3, 4]) {
    const ms = round.matches.filter((m) => divOf(m) === level);
    if (ms.length === 0) continue;
    const name = career.world.divisions.find((d) => d.level === level)?.name ?? `Divisão ${level}`;
    rows.push(h('h4', { class: 'board-div' }, name));
    for (const m of ms) {
      const live = m.status !== 'FINISHED';
      rows.push(
        h(
          'div',
          { class: `mrow${m.matchId === mine ? ' me' : ''}${live ? '' : ' done'}` },
          h('span', { class: `mmin${live ? ' live' : ''}` }, minuteLabel(m)),
          h('span', { class: 'mteam r' }, m.home.name),
          h('span', { class: 'mscore' }, `${m.score.home} – ${m.score.away}`),
          h('span', { class: 'mteam' }, m.away.name),
        ),
      );
    }
  }
  return h('div', { class: 'board' }, rows);
}

function scoreboard(m: MatchState, userClubId: string, phaseLabel: string, tone: 'live' | 'paused' | 'wait' | 'end'): HTMLElement {
  const side = (s: Side) => h('div', { class: `sb-team${m[s].clubId === userClubId ? ' me' : ''}` }, h('span', { class: 'sb-name' }, m[s].name), h('span', { class: 'sb-style' }, `${STYLE_LABEL[m[s].style]} · ${BEHAVIOR_LABEL[m[s].behavior]}`));
  return h(
    'div',
    { class: 'scoreboard' },
    side('home'),
    h('div', { class: 'sb-mid' }, h('div', { class: 'sb-score' }, `${m.score.home}`, h('span', null, '–'), `${m.score.away}`), h('div', { class: `sb-clock ${tone}` }, h('span', { class: 'dot' }), `${minuteLabel(m)} · ${phaseLabel}`)),
    side('away'),
  );
}

function eventFeed(m: MatchState): HTMLElement {
  const lines = m.events.map((e) => ({ e, line: describeEvent(m, e) })).filter((x): x is { e: MatchEvent; line: EventLine } => x.line !== null);
  if (lines.length === 0) return empty('Nenhum lance ainda.');
  return h('ol', { class: 'feed', 'data-keep': 'feed' }, lines.reverse().map(({ e, line }) => h('li', { class: `ev ev-${line.kind}${line.key ? ' key' : ''}` }, h('span', { class: 'ev-min' }, eventClock(e.clock)), h('span', { class: 'ev-ico' }), h('span', { class: 'ev-txt' }, line.text))));
}

function lineupBlock(m: MatchState, side: Side): HTMLElement {
  const t = m[side];
  const bySector = ['GK', 'DEF', 'MID', 'ATT'] as const;
  return h(
    'div',
    { class: 'lu' },
    h('h4', null, t.name),
    bySector.map((sec) => h('div', { class: 'lu-row' }, h('span', { class: 'pos' }, POSITION_LABEL[sec]), t.onField.filter((s) => s.sector === sec).map((s) => h('span', { class: 'lu-p' }, shortName(t.players[s.playerId].name))))),
    t.bench.length ? h('p', { class: 'muted small' }, `Banco: ${t.bench.map((id) => shortName(t.players[id].name)).join(', ')}`) : null,
  );
}

// ---------- Antes da rodada ----------

function renderPre(ctrl: GameController): HTMLElement {
  const s = ctrl.state;
  const career = s.career!;
  const club = userClub(career);
  const ctx = ctrl.ctx!;
  const view = getClubView(ctx, club.id);
  const next = view.nextMatch;
  const resolved = resolveUserLineup(career);
  const out = view.squad.filter((p) => p.injuredRounds > 0 || p.suspendedRounds > 0);
  return h(
    'div',
    { class: 'page' },
    card(
      `Rodada ${career.roundNumber} de ${ROUNDS_PER_SEASON} · Temporada ${career.season}`,
      next
        ? h('div', { class: 'next' }, h('div', { class: 'next-vs' }, h('span', null, next.home ? club.name : next.opponentName), h('b', null, 'x'), h('span', null, next.home ? next.opponentName : club.name)), h('p', { class: 'muted' }, `${next.home ? 'Em casa' : 'Fora de casa'} · adversário com força ${strengthLabel(next.opponentStrength)} · sua força ${strengthLabel(view.strength)}`))
        : empty('Sem jogo do seu clube nesta rodada.'),
      resolved.adjusted ? h('p', { class: 'notice' }, 'Sua escalação foi ajustada: havia titulares indisponíveis (lesão ou suspensão).') : null,
      out.length ? h('p', { class: 'muted' }, `Indisponíveis: ${out.map((p) => `${shortName(p.name)} (${p.injuredRounds > 0 ? `lesão ${p.injuredRounds}` : `suspenso ${p.suspendedRounds}`})`).join(', ')}`) : null,
      h('div', { class: 'speedrow' }, h('span', { class: 'label' }, 'Velocidade da rodada'), segmented(SPEED_ORDER.map((id) => ({ id, label: SPEEDS[id].label })), s.speed, (id) => ctrl.setSpeed(id))),
      h('div', { class: 'row gap wrap' }, btn('JOGAR RODADA', () => ctrl.startRound(), { kind: 'primary', big: true }), btn('MEU TIME', () => ctrl.go('TEAM'))),
    ),
    card('Jogos da rodada', roundBoard(ctrl, null)),
  );
}

// ---------- Rodada em andamento ----------

function renderLive(ctrl: GameController): HTMLElement {
  const s = ctrl.state;
  const career = s.career!;
  const m = ctrl.userMatch();
  if (!m) return h('div', { class: 'page' }, card(null, empty('Preparando a rodada…')));
  const snap = s.snapshot;
  const paused = snap.status === 'PAUSED';
  const deciding = snap.status === 'AWAITING_DECISION';
  const tone = deciding ? 'wait' : paused ? 'paused' : 'live';
  const label = deciding ? 'DECISÃO' : paused ? (snap.pauses.includes('CLUBS') ? 'CLUBES' : 'PAUSADO') : 'AO VIVO';
  return h(
    'div',
    { class: 'page live' },
    h(
      'div',
      { class: 'match-card' },
      scoreboard(m, career.userClubId, label, tone),
      h('p', { class: 'muted center' }, `Público: ${num(m.attendance)}`),
      h(
        'div',
        { class: 'controls' },
        segmented(SPEED_ORDER.map((id) => ({ id, label: SPEEDS[id].label })), s.speed, (id) => ctrl.setSpeed(id)),
        h('div', { class: 'row gap wrap' }, paused ? btn('CONTINUAR', () => ctrl.resume(), { kind: 'primary' }) : btn('PAUSAR', () => ctrl.pause(), { disabled: deciding }), btn('MEU TIME', () => ctrl.openTeamAdjustment(), { disabled: deciding })),
      ),
    ),
    h('div', { class: 'two' }, card('Lances', eventFeed(m)), card('Jogos da rodada', roundBoard(ctrl, m.matchId))),
    h('details', { class: 'card' }, h('summary', null, 'Escalações em campo'), h('div', { class: 'two' }, lineupBlock(m, 'home'), lineupBlock(m, 'away'))),
  );
}

// ---------- Depois da rodada ----------

function renderPost(ctrl: GameController): HTMLElement {
  const s = ctrl.state;
  const career = s.career!;
  const m = ctrl.userMatch();
  const outcome = s.outcome;
  const club = userClub(career);
  const over = career.roundNumber > ROUNDS_PER_SEASON;
  const table = divisionStandings(career, club.divisionId);
  const pos = table.findIndex((r) => r.clubId === club.id) + 1;
  const row = table[pos - 1];
  const parts: Child[] = [];
  if (m) {
    const mySide: Side = m.home.clubId === club.id ? 'home' : 'away';
    const mine = m.score[mySide];
    const theirs = m.score[mySide === 'home' ? 'away' : 'home'];
    const result = mine > theirs ? 'VITÓRIA' : mine === theirs ? 'EMPATE' : 'DERROTA';
    const tone = mine > theirs ? 'good' : mine === theirs ? 'blue' : 'red';
    const scorers = m.events.filter((e) => e.type === 'GOAL' || e.type === 'PENALTY_GOAL');
    parts.push(
      h(
        'div',
        { class: 'match-card' },
        h('div', { class: 'result-flag' }, badge(result, tone === 'good' ? 'green' : tone === 'red' ? 'red' : 'blue')),
        scoreboard(m, club.id, 'FIM DE JOGO', 'end'),
        scorers.length ? h('ul', { class: 'scorers' }, scorers.map((e) => h('li', null, `${eventClock(e.clock)} ${shortName(m[e.side!].players[e.playerId ?? '']?.name ?? 'Jogador')} (${m[e.side!].name})`))) : h('p', { class: 'muted center' }, 'Sem gols.'),
      ),
    );
  }
  parts.push(h('div', { class: 'cta' }, btn(over ? `INICIAR TEMPORADA ${career.season + 1}` : 'PRÓXIMA RODADA', () => ctrl.nextRound(), { kind: 'primary', big: true })));
  if (over) parts.push(seasonCard(ctrl));
  if (outcome) {
    const l = outcome.ledger;
    parts.push(
      card(
        'Finanças da rodada',
        h('div', { class: 'stats' }, stat('Público', num(l.attendance)), stat('Bilheteria', signedMoney(l.ticketRevenue)), stat('Cota de TV', signedMoney(l.tvRevenue)), stat('Salários', signedMoney(-l.salaries)), stat('Manutenção', signedMoney(-l.upkeep)), stat('Resultado', signedMoney(l.net), l.net >= 0 ? 'good' : 'bad')),
        h('p', { class: 'muted' }, `Caixa atual: ${money(club.money)}`),
      ),
    );
  }
  parts.push(card('Classificação', h('p', null, `${club.name} é o ${pos}º colocado da ${career.world.divisions.find((d) => d.id === club.divisionId)?.name}, com ${row?.points ?? 0} pontos em ${row?.played ?? 0} jogos.`), h('div', { class: 'row gap wrap' }, btn('VER CLASSIFICAÇÃO', () => ctrl.go('LEAGUE')), btn('MEU TIME', () => ctrl.go('TEAM')))));
  parts.push(card('Resultados da rodada', roundBoard(ctrl, m?.matchId ?? null)));
  return h('div', { class: 'page' }, parts);
}

function seasonCard(ctrl: GameController): HTMLElement {
  const career = ctrl.state.career!;
  const r = career.history[career.history.length - 1];
  if (!r) return card(null, empty('Temporada encerrada.'));
  const name = (id: string) => career.world.clubs[id].name;
  const divName = (id: string) => career.world.divisions.find((d) => d.id === id)?.name ?? id;
  const mv = r.userMovement;
  return card(
    `FIM DE TEMPORADA ${r.season}`,
    h('p', { class: 'season-line' }, `Você terminou em ${r.userPosition}º lugar na ${divName(r.userDivisionId)}.`),
    mv ? h('p', { class: mv.kind === 'PROMOTED' ? 'good' : 'bad' }, mv.kind === 'PROMOTED' ? `ACESSO! Você sobe para a ${divName(mv.toDivisionId)}${mv.champion ? ' como campeão' : ''}.` : `REBAIXAMENTO. Você cai para a ${divName(mv.toDivisionId)}.`) : h('p', { class: 'muted' }, 'Você permanece na mesma divisão.'),
    h('p', { class: 'muted' }, `Saldo financeiro da temporada: ${signedMoney(r.userNet)}`),
    h('h4', null, 'Campeões'),
    h('ul', { class: 'plain' }, Object.entries(r.champions).map(([div, id]) => h('li', null, `${divName(div)}: ${name(id)}`))),
    h('p', { class: 'muted small' }, `${plural(r.movements.filter((x) => x.kind === 'PROMOTED').length, 'clube sobe', 'clubes sobem')} e ${plural(r.movements.filter((x) => x.kind === 'RELEGATED').length, 'desce', 'descem')} entre as divisões.`),
  );
}

export function renderMatch(ctrl: GameController): HTMLElement {
  const phase = ctrl.state.phase;
  return phase === 'PRE' ? renderPre(ctrl) : phase === 'LIVE' ? renderLive(ctrl) : renderPost(ctrl);
}
