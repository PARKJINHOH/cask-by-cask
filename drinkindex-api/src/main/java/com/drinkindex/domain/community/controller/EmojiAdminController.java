package com.drinkindex.domain.community.controller;

import com.drinkindex.domain.community.dto.*;
import com.drinkindex.domain.community.service.EmojiService;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/emojis")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class EmojiAdminController {

    private final EmojiService emojiService;

    // ─── 그룹 ────────────────────────────────────────────────────

    @GetMapping("/groups")
    public ResponseEntity<ApiResponse<List<EmojiGroupAdminResponse>>> getGroups() {
        return ResponseEntity.ok(ApiResponse.success(emojiService.getAllGroups()));
    }

    @PostMapping("/groups")
    public ResponseEntity<ApiResponse<EmojiGroupAdminResponse>> createGroup(
            @Valid @RequestBody CreateEmojiGroupRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(emojiService.createGroup(request)));
    }

    @PatchMapping("/groups/{id}")
    public ResponseEntity<ApiResponse<EmojiGroupAdminResponse>> updateGroup(
            @PathVariable Long id,
            @Valid @RequestBody CreateEmojiGroupRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(emojiService.updateGroup(id, request)));
    }

    @DeleteMapping("/groups/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(@PathVariable Long id) {
        emojiService.deleteGroup(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/groups/reorder")
    public ResponseEntity<ApiResponse<Void>> reorderGroups(@Valid @RequestBody ReorderRequest request) {
        emojiService.reorderGroups(request.getIds());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 이모지 ───────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<Page<EmojiAdminResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(emojiService.getAll(page, size)));
    }

    @GetMapping("/by-group")
    public ResponseEntity<ApiResponse<List<EmojiAdminResponse>>> getByGroup(
            @RequestParam(required = false) Long groupId
    ) {
        return ResponseEntity.ok(ApiResponse.success(emojiService.getByGroup(groupId)));
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

    @PostMapping("/reorder")
    public ResponseEntity<ApiResponse<Void>> reorder(@Valid @RequestBody ReorderRequest request) {
        emojiService.reorderEmojis(request.getIds());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadImage(
            @RequestParam("file") MultipartFile file
    ) {
        String imageUrl = emojiService.uploadImage(file);
        return ResponseEntity.ok(ApiResponse.success(Map.of("imageUrl", imageUrl)));
    }
}
