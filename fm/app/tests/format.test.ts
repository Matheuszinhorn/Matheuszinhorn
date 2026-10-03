import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateWorld } from '../../engine/index.ts';
import { loadUniverse } from '../../data/load-node.ts';
import { universeToWorld } from '../../data/to-world.ts';
import { PROVISIONAL_TEST_PROFILE } from '../../data/tests/provisional-test-profile.ts';
import type { Universe } from '../../data/model.ts';
import { shortName, useNamesOf } from '../src/format.ts';

// Regra oficial: o displayName vindo da camada de dados aparece INTEIRO na interface (sem segunda abreviação).
// O mundo fictício da V1 continua abreviado como antes.

const DISPLAY_NAMES = ['João Pedro', 'Luis Eduardo', 'Gabriel Menegon', 'G. Martins', 'Jefinho', 'Nardoni', 'Felipe Anderson'];

test('mundo de universo de dados: displayName preservado integralmente', () => {
  useNamesOf({ nameStyle: 'display' });
  for (const n of DISPLAY_NAMES) assert.equal(shortName(n), n);
  assert.equal(shortName('João Pedro'), 'João Pedro');
  assert.equal(shortName('Luis Eduardo'), 'Luis Eduardo');
  assert.equal(shortName('G. Martins'), 'G. Martins');
  assert.equal(shortName('Jefinho'), 'Jefinho');
  useNamesOf(null);
});

test('mundo fictício da V1 (sem a marca): abreviação de sempre, nada muda', () => {
  const world = generateWorld('qa-v1');
  useNamesOf(world);
  assert.equal(shortName('Thiago Pacheco Lopes'), 'T. Lopes');
  assert.equal(shortName('Felipe Anderson'), 'F. Anderson');
  assert.equal(shortName('Jefinho'), 'Jefinho');
  useNamesOf(null);
  assert.equal(shortName('Gustavo Rocha'), 'G. Rocha'); // sem carreira (tela inicial): comportamento da V1
});

test('caminho completo: World do universo real → interface mostra exatamente o displayName', () => {
  const u = loadUniverse('brasileirao-2026').universe as Universe;
  const { world } = universeToWorld(u, { seed: 's', provisional: PROVISIONAL_TEST_PROFILE });
  assert.equal(world.nameStyle, 'display');
  // A marca sobrevive às cópias que o jogo faz do mundo ({ ...world }) e ao save (JSON).
  const copied = JSON.parse(JSON.stringify({ ...world, players: { ...world.players } }));
  useNamesOf(copied);
  for (const p of Object.values(u.players)) if (copied.players[p.id]) assert.equal(shortName(copied.players[p.id].name), p.displayName);
  assert.equal(shortName(copied.players['p-cbf-633571'].name), 'Gustavo Gomez'); // apelido como a CBF escreve
  useNamesOf(null);
});
