package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.dto.request.CreateDiscountItemRequest;
import com.caskbycask.domain.pricetracker.dto.request.CreatePriceReportRequest;
import com.caskbycask.domain.pricetracker.dto.request.CreatePriceReportReportRequest;
import com.caskbycask.domain.pricetracker.dto.request.UpdatePriceReportRequest;
import com.caskbycask.domain.pricetracker.dto.response.PriceReportResponse;
import com.caskbycask.domain.pricetracker.dto.response.PriceReportSummaryResponse;
import com.caskbycask.domain.pricetracker.entity.*;
import com.caskbycask.domain.pricetracker.entity.enums.DutyFreeChannel;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.pricetracker.repository.*;
import com.caskbycask.domain.score.constant.ScoreActions;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.response.PageResponse;
import com.caskbycask.global.util.BadWordFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PriceReportService {

    private final PriceReportRepository priceReportRepository;
    private final PriceReportImageRepository priceReportImageRepository;
    private final PriceReportReportRepository priceReportReportRepository;
    private final PriceDiscountItemRepository priceDiscountItemRepository;
    private final StoreRepository storeRepository;
    private final SpiritRepository spiritRepository;
    private final UserRepository userRepository;
    private final BadWordFilter badWordFilter;
    private final ScoreService scoreService;

    @Transactional(readOnly = true)
    public PriceReportResponse getPriceReport(Long id, Long callerId, boolean isAdmin) {
        PriceReport report = priceReportRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.PRICE_REPORT_NOT_FOUND));

        // APPROVED 아닌 경우 본인/관리자만 조회
        if (report.getStatus() != PriceReportStatus.APPROVED) {
            if (!isAdmin && (callerId == null || !callerId.equals(
                    report.getReporter() != null ? report.getReporter().getId() : null))) {
                throw new CustomException(ErrorCode.PRICE_REPORT_ACCESS_DENIED);
            }
        }

        // 관리자 = 전체 이미지, 일반 = 공개 이미지만
        List<PriceReportImage> images = isAdmin
                ? priceReportImageRepository.findByPriceReportIdOrderBySortOrder(id)
                : priceReportImageRepository.findByPriceReportIdAndIsPublicTrueOrderBySortOrder(id);

        List<PriceDiscountItem> discountItems = report.getDiscountItems();

        return PriceReportResponse.from(report, images, discountItems);
    }

    @Transactional
    public PriceReportResponse createPriceReport(Long userId, CreatePriceReportRequest request) {
        // 가격 설명과 직접 입력 판매처명에 금칙어 필터를 동일하게 적용한다.
        badWordFilter.validate(request.description(), request.suggestedStoreName());

        Spirit spirit = spiritRepository.findById(request.spiritId())
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        Store store = null;
        if (request.storeId() != null) {
            store = storeRepository.findById(request.storeId())
                    .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));
        }
        StoreType storeType = resolveStoreType(store, request.storeType(), request.currency(),
                request.dutyfreeChannel());
        validateStoreTypeCurrency(storeType, request.currency(), request.exchangeRate());

        BigDecimal actualPrice = computeActualPrice(request.finalPrice(), request.salePrice(),
                request.paybackAmount(), request.regularPrice(), request.discountItems(), storeType);

        boolean autoFlagged = checkAutoFlag(spirit.getId(),
                store != null ? store.getId() : null,
                request.volumeMl(), request.currency(), actualPrice);

        User reporter = userRepository.getByIdOrThrow(userId);

        PriceReport report = PriceReport.builder()
                .spirit(spirit)
                .store(store)
                .storeTypeSnapshot(storeType)
                .reporter(reporter)
                .suggestedStoreName(request.suggestedStoreName())
                .suggestedDutyfreeChannel(request.dutyfreeChannel())
                .currency(request.currency())
                .price(request.regularPrice())
                .salePrice(request.salePrice())
                .paybackAmount(request.paybackAmount())
                .actualPrice(actualPrice)
                .volumeMl(request.volumeMl())
                .exchangeRateSnapshot(request.exchangeRate())
                .purchasedAt(request.purchasedAt())
                .description(request.description())
                .isAnonymous(Boolean.TRUE.equals(request.isAnonymous()))
                .autoFlagged(autoFlagged)
                .build();

        // 면세점 할인 항목 연결 (cascade로 함께 저장)
        if (request.discountItems() != null) {
            for (CreateDiscountItemRequest d : request.discountItems()) {
                report.getDiscountItems().add(PriceDiscountItem.builder()
                        .priceReport(report)
                        .discountType(d.discountType())
                        .discountAmount(d.amount())
                        .description(d.label())
                        .build());
            }
        }

        PriceReport saved = priceReportRepository.save(report);

        // 이미지 연결 (임시 → 보고서 연결)
        List<PriceReportImage> images = linkImages(request.imageIds(), request.imagePublicFlags(), userId, saved);

        return PriceReportResponse.from(saved, images, saved.getDiscountItems());
    }

    @Transactional
    public PriceReportResponse updatePriceReport(Long id, Long userId, UpdatePriceReportRequest request) {
        PriceReport report = priceReportRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.PRICE_REPORT_NOT_FOUND));

        validateOwner(report, userId);

        // 가격 수정 시에도 설명과 직접 입력 판매처명을 함께 검사한다.
        badWordFilter.validate(request.description(), request.suggestedStoreName());

        Store store = null;
        if (request.storeId() != null) {
            store = storeRepository.findById(request.storeId())
                    .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));
        }
        StoreType storeType = resolveStoreType(store, request.storeType(), request.currency(),
                request.dutyfreeChannel());
        validateStoreTypeCurrency(storeType, request.currency(), request.exchangeRate());

        BigDecimal actualPrice = computeActualPrice(request.finalPrice(), request.salePrice(),
                request.paybackAmount(), request.regularPrice(), request.discountItems(), storeType);

        boolean autoFlagged = checkAutoFlag(report.getSpirit().getId(),
                store != null ? store.getId() : null, request.volumeMl(), request.currency(), actualPrice);

        // 기존 이미지 연결 해제
        priceReportImageRepository.findByPriceReportIdOrderBySortOrder(id)
                .forEach(img -> {
                    img.unlinkFromPriceReport();
                    priceReportImageRepository.save(img);
                });

        // 기존 할인 항목 제거 후 재등록
        report.getDiscountItems().clear();
        if (request.discountItems() != null) {
            for (CreateDiscountItemRequest d : request.discountItems()) {
                report.getDiscountItems().add(PriceDiscountItem.builder()
                        .priceReport(report)
                        .discountType(d.discountType())
                        .discountAmount(d.amount())
                        .description(d.label())
                        .build());
            }
        }

        report.update(store, storeType, request.suggestedStoreName(), request.dutyfreeChannel(), request.currency(),
                request.regularPrice(), request.salePrice(), request.paybackAmount(),
                actualPrice, request.exchangeRate(), request.volumeMl(), request.purchasedAt(),
                request.description(), request.isAnonymous(), autoFlagged);
        report.resetToPending();

        PriceReport saved = priceReportRepository.save(report);

        List<PriceReportImage> images = linkImages(request.imageIds(), request.imagePublicFlags(), userId, saved);

        return PriceReportResponse.from(saved, images, saved.getDiscountItems());
    }

    @Transactional
    public void deletePriceReport(Long id, Long callerId, boolean isAdmin) {
        PriceReport report = priceReportRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.PRICE_REPORT_NOT_FOUND));

        if (!isAdmin) validateOwner(report, callerId);

        report.softDelete();
        priceReportRepository.save(report);

        // 승인되어 지급된 점수가 있다면 회수 (지급 이력 기반, 미지급이면 자동 스킵)
        if (report.getReporter() != null) {
            scoreService.deductByReference(report.getReporter().getId(),
                    ScoreActions.PRICE_REGISTER, "PRICE_REPORT", report.getId());
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<PriceReportSummaryResponse> getMyPriceReports(
            Long userId, PriceReportStatus status, Pageable pageable) {
        return PageResponse.from(
                priceReportRepository.findByReporter(userId, status, pageable)
                        .map(PriceReportSummaryResponse::from));
    }

    @Transactional
    public void reportPriceReport(Long priceReportId, Long reporterId, CreatePriceReportReportRequest request) {
        PriceReport priceReport = priceReportRepository.findById(priceReportId)
                .orElseThrow(() -> new CustomException(ErrorCode.PRICE_REPORT_NOT_FOUND));

        // 본인 등록 신고 불가
        if (priceReport.getReporter() != null && priceReport.getReporter().getId().equals(reporterId)) {
            throw new CustomException(ErrorCode.PRICE_REPORT_ACCESS_DENIED);
        }

        // 중복 신고 불가
        if (priceReportReportRepository.existsByPriceReportIdAndReporterId(priceReportId, reporterId)) {
            throw new CustomException(ErrorCode.DUPLICATE_PRICE_REPORT_REPORT);
        }

        User reporter = userRepository.getByIdOrThrow(reporterId);

        PriceReportReport report = PriceReportReport.builder()
                .priceReport(priceReport)
                .reporter(reporter)
                .reason(request.reason())
                .reasonDetail(request.reasonDetail())
                .build();

        priceReportReportRepository.save(report);
        priceReportRepository.incrementReportCount(priceReportId);
    }

    // ═══════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════

    private void validateOwner(PriceReport report, Long userId) {
        if (report.getReporter() == null || !report.getReporter().getId().equals(userId)) {
            throw new CustomException(ErrorCode.PRICE_REPORT_ACCESS_DENIED);
        }
    }

    private BigDecimal computeActualPrice(BigDecimal finalPrice, BigDecimal salePrice,
                                          BigDecimal paybackAmount, BigDecimal regularPrice,
                                          List<CreateDiscountItemRequest> discountItems, StoreType storeType) {
        if (finalPrice != null) return finalPrice;

        // 면세점: 정가 - SUM(할인항목)
        if (storeType == StoreType.DUTYFREE
                && discountItems != null && !discountItems.isEmpty()) {
            BigDecimal base = regularPrice != null ? regularPrice : BigDecimal.ZERO;
            BigDecimal totalDiscount = discountItems.stream()
                    .map(CreateDiscountItemRequest::amount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            return base.subtract(totalDiscount);
        }

        // 국내: 행사가 - 페이백
        BigDecimal sale = salePrice != null ? salePrice : BigDecimal.ZERO;
        BigDecimal payback = paybackAmount != null ? paybackAmount : BigDecimal.ZERO;
        return sale.subtract(payback);
    }

    private StoreType resolveStoreType(Store store, StoreType requestedType, PriceCurrency currency,
                                       DutyFreeChannel dutyfreeChannel) {
        // 기존 storeId 요청은 마스터의 유형을 신뢰해 하위 호환한다.
        if (store != null && store.getStoreType() != null) return store.getStoreType();
        if (requestedType != null) return requestedType;
        // 구버전 직접 입력 요청에는 storeType이 없으므로 기존 필드로 안전하게 추론한다.
        if (currency == PriceCurrency.USD || dutyfreeChannel != null) return StoreType.DUTYFREE;
        return StoreType.DOMESTIC;
    }

    private void validateStoreTypeCurrency(StoreType storeType, PriceCurrency currency,
                                           BigDecimal exchangeRate) {
        if (storeType == StoreType.DUTYFREE) {
            if (currency != PriceCurrency.USD) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            if (exchangeRate == null) {
                throw new CustomException(ErrorCode.EXCHANGE_RATE_REQUIRED);
            }
            return;
        }
        if (currency != PriceCurrency.KRW) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private boolean checkAutoFlag(Long spiritId, Long storeId, Integer volumeMl,
                                  PriceCurrency currency, BigDecimal actualPrice) {
        if (actualPrice == null || storeId == null || volumeMl == null
                || currency != PriceCurrency.KRW) return false;

        List<BigDecimal> recentPrices = priceReportRepository.findRecentApprovedActualPrices(
                spiritId, storeId, volumeMl, PriceReportStatus.APPROVED, PriceCurrency.KRW,
                PageRequest.of(0, 20));

        if (recentPrices.isEmpty()) return false;

        BigDecimal median = calculateMedian(recentPrices);
        BigDecimal lowerBound = median.multiply(BigDecimal.valueOf(0.7));
        BigDecimal upperBound = median.multiply(BigDecimal.valueOf(1.3));

        return actualPrice.compareTo(lowerBound) < 0 || actualPrice.compareTo(upperBound) > 0;
    }

    private BigDecimal calculateMedian(List<BigDecimal> prices) {
        List<BigDecimal> sorted = prices.stream().sorted().toList();
        int size = sorted.size();
        if (size % 2 == 0) {
            return sorted.get(size / 2 - 1)
                    .add(sorted.get(size / 2))
                    .divide(BigDecimal.valueOf(2), RoundingMode.HALF_UP);
        }
        return sorted.get(size / 2);
    }

    private List<PriceReportImage> linkImages(List<Long> imageIds, List<Boolean> publicFlags,
                                               Long userId, PriceReport report) {
        if (imageIds == null || imageIds.isEmpty()) return List.of();

        List<PriceReportImage> tempImages = priceReportImageRepository
                .findTempImagesByUploader(imageIds, userId);

        if (tempImages.size() != imageIds.size()) {
            throw new CustomException(ErrorCode.PRICE_REPORT_IMAGE_NOT_FOUND);
        }

        for (int i = 0; i < tempImages.size(); i++) {
            boolean isPublic = (publicFlags != null && publicFlags.size() > i) ? publicFlags.get(i) : true;
            tempImages.get(i).linkToPriceReport(report, i, isPublic);
            priceReportImageRepository.save(tempImages.get(i));
        }

        return tempImages;
    }
}
