package com.caskbycask.global.auth.oauth;

import com.caskbycask.domain.user.entity.enums.SocialProvider;

/**
 * 단계 간 전달되는 제공자 신원 (code 교환으로 서버가 확인한 값).
 * refreshTokenEnc 는 AES-GCM 암호화된 제공자 refresh token (없을 수 있음).
 */
public record OAuthTicket(
        SocialProvider provider,
        String providerUserId,
        String email,
        boolean emailVerified,
        String refreshTokenEnc,
        String suggestedNickname
) {}
