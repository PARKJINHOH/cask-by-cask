package com.caskbycask.domain.review.controller;

import com.caskbycask.domain.review.dto.CreateVariantReviewRequest;
import com.caskbycask.domain.review.dto.ReviewRequest;
import com.caskbycask.domain.review.dto.ReviewResponse;
import com.caskbycask.domain.review.dto.ReviewImagePlanItem;
import com.caskbycask.domain.review.dto.UpdateReviewRequest;
import com.caskbycask.domain.review.dto.VariantReviewRequestResponse;
import com.caskbycask.domain.review.entity.enums.ReviewSort;
import com.caskbycask.domain.review.service.ReviewService;
import com.caskbycask.domain.review.service.VariantReviewRequestService;
import com.caskbycask.domain.social.dto.SocialPublishSelection;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

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

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @PathVariable Long spiritId,
            @Valid @RequestBody ReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                reviewService.createReview(spiritId, userDetails.getUserId(), request)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ReviewResponse>> createReviewWithImages(
            @PathVariable Long spiritId,
            @Valid @RequestPart("request") ReviewRequest request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                reviewService.createReview(
                        spiritId, userDetails.getUserId(), request,
                        images == null ? List.of() : images)));
    }

    @PostMapping(value = "/variant-request", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<VariantReviewRequestResponse>> createVariantReviewRequest(
            @PathVariable Long spiritId,
            @Valid @RequestBody CreateVariantReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                variantReviewRequestService.create(spiritId, userDetails.getUserId(), request)));
    }

    @PostMapping(value = "/variant-request", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<VariantReviewRequestResponse>> createVariantReviewRequestWithImages(
            @PathVariable Long spiritId,
            @Valid @RequestPart("request") CreateVariantReviewRequest request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                variantReviewRequestService.create(
                        spiritId, userDetails.getUserId(), request,
                        images == null ? List.of() : images)));
    }

    @PatchMapping(value = "/{reviewId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReview(
            @PathVariable Long spiritId,
            @PathVariable Long reviewId,
            @Valid @RequestBody UpdateReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                reviewService.updateReview(spiritId, reviewId, userDetails.getUserId(), request)));
    }

    @PatchMapping(value = "/{reviewId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReviewWithImages(
            @PathVariable Long spiritId,
            @PathVariable Long reviewId,
            @Valid @RequestPart("request") UpdateReviewRequest request,
            @RequestPart(value = "imagePlan", required = false) List<ReviewImagePlanItem> imagePlan,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                reviewService.updateReview(
                        spiritId, reviewId, userDetails.getUserId(), request, imagePlan,
                        images == null ? List.of() : images)));
    }

    @PostMapping("/{reviewId}/social-publications")
    public ResponseEntity<ApiResponse<Void>> requestInitialSocialPublications(
            @PathVariable Long spiritId,
            @PathVariable Long reviewId,
            @Valid @RequestBody SocialPublishSelection request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        reviewService.requestInitialSocialPublications(
                spiritId, reviewId, userDetails.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success());
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
