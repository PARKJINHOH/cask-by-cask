package com.caskbycask.admin.service;

import com.caskbycask.domain.admin.dto.*;
import com.caskbycask.domain.community.entity.enums.ReportStatus;
import com.caskbycask.domain.community.repository.PostReportRepository;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.repository.PriceReportReportRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
import com.caskbycask.domain.pricetracker.repository.StoreRepository;
import com.caskbycask.domain.report.entity.enums.ReportTargetType;
import com.caskbycask.domain.report.repository.ReportRepository;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.spirit.repository.SpiritRegisterRequestRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final SpiritRepository spiritRepository;
    private final ReportRepository reportRepository;
    private final PostReportRepository postReportRepository;
    private final SpiritRegisterRequestRepository spiritRegisterRequestRepository;
    // [패치 12] 가격 트래커 모더레이션 큐 집계용
    private final PriceReportRepository priceReportRepository;
    private final PriceReportReportRepository priceReportReportRepository;
    private final StoreRepository storeRepository;

    public DashboardKpisResponse getKpis() {
        long totalUsers = userRepository.countByIsActiveTrue();

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = todayStart.plusDays(1);
        long todayNewUsers = userRepository.countByCreatedAtBetween(todayStart, todayEnd);

        long pendingReports = reportRepository.countByStatus(com.caskbycask.domain.report.entity.enums.ReportStatus.PENDING)
                + postReportRepository.countByStatus(ReportStatus.PENDING);

        long pendingRequests = spiritRegisterRequestRepository.countByStatus(RequestStatus.PENDING);

        return new DashboardKpisResponse(totalUsers, todayNewUsers, pendingReports, pendingRequests);
    }

    // [패치 12] 통합 모더레이션 대시보드 — 처리 대기 큐 집계
    public DashboardPendingCountsResponse getPendingCounts() {
        long spiritRegisterRequests = spiritRegisterRequestRepository.countByStatus(RequestStatus.PENDING);
        long priceReports = priceReportRepository.countByStatus(PriceReportStatus.PENDING);
        long flaggedPriceReports = priceReportRepository.countByStatusAndAutoFlaggedTrue(PriceReportStatus.PENDING);
        long storeSuggestions = storeRepository.countByIsApprovedFalse();
        long postReports = postReportRepository.countByStatus(ReportStatus.PENDING);
        long commentReports = reportRepository.countByTargetTypeAndStatus(
                ReportTargetType.COMMENT, com.caskbycask.domain.report.entity.enums.ReportStatus.PENDING);
        long priceReportReports = priceReportReportRepository.countByStatus(PriceReportReportStatus.PENDING);
        // 공지는 관리자가 직접 등록하므로 별도 승인 대기 큐 없음 → 0
        long noticeRegisterRequests = 0L;

        return DashboardPendingCountsResponse.of(
                spiritRegisterRequests, priceReports, flaggedPriceReports, storeSuggestions,
                postReports, commentReports, priceReportReports, noticeRegisterRequests);
    }

    public List<DashboardDailyStatResponse> getUserTrend(int period) {
        LocalDateTime from = LocalDate.now().minusDays(period - 1L).atStartOfDay();
        Map<String, Long> dataMap = userRepository.findDailySignupTrend(from).stream()
                .collect(Collectors.toMap(
                        p -> p.getDate().toLocalDate().toString(),
                        DailyCountProjection::getCount
                ));
        return buildDailyStats(period, dataMap);
    }

    public List<DashboardCategoryStatResponse> getCategoryStats() {
        return spiritRepository.findCategoryStats().stream()
                .map(row -> new DashboardCategoryStatResponse(
                        row[0].toString(),
                        ((Number) row[1]).longValue()
                ))
                .collect(Collectors.toList());
    }

    public List<DashboardDailyStatResponse> getReviewTrend(int period) {
        LocalDateTime from = LocalDate.now().minusDays(period - 1L).atStartOfDay();
        Map<String, Long> dataMap = reviewRepository.findDailyReviewTrend(from).stream()
                .collect(Collectors.toMap(
                        p -> p.getDate().toLocalDate().toString(),
                        DailyCountProjection::getCount
                ));
        return buildDailyStats(period, dataMap);
    }

    public List<DashboardReportStatResponse> getReportStats() {
        Map<String, Long> statsMap = new LinkedHashMap<>();
        for (com.caskbycask.domain.report.entity.enums.ReportStatus s : com.caskbycask.domain.report.entity.enums.ReportStatus.values()) {
            statsMap.put(s.name(), 0L);
        }

        reportRepository.findStatusStats().forEach(row ->
                statsMap.merge(row[0].toString(), ((Number) row[1]).longValue(), Long::sum));

        postReportRepository.findStatusStats().forEach(row ->
                statsMap.merge(row[0].toString(), ((Number) row[1]).longValue(), Long::sum));

        return statsMap.entrySet().stream()
                .map(e -> new DashboardReportStatResponse(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }

    private List<DashboardDailyStatResponse> buildDailyStats(int period, Map<String, Long> dataMap) {
        List<DashboardDailyStatResponse> result = new ArrayList<>(period);
        LocalDate today = LocalDate.now();
        for (int i = period - 1; i >= 0; i--) {
            String date = today.minusDays(i).toString();
            result.add(new DashboardDailyStatResponse(date, dataMap.getOrDefault(date, 0L)));
        }
        return result;
    }
}
