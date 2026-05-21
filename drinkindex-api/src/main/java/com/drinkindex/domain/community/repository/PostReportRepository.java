package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.PostReport;
import com.drinkindex.domain.community.entity.enums.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PostReportRepository extends JpaRepository<PostReport, Long> {

    Optional<PostReport> findByPostIdAndReporterId(Long postId, Long reporterId);

    boolean existsByPostIdAndReporterId(Long postId, Long reporterId);

    Page<PostReport> findByStatusOrderByCreatedAtDesc(ReportStatus status, Pageable pageable);

    long countByStatus(ReportStatus status);

    @Query("SELECT r.status, COUNT(r) FROM PostReport r GROUP BY r.status")
    List<Object[]> findStatusStats();

    @Modifying
    @Query("DELETE FROM PostReport r WHERE r.post.id = :postId")
    void deleteAllByPostId(@Param("postId") Long postId);
}
