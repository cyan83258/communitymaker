// 댓글 편집 목록. 닉네임 자동 번호(ㅇㅇ1, ㅇㅇ2…)와 글쓴이 댓글 표시를 실시간 반영한다.
import { h, replace } from '../../core/dom.js';
import { commentNames } from '../../shared/nickname.js';
import { createComment, LIMITS } from '../../shared/schema.js';
import { itemActions, moveItem } from '../ui/fields.js';
import { promptSheet, confirmSheet } from '../ui/sheet.js';

function autoResize(ta) {
  ta.style.height = 'auto';
  ta.style.height = `${ta.scrollHeight}px`;
}

/** @returns {{ el: HTMLElement, refreshNames: () => void }} */
export function commentEditor(session, post) {
  const wrap = h('div', { class: 'adm-stack' });
  const changed = () => session.touch();
  /** 카드별 닉네임 갱신 함수 */
  let nameUpdaters = [];

  function refreshNames() {
    const names = commentNames(post);
    nameUpdaters.forEach((fn, i) => fn(names[i]));
  }

  function commentCard(comment, index) {
    const nickBtn = h('button', {
      type: 'button',
      class: 'adm-nick-btn',
      onClick: async () => {
        const value = await promptSheet({
          title: '댓글 닉네임',
          value: comment.nick,
          placeholder: '비워 두면 자동 이름',
          maxLength: LIMITS.nick,
          hint: '비워 두면 순서에 따라 자동 이름(예: ㅇㅇ1)이 붙습니다.',
        });
        if (value === null) return;
        comment.nick = value.trim();
        refreshNames();
        changed();
      },
    });

    const textarea = h('textarea', {
      class: 'adm-input adm-textarea',
      rows: 2,
      value: comment.text,
      maxlength: LIMITS.commentText,
      placeholder: '댓글 내용',
      onInput: (e) => {
        comment.text = e.target.value;
        autoResize(e.target);
        changed();
      },
    });
    requestAnimationFrame(() => autoResize(textarea));

    const card = h('div', { class: 'adm-cmt' },
      h('div', { class: 'adm-cmt-head' },
        nickBtn,
        itemActions({
          onUp: index > 0 ? () => move(index, -1) : null,
          onDown: index < post.comments.length - 1 ? () => move(index, 1) : null,
          onDelete: () => remove(index),
        }),
      ),
      textarea,
      h('div', { class: 'adm-cmt-foot' },
        h('label', { class: 'adm-check' },
          h('input', {
            type: 'checkbox',
            checked: comment.isAuthor,
            onChange: (e) => {
              comment.isAuthor = e.target.checked;
              refreshNames();
              changed();
            },
          }),
          '글쓴이 댓글',
        ),
        h('input', {
          class: 'adm-input adm-date',
          type: 'datetime-local',
          value: comment.date,
          'aria-label': '댓글 작성 시간',
          onChange: (e) => {
            if (!e.target.value) return;
            comment.date = e.target.value;
            changed();
          },
        }),
      ),
    );

    nameUpdaters[index] = ({ name, isAuthor, isAuto }) => {
      nickBtn.textContent = name;
      nickBtn.disabled = isAuthor;
      nickBtn.title = isAuthor ? '글쓴이 댓글은 글쓴이 닉네임을 따릅니다.' : '눌러서 닉네임 수정';
      nickBtn.classList.toggle('is-auto', isAuto);
      card.classList.toggle('is-author', isAuthor);
    };
    return card;
  }

  function move(index, delta) {
    if (moveItem(post.comments, index, delta)) {
      changed();
      render();
    }
  }

  async function remove(index) {
    if (!(await confirmSheet({ title: '이 댓글을 삭제할까요?', okLabel: '삭제', danger: true }))) return;
    post.comments.splice(index, 1);
    changed();
    render();
  }

  function render() {
    nameUpdaters = [];
    replace(wrap,
      post.comments.map(commentCard),
      post.comments.length === 0 && h('div', { class: 'adm-empty is-small' }, '댓글이 없습니다.'),
      post.comments.length < LIMITS.comments &&
        h('button', {
          type: 'button',
          class: 'adm-btn is-dashed is-block',
          onClick: () => {
            post.comments.push(createComment(post));
            changed();
            render();
            wrap.querySelectorAll('textarea')[post.comments.length - 1]?.focus();
          },
        }, '+ 댓글 추가'),
    );
    refreshNames();
  }

  render();
  return { el: wrap, refreshNames };
}
