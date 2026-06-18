package com.caskbycask.domain.deal.controller;

import com.caskbycask.domain.deal.dto.CrawlerCookieRequest;
import com.caskbycask.domain.deal.dto.CrawlerCookieResponse;
import com.caskbycask.domain.deal.entity.CrawlerCookie;
import com.caskbycask.domain.deal.service.CrawlerCookieService;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class CrawlerCookieController {

    private final CrawlerCookieService crawlerCookieService;

    /**
     * 크롤러 전용 설정(쿠키) 조회 API.
     * 인증: {@code X-Internal-Key} 헤더 필터링.
     */
    @GetMapping("/api/internal/crawler-settings")
    public ResponseEntity<ApiResponse<CrawlerCookieResponse>> getCrawlerSettings() {
        CrawlerCookie cookies = crawlerCookieService.getCookies();
        return ResponseEntity.ok(ApiResponse.success(new CrawlerCookieResponse(cookies)));
    }

    /**
     * 관리자 전용 크롤러 설정(쿠키) 수정 API.
     * 인증: SUPER_ADMIN, ADMIN 역할이 필요 (SecurityConfig 에서 차단).
     */
    @PostMapping("/api/admin/crawler-settings")
    public ResponseEntity<ApiResponse<Void>> updateCrawlerSettings(
            @Valid @RequestBody CrawlerCookieRequest request
    ) {
        crawlerCookieService.updateCookies(request);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
