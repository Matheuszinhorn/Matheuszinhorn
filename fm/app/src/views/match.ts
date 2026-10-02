import type { Clock, MatchEvent, MatchState, Side } from '../../../engine/index.ts';
import { ROUNDS_PER_SEASON, divisionStandings, isSeasonOver, matchIdFor, resolveUserLineup, userClub } from '../../../game/career.ts';
import { recentForm } from '../../../game/manager/board.ts';
import { roundAttendance } from '../../../game/manager/flow.ts';
import { dailyPaper } from '../../../game/manager/news.ts';
import { flagOf, refereeFor, roundDate } from '../../../game/manager/people.ts';
import { refereeProfile } from '../../../game/manager/stats.ts';
import { clubStrength } from '../../../game/queries-lite.ts';
import { getClubView } from '../../../game/queries.ts';
import { SPEEDS } from '../../../game/session.ts';
import { UI_SPEEDS, type GameController } from '../controller.ts';
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

/** Lances que aparecem à direita no quadro da rodada (gols e expulsões, os mais recentes). */
function boardEvents(m: MatchState): Child[] {
  const evs = m.events.filter((e) => e.type === 'GOAL' || e.type === 'PENALTY_GOAL' || e.type === 'RED_CARD').slice(-3);
  return evs.map((e) => {
    const p = e.side && e.playerId ? m[e.side].players[e.playerId] : null;
    const icon = e.type === 'RED_CARD' ? '🟥' : '⚽';
    return h('span', { class: `bev bev-${e.side}` }, `${icon} ${e.clock.minute}' ${p ? shortName(p.name) : ''}`);
  });
}

/** Nome no quadro: completo; nas telas estreitas, a cidade (mais curta), salvo clássico da mesma cidade. */
function boardName(ctrl: GameController, clubId: string, otherId: string, fallback: string): HTMLElement[] {
  const w = ctrl.state.career!.world.clubs;
  const club = w[clubId];
  const full = club?.name ?? fallback;
  const short = club && w[otherId] && club.city !== w[otherId].city ? club.city : full;
  return [h('span', { class: 'nm-full' }, full), h('span', { class: 'nm-short' }, short)];
}

/**
 * Quadro da rodada (estilo clássico de rodada simultânea): todas as divisões; público à esquerda, placar no centro,
 * lances à direita. Tocar no placar abre só aquele jogo (detalhe somente leitura, com VOLTAR À RODADA).
 */
