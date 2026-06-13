package com.caskbycask.domain.feedback.controller;

import com.caskbycask.domain.feedback.dto.*;
import com.caskbycask.domain.feedback.entity.enums.FeedbackStatus;
import com.caskbycask.domain.feedback.service.FeedbackService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * 개선·문의 (이슈 트래커형 게시판).
 * - 모든 엔드포인트 로그인 필수 (SecurityConfig anyRequest().authenticated()).
 * - 일반 회원: 본인 글만 / 관리자(SUPER_ADMIN·ADMIN): 전체 + 상태 변경.
 * - 상태/진척률 변경(PATCH /{id}/status)은 SecurityConfig 에서 관리자 역할로 제한.
 */
@RestController
@RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<Map<String, Long>>> create(
            @Valid @RequestPart("data") FeedbackCreateRequest request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long id = feedbackService.create(userDetails.getUserId(), request, images);
        return ResponseEntity.ok(ApiResponse.success(Map.of("id", id)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<FeedbackListResponse>>> list(
            @RequestParam(required = false) FeedbackStatus status,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "0") int page,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                feedbackService.list(userDetails.getUserId(), userDetails.getRole(), status, mine, page))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FeedbackDetailResponse>> detail(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                feedbackService.detail(userDetails.getUserId(), userDetails.getRole(), id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> update(
            @PathVariable Long id,
            @Valid @RequestBody FeedbackUpdateRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        feedbackService.update(userDetails.getUserId(), id, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        feedbackService.delete(userDetails.getUserId(), id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<Void>> addComment(
            @PathVariable Long id,
            @Valid @RequestBody FeedbackCommentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        feedbackService.addComment(userDetails.getUserId(), userDetails.getRole(), id, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // 관리자 전용 (경로 권한은 SecurityConfig + 서비스단 이중 검증)
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateFeedbackStatusRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        feedbackService.changeStatus(userDetails.getRole(), id, request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
