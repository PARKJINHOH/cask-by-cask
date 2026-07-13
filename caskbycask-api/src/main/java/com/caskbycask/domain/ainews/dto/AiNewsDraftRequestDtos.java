package com.caskbycask.domain.ainews.dto;

import com.caskbycask.domain.ainews.entity.AiNewsDraftRequest;
import com.caskbycask.domain.ainews.entity.enums.AiNewsDraftRequestStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public final class AiNewsDraftRequestDtos {

    private AiNewsDraftRequestDtos() {}

    public record CreateRequest(
            @NotBlank @Size(max = 4000) String prompt,
            @Size(max = 3) List<@NotBlank @Size(max = 1500) String> referenceUrls
    ) {}

    public record FailRequest(@NotBlank @Size(max = 1000) String reason) {}

    public record Response(
            Long id,
            String prompt,
            List<String> referenceUrls,
            AiNewsDraftRequestStatus status,
            String failureReason,
            Long articleId,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        public static Response from(AiNewsDraftRequest request) {
            return new Response(request.getId(), request.getPrompt(), request.referenceUrls(), request.getStatus(),
                    request.getFailureReason(), request.getArticle() != null ? request.getArticle().getId() : null,
                    request.getCreatedAt(), request.getUpdatedAt());
        }
    }
}
