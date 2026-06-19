package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.dto.response.ChartPoint;
import com.caskbycask.domain.pricetracker.dto.response.ChartResponse;
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
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

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
                .filter(d -> storeType == null || d.getStoreType() == storeType)
                .toList();

        List<TempPrice> tempPrices = buildTempPrices(reports, deals);
        List<DailyPrice> dailyPrices = buildDailyPrices(tempPrices);

        PriceCurrency currency = (storeType == StoreType.DUTYFREE) ? PriceCurrency.USD : PriceCurrency.KRW;

        BucketType bucketType = dailyPrices.size() <= 30 ? BucketType.INDIVIDUAL : BucketType.WEEKLY;

        List<ChartPoint> points = bucketType == BucketType.INDIVIDUAL
                ? buildIndividualPoints(dailyPrices)
                : buildWeeklyPoints(dailyPrices);

        return new ChartResponse(bucketType, currency, points);
    }

    @Transactional(readOnly = true)
    public List<PriceReportChartDetailResponse> getChartPointDetails(
            Long spiritId, LocalDate pointDate, StoreType storeType, BucketType bucketType) {
        boolean weekly = bucketType == BucketType.WEEKLY;
        LocalDate rangeStart = weekly
                ? pointDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                : pointDate;
        LocalDate rangeEnd = weekly ? rangeStart.plusDays(6) : pointDate;

        List<PriceReport> reports = priceReportRepository.findApprovedForChartDetail(
                spiritId, PriceReportStatus.APPROVED, rangeStart, rangeEnd);

        List<DealPost> deals = dealPostRepository.findAllBySpiritIdAndStatusAndIsVisibleTrue(spiritId, DealStatus.APPROVED);
        List<DealPost> rangeDeals = deals.stream()
                .filter(d -> {
                    LocalDate dDate = effectiveDate(d);
                    return !dDate.isBefore(rangeStart) && !dDate.isAfter(rangeEnd);
                })
                .filter(d -> storeType == null || d.getStoreType() == storeType)
                .toList();

        List<TempPrice> tempPrices = buildTempPrices(
                reports.stream().filter(r -> matchesStoreType(r, storeType)).toList(),
                rangeDeals
        );

        return buildDailyPrices(tempPrices).stream()
                .map(DailyPrice::lowestSource)
                .sorted(Comparator
                        .comparing(TempPrice::date, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(TempPrice::finalPrice, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toDetailResponse)
                .toList();
    }

    private record TempPrice(
            LocalDate date,
            BigDecimal finalPrice,
            BigDecimal regularPriceCandidate,
            BigDecimal salePrice,
            Long reportId,
            String storeKey,
            int reliability,
            LocalDateTime observedAt,
            PriceReport report,
            DealPost deal
    ) {}

    private record DailyPrice(
            LocalDate date,
            BigDecimal minFinalPrice,
            BigDecimal regularPrice,
            BigDecimal avgSalePrice,
            int storeCount,
            List<Long> reportIds,
            TempPrice lowestSource
    ) {}

    private record RegularPriceCandidate(
            BigDecimal price,
            int count,
            int maxReliability,
            LocalDateTime latestObservedAt
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

    private List<TempPrice> buildTempPrices(List<PriceReport> reports, List<DealPost> deals) {
        List<TempPrice> tempPrices = new ArrayList<>();
        for (PriceReport r : reports) {
            tempPrices.add(new TempPrice(
                    effectiveDate(r),
                    r.getActualPrice(),
                    r.getPrice(),
                    r.getSalePrice(),
                    r.getId(),
                    r.getStore() != null ? "store:" + r.getStore().getId() : "suggested:" + nullToBlank(r.getSuggestedStoreName()),
                    reliability(r),
                    r.getCreatedAt(),
                    r,
                    null
            ));
        }
        for (DealPost d : deals) {
            BigDecimal priceVal = d.getDealPrice() != null ? BigDecimal.valueOf(d.getDealPrice()) : null;
            BigDecimal origVal = d.getOriginalPrice() != null ? BigDecimal.valueOf(d.getOriginalPrice()) : null;
            tempPrices.add(new TempPrice(
                    effectiveDate(d),
                    priceVal,
                    origVal,
                    priceVal,
                    null,
                    "deal:" + nullToBlank(d.getSeller()),
                    reliability(d),
                    observedAt(d),
                    null,
                    d
            ));
        }
        return tempPrices;
    }

    private List<DailyPrice> buildDailyPrices(List<TempPrice> tempPrices) {
        Map<LocalDate, List<TempPrice>> byDate = tempPrices.stream()
                .filter(t -> t.date() != null)
                .collect(Collectors.groupingBy(TempPrice::date));

        return byDate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    List<TempPrice> day = entry.getValue();
                    TempPrice lowest = day.stream()
                            .filter(t -> t.finalPrice() != null)
                            .min(Comparator
                                    .comparing(TempPrice::finalPrice)
                                    .thenComparing(TempPrice::observedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                            .orElse(day.get(0));

                    BigDecimal minFinalPrice = lowest.finalPrice();
                    BigDecimal regularPrice = resolveDailyRegularPrice(day, minFinalPrice);

                    long saleCount = day.stream().filter(t -> t.salePrice() != null).count();
                    BigDecimal avgSalePrice = saleCount > 0
                            ? day.stream()
                            .map(TempPrice::salePrice)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add)
                            .divide(BigDecimal.valueOf(saleCount), RoundingMode.HALF_UP)
                            : null;

                    int storeCount = (int) day.stream()
                            .map(TempPrice::storeKey)
                            .filter(s -> s != null && !s.isBlank())
                            .distinct()
                            .count();

                    List<Long> reportIds = day.stream()
                            .map(TempPrice::reportId)
                            .filter(Objects::nonNull)
                            .distinct()
                            .toList();

                    return new DailyPrice(entry.getKey(), minFinalPrice, regularPrice,
                            avgSalePrice, storeCount, reportIds, lowest);
                })
                .toList();
    }

    private List<ChartPoint> buildIndividualPoints(List<DailyPrice> dailyPrices) {
        return dailyPrices.stream()
                .map(d -> new ChartPoint(
                        d.date(),
                        d.minFinalPrice(),
                        d.regularPrice(),
                        d.avgSalePrice(),
                        d.storeCount(),
                        d.reportIds()
                ))
                .sorted(Comparator.comparing(ChartPoint::date, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private List<ChartPoint> buildWeeklyPoints(List<DailyPrice> dailyPrices) {
        Map<LocalDate, List<DailyPrice>> byWeek = dailyPrices.stream()
                .collect(Collectors.groupingBy(d ->
                        d.date().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))));

        return byWeek.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    List<DailyPrice> week = entry.getValue();

                    BigDecimal minFinalPrice = week.stream()
                            .map(DailyPrice::minFinalPrice)
                            .filter(Objects::nonNull)
                            .min(Comparator.naturalOrder())
                            .orElse(null);

                    BigDecimal regularPrice = resolveWeeklyRegularPrice(week, minFinalPrice);

                    long saleCount = week.stream().filter(d -> d.avgSalePrice() != null).count();
                    BigDecimal avgSalePrice = saleCount > 0
                            ? week.stream()
                            .map(DailyPrice::avgSalePrice)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add)
                            .divide(BigDecimal.valueOf(saleCount), RoundingMode.HALF_UP)
                            : null;

                    int storeCount = week.stream().mapToInt(DailyPrice::storeCount).sum();

                    List<Long> reportIds = week.stream()
                            .flatMap(d -> d.reportIds().stream())
                            .distinct()
                            .toList();

                    return new ChartPoint(entry.getKey(), minFinalPrice, regularPrice,
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

    private BigDecimal resolveDailyRegularPrice(List<TempPrice> day, BigDecimal minFinalPrice) {
        List<RegularPriceCandidate> candidates = day.stream()
                .filter(t -> isValidRegularCandidate(t.regularPriceCandidate(), minFinalPrice))
                .collect(Collectors.groupingBy(TempPrice::regularPriceCandidate))
                .entrySet().stream()
                .map(entry -> new RegularPriceCandidate(
                        entry.getKey(),
                        entry.getValue().size(),
                        entry.getValue().stream().mapToInt(TempPrice::reliability).max().orElse(0),
                        entry.getValue().stream()
                                .map(TempPrice::observedAt)
                                .filter(Objects::nonNull)
                                .max(Comparator.naturalOrder())
                                .orElse(LocalDateTime.MIN)
                ))
                .toList();

        return candidates.stream()
                .max(Comparator
                        .comparingInt(RegularPriceCandidate::count)
                        .thenComparingInt(RegularPriceCandidate::maxReliability)
                        .thenComparing(RegularPriceCandidate::latestObservedAt))
                .map(RegularPriceCandidate::price)
                .orElse(minFinalPrice);
    }

    private BigDecimal resolveWeeklyRegularPrice(List<DailyPrice> week, BigDecimal minFinalPrice) {
        return week.stream()
                .map(DailyPrice::regularPrice)
                .filter(p -> isValidRegularCandidate(p, minFinalPrice))
                .max(Comparator.naturalOrder())
                .orElse(minFinalPrice);
    }

    private boolean isValidRegularCandidate(BigDecimal regularPrice, BigDecimal minFinalPrice) {
        if (regularPrice == null || regularPrice.compareTo(BigDecimal.ZERO) <= 0) return false;
        if (minFinalPrice == null || minFinalPrice.compareTo(BigDecimal.ZERO) <= 0) return true;
        if (regularPrice.compareTo(minFinalPrice) < 0) return false;
        return regularPrice.compareTo(minFinalPrice.multiply(BigDecimal.valueOf(3))) <= 0;
    }

    private PriceReportChartDetailResponse toDetailResponse(TempPrice source) {
        if (source.report() != null) {
            List<PriceReportImage> publicImages = priceReportImageRepository
                    .findByPriceReportIdAndIsPublicTrueOrderBySortOrder(source.report().getId());
            return PriceReportChartDetailResponse.from(source.report(), publicImages, source.report().getDiscountItems());
        }
        return PriceReportChartDetailResponse.from(source.deal());
    }

    private int reliability(PriceReport report) {
        if (Boolean.TRUE.equals(report.getIsVerified())) return 10;
        return 8;
    }

    private int reliability(DealPost deal) {
        return deal.getConfidenceScore() != null ? deal.getConfidenceScore() : 5;
    }

    private LocalDateTime observedAt(DealPost deal) {
        return deal.getCrawledAt() != null ? deal.getCrawledAt() : deal.getCreatedAt();
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value.trim();
    }
}
