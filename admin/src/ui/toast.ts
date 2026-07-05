/** Art-directed toasts — thin-bordered, serif, with an optional undo action. */
import { h } from '../util';

let layer: HTMLElement | null = null;

function ensureLayer(): HTMLElement {
  if (!layer) {
    layer = h('div', { class: 'toast-layer', 'aria-live': 'polite' });
    document.body.append(layer);
  }
  return layer;
}

export interface ToastOpts {
  action?: { label: string; onClick: () => void };
  duration?: number;
}

export function toast(message: string, opts: ToastOpts = {}): void {
  const l = ensureLayer();
  const card = h('div', { class: 'toast', role: 'status' });
  card.append(h('span', { class: 'toast__msg' }, [message]));

  let timer: ReturnType<typeof setTimeout>;
  const dismiss = () => {
    card.classList.add('toast--out');
    setTimeout(() => card.remove(), 320);
  };

  if (opts.action) {
    const btn = h('button', { class: 'toast__action', type: 'button' }, [opts.action.label]);
    btn.addEventListener('click', () => {
      clearTimeout(timer);
      opts.action!.onClick();
      dismiss();
    });
    card.append(btn);
  }

  l.append(card);
  requestAnimationFrame(() => card.classList.add('toast--in'));
  timer = setTimeout(dismiss, opts.duration ?? 5000);
}
