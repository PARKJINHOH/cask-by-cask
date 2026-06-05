package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.CommentEmojiReaction;
import com.drinkindex.domain.community.entity.enums.EmojiTargetType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

// [패치 13] 다형성(targetType + targetId) 기반 조회로 전환
public interface CommentEmojiReactionRepository extends JpaRepository<CommentEmojiReaction, Long> {

    Optional<CommentEmojiReaction> findByTargetTypeAndTargetIdAndEmojiIdAndUserId(
            EmojiTargetType targetType, Long targetId, Long emojiId, Long userId);

    long countByTargetTypeAndTargetIdAndEmojiId(
            EmojiTargetType targetType, Long targetId, Long emojiId);

    // 대상 ID 목록의 모든 반응을 한 번에 조회 (N+1 방지)
    @Query("SELECT r FROM CommentEmojiReaction r " +
           "JOIN FETCH r.emoji " +
           "WHERE r.targetType = :targetType AND r.targetId IN :targetIds")
    List<CommentEmojiReaction> findByTargetTypeAndTargetIdIn(
            @Param("targetType") EmojiTargetType targetType,
            @Param("targetIds") List<Long> targetIds);
}
