import type { Behavior, Formation, Lineup, MatchState, Style } from '../../engine/index.ts';
import { suggestedCommand } from '../../game/assist.ts';
import {
  careerOffers,
  clubsContext,
  deserializeCareer,
  isSeasonOver,
  resolveUserLineup,
  serializeCareer,
  userClub,
  withUserLineup,
  type CareerState,
} from '../../game/career.ts';
import * as actions from '../../game/manager/actions.ts';
import { ensureManager } from '../../game/manager/core.ts';
import { finishManagedRound, planManagedRound, startManagedSeason, type ManagedOutcome, type ManagedPlan } from '../../game/manager/flow.ts';
import type { UpgradeId } from '../../game/manager/state.ts';
import { applyFormation, bestLineup, setPenaltyTaker, setTactics, swapPlayers } from '../../game/lineup-edit.ts';
import type { ClubsContext } from '../../game/queries.ts';
import { createSession, type Scheduler, type Session, type SessionSnapshot, type SpeedId, type TeamChanges } from '../../game/session.ts';

// Controlador do app: guarda o estado e traduz ações da tela em chamadas às camadas game/ e engine/.
// NÃO tem DOM e NÃO tem regra de futebol: tudo o que decide algo vem de game/ ou do engine.

export const SAVE_KEY = 'fm-brasileiro:carreira:v1';
export const SPEED_KEY = 'fm-brasileiro:velocidade';
/** Perfil LOCAL (sem servidor e sem senha): só um nome guardado neste navegador. Chave nova; não mexe no save. */
export const PROFILE_KEY = 'elite-manager:perfil-local';
export const AUDIO_KEY = 'elite-manager:som';
/** Propostas iniciais de uma carreira ainda não criada: geradas UMA vez e guardadas (recarregar não sorteia de novo). */
export const OFFERS_KEY = 'elite-manager:propostas-iniciais';

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
    if (career.userClubId !== null && !career.world.clubs[career.userClubId]) return { career: null, problem: SAVE_PROBLEM };
    return { career: ensureManager(career), problem: null };
  } catch {
    return { career: null, problem: SAVE_PROBLEM };
  }
}

function saveStatus(raw: string | null): { hasSave: boolean; saveProblem: string | null } {
  const r = readSave(raw);
  return { hasSave: r.career !== null, saveProblem: r.problem };
}

export type Screen =
  | 'ENTRY' // entrar / criar conta (perfil local)
  | 'MODE' // carreira offline / online (em desenvolvimento)
  | 'START' // continuar ou nova carreira, propostas iniciais
  | 'TEAM'
  | 'MATCH'
  | 'LEAGUE'
  | 'CLUBS'
  | 'CAREER'
  | 'MARKET'
  | 'NEWS'
  | 'CALENDAR'
  | 'STADIUM'
  | 'FINANCE';

/** Telas que só existem com clube (o treinador sem clube vê o mundo, mas não gere elenco, mercado, estádio nem caixa). */
export const CLUB_SCREENS: readonly Screen[] = ['TEAM', 'MARKET', 'STADIUM', 'FINANCE'];

export interface Profile {
  name: string;
  createdAt: string;
}

/** Pop-up de proposta: inicial (clubId das 3 ofertas) ou de emprego (jobId). analyze = tela ANALISAR CLUBE aberta. */
export interface ProposalView {
  clubId: string;
  jobId: string | null;
  analyze: boolean;
}
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
  offers: { seed: string; clubIds: string[]; refused: string[] } | null;
  profile: Profile | null;
  proposal: ProposalView | null;
  /** partida aberta no detalhe (VOLTAR À RODADA fecha) */
  matchView: string | null;
  /** jogador aberto no perfil */
  playerId: string | null;
  /** notícia aberta na página completa (NOTÍCIAS) */
  newsId: string | null;
  /** menu MAIS (celular) */
  more: boolean;
  audio: boolean;
  phase: MatchPhase;
  plan: ManagedPlan | null;
  snapshot: SessionSnapshot;
  outcome: ManagedOutcome | null;
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
/** Velocidades oferecidas na tela: LENTA, NORMAL e RÁPIDA. VERY_FAST e INSTANT existem só para testes e QA (__fm.setSpeed). */
export const UI_SPEEDS: SpeedId[] = ['SLOW', 'NORMAL', 'FAST'];

