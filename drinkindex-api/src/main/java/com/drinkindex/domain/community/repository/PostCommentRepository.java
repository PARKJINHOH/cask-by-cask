package com.drinkindex.domain.community.repository;

import com.drinkindex.domain.community.entity.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

    // 게시글 삭제 시 댓글의 post FK를 null로 처리 (댓글 레코드 자체는 유지)
    @Modifying
    @Query("UPDATE PostComment c SET c.post = null WHERE c.post.id = :postId")
    void clearPostReference(@Param("postId") Long postId);
}
