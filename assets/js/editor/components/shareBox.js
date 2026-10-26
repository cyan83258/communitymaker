// 결과물 카드의 공유 영역: 내보내기 · 열람 링크 · 링크 재발급
import { h, replace } from '../../core/dom.js';
import { copyText } from '../../core/clipboard.js';
import { toast } from '../ui/toast.js';
import { openSheet, confirmSheet } from '../ui/sheet.js';
import { projectStore } from '../store.js';
import { buildExport, downloadBlob, exportFileName } from '../transfer.js';
import { viewerLink, repoUploadUrl } from '../siteConfig.js';

const copyButton = (text) =>
  h('button', {
    type: 'button',
    class: 'adm-btn is-small is-primary',
    onClick: async () => toast((await copyText(text)) ? '링크를 복사했습니다.' : '복사하지 못했습니다. 링크를 길게 눌러 복사하세요.'),
  }, '링크 복사');

function linkBlock(shareId) {
  const url = viewerLink(shareId);
  if (!url) return h('p', { class: 'adm-hint' }, '열람 사이트 주소를 설정하면 링크가 표시됩니다.');
  return h('div', { class: 'adm-share-link' },
    h('a', { class: 'adm-share-url', href: url, target: '_blank', rel: 'noopener' }, url),
    h('div', { class: 'adm-share-btns' }, copyButton(url)),
  );
}

/** 내보내기 후 안내 시트 */
function showUploadGuide(fileName, shareId) {
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
      linkBlock(shareId),
    ],
    actions: [{ label: '닫기', value: true, kind: 'primary' }],
  });
}

/** @param {{ id: string, shareId: string }} summary @param {() => void} onChanged */
export function shareBox(summary, onChanged) {
  const wrap = h('div', { class: 'adm-share' });
  let state = summary;

  async function exportNow(btn) {
    btn.disabled = true;
    try {
      const project = await projectStore.get(state.id);
      const fileName = exportFileName(project);
      downloadBlob(await buildExport(project), fileName);
      showUploadGuide(fileName, project.shareId);
    } catch (err) {
      toast(err.message, { error: true });
    } finally {
      btn.disabled = false;
    }
  }

  async function regenerate() {
    const ok = await confirmSheet({
      title: '열람 링크를 새로 만들까요?',
      message: '새 링크로 보려면 다시 내보내기 해서 올려야 합니다. 기존 링크를 막으려면 GitHub data 폴더에서 예전 파일을 지우세요.',
      okLabel: '새 링크 만들기',
    });
    if (!ok) return;
    state = { ...state, shareId: (await projectStore.regenerateShareId(state.id)).shareId };
    render();
    onChanged?.();
  }

  function render() {
    const exportBtn = h('button', { type: 'button', class: 'adm-btn is-small is-primary', onClick: () => exportNow(exportBtn) }, '내보내기');
    replace(wrap,
      h('div', { class: 'adm-share-head' },
        h('span', { class: 'adm-share-file' }, `파일: ${state.shareId}.json`),
        h('div', { class: 'adm-share-btns' },
          exportBtn,
          h('button', { type: 'button', class: 'adm-btn is-small', onClick: regenerate }, '링크 재발급'),
        ),
      ),
      linkBlock(state.shareId),
    );
  }

  render();
  return wrap;
}
