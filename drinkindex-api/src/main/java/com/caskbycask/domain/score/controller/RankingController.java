package com.caskbycask.domain.score.controller;

import com.caskbycask.domain.score.dto.MyRankResponse;
import com.caskbycask.domain.score.dto.RankingResponse;
import com.caskbycask.domain.score.entity.enums.RankingPeriod;
import com.caskbycask.domain.score.service.RankingService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ranking")
@RequiredArgsConstructor
public class RankingController {

    private final RankingService rankingService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<RankingResponse>>> getRanking(
            @RequestParam(defaultValue = "ALL") RankingPeriod period,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(rankingService.getRanking(period, page, Math.min(size, 50)))));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<MyRankResponse>> getMyRank(
            @RequestParam(defaultValue = "ALL") RankingPeriod period,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                rankingService.getMyRank(userDetails.getUserId(), period)));
    }
}
