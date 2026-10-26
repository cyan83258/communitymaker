// 댓글 트리(대댓글) 규칙.
// 댓글은 화면 표시 순서(부모 바로 뒤에 그 답글들)대로 평평한 배열에 저장하고,
// 각 댓글의 parentId 로 계층을 표현한다. ('' = 일반 댓글)
//   깊이 0: 댓글 / 1: 대댓글 / 2: 대대댓글 / 3: 대대대댓글

export const MAX_REPLY_DEPTH = 3;

/** 배열 순서와 같은 깊이 배열 */
export function commentDepths(comments) {
  const depthById = new Map();
  return comments.map((c) => {
    const d = c.parentId && depthById.has(c.parentId) ? depthById.get(c.parentId) + 1 : 0;
    depthById.set(c.id, d);
    return d;
  });
}

/**
 * 잘못된 부모 참조를 일반 댓글로 바꾸고, 답글이 부모 바로 아래에 오도록 순서를 맞춘다.
 * (같은 부모 아래에서는 원래 순서 유지)
 */
export function toTreeOrder(comments) {
  const depthById = new Map();
  const fixed = comments.map((c) => {
    const parentDepth = depthById.get(c.parentId);
    const valid = c.parentId && parentDepth !== undefined && parentDepth < MAX_REPLY_DEPTH;
    depthById.set(c.id, valid ? parentDepth + 1 : 0);
    return valid ? c : { ...c, parentId: '' };
  });

  const children = new Map();
  for (const c of fixed) {
    const key = c.parentId || '';
    if (!children.has(key)) children.set(key, []);
    children.get(key).push(c);
  }
  const out = [];
  const visit = (parentKey) => {
    for (const c of children.get(parentKey) || []) {
      out.push(c);
      visit(c.id);
    }
  };
  visit('');
  return out;
}

/** index 댓글과 그 답글 전체가 끝나는 위치(다음 형제의 시작 index) */
export function subtreeEnd(comments, index) {
  const depths = commentDepths(comments);
  let end = index + 1;
  while (end < comments.length && depths[end] > depths[index]) end++;
  return end;
}

/** 답글을 부모의 마지막 답글 뒤에 넣고 그 위치를 돌려준다. */
export function insertReply(comments, parentIndex, reply) {
  const at = subtreeEnd(comments, parentIndex);
  comments.splice(at, 0, { ...reply, parentId: comments[parentIndex].id });
  return at;
}

/** 댓글과 답글 전체를 지우고 지운 개수를 돌려준다. */
export function removeSubtree(comments, index) {
  return comments.splice(index, subtreeEnd(comments, index) - index).length;
}

/** 같은 부모를 가진 이전/다음 댓글의 index (없으면 -1) */
export function siblingIndex(comments, index, delta) {
  const parentId = comments[index].parentId || '';
  if (delta < 0) {
    for (let i = index - 1; i >= 0; i--) {
      const p = comments[i].parentId || '';
      if (p === parentId) return i;
      if (comments[i].id === parentId) return -1;
    }
    return -1;
  }
  const next = subtreeEnd(comments, index);
  return next < comments.length && (comments[next].parentId || '') === parentId ? next : -1;
}

/** 댓글(답글 포함)을 같은 부모 안에서 한 칸 위/아래로 옮긴다. */
export function moveSubtree(comments, index, delta) {
  const other = siblingIndex(comments, index, delta);
  if (other < 0) return false;
  const [first, second] = delta < 0 ? [other, index] : [index, other];
  const firstBlock = comments.slice(first, subtreeEnd(comments, first));
  const secondBlock = comments.slice(second, subtreeEnd(comments, second));
  comments.splice(first, firstBlock.length + secondBlock.length, ...secondBlock, ...firstBlock);
  return true;
}
