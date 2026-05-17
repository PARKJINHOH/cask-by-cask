package com.drinkindex.domain.score.repository;

import com.drinkindex.domain.score.entity.ScoreHistory;
import com.drinkindex.domain.score.entity.enums.ScoreActionType;
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
            @Param("actionType") ScoreActionType actionType,
            @Param("today") LocalDate today);

    Page<ScoreHistory> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @Modifying
    @Query("DELETE FROM ScoreHistory sh WHERE sh.createdAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
