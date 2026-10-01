import { DEFAULT_CONFIG, arrangeSlots, formationLabel, formationOf, parseFormation, penaltyChance, type Behavior, type Decision, type LineupSlot, type MatchState, type Sector, type Style, type TeamState } from '../../../engine/index.ts';
import { suggestedCommand } from '../../../game/assist.ts';
import type { TeamChanges } from '../../../game/session.ts';
import type { GameController } from '../controller.ts';
import { h, type Child } from '../dom.ts';
import { BEHAVIORS, BEHAVIOR_LABEL, FORMATIONS, POSITION_LABEL, STYLES, STYLE_LABEL, shortName } from '../format.ts';
import { btn, segmented } from './common.ts';

// Pop-ups das decisões do jogador (seção 23). A partida está PARADA enquanto eles existem.
// A tela só coleta a escolha; quem valida (exatamente 1 goleiro, limite de trocas...) é o engine.
// "ACEITAR SUGESTÃO" usa a mesma política da CPU e sempre produz um time válido.

interface Draft {
  decisionId: string;
  sub: string | null;
  style: Style | null;
  behavior: Behavior | null;
  pairs: { out: string; in: string }[];
  out: string;
  inn: string;
  formation: string | null;
  swaps: [string, string][];
  a: string;
  b: string;
}
const draft: Draft = { decisionId: '', sub: null, style: null, behavior: null, pairs: [], out: '', inn: '', formation: null, swaps: [], a: '', b: '' };

function sync(decision: Decision): void {
  if (draft.decisionId === decision.id) return;
  Object.assign(draft, { decisionId: decision.id, sub: null, style: null, behavior: null, pairs: [], out: '', inn: '', formation: null, swaps: [], a: '', b: '' });
}

const MAX_SUBS = DEFAULT_CONFIG.maxSubs;

function playerRow(m: MatchState, decision: Decision, id: string, right: Child, onClick: () => void, selected: boolean, suggested: boolean): HTMLElement {
  const p = m[decision.side].players[id];
  return h('button', { type: 'button', class: `prow${selected ? ' on' : ''}`, onClick }, h('span', { class: `pos pos-${p.position}` }, POSITION_LABEL[p.position]), h('span', { class: 'prow-name' }, p.name), suggested ? h('span', { class: 'badge badge-blue' }, 'SUGERIDO') : null, h('span', { class: 'prow-r' }, right));
}

function modal(title: string, subtitle: string, body: Child[], footer: Child[], tone: 'blue' | 'red' | 'yellow' = 'blue'): HTMLElement {
  return h('div', { class: 'modal-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('div', { class: `modal modal-${tone}` }, h('header', null, h('h2', null, title), h('p', { class: 'muted' }, subtitle)), h('div', { class: 'modal-body', 'data-keep': 'modal' }, body), h('footer', null, footer)));
}

function tacticsBlock(ctrl: GameController, m: MatchState, decision: Decision): HTMLElement {
  const team = m[decision.side];
  const style = draft.style ?? team.style;
  const behavior = draft.behavior ?? team.behavior;
  return h(
    'div',
    { class: 'tactics' },
    h('p', { class: 'label' }, 'Estilo'),
    segmented(STYLES.map((id) => ({ id, label: STYLE_LABEL[id] })), style, (id) => { draft.style = id; ctrl.notifyRender(); }),
    h('p', { class: 'label' }, 'Comportamento'),
    segmented(BEHAVIORS.map((id) => ({ id, label: BEHAVIOR_LABEL[id] })), behavior, (id) => { draft.behavior = id; ctrl.notifyRender(); }),
  );
}

function substitutionPicker(ctrl: GameController, m: MatchState, decision: Decision, remaining: number): HTMLElement {
  const team = m[decision.side];
  const used = new Set(draft.pairs.flatMap((p) => [p.out, p.in]));
  const field = team.onField.filter((s) => !used.has(s.playerId));
  const bench = decision.eligible.filter((id) => !used.has(id));
  const select = (id: string, options: { value: string; label: string }[], value: string, on: (v: string) => void) =>
    h('select', { 'aria-label': id, onChange: (e: Event) => { on((e.target as HTMLSelectElement).value); ctrl.notifyRender(); } }, [h('option', { value: '' }, id === 'sai' ? 'Sai…' : 'Entra…'), ...options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label))]);
  return h(
    'div',
    { class: 'subs' },
    h('p', { class: 'label' }, `Substituições (${remaining} disponíveis)`),
    draft.pairs.map((p, i) => h('div', { class: 'pair' }, h('span', null, `sai ${shortName(team.players[p.out].name)} · entra ${shortName(team.players[p.in].name)}`), h('button', { type: 'button', class: 'x', 'aria-label': 'Remover troca', onClick: () => { draft.pairs.splice(i, 1); ctrl.notifyRender(); } }, '×'))),
    remaining - draft.pairs.length > 0 && bench.length > 0
      ? h(
          'div',
          { class: 'pair-add' },
          select('sai', field.map((s) => ({ value: s.playerId, label: `${POSITION_LABEL[team.players[s.playerId].position]} ${shortName(team.players[s.playerId].name)} (${team.players[s.playerId].strength})` })), draft.out, (v) => (draft.out = v)),
          select('entra', bench.map((id) => ({ value: id, label: `${POSITION_LABEL[team.players[id].position]} ${shortName(team.players[id].name)} (${team.players[id].strength})` })), draft.inn, (v) => (draft.inn = v)),
          btn('TROCAR', () => { if (draft.out && draft.inn) { draft.pairs.push({ out: draft.out, in: draft.inn }); draft.out = ''; draft.inn = ''; ctrl.notifyRender(); } }, { disabled: !(draft.out && draft.inn) }),
        )
      : bench.length === 0
        ? h('p', { class: 'muted small' }, 'Sem reservas disponíveis.')
        : null,
  );
}


