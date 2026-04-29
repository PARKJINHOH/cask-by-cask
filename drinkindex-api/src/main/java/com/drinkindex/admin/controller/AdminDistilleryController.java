package com.drinkindex.admin.controller;

import com.drinkindex.domain.distillery.dto.CreateDistilleryRequest;
import com.drinkindex.domain.distillery.dto.DistilleryResponse;
import com.drinkindex.domain.distillery.dto.UpdateDistilleryRequest;
import com.drinkindex.domain.distillery.service.DistilleryService;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/distilleries")
@RequiredArgsConstructor
public class AdminDistilleryController {

    private final DistilleryService distilleryService;

    @PostMapping
    public ResponseEntity<ApiResponse<DistilleryResponse>> create(
            @Valid @RequestBody CreateDistilleryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(distilleryService.create(request)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<DistilleryResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDistilleryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(distilleryService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        distilleryService.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
