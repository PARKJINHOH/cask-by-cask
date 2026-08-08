package com.caskbycask.domain.ainews.service;

import com.caskbycask.admin.service.AdminLogService;
import com.caskbycask.domain.admin.entity.enums.AdminLogTargetType;
import com.caskbycask.domain.admin.entity.enums.AdminLogType;
import com.caskbycask.domain.ainews.dto.AiNewsDtos;
import com.caskbycask.domain.ainews.entity.*;
import com.caskbycask.domain.ainews.entity.enums.*;
import com.caskbycask.domain.ainews.repository.*;
import com.caskbycask.domain.community.dto.CreatePostRequest;
import com.caskbycask.domain.community.dto.PostDetailResponse;
import com.caskbycask.domain.community.dto.PostImageUploadResponse;
import com.caskbycask.domain.community.dto.UpdatePostRequest;
import com.caskbycask.domain.community.entity.DeletedPost;
import com.caskbycask.domain.community.entity.PostPrefix;
import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.repository.PostPrefixRepository;
import com.caskbycask.domain.community.service.PostService;
import com.caskbycask.domain.community.service.PostImageService;
import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.social.dto.SocialPublishSelection;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.social.service.SocialPublishRequestService;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.HashtagNormalizer;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URISyntaxException;
import java.text.Normalizer;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AiNewsService {

    private static final String SYSTEM_AUTHOR_EMAIL = "ai-news@system.caskbycask.local";
    private static final String DEFAULT_PREFIX_NAME = "일반";
    private static final ZoneId SERVICE_ZONE = ZoneId.of("Asia/Seoul");

    private final AiNewsSettingsRepository settingsRepository;
    private final AiNewsArticleRepository articleRepository;
    private final AiNewsTopicRepository topicRepository;
    private final AiNewsSourceConfigRepository sourceConfigRepository;
    private final AiNewsRunRepository runRepository;
    private final AiNewsUsageRepository usageRepository;
    private final UserRepository userRepository;
    private final ProducerRepository producerRepository;
    private final PostService postService;
    private final PostImageService postImageService;
    private final PostPrefixRepository postPrefixRepository;
    private final AdminLogService adminLogService;
    private final SocialPublishRequestService socialPublishRequestService;

    @Transactional(readOnly = true)
    public Page<AiNewsDtos.ArticleSummaryResponse> listArticles(AiNewsArticleStatus status,
                                                                 AiNewsArticleType type,
                                                                 AiNewsCategory category,
                                                                 LocalDate fromDate,
                                                                 LocalDate toDate,
                                                                 int page, int size) {
        // 상태 필터가 없으면 삭제된 원고는 감춘다. 삭제됨을 직접 선택하면 그대로 조회·복원할 수 있다.
        AiNewsArticleStatus excludedStatus = status == null ? AiNewsArticleStatus.DELETED : null;
        return articleRepository.search(status, excludedStatus, type, category,
                        fromDate != null ? fromDate.atStartOfDay() : null,
                        toDate != null ? toDate.plusDays(1).atStartOfDay() : null,
                        PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size))))
                .map(AiNewsDtos.ArticleSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public AiNewsDtos.ArticleDetailResponse detail(Long id) {
        return AiNewsDtos.ArticleDetailResponse.from(findArticleDetail(id));
    }

    @Transactional(readOnly = true)
    public long pendingCount() {
        return articleRepository.countByStatus(AiNewsArticleStatus.PENDING_REVIEW);
    }

    /** 크롤러 제출. 자동발행 판단은 요청 값이 아니라 서버의 출처/예산/일일한도 정책으로 다시 계산한다. */
    @Transactional
    public AiNewsDtos.ArticleDetailResponse ingest(AiNewsDtos.ArticleUpsertRequest request) {
        Optional<AiNewsArticle> duplicate = findDuplicate(request);
        if (duplicate.isPresent()) {
            AiNewsArticle existing = duplicate.get();
            mergeNewSources(existing, request.sources());
            if (canRetryMissingTipImage(existing, request)) {
                BigDecimal confidence = request.confidenceScore() != null
                        ? request.confidenceScore() : existing.getConfidenceScore();
                List<String> hashtags = request.hashtags() != null
                        ? HashtagNormalizer.normalize(request.hashtags())
                        : List.copyOf(existing.getHashtags());
                clearArticleHashtagsBeforeReplacement(existing, hashtags);
                existing.applyImageRetry(request.title().trim(), withLeadImage(request.content(), request.imageUrl()),
                        request.category(), confidence, trimToNull(request.semanticFingerprint()),
                        request.imageUrl().trim(), request.imageKind().trim(),
                        trimToNull(request.imageRightsEvidence()), trimToNull(request.modelName()),
                        hashtags);
                String holdReason = autoPublishHoldReason(existing, resolveStoredSources(existing), getSettingsEntity(),
                        Boolean.TRUE.equals(request.autoPublishRequested()));
                if (holdReason == null) publishWithSystemAuthor(existing);
                else {
                    existing.markPending(holdReason);
                    if (existing.getTopic() != null) existing.getTopic().markHold();
                }
            } else if (existing.getStatus() == AiNewsArticleStatus.PUBLISHED
                    && existing.getArticleType() == AiNewsArticleType.RELEASE_NEWS) {
                existing.markUpdateAvailable();
            }
            return AiNewsDtos.ArticleDetailResponse.from(findArticleDetail(existing.getId()));
        }

        AiNewsTopic topic = resolveTopic(request);
        if (request.articleType() == AiNewsArticleType.TIP_INFO && topic != null
                && topic.getStatus() == AiNewsTopicStatus.COMPLETED && !topic.isAllowRepublish()) {
            throw new CustomException(ErrorCode.AI_NEWS_DUPLICATE);
        }

        AiNewsSettings settings = getSettingsEntity();
        BigDecimal confidence = request.confidenceScore() != null ? request.confidenceScore() : BigDecimal.ZERO;
        AiNewsArticle article = AiNewsArticle.builder()
                .articleType(request.articleType())
                .status(AiNewsArticleStatus.PENDING_REVIEW)
                .category(request.category())
                .title(request.title().trim())
                .content(withLeadImage(request.content(), request.imageUrl()))
                .confidenceScore(confidence)
                .canonicalUrlHash(request.articleType() == AiNewsArticleType.RELEASE_NEWS
                        && hasText(request.canonicalUrlHash())
                        ? request.canonicalUrlHash().trim().toLowerCase(Locale.ROOT) : null)
                .dedupeKey(request.dedupeKey().trim())
                .semanticFingerprint(trimToNull(request.semanticFingerprint()))
                .topic(topic)
                .prefixId(resolveDefaultPrefixId(request.prefixId()))
                .pinned(Boolean.TRUE.equals(request.pinned()))
                .imageUrl(trimToNull(request.imageUrl()))
                .imageKind(trimToNull(request.imageKind()))
                .imageRightsEvidence(trimToNull(request.imageRightsEvidence()))
                .modelName(trimToNull(request.modelName()))
                .hashtags(new ArrayList<>(HashtagNormalizer.normalize(request.hashtags())))
                .build();

        List<ResolvedSource> resolvedSources = addResolvedSources(article, request.sources());
        String holdReason = autoPublishHoldReason(article, resolvedSources, settings,
                Boolean.TRUE.equals(request.autoPublishRequested()));
        if (holdReason != null) {
            article.markPending(holdReason);
            if (topic != null) topic.markHold();
        }

        try {
            articleRepository.saveAndFlush(article);
        } catch (DataIntegrityViolationException e) {
            throw new CustomException(ErrorCode.AI_NEWS_DUPLICATE);
        }

        if (holdReason == null) publishWithSystemAuthor(article);
        return AiNewsDtos.ArticleDetailResponse.from(findArticleDetail(article.getId()));
    }

    @Transactional
    public AiNewsDtos.ArticleDetailResponse createDraft(AiNewsDtos.ArticleUpsertRequest request, Long actorId) {
        AiNewsTopic topic = resolveTopic(request);
        String dedupeKey = hasText(request.dedupeKey())
                ? request.dedupeKey().trim()
                : "manual:" + UUID.randomUUID();
        if (articleRepository.findByDedupeKey(dedupeKey).isPresent()) {
            throw new CustomException(ErrorCode.AI_NEWS_DUPLICATE);
        }
        AiNewsArticle article = AiNewsArticle.builder()
                .articleType(request.articleType())
                .status(AiNewsArticleStatus.DRAFT)
                .category(request.category())
                .title(request.title().trim())
                .content(withLeadImage(request.content(), request.imageUrl()))
                .confidenceScore(request.confidenceScore() != null ? request.confidenceScore() : BigDecimal.ONE)
                .dedupeKey(dedupeKey)
                .semanticFingerprint(trimToNull(request.semanticFingerprint()))
                .topic(topic)
                .prefixId(resolveDefaultPrefixId(request.prefixId()))
                .pinned(Boolean.TRUE.equals(request.pinned()))
                .imageUrl(trimToNull(request.imageUrl()))
                .imageKind(trimToNull(request.imageKind()))
                .imageRightsEvidence(trimToNull(request.imageRightsEvidence()))
                .modelName(trimToNull(request.modelName()))
                .hashtags(new ArrayList<>(HashtagNormalizer.normalize(request.hashtags())))
                .build();
        addResolvedSources(article, request.sources());
        articleRepository.save(article);
        log(actorId, article.getId(), "AI 소식 원고 수동 작성", request.title());
        return AiNewsDtos.ArticleDetailResponse.from(findArticleDetail(article.getId()));
    }

    @Transactional
    public AiNewsDtos.ArticleDetailResponse recordSkippedDuplicate(AiNewsDtos.DuplicateSkipRequest request) {
        Optional<AiNewsArticle> existing = articleRepository.findByDedupeKey(request.dedupeKey().trim());
        if (existing.isPresent()) return AiNewsDtos.ArticleDetailResponse.from(findArticleDetail(existing.get().getId()));

        AiNewsTopic topic = topicRepository.findById(request.topicId())
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_TOPIC_NOT_FOUND));
        AiNewsArticle article = AiNewsArticle.builder()
                .articleType(AiNewsArticleType.TIP_INFO)
                .status(AiNewsArticleStatus.SKIPPED_DUPLICATE)
                .category(request.category())
                .title(request.title().trim())
                .content("<p>중복 판정으로 자동 생성을 건너뛴 주제입니다.</p>")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey(request.dedupeKey().trim())
                .semanticFingerprint(trimToNull(request.semanticFingerprint()))
                .topic(topic)
                .modelName(trimToNull(request.modelName()))
                .build();
        article.markSkippedDuplicate(request.duplicateReason().trim());
        topic.markDuplicateBlocked();
        try {
            articleRepository.saveAndFlush(article);
        } catch (DataIntegrityViolationException e) {
            throw new CustomException(ErrorCode.AI_NEWS_DUPLICATE);
        }
        return AiNewsDtos.ArticleDetailResponse.from(findArticleDetail(article.getId()));
    }

    @Transactional
    public AiNewsDtos.ArticleDetailResponse updateArticle(Long id,
                                                            AiNewsDtos.ArticleAdminUpdateRequest request,
                                                            Long actorId) {
        AiNewsArticle article = findArticleDetail(id);
        List<String> hashtags = request.hashtags() != null
                ? HashtagNormalizer.normalize(request.hashtags())
                : List.copyOf(article.getHashtags());
        clearArticleHashtagsBeforeReplacement(article, hashtags);
        article.updateDraft(request.title().trim(), request.content(), request.category(), request.prefixId(),
                Boolean.TRUE.equals(request.pinned()),
                request.confidenceScore() != null ? request.confidenceScore() : article.getConfidenceScore(),
                trimToNull(request.semanticFingerprint()), hashtags);
        replaceAdminSourceUrls(article, request.sourceUrls());

        if (article.getStatus() == AiNewsArticleStatus.PUBLISHED && article.getPostId() != null) {
            postService.adminUpdatePost(article.getPostId(),
                    UpdatePostRequest.aiNews(request.prefixId(), request.title().trim(), request.content(),
                            Boolean.TRUE.equals(request.pinned()), hashtags), actorId);
        }
        log(actorId, article.getId(), "AI 소식 원고 수정", request.title());
        return AiNewsDtos.ArticleDetailResponse.from(article);
    }

    @Transactional
    public AiNewsDtos.ArticleDetailResponse publish(Long id, Long actorId) {
        return publish(id, null, null, actorId);
    }

    @Transactional
    public AiNewsDtos.ArticleDetailResponse publish(Long id, LocalDateTime scheduledAt, Long actorId) {
        return publish(id, scheduledAt, null, actorId);
    }

    @Transactional
    public AiNewsDtos.ArticleDetailResponse publish(Long id, LocalDateTime scheduledAt,
                                                     SocialPublishSelection socialSelection,
                                                     Long actorId) {
        AiNewsArticle article = findArticleForPublish(id);
        if (article.getStatus() == AiNewsArticleStatus.PUBLISHED) {
            if (socialSelection != null && socialSelection.anyRequested()) {
                if (article.getPostId() == null) {
                    throw new CustomException(ErrorCode.AI_NEWS_INVALID_STATUS);
                }
                socialPublishRequestService.requestPublishedAiArticle(
                        article.getId(), article.getPostId(), userRepository.getByIdOrThrow(actorId), socialSelection);
            }
            return AiNewsDtos.ArticleDetailResponse.from(article);
        }
        if (article.getStatus() == AiNewsArticleStatus.DELETED
                || article.getStatus() == AiNewsArticleStatus.REJECTED
                || article.getStatus() == AiNewsArticleStatus.SKIPPED_DUPLICATE) {
            throw new CustomException(ErrorCode.AI_NEWS_INVALID_STATUS);
        }
        socialPublishRequestService.requestAiArticle(
                article.getId(), userRepository.getByIdOrThrow(actorId), socialSelection);
        LocalDateTime now = LocalDateTime.now(SERVICE_ZONE);
        if (scheduledAt != null && scheduledAt.isAfter(now)) {
            article.schedule(scheduledAt);
            log(actorId, article.getId(), "AI 소식 예약발행", scheduledAt + " · " + article.getTitle());
            return AiNewsDtos.ArticleDetailResponse.from(article);
        }
        publishWithSystemAuthor(article);
        log(actorId, article.getId(), "AI 소식 발행", article.getTitle());
        return AiNewsDtos.ArticleDetailResponse.from(article);
    }

    @Transactional
    public AiNewsDtos.ArticleDetailResponse cancelSchedule(Long id, Long actorId) {
        AiNewsArticle article = findArticleForPublish(id);
        if (article.getStatus() != AiNewsArticleStatus.SCHEDULED) {
            throw new CustomException(ErrorCode.AI_NEWS_INVALID_STATUS);
        }
        article.cancelSchedule();
        log(actorId, article.getId(), "AI 소식 예약발행 취소", article.getTitle());
        return AiNewsDtos.ArticleDetailResponse.from(article);
    }

    @Transactional
    public void publishScheduled(Long id, LocalDateTime now) {
        AiNewsArticle article = findArticleForPublish(id);
        if (article.getStatus() != AiNewsArticleStatus.SCHEDULED
                || article.getScheduledAt() == null
                || article.getScheduledAt().isAfter(now)) {
            return;
        }
        publishWithSystemAuthor(article);
    }

    @Transactional
    public void failScheduledPublish(Long id) {
        AiNewsArticle article = findArticleForPublish(id);
        if (article.getStatus() != AiNewsArticleStatus.SCHEDULED) return;
        article.failScheduledPublish();
    }

    @Transactional
    public AiNewsDtos.ArticleDetailResponse reject(Long id, String reason, Long actorId) {
        AiNewsArticle article = findArticleDetail(id);
        if (article.getStatus() == AiNewsArticleStatus.PUBLISHED || article.getStatus() == AiNewsArticleStatus.DELETED) {
            throw new CustomException(ErrorCode.AI_NEWS_INVALID_STATUS);
        }
        article.reject(trimToNull(reason));
        socialPublishRequestService.cancelOrigin(SocialSourceType.AI_NEWS_ARTICLE, article.getId());
        log(actorId, article.getId(), "AI 소식 반려", reason);
        return AiNewsDtos.ArticleDetailResponse.from(article);
    }

    @Transactional
    public void delete(Long id, String reason, Long actorId) {
        AiNewsArticle article = findArticleDetail(id);
        if (article.getStatus() == AiNewsArticleStatus.DELETED) return;
        if (article.getPostId() != null) {
            DeletedPost deleted = postService.adminDeletePost(article.getPostId(), actorId, reason);
            article.markDeleted(deleted.getId());
        } else {
            article.markDeleted(null);
        }
        socialPublishRequestService.cancelOrigin(SocialSourceType.AI_NEWS_ARTICLE, article.getId());
        log(actorId, article.getId(), "AI 소식 삭제", reason);
    }

    @Transactional
    public AiNewsDtos.ArticleDetailResponse restore(Long id, Long actorId) {
        AiNewsArticle article = findArticleDetail(id);
        if (article.getStatus() != AiNewsArticleStatus.DELETED || article.getDeletedPostId() == null) {
            throw new CustomException(ErrorCode.AI_NEWS_INVALID_STATUS);
        }
        PostDetailResponse restored = postService.restorePost(article.getDeletedPostId());
        article.restore(restored.getId());
        postService.adminUpdatePost(restored.getId(),
                UpdatePostRequest.aiNews(article.getPrefixId(), article.getTitle(), article.getContent(),
                        article.isPinned(), article.getHashtags()),
                actorId);
        log(actorId, article.getId(), "AI 소식 복원", article.getTitle());
        return AiNewsDtos.ArticleDetailResponse.from(article);
    }

    @Transactional
    public AiNewsDtos.ArticleDetailResponse requestRewrite(Long id, AiNewsDtos.RewriteRequest request,
                                                           Long actorId) {
        AiNewsArticle article = findArticleDetail(id);
        if (article.getStatus() == AiNewsArticleStatus.PUBLISHED
                || article.getStatus() == AiNewsArticleStatus.SKIPPED_DUPLICATE
                || article.getStatus() == AiNewsArticleStatus.REWRITE_REQUESTED) {
            throw new CustomException(ErrorCode.AI_NEWS_INVALID_STATUS);
        }
        article.requestRewrite(request.prompt().trim(), LocalDateTime.now());
        log(actorId, article.getId(), "AI 소식 재작성 요청", request.prompt().trim());
        return AiNewsDtos.ArticleDetailResponse.from(article);
    }

    @Transactional
    public AiNewsDtos.ArticleDetailResponse completeRewrite(Long id, AiNewsDtos.RewriteResultRequest request) {
        AiNewsArticle article = findArticleDetail(id);
        if (article.getStatus() != AiNewsArticleStatus.REWRITE_REQUESTED) {
            throw new CustomException(ErrorCode.AI_NEWS_INVALID_STATUS);
        }
        List<String> hashtags = request.hashtags() != null
                ? HashtagNormalizer.normalize(request.hashtags())
                : List.copyOf(article.getHashtags());
        clearArticleHashtagsBeforeReplacement(article, hashtags);
        article.completeRewrite(request.title().trim(), withLeadImage(request.content(), article.getImageUrl()),
                request.confidenceScore() != null ? request.confidenceScore() : BigDecimal.ZERO,
                trimToNull(request.semanticFingerprint()), trimToNull(request.modelName()),
                hashtags);
        return AiNewsDtos.ArticleDetailResponse.from(article);
    }

    /**
     * 순서가 있는 ElementCollection을 제자리 갱신하면 (article_id, hashtag) 유니크 키와
     * 일시적으로 충돌할 수 있다. 변경 시 기존 행을 먼저 삭제·flush한 뒤 호출부가 새 목록을 채운다.
     */
    private void clearArticleHashtagsBeforeReplacement(AiNewsArticle article, List<String> hashtags) {
        if (article.getHashtags().equals(hashtags)) return;
        article.replaceHashtags(List.of());
        articleRepository.flush();
    }

    /** blocked 를 지정하지 않으면 차단 출처는 숨긴다(삭제된 원고를 숨기는 listArticles 와 같은 규칙). */
    @Transactional(readOnly = true)
    public Page<AiNewsDtos.SourceConfigResponse> sourceConfigs(AiNewsSourceType sourceType, Boolean enabled,
                                                                Boolean blocked, String keyword,
                                                                int page, int size) {
        return sourceConfigRepository.search(sourceType, enabled, Boolean.TRUE.equals(blocked), likeKeyword(keyword),
                        PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size))))
                .map(AiNewsDtos.SourceConfigResponse::from);
    }

    @Transactional
    public AiNewsDtos.SourceConfigResponse createSourceConfig(AiNewsDtos.SourceConfigUpsertRequest request,
                                                               Long actorId) {
        String sourceUrl = normalizeSourceConfigUrl(request.sourceUrl());
        SourceScope scope = normalizeSourceScope(sourceUrl, null);
        if (sourceConfigRepository.existsByDomainAndPathPrefix(scope.domain, scope.pathPrefix)) {
            throw new CustomException(ErrorCode.AI_NEWS_DUPLICATE);
        }
        AiNewsSourceConfig source = sourceConfigRepository.save(AiNewsSourceConfig.builder()
                .sourceName(request.sourceName().trim()).sourceUrl(sourceUrl)
                .domain(scope.domain).pathPrefix(scope.pathPrefix)
                .sourceType(request.sourceType())
                .enabled(request.enabled() == null || request.enabled())
                .autoPublishAllowed(Boolean.TRUE.equals(request.autoPublishAllowed()))
                .imageUseAllowed(Boolean.TRUE.equals(request.imageUseAllowed()))
                .autoDiscovered(false).build());
        log(actorId, source.getId(), "AI 소식 출처 추가", scope.display());
        return AiNewsDtos.SourceConfigResponse.from(source);
    }

    @Transactional
    public AiNewsDtos.SourceConfigResponse updateSourceConfig(Long id,
                                                               AiNewsDtos.SourceConfigUpsertRequest request,
                                                               Long actorId) {
        AiNewsSourceConfig source = sourceConfigRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_SOURCE_NOT_FOUND));
        String sourceUrl = normalizeSourceConfigUrl(request.sourceUrl());
        SourceScope scope = normalizeSourceScope(sourceUrl, null);
        if (sourceConfigRepository.existsByDomainAndPathPrefixAndIdNot(scope.domain, scope.pathPrefix, id)) {
            throw new CustomException(ErrorCode.AI_NEWS_DUPLICATE);
        }
        source.update(request.sourceName().trim(), sourceUrl, scope.domain, scope.pathPrefix, request.sourceType(),
                request.enabled() == null || request.enabled(), Boolean.TRUE.equals(request.autoPublishAllowed()),
                Boolean.TRUE.equals(request.imageUseAllowed()));
        log(actorId, source.getId(), "AI 소식 출처 수정",
                new SourceScope(source.getDomain(), source.getPathPrefix()).display());
        return AiNewsDtos.SourceConfigResponse.from(source);
    }

    /**
     * 자동 등록 출처는 지우지 않고 차단으로 남긴다 — 행을 지우면 다음 수집에서 {@code resolveSource} 가
     * 같은 도메인을 다시 등록해 삭제가 되돌려진다. 관리자가 직접 등록한 출처는 그대로 삭제한다.
     */
    @Transactional
    public void deleteSourceConfig(Long id, Long actorId) {
        AiNewsSourceConfig source = sourceConfigRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_SOURCE_NOT_FOUND));
        if (source.isAutoDiscovered()) {
            source.block(LocalDateTime.now(SERVICE_ZONE));
            log(actorId, id, "AI 소식 출처 차단", source.getDomain());
            return;
        }
        sourceConfigRepository.delete(source);
        log(actorId, id, "AI 소식 출처 삭제", source.getDomain());
    }

    @Transactional
    public AiNewsDtos.SourceConfigResponse unblockSourceConfig(Long id, Long actorId) {
        AiNewsSourceConfig source = sourceConfigRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_SOURCE_NOT_FOUND));
        source.unblock();
        log(actorId, id, "AI 소식 출처 차단 해제", source.getDomain());
        return AiNewsDtos.SourceConfigResponse.from(source);
    }

    @Transactional(readOnly = true)
    public Page<AiNewsDtos.TopicResponse> topics(AiNewsTopicStatus status, AiNewsCategory category,
                                                 String keyword, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        return topicRepository.search(status, category, likeKeyword(keyword), pageable)
                .map(AiNewsDtos.TopicResponse::from);
    }

    @Transactional
    public AiNewsDtos.TopicResponse createTopic(AiNewsDtos.TopicUpsertRequest request, Long actorId) {
        String key = normalizeTopicKey(request.normalizedKey());
        if (topicRepository.existsByNormalizedKey(key)) throw new CustomException(ErrorCode.AI_NEWS_DUPLICATE);
        validateTopicAliasCollision(null, request.title(), key, request.aliases());
        AiNewsTopic topic = topicRepository.save(AiNewsTopic.builder()
                .title(request.title().trim()).normalizedKey(key).aliases(trimToNull(request.aliases()))
                .category(request.category())
                .status(request.status() != null ? request.status() : AiNewsTopicStatus.READY)
                .aiSuggested(Boolean.TRUE.equals(request.aiSuggested()))
                .allowRepublish(Boolean.TRUE.equals(request.allowRepublish())).build());
        log(actorId, topic.getId(), "AI 정보 글 주제 추가", topic.getTitle());
        return AiNewsDtos.TopicResponse.from(topic);
    }

    @Transactional
    public AiNewsDtos.TopicResponse updateTopic(Long id, AiNewsDtos.TopicUpsertRequest request, Long actorId) {
        AiNewsTopic topic = topicRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_TOPIC_NOT_FOUND));
        if (!topic.getNormalizedKey().equals(normalizeTopicKey(request.normalizedKey()))) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        validateTopicAliasCollision(topic.getId(), request.title(), topic.getNormalizedKey(), request.aliases());
        topic.update(request.title().trim(), trimToNull(request.aliases()), request.category(),
                request.status() != null ? request.status() : topic.getStatus(),
                Boolean.TRUE.equals(request.allowRepublish()));
        log(actorId, topic.getId(), "AI 정보 글 주제 수정", topic.getTitle());
        return AiNewsDtos.TopicResponse.from(topic);
    }

    @Transactional
    public void deleteTopic(Long id, Long actorId) {
        AiNewsTopic topic = topicRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_TOPIC_NOT_FOUND));
        if (articleRepository.existsByTopicId(id)) {
            throw new CustomException(ErrorCode.AI_NEWS_TOPIC_IN_USE);
        }
        topicRepository.delete(topic);
        log(actorId, id, "AI 정보 글 주제 삭제", topic.getTitle());
    }

    @Transactional(readOnly = true)
    public AiNewsDtos.InternalConfigResponse internalConfig() {
        AiNewsSettings settings = getSettingsEntity();
        LocalDateTime lastTip = articleRepository.findLastSuccessfulPublishedAt(AiNewsArticleType.TIP_INFO);
        LocalDateTime today = LocalDate.now(SERVICE_ZONE).atStartOfDay();
        long publishedToday = articleRepository.countSuccessfulPublicationsSince(
                AiNewsArticleType.RELEASE_NEWS, today);
        boolean tipDue = lastTip == null || !lastTip.plusHours(settings.getTipIntervalHours()).isAfter(LocalDateTime.now());
        List<AiNewsDtos.TipDuplicateCorpusResponse> duplicateCorpus = articleRepository
                .findByArticleTypeAndStatusInOrderByCreatedAtAsc(AiNewsArticleType.TIP_INFO,
                        List.of(AiNewsArticleStatus.PUBLISHED))
                .stream().map(this::toDuplicateCorpus).toList();
        return new AiNewsDtos.InternalConfigResponse(AiNewsDtos.SettingsResponse.from(settings), usageSummary(),
                sourceConfigRepository.findByEnabledTrueOrderBySourceNameAsc().stream()
                        .map(AiNewsDtos.SourceConfigResponse::from).toList(),
                // 차단 출처는 활성 목록에 없다. 크롤러가 검색 결과 단계에서 걸러내도록 별도로 내려준다.
                sourceConfigRepository.findByBlockedTrueOrderBySourceNameAsc().stream()
                        .map(AiNewsDtos.SourceScopeResponse::from).toList(),
                topicRepository.findByStatusOrderByCreatedAtAsc(AiNewsTopicStatus.READY).stream()
                        .map(AiNewsDtos.TopicResponse::from).toList(),
                topicRepository.findAll().stream().map(AiNewsTopic::getNormalizedKey).toList(),
                duplicateCorpus,
                articleRepository.findFirstByStatusOrderByRewriteRequestedAtAsc(AiNewsArticleStatus.REWRITE_REQUESTED)
                        .map(AiNewsDtos.RewriteQueueResponse::from).stream().toList(),
                lastTip, tipDue, publishedToday);
    }

    @Transactional(readOnly = true)
    public AiNewsDtos.DedupeCheckResponse checkDuplicate(String dedupeKey, String canonicalUrlHash,
                                                          String semanticFingerprint, AiNewsArticleType type) {
        Optional<AiNewsArticle> found = articleRepository.findByDedupeKey(dedupeKey);
        if (found.isEmpty() && type == AiNewsArticleType.RELEASE_NEWS && hasText(canonicalUrlHash)) {
            found = articleRepository.findFirstByCanonicalUrlHash(canonicalUrlHash.trim().toLowerCase(Locale.ROOT));
        }
        if (found.isEmpty() && hasText(semanticFingerprint) && type != null) {
            found = articleRepository.findFirstByArticleTypeAndSemanticFingerprint(type, semanticFingerprint.trim());
        }
        return found.map(a -> new AiNewsDtos.DedupeCheckResponse(true, a.getId(), a.getStatus(),
                        a.getDedupeKey(), !hasText(a.getImageUrl())))
                .orElseGet(() -> new AiNewsDtos.DedupeCheckResponse(false, null, null, null, false));
    }

    @Transactional(readOnly = true)
    public AiNewsDtos.SettingsResponse settings() {
        return AiNewsDtos.SettingsResponse.from(getSettingsEntity());
    }

    @Transactional
    public AiNewsDtos.SettingsResponse updateSettings(AiNewsDtos.SettingsUpdateRequest request, Long actorId) {
        if (request.whiskyRatio() + request.wineRatio() + request.cognacRatio() != 100) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        AiNewsSettings settings = getSettingsEntity();
        BigDecimal budget = request.openaiMonthlyBudgetUsd() != null
                && request.openaiMonthlyBudgetUsd().compareTo(BigDecimal.ZERO) > 0
                ? request.openaiMonthlyBudgetUsd() : null;
        Long tokenLimit = request.openaiMonthlyTokenLimit() != null && request.openaiMonthlyTokenLimit() > 0
                ? request.openaiMonthlyTokenLimit() : null;
        Integer imageLimit = request.openaiMonthlyImageLimit() != null && request.openaiMonthlyImageLimit() > 0
                ? request.openaiMonthlyImageLimit() : null;
        settings.update(request.automationEnabled(), request.autoPublishEnabled(), request.dryRun(),
                request.dailyReleaseLimit(), request.tipIntervalHours(), request.confidenceThreshold(),
                request.tavilyMonthlyCreditLimit(), budget, tokenLimit, imageLimit, request.whiskyRatio(),
                request.wineRatio(), request.cognacRatio());
        log(actorId, AiNewsSettings.SINGLETON_ID, "AI 소식 설정 변경", null);
        return AiNewsDtos.SettingsResponse.from(settings);
    }

    @Transactional(readOnly = true)
    public AiNewsDtos.UsageSummaryResponse usageSummary() {
        LocalDateTime monthStart = LocalDate.now(SERVICE_ZONE)
                .with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay();
        AiNewsSettings settings = getSettingsEntity();
        return new AiNewsDtos.UsageSummaryResponse(
                usageRepository.sumTavilyCreditsSince(monthStart),
                usageRepository.sumInputTokensSince(monthStart),
                usageRepository.sumOutputTokensSince(monthStart),
                usageRepository.sumImageCountSince(monthStart),
                Optional.ofNullable(usageRepository.sumEstimatedCostSince(monthStart)).orElse(BigDecimal.ZERO),
                settings.getTavilyMonthlyCreditLimit(), settings.getOpenaiMonthlyBudgetUsd(),
                settings.getOpenaiMonthlyTokenLimit(), settings.getOpenaiMonthlyImageLimit());
    }

    @Transactional
    public void recordUsage(AiNewsDtos.UsageRequest request) {
        AiNewsRun run = request.runId() != null ? runRepository.findById(request.runId()).orElse(null) : null;
        usageRepository.save(AiNewsUsage.builder()
                .run(run)
                .provider(request.provider().trim().toUpperCase(Locale.ROOT))
                .modelName(trimToNull(request.modelName()))
                .inputTokens(request.inputTokens())
                .outputTokens(request.outputTokens())
                .imageCount(request.imageCount())
                .tavilyCredits(request.tavilyCredits())
                .estimatedCostUsd(request.estimatedCostUsd() != null ? request.estimatedCostUsd() : BigDecimal.ZERO)
                .usageAt(request.usageAt() != null ? request.usageAt() : LocalDateTime.now())
                .build());
    }

    @Transactional
    public AiNewsDtos.RunResponse startRun(AiNewsDtos.RunStartRequest request) {
        AiNewsRun existing = runRepository.findByRunKey(request.runKey()).orElse(null);
        if (existing != null) return AiNewsDtos.RunResponse.from(existing);
        AiNewsRun run = runRepository.save(AiNewsRun.builder()
                .runKey(request.runKey())
                .runType(request.runType())
                .status(AiNewsRunStatus.RUNNING)
                .startedAt(LocalDateTime.now())
                .build());
        return AiNewsDtos.RunResponse.from(run);
    }

    @Transactional
    public AiNewsDtos.RunResponse finishRun(Long id, AiNewsDtos.RunFinishRequest request) {
        AiNewsRun run = runRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));
        run.finish(request.status(), request.candidateCount(), request.publishedCount(), request.reviewCount(),
                request.duplicateCount(), request.errorCount(), trimToNull(request.errorMessage()));
        return AiNewsDtos.RunResponse.from(run);
    }

    @Transactional
    public PostImageUploadResponse uploadInternalImage(MultipartFile image) {
        User author = userRepository.findByEmail(SYSTEM_AUTHOR_EMAIL)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_SYSTEM_AUTHOR_NOT_FOUND));
        return postImageService.upload(image, author.getId());
    }

    @Transactional(readOnly = true)
    public Page<AiNewsDtos.RunResponse> runs(int page, int size) {
        return runRepository.findAllByOrderByStartedAtDesc(
                        PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size))))
                .map(AiNewsDtos.RunResponse::from);
    }

    private Optional<AiNewsArticle> findDuplicate(AiNewsDtos.ArticleUpsertRequest request) {
        Optional<AiNewsArticle> duplicate = articleRepository.findByDedupeKey(request.dedupeKey().trim());
        if (duplicate.isEmpty() && request.articleType() == AiNewsArticleType.RELEASE_NEWS
                && hasText(request.canonicalUrlHash())) {
            duplicate = articleRepository.findFirstByCanonicalUrlHash(
                    request.canonicalUrlHash().trim().toLowerCase(Locale.ROOT));
        }
        if (duplicate.isEmpty() && request.articleType() == AiNewsArticleType.RELEASE_NEWS
                && request.sources() != null && !request.sources().isEmpty()) {
            List<String> canonicalUrls = request.sources().stream()
                    .map(AiNewsDtos.SourceEvidenceRequest::canonicalUrl)
                    .map(AiNewsService::normalizeCanonicalUrl)
                    .distinct().toList();
            if (!canonicalUrls.isEmpty()) {
                duplicate = articleRepository.findFirstByArticleTypeAndSourcesCanonicalUrlInOrderByCreatedAtAsc(
                        AiNewsArticleType.RELEASE_NEWS, canonicalUrls);
            }
        }
        if (duplicate.isEmpty() && hasText(request.semanticFingerprint())) {
            duplicate = articleRepository.findFirstByArticleTypeAndSemanticFingerprint(
                    request.articleType(), request.semanticFingerprint().trim());
        }
        return duplicate;
    }

    private boolean canRetryMissingTipImage(AiNewsArticle existing, AiNewsDtos.ArticleUpsertRequest request) {
        return existing.getArticleType() == AiNewsArticleType.TIP_INFO
                && existing.getStatus() == AiNewsArticleStatus.PENDING_REVIEW
                && !hasText(existing.getImageUrl())
                && hasText(request.imageUrl())
                && "AI_GENERATED".equalsIgnoreCase(request.imageKind());
    }

    private List<ResolvedSource> resolveStoredSources(AiNewsArticle article) {
        return article.getSources().stream()
                .map(source -> resolveSource(source.getSourceUrl(), source.getDomain(), source.getSourceType()))
                .collect(java.util.stream.Collectors.toMap(
                        ResolvedSource::scopeKey, source -> source, (left, right) -> left,
                        LinkedHashMap::new))
                .values().stream().toList();
    }

    private AiNewsDtos.TipDuplicateCorpusResponse toDuplicateCorpus(AiNewsArticle article) {
        AiNewsTopic topic = article.getTopic();
        var document = Jsoup.parse(article.getContent());
        String outline = String.join(" | ", document.select("h1,h2,h3").eachText());
        if (!hasText(outline)) outline = document.text();
        if (outline.length() > 1000) outline = outline.substring(0, 1000);
        return new AiNewsDtos.TipDuplicateCorpusResponse(
                article.getId(), article.getTitle(), article.getSemanticFingerprint(),
                topic != null ? topic.getNormalizedKey() : null,
                topic != null ? topic.getTitle() : null,
                topic != null ? topic.getAliases() : null,
                outline);
    }

    private void validateTopicAliasCollision(Long currentTopicId, String title, String key, String aliases) {
        Set<String> requested = topicSignatures(title, key, aliases);
        boolean duplicate = topicRepository.findAll().stream()
                .filter(topic -> currentTopicId == null || !currentTopicId.equals(topic.getId()))
                .map(topic -> topicSignatures(topic.getTitle(), topic.getNormalizedKey(), topic.getAliases()))
                .anyMatch(existing -> existing.stream().anyMatch(requested::contains));
        if (duplicate) throw new CustomException(ErrorCode.AI_NEWS_DUPLICATE);
    }

    private static Set<String> topicSignatures(String title, String key, String aliases) {
        Set<String> signatures = new HashSet<>();
        List<String> values = new ArrayList<>();
        values.add(title);
        values.add(key);
        if (hasText(aliases)) values.addAll(Arrays.asList(aliases.split("[,;|\\n]")));
        for (String value : values) {
            if (!hasText(value)) continue;
            String normalized = Normalizer.normalize(value, Normalizer.Form.NFKC)
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("[^a-z0-9가-힣]", "");
            if (!normalized.isBlank()) signatures.add(normalized);
        }
        return signatures;
    }

    private String autoPublishHoldReason(AiNewsArticle article, List<ResolvedSource> sources,
                                         AiNewsSettings settings, boolean requested) {
        if (!requested) return "자동 발행이 요청되지 않아 검토 대기 중입니다.";
        if (!settings.isAutomationEnabled()) return "자동화가 비활성화되어 있습니다.";
        if (!settings.isAutoPublishEnabled()) return "자동 발행이 비활성화되어 있습니다.";
        if (settings.isDryRun()) return "드라이런 모드입니다.";
        if (article.getConfidenceScore().compareTo(settings.getConfidenceThreshold()) < 0) {
            return "신뢰도가 자동 발행 기준보다 낮습니다.";
        }
        if (isBudgetExceeded(settings)) return "월간 AI 사용 한도에 도달했습니다.";

        boolean hasReviewOnlySource = sources.stream().anyMatch(s ->
                s.type == AiNewsSourceType.COMMUNITY || s.type == AiNewsSourceType.UNAPPROVED || !s.autoPublishAllowed);
        if (hasReviewOnlySource) return "커뮤니티 또는 미승인 출처가 포함되어 있습니다.";
        long official = sources.stream().filter(s -> s.type == AiNewsSourceType.OFFICIAL && s.autoPublishAllowed).count();
        long media = sources.stream().filter(s -> s.type == AiNewsSourceType.TRUSTED_MEDIA && s.autoPublishAllowed)
                .map(s -> s.domain).distinct().count();
        if (official < 1 && media < 2) return "공식 출처 1개 또는 독립 전문매체 2개가 필요합니다.";

        if (article.getArticleType() == AiNewsArticleType.RELEASE_NEWS) {
            if (!hasText(article.getImageUrl())) return "출시 소식 대표 이미지가 준비되지 않았습니다.";
            if ("OFFICIAL_APPROVED".equalsIgnoreCase(article.getImageKind())) {
                boolean approvedImageSource = sources.stream().anyMatch(source ->
                        source.type == AiNewsSourceType.OFFICIAL && source.imageUseAllowed);
                if (!approvedImageSource || !hasText(article.getImageRightsEvidence())) {
                    return "공식 이미지의 관리자 사용 승인 또는 사용 근거가 확인되지 않았습니다.";
                }
            } else if (!"AI_GENERATED".equalsIgnoreCase(article.getImageKind())) {
                return "출시 소식 이미지 유형을 확인할 수 없습니다.";
            }
            LocalDateTime today = LocalDate.now(SERVICE_ZONE).atStartOfDay();
            long count = articleRepository.countSuccessfulPublicationsSince(AiNewsArticleType.RELEASE_NEWS, today);
            if (count >= settings.getDailyReleaseLimit()) return "오늘의 출시 소식 자동 발행 한도에 도달했습니다.";
        } else {
            if (!"AI_GENERATED".equalsIgnoreCase(article.getImageKind()) || !hasText(article.getImageUrl())) {
                return "팁 및 정보 글은 AI 대표 이미지가 필요합니다.";
            }
            LocalDateTime last = articleRepository.findLastSuccessfulPublishedAt(AiNewsArticleType.TIP_INFO);
            if (last != null && last.plusHours(settings.getTipIntervalHours()).isAfter(LocalDateTime.now())) {
                return "이전 정보 글 발행 후 48시간이 지나지 않았습니다.";
            }
        }
        return null;
    }

    private boolean isBudgetExceeded(AiNewsSettings settings) {
        AiNewsDtos.UsageSummaryResponse usage = usageSummary();
        if (usage.tavilyCredits() >= settings.getTavilyMonthlyCreditLimit()) return true;
        if (settings.getOpenaiMonthlyBudgetUsd() != null
                && usage.estimatedCostUsd().compareTo(settings.getOpenaiMonthlyBudgetUsd()) >= 0) return true;
        long totalTokens = usage.inputTokens() + usage.outputTokens();
        if (settings.getOpenaiMonthlyTokenLimit() != null
                && totalTokens >= settings.getOpenaiMonthlyTokenLimit()) return true;
        return settings.getOpenaiMonthlyImageLimit() != null
                && usage.imageCount() >= settings.getOpenaiMonthlyImageLimit();
    }

    private void publishWithSystemAuthor(AiNewsArticle article) {
        User author = userRepository.findByEmail(SYSTEM_AUTHOR_EMAIL)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_SYSTEM_AUTHOR_NOT_FOUND));
        if (article.getDeletedPostId() != null) {
            PostDetailResponse restored = postService.restorePost(article.getDeletedPostId());
            postService.adminUpdatePost(restored.getId(),
                    UpdatePostRequest.aiNews(article.getPrefixId(), article.getTitle(), article.getContent(),
                            article.isPinned(), article.getHashtags()), author.getId());
            article.publish(restored.getId(), LocalDateTime.now(SERVICE_ZONE));
            socialPublishRequestService.bindAiArticle(article.getId(), restored.getId());
            return;
        }
        PostDetailResponse post = postService.createPost(
                CreatePostRequest.aiNotice(article.getPrefixId(), article.getTitle(), article.getContent(),
                        article.isPinned(), article.getHashtags()),
                author.getId());
        article.publish(post.getId(), LocalDateTime.now(SERVICE_ZONE));
        socialPublishRequestService.bindAiArticle(article.getId(), post.getId());
    }

    private Long resolveDefaultPrefixId(Long requestedPrefixId) {
        if (requestedPrefixId != null) return requestedPrefixId;
        return postPrefixRepository
                .findFirstByBoardTypeAndNameOrderBySortOrderAscIdAsc(BoardType.NOTICE, DEFAULT_PREFIX_NAME)
                .map(PostPrefix::getId)
                .orElse(null);
    }

    private AiNewsTopic resolveTopic(AiNewsDtos.ArticleUpsertRequest request) {
        if (request.topicId() == null) return null;
        return topicRepository.findById(request.topicId())
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_TOPIC_NOT_FOUND));
    }

    private List<ResolvedSource> addResolvedSources(AiNewsArticle article,
                                                     List<AiNewsDtos.SourceEvidenceRequest> sources) {
        if (sources == null) return List.of();
        List<ResolvedSource> resolved = new ArrayList<>();
        Set<String> scopes = new HashSet<>();
        for (AiNewsDtos.SourceEvidenceRequest source : sources) {
            String domain = verifiedSourceDomain(source.sourceUrl(), source.domain());
            ResolvedSource trust = resolveSource(source.sourceUrl(), domain, source.sourceType());
            if (!scopes.add(trust.scopeKey)) continue;
            resolved.add(trust);
            article.addSource(AiNewsArticleSource.builder()
                    .sourceUrl(source.sourceUrl().trim())
                    .canonicalUrl(normalizeCanonicalUrl(source.canonicalUrl()))
                    .domain(domain)
                    .sourceTitle(trimToNull(source.sourceTitle()))
                    .sourceType(trust.type)
                    .evidenceSummary(trimToNull(source.evidenceSummary()))
                    .contentHash(trimToNull(source.contentHash()))
                    .publishedAt(source.publishedAt())
                    .retrievedAt(source.retrievedAt() != null ? source.retrievedAt() : LocalDateTime.now())
                    .build());
        }
        return resolved;
    }

    private void mergeNewSources(AiNewsArticle article, List<AiNewsDtos.SourceEvidenceRequest> sources) {
        if (sources == null || sources.isEmpty()) return;
        Set<String> existing = article.getSources().stream()
                .map(source -> resolveSource(source.getSourceUrl(), source.getDomain(), source.getSourceType()).scopeKey)
                .collect(java.util.stream.Collectors.toSet());
        for (AiNewsDtos.SourceEvidenceRequest source : sources) {
            String domain = verifiedSourceDomain(source.sourceUrl(), source.domain());
            ResolvedSource trust = resolveSource(source.sourceUrl(), domain, source.sourceType());
            if (existing.contains(trust.scopeKey)) continue;
            article.addSource(AiNewsArticleSource.builder()
                    .sourceUrl(source.sourceUrl().trim()).canonicalUrl(normalizeCanonicalUrl(source.canonicalUrl()))
                    .domain(domain).sourceTitle(trimToNull(source.sourceTitle())).sourceType(trust.type)
                    .evidenceSummary(trimToNull(source.evidenceSummary())).contentHash(trimToNull(source.contentHash()))
                    .publishedAt(source.publishedAt())
                    .retrievedAt(source.retrievedAt() != null ? source.retrievedAt() : LocalDateTime.now())
                    .build());
            existing.add(trust.scopeKey);
        }
    }

    /** 관리자 편집 화면의 URL 목록을 반영한다. null은 기존 출처 유지, 빈 목록은 전체 삭제다. */
    private void replaceAdminSourceUrls(AiNewsArticle article, List<String> sourceUrls) {
        if (sourceUrls == null) return;

        Map<String, AdminSourceUrl> requestedByDomain = new LinkedHashMap<>();
        for (String rawUrl : sourceUrls) {
            String canonicalUrl = normalizeAdminSourceUrl(rawUrl);
            String domain = verifiedSourceDomain(canonicalUrl, URI.create(canonicalUrl).getHost());
            ResolvedSource trust = resolveSource(canonicalUrl, domain, AiNewsSourceType.UNAPPROVED);
            if (requestedByDomain.putIfAbsent(domain,
                    new AdminSourceUrl(canonicalUrl, domain, trust.type)) != null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
        }

        Map<String, AiNewsArticleSource> existingByDomain = article.getSources().stream()
                .collect(java.util.stream.Collectors.toMap(AiNewsArticleSource::getDomain, source -> source,
                        (left, right) -> left, LinkedHashMap::new));
        article.getSources().removeIf(source -> !requestedByDomain.containsKey(source.getDomain()));

        for (AdminSourceUrl requested : requestedByDomain.values()) {
            AiNewsArticleSource existing = existingByDomain.get(requested.domain);
            if (existing == null) {
                article.addSource(AiNewsArticleSource.builder()
                        .sourceUrl(requested.url)
                        .canonicalUrl(requested.url)
                        .domain(requested.domain)
                        .sourceType(requested.type)
                        .retrievedAt(LocalDateTime.now())
                        .build());
            } else if (!requested.url.equals(existing.getCanonicalUrl())) {
                existing.updateUrl(requested.url, requested.url, requested.type, LocalDateTime.now());
            }
        }
    }

    @Transactional
    public AiNewsDtos.SourceConfigResponse recordSourceCrawlResult(
            Long id, AiNewsDtos.SourceCrawlResultRequest request) {
        AiNewsSourceConfig source = sourceConfigRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_SOURCE_NOT_FOUND));
        AiNewsSourceCrawlStatus status = request.status();
        String error = status == AiNewsSourceCrawlStatus.ERROR ? trimToNull(request.errorMessage()) : null;
        if (status == AiNewsSourceCrawlStatus.ERROR && error == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        source.recordCrawlResult(status, error,
                request.checkedAt() != null ? request.checkedAt() : LocalDateTime.now(SERVICE_ZONE));
        return AiNewsDtos.SourceConfigResponse.from(source);
    }

    /**
     * 출처 URL 의 신뢰 등급을 판정한다. 설정 행이 없으면 자동으로 만들어 관리자가 볼 수 있게 한다.
     *
     * <p>차단된 출처도 설정 행이 남아 있으므로 아래 첫 분기에서 걸린다 — 새 행을 만들지 않고
     * (비활성이므로) 미승인·자동발행 불가·이미지 사용 불가로 내려간다. 관리자의 삭제(=차단)가
     * 다음 수집에서 되돌려지지 않는 이유가 이것이다. 생산자 도메인 자동 승격도 같은 이유로 막힌다.
     */
    private ResolvedSource resolveSource(String sourceUrl, String domain, AiNewsSourceType claimedType) {
        String path = sourceUrlPath(sourceUrl);
        AiNewsSourceConfig configured = findBestSourceConfig(sourceConfigRepository.findByDomain(domain), path);
        if (configured != null) {
            return new ResolvedSource(domain, scopeKey(domain, configured.getPathPrefix()),
                    configured.isEnabled() ? configured.getSourceType() : AiNewsSourceType.UNAPPROVED,
                    configured.isEnabled() && configured.isAutoPublishAllowed(),
                    configured.isEnabled() && configured.isImageUseAllowed());
        }
        SourceScope producerScope = findProducerScope(sourceUrl, domain);
        if (producerScope != null) {
            AiNewsSourceConfig saved = sourceConfigRepository.save(AiNewsSourceConfig.builder()
                    .sourceName(producerScope.display()).sourceUrl("https://" + producerScope.display())
                    .domain(domain).pathPrefix(producerScope.pathPrefix)
                    .sourceType(AiNewsSourceType.OFFICIAL)
                    .enabled(true).autoPublishAllowed(true).imageUseAllowed(false)
                    .autoDiscovered(true).build());
            return new ResolvedSource(domain, scopeKey(domain, saved.getPathPrefix()), saved.getSourceType(), true, false);
        }
        AiNewsSourceType initialType = claimedType == AiNewsSourceType.COMMUNITY
                ? AiNewsSourceType.COMMUNITY : AiNewsSourceType.UNAPPROVED;
        sourceConfigRepository.save(AiNewsSourceConfig.builder()
                .sourceName(domain).sourceUrl("https://" + domain).domain(domain).pathPrefix("").sourceType(initialType)
                .enabled(true).autoPublishAllowed(false).imageUseAllowed(false)
                .autoDiscovered(true).build());
        return new ResolvedSource(domain, scopeKey(domain, ""), initialType, false, false);
    }

    private SourceScope findProducerScope(String sourceUrl, String domain) {
        String sourcePath = sourceUrlPath(sourceUrl);
        for (Producer producer : producerRepository.findAllByWebsiteIsNotNull()) {
            try {
                SourceScope scope = normalizeSourceScope(producer.getWebsite(), null);
                if (domain.equals(scope.domain) && pathMatches(sourcePath, scope.pathPrefix)) return scope;
            } catch (RuntimeException ignored) {
                // 잘못 저장된 기존 URL은 신뢰 출처로 자동 승격하지 않는다.
            }
        }
        return null;
    }

    private AiNewsArticle findArticleDetail(Long id) {
        return articleRepository.findDetailById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_NOT_FOUND));
    }

    private AiNewsArticle findArticleForPublish(Long id) {
        return articleRepository.findForPublishById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_NOT_FOUND));
    }

    private AiNewsSettings getSettingsEntity() {
        return settingsRepository.findById(AiNewsSettings.SINGLETON_ID)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_SETTINGS_NOT_FOUND));
    }

    private void log(Long actorId, Long targetId, String summary, String detail) {
        if (actorId == null) return;
        User actor = userRepository.getByIdOrThrow(actorId);
        adminLogService.record(actor, AdminLogType.AI_NEWS_MANAGE, AdminLogTargetType.POST,
                targetId, summary, trimToNull(detail));
    }

    private static String withLeadImage(String content, String imageUrl) {
        if (!hasText(imageUrl) || content.contains(imageUrl)) return content;
        return "<p><img src=\"" + imageUrl.replace("\"", "") + "\" alt=\"대표 이미지\"></p>" + content;
    }

    private static String normalizeDomain(String raw) {
        String value = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        try {
            if (value.contains("://")) value = URI.create(value).getHost();
        } catch (RuntimeException ignored) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (value == null) throw new CustomException(ErrorCode.INVALID_INPUT);
        value = value.replaceFirst("^www\\.", "");
        if (!value.matches("[a-z0-9가-힣.-]+") || value.startsWith(".") || value.endsWith(".")) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return value;
    }

    private static SourceScope normalizeSourceScope(String rawDomain, String rawPathPrefix) {
        String value = rawDomain == null ? "" : rawDomain.trim();
        String derivedPath = null;
        if (value.contains("://")) {
            try {
                URI parsed = URI.create(value).normalize();
                derivedPath = parsed.getPath();
                value = parsed.getHost();
            } catch (RuntimeException ignored) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
        }
        String domain = normalizeDomain(value);
        String pathPrefix = normalizePathPrefix(hasText(rawPathPrefix) ? rawPathPrefix : derivedPath);
        return new SourceScope(domain, pathPrefix);
    }

    private static String normalizeSourceConfigUrl(String rawUrl) {
        if (!hasText(rawUrl)) throw new CustomException(ErrorCode.INVALID_INPUT);
        try {
            URI parsed = URI.create(rawUrl.trim()).normalize();
            String scheme = parsed.getScheme() == null ? null : parsed.getScheme().toLowerCase(Locale.ROOT);
            String host = parsed.getHost() == null ? null : parsed.getHost().toLowerCase(Locale.ROOT);
            if (!("http".equals(scheme) || "https".equals(scheme)) || host == null
                    || parsed.getUserInfo() != null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            String path = normalizePathPrefix(parsed.getPath());
            URI normalized = new URI(scheme, null, host, parsed.getPort(),
                    path.isEmpty() ? null : path, null, null);
            String value = normalized.toString();
            if (value.length() > 1500) throw new CustomException(ErrorCode.INVALID_INPUT);
            return value;
        } catch (CustomException e) {
            throw e;
        } catch (Exception ignored) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private static String normalizePathPrefix(String raw) {
        if (!hasText(raw) || "/".equals(raw.trim())) return "";
        String value = raw.trim();
        if (value.contains("?") || value.contains("#") || value.contains("://")) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (!value.startsWith("/")) value = "/" + value;
        try {
            value = URI.create(value).normalize().getPath();
        } catch (RuntimeException ignored) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        if (value == null || value.contains("..")) throw new CustomException(ErrorCode.INVALID_INPUT);
        value = value.replaceAll("/{2,}", "/").replaceFirst("/+$", "");
        if (value.length() > 255) throw new CustomException(ErrorCode.INVALID_INPUT);
        return value;
    }

    private static String sourceUrlPath(String rawUrl) {
        try {
            URI parsed = URI.create(rawUrl.trim()).normalize();
            if (!("http".equalsIgnoreCase(parsed.getScheme()) || "https".equalsIgnoreCase(parsed.getScheme()))
                    || parsed.getHost() == null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            return normalizePathPrefix(parsed.getPath());
        } catch (CustomException e) {
            throw e;
        } catch (RuntimeException ignored) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private static String verifiedSourceDomain(String sourceUrl, String claimedDomain) {
        try {
            String actual = normalizeDomain(URI.create(sourceUrl.trim()).getHost());
            if (!actual.equals(normalizeDomain(claimedDomain))) throw new CustomException(ErrorCode.INVALID_INPUT);
            return actual;
        } catch (CustomException e) {
            throw e;
        } catch (RuntimeException ignored) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private static boolean pathMatches(String sourcePath, String pathPrefix) {
        if (!hasText(pathPrefix)) return true;
        return sourcePath.equals(pathPrefix) || sourcePath.startsWith(pathPrefix + "/");
    }

    static AiNewsSourceConfig findBestSourceConfig(List<AiNewsSourceConfig> configs, String sourcePath) {
        return configs.stream()
                .filter(source -> pathMatches(sourcePath, source.getPathPrefix()))
                .max(Comparator.comparingInt(source -> source.getPathPrefix().length()))
                .orElse(null);
    }

    private static String scopeKey(String domain, String pathPrefix) {
        return domain + (hasText(pathPrefix) ? pathPrefix : "/*");
    }

    private static String normalizeCanonicalUrl(String raw) {
        if (!hasText(raw)) throw new CustomException(ErrorCode.INVALID_INPUT);
        try {
            URI parsed = URI.create(raw.trim()).normalize();
            String scheme = parsed.getScheme() == null ? null : parsed.getScheme().toLowerCase(Locale.ROOT);
            String host = parsed.getHost() == null ? null : parsed.getHost().toLowerCase(Locale.ROOT);
            if (!("http".equals(scheme) || "https".equals(scheme)) || host == null) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            host = host.replaceFirst("^www\\.", "");
            int port = parsed.getPort();
            if (("http".equals(scheme) && port == 80) || ("https".equals(scheme) && port == 443)) port = -1;
            String path = hasText(parsed.getPath()) ? parsed.getPath().replaceAll("/+$", "") : "";
            String query = normalizeQuery(parsed.getRawQuery());
            return new URI(scheme, null, host, port, path, query, null).toASCIIString();
        } catch (IllegalArgumentException | URISyntaxException e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private static String normalizeQuery(String rawQuery) {
        if (!hasText(rawQuery)) return null;
        List<String> kept = Arrays.stream(rawQuery.split("&"))
                .filter(part -> {
                    String key = part.split("=", 2)[0].toLowerCase(Locale.ROOT);
                    return !key.startsWith("utm_")
                            && !Set.of("fbclid", "gclid", "ref", "source").contains(key);
                })
                .sorted().toList();
        return kept.isEmpty() ? null : String.join("&", kept);
    }

    private static String normalizeTopicKey(String raw) {
        String value = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9가-힣]+", "-")
                .replaceAll("^-+|-+$", "");
        if (value.isBlank()) throw new CustomException(ErrorCode.INVALID_INPUT);
        return value;
    }

    private static String trimToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }

    /**
     * 관리자 검색어를 LIKE 패턴으로 정규화한다. 소문자로 맞추고 와일드카드('%','_')와
     * escape 문자('!') 를 이스케이프한다 — 중복 키·도메인에는 밑줄이 흔해서
     * 그대로 두면 "임의의 한 글자"로 해석된다. 빈 값은 null(필터 미적용)이다.
     */
    private static String likeKeyword(String raw) {
        String value = trimToNull(raw);
        if (value == null) return null;
        return value.toLowerCase(Locale.ROOT)
                .replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_");
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record SourceScope(String domain, String pathPrefix) {
        String display() {
            return domain + (hasText(pathPrefix) ? pathPrefix : "");
        }
    }

    private static String normalizeAdminSourceUrl(String raw) {
        try {
            URI parsed = URI.create(raw.trim());
            if (parsed.getUserInfo() != null) throw new CustomException(ErrorCode.INVALID_INPUT);
            return normalizeCanonicalUrl(raw);
        } catch (CustomException e) {
            throw e;
        } catch (RuntimeException ignored) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private record ResolvedSource(String domain, String scopeKey, AiNewsSourceType type, boolean autoPublishAllowed,
                                  boolean imageUseAllowed) {}

    private record AdminSourceUrl(String url, String domain, AiNewsSourceType type) {}
}
