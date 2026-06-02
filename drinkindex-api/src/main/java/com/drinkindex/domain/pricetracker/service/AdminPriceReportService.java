package com.drinkindex.domain.pricetracker.service;

import com.drinkindex.domain.pricetracker.dto.request.ApprovePriceReportRequest;
import com.drinkindex.domain.pricetracker.dto.request.RejectPriceReportRequest;
import com.drinkindex.domain.pricetracker.dto.response.AdminPriceReportResponse;
import com.drinkindex.domain.pricetracker.dto.response.AdminPriceReportReportResponse;
import com.drinkindex.domain.pricetracker.entity.PriceDiscountItem;
import com.drinkindex.domain.pricetracker.entity.PriceReport;
import com.drinkindex.domain.pricetracker.entity.PriceReportImage;
import com.drinkindex.domain.pricetracker.entity.PriceReportReport;
import com.drinkindex.domain.pricetracker.entity.Store;
import com.drinkindex.domain.pricetracker.entity.enums.PriceReportReportStatus;
import com.drinkindex.domain.pricetracker.entity.enums.PriceReportStatus;
import com.drinkindex.domain.pricetracker.entity.enums.StoreType;
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
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminPriceReportService {

    private final PriceReportRepository priceReportRepository;
    private final PriceReportImageRepository priceReportImageRepository;
    private final PriceReportReportRepository priceReportReportRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final ScoreService scoreService;
    private final PriceAlertService priceAlertService;

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

        // 인증 사진 있으면 isVerified=true
        boolean hasImages = !priceReportImageRepository
                .findByPriceReportIdOrderBySortOrder(id).isEmpty();
        if (hasImages) {
            report.verify();
        }

        report.approve(admin);
        PriceReport saved = priceReportRepository.save(report);

        // 비익명만 숙성력 점수 지급
        if (!saved.getIsAnonymous() && saved.getReporter() != null) {
            scoreService.award(saved.getReporter().getId(),
                    ScoreActions.PRICE_REGISTER, "PRICE_REPORT", saved.getId());
        }

        // 가격 알림 트리거 — 면세 가격은 KRW 비교 제외
        boolean isDutyFree = saved.getStore() != null
                && saved.getStore().getStoreType() == StoreType.DUTYFREE;
        if (!isDutyFree) {
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
}
