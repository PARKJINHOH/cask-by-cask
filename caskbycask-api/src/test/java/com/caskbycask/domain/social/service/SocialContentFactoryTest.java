package com.caskbycask.domain.social.service;

import com.caskbycask.domain.community.repository.PostRepository;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.entity.SocialPublishBundle;
import com.caskbycask.domain.social.entity.enums.SocialMediaMode;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.user.entity.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class SocialContentFactoryTest {

    @Mock ReviewRepository reviewRepository;
    @Mock PostRepository postRepository;
    @Mock SpiritImageRepository imageRepository;

    @Test
    void threadsReviewCaptionKeepsShortUrlWhenReviewIsLong() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setSiteUrl("https://www.caskbycask.net");
        SocialContentFactory factory = new SocialContentFactory(
                reviewRepository, postRepository, imageRepository, properties);

        Spirit spirit = Spirit.builder()
                .nameKo("테스트 위스키")
                .nameEn("Test Whisky")
                .category(SpiritCategory.WHISKY)
                .build();
        ReflectionTestUtils.setField(spirit, "id", 10L);
        User user = User.builder().email("reviewer@example.com").nickname("리뷰어").build();
        Review review = Review.builder()
                .spirit(spirit)
                .user(user)
                .noseScore(BigDecimal.valueOf(90))
                .tasteScore(BigDecimal.valueOf(90))
                .finishScore(BigDecimal.valueOf(90))
                .totalScore(BigDecimal.valueOf(90))
                .noseNote("향".repeat(200))
                .tasteNote("맛".repeat(200))
                .finishNote("피니시".repeat(100))
                .comment("총평".repeat(200))
                .build();
        ReflectionTestUtils.setField(review, "id", 20L);
        SpiritImage image = SpiritImage.builder()
                .spirit(spirit)
                .imageUrl("/uploads/spirits/review.jpg")
                .isPrimary(true)
                .build();
        given(reviewRepository.findPublicById(20L)).willReturn(Optional.of(review));
        given(imageRepository.findBySpiritIdAndIsPrimaryTrue(10L)).willReturn(Optional.of(image));

        SocialPublishBundle bundle = SocialPublishBundle.builder()
                .originType(SocialSourceType.REVIEW)
                .originId(20L)
                .contentType(SocialSourceType.REVIEW)
                .contentId(20L)
                .locale("ko")
                .consentVersion("2026-07-24")
                .consentedAt(LocalDateTime.now())
                .mediaMode(SocialMediaMode.REVIEW_IMAGE)
                .shortCode("AbCdEf2345")
                .build();

        SocialPublicationContent content = factory.create(bundle, SocialPlatform.THREADS);

        assertThat(content.caption()).endsWith("https://www.caskbycask.net/s/AbCdEf2345");
        assertThat(content.caption().codePointCount(0, content.caption().length())).isLessThanOrEqualTo(500);
    }
}
