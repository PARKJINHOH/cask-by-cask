package com.caskbycask.domain.ainews.dto;

import com.caskbycask.domain.ainews.entity.*;
import com.caskbycask.domain.ainews.entity.enums.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class AiNewsDtos {

    private AiNewsDtos() {}

    public record SourceEvidenceRequest(
            @NotBlank @Size(max = 1500) String sourceUrl,
            @NotBlank @Size(max = 1500) String canonicalUrl,
            @NotBlank @Size(max = 255) String domain,
            @Size(max = 500) String sourceTitle,
            @NotNull AiNewsSourceType sourceType,
            @Size(max = 2000) String evidenceSummary,
            @Size(max = 64) String contentHash,
            LocalDateTime publishedAt,
            LocalDateTime retrievedAt
    ) {}

    public record ArticleUpsertRequest(
            @NotNull AiNewsArticleType articleType,
            @NotNull AiNewsCategory category,
            @NotBlank @Size(max = 50) String title,
            @NotBlank String content,
            @NotBlank @Size(max = 255) String dedupeKey,
            @DecimalMin("0.0") @DecimalMax("1.0") BigDecimal confidenceScore,
            @Size(max = 64) String canonicalUrlHash,
            @Size(max = 1000) String semanticFingerprint,
            Long topicId,
            Long prefixId,
            Boolean pinned,
            Boolean autoPublishRequested,
            @Size(max = 1000) String imageUrl,
            @Size(max = 30) String imageKind,
            @Size(max = 1000) String imageRightsEvidence,
            @Size(max = 100) String modelName,
            @Valid List<SourceEvidenceRequest> sources
    ) {}

    public record ArticleAdminUpdateRequest(
            @NotNull AiNewsCategory category,
            @NotBlank @Size(max = 50) String title,
            @NotBlank String content,
            Long prefixId,
            Boolean pinned,
            @DecimalMin("0.0") @DecimalMax("1.0") BigDecimal confidenceScore,
            @Size(max = 1000) String semanticFingerprint
    ) {}

    public record ActionRequest(@Size(max = 1000) String reason) {}

    public record RewriteRequest(@NotBlank @Size(max = 4000) String prompt) {}

    public record RewriteResultRequest(
            @NotBlank @Size(max = 50) String title,
            @NotBlank String content,
            @DecimalMin("0.0") @DecimalMax("1.0") BigDecimal confidenceScore,
            @Size(max = 1000) String semanticFingerprint,
            @Size(max = 100) String modelName
    ) {}

    public record DuplicateSkipRequest(
            @NotNull AiNewsCategory category,
            @NotBlank @Size(max = 50) String title,
            @NotBlank @Size(max = 255) String dedupeKey,
            @Size(max = 1000) String semanticFingerprint,
            @NotNull Long topicId,
            @NotBlank @Size(max = 1000) String duplicateReason,
            @Size(max = 100) String modelName
    ) {}

    public record SourceResponse(
            Long id,
            String sourceUrl,
            String canonicalUrl,
            String domain,
            String sourceTitle,
            AiNewsSourceType sourceType,
            String evidenceSummary,
            String contentHash,
            LocalDateTime publishedAt,
            LocalDateTime retrievedAt
    ) {
        public static SourceResponse from(AiNewsArticleSource source) {
            return new SourceResponse(source.getId(), source.getSourceUrl(), source.getCanonicalUrl(),
                    source.getDomain(), source.getSourceTitle(), source.getSourceType(),
                    source.getEvidenceSummary(), source.getContentHash(), source.getPublishedAt(),
                    source.getRetrievedAt());
        }
    }

    public record ArticleSummaryResponse(
            Long id,
            AiNewsArticleType articleType,
            AiNewsArticleStatus status,
            AiNewsCategory category,
            String title,
            BigDecimal confidenceScore,
            Long postId,
            boolean pinned,
            boolean updateAvailable,
            String failureReason,
            LocalDateTime publishedAt,
            LocalDateTime createdAt
    ) {
        public static ArticleSummaryResponse from(AiNewsArticle article) {
            return new ArticleSummaryResponse(article.getId(), article.getArticleType(), article.getStatus(),
                    article.getCategory(), article.getTitle(), article.getConfidenceScore(), article.getPostId(),
                    article.isPinned(), article.isUpdateAvailable(), article.getFailureReason(),
                    article.getPublishedAt(), article.getCreatedAt());
        }
    }

    public record ArticleDetailResponse(
            Long id,
            AiNewsArticleType articleType,
            AiNewsArticleStatus status,
            AiNewsCategory category,
            String title,
            String content,
            BigDecimal confidenceScore,
            String dedupeKey,
            String semanticFingerprint,
            Long postId,
            Long deletedPostId,
            Long topicId,
            String topicTitle,
            Long prefixId,
            boolean pinned,
            boolean updateAvailable,
            String imageUrl,
            String imageKind,
            String imageRightsEvidence,
            String modelName,
            String duplicateReason,
            String failureReason,
            String rewritePrompt,
            LocalDateTime rewriteRequestedAt,
            LocalDateTime publishedAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            List<SourceResponse> sources
    ) {
        public static ArticleDetailResponse from(AiNewsArticle article) {
            return new ArticleDetailResponse(article.getId(), article.getArticleType(), article.getStatus(),
                    article.getCategory(), article.getTitle(), article.getContent(), article.getConfidenceScore(),
                    article.getDedupeKey(), article.getSemanticFingerprint(), article.getPostId(),
                    article.getDeletedPostId(), article.getTopic() != null ? article.getTopic().getId() : null,
                    article.getTopic() != null ? article.getTopic().getTitle() : null,
                    article.getPrefixId(), article.isPinned(), article.isUpdateAvailable(), article.getImageUrl(),
                    article.getImageKind(), article.getImageRightsEvidence(), article.getModelName(),
                    article.getDuplicateReason(), article.getFailureReason(), article.getRewritePrompt(),
                    article.getRewriteRequestedAt(), article.getPublishedAt(),
                    article.getCreatedAt(), article.getUpdatedAt(),
                    article.getSources().stream().map(SourceResponse::from).toList());
        }
    }

    public record RewriteQueueResponse(
            Long articleId,
            AiNewsArticleType articleType,
            AiNewsCategory category,
            String title,
            String content,
            String additionalPrompt,
            String semanticFingerprint,
            LocalDateTime requestedAt
    ) {
        public static RewriteQueueResponse from(AiNewsArticle article) {
            return new RewriteQueueResponse(article.getId(), article.getArticleType(), article.getCategory(),
                    article.getTitle(), article.getContent(), article.getRewritePrompt(),
                    article.getSemanticFingerprint(), article.getRewriteRequestedAt());
        }
    }

    public record TopicUpsertRequest(
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Size(max = 255) String normalizedKey,
            String aliases,
            @NotNull AiNewsCategory category,
            AiNewsTopicStatus status,
            Boolean allowRepublish,
            Boolean aiSuggested
    ) {}

    public record TopicResponse(
            Long id,
            String title,
            String normalizedKey,
            String aliases,
            AiNewsCategory category,
            AiNewsTopicStatus status,
            boolean aiSuggested,
            boolean allowRepublish,
            LocalDateTime lastPublishedAt,
            LocalDateTime createdAt
    ) {
        public static TopicResponse from(AiNewsTopic topic) {
            return new TopicResponse(topic.getId(), topic.getTitle(), topic.getNormalizedKey(), topic.getAliases(),
                    topic.getCategory(), topic.getStatus(), topic.isAiSuggested(), topic.isAllowRepublish(),
                    topic.getLastPublishedAt(), topic.getCreatedAt());
        }
    }

    public record SourceConfigUpsertRequest(
            @NotBlank @Size(max = 100) String sourceName,
            @NotBlank @Size(max = 255) String domain,
            @NotNull AiNewsSourceType sourceType,
            Boolean enabled,
            Boolean autoPublishAllowed,
            Boolean imageUseAllowed,
            @Size(max = 30) String crawlerType,
            @Size(max = 255) String crawlerTargetKey,
            @Size(max = 500) String crawlerTargetValue
    ) {}

    public record SourceConfigResponse(
            Long id,
            String sourceName,
            String domain,
            AiNewsSourceType sourceType,
            boolean enabled,
            boolean autoPublishAllowed,
            boolean imageUseAllowed,
            String crawlerType,
            String crawlerTargetKey,
            String crawlerTargetValue
    ) {
        public static SourceConfigResponse from(AiNewsSourceConfig source) {
            return new SourceConfigResponse(source.getId(), source.getSourceName(), source.getDomain(),
                    source.getSourceType(), source.isEnabled(), source.isAutoPublishAllowed(),
                    source.isImageUseAllowed(), source.getCrawlerType(), source.getCrawlerTargetKey(),
                    source.getCrawlerTargetValue());
        }
    }

    public record SettingsUpdateRequest(
            boolean automationEnabled,
            boolean autoPublishEnabled,
            boolean dryRun,
            @Min(0) @Max(20) int dailyReleaseLimit,
            @Min(24) @Max(720) int tipIntervalHours,
            @NotNull @DecimalMin("0.5") @DecimalMax("1.0") BigDecimal confidenceThreshold,
            @Min(0) @Max(1000) int tavilyMonthlyCreditLimit,
            @DecimalMin("0.0") BigDecimal openaiMonthlyBudgetUsd,
            @Min(0) Long openaiMonthlyTokenLimit,
            @Min(0) Integer openaiMonthlyImageLimit,
            @Min(0) @Max(100) int whiskyRatio,
            @Min(0) @Max(100) int wineRatio,
            @Min(0) @Max(100) int cognacRatio
    ) {}

    public record SettingsResponse(
            boolean automationEnabled,
            boolean autoPublishEnabled,
            boolean dryRun,
            int dailyReleaseLimit,
            int tipIntervalHours,
            BigDecimal confidenceThreshold,
            int tavilyMonthlyCreditLimit,
            BigDecimal openaiMonthlyBudgetUsd,
            Long openaiMonthlyTokenLimit,
            Integer openaiMonthlyImageLimit,
            int whiskyRatio,
            int wineRatio,
            int cognacRatio
    ) {
        public static SettingsResponse from(AiNewsSettings settings) {
            return new SettingsResponse(settings.isAutomationEnabled(), settings.isAutoPublishEnabled(),
                    settings.isDryRun(), settings.getDailyReleaseLimit(), settings.getTipIntervalHours(),
                    settings.getConfidenceThreshold(), settings.getTavilyMonthlyCreditLimit(),
                    settings.getOpenaiMonthlyBudgetUsd(), settings.getOpenaiMonthlyTokenLimit(),
                    settings.getOpenaiMonthlyImageLimit(), settings.getWhiskyRatio(), settings.getWineRatio(),
                    settings.getCognacRatio());
        }
    }

    public record UsageRequest(
            Long runId,
            @NotBlank @Size(max = 30) String provider,
            @Size(max = 100) String modelName,
            @Min(0) long inputTokens,
            @Min(0) long outputTokens,
            @Min(0) int imageCount,
            @Min(0) int tavilyCredits,
            @DecimalMin("0.0") BigDecimal estimatedCostUsd,
            LocalDateTime usageAt
    ) {}

    public record UsageSummaryResponse(
            long tavilyCredits,
            long inputTokens,
            long outputTokens,
            long imageCount,
            BigDecimal estimatedCostUsd,
            int tavilyCreditLimit,
            BigDecimal openaiBudgetUsd,
            Long openaiTokenLimit,
            Integer openaiImageLimit
    ) {}

    public record RunStartRequest(
            @NotBlank @Size(max = 100) String runKey,
            @NotNull AiNewsRunType runType
    ) {}

    public record RunFinishRequest(
            @NotNull AiNewsRunStatus status,
            @Min(0) int candidateCount,
            @Min(0) int publishedCount,
            @Min(0) int reviewCount,
            @Min(0) int duplicateCount,
            @Min(0) int errorCount,
            @Size(max = 2000) String errorMessage
    ) {}

    public record RunResponse(
            Long id,
            String runKey,
            AiNewsRunType runType,
            AiNewsRunStatus status,
            int candidateCount,
            int publishedCount,
            int reviewCount,
            int duplicateCount,
            int errorCount,
            String errorMessage,
            LocalDateTime startedAt,
            LocalDateTime finishedAt
    ) {
        public static RunResponse from(AiNewsRun run) {
            return new RunResponse(run.getId(), run.getRunKey(), run.getRunType(), run.getStatus(),
                    run.getCandidateCount(), run.getPublishedCount(), run.getReviewCount(),
                    run.getDuplicateCount(), run.getErrorCount(), run.getErrorMessage(),
                    run.getStartedAt(), run.getFinishedAt());
        }
    }

    public record InternalConfigResponse(
            SettingsResponse settings,
            UsageSummaryResponse usage,
            List<SourceConfigResponse> sources,
            List<TopicResponse> readyTopics,
            List<String> allTopicKeys,
            List<TipDuplicateCorpusResponse> tipDuplicateCorpus,
            List<RewriteQueueResponse> rewriteRequests,
            LocalDateTime lastTipPublishedAt,
            boolean tipDue,
            long releasePublishedToday
    ) {}

    public record TipDuplicateCorpusResponse(
            Long articleId,
            String title,
            String semanticFingerprint,
            String topicKey,
            String topicTitle,
            String topicAliases,
            String contentOutline
    ) {}

    public record DedupeCheckResponse(
            boolean duplicate,
            Long articleId,
            AiNewsArticleStatus status,
            String dedupeKey,
            boolean imageMissing
    ) {}
}
