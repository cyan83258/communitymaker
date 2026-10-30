// 결과물 공유 관련 동작: 내보내기(+ 업로드 안내) · 링크 복사 · 링크 재발급
import { h } from '../core/dom.js';
import { copyText } from '../core/clipboard.js';
import { toast } from './ui/toast.js';
import { openSheet, confirmSheet } from './ui/sheet.js';
import { projectStore } from './store.js';
import { buildExport, downloadBlob, exportFileName } from './transfer.js';
import { viewerLink, repoUploadUrl } from './siteConfig.js';

export async function copyViewerLink(shareId) {
  const url = viewerLink(shareId);
  if (!url) return toast('먼저 열람 사이트 주소를 설정하세요.', { error: true });
  toast((await copyText(url)) ? '링크를 복사했습니다.' : '복사하지 못했습니다.');
}

function linkBlock(shareId) {
  const url = viewerLink(shareId);
  if (!url) return h('p', { class: 'adm-hint' }, '열람 사이트 주소를 설정하면 링크가 표시됩니다.');
  return h('div', { class: 'adm-share-link' },
    h('a', { class: 'adm-share-url', href: url, target: '_blank', rel: 'noopener' }, url),
    h('div', { class: 'adm-share-btns' },
      h('button', { type: 'button', class: 'adm-btn is-small is-primary', onClick: () => copyViewerLink(shareId) }, '링크 복사'),
    ),
  );
}

/** 결과물을 파일로 내보내고 GitHub 업로드 방법을 안내한다. */
export async function exportProject(projectId) {
  try {
    const project = await projectStore.get(projectId);
    const fileName = exportFileName(project);
    downloadBlob(await buildExport(project), fileName);
    const uploadUrl = repoUploadUrl();
    openSheet({
      title: '내보내기 완료',
      body: [
        h('ol', { class: 'adm-steps' },
          h('li', null, '다운로드된 ', h('b', null, fileName), ' 파일을'),
          h('li', null, 'GitHub 저장소의 ', h('b', null, 'data'), ' 폴더에 올리세요. (같은 이름이 있으면 덮어쓰기)',
            uploadUrl && h('div', null, h('a', { class: 'adm-btn is-small', href: uploadUrl, target: '_blank', rel: 'noopener' }, 'GitHub 업로드 페이지 열기')),
          ),
          h('li', null, '1~2분 뒤 아래 링크로 열람할 수 있습니다.'),
        ),
        linkBlock(project.shareId),
      ],
      actions: [{ label: '닫기', value: true, kind: 'primary' }],
    });
  } catch (err) {
    toast(err.message, { error: true });
  }
}

/** 새 공유 ID 를 만든다. 바뀌었으면 true */
export async function regenerateLink(projectId) {
  const ok = await confirmSheet({
    title: '열람 링크를 새로 만들까요?',
    message: '새 링크로 보려면 다시 내보내기 해서 올려야 합니다. 기존 링크를 막으려면 GitHub data 폴더에서 예전 파일을 지우세요.',
    okLabel: '새 링크 만들기',
  });
  if (!ok) return false;
  await projectStore.regenerateShareId(projectId);
  toast('새 링크를 만들었습니다.');
  return true;
}

export { linkBlock };
