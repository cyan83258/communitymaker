// 닉네임 규칙 (서버/편집기/열람 화면 공통).
//  - 글쓴이: 직접 입력한 닉네임이 있으면 그것, 없으면 기본 닉네임(ㅇㅇ / 익명)
//  - 댓글: 직접 입력한 닉네임이 없으면 '기본 닉네임 + 순번' (ㅇㅇ1, ㅇㅇ2 …)
//          순번은 자동 이름을 쓰는 댓글끼리만 센다.
//  - 글쓴이 댓글: '글쓴이 닉네임(글쓴이)'

export const NICK_BASES = ['ㅇㅇ', '익명'];
export const DEFAULT_NICK_BASE = NICK_BASES[0];
export const AUTHOR_SUFFIX = '(글쓴이)';

export const normalizeNickBase = (value) => (NICK_BASES.includes(value) ? value : DEFAULT_NICK_BASE);

export function authorName(post) {
  return post.authorNick?.trim() || normalizeNickBase(post.nickBase);
}

/** 댓글 배열과 같은 순서의 표시 정보 배열을 돌려준다. */
export function commentNames(post) {
  const base = normalizeNickBase(post.nickBase);
  const author = authorName(post);
  let seq = 0;
  return post.comments.map((c) => {
    if (c.isAuthor) return { name: author + AUTHOR_SUFFIX, isAuthor: true, isAuto: false };
    const custom = c.nick?.trim();
    if (custom) return { name: custom, isAuthor: false, isAuto: false };
    seq += 1;
    return { name: base + seq, isAuthor: false, isAuto: true };
  });
}
