package com.drinkindex.domain.community.entity.enums;

public enum PostStatus {
    ACTIVE,
    LOCKED,   // 신고 5회 누적 자동 잠금
    DELETED   // deleted_posts로 이동 전 상태 표시용
}
