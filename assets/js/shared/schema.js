// 결과물(프로젝트) 데이터 구조의 단일 정의.
// 새 필드를 추가할 때는 create* 기본값과 normalize* 두 곳만 수정하면 된다.
import { uid, isId } from './id.js';
import { toLocalInput, addMinutes, isLocalInput } from './format.js';
import { normalizeNickBase, DEFAULT_NICK_BASE } from './nickname.js';
import { toTreeOrder } from './comments.js';

export const LIMITS = {
  projectName: 60,
  siteName: 30,
  boardTitle: 40,
  postTitle: 150,
  nick: 30,
  bodyHtml: 300_000,
  commentText: 3000,
  bannerText: 100,
  banners: 10,
  posts: 300,
  comments: 500,
  views: 99_999_999,
  votes: 9_999_999,
};

/** 추천 - 비추천 이 이 값 이상이면 개념글(⭐) */
export const CONCEPT_THRESHOLD = 20;

export const BANNER_SLOTS = ['top', 'bottom'];
export const BANNER_TYPES = ['text', 'image'];

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// 이미지는 본문/배너에 '에셋 ID' 로만 기록하고, 실제 데이터는 따로 보관한다.
// (편집기: IndexedDB Blob, 내보낸 파일: data URL)
export const isAssetId = isId;
const DATA_URL_RE = /^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;
export const isImageDataUrl = (v) => typeof v === 'string' && DATA_URL_RE.test(v);

// ── 기본값 생성 ─────────────────────────────────────────────

export function createProject({ name = '새 결과물' } = {}) {
  const now = new Date().toISOString();
  return {
    id: uid(16),
    shareId: uid(10),
    name,
    siteName: '하늘커뮤',
    boardTitle: '자유 게시판',
    defaultNickBase: DEFAULT_NICK_BASE,
    banners: [],
    posts: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createPost(project) {
  return {
    id: uid(),
    title: '제목을 입력하세요',
    nickBase: normalizeNickBase(project?.defaultNickBase),
    authorNick: '',
    date: toLocalInput(),
    views: 0,
    upvotes: 0,
    downvotes: 0,
    bodyHtml: '<p>내용을 입력하세요.</p>',
    comments: [],
  };
}

export function createComment(post) {
  const last = post?.comments?.[post.comments.length - 1];
  return {
    id: uid(),
    text: '',
    nick: '',
    isAuthor: false,
    parentId: '', // 답글이면 부모 댓글 ID (comments.js 참고)
    date: addMinutes(last?.date || post?.date, 1),
  };
}

export function createBanner(slot = 'top') {
  return {
    id: uid(),
    slot,
    type: 'text',
    text: '광고 문구를 입력하세요',
    image: '',
    bg: '#e6f5fd',
    color: '#1b86c4',
  };
}

// ── 정규화 (서버 저장 전·클라이언트 로드 시 모두 사용) ───────────

const str = (v, max, fallback = '') => (typeof v === 'string' ? v.slice(0, max) : fallback);
const pick = (v, list) => (list.includes(v) ? v : list[0]);
const color = (v, fallback) => (typeof v === 'string' && COLOR_RE.test(v) ? v.toLowerCase() : fallback);
const date = (v) => (isLocalInput(v) ? v : toLocalInput());
const id = (v) => (isId(v) ? v : uid());
const list = (v, max, fn) => (Array.isArray(v) ? v.slice(0, max).map(fn) : []);
/** 0 ~ max 사이 정수 (잘못된 값은 0) */
export const clampCount = (v, max) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
};

export function normalizeComment(c = {}) {
  return {
    id: id(c.id),
    text: str(c.text, LIMITS.commentText),
    nick: str(c.nick, LIMITS.nick),
    isAuthor: c.isAuthor === true,
    parentId: isId(c.parentId) ? c.parentId : '',
    date: date(c.date),
  };
}

export function normalizePost(p = {}) {
  return {
    id: id(p.id),
    title: str(p.title, LIMITS.postTitle),
    nickBase: normalizeNickBase(p.nickBase),
    authorNick: str(p.authorNick, LIMITS.nick),
    date: date(p.date),
    views: clampCount(p.views, LIMITS.views),
    upvotes: clampCount(p.upvotes, LIMITS.votes),
    downvotes: clampCount(p.downvotes, LIMITS.votes),
    bodyHtml: str(p.bodyHtml, LIMITS.bodyHtml),
    comments: toTreeOrder(list(p.comments, LIMITS.comments, normalizeComment)),
  };
}

export function normalizeBanner(b = {}) {
  return {
    id: id(b.id),
    slot: pick(b.slot, BANNER_SLOTS),
    type: pick(b.type, BANNER_TYPES),
    text: str(b.text, LIMITS.bannerText),
    image: isAssetId(b.image) ? b.image : '',
    bg: color(b.bg, '#e6f5fd'),
    color: color(b.color, '#1b86c4'),
  };
}

/** 사용자가 편집 가능한 필드만 정규화한다. (id, shareId, 날짜 등 시스템 필드는 저장소가 관리) */
export function normalizeContent(p = {}) {
  return {
    name: str(p.name, LIMITS.projectName) || '이름 없는 결과물',
    siteName: str(p.siteName, LIMITS.siteName),
    boardTitle: str(p.boardTitle, LIMITS.boardTitle),
    defaultNickBase: normalizeNickBase(p.defaultNickBase),
    banners: list(p.banners, LIMITS.banners, normalizeBanner),
    posts: list(p.posts, LIMITS.posts, normalizePost),
  };
}

/** 본문에 사진 또는 [이미지] 칸이 있는지 (목록의 🖼️ 표시용) */
export function hasImage(post) {
  return /class="cm-(?:img|ph)"/.test(post.bodyHtml);
}

/** 개념글 여부 (추천 - 비추천 >= CONCEPT_THRESHOLD) */
export function isConcept(post) {
  return post.upvotes - post.downvotes >= CONCEPT_THRESHOLD;
}

/** 열람용으로 공개해도 되는 필드만 남긴다. */
export function toPublicView(project) {
  const { siteName, boardTitle, banners, posts } = project;
  return { siteName, boardTitle, banners, posts };
}

// ── 내보내기 파일 (열람 사이트용 + 편집기 백업 겸용) ──────────────
// { format, version, shareId, exportedAt, defaultNickBase, view, assets: { [assetId]: dataURL } }
// 결과물 이름(나만 보는 이름)은 공개 저장소에 올라가므로 넣지 않는다.

export const EXPORT_FORMAT = 'community-maker';
export const EXPORT_VERSION = 1;

/** 본문/배너가 참조하는 에셋 ID 목록 */
export function collectAssetIds(view) {
  const ids = new Set();
  for (const b of view.banners) if (b.type === 'image' && b.image) ids.add(b.image);
  for (const p of view.posts) {
    for (const m of p.bodyHtml.matchAll(/data-asset="([0-9a-zA-Z]+)"/g)) ids.add(m[1]);
  }
  return ids;
}

/** 내보내기 파일을 검증·정규화한다. 형식이 틀리면 null. */
export function parseExportFile(data) {
  if (!data || data.format !== EXPORT_FORMAT || !isId(data.shareId)) return null;
  const content = normalizeContent({ ...data.view, defaultNickBase: data.defaultNickBase, name: data.view?.boardTitle });
  const assets = {};
  for (const [id, url] of Object.entries(data.assets || {})) {
    if (isAssetId(id) && isImageDataUrl(url)) assets[id] = url;
  }
  return { shareId: data.shareId, content, assets };
}