export class GameController {
  /** Trocada por uma nova em abandonCareer: uma sessão descartada (dispose) não avisa mais a tela nem avança o relógio. */
  session: Session;
  state: AppState;
  private readonly storage: KeyValueStorage;
  private readonly randomSeed: () => string;
  private readonly toastMs: number;
  private readonly listeners = new Set<() => void>();
  private readonly applied = new Set<string>();
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private clubsPause = false;
  private readonly scheduler: Scheduler | undefined;

  constructor(options: ControllerOptions) {
    this.storage = options.storage;
    this.randomSeed = options.randomSeed ?? (() => `carreira-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`);
    this.toastMs = options.toastMs ?? 4200;
    const saved = this.storage.get(SPEED_KEY) as SpeedId | null;
    // MUITO RÁPIDA e INSTANTÂNEA saíram da interface: quem as tinha salvas volta como RÁPIDA
    const speed: SpeedId = saved === 'INSTANT' || saved === 'VERY_FAST' ? 'FAST' : saved && SPEED_IDS.includes(saved) ? saved : 'NORMAL';
    let profile: Profile | null = null;
    try {
      const raw = this.storage.get(PROFILE_KEY);
      const p = raw ? (JSON.parse(raw) as Profile) : null;
      profile = p && typeof p.name === 'string' && p.name.trim() ? p : null;
    } catch {
      profile = null;
    }
    this.scheduler = options.scheduler;
    this.session = this.newSession(speed);
    this.state = {
      screen: 'ENTRY',
      career: null,
      ...saveStatus(this.storage.get(SAVE_KEY)),
      offers: this.loadOffers(),
      profile,
      proposal: null,
      matchView: null,
      playerId: null,
      newsId: null,
      more: false,
      audio: this.storage.get(AUDIO_KEY) === '1',
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
  }

  private newSession(speed: SpeedId): Session {
    const session = createSession({ scheduler: this.scheduler, speed, stopOnEvents: true });
    session.subscribe((snap) => this.onSession(snap));
    return session;
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

  // ----- entrada: perfil local e modo de jogo -----

  /** CRIAR CONTA: perfil LOCAL (só um nome neste navegador). Não há senha nem servidor: nada é autenticado. */
  createProfile(name: string): void {
    const n = name.trim();
    if (!n) return this.notify('Digite um nome para o perfil.', 'error');
    const profile: Profile = { name: n.slice(0, 32), createdAt: new Date().toISOString() };
    try {
      this.storage.set(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      /* sem armazenamento: o perfil vale enquanto a página estiver aberta */
    }
    this.set({ profile, screen: 'MODE' });
  }

  /** ENTRAR: usa o perfil local deste navegador. */
  enter(): void {
    if (!this.state.profile) return this.notify('Nenhum perfil neste navegador. Toque em CRIAR CONTA.', 'error');
    this.set({ screen: 'MODE' });
  }

  /** CONTINUAR COM GOOGLE: precisa do servidor do modo online, que ainda não existe. Não finge um login. */
  googleLogin(): void {
    this.notify('Login com Google depende do servidor online, ainda em desenvolvimento. Use um perfil local.', 'info');
  }

  leaveProfile(): void {
    this.set({ screen: 'ENTRY' });
  }

  chooseMode(mode: 'OFFLINE' | 'ONLINE'): void {
    if (mode === 'ONLINE') return this.notify('Modo online em desenvolvimento.', 'info');
    this.set({ screen: 'START' });
  }

  // ----- propostas iniciais -----

  private loadOffers(): AppState['offers'] {
    try {
      const raw = this.storage.get(OFFERS_KEY);
      const o = raw ? (JSON.parse(raw) as AppState['offers']) : null;
      return o && typeof o.seed === 'string' && Array.isArray(o.clubIds) && o.clubIds.length === 3 && Array.isArray(o.refused) ? o : null;
    } catch {
      return null;
    }
  }

  private storeOffers(o: AppState['offers']): void {
    try {
      if (o) this.storage.set(OFFERS_KEY, JSON.stringify(o));
      else this.storage.remove(OFFERS_KEY);
    } catch {
      /* sem armazenamento: valem enquanto a página estiver aberta */
    }
  }

  /**
   * As três propostas da carreira nova. Sem "sortear de novo": se já existem (nesta página ou salvas de antes de
   * recarregar), são as mesmas, com as recusas. Uma seed explícita (testes/QA) define a carreira testada.
   */
  offerClubs(seed?: string): void {
    const kept = this.state.offers ?? this.loadOffers();
    if (kept && !seed) {
      if (kept !== this.state.offers) this.set({ offers: kept });
      return;
    }
    const s = seed ?? this.randomSeed();
    const offers = { seed: s, clubIds: careerOffers(s), refused: [] as string[] };
    this.storeOffers(offers);
    this.set({ offers, proposal: null });
  }

  openProposal(clubId: string | null, jobId: string | null = null): void {
    this.set({ proposal: clubId ? { clubId, jobId, analyze: false } : null });
  }

  analyzeProposal(on: boolean): void {
    if (this.state.proposal) this.set({ proposal: { ...this.state.proposal, analyze: on } });
  }

  refuseOffer(clubId: string): void {
    const o = this.state.offers;
    if (!o) return;
    const offers = { ...o, refused: [...new Set([...o.refused, clubId])] };
    this.storeOffers(offers);
    this.set({ offers, proposal: null });
  }

  startCareer(coachName: string, clubId: string): void {
    const offers = this.state.offers;
    if (!offers) return this.notify('Receba as propostas primeiro.', 'error');
    try {
      const career = actions.newManagedCareer(offers.seed, coachName, clubId);
      this.applied.clear();
      this.storeOffers(null);
      this.set({ career, offers: null, proposal: null, phase: 'PRE', plan: null, outcome: null, screen: 'MATCH', leagueDivision: userClub(career).divisionId, clubId: null, selected: null, matchView: null });
      this.save();
      this.notify(`Bem-vindo ao ${userClub(career).name}, ${career.coach.name}!`, 'good');
    } catch (e) {
      this.fail(e);
    }
  }

  /** AGUARDAR PROPOSTAS: a carreira começa sem clube; o mundo joga as rodadas e propostas chegam. */
  waitForOffers(coachName: string): void {
    const offers = this.state.offers;
    if (!offers) return this.notify('Receba as propostas primeiro.', 'error');
    try {
      const career = actions.newManagedCareer(offers.seed, coachName, null);
      this.applied.clear();
      this.storeOffers(null);
      this.set({ career, offers: null, proposal: null, phase: 'PRE', plan: null, outcome: null, screen: 'MATCH', leagueDivision: career.world.divisions.find((d) => d.level === 4)?.id ?? null, clubId: null, selected: null, matchView: null });
      this.save();
      this.notify('Você está sem clube. Jogue as rodadas e acompanhe as propostas em CARREIRA.', 'info');
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
      this.set({ career, phase, plan: null, outcome: null, screen: 'MATCH', leagueDivision: career.userClubId ? userClub(career).divisionId : null, clubId: null, selected: null, matchView: null, proposal: null });
    } catch (e) {
      this.fail(e);
    }
  }

  abandonCareer(): void {
    this.storage.remove(SAVE_KEY);
    this.storeOffers(null); // carreira nova = propostas novas (é outra carreira, não um novo sorteio da mesma)
    // A sessão antiga é descartada (para o relógio de uma rodada em andamento) e uma nova a substitui;
    // reaproveitar a descartada deixava a primeira rodada da carreira nova presa em "Preparando a rodada…".
    this.session.dispose();
    this.session = this.newSession(this.state.speed);
    this.clubsPause = false;
    this.applied.clear();
    this.set({ snapshot: this.session.getState(), career: null, hasSave: false, saveProblem: null, offers: null, proposal: null, phase: 'PRE', plan: null, outcome: null, screen: 'START', clubId: null, selected: null, matchView: null, playerId: null });
  }

  // ----- navegação -----

  go(screen: Screen): void {
    if (!this.state.career && !['START', 'ENTRY', 'MODE'].includes(screen)) return;
    if (this.state.career && this.state.career.userClubId === null && CLUB_SCREENS.includes(screen)) return this.notify('Você está sem clube. Veja as propostas em CARREIRA.', 'info');
    const wasClubs = this.state.screen === 'CLUBS';
    this.set({ screen, selected: null, more: false, playerId: null, newsId: null });
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

  openMatch(matchId: string | null): void {
    this.set({ matchView: matchId });
  }

  openPlayer(id: string | null): void {
    this.set({ playerId: id });
  }

  /** Abre a página completa de uma notícia (null volta para a lista). */
  openNews(id: string | null): void {
    this.set({ newsId: id, screen: 'NEWS', more: false, playerId: null });
  }

  toggleMore(open?: boolean): void {
    this.set({ more: open ?? !this.state.more });
  }

  toggleAudio(): void {
    const audio = !this.state.audio;
    try {
      this.storage.set(AUDIO_KEY, audio ? '1' : '0');
    } catch {
      /* preferência só nesta página */
    }
    this.set({ audio });
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
      const plan = planManagedRound(career);
      this.set({ plan, outcome: null, matchView: null });
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

  /** CONTINUAR do intervalo ou de um lance que parou a partida. */
  continueStop(): void {
    this.session.continueStop();
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
      const round = this.state.snapshot.round;
      const outcome = finishManagedRound(career, this.session.results(), round ? round.matches : []);
      this.applied.add(plan.roundId);
      this.set({ career: outcome.career, outcome, phase: 'POST' });
      this.save();
      if (outcome.fired) this.notify('Você foi demitido. Acompanhe as propostas em CARREIRA.', 'error');
    } catch (e) {
      this.fail(e);
    }
  }

  /** Volta ao "antes da rodada" (ou vira a temporada, se ela terminou). */
  nextRound(): void {
    const career = this.state.career;
    if (!career || this.state.phase !== 'POST') return;
    try {
      const next = isSeasonOver(career) ? startManagedSeason(career).career : career;
      this.set({ career: next, phase: 'PRE', plan: null, outcome: null, matchView: null, leagueDivision: next.userClubId ? userClub(next).divisionId : this.state.leagueDivision });
      this.save();
      if (next !== career) this.notify(`Temporada ${next.season} começou.`, 'good');
    } catch (e) {
      this.fail(e);
    }
  }

  // ----- gestão (fora da rodada) -----

  /** Executa uma ação da camada de gestão: só fora da rodada; salva e mostra a mensagem dela. */
  act(fn: (c: CareerState) => actions.ActionResult): boolean {
    const career = this.state.career;
    if (!career) return false;
    if (this.state.phase === 'LIVE') {
      this.notify('Espere a rodada terminar.', 'error');
      return false;
    }
    try {
      const res = fn(career);
      this.set({ career: res.career });
      this.save();
      this.notify(res.message, res.kind);
      return true;
    } catch (e) {
      this.fail(e);
      return false;
    }
  }

  toggleWish(id: string): void {
    this.act((c) => actions.toggleWish(c, id));
  }
  makeOffer(id: string, amount: number): void {
    this.act((c) => actions.makeOffer(c, id, amount));
  }
  acceptCounter(negId: string): void {
    this.act((c) => actions.acceptCounter(c, negId));
  }
  cancelNegotiation(negId: string): void {
    this.act((c) => actions.cancelNegotiation(c, negId));
  }
  signFreeAgent(id: string): void {
    this.act((c) => actions.signFreeAgent(c, id));
  }
  requestLoan(id: string): void {
    this.act((c) => actions.requestLoan(c, id));
  }
  loanOut(id: string): void {
    this.act((c) => actions.loanOut(c, id));
  }
  openAuction(id: string, price: number): void {
    this.act((c) => actions.openAuction(c, id, price));
  }
  withdrawAuction(id: string): void {
    this.act((c) => actions.withdrawAuction(c, id));
  }
  startRenewal(id: string): void {
    this.act((c) => actions.startRenewal(c, id));
  }
  proposeRenewal(id: string, salary: number, years: number): void {
    this.act((c) => actions.proposeRenewal(c, id, salary, years));
  }
  startWork(id: UpgradeId): void {
    this.act((c) => actions.startWork(c, id));
  }
  takeBankLoan(amount: number, rounds: number): void {
    this.act((c) => actions.takeBankLoan(c, amount, rounds));
  }
  payOffBankLoan(id: string): void {
    this.act((c) => actions.payOffBankLoan(c, id));
  }
  chooseSponsor(id: string): void {
    this.act((c) => actions.chooseSponsor(c, id));
  }
  acceptJob(id: string): void {
    if (this.act((c) => actions.acceptJob(c, id))) {
      const c = this.state.career!;
      this.set({ proposal: null, screen: 'MATCH', leagueDivision: c.userClubId ? userClub(c).divisionId : this.state.leagueDivision });
    }
  }
  refuseJob(id: string): void {
    if (this.act((c) => actions.refuseJob(c, id))) this.set({ proposal: null });
  }
  answerNational(accept: boolean): void {
    this.act((c) => actions.answerNational(c, accept));
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
