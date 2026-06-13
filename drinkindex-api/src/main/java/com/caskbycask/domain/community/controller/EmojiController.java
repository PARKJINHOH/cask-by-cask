package com.caskbycask.domain.community.controller;

import com.caskbycask.domain.community.dto.EmojiReactionRequest;
import com.caskbycask.domain.community.dto.EmojiReactionToggleResponse;
import com.caskbycask.domain.community.dto.EmojiResponse;
import com.caskbycask.domain.community.service.EmojiService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class EmojiController {

    private final EmojiService emojiService;

    // ─── 공개: 활성 이모지 목록 ──────────────────

    @GetMapping("/api/emojis")
    public ResponseEntity<ApiResponse<List<EmojiResponse>>> getEmojis() {
        return ResponseEntity.ok(ApiResponse.success(emojiService.getActiveEmojis()));
    }

    // ─── 이모지 반응 토글 ─────────────────────────

    @PostMapping("/api/comments/{commentId}/reactions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<EmojiReactionToggleResponse>> toggleReaction(
            @PathVariable Long commentId,
            @Valid @RequestBody EmojiReactionRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                emojiService.toggleReaction(commentId, request.getEmojiId(), userDetails.getUserId())));
    }
}
