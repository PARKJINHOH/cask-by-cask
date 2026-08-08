package com.caskbycask.domain.photocard.controller;

import com.caskbycask.domain.photocard.dto.PhotoCardDraftResponse;
import com.caskbycask.domain.photocard.dto.PhotoCardDraftSaveRequest;
import com.caskbycask.domain.photocard.service.PhotoCardDraftService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 포토카드 임시저장 — 전부 로그인 사용자 본인 것만 다룬다.
 * <p>
 * 사진은 {@code /api/photo-cards/images/**} 처럼 공개로 서빙하지 않는다. 완성해서 올린 카드와 달리
 * 여기 있는 것은 <b>편집 중인 원본 사진</b>이라, 주소를 아는 사람이 받아 갈 수 있으면 안 된다.
 */
@RestController
@RequestMapping("/api/photo-cards/drafts")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class PhotoCardDraftController {

    private final PhotoCardDraftService draftService;

    /**
     * 임시저장(생성/갱신).
     * <p>사진과 배치를 한 번에 보낸다 — 두 번에 나누면 사진만 올라가고 배치가 없는 조각이 남는다.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<PhotoCardDraftResponse>> save(
            @Valid @RequestPart("data") PhotoCardDraftSaveRequest request,
            @RequestPart(value = "photo", required = false) MultipartFile photo,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                draftService.save(userDetails.getUserId(), request, photo)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PhotoCardDraftResponse>>> list(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(draftService.list(userDetails.getUserId())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PhotoCardDraftResponse>> get(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(draftService.get(userDetails.getUserId(), id)));
    }

    /** 편집 중이던 사진. 되살릴 때 편집기가 받아 간다. */
    @GetMapping("/{id}/photo")
    public ResponseEntity<Resource> photo(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        PhotoCardDraftService.PhotoFile file = draftService.getPhoto(userDetails.getUserId(), id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        file.mimeType() != null ? file.mimeType() : MediaType.IMAGE_JPEG_VALUE))
                // 본인만 받는 사진이라 공유 캐시에 남기지 않는다.
                .cacheControl(CacheControl.noStore().cachePrivate())
                .body(file.resource());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        draftService.delete(userDetails.getUserId(), id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
