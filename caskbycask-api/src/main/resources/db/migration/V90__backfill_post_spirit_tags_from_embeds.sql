-- =============================================================================
-- 본문 주류 카드 임베드 → 게시글 주류 태그 백필
-- =============================================================================
-- V76 은 태그를 이미지 갤러리(PHOTO)의 주류 선택기 전용으로 만들었고, 주석에
-- "본문 리치텍스트의 주류 카드 임베드(data-spirit-id)는 HTML 안이라 조회가 불가능하다"
-- 고 적어 두었다. 그 한계 때문에 자유·소식 게시판 글은 아무리 특정 주류를 다루어도
-- 주류 상세에서 되짚어 올 방법이 없었다.
--
-- PostService.applySpiritTags 가 이제 저장 시점에 임베드를 파싱해 태그 행으로 옮긴다.
-- 이 마이그레이션은 그 규칙을 "이미 저장된 글"에 소급 적용한다.
--
-- 구현 노트:
--   · MariaDB 의 REGEXP_SUBSTR 은 MySQL 과 달리 occurrence 인자를 받지 않아,
--     글 하나에 임베드가 여러 개일 때 정규식으로는 전부 뽑아낼 수 없다.
--     그래서 spirit 테이블과 LIKE 로 맞대어 dialect 에 의존하지 않게 했다.
--   · 앞의 WHERE 로 임베드가 있는 글만 남기므로 실제 비교 대상은 극히 일부다.
--   · 이미 있는 행은 건너뛰므로 여러 번 실행해도 안전하다.
--   · sort_order 는 선택기로 고른 태그(0부터)와 섞이지 않도록 뒤쪽 값을 준다.
-- =============================================================================

insert into post_spirit_tags (post_id, spirit_id, sort_order, created_at, updated_at)
select p.id,
       s.id,
       100,
       now(6),
       now(6)
from posts p
join spirit s
  on p.content_sanitized like concat('%data-spirit-id="', s.id, '"%')
left join post_spirit_tags existing
  on existing.post_id = p.id
 and existing.spirit_id = s.id
where p.content_sanitized like '%data-spirit-id=%'
  and existing.id is null;
