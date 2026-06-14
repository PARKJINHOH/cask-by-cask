package com.caskbycask.domain.user.dto;

import com.caskbycask.domain.user.entity.UserSocialAccount;
import com.caskbycask.domain.user.entity.enums.SocialProvider;

import java.time.LocalDateTime;

public record SocialAccountResponse(
        SocialProvider provider,
        String email,
        LocalDateTime linkedAt
) {
    public static SocialAccountResponse from(UserSocialAccount account) {
        return new SocialAccountResponse(account.getProvider(), account.getEmail(), account.getLinkedAt());
    }
}
