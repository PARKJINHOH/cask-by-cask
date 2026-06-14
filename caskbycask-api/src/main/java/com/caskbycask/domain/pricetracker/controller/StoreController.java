package com.caskbycask.domain.pricetracker.controller;

import com.caskbycask.domain.pricetracker.dto.request.SuggestStoreRequest;
import com.caskbycask.domain.pricetracker.dto.response.StoreSearchResponse;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.pricetracker.service.StoreService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
public class StoreController {

    private final StoreService storeService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<StoreSearchResponse>>> searchStores(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(required = false) StoreType storeType,
            @RequestParam(required = false, defaultValue = "10") int limit) {
        // limit 하한 보정 — 0 이하가 들어오면 PageRequest.of 가 예외를 던지므로 [1,30] 으로 클램프
        return ResponseEntity.ok(ApiResponse.success(
                storeService.searchStores(keyword, storeType, Math.max(1, Math.min(limit, 30)))));
    }

    @PostMapping("/suggest")
    public ResponseEntity<ApiResponse<StoreSearchResponse>> suggestStore(
            @Valid @RequestBody SuggestStoreRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                storeService.suggestStore(userDetails.getUserId(), request)));
    }
}
