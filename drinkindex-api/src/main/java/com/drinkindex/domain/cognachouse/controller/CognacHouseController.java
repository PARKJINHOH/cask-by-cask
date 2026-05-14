package com.drinkindex.domain.cognachouse.controller;

import com.drinkindex.domain.cognachouse.dto.CognacHouseResponse;
import com.drinkindex.domain.cognachouse.service.CognacHouseService;
import com.drinkindex.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cognac-houses")
@RequiredArgsConstructor
public class CognacHouseController {

    private final CognacHouseService cognacHouseService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<CognacHouseResponse>>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String country,
            @PageableDefault(size = 20, sort = "nameKo") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(cognacHouseService.search(keyword, country, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CognacHouseResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(cognacHouseService.findById(id)));
    }
}
