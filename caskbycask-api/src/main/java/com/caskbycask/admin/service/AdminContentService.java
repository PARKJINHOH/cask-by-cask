package com.caskbycask.admin.service;

import com.caskbycask.domain.comment.dto.AdminCommentResponse;
import com.caskbycask.domain.comment.entity.CommunityComment;
import com.caskbycask.domain.comment.repository.CommentRepository;
import com.caskbycask.domain.review.dto.AdminReviewResponse;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.review.service.ReviewService;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminContentService {

    private final ReviewRepository reviewRepository;
    private final CommentRepository commentRepository;
    private final ReviewService reviewService;

    // ── 리뷰 관리 ──────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<AdminReviewResponse> getReviews(Boolean isHidden, Pageable pageable) {
        Pageable sorted = PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return reviewRepository.findForAdmin(isHidden, sorted)
                .map(AdminReviewResponse::from);
    }

    @Transactional
    public void deleteReview(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));

        Long spiritId = review.getSpirit().getId();
        review.softDelete();
        reviewService.recalculateAvgScore(spiritId);
    }

    @Transactional
    public void restoreReview(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_NOT_FOUND));

        review.unhide();
        reviewService.recalculateAvgScore(review.getSpirit().getId());
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
