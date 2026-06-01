package com.drinkindex.domain.winery.controller;

import com.drinkindex.domain.winery.dto.WineryResponse;
import com.drinkindex.domain.winery.service.WineryService;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
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
    public ResponseEntity<ApiResponse<PageResponse<WineryResponse>>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String nameKo,
            @RequestParam(required = false) String nameEn,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Integer foundedYear,
            @PageableDefault(size = 20, sort = "nameKo") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                wineryService.search(keyword, nameKo, nameEn, country, foundedYear, pageable))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WineryResponse>> findById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(wineryService.findById(id)));
    }
}
