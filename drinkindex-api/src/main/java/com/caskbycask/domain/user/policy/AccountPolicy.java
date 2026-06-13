package com.caskbycask.domain.user.policy;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 계정 운영 정책 상수 및 판정 로직 (단일 출처).
 * - 비밀번호 변경 권고 주기: 90일 (권고 배너, 강제 차단 아님)
 * - 휴면 전환 기준: 마지막 로그인 후 365일 미접속
 * - 로그인 실패 잠금: 5회 실패 시 10분 잠금
 * - 휴면 전환 D-7 사전 통지, 휴면 후 365일 경과 시 자동 탈퇴 처리
 * - 성인(연령) 인증: 만 19세 이상. 현재 정책상 재인증 없음(영구 유효).
 */
public final class AccountPolicy {

    /** 성인인증 최소 연령 (만 나이) */
    public static final int ADULT_MIN_AGE = 19;

    /** 비밀번호 변경 권고 주기 (일) */
    public static final long PASSWORD_EXPIRY_DAYS = 90;

    /** 휴면 전환 기준 미접속 기간 (일) */
    public static final long DORMANT_DAYS = 365;

    /** 로그인 연속 실패 허용 횟수 (초과 시 잠금) */
    public static final int LOGIN_MAX_FAILURES = 5;

    /** 로그인 잠금 시간 (분) */
    public static final long LOGIN_LOCK_MINUTES = 10;

    /** 휴면 전환 사전 통지 시점 (전환 N일 전) */
    public static final long DORMANT_NOTICE_LEAD_DAYS = 7;

    /** 휴면 전환 후 자동 탈퇴 처리까지의 추가 경과 기간 (일) */
    public static final long DORMANT_DELETE_DAYS = 365;

    /** 탈퇴 회원의 보존 콘텐츠가 재귀속되는 공용 센티넬 계정 이메일 (가입 예약어) */
    public static final String SENTINEL_EMAIL = "withdrawn@caskbycask.system";

    /** 센티넬 계정 닉네임 (가입 예약어) */
    public static final String SENTINEL_NICKNAME = "탈퇴한사용자";

    private AccountPolicy() {
    }

    /** 시스템 예약 이메일 여부 (가입 차단용) */
    public static boolean isReservedEmail(String email) {
        return SENTINEL_EMAIL.equalsIgnoreCase(email);
    }

    /** 시스템 예약 닉네임 여부 (가입 차단용) */
    public static boolean isReservedNickname(String nickname) {
        return SENTINEL_NICKNAME.equals(nickname);
    }

    /**
     * 비밀번호 변경 권고 대상 여부.
     * passwordChangedAt 이 없으면(레거시 계정) 가입일(createdAt) 기준으로 판정.
     */
    public static boolean isPasswordChangeRequired(LocalDateTime passwordChangedAt, LocalDateTime createdAt) {
        LocalDateTime baseline = passwordChangedAt != null ? passwordChangedAt : createdAt;
        if (baseline == null) {
            return false;
        }
        return baseline.plusDays(PASSWORD_EXPIRY_DAYS).isBefore(LocalDateTime.now());
    }

    /** 휴면 전환 기준 시각 (이 시각 이전에 마지막 로그인한 계정이 대상) */
    public static LocalDateTime dormantCutoff() {
        return LocalDateTime.now().minusDays(DORMANT_DAYS);
    }

    /**
     * 휴면 사전 통지 대상 기준 시각(시작). 마지막 활동(로그인/가입)이
     * [noticeWindowStart, noticeWindowEnd) 구간에 든 계정에게 1회 발송.
     */
    public static LocalDateTime dormantNoticeWindowStart() {
        return LocalDateTime.now().minusDays(DORMANT_DAYS - DORMANT_NOTICE_LEAD_DAYS + 1);
    }

    public static LocalDateTime dormantNoticeWindowEnd() {
        return LocalDateTime.now().minusDays(DORMANT_DAYS - DORMANT_NOTICE_LEAD_DAYS);
    }

    /** 휴면 후 자동 탈퇴 처리 기준 시각 (dormantAt 이 이 시각 이전이면 대상) */
    public static LocalDateTime dormantDeleteCutoff() {
        return LocalDateTime.now().minusDays(DORMANT_DELETE_DAYS);
    }

    /** 주어진 생년월일이 오늘 기준 만 {@value #ADULT_MIN_AGE}세 이상인지 판정 */
    public static boolean isAdult(LocalDate birthDate) {
        if (birthDate == null) {
            return false;
        }
        LocalDate today = LocalDate.now();
        if (birthDate.isAfter(today)) {
            return false;
        }
        return birthDate.plusYears(ADULT_MIN_AGE).isBefore(today.plusDays(1));
    }

    /**
     * 성인인증이 현재 유효한지 판정.
     * 현재 정책은 재인증 없음(만료 미사용)이라 플래그만 평가하지만,
     * expiresAt 이 설정된 경우(추후 재인증 정책 활성화) 만료 여부까지 반영한다.
     */
    public static boolean isAdultVerificationValid(Boolean adultVerified, LocalDateTime expiresAt) {
        if (!Boolean.TRUE.equals(adultVerified)) {
            return false;
        }
        return expiresAt == null || expiresAt.isAfter(LocalDateTime.now());
    }
}
