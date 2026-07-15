package com.caskbycask.domain.ainews.service;

import com.caskbycask.admin.service.AdminLogService;
import com.caskbycask.domain.ainews.dto.AiNewsDtos;
import com.caskbycask.domain.ainews.entity.AiNewsArticle;
import com.caskbycask.domain.ainews.entity.AiNewsArticleSource;
import com.caskbycask.domain.ainews.entity.AiNewsSettings;
import com.caskbycask.domain.ainews.entity.AiNewsSourceConfig;
import com.caskbycask.domain.ainews.entity.AiNewsTopic;
import com.caskbycask.domain.ainews.entity.enums.*;
import com.caskbycask.domain.ainews.repository.*;
import com.caskbycask.domain.community.service.PostImageService;
import com.caskbycask.domain.community.service.PostService;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.domain.user.policy.AccountPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class AiNewsServiceTest {

    @Mock AiNewsSettingsRepository settingsRepository;
    @Mock AiNewsArticleRepository articleRepository;
    @Mock AiNewsTopicRepository topicRepository;
    @Mock AiNewsSourceConfigRepository sourceConfigRepository;
    @Mock AiNewsRunRepository runRepository;
    @Mock AiNewsUsageRepository usageRepository;
    @Mock UserRepository userRepository;
    @Mock ProducerRepository producerRepository;
    @Mock PostService postService;
    @Mock PostImageService postImageService;
    @Mock AdminLogService adminLogService;

    private AiNewsService service;

    @BeforeEach
    void setUp() {
        service = new AiNewsService(settingsRepository, articleRepository, topicRepository,
                sourceConfigRepository, runRepository, usageRepository, userRepository,
                producerRepository, postService, postImageService, adminLogService);
    }

    @Test
    void exactDedupeKeyIsRejectedBeforeImageGeneration() {
        AiNewsArticle existing = AiNewsArticle.builder()
                .id(11L)
                .articleType(AiNewsArticleType.RELEASE_NEWS)
                .status(AiNewsArticleStatus.PUBLISHED)
                .category(AiNewsCategory.WHISKY)
                .title("기존 출시 소식")
                .content("<p>본문</p>")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey("release:test")
                .build();
        given(articleRepository.findByDedupeKey("release:test")).willReturn(Optional.of(existing));

        AiNewsDtos.DedupeCheckResponse result = service.checkDuplicate(
                "release:test", null, null, AiNewsArticleType.RELEASE_NEWS);

        assertThat(result.duplicate()).isTrue();
        assertThat(result.status()).isEqualTo(AiNewsArticleStatus.PUBLISHED);
    }

    @Test
    void futurePublishTimeSchedulesArticleWithoutCreatingCommunityPost() {
        AiNewsArticle article = AiNewsArticle.builder()
                .id(21L)
                .articleType(AiNewsArticleType.TIP_INFO)
                .status(AiNewsArticleStatus.PENDING_REVIEW)
                .category(AiNewsCategory.WHISKY)
                .title("예약 원고")
                .content("<p>본문</p>")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey("tip:scheduled")
                .build();
        given(articleRepository.findForPublishById(21L)).willReturn(Optional.of(article));
        LocalDateTime scheduledAt = LocalDateTime.now().plusDays(1).withSecond(0).withNano(0);

        AiNewsDtos.ArticleDetailResponse result = service.publish(21L, scheduledAt, null);

        assertThat(result.status()).isEqualTo(AiNewsArticleStatus.SCHEDULED);
        assertThat(result.scheduledAt()).isEqualTo(scheduledAt);
        assertThat(result.publishedAt()).isNull();
        verifyNoInteractions(postService);
    }

    @Test
    void scheduledArticleCanReturnToReviewQueue() {
        LocalDateTime scheduledAt = LocalDateTime.now().plusDays(1).withSecond(0).withNano(0);
        AiNewsArticle article = AiNewsArticle.builder()
                .id(22L)
                .articleType(AiNewsArticleType.TIP_INFO)
                .status(AiNewsArticleStatus.SCHEDULED)
                .scheduledAt(scheduledAt)
                .category(AiNewsCategory.WHISKY)
                .title("예약 취소 원고")
                .content("<p>본문</p>")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey("tip:cancel-scheduled")
                .build();
        given(articleRepository.findForPublishById(22L)).willReturn(Optional.of(article));

        AiNewsDtos.ArticleDetailResponse result = service.cancelSchedule(22L, null);

        assertThat(result.status()).isEqualTo(AiNewsArticleStatus.PENDING_REVIEW);
        assertThat(result.scheduledAt()).isNull();
        verifyNoInteractions(postService);
    }

    @Test
    void adminUpdateReplacesAndNormalizesPublicSourceUrls() {
        AiNewsArticle article = AiNewsArticle.builder()
                .id(12L)
                .articleType(AiNewsArticleType.RELEASE_NEWS)
                .status(AiNewsArticleStatus.DRAFT)
                .category(AiNewsCategory.WHISKY)
                .title("출시 소식")
                .content("<p>본문</p>")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey("release:source-edit")
                .build();
        article.addSource(AiNewsArticleSource.builder()
                .sourceUrl("https://example.com/original")
                .canonicalUrl("https://example.com/original")
                .domain("example.com")
                .sourceTitle("기존 근거")
                .sourceType(AiNewsSourceType.TRUSTED_MEDIA)
                .evidenceSummary("보존할 근거")
                .retrievedAt(LocalDateTime.now())
                .build());
        article.addSource(AiNewsArticleSource.builder()
                .sourceUrl("https://removed.example/news")
                .canonicalUrl("https://removed.example/news")
                .domain("removed.example")
                .sourceType(AiNewsSourceType.UNAPPROVED)
                .retrievedAt(LocalDateTime.now())
                .build());

        given(articleRepository.findDetailById(12L)).willReturn(Optional.of(article));
        given(sourceConfigRepository.findByDomain("example.com")).willReturn(List.of(
                AiNewsSourceConfig.builder()
                        .sourceName("전문 매체").sourceUrl("https://example.com")
                        .domain("example.com").sourceType(AiNewsSourceType.TRUSTED_MEDIA).build()));
        given(sourceConfigRepository.findByDomain("new.example")).willReturn(List.of(
                AiNewsSourceConfig.builder()
                        .sourceName("공식 사이트").sourceUrl("https://new.example")
                        .domain("new.example").sourceType(AiNewsSourceType.OFFICIAL).build()));

        AiNewsDtos.ArticleDetailResponse result = service.updateArticle(12L,
                new AiNewsDtos.ArticleAdminUpdateRequest(
                        AiNewsCategory.WHISKY, "수정된 출시 소식", "<p>수정 본문</p>",
                        null, false, BigDecimal.ONE, null,
                        List.of("https://example.com/original",
                                "https://www.new.example/news?utm_source=test&id=2#section")),
                null);

        assertThat(result.sources()).extracting(AiNewsDtos.SourceResponse::canonicalUrl)
                .containsExactly("https://example.com/original", "https://new.example/news?id=2");
        assertThat(result.sources()).extracting(AiNewsDtos.SourceResponse::domain)
                .doesNotContain("removed.example");
        assertThat(result.sources().getFirst().evidenceSummary()).isEqualTo("보존할 근거");
    }

    @Test
    void normalizedCanonicalUrlHashAlsoBlocksDuplicateRelease() {
        AiNewsArticle existing = AiNewsArticle.builder()
                .id(12L)
                .articleType(AiNewsArticleType.RELEASE_NEWS)
                .status(AiNewsArticleStatus.PUBLISHED)
                .category(AiNewsCategory.WHISKY)
                .title("기존 출시 소식")
                .content("<p>본문</p>")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey("release:existing")
                .canonicalUrlHash("abc123")
                .build();
        given(articleRepository.findByDedupeKey("release:changed-key")).willReturn(Optional.empty());
        given(articleRepository.findFirstByCanonicalUrlHash("abc123")).willReturn(Optional.of(existing));

        AiNewsDtos.DedupeCheckResponse result = service.checkDuplicate(
                "release:changed-key", "ABC123", null, AiNewsArticleType.RELEASE_NEWS);

        assertThat(result.duplicate()).isTrue();
        assertThat(result.articleId()).isEqualTo(existing.getId());
    }

    @Test
    void topicAliasCannotReusePublishedTopicMeaning() {
        AiNewsTopic existing = AiNewsTopic.builder()
                .id(7L)
                .title("셰리 캐스크란?")
                .normalizedKey("what-is-sherry-cask")
                .aliases("셰리 캐스크,셰리 숙성")
                .category(AiNewsCategory.WHISKY)
                .status(AiNewsTopicStatus.COMPLETED)
                .build();
        given(topicRepository.existsByNormalizedKey("sherry-seasoned-cask-guide")).willReturn(false);
        given(topicRepository.findAll()).willReturn(List.of(existing));
        AiNewsDtos.TopicUpsertRequest request = new AiNewsDtos.TopicUpsertRequest(
                "셰리 시즈닝 캐스크 안내", "sherry-seasoned-cask-guide", "셰리 캐스크",
                AiNewsCategory.WHISKY, AiNewsTopicStatus.READY, false, true);

        assertThatThrownBy(() -> service.createTopic(request, null))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void aiSystemNicknameIsReservedForSignupAndProfileChanges() {
        assertThat(AccountPolicy.isReservedNickname("관리자(AI)")).isTrue();
    }

    @Test
    void tipIsDueOnlyAfterConfiguredInterval() {
        AiNewsSettings settings = defaultSettings();
        LocalDateTime lastPublished = LocalDateTime.now().minusHours(47);
        given(settingsRepository.findById(AiNewsSettings.SINGLETON_ID)).willReturn(Optional.of(settings));
        given(articleRepository.findLastSuccessfulPublishedAt(AiNewsArticleType.TIP_INFO))
                .willReturn(lastPublished);
        given(articleRepository.countSuccessfulPublicationsSince(
                org.mockito.ArgumentMatchers.eq(AiNewsArticleType.RELEASE_NEWS),
                org.mockito.ArgumentMatchers.any())).willReturn(0L);
        given(sourceConfigRepository.findByEnabledTrueOrderBySourceNameAsc()).willReturn(List.of());
        given(topicRepository.findByStatusOrderByCreatedAtAsc(AiNewsTopicStatus.READY)).willReturn(List.of());
        given(topicRepository.findAll()).willReturn(List.of());
        given(usageRepository.sumEstimatedCostSince(org.mockito.ArgumentMatchers.any())).willReturn(BigDecimal.ZERO);

        AiNewsDtos.InternalConfigResponse config = service.internalConfig();

        assertThat(config.tipDue()).isFalse();
        verify(articleRepository).findByArticleTypeAndStatusInOrderByCreatedAtAsc(
                AiNewsArticleType.TIP_INFO, List.of(AiNewsArticleStatus.PUBLISHED));
    }

    @Test
    void categoryRatiosMustSumToOneHundred() {
        AiNewsDtos.SettingsUpdateRequest request = new AiNewsDtos.SettingsUpdateRequest(
                false, false, true, 3, 48, new BigDecimal("0.9"), 900,
                null, null, null, 60, 30, 30);

        assertThatThrownBy(() -> service.updateSettings(request, 1L))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void accountUrlIsStoredAsDomainAndPathScope() {
        given(sourceConfigRepository.existsByDomainAndPathPrefix("instagram.com", "/metabevkorea"))
                .willReturn(false);
        given(sourceConfigRepository.save(any(AiNewsSourceConfig.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        AiNewsDtos.SourceConfigUpsertRequest request = new AiNewsDtos.SourceConfigUpsertRequest(
                "메타베브코리아 공식 인스타그램",
                "https://www.instagram.com/metabevkorea/",
                AiNewsSourceType.OFFICIAL,
                true, false, false);

        AiNewsDtos.SourceConfigResponse result = service.createSourceConfig(request, null);

        assertThat(result.domain()).isEqualTo("instagram.com");
        assertThat(result.pathPrefix()).isEqualTo("/metabevkorea");
        assertThat(result.sourceUrl()).isEqualTo("https://www.instagram.com/metabevkorea");
    }

    @Test
    void sameDomainCanHaveDifferentAccountScopes() {
        given(sourceConfigRepository.existsByDomainAndPathPrefix("instagram.com", "/another_account"))
                .willReturn(false);
        given(sourceConfigRepository.save(any(AiNewsSourceConfig.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        AiNewsDtos.SourceConfigUpsertRequest request = new AiNewsDtos.SourceConfigUpsertRequest(
                "다른 공식 계정", "https://instagram.com/another_account",
                AiNewsSourceType.OFFICIAL, true, false, false);

        AiNewsDtos.SourceConfigResponse result = service.createSourceConfig(request, null);

        assertThat(result.pathPrefix()).isEqualTo("/another_account");
    }

    @Test
    void wwwSubdomainIsPreservedInRegisteredSourceUrl() {
        given(sourceConfigRepository.existsByDomainAndPathPrefix(
                "wine21.com", "/11_news/news_list.html"))
                .willReturn(false);
        given(sourceConfigRepository.save(any(AiNewsSourceConfig.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        AiNewsDtos.SourceConfigUpsertRequest request = new AiNewsDtos.SourceConfigUpsertRequest(
                "Wine21", "https://www.wine21.com/11_news/news_list.html",
                AiNewsSourceType.TRUSTED_MEDIA, true, false, false);

        AiNewsDtos.SourceConfigResponse result = service.createSourceConfig(request, null);

        assertThat(result.domain()).isEqualTo("wine21.com");
        assertThat(result.pathPrefix()).isEqualTo("/11_news/news_list.html");
        assertThat(result.sourceUrl()).isEqualTo("https://www.wine21.com/11_news/news_list.html");
    }

    @Test
    void accountScopeWinsOnlyForTheMatchingAccountPath() {
        AiNewsSourceConfig domainRule = AiNewsSourceConfig.builder()
                .sourceName("인스타그램 기본").sourceUrl("https://instagram.com")
                .domain("instagram.com").pathPrefix("")
                .sourceType(AiNewsSourceType.UNAPPROVED).build();
        AiNewsSourceConfig accountRule = AiNewsSourceConfig.builder()
                .sourceName("메타베브코리아").sourceUrl("https://instagram.com/metabevkorea")
                .domain("instagram.com").pathPrefix("/metabevkorea")
                .sourceType(AiNewsSourceType.OFFICIAL).build();

        AiNewsSourceConfig matching = AiNewsService.findBestSourceConfig(
                List.of(domainRule, accountRule), "/metabevkorea/news");
        AiNewsSourceConfig other = AiNewsService.findBestSourceConfig(
                List.of(domainRule, accountRule), "/another_account");

        assertThat(matching).isSameAs(accountRule);
        assertThat(other).isSameAs(domainRule);
    }

    @Test
    void crawlerErrorIsStoredWithCheckedTimeAndMessage() {
        AiNewsSourceConfig source = AiNewsSourceConfig.builder()
                .id(3L).sourceName("공식 뉴스룸").sourceUrl("https://example.com/news")
                .domain("example.com").pathPrefix("/news").sourceType(AiNewsSourceType.OFFICIAL)
                .build();
        given(sourceConfigRepository.findById(3L)).willReturn(Optional.of(source));
        LocalDateTime checkedAt = LocalDateTime.of(2026, 7, 13, 12, 30);

        service.recordSourceCrawlResult(3L, new AiNewsDtos.SourceCrawlResultRequest(
                AiNewsSourceCrawlStatus.ERROR, "HTTP 403", checkedAt));

        assertThat(source.getCrawlStatus()).isEqualTo(AiNewsSourceCrawlStatus.ERROR);
        assertThat(source.getLastCrawledAt()).isEqualTo(checkedAt);
        assertThat(source.getLastCrawlError()).isEqualTo("HTTP 403");
    }

    @Test
    void topicWithArticleHistoryCannotBeDeleted() {
        AiNewsTopic topic = AiNewsTopic.builder()
                .id(7L)
                .title("셰리 캐스크란?")
                .normalizedKey("what-is-sherry-cask")
                .category(AiNewsCategory.WHISKY)
                .status(AiNewsTopicStatus.COMPLETED)
                .build();
        given(topicRepository.findById(7L)).willReturn(Optional.of(topic));
        given(articleRepository.existsByTopicId(7L)).willReturn(true);

        assertThatThrownBy(() -> service.deleteTopic(7L, 1L))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void deletedArticleCanBeQueuedAndCompletedForRewrite() {
        AiNewsArticle article = AiNewsArticle.builder()
                .id(21L)
                .articleType(AiNewsArticleType.TIP_INFO)
                .status(AiNewsArticleStatus.DELETED)
                .category(AiNewsCategory.WHISKY)
                .title("기존 제목")
                .content("<p>기존 본문</p>")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey("tip:rewrite-test")
                .build();
        given(articleRepository.findDetailById(21L)).willReturn(Optional.of(article));

        service.requestRewrite(21L, new AiNewsDtos.RewriteRequest("초보자 예시를 보강해주세요."), 1L);

        assertThat(article.getStatus()).isEqualTo(AiNewsArticleStatus.REWRITE_REQUESTED);
        assertThat(article.getRewritePrompt()).isEqualTo("초보자 예시를 보강해주세요.");

        service.completeRewrite(21L, new AiNewsDtos.RewriteResultRequest(
                "개선된 제목", "<p>개선된 본문</p>", new BigDecimal("0.95"), "개선 지문", "writer-model"));

        assertThat(article.getStatus()).isEqualTo(AiNewsArticleStatus.PENDING_REVIEW);
        assertThat(article.getTitle()).isEqualTo("개선된 제목");
        assertThat(article.getRewritePrompt()).isNull();
    }

    private AiNewsSettings defaultSettings() {
        return AiNewsSettings.builder()
                .id(1L)
                .automationEnabled(false)
                .autoPublishEnabled(false)
                .dryRun(true)
                .dailyReleaseLimit(3)
                .tipIntervalHours(48)
                .confidenceThreshold(new BigDecimal("0.9"))
                .tavilyMonthlyCreditLimit(900)
                .whiskyRatio(60)
                .wineRatio(20)
                .cognacRatio(20)
                .build();
    }
}
