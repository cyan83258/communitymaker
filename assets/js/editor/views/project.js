// 결과물 편집 화면 (#/p/:id) — 기본 설정 · 광고 배너 · 게시글 목록
import { h, replace } from '../../core/dom.js';
import { authorName, NICK_BASES } from '../../shared/nickname.js';
import { createPost, LIMITS } from '../../shared/schema.js';
import { screen, section, saveStatus } from '../ui/layout.js';
import { field, textInput, segmented, itemActions, moveItem } from '../ui/fields.js';
import { confirmSheet } from '../ui/sheet.js';
import { bannerEditor } from '../components/bannerEditor.js';

const NICK_OPTIONS = NICK_BASES.map((v) => ({ value: v, label: v }));

export function mountProject(root, { session, navigate }) {
  const project = session.project;
  const changed = () => session.touch();
  const [status, unsubscribe] = saveStatus(session);

  const titleEl = h('span', null, project.name);
  const postList = h('div', { class: 'adm-stack' });

  function renderPosts() {
    const posts = project.posts;
    replace(postList,
      posts.length === 0 && h('div', { class: 'adm-empty is-small' }, '게시글이 없습니다.'),
      posts.map((post, i) =>
        h('div', { class: 'adm-post-row' },
          h('a', { class: 'adm-post-row-main', href: `#/p/${project.id}/post/${post.id}` },
            h('div', { class: 'adm-post-row-title' },
              post.title || '(제목 없음)',
              post.comments.length > 0 && h('span', { class: 'adm-count' }, ` [${post.comments.length}]`),
            ),
            h('div', { class: 'adm-post-row-meta' }, authorName(post)),
          ),
          itemActions({
            onUp: i > 0 ? () => movePost(i, -1) : null,
            onDown: i < posts.length - 1 ? () => movePost(i, 1) : null,
            onDelete: () => deletePost(i),
          }),
        ),
      ),
      posts.length < LIMITS.posts &&
        h('button', { type: 'button', class: 'adm-btn is-dashed is-block', onClick: addPost }, '+ 게시글 추가'),
    );
  }

  function addPost() {
    const post = createPost(project);
    project.posts.unshift(post); // 새 글은 목록 맨 위
    changed();
    navigate(`#/p/${project.id}/post/${post.id}`);
  }

  function movePost(i, delta) {
    if (moveItem(project.posts, i, delta)) {
      changed();
      renderPosts();
    }
  }

  async function deletePost(i) {
    const ok = await confirmSheet({
      title: '게시글을 삭제할까요?',
      message: `'${project.posts[i].title}' 과(와) 댓글이 모두 삭제됩니다.`,
      okLabel: '삭제',
      danger: true,
    });
    if (!ok) return;
    project.posts.splice(i, 1);
    changed();
    renderPosts();
  }

  renderPosts();

  replace(root,
    screen(
      {
        title: titleEl,
        backHref: '#/',
        right: [status, h('a', { class: 'adm-top-btn is-accent', href: `#/p/${project.id}/preview` }, '미리보기')],
      },
      section('기본 설정',
        field('결과물 이름 (나만 보임)', textInput(project, 'name', {
          maxLength: LIMITS.projectName,
          onChange: (v) => { titleEl.textContent = v; changed(); },
        })),
        field('사이트 이름', textInput(project, 'siteName', { maxLength: LIMITS.siteName, onChange: changed })),
        field('게시판 제목', textInput(project, 'boardTitle', { maxLength: LIMITS.boardTitle, onChange: changed })),
        field('새 글의 기본 닉네임',
          segmented(NICK_OPTIONS, project.defaultNickBase, (v) => { project.defaultNickBase = v; changed(); }),
          '새로 만드는 게시글에 적용됩니다. 글마다 따로 바꿀 수 있습니다.'),
      ),
      section('광고 배너', bannerEditor(session)),
      section(`게시글`, postList),
    ),
  );

  return unsubscribe;
}
