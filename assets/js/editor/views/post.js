// 게시글 편집 화면 (#/p/:id/post/:postId)
import { h, replace } from '../../core/dom.js';
import { authorName, NICK_BASES } from '../../shared/nickname.js';
import { LIMITS, CONCEPT_THRESHOLD, isConcept } from '../../shared/schema.js';
import { screen, section, saveStatus } from '../ui/layout.js';
import { field, textInput, segmented, countInput } from '../ui/fields.js';
import { promptSheet } from '../ui/sheet.js';
import { richEditor } from '../components/richEditor.js';
import { commentEditor } from '../components/commentEditor.js';
import { pickImages, addImages } from '../upload.js';

const NICK_OPTIONS = NICK_BASES.map((v) => ({ value: v, label: v }));

export function mountPost(root, { session, params, navigate }) {
  const project = session.project;
  const post = session.findPost(params.postId);
  const projectHref = `#/p/${project.id}`;
  if (!post) {
    navigate(projectHref, { replace: true });
    return;
  }

  const changed = () => session.touch();
  const [status, unsubscribe] = saveStatus(session);

  // ── 글쓴이 닉네임 ──
  const authorBtn = h('button', {
    type: 'button',
    class: 'adm-nick-btn is-large',
    onClick: async () => {
      const value = await promptSheet({
        title: '글쓴이 닉네임',
        value: post.authorNick,
        placeholder: `비워 두면 '${post.nickBase}'`,
        maxLength: LIMITS.nick,
        hint: '비워 두면 위에서 고른 기본 닉네임을 사용합니다.',
      });
      if (value === null) return;
      post.authorNick = value.trim();
      onNickChange();
    },
  });

  const comments = commentEditor(session, post);

  function onNickChange() {
    authorBtn.textContent = authorName(post);
    authorBtn.classList.toggle('is-auto', !post.authorNick);
    comments.refreshNames();
    changed();
  }
  authorBtn.textContent = authorName(post);
  authorBtn.classList.toggle('is-auto', !post.authorNick);

  // ── 추천 / 비추천 ──
  const conceptHint = h('p', { class: 'adm-hint' });
  function refreshConcept() {
    conceptHint.textContent = isConcept(post)
      ? `⭐ 개념글로 표시됩니다. (추천 - 비추천 = ${post.upvotes - post.downvotes})`
      : `추천 - 비추천이 ${CONCEPT_THRESHOLD} 이상이면 목록에 ⭐ 개념글 표시가 붙습니다. (현재 ${post.upvotes - post.downvotes})`;
  }
  function onVoteChange() {
    refreshConcept();
    changed();
  }
  refreshConcept();

  // ── 본문 ──
  const body = richEditor({
    html: post.bodyHtml,
    resolveAsset: session.resolveAsset,
    onChange: (html) => {
      post.bodyHtml = html;
      changed();
    },
    onPickImages: async () => addImages(session, await pickImages({ multiple: true })),
  });

  replace(root,
    screen(
      {
        title: '게시글 편집',
        backHref: projectHref,
        right: [status, h('a', { class: 'adm-top-btn is-accent', href: `${projectHref}/preview/post/${post.id}` }, '미리보기')],
      },
      section('글 정보',
        field('제목', textInput(post, 'title', { maxLength: LIMITS.postTitle, onChange: changed })),
        h('div', { class: 'adm-field' },
          h('span', { class: 'adm-field-label' }, '글쓴이 닉네임'),
          h('div', { class: 'adm-row is-center' },
            segmented(NICK_OPTIONS, post.nickBase, (v) => {
              post.nickBase = v;
              onNickChange();
            }),
            authorBtn,
          ),
          h('span', { class: 'adm-hint' }, '기본 닉네임은 댓글 자동 이름(ㅇㅇ1, 익명1…)에도 쓰입니다. 닉네임을 눌러 직접 바꿀 수 있습니다.'),
        ),
        h('div', { class: 'adm-row' },
          field('작성 시간', h('input', {
            class: 'adm-input',
            type: 'datetime-local',
            value: post.date,
            onChange: (e) => {
              if (!e.target.value) return;
              post.date = e.target.value;
              changed();
            },
          })),
          field('조회수', countInput(post, 'views', { max: LIMITS.views, onChange: changed })),
        ),
        h('div', { class: 'adm-row' },
          field('추천', countInput(post, 'upvotes', { max: LIMITS.votes, onChange: onVoteChange })),
          field('비추천', countInput(post, 'downvotes', { max: LIMITS.votes, onChange: onVoteChange })),
        ),
        conceptHint,
      ),
      section('본문', body.el, h('p', { class: 'adm-hint' }, '글자를 선택한 뒤 색상·크기를 고르세요. 사진이나 [이미지] 칸을 누르면 삭제할 수 있습니다.')),
      section(`댓글`, comments.el),
    ),
  );

  return () => {
    body.destroy();
    unsubscribe();
  };
}
