package com.caskbycask.admin.service;

import com.caskbycask.domain.admin.dto.*;
import com.caskbycask.domain.community.entity.enums.ReportStatus;
import com.caskbycask.domain.community.repository.PostReportRepository;
import com.caskbycask.domain.event.entity.enums.EventSource;
import com.caskbycask.domain.event.repository.CalendarEventRepository;
import com.caskbycask.domain.producer.repository.ProducerRegisterRequestRepository;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportReportStatus;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.repository.PriceReportReportRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
import com.caskbycask.domain.report.entity.enums.ReportTargetType;
import com.caskbycask.domain.report.repository.ReportRepository;
import com.caskbycask.domain.review.entity.enums.VariantReviewRequestStatus;
import com.caskbycask.domain.review.repository.SpiritVariantReviewRequestRepository;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritRegisterRequestRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
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
    private final CalendarEventRepository calendarEventRepository;
    private final SpiritRegisterRequestRepository spiritRegisterRequestRepository;
    private final ProducerRegisterRequestRepository producerRegisterRequestRepository;
    private final SpiritVariantReviewRequestRepository spiritVariantReviewRequestRepository;
    // [패치 12] 가격 트래커 모더레이션 큐 집계용
    private final PriceReportRepository priceReportRepository;
    private final PriceReportReportRepository priceReportReportRepository;

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
        long postReports = postReportRepository.countByStatus(ReportStatus.PENDING);
        long commentReports = reportRepository.countByTargetTypeAndStatus(
                ReportTargetType.COMMENT, com.caskbycask.domain.report.entity.enums.ReportStatus.PENDING);
        long priceReportReports = priceReportReportRepository.countByStatus(PriceReportReportStatus.PENDING);
        // 공지는 관리자가 직접 등록하므로 별도 승인 대기 큐 없음 → 0
        long noticeRegisterRequests = 0L;

        return DashboardPendingCountsResponse.of(
                spiritRegisterRequests, priceReports, flaggedPriceReports,
                postReports, commentReports, priceReportReports, noticeRegisterRequests);
    }

    public AdminApprovalEventSnapshotsResponse getApprovalEventSnapshots() {
        AdminApprovalEventSnapshotsResponse.AdminApprovalEventSnapshot spiritRegister =
                snapshot(
                        "/admin/spirits/requests",
                        spiritRegisterRequestRepository.countByStatus(RequestStatus.PENDING),
                        spiritRegisterRequestRepository.findTopByStatusOrderByCreatedAtDescIdDesc(RequestStatus.PENDING)
                                .map(req -> new LatestApprovalEvent("spirit-register:" + req.getId(), req.getCreatedAt()))
                                .orElse(null)
                );

        long variantCount = spiritRepository.countVariantRequestsByStatus(SpiritStatus.PENDING);
        LatestApprovalEvent latestVariant = spiritRepository
                .findLatestVariantRequests(SpiritStatus.PENDING, PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(req -> new LatestApprovalEvent("spirit-variant:" + req.getId(), req.getCreatedAt()))
                .orElse(null);

        long variantReviewCount = spiritVariantReviewRequestRepository.countByStatus(VariantReviewRequestStatus.PENDING);
        LatestApprovalEvent latestVariantReview = spiritVariantReviewRequestRepository
                .findTopByStatusOrderByCreatedAtDescIdDesc(VariantReviewRequestStatus.PENDING)
                .map(req -> new LatestApprovalEvent("variant-review:" + req.getId(), req.getCreatedAt()))
                .orElse(null);

        AdminApprovalEventSnapshotsResponse.AdminApprovalEventSnapshot variantRequests =
                snapshot(
                        "/admin/spirits/variant-requests",
                        variantCount + variantReviewCount,
                        latestOf(latestVariant, latestVariantReview)
                );

        AdminApprovalEventSnapshotsResponse.AdminApprovalEventSnapshot producerRegister =
                snapshot(
                        "/admin/producers/requests",
                        producerRegisterRequestRepository.countByStatus(RequestStatus.PENDING),
                        producerRegisterRequestRepository.findTopByStatusOrderByCreatedAtDescIdDesc(RequestStatus.PENDING)
                                .map(req -> new LatestApprovalEvent("producer-register:" + req.getId(), req.getCreatedAt()))
                                .orElse(null)
                );

        AdminApprovalEventSnapshotsResponse.AdminApprovalEventSnapshot priceReports =
                snapshot(
                        "/admin/price-reports",
                        priceReportRepository.countByStatus(PriceReportStatus.PENDING),
                        priceReportRepository.findTopByStatusOrderByCreatedAtDescIdDesc(PriceReportStatus.PENDING)
                                .map(report -> new LatestApprovalEvent("price-report:" + report.getId(), report.getCreatedAt()))
                                .orElse(null)
                );

        AdminApprovalEventSnapshotsResponse.AdminApprovalEventSnapshot eventSuggestions =
                snapshot(
                        "/admin/events",
                        calendarEventRepository.countBySourceAndIsVisibleFalse(EventSource.USER),
                        calendarEventRepository.findTopBySourceAndIsVisibleFalseOrderByCreatedAtDescIdDesc(EventSource.USER)
                                .map(event -> new LatestApprovalEvent("event-suggestion:" + event.getId(), event.getCreatedAt()))
                                .orElse(null)
                );

        return new AdminApprovalEventSnapshotsResponse(List.of(
                eventSuggestions,
                spiritRegister,
                variantRequests,
                producerRegister,
                priceReports
        ));
    }

    public List<DashboardDailyStatResponse> getUserTrend(int period) {
        LocalDateTime from = LocalDate.now().minusDays(period - 1L).atStartOfDay();
        long countBefore = userRepository.countByCreatedAtBefore(from);
        Map<String, Long> dataMap = userRepository.findDailySignupTrend(from).stream()
                .collect(Collectors.toMap(
                        p -> p.getDate().toLocalDate().toString(),
                        DailyCountProjection::getCount
                ));
        Map<String, Long> deletedMap = userRepository.findDailyWithdrawalTrend(from).stream()
                .collect(Collectors.toMap(
                        p -> p.getDate().toLocalDate().toString(),
                        DailyCountProjection::getCount
                ));
        return buildDailyStats(period, dataMap, deletedMap, countBefore);
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
        long countBefore = reviewRepository.countByCreatedAtBefore(from);
        Map<String, Long> dataMap = reviewRepository.findDailyReviewTrend(from).stream()
                .collect(Collectors.toMap(
                        p -> p.getDate().toLocalDate().toString(),
                        DailyCountProjection::getCount
                ));
        Map<String, Long> deletedMap = reviewRepository.findDailyDeleteTrend(from).stream()
                .collect(Collectors.toMap(
                        p -> p.getDate().toLocalDate().toString(),
                        DailyCountProjection::getCount
                ));
        return buildDailyStats(period, dataMap, deletedMap, countBefore);
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

    private List<DashboardDailyStatResponse> buildDailyStats(int period, Map<String, Long> dataMap, Map<String, Long> deletedMap, long countBefore) {
        List<DashboardDailyStatResponse> result = new ArrayList<>(period);
        LocalDate today = LocalDate.now();
        long runningCount = countBefore;
        for (int i = period - 1; i >= 0; i--) {
            String date = today.minusDays(i).toString();
            long dailyCount = dataMap.getOrDefault(date, 0L);
            long dailyDeleted = deletedMap.getOrDefault(date, 0L);
            runningCount += dailyCount;
            result.add(new DashboardDailyStatResponse(date, dailyCount, runningCount, dailyDeleted));
        }
        return result;
    }

    private AdminApprovalEventSnapshotsResponse.AdminApprovalEventSnapshot snapshot(
            String path,
            long count,
            LatestApprovalEvent latest
    ) {
        return new AdminApprovalEventSnapshotsResponse.AdminApprovalEventSnapshot(
                path,
                count,
                latest == null ? null : latest.eventKey(),
                latest == null ? null : latest.createdAt()
        );
    }

    private LatestApprovalEvent latestOf(LatestApprovalEvent first, LatestApprovalEvent second) {
        if (first == null) return second;
        if (second == null) return first;
        int compared = first.createdAt().compareTo(second.createdAt());
        if (compared > 0) return first;
        if (compared < 0) return second;
        return first.eventKey().compareTo(second.eventKey()) >= 0 ? first : second;
    }

    private record LatestApprovalEvent(String eventKey, LocalDateTime createdAt) {
    }
}
