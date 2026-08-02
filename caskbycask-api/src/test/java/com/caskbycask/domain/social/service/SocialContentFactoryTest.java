package com.caskbycask.domain.social.service;

import com.caskbycask.domain.community.repository.PostRepository;
import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.PostPrefix;
import com.caskbycask.domain.community.entity.enums.BoardType;
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
import com.caskbycask.domain.spirit.entity.enums.VariantType;
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
    void reviewCaptionPlacesLinkBelowTitleAndKeepsItWhenReviewIsLong() {
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

        assertThat(content.imageNotice()).isNull();
        assertThat(content.caption()).startsWith("테스트 위스키 후기");
        assertThat(content.caption()).contains(
                "향\nVanilla · 바닐라");
        assertThat(content.caption()).contains(
                "맛\nOak · 견과류");
        assertThat(content.caption()).contains(
                "피니시\nSpice · 시나몬");
        assertThat(content.caption()).doesNotContain("테이스팅 노트", "향향향", "맛맛맛", "피니시피니시");
        assertThat(content.caption()).contains("총평: ", "...");
        assertThat(content.caption()).contains(
                "#위스키 #테스트위스키 #캐바캐 #CaskByCask");
        assertThat(content.caption()).contains("""
                전체 리뷰는 프로필 링크에서 확인하세요 🔗
                https://www.caskbycask.net/s/AbCdEf2345

                향
                """);
        assertThat(content.caption()).endsWith(
                "#위스키 #테스트위스키 #캐바캐 #CaskByCask");
        assertThat(content.caption().codePointCount(0, content.caption().length())).isLessThanOrEqualTo(500);

        SocialPublicationContent instagram = factory.create(bundle, SocialPlatform.INSTAGRAM);

        assertThat(instagram.caption()).startsWith("""
                테스트 위스키 후기

                전체 리뷰는 프로필 링크에서 확인하세요 🔗
                https://www.caskbycask.net/s/AbCdEf2345

                향
                """);
        assertThat(instagram.caption()).endsWith(
                "#위스키 #테스트위스키 #캐바캐 #CaskByCask");
        assertThat(instagram.caption().codePointCount(0, instagram.caption().length()))
                .isLessThanOrEqualTo(2200);
        assertThat(content.caption()).startsWith("""
                테스트 위스키 후기

                전체 리뷰는 프로필 링크에서 확인하세요 🔗
                https://www.caskbycask.net/s/AbCdEf2345

                향
                """);

        SocialPublishBundle englishBundle = SocialPublishBundle.builder()
                .originType(SocialSourceType.REVIEW)
                .originId(20L)
                .contentType(SocialSourceType.REVIEW)
                .contentId(20L)
                .locale("en")
                .consentVersion("2026-07-24")
                .consentedAt(LocalDateTime.now())
                .mediaMode(SocialMediaMode.REVIEW_IMAGE)
                .shortCode("AbCdEf2345")
                .build();

        SocialPublicationContent english = factory.create(
                englishBundle, SocialPlatform.INSTAGRAM);

        assertThat(english.caption()).contains(
                "#위스키 #TestWhisky #캐바캐 #CaskByCask");
        assertThat(english.caption()).doesNotContain("#테스트위스키");
        assertThat(english.caption()).doesNotContain("Read the full review →");
    }

    @Test
    void reviewImageTitleUsesOnlyNameAndSeriesIdentifierForEdition() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setSiteUrl("https://www.caskbycask.net");
        SocialContentFactory factory = new SocialContentFactory(
                reviewRepository, postRepository, imageRepository, properties);

        Spirit spirit = Spirit.builder()
                .nameKo("더 글렌드로낙")
                .nameEn("The Glendronach")
                .category(SpiritCategory.WHISKY)
                .variantType(VariantType.SINGLE_CASK)
                .seriesIdentifier("싱글 캐스크")
                .seriesIdentifierEn("Single Cask")
                .variantValue("캐스크 123")
                .variantValueEn("Cask 123")
                .build();
        ReflectionTestUtils.setField(spirit, "id", 30L);
        User user = User.builder().email("reviewer@example.com").nickname("리뷰어").build();
        Review review = Review.builder()
                .spirit(spirit)
                .user(user)
                .noseScore(BigDecimal.valueOf(90))
                .tasteScore(BigDecimal.valueOf(90))
                .finishScore(BigDecimal.valueOf(90))
                .totalScore(BigDecimal.valueOf(90))
                .build();
        ReflectionTestUtils.setField(review, "id", 40L);
        SpiritImage image = SpiritImage.builder()
                .spirit(spirit)
                .imageUrl("/uploads/spirits/review.jpg")
                .isPrimary(true)
                .build();
        given(reviewRepository.findPublicById(40L)).willReturn(Optional.of(review));
        given(imageRepository.findBySpiritIdAndIsPrimaryTrue(30L)).willReturn(Optional.of(image));

        SocialPublishBundle koreanBundle = reviewBundle(40L, "ko");
        SocialPublishBundle englishBundle = reviewBundle(40L, "en");

        SocialPublicationContent korean = factory.create(koreanBundle, SocialPlatform.INSTAGRAM);
        SocialPublicationContent english = factory.create(englishBundle, SocialPlatform.INSTAGRAM);

        assertThat(korean.displayTitle()).isEqualTo("더 글렌드로낙 싱글 캐스크 캐스크 123");
        assertThat(korean.imageTitle()).isEqualTo("더 글렌드로낙 싱글 캐스크");
        assertThat(korean.imageIdentifier()).isEqualTo("캐스크 123");
        assertThat(korean.imageNotice())
                .isEqualTo("※ 대표 이미지는 리뷰한 에디션과 다를 수 있습니다.");
        assertThat(korean.imageLabel()).isEqualTo("후기");
        assertThat(english.displayTitle()).isEqualTo("The Glendronach Single Cask Cask 123");
        assertThat(english.imageTitle()).isEqualTo("The Glendronach Single Cask");
        assertThat(english.imageIdentifier()).isEqualTo("Cask 123");
        assertThat(english.imageNotice())
                .isEqualTo("Representative image may differ from the reviewed edition.");
        assertThat(english.imageLabel()).isEqualTo("Review");
    }

    @Test
    void newsImageLabelUsesRegisteredPostPrefixForRegularAndAiNews() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setSiteUrl("https://www.caskbycask.net");
        SocialContentFactory factory = new SocialContentFactory(
                reviewRepository, postRepository, imageRepository, properties);
        User author = User.builder().email("admin@example.com").nickname("관리자").build();
        PostPrefix prefix = PostPrefix.builder()
                .boardType(BoardType.NOTICE)
                .name("출시")
                .colorHex("#2563EB")
                .build();
        Post post = Post.builder()
                .boardType(BoardType.NOTICE)
                .prefix(prefix)
                .author(author)
                .title("신제품 출시 소식")
                .content("<p>본문</p>")
                .contentSanitized("<p>본문</p>")
                .hashtags(new java.util.ArrayList<>(java.util.List.of("신제품", "위스키")))
                .build();
        ReflectionTestUtils.setField(post, "id", 50L);
        given(postRepository.findById(50L)).willReturn(Optional.of(post));

        SocialPublishBundle regularBundle = postBundle(
                50L, SocialSourceType.POST);
        SocialPublishBundle aiBundle = postBundle(
                50L, SocialSourceType.AI_NEWS_ARTICLE);

        SocialPublicationContent regular =
                factory.create(regularBundle, SocialPlatform.INSTAGRAM);
        SocialPublicationContent ai =
                factory.create(aiBundle, SocialPlatform.THREADS);

        assertThat(regular.imageLabel()).isEqualTo("출시");
        assertThat(ai.imageLabel()).isEqualTo("출시");
        assertThat(regular.caption()).startsWith("""
                신제품 출시 소식

                본문
                """);
        assertThat(ai.caption()).startsWith("""
                신제품 출시 소식

                본문
                """);
        assertThat(regular.caption()).contains("""
                본문

                [자세한 내용은 CaskByCask(캐바캐) 홈페이지를 확인해주세요]

                https://www.caskbycask.net/s/AbCdEf2345

                #신제품 #위스키""");
        assertThat(ai.caption()).contains("""
                본문

                [자세한 내용은 CaskByCask(캐바캐) 홈페이지를 확인해주세요]

                https://www.caskbycask.net/s/AbCdEf2345

                #신제품 #위스키""");
        assertThat(regular.caption())
                .contains("[자세한 내용은 CaskByCask(캐바캐) 홈페이지를 확인해주세요]"
                        + "\n\nhttps://www.caskbycask.net/s/AbCdEf2345");
        assertThat(ai.caption())
                .contains("[자세한 내용은 CaskByCask(캐바캐) 홈페이지를 확인해주세요]"
                        + "\n\nhttps://www.caskbycask.net/s/AbCdEf2345");
        assertThat(regular.caption()).endsWith("#신제품 #위스키");
        assertThat(ai.caption()).endsWith("#신제품 #위스키");
        assertThat(ai.caption().codePointCount(0, ai.caption().length()))
                .isLessThanOrEqualTo(500);
    }

    @Test
    void newsCaptionKeepsBodyLineBreaks() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setSiteUrl("https://www.caskbycask.net");
        SocialContentFactory factory = new SocialContentFactory(
                reviewRepository, postRepository, imageRepository, properties);
        User author = User.builder().email("admin@example.com").nickname("관리자").build();
        String html = """
                <p>첫째 줄<br>둘째 줄</p><p></p><p>셋째 줄
                넷째 줄</p><ul><li>항목 1</li><li>항목 2</li></ul>""";
        Post post = Post.builder()
                .boardType(BoardType.NOTICE)
                .author(author)
                .title("줄바꿈 소식")
                .content(html)
                .contentSanitized(html)
                .hashtags(new java.util.ArrayList<>(java.util.List.of("위스키")))
                .build();
        ReflectionTestUtils.setField(post, "id", 51L);
        given(postRepository.findById(51L)).willReturn(Optional.of(post));

        String instagram = factory.create(
                postBundle(51L, SocialSourceType.POST), SocialPlatform.INSTAGRAM).caption();
        String threads = factory.create(
                postBundle(51L, SocialSourceType.AI_NEWS_ARTICLE), SocialPlatform.THREADS).caption();

        String expectedBody = """
                줄바꿈 소식

                첫째 줄
                둘째 줄

                셋째 줄
                넷째 줄
                항목 1
                항목 2

                [자세한 내용은 CaskByCask(캐바캐) 홈페이지를 확인해주세요]

                https://www.caskbycask.net/s/AbCdEf2345

                #위스키""";
        assertThat(instagram).isEqualTo(expectedBody);
        assertThat(threads).isEqualTo(expectedBody);
    }

    private static SocialPublishBundle reviewBundle(Long reviewId, String locale) {
        return SocialPublishBundle.builder()
                .originType(SocialSourceType.REVIEW)
                .originId(reviewId)
                .contentType(SocialSourceType.REVIEW)
                .contentId(reviewId)
                .locale(locale)
                .consentVersion("2026-07-24")
                .consentedAt(LocalDateTime.now())
                .mediaMode(SocialMediaMode.REVIEW_IMAGE)
                .shortCode("AbCdEf2345")
                .build();
    }

    private static SocialPublishBundle postBundle(Long postId, SocialSourceType originType) {
        return SocialPublishBundle.builder()
                .originType(originType)
                .originId(postId)
                .contentType(SocialSourceType.POST)
                .contentId(postId)
                .locale("ko")
                .consentVersion("2026-07-24")
                .consentedAt(LocalDateTime.now())
                .mediaMode(SocialMediaMode.DIRECT_UPLOAD)
                .directImageUrl("/api/social/images/upload.jpg")
                .shortCode("AbCdEf2345")
                .build();
    }
}
