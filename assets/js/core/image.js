// 업로드 전 이미지 축소·재압축 (전송량과 열람 페이지 로딩 속도 최적화).

const KEEP_AS_IS_BYTES = 300 * 1024;
const GIF_LIMIT_BYTES = 8 * 1024 * 1024;
const PASS_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function decode(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch { /* 아래 방식으로 재시도 */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * @param {File} file
 * @param {{ maxSize?: number, quality?: number }} opts maxSize: 긴 변 최대 픽셀
 * @returns {Promise<Blob>}
 */
export async function prepareImage(file, { maxSize = 1280, quality = 0.85 } = {}) {
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 첨부할 수 있습니다.');
  // 움짤(GIF)은 애니메이션 보존을 위해 그대로 올린다.
  if (file.type === 'image/gif') {
    if (file.size > GIF_LIMIT_BYTES) throw new Error('GIF 는 8MB 이하만 첨부할 수 있습니다.');
    return file;
  }

  const source = await decode(file);
  const w = source.width;
  const h = source.height;
  const scale = Math.min(1, maxSize / Math.max(w, h));
  if (scale === 1 && file.size <= KEEP_AS_IS_BYTES && PASS_TYPES.includes(file.type)) return file;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // 투명 PNG → JPEG 변환 대비
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();

  let blob = await canvasToBlob(canvas, 'image/webp', quality);
  if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  if (!blob) throw new Error('이미지를 처리하지 못했습니다.');
  return blob;
}
