// 광고 배너 편집 목록
import { h, replace } from '../../core/dom.js';
import { renderBanner } from '../../site/render.js';
import { createBanner, LIMITS } from '../../shared/schema.js';
import { field, textInput, segmented, itemActions, moveItem } from '../ui/fields.js';
import { confirmSheet } from '../ui/sheet.js';
import { pickImages, addImages } from '../upload.js';

const SLOT_OPTIONS = [
  { value: 'top', label: '상단' },
  { value: 'bottom', label: '하단' },
];
const TYPE_OPTIONS = [
  { value: 'text', label: '텍스트' },
  { value: 'image', label: '이미지' },
];

export function bannerEditor(session) {
  const banners = session.project.banners;
  const wrap = h('div', { class: 'adm-stack' });

  const changed = () => session.touch();

  function bannerCard(banner, index) {
    const preview = h('div', { class: 'adm-banner-preview' });
    const refreshPreview = () => replace(preview, renderBanner(banner, session.resolveAsset));
    const detail = h('div', { class: 'adm-stack' });

    const onEdit = () => {
      refreshPreview();
      changed();
    };

    function renderDetail() {
      if (banner.type === 'image') {
        replace(detail,
          h('button', {
            type: 'button',
            class: 'adm-btn is-block',
            onClick: async () => {
              const [id] = await addImages(session, await pickImages(), { maxSize: 960 });
              if (!id) return;
              banner.image = id;
              onEdit();
            },
          }, banner.image ? '배너 이미지 변경' : '배너 이미지 선택'),
        );
      } else {
        replace(detail,
          field('문구', textInput(banner, 'text', { onChange: onEdit, maxLength: LIMITS.bannerText })),
          h('div', { class: 'adm-row' },
            field('배경색', h('input', { class: 'adm-color', type: 'color', value: banner.bg, onInput: (e) => { banner.bg = e.target.value; onEdit(); } })),
            field('글자색', h('input', { class: 'adm-color', type: 'color', value: banner.color, onInput: (e) => { banner.color = e.target.value; onEdit(); } })),
          ),
        );
      }
    }

    refreshPreview();
    renderDetail();

    return h('div', { class: 'adm-card is-flat' },
      h('div', { class: 'adm-card-head' },
        h('span', { class: 'adm-card-label' }, `배너 ${index + 1}`),
        itemActions({
          onUp: index > 0 ? () => move(index, -1) : null,
          onDown: index < banners.length - 1 ? () => move(index, 1) : null,
          onDelete: () => remove(index),
        }),
      ),
      preview,
      h('div', { class: 'adm-row' },
        segmented(SLOT_OPTIONS, banner.slot, (v) => { banner.slot = v; changed(); }),
        segmented(TYPE_OPTIONS, banner.type, (v) => { banner.type = v; renderDetail(); onEdit(); }),
      ),
      detail,
    );
  }

  function move(index, delta) {
    if (moveItem(banners, index, delta)) {
      changed();
      render();
    }
  }

  async function remove(index) {
    if (!(await confirmSheet({ title: '이 배너를 삭제할까요?', okLabel: '삭제', danger: true }))) return;
    banners.splice(index, 1);
    changed();
    render();
  }

  function render() {
    replace(wrap,
      banners.map(bannerCard),
      banners.length < LIMITS.banners &&
        h('button', {
          type: 'button',
          class: 'adm-btn is-dashed is-block',
          onClick: () => {
            banners.push(createBanner('top'));
            changed();
            render();
          },
        }, '+ 배너 추가'),
    );
  }

  render();
  return wrap;
}
