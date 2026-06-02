package com.drinkindex.domain.pricetracker.service;

import com.drinkindex.domain.pricetracker.dto.request.ApprovePriceReportRequest;
import com.drinkindex.domain.pricetracker.dto.request.RejectPriceReportRequest;
import com.drinkindex.domain.pricetracker.dto.response.AdminPriceReportResponse;
import com.drinkindex.domain.pricetracker.dto.response.AdminPriceReportReportResponse;
import com.drinkindex.domain.pricetracker.entity.PriceAlert;
import com.drinkindex.domain.pricetracker.entity.PriceDiscountItem;
import com.drinkindex.domain.pricetracker.entity.PriceReport;
import com.drinkindex.domain.pricetracker.entity.PriceReportImage;
import com.drinkindex.domain.pricetracker.entity.PriceReportReport;
import com.drinkindex.domain.pricetracker.entity.Store;
import com.drinkindex.domain.pricetracker.entity.enums.PriceReportReportStatus;
import com.drinkindex.domain.pricetracker.entity.enums.PriceReportStatus;
import com.drinkindex.domain.pricetracker.repository.PriceAlertRepository;
import com.drinkindex.domain.pricetracker.repository.PriceReportImageRepository;
import com.drinkindex.domain.pricetracker.repository.PriceReportRepository;
import com.drinkindex.domain.pricetracker.repository.PriceReportReportRepository;
import com.drinkindex.domain.pricetracker.repository.StoreRepository;
import com.drinkindex.domain.score.constant.ScoreActions;
import com.drinkindex.domain.score.service.ScoreService;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminPriceReportService {

    private final PriceReportRepository priceReportRepository;
    private final PriceReportImageRepository priceReportImageRepository;
    private final PriceReportReportRepository priceReportReportRepository;
    private final PriceAlertRepository priceAlertRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final ScoreService scoreService;

    @Transactional(readOnly = true)
    public PageResponse<AdminPriceReportResponse> getPriceReports(
            PriceReportStatus status, Boolean isFlagged, Pageable pageable) {
        return PageResponse.from(
                priceReportRepository.findAllForAdmin(status, isFlagged, pageable)
                        .map(report -> {
                            List<PriceReportImage> images = priceReportImageRepository
                                    .findByPriceReportIdOrderBySortOrder(report.getId());
                            List<PriceDiscountItem> items = report.getDiscountItems();
                            return AdminPriceReportResponse.from(report, images, items);
                        }));
    }

    @Transactional
    public AdminPriceReportResponse approvePriceReport(Long id, Long adminId, ApprovePriceReportRequest request) {
        PriceReport report = priceReportRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.PRICE_REPORT_NOT_FOUND));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 기타 제안 매장 → 표준 매장 매핑
        if (request != null && request.storeId() != null) {
            Store store = storeRepository.findById(request.storeId())
                    .orElseThrow(() -> new CustomException(ErrorCode.STORE_NOT_FOUND));
            report.updateStore(store);
        }

        report.approve(admin);
        PriceReport saved = priceReportRepository.save(report);

        // 닉네임 등록(비익명)만 점수 지급
        if (!saved.getIsAnonymous() && saved.getReporter() != null) {
            scoreService.award(saved.getReporter().getId(),
                    ScoreActions.PRICE_REGISTER, "PRICE_REPORT", saved.getId());
        }

        // 가격 알림 트리거 (면세 제외)
        if (saved.getStore() == null || saved.getStore().getStoreType() != null) {
            checkAndNotifyAlerts(saved);
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
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        report.resolve(admin);
        priceReportReportRepository.save(report);
    }

    @Transactional
    public void dismissReport(Long reportId, Long adminId) {
        PriceReportReport report = priceReportReportRepository.findById(reportId)
                .orElseThrow(() -> new CustomException(ErrorCode.PRICE_REPORT_NOT_FOUND));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        report.dismiss(admin);
        priceReportReportRepository.save(report);
    }

    // ═══════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════

    private void checkAndNotifyAlerts(PriceReport report) {
        // 면세 가격은 KRW 목표가 알림 비교 제외 (근사치 부정확)
        if (report.getStore() != null) {
            var storeType = report.getStore().getStoreType();
            if (storeType != null && storeType.name().equals("DUTYFREE")) return;
        }

        BigDecimal finalPriceKrw = report.getActualPrice();
        if (finalPriceKrw == null) return;

        List<PriceAlert> alerts = priceAlertRepository
                .findBySpiritIdAndIsActiveTrue(report.getSpirit().getId());

        for (PriceAlert alert : alerts) {
            if (alert.getTargetPriceKrw() != null
                    && alert.getTargetPriceKrw().compareTo(finalPriceKrw) >= 0) {
                // 목표가 도달 — 알림 발송 (NotificationService 연동 시 구현)
                log.info("Price alert triggered: userId={}, spiritId={}, targetPrice={}, actualPrice={}",
                        alert.getUser().getId(), alert.getSpirit().getId(),
                        alert.getTargetPriceKrw(), finalPriceKrw);
                alert.markNotified();
                priceAlertRepository.save(alert);
            }
        }
    }
}
