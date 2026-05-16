# DrinkIndex 관리자 디자인 가이드

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
