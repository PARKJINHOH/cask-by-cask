package com.drinkindex.domain.review.service;

import com.drinkindex.domain.review.dto.ReviewRequest;
import com.drinkindex.domain.review.dto.ReviewResponse;
import com.drinkindex.domain.review.dto.UpdateReviewRequest;
import com.drinkindex.domain.review.entity.Review;
import com.drinkindex.domain.review.entity.enums.ReviewSort;
import com.drinkindex.domain.review.repository.ReviewRepository;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final SpiritRepository spiritRepository;
    private final UserRepository userRepository;

    // ── 조회 ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getReviews(Long spiritId, ReviewSort sort, Pageable pageable) {
        Sort dataSort = switch (sort != null ? sort : ReviewSort.LATEST) {
            case SCORE_DESC -> Sort.by(Sort.Direction.DESC, "totalScore");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), dataSort);
        return reviewRepository.findBySpiritForDisplay(spiritId, sorted)
                .map(ReviewResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getMyReviews(Long userId, Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return reviewRepository.findByUserIdWithUser(userId, sorted)
                .map(ReviewResponse::from);
    }

    // ── 작성 ──────────────────────────────────────────────

    @Transactional
    public ReviewResponse createReview(Long spiritId, Long userId, ReviewRequest request) {
        Spirit spirit = spiritRepository.findByIdAndStatus(spiritId, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        User user = getUser(userId);

        if (reviewRepository.existsBySpiritIdAndUserId(spiritId, userId)) {
            throw new CustomException(ErrorCode.DUPLICATE_REVIEW);
        }

        Review review = Review.builder()
                .spirit(spirit)
                .user(user)
                .noseScore(BigDecimal.valueOf(request.noseScore()))
                .tasteScore(BigDecimal.valueOf(request.tasteScore()))
                .finishScore(BigDecimal.valueOf(request.finishScore()))
                .comment(request.comment())
                .build();

        Review saved = reviewRepository.save(review);
        recalculateAvgScore(spiritId);

        return ReviewResponse.from(saved);
    }

    // ── 수정 ──────────────────────────────────────────────

    @Transactional
    public ReviewResponse updateReview(Long spiritId, Long reviewId, Long userId,
                                       UpdateReviewRequest request) {
        Review review = getReview(spiritId, reviewId);
        checkOwnership(review, userId);

        review.update(
                request.noseScore() != null
                        ? BigDecimal.valueOf(request.noseScore()) : review.getNoseScore(),
                request.tasteScore() != null
                        ? BigDecimal.valueOf(request.tasteScore()) : review.getTasteScore(),
                request.finishScore() != null
                        ? BigDecimal.valueOf(request.finishScore()) : review.getFinishScore(),
                request.comment() != null ? request.comment() : review.getComment()
        );

        // flush to trigger @PreUpdate → totalScore 재계산
        reviewRepository.flush();
        recalculateAvgScore(spiritId);

        return ReviewResponse.from(review);
    }

    // ── 삭제 ──────────────────────────────────────────────

    @Transactional
    public void deleteReview(Long spiritId, Long reviewId, Long userId) {
        Review review = getReview(spiritId, reviewId);
        checkOwnership(review, userId);

        review.softDelete();
        recalculateAvgScore(spiritId);
    }

    // ── avgScore 재계산 ────────────────────────────────────

    public void recalculateAvgScore(Long spiritId) {
        Spirit spirit = spiritRepository.findById(spiritId)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        BigDecimal avg = reviewRepository.findAvgScoreBySpiritId(spiritId)
                .map(d -> BigDecimal.valueOf(d).setScale(1, RoundingMode.HALF_UP))
                .orElse(null);

        int count = (int) reviewRepository.countActiveBySpiritId(spiritId);
        spirit.updateAvgScore(avg, count);
    }

    // ── Private helpers ────────────────────────────────────

    private Review getReview(Long spiritId, Long reviewId) {
        return reviewRepository.findByIdAndSpiritId(reviewId, spiritId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    }

    private void checkOwnership(Review review, Long userId) {
        if (!review.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.REVIEW_ACCESS_DENIED);
        }
    }
}
