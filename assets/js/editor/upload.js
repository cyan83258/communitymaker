// 이미지 선택 → 축소 → 브라우저 저장소에 보관하는 흐름 공통 처리
import { h } from '../core/dom.js';
import { prepareImage } from '../core/image.js';
import { toast } from './ui/toast.js';

/** 파일 선택 창을 열고 선택한 File 배열을 돌려준다. */
export function pickImages({ multiple = false } = {}) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept: 'image/*', multiple });
    input.addEventListener('change', () => resolve([...input.files]), { once: true });
    input.click();
  });
}

/**
 * 파일들을 순서대로 처리하고 성공한 에셋 ID 배열을 돌려준다.
 * @param {import('./session.js').ProjectSession} session
 * @param {File[]} files
 * @param {{ maxSize?: number }} opts
 */
export async function addImages(session, files, opts = {}) {
  const ids = [];
  for (const file of files) {
    try {
      ids.push(await session.addImage(await prepareImage(file, opts)));
    } catch (err) {
      toast(`${file.name}: ${err.message}`, { error: true, duration: 3500 });
    }
  }
  return ids;
}
