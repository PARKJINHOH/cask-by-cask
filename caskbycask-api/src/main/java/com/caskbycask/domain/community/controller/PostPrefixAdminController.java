package com.caskbycask.domain.community.controller;

import com.caskbycask.domain.community.dto.PrefixAdminResponse;
import com.caskbycask.domain.community.dto.ReorderRequest;
import com.caskbycask.domain.community.dto.SavePrefixRequest;
import com.caskbycask.domain.community.dto.UpdatePrefixRequest;
import com.caskbycask.domain.community.entity.PostPrefix;
import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.repository.PostPrefixRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.response.ApiResponse;
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
                // 순서는 목록에서 드래그로만 바꾼다. 신규 말머리는 항상 맨 아래.
                .sortOrder(nextSortOrder(request.getBoardType()))
                .build();
        return ResponseEntity.ok(ApiResponse.success(PrefixAdminResponse.from(postPrefixRepository.save(prefix))));
    }

    /**
     * 목록에 보이는 순서대로 id 를 받아 그대로 sortOrder 로 굳힌다(배열 index = sortOrder).
     * 다른 게시판의 말머리가 섞여 들어오면 순서가 뒤엉키므로 거부한다.
     */
    @PostMapping("/reorder")
    public ResponseEntity<ApiResponse<Void>> reorder(@Valid @RequestBody ReorderRequest request) {
        List<Long> ids = request.getIds();
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success());
        }
        List<PostPrefix> prefixes = postPrefixRepository.findAllById(ids);
        if (prefixes.size() != ids.size()) {
            throw new CustomException(ErrorCode.POST_PREFIX_NOT_FOUND);
        }
        BoardType boardType = prefixes.get(0).getBoardType();
        for (PostPrefix prefix : prefixes) {
            if (prefix.getBoardType() != boardType) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            prefix.update(prefix.getName(), prefix.getColorHex(), prefix.getIsActive(),
                    ids.indexOf(prefix.getId()));
        }
        postPrefixRepository.saveAll(prefixes);
        return ResponseEntity.ok(ApiResponse.success());
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

        // 순서는 reorder 로만 바꾼다 — 수정 폼에는 순서 입력이 없다.
        prefix.update(newName, newColorHex, newIsActive, prefix.getSortOrder());
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

    /** 해당 게시판 말머리 중 가장 큰 sortOrder 다음 값 — 신규는 목록 맨 아래로 간다. */
    private int nextSortOrder(BoardType boardType) {
        return postPrefixRepository.findByBoardTypeOrderBySortOrderAsc(boardType).stream()
                .mapToInt(PostPrefix::getSortOrder)
                .max()
                .orElse(-1) + 1;
    }
}
