package com.caskbycask.domain.banner.controller;

import com.caskbycask.domain.banner.dto.*;
import com.caskbycask.domain.banner.entity.enums.BannerImageType;
import com.caskbycask.domain.banner.entity.enums.BannerLanguage;
import com.caskbycask.domain.banner.entity.enums.BannerPosition;
import com.caskbycask.domain.banner.service.BannerService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/banners")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class BannerAdminController {

    private final BannerService bannerService;

    // ─── 배너 CRUD ─────────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminBannerListResponse>>> getAllBanners(
            @RequestParam(required = false) BannerLanguage language,
            @RequestParam(required = false) BannerPosition position,
            @RequestParam(required = false) Boolean isVisible,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(PageResponse.from(bannerService.getAllBannersForAdmin(language, position, isVisible, page, size)))
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminBannerDetailResponse>> getBannerDetail(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.success(bannerService.getBannerForAdmin(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminBannerDetailResponse>> createBanner(
            @Valid @RequestBody CreateBannerRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(bannerService.createBanner(request, userDetails.getUserId()))
        );
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminBannerDetailResponse>> updateBanner(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBannerRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(bannerService.updateBanner(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBanner(@PathVariable Long id) {
        bannerService.deleteBanner(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 노출/순서 단독 변경 ───────────────────────────────

    @PatchMapping("/{id}/visibility")
    public ResponseEntity<ApiResponse<Void>> updateVisibility(
            @PathVariable Long id,
            @RequestBody VisibilityRequest request
    ) {
        bannerService.updateVisibility(id, request.getIsVisible());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/sort-order")
    public ResponseEntity<ApiResponse<Void>> updateSortOrder(
            @PathVariable Long id,
            @RequestBody SortOrderRequest request
    ) {
        bannerService.updateSortOrder(id, request.getSortOrder());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 이미지 업로드/삭제 ───────────────────────────────

    // [보안] NoticeImageValidator 4단계 검증 재사용: 크기 → 확장자 → Magic Bytes → UUID 파일명
    @PostMapping("/images")
    public ResponseEntity<ApiResponse<UploadedBannerImageResponse>> uploadImage(
            @RequestParam("image") MultipartFile file,
            @RequestParam("imageType") BannerImageType imageType,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(bannerService.uploadImage(file, imageType, userDetails.getUserId()))
        );
    }

    @DeleteMapping("/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(@PathVariable Long imageId) {
        bannerService.deleteImage(imageId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 내부 요청 DTO ─────────────────────────────────────

    @Getter @NoArgsConstructor
    public static class VisibilityRequest {
        private Boolean isVisible;
    }

    @Getter @NoArgsConstructor
    public static class SortOrderRequest {
        private Integer sortOrder;
    }
}
