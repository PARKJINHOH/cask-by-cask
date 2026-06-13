package com.caskbycask.domain.notice.repository;

import com.caskbycask.domain.notice.entity.Notice;
import com.caskbycask.domain.notice.entity.NoticeCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NoticeRepository extends JpaRepository<Notice, Long>,
        QuerydslPredicateExecutor<Notice> {

    // 공개 조회 — @SQLRestriction("deleted_at IS NULL") 자동 적용
    Optional<Notice> findByIdAndIsPublishedTrue(Long id);

    Page<Notice> findAllByIsPublishedTrue(Pageable pageable);

    Page<Notice> findAllByIsPublishedTrueAndCategory(NoticeCategory category, Pageable pageable);

    // 관리자 조회: isPublished 무관, deletedAt IS NULL 자동 적용
    @Query("SELECT n FROM Notice n WHERE (:category IS NULL OR n.category = :category) " +
           "AND (:isPublished IS NULL OR n.isPublished = :isPublished)")
    Page<Notice> findAllForAdmin(
            @Param("category") NoticeCategory category,
            @Param("isPublished") Boolean isPublished,
            Pageable pageable
    );

    // [동시성] 애플리케이션 레벨 갱신 대신 DB 레벨 UPDATE로 race condition 방지
    @Modifying
    @Query("UPDATE Notice n SET n.viewCount = n.viewCount + 1 WHERE n.id = :id")
    void incrementViewCount(@Param("id") Long id);
}
