package com.drinkindex.domain.popup.controller;

import com.drinkindex.domain.popup.dto.*;
import com.drinkindex.domain.popup.entity.enums.PopupImageType;
import com.drinkindex.domain.popup.entity.enums.PopupLanguage;
import com.drinkindex.domain.popup.service.PopupService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/popups")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class PopupAdminController {

    private final PopupService popupService;

    // ─── 팝업 CRUD ───────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AdminPopupListResponse>>> getAllPopups(
            @RequestParam(required = false) PopupLanguage language,
            @RequestParam(required = false) Boolean isVisible,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(popupService.getAllPopupsForAdmin(language, isVisible, page, size))
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminPopupDetailResponse>> getPopupDetail(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(popupService.getPopupForAdmin(id))
        );
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminPopupDetailResponse>> createPopup(
            @Valid @RequestBody CreatePopupRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(popupService.createPopup(request, userDetails.getUserId()))
        );
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminPopupDetailResponse>> updatePopup(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePopupRequest request
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(popupService.updatePopup(id, request))
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePopup(@PathVariable Long id) {
        popupService.deletePopup(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 노출/순서 단독 변경 ──────────────────────────────

    @PatchMapping("/{id}/visibility")
    public ResponseEntity<ApiResponse<Void>> updateVisibility(
            @PathVariable Long id,
            @RequestBody VisibilityRequest request
    ) {
        popupService.updateVisibility(id, request.getIsVisible());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/sort-order")
    public ResponseEntity<ApiResponse<Void>> updateSortOrder(
            @PathVariable Long id,
            @RequestBody SortOrderRequest request
    ) {
        popupService.updateSortOrder(id, request.getSortOrder());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 이미지 업로드/삭제 ────────────────────────────

    // [보안] NoticeImageValidator 4단계 검증 재사용: 크기 → 확장자 → Magic Bytes → UUID 파일명
    @PostMapping("/images")
    public ResponseEntity<ApiResponse<UploadedPopupImageResponse>> uploadImage(
            @RequestParam("image") MultipartFile file,
            @RequestParam("imageType") PopupImageType imageType,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(popupService.uploadImage(file, imageType, userDetails.getUserId()))
        );
    }

    @DeleteMapping("/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(@PathVariable Long imageId) {
        popupService.deleteImage(imageId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 내부 요청 DTO ────────────────────────────────────

    @Getter
    @NoArgsConstructor
    public static class VisibilityRequest {
        private Boolean isVisible;
    }

    @Getter
    @NoArgsConstructor
    public static class SortOrderRequest {
        private Integer sortOrder;
    }
}
