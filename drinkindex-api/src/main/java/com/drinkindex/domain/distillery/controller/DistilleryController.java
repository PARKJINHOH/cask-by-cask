package com.drinkindex.domain.distillery.controller;

import com.drinkindex.domain.distillery.dto.DistilleryRegisterRequestBody;
import com.drinkindex.domain.distillery.dto.DistilleryRegisterRequestResponse;
import com.drinkindex.domain.distillery.dto.DistilleryResponse;
import com.drinkindex.domain.distillery.service.DistilleryService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/distilleries")
@RequiredArgsConstructor
public class DistilleryController {

    private final DistilleryService distilleryService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<DistilleryResponse>>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String country,
            @PageableDefault(size = 20, sort = "nameKo") Pageable pageable) {
        return ResponseEntity.ok(
                ApiResponse.success(distilleryService.search(keyword, country, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DistilleryResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(distilleryService.findById(id)));
    }

    // ── 등록 요청 (로그인 필요) ──────────────────────────────────

    @PostMapping("/requests")
    public ResponseEntity<ApiResponse<DistilleryRegisterRequestResponse>> submitRequest(
            @Valid @RequestBody DistilleryRegisterRequestBody body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                distilleryService.submitDistilleryRequest(body, userDetails.getUserId())));
    }

    @GetMapping("/requests/me")
    public ResponseEntity<ApiResponse<List<DistilleryRegisterRequestResponse>>> myRequests(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                distilleryService.getMyDistilleryRequests(userDetails.getUserId())));
    }
}
