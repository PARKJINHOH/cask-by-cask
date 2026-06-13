package com.caskbycask.domain.pricetracker.controller;

import com.caskbycask.domain.pricetracker.dto.request.CreateStoreAliasRequest;
import com.caskbycask.domain.pricetracker.dto.request.CreateStoreRequest;
import com.caskbycask.domain.pricetracker.dto.request.MergeStoreRequest;
import com.caskbycask.domain.pricetracker.dto.request.UpdateStoreRequest;
import com.caskbycask.domain.pricetracker.dto.response.StoreAliasResponse;
import com.caskbycask.domain.pricetracker.dto.response.StoreResponse;
import com.caskbycask.domain.pricetracker.service.AdminStoreService;
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
@RequestMapping("/api/admin/stores")
@RequiredArgsConstructor
public class AdminStoreController {

    private final AdminStoreService adminStoreService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<StoreResponse>>> getStores(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isApproved,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                adminStoreService.getStores(keyword, isApproved, pageable)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StoreResponse>> createStore(
            @Valid @RequestBody CreateStoreRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminStoreService.createStore(request)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<StoreResponse>> updateStore(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStoreRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                adminStoreService.updateStore(id, request)));
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<StoreResponse>> approveStore(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                adminStoreService.approveStore(id, userDetails.getUserId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStore(@PathVariable Long id) {
        adminStoreService.deleteStore(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @GetMapping("/{id}/aliases")
    public ResponseEntity<ApiResponse<List<StoreAliasResponse>>> getAliases(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminStoreService.getAliases(id)));
    }

    @PostMapping("/{id}/aliases")
    public ResponseEntity<ApiResponse<StoreAliasResponse>> addAlias(
            @PathVariable Long id,
            @Valid @RequestBody CreateStoreAliasRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminStoreService.addAlias(id, request)));
    }

    @DeleteMapping("/aliases/{aliasId}")
    public ResponseEntity<ApiResponse<Void>> deleteAlias(@PathVariable Long aliasId) {
        adminStoreService.deleteAlias(aliasId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{suggestedId}/merge")
    public ResponseEntity<ApiResponse<Void>> mergeStore(
            @PathVariable Long suggestedId,
            @Valid @RequestBody MergeStoreRequest request) {
        adminStoreService.mergeStore(suggestedId, request);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
