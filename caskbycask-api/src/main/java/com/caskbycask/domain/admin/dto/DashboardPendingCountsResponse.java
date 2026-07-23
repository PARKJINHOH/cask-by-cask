package com.caskbycask.domain.admin.dto;

import java.util.List;

/**
 * [패치 12] 관리자 통합 모더레이션 대시보드 — 처리 대기 큐 집계.
 * 각 카운트와 함께 해당 관리 페이지 경로(queues)를 제공해 프론트가 큐 리스트를 바로 렌더링할 수 있게 한다.
 */
public record DashboardPendingCountsResponse(
        long spiritRegisterRequests,   // 대기 술 등록요청 수
        long priceReports,             // 대기 가격 등록 수
        long flaggedPriceReports,      // 플래그된(대기) 가격 수
        long postReports,              // 미처리 게시글 신고 수
        long commentReports,           // 미처리 (술 상세) 댓글 신고 수
        long priceReportReports,       // 미처리 가격 신고 수
        long noticeRegisterRequests,   // 대기 공지 등록요청 수 (해당 시 — 현재는 관리자 직접 등록이라 0)
        long total,                    // 전체 대기 합계
        List<PendingQueueItem> queues  // 각 큐 + 관리 페이지 경로
) {
    public record PendingQueueItem(String key, long count, String path) {}

    public static DashboardPendingCountsResponse of(
            long spiritRegisterRequests, long priceReports, long flaggedPriceReports,
            long postReports, long commentReports,
            long priceReportReports, long noticeRegisterRequests) {

        long total = spiritRegisterRequests + priceReports + flaggedPriceReports
                + postReports + commentReports
                + priceReportReports + noticeRegisterRequests;

        List<PendingQueueItem> queues = List.of(
                new PendingQueueItem("spiritRegisterRequests", spiritRegisterRequests, "/admin/spirit-requests"),
                new PendingQueueItem("priceReports", priceReports, "/admin/price-reports"),
                new PendingQueueItem("flaggedPriceReports", flaggedPriceReports, "/admin/price-reports?flagged=true"),
                new PendingQueueItem("postReports", postReports, "/admin/reports/posts"),
                new PendingQueueItem("commentReports", commentReports, "/admin/reports/comments"),
                new PendingQueueItem("priceReportReports", priceReportReports, "/admin/price-report-reports")
        );

        return new DashboardPendingCountsResponse(
                spiritRegisterRequests, priceReports, flaggedPriceReports,
                postReports, commentReports, priceReportReports, noticeRegisterRequests,
                total, queues);
    }
}
