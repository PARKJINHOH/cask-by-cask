package com.drinkindex.domain.user.repository;

import com.drinkindex.domain.community.entity.UserBlock;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>, UserQueryRepository {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    boolean existsByNicknameAndIdNot(String nickname, Long id);

    boolean existsByRole(Role role);

    // @멘션 자동완성: nickname prefix 검색, 차단한 사용자 제외
    @Query("SELECT u FROM User u WHERE u.nickname LIKE :prefix% " +
           "AND u.id NOT IN (SELECT ub.blocked.id FROM UserBlock ub WHERE ub.blocker.id = :blockerId)")
    List<User> findByNicknamePrefixExcludingBlocked(
            @Param("prefix") String prefix,
            @Param("blockerId") Long blockerId,
            Pageable pageable);
}
