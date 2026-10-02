import type { Club } from '../../../engine/index.ts';
import { h, type Child } from '../dom.ts';
import { initials } from '../format.ts';

// Peças visuais reutilizadas em todas as telas. Só apresentação: nenhuma regra de jogo.

/** Escudo simples com as cores do clube (clubes fictícios: não há imagens). */
export function crest(club: Pick<Club, 'name' | 'primaryColor' | 'secondaryColor'>, size: 'sm' | 'md' | 'lg' = 'md'): HTMLElement {
  return h('span', { class: `crest crest-${size}`, style: `background:${club.primaryColor};color:${club.secondaryColor};border-color:${club.secondaryColor}`, 'aria-hidden': 'true' }, initials(club.name));
}

export function card(title: string | null, ...children: Child[]): HTMLElement {
  return h('section', { class: 'card' }, title ? h('h3', { class: 'card-title' }, title) : null, children);
}

export function btn(label: string, onClick: () => void, opts: { kind?: 'primary' | 'ghost' | 'danger' | 'good'; disabled?: boolean; big?: boolean; title?: string } = {}): HTMLElement {
  return h('button', { class: `btn btn-${opts.kind ?? 'ghost'}${opts.big ? ' btn-big' : ''}`, type: 'button', disabled: opts.disabled === true, title: opts.title, onClick }, label);
}

export function segmented<T extends string>(options: readonly { id: T; label: string }[], current: T, onPick: (id: T) => void, disabled = false): HTMLElement {
  return h('div', { class: 'seg', role: 'group' }, options.map((o) => h('button', { type: 'button', class: `seg-btn${o.id === current ? ' on' : ''}`, disabled, 'aria-pressed': o.id === current ? 'true' : 'false', onClick: () => onPick(o.id) }, o.label)));
}

export function stat(label: string, value: Child, tone: 'default' | 'good' | 'bad' = 'default'): HTMLElement {
  return h('div', { class: `stat stat-${tone}` }, h('span', { class: 'stat-v' }, value), h('span', { class: 'stat-l' }, label));
}

export function badge(text: string, tone: 'blue' | 'green' | 'red' | 'yellow' | 'gray' = 'gray'): HTMLElement {
  return h('span', { class: `badge badge-${tone}` }, text);
}

export function empty(text: string): HTMLElement {
  return h('p', { class: 'empty' }, text);
}

/** Pop-up genérico (mesma estrutura dos pop-ups de decisão: h2 no cabeçalho, botões no rodapé). */
export function modalBox(title: string, subtitle: Child, body: Child[], footer: Child[], tone: 'blue' | 'red' | 'yellow' = 'blue', extraClass = ''): HTMLElement {
  return h('div', { class: 'modal-back', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('div', { class: `modal modal-${tone} ${extraClass}` }, h('header', null, h('h2', null, title), subtitle ? h('p', { class: 'muted' }, subtitle) : null), h('div', { class: 'modal-body', 'data-keep': 'modal' }, body), h('footer', null, footer)));
}

/** Faixa discreta com as cores do clube (identidade sem escudo oficial). */
export function clubStripe(club: Pick<Club, 'primaryColor' | 'secondaryColor'>): HTMLElement {
  return h('span', { class: 'club-stripe', style: `background:linear-gradient(90deg, ${club.primaryColor} 0 50%, ${club.secondaryColor} 50% 100%)`, 'aria-hidden': 'true' });
}

export function tabsRow<T extends string>(options: readonly { id: T; label: string }[], current: T, onPick: (id: T) => void, cls = 'subtabs'): HTMLElement {
  return h('div', { class: cls, role: 'tablist' }, options.map((o) => h('button', { type: 'button', role: 'tab', class: `subtab${o.id === current ? ' on' : ''}`, 'aria-selected': o.id === current ? 'true' : 'false', onClick: () => onPick(o.id) }, o.label)));
}

/** Tabela simples: cabeçalhos e linhas (cada linha é uma lista de células). */
export function table(headers: readonly string[], rows: readonly { cells: Child[]; cls?: string; onClick?: () => void }[], cls = 'tbl compact', numeric: readonly number[] = []): HTMLElement {
  return h(
    'div',
    { class: 'tbl-wrap' },
    h(
      'table',
      { class: cls },
      h('thead', null, h('tr', null, headers.map((t, i) => h('th', { class: numeric.includes(i) ? 'n' : '' }, t)))),
      h('tbody', null, rows.map((r) => h('tr', { class: r.cls ?? '', onClick: r.onClick }, r.cells.map((c, i) => h('td', { class: numeric.includes(i) ? 'n' : '' }, c))))),
    ),
  );
}
