package com.drinkindex.domain.nicknamebadword.controller;

import com.drinkindex.domain.nicknamebadword.dto.CreateNicknameBadWordRequest;
import com.drinkindex.domain.nicknamebadword.dto.NicknameBadWordResponse;
import com.drinkindex.domain.nicknamebadword.service.NicknameBadWordService;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/nickname-bad-words")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class NicknameBadWordAdminController {

    private final NicknameBadWordService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<NicknameBadWordResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(service.getAll(page, size)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<NicknameBadWordResponse>> create(
            @Valid @RequestBody CreateNicknameBadWordRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(service.create(request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<NicknameBadWordResponse>> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(service.toggle(id)));
    }
}
