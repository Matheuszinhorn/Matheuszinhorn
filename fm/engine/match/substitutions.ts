import { ALL_BEHAVIORS, ALL_STYLES, type EngineConfig } from '../config.ts';
import { SECTORS } from '../lineup.ts';
import type { Command, CommandErrorCode, Decision, LineupSlot, MatchState } from '../types.ts';
import { eventClock, pushEvent } from './state.ts';

export type StepOutcome = { ok: true } | { ok: false; error: CommandErrorCode; message: string };

type AdjustTeam = Extract<Command, { type: 'ADJUST_TEAM' }>;

function fail(error: CommandErrorCode, message: string): StepOutcome {
  return { ok: false, error, message };
}

/**
 * Valida e aplica um ADJUST_TEAM (seção 23). Valida tudo antes de alterar qualquer coisa:
 * se falhar, o estado fica intacto.
 */
export function applyAdjustTeam(state: MatchState, decision: Decision, command: AdjustTeam, cfg: EngineConfig): StepOutcome {
  const side = decision.side;
  const team = state[side];
  const subs = command.substitutions ?? [];

  if (team.subsUsed + subs.length > cfg.maxSubs) {
    return fail('INVALID_LINEUP', `limite de ${cfg.maxSubs} substituições`);
  }

  // 1. Substituições, numa cópia do campo.
  let field: LineupSlot[] = team.onField.map((s) => ({ ...s }));
  const outs = new Set<string>();
  const ins = new Set<string>();
  let injuredReplaced = false;
  for (const sub of subs) {
    if (outs.has(sub.out) || ins.has(sub.in) || ins.has(sub.out) || sub.out === sub.in) {
      return fail('INVALID_PLAYER', 'substituição repetida');
    }
    if (!team.bench.includes(sub.in)) {
      return fail('INVALID_PLAYER', `${sub.in} não está disponível no banco`);
    }
    const idx = field.findIndex((s) => s.playerId === sub.out);
    if (idx !== -1) {
      field[idx] = { ...field[idx], playerId: sub.in };
    } else if (
      decision.type === 'INJURY_SUBSTITUTION' &&
      sub.out === decision.playerId &&
      team.injured.includes(sub.out) &&
      team.vacated[sub.out]
    ) {
      field.push({ ...team.vacated[sub.out], playerId: sub.in });
      injuredReplaced = true;
    } else {
      return fail('INVALID_PLAYER', `${sub.out} não está em campo`);
    }
    outs.add(sub.out);
    ins.add(sub.in);
  }

  // 2. Posições: se vierem, precisam ser exatamente os jogadores em campo depois das trocas.
  if (command.positions) {
    const expected = new Set(field.map((s) => s.playerId));
    const given = command.positions.map((s) => s.playerId);
    if (given.length !== expected.size || new Set(given).size !== given.length || given.some((id) => !expected.has(id))) {
      return fail('INVALID_LINEUP', 'as posições precisam listar exatamente os jogadores em campo');
    }
    for (const s of command.positions) {
      if (!SECTORS.includes(s.sector)) return fail('INVALID_LINEUP', `setor inválido: ${s.sector}`);
    }
    field = command.positions.map((s) => ({
      playerId: s.playerId,
      sector: s.sector,
      x: Number.isFinite(s.x) ? s.x : 50,
      y: Number.isFinite(s.y) ? s.y : 50,
    }));
  }

  // 3. Regras do time final.
  const keepers = field.filter((s) => s.sector === 'GK');
  if (keepers.length !== 1) return fail('INVALID_LINEUP', 'precisa haver exatamente um jogador no gol');

  const canSub = team.subsUsed < cfg.maxSubs && team.bench.length > 0;
  if (decision.type === 'INJURY_SUBSTITUTION' && canSub && !injuredReplaced) {
    return fail('INVALID_LINEUP', 'escolha o substituto do jogador lesionado');
  }
  const vacated = decision.playerId ? team.vacated[decision.playerId] : undefined;
  if (decision.type === 'RED_CARD_ADJUSTMENT' && vacated?.sector === 'GK') {
    const reserveGkAvailable = team.subsUsed < cfg.maxSubs && team.bench.some((id) => team.players[id].position === 'GK');
    if (reserveGkAvailable && team.players[keepers[0].playerId].position !== 'GK') {
      return fail('INVALID_LINEUP', 'com goleiro reserva disponível, ele deve entrar no gol');
    }
  }
  if (command.style !== undefined && !ALL_STYLES.includes(command.style)) return fail('INVALID_LINEUP', 'estilo inválido');
  if (command.behavior !== undefined && !ALL_BEHAVIORS.includes(command.behavior)) {
    return fail('INVALID_LINEUP', 'comportamento inválido');
  }

  // 4. Tudo válido: aplica.
  team.onField = field;
  team.bench = team.bench.filter((id) => !ins.has(id));
  for (const sub of subs) {
    if (!team.injured.includes(sub.out)) team.subbedOff.push(sub.out);
    const reason =
      decision.type === 'INJURY_SUBSTITUTION' && sub.out === decision.playerId
        ? 'injury'
        : decision.type === 'RED_CARD_ADJUSTMENT'
          ? 'red_card'
          : 'tactical';
    pushEvent(state, { clock: eventClock(state), type: 'SUBSTITUTION', side, playerId: sub.out, relatedPlayerId: sub.in, detail: reason });
  }
  team.subsUsed += subs.length;
  if (command.style !== undefined) team.style = command.style;
  if (command.behavior !== undefined) team.behavior = command.behavior;
  return { ok: true };
}
