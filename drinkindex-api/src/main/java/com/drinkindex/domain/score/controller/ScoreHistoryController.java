package com.drinkindex.domain.score.controller;

import com.drinkindex.domain.score.dto.LevelConfigResponse;
import com.drinkindex.domain.score.dto.ScoreHistoryResponse;
import com.drinkindex.domain.score.repository.MemberLevelConfigRepository;
import com.drinkindex.domain.score.repository.ScoreHistoryRepository;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/score-history")
@RequiredArgsConstructor
public class ScoreHistoryController {

    private final ScoreHistoryRepository scoreHistoryRepository;
    private final MemberLevelConfigRepository memberLevelConfigRepository;

    /**
     * 본인 점수 이력 조회.
     * type=EARN → score > 0 (적립)
     * type=DEDUCT → score < 0 (차감)
     * type 생략 → 전체
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Page<ScoreHistoryResponse>>> getMyHistory(
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Long userId = userDetails.getUserId();
        PageRequest pageable = PageRequest.of(page, size);

        Page<ScoreHistoryResponse> result = switch (type != null ? type.toUpperCase() : "") {
            case "EARN" ->
                scoreHistoryRepository
                    .findByUserIdAndScoreGreaterThanOrderByCreatedAtDesc(userId, 0, pageable)
                    .map(ScoreHistoryResponse::from);
            case "DEDUCT" ->
                scoreHistoryRepository
                    .findByUserIdAndScoreLessThanOrderByCreatedAtDesc(userId, 0, pageable)
                    .map(ScoreHistoryResponse::from);
            default ->
                scoreHistoryRepository
                    .findByUserIdOrderByCreatedAtDesc(userId, pageable)
                    .map(ScoreHistoryResponse::from);
        };

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/level-config")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<LevelConfigResponse>>> getLevelConfigs() {
        List<LevelConfigResponse> levels = memberLevelConfigRepository
                .findAllByOrderByLevelAsc()
                .stream()
                .map(LevelConfigResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(levels));
    }
}
