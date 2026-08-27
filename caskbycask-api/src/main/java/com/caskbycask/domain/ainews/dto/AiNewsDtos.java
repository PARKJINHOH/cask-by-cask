package com.caskbycask.domain.ainews.dto;

import com.caskbycask.domain.ainews.entity.*;
import com.caskbycask.domain.ainews.entity.enums.*;
import com.caskbycask.domain.social.dto.SocialPublishSelection;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class AiNewsDtos {

    public static final int ARTICLE_TITLE_MAX_LENGTH = 70;

    private AiNewsDtos() {}

    public record SourceEvidenceRequest(
            @NotBlank @Size(max = 1500) String sourceUrl,
            @NotBlank @Size(max = 1500) String canonicalUrl,
            @NotBlank @Size(max = 255) String domain,
            @Size(max = 500) String sourceTitle,
            @Size(max = 2000) String evidenceSummary,
            @Size(max = 64) String contentHash,
            LocalDateTime publishedAt,
            LocalDateTime retrievedAt
    ) {}

    /**
     * 크롤러가 물어온 소재. <b>본문이 없다</b> — 제목과 요약, 근거 URL 뿐이고 기사는 관리자가 쓴다.
     *
     * <p>관리자 수동 작성({@link ArticleUpsertRequest})과 DTO 를 나눈 이유는 본문 필수 여부가
     * 정반대라서다. 하나로 합치면 {@code @NotBlank} 를 풀어야 하고, 그러면 관리자가 실수로
     * 빈 원고를 저장해도 아무도 막지 못한다.
     */
    public record LeadIngestRequest(
            @NotNull AiNewsCategory category,
            @NotBlank @Size(max = ARTICLE_TITLE_MAX_LENGTH) String title,
            @Size(max = 1000) String leadSummary,
            @NotBlank @Size(max = 255) String dedupeKey,
            @Size(max = 64) String canonicalUrlHash,
            @DecimalMin("0.0") @DecimalMax("1.0") BigDecimal confidenceScore,
            @Size(max = 100) String modelName,
            @Valid List<SourceEvidenceRequest> sources
    ) {}

    /** 관리자 수동 작성. 본문이 반드시 있어야 한다. */
    public record ArticleUpsertRequest(
            @NotNull AiNewsArticleType articleType,
            @NotNull AiNewsCategory category,
            @NotBlank @Size(max = ARTICLE_TITLE_MAX_LENGTH) String title,
            @NotBlank String content,
            @Size(max = 255) String dedupeKey,
            Long topicId,
            Long prefixId,
            Boolean pinned,
            @Size(max = 10) List<@NotBlank @Size(max = 30) String> hashtags,
            @Valid List<SourceEvidenceRequest> sources
    ) {}

    public record ArticleAdminUpdateRequest(
            @NotNull AiNewsCategory category,
            @NotBlank @Size(max = ARTICLE_TITLE_MAX_LENGTH) String title,
            @NotBlank String content,
            Long prefixId,
            Boolean pinned,
            @Size(max = 10) List<@NotBlank @Size(max = 30) String> hashtags,
            List<@NotBlank @Size(max = 1500) String> sourceUrls
    ) {}

    public record ActionRequest(@Size(max = 1000) String reason) {}

    public record PublishRequest(
            LocalDateTime scheduledAt,
            @Valid SocialPublishSelection socialPublish
    ) {
        public PublishRequest(LocalDateTime scheduledAt) {
            this(scheduledAt, null);
        }
    }

    public record SourceResponse(
            Long id,
            String sourceUrl,
            String canonicalUrl,
            String domain,
            String sourceTitle,
            String evidenceSummary,
            String contentHash,
            LocalDateTime publishedAt,
            LocalDateTime retrievedAt
    ) {
        public static SourceResponse from(AiNewsArticleSource source) {
            return new SourceResponse(source.getId(), source.getSourceUrl(), source.getCanonicalUrl(),
                    source.getDomain(), source.getSourceTitle(),
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
            /** AI 가 물어온 소재의 요약. 목록에서 바로 읽고 쓸지 판단한다. */
            String leadSummary,
            /** 아직 본문이 없는 소재인지. 발행 버튼을 막는 근거다. */
            boolean contentEmpty,
            List<String> sourceDomains,
            BigDecimal confidenceScore,
            Long postId,
            boolean pinned,
            boolean updateAvailable,
            String failureReason,
            LocalDateTime scheduledAt,
            LocalDateTime publishedAt,
            LocalDateTime createdAt
    ) {
        public static ArticleSummaryResponse from(AiNewsArticle article, List<String> sourceDomains) {
            return new ArticleSummaryResponse(article.getId(), article.getArticleType(), article.getStatus(),
                    article.getCategory(), article.getTitle(), article.getLeadSummary(),
                    article.getContent() == null || article.getContent().isBlank(),
                    sourceDomains == null ? List.of() : sourceDomains,
                    article.getConfidenceScore(), article.getPostId(),
                    article.isPinned(), article.isUpdateAvailable(), article.getFailureReason(),
                    article.getScheduledAt(),
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
            /** AI 가 물어온 소재의 요약. 관리자가 본문을 쓰는 동안 참고한다. */
            String leadSummary,
            Long postId,
            Long deletedPostId,
            Long topicId,
            String topicTitle,
            Long prefixId,
            boolean pinned,
            boolean updateAvailable,
            String imageUrl,
            String modelName,
            List<String> hashtags,
            String duplicateReason,
            String failureReason,
            LocalDateTime scheduledAt,
            LocalDateTime publishedAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            List<SourceResponse> sources
    ) {
        public static ArticleDetailResponse from(AiNewsArticle article) {
            return new ArticleDetailResponse(article.getId(), article.getArticleType(), article.getStatus(),
                    article.getCategory(), article.getTitle(), article.getContent(), article.getConfidenceScore(),
                    article.getDedupeKey(), article.getLeadSummary(), article.getPostId(),
                    article.getDeletedPostId(), article.getTopic() != null ? article.getTopic().getId() : null,
                    article.getTopic() != null ? article.getTopic().getTitle() : null,
                    article.getPrefixId(), article.isPinned(), article.isUpdateAvailable(), article.getImageUrl(),
                    article.getModelName(),
                    List.copyOf(article.getHashtags()),
                    article.getDuplicateReason(), article.getFailureReason(),
                    article.getScheduledAt(), article.getPublishedAt(),
                    article.getCreatedAt(), article.getUpdatedAt(),
                    article.getSources().stream().map(SourceResponse::from).toList());
        }
    }

    /** 관리자가 직접 쓸 팁·정보 글의 '쓸 거리' 메모. AI 는 이 목록을 쓰지 않는다. */
    public record TopicUpsertRequest(
            @NotBlank @Size(max = 200) String title,
            @NotNull AiNewsCategory category,
            String memo,
            AiNewsTopicStatus status
    ) {}

    public record TopicResponse(
            Long id,
            String title,
            AiNewsCategory category,
            String memo,
            AiNewsTopicStatus status,
            LocalDateTime lastPublishedAt,
            LocalDateTime createdAt
    ) {
        public static TopicResponse from(AiNewsTopic topic) {
            return new TopicResponse(topic.getId(), topic.getTitle(), topic.getCategory(), topic.getMemo(),
                    topic.getStatus(), topic.getLastPublishedAt(), topic.getCreatedAt());
        }
    }

    public record SourceConfigUpsertRequest(
            @NotBlank @Size(max = 100) String sourceName,
            @NotBlank @Size(max = 1500) String sourceUrl,
            Boolean enabled
    ) {}

    /** 자동 등록 시절에 쌓인 출처를 한 번에 정리하기 위한 일괄 삭제 요청. */
    public record SourceConfigBulkDeleteRequest(
            @NotNull @Size(min = 1, max = 200) List<@NotNull Long> ids
    ) {}

    /** 예전 AI 자동 제안으로 쌓인 주제를 한 번에 정리하기 위한 일괄 삭제 요청. */
    public record TopicBulkDeleteRequest(
            @NotNull @Size(min = 1, max = 200) List<@NotNull Long> ids
    ) {}

    /** 일괄 삭제 결과. 원고가 붙어 지울 수 없던 건수를 함께 돌려준다. */
    public record BulkDeleteResponse(int deleted, int skipped) {}

    public record SourceConfigResponse(
            Long id,
            String sourceName,
            String sourceUrl,
            String domain,
            String pathPrefix,
            boolean enabled,
            boolean autoDiscovered,
            AiNewsSourceCrawlStatus crawlStatus,
            LocalDateTime lastCrawledAt,
            String lastCrawlError
    ) {
        public static SourceConfigResponse from(AiNewsSourceConfig source) {
            return new SourceConfigResponse(source.getId(), source.getSourceName(), source.getSourceUrl(),
                    source.getDomain(), source.getPathPrefix(), source.isEnabled(),
                    source.isAutoDiscovered(), source.getCrawlStatus(), source.getLastCrawledAt(),
                    source.getLastCrawlError());
        }
    }

    public record SourceCrawlResultRequest(
            @NotNull AiNewsSourceCrawlStatus status,
            @Size(max = 1000) String errorMessage,
            LocalDateTime checkedAt
    ) {}

    public record SettingsUpdateRequest(
            boolean automationEnabled,
            @Min(1) @Max(24) int collectionIntervalHours,
            @Min(0) @Max(20) int dailyReleaseLimit,
            @Min(0) @Max(1000) int tavilyMonthlyCreditLimit,
            @DecimalMin("0.0") BigDecimal openaiMonthlyBudgetUsd,
            @Min(0) Long openaiMonthlyTokenLimit,
            @Min(0) @Max(100) int whiskyRatio,
            @Min(0) @Max(100) int wineRatio,
            @Min(0) @Max(100) int cognacRatio
    ) {}

    public record SettingsResponse(
            boolean automationEnabled,
            int collectionIntervalHours,
            int dailyReleaseLimit,
            int tavilyMonthlyCreditLimit,
            BigDecimal openaiMonthlyBudgetUsd,
            Long openaiMonthlyTokenLimit,
            int whiskyRatio,
            int wineRatio,
            int cognacRatio
    ) {
        public static SettingsResponse from(AiNewsSettings settings) {
            return new SettingsResponse(settings.isAutomationEnabled(), settings.getCollectionIntervalHours(),
                    settings.getDailyReleaseLimit(),
                    settings.getTavilyMonthlyCreditLimit(),
                    settings.getOpenaiMonthlyBudgetUsd(), settings.getOpenaiMonthlyTokenLimit(),
                    settings.getWhiskyRatio(), settings.getWineRatio(), settings.getCognacRatio());
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
            BigDecimal estimatedCostUsd,
            int tavilyCreditLimit,
            BigDecimal openaiBudgetUsd,
            Long openaiTokenLimit
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

    /**
     * 크롤러가 실행 앞머리에서 읽는 설정 묶음.
     *
     * <p>{@code collectionDue} 는 <b>서버가 내리는 판단</b>이다 — cron 은 매시간 돌지만 실제 수집 주기는
     * 관리자 설정({@code collectionIntervalHours})이 정한다. 크롤러가 스스로 계산하지 않는 이유는
     * 마지막 실행 시각이 DB 에만 있어서다 — 두 쪽이 각자 계산하면 주기가 조용히 어긋난다.
     */
    public record InternalConfigResponse(
            SettingsResponse settings,
            UsageSummaryResponse usage,
            List<SourceConfigResponse> sources,
            long releaseCreatedToday,
            boolean collectionDue,
            LocalDateTime nextCollectionAt
    ) {}

    public record DedupeCheckResponse(
            boolean duplicate,
            Long articleId,
            AiNewsArticleStatus status,
            String dedupeKey
    ) {}
}
