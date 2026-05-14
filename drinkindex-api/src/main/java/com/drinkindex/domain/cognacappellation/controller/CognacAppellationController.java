package com.drinkindex.domain.cognacappellation.controller;

import com.drinkindex.domain.cognacappellation.dto.CognacAppellationResponse;
import com.drinkindex.domain.cognacappellation.service.CognacAppellationService;
import com.drinkindex.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cognac-appellations")
@RequiredArgsConstructor
public class CognacAppellationController {

    private final CognacAppellationService cognacAppellationService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<CognacAppellationResponse>>> search(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 50, sort = "nameKo") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(cognacAppellationService.search(keyword, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CognacAppellationResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(cognacAppellationService.findById(id)));
    }
}
