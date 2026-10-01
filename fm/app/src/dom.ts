// Utilitários mínimos de DOM (sem framework: o ambiente de build não tem npm). Nenhuma regra de futebol mora aqui.

export type Child = Node | string | number | null | undefined | false | Child[];
export type Props = Record<string, unknown> | null;

/** Cria um elemento. Propriedades: class, on<Evento>, data-*, aria-*, disabled/checked/value e demais atributos. */
export function h(tag: string, props?: Props, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = String(value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    else if (key === 'value') (el as HTMLInputElement).value = String(value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

function append(parent: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(parent, c);
    else parent.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

/** Troca o conteúdo de root, preservando a rolagem dos elementos marcados com data-keep="nome". */
export function render(root: HTMLElement, ...children: Child[]): void {
  const kept = new Map<string, number>();
  root.querySelectorAll<HTMLElement>('[data-keep]').forEach((e) => kept.set(e.dataset.keep as string, e.scrollTop));
  root.replaceChildren();
  append(root, children);
  root.querySelectorAll<HTMLElement>('[data-keep]').forEach((e) => {
    const top = kept.get(e.dataset.keep as string);
    if (top !== undefined) e.scrollTop = top;
  });
}
