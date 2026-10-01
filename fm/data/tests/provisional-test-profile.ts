import type { ProvisionalProfile } from '../to-world.ts';

// SÓ PARA TESTES TÉCNICOS: valores neutros e iguais para todos, usados apenas para provar que o engine aceita o
// World convertido. NÃO é força oficial, não é balanceamento e não é gravado nos dados do universo
// (a força dos jogadores reais continua null até a metodologia oficial do ELITE MANAGER).
export const PROVISIONAL_TEST_PROFILE: ProvisionalProfile = {
  id: 'teste-tecnico-provisorio',
  strength: 25,
  age: 25,
  temperament: 'NORMAL',
  salary: 10_000,
  marketValue: 0,
  contractEndSeason: 2026,
  money: 10_000_000,
  reputation: 50,
  stadiumCapacity: 20_000,
  colors: { primary: '#071522', secondary: '#F2F4ED' },
  tactics: { formation: { DEF: 4, MID: 4, ATT: 2 }, style: 'BALANCED', behavior: 'NORMAL' },
};
