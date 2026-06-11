package com.drinkindex.domain.feedback.repository;

import com.drinkindex.domain.feedback.entity.Feedback;
import com.drinkindex.domain.feedback.entity.enums.FeedbackStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    // 일반 회원 — 본인 글만 ("내 요청" 탭)
    Page<Feedback> findByAuthorId(Long authorId, Pageable pageable);

    Page<Feedback> findByAuthorIdAndStatus(Long authorId, FeedbackStatus status, Pageable pageable);

    // 관리자 — 전체
    Page<Feedback> findByStatus(FeedbackStatus status, Pageable pageable);

    // 일반 회원 — 공개글 + 본인 글 ("전체" 탭)
    @Query("SELECT f FROM Feedback f WHERE f.isPublic = true OR f.author.id = :userId")
    Page<Feedback> findVisible(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT f FROM Feedback f WHERE f.status = :status AND (f.isPublic = true OR f.author.id = :userId)")
    Page<Feedback> findVisibleByStatus(@Param("userId") Long userId, @Param("status") FeedbackStatus status, Pageable pageable);
}
