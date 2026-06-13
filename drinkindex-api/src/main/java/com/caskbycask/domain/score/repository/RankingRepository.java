package com.caskbycask.domain.score.repository;

import com.caskbycask.domain.score.dto.RankingProjection;
import com.caskbycask.domain.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface RankingRepository extends Repository<User, Long> {

    // ── 공통 SQL 조각 ──────────────────────────────────────────
    // 주의: Spring Data @Query에서는 SQL Fragment를 공유할 수 없으므로 각 쿼리에 포함
    // [패치 3] 랭킹은 MEMBER만 — 관리자·증류소(PARTNER) 제외 (기존 role NOT IN ('ADMIN','SUPER_ADMIN') → role = 'MEMBER')

    String WEEKLY_JOIN =
        "LEFT JOIN (SELECT user_id, SUM(score) AS ws FROM score_history WHERE created_at >= :weekStart GROUP BY user_id) wk ON u.id = wk.user_id ";
    String MONTHLY_JOIN =
        "LEFT JOIN (SELECT user_id, SUM(score) AS ms FROM score_history WHERE created_at >= :monthStart GROUP BY user_id) mo ON u.id = mo.user_id ";
    String BASE_WHERE =
        "WHERE u.role = 'MEMBER' AND u.is_active = 1 AND u.deleted_at IS NULL ";
    String COUNT_QUERY =
        "SELECT COUNT(*) FROM users WHERE role = 'MEMBER' AND is_active = 1 AND deleted_at IS NULL";

    // ── 전체 기간 (maturingPower 기준) ─────────────────────────

    @Query(value = """
        SELECT u.id AS userId, u.nickname, u.role,
               u.current_level AS currentLevel, u.maturing_power AS maturingPower,
               COALESCE(wk.ws, 0) AS weeklyScore,
               COALESCE(mo.ms, 0) AS monthlyScore
        FROM users u
        LEFT JOIN (SELECT user_id, SUM(score) AS ws FROM score_history WHERE created_at >= :weekStart GROUP BY user_id) wk ON u.id = wk.user_id
        LEFT JOIN (SELECT user_id, SUM(score) AS ms FROM score_history WHERE created_at >= :monthStart GROUP BY user_id) mo ON u.id = mo.user_id
        WHERE u.role = 'MEMBER' AND u.is_active = 1 AND u.deleted_at IS NULL
        ORDER BY u.maturing_power DESC, u.id ASC
        """,
        countQuery = """
        SELECT COUNT(*) FROM users WHERE role = 'MEMBER' AND is_active = 1 AND deleted_at IS NULL
        """,
        nativeQuery = true)
    Page<RankingProjection> findAllRanking(
            @Param("weekStart") LocalDateTime weekStart,
            @Param("monthStart") LocalDateTime monthStart,
            Pageable pageable);

    // ── 주간 랭킹 (이번 주 score_history SUM 기준) ─────────────

    @Query(value = """
        SELECT u.id AS userId, u.nickname, u.role,
               u.current_level AS currentLevel, u.maturing_power AS maturingPower,
               COALESCE(wk.ws, 0) AS weeklyScore,
               COALESCE(mo.ms, 0) AS monthlyScore
        FROM users u
        LEFT JOIN (SELECT user_id, SUM(score) AS ws FROM score_history WHERE created_at >= :weekStart GROUP BY user_id) wk ON u.id = wk.user_id
        LEFT JOIN (SELECT user_id, SUM(score) AS ms FROM score_history WHERE created_at >= :monthStart GROUP BY user_id) mo ON u.id = mo.user_id
        WHERE u.role = 'MEMBER' AND u.is_active = 1 AND u.deleted_at IS NULL
        ORDER BY weeklyScore DESC, u.maturing_power DESC, u.id ASC
        """,
        countQuery = """
        SELECT COUNT(*) FROM users WHERE role = 'MEMBER' AND is_active = 1 AND deleted_at IS NULL
        """,
        nativeQuery = true)
    Page<RankingProjection> findWeeklyRanking(
            @Param("weekStart") LocalDateTime weekStart,
            @Param("monthStart") LocalDateTime monthStart,
            Pageable pageable);

    // ── 월간 랭킹 (이번 달 score_history SUM 기준) ─────────────

    @Query(value = """
        SELECT u.id AS userId, u.nickname, u.role,
               u.current_level AS currentLevel, u.maturing_power AS maturingPower,
               COALESCE(wk.ws, 0) AS weeklyScore,
               COALESCE(mo.ms, 0) AS monthlyScore
        FROM users u
        LEFT JOIN (SELECT user_id, SUM(score) AS ws FROM score_history WHERE created_at >= :weekStart GROUP BY user_id) wk ON u.id = wk.user_id
        LEFT JOIN (SELECT user_id, SUM(score) AS ms FROM score_history WHERE created_at >= :monthStart GROUP BY user_id) mo ON u.id = mo.user_id
        WHERE u.role = 'MEMBER' AND u.is_active = 1 AND u.deleted_at IS NULL
        ORDER BY monthlyScore DESC, u.maturing_power DESC, u.id ASC
        """,
        countQuery = """
        SELECT COUNT(*) FROM users WHERE role = 'MEMBER' AND is_active = 1 AND deleted_at IS NULL
        """,
        nativeQuery = true)
    Page<RankingProjection> findMonthlyRanking(
            @Param("weekStart") LocalDateTime weekStart,
            @Param("monthStart") LocalDateTime monthStart,
            Pageable pageable);

    // ── 내 순위 계산용 COUNT 쿼리 ──────────────────────────────

    // ALL: 나보다 maturingPower 높은 사람 수
    @Query(value = """
        SELECT COUNT(*) FROM users
        WHERE maturing_power > :score AND role = 'MEMBER' AND is_active = 1 AND deleted_at IS NULL
        """, nativeQuery = true)
    long countAboveByMaturingPower(@Param("score") int score);

    // WEEKLY: 나보다 이번 주 점수 높은 사람 수
    @Query(value = """
        SELECT COUNT(*) FROM users u
        LEFT JOIN (SELECT user_id, SUM(score) AS ws FROM score_history WHERE created_at >= :weekStart GROUP BY user_id) wk ON u.id = wk.user_id
        WHERE COALESCE(wk.ws, 0) > :score AND u.role = 'MEMBER' AND u.is_active = 1 AND u.deleted_at IS NULL
        """, nativeQuery = true)
    long countAboveByWeeklyScore(@Param("score") long score, @Param("weekStart") LocalDateTime weekStart);

    // MONTHLY: 나보다 이번 달 점수 높은 사람 수
    @Query(value = """
        SELECT COUNT(*) FROM users u
        LEFT JOIN (SELECT user_id, SUM(score) AS ms FROM score_history WHERE created_at >= :monthStart GROUP BY user_id) mo ON u.id = mo.user_id
        WHERE COALESCE(mo.ms, 0) > :score AND u.role = 'MEMBER' AND u.is_active = 1 AND u.deleted_at IS NULL
        """, nativeQuery = true)
    long countAboveByMonthlyScore(@Param("score") long score, @Param("monthStart") LocalDateTime monthStart);

    // 본인의 특정 기간 점수 합산
    @Query(value = """
        SELECT COALESCE(SUM(score), 0) FROM score_history
        WHERE user_id = :userId AND created_at >= :since
        """, nativeQuery = true)
    long getUserPeriodScore(@Param("userId") Long userId, @Param("since") LocalDateTime since);
}
