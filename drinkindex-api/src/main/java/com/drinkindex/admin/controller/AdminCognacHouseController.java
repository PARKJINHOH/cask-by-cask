package com.drinkindex.admin.controller;

import com.drinkindex.domain.cognachouse.dto.CognacHouseResponse;
import com.drinkindex.domain.cognachouse.dto.CreateCognacHouseRequest;
import com.drinkindex.domain.cognachouse.dto.UpdateCognacHouseRequest;
import com.drinkindex.domain.cognachouse.service.CognacHouseService;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/cognac-houses")
@RequiredArgsConstructor
public class AdminCognacHouseController {

    private final CognacHouseService cognacHouseService;

    @PostMapping
    public ResponseEntity<ApiResponse<CognacHouseResponse>> create(
            @Valid @RequestBody CreateCognacHouseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(cognacHouseService.create(request)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<CognacHouseResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCognacHouseRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cognacHouseService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        cognacHouseService.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
