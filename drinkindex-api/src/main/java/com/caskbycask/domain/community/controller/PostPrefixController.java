package com.caskbycask.domain.community.controller;

import com.caskbycask.domain.community.dto.PrefixInfo;
import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.repository.PostPrefixRepository;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/post-prefixes")
@RequiredArgsConstructor
public class PostPrefixController {

    private final PostPrefixRepository postPrefixRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PrefixInfo>>> getPrefixes(
            @RequestParam BoardType boardType
    ) {
        List<PrefixInfo> result = postPrefixRepository
                .findByBoardTypeAndIsActiveTrueOrderBySortOrderAsc(boardType)
                .stream()
                .map(PrefixInfo::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
