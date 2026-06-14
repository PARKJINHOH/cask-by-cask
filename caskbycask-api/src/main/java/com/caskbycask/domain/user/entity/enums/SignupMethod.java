package com.caskbycask.domain.user.entity.enums;

/**
 * 회원 가입 경로(출처). 가입 시점에 한 번 정해지며 이후 변경되지 않는다.
 * (연동 현황은 user_social_account 가 별도로 추적 — 가입 후 다른 소셜을 추가 연동할 수 있다.)
 */
public enum SignupMethod {
    /** 이메일 + 비밀번호 가입 */
    EMAIL,
    /** 네이버 소셜 가입 */
    NAVER,
    /** 구글 소셜 가입 */
    GOOGLE
}
