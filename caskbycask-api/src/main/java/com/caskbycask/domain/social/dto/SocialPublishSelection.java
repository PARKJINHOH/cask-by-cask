package com.caskbycask.domain.social.dto;

import com.caskbycask.domain.social.entity.enums.SocialMediaMode;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SocialPublishSelection(
        Boolean instagram,
        Boolean threads,
        Boolean consentAccepted,
        @Size(max = 30) String consentVersion,
        @Pattern(regexp = "ko|en") String locale,
        SocialMediaMode mediaMode,
        Long templateId,
        @Size(max = 200) String thumbnailText,
        @Size(max = 1000) String directImageUrl
) {
    public static final String CURRENT_CONSENT_VERSION = "2026-07-24";

    public boolean instagramRequested() {
        return Boolean.TRUE.equals(instagram);
    }

    public boolean threadsRequested() {
        return Boolean.TRUE.equals(threads);
    }

    public boolean anyRequested() {
        return instagramRequested() || threadsRequested();
    }

    @AssertTrue(message = "SNS 게시를 요청하려면 외부 게시 동의가 필요합니다.")
    public boolean isConsentValid() {
        return !anyRequested() || Boolean.TRUE.equals(consentAccepted);
    }

    public String normalizedLocale() {
        return "en".equalsIgnoreCase(locale) ? "en" : "ko";
    }

    public String normalizedConsentVersion() {
        return CURRENT_CONSENT_VERSION;
    }
}
