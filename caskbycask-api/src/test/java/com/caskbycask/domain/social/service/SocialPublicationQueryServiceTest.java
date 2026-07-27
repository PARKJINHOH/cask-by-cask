package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.entity.SocialPublishBundle;
import com.caskbycask.domain.social.entity.SocialPublication;
import com.caskbycask.domain.social.entity.enums.SocialMediaMode;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.social.repository.SocialPublicationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class SocialPublicationQueryServiceTest {

    @Mock SocialPublicationRepository publicationRepository;
    @Mock SocialContentFactory contentFactory;

    @Test
    void publicHubGroupsRepublishedBundlesByContentAndUsesLatestPlatformLink() {
        SocialPublishBundle originalBundle = bundle(10L);
        SocialPublishBundle republishBundle = bundle(20L);
        SocialPublication republishedInstagram = publication(
                30L, republishBundle, SocialPlatform.INSTAGRAM,
                "https://instagram.com/p/new", LocalDateTime.now());
        SocialPublication originalInstagram = publication(
                31L, originalBundle, SocialPlatform.INSTAGRAM,
                "https://instagram.com/p/old", LocalDateTime.now().minusDays(1));
        SocialPublication originalThreads = publication(
                32L, originalBundle, SocialPlatform.THREADS,
                "https://threads.net/@official/post/old", LocalDateTime.now().minusDays(1));
        given(publicationRepository.findByStatusOrderByPublishedAtDesc(
                any(SocialPublicationStatus.class), any()))
                .willReturn(new PageImpl<>(List.of(
                        republishedInstagram, originalInstagram, originalThreads)));
        given(contentFactory.create(republishBundle, SocialPlatform.INSTAGRAM))
                .willReturn(new SocialPublicationContent(
                        "caption", "/image.jpg", "/ko/reviews/77", "Review"));

        var result = new SocialPublicationQueryService(
                publicationRepository, contentFactory).publicHub(20);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().bundleId()).isEqualTo(20L);
        assertThat(result.getFirst().platforms())
                .extracting(value -> value.platform() + ":" + value.permalink())
                .containsExactly(
                        "INSTAGRAM:https://instagram.com/p/new",
                        "THREADS:https://threads.net/@official/post/old");
    }

    private static SocialPublishBundle bundle(Long id) {
        return SocialPublishBundle.builder()
                .id(id)
                .originType(SocialSourceType.REVIEW)
                .originId(77L)
                .contentType(SocialSourceType.REVIEW)
                .contentId(77L)
                .locale("ko")
                .consentVersion("v1")
                .consentedAt(LocalDateTime.now())
                .mediaMode(SocialMediaMode.REVIEW_IMAGE)
                .shortCode("code" + id)
                .build();
    }

    private static SocialPublication publication(
            Long id,
            SocialPublishBundle bundle,
            SocialPlatform platform,
            String permalink,
            LocalDateTime publishedAt) {
        return SocialPublication.builder()
                .id(id)
                .bundle(bundle)
                .platform(platform)
                .status(SocialPublicationStatus.PUBLISHED)
                .permalink(permalink)
                .publishedAt(publishedAt)
                .build();
    }
}
