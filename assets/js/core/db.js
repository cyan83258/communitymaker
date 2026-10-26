// 아주 얇은 IndexedDB 래퍼 (Promise 기반).

const DB_NAME = 'community-maker';
const DB_VERSION = 1;

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // projects: 결과물 문서 / assets: 이미지 Blob ({ key: 'projectId/assetId', id, projectId, blob })
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets', { keyPath: 'key' }).createIndex('projectId', 'projectId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/** 하나의 store 에 대해 트랜잭션을 실행하고 완료(commit)까지 기다린다. fn 이 요청을 돌려주면 그 결과를 반환. */
async function run(storeName, mode, fn) {
  const db = await open();
  const tx = db.transaction(storeName, mode);
  const completed = new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  const req = fn(tx.objectStore(storeName));
  await completed;
  return req instanceof IDBRequest ? req.result : undefined;
}

export const db = {
  get: (store, key) => run(store, 'readonly', (s) => s.get(key)),
  getAll: (store) => run(store, 'readonly', (s) => s.getAll()),
  getAllByIndex: (store, index, value) => run(store, 'readonly', (s) => s.index(index).getAll(value)),
  put: (store, value) => run(store, 'readwrite', (s) => s.put(value)),
  delete: (store, key) => run(store, 'readwrite', (s) => s.delete(key)),
  /** 여러 키 삭제 */
  deleteMany: (store, keys) =>
    run(store, 'readwrite', (s) => {
      keys.forEach((k) => s.delete(k));
    }),
};

/** 브라우저가 저장 공간 부족 시 데이터를 지우지 않도록 요청한다. */
export function requestPersistence() {
  navigator.storage?.persist?.().catch(() => {});
}
