package com.caskbycask.domain.seo.controller;

import com.caskbycask.domain.community.dto.PostListResponse;
import com.caskbycask.domain.community.service.PostService;
import com.caskbycask.domain.seo.dto.SpiritSeoResponse;
import com.caskbycask.domain.seo.service.SpiritSeoService;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/seo/spirits")
@RequiredArgsConstructor
public class SpiritSeoController {

    private final SpiritSeoService spiritSeoService;
    private final PostService postService;

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SpiritSeoResponse>> getSpiritSeo(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(spiritSeoService.getSpiritSeo(id)));
    }

    /**
     * 주류 상세에 실을 "이 주류를 언급한 글".
     * <p>
     * 색인 경로 전용이라 {@code /api/seo} 아래에 둔다 — 화면용 목록 API 와 달리 게시판 제한이
     * 없으므로, 일반 글 목록에 이미지 갤러리 글이 섞이는 일이 생기지 않게 표면을 분리한다.
     */
    @GetMapping("/{id}/posts")
    public ResponseEntity<ApiResponse<PageResponse<PostListResponse>>> getPostsMentioningSpirit(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(postService.getPostsBySpirit(id, page, size))));
    }
}
