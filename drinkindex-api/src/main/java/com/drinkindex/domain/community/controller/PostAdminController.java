package com.drinkindex.domain.community.controller;

import com.drinkindex.domain.community.dto.AdminDeletePostRequest;
import com.drinkindex.domain.community.dto.PostDetailResponse;
import com.drinkindex.domain.community.dto.PostReportAdminResponse;
import com.drinkindex.domain.community.dto.UpdateReportCountRequest;
import jakarta.validation.Valid;
import com.drinkindex.domain.community.entity.enums.ReportStatus;
import com.drinkindex.domain.community.service.CommentService;
import com.drinkindex.domain.community.service.PostService;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/posts")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class PostAdminController {

    private final PostService postService;
    private final CommentService commentService;
    private final UserRepository userRepository;

    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<PageResponse<PostReportAdminResponse>>> getReports(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(postService.getReports(status, page, size))));
    }

    @GetMapping("/reports/pending-count")
    public ResponseEntity<ApiResponse<Long>> reportsPendingCount() {
        return ResponseEntity.ok(ApiResponse.success(postService.countPendingReports()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable Long id,
            @RequestBody(required = false) AdminDeletePostRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        String reason = request != null ? request.getDeleteReason() : null;
        postService.adminDeletePost(id, userDetails.getUserId(), reason);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/{deletedPostId}/restore")
    public ResponseEntity<ApiResponse<PostDetailResponse>> restore(@PathVariable Long deletedPostId) {
        return ResponseEntity.ok(ApiResponse.success(postService.restorePost(deletedPostId)));
    }

    @PatchMapping("/{id}/unlock")
    public ResponseEntity<ApiResponse<Void>> unlock(@PathVariable Long id) {
        postService.unlockPost(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // 신고된 게시글 숨김 처리 (비관리자 내용 마스킹 + 목록 제외)
    @PatchMapping("/{id}/hide")
    public ResponseEntity<ApiResponse<Void>> hidePost(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        User actor = userRepository.findById(userDetails.getUserId()).orElseThrow();
        postService.hidePost(id, actor);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // 게시글 숨김해제 — 자동 잠금(LOCKED) + 수동 숨김(isHidden) 모두 해제
    @PatchMapping("/{id}/restore-hide")
    public ResponseEntity<ApiResponse<Void>> restorePostHide(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        User actor = userRepository.findById(userDetails.getUserId()).orElseThrow();
        postService.unhidePost(id, actor);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // 게시글 신고 횟수 수동 조정
    @PatchMapping("/{id}/report-count")
    public ResponseEntity<ApiResponse<Void>> updatePostReportCount(
            @PathVariable Long id,
            @Valid @RequestBody UpdateReportCountRequest request
    ) {
        postService.updateReportCount(id, request.getCount());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 신고된 댓글 처리 ────────────────────────────────

    @PatchMapping("/comments/{commentId}/hide")
    public ResponseEntity<ApiResponse<Void>> hideComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        User actor = userRepository.findById(userDetails.getUserId()).orElseThrow();
        commentService.hideComment(commentId, actor);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/comments/{commentId}/restore-hide")
    public ResponseEntity<ApiResponse<Void>> restoreComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        User actor = userRepository.findById(userDetails.getUserId()).orElseThrow();
        commentService.restoreComment(commentId, actor);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // 신고된 댓글 삭제 (soft delete)
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        User actor = userRepository.findById(userDetails.getUserId()).orElseThrow();
        commentService.adminDeleteComment(commentId, actor);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // 댓글 신고 횟수 수동 조정
    @PatchMapping("/comments/{commentId}/report-count")
    public ResponseEntity<ApiResponse<Void>> updateCommentReportCount(
            @PathVariable Long commentId,
            @Valid @RequestBody UpdateReportCountRequest request
    ) {
        commentService.updateReportCount(commentId, request.getCount());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
