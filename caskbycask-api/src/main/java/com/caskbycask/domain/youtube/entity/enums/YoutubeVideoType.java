package com.caskbycask.domain.youtube.entity.enums;

/**
 * 영상 유형.
 * <p>
 * Data API 를 쓰지 않으므로 재생시간으로 판별할 수 없다. 대신 채널 업로드 플레이리스트의
 * 갈래(롱폼 {@code UULF…} / 숏츠 {@code UUSH…}) RSS 를 따로 받아 구분한다
 * ({@code YoutubeFeedClient} 참고). 구분이 실패한 경우는 {@link #VIDEO} 로 들어오며
 * 관리자가 목록에서 바로잡을 수 있다.
 */
public enum YoutubeVideoType {
    /** 가로형 일반 영상 (16:9) */
    VIDEO,
    /** 세로형 숏츠 (9:16) */
    SHORTS
}
