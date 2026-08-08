-- AI 소식 출처 차단.
-- 기사 수집 시 처음 보는 도메인은 ai_news_source_configs 에 자동 등록된다(AiNewsService.resolveSource).
-- 그래서 관리자가 무관한 출처를 삭제해도 다음 수집에서 같은 행이 되살아났다.
-- 자동 등록 출처는 삭제 대신 '차단'으로 남겨 재등록을 막는다.
alter table ai_news_source_configs
    add column blocked bit not null default b'0' after enabled,
    add column blocked_at datetime(6) null after blocked,
    add column auto_discovered bit not null default b'0' after image_use_allowed;

-- 기존 행 백필: 미승인 등급은 수집 과정에서 자동 등록된 것으로 본다.
-- (관리자 등록 폼의 기본값은 공식이고, 자동 등록 경로만 UNAPPROVED 를 만든다 —
--  잘못 판정되어도 결과는 "삭제 시 hard delete 대신 차단"이라 차단 해제로 되돌릴 수 있다.)
update ai_news_source_configs set auto_discovered = b'1' where source_type = 'UNAPPROVED';
