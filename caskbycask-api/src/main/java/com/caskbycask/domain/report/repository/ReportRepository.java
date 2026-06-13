package com.caskbycask.domain.report.repository;

import com.caskbycask.domain.report.entity.Report;
import com.caskbycask.domain.report.entity.enums.ReportStatus;
import com.caskbycask.domain.report.entity.enums.ReportTargetType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {

    boolean existsByReporterIdAndTargetTypeAndTargetId(
            Long reporterId, ReportTargetType targetType, Long targetId);

    long countByTargetTypeAndTargetIdAndStatus(
            ReportTargetType targetType, Long targetId, ReportStatus status);

    @Query(value = """
            SELECT r FROM Report r
            JOIN FETCH r.reporter
            WHERE (:status IS NULL OR r.status = :status)
              AND (:targetType IS NULL OR r.targetType = :targetType)
            """,
            countQuery = """
            SELECT COUNT(r) FROM Report r
            WHERE (:status IS NULL OR r.status = :status)
              AND (:targetType IS NULL OR r.targetType = :targetType)
            """)
    Page<Report> findWithFilters(
            @Param("status") ReportStatus status,
            @Param("targetType") ReportTargetType targetType,
            Pageable pageable);

    long countByStatus(ReportStatus status);

    // [패치 12] 모더레이션 대시보드 — 대상 유형별 미처리 신고 수 (예: 술 댓글 COMMENT)
    long countByTargetTypeAndStatus(ReportTargetType targetType, ReportStatus status);

    @Query("SELECT r.status, COUNT(r) FROM Report r GROUP BY r.status")
    List<Object[]> findStatusStats();
}
