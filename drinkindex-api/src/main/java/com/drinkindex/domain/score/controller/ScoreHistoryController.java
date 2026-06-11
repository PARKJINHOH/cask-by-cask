package com.drinkindex.domain.score.controller;

import com.drinkindex.domain.score.dto.LevelConfigResponse;
import com.drinkindex.domain.score.dto.ScoreHistoryResponse;
import com.drinkindex.domain.score.entity.ScoreHistory;
import com.drinkindex.domain.score.repository.MemberLevelConfigRepository;
import com.drinkindex.domain.score.repository.ScoreHistoryRepository;
import com.drinkindex.domain.score.service.ScoreHistoryLinkResolver;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
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
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/score-history")
@RequiredArgsConstructor
public class ScoreHistoryController {

    private final ScoreHistoryRepository scoreHistoryRepository;
    private final MemberLevelConfigRepository memberLevelConfigRepository;
    private final ScoreHistoryLinkResolver linkResolver;

    /**
     * 본인 점수 이력 조회.
     * type=EARN → score > 0 (적립)
     * type=DEDUCT → score < 0 (차감)
     * type 생략 → 전체
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<PageResponse<ScoreHistoryResponse>>> getMyHistory(
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Long userId = userDetails.getUserId();
        PageRequest pageable = PageRequest.of(page, size);

        Page<ScoreHistory> historyPage = switch (type != null ? type.toUpperCase() : "") {
            case "EARN" ->
                scoreHistoryRepository
                    .findByUserIdAndScoreGreaterThanOrderByCreatedAtDesc(userId, 0, pageable);
            case "DEDUCT" ->
                scoreHistoryRepository
                    .findByUserIdAndScoreLessThanOrderByCreatedAtDesc(userId, 0, pageable);
            default ->
                scoreHistoryRepository
                    .findByUserIdOrderByCreatedAtDesc(userId, pageable);
        };

        // 출처 링크를 한 페이지 단위로 배치 해석 (N+1 회피)
        Map<Long, String> links = linkResolver.resolveLinks(historyPage.getContent());
        Page<ScoreHistoryResponse> result = historyPage
                .map(h -> ScoreHistoryResponse.from(h, links.get(h.getId())));

        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(result)));
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
