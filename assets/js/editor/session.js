// 편집 중인 결과물 1개의 상태 + 자동 저장 + 이미지 주소 관리.
// 화면은 session.project 를 직접 수정한 뒤 session.touch() 만 호출하면 된다.
import { normalizeContent } from '../shared/schema.js';
import { projectStore } from './store.js';

const SAVE_DELAY = 400;

/** @typedef {'saved'|'pending'|'saving'|'error'} SaveStatus */

export class ProjectSession {
  /** 결과물을 불러와 세션을 연다. */
  static async open(id) {
    const project = await projectStore.get(id);
    await projectStore.pruneAssets(project);
    return new ProjectSession(project, await projectStore.getAssets(id));
  }

  /**
   * @param {object} project
   * @param {Map<string, Blob>} assetBlobs
   */
  constructor(project, assetBlobs) {
    this.project = { ...project, ...normalizeContent(project) };
    this.status = /** @type {SaveStatus} */ ('saved');
    this.dirty = false;
    this.inFlight = null;
    this.timer = null;
    this.listeners = new Set();
    /** 에셋 ID → 화면 표시용 Blob URL */
    this.assetUrls = new Map([...assetBlobs].map(([id, blob]) => [id, URL.createObjectURL(blob)]));
    this.resolveAsset = (id) => this.assetUrls.get(id);
  }

  get id() {
    return this.project.id;
  }

  findPost(postId) {
    return this.project.posts.find((p) => p.id === postId) || null;
  }

  /** 이미지 Blob 을 저장하고 에셋 ID 를 돌려준다. */
  async addImage(blob) {
    const id = await projectStore.putAsset(this.id, blob);
    this.assetUrls.set(id, URL.createObjectURL(blob));
    return id;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  setStatus(status) {
    this.status = status;
    this.listeners.forEach((fn) => fn(status));
  }

  /** 변경 발생 알림 → 잠시 뒤 자동 저장 */
  touch() {
    this.dirty = true;
    this.setStatus('pending');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), SAVE_DELAY);
  }

  async flush() {
    clearTimeout(this.timer);
    if (this.inFlight) await this.inFlight;
    if (!this.dirty) return;

    this.dirty = false;
    this.setStatus('saving');
    this.inFlight = projectStore
      .saveContent(this.id, this.project)
      .then((saved) => {
        this.project.updatedAt = saved.updatedAt;
        this.setStatus(this.dirty ? 'pending' : 'saved');
      })
      .catch((err) => {
        console.error(err);
        this.dirty = true;
        this.setStatus('error');
      })
      .finally(() => {
        this.inFlight = null;
      });
    await this.inFlight;
  }

  /** 세션 종료: 저장 후 Blob URL 해제 */
  async close() {
    await this.flush();
    this.assetUrls.forEach((url) => URL.revokeObjectURL(url));
    this.assetUrls.clear();
  }
}
