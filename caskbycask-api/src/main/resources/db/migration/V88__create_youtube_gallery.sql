-- 유튜브 갤러리 — 관리자가 승인한 채널의 최신 영상을 모아 보여 준다.
--
-- 영상 메타데이터는 유튜브 공개 RSS 피드(youtube.com/feeds/videos.xml)에서만 받는다.
-- Data API 키가 없으므로 조회수·재생시간은 저장하지 않는다. 재생은 전부 iframe 임베드다.

create table youtube_channels (
    id bigint not null auto_increment,
    channel_key varchar(64) not null comment '유튜브 채널 ID (UC...)',
    handle varchar(100) null comment '채널 핸들 (@ 제외)',
    title varchar(200) not null comment '채널명',
    description varchar(500) null comment '채널 소개 (한국어)',
    description_en varchar(500) null comment '채널 소개 (영어)',
    thumbnail_url varchar(1000) null comment '채널 프로필 이미지 URL',
    channel_url varchar(500) not null comment '채널 홈 URL',
    is_visible bit not null default 0 comment '갤러리 노출 여부',
    sync_enabled bit not null default 1 comment '최신 영상 자동 수집 여부',
    permission_confirmed bit not null default 0 comment '채널 운영자 게재 허락 확인 여부',
    permission_note varchar(500) null comment '허락 확인 근거 메모 (일자·경로)',
    sort_order integer not null default 0 comment '정렬 순서',
    last_synced_at datetime(6) null comment '마지막 수집 성공 일시',
    last_sync_error varchar(500) null comment '마지막 수집 실패 사유',
    created_by_id bigint null comment '등록 관리자(users.id)',
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint ux_youtube_channels_key unique (channel_key),
    constraint fk_youtube_channels_created_by
        foreign key (created_by_id) references users (id) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='유튜브 갤러리 채널';

create index idx_youtube_channels_visible_order
    on youtube_channels (is_visible, sort_order, id);

create table youtube_videos (
    id bigint not null auto_increment,
    channel_id bigint not null comment '채널(youtube_channels.id)',
    video_key varchar(32) not null comment '유튜브 영상 ID',
    title varchar(300) not null comment '영상 제목',
    description varchar(1000) null comment '영상 설명 발췌',
    thumbnail_url varchar(1000) null comment '영상 썸네일 URL',
    video_type varchar(20) not null comment '영상 유형 (VIDEO/SHORTS)',
    source varchar(20) not null comment '유입 경로 (CHANNEL_FEED/MANUAL)',
    published_at datetime(6) not null comment '유튜브 게시 일시',
    is_visible bit not null default 1 comment '갤러리 노출 여부',
    is_pinned bit not null default 0 comment '상단 고정 여부',
    hidden_reason varchar(200) null comment '숨김 사유(관리용)',
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint ux_youtube_videos_key unique (video_key),
    constraint fk_youtube_videos_channel
        foreign key (channel_id) references youtube_channels (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='유튜브 갤러리 영상';

-- 목록 기본 정렬(고정 먼저, 그다음 최신순)을 인덱스로 받는다.
create index idx_youtube_videos_visible_published
    on youtube_videos (is_visible, is_pinned, published_at, id);
create index idx_youtube_videos_channel_published
    on youtube_videos (channel_id, published_at);

create table youtube_video_spirit_tags (
    id bigint not null auto_increment,
    youtube_video_id bigint not null comment '영상(youtube_videos.id)',
    spirit_id bigint not null comment '주류(spirit.id)',
    sort_order integer not null default 0 comment '정렬 순서',
    created_at datetime(6) not null,
    updated_at datetime(6) not null,
    primary key (id),
    constraint ux_youtube_video_spirit_tags unique (youtube_video_id, spirit_id),
    constraint fk_youtube_video_spirit_tags_video
        foreign key (youtube_video_id) references youtube_videos (id) on delete cascade,
    constraint fk_youtube_video_spirit_tags_spirit
        foreign key (spirit_id) references spirit (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci comment='유튜브 영상 주류 태그';

-- 주류 상세의 '관련 영상' 역조회용.
create index idx_youtube_video_spirit_tags_by_spirit
    on youtube_video_spirit_tags (spirit_id, youtube_video_id);
