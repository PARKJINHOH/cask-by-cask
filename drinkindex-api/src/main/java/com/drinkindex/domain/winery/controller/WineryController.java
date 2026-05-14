package com.drinkindex.domain.winery.controller;

import com.drinkindex.domain.winery.dto.WineryResponse;
import com.drinkindex.domain.winery.service.WineryService;
import com.drinkindex.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wineries")
@RequiredArgsConstructor
public class WineryController {

    private final WineryService wineryService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<WineryResponse>>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String country,
            @PageableDefault(size = 20, sort = "nameKo") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(wineryService.search(keyword, country, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WineryResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(wineryService.findById(id)));
    }
}
