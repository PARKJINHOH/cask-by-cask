package com.drinkindex.domain.distillery.controller;

import com.drinkindex.domain.distillery.dto.DistilleryResponse;
import com.drinkindex.domain.distillery.service.DistilleryService;
import com.drinkindex.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}
