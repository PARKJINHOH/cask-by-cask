package com.caskbycask.domain.review.service;

import com.caskbycask.domain.review.dto.*;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.entity.ReviewImage;
import com.caskbycask.domain.review.entity.enums.ReviewSort;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.score.constant.ScoreActions;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.social.dto.SocialPublishSelection;
import com.caskbycask.domain.social.service.SocialPublishRequestService;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.BadWordFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final SpiritRepository spiritRepository;
    private final UserRepository userRepository;
    private final ScoreService scoreService;
    private final BadWordFilter badWordFilter;
    private final SocialPublishRequestService socialPublishRequestService;
    private final ReviewImageService reviewImageService;

    // ── 조회 ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getReviews(Long spiritId, ReviewSort sort, Pageable pageable) {
        Sort dataSort = switch (sort != null ? sort : ReviewSort.LATEST) {
            case SCORE_DESC -> Sort.by(Sort.Direction.DESC, "totalScore");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), dataSort);
        return withImages(reviewRepository.findBySpiritForDisplay(spiritId, sorted));
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getMyReviews(Long userId, Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return withImages(reviewRepository.findByUserIdWithUser(userId, sorted));
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getPublicUserReviews(Long userId, Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return withImages(reviewRepository.findPublicByUserId(userId, sorted));
    }

    @Transactional(readOnly = true)
    public Page<ReviewEmbedResponse> getMyReviewEmbeds(Long userId, Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return reviewRepository.findEmbeddableByUserId(userId, sorted)
                .map(ReviewEmbedResponse::from);
    }

    // ── 작성 ──────────────────────────────────────────────

    @Transactional
    public ReviewResponse createReview(Long spiritId, Long userId, ReviewRequest request) {
        return createReview(spiritId, userId, request, List.of());
    }

    @Transactional
    public ReviewResponse createReview(Long spiritId, Long userId, ReviewRequest request,
                                       List<MultipartFile> images) {
        Spirit spirit = spiritRepository.findByIdAndStatus(spiritId, SpiritStatus.ACTIVE)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        User user = getUser(userId);

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
        List<ReviewImage> savedImages = reviewImageService.saveForReview(saved, images);
        recalculateAvgScore(spiritId);

        // [레벨] 술 상세 리뷰 작성 점수 지급
        scoreService.award(userId, ScoreActions.SPIRIT_REVIEW_WRITE, "SPIRIT_REVIEW", saved.getId());
        socialPublishRequestService.requestReview(saved, user, request.socialPublish());

        return toResponse(saved, savedImages);
    }

    // ── 수정 ──────────────────────────────────────────────

    @Transactional
    public ReviewResponse updateReview(Long spiritId, Long reviewId, Long userId,
                                       UpdateReviewRequest request) {
        return updateReview(spiritId, reviewId, userId, request, null, List.of());
    }

    @Transactional
    public ReviewResponse updateReview(Long spiritId, Long reviewId, Long userId,
                                       UpdateReviewRequest request,
                                       List<ReviewImagePlanItem> imagePlan,
                                       List<MultipartFile> images) {
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
        List<ReviewImage> updatedImages =
                reviewImageService.replaceForReview(review, imagePlan, images);
        recalculateAvgScore(review.getSpirit().getId());

        return toResponse(review, updatedImages);
    }

    @Transactional
    public void requestInitialSocialPublications(Long spiritId, Long reviewId, Long userId,
                                                 SocialPublishSelection selection) {
        Review review = reviewRepository.findByIdForSocialPublish(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));
        validateReviewSpirit(review, spiritId);
        checkOwnership(review, userId);
        if (!Boolean.TRUE.equals(review.getLegacySocialPublishAllowed())) {
            throw new CustomException(ErrorCode.SOCIAL_INITIAL_PUBLISH_NOT_ALLOWED);
        }
        socialPublishRequestService.requestMissingReviewPlatforms(review, review.getUser(), selection);
    }

    // ── 삭제 ──────────────────────────────────────────────

    @Transactional
    public void deleteReview(Long spiritId, Long reviewId, Long userId) {
        Review review = getReview(spiritId, reviewId);
        checkOwnership(review, userId);

        review.softDelete();
        socialPublishRequestService.markSourceDeleted(SocialSourceType.REVIEW, reviewId);
        reviewImageService.deleteForReview(reviewId);
        recalculateAvgScore(review.getSpirit().getId());

        // [패치 1] 리뷰 삭제 시에도 지급액 차감 (기존: 차감 없음 → 파밍 가능했음).
        //          원래 지급액만큼만 회수, 익명·관리자였다면 0이라 자동 스킵.
        scoreService.deductByReference(userId, ScoreActions.SPIRIT_REVIEW_WRITE, "SPIRIT_REVIEW", reviewId);
    }

    // ── avgScore 재계산 ────────────────────────────────────

    public void recalculateAvgScore(Long spiritId) {
        Spirit spirit = spiritRepository.findById(spiritId)
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        recalculateSingleSpirit(spirit);

        if (spirit.getParent() != null) {
            recalculateSingleSpirit(spirit.getParent());
        }
    }

    private void recalculateSingleSpirit(Spirit spirit) {
        Long id = spirit.getId();
        boolean isMaster = spirit.getParent() == null;

        BigDecimal avg;
        int count;

        if (isMaster) {
            avg = reviewRepository.findAvgScoreForMasterSpirit(id)
                    .map(d -> BigDecimal.valueOf(d).setScale(1, RoundingMode.HALF_UP))
                    .orElse(null);
            count = (int) reviewRepository.countActiveForMasterSpirit(id);
        } else {
            avg = reviewRepository.findAvgScoreBySpiritId(id)
                    .map(d -> BigDecimal.valueOf(d).setScale(1, RoundingMode.HALF_UP))
                    .orElse(null);
            count = (int) reviewRepository.countActiveBySpiritId(id);
        }

        spirit.updateAvgScore(avg, count);
    }

    // ── Private helpers ────────────────────────────────────

    private ReviewResponse toResponse(Review review) {
        return toResponse(review, reviewImageService.findByReviewId(review.getId()));
    }

    private ReviewResponse toResponse(Review review, List<ReviewImage> images) {
        Long userId = review.getUser().getId();
        Long spiritId = review.getSpirit().getId();
        Long masterSpiritId = review.getSpirit().getParent() != null ?
                review.getSpirit().getParent().getId() : spiritId;

        List<Review> userReviews = reviewRepository.findReviewsByUserAndMasterSpirit(userId, masterSpiritId);
        int count = userReviews.size();
        int index = 0;

        if (review.getId() != null) {
            for (int i = 0; i < count; i++) {
                if (review.getId().equals(userReviews.get(i).getId())) {
                    index = i + 1;
                    break;
                }
            }
        }

        if (index == 0) {
            count = count + 1;
            index = count;
        }

        return ReviewResponse.from(
                review,
                index,
                count,
                images.stream().map(ReviewImageResponse::from).toList()
        );
    }

    private Page<ReviewResponse> withImages(Page<Review> page) {
        Map<Long, List<ReviewImage>> imagesByReview = reviewImageService.findByReviewIds(
                page.getContent().stream().map(Review::getId).toList());
        return page.map(review ->
                toResponse(review, imagesByReview.getOrDefault(review.getId(), List.of())));
    }

    private Review getReview(Long spiritId, Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));

        validateReviewSpirit(review, spiritId);
        return review;
    }

    private void validateReviewSpirit(Review review, Long spiritId) {
        Long actualSpiritId = review.getSpirit().getId();
        Long parentSpiritId = review.getSpirit().getParent() != null ?
                review.getSpirit().getParent().getId() : null;

        if (!actualSpiritId.equals(spiritId) && !spiritId.equals(parentSpiritId)) {
            throw new CustomException(ErrorCode.REVIEW_NOT_FOUND);
        }
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
