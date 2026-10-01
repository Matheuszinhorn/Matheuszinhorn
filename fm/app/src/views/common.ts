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
