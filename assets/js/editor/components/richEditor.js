// 게시글 본문 편집기: 글자색 · 글자 크기 · 사진 첨부 · [이미지] 자리 표시
import { h } from '../../core/dom.js';
import {
  sanitizeHtml, sanitizeToFragment, createImageFigure, createPlaceholder, IMG_CLASS, PLACEHOLDER_CLASS,
} from '../../core/sanitize.js';
import { confirmSheet } from '../ui/sheet.js';

const COLORS = ['#1f2328', '#e5484d', '#f76b15', '#e2a400', '#30a46c', '#29a3e8', '#3e63dd', '#8e4ec6', '#8b8d98'];
const SIZES = [
  { px: 12, label: '아주 작게' },
  { px: 13, label: '작게' },
  { px: 15, label: '보통' },
  { px: 18, label: '크게' },
  { px: 22, label: '아주 크게' },
  { px: 28, label: '제목급' },
  { px: 36, label: '최대' },
];
const ATOMIC_SELECTOR = `.${IMG_CLASS}, .${PLACEHOLDER_CLASS}`;

/**
 * @param {{
 *   html: string,
 *   resolveAsset: (id: string) => string|undefined,
 *   onChange: (html: string) => void,
 *   onPickImages: () => Promise<string[]>,
 * }} opts  onPickImages: 이미지를 골라 저장하고 에셋 ID 배열을 돌려주는 함수
 */
