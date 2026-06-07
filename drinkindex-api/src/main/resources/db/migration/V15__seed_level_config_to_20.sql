-- =============================================================================
-- DrinkIndex 기초데이터 — 회원 레벨(member_level_config) Lv.20 체계 + 명칭 리브랜딩
-- =============================================================================
-- 작성 기준일: 2026-06-07
-- 범위:
--   1) 기존 V7 에서 Lv.1~11 까지 시드 → 운영 레벨 체계를 Lv.20 까지 확장.
--   2) 전체 레벨 명칭을 "원액 → 오크통 숙성 → 컬렉터 → 레전드" 숙성 여정 테마로 리브랜딩.
--      (숫자 중심 메달형 뱃지 + 레벨이 오를수록 강해지는 임팩트 — LevelBadge.tsx 와 짝)
--
-- [주의]
--   - Flyway 버전 마이그레이션입니다. 한 번 적용된 후에는 이 파일을 수정하지 마세요.
--     (체크섬 검증 실패로 기동이 막힙니다. 보정이 필요하면 다음 V{n}__*.sql 로 추가하세요.)
--   - 신규 레벨(12~20)은 INSERT IGNORE — 이미 있으면 조용히 건너뜀.
--   - 명칭은 기존/신규 DB 모두 동일하게 맞추기 위해 INSERT 후 UPDATE 로 일괄 정렬.
--   - name / min_score 는 기본값이며, 관리자 레벨 설정 화면에서 자유롭게 수정/비활성화할 수 있습니다.
-- -----------------------------------------------------------------------------

-- 1) Lv.12 ~ Lv.20 신규 시드
INSERT IGNORE INTO member_level_config
    (level, name, min_score, is_active, created_at, updated_at)
VALUES
    (12, '리미티드',   35000,  1, NOW(6), NOW(6)),
    (13, '시그니처',   55000,  1, NOW(6), NOW(6)),
    (14, '컬렉터스',   85000,  1, NOW(6), NOW(6)),
    (15, '마스터',     130000, 1, NOW(6), NOW(6)),
    (16, '마스터피스', 190000, 1, NOW(6), NOW(6)),
    (17, '헤리티지',   280000, 1, NOW(6), NOW(6)),
    (18, '레전드',     400000, 1, NOW(6), NOW(6)),
    (19, '아이코닉',   600000, 1, NOW(6), NOW(6)),
    (20, '임모탈',     900000, 1, NOW(6), NOW(6));

-- 2) Lv.1 ~ Lv.11 명칭 리브랜딩 (기존 V7 시드 '몰트/스피릿/스카치/12yo...' → 새 테마)
UPDATE member_level_config SET name = '뉴메이크'   WHERE level = 1;
UPDATE member_level_config SET name = '캐스크'     WHERE level = 2;
UPDATE member_level_config SET name = '싱글몰트'   WHERE level = 3;
UPDATE member_level_config SET name = '셰리'       WHERE level = 4;
UPDATE member_level_config SET name = '스몰배치'   WHERE level = 5;
UPDATE member_level_config SET name = '싱글캐스크' WHERE level = 6;
UPDATE member_level_config SET name = '배럴프루프' WHERE level = 7;
UPDATE member_level_config SET name = '빈티지'     WHERE level = 8;
UPDATE member_level_config SET name = '리저브'     WHERE level = 9;
UPDATE member_level_config SET name = '올드리저브' WHERE level = 10;
UPDATE member_level_config SET name = '레어'       WHERE level = 11;

SELECT 1;
