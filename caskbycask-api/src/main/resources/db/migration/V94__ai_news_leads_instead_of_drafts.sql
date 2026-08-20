-- 소식(AI) 2단계: AI 는 '소재'까지만 만든다.
--
-- 배경
--  - AI 본문 품질이 기준에 못 미쳐 관리자가 매번 출처 URL 을 보고 기사를 처음부터 다시 썼다.
--    가장 비싼 산출물(1,500~2,500자 원고)이 곧 폐기물이었다.
--  - 이제 크롤러는 제목·요약·근거 URL 만 저장하고(lead_summary), 본문은 관리자가 쓴다.
--    그래서 본문 생성에 딸려 있던 장치가 전부 죽는다 — 의미 중복 지문, AI 재작성, AI 작성 요청 큐.
--  - 정보 주제는 AI 가 다음에 쓸 글을 고르던 큐였다. AI 가 팁 글을 쓰지 않으므로
--    관리자가 읽는 '쓸 거리' 메모로 줄인다.

-- 1) 재작성 대기 상태 정리.
--    AiNewsArticleStatus 에서 REWRITE_REQUESTED 가 사라지므로 컬럼을 지우기 전에 먼저 옮긴다.
--    남겨 두면 새 코드가 이 행을 읽는 순간 enum 역직렬화에서 터진다.
update ai_news_articles set status = 'PENDING_REVIEW' where status = 'REWRITE_REQUESTED';

-- 2) 소재 요약 추가, 본문 생성 잔재 제거.
--    image_url 은 남긴다 — 예전에 발행된 글의 대표 이미지 기록이고 본문에 심어 둔 <img> 와 짝이다.
alter table ai_news_articles
    add column lead_summary varchar(1000) null after content,
    drop column semantic_fingerprint,
    drop column rewrite_prompt,
    drop column rewrite_requested_at;

-- 3) 정보 주제 → '쓸 거리' 메모.
--    상태를 먼저 옮기고 컬럼을 지운다. normalized_key 를 지우면 uk_ai_news_topic_key 도 함께 사라진다.
update ai_news_topics set status = case when status = 'COMPLETED' then 'DONE' else 'PLANNED' end;
alter table ai_news_topics
    drop column normalized_key,
    drop column ai_suggested,
    drop column allow_republish,
    change column aliases memo text null;

-- 4) 팁 자동화 설정 제거. AI 가 팁 글을 쓰지 않으므로 발행 간격이 의미를 잃었다.
alter table ai_news_settings drop column tip_interval_hours;

-- 5) 관리자 AI 작성 요청 큐 제거.
--    이 테이블이 ai_news_articles·users 로 FK 를 가진 쪽이라 그냥 지우면 된다.
drop table if exists ai_news_draft_requests;
