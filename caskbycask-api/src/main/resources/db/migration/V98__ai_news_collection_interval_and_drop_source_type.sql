-- 소식(AI) 3단계: 수집 주기를 관리자가 정하고, 출처 판단 스위치를 하나로 줄인다.
--
-- 배경
--  - 수집 주기가 서버 crontab(17 */2)에 박혀 있어 바꾸려면 매번 서버에 접속해야 했다.
--    이제 cron 은 매시간 돌고 "지금 돌 차례인가"는 API 가 마지막 실행 시각과 이 설정으로 판단한다.
--  - 출처 등급(source_type)은 공개 화면에 전혀 나오지 않고, 실제 역할은 수집 대상을 거르는 것뿐이었다.
--    그런데 그 일은 enabled 가 이미 하고 있어서 스위치가 둘이었다 — 등급이 커뮤니티면 '수집 활성'을 켜도
--    조용히 수집에서 빠졌고, 관리자는 그게 실패인지 설정 탓인지 구분할 수 없었다.

-- 1) 수집 주기. 기본 2시간 = 지금 crontab(17 */2) 과 같은 동작을 유지한다.
alter table ai_news_settings
    add column collection_interval_hours int not null default 2 after automation_enabled;

-- 2) 등급을 지우기 전에 현재 동작을 보존한다.
--    지금까지 수집에 쓰이던 등급은 OFFICIAL/TRUSTED_MEDIA 뿐이므로(news_official.ELIGIBLE_TYPES),
--    나머지 등급 행을 비활성으로 내려야 등급이 사라진 뒤에도 수집 대상이 늘지 않는다.
--    이 문장을 빠뜨리고 3번만 실행하면 그동안 수집되지 않던 커뮤니티·미승인 출처가 갑자기 수집되기 시작한다.
update ai_news_source_configs
   set enabled = 0
 where source_type not in ('OFFICIAL', 'TRUSTED_MEDIA');

-- 3) 등급 컬럼 제거. 근거 이력(ai_news_article_sources)의 등급도 읽는 곳이 없다 —
--    공개 글 하단 출처 표시와 JSON-LD citation 은 URL 만 쓴다.
alter table ai_news_source_configs drop column source_type;
alter table ai_news_article_sources drop column source_type;
