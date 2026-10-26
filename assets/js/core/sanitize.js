// 게시글 본문 HTML 허용 목록 기반 정리기.
// 허용: 문단/줄바꿈, 글자색·글자크기 span, 첨부 이미지(<img data-asset="ID">), [이미지] 자리 표시.
// 저장되는 HTML 에는 이미지 주소(src) 없이 에셋 ID 만 남기고, 화면에 그릴 때 resolveAsset 으로 주소를 붙인다.
import { isAssetId } from '../shared/schema.js';

export const IMG_CLASS = 'cm-img';
export const PLACEHOLDER_CLASS = 'cm-ph';
export const PLACEHOLDER_TEXT = '[이미지]';

const BLOCK_TAGS = new Set(['P', 'DIV', 'BR', 'B', 'STRONG', 'I', 'EM', 'U']);
const DROP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'TEMPLATE',
  'SVG', 'MATH', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'BUTTON', 'SELECT', 'FORM', 'VIDEO', 'AUDIO',
]);

const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\))$/i;
const SIZE_RE = /^(\d{1,2}(?:\.\d+)?)px$/;

export const MIN_FONT = 10;
export const MAX_FONT = 48;

function cleanStyle(src) {
  const out = {};
  const color = src.style?.color;
  if (color && COLOR_RE.test(color)) out.color = color;
  const size = src.style?.fontSize?.match(SIZE_RE);
  if (size && +size[1] >= MIN_FONT && +size[1] <= MAX_FONT) out.fontSize = size[0];
  // <font color> (execCommand 결과) 대응
  const fontColor = src.tagName === 'FONT' && src.getAttribute('color');
  if (fontColor && COLOR_RE.test(fontColor)) out.color = fontColor;
  return out;
}

/**
 * @param {string} assetId
 * @param {string} [src] 화면 표시용 주소 (없으면 저장용 마크업만)
 */
export function createImageFigure(assetId, src) {
  const fig = document.createElement('figure');
  fig.className = IMG_CLASS;
  const img = document.createElement('img');
  img.dataset.asset = assetId;
  if (src) {
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
  }
  fig.append(img);
  return fig;
}

export function createPlaceholder() {
  const div = document.createElement('div');
  div.className = PLACEHOLDER_CLASS;
  div.textContent = PLACEHOLDER_TEXT;
  return div;
}

function cleanChildren(src, dst, resolveAsset) {
  for (const node of src.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      dst.append(node.data);
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || DROP_TAGS.has(node.tagName)) continue;

    const tag = node.tagName;
    const cls = node.classList;

    if (cls.contains(PLACEHOLDER_CLASS)) {
      dst.append(createPlaceholder());
    } else if (cls.contains(IMG_CLASS) || tag === 'IMG') {
      const img = tag === 'IMG' ? node : node.querySelector('img');
      const id = img?.dataset.asset;
      if (!isAssetId(id)) continue;
      if (!resolveAsset) dst.append(createImageFigure(id));
      else {
        const url = resolveAsset(id);
        dst.append(url ? createImageFigure(id, url) : createPlaceholder()); // 이미지가 없으면 빈 칸으로
      }
    } else if (tag === 'SPAN' || tag === 'FONT') {
      const style = cleanStyle(node);
      if (Object.keys(style).length) {
        const span = document.createElement('span');
        Object.assign(span.style, style);
        cleanChildren(node, span, resolveAsset);
        if (span.childNodes.length) dst.append(span);
      } else {
        cleanChildren(node, dst, resolveAsset);
      }
    } else if (BLOCK_TAGS.has(tag)) {
      const el = document.createElement(tag.toLowerCase());
      cleanChildren(node, el, resolveAsset);
      dst.append(el);
    } else {
      cleanChildren(node, dst, resolveAsset); // 모르는 태그는 내용만 남긴다
    }
  }
}

/**
 * HTML 문자열 → 안전한 DocumentFragment (화면 표시용)
 * @param {(assetId: string) => string|undefined} [resolveAsset] 에셋 ID → 이미지 주소
 */
export function sanitizeToFragment(html, resolveAsset) {
  const tpl = document.createElement('template'); // template 내부는 실행·로딩되지 않음
  tpl.innerHTML = html || '';
  const frag = document.createDocumentFragment();
  cleanChildren(tpl.content, frag, resolveAsset);
  return frag;
}

/** 저장용 HTML (이미지 주소 없이 에셋 ID 만) */
export function sanitizeHtml(html) {
  const div = document.createElement('div');
  div.append(sanitizeToFragment(html));
  return div.innerHTML;
}
