package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.CommentEmojiReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommentEmojiReactionRepository extends JpaRepository<CommentEmojiReaction, Long> {

    Optional<CommentEmojiReaction> findByCommentIdAndEmojiIdAndUserId(
            Long commentId, Long emojiId, Long userId);

    // 댓글 ID 목록의 모든 반응을 한 번에 조회 (N+1 방지)
    @Query("SELECT r FROM CommentEmojiReaction r " +
           "JOIN FETCH r.emoji " +
           "WHERE r.comment.id IN :commentIds")
    List<CommentEmojiReaction> findByCommentIdIn(@Param("commentIds") List<Long> commentIds);

    long countByCommentIdAndEmojiId(Long commentId, Long emojiId);
}
