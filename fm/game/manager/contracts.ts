import type { Player } from '../../engine/index.ts';
import { personalityOf } from './people.ts';
import type { ContractTalk, Personality } from './state.ts';
import { roundTo } from './finance.ts';

// Renovação de contrato: regra fixa e determinística, guiada pela personalidade do jogador.
// O jogador pede um salário e um prazo; abaixo do mínimo dele, recusa; entre o mínimo e o pedido, faz contraproposta.
// Três recusas e a conversa acaba (o jogador sai livre quando o contrato terminar). Nenhuma IA decide nada.

const ASK: Record<Personality, number> = { LEAL: 1.05, AMBICIOSO: 1.3, FINANCEIRO: 1.4, COMPETITIVO: 1.15, JOVEM: 1.1, VETERANO: 1.0 };
const FLOOR: Record<Personality, number> = { LEAL: 0.85, AMBICIOSO: 0.92, FINANCEIRO: 0.97, COMPETITIVO: 0.9, JOVEM: 0.9, VETERANO: 0.9 };
const YEARS: Record<Personality, number> = { LEAL: 3, AMBICIOSO: 2, FINANCEIRO: 2, COMPETITIVO: 2, JOVEM: 3, VETERANO: 2 };

export const MAX_TALKS = 3;

/** Contrato termina ao fim desta temporada (ou já terminou). */
export function expiring(p: Player, season: number): boolean {
  return p.contract.endSeason <= season;
}

export function openTalk(seed: string, p: Player): ContractTalk {
  const pers = personalityOf(seed, p);
  const askSalary = roundTo(Math.max(p.salary, 100) * ASK[pers], 100);
  const askYears = p.age >= 33 ? 1 : YEARS[pers];
  return { playerId: p.id, askSalary, askYears, minSalary: roundTo(askSalary * FLOOR[pers], 100), attempts: 0, status: 'OPEN', message: messageFor(pers) };
}

function messageFor(p: Personality): string {
  switch (p) {
    case 'LEAL': return 'Quero continuar aqui. Um reajuste pequeno resolve.';
    case 'AMBICIOSO': return 'Só fico se o clube mostrar que quer crescer.';
    case 'FINANCEIRO': return 'Meu empresário quer o melhor salário possível.';
    case 'COMPETITIVO': return 'Quero ganhar coisas. O salário tem que acompanhar.';
    case 'JOVEM': return 'Quero minutos em campo e um contrato longo.';
    case 'VETERANO': return 'Quero estabilidade para encerrar bem a carreira.';
  }
}

export type TalkVerdict = { talk: ContractTalk; agreed: { salary: number; years: number } | null };

/**
 * Proposta do treinador (salário por rodada e anos). Anos fora do que o jogador quer custam 5% de salário por ano de
 * diferença (o JOVEM e o VETERANO fazem questão do prazo).
 */
export function proposeRenewal(seed: string, p: Player, talk: ContractTalk, salary: number, years: number): TalkVerdict {
  if (talk.status !== 'OPEN') return { talk, agreed: null };
  const pers = personalityOf(seed, p);
  const gap = Math.abs(years - talk.askYears);
  const penalty = 1 + gap * ((pers === 'JOVEM' || pers === 'VETERANO') ? 0.1 : 0.05);
  const need = roundTo(talk.askSalary * penalty, 100);
  const floor = roundTo(talk.minSalary * penalty, 100);
  const attempts = talk.attempts + 1;
  if (salary >= need || (salary >= floor && attempts >= 2)) {
    return { talk: { ...talk, attempts, status: 'AGREED', message: 'Acordo fechado. Contrato renovado.' }, agreed: { salary, years } };
  }
  if (attempts >= MAX_TALKS) return { talk: { ...talk, attempts, status: 'BROKEN', message: 'Sem acordo. O jogador vai sair quando o contrato acabar.' }, agreed: null };
  if (salary >= floor) {
    const askSalary = roundTo((talk.askSalary + salary) / 2, 100);
    return { talk: { ...talk, attempts, askSalary: Math.max(askSalary, talk.minSalary), message: `Contraproposta: R$ ${askSalary.toLocaleString('pt-BR')} por rodada.` }, agreed: null };
  }
  return { talk: { ...talk, attempts, message: 'Muito abaixo do que ele espera.' }, agreed: null };
}
