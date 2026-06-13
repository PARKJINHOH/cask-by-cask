package com.caskbycask.domain.comment.repository;

import com.caskbycask.domain.comment.entity.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {

    boolean existsByCommentIdAndUserId(Long commentId, Long userId);

    @Transactional
    void deleteByCommentIdAndUserId(Long commentId, Long userId);
}
