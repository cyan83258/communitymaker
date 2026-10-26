// 미리보기 (#/p/:id/preview[/post/:postId]) — 열람 페이지와 같은 렌더러를 사용한다.
import { h, replace } from '../../core/dom.js';
import { renderSite } from '../../site/render.js';
import { toPublicView } from '../../shared/schema.js';

export function mountPreview(root, { session, params }) {
  const base = `#/p/${session.id}/preview`;
  const links = { list: base, post: (id) => `${base}/post/${id}` };
  const backHref = params.postId ? `#/p/${session.id}/post/${params.postId}` : `#/p/${session.id}`;

  replace(root,
    h('div', { class: 'adm-preview' },
      h('div', { class: 'adm-preview-bar' },
        h('span', null, '미리보기'),
        h('a', { class: 'adm-btn is-small is-primary', href: backHref }, '편집으로'),
      ),
      renderSite({ view: toPublicView(session.project), postId: params.postId || null, links, resolveAsset: session.resolveAsset }),
    ),
  );
  window.scrollTo(0, 0);
}