const NAT_RANK: Record<string, number> = { GK: 1, DEF: 1, MID: 2, ATT: 3 };

/** Monta as mudanças do pop-up MEU TIME. Posições só são enviadas se houve formação nova ou troca de posições
 * (o engine exige listar exatamente os jogadores em campo depois das trocas; quem valida é ele). */
export function buildChanges(team: TeamState, d: Draft): TeamChanges {
  const changes: TeamChanges = { style: d.style ?? team.style, behavior: d.behavior ?? team.behavior, substitutions: d.pairs.map((p) => ({ out: p.out, in: p.in })) };
  let field: LineupSlot[] = team.onField.map((s) => {
    const pair = d.pairs.find((p) => p.out === s.playerId);
    return pair ? { ...s, playerId: pair.in } : s;
  });
  let touched = false;
  if (d.formation && field.length === 11) {
    const f = parseFormation(d.formation);
    const gk = field.find((s) => s.sector === 'GK');
    if (gk) {
      const rest = field.filter((s) => s !== gk).sort((a, b) => NAT_RANK[team.players[a.playerId].position] - NAT_RANK[team.players[b.playerId].position] || team.players[b.playerId].strength - team.players[a.playerId].strength);
      const entries: { playerId: string; sector: Sector }[] = [{ playerId: gk.playerId, sector: 'GK' }];
      rest.forEach((s, i) => entries.push({ playerId: s.playerId, sector: i < f.DEF ? 'DEF' : i < f.DEF + f.MID ? 'MID' : 'ATT' }));
      field = arrangeSlots(entries);
      touched = true;
    }
  }
  for (const [a, b] of d.swaps) {
    const sa = field.find((s) => s.playerId === a);
    const sb = field.find((s) => s.playerId === b);
    if (sa && sb) {
      field = field.map((s) => (s === sa ? { ...s, sector: sb.sector, x: sb.x, y: sb.y } : s === sb ? { ...s, sector: sa.sector, x: sa.x, y: sa.y } : s));
      touched = true;
    }
  }
  if (touched) changes.positions = field;
  return changes;
}

