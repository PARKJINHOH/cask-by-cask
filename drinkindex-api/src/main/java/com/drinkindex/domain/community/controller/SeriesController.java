package com.drinkindex.domain.community.controller;

import com.drinkindex.domain.community.dto.*;
import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.community.repository.SeriesRepository;
import com.drinkindex.domain.community.service.SeriesService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/series")
@RequiredArgsConstructor
public class SeriesController {

    private final SeriesService seriesService;
    private final SeriesRepository seriesRepository;

    // 내 시리즈 목록 (글쓰기 폼 드롭다운용)
    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<SeriesResponse>>> getMySeries(
            @RequestParam BoardType boardType,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<SeriesResponse> result = seriesRepository
                .findByAuthorIdOrderByCreatedAtDesc(userDetails.getUserId())
                .stream()
                .filter(s -> s.getBoardType().equals(boardType))
                .map(SeriesResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<SeriesResponse>>> getSeries(
            @RequestParam BoardType boardType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(seriesService.getSeries(boardType, page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SeriesDetailResponse>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(seriesService.getSeriesDetail(id)));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SeriesResponse>> create(
            @Valid @RequestBody CreateSeriesRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                seriesService.createSeries(request, userDetails.getUserId())));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SeriesResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSeriesRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                seriesService.updateSeries(id, request, userDetails.getUserId())));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        seriesService.deleteSeries(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/{id}/posts/{postId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SeriesDetailResponse>> addPost(
            @PathVariable Long id,
            @PathVariable Long postId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                seriesService.addPost(id, postId, userDetails.getUserId())));
    }

    @DeleteMapping("/{id}/posts/{postId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> removePost(
            @PathVariable Long id,
            @PathVariable Long postId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        seriesService.removePost(id, postId, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
