// 브라우저와 Node 양쪽에서 쓰는 랜덤 ID 생성기.
// (crypto.randomUUID 는 HTTP 환경 브라우저에서 막히므로 getRandomValues 사용)
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function uid(length = 12) {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export const isId = (value) => typeof value === 'string' && /^[0-9a-zA-Z]{6,40}$/.test(value);
