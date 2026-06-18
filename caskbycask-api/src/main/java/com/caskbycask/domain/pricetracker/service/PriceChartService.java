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
import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.repository.DealPostRepository;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
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
    private final DealPostRepository dealPostRepository;

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

        List<DealPost> deals = dealPostRepository.findAllBySpiritIdAndStatusAndIsVisibleTrue(spiritId, DealStatus.APPROVED);
        deals = deals.stream()
                .filter(d -> startDate == null || !effectiveDate(d).isBefore(startDate))
                .filter(d -> d.getStoreType() == storeType)
                .toList();

        List<TempPrice> tempPrices = new ArrayList<>();
        for (PriceReport r : reports) {
            tempPrices.add(new TempPrice(
                    effectiveDate(r),
                    r.getActualPrice(),
                    resolveMaxPrice(r),
                    r.getSalePrice(),
                    r.getId(),
                    r.getStore() != null ? r.getStore().getId() : null
            ));
        }
        for (DealPost d : deals) {
            BigDecimal priceVal = d.getDealPrice() != null ? BigDecimal.valueOf(d.getDealPrice()) : null;
            BigDecimal origVal = d.getOriginalPrice() != null ? BigDecimal.valueOf(d.getOriginalPrice()) : null;
            tempPrices.add(new TempPrice(
                    effectiveDate(d),
                    priceVal,
                    origVal != null ? origVal : priceVal,
                    priceVal,
                    null,
                    null
            ));
        }

        PriceCurrency currency = (storeType == StoreType.DUTYFREE) ? PriceCurrency.USD : PriceCurrency.KRW;

        BucketType bucketType = tempPrices.size() <= 30 ? BucketType.INDIVIDUAL : BucketType.WEEKLY;

        List<ChartPoint> points = bucketType == BucketType.INDIVIDUAL
                ? buildIndividualPoints(tempPrices)
                : buildWeeklyPoints(tempPrices);

        return new ChartResponse(bucketType, currency, points);
    }

    @Transactional(readOnly = true)
    public List<PriceReportChartDetailResponse> getChartPointDetails(
            Long spiritId, LocalDate pointDate, StoreType storeType) {
        LocalDate weekStart = pointDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);

        List<PriceReport> reports = priceReportRepository.findApprovedForChartDetail(
                spiritId, PriceReportStatus.APPROVED, weekStart, weekEnd);

        List<DealPost> deals = dealPostRepository.findAllBySpiritIdAndStatusAndIsVisibleTrue(spiritId, DealStatus.APPROVED);
        List<DealPost> weekDeals = deals.stream()
                .filter(d -> {
                    LocalDate dDate = effectiveDate(d);
                    return !dDate.isBefore(weekStart) && !dDate.isAfter(weekEnd);
                })
                .filter(d -> d.getStoreType() == storeType)
                .toList();

        Stream<PriceReportChartDetailResponse> reportResponses = reports.stream()
                .filter(r -> matchesStoreType(r, storeType))
                .map(r -> {
                    List<PriceReportImage> publicImages = priceReportImageRepository
                            .findByPriceReportIdAndIsPublicTrueOrderBySortOrder(r.getId());
                    return PriceReportChartDetailResponse.from(r, publicImages, r.getDiscountItems());
                });

        Stream<PriceReportChartDetailResponse> dealResponses = weekDeals.stream()
                .map(PriceReportChartDetailResponse::from);

        return Stream.concat(reportResponses, dealResponses)
                .sorted(Comparator.comparing(
                        PriceReportChartDetailResponse::finalPrice,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private record TempPrice(
            LocalDate date,
            BigDecimal finalPrice,
            BigDecimal maxPrice,
            BigDecimal salePrice,
            Long reportId,
            Long storeId
    ) {}

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

    private List<ChartPoint> buildIndividualPoints(List<TempPrice> tempPrices) {
        return tempPrices.stream()
                .map(t -> new ChartPoint(
                        t.date(),
                        t.finalPrice(),
                        t.maxPrice(),
                        t.salePrice(),
                        1,
                        t.reportId() != null ? List.of(t.reportId()) : Collections.emptyList()
                ))
                .sorted(Comparator.comparing(ChartPoint::date, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private List<ChartPoint> buildWeeklyPoints(List<TempPrice> tempPrices) {
        Map<LocalDate, List<TempPrice>> byWeek = tempPrices.stream()
                .collect(Collectors.groupingBy(t ->
                        t.date().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))));

        return byWeek.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    List<TempPrice> week = entry.getValue();

                    BigDecimal minFinalPrice = week.stream()
                            .map(TempPrice::finalPrice)
                            .filter(Objects::nonNull)
                            .min(Comparator.naturalOrder())
                            .orElse(null);

                    BigDecimal maxPrice = week.stream()
                            .map(TempPrice::maxPrice)
                            .filter(Objects::nonNull)
                            .max(Comparator.naturalOrder())
                            .orElse(null);

                    long saleCount = week.stream().filter(t -> t.salePrice() != null).count();
                    BigDecimal avgSalePrice = saleCount > 0
                            ? week.stream()
                            .map(TempPrice::salePrice)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add)
                            .divide(BigDecimal.valueOf(saleCount), RoundingMode.HALF_UP)
                            : null;

                    long storeCount = week.stream()
                            .map(TempPrice::storeId)
                            .filter(Objects::nonNull)
                            .distinct()
                            .count();

                    List<Long> reportIds = week.stream()
                            .map(TempPrice::reportId)
                            .filter(Objects::nonNull)
                            .toList();

                    return new ChartPoint(entry.getKey(), minFinalPrice, maxPrice,
                            avgSalePrice, (int) storeCount, reportIds);
                })
                .toList();
    }

    private LocalDate effectiveDate(PriceReport r) {
        return r.getPurchasedAt() != null ? r.getPurchasedAt() : r.getCreatedAt().toLocalDate();
    }

    private LocalDate effectiveDate(DealPost d) {
        return d.getCrawledAt() != null ? d.getCrawledAt().toLocalDate() : d.getCreatedAt().toLocalDate();
    }

    private BigDecimal resolveMaxPrice(PriceReport r) {
        return Stream.of(r.getPrice(), r.getSalePrice(), r.getActualPrice())
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
    }
}
