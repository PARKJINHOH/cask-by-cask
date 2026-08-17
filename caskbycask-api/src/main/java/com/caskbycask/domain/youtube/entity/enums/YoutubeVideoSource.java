package com.caskbycask.domain.youtube.entity.enums;

/** 영상이 목록에 들어온 경로. 자동 수집분만 재동기화 대상이다. */
public enum YoutubeVideoSource {
    /** 채널 RSS 자동 수집 */
    CHANNEL_FEED,
    /** 관리자가 영상 URL 을 직접 붙여 넣어 등록 */
    MANUAL
}
