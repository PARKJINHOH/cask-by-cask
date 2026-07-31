package com.caskbycask.domain.review.service;

import com.caskbycask.domain.review.dto.RecentReviewResponse;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritImage;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * 메인 "최근 등록된 리뷰" 서비스 검증 — size 정규화, 대표 이미지 배치 조회/마스터 fallback, 표시명 매핑.
 */
@ExtendWith(MockitoExtension.class)
class PublicReviewServiceRecentTest {

    @Mock private ReviewRepository reviewRepository;
    @Mock private SpiritImageRepository imageRepository;
    @Mock private ReviewImageService reviewImageService;
    @InjectMocks private PublicReviewService service;

    @Test
    @DisplayName("size 가 없거나 1 미만이면 기본 10건, 상한 20건으로 정규화한다")
    void normalizesRequestedSize() {
        given(reviewRepository.findRecentDistinctBySpirit(any(Pageable.class)))
                .willReturn(List.of());

        service.getRecent(null);
        service.getRecent(0);
        service.getRecent(-5);
        service.getRecent(7);
        service.getRecent(50);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(reviewRepository, times(5))
                .findRecentDistinctBySpirit(captor.capture());

        assertThat(captor.getAllValues())
                .extracting(Pageable::getPageSize)
                .containsExactly(10, 10, 10, 7, 20);
    }

    @Test
    @DisplayName("결과가 없으면 이미지 조회 없이 빈 목록을 반환한다")
    void returnsEmptyWithoutImageLookup() {
        given(reviewRepository.findRecentDistinctBySpirit(any(Pageable.class)))
                .willReturn(List.of());

        assertThat(service.getRecent(10)).isEmpty();
        verify(imageRepository, never()).findBySpiritIdInAndIsPrimaryTrue(anyList());
    }

    @Test
    @DisplayName("에디션에 대표 이미지가 없으면 마스터 이미지를 사용한다")
    void fallsBackToMasterImageForEdition() {
        User user = user("taster");
        Spirit master = spirit(1L, "글렌피딕 12년", "Glenfiddich 12");
        Spirit edition = edition(2L, master, "배치3", "Batch 3");

        Review editionReview = review(20L, user, edition);

        given(reviewRepository.findRecentDistinctBySpirit(any(Pageable.class)))
                .willReturn(List.of(editionReview));
        given(imageRepository.findBySpiritIdInAndIsPrimaryTrue(List.of(2L, 1L)))
                .willReturn(List.of(image(master, "/uploads/master.webp")));

        List<RecentReviewResponse> result = service.getRecent(10);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).imageUrl()).isEqualTo("/uploads/master.webp");
    }

    @Test
    @DisplayName("에디션 리뷰의 표시명에는 에디션 값이 접미어로 포함된다")
    void mapsEditionDisplayName() {
        User user = user("taster");
        Spirit master = spirit(1L, "글렌피딕 12년", "Glenfiddich 12");
        Spirit edition = edition(2L, master, "배치3", "Batch 3");

        given(reviewRepository.findRecentDistinctBySpirit(any(Pageable.class)))
                .willReturn(List.of(review(20L, user, edition)));
        given(imageRepository.findBySpiritIdInAndIsPrimaryTrue(List.of(2L, 1L)))
                .willReturn(List.of());

        RecentReviewResponse response = service.getRecent(10).get(0);

        assertThat(response.id()).isEqualTo(20L);
        assertThat(response.spiritId()).isEqualTo(2L);
        assertThat(response.displayNameKo()).isEqualTo("글렌피딕 12년 배치3");
        assertThat(response.displayNameEn()).isEqualTo("Glenfiddich 12 Batch 3");
        assertThat(response.canonicalPathKo()).startsWith("/ko/spirits/2");
        assertThat(response.canonicalPathEn()).startsWith("/en/spirits/2");
        assertThat(response.nickname()).isEqualTo("taster");
        assertThat(response.totalScore()).isEqualByComparingTo(new BigDecimal("80"));
        assertThat(response.imageUrl()).isNull();
    }

    @Test
    @DisplayName("서로 다른 주류의 리뷰는 조회 순서를 유지하며 각 주류의 대표 이미지를 매칭한다")
    void keepsQueryOrderAndMatchesEachImage() {
        User user = user("taster");
        Spirit first = spirit(1L, "술1", "Spirit 1");
        Spirit second = spirit(2L, "술2", "Spirit 2");

        given(reviewRepository.findRecentDistinctBySpirit(any(Pageable.class)))
                .willReturn(List.of(review(11L, user, second), review(10L, user, first)));
        given(imageRepository.findBySpiritIdInAndIsPrimaryTrue(List.of(2L, 1L)))
                .willReturn(List.of(image(first, "/uploads/1.webp"), image(second, "/uploads/2.webp")));

        List<RecentReviewResponse> result = service.getRecent(10);

        assertThat(result).extracting(RecentReviewResponse::spiritId).containsExactly(2L, 1L);
        assertThat(result).extracting(RecentReviewResponse::imageUrl)
                .containsExactly("/uploads/2.webp", "/uploads/1.webp");
    }

    // ── fixture helpers ────────────────────────────────────────

    private User user(String nickname) {
        User user = User.builder()
                .email(nickname + "@example.com")
                .nickname(nickname)
                .role(Role.MEMBER)
                .build();
        ReflectionTestUtils.setField(user, "id", 1L);
        return user;
    }

    private Spirit spirit(Long id, String nameKo, String nameEn) {
        Spirit spirit = Spirit.builder()
                .nameKo(nameKo)
                .nameEn(nameEn)
                .category(SpiritCategory.WHISKY)
                .build();
        ReflectionTestUtils.setField(spirit, "id", id);
        return spirit;
    }

    private Spirit edition(Long id, Spirit parent, String variantValue, String variantValueEn) {
        Spirit edition = Spirit.builder()
                .nameKo(parent.getNameKo())
                .nameEn(parent.getNameEn())
                .category(parent.getCategory())
                .parent(parent)
                .variantType(VariantType.BATCH)
                .variantValue(variantValue)
                .variantValueEn(variantValueEn)
                .build();
        ReflectionTestUtils.setField(edition, "id", id);
        return edition;
    }

    private Review review(Long id, User user, Spirit spirit) {
        Review review = Review.builder()
                .user(user)
                .spirit(spirit)
                .noseScore(new BigDecimal("80"))
                .tasteScore(new BigDecimal("80"))
                .finishScore(new BigDecimal("80"))
                .totalScore(new BigDecimal("80"))
                .build();
        ReflectionTestUtils.setField(review, "id", id);
        return review;
    }

    private SpiritImage image(Spirit spirit, String url) {
        SpiritImage image = SpiritImage.builder()
                .spirit(spirit)
                .imageUrl(url)
                .isPrimary(true)
                .build();
        ReflectionTestUtils.setField(image, "id", spirit.getId() + 100);
        return image;
    }
}
