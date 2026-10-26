// 편집기 진입점: 해시 라우팅 + 편집 세션 관리
import { h, replace } from '../core/dom.js';
import { requestPersistence } from '../core/db.js';
import { ProjectSession } from './session.js';
import { toast } from './ui/toast.js';
import { mountDashboard } from './views/dashboard.js';
import { mountProject } from './views/project.js';
import { mountPost } from './views/post.js';
import { mountPreview } from './views/preview.js';

const root = document.getElementById('app');

/** needsSession: 결과물 데이터를 불러와야 하는 화면 */
const ROUTES = [
  { re: /^#\/?$/, view: mountDashboard },
  { re: /^#\/p\/(?<id>\w+)$/, view: mountProject, needsSession: true },
  { re: /^#\/p\/(?<id>\w+)\/post\/(?<postId>\w+)$/, view: mountPost, needsSession: true },
  { re: /^#\/p\/(?<id>\w+)\/preview(?:\/post\/(?<postId>\w+))?$/, view: mountPreview, needsSession: true, keepScroll: true },
];

/** @type {ProjectSession|null} */
let session = null;
let cleanup = null;

function navigate(hash, { replace: replaceHistory = false } = {}) {
  if (replaceHistory) {
    history.replaceState(null, '', hash);
    route();
  } else {
    location.hash = hash;
  }
}

async function closeSession() {
  if (!session) return;
  const s = session;
  session = null;
  await s.close();
}

async function loadSession(id) {
  if (session?.id === id) return session;
  await closeSession();
  session = await ProjectSession.open(id);
  return session;
}

async function route() {
  cleanup?.();
  cleanup = null;

  const hash = location.hash || '#/';
  const match = ROUTES.map((r) => ({ r, m: r.re.exec(hash) })).find((x) => x.m);
  if (!match) return navigate('#/', { replace: true });

  const params = match.m.groups || {};
  try {
    const current = match.r.needsSession ? await loadSession(params.id) : (await closeSession(), null);
    // 불러오는 동안 다른 화면으로 이동했다면 무시
    if ((location.hash || '#/') !== hash) return;
    cleanup = (await match.r.view(root, { params, session: current, navigate })) || null;
    if (!match.r.keepScroll) window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    toast(err.message, { error: true });
    if (match.r.needsSession) navigate('#/', { replace: true });
  }
}

if (!('indexedDB' in window)) {
  replace(root, h('div', { class: 'adm-empty' }, '이 브라우저에서는 편집기를 사용할 수 없습니다.'));
} else {
  requestPersistence();
  window.addEventListener('hashchange', route);
  // 탭을 숨기거나 닫을 때 남은 변경분 저장
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') session?.flush();
  });
  window.addEventListener('beforeunload', (e) => {
    if (session?.dirty || session?.inFlight) {
      session.flush();
      e.preventDefault();
    }
  });
  route();
}
