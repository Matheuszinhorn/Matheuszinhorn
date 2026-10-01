import type { Clock } from './types.ts';

// Aleatoriedade determinística sem Math.random().
// Só operações inteiras de 32 bits (|0, >>>, Math.imul): o mesmo resultado em qualquer motor JavaScript.

/** Hash de texto para 128 bits (4 palavras de 32 bits). Aceita seeds de qualquer tamanho, sem truncar. */
export function cyrb128(text: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Gerador sfc32: devolve números em [0, 1). */
function sfc32(seed: [number, number, number, number]): () => number {
  let [a, b, c, d] = seed;
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

// Descarta os primeiros números de cada gerador para misturar melhor o estado inicial.
const WARMUP = 4;

function generator(key: string): () => number {
  const next = sfc32(cyrb128(key));
  for (let i = 0; i < WARMUP; i++) next();
  return next;
}

export interface Rng {
  next(): number;
  /** Inteiro uniforme em [min, max], inclusivo. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
}

/** Gerador sequencial. Usado fora da partida (geração do mundo, calendário), onde a ordem é fixa. */
export function createRng(key: string): Rng {
  const next = generator(key);
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
  };
}

/** Deriva uma seed filha em texto (32 hex). Ex.: seed da partida = deriveSeed(seedDaRodada, matchId). */
export function deriveSeed(parent: string, label: string): string {
  return cyrb128(`${parent}:${label}`)
    .map((w) => w.toString(16).padStart(8, '0'))
    .join('');
}

export function clockKey(clock: Clock): string {
  return `${clock.half}|${clock.minute}|${clock.added}`;
}

/**
 * Canal de sorteio da partida (seção 25).
 * sorteio(seed, relógio, canal, ocorrência): cada canal de cada minuto tem seu próprio mini-gerador,
 * e a ocorrência n é o n-ésimo número dele. Criar um canal novo nunca desloca os outros.
 */
export function channel(seed: string, clock: Clock, name: string): (occurrence: number) => number {
  const next = generator(`${seed}|${clockKey(clock)}|${name}`);
  const values: number[] = [];
  return (occurrence: number) => {
    while (values.length <= occurrence) values.push(next());
    return values[occurrence];
  };
}

/** Escolha ponderada determinística: u em [0, 1). Devolve -1 se todos os pesos forem zero. */
export function pickWeighted(weights: readonly number[], u: number): number {
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) return -1;
  let target = u * total;
  for (let i = 0; i < weights.length; i++) {
    target -= weights[i];
    if (target < 0) return i;
  }
  return weights.length - 1;
}
