-- 소식(AI) 단순화: 자동 발행과 출처 자동 등록을 없앤다.
--
-- 배경
--  - resolveSource() 가 인용 도메인마다 출처 행을 만들어 목록이 끝없이 불어났다(주류와 무관한 도메인 포함).
--    이제 출처는 관리자가 등록한 허용목록뿐이고, 코드는 행을 만들지 않는다.
--  - 자동 발행을 실제로 쓴 적이 없다. 원고는 항상 검토 대기로 저장되고 발행은 관리자가 한다.
--    그래서 자동 발행 판정에만 쓰이던 설정·출처 플래그·이미지 권리 컬럼이 전부 죽은 값이 됐다.
--  - 차단(blocked)은 자동 등록이 삭제를 되돌리는 것을 막으려고 만든 장치였다. 되살아날 경로가 없어졌으므로
--    삭제는 다시 진짜 삭제가 된다.

-- 1) 실제 수집에 쓰이던 자동 등록 출처는 관리자 소유로 승격한다.
--    생산자 도메인 자동 승격으로 만들어진 공식/전문매체 출처가 여기 해당한다.
--    이 문장을 빠뜨리고 2번만 실행하면 수집이 조용히 멈춘다.
update ai_news_source_configs
   set auto_discovered = 0
 where auto_discovered = 1
   and blocked = 0
   and source_type in ('OFFICIAL', 'TRUSTED_MEDIA');

-- 2) 남은 자동 등록 행과 차단 행을 정리한다.
--    미승인·커뮤니티 등급으로 쌓인 발견 기록이라 수집에 쓰인 적이 없다.
delete from ai_news_source_configs
 where auto_discovered = 1
    or blocked = 1;

-- 3) 차단·자동발행·공식이미지 사용 컬럼 제거.
alter table ai_news_source_configs
    drop column blocked,
    drop column blocked_at,
    drop column auto_publish_allowed,
    drop column image_use_allowed;

-- auto_discovered 는 남긴다 — 위 1번에서 승격되지 않고 살아남은 옛 행은 없지만,
-- 관리자 화면의 '등록 경로' 필터가 이 값을 읽고 앞으로도 항상 0 이다.

-- 4) 자동 발행 전용 설정 제거.
alter table ai_news_settings
    drop column auto_publish_enabled,
    drop column dry_run,
    drop column confidence_threshold,
    drop column openai_monthly_image_limit;

-- 5) 이미지 출처·권리 판정 컬럼 제거. 대표 이미지는 관리자가 에디터에서 직접 넣는다.
--    image_url 은 남긴다 — 기존 원고의 기록값이고 본문에 심어 둔 <img> 와 짝을 이룬다.
alter table ai_news_articles
    drop column image_kind,
    drop column image_rights_evidence;

-- 6) 원고가 만들어졌지만 자동 발행 조건에 걸려 HOLD 로 밀려 있던 주제를 작성 대기로 되돌린다.
--    HOLD 는 이제 관리자가 직접 보류할 때만 쓰인다.
update ai_news_topics
   set status = 'READY'
 where status = 'HOLD'
   and id not in (select distinct topic_id from ai_news_articles where topic_id is not null);
