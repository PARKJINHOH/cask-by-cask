package com.drinkindex.admin.controller;

import com.drinkindex.domain.winery.dto.CreateWineryRequest;
import com.drinkindex.domain.winery.dto.UpdateWineryRequest;
import com.drinkindex.domain.winery.dto.WineryResponse;
import com.drinkindex.domain.winery.service.WineryService;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/wineries")
@RequiredArgsConstructor
public class AdminWineryController {

    private final WineryService wineryService;

    @PostMapping
    public ResponseEntity<ApiResponse<WineryResponse>> create(
            @Valid @RequestBody CreateWineryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(wineryService.create(request)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<WineryResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateWineryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(wineryService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        wineryService.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
