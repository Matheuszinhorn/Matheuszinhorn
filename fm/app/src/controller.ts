import type { Behavior, Formation, Lineup, MatchState, Style } from '../../engine/index.ts';
import { suggestedCommand } from '../../game/assist.ts';
import {
  careerOffers,
  clubsContext,
  createCareer,
  deserializeCareer,
  finishRound,
  isSeasonOver,
  planRound,
  resolveUserLineup,
  serializeCareer,
  startNextSeason,
  userClub,
  withUserLineup,
  type CareerState,
  type RoundOutcome,
  type RoundPlan,
} from '../../game/career.ts';
import { applyFormation, bestLineup, setPenaltyTaker, setTactics, swapPlayers } from '../../game/lineup-edit.ts';
import type { ClubsContext } from '../../game/queries.ts';
import { createSession, type Scheduler, type Session, type SessionSnapshot, type SpeedId, type TeamChanges } from '../../game/session.ts';

// Controlador do app: guarda o estado e traduz ações da tela em chamadas às camadas game/ e engine/.
// NÃO tem DOM e NÃO tem regra de futebol: tudo o que decide algo vem de game/ ou do engine.

export const SAVE_KEY = 'fm-brasileiro:carreira:v1';
export const SPEED_KEY = 'fm-brasileiro:velocidade';

export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function memoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return { get: (k) => data.get(k) ?? null, set: (k, v) => void data.set(k, v), remove: (k) => void data.delete(k) };
}

/** localStorage quando existe e funciona; senão, memória (a carreira vale só enquanto a página estiver aberta). */
export function browserStorage(): KeyValueStorage {
  try {
    const ls = globalThis.localStorage;
    const probe = '__fm_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return { get: (k) => ls.getItem(k), set: (k, v) => ls.setItem(k, v), remove: (k) => ls.removeItem(k) };
  } catch {
    return memoryStorage();
  }
}

export const SAVE_PROBLEM = 'A carreira salva neste navegador não pode ser carregada: o arquivo está corrompido ou é de uma versão incompatível.';

/** Só para a TELA decidir o que mostrar. A validação continua sendo a de deserializeCareer; aqui também se confere que o
 * clube do jogador existe, porque sem ele nenhuma tela da carreira abre. Texto vazio conta como "sem save". */
function readSave(raw: string | null): { career: CareerState | null; problem: string | null } {
  if (raw === null || raw.trim() === '') return { career: null, problem: null };
  try {
    const career = deserializeCareer(raw);
    if (!career.world.clubs[career.userClubId]) return { career: null, problem: SAVE_PROBLEM };
    return { career, problem: null };
  } catch {
    return { career: null, problem: SAVE_PROBLEM };
  }
}

function saveStatus(raw: string | null): { hasSave: boolean; saveProblem: string | null } {
  const r = readSave(raw);
  return { hasSave: r.career !== null, saveProblem: r.problem };
}

export type Screen = 'START' | 'TEAM' | 'MATCH' | 'LEAGUE' | 'CLUBS' | 'CAREER';
/** PRE = rodada ainda não jogada · LIVE = rodada em andamento · POST = rodada terminada e aplicada à carreira */
export type MatchPhase = 'PRE' | 'LIVE' | 'POST';

export interface Toast {
  text: string;
  kind: 'info' | 'error' | 'good';
}

export interface AppState {
  screen: Screen;
  career: CareerState | null;
  hasSave: boolean;
  /** Existe algo salvo, mas não dá para carregar (corrompido/versão incompatível): a tela inicial avisa em vez de oferecer CONTINUAR. */
  saveProblem: string | null;
  offers: { seed: string; clubIds: string[] } | null;
  phase: MatchPhase;
  plan: RoundPlan | null;
  snapshot: SessionSnapshot;
  outcome: RoundOutcome | null;
  speed: SpeedId;
  leagueDivision: string | null;
  clubId: string | null;
  /** jogador selecionado no MEU TIME, à espera do outro lado da troca */
  selected: string | null;
  toast: Toast | null;
}

export interface ControllerOptions {
  storage: KeyValueStorage;
  scheduler?: Scheduler;
  randomSeed?: () => string;
  /** 0 desliga o sumiço automático do aviso (testes) */
  toastMs?: number;
}

const SPEED_IDS: SpeedId[] = ['SLOW', 'NORMAL', 'FAST', 'VERY_FAST', 'INSTANT'];

export class GameController {
  readonly session: Session;
  state: AppState;
  private readonly storage: KeyValueStorage;
  private readonly randomSeed: () => string;
  private readonly toastMs: number;
  private readonly listeners = new Set<() => void>();
  private readonly applied = new Set<string>();
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private clubsPause = false;

