# 바틀 컬렉션(내 컬렉션) 기능 설계

**날짜**: 2026-05-26  
**상태**: 승인됨

---

## 개요

마이페이지에 위스키·꼬냑·와인 등 구매 바틀을 기록·관리하는 "내 컬렉션" 기능.  
구매일·금액·배치·매장·오픈 여부 등 상세 정보를 저장하고, 원하는 바틀만 외부에 공개(공유)할 수 있다.

---

## 결정 사항 요약

| 항목 | 결정 |
|------|------|
| 도메인 | 신규 `bottle-collection` (Wishlist와 독립 공존) |
| Spirit 연결 | DB Spirit 연결 우선, 없으면 자유 텍스트(`spiritNameText`) |
| 공유 방식 | 바틀별 `isPublic` 토글 → `/users/{userId}/bottles` 공개 페이지 |
| MyPage 탭 | 7번째 탭 "내 컬렉션" 신설 (`collection`) |
| PC 뷰 | 테이블 기본, 카드 전환 가능 |
| 모바일 뷰 | 카드 고정 |
| 이미지 | 최대 2장, 별도 `UserBottleImage` 테이블 |

---

## 1. 데이터 모델

### 1.1 `UserBottle` 엔티티

```
테이블명: user_bottle
```

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `user_id` | BIGINT | FK → user.id, NOT NULL | 소유자 |
| `spirit_id` | BIGINT | FK → spirit.id, nullable | DB Spirit 연결 (없으면 null) |
| `spirit_name_text` | VARCHAR(200) | nullable | 자유 텍스트 이름 (spirit_id가 null일 때 사용) |
| `category` | VARCHAR(50) | NOT NULL | SpiritCategory enum (SINGLE_MALT, BOURBON, WINE, COGNAC 등) |
| `purchase_date` | DATE | NOT NULL | 구매일 |
| `batch` | VARCHAR(100) | nullable | 배치·로트 번호 (예: "#12", "LL/LC") |
| `bottling_year` | VARCHAR(50) | nullable | 병입년도 (예: "2022.02", "2025.11.19 (7년 5개월 숙성)") |
| `price` | INT | NOT NULL, default 0 | 구매 금액 (원화 기준, 0 허용 — 선물 등) |
| `store` | VARCHAR(200) | NOT NULL | 구입 매장 |
| `status` | VARCHAR(20) | NOT NULL | BottleStatus enum: OPENED / UNOPENED |
| `is_public` | BOOLEAN | NOT NULL, default false | 공개 여부 |
| `memo` | TEXT | nullable | 자유 메모 |
| `created_at` | DATETIME | NOT NULL | |
| `updated_at` | DATETIME | NOT NULL | |

**인덱스**: `(user_id, purchase_date DESC)`, `(user_id, category)`, `(user_id, is_public)`

### 1.2 `UserBottleImage` 엔티티

```
테이블명: user_bottle_image
```

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `user_bottle_id` | BIGINT | FK → user_bottle.id, NOT NULL | |
| `image_url` | VARCHAR(500) | NOT NULL | S3 등 이미지 URL |
| `sort_order` | INT | NOT NULL, default 0 | 표시 순서 (0 or 1, 최대 2장) |

---

## 2. 백엔드 구조

### 2.1 패키지

```
com.drinkindex.domain.bottlecollection
├── controller/
│   └── UserBottleController.java
├── service/
│   └── UserBottleService.java
├── repository/
│   ├── UserBottleRepository.java
│   └── UserBottleImageRepository.java
├── dto/
│   ├── UserBottleRequest.java       ← 등록/수정 요청
│   ├── UserBottleResponse.java      ← 단건 응답
│   ├── UserBottleListResponse.java  ← 목록 응답 (집계 포함)
│   └── UserBottleImageRequest.java
├── entity/
│   ├── UserBottle.java
│   ├── UserBottleImage.java
│   └── BottleStatus.java            ← enum: OPENED, UNOPENED
└── query/
    └── UserBottleQueryRepository.java  ← QueryDSL 필터·집계
```

### 2.2 API 설계

#### 내 컬렉션 (인증 필요, `Authorization: Bearer <token>`)

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/v1/bottles/my` | 내 바틀 목록 + 집계 (필터: category, status, sort) |
| POST | `/api/v1/bottles` | 바틀 등록 |
| GET | `/api/v1/bottles/{id}` | 바틀 상세 조회 |
| PUT | `/api/v1/bottles/{id}` | 바틀 전체 수정 |
| DELETE | `/api/v1/bottles/{id}` | 바틀 삭제 |
| PATCH | `/api/v1/bottles/{id}/status` | 오픈/미오픈 토글 |
| PATCH | `/api/v1/bottles/{id}/public` | 공개/비공개 토글 |
| POST | `/api/v1/bottles/{id}/images` | 이미지 업로드 (최대 2장) |
| DELETE | `/api/v1/bottles/{id}/images/{imageId}` | 이미지 삭제 |

#### 공개 컬렉션 (인증 불필요)

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/v1/users/{userId}/bottles` | 특정 유저의 공개 바틀 목록 + 집계 |

