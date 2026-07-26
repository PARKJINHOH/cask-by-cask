package com.caskbycask.domain.social.service;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.dto.SocialPublishSelection;
import com.caskbycask.domain.social.entity.SocialPublication;
import com.caskbycask.domain.social.entity.SocialPublishBundle;
import com.caskbycask.domain.social.entity.enums.SocialMediaMode;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.social.repository.SocialPublicationRepository;
import com.caskbycask.domain.social.repository.SocialPublishBundleRepository;
import com.caskbycask.domain.social.repository.SocialThumbnailTemplateRepository;
import com.caskbycask.domain.user.entity.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SocialPublishRequestServiceTest {

    @Mock SocialPublishBundleRepository bundleRepository;
    @Mock SocialPublicationRepository publicationRepository;
    @Mock SocialThumbnailTemplateRepository templateRepository;

    @Test
    void legacyReviewRequestCreatesOnlyPlatformWithoutExistingHistory() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setEnabled(true);
        SocialPublishRequestService service = new SocialPublishRequestService(
                bundleRepository, publicationRepository, templateRepository, properties);

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
}
