package com.caskbycask.domain.social.service;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.dto.SocialPublishSelection;
import com.caskbycask.domain.social.entity.SocialPublication;
import com.caskbycask.domain.social.entity.SocialPublishBundle;
import com.caskbycask.domain.social.entity.SocialPublishBundleMedia;
import com.caskbycask.domain.social.entity.enums.SocialMediaMode;
import com.caskbycask.domain.social.entity.enums.SocialMediaRole;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.social.repository.SocialPublicationRepository;
import com.caskbycask.domain.social.repository.SocialPublishBundleRepository;
import com.caskbycask.domain.social.repository.SocialThumbnailTemplateRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SocialPublishRequestServiceTest {

    @Mock SocialPublishBundleRepository bundleRepository;
    @Mock SocialPublicationRepository publicationRepository;
    @Mock SocialThumbnailTemplateRepository templateRepository;
    @Mock SocialPublishMediaService publishMediaService;
    @Mock ReviewRepository reviewRepository;

    @Test
    void legacyReviewRequestCreatesOnlyPlatformWithoutExistingHistory() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setEnabled(true);
        SocialPublishRequestService service = new SocialPublishRequestService(
                bundleRepository, publicationRepository, templateRepository, properties,
                publishMediaService, reviewRepository);

        Review review = Review.builder().build();
        ReflectionTestUtils.setField(review, "id", 20L);
        User requester = User.builder().email("reviewer@example.com").nickname("리뷰어").build();
        SocialPublishBundle existingBundle = SocialPublishBundle.builder()
                .originType(SocialSourceType.REVIEW)
                .originId(20L)
                .contentType(SocialSourceType.REVIEW)
                .contentId(20L)
                .requestedBy(requester)
                .locale("ko")
                .consentVersion("2026-07-24")
                .mediaMode(SocialMediaMode.REVIEW_IMAGE)
                .shortCode("Existing01")
                .build();
        ReflectionTestUtils.setField(existingBundle, "id", 30L);
        SocialPublication existingInstagram = SocialPublication.builder()
                .bundle(existingBundle)
                .platform(SocialPlatform.INSTAGRAM)
                .status(SocialPublicationStatus.PUBLISHED)
                .build();
        given(bundleRepository.findByContentTypeAndContentId(SocialSourceType.REVIEW, 20L))
                .willReturn(List.of(existingBundle));
        given(publicationRepository.findByBundleIdOrderByPlatformAsc(30L))
                .willReturn(List.of(existingInstagram));
        given(bundleRepository.save(any(SocialPublishBundle.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        SocialPublishSelection selection = new SocialPublishSelection(
                true, true, true, "2026-07-24", "ko",
                SocialMediaMode.REVIEW_IMAGE, null, null, null);

        service.requestMissingReviewPlatforms(review, requester, selection);

        ArgumentCaptor<SocialPublication> publicationCaptor =
                ArgumentCaptor.forClass(SocialPublication.class);
        verify(publicationRepository, times(1)).save(publicationCaptor.capture());
        assertThat(publicationCaptor.getValue().getPlatform()).isEqualTo(SocialPlatform.THREADS);
    }

    @Test
    void publishedAiArticleRequestCreatesOnlyUnpublishedPlatformAsQueued() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setEnabled(true);
        SocialPublishRequestService service = new SocialPublishRequestService(
                bundleRepository, publicationRepository, templateRepository, properties,
                publishMediaService, reviewRepository);

        User requester = User.builder().email("admin@example.com").nickname("관리자").build();
        SocialPublishBundle existingBundle = SocialPublishBundle.builder()
                .id(31L)
                .originType(SocialSourceType.AI_NEWS_ARTICLE)
                .originId(40L)
                .contentType(SocialSourceType.POST)
                .contentId(50L)
                .requestedBy(requester)
                .locale("ko")
                .consentVersion("2026-07-24")
                .mediaMode(SocialMediaMode.DIRECT_UPLOAD)
                .directImageUrl("/api/social/images/existing.webp")
                .shortCode("Existing02")
                .build();
        SocialPublication existingInstagram = SocialPublication.builder()
                .bundle(existingBundle)
                .platform(SocialPlatform.INSTAGRAM)
                .status(SocialPublicationStatus.PUBLISHED)
                .build();
        given(bundleRepository.findByOriginTypeAndOriginId(SocialSourceType.AI_NEWS_ARTICLE, 40L))
                .willReturn(List.of(existingBundle));
        given(publicationRepository.findByBundleIdOrderByPlatformAsc(31L))
                .willReturn(List.of(existingInstagram));
        given(bundleRepository.save(any(SocialPublishBundle.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        SocialPublishSelection selection = new SocialPublishSelection(
                true, true, true, "2026-07-24", "ko",
                SocialMediaMode.DIRECT_UPLOAD, null, null, "/api/social/images/new.webp");

        service.requestPublishedAiArticle(40L, 50L, requester, selection);

        ArgumentCaptor<SocialPublishBundle> bundleCaptor =
                ArgumentCaptor.forClass(SocialPublishBundle.class);
        verify(bundleRepository).save(bundleCaptor.capture());
        assertThat(bundleCaptor.getValue().getContentType()).isEqualTo(SocialSourceType.POST);
        assertThat(bundleCaptor.getValue().getContentId()).isEqualTo(50L);

        ArgumentCaptor<SocialPublication> publicationCaptor =
                ArgumentCaptor.forClass(SocialPublication.class);
        verify(publicationRepository, times(1)).save(publicationCaptor.capture());
        assertThat(publicationCaptor.getValue().getPlatform()).isEqualTo(SocialPlatform.THREADS);
        assertThat(publicationCaptor.getValue().getStatus()).isEqualTo(SocialPublicationStatus.QUEUED);
        verify(publishMediaService).snapshotPost(bundleCaptor.getValue(), 50L);
    }

    @Test
    void rejectsInstagramNewsWhenEditorImagesExceedNineWithThumbnail() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setEnabled(true);
        SocialPublishRequestService service = new SocialPublishRequestService(
                bundleRepository, publicationRepository, templateRepository, properties,
                publishMediaService, reviewRepository);

        User requester = User.builder().email("admin@example.com").nickname("관리자").build();
        given(bundleRepository.save(any(SocialPublishBundle.class)))
                .willAnswer(invocation -> {
                    SocialPublishBundle bundle = invocation.getArgument(0);
                    ReflectionTestUtils.setField(bundle, "id", 42L);
                    return bundle;
                });
        given(publishMediaService.snapshotPost(any(SocialPublishBundle.class), eq(50L)))
                .willAnswer(invocation -> {
                    SocialPublishBundle bundle = invocation.getArgument(0);
                    return java.util.stream.IntStream.range(0, 10)
                            .mapToObj(index -> SocialPublishBundleMedia.builder()
                                    .bundle(bundle)
                                    .sortOrder(index)
                                    .mediaRole(SocialMediaRole.EDITOR_IMAGE)
                                    .sourceImageUrl("/uploads/editor-" + index + ".jpg")
                                    .build())
                            .toList();
                });
        SocialPublishBundle savedBundle = SocialPublishBundle.builder()
                .id(42L)
                .originType(SocialSourceType.AI_NEWS_ARTICLE)
                .originId(40L)
                .contentType(SocialSourceType.POST)
                .contentId(50L)
                .requestedBy(requester)
                .locale("ko")
                .consentVersion("2026-07-24")
                .mediaMode(SocialMediaMode.DIRECT_UPLOAD)
                .directImageUrl("/api/social/images/cover.webp")
                .shortCode("LimitTest01")
                .build();
        SocialPublication instagram = SocialPublication.builder()
                .bundle(savedBundle)
                .platform(SocialPlatform.INSTAGRAM)
                .status(SocialPublicationStatus.QUEUED)
                .build();
        given(publicationRepository.findByBundleIdOrderByPlatformAsc(42L))
                .willReturn(List.of(instagram));
        SocialPublishSelection selection = new SocialPublishSelection(
                true, true, false, "2026-07-24", "ko",
                SocialMediaMode.DIRECT_UPLOAD, null, null,
                "/api/social/images/cover.webp");

        assertThatThrownBy(() ->
                service.requestPublishedAiArticle(40L, 50L, requester, selection))
                .isInstanceOfSatisfying(CustomException.class, error ->
                        assertThat(error.getErrorCode())
                                .isEqualTo(ErrorCode.SOCIAL_EDITOR_IMAGE_LIMIT_EXCEEDED));
    }

    @Test
    void adminRepublishCreatesSeparateAnonymousHistoryAndPreservesOriginal() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setEnabled(true);
        SocialPublishRequestService service = new SocialPublishRequestService(
                bundleRepository, publicationRepository, templateRepository, properties,
                publishMediaService, reviewRepository);

        User requester = User.builder().email("reviewer@example.com").nickname("리뷰어").build();
        SocialPublishBundle originalBundle = SocialPublishBundle.builder()
                .id(30L)
                .originType(SocialSourceType.REVIEW)
                .originId(20L)
                .contentType(SocialSourceType.REVIEW)
                .contentId(20L)
                .requestedBy(requester)
                .locale("ko")
                .consentVersion("2026-07-24")
                .consentedAt(java.time.LocalDateTime.now())
                .mediaMode(SocialMediaMode.REVIEW_IMAGE)
                .renderedImageUrl("/api/social/images/original.jpg")
                .shortCode("Existing01")
                .build();
        SocialPublication original = SocialPublication.builder()
                .id(40L)
                .bundle(originalBundle)
                .platform(SocialPlatform.INSTAGRAM)
                .status(SocialPublicationStatus.PUBLISHED)
                .permalink("https://instagram.com/p/original")
                .build();
        given(publicationRepository.findWithBundleById(40L)).willReturn(Optional.of(original));
        given(bundleRepository.save(any(SocialPublishBundle.class)))
                .willAnswer(invocation -> invocation.getArgument(0));
        given(publicationRepository.save(any(SocialPublication.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        service.republish(40L);

        ArgumentCaptor<SocialPublishBundle> bundleCaptor =
                ArgumentCaptor.forClass(SocialPublishBundle.class);
        verify(bundleRepository).save(bundleCaptor.capture());
        assertThat(bundleCaptor.getValue().getRequestedBy()).isNull();
        assertThat(bundleCaptor.getValue().getContentType()).isEqualTo(SocialSourceType.REVIEW);
        assertThat(bundleCaptor.getValue().getContentId()).isEqualTo(20L);
        assertThat(bundleCaptor.getValue().getRenderedImageUrl()).isNull();

        ArgumentCaptor<SocialPublication> publicationCaptor =
                ArgumentCaptor.forClass(SocialPublication.class);
        verify(publicationRepository).save(publicationCaptor.capture());
        assertThat(publicationCaptor.getValue().getPlatform()).isEqualTo(SocialPlatform.INSTAGRAM);
        assertThat(publicationCaptor.getValue().getStatus()).isEqualTo(SocialPublicationStatus.QUEUED);
        assertThat(original.getStatus()).isEqualTo(SocialPublicationStatus.PUBLISHED);
        assertThat(original.getPermalink()).isEqualTo("https://instagram.com/p/original");
    }
}
