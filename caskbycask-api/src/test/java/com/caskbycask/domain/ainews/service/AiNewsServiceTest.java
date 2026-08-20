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
import com.caskbycask.domain.community.entity.PostPrefix;
import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.repository.PostPrefixRepository;
import com.caskbycask.domain.community.service.PostService;
import com.caskbycask.domain.social.dto.SocialPublishSelection;
import com.caskbycask.domain.social.entity.enums.SocialMediaMode;
import com.caskbycask.domain.social.service.SocialPublishRequestService;
import com.caskbycask.domain.user.entity.User;
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
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
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
    @Mock PostService postService;
    @Mock PostPrefixRepository postPrefixRepository;
    @Mock AdminLogService adminLogService;
    @Mock SocialPublishRequestService socialPublishRequestService;

    private AiNewsService service;

    @BeforeEach
    void setUp() {
        service = new AiNewsService(settingsRepository, articleRepository, topicRepository,
                sourceConfigRepository, runRepository, usageRepository, userRepository,
                postService, postPrefixRepository, adminLogService,
                socialPublishRequestService);
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

        AiNewsDtos.DedupeCheckResponse result = service.checkDuplicate("release:test", null);

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
    void publishedArticleCanRequestFirstSocialPublicationWithoutRepublishingCommunityPost() {
        AiNewsArticle article = AiNewsArticle.builder()
                .id(24L)
                .articleType(AiNewsArticleType.TIP_INFO)
                .status(AiNewsArticleStatus.PUBLISHED)
                .category(AiNewsCategory.WHISKY)
                .title("기존 발행 소식")
                .content("<p>본문</p>")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey("tip:published-social")
                .postId(91L)
                .publishedAt(LocalDateTime.now().minusDays(1))
                .build();
        User requester = User.builder().email("admin@example.com").nickname("관리자").build();
        SocialPublishSelection selection = new SocialPublishSelection(
                false, true, true, "2026-07-24", "ko",
                SocialMediaMode.DIRECT_UPLOAD, null, null, "/api/social/images/news.webp");
        given(articleRepository.findForPublishById(24L)).willReturn(Optional.of(article));
        given(userRepository.getByIdOrThrow(7L)).willReturn(requester);

        AiNewsDtos.ArticleDetailResponse result = service.publish(24L, null, selection, 7L);

        assertThat(result.status()).isEqualTo(AiNewsArticleStatus.PUBLISHED);
        verify(socialPublishRequestService)
                .requestPublishedAiArticle(24L, 91L, requester, selection);
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
    void failedScheduledPublishIsRemovedFromAutomaticRetryQueue() {
        LocalDateTime scheduledAt = LocalDateTime.now().minusMinutes(1);
        AiNewsArticle article = AiNewsArticle.builder()
                .id(23L)
                .articleType(AiNewsArticleType.TIP_INFO)
                .status(AiNewsArticleStatus.SCHEDULED)
                .scheduledAt(scheduledAt)
                .category(AiNewsCategory.WHISKY)
                .title("예약 발행 실패 원고")
                .content("<p>본문</p>")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey("tip:failed-scheduled-publish")
                .build();
        given(articleRepository.findForPublishById(23L)).willReturn(Optional.of(article));

        service.failScheduledPublish(23L);

        assertThat(article.getStatus()).isEqualTo(AiNewsArticleStatus.FAILED);
        assertThat(article.getScheduledAt()).isNull();
        assertThat(article.getFailureReason()).contains("직접 다시 발행");
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
        article.replaceHashtags(List.of("신제품", "위스키"));
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
        doAnswer(invocation -> {
            assertThat(article.getHashtags()).isEmpty();
            return null;
        }).when(articleRepository).flush();

        AiNewsDtos.ArticleDetailResponse result = service.updateArticle(12L,
                new AiNewsDtos.ArticleAdminUpdateRequest(
                        AiNewsCategory.WHISKY, "수정된 출시 소식", "<p>수정 본문</p>",
                        null, false, List.of("위스키", "신제품"),
                        List.of("https://example.com/original",
                                "https://www.new.example/news?utm_source=test&id=2#section")),
                null);

        assertThat(result.sources()).extracting(AiNewsDtos.SourceResponse::canonicalUrl)
                .containsExactly("https://example.com/original", "https://new.example/news?id=2");
        assertThat(result.sources()).extracting(AiNewsDtos.SourceResponse::domain)
                .doesNotContain("removed.example");
        assertThat(result.sources().getFirst().evidenceSummary()).isEqualTo("보존할 근거");
        assertThat(result.hashtags()).containsExactly("위스키", "신제품");
        verify(articleRepository).flush();
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

        AiNewsDtos.DedupeCheckResponse result = service.checkDuplicate("release:changed-key", "ABC123");

        assertThat(result.duplicate()).isTrue();
        assertThat(result.articleId()).isEqualTo(existing.getId());
    }

    @Test
    void aiSystemNicknameIsReservedForSignupAndProfileChanges() {
        assertThat(AccountPolicy.isReservedNickname("소식관리자")).isTrue();
    }

    @Test
    void categoryRatiosMustSumToOneHundred() {
        AiNewsDtos.SettingsUpdateRequest request = new AiNewsDtos.SettingsUpdateRequest(
                false, 3, 900, null, null, 60, 30, 30);

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
                true);

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
                AiNewsSourceType.OFFICIAL, true);

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
                AiNewsSourceType.TRUSTED_MEDIA, true);

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
                .category(AiNewsCategory.WHISKY)
                .status(AiNewsTopicStatus.DONE)
                .build();
        given(topicRepository.findById(7L)).willReturn(Optional.of(topic));
        given(articleRepository.existsByTopicId(7L)).willReturn(true);

        assertThatThrownBy(() -> service.deleteTopic(7L, 1L))
                .isInstanceOf(CustomException.class);
    }

    @Test
    void unregisteredEvidenceDomainDoesNotCreateASourceConfigRow() {
        // 출처 목록이 끝없이 불어나던 원인. 미등록 도메인은 등급만 미승인으로 매기고 행은 만들지 않는다.
        AtomicReference<AiNewsArticle> saved = new AtomicReference<>();
        given(articleRepository.findByDedupeKey("release:new-domain")).willReturn(Optional.empty());
        given(sourceConfigRepository.findByDomain("unknown-blog.example")).willReturn(List.of());
        given(articleRepository.saveAndFlush(any(AiNewsArticle.class))).willAnswer(invocation -> {
            AiNewsArticle article = invocation.getArgument(0);
            saved.set(article);
            return article;
        });
        given(articleRepository.findDetailById(null))
                .willAnswer(invocation -> Optional.ofNullable(saved.get()));

        service.ingestLead(new AiNewsDtos.LeadIngestRequest(
                AiNewsCategory.WHISKY, "새 도메인 근거 소식", "요약", "release:new-domain",
                null, new BigDecimal("0.9"), "gemini-test",
                List.of(new AiNewsDtos.SourceEvidenceRequest(
                        "https://unknown-blog.example/post", "https://unknown-blog.example/post",
                        "unknown-blog.example", "낯선 블로그", AiNewsSourceType.UNAPPROVED,
                        null, null, null, null))));

        verify(sourceConfigRepository, never()).save(any(AiNewsSourceConfig.class));
        assertThat(saved.get().getSources()).singleElement()
                .extracting(AiNewsArticleSource::getSourceType)
                .isEqualTo(AiNewsSourceType.UNAPPROVED);
    }

    @Test
    void rejectingATipArticleReturnsItsTopicToPlanned() {
        AiNewsTopic topic = AiNewsTopic.builder()
                .id(5L)
                .title("셰리 캐스크란?")
                .category(AiNewsCategory.WHISKY)
                .status(AiNewsTopicStatus.DONE)
                .build();
        AiNewsArticle article = AiNewsArticle.builder()
                .id(31L)
                .articleType(AiNewsArticleType.TIP_INFO)
                .status(AiNewsArticleStatus.PENDING_REVIEW)
                .category(AiNewsCategory.WHISKY)
                .title("셰리 캐스크")
                .content("<p>본문</p>")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey("tip:what-is-sherry-cask")
                .topic(topic)
                .build();
        given(articleRepository.findDetailById(31L)).willReturn(Optional.of(article));

        service.reject(31L, "다시 쓰자", null);

        assertThat(article.getStatus()).isEqualTo(AiNewsArticleStatus.REJECTED);
        assertThat(topic.getStatus()).isEqualTo(AiNewsTopicStatus.PLANNED);
    }

    @Test
    void ingestedLeadIsStoredWithoutBodyForTheAdminToWrite() {
        PostPrefix general = PostPrefix.builder()
                .id(9L).boardType(BoardType.NOTICE).name("일반").sortOrder(0).build();
        AtomicReference<AiNewsArticle> saved = new AtomicReference<>();
        given(articleRepository.findByDedupeKey("release:balvenie-14-caribbean")).willReturn(Optional.empty());
        given(postPrefixRepository.findFirstByBoardTypeAndNameOrderBySortOrderAscIdAsc(
                BoardType.NOTICE, "일반")).willReturn(Optional.of(general));
        given(sourceConfigRepository.findByDomain("whiskymag.example")).willReturn(List.of());
        given(articleRepository.saveAndFlush(any(AiNewsArticle.class))).willAnswer(invocation -> {
            AiNewsArticle article = invocation.getArgument(0);
            saved.set(article);
            return article;
        });
        given(articleRepository.findDetailById(null))
                .willAnswer(invocation -> Optional.ofNullable(saved.get()));

        AiNewsDtos.ArticleDetailResponse result = service.ingestLead(new AiNewsDtos.LeadIngestRequest(
                AiNewsCategory.WHISKY, "발베니 14년 캐리비안 캐스크 국내 출시",
                "윌리엄그랜트앤선즈코리아가 9월 정식 수입한다고 발표했습니다.",
                "release:balvenie-14-caribbean", null, new BigDecimal("0.9"), "gemini-test",
                List.of(new AiNewsDtos.SourceEvidenceRequest(
                        "https://whiskymag.example/news/1", "https://whiskymag.example/news/1",
                        "whiskymag.example", "Balvenie 14", AiNewsSourceType.TRUSTED_MEDIA,
                        null, null, null, null))));

        assertThat(result.status()).isEqualTo(AiNewsArticleStatus.PENDING_REVIEW);
        // 본문은 관리자가 쓴다. AI 는 제목·요약·근거까지만 만든다.
        assertThat(result.content()).isEmpty();
        assertThat(result.leadSummary()).contains("9월 정식 수입");
        assertThat(result.prefixId()).isEqualTo(9L);
        assertThat(result.sources()).singleElement()
                .extracting(AiNewsDtos.SourceResponse::domain).isEqualTo("whiskymag.example");
    }

    @Test
    void leadWithoutBodyCannotBePublished() {
        AiNewsArticle lead = AiNewsArticle.builder()
                .id(55L)
                .articleType(AiNewsArticleType.RELEASE_NEWS)
                .status(AiNewsArticleStatus.PENDING_REVIEW)
                .category(AiNewsCategory.WHISKY)
                .title("본문 없는 소재")
                .content("")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey("release:empty-body")
                .build();
        given(articleRepository.findForPublishById(55L)).willReturn(Optional.of(lead));

        assertThatThrownBy(() -> service.publish(55L, null))
                .isInstanceOf(CustomException.class);
        assertThat(lead.getStatus()).isEqualTo(AiNewsArticleStatus.PENDING_REVIEW);
    }

    @Test
    void sameEventFromAnotherOutletIsCaughtByASharedSourceUrl() {
        AiNewsArticle existing = AiNewsArticle.builder()
                .id(61L)
                .articleType(AiNewsArticleType.RELEASE_NEWS)
                .status(AiNewsArticleStatus.PENDING_REVIEW)
                .category(AiNewsCategory.WHISKY)
                .title("이미 잡은 소재")
                .content("")
                .confidenceScore(BigDecimal.ONE)
                .dedupeKey("release:already-known")
                .build();
        given(articleRepository.findByDedupeKey("release:other-key")).willReturn(Optional.empty());
        given(articleRepository.findFirstByArticleTypeAndSourcesCanonicalUrlInOrderByCreatedAtAsc(
                org.mockito.ArgumentMatchers.eq(AiNewsArticleType.RELEASE_NEWS),
                org.mockito.ArgumentMatchers.anyList())).willReturn(Optional.of(existing));
        given(articleRepository.findDetailById(61L)).willReturn(Optional.of(existing));

        AiNewsDtos.ArticleDetailResponse result = service.ingestLead(new AiNewsDtos.LeadIngestRequest(
                AiNewsCategory.WHISKY, "다른 매체가 쓴 같은 사건", "요약", "release:other-key",
                null, new BigDecimal("0.9"), "gemini-test",
                List.of(new AiNewsDtos.SourceEvidenceRequest(
                        "https://whiskymag.example/news/1", "https://whiskymag.example/news/1",
                        "whiskymag.example", "같은 근거", AiNewsSourceType.TRUSTED_MEDIA,
                        null, null, null, null))));

        assertThat(result.id()).isEqualTo(61L);
        verify(articleRepository, never()).saveAndFlush(any(AiNewsArticle.class));
    }

    private AiNewsSettings defaultSettings() {
        return AiNewsSettings.builder()
                .id(1L)
                .automationEnabled(false)
                .dailyReleaseLimit(3)
                .tavilyMonthlyCreditLimit(900)
                .whiskyRatio(60)
                .wineRatio(20)
                .cognacRatio(20)
                .build();
    }
}
