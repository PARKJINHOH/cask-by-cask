package com.drinkindex.admin.controller;

import com.drinkindex.domain.cognacappellation.dto.CognacAppellationResponse;
import com.drinkindex.domain.cognacappellation.dto.CreateCognacAppellationRequest;
import com.drinkindex.domain.cognacappellation.dto.UpdateCognacAppellationRequest;
import com.drinkindex.domain.cognacappellation.service.CognacAppellationService;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/cognac-appellations")
@RequiredArgsConstructor
public class AdminCognacAppellationController {

    private final CognacAppellationService cognacAppellationService;

    @PostMapping
    public ResponseEntity<ApiResponse<CognacAppellationResponse>> create(
            @Valid @RequestBody CreateCognacAppellationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(cognacAppellationService.create(request)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<CognacAppellationResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCognacAppellationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cognacAppellationService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        cognacAppellationService.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
