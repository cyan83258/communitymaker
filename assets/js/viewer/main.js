// 열람 모드 진입점. ?id=공유ID 로 data/<공유ID>.json 을 받아 해시 라우팅으로 화면을 그린다.
import { h, replace } from '../core/dom.js';
import { renderSite } from '../site/render.js';
import { isId } from '../shared/id.js';
import { parseExportFile, toPublicView } from '../shared/schema.js';

const root = document.getElementById('app');
const links = { list: '#/', post: (id) => `#/post/${encodeURIComponent(id)}` };

function showMessage(text) {
  document.title = '페이지를 찾을 수 없습니다';
  replace(root, h('div', { class: 'cm-notfound' }, h('b', null, '404'), h('p', null, text)));
}

async function loadView(shareId) {
  // GitHub Pages 는 약 10분 캐시하므로 매번 변경 여부를 확인한다(no-cache = 재검증).
  const res = await fetch(`data/${shareId}.json`, { cache: 'no-cache' });
  if (!res.ok) return null;
  const parsed = parseExportFile(await res.json().catch(() => null));
  return parsed && { view: toPublicView(parsed.content), assets: parsed.assets };
}

function startRouter({ view, assets }) {
  const resolveAsset = (id) => assets[id];
  let listScroll = 0;
  let lastPostId = null;

  const currentPostId = () => {
    const m = location.hash.match(/^#\/post\/([^/]+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  };

  function render() {
    const postId = currentPostId();
    if (lastPostId === null && postId) listScroll = window.scrollY;

    replace(root, renderSite({ view, postId, links, resolveAsset }));

    const post = postId && view.posts.find((p) => p.id === postId);
    document.title = post ? `${post.title} - ${view.boardTitle}` : view.boardTitle || view.siteName;
    window.scrollTo(0, postId ? 0 : listScroll);
    lastPostId = postId;
  }

  window.addEventListener('hashchange', render);
  render();
}

const shareId = new URLSearchParams(location.search).get('id');
if (!isId(shareId)) {
  showMessage('존재하지 않는 페이지입니다.');
} else {
  loadView(shareId)
    .then((data) => (data ? startRouter(data) : showMessage('존재하지 않거나 삭제된 페이지입니다.')))
    .catch(() => showMessage('페이지를 불러오지 못했습니다.'));
}
