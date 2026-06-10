package com.drinkindex.domain.user.repository;

import com.drinkindex.domain.admin.dto.DailyCountProjection;
import com.drinkindex.domain.community.entity.UserBlock;
import com.drinkindex.domain.user.dto.AuthUserView;
import com.drinkindex.domain.user.entity.RoleType;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>, UserQueryRepository {

    Optional<User> findByEmail(String email);

    /**
     * 인증 필터 전용 경량 조회 — EAGER 연관(roleType·boardPermissions) 로딩 없이 단일 SELECT.
     * (@SQLRestriction("deleted_at IS NULL") 이 적용되어 탈퇴 계정은 findById 와 동일하게 제외된다)
     */
    @Query("SELECT new com.drinkindex.domain.user.dto.AuthUserView(u.id, u.email, u.password, u.role, u.isActive) "
            + "FROM User u WHERE u.id = :id")
    Optional<AuthUserView> findAuthViewById(@Param("id") Long id);

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    boolean existsByNicknameAndIdNot(String nickname, Long id);

    boolean existsByRole(Role role);

    // [패치 11] 레벨 전체 재계산 배치 — MEMBER만 페이징 조회 (deleted_at IS NULL은 @SQLRestriction 적용)
    Page<User> findByRole(Role role, Pageable pageable);

    boolean existsByRoleType(RoleType roleType);

    // @멘션 자동완성: nickname prefix 검색, 차단한 사용자 제외
    @Query("SELECT u FROM User u WHERE u.nickname LIKE :prefix% " +
           "AND u.id NOT IN (SELECT ub.blocked.id FROM UserBlock ub WHERE ub.blocker.id = :blockerId)")
    List<User> findByNicknamePrefixExcludingBlocked(
            @Param("prefix") String prefix,
            @Param("blockerId") Long blockerId,
            Pageable pageable);

    // 쪽지 수신자 조회 (삭제되지 않은 유저, @SQLRestriction이 이미 처리하지만 명시적으로)
    Optional<User> findByNickname(String nickname);

    // @SQLRestriction("deleted_at IS NULL") 이 적용된 findByNickname 사용
    default Optional<User> findByNicknameAndNotDeleted(String nickname) {
        return findByNickname(nickname);
    }

    long countByIsActiveTrue();

    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :start AND u.createdAt < :end")
    long countByCreatedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query(value = "SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at >= :from AND deleted_at IS NULL GROUP BY DATE(created_at) ORDER BY DATE(created_at)", nativeQuery = true)
    List<DailyCountProjection> findDailySignupTrend(@Param("from") LocalDateTime from);

    List<User> findAllByEmailSubscribedTrue();

    @Query(value = "SELECT email FROM users WHERE id = :id", nativeQuery = true)
    Optional<String> findEmailById(@Param("id") Long id);

    /**
     * 휴면 전환 대상 조회 — 활성·비휴면 계정 중 마지막 로그인(없으면 가입일)이 기준 시각 이전인 사용자.
     * (@SQLRestriction 으로 탈퇴 계정은 이미 제외됨)
     */
    @Query("SELECT u FROM User u WHERE u.dormant = false AND u.isActive = true AND ("
            + "(u.lastLoginAt IS NOT NULL AND u.lastLoginAt < :cutoff) "
            + "OR (u.lastLoginAt IS NULL AND u.createdAt < :cutoff))")
    List<User> findDormantCandidates(@Param("cutoff") LocalDateTime cutoff);

    /**
     * 휴면 전환 사전 통지 대상 — 마지막 활동(로그인 없으면 가입일)이 [start, end) 구간에 든
     * 활성·비휴면 계정. 구간 폭이 1일이라 각 계정에 1회만 매칭된다.
     */
    @Query("SELECT u FROM User u WHERE u.dormant = false AND u.isActive = true "
            + "AND COALESCE(u.lastLoginAt, u.createdAt) >= :start "
            + "AND COALESCE(u.lastLoginAt, u.createdAt) < :end")
    List<User> findDormantNoticeTargets(@Param("start") LocalDateTime start,
                                        @Param("end") LocalDateTime end);

    /** 자동 탈퇴 처리 대상 — 휴면 전환 후 기준 시각 이전인 계정 */
    List<User> findByDormantTrueAndDormantAtBefore(LocalDateTime cutoff);
}
