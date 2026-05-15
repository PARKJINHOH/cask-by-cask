package com.drinkindex.domain.community.controller;

import com.drinkindex.domain.community.dto.BadWordResponse;
import com.drinkindex.domain.community.dto.CreateBadWordRequest;
import com.drinkindex.domain.community.service.BadWordService;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/bad-words")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class BadWordAdminController {

    private final BadWordService badWordService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<BadWordResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(badWordService.getAll(page, size)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BadWordResponse>> create(
            @Valid @RequestBody CreateBadWordRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(badWordService.create(request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        badWordService.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<BadWordResponse>> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(badWordService.toggle(id)));
    }
}
