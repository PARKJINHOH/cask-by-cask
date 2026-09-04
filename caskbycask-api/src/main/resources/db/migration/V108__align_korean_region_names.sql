-- 대한민국 지역 표기를 산지 카탈로그(WineRegion 의 KR_* 시도 17개)에 맞춘다.
--
-- 왜 어긋나 있었나
--   생산자 등록 화면의 지역 목록에만 있던 '충청도'(시도가 아닌 통합 명칭)로 저장된 행은
--   카탈로그에 같은 이름이 없어 LegacyWineRegionResolver 가 코드를 찾지 못했다.
--   주류의 '경기도 김포'처럼 시·군을 덧붙인 표기도 같은 이유로 코드가 비어 있었다.
--   국내 와이너리는 KR 산지가 WINE 을 지원하지 않아 애초에 코드가 붙을 수 없었다 —
--   이 마이그레이션과 같은 변경에서 WineRegion 의 KR_* 에 WINE 을 추가했다.
--
-- 규약은 V63·V68 을 그대로 따른다: spirit.region 은 L1 한글명으로 동기화하고
-- producer.region 원문은 보존한다. 다만 카탈로그에 아예 없는 이름('충청도')은 바로잡는다 —
-- 그대로 두면 관리자 화면에서 목록에 없는 값이라 직접입력 칸으로 뜬다.

-- ── ① 생산자 — '충청도' 를 실제 소재지 시도로 ──────────────────────
-- 여포와인농장·샤토 마니는 충북 영동(와인 특구), 예산사과와인은 충남 예산이다.
UPDATE producer
SET region = '충청북도'
WHERE country = '대한민국'
  AND TRIM(region) = '충청도'
  AND name_ko IN ('여포와인농장', '샤토 마니');

UPDATE producer
SET region = '충청남도'
WHERE country = '대한민국'
  AND TRIM(region) = '충청도'
  AND name_ko = '예산사과와인';

-- ── ② 주류 — 시·군을 덧붙인 표기를 시도로 ────────────────────────
-- 카탈로그 L1 은 시도 단위다. 김포·남양주 같은 소재지는 증류소명이 이미 전달한다.
UPDATE spirit
SET region = '경기도'
WHERE country = '대한민국'
  AND TRIM(region) IN ('경기도 김포', '경기도 남양주');

-- ── ③ 이름이 카탈로그와 같은데 코드가 비어 있는 행을 채운다 ──────────
CREATE TEMPORARY TABLE tmp_kr_region_code (
    region_name VARCHAR(100) NOT NULL PRIMARY KEY,
    region_code VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tmp_kr_region_code (region_name, region_code) VALUES
    ('경기도',   'KR_GYEONGGI'),
    ('강원도',   'KR_GANGWON'),
    ('충청북도', 'KR_CHUNGBUK'),
    ('충청남도', 'KR_CHUNGNAM'),
    ('전라북도', 'KR_JEONBUK'),
    ('전라남도', 'KR_JEONNAM'),
    ('경상북도', 'KR_GYEONGBUK'),
    ('경상남도', 'KR_GYEONGNAM'),
    ('제주도',   'KR_JEJU'),
    ('서울',     'KR_SEOUL'),
    ('인천',     'KR_INCHEON'),
    ('부산',     'KR_BUSAN'),
    ('대구',     'KR_DAEGU'),
    ('대전',     'KR_DAEJEON'),
    ('광주',     'KR_GWANGJU'),
    ('울산',     'KR_ULSAN'),
    ('세종',     'KR_SEJONG');

-- 지역이 비어 있는 전국 단위 기업(하이트진로·롯데칠성 등)은 JOIN 에서 빠져 그대로 NULL 로 남는다.
UPDATE producer p
JOIN tmp_kr_region_code m ON m.region_name = TRIM(p.region)
SET p.region_code = m.region_code
WHERE p.country = '대한민국'
  AND p.region_code IS NULL;

UPDATE spirit s
JOIN tmp_kr_region_code m ON m.region_name = TRIM(s.region)
SET s.region_code = m.region_code
WHERE s.country = '대한민국'
  AND s.region_code IS NULL;

-- 에디션은 마스터 산지를 따른다(V68 과 같은 규칙).
UPDATE spirit child
JOIN spirit parent ON parent.id = child.parent_id
SET child.region_code = parent.region_code,
    child.region = parent.region
WHERE child.region_code IS NULL
  AND parent.region_code IS NOT NULL
  AND parent.country = '대한민국';

DROP TEMPORARY TABLE tmp_kr_region_code;
