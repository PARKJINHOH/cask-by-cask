package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.PostReport;
import com.drinkindex.domain.community.entity.enums.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PostReportRepository extends JpaRepository<PostReport, Long> {

    Optional<PostReport> findByPostIdAndReporterId(Long postId, Long reporterId);

    boolean existsByPostIdAndReporterId(Long postId, Long reporterId);

    Page<PostReport> findByStatusOrderByCreatedAtDesc(ReportStatus status, Pageable pageable);
}
