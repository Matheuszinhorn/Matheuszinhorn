// Ligação entre registros de fontes diferentes (nomes e datas). Regras fixas e conservadoras: sem evidência forte,
// não há ligação. Usado pelo importador CBF para cruzar com a fonte de conferência.

/** Nome comparável: sem acento, minúsculo, sem pontuação, espaços simples. */
export function foldName(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Data em ISO (AAAA-MM-DD) a partir de "DD/MM/AAAA" (CBF) ou "M/D/AAAA ...". null se não der para ler. */
export function isoDate(s: string | null | undefined, order: 'DMY' | 'MDY'): string | null {
  const m = s ? /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s) : null;
  if (!m) return null;
  const [a, b, y] = [Number(m[1]), Number(m[2]), m[3]];
  const [d, mo] = order === 'DMY' ? [a, b] : [b, a];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export interface MatchCandidate {
  id: string;
  names: string[]; // nome, apelido, primeiro+último...
  birthDate: string | null; // ISO
}

/**
 * Liga dois jogadores SÓ com evidência forte: mesma data de nascimento E pelo menos um nome compatível (um contém o
 * outro, ou mesmo sobrenome + mesma inicial). Sem data de nascimento dos dois lados não há ligação (não se chuta).
 * Mais de um candidato possível = ambíguo = sem ligação (registrado como pendência).
 */
export function linkByBirthAndName(a: MatchCandidate, pool: readonly MatchCandidate[]): { id: string; rule: string } | { id: null; rule: string } {
  if (!a.birthDate) return { id: null, rule: 'sem data de nascimento' };
  const same = pool.filter((p) => p.birthDate === a.birthDate);
  const ok = same.filter((p) => namesCompatible(a.names, p.names));
  if (ok.length === 1) return { id: ok[0].id, rule: 'nascimento + nome' };
  if (ok.length > 1) return { id: null, rule: `ambíguo (${ok.length} candidatos)` };
  return { id: null, rule: same.length ? 'nascimento sem nome compatível' : 'não encontrado' };
}

const inOrder = (short: readonly string[], long: readonly string[]) => {
  let i = 0;
  for (const w of long) if (w === short[i]) i++;
  return i === short.length;
};

export function namesCompatible(xs: readonly string[], ys: readonly string[]): boolean {
  const A = xs.map(foldName).filter(Boolean);
  const B = ys.map(foldName).filter(Boolean);
  for (const a of A) for (const b of B) {
    if (a === b) return true;
    const wa = a.split(' ');
    const wb = b.split(' ');
    // um nome de uma palavra (apelido) contido como palavra no outro
    if ((wa.length === 1 && wb.includes(wa[0]) && wa[0].length >= 4) || (wb.length === 1 && wa.includes(wb[0]) && wb[0].length >= 4)) return true;
    // nome de 2+ palavras contido, na mesma ordem, no outro ("Ignacio Sosa" em "Ignacio Sosa Ospital")
    const [short, long] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
    if (short.length > 1 && short.length < long.length && inOrder(short, long)) return true;
    // mesmo último sobrenome e mesma inicial
    if (wa.length > 1 && wb.length > 1 && wa[wa.length - 1] === wb[wb.length - 1] && wa[0][0] === wb[0][0]) return true;
  }
  return false;
}
