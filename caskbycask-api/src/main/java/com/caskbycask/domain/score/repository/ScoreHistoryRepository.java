package com.caskbycask.domain.score.repository;

import com.caskbycask.domain.score.entity.ScoreHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;

public interface ScoreHistoryRepository extends JpaRepository<ScoreHistory, Long> {

    @Query("SELECT COALESCE(SUM(sh.score), 0) FROM ScoreHistory sh " +
           "WHERE sh.user.id = :userId AND sh.actionType = :actionType " +
           "AND FUNCTION('DATE', sh.createdAt) = :today")
    Integer sumTodayScoreByUserAndAction(
            @Param("userId") Long userId,
            @Param("actionType") String actionType,
            @Param("today") LocalDate today);

    // [패치 1] 동일 reference 재지급 방지 — 이미 지급(score > 0)된 이력 존재 여부
    boolean existsByUserIdAndActionTypeAndReferenceTypeAndReferenceIdAndScoreGreaterThan(
            Long userId, String actionType, String referenceType, Long referenceId, int score);

    // [패치 1] 특정 reference로 지급된 점수 합산 (차감 시 "원래 지급액" 계산용)
    @Query("SELECT COALESCE(SUM(sh.score), 0) FROM ScoreHistory sh " +
           "WHERE sh.user.id = :userId AND sh.actionType = :actionType " +
           "AND sh.referenceType = :referenceType AND sh.referenceId = :referenceId " +
           "AND sh.score > 0")
    Integer sumAwardedScoreByReference(
            @Param("userId") Long userId,
            @Param("actionType") String actionType,
            @Param("referenceType") String referenceType,
            @Param("referenceId") Long referenceId);

    Page<ScoreHistory> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    // 사용자 본인 이력 필터링 — 적립(score > 0) / 차감(score < 0)
    Page<ScoreHistory> findByUserIdAndScoreGreaterThanOrderByCreatedAtDesc(
            Long userId, int score, Pageable pageable);

    Page<ScoreHistory> findByUserIdAndScoreLessThanOrderByCreatedAtDesc(
            Long userId, int score, Pageable pageable);

    @Modifying
    @Query("DELETE FROM ScoreHistory sh WHERE sh.createdAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
