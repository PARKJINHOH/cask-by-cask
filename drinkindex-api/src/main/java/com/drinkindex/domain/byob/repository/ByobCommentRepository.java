package com.drinkindex.domain.byob.repository;

import com.drinkindex.domain.byob.entity.ByobComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ByobCommentRepository extends JpaRepository<ByobComment, Long> {

    // 주최자용: 모든 댓글
    @Query("SELECT c FROM ByobComment c JOIN FETCH c.author JOIN FETCH c.participantUser WHERE c.byob.id = :byobId ORDER BY c.createdAt ASC")
    List<ByobComment> findAllByByobIdOrderByCreatedAt(@Param("byobId") Long byobId);

    // 참여자용: 본인 쓰레드만
    @Query("SELECT c FROM ByobComment c JOIN FETCH c.author JOIN FETCH c.participantUser WHERE c.byob.id = :byobId AND c.participantUser.id = :userId ORDER BY c.createdAt ASC")
    List<ByobComment> findAllByByobIdAndParticipantUserIdOrderByCreatedAt(@Param("byobId") Long byobId, @Param("userId") Long userId);
}
