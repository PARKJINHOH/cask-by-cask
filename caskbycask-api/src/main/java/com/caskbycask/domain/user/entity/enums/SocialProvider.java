package com.caskbycask.domain.user.entity.enums;

/**
 * 지원하는 소셜 로그인 제공자.
 * 계정 매핑 기준은 항상 제공자 고유 식별자(NAVER=id, GOOGLE=sub)이며 이메일을 키로 쓰지 않는다.
 */
public enum SocialProvider {
    NAVER,
    GOOGLE
}
