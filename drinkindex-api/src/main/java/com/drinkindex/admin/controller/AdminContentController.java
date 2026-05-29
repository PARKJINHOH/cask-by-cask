package com.drinkindex.admin.controller;

import com.drinkindex.admin.service.AdminContentService;
import com.drinkindex.domain.comment.dto.AdminCommentResponse;
import com.drinkindex.domain.review.dto.AdminReviewResponse;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class AdminContentController {

    private final AdminContentService adminContentService;

    // ── 리뷰 ──────────────────────────────────────────────

    @GetMapping("/api/admin/reviews")
    public ResponseEntity<ApiResponse<PageResponse<AdminReviewResponse>>> getReviews(
            @RequestParam(required = false) Boolean isHidden,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(adminContentService.getReviews(isHidden, pageable))));
    }

    @DeleteMapping("/api/admin/reviews/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteReview(@PathVariable Long id) {
        adminContentService.deleteReview(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/api/admin/reviews/{id}/restore")
    public ResponseEntity<ApiResponse<Void>> restoreReview(@PathVariable Long id) {
        adminContentService.restoreReview(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 댓글 ──────────────────────────────────────────────

    @GetMapping("/api/admin/comments")
    public ResponseEntity<ApiResponse<PageResponse<AdminCommentResponse>>> getComments(
            @RequestParam(required = false) Boolean isHidden,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(adminContentService.getComments(isHidden, pageable))));
    }

    @DeleteMapping("/api/admin/comments/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable Long id) {
        adminContentService.deleteComment(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/api/admin/comments/{id}/restore")
    public ResponseEntity<ApiResponse<Void>> restoreComment(@PathVariable Long id) {
        adminContentService.restoreComment(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
