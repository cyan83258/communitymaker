// 내보내기(파일 다운로드) / 불러오기(파일 → 편집기)
import {
  EXPORT_FORMAT, EXPORT_VERSION, toPublicView, collectAssetIds, parseExportFile,
} from '../shared/schema.js';
import { projectStore } from './store.js';

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const dataUrlToBlob = async (url) => (await fetch(url)).blob();

/** 열람 사이트의 data 폴더에 올릴 파일 이름 */
export const exportFileName = (project) => `${project.shareId}.json`;

/** 결과물 → 내보내기 파일(Blob) */
export async function buildExport(project) {
  const view = toPublicView(project);
  const blobs = await projectStore.getAssets(project.id);
  const assets = {};
  for (const id of collectAssetIds(view)) {
    const blob = blobs.get(id);
    if (blob) assets[id] = await blobToDataUrl(blob);
  }
  const data = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    shareId: project.shareId,
    exportedAt: new Date().toISOString(),
    defaultNickBase: project.defaultNickBase,
    view,
    assets,
  };
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 파일을 읽어 검증한다. 형식이 틀리면 Error. */
export async function readExportFile(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('JSON 파일을 읽을 수 없습니다.');
  }
  const parsed = parseExportFile(data);
  if (!parsed) throw new Error('Community Maker 에서 내보낸 파일이 아닙니다.');
  return parsed;
}

/**
 * 읽은 파일을 편집기에 저장한다.
 * @param {ReturnType<typeof parseExportFile>} parsed
 * @param {string|null} existingId 덮어쓸 결과물 ID (없으면 새로 만듦)
 */
export async function importParsed(parsed, existingId) {
  const project = await projectStore.upsertFromImport(parsed, existingId);
  for (const [id, url] of Object.entries(parsed.assets)) {
    await projectStore.putAsset(project.id, await dataUrlToBlob(url), id);
  }
  await projectStore.pruneAssets(project);
  return project;
}
