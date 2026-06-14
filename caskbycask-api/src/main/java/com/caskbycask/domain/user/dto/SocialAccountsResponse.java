package com.caskbycask.domain.user.dto;

import java.util.List;

/**
 * 내 소셜 연동 현황.
 * hasPassword=false 이면서 연동이 1개뿐이면 그 연동은 마지막 로그인 수단이라 해제 불가.
 */
public record SocialAccountsResponse(
        List<SocialAccountResponse> accounts,
        boolean hasPassword
) {}
