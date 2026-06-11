package com.drinkindex.domain.review.service;

import com.drinkindex.domain.review.dto.ReviewRequest;
import com.drinkindex.domain.review.dto.ReviewResponse;
import com.drinkindex.domain.review.dto.UpdateReviewRequest;
import com.drinkindex.domain.review.entity.Review;
import com.drinkindex.domain.review.entity.enums.ReviewSort;
import com.drinkindex.domain.review.repository.ReviewRepository;
import com.drinkindex.domain.score.constant.ScoreActions;
import com.drinkindex.domain.score.service.ScoreService;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.util.BadWordFilter;
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
    private final ScoreService scoreService;
    private final BadWordFilter badWordFilter;

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

        // [패치 5] 리뷰 코멘트 욕설 필터 (기존 누락 영역)
        badWordFilter.validate(request.comment());

        Review review = Review.builder()
                .spirit(spirit)
                .user(user)
                .noseScore(request.noseScore())
                .tasteScore(request.tasteScore())
                .finishScore(request.finishScore())
                .noseNote(request.noseNote())
                .tasteNote(request.tasteNote())
                .finishNote(request.finishNote())
                .comment(request.comment())
                .noseAromaWheelNotes(request.noseAromaWheelNotes())
                .tasteAromaWheelNotes(request.tasteAromaWheelNotes())
                .finishAromaWheelNotes(request.finishAromaWheelNotes())
                .build();

        Review saved = reviewRepository.save(review);
        recalculateAvgScore(spiritId);

        // [레벨] 술 상세 리뷰 작성 점수 지급
        scoreService.award(userId, ScoreActions.SPIRIT_REVIEW_WRITE, "SPIRIT_REVIEW", saved.getId());

        return ReviewResponse.from(saved);
    }

    // ── 수정 ──────────────────────────────────────────────

    @Transactional
    public ReviewResponse updateReview(Long spiritId, Long reviewId, Long userId,
                                       UpdateReviewRequest request) {
        Review review = getReview(spiritId, reviewId);
        checkOwnership(review, userId);

        // [패치 5] 리뷰 수정 시 코멘트 욕설 필터 (기존 누락 영역)
        if (request.comment() != null) {
            badWordFilter.validate(request.comment());
        }

        review.update(
                request.noseScore()            != null ? request.noseScore()            : review.getNoseScore(),
                request.tasteScore()           != null ? request.tasteScore()           : review.getTasteScore(),
                request.finishScore()          != null ? request.finishScore()          : review.getFinishScore(),
                request.noseNote()             != null ? request.noseNote()             : review.getNoseNote(),
                request.tasteNote()            != null ? request.tasteNote()            : review.getTasteNote(),
                request.finishNote()           != null ? request.finishNote()           : review.getFinishNote(),
                request.comment()              != null ? request.comment()              : review.getComment(),
                request.noseAromaWheelNotes()  != null ? request.noseAromaWheelNotes()  : review.getNoseAromaWheelNotes(),
                request.tasteAromaWheelNotes() != null ? request.tasteAromaWheelNotes() : review.getTasteAromaWheelNotes(),
                request.finishAromaWheelNotes() != null ? request.finishAromaWheelNotes() : review.getFinishAromaWheelNotes()
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

        // [패치 1] 리뷰 삭제 시에도 지급액 차감 (기존: 차감 없음 → 파밍 가능했음).
        //          원래 지급액만큼만 회수, 익명·관리자였다면 0이라 자동 스킵.
        scoreService.deductByReference(userId, ScoreActions.SPIRIT_REVIEW_WRITE, "SPIRIT_REVIEW", reviewId);
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
        return userRepository.getByIdOrThrow(userId);
    }

    private void checkOwnership(Review review, Long userId) {
        if (!review.getUser().getId().equals(userId)) {
            throw new CustomException(ErrorCode.REVIEW_ACCESS_DENIED);
        }
    }
}
