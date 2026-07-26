package com.caskbycask.domain.review.service;

import com.caskbycask.domain.review.dto.ReviewRequest;
import com.caskbycask.domain.review.dto.ReviewResponse;
import com.caskbycask.domain.review.dto.UpdateReviewRequest;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.social.service.SocialPublishRequestService;
import com.caskbycask.domain.social.dto.SocialPublishSelection;
import com.caskbycask.domain.social.entity.enums.SocialMediaMode;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.BadWordFilter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
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
    @Mock private SocialPublishRequestService socialPublishRequestService;
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

        Review savedReview = buildReview(spirit, user, 90, 85, 88, "훌륭합니다", new BigDecimal("87.7"));
        given(reviewRepository.save(any())).willReturn(savedReview);
        given(reviewRepository.findReviewsByUserAndMasterSpirit(1L, 1L)).willReturn(List.of(savedReview));

        given(reviewRepository.findAvgScoreForMasterSpirit(1L)).willReturn(Optional.of(87.7));
        given(reviewRepository.countActiveForMasterSpirit(1L)).willReturn(1L);
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

        Review savedReview = buildReview(spirit, user, 80, 80, 80, null, new BigDecimal("80.0"));
        given(reviewRepository.save(any())).willReturn(savedReview);
        given(reviewRepository.findReviewsByUserAndMasterSpirit(1L, 1L)).willReturn(List.of(savedReview));

        given(reviewRepository.findAvgScoreForMasterSpirit(1L)).willReturn(Optional.of(80.0));
        given(reviewRepository.countActiveForMasterSpirit(1L)).willReturn(3L);
        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit));

        reviewService.createReview(1L, 1L, request);

        assertThat(spirit.getReviewCount()).isEqualTo(3);
    }

    // ── 중복 리뷰 방지 제거 ─────────────────────────────────

    @Test
    @DisplayName("soft delete된 리뷰 제외 후 재작성 가능 (중복 아님)")
    void createReview_afterSoftDelete_notDuplicate() {
        ReviewRequest request = new ReviewRequest(new BigDecimal("70"), new BigDecimal("70"), new BigDecimal("70"), null, null, null, "재작성", null, null, null);

        given(spiritRepository.findByIdAndStatus(1L, SpiritStatus.ACTIVE))
                .willReturn(Optional.of(spirit));
        given(userRepository.getByIdOrThrow(1L)).willReturn(user);

        Review savedReview = buildReview(spirit, user, 70, 70, 70, "재작성", new BigDecimal("70.0"));
        given(reviewRepository.save(any())).willReturn(savedReview);
        given(reviewRepository.findReviewsByUserAndMasterSpirit(1L, 1L)).willReturn(List.of(savedReview));
        given(reviewRepository.findAvgScoreForMasterSpirit(1L)).willReturn(Optional.of(70.0));
        given(reviewRepository.countActiveForMasterSpirit(1L)).willReturn(1L);
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

        given(reviewRepository.findById(10L)).willReturn(Optional.of(review));
        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit));
        // 삭제 후 avgScore 없음 (리뷰가 0개)
        given(reviewRepository.findAvgScoreForMasterSpirit(1L)).willReturn(Optional.empty());
        given(reviewRepository.countActiveForMasterSpirit(1L)).willReturn(0L);

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

        given(reviewRepository.findById(10L)).willReturn(Optional.of(review));
        given(spiritRepository.findById(1L)).willReturn(Optional.of(spirit));
        given(reviewRepository.findAvgScoreForMasterSpirit(1L)).willReturn(Optional.of(82.0));
        given(reviewRepository.countActiveForMasterSpirit(1L)).willReturn(1L);

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

        given(reviewRepository.findById(10L)).willReturn(Optional.of(review));

        UpdateReviewRequest request = new UpdateReviewRequest(new BigDecimal("90"), null, null, null, null, null, null, null, null, null);

        assertThatThrownBy(() -> reviewService.updateReview(1L, 10L, 1L, request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.REVIEW_ACCESS_DENIED);
    }

    @Test
    @DisplayName("기존 리뷰 작성자는 SNS 미게시 플랫폼의 최초 발행을 요청할 수 있다")
    void requestInitialSocialPublications_legacyReview_requestsMissingPlatforms() {
        Review review = buildReview(spirit, user, 80, 80, 80, null, new BigDecimal("80.0"));
        ReflectionTestUtils.setField(review, "id", 10L);
        ReflectionTestUtils.setField(review, "legacySocialPublishAllowed", true);
        given(reviewRepository.findByIdForSocialPublish(10L)).willReturn(Optional.of(review));
        SocialPublishSelection selection = new SocialPublishSelection(
                true, true, true, "2026-07-24", "ko",
                SocialMediaMode.REVIEW_IMAGE, null, null, null);

        reviewService.requestInitialSocialPublications(1L, 10L, 1L, selection);

        verify(socialPublishRequestService)
                .requestMissingReviewPlatforms(review, user, selection);
    }

    @Test
    @DisplayName("신규 리뷰는 수정 화면에서 SNS 최초 발행을 요청할 수 없다")
    void requestInitialSocialPublications_newReview_throwsNotAllowed() {
        Review review = buildReview(spirit, user, 80, 80, 80, null, new BigDecimal("80.0"));
        ReflectionTestUtils.setField(review, "id", 10L);
        given(reviewRepository.findByIdForSocialPublish(10L)).willReturn(Optional.of(review));
        SocialPublishSelection selection = new SocialPublishSelection(
                true, false, true, "2026-07-24", "ko",
                SocialMediaMode.REVIEW_IMAGE, null, null, null);

        assertThatThrownBy(() ->
                reviewService.requestInitialSocialPublications(1L, 10L, 1L, selection))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.SOCIAL_INITIAL_PUBLISH_NOT_ALLOWED);
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

        given(reviewRepository.findById(10L)).willReturn(Optional.of(review));

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
