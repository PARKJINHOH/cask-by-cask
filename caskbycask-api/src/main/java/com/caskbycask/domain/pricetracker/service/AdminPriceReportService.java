package com.caskbycask.domain.pricetracker.service;

import com.caskbycask.domain.pricetracker.dto.request.ApprovePriceReportRequest;
import com.caskbycask.domain.pricetracker.dto.request.RejectPriceReportRequest;
import com.caskbycask.domain.pricetracker.dto.response.AdminPriceReportResponse;
import com.caskbycask.domain.pricetracker.dto.response.AdminPriceReportReportResponse;
import com.caskbycask.domain.pricetracker.entity.PriceDiscountItem;
import com.caskbycask.domain.pricetracker.entity.PriceReport;
import com.caskbycask.domain.pricetracker.entity.PriceReportImage;
import com.caskbycask.domain.pricetracker.entity.PriceReportReport;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.pricetracker.repository.PriceDiscountItemRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportImageRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportReportRepository;
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

    @Transactional(readOnly = true)
    public AdminPriceReportResponse getPriceReport(Long id) {
        PriceReport report = priceReportRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.PRICE_REPORT_NOT_FOUND));
        List<PriceReportImage> images = priceReportImageRepository
                .findByPriceReportIdOrderBySortOrder(id);

        return AdminPriceReportResponse.from(report, images, report.getDiscountItems());
    }

    @Transactional
    public AdminPriceReportResponse approvePriceReport(Long id, Long adminId, ApprovePriceReportRequest request) {
        PriceReport report = priceReportRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.PRICE_REPORT_NOT_FOUND));

        User admin = userRepository.getByIdOrThrow(adminId);

        // 가격 승인에서는 매장 마스터를 생성·승인·매핑하지 않는다.
        // 기존 Store 연결과 직접 입력 매장명은 관측 당시 데이터로 그대로 보존한다.
        if (request != null && request.storeType() != null) {
            boolean dutyFreeCurrency = report.getCurrency() == PriceCurrency.USD;
            boolean dutyFreeType = request.storeType() == StoreType.DUTYFREE;
            if (dutyFreeCurrency != dutyFreeType) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }
            report.updateStoreTypeSnapshot(request.storeType());
        }
        // 구버전 관리자 화면이 volumeMl 없이 승인해도 사용자가 입력한 용량을 지우지 않는다.
        if (request != null && request.volumeMl() != null) {
            report.updateVolume(request.volumeMl());
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
        boolean isDomesticKrw = saved.getEffectiveStoreType() == StoreType.DOMESTIC
                && saved.getCurrency() == PriceCurrency.KRW;
        if (isDomesticKrw) {
            priceAlertService.checkAndNotifyAlerts(
                    saved.getSpirit().getId(), saved.getVolumeMl(), saved.getActualPrice(), saved.getId());
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