### 2.3 목록 응답 구조 (`UserBottleListResponse`)

```json
{
  "bottles": [ /* UserBottleResponse 배열 */ ],
  "stats": {
    "totalCount": 22,
    "totalPrice": 2814374,
    "openedCount": 15,
    "unopenedCount": 7,
    "categoryStats": [
      { "category": "SINGLE_MALT", "count": 14 },
      { "category": "BOURBON", "count": 8 }
    ]
  }
}
```

### 2.4 보안 원칙

- 모든 내 컬렉션 API는 JWT에서 추출한 `userId`로 소유권 검증
- 타인의 바틀 수정·삭제 시 `403 Forbidden`
- 공개 컬렉션 API는 `isPublic = true`인 바틀만 반환

---

## 3. 프론트엔드 구조

### 3.1 도메인 디렉토리

```
drinkindex-web/src/domain/user-bottle/
├── api/
│   └── userBottleApi.ts
├── hooks/
│   └── useUserBottle.ts        ← React Query hooks
├── components/
│   ├── BottleCollectionTab.tsx  ← MyPage 탭 루트
│   ├── BottleStats.tsx          ← 상단 통계 바
│   ├── BottleFilterBar.tsx      ← 카테고리·상태·정렬·뷰 전환
│   ├── BottleList.tsx           ← 테이블/카드 전환 컨테이너
│   ├── BottleTable.tsx          ← PC 테이블 뷰
│   ├── BottleCardGrid.tsx       ← 카드 그리드 뷰
│   ├── BottleCard.tsx           ← 카드 단위
│   └── BottleFormModal.tsx      ← 등록·수정 모달
└── types/
    └── userBottle.types.ts
```

### 3.2 MyPage 변경

- `MyPage.tsx` 탭 배열에 `{ key: 'collection', label: t('mypage.tab.collection') }` 추가
- `collection` 탭 선택 시 `<BottleCollectionTab />` 렌더링

### 3.3 공개 컬렉션 페이지

- 경로: `/users/:userId/bottles`
- `BottleCollectionTab`과 동일 레이아웃, 편집 버튼 없음
- 비로그인 접근 가능

### 3.4 UI 레이아웃

```
┌──────────────────────────────────────────────────────┐
│  통계바: 총 N병 · ₩X,XXX,XXX · 오픈 N · 미오픈 N     │
├──────────────────────────────────────────────────────┤
│  필터: [전체][싱글몰트][버번][와인][꼬냑]              │
│        [오픈▾] [최신순▾]  [≡ 테이블][⊞ 카드]  [+ 추가]│
├──────────────────────────────────────────────────────┤
│  테이블 뷰 (PC 기본):                                  │
│  종류 | 구매일 | 품명 | 배치 | 병입년도 | 금액 | 매장 | 상태 | 공개 | 편집 │
│                                                      │
│  카드 뷰 (모바일 고정, PC 선택):                       │
│  [카드] [카드] [카드]                                  │
│  각 카드: 이미지(선택) · 종류 · 품명 · 구매일 · 금액 · 상태 · 공개 토글 │
└──────────────────────────────────────────────────────┘
```

### 3.5 등록·수정 모달 필드 순서

1. 품명 (Spirit 검색 → 없으면 직접 입력)
2. 카테고리 (Spirit 선택 시 자동, 직접 변경 가능)
3. 구매일 (date picker)
4. 금액 (숫자, 0 허용)
5. 매장
6. 배치 (선택)
7. 병입년도 (선택, 자유 텍스트)
8. 상태 (오픈 / 미오픈 토글)
9. 공개 여부 토글 (기본: 비공개)
10. 이미지 (최대 2장, 드래그앤드롭 or 클릭)
11. 메모 (선택)

### 3.6 i18n 번역 키 (ko/en 양쪽 추가)

```
mypage.tab.collection
collection.stats.totalBottles
collection.stats.totalPrice
collection.stats.opened
collection.stats.unopened
collection.filter.all
collection.filter.category.*
collection.status.opened
collection.status.unopened
collection.visibility.public
collection.visibility.private
collection.form.spiritName
collection.form.category
collection.form.purchaseDate
collection.form.price
collection.form.store
collection.form.batch
collection.form.bottlingYear
collection.form.status
collection.form.isPublic
collection.form.images
collection.form.memo
```

---

## 4. 이미지 업로드

기존 Spirit 이미지 업로드 방식(`SpiritImageService`)과 동일한 S3 패턴 사용.  
최대 2장 제한은 서버에서 검증 (`UserBottleImage` count ≥ 2이면 `400 Bad Request`).

---

## 5. 범위 외 (YAGNI)

- 바틀 간 공유/거래 기능 — 제외
- 바틀별 시음 노트 — 기존 Review 기능으로 대체
- 가격 통화 다변화 (USD, JPY 등) — 메모 필드로 대체 (예: "무카와(11600엔)")
- 바틀 일괄 가져오기(CSV import) — 제외
