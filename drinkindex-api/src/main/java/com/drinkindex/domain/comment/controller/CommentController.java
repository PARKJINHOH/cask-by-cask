package com.drinkindex.domain.comment.controller;

import com.drinkindex.domain.comment.dto.CommentRequest;
import com.drinkindex.domain.comment.dto.CommentResponse;
import com.drinkindex.domain.comment.dto.UpdateCommentRequest;
import com.drinkindex.domain.comment.service.CommentService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // ── /api/spirits/{spiritId}/comments ──────────────────

    @GetMapping("/api/spirits/{spiritId}/comments")
    public ResponseEntity<ApiResponse<Page<CommentResponse>>> getComments(
            @PathVariable Long spiritId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.getComments(spiritId, pageable)));
    }

    @PostMapping("/api/spirits/{spiritId}/comments")
    public ResponseEntity<ApiResponse<CommentResponse>> createComment(
            @PathVariable Long spiritId,
            @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                commentService.createComment(spiritId, userDetails.getUserId(), request)));
    }

    @PatchMapping("/api/spirits/{spiritId}/comments/{commentId}")
    public ResponseEntity<ApiResponse<CommentResponse>> updateComment(
            @PathVariable Long spiritId,
            @PathVariable Long commentId,
            @Valid @RequestBody UpdateCommentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.updateComment(spiritId, commentId,
                        userDetails.getUserId(), request)));
    }

    @DeleteMapping("/api/spirits/{spiritId}/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long spiritId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        commentService.deleteComment(spiritId, commentId,
                userDetails.getUserId(), userDetails.getRole());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── /api/comments/{commentId}/likes ───────────────────

    @PostMapping("/api/comments/{commentId}/likes")
    public ResponseEntity<ApiResponse<Void>> toggleLike(
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        commentService.toggleLike(commentId, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
