// Som de torcida ORIGINAL, sintetizado no navegador (ruído filtrado; nenhuma gravação, narração ou trecho licenciado).
// Só apresentação: liga e desliga pelo botão de som e nunca mexe no jogo. Sem som disponível, não faz nada.

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let bed: GainNode | null = null;
let lastGoals = -1;
let lastRound = '';

function ensure(): Ctx | null {
  if (ctx) return ctx;
  const AC = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  // "cama" de torcida: ruído marrom passando por um passa-banda, volume baixo
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1; // só timbre do som: não toca no jogo
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 900;
  band.Q.value = 0.6;
  bed = ctx.createGain();
  bed.gain.value = 0;
  src.connect(band).connect(bed).connect(ctx.destination);
  src.start();
  return ctx;
}

function ramp(to: number, seconds: number): void {
  if (!ctx || !bed) return;
  const now = ctx.currentTime;
  bed.gain.cancelScheduledValues(now);
  bed.gain.setValueAtTime(bed.gain.value, now);
  bed.gain.linearRampToValueAtTime(to, now + seconds);
}

/** Chamada a cada desenho: torcida ao fundo durante a rodada; explosão quando sai gol no jogo do treinador. */
export function crowd(on: boolean, live: boolean, roundId: string | null, goals: number): void {
  if (!on || !live) {
    if (ctx && bed) ramp(0, 0.6);
    lastGoals = -1;
    return;
  }
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => undefined);
  if (roundId !== lastRound) {
    lastRound = roundId ?? '';
    lastGoals = goals;
  }
  if (lastGoals >= 0 && goals > lastGoals) {
    ramp(0.55, 0.15);
    setTimeout(() => ramp(0.12, 2.5), 900);
  } else if (bed && bed.gain.value < 0.05) ramp(0.12, 1.2);
  lastGoals = goals;
}
