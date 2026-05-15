package com.drinkindex.domain.community.controller;

import com.drinkindex.domain.community.dto.PollResponse;
import com.drinkindex.domain.community.dto.VoteRequest;
import com.drinkindex.domain.community.service.PollService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/polls")
@RequiredArgsConstructor
public class PollController {

    private final PollService pollService;

    @GetMapping("/{pollId}")
    public ResponseEntity<ApiResponse<PollResponse>> getPoll(
            @PathVariable Long pollId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long userId = userDetails != null ? userDetails.getUserId() : null;
        return ResponseEntity.ok(ApiResponse.success(pollService.getPoll(pollId, userId)));
    }

    @PostMapping("/{pollId}/votes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PollResponse>> vote(
            @PathVariable Long pollId,
            @Valid @RequestBody VoteRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                pollService.vote(pollId, request, userDetails.getUserId())));
    }
}