function positionsBlock(ctrl: GameController, m: MatchState, decision: Decision): HTMLElement {
  const team = m[decision.side];
  const outfield = team.onField.filter((s) => s.sector !== 'GK');
  const current = team.onField.length === 11 ? formationLabel(formationOf(team.onField)) : null;
  const shown = draft.formation ?? current;
  const opt = (v: string, on: (x: string) => void, id: string) =>
    h('select', { 'aria-label': id, onChange: (e: Event) => { on((e.target as HTMLSelectElement).value); ctrl.notifyRender(); } }, [h('option', { value: '' }, id === 'a' ? 'Jogador…' : 'trocar com…'), ...outfield.map((s) => h('option', { value: s.playerId, selected: s.playerId === v }, `${POSITION_LABEL[s.sector]} ${shortName(team.players[s.playerId].name)}`))]);
  return h(
    'div',
    { class: 'subs' },
    h('p', { class: 'label' }, 'Formação'),
    current
      ? h('div', { class: 'chips-row' }, FORMATIONS.map((f) => h('button', { type: 'button', class: `pill${f === shown ? ' on' : ''}`, onClick: () => { draft.formation = f === current ? null : f; ctrl.notifyRender(); } }, f)))
      : h('p', { class: 'muted small' }, 'Com um jogador a menos a formação fica como está.'),
    h('p', { class: 'label' }, 'Trocar posições em campo'),
    draft.swaps.map((sw, i) => h('div', { class: 'pair' }, h('span', null, `${shortName(team.players[sw[0]].name)} ⇄ ${shortName(team.players[sw[1]].name)}`), h('button', { type: 'button', class: 'x', 'aria-label': 'Remover troca de posição', onClick: () => { draft.swaps.splice(i, 1); ctrl.notifyRender(); } }, '×'))),
    h('div', { class: 'pair-add' }, opt(draft.a, (v) => (draft.a = v), 'a'), opt(draft.b, (v) => (draft.b = v), 'b'), btn('TROCAR POSIÇÕES', () => { if (draft.a && draft.b && draft.a !== draft.b) { draft.swaps.push([draft.a, draft.b]); draft.a = ''; draft.b = ''; ctrl.notifyRender(); } }, { disabled: !(draft.a && draft.b && draft.a !== draft.b) })),
  );
}

