-- =============================================================================
-- 세부 캐스크 값 한글 → 영문 전환 (조사 SELECT + 변환 UPDATE)
-- =============================================================================
-- 배경 — 세부 캐스크 값은 상세 화면에서 **언어 구분 없이 그대로** 노출된다
--        (SpiritDetailPage 의 캐스크 칩 / Cask Finish / Cask 행).
--        언어별 번역본이 없으므로 영문으로 통일한다. 등록 폼 placeholder 와
--        조사 프롬프트(docs/*-research-prompt.md)는 이미 영문으로 바뀌었고,
--        이 스크립트는 **그 이전에 한글로 저장된 기존 데이터**를 정리한다.
--
-- 대상 컬럼 — 전부 TEXT 에 담긴 JSON 이다(전용 컬럼이 아니다).
--   spirit_whisky_detail.extra_data  $.caskDetails    { "EX_SHERRY": ["올로로소 셰리 벗", ...], ... }
--                                    $.caskTypeOther  "매실주 캐스크"   (캐스크 대분류 OTHER 직접 입력)
--   spirit_cognac_detail.extra_data  $.caskFinish     "포트 캐스크 피니시"
--   spirit_other_detail.extra_data   $.caskType       "ex-Bourbon, 버진 오크"
--
-- 에디션(하위 판본)은 **별도 spirit 행**이라(Spirit.variants) 위 테이블만 훑으면
-- 마스터와 에디션이 함께 잡힌다. 따로 처리할 것 없다.
--
-- 검색 인덱스 — extra_data 에는 @FullTextField/@KeywordField 가 없다
--   (SpiritWhiskyDetail 은 style, SpiritCognacDetail 은 grade 만 인덱싱).
--   따라서 이 UPDATE 후 **Hibernate Search 재색인은 필요 없다.**
--
-- 실행 순서 — 1 조사 → 2 매핑 작성 → 3 검증 → 4 변환 → 5 사후 확인.
--            3 에서 미매핑이 0 이 되기 전에는 4 를 실행하지 말 것.
--
-- ※ 이 스크립트는 **실제 DB 에 실행해 검증하지 않았다.** 작성자 환경에 MariaDB 가 없었다.
--   컬럼·JSON 키 이름은 스키마(V1__init_baseline.sql)와 SpiritDetailService 에서 확인했지만,
--   JSON 함수 동작은 반드시 0-B 스모크 테스트 → 개발 DB 순으로 확인한 뒤 운영에 쓸 것.
--
-- 필요 버전 — MariaDB 10.4.5+ 면 전부 동작한다.
--   JSON_VALUE/JSON_LENGTH/JSON_SEARCH 10.2.4+, CTE 10.2.2+,
--   JSON_MERGE_PATCH 10.2.25+/10.3.16+/10.4.5+ (4-B 에서만 사용).
--   SELECT VERSION(); 으로 먼저 확인할 것.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 0. 준비
-- ─────────────────────────────────────────────────────────────────────────────

-- 0-A. 백업. 되돌릴 수 있어야 한다.
--   mysqldump -u <user> -p caskbycask_prod \
--     spirit_whisky_detail spirit_cognac_detail spirit_other_detail \
--     > cask_backup_$(date +%Y%m%d_%H%M).sql

-- 0-B. 스모크 테스트 — 아래 3줄이 기대대로 나오는지 먼저 확인한다.
--      JSON 경로에 상수가 아닌 식(CONCAT)을 쓰므로 서버 버전에 따라 동작이 다를 수 있다.
--      기대값: ko_hit=1, len=2, val='올로로소 셰리 벗'
SELECT
    '올로로소' REGEXP '[가-힣ㄱ-ㅎㅏ-ㅣ]'                                                AS ko_hit,
    JSON_LENGTH('{"EX_SHERRY":["올로로소 셰리 벗","Refill Hogshead"]}', CONCAT('$.', 'EX_SHERRY')) AS len,
    JSON_VALUE('{"EX_SHERRY":["올로로소 셰리 벗","Refill Hogshead"]}', CONCAT('$.', 'EX_SHERRY', '[', 0, ']')) AS val;
-- len 이 NULL 로 나오면 이 서버는 식(expression) 경로를 지원하지 않는 것이다.
-- 그때는 아래 쿼리의 CONCAT 경로를 캐스크 코드별 리터럴 11개로 풀어 쓰거나
-- (JSON_TABLE 이 있는 MariaDB 10.6+ 라면) JSON_TABLE 로 바꿔 쓴다.


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. 조사 — 지금 무엇이 한글로 들어가 있는가
-- ─────────────────────────────────────────────────────────────────────────────

-- 공통 뷰 정의. 아래 1-A ~ 1-D 와 3, 4 에서 반복해 쓴다.
-- (뷰로 만들지 않고 매번 WITH 로 붙인다 — 운영 DB 에 객체를 남기지 않기 위해서다.)

-- 1-A. 위스키 세부 캐스크 전체 펼치기 — 한 행 = 값 하나
--      spirit_id / 캐스크 대분류 / 배열 위치 / 값 / 한글 포함 여부
WITH RECURSIVE
idx(i) AS (
    SELECT 0 UNION ALL SELECT i + 1 FROM idx WHERE i < 19   -- 배열 최대 20개까지 훑는다
),
code(c) AS (
    SELECT 'EX_BOURBON'  UNION ALL SELECT 'NEW_OAK'   UNION ALL SELECT 'EX_SHERRY'
    UNION ALL SELECT 'EX_PORT'  UNION ALL SELECT 'EX_WINE'  UNION ALL SELECT 'EX_RUM'
    UNION ALL SELECT 'EX_COGNAC' UNION ALL SELECT 'EX_CALVADOS' UNION ALL SELECT 'EX_BEER'
    UNION ALL SELECT 'MIZUNARA' UNION ALL SELECT 'OTHER'
),
detail AS (
    SELECT d.spirit_id,
           code.c AS cask_code,
           idx.i  AS pos,
           JSON_VALUE(d.extra_data, CONCAT('$.caskDetails.', code.c, '[', idx.i, ']')) AS val
    FROM spirit_whisky_detail d
    CROSS JOIN code
    JOIN idx
      ON idx.i < IFNULL(JSON_LENGTH(d.extra_data, CONCAT('$.caskDetails.', code.c)), 0)
)
SELECT t.spirit_id,
       s.name_ko,
       t.cask_code,
       t.pos,
       t.val,
       (t.val REGEXP '[가-힣ㄱ-ㅎㅏ-ㅣ]') AS has_korean
FROM detail t
JOIN spirit s ON s.id = t.spirit_id
WHERE t.val IS NOT NULL AND t.val <> ''
ORDER BY has_korean DESC, t.spirit_id, t.cask_code, t.pos;


-- 1-B. ★ 번역해야 할 목록 — 한글이 섞인 값만, 중복 제거 + 사용 건수
--      이 결과가 2번 매핑 테이블에 넣을 원본이다.
WITH RECURSIVE
idx(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM idx WHERE i < 19),
code(c) AS (
    SELECT 'EX_BOURBON'  UNION ALL SELECT 'NEW_OAK'   UNION ALL SELECT 'EX_SHERRY'
    UNION ALL SELECT 'EX_PORT'  UNION ALL SELECT 'EX_WINE'  UNION ALL SELECT 'EX_RUM'
    UNION ALL SELECT 'EX_COGNAC' UNION ALL SELECT 'EX_CALVADOS' UNION ALL SELECT 'EX_BEER'
    UNION ALL SELECT 'MIZUNARA' UNION ALL SELECT 'OTHER'
),
detail AS (
    SELECT d.spirit_id, code.c AS cask_code, idx.i AS pos,
           JSON_VALUE(d.extra_data, CONCAT('$.caskDetails.', code.c, '[', idx.i, ']')) AS val
    FROM spirit_whisky_detail d
    CROSS JOIN code
    JOIN idx ON idx.i < IFNULL(JSON_LENGTH(d.extra_data, CONCAT('$.caskDetails.', code.c)), 0)
)
SELECT t.val                                   AS ko,
       COUNT(*)                                AS 건수,
       COUNT(DISTINCT t.spirit_id)             AS 주류수,
       GROUP_CONCAT(DISTINCT t.cask_code ORDER BY t.cask_code SEPARATOR ',') AS 쓰인_대분류
FROM detail t
WHERE t.val REGEXP '[가-힣ㄱ-ㅎㅏ-ㅣ]'
GROUP BY t.val
ORDER BY 건수 DESC, ko;


-- 1-C. 나머지 3개 자유 입력 캐스크 필드 — 한글이 섞인 값
--      (위스키 caskTypeOther / 꼬냑 caskFinish / 기타 caskType)
SELECT 'WHISKY' AS 카테고리, 'caskTypeOther' AS 필드, d.spirit_id, s.name_ko,
       JSON_VALUE(d.extra_data, '$.caskTypeOther') AS val
FROM spirit_whisky_detail d JOIN spirit s ON s.id = d.spirit_id
WHERE JSON_VALUE(d.extra_data, '$.caskTypeOther') REGEXP '[가-힣ㄱ-ㅎㅏ-ㅣ]'
UNION ALL
SELECT 'COGNAC', 'caskFinish', d.spirit_id, s.name_ko,
       JSON_VALUE(d.extra_data, '$.caskFinish')
FROM spirit_cognac_detail d JOIN spirit s ON s.id = d.spirit_id
WHERE JSON_VALUE(d.extra_data, '$.caskFinish') REGEXP '[가-힣ㄱ-ㅎㅏ-ㅣ]'
UNION ALL
SELECT 'OTHER', 'caskType', d.spirit_id, s.name_ko,
       JSON_VALUE(d.extra_data, '$.caskType')
FROM spirit_other_detail d JOIN spirit s ON s.id = d.spirit_id
WHERE JSON_VALUE(d.extra_data, '$.caskType') REGEXP '[가-힣ㄱ-ㅎㅏ-ㅣ]'
ORDER BY 카테고리, spirit_id;


-- 1-D. 가드 — 세부 캐스크 배열이 20개를 넘는 행이 있으면 1-A/1-B 가 뒤쪽을 놓친다.
--      결과가 0행이어야 정상.
SELECT d.spirit_id, k.cask_code, JSON_LENGTH(d.extra_data, CONCAT('$.caskDetails.', k.cask_code)) AS len
FROM spirit_whisky_detail d
JOIN (
    SELECT 'EX_BOURBON' AS cask_code UNION ALL SELECT 'NEW_OAK'   UNION ALL SELECT 'EX_SHERRY'
    UNION ALL SELECT 'EX_PORT'  UNION ALL SELECT 'EX_WINE'  UNION ALL SELECT 'EX_RUM'
    UNION ALL SELECT 'EX_COGNAC' UNION ALL SELECT 'EX_CALVADOS' UNION ALL SELECT 'EX_BEER'
    UNION ALL SELECT 'MIZUNARA' UNION ALL SELECT 'OTHER'
) k
WHERE JSON_LENGTH(d.extra_data, CONCAT('$.caskDetails.', k.cask_code)) > 20;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. 매핑 테이블 — 1-B / 1-C 결과를 보고 사람이 채운다
-- ─────────────────────────────────────────────────────────────────────────────
-- **완전 일치**로만 치환한다. 부분 문자열 치환은 하지 않는다 —
-- '포트'를 무턱대고 'Port' 로 바꾸면 다른 값이 함께 망가진다.

DROP TABLE IF EXISTS cask_text_map;
CREATE TABLE cask_text_map (
    ko VARCHAR(100) NOT NULL PRIMARY KEY COMMENT '기존 저장 값(완전 일치)',
    en VARCHAR(100) NOT NULL             COMMENT '바꿔 넣을 영문 표기'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='세부 캐스크 한→영 임시 매핑';

-- ▼ 아래는 **자주 쓰이는 표기의 시드일 뿐**이다. 실제 DB 에 무엇이 있는지는 모른다.
--   1-B / 1-C 결과와 대조해 없는 줄은 지우고, 빠진 값은 반드시 추가할 것.
INSERT INTO cask_text_map (ko, en) VALUES
  -- 버번 / 버진 오크
  ('아메리칸 오크 배럴',      'American Oak Barrel'),
  ('아메리칸 오크',           'American Oak'),
  ('버번 배럴',               'Bourbon Barrel'),
  ('버번 캐스크',             'Bourbon Cask'),
  ('퍼스트 필 버번',          'First-fill Bourbon Barrel'),
  ('퍼스트필 버번',           'First-fill Bourbon Barrel'),
  ('리필 버번',               'Refill Bourbon Barrel'),
  ('버진 오크',               'Virgin Oak'),
  ('아메리칸 버진 오크',      'American Virgin Oak'),
  -- 셰리
  ('올로로소',                'Oloroso'),
  ('올로로소 셰리',           'Oloroso Sherry Cask'),
  ('올로로소 셰리 벗',        'Oloroso Sherry Butt'),
  ('PX',                      'Pedro Ximénez'),
  ('PX 셰리',                 'Pedro Ximénez Sherry Cask'),
  ('페드로 히메네스',         'Pedro Ximénez'),
  ('피노',                    'Fino'),
  ('만자니야',                'Manzanilla'),
  ('아몬티야도',              'Amontillado'),
  ('팔로 코르타도',           'Palo Cortado'),
  ('셰리 벗',                 'Sherry Butt'),
  ('셰리 혹스헤드',           'Sherry Hogshead'),
  ('퍼스트 필 셰리',          'First-fill Sherry Cask'),
  ('리필 혹스헤드',           'Refill Hogshead'),
  -- 포트 / 주정강화
  ('포트',                    'Port'),
  ('포트 파이프',             'Port Pipe'),
  ('마데이라',                'Madeira'),
  ('소테른',                  'Sauternes'),
  ('마르살라',                'Marsala'),
  ('말라가',                  'Málaga'),
  ('토카이',                  'Tokaji'),
  -- 와인
  ('레드 와인',               'Red Wine Cask'),
  ('샤르도네',                'Chardonnay Cask'),
  ('비노 바리끄',             'Vino Barrique'),
  ('비노 바리크',             'Vino Barrique'),
  -- 그 외 대분류
  ('다크 럼',                 'Dark Rum Cask'),
  ('화이트 럼',               'White Rum Cask'),
  ('꼬냑',                    'Cognac Cask'),
  ('그랑 샹파뉴 꼬냑',        'Grande Champagne Cognac Cask'),
  ('칼바도스',                'Calvados Cask'),
  ('임페리얼 스타우트',       'Imperial Stout Cask'),
  ('IPA',                     'IPA Cask'),
  ('미즈나라',                'Mizunara'),
  ('매실주 캐스크',           'Umeshu Cask'),
  ('피티드 캐스크',           'Peated Cask'),
  -- 꼬냑 caskFinish / 기타 caskType 에서 자주 보이는 문구
  ('포트 캐스크 피니시',      'Port Cask Finish'),
  ('셰리 캐스크 피니시',      'Sherry Cask Finish');


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. 검증 — 여기서 0행이 나와야 4번으로 넘어간다
-- ─────────────────────────────────────────────────────────────────────────────

-- 3-A. ★ 매핑되지 않은 한글 값. **0행이 아니면 2번 매핑에 줄을 추가하고 다시 돌린다.**
WITH RECURSIVE
idx(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM idx WHERE i < 19),
code(c) AS (
    SELECT 'EX_BOURBON'  UNION ALL SELECT 'NEW_OAK'   UNION ALL SELECT 'EX_SHERRY'
    UNION ALL SELECT 'EX_PORT'  UNION ALL SELECT 'EX_WINE'  UNION ALL SELECT 'EX_RUM'
    UNION ALL SELECT 'EX_COGNAC' UNION ALL SELECT 'EX_CALVADOS' UNION ALL SELECT 'EX_BEER'
    UNION ALL SELECT 'MIZUNARA' UNION ALL SELECT 'OTHER'
),
detail AS (
    SELECT d.spirit_id, code.c AS cask_code, idx.i AS pos,
           JSON_VALUE(d.extra_data, CONCAT('$.caskDetails.', code.c, '[', idx.i, ']')) AS val
    FROM spirit_whisky_detail d
    CROSS JOIN code
    JOIN idx ON idx.i < IFNULL(JSON_LENGTH(d.extra_data, CONCAT('$.caskDetails.', code.c)), 0)
)
SELECT DISTINCT t.val AS 미매핑_한글값, COUNT(*) AS 건수
FROM detail t
LEFT JOIN cask_text_map m ON m.ko = t.val
WHERE t.val REGEXP '[가-힣ㄱ-ㅎㅏ-ㅣ]' AND m.ko IS NULL
GROUP BY t.val
ORDER BY 건수 DESC;

-- 3-B. 자유 입력 3필드의 미매핑 값
SELECT * FROM (
    SELECT 'caskTypeOther' AS 필드, JSON_VALUE(extra_data, '$.caskTypeOther') AS val FROM spirit_whisky_detail
    UNION ALL
    SELECT 'caskFinish', JSON_VALUE(extra_data, '$.caskFinish') FROM spirit_cognac_detail
    UNION ALL
    SELECT 'caskType',   JSON_VALUE(extra_data, '$.caskType')   FROM spirit_other_detail
) v
LEFT JOIN cask_text_map m ON m.ko = v.val
WHERE v.val REGEXP '[가-힣ㄱ-ㅎㅏ-ㅣ]' AND m.ko IS NULL;

-- 3-C. 변경 미리보기 — 무엇이 무엇으로 바뀌는지 눈으로 확인
WITH RECURSIVE
idx(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM idx WHERE i < 19),
code(c) AS (
    SELECT 'EX_BOURBON'  UNION ALL SELECT 'NEW_OAK'   UNION ALL SELECT 'EX_SHERRY'
    UNION ALL SELECT 'EX_PORT'  UNION ALL SELECT 'EX_WINE'  UNION ALL SELECT 'EX_RUM'
    UNION ALL SELECT 'EX_COGNAC' UNION ALL SELECT 'EX_CALVADOS' UNION ALL SELECT 'EX_BEER'
    UNION ALL SELECT 'MIZUNARA' UNION ALL SELECT 'OTHER'
),
detail AS (
    SELECT d.spirit_id, code.c AS cask_code, idx.i AS pos,
           JSON_VALUE(d.extra_data, CONCAT('$.caskDetails.', code.c, '[', idx.i, ']')) AS val
    FROM spirit_whisky_detail d
    CROSS JOIN code
    JOIN idx ON idx.i < IFNULL(JSON_LENGTH(d.extra_data, CONCAT('$.caskDetails.', code.c)), 0)
)
SELECT t.spirit_id, s.name_ko, t.cask_code, t.pos,
       t.val AS 변경전, m.en AS 변경후
FROM detail t
JOIN cask_text_map m ON m.ko = t.val
JOIN spirit s ON s.id = t.spirit_id
ORDER BY t.spirit_id, t.cask_code, t.pos;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. 변환 UPDATE
-- ─────────────────────────────────────────────────────────────────────────────
-- 방식 A(권장) — 경로를 하나씩 지정하는 UPDATE 문을 SELECT 로 **생성**해서,
--                눈으로 훑은 뒤 복사해 실행한다. 가장 안전하고 되돌리기 쉽다.
-- 방식 B       — 한 번에 돌리는 대량 UPDATE. 반복 실행이 필요하다(아래 주의 참고).
-- 둘 중 하나만 쓴다.

START TRANSACTION;

-- ── 4-A-1. 위스키 caskDetails — UPDATE 문 생성 (방식 A)
--          결과 stmt 컬럼을 통째로 복사해 실행한다.
WITH RECURSIVE
idx(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM idx WHERE i < 19),
code(c) AS (
    SELECT 'EX_BOURBON'  UNION ALL SELECT 'NEW_OAK'   UNION ALL SELECT 'EX_SHERRY'
    UNION ALL SELECT 'EX_PORT'  UNION ALL SELECT 'EX_WINE'  UNION ALL SELECT 'EX_RUM'
    UNION ALL SELECT 'EX_COGNAC' UNION ALL SELECT 'EX_CALVADOS' UNION ALL SELECT 'EX_BEER'
    UNION ALL SELECT 'MIZUNARA' UNION ALL SELECT 'OTHER'
),
detail AS (
    SELECT d.spirit_id, code.c AS cask_code, idx.i AS pos,
           JSON_VALUE(d.extra_data, CONCAT('$.caskDetails.', code.c, '[', idx.i, ']')) AS val
    FROM spirit_whisky_detail d
    CROSS JOIN code
    JOIN idx ON idx.i < IFNULL(JSON_LENGTH(d.extra_data, CONCAT('$.caskDetails.', code.c)), 0)
)
SELECT CONCAT(
         'UPDATE spirit_whisky_detail SET extra_data = JSON_REPLACE(extra_data, ',
         QUOTE(CONCAT('$.caskDetails.', t.cask_code, '[', t.pos, ']')), ', ',
         QUOTE(m.en),
         ') WHERE spirit_id = ', t.spirit_id, ';'
       ) AS stmt
FROM detail t
JOIN cask_text_map m ON m.ko = t.val
ORDER BY t.spirit_id, t.cask_code, t.pos;

-- ── 4-B-1. 위스키 caskDetails — 대량 UPDATE (방식 B)
--   ※ 주의 1 — MariaDB 의 다중 테이블 UPDATE 는 한 대상 행에 대해 조인 결과 **한 건만** 적용한다.
--     한 주류에 서로 다른 한글 값이 2개 이상이면 한 번에 다 못 바꾼다.
--     그래서 "영향 행수 0" 이 나올 때까지 **반복 실행**해야 한다.
--   ※ 주의 2 — JSON_MERGE_PATCH 는 RFC 7396 병합이라 **패치 쪽 값이 null 인 키를 삭제**한다.
--     caskDetails 안에 값이 null 인 캐스크 코드가 있으면 그 코드가 통째로 사라진다.
--     실행 전 아래가 0행인지 확인할 것:
--       SELECT spirit_id FROM spirit_whisky_detail
--       WHERE JSON_SEARCH(JSON_EXTRACT(extra_data,'$.caskDetails'),'one','null') IS NOT NULL;
--     0행이 아니면 방식 B 를 쓰지 말고 방식 A(4-A-1)로 갈 것.
--   ※ 주의 3 — 방식 A 를 이미 돌렸다면 이 문장은 실행하지 않는다. 둘 중 하나만 쓴다.
UPDATE spirit_whisky_detail d
JOIN cask_text_map m
  ON JSON_SEARCH(JSON_EXTRACT(d.extra_data, '$.caskDetails'), 'one', m.ko) IS NOT NULL
SET d.extra_data = JSON_MERGE_PATCH(
        d.extra_data,
        CONCAT('{"caskDetails":',
               REPLACE(JSON_EXTRACT(d.extra_data, '$.caskDetails'),
                       JSON_QUOTE(m.ko), JSON_QUOTE(m.en)),
               '}')
    );
-- ↑ 영향 행수가 0 이 될 때까지 다시 실행할 것.

-- ── 4-2. 위스키 caskTypeOther (스칼라 — 반복 불필요)
UPDATE spirit_whisky_detail d
JOIN cask_text_map m ON m.ko = JSON_VALUE(d.extra_data, '$.caskTypeOther')
SET d.extra_data = JSON_REPLACE(d.extra_data, '$.caskTypeOther', m.en);

-- ── 4-3. 꼬냑 caskFinish
UPDATE spirit_cognac_detail d
JOIN cask_text_map m ON m.ko = JSON_VALUE(d.extra_data, '$.caskFinish')
SET d.extra_data = JSON_REPLACE(d.extra_data, '$.caskFinish', m.en);

-- ── 4-4. 기타 주류 caskType
UPDATE spirit_other_detail d
JOIN cask_text_map m ON m.ko = JSON_VALUE(d.extra_data, '$.caskType')
SET d.extra_data = JSON_REPLACE(d.extra_data, '$.caskType', m.en);

-- 5번 확인까지 마친 뒤 COMMIT. 이상하면 ROLLBACK.
-- COMMIT;
-- ROLLBACK;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. 사후 확인
-- ─────────────────────────────────────────────────────────────────────────────

-- 5-A. 한글이 남은 세부 캐스크 — 0행이어야 한다
WITH RECURSIVE
idx(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM idx WHERE i < 19),
code(c) AS (
    SELECT 'EX_BOURBON'  UNION ALL SELECT 'NEW_OAK'   UNION ALL SELECT 'EX_SHERRY'
    UNION ALL SELECT 'EX_PORT'  UNION ALL SELECT 'EX_WINE'  UNION ALL SELECT 'EX_RUM'
    UNION ALL SELECT 'EX_COGNAC' UNION ALL SELECT 'EX_CALVADOS' UNION ALL SELECT 'EX_BEER'
    UNION ALL SELECT 'MIZUNARA' UNION ALL SELECT 'OTHER'
),
detail AS (
    SELECT d.spirit_id, code.c AS cask_code, idx.i AS pos,
           JSON_VALUE(d.extra_data, CONCAT('$.caskDetails.', code.c, '[', idx.i, ']')) AS val
    FROM spirit_whisky_detail d
    CROSS JOIN code
    JOIN idx ON idx.i < IFNULL(JSON_LENGTH(d.extra_data, CONCAT('$.caskDetails.', code.c)), 0)
)
SELECT t.spirit_id, t.cask_code, t.pos, t.val
FROM detail t
WHERE t.val REGEXP '[가-힣ㄱ-ㅎㅏ-ㅣ]';

-- 5-B. JSON 이 깨지지 않았는지 — 세 테이블 모두 0행이어야 한다
SELECT 'whisky' AS t, spirit_id FROM spirit_whisky_detail WHERE extra_data IS NOT NULL AND JSON_VALID(extra_data) = 0
UNION ALL
SELECT 'cognac', spirit_id FROM spirit_cognac_detail WHERE extra_data IS NOT NULL AND JSON_VALID(extra_data) = 0
UNION ALL
SELECT 'other',  spirit_id FROM spirit_other_detail  WHERE extra_data IS NOT NULL AND JSON_VALID(extra_data) = 0;

-- 5-C. 캐스크 외 키가 사라지지 않았는지 표본 확인 (notes·brandName 등)
SELECT spirit_id, JSON_KEYS(extra_data) AS keys_now
FROM spirit_whisky_detail
WHERE extra_data IS NOT NULL
LIMIT 20;

-- 5-D. 정리
-- DROP TABLE cask_text_map;


-- =============================================================================
-- 남은 것 — 승인 대기 중인 등록 요청
-- =============================================================================
-- spirit_register_request.spirit_data (TEXT) 에도 사용자가 제출한 caskDetails 가
-- 그대로 들어 있다. 승인 시 위 테이블로 옮겨 간다. 대기 건수가 적으면 관리자 화면에서
-- 고치는 편이 낫고, 많으면 아래로 대상만 확인한 뒤 같은 방식으로 처리한다.
SELECT id, status, JSON_VALUE(spirit_data, '$.nameKo') AS name_ko
FROM spirit_register_request
WHERE status = 'PENDING'
  AND JSON_EXTRACT(spirit_data, '$.whiskyDetail.caskDetails') REGEXP '[가-힣ㄱ-ㅎㅏ-ㅣ]';
