package com.caskbycask.domain.ainews.service;

import com.caskbycask.admin.service.AdminLogService;
import com.caskbycask.domain.ainews.dto.AiNewsDtos;
import com.caskbycask.domain.ainews.entity.AiNewsArticle;
import com.caskbycask.domain.ainews.entity.AiNewsSettings;
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
    }

    @Test
    void categoryRatiosMustSumToOneHundred() {
        AiNewsDtos.SettingsUpdateRequest request = new AiNewsDtos.SettingsUpdateRequest(
                false, false, true, 3, 48, new BigDecimal("0.9"), 900,
                null, null, null, 60, 30, 30);

        assertThatThrownBy(() -> service.updateSettings(request, 1L))
                .isInstanceOf(CustomException.class);
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
