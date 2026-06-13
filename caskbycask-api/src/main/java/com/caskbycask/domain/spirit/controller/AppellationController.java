package com.caskbycask.domain.spirit.controller;

import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.util.AppellationDesignationConstants;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/appellations")
@RequiredArgsConstructor
public class AppellationController {

    @Operation(summary = "원산지 명칭 자동완성 (비회원 허용)", description = "AOC/DOC/AVA 등 원산지 명칭을 키워드로 검색합니다.")
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<String>>> search(
            @RequestParam(required = false, defaultValue = "") String keyword,
            @RequestParam(required = false, defaultValue = "10") int limit) {

        List<String> result = AppellationDesignationConstants.ALL.stream()
                .filter(s -> !StringUtils.hasText(keyword)
                        || s.toLowerCase().contains(keyword.toLowerCase()))
                .limit(Math.max(1, Math.min(limit, 100)))
                .toList();

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
