// 댓글 편집 목록. 닉네임 자동 번호(ㅇㅇ1, ㅇㅇ2…), 글쓴이 댓글, 답글(최대 대대대댓글)을 다룬다.
import { h, replace } from '../../core/dom.js';
import { commentNames } from '../../shared/nickname.js';
import { createComment, LIMITS } from '../../shared/schema.js';
import { addMinutes } from '../../shared/format.js';
import {
  MAX_REPLY_DEPTH, commentDepths, insertReply, removeSubtree, moveSubtree, siblingIndex, subtreeEnd,
} from '../../shared/comments.js';
import { itemActions } from '../ui/fields.js';
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

  const DEPTH_LABEL = ['', '대댓글', '대대댓글', '대대대댓글'];

  function commentCard(comment, index, depth) {
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

    const canReply = depth < MAX_REPLY_DEPTH && post.comments.length < LIMITS.comments;
    const card = h('div', {
      class: depth ? 'adm-cmt is-reply' : 'adm-cmt',
      style: depth ? { '--depth': depth } : null,
    },
      depth > 0 && h('div', { class: 'adm-cmt-depth' }, `ㄴ ${DEPTH_LABEL[depth]}`),
      h('div', { class: 'adm-cmt-head' },
        nickBtn,
        itemActions({
          onUp: siblingIndex(post.comments, index, -1) >= 0 ? () => move(index, -1) : null,
          onDown: siblingIndex(post.comments, index, 1) >= 0 ? () => move(index, 1) : null,
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
        canReply && h('button', { type: 'button', class: 'adm-btn is-small', onClick: () => reply(index) }, '답글'),
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

  function addAndFocus(at) {
    changed();
    render();
    wrap.querySelectorAll('textarea')[at]?.focus();
  }

  function reply(parentIndex) {
    const comments = post.comments;
    const prev = comments[subtreeEnd(comments, parentIndex) - 1];
    const comment = { ...createComment(post), date: addMinutes(prev.date, 1) };
    addAndFocus(insertReply(comments, parentIndex, comment));
  }

  function move(index, delta) {
    if (moveSubtree(post.comments, index, delta)) {
      changed();
      render();
    }
  }

  async function remove(index) {
    const replies = subtreeEnd(post.comments, index) - index - 1;
    const ok = await confirmSheet({
      title: '이 댓글을 삭제할까요?',
      message: replies ? `달린 답글 ${replies}개도 함께 삭제됩니다.` : '',
      okLabel: '삭제',
      danger: true,
    });
    if (!ok) return;
    removeSubtree(post.comments, index);
    changed();
    render();
  }

  function render() {
    nameUpdaters = [];
    const depths = commentDepths(post.comments);
    replace(wrap,
      post.comments.map((c, i) => commentCard(c, i, depths[i])),
      post.comments.length === 0 && h('div', { class: 'adm-empty is-small' }, '댓글이 없습니다.'),
      post.comments.length < LIMITS.comments &&
        h('button', {
          type: 'button',
          class: 'adm-btn is-dashed is-block',
          onClick: () => {
            post.comments.push(createComment(post));
            addAndFocus(post.comments.length - 1);
          },
        }, '+ 댓글 추가'),
    );
    refreshNames();
  }

  render();
  return { el: wrap, refreshNames };
}
