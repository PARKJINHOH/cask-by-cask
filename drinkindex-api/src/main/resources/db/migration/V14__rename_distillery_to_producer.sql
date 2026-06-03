-- =============================================================================
-- 생산자 통합 2단계 — distillery → producer 전면 rename
-- =============================================================================
-- 작성 기준일: 2026-06-02
-- 배경: Distillery 엔티티/도메인을 Producer 로 rename(타입 컬럼으로 증류소/와이너리/
--       꼬냑하우스/기타를 모두 표현). 테이블·컬럼명을 코드와 일치시킨다.
-- 비고: RENAME TABLE 시 이 테이블을 참조하는 FK(spirit, users)는 MariaDB가 자동으로
--       새 테이블명을 가리키도록 갱신한다. 컬럼 rename 은 CHANGE COLUMN 사용.
-- =============================================================================

-- 1) 테이블 rename
RENAME TABLE distillery TO producer;
RENAME TABLE distillery_register_request TO producer_register_request;

-- 2) 컬럼 rename
ALTER TABLE producer_register_request
    CHANGE COLUMN distillery_data producer_data TEXT NOT NULL;

ALTER TABLE spirit
    CHANGE COLUMN distillery_id producer_id BIGINT NULL;

ALTER TABLE users
    CHANGE COLUMN distillery_id producer_id BIGINT NULL;
