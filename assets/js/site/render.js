// 가짜 커뮤니티 화면 렌더러. 열람 페이지와 편집기 미리보기가 함께 사용한다.
// view: { siteName, boardTitle, banners, posts }
// links: { list: string, post: (id) => string }
// resolveAsset: (assetId) => 이미지 주소 (편집기는 Blob URL, 열람 페이지는 data URL)
import { h } from '../core/dom.js';
import { sanitizeToFragment } from '../core/sanitize.js';
import { authorName, commentNames } from '../shared/nickname.js';
import { formatShort, formatFull } from '../shared/format.js';
import { commentDepths } from '../shared/comments.js';
import { hasImage } from '../shared/schema.js';

const fmtNumber = (n) => Number(n || 0).toLocaleString('ko-KR');

export function renderBanner(banner, resolveAsset) {
  if (banner.type === 'image') {
    const src = banner.image && resolveAsset(banner.image);
    return h('div', { class: 'cm-banner is-image' },
      src
        ? h('img', { src, alt: '', loading: 'lazy', decoding: 'async' })
        : h('span', { class: 'cm-banner-empty' }, '배너 이미지'),
      h('span', { class: 'cm-banner-ad' }, 'AD'),
    );
  }
  return h('div', { class: 'cm-banner', style: { background: banner.bg, color: banner.color } },
    banner.text,
    h('span', { class: 'cm-banner-ad' }, 'AD'),
  );
}

function renderBanners(banners, slot, resolveAsset) {
  return h('div', { class: 'cm-banners' },
    banners.filter((b) => b.slot === slot).map((b) => renderBanner(b, resolveAsset)));
}

function renderHeader(view, links, showBack) {
  return h('header', { class: 'cm-top' },
    showBack && h('a', { class: 'cm-top-back', href: links.list, 'aria-label': '목록으로' }, '‹'),
    h('a', { class: 'cm-logo', href: links.list }, view.siteName || '커뮤니티'),
  );
}

function renderList(view, links) {
  if (!view.posts.length) return h('div', { class: 'cm-empty' }, '게시글이 없습니다.');
  return h('ul', { class: 'cm-list' },
    view.posts.map((post) =>
      h('li', null,
        h('a', { class: 'cm-item', href: links.post(post.id) },
          h('div', { class: 'cm-item-title' },
            hasImage(post) && h('span', { class: 'cm-item-img', 'aria-label': '이미지 포함' }, '🖼️'),
            post.title,
            post.comments.length > 0 && h('span', { class: 'cm-item-cnt' }, `[${post.comments.length}]`),
          ),
          h('div', { class: 'cm-item-meta' },
            h('span', null, authorName(post)),
            h('span', null, formatShort(post.date)),
            h('span', null, `조회 ${fmtNumber(post.views)}`),
          ),
        ),
      ),
    ),
  );
}

function renderComments(post) {
  const names = commentNames(post);
  const depths = commentDepths(post.comments);
  return h('section', { class: 'cm-cmts' },
    h('div', { class: 'cm-cmts-head' }, '댓글 ', h('b', null, post.comments.length)),
    post.comments.length
      ? h('ul', { class: 'cm-cmt-list' },
          post.comments.map((c, i) =>
            h('li', {
              class: `cm-cmt${names[i].isAuthor ? ' is-author' : ''}${depths[i] ? ' is-reply' : ''}`,
              style: depths[i] ? { '--depth': depths[i] } : null,
            },
              h('div', { class: 'cm-cmt-head' },
                h('span', { class: 'cm-cmt-nick' }, depths[i] > 0 && h('span', { class: 'cm-reply-mark', 'aria-hidden': 'true' }, 'ㄴ'), names[i].name),
                h('span', { class: 'cm-cmt-date' }, formatShort(c.date)),
              ),
              h('p', { class: 'cm-cmt-text' }, c.text),
            ),
          ),
        )
      : h('div', { class: 'cm-cmt-empty' }, '등록된 댓글이 없습니다.'),
  );
}

function renderPost(post, links, resolveAsset) {
  return [
    h('article', null,
      h('header', { class: 'cm-post-head' },
        h('h2', { class: 'cm-post-title' }, post.title),
        h('div', { class: 'cm-post-meta' },
          h('div', { class: 'cm-post-meta-left' },
            h('span', { class: 'cm-nick' }, authorName(post)),
            h('span', null, formatFull(post.date)),
          ),
          h('div', { class: 'cm-post-meta-right' },
            h('span', null, `조회 ${fmtNumber(post.views)}`),
            h('span', null, `댓글 ${post.comments.length}`),
          ),
        ),
      ),
      h('div', { class: 'cm-body' }, sanitizeToFragment(post.bodyHtml, resolveAsset)),
    ),
    renderComments(post),
    h('div', { class: 'cm-post-nav' }, h('a', { class: 'cm-btn', href: links.list }, '목록')),
  ];
}

/**
 * 사이트 전체 화면을 만든다.
 * @param {{ view: object, postId?: string|null, links: object, resolveAsset: (id: string) => string|undefined }} opts
 */
export function renderSite({ view, postId = null, links, resolveAsset }) {
  const post = postId ? view.posts.find((p) => p.id === postId) : null;
  const content = post
    ? renderPost(post, links, resolveAsset)
    : postId
      ? h('div', { class: 'cm-empty' }, '삭제되었거나 존재하지 않는 게시글입니다.')
      : renderList(view, links);

  return h('div', { class: 'cm-site' },
    renderHeader(view, links, Boolean(postId)),
    h('div', { class: 'cm-board-head' }, h('h1', { class: 'cm-board-title' }, view.boardTitle)),
    renderBanners(view.banners, 'top', resolveAsset),
    content,
    renderBanners(view.banners, 'bottom', resolveAsset),
    h('footer', { class: 'cm-foot' }, `© ${view.siteName || '커뮤니티'}`),
  );
}
