import { cpuCommandFor, type Command, type Decision, type MatchState } from '../engine/index.ts';

/**
 * Sugestão automática do jogo para uma decisão do jogador (a mesma política da CPU), pronta para ser enviada como comando do JOGADOR.
 * É o "ACEITAR SUGESTÃO" da interface. Garante exatamente 1 goleiro: reserva goleiro, se houver; senão, o jogador de linha mais fraco vai ao gol.
 */
export function suggestedCommand(match: MatchState, decision: Decision): Command {
  const cmd = cpuCommandFor(match, decision);
  return { ...cmd, commandId: `jogador:${decision.id}` };
}
