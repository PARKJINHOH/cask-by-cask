package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.dto.response.ChartPoint;
import com.caskbycask.domain.pricetracker.dto.response.ChartResponse;
import com.caskbycask.domain.pricetracker.dto.response.PriceDiscountItemResponse;
import com.caskbycask.domain.pricetracker.dto.response.PriceReportChartDetailResponse;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.PriceReportImage;
import com.caskbycask.domain.pricetracker.entity.enums.BucketType;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.pricetracker.repository.PriceReportImageRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class PriceChartService {

    private final PriceReportRepository priceReportRepository;
    private final PriceReportImageRepository priceReportImageRepository;

    @Transactional(readOnly = true)
    public ChartResponse getChart(Long spiritId, StoreType storeType, String period, String region) {
        LocalDate startDate = computeStartDate(period);

        List<PriceReport> reports = priceReportRepository.findApprovedForChart(
                spiritId, PriceReportStatus.APPROVED, startDate);

        reports = reports.stream()
                .filter(r -> matchesStoreType(r, storeType))
                .filter(r -> region == null || region.isBlank()
                        || (r.getStore() != null && region.equals(r.getStore().getRegion())))
                .toList();

        // 면세 탭 = USD, 국내 탭 = KRW
        PriceCurrency currency = (storeType == StoreType.DUTYFREE) ? PriceCurrency.USD : PriceCurrency.KRW;

        BucketType bucketType = reports.size() <= 30 ? BucketType.INDIVIDUAL : BucketType.WEEKLY;

        List<ChartPoint> points = bucketType == BucketType.INDIVIDUAL
                ? buildIndividualPoints(reports)
                : buildWeeklyPoints(reports);

        return new ChartResponse(bucketType, currency, points);
    }

    @Transactional(readOnly = true)
    public List<PriceReportChartDetailResponse> getChartPointDetails(
            Long spiritId, LocalDate pointDate, StoreType storeType) {
        // 해당 날짜가 속한 주(week) 전체 범위 조회
        LocalDate weekStart = pointDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);

        List<PriceReport> reports = priceReportRepository.findApprovedForChartDetail(
                spiritId, PriceReportStatus.APPROVED, weekStart, weekEnd);

        return reports.stream()
                .filter(r -> matchesStoreType(r, storeType))
                .map(r -> {
                    List<PriceReportImage> publicImages = priceReportImageRepository
                            .findByPriceReportIdAndIsPublicTrueOrderBySortOrder(r.getId());
                    return PriceReportChartDetailResponse.from(r, publicImages, r.getDiscountItems());
                })
                // 실구매가 오름차순
                .sorted(Comparator.comparing(
                        PriceReportChartDetailResponse::finalPrice,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    // ═══════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════

    private LocalDate computeStartDate(String period) {
        if (period == null) return LocalDate.now().minusMonths(3);
        return switch (period.toUpperCase()) {
            case "1M" -> LocalDate.now().minusMonths(1);
            case "3M" -> LocalDate.now().minusMonths(3);
            case "6M" -> LocalDate.now().minusMonths(6);
            case "1Y" -> LocalDate.now().minusYears(1);
            case "ALL" -> null;
            default -> LocalDate.now().minusMonths(3);
        };
    }

    private boolean matchesStoreType(PriceReport r, StoreType storeType) {
        if (storeType == null) return true;
        if (storeType == StoreType.DOMESTIC) {
            return r.getStore() == null || r.getStore().getStoreType() == StoreType.DOMESTIC;
        }
        return r.getStore() != null && r.getStore().getStoreType() == storeType;
    }

    private List<ChartPoint> buildIndividualPoints(List<PriceReport> reports) {
        return reports.stream()
                .map(r -> new ChartPoint(
                        effectiveDate(r),
                        r.getActualPrice(),
                        resolveMaxPrice(r),
                        r.getSalePrice(),
                        1,
                        List.of(r.getId())
                ))
                .sorted(Comparator.comparing(ChartPoint::date, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private List<ChartPoint> buildWeeklyPoints(List<PriceReport> reports) {
        // 주(week) 시작일(Monday) 기준으로 그룹핑
        Map<LocalDate, List<PriceReport>> byWeek = reports.stream()
                .collect(Collectors.groupingBy(r ->
                        effectiveDate(r).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))));

        return byWeek.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    List<PriceReport> week = entry.getValue();

                    BigDecimal minFinalPrice = week.stream()
                            .map(PriceReport::getActualPrice)
                            .filter(Objects::nonNull)
                            .min(Comparator.naturalOrder())
                            .orElse(null);

                    BigDecimal maxPrice = week.stream()
                            .map(this::resolveMaxPrice)
                            .filter(Objects::nonNull)
                            .max(Comparator.naturalOrder())
                            .orElse(null);

                    long saleCount = week.stream().filter(r -> r.getSalePrice() != null).count();
                    BigDecimal avgSalePrice = saleCount > 0
                            ? week.stream()
                            .map(PriceReport::getSalePrice)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add)
                            .divide(BigDecimal.valueOf(saleCount), RoundingMode.HALF_UP)
                            : null;

                    long storeCount = week.stream()
                            .map(PriceReport::getStore)
                            .filter(Objects::nonNull)
                            .map(s -> s.getId())
                            .distinct()
                            .count();

                    List<Long> reportIds = week.stream().map(PriceReport::getId).toList();

                    return new ChartPoint(entry.getKey(), minFinalPrice, maxPrice,
                            avgSalePrice, (int) storeCount, reportIds);
                })
                .toList();
    }

    private LocalDate effectiveDate(PriceReport r) {
        return r.getPurchasedAt() != null ? r.getPurchasedAt() : r.getCreatedAt().toLocalDate();
    }

    private BigDecimal resolveMaxPrice(PriceReport r) {
        return Stream.of(r.getPrice(), r.getSalePrice(), r.getActualPrice())
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
    }
}
