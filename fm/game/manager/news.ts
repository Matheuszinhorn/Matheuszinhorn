import type { MatchState, World } from '../../engine/index.ts';
import type { ManagerState, NewsItem, NewsKind } from './state.ts';

// Notícias: SEMPRE derivadas de algo que aconteceu no jogo (resultado, cartão, lesão, transferência, obra, demissão...).
// Nada é inventado: cada gerador recebe o fato e só o descreve. Rumor também nasce de um fato (um leilão aberto,
// uma proposta feita, um técnico pressionado).

export const NEWS_LIMIT = 300;

export const KIND_LABEL: Record<NewsKind, string> = { NOTICIA: 'Notícia', RUMOR: 'Rumor', OPINIAO: 'Opinião', URGENTE: 'Urgente', ANALISE: 'Análise' };

export type Draft = Omit<NewsItem, 'id' | 'season' | 'round'>;

export function draft(kind: NewsKind, title: string, opts: { body?: string | null; clubId?: string | null; playerId?: string | null; mine?: boolean } = {}): Draft {
  return { kind, title, body: opts.body ?? null, clubId: opts.clubId ?? null, playerId: opts.playerId ?? null, mine: opts.mine ?? false };
}

/** Publica as notícias com ids sequenciais (determinísticos) e mantém só as mais recentes. */
export function publish(m: ManagerState, season: number, round: number, drafts: readonly Draft[]): ManagerState {
  if (drafts.length === 0) return m;
  let seq = m.newsSeq;
  const items = drafts.map((d) => ({ ...d, id: `n${++seq}`, season, round }));
  const news = [...m.news, ...items];
  return { ...m, newsSeq: seq, news: news.length > NEWS_LIMIT ? news.slice(news.length - NEWS_LIMIT) : news };
}

const scoreText = (m: MatchState) => `${m.home.name} ${m.score.home} × ${m.score.away} ${m.away.name}`;

/** Notícias de uma rodada, lidas das partidas reais (o placar e os eventos de cada uma). */
export function roundNews(world: World, matches: readonly MatchState[], userClubId: string | null, topDivisionId: string | null): Draft[] {
  const out: Draft[] = [];
  const name = (id: string | null) => (id ? (world.players[id]?.name ?? 'Jogador') : 'Jogador');
  for (const m of matches) {
    const isMine = userClubId !== null && (m.home.clubId === userClubId || m.away.clubId === userClubId);
    const diff = Math.abs(m.score.home - m.score.away);
    const homeClub = world.clubs[m.home.clubId];
    if (isMine) {
      const side = m.home.clubId === userClubId ? 'home' : 'away';
      const gf = m.score[side];
      const ga = m.score[side === 'home' ? 'away' : 'home'];
      const verdict = gf > ga ? 'Vitória' : gf === ga ? 'Empate' : 'Derrota';
      const scorers = m.events.filter((e) => (e.type === 'GOAL' || e.type === 'PENALTY_GOAL') && e.side === side).map((e) => name(e.playerId));
      out.push(draft('NOTICIA', `${verdict}: ${scoreText(m)}`, { body: scorers.length ? `Gols: ${scorers.join(', ')}. Público: ${m.attendance.toLocaleString('pt-BR')}.` : `Público: ${m.attendance.toLocaleString('pt-BR')}.`, clubId: userClubId, mine: true }));
      for (const e of m.events) {
        if (e.side !== side) continue;
        if (e.type === 'RED_CARD') out.push(draft('URGENTE', `${name(e.playerId)} expulso e suspenso para a próxima rodada`, { clubId: userClubId, playerId: e.playerId, mine: true }));
        if (e.type === 'INJURY') {
          const rounds = Number(e.detail) || 1;
          out.push(draft(rounds >= 3 ? 'URGENTE' : 'NOTICIA', `${name(e.playerId)} se machucou e fica ${rounds} rodada${rounds > 1 ? 's' : ''} fora`, { clubId: userClubId, playerId: e.playerId, mine: true }));
        }
      }
      const hat = countBy(scorers).find(([, n]) => n >= 3);
      if (hat) out.push(draft('ANALISE', `${hat[0]} marca ${hat[1]} gols no mesmo jogo`, { clubId: userClubId, mine: true }));
    } else if (homeClub && homeClub.divisionId === topDivisionId && diff >= 4) {
      out.push(draft('NOTICIA', `Goleada na 1ª divisão: ${scoreText(m)}`, { clubId: m.score.home > m.score.away ? m.home.clubId : m.away.clubId }));
    }
  }
  return out;
}

function countBy(list: readonly string[]): [string, number][] {
  const map = new Map<string, number>();
  for (const x of list) map.set(x, (map.get(x) ?? 0) + 1);
  return [...map.entries()];
}

/** Notícias do dia: as da rodada mais recente (Jornal do Dia), as do clube do treinador primeiro. */
export function dailyPaper(news: readonly NewsItem[]): NewsItem[] {
  if (news.length === 0) return [];
  const last = news[news.length - 1];
  const today = news.filter((n) => n.season === last.season && n.round === last.round);
  return [...today.filter((n) => n.mine), ...today.filter((n) => !n.mine)];
}
