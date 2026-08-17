-- 유튜브에서 삭제·비공개된 영상을 갤러리에서 자동으로 내리기 위한 상태.
--
-- 채널 RSS 는 최신 15편만 담아 옛 영상의 생사를 알려 주지 않는다. 그래서 별도 점검이 필요하고,
-- 점검이 내린 것과 관리자가 내린 것을 구분해야 한다 — 관리자가 의도적으로 숨긴 영상을
-- 점검이 되살리면 안 되기 때문이다.

alter table youtube_videos
    add column auto_hidden bit not null default 0
        comment '가용성 점검이 자동으로 숨겼는지 (관리자 숨김과 구분)',
    add column last_checked_at datetime(6) null
        comment '마지막 가용성 점검 일시';

-- 점검 대상 고르기 — 오래 확인 안 한 것부터 (NULL = 한 번도 확인 안 함이 가장 먼저).
create index idx_youtube_videos_last_checked
    on youtube_videos (last_checked_at, id);
