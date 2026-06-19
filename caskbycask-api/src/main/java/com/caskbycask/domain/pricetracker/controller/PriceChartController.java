package com.caskbycask.domain.pricetracker.controller;

import com.caskbycask.domain.pricetracker.dto.response.ChartResponse;
import com.caskbycask.domain.pricetracker.dto.response.PriceReportChartDetailResponse;
import com.caskbycask.domain.pricetracker.entity.enums.BucketType;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.pricetracker.service.PriceChartService;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/price-reports/chart")
@RequiredArgsConstructor
public class PriceChartController {

    private final PriceChartService priceChartService;

    @GetMapping
    public ResponseEntity<ApiResponse<ChartResponse>> getChart(
            @RequestParam Long spiritId,
            @RequestParam(required = false) StoreType storeType,
            @RequestParam(required = false, defaultValue = "3M") String period,
            @RequestParam(required = false) String region) {
        return ResponseEntity.ok(ApiResponse.success(
                priceChartService.getChart(spiritId, storeType, period, region)));
    }

    @GetMapping("/{pointDate}/details")
    public ResponseEntity<ApiResponse<List<PriceReportChartDetailResponse>>> getChartPointDetails(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate pointDate,
            @RequestParam Long spiritId,
            @RequestParam(required = false) StoreType storeType,
            @RequestParam(required = false) BucketType bucketType) {
        return ResponseEntity.ok(ApiResponse.success(
                priceChartService.getChartPointDetails(spiritId, pointDate, storeType, bucketType)));
    }
}
