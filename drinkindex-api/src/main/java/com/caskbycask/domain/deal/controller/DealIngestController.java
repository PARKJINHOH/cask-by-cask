package com.caskbycask.domain.deal.controller;

import com.caskbycask.domain.deal.dto.InternalDealRequest;
import com.caskbycask.domain.deal.service.DealIngestService;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 크롤러 전용 내부 수신 API.
 * 인증: {@code X-Internal-Key} 헤더 (InternalKeyAuthFilter 에서 검증). JWT 불필요.
 */
@RestController
@RequestMapping("/api/internal/deals")
@RequiredArgsConstructor
public class DealIngestController {

    private final DealIngestService dealIngestService;

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> ingest(@Valid @RequestBody InternalDealRequest request) {
        dealIngestService.ingest(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(null));
    }
}