export function renderDecision(ctrl: GameController): HTMLElement | null {
  const decision = ctrl.state.snapshot.pending?.decision;
  const m = ctrl.pendingMatch();
  if (!decision || !m) return null;
  sync(decision);
  const team = m[decision.side];
  const suggest = btn('ACEITAR SUGESTÃO', () => ctrl.acceptSuggestion(), { kind: 'ghost' });
  const subsUsed = team.subsUsed;

  if (decision.type === 'PENALTY_TAKER') {
    const list = decision.eligible.slice().sort((a, b) => team.players[b].strength - team.players[a].strength);
    return modal('PÊNALTI PARA O SEU TIME', 'Escolha o cobrador. A partida está parada.', list.map((id) => playerRow(m, decision, id, `${Math.round(penaltyChance(m, decision.side, id, DEFAULT_CONFIG) * 100)}%`, () => ctrl.choosePenaltyTaker(id), false, id === decision.suggested)), [suggest]);
  }

  if (decision.type === 'INJURY_SUBSTITUTION') {
    const injured = team.players[decision.playerId ?? ''];
    const isGK = injured?.position === 'GK';
    const reserves = decision.eligible.slice().sort((a, b) => (isGK ? Number(team.players[b].position === 'GK') - Number(team.players[a].position === 'GK') : 0) || team.players[b].strength - team.players[a].strength);
    const hasGK = reserves.some((id) => team.players[id].position === 'GK');
    const chosen = draft.sub ?? decision.suggested ?? reserves[0] ?? null;
    const title = isGK ? 'GOLEIRO LESIONADO' : 'LESÃO';
    const subtitle = `${injured?.name ?? 'Jogador'} se lesionou e sai de campo. A partida está parada.`;
    if (reserves.length === 0 || (isGK && !hasGK)) {
      return modal(title, subtitle, [h('p', { class: isGK ? 'notice' : 'muted' }, isGK ? (reserves.length === 0 ? 'Sem reservas: um jogador de linha vai para o gol (rende só 30% do normal). Você continua com exatamente um goleiro.' : 'Sem goleiro reserva: um jogador de linha vai para o gol (rende só 30% do normal) e o reserva escolhido entra em campo.') : 'Sem troca possível (banco vazio ou limite de trocas). O time segue com um a menos.'), describeSuggestion(m, decision)], [btn('CONTINUAR', () => ctrl.acceptSuggestion(), { kind: 'primary' })], 'red');
    }
    return modal(
      title,
      subtitle,
      [
        isGK ? h('p', { class: 'notice' }, 'Goleiro reserva disponível: ele assume o gol. Um jogador de linha no gol rende só 30%.') : null,
        reserves.map((id) => playerRow(m, decision, id, String(team.players[id].strength), () => { draft.sub = id; ctrl.notifyRender(); }, id === chosen, id === decision.suggested)),
        chosen && isGK && team.players[chosen].position !== 'GK' ? h('p', { class: 'notice' }, 'Atenção: este jogador não é goleiro.') : null,
      ],
      [btn('CONFIRMAR SUBSTITUIÇÃO', () => { if (chosen) ctrl.sendAdjustment({ substitutions: [{ out: decision.playerId ?? '', in: chosen }] }); }, { kind: 'primary', disabled: !chosen }), suggest],
      'red',
    );
  }

  if (decision.type === 'RED_CARD_ADJUSTMENT') {
    const expelled = team.players[decision.playerId ?? ''];
    const isGK = expelled?.position === 'GK';
    const remaining = MAX_SUBS - subsUsed;
    if (isGK) {
      return modal('GOLEIRO EXPULSO', `${expelled.name} foi expulso. O time precisa de um goleiro em campo.`, [describeSuggestion(m, decision)], [btn('ACEITAR SUGESTÃO', () => ctrl.acceptSuggestion(), { kind: 'primary' })], 'red');
    }
    return modal(
      'EXPULSÃO',
      `${expelled?.name ?? 'Um jogador'} foi expulso. Seu time joga com um a menos: ajuste a tática.`,
      [tacticsBlock(ctrl, m, decision), decision.eligible.length > 0 && remaining > 0 ? substitutionPicker(ctrl, m, decision, remaining) : h('p', { class: 'muted small' }, 'Sem troca disponível.')],
      [btn('CONTINUAR', () => ctrl.sendAdjustment({ style: draft.style ?? team.style, behavior: draft.behavior ?? team.behavior, substitutions: draft.pairs.map((p) => ({ out: p.out, in: p.in })) }), { kind: 'primary' }), suggest],
      'red',
    );
  }

  // TEAM_ADJUSTMENT (botão MEU TIME)
  const remaining = MAX_SUBS - subsUsed;
  return modal(
    'MEU TIME',
    'Ajuste estilo, comportamento, formação, posições e substituições. O jogo continua no CONTINUAR.',
    [tacticsBlock(ctrl, m, decision), remaining > 0 ? substitutionPicker(ctrl, m, decision, remaining) : h('p', { class: 'muted small' }, 'Limite de substituições atingido.'), positionsBlock(ctrl, m, decision)],
    [btn('CONTINUAR', () => ctrl.sendAdjustment(buildChanges(team, draft)), { kind: 'primary' }), btn('CANCELAR', () => ctrl.sendAdjustment(), { kind: 'ghost' })],
  );
}

/** Explica em português o que a sugestão automática vai fazer (troca e/ou jogador de linha no gol). */
function describeSuggestion(m: MatchState, decision: Decision): HTMLElement {
  const cmd = suggestedCommand(m, decision);
  const team = m[decision.side];
  if (cmd.type !== 'ADJUST_TEAM') return h('p', { class: 'muted' }, 'A sugestão mantém o time como está.');
  const lines: string[] = [];
  for (const s of cmd.substitutions) lines.push(`Sai ${shortName(team.players[s.out]?.name ?? '')}, entra ${shortName(team.players[s.in]?.name ?? '')}.`);
  for (const p of cmd.positions ?? []) {
    const player = team.players[p.playerId];
    if (p.sector === 'GK' && player && player.position !== 'GK') lines.push(`${shortName(player.name)} vai para o gol.`);
  }
  return h('div', { class: 'suggestion' }, h('p', { class: 'label' }, 'Sugestão do jogo'), lines.length ? h('ul', { class: 'plain' }, lines.map((l) => h('li', null, l))) : h('p', { class: 'muted' }, 'Manter o time como está.'));
}
