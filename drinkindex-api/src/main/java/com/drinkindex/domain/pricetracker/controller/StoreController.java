package com.drinkindex.domain.pricetracker.controller;

import com.drinkindex.domain.pricetracker.dto.request.SuggestStoreRequest;
import com.drinkindex.domain.pricetracker.dto.response.StoreSearchResponse;
import com.drinkindex.domain.pricetracker.entity.enums.StoreType;
import com.drinkindex.domain.pricetracker.service.StoreService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
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
        return ResponseEntity.ok(ApiResponse.success(
                storeService.searchStores(keyword, storeType, Math.min(limit, 30))));
    }

    @PostMapping("/suggest")
    public ResponseEntity<ApiResponse<StoreSearchResponse>> suggestStore(
            @Valid @RequestBody SuggestStoreRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                storeService.suggestStore(userDetails.getUserId(), request)));
    }
}
