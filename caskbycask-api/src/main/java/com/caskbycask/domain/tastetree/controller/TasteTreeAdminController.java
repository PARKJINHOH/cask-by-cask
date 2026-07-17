package com.caskbycask.domain.tastetree.controller;

import com.caskbycask.domain.tastetree.dto.*;
import com.caskbycask.domain.tastetree.service.TasteTreeService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin/taste-trees")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class TasteTreeAdminController {
    private final TasteTreeService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TasteTreeSummaryResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success(service.getAdminTrees()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TasteTreeViewResponse>> get(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.getAdmin(id, userDetails.getUserId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TasteTreeViewResponse>> create(
            @Valid @RequestBody TasteTreeSaveRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(service.createOfficial(request, userDetails.getUserId())));
    }

    @PutMapping("/{id}/draft")
    public ResponseEntity<ApiResponse<TasteTreeViewResponse>> saveDraft(
            @PathVariable Long id, @Valid @RequestBody TasteTreeSaveRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                service.saveOfficialDraft(id, request, userDetails.getUserId())));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<TasteTreeViewResponse>> publish(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.publishOfficial(id, userDetails.getUserId())));
    }

    @PatchMapping("/{id}/hide")
    public ResponseEntity<ApiResponse<Void>> hide(@PathVariable Long id) {
        service.hideAdmin(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/restore")
    public ResponseEntity<ApiResponse<Void>> restore(@PathVariable Long id) {
        service.restoreAdmin(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        service.deleteAdmin(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping(value = "/{id}/images", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<TasteTreeImageUploadResponse>> uploadImage(
            @PathVariable Long id, @RequestParam("image") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                service.uploadImage(file, id, userDetails.getUserId(), true)));
    }
}
