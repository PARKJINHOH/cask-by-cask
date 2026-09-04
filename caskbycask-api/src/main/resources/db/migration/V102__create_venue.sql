-- 주류 장소(바·몰트바·보틀샵·면세점) 지도.
--
-- 왜 stores 를 안 쓰는가 — stores 는 가격 제보의 "판매처 이름" 슬롯이라 좌표도, 도시 모델도,
-- 생성 경로(컨트롤러·서비스·관리화면)도 없다. region 은 아무도 채우지 않는 자유 텍스트다.
-- 다만 면세점·보틀샵은 두 표에 같은 업소가 들어갈 수 있어 venue.store_id 슬롯만 미리 열어 둔다
-- (릴리스 1 에서는 채우지 않는다).
--
-- 도시를 venue 의 자유 텍스트 컬럼이 아니라 카탈로그 표로 두는 이유:
--   1) 도시 지도의 중심좌표·줌은 어느 venue 의 속성도 아니다. venue 들의 bbox 로 계산하면
--      가게가 하나 추가되거나 숨겨질 때마다 지도 초기 화면이 튄다.
--   2) 'osaka' 와 'osaka-shi' 를 각각 입력하면 브라우즈 UI 에서 도시가 둘로 갈라지는데
--      SELECT DISTINCT 로는 막을 수 없다.
--   3) 정렬 순서·표기 오타 일괄 수정·"venue 0건인 도시 숨기기"를 둘 자리가 없다.
-- 새 도시 추가는 마이그레이션이 아니라 관리자 화면의 INSERT 다 — 도시는 스키마가 아니라 데이터다.
--
-- FK 는 걸지 않는다(V100 과 동일). 정리는 서비스에서 명시적으로 한다 —
-- VenueService.delete(장소 삭제 시 댓글·이미지), VenueCityService.deactivate(도시는 물리 삭제 금지).
CREATE TABLE venue_city (
    id BIGINT NOT NULL AUTO_INCREMENT,
    country_code CHAR(2) NOT NULL COMMENT '국가 코드(ISO 3166-1 alpha-2, 소문자)',
    slug VARCHAR(60) NOT NULL COMMENT 'URL 세그먼트 — /venues/{country_code}/{slug}',
    name_ko VARCHAR(80) NOT NULL COMMENT '도시명(한글)',
    name_en VARCHAR(80) NOT NULL COMMENT '도시명(영문)',
    center_lat DECIMAL(9,7) NOT NULL COMMENT '지도 초기 중심 위도',
    center_lng DECIMAL(10,7) NOT NULL COMMENT '지도 초기 중심 경도',
    default_zoom DECIMAL(4,2) NOT NULL DEFAULT 11.00 COMMENT '지도 초기 줌 레벨',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '국가 내 노출 순서(작을수록 먼저)',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '노출 여부 — 물리 삭제 대신 이 값을 내린다',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_venue_city_country_slug UNIQUE (country_code, slug),
    INDEX idx_venue_city_country_sort (country_code, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='주류 장소 도시 카탈로그';

CREATE TABLE venue (
    id BIGINT NOT NULL AUTO_INCREMENT,
    venue_city_id BIGINT NOT NULL COMMENT '도시(venue_city.id)',
    country_code CHAR(2) NOT NULL COMMENT '국가 코드 — venue_city 에서 비정규화(국가 페이지가 조인 없이 인덱스 하나로 끝나게)',
    venue_type VARCHAR(20) NOT NULL COMMENT '장소 유형 — BAR/MALT_BAR/BOTTLE_SHOP/DUTY_FREE/OTHER',
    name_ko VARCHAR(200) NOT NULL COMMENT '장소명(한글)',
    name_en VARCHAR(200) NULL COMMENT '장소명(영문) — 없으면 name_ko 로 폴백',
    name_local VARCHAR(200) NULL COMMENT '현지 표기(漢字/かな 등) — 현장에서 간판을 찾는 데 쓴다',
    address VARCHAR(300) NOT NULL COMMENT '주소',
    address_detail VARCHAR(200) NULL COMMENT '상세 주소(층·호수) — 숨은 바에서는 이게 핵심 정보다',
    lat DECIMAL(9,7) NULL COMMENT '위도 — status=ACTIVE 로 올릴 때 VenueService 가 필수 검증한다',
    lng DECIMAL(10,7) NULL COMMENT '경도',
    phone VARCHAR(40) NULL COMMENT '전화번호(원문 표기 그대로)',
    website VARCHAR(500) NULL COMMENT '웹사이트',
    instagram_url VARCHAR(500) NULL COMMENT '인스타그램',
    opening_hours TEXT NULL COMMENT '영업시간(자유 텍스트) — 구조화하지 않는다, JSON-LD 에도 싣지 않는다',
    google_maps_url VARCHAR(500) NULL COMMENT '구글 지도 URL(관리자 검증본)',
    naver_maps_url VARCHAR(500) NULL COMMENT '네이버 지도 URL(관리자 검증본)',
    kakao_maps_url VARCHAR(500) NULL COMMENT '카카오 지도 URL(관리자 검증본)',
    google_place_id VARCHAR(120) NULL COMMENT '구글 place id',
    naver_place_id VARCHAR(60) NULL COMMENT '네이버 place id',
    description_ko TEXT NULL COMMENT '소개(한글)',
    description_en TEXT NULL COMMENT '소개(영문)',
    status VARCHAR(20) NOT NULL DEFAULT 'HIDDEN' COMMENT '생애주기 — ACTIVE/HIDDEN/CLOSED. 승인 상태가 아니다(승인은 venue_register_request)',
    store_id BIGINT NULL COMMENT '가격 트래커 판매처(stores.id) 연결 슬롯 — 릴리스 1 미사용',
    submitted_by_id BIGINT NULL COMMENT '제보자(users.id)',
    deleted_at DATETIME(6) NULL COMMENT '소프트 삭제 시각',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_venue_city_status (venue_city_id, status, id),
    INDEX idx_venue_country_status (country_code, status, id),
    INDEX idx_venue_bbox (lat, lng)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='주류 장소(바·보틀샵·면세점)';
