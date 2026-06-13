package com.caskbycask.domain.producer.controller;

import com.caskbycask.domain.producer.dto.ProducerRegisterRequestBody;
import com.caskbycask.domain.producer.dto.ProducerRegisterRequestResponse;
import com.caskbycask.domain.producer.dto.ProducerResponse;
import com.caskbycask.domain.producer.service.ProducerService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/producers")
@RequiredArgsConstructor
public class ProducerController {

    private final ProducerService producerService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProducerResponse>>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String nameKo,
            @RequestParam(required = false) String nameEn,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Integer foundedYear,
            @RequestParam(required = false) com.caskbycask.domain.producer.entity.ProducerType type,
            @PageableDefault(size = 20, sort = "nameKo") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                producerService.search(keyword, nameKo, nameEn, country, foundedYear, type, pageable))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProducerResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(producerService.findById(id)));
    }

    // ── 등록 요청 (로그인 필요) ──────────────────────────────────

    @PostMapping("/requests")
    public ResponseEntity<ApiResponse<ProducerRegisterRequestResponse>> submitRequest(
            @Valid @RequestBody ProducerRegisterRequestBody body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                producerService.submitProducerRequest(body, userDetails.getUserId())));
    }

    @GetMapping("/requests/me")
    public ResponseEntity<ApiResponse<List<ProducerRegisterRequestResponse>>> myRequests(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                producerService.getMyProducerRequests(userDetails.getUserId())));
    }
}
