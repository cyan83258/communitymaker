import { h } from '../../core/dom.js';

let host = null;

export function toast(message, { error = false, duration = 2200 } = {}) {
  if (!host) {
    host = h('div', { class: 'adm-toasts', role: 'status', 'aria-live': 'polite' });
    document.body.append(host);
  }
  const el = h('div', { class: error ? 'adm-toast is-error' : 'adm-toast' }, message);
  host.append(el);
  setTimeout(() => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 250);
  }, duration);
}
