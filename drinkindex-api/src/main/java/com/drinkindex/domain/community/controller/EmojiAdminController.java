package com.drinkindex.domain.community.controller;

import com.drinkindex.domain.community.dto.CreateEmojiRequest;
import com.drinkindex.domain.community.dto.EmojiAdminResponse;
import com.drinkindex.domain.community.dto.UpdateEmojiRequest;
import com.drinkindex.domain.community.service.EmojiService;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/emojis")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class EmojiAdminController {

    private final EmojiService emojiService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<EmojiAdminResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(emojiService.getAll(page, size)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<EmojiAdminResponse>> create(
            @Valid @RequestBody CreateEmojiRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(emojiService.create(request)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<EmojiAdminResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEmojiRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(emojiService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        emojiService.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<EmojiAdminResponse>> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(emojiService.toggle(id)));
    }
}
