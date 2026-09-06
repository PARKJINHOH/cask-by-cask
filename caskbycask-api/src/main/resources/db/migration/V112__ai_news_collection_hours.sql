-- 소식(AI): 수집을 '간격'이 아니라 '시각'으로 정하고, 최신 기사 기간을 관리자가 정하게 한다.
--
-- 배경
--  - collection_interval_hours 는 고정 간격이라 "하루 두 번, 09시와 18시"를 표현할 수 없다.
--    09→18 은 9시간이고 18→09 는 15시간이다. 어떤 값을 넣어도 이 스케줄은 나오지 않는다.
--  - 크롤러가 기사 단위로 내려가면서 '최근 며칠까지 볼 것인가'가 실제 수집량을 정하는 값이 됐다.
--    배포 없이 3일에서 5일로 넓힐 수 있어야 하므로 환경변수가 아니라 관리자 설정에 둔다.
--
-- cron 은 그대로 매시간(17분) 확인한다. 서버가 "지금이 그 시각을 지났는가"를 판단하므로
-- 09:17 실행이 실패해도 10:17 이 대신 수집한다 — 정각 cron 으로 바꾸면 이 재시도가 사라진다.

-- 1) 수집 시각. 0~23 을 콤마로 나열한다. 기본값 '9,18' 이 지금 원하는 스케줄이다.
alter table ai_news_settings
    add column collection_hours varchar(50) not null default '9,18' after automation_enabled;

-- 2) 최신 기사 기간(일). 이 기간 밖의 기사는 Gemini 에 넘기지 않는다.
alter table ai_news_settings
    add column recent_window_days int not null default 3 after collection_hours;

-- 3) 간격 설정 제거. 두 스위치가 같은 일을 하면 어느 쪽이 이겼는지 아무도 모른다.
alter table ai_news_settings drop column collection_interval_hours;
