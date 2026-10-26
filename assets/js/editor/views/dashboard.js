// 결과물 목록 화면 (#/)
import { h, replace } from '../../core/dom.js';
import { uid } from '../../shared/id.js';
import { screen, section } from '../ui/layout.js';
import { openSheet, promptSheet, confirmSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { projectStore } from '../store.js';
import { readExportFile, importParsed } from '../transfer.js';
import { getViewerBase, setViewerBase } from '../siteConfig.js';
import { shareBox } from '../components/shareBox.js';

const fmtDate = (iso) => new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });

function pickJsonFile() {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept: '.json,application/json' });
    input.addEventListener('change', () => resolve(input.files[0] || null), { once: true });
    input.click();
  });
}

export async function mountDashboard(root, { navigate }) {
  const list = h('div', { class: 'adm-cards' }, h('div', { class: 'adm-loading' }, '불러오는 중…'));
  const siteBox = h('div', { class: 'adm-stack' });

  // ── 열람 사이트 주소 ──
  function renderSiteBox() {
    const base = getViewerBase();
    replace(siteBox,
      base
        ? h('a', { class: 'adm-share-url', href: base, target: '_blank', rel: 'noopener' }, base)
        : h('p', { class: 'adm-hint' }, 'GitHub Pages 주소를 입력하세요. 예: https://아이디.github.io/저장소이름/'),
      h('button', {
        type: 'button',
        class: 'adm-btn is-small',
        onClick: async () => {
          const value = await promptSheet({ title: '열람 사이트 주소', value: base, placeholder: 'https://아이디.github.io/저장소이름/', maxLength: 300 });
          if (value === null) return;
          if (value.trim() && !setViewerBase(value)) return toast('올바른 주소가 아닙니다.', { error: true });
          if (!value.trim()) setViewerBase('');
          renderSiteBox();
          load();
        },
      }, base ? '주소 변경' : '주소 입력'),
    );
  }

  // ── 동작 ──
  async function createNew() {
    const name = await promptSheet({ title: '새 결과물 이름', value: '', placeholder: '예: 결과물 1', maxLength: 60 });
    if (name === null) return;
    const project = await projectStore.create(name);
    navigate(`#/p/${project.id}`);
  }

  async function importFile() {
    const file = await pickJsonFile();
    if (!file) return;
    try {
      const parsed = await readExportFile(file);
      const existing = await projectStore.findByShareId(parsed.shareId);
      let targetId = null;
      if (existing) {
        const choice = await openSheet({
          title: '같은 결과물이 이미 있습니다',
          body: h('p', { class: 'adm-sheet-msg' }, `'${existing.name}' 을(를) 파일 내용으로 덮어쓸까요, 새 결과물로 추가할까요?`),
          actions: [
            { label: '취소', value: null },
            { label: '새로 추가', value: 'copy' },
            { label: '덮어쓰기', value: 'overwrite', kind: 'primary' },
          ],
        });
        if (!choice) return;
        if (choice === 'overwrite') targetId = existing.id;
        else parsed.shareId = uid(10); // 새 결과물은 다른 링크를 쓴다
      }
      await importParsed(parsed, targetId);
      toast('불러왔습니다.');
      load();
    } catch (err) {
      toast(err.message, { error: true });
    }
  }

  async function remove(p) {
    const ok = await confirmSheet({
      title: `'${p.name}' 을(를) 삭제할까요?`,
      message: '편집기에서 게시글과 첨부 이미지가 모두 삭제되며 되돌릴 수 없습니다. 이미 GitHub 에 올린 파일은 따로 지워야 열람이 막힙니다.',
      okLabel: '삭제',
      danger: true,
    });
    if (!ok) return;
    await projectStore.remove(p.id);
    toast('삭제했습니다.');
    load();
  }

  const card = (p) =>
    h('article', { class: 'adm-card' },
      h('a', { class: 'adm-card-main', href: `#/p/${p.id}` },
        h('div', { class: 'adm-card-name' }, p.name),
        h('div', { class: 'adm-card-meta' }, `게시글 ${p.postCount}개 · ${fmtDate(p.updatedAt)} 수정`),
      ),
      shareBox(p),
      h('div', { class: 'adm-card-foot' },
        h('a', { class: 'adm-btn is-small', href: `#/p/${p.id}` }, '편집'),
        h('a', { class: 'adm-btn is-small', href: `#/p/${p.id}/preview` }, '미리보기'),
        h('button', { type: 'button', class: 'adm-btn is-small is-ghost-danger', onClick: () => remove(p) }, '삭제'),
      ),
    );

  async function load() {
    try {
      const projects = await projectStore.list();
      replace(list,
        projects.length
          ? projects.map(card)
          : h('div', { class: 'adm-empty' }, '아직 만든 결과물이 없습니다.', h('br'), '아래 버튼으로 첫 결과물을 만들어 보세요.'),
      );
    } catch (err) {
      replace(list, h('div', { class: 'adm-empty' }, err.message));
    }
  }

  renderSiteBox();
  replace(root,
    screen(
      {
        title: '내 결과물',
        right: h('button', { type: 'button', class: 'adm-top-btn', onClick: importFile }, '불러오기'),
      },
      h('p', { class: 'adm-intro' },
        '결과물은 이 브라우저에 저장됩니다. 공유하려면 [내보내기] 한 파일을 GitHub 저장소의 data 폴더에 올리세요. ',
        '내보낸 파일은 [불러오기]로 다시 편집할 수 있어 백업으로도 쓸 수 있습니다.'),
      section('열람 사이트 주소', siteBox),
      list,
      h('div', { class: 'adm-fab-space' }),
      h('button', { type: 'button', class: 'adm-fab', onClick: createNew }, '+ 새 결과물'),
    ),
  );
  await load();
}
