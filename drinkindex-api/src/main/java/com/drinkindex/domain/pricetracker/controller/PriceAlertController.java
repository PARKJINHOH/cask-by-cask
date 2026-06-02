package com.drinkindex.domain.pricetracker.controller;

import com.drinkindex.domain.pricetracker.dto.request.UpsertPriceAlertRequest;
import com.drinkindex.domain.pricetracker.dto.response.PriceAlertResponse;
import com.drinkindex.domain.pricetracker.service.PriceAlertService;
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
@RequestMapping("/api/price-alerts")
@RequiredArgsConstructor
public class PriceAlertController {

    private final PriceAlertService priceAlertService;

    @PostMapping
    public ResponseEntity<ApiResponse<PriceAlertResponse>> upsertPriceAlert(
            @Valid @RequestBody UpsertPriceAlertRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.OK).body(ApiResponse.success(
                priceAlertService.upsertPriceAlert(userDetails.getUserId(), request)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<PriceAlertResponse>>> getMyAlerts(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                priceAlertService.getMyAlerts(userDetails.getUserId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePriceAlert(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        priceAlertService.deletePriceAlert(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<PriceAlertResponse>> togglePriceAlert(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                priceAlertService.togglePriceAlert(id, userDetails.getUserId())));
    }
}
