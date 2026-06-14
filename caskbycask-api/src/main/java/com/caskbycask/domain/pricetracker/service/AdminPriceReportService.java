package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.dto.request.ApprovePriceReportRequest;
import com.caskbycask.domain.pricetracker.dto.request.RejectPriceReportRequest;
import com.caskbycask.domain.pricetracker.dto.response.AdminPriceReportResponse;
import com.caskbycask.domain.pricetracker.dto.response.AdminPriceReportReportResponse;
import com.caskbycask.domain.pricetracker.entity.PriceDiscountItem;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.PriceReportImage;
import com.caskbycask.domain.pricetracker.entity.PriceReportReport;
import com.caskbycask.domain.pricetracker.entity.Store;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.pricetracker.repository.PriceDiscountItemRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportImageRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportReportRepository;
import com.caskbycask.domain.pricetracker.repository.StoreRepository;
import com.caskbycask.domain.score.constant.ScoreActions;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminPriceReportService {

    private final PriceReportRepository priceReportRepository;
    private final PriceReportImageRepository priceReportImageRepository;
    private final PriceDiscountItemRepository priceDiscountItemRepository;
    private final PriceReportReportRepository priceReportReportRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final ScoreService scoreService;
    private final PriceAlertService priceAlertService;

    @Transactional(readOnly = true)
    public PageResponse<AdminPriceReportResponse> getPriceReports(
            PriceReportStatus status, Boolean isFlagged, Pageable pageable) {
        Page<PriceReport> page = priceReportRepository.findAllForAdmin(status, isFlagged, pageable);

        // [N+1 방지] 페이지 내 제보 이미지·할인항목을 각각 단일 쿼리로 모아 메모리에서 그룹핑한다.
        List<Long> reportIds = page.getContent().stream().map(PriceReport::getId).toList();
        Map<Long, List<PriceReportImage>> imagesByReport = reportIds.isEmpty()
                ? Map.of()
                : priceReportImageRepository
                        .findByPriceReportIdInOrderByPriceReportIdAscSortOrderAsc(reportIds).stream()
                        .collect(Collectors.groupingBy(img -> img.getPriceReport().getId()));
        Map<Long, List<PriceDiscountItem>> itemsByReport = reportIds.isEmpty()
                ? Map.of()
                : priceDiscountItemRepository.findByPriceReportIdIn(reportIds).stream()
                        .collect(Collectors.groupingBy(item -> item.getPriceReport().getId()));

        return PageResponse.from(page.map(report -> AdminPriceReportResponse.from(
                report,
                imagesByReport.getOrDefault(report.getId(), List.of()),
                itemsByReport.getOrDefault(report.getId(), List.of()))));
    }

    @Transactional
    public AdminPriceReportResponse approvePriceReport(Long id, Long adminId, ApprovePriceReportRequest request) {
        PriceReport report = priceReportRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.PRICE_REPORT_NOT_FOUND));

        User admin = userRepository.getByIdOrThrow(adminId);

        // [패치 10] 매장 승인 + 가격 승인 통합 처리.
        //   ① request.storeId 제공 → 표준 매장 매핑 (미승인 매장이면 이 자리에서 신규 승인)
        //   ② 미제공 → 기존 store 사용. 단, 매장이 확정(승인)되지 않으면 가격 APPROVED 불가.
        if (request != null && request.storeId() != null) {
            Store store = storeRepository.findById(request.storeId())
                    .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));
            if (Boolean.FALSE.equals(store.getIsApproved())) {
                store.approve(admin); // 신규 매장 승인
            }
            report.updateStore(store);
        }

        // [패치 10] 매장 확정 없이는 가격 APPROVED 불가
        Store resolvedStore = report.getStore();
        if (resolvedStore == null || Boolean.FALSE.equals(resolvedStore.getIsApproved())) {
            throw new CustomException(ErrorCode.STORE_RESOLUTION_REQUIRED);
        }

        // 인증 사진 있으면 isVerified=true
        boolean hasImages = !priceReportImageRepository
                .findByPriceReportIdOrderBySortOrder(id).isEmpty();
        if (hasImages) {
            report.verify();
        }

        report.approve(admin);
        PriceReport saved = priceReportRepository.save(report);

        // 비익명만 레벨 점수 지급
        if (!saved.getIsAnonymous() && saved.getReporter() != null) {
            scoreService.award(saved.getReporter().getId(),
                    ScoreActions.PRICE_REGISTER, "PRICE_REPORT", saved.getId());
        }

        // [패치 8] 면세(USD) 가격은 환율 변동으로 근사치라 KRW 목표가 알림 비교에서 제외.
        //          국내 매장(DOMESTIC) + 통화 KRW 인 경우에만 알림 비교 대상.
        boolean isDomesticKrw = saved.getStore() != null
                && saved.getStore().getStoreType() == StoreType.DOMESTIC
                && saved.getCurrency() == PriceCurrency.KRW;
        if (isDomesticKrw) {
            priceAlertService.checkAndNotifyAlerts(
                    saved.getSpirit().getId(), saved.getActualPrice(), saved.getId());
        }

        List<PriceReportImage> images = priceReportImageRepository
                .findByPriceReportIdOrderBySortOrder(id);

        return AdminPriceReportResponse.from(saved, images, saved.getDiscountItems());
    }

    @Transactional
    public AdminPriceReportResponse rejectPriceReport(Long id, Long adminId, RejectPriceReportRequest request) {
        PriceReport report = priceReportRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.PRICE_REPORT_NOT_FOUND));

        report.reject(request.rejectReason());
        PriceReport saved = priceReportRepository.save(report);

        List<PriceReportImage> images = priceReportImageRepository
                .findByPriceReportIdOrderBySortOrder(id);

        return AdminPriceReportResponse.from(saved, images, saved.getDiscountItems());
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminPriceReportReportResponse> getReports(
            PriceReportReportStatus status, Pageable pageable) {
        return PageResponse.from(
                priceReportReportRepository.findAllForAdmin(status, pageable)
                        .map(AdminPriceReportReportResponse::from));
    }

    @Transactional
    public void resolveReport(Long reportId, Long adminId) {
        PriceReportReport report = priceReportReportRepository.findById(reportId)
                .orElseThrow(() -> new CustomException(ErrorCode.PRICE_REPORT_NOT_FOUND));
        User admin = userRepository.getByIdOrThrow(adminId);
        report.resolve(admin);
        priceReportReportRepository.save(report);
    }

    @Transactional
    public void dismissReport(Long reportId, Long adminId) {
        PriceReportReport report = priceReportReportRepository.findById(reportId)
                .orElseThrow(() -> new CustomException(ErrorCode.PRICE_REPORT_NOT_FOUND));
        User admin = userRepository.getByIdOrThrow(adminId);
        report.dismiss(admin);
        priceReportReportRepository.save(report);
    }
}
