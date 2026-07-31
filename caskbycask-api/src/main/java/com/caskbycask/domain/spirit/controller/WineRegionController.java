package com.caskbycask.domain.spirit.controller;

import com.caskbycask.domain.spirit.dto.WineRegionCountryResponse;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.service.WineRegionService;
import com.caskbycask.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 산지 카탈로그 조회.
 *
 * <p>변하지 않는 <b>공개 읽기 전용 참조 데이터</b>다(민감 정보·사용자 데이터 없음).
 * 관리자 산지 선택기와 사용자 산지 지도가 동일한 카탈로그를 쓰도록 하기 위한 엔드포인트이며,
 * 쓰기 API 는 제공하지 않는다. 카탈로그 변경은 {@code WineRegion} enum 수정 + 배포로만 가능하다.
 *
 * <p>경로는 역사적으로 {@code /api/wine-regions} 이지만 위스키 산지도 함께 제공한다.
 * {@code category} 파라미터를 주지 않으면 <b>기존 동작과 같이 와인 산지만</b> 반환하므로
 * 이미 배포된 프론트엔드는 영향을 받지 않는다.
 */
@RestController
@RequestMapping("/api/wine-regions")
@RequiredArgsConstructor
public class WineRegionController {

    private final WineRegionService wineRegionService;

    @Operation(summary = "산지 카탈로그 조회",
            description = "국가별 L1 대산지 목록과 각 L1 의 L2 세부산지를 반환한다. "
                    + "category 미지정 시 와인 산지만 반환한다(하위 호환).")
    @GetMapping
    public ResponseEntity<ApiResponse<List<WineRegionCountryResponse>>> getWineRegions(
            @RequestParam(required = false) SpiritCategory category) {
        SpiritCategory effective = category == null ? SpiritCategory.WINE : category;
        return ResponseEntity.ok(ApiResponse.success(wineRegionService.getCatalog(effective)));
    }
}
