package com.drinkindex.domain.review.service;

import com.drinkindex.domain.review.dto.ReviewRequest;
import com.drinkindex.domain.review.dto.ReviewResponse;
import com.drinkindex.domain.review.dto.UpdateReviewRequest;
import com.drinkindex.domain.review.entity.Review;
import com.drinkindex.domain.review.repository.ReviewRepository;
import com.drinkindex.domain.score.service.ScoreService;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.util.BadWordFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock private ReviewRepository reviewRepository;
    @Mock private SpiritRepository spiritRepository;
    @Mock private UserRepository userRepository;
    @Mock private ScoreService scoreService;
    @Mock private BadWordFilter badWordFilter; // [패치 5] 리뷰 욕설 필터 의존성

    @InjectMocks
    private ReviewService reviewService;

    private Spirit spirit;
    private User user;

    @BeforeEach
    void setUp() {
        spirit = Spirit.builder()
                .nameKo("글렌피딕 12년")
                .nameEn("Glenfiddich 12")
                .category(SpiritCategory.WHISKY)
                .build();
        spirit.approve();
        ReflectionTestUtils.setField(spirit, "id", 1L);

        user = User.builder()
                .email("tester@example.com")
                .nickname("테스터")
                .role(Role.MEMBER)
                .build();
        ReflectionTestUtils.setField(user, "id", 1L);
    }

    // ── 리뷰 작성 ─────────────────────────────────────────

    @Test
    @DisplayName("리뷰 작성 후 Spirit avgScore 업데이트")
    void createReview_updatesAvgScore() {
        ReviewRequest request = new ReviewRequest(new BigDecimal("90"), new BigDecimal("85"), new BigDecimal("88"), null, null, null, "훌륭합니다", null, null, null);

        given(spiritRepository.findByIdAndStatus(1L, SpiritStatus.ACTIVE))
                .willReturn(Optional.of(spirit));
        given(userRepository.getByIdOrThrow(1L)).willReturn(user);
        given(reviewRepository.existsBySpiritIdAndUserId(1L, 1L)).willReturn(false);

        Review savedReview = buildReview(spirit, user, 90, 85, 88, "훌륭합니다", new BigDecimal("87.7"));
        given(reviewRepository.save(any())).willReturn(savedReview);

        given(reviewRepository.findAvgScoreBySpiritId(1L)).willReturn(Optional.of(87.7));
        given(reviewRepository.countActiveBySpiritId(1L)).willReturn(1L);
        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit));

        ReviewResponse response = reviewService.createReview(1L, 1L, request);

        assertThat(response.totalScore()).isEqualByComparingTo(new BigDecimal("87.7"));
        assertThat(spirit.getAvgScore()).isEqualByComparingTo(new BigDecimal("87.7"));
        assertThat(spirit.getReviewCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("리뷰 작성 후 reviewCount 증가 검증")
    void createReview_incrementsReviewCount() {
        ReviewRequest request = new ReviewRequest(new BigDecimal("80"), new BigDecimal("80"), new BigDecimal("80"), null, null, null, null, null, null, null);

        given(spiritRepository.findByIdAndStatus(1L, SpiritStatus.ACTIVE))
                .willReturn(Optional.of(spirit));
        given(userRepository.getByIdOrThrow(1L)).willReturn(user);
        given(reviewRepository.existsBySpiritIdAndUserId(1L, 1L)).willReturn(false);

        Review savedReview = buildReview(spirit, user, 80, 80, 80, null, new BigDecimal("80.0"));
        given(reviewRepository.save(any())).willReturn(savedReview);

        given(reviewRepository.findAvgScoreBySpiritId(1L)).willReturn(Optional.of(80.0));
        given(reviewRepository.countActiveBySpiritId(1L)).willReturn(3L);
        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit));

        reviewService.createReview(1L, 1L, request);

        assertThat(spirit.getReviewCount()).isEqualTo(3);
    }

    // ── 중복 리뷰 방지 ─────────────────────────────────────

    @Test
    @DisplayName("같은 술에 중복 리뷰 작성 시 DUPLICATE_REVIEW 예외")
    void createReview_duplicate_throwsDuplicateReview() {
        ReviewRequest request = new ReviewRequest(new BigDecimal("90"), new BigDecimal("85"), new BigDecimal("88"), null, null, null, "중복", null, null, null);

        given(spiritRepository.findByIdAndStatus(1L, SpiritStatus.ACTIVE))
                .willReturn(Optional.of(spirit));
        given(userRepository.getByIdOrThrow(1L)).willReturn(user);
        given(reviewRepository.existsBySpiritIdAndUserId(1L, 1L)).willReturn(true);

        assertThatThrownBy(() -> reviewService.createReview(1L, 1L, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DUPLICATE_REVIEW);
    }

    @Test
    @DisplayName("soft delete된 리뷰 제외 후 재작성 가능 (중복 아님)")
    void createReview_afterSoftDelete_notDuplicate() {
        ReviewRequest request = new ReviewRequest(new BigDecimal("70"), new BigDecimal("70"), new BigDecimal("70"), null, null, null, "재작성", null, null, null);

        given(spiritRepository.findByIdAndStatus(1L, SpiritStatus.ACTIVE))
                .willReturn(Optional.of(spirit));
        given(userRepository.getByIdOrThrow(1L)).willReturn(user);
        // SQLRestriction으로 인해 soft delete된 리뷰는 existsBy에서 제외됨
        given(reviewRepository.existsBySpiritIdAndUserId(1L, 1L)).willReturn(false);

        Review savedReview = buildReview(spirit, user, 70, 70, 70, "재작성", new BigDecimal("70.0"));
        given(reviewRepository.save(any())).willReturn(savedReview);
        given(reviewRepository.findAvgScoreBySpiritId(1L)).willReturn(Optional.of(70.0));
        given(reviewRepository.countActiveBySpiritId(1L)).willReturn(1L);
        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit));

        ReviewResponse response = reviewService.createReview(1L, 1L, request);

        assertThat(response).isNotNull();
    }

    // ── 리뷰 삭제 ─────────────────────────────────────────

    @Test
    @DisplayName("리뷰 삭제 후 avgScore 재계산")
    void deleteReview_recalculatesAvgScore() {
        Review review = buildReview(spirit, user, 90, 85, 88, null, new BigDecimal("87.7"));
        ReflectionTestUtils.setField(review, "id", 10L);

        spirit.updateAvgScore(new BigDecimal("87.7"), 1);

        given(reviewRepository.findByIdAndSpiritId(10L, 1L)).willReturn(Optional.of(review));
        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit));
        // 삭제 후 avgScore 없음 (리뷰가 0개)
        given(reviewRepository.findAvgScoreBySpiritId(1L)).willReturn(Optional.empty());
        given(reviewRepository.countActiveBySpiritId(1L)).willReturn(0L);

        reviewService.deleteReview(1L, 10L, 1L);

        assertThat(review.getDeletedAt()).isNotNull();
        assertThat(spirit.getAvgScore()).isNull();
        assertThat(spirit.getReviewCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("리뷰 삭제 후 나머지 리뷰 기준으로 avgScore 재계산")
    void deleteReview_recalculatesAvgScoreWithRemainingReviews() {
        Review review = buildReview(spirit, user, 90, 85, 88, null, new BigDecimal("87.7"));
        ReflectionTestUtils.setField(review, "id", 10L);

        spirit.updateAvgScore(new BigDecimal("85.0"), 2);

        given(reviewRepository.findByIdAndSpiritId(10L, 1L)).willReturn(Optional.of(review));
        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit));
        given(reviewRepository.findAvgScoreBySpiritId(1L)).willReturn(Optional.of(82.0));
        given(reviewRepository.countActiveBySpiritId(1L)).willReturn(1L);

        reviewService.deleteReview(1L, 10L, 1L);

        assertThat(spirit.getAvgScore()).isEqualByComparingTo(new BigDecimal("82.0"));
        assertThat(spirit.getReviewCount()).isEqualTo(1);
    }

    // ── 수정 권한 ──────────────────────────────────────────

    @Test
    @DisplayName("타인 리뷰 수정 시 REVIEW_ACCESS_DENIED 예외")
    void updateReview_notOwner_throwsAccessDenied() {
        User otherUser = User.builder()
                .email("other@example.com")
                .nickname("타인")
                .role(Role.MEMBER)
                .build();
        ReflectionTestUtils.setField(otherUser, "id", 99L);

        Review review = buildReview(spirit, otherUser, 80, 80, 80, null, new BigDecimal("80.0"));
        ReflectionTestUtils.setField(review, "id", 10L);

        given(reviewRepository.findByIdAndSpiritId(10L, 1L)).willReturn(Optional.of(review));

        UpdateReviewRequest request = new UpdateReviewRequest(new BigDecimal("90"), null, null, null, null, null, null, null, null, null);

        assertThatThrownBy(() -> reviewService.updateReview(1L, 10L, 1L, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.REVIEW_ACCESS_DENIED);
    }

    @Test
    @DisplayName("타인 리뷰 삭제 시 REVIEW_ACCESS_DENIED 예외")
    void deleteReview_notOwner_throwsAccessDenied() {
        User otherUser = User.builder()
                .email("other@example.com")
                .nickname("타인")
                .role(Role.MEMBER)
                .build();
        ReflectionTestUtils.setField(otherUser, "id", 99L);

        Review review = buildReview(spirit, otherUser, 80, 80, 80, null, new BigDecimal("80.0"));
        ReflectionTestUtils.setField(review, "id", 10L);

        given(reviewRepository.findByIdAndSpiritId(10L, 1L)).willReturn(Optional.of(review));

        assertThatThrownBy(() -> reviewService.deleteReview(1L, 10L, 1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.REVIEW_ACCESS_DENIED);
    }

    @Test
    @DisplayName("존재하지 않는 Spirit에 리뷰 작성 시 SPIRIT_NOT_FOUND 예외")
    void createReview_spiritNotFound_throwsException() {
        given(spiritRepository.findByIdAndStatus(999L, SpiritStatus.ACTIVE))
                .willReturn(Optional.empty());

        assertThatThrownBy(() -> reviewService.createReview(999L, 1L,
                new ReviewRequest(new BigDecimal("80"), new BigDecimal("80"), new BigDecimal("80"), null, null, null, null, null, null, null)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SPIRIT_NOT_FOUND);
    }

    // ── Helper ────────────────────────────────────────────

    private Review buildReview(Spirit spirit, User user, int nose, int taste, int finish,
                                String comment, BigDecimal totalScore) {
        Review review = Review.builder()
                .spirit(spirit)
                .user(user)
                .noseScore(BigDecimal.valueOf(nose))
                .tasteScore(BigDecimal.valueOf(taste))
                .finishScore(BigDecimal.valueOf(finish))
                .totalScore(totalScore)
                .comment(comment)
                .build();
        return review;
    }
}
