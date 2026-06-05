package com.drinkindex.domain.comment.controller;

import com.drinkindex.domain.comment.dto.CommentRequest;
import com.drinkindex.domain.comment.dto.CommentResponse;
import com.drinkindex.domain.comment.dto.UpdateCommentRequest;
import com.drinkindex.domain.comment.service.CommentService;
import com.drinkindex.domain.community.dto.EmojiReactionRequest;
import com.drinkindex.domain.community.dto.EmojiReactionToggleResponse;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // ── /api/spirits/{spiritId}/comments ──────────────────

    @GetMapping("/api/spirits/{spiritId}/comments")
    public ResponseEntity<ApiResponse<PageResponse<CommentResponse>>> getComments(
            @PathVariable Long spiritId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PageableDefault(size = 20) Pageable pageable) {
        // [패치 13] 로그인 사용자면 본인 반응 여부(isMyReaction) 계산용 userId 전달 (비회원 null)
        Long userId = userDetails != null ? userDetails.getUserId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(commentService.getComments(spiritId, userId, pageable))));
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

    // ── [패치 13] 술 상세 댓글 이모지 반응 토글 (post_comments용 API와 동일 패턴, targetType만 다름) ──
    @PostMapping("/api/spirit-comments/{commentId}/reactions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<EmojiReactionToggleResponse>> toggleReaction(
            @PathVariable Long commentId,
            @Valid @RequestBody EmojiReactionRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                commentService.toggleEmojiReaction(commentId, request.getEmojiId(), userDetails.getUserId())));
    }
}
