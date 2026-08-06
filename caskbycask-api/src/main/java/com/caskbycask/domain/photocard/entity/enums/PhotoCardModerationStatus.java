package com.caskbycask.domain.photocard.entity.enums;

/**
 * 관리자 모더레이션 상태.
 * <p>공개된 사용자 템플릿에 부적절한 문구가 들어간 경우 관리자가 HIDDEN 으로 내린다.
 * 소유자 본인에게는 계속 보인다(자기 템플릿을 잃지 않게).
 */
public enum PhotoCardModerationStatus {
    HIDDEN,
    VISIBLE
}
