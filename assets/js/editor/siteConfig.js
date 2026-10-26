// 열람 사이트 주소 설정. (이 브라우저에만 저장되는 편의 설정)
// 편집기가 GitHub Pages 에서 열려 있으면 같은 주소를 자동으로 사용한다.

const KEY = 'cm.viewerBase';

function normalizeBase(value) {
  try {
    const url = new URL(value.trim());
    if (!/^https?:$/.test(url.protocol)) return '';
    url.search = '';
    url.hash = '';
    url.pathname = url.pathname.replace(/[^/]*\.html$/, '');
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url.href;
  } catch {
    return '';
  }
}

function guessBase() {
  return location.hostname.endsWith('.github.io') ? normalizeBase(location.href) : '';
}

export function getViewerBase() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
  } catch { /* 저장소 사용 불가 */ }
  return guessBase();
}

/** 저장 후 정규화된 주소를 돌려준다. 잘못된 주소면 '' */
export function setViewerBase(value) {
  const base = normalizeBase(value);
  try {
    if (base) localStorage.setItem(KEY, base);
    else localStorage.removeItem(KEY);
  } catch { /* 무시 */ }
  return base;
}

export function viewerLink(shareId) {
  const base = getViewerBase();
  return base ? `${base}?id=${shareId}` : '';
}

/** https://아이디.github.io/저장소/ → GitHub 의 data 폴더 업로드 페이지 */
export function repoUploadUrl() {
  const base = getViewerBase();
  const m = base.match(/^https:\/\/([^.]+)\.github\.io\/([^/]*)\/?/);
  if (!m) return '';
  const repo = m[2] || `${m[1]}.github.io`;
  return `https://github.com/${m[1]}/${repo}/upload/main/data`;
}
