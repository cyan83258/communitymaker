// 결과물 저장소 (브라우저 IndexedDB). 편집기의 모든 데이터 읽기/쓰기는 이 모듈을 거친다.
import { db } from '../core/db.js';
import { uid } from '../shared/id.js';
import { createProject, normalizeContent, collectAssetIds } from '../shared/schema.js';

const now = () => new Date().toISOString();

export function summary(p) {
  return { id: p.id, name: p.name, shareId: p.shareId, postCount: p.posts.length, updatedAt: p.updatedAt };
}

export const projectStore = {
  async list() {
    const all = await db.getAll('projects');
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(summary);
  },

  async get(id) {
    const p = await db.get('projects', id);
    if (!p) throw new Error('결과물을 찾을 수 없습니다.');
    return p;
  },

  async findByShareId(shareId) {
    return (await db.getAll('projects')).find((p) => p.shareId === shareId) || null;
  },

  async create(name) {
    const p = createProject({ name: name?.trim() ? name.trim().slice(0, 60) : undefined });
    await db.put('projects', p);
    return p;
  },

  /** 편집 내용 저장 */
  async saveContent(id, content) {
    const current = await this.get(id);
    const next = { ...current, ...normalizeContent(content), updatedAt: now() };
    await db.put('projects', next);
    return next;
  },

  /** 내보내기 파일로 결과물을 만들거나 덮어쓴다. */
  async upsertFromImport({ shareId, content }, existingId) {
    const base = existingId ? await this.get(existingId) : { ...createProject(), shareId };
    const next = { ...base, ...content, name: existingId ? base.name : content.name, updatedAt: now() };
    await db.put('projects', next);
    return next;
  },

  /** 열람 링크(공유 ID) 재발급 */
  async regenerateShareId(id) {
    const p = await this.get(id);
    const next = { ...p, shareId: uid(10), updatedAt: now() };
    await db.put('projects', next);
    return next;
  },

  async remove(id) {
    const assets = await db.getAllByIndex('assets', 'projectId', id);
    await db.deleteMany('assets', assets.map((a) => a.key));
    await db.delete('projects', id);
  },

  // ── 이미지 에셋 ──

  async putAsset(projectId, blob, id = uid(16)) {
    // 같은 에셋 ID 가 다른 결과물에 있어도 충돌하지 않도록 결과물 ID 를 키에 포함
    await db.put('assets', { key: `${projectId}/${id}`, id, projectId, blob });
    return id;
  },

  /** 결과물의 모든 이미지 Blob: Map<assetId, Blob> */
  async getAssets(projectId) {
    const list = await db.getAllByIndex('assets', 'projectId', projectId);
    return new Map(list.map((a) => [a.id, a.blob]));
  },

  /** 더 이상 쓰이지 않는 이미지를 지운다. (편집 화면을 열 때 실행) */
  async pruneAssets(project) {
    const used = collectAssetIds(project);
    const list = await db.getAllByIndex('assets', 'projectId', project.id);
    const unused = list.filter((a) => !used.has(a.id)).map((a) => a.key);
    if (unused.length) await db.deleteMany('assets', unused);
  },
};
