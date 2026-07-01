package com.caskbycask.domain.review.controller;

import com.caskbycask.domain.review.dto.CreateVariantReviewRequest;
import com.caskbycask.domain.review.dto.ReviewRequest;
import com.caskbycask.domain.review.dto.ReviewResponse;
import com.caskbycask.domain.review.dto.UpdateReviewRequest;
import com.caskbycask.domain.review.dto.VariantReviewRequestResponse;
import com.caskbycask.domain.review.entity.enums.ReviewSort;
import com.caskbycask.domain.review.service.ReviewService;
import com.caskbycask.domain.review.service.VariantReviewRequestService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/spirits/{spiritId}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;
    private final VariantReviewRequestService variantReviewRequestService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ReviewResponse>>> getReviews(
            @PathVariable Long spiritId,
            @RequestParam(required = false) ReviewSort sort,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(reviewService.getReviews(spiritId, sort, pageable))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @PathVariable Long spiritId,
            @Valid @RequestBody ReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                reviewService.createReview(spiritId, userDetails.getUserId(), request)));
    }

    @PostMapping("/variant-request")
    public ResponseEntity<ApiResponse<VariantReviewRequestResponse>> createVariantReviewRequest(
            @PathVariable Long spiritId,
            @Valid @RequestBody CreateVariantReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                variantReviewRequestService.create(spiritId, userDetails.getUserId(), request)));
    }

    @PatchMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReview(
            @PathVariable Long spiritId,
            @PathVariable Long reviewId,
            @Valid @RequestBody UpdateReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                reviewService.updateReview(spiritId, reviewId, userDetails.getUserId(), request)));
    }

    @DeleteMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable Long spiritId,
            @PathVariable Long reviewId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        reviewService.deleteReview(spiritId, reviewId, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
