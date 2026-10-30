// 페이지 나누기 계산 + 페이지 번호 UI (열람 목록·편집기 결과물 목록 공통)
import { h } from './dom.js';

/**
 * @template T
 * @param {T[]} items
 * @param {number} page 1부터 시작 (범위를 벗어나면 맞춰 준다)
 * @param {number} perPage
 * @returns {{ items: T[], page: number, totalPages: number }}
 */
export function paginate(items, page, perPage) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * perPage;
  return { items: items.slice(start, start + perPage), page: current, totalPages };
}

/** index 번째 항목이 있는 페이지 번호 */
export const pageOf = (index, perPage) => Math.floor(Math.max(0, index) / perPage) + 1;

/** 현재 페이지를 가운데 둔 최대 size 개의 페이지 번호 */
function pageWindow(page, totalPages, size) {
  let start = Math.max(1, page - Math.floor(size / 2));
  const end = Math.min(totalPages, start + size - 1);
  start = Math.max(1, end - size + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * 페이지 번호 막대. 1페이지뿐이면 null (표시 안 함).
 * href 를 주면 링크(<a>), onSelect 를 주면 버튼으로 만든다.
 * @param {{ page: number, totalPages: number, href?: (p: number) => string, onSelect?: (p: number) => void, size?: number }} opts
 */
export function pager({ page, totalPages, href, onSelect, size = 5 }) {
  if (totalPages <= 1) return null;

  const item = (target, label, { current = false, disabled = false, aria } = {}) => {
    const cls = `pager-item${current ? ' is-current' : ''}`;
    if (disabled) return h('span', { class: `${cls} is-disabled`, 'aria-hidden': 'true' }, label);
    const props = { class: cls, 'aria-label': aria, 'aria-current': current ? 'page' : null };
    return href
      ? h('a', { ...props, href: href(target) }, label)
      : h('button', { ...props, type: 'button', onClick: () => onSelect(target) }, label);
  };

  return h('nav', { class: 'pager', 'aria-label': '페이지' },
    item(page - 1, '‹', { disabled: page <= 1, aria: '이전 페이지' }),
    pageWindow(page, totalPages, size).map((p) => item(p, String(p), { current: p === page })),
    item(page + 1, '›', { disabled: page >= totalPages, aria: '다음 페이지' }),
  );
}
