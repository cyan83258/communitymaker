// 편집 폼에서 반복되는 입력 컴포넌트.
import { h } from '../../core/dom.js';

/** 라벨 + 입력 묶음 */
export function field(label, control, hint) {
  // 버튼 묶음 등을 label 로 감싸면 라벨 클릭이 첫 버튼 클릭으로 이어지므로 입력 요소일 때만 label 사용
  const isInput = ['INPUT', 'SELECT', 'TEXTAREA'].includes(control.tagName);
  return h(isInput ? 'label' : 'div', { class: 'adm-field' },
    h('span', { class: 'adm-field-label' }, label),
    control,
    hint && h('span', { class: 'adm-hint' }, hint),
  );
}

/** obj[key] 에 바로 반영되는 텍스트 입력 */
export function textInput(obj, key, { onChange, maxLength = 100, placeholder = '', type = 'text' } = {}) {
  return h('input', {
    class: 'adm-input',
    type,
    value: obj[key] ?? '',
    maxlength: maxLength,
    placeholder,
    onInput: (e) => {
      obj[key] = e.target.value;
      onChange?.(obj[key]);
    },
  });
}

/** 세그먼트 버튼 (단일 선택) */
export function segmented(options, current, onSelect) {
  const wrap = h('div', { class: 'adm-seg', role: 'radiogroup' });
  const buttons = options.map(({ value, label }) =>
    h('button', {
      type: 'button',
      role: 'radio',
      class: 'adm-seg-btn',
      onClick: () => {
        select(value);
        onSelect(value);
      },
    }, label),
  );
  const select = (value) =>
    buttons.forEach((b, i) => {
      const on = options[i].value === value;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
  select(current);
  wrap.append(...buttons);
  return wrap;
}

/** 위/아래/삭제 아이콘 버튼 묶음 */
export function itemActions({ onUp, onDown, onDelete, deleteLabel = '삭제' }) {
  return h('div', { class: 'adm-item-actions' },
    h('button', { type: 'button', class: 'adm-icon-btn', title: '위로', 'aria-label': '위로', disabled: !onUp, onClick: onUp }, '↑'),
    h('button', { type: 'button', class: 'adm-icon-btn', title: '아래로', 'aria-label': '아래로', disabled: !onDown, onClick: onDown }, '↓'),
    h('button', { type: 'button', class: 'adm-icon-btn is-danger', title: deleteLabel, 'aria-label': deleteLabel, onClick: onDelete }, '✕'),
  );
}

/** 배열 안 원소 이동 */
export function moveItem(arr, index, delta) {
  const to = index + delta;
  if (to < 0 || to >= arr.length) return false;
  [arr[index], arr[to]] = [arr[to], arr[index]];
  return true;
}
