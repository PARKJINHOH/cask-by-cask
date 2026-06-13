package com.caskbycask.domain.user.entity.enums;

/**
 * 성인(연령) 인증 방식.
 * <p>
 * 현재는 {@link #SELF}(자가 선언형)만 사용. 사업자등록 취득 후 외부 본인확인기관 연동 시
 * {@link #MOBILE}(PASS·휴대폰 본인확인), {@link #SOCIAL}(소셜 로그인 프로필의 생년월일) 분기를 추가한다.
 * 인증 처리 로직은 방식에 무관하게 {@code User.verifyAdult(...)} 한 곳으로 수렴한다.
 */
public enum AdultVerifyMethod {
    /** 자가 선언형 — 사용자가 직접 생년월일을 입력하고 만 19세 이상임을 확인 */
    SELF,
    /** 휴대폰 본인확인(PASS 등) — 본인확인기관 연동 (추후) */
    MOBILE,
    /** 소셜 로그인 프로필 제공 생년월일 기반 (추후) */
    SOCIAL
}