  constructor(options: ControllerOptions) {
    this.storage = options.storage;
    this.randomSeed = options.randomSeed ?? (() => `carreira-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`);
    this.toastMs = options.toastMs ?? 4200;
    const saved = this.storage.get(SPEED_KEY) as SpeedId | null;
    const speed: SpeedId = saved && SPEED_IDS.includes(saved) ? saved : 'NORMAL';
    this.session = createSession({ scheduler: options.scheduler, speed });
    this.state = {
      screen: 'START',
      career: null,
      ...saveStatus(this.storage.get(SAVE_KEY)),
      offers: null,
      phase: 'PRE',
      plan: null,
      snapshot: this.session.getState(),
      outcome: null,
      speed,
      leagueDivision: null,
      clubId: null,
      selected: null,
      toast: null,
    };
    this.session.subscribe((snap) => this.onSession(snap));
  }

  // ----- infraestrutura -----

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn();
  }

  notify(text: string, kind: Toast['kind'] = 'info'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.set({ toast: { text, kind } });
    if (this.toastMs > 0) this.toastTimer = setTimeout(() => this.set({ toast: null }), this.toastMs);
  }

  dismissToast(): void {
    this.set({ toast: null });
  }

  /** Só pede um novo desenho da tela (o rascunho de um pop-up mudou); não altera nenhum estado do jogo. */
  notifyRender(): void {
    for (const fn of this.listeners) fn();
  }

  private fail(error: unknown): void {
    this.notify(error instanceof Error ? error.message : String(error), 'error');
  }

  private save(): void {
    const career = this.state.career;
    if (!career) return;
    try {
      this.storage.set(SAVE_KEY, serializeCareer(career));
      this.state = { ...this.state, hasSave: true, saveProblem: null };
    } catch {
      this.notify('Não foi possível salvar a carreira neste navegador.', 'error');
    }
  }

  // ----- início da carreira -----

  offerClubs(seed?: string): void {
    const s = seed ?? this.randomSeed();
    this.set({ offers: { seed: s, clubIds: careerOffers(s) } });
  }

  startCareer(coachName: string, clubId: string): void {
    const offers = this.state.offers;
    if (!offers) return this.notify('Sorteie as ofertas de clube primeiro.', 'error');
    try {
      const career = createCareer({ seed: offers.seed, coachName, clubId });
      this.applied.clear();
      this.set({ career, offers: null, phase: 'PRE', plan: null, outcome: null, screen: 'MATCH', leagueDivision: userClub(career).divisionId, clubId: null, selected: null });
      this.save();
      this.notify(`Bem-vindo ao ${userClub(career).name}, ${career.coach.name}!`, 'good');
    } catch (e) {
      this.fail(e);
    }
  }

  continueCareer(): void {
    const saved = readSave(this.storage.get(SAVE_KEY));
    if (!saved.career) {
      this.set(saveStatus(this.storage.get(SAVE_KEY)));
      return this.notify(saved.problem ?? 'Nenhuma carreira salva.', 'error');
    }
    try {
      const career = saved.career;
      this.applied.clear();
      // Salvo depois da rodada 38 e antes de INICIAR TEMPORADA: volta para a tela de fim de temporada (POST),
      // a única que oferece a virada. Em PRE só haveria JOGAR RODADA, que não existe mais nesta temporada.
      const phase: MatchPhase = isSeasonOver(career) ? 'POST' : 'PRE';
      this.set({ career, phase, plan: null, outcome: null, screen: 'MATCH', leagueDivision: userClub(career).divisionId, clubId: null, selected: null });
    } catch (e) {
      this.fail(e);
    }
  }

  abandonCareer(): void {
    this.storage.remove(SAVE_KEY);
    this.session.dispose();
    this.applied.clear();
    this.set({ career: null, hasSave: false, saveProblem: null, offers: null, phase: 'PRE', plan: null, outcome: null, screen: 'START', clubId: null, selected: null });
  }

  // ----- navegação -----

  go(screen: Screen): void {
    if (!this.state.career && screen !== 'START') return;
    const wasClubs = this.state.screen === 'CLUBS';
    this.set({ screen, selected: null });
    // Consultar CLUBES durante a rodada pausa a sessão (seção 24); sair de CLUBES retoma.
    if (this.state.phase === 'LIVE') {
      if (screen === 'CLUBS' && !wasClubs) {
        this.session.openClubs();
        this.clubsPause = true;
      } else if (screen !== 'CLUBS' && this.clubsPause) {
        this.session.closeClubs();
        this.clubsPause = false;
      }
    }
  }

  setLeagueDivision(id: string): void {
    this.set({ leagueDivision: id });
  }

  openClub(id: string | null): void {
    this.set({ clubId: id });
  }

  // ----- rodada -----

  get ctx(): ClubsContext | null {
    const c = this.state.career;
    return c ? clubsContext(c, this.state.snapshot.round) : null;
  }

  /** A partida do clube do jogador na rodada em andamento. */
  userMatch(): MatchState | null {
    const { plan, snapshot } = this.state;
    return plan && snapshot.round ? (snapshot.round.matches.find((m) => m.matchId === plan.userMatchId) ?? null) : null;
  }

  startRound(): void {
    const career = this.state.career;
    if (!career || this.state.phase !== 'PRE') return;
    try {
      const plan = planRound(career);
      this.set({ plan, outcome: null });
      this.session.startRound({ roundId: plan.roundId, seed: plan.seed, fixtures: plan.fixtures, controlledClubId: plan.controlledClubId });
      this.set({ phase: 'LIVE' });
      this.session.play();
    } catch (e) {
      this.fail(e);
    }
  }

  setSpeed(speed: SpeedId): void {
    this.session.setSpeed(speed);
    this.storage.set(SPEED_KEY, speed);
    this.set({ speed });
  }

  pause(): void {
    this.session.pause();
  }

  resume(): void {
    this.session.resume();
  }

  private onSession(snap: SessionSnapshot): void {
    this.set({ snapshot: snap });
    if (this.state.phase === 'LIVE' && snap.status === 'ROUND_FINISHED') this.applyRound();
  }

  /** Fase de aplicação: só depois que as 40 partidas terminam, e UMA vez por rodada. */
  private applyRound(): void {
    const { career, plan } = this.state;
    if (!career || !plan || this.applied.has(plan.roundId)) return;
    try {
      const outcome = finishRound(career, this.session.results());
      this.applied.add(plan.roundId);
      this.set({ career: outcome.career, outcome, phase: 'POST' });
      this.save();
    } catch (e) {
      this.fail(e);
    }
  }

  /** Volta ao "antes da rodada" (ou vira a temporada, se ela terminou). */
  nextRound(): void {
    const career = this.state.career;
    if (!career || this.state.phase !== 'POST') return;
    try {
      const next = isSeasonOver(career) ? startNextSeason(career) : career;
      this.set({ career: next, phase: 'PRE', plan: null, outcome: null, leagueDivision: userClub(next).divisionId });
      this.save();
      if (next !== career) this.notify(`Temporada ${next.season} começou.`, 'good');
    } catch (e) {
      this.fail(e);
    }
  }

  // ----- decisões (pop-ups) -----

  pendingMatch(): MatchState | null {
    const { pending, round } = this.state.snapshot;
    return pending && round ? (round.matches.find((m) => m.matchId === pending.matchId) ?? null) : null;
  }

  acceptSuggestion(): void {
    const match = this.pendingMatch();
    const decision = this.state.snapshot.pending?.decision;
    if (!match || !decision) return;
    const res = this.session.dispatch(suggestedCommand(match, decision));
    if (!res.ok) this.notify(res.message, 'error');
  }

  choosePenaltyTaker(playerId: string): void {
    const res = this.session.choosePenaltyTaker(playerId);
    if (!res.ok) this.notify(res.message, 'error');
  }

  openTeamAdjustment(): void {
    const res = this.session.openTeamAdjustment();
    if (!res.ok) this.notify(res.message, 'error');
  }

  sendAdjustment(changes?: TeamChanges): boolean {
    const res = this.session.adjustTeam(changes);
    if (!res.ok) {
      this.notify(res.message, 'error');
      return false;
    }
    return true;
  }

  // ----- MEU TIME (antes e depois da rodada) -----

  private editLineup(fn: (lineup: Lineup, career: CareerState) => Lineup): void {
    const career = this.state.career;
    if (!career) return;
    if (this.state.phase === 'LIVE') return this.notify('Durante a partida, use o botão MEU TIME da tela PARTIDA.', 'error');
    try {
      const current = resolveUserLineup(career).lineup;
      const next = withUserLineup(career, fn(current, career));
      this.set({ career: next, selected: null });
      this.save();
    } catch (e) {
      this.set({ selected: null });
      this.fail(e);
    }
  }

  /** Toque em um jogador: o primeiro toque seleciona, o segundo troca os dois. */
  selectPlayer(id: string): void {
    const first = this.state.selected;
    if (this.state.phase === 'LIVE') return this.notify('Durante a partida, use o botão MEU TIME da tela PARTIDA.', 'error');
    if (first === null) return this.set({ selected: id });
    if (first === id) return this.set({ selected: null });
    this.editLineup((l, c) => swapPlayers(l, c.world.players, first, id));
  }

  setFormation(f: Formation): void {
    this.editLineup((l, c) => applyFormation(userClub(c), c.world.players, l, f));
  }

  setTactics(t: { style?: Style; behavior?: Behavior }): void {
    this.editLineup((l) => setTactics(l, t));
  }

  setPenaltyTaker(id: string | null): void {
    this.editLineup((l) => setPenaltyTaker(l, id));
  }

  bestTeam(): void {
    this.editLineup((l, c) => bestLineup(userClub(c), c.world.players, l));
  }

  /** Pausa a rodada em andamento e sai da consulta a CLUBES ao descartar a sessão. */
  dispose(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.session.dispose();
  }
}
