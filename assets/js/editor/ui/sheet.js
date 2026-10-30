// 하단 시트 형태의 대화상자 (prompt / confirm 대체).
import { h } from '../../core/dom.js';

/**
 * @param {{ title: string, body?: Node|Node[], actions: { label: string, value: any, kind?: 'primary'|'danger' }[], initialFocus?: HTMLElement, vertical?: boolean }} opts
 *        vertical: 버튼을 세로 목록(메뉴)으로 배치
 * @returns {Promise<any>} 누른 버튼의 value (바깥을 누르면 null)
 */
export function openSheet({ title, body = [], actions, initialFocus, vertical = false }) {
  return new Promise((resolve) => {
    const close = (value) => {
      document.removeEventListener('keydown', onKey);
      overlay.classList.add('is-out');
      setTimeout(() => overlay.remove(), 180);
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(null);
    };

    const sheet = h('form', {
      class: 'adm-sheet',
      onSubmit: (e) => {
        e.preventDefault();
        const primary = actions.find((a) => a.kind === 'primary' || a.kind === 'danger');
        if (primary) close(primary.value);
      },
    },
      h('div', { class: 'adm-sheet-title' }, title),
      h('div', { class: 'adm-sheet-body' }, body),
      h('div', { class: vertical ? 'adm-sheet-actions is-vertical' : 'adm-sheet-actions' },
        actions.map((a) =>
          h('button', {
            type: a.kind ? 'submit' : 'button',
            class: `adm-btn ${a.kind === 'primary' ? 'is-primary' : a.kind === 'danger' ? 'is-danger' : ''}`,
            onClick: (e) => {
              e.preventDefault();
              close(a.value);
            },
          }, a.label),
        ),
      ),
    );

    const overlay = h('div', {
      class: 'adm-overlay',
      onClick: (e) => {
        if (e.target === overlay) close(null);
      },
    }, sheet);

    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    (initialFocus || sheet.querySelector('button'))?.focus();
  });
}

export function confirmSheet({ title, message = '', okLabel = '확인', danger = false }) {
  return openSheet({
    title,
    body: message ? h('p', { class: 'adm-sheet-msg' }, message) : [],
    actions: [
      { label: '취소', value: false },
      { label: okLabel, value: true, kind: danger ? 'danger' : 'primary' },
    ],
  });
}

/**
 * 텍스트 입력. 취소하면 null.
 * @param {{ title: string, value?: string, placeholder?: string, maxLength?: number, hint?: string }} opts
 */
export async function promptSheet({ title, value = '', placeholder = '', maxLength = 100, hint = '' }) {
  const input = h('input', { class: 'adm-input', type: 'text', value, placeholder, maxlength: maxLength });
  const ok = await openSheet({
    title,
    body: [input, hint && h('p', { class: 'adm-hint' }, hint)],
    actions: [
      { label: '취소', value: false },
      { label: '확인', value: true, kind: 'primary' },
    ],
    initialFocus: input,
  });
  return ok ? input.value : null;
}
