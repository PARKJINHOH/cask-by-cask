package com.drinkindex.admin.controller;

import com.drinkindex.admin.service.AdminScoreService;
import com.drinkindex.domain.score.dto.*;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminScoreController {

    private final AdminScoreService adminScoreService;

    // ─── 점수 설정 ──────────────────────────────────────────────────────────

    @GetMapping("/score-config")
    public ResponseEntity<ApiResponse<List<ScoreConfigResponse>>> getScoreConfigs() {
        return ResponseEntity.ok(ApiResponse.success(adminScoreService.getAllScoreConfigs()));
    }

    @PostMapping("/score-config")
    public ResponseEntity<ApiResponse<ScoreConfigResponse>> createScoreConfig(
            @Valid @RequestBody CreateScoreConfigRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(adminScoreService.createScoreConfig(request)));
    }

    @PatchMapping("/score-config/{id}")
    public ResponseEntity<ApiResponse<ScoreConfigResponse>> updateScoreConfig(
            @PathVariable Long id,
            @RequestBody UpdateScoreConfigRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminScoreService.updateScoreConfig(id, request)));
    }

    @DeleteMapping("/score-config/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteScoreConfig(@PathVariable Long id) {
        adminScoreService.deleteScoreConfig(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 레벨 설정 ──────────────────────────────────────────────────────────

    @GetMapping("/level-config")
    public ResponseEntity<ApiResponse<List<LevelConfigResponse>>> getLevelConfigs() {
        return ResponseEntity.ok(ApiResponse.success(adminScoreService.getAllLevelConfigs()));
    }

    @PostMapping("/level-config")
    public ResponseEntity<ApiResponse<LevelConfigResponse>> createLevelConfig(
            @Valid @RequestBody CreateLevelConfigRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(adminScoreService.createLevelConfig(request)));
    }

    @PatchMapping("/level-config/{id}")
    public ResponseEntity<ApiResponse<LevelConfigResponse>> updateLevelConfig(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLevelConfigRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminScoreService.updateLevelConfig(id, request)));
    }

    @DeleteMapping("/level-config/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteLevelConfig(@PathVariable Long id) {
        adminScoreService.deleteLevelConfig(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // [패치 11] 레벨 구간 변경 후 전체 회원 재계산 (수동 실행 버튼).
    //           응답: 레벨이 실제로 변경된 회원 수
    @PostMapping("/level-config/recalculate")
    public ResponseEntity<ApiResponse<Integer>> recalculateLevels() {
        return ResponseEntity.ok(ApiResponse.success(adminScoreService.recalculateAllLevels()));
    }

    // ─── 점수 이력 조회 ──────────────────────────────────────────────────────

    @GetMapping("/score-history")
    public ResponseEntity<ApiResponse<PageResponse<ScoreHistoryResponse>>> getScoreHistory(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(adminScoreService.getScoreHistory(userId, page, size))));
    }

    // ─── 관리자 수동 점수 조정 ───────────────────────────────────────────────

    @PostMapping("/score-adjust")
    public ResponseEntity<ApiResponse<Void>> adminAdjust(
            @Valid @RequestBody AdminAdjustRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        adminScoreService.adminAdjust(request, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
