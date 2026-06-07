package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.UserBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface UserBlockRepository extends JpaRepository<UserBlock, Long> {

    boolean existsByBlockerIdAndBlockedId(Long blockerId, Long blockedId);

    java.util.Optional<UserBlock> findByBlockerIdAndBlockedId(Long blockerId, Long blockedId);

    // 내가 차단한 사용자 ID 목록 (목록/댓글 필터링용)
    @Query("select ub.blocked.id from UserBlock ub where ub.blocker.id = :blockerId")
    List<Long> findBlockedIdsByBlockerId(Long blockerId);

    // 내가 차단한 사용자 목록 (마이페이지 차단 목록 탭) — blocked 사용자 fetch join
    @Query("select ub from UserBlock ub join fetch ub.blocked where ub.blocker.id = :blockerId order by ub.createdAt desc")
    List<UserBlock> findByBlockerIdWithBlocked(Long blockerId);
}
