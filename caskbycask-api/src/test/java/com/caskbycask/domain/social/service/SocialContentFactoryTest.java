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
                .noseAromaWheelNotes("vanilla,c:%EB%B0%94%EB%8B%90%EB%9D%BC")
                .tasteAromaWheelNotes("oak,c:%EA%B2%AC%EA%B3%BC%EB%A5%98")
                .finishAromaWheelNotes("spice,c:%EC%8B%9C%EB%82%98%EB%AA%AC")
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

        assertThat(content.caption()).contains(
                "향\n아로마: Vanilla · 바닐라");
        assertThat(content.caption()).contains(
                "맛\n아로마: Oak · 견과류");
        assertThat(content.caption()).contains(
                "피니시\n아로마: Spice · 시나몬");
        assertThat(content.caption()).doesNotContain("테이스팅 노트", "향향향", "맛맛맛", "피니시피니시");
        assertThat(content.caption()).contains("총평: ", "...");
        assertThat(content.caption()).endsWith(
                "전체 리뷰 보기 → https://www.caskbycask.net/s/AbCdEf2345");
        assertThat(content.caption().codePointCount(0, content.caption().length())).isLessThanOrEqualTo(500);
    }
}
