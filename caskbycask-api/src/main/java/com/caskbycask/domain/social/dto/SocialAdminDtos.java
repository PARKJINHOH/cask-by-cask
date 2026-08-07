package com.caskbycask.domain.social.dto;

import com.caskbycask.domain.social.entity.SocialAccountConnection;
import com.caskbycask.domain.social.entity.SocialThumbnailTemplate;
import com.caskbycask.domain.social.entity.enums.SocialConnectionStatus;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public final class SocialAdminDtos {
    private SocialAdminDtos() {}

    public record OAuthUrlResponse(String authorizationUrl) {}

    public record AccountResponse(
            SocialPlatform platform,
            String externalUserId,
            String username,
            LocalDateTime tokenExpiresAt,
            String grantedScopes,
            SocialConnectionStatus status,
            LocalDateTime lastVerifiedAt,
            LocalDateTime lastRefreshedAt,
            String lastError
    ) {
        public static AccountResponse from(SocialAccountConnection connection) {
            return new AccountResponse(
                    connection.getPlatform(),
                    connection.getExternalUserId(),
                    connection.getUsername(),
                    connection.getTokenExpiresAt(),
                    connection.getGrantedScopes(),
                    connection.getStatus(),
                    connection.getLastVerifiedAt(),
                    connection.getLastRefreshedAt(),
                    connection.getLastError()
            );
        }
    }

    /** 순서 필드는 없다 — 신규는 맨 아래, 변경은 목록의 드래그 정렬(reorder)로만. */
    public record TemplateRequest(
            @NotBlank @Size(max = 100) String name,
            @NotBlank @Size(max = 1000) String backgroundImageUrl,
            Boolean active
    ) {}

    public record TemplateReorderRequest(@NotNull List<Long> ids) {}

    public record TemplateResponse(
            Long id,
            String name,
            String backgroundImageUrl,
            boolean active,
            int displayOrder
    ) {
        public static TemplateResponse from(SocialThumbnailTemplate template) {
            return new TemplateResponse(template.getId(), template.getName(),
                    template.getBackgroundImageUrl(), template.isActive(), template.getDisplayOrder());
        }
    }

    public record ImageUploadResponse(String imageUrl, int width, int height) {}
}
