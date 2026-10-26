// 편집기 공통 화면 틀: 상단 바(뒤로가기 · 제목 · 우측 버튼) + 본문
import { h } from '../../core/dom.js';

const STATUS_TEXT = {
  saved: '저장됨',
  pending: '수정 중…',
  saving: '저장 중…',
  error: '저장 실패',
};

/**
 * @param {{ title: string, backHref?: string, right?: Node|Node[] }} opts
 * @param {...Node} body
 */
export function screen({ title, backHref, right }, ...body) {
  return h('div', { class: 'adm-screen' },
    h('header', { class: 'adm-top' },
      backHref ? h('a', { class: 'adm-top-back', href: backHref, 'aria-label': '뒤로' }, '‹') : h('span', { class: 'adm-top-logo' }, 'CM'),
      h('div', { class: 'adm-top-title' }, title),
      h('div', { class: 'adm-top-right' }, right),
    ),
    h('main', { class: 'adm-main' }, body),
  );
}

/** 자동 저장 상태 표시. 반환값 [element, unsubscribe] */
export function saveStatus(session) {
  const el = h('span', { class: 'adm-status' });
  const unsubscribe = session.subscribe((status) => {
    el.textContent = STATUS_TEXT[status];
    el.dataset.status = status;
  });
  return [el, unsubscribe];
}

export function section(title, ...children) {
  return h('section', { class: 'adm-section' },
    h('h2', { class: 'adm-section-title' }, title),
    children,
  );
}
