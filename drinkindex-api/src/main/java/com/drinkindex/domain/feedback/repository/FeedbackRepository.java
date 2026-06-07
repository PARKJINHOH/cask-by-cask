package com.drinkindex.domain.feedback.repository;

import com.drinkindex.domain.feedback.entity.Feedback;
import com.drinkindex.domain.feedback.entity.enums.FeedbackStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    // 일반 회원 — 본인 글만
    Page<Feedback> findByAuthorId(Long authorId, Pageable pageable);

    Page<Feedback> findByAuthorIdAndStatus(Long authorId, FeedbackStatus status, Pageable pageable);

    // 관리자 — 전체
    Page<Feedback> findByStatus(FeedbackStatus status, Pageable pageable);
}
