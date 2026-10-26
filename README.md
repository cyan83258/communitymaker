# Community Maker

모바일 커뮤니티 게시판 형태의 가짜 웹사이트를 만들고, 원하는 결과물만 링크로 공유하는 도구입니다.
서버 없이 **GitHub Pages** 에서 동작하는 정적 사이트이므로 내 컴퓨터가 꺼져 있어도 상대가 열람할 수 있습니다.

| 페이지 | 주소 | 용도 |
| --- | --- | --- |
| 편집 사이트 | `https://아이디.github.io/저장소/editor.html` | 결과물 만들기 (데이터는 **내 브라우저**에 저장) |
| 열람 사이트 | `https://아이디.github.io/저장소/?id=공유ID` | 보내 준 결과물 보기 (읽기 전용) |

## 공유하는 방법

1. 편집 사이트에서 결과물을 만든다.
2. 결과물 카드의 **[내보내기]** → `공유ID.json` 파일이 다운로드된다.
3. GitHub 저장소의 **`data` 폴더**에 그 파일을 올린다. (Add file → Upload files, 같은 이름이면 덮어쓰기)
4. 1~2분 뒤 카드에 표시된 링크(`…/?id=공유ID`)를 상대에게 보낸다.

- 결과물 1·2·3 중 2만 올리면 2만 열람할 수 있다.
- 수정 후 다시 내보내서 덮어쓰면 **같은 링크**로 내용이 바뀐다.
- 공유를 멈추려면 GitHub `data` 폴더에서 해당 파일을 삭제한다.
- **[링크 재발급]** 은 새 공유ID 를 만든다. (다시 내보내서 올려야 하고, 예전 파일은 직접 지운다)

## 주의

- 편집 데이터는 **편집에 사용한 브라우저 안에만** 저장된다. 브라우저 기록(사이트 데이터)을 지우거나 다른 기기를 쓰면 보이지 않는다.
  내보낸 파일을 **[불러오기]** 하면 다시 편집할 수 있으므로 백업으로 보관해 두자.
- 무료 GitHub Pages 는 저장소가 공개여야 하므로 `data` 폴더에 올린 파일은 누구나 볼 수 있다.
  올리지 않은 결과물은 내 브라우저에만 있다. (결과물 이름은 내보내기 파일에 포함되지 않는다)
- 편집 사이트는 누구나 열 수 있지만, 각자 자기 브라우저의 빈 편집기만 보이므로 내 결과물을 보거나 바꿀 수 없다.

## GitHub Pages 처음 설정

1. GitHub 에서 새 **Public** 저장소를 만들고 이 폴더의 파일을 모두 올린다.
2. 저장소 **Settings → Pages → Build and deployment**
   Source: `Deploy from a branch`, Branch: `main` / `/ (root)` → Save
3. 몇 분 뒤 `https://아이디.github.io/저장소/editor.html` 접속.

## 내 컴퓨터에서 미리 보기 (선택)

```bash
npm start
```

`http://localhost:3000/editor.html` — 로컬에서 쓰는 편집기는 GitHub Pages 편집기와 저장소가 **따로**입니다.
(로컬에서 만든 결과물을 Pages 편집기로 옮기려면 내보내기 → 불러오기)

## 폴더 구조

```
index.html              열람 사이트 (?id=공유ID → data/공유ID.json 표시)
editor.html             편집 사이트
data/                   내보낸 결과물(.json)을 올리는 곳
assets/css/             base(공통 색상·프레임) · site(가짜 사이트 화면) · editor(편집기)
assets/js/shared/       데이터 구조(schema) · 닉네임 규칙(nickname) · 대댓글 트리(comments) · 날짜(format) · ID
assets/js/core/         DOM 헬퍼 · IndexedDB · 본문 HTML 정리기 · 이미지 축소 · 클립보드
assets/js/site/         가짜 사이트 렌더러 (열람·미리보기 공통)
assets/js/viewer/       열람 사이트 진입점
assets/js/editor/       편집기
  main.js               화면 라우팅
  store.js              결과물/이미지 저장소 (IndexedDB)
  session.js            편집 중 상태 + 자동 저장
  transfer.js           내보내기 / 불러오기
  siteConfig.js         열람 사이트 주소
  views/ components/ ui/  화면 · 편집 부품 · 공통 UI
scripts/serve.js        로컬 미리보기 서버 (배포에는 필요 없음)
```

### 유지보수 메모

- **데이터 필드 추가**: `assets/js/shared/schema.js` 의 `create*` · `normalize*` → 편집 UI(`editor/views`, `editor/components`) → 표시(`site/render.js`).
- **색감 변경**: `assets/css/base.css` 의 `:root` 변수.
- **본문 허용 서식 추가**: `assets/js/core/sanitize.js` 허용 목록.
- **내보내기 파일 형식 변경**: `schema.js` 의 `EXPORT_VERSION` 을 올리고 `parseExportFile` 에서 이전 버전을 변환.
