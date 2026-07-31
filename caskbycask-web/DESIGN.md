# CaskByCask 디자인 가이드

## 공통 모서리 규칙

- 사용자·관리자 화면의 카드, 패널, 모달 등 둥근 사각형은 `--radius-surface`(16px)를 사용한다.
- native button, ARIA button, 링크형 CTA, `input`, `textarea`, `select`는 `--radius-control`(8px)를 사용한다.
- 원형 상태 점, 아바타, 토글 트랙과 그래프·에디터 조작점은 형태 보존 예외다.
- Tailwind의 `rounded`, `rounded-sm`~`rounded-4xl`은 공통 surface 토큰으로 매핑되며, 버튼과 입력 요소는 전역 control 규칙이 우선한다.
- 링크형 버튼은 `inline-flex` + `rounded-*` 조합 또는 `ui-button` 클래스를 사용한다.

## 사용자 페이지 메뉴 인디케이터

- 모든 사용자 라우트는 `MainLayout`의 `PageIndicator`를 통해 같은 위치에 메뉴 경로를 표시한다.
- 홈(`/`)은 현재 위치가 자명하므로 인디케이터를 표시하지 않는다.
- 상세·작성·수정 페이지의 뒤로가기는 인디케이터 왼쪽에만 표시하고 본문에 중복 배치하지 않는다.
- 새 사용자 라우트를 추가할 때 `PageIndicator.tsx`에 경로, 번역 라벨, 안전한 복귀 경로를 함께 등록한다.
- 인디케이터 라벨은 `ko.json`과 `en.json`의 `pageIndicator` 키를 동시에 추가한다.

## 밑줄형 탭

- `border-b-2`로 현재 상태를 표시하는 탭은 모서리 반경을 적용하지 않는다.
- 전역 버튼 모서리 규칙에서 `border-b-2` 버튼을 제외해 활성 밑줄이 U자 형태로 휘지 않고 직선으로 표시되도록 한다.
- 탭 자체를 둥근 칩이나 세그먼트 버튼으로 설계할 때는 밑줄형 스타일과 혼용하지 않는다.

## 사용자 페이지 본문 폭

- 헤더, GNB, 알림 배너, 메뉴 인디케이터, 푸터는 모두 `.user-layout-container`의 최대 폭 1200px(`75rem`)과 `px-4`를 공통 기준으로 사용한다.
- 사용자 본문(`MainLayout`의 `<main>`)은 긴 문장과 게시글 가독성을 위해 `.user-content-container`의 최대 폭 1120px(`70rem`)을 사용한다. 공통 외곽보다 좁게 유지하되 본문 폭 조정은 이 클래스 한 곳에서만 한다.
- 각 페이지가 사용하는 `max-w-7xl`(`80rem`)은 위 본문 컨테이너 안에 들어가므로 실질적인 상한은 `.user-content-container`가 결정한다.
- 메인페이지는 본문 컨테이너 안에서 `[minmax(0,1fr)_320px]` 2열을 사용한다. 본문 폭을 조정할 때 주 콘텐츠 컬럼 폭을 유지하려면 늘어난 만큼 사이드바 폭을 함께 조정한다.
- 모바일에서는 최대 폭만 자연스럽게 해제되고 동일한 16px 좌우 여백을 유지한다.

## 입력 폼 필수값 표시

- 사용자·관리자 입력 폼은 필수 라벨 뒤에 공통 `RequiredMark`의 빨간색 `*`를 표시한다.
- 여러 필드가 있는 페이지·모달·폼 그룹 상단에는 `RequiredFieldsNotice`로 `* 표시는 필수 입력 항목입니다.` 안내를 한 번 제공한다.
- 라벨은 `FormFieldLabel required`를 사용하고, 공통 `Input`은 `required` 속성만 전달하면 같은 표시를 자동 적용한다. 별표를 직접 작성하지 않는다.
- 표시와 실제 동작이 어긋나지 않도록 native 입력에는 `required`와 `aria-required`를 함께 적용한다.
- 라디오·파일 드롭존·복합 선택처럼 native 입력 하나로 표현되지 않는 컨트롤은 `role="radiogroup"` 또는 적절한 그룹 역할과 `aria-required="true"`를 사용한다.
- 조건부 필수값은 해당 조건이 활성화된 동안에만 별표와 필수 속성을 표시한다.
- 검색·필터·정렬 입력은 저장 폼의 필수값 표시 대상에서 제외한다.
- 사용자 화면의 안내 문구는 `common.requiredFieldsHint` 번역키를 사용하며, 관리자 화면은 한국어 고정 모드를 사용한다.

---

## 액션 버튼 (테이블 행 내 버튼)

관리자 페이지의 모든 테이블 행 액션 버튼은 아래 두 가지 스타일로 통일한다.

### 기본 스타일 (중립 액션)

수정, 활성화/비활성화 토글, 잠금해제, 복구, 등급변경, 상세보기 등 **데이터를 유지하거나 되돌리는** 액션에 사용.

```
inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
rounded-md border border-neutral-300 bg-white text-neutral-600
hover:bg-neutral-50 transition-colors whitespace-nowrap
```

비활성화 상태(disabled)가 필요하면 `disabled:opacity-40` 추가.

### 위험 스타일 (파괴적 액션)

삭제, 계정 비활성화 등 **되돌리기 어려운** 액션에 사용.

```
inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium
rounded-md border border-red-200 bg-white text-red-600
hover:bg-red-50 transition-colors whitespace-nowrap
```

비활성화 상태(disabled)가 필요하면 `disabled:opacity-40` 추가.

### 버튼 간격

버튼이 여러 개 나열될 때는 `gap-1`을 사용한다 (`gap-2` 아님).

```tsx
<div className="flex items-center gap-1 justify-end">
  <button className="inline-flex items-center gap-1 h-7 px-2.5 ...중립 스타일...">수정</button>
  <button className="inline-flex items-center gap-1 h-7 px-2.5 ...위험 스타일...">삭제</button>
</div>
```

### 적용 기준 요약

| 액션 | 스타일 |
|------|--------|
| 수정 | 중립 |
| 활성화 / 비활성화 (콘텐츠 상태 토글) | 중립 |
| 잠금해제 | 중립 |
| 복구 | 중립 |
| 등급 변경 | 중립 |
| 상세보기 | 중립 |
| 삭제 | 위험 |
| 계정 비활성화 | 위험 |

### 참고 — 기준 페이지

`AdminBannerListPage.tsx`의 `BannerRowCells` 컴포넌트가 원본 기준이다.

---

## 소형 버튼 (그룹·태그 등 컴팩트 영역)

그룹 레이블 위에 겹쳐 표시되는 수정/삭제처럼 공간이 좁은 경우 `h-6 px-2 text-[10px]`로 축소한다.

```
/* 중립 */
inline-flex items-center h-6 px-2 text-[10px] font-medium
rounded border border-neutral-300 bg-white text-neutral-600
hover:bg-neutral-50 transition-colors whitespace-nowrap

/* 위험 */
inline-flex items-center h-6 px-2 text-[10px] font-medium
rounded border border-red-200 bg-white text-red-600
hover:bg-red-50 transition-colors whitespace-nowrap
```
