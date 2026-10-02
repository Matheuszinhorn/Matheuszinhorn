import { formationLabel, formationOf, overallStrength, parseFormation, type Sector } from '../../../engine/index.ts';
import { resolveUserLineup, userClub } from '../../../game/career.ts';
import { getClubView } from '../../../game/queries.ts';
import type { GameController } from '../controller.ts';
import { h } from '../dom.ts';
import { BEHAVIORS, BEHAVIOR_LABEL, FORMATIONS, POSITION_LABEL, STYLES, STYLE_LABEL, money, shortName, strengthLabel } from '../format.ts';
import { flagOf } from '../../../game/manager/people.ts';
import { EMPTY_LINE } from '../../../game/manager/state.ts';
import { badge, btn, card, crest, segmented, stat, table, tabsRow } from './common.ts';

type Tab = 'LINEUP' | 'SQUAD';
let tab: Tab = 'LINEUP';

/** ELENCO: nacionalidade, jogos, gols, cartões, situação, salário e contrato (estatísticas dos eventos reais). */
function squadTable(ctrl: GameController): HTMLElement {
  const career = ctrl.state.career!;
  const club = userClub(career);
  const m = career.manager;
  const loans = new Set(m?.market.loans.filter((l) => l.toClubId === club.id).map((l) => l.playerId) ?? []);
  const rows = club.squad
    .map((id) => career.world.players[id])
    .filter(Boolean)
    .sort((a, b) => ORDER[a.position] - ORDER[b.position] || b.strength - a.strength);
  return card(
    `Elenco (${rows.length}) · temporada ${career.season}`,
    table(
      ['Jogador', 'For.', 'Idade', 'J', 'G', 'CA', 'CV', 'Situação', 'Salário', 'Contrato'],
      rows.map((p) => {
        const l = m?.stats.season[p.id] ?? EMPTY_LINE;
        const status = p.condition.injuryRounds > 0 ? badge(`🩹 ${p.condition.injuryRounds}`, 'red') : p.condition.suspensionRounds > 0 ? badge(`SUSP. ${p.condition.suspensionRounds}`, 'yellow') : loans.has(p.id) ? badge('EMPRESTADO', 'blue') : p.contract.endSeason <= career.season ? badge('CONTRATO VENCE', 'yellow') : badge('OK', 'green');
        return { onClick: () => ctrl.openPlayer(p.id), cls: p.condition.injuryRounds > 0 || p.condition.suspensionRounds > 0 ? 'unavailable' : '', cells: [h('span', { class: 'pname' }, h('span', { class: `pos pos-${p.position}` }, POSITION_LABEL[p.position]), ` ${flagOf(p.nationality)} ${p.name}`), h('b', null, p.strength), p.age, l.apps, l.goals, l.yellows, l.reds, status, money(p.salary), String(p.contract.endSeason)] };
      }),
      'tbl squad-stats',
      [1, 2, 3, 4, 5, 6, 8],
    ),
    h('p', { class: 'muted small' }, 'J jogos · G gols · CA amarelos · CV vermelhos. Toque num jogador para ver o perfil, renovar, emprestar ou vender. Assistências dependem do motor de partida (docs/ENGINE.md).'),
  );
}

// MEU TIME: campo, formação, estilo, comportamento, elenco e troca de jogadores por toque.
// Toda escalação passa pelo engine (validateLineup) antes de valer; a tela só edita um rascunho.

const ORDER: Record<Sector, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

