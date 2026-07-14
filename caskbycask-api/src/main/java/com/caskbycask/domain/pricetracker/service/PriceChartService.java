package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.dto.response.ChartPoint;
import com.caskbycask.domain.pricetracker.dto.response.ChartResponse;
import com.caskbycask.domain.pricetracker.dto.response.ChartSeries;
import com.caskbycask.domain.pricetracker.dto.response.PriceReportChartDetailResponse;
import com.caskbycask.domain.pricetracker.dto.response.PriceVolumeOptionResponse;
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
    public ChartResponse getChart(Long spiritId, StoreType storeType, String period, String region,
                                  Integer volumeMl, boolean unknownVolume) {
        return getChart(List.of(spiritId), storeType, period, region, volumeMl, unknownVolume);
    }

    @Transactional(readOnly = true)
    public ChartResponse getChart(List<Long> spiritIds, StoreType storeType, String period, String region,
                                  Integer volumeMl, boolean unknownVolume) {
        List<Long> targetSpiritIds = normalizeSpiritIds(spiritIds);
        PriceCurrency currency = (storeType == StoreType.DUTYFREE) ? PriceCurrency.USD : PriceCurrency.KRW;
        if (targetSpiritIds.isEmpty()) {
            return new ChartResponse(BucketType.INDIVIDUAL, currency, List.of(), List.of());
        }
        LocalDate startDate = computeStartDate(period);

        List<PriceReport> reports = priceReportRepository.findApprovedForChart(
                targetSpiritIds, PriceReportStatus.APPROVED);

        reports = reports.stream()
                .filter(r -> startDate == null || !effectiveDate(r).isBefore(startDate))
                .filter(r -> matchesStoreType(r, storeType))
                .filter(r -> matchesVolume(r.getVolumeMl(), volumeMl, unknownVolume))
                .filter(r -> region == null || region.isBlank()
                        || (r.getStore() != null && region.equals(r.getStore().getRegion())))
                .toList();

        List<DealPost> deals = dealPostRepository.findAllBySpiritIdInAndStatusAndIsVisibleTrue(targetSpiritIds, DealStatus.APPROVED);
        deals = deals.stream()
                .filter(d -> (d.getDealPrice() != null && d.getDealPrice() > 0) || (d.getOriginalPrice() != null && d.getOriginalPrice() > 0))
                .filter(d -> startDate == null || !effectiveDate(d).isBefore(startDate))
                .filter(d -> storeType == null || d.getStoreType() == storeType)
                .filter(d -> matchesVolume(d.getVolumeMl(), volumeMl, unknownVolume))
                .toList();

        List<TempPrice> tempPrices = buildTempPrices(reports, deals);
        List<DailyPrice> dailyPrices = buildDailyPrices(tempPrices);

        BucketType bucketType = dailyPrices.size() <= 30 ? BucketType.INDIVIDUAL : BucketType.WEEKLY;

        List<ChartPoint> points = bucketType == BucketType.INDIVIDUAL
                ? buildIndividualPoints(dailyPrices)
                : buildWeeklyPoints(dailyPrices);

        List<ChartSeries> series = targetSpiritIds.stream()
                .map(targetId -> {
                    List<DailyPrice> seriesDailyPrices = buildDailyPrices(tempPrices.stream()
                            .filter(t -> Objects.equals(t.spiritId(), targetId))
                            .toList());
                    List<ChartPoint> seriesPoints = bucketType == BucketType.INDIVIDUAL
                            ? buildIndividualPoints(seriesDailyPrices)
                            : buildWeeklyPoints(seriesDailyPrices);
                    return new ChartSeries(targetId, seriesPoints);
                })
                .filter(s -> !s.points().isEmpty())
                .toList();

        return new ChartResponse(bucketType, currency, points, series);
    }

    @Transactional(readOnly = true)
    public List<PriceReportChartDetailResponse> getChartPointDetails(
            Long spiritId, LocalDate pointDate, StoreType storeType, BucketType bucketType,
            Integer volumeMl, boolean unknownVolume) {
        return getChartPointDetails(List.of(spiritId), pointDate, storeType, bucketType, volumeMl, unknownVolume);
    }

    @Transactional(readOnly = true)
    public List<PriceReportChartDetailResponse> getChartPointDetails(
            List<Long> spiritIds, LocalDate pointDate, StoreType storeType, BucketType bucketType,
            Integer volumeMl, boolean unknownVolume) {
        List<Long> targetSpiritIds = normalizeSpiritIds(spiritIds);
        if (targetSpiritIds.isEmpty()) return List.of();
        boolean weekly = bucketType == BucketType.WEEKLY;
        LocalDate rangeStart = weekly
                ? pointDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                : pointDate;
        LocalDate rangeEnd = weekly ? rangeStart.plusDays(6) : pointDate;

        List<PriceReport> reports = priceReportRepository.findApprovedForChartDetail(
                targetSpiritIds, PriceReportStatus.APPROVED);
        reports = reports.stream()
                .filter(r -> {
                    LocalDate rDate = effectiveDate(r);
                    return !rDate.isBefore(rangeStart) && !rDate.isAfter(rangeEnd);
                })
                .filter(r -> matchesVolume(r.getVolumeMl(), volumeMl, unknownVolume))
                .toList();

        List<DealPost> deals = dealPostRepository.findAllBySpiritIdInAndStatusAndIsVisibleTrue(targetSpiritIds, DealStatus.APPROVED);
        List<DealPost> rangeDeals = deals.stream()
                .filter(d -> (d.getDealPrice() != null && d.getDealPrice() > 0) || (d.getOriginalPrice() != null && d.getOriginalPrice() > 0))
                .filter(d -> {
                    LocalDate dDate = effectiveDate(d);
                    return !dDate.isBefore(rangeStart) && !dDate.isAfter(rangeEnd);
                })
                .filter(d -> storeType == null || d.getStoreType() == storeType)
                .filter(d -> matchesVolume(d.getVolumeMl(), volumeMl, unknownVolume))
                .toList();

        List<TempPrice> tempPrices = buildTempPrices(
                reports.stream().filter(r -> matchesStoreType(r, storeType)).toList(),
                rangeDeals
        );

        return tempPrices.stream()
                .filter(t -> t.date() != null)
                .sorted(Comparator
                        .comparing(TempPrice::date, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(TempPrice::finalPrice, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toDetailResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PriceVolumeOptionResponse> getVolumeOptions(List<Long> spiritIds, StoreType storeType) {
        List<Long> targetSpiritIds = normalizeSpiritIds(spiritIds);
        if (targetSpiritIds.isEmpty()) return List.of();

        Map<Integer, Long> counts = new HashMap<>();
        long unknownCount = 0;

        List<PriceReport> reports = priceReportRepository.findApprovedForChart(
                targetSpiritIds, PriceReportStatus.APPROVED);
        for (PriceReport report : reports) {
            if (!matchesStoreType(report, storeType)) continue;
            if (report.getVolumeMl() == null) {
                unknownCount++;
            } else {
                counts.merge(report.getVolumeMl(), 1L, Long::sum);
            }
        }

        List<DealPost> deals = dealPostRepository.findAllBySpiritIdInAndStatusAndIsVisibleTrue(
                targetSpiritIds, DealStatus.APPROVED);
        for (DealPost deal : deals) {
            if (storeType != null && deal.getStoreType() != storeType) continue;
            if ((deal.getDealPrice() == null || deal.getDealPrice() <= 0)
                    && (deal.getOriginalPrice() == null || deal.getOriginalPrice() <= 0)) continue;
            if (deal.getVolumeMl() == null) {
                unknownCount++;
            } else {
                counts.merge(deal.getVolumeMl(), 1L, Long::sum);
            }
        }

        List<PriceVolumeOptionResponse> options = counts.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new PriceVolumeOptionResponse(entry.getKey(), entry.getValue()))
                .collect(Collectors.toCollection(ArrayList::new));
        if (unknownCount > 0) {
            options.add(new PriceVolumeOptionResponse(null, unknownCount));
        }
        return options;
    }

    private record TempPrice(
            Long spiritId,
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

    private List<Long> normalizeSpiritIds(List<Long> spiritIds) {
        if (spiritIds == null) return List.of();
        return spiritIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

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

    private boolean matchesVolume(Integer candidateVolumeMl, Integer volumeMl, boolean unknownVolume) {
        if (unknownVolume) return candidateVolumeMl == null;
        if (volumeMl != null) return Objects.equals(candidateVolumeMl, volumeMl);
        return true;
    }

    private List<TempPrice> buildTempPrices(List<PriceReport> reports, List<DealPost> deals) {
        List<TempPrice> tempPrices = new ArrayList<>();
        for (PriceReport r : reports) {
            tempPrices.add(new TempPrice(
                    r.getSpirit().getId(),
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
            Integer rawDealPrice = d.getDealPrice();
            Integer rawOrigPrice = d.getOriginalPrice();
            Integer finalPriceVal = (rawDealPrice != null && rawDealPrice > 0) ? rawDealPrice : rawOrigPrice;
            BigDecimal priceVal = finalPriceVal != null ? BigDecimal.valueOf(finalPriceVal) : null;
            BigDecimal origVal = d.getOriginalPrice() != null ? BigDecimal.valueOf(d.getOriginalPrice()) : null;
            tempPrices.add(new TempPrice(
                    d.getSpirit() != null ? d.getSpirit().getId() : null,
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
