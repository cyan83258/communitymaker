// 결과물 목록 화면 (#/) — 검색 + 10개씩 페이지 + 항목별 메뉴(⋯)
import { h, replace } from '../../core/dom.js';
import { paginate, pager } from '../../core/pagination.js';
import { uid } from '../../shared/id.js';
import { screen } from '../ui/layout.js';
import { openSheet, promptSheet, confirmSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import { projectStore } from '../store.js';
import { readExportFile, importParsed } from '../transfer.js';
import { getViewerBase, setViewerBase } from '../siteConfig.js';
import { exportProject, regenerateLink, linkBlock } from '../shareActions.js';

const PER_PAGE = 10;

/** 화면을 다시 열어도 유지되는 검색어·페이지 */
const state = { query: '', page: 1 };

const fmtDate = (iso) => new Date(iso).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });

function pickJsonFile() {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept: '.json,application/json' });
    input.addEventListener('change', () => resolve(input.files[0] || null), { once: true });
    input.click();
  });
}

const matches = (p, q) => !q || `${p.name} ${p.boardTitle}`.toLowerCase().includes(q);

export async function mountDashboard(root, { navigate }) {
  let projects = [];
  const listEl = h('div', { class: 'adm-plist' }, h('div', { class: 'adm-loading' }, '불러오는 중…'));
  const pagerEl = h('div');
  const siteEl = h('div', { class: 'adm-site-line' });

  // ── 목록 ──
  function renderList() {
    const q = state.query.trim().toLowerCase();
    const filtered = projects.filter((p) => matches(p, q));
    const paged = paginate(filtered, state.page, PER_PAGE);
    state.page = paged.page;

    replace(listEl,
      projects.length === 0
        ? h('div', { class: 'adm-empty' }, '아직 만든 결과물이 없습니다.', h('br'), '아래 버튼으로 첫 결과물을 만들어 보세요.')
        : filtered.length === 0
          ? h('div', { class: 'adm-empty' }, `'${state.query.trim()}' 검색 결과가 없습니다.`)
          : paged.items.map(row),
    );
    replace(pagerEl, pager({
      page: paged.page,
      totalPages: paged.totalPages,
      onSelect: (p) => {
        state.page = p;
        renderList();
        window.scrollTo(0, 0);
      },
    }));
  }

  const row = (p) =>
    h('div', { class: 'adm-prow' },
      h('a', { class: 'adm-prow-main', href: `#/p/${p.id}` },
        h('div', { class: 'adm-prow-name' }, p.name),
        h('div', { class: 'adm-prow-meta' }, `게시글 ${p.postCount} · ${fmtDate(p.updatedAt)}`),
      ),
      h('button', { type: 'button', class: 'adm-prow-more', 'aria-label': `${p.name} 메뉴`, onClick: () => openMenu(p) }, '⋯'),
    );

  async function load() {
    try {
      projects = await projectStore.list();
      renderList();
    } catch (err) {
      replace(listEl, h('div', { class: 'adm-empty' }, err.message));
    }
  }

  // ── 항목 메뉴 ──
  async function openMenu(p) {
    const choice = await openSheet({
      title: p.name,
      body: linkBlock(p.shareId),
      vertical: true,
      actions: [
        { label: '편집', value: 'edit' },
        { label: '미리보기', value: 'preview' },
        { label: '내보내기 (공유 파일)', value: 'export' },
        { label: '링크 재발급', value: 'regen' },
        { label: '삭제', value: 'delete', kind: 'danger' },
      ],
    });
    if (choice === 'edit') navigate(`#/p/${p.id}`);
    else if (choice === 'preview') navigate(`#/p/${p.id}/preview`);
    else if (choice === 'export') exportProject(p.id);
    else if (choice === 'regen' && (await regenerateLink(p.id))) load();
    else if (choice === 'delete') remove(p);
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

  // ── 만들기 / 불러오기 ──
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

  // ── 열람 사이트 주소 ──
  function renderSiteLine() {
    const base = getViewerBase();
    replace(siteEl,
      h('span', { class: 'adm-site-label' }, '열람 사이트'),
      h('span', { class: 'adm-site-url' }, base || '설정 안 됨'),
      h('button', {
        type: 'button',
        class: 'adm-link-btn',
        onClick: async () => {
          const value = await promptSheet({ title: '열람 사이트 주소', value: base, placeholder: 'https://아이디.github.io/저장소이름/', maxLength: 300 });
          if (value === null) return;
          if (value.trim() && !setViewerBase(value)) return toast('올바른 주소가 아닙니다.', { error: true });
          if (!value.trim()) setViewerBase('');
          renderSiteLine();
        },
      }, '변경'),
    );
  }

  const search = h('input', {
    class: 'adm-input adm-search',
    type: 'search',
    placeholder: '결과물 검색 (이름·게시판 제목)',
    value: state.query,
    'aria-label': '결과물 검색',
    onInput: (e) => {
      state.query = e.target.value;
      state.page = 1;
      renderList();
    },
  });

  renderSiteLine();
  replace(root,
    screen(
      {
        title: '내 결과물',
        right: h('button', { type: 'button', class: 'adm-top-btn', onClick: importFile }, '불러오기'),
      },
      search,
      listEl,
      pagerEl,
      siteEl,
      h('div', { class: 'adm-fab-space' }),
      h('button', { type: 'button', class: 'adm-fab', onClick: createNew }, '+ 새 결과물'),
    ),
  );
  await load();
}