export function renderTeam(ctrl: GameController): HTMLElement {
  const s = ctrl.state;
  const career = s.career!;
  const club = userClub(career);
  const players = career.world.players;
  const live = s.phase === 'LIVE';
  const view = getClubView(ctrl.ctx!, club.id);
  const lineup = resolveUserLineup(career).lineup;
  const liveMatch = live ? ctrl.userMatch() : null;
  const side = liveMatch ? (liveMatch.home.clubId === club.id ? 'home' : 'away') : null;
  const slots = liveMatch && side ? liveMatch[side].onField : lineup.starters;
  const name = (id: string) => (liveMatch && side ? liveMatch[side].players[id]?.name : players[id]?.name) ?? '';
  const strengthOf = (id: string) => (liveMatch && side ? liveMatch[side].players[id]?.strength : players[id]?.strength) ?? 0;
  const posOf = (id: string) => (liveMatch && side ? liveMatch[side].players[id]?.position : players[id]?.position);
  const current = formationLabel(formationOf(slots));
  const starterIds = new Set(slots.map((x) => x.playerId));
  const benchIds = new Set(lineup.bench);
  const squad = view.squad
    .slice()
    .sort((a, b) => Number(starterIds.has(b.id)) - Number(starterIds.has(a.id)) || Number(benchIds.has(b.id)) - Number(benchIds.has(a.id)) || ORDER[a.position] - ORDER[b.position] || b.strength - a.strength);
  const strength = Math.round(overallStrength(lineup.starters, players));

  const pitch = h(
    'div',
    { class: 'pitch', role: 'group', 'aria-label': 'Campo' },
    h('div', { class: 'pitch-lines' }),
    slots.map((slot) => {
      const off = posOf(slot.playerId) !== slot.sector;
      return h(
        'button',
        { type: 'button', class: `chip chip-${slot.sector}${s.selected === slot.playerId ? ' sel' : ''}${off ? ' off' : ''}`, style: `left:${slot.x}%;top:${100 - slot.y}%`, disabled: live, onClick: () => ctrl.selectPlayer(slot.playerId), title: off ? 'Fora de posição: rende menos' : name(slot.playerId) },
        h('span', { class: 'chip-n' }, strengthOf(slot.playerId)),
        h('span', { class: 'chip-name' }, shortName(name(slot.playerId))),
      );
    }),
  );

  const tabs = tabsRow<Tab>([{ id: 'LINEUP', label: 'Escalação' }, { id: 'SQUAD', label: 'Elenco e estatísticas' }], tab, (t) => { tab = t; ctrl.notifyRender(); });
  if (tab === 'SQUAD') return h('div', { class: 'page' }, h('div', { class: 'team-head' }, crest(club, 'lg'), h('div', null, h('h2', null, club.name), h('p', { class: 'muted' }, `Formação ${current} · força ${strength}`))), tabs, squadTable(ctrl));
  return h(
    'div',
    { class: 'page' },
    tabs,
    h('div', { class: 'team-head' }, crest(club, 'lg'), h('div', null, h('h2', null, club.name), h('p', { class: 'muted' }, `Formação ${current} · força ${strength}`))),
    live ? h('p', { class: 'notice' }, 'Rodada em andamento. Para trocar jogadores ou mudar a tática agora, use o botão MEU TIME na tela PARTIDA.') : null,
    s.selected ? h('p', { class: 'notice' }, `Selecionado: ${shortName(players[s.selected]?.name ?? '')}. Toque em outro jogador para trocar (ou no mesmo para cancelar).`) : null,
    h(
      'div',
      { class: 'two' },
      card('Campo', pitch),
      h(
        'div',
        { class: 'stack' },
        card(
          'Formação',
          h('div', { class: 'chips-row' }, FORMATIONS.map((f) => h('button', { type: 'button', class: `pill${f === current ? ' on' : ''}`, disabled: live, onClick: () => ctrl.setFormation(parseFormation(f)) }, f))),
          h('p', { class: 'label' }, 'Estilo'),
          segmented(STYLES.map((id) => ({ id, label: STYLE_LABEL[id] })), lineup.style, (id) => ctrl.setTactics({ style: id }), live),
          h('p', { class: 'label' }, 'Comportamento'),
          segmented(BEHAVIORS.map((id) => ({ id, label: BEHAVIOR_LABEL[id] })), lineup.behavior, (id) => ctrl.setTactics({ behavior: id }), live),
          h(
            'label',
            { class: 'field' },
            h('span', null, 'Batedor de pênalti'),
            h(
              'select',
              { disabled: live, onChange: (e: Event) => ctrl.setPenaltyTaker((e.target as HTMLSelectElement).value || null) },
              h('option', { value: '' }, 'Automático (o mais forte em campo)'),
              lineup.starters.filter((x) => x.sector !== 'GK').map((x) => h('option', { value: x.playerId, selected: lineup.penaltyTakerId === x.playerId }, `${shortName(players[x.playerId].name)} (${players[x.playerId].strength})`)),
            ),
          ),
          btn('MELHOR TIME', () => ctrl.bestTeam(), { disabled: live }),
        ),
        card('Próximo jogo', view.nextMatch ? h('p', null, `Rodada ${view.nextMatch.round}: ${view.nextMatch.home ? 'em casa' : 'fora'} contra ${view.nextMatch.opponentName} (força ${strengthLabel(view.nextMatch.opponentStrength)}).`) : h('p', { class: 'muted' }, 'Sem próximo jogo.'), h('div', { class: 'stats' }, stat('Caixa', money(club.money)), stat('Reputação', view.reputation))),
      ),
    ),
    card(
      `Elenco (${squad.length})`,
      h(
        'div',
        { class: 'tbl-wrap' },
        h(
          'table',
          { class: 'tbl squad' },
          h('thead', null, h('tr', null, ['', 'Jogador', 'Idade', 'For.', 'Situação'].map((t) => h('th', null, t)))),
          h(
            'tbody',
            null,
            squad.map((p) => {
              const st = starterIds.has(p.id) ? badge('TITULAR', 'blue') : benchIds.has(p.id) ? badge('BANCO', 'gray') : null;
              const out = p.injuredRounds > 0 ? badge(`🩹 LESÃO ${p.injuredRounds}`, 'red') : p.suspendedRounds > 0 ? badge(`SUSPENSO ${p.suspendedRounds}`, 'yellow') : null;
              return h('tr', { class: `${s.selected === p.id ? 'sel' : ''}${p.injuredRounds > 0 || p.suspendedRounds > 0 ? ' unavailable' : ''}`, onClick: () => (p.injuredRounds > 0 || p.suspendedRounds > 0 ? ctrl.notify(`${p.name} está indisponível.`, 'error') : ctrl.selectPlayer(p.id)) }, h('td', null, h('span', { class: `pos pos-${p.position}` }, POSITION_LABEL[p.position])), h('td', null, p.name), h('td', null, p.age), h('td', null, h('b', null, p.strength)), h('td', null, out ?? st));
            }),
          ),
        ),
      ),
    ),
  );
}
