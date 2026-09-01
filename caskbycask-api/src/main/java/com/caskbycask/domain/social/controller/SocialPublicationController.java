package com.caskbycask.domain.social.controller;

import com.caskbycask.domain.social.dto.SocialPublicationResponse;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.social.service.SocialPublishRequestService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/social-publications")
@RequiredArgsConstructor
public class SocialPublicationController {

    private static final int MAX_SOURCE_IDS = 50;

    private final SocialPublishRequestService publishRequestService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<PageResponse<SocialPublicationResponse>>> myHistory(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                publishRequestService.myHistory(user.getUserId(), page, size))));
    }

    @GetMapping("/source/{type}/{sourceId}")
    public ResponseEntity<ApiResponse<List<SocialPublicationResponse>>> states(
            @PathVariable SocialSourceType type,
            @PathVariable Long sourceId,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(
                publishRequestService.states(type, sourceId, user.getUserId(), isAdmin(user))));
    }

    /**
     * 원본 여러 건의 게시 상태를 한 번에 조회한다 — 목록 화면이 카드마다 위 엔드포인트를 부르면 N+1 이 된다.
     * 한 페이지 분량만 허용하도록 ID 개수를 제한한다.
     */
    @GetMapping("/sources")
    public ResponseEntity<ApiResponse<Map<Long, List<SocialPublicationResponse>>>> statesBySources(
            @RequestParam SocialSourceType type,
            @RequestParam List<Long> ids,
            @AuthenticationPrincipal CustomUserDetails user) {
        List<Long> limited = ids.stream()
                .filter(Objects::nonNull)
                .distinct()
                .limit(MAX_SOURCE_IDS)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(
                publishRequestService.statesBySourceIds(type, limited, user.getUserId(), isAdmin(user))));
    }

    private boolean isAdmin(CustomUserDetails user) {
        return user.getRole() == com.caskbycask.domain.user.entity.enums.Role.SUPER_ADMIN
                || user.getRole() == com.caskbycask.domain.user.entity.enums.Role.ADMIN;
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<ApiResponse<SocialPublicationResponse>> retry(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(
                publishRequestService.retry(id, user.getUserId(), false)));
    }
}