function roundBoard(ctrl: GameController, mine: string | null): HTMLElement {
  const round = ctrl.state.snapshot.round;
  const career = ctrl.state.career!;
  const plan = ctrl.state.plan;
  if (!round) {
    const rows: Child[] = [];
    for (const d of [...career.world.divisions].sort((a, b) => a.level - b.level)) {
      rows.push(h('h4', { class: 'board-div' }, d.name));
      (career.schedule[d.id][Math.min(career.roundNumber, ROUNDS_PER_SEASON) - 1] ?? []).forEach((f) =>
        rows.push(h('div', { class: `mrow${f.home === career.userClubId || f.away === career.userClubId ? ' me' : ''}` }, h('span', { class: 'mpub' }, ''), h('span', { class: 'mteam r' }, boardName(ctrl, f.home, f.away, f.home)), h('span', { class: 'mscore' }, 'x'), h('span', { class: 'mteam' }, boardName(ctrl, f.away, f.home, f.away)), h('span', { class: 'mev' }))),
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
      const ref = plan?.referees[m.matchId];
      rows.push(
        h(
          'div',
          { class: `mrow${m.matchId === mine ? ' me' : ''}${live ? '' : ' done'}` },
          h('span', { class: 'mpub', title: ref ? `Árbitro: ${ref.name}` : '' }, num(m.attendance)),
          h('span', { class: 'mteam r' }, boardName(ctrl, m.home.clubId, m.away.clubId, m.home.name)),
          h('button', { type: 'button', class: 'mscore', title: 'Ver este jogo', onClick: () => ctrl.openMatch(m.matchId) }, h('span', { class: `mmin${live ? ' live' : ''}` }, minuteLabel(m)), ` ${m.score.home} – ${m.score.away}`),
          h('span', { class: 'mteam' }, boardName(ctrl, m.away.clubId, m.home.clubId, m.away.name)),
          h('span', { class: 'mev' }, boardEvents(m)),
        ),
      );
    }
  }
  return h('div', { class: 'board' }, rows);
}

/** Um jogo da rodada, só leitura (o do treinador tem os controles na própria tela PARTIDA). */
function matchDetail(ctrl: GameController, m: MatchState): HTMLElement {
  const uid = ctrl.state.career!.userClubId;
  const ref = ctrl.state.plan?.referees[m.matchId];
  const st = m.stats;
  return h(
    'div',
    { class: 'page' },
    h('div', { class: 'row gap wrap' }, btn('← VOLTAR À RODADA', () => ctrl.openMatch(null), { kind: 'primary' })),
    h('div', { class: 'match-card detail' }, scoreboard(m, uid, m.status === 'FINISHED' ? 'FIM DE JOGO' : 'AO VIVO', m.status === 'FINISHED' ? 'end' : 'live'), h('p', { class: 'muted center' }, `Público: ${num(m.attendance)}${ref ? ` · Árbitro: ${ref.name}` : ''}`)),
    card('Números', h('div', { class: 'stats' }, stat('Chances', `${st.home.chances} × ${st.away.chances}`), stat('Posse', `${Math.round(st.home.possession)}% × ${Math.round(st.away.possession)}%`), stat('Defesas', `${st.home.saves} × ${st.away.saves}`), stat('Cartões', `${st.home.yellowCards + st.home.redCards} × ${st.away.yellowCards + st.away.redCards}`))),
    h('div', { class: 'two' }, card('Lances', eventFeed(m)), card('Escalações', lineupBlock(m, 'home'), lineupBlock(m, 'away'))),
  );
}

function scoreboard(m: MatchState, userClubId: string | null, phaseLabel: string, tone: 'live' | 'paused' | 'wait' | 'end'): HTMLElement {
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

function speedPicker(ctrl: GameController): HTMLElement {
  return segmented(UI_SPEEDS.map((id) => ({ id, label: SPEEDS[id].label })), ctrl.state.speed, (id) => ctrl.setSpeed(id));
}

/** Próximo adversário: posição, forma, força, artilheiro e o árbitro escalado (com o perfil dos jogos que apitou). */
function opponentCard(ctrl: GameController): HTMLElement | null {
  const career = ctrl.state.career!;
  const uid = career.userClubId;
  const m = career.manager;
  if (!uid || !m || isSeasonOver(career)) return null;
  const club = career.world.clubs[uid];
  const fx = (career.schedule[club.divisionId][career.roundNumber - 1] ?? []).find((f) => f.home === uid || f.away === uid);
  if (!fx) return null;
  const oppId = fx.home === uid ? fx.away : fx.home;
  const opp = career.world.clubs[oppId];
  const table = divisionStandings(career, club.divisionId);
  const pos = table.findIndex((r) => r.clubId === oppId) + 1;
  const form = recentForm(career.results, oppId, 5);
  const top = opp.squad.map((id) => ({ id, g: m.stats.season[id]?.goals ?? 0 })).sort((a, b) => b.g - a.g)[0];
  const out = opp.squad.map((id) => career.world.players[id]).filter((p) => p && (p.condition.injuryRounds > 0 || p.condition.suspensionRounds > 0));
  const matchId = matchIdFor(career.season, career.world.divisions.find((d) => d.id === club.divisionId)?.level ?? 4, career.roundNumber, (career.schedule[club.divisionId][career.roundNumber - 1] ?? []).indexOf(fx) + 1);
  const ref = refereeFor(m.referees, career.seed, matchId);
  const prof = refereeProfile(m.refereeStats[ref.id], Object.values(m.refereeStats));
  const coach = m.coaches[oppId];
  const oppDiv = career.world.divisions.find((d) => d.id === opp.divisionId);
  const venueClub = career.world.clubs[fx.home];
  const estimate = roundAttendance(career, m, fx.home, fx.away);
  const key = opp.squad.map((id) => career.world.players[id]).filter(Boolean).sort((a, b) => b.strength - a.strength).slice(0, 3);
  return card(
    'Próximo adversário',
    h('div', { class: 'opp-head' }, crest(opp, 'md'), h('div', null, h('b', null, opp.name), h('span', { class: 'muted small' }, `${flagOf(opp.country)} ${opp.city} · ${oppDiv?.name ?? ''} · ${career.results.length ? `${pos}º colocado` : 'sem jogos'} · força ${clubStrength(career.world.players, opp)}${coach ? ` · técnico ${coach.name}` : ''}`))),
    h('p', { class: 'small' }, `${fx.home === uid ? 'Em casa' : 'Fora'} · ${venueClub.stadium.name} · público estimado ${num(estimate)} · estilo ${STYLE_LABEL[opp.defaultTactics.style].toLowerCase()}`),
    key.length ? h('p', { class: 'small' }, `Principais jogadores: ${key.map((p) => `${shortName(p.name)} (${p.strength})`).join(', ')}`) : null,
    h('div', { class: 'row gap wrap' }, h('span', { class: 'label' }, 'Forma'), form.length ? form.map((x) => h('span', { class: `wdl wdl-${x === 'V' ? 'W' : x === 'E' ? 'D' : 'L'}` }, x)) : h('span', { class: 'muted small' }, 'sem jogos')),
    top && top.g > 0 ? h('p', { class: 'small' }, `Artilheiro: ${career.world.players[top.id].name} (${top.g} gols)`) : null,
    out.length ? h('p', { class: 'small muted' }, `Desfalques: ${out.map((p) => `${shortName(p.name)} ${p.condition.injuryRounds > 0 ? '🩹' : '🟥'}`).join(', ')}`) : null,
    h('div', { class: 'referee' }, h('span', { class: 'label' }, 'Árbitro'), h('b', null, ref.name), h('span', { class: 'small muted' }, `${prof.matches} jogo(s) · ${prof.cardsPerMatch.toFixed(1)} cartões/jogo · ${prof.penaltiesPerMatch.toFixed(2)} pênaltis/jogo`), h('span', { class: 'small' }, prof.label)),
    h('p', { class: 'muted small' }, 'O perfil do árbitro é estatística dos jogos que ele apitou; não muda o resultado (ver docs/ENGINE.md).'),
  );
}

function jobBanner(ctrl: GameController): HTMLElement | null {
  const m = ctrl.state.career?.manager;
  const open = m?.jobs.offers.filter((o) => o.status === 'OPEN') ?? [];
  if (!open.length) return null;
  const c = ctrl.state.career!;
  return h('div', { class: 'job-banner' }, h('span', null, `📨 ${open.length === 1 ? `Proposta do ${c.world.clubs[open[0].clubId].name}` : `${open.length} propostas de trabalho`}`), btn('VER', () => ctrl.openProposal(open[0].clubId, open[0].id), { kind: 'primary' }));
}

function renderPre(ctrl: GameController): HTMLElement {
  const s = ctrl.state;
  const career = s.career!;
  const date = roundDate(career.season, career.roundNumber);
  if (!career.userClubId) {
    return h(
      'div',
      { class: 'page' },
      jobBanner(ctrl),
      card(`Rodada ${career.roundNumber} de ${ROUNDS_PER_SEASON} · ${date.label}`, h('p', { class: 'muted' }, 'Você está sem clube. As rodadas seguem; propostas chegam em CARREIRA.'), h('div', { class: 'speedrow' }, h('span', { class: 'label' }, 'Velocidade da rodada'), speedPicker(ctrl)), h('div', { class: 'row gap wrap pre-actions' }, btn('JOGAR RODADA', () => ctrl.startRound(), { kind: 'primary', big: true }), btn('CARREIRA', () => ctrl.go('CAREER')))),
      card('Jogos da rodada', roundBoard(ctrl, null)),
    );
  }
  const club = userClub(career);
  const ctx = ctrl.ctx!;
  const view = getClubView(ctx, club.id);
  const next = view.nextMatch;
  const resolved = resolveUserLineup(career);
  const out = view.squad.filter((p) => p.injuredRounds > 0 || p.suspendedRounds > 0);
  return h(
    'div',
    { class: 'page' },
    jobBanner(ctrl),
    card(
      `Rodada ${career.roundNumber} de ${ROUNDS_PER_SEASON} · ${date.label}`,
      next
        ? h('div', { class: 'next' }, h('div', { class: 'next-vs' }, h('span', null, next.home ? club.name : next.opponentName), h('b', null, 'x'), h('span', null, next.home ? next.opponentName : club.name)), h('p', { class: 'muted' }, `${next.home ? 'Em casa' : 'Fora de casa'} · adversário com força ${strengthLabel(next.opponentStrength)} · sua força ${strengthLabel(view.strength)}`))
        : empty('Sem jogo do seu clube nesta rodada.'),
      resolved.adjusted ? h('p', { class: 'notice' }, 'Sua escalação foi ajustada: havia titulares indisponíveis (lesão ou suspensão).') : null,
      out.length ? h('p', { class: 'muted' }, `Indisponíveis: ${out.map((p) => `${shortName(p.name)} (${p.injuredRounds > 0 ? `🩹 ${p.injuredRounds}` : `suspenso ${p.suspendedRounds}`})`).join(', ')}`) : null,
      h('div', { class: 'speedrow' }, h('span', { class: 'label' }, 'Velocidade da rodada'), speedPicker(ctrl)),
      h('div', { class: 'row gap wrap pre-actions' }, btn('JOGAR RODADA', () => ctrl.startRound(), { kind: 'primary', big: true }), btn('MEU TIME', () => ctrl.go('TEAM'))),
    ),
    opponentCard(ctrl),
    card('Jogos da rodada', roundBoard(ctrl, null)),
  );
}

// ---------- Rodada em andamento ----------

function renderLive(ctrl: GameController): HTMLElement {
  const s = ctrl.state;
  const career = s.career!;
  const snap = s.snapshot;
  if (s.matchView && snap.round) {
    const vm = snap.round.matches.find((x) => x.matchId === s.matchView);
    if (vm && vm.matchId !== s.plan?.userMatchId) return matchDetail(ctrl, vm);
  }
  const paused = snap.status === 'PAUSED';
  const deciding = snap.status === 'AWAITING_DECISION';
  const tone = deciding ? 'wait' : paused ? 'paused' : 'live';
  const label = deciding ? 'DECISÃO' : paused ? (snap.pauses.includes('CLUBS') ? 'CLUBES' : snap.pauses.includes('HALFTIME') ? 'INTERVALO' : snap.pauses.includes('EVENT') ? 'LANCE' : 'PAUSADO') : 'AO VIVO';
  const userStops = snap.pauses.includes('HALFTIME') || snap.pauses.includes('EVENT');
  const controls = h(
    'div',
    { class: 'controls' },
    segmented(UI_SPEEDS.map((id) => ({ id, label: SPEEDS[id].label })), s.speed, (id) => ctrl.setSpeed(id)),
    h('div', { class: 'row gap wrap' }, paused && !userStops ? btn('CONTINUAR', () => ctrl.resume(), { kind: 'primary' }) : btn('PAUSAR', () => ctrl.pause(), { disabled: deciding || userStops }), career.userClubId ? btn('MEU TIME', () => ctrl.openTeamAdjustment(), { disabled: deciding }) : null),
  );
  const m = ctrl.userMatch();
  if (!career.userClubId || !m) {
    if (!snap.round) return h('div', { class: 'page' }, card(null, empty('Preparando a rodada…')));
    const any = snap.round.matches[0];
    return h('div', { class: 'page live' }, h('div', { class: 'match-card' }, h('div', { class: 'center' }, h('div', { class: `sb-clock ${tone}` }, h('span', { class: 'dot' }), `${minuteLabel(any)} · ${label}`)), controls), card('Rodada ao vivo', roundBoard(ctrl, null)));
  }
  return h(
    'div',
    { class: 'page live' },
    h('div', { class: 'match-card' }, scoreboard(m, career.userClubId, label, tone), h('p', { class: 'muted center' }, `Público: ${num(m.attendance)}${s.plan?.referees[m.matchId] ? ` · Árbitro: ${s.plan.referees[m.matchId].name}` : ''}`), controls),
    card('Rodada ao vivo', roundBoard(ctrl, m.matchId)),
    h('div', { class: 'two' }, card('Lances do seu jogo', eventFeed(m)), h('details', { class: 'card' }, h('summary', null, 'Escalações em campo'), lineupBlock(m, 'home'), lineupBlock(m, 'away'))),
  );
}

// ---------- Depois da rodada ----------

function renderPost(ctrl: GameController): HTMLElement {
  const s = ctrl.state;
  const career = s.career!;
  if (s.matchView && s.snapshot.round) {
    const vm = s.snapshot.round.matches.find((x) => x.matchId === s.matchView);
    if (vm) return matchDetail(ctrl, vm);
  }
  const m = ctrl.userMatch();
  const outcome = s.outcome;
  const over = career.roundNumber > ROUNDS_PER_SEASON;
  const parts: Child[] = [];
  const club = career.userClubId ? userClub(career) : null;
  if (m && club) {
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
  } else if (outcome?.fired) {
    parts.push(card('Demitido', h('p', null, 'A diretoria encerrou o seu trabalho. Você segue na carreira, sem clube: propostas chegam em CARREIRA.')));
  }
  parts.push(h('div', { class: 'cta' }, btn(over ? `INICIAR TEMPORADA ${career.season + 1}` : 'PRÓXIMA RODADA', () => ctrl.nextRound(), { kind: 'primary', big: true })));
  if (over) parts.push(seasonCard(ctrl));
  if (outcome && outcome.ledger && club) {
    const l = outcome.ledger;
    const extra = outcome.extras.reduce((a, e) => a + e.amount, 0);
    parts.push(
      card(
        'Finanças da rodada',
        h('div', { class: 'stats' }, stat('Público', num(l.attendance)), stat('Bilheteria', signedMoney(l.ticketRevenue)), stat('Cota de TV', signedMoney(l.tvRevenue)), stat('Salários', signedMoney(-l.salaries)), stat('Manutenção', signedMoney(-l.upkeep)), extra !== 0 ? stat('Outros', signedMoney(extra), extra >= 0 ? 'good' : 'bad') : null, stat('Resultado', signedMoney(l.net + extra), l.net + extra >= 0 ? 'good' : 'bad')),
        outcome.extras.length ? h('ul', { class: 'plain small' }, outcome.extras.map((e) => h('li', null, `${e.label}: ${signedMoney(e.amount)}`))) : null,
        h('p', { class: 'muted' }, `Caixa atual: ${money(club.money)}`),
      ),
    );
  }
  const news = career.manager ? dailyPaper(career.manager.news).slice(0, 5) : [];
  if (news.length) parts.push(card('Jornal do Dia', h('ul', { class: 'plain' }, news.map((n) => h('li', null, h('button', { type: 'button', class: 'linkish', onClick: () => ctrl.openNews(n.id) }, n.title)))), btn('VER NOTÍCIAS', () => ctrl.go('NEWS'))));
  if (club) {
    const table = divisionStandings(career, club.divisionId);
    const pos = table.findIndex((r) => r.clubId === club.id) + 1;
    const row = table[pos - 1];
    parts.push(card('Classificação', h('p', null, `${club.name} é o ${pos}º colocado da ${career.world.divisions.find((d) => d.id === club.divisionId)?.name}, com ${row?.points ?? 0} pontos em ${row?.played ?? 0} jogos.`), h('div', { class: 'row gap wrap' }, btn('VER CLASSIFICAÇÃO', () => ctrl.go('LEAGUE')), btn('MEU TIME', () => ctrl.go('TEAM')))));
  }
  // Depois de recarregar, a rodada jogada não está mais em memória (não é salva): sem jogos para listar, o cartão some.
  if (s.snapshot.round) parts.push(card('Resultados da rodada', roundBoard(ctrl, m?.matchId ?? null)));
  return h('div', { class: 'page' }, parts);
}

function seasonCard(ctrl: GameController): HTMLElement {
  const career = ctrl.state.career!;
  const r = career.history[career.history.length - 1];
  if (!r) return card(null, empty('Temporada encerrada.'));
  const name = (id: string) => career.world.clubs[id].name;
  const divName = (id: string | null) => (id ? (career.world.divisions.find((d) => d.id === id)?.name ?? id) : '—');
  const mv = r.userMovement;
  return card(
    `FIM DE TEMPORADA ${r.season}`,
    r.userClubId ? h('p', { class: 'season-line' }, `Você terminou em ${r.userPosition}º lugar na ${divName(r.userDivisionId)}.`) : h('p', { class: 'season-line' }, 'Você terminou a temporada sem clube.'),
    r.userClubId ? (mv ? h('p', { class: mv.kind === 'PROMOTED' ? 'good' : 'bad' }, mv.kind === 'PROMOTED' ? `ACESSO! Você sobe para a ${divName(mv.toDivisionId)}${mv.champion ? ' como campeão' : ''}.` : `REBAIXAMENTO. Você cai para a ${divName(mv.toDivisionId)}.`) : h('p', { class: 'muted' }, 'Você permanece na mesma divisão.')) : null,
    r.userClubId ? h('p', { class: 'muted' }, `Saldo financeiro da temporada: ${signedMoney(r.userNet)}`) : null,
    h('h4', { class: 'season-sub' }, 'Campeões'),
    h('ul', { class: 'plain' }, Object.entries(r.champions).map(([div, id]) => h('li', null, `${divName(div)}: ${name(id)}`))),
    h('p', { class: 'muted small' }, `${plural(r.movements.filter((x) => x.kind === 'PROMOTED').length, 'clube sobe', 'clubes sobem')} e ${plural(r.movements.filter((x) => x.kind === 'RELEGATED').length, 'desce', 'descem')} entre as divisões. Mercado aberto na intertemporada.`),
  );
}

export function renderMatch(ctrl: GameController): HTMLElement {
  const phase = ctrl.state.phase;
  return phase === 'PRE' ? renderPre(ctrl) : phase === 'LIVE' ? renderLive(ctrl) : renderPost(ctrl);
}
