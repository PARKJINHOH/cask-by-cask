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
import com.caskbycask.domain.community.dto.UpdatePostRequest;
import com.caskbycask.domain.community.entity.DeletedPost;
import com.caskbycask.domain.community.entity.PostPrefix;
import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.repository.PostPrefixRepository;
import com.caskbycask.domain.community.service.PostService;
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
    private final PostService postService;
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
        Page<AiNewsArticle> found = articleRepository.search(status, excludedStatus, type, category,
                fromDate != null ? fromDate.atStartOfDay() : null,
                toDate != null ? toDate.plusDays(1).atStartOfDay() : null,
                PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size))));
        Map<Long, List<String>> domains = sourceDomainsByArticle(
                found.getContent().stream().map(AiNewsArticle::getId).toList());
        return found.map(article -> AiNewsDtos.ArticleSummaryResponse.from(
                article, domains.getOrDefault(article.getId(), List.of())));
    }

    /** 목록 한 페이지분 출처 도메인을 한 번에 읽어 원고별로 묶는다(N+1 방지). */
    private Map<Long, List<String>> sourceDomainsByArticle(List<Long> articleIds) {
        if (articleIds.isEmpty()) return Map.of();
        return articleRepository.findSourceDomainsByArticleIdIn(articleIds).stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        AiNewsArticleRepository.ArticleSourceDomain::getArticleId,
                        LinkedHashMap::new,
                        java.util.stream.Collectors.mapping(
                                AiNewsArticleRepository.ArticleSourceDomain::getDomain,
                                java.util.stream.Collectors.toList())));
    }

    @Transactional(readOnly = true)
    public AiNewsDtos.ArticleDetailResponse detail(Long id) {
        return AiNewsDtos.ArticleDetailResponse.from(findArticleDetail(id));
    }

    @Transactional(readOnly = true)
    public long pendingCount() {
        return articleRepository.countByStatus(AiNewsArticleStatus.PENDING_REVIEW);
    }

    /**
     * 크롤러가 물어온 소재를 저장한다. <b>본문은 비어 있다</b> — 제목·요약·근거만 담고
     * 기사는 관리자가 직접 쓴다. 발행도 관리자 몫이라 여기서 발행하지 않는다.
     */
    @Transactional
    public AiNewsDtos.LeadIngestResponse ingestLead(AiNewsDtos.LeadIngestRequest request) {
        String canonicalUrlHash = hasText(request.canonicalUrlHash())
                ? request.canonicalUrlHash().trim().toLowerCase(Locale.ROOT) : null;
        Optional<AiNewsArticle> duplicate = findDuplicateLead(
                request.dedupeKey(), canonicalUrlHash, request.sources());
        if (duplicate.isPresent()) {
            AiNewsArticle existing = duplicate.get();
            mergeNewSources(existing, request.sources());
            if (existing.getStatus() == AiNewsArticleStatus.PUBLISHED) {
                existing.markUpdateAvailable();
            }
            return AiNewsDtos.LeadIngestResponse.of(false, existing);
        }

        AiNewsArticle article = AiNewsArticle.builder()
                .articleType(AiNewsArticleType.RELEASE_NEWS)
                .status(AiNewsArticleStatus.PENDING_REVIEW)
                .category(request.category())
                .title(request.title().trim())
                // 본문은 관리자가 쓴다. 컬럼이 not null 이라 빈 문자열로 둔다.
                .content("")
                .leadSummary(trimToNull(request.leadSummary()))
                .confidenceScore(request.confidenceScore() != null ? request.confidenceScore() : BigDecimal.ZERO)
                .canonicalUrlHash(canonicalUrlHash)
                .dedupeKey(request.dedupeKey().trim())
                .prefixId(resolveDefaultPrefixId(null))
                .modelName(trimToNull(request.modelName()))
                .hashtags(new ArrayList<>())
                .build();

        addResolvedSources(article, request.sources());
        try {
            articleRepository.saveAndFlush(article);
        } catch (DataIntegrityViolationException e) {
            throw new CustomException(ErrorCode.AI_NEWS_DUPLICATE);
        }
        return AiNewsDtos.LeadIngestResponse.of(true, article);
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
                .content(request.content())
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey(dedupeKey)
                .topic(topic)
                .prefixId(resolveDefaultPrefixId(request.prefixId()))
                .pinned(Boolean.TRUE.equals(request.pinned()))
                .hashtags(new ArrayList<>(HashtagNormalizer.normalize(request.hashtags())))
                .build();
        addResolvedSources(article, request.sources());
        articleRepository.save(article);
        log(actorId, article.getId(), "AI 소식 원고 수동 작성", request.title());
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
                Boolean.TRUE.equals(request.pinned()), hashtags);
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
        // AI 가 물어온 소재는 본문이 비어 있다. 관리자가 기사를 쓰기 전에 발행되면 빈 공지가 나간다.
        if (!hasText(article.getContent())) {
            throw new CustomException(ErrorCode.AI_NEWS_EMPTY_CONTENT);
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
        if (!hasText(article.getContent())) {
            throw new CustomException(ErrorCode.AI_NEWS_EMPTY_CONTENT);
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
        if (article.getTopic() != null) article.getTopic().markPlanned();
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
        if (article.getTopic() != null) article.getTopic().markPlanned();
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

    private void clearArticleHashtagsBeforeReplacement(AiNewsArticle article, List<String> hashtags) {
        if (article.getHashtags().equals(hashtags)) return;
        article.replaceHashtags(List.of());
        articleRepository.flush();
    }

    @Transactional(readOnly = true)
    public Page<AiNewsDtos.SourceConfigResponse> sourceConfigs(AiNewsSourceCrawlStatus crawlStatus, Boolean enabled,
                                                                Boolean autoDiscovered, String keyword,
                                                                int page, int size) {
        return sourceConfigRepository.search(crawlStatus, enabled, autoDiscovered, likeKeyword(keyword),
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
                .enabled(request.enabled() == null || request.enabled())
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
        source.update(request.sourceName().trim(), sourceUrl, scope.domain, scope.pathPrefix,
                request.enabled() == null || request.enabled());
        log(actorId, source.getId(), "AI 소식 출처 수정",
                new SourceScope(source.getDomain(), source.getPathPrefix()).display());
        return AiNewsDtos.SourceConfigResponse.from(source);
    }

    /**
     * 출처는 그냥 지운다. 자동 등록이 없어져 되살아날 경로가 없다
     * (예전에는 자동 등록이 삭제를 되돌려서 차단으로 남겨야 했다).
     */
    @Transactional
    public void deleteSourceConfig(Long id, Long actorId) {
        AiNewsSourceConfig source = sourceConfigRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_SOURCE_NOT_FOUND));
        sourceConfigRepository.delete(source);
        log(actorId, id, "AI 소식 출처 삭제", source.getDomain());
    }

    /** 자동 등록 시절에 쌓인 출처를 관리자가 한 번에 정리하기 위한 일괄 삭제. */
    @Transactional
    public int deleteSourceConfigs(List<Long> ids, Long actorId) {
        if (ids == null || ids.isEmpty()) return 0;
        List<AiNewsSourceConfig> targets = sourceConfigRepository.findAllById(ids);
        if (targets.isEmpty()) return 0;
        sourceConfigRepository.deleteAll(targets);
        log(actorId, null, "AI 소식 출처 일괄 삭제",
                targets.size() + "건: " + targets.stream().map(AiNewsSourceConfig::getDomain)
                        .collect(java.util.stream.Collectors.joining(", ")));
        return targets.size();
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
        AiNewsTopic topic = topicRepository.save(AiNewsTopic.builder()
                .title(request.title().trim())
                .category(request.category())
                .memo(trimToNull(request.memo()))
                .status(request.status() != null ? request.status() : AiNewsTopicStatus.PLANNED)
                .build());
        log(actorId, topic.getId(), "정보 글 쓸 거리 추가", topic.getTitle());
        return AiNewsDtos.TopicResponse.from(topic);
    }

    @Transactional
    public AiNewsDtos.TopicResponse updateTopic(Long id, AiNewsDtos.TopicUpsertRequest request, Long actorId) {
        AiNewsTopic topic = topicRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.AI_NEWS_TOPIC_NOT_FOUND));
        topic.update(request.title().trim(), request.category(), trimToNull(request.memo()),
                request.status() != null ? request.status() : topic.getStatus());
        log(actorId, topic.getId(), "정보 글 쓸 거리 수정", topic.getTitle());
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
        log(actorId, id, "정보 글 쓸 거리 삭제", topic.getTitle());
    }

    /** 쓸 거리 일괄 정리. 이미 글이 붙은 항목은 지우지 않고 건너뛴 수만 돌려준다. */
    @Transactional
    public AiNewsDtos.BulkDeleteResponse deleteTopics(List<Long> ids, Long actorId) {
        if (ids == null || ids.isEmpty()) return new AiNewsDtos.BulkDeleteResponse(0, 0);
        List<AiNewsTopic> targets = topicRepository.findAllById(ids);
        List<AiNewsTopic> deletable = targets.stream()
                .filter(topic -> !articleRepository.existsByTopicId(topic.getId()))
                .toList();
        if (!deletable.isEmpty()) {
            topicRepository.deleteAll(deletable);
            log(actorId, null, "정보 글 쓸 거리 일괄 삭제",
                    deletable.size() + "건: " + deletable.stream().map(AiNewsTopic::getTitle)
                            .collect(java.util.stream.Collectors.joining(", ")));
        }
        return new AiNewsDtos.BulkDeleteResponse(deletable.size(), targets.size() - deletable.size());
    }

    @Transactional(readOnly = true)
    public AiNewsDtos.InternalConfigResponse internalConfig() {
        LocalDateTime now = LocalDateTime.now(SERVICE_ZONE);
        AiNewsSettings settings = getSettingsEntity();
        LocalDateTime lastRun = runRepository.findFirstByOrderByStartedAtDesc()
                .map(AiNewsRun::getStartedAt).orElse(null);
        return new AiNewsDtos.InternalConfigResponse(
                AiNewsDtos.SettingsResponse.from(settings), usageSummary(),
                sourceConfigRepository.findByEnabledTrueOrderBySourceNameAsc().stream()
                        .map(AiNewsDtos.SourceConfigResponse::from).toList(),
                articleRepository.countCreatedSince(
                        AiNewsArticleType.RELEASE_NEWS, now.toLocalDate().atStartOfDay()),
                lastRun == null || lastRun.isBefore(lastScheduledAt(settings, now)),
                nextCollectionAt(settings, now));
    }

    /**
     * 지금까지 지나온 예정 시각 중 가장 최근 것. 마지막 실행이 이보다 앞서면 이번 차례를 아직 안 돈 것이다.
     *
     * <p>오늘 지난 예정 시각이 하나도 없으면 <b>어제의 마지막 예정 시각</b>을 쓴다. 그래야 자정을 넘겨
     * 처음 도는 실행이 "어제 18시 차례를 이미 돌았는지"를 제대로 판단한다.
     */
    static LocalDateTime lastScheduledAt(AiNewsSettings settings, LocalDateTime now) {
        List<Integer> hours = parseCollectionHours(settings.getCollectionHours());
        LocalDateTime found = null;
        for (int hour : hours) {
            LocalDateTime candidate = now.toLocalDate().atTime(hour, 0);
            if (!candidate.isAfter(now)) found = candidate;
        }
        return found != null
                ? found
                : now.toLocalDate().minusDays(1).atTime(hours.get(hours.size() - 1), 0);
    }

    /** 지금 이후 가장 이른 예정 시각. 관리자 화면의 '다음 수집 예정'이 이 값이다. */
    static LocalDateTime nextCollectionAt(AiNewsSettings settings, LocalDateTime now) {
        List<Integer> hours = parseCollectionHours(settings.getCollectionHours());
        for (int hour : hours) {
            LocalDateTime candidate = now.toLocalDate().atTime(hour, 0);
            if (candidate.isAfter(now)) return candidate;
        }
        return now.toLocalDate().plusDays(1).atTime(hours.get(0), 0);
    }

    /**
     * {@code "9,18"} 을 정렬·중복 제거한 시각 목록으로 바꾼다.
     *
     * <p>간격(시간)이 아니라 시각인 이유는 "하루 두 번, 09시와 18시" 가 고정 간격으로 표현되지 않기
     * 때문이다 — 09→18 은 9시간, 18→09 는 15시간이다.
     */
    static List<Integer> parseCollectionHours(String value) {
        if (!hasText(value)) throw new CustomException(ErrorCode.INVALID_INPUT);
        SortedSet<Integer> hours = new TreeSet<>();
        for (String token : value.split(",")) {
            String trimmed = token.trim();
            if (trimmed.isEmpty()) continue;
            try {
                int hour = Integer.parseInt(trimmed);
                if (hour < 0 || hour > 23) throw new CustomException(ErrorCode.INVALID_INPUT);
                hours.add(hour);
            } catch (NumberFormatException e) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
        }
        if (hours.isEmpty()) throw new CustomException(ErrorCode.INVALID_INPUT);
        return List.copyOf(hours);
    }

    private static String normalizeCollectionHours(String value) {
        return parseCollectionHours(value).stream().map(String::valueOf)
                .collect(java.util.stream.Collectors.joining(","));
    }

    @Transactional(readOnly = true)
    public AiNewsDtos.DedupeCheckResponse checkDuplicate(String dedupeKey, String canonicalUrlHash) {
        Optional<AiNewsArticle> found = articleRepository.findByDedupeKey(dedupeKey);
        if (found.isEmpty() && hasText(canonicalUrlHash)) {
            found = articleRepository.findFirstByCanonicalUrlHash(canonicalUrlHash.trim().toLowerCase(Locale.ROOT));
        }
        return found.map(a -> new AiNewsDtos.DedupeCheckResponse(true, a.getId(), a.getStatus(), a.getDedupeKey()))
                .orElseGet(() -> new AiNewsDtos.DedupeCheckResponse(false, null, null, null));
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
        settings.update(request.automationEnabled(),
                normalizeCollectionHours(request.collectionHours()), request.recentWindowDays(),
                request.dailyReleaseLimit(), budget, tokenLimit,
                request.whiskyRatio(), request.wineRatio(), request.cognacRatio());
        log(actorId, AiNewsSettings.SINGLETON_ID, "AI 소식 설정 변경", null);
        return AiNewsDtos.SettingsResponse.from(settings);
    }

    @Transactional(readOnly = true)
    public AiNewsDtos.UsageSummaryResponse usageSummary() {
        LocalDateTime monthStart = LocalDate.now(SERVICE_ZONE)
                .with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay();
        AiNewsSettings settings = getSettingsEntity();
        return new AiNewsDtos.UsageSummaryResponse(
                usageRepository.sumInputTokensSince(monthStart),
                usageRepository.sumOutputTokensSince(monthStart),
                Optional.ofNullable(usageRepository.sumEstimatedCostSince(monthStart)).orElse(BigDecimal.ZERO),
                settings.getOpenaiMonthlyBudgetUsd(),
                settings.getOpenaiMonthlyTokenLimit());
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
                // 수집 차례 판정이 이 값을 기준으로 하므로, 같은 서비스의 다른 시각 계산과 시계를 맞춘다.
                .startedAt(LocalDateTime.now(SERVICE_ZONE))
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

    @Transactional(readOnly = true)
    public Page<AiNewsDtos.RunResponse> runs(int page, int size) {
        return runRepository.findAllByOrderByStartedAtDesc(
                        PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size))))
                .map(AiNewsDtos.RunResponse::from);
    }

    /**
     * 같은 사건을 이미 잡았는지 본다. 본문에 기대지 않는다 — 소재에는 본문이 없다.
     *
     * <p>① AI 가 만든 안정 키(dedupeKey) ② 첫 근거 URL 의 정규화 해시 ③ 근거 URL 이 겹치는 기존 글.
     * ③ 이 있어야 서로 다른 매체가 같은 사건을 다룬 경우를 잡는다.
     */
    private Optional<AiNewsArticle> findDuplicateLead(String dedupeKey, String canonicalUrlHash,
                                                      List<AiNewsDtos.SourceEvidenceRequest> sources) {
        Optional<AiNewsArticle> duplicate = articleRepository.findByDedupeKey(dedupeKey.trim());
        if (duplicate.isEmpty() && hasText(canonicalUrlHash)) {
            duplicate = articleRepository.findFirstByCanonicalUrlHash(canonicalUrlHash);
        }
        if (duplicate.isEmpty() && sources != null && !sources.isEmpty()) {
            List<String> canonicalUrls = sources.stream()
                    .map(source -> normalizeCanonicalUrl(source.canonicalUrl()))
                    .filter(AiNewsService::hasText)
                    .toList();
            if (!canonicalUrls.isEmpty()) {
                duplicate = articleRepository.findFirstByArticleTypeAndSourcesCanonicalUrlInOrderByCreatedAtAsc(
                        AiNewsArticleType.RELEASE_NEWS, canonicalUrls);
            }
        }
        return duplicate;
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

    private void addResolvedSources(AiNewsArticle article,
                                    List<AiNewsDtos.SourceEvidenceRequest> sources) {
        if (sources == null) return;
        // 근거 테이블의 유니크 제약이 (article_id, domain) 이다. 예전에는 도메인+등록 경로로 걸렀는데,
        // 그러면 같은 도메인의 다른 경로 두 건이 통과했다가 저장에서 DataIntegrityViolation 으로 터졌다.
        // 기사 단위로 수집하면서 같은 매체의 기사가 여러 건 올라오므로 실제로 자주 걸린다.
        Set<String> domains = new HashSet<>();
        for (AiNewsDtos.SourceEvidenceRequest source : sources) {
            String domain = verifiedSourceDomain(source.sourceUrl(), source.domain());
            if (!domains.add(domain)) continue;
            article.addSource(AiNewsArticleSource.builder()
                    .sourceUrl(source.sourceUrl().trim())
                    .canonicalUrl(normalizeCanonicalUrl(source.canonicalUrl()))
                    .domain(domain)
                    .sourceTitle(trimToNull(source.sourceTitle()))
                    .evidenceSummary(trimToNull(source.evidenceSummary()))
                    .contentHash(trimToNull(source.contentHash()))
                    .publishedAt(source.publishedAt())
                    .retrievedAt(source.retrievedAt() != null ? source.retrievedAt() : LocalDateTime.now())
                    .build());
        }
    }

    private void mergeNewSources(AiNewsArticle article, List<AiNewsDtos.SourceEvidenceRequest> sources) {
        if (sources == null || sources.isEmpty()) return;
        Set<String> existing = article.getSources().stream()
                .map(AiNewsArticleSource::getDomain)
                .collect(java.util.stream.Collectors.toSet());
        for (AiNewsDtos.SourceEvidenceRequest source : sources) {
            String domain = verifiedSourceDomain(source.sourceUrl(), source.domain());
            if (existing.contains(domain)) continue;
            article.addSource(AiNewsArticleSource.builder()
                    .sourceUrl(source.sourceUrl().trim()).canonicalUrl(normalizeCanonicalUrl(source.canonicalUrl()))
                    .domain(domain).sourceTitle(trimToNull(source.sourceTitle()))
                    .evidenceSummary(trimToNull(source.evidenceSummary())).contentHash(trimToNull(source.contentHash()))
                    .publishedAt(source.publishedAt())
                    .retrievedAt(source.retrievedAt() != null ? source.retrievedAt() : LocalDateTime.now())
                    .build());
            existing.add(domain);
        }
    }

    /** 관리자 편집 화면의 URL 목록을 반영한다. null은 기존 출처 유지, 빈 목록은 전체 삭제다. */
    private void replaceAdminSourceUrls(AiNewsArticle article, List<String> sourceUrls) {
        if (sourceUrls == null) return;

        Map<String, AdminSourceUrl> requestedByDomain = new LinkedHashMap<>();
        for (String rawUrl : sourceUrls) {
            String canonicalUrl = normalizeAdminSourceUrl(rawUrl);
            String domain = verifiedSourceDomain(canonicalUrl, URI.create(canonicalUrl).getHost());
            if (requestedByDomain.putIfAbsent(domain, new AdminSourceUrl(canonicalUrl, domain)) != null) {
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
                        .retrievedAt(LocalDateTime.now())
                        .build());
            } else if (!requested.url.equals(existing.getCanonicalUrl())) {
                existing.updateUrl(requested.url, requested.url, LocalDateTime.now());
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
     * 근거 URL 이 어느 출처 범위에 속하는지 판정해 중복 판정용 키를 돌려준다.
     * <b>행을 만들지 않는다</b> — 판정 전용이다.
     *
     * <p>출처 목록은 관리자가 등록한 허용목록이다. 예전에는 처음 보는 도메인마다 여기서 행을 만들어
     * 목록이 끝없이 불어났고(주류와 무관한 도메인 포함), 그걸 사후에 차단으로 걷어내야 했다.
     * 미등록 도메인은 도메인 전체를 한 범위로 보고, 근거 이력은 {@code ai_news_article_sources} 에만
     * 남는다 — 공개 글 하단 출처 표시에 필요한 정보는 그쪽이 이미 전부 갖고 있다.
     */
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

    private record AdminSourceUrl(String url, String domain) {}
}
