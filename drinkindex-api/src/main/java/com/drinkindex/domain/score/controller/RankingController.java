package com.drinkindex.domain.score.controller;

import com.drinkindex.domain.score.dto.MyRankResponse;
import com.drinkindex.domain.score.dto.RankingResponse;
import com.drinkindex.domain.score.entity.enums.RankingPeriod;
import com.drinkindex.domain.score.service.RankingService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
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
    public ResponseEntity<ApiResponse<Page<RankingResponse>>> getRanking(
            @RequestParam(defaultValue = "ALL") RankingPeriod period,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                rankingService.getRanking(period, page, Math.min(size, 50))));
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
