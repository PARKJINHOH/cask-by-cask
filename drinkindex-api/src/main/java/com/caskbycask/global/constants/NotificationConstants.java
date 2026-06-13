package com.caskbycask.global.constants;

public final class NotificationConstants {

    private NotificationConstants() {}

    // 추천 알림 임계치: 이 숫자의 배수마다 알림 발송. 변경 시 이 상수값만 수정.
    public static final int LIKE_NOTIFY_THRESHOLD = 10;

    // 현재: 30초 폴링. 추후 롱폴링 전환 시 이 주석 갱신.
    public static final int NOTIFICATION_POLL_INTERVAL_SECONDS = 30;
}
