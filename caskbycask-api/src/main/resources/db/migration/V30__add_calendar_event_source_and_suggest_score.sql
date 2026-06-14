-- =============================================================================
-- CaskByCask — 이벤트 달력 "사용자 제보" 기능
-- =============================================================================
-- 작성 기준일: 2026-06-13
-- 범위:
--   1) calendar_events 에 source 컬럼 추가 — 등록 출처 구분(ADMIN/USER).
--      사용자 제보는 source='USER', is_visible=0 으로 생성되어 검토 대기 상태가 되고,
--      관리자가 공개(is_visible=1) 전환 시 달력에 노출 + 제보자 점수 지급.
--      기존 행은 모두 관리자가 등록한 것이므로 기본값 'ADMIN'.
--   2) score_config 에 EVENT_SUGGEST_APPROVED(이벤트 제보 승인) 점수 시드 추가.
--
-- [주의]
--   - Flyway 버전 마이그레이션입니다. 적용 후 수정 금지(체크섬). 보정은 V31__*.sql 로 추가.
--   - score(점수)/is_active 등은 관리자 점수 설정 화면에서 자유롭게 수정 가능.
-- -----------------------------------------------------------------------------

-- 1) 등록 출처 컬럼
ALTER TABLE calendar_events
    ADD COLUMN source VARCHAR(10) NOT NULL DEFAULT 'ADMIN' COMMENT '등록 출처 — ADMIN(관리자)/USER(사용자 제보)';

-- 2) 이벤트 제보 승인 점수 시드 (가격제보 PRICE_REGISTER 와 동일 패턴)
INSERT IGNORE INTO score_config
    (action_type, score, daily_limit, is_active, description, created_at, updated_at)
VALUES
    ('EVENT_SUGGEST_APPROVED', 3, NULL, 1, '이벤트 제보 승인', NOW(6), NOW(6));

SELECT 1;
