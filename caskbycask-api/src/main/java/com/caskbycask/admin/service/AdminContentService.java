package com.caskbycask.admin.service;

import com.caskbycask.domain.comment.dto.AdminCommentResponse;
import com.caskbycask.domain.comment.entity.CommunityComment;
import com.caskbycask.domain.comment.repository.CommentRepository;
import com.caskbycask.domain.community.entity.enums.NotificationType;
import com.caskbycask.domain.community.service.NotificationService;
import com.caskbycask.domain.review.dto.ModerationRequest;
import com.caskbycask.domain.review.dto.AdminReviewResponse;
import com.caskbycask.domain.review.dto.ReviewImageResponse;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.entity.ReviewImage;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.review.service.ReviewImageService;
import com.caskbycask.domain.review.service.ReviewService;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.social.service.SocialPublishRequestService;
import com.caskbycask.domain.translation.service.TranslationCacheInvalidator;
import com.caskbycask.global.email.EmailSender;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminContentService {

    private static final String TARGET_MY_REVIEWS = "MY_REVIEWS";
    private static final String TARGET_SPIRIT = "SPIRIT";

    private final ReviewRepository reviewRepository;
    private final ReviewImageService reviewImageService;
    private final CommentRepository commentRepository;
    private final ReviewService reviewService;
    private final SocialPublishRequestService socialPublishRequestService;
    private final EmailSender emailSender;
    private final NotificationService notificationService;
    private final TranslationCacheInvalidator translationCacheInvalidator;

    // ── 리뷰 관리 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<AdminReviewResponse> getReviews(Boolean isHidden, Long spiritId, Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Review> reviews = reviewRepository.findForAdmin(isHidden, spiritId, sorted);
        Map<Long, List<ReviewImage>> imagesByReview = reviewImageService.findByReviewIds(
                reviews.getContent().stream().map(Review::getId).toList());
        return reviews.map(review -> AdminReviewResponse.from(
                review,
                imagesByReview.getOrDefault(review.getId(), List.of()).stream()
                        .map(ReviewImageResponse::from)
                        .toList()));
    }

    @Transactional
    public void hideReview(Long reviewId, ModerationRequest request) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));

        review.hide();
        translationCacheInvalidator.invalidateReview(reviewId);
        reviewService.recalculateAvgScore(review.getSpirit().getId());
        sendReviewModerationEmailIfNeeded(review, request, "리뷰 노출 제한 안내", "숨김 처리");
        sendReviewModerationNotification(review, "리뷰가 운영 정책에 따라 숨김 처리되었습니다.", moderationReason(request), TARGET_MY_REVIEWS);
    }

    @Transactional
    public void unhideReview(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));

        review.unhide();
        translationCacheInvalidator.invalidateReview(reviewId);
        reviewService.recalculateAvgScore(review.getSpirit().getId());
        sendReviewSystemNotification(review, "리뷰 노출 제한이 해제되었습니다.", TARGET_SPIRIT);
    }

    @Transactional
    public void deleteReview(Long reviewId, ModerationRequest request) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));

        Long spiritId = review.getSpirit().getId();
        review.softDelete();
        translationCacheInvalidator.invalidateReview(reviewId);
        socialPublishRequestService.markSourceDeleted(SocialSourceType.REVIEW, reviewId);
        reviewImageService.deleteForReview(reviewId);
        reviewService.recalculateAvgScore(spiritId);
        sendReviewModerationEmailIfNeeded(review, request, "리뷰 삭제 안내", "삭제 처리");
        sendReviewModerationNotification(review, "리뷰가 운영 정책에 따라 삭제 처리되었습니다.", moderationReason(request), TARGET_MY_REVIEWS);
    }

    @Transactional
    public void restoreReview(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));

        review.unhide();
        translationCacheInvalidator.invalidateReview(reviewId);
        reviewService.recalculateAvgScore(review.getSpirit().getId());
        sendReviewSystemNotification(review, "리뷰가 복구되었습니다.", TARGET_SPIRIT);
    }

    private void sendReviewModerationEmailIfNeeded(Review review, ModerationRequest request, String title, String actionLabel) {
        if (request == null || !request.shouldSendEmail()) return;
        String to = review.getUser().getEmail();
        if (to == null || to.isBlank()) return;
        String reason = moderationReason(request);
        String html = """
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
                  <h2>%s</h2>
                  <p>%s에 작성하신 리뷰가 %s되었습니다.</p>
                  <p><strong>사유:</strong> %s</p>
                  <p>문의가 필요하시면 서비스 문의를 이용해주세요.</p>
                </div>
                """.formatted(
                escape(title),
                escape(review.getSpirit().getNameKo()),
                escape(actionLabel),
                escape(reason)
        );
        try {
            emailSender.sendHtml(to, "[CaskByCask] " + title, html);
        } catch (Exception e) {
            log.warn("Failed to send review moderation email: to={}", to, e);
        }
    }

    private void sendReviewModerationNotification(
            Review review,
            String summary,
            String reason,
            String targetType
    ) {
        notificationService.send(
                review.getUser(),
                NotificationType.SYSTEM,
                review.getSpirit().getNameKo() + " " + summary + " 사유: " + reason,
                targetType,
                TARGET_SPIRIT.equals(targetType) ? review.getSpirit().getId() : review.getId()
        );
    }

    private void sendReviewSystemNotification(Review review, String summary, String targetType) {
        notificationService.send(
                review.getUser(),
                NotificationType.SYSTEM,
                review.getSpirit().getNameKo() + " " + summary,
                targetType,
                TARGET_SPIRIT.equals(targetType) ? review.getSpirit().getId() : review.getId()
        );
    }

    private String moderationReason(ModerationRequest request) {
        return request != null && request.reason() != null && !request.reason().isBlank()
                ? request.reason().trim()
                : "운영 정책에 따라 처리되었습니다.";
    }

    private String escape(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    // ── 댓글 관리 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<AdminCommentResponse> getComments(Boolean isHidden, Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return commentRepository.findForAdmin(isHidden, sorted)
                .map(AdminCommentResponse::from);
    }

    @Transactional
    public void deleteComment(Long commentId) {
        CommunityComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
        comment.softDelete();
    }

    @Transactional
    public void restoreComment(Long commentId) {
        CommunityComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
        comment.unhide();
    }
}
