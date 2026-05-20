package com.drinkindex.admin.service;

import com.drinkindex.domain.admin.dto.*;
import com.drinkindex.domain.community.entity.enums.ReportStatus;
import com.drinkindex.domain.community.repository.PostReportRepository;
import com.drinkindex.domain.report.repository.ReportRepository;
import com.drinkindex.domain.spirit.entity.enums.RequestStatus;
import com.drinkindex.domain.spirit.repository.SpiritRegisterRequestRepository;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.domain.review.repository.ReviewRepository;
import com.drinkindex.domain.user.repository.UserRepository;
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

    public DashboardKpisResponse getKpis() {
        long totalUsers = userRepository.countByIsActiveTrue();

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = todayStart.plusDays(1);
        long todayNewUsers = userRepository.countByCreatedAtBetween(todayStart, todayEnd);

        long pendingReports = reportRepository.countByStatus(com.drinkindex.domain.report.entity.enums.ReportStatus.PENDING)
                + postReportRepository.countByStatus(ReportStatus.PENDING);

        long pendingRequests = spiritRegisterRequestRepository.countByStatus(RequestStatus.PENDING);

        return new DashboardKpisResponse(totalUsers, todayNewUsers, pendingReports, pendingRequests);
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
        for (com.drinkindex.domain.report.entity.enums.ReportStatus s : com.drinkindex.domain.report.entity.enums.ReportStatus.values()) {
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
