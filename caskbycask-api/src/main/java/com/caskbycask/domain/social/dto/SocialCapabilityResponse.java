package com.caskbycask.domain.social.dto;

import java.util.List;

public record SocialCapabilityResponse(
        boolean enabled,
        boolean instagramAvailable,
        boolean threadsAvailable,
        boolean reviewImageAvailable,
        String consentVersion,
        List<SocialAdminDtos.TemplateResponse> templates
) {
}
