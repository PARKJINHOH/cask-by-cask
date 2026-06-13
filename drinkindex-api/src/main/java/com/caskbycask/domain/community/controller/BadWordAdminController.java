package com.caskbycask.domain.community.controller;

import com.caskbycask.domain.community.dto.BadWordResponse;
import com.caskbycask.domain.community.dto.CreateBadWordRequest;
import com.caskbycask.domain.community.service.BadWordService;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/bad-words")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class BadWordAdminController {

    private final BadWordService badWordService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<BadWordResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(badWordService.getAll(page, size))));
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
