package com.drinkindex.domain.community.controller;

import com.drinkindex.domain.community.dto.PrefixAdminResponse;
import com.drinkindex.domain.community.dto.SavePrefixRequest;
import com.drinkindex.domain.community.dto.UpdatePrefixRequest;
import com.drinkindex.domain.community.entity.PostPrefix;
import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.community.repository.PostPrefixRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/post-prefixes")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class PostPrefixAdminController {

    private final PostPrefixRepository postPrefixRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PrefixAdminResponse>>> getAll(
            @RequestParam BoardType boardType
    ) {
        List<PrefixAdminResponse> result = postPrefixRepository
                .findByBoardTypeOrderBySortOrderAsc(boardType)
                .stream()
                .map(PrefixAdminResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PrefixAdminResponse>> create(
            @Valid @RequestBody SavePrefixRequest request
    ) {
        PostPrefix prefix = PostPrefix.builder()
                .boardType(request.getBoardType())
                .name(request.getName())
                .colorHex(request.getColorHex())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .build();
        return ResponseEntity.ok(ApiResponse.success(PrefixAdminResponse.from(postPrefixRepository.save(prefix))));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<PrefixAdminResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePrefixRequest request
    ) {
        PostPrefix prefix = postPrefixRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_PREFIX_NOT_FOUND));

        String newName      = request.getName()      != null ? request.getName()      : prefix.getName();
        String newColorHex  = request.getColorHex()  != null ? request.getColorHex()  : prefix.getColorHex();
        Boolean newIsActive = request.getIsActive()  != null ? request.getIsActive()  : prefix.getIsActive();
        Integer newOrder    = request.getSortOrder() != null ? request.getSortOrder() : prefix.getSortOrder();

        prefix.update(newName, newColorHex, newIsActive, newOrder);
        return ResponseEntity.ok(ApiResponse.success(PrefixAdminResponse.from(postPrefixRepository.save(prefix))));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<PrefixAdminResponse>> toggle(@PathVariable Long id) {
        PostPrefix prefix = postPrefixRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_PREFIX_NOT_FOUND));
        prefix.update(prefix.getName(), prefix.getColorHex(), !prefix.getIsActive(), prefix.getSortOrder());
        return ResponseEntity.ok(ApiResponse.success(PrefixAdminResponse.from(postPrefixRepository.save(prefix))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        postPrefixRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_PREFIX_NOT_FOUND));
        postPrefixRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
