-- =============================================================================
-- [패치 9] posts: 소식 게시판(NOTICE) 증류소 태그 컬럼 추가
-- =============================================================================
-- DISTILLERY(PARTNER) 계정이 소식 작성 시 본인 담당 증류소를 태그. ADMIN은 임의/생략.
-- local/dev 는 ddl-auto 가 컬럼을 자동 추가하지만, prod(ddl-auto: none)는 본 마이그레이션으로 추가한다.
-- FK 제약은 두지 않고(엔티티가 @JoinColumn만 사용) 인덱스로만 관리 — 베이스라인 컨벤션과 동일.
-- =============================================================================

ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS distillery_tag_id BIGINT NULL;

CREATE INDEX IF NOT EXISTS idx_post_distillery_tag ON posts (distillery_tag_id);
