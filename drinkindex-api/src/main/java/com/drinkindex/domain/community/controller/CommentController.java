package com.drinkindex.domain.community.controller;

import com.drinkindex.domain.community.dto.CreateCommentRequest;
import com.drinkindex.domain.community.dto.PostCommentResponse;
import com.drinkindex.domain.community.dto.PostReportRequest;
import com.drinkindex.domain.community.dto.UpdateCommentRequest;
import com.drinkindex.domain.community.service.CommentService;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController("communityCommentController")
@RequestMapping("/api/posts/{postId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PostCommentResponse>>> getComments(
            @PathVariable Long postId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        Long userId = userDetails != null ? userDetails.getUserId() : null;
        Role currentRole = userDetails != null ? userDetails.getRole() : null;
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(commentService.getComments(postId, userId, currentRole, page, size))));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PostCommentResponse>> createComment(
            @PathVariable Long postId,
            @Valid @RequestBody CreateCommentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.createComment(postId, request, userDetails.getUserId())));
    }

    @PatchMapping("/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PostCommentResponse>> updateComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @Valid @RequestBody UpdateCommentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.updateComment(postId, commentId, request, userDetails.getUserId())));
    }

    @DeleteMapping("/{commentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        commentService.deleteComment(postId, commentId, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/{commentId}/reports")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> reportComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @RequestBody PostReportRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        commentService.reportComment(postId, commentId, request, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{commentId}/hide")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MODERATOR')")
    public ResponseEntity<ApiResponse<Void>> hideComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        User actor = userRepository.findById(userDetails.getUserId()).orElseThrow();
        commentService.hideComment(commentId, actor);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{commentId}/restore-hide")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MODERATOR')")
    public ResponseEntity<ApiResponse<Void>> restoreComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        User actor = userRepository.findById(userDetails.getUserId()).orElseThrow();
        commentService.restoreComment(commentId, actor);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
