import { createRng, deriveSeed, type Club, type Player, type World } from '../../engine/index.ts';
import type { CpuCoach, Personality, Referee } from './state.ts';

// Pessoas do mundo fora do engine: personalidade dos jogadores, técnicos dos clubes da CPU e árbitros.
// Tudo sai da seed da carreira (mesma seed = mesmas pessoas). Nada aqui é atributo esportivo: a força (1–50) do
// jogador continua sendo a única coisa que o engine usa.

const COACH_FIRST = ['Adilson', 'Celso', 'Dorival', 'Evandro', 'Fernando', 'Gilmar', 'Hélio', 'Ivo', 'Jair', 'Lauro', 'Milton', 'Nelson', 'Osmar', 'Paulo', 'Renato', 'Sérgio', 'Túlio', 'Válter', 'Wagner', 'Zé Carlos'];
const COACH_LAST = ['Arantes', 'Bastos', 'Caldeira', 'Dantas', 'Espíndola', 'Ferraz', 'Galvão', 'Horta', 'Leme', 'Mattos', 'Neves', 'Pimentel', 'Quintela', 'Rangel', 'Salles', 'Tavares', 'Vidal', 'Werneck'];
const REF_FIRST = ['Anderson', 'Bráulio', 'Cláudio', 'Daniel', 'Edson', 'Flávio', 'Glauco', 'Heber', 'Igor', 'Jonas', 'Leandro', 'Marcelo', 'Nílton', 'Otávio', 'Rafael', 'Sávio', 'Thiago', 'Wilton'];
const REF_LAST = ['Abreu', 'Brito', 'Cunha', 'Diniz', 'Fontes', 'Guerra', 'Lima', 'Mendes', 'Nunes', 'Paiva', 'Ramos', 'Seixas', 'Teles', 'Vaz'];

export const REFEREE_COUNT = 24;

/** Hash estável (FNV-1a) para escolhas determinísticas que não consomem a sequência de um RNG. */
export function stableHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Personalidade: idade decide "jovem" e "veterano"; os demais vêm de um hash do id (estável entre temporadas). */
export function personalityOf(seed: string, p: Pick<Player, 'id' | 'age'>): Personality {
  const h = stableHash(`${seed}|personalidade|${p.id}`);
  if (p.age <= 21 && h % 3 === 0) return 'JOVEM';
  if (p.age >= 32 && h % 3 === 0) return 'VETERANO';
  return (['LEAL', 'AMBICIOSO', 'FINANCEIRO', 'COMPETITIVO'] as const)[h % 4];
}

export const PERSONALITY_LABEL: Record<Personality, string> = {
  LEAL: 'Leal',
  AMBICIOSO: 'Ambicioso',
  FINANCEIRO: 'Financeiro',
  COMPETITIVO: 'Competitivo',
  JOVEM: 'Jovem buscando minutos',
  VETERANO: 'Veterano buscando estabilidade',
};

export function coachName(seed: string, label: string): string {
  const rng = createRng(deriveSeed(seed, `tecnico:${label}`));
  return `${rng.pick(COACH_FIRST)} ${rng.pick(COACH_LAST)}`;
}

export function initialCoaches(seed: string, world: World, userClubId: string | null, season: number): Record<string, CpuCoach> {
  const out: Record<string, CpuCoach> = {};
  for (const id of Object.keys(world.clubs).sort()) {
    if (id === userClubId) continue;
    out[id] = { name: coachName(seed, `${id}:inicial`), since: season * 100 };
  }
  return out;
}

export function initialReferees(seed: string): Referee[] {
  const rng = createRng(deriveSeed(seed, 'arbitros'));
  const used = new Set<string>();
  const out: Referee[] = [];
  while (out.length < REFEREE_COUNT) {
    const name = `${rng.pick(REF_FIRST)} ${rng.pick(REF_LAST)}`;
    if (used.has(name)) continue;
    used.add(name);
    out.push({ id: `arb-${String(out.length + 1).padStart(2, '0')}`, name });
  }
  return out;
}

/** Árbitro de uma partida: escolhido pelo id da partida (o mesmo jogo tem sempre o mesmo árbitro). */
export function refereeFor(referees: readonly Referee[], seed: string, matchId: string): Referee {
  return referees[stableHash(`${seed}|arbitro|${matchId}`) % referees.length];
}

// ---------- identidade ----------

const FLAGS: Record<string, string> = {
  Brasil: '🇧🇷', Argentina: '🇦🇷', Uruguai: '🇺🇾', Paraguai: '🇵🇾', Colômbia: '🇨🇴', Chile: '🇨🇱', Equador: '🇪🇨', Peru: '🇵🇪',
  Venezuela: '🇻🇪', Bolívia: '🇧🇴', Panamá: '🇵🇦', Portugal: '🇵🇹', Espanha: '🇪🇸', Itália: '🇮🇹', Inglaterra: '🏴',
  'Países Baixos': '🇳🇱', Bélgica: '🇧🇪', Dinamarca: '🇩🇰', Suécia: '🇸🇪', Croácia: '🇭🇷', Marrocos: '🇲🇦', Gana: '🇬🇭',
  Camarões: '🇨🇲', 'RD Congo': '🇨🇩', 'Cabo Verde': '🇨🇻', Angola: '🇦🇴', Guiné: '🇬🇳', Japão: '🇯🇵',
};

export function flagOf(country: string | null | undefined): string {
  return (country && FLAGS[country]) || '🏳️';
}

/** Luminância relativa (WCAG) de uma cor #rrggbb. */
function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const v = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

const NAVY_L = luminance('#071522');
const contrastOnNavy = (hex: string) => (luminance(hex) + 0.05) / (NAVY_L + 0.05);

/**
 * Cores do clube: primária e secundária vêm do mundo; a de DESTAQUE é a que aparece sobre o marinho do jogo
 * (a mais legível das duas, ou off-white quando nenhuma tem contraste suficiente).
 */
export function clubColors(club: Pick<Club, 'primaryColor' | 'secondaryColor'>): { primary: string; secondary: string; accent: string } {
  const candidates = [club.primaryColor, club.secondaryColor].filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
  const best = candidates.sort((a, b) => contrastOnNavy(b) - contrastOnNavy(a))[0];
  return { primary: club.primaryColor, secondary: club.secondaryColor, accent: best && contrastOnNavy(best) >= 3 ? best : '#F2F4ED' };
}

// ---------- calendário ----------

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/**
 * Data de uma rodada: a temporada começa no 2º domingo de abril e tem uma rodada por semana (domingo),
 * com rodadas no meio da semana (quarta) quando o calendário aperta (a cada 5ª rodada).
 */
export function roundDate(season: number, round: number): { iso: string; label: string } {
  const start = new Date(Date.UTC(season, 3, 1));
  while (start.getUTCDay() !== 0) start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCDate(start.getUTCDate() + 7); // 2º domingo de abril
  const d = new Date(start);
  let days = 0;
  // de r para r+1: a 5ª, 10ª, 15ª... rodada cai na quarta (3 dias depois do domingo); a seguinte volta ao domingo (+4)
  for (let r = 1; r < round; r++) days += (r + 1) % 5 === 0 ? 3 : r % 5 === 0 ? 4 : 7;
  d.setUTCDate(d.getUTCDate() + days);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return { iso: d.toISOString().slice(0, 10), label: `${WEEKDAYS[d.getUTCDay()]} ${dd}/${mm}` };
}
