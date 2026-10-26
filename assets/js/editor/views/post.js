// 게시글 편집 화면 (#/p/:id/post/:postId)
import { h, replace } from '../../core/dom.js';
import { authorName, NICK_BASES } from '../../shared/nickname.js';
import { LIMITS } from '../../shared/schema.js';
import { screen, section, saveStatus } from '../ui/layout.js';
import { field, textInput, segmented } from '../ui/fields.js';
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
          field('조회수', h('input', {
            class: 'adm-input',
            type: 'number',
            min: 0,
            max: LIMITS.views,
            inputmode: 'numeric',
            value: String(post.views),
            onInput: (e) => {
              post.views = Math.max(0, Math.min(LIMITS.views, Math.floor(Number(e.target.value) || 0)));
              changed();
            },
          })),
        ),
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