export function richEditor({ html, resolveAsset, onChange, onPickImages }) {
  const editor = h('div', {
    class: 'adm-rte-area cm-body',
    contenteditable: 'true',
    role: 'textbox',
    'aria-multiline': 'true',
    spellcheck: 'false',
  });
  editor.append(sanitizeToFragment(html, resolveAsset));
  lockAtomicBlocks();

  // ── 선택 영역 저장 (툴바를 눌러도 선택이 유지되도록) ──
  let savedRange = null;
  const onSelectionChange = () => {
    const sel = document.getSelection();
    if (sel.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }
  };
  document.addEventListener('selectionchange', onSelectionChange);

  function restoreSelection() {
    editor.focus({ preventScroll: true });
    const sel = document.getSelection();
    sel.removeAllRanges();
    if (savedRange && editor.contains(savedRange.commonAncestorContainer)) {
      sel.addRange(savedRange);
    } else {
      const r = document.createRange();
      r.selectNodeContents(editor);
      r.collapse(false);
      sel.addRange(r);
    }
  }

  // 입력마다 정리(sanitize)하지 않도록 잠시 모았다가 반영한다.
  let emitTimer = null;
  const flushEmit = () => {
    if (emitTimer === null) return;
    clearTimeout(emitTimer);
    emitTimer = null;
    onChange(sanitizeHtml(editor.innerHTML));
  };
  const emit = () => {
    clearTimeout(emitTimer);
    emitTimer = setTimeout(flushEmit, 250);
  };

  function lockAtomicBlocks() {
    editor.querySelectorAll(ATOMIC_SELECTOR).forEach((el) => el.setAttribute('contenteditable', 'false'));
    if (!editor.firstChild) editor.append(h('p', null, h('br')));
  }

  // ── 서식 적용 ──
  function exec(command, value) {
    restoreSelection();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(command, false, value);
    onSelectionChange();
    emit();
  }

  function applySize(px) {
    // fontSize 명령은 1~7 단계만 지원하므로 7로 표시한 뒤 실제 px 로 바꾼다.
    exec('fontSize', '7');
    editor.querySelectorAll('span[style*="xxx-large"], font[size="7"]').forEach((el) => {
      if (el.tagName === 'FONT') {
        const span = h('span', { style: { fontSize: `${px}px` } });
        span.append(...el.childNodes);
        el.replaceWith(span);
      } else {
        el.style.fontSize = `${px}px`;
      }
    });
    emit();
  }

  // ── 블록(사진 / [이미지]) 삽입 ──
  function insertBlock(node) {
    restoreSelection();
    const sel = document.getSelection();
    let anchor = sel.rangeCount ? sel.getRangeAt(0).endContainer : null;
    while (anchor && anchor !== editor && anchor.parentNode !== editor) anchor = anchor.parentNode;

    node.setAttribute('contenteditable', 'false');
    if (anchor && anchor !== editor) anchor.after(node);
    else editor.append(node);

    // 사진 뒤에 바로 이어 쓸 수 있도록 빈 문단 확보 + 커서 이동
    let next = node.nextSibling;
    if (!next || next.matches?.(ATOMIC_SELECTOR)) {
      next = h('p', null, h('br'));
      node.after(next);
    }
    const r = document.createRange();
    r.setStart(next, 0);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    savedRange = r.cloneRange();
    emit();
  }

  async function insertImages() {
    const ids = await onPickImages();
    ids.forEach((id) => insertBlock(createImageFigure(id, resolveAsset(id))));
  }

  // ── 편집 영역 이벤트 ──
  editor.addEventListener('input', () => {
    if (!editor.firstChild) editor.append(h('p', null, h('br')));
    emit();
  });

  // 외부에서 붙여넣은 서식은 버리고 글자만 넣는다.
  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  });
  editor.addEventListener('drop', (e) => e.preventDefault());

  // 사진/자리 표시를 누르면 삭제 여부를 묻는다.
  editor.addEventListener('click', async (e) => {
    const block = e.target.closest(ATOMIC_SELECTOR);
    if (!block || !editor.contains(block)) return;
    const isImage = block.classList.contains(IMG_CLASS);
    const ok = await confirmSheet({ title: isImage ? '이 사진을 삭제할까요?' : '[이미지] 칸을 삭제할까요?', okLabel: '삭제', danger: true });
    if (!ok) return;
    block.remove();
    lockAtomicBlocks();
    emit();
  });

  // ── 툴바 ──
  // mousedown 기본 동작을 막아 버튼을 눌러도 편집 영역의 선택이 풀리지 않게 한다.
  const keepSelection = (e) => {
    if (e.target.tagName !== 'SELECT' && e.target.type !== 'color') e.preventDefault();
  };

  const customColor = h('input', {
    type: 'color',
    class: 'adm-rte-custom',
    title: '직접 고르기',
    value: '#1f2328',
    onChange: (e) => exec('foreColor', e.target.value),
  });

  const sizeSelect = h('select', {
    class: 'adm-rte-size',
    'aria-label': '글자 크기',
    onChange: (e) => {
      if (e.target.value) applySize(Number(e.target.value));
      e.target.value = '';
    },
  },
    h('option', { value: '' }, '글자 크기'),
    SIZES.map((s) => h('option', { value: String(s.px) }, `${s.label} (${s.px})`)),
  );

  const toolbar = h('div', { class: 'adm-rte-toolbar', onMousedown: keepSelection },
    h('div', { class: 'adm-rte-colors' },
      COLORS.map((c) =>
        h('button', {
          type: 'button',
          class: 'adm-rte-swatch',
          style: { background: c },
          title: c,
          'aria-label': `글자색 ${c}`,
          onClick: () => exec('foreColor', c),
        }),
      ),
      h('label', { class: 'adm-rte-swatch is-custom', title: '다른 색' }, customColor),
    ),
    h('div', { class: 'adm-rte-tools' },
      sizeSelect,
      h('button', { type: 'button', class: 'adm-rte-btn', onClick: insertImages }, '📷 사진'),
      h('button', { type: 'button', class: 'adm-rte-btn', onClick: () => insertBlock(createPlaceholder()) }, '[이미지]'),
      h('button', { type: 'button', class: 'adm-rte-btn', title: '선택한 글자의 색·크기 초기화', onClick: () => exec('removeFormat') }, '서식 지우기'),
    ),
  );

  return {
    el: h('div', { class: 'adm-rte' }, toolbar, editor),
    destroy() {
      flushEmit();
      document.removeEventListener('selectionchange', onSelectionChange);
    },
  };
}
